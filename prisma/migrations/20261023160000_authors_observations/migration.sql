-- Authors' observations: drop located (9), greenUse (16), equipment (17), orgIdentified (19);
-- narrow private unit types to LOCAL_COMERCIAL / OFICINAS and green types to JARDIN / CAMELLON.

-- Data cleanup so the enum shrink cannot fail on rows that use a removed value.
DELETE FROM "PrivateUnitCount" WHERE "type"::text IN ('CONSULTORIOS', 'OTROS');
UPDATE "CensusSubmission" SET "greenType" = NULL WHERE "greenType"::text IN ('PARQUE', 'OTRA_AREA_VERDE');


-- AlterEnum
BEGIN;
CREATE TYPE "GreenAreaType_new" AS ENUM ('JARDIN', 'CAMELLON');
ALTER TABLE "CensusSubmission" ALTER COLUMN "greenType" TYPE "GreenAreaType_new" USING ("greenType"::text::"GreenAreaType_new");
ALTER TYPE "GreenAreaType" RENAME TO "GreenAreaType_old";
ALTER TYPE "GreenAreaType_new" RENAME TO "GreenAreaType";
DROP TYPE "public"."GreenAreaType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PrivateUnitType_new" AS ENUM ('LOCAL_COMERCIAL', 'OFICINAS');
ALTER TABLE "PrivateUnitCount" ALTER COLUMN "type" TYPE "PrivateUnitType_new" USING ("type"::text::"PrivateUnitType_new");
ALTER TYPE "PrivateUnitType" RENAME TO "PrivateUnitType_old";
ALTER TYPE "PrivateUnitType_new" RENAME TO "PrivateUnitType";
DROP TYPE "public"."PrivateUnitType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "EquipmentSelection" DROP CONSTRAINT "EquipmentSelection_submissionId_fkey";

-- AlterTable
ALTER TABLE "CensusSubmission" DROP COLUMN "greenUse",
DROP COLUMN "located",
DROP COLUMN "orgIdentified";

-- AlterTable
ALTER TABLE "PrivateUnitCount" DROP COLUMN "otherLabel";

-- DropTable
DROP TABLE "EquipmentSelection";

-- DropEnum
DROP TYPE "Equipment";

-- DropEnum
DROP TYPE "GreenAreaUse";

