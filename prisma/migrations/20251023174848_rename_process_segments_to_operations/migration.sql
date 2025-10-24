-- ============================================================================
-- Migration: Rename Process Segments to Operations
-- Purpose: Align terminology with Oracle ERP and Teamcenter PLM
-- ISA-95 Mapping: Operation = Process Segment
-- Date: 2025-10-23
-- ============================================================================

-- This migration renames all ProcessSegment-related tables and columns to
-- use "Operation" terminology that is more familiar to users of Oracle ERP
-- and Teamcenter PLM systems, while preserving ISA-95 semantics.

-- ============================================================================
-- STEP 1: Rename all tables
-- ============================================================================

-- Rename main process_segments table to operations
ALTER TABLE "process_segments" RENAME TO "operations";

-- Rename related specification tables
ALTER TABLE "process_segment_parameters" RENAME TO "operation_parameters";
ALTER TABLE "process_segment_dependencies" RENAME TO "operation_dependencies";
ALTER TABLE "personnel_segment_specifications" RENAME TO "personnel_operation_specifications";
ALTER TABLE "equipment_segment_specifications" RENAME TO "equipment_operation_specifications";
ALTER TABLE "material_segment_specifications" RENAME TO "material_operation_specifications";
ALTER TABLE "physical_asset_segment_specifications" RENAME TO "physical_asset_operation_specifications";

-- Rename enum types
ALTER TYPE "ProcessSegmentType" RENAME TO "OperationType";

-- ============================================================================
-- STEP 2: Rename columns in operations table
-- ============================================================================

-- Rename segmentCode and segmentName columns to operationCode and operationName
ALTER TABLE "operations" RENAME COLUMN "segmentCode" TO "operationCode";
ALTER TABLE "operations" RENAME COLUMN "segmentName" TO "operationName";

-- Rename segmentType column to operationType
ALTER TABLE "operations" RENAME COLUMN "segmentType" TO "operationType";

-- Rename parentSegmentId to parentOperationId
ALTER TABLE "operations" RENAME COLUMN "parentSegmentId" TO "parentOperationId";

-- ============================================================================
-- STEP 3: Rename columns in operation_parameters table
-- ============================================================================

ALTER TABLE "operation_parameters" RENAME COLUMN "segmentId" TO "operationId";

-- ============================================================================
-- STEP 4: Rename columns in operation_dependencies table
-- ============================================================================

ALTER TABLE "operation_dependencies" RENAME COLUMN "dependentSegmentId" TO "dependentOperationId";
ALTER TABLE "operation_dependencies" RENAME COLUMN "prerequisiteSegmentId" TO "prerequisiteOperationId";

-- ============================================================================
-- STEP 5: Rename columns in specification tables
-- ============================================================================

ALTER TABLE "personnel_operation_specifications" RENAME COLUMN "segmentId" TO "operationId";
ALTER TABLE "equipment_operation_specifications" RENAME COLUMN "segmentId" TO "operationId";
ALTER TABLE "material_operation_specifications" RENAME COLUMN "segmentId" TO "operationId";
ALTER TABLE "physical_asset_operation_specifications" RENAME COLUMN "segmentId" TO "operationId";

-- ============================================================================
-- STEP 6: Rename columns in referencing tables
-- ============================================================================

-- Update BOMItem table
ALTER TABLE "bom_items" RENAME COLUMN "processSegmentId" TO "operationId";

-- Update RoutingStep table
ALTER TABLE "routing_steps" RENAME COLUMN "processSegmentId" TO "operationId";

-- ============================================================================
-- STEP 7: Update indexes
-- ============================================================================

-- Drop old indexes and create new ones with updated names
-- Operations table indexes
DROP INDEX IF EXISTS "process_segments_parentSegmentId_idx";
CREATE INDEX "operations_parentOperationId_idx" ON "operations"("parentOperationId");

DROP INDEX IF EXISTS "process_segments_segmentType_idx";
CREATE INDEX "operations_operationType_idx" ON "operations"("operationType");

DROP INDEX IF EXISTS "process_segments_level_idx";
CREATE INDEX "operations_level_idx" ON "operations"("level");

DROP INDEX IF EXISTS "process_segments_isActive_idx";
CREATE INDEX "operations_isActive_idx" ON "operations"("isActive");

