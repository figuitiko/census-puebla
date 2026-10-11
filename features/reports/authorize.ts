import { getUser, type SessionUser } from "@/lib/dal";

type Access = { user: SessionUser; denied?: never } | { user?: never; denied: Response };

/**
 * Reports expose approved AND unapproved data, so they follow the dashboard rule: ADMIN, COORDINADOR and
 * VISOR only. ENCUESTADOR gets 403 even for their own units (they have /campo). Checked per request:
 * proxy.ts only looks for a cookie, it is not a security boundary.
 */
export async function authorizeReports(): Promise<Access> {
  const user = await getUser();
  if (!user) return { denied: new Response("No autenticado", { status: 401 }) };
  if (user.role === "ENCUESTADOR") return { denied: new Response("Sin permiso", { status: 403 }) };
  return { user };
}

/** Content-Disposition filename: ASCII only, no path or header-breaking characters. */
export function safeFilename(name: string) {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 80);
}
