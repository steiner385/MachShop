# MachShop API Route Structure Analysis

## Executive Summary

This document provides a comprehensive overview of the MachShop application's API route architecture. The application contains **54 route files** with approximately **854 API endpoints**, currently with **4 route test files** covering limited coverage.

## 1. Route Architecture Overview

### 1.1 Application Entry Point
**File:** `/home/tony/GitHub/MachShop/src/index.ts`

The Express application is configured with:
- **Base API Path:** `/api/v1`
- **Security Middleware:** Helmet, CORS, rate limiting, compression
- **Authentication:** Bearer token-based JWT authentication via `authMiddleware`
- **Error Handling:** Custom error handler with validation error support
- **Request Logging:** Request logger and metrics middleware for observability

### 1.2 Middleware Stack (Applied to All Routes)

1. **Helmet** - Security headers configuration with CSP directives
2. **CORS** - Cross-origin request handling with environment-specific rules
3. **Compression** - Response compression
4. **Rate Limiting** - 1000 requests per 15 minutes (disabled in test environment)
5. **Request Parsing** - JSON/URL-encoded body parsing (10MB limit)
6. **Request Logger** - Audit logging of all requests
7. **Metrics Middleware** - Prometheus metrics collection

## 2. Route Categories and Endpoints

### 2.1 Public Routes (No Authentication Required)

#### Authentication Routes
**File:** `/home/tony/GitHub/MachShop/src/routes/auth.ts`
- Base Path: `/api/v1/auth`
- Key Patterns:
  - User login/authentication
  - Token refresh
  - User registration
  - Database-driven RBAC support
  - Legacy role/permission arrays for backward compatibility
  - Demo credentials support

#### SSO Authentication Routes
**File:** `/home/tony/GitHub/MachShop/src/routes/sso.ts`
- Base Path: `/api/v1/sso`
- Key Features:
  - SSO provider discovery
  - Authentication initiation
  - Provider callbacks
  - Logout coordination
  - Session management
  - Multi-provider support
- Validation schemas using Zod

### 2.2 Protected Routes (Authentication Required)

#### Core Business Domain Routes

**Work Order Management**
- **File:** `/home/tony/GitHub/MachShop/src/routes/workOrders.ts`
- **Path:** `/api/v1/workorders`
- **Middleware:** `requireProductionAccess`, `requireSiteAccess`
- **Features:**
  - CRUD operations for work orders
  - Filtering by status, part number, priority, site
  - Pagination support
  - Query validation using Zod schemas
  - Audit logging for all operations

**Work Order Execution**
- **File:** `/home/tony/GitHub/MachShop/src/routes/workOrderExecution.ts`
- **Path:** `/api/v1/work-order-execution`
- **Middleware:** Authentication required

**Products/Parts Management**
- **File:** `/home/tony/GitHub/MachShop/src/routes/products.ts`
- **Path:** `/api/v1/products`
- **Features:**
  - Part CRUD operations
  - Product specifications and configurations
  - Product lifecycle management
  - BOM (Bill of Materials) operations
  - Get by ID and part number endpoints
  - Parameter validation for ID

**Materials Management**
- **File:** `/home/tony/GitHub/MachShop/src/routes/materials.ts`
- **Path:** `/api/v1/materials`
- **Middleware:** `requireProductionAccess`
- **Key Endpoints:**
  - Material class CRUD
  - Material class hierarchy
  - Material inventory management
  - Batch operations
  - Transaction tracking

**Equipment Management**
- **File:** `/home/tony/GitHub/MachShop/src/routes/equipment.ts`
- **Path:** `/api/v1/equipment`
- **Middleware:** `requireMaintenanceAccess`, `requireSiteAccess`
- **Features:**
  - Equipment CRUD operations
  - Status management (OPERATIONAL, MAINTENANCE, DOWN)
  - Equipment class filtering
  - Hierarchy support (parent equipment)
  - OEE calculation integration
  - Maintenance scheduling

