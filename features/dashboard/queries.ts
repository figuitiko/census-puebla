import { getCampaign } from "@/lib/campaign";
import { getMinPhotos } from "@/lib/campaign-rules";
import { prisma } from "@/lib/prisma";
import type { UnitRow } from "./rows";

/**
 * EVERY unit of the campaign, unfiltered. Filtering happens in `applyFilters` over this one list, so the
 * cards, chart, map and registry cannot disagree. Fine at this scale (~40 units); revisit past a few thousand.
 */
export async function getCampaignRows() {
  const campaign = await getCampaign();
  if (!campaign) return null;

  const units = await prisma.campaignUnit.findMany({
    where: { campaignId: campaign.id },
    select: {
      id: true,
      folio: true,
      inScope: true,
      assignedTo: { select: { id: true, name: true } },
      complex: { select: { name: true, colonia: true, juntaAuxiliar: true, lat: true, lng: true } },
      submission: {
        select: {
          status: true,
          located: true,
          dwellings: true,
          _count: { select: { evidence: { where: { kind: "PHOTO", status: "CONFIRMED" } } } },
        },
      },
    },
    orderBy: { folio: "asc" },
  });

  const rows: UnitRow[] = units.map((unit) => ({
    id: unit.id,
    folio: unit.folio,
    name: unit.complex.name,
    colonia: unit.complex.colonia,
    junta: unit.complex.juntaAuxiliar,
    inScope: unit.inScope,
    assigneeId: unit.assignedTo?.id ?? null,
    assigneeName: unit.assignedTo?.name ?? null,
    state: unit.submission?.status ?? "NOT_STARTED",
    located: unit.submission?.located ?? null,
    dwellings: unit.submission?.dwellings ?? null,
    photos: unit.submission?._count.evidence ?? 0,
    lat: unit.complex.lat?.toNumber() ?? null,
    lng: unit.complex.lng?.toNumber() ?? null,
  }));

  return { campaign: { name: campaign.name, minPhotos: getMinPhotos() }, rows };
}
