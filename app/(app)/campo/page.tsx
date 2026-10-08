import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { listCaptureUnits } from "@/features/census/queries";
import { STATUS_LABELS } from "@/lib/catalogs";
import { requireUser } from "@/lib/dal";

export default async function CampoPage() {
  const user = await requireUser();
  if (user.role !== "ADMIN" && user.role !== "ENCUESTADOR") redirect("/");

  const units = await listCaptureUnits(user);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4">
      <header>
        <h1 className="text-2xl font-semibold">Mis unidades</h1>
        <p className="text-sm text-muted-foreground">{units.length} asignadas</p>
      </header>

      {units.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no tenés unidades asignadas.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {units.map((unit) => {
            const status = unit.submission?.status;
            return (
              <li key={unit.id}>
                <Link href={`/campo/${unit.id}`}>
                  <Card className="transition-colors hover:bg-accent">
                    <CardContent className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-muted-foreground">{unit.folio}</p>
                        <p className="truncate font-medium">{unit.complex.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {unit.complex.colonia ?? "Sin colonia"}
                          {unit.plannedDate && ` · ${unit.plannedDate.toISOString().slice(0, 10)}`}
                        </p>
                      </div>
                      <Badge variant={status === "APPROVED" ? "default" : "secondary"}>
                        {status ? STATUS_LABELS[status] : "Sin iniciar"}
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
