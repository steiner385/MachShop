-- Migration: 002_create_support_tables.sql
-- Purpose: Create support tables for caching and conflict tracking
-- Version: v2.0
-- Date: 2024-11-01

-- ============================================
-- Support Tables
-- ============================================

-- 1. extension_dependency_cache
-- Cache resolved dependencies for each extension at each site
CREATE TABLE IF NOT EXISTS extension_dependency_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL,
  extension_id VARCHAR(64) NOT NULL,

  -- Dependency details
  dependency_type VARCHAR(20) NOT NULL, -- 'extension' or 'capability'
  dependency_id VARCHAR(128) NOT NULL,  -- extension ID or capability name
  min_version VARCHAR(20),
  resolved_version VARCHAR(20),
  resolved_provider VARCHAR(64),        -- actual provider ID if capability

  -- Status
  satisfied BOOLEAN NOT NULL,
  reason TEXT,

  -- Metadata
  cached_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,

  -- Constraints
  CONSTRAINT fk_dep_cache_config FOREIGN KEY (site_id, extension_id)
    REFERENCES site_extension_configs(site_id, extension_id) ON DELETE CASCADE,
  CONSTRAINT valid_dep_type CHECK (dependency_type IN ('extension', 'capability'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_dep_cache_site_ext
  ON extension_dependency_cache(site_id, extension_id);

CREATE INDEX IF NOT EXISTS idx_dep_cache_dependency
  ON extension_dependency_cache(dependency_id);

CREATE INDEX IF NOT EXISTS idx_dep_cache_expires_at
  ON extension_dependency_cache(expires_at)
  WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dep_cache_unsatisfied
  ON extension_dependency_cache(site_id, satisfied)
  WHERE NOT satisfied;


-- 2. extension_conflicts_detected
-- Tracks detected conflicts between extensions
CREATE TABLE IF NOT EXISTS extension_conflicts_detected (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL,
  extension_id_1 VARCHAR(64) NOT NULL,
  extension_id_2 VARCHAR(64) NOT NULL,

  -- Conflict details
  conflict_type VARCHAR(32) NOT NULL, -- 'explicit', 'policy', 'dependency'
  scope VARCHAR(32),                  -- 'global', 'capability', 'resource'
  capability VARCHAR(128),
  resource VARCHAR(128),
  policy_1 VARCHAR(128),
  policy_2 VARCHAR(128),

  -- Severity and reason
  severity VARCHAR(16) NOT NULL DEFAULT 'warning',
  reason TEXT NOT NULL,

  -- Metadata
  detected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  resolution_notes TEXT,

  -- Constraints
  CONSTRAINT valid_conflict_type CHECK (conflict_type IN ('explicit', 'policy', 'dependency')),
  CONSTRAINT valid_severity CHECK (severity IN ('error', 'warning'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_conflicts_site
  ON extension_conflicts_detected(site_id);

CREATE INDEX IF NOT EXISTS idx_conflicts_extensions
  ON extension_conflicts_detected(extension_id_1, extension_id_2);

CREATE INDEX IF NOT EXISTS idx_conflicts_unresolved
  ON extension_conflicts_detected(site_id, resolved_at)
  WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conflicts_type
  ON extension_conflicts_detected(conflict_type);

CREATE INDEX IF NOT EXISTS idx_conflicts_detected_at
  ON extension_conflicts_detected(detected_at DESC);


-- 3. configuration_snapshots
-- Periodic snapshots for disaster recovery and audits
CREATE TABLE IF NOT EXISTS configuration_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL,
  snapshot_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Configuration data
  configurations JSONB NOT NULL,
  signoffs JSONB NOT NULL,
  summary JSONB,

  -- Metadata
  reason VARCHAR(128),
  created_by UUID,
  size_bytes INT,

  -- Constraints
  -- Assumes sites table exists
  CONSTRAINT valid_snapshot_data CHECK (
    jsonb_typeof(configurations) = 'array' AND
    jsonb_typeof(signoffs) = 'array'
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_snapshots_site_at
  ON configuration_snapshots(site_id, snapshot_at DESC);

CREATE INDEX IF NOT EXISTS idx_snapshots_reason
  ON configuration_snapshots(reason);

CREATE INDEX IF NOT EXISTS idx_snapshots_created_by
  ON configuration_snapshots(created_by)
  WHERE created_by IS NOT NULL;


-- ============================================
-- Cleanup Functions
-- ============================================

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_dependency_cache()
RETURNS TABLE(cleaned_count INT) AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM extension_dependency_cache
  WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN QUERY SELECT deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to create a configuration snapshot
CREATE OR REPLACE FUNCTION create_config_snapshot(
  p_site_id UUID,
  p_reason VARCHAR,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_snapshot_id UUID;
  v_configurations JSONB;
  v_signoffs JSONB;
  v_summary JSONB;
  v_size INT;
BEGIN
  -- Collect configurations
  SELECT jsonb_agg(
    jsonb_build_object(
      'extension_id', extension_id,
      'version', version,
      'config_hash', config_hash,
      'validated', validated,
      'enabled_at', enabled_at
    )
  ) INTO v_configurations
  FROM site_extension_configs
  WHERE site_id = p_site_id;

  -- Collect signoffs
  SELECT jsonb_agg(
    jsonb_build_object(
      'extension_id', extension_id,
      'aspect', aspect,
      'signed_role', signed_role,
      'signed_at', signed_at
    )
  ) INTO v_signoffs
  FROM compliance_signoffs
  WHERE site_id = p_site_id;

  -- Generate summary
  SELECT jsonb_build_object(
    'total_extensions', COUNT(DISTINCT extension_id),
    'total_signoffs', (SELECT COUNT(*) FROM compliance_signoffs WHERE site_id = p_site_id),
    'snapshot_time', CURRENT_TIMESTAMP
  ) INTO v_summary
  FROM site_extension_configs
  WHERE site_id = p_site_id;

  -- Calculate size
  v_size := octet_length(v_configurations::text) + octet_length(v_signoffs::text);

  -- Create snapshot
  INSERT INTO configuration_snapshots (
    site_id, reason, created_by, configurations, signoffs, summary, size_bytes
  ) VALUES (
    p_site_id, p_reason, p_created_by, v_configurations, v_signoffs, v_summary, v_size
  )
  RETURNING id INTO v_snapshot_id;

  RETURN v_snapshot_id;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- Migration Metadata
-- ============================================

INSERT INTO schema_migrations (version, description)
VALUES ('002', 'Create support tables for caching and conflict tracking')
ON CONFLICT (version) DO NOTHING;
