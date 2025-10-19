-- AlterEnum
ALTER TYPE "IntegrationType" ADD VALUE 'CMM';

-- CreateTable
CREATE TABLE "qif_measurement_plans" (
    "id" TEXT NOT NULL,
    "qifPlanId" TEXT NOT NULL,
    "partNumber" TEXT NOT NULL,
    "partRevision" TEXT NOT NULL,
    "planVersion" TEXT NOT NULL,
    "planName" TEXT,
    "description" TEXT,
    "createdDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "qifXmlContent" TEXT NOT NULL,
    "qifVersion" TEXT NOT NULL DEFAULT '3.0.0',
    "characteristicCount" INTEGER NOT NULL DEFAULT 0,
    "workOrderId" TEXT,
    "faiReportId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "supersededBy" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qif_measurement_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qif_characteristics" (
    "id" TEXT NOT NULL,
    "qifMeasurementPlanId" TEXT NOT NULL,
    "characteristicId" TEXT NOT NULL,
    "balloonNumber" TEXT,
    "characteristicName" TEXT,
    "description" TEXT,
    "nominalValue" DOUBLE PRECISION,
    "upperTolerance" DOUBLE PRECISION,
    "lowerTolerance" DOUBLE PRECISION,
    "toleranceType" TEXT,
    "gdtType" TEXT,
    "datumReferenceFrame" TEXT,
    "materialCondition" TEXT,
    "measurementMethod" TEXT,
    "samplingRequired" BOOLEAN NOT NULL DEFAULT false,
    "sampleSize" INTEGER,
    "sequenceNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qif_characteristics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qif_measurement_results" (
    "id" TEXT NOT NULL,
    "qifResultsId" TEXT NOT NULL,
    "qifMeasurementPlanId" TEXT,
    "partNumber" TEXT NOT NULL,
    "serialNumber" TEXT,
    "lotNumber" TEXT,
    "inspectionDate" TIMESTAMP(3) NOT NULL,
    "inspectedBy" TEXT NOT NULL,
    "inspectionType" TEXT,
    "overallStatus" TEXT NOT NULL,
    "totalMeasurements" INTEGER NOT NULL DEFAULT 0,
    "passedMeasurements" INTEGER NOT NULL DEFAULT 0,
    "failedMeasurements" INTEGER NOT NULL DEFAULT 0,
    "qifXmlContent" TEXT NOT NULL,
    "qifVersion" TEXT NOT NULL DEFAULT '3.0.0',
    "workOrderId" TEXT,
    "serializedPartId" TEXT,
    "faiReportId" TEXT,
    "measurementDeviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qif_measurement_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qif_measurements" (
    "id" TEXT NOT NULL,
    "qifMeasurementResultId" TEXT NOT NULL,
    "qifCharacteristicId" TEXT,
    "characteristicId" TEXT NOT NULL,
    "balloonNumber" TEXT,
    "measuredValue" DOUBLE PRECISION NOT NULL,
    "deviation" DOUBLE PRECISION,
    "status" TEXT NOT NULL,
    "measurementDate" TIMESTAMP(3),
    "measuredBy" TEXT,
    "measurementDevice" TEXT,
    "uncertainty" DOUBLE PRECISION,
    "uncertaintyK" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qif_measurements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "qif_measurement_plans_qifPlanId_key" ON "qif_measurement_plans"("qifPlanId");

-- CreateIndex
CREATE INDEX "qif_measurement_plans_partNumber_idx" ON "qif_measurement_plans"("partNumber");

-- CreateIndex
CREATE INDEX "qif_measurement_plans_partRevision_idx" ON "qif_measurement_plans"("partRevision");

-- CreateIndex
CREATE INDEX "qif_measurement_plans_qifPlanId_idx" ON "qif_measurement_plans"("qifPlanId");

-- CreateIndex
CREATE INDEX "qif_measurement_plans_workOrderId_idx" ON "qif_measurement_plans"("workOrderId");

-- CreateIndex
CREATE INDEX "qif_measurement_plans_faiReportId_idx" ON "qif_measurement_plans"("faiReportId");

-- CreateIndex
CREATE INDEX "qif_measurement_plans_status_idx" ON "qif_measurement_plans"("status");

-- CreateIndex
CREATE INDEX "qif_characteristics_qifMeasurementPlanId_idx" ON "qif_characteristics"("qifMeasurementPlanId");

-- CreateIndex
CREATE INDEX "qif_characteristics_characteristicId_idx" ON "qif_characteristics"("characteristicId");

-- CreateIndex
CREATE INDEX "qif_characteristics_balloonNumber_idx" ON "qif_characteristics"("balloonNumber");

-- CreateIndex
CREATE UNIQUE INDEX "qif_measurement_results_qifResultsId_key" ON "qif_measurement_results"("qifResultsId");

-- CreateIndex
CREATE INDEX "qif_measurement_results_qifResultsId_idx" ON "qif_measurement_results"("qifResultsId");

-- CreateIndex
CREATE INDEX "qif_measurement_results_qifMeasurementPlanId_idx" ON "qif_measurement_results"("qifMeasurementPlanId");

-- CreateIndex
CREATE INDEX "qif_measurement_results_partNumber_idx" ON "qif_measurement_results"("partNumber");

-- CreateIndex
CREATE INDEX "qif_measurement_results_serialNumber_idx" ON "qif_measurement_results"("serialNumber");

-- CreateIndex
CREATE INDEX "qif_measurement_results_inspectionDate_idx" ON "qif_measurement_results"("inspectionDate");

-- CreateIndex
CREATE INDEX "qif_measurement_results_overallStatus_idx" ON "qif_measurement_results"("overallStatus");

-- CreateIndex
CREATE INDEX "qif_measurement_results_workOrderId_idx" ON "qif_measurement_results"("workOrderId");

-- CreateIndex
CREATE INDEX "qif_measurement_results_faiReportId_idx" ON "qif_measurement_results"("faiReportId");

-- CreateIndex
CREATE INDEX "qif_measurements_qifMeasurementResultId_idx" ON "qif_measurements"("qifMeasurementResultId");

-- CreateIndex
CREATE INDEX "qif_measurements_qifCharacteristicId_idx" ON "qif_measurements"("qifCharacteristicId");

-- CreateIndex
CREATE INDEX "qif_measurements_characteristicId_idx" ON "qif_measurements"("characteristicId");

-- CreateIndex
CREATE INDEX "qif_measurements_status_idx" ON "qif_measurements"("status");

-- AddForeignKey
ALTER TABLE "qif_measurement_plans" ADD CONSTRAINT "qif_measurement_plans_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qif_measurement_plans" ADD CONSTRAINT "qif_measurement_plans_faiReportId_fkey" FOREIGN KEY ("faiReportId") REFERENCES "fai_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qif_characteristics" ADD CONSTRAINT "qif_characteristics_qifMeasurementPlanId_fkey" FOREIGN KEY ("qifMeasurementPlanId") REFERENCES "qif_measurement_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qif_measurement_results" ADD CONSTRAINT "qif_measurement_results_qifMeasurementPlanId_fkey" FOREIGN KEY ("qifMeasurementPlanId") REFERENCES "qif_measurement_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qif_measurement_results" ADD CONSTRAINT "qif_measurement_results_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qif_measurement_results" ADD CONSTRAINT "qif_measurement_results_serializedPartId_fkey" FOREIGN KEY ("serializedPartId") REFERENCES "serialized_parts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qif_measurement_results" ADD CONSTRAINT "qif_measurement_results_faiReportId_fkey" FOREIGN KEY ("faiReportId") REFERENCES "fai_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qif_measurement_results" ADD CONSTRAINT "qif_measurement_results_measurementDeviceId_fkey" FOREIGN KEY ("measurementDeviceId") REFERENCES "measurement_equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qif_measurements" ADD CONSTRAINT "qif_measurements_qifMeasurementResultId_fkey" FOREIGN KEY ("qifMeasurementResultId") REFERENCES "qif_measurement_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qif_measurements" ADD CONSTRAINT "qif_measurements_qifCharacteristicId_fkey" FOREIGN KEY ("qifCharacteristicId") REFERENCES "qif_characteristics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
