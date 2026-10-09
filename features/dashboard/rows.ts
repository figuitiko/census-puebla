import type { UnitFilters, UnitState } from "./filters";

export type UnitRow = {
  id: string;
  folio: string;
  name: string;
  colonia: string | null;
  junta: string | null;
  inScope: boolean;
  assigneeId: string | null;
  assigneeName: string | null;
  state: UnitState;
  located: boolean | null;
  dwellings: number | null;
  /** confirmed photos */
  photos: number;
  lat: number | null;
  lng: number | null;
};

export function applyFilters(rows: UnitRow[], filters: UnitFilters): UnitRow[] {
  return rows.filter(
    (row) =>
      (!filters.state || row.state === filters.state) &&
      (!filters.colonia || row.colonia === filters.colonia) &&
      (!filters.junta || row.junta === filters.junta) &&
      (!filters.assignee || (filters.assignee === "none" ? row.assigneeId === null : row.assigneeId === filters.assignee)) &&
      (filters.scope === "all" || (filters.scope === "in" ? row.inScope : !row.inScope)),
  );
}

/** Choices for the filter row, derived from the UNFILTERED list so options never vanish after filtering. */
export function filterOptions(rows: UnitRow[]) {
  const unique = (values: (string | null)[]) =>
    [...new Set(values.filter((v): v is string => Boolean(v)))].sort((a, b) => a.localeCompare(b, "es"));

  const assignees = new Map<string, string>();
  for (const row of rows) if (row.assigneeId && row.assigneeName) assignees.set(row.assigneeId, row.assigneeName);

  return {
    colonias: unique(rows.map((r) => r.colonia)),
    juntas: unique(rows.map((r) => r.junta)),
    assignees: [...assignees].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "es")),
  };
}
