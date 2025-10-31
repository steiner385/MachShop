-- CreateEnum QMSAuditType
CREATE TYPE "QMSAuditType" AS ENUM ('INTERNAL', 'EXTERNAL', 'MANAGEMENT_REVIEW', 'SUPPLIER', 'PRODUCT', 'PROCESS', 'SYSTEM');

-- CreateEnum QMSAuditStatus
CREATE TYPE "QMSAuditStatus" AS ENUM ('PLANNED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED', 'CANCELLED');

-- CreateEnum QMSFindingType
CREATE TYPE "QMSFindingType" AS ENUM ('NONCONFORMANCE', 'OBSERVATION', 'BEST_PRACTICE', 'OPPORTUNITY');

-- CreateEnum QMSFindingSeverity
CREATE TYPE "QMSFindingSeverity" AS ENUM ('CRITICAL', 'MAJOR', 'MINOR', 'OBSERVATION');

-- CreateEnum QMSFindingStatus
CREATE TYPE "QMSFindingStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'VERIFIED', 'CLOSED');

-- CreateEnum QMSCASource
CREATE TYPE "QMSCASource" AS ENUM ('AUDIT_FINDING', 'CUSTOMER_COMPLAINT', 'INTERNAL_PROCESS', 'MANAGEMENT_REVIEW', 'SUPPLIER_ISSUE', 'PRODUCT_ISSUE', 'PREVENTIVE_ACTION');

-- CreateEnum QMSRCAMethod
CREATE TYPE "QMSRCAMethod" AS ENUM ('FIVE_WHY', 'FISHBONE', 'FAULT_TREE', 'PARETO', 'EIGHT_D', 'LOTUS', 'ROOT_CAUSE_ANALYSIS');

-- CreateEnum QMSCAStatus
CREATE TYPE "QMSCAStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'IMPLEMENTED', 'VERIFIED', 'EFFECTIVE', 'CLOSED');

-- CreateEnum QMSChangeType
CREATE TYPE "QMSChangeType" AS ENUM ('DESIGN', 'PROCESS', 'PROCEDURE', 'MATERIAL', 'SUPPLIER', 'EQUIPMENT', 'SYSTEM', 'ORGANIZATIONAL', 'STANDARD');

