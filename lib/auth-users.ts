import { auth } from "@/lib/auth";
import type { Role } from "@/lib/generated/prisma/enums";

type CreateUserInput = {
  email: string;
  name: string;
  password: string;
  role: Role;
};

/**
 * Creates a user + credential account server-side. Sign-up is disabled on the
 * public API, so this is the only path to a new user. Does not check permissions:
 * callers (seed script, admin actions) must authorize first.
 */
export async function createUserWithPassword({ email, name, password, role }: CreateUserInput) {
  const ctx = await auth.$context;

  if (await ctx.internalAdapter.findUserByEmail(email)) {
    throw new Error(`User already exists: ${email}`);
  }

  const user = await ctx.internalAdapter.createUser({
    email,
    name,
    emailVerified: true,
    role,
    active: true,
  }, { method: "admin" });

  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: "credential",
    accountId: user.id,
    password: await ctx.password.hash(password),
  });

  return user;
}
