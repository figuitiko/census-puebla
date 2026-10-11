import ExcelJS from "exceljs";
import { getCapture, type CaptureData } from "@/features/census/queries";
import { STATE_LABELS } from "@/features/dashboard/filters";
import type { UnitRow } from "@/features/dashboard/rows";
import { cedulaSections } from "./cedula-rows";

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

const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };

function addRegistrySheet(workbook: ExcelJS.Workbook, rows: UnitRow[]) {
  const sheet = workbook.addWorksheet("Registro", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = [
    { header: "Folio", key: "folio", width: 12 },
    { header: "Unidad habitacional", key: "name", width: 38 },
    { header: "Colonia", key: "colonia", width: 24 },
    { header: "Junta auxiliar", key: "junta", width: 24 },
    { header: "Encuestador", key: "assignee", width: 24 },
    { header: "Alcance", key: "scope", width: 14 },
    { header: "Estado", key: "state", width: 14 },
    { header: "Localizada", key: "located", width: 12 },
    { header: "Viviendas", key: "dwellings", width: 11 },
    { header: "Fotos confirmadas", key: "photos", width: 18 },
    { header: "Latitud", key: "lat", width: 12 },
    { header: "Longitud", key: "lng", width: 12 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = HEADER_FILL;

  for (const row of rows) {
    sheet.addRow({
      folio: row.folio,
      name: row.name,
      colonia: row.colonia ?? "",
      junta: row.junta ?? "",
      assignee: row.assigneeName ?? "Sin asignar",
      scope: row.inScope ? "En alcance" : "Descubierta",
      state: STATE_LABELS[row.state],
      located: row.located === null ? "Sin dato" : row.located ? "Sí" : "No",
      dwellings: row.dwellings ?? "Sin dato",
      photos: row.photos,
      lat: row.lat ?? "",
      lng: row.lng ?? "",
    });
  }
  sheet.autoFilter = { from: "A1", to: { row: 1, column: sheet.columns.length } };
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
 * Registry workbook: sheet "Registro" (one line per unit, as filtered on the dashboard) plus one
 * "Cédula <folio>" sheet per unit that has a cedula, with the 26 fields in workbook order.
 */
export async function buildRegistryWorkbook(rows: UnitRow[], campaignName: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "dash-senso";
  workbook.title = `Registro · ${campaignName}`;
  workbook.created = new Date();

  addRegistrySheet(workbook, rows);

  const taken = new Set(["registro"]);
  const started = rows.filter((row) => row.state !== "NOT_STARTED");
  for (let i = 0; i < started.length; i += CAPTURE_BATCH) {
    // Fetch a batch in parallel, but add sheets in folio order so the workbook is deterministic.
    const batch = started.slice(i, i + CAPTURE_BATCH);
    const captures = await Promise.all(batch.map((row) => getCapture(row.id)));
    for (const capture of captures) {
      if (!capture || capture.submissionId === null) continue;
      addCedulaSheet(workbook, capture, taken);
    }
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
