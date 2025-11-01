# Extension Event & Hook System Guide

Comprehensive guide for managing events, hooks, and cross-extension communication in MachShop extensions.

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Event Bus](#event-bus)
4. [Hook System](#hook-system)
5. [Hook Types](#hook-types)
6. [Conditional Execution](#conditional-execution)
7. [Hook Dependencies](#hook-dependencies)
8. [Execution Ordering](#execution-ordering)
9. [Cross-Extension Communication](#cross-extension-communication)
10. [Metrics & Monitoring](#metrics--monitoring)
11. [Audit Logging](#audit-logging)
12. [Error Handling](#error-handling)
13. [Best Practices](#best-practices)
14. [Examples](#examples)

## Overview

The Extension Event & Hook System enables extensions to:

- **Publish & Subscribe to Events**: React to core system events
- **Register Hooks**: Extend functionality at predefined extension points
- **Execute Conditionally**: Use CEL expressions for conditional hook execution
- **Manage Dependencies**: Order hooks based on dependencies and blockers
- **Cross-Extension Communication**: Send requests between extensions
- **Monitor Performance**: Track execution metrics and audit logs

## Quick Start

### Initialize Event Bus

```typescript
import { createEventBus } from '@machshop/extension-sdk/events';

const eventBus = createEventBus();
```

### Register Hooks

```typescript
const response = await eventBus.registerHooks({
  extensionId: 'my-extension',
  version: '1.0.0',
  hooks: [
    {
      type: HookType.VALIDATION,
      event: 'data:validate',
      handler: async (context) => {
        // Validate data
        console.log('Validating:', context.data);
      },
      stage: EventStage.PRE,
      priority: EventPriority.HIGH,
    }
  ]
});
```

### Publish Events

```typescript
await eventBus.publish({
  name: 'data:validate',
  data: { field: 'value' },
  source: 'core',
  timestamp: new Date(),
});
```

## Event Bus

### Publishing Events

```typescript
await eventBus.publish({
  name: 'extension:activated',
  data: {
    extensionId: 'my-ext',
    timestamp: Date.now(),
  },
  source: 'core-system',
  priority: EventPriority.HIGH,
  stage: EventStage.POST,
  async: true,
  requestId: 'req-123',
  timestamp: new Date(),
  metadata: {
    userId: 'user-456',
    sessionId: 'session-789',
  },
});
```

### Subscribing to Events

```typescript
const subscriberId = eventBus.subscribe('extension:activated', async (event) => {
  console.log(`Extension activated: ${event.data.extensionId}`);
});

// Unsubscribe later
eventBus.unsubscribe(subscriberId);
```

## Hook System

### Hook Lifecycle

1. **Registration**: Extension registers hooks via `registerHooks()`
2. **Activation**: Hook becomes active and ready for execution
3. **Execution**: Hook fires when event is published
4. **Recording**: Metrics and audit logs are recorded
5. **Unregistration**: Extension unregisters hooks via `unregisterHooks()`

### Hook Properties

```typescript
interface Hook {
  id: string;                    // Unique hook identifier
  type: HookType;                // Hook type (VALIDATION, PERMISSION, etc.)
  extensionId: string;           // Extension owning the hook
  event: string;                 // Event name hook listens to
  handler: (context) => Promise; // Hook handler function
  stage?: EventStage;            // PRE, POST, DURING, ERROR
  priority?: EventPriority;      // CRITICAL, HIGH, NORMAL, LOW, DEFERRED
  condition?: CelCondition;      // CEL expression condition
  dependencies?: string[];       // Hook IDs this depends on
  blockers?: string[];           // Hook IDs that block this one
  continueOnError?: boolean;     // Continue execution on error
  timeout?: number;              // Max execution time (ms)
  active: boolean;               // Hook is active
  registeredAt: Date;            // Registration timestamp
  executionCount: number;        // Total executions
  lastExecutedAt?: Date;         // Last execution time
  averageDuration?: number;      // Average duration (ms)
}
```

## Hook Types

### LIFECYCLE Hooks

Fired during extension lifecycle events:

```typescript
{
  type: HookType.LIFECYCLE,
  event: 'extension:installed',
  handler: async (context) => {
    console.log('Extension installed:', context.extensionId);
  }
}
```

Valid lifecycle events:
- `extension:installed`
- `extension:uninstalled`
- `extension:enabled`
- `extension:disabled`
- `extension:updated`

### PERMISSION Hooks

Fired during permission checks:

```typescript
{
  type: HookType.PERMISSION,
  event: 'permission:check',
  handler: async (context) => {
    // Check if user has permission
    const granted = context.data.permission === 'admin:read';
    return { allowed: granted };
  }
}
```

Valid permission events:
- `permission:check`
- `permission:request`
- `permission:grant`
- `permission:revoke`

### VALIDATION Hooks

Fired during data validation:

```typescript
{
  type: HookType.VALIDATION,
  event: 'data:validate',
  handler: async (context) => {
    const { field, value } = context.data;
    if (!value) {
      throw new Error(`${field} is required`);
    }
  }
}
```

Valid validation events:
- `data:validate`
- `form:validate`
- `request:validate`
- `response:validate`

### TRANSFORMATION Hooks

Fired to transform data:

```typescript
{
  type: HookType.TRANSFORMATION,
  event: 'data:transform',
  handler: async (context) => {
    // Transform data
    return {
      transformed: context.data.value.toUpperCase()
    };
  }
}
```

Valid transformation events:
- `data:transform`
- `data:format`
- `data:normalize`
- `data:convert`

### CACHE Hooks

Fired to manage caching:

```typescript
{
  type: HookType.CACHE,
  event: 'cache:invalidate',
  handler: async (context) => {
    console.log('Invalidating cache for:', context.data.key);
  }
}
```

Valid cache events:
- `cache:invalidate`
- `cache:refresh`
- `cache:clear`

### CUSTOM Hooks

Extensions can define custom hook types:

```typescript
{
  type: HookType.CUSTOM,
  event: 'my-extension:custom-event',
  handler: async (context) => {
    // Custom logic
  }
}
```

## Conditional Execution

### CEL Expressions

Use CEL expressions to conditionally execute hooks:

```typescript
{
  type: HookType.VALIDATION,
  event: 'data:validate',
  handler: async (context) => {},
  condition: {
    expression: 'data.type == "user" && user.role == "admin"',
    timeout: 1000,
  }
}
```

### Hook Builder

Use HookBuilder for fluent hook creation:

```typescript
import { HookBuilder } from '@machshop/extension-sdk/events';

const hook = new HookBuilder()
  .event('data:validate')
  .type(HookType.VALIDATION)
  .extensionId('my-ext')
  .handler(async (context) => {})
  .stage(EventStage.PRE)
  .priority(EventPriority.HIGH)
  .timeout(5000)
  .condition('data.required == true')
  .build();
```

## Hook Dependencies

### Specifying Dependencies

Ensure hooks execute in the correct order:

```typescript
const hookA = new HookBuilder()
  .event('data:transform')
  .type(HookType.TRANSFORMATION)
  .extensionId('ext1')
  .handler(async () => {})
  .build();

const hookB = new HookBuilder()
  .event('data:transform')
  .type(HookType.TRANSFORMATION)
  .extensionId('ext2')
  .handler(async () => {})
  .dependsOn(hookA.id)  // hookA must execute first
  .build();
```

### Hook Blockers

Prevent hook execution if another hook is active:

```typescript
const criticalHook = new HookBuilder()
  .event('data:validate')
  .type(HookType.VALIDATION)
  .extensionId('ext1')
  .handler(async () => {})
  .build();

const normalHook = new HookBuilder()
  .event('data:validate')
  .type(HookType.VALIDATION)
  .extensionId('ext2')
  .handler(async () => {})
  .blockedBy(criticalHook.id)  // Won't execute if criticalHook is active
  .build();
```

## Execution Ordering

### Priority Levels

Hooks execute in priority order:

```typescript
// Execute first
.priority(EventPriority.CRITICAL)

// Execute second
.priority(EventPriority.HIGH)

// Execute third (default)
.priority(EventPriority.NORMAL)

// Execute fourth
.priority(EventPriority.LOW)

// Execute last
.priority(EventPriority.DEFERRED)
```

### Event Stages

Hooks can execute at different stages:

```typescript
// Before event processing
.stage(EventStage.PRE)

// During event processing
.stage(EventStage.DURING)

// After event processing
.stage(EventStage.POST)

// During error handling
.stage(EventStage.ERROR)
```

## Cross-Extension Communication

### Sending Requests

```typescript
const response = await eventBus.sendRequest({
  requestId: 'req-123',
  requesterId: 'extension-a',
  targetId: 'extension-b',
  event: 'custom:process',
  payload: { action: 'process', data: { /* ... */ } },
  timeout: 5000,
  expectResponse: true,
});

if (response.success) {
  console.log('Response:', response.payload);
} else {
  console.error('Error:', response.error);
}
```

### Request/Reply Pattern

Extension B receiving request:

```typescript
await eventBus.registerHooks({
  extensionId: 'extension-b',
  version: '1.0.0',
  hooks: [
    {
      type: HookType.CUSTOM,
      event: 'custom:process',
      handler: async (context) => {
        const { action, data } = context.data;
        return {
          processed: true,
          result: await processData(data),
        };
      },
    }
  ]
});
```

## Metrics & Monitoring

### Hook Metrics

```typescript
const metrics = eventBus.getHookMetrics(hookId);

console.log(`Total executions: ${metrics.totalExecutions}`);
console.log(`Successful: ${metrics.successfulExecutions}`);
console.log(`Failed: ${metrics.failedExecutions}`);
console.log(`Average duration: ${metrics.averageDuration}ms`);
console.log(`Error rate: ${metrics.errorRate}%`);
console.log(`Recent executions:`, metrics.recentExecutions);
```

### Hook Health

```typescript
import { HookLifecycleManager } from '@machshop/extension-sdk/events';

const hook = eventBus.getHook(hookId);
const health = HookLifecycleManager.getHealthStatus(hook);

if (health.healthy) {
  console.log('Hook is healthy');
} else {
  console.log('Health issues:', health.issues);
}
```

## Audit Logging

### Query Audit Logs

```typescript
const logs = await eventBus.getAuditLogs({
  extensionId: 'my-extension',
  startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
  endDate: new Date(),
});

logs.forEach(log => {
  console.log(`${log.timestamp}: ${log.event} [${log.status}]`);
});
```

## Error Handling

### Continue on Error

```typescript
{
  type: HookType.VALIDATION,
  event: 'data:validate',
  handler: async (context) => {
    // If this throws, execution continues
  },
  continueOnError: true,
}
```

### Hook Timeout

```typescript
{
  type: HookType.VALIDATION,
  event: 'data:validate',
  handler: async (context) => {
    // Must complete within 5 seconds
  },
  timeout: 5000,
}
```

### Error Handling in Handlers

```typescript
{
  type: HookType.VALIDATION,
  event: 'data:validate',
  handler: async (context) => {
    try {
      // Validate data
    } catch (error) {
      throw new Error(`Validation failed: ${error.message}`);
    }
  }
}
```

## Best Practices

### 1. Use Appropriate Hook Types

```typescript
// ✅ GOOD - Use correct hook type
{
  type: HookType.VALIDATION,
  event: 'data:validate',
  handler: async (context) => {
    // Validate data
  }
}

// ❌ BAD - Using wrong hook type
{
  type: HookType.CACHE,
  event: 'data:validate',
  handler: async (context) => {
    // This is confusing
  }
}
```

### 2. Set Appropriate Priorities

```typescript
// ✅ GOOD - Clear priority hierarchy
[
  { event: 'data:validate', priority: EventPriority.CRITICAL }, // Security
  { event: 'data:validate', priority: EventPriority.HIGH },     // Core
  { event: 'data:validate', priority: EventPriority.NORMAL },   // Standard
  { event: 'data:validate', priority: EventPriority.LOW },      // Analytics
]

// ❌ BAD - All same priority
[
  { event: 'data:validate', priority: EventPriority.NORMAL },
  { event: 'data:validate', priority: EventPriority.NORMAL },
]
```

### 3. Manage Hook Lifecycles

```typescript
// ✅ GOOD - Register and unregister properly
export async function enable() {
  return await eventBus.registerHooks({ /* ... */ });
}

export async function disable() {
  await eventBus.unregisterHooks('my-extension');
}

// ❌ BAD - Leaving hooks registered
export async function disable() {
  // No cleanup!
}
```

### 4. Use Timeouts

```typescript
// ✅ GOOD - Set reasonable timeouts
{
  type: HookType.VALIDATION,
  event: 'data:validate',
  handler: async (context) => {},
  timeout: 5000,  // 5 seconds
}

// ❌ BAD - No timeout
{
  type: HookType.VALIDATION,
  event: 'data:validate',
  handler: async (context) => {},
  // Can hang indefinitely
}
```

## Examples

### Validation Hook Example

```typescript
const validationHook = new HookBuilder()
  .event('data:validate')
  .type(HookType.VALIDATION)
  .extensionId('validator-ext')
  .handler(async (context) => {
    const { field, value } = context.data;

    if (!value) {
      throw new Error(`${field} is required`);
    }

    if (field === 'email' && !isValidEmail(value)) {
      throw new Error('Invalid email format');
    }
  })
  .stage(EventStage.PRE)
  .priority(EventPriority.HIGH)
  .timeout(2000)
  .continueOnError(false)
  .build();
```

### Permission Hook Example

```typescript
const permissionHook = new HookBuilder()
  .event('permission:check')
  .type(HookType.PERMISSION)
  .extensionId('permission-ext')
  .handler(async (context) => {
    const { permission, userId } = context.data;
    const user = await getUser(userId);

    return {
      allowed: user.permissions.includes(permission),
      reason: user.permissions.includes(permission)
        ? undefined
        : 'Insufficient permissions',
    };
  })
  .priority(EventPriority.CRITICAL)
  .timeout(3000)
  .build();
```

### Complex Workflow Example

```typescript
// Hook 1: Pre-validation
const preValidationHook = new HookBuilder()
  .event('user:update')
  .type(HookType.VALIDATION)
  .extensionId('user-service')
  .handler(async (context) => {
    // Check required fields
  })
  .stage(EventStage.PRE)
  .priority(EventPriority.HIGH)
  .build();

// Hook 2: Permission check (depends on pre-validation)
const permissionHook = new HookBuilder()
  .event('user:update')
  .type(HookType.PERMISSION)
  .extensionId('auth-service')
  .handler(async (context) => {
    // Check user permissions
  })
  .stage(EventStage.PRE)
  .priority(EventPriority.HIGH)
  .dependsOn(preValidationHook.id)
  .build();

// Hook 3: Transform data (after permission check)
const transformHook = new HookBuilder()
  .event('user:update')
  .type(HookType.TRANSFORMATION)
  .extensionId('user-service')
  .handler(async (context) => {
    // Normalize user data
  })
  .stage(EventStage.DURING)
  .priority(EventPriority.NORMAL)
  .dependsOn(permissionHook.id)
  .build();

// Hook 4: Post-processing
const postProcessHook = new HookBuilder()
  .event('user:update')
  .type(HookType.CACHE)
  .extensionId('cache-service')
  .handler(async (context) => {
    // Invalidate cache
  })
  .stage(EventStage.POST)
  .priority(EventPriority.LOW)
  .build();

// Register all hooks
await eventBus.registerHooks({
  extensionId: 'user-service',
  version: '1.0.0',
  hooks: [
    preValidationHook,
    permissionHook,
    transformHook,
    postProcessHook,
  ]
});
```

---

For more information, see the [Extension SDK Documentation](./README.md).
