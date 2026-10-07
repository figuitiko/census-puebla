import { createUserWithPassword } from "@/lib/auth-users";

async function main() {
  const { SEED_ADMIN_EMAIL, SEED_ADMIN_NAME, SEED_ADMIN_PASSWORD } = process.env;

  if (!SEED_ADMIN_EMAIL || !SEED_ADMIN_NAME || !SEED_ADMIN_PASSWORD) {
    throw new Error("Set SEED_ADMIN_EMAIL, SEED_ADMIN_NAME and SEED_ADMIN_PASSWORD in .env");
  }

  const user = await createUserWithPassword({
    email: SEED_ADMIN_EMAIL,
    name: SEED_ADMIN_NAME,
    password: SEED_ADMIN_PASSWORD,
    role: "ADMIN",
  });

  console.log(`Admin created: ${user.email} (${user.id})`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
