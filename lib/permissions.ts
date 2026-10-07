import type { Role, SubmissionStatus } from "@/lib/generated/prisma/enums";

export type Action =
  | "admin:manage" // users, campaign, units
  | "unit:assign"
  | "submission:edit" // edit / submit cedula, upload evidence
  | "submission:review" // approve / return
  | "dashboard:view"
  | "evidence:read"
  | "evidence:delete";

/** Context needed to resolve "own" rules for ENCUESTADOR. */
export type Resource = {
  assigneeId?: string | null;
  status?: SubmissionStatus;
};

type Actor = { id: string; role: Role };

/**
 * Single source of truth for the roles matrix (docs/implementation-plan.md §3).
 * Call it on every page, route and server action. proxy.ts is NOT a security boundary.
 */
export function can(actor: Actor, action: Action, resource?: Resource): boolean {
  const { role } = actor;
  if (role === "ADMIN") return true;

  const own = resource?.assigneeId != null && resource.assigneeId === actor.id;

  switch (action) {
    case "admin:manage":
      return false;
    case "unit:assign":
    case "submission:review":
      return role === "COORDINADOR";
    case "submission:edit":
      return (
        role === "ENCUESTADOR" &&
        own &&
        (resource?.status === "DRAFT" || resource?.status === "RETURNED")
      );
    case "dashboard:view":
      // ENCUESTADOR gets only their own units list; callers must scope the query.
      return true;
    case "evidence:read":
      return role === "COORDINADOR" || role === "VISOR" || (role === "ENCUESTADOR" && own);
    case "evidence:delete":
      return (
        role === "COORDINADOR" ||
        (role === "ENCUESTADOR" && own && resource?.status !== "APPROVED")
      );
  }
}
