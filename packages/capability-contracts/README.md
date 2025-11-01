# MachShop Capability Contracts

Foundation package that defines all available capabilities in the MachShop extension framework. This is the single source of truth for what capabilities extensions can provide and depend on.

## Purpose

A **capability contract** is a formal definition of a feature or service that:
1. Extensions can **provide** (implement and register)
2. Other extensions can **depend on** (require for functionality)
3. Multiple extensions can implement (capability-based dependency resolution)
4. Sites select their preferred provider of (per-site capability mapping)

## Structure

```
packages/capability-contracts/
├── README.md (this file)
├── src/
│   ├── contracts/
│   │   ├── index.ts (export all contracts)
│   │   ├── erp-integration.contract.ts
│   │   ├── work-instruction-authoring.contract.ts
│   │   ├── quality-compliance.contract.ts
│   │   └── ... (one file per capability)
│   ├── registry.ts (capability registry & resolution)
│   ├── validation.ts (contract validation utilities)
│   └── index.ts (public exports)
├── examples/
│   └── capability-usage.md
└── package.json
```

## Capability Categories

### 1. Data Integration Capabilities
- `erp-integration` - ERP system connectivity (SAP, Oracle, Plex, etc.)
- `equipment-integration` - Equipment/machinery data integration
- `quality-system-integration` - Quality system connectivity

### 2. Authoring Capabilities
- `work-instruction-authoring` - Work instruction creation/modification
- `routing-authoring` - Routing/process definition
- `work-order-management` - Work order lifecycle management

### 3. Compliance Capabilities
- `electronic-signature-validation` - E-signature compliance (FDA 21 CFR Part 11, etc.)
- `audit-trail-logging` - Comprehensive audit logging
- `compliance-reporting` - Compliance documentation and reporting

### 4. Data Management Capabilities
- `custom-field-storage` - Extension-provided custom fields
- `data-transformation` - Custom data transformation pipelines
- `data-export` - Data export in various formats

### 5. Infrastructure Capabilities
- `authentication-provider` - Custom authentication (SAML, OIDC, etc.)
- `storage-backend` - Custom data storage backend
- `caching-provider` - Custom caching implementation
- `monitoring-provider` - System monitoring and metrics

## Contract Definition Format

Each capability contract defines:

```typescript
interface CapabilityContract {
  // Unique identifier
  id: string;

  // Contract version (SemVer)
  version: string;

  // Human-readable name
  name: string;

  // Detailed description
  description: string;

  // Stability/maturity level
  stability: 'stable' | 'beta' | 'experimental';

  // Minimum MES version required to support this capability
  minMesVersion: string;

  // List of methods/APIs that implementations must provide
  interface: {
    methods: {
      name: string;
      description: string;
      parameters: ParameterDefinition[];
      returns: TypeDefinition;
      throws: ExceptionDefinition[];
    }[];
    events?: {
      name: string;
      description: string;
      payload: TypeDefinition;
    }[];
  };

  // Policies that may be enforced by implementations of this capability
  policies?: string[];

  // Default implementation (if any)
  defaultProvider?: string;

  // Extensions that can provide this capability
  knownProviders: string[];

  // Compliance/regulatory implications
  compliance?: {
    regulations: string[];
    signoffRequired: boolean;
  };

  // Example implementation manifest
  exampleManifest: CapabilityProvides;
}
```

## Usage Examples

### 1. Declaring Capability Dependency

In extension manifest:
```json
{
  "id": "my-erp-adapter",
  "dependencies": {
    "capabilities": [
      {
        "capability": "erp-integration",
        "minVersion": "v1.0",
        "provider": "sap-ebs-adapter"  // Optional: prefer specific provider
      }
    ]
  }
}
```

### 2. Providing a Capability

In extension manifest:
```json
{
  "id": "sap-ebs-adapter",
  "capabilities": {
    "provides": [
      {
        "name": "erp-integration",
        "version": "v1.0",
        "contract": "https://machshop.io/contracts/erp-integration/v1.0",
        "implements": ["getSKU", "createPO", "updateInventory"],
        "policy": "oauth-only"
      }
    ]
  }
}
```

### 3. Capability-Based Routing

At runtime, system resolves which provider to use:
```typescript
const erpProvider = await capabilityRegistry.resolve(
  siteId,
  'erp-integration',
  'v1.0'
);
// Returns the activated extension that provides this capability at this site
```

## Version Constraints

Capability versions follow SemVer:
- `v1.0` - Initial release
- `v1.1` - Backward-compatible additions (new optional methods)
- `v1.2` - More backward-compatible features
- `v2.0` - Breaking changes (requires contract migration)

Dependency constraints:
- `v1.0` - Exact match
- `v1` - Any v1.x version
- `v1.5+` - v1.5 or later
- `v1.0..v2.0` - Range

## Policy Declaration

Capabilities can declare policies that affect conflict resolution:

```typescript
{
  "name": "work-instruction-authoring",
  "policies": [
    "mes-authoring",    // Work instructions authored in MES
    "plm-authoring",    // Work instructions from PLM system
    "external-authoring" // Work instructions from external system
  ]
}
```

An extension implementing this capability chooses which policy it enforces:
```json
{
  "capabilities": {
    "provides": [
      {
        "name": "work-instruction-authoring",
        "version": "v1.0",
        "policy": "mes-authoring"
      }
    ]
  }
}
```

Then other extensions can conflict based on policy:
```json
{
  "conflicts": {
    "policyExclusions": [
      {
        "scope": "capability",
        "capability": "work-instruction-authoring",
        "policy": "mes-authoring",
        "conflictsWith": ["plm-authoring", "external-authoring"]
      }
    ]
  }
}
```

## Capability Registry

The registry provides:

1. **Capability Discovery**: List all available capabilities
2. **Contract Retrieval**: Get contract details for a capability
3. **Provider Resolution**: Find which extensions provide a capability
4. **Version Resolution**: Resolve version constraints (SemVer matching)
5. **Provider Selection**: Get preferred provider for a site
6. **Conflict Detection**: Detect incompatible capability policies

## Next Steps

1. Define all core capabilities (20-30 contracts)
2. Create contract interfaces (TypeScript types for each capability)
3. Build capability registry service
4. Create validation utilities
5. Document each capability with examples
6. Create migration guide for v1 dependencies → v2 capabilities
