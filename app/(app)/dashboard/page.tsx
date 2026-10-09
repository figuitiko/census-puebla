import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { RegistryTable } from "@/features/dashboard/components/registry-table";
import { StatTile, formatPercent } from "@/features/dashboard/components/stat-tile";
import { StatusChart } from "@/features/dashboard/components/status-chart";
import { UnitMap } from "@/features/dashboard/components/unit-map-lazy";
import { parseFilters } from "@/features/dashboard/filters";
import { computeMetrics, stateByAssignee, stateTotals } from "@/features/dashboard/metrics";
import { getCampaignRows } from "@/features/dashboard/queries";
import { applyFilters, filterOptions } from "@/features/dashboard/rows";
import { requireUser } from "@/lib/dal";

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const user = await requireUser();
  // Encuestadores only get their own list; ADMIN, COORDINADOR and VISOR see all data.
  if (user.role === "ENCUESTADOR") redirect("/campo");

  const data = await getCampaignRows();
  if (!data) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 p-6">
        <h1 className="text-2xl font-semibold">Tablero</h1>
        <p className="text-sm text-muted-foreground">Todavía no hay campaña configurada.</p>
      </div>
    );
  }

  const filters = parseFilters(await searchParams);
  const rows = applyFilters(data.rows, filters);
  const { minPhotos } = data.campaign;
  const m = computeMetrics(rows, minPhotos);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Tablero</h1>
        <p className="text-sm text-muted-foreground">
          {data.campaign.name} · {rows.length} de {data.rows.length} unidades
        </p>
      </header>

      <DashboardShell filters={filters} options={filterOptions(data.rows)}>
        {/* Three DISTINCT metrics. They answer different questions and are never merged. */}
        <section aria-label="Indicadores" className="grid gap-4 sm:grid-cols-3">
          <StatTile
            hero
            label="Cobertura"
            value={formatPercent(m.coverage.value)}
            ratio={m.coverage.value}
            caption={
              <>
                {m.coverage.done} de {m.coverage.of} unidades en alcance enviadas o aprobadas
                {m.discovered > 0 && ` · ${m.discovered} descubiertas aparte`}
              </>
            }
          />
          <StatTile
            label="Aprobación"
            value={formatPercent(m.approval.value)}
            ratio={m.approval.value}
            caption={`${m.approval.done} aprobadas de ${m.approval.of} que se enviaron alguna vez`}
          />
          <StatTile
            label="Expedientes listos"
            value={formatPercent(m.readiness.value)}
            ratio={m.readiness.value}
            caption={`${m.readiness.done} de ${m.readiness.of} aprobadas y localizadas, con ${minPhotos} fotos y coordenadas`}
          />
        </section>

        <section aria-label="Datos recabados" className="grid gap-4 sm:grid-cols-2">
          <StatTile
            label="Viviendas registradas"
            value={m.dwellings.known.toLocaleString("es-MX")}
            caption={
              <>
                En {m.dwellings.reportedUnits} cédulas enviadas
                {m.dwellings.unknownUnits > 0 && ` · ${m.dwellings.unknownUnits} sin dato`}
              </>
            }
          />
          <StatTile
            label="Avance de fotografías"
            value={formatPercent(m.photos.value)}
            ratio={m.photos.value}
            caption={`${m.photos.done} de ${m.photos.of} fotos requeridas en unidades localizadas`}
          />
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estado de las unidades por encuestador</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusChart rows={stateByAssignee(rows)} totals={stateTotals(rows)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mapa de unidades</CardTitle>
          </CardHeader>
          <CardContent>
            <UnitMap units={rows} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registro</CardTitle>
          </CardHeader>
          <CardContent>
            <RegistryTable rows={rows} minPhotos={minPhotos} />
          </CardContent>
        </Card>
      </DashboardShell>

      {user.role === "VISOR" && (
        <p className="text-xs text-muted-foreground">
          Vista de solo lectura con todos los datos, incluidas las cédulas aún no aprobadas.{" "}
          <Link href="/" className="underline">
            Inicio
          </Link>
        </p>
      )}
    </div>
  );
}
