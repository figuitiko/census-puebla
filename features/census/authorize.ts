import { getUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { canOpenUnit } from "./queries";

/**
 * Loads the unit and checks the caller may edit its cedula. Returns a result instead of redirecting
 * so server actions AND route handlers can share it.
 */
export async function authorizeEdit(unitId: string) {
  const user = await getUser();
  if (!user) return { ok: false, error: "Tu sesión venció, volvé a iniciar sesión" } as const;

  const unit = await prisma.campaignUnit.findUnique({
    where: { id: unitId },
    select: {
      id: true,
      complexId: true,
      assignedToId: true,
      campaign: { select: { minPhotos: true } },
      submission: { select: { id: true, status: true, version: true } },
    },
  });

  if (!unit || !canOpenUnit(user, unit)) return { ok: false, error: "No tenés acceso a esta unidad" } as const;

  const status = unit.submission?.status ?? "DRAFT";
  if (!can(user, "submission:edit", { assigneeId: unit.assignedToId, status })) {
    return { ok: false, error: "Esta cédula ya no se puede editar" } as const;
  }
  return { ok: true, user, unit } as const;
}
