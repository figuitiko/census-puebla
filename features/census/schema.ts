import { z } from "zod";
import {
  Equipment,
  GreenAreaCondition,
  GreenAreaType,
  GreenAreaUse,
  InfoSource,
  OrganizationFigure,
  PrivateUnitType,
  TriState,
} from "@/lib/generated/prisma/enums";

/** Section titles come from the workbook sheet "Cédula" (A4, A15, A24, A31, A35). */
export const STEPS = [
  { key: "A", title: "Control e identificación" },
  { key: "B", title: "Viviendas y unidades privativas" },
  { key: "C", title: "Áreas verdes" },
  { key: "D", title: "Organización y administración condominal" },
  { key: "E", title: "Fuente y evidencias" },
] as const;

/** A not-located unit only needs section A and field 26 (in section E). */
export const NOT_LOCATED_STEPS = [0, 4] as const;

const count = z.number().int().min(0).max(1_000_000).nullable();
const text = (max: number) => z.string().trim().max(max);
const triState = z.enum(TriState).nullable();

// Field 4 is typed by hand: bounds catch swapped or sign-flipped coordinates.
const LAT_RANGE = { min: 14, max: 33 };
const LNG_RANGE = { min: -119, max: -86 };

export const cedulaSchema = z.object({
  // A. Control e identificación
  name: z.string().trim().min(1, "El nombre de la UH es obligatorio").max(200), // 5
  juntaAuxiliar: text(120), // 6
  colonia: text(120), // 7
  address: text(300), // 8
  lat: z
    .number()
    .min(LAT_RANGE.min, { error: (issue) => `Latitud fuera de México (recibí ${issue.input})` })
    .max(LAT_RANGE.max, { error: (issue) => `Latitud fuera de México (recibí ${issue.input})` })
    .nullable(), // 4
  lng: z
    .number()
    .min(LNG_RANGE.min, { error: (issue) => `Longitud fuera de México (recibí ${issue.input})` })
    .max(LNG_RANGE.max, { error: (issue) => `Longitud fuera de México (recibí ${issue.input})` })
    .nullable(), // 4
  located: z.boolean().nullable(), // 9

  // B. Viviendas y unidades privativas
  dwellings: count, // 10 (null = unknown)
  otherUnits: triState, // 11
  privateUnits: z.object({
    LOCAL_COMERCIAL: count,
    OFICINAS: count,
    CONSULTORIOS: count,
    OTROS: count,
  }), // 12
  privateOtherLabel: text(120), // 12, only for OTROS

  // C. Áreas verdes
  greenAreas: triState, // 13
  greenAreaCount: count, // 14
  greenType: z.enum(GreenAreaType).nullable(), // 15
  greenUse: z.enum(GreenAreaUse).nullable(), // 16
  equipment: z.array(z.enum(Equipment)), // 17
  greenCondition: z.enum(GreenAreaCondition).nullable(), // 18

  // D. Organización y administración condominal
  orgIdentified: triState, // 19
  orgFigures: z.array(z.enum(OrganizationFigure)), // 20
  orgNotes: text(1000), // 21

  // E. Fuente y evidencias
  source: z.enum(InfoSource).nullable(), // 22
  hasDocEvidence: z.boolean().nullable(), // 23
  docType: text(200), // 24
  observations: text(2000), // 26
});

export type CedulaValues = z.infer<typeof cedulaSchema>;

const inRange = (value: number, range: { min: number; max: number }) => value >= range.min && value <= range.max;

