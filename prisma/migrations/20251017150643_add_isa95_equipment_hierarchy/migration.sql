/*
  Warnings:

  - Added the required column `equipmentClass` to the `equipment` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EquipmentClass" AS ENUM ('PRODUCTION', 'MAINTENANCE', 'QUALITY', 'MATERIAL_HANDLING', 'LABORATORY', 'STORAGE', 'ASSEMBLY');

-- CreateEnum
CREATE TYPE "EquipmentState" AS ENUM ('IDLE', 'RUNNING', 'BLOCKED', 'STARVED', 'FAULT', 'MAINTENANCE', 'SETUP', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "PerformancePeriodType" AS ENUM ('HOUR', 'SHIFT', 'DAY', 'WEEK', 'MONTH', 'QUARTER', 'YEAR');

-- AlterTable
-- Add equipmentClass as nullable first to handle existing rows
ALTER TABLE "equipment" ADD COLUMN     "areaId" TEXT,
ADD COLUMN     "availability" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "commissionDate" TIMESTAMP(3),
ADD COLUMN     "currentCapacity" DOUBLE PRECISION,
ADD COLUMN     "currentState" "EquipmentState" NOT NULL DEFAULT 'IDLE',
ADD COLUMN     "equipmentClass" "EquipmentClass",
ADD COLUMN     "equipmentLevel" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "equipmentType" TEXT,
ADD COLUMN     "installDate" TIMESTAMP(3),
ADD COLUMN     "oee" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "parentEquipmentId" TEXT,
ADD COLUMN     "performance" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "quality" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "ratedCapacity" DOUBLE PRECISION,
ADD COLUMN     "stateChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Set default value for existing equipment rows (assume PRODUCTION class for existing equipment)
UPDATE "equipment" SET "equipmentClass" = 'PRODUCTION' WHERE "equipmentClass" IS NULL;

-- Now make equipmentClass NOT NULL
ALTER TABLE "equipment" ALTER COLUMN "equipmentClass" SET NOT NULL;

-- AlterTable
ALTER TABLE "work_centers" ADD COLUMN     "areaId" TEXT;

-- CreateTable
CREATE TABLE "areas" (
    "id" TEXT NOT NULL,
    "areaCode" TEXT NOT NULL,
    "areaName" TEXT NOT NULL,
    "description" TEXT,
    "siteId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_state_history" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "previousState" "EquipmentState",
    "newState" "EquipmentState" NOT NULL,
    "reason" TEXT,
    "changedBy" TEXT,
    "stateStartTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stateEndTime" TIMESTAMP(3),
    "duration" INTEGER,
    "workOrderId" TEXT,
    "operationId" TEXT,
    "downtime" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_state_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_performance_logs" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "periodType" "PerformancePeriodType" NOT NULL DEFAULT 'SHIFT',
    "plannedProductionTime" INTEGER NOT NULL,
    "operatingTime" INTEGER NOT NULL,
    "downtime" INTEGER NOT NULL,
    "availability" DOUBLE PRECISION NOT NULL,
    "idealCycleTime" DOUBLE PRECISION,
    "actualCycleTime" DOUBLE PRECISION,
    "totalUnitsProduced" INTEGER NOT NULL,
    "targetProduction" INTEGER,
    "performance" DOUBLE PRECISION NOT NULL,
    "goodUnits" INTEGER NOT NULL,
    "rejectedUnits" INTEGER NOT NULL,
    "scrapUnits" INTEGER NOT NULL,
    "reworkUnits" INTEGER NOT NULL,
    "quality" DOUBLE PRECISION NOT NULL,
    "oee" DOUBLE PRECISION NOT NULL,
    "workOrderId" TEXT,
    "partId" TEXT,
    "operatorId" TEXT,
    "teep" DOUBLE PRECISION,
    "utilizationRate" DOUBLE PRECISION,
    "notes" TEXT,
    "hasAnomalies" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_performance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "areas_areaCode_key" ON "areas"("areaCode");

-- CreateIndex
CREATE INDEX "areas_siteId_idx" ON "areas"("siteId");

-- CreateIndex
CREATE INDEX "equipment_state_history_equipmentId_idx" ON "equipment_state_history"("equipmentId");

-- CreateIndex
CREATE INDEX "equipment_state_history_stateStartTime_idx" ON "equipment_state_history"("stateStartTime");

-- CreateIndex
CREATE INDEX "equipment_state_history_newState_idx" ON "equipment_state_history"("newState");

-- CreateIndex
CREATE INDEX "equipment_performance_logs_equipmentId_idx" ON "equipment_performance_logs"("equipmentId");

-- CreateIndex
CREATE INDEX "equipment_performance_logs_periodStart_idx" ON "equipment_performance_logs"("periodStart");

-- CreateIndex
CREATE INDEX "equipment_performance_logs_periodType_idx" ON "equipment_performance_logs"("periodType");

-- CreateIndex
CREATE INDEX "equipment_performance_logs_oee_idx" ON "equipment_performance_logs"("oee");

-- CreateIndex
CREATE INDEX "equipment_parentEquipmentId_idx" ON "equipment"("parentEquipmentId");

-- CreateIndex
CREATE INDEX "equipment_workCenterId_idx" ON "equipment"("workCenterId");

-- CreateIndex
CREATE INDEX "equipment_areaId_idx" ON "equipment"("areaId");

-- CreateIndex
CREATE INDEX "equipment_siteId_idx" ON "equipment"("siteId");

-- CreateIndex
CREATE INDEX "equipment_currentState_idx" ON "equipment"("currentState");

-- CreateIndex
CREATE INDEX "equipment_equipmentClass_idx" ON "equipment"("equipmentClass");

-- CreateIndex
CREATE INDEX "work_centers_areaId_idx" ON "work_centers"("areaId");

-- AddForeignKey
ALTER TABLE "areas" ADD CONSTRAINT "areas_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_centers" ADD CONSTRAINT "work_centers_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_parentEquipmentId_fkey" FOREIGN KEY ("parentEquipmentId") REFERENCES "equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_state_history" ADD CONSTRAINT "equipment_state_history_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_performance_logs" ADD CONSTRAINT "equipment_performance_logs_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
