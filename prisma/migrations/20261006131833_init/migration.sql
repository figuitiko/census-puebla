-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'COORDINADOR', 'ENCUESTADOR', 'VISOR');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'RETURNED');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('APPROVED', 'RETURNED');

-- CreateEnum
CREATE TYPE "EvidenceKind" AS ENUM ('PHOTO', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "EvidenceStatus" AS ENUM ('PENDING', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "TriState" AS ENUM ('YES', 'NO', 'UNDETERMINED');

-- CreateEnum
CREATE TYPE "PrivateUnitType" AS ENUM ('LOCAL_COMERCIAL', 'OFICINAS', 'CONSULTORIOS', 'OTROS');

-- CreateEnum
CREATE TYPE "GreenAreaType" AS ENUM ('JARDIN', 'PARQUE', 'CAMELLON', 'OTRA_AREA_VERDE');

-- CreateEnum
CREATE TYPE "GreenAreaUse" AS ENUM ('RECREACION', 'DESCANSO_CONVIVENCIA', 'JUEGO_INFANTIL', 'ACTIVIDAD_FISICA_DEPORTIVA', 'ORNAMENTAL', 'CONSERVACION_AMBIENTAL', 'OTRO');

-- CreateEnum
CREATE TYPE "Equipment" AS ENUM ('NINGUNO', 'BANCAS_MOBILIARIO_DESCANSO', 'JUEGOS_INFANTILES', 'EQUIPAMIENTO_DEPORTIVO', 'SENDEROS', 'OTRO');

-- CreateEnum
CREATE TYPE "GreenAreaCondition" AS ENUM ('BUENA', 'REGULAR', 'DEFICIENTE', 'NO_FUE_POSIBLE_VALORAR');

-- CreateEnum
CREATE TYPE "OrganizationFigure" AS ENUM ('ADMINISTRADOR', 'COMITE_ADMINISTRACION', 'MESA_DIRECTIVA', 'OTRA');

-- CreateEnum
CREATE TYPE "InfoSource" AS ENUM ('ADMINISTRADOR', 'COMITE_O_MESA_DIRECTIVA', 'PERSONA_RESIDENTE', 'DOCUMENTO_DISPONIBLE', 'REGISTRO_MUNICIPIO', 'OBSERVACION_DIRECTA', 'OTRA');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ENCUESTADOR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "municipality" TEXT NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Mexico_City',
    "minPhotos" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HousingComplex" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "juntaAuxiliar" TEXT,
    "colonia" TEXT,
    "lat" DECIMAL(9,6),
    "lng" DECIMAL(9,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HousingComplex_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignUnit" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "complexId" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "inScope" BOOLEAN NOT NULL DEFAULT true,
    "assignedToId" TEXT,
    "plannedDate" DATE,

    CONSTRAINT "CampaignUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CensusSubmission" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "visitedAt" TIMESTAMP(3),
    "located" BOOLEAN,
    "dwellings" INTEGER,
    "otherUnits" "TriState",
    "greenAreas" "TriState",
    "greenAreaCount" INTEGER,
    "greenType" "GreenAreaType",
    "greenUse" "GreenAreaUse",
    "greenCondition" "GreenAreaCondition",
    "orgIdentified" "TriState",
    "orgNotes" TEXT,
    "source" "InfoSource",
    "hasDocEvidence" BOOLEAN,
    "docType" TEXT,
    "observations" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CensusSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivateUnitCount" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "type" "PrivateUnitType" NOT NULL,
    "quantity" INTEGER,
    "otherLabel" TEXT,

    CONSTRAINT "PrivateUnitCount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentSelection" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "equipment" "Equipment" NOT NULL,

    CONSTRAINT "EquipmentSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationSelection" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "figure" "OrganizationFigure" NOT NULL,

    CONSTRAINT "OrganizationSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "kind" "EvidenceKind" NOT NULL DEFAULT 'PHOTO',
    "pathname" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "caption" TEXT,
    "status" "EvidenceStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "decision" "ReviewDecision" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "HousingComplex_name_colonia_idx" ON "HousingComplex"("name", "colonia");

-- CreateIndex
CREATE INDEX "CampaignUnit_assignedToId_idx" ON "CampaignUnit"("assignedToId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignUnit_campaignId_complexId_key" ON "CampaignUnit"("campaignId", "complexId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignUnit_campaignId_folio_key" ON "CampaignUnit"("campaignId", "folio");

-- CreateIndex
CREATE UNIQUE INDEX "CensusSubmission_unitId_key" ON "CensusSubmission"("unitId");

-- CreateIndex
CREATE INDEX "CensusSubmission_status_idx" ON "CensusSubmission"("status");

-- CreateIndex
CREATE INDEX "CensusSubmission_authorId_idx" ON "CensusSubmission"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "PrivateUnitCount_submissionId_type_key" ON "PrivateUnitCount"("submissionId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentSelection_submissionId_equipment_key" ON "EquipmentSelection"("submissionId", "equipment");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSelection_submissionId_figure_key" ON "OrganizationSelection"("submissionId", "figure");

-- CreateIndex
CREATE UNIQUE INDEX "Evidence_pathname_key" ON "Evidence"("pathname");

-- CreateIndex
CREATE INDEX "Evidence_submissionId_status_idx" ON "Evidence"("submissionId", "status");

-- CreateIndex
CREATE INDEX "Review_submissionId_idx" ON "Review"("submissionId");

-- AddForeignKey
ALTER TABLE "CampaignUnit" ADD CONSTRAINT "CampaignUnit_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignUnit" ADD CONSTRAINT "CampaignUnit_complexId_fkey" FOREIGN KEY ("complexId") REFERENCES "HousingComplex"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignUnit" ADD CONSTRAINT "CampaignUnit_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CensusSubmission" ADD CONSTRAINT "CensusSubmission_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "CampaignUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CensusSubmission" ADD CONSTRAINT "CensusSubmission_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivateUnitCount" ADD CONSTRAINT "PrivateUnitCount_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "CensusSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentSelection" ADD CONSTRAINT "EquipmentSelection_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "CensusSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationSelection" ADD CONSTRAINT "OrganizationSelection_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "CensusSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "CensusSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "CensusSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
