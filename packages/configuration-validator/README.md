# MachShop Configuration Validation Service

Foundation service for managing per-site extension configurations, dependency validation, conflict detection, and compliance signoff tracking.

## Purpose

The Configuration Validation Service is responsible for:

1. **Per-Site Configuration Management**: Track which extensions are enabled at each site and their configurations
2. **Dependency Validation**: Verify that all extension dependencies are satisfied at a site
3. **Conflict Detection**: Detect incompatible extension combinations at a site
4. **Compliance Tracking**: Record and audit compliance signoffs for extension configurations
5. **Configuration Hashing**: Generate cryptographic hashes of configurations for audit trails
6. **Site-Scoped Governance**: Enforce foundation tier requirements per site

## Architecture

```
ConfigurationValidator
├── SiteConfigurationStore (in-memory/database)
│   ├── SiteExtensionConfiguration[]
│   └── ComplianceSignoff[] (audit trail)
├── DependencyResolver (uses CapabilityRegistry)
│   ├── Resolves extension dependencies
│   └── Resolves capability dependencies
├── ConflictDetector (uses CapabilityRegistry)
│   ├── Detects explicit conflicts
│   ├── Detects policy conflicts
│   └── Reports conflict scope and reason
└── ComplianceAuditor
    ├── Records signoff events
    ├── Generates audit trails
    └── Validates signoff completeness
```

## Core Types

### SiteExtensionConfiguration

Represents the configuration of a single extension at a single site:

```typescript
interface SiteExtensionConfiguration {
  siteId: string;
  extensionId: string;
  version: string;
  enabledAt: Date;
  configurationHash: string; // SHA-256 of configuration
  configuration: Record<string, any>;
  validated: boolean;
  validationErrors?: ValidationError[];
  detectedConflicts?: string[]; // IDs of conflicting extensions
}
```

### ComplianceSignoff

Represents a compliance signoff for a configuration at a site:

```typescript
interface ComplianceSignoff {
  siteId: string;
  extensionId: string;
  aspect: string; // e.g., "electronic-signature-validation"
  signedBy: string; // User ID
  role: ComplianceDelegationRole; // quality-focal, etc.
  timestamp: Date;
  configurationHash: string; // What config was signed off
  notes?: string;
}
```

### ValidationReport

Complete validation result for a site configuration:

```typescript
interface ValidationReport {
  siteId: string;
  valid: boolean;
  schemaErrors: ValidationError[];
  dependencyErrors: ValidationError[];
  conflictErrors: ValidationError[];
  complianceWarnings: ValidationWarning[];
  detectedConflicts: ConflictDetectionResult[];
  missingSignoffs: {
    extensionId: string;
    aspects: string[];
  }[];
}
```

## Usage Patterns

### 1. Validate Pre-Activation

Before activating an extension at a site:

```typescript
const validator = new ConfigurationValidator();

const report = await validator.validateBeforeActivation({
  siteId: 'site-123',
  extensionId: 'work-instruction-from-mes',
  version: 'v1.0',
  configuration: { /* site-specific config */ },
});

if (!report.valid) {
  // Report errors to user
  console.log(report.schemaErrors);
  console.log(report.conflictErrors);
  console.log(report.dependencyErrors);
} else {
  // OK to proceed with activation
  // Prompt for required signoffs
  console.log(report.complianceWarnings);
}
```

### 2. Record Activation with Signoffs

After user approval:

```typescript
await validator.activateExtension({
  siteId: 'site-123',
  extensionId: 'work-instruction-from-mes',
  version: 'v1.0',
  configuration: { /* config */ },
  complianceSignoffs: [
    {
      aspect: 'electronic-signature-validation',
      signedBy: 'user-456',
      role: 'quality-focal',
      notes: 'Validated per site QMS'
    }
  ]
});
```

### 3. Detect Configuration Issues

Query for sites with issues:

```typescript
const invalidConfigs = await validator.findInvalidConfigurations();
// Sites with validation errors

const unsignedAspects = await validator.findUnsignedCompliance({
  extensionId: 'aerospace-compliance'
});
// Sites missing compliance signoffs
```

