import { getCampaign } from "@/lib/campaign";
import { getMinPhotos } from "@/lib/campaign-rules";
import type { SessionUser } from "@/lib/dal";
import type { SubmissionStatus } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { EMPTY_VALUES, PRIVATE_UNIT_TYPES, type CedulaValues } from "./schema";

/** Only ADMIN and the assigned ENCUESTADOR open the capture screens. Others use the dossier (later phase). */
export function canOpenUnit(user: SessionUser, unit: { assignedToId: string | null }) {
  return user.role === "ADMIN" || (user.role === "ENCUESTADOR" && unit.assignedToId === user.id);
}

export async function listCaptureUnits(user: SessionUser) {
  const campaign = await getCampaign();
  if (!campaign) return [];

  return prisma.campaignUnit.findMany({
    where: {
      campaignId: campaign.id,
      ...(user.role === "ENCUESTADOR" ? { assignedToId: user.id } : {}),
    },
    select: {
      id: true,
      folio: true,
      plannedDate: true,
      complex: { select: { name: true, colonia: true } },
      submission: { select: { status: true } },
    },
    orderBy: { folio: "asc" },
  });
}

export type CaptureData = {
  unitId: string;
  submissionId: string | null;
  minPhotos: number;
  evidence: { id: string }[]; // confirmed photos only
  folio: string;
  assignedToId: string | null;
  status: SubmissionStatus;
  version: number | null; // null = no submission yet
  visitedAt: Date | null;
  submittedAt: Date | null;
  authorName: string | null;
  /** Latest review, so the encuestador sees why a cedula came back. */
  latestReview: { decision: "APPROVED" | "RETURNED"; comment: string | null; at: Date; reviewerName: string } | null;
  values: CedulaValues;
};

export async function getCapture(unitId: string): Promise<CaptureData | null> {
  const unit = await prisma.campaignUnit.findUnique({
    where: { id: unitId },
    include: {
      complex: true,
      submission: {
        include: {
          evidence: {
            where: { kind: "PHOTO", status: "CONFIRMED" },
            select: { id: true },
            orderBy: { createdAt: "asc" },
          },
          privateUnits: true,
          equipment: true,
          orgFigures: true,
          author: { select: { name: true } },
          reviews: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { reviewer: { select: { name: true } } },
          },
        },
      },
    },
  });
  if (!unit) return null;

  const { complex, submission: s } = unit;
  const values: CedulaValues = {
    ...EMPTY_VALUES,
    name: complex.name,
    address: complex.address ?? "",
    juntaAuxiliar: complex.juntaAuxiliar ?? "",
    colonia: complex.colonia ?? "",
    lat: complex.lat?.toNumber() ?? null,
    lng: complex.lng?.toNumber() ?? null,
  };

  if (s) {
    values.located = s.located;
    values.dwellings = s.dwellings;
    values.otherUnits = s.otherUnits;
    values.privateUnits = Object.fromEntries(
      PRIVATE_UNIT_TYPES.map((type) => [type, s.privateUnits.find((p) => p.type === type)?.quantity ?? null]),
    ) as CedulaValues["privateUnits"];
    values.privateOtherLabel = s.privateUnits.find((p) => p.type === "OTROS")?.otherLabel ?? "";
    values.greenAreas = s.greenAreas;
    values.greenAreaCount = s.greenAreaCount;
    values.greenType = s.greenType;
    values.greenUse = s.greenUse;
    values.equipment = s.equipment.map((e) => e.equipment);
    values.greenCondition = s.greenCondition;
    values.orgIdentified = s.orgIdentified;
    values.orgFigures = s.orgFigures.map((o) => o.figure);
    values.orgNotes = s.orgNotes ?? "";
    values.source = s.source;
    values.hasDocEvidence = s.hasDocEvidence;
    values.docType = s.docType ?? "";
    values.observations = s.observations ?? "";
  }

  return {
    unitId: unit.id,
    submissionId: s?.id ?? null,
    minPhotos: getMinPhotos(),
    evidence: s?.evidence ?? [],
    folio: unit.folio,
    assignedToId: unit.assignedToId,
    status: s?.status ?? "DRAFT",
    version: s?.version ?? null,
    visitedAt: s?.visitedAt ?? null,
    submittedAt: s?.submittedAt ?? null,
    authorName: s?.author.name ?? null,
    latestReview: s?.reviews[0]
      ? {
          decision: s.reviews[0].decision,
          comment: s.reviews[0].comment,
          at: s.reviews[0].createdAt,
          reviewerName: s.reviews[0].reviewer.name,
        }
      : null,
    values,
  };
}
