-- CreateEnum TestCellStatus
DO $$ BEGIN
  CREATE TYPE "TestCellStatus" AS ENUM ('OPERATIONAL', 'MAINTENANCE', 'OUT_OF_SERVICE', 'CALIBRATION_DUE', 'UNAVAILABLE');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- CreateEnum DAQSystemType
DO $$ BEGIN
  CREATE TYPE "DAQSystemType" AS ENUM ('NI_LABVIEW', 'SIEMENS_TESTLAB', 'ETAS_INCA', 'CUSTOM_SCADA', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- CreateEnum TestRunStatus
DO $$ BEGIN
  CREATE TYPE "TestRunStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED', 'AWAITING_APPROVAL', 'APPROVED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- CreateEnum TestParameterType
DO $$ BEGIN
  CREATE TYPE "TestParameterType" AS ENUM ('PERFORMANCE', 'THERMAL', 'VIBRATION', 'ACOUSTIC', 'EMISSIONS', 'PRESSURE', 'FLOW', 'ELECTRICAL', 'FUEL', 'OIL', 'COOLANT', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- CreateEnum AcceptanceCriteriaType
DO $$ BEGIN
  CREATE TYPE "AcceptanceCriteriaType" AS ENUM ('EXACT_MATCH', 'RANGE', 'THRESHOLD', 'TREND', 'STATISTICAL', 'CUSTOM');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- CreateTable TestCell
CREATE TABLE "test_cells" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "cellName" TEXT NOT NULL,
    "cellIdentifier" TEXT NOT NULL,
    "status" "TestCellStatus" NOT NULL DEFAULT 'OPERATIONAL',
    "testType" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "lastMaintenanceDate" TIMESTAMP(3),
    "nextMaintenanceDate" TIMESTAMP(3),
    "maintenanceIntervalDays" INTEGER,
    "daqSystemType" "DAQSystemType" NOT NULL,
    "daqSystemId" TEXT,
    "daqApiEndpoint" TEXT,
    "daqApiKey" TEXT,
    "daqStatus" TEXT,
    "maxConcurrentTests" INTEGER NOT NULL DEFAULT 1,
    "estimatedTestDuration" INTEGER,
    "certificationNumber" TEXT,
    "certificationExpiry" TIMESTAMP(3),
    "isCompliant" BOOLEAN NOT NULL DEFAULT true,
    "complianceNotes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_cells_pkey" PRIMARY KEY ("id")
);

-- CreateTable TestRun
CREATE TABLE "test_runs" (
    "id" TEXT NOT NULL,
    "testRunNumber" TEXT NOT NULL,
    "buildRecordId" TEXT NOT NULL,
    "testCellId" TEXT NOT NULL,
    "status" "TestRunStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledStartTime" TIMESTAMP(3) NOT NULL,
    "actualStartTime" TIMESTAMP(3),
    "actualEndTime" TIMESTAMP(3),
    "estimatedDuration" INTEGER,
    "actualDuration" INTEGER,
    "operatorId" TEXT,
    "supervisorId" TEXT,
    "testData" JSONB,
    "dataCollectionStatus" TEXT,
    "daqFileReference" TEXT,
    "testPassed" BOOLEAN,
    "testCompletedSuccessfully" BOOLEAN NOT NULL DEFAULT false,
    "hasAnomolies" BOOLEAN NOT NULL DEFAULT false,
    "anomolyNotes" TEXT,
    "allCriteriaMet" BOOLEAN,
    "failureReason" TEXT,
    "failureCode" TEXT,
    "witnessedTest" BOOLEAN NOT NULL DEFAULT false,
    "qualityApproved" BOOLEAN NOT NULL DEFAULT false,
    "qualityApprovedById" TEXT,
    "qualityApprovedAt" TIMESTAMP(3),
    "faaCompliant" BOOLEAN NOT NULL DEFAULT false,
    "complianceNotes" TEXT,
    "testCertificateGenerated" BOOLEAN NOT NULL DEFAULT false,
    "testCertificatePath" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable TestParameter
CREATE TABLE "test_parameters" (
    "id" TEXT NOT NULL,
    "testCellId" TEXT NOT NULL,
    "parameterName" TEXT NOT NULL,
    "parameterType" "TestParameterType" NOT NULL,
    "unit" TEXT NOT NULL,
    "minValue" DECIMAL(15,4),
    "maxValue" DECIMAL(15,4),
    "targetValue" DECIMAL(15,4),
    "tolerance" DECIMAL(15,4),
    "daqChannelId" TEXT,
    "daqSensorType" TEXT,
    "sensorManufacturer" TEXT,
    "sensorModel" TEXT,
    "calibrationDueDate" TIMESTAMP(3),
    "recordingFrequency" INTEGER,
    "dataProcessingMethod" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_parameters_pkey" PRIMARY KEY ("id")
);

-- CreateTable TestMeasurement
CREATE TABLE "test_measurements" (
    "id" TEXT NOT NULL,
    "testRunId" TEXT NOT NULL,
    "testParameterId" TEXT NOT NULL,
    "value" DECIMAL(15,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "timestampSeconds" DECIMAL(15,2) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "isOutOfRange" BOOLEAN NOT NULL DEFAULT false,
    "isSuspicious" BOOLEAN NOT NULL DEFAULT false,
    "dataQuality" TEXT,
    "daqRawId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_measurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable AcceptanceCriteria
CREATE TABLE "acceptance_criteria" (
    "id" TEXT NOT NULL,
    "testParameterId" TEXT NOT NULL,
    "criteriaType" "AcceptanceCriteriaType" NOT NULL,
    "minValue" DECIMAL(15,4),
    "maxValue" DECIMAL(15,4),
    "targetValue" DECIMAL(15,4),
    "tolerance" DECIMAL(15,4),
    "assessmentMethod" TEXT NOT NULL,
    "customFormula" TEXT,
    "passingCondition" TEXT NOT NULL,
    "description" TEXT,
    "faaRequirement" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acceptance_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable TestRunAcceptanceCriteria
CREATE TABLE "test_run_acceptance_criteria" (
    "id" TEXT NOT NULL,
    "testRunId" TEXT NOT NULL,
    "acceptanceCriteriaId" TEXT NOT NULL,
    "criteria" TEXT NOT NULL,
    "testValue" DECIMAL(15,4),
    "minRequired" DECIMAL(15,4),
    "maxRequired" DECIMAL(15,4),
    "passed" BOOLEAN,
    "assessmentDetail" TEXT,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_run_acceptance_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable TestCertificate
CREATE TABLE "test_certificates" (
    "id" TEXT NOT NULL,
    "testRunId" TEXT NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "certificateType" TEXT NOT NULL,
    "issuedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "certificationStandards" TEXT[],
    "allTestsPassed" BOOLEAN NOT NULL,
    "testSummary" TEXT,
    "failedCriteria" TEXT[],
    "issuedById" TEXT,
    "approvalDate" TIMESTAMP(3),
    "approverComments" TEXT,
    "certificatePath" TEXT,
    "certificateDataJson" JSONB,
    "expirationDate" TIMESTAMP(3),
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable TestRunStatusHistory
CREATE TABLE "test_run_status_history" (
    "id" TEXT NOT NULL,
    "testRunId" TEXT NOT NULL,
    "previousStatus" "TestRunStatus",
    "newStatus" "TestRunStatus" NOT NULL,
    "reason" TEXT,
    "changedById" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_run_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable TestCellSchedule
CREATE TABLE "test_cell_schedules" (
    "id" TEXT NOT NULL,
    "testCellId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "scheduleType" TEXT NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_cell_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "test_cells_cellIdentifier_key" ON "test_cells"("cellIdentifier");

-- CreateIndex
CREATE UNIQUE INDEX "test_cells_siteId_cellIdentifier_key" ON "test_cells"("siteId", "cellIdentifier");

-- CreateIndex
CREATE INDEX "test_cells_siteId_idx" ON "test_cells"("siteId");

-- CreateIndex
CREATE INDEX "test_cells_status_idx" ON "test_cells"("status");

-- CreateIndex
CREATE INDEX "test_cells_daqSystemType_idx" ON "test_cells"("daqSystemType");

-- CreateIndex
CREATE UNIQUE INDEX "test_runs_testRunNumber_key" ON "test_runs"("testRunNumber");

-- CreateIndex
CREATE INDEX "test_runs_buildRecordId_idx" ON "test_runs"("buildRecordId");

-- CreateIndex
CREATE INDEX "test_runs_testCellId_idx" ON "test_runs"("testCellId");

-- CreateIndex
CREATE INDEX "test_runs_status_idx" ON "test_runs"("status");

-- CreateIndex
CREATE INDEX "test_runs_testPassed_idx" ON "test_runs"("testPassed");

-- CreateIndex
CREATE INDEX "test_runs_actualStartTime_idx" ON "test_runs"("actualStartTime");

-- CreateIndex
CREATE UNIQUE INDEX "test_parameters_testCellId_parameterName_key" ON "test_parameters"("testCellId", "parameterName");

-- CreateIndex
CREATE INDEX "test_parameters_testCellId_idx" ON "test_parameters"("testCellId");

-- CreateIndex
CREATE INDEX "test_parameters_parameterType_idx" ON "test_parameters"("parameterType");

-- CreateIndex
CREATE INDEX "test_measurements_testRunId_idx" ON "test_measurements"("testRunId");

-- CreateIndex
CREATE INDEX "test_measurements_testParameterId_idx" ON "test_measurements"("testParameterId");

-- CreateIndex
CREATE INDEX "test_measurements_recordedAt_idx" ON "test_measurements"("recordedAt");

-- CreateIndex
CREATE INDEX "test_measurements_isOutOfRange_idx" ON "test_measurements"("isOutOfRange");

-- CreateIndex
CREATE INDEX "acceptance_criteria_testParameterId_idx" ON "acceptance_criteria"("testParameterId");

-- CreateIndex
CREATE INDEX "acceptance_criteria_criteriaType_idx" ON "acceptance_criteria"("criteriaType");

-- CreateIndex
CREATE UNIQUE INDEX "test_run_acceptance_criteria_testRunId_acceptanceCriteriaId_key" ON "test_run_acceptance_criteria"("testRunId", "acceptanceCriteriaId");

-- CreateIndex
CREATE INDEX "test_run_acceptance_criteria_testRunId_idx" ON "test_run_acceptance_criteria"("testRunId");

-- CreateIndex
CREATE INDEX "test_run_acceptance_criteria_passed_idx" ON "test_run_acceptance_criteria"("passed");

-- CreateIndex
CREATE UNIQUE INDEX "test_certificates_certificateNumber_key" ON "test_certificates"("certificateNumber");

-- CreateIndex
CREATE INDEX "test_certificates_testRunId_idx" ON "test_certificates"("testRunId");

-- CreateIndex
CREATE INDEX "test_certificates_isValid_idx" ON "test_certificates"("isValid");

-- CreateIndex
CREATE INDEX "test_run_status_history_testRunId_idx" ON "test_run_status_history"("testRunId");

-- CreateIndex
CREATE INDEX "test_run_status_history_changedAt_idx" ON "test_run_status_history"("changedAt");

-- CreateIndex
CREATE INDEX "test_cell_schedules_testCellId_idx" ON "test_cell_schedules"("testCellId");

-- CreateIndex
CREATE INDEX "test_cell_schedules_scheduledDate_idx" ON "test_cell_schedules"("scheduledDate");

-- AddForeignKey
ALTER TABLE "test_cells" ADD CONSTRAINT "test_cells_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_buildRecordId_fkey" FOREIGN KEY ("buildRecordId") REFERENCES "build_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_testCellId_fkey" FOREIGN KEY ("testCellId") REFERENCES "test_cells"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "users"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "users"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_qualityApprovedById_fkey" FOREIGN KEY ("qualityApprovedById") REFERENCES "users"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_parameters" ADD CONSTRAINT "test_parameters_testCellId_fkey" FOREIGN KEY ("testCellId") REFERENCES "test_cells"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_measurements" ADD CONSTRAINT "test_measurements_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "test_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_measurements" ADD CONSTRAINT "test_measurements_testParameterId_fkey" FOREIGN KEY ("testParameterId") REFERENCES "test_parameters"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acceptance_criteria" ADD CONSTRAINT "acceptance_criteria_testParameterId_fkey" FOREIGN KEY ("testParameterId") REFERENCES "test_parameters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_run_acceptance_criteria" ADD CONSTRAINT "test_run_acceptance_criteria_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "test_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_run_acceptance_criteria" ADD CONSTRAINT "test_run_acceptance_criteria_acceptanceCriteriaId_fkey" FOREIGN KEY ("acceptanceCriteriaId") REFERENCES "acceptance_criteria"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_certificates" ADD CONSTRAINT "test_certificates_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "test_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_certificates" ADD CONSTRAINT "test_certificates_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "users"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_run_status_history" ADD CONSTRAINT "test_run_status_history_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "test_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_run_status_history" ADD CONSTRAINT "test_run_status_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_cell_schedules" ADD CONSTRAINT "test_cell_schedules_testCellId_fkey" FOREIGN KEY ("testCellId") REFERENCES "test_cells"("id") ON DELETE CASCADE ON UPDATE CASCADE;