**Quality Management**
- **File:** `/home/tony/GitHub/MachShop/src/routes/quality.ts`
- **Path:** `/api/v1/quality`
- **Middleware:** `requireQualityAccess`

**Traceability**
- **File:** `/home/tony/GitHub/MachShop/src/routes/traceability.ts`
- **Path:** `/api/v1/traceability`

#### Document Management Routes

**Unified Documents**
- **File:** `/home/tony/GitHub/MachShop/src/routes/unifiedDocuments.ts`
- **Path:** `/api/v1/documents`

**Setup Sheets**
- **File:** `/home/tony/GitHub/MachShop/src/routes/setupSheets.ts`
- **Path:** `/api/v1/setup-sheets`

**Inspection Plans**
- **File:** `/home/tony/GitHub/MachShop/src/routes/inspectionPlans.ts`
- **Path:** `/api/v1/inspection-plans`

**SOPs (Standard Operating Procedures)**
- **File:** `/home/tony/GitHub/MachShop/src/routes/sops.ts`
- **Path:** `/api/v1/sops`

**Tool Drawings**
- **File:** `/home/tony/GitHub/MachShop/src/routes/toolDrawings.ts`
- **Path:** `/api/v1/tool-drawings`

**Work Instructions**
- **File:** `/home/tony/GitHub/MachShop/src/routes/workInstructions.ts`
- **Path:** `/api/v1/work-instructions`

#### Collaboration & Review Routes

**Comments**
- **File:** `/home/tony/GitHub/MachShop/src/routes/comments.ts`
- **Path:** `/api/v1/comments`
- **Test Coverage:** `/home/tony/GitHub/MachShop/src/tests/routes/comments.test.ts`
- **Key Operations:**
  - Create comment
  - Get comments for document
  - Update comment
  - Delete comment
  - Toggle reaction
  - Get comment statistics

**Annotations**
- **File:** `/home/tony/GitHub/MachShop/src/routes/annotations.ts`
- **Path:** `/api/v1/annotations`

**Reviews**
- **File:** `/home/tony/GitHub/MachShop/src/routes/reviews.ts`
- **Path:** `/api/v1/reviews`

**Notifications**
- **File:** `/home/tony/GitHub/MachShop/src/routes/notifications.ts`
- **Path:** `/api/v1/notifications`

**Activities**
- **File:** `/home/tony/GitHub/MachShop/src/routes/activities.ts`
- **Path:** `/api/v1/activities`

**Collaboration**
- **File:** `/home/tony/GitHub/MachShop/src/routes/collaboration.ts`
- **Path:** `/api/v1/collaboration`

#### Administrative Routes

**Role Management**
- **File:** `/home/tony/GitHub/MachShop/src/routes/admin/roles.ts`
- **Path:** `/api/v1/admin/roles`
- **Middleware:** `requireRole('System Administrator')`
- **Features:**
  - List roles with filtering
  - Create new roles
  - Update role definitions
  - Delete roles
  - Pagination support
  - Search by name, code, or description

**Permission Management**
- **File:** `/home/tony/GitHub/MachShop/src/routes/admin/permissions.ts`
- **Path:** `/api/v1/admin/permissions`
- **Middleware:** `requireRole('System Administrator')`

**Role-Permission Assignment**
- **File:** `/home/tony/GitHub/MachShop/src/routes/admin/role-permissions.ts`
- **Path:** `/api/v1/admin/role-permissions`

**User-Role Assignment**
- **File:** `/home/tony/GitHub/MachShop/src/routes/admin/user-roles.ts`
- **Path:** `/api/v1/admin/user-roles`

**SSO Administration**
- **File:** `/home/tony/GitHub/MachShop/src/routes/ssoAdmin.ts`
- **Path:** `/api/v1/admin/sso`
- **Middleware:** `requirePermission('sso.admin.read')`
- **Features:**
  - Provider management (CRUD)
  - Session monitoring
  - Home realm discovery rules
  - System analytics and monitoring
  - Health checks and diagnostics

