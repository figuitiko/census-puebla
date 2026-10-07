import type { Role } from "@/lib/generated/prisma/enums";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  COORDINADOR: "Coordinador",
  ENCUESTADOR: "Encuestador",
  VISOR: "Visor",
};
