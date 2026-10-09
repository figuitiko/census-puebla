import { del, put } from "@vercel/blob";
import { BLOB_ACCESS } from "@/lib/blob";

let verified = false;

/**
 * Proves the configured Blob store accepts writes in the configured access mode, once per server process.
 * A public store (or a bad token) makes client uploads stream for a while, get rejected, and then
 * sit in the SDK's retry loop, which looks like a frozen progress bar. Failing here is instant and
 * the message reaches the user's toast.
 */
export async function assertBlobStore() {
  if (verified) return;

  try {
    const probe = await put("healthcheck/probe.txt", "ok", {
      access: BLOB_ACCESS,
      addRandomSuffix: true,
      contentType: "text/plain",
    });
    await del(probe.pathname).catch(() => {});
    verified = true;
  } catch (error) {
    console.error("[blob] store check failed:", error instanceof Error ? error.message : error);
    throw new Error(`El almacenamiento de fotos no coincide con el modo configurado (${BLOB_ACCESS}). Avisá al administrador.`);
  }
}
