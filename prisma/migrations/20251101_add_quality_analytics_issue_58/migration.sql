-- CreateEnum QualityMetricType
CREATE TYPE "QualityMetricType" AS ENUM ('NCR_RATE', 'FIRST_PASS_YIELD', 'DPMO', 'COPQ_PERCENT', 'SCRAP_RATE', 'REWORK_RATE', 'CUSTOMER_COMPLAINT_RATE', 'CAPA_EFFECTIVENESS', 'ESCAPED_DEFECTS', 'SUPPLIER_QUALITY_INDEX');

-- CreateEnum ParetoAnalysisType
CREATE TYPE "ParetoAnalysisType" AS ENUM ('DEFECT_TYPE', 'ROOT_CAUSE', 'PRODUCT', 'SUPPLIER', 'WORK_CENTER', 'OPERATION', 'CUSTOMER', 'SEVERITY', 'DISPOSITION', 'DETECTION_POINT', 'COST_RANGE');

-- CreateEnum QualityAlertType
CREATE TYPE "QualityAlertType" AS ENUM ('THRESHOLD_EXCEEDED', 'TREND_DEGRADATION', 'SPC_OUT_OF_CONTROL', 'ESCAPED_DEFECT', 'SUPPLIER_PERFORMANCE', 'CAPA_OVERDUE', 'TREND_IMPROVEMENT', 'ANOMALY_DETECTED');

-- CreateEnum AlertSeverity
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL', 'URGENT');

-- CreateEnum DetectionPoint
CREATE TYPE "DetectionPoint" AS ENUM ('IN_PROCESS', 'FINAL_INSPECTION', 'RECEIVING', 'ASSEMBLY', 'SHIPPING', 'CUSTOMER', 'INTERNAL_AUDIT', 'SUPPLIER_AUDIT');

-- CreateEnum NCRSeverity (if not exists)
DO $$ BEGIN
    CREATE TYPE "NCRSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- CreateEnum NCRDisposition (if not exists)
DO $$ BEGIN
    CREATE TYPE "NCRDisposition" AS ENUM ('SCRAP', 'REWORK', 'REPAIR', 'USE_AS_IS', 'RETURN_TO_VENDOR', 'CUSTOMER_CONCESSION');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- AlterTable ncrs - Add cost and detection tracking fields
ALTER TABLE "ncrs" ADD COLUMN "sortingCost" DECIMAL(15,2),
ADD COLUMN "engineeringCost" DECIMAL(15,2),
ADD COLUMN "customerCost" DECIMAL(15,2),
ADD COLUMN "currencyCode" TEXT DEFAULT 'USD',
ADD COLUMN "costApprovedBy" TEXT,
ADD COLUMN "costApprovedAt" TIMESTAMP(3),
ADD COLUMN "detectionPoint" "DetectionPoint",
ADD COLUMN "escapePoint" TEXT,
ADD COLUMN "isEscapedDefect" BOOLEAN DEFAULT false;

-- CreateTable QualityConfiguration
CREATE TABLE "quality_configurations" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "ncrRateThreshold" DOUBLE PRECISION DEFAULT 1.0,
    "fypThreshold" DOUBLE PRECISION DEFAULT 95.0,
    "dpmoThreshold" DOUBLE PRECISION DEFAULT 10000,
    "copqThreshold" DOUBLE PRECISION DEFAULT 5.0,
    "scrapRateThreshold" DOUBLE PRECISION DEFAULT 2.0,
    "reworkRateThreshold" DOUBLE PRECISION DEFAULT 3.0,
    "alertEnabled" BOOLEAN NOT NULL DEFAULT true,
    "alertRecipients" TEXT[],
    "alertThresholdDays" INTEGER NOT NULL DEFAULT 7,
    "spcControlLimit" DOUBLE PRECISION DEFAULT 3.0,
    "reportingCurrency" TEXT NOT NULL DEFAULT 'USD',
    "materialized" BOOLEAN NOT NULL DEFAULT true,
    "refreshInterval" INTEGER NOT NULL DEFAULT 3600,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quality_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable QualityMetric
CREATE TABLE "quality_metrics" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "metricType" "QualityMetricType" NOT NULL,
    "period" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "defectType" TEXT,
    "rootCause" TEXT,
    "product" TEXT,
    "supplier" TEXT,
    "workCenter" TEXT,
    "operation" TEXT,
    "customer" TEXT,
    "severity" "NCRSeverity",
    "disposition" "NCRDisposition",
    "detectionPoint" "DetectionPoint",
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "trend" DOUBLE PRECISION,
    "targetValue" DOUBLE PRECISION,
    "status" TEXT,
    "numerator" INTEGER NOT NULL DEFAULT 0,
    "denominator" INTEGER NOT NULL DEFAULT 0,
    "sampleSize" INTEGER NOT NULL DEFAULT 0,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "calculatedBy" TEXT,

    CONSTRAINT "quality_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable ParetoAnalysis
