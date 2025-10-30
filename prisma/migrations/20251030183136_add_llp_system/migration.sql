-- CreateEnum
CREATE TYPE "LLPCriticalityLevel" AS ENUM ('SAFETY_CRITICAL', 'MONITORED', 'TRACKED');

-- CreateEnum
CREATE TYPE "LLPRetirementType" AS ENUM ('CYCLES_OR_TIME', 'CYCLES_ONLY', 'TIME_ONLY', 'CYCLES_AND_TIME');

-- CreateEnum
CREATE TYPE "LLPStatus" AS ENUM ('ACTIVE', 'RETIRED', 'QUARANTINED', 'UNDER_REPAIR', 'AWAITING_INSTALL', 'SCRAPPED');

-- CreateEnum
CREATE TYPE "LLPAlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL', 'URGENT', 'EXPIRED');

-- CreateEnum
CREATE TYPE "LLPCertificationType" AS ENUM ('FORM_1', 'MATERIAL_CERT', 'TEST_REPORT', 'TRACEABILITY_CERT', 'HEAT_LOT_CERT', 'NDT_REPORT', 'OEM_CERT');

-- AlterTable
ALTER TABLE "parts" ADD COLUMN     "isLifeLimited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "llpCertificationRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "llpCriticalityLevel" "LLPCriticalityLevel",
ADD COLUMN     "llpCycleLimit" INTEGER,
ADD COLUMN     "llpInspectionInterval" INTEGER,
ADD COLUMN     "llpNotes" TEXT,
ADD COLUMN     "llpRegulatoryReference" TEXT,
ADD COLUMN     "llpRetirementType" "LLPRetirementType",
ADD COLUMN     "llpTimeLimit" INTEGER;

-- CreateTable
CREATE TABLE "llp_life_history" (
    "id" TEXT NOT NULL,
    "serializedPartId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "cyclesAtEvent" INTEGER,
    "hoursAtEvent" DOUBLE PRECISION,
    "parentAssemblyId" TEXT,
    "parentSerialNumber" TEXT,
    "workOrderId" TEXT,
    "operationId" TEXT,
    "performedBy" TEXT,
    "location" TEXT,
    "notes" TEXT,
    "certificationUrls" TEXT[],
    "inspectionResults" JSONB,
    "repairDetails" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "llp_life_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llp_alerts" (
    "id" TEXT NOT NULL,
    "serializedPartId" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "severity" "LLPAlertSeverity" NOT NULL,
    "triggerCycles" INTEGER,
    "triggerDate" TIMESTAMP(3),
    "thresholdPercentage" DOUBLE PRECISION,
    "message" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "acknowledgedBy" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "actionRequired" TEXT,
    "dueDate" TIMESTAMP(3),
    "escalationLevel" INTEGER NOT NULL DEFAULT 1,
    "notificationsSent" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "llp_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llp_certifications" (
    "id" TEXT NOT NULL,
    "serializedPartId" TEXT NOT NULL,
    "certificationType" "LLPCertificationType" NOT NULL,
    "documentName" TEXT NOT NULL,
    "documentUrl" TEXT NOT NULL,
    "documentHash" TEXT,
    "issuedBy" TEXT,
    "issuedDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "certificationNumber" TEXT,
    "batchNumber" TEXT,
    "testResults" JSONB,
    "complianceStandards" TEXT[],
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "llp_certifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "parts_isLifeLimited_idx" ON "parts"("isLifeLimited");

-- CreateIndex
CREATE INDEX "parts_llpCriticalityLevel_idx" ON "parts"("llpCriticalityLevel");

-- CreateIndex
CREATE INDEX "llp_life_history_serializedPartId_idx" ON "llp_life_history"("serializedPartId");

-- CreateIndex
CREATE INDEX "llp_life_history_eventDate_idx" ON "llp_life_history"("eventDate");

-- CreateIndex
CREATE INDEX "llp_life_history_eventType_idx" ON "llp_life_history"("eventType");

-- CreateIndex
CREATE INDEX "llp_life_history_parentAssemblyId_idx" ON "llp_life_history"("parentAssemblyId");

-- CreateIndex
CREATE INDEX "llp_alerts_serializedPartId_idx" ON "llp_alerts"("serializedPartId");

-- CreateIndex
CREATE INDEX "llp_alerts_severity_idx" ON "llp_alerts"("severity");

-- CreateIndex
CREATE INDEX "llp_alerts_isActive_idx" ON "llp_alerts"("isActive");

-- CreateIndex
CREATE INDEX "llp_alerts_dueDate_idx" ON "llp_alerts"("dueDate");

-- CreateIndex
CREATE INDEX "llp_alerts_alertType_idx" ON "llp_alerts"("alertType");

-- CreateIndex
CREATE INDEX "llp_certifications_serializedPartId_idx" ON "llp_certifications"("serializedPartId");

-- CreateIndex
CREATE INDEX "llp_certifications_certificationType_idx" ON "llp_certifications"("certificationType");

-- CreateIndex
CREATE INDEX "llp_certifications_issuedDate_idx" ON "llp_certifications"("issuedDate");

-- CreateIndex
CREATE INDEX "llp_certifications_expirationDate_idx" ON "llp_certifications"("expirationDate");

-- CreateIndex
CREATE INDEX "llp_certifications_isActive_idx" ON "llp_certifications"("isActive");

-- AddForeignKey
ALTER TABLE "llp_life_history" ADD CONSTRAINT "llp_life_history_serializedPartId_fkey" FOREIGN KEY ("serializedPartId") REFERENCES "serialized_parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llp_alerts" ADD CONSTRAINT "llp_alerts_serializedPartId_fkey" FOREIGN KEY ("serializedPartId") REFERENCES "serialized_parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llp_certifications" ADD CONSTRAINT "llp_certifications_serializedPartId_fkey" FOREIGN KEY ("serializedPartId") REFERENCES "serialized_parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;