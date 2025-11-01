# Component Override Framework

**Version**: 2.0.0

The Component Override Framework provides a safe, contract-based system for extensions to override core MachShop components while maintaining type safety, compatibility, and stability.

## Overview

This framework enables extensions to:

- ✅ **Override core components** - Replace components with custom implementations
- ✅ **Validate contracts** - Ensure overrides match the component interface
- ✅ **Check compatibility** - Detect breaking changes and incompatibilities
- ✅ **Fallback gracefully** - Automatically use fallback component on errors
- ✅ **Manage policies** - Configure override permissions per site
- ✅ **Track usage** - Monitor override usage and performance
- ✅ **Audit changes** - Track who modified components and when

## Installation

```bash
npm install @machshop/component-override-framework
```

## Core Concepts

### Component Contracts

A contract defines the interface that a component must implement.

```typescript
import type { ComponentContract } from '@machshop/component-override-framework';

const productionPageContract: ComponentContract = {
  id: 'core:production-page',
  name: 'Production Page',
  version: '1.0.0',
  requiredProps: [
    {
      name: 'workOrderId',
      type: 'string',
      required: true,
      description: 'The work order ID',
    },
    {
      name: 'onStatusChange',
      type: '(status: string) => void',
      required: true,
      description: 'Callback when status changes',
    },
  ],
  optionalProps: [
    {
      name: 'theme',
      type: 'light | dark',
      required: false,
      defaultValue: 'light',
    },
  ],
  hooks: ['useProductionData', 'useWorkOrderUpdates'],
  dependencies: ['EquipmentStore', 'MaterialsStore'],
  category: 'pages',
};
```

### Component Overrides

Override a component by providing a new implementation.

```typescript
import { useRegisterComponentOverride } from '@machshop/component-override-framework';

export function MyExtension() {
  const result = useRegisterComponentOverride({
    contractId: 'core:production-page',
    component: CustomProductionPage,
    extensionId: 'my-extension',
    siteId: 'site-123',
    fallback: DefaultProductionPage, // Used if override errors
    priority: 100,
  });

  if (!result.registered) {
    console.error('Failed to register override:', result.validation.errors);
  }

  return <div>Override Registered</div>;
}
```

### Safety Features

The framework provides multiple layers of safety:

1. **Contract Validation** - Ensures override matches contract requirements
2. **Type Checking** - Validates prop types match contract definitions
3. **Dependency Resolution** - Checks dependencies are available
4. **Compatibility Analysis** - Detects breaking changes
5. **Fallback Mechanism** - Automatically reverts to original on error
6. **Policy Enforcement** - Respects site approval policies
7. **Usage Tracking** - Monitors override usage and errors
8. **Audit Trail** - Records all override changes

## Validation System

### Validation Process

```
1. Register Override
   ↓
2. Validate Against Contract
   - Check required props present
   - Verify prop types match
   - Validate hooks usage
   - Run custom validators
   ↓
3. Check Compatibility
   - Version compatibility
   - Breaking changes
   - Dependency availability
   ↓
4. Store in Registry
   ↓
5. Apply or Queue for Approval
```

### Validation Results

```typescript
const result = useRegisterComponentOverride(override);

result.validation    // ValidationResult with errors/warnings
result.compatibility // CompatibilityCheckResult with issues
result.registered    // Boolean whether registration succeeded
```

## Using Overridable Components

### Get Override or Default

```typescript
import { useOverridableComponent } from '@machshop/component-override-framework';

export function ProductionPage() {
  const ProductionComponent = useOverridableComponent(
    'core:production-page',
    DefaultProductionPage,
    FallbackProductionPage // Used if override errors
  );

  return <ProductionComponent workOrderId="WO-123" />;
}
```

### Direct Override Lookup

```typescript
import { useComponentOverride } from '@machshop/component-override-framework';

export function ProductionPage() {
  const { siteId } = useExtensionContext();
  const ProductionComponent = useComponentOverride('core:production-page', siteId);

  if (!ProductionComponent) {
    return <DefaultProductionPage />;
  }

  return <ProductionComponent {...props} />;
}
```

