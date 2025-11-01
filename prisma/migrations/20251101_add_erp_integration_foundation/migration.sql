-- Create ERP Integration Foundation Schema

-- Enums
CREATE TYPE "ERPSystemType" AS ENUM ('IMPACT', 'SAP', 'ORACLE', 'JD_EDWARDS', 'MICROSOFT_DYNAMICS', 'INFOR', 'EPICOR', 'QAD', 'GENERIC');
CREATE TYPE "ERPAuthMethod" AS ENUM ('BASIC', 'OAUTH2', 'API_KEY', 'CERTIFICATE', 'SAML', 'NONE');
CREATE TYPE "ERPFileFormat" AS ENUM ('CSV', 'XML', 'JSON', 'EDI', 'FIXED_WIDTH');
CREATE TYPE "ERPSyncDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'BIDIRECTIONAL');
CREATE TYPE "ERPSyncStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'RETRYING', 'RECONCILED');
CREATE TYPE "ERPSyncTxnType" AS ENUM ('SUPPLIER_SYNC', 'PART_SYNC', 'WORK_ORDER_SYNC', 'PO_CREATE', 'PO_UPDATE', 'PO_STATUS_SYNC', 'PO_RECEIPT', 'INVENTORY_TRANSACTION', 'COST_POSTING', 'SHIPMENT_NOTIFICATION', 'INVOICE_RECEIPT', 'SUPPLIER_INVOICE');
CREATE TYPE "ERPReconciliationType" AS ENUM ('SUPPLIER_RECONCILIATION', 'PO_RECONCILIATION', 'INVENTORY_RECONCILIATION', 'WORK_ORDER_STATUS_RECONCILIATION', 'COST_RECONCILIATION', 'INVOICE_RECONCILIATION');
CREATE TYPE "ERPReconciliationStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED_CLEAN', 'COMPLETED_WITH_DISCREPANCIES', 'FAILED');

-- ERP Integration Configuration Table
CREATE TABLE "erp_integrations" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "erpSystem" "ERPSystemType" NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "description" TEXT,

  -- Connection details
  "apiEndpoint" TEXT,
  "apiVersion" TEXT,
  "authMethod" "ERPAuthMethod" NOT NULL DEFAULT 'BASIC',
  "apiUsername" TEXT,
  "apiPassword" TEXT,
  "apiToken" TEXT,
  "clientId" TEXT,
  "clientSecret" TEXT,
  "certificatePath" TEXT,

  -- File-based integration
  "fileIntegrationEnabled" BOOLEAN NOT NULL DEFAULT false,
  "inboundFolder" TEXT,
  "outboundFolder" TEXT,
  "archiveFolder" TEXT,
  "fileFormat" "ERPFileFormat",

  -- Database integration
  "dbIntegrationEnabled" BOOLEAN NOT NULL DEFAULT false,
  "dbConnectionString" TEXT,
  "dbType" TEXT,

  -- Middleware integration
  "middlewareEnabled" BOOLEAN NOT NULL DEFAULT false,
  "middlewareType" TEXT,
  "middlewareEndpoint" TEXT,

  -- Sync configuration
  "syncSchedule" JSONB DEFAULT '{}',
  "retryPolicy" JSONB DEFAULT '{"maxRetries": 3, "backoffSeconds": 60, "maxBackoffSeconds": 3600}',

  -- Status monitoring
  "connectionStatus" TEXT NOT NULL DEFAULT 'NOT_TESTED',
  "lastConnectionCheckAt" TIMESTAMP(3),
  "lastConnectionError" TEXT,

  -- Metadata
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" TEXT,
  "updatedBy" TEXT
);

CREATE INDEX "erp_integrations_erpSystem_idx" ON "erp_integrations"("erpSystem");
CREATE INDEX "erp_integrations_enabled_idx" ON "erp_integrations"("enabled");
CREATE INDEX "erp_integrations_createdAt_idx" ON "erp_integrations"("createdAt");