#### Dashboard & Analytics

**Dashboard**
- **File:** `/home/tony/GitHub/MachShop/src/routes/dashboard.ts`
- **Path:** `/api/v1/dashboard`
- **Middleware:** `requireDashboardAccess`, `requireSiteAccess`
- **Test Coverage:** `/home/tony/GitHub/MachShop/src/tests/routes/dashboard.test.ts`
- **KPI Endpoints:**
  - Active work orders count
  - Completed today metrics
  - Quality yield calculations
  - Equipment utilization
  - Personnel productivity
  - Material consumption trends

#### Integration Routes

**Material Planning (B2M)**
- **File:** `/home/tony/GitHub/MachShop/src/routes/b2mRoutes.ts`
- **Path:** `/api/v1/b2m`

**Engineering Change Orders (ECO)**
- **File:** `/home/tony/GitHub/MachShop/src/routes/ecoRoutes.ts`
- **Path:** `/api/v1/eco`

**Manufacturing Integrations**
- **Maximo:** `/api/v1/maximo`
- **Indysoft:** `/api/v1/indysoft`
- **Covalent:** `/api/v1/covalent`
- **Shop Floor Connect:** `/api/v1/shop-floor-connect`
- **Predator PDM:** `/api/v1/predator-pdm`
- **Predator DNC:** `/api/v1/predator-dnc`
- **CMM:** `/api/v1/cmm`
- **L2 Equipment:** `/api/v1/l2-equipment`
- **Historian:** `/api/v1/historian`

#### Variable System Routes (Phase 1 & 2)

**Parameters**
- **File:** `/home/tony/GitHub/MachShop/src/routes/parameterLimits.ts`
- **Path:** `/api/v1/parameters`

**Parameter Groups**
- **File:** `/home/tony/GitHub/MachShop/src/routes/parameterGroups.ts`
- **Path:** `/api/v1/parameter-groups`

**Formulas**
- **File:** `/home/tony/GitHub/MachShop/src/routes/parameterFormulas.ts`
- **Path:** `/api/v1/formulas`

**SPC (Statistical Process Control)**
- **File:** `/home/tony/GitHub/MachShop/src/routes/spc.ts`
- **Path:** `/api/v1/spc`

#### Miscellaneous Routes

**Routing Management**
- **File:** `/home/tony/GitHub/MachShop/src/routes/routings.ts`
- **Path:** `/api/v1/routings`

**Routing Templates**
- **File:** `/home/tony/GitHub/MachShop/src/routes/routingTemplates.ts`
- **Path:** `/api/v1/routing-templates`

**Personnel/HR**
- **File:** `/home/tony/GitHub/MachShop/src/routes/personnel.ts`
- **Path:** `/api/v1/personnel`

**Production Scheduling**
- **File:** `/home/tony/GitHub/MachShop/src/routes/productionSchedules.ts`
- **Path:** `/api/v1/production-schedules`

**Time Tracking**
- **File:** `/home/tony/GitHub/MachShop/src/routes/timeTracking.ts`
- **Path:** `/api/v1/time-tracking`

**Process Segments**
- **File:** `/home/toy/GitHub/MachShop/src/routes/processSegments.ts`
- **Path:** `/api/v1/process-segments`

**Workflows**
- **File:** `/home/tony/GitHub/MachShop/src/routes/workflows.ts`
- **Path:** `/api/v1/workflows`

**Media Management**
- **File:** `/home/tony/GitHub/MachShop/src/routes/media.ts`
- **Path:** `/api/v1/media`

**File Upload**
- **File:** `/home/tony/GitHub/MachShop/src/routes/upload.ts`
- **Path:** `/api/v1/upload`
- **Test Coverage:** `/home/tony/GitHub/MachShop/src/tests/routes/upload.enhanced.test.ts`

