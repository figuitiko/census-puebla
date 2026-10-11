import { get } from "@vercel/blob";
import { getCapture, type CaptureData } from "@/features/census/queries";
import { getReviewHistory } from "@/features/review/queries";
import { BLOB_ACCESS } from "@/lib/blob";
import { prisma } from "@/lib/prisma";

/** react-pdf can only embed these. HEIC / WebP photos are listed in the dossier but not drawn. */
const EMBEDDABLE = { "image/jpeg": "jpg", "image/png": "png" } as const;
const PHOTO_BATCH = 4; // bounded: full-size photos are held in memory while the PDF renders

export type DossierPhoto = {
  id: string;
  contentType: string;
  /** null = not embeddable (unsupported format) or the blob could not be read */
  image: { data: Buffer; format: "jpg" | "png" } | null;
};

export type Dossier = {
  capture: CaptureData;
  history: Awaited<ReturnType<typeof getReviewHistory>>;
  photos: DossierPhoto[];
};

async function readPhoto(pathname: string, contentType: string): Promise<DossierPhoto["image"]> {
  const format = EMBEDDABLE[contentType as keyof typeof EMBEDDABLE];
  if (!format) return null;

  try {
    const blob = await get(pathname, { access: BLOB_ACCESS });
    if (!blob || blob.statusCode !== 200) return null;
    return { data: Buffer.from(await new Response(blob.stream).arrayBuffer()), format };
  } catch (error) {
    // One unreadable photo must not take the whole dossier down; it is shown as "no disponible".
    console.error("[dossier] could not read photo", pathname, error);
    return null;
  }
}

export async function getDossier(unitId: string): Promise<Dossier | null> {
  const capture = await getCapture(unitId);
  if (!capture) return null;

  const history = capture.submissionId ? await getReviewHistory(capture.submissionId) : [];

  const evidence = capture.submissionId
    ? await prisma.evidence.findMany({
        where: { submissionId: capture.submissionId, kind: "PHOTO", status: "CONFIRMED" },
        select: { id: true, pathname: true, contentType: true },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const photos: DossierPhoto[] = [];
  for (let i = 0; i < evidence.length; i += PHOTO_BATCH) {
    const batch = evidence.slice(i, i + PHOTO_BATCH);
    const images = await Promise.all(batch.map((e) => readPhoto(e.pathname, e.contentType)));
    batch.forEach((e, n) => photos.push({ id: e.id, contentType: e.contentType, image: images[n] }));
  }

  return { capture, history, photos };
}
