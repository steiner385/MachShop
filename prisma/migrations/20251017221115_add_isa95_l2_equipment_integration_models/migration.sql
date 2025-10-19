-- CreateEnum
CREATE TYPE "DataCollectionType" AS ENUM ('SENSOR', 'ALARM', 'EVENT', 'MEASUREMENT', 'STATUS', 'PERFORMANCE');

-- CreateEnum
CREATE TYPE "CommandType" AS ENUM ('START', 'STOP', 'PAUSE', 'RESUME', 'RESET', 'CONFIGURE', 'LOAD_PROGRAM', 'UNLOAD_PROGRAM', 'DIAGNOSTIC', 'CALIBRATE', 'EMERGENCY_STOP');

-- CreateEnum
CREATE TYPE "CommandStatus" AS ENUM ('PENDING', 'SENT', 'ACKNOWLEDGED', 'EXECUTING', 'COMPLETED', 'FAILED', 'TIMEOUT', 'CANCELLED');

-- CreateTable
CREATE TABLE "equipment_data_collections" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "dataCollectionType" "DataCollectionType" NOT NULL,
    "collectionTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataPointName" TEXT NOT NULL,
    "dataPointId" TEXT,
    "numericValue" DOUBLE PRECISION,
    "stringValue" TEXT,
    "booleanValue" BOOLEAN,
    "jsonValue" JSONB,
    "unitOfMeasure" TEXT,
    "quality" TEXT,
    "workOrderId" TEXT,
    "operationId" TEXT,
    "productionRunId" TEXT,
    "equipmentState" TEXT,
    "protocol" TEXT,
    "sourceAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_data_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_commands" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "commandType" "CommandType" NOT NULL,
    "commandStatus" "CommandStatus" NOT NULL DEFAULT 'PENDING',
    "commandName" TEXT NOT NULL,
    "commandPayload" JSONB,
    "workOrderId" TEXT,
    "operationId" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "responsePayload" JSONB,
    "responseCode" TEXT,
    "responseMessage" TEXT,
    "timeoutSeconds" INTEGER NOT NULL DEFAULT 30,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "issuedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_commands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_material_movements" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "partId" TEXT,
    "partNumber" TEXT NOT NULL,
    "lotNumber" TEXT,
    "serialNumber" TEXT,
    "movementType" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitOfMeasure" TEXT NOT NULL,
    "movementTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workOrderId" TEXT,
    "operationId" TEXT,
    "fromLocation" TEXT,
    "toLocation" TEXT,
    "qualityStatus" TEXT,
    "upstreamTraceId" TEXT,
    "downstreamTraceId" TEXT,
    "recordedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_material_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "process_data_collections" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "processName" TEXT NOT NULL,
    "processStepNumber" INTEGER,
    "startTimestamp" TIMESTAMP(3) NOT NULL,
    "endTimestamp" TIMESTAMP(3),
    "duration" DOUBLE PRECISION,
    "workOrderId" TEXT,
    "operationId" TEXT,
    "partNumber" TEXT,
    "lotNumber" TEXT,
    "serialNumber" TEXT,
    "parameters" JSONB NOT NULL,
    "quantityProduced" DOUBLE PRECISION,
    "quantityGood" DOUBLE PRECISION,
    "quantityScrap" DOUBLE PRECISION,
    "inSpecCount" INTEGER,
    "outOfSpecCount" INTEGER,
    "averageUtilization" DOUBLE PRECISION,
    "peakUtilization" DOUBLE PRECISION,
    "alarmCount" INTEGER NOT NULL DEFAULT 0,
    "criticalAlarmCount" INTEGER NOT NULL DEFAULT 0,
    "operatorId" TEXT,
    "supervisorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "process_data_collections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "equipment_data_collections_equipmentId_idx" ON "equipment_data_collections"("equipmentId");

-- CreateIndex
CREATE INDEX "equipment_data_collections_dataCollectionType_idx" ON "equipment_data_collections"("dataCollectionType");

