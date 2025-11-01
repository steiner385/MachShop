# Extension Routing Guide

Comprehensive guide for dynamic route registration, OpenAPI generation, validation, and access control for MachShop extensions.

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Route Registration](#route-registration)
4. [Request Validation](#request-validation)
5. [RBAC Integration](#rbac-integration)
6. [Rate Limiting](#rate-limiting)
7. [Audit Logging](#audit-logging)
8. [OpenAPI Specification](#openapi-specification)
9. [Error Handling](#error-handling)
10. [Best Practices](#best-practices)
11. [Examples](#examples)

## Overview

The Extension Routing system allows extensions to register custom API routes and endpoints that integrate seamlessly with the MachShop core API. Each extension can define its own routes with full support for:

- **Dynamic Route Registration**: Register routes at runtime without modifying core routing configuration
- **OpenAPI Specification Generation**: Automatically generate OpenAPI specs for all extension routes
- **Zod Schema Validation**: Validate request/response bodies and parameters using Zod schemas
- **RBAC Integration**: Enforce permission checks for protected routes
- **Rate Limiting**: Configure rate limits per route with per-user or global tracking
- **Audit Logging**: Comprehensive audit logs for all route access with timestamps, statuses, and user information

## Quick Start

### Initialize the Router

```typescript
import { createExtensionRouteRegistry } from '@machshop/extension-sdk/routing';

const router = createExtensionRouteRegistry();
```

### Register Routes

```typescript
import { z } from 'zod';

const response = await router.register({
  extensionId: 'my-extension',
  version: '1.0.0',
  basePath: '/api/extensions/my-extension',
  routes: [
    {
      path: '/data',
      method: 'GET',
      description: 'Fetch all data',
      handler: async (req, res) => {
        // Your handler logic
      },
      permissions: [
        { permission: 'extension:read', required: true }
      ],
      tags: ['data'],
    }
  ]
});

if (response.success) {
  console.log('Routes registered:', response.registeredPaths);
} else {
  console.error('Registration failed:', response.error);
}
```

## Route Registration

### Basic Route Definition

```typescript
interface ExtensionRoute {
  path: string;              // Route path pattern
  method: HttpMethod;         // HTTP method (GET, POST, PUT, PATCH, DELETE)
  handler: (req, res) => Promise<void>;  // Route handler function
  description?: string;      // Description for documentation
  parameters?: RouteParameter[];  // Path, query, header parameters
  requestBody?: ZodSchema;   // Request body schema
  responses?: RouteResponse[]; // Expected responses
  permissions?: PermissionRequirement[];  // Required permissions
  rateLimit?: RateLimitConfig;  // Rate limiting configuration
  tags?: string[];           // OpenAPI tags for grouping
  requiresAuth?: boolean;    // Whether authentication required
  middleware?: Function[];   // Custom middleware to apply
}
```

### Route Path Patterns

```typescript
// Simple path
'/data'

// Path with parameters
'/data/:id'

// Multiple parameters
'/users/:userId/posts/:postId'

// Query parameters are handled separately in parameters array
'/search'  // with { name: 'q', in: 'query' }
```

### Route Parameters

```typescript
const route: ExtensionRoute = {
  path: '/users/:id',
  method: 'GET',
  handler: async (req, res) => {},
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'User ID',
      schema: z.string().uuid(),
      example: '123e4567-e89b-12d3-a456-426614174000',
    },
    {
      name: 'includeDetails',
      in: 'query',
      required: false,
      description: 'Include additional user details',
      schema: z.boolean(),
      example: true,
    }
  ]
};
```

### Route Registration Request

```typescript
interface RouteRegistrationRequest {
  extensionId: string;      // Extension ID
  version: string;           // Extension version
  basePath: string;          // Base path prefix
  routes: ExtensionRoute[];  // Routes to register
  metadata?: {              // Optional metadata
    [key: string]: unknown;
  };
}
```

## Request Validation

### Zod Schema Validation

Validate request bodies using Zod schemas:

```typescript
import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().min(18).optional(),
});

const route: ExtensionRoute = {
  path: '/users',
  method: 'POST',
  handler: async (req, res) => {},
  requestBody: createUserSchema,
  responses: [
    {
      status: 201,
      description: 'User created',
      schema: z.object({
        id: z.string().uuid(),
        name: z.string(),
        email: z.string().email(),
      }),
    },
    {
      status: 400,
      description: 'Validation error',
    },
  ],
};
```

### Parameter Validation

Validate path, query, and header parameters:

```typescript
const route: ExtensionRoute = {
  path: '/products/:id',
  method: 'GET',
  handler: async (req, res) => {},
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: z.string().uuid(),
    },
    {
      name: 'includeInventory',
      in: 'query',
      required: false,
      schema: z.boolean(),
    },
    {
      name: 'X-API-Key',
      in: 'header',
      required: true,
      schema: z.string(),
    },
  ],
};
```

### Validation Error Responses

When validation fails, the router automatically returns:

```json
{
  "error": "Bad Request",
  "message": "Invalid request body",
  "details": [
    {
      "code": "too_small",
      "minimum": 1,
      "type": "string",
      "path": ["name"],
      "message": "String must contain at least 1 character"
    }
  ]
}
```

## RBAC Integration

### Defining Permissions

```typescript
const route: ExtensionRoute = {
  path: '/admin/settings',
  method: 'PUT',
  handler: async (req, res) => {},
  permissions: [
    // Required permissions (user must have ALL of these)
    { permission: 'admin:write', required: true },
    { permission: 'settings:manage', required: true },
    // Optional permissions
    { permission: 'audit:log', required: false },
  ],
};
```

### Permission Formats

Use permission strings with resource:action format:

```typescript
// Resource-based permissions
'extension:read'      // Read extension data
'extension:write'     // Write extension data
'extension:delete'    // Delete extension
'extension:admin'     // Full extension administration

// Specific resource permissions
'extension:my-ext:read'    // Read specific extension
'user:123:update'          // Update specific user

// Role-based permissions
'admin'               // Administrator role
'moderator'           // Moderator role
'viewer'              // Viewer role
```

### Permission Checking

The router automatically checks permissions before executing the handler. Requests without required permissions receive:

```json
{
  "error": "Forbidden",
  "message": "Missing required permission: admin:write"
}
```

## Rate Limiting

### Configuring Rate Limits

```typescript
import { z } from 'zod';

const route: ExtensionRoute = {
  path: '/data',
  method: 'GET',
  handler: async (req, res) => {},
  rateLimit: {
    maxRequests: 100,           // Maximum requests
    windowSeconds: 60,          // Time window in seconds
    perUser: true,              // Track per user (vs global)
    keyExtractor: (req) => {    // Optional custom key
      return req.headers['x-api-key'];
    },
  },
};
```

### Rate Limit Strategies

```typescript
// Global rate limit (100 requests per minute)
{
  maxRequests: 100,
  windowSeconds: 60,
  perUser: false,
}

// Per-user rate limit
{
  maxRequests: 1000,
  windowSeconds: 3600,  // 1 hour
  perUser: true,
}

// Custom rate limiting key
{
  maxRequests: 50,
  windowSeconds: 300,
  keyExtractor: (req) => {
    const tenant = req.headers['x-tenant-id'];
    return `tenant:${tenant}`;
  },
}
```

### Rate Limit Exceeded Response

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded: 100 requests per 60 seconds",
  "retryAfter": 60
}
```

## Audit Logging

### Audit Log Entries

All route access is automatically logged:

```typescript
interface AuditLogEntry {
  timestamp: Date;           // Request timestamp
  extensionId: string;       // Extension ID
  path: string;              // Route path
  method: HttpMethod;        // HTTP method
  userId?: string;           // User ID (if authenticated)
  status: number;            // Response status
  responseTime: number;      // Response time in ms
  ipAddress?: string;        // Client IP
  error?: string;            // Error message if failed
  permissionsChecked?: string[];  // Permissions checked
}
```

### Querying Audit Logs

```typescript
// Get all logs for an extension
const logs = await router.getAuditLogs({
  extensionId: 'my-extension',
});

// Filter by path
const dataLogs = await router.getAuditLogs({
  extensionId: 'my-extension',
  path: '/api/extensions/my-extension/data',
});

// Filter by date range
const recentLogs = await router.getAuditLogs({
  startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
  endDate: new Date(),
});

// Complex filtering
const filteredLogs = await router.getAuditLogs({
  extensionId: 'my-extension',
  path: '/api/extensions/my-extension/admin',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
});
```

### Audit Log Analysis

```typescript
// Get access count for a route
const routeMetadata = router.getRouteMetadata(
  '/api/extensions/my-ext/data',
  'GET'
);
console.log(`Route accessed ${routeMetadata?.accessCount} times`);

// Check last access
console.log(`Last accessed: ${routeMetadata?.lastAccessed}`);
```

## OpenAPI Specification

### Auto-Generated OpenAPI Spec

```typescript
// Generate OpenAPI 3.0.0 specification
const openapi = router.generateOpenApi();

console.log(JSON.stringify(openapi, null, 2));
```

### OpenAPI Spec Structure

The generated specification includes:

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "Extension Routes",
    "version": "1.0.0",
    "description": "Auto-generated OpenAPI specification for extension routes"
  },
  "paths": {
    "/api/extensions/my-extension/data": {
      "get": {
        "summary": "Get extension data",
        "operationId": "getExtensionData",
        "tags": ["data"],
        "parameters": [],
        "responses": {
          "200": {
            "description": "Success"
          }
        }
      }
    }
  },
  "components": {
    "schemas": {}
  }
}
```

### Publishing OpenAPI Spec

```typescript
// Make the spec available at /api/extensions/my-extension/openapi.json
app.get('/api/extensions/my-extension/openapi.json', (req, res) => {
  res.json(router.generateOpenApi());
});
```

## Error Handling

### Standard Error Responses

```typescript
// Validation error (400)
{
  "error": "Bad Request",
  "message": "Invalid request body",
  "details": [...]
}

// Permission error (403)
{
  "error": "Forbidden",
  "message": "Missing required permission: admin:write"
}

// Rate limit exceeded (429)
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded: 100 requests per 60 seconds",
  "retryAfter": 60
}

// Not found (404)
{
  "error": "Not Found",
  "message": "Route not found"
}

// Internal error (500)
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

### Error Handling in Handlers

```typescript
const route: ExtensionRoute = {
  path: '/data',
  method: 'GET',
  handler: async (req, res) => {
    try {
      // Your logic
      const data = await fetchData();
      res.json(data);
    } catch (error) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch data',
      });
    }
  },
};
```

## Best Practices

### 1. Use Meaningful Path Structures

```typescript
// ✅ GOOD - Clear, RESTful paths
'/items'                    // List items
'/items/:id'                // Get single item
'/items/:id/reviews'        // List item reviews
'/items/:id/reviews/:reviewId'  // Get specific review

// ❌ BAD - Unclear or non-RESTful
'/get_items'
'/fetch'
'/api_call'
```

### 2. Properly Define Permissions

```typescript
// ✅ GOOD - Clear permission requirements
{
  path: '/admin/users',
  permissions: [
    { permission: 'admin:read', required: true },
    { permission: 'users:manage', required: true },
  ]
}

// ❌ BAD - Vague permissions
{
  path: '/admin/users',
  permissions: [
    { permission: 'admin', required: true },
  ]
}
```

### 3. Validate All Inputs

```typescript
// ✅ GOOD - Comprehensive validation
{
  path: '/items/:id',
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: z.string().uuid(),
    }
  ],
  requestBody: z.object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
}

// ❌ BAD - No validation
{
  path: '/items/:id',
  // No parameter validation
  // No request body schema
}
```

### 4. Configure Appropriate Rate Limits

```typescript
// ✅ GOOD - Sensible rate limits
{
  path: '/data',           // Public endpoint
  method: 'GET',
  rateLimit: {
    maxRequests: 1000,
    windowSeconds: 3600,
    perUser: true,
  }
}

{
  path: '/admin/sensitive', // Sensitive operation
  method: 'DELETE',
  rateLimit: {
    maxRequests: 10,
    windowSeconds: 3600,
    perUser: true,
  }
}

// ❌ BAD - No rate limiting on sensitive operations
{
  path: '/users',
  method: 'DELETE',
  // No rate limit configured
}
```

### 5. Document Routes Well

```typescript
// ✅ GOOD - Comprehensive documentation
{
  path: '/items',
  method: 'POST',
  description: 'Create a new item with validation and rate limiting',
  requestBody: createItemSchema,
  responses: [
    {
      status: 201,
      description: 'Item created successfully',
      schema: itemResponseSchema,
    },
    {
      status: 400,
      description: 'Validation failed - check details for specific errors',
    },
    {
      status: 429,
      description: 'Rate limit exceeded - try again after retryAfter seconds',
    },
  ],
  tags: ['items', 'create'],
  permissions: [
    { permission: 'items:create', required: true },
  ],
}

// ❌ BAD - No documentation
{
  path: '/items',
  method: 'POST',
  handler: async () => {},
  // No description, no responses, no tags
}
```

### 6. Use Consistent Error Responses

```typescript
// ✅ GOOD - Consistent error format
const errorResponse = {
  error: 'ErrorType',
  message: 'Human-readable message',
  details?: [],  // Optional additional details
};

// ❌ BAD - Inconsistent error formats
{ success: false, msg: 'Failed' }
{ errorCode: 'ERR_001', detail: 'Something went wrong' }
{ error: 'Custom error format' }
```

## Examples

### Complete Example: Item Management API

```typescript
import { createExtensionRouteRegistry } from '@machshop/extension-sdk/routing';
import { z } from 'zod';

const router = createExtensionRouteRegistry();

// Define schemas
const itemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  price: z.number().positive(),
  inStock: z.boolean(),
});

const createItemSchema = itemSchema.omit({ id: true });

// Register routes
await router.register({
  extensionId: 'inventory-extension',
  version: '1.0.0',
  basePath: '/api/extensions/inventory',
  routes: [
    // List items
    {
      path: '/items',
      method: 'GET',
      description: 'List all inventory items',
      handler: async (req, res) => {
        const items = await getItems();
        res.json(items);
      },
      parameters: [
        {
          name: 'limit',
          in: 'query',
          required: false,
          schema: z.number().max(100),
        },
        {
          name: 'offset',
          in: 'query',
          required: false,
          schema: z.number().min(0),
        },
      ],
      tags: ['items'],
      rateLimit: {
        maxRequests: 1000,
        windowSeconds: 60,
      },
    },

    // Get item by ID
    {
      path: '/items/:id',
      method: 'GET',
      description: 'Get item by ID',
      handler: async (req, res) => {
        const id = (req.params as { id: string }).id;
        const item = await getItem(id);
        res.json(item);
      },
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: z.string().uuid(),
        },
      ],
      tags: ['items'],
    },

    // Create item
    {
      path: '/items',
      method: 'POST',
      description: 'Create a new inventory item',
      handler: async (req, res) => {
        const data = (req.body as Record<string, unknown>);
        const item = await createItem(data);
        res.status(201).json(item);
      },
      requestBody: createItemSchema,
      responses: [
        {
          status: 201,
          description: 'Item created',
          schema: itemSchema,
        },
      ],
      tags: ['items'],
      permissions: [
        { permission: 'inventory:write', required: true },
      ],
      rateLimit: {
        maxRequests: 100,
        windowSeconds: 3600,
        perUser: true,
      },
    },

    // Update item
    {
      path: '/items/:id',
      method: 'PUT',
      description: 'Update inventory item',
      handler: async (req, res) => {
        const id = (req.params as { id: string }).id;
        const data = (req.body as Record<string, unknown>);
        const item = await updateItem(id, data);
        res.json(item);
      },
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: z.string().uuid(),
        },
      ],
      requestBody: createItemSchema.partial(),
      tags: ['items'],
      permissions: [
        { permission: 'inventory:write', required: true },
      ],
    },

    // Delete item
    {
      path: '/items/:id',
      method: 'DELETE',
      description: 'Delete inventory item',
      handler: async (req, res) => {
        const id = (req.params as { id: string }).id;
        await deleteItem(id);
        res.status(204).send();
      },
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: z.string().uuid(),
        },
      ],
      tags: ['items'],
      permissions: [
        { permission: 'inventory:delete', required: true },
      ],
      rateLimit: {
        maxRequests: 50,
        windowSeconds: 3600,
        perUser: true,
      },
    },
  ],
});

// Get OpenAPI spec
const openapi = router.generateOpenApi();
console.log('OpenAPI Spec:', JSON.stringify(openapi, null, 2));

// Query audit logs
const logs = await router.getAuditLogs({
  extensionId: 'inventory-extension',
  startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
});
console.log(`Route access in last 24 hours: ${logs.length}`);
```

---

For more information, see the [Extension SDK Documentation](./README.md).
