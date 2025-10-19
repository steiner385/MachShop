-- CreateEnum
CREATE TYPE "FAIStatus" AS ENUM ('IN_PROGRESS', 'REVIEW', 'APPROVED', 'REJECTED', 'SUPERSEDED');

-- CreateTable
CREATE TABLE "fai_reports" (
    "id" TEXT NOT NULL,
    "faiNumber" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "workOrderId" TEXT,
    "inspectionId" TEXT,
    "status" "FAIStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "revisionLevel" TEXT,
    "form1Data" JSONB,
    "form2Data" JSONB,
    "createdById" TEXT,
    "reviewedById" TEXT,
    "approvedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fai_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fai_characteristics" (
    "id" TEXT NOT NULL,
    "faiReportId" TEXT NOT NULL,
    "characteristicNumber" INTEGER NOT NULL,
    "characteristic" TEXT NOT NULL,
    "specification" TEXT NOT NULL,
    "requirement" TEXT,
    "toleranceType" TEXT,
    "nominalValue" DOUBLE PRECISION,
    "upperLimit" DOUBLE PRECISION,
    "lowerLimit" DOUBLE PRECISION,
    "unitOfMeasure" TEXT,
    "inspectionMethod" TEXT,
    "inspectionFrequency" TEXT,
    "measuredValues" JSONB NOT NULL,
    "actualValue" DOUBLE PRECISION,
    "deviation" DOUBLE PRECISION,
    "result" TEXT,
    "notes" TEXT,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fai_characteristics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fai_reports_faiNumber_key" ON "fai_reports"("faiNumber");

-- CreateIndex
CREATE INDEX "fai_reports_partId_idx" ON "fai_reports"("partId");

-- CreateIndex
CREATE INDEX "fai_reports_status_idx" ON "fai_reports"("status");

-- CreateIndex
CREATE INDEX "fai_characteristics_faiReportId_idx" ON "fai_characteristics"("faiReportId");

-- CreateIndex
CREATE UNIQUE INDEX "fai_characteristics_faiReportId_characteristicNumber_key" ON "fai_characteristics"("faiReportId", "characteristicNumber");

-- AddForeignKey
ALTER TABLE "fai_characteristics" ADD CONSTRAINT "fai_characteristics_faiReportId_fkey" FOREIGN KEY ("faiReportId") REFERENCES "fai_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
