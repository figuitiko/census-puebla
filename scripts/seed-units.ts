import { prisma } from "@/lib/prisma";

/** Source: "LISTA U.H A CENSAR.xlsx" (municipality list). Order = Excel NÚMERO; whitespace already normalized. */
const UNITS: ReadonlyArray<readonly [name: string, juntaAuxiliar: string | null]> = [
  ["UNIDAD HABITACIONAL LA MARGARITA", "IGNACIO ZARAGOZA"],
  ["UNIDAD HABITACIONAL XAXALPA TEXTIL", null],
  ["UNIDAD HABITACIONAL VILLA VERDE", "ZONA CENTRO"],
  ["UNIDAD HABITACIONAL VILLA FRONTERA", "SAN SEBASTIAN DE APARICIO"],
  ["UNIDAD HABITACIONAL UEMAC", null],
  ["UNIDAD HABITACIONAL TRES CRUCES", null],
  ["UNIDAD HABITACIONAL MOVIMIENTO OBRERO", "ZONA CENTRO"],
  ["UNIDAD HABITACIONAL SOLIDARIDAD", null],
  ["UNIDAD HABITACIONAL SAN RAMÓN", null],
  ["UNIDAD HABITACIONAL SAN PEDRO", "SAN SEBASTIAN DE APARICIO"],
  ["UNIDAD HABITACIONAL SAN MIGUEL MAYORAZGO", null],
  ["UNIDAD HABITACIONAL SAN JOSÉ XZILOTZINGO", null],
  ["UNIDAD HABITACIÓNAL SAN JORGE", "SAN FRANCISCO TOTIMEHUACÁN"],
  ["UNIDAD HABITACIONAL SAN JERONIMO CALERAS", "SAN JERONIMO CALERAS"],
  ["UNIDAD HABITACIONAL SAN BARTOLO", null],
  ["UNIDAD HABITACIONAL SAN APARICIO", "SAN SEBASTIAN DE APARICIO"],
  ["UNIDAD HABITACIONAL MATEO DE REGÍL", null],
  ["UNIDAD HABITACIONAL MANUEL RIVERA ANAYA", "ZONA CENTRO"],
  ["UNIDAD HABITACIONAL MAGISTERIAL CHAPULCO", null],
  ["UNIDAD HABITACIONAL MAGISTERIAL XILOTZINGO", null],
  ["UNIDAD HABITACIONAL LUIS N. MORONES", "SAN FRANCISCO TOTIMEHUACÁN"],
  ["UNIDAD HABITACIONAL LOS HÉROES PUEBLA", null],
  ["UNIDAD HABITACIONAL LOMA BELLA", null],
  ["UNIDAD HABITACIONAL LAS CARMELITAS", null],
  ["UNIDAD HABITACIONAL LA VICTORIA", null],
  ["UNIDAD HABITACIONAL LA GUADALUPANA", null],
  ["UNIDAD HABITACIONAL INDEPENDENCIA", null],
  ["UNIDAD HABITACIONAL GEO VILLAS DEL SUR", null],
  ["UNIDAD HABITACIONAL GALAXIA LA CALERA", null],
  ["UNIDAD HABITACIONAL FUENTES DE SAN BARTOLO", "SAN BALTAZAR CAMPECHE"],
  ["UNIDAD HABITACIONAL EL CARMEN GASTRONOMICOS", null],
  ["UNIDAD HABITACIONAL CASTILLOTLA 2", null],
  ["UNIDAD HABITACIONAL CASTILLOTLA 1", null],
  ["UNIDAD HABITACIONAL BOSQUES DE SAN SEBASTIÁN", "ZONA CENTRO"],
  ["UNIDAD HABITACIONAL AMALUCAN", null],
  ["UNIDAD HABITACIONAL AGUA SANTA", null],
  ["UNIDAD HABITACIONAL 12 DE MAYO DE 1918", "ZONA CENTRO"],
  ["UNIDAD HABITACIONAL (INFONAVIT) LA ROSA", null],
  ["UNIDAD HABITACIONAL (INFONAVIT) LA FLOR", "IGNACIO ZARAGOZA"],
  ["JARDINES DE SANTA ROSA", null],
  ["FRACCIONAMIENTO HACIENDA SANTA CLARA 1", null],
  ["FRACCIONAMIENTO HACIENDA SANTA CLARA 2", null],
];

const formatFolio = (n: number) => `UH-${String(n).padStart(3, "0")}`;

/**
 * Idempotent: a unit whose complex name already exists in the campaign is skipped, so re-running is safe.
 * Folio = UH-NNN from the Excel NÚMERO, or the next free one if taken. Colonia / address / coordinates stay empty.
 */
async function main() {
  const campaign = await prisma.campaign.findFirst({ orderBy: { createdAt: "desc" } });
  if (!campaign) throw new Error("Create the campaign first (/admin/campaign)");

  const existing = await prisma.campaignUnit.findMany({
    where: { campaignId: campaign.id },
    select: { folio: true, complex: { select: { name: true } } },
  });
  const names = new Set(existing.map((u) => u.complex.name));
  const folios = new Set(existing.map((u) => u.folio));

  // Collisions (e.g. hand-made test units) fall back to numbers after the Excel range and any existing folio.
  const used = [...folios].map((f) => Number(f.replace(/\D/g, ""))).filter(Number.isFinite);
  let nextFolioNumber = Math.max(UNITS.length, ...used) + 1;

  let created = 0;
  for (const [index, [name, juntaAuxiliar]] of UNITS.entries()) {
    if (names.has(name)) {
      console.log(`skip (exists): ${name}`);
      continue;
    }
    let folio = formatFolio(index + 1);
    if (folios.has(folio)) {
      folio = formatFolio(nextFolioNumber++);
      console.warn(`folio ${formatFolio(index + 1)} taken, using ${folio}: ${name}`);
    }
    folios.add(folio);
    await prisma.$transaction(async (tx) => {
      const complex = await tx.housingComplex.create({ data: { name, juntaAuxiliar } });
      await tx.campaignUnit.create({ data: { campaignId: campaign.id, complexId: complex.id, folio } });
    });
    created++;
  }
  console.log(`${created} created, ${UNITS.length - created} skipped (campaign: ${campaign.name})`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
