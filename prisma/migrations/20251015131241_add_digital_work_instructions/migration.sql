-- CreateEnum
CREATE TYPE "WorkInstructionStatus" AS ENUM ('DRAFT', 'REVIEW', 'APPROVED', 'SUPERSEDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WorkInstructionExecutionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'PAUSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "work_instructions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "partId" TEXT,
    "operationId" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "status" "WorkInstructionStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveDate" TIMESTAMP(3),
    "supersededDate" TIMESTAMP(3),
    "ecoNumber" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_instructions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_instruction_steps" (
    "id" TEXT NOT NULL,
    "workInstructionId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrls" TEXT[],
    "videoUrls" TEXT[],
    "attachmentUrls" TEXT[],
    "estimatedDuration" INTEGER,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "requiresSignature" BOOLEAN NOT NULL DEFAULT false,
    "dataEntryFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_instruction_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_instruction_executions" (
    "id" TEXT NOT NULL,
    "workInstructionId" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "operationId" TEXT,
    "operatorId" TEXT NOT NULL,
    "currentStepNumber" INTEGER NOT NULL DEFAULT 1,
    "status" "WorkInstructionExecutionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_instruction_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_instruction_step_executions" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dataEntered" JSONB,
    "notes" TEXT,
    "signedById" TEXT,
    "signedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_instruction_step_executions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_instructions_status_idx" ON "work_instructions"("status");

-- CreateIndex
CREATE INDEX "work_instructions_partId_idx" ON "work_instructions"("partId");

-- CreateIndex
CREATE INDEX "work_instruction_steps_workInstructionId_idx" ON "work_instruction_steps"("workInstructionId");

-- CreateIndex
CREATE UNIQUE INDEX "work_instruction_steps_workInstructionId_stepNumber_key" ON "work_instruction_steps"("workInstructionId", "stepNumber");

-- CreateIndex
CREATE INDEX "work_instruction_executions_workOrderId_idx" ON "work_instruction_executions"("workOrderId");

-- CreateIndex
CREATE INDEX "work_instruction_executions_operatorId_idx" ON "work_instruction_executions"("operatorId");

-- CreateIndex
CREATE INDEX "work_instruction_step_executions_executionId_idx" ON "work_instruction_step_executions"("executionId");

-- CreateIndex
CREATE UNIQUE INDEX "work_instruction_step_executions_executionId_stepNumber_key" ON "work_instruction_step_executions"("executionId", "stepNumber");

-- AddForeignKey
ALTER TABLE "work_instructions" ADD CONSTRAINT "work_instructions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_instructions" ADD CONSTRAINT "work_instructions_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_instructions" ADD CONSTRAINT "work_instructions_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_instruction_steps" ADD CONSTRAINT "work_instruction_steps_workInstructionId_fkey" FOREIGN KEY ("workInstructionId") REFERENCES "work_instructions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_instruction_executions" ADD CONSTRAINT "work_instruction_executions_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_instruction_step_executions" ADD CONSTRAINT "work_instruction_step_executions_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "work_instruction_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_instruction_step_executions" ADD CONSTRAINT "work_instruction_step_executions_signedById_fkey" FOREIGN KEY ("signedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
