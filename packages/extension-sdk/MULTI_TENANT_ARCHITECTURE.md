# Multi-Tenant Extension Architecture

## Overview

MachShop implements a **shared single-instance multi-tenant architecture** where:
- All sites run on the **same application instance**
- Each site independently selects and configures its extensions
- The application contains all possible extension code, with per-site enablement
- Extensions can be enabled/disabled per site without affecting other sites
- Extensions cannot disrupt existing sites' operations during activation

## Core Principles

### 1. Feature Completeness with Incremental Adoption
The application includes all possible extension code and features, but sites opt-in to what they use:
- Database schema must support every possible custom field from all extensions
- APIs must support feature detection and capability negotiation per site
- Sites can upgrade and adopt features incrementally
- Backward compatibility is maintained as new extensions are added

### 2. Site-Scoped Configuration
Extension configuration and enablement is completely isolated per site:
```
MachShop Instance
├── Site A (extensions: [ext-1, ext-2])
├── Site B (extensions: [ext-1, ext-3])
└── Site C (extensions: [ext-2, ext-3, ext-4])
```

Each site has:
- Independent extension enable/disable status
- Site-specific configuration for each enabled extension
- Separate compliance signoffs for extension combinations
- Policy enforcement specific to that site's configuration

### 3. Safe Extension Activation
New extensions must be activated safely:
- Backward-compatible schema evolution (nullable columns for new custom fields)
- Non-disruptive API additions (feature detection, graceful degradation)
- Pre-activation validation ensuring no conflicts with existing site configuration
- Atomic activation (no partial state on failure)
- Easy rollback capability

### 4. Conflict Resolution at Site Scope
Policy-based conflicts are enforced per site:
```
Site A: Can use both "work-instruction-from-MES" AND "work-instruction-from-PLM"
        if appropriate policies allow (e.g., "MES-preferred" policy)

Site B: Can use ONLY "work-instruction-from-MES" (strict policy)

Site C: Uses "work-instruction-from-PLM" exclusively
```

Different sites can have different policies for the same capability because:
- Site configurations are independent
- Compliance responsibility is delegated to site quality focals
- Policy enforcement is site-scoped

## Database Schema Patterns

### Custom Fields Pattern
For extension-provided custom fields:

```sql
-- Base table (always exists)
CREATE TABLE work_orders (
  id UUID PRIMARY KEY,
  site_id UUID NOT NULL,
  order_number VARCHAR NOT NULL,
  ...base fields...
);

-- Custom field tables (created when extension is activated)
CREATE TABLE work_order_custom_fields (
  work_order_id UUID NOT NULL,
  site_id UUID NOT NULL,
  extension_id VARCHAR NOT NULL,
  field_name VARCHAR NOT NULL,
  field_value JSONB,
  PRIMARY KEY (work_order_id, extension_id, field_name),
  FOREIGN KEY (work_order_id, site_id) REFERENCES work_orders(id, site_id)
);
```

**OR** for smaller datasets:

```sql
CREATE TABLE work_orders (
  id UUID PRIMARY KEY,
  site_id UUID NOT NULL,
  -- base fields...

  -- Custom fields from extensions (nullable until extension activated at site)
  custom_field_1 VARCHAR NULL,  -- from ext-aerospace-custom-fields
  custom_field_2 JSONB NULL,    -- from ext-quality-compliance
  ...
);
```

**Strategy**:
- Use JSONB columns for high-cardinality custom fields
- Use nullable columns for predictable custom fields
- Add columns with NOT NULL DEFAULT or create separate tables as needed
- Track which extension provides each custom field for validation

