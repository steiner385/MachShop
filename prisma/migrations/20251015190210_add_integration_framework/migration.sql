-- CreateEnum
CREATE TYPE "IntegrationType" AS ENUM ('ERP', 'PLM', 'CMMS', 'WMS', 'QMS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "IntegrationDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'BIDIRECTIONAL');

-- CreateEnum
CREATE TYPE "IntegrationLogStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUCCESS', 'FAILED', 'PARTIAL', 'TIMEOUT', 'CANCELLED');

-- CreateTable
CREATE TABLE "integration_configs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "type" "IntegrationType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL,
    "lastSync" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "lastError" TEXT,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "totalSyncs" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "syncSchedule" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_logs" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "direction" "IntegrationDirection" NOT NULL,
    "status" "IntegrationLogStatus" NOT NULL,
    "recordCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER NOT NULL,
    "requestData" JSONB,
    "responseData" JSONB,
    "errors" JSONB,
    "details" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "integration_configs_name_key" ON "integration_configs"("name");

-- CreateIndex
CREATE INDEX "integration_configs_name_idx" ON "integration_configs"("name");

-- CreateIndex
CREATE INDEX "integration_configs_type_idx" ON "integration_configs"("type");

-- CreateIndex
CREATE INDEX "integration_configs_enabled_idx" ON "integration_configs"("enabled");

-- CreateIndex
CREATE INDEX "integration_logs_configId_idx" ON "integration_logs"("configId");

-- CreateIndex
CREATE INDEX "integration_logs_status_idx" ON "integration_logs"("status");

-- CreateIndex
CREATE INDEX "integration_logs_startedAt_idx" ON "integration_logs"("startedAt");

-- CreateIndex
CREATE INDEX "integration_logs_operation_idx" ON "integration_logs"("operation");

-- AddForeignKey
ALTER TABLE "integration_logs" ADD CONSTRAINT "integration_logs_configId_fkey" FOREIGN KEY ("configId") REFERENCES "integration_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
