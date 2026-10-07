import { redirect } from "next/navigation";
import { getUser } from "@/lib/dal";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await getUser()) redirect("/");

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <LoginForm />
    </main>
  );
}
