-- CreateEnum QMSDocumentType
CREATE TYPE "QMSDocumentType" AS ENUM ('QUALITY_MANUAL', 'PROCEDURE', 'QMS_WORK_INSTRUCTION', 'FORM', 'SPECIFICATION', 'PLAN', 'RECORD', 'EXTERNAL');

-- CreateEnum QMSDocumentStatus
CREATE TYPE "QMSDocumentStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'ACTIVE', 'OBSOLETE', 'ARCHIVED');

-- CreateEnum CourseType
CREATE TYPE "CourseType" AS ENUM ('CLASSROOM', 'ONLINE', 'ON_THE_JOB', 'EXTERNAL', 'CERTIFICATION');

-- CreateEnum QuestionType
CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY');

-- CreateTable ControlledDocument
CREATE TABLE "controlled_documents" (
    "id" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "documentType" "QMSDocumentType" NOT NULL,
    "category" TEXT,
    "revision" TEXT NOT NULL DEFAULT 'A',
    "revisionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveDate" TIMESTAMP(3),
    "status" "QMSDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "reviewFrequency" INTEGER,
    "nextReviewDate" TIMESTAMP(3),
    "lastReviewDate" TIMESTAMP(3),
    "isControlled" BOOLEAN NOT NULL DEFAULT true,
    "parentDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "controlled_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable DocumentApproval
CREATE TABLE "document_approvals" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "approverRole" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable TrainingCourse
CREATE TABLE "training_courses" (
    "id" TEXT NOT NULL,
    "courseNumber" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "description" TEXT,
    "objectives" TEXT,
    "duration" INTEGER,
    "courseType" "CourseType" NOT NULL,
    "materials" TEXT,
    "requiredForRoles" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "training_courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable CompetencyTest
CREATE TABLE "competency_tests" (
    "id" TEXT NOT NULL,
    "trainingCourseId" TEXT NOT NULL,
    "testName" TEXT NOT NULL,
    "passingScore" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competency_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable TestQuestion
CREATE TABLE "test_questions" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "questionType" "QuestionType" NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "possibleAnswers" TEXT[],
    "points" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable TrainingRecord
CREATE TABLE "training_records" (
    "id" TEXT NOT NULL,
    "trainingCourseId" TEXT NOT NULL,
    "traineeId" TEXT NOT NULL,
    "instructorId" TEXT,
    "trainingDate" TIMESTAMP(3) NOT NULL,
    "completionDate" TIMESTAMP(3),
    "testScore" INTEGER,
    "passed" BOOLEAN,
    "certificationDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "effectivenessScore" INTEGER,
    "effectivenessNotes" TEXT,
    "certificateUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex ControlledDocument indexes
CREATE UNIQUE INDEX "controlled_documents_documentNumber_key" ON "controlled_documents"("documentNumber");
CREATE INDEX "controlled_documents_documentNumber_idx" ON "controlled_documents"("documentNumber");
CREATE INDEX "controlled_documents_documentType_idx" ON "controlled_documents"("documentType");
CREATE INDEX "controlled_documents_status_idx" ON "controlled_documents"("status");
CREATE INDEX "controlled_documents_approvedById_idx" ON "controlled_documents"("approvedById");
CREATE INDEX "controlled_documents_reviewFrequency_idx" ON "controlled_documents"("reviewFrequency");
CREATE INDEX "controlled_documents_nextReviewDate_idx" ON "controlled_documents"("nextReviewDate");

-- CreateIndex DocumentApproval indexes
CREATE INDEX "document_approvals_documentId_idx" ON "document_approvals"("documentId");
CREATE INDEX "document_approvals_approverId_idx" ON "document_approvals"("approverId");
CREATE INDEX "document_approvals_status_idx" ON "document_approvals"("status");

-- CreateIndex TrainingCourse indexes
CREATE UNIQUE INDEX "training_courses_courseNumber_key" ON "training_courses"("courseNumber");
CREATE INDEX "training_courses_courseNumber_idx" ON "training_courses"("courseNumber");
CREATE INDEX "training_courses_courseType_idx" ON "training_courses"("courseType");
CREATE INDEX "training_courses_isActive_idx" ON "training_courses"("isActive");

-- CreateIndex CompetencyTest indexes
CREATE UNIQUE INDEX "competency_tests_trainingCourseId_key" ON "competency_tests"("trainingCourseId");
CREATE INDEX "competency_tests_trainingCourseId_idx" ON "competency_tests"("trainingCourseId");

-- CreateIndex TestQuestion indexes
CREATE INDEX "test_questions_testId_idx" ON "test_questions"("testId");

-- CreateIndex TrainingRecord indexes
CREATE INDEX "training_records_trainingCourseId_idx" ON "training_records"("trainingCourseId");
CREATE INDEX "training_records_traineeId_idx" ON "training_records"("traineeId");
CREATE INDEX "training_records_trainingDate_idx" ON "training_records"("trainingDate");
CREATE INDEX "training_records_expirationDate_idx" ON "training_records"("expirationDate");
CREATE INDEX "training_records_passed_idx" ON "training_records"("passed");

-- AddForeignKey ControlledDocument -> User
ALTER TABLE "controlled_documents" ADD CONSTRAINT "controlled_documents_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey ControlledDocument -> User (createdBy)
ALTER TABLE "controlled_documents" ADD CONSTRAINT "controlled_documents_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey ControlledDocument -> ControlledDocument (parent)
ALTER TABLE "controlled_documents" ADD CONSTRAINT "controlled_documents_parentDocumentId_fkey" FOREIGN KEY ("parentDocumentId") REFERENCES "controlled_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey DocumentApproval -> ControlledDocument
ALTER TABLE "document_approvals" ADD CONSTRAINT "document_approvals_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "controlled_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey DocumentApproval -> User
ALTER TABLE "document_approvals" ADD CONSTRAINT "document_approvals_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey TrainingCourse -> User
ALTER TABLE "training_courses" ADD CONSTRAINT "training_courses_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey CompetencyTest -> TrainingCourse
ALTER TABLE "competency_tests" ADD CONSTRAINT "competency_tests_trainingCourseId_fkey" FOREIGN KEY ("trainingCourseId") REFERENCES "training_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey TestQuestion -> CompetencyTest
ALTER TABLE "test_questions" ADD CONSTRAINT "test_questions_testId_fkey" FOREIGN KEY ("testId") REFERENCES "competency_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey TrainingRecord -> TrainingCourse
ALTER TABLE "training_records" ADD CONSTRAINT "training_records_trainingCourseId_fkey" FOREIGN KEY ("trainingCourseId") REFERENCES "training_courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey TrainingRecord -> User (trainee)
ALTER TABLE "training_records" ADD CONSTRAINT "training_records_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey TrainingRecord -> User (instructor)
ALTER TABLE "training_records" ADD CONSTRAINT "training_records_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add junction table for controlled_documents_distributionList (many-to-many)
CREATE TABLE "_ControlledDocumentToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ControlledDocumentToUser_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE INDEX "_ControlledDocumentToUser_B_index" ON "_ControlledDocumentToUser"("B");

ALTER TABLE "_ControlledDocumentToUser" ADD CONSTRAINT "_ControlledDocumentToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "controlled_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_ControlledDocumentToUser" ADD CONSTRAINT "_ControlledDocumentToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add junction table for training_courses_documents (many-to-many)
CREATE TABLE "_ControlledDocumentToTrainingCourse" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ControlledDocumentToTrainingCourse_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE INDEX "_ControlledDocumentToTrainingCourse_B_index" ON "_ControlledDocumentToTrainingCourse"("B");

ALTER TABLE "_ControlledDocumentToTrainingCourse" ADD CONSTRAINT "_ControlledDocumentToTrainingCourse_A_fkey" FOREIGN KEY ("A") REFERENCES "controlled_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_ControlledDocumentToTrainingCourse" ADD CONSTRAINT "_ControlledDocumentToTrainingCourse_B_fkey" FOREIGN KEY ("B") REFERENCES "training_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
