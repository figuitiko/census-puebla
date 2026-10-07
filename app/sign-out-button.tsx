"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button onClick={onClick} disabled={pending} className="rounded border px-3 py-2 disabled:opacity-50">
      {pending ? "Saliendo…" : "Cerrar sesión"}
    </button>
  );
}
