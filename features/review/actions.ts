"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export type ReviewResult = { ok: true } | { ok: false; error: string };

const CONFLICT = "Esta cédula cambió desde que la abriste. Recargá la página.";
const MAX_COMMENT = 2000;

/**
 * Approve or return a SUBMITTED cedula. Returning REQUIRES a comment (the encuestador needs to know
 * what to fix). The status change and the Review row share one transaction guarded by `version`.
 */
export async function reviewCedula(
  unitId: string,
  expectedVersion: number,
  decision: "APPROVED" | "RETURNED",
  comment: string,
): Promise<ReviewResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Tu sesión venció, volvé a iniciar sesión" };
  if (!can(user, "submission:review")) return { ok: false, error: "No tenés permiso para revisar" };

  if (decision !== "APPROVED" && decision !== "RETURNED") return { ok: false, error: "Decisión inválida" };
  const text = comment.trim().slice(0, MAX_COMMENT);
  if (decision === "RETURNED" && !text) {
    return { ok: false, error: "El comentario es obligatorio al devolver" };
  }

  const submission = await prisma.censusSubmission.findUnique({
    where: { unitId },
    select: { id: true, status: true, version: true },
  });
  if (!submission) return { ok: false, error: "Cédula no encontrada" };
  if (submission.status !== "SUBMITTED") return { ok: false, error: "Esta cédula no está pendiente de revisión" };
  if (submission.version !== expectedVersion) return { ok: false, error: CONFLICT };

  try {
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.censusSubmission.updateMany({
        where: { id: submission.id, version: expectedVersion, status: "SUBMITTED" },
        data: {
          status: decision,
          approvedAt: decision === "APPROVED" ? new Date() : null,
          version: { increment: 1 },
        },
      });
      if (count === 0) throw new Error("CONFLICT");

      await tx.review.create({
        data: { submissionId: submission.id, reviewerId: user.id, decision, comment: text || null },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "CONFLICT") return { ok: false, error: CONFLICT };
    throw error;
  }

  revalidatePath("/review");
  revalidatePath("/campo");
  return { ok: true };
}
