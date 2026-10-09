import { del, put } from "@vercel/blob";

let verified = false;

/**
 * Proves the configured Blob store accepts PRIVATE writes, once per server process.
 * A public store (or a bad token) makes client uploads stream for a while, get rejected, and then
 * sit in the SDK's retry loop, which looks like a frozen progress bar. Failing here is instant and
 * the message reaches the user's toast.
 */
export async function assertPrivateStore() {
  if (verified) return;

  try {
    const probe = await put("healthcheck/probe.txt", "ok", {
      access: "private",
      addRandomSuffix: true,
      contentType: "text/plain",
    });
    await del(probe.pathname).catch(() => {});
    verified = true;
  } catch (error) {
    console.error("[blob] store check failed:", error instanceof Error ? error.message : error);
    throw new Error("El almacenamiento de fotos no está configurado como privado. Avisá al administrador.");
  }
}
