-- ROLLBACK SCRIPT: Multi-Site Routing Migration
-- Use this script to roll back the add_multi_site_routing migration
-- WARNING: This will remove all multi-site routing data

-- Step 1: Drop foreign key constraints
ALTER TABLE "work_order_operations" DROP CONSTRAINT IF EXISTS "work_order_operations_routingStepId_fkey";
ALTER TABLE "routing_step_dependencies" DROP CONSTRAINT IF EXISTS "routing_step_dependencies_prerequisiteStepId_fkey";
ALTER TABLE "routing_step_dependencies" DROP CONSTRAINT IF EXISTS "routing_step_dependencies_dependentStepId_fkey";
ALTER TABLE "routing_steps" DROP CONSTRAINT IF EXISTS "routing_steps_workCenterId_fkey";
ALTER TABLE "routing_steps" DROP CONSTRAINT IF EXISTS "routing_steps_processSegmentId_fkey";
ALTER TABLE "routing_steps" DROP CONSTRAINT IF EXISTS "routing_steps_routingId_fkey";
ALTER TABLE "routings" DROP CONSTRAINT IF EXISTS "routings_siteId_fkey";
ALTER TABLE "routings" DROP CONSTRAINT IF EXISTS "routings_partId_fkey";
ALTER TABLE "part_site_availability" DROP CONSTRAINT IF EXISTS "part_site_availability_siteId_fkey";
ALTER TABLE "part_site_availability" DROP CONSTRAINT IF EXISTS "part_site_availability_partId_fkey";
ALTER TABLE "process_segments" DROP CONSTRAINT IF EXISTS "process_segments_siteId_fkey";

-- Step 2: Drop indexes
DROP INDEX IF EXISTS "routings_partId_siteId_version_key";
DROP INDEX IF EXISTS "routings_isActive_idx";
DROP INDEX IF EXISTS "routings_lifecycleState_idx";
DROP INDEX IF EXISTS "routings_partId_idx";
DROP INDEX IF EXISTS "routings_siteId_idx";
DROP INDEX IF EXISTS "process_segments_isStandardOperation_idx";
DROP INDEX IF EXISTS "process_segments_siteId_idx";
DROP INDEX IF EXISTS "routing_step_dependencies_dependentStepId_prerequisiteStepI_key";
DROP INDEX IF EXISTS "routing_step_dependencies_prerequisiteStepId_idx";
DROP INDEX IF EXISTS "routing_step_dependencies_dependentStepId_idx";
DROP INDEX IF EXISTS "routing_steps_routingId_stepNumber_key";
DROP INDEX IF EXISTS "routing_steps_workCenterId_idx";
DROP INDEX IF EXISTS "routing_steps_processSegmentId_idx";
DROP INDEX IF EXISTS "routing_steps_routingId_idx";
DROP INDEX IF EXISTS "part_site_availability_partId_siteId_key";
DROP INDEX IF EXISTS "part_site_availability_isActive_idx";
DROP INDEX IF EXISTS "part_site_availability_siteId_idx";

-- Step 3: Drop new tables
DROP TABLE IF EXISTS "routing_step_dependencies";
DROP TABLE IF EXISTS "routing_steps";
DROP TABLE IF EXISTS "part_site_availability";

-- Step 4: Remove new columns from existing tables
ALTER TABLE "work_order_operations" DROP COLUMN IF EXISTS "routingStepId";
ALTER TABLE "routings" DROP COLUMN IF EXISTS "version";
ALTER TABLE "routings" DROP COLUMN IF EXISTS "siteId";
ALTER TABLE "routings" DROP COLUMN IF EXISTS "notes";
ALTER TABLE "routings" DROP COLUMN IF EXISTS "lifecycleState";
ALTER TABLE "routings" DROP COLUMN IF EXISTS "isPrimaryRoute";
ALTER TABLE "routings" DROP COLUMN IF EXISTS "expirationDate";
ALTER TABLE "routings" DROP COLUMN IF EXISTS "effectiveDate";
ALTER TABLE "routings" DROP COLUMN IF EXISTS "createdBy";
ALTER TABLE "routings" DROP COLUMN IF EXISTS "approvedBy";
ALTER TABLE "routings" DROP COLUMN IF EXISTS "approvedAt";
ALTER TABLE "process_segments" DROP COLUMN IF EXISTS "siteId";
ALTER TABLE "process_segments" DROP COLUMN IF EXISTS "isStandardOperation";

-- Step 5: Drop new enum type
DROP TYPE IF EXISTS "RoutingLifecycleState";

-- Rollback complete
-- To verify: SELECT column_name FROM information_schema.columns WHERE table_name = 'routings';