DROP INDEX IF EXISTS "process_segments_siteId_idx";
CREATE INDEX "operations_siteId_idx" ON "operations"("siteId");

DROP INDEX IF EXISTS "process_segments_isStandardOperation_idx";
CREATE INDEX "operations_isStandardOperation_idx" ON "operations"("isStandardOperation");

-- Operation parameters indexes
DROP INDEX IF EXISTS "process_segment_parameters_segmentId_idx";
CREATE INDEX "operation_parameters_operationId_idx" ON "operation_parameters"("operationId");

DROP INDEX IF EXISTS "process_segment_parameters_parameterType_idx";
CREATE INDEX "operation_parameters_parameterType_idx" ON "operation_parameters"("parameterType");

-- Operation dependencies indexes
DROP INDEX IF EXISTS "process_segment_dependencies_dependentSegmentId_idx";
CREATE INDEX "operation_dependencies_dependentOperationId_idx" ON "operation_dependencies"("dependentOperationId");

DROP INDEX IF EXISTS "process_segment_dependencies_prerequisiteSegmentId_idx";
CREATE INDEX "operation_dependencies_prerequisiteOperationId_idx" ON "operation_dependencies"("prerequisiteOperationId");

-- Specification tables indexes
DROP INDEX IF EXISTS "personnel_segment_specifications_segmentId_idx";
CREATE INDEX "personnel_operation_specifications_operationId_idx" ON "personnel_operation_specifications"("operationId");

DROP INDEX IF EXISTS "equipment_segment_specifications_segmentId_idx";
CREATE INDEX "equipment_operation_specifications_operationId_idx" ON "equipment_operation_specifications"("operationId");

DROP INDEX IF EXISTS "material_segment_specifications_segmentId_idx";
CREATE INDEX "material_operation_specifications_operationId_idx" ON "material_operation_specifications"("operationId");

DROP INDEX IF EXISTS "physical_asset_segment_specifications_segmentId_idx";
CREATE INDEX "physical_asset_operation_specifications_operationId_idx" ON "physical_asset_operation_specifications"("operationId");

-- Referencing tables indexes
DROP INDEX IF EXISTS "bom_items_processSegmentId_idx";
CREATE INDEX "bom_items_operationId_idx" ON "bom_items"("operationId");

DROP INDEX IF EXISTS "routing_steps_processSegmentId_idx";
CREATE INDEX "routing_steps_operationId_idx" ON "routing_steps"("operationId");

-- ============================================================================
-- STEP 8: Update foreign key constraints
-- ============================================================================

-- Operations table foreign keys
ALTER TABLE "operations" DROP CONSTRAINT IF EXISTS "process_segments_parentSegmentId_fkey";
ALTER TABLE "operations" ADD CONSTRAINT "operations_parentOperationId_fkey"
    FOREIGN KEY ("parentOperationId") REFERENCES "operations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "operations" DROP CONSTRAINT IF EXISTS "process_segments_siteId_fkey";
ALTER TABLE "operations" ADD CONSTRAINT "operations_siteId_fkey"
    FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Note: standardWorkInstructionId column doesn't exist in this schema version, skipping constraint

-- Operation parameters foreign keys
ALTER TABLE "operation_parameters" DROP CONSTRAINT IF EXISTS "process_segment_parameters_segmentId_fkey";
ALTER TABLE "operation_parameters" ADD CONSTRAINT "operation_parameters_operationId_fkey"
    FOREIGN KEY ("operationId") REFERENCES "operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Operation dependencies foreign keys
ALTER TABLE "operation_dependencies" DROP CONSTRAINT IF EXISTS "process_segment_dependencies_dependentSegmentId_fkey";
ALTER TABLE "operation_dependencies" ADD CONSTRAINT "operation_dependencies_dependentOperationId_fkey"
    FOREIGN KEY ("dependentOperationId") REFERENCES "operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "operation_dependencies" DROP CONSTRAINT IF EXISTS "process_segment_dependencies_prerequisiteSegmentId_fkey";
ALTER TABLE "operation_dependencies" ADD CONSTRAINT "operation_dependencies_prerequisiteOperationId_fkey"
    FOREIGN KEY ("prerequisiteOperationId") REFERENCES "operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Specification tables foreign keys
