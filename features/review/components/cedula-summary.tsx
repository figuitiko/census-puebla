import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type Row = [label: string, value: ReactNode];

const NO_DATA = <span className="text-muted-foreground">Sin dato</span>;

const text = (value: string) => value || NO_DATA;
const num = (value: number | null) => (value === null ? NO_DATA : value);
const tri = (value: TriState | null) => (value ? TRISTATE_LABELS[value] : NO_DATA);
const bool = (value: boolean | null) => (value === null ? NO_DATA : value ? "Sí" : "No");
const pick = <T extends string>(labels: Record<T, string>, value: T | null) => (value ? labels[value] : NO_DATA);
const list = <T extends string>(labels: Record<T, string>, values: T[]) =>
  values.length ? values.map((v) => labels[v]).join(", ") : NO_DATA;

function Section({ index, rows }: { index: number; rows: Row[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {STEPS[index].key}. {STEPS[index].title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[minmax(0,14rem)_1fr]">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="break-words">{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

/** Read-only rendering of the cedula in workbook order. Hidden (skipped) answers are not shown. */
export function CedulaSummary({
  values: v,
  folio,
  responsible,
  visitedAt,
}: {
  values: CedulaValues;
  folio: string;
  responsible: string;
  visitedAt: Date | null;
}) {
  const located = v.located !== false;
  const total = privateUnitsTotal(v);

  const rowsA: Row[] = [
    ["1. Folio", folio],
    ["2. Fecha y hora", visitedAt ? visitedAt.toLocaleString("es-MX") : NO_DATA],
    ["3. Persona responsable", responsible],
    ["4. Coordenadas", v.lat !== null && v.lng !== null ? `${v.lat}, ${v.lng}` : NO_DATA],
    ["5. Nombre de la UH", v.name],
    ["6. Junta auxiliar", text(v.juntaAuxiliar)],
    ["7. Colonia", text(v.colonia)],
    ["8. Domicilio o referencia", text(v.address)],
    ["9. Localizada", bool(v.located)],
  ];

  const rowsB: Row[] = [
    ["10. Total de viviendas", num(v.dwellings)],
    ["11. Otras unidades privativas", tri(v.otherUnits)],
    ...(v.otherUnits === "YES"
      ? ([
          ...PRIVATE_UNIT_TYPES.map((type): Row => [`12. ${PRIVATE_UNIT_LABELS[type]}`, num(v.privateUnits[type])]),
          ...(v.privateOtherLabel ? ([["12. «Otros» especifica", v.privateOtherLabel]] as Row[]) : []),
          ["12. Total", total ?? `${privateUnitsKnownSum(v)}+ (parcial)`],
        ] as Row[])
      : []),
  ];

  const rowsC: Row[] = [
    ["13. Áreas verdes", tri(v.greenAreas)],
    ...(v.greenAreas === "YES"
      ? ([
          ["14. Número de áreas verdes", num(v.greenAreaCount)],
          ["15. Tipo predominante", pick(GREEN_TYPE_LABELS, v.greenType)],
          ["16. Uso principal", pick(GREEN_USE_LABELS, v.greenUse)],
          ["17. Equipamiento", list(EQUIPMENT_LABELS, v.equipment)],
          ["18. Condición general", pick(GREEN_CONDITION_LABELS, v.greenCondition)],
        ] as Row[])
      : []),
  ];

  const rowsD: Row[] = [
    ["19. Figura de administración", tri(v.orgIdentified)],
    ...(v.orgIdentified === "YES"
      ? ([
          ["20. Figura(s) identificada(s)", list(ORG_FIGURE_LABELS, v.orgFigures)],
          ["21. Características / observaciones", text(v.orgNotes)],
        ] as Row[])
      : []),
  ];

  const rowsE: Row[] = [
    ...(located
      ? ([
          ["22. Fuente principal", pick(SOURCE_LABELS, v.source)],
          ["23. Evidencia documental", bool(v.hasDocEvidence)],
          ...(v.hasDocEvidence ? ([["24. Tipo de documento", text(v.docType)]] as Row[]) : []),
        ] as Row[])
      : []),
    ["26. Observaciones o incidencias", text(v.observations)],
  ];

  return (
    <div className="flex flex-col gap-4">
      <Section index={0} rows={rowsA} />
      {located && (
        <>
          <Section index={1} rows={rowsB} />
          <Section index={2} rows={rowsC} />
          <Section index={3} rows={rowsD} />
        </>
      )}
      <Section index={4} rows={rowsE} />
    </div>
  );
}