CREATE TABLE "pareto_analyses" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "analysisType" "ParetoAnalysisType" NOT NULL,
    "period" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "items" TEXT NOT NULL,
    "vitalFewCount" INTEGER NOT NULL,
    "totalItems" INTEGER NOT NULL,
    "totalOccurrences" INTEGER NOT NULL,
    "totalCost" DECIMAL(15,2),
    "defectType" TEXT,
    "severity" "NCRSeverity",
    "dispositionFilter" "NCRDisposition",
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" TEXT,

    CONSTRAINT "pareto_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable QualityAlert
CREATE TABLE "quality_alerts" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "alertType" "QualityAlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "context" TEXT,
    "metricType" "QualityMetricType",
    "metricId" TEXT,
    "ncrId" TEXT,
    "threshold" DOUBLE PRECISION,
    "actualValue" DOUBLE PRECISION,
    "trend" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "acknowledgement" TEXT,
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "notificationSent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "quality_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable QualityCoqTracking
CREATE TABLE "quality_coq_tracking" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "preventionCost" DECIMAL(15,2),
    "appraisalCost" DECIMAL(15,2),
    "internalFailure" DECIMAL(15,2),
    "externalFailure" DECIMAL(15,2),
    "totalCoq" DECIMAL(15,2),
    "copqPercent" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "ncrCount" INTEGER NOT NULL DEFAULT 0,
    "escapeCount" INTEGER NOT NULL DEFAULT 0,
    "capaCount" INTEGER NOT NULL DEFAULT 0,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quality_coq_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quality_configurations_siteId_key" ON "quality_configurations"("siteId");

-- CreateIndex
CREATE INDEX "quality_metrics_siteId_idx" ON "quality_metrics"("siteId");

-- CreateIndex
CREATE INDEX "quality_metrics_metricType_idx" ON "quality_metrics"("metricType");

-- CreateIndex
CREATE INDEX "quality_metrics_periodStart_periodEnd_idx" ON "quality_metrics"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "quality_metrics_defectType_idx" ON "quality_metrics"("defectType");

-- CreateIndex
CREATE INDEX "quality_metrics_rootCause_idx" ON "quality_metrics"("rootCause");

-- CreateIndex
CREATE INDEX "quality_metrics_product_idx" ON "quality_metrics"("product");

-- CreateIndex
CREATE UNIQUE INDEX "quality_metrics_siteId_metricType_period_periodStart_defectT_key" ON "quality_metrics"("siteId", "metricType", "period", "periodStart", "defectType", "rootCause", "product", "supplier", "workCenter", "operation", "customer", "severity", "disposition", "detectionPoint");

-- CreateIndex
CREATE INDEX "pareto_analyses_siteId_idx" ON "pareto_analyses"("siteId");

-- CreateIndex
CREATE INDEX "pareto_analyses_analysisType_idx" ON "pareto_analyses"("analysisType");

-- CreateIndex
CREATE INDEX "pareto_analyses_periodStart_idx" ON "pareto_analyses"("periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "pareto_analyses_siteId_analysisType_period_periodStart_key" ON "pareto_analyses"("siteId", "analysisType", "period", "periodStart");

-- CreateIndex
CREATE INDEX "quality_alerts_siteId_idx" ON "quality_alerts"("siteId");

-- CreateIndex
CREATE INDEX "quality_alerts_alertType_idx" ON "quality_alerts"("alertType");

-- CreateIndex
CREATE INDEX "quality_alerts_severity_idx" ON "quality_alerts"("severity");

-- CreateIndex
CREATE INDEX "quality_alerts_status_idx" ON "quality_alerts"("status");

-- CreateIndex
CREATE INDEX "quality_alerts_createdAt_idx" ON "quality_alerts"("createdAt");

-- CreateIndex
CREATE INDEX "quality_coq_tracking_siteId_idx" ON "quality_coq_tracking"("siteId");

-- CreateIndex
CREATE INDEX "quality_coq_tracking_periodStart_idx" ON "quality_coq_tracking"("periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "quality_coq_tracking_siteId_period_periodStart_key" ON "quality_coq_tracking"("siteId", "period", "periodStart");

-- AddForeignKey
ALTER TABLE "quality_configurations" ADD CONSTRAINT "quality_configurations_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_metrics" ADD CONSTRAINT "quality_metrics_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pareto_analyses" ADD CONSTRAINT "pareto_analyses_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_alerts" ADD CONSTRAINT "quality_alerts_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_alerts" ADD CONSTRAINT "quality_alerts_ncrId_fkey" FOREIGN KEY ("ncrId") REFERENCES "ncrs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_coq_tracking" ADD CONSTRAINT "quality_coq_tracking_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
