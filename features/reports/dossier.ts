import { get } from "@vercel/blob";
import sharp from "sharp";
import { getCapture, type CaptureData } from "@/features/census/queries";
import { getReviewHistory } from "@/features/review/queries";
import { BLOB_ACCESS } from "@/lib/blob";
import { prisma } from "@/lib/prisma";

/**
 * Every photo is re-encoded to a downscaled JPEG before it goes in the PDF: react-pdf only embeds JPEG/PNG,
 * and full-size phone photos would push a 10-photo dossier past Vercel's 4.5MB function response cap.
 * sharp's prebuilt binary decodes JPEG, PNG, WebP and AVIF but NOT HEIC (HEVC), so HEIC photos fall back
 * to "No disponible en el PDF".
 */
const MAX_SIDE = 1400; // px, long side. Plenty for a ~half-page photo at print resolution
const JPEG_QUALITY = 72;
const PHOTO_BATCH = 4; // bounded: full-size photos are held in memory while they are converted

export type DossierPhoto = {
  id: string;
  contentType: string;
  /** null = could not be decoded (e.g. HEIC) or the blob could not be read */
  image: { data: Buffer; format: "jpg" } | null;
};

export type Dossier = {
  capture: CaptureData;
  history: Awaited<ReturnType<typeof getReviewHistory>>;
  photos: DossierPhoto[];
};

async function readPhoto(pathname: string): Promise<DossierPhoto["image"]> {
  try {
    const blob = await get(pathname, { access: BLOB_ACCESS });
    if (!blob || blob.statusCode !== 200) return null;

    const original = Buffer.from(await new Response(blob.stream).arrayBuffer());
    const data = await sharp(original)
      .rotate() // apply EXIF orientation, otherwise phone photos come out sideways
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" }) // PNG/WebP transparency would turn black as JPEG
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer();
    return { data, format: "jpg" };
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
    const images = await Promise.all(batch.map((e) => readPhoto(e.pathname)));
    batch.forEach((e, n) => photos.push({ id: e.id, contentType: e.contentType, image: images[n] }));
  }

  return { capture, history, photos };
}
