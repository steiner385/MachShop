# Database Schema Design for Configuration Validator

## Overview

This document defines the database schema for the Configuration Validation Service, supporting multi-tenant extension configuration management with per-site compliance tracking.

**Key Requirements:**
- Complete site isolation (no cross-site data leakage)
- Compliance signoff audit trails
- Configuration versioning for rollback capability
- Efficient querying by site and extension
- ACID compliance for critical operations

## Core Tables

### 1. `site_extension_configs`

Tracks which extensions are enabled at each site and their configurations.

```sql
CREATE TABLE site_extension_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL,
  extension_id VARCHAR(64) NOT NULL,
  version VARCHAR(20) NOT NULL,

  -- Configuration tracking
  configuration JSONB NOT NULL,
  config_hash VARCHAR(256) NOT NULL UNIQUE,

  -- Validation status
  validated BOOLEAN NOT NULL DEFAULT TRUE,
  validation_errors JSONB,
  detected_conflicts TEXT[],

  -- Metadata
  enabled_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  CONSTRAINT unique_site_extension UNIQUE (site_id, extension_id)
);

CREATE INDEX idx_site_ext_configs_site_id ON site_extension_configs(site_id);
CREATE INDEX idx_site_ext_configs_extension_id ON site_extension_configs(extension_id);
CREATE INDEX idx_site_ext_configs_config_hash ON site_extension_configs(config_hash);
```

**Fields:**
- `site_id`: Foreign key to sites table (complete isolation)
- `extension_id`: Extension identifier (kebab-case)
- `version`: Semantic version (e.g., v1.0.0)
- `configuration`: JSONB of site-specific configuration
- `config_hash`: SHA-256 hash for compliance tracking
- `validated`: Whether configuration passed validation
- `validation_errors`: JSONB array of validation errors
- `detected_conflicts`: Array of conflicting extension IDs
- `enabled_at`: When extension was activated at this site
- `updated_at`: Last configuration update timestamp

### 2. `compliance_signoffs`

Audit trail of compliance signoffs for extension configurations.

```sql
CREATE TABLE compliance_signoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL,
  extension_id VARCHAR(64) NOT NULL,

  -- Signoff details
  aspect VARCHAR(128) NOT NULL,
  signed_by UUID NOT NULL,
  signed_role VARCHAR(32) NOT NULL,
  signed_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Configuration reference
  config_hash VARCHAR(256) NOT NULL,
  config_version INT NOT NULL,

  -- Notes and metadata
  notes TEXT,
  metadata JSONB,

  -- Constraints
  CONSTRAINT fk_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  CONSTRAINT fk_user FOREIGN KEY (signed_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_config_hash FOREIGN KEY (site_id, extension_id, config_hash)
    REFERENCES site_extension_configs(site_id, extension_id, config_hash) ON DELETE CASCADE
);

CREATE INDEX idx_signoffs_site_id ON compliance_signoffs(site_id);
CREATE INDEX idx_signoffs_site_ext ON compliance_signoffs(site_id, extension_id);
CREATE INDEX idx_signoffs_signed_at ON compliance_signoffs(signed_at);
CREATE INDEX idx_signoffs_signed_by ON compliance_signoffs(signed_by);
CREATE INDEX idx_signoffs_config_hash ON compliance_signoffs(config_hash);
```

**Fields:**
- `site_id`: Site where signoff occurred
- `extension_id`: Extension being signed off
- `aspect`: Compliance aspect (e.g., "electronic-signature-validation")
- `signed_by`: User who signed off (UUID, foreign key to users)
- `signed_role`: Role of signer (quality-focal, quality-manager, etc.)
- `signed_at`: When signoff was recorded
- `config_hash`: Hash of configuration being approved
- `config_version`: Version of configuration at time of signoff
- `notes`: Optional notes from signer
- `metadata`: Additional metadata (e.g., signature data)

### 3. `configuration_audit_log`

Complete audit trail of all configuration changes.

