import type { SubmissionStatus } from "@/lib/generated/prisma/enums";

/** Workflow state of a unit. NOT_STARTED = no submission row yet. Ordered along the lifecycle. */
export const UNIT_STATES = ["NOT_STARTED", "DRAFT", "SUBMITTED", "RETURNED", "APPROVED"] as const;
export type UnitState = "NOT_STARTED" | SubmissionStatus;

export const STATE_LABELS: Record<UnitState, string> = {
  NOT_STARTED: "Sin iniciar",
  DRAFT: "Borrador",
  SUBMITTED: "Enviada",
  RETURNED: "Devuelta",
  APPROVED: "Aprobada",
};

/** Stack order (left to right): furthest along first, so progress reads from the baseline. */
export const STACK_ORDER: UnitState[] = ["APPROVED", "SUBMITTED", "DRAFT", "RETURNED", "NOT_STARTED"];

export type Scope = "all" | "in" | "out";

export type UnitFilters = {
  state: UnitState | null;
  colonia: string | null;
  junta: string | null;
  /** user id, or "none" for unassigned */
  assignee: string | null;
  scope: Scope;
};

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const clean = (value: string | undefined, max = 120) => (value && value.length <= max ? value : null);

/** Untrusted URL input -> a valid filter set. Anything unrecognised is dropped, never trusted. */
export function parseFilters(params: SearchParams): UnitFilters {
  const state = first(params.state);
  const scope = first(params.scope);
  return {
    state: (UNIT_STATES as readonly string[]).includes(state ?? "") ? (state as UnitState) : null,
    colonia: clean(first(params.colonia)),
    junta: clean(first(params.junta)),
    assignee: clean(first(params.assignee), 64),
    scope: scope === "in" || scope === "out" ? scope : "all",
  };
}

/** Inverse of `parseFilters`: "" when nothing is active, otherwise "?state=...&...". Built from SANITISED filters. */
export function filtersToQuery(filters: UnitFilters) {
  const params = new URLSearchParams();
  if (filters.state) params.set("state", filters.state);
  if (filters.colonia) params.set("colonia", filters.colonia);
  if (filters.junta) params.set("junta", filters.junta);
  if (filters.assignee) params.set("assignee", filters.assignee);
  if (filters.scope !== "all") params.set("scope", filters.scope);
  return params.size ? `?${params}` : "";
}

export function hasActiveFilters(filters: UnitFilters) {
  return Boolean(filters.state || filters.colonia || filters.junta || filters.assignee || filters.scope !== "all");
}
