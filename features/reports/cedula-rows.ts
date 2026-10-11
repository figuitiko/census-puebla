import {
  EQUIPMENT_LABELS,
  GREEN_CONDITION_LABELS,
  GREEN_TYPE_LABELS,
  GREEN_USE_LABELS,
  ORG_FIGURE_LABELS,
  PRIVATE_UNIT_LABELS,
  SOURCE_LABELS,
  TRISTATE_LABELS,
} from "@/lib/catalogs";
import type { TriState } from "@/lib/generated/prisma/enums";
import {
  PRIVATE_UNIT_TYPES,
  STEPS,
  privateUnitsKnownSum,
  privateUnitsTotal,
  type CedulaValues,
} from "@/features/census/schema";

export type CedulaRow = [label: string, value: string];
export type CedulaSection = { title: string; rows: CedulaRow[] };

export const NO_DATA = "Sin dato";

const text = (value: string) => value || NO_DATA;
const num = (value: number | null) => (value === null ? NO_DATA : String(value));
const tri = (value: TriState | null) => (value ? TRISTATE_LABELS[value] : NO_DATA);
const bool = (value: boolean | null) => (value === null ? NO_DATA : value ? "Sí" : "No");
const pick = <T extends string>(labels: Record<T, string>, value: T | null) => (value ? labels[value] : NO_DATA);
const list = <T extends string>(labels: Record<T, string>, values: T[]) =>
  values.length ? values.map((v) => labels[v]).join(", ") : NO_DATA;

/**
 * The cedula in workbook order as PLAIN TEXT, shared by the XLSX and the PDF so both always agree.
 * Mirrors `CedulaSummary` (the on-screen version): skipped answers are omitted, and an unlocated unit
 * only gets sections A and E.
 */
export function cedulaSections(
  v: CedulaValues,
  meta: { folio: string; responsible: string; visitedAt: Date | null },
): CedulaSection[] {
  const located = v.located !== false;
  const total = privateUnitsTotal(v);
  const title = (index: number) => `${STEPS[index].key}. ${STEPS[index].title}`;

  const a: CedulaRow[] = [
    ["1. Folio", meta.folio],
    ["2. Fecha y hora", meta.visitedAt ? meta.visitedAt.toLocaleString("es-MX") : NO_DATA],
    ["3. Persona responsable", meta.responsible],
    ["4. Coordenadas", v.lat !== null && v.lng !== null ? `${v.lat}, ${v.lng}` : NO_DATA],
    ["5. Nombre de la UH", v.name],
    ["6. Junta auxiliar", text(v.juntaAuxiliar)],
    ["7. Colonia", text(v.colonia)],
    ["8. Domicilio o referencia", text(v.address)],
    ["9. Localizada", bool(v.located)],
  ];

  const b: CedulaRow[] = [
    ["10. Total de viviendas", num(v.dwellings)],
    ["11. Otras unidades privativas", tri(v.otherUnits)],
    ...(v.otherUnits === "YES"
      ? [
          ...PRIVATE_UNIT_TYPES.map((type): CedulaRow => [`12. ${PRIVATE_UNIT_LABELS[type]}`, num(v.privateUnits[type])]),
          ...(v.privateOtherLabel ? [["12. «Otros» especifica", v.privateOtherLabel] as CedulaRow] : []),
          ["12. Total", total === null ? `${privateUnitsKnownSum(v)}+ (parcial)` : String(total)] as CedulaRow,
        ]
      : []),
  ];

  const c: CedulaRow[] = [
    ["13. Áreas verdes", tri(v.greenAreas)],
    ...(v.greenAreas === "YES"
      ? ([
          ["14. Número de áreas verdes", num(v.greenAreaCount)],
          ["15. Tipo predominante", pick(GREEN_TYPE_LABELS, v.greenType)],
          ["16. Uso principal", pick(GREEN_USE_LABELS, v.greenUse)],
          ["17. Equipamiento", list(EQUIPMENT_LABELS, v.equipment)],
          ["18. Condición general", pick(GREEN_CONDITION_LABELS, v.greenCondition)],
        ] as CedulaRow[])
      : []),
  ];

  const d: CedulaRow[] = [
    ["19. Figura de administración", tri(v.orgIdentified)],
    ...(v.orgIdentified === "YES"
      ? ([
          ["20. Figura(s) identificada(s)", list(ORG_FIGURE_LABELS, v.orgFigures)],
          ["21. Características / observaciones", text(v.orgNotes)],
        ] as CedulaRow[])
      : []),
  ];

  const e: CedulaRow[] = [
    ...(located
      ? ([
          ["22. Fuente principal", pick(SOURCE_LABELS, v.source)],
          ["23. Evidencia documental", bool(v.hasDocEvidence)],
          ...(v.hasDocEvidence ? ([["24. Tipo de documento", text(v.docType)]] as CedulaRow[]) : []),
        ] as CedulaRow[])
      : []),
    ["26. Observaciones o incidencias", text(v.observations)],
  ];

  return [
    { title: title(0), rows: a },
    ...(located
      ? [
          { title: title(1), rows: b },
          { title: title(2), rows: c },
          { title: title(3), rows: d },
        ]
      : []),
    { title: title(4), rows: e },
  ];
}

