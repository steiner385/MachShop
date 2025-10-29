-- CreateEnum
CREATE TYPE "TimeTrackingGranularity" AS ENUM ('NONE', 'WORK_ORDER', 'OPERATION');

-- CreateEnum
CREATE TYPE "CostingModel" AS ENUM ('LABOR_HOURS', 'MACHINE_HOURS', 'BOTH');

-- CreateEnum
CREATE TYPE "MultiTaskingMode" AS ENUM ('CONCURRENT', 'SPLIT_ALLOCATION');

-- CreateEnum
CREATE TYPE "ApprovalFrequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'NONE');

-- CreateEnum
CREATE TYPE "TimeType" AS ENUM ('DIRECT_LABOR', 'INDIRECT', 'MACHINE');

-- CreateEnum
CREATE TYPE "TimeEntrySource" AS ENUM ('MANUAL', 'KIOSK', 'MOBILE', 'MACHINE_AUTO', 'API', 'HISTORIAN');

-- CreateEnum
CREATE TYPE "TimeEntryStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXPORTED');

-- CreateEnum
CREATE TYPE "IndirectCategory" AS ENUM ('BREAK', 'LUNCH', 'TRAINING', 'MEETING', 'MAINTENANCE', 'SETUP', 'CLEANUP', 'WAITING', 'ADMINISTRATIVE', 'OTHER');

-- CreateEnum
CREATE TYPE "TimeValidationRuleType" AS ENUM ('MAX_DURATION', 'MIN_DURATION', 'MISSING_CLOCK_OUT', 'CONCURRENT_ENTRIES', 'OVERTIME_THRESHOLD', 'INVALID_TIME_RANGE');

-- CreateTable
CREATE TABLE "time_tracking_configurations" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "timeTrackingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "trackingGranularity" "TimeTrackingGranularity" NOT NULL DEFAULT 'OPERATION',
    "costingModel" "CostingModel" NOT NULL DEFAULT 'LABOR_HOURS',
    "allowMultiTasking" BOOLEAN NOT NULL DEFAULT false,
    "multiTaskingMode" "MultiTaskingMode",
    "autoSubtractBreaks" BOOLEAN NOT NULL DEFAULT false,
    "standardBreakMinutes" INTEGER,
    "requireBreakClockOut" BOOLEAN NOT NULL DEFAULT false,
    "overtimeThresholdHours" DOUBLE PRECISION DEFAULT 8.0,
    "warnOnOvertime" BOOLEAN NOT NULL DEFAULT true,
    "enableMachineTracking" BOOLEAN NOT NULL DEFAULT false,
    "autoStartFromMachine" BOOLEAN NOT NULL DEFAULT false,
    "autoStopFromMachine" BOOLEAN NOT NULL DEFAULT false,
    "requireTimeApproval" BOOLEAN NOT NULL DEFAULT true,
    "approvalFrequency" "ApprovalFrequency" NOT NULL DEFAULT 'DAILY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "time_tracking_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labor_time_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workOrderId" TEXT,
    "operationId" TEXT,
    "indirectCodeId" TEXT,
    "timeType" "TimeType" NOT NULL,
    "clockInTime" TIMESTAMP(3) NOT NULL,
    "clockOutTime" TIMESTAMP(3),
    "duration" DOUBLE PRECISION,
    "entrySource" "TimeEntrySource" NOT NULL,
    "deviceId" TEXT,
    "location" TEXT,
    "status" "TimeEntryStatus" NOT NULL DEFAULT 'ACTIVE',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "costCenter" TEXT,
    "laborRate" DOUBLE PRECISION,
    "laborCost" DOUBLE PRECISION,
    "originalClockInTime" TIMESTAMP(3),
    "originalClockOutTime" TIMESTAMP(3),
    "editedBy" TEXT,
    "editedAt" TIMESTAMP(3),
    "editReason" TEXT,
    "exportedToSystem" TEXT,
    "exportedAt" TIMESTAMP(3),
    "externalReferenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "labor_time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "machine_time_entries" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "workOrderId" TEXT,
    "operationId" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "duration" DOUBLE PRECISION,
    "entrySource" "TimeEntrySource" NOT NULL,
    "dataSource" TEXT,
    "cycleCount" INTEGER,
    "partCount" INTEGER,
    "machineUtilization" DOUBLE PRECISION,
    "status" "TimeEntryStatus" NOT NULL DEFAULT 'ACTIVE',
    "machineRate" DOUBLE PRECISION,
    "machineCost" DOUBLE PRECISION,
    "exportedToSystem" TEXT,
    "exportedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "machine_time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indirect_cost_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "IndirectCategory" NOT NULL,
    "costCenter" TEXT,
    "glAccount" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "siteId" TEXT,
    "displayColor" TEXT,
    "displayIcon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "indirect_cost_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_entry_validation_rules" (
    "id" TEXT NOT NULL,
    "ruleName" TEXT NOT NULL,
    "ruleType" "TimeValidationRuleType" NOT NULL,
    "condition" TEXT NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "siteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_entry_validation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "time_tracking_configurations_siteId_key" ON "time_tracking_configurations"("siteId");

