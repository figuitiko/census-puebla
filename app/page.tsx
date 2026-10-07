import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { SignOutButton } from "./sign-out-button";

export default async function Home() {
  const user = await requireUser();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
      <p className="text-lg">
        {user.name} <span className="text-sm opacity-60">({user.role})</span>
      </p>
      {user.role === "ADMIN" && (
        <Link href="/admin/users" className="text-sm underline">
          Administrar usuarios
        </Link>
      )}
      <SignOutButton />
    </main>
  );
}
