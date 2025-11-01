-- Migration: 001_create_core_tables.sql
-- Purpose: Create core tables for configuration validation service
-- Version: v2.0
-- Date: 2024-11-01

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- Core Tables
-- ============================================

-- 1. site_extension_configs
-- Tracks which extensions are enabled at each site
CREATE TABLE IF NOT EXISTS site_extension_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL,
  extension_id VARCHAR(64) NOT NULL,
  version VARCHAR(20) NOT NULL,

  -- Configuration tracking
  configuration JSONB NOT NULL,
  config_hash VARCHAR(256) NOT NULL,

  -- Validation status
  validated BOOLEAN NOT NULL DEFAULT TRUE,
  validation_errors JSONB,
  detected_conflicts TEXT[],

  -- Metadata
  enabled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT unique_site_extension UNIQUE (site_id, extension_id),
  CONSTRAINT unique_config_hash UNIQUE (config_hash)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_site_ext_configs_site_id
  ON site_extension_configs(site_id);

CREATE INDEX IF NOT EXISTS idx_site_ext_configs_extension_id
  ON site_extension_configs(extension_id);

CREATE INDEX IF NOT EXISTS idx_site_ext_configs_config_hash
  ON site_extension_configs(config_hash);

CREATE INDEX IF NOT EXISTS idx_site_ext_configs_validated
  ON site_extension_configs(site_id, validated);


-- 2. compliance_signoffs
-- Audit trail of compliance signoffs
CREATE TABLE IF NOT EXISTS compliance_signoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL,
  extension_id VARCHAR(64) NOT NULL,

  -- Signoff details
  aspect VARCHAR(128) NOT NULL,
  signed_by UUID NOT NULL,
  signed_role VARCHAR(32) NOT NULL,
  signed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Configuration reference
  config_hash VARCHAR(256) NOT NULL,
  config_version INT DEFAULT 1,

  -- Notes and metadata
  notes TEXT,
  metadata JSONB,

  -- Constraints
  CONSTRAINT fk_signoff_config FOREIGN KEY (site_id, extension_id)
    REFERENCES site_extension_configs(site_id, extension_id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_signoffs_site_id
  ON compliance_signoffs(site_id);

CREATE INDEX IF NOT EXISTS idx_signoffs_site_ext
  ON compliance_signoffs(site_id, extension_id);

CREATE INDEX IF NOT EXISTS idx_signoffs_signed_at
  ON compliance_signoffs(signed_at DESC);

CREATE INDEX IF NOT EXISTS idx_signoffs_signed_by
  ON compliance_signoffs(signed_by);

CREATE INDEX IF NOT EXISTS idx_signoffs_config_hash
  ON compliance_signoffs(config_hash);

CREATE INDEX IF NOT EXISTS idx_signoffs_aspect
  ON compliance_signoffs(site_id, extension_id, aspect);


-- 3. configuration_audit_log
-- Complete audit trail of all changes
CREATE TABLE IF NOT EXISTS configuration_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL,
  extension_id VARCHAR(64) NOT NULL,

  -- Action tracking
  action VARCHAR(32) NOT NULL,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Configuration hashes
  old_config_hash VARCHAR(256),
  new_config_hash VARCHAR(256),

  -- Reason and details
  reason TEXT,
  details JSONB,

  -- Constraint for valid actions
  CONSTRAINT valid_action CHECK (action IN ('activated', 'deactivated', 'reconfigured', 'signoff'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_site_id
  ON configuration_audit_log(site_id);

CREATE INDEX IF NOT EXISTS idx_audit_extension_id
  ON configuration_audit_log(extension_id);

CREATE INDEX IF NOT EXISTS idx_audit_site_ext
  ON configuration_audit_log(site_id, extension_id);

CREATE INDEX IF NOT EXISTS idx_audit_changed_at
  ON configuration_audit_log(changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_changed_by
  ON configuration_audit_log(changed_by);

CREATE INDEX IF NOT EXISTS idx_audit_action
  ON configuration_audit_log(action);


-- ============================================
-- Utility Functions
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_site_ext_configs_updated_at
BEFORE UPDATE ON site_extension_configs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Migration Metadata
-- ============================================

CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  version VARCHAR(20) NOT NULL UNIQUE,
  description TEXT,
  installed_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Record this migration
INSERT INTO schema_migrations (version, description)
VALUES ('001', 'Create core tables for configuration validation service')
ON CONFLICT (version) DO NOTHING;
