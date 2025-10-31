-- ============================================================================
-- ✅ GITHUB ISSUE #54: Hierarchical Cause Code System - Phase 1-2
-- ============================================================================

-- Create cause code hierarchy config table
CREATE TABLE "cause_code_hierarchy_configs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "siteId" TEXT,
  "numberOfLevels" INTEGER NOT NULL,
  "levelNames" JSONB NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "cause_code_hierarchy_configs_siteId_key" UNIQUE ("siteId")
);

-- Create cause codes table
CREATE TABLE "cause_codes" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "level" INTEGER NOT NULL,
  "parentCauseCodeId" TEXT,
  "scope" TEXT NOT NULL,
  "siteId" TEXT,
  "status" TEXT NOT NULL,
  "effectiveDate" TIMESTAMP(3),
  "expirationDate" TIMESTAMP(3),
  "capaRequired" BOOLEAN NOT NULL DEFAULT false,
  "notificationRecipients" JSONB,
  "displayOrder" INTEGER,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "cause_codes_parentCauseCodeId_fkey" FOREIGN KEY ("parentCauseCodeId") REFERENCES "cause_codes" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "cause_codes_code_scope_siteId_key" UNIQUE ("code", "scope", "siteId")
);

-- Create indexes for cause_codes
CREATE INDEX "cause_codes_parentCauseCodeId_idx" ON "cause_codes"("parentCauseCodeId");
CREATE INDEX "cause_codes_level_idx" ON "cause_codes"("level");
CREATE INDEX "cause_codes_status_idx" ON "cause_codes"("status");

-- Create cause code history table
CREATE TABLE "cause_code_history" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "causeCodeId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "changeType" TEXT NOT NULL,
  "changedFields" JSONB NOT NULL,
  "changeReason" TEXT,
  "changedBy" TEXT NOT NULL,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cause_code_history_causeCodeId_fkey" FOREIGN KEY ("causeCodeId") REFERENCES "cause_codes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for cause_code_history
CREATE INDEX "cause_code_history_causeCodeId_idx" ON "cause_code_history"("causeCodeId");
CREATE INDEX "cause_code_history_changedAt_idx" ON "cause_code_history"("changedAt");

-- Create NCR cause mapping table
CREATE TABLE "ncr_cause_mappings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ncrId" TEXT NOT NULL,
  "causeCodeId" TEXT NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "attribution" INTEGER,
  "additionalNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ncr_cause_mappings_causeCodeId_fkey" FOREIGN KEY ("causeCodeId") REFERENCES "cause_codes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ncr_cause_mappings_ncrId_causeCodeId_key" UNIQUE ("ncrId", "causeCodeId")
);

-- Create indexes for ncr_cause_mappings
CREATE INDEX "ncr_cause_mappings_ncrId_idx" ON "ncr_cause_mappings"("ncrId");
CREATE INDEX "ncr_cause_mappings_causeCodeId_idx" ON "ncr_cause_mappings"("causeCodeId");