// ---------------------------------------------------------------------------------------------------------------
// Registry sheet: ONE row per unit, the 26 fields as columns in workbook order under section bands.
// ---------------------------------------------------------------------------------------------------------------

export type RegistryCell = string | number;

type RegistryInput = {
  v: CedulaValues;
  folio: string;
  responsible: string;
  visitedAt: Date | null;
  /** a submission row exists. Without it only the complex's own data (fields 1, 4-8) is known. */
  started: boolean;
  /** confirmed photos (field 25) */
  photos: number;
};

export type RegistryColumn = {
  /** index into STEPS (0 = A ... 4 = E) */
  section: number;
  header: string;
  width: number;
  value: (i: RegistryInput) => RegistryCell;
};

const BLANK = ""; // skipped by the questionnaire's skip rules or not captured yet: NOT the same as NO_DATA
const nOrNoData = (value: number | null): RegistryCell => (value === null ? NO_DATA : value);

/** Answers that exist only when the unit was located (fields 10-24). */
const ifLocated = (i: RegistryInput, fn: () => RegistryCell): RegistryCell =>
  i.started && i.v.located !== false ? fn() : BLANK;

const col = (section: number, header: string, width: number, value: RegistryColumn["value"]): RegistryColumn => ({
  section,
  header,
  width,
  value,
});

