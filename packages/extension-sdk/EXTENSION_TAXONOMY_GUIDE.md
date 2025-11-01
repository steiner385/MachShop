# MachShop Extension Type Taxonomy & Manifest Schema v1.0

Complete guide to the MachShop extension system, extension types, and manifest specification.

## Table of Contents

1. [Overview](#overview)
2. [Extension Type Taxonomy](#extension-type-taxonomy)
3. [Manifest Schema v1.0](#manifest-schema-v10)
4. [Validation Rules](#validation-rules)
5. [Configuration Guide](#configuration-guide)
6. [Dependencies & Conflicts](#dependencies--conflicts)
7. [Capabilities Declaration](#capabilities-declaration)
8. [Examples](#examples)
9. [Schema Evolution](#schema-evolution)
10. [Migration Guide](#migration-guide)

---

## Overview

The MachShop Extension Framework provides a standardized, type-safe system for extending the manufacturing execution system (MES) platform. This taxonomy and manifest schema form the foundation for:

- **Consistent Extension Classification**: Clear categorization of extension types and purposes
- **Conflict Detection**: Identification of incompatible extensions
- **Dependency Management**: Version constraint resolution
- **Capability Declaration**: Explicit declaration of provided functionality
- **Security & Validation**: Signature verification and permission control

### Key Principles

1. **Type Safety**: All extensions declare their type and category explicitly
2. **Compatibility**: Extensions declare dependencies and conflicts upfront
3. **Transparency**: Capabilities and permissions are explicitly declared
4. **Extensibility**: Schema supports future evolution while maintaining backward compatibility
5. **Validation**: Multiple validation layers ensure manifest integrity

---

## Extension Type Taxonomy

The 6-tier taxonomy enables clear categorization and compatibility analysis:

### Tier 1: UI Extensions (Frontend)

**Purpose**: Extend and customize the user interface

**Includes**:
- Dashboard widgets
- Page extensions
- Component overrides
- Themes
- Report templates

**Conflict Risk**: Medium (route/namespace collisions)

**Examples**:
- Quality metrics dashboard
- Production status widget
- Custom report template

**Capabilities**:
```json
{
  "capabilities": {
    "ui": {
      "widgets": ["quality-metrics-dashboard"],
      "pages": ["custom-reports"],
      "components": ["custom-report-header"]
    }
  }
}
```

---

### Tier 2: Business Logic Extensions

**Purpose**: Extend and modify application business logic

**Includes**:
- Workflow hooks
- Validation rules
- Calculation engines
- State machines
- Business rules

**Conflict Risk**: High (execution order, data mutation conflicts)

**Examples**:
- Work order validation hook
- Routing optimization algorithm
- Workflow enforcement rule

**Capabilities**:
```json
{
  "capabilities": {
    "hooks": [
      {
        "hook": "work-order:before-release",
        "phase": "pre",
        "priority": 100
      },
      {
        "hook": "work-order:after-update",
        "phase": "post",
        "priority": 50
      }
    ]
  }
}
```

---

### Tier 3: Data Extensions (Schema)

**Purpose**: Extend the data model with custom fields and entities

**Includes**:
- Custom fields
- Custom entities
- Relationships
- Computed fields
- Virtual entities

**Conflict Risk**: High (schema migrations, relationship cycles)

**Examples**:
- Industry-specific attributes
- Custom quality metrics
- Supplier-specific fields

**Capabilities**:
```json
{
  "capabilities": {
    "dataSchema": {
      "entities": ["custom-inspection"],
      "fields": [
        "work-order.certification-level",
        "quality.defect-category"
      ]
    }
  }
}
```

---

### Tier 4: Integration Extensions

**Purpose**: Connect external systems

**Includes**:
- ERP adapters (SAP, Oracle, NetSuite)
- Equipment integration
- Quality systems
- Document management
- Identity providers

**Conflict Risk**: Medium (endpoint/auth conflicts)

**Examples**:
- SAP ERP bi-directional sync
- TeamCenter PDM integration
- CMM equipment driver

**Capabilities**:
```json
{
  "capabilities": {
    "integrations": [
      {
        "system": "SAP ERP",
        "version": "S/4HANA 2023+"
      }
    ]
  }
}
```

---

### Tier 5: Compliance & Regulatory Extensions

**Purpose**: Enforce regulatory and compliance requirements

**Includes**:
- Aerospace (AS9100, NADCAP, ITAR)
- Medical Device (FDA, ISO 13485)
- Automotive (IATF 16949)
- Quality (ISO 9001)

**Conflict Risk**: Low-Medium (overlapping requirements)

**Examples**:
- AS9100 compliance module
- FDA 21 CFR Part 11 module
- ITAR export control module

**Validation Requirements**:
- Stricter audit trail enforcement
- Enhanced permission checks
- Mandatory documentation
- Signature requirement for manifests

---

### Tier 6: Infrastructure Extensions

**Purpose**: Extend system infrastructure and services

**Includes**:
- Custom auth providers
- Storage backends
- Caching systems
- Monitoring and logging
- Migration tools

**Conflict Risk**: High (infrastructure-level conflicts)

**Examples**:
- Azure AD authentication provider
- Redis caching backend
- Custom logging service

**Requirements**:
- System-level permissions
- May require restart
- Infrastructure resources

---

## Manifest Schema v1.0

### File Format

Extension manifests are JSON files named `manifest.json` located in the extension root directory.

### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | string | Unique extension identifier (kebab-case) | `quality-dashboard-widget` |
| `version` | string | Semantic version (MAJOR.MINOR.PATCH) | `1.2.0` |
| `name` | string | Human-readable extension name | `Quality Dashboard Widget` |
| `type` | enum | Extension type (6 tiers) | `ui-extension` |
| `category` | enum | Extension category | `dashboard-widget` |
| `description` | string | Detailed description | `Real-time quality metrics...` |
| `apiVersion` | string | Min required API version (vMAJOR.MINOR) | `v2.1` |
| `mesVersion` | string | Min required MES version (MAJOR.MINOR.PATCH) | `3.2.0` |
| `extensionSchemaVersion` | string | Manifest schema version | `1.0` |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `author` | object | Author/organization information |
| `license` | enum | Software license |
| `repository` | string | Source code repository URL |
| `homepage` | string | Extension homepage/documentation |
| `documentation` | object | Links to documentation resources |
| `keywords` | array | Search keywords/tags |
| `dependencies` | object | Required extensions (version constraints) |
| `conflicts` | array | Incompatible extensions |
| `capabilities` | object | Declared functionality |
| `permissions` | array | Required permissions |
| `configuration` | object | Configuration schema |
| `entryPoint` | object | Module entry points |
| `requirements` | object | System requirements |
| `testing` | object | Testing information |
| `security` | object | Security configuration |
| `performance` | object | Performance hints |
| `tags` | array | Additional tags |
| `releaseDate` | string | ISO 8601 release date |
| `deprecated` | boolean | Deprecation status |
| `deprecationNotice` | string | Deprecation message |

### Field Constraints

#### ID Format
- Pattern: `^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$`
- Length: 3-64 characters
- Rule: Lowercase, kebab-case only
- Global: Must be unique in registry

#### Version Format
- SemVer: `MAJOR.MINOR.PATCH[-prerelease][+build]`
- Examples: `1.0.0`, `2.1.0-alpha.1`, `1.0.0+build.123`

#### API Version
- Format: `vMAJOR.MINOR`
- Examples: `v2.1`, `v3.0`

#### MES Version
- Format: `MAJOR.MINOR.PATCH`
- Examples: `3.2.0`, `3.3.1`

---

## Validation Rules

### Schema Validation (JSON Schema v7)

All manifests are validated against `manifest.schema.json` which enforces:

1. Required field presence
2. Type correctness
3. Format validation (email, URI, date-time)
4. Enum constraints
5. Pattern matching for ID and versions
6. Array/object structure validation

### Semantic Validation

Additional runtime validation includes:

1. **ID Format**: Kebab-case, lowercase only
2. **Version Format**: Valid SemVer
3. **No Self-Dependencies**: Extension cannot depend on itself
4. **Hook Priorities**: Must be 0-1000
5. **Configuration Requirements**: All required keys must have property definitions
6. **Capability Matching**: UI extensions should declare UI capabilities, hooks extensions should declare hook capabilities
7. **Deprecated Notice**: Deprecated extensions must include deprecation notice
8. **Test Coverage**: Extensions should have >50% test coverage

### Validation Timing

Manifest validation occurs at:
- **Build Time**: During extension development
- **Registration**: When registering with MachShop registry
- **Installation**: When installing extension in production

---

## Configuration Guide

### Configuration Schema

Extensions declare their configuration options using a subset of JSON Schema:

```json
{
  "configuration": {
    "required": ["apiKey", "endpoint"],
    "properties": {
      "apiKey": {
        "type": "string",
        "description": "API authentication key"
      },
      "endpoint": {
        "type": "string",
        "format": "uri",
        "description": "Service endpoint URL"
      },
      "timeout": {
        "type": "integer",
        "default": 30,
        "description": "Timeout in seconds"
      },
      "mode": {
        "type": "string",
        "enum": ["test", "production"],
        "default": "production"
      }
    }
  }
}
```

### Configuration Validation

- Required fields must be present at installation time
- Types must match schema definition
- Enums must match specified values
- Format validators (uri, email, etc.) are applied

---

## Dependencies & Conflicts

### Declaring Dependencies

Extensions declare dependencies on other extensions:

```json
{
  "dependencies": {
    "base-quality-module": "^2.0.0",
    "data-analytics": ">=1.5.0",
    "ui-framework": "1.2.0"
  }
}
```

**Version Constraint Format**:
- Caret (`^`): Compatible version - `^1.2.0` allows `1.x.x >= 1.2.0`
- Tilde (`~`): Reasonably close - `~1.2.0` allows `1.2.x >= 1.2.0`
- Greater/Less: `>=1.0.0`, `<=2.0.0`
- Exact: `1.2.0`

### Declaring Conflicts

Extensions declare incompatible extensions:

```json
{
  "conflicts": [
    {
      "id": "legacy-quality-widget",
      "reason": "Incompatible data structure"
    },
    {
      "id": "competing-dashboard",
      "reason": "Cannot coexist due to namespace collision"
    }
  ]
}
```

### Conflict Resolution

The system prevents installation of conflicting extensions:
1. Check conflicts during installation
2. Prevent simultaneous activation of conflicting extensions
3. Provide clear error messages with conflict information

---

## Capabilities Declaration

### UI Capabilities

```json
{
  "capabilities": {
    "ui": {
      "widgets": ["quality-dashboard", "material-tracking"],
      "pages": ["reports", "analytics"],
      "components": ["quality-chart", "trend-analyzer"],
      "reports": ["daily-summary", "weekly-analysis"]
    }
  }
}
```

### Hook Capabilities

```json
{
  "capabilities": {
    "hooks": [
      {
        "hook": "work-order:before-release",
        "phase": "pre",
        "priority": 100
      },
      {
        "hook": "work-order:after-completion",
        "phase": "post",
        "priority": 50
      }
    ]
  }
}
```

**Hook Phases**:
- `pre`: Runs before core handler
- `core`: Replaces or wraps core handler
- `post`: Runs after core handler

**Priority**: 0-1000 (higher = earlier execution)

### Data Schema Capabilities

```json
{
  "capabilities": {
    "dataSchema": {
      "entities": ["custom-inspection", "vendor-tracking"],
      "fields": [
        "work-order.certification-level",
        "quality.defect-root-cause",
        "material.supplier-batch"
      ]
    }
  }
}
```

### Integration Capabilities

```json
{
  "capabilities": {
    "integrations": [
      {
        "system": "SAP ERP",
        "version": "S/4HANA 2023+"
      },
      {
        "system": "Oracle Manufacturing",
        "version": "21c"
      }
    ]
  }
}
```

---

## Examples

See `examples/` directory for complete manifest examples:

1. **UI Widget**: `ui-widget-example.manifest.json`
   - Dashboard widget for quality metrics
   - UI capabilities, React dependencies

2. **Business Logic**: `business-logic-example.manifest.json`
   - Work order validation hook
   - Hook capabilities, business rule execution

3. **Data Extension**: `data-extension-example.manifest.json`
   - Aerospace custom fields
   - Schema extension, compliance configuration

4. **Integration**: `integration-example.manifest.json`
   - SAP ERP adapter
   - External system integration, bidirectional sync

5. **Compliance**: `compliance-example.manifest.json`
   - AS9100 compliance module
   - Regulatory requirements, audit trail

6. **Infrastructure**: `infrastructure-example.manifest.json`
   - Azure AD authentication
   - Auth provider, enterprise integration

---

## Schema Evolution

### Versioning Strategy

- **Schema Version**: Semantic versioning (e.g., 1.0, 2.0)
- **Breaking Changes**: Major version bump
- **New Features**: Minor version bump (backward compatible)
- **Manifest Field**: `extensionSchemaVersion` must match deployment schema version

### Backward Compatibility

- New optional fields don't break existing manifests
- Required fields changes require major version bump
- Field deprecation follows 2-version grace period
- Migration tools provided for version upgrades

### Future Enhancements

Potential future extensions to schema:

- AI-generated hints and suggestions
- Performance profiles and benchmarks
- User rating and reviews
- Security vulnerability scoring
- Deployment frequency and adoption metrics

---

## Migration Guide

### Upgrading Manifests

When new schema versions are released:

1. **Review Breaking Changes**: Check release notes
2. **Update extensionSchemaVersion**: Update field to new version
3. **Add New Optional Fields**: As applicable
4. **Validate**: Use validation CLI tool
5. **Test**: Verify extension still functions
6. **Deploy**: Release updated extension

### Migration Tooling

Use the migration CLI tool:

```bash
extension-manifest-migrate --from 1.0 --to 2.0 manifest.json
```

### Support

- Reference migration guide for each version
- Breaking changes clearly documented
- Deprecation warnings provided in advance
- Community support via issues/discussions

---

## Related Documents

- [Manifest Validation API](./docs/validation-api.md)
- [CLI Tool Reference](./docs/cli-reference.md)
- [Extension Development Guide](./docs/development-guide.md)
- [Compatibility Matrix Service](../issue-404-compatibility-matrix.md)
- [Dependency Resolution Engine](../issue-405-dependency-resolution.md)
- [Conflict Detection Engine](../issue-409-conflict-detection.md)

---

## Support & Feedback

For questions or feedback on the manifest schema:

1. **Documentation**: https://docs.machshop.io/extensions
2. **Issues**: https://github.com/machshop/extension-sdk/issues
3. **Email**: extensions@machshop.io
4. **Community**: https://community.machshop.io

---

**Last Updated**: 2024-11-01
**Schema Version**: 1.0
**Status**: Stable
