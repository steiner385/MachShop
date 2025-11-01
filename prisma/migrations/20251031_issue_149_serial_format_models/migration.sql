-- CreateTable serial_number_format_configs
CREATE TABLE "serial_number_format_configs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "patternTemplate" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "validationRules" TEXT,
    "sequentialCounterStart" INTEGER NOT NULL DEFAULT 1,
    "sequentialCounterIncrement" INTEGER NOT NULL DEFAULT 1,
    "counterResetRule" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "serial_number_format_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable serial_format_part_assignments
CREATE TABLE "serial_format_part_assignments" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "formatConfigId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "serial_format_part_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable serial_format_part_family_assignments
CREATE TABLE "serial_format_part_family_assignments" (
    "id" TEXT NOT NULL,
    "partFamilyId" TEXT NOT NULL,
    "formatConfigId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "serial_format_part_family_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable serial_number_usage_tracking
CREATE TABLE "serial_number_usage_tracking" (
    "id" TEXT NOT NULL,
    "formatConfigId" TEXT NOT NULL,
    "currentSequenceValue" INTEGER NOT NULL DEFAULT 1,
    "lastGeneratedDate" TIMESTAMP(3),
    "counterResetDate" TIMESTAMP(3),
    "totalGenerated" INTEGER NOT NULL DEFAULT 0,
    "totalUsed" INTEGER NOT NULL DEFAULT 0,
    "duplicateAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastUpdateTimestamp" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "serial_number_usage_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "serial_number_format_configs_siteId_name_key" ON "serial_number_format_configs"("siteId", "name");

-- CreateIndex
CREATE INDEX "serial_number_format_configs_siteId_idx" ON "serial_number_format_configs"("siteId");

-- CreateIndex
CREATE INDEX "serial_number_format_configs_isActive_idx" ON "serial_number_format_configs"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "serial_format_part_assignments_partId_formatConfigId_key" ON "serial_format_part_assignments"("partId", "formatConfigId");

-- CreateIndex
CREATE INDEX "serial_format_part_assignments_partId_idx" ON "serial_format_part_assignments"("partId");

-- CreateIndex
CREATE INDEX "serial_format_part_assignments_formatConfigId_idx" ON "serial_format_part_assignments"("formatConfigId");

-- CreateIndex
CREATE INDEX "serial_format_part_assignments_priority_idx" ON "serial_format_part_assignments"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "serial_format_part_family_assignments_partFamilyId_formatConfigId_key" ON "serial_format_part_family_assignments"("partFamilyId", "formatConfigId");

-- CreateIndex
CREATE INDEX "serial_format_part_family_assignments_partFamilyId_idx" ON "serial_format_part_family_assignments"("partFamilyId");

-- CreateIndex
CREATE INDEX "serial_format_part_family_assignments_formatConfigId_idx" ON "serial_format_part_family_assignments"("formatConfigId");

-- CreateIndex
CREATE INDEX "serial_format_part_family_assignments_priority_idx" ON "serial_format_part_family_assignments"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "serial_number_usage_tracking_formatConfigId_key" ON "serial_number_usage_tracking"("formatConfigId");

-- CreateIndex
CREATE INDEX "serial_number_usage_tracking_formatConfigId_idx" ON "serial_number_usage_tracking"("formatConfigId");

-- AddForeignKey
ALTER TABLE "serial_number_format_configs" ADD CONSTRAINT "serial_number_format_configs_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serial_format_part_assignments" ADD CONSTRAINT "serial_format_part_assignments_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serial_format_part_assignments" ADD CONSTRAINT "serial_format_part_assignments_formatConfigId_fkey" FOREIGN KEY ("formatConfigId") REFERENCES "serial_number_format_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serial_format_part_family_assignments" ADD CONSTRAINT "serial_format_part_family_assignments_formatConfigId_fkey" FOREIGN KEY ("formatConfigId") REFERENCES "serial_number_format_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serial_number_usage_tracking" ADD CONSTRAINT "serial_number_usage_tracking_formatConfigId_fkey" FOREIGN KEY ("formatConfigId") REFERENCES "serial_number_format_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
