-- AlterEnum
ALTER TYPE "WorkInstructionStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "work_instructions" ADD COLUMN     "approvalHistory" JSONB;