ALTER TABLE "personnel_operation_specifications" DROP CONSTRAINT IF EXISTS "personnel_segment_specifications_segmentId_fkey";
ALTER TABLE "personnel_operation_specifications" ADD CONSTRAINT "personnel_operation_specifications_operationId_fkey"
    FOREIGN KEY ("operationId") REFERENCES "operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "equipment_operation_specifications" DROP CONSTRAINT IF EXISTS "equipment_segment_specifications_segmentId_fkey";
ALTER TABLE "equipment_operation_specifications" ADD CONSTRAINT "equipment_operation_specifications_operationId_fkey"
    FOREIGN KEY ("operationId") REFERENCES "operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "material_operation_specifications" DROP CONSTRAINT IF EXISTS "material_segment_specifications_segmentId_fkey";
ALTER TABLE "material_operation_specifications" ADD CONSTRAINT "material_operation_specifications_operationId_fkey"
    FOREIGN KEY ("operationId") REFERENCES "operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "physical_asset_operation_specifications" DROP CONSTRAINT IF EXISTS "physical_asset_segment_specifications_segmentId_fkey";
ALTER TABLE "physical_asset_operation_specifications" ADD CONSTRAINT "physical_asset_operation_specifications_operationId_fkey"
    FOREIGN KEY ("operationId") REFERENCES "operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Referencing tables foreign keys
ALTER TABLE "bom_items" DROP CONSTRAINT IF EXISTS "bom_items_processSegmentId_fkey";
ALTER TABLE "bom_items" ADD CONSTRAINT "bom_items_operationId_fkey"
    FOREIGN KEY ("operationId") REFERENCES "operations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "routing_steps" DROP CONSTRAINT IF EXISTS "routing_steps_processSegmentId_fkey";
ALTER TABLE "routing_steps" ADD CONSTRAINT "routing_steps_operationId_fkey"
    FOREIGN KEY ("operationId") REFERENCES "operations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- STEP 9: Update unique constraints
-- ============================================================================

-- Update unique constraint on operation_parameters
ALTER TABLE "operation_parameters" DROP CONSTRAINT IF EXISTS "process_segment_parameters_segmentId_parameterName_key";
ALTER TABLE "operation_parameters" ADD CONSTRAINT "operation_parameters_operationId_parameterName_key"
    UNIQUE ("operationId", "parameterName");

-- Update unique constraint on operation_dependencies
ALTER TABLE "operation_dependencies" DROP CONSTRAINT IF EXISTS "process_segment_dependencies_dependentSegmentId_prerequisit_key";
ALTER TABLE "operation_dependencies" ADD CONSTRAINT "operation_dependencies_dependentOperationId_prerequisite_key"
    UNIQUE ("dependentOperationId", "prerequisiteOperationId");

-- ============================================================================
-- STEP 10: Add table comments for documentation
-- ============================================================================

COMMENT ON TABLE "operations" IS 'ISA-95 Process Segments - Renamed to Operations for Oracle/Teamcenter alignment';
COMMENT ON TABLE "operation_parameters" IS 'ISA-95 Process Segment Parameters - Renamed to Operation Parameters';
COMMENT ON TABLE "operation_dependencies" IS 'ISA-95 Process Segment Dependencies - Renamed to Operation Dependencies';
COMMENT ON TABLE "personnel_operation_specifications" IS 'ISA-95 Personnel Segment Specifications - Renamed to Personnel Operation Specifications';
COMMENT ON TABLE "equipment_operation_specifications" IS 'ISA-95 Equipment Segment Specifications - Renamed to Equipment Operation Specifications';
COMMENT ON TABLE "material_operation_specifications" IS 'ISA-95 Material Segment Specifications - Renamed to Material Operation Specifications';
COMMENT ON TABLE "physical_asset_operation_specifications" IS 'ISA-95 Physical Asset Segment Specifications - Renamed to Physical Asset Operation Specifications';

-- ============================================================================
-- Migration complete
-- All ProcessSegment terminology has been renamed to Operation terminology
-- while preserving all data and maintaining ISA-95 semantic equivalence.
-- ============================================================================
