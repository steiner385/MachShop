-- CreateTable
CREATE TABLE "maintenance_work_orders" (
    "id" TEXT NOT NULL,
    "externalWorkOrderNumber" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "workType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "equipmentId" TEXT,
    "scheduledStart" TIMESTAMP(3),
    "scheduledFinish" TIMESTAMP(3),
    "actualStart" TIMESTAMP(3),
    "actualFinish" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 3,
    "failureCode" TEXT,
    "problemCode" TEXT,
    "causeCode" TEXT,
    "remedyCode" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "measurement_equipment" (
    "id" TEXT NOT NULL,
    "externalGaugeId" TEXT,
    "description" TEXT NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "gaugeType" TEXT NOT NULL,
    "measurementType" TEXT NOT NULL,
    "measurementRange" TEXT,
    "resolution" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,
    "location" TEXT,
    "calibrationFrequency" INTEGER,
    "lastCalibrationDate" TIMESTAMP(3),
    "nextCalibrationDate" TIMESTAMP(3),
    "calibrationStatus" TEXT NOT NULL DEFAULT 'IN_CAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "measurement_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_records" (
    "id" TEXT NOT NULL,
    "serializedPartId" TEXT,
    "measurementEquipmentId" TEXT,
    "characteristic" TEXT NOT NULL,
    "nominalValue" DOUBLE PRECISION NOT NULL,
    "actualValue" DOUBLE PRECISION NOT NULL,
    "lowerTolerance" DOUBLE PRECISION NOT NULL,
    "upperTolerance" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "inspectionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cnc_programs" (
    "id" TEXT NOT NULL,
    "externalProgramId" TEXT,
    "programName" TEXT NOT NULL,
    "partNumber" TEXT NOT NULL,
    "operationCode" TEXT NOT NULL,
    "revision" TEXT NOT NULL,
    "revisionDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "machineType" TEXT,
    "postProcessor" TEXT,
    "toolList" TEXT,
    "setupSheetUrl" TEXT,
    "approvedBy" TEXT,
    "approvalDate" TIMESTAMP(3),
    "ecoNumber" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "firstPieceRequired" BOOLEAN NOT NULL DEFAULT false,
    "firstPieceApproved" BOOLEAN NOT NULL DEFAULT false,
    "firstPieceDate" TIMESTAMP(3),
    "programUrl" TEXT,
    "stepAP242Url" TEXT,
    "pmiDataUrl" TEXT,
    "teamcenterItemId" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cnc_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_download_logs" (
    "id" TEXT NOT NULL,
    "programId" TEXT,
    "programName" TEXT NOT NULL,
    "revision" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "operatorBadgeNumber" TEXT NOT NULL,
    "workOrderNumber" TEXT,
    "downloadDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorized" BOOLEAN NOT NULL,
    "authorizationMethod" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_download_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_load_authorizations" (
    "id" TEXT NOT NULL,
    "authorizationId" TEXT NOT NULL,
    "operatorBadgeNumber" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "programName" TEXT NOT NULL,
    "programRevision" TEXT NOT NULL,
    "partNumber" TEXT NOT NULL,
    "workOrderNumber" TEXT,
    "authorized" BOOLEAN NOT NULL,
    "authorizationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "operatorAuthenticated" BOOLEAN NOT NULL,
    "workOrderValid" BOOLEAN NOT NULL,
    "certificationValid" BOOLEAN NOT NULL,
    "programVersionValid" BOOLEAN NOT NULL,
    "gaugeCalibrationValid" BOOLEAN NOT NULL,
    "failureReasons" TEXT,
    "validationDetails" JSONB,
    "supervisorNotified" BOOLEAN NOT NULL DEFAULT false,
    "overrideReason" TEXT,
    "electronicSignature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_load_authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_gauge_requirements" (
    "id" TEXT NOT NULL,
    "partNumber" TEXT NOT NULL,
    "operationCode" TEXT NOT NULL,
    "measurementEquipmentId" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operation_gauge_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_work_orders_externalWorkOrderNumber_key" ON "maintenance_work_orders"("externalWorkOrderNumber");

-- CreateIndex
CREATE INDEX "maintenance_work_orders_externalWorkOrderNumber_idx" ON "maintenance_work_orders"("externalWorkOrderNumber");

-- CreateIndex
CREATE INDEX "maintenance_work_orders_equipmentId_idx" ON "maintenance_work_orders"("equipmentId");

-- CreateIndex
CREATE INDEX "maintenance_work_orders_status_idx" ON "maintenance_work_orders"("status");

-- CreateIndex
CREATE UNIQUE INDEX "measurement_equipment_externalGaugeId_key" ON "measurement_equipment"("externalGaugeId");

-- CreateIndex
CREATE INDEX "measurement_equipment_externalGaugeId_idx" ON "measurement_equipment"("externalGaugeId");

-- CreateIndex
CREATE INDEX "measurement_equipment_calibrationStatus_idx" ON "measurement_equipment"("calibrationStatus");

-- CreateIndex
CREATE INDEX "measurement_equipment_nextCalibrationDate_idx" ON "measurement_equipment"("nextCalibrationDate");

-- CreateIndex
CREATE INDEX "inspection_records_serializedPartId_idx" ON "inspection_records"("serializedPartId");

-- CreateIndex
CREATE INDEX "inspection_records_measurementEquipmentId_idx" ON "inspection_records"("measurementEquipmentId");

-- CreateIndex
CREATE INDEX "inspection_records_result_idx" ON "inspection_records"("result");

-- CreateIndex
CREATE UNIQUE INDEX "cnc_programs_externalProgramId_key" ON "cnc_programs"("externalProgramId");

-- CreateIndex
CREATE INDEX "cnc_programs_programName_idx" ON "cnc_programs"("programName");

-- CreateIndex
CREATE INDEX "cnc_programs_partNumber_idx" ON "cnc_programs"("partNumber");

-- CreateIndex
CREATE INDEX "cnc_programs_status_idx" ON "cnc_programs"("status");

-- CreateIndex
CREATE INDEX "cnc_programs_revision_idx" ON "cnc_programs"("revision");

-- CreateIndex
CREATE INDEX "program_download_logs_programName_idx" ON "program_download_logs"("programName");

-- CreateIndex
CREATE INDEX "program_download_logs_machineId_idx" ON "program_download_logs"("machineId");

-- CreateIndex
CREATE INDEX "program_download_logs_operatorBadgeNumber_idx" ON "program_download_logs"("operatorBadgeNumber");

-- CreateIndex
CREATE INDEX "program_download_logs_downloadDate_idx" ON "program_download_logs"("downloadDate");

-- CreateIndex
CREATE UNIQUE INDEX "program_load_authorizations_authorizationId_key" ON "program_load_authorizations"("authorizationId");

-- CreateIndex
CREATE INDEX "program_load_authorizations_authorizationId_idx" ON "program_load_authorizations"("authorizationId");

-- CreateIndex
CREATE INDEX "program_load_authorizations_operatorBadgeNumber_idx" ON "program_load_authorizations"("operatorBadgeNumber");

-- CreateIndex
CREATE INDEX "program_load_authorizations_machineId_idx" ON "program_load_authorizations"("machineId");

-- CreateIndex
CREATE INDEX "program_load_authorizations_authorized_idx" ON "program_load_authorizations"("authorized");

-- CreateIndex
CREATE INDEX "program_load_authorizations_authorizationDate_idx" ON "program_load_authorizations"("authorizationDate");

-- CreateIndex
CREATE INDEX "operation_gauge_requirements_partNumber_idx" ON "operation_gauge_requirements"("partNumber");

-- CreateIndex
CREATE INDEX "operation_gauge_requirements_operationCode_idx" ON "operation_gauge_requirements"("operationCode");

-- CreateIndex
CREATE UNIQUE INDEX "operation_gauge_requirements_partNumber_operationCode_measu_key" ON "operation_gauge_requirements"("partNumber", "operationCode", "measurementEquipmentId");

-- CreateIndex
CREATE INDEX "alerts_alertType_idx" ON "alerts"("alertType");

-- CreateIndex
CREATE INDEX "alerts_severity_idx" ON "alerts"("severity");

-- CreateIndex
CREATE INDEX "alerts_resolved_idx" ON "alerts"("resolved");

-- CreateIndex
CREATE INDEX "alerts_createdAt_idx" ON "alerts"("createdAt");

-- AddForeignKey
ALTER TABLE "maintenance_work_orders" ADD CONSTRAINT "maintenance_work_orders_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_records" ADD CONSTRAINT "inspection_records_serializedPartId_fkey" FOREIGN KEY ("serializedPartId") REFERENCES "serialized_parts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_records" ADD CONSTRAINT "inspection_records_measurementEquipmentId_fkey" FOREIGN KEY ("measurementEquipmentId") REFERENCES "measurement_equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_download_logs" ADD CONSTRAINT "program_download_logs_programId_fkey" FOREIGN KEY ("programId") REFERENCES "cnc_programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_gauge_requirements" ADD CONSTRAINT "operation_gauge_requirements_measurementEquipmentId_fkey" FOREIGN KEY ("measurementEquipmentId") REFERENCES "measurement_equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
