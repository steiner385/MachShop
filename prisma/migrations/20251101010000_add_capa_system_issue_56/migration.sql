-- CreateEnum CapaStatus
CREATE TYPE "CapaStatus" AS ENUM ('DRAFT', 'PLANNED', 'IN_PROGRESS', 'PENDING_VERIFICATION', 'VERIFIED_EFFECTIVE', 'VERIFIED_INEFFECTIVE', 'CLOSED', 'CANCELLED');

-- CreateEnum CapaRiskLevel
CREATE TYPE "CapaRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum CapaActionType
CREATE TYPE "CapaActionType" AS ENUM ('IMMEDIATE', 'CORRECTIVE', 'PREVENTIVE', 'SYSTEMIC');

-- CreateEnum CapaActionStatus
CREATE TYPE "CapaActionStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'APPROVED', 'OVERDUE', 'CANCELLED');

-- CreateTable CAPA
CREATE TABLE "capas" (
    "id" TEXT NOT NULL,
    "capaNumber" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "ncrId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rootCauseAnalysis" TEXT,
    "riskLevel" "CapaRiskLevel" NOT NULL,
    "status" "CapaStatus" NOT NULL DEFAULT 'DRAFT',
    "ownerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "plannedDueDate" TIMESTAMP(3),
    "actualCompletionDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "estimatedCost" DECIMAL(15,2),
    "actualCost" DECIMAL(15,2),
    "requiresReplanning" BOOLEAN NOT NULL DEFAULT false,
    "replannedCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "capas_pkey" PRIMARY KEY ("id")
);

-- CreateTable CapaAction
CREATE TABLE "capa_actions" (
    "id" TEXT NOT NULL,
    "capaId" TEXT NOT NULL,
    "actionNumber" INTEGER NOT NULL,
    "actionType" "CapaActionType" NOT NULL,
    "description" TEXT NOT NULL,
    "status" "CapaActionStatus" NOT NULL DEFAULT 'OPEN',
    "ownerId" TEXT NOT NULL,
    "plannedDueDate" TIMESTAMP(3) NOT NULL,
    "completedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "percentComplete" INTEGER NOT NULL DEFAULT 0,
    "estimatedEffort" TEXT,
    "actualEffort" TEXT,
    "estimatedCost" DECIMAL(15,2),
    "actualCost" DECIMAL(15,2),
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "dependsOnActionId" TEXT,
    "notes" TEXT,

    CONSTRAINT "capa_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable CapaVerification
CREATE TABLE "capa_verifications" (
    "id" TEXT NOT NULL,
    "capaId" TEXT NOT NULL,
    "verificationNumber" INTEGER NOT NULL,
    "verificationDate" TIMESTAMP(3) NOT NULL,
    "verificationMethod" TEXT NOT NULL,
    "sampleSize" INTEGER,
    "result" TEXT NOT NULL,
    "metrics" JSONB,
    "verificationNotes" TEXT,
    "rootCauseOfFailure" TEXT,
    "recommendedActions" TEXT,
    "verifiedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capa_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable CapaStateHistory
CREATE TABLE "capa_state_history" (
    "id" TEXT NOT NULL,
    "capaId" TEXT NOT NULL,
    "fromState" TEXT,
    "toState" TEXT NOT NULL,
    "changeReason" TEXT,
    "changedBy" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "capa_state_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "capas_capaNumber_key" ON "capas"("capaNumber");

-- CreateIndex
CREATE INDEX "capas_siteId_idx" ON "capas"("siteId");

-- CreateIndex
CREATE INDEX "capas_status_idx" ON "capas"("status");

-- CreateIndex
CREATE INDEX "capas_riskLevel_idx" ON "capas"("riskLevel");

-- CreateIndex
CREATE INDEX "capas_ownerId_idx" ON "capas"("ownerId");

-- CreateIndex
CREATE INDEX "capas_createdAt_idx" ON "capas"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "capas_siteId_capaNumber_key" ON "capas"("siteId", "capaNumber");

-- CreateIndex
CREATE UNIQUE INDEX "capa_actions_capaId_actionNumber_key" ON "capa_actions"("capaId", "actionNumber");

-- CreateIndex
CREATE INDEX "capa_actions_capaId_idx" ON "capa_actions"("capaId");

-- CreateIndex
CREATE INDEX "capa_actions_status_idx" ON "capa_actions"("status");

-- CreateIndex
CREATE INDEX "capa_actions_ownerId_idx" ON "capa_actions"("ownerId");

-- CreateIndex
CREATE INDEX "capa_actions_plannedDueDate_idx" ON "capa_actions"("plannedDueDate");

-- CreateIndex
CREATE UNIQUE INDEX "capa_verifications_capaId_verificationNumber_key" ON "capa_verifications"("capaId", "verificationNumber");

-- CreateIndex
CREATE INDEX "capa_verifications_capaId_idx" ON "capa_verifications"("capaId");

-- CreateIndex
CREATE INDEX "capa_verifications_result_idx" ON "capa_verifications"("result");

-- CreateIndex
CREATE INDEX "capa_verifications_verificationDate_idx" ON "capa_verifications"("verificationDate");

-- CreateIndex
CREATE INDEX "capa_state_history_capaId_idx" ON "capa_state_history"("capaId");

-- CreateIndex
CREATE INDEX "capa_state_history_changedAt_idx" ON "capa_state_history"("changedAt");

-- AddForeignKey
ALTER TABLE "capas" ADD CONSTRAINT "capas_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capas" ADD CONSTRAINT "capas_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capas" ADD CONSTRAINT "capas_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_actions" ADD CONSTRAINT "capa_actions_capaId_fkey" FOREIGN KEY ("capaId") REFERENCES "capas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_actions" ADD CONSTRAINT "capa_actions_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_actions" ADD CONSTRAINT "capa_actions_dependsOnActionId_fkey" FOREIGN KEY ("dependsOnActionId") REFERENCES "capa_actions"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_verifications" ADD CONSTRAINT "capa_verifications_capaId_fkey" FOREIGN KEY ("capaId") REFERENCES "capas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_verifications" ADD CONSTRAINT "capa_verifications_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "users"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_state_history" ADD CONSTRAINT "capa_state_history_capaId_fkey" FOREIGN KEY ("capaId") REFERENCES "capas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
