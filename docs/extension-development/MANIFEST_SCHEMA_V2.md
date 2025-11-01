# Extension Manifest Schema v2.0 Reference

**Version**: 2.0.0
**Released**: November 2024
**Status**: Stable

Complete reference for the MachShop Extension Manifest v2.0 schema. This document provides detailed specifications for all manifest fields, their constraints, and validation rules.

## Table of Contents

1. [Core Required Fields](#core-required-fields)
2. [Foundation Tier Specifications](#foundation-tier-specifications)
3. [Author & Metadata Fields](#author--metadata-fields)
4. [Dependencies](#dependencies)
5. [Conflicts](#conflicts)
6. [Capabilities](#capabilities)
7. [Permissions](#permissions)
8. [Configuration](#configuration)
9. [Entry Points](#entry-points)
10. [System Requirements](#system-requirements)
11. [Testing](#testing)
12. [Security](#security)
13. [Governance](#governance)
14. [Compliance](#compliance)
15. [Performance](#performance)
16. [Complete Example](#complete-example)

## Core Required Fields

These fields MUST be present in every v2.0 manifest.

### `id`

**Type**: `string`
**Required**: Yes
**Format**: Kebab-case, alphanumeric + hyphens only
**Length**: 3-64 characters
**Pattern**: `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`

Unique identifier for the extension. Used internally and in dependency references.

```json
{
  "id": "quality-dashboard-widget"
}
```

### `version`

**Type**: `string`
**Required**: Yes
**Format**: Semantic Versioning (MAJOR.MINOR.PATCH)
**Pattern**: `^\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?$`

Extension version following semantic versioning. Pre-release versions supported (e.g., 1.0.0-beta.1).

```json
{
  "version": "2.0.0"
}
```

### `name`

**Type**: `string`
**Required**: Yes
**Length**: 1-128 characters

Human-readable display name for the extension.

```json
{
  "name": "Quality Dashboard Widget"
}
```

### `type`

**Type**: `string` (enum)
**Required**: Yes
**Valid Values**:
- `ui-extension` - User interface components and widgets
- `business-logic` - Hooks and workflow modifications
- `data-extension` - Custom fields and data schema extensions
- `integration` - External system integrations
- `compliance` - Compliance and governance modules
- `infrastructure` - Authentication, infrastructure, system-level

Extension type classification.

```json
{
  "type": "ui-extension"
}
```

### `category`

**Type**: `string`
**Required**: Yes
**Valid Values**: 30+ options including:
  - UI Extensions: dashboard-widget, panel, modal, sidebar, toolbar, button, form, table, chart, report
  - Business Logic: workflow-hook, validation-rule, notification, scheduler, processor
  - Data: custom-field, schema-extension, data-transformer
  - Integration: erp-adapter, api-connector, webhook, message-queue
  - Compliance: compliance-module, audit-trail, certification
  - Infrastructure: auth-provider, logging, monitoring, storage

Granular categorization within extension type.

```json
{
  "category": "dashboard-widget"
}
```

### `description`

**Type**: `string`
**Required**: Yes
**Length**: 10-500 characters

Detailed description of what the extension does, its purpose, and key functionality.

```json
{
  "description": "Real-time quality metrics dashboard displaying defect rates, control limits, and trend analysis"
}
```

### `apiVersion`

**Type**: `string`
**Required**: Yes
**Format**: `vMAJOR.MINOR`
**Pattern**: `^v\d+\.\d+$`

MachShop API version this extension targets.

```json
{
  "apiVersion": "v2.1"
}
```

### `mesVersion`

**Type**: `string`
**Required**: Yes
**Format**: `MAJOR.MINOR.PATCH`
**Pattern**: `^\d+\.\d+\.\d+$`

MES system version this extension targets.

```json
{
  "mesVersion": "3.2.0"
}
```

### `extensionSchemaVersion`

**Type**: `string` (enum)
**Required**: Yes
**Valid Values**: `"2.0"`

Must be exactly "2.0" for v2.0 manifests. Earlier versions (1.0) are not valid.

```json
{
  "extensionSchemaVersion": "2.0"
}
```

### `foundationTier`

**Type**: `string` (enum)
**Required**: Yes
**Valid Values**:
- `core-foundation` - Core system extensions
- `foundation` - Enterprise-critical business logic
- `application` - Standard features
- `optional` - Optional/nice-to-have

**Tier Requirements**:

| Tier | Test Coverage | Signing | Scanning | Audit Log | Approval | Sandbox |
|------|---------------|---------|----------|-----------|----------|---------|
| core-foundation | 90% | Required | Required | Required | Yes (compliance) | Required |
| foundation | 80% | Required | Required | Required | Yes (standard) | Required |
| application | 60% | Optional | Optional | Optional | Optional | Recommended |
| optional | 50% | No | No | No | No | No |

Classification of extension importance and criticality.

```json
{
  "foundationTier": "application"
}
```

## Foundation Tier Specifications

### Core Foundation Tier Requirements

For `foundationTier: "core-foundation"`:

**Testing** (REQUIRED):
```json
{
  "testing": {
    "hasTests": true,
    "coverage": 90,
    "testTypes": ["unit", "integration", "e2e"],
    "cicdIntegration": true
  }
}
```

**Security** (REQUIRED):
```json
{
  "security": {
    "sandboxed": true,
    "signatureRequired": true,
    "securityLevel": "foundation",
    "vulnerabilityScanRequired": true,
    "auditLog": true
  }
}
```

**Governance** (REQUIRED):
```json
{
  "governance": {
    "requiresPlatformApproval": true,
    "approvalProcess": "compliance-review",
    "certificationRequired": true
  }
}
```

### Foundation Tier Requirements

For `foundationTier: "foundation"`:

**Testing** (REQUIRED):
```json
{
  "testing": {
    "hasTests": true,
    "coverage": 80,
    "testTypes": ["unit", "integration"],
    "cicdIntegration": true
  }
}
```

**Security** (REQUIRED):
```json
{
  "security": {
    "sandboxed": true,
    "signatureRequired": true,
    "securityLevel": "foundation",
    "vulnerabilityScanRequired": true,
    "auditLog": true
  }
}
```

**Governance** (REQUIRED):
```json
{
  "governance": {
    "requiresPlatformApproval": true,
    "approvalProcess": "standard"
  }
}
```

### Application Tier Requirements

For `foundationTier: "application"`:

**Testing** (RECOMMENDED):
```json
{
  "testing": {
    "hasTests": true,
    "coverage": 70,
    "testTypes": ["unit", "integration"],
    "cicdIntegration": true
  }
}
```

**Security** (RECOMMENDED):
```json
{
  "security": {
    "sandboxed": true,
    "signatureRequired": false,
    "securityLevel": "standard"
  }
}
```

## Author & Metadata Fields

### `author`

**Type**: `object`
**Required**: No
**Properties**:
- `name` (string, required if author object exists): Author name
- `email` (string, optional): Email address (must be valid email)
- `url` (string, optional): Author website (must be valid URI)

Information about the extension author.

```json
{
  "author": {
    "name": "MachShop Engineering",
    "email": "support@machshop.io",
    "url": "https://machshop.io"
  }
}
```

### `license`

**Type**: `string`
**Required**: No
**Valid Values**: Standard SPDX licenses (MIT, Apache-2.0, GPL-3.0, Proprietary, etc.)

Software license for the extension.

```json
{
  "license": "MIT"
}
```

### `repository`

**Type**: `string`
**Required**: No
**Format**: Valid URI

URL to source code repository.

```json
{
  "repository": "https://github.com/machshop/quality-dashboard-widget"
}
```

### `homepage`

**Type**: `string`
**Required**: No
**Format**: Valid URI

Extension documentation/homepage URL.

```json
{
  "homepage": "https://docs.machshop.io/extensions/quality-dashboard"
}
```

### `keywords`

**Type**: `array of strings`
**Required**: No
**Max Length**: 20 keywords
**Max Keyword Length**: 50 characters

Keywords for searchability and categorization.

```json
{
  "keywords": ["quality", "dashboard", "metrics", "manufacturing"]
}
```

### `tags`

**Type**: `array of strings`
**Required**: No

Additional tags for categorization (similar to keywords).

```json
{
  "tags": ["quality", "monitoring", "real-time"]
}
```

### `documentation`

**Type**: `object`
**Required**: No
**Properties** (all optional):
- `guide` (string): Developer/user guide URL
- `api` (string): API documentation URL
- `changelog` (string): Changelog URL
- `support` (string): Support/issues URL

Links to documentation resources.

```json
{
  "documentation": {
    "guide": "https://docs.machshop.io/extensions/quality-dashboard/guide",
    "api": "https://docs.machshop.io/extensions/quality-dashboard/api",
    "changelog": "https://github.com/machshop/quality-dashboard/CHANGELOG.md",
    "support": "https://github.com/machshop/quality-dashboard/issues"
  }
}
```

### `releaseDate`

**Type**: `string`
**Required**: No
**Format**: ISO 8601 datetime

When the extension was released.

```json
{
  "releaseDate": "2024-01-15T10:30:00Z"
}
```

### `deprecated`

**Type**: `boolean`
**Required**: No
**Default**: `false`

Whether this extension version is deprecated.

```json
{
  "deprecated": false
}
```

### `deprecationNotice`

**Type**: `string`
**Required**: No
**Condition**: Only valid if `deprecated: true`

Message explaining deprecation and migration path.

```json
{
  "deprecationNotice": "Use quality-dashboard-v2 instead. Migration guide: https://..."
}
```

## Dependencies

### `dependencies`

**Type**: `object`
**Required**: No

Declares what capabilities and extensions this extension depends on.

#### Capability-Based Dependencies

```json
{
  "dependencies": {
    "capabilities": [
      {
        "capability": "quality-data-provider",
        "minVersion": "v2",
        "provider": "core-mes-ui-foundation"
      },
      {
        "capability": "material-availability",
        "minVersion": "v1"
      }
    ]
  }
}
```

**Properties**:
- `capability` (string, required): Capability identifier
- `minVersion` (string, required): Minimum capability version (format: vMAJOR or vMAJOR.MINOR)
- `provider` (string, optional): Preferred extension providing this capability

## Conflicts

### `conflicts`

**Type**: `object`
**Required**: No
**Properties**:
- `explicit` (array, optional): Direct extension conflicts
- `policyExclusions` (array, optional): Policy-based conflicts

Defines what other extensions this one conflicts with.

#### Explicit Conflicts

```json
{
  "conflicts": {
    "explicit": [
      {
        "id": "legacy-quality-widget",
        "reason": "Incompatible data structure"
      }
    ]
  }
}
```

#### Policy-Based Conflicts

```json
{
  "conflicts": {
    "policyExclusions": [
      {
        "scope": "capability",
        "capability": "quality-reporting",
        "policy": "strict-validation",
        "conflictsWith": ["lenient-validation"],
        "reason": "Incompatible validation policies"
      }
    ]
  }
}
```

**Policy Exclusion Properties**:
- `scope` (string, enum): "global" | "capability" | "resource"
- `capability` (string): Required if scope is "capability" or "resource"
- `resource` (string): Required if scope is "resource"
- `policy` (string, required): This extension's policy
- `conflictsWith` (array, required): Incompatible policies
- `reason` (string, optional): Explanation of conflict

## Capabilities

### `capabilities`

**Type**: `object`
**Required**: No

What capabilities this extension provides and implements.

#### Provides Declaration

```json
{
  "capabilities": {
    "provides": [
      {
        "name": "quality-reporting",
        "version": "v2.0.0",
        "contract": "https://docs.machshop.io/contracts/quality-reporting",
        "implements": ["report", "analyze", "export"],
        "policy": "strict-validation"
      }
    ]
  }
}
```

#### UI Capabilities

```json
{
  "capabilities": {
    "ui": {
      "widgets": [
        {
          "id": "quality-metrics-dashboard",
          "name": "Quality Metrics Dashboard",
          "category": "dashboard-widget",
          "slots": ["dashboard-right-panel", "quality-hub"],
          "permissions": ["read:quality"],
          "contract": "UIComponentContract"
        }
      ]
    }
  }
}
```

**Widget Properties**:
- `id` (string, required): Unique widget ID
- `name` (string, required): Display name
- `category` (string, required): Widget category
- `slots` (array, required): Available slots
- `permissions` (array, optional): Required permissions
- `contract` (string, optional): Contract reference

#### Hook Capabilities

```json
{
  "capabilities": {
    "hooks": [
      {
        "hook": "work-order:before-release",
        "phase": "pre",
        "priority": 100,
        "description": "Validates work order before release",
        "contract": "WorkOrderHookContract"
      }
    ]
  }
}
```

**Hook Properties**:
- `hook` (string, required): Hook identifier
- `phase` (string, required): "pre" | "core" | "post"
- `priority` (number, required): Execution priority (0-1000)
- `description` (string, optional): Hook description
- `contract` (string, optional): Contract reference

#### Data Schema Capabilities

```json
{
  "capabilities": {
    "dataSchema": {
      "fields": [
        {
          "name": "work-order.certification-level",
          "type": "string",
          "required": false,
          "description": "Certification level"
        }
      ]
    }
  }
}
```

#### Integration Capabilities

```json
{
  "capabilities": {
    "integrations": [
      {
        "system": "SAP ERP",
        "version": "S/4HANA 2023+",
        "description": "Bidirectional integration",
        "contract": "SAPIntegrationContract"
      }
    ]
  }
}
```

## Permissions

### `permissions`

**Type**: `array of strings`
**Required**: No
**Valid Values**: 17 standard permissions:
- `read:work-orders`
- `write:work-orders`
- `read:quality`
- `write:quality`
- `read:materials`
- `write:materials`
- `read:equipment`
- `write:equipment`
- `read:routing`
- `write:routing`
- `read:users`
- `write:users`
- `admin:security`
- `admin:system`
- `integration:external-systems`
- `create:reports`
- `export:data`

Permissions required for the extension to function.

```json
{
  "permissions": [
    "read:quality",
    "read:work-orders"
  ]
}
```

## Configuration

### `configuration`

**Type**: `object`
**Required**: No

JSON Schema (draft-07) for per-site configuration.

```json
{
  "configuration": {
    "properties": {
      "refreshInterval": {
        "type": "integer",
        "description": "Data refresh interval in seconds",
        "default": 30,
        "minimum": 5,
        "maximum": 300
      },
      "displayMode": {
        "type": "string",
        "enum": ["compact", "expanded"],
        "default": "expanded"
      }
    },
    "required": ["refreshInterval"]
  }
}
```

## Entry Points

### `entryPoint`

**Type**: `object`
**Required**: No
**Properties** (all optional):
- `main` (string): Main entry point
- `module` (string): ES module entry point
- `browser` (string): Browser bundle entry point
- `react` (string): React entry point

How to load the extension code.

```json
{
  "entryPoint": {
    "main": "dist/index.js",
    "module": "dist/index.mjs",
    "browser": "dist/index.umd.js"
  }
}
```

## System Requirements

### `requirements`

**Type**: `object`
**Required**: No
**Properties** (all optional):
- `nodeVersion` (string): Node.js version constraint
- `memory` (string): Required memory (e.g., "256MB", "1GB")
- `disk` (string): Required disk space

System resource requirements.

```json
{
  "requirements": {
    "nodeVersion": ">=16.0.0",
    "memory": "512MB",
    "disk": "2GB"
  }
}
```

## Testing

### `testing`

**Type**: `object`
**Required**: For foundation tiers

Test coverage and quality metrics.

```json
{
  "testing": {
    "hasTests": true,
    "coverage": 85,
    "testTypes": ["unit", "integration", "component"],
    "cicdIntegration": true,
    "performanceBaseline": {
      "memoryUsageMB": 128,
      "cpuUsagePercent": 10,
      "responseTimeMs": 500,
      "throughputOpsPerSec": 1000
    }
  }
}
```

**Properties**:
- `hasTests` (boolean): Whether tests exist
- `coverage` (number): Test coverage percentage (0-100)
- `testTypes` (array, optional): Types of tests (unit, integration, e2e, performance, security, regression)
- `cicdIntegration` (boolean, optional): Whether integrated with CI/CD
- `performanceBaseline` (object, optional):
  - `memoryUsageMB` (number): Memory baseline in MB
  - `cpuUsagePercent` (number): CPU baseline percentage
  - `responseTimeMs` (number): Response time baseline in ms
  - `throughputOpsPerSec` (number): Throughput baseline

## Security

### `security`

**Type**: `object`
**Required**: For foundation tiers

Security configuration and requirements.

```json
{
  "security": {
    "sandboxed": true,
    "signatureRequired": true,
    "securityLevel": "foundation",
    "allowedOrigins": ["https://machshop.io"],
    "vulnerabilityScanRequired": true,
    "auditLog": true,
    "dataEncryption": {
      "atRest": true,
      "inTransit": true
    }
  }
}
```

**Properties**:
- `sandboxed` (boolean): Whether extension runs in sandbox
- `signatureRequired` (boolean): Whether code signing required
- `securityLevel` (string): "foundation" | "standard" | "restricted"
- `allowedOrigins` (array, optional): CORS origins
- `vulnerabilityScanRequired` (boolean): Whether vulnerability scanning required
- `auditLog` (boolean): Whether audit logging enabled
- `dataEncryption` (object, optional):
  - `atRest` (boolean): Encryption at rest
  - `inTransit` (boolean): Encryption in transit

## Governance

### `governance`

**Type**: `object`
**Required**: For foundation tiers

Governance and approval requirements.

```json
{
  "governance": {
    "requiresPlatformApproval": true,
    "approvalProcess": "standard",
    "certificationRequired": false,
    "certifications": [
      {
        "type": "ISO-9001",
        "certifier": "Quality Systems Inc",
        "validUntil": "2025-12-31"
      }
    ]
  }
}
```

**Properties**:
- `requiresPlatformApproval` (boolean): Whether approval required
- `approvalProcess` (string): "standard" | "expedited" | "security-review" | "compliance-review"
- `certificationRequired` (boolean, optional): Whether certification required
- `certifications` (array, optional): Current certifications:
  - `type` (string): Certification type
  - `certifier` (string): Issuing organization
  - `validUntil` (string): Expiration date (ISO 8601)

## Compliance

### `compliance`

**Type**: `object`
**Required**: For compliance extensions

Compliance and regulatory requirements.

```json
{
  "compliance": {
    "applicableRegulations": ["AS9100", "FAA"],
    "complianceModel": "enforced",
    "delegations": [
      {
        "aspect": "document-control",
        "delegatedTo": "quality-manager",
        "requiresSignoff": true,
        "documentation": "https://docs.company.io/doc-control",
        "auditTrail": true
      }
    ]
  }
}
```

**Properties**:
- `applicableRegulations` (array): Applicable regulations
- `complianceModel` (string): "enforced" | "enabled" | "delegated"
- `delegations` (array, optional): Compliance delegations:
  - `aspect` (string): Compliance aspect
  - `delegatedTo` (string): "quality-focal" | "quality-manager" | "site-manager" | "compliance-officer"
  - `requiresSignoff` (boolean): Whether signoff required
  - `documentation` (string): Documentation URL
  - `auditTrail` (boolean): Whether audit trail enabled

## Performance

### `performance`

**Type**: `object`
**Required**: No

Performance characteristics.

```json
{
  "performance": {
    "lazyLoad": true,
    "bundleSize": "150KB",
    "asyncCapable": true
  }
}
```

**Properties**:
- `lazyLoad` (boolean): Whether lazy loading supported
- `bundleSize` (string): Approximate bundle size
- `asyncCapable` (boolean): Whether async operations supported

## Complete Example

### Minimal v2.0 Manifest (Application Tier)

```json
{
  "id": "simple-dashboard",
  "version": "1.0.0",
  "name": "Simple Dashboard",
  "type": "ui-extension",
  "category": "dashboard-widget",
  "description": "Basic dashboard widget",
  "apiVersion": "v2.1",
  "mesVersion": "3.2.0",
  "extensionSchemaVersion": "2.0",
  "foundationTier": "application",
  "author": {
    "name": "Dev Team",
    "email": "dev@company.com"
  },
  "license": "MIT"
}
```

### Complete v2.0 Manifest (Foundation Tier)

```json
{
  "id": "work-order-validation",
  "version": "2.0.0",
  "name": "Work Order Validation",
  "type": "business-logic",
  "category": "workflow-hook",
  "description": "Comprehensive work order validation with material and equipment checks",
  "apiVersion": "v2.1",
  "mesVersion": "3.2.0",
  "extensionSchemaVersion": "2.0",
  "foundationTier": "foundation",
  "author": {
    "name": "MachShop Engineering",
    "email": "support@machshop.io",
    "url": "https://machshop.io"
  },
  "license": "Apache-2.0",
  "repository": "https://github.com/machshop/work-order-validation",
  "keywords": ["validation", "work-order", "business-logic"],
  "tags": ["manufacturing", "quality"],
  "documentation": {
    "guide": "https://docs.machshop.io/hooks/work-order-validation",
    "api": "https://docs.machshop.io/hooks/work-order-validation/api"
  },
  "dependencies": {
    "capabilities": [
      {
        "capability": "work-order-data",
        "minVersion": "v2"
      },
      {
        "capability": "material-availability",
        "minVersion": "v1"
      }
    ]
  },
  "conflicts": {
    "explicit": [
      {
        "id": "legacy-validation",
        "reason": "Incompatible validation engine"
      }
    ]
  },
  "capabilities": {
    "provides": [
      {
        "name": "work-order-validation",
        "version": "v2.0.0",
        "implements": ["validate", "checkMaterials", "checkEquipment"]
      }
    ],
    "hooks": [
      {
        "hook": "work-order:before-release",
        "phase": "pre",
        "priority": 100,
        "description": "Validates work order before release",
        "contract": "WorkOrderHookContract"
      }
    ]
  },
  "permissions": [
    "read:work-orders",
    "read:materials",
    "read:equipment"
  ],
  "configuration": {
    "properties": {
      "strictMode": {
        "type": "boolean",
        "description": "Enable strict validation",
        "default": false
      }
    }
  },
  "entryPoint": {
    "main": "dist/index.js",
    "module": "dist/index.mjs"
  },
  "requirements": {
    "nodeVersion": ">=16.0.0",
    "memory": "256MB"
  },
  "testing": {
    "hasTests": true,
    "coverage": 85,
    "testTypes": ["unit", "integration", "e2e"],
    "cicdIntegration": true,
    "performanceBaseline": {
      "responseTimeMs": 200
    }
  },
  "security": {
    "sandboxed": true,
    "signatureRequired": true,
    "securityLevel": "foundation",
    "vulnerabilityScanRequired": true,
    "auditLog": true
  },
  "governance": {
    "requiresPlatformApproval": true,
    "approvalProcess": "standard"
  },
  "releaseDate": "2024-11-01T00:00:00Z"
}
```

## Validation Rules

### Schema Validation

1. All required fields must be present
2. Field types must match specification
3. String patterns must be valid
4. Enum values must be valid
5. Array items must be valid objects
6. Required nested properties must be present

### Semantic Validation

1. IDs must be lowercase alphanumeric + hyphens
2. Versions must follow semantic versioning
3. Foundation tier determines required fields
4. Test coverage must meet tier requirements
5. Security configuration must match tier requirements
6. Governance requirements must be present for foundation tiers
7. Capabilities referenced in dependencies must exist elsewhere
8. Hooks must reference valid hook names
9. Widgets must reference valid slot names
10. Permissions must be from the valid permission set

### Conditional Validation

1. If `foundationTier` is "foundation" or "core-foundation":
   - `testing.hasTests` must be true
   - `testing.coverage` must be >= 80 (or >= 90 for core-foundation)
   - `testing.testTypes` is required
   - `security.sandboxed` must be true
   - `security.signatureRequired` must be true
   - `governance.requiresPlatformApproval` must be true

2. If `deprecated` is true:
   - `deprecationNotice` should be present

3. If `conflicts.policyExclusions` contains item with `scope: "capability"`:
   - `capability` field is required

4. If `compliance` is present:
   - `compliance.applicableRegulations` should be non-empty

## Error Messages

Common validation errors and resolutions:

| Error | Cause | Resolution |
|-------|-------|-----------|
| "extensionSchemaVersion must be '2.0'" | Wrong schema version | Update to "2.0" |
| "foundationTier is required" | Missing tier field | Add foundationTier |
| "id must match pattern" | Invalid ID format | Use kebab-case format |
| "version must follow semver" | Invalid version format | Use MAJOR.MINOR.PATCH |
| "coverage below minimum for tier" | Test coverage too low | Increase test coverage |
| "signatureRequired required for foundation" | Missing signature requirement | Add security.signatureRequired |
| "governance approval required for foundation" | Missing governance | Add governance config |
| "Capability 'foo' not found" | Invalid dependency | Check capability name |

## Version History

### v2.0.0 (November 2024)

- Initial v2.0 release
- Capability-based dependencies
- Foundation tier system
- Policy-based conflicts
- Compliance delegations
- Enhanced testing requirements
- Governance approval workflows
