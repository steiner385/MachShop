# Plugin SDK API Reference

Complete reference for the MachShop Plugin SDK.

## Table of Contents

- [PluginSDK Class](#pluginsdk-class)
- [HookContext Interface](#hookcontext-interface)
- [Hook Registration](#hook-registration)
- [Configuration Management](#configuration-management)
- [API Client Methods](#api-client-methods)
- [Storage Methods](#storage-methods)
- [Logging Methods](#logging-methods)
- [Event Publishing](#event-publishing)
- [Error Handling](#error-handling)

## PluginSDK Class

Main class for plugin development.

### Constructor

```typescript
constructor(pluginId: string, apiKey: string)
```

**Parameters:**
- `pluginId` (string): Unique identifier for the plugin
- `apiKey` (string): API key for authentication

**Example:**
```typescript
const plugin = new PluginSDK('my-plugin', 'api-key-123');
```

## Hook Registration

### registerHook()

Register a handler for a specific hook point.

```typescript
registerHook(
  hookPoint: string,
  handler: (context: HookContext) => Promise<void>,
  options?: HookOptions
): void
```

**Parameters:**
- `hookPoint` (string): Hook point identifier (e.g., `workOrder.beforeCreate`)
- `handler` (function): Async function to execute when hook is triggered
- `options` (HookOptions, optional): Hook configuration

**HookOptions:**
```typescript
interface HookOptions {
  priority?: number;      // 0-100, lower runs first (default: 50)
  async?: boolean;        // Run asynchronously (default: false)
  timeout?: number;       // Timeout in ms (default: 5000)
}
```

**Example:**
```typescript
plugin.registerHook(
  'workOrder.beforeCreate',
  async (context) => {
    console.log('Creating work order:', context.data);
  },
  { priority: 10, timeout: 3000 }
);
```

### unregisterHook()

Remove a hook handler.

```typescript
unregisterHook(hookPoint: string): void
```

**Example:**
```typescript
plugin.unregisterHook('workOrder.beforeCreate');
```

### getRegisteredHooks()

Get list of all registered hook points.

```typescript
getRegisteredHooks(): string[]
```

**Returns:** Array of hook point identifiers

**Example:**
```typescript
const hooks = plugin.getRegisteredHooks();
console.log(hooks); // ['workOrder.beforeCreate', 'workOrder.validate']
```

## HookContext Interface

Context object passed to hook handlers.

### Properties

```typescript
interface HookContext {
  // Input Data
  data: any;                          // Data being processed
  original?: any;                     // Original unmodified data

  // Metadata
  pluginId: string;                   // Current plugin ID
  hookPoint: string;                  // Hook point identifier
  timestamp: Date;                    // When hook was triggered
  userId?: string;                    // User who triggered operation
  requestId?: string;                 // Request ID for tracing

  // Context utilities
  api: APIClient;                     // HTTP client for API calls
  config: Record<string, any>;        // Plugin configuration
  storage: StorageClient;             // Key-value storage

  // Hook results
  results?: any[];                    // Results from previous hooks
  errors?: Error[];                   // Errors from previous hooks
}
```

### Methods

#### Modifying Data

```typescript
plugin.registerHook('workOrder.beforeCreate', async (context) => {
  // Modify the data
  context.data.status = 'PENDING_REVIEW';
  context.data.reviewedBy = context.userId;

  // Return modified context (optional, modifies in-place)
  return context;
});
```

#### Accessing Configuration

```typescript
plugin.registerHook('workOrder.beforeCreate', async (context) => {
  const { externalApiUrl, retryCount } = context.config;

  const response = await context.api.post(externalApiUrl, {
    data: context.data,
  });
});
```

#### Using Storage

```typescript
plugin.registerHook('workOrder.beforeCreate', async (context) => {
  // Get stored value
  const lastSync = await context.storage.get('lastSyncTime');

  // Store value
  await context.storage.set('lastSyncTime', new Date().toISOString());
});
```

## Configuration Management

### getConfig()

Retrieve a configuration value.

```typescript
async getConfig(key: string): Promise<any>
```

**Example:**
```typescript
const apiUrl = await plugin.getConfig('apiUrl');
console.log(apiUrl); // 'https://api.example.com'
```

### setConfig()

Set a configuration value (in-memory only).

```typescript
async setConfig(key: string, value: any): Promise<void>
```

**Example:**
```typescript
await plugin.setConfig('apiUrl', 'https://new-api.example.com');
```

### loadConfiguration()

Load configuration from database.

```typescript
async loadConfiguration(): Promise<void>
```

**Example:**
```typescript
await plugin.loadConfiguration();
const config = await plugin.getConfig('retryCount');
```

## API Client Methods

### api()

Make authenticated HTTP requests to MES API.

```typescript
async api(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  data?: any
): Promise<any>
```

**Parameters:**
- `method` (string): HTTP method
- `path` (string): API endpoint path (relative to `/api/v1`)
- `data` (object, optional): Request body

**Returns:** Parsed JSON response

**Example:**
```typescript
// GET request
const workOrders = await context.api('GET', '/workOrders?limit=10');

// POST request
const result = await context.api('POST', '/workOrders', {
  partNumber: 'PN-123',
  quantity: 100,
});

// PUT request
await context.api('PUT', '/workOrders/WO-123', {
  status: 'COMPLETED',
});

// DELETE request
await context.api('DELETE', '/workOrders/WO-123');
```

### Error Handling

```typescript
try {
  const result = await context.api('GET', '/workOrders/WO-123');
} catch (error) {
  if (error.response?.status === 404) {
    console.log('Work order not found');
  } else {
    console.error('API error:', error.message);
  }
  throw error;
}
```

## Storage Methods

### getStorage()

Retrieve a value from plugin-specific storage.

```typescript
async getStorage(key: string): Promise<any>
```

**Example:**
```typescript
const lastProcessedId = await plugin.getStorage('lastProcessedWorkOrderId');
console.log(lastProcessedId); // 'WO-1000'
```

### setStorage()

Store a value in plugin-specific storage.

```typescript
async setStorage(key: string, value: any): Promise<void>
```

**Example:**
```typescript
await plugin.setStorage('lastProcessedWorkOrderId', 'WO-1234');
```

## Logging Methods

### log()

Log messages at different levels.

```typescript
log(
  level: 'info' | 'warn' | 'error',
  message: string,
  data?: any
): void
```

**Parameters:**
- `level` (string): Log level
- `message` (string): Log message
- `data` (object, optional): Additional context data

**Example:**
```typescript
// Info level
plugin.log('info', 'Work order received', {
  workOrderId: context.data.id,
  priority: context.data.priority,
});

// Warn level
plugin.log('warn', 'Configuration missing optional field', {
  field: 'externalApiUrl',
  default: 'http://localhost:3000',
});

// Error level
plugin.log('error', 'External API call failed', {
  endpoint: '/sync',
  statusCode: 500,
  error: error.message,
});
```

## Event Publishing

### emit()

Publish a custom event.

```typescript
async emit(eventType: string, data: any): Promise<void>
```

**Example:**
```typescript
await plugin.emit('quality.alertTriggered', {
  workOrderId: context.data.id,
  reason: 'Quality threshold exceeded',
  threshold: 95,
  actual: 87,
});
```

### subscribe()

Subscribe to events.

```typescript
async subscribe(
  eventType: string,
  handler: (event: any) => void
): Promise<void>
```

**Example:**
```typescript
await plugin.subscribe('workOrder.completed', (event) => {
  console.log('Work order completed:', event.data);
});
```

## Best Practices

### 1. Hook Handler Structure

```typescript
plugin.registerHook('workOrder.beforeCreate', async (context) => {
  // 1. Validate input
  if (!context.data.partNumber) {
    throw new Error('Part number is required');
  }

  // 2. Log operation
  plugin.log('info', 'Validating work order', {
    requestId: context.requestId,
    workOrderId: context.data.id,
  });

  // 3. Perform business logic
  const validation = await validateWithExternalSystem(context.data);

  // 4. Update data
  context.data.externalValidationResult = validation;

  // 5. Return context
  return context;
});
```

### 2. API Error Handling

```typescript
async function callExternalAPI(endpoint, data) {
  try {
    return await context.api('POST', endpoint, data);
  } catch (error) {
    plugin.log('error', 'API call failed', {
      endpoint,
      statusCode: error.response?.status,
      message: error.message,
    });

    // Rethrow for higher-level handling
    throw new Error(`External API failed: ${error.message}`);
  }
}
```

### 3. Configuration Defaults

```typescript
async function getConfig(key, defaultValue) {
  try {
    const value = await plugin.getConfig(key);
    return value !== undefined ? value : defaultValue;
  } catch (error) {
    plugin.log('warn', 'Config not found, using default', {
      key,
      default: defaultValue,
    });
    return defaultValue;
  }
}

// Usage
const retryCount = await getConfig('retryCount', 3);
```

### 4. Async Hook Handling

```typescript
// For async operations, mark hook as async
plugin.registerHook(
  'workOrder.afterCreate',
  async (context) => {
    // This will run asynchronously without blocking
    await context.api.post('/notifications/send', {
      type: 'workOrderCreated',
      workOrderId: context.data.id,
    });
  },
  { async: true }
);

// For critical operations, use sync (default)
plugin.registerHook(
  'workOrder.beforeCreate',
  async (context) => {
    // This will block until complete
    const validation = await validateBeforeCreate(context.data);
    if (!validation.isValid) {
      throw new Error(validation.reason);
    }
  },
  { async: false }
);
```

## Type Definitions

Complete TypeScript types for plugin development:

```typescript
// Hook Context
interface HookContext {
  data: any;
  original?: any;
  pluginId: string;
  hookPoint: string;
  timestamp: Date;
  userId?: string;
  requestId?: string;
  api: APIClient;
  config: Record<string, any>;
  storage: StorageClient;
  results?: any[];
  errors?: Error[];
}

// Hook Options
interface HookOptions {
  priority?: number;
  async?: boolean;
  timeout?: number;
}

// API Client
interface APIClient {
  get(path: string): Promise<any>;
  post(path: string, data: any): Promise<any>;
  put(path: string, data: any): Promise<any>;
  delete(path: string): Promise<any>;
}

// Storage Client
interface StorageClient {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  delete(key: string): Promise<void>;
}

// Plugin SDK
export class PluginSDK {
  constructor(pluginId: string, apiKey: string);
  registerHook(
    hookPoint: string,
    handler: (context: HookContext) => Promise<void>,
    options?: HookOptions
  ): void;
  unregisterHook(hookPoint: string): void;
  getRegisteredHooks(): string[];
  async getConfig(key: string): Promise<any>;
  async setConfig(key: string, value: any): Promise<void>;
  async loadConfiguration(): Promise<void>;
  async emit(eventType: string, data: any): Promise<void>;
  async subscribe(eventType: string, handler: (event: any) => void): Promise<void>;
  async getStorage(key: string): Promise<any>;
  async setStorage(key: string, value: any): Promise<void>;
  log(level: 'info' | 'warn' | 'error', message: string, data?: any): void;
}
```

## Support

For API questions or issues:
- Check [Plugin Development Guide](./PLUGIN_DEVELOPMENT_GUIDE.md)
- Review [Hook Points Reference](./HOOK_POINTS.md)
- See [Example Plugins](./examples/)
