import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listReviewQueue } from "@/features/review/queries";
import { STATUS_LABELS } from "@/lib/catalogs";
import { requireCan } from "@/lib/dal";

export default async function ReviewPage() {
  await requireCan("submission:review");
  const queue = await listReviewQueue();
  const pending = queue.filter((row) => row.submission.status === "SUBMITTED").length;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Revisión</h1>
        <p className="text-sm text-muted-foreground">{pending} pendientes de revisar</p>
      </header>

      {queue.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay cédulas enviadas.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Folio</TableHead>
              <TableHead>Conjunto</TableHead>
              <TableHead>Encuestador</TableHead>
              <TableHead>Enviada</TableHead>
              <TableHead>Fotos</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {queue.map(({ id, folio, complex, submission }) => (
              <TableRow key={id}>
                <TableCell className="font-mono">
                  <Link href={`/review/${id}`} className="underline">
                    {folio}
                  </Link>
                </TableCell>
                <TableCell className="font-medium">{complex.name}</TableCell>
                <TableCell>{submission.author.name}</TableCell>
                <TableCell>{submission.submittedAt?.toLocaleDateString("es-MX") ?? "—"}</TableCell>
                <TableCell>{submission._count.evidence}</TableCell>
                <TableCell>
                  <Badge variant={submission.status === "SUBMITTED" ? "default" : "secondary"}>
                    {STATUS_LABELS[submission.status]}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