-- CreateIndex
CREATE INDEX "equipment_data_collections_collectionTimestamp_idx" ON "equipment_data_collections"("collectionTimestamp");

-- CreateIndex
CREATE INDEX "equipment_data_collections_workOrderId_idx" ON "equipment_data_collections"("workOrderId");

-- CreateIndex
CREATE INDEX "equipment_data_collections_dataPointName_idx" ON "equipment_data_collections"("dataPointName");

-- CreateIndex
CREATE INDEX "equipment_commands_equipmentId_idx" ON "equipment_commands"("equipmentId");

-- CreateIndex
CREATE INDEX "equipment_commands_commandType_idx" ON "equipment_commands"("commandType");

-- CreateIndex
CREATE INDEX "equipment_commands_commandStatus_idx" ON "equipment_commands"("commandStatus");

-- CreateIndex
CREATE INDEX "equipment_commands_workOrderId_idx" ON "equipment_commands"("workOrderId");

-- CreateIndex
CREATE INDEX "equipment_commands_issuedAt_idx" ON "equipment_commands"("issuedAt");

-- CreateIndex
CREATE INDEX "equipment_commands_priority_idx" ON "equipment_commands"("priority");

-- CreateIndex
CREATE INDEX "equipment_material_movements_equipmentId_idx" ON "equipment_material_movements"("equipmentId");

-- CreateIndex
CREATE INDEX "equipment_material_movements_partId_idx" ON "equipment_material_movements"("partId");

-- CreateIndex
CREATE INDEX "equipment_material_movements_partNumber_idx" ON "equipment_material_movements"("partNumber");

-- CreateIndex
CREATE INDEX "equipment_material_movements_lotNumber_idx" ON "equipment_material_movements"("lotNumber");

-- CreateIndex
CREATE INDEX "equipment_material_movements_serialNumber_idx" ON "equipment_material_movements"("serialNumber");

-- CreateIndex
CREATE INDEX "equipment_material_movements_workOrderId_idx" ON "equipment_material_movements"("workOrderId");

-- CreateIndex
CREATE INDEX "equipment_material_movements_movementTimestamp_idx" ON "equipment_material_movements"("movementTimestamp");

-- CreateIndex
CREATE INDEX "equipment_material_movements_movementType_idx" ON "equipment_material_movements"("movementType");

-- CreateIndex
CREATE INDEX "process_data_collections_equipmentId_idx" ON "process_data_collections"("equipmentId");

-- CreateIndex
CREATE INDEX "process_data_collections_processName_idx" ON "process_data_collections"("processName");

-- CreateIndex
CREATE INDEX "process_data_collections_workOrderId_idx" ON "process_data_collections"("workOrderId");

-- CreateIndex
CREATE INDEX "process_data_collections_startTimestamp_idx" ON "process_data_collections"("startTimestamp");

-- CreateIndex
CREATE INDEX "process_data_collections_partNumber_idx" ON "process_data_collections"("partNumber");

-- CreateIndex
CREATE INDEX "process_data_collections_lotNumber_idx" ON "process_data_collections"("lotNumber");

-- CreateIndex
CREATE INDEX "process_data_collections_serialNumber_idx" ON "process_data_collections"("serialNumber");

-- AddForeignKey
ALTER TABLE "equipment_data_collections" ADD CONSTRAINT "equipment_data_collections_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_data_collections" ADD CONSTRAINT "equipment_data_collections_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_commands" ADD CONSTRAINT "equipment_commands_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_commands" ADD CONSTRAINT "equipment_commands_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_material_movements" ADD CONSTRAINT "equipment_material_movements_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_material_movements" ADD CONSTRAINT "equipment_material_movements_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_material_movements" ADD CONSTRAINT "equipment_material_movements_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_data_collections" ADD CONSTRAINT "process_data_collections_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_data_collections" ADD CONSTRAINT "process_data_collections_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
