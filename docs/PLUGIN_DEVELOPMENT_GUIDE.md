# Plugin Development Guide

## Overview

The MachShop Plugin System enables developers to extend the Manufacturing Execution System (MES) with custom functionality without modifying core code. Plugins integrate seamlessly with the MES through a standardized hook system, event bus, and webhook delivery.

**Table of Contents**
- [Getting Started](#getting-started)
- [Plugin Manifest](#plugin-manifest)
- [Creating Your First Plugin](#creating-your-first-plugin)
- [Hook System](#hook-system)
- [Configuration Management](#configuration-management)
- [Event Bus Integration](#event-bus-integration)
- [Webhooks](#webhooks)
- [Testing Plugins](#testing-plugins)
- [Deployment](#deployment)
- [Best Practices](#best-practices)

## Getting Started

### Prerequisites

- Node.js 16+ and npm/yarn
- TypeScript knowledge (recommended)
- MachShop API access credentials
- Plugin SDK installed

### Installation

```bash
npm install @machshop/plugin-sdk
# or
yarn add @machshop/plugin-sdk
```

### Quick Start

```typescript
import PluginSDK, { HookContext } from '@machshop/plugin-sdk';

// Initialize plugin
const plugin = new PluginSDK('my-plugin', 'your-api-key');

// Register a hook
plugin.registerHook('workOrder.beforeCreate', async (context: HookContext) => {
  console.log('Work order about to be created:', context.data);
  // Add custom validation or logic
});

// Start plugin
await plugin.loadConfiguration();
console.log('Plugin initialized');
```

## Plugin Manifest

Every plugin requires a manifest file (`manifest.json`) that describes the plugin's metadata and capabilities.

### Manifest Schema

```json
{
  "id": "my-plugin",
  "name": "My Custom Plugin",
  "version": "1.0.0",
  "description": "A description of what the plugin does",
  "author": "Your Name <email@example.com>",
  "license": "MIT",
  "apiVersion": "1.0.0",
  "permissions": [
    "workOrders:read",
    "workOrders:write",
    "quality:read"
  ],
  "hooks": {
    "workflow": [
      "workOrder.beforeCreate",
      "workOrder.afterComplete"
    ],
    "data": [
      "workOrder.validate",
      "material.transform"
    ],
    "integration": [
      "external.sync"
    ],
    "notification": [
      "alert.send"
    ]
  },
  "configuration": {
    "apiEndpoint": {
      "type": "string",
      "required": true,
      "description": "External API endpoint URL"
    },
    "apiKey": {
      "type": "string",
      "required": true,
      "description": "API key for external service"
    },
    "retryAttempts": {
      "type": "number",
      "required": false,
      "default": 3,
      "description": "Number of retry attempts for API calls"
    }
  },
  "dependencies": {
    "axios": "^1.0.0",
    "lodash": "^4.17.0"
  },
  "database": {
    "migrationsDir": "./migrations",
    "requiresMigrations": false
  }
}
```

### Manifest Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique plugin identifier (lowercase, hyphens allowed) |
| `name` | string | Yes | Human-readable plugin name |
| `version` | string | Yes | Semantic version (e.g., 1.0.0) |
| `description` | string | No | What the plugin does |
| `author` | string | No | Plugin author name and email |
| `license` | string | No | License type (MIT, Apache-2.0, etc.) |
| `apiVersion` | string | Yes | Plugin SDK API version compatibility |
| `permissions` | array | No | Required system permissions |
| `hooks` | object | No | Hook points this plugin registers |
| `configuration` | object | No | Configuration schema for plugin settings |
| `dependencies` | object | No | npm dependencies required |
| `database` | object | No | Database migration settings |

## Creating Your First Plugin

### Step 1: Project Setup

```bash
mkdir my-plugin
cd my-plugin
npm init -y
npm install typescript @types/node @machshop/plugin-sdk
npx tsc --init
```

### Step 2: Create Manifest

Create `manifest.json`:

```json
{
  "id": "quality-validator",
  "name": "Quality Validator Plugin",
  "version": "1.0.0",
  "description": "Validates work order quality metrics before creation",
  "author": "Your Team",
  "apiVersion": "1.0.0",
  "hooks": {
    "workflow": ["workOrder.beforeCreate"],
    "data": ["workOrder.validate"]
  }
}
```

### Step 3: Create Plugin Code

Create `src/index.ts`:

```typescript
import PluginSDK, { HookContext } from '@machshop/plugin-sdk';

const plugin = new PluginSDK('quality-validator', process.env.PLUGIN_API_KEY || '');

// Validate work order before creation
plugin.registerHook('workOrder.beforeCreate', async (context: HookContext) => {
  const { data } = context;

  // Custom validation logic
  if (data.qualityThreshold < 0 || data.qualityThreshold > 100) {
    throw new Error('Quality threshold must be between 0 and 100');
  }

  // Log validation
  plugin.log('info', 'Work order validated', {
    workOrderId: data.id,
    qualityThreshold: data.qualityThreshold,
  });
});

// Validate data transformation
plugin.registerHook('workOrder.validate', async (context: HookContext) => {
  const { data } = context;

  // Transform data if needed
  context.data.validatedAt = new Date().toISOString();
  context.data.validator = 'quality-validator-1.0.0';

  return context;
});

export default plugin;
```

### Step 4: Build and Package

```bash
npm run build
tar -czf quality-validator-1.0.0.tar.gz dist/ manifest.json package.json
```

### Step 5: Deploy

Upload through admin dashboard:
1. Go to Admin > Plugins
2. Click "Install Plugin"
3. Upload manifest and package URL
4. Approve plugin
5. Activate plugin

## Hook System

Hooks allow plugins to intercept and modify system operations at specific points.

### Hook Types

#### Workflow Hooks
Execute custom business logic during workflow processes.

```typescript
// Before work order creation
plugin.registerHook('workOrder.beforeCreate', async (context: HookContext) => {
  // Validate, enrich, or reject the work order
  if (!isValid(context.data)) {
    throw new Error('Invalid work order');
  }
});

// After work order completion
plugin.registerHook('workOrder.afterComplete', async (context: HookContext) => {
  // Trigger downstream processes
  await context.api.post('/api/v1/reporting/events', {
    type: 'workOrder.completed',
    data: context.data,
  });
});
```

#### Data Hooks
Transform or validate data before storage.

```typescript
// Validate work order data
plugin.registerHook('workOrder.validate', async (context: HookContext) => {
  // Validation logic
  context.data.validated = true;
  return context;
});

// Transform material data
plugin.registerHook('material.transform', async (context: HookContext) => {
  // Add computed fields
  context.data.costPerUnit = context.data.totalCost / context.data.quantity;
  return context;
});
```

#### Integration Hooks
Synchronize with external systems.

```typescript
// Sync with external ERP
plugin.registerHook('external.sync', async (context: HookContext) => {
  const result = await context.api.post('/api/v1/external/sync', {
    entity: 'workOrder',
    data: context.data,
  });

  context.data.externalId = result.externalId;
});
```

#### Notification Hooks
Send alerts and notifications.

```typescript
// Send quality alert
plugin.registerHook('alert.send', async (context: HookContext) => {
  await context.api.post('/api/v1/notifications/send', {
    type: 'quality_alert',
    recipients: ['supervisor@company.com'],
    message: `Quality check failed: ${context.data.reason}`,
    severity: 'high',
  });
});
```

### Hook Context

Each hook receives a `HookContext` object with the following properties:

```typescript
interface HookContext {
  // Input data
  data: any;
  original?: any;

  // Metadata
  pluginId: string;
  hookPoint: string;
  timestamp: Date;
  userId?: string;
  requestId?: string;

  // Utilities
  api: APIClient;
  config: Record<string, any>;
  storage: StorageClient;

  // Results
  results?: any[];
  errors?: Error[];
}
```

### Hook Execution Order

Hooks are executed in priority order (0-100, lower first):

```typescript
// Low priority (runs first)
plugin.registerHook('workOrder.validate', handler1, { priority: 10 });

// Medium priority
plugin.registerHook('workOrder.validate', handler2, { priority: 50 });

// High priority (runs last)
plugin.registerHook('workOrder.validate', handler3, { priority: 90 });
```

## Configuration Management

Plugins can store and access configuration settings.

### Defining Configuration

In manifest:

```json
{
  "configuration": {
    "externalApiUrl": {
      "type": "string",
      "required": true,
      "description": "External API endpoint"
    },
    "apiKey": {
      "type": "string",
      "required": true,
      "description": "API authentication key"
    },
    "enableLogging": {
      "type": "boolean",
      "required": false,
      "default": true,
      "description": "Enable detailed logging"
    },
    "retryCount": {
      "type": "number",
      "required": false,
      "default": 3,
      "description": "Number of retry attempts"
    }
  }
}
```

### Accessing Configuration

```typescript
plugin.registerHook('workOrder.beforeCreate', async (context: HookContext) => {
  const config = context.config;

  const externalUrl = config.externalApiUrl;
  const apiKey = config.apiKey;
  const enableLogging = config.enableLogging;

  if (enableLogging) {
    plugin.log('info', 'Using external API', { url: externalUrl });
  }
});
```

### Updating Configuration

Through admin dashboard or API:

```bash
curl -X PUT http://localhost:3000/api/v1/admin/plugins/{pluginId}/config \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "externalApiUrl": "https://api.example.com",
    "apiKey": "secret-key",
    "enableLogging": true,
    "retryCount": 5
  }'
```

## Event Bus Integration

Plugins can publish and subscribe to events for inter-plugin communication.

### Publishing Events

```typescript
plugin.registerHook('workOrder.afterComplete', async (context: HookContext) => {
  // Publish event to event bus
  await context.api.post('/api/v1/admin/plugins/events', {
    eventType: 'workOrder.completed',
    eventData: {
      workOrderId: context.data.id,
      completedAt: new Date().toISOString(),
      status: context.data.status,
    },
  });
});
```

### Subscribing to Events

Via webhooks (see Webhooks section below).

## Webhooks

Webhooks allow plugins to receive real-time event notifications.

### Registering a Webhook

```bash
curl -X POST http://localhost:3000/api/v1/admin/plugins/{pluginId}/webhooks \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "workOrder.completed",
    "webhookUrl": "https://your-webhook-endpoint.com/hooks",
    "secret": "webhook-signing-secret"
  }'
```

### Webhook Request Format

```http
POST /hooks HTTP/1.1
Host: your-webhook-endpoint.com
Content-Type: application/json
X-Webhook-Signature: sha256=abcd1234...
X-Webhook-ID: webhook-id
X-Event-Type: workOrder.completed
X-Timestamp: 2024-01-01T12:00:00Z

{
  "id": "event-id",
  "eventType": "workOrder.completed",
  "eventData": {
    "workOrderId": "WO-123",
    "completedAt": "2024-01-01T12:00:00Z",
    "status": "COMPLETED"
  },
  "timestamp": "2024-01-01T12:00:00Z",
  "sourceUserId": "user-123",
  "sourceRequestId": "request-123"
}
```

### Webhook Signature Verification

```typescript
import crypto from 'crypto';

app.post('/hooks', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);

  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  if (`sha256=${expectedSignature}` !== signature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Process webhook
  console.log('Event received:', req.body.eventType);
  res.json({ success: true });
});
```

### Webhook Delivery Guarantees

- **Reliability**: Delivered with exponential backoff retry (up to 3 attempts)
- **Order**: Events delivered in order they were published
- **At-least-once**: Each webhook may be delivered one or more times
- **Timeout**: 30-second delivery timeout per webhook

## Testing Plugins

### Unit Tests

```typescript
import { describe, it, expect } from '@jest/globals';
import PluginSDK from '@machshop/plugin-sdk';

describe('Quality Validator Plugin', () => {
  let plugin: PluginSDK;

  beforeEach(() => {
    plugin = new PluginSDK('quality-validator', 'test-key');
  });

  it('should reject work orders with invalid quality threshold', async () => {
    const context = {
      data: {
        id: 'WO-123',
        qualityThreshold: 150, // Invalid: > 100
      },
    };

    const handler = plugin.getHookHandler('workOrder.beforeCreate');
    expect(() => handler(context)).toThrow('Quality threshold must be between 0 and 100');
  });
});
```

### Integration Tests

```typescript
describe('Integration Tests', () => {
  it('should synchronize with external API', async () => {
    const response = await plugin.api('POST', '/external/sync', {
      entity: 'workOrder',
      data: { id: 'WO-123' },
    });

    expect(response.success).toBe(true);
    expect(response.externalId).toBeDefined();
  });
});
```

### Manual Testing

1. **Install plugin** in admin dashboard
2. **Enable logging** in configuration
3. **Test webhooks** using test button
4. **Monitor execution** in Event Bus dashboard
5. **Check logs** in system logs

## Deployment

### Package Your Plugin

```bash
# Create distribution
npm run build

# Package plugin
tar -czf my-plugin-1.0.0.tar.gz \
  dist/ \
  manifest.json \
  package.json \
  README.md

# Upload to S3 or CDN
aws s3 cp my-plugin-1.0.0.tar.gz s3://your-plugins-bucket/
```

### Install via Admin Dashboard

1. Navigate to Admin > Plugin Management
2. Click "Install Plugin"
3. Enter manifest JSON
4. Enter package URL (S3, GitHub releases, etc.)
5. Click "Install"

### Install via API

```bash
curl -X POST http://localhost:3000/api/v1/admin/plugins/install \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "manifest": { ... },
    "packageUrl": "https://your-url/my-plugin-1.0.0.tar.gz"
  }'
```

### Lifecycle States

1. **PENDING_APPROVAL**: Installed, awaiting admin approval
2. **INSTALLED**: Approved, ready to activate
3. **ACTIVE**: Running and processing hooks
4. **DISABLED**: Temporarily disabled without uninstalling
5. **FAILED**: Encountered critical error
6. **UNINSTALLED**: Completely removed

## Best Practices

### 1. Error Handling

```typescript
plugin.registerHook('workOrder.beforeCreate', async (context: HookContext) => {
  try {
    // Perform operation
    const result = await context.api.post('/api/v1/validate', context.data);
    return result;
  } catch (error) {
    plugin.log('error', 'Validation failed', {
      hookPoint: context.hookPoint,
      error: error.message,
      data: context.data,
    });
    // Rethrow or handle gracefully
    throw error;
  }
});
```

### 2. Logging Best Practices

```typescript
// Use appropriate log levels
plugin.log('info', 'Plugin started successfully');
plugin.log('warn', 'Configuration is missing optional field');
plugin.log('error', 'Critical failure occurred', { errorDetails: {...} });

// Include context in logs
plugin.log('info', 'Processing work order', {
  workOrderId: context.data.id,
  userId: context.userId,
  requestId: context.requestId,
});
```

### 3. Performance Considerations

```typescript
// Cache configuration
const config = context.config;
const apiUrl = config.externalApiUrl; // Cache this

// Use batch operations when possible
const results = await context.api.post('/api/v1/batch', {
  operations: [...],
});

// Set appropriate hook priority
// Lower priority hooks run first and faster
plugin.registerHook('workOrder.validate', handler, { priority: 20 });
```

### 4. Security Best Practices

```typescript
// Never log sensitive data
plugin.log('error', 'Authentication failed'); // Good
// plugin.log('error', 'Auth failed with key: ' + apiKey); // BAD

// Validate and sanitize input
if (!isValid(context.data)) {
  throw new Error('Invalid input');
}

// Use HTTPS for webhook endpoints
// Store secrets in plugin configuration
const apiKey = context.config.apiKey; // From secure storage

// Verify webhook signatures
// See Webhook Signature Verification section
```

### 5. Monitoring and Observability

```typescript
// Monitor hook execution
plugin.log('info', 'Hook execution started', {
  hookPoint: context.hookPoint,
  timestamp: new Date().toISOString(),
});

// Include request context for tracing
plugin.log('info', 'External API call', {
  requestId: context.requestId,
  userId: context.userId,
  endpoint: '/api/v1/external/sync',
});

// Check plugin health in admin dashboard
// Monitor Event Bus metrics
// Review execution history
```

## Next Steps

- [API Reference](./PLUGIN_API_REFERENCE.md)
- [Hook Point Reference](./HOOK_POINTS.md)
- [Example Plugins](./examples/)
- [Troubleshooting](./TROUBLESHOOTING.md)

## Support

For questions or issues:
- GitHub Issues: https://github.com/steiner385/MachShop/issues
- Documentation: https://docs.machshop.io/plugins
- Community: Slack #plugin-developers
