-- CreateEnum
CREATE TYPE "HookType" AS ENUM ('WORKFLOW', 'UI', 'DATA', 'INTEGRATION', 'NOTIFICATION');

-- CreateEnum
CREATE TYPE "PluginStatus" AS ENUM ('PENDING_APPROVAL', 'INSTALLED', 'ACTIVE', 'DISABLED', 'FAILED', 'UNINSTALLED');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('STARTED', 'COMPLETED', 'FAILED', 'TIMEOUT', 'REJECTED');

-- CreateTable
CREATE TABLE "plugins" (
    "id" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT,
    "author" TEXT,
    "manifest" JSONB NOT NULL,
    "status" "PluginStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "installedBy" TEXT NOT NULL,
    "latestVersion" TEXT,
    "updateAvailable" BOOLEAN NOT NULL DEFAULT false,
    "configuration" JSONB,
    "packageUrl" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "dependencies" JSONB,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "siteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plugins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plugin_hooks" (
    "id" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,
    "hookType" "HookType" NOT NULL,
    "hookPoint" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "isAsync" BOOLEAN NOT NULL DEFAULT false,
    "timeout" INTEGER NOT NULL DEFAULT 5000,
    "handlerFunction" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastExecutedAt" TIMESTAMP(3),
    "executionCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plugin_hooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plugin_executions" (
    "id" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,
    "hookPoint" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "status" "ExecutionStatus" NOT NULL,
    "errorMessage" TEXT,
    "errorStack" TEXT,
    "inputData" JSONB,
    "outputData" JSONB,
    "userId" TEXT,
    "requestId" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plugin_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plugin_configurations" (
    "id" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "changedBy" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "siteId" TEXT,
    "companyId" TEXT,

    CONSTRAINT "plugin_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plugin_events" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceUserId" TEXT,
    "sourceRequestId" TEXT,
    "subscribers" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plugin_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plugin_webhooks" (
    "id" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "webhookUrl" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "retryBackoff" INTEGER NOT NULL DEFAULT 1000,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggeredAt" TIMESTAMP(3),
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "failedDeliveries" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plugin_webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plugins_pluginId_key" ON "plugins"("pluginId");

-- CreateIndex
CREATE INDEX "plugins_pluginId_idx" ON "plugins"("pluginId");

-- CreateIndex
CREATE INDEX "plugins_status_idx" ON "plugins"("status");

-- CreateIndex
CREATE INDEX "plugins_isActive_idx" ON "plugins"("isActive");

-- CreateIndex
CREATE INDEX "plugins_siteId_idx" ON "plugins"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "plugin_hooks_pluginId_hookPoint_key" ON "plugin_hooks"("pluginId", "hookPoint");

-- CreateIndex
CREATE INDEX "plugin_hooks_hookType_idx" ON "plugin_hooks"("hookType");

-- CreateIndex
CREATE INDEX "plugin_hooks_hookPoint_idx" ON "plugin_hooks"("hookPoint");

-- CreateIndex
CREATE INDEX "plugin_hooks_priority_idx" ON "plugin_hooks"("priority");

-- CreateIndex
CREATE INDEX "plugin_executions_pluginId_idx" ON "plugin_executions"("pluginId");

-- CreateIndex
CREATE INDEX "plugin_executions_hookPoint_idx" ON "plugin_executions"("hookPoint");

-- CreateIndex
CREATE INDEX "plugin_executions_status_idx" ON "plugin_executions"("status");

-- CreateIndex
CREATE INDEX "plugin_executions_startedAt_idx" ON "plugin_executions"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "plugin_configurations_pluginId_key_siteId_key" ON "plugin_configurations"("pluginId", "key", "siteId");

-- CreateIndex
CREATE INDEX "plugin_configurations_pluginId_idx" ON "plugin_configurations"("pluginId");

-- CreateIndex
CREATE INDEX "plugin_configurations_siteId_idx" ON "plugin_configurations"("siteId");

-- CreateIndex
CREATE INDEX "plugin_events_eventType_idx" ON "plugin_events"("eventType");

-- CreateIndex
CREATE INDEX "plugin_events_timestamp_idx" ON "plugin_events"("timestamp");

-- CreateIndex
CREATE INDEX "plugin_webhooks_pluginId_idx" ON "plugin_webhooks"("pluginId");

-- CreateIndex
CREATE INDEX "plugin_webhooks_eventType_idx" ON "plugin_webhooks"("eventType");

-- CreateIndex
CREATE INDEX "plugin_webhooks_isActive_idx" ON "plugin_webhooks"("isActive");

-- AddForeignKey
ALTER TABLE "plugins" ADD CONSTRAINT "plugins_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plugins" ADD CONSTRAINT "plugins_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plugin_hooks" ADD CONSTRAINT "plugin_hooks_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "plugins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plugin_executions" ADD CONSTRAINT "plugin_executions_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "plugins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plugin_configurations" ADD CONSTRAINT "plugin_configurations_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "plugins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
