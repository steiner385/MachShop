# API Design Principles & Best Practices

**Issue #81: SDK Best Practices, Design Principles & Governance Framework**

Comprehensive guide for designing consistent, secure, and maintainable APIs within the MachShop Manufacturing Execution System ecosystem.

## Table of Contents

1. [API Design Principles](#api-design-principles)
2. [RESTful Standards](#restful-standards)
3. [Response Format Standards](#response-format-standards)
4. [Naming Conventions](#naming-conventions)
5. [Pagination Standards](#pagination-standards)
6. [Filtering & Sorting](#filtering--sorting)
7. [GraphQL Design](#graphql-design)
8. [Error Handling](#error-handling)
9. [Security Best Practices](#security-best-practices)
10. [Performance Optimization](#performance-optimization)
11. [Idempotency & Retry Patterns](#idempotency--retry-patterns)
12. [Breaking vs Non-Breaking Changes](#breaking-vs-non-breaking-changes)

## API Design Principles

### Core Principles

1. **Resource-Oriented Architecture**
   - Design APIs around resources, not actions
   - Use nouns for endpoints, verbs are HTTP methods
   - Example: `/api/v2/work-orders` not `/api/v2/getWorkOrders`

2. **Consistency Across APIs**
   - Same patterns for similar operations
   - Same response format across all endpoints
   - Same error handling everywhere

3. **Backwards Compatibility**
   - Always add fields, never remove
   - Make changes non-breaking when possible
   - Version when breaking changes are necessary

4. **Developer Experience**
   - Clear, intuitive endpoint structure
   - Comprehensive documentation with examples
   - Consistent error messages and codes

5. **Security First**
   - Always authenticate (except public OAuth flows)
   - Apply least-privilege access control
   - Validate all inputs
   - Log security-relevant events

6. **Simplicity**
   - Simple operations should be simple
   - Complex operations possible but not required
   - Minimal learning curve for developers

7. **Pragmatism**
   - Follow standards but allow exceptions
   - Justify and document any deviations
   - Review non-standard designs with API board

## RESTful Standards

### HTTP Method Usage

| Method | Purpose | Safe | Idempotent | Cacheable |
|--------|---------|------|------------|-----------|
| GET | Read resource | Yes | Yes | Yes |
| POST | Create resource | No | No | No |
| PUT | Replace entire resource | No | Yes | No |
| PATCH | Partial update | No | No | No |
| DELETE | Remove resource | No | Yes | No |
| HEAD | Like GET without body | Yes | Yes | Yes |

### URL Structure

**✅ CORRECT**
```
GET    /api/v2/work-orders              # List work orders
GET    /api/v2/work-orders/:id          # Get single work order
POST   /api/v2/work-orders              # Create work order
PUT    /api/v2/work-orders/:id          # Replace work order
PATCH  /api/v2/work-orders/:id          # Partial update
DELETE /api/v2/work-orders/:id          # Delete work order

GET    /api/v2/work-orders/:id/operations   # Nested resource
POST   /api/v2/work-orders/:id/operations   # Create nested resource
```

**❌ INCORRECT**
```
GET    /api/v2/getWorkOrders            # ❌ Verb in URL
POST   /api/v2/createWorkOrder          # ❌ Verb in URL
GET    /api/v2/work-order/:id           # ❌ Singular resource
POST   /api/v2/workOrder/doRelease      # ❌ Verb in URL
```

### Resource Naming

- **Plural Nouns**: `/work-orders` not `/work-order`
- **Lowercase with Hyphens**: `/api/v2/ncr-records` not `/NCRRecords`
- **Consistent Terminology**: Always use "work order" not "job" or "task"
- **Logical Hierarchy**: `/companies/:id/sites/:id/work-orders`

### Query Parameters

```
# Filtering
GET /api/v2/work-orders?status=IN_PROGRESS&priority=HIGH

# Pagination
GET /api/v2/work-orders?page=2&limit=50

# Sorting
GET /api/v2/work-orders?sort=-createdAt,+priority

# Field Selection
GET /api/v2/work-orders?fields=id,number,status

# Full-text Search
GET /api/v2/work-orders?q=search+term

# Combination
GET /api/v2/work-orders?status=IN_PROGRESS&page=1&limit=20&sort=-createdAt
```

## Response Format Standards

### Successful Response (200, 201)

```json
{
  "data": {
    "id": "wo-123",
    "number": "WO-001",
    "status": "IN_PROGRESS",
    "priority": "HIGH",
    "partNumber": "PART-456",
    "quantity": 100,
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T11:00:00Z"
  },
  "metadata": {
    "version": "2.0.0",
    "timestamp": "2025-01-15T11:00:00Z",
    "requestId": "req_abc123xyz"
  }
}
```

### List Response with Pagination

```json
{
  "data": [
    { "id": "wo-1", "number": "WO-001", ... },
    { "id": "wo-2", "number": "WO-002", ... },
    { "id": "wo-3", "number": "WO-003", ... }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8,
    "hasMore": true,
    "cursor": "eyJpZCI6IjMifQ=="
  },
  "metadata": {
    "version": "2.0.0",
    "timestamp": "2025-01-15T11:00:00Z",
    "requestId": "req_abc123xyz"
  }
}
```

### Error Response (4xx, 5xx)

```json
{
  "error": {
    "type": "VALIDATION_ERROR",
    "message": "Invalid work order status",
    "code": "WO_INVALID_STATUS",
    "statusCode": 422,
    "details": {
      "field": "status",
      "providedValue": "INVALID",
      "allowedValues": ["DRAFT", "RELEASED", "IN_PROGRESS", "COMPLETED"],
      "suggestions": "Use one of the allowed values"
    }
  },
  "requestId": "req_abc123xyz",
  "timestamp": "2025-01-15T11:00:00Z"
}
```

### Response Structure Rules

1. **Root Object**: Always wrap response in object
   - ✅ `{ "data": {...} }`
   - ❌ `[{...}]` or `"string"`

2. **Data Field**: Always include `data` field
   - For single resource: `"data": {...}`
   - For list: `"data": [...]`

3. **Metadata Field**: Always include metadata
   - Version of API
   - Timestamp of response
   - Request ID for tracing

4. **Null vs Omitted**: Be consistent
   - If field can be null, include it as `null`
   - If field optional, may omit entirely
   - Document the choice per field

## Naming Conventions

### JSON Fields

```javascript
// ✅ CORRECT
{
  "workOrderNumber": "WO-123",      // camelCase
  "partNumber": "PART-456",
  "status": "IN_PROGRESS",           // UPPER_CASE for enums
  "createdAt": "2025-01-15T10:30:00Z", // ISO 8601
  "isActive": true,                  // Boolean prefix: is/has/can
  "hasErrors": false,
  "canDelete": true,
  "errorCount": 0
}

// ❌ INCORRECT
{
  "work_order_number": "WO-123",     // snake_case
  "WorkOrderNumber": "WO-123",       // PascalCase
  "status": "in_progress",           // lowercase for enums
  "createdAt": 1737900600,           // Unix timestamp
  "active": true,                    // No boolean prefix
  "errors": false
}
```

### Enum Values

```typescript
// ✅ CORRECT
enum WorkOrderStatus {
  DRAFT = "DRAFT",
  RELEASED = "RELEASED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED"
}

// ❌ INCORRECT
enum WorkOrderStatus {
  Draft = "Draft",           // Mixed case
  Released = "Released",
  InProgress = "InProgress", // Not screaming snake case
  Completed = "Completed"
}
```

### Date/Time Format

- **Always ISO 8601**: `2025-01-15T10:30:00Z`
- **Include Timezone**: Z for UTC, +HH:MM for others
- **Milliseconds Optional**: `2025-01-15T10:30:00.123Z`
- **Never Unix Timestamps**: Don't use 1737900600

### Plural vs Singular

| Context | Style |
|---------|-------|
| Endpoint | Plural: `/api/v2/work-orders` |
| Array field | Plural: `"operations": [...]` |
| Single object | Singular: `"metadata": {...}` |
| Boolean field | Prefix: `isActive`, `hasErrors` |

## Pagination Standards

### Offset-Based Pagination (Simple Cases)

Best for: API users, small datasets, random access

```
GET /api/v2/work-orders?page=1&limit=20

Response:
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8,
    "hasMore": true
  }
}
```

### Cursor-Based Pagination (Large Datasets)

Best for: Real-time feeds, large datasets, preventing offset problems

```
GET /api/v2/work-orders?cursor=abc123&limit=20

Response:
{
  "data": [...],
  "pagination": {
    "cursor": "abc123",
    "limit": 20,
    "nextCursor": "def456",
    "prevCursor": "xyz789",
    "hasMore": true
  }
}
```

### Pagination Rules

1. **Max Limit**: Cap at 100 items per request
2. **Default Limit**: 20 items if not specified
3. **Total Count**: Always include for offset-based
4. **Validate Inputs**: page > 0, limit > 0 and <= 100
5. **Cursor Format**: Base64-encoded, opaque to clients

## Filtering & Sorting

### Filtering

```
# Simple equality
GET /api/v2/work-orders?status=IN_PROGRESS

# Multiple values (OR)
GET /api/v2/work-orders?status=IN_PROGRESS&status=COMPLETED

# Range queries
GET /api/v2/work-orders?createdAfter=2025-01-01&createdBefore=2025-01-31

# Operators (if needed)
GET /api/v2/work-orders?priority[gte]=5&priority[lt]=10

# Full-text search
GET /api/v2/work-orders?q=search+term
```

### Sorting

```
# Single field, ascending
GET /api/v2/work-orders?sort=createdAt

# Single field, descending (prefix with -)
GET /api/v2/work-orders?sort=-createdAt

# Multiple fields
GET /api/v2/work-orders?sort=-createdAt,+priority,+number

# In response header
Link: <...?page=2&sort=-createdAt>; rel="next"
```

### Field Selection

```
# Include only specific fields
GET /api/v2/work-orders?fields=id,number,status

# Exclude specific fields
GET /api/v2/work-orders?exclude=configuration,metadata

# Nested field selection
GET /api/v2/work-orders?fields=id,operations.id,operations.status
```

## GraphQL Design

### Schema Design Principles

```graphql
# ✅ CORRECT - Strongly typed, clear boundaries

type WorkOrder {
  id: ID!
  number: String!
  status: WorkOrderStatus!
  priority: Priority!
  quantity: Int!
  createdAt: DateTime!
  updatedAt: DateTime!

  # Nested resource as connection
  operations(
    first: Int
    after: String
  ): OperationConnection!
}

type OperationConnection {
  edges: [OperationEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type OperationEdge {
  cursor: String!
  node: Operation!
}

enum WorkOrderStatus {
  DRAFT
  RELEASED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

input CreateWorkOrderInput {
  partNumber: String!
  quantity: Int!
  priority: Priority = NORMAL
  dueDate: DateTime
}

type Mutation {
  createWorkOrder(input: CreateWorkOrderInput!): CreateWorkOrderPayload!
  updateWorkOrder(id: ID!, input: UpdateWorkOrderInput!): UpdateWorkOrderPayload!
  deleteWorkOrder(id: ID!): DeleteWorkOrderPayload!
}

# ❌ INCORRECT - Weak typing, unclear patterns

type WorkOrder {
  id: String         # Not ID!
  number: String
  status: String     # Not enum
  operations: [Operation]  # Not paginated
}

input WorkOrderInput {
  partNumber: String
  quantity: String   # Should be Int!
  data: JSON         # Too generic
}

type Mutation {
  doWorkOrder(data: JSON): String  # No clear input/output
}
```

### Query Performance

1. **Limit Nesting Depth**: Max 10 levels
2. **Complexity Analysis**: Assign cost per field
   - Simple scalar: 1 point
   - List: 5 points
   - Connection: 10 points
3. **Max Query Cost**: 1000 points
4. **Query Timeout**: 30 seconds max
5. **DataLoader Pattern**: Batch queries to prevent N+1

```typescript
// Complexity scoring
const scoreMap = {
  WorkOrder: 10,
  Operation: 5,
  WorkOrderConnection: {
    edges: { multiplier: true },  // Cost × number of edges
    pageInfo: 1,
    totalCount: 1
  }
};
```

## Error Handling

### HTTP Status Codes

| Status | Use Case | Example |
|--------|----------|---------|
| 200 OK | Successful GET, PUT, PATCH | Work order updated |
| 201 Created | Successful POST | Work order created |
| 204 No Content | Successful DELETE | Work order deleted |
| 400 Bad Request | Invalid input | Missing required field |
| 401 Unauthorized | Authentication missing/invalid | Missing API key |
| 403 Forbidden | Authenticated but no permission | User lacks permission |
| 404 Not Found | Resource doesn't exist | Work order ID not found |
| 409 Conflict | Resource state conflict | Duplicate work order |
| 422 Unprocessable Entity | Validation error | Invalid work order status |
| 429 Too Many Requests | Rate limit exceeded | Too many requests |
| 500 Internal Server Error | Server error | Database connection failed |
| 503 Service Unavailable | Temporary outage | Service maintenance |

### Error Response Format

```json
{
  "error": {
    "type": "VALIDATION_ERROR",
    "message": "One or more fields failed validation",
    "code": "VALIDATION_FAILED",
    "statusCode": 422,
    "details": [
      {
        "field": "quantity",
        "message": "Must be a positive integer",
        "providedValue": -5,
        "allowedValues": null,
        "constraints": "Must be > 0"
      },
      {
        "field": "status",
        "message": "Invalid status value",
        "providedValue": "INVALID",
        "allowedValues": ["DRAFT", "RELEASED", "IN_PROGRESS", "COMPLETED"],
        "constraints": "Must be one of the allowed values"
      }
    ]
  },
  "requestId": "req_abc123xyz",
  "timestamp": "2025-01-15T11:00:00Z"
}
```

### Error Codes

Format: `DOMAIN_ERROR_TYPE`

```
# Work Order Domain
WO_NOT_FOUND
WO_INVALID_STATUS
WO_INSUFFICIENT_INVENTORY
WO_RELEASE_FAILED

# NCR Domain
NCR_NOT_FOUND
NCR_INVALID_SEVERITY
NCR_UNAPPROVED_CA

# General
INVALID_REQUEST
AUTHENTICATION_FAILED
PERMISSION_DENIED
RATE_LIMITED
INTERNAL_SERVER_ERROR
```

### Error Messages

- **User-Friendly**: Explain what went wrong and how to fix it
- **Actionable**: Tell user what to do next
- **Specific**: Not "Invalid input" but "Quantity must be > 0"
- **Non-Technical**: Avoid system errors or stack traces

```json
// ✅ Good error message
{
  "message": "Quantity must be a positive integer. You provided: -5",
  "suggestion": "Enter a value greater than 0"
}

// ❌ Bad error message
{
  "message": "Invalid input"
}
```

## Security Best Practices

### Authentication & Authorization

1. **Always Authenticate**
   - No unauthenticated endpoints (except OAuth flows)
   - Require API key, Bearer token, or session cookie
   - Validate authentication on every request

2. **Least Privilege**
   - Grant only permissions needed
   - Use role-based access control (RBAC)
   - Check permissions on every request

3. **Validate Permissions**
   - Don't cache permission results
   - Re-check on each request
   - Log all permission changes

4. **Audit Logging**
   - Log all authenticated actions
   - Include: user, action, timestamp, resource
   - Store in immutable audit log

### Input Validation

1. **Validate All Inputs**
   - Never trust client data
   - Validate on server, not just client
   - Reject unexpected fields

2. **Whitelist Approach**
   - Define allowed values explicitly
   - Reject anything not whitelisted
   - Don't try to blacklist bad values

3. **Type Checking**
   - Enforce data types strictly
   - Validate format (email, phone, etc.)
   - Reject type mismatches

4. **Length Limits**
   - Cap string lengths
   - Limit array sizes
   - Prevent buffer overflow

### SQL Injection Prevention

1. **Use Parameterized Queries**
   - Always use Prisma/ORM
   - Never concatenate SQL strings
   - Use prepared statements

```typescript
// ✅ CORRECT - Parameterized
const workOrder = await prisma.workOrder.findUnique({
  where: { id: workOrderId }  // Parameterized
});

// ❌ INCORRECT - String concatenation
const query = `SELECT * FROM work_orders WHERE id = '${workOrderId}'`;
```

2. **Input Validation**
   - Validate IDs are valid format
   - Check types before querying
   - Limit query scope to user's data

### XSS Prevention

1. **Escape Output**
   - HTML-escape all user-generated content
   - Use templating engine that escapes by default
   - Never use innerHTML with user data

2. **Content Security Policy**
   - Set CSP headers
   - Restrict script sources
   - Prevent inline scripts

3. **Sanitize Input**
   - Remove dangerous HTML tags
   - Use sanitization library
   - Whitelist allowed HTML

### API Key Security

1. **Hash Keys**
   - Store bcrypt hash, never plaintext
   - Can't recover from hash
   - Rotate periodically

2. **Key Rotation**
   - Support multiple active keys
   - Disable old keys
   - 90-day rotation recommended

3. **Expiration**
   - Inactive keys expire after 180 days
   - Force rotation for compromised keys
   - Alert on suspicious usage

4. **Detection**
   - Monitor for unusual patterns
   - Alert on sudden rate spike
   - Check geographic anomalies

## Performance Optimization

### Database Queries

1. **N+1 Prevention**
   ```typescript
   // ❌ N+1 Query - Slow
   const workOrders = await prisma.workOrder.findMany();
   for (const wo of workOrders) {
     const operations = await prisma.operation.findMany({
       where: { workOrderId: wo.id }
     }); // N queries
   }

   // ✅ Eager Loading - Fast
   const workOrders = await prisma.workOrder.findMany({
     include: { operations: true }  // 1 query
   });
   ```

2. **Index Strategy**
   - Index foreign keys
   - Index filter fields
   - Index sort fields
   - Avoid over-indexing

3. **Pagination**
   - Always paginate large datasets
   - Don't load all records at once
   - Use cursor-based for performance

4. **Field Selection**
   ```typescript
   // ❌ Load all fields
   const workOrder = await prisma.workOrder.findUnique({
     where: { id: woId }
   });

   // ✅ Select only needed
   const workOrder = await prisma.workOrder.findUnique({
     where: { id: woId },
     select: {
       id: true,
       number: true,
       status: true
       // Don't select large fields: configuration, description
     }
   });
   ```

5. **Avoid SELECT ***
   - Be explicit about fields
   - Reduces data transfer
   - Clarifies API contract

### Caching Strategy

1. **Cache Immutable Data**
   - Reference data (parts, users, configurations)
   - Long TTL (1 hour+)
   - Pre-warm cache

2. **Short TTL for Mutable**
   - Work orders, operations
   - Short TTL (30 seconds)
   - Invalidate on changes

3. **Cache-Control Headers**
   ```
   Cache-Control: public, max-age=3600  // 1 hour
   Cache-Control: private, max-age=300  // 5 minutes
   Cache-Control: no-cache  // Must revalidate
   ```

4. **ETag Support**
   ```
   ETag: "33a64df551..."
   If-None-Match: "33a64df551..."  // Returns 304 if unchanged
   ```

### Monitoring

1. **Response Times**
   - P50: 50th percentile (median)
   - P95: 95th percentile
   - P99: 99th percentile
   - Target: P99 < 1 second

2. **Error Rates**
   - Alert when > 1%
   - Distinguish client vs server errors
   - Track by endpoint

3. **Rate Limiting**
   - Prevent abuse
   - Fair usage for all clients
   - Clear communication of limits

## Idempotency & Retry Patterns

### Idempotency

Retrying the same request produces the same result (no duplicates).

```
POST /api/v2/work-orders
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "partNumber": "PART-001",
  "quantity": 10
}

Response: 201 Created
{
  "data": { "id": "wo-123", ... }
}

# Retry with same key returns same response (201, same work order)
```

### Retry Strategy

```
Retry on: 429, 500, 502, 503, 504
Don't retry: 400, 401, 403, 404 (client errors)

Exponential backoff:
- Attempt 1: Wait 1 second
- Attempt 2: Wait 2 seconds
- Attempt 3: Wait 4 seconds
- Attempt 4: Wait 8 seconds
- Max attempts: 4
```

## Breaking vs Non-Breaking Changes

### ✅ Non-Breaking Changes (Safe)

- Adding new endpoints
- Adding fields to responses
- Adding optional request parameters
- Adding new enum values
- Relaxing validation
- Making required field optional
- Adding webhook events
- Performance improvements
- Deprecation notices

### ❌ Breaking Changes (Requires New Version)

- Removing endpoints
- Removing fields
- Renaming fields
- Changing field types
- Changing response structure
- Making optional required
- Strengthening validation
- Changing HTTP status codes
- Removing enum values
- Changing auth method

### Deprecation Policy

1. **Announcement Phase** (6 months)
   - Publish deprecation notice
   - Update documentation
   - Notify via email/dashboard

2. **Sunset Phase** (12 months)
   - Continue supporting old version
   - Warn clients of impending removal
   - Provide migration guide

3. **Removal Phase** (18 months)
   - Remove from production
   - Maintain documentation
   - Link to migration guide

### Change Review Process

1. **Proposal**: Submit RFC with motivation
2. **Discussion**: 2 weeks community feedback
3. **API Board Review**: Evaluate impact
4. **Decision**: Approve/reject/revise
5. **Implementation**: Code + tests + docs
6. **Announcement**: Communicate to developers

## Governance & Compliance

### API Design Checklist

Before releasing any API:

- [ ] Follows RESTful principles
- [ ] Uses correct HTTP verbs
- [ ] Proper response format
- [ ] Consistent naming conventions
- [ ] Comprehensive error handling
- [ ] Input validation documented
- [ ] Security best practices applied
- [ ] Performance optimized
- [ ] Complete documentation
- [ ] Examples provided
- [ ] Backward compatible
- [ ] API review board approval

### Documentation Requirements

For every API endpoint:

- [ ] Description of functionality
- [ ] When to use this endpoint
- [ ] All parameters with types
- [ ] Request examples (cURL, JavaScript, Python)
- [ ] Response examples (success and errors)
- [ ] Error codes that may occur
- [ ] Rate limits and quotas
- [ ] Authentication requirements
- [ ] Permission requirements
- [ ] Related endpoints

---

**Last Updated**: January 2025
**API Version**: 2.0.0
**Status**: Active
