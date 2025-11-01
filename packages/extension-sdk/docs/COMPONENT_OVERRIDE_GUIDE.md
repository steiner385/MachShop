# Component Override Safety System Guide

## Overview

The Component Override Safety System (Issue #428) provides a secure, controlled mechanism for extensions to override existing UI components while maintaining system stability, performance, and compliance.

## Quick Start

### Basic Override Registration

```typescript
import { OverrideRegistry } from '@extension-sdk/overrides';

const registry = new OverrideRegistry();

// Register an override
const override = await registry.registerOverride({
  overridesComponentId: 'work-order-form',
  component: CustomWorkOrderForm,
  reason: 'Custom fields required for site XYZ',
  extensionId: 'my-extension',
  version: '1.0.0',
  testingReport: 'https://ci.example.com/reports/test-123',
  fallbackComponent: OriginalWorkOrderForm,
  scopedToSites: ['site-xyz'],
});
```

### Using in React Components

```typescript
import { withOverride, useComponentOverride } from '@extension-sdk/overrides';

// HOC approach
const FormWithOverride = withOverride(OriginalForm, 'work-order-form');

// Hook approach
function MyComponent() {
  const { override, metrics, activateOverride, rollback } = useComponentOverride('work-order-form');

  return (
    <div>
      {override && <p>Using override: {override.id}</p>}
      {metrics && <OverrideMetrics override={override} />}
    </div>
  );
}
```

## Core Concepts

### 1. Override Registry

Central registry managing all component overrides with support for:
- Component override registration/unregistration
- Active override resolution
- Site-scoped override management
- Event system for real-time updates

### 2. Override Validator

Validates overrides ensuring:
- All required fields are present
- Component contracts are satisfied
- Version constraints are compatible
- No conflicts with existing overrides
- Test reports are valid

### 3. Fallback Mechanism

Every override can specify a fallback component that renders if:
- Override fails to load
- Runtime error occurs during render
- Override disabled due to performance issues
- User manually triggers fallback

### 4. Approval Workflow

For risky overrides (breaking changes, core components), governance workflow:
1. Extension submits override with justification
2. Override enters PENDING_APPROVAL status
3. Admin reviews: test coverage, breaking changes, conflicts
4. Approval moves override to ACTIVE status

### 5. Gradual Rollout

Multi-phase deployment strategy:
- **Single Site**: Test in one site for 24+ hours
- **Regional**: Expand to region after success
- **Global**: Full deployment after regional validation

### 6. Performance Monitoring

Automatic tracking of:
- Load time (vs. original component)
- Error rates
- Accessibility score
- Test coverage

Auto-rollback triggered if:
- Error rate > 10%
- Accessibility score < 60%
- Load time degradation > 100ms (configurable)

## Override Status States

```
PENDING_APPROVAL → APPROVED → ACTIVE
                  └─ FAILED

ACTIVE → PAUSED
      → ROLLED_BACK
      → FAILED
      → DEPRECATED
```

## API Reference

### OverrideRegistry

**Core Methods:**
- `registerOverride(declaration)` - Register new override
- `unregisterOverride(id)` - Remove override
- `getActiveOverride(componentId, siteId?)` - Get active override
- `activateOverride(id)` - Activate approval override
- `approveOverride(id, approvedBy, comment?)` - Approve pending override
- `rollback(id, reason, initiatedBy)` - Rollback deployment

**Rollout Methods:**
- `initiateRollout(id, initialSite)` - Start single-site rollout
- `advanceRollout(id, sites)` - Advance to next phase
- `getRolloutStatus(id)` - Get current rollout state

**Query Methods:**
- `queryOverrides(options)` - Query overrides with filtering
- `getPendingRequests()` - Get pending approval requests
- `getOverridesForComponent(componentId)` - Get all overrides for component

**Event Methods:**
- `onOverrideEvent(listener)` - Subscribe to override events
- `updateMetrics(id, metrics)` - Update performance metrics
- `recordError(id, error)` - Record override error

### OverrideValidator

**Validation Methods:**
- `validateOverride(declaration)` - Validate override declaration
- `validateContractCompatibility(override, contract)` - Validate contract
- `validateVersionConstraints(override)` - Check version compatibility
- `validateTestReport(url)` - Validate test report
- `detectConflicts(override)` - Detect conflicts with other overrides

### React Components & Hooks

**HOCs:**
- `withOverride(Component, componentId, siteId?)` - Wrap with override support
- `withFallback(Component, Fallback, componentId)` - Wrap with fallback

**Components:**
- `OverrideErrorBoundary` - Error boundary for overrides
- `OverrideMetrics` - Display performance metrics

**Hooks:**
- `useComponentOverride(componentId, siteId?)` - Manage override state
- `useMenuItemSearch(term, options)` - Search menu items

### Rollout Manager

```typescript
// Single-site test
await RolloutManager.initiateSingleSiteRollout(id, 'site-1');

// Regional expansion (24h later)
await RolloutManager.advanceToRegional(id, ['site-2', 'site-3']);

// Global deployment (24h later)
await RolloutManager.advanceToGlobal(id, ['site-4']);

// Get progress
const progress = RolloutManager.getRolloutProgress(id);

// Emergency abort
await RolloutManager.abort(id, 'Critical error detected');
```

### Performance Monitor

```typescript
const monitor = new OverridePerformanceMonitor();

// Check if override meets criteria
const result = monitor.meetsPerformanceCriteria(override);
if (!result.passes) {
  console.log('Performance issues:', result.issues);
}

// Check if auto-rollback needed
if (monitor.shouldAutoRollback(override)) {
  await rollback(override.id, 'Performance threshold exceeded');
}

// Customize thresholds
monitor.setThresholds({
  maxErrorRate: 0.10,
  minA11yScore: 75,
  maxLoadTimeDegradation: 150,
});
```

## Manifest Configuration

```yaml
extension:
  id: my-extension
  version: 1.0.0

  overrides:
    - overridesComponentId: work-order-form
      component: CustomWorkOrderForm
      reason: "Custom fields for XYZ requirements"
      testingReport: "https://ci.example.com/reports/ui-123"
      scopedToSites: ["site-xyz"]
      fallbackComponent: OriginalWorkOrderForm
      requiresApproval: false
      breaking: false
      compatibleWith:
        core-mes-ui-foundation: ">=2.0.0"
        work-order-ext: ">=1.5.0"
```

## Best Practices

1. **Always Provide Fallback**: Even for non-critical overrides
2. **Test Thoroughly**: Comprehensive test report required
3. **Use Site Scoping**: Test in single site first
4. **Monitor Metrics**: Watch error rates and performance
5. **Document Changes**: Clear justification helps governance
6. **Version Constraints**: Specify compatible versions explicitly
7. **Contract Implementation**: Ensure full contract compliance
8. **Accessibility**: Maintain WCAG 2.1 AA compliance

## Error Handling

```typescript
import {
  OverrideError,
  OverrideNotFoundError,
  OverrideValidationError,
  OverrideConflictError,
  ApprovalRequiredError,
  OverrideLoadError,
} from '@extension-sdk/overrides';

try {
  await registry.registerOverride(declaration);
} catch (error) {
  if (error instanceof OverrideValidationError) {
    console.error('Validation failed:', error.validationErrors);
  } else if (error instanceof OverrideConflictError) {
    console.error('Conflicts detected:', error.conflicts);
  } else if (error instanceof ApprovalRequiredError) {
    console.error('Approval required:', error.message);
  }
}
```

## Advanced Topics

### Custom Component Contracts

Define contracts to enforce component interface compliance:

```typescript
const contract: ComponentContract = {
  id: 'form-contract',
  requiredProps: {
    onChange: 'function',
    value: 'string',
    disabled: 'boolean',
  },
  requiredMethods: ['validate', 'reset'],
  a11yRequirements: ['WCAG2.1 AA', 'keyboard navigation'],
  themeTokens: ['primary-color', 'font-size-base'],
  performanceRequirements: {
    maxLoadTimeMs: 500,
    maxRenderTimeMs: 100,
  },
};

validator.registerContract(contract);
```

### Event Listening

```typescript
const unsubscribe = registry.onOverrideEvent((event) => {
  switch (event.type) {
    case 'registered':
      console.log(`Override registered: ${event.overrideId}`);
      break;
    case 'activated':
      console.log(`Override activated: ${event.overrideId}`);
      break;
    case 'failed':
      console.error(`Override failed:`, event.details);
      break;
    case 'rolled_back':
      console.log(`Override rolled back: ${event.details.reason}`);
      break;
  }
});

// Later: unsubscribe();
```

### Custom Performance Thresholds

```typescript
const monitor = new OverridePerformanceMonitor();

monitor.setThresholds({
  maxErrorRate: 0.05,           // 5%
  minA11yScore: 80,             // 80/100
  minTestCoverage: 85,          // 85%
  maxLoadTimeDegradation: 100,  // ms
});
```

## Troubleshooting

**Override not activating?**
- Check if requiresApproval is true - needs admin approval
- Verify component is provided
- Check for validation errors

**Performance degradation?**
- Review metrics for load time impact
- Check test coverage percentage
- Monitor error rate
- Consider fallback optimization

**Conflicts detected?**
- Multiple extensions overriding same component
- Resolve through coordination or site scoping
- Consider priority/ordering mechanism

## Testing

```typescript
const registry = new OverrideRegistry();

// Register test override
const override = await registry.registerOverride({
  overridesComponentId: 'test-component',
  component: TestComponent,
  reason: 'Testing override system',
  extensionId: 'test-ext',
  version: '1.0.0',
});

// Verify registration
expect(registry.getOverride(override.id)).toBeDefined();

// Test activation
await registry.activateOverride(override.id);
expect(registry.getActiveOverride('test-component')).toBeDefined();

// Test metrics update
registry.updateMetrics(override.id, { loadTimeMs: 150 });

// Test rollback
await registry.rollback(override.id, 'Testing rollback', 'test-user');
```

## Limitations & Future Work

- Contract validation currently relies on manual documentation
- Test report validation is URL format only (future: fetch and parse)
- No automatic accessibility testing (future: integrate a11y tools)
- Manual version constraint checking (future: semver library integration)
- Single registry instance (future: multi-tenant support)

## Support

For issues or questions about the Component Override Safety System, refer to Issue #428 in the GitHub repository.
