import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { authorizeEdit } from "@/features/census/authorize";
import { assertBlobStore } from "@/lib/blob-health";
import { EVIDENCE_TYPES, isEvidencePathname, MAX_EVIDENCE_BYTES, MAX_PHOTOS_PER_SUBMISSION } from "@/lib/blob";
import { prisma } from "@/lib/prisma";

function unitIdFrom(clientPayload: string | null) {
  try {
    const parsed = JSON.parse(clientPayload ?? "{}");
    if (typeof parsed.unitId === "string") return parsed.unitId;
  } catch {}
  throw new Error("Solicitud inválida");
}

/**
 * Issues a short-lived client token so the browser uploads straight to private Blob
 * (the 4.5MB function body cap rules out proxying photos). Every upload is authorized here;
 * the DB row is created later by `confirmEvidence`, which verifies the blob exists.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const auth = await authorizeEdit(unitIdFrom(clientPayload));
        if (!auth.ok) throw new Error(auth.error);
        await assertBlobStore();

        const submission = auth.unit.submission;
        if (!submission) throw new Error("Guardá la cédula antes de subir fotos");
        if (!isEvidencePathname(submission.id, pathname)) throw new Error("Ruta de archivo inválida");

        const count = await prisma.evidence.count({ where: { submissionId: submission.id } });
        if (count >= MAX_PHOTOS_PER_SUBMISSION) {
          throw new Error(`Máximo ${MAX_PHOTOS_PER_SUBMISSION} fotos por cédula`);
        }

        return {
          allowedContentTypes: EVIDENCE_TYPES,
          maximumSizeInBytes: MAX_EVIDENCE_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return Response.json(json);
  } catch (error) {
    // The Blob client SDK hides this message behind "Failed to retrieve the client token", so log it here.
    console.error("[evidence/upload]", error instanceof Error ? error.message : error);
    return Response.json({ error: error instanceof Error ? error.message : "Error al subir" }, { status: 400 });
  }
}
