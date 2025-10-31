-- CreateEnum WorkflowMode
CREATE TYPE "WorkflowMode" AS ENUM ('STRICT', 'FLEXIBLE', 'HYBRID');

-- CreateTable SiteWorkflowConfiguration
CREATE TABLE "site_workflow_configurations" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "mode" "WorkflowMode" NOT NULL DEFAULT 'STRICT',
    "enforceOperationSequence" BOOLEAN NOT NULL DEFAULT true,
    "enforceStatusGating" BOOLEAN NOT NULL DEFAULT true,
    "allowExternalVouching" BOOLEAN NOT NULL DEFAULT false,
    "enforceQualityChecks" BOOLEAN NOT NULL DEFAULT true,
    "requireStartTransition" BOOLEAN NOT NULL DEFAULT true,
    "requireJustification" BOOLEAN NOT NULL DEFAULT false,
    "requireApproval" BOOLEAN NOT NULL DEFAULT false,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "site_workflow_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable RoutingWorkflowConfiguration
CREATE TABLE "routing_workflow_configurations" (
    "id" TEXT NOT NULL,
    "routingId" TEXT NOT NULL,
    "siteConfigId" TEXT NOT NULL,
    "mode" "WorkflowMode",
    "enforceOperationSequence" BOOLEAN,
    "enforceStatusGating" BOOLEAN,
    "allowExternalVouching" BOOLEAN,
    "enforceQualityChecks" BOOLEAN,
    "requireStartTransition" BOOLEAN,
    "requireJustification" BOOLEAN,
    "requireApproval" BOOLEAN,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "routing_workflow_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable WorkOrderWorkflowConfiguration
CREATE TABLE "work_order_workflow_configurations" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "siteConfigId" TEXT NOT NULL,
    "mode" "WorkflowMode",
    "enforceOperationSequence" BOOLEAN,
    "enforceStatusGating" BOOLEAN,
    "allowExternalVouching" BOOLEAN,
    "enforceQualityChecks" BOOLEAN,
    "requireStartTransition" BOOLEAN,
    "requireJustification" BOOLEAN,
    "requireApproval" BOOLEAN,
    "overrideReason" TEXT,
    "approvedBy" TEXT,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "work_order_workflow_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable WorkflowConfigurationHistory
CREATE TABLE "workflow_configuration_histories" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "configType" TEXT NOT NULL,
    "newMode" TEXT,
    "previousMode" TEXT,
    "changedFields" JSONB,
    "changeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "workflow_configuration_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable OperationWorkflowConfiguration
CREATE TABLE "operation_workflow_configurations" (
    "id" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "siteConfigId" TEXT NOT NULL,
    "enforceQualityChecks" BOOLEAN,
    "requireApproval" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operation_workflow_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "site_workflow_configurations_siteId_key" ON "site_workflow_configurations"("siteId");

-- CreateIndex
CREATE INDEX "site_workflow_configurations_siteId_idx" ON "site_workflow_configurations"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "routing_workflow_configurations_routingId_key" ON "routing_workflow_configurations"("routingId");

-- CreateIndex
CREATE INDEX "routing_workflow_configurations_routingId_idx" ON "routing_workflow_configurations"("routingId");

-- CreateIndex
CREATE INDEX "routing_workflow_configurations_siteConfigId_idx" ON "routing_workflow_configurations"("siteConfigId");

-- CreateIndex
CREATE UNIQUE INDEX "work_order_workflow_configurations_workOrderId_key" ON "work_order_workflow_configurations"("workOrderId");

-- CreateIndex
CREATE INDEX "work_order_workflow_configurations_workOrderId_idx" ON "work_order_workflow_configurations"("workOrderId");

-- CreateIndex
CREATE INDEX "work_order_workflow_configurations_siteConfigId_idx" ON "work_order_workflow_configurations"("siteConfigId");

-- CreateIndex
CREATE INDEX "workflow_configuration_histories_configId_idx" ON "workflow_configuration_histories"("configId");

-- CreateIndex
CREATE UNIQUE INDEX "operation_workflow_configurations_operationId_key" ON "operation_workflow_configurations"("operationId");

-- CreateIndex
CREATE INDEX "operation_workflow_configurations_operationId_idx" ON "operation_workflow_configurations"("operationId");

-- CreateIndex
CREATE INDEX "operation_workflow_configurations_siteConfigId_idx" ON "operation_workflow_configurations"("siteConfigId");

-- AddForeignKey
ALTER TABLE "site_workflow_configurations" ADD CONSTRAINT "site_workflow_configurations_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_workflow_configurations" ADD CONSTRAINT "routing_workflow_configurations_routingId_fkey" FOREIGN KEY ("routingId") REFERENCES "routings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_workflow_configurations" ADD CONSTRAINT "routing_workflow_configurations_siteConfigId_fkey" FOREIGN KEY ("siteConfigId") REFERENCES "site_workflow_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_workflow_configurations" ADD CONSTRAINT "work_order_workflow_configurations_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_workflow_configurations" ADD CONSTRAINT "work_order_workflow_configurations_siteConfigId_fkey" FOREIGN KEY ("siteConfigId") REFERENCES "site_workflow_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_workflow_configurations" ADD CONSTRAINT "operation_workflow_configurations_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_workflow_configurations" ADD CONSTRAINT "operation_workflow_configurations_siteConfigId_fkey" FOREIGN KEY ("siteConfigId") REFERENCES "site_workflow_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
