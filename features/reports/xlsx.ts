import ExcelJS from "exceljs";
import { getCapture, type CaptureData } from "@/features/census/queries";
import { EMPTY_VALUES } from "@/features/census/schema";
import { STATE_LABELS } from "@/features/dashboard/filters";
import type { UnitRow } from "@/features/dashboard/rows";
import { REGISTRY_COLUMNS, cedulaSections, registryBands } from "./cedula-rows";

const SHEET_NAME_FORBIDDEN = /[\\/?*[\]:]/g;
const CAPTURE_BATCH = 8; // bounded so a big campaign does not open one DB connection per unit at once

/** Excel sheet names: max 31 chars, no `\ / ? * [ ] :`, unique. */
function sheetName(folio: string, taken: Set<string>) {
  const base = `Cédula ${folio}`.replace(SHEET_NAME_FORBIDDEN, "-").slice(0, 31);
  let name = base;
  for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${base.slice(0, 31 - String(n).length - 1)}~${n}`;
  taken.add(name.toLowerCase());
  return name;
}

const BAND_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1D5DB" } };
const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };

/** Columns after the 26 fields: workflow context that is not part of the cedula itself. */
const TRACKING_COLUMNS: { header: string; width: number; value: (row: UnitRow) => string }[] = [
  { header: "Estado", width: 14, value: (row) => STATE_LABELS[row.state] },
  { header: "Encuestador", width: 24, value: (row) => row.assigneeName ?? "Sin asignar" },
  { header: "Alcance", width: 14, value: (row) => (row.inScope ? "En alcance" : "Descubierta") },
];

/**
 * "Registro": one row per unit, the 26 cedula fields as columns in workbook order under section bands
 * (row 1 = bands, row 2 = headers). Counts are real numbers so Excel can sum them. "" = skipped by the
 * questionnaire or not captured yet; "Sin dato" = applicable but unknown.
 */
function addRegistrySheet(workbook: ExcelJS.Workbook, rows: UnitRow[], captures: Map<string, CaptureData>) {
  const sheet = workbook.addWorksheet("Registro", { views: [{ state: "frozen", xSplit: 1, ySplit: 2 }] });

  const widths = [...REGISTRY_COLUMNS.map((c) => c.width), ...TRACKING_COLUMNS.map((c) => c.width)];
  sheet.columns = widths.map((width) => ({ width }));

  // Row 1: section bands (merged). Excel columns are 1-based.
  const bandRow = sheet.getRow(1);
  for (const band of registryBands()) {
    bandRow.getCell(band.from + 1).value = band.title;
    if (band.to > band.from) sheet.mergeCells(1, band.from + 1, 1, band.to + 1);
  }
  const trackingStart = REGISTRY_COLUMNS.length + 1;
  bandRow.getCell(trackingStart).value = "Seguimiento";
  sheet.mergeCells(1, trackingStart, 1, trackingStart + TRACKING_COLUMNS.length - 1);
  bandRow.font = { bold: true };
  bandRow.alignment = { horizontal: "left" };
  for (let c = 1; c <= widths.length; c++) bandRow.getCell(c).fill = BAND_FILL;

  // Row 2: headers.
  const headerRow = sheet.getRow(2);
  [...REGISTRY_COLUMNS.map((c) => c.header), ...TRACKING_COLUMNS.map((c) => c.header)].forEach((header, index) => {
    headerRow.getCell(index + 1).value = header;
  });
  headerRow.font = { bold: true };
  headerRow.alignment = { wrapText: true, vertical: "top" };
  for (let c = 1; c <= widths.length; c++) headerRow.getCell(c).fill = HEADER_FILL;

  for (const row of rows) {
    const capture = captures.get(row.id);
    // No capture can only mean the unit vanished between the two queries; still emit its known columns.
    const input = {
      v: capture?.values ?? { ...EMPTY_VALUES, name: row.name },
      folio: row.folio,
      responsible: capture?.authorName ?? "—",
      visitedAt: capture?.visitedAt ?? null,
      started: capture?.submissionId != null,
      photos: row.photos,
    };
    sheet.addRow([...REGISTRY_COLUMNS.map((c) => c.value(input)), ...TRACKING_COLUMNS.map((c) => c.value(row))]);
  }

  sheet.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: widths.length } };
}

function addCedulaSheet(workbook: ExcelJS.Workbook, capture: CaptureData, taken: Set<string>) {
  const sheet = workbook.addWorksheet(sheetName(capture.folio, taken));
  sheet.columns = [{ width: 42 }, { width: 70 }];

  const titleRow = sheet.addRow([capture.values.name]);
  titleRow.font = { bold: true, size: 14 };
  sheet.addRow([`Estado: ${STATE_LABELS[capture.status]} · Fotos confirmadas: ${capture.evidence.length}`]);

  const sections = cedulaSections(capture.values, {
    folio: capture.folio,
    responsible: capture.authorName ?? "—",
    visitedAt: capture.visitedAt,
  });
  for (const section of sections) {
    sheet.addRow([]);
    const header = sheet.addRow([section.title]);
    header.font = { bold: true };
    header.eachCell((cell) => (cell.fill = HEADER_FILL));
    sheet.mergeCells(header.number, 1, header.number, 2);
    for (const [label, value] of section.rows) {
      const row = sheet.addRow([label, value]);
      row.getCell(2).alignment = { wrapText: true, vertical: "top" };
      row.getCell(1).alignment = { vertical: "top" };
    }
  }
}

/**
 * Registry workbook: sheet "Registro" (26 fields per unit, as filtered on the dashboard) plus one
 * "Cédula <folio>" sheet per unit that has a cedula, in workbook layout.
 */
export async function buildRegistryWorkbook(rows: UnitRow[], campaignName: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "dash-senso";
  workbook.title = `Registro · ${campaignName}`;
  workbook.created = new Date();

  // One capture per unit, fetched in bounded batches. Both the Registro and the per-unit sheets read from it.
  const captures = new Map<string, CaptureData>();
  for (let i = 0; i < rows.length; i += CAPTURE_BATCH) {
    const batch = rows.slice(i, i + CAPTURE_BATCH);
    const fetched = await Promise.all(batch.map((row) => getCapture(row.id)));
    fetched.forEach((capture, n) => capture && captures.set(batch[n].id, capture));
  }

  addRegistrySheet(workbook, rows, captures);

  const taken = new Set(["registro"]);
  for (const row of rows) {
    const capture = captures.get(row.id);
    if (capture && capture.submissionId !== null) addCedulaSheet(workbook, capture, taken);
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