```sql
CREATE TABLE configuration_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL,
  extension_id VARCHAR(64) NOT NULL,

  -- Action tracking
  action VARCHAR(32) NOT NULL,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Configuration hashes for before/after
  old_config_hash VARCHAR(256),
  new_config_hash VARCHAR(256),

  -- Reason and details
  reason TEXT,
  details JSONB,

  -- Constraints
  CONSTRAINT fk_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  CONSTRAINT fk_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT valid_action CHECK (action IN ('activated', 'deactivated', 'reconfigured', 'signoff'))
);

CREATE INDEX idx_audit_site_id ON configuration_audit_log(site_id);
CREATE INDEX idx_audit_extension_id ON configuration_audit_log(extension_id);
CREATE INDEX idx_audit_site_ext ON configuration_audit_log(site_id, extension_id);
CREATE INDEX idx_audit_changed_at ON configuration_audit_log(changed_at);
CREATE INDEX idx_audit_changed_by ON configuration_audit_log(changed_by);
```

**Fields:**
- `site_id`: Site where change occurred
- `extension_id`: Extension affected
- `action`: Type of change (activated, deactivated, reconfigured, signoff)
- `changed_by`: User who made the change
- `changed_at`: When change occurred
- `old_config_hash`: Previous configuration hash
- `new_config_hash`: New configuration hash
- `reason`: Why change was made
- `details`: Additional change details (JSONB)

### 4. `extension_dependency_cache`

Cache of resolved dependencies for each extension at each site.

```sql
CREATE TABLE extension_dependency_cache (
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
  cached_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP,

  -- Constraints
  CONSTRAINT fk_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  CONSTRAINT fk_config FOREIGN KEY (site_id, extension_id)
    REFERENCES site_extension_configs(site_id, extension_id) ON DELETE CASCADE
);

CREATE INDEX idx_dep_cache_site_ext ON extension_dependency_cache(site_id, extension_id);
CREATE INDEX idx_dep_cache_expires_at ON extension_dependency_cache(expires_at);
```

**Purpose:** Cache dependency resolution to avoid recalculating on every request.

### 5. `extension_conflicts_detected`

Tracks detected conflicts between extensions at each site.

```sql
CREATE TABLE extension_conflicts_detected (
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
  severity VARCHAR(16) NOT NULL DEFAULT 'warning', -- 'error' or 'warning'
  reason TEXT NOT NULL,

  -- Metadata
  detected_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP,
  resolution_notes TEXT,

  -- Constraints
  CONSTRAINT fk_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

CREATE INDEX idx_conflicts_site ON extension_conflicts_detected(site_id);
CREATE INDEX idx_conflicts_extensions ON extension_conflicts_detected(extension_id_1, extension_id_2);
CREATE INDEX idx_conflicts_unresolved ON extension_conflicts_detected(site_id, resolved_at)
  WHERE resolved_at IS NULL;
```

**Purpose:** Track conflicts for investigation and reporting.

### 6. `configuration_snapshots`

Periodic snapshots of configuration state for disaster recovery and analysis.

```sql
CREATE TABLE configuration_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL,
  snapshot_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Configuration data
  configurations JSONB NOT NULL, -- Array of all configs at snapshot time
  signoffs JSONB NOT NULL,       -- Array of all signoffs

  -- Metadata
  reason VARCHAR(128),           -- Why snapshot was taken
  created_by UUID,

  -- Constraints
  CONSTRAINT fk_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

CREATE INDEX idx_snapshots_site_at ON configuration_snapshots(site_id, snapshot_at DESC);
```

**Purpose:** Enable point-in-time recovery and compliance audits.

## Supporting Tables (assumed to exist)

### `sites`
Core MachShop sites table.

```sql
CREATE TABLE sites (
  id UUID PRIMARY KEY,
  name VARCHAR(256) NOT NULL,
  status VARCHAR(32) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  -- ... other site fields
);
```

### `users`
Core MachShop users table.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  username VARCHAR(256) UNIQUE NOT NULL,
  email VARCHAR(256),
  -- ... other user fields
);
```

## Materialized Views for Reporting

### Current Site Configuration Status

```sql
CREATE MATERIALIZED VIEW v_site_config_status AS
SELECT
  s.id as site_id,
  s.name as site_name,
  COUNT(DISTINCT sec.extension_id) as total_extensions,
  COUNT(DISTINCT CASE WHEN sec.validated THEN sec.extension_id END) as valid_configs,
  COUNT(DISTINCT CASE WHEN NOT sec.validated THEN sec.extension_id END) as invalid_configs,
  COUNT(DISTINCT CASE WHEN sec.detected_conflicts IS NOT NULL AND array_length(sec.detected_conflicts, 1) > 0
    THEN sec.extension_id END) as conflicting_configs,
  MAX(sec.updated_at) as last_updated,
  CASE WHEN COUNT(DISTINCT CASE WHEN NOT sec.validated THEN sec.extension_id END) > 0
    THEN TRUE ELSE FALSE END as needs_attention
