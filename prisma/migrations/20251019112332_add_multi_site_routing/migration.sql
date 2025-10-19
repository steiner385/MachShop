-- Multi-Site Routing Migration
-- Sprint 1: Database Foundation
-- Generated: 2025-10-19
-- Description: Adds multi-site routing support with site-specific routes, routing steps,
--              and part-site availability tracking

-- CreateEnum
CREATE TYPE "RoutingLifecycleState" AS ENUM ('DRAFT', 'REVIEW', 'RELEASED', 'PRODUCTION', 'OBSOLETE');

-- AlterTable: Add new columns to process_segments
ALTER TABLE "process_segments" ADD COLUMN     "isStandardOperation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "siteId" TEXT;

-- AlterTable: Add new columns to routings
ALTER TABLE "routings" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "effectiveDate" TIMESTAMP(3),
ADD COLUMN     "expirationDate" TIMESTAMP(3),
ADD COLUMN     "isPrimaryRoute" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lifecycleState" "RoutingLifecycleState" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "siteId" TEXT,
ADD COLUMN     "version" TEXT NOT NULL DEFAULT '1.0';

-- AlterTable: Add routingStepId to work_order_operations for future migration
ALTER TABLE "work_order_operations" ADD COLUMN     "routingStepId" TEXT;

-- ========================================
-- DATA MIGRATION: Populate existing data
-- ========================================

-- Set existing process segments as standard operations (global/reusable)
UPDATE "process_segments"
SET "isStandardOperation" = true
WHERE "siteId" IS NULL;

-- Assign existing routings to the first site in the database
-- Set lifecycle state to PRODUCTION since these routes are already in use
-- Mark as primary route
UPDATE "routings"
SET
  "siteId" = (SELECT id FROM "sites" ORDER BY "createdAt" ASC LIMIT 1),
  "lifecycleState" = 'PRODUCTION',
  "isPrimaryRoute" = true,
  "effectiveDate" = "createdAt"
WHERE "siteId" IS NULL;

-- ========================================
-- END DATA MIGRATION
-- ========================================

-- CreateTable: part_site_availability
CREATE TABLE "part_site_availability" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "isPreferred" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "leadTimeDays" INTEGER,
    "minimumLotSize" INTEGER,
    "maximumLotSize" INTEGER,
    "standardCost" DOUBLE PRECISION,
    "setupCost" DOUBLE PRECISION,
    "effectiveDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "part_site_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable: routing_steps
CREATE TABLE "routing_steps" (
    "id" TEXT NOT NULL,
    "routingId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "processSegmentId" TEXT NOT NULL,
    "workCenterId" TEXT,
    "setupTimeOverride" INTEGER,
    "cycleTimeOverride" INTEGER,
    "teardownTimeOverride" INTEGER,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "isQualityInspection" BOOLEAN NOT NULL DEFAULT false,
    "isCriticalPath" BOOLEAN NOT NULL DEFAULT false,
    "stepInstructions" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routing_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable: routing_step_dependencies
CREATE TABLE "routing_step_dependencies" (
    "id" TEXT NOT NULL,
    "dependentStepId" TEXT NOT NULL,
    "prerequisiteStepId" TEXT NOT NULL,
    "dependencyType" "DependencyType" NOT NULL,
    "timingType" "DependencyTimingType" NOT NULL,
    "lagTime" INTEGER,
    "leadTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routing_step_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: part_site_availability indexes
CREATE INDEX "part_site_availability_siteId_idx" ON "part_site_availability"("siteId");
CREATE INDEX "part_site_availability_isActive_idx" ON "part_site_availability"("isActive");
CREATE UNIQUE INDEX "part_site_availability_partId_siteId_key" ON "part_site_availability"("partId", "siteId");

-- CreateIndex: routing_steps indexes
CREATE INDEX "routing_steps_routingId_idx" ON "routing_steps"("routingId");
CREATE INDEX "routing_steps_processSegmentId_idx" ON "routing_steps"("processSegmentId");
CREATE INDEX "routing_steps_workCenterId_idx" ON "routing_steps"("workCenterId");
CREATE UNIQUE INDEX "routing_steps_routingId_stepNumber_key" ON "routing_steps"("routingId", "stepNumber");

-- CreateIndex: routing_step_dependencies indexes
CREATE INDEX "routing_step_dependencies_dependentStepId_idx" ON "routing_step_dependencies"("dependentStepId");
CREATE INDEX "routing_step_dependencies_prerequisiteStepId_idx" ON "routing_step_dependencies"("prerequisiteStepId");
CREATE UNIQUE INDEX "routing_step_dependencies_dependentStepId_prerequisiteStepI_key" ON "routing_step_dependencies"("dependentStepId", "prerequisiteStepId");

-- CreateIndex: process_segments indexes
CREATE INDEX "process_segments_siteId_idx" ON "process_segments"("siteId");
CREATE INDEX "process_segments_isStandardOperation_idx" ON "process_segments"("isStandardOperation");

-- CreateIndex: routings indexes
CREATE INDEX "routings_siteId_idx" ON "routings"("siteId");
CREATE INDEX "routings_partId_idx" ON "routings"("partId");
CREATE INDEX "routings_lifecycleState_idx" ON "routings"("lifecycleState");
CREATE INDEX "routings_isActive_idx" ON "routings"("isActive");
CREATE UNIQUE INDEX "routings_partId_siteId_version_key" ON "routings"("partId", "siteId", "version");

-- AddForeignKey: process_segments
ALTER TABLE "process_segments" ADD CONSTRAINT "process_segments_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: part_site_availability
ALTER TABLE "part_site_availability" ADD CONSTRAINT "part_site_availability_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "part_site_availability" ADD CONSTRAINT "part_site_availability_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: routings
ALTER TABLE "routings" ADD CONSTRAINT "routings_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "routings" ADD CONSTRAINT "routings_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: routing_steps
ALTER TABLE "routing_steps" ADD CONSTRAINT "routing_steps_routingId_fkey" FOREIGN KEY ("routingId") REFERENCES "routings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "routing_steps" ADD CONSTRAINT "routing_steps_processSegmentId_fkey" FOREIGN KEY ("processSegmentId") REFERENCES "process_segments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "routing_steps" ADD CONSTRAINT "routing_steps_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "work_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: routing_step_dependencies
ALTER TABLE "routing_step_dependencies" ADD CONSTRAINT "routing_step_dependencies_dependentStepId_fkey" FOREIGN KEY ("dependentStepId") REFERENCES "routing_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "routing_step_dependencies" ADD CONSTRAINT "routing_step_dependencies_prerequisiteStepId_fkey" FOREIGN KEY ("prerequisiteStepId") REFERENCES "routing_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: work_order_operations
ALTER TABLE "work_order_operations" ADD CONSTRAINT "work_order_operations_routingStepId_fkey" FOREIGN KEY ("routingStepId") REFERENCES "routing_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Migration Complete
-- Next Steps:
--   1. Review migration success: SELECT COUNT(*) FROM routings WHERE "siteId" IS NOT NULL;
--   2. Verify indexes created: \d routings
--   3. Check process segments: SELECT COUNT(*) FROM process_segments WHERE "isStandardOperation" = true;