## Approval Workflows

### Override Safety Policy

Configure override policies per site.

```typescript
interface OverrideSafetyPolicy {
  // Allow/disallow all overrides
  allowOverrides: boolean;

  // Require approval for each override
  requireApprovalForOverrides: boolean;

  // Roles that can approve
  approverRoles: string[];

  // Components that cannot be overridden
  protectedContracts: string[];

  // Extensions allowed to override (whitelist)
  allowedExtensions?: string[];

  // Maximum override depth (stack)
  maxOverrideDepth: number;

  // Require fallback component
  requireFallback: boolean;

  // Auto-rollback threshold (% errors)
  autoRollbackThreshold?: number;
}
```

### Approval Flow

```
1. Extension requests override
2. Policy checked:
   - Requires approval? → Create approval request
   - Allowed extension? → Allow/block
   - Protected contract? → Prevent override
3. If approved:
   - Validate against contract
   - Check compatibility
   - Activate override
4. If rejected:
   - Notify extension
   - Keep original component
```

## Components

### OverridesList

Display all registered overrides with status.

```typescript
import { OverridesList } from '@machshop/component-override-framework';

export function AdminDashboard() {
  return (
    <div>
      <h2>Component Overrides</h2>
      <OverridesList />
    </div>
  );
}
```

Features:
- List all overrides with status
- Show validation results
- Display compatibility warnings
- Track usage statistics
- Permission-aware display

### OverrideValidationResults

Show detailed validation results for an override.

```typescript
import { OverrideValidationResults } from '@machshop/component-override-framework';

export function OverrideDetails({ entry }) {
  return <OverrideValidationResults entry={entry} />;
}
```

### OverrideStatusBadge

Quick status indicator for an override.

```typescript
import { OverrideStatusBadge } from '@machshop/component-override-framework';

// Display override status
<OverrideStatusBadge status="active" />
```

## Hooks

### useRegisterComponentOverride

Register a component override.

```typescript
const result = useRegisterComponentOverride({
  contractId: 'core:component-id',
  component: MyComponent,
  extensionId: 'my-extension',
  siteId: 'site-123',
  fallback: DefaultComponent,
  priority: 100,
});

// result.validation     - Validation errors
// result.compatibility  - Compatibility issues
// result.registered     - Success boolean
```

### useComponentOverride

Get the active override for a component.

```typescript
const OverrideComponent = useComponentOverride('core:component-id', siteId);

if (OverrideComponent) {
  return <OverrideComponent {...props} />;
}
```

### useOverridableComponent

Get override or default component.

```typescript
const Component = useOverridableComponent(
  'core:component-id',
  DefaultComponent,
  FallbackComponent
);

return <Component {...props} />;
```

### useOverrideValidation

Validate an override against a contract.

```typescript
const { validation, compatibility, canUseOverride, warnings } = useOverrideValidation(
  override,
  contract
);

if (!canUseOverride) {
  console.warn('Override cannot be used:', warnings);
}
```

### useOverrideAnalytics

Track override usage and errors.

```typescript
const { recordComponentUsage, recordComponentError, getMetrics } = useOverrideAnalytics(
  overrideId
);

// Record when component is used
recordComponentUsage();

// Record when component errors
try {
  // ... component logic
} catch (error) {
  recordComponentError(error, true); // true = fallback active
}

// Get metrics
const metrics = getMetrics();
console.log(`Render time: ${metrics.renderTime}ms`);
```

## Best Practices

### 1. Always Provide Fallback

```typescript
// ✅ Do - provide fallback
const result = useRegisterComponentOverride({
  contractId: 'core:page',
  component: MyComponent,
  fallback: DefaultComponent, // Required by policy
});

// ❌ Don't - no fallback
const result = useRegisterComponentOverride({
  contractId: 'core:page',
  component: MyComponent,
});
```

