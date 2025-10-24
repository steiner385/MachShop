-- CreateEnum: StepType for routing step types (if not exists)
DO $$ BEGIN
    CREATE TYPE "StepType" AS ENUM ('PROCESS', 'INSPECTION', 'DECISION', 'PARALLEL_SPLIT', 'PARALLEL_JOIN', 'OSP', 'LOT_SPLIT', 'LOT_MERGE', 'TELESCOPING', 'START', 'END');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: ControlType for material tracking control (if not exists)
DO $$ BEGIN
    CREATE TYPE "ControlType" AS ENUM ('LOT_CONTROLLED', 'SERIAL_CONTROLLED', 'MIXED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable: Add stepType column to routing_steps with default value (if not exists)
DO $$ BEGIN
    ALTER TABLE "routing_steps" ADD COLUMN "stepType" "StepType" NOT NULL DEFAULT 'PROCESS';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- AlterTable: Add controlType column to routing_steps (nullable, if not exists)
DO $$ BEGIN
    ALTER TABLE "routing_steps" ADD COLUMN "controlType" "ControlType";
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
