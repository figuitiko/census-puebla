"use server";

import { revalidatePath } from "next/cache";
import { getCampaign, parseDateInput } from "@/lib/campaign";
import { requireCan } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export type ActionState = { ok: boolean; error?: string };

export async function saveCampaign(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireCan("admin:manage");

  const name = String(formData.get("name") ?? "").trim();
  const municipality = String(formData.get("municipality") ?? "").trim();
  const startsOn = parseDateInput(formData.get("startsOn"));
  const endsOn = parseDateInput(formData.get("endsOn"));

  if (!name) return { ok: false, error: "El nombre es obligatorio" };
  if (!municipality) return { ok: false, error: "El municipio es obligatorio" };
  if (!startsOn || !endsOn) return { ok: false, error: "Fechas inválidas" };
  if (endsOn < startsOn) return { ok: false, error: "La fecha final no puede ser anterior a la inicial" };

  const data = { name, municipality, startsOn, endsOn };
  const existing = await getCampaign();
  if (existing) await prisma.campaign.update({ where: { id: existing.id }, data });
  else await prisma.campaign.create({ data });

  revalidatePath("/admin/campaign");
  revalidatePath("/units");
  return { ok: true };
}
