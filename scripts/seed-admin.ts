import { createUserWithPassword } from "@/lib/auth-users";
import type { Role } from "@/lib/generated/prisma/enums";

type SeedUser = { email: string; name: string; password: string; role: Role };

/** Idempotent: an existing email is reported and skipped, not an error. */
async function ensureUser(input: SeedUser) {
  try {
    const user = await createUserWithPassword(input);
    console.log(`${input.role} created: ${user.email} (${user.id})`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("User already exists")) {
      console.log(`${input.role} already exists, skipped: ${input.email}`);
      return;
    }
    throw error;
  }
}

async function main() {
  const { SEED_ADMIN_EMAIL, SEED_ADMIN_NAME, SEED_ADMIN_PASSWORD, SEED_POLLSTER, SEED_POLLSTER_PASSWORD } =
    process.env;

  if (!SEED_ADMIN_EMAIL || !SEED_ADMIN_NAME || !SEED_ADMIN_PASSWORD) {
    throw new Error("Set SEED_ADMIN_EMAIL, SEED_ADMIN_NAME and SEED_ADMIN_PASSWORD in .env");
  }

  await ensureUser({ email: SEED_ADMIN_EMAIL, name: SEED_ADMIN_NAME, password: SEED_ADMIN_PASSWORD, role: "ADMIN" });

  // Optional encuestador for local testing: needs both variables.
  if (SEED_POLLSTER && SEED_POLLSTER_PASSWORD) {
    await ensureUser({
      email: SEED_POLLSTER,
      name: SEED_POLLSTER.split("@")[0],
      password: SEED_POLLSTER_PASSWORD,
      role: "ENCUESTADOR",
    });
  } else if (SEED_POLLSTER || SEED_POLLSTER_PASSWORD) {
    console.warn("Encuestador skipped: set both SEED_POLLSTER and SEED_POLLSTER_PASSWORD");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
