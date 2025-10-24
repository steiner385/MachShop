-- CreateEnum
CREATE TYPE "OperationClassification" AS ENUM ('MAKE', 'ASSEMBLY', 'INSPECTION', 'TEST', 'REWORK', 'SETUP', 'SUBCONTRACT', 'PACKING');

-- CreateEnum
CREATE TYPE "RoutingType" AS ENUM ('PRIMARY', 'ALTERNATE', 'REWORK', 'PROTOTYPE', 'ENGINEERING');

-- AlterTable
-- Note: operationCode and operationName already exist from previous rename migration
ALTER TABLE "operations" ADD COLUMN     "operationClassification" "OperationClassification",
ADD COLUMN     "standardWorkInstructionId" TEXT;

-- AlterTable
ALTER TABLE "routing_steps" ADD COLUMN     "workInstructionId" TEXT;

-- AlterTable
ALTER TABLE "routings" ADD COLUMN     "alternateForId" TEXT,
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "routingType" "RoutingType" NOT NULL DEFAULT 'PRIMARY';

-- AlterTable
ALTER TABLE "work_instructions" ADD COLUMN     "operationType" TEXT,
ADD COLUMN     "requiredForExecution" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "routing_step_parameters" (
    "id" TEXT NOT NULL,
    "routingStepId" TEXT NOT NULL,
    "parameterName" TEXT NOT NULL,
    "parameterValue" TEXT NOT NULL,
    "unitOfMeasure" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routing_step_parameters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "routing_step_parameters_routingStepId_idx" ON "routing_step_parameters"("routingStepId");

-- CreateIndex
CREATE UNIQUE INDEX "routing_step_parameters_routingStepId_parameterName_key" ON "routing_step_parameters"("routingStepId", "parameterName");

-- CreateIndex
CREATE INDEX "routings_partId_siteId_routingType_idx" ON "routings"("partId", "siteId", "routingType");

-- CreateIndex
CREATE INDEX "routings_alternateForId_idx" ON "routings"("alternateForId");

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_standardWorkInstructionId_fkey" FOREIGN KEY ("standardWorkInstructionId") REFERENCES "work_instructions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routings" ADD CONSTRAINT "routings_alternateForId_fkey" FOREIGN KEY ("alternateForId") REFERENCES "routings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_steps" ADD CONSTRAINT "routing_steps_workInstructionId_fkey" FOREIGN KEY ("workInstructionId") REFERENCES "work_instructions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_step_parameters" ADD CONSTRAINT "routing_step_parameters_routingStepId_fkey" FOREIGN KEY ("routingStepId") REFERENCES "routing_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data backfill: operationCode/operationName already populated by previous rename migration
-- No backfill needed

-- Add comment explaining the terminology aliases
COMMENT ON COLUMN "operations"."operationCode" IS 'Oracle ERP / Teamcenter PLM terminology (formerly segmentCode)';
COMMENT ON COLUMN "operations"."operationName" IS 'Oracle ERP / Teamcenter PLM terminology (formerly segmentName)';
COMMENT ON COLUMN "operations"."operationClassification" IS 'Oracle-style operation classification (MAKE, ASSEMBLY, INSPECTION, etc.)';
COMMENT ON COLUMN "routings"."routingType" IS 'Oracle ERP-style routing type classification';
COMMENT ON COLUMN "routings"."isPrimaryRoute" IS 'DEPRECATED: Use routingType=PRIMARY instead. Kept for backward compatibility.';
