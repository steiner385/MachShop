# MachShop API Route Testing Documentation Index

This directory contains comprehensive documentation about the MachShop API route structure to support Issue #154 (Route Testing).

## Documentation Files

### 1. API_ROUTE_STRUCTURE_ANALYSIS.md
**Purpose:** Comprehensive technical analysis of the entire API route architecture
**Contents:**
- Executive summary with key metrics
- Complete route architecture overview
- All 54 route files categorized by domain
- Authentication and authorization patterns
- Middleware stack details
- Route handler patterns (CRUD, validation, error handling)
- Existing test coverage (4 route test files)
- Key architectural insights
- Common route patterns
- Missing testing coverage analysis
- Recommendations for Issue #154 testing strategy

**Audience:** Developers implementing route tests, architects understanding system design
**Length:** 696 lines
**Best For:** Deep technical understanding

### 2. API_ROUTE_QUICK_REFERENCE.txt
**Purpose:** Quick-lookup reference guide for the API structure
**Contents:**
- Metrics at a glance (54 route files, ~854 endpoints)
- Route inventory by category (8 main categories)
- Authentication/authorization patterns summary
- Middleware stack overview
- Route handler patterns
- Test coverage status
- Key architectural features
- File paths reference

**Audience:** Developers writing tests, code reviewers
**Length:** 400+ lines
**Best For:** Quick reference, quick facts

### 3. API_ENDPOINT_EXAMPLES.md
**Purpose:** Practical examples of all major API endpoints
**Contents:**
- Authentication examples (public routes)
- Work order endpoints
- Equipment management endpoints
- Product/parts endpoints
- Materials management endpoints
- Dashboard endpoints
- Document management endpoints
- Administrative routes examples
- Workflow routes
- Integration routes
- Request/response format examples
- Query parameter patterns
- HTTP status codes guide
- Multi-tenancy examples

**Audience:** API users, test writers, integration developers
**Length:** 441 lines
**Best For:** Understanding endpoint usage

### 4. ROUTE_EXPLORATION_SUMMARY.md (This File)
**Purpose:** High-level summary of the exploration findings
**Contents:**
- Documents created (with descriptions)
- Key findings summary
- Route architecture overview
- Test coverage status
- Critical gaps analysis
- Recommended test structure
- Route handler patterns
- Implementation patterns
- Testing recommendations

**Audience:** Project managers, lead developers
**Length:** 400+ lines
**Best For:** Understanding the big picture

## Quick Navigation by Task

### I need to understand the API structure:
1. Start with: **API_ROUTE_QUICK_REFERENCE.txt** (5 min overview)
2. Then read: **API_ROUTE_STRUCTURE_ANALYSIS.md** (20 min deep dive)

### I need to write route tests:
1. Check: **API_ENDPOINT_EXAMPLES.md** (understand endpoints)
2. Review: **API_ROUTE_QUICK_REFERENCE.txt** (auth patterns)
3. Study: **API_ROUTE_STRUCTURE_ANALYSIS.md** section 6 (existing test patterns)

### I need to understand authentication:
1. Read: **API_ROUTE_STRUCTURE_ANALYSIS.md** section 3 (Auth/Authz patterns)
2. Check: **API_ENDPOINT_EXAMPLES.md** (Request examples)

### I need to understand testing gaps:
1. Review: **ROUTE_EXPLORATION_SUMMARY.md** (Critical gaps section)
2. Read: **API_ROUTE_STRUCTURE_ANALYSIS.md** section 9 (Missing testing)

### I need to plan testing work:
1. Read: **ROUTE_EXPLORATION_SUMMARY.md** (Recommendations section)
2. Check: **API_ROUTE_STRUCTURE_ANALYSIS.md** section 10 (Priority matrix)

## Key Statistics

**API Scope:**
- Total route files: 54
- Total API endpoints: ~854
- Public routes: 2 (auth, sso)
- Protected routes: 52

**Test Coverage:**
- Currently tested route files: 4
- Currently tested endpoints: <50
- Testing coverage: <1%
- Untested route files: 50 (92.6%)

**Route Categories:**
1. Core Business Domain (6 routes) - Work orders, equipment, products, materials, quality, traceability
2. Document Management (6 routes) - Documents, sheets, plans, SOPs, drawings, instructions
3. Collaboration (6 routes) - Comments, annotations, reviews, notifications, activities, collaboration
4. Administration (5 routes) - Roles, permissions, role-permissions, user-roles, SSO admin
5. Manufacturing Integration (9 routes) - Maximo, Indysoft, Covalent, Shop Floor Connect, Predator, CMM, L2, Historian, B2M
6. Variable System (4 routes) - Parameters, groups, formulas, SPC
7. Operations (5 routes) - Routings, templates, schedules, segments, workflows
8. Utilities (8 routes) - Upload, media, signatures, FAI, serialization, search, presence, sites