### Extension Registry Pattern
```sql
CREATE TABLE site_extension_configs (
  site_id UUID NOT NULL,
  extension_id VARCHAR NOT NULL,
  version VARCHAR NOT NULL,
  enabled_at TIMESTAMP NOT NULL,
  config_hash VARCHAR NOT NULL,
  configuration JSONB NOT NULL,
  validated BOOLEAN NOT NULL DEFAULT FALSE,
  validation_errors JSONB,
  detected_conflicts TEXT[],
  PRIMARY KEY (site_id, extension_id)
);

CREATE TABLE compliance_signoffs (
  site_id UUID NOT NULL,
  extension_id VARCHAR NOT NULL,
  aspect VARCHAR NOT NULL,
  signed_by UUID NOT NULL,
  signed_role VARCHAR NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  config_hash VARCHAR NOT NULL,
  notes TEXT,
  PRIMARY KEY (site_id, extension_id, aspect, timestamp)
);
```

### Feature Flag Pattern
```sql
CREATE TABLE extension_features (
  site_id UUID NOT NULL,
  feature_name VARCHAR NOT NULL,
  enabled BOOLEAN NOT NULL,
  provided_by_extension VARCHAR,
  enabled_at TIMESTAMP,
  PRIMARY KEY (site_id, feature_name)
);
```

## API Patterns

### Feature Detection
```typescript
// Client can query what features are available at this site
GET /api/v1/site/{siteId}/features
Response: {
  "features": {
    "work-instruction-authoring": {
      "enabled": true,
      "provider": "work-instruction-from-mes",
      "version": "v1.2",
      "policy": "mes-authoring"
    },
    "quality-compliance-aerospace": {
      "enabled": true,
      "provider": "aerospace-compliance-extension",
      "version": "v2.0"
    },
    "erp-integration": {
      "enabled": false,
      "available_providers": ["sap-ebs-adapter", "oracle-ebs-adapter"]
    }
  }
}
```

### Capability Negotiation
```typescript
// Extensions query what capabilities are available
GET /api/v1/site/{siteId}/capabilities/{capabilityName}
Response: {
  "capability": "erp-integration",
  "enabled": true,
  "provider": "sap-ebs-adapter",
  "version": "v1.0",
  "contract": "https://machshop.io/contracts/erp-integration/v1.0",
  "implements": ["getSKU", "createPO", "updateInventory"],
  "policy": "oauth-only"
}
```

### Extension Activation
```typescript
POST /api/v1/site/{siteId}/extensions/{extensionId}/activate
Request: {
  "version": "v2.0",
  "configuration": { /* site-specific config */ },
  "complianceSignoffs": [
    {
      "aspect": "electronic-signature-validation",
      "signedBy": "quality-focal-user-id",
      "notes": "Validated per site QMS"
    }
  ]
}
Response: {
  "activated": true,
  "validationWarnings": [],
  "detectedConflicts": []
}

// Handles:
// 1. Pre-activation validation (conflicts, dependencies, compliance)
// 2. Database schema updates (custom fields, etc.)
// 3. API registration (new endpoints, webhooks, etc.)
// 4. Compliance audit trail recording
// 5. Atomic activation or rollback
```

### Conflict Detection
```typescript
POST /api/v1/site/{siteId}/extensions/validate-combination
Request: {
  "extensions": [
    { "id": "work-instruction-from-mes", "version": "v1.0" },
    { "id": "work-instruction-from-plm", "version": "v2.0" },
    { "id": "aerospace-compliance", "version": "v1.0" }
  ]
}
Response: {
  "valid": false,
  "conflicts": [
    {
      "type": "policy-conflict",
      "scope": "capability",
      "capability": "work-instruction-authoring",
      "policy1": "mes-authoring",
      "policy2": "plm-authoring",
      "message": "Cannot enable both MES and PLM authoring for work instructions at same site"
    }
  ],
  "warnings": [
    {
      "type": "compliance-signoff-required",
      "extension": "aerospace-compliance",
      "aspects": ["electronic-signature-validation"]
    }
  ]
}
```

## Configuration Validation Service

The Configuration Validation Service is responsible for:

