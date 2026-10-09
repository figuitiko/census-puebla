import { STACK_ORDER, UNIT_STATES, type UnitState } from "./filters";
import type { UnitRow } from "./rows";

// Three DISTINCT metrics, never merged (docs/implementation-plan.md section 4).
const COVERED: UnitState[] = ["SUBMITTED", "APPROVED"]; // waiting for or past review
const SUBMITTED_OR_LATER: UnitState[] = ["SUBMITTED", "APPROVED", "RETURNED"]; // were sent at least once

const ratio = (n: number, d: number) => (d === 0 ? null : n / d);
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

export type Metrics = {
  total: number;
  inScope: number;
  discovered: number;
  /** SUBMITTED or APPROVED, over in-scope units. RETURNED is back with the encuestador, so not covered. */
  coverage: { done: number; of: number; value: number | null };
  /** APPROVED over everything ever submitted (SUBMITTED, APPROVED, RETURNED). */
  approval: { done: number; of: number; value: number | null };
  /** Ready = APPROVED + located + enough confirmed photos + coordinates. Over APPROVED located units. */
  readiness: { done: number; of: number; value: number | null };
  /** Dwellings reported by SUBMITTED/APPROVED located units. Unknowns are excluded from the sum and counted apart. */
  dwellings: { known: number; unknownUnits: number; reportedUnits: number };
  /** Confirmed photos (capped at the minimum per unit) over minPhotos x located units. */
  photos: { done: number; of: number; value: number | null };
};

export function computeMetrics(rows: UnitRow[], minPhotos: number): Metrics {
  const inScope = rows.filter((r) => r.inScope);
  const covered = inScope.filter((r) => COVERED.includes(r.state)).length;

  const submittedOrLater = rows.filter((r) => SUBMITTED_OR_LATER.includes(r.state)).length;
  const approved = rows.filter((r) => r.state === "APPROVED");
  const approvedLocated = approved.filter((r) => r.located === true);
  const ready = approvedLocated.filter((r) => r.photos >= minPhotos && r.lat !== null && r.lng !== null).length;

  const reported = rows.filter((r) => COVERED.includes(r.state) && r.located === true);
  const known = reported.filter((r) => r.dwellings !== null);

  const located = rows.filter((r) => r.located === true);
  const photosDone = sum(located.map((r) => Math.min(r.photos, minPhotos)));
  const photosOf = minPhotos * located.length;

  return {
    total: rows.length,
    inScope: inScope.length,
    discovered: rows.length - inScope.length,
    coverage: { done: covered, of: inScope.length, value: ratio(covered, inScope.length) },
    approval: { done: approved.length, of: submittedOrLater, value: ratio(approved.length, submittedOrLater) },
    readiness: { done: ready, of: approvedLocated.length, value: ratio(ready, approvedLocated.length) },
    dwellings: {
      known: sum(known.map((r) => r.dwellings ?? 0)),
      unknownUnits: reported.length - known.length,
      reportedUnits: reported.length,
    },
    photos: { done: photosDone, of: photosOf, value: ratio(photosDone, photosOf) },
  };
}

export type BreakdownRow = {
  key: string;
  label: string;
  counts: Record<UnitState, number>;
  total: number;
};

const emptyCounts = (): Record<UnitState, number> =>
  Object.fromEntries(UNIT_STATES.map((s) => [s, 0])) as Record<UnitState, number>;

/** Units per encuestador by state. Busiest first, "Sin asignar" always last. */
export function stateByAssignee(rows: UnitRow[]): BreakdownRow[] {
  const groups = new Map<string, BreakdownRow>();
  for (const row of rows) {
    const key = row.assigneeId ?? "none";
    const group = groups.get(key) ?? { key, label: row.assigneeName ?? "Sin asignar", counts: emptyCounts(), total: 0 };
    group.counts[row.state] += 1;
    group.total += 1;
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => {
    if (a.key === "none") return 1;
    if (b.key === "none") return -1;
    return b.total - a.total || a.label.localeCompare(b.label, "es");
  });
}

export function stateTotals(rows: UnitRow[]) {
  const counts = emptyCounts();
  for (const row of rows) counts[row.state] += 1;
  return STACK_ORDER.map((state) => ({ state, count: counts[state] }));
}
