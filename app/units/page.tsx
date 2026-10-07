import Link from "next/link";
import { getCampaign, toDateInput } from "@/lib/campaign";
import { can } from "@/lib/permissions";
import { requireCan } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateUnitDialog } from "./create-unit-dialog";
import { UnitAssignment } from "./unit-assignment";

export default async function UnitsPage() {
  const user = await requireCan("unit:assign");
  const campaign = await getCampaign();

  if (!campaign) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-6">
        <h1 className="text-2xl font-semibold">Unidades</h1>
        <p className="text-sm text-muted-foreground">
          Todavía no hay campaña.{" "}
          {can(user, "admin:manage") && (
            <Link href="/admin/campaign" className="underline">
              Crearla
            </Link>
          )}
        </p>
      </main>
    );
  }

  const [units, encuestadores] = await Promise.all([
    prisma.campaignUnit.findMany({
      where: { campaignId: campaign.id },
      include: { complex: true },
      orderBy: { folio: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "ENCUESTADOR", active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Unidades</h1>
          <p className="text-sm text-muted-foreground">
            {campaign.name} · {units.length} unidades
          </p>
        </div>
        {can(user, "admin:manage") && <CreateUnitDialog />}
      </header>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Folio</TableHead>
            <TableHead>Conjunto</TableHead>
            <TableHead>Colonia</TableHead>
            <TableHead>Junta auxiliar</TableHead>
            <TableHead>Alcance</TableHead>
            <TableHead>Asignación y fecha</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {units.map((unit) => (
            <TableRow key={unit.id}>
              <TableCell className="font-mono">{unit.folio}</TableCell>
              <TableCell className="font-medium">{unit.complex.name}</TableCell>
              <TableCell>{unit.complex.colonia ?? "—"}</TableCell>
              <TableCell>{unit.complex.juntaAuxiliar ?? "—"}</TableCell>
              <TableCell>
                <Badge variant={unit.inScope ? "default" : "secondary"}>
                  {unit.inScope ? "En alcance" : "Descubierta"}
                </Badge>
              </TableCell>
              <TableCell>
                <UnitAssignment
                  unitId={unit.id}
                  assigneeId={unit.assignedToId}
                  plannedDate={toDateInput(unit.plannedDate)}
                  encuestadores={encuestadores}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </main>
  );
}
