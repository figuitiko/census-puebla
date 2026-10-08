"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { canOpenUnit, getCapture } from "./queries";
import { cedulaSchema, normalize, submitIssues, type CedulaValues, type Issue } from "./schema";

export type SaveResult =
  | { ok: true; version: number }
  | { ok: false; error: string; issues?: Issue[] };

const CONFLICT = "Esta cédula cambió desde que la abriste. Recargá la página para ver la versión actual.";

/** Loads the unit and checks the caller may edit its cedula. */
async function authorizeEdit(unitId: string) {
  const user = await requireUser();
  const unit = await prisma.campaignUnit.findUnique({
    where: { id: unitId },
    select: {
      id: true,
      complexId: true,
      assignedToId: true,
      submission: { select: { id: true, status: true, version: true } },
    },
  });

  if (!unit || !canOpenUnit(user, unit)) return { ok: false, error: "No tenés acceso a esta unidad" } as const;

  const status = unit.submission?.status ?? "DRAFT";
  if (!can(user, "submission:edit", { assigneeId: unit.assignedToId, status })) {
    return { ok: false, error: "Esta cédula ya no se puede editar" } as const;
  }
  return { ok: true, user, unit } as const;
}

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
    const version = await prisma.$transaction(async (tx) => {
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

      return nextVersion;
    });

    revalidatePath("/campo");
    return { ok: true, version };
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
  return { ok: true, version: expectedVersion + 1 };
}