/** Splits "19.3222, -98.2213" (what Google Maps copies) into numbers. Null if it is not a pair. */
export function parseCoordinates(input: string): { lat: number; lng: number } | null {
  const match = input.trim().match(/^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  return { lat: Number(match[1]), lng: Number(match[2]) };
}

/** Human hint for the likely mistake behind an out-of-range pair, or null if it looks fine. */
export function coordinateHint(lat: number | null, lng: number | null): string | null {
  if (lat === null || lng === null) return null;
  const latOk = inRange(lat, LAT_RANGE);
  const lngOk = inRange(lng, LNG_RANGE);
  if (latOk && lngOk) return null;
  if (inRange(lng, LAT_RANGE) && inRange(lat, LNG_RANGE)) {
    return "Parece que invertiste latitud y longitud: la latitud va primero (≈ 19) y la longitud después (≈ -98).";
  }
  if (!lngOk && inRange(-lng, LNG_RANGE)) {
    return "En México la longitud es negativa: agregá el signo − (ej. -98.22).";
  }
  if (!latOk) return `La latitud ${lat} está fuera de México (debe estar entre ${LAT_RANGE.min} y ${LAT_RANGE.max}).`;
  return `La longitud ${lng} está fuera de México (debe estar entre ${LNG_RANGE.min} y ${LNG_RANGE.max}).`;
}

const NO_PRIVATE_UNITS: CedulaValues["privateUnits"] = {
  LOCAL_COMERCIAL: null,
  OFICINAS: null,
  CONSULTORIOS: null,
  OTROS: null,
};

/**
 * Applies the workbook skip rules so hidden answers never persist:
 * 9=No keeps only A and 26; 11!=Si drops 12; 13!=Si drops 14-18; 19!=Si drops 20-21; 23!=Si drops 24.
 * "Ninguno" in field 17 is exclusive.
 */
export function normalize(values: CedulaValues): CedulaValues {
  const next: CedulaValues = {
    ...values,
    privateUnits: { ...values.privateUnits },
    equipment: [...values.equipment],
    orgFigures: [...values.orgFigures],
  };

  if (next.located === false) {
    next.dwellings = null;
    next.otherUnits = null;
    next.greenAreas = null;
    next.orgIdentified = null;
    next.source = null;
    next.hasDocEvidence = null;
  }
  if (next.otherUnits !== "YES") {
    next.privateUnits = { ...NO_PRIVATE_UNITS };
    next.privateOtherLabel = "";
  }
  if (next.greenAreas !== "YES") {
    next.greenAreaCount = null;
    next.greenType = null;
    next.greenUse = null;
    next.equipment = [];
    next.greenCondition = null;
  }
  if (next.orgIdentified !== "YES") {
    next.orgFigures = [];
    next.orgNotes = "";
  }
  if (next.hasDocEvidence !== true) next.docType = "";
  if (next.equipment.includes("NINGUNO")) next.equipment = ["NINGUNO"];

  return next;
}

/** Field 12 total, never stored: 0 if field 11 = No, null if unknown or any count is unknown. */
export function privateUnitsTotal(values: Pick<CedulaValues, "otherUnits" | "privateUnits">): number | null {
  if (values.otherUnits === "NO") return 0;
  if (values.otherUnits !== "YES") return null;
  const counts = Object.values(values.privateUnits);
  if (counts.some((c) => c === null)) return null;
  return counts.reduce<number>((sum, c) => sum + (c ?? 0), 0);
}

/** Sum of the counts already known, for the "parcial" display. */
export function privateUnitsKnownSum(values: Pick<CedulaValues, "privateUnits">): number {
  return Object.values(values.privateUnits).reduce<number>((sum, c) => sum + (c ?? 0), 0);
}

export type Issue = { step: number; message: string };

/** What must be answered before sending. Drafts may be incomplete; submissions may not. */
export function submitIssues(raw: CedulaValues): Issue[] {
  const v = normalize(raw);
  const issues: Issue[] = [];
  const need = (ok: boolean, step: number, message: string) => {
    if (!ok) issues.push({ step, message });
  };

  need(v.located !== null, 0, "9. Indicá si la unidad habitacional fue localizada");
  if (v.located === null) return issues;

  if (v.located === false) {
    need(v.observations.length > 0, 4, "26. Registrá la incidencia en observaciones");
    return issues;
  }

  need(v.lat !== null && v.lng !== null, 0, "4. Capturá las coordenadas (latitud y longitud)");

  need(v.otherUnits !== null, 1, "11. Indicá si hay otras unidades privativas");

  need(v.greenAreas !== null, 2, "13. Indicá si hay áreas verdes");
  if (v.greenAreas === "YES") {
    need(v.greenAreaCount !== null, 2, "14. Indicá el número de áreas verdes");
    need(v.greenType !== null, 2, "15. Seleccioná el tipo predominante");
    need(v.greenUse !== null, 2, "16. Seleccioná el uso principal");
    need(v.equipment.length > 0, 2, "17. Seleccioná el equipamiento (o «Ninguno»)");
    need(v.greenCondition !== null, 2, "18. Seleccioná la condición general");
  }

  need(v.orgIdentified !== null, 3, "19. Indicá si hay figura de administración");
  if (v.orgIdentified === "YES") {
    need(v.orgFigures.length > 0, 3, "20. Seleccioná al menos una figura identificada");
  }

  need(v.source !== null, 4, "22. Seleccioná la fuente principal");
  need(v.hasDocEvidence !== null, 4, "23. Indicá si hay evidencia documental");
  if (v.hasDocEvidence === true) need(v.docType.length > 0, 4, "24. Especificá el tipo de documento");

  return issues;
}

export const EMPTY_VALUES: CedulaValues = {
  name: "",
  juntaAuxiliar: "",
  colonia: "",
  address: "",
  lat: null,
  lng: null,
  located: null,
  dwellings: null,
  otherUnits: null,
  privateUnits: { ...NO_PRIVATE_UNITS },
  privateOtherLabel: "",
  greenAreas: null,
  greenAreaCount: null,
  greenType: null,
  greenUse: null,
  equipment: [],
  greenCondition: null,
  orgIdentified: null,
  orgFigures: [],
  orgNotes: "",
  source: null,
  hasDocEvidence: null,
  docType: "",
  observations: "",
};

export const PRIVATE_UNIT_TYPES = Object.values(PrivateUnitType);