### 4. Deactivate Extension

Safe deactivation with validation:

```typescript
const result = await validator.deactivateExtension({
  siteId: 'site-123',
  extensionId: 'work-instruction-from-mes',
});

if (result.ok) {
  // Other extensions don't depend on this capability
  // Proceed with deactivation
} else {
  // Report dependencies
  console.log(result.dependentExtensions);
}
```

## Integration with Other Services

### With CapabilityRegistry
- Resolves capability-based dependencies
- Detects policy conflicts
- Validates capability versions

### With ExtensionValidator (v1.0 library)
- Validates schema conformance
- Validates manifest structure
- Validates version constraints

### With ComplianceSignoffService
- Records signoff events
- Generates compliance reports
- Audits configuration changes

## Key Features

### 1. Configuration Hashing
- SHA-256 hash of extension configuration
- Tracks exact configuration that was approved
- Detects unauthorized configuration changes
- Enables "rollback to last known good"

### 2. Conflict Detection Scopes

**Global Conflicts** (system-wide):
- Only one provider of a capability can be active across all sites
- Example: Only one authentication provider

**Capability-Level Conflicts** (same capability):
- Cannot use two implementations of same capability at one site
- Example: Cannot use both "MES authoring" AND "PLM authoring" for work instructions

**Resource-Level Conflicts** (specific resource):
- Cannot use two implementations for specific resource at one site
- Example: Cannot use both adapters for "work-orders" data source

### 3. Compliance Requirement Tracking

For each extension configuration, track:
- What compliance aspects are required
- Who must sign off (quality-focal, compliance-officer, etc.)
- Whether signoff is present
- Audit trail of signoff events
- Ability to revoke signoff

### 4. Multi-Tenant Isolation

- All operations are scoped to site
- Cannot accidentally affect other sites
- Each site has independent compliance requirements
- Cross-site queries require explicit aggregation

## Data Storage

The service requires:

1. **SiteExtensionConfiguration Table**:
   ```sql
   CREATE TABLE site_extension_configs (
     site_id UUID NOT NULL,
     extension_id VARCHAR NOT NULL,
     version VARCHAR NOT NULL,
     enabled_at TIMESTAMP NOT NULL,
     config_hash VARCHAR NOT NULL,
     configuration JSONB NOT NULL,
     validated BOOLEAN NOT NULL,
     validation_errors JSONB,
     detected_conflicts TEXT[],
     PRIMARY KEY (site_id, extension_id),
     FOREIGN KEY (site_id) REFERENCES sites(id)
   );
   ```

2. **ComplianceSignoff Table**:
   ```sql
   CREATE TABLE compliance_signoffs (
     site_id UUID NOT NULL,
     extension_id VARCHAR NOT NULL,
     aspect VARCHAR NOT NULL,
     signed_by UUID NOT NULL,
     signed_role VARCHAR NOT NULL,
     signed_at TIMESTAMP NOT NULL,
     config_hash VARCHAR NOT NULL,
     notes TEXT,
     PRIMARY KEY (site_id, extension_id, aspect, signed_at),
     FOREIGN KEY (site_id, extension_id)
       REFERENCES site_extension_configs(site_id, extension_id)
   );
   ```

3. **ConfigurationAuditLog Table**:
   ```sql
   CREATE TABLE configuration_audit_log (
     id UUID PRIMARY KEY,
     site_id UUID NOT NULL,
     extension_id VARCHAR NOT NULL,
     action VARCHAR NOT NULL, -- activated, deactivated, reconfigured
     changed_by UUID NOT NULL,
     changed_at TIMESTAMP NOT NULL,
     old_config_hash VARCHAR,
     new_config_hash VARCHAR,
     reason TEXT,
     FOREIGN KEY (site_id) REFERENCES sites(id)
   );
   ```

## Next Steps

1. Create ConfigurationValidator class with core methods
2. Create in-memory store implementation (for testing)
3. Create database store implementation
4. Create compliance signoff recording
5. Integrate with API for activation/deactivation endpoints
6. Create compliance reporting and audit trail queries
