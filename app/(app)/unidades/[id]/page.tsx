import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCapture } from "@/features/census/queries";
import { UnitMap } from "@/features/dashboard/components/unit-map-lazy";
import { STATE_LABELS } from "@/features/dashboard/filters";
import { EvidenceGrid } from "@/features/evidence/components/evidence-grid";
import { CedulaSummary } from "@/features/review/components/cedula-summary";
import { ReviewHistory } from "@/features/review/components/review-history";
import { getReviewHistory } from "@/features/review/queries";
import { requireUser } from "@/lib/dal";
import { can } from "@/lib/permissions";

/** Read-only dossier of one unit. ADMIN, COORDINADOR and VISOR see all data, approved or not. */
export default async function DossierPage(props: PageProps<"/unidades/[id]">) {
  const user = await requireUser();
  if (user.role === "ENCUESTADOR") redirect("/campo");

  const { id } = await props.params;
  const capture = await getCapture(id);
  if (!capture) notFound();

  const started = capture.submissionId !== null;
  const state = started ? capture.status : "NOT_STARTED";
  const history = capture.submissionId ? await getReviewHistory(capture.submissionId) : [];
  const awaitingReview = state === "SUBMITTED" && can(user, "submission:review");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-2">
        <Link href="/dashboard" className="text-sm text-muted-foreground underline">
          ← Volver al tablero
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-muted-foreground">{capture.folio}</p>
            <h1 className="text-2xl font-semibold">{capture.values.name}</h1>
            <p className="text-sm text-muted-foreground">
              {[capture.values.colonia, capture.values.juntaAuxiliar].filter(Boolean).join(" · ") || "Sin colonia"}
            </p>
          </div>
          <Badge variant={state === "APPROVED" ? "default" : "secondary"}>{STATE_LABELS[state]}</Badge>
        </div>
        {awaitingReview && (
          <Link href={`/review/${capture.unitId}`} className="text-sm underline">
            Esta cédula espera revisión: ir a revisarla
          </Link>
        )}
      </header>

      <Tabs defaultValue="cedula">
        <TabsList>
          <TabsTrigger value="cedula">Cédula</TabsTrigger>
          <TabsTrigger value="fotos">Fotos ({capture.evidence.length})</TabsTrigger>
          <TabsTrigger value="mapa">Mapa</TabsTrigger>
          <TabsTrigger value="revision">Revisión</TabsTrigger>
        </TabsList>

        <TabsContent value="cedula" className="pt-4">
          {started ? (
            <CedulaSummary
              values={capture.values}
              folio={capture.folio}
              responsible={capture.authorName ?? "—"}
              visitedAt={capture.visitedAt}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Todavía no se inició la cédula de esta unidad.</p>
          )}
        </TabsContent>

        <TabsContent value="fotos" className="flex flex-col gap-3 pt-4">
          <p className="text-sm text-muted-foreground">
            {capture.evidence.length} de {capture.minPhotos} fotos requeridas
          </p>
          <EvidenceGrid photos={capture.evidence} />
        </TabsContent>

        <TabsContent value="mapa" className="pt-4">
          <UnitMap
            linkToDossier={false}
            units={[
              {
                id: capture.unitId,
                folio: capture.folio,
                name: capture.values.name,
                state,
                lat: capture.values.lat,
                lng: capture.values.lng,
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="revision" className="pt-4">
          <ReviewHistory entries={history} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