**Signatures**
- **File:** `/home/tony/GitHub/MachShop/src/routes/signatures.ts`
- **Path:** `/api/v1/signatures`

**FAI (First Article Inspection)**
- **File:** `/home/tony/GitHub/MachShop/src/routes/fai.ts`
- **Path:** `/api/v1/fai`

**Serialization**
- **File:** `/home/tony/GitHub/MachShop/src/routes/serialization.ts`
- **Path:** `/api/v1/serialization`

**Search**
- **File:** `/home/tony/GitHub/MachShop/src/routes/search.ts`
- **Path:** `/api/v1/search`
- **Middleware:** `authMiddleware`, `searchRoutes`

**Presence**
- **File:** `/home/tony/GitHub/MachShop/src/routes/presence.ts`
- **Path:** `/api/v1/presence`

**Sites**
- **File:** `/home/tony/GitHub/MachShop/src/routes/sites.ts`
- **Path:** `/api/v1/sites`

## 3. Authentication and Authorization Patterns

### 3.1 Authentication Middleware
**File:** `/home/tony/GitHub/MachShop/src/middleware/auth.ts`

#### Patterns Used:
1. **JWT-based Authentication**
   - Bearer token extraction from Authorization header
   - Token verification and decoding
   - User information attachment to request object
   - Token expiration handling
   - Enhanced debug logging in test mode

2. **Authorization Middleware Functions**
   - `requirePermission(permission)` - Check single permission
   - `requireRole(role)` - Check single role
   - `requireAnyRole(roles)` - Check if user has any of the specified roles
   - `requireAllPermissionsDB(permissions)` - Database-driven permission check
   - `requireRoleDB(role)` - Database-driven role check
   - `optionalAuth` - Optional authentication (no error if missing)

3. **Domain-Specific Access Control**
   - `requireProductionAccess` - Production domain access
   - `requireMaintenanceAccess` - Maintenance domain access
   - `requireQualityAccess` - Quality domain access
   - `requireManagementAccess` - Management access
   - `requireDashboardAccess` - Dashboard access
   - `requireRoutingAccess` - Routing domain access
   - `requireSiteAccess` - Site-scoped access verification

4. **Resource-Level Authorization**
   - `requireResourceOwnership` - Verify user owns the resource
   - `requireSiteAccessDB` - Database-driven site access verification

### 3.2 RBAC System Features

- **Database-Driven RBAC:** Permissions and roles stored in database
- **Hybrid Authorization:** Supports both legacy arrays and database lookups
- **Role Types:** Global roles and site-specific roles
- **Permission Inheritance:** Permissions through role assignments
- **System Admin Role:** "System Administrator" with full access

### 3.3 User Request Object Extensions

The Request object is extended with user information:
```typescript
req.user = {
  id: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  siteId?: string;
  resolvedPermissions?: ResolvedPermissions;
  isUsingDatabaseRBAC?: boolean;
}
```

## 4. Route Handler Patterns

### 4.1 Standard Route Handler Structure

All routes follow a consistent pattern:

```typescript
router.get('/path',
  // Middleware stack
  requireAccessControl,
  requireSiteAccess,
  // Handler wrapped with error handling
  asyncHandler(async (req, res) => {
    // Validate input
    const validationResult = schema.safeParse(req.query);
    if (!validationResult.success) {
      throw new ValidationError('message', errors);
    }

    // Business logic using service
    const result = await service.operation();

    // Response with logging
    logger.info('Operation completed', { userId: req.user?.id });
    return res.status(200).json(result);
  })
);
```

### 4.2 Input Validation

- **Zod schemas** for all input validation
- **Query parameter validation** with transformation
- **Request body validation** with detailed error reporting
- **Parameter validation** (ID verification before use)

### 4.3 Error Handling

Custom error classes:
- `ValidationError` - Input validation failures
- `AuthenticationError` - Missing/invalid credentials
- `AuthorizationError` - Insufficient permissions
- `NotFoundError` - Resource not found
- `BusinessRuleError` - Domain logic violations