## Architecture Patterns Identified

### Authentication
- JWT Bearer token-based
- Extracted from "Authorization: Bearer <token>" header
- Verified in authMiddleware
- Enhanced debug logging in test mode

### Authorization
- Database-driven RBAC system
- 7 domain-specific access control middlewares
- Role-based and permission-based checks
- Multi-tenancy support via site-scoped access
- System Administrator role for full access

### Middleware Stack
- Global: Helmet, CORS, compression, rate limiting, logging, metrics
- Route-level: Domain-specific access control
- Error handling: Custom error classes with asyncHandler wrapper

### Route Patterns
- CRUD: GET list, POST create, GET by ID, PUT update, DELETE
- Collection: GET classes, GET class by ID, GET hierarchy
- Nested resources: GET parent/:id/children
- Query-based filtering with pagination

### Validation
- Zod schemas for all inputs
- Query parameter validation with transformation
- Parameter ID validation before use
- Detailed error reporting

## Testing Infrastructure Available

### Test Frameworks
- Vitest (unit testing)
- Supertest (HTTP testing)
- Database test helpers (setup/cleanup)
- Service mocking with vi.mock()

### Existing Test Patterns
- Auth middleware mocking
- Service stub patterns
- Database fixture management (upsert-based)
- Express app setup for testing

### Test Files Location
- Route tests: `/src/tests/routes/`
- Middleware tests: `/src/tests/middleware/`
- Service tests: `/src/tests/services/`

## Critical Information for Test Implementation

### Default Database
- Prisma ORM
- Connection via: `import prisma from '../lib/database'`
- Test DB setup: `setupTestDatabase()` helper
- Test DB cleanup: `cleanupTestData()` helper
- Test DB teardown: `teardownTestDatabase()` helper

### Error Classes
- ValidationError (400)
- AuthenticationError (401)
- AuthorizationError (403)
- NotFoundError (404)
- BusinessRuleError (422)

### Logging
- Via: `import { logger } from '../utils/logger'`
- Via audit: `import { auditLogger } from '../middleware/requestLogger'`
- Patterns: info, warn, error, debug levels

### Configuration
- Via: `import { config } from '../config/config'`
- JWT secret handling for tests
- Environment-specific behavior

## Priority Routes for Issue #154

### Priority 1 (Critical Business Logic)
1. Work Orders (54+ endpoints) - Core business process
2. Equipment (30+ endpoints) - Asset management
3. Products/Parts (19+ endpoints) - Product catalog
4. Materials (22+ endpoints) - Supply chain
5. Admin RBAC (12+ endpoints) - Security/access control

### Priority 2 (Document Management)
1. Workflows (37+ endpoints) - Process automation
2. Work Instructions (20+ endpoints) - Operational procedures
3. Setup Sheets, Inspection Plans, SOPs, Tool Drawings
4. Unified Documents operations

### Priority 3 (Collaboration & Integration)
1. Reviews and approval workflows
2. Notifications and activities
3. Integration routes (B2M, ECO, etc.)

## Recommended Test Structure

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

## Next Steps for Issue #154

1. **Understand the Architecture** - Read API_ROUTE_STRUCTURE_ANALYSIS.md
2. **Review Existing Tests** - Study the 4 existing route test files
3. **Create Test Helpers** - Implement auth, database, and mock helpers
4. **Start Priority 1 Routes** - Begin with work orders, equipment, products
5. **Establish Patterns** - Document testing patterns as you go
6. **Expand Coverage** - Move to Priority 2 and 3 routes systematically

## Key File References

**Main Entry Point:**
- `/home/tony/GitHub/MachShop/src/index.ts`

**Middleware:**
- `/home/tony/GitHub/MachShop/src/middleware/auth.ts` (auth/authz)
- `/home/tony/GitHub/MachShop/src/middleware/errorHandler.ts` (error handling)
- `/home/tony/GitHub/MachShop/src/middleware/requestLogger.ts` (logging)

**Route Files:**
- `/home/tony/GitHub/MachShop/src/routes/` (all 54 route files)

**Test Files:**
- `/home/tony/GitHub/MachShop/src/tests/routes/` (4 existing test files)
- `/home/tony/GitHub/MachShop/src/tests/middleware/auth.test.ts` (auth tests)

**Configuration:**
- `/home/tony/GitHub/MachShop/src/config/config.ts`
- `/home/tony/GitHub/MachShop/src/lib/database.ts`

## Questions? 

Refer to the appropriate documentation file:
- Technical architecture questions: **API_ROUTE_STRUCTURE_ANALYSIS.md**
- Quick lookups: **API_ROUTE_QUICK_REFERENCE.txt**
- Endpoint usage: **API_ENDPOINT_EXAMPLES.md**
- High-level overview: **ROUTE_EXPLORATION_SUMMARY.md**