-- ERP Field Mapping Table
CREATE TABLE "erp_field_mappings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "erpIntegrationId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "mesField" TEXT NOT NULL,
  "erpField" TEXT NOT NULL,
  "dataType" TEXT NOT NULL,
  "transformation" TEXT,
  "isRequired" BOOLEAN NOT NULL DEFAULT false,
  "defaultValue" TEXT,
  "enumValues" JSONB,

  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" TEXT,

  CONSTRAINT "erp_field_mappings_erpIntegrationId_fkey" FOREIGN KEY ("erpIntegrationId") REFERENCES "erp_integrations"("id") ON DELETE CASCADE,
  UNIQUE("erpIntegrationId", "entityType", "mesField")
);

CREATE INDEX "erp_field_mappings_erpIntegrationId_idx" ON "erp_field_mappings"("erpIntegrationId");
CREATE INDEX "erp_field_mappings_entityType_idx" ON "erp_field_mappings"("entityType");

-- ERP Sync Transactions Table
CREATE TABLE "erp_sync_transactions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "erpIntegrationId" TEXT NOT NULL,
  "transactionType" "ERPSyncTxnType" NOT NULL,
  "direction" "ERPSyncDirection" NOT NULL,
  "status" "ERPSyncStatus" NOT NULL DEFAULT 'PENDING',

  -- Data identification
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "erpEntityId" TEXT,

  -- Payloads
  "mesPayload" JSONB NOT NULL,
  "transformedPayload" JSONB,
  "erpPayload" JSONB,
  "erpResponseCode" TEXT,
  "erpResponseMessage" TEXT,

  -- Timing and retry
  "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "nextRetryAt" TIMESTAMP(3),

  -- Error handling
  "errorMessage" TEXT,
  "errorDetails" JSONB,
  "stackTrace" TEXT,

  -- Reconciliation
  "reconciled" BOOLEAN NOT NULL DEFAULT false,
  "reconciledAt" TIMESTAMP(3),
  "discrepancies" JSONB,

  -- Metadata
  "processedBy" TEXT,
  "source" TEXT,
  "notes" TEXT,

  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "erp_sync_transactions_erpIntegrationId_fkey" FOREIGN KEY ("erpIntegrationId") REFERENCES "erp_integrations"("id") ON DELETE CASCADE
);

CREATE INDEX "erp_sync_transactions_erpIntegrationId_idx" ON "erp_sync_transactions"("erpIntegrationId");
CREATE INDEX "erp_sync_transactions_status_idx" ON "erp_sync_transactions"("status");
CREATE INDEX "erp_sync_transactions_entityType_entityId_idx" ON "erp_sync_transactions"("entityType", "entityId");
CREATE INDEX "erp_sync_transactions_erpEntityId_idx" ON "erp_sync_transactions"("erpEntityId");
CREATE INDEX "erp_sync_transactions_transactionType_idx" ON "erp_sync_transactions"("transactionType");
CREATE INDEX "erp_sync_transactions_initiatedAt_idx" ON "erp_sync_transactions"("initiatedAt");
CREATE INDEX "erp_sync_transactions_nextRetryAt_idx" ON "erp_sync_transactions"("nextRetryAt");

-- ERP Reconciliation Log Table
CREATE TABLE "erp_reconciliation_logs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "erpIntegrationId" TEXT NOT NULL,
  "reconciliationType" "ERPReconciliationType" NOT NULL,
  "status" "ERPReconciliationStatus" NOT NULL DEFAULT 'IN_PROGRESS',

  -- Time period
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "reconciliationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Results
  "mesCount" INTEGER NOT NULL DEFAULT 0,
  "erpCount" INTEGER NOT NULL DEFAULT 0,
  "matchedCount" INTEGER NOT NULL DEFAULT 0,
  "discrepancyCount" INTEGER NOT NULL DEFAULT 0,
  "discrepancies" JSONB,

  -- Summary
  "reconciliationPercent" DOUBLE PRECISION,
  "completedAt" TIMESTAMP(3),
  "errorMessage" TEXT,

  -- Metadata
  "runBy" TEXT,
  "notes" TEXT,

  CONSTRAINT "erp_reconciliation_logs_erpIntegrationId_fkey" FOREIGN KEY ("erpIntegrationId") REFERENCES "erp_integrations"("id") ON DELETE CASCADE
);

