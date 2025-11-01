-- Extension Schema Framework Migration (Issue #438)
-- Enables plugins to register custom database entities and fields
-- without modifying the core Prisma schema

-- ============================================================================
-- Extension Schemas Table
-- ============================================================================
-- Tracks all registered extension schemas with their status and validation
CREATE TABLE "extension_schemas" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "pluginId" VARCHAR(255) UNIQUE NOT NULL,
  "version" VARCHAR(50) NOT NULL,
  "schemaDefinition" JSONB NOT NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
  "validationErrors" JSONB,
  "registeredAt" TIMESTAMP DEFAULT NOW(),
  "activatedAt" TIMESTAMP,
  "deactivatedAt" TIMESTAMP,
  "lastError" TEXT,
  "createdBy" VARCHAR(255),
  "updatedBy" VARCHAR(255),
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  CONSTRAINT "extension_schemas_status_check" CHECK ("status" IN ('pending', 'validating', 'active', 'failed'))
);

-- ============================================================================
-- Extension Migrations Table
-- ============================================================================
-- Tracks all executed migrations for schema changes
CREATE TABLE "extension_migrations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "pluginId" VARCHAR(255) NOT NULL,
  "migrationId" VARCHAR(255) NOT NULL,
  "version" VARCHAR(50) NOT NULL,
  "migrationSql" TEXT NOT NULL,
  "rollbackSql" TEXT,
  "checksumSchema" VARCHAR(64),
  "checksumSql" VARCHAR(64),
  "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
  "executionStart" TIMESTAMP,
  "executionEnd" TIMESTAMP,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  CONSTRAINT "extension_migrations_status_check" CHECK ("status" IN ('pending', 'executing', 'executed', 'failed', 'rolled_back')),
  CONSTRAINT "extension_migrations_unique" UNIQUE("pluginId", "migrationId")
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================
CREATE INDEX "idx_extension_schemas_status" ON "extension_schemas"("status");
CREATE INDEX "idx_extension_schemas_pluginId" ON "extension_schemas"("pluginId");
CREATE INDEX "idx_extension_migrations_plugin_status" ON "extension_migrations"("pluginId", "status");
CREATE INDEX "idx_extension_migrations_created" ON "extension_migrations"("createdAt");
CREATE INDEX "idx_extension_migrations_status" ON "extension_migrations"("status");

-- ============================================================================
-- Extension Schema Conflicts Table
-- ============================================================================
-- Tracks potential conflicts between extension schemas
CREATE TABLE "extension_schema_conflicts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "plugin1Id" VARCHAR(255) NOT NULL,
  "plugin2Id" VARCHAR(255) NOT NULL,
  "conflictType" VARCHAR(100) NOT NULL,
  "item1" VARCHAR(255),
  "item2" VARCHAR(255),
  "message" TEXT NOT NULL,
  "severity" VARCHAR(50) NOT NULL DEFAULT 'warning',
  "resolved" BOOLEAN DEFAULT FALSE,
  "resolvedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  CONSTRAINT "extension_schema_conflicts_severity_check" CHECK ("severity" IN ('warning', 'error'))
);

CREATE INDEX "idx_extension_schema_conflicts_plugins" ON "extension_schema_conflicts"("plugin1Id", "plugin2Id");
CREATE INDEX "idx_extension_schema_conflicts_resolved" ON "extension_schema_conflicts"("resolved");

-- ============================================================================
-- Extension Schema Audit Log
-- ============================================================================
-- Tracks all changes to extension schemas for audit and debugging
CREATE TABLE "extension_schema_audit_log" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "pluginId" VARCHAR(255) NOT NULL,
  "action" VARCHAR(100) NOT NULL,
  "changes" JSONB,
  "errorDetails" TEXT,
  "performedBy" VARCHAR(255),
  "ipAddress" VARCHAR(45),
  "userAgent" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX "idx_extension_schema_audit_log_plugin" ON "extension_schema_audit_log"("pluginId");
CREATE INDEX "idx_extension_schema_audit_log_action" ON "extension_schema_audit_log"("action");
CREATE INDEX "idx_extension_schema_audit_log_created" ON "extension_schema_audit_log"("createdAt");

-- ============================================================================
-- Extension Table Metadata
-- ============================================================================
-- Tracks metadata about dynamically created extension tables
CREATE TABLE "extension_table_metadata" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "pluginId" VARCHAR(255) NOT NULL,
  "tableName" VARCHAR(255) NOT NULL,
  "displayName" VARCHAR(255),
  "description" TEXT,
  "namespace" VARCHAR(255) NOT NULL,
  "fieldCount" INT DEFAULT 0,
  "indexCount" INT DEFAULT 0,
  "estimatedRows" BIGINT DEFAULT 0,
  "estimatedSize" BIGINT DEFAULT 0,
  "lastAnalyzedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  CONSTRAINT "extension_table_metadata_unique" UNIQUE("pluginId", "tableName")
);

CREATE INDEX "idx_extension_table_metadata_plugin" ON "extension_table_metadata"("pluginId");
CREATE INDEX "idx_extension_table_metadata_namespace" ON "extension_table_metadata"("namespace");

-- ============================================================================
-- Extension Schema Version History
-- ============================================================================
-- Maintains complete version history of extension schemas
CREATE TABLE "extension_schema_versions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "pluginId" VARCHAR(255) NOT NULL,
  "version" VARCHAR(50) NOT NULL,
  "schemaDefinition" JSONB NOT NULL,
  "changesSummary" TEXT,
  "migrationsRequired" JSONB,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  CONSTRAINT "extension_schema_versions_unique" UNIQUE("pluginId", "version")
);

CREATE INDEX "idx_extension_schema_versions_plugin" ON "extension_schema_versions"("pluginId");
CREATE INDEX "idx_extension_schema_versions_created" ON "extension_schema_versions"("createdAt");