-- CreateIndex
CREATE INDEX "time_tracking_configurations_siteId_idx" ON "time_tracking_configurations"("siteId");

-- CreateIndex
CREATE INDEX "labor_time_entries_userId_idx" ON "labor_time_entries"("userId");

-- CreateIndex
CREATE INDEX "labor_time_entries_workOrderId_idx" ON "labor_time_entries"("workOrderId");

-- CreateIndex
CREATE INDEX "labor_time_entries_operationId_idx" ON "labor_time_entries"("operationId");

-- CreateIndex
CREATE INDEX "labor_time_entries_status_idx" ON "labor_time_entries"("status");

-- CreateIndex
CREATE INDEX "labor_time_entries_clockInTime_idx" ON "labor_time_entries"("clockInTime");

-- CreateIndex
CREATE INDEX "labor_time_entries_timeType_idx" ON "labor_time_entries"("timeType");

-- CreateIndex
CREATE INDEX "machine_time_entries_equipmentId_idx" ON "machine_time_entries"("equipmentId");

-- CreateIndex
CREATE INDEX "machine_time_entries_workOrderId_idx" ON "machine_time_entries"("workOrderId");

-- CreateIndex
CREATE INDEX "machine_time_entries_operationId_idx" ON "machine_time_entries"("operationId");

-- CreateIndex
CREATE INDEX "machine_time_entries_status_idx" ON "machine_time_entries"("status");

-- CreateIndex
CREATE INDEX "machine_time_entries_startTime_idx" ON "machine_time_entries"("startTime");

-- CreateIndex
CREATE UNIQUE INDEX "indirect_cost_codes_code_key" ON "indirect_cost_codes"("code");

-- CreateIndex
CREATE INDEX "indirect_cost_codes_code_idx" ON "indirect_cost_codes"("code");

-- CreateIndex
CREATE INDEX "indirect_cost_codes_category_idx" ON "indirect_cost_codes"("category");

-- CreateIndex
CREATE INDEX "indirect_cost_codes_siteId_idx" ON "indirect_cost_codes"("siteId");

-- CreateIndex
CREATE INDEX "time_entry_validation_rules_ruleType_idx" ON "time_entry_validation_rules"("ruleType");

-- CreateIndex
CREATE INDEX "time_entry_validation_rules_siteId_idx" ON "time_entry_validation_rules"("siteId");

-- AddForeignKey
ALTER TABLE "time_tracking_configurations" ADD CONSTRAINT "time_tracking_configurations_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labor_time_entries" ADD CONSTRAINT "labor_time_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labor_time_entries" ADD CONSTRAINT "labor_time_entries_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labor_time_entries" ADD CONSTRAINT "labor_time_entries_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "work_order_operations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labor_time_entries" ADD CONSTRAINT "labor_time_entries_indirectCodeId_fkey" FOREIGN KEY ("indirectCodeId") REFERENCES "indirect_cost_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machine_time_entries" ADD CONSTRAINT "machine_time_entries_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machine_time_entries" ADD CONSTRAINT "machine_time_entries_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machine_time_entries" ADD CONSTRAINT "machine_time_entries_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "work_order_operations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indirect_cost_codes" ADD CONSTRAINT "indirect_cost_codes_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;