-- CreateEnum QMSChangeStatus
CREATE TYPE "QMSChangeStatus" AS ENUM ('PROPOSED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'IMPLEMENTED', 'VERIFIED', 'CLOSED');

-- CreateTable InternalAudit
CREATE TABLE "InternalAudit" (
    "id" TEXT NOT NULL,
    "auditNumber" VARCHAR(50) NOT NULL,
    "auditTitle" TEXT NOT NULL,
    "auditType" "QMSAuditType" NOT NULL,
    "auditScope" TEXT,
    "plannedDate" TIMESTAMP(3) NOT NULL,
    "actualDate" TIMESTAMP(3),
    "duration" INTEGER,
    "leadAuditorId" TEXT NOT NULL,
    "auditeeId" TEXT NOT NULL,
    "status" "QMSAuditStatus" NOT NULL DEFAULT 'PLANNED',
    "reportUrl" TEXT,
    "summary" TEXT,
    "closedById" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternalAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable AuditFinding
CREATE TABLE "AuditFinding" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "findingNumber" VARCHAR(50) NOT NULL,
    "findingType" "QMSFindingType" NOT NULL,
    "clause" VARCHAR(50),
    "description" TEXT NOT NULL,
    "objectiveEvidence" TEXT,
    "severity" "QMSFindingSeverity" NOT NULL,
    "correctiveActionId" TEXT,
    "status" "QMSFindingStatus" NOT NULL DEFAULT 'OPEN',
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable CorrectiveAction
CREATE TABLE "CorrectiveAction" (
    "id" TEXT NOT NULL,
    "caNumber" VARCHAR(50) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "source" "QMSCASource" NOT NULL,
    "sourceReference" VARCHAR(100),
    "rootCauseMethod" "QMSRCAMethod" NOT NULL,
    "rootCause" TEXT,
    "correctiveAction" TEXT,
    "preventiveAction" TEXT,
    "assignedToId" TEXT NOT NULL,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "implementedDate" TIMESTAMP(3),
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "isEffective" BOOLEAN,
    "status" "QMSCAStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorrectiveAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable ManagementReview
CREATE TABLE "ManagementReview" (
    "id" TEXT NOT NULL,
    "reviewNumber" VARCHAR(50) NOT NULL,
    "reviewDate" TIMESTAMP(3) NOT NULL,
    "chairpersonId" TEXT NOT NULL,
    "inputsDiscussed" TEXT,
    "decisions" TEXT,
    "resourceNeeds" TEXT,
    "minutes" TEXT,
    "minutesUrl" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagementReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable ManagementReviewAction
CREATE TABLE "ManagementReviewAction" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "actionDescription" TEXT NOT NULL,
    "assignedToId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "completedDate" TIMESTAMP(3),
    "status" VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagementReviewAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable ChangeRequest
CREATE TABLE "ChangeRequest" (
    "id" TEXT NOT NULL,
    "changeNumber" VARCHAR(50) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "changeType" "QMSChangeType" NOT NULL,
    "affectedParts" TEXT[],
    "reason" TEXT,
    "benefits" TEXT,
    "risks" TEXT,
    "impactAssessment" TEXT,
    "customerNotificationRequired" BOOLEAN DEFAULT false,
    "implementationPlan" TEXT,
    "implementationDate" TIMESTAMP(3),
    "status" "QMSChangeStatus" NOT NULL DEFAULT 'PROPOSED',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable _AuditFindingCorrectiveActions
CREATE TABLE "_AuditFindingCorrectiveActions" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "InternalAudit_auditNumber_key" ON "InternalAudit"("auditNumber");

-- CreateIndex
CREATE INDEX "InternalAudit_auditType_idx" ON "InternalAudit"("auditType");

-- CreateIndex
CREATE INDEX "InternalAudit_plannedDate_idx" ON "InternalAudit"("plannedDate");

-- CreateIndex
CREATE INDEX "InternalAudit_status_idx" ON "InternalAudit"("status");

-- CreateIndex
CREATE INDEX "InternalAudit_leadAuditorId_idx" ON "InternalAudit"("leadAuditorId");

-- CreateIndex
CREATE INDEX "InternalAudit_auditeeId_idx" ON "InternalAudit"("auditeeId");

-- CreateIndex
CREATE UNIQUE INDEX "AuditFinding_findingNumber_key" ON "AuditFinding"("findingNumber");

-- CreateIndex
CREATE INDEX "AuditFinding_auditId_idx" ON "AuditFinding"("auditId");

-- CreateIndex
CREATE INDEX "AuditFinding_findingType_idx" ON "AuditFinding"("findingType");

-- CreateIndex
CREATE INDEX "AuditFinding_severity_idx" ON "AuditFinding"("severity");

-- CreateIndex
CREATE INDEX "AuditFinding_status_idx" ON "AuditFinding"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CorrectiveAction_caNumber_key" ON "CorrectiveAction"("caNumber");

-- CreateIndex
CREATE INDEX "CorrectiveAction_source_idx" ON "CorrectiveAction"("source");

-- CreateIndex
CREATE INDEX "CorrectiveAction_assignedToId_idx" ON "CorrectiveAction"("assignedToId");

-- CreateIndex
CREATE INDEX "CorrectiveAction_status_idx" ON "CorrectiveAction"("status");

-- CreateIndex
CREATE INDEX "CorrectiveAction_targetDate_idx" ON "CorrectiveAction"("targetDate");

-- CreateIndex
CREATE UNIQUE INDEX "ManagementReview_reviewNumber_key" ON "ManagementReview"("reviewNumber");

-- CreateIndex
CREATE INDEX "ManagementReview_reviewDate_idx" ON "ManagementReview"("reviewDate");

-- CreateIndex
CREATE INDEX "ManagementReview_chairpersonId_idx" ON "ManagementReview"("chairpersonId");

-- CreateIndex
CREATE INDEX "ManagementReviewAction_reviewId_idx" ON "ManagementReviewAction"("reviewId");

-- CreateIndex
CREATE INDEX "ManagementReviewAction_assignedToId_idx" ON "ManagementReviewAction"("assignedToId");

-- CreateIndex
CREATE INDEX "ManagementReviewAction_status_idx" ON "ManagementReviewAction"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ChangeRequest_changeNumber_key" ON "ChangeRequest"("changeNumber");

-- CreateIndex
CREATE INDEX "ChangeRequest_changeType_idx" ON "ChangeRequest"("changeType");

-- CreateIndex
CREATE INDEX "ChangeRequest_status_idx" ON "ChangeRequest"("status");

-- CreateIndex
CREATE INDEX "ChangeRequest_approvedById_idx" ON "ChangeRequest"("approvedById");

-- CreateIndex
CREATE UNIQUE INDEX "_AuditFindingCorrectiveActions_AB_unique" ON "_AuditFindingCorrectiveActions"("A", "B");

-- CreateIndex
CREATE INDEX "_AuditFindingCorrectiveActions_B_index" ON "_AuditFindingCorrectiveActions"("B");

-- AddForeignKey
ALTER TABLE "InternalAudit" ADD CONSTRAINT "InternalAudit_leadAuditorId_fkey" FOREIGN KEY ("leadAuditorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalAudit" ADD CONSTRAINT "InternalAudit_auditeeId_fkey" FOREIGN KEY ("auditeeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalAudit" ADD CONSTRAINT "InternalAudit_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditFinding" ADD CONSTRAINT "AuditFinding_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "InternalAudit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditFinding" ADD CONSTRAINT "AuditFinding_correctiveActionId_fkey" FOREIGN KEY ("correctiveActionId") REFERENCES "CorrectiveAction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditFinding" ADD CONSTRAINT "AuditFinding_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagementReview" ADD CONSTRAINT "ManagementReview_chairpersonId_fkey" FOREIGN KEY ("chairpersonId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagementReviewAction" ADD CONSTRAINT "ManagementReviewAction_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "ManagementReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagementReviewAction" ADD CONSTRAINT "ManagementReviewAction_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AuditFindingCorrectiveActions" ADD CONSTRAINT "_AuditFindingCorrectiveActions_A_fkey" FOREIGN KEY ("A") REFERENCES "AuditFinding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AuditFindingCorrectiveActions" ADD CONSTRAINT "_AuditFindingCorrectiveActions_B_fkey" FOREIGN KEY ("B") REFERENCES "CorrectiveAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