Error handling via:
- `asyncHandler` wrapper for automatic error propagation
- Error middleware catching and formatting responses
- Audit logging of errors with user/IP context

### 4.4 Response Patterns

**Success Responses:**
```typescript
// Standard response
res.status(200).json(data);

// Created response
res.status(201).json(createdData);

// With pagination
{
  data: [...],
  pagination: { page, limit, total, pages }
}
```

**Error Responses:**
```typescript
{
  error: 'ERROR_CODE',
  message: 'User-friendly message',
  details?: { ... }
}
```

### 4.5 Logging Patterns

- **Info level:** Successful operations with userId, action context
- **Warn level:** Non-critical issues (e.g., fallback behavior)
- **Error level:** Failures with full error context
- **Debug level:** Detailed information in test mode
- **Audit logging:** Via `auditLogger` for sensitive operations

## 5. Middleware Usage Matrix

### Global Middleware (All Routes)
- Helmet (security headers)
- CORS
- Compression
- Rate limiting (except test)
- Request logger
- Metrics middleware
- Error handler

### Route-Level Middleware

| Route | Auth | Access Control | Additional |
|-------|------|-----------------|-----------|
| `/auth` | None | None | Public |
| `/sso` | None | None | Public |
| `/workorders` | authMiddleware | `requireProductionAccess`, `requireSiteAccess` | Audit logging |
| `/products` | authMiddleware | Implicit | - |
| `/materials` | authMiddleware | `requireProductionAccess` | - |
| `/equipment` | authMiddleware | `requireMaintenanceAccess`, `requireSiteAccess` | - |
| `/dashboard` | authMiddleware | `requireDashboardAccess`, `requireSiteAccess` | - |
| `/admin/roles` | authMiddleware | `requireRole('System Administrator')` | Audit logging |
| `/admin/sso` | authMiddleware | `requirePermission('sso.admin.read')` | - |

## 6. Existing Test Coverage

### Test Files (4 total)

1. **Dashboard Routes** (`/home/tony/GitHub/MachShop/src/tests/routes/dashboard.test.ts`)
   - KPI endpoints testing
   - Work order metrics
   - Equipment utilization
   - Database setup and cleanup
   - Integration with test database

2. **Comments Routes** (`/home/tony/GitHub/MachShop/src/tests/routes/comments.test.ts`)
   - Comment CRUD operations
   - Request validation
   - Service error handling
   - Reaction toggle
   - Statistics retrieval

3. **Upload Routes** (`/home/tony/GitHub/MachShop/src/tests/routes/upload.enhanced.test.ts`)
   - File upload operations
   - Validation
   - Error scenarios

4. **Dashboard Simple** (`/home/tony/GitHub/MachShop/src/tests/routes/dashboard-simple.test.ts`)
   - Simplified dashboard tests

### Test Infrastructure

**Helpers:**
- `setupTestDatabase()` - Database initialization for tests
- `cleanupTestData()` - Clean test data after each test
- `teardownTestDatabase()` - Database cleanup

**Testing Framework:**
- Vitest (unit testing)
- Supertest (HTTP request testing)
- Mocking with `vi.mock()` for dependencies

**Test Patterns:**
- Mock Express app setup with middleware
- Test database with upsert operations
- JWT token mocking
- Service mocking with return value stubs

## 7. Key Architectural Insights

### 7.1 Service-Based Architecture

Each route module delegates business logic to a service:
- `ProductService.createPart()`
- `WorkOrderService.getWorkOrders()`
- `EquipmentService.getAllEquipment()`
- `MaterialService.getMaterialClassById()`

Services are instantiated per-route and reused across requests.

### 7.2 Database Integration

- **Prisma ORM** for database operations
- Singleton database connection: `import prisma from '../lib/database'`
- Query builders for complex filtering
- Transaction support for multi-step operations

