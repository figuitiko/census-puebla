// Shared by the upload route, the confirm action and the client uploader. No server-only imports.

/**
 * "private" is the production setting (photos are only reachable through the authenticated route).
 * "public" exists so a public Blob store can be used while testing. It must match the store's mode.
 * NEXT_PUBLIC_ so the browser uploader and the server agree; restart `next dev` after changing it.
 */
export const BLOB_ACCESS: "public" | "private" = process.env.NEXT_PUBLIC_BLOB_ACCESS === "public" ? "public" : "private";

export const EVIDENCE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
export const MAX_EVIDENCE_BYTES = 15 * 1024 * 1024;
export const MAX_PHOTOS_PER_SUBMISSION = 50;

export const evidencePrefix = (submissionId: string) => `evidence/${submissionId}/`;

/** The client picks the pathname, so the server only accepts `evidence/<submissionId>/<safe name>`. */
export function isEvidencePathname(submissionId: string, pathname: string) {
  const prefix = evidencePrefix(submissionId);
  return pathname.startsWith(prefix) && /^[A-Za-z0-9._-]{1,160}$/.test(pathname.slice(prefix.length));
}

export function safeFileName(name: string) {
  return name.replace(/[^A-Za-z0-9._-]/g, "_").slice(-100) || "foto";
}
