# Extension Manifest v2.0 Migration Guide

**Version**: 1.0
**Updated**: November 2024
**Scope**: Migrating extensions from manifest schema v1.0 to v2.0

## Overview

The Extension Manifest v2.0 introduces a significant evolution in how extensions declare their dependencies, capabilities, and governance requirements. This guide walks you through the migration process and highlights the key changes.

### Why Upgrade to v2.0?

✅ **Capability-Based Dependencies**: Depend on ANY extension providing a capability instead of hardcoding specific extensions
✅ **Better Governance**: Foundation tiers require explicit testing, security, and approval configurations
✅ **Compliance Support**: Track applicable regulations and delegate compliance responsibilities
✅ **Enhanced Security**: Specify security levels, signing requirements, and encryption
✅ **Clearer Contracts**: Reference implementation contracts for hooks, widgets, and integrations
✅ **Policy-Based Conflicts**: Define conflicts at global, capability, or resource level

## Quick Migration Checklist

- [ ] Review manifest schema v1.0 structure
- [ ] Identify your extension type and foundation tier
- [ ] Update `extensionSchemaVersion` to "2.0"
- [ ] Add `foundationTier` field
- [ ] Convert `dependencies` to capability-based format
- [ ] Convert `conflicts` to new structure with `explicit` and `policyExclusions`
- [ ] Add `capabilities.provides` declarations
- [ ] Update `capabilities.hooks` with contract references
- [ ] Update `capabilities.ui.widgets` with slot and contract info
- [ ] Add testing requirements for foundation tiers
- [ ] Add security configuration
- [ ] Add governance requirements
- [ ] Add compliance information if applicable
- [ ] Test validation with `npx validate-extension`
- [ ] Update CI/CD pipelines

## Step-by-Step Migration

### Step 1: Update Schema Version and Foundation Tier

**Before (v1.0)**:
```json
{
  "id": "my-extension",
  "version": "1.0.0",
  "name": "My Extension",
  "extensionSchemaVersion": "1.0"
}
```

**After (v2.0)**:
```json
{
  "id": "my-extension",
  "version": "2.0.0",
  "name": "My Extension",
  "extensionSchemaVersion": "2.0",
  "foundationTier": "application"
}
```

**Foundation Tier Guide**:
- **`core-foundation`**: Core MES system extensions (highest requirements)
  - Test Coverage: 90% minimum
  - Requires: Sandboxing, signing, vulnerability scanning, audit logs
  - Approval: Yes (compliance-review)

- **`foundation`**: Critical enterprise extensions
  - Test Coverage: 80% minimum
  - Requires: Sandboxing, signing, vulnerability scanning, audit logs
  - Approval: Yes (standard)

- **`application`**: Standard application extensions
  - Test Coverage: 60% minimum (recommended 80%+)
  - Requires: Sandboxing, signing
  - Approval: Optional (standard)

- **`optional`**: Optional/nice-to-have extensions
  - Test Coverage: 50% minimum
  - Requires: Minimal
  - Approval: Optional

### Step 2: Convert Dependencies to Capability-Based Model

**Before (v1.0 - Specific Extension Dependencies)**:
```json
{
  "dependencies": {
    "quality-module": "^1.0.0",
    "lodash": "^4.17.0"
  }
}
```

**After (v2.0 - Capability-Based)**:
```json
{
  "dependencies": {
    "capabilities": [
      {
        "capability": "quality-data-provider",
        "minVersion": "v2",
        "provider": "quality-module"  // Optional: preferred provider
      },
      {
        "capability": "material-tracking",
        "minVersion": "v1"
      }
    ]
  }
}
```

**Key Changes**:
- Dependencies are now capability-based, not extension-specific
- Multiple extensions can provide the same capability
- Use `minVersion` for capability version constraints (format: vMAJOR or vMAJOR.MINOR)
- Use optional `provider` to specify preferred extension
- This allows for more flexibility in choosing implementations

