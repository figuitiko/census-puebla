"use server";

import { revalidatePath } from "next/cache";
import { getCampaign, parseDateInput } from "@/lib/campaign";
import { requireCan } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export type ActionState = { ok: boolean; error?: string };

function optional(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

export async function createUnit(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireCan("admin:manage");

  const campaign = await getCampaign();
  if (!campaign) return { ok: false, error: "Creá primero la campaña" };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "El nombre es obligatorio" };

  try {
    await prisma.$transaction(async (tx) => {
      const count = await tx.campaignUnit.count({ where: { campaignId: campaign.id } });
      const complex = await tx.housingComplex.create({
        data: {
          name,
          address: optional(formData.get("address")),
          juntaAuxiliar: optional(formData.get("juntaAuxiliar")),
          colonia: optional(formData.get("colonia")),
        },
      });
      await tx.campaignUnit.create({
        data: {
          campaignId: campaign.id,
          complexId: complex.id,
          folio: `UH-${String(count + 1).padStart(3, "0")}`,
        },
      });
    });
  } catch {
    // Concurrent creates can collide on the (campaignId, folio) unique index.
    return { ok: false, error: "No se pudo crear la unidad, intentá de nuevo" };
  }

  revalidatePath("/units");
  return { ok: true };
}

/** `assigneeId = null` clears the assignment. */
export async function assignUnit(unitId: string, assigneeId: string | null): Promise<ActionState> {
  await requireCan("unit:assign");

  if (assigneeId) {
    const assignee = await prisma.user.findUnique({
      where: { id: assigneeId },
      select: { role: true, active: true },
    });
    if (!assignee || assignee.role !== "ENCUESTADOR" || !assignee.active) {
      return { ok: false, error: "Solo se puede asignar a encuestadores activos" };
    }
  }

  await prisma.campaignUnit.update({ where: { id: unitId }, data: { assignedToId: assigneeId } });

  revalidatePath("/units");
  return { ok: true };
}

/** Empty `date` clears the planned date. */
export async function planUnit(unitId: string, date: string): Promise<ActionState> {
  await requireCan("unit:assign");

  const plannedDate = date ? parseDateInput(date) : null;
  if (date && !plannedDate) return { ok: false, error: "Fecha inválida" };

  await prisma.campaignUnit.update({ where: { id: unitId }, data: { plannedDate } });

  revalidatePath("/units");
  return { ok: true };
}
