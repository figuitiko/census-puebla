import { getCampaign } from "@/lib/campaign";
import { prisma } from "@/lib/prisma";

const QUEUE_LIMIT = 200;

/** Everything past DRAFT, pending first (oldest submission first), then reviewed. */
export async function listReviewQueue() {
  const campaign = await getCampaign();
  if (!campaign) return [];

  const rows = await prisma.campaignUnit.findMany({
    where: { campaignId: campaign.id, submission: { status: { not: "DRAFT" } } },
    select: {
      id: true,
      folio: true,
      complex: { select: { name: true, colonia: true } },
      submission: {
        select: {
          status: true,
          submittedAt: true,
          author: { select: { name: true } },
          _count: { select: { evidence: { where: { kind: "PHOTO", status: "CONFIRMED" } } } },
        },
      },
    },
    take: QUEUE_LIMIT,
  });

  const rank = { SUBMITTED: 0, RETURNED: 1, APPROVED: 2, DRAFT: 3 } as const;
  return rows
    .flatMap((row) => (row.submission ? [{ ...row, submission: row.submission }] : []))
    .sort((a, b) => {
      const byStatus = rank[a.submission.status] - rank[b.submission.status];
      if (byStatus !== 0) return byStatus;
      return (a.submission.submittedAt?.getTime() ?? 0) - (b.submission.submittedAt?.getTime() ?? 0);
    });
}

export function getReviewHistory(submissionId: string) {
  return prisma.review.findMany({
    where: { submissionId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      decision: true,
      comment: true,
      createdAt: true,
      reviewer: { select: { name: true } },
    },
  });
}
