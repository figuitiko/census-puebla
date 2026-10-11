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
