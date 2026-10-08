import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { getCapture, canOpenUnit } from "@/features/census/queries";
import { Wizard } from "@/features/census/components/wizard";

export default async function CapturePage(props: PageProps<"/campo/[unitId]">) {
  const user = await requireUser();
  const { unitId } = await props.params;

  const capture = await getCapture(unitId);
  if (!capture || !canOpenUnit(user, capture)) notFound();

  const readOnly = !can(user, "submission:edit", {
    assigneeId: capture.assignedToId,
    status: capture.status,
  });

  return (
    <Wizard
      unitId={capture.unitId}
      folio={capture.folio}
      status={capture.status}
      initialVersion={capture.version}
      initialSubmissionId={capture.submissionId}
      initialPhotos={capture.evidence}
      minPhotos={capture.minPhotos}
      initialValues={capture.values}
      visitedAt={capture.visitedAt?.toISOString() ?? null}
      responsible={capture.authorName ?? user.name}
      readOnly={readOnly}
    />
  );
}
