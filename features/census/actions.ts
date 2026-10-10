"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { authorizeEdit } from "./authorize";
import { getCapture } from "./queries";
import { cedulaSchema, normalize, submitIssues, type CedulaValues, type Issue } from "./schema";

export type SaveResult =
  | { ok: true; version: number; submissionId: string }
  | { ok: false; error: string; issues?: Issue[] };

const CONFLICT = "Esta cédula cambió desde que la abriste. Recargá la página para ver la versión actual.";

function submissionData(v: CedulaValues) {
  return {
    located: v.located,
    dwellings: v.dwellings,
    otherUnits: v.otherUnits,
    greenAreas: v.greenAreas,
    greenAreaCount: v.greenAreaCount,
    greenType: v.greenType,
    greenUse: v.greenUse,
    greenCondition: v.greenCondition,
    orgIdentified: v.orgIdentified,
    orgNotes: v.orgNotes || null,
    source: v.source,
    hasDocEvidence: v.hasDocEvidence,
    docType: v.docType || null,
    observations: v.observations || null,
  };
}

/** Drafts may be incomplete, but every answer present must be well-formed. */
export async function saveCedula(
  unitId: string,
  expectedVersion: number | null,
  input: unknown,
): Promise<SaveResult> {
  const auth = await authorizeEdit(unitId);
  if (!auth.ok) return { ok: false, error: auth.error };
  const { user, unit } = auth;

  const parsed = cedulaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const v = normalize(parsed.data);

  if ((unit.submission?.version ?? null) !== expectedVersion) return { ok: false, error: CONFLICT };

  try {
    const saved = await prisma.$transaction(async (tx) => {
      await tx.housingComplex.update({
        where: { id: unit.complexId },
        data: {
          name: v.name,
          address: v.address || null,
          juntaAuxiliar: v.juntaAuxiliar || null,
          colonia: v.colonia || null,
          lat: v.lat,
          lng: v.lng,
        },
      });

      let submissionId: string;
      let nextVersion: number;
      if (unit.submission) {
        const { count } = await tx.censusSubmission.updateMany({
          where: { id: unit.submission.id, version: unit.submission.version },
          data: { ...submissionData(v), version: { increment: 1 } },
        });
        if (count === 0) throw new Error("CONFLICT");
        submissionId = unit.submission.id;
        nextVersion = unit.submission.version + 1;
      } else {
        const created = await tx.censusSubmission.create({
          data: {
            ...submissionData(v),
            unitId,
            authorId: unit.assignedToId ?? user.id,
            visitedAt: new Date(), // field 2: set at first save
          },
        });
        submissionId = created.id;
        nextVersion = created.version;
      }

      await tx.privateUnitCount.deleteMany({ where: { submissionId } });
      await tx.equipmentSelection.deleteMany({ where: { submissionId } });
      await tx.organizationSelection.deleteMany({ where: { submissionId } });

      if (v.otherUnits === "YES") {
        await tx.privateUnitCount.createMany({
          data: Object.entries(v.privateUnits).map(([type, quantity]) => ({
            submissionId,
            type: type as keyof typeof v.privateUnits,
            quantity,
            otherLabel: type === "OTROS" ? v.privateOtherLabel || null : null,
          })),
        });
      }
      await tx.equipmentSelection.createMany({
        data: v.equipment.map((equipment) => ({ submissionId, equipment })),
      });
      await tx.organizationSelection.createMany({
        data: v.orgFigures.map((figure) => ({ submissionId, figure })),
      });

      return { version: nextVersion, submissionId };
    });

    revalidatePath("/campo");
    return { ok: true, ...saved };
  } catch (error) {
    // Lost the version race, or a concurrent first save hit the unique unitId index.
    if (error instanceof Error && (error.message === "CONFLICT" || (error as { code?: string }).code === "P2002")) {
      return { ok: false, error: CONFLICT };
    }
    throw error;
  }
}

/** Validates what is STORED (not client state) against the submit rules, then locks the cedula. */
export async function submitCedula(unitId: string, expectedVersion: number): Promise<SaveResult> {
  const auth = await authorizeEdit(unitId);
  if (!auth.ok) return { ok: false, error: auth.error };
  const { unit } = auth;

  if (!unit.submission) return { ok: false, error: "Guardá la cédula antes de enviarla" };
  if (unit.submission.status !== "DRAFT" && unit.submission.status !== "RETURNED") {
    return { ok: false, error: "Esta cédula ya fue enviada" };
  }
  if (unit.submission.version !== expectedVersion) return { ok: false, error: CONFLICT };

  const capture = await getCapture(unitId);
  if (!capture) return { ok: false, error: "Unidad no encontrada" };

  const issues = submitIssues(capture.values);
  // Field 25: a located unit needs the campaign's minimum of confirmed photos. Not-located: optional.
  // TODO(go-live): MIN_PHOTOS defaults to 1 for testing. Set MIN_PHOTOS=10 (CONTRACT_MIN_PHOTOS in
  // lib/campaign-rules.ts) in the real environment; /admin/campaign warns while it is lower.
  if (capture.values.located === true && capture.evidence.length < capture.minPhotos) {
    issues.push({
      step: 4,
      message: `25. Cargá al menos ${capture.minPhotos} fotos (tenés ${capture.evidence.length})`,
    });
  }
  if (issues.length > 0) {
    return { ok: false, error: "Faltan datos para enviar la cédula", issues };
  }

  const { count } = await prisma.censusSubmission.updateMany({
    where: {
      id: unit.submission.id,
      version: expectedVersion,
      status: { in: ["DRAFT", "RETURNED"] },
    },
    data: { status: "SUBMITTED", submittedAt: new Date(), version: { increment: 1 } },
  });
  if (count === 0) return { ok: false, error: CONFLICT };

  revalidatePath("/campo");
  return { ok: true, version: expectedVersion + 1, submissionId: unit.submission.id };
}
