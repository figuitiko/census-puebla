import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can, type Action, type Resource } from "@/lib/permissions";
import type { Role } from "@/lib/generated/prisma/enums";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

/** Verified session (DB-backed), deduplicated per request. Null if anonymous or deactivated. */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const { id, name, email, role, active } = session.user as typeof session.user & {
    role: Role;
    active: boolean;
  };
  if (!active) return null;

  return { id, name, email, role };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

/** Redirects to "/" when the user lacks permission. Use in pages and server actions. */
export async function requireCan(action: Action, resource?: Resource): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user, action, resource)) redirect("/");
  return user;
}