### 2. Match Contract Exactly

```typescript
// ✅ Do - match contract props
interface Props {
  workOrderId: string; // Required in contract
  onStatusChange: (status: string) => void; // Required in contract
  theme?: 'light' | 'dark'; // Optional in contract
}

// ❌ Don't - missing required props
interface Props {
  onStatusChange: (status: string) => void; // Missing workOrderId
}
```

### 3. Validate Prop Types

```typescript
// ✅ Do - correct types
interface Props {
  count: number; // Contract requires number
  onUpdate: (value: string) => void; // Contract requires this signature
}

// ❌ Don't - wrong types
interface Props {
  count: string; // Contract requires number
  onUpdate: () => void; // Missing parameter
}
```

### 4. Handle Errors Gracefully

```typescript
// ✅ Do - catch and log errors
try {
  return <OverrideComponent {...props} />;
} catch (error) {
  recordComponentError(error, true);
  return <FallbackComponent {...props} />;
}

// ❌ Don't - let errors propagate
return <OverrideComponent {...props} />;
```

### 5. Test Override Compatibility

```typescript
// ✅ Do - validate before using
const { validation, compatibility } = useOverrideValidation(override, contract);

if (!validation.valid) {
  console.error('Validation failed:', validation.errors);
  return null;
}

// ❌ Don't - use without validation
return <OverrideComponent {...props} />;
```

## Common Use Cases

### Override a Page Component

```typescript
export function MyExtension() {
  useRegisterComponentOverride({
    contractId: 'core:production-page',
    component: CustomProductionPage,
    extensionId: 'my-extension',
    siteId: 'site-123',
    fallback: DefaultProductionPage,
    priority: 100,
  });

  return null; // Registration handled automatically
}
```

### Override with Custom Validation

```typescript
useRegisterComponentOverride({
  contractId: 'core:dashboard',
  component: CustomDashboard,
  extensionId: 'my-extension',
  siteId: 'site-123',
  customValidator: (component, props) => {
    // Custom validation logic
    return {
      valid: true,
      errors: [],
      warnings: [],
    };
  },
});
```

### Stack Multiple Overrides

```typescript
// First extension overrides component
useRegisterComponentOverride({
  contractId: 'core:report',
  component: FirstOverride,
  priority: 100,
});

// Second extension overrides with higher priority
useRegisterComponentOverride({
  contractId: 'core:report',
  component: SecondOverride,
  priority: 200, // Applied first
});

// SecondOverride is used, FirstOverride not applied
```

## Type Definitions

See the `types.ts` file for comprehensive type definitions:

- `ComponentContract` - Component interface definition
- `ComponentOverrideDeclaration` - Override registration
- `OverrideRegistryEntry` - Stored override with validation
- `OverrideSafetyPolicy` - Site override policy
- `ValidationResult` - Validation output
- `CompatibilityCheckResult` - Compatibility analysis

## Store

Access override state directly for advanced usage.

```typescript
import { useComponentOverrideStore } from '@machshop/component-override-framework';

export function OverrideDebug() {
  const { contracts, overrides, registry, getPolicy } = useComponentOverrideStore();

  return <pre>{JSON.stringify({ contracts, overrides }, null, 2)}</pre>;
}
```

## Migration from v1.0

This framework replaces previous override patterns with a contract-based system that ensures:

- Type safety and compatibility checking
- Fallback mechanisms for reliability
- Policy-based approval workflows
- Usage tracking and analytics

See `MIGRATION.md` for upgrade instructions.

## Support

- **Documentation**: `/docs/component-override-framework`
- **Examples**: `/examples/component-overrides`
- **Issues**: GitHub Issues
- **Support**: MachShop Support Portal

## Related Packages

- `@machshop/frontend-extension-sdk` - Core extension utilities
- `@machshop/navigation-extension-framework` - Navigation management
- `@machshop/ui-extension-contracts` - Component contracts

## License

MIT
