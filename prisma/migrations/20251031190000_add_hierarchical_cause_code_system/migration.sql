-- CreateTable CauseCodeCategory
CREATE TABLE "cause_code_categories" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "cause_code_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable CauseCode
CREATE TABLE "cause_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "categoryId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "level" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "cause_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable CauseCodeHistory
CREATE TABLE "cause_code_history" (
    "id" TEXT NOT NULL,
    "causeCodeId" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changeReason" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedBy" TEXT NOT NULL,

    CONSTRAINT "cause_code_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cause_code_categories_code_key" ON "cause_code_categories"("code");

-- CreateIndex
CREATE INDEX "cause_code_categories_parentId_idx" ON "cause_code_categories"("parentId");

-- CreateIndex
CREATE INDEX "cause_code_categories_enabled_idx" ON "cause_code_categories"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "cause_codes_code_key" ON "cause_codes"("code");

-- CreateIndex
CREATE INDEX "cause_codes_categoryId_idx" ON "cause_codes"("categoryId");

-- CreateIndex
CREATE INDEX "cause_codes_parentId_idx" ON "cause_codes"("parentId");

-- CreateIndex
CREATE INDEX "cause_codes_level_idx" ON "cause_codes"("level");

-- CreateIndex
CREATE INDEX "cause_codes_enabled_idx" ON "cause_codes"("enabled");

-- CreateIndex
CREATE INDEX "cause_code_history_causeCodeId_idx" ON "cause_code_history"("causeCodeId");

-- CreateIndex
CREATE INDEX "cause_code_history_changedAt_idx" ON "cause_code_history"("changedAt");

-- AddForeignKey
ALTER TABLE "cause_code_categories" ADD CONSTRAINT "cause_code_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "cause_code_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cause_codes" ADD CONSTRAINT "cause_codes_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "cause_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cause_codes" ADD CONSTRAINT "cause_codes_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "cause_code_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cause_code_history" ADD CONSTRAINT "cause_code_history_causeCodeId_fkey" FOREIGN KEY ("causeCodeId") REFERENCES "cause_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable NCR - Add rootCauseId and create relationship
ALTER TABLE "ncrs" ADD COLUMN "rootCauseId" TEXT;

-- AddForeignKey
ALTER TABLE "ncrs" ADD CONSTRAINT "ncrs_rootCauseId_fkey" FOREIGN KEY ("rootCauseId") REFERENCES "cause_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddIndex
CREATE INDEX "ncrs_rootCauseId_idx" ON "ncrs"("rootCauseId");