### 7.3 Validation Strategy

- **Frontend validation** via Zod schemas
- **Route parameter validation** before use
- **Query string validation** with safe parsing
- **Request body validation** with detailed errors

### 7.4 Environment Handling

- **Test Environment** special handling:
  - Rate limiting disabled
  - JWT secret from environment variable
  - Enhanced debug logging
  - Demo credentials support
  - Integration manager skipped

### 7.5 Multi-Tenancy Support

- **Site-scoped access** via `requireSiteAccess` middleware
- **Site filtering** in queries via `siteId` parameter
- **Site-specific roles** in RBAC system
- **Site context** passed through request lifecycle

## 8. Common Route Patterns

### 8.1 CRUD Pattern
```
GET    /resource           - List with filtering/pagination
POST   /resource           - Create
GET    /resource/:id       - Get by ID
PUT    /resource/:id       - Update
DELETE /resource/:id       - Delete
```

### 8.2 Collection Pattern
```
GET    /resource/classes                  - List classes
GET    /resource/classes/:id              - Get class
GET    /resource/classes/:id/hierarchy    - Get hierarchy
```

### 8.3 Nested Resource Pattern
```
GET    /document/:id/comments    - Get comments for document
POST   /document/:id/comments    - Create comment on document
```

### 8.4 Query-Based Filtering Pattern
```
GET /resource?status=ACTIVE&siteId=123&page=1&limit=20
```

## 9. Missing Testing Coverage

### High-Priority Routes (No Tests)
- Admin routes (roles, permissions, user-roles, role-permissions)
- Work order routes (54+ endpoints)
- Equipment routes (30+ endpoints)
- Materials routes (22+ endpoints)
- Product routes (19+ endpoints)
- Routing routes (41+ endpoints)
- Workflow routes (37+ endpoints)
- Integration routes (all aerospace integrations)
- SSO admin routes

### Test Infrastructure Needs
- Standardized test setup utilities
- Authentication test helpers
- Database fixture management
- Service mocking patterns
- Authorization testing patterns
- Error scenario templates

## 10. Recommendations for Issue #154 Route Testing

### Priority 1 (Critical Business Logic)
1. Work Orders (CRUD, filtering, status transitions)
2. Equipment (CRUD, status management, hierarchy)
3. Products/Parts (CRUD, BOM operations)
4. Materials (inventory, transactions)
5. Admin roles and permissions (authorization coverage)

### Priority 2 (Document Management)
1. Workflows (creation, state transitions)
2. Work Instructions (CRUD, document lifecycle)
3. Setup Sheets, Inspection Plans, SOPs, Tool Drawings
4. Unified Document operations

### Priority 3 (Collaboration & Integration)
1. Reviews and annotations
2. Notifications
3. Activities logging
4. Integration routes (B2M, ECO, etc.)

### Test Structure Recommendation
```
src/tests/routes/
├── admin/
│   ├── roles.test.ts
│   ├── permissions.test.ts
│   ├── user-roles.test.ts
│   └── role-permissions.test.ts
├── business-domain/
│   ├── workOrders.test.ts
│   ├── equipment.test.ts
│   ├── products.test.ts
│   ├── materials.test.ts
│   └── routings.test.ts
├── documents/
│   ├── workflows.test.ts
│   ├── workInstructions.test.ts
│   ├── setupSheets.test.ts
│   └── inspectionPlans.test.ts
├── collaboration/
│   ├── reviews.test.ts
│   ├── annotations.test.ts
│   └── notifications.test.ts
└── helpers/
    ├── authTestHelper.ts
    ├── databaseTestHelper.ts
    └── serviceTestMocks.ts
```

### Testing Best Practices
1. Use `setupTestDatabase()` for integration tests
2. Mock services for unit tests
3. Test both success and error paths
4. Validate pagination and filtering
5. Test authorization at route level
6. Cover validation error cases
7. Test multitenancy (site scoping)
8. Verify audit logging