### Step 3: Update Conflicts Configuration

**Before (v1.0 - Simple Conflicts)**:
```json
{
  "conflicts": [
    {
      "id": "legacy-quality-widget",
      "reason": "Incompatible data structure"
    }
  ]
}
```

**After (v2.0 - Explicit and Policy-Based)**:
```json
{
  "conflicts": {
    "explicit": [
      {
        "id": "legacy-quality-widget",
        "reason": "Incompatible data structure"
      }
    ],
    "policyExclusions": [
      {
        "scope": "capability",
        "capability": "quality-reporting",
        "policy": "strict-validation",
        "conflictsWith": ["lenient-validation", "legacy-validation"],
        "reason": "Incompatible validation policies"
      }
    ]
  }
}
```

**Policy-Based Scopes**:
- **`global`**: Conflicts with entire extensions
- **`capability`**: Conflicts when specific capabilities are enabled
- **`resource`**: Conflicts when specific resources are accessed

### Step 4: Declare Capabilities Provided

**New in v2.0 - What Your Extension Provides**:

```json
{
  "capabilities": {
    "provides": [
      {
        "name": "quality-reporting",
        "version": "v2.0.0",
        "implements": ["report", "analyze", "export"],
        "contract": "https://docs.machshop.io/contracts/quality-reporting",
        "policy": "strict-validation"
      }
    ]
  }
}
```

This allows other extensions to depend on your extension's capabilities.

### Step 5: Update Hook Registrations with Contracts

**Before (v1.0)**:
```json
{
  "capabilities": {
    "hooks": [
      {
        "hook": "work-order:before-release",
        "phase": "pre",
        "priority": 100
      }
    ]
  }
}
```

**After (v2.0 - With Contracts and Descriptions)**:
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

### Step 6: Update UI Widgets with Contracts and Slots

**Before (v1.0)**:
```json
{
  "capabilities": {
    "ui": {
      "widgets": ["quality-metrics-dashboard"]
    }
  }
}
```