CREATE INDEX "erp_reconciliation_logs_erpIntegrationId_idx" ON "erp_reconciliation_logs"("erpIntegrationId");
CREATE INDEX "erp_reconciliation_logs_reconciliationType_idx" ON "erp_reconciliation_logs"("reconciliationType");
CREATE INDEX "erp_reconciliation_logs_reconciliationDate_idx" ON "erp_reconciliation_logs"("reconciliationDate");
CREATE INDEX "erp_reconciliation_logs_status_idx" ON "erp_reconciliation_logs"("status");

-- ERP Supplier Sync Status Table
CREATE TABLE "erp_supplier_syncs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "vendorId" TEXT NOT NULL UNIQUE,
  "erpVendorId" TEXT UNIQUE,
  "erpIntegrationId" TEXT NOT NULL,

  "lastSyncAt" TIMESTAMP(3),
  "lastSyncStatus" TEXT,
  "lastSyncError" TEXT,

  "erpHash" TEXT,
  "mesHash" TEXT,

  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "erp_supplier_syncs_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE CASCADE,
  CONSTRAINT "erp_supplier_syncs_erpIntegrationId_fkey" FOREIGN KEY ("erpIntegrationId") REFERENCES "erp_integrations"("id") ON DELETE CASCADE
);

CREATE INDEX "erp_supplier_syncs_erpIntegrationId_idx" ON "erp_supplier_syncs"("erpIntegrationId");
CREATE INDEX "erp_supplier_syncs_lastSyncAt_idx" ON "erp_supplier_syncs"("lastSyncAt");

-- ERP Purchase Order Sync Status Table
CREATE TABLE "erp_purchase_order_syncs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "purchaseOrderId" TEXT NOT NULL UNIQUE,
  "erpPoNumber" TEXT UNIQUE,
  "erpIntegrationId" TEXT NOT NULL,

  "lastSyncAt" TIMESTAMP(3),
  "lastSyncStatus" TEXT,
  "lastSyncError" TEXT,
  "erpApprovalStatus" TEXT,

  "erpHash" TEXT,
  "mesHash" TEXT,

  "lastReceiptPostedAt" TIMESTAMP(3),
  "quantityReceived" INTEGER NOT NULL DEFAULT 0,
  "quantityInvoiced" INTEGER NOT NULL DEFAULT 0,

  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "erp_purchase_order_syncs_erpIntegrationId_fkey" FOREIGN KEY ("erpIntegrationId") REFERENCES "erp_integrations"("id") ON DELETE CASCADE
);

CREATE INDEX "erp_purchase_order_syncs_erpIntegrationId_idx" ON "erp_purchase_order_syncs"("erpIntegrationId");
CREATE INDEX "erp_purchase_order_syncs_lastSyncAt_idx" ON "erp_purchase_order_syncs"("lastSyncAt");
CREATE INDEX "erp_purchase_order_syncs_erpPoNumber_idx" ON "erp_purchase_order_syncs"("erpPoNumber");

-- ERP Work Order Sync Status Table
CREATE TABLE "erp_work_order_syncs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "workOrderId" TEXT NOT NULL UNIQUE,
  "erpWorkOrderId" TEXT UNIQUE,
  "erpIntegrationId" TEXT NOT NULL,

  "lastStatusSyncAt" TIMESTAMP(3),
  "erpStatus" TEXT,
  "lastStatusError" TEXT,

  "lastCostPostedAt" TIMESTAMP(3),
  "lastCostAmount" DECIMAL(15, 2),
  "lastCostError" TEXT,

  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "erp_work_order_syncs_erpIntegrationId_fkey" FOREIGN KEY ("erpIntegrationId") REFERENCES "erp_integrations"("id") ON DELETE CASCADE
);

CREATE INDEX "erp_work_order_syncs_erpIntegrationId_idx" ON "erp_work_order_syncs"("erpIntegrationId");
CREATE INDEX "erp_work_order_syncs_lastStatusSyncAt_idx" ON "erp_work_order_syncs"("lastStatusSyncAt");
