// Shared by the upload route, the confirm action and the client uploader. No server-only imports.

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