**After (v2.0 - Detailed Widget Config)**:
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
          "permissions": ["read:quality", "read:work-orders"],
          "contract": "UIComponentContract"
        }
      ]
    }
  }
}
```

**New Widget Properties**:
- `id`: Unique widget identifier
- `name`: Human-readable widget name
- `category`: Widget classification
- `slots`: Array of slot IDs where widget can be placed
- `permissions`: Required permissions to view widget
- `contract`: Reference to component contract implementation

### Step 7: Add Testing Configuration for Foundation Tiers

**Before (v1.0 - Minimal)**:
```json
{
  "testing": {
    "hasTests": true,
    "coverage": 85
  }
}
```

**After (v2.0 - Foundation Tier Requirements)**:

For **foundation** or **core-foundation** tiers:
```json
{
  "testing": {
    "hasTests": true,
    "coverage": 90,  // 90% for core-foundation, 80% for foundation
    "testTypes": ["unit", "integration", "e2e"],
    "cicdIntegration": true,
    "performanceBaseline": {
      "memoryUsageMB": 256,
      "cpuUsagePercent": 15,
      "responseTimeMs": 500,
      "throughputOpsPerSec": 1000
    }
  }
}
```

For **application** tier:
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

### Step 8: Add Security Configuration

**Before (v1.0 - Basic)**:
```json
{
  "security": {
    "sandboxed": true,
    "allowedOrigins": ["https://machshop.io"]
  }
}
```

**After (v2.0 - Enhanced for Foundation Tiers)**:

For **foundation** or **core-foundation** tiers:
```json
{
  "security": {
    "sandboxed": true,
    "signatureRequired": true,
    "securityLevel": "foundation",
    "vulnerabilityScanRequired": true,
    "auditLog": true,
    "dataEncryption": {
      "atRest": true,
      "inTransit": true
    }
  }
}
```

For **application** tier:
```json
{
  "security": {
    "sandboxed": true,
    "signatureRequired": false,
    "securityLevel": "standard",
    "vulnerabilityScanRequired": false,
    "auditLog": false
  }
}
```

**Security Levels**:
- **`foundation`**: Strictest security, all checks required (for critical extensions)
- **`standard`**: Default security level (for most extensions)
- **`restricted`**: Minimal security (for optional, simple extensions)

### Step 9: Add Governance Configuration

**New in v2.0 - Governance Requirements**:

For **foundation** tiers:
```json
{
  "governance": {
    "requiresPlatformApproval": true,
    "approvalProcess": "standard"
  }
}
```

For **core-foundation** tier with compliance:
```json
{
  "governance": {
    "requiresPlatformApproval": true,
    "approvalProcess": "compliance-review",
    "certificationRequired": true,
    "certifications": [
      {
        "type": "AS9100-Compliance",
        "certifier": "Aerospace Quality Systems",
        "validUntil": "2026-02-28"
      }
    ]
  }
}
```

**Approval Process Options**:
- **`standard`**: Standard approval workflow
- **`expedited`**: Fast-track approval
- **`security-review`**: Security team review required
- **`compliance-review`**: Compliance officer review required

### Step 10: Add Compliance Information (If Applicable)

**New in v2.0 - Compliance Delegations**:

```json
{
  "compliance": {
    "applicableRegulations": ["AS9100", "FAA", "NADCAP"],
    "complianceModel": "enforced",
    "delegations": [
      {
        "aspect": "document-control",
        "delegatedTo": "quality-manager",
        "requiresSignoff": true,
        "documentation": "https://docs.company.io/doc-control",
        "auditTrail": true
      },
      {
        "aspect": "traceability",
        "delegatedTo": "quality-focal",
        "requiresSignoff": true,
        "documentation": "https://docs.company.io/traceability",
        "auditTrail": true
      }
    ]
  }
}
```

**Delegation Roles**:
- **`quality-focal`**: Quality focal point person
- **`quality-manager`**: Quality department manager
- **`site-manager`**: Site/plant manager
- **`compliance-officer`**: Compliance officer

**Compliance Models**:
- **`enforced`**: Compliance is mandatory
- **`enabled`**: Compliance is available but optional
- **`delegated`**: Compliance delegated to specific personnel

## Complete Migration Example

### Before (v1.0)

```json
{
  "id": "work-order-validation",
  "version": "1.0.0",
  "name": "Work Order Validation",
  "type": "business-logic",
  "category": "workflow-hook",
  "description": "Validates work orders before release",
  "apiVersion": "v2.1",
  "mesVersion": "3.2.0",
  "extensionSchemaVersion": "1.0",
  "author": {
    "name": "MachShop Engineering",
    "email": "support@machshop.io"
  },
  "license": "MIT",
  "dependencies": {
    "lodash": "^4.17.0"
  },
  "conflicts": [
    {
      "id": "legacy-validation",
      "reason": "Incompatible with new validation engine"
    }
  ],
  "capabilities": {
    "hooks": [
      {
        "hook": "work-order:before-release",
        "phase": "pre",
        "priority": 100
      }
    ]
  },
  "permissions": ["read:work-orders", "read:materials"],
  "configuration": {
    "properties": {
      "strictMode": {
        "type": "boolean",
        "default": false
      }
    }
  },
  "testing": {
    "hasTests": true,
    "coverage": 85
  },
  "security": {
    "sandboxed": true
  }
}
```

### After (v2.0)

```json
{
  "id": "work-order-validation",
  "version": "2.0.0",
  "name": "Work Order Validation",
  "type": "business-logic",
  "category": "workflow-hook",
  "description": "Validates work orders before release with enhanced material and equipment checks",
  "apiVersion": "v2.1",
  "mesVersion": "3.2.0",
  "extensionSchemaVersion": "2.0",
  "foundationTier": "foundation",
  "author": {
    "name": "MachShop Engineering",
    "email": "support@machshop.io"
  },
  "license": "MIT",
  "keywords": ["validation", "work-order", "business-logic"],
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
        "reason": "Incompatible with new validation engine"
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
  "permissions": ["read:work-orders", "read:materials"],
  "configuration": {
    "properties": {
      "strictMode": {
        "type": "boolean",
        "default": false,
        "description": "Enable strict validation mode"
      }
    }
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
  }
}
```

## Validation and Testing

### Validate Your Migration

Use the Extension Validation Framework to validate your updated manifest:

```bash
npm install @machshop/extension-validation-framework
npx validate-extension /path/to/extension
```

### Common Validation Errors

**Error: "extensionSchemaVersion must be 2.0"**
- Update the `extensionSchemaVersion` field to exactly "2.0"

**Error: "foundationTier is required"**
- Add `foundationTier` field with value: "core-foundation", "foundation", "application", or "optional"

**Error: "Testing coverage 60% below minimum 80% for foundation tier"**
- Increase test coverage to meet foundation tier requirements (80%+ for foundation, 90%+ for core-foundation)

**Error: "Capability-based dependencies required in v2.0"**
- Convert `dependencies.extensions` to `dependencies.capabilities` format

**Error: "security.signatureRequired required for foundation tier"**
- Add `security.signatureRequired: true` for foundation/core-foundation tiers

**Error: "governance.requiresPlatformApproval required for foundation tier"**
- Add governance configuration with approval process

## Migration Checklist by Extension Type

### UI Extensions

- [ ] Add `foundationTier` (typically "application")
- [ ] Update widgets with `id`, `name`, `category`, `slots`, `permissions`, `contract`
- [ ] Add capability-based dependencies
- [ ] Add testing configuration with `testTypes`
- [ ] Add security configuration
- [ ] Update component contracts if using component overrides

### Business Logic Extensions (Hooks)

- [ ] Add `foundationTier` (typically "foundation")
- [ ] Update hooks with `description` and `contract` reference
- [ ] Convert dependencies to capability-based format
- [ ] Add capability `provides` declaration
- [ ] Increase testing to 80%+ coverage with unit, integration, e2e
- [ ] Add full security configuration with signing
- [ ] Add governance approval requirement

### Data Extensions

- [ ] Add `foundationTier` (typically "application")
- [ ] Update dataSchema fields with descriptions and types
- [ ] Add compliance regulations if applicable
- [ ] Convert dependencies to capabilities
- [ ] Add compliance delegations if needed

### Integration Extensions

- [ ] Add `foundationTier` (typically "foundation")
- [ ] Update integrations with `contract` reference
- [ ] Add capability-based dependencies
- [ ] Increase test coverage to 80%+
- [ ] Add security configuration with encryption
- [ ] Add governance approval requirement
- [ ] Add compliance information if integrating with regulated systems

### Infrastructure Extensions

- [ ] Add `foundationTier` (typically "foundation")
- [ ] Update security configuration (may have sandboxed: false)
- [ ] Add full security level configuration
- [ ] Add audit logging requirements
- [ ] Add governance approval (security-review process)
- [ ] Add testing with security test type

### Compliance Extensions

- [ ] Add `foundationTier` (typically "core-foundation")
- [ ] Add compliance regulations
- [ ] Add compliance delegations with specific roles
- [ ] Maximize test coverage (95%+)
- [ ] Add full security configuration
- [ ] Set governance to compliance-review approval
- [ ] Add certification tracking

## Best Practices for v2.0

### 1. Capability Dependencies

✅ **Good**: Depend on capabilities, not specific extensions
```json
{
  "dependencies": {
    "capabilities": [
      { "capability": "quality-data-provider", "minVersion": "v2" }
    ]
  }
}
```

❌ **Avoid**: Hardcoding specific extensions
```json
{
  "dependencies": {
    "quality-module": "^1.0.0"
  }
}
```

### 2. Contract References

✅ **Good**: Reference contracts for all integration points
```json
{
  "hooks": [
    {
      "hook": "work-order:before-release",
      "contract": "WorkOrderHookContract"
    }
  ]
}
```

❌ **Avoid**: Vague hook definitions without contracts

### 3. Foundation Tier Matching

✅ **Good**: Match foundation tier to your extension's criticality
- Use "core-foundation" for system-critical extensions
- Use "foundation" for enterprise-critical business logic
- Use "application" for standard features
- Use "optional" for nice-to-have extensions

❌ **Avoid**: Using "core-foundation" for simple optional extensions

### 4. Security Configuration

✅ **Good**: Explicit security settings matching tier
```json
{
  "security": {
    "sandboxed": true,
    "signatureRequired": true,
    "securityLevel": "foundation",
    "vulnerabilityScanRequired": true
  }
}
```

❌ **Avoid**: Minimal security for critical extensions

### 5. Testing Requirements

✅ **Good**: Meet coverage requirements for foundation tier
```json
{
  "testing": {
    "coverage": 90,
    "testTypes": ["unit", "integration", "e2e"],
    "cicdIntegration": true
  }
}
```

❌ **Avoid**: Low test coverage for foundation-tier extensions

### 6. Governance

✅ **Good**: Include governance for foundation tiers
```json
{
  "governance": {
    "requiresPlatformApproval": true,
    "approvalProcess": "standard"
  }
}
```

❌ **Avoid**: Skipping governance for critical extensions

## Migration Timeline

1. **Phase 1** (Week 1): Review existing manifest and plan migration
2. **Phase 2** (Week 1-2): Update manifest structure and fields
3. **Phase 3** (Week 2): Update tests to meet v2.0 requirements
4. **Phase 4** (Week 2-3): Validate with v2.0 validator
5. **Phase 5** (Week 3): Update CI/CD pipelines
6. **Phase 6** (Week 3-4): Deploy and test in staging

## Rollback Strategy

If you need to revert to v1.0:

1. Keep a backup of the original v1.0 manifest
2. Test v1.0 version in parallel
3. Maintain both versions in your repository briefly
4. Switch back to v1.0 branch if needed
5. Once v2.0 is validated in production, remove v1.0

## FAQs

**Q: Do I need to update all my extensions at once?**
A: No, you can migrate extensions incrementally. The system supports both v1.0 and v2.0 manifests during transition.

**Q: What happens to my dependencies if I use v2.0 capability-based model?**
A: You declare which capabilities you need, and the system finds any extension providing that capability. This makes your extension more flexible.

**Q: Are foundation tier requirements mandatory?**
A: Yes, if your extension is classified as "foundation" or "core-foundation", it must meet the testing, security, and governance requirements.

**Q: Can I use v2.0 features with v1.0 schema?**
A: No, v2.0 features (like compliance delegations) require v2.0 schema. You must upgrade to use them.

**Q: What if my tests don't meet the 80% coverage requirement?**
A: Either increase test coverage or classify your extension as "application" tier instead of "foundation".

**Q: How do I know which approval process to use?**
A: Use "standard" for most extensions, "security-review" for auth/security extensions, and "compliance-review" for compliance/regulated extensions.

## Support

For questions or issues with migration:

1. Review the [Manifest Schema v2.0 Reference](./MANIFEST_SCHEMA_V2.md)
2. Check the [Validation Framework Documentation](../../packages/extension-validation-framework/README.md)
3. Review [Example Manifests](../../packages/extension-sdk/examples/)
4. Open a GitHub issue: https://github.com/machshop/issues

## Additional Resources

- [Manifest Schema v2.0 Reference](./MANIFEST_SCHEMA_V2.md)
- [Extension Validation Framework](../../packages/extension-validation-framework/README.md)
- [Extension Checklist](./EXTENSION_CHECKLIST.md)
- [UI Standards](./UI_STANDARDS.md)
- [Developer Guide](./DEVELOPER_GUIDE.md)
