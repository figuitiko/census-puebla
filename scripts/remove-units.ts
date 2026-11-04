import { prisma } from "@/lib/prisma";

/** Units dropped before go-live: two test leftovers and two removed from the municipality list. Compared case-insensitively. */
const NAMES_TO_REMOVE = [
  "nueva unidad",
  "unidad nueva",
  "UNIDAD HABITACIONAL LA CIENEGA",
  "INFONAVIT LA MARIA",
];

/**
 * Dry run by default: lists matches. Pass --apply to delete. A unit that already has a cedula is never deleted
 * (deleting it would cascade away captured data); it is reported and left for a manual decision.
 */
async function main() {
  const apply = process.argv.includes("--apply");

  const units = await prisma.campaignUnit.findMany({
    where: { complex: { OR: NAMES_TO_REMOVE.map((name) => ({ name: { equals: name, mode: "insensitive" as const } })) } },
    select: { id: true, folio: true, complexId: true, complex: { select: { name: true } }, submission: { select: { id: true, status: true } } },
  });

  if (units.length === 0) return console.log("Nothing to remove.");

  for (const unit of units) {
    const label = `${unit.folio} · ${unit.complex.name}`;
    if (unit.submission) {
      console.warn(`KEEP (has cedula, ${unit.submission.status}): ${label}`);
      continue;
    }
    if (!apply) {
      console.log(`would delete: ${label}`);
      continue;
    }
    await prisma.$transaction(async (tx) => {
      await tx.campaignUnit.delete({ where: { id: unit.id } });
      // Complex only goes if no other campaign unit still points at it.
      const others = await tx.campaignUnit.count({ where: { complexId: unit.complexId } });
      if (others === 0) await tx.housingComplex.delete({ where: { id: unit.complexId } });
    });
    console.log(`deleted: ${label}`);
  }
  if (!apply) console.log("Dry run. Re-run with --apply to delete.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
