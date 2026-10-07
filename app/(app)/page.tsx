import Link from "next/link";
import { Building2, CalendarRange, Users, type LucideIcon } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/dal";
import { can, type Action } from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/roles";

const SHORTCUTS: { title: string; description: string; href: string; icon: LucideIcon; action: Action }[] = [
  { title: "Unidades", description: "Crear y asignar unidades habitacionales", href: "/units", icon: Building2, action: "unit:assign" },
  { title: "Usuarios", description: "Altas, roles y accesos", href: "/admin/users", icon: Users, action: "admin:manage" },
  { title: "Campaña", description: "Fechas y parámetros del levantamiento", href: "/admin/campaign", icon: CalendarRange, action: "admin:manage" },
];

export default async function Home() {
  const user = await requireUser();
  const shortcuts = SHORTCUTS.filter((item) => can(user, item.action));

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Hola, {user.name}</h1>
        <p className="text-sm text-muted-foreground">Sesión como {ROLE_LABELS[user.role]}</p>
      </header>

      {shortcuts.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shortcuts.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="h-full transition-colors hover:bg-accent">
                <CardHeader>
                  <item.icon className="mb-2 size-5 text-muted-foreground" />
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Todavía no tenés secciones disponibles.</p>
      )}
    </div>
  );
}