export const REGISTRY_COLUMNS: RegistryColumn[] = [
  col(0, "1. Folio", 12, (i) => i.folio),
  col(0, "2. Fecha y hora", 20, (i) => (i.started ? (i.visitedAt ? i.visitedAt.toLocaleString("es-MX") : NO_DATA) : BLANK)),
  col(0, "3. Persona responsable", 24, (i) => (i.started ? i.responsible : BLANK)),
  col(0, "4. Latitud", 12, (i) => i.v.lat ?? NO_DATA),
  col(0, "4. Longitud", 12, (i) => i.v.lng ?? NO_DATA),
  col(0, "5. Nombre de la UH", 38, (i) => i.v.name),
  col(0, "6. Junta auxiliar", 24, (i) => text(i.v.juntaAuxiliar)),
  col(0, "7. Colonia", 24, (i) => text(i.v.colonia)),
  col(0, "8. Domicilio o referencia", 34, (i) => text(i.v.address)),
  col(0, "9. Localizada", 12, (i) => (i.started ? bool(i.v.located) : BLANK)),

  col(1, "10. Total de viviendas", 12, (i) => ifLocated(i, () => nOrNoData(i.v.dwellings))),
  col(1, "11. Otras unidades privativas", 16, (i) => ifLocated(i, () => tri(i.v.otherUnits))),
  ...PRIVATE_UNIT_TYPES.map((type) =>
    col(1, `12. ${PRIVATE_UNIT_LABELS[type]}`, 14, (i) =>
      ifLocated(i, () => (i.v.otherUnits === "YES" ? nOrNoData(i.v.privateUnits[type]) : BLANK)),
    ),
  ),
  col(1, "12. «Otros» especifica", 20, (i) => ifLocated(i, () => (i.v.otherUnits === "YES" ? i.v.privateOtherLabel : BLANK))),
  col(1, "12. Total", 10, (i) =>
    ifLocated(i, () => {
      if (i.v.otherUnits === "NO") return 0; // field 11 = No: total is 0 by rule
      if (i.v.otherUnits !== "YES") return BLANK;
      const total = privateUnitsTotal(i.v);
      return total === null ? `${privateUnitsKnownSum(i.v)}+ (parcial)` : total;
    }),
  ),

  col(2, "13. Áreas verdes", 14, (i) => ifLocated(i, () => tri(i.v.greenAreas))),
  col(2, "14. Número de áreas verdes", 14, (i) =>
    ifLocated(i, () => (i.v.greenAreas === "YES" ? nOrNoData(i.v.greenAreaCount) : BLANK)),
  ),
  col(2, "15. Tipo predominante", 20, (i) => ifLocated(i, () => (i.v.greenAreas === "YES" ? pick(GREEN_TYPE_LABELS, i.v.greenType) : BLANK))),
  col(2, "16. Uso principal", 24, (i) => ifLocated(i, () => (i.v.greenAreas === "YES" ? pick(GREEN_USE_LABELS, i.v.greenUse) : BLANK))),
  col(2, "17. Equipamiento", 34, (i) => ifLocated(i, () => (i.v.greenAreas === "YES" ? list(EQUIPMENT_LABELS, i.v.equipment) : BLANK))),
  col(2, "18. Condición general", 18, (i) =>
    ifLocated(i, () => (i.v.greenAreas === "YES" ? pick(GREEN_CONDITION_LABELS, i.v.greenCondition) : BLANK)),
  ),

  col(3, "19. Figura de administración", 16, (i) => ifLocated(i, () => tri(i.v.orgIdentified))),
  col(3, "20. Figura(s) identificada(s)", 30, (i) =>
    ifLocated(i, () => (i.v.orgIdentified === "YES" ? list(ORG_FIGURE_LABELS, i.v.orgFigures) : BLANK)),
  ),
  col(3, "21. Características / observaciones", 34, (i) => ifLocated(i, () => (i.v.orgIdentified === "YES" ? text(i.v.orgNotes) : BLANK))),

  col(4, "22. Fuente principal", 30, (i) => ifLocated(i, () => pick(SOURCE_LABELS, i.v.source))),
  col(4, "23. Evidencia documental", 14, (i) => ifLocated(i, () => bool(i.v.hasDocEvidence))),
  col(4, "24. Tipo de documento", 24, (i) => ifLocated(i, () => (i.v.hasDocEvidence ? text(i.v.docType) : BLANK))),
  col(4, "25. Evidencia fotográfica (fotos confirmadas)", 18, (i) => i.photos),
  col(4, "26. Observaciones o incidencias", 40, (i) => (i.started ? text(i.v.observations) : BLANK)),
];

/** Section bands above the headers, in column order: [title, first column (0-based), last column]. */
export function registryBands(): { title: string; from: number; to: number }[] {
  const bands: { title: string; from: number; to: number }[] = [];
  REGISTRY_COLUMNS.forEach((column, index) => {
    const last = bands.at(-1);
    if (last && STEPS[column.section] && last.title === `${STEPS[column.section].key}. ${STEPS[column.section].title}`) {
      last.to = index;
    } else {
      bands.push({
        title: `${STEPS[column.section].key}. ${STEPS[column.section].title}`,
        from: index,
        to: index,
      });
    }
  });
  return bands;
}
