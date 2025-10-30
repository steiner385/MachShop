-- CreateEnum
CREATE TYPE "TorqueMethod" AS ENUM ('TORQUE_ONLY', 'TORQUE_ANGLE', 'TORQUE_TO_YIELD', 'ANGLE_ONLY');

-- CreateEnum
CREATE TYPE "TorquePattern" AS ENUM ('LINEAR', 'STAR', 'SPIRAL', 'CROSS', 'CUSTOM');

-- CreateTable
CREATE TABLE "torque_specifications" (
    "id" TEXT NOT NULL,
    "torqueSpecCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetTorque" DOUBLE PRECISION NOT NULL,
    "tolerancePlus" DOUBLE PRECISION NOT NULL,
    "toleranceMinus" DOUBLE PRECISION NOT NULL,
    "torqueUnit" TEXT NOT NULL DEFAULT 'Nm',
    "fastenerType" TEXT NOT NULL,
    "fastenerGrade" TEXT,
    "fastenerCount" INTEGER NOT NULL,
    "tighteningMethod" "TorqueMethod" NOT NULL DEFAULT 'TORQUE_ONLY',
    "numberOfPasses" INTEGER NOT NULL DEFAULT 1,
    "passPercentages" JSONB,
    "sequencePattern" "TorquePattern" NOT NULL DEFAULT 'LINEAR',
    "customSequence" JSONB,
    "partId" TEXT,
    "operationId" TEXT,
    "routingOperationId" TEXT,
    "workCenter" TEXT,
    "engineerApprovedBy" TEXT,
    "engineerApprovedAt" TIMESTAMP(3),
    "revision" TEXT NOT NULL DEFAULT 'A',
    "effectiveDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "torque_specifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "torque_sequences" (
    "id" TEXT NOT NULL,
    "torqueSpecId" TEXT NOT NULL,
    "sequenceName" TEXT NOT NULL,
    "boltPositions" JSONB NOT NULL,
    "sequenceOrder" JSONB NOT NULL,
    "passNumber" INTEGER NOT NULL,
    "passPercentage" DOUBLE PRECISION NOT NULL,
    "visualPattern" JSONB,
    "instructions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "torque_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "torque_events" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "torqueSpecId" TEXT NOT NULL,
    "sequenceId" TEXT,
    "serialNumber" TEXT,
    "actualTorque" DOUBLE PRECISION NOT NULL,
    "targetTorque" DOUBLE PRECISION NOT NULL,
    "tolerancePlus" DOUBLE PRECISION NOT NULL,
    "toleranceMinus" DOUBLE PRECISION NOT NULL,
    "torqueUnit" TEXT NOT NULL DEFAULT 'Nm',
    "boltPosition" INTEGER NOT NULL,
    "passNumber" INTEGER NOT NULL,
    "passPercentage" DOUBLE PRECISION NOT NULL,
    "isInSpec" BOOLEAN NOT NULL,
    "deviationPercent" DOUBLE PRECISION,
    "requiresRework" BOOLEAN NOT NULL DEFAULT false,
    "digitalWrenchId" TEXT,
    "wrenchSerialNumber" TEXT,
    "wrenchCalibrationDate" TIMESTAMP(3),
    "operatorId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" INTEGER,
    "supervisorReviewId" TEXT,
    "supervisorReviewAt" TIMESTAMP(3),
    "reviewComments" TEXT,
    "reworkRequired" BOOLEAN NOT NULL DEFAULT false,
    "reworkCompleted" BOOLEAN NOT NULL DEFAULT false,
    "reworkBy" TEXT,
    "reworkAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "torque_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "torque_specifications_torqueSpecCode_key" ON "torque_specifications"("torqueSpecCode");

-- CreateIndex
CREATE INDEX "torque_specifications_partId_idx" ON "torque_specifications"("partId");

-- CreateIndex
CREATE INDEX "torque_specifications_operationId_idx" ON "torque_specifications"("operationId");

-- CreateIndex
CREATE INDEX "torque_specifications_routingOperationId_idx" ON "torque_specifications"("routingOperationId");

-- CreateIndex
CREATE INDEX "torque_specifications_isActive_idx" ON "torque_specifications"("isActive");

-- CreateIndex
CREATE INDEX "torque_specifications_effectiveDate_idx" ON "torque_specifications"("effectiveDate");

-- CreateIndex
CREATE INDEX "torque_sequences_torqueSpecId_idx" ON "torque_sequences"("torqueSpecId");

-- CreateIndex
CREATE INDEX "torque_sequences_passNumber_idx" ON "torque_sequences"("passNumber");

-- CreateIndex
CREATE INDEX "torque_events_workOrderId_idx" ON "torque_events"("workOrderId");

-- CreateIndex
CREATE INDEX "torque_events_torqueSpecId_idx" ON "torque_events"("torqueSpecId");

-- CreateIndex
CREATE INDEX "torque_events_operatorId_idx" ON "torque_events"("operatorId");

-- CreateIndex
CREATE INDEX "torque_events_timestamp_idx" ON "torque_events"("timestamp");

-- CreateIndex
CREATE INDEX "torque_events_isInSpec_idx" ON "torque_events"("isInSpec");

-- CreateIndex
CREATE INDEX "torque_events_serialNumber_idx" ON "torque_events"("serialNumber");

-- CreateIndex
CREATE INDEX "torque_events_boltPosition_passNumber_idx" ON "torque_events"("boltPosition", "passNumber");

-- AddForeignKey
ALTER TABLE "torque_specifications" ADD CONSTRAINT "torque_specifications_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "torque_specifications" ADD CONSTRAINT "torque_specifications_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "operations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "torque_specifications" ADD CONSTRAINT "torque_specifications_routingOperationId_fkey" FOREIGN KEY ("routingOperationId") REFERENCES "routing_operations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "torque_specifications" ADD CONSTRAINT "torque_specifications_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "torque_specifications" ADD CONSTRAINT "torque_specifications_engineerApprovedBy_fkey" FOREIGN KEY ("engineerApprovedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "torque_sequences" ADD CONSTRAINT "torque_sequences_torqueSpecId_fkey" FOREIGN KEY ("torqueSpecId") REFERENCES "torque_specifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "torque_events" ADD CONSTRAINT "torque_events_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "torque_events" ADD CONSTRAINT "torque_events_torqueSpecId_fkey" FOREIGN KEY ("torqueSpecId") REFERENCES "torque_specifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "torque_events" ADD CONSTRAINT "torque_events_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "torque_sequences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "torque_events" ADD CONSTRAINT "torque_events_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "torque_events" ADD CONSTRAINT "torque_events_supervisorReviewId_fkey" FOREIGN KEY ("supervisorReviewId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "torque_events" ADD CONSTRAINT "torque_events_reworkBy_fkey" FOREIGN KEY ("reworkBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;