### Per-Site Configuration Tracking
```typescript
interface SiteExtensionConfiguration {
  siteId: string;
  extensionId: string;
  version: string;
  enabledAt: Date;
  configurationHash: string;
  configuration: Record<string, any>;
  validated: boolean;
  validationErrors?: ValidationError[];
  detectedConflicts?: string[];
}
```

### Compliance Signoff Audit Trail
```typescript
interface ComplianceSignoff {
  aspect: string;
  signedBy: string; // User ID
  role: 'quality-focal' | 'quality-manager' | 'site-manager' | 'compliance-officer';
  timestamp: Date;
  siteId: string;
  configurationHash: string; // Tracks what configuration was signed off
  notes?: string;
}
```

The service validates:
1. **Schema Compliance**: Configuration matches extension's configurationSchema
2. **Dependency Resolution**: All required dependencies are satisfied at site
3. **Conflict Detection**: No policy conflicts with currently enabled extensions
4. **Compliance Requirements**: All required signoffs are present
5. **Version Constraints**: Extension version satisfies site's min/max version constraints

## Extension Lifecycle at a Site

### 1. Extension Discovery
```
GET /api/v1/extensions
Response: All available extensions in system (enabled/disabled per site)
```

### 2. Pre-Activation Validation
```
POST /api/v1/site/{siteId}/extensions/{extensionId}/validate
- Check dependencies: Are all required extensions/capabilities enabled at site?
- Check conflicts: Any policy conflicts with currently enabled extensions?
- Check compliance: What signoffs are required?
- Check configuration: Is the proposed config valid?
```

### 3. Activation with Compliance Signoff
```
POST /api/v1/site/{siteId}/extensions/{extensionId}/activate
- Record who signed off (quality focal, etc.)
- Record what configuration was approved
- Create audit trail entry
- Enable extension at site
- Register capabilities provided by extension
```

### 4. Active Use
```
- Extension is enabled at site
- Features are available to site's users
- Requests can route to extension endpoints/handlers
- Custom data fields are available
```

### 5. Deactivation
```
POST /api/v1/site/{siteId}/extensions/{extensionId}/deactivate
- Check for dependencies (other extensions depend on this capability?)
- Archive compliance signoffs
- Disable extension at site
- (Optionally) archive custom data created by extension
```

## Implications for System Design

### API Gateway / Router
Must support:
- Site-scoped feature detection and routing
- Capability negotiation (which provider is active for this capability?)
- Per-site extension endpoints
- Feature-flag based request routing

### Database Layer
Must support:
- Multi-tenant schema with site-scoped custom fields
- Schema evolution (adding new custom field columns/tables)
- Audit trails for compliance signoffs
- Configuration hashing for compliance audit

### Security & Permissions
Must enforce:
- Role-based access (quality-focal can signoff, others cannot)
- Site-scoped permissions (users can only access data for their site)
- Audit logging of all compliance signoffs
- Extension capability restrictions per site

### Testing & Validation
Must verify:
- Extensions don't interfere with each other at same site
- Extensions can be safely activated/deactivated without data loss
- Backward compatibility when activating extensions on existing data
- Conflict detection works correctly for policy-based exclusions

## Migration Strategy for Existing MachShop v1

When transitioning to v2.0 with multi-tenant extension architecture:

1. **Phase 1**: Deploy v2.0 infrastructure (validation service, configuration tracking)
2. **Phase 2**: Activate "default" extensions for existing sites (zero-behavior change)
3. **Phase 3**: Enable per-site extension selection and configuration
4. **Phase 4**: Migrate custom implementations to extension framework
5. **Phase 5**: Decommission custom code, standardize on extensions

## Next Steps

1. Design database schema patterns for custom fields and multi-tenant data
2. Build Configuration Validation Service (core of per-site governance)
3. Implement site-scoped extension activation/deactivation APIs
4. Create feature detection and capability negotiation endpoints
5. Add compliance signoff audit trail recording

This architecture enables safe, incremental adoption of extensions while maintaining operational continuity for all sites.