FROM sites s
LEFT JOIN site_extension_configs sec ON s.id = sec.site_id
GROUP BY s.id, s.name;

CREATE INDEX idx_v_site_config_site_id ON v_site_config_status(site_id);
```

### Unsigned Compliance Requirements

```sql
CREATE MATERIALIZED VIEW v_unsigned_compliance AS
SELECT
  sec.site_id,
  sec.extension_id,
  array_agg(DISTINCT ca.aspect) as unsigned_aspects,
  COUNT(DISTINCT ca.aspect) as aspect_count
FROM site_extension_configs sec
CROSS JOIN LATERAL jsonb_each_text(sec.configuration) ca(aspect, requirement)
LEFT JOIN compliance_signoffs cs ON
  sec.site_id = cs.site_id AND
  sec.extension_id = cs.extension_id AND
  ca.aspect = cs.aspect AND
  cs.signed_at > sec.enabled_at
WHERE cs.id IS NULL
GROUP BY sec.site_id, sec.extension_id;
```

## Migration Strategy

### Phase 1: Create Core Tables
1. Create `site_extension_configs`
2. Create `compliance_signoffs`
3. Create `configuration_audit_log`
4. Create all indexes

### Phase 2: Create Support Tables
1. Create `extension_dependency_cache`
2. Create `extension_conflicts_detected`
3. Create `configuration_snapshots`

### Phase 3: Create Views
1. Create materialized views
2. Create refresh schedule

### Phase 4: Data Migration (if migrating from v1.0)
1. Migrate existing extension configurations
2. Create audit trail entries for historical changes
3. Validate all migrated data

## Query Patterns

### Get all configurations for a site
```sql
SELECT * FROM site_extension_configs
WHERE site_id = $1
ORDER BY enabled_at DESC;
```

### Get compliance signoffs for an extension at a site
```sql
SELECT * FROM compliance_signoffs
WHERE site_id = $1 AND extension_id = $2
ORDER BY signed_at DESC;
```

### Get audit trail for an extension
```sql
SELECT * FROM configuration_audit_log
WHERE site_id = $1 AND extension_id = $2
ORDER BY changed_at DESC
LIMIT 100;
```

### Find unsigned compliance requirements
```sql
SELECT * FROM v_unsigned_compliance
WHERE site_id = $1;
```

### Get recent changes for all extensions at a site
```sql
SELECT DISTINCT ON (extension_id) * FROM configuration_audit_log
WHERE site_id = $1
ORDER BY extension_id, changed_at DESC;
```

### Check for unresolved conflicts
```sql
SELECT * FROM extension_conflicts_detected
WHERE site_id = $1 AND resolved_at IS NULL;
```

## Performance Considerations

1. **Indexes**: Primary indexes on (site_id, extension_id) for isolation
2. **Partitioning**: Consider partitioning audit log by site for very large deployments
3. **Archival**: Move old audit entries to separate archive table
4. **Caching**: Use dependency cache to avoid repeated calculations
5. **Snapshots**: Take snapshots during maintenance windows

## Security Considerations

1. **Row-Level Security (RLS)**: Implement RLS policies to ensure users only access their site's data
2. **Audit Log Immutability**: Make audit log append-only (no updates/deletes)
3. **User Tracking**: All changes must track which user made them
4. **Encryption**: Consider encrypting sensitive configuration values
5. **Access Control**: Restrict access to configuration/signoff tables to authorized services

## Backup & Recovery

1. **Backup frequency**: Daily full backup, hourly incremental
2. **Point-in-time recovery**: Maintain 30-day recovery window
3. **Snapshot testing**: Regularly test recovery procedures
4. **Configuration snapshots**: Enable quick rollback to known good state

## Scalability

**Expected data volumes:**
- 100 sites × 50 extensions × 10 configuration changes = 50K audit entries per site
- 100 sites × 50 extensions × 3 signoffs = 15K signoff records per site
- Snapshot growth: ~1MB per snapshot per 50 extensions

**Monitoring metrics:**
- Audit log table size
- Query performance on audit queries
- Snapshot generation time
- Cleanup/archival job performance
