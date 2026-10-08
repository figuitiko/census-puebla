"use server";

import { del, head } from "@vercel/blob";
import { authorizeEdit } from "@/features/census/authorize";
import { EVIDENCE_TYPES, isEvidencePathname, MAX_EVIDENCE_BYTES, MAX_PHOTOS_PER_SUBMISSION } from "@/lib/blob";
import { prisma } from "@/lib/prisma";

export type EvidenceResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * Registers an uploaded photo. `onUploadCompleted` never fires on localhost, so the DB row is
 * created here only after `head()` proves the blob exists with an allowed type and size.
 * Idempotent: confirming the same pathname twice returns the same row.
 */
export async function confirmEvidence(unitId: string, pathname: string): Promise<EvidenceResult> {
  const auth = await authorizeEdit(unitId);
  if (!auth.ok) return auth;

  const submission = auth.unit.submission;
  if (!submission) return { ok: false, error: "Guardá la cédula antes de subir fotos" };
  if (!isEvidencePathname(submission.id, pathname)) return { ok: false, error: "Ruta de archivo inválida" };

  let blob;
  try {
    blob = await head(pathname);
  } catch {
    return { ok: false, error: "No encontramos el archivo subido" };
  }

  if (!EVIDENCE_TYPES.includes(blob.contentType) || blob.size > MAX_EVIDENCE_BYTES) {
    await del(pathname).catch(() => {});
    return { ok: false, error: "Archivo no permitido (solo imágenes de hasta 15 MB)" };
  }

  const count = await prisma.evidence.count({ where: { submissionId: submission.id } });
  if (count >= MAX_PHOTOS_PER_SUBMISSION) {
    await del(pathname).catch(() => {});
    return { ok: false, error: `Máximo ${MAX_PHOTOS_PER_SUBMISSION} fotos por cédula` };
  }

  const evidence = await prisma.evidence.upsert({
    where: { pathname },
    update: {},
    create: {
      submissionId: submission.id,
      kind: "PHOTO",
      pathname,
      contentType: blob.contentType,
      size: blob.size,
      status: "CONFIRMED",
    },
  });
  return { ok: true, id: evidence.id };
}

/** Same lock as editing the cedula: once submitted, photos are frozen until it is returned. */
export async function deleteEvidence(unitId: string, evidenceId: string): Promise<EvidenceResult> {
  const auth = await authorizeEdit(unitId);
  if (!auth.ok) return auth;
  if (!auth.unit.submission) return { ok: false, error: "Foto no encontrada" };

  const evidence = await prisma.evidence.findFirst({
    where: { id: evidenceId, submissionId: auth.unit.submission.id },
    select: { id: true, pathname: true },
  });
  if (!evidence) return { ok: false, error: "Foto no encontrada" };

  // Row first: a failed blob delete leaves an orphan file, never a row pointing at nothing.
  await prisma.evidence.delete({ where: { id: evidence.id } });
  await del(evidence.pathname).catch(() => {});

  return { ok: true, id: evidence.id };
}
