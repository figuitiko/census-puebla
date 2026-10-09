import type { UnitState } from "./filters";

/** CSS tokens from globals.css (light/dark values live there). Plain module: safe in server AND client components. */
export const STATE_COLOR: Record<UnitState, string> = {
  APPROVED: "var(--state-approved)",
  SUBMITTED: "var(--state-submitted)",
  DRAFT: "var(--state-draft)",
  RETURNED: "var(--state-returned)",
  NOT_STARTED: "var(--state-notstarted)",
};
