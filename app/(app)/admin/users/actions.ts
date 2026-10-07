"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { createUserWithPassword } from "@/lib/auth-users";
import { requireCan } from "@/lib/dal";
import { Role } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export type ActionState = { ok: boolean; error?: string };

const MIN_PASSWORD = 8;
const ROLES = Object.values(Role);

function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as string[]).includes(value);
}

export async function createUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireCan("admin:manage");

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = formData.get("role");

  if (!name) return { ok: false, error: "El nombre es obligatorio" };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "Correo inválido" };
  if (password.length < MIN_PASSWORD) {
    return { ok: false, error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres` };
  }
  if (!isRole(role)) return { ok: false, error: "Rol inválido" };

  try {
    await createUserWithPassword({ name, email, password, role });
  } catch (error) {
    const message = error instanceof Error && error.message.startsWith("User already exists")
      ? "Ya existe un usuario con ese correo"
      : "No se pudo crear el usuario";
    return { ok: false, error: message };
  }

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setUserActive(userId: string, active: boolean): Promise<ActionState> {
  const admin = await requireCan("admin:manage");
  if (userId === admin.id) return { ok: false, error: "No podés desactivarte a vos mismo" };

  await prisma.user.update({ where: { id: userId }, data: { active } });
  if (!active) {
    // The DAL already rejects inactive users; revoking sessions makes it immediate and explicit.
    await (await auth.$context).internalAdapter.deleteUserSessions(userId);
  }

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setUserRole(userId: string, role: string): Promise<ActionState> {
  const admin = await requireCan("admin:manage");
  if (userId === admin.id) return { ok: false, error: "No podés cambiar tu propio rol" };
  if (!isRole(role)) return { ok: false, error: "Rol inválido" };

  await prisma.user.update({ where: { id: userId }, data: { role } });

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function resetPassword(
  userId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireCan("admin:manage");

  const password = String(formData.get("password") ?? "");
  if (password.length < MIN_PASSWORD) {
    return { ok: false, error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres` };
  }

  const ctx = await auth.$context;
  await ctx.internalAdapter.updatePassword(userId, await ctx.password.hash(password));
  await ctx.internalAdapter.deleteUserSessions(userId);

  return { ok: true };
}
