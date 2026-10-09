import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { getCapture } from "@/features/census/queries";
import { CedulaSummary } from "@/features/review/components/cedula-summary";
import { ReviewForm } from "@/features/review/components/review-form";
import { getReviewHistory } from "@/features/review/queries";
import { STATUS_LABELS } from "@/lib/catalogs";
import { requireCan } from "@/lib/dal";

export default async function ReviewDetailPage(props: PageProps<"/review/[unitId]">) {
  await requireCan("submission:review");
  const { unitId } = await props.params;

  const capture = await getCapture(unitId);
  // A unit with no submission, or one still being drafted, has nothing to review yet.
  if (!capture || !capture.submissionId || capture.version === null || capture.status === "DRAFT") notFound();

  const history = await getReviewHistory(capture.submissionId);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-2">
        <Link href="/review" className="text-sm text-muted-foreground underline">
          ← Volver a la cola
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-muted-foreground">{capture.folio}</p>
            <h1 className="text-2xl font-semibold">{capture.values.name}</h1>
            <p className="text-sm text-muted-foreground">
              {capture.authorName}
              {capture.submittedAt && ` · enviada ${capture.submittedAt.toLocaleString("es-MX")}`}
            </p>
          </div>
          <Badge variant={capture.status === "APPROVED" ? "default" : "secondary"}>
            {STATUS_LABELS[capture.status]}
          </Badge>
        </div>
      </header>

      {capture.status === "SUBMITTED" ? (
        <ReviewForm unitId={capture.unitId} version={capture.version} />
      ) : (
        <p className="rounded-md border bg-muted p-3 text-sm text-muted-foreground">
          Esta cédula ya fue revisada ({STATUS_LABELS[capture.status].toLowerCase()}).
        </p>
      )}

      <CedulaSummary
        values={capture.values}
        folio={capture.folio}
        responsible={capture.authorName ?? "—"}
        visitedAt={capture.visitedAt}
      />

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">25. Evidencia fotográfica</h2>
          <Badge variant="secondary">
            {capture.evidence.length}/{capture.minPhotos}
          </Badge>
        </div>
        {capture.evidence.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin fotos.</p>
        ) : (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {capture.evidence.map((photo, index) => (
              <li key={photo.id} className="aspect-square overflow-hidden rounded-md border bg-muted">
                <a href={`/api/evidence/${photo.id}`} target="_blank" rel="noreferrer">
                  {/* Private route behind auth: next/image's optimizer cannot authenticate, a plain img is intended. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/evidence/${photo.id}`} alt={`Foto ${index + 1}`} loading="lazy" className="size-full object-cover" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {history.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">Historial de revisión</h2>
          <ul className="flex flex-col gap-2">
            {history.map((review) => (
              <li key={review.id} className="rounded-md border p-3 text-sm">
                <p className="font-medium">
                  {review.decision === "APPROVED" ? "Aprobada" : "Devuelta"} por {review.reviewer.name}
                  <span className="font-normal text-muted-foreground">
                    {" · "}
                    {review.createdAt.toLocaleString("es-MX")}
                  </span>
                </p>
                {review.comment && <p className="mt-1 whitespace-pre-wrap">{review.comment}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
