# Error Handling & Response Standards

## Overview

This document establishes standardized practices for error handling, response formatting, and HTTP status code usage across all MachShop APIs. Consistent error handling improves API reliability, debuggability, and client experience.

## Table of Contents

1. [HTTP Status Codes](#http-status-codes)
2. [Error Response Format](#error-response-format)
3. [Error Codes & Categories](#error-codes--categories)
4. [Validation Error Handling](#validation-error-handling)
5. [Client Error Handling](#client-error-handling)
6. [Server Error Handling](#server-error-handling)
7. [Rate Limit Responses](#rate-limit-responses)
8. [Success Response Format](#success-response-format)
9. [Pagination Responses](#pagination-responses)
10. [Error Handling Patterns](#error-handling-patterns)
11. [Error Logging](#error-logging)
12. [Client Error Recovery](#client-error-recovery)

---

## HTTP Status Codes

Use the appropriate HTTP status code for each scenario:

### 2xx Success Codes

**200 OK**
- Request succeeded
- Return full resource representation
- Use for GET, PUT, PATCH operations
```typescript
GET /api/v2/work-orders/123
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": {
    "id": "123",
    "title": "Install Equipment",
    "status": "IN_PROGRESS",
    ...
  }
}
```

**201 Created**
- Resource created successfully
- Return full resource representation with Location header
- Use for POST operations that create resources
```typescript
POST /api/v2/work-orders
HTTP/1.1 201 Created
Content-Type: application/json
Location: /api/v2/work-orders/123

{
  "data": {
    "id": "123",
    "title": "Install Equipment",
    "status": "PENDING",
    ...
  }
}
```

**202 Accepted**
- Request accepted for async processing
- Include status URL or polling mechanism
- Use for long-running operations
```typescript
POST /api/v2/plugins/bulk-deploy
HTTP/1.1 202 Accepted
Content-Type: application/json

{
  "data": {
    "deploymentId": "deploy-456",
    "status": "IN_PROGRESS",
    "statusUrl": "/api/v2/deployments/deploy-456"
  }
}
```

**204 No Content**
- Operation successful, no response body
- Use for DELETE operations
```typescript
DELETE /api/v2/work-orders/123
HTTP/1.1 204 No Content
```

### 3xx Redirection Codes

**301 Moved Permanently**
- Resource permanently moved
- Clients should update bookmarks
```typescript
GET /api/v1/work-orders
HTTP/1.1 301 Moved Permanently
Location: /api/v2/work-orders
```

**304 Not Modified**
- Resource hasn't changed since last request
- Return no body, client uses cached version
```typescript
GET /api/v2/work-orders/123
If-None-Match: "12345"
HTTP/1.1 304 Not Modified
```

### 4xx Client Error Codes

**400 Bad Request**
- Malformed request syntax or invalid parameters
- Include validation details
```typescript
POST /api/v2/work-orders
Content-Type: application/json

{
  "title": "",
  "priority": "INVALID"
}

HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "Validation failed",
  "errorCode": "VALIDATION_ERROR",
  "details": [
    {
      "field": "title",
      "message": "Title is required",
      "code": "REQUIRED"
    },
    {
      "field": "priority",
      "message": "Priority must be one of: LOW, MEDIUM, HIGH, CRITICAL",
      "code": "INVALID_ENUM"
    }
  ]
}
```

**401 Unauthorized**
- Authentication required or failed
- Include WWW-Authenticate header for challenge
```typescript
GET /api/v2/work-orders
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer realm="api", error="invalid_token"
Content-Type: application/json

{
  "error": "Unauthorized",
  "errorCode": "AUTH_REQUIRED",
  "message": "Authentication credentials required"
}
```

**403 Forbidden**
- Authenticated but lacks permission
- Never indicate whether resource exists
```typescript
POST /api/v2/users
HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "error": "Forbidden",
  "errorCode": "INSUFFICIENT_PERMISSIONS",
  "message": "Insufficient permissions for this operation"
}
```

**404 Not Found**
- Resource doesn't exist
- Don't indicate whether it exists or permission issue
```typescript
GET /api/v2/work-orders/nonexistent
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "error": "Not found",
  "errorCode": "RESOURCE_NOT_FOUND"
}
```

**409 Conflict**
- Request conflicts with current resource state
- Include information about the conflict
```typescript
PUT /api/v2/work-orders/123
Content-Type: application/json

{
  "title": "New Title",
  "version": 1
}

HTTP/1.1 409 Conflict
Content-Type: application/json

{
  "error": "Conflict",
  "errorCode": "VERSION_CONFLICT",
  "message": "Resource has been modified since last read",
  "currentVersion": 2,
  "expectedVersion": 1
}
```

**422 Unprocessable Entity**
- Syntax is correct but semantics are invalid
- Business logic validation failed
```typescript
POST /api/v2/work-orders
Content-Type: application/json

{
  "title": "Install Equipment",
  "dueDate": "2020-01-01"
}

HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json

{
  "error": "Unprocessable entity",
  "errorCode": "INVALID_STATE",
  "message": "Due date must be in the future"
}
```

**429 Too Many Requests**
- Rate limit exceeded
- Include Retry-After header
```typescript
GET /api/v2/work-orders
HTTP/1.1 429 Too Many Requests
Retry-After: 60
RateLimit-Limit: 100
RateLimit-Remaining: 0
RateLimit-Reset: 1640070800
Content-Type: application/json

{
  "error": "Rate limit exceeded",
  "errorCode": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests. Please retry after 60 seconds."
}
```

### 5xx Server Error Codes

**500 Internal Server Error**
- Unexpected server error
- Include trace ID for debugging
- Never expose implementation details
```typescript
GET /api/v2/work-orders/123
HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{
  "error": "Internal server error",
  "errorCode": "INTERNAL_ERROR",
  "traceId": "trace-abc123def456"
}
```

**503 Service Unavailable**
- Server temporarily unavailable (maintenance, overload)
- Include Retry-After header
```typescript
GET /api/v2/work-orders
HTTP/1.1 503 Service Unavailable
Retry-After: 3600
Content-Type: application/json

{
  "error": "Service unavailable",
  "errorCode": "SERVICE_UNAVAILABLE",
  "message": "Server is under maintenance. Expected to be back online at 2025-01-15T14:00:00Z"
}
```

---

## Error Response Format

### Standard Error Response Structure

```typescript
interface ErrorResponse {
  error: string;           // Short, human-readable error message
  errorCode: string;       // Machine-readable error code
  message?: string;        // Extended error description (optional)
  details?: any;           // Additional context (optional)
  traceId?: string;        // Unique trace ID for debugging (5xx only)
  timestamp?: string;      // ISO 8601 timestamp
  path?: string;           // Request path
  method?: string;         // HTTP method
}
```

### Example Error Responses

**Validation Error (400):**
```json
{
  "error": "Validation failed",
  "errorCode": "VALIDATION_ERROR",
  "timestamp": "2025-01-15T10:30:00Z",
  "path": "/api/v2/work-orders",
  "method": "POST",
  "details": [
    {
      "field": "priority",
      "message": "Priority must be one of: LOW, MEDIUM, HIGH, CRITICAL",
      "code": "INVALID_ENUM",
      "value": "INVALID"
    },
    {
      "field": "dueDate",
      "message": "Due date must be in the future",
      "code": "INVALID_DATE"
    }
  ]
}
```

**Authorization Error (403):**
```json
{
  "error": "Forbidden",
  "errorCode": "INSUFFICIENT_PERMISSIONS",
  "message": "You do not have permission to access this resource",
  "timestamp": "2025-01-15T10:30:00Z",
  "path": "/api/v2/admin/users"
}
```

**Internal Server Error (500):**
```json
{
  "error": "Internal server error",
  "errorCode": "INTERNAL_ERROR",
  "message": "An unexpected error occurred while processing your request",
  "traceId": "trace-550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-01-15T10:30:00Z",
  "path": "/api/v2/work-orders"
}
```

---

## Error Codes & Categories

Use the following error code naming convention: `CATEGORY_ERROR_TYPE`

### Authentication Errors (AUTH_*)

```
AUTH_REQUIRED              - Authentication credentials required
AUTH_INVALID               - Invalid authentication credentials
AUTH_EXPIRED               - Authentication token expired
AUTH_REVOKED               - Authentication token has been revoked
AUTH_REFRESH_FAILED        - Refresh token invalid or expired
```

### Authorization Errors (AUTHZ_*)

```
AUTHZ_INSUFFICIENT         - Insufficient permissions for operation
AUTHZ_ROLE_REQUIRED        - Required role not assigned
AUTHZ_MULTI_TENANT_SCOPE   - Cannot access resources outside assigned scope
```

### Validation Errors (VALIDATION_*)

```
VALIDATION_ERROR           - Input validation failed
VALIDATION_SCHEMA          - Schema validation error
VALIDATION_TYPE            - Type mismatch
VALIDATION_ENUM            - Invalid enum value
VALIDATION_FORMAT          - Invalid format (email, URL, etc.)
VALIDATION_LENGTH          - Length constraint violated
VALIDATION_RANGE           - Value outside acceptable range
VALIDATION_REQUIRED        - Required field missing
```

### Resource Errors (RESOURCE_*)

```
RESOURCE_NOT_FOUND         - Resource doesn't exist
RESOURCE_ALREADY_EXISTS    - Resource already exists
RESOURCE_CONFLICT          - Resource state conflict
RESOURCE_DELETED           - Resource has been deleted
RESOURCE_ARCHIVED          - Resource is archived
```

### State/Business Logic Errors (STATE_*)

```
STATE_INVALID              - Invalid resource state for operation
STATE_TRANSITION_INVALID   - Invalid state transition
STATE_LOCKED               - Resource is locked
STATE_IMMUTABLE            - Cannot modify immutable resource
```

### Version Conflict Errors (VERSION_*)

```
VERSION_CONFLICT           - Resource version mismatch
VERSION_MISMATCH           - Expected version doesn't match current
```

### Rate Limiting Errors (RATE_LIMIT_*)

```
RATE_LIMIT_EXCEEDED        - Rate limit exceeded
RATE_LIMIT_API_QUOTA       - API quota exceeded
```

### External Service Errors (EXTERNAL_*)

```
EXTERNAL_SERVICE_ERROR     - External service call failed
EXTERNAL_SERVICE_TIMEOUT   - External service timeout
EXTERNAL_DEPENDENCY_ERROR  - Dependency service error
```

### Database/Data Errors (DATA_*)

```
DATA_INTEGRITY_ERROR       - Data integrity constraint violation
DATA_DUPLICATION_ERROR     - Duplicate record
DATA_RETRIEVAL_ERROR       - Failed to retrieve data
```

### Internal Errors (INTERNAL_*)

```
INTERNAL_ERROR             - Unexpected internal error
INTERNAL_SERVER_ERROR      - Server processing error
```

---

## Validation Error Handling

### Detailed Validation Responses

Always return detailed validation errors to help clients correct their input:

```typescript
// CORRECT: Comprehensive validation error details
import { z } from 'zod';

const workOrderSchema = z.object({
  title: z.string().min(3).max(255),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  dueDate: z.string().datetime().refine(d => new Date(d) > new Date()),
  tags: z.array(z.string()).max(10)
});

router.post('/work-orders', async (req: Request, res: Response) => {
  try {
    const validated = workOrderSchema.parse(req.body);
    // Process
    res.status(201).json({ data: workOrder });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        errorCode: 'VALIDATION_ERROR',
        timestamp: new Date().toISOString(),
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: mapZodCodeToErrorCode(err.code),
          value: err.input
        }))
      });
    }
    throw error;
  }
});

function mapZodCodeToErrorCode(zodCode: string): string {
  const mapping: { [key: string]: string } = {
    'invalid_type': 'VALIDATION_TYPE',
    'invalid_enum': 'VALIDATION_ENUM',
    'too_small': 'VALIDATION_LENGTH',
    'too_big': 'VALIDATION_LENGTH',
    'invalid_string': 'VALIDATION_FORMAT',
    'custom': 'VALIDATION_ERROR'
  };
  return mapping[zodCode] || 'VALIDATION_ERROR';
}

// WRONG: Minimal validation error
router.post('/work-orders', async (req: Request, res: Response) => {
  if (!req.body.title) {
    // ❌ Doesn't help client understand what's wrong
    return res.status(400).json({ error: 'Invalid input' });
  }
});
```

### Partial Success (Bulk Operations)

For bulk operations, return success/failure for each item:

```typescript
// CORRECT: Detailed bulk operation response
interface BulkResponse<T> {
  data: {
    successful: T[];
    failed: Array<{ index: number; error: string; errorCode: string }>;
  };
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
}

router.post('/work-orders/bulk-create', async (req: Request, res: Response) => {
  const { workOrders } = req.body;

  const results = {
    successful: [],
    failed: []
  };

  for (let i = 0; i < workOrders.length; i++) {
    try {
      const validated = workOrderSchema.parse(workOrders[i]);
      const created = await prisma.workOrder.create({ data: validated });
      results.successful.push(created);
    } catch (error) {
      results.failed.push({
        index: i,
        error: 'Validation failed',
        errorCode: 'VALIDATION_ERROR',
        details: extractErrorDetails(error)
      });
    }
  }

  const statusCode = results.failed.length === 0 ? 201 : 207; // 207 Multi-Status

  res.status(statusCode).json({
    data: results,
    summary: {
      total: workOrders.length,
      succeeded: results.successful.length,
      failed: results.failed.length
    }
  });
});
```

---

## Client Error Handling

### 4xx Error Categories

```typescript
// CORRECT: Comprehensive client error handler
async function handleClientError(error: any, context: string): Promise<ErrorResponse> {
  // Validation errors
  if (error instanceof z.ZodError) {
    return {
      statusCode: 400,
      error: 'Validation failed',
      errorCode: 'VALIDATION_ERROR',
      timestamp: new Date().toISOString(),
      details: error.errors
    };
  }

  // Resource not found
  if (error.code === 'P2025') { // Prisma not found
    return {
      statusCode: 404,
      error: 'Not found',
      errorCode: 'RESOURCE_NOT_FOUND'
    };
  }

  // Unique constraint violation
  if (error.code === 'P2002') { // Prisma unique constraint
    return {
      statusCode: 409,
      error: 'Conflict',
      errorCode: 'RESOURCE_ALREADY_EXISTS',
      details: {
        duplicateField: error.meta?.target?.[0]
      }
    };
  }

  // Authorization errors
  if (error instanceof AuthorizationError) {
    return {
      statusCode: 403,
      error: 'Forbidden',
      errorCode: 'AUTHZ_INSUFFICIENT',
      message: error.message
    };
  }

  // Business logic errors
  if (error instanceof BusinessLogicError) {
    return {
      statusCode: 422,
      error: 'Unprocessable entity',
      errorCode: error.code,
      message: error.message
    };
  }
}
```

---

## Server Error Handling

### 5xx Error Handling

```typescript
// CORRECT: Generic 5xx error handler
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  // Generate trace ID for debugging
  const traceId = req.headers['x-trace-id'] || generateTraceId();

  // Log full error server-side
  logger.error('Unhandled error', {
    traceId,
    path: req.path,
    method: req.method,
    error: error.message,
    stack: error.stack,
    user: (req as any).user?.id,
    timestamp: new Date().toISOString()
  });

  // Return generic error to client
  res.status(500).json({
    error: 'Internal server error',
    errorCode: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    traceId,
    timestamp: new Date().toISOString()
  });
});

// CORRECT: Database error handling
try {
  await db.transaction(async (tx) => {
    // Database operations
  });
} catch (error: any) {
  if (error.code === 'SERIALIZATION_ERROR') {
    // Retry with exponential backoff
    return await retryWithBackoff(() => db.transaction(...), 3);
  }

  if (error.code === 'CONNECTION_ERROR') {
    logger.error('Database connection error', { error });
    res.status(503).json({
      error: 'Service unavailable',
      errorCode: 'SERVICE_UNAVAILABLE',
      retryAfter: 60
    });
  }

  throw error; // Re-throw unexpected errors
}

// WRONG: Exposing error details
catch (error) {
  res.status(500).json({
    error: error.message,        // ❌ Leaks implementation details
    stack: error.stack,          // ❌ Stack trace exposed
    code: error.code             // ❌ Database error codes exposed
  });
}
```

### Graceful Degradation

```typescript
// CORRECT: Fallback for non-critical services
async function enrichWorkOrder(workOrder: any) {
  try {
    // Try to get equipment details from external service
    const equipment = await externalEquipmentService.get(workOrder.equipmentId);
    return { ...workOrder, equipment };
  } catch (error) {
    // Service unavailable, return without enrichment
    logger.warn('Equipment service unavailable, returning partial data', { error });
    return workOrder;
  }
}

// CORRECT: Circuit breaker for external services
import CircuitBreaker from 'opossum';

const breaker = new CircuitBreaker(async (id: string) => {
  return await externalService.get(id);
}, {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});

router.get('/work-orders/:id', async (req: Request, res: Response) => {
  try {
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: req.params.id }
    });

    // Try to enrich with external data, but don't fail if unavailable
    try {
      workOrder.equipment = await breaker.fire(workOrder.equipmentId);
    } catch {
      // External service unavailable, that's OK
    }

    res.json({ data: workOrder });
  } catch (error) {
    // Handle actual errors
    throw error;
  }
});
```

---

## Rate Limit Responses

### Rate Limit Headers

Always include rate limit information in responses:

```typescript
// CORRECT: Include rate limit headers in all responses
app.use((req: Request, res: Response, next: NextFunction) => {
  res.set({
    'RateLimit-Limit': '100',
    'RateLimit-Remaining': '87',
    'RateLimit-Reset': Math.floor(Date.now() / 1000) + 900
  });
  next();
});

// When limit exceeded:
router.get('/work-orders', rateLimiter, async (req: Request, res: Response) => {
  // rateLimiter middleware sets these headers
  res.set({
    'Retry-After': '60',
    'RateLimit-Limit': '100',
    'RateLimit-Remaining': '0',
    'RateLimit-Reset': Math.floor(Date.now() / 1000) + 60
  });

  return res.status(429).json({
    error: 'Rate limit exceeded',
    errorCode: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests. Please retry after 60 seconds.',
    retryAfter: 60
  });
});
```

---

## Success Response Format

### Standard Success Response Structure

```typescript
interface SuccessResponse<T> {
  data: T;                           // Response data
  metadata?: {
    version?: string;                // API version
    timestamp?: string;              // ISO 8601 timestamp
  };
  links?: {                          // HATEOAS links (optional)
    self?: string;
    next?: string;
    prev?: string;
  };
}
```

### Single Resource Response

```json
{
  "data": {
    "id": "work-order-123",
    "title": "Install Equipment",
    "status": "IN_PROGRESS",
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T10:35:00Z"
  },
  "metadata": {
    "version": "2.0.0",
    "timestamp": "2025-01-15T10:35:00Z"
  }
}
```

### List Response

```json
{
  "data": [
    {
      "id": "work-order-123",
      "title": "Install Equipment",
      "status": "IN_PROGRESS"
    },
    {
      "id": "work-order-124",
      "title": "Maintenance Check",
      "status": "PENDING"
    }
  ],
  "metadata": {
    "version": "2.0.0",
    "timestamp": "2025-01-15T10:35:00Z"
  }
}
```

---

## Pagination Responses

### Pagination Standard

```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "pageSize": 20,
    "total": 245,
    "totalPages": 13,
    "hasNext": true,
    "hasPrev": true
  },
  "metadata": {
    "version": "2.0.0",
    "timestamp": "2025-01-15T10:35:00Z"
  }
}
```

### Cursor-Based Pagination

```json
{
  "data": [...],
  "pagination": {
    "pageSize": 20,
    "hasNext": true,
    "nextCursor": "eyJpZCI6IjEyMyJ9",
    "prevCursor": "eyJpZCI6IjEwMyJ9"
  },
  "links": {
    "self": "/api/v2/work-orders?pageSize=20&cursor=...",
    "next": "/api/v2/work-orders?pageSize=20&cursor=eyJpZCI6IjEyMyJ9",
    "prev": "/api/v2/work-orders?pageSize=20&cursor=eyJpZCI6IjEwMyJ9"
  }
}
```

---

## Error Handling Patterns

### Middleware-Based Error Handling

```typescript
// CORRECT: Centralized error handling middleware
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Use with async route handlers
router.get(
  '/work-orders/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: req.params.id }
    });

    if (!workOrder) {
      return res.status(404).json({
        error: 'Not found',
        errorCode: 'RESOURCE_NOT_FOUND'
      });
    }

    res.json({ data: workOrder });
  })
);
```

### Custom Error Classes

```typescript
// CORRECT: Structured error classes
class ApiError extends Error {
  constructor(
    public statusCode: number,
    public errorCode: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ValidationError extends ApiError {
  constructor(message: string, details?: any) {
    super(400, 'VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}

class ResourceNotFoundError extends ApiError {
  constructor() {
    super(404, 'RESOURCE_NOT_FOUND', 'Resource not found');
    this.name = 'ResourceNotFoundError';
  }
}

class AuthorizationError extends ApiError {
  constructor(message = 'Insufficient permissions') {
    super(403, 'AUTHZ_INSUFFICIENT', message);
    this.name = 'AuthorizationError';
  }
}

// Use in routes
router.get('/work-orders/:id', asyncHandler(async (req: Request, res: Response) => {
  const workOrder = await prisma.workOrder.findUnique({
    where: { id: req.params.id }
  });

  if (!workOrder) {
    throw new ResourceNotFoundError();
  }

  res.json({ data: workOrder });
}));

// Global error handler
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      error: error.message,
      errorCode: error.errorCode,
      ...(error.details && { details: error.details })
    });
  }

  // Handle unexpected errors
  res.status(500).json({
    error: 'Internal server error',
    errorCode: 'INTERNAL_ERROR',
    traceId: generateTraceId()
  });
});
```

---

## Error Logging

### Structured Logging for Errors

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'machshop-api' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// CORRECT: Log errors with structured context
async function handleWorkOrderCreation(req: Request, res: Response) {
  const startTime = Date.now();

  try {
    const workOrder = await createWorkOrder(req.body);
    logger.info('Work order created', {
      workOrderId: workOrder.id,
      duration: Date.now() - startTime,
      userId: (req as any).user.id
    });

    res.status(201).json({ data: workOrder });
  } catch (error) {
    const duration = Date.now() - startTime;

    // Log error with full context
    logger.error('Failed to create work order', {
      errorCode: (error as any).errorCode || 'INTERNAL_ERROR',
      errorMessage: (error as Error).message,
      requestBody: sanitizeForLogging(req.body),
      userId: (req as any).user.id,
      ipAddress: req.ip,
      duration,
      traceId: req.headers['x-trace-id']
    });

    // Return safe error to client
    res.status((error as any).statusCode || 500).json({
      error: (error as Error).message,
      errorCode: (error as any).errorCode || 'INTERNAL_ERROR',
      traceId: req.headers['x-trace-id']
    });
  }
}

// Filter sensitive data
function sanitizeForLogging(data: any): any {
  const sensitiveFields = ['password', 'apiKey', 'token', 'creditCard'];
  const copy = JSON.parse(JSON.stringify(data));

  function redactSensitive(obj: any) {
    for (const key in obj) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        redactSensitive(obj[key]);
      }
    }
  }

  redactSensitive(copy);
  return copy;
}
```

---

## Client Error Recovery

### Retry Logic

```typescript
// CORRECT: Implement exponential backoff for retryable errors
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 3
): Promise<Response> {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Success
      if (response.ok) {
        return response;
      }

      // Don't retry 4xx errors (except 408, 429)
      const retryable = [408, 429, 500, 502, 503, 504].includes(response.status);
      if (!retryable) {
        return response;
      }

      lastError = response;

      // Extract retry-after if available
      const retryAfter = response.headers.get('retry-after');
      const delayMs = retryAfter
        ? parseInt(retryAfter) * 1000
        : Math.pow(2, attempt) * 1000 + Math.random() * 1000;

      // Don't retry on last attempt
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      lastError = error;

      // Retry on network errors
      if (attempt < maxRetries - 1) {
        const delayMs = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

// Example usage
try {
  const response = await fetchWithRetry('/api/v2/work-orders', {
    method: 'POST',
    body: JSON.stringify(workOrder)
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
} catch (error) {
  // Handle final error after retries
  console.error('Failed after retries:', error);
}
```

### Error Recovery Strategies

```typescript
// CORRECT: Different strategies for different error types
async function makeApiRequest(endpoint: string, config: any) {
  try {
    return await fetch(`${API_BASE_URL}${endpoint}`, config);
  } catch (error: any) {
    // Network error - retry with backoff
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return await fetchWithRetry(endpoint, config);
    }

    // Rate limit - wait and retry
    if (error.statusCode === 429) {
      const retryAfter = error.headers['retry-after'] || 60;
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return await makeApiRequest(endpoint, config);
    }

    // Server error - try fallback endpoint
    if (error.statusCode >= 500) {
      console.warn('Primary endpoint failed, trying fallback');
      return await fetch(`${FALLBACK_API_URL}${endpoint}`, config);
    }

    // Client error - don't retry
    throw error;
  }
}
```

---

## Error Handling Checklist

- [ ] All endpoints return appropriate HTTP status codes
- [ ] Error responses include errorCode for machine-readable parsing
- [ ] Validation errors include detailed field information
- [ ] 5xx errors don't expose internal implementation details
- [ ] 401/403 responses don't indicate whether resource exists
- [ ] Rate limit responses include Retry-After header
- [ ] Error logging includes trace ID for debugging
- [ ] Sensitive data not logged or returned in error messages
- [ ] Custom error classes defined for common scenarios
- [ ] Global error handler catches unexpected errors
- [ ] Async handlers wrapped with error handling middleware
- [ ] Retry logic implemented for transient failures
- [ ] Circuit breaker pattern used for external services
- [ ] Error messages are helpful but not verbose
- [ ] All error codes documented and consistently used

