# Comprehensive API Inventory Report

Generated: 10/30/2025, 10:21:41 AM

## Executive Summary

This report provides a comprehensive analysis of the MachShop Manufacturing Execution System (MES) API, covering **864 endpoints** across **62 route modules**. The API demonstrates strong manufacturing domain coverage with robust security and validation patterns.

### Key Metrics

| Metric | Value | Coverage |
|--------|--------|----------|
| **Total Endpoints** | 864 | 100% |
| **Route Modules** | 62 | - |
| **Documentation Coverage** | 495/864 | 57% |
| **Security Protection** | 201/864 | 23% |
| **Validation Coverage** | 445/864 | 52% |

## Business Domain Analysis

### Other

- **Endpoints:** 149
- **Modules:** 12
- **Documentation:** 0%
- **Security Level:** public
- **Method Distribution:** POST: 60, GET: 78, PUT: 9, DELETE: 2

**Key Modules:** l2Equipment, eco, b2m

### Document Management

- **Endpoints:** 139
- **Modules:** 7
- **Documentation:** 100%
- **Security Level:** public
- **Method Distribution:** POST: 50, GET: 62, PUT: 12, DELETE: 15

**Key Modules:** workInstructions, toolDrawings, unifiedDocuments

### Production Management

- **Endpoints:** 133
- **Modules:** 6
- **Documentation:** 48%
- **Security Level:** high
- **Method Distribution:** POST: 47, GET: 61, PUT: 12, DELETE: 13

**Key Modules:** routings, processSegments, productionSchedules

### Quality Management

- **Endpoints:** 91
- **Modules:** 7
- **Documentation:** 68%
- **Security Level:** high
- **Method Distribution:** POST: 42, GET: 31, PUT: 8, DELETE: 9, PATCH: 1

**Key Modules:** fai, inspectionPlans, spc

### Collaboration

- **Endpoints:** 88
- **Modules:** 6
- **Documentation:** 100%
- **Security Level:** public
- **Method Distribution:** POST: 42, GET: 35, PUT: 5, DELETE: 6

**Key Modules:** activities, reviews, collaboration

### Material Management

- **Endpoints:** 71
- **Modules:** 4
- **Documentation:** 59%
- **Security Level:** public
- **Method Distribution:** GET: 42, PUT: 9, POST: 15, DELETE: 5

**Key Modules:** materials, products, traceability

### Authentication & Security

- **Endpoints:** 53
- **Modules:** 6
- **Documentation:** 19%
- **Security Level:** high
- **Method Distribution:** GET: 27, POST: 18, PUT: 3, DELETE: 5

**Key Modules:** ssoAdmin, audit, auth

### Workflow Management

- **Endpoints:** 42
- **Modules:** 2
- **Documentation:** 79%
- **Security Level:** high
- **Method Distribution:** POST: 22, GET: 18, PUT: 1, DELETE: 1

**Key Modules:** workflows, unifiedApprovals

### Administration

- **Endpoints:** 33
- **Modules:** 5
- **Documentation:** 39%
- **Security Level:** high
- **Method Distribution:** GET: 14, POST: 9, PUT: 4, DELETE: 6

**Key Modules:** roleTemplates, user-roles, permissions

### Equipment Management

- **Endpoints:** 27
- **Modules:** 1
- **Documentation:** 100%
- **Security Level:** public
- **Method Distribution:** GET: 16, POST: 7, PUT: 2, DELETE: 2

**Key Modules:** equipment

### Time Tracking

- **Endpoints:** 15
- **Modules:** 1
- **Documentation:** 0%
- **Security Level:** high
- **Method Distribution:** POST: 6, GET: 5, PUT: 3, DELETE: 1

**Key Modules:** timeTracking

### Core Infrastructure

- **Endpoints:** 10
- **Modules:** 2
- **Documentation:** 40%
- **Security Level:** public
- **Method Distribution:** GET: 5, POST: 3, PUT: 1, DELETE: 1

**Key Modules:** sites, presence

### Analytics & Reporting

- **Endpoints:** 7
- **Modules:** 2
- **Documentation:** 100%
- **Security Level:** high
- **Method Distribution:** GET: 7

**Key Modules:** dashboard, search

### Personnel Management

- **Endpoints:** 6
- **Modules:** 1
- **Documentation:** 100%
- **Security Level:** public
- **Method Distribution:** GET: 4, PUT: 1, POST: 1

**Key Modules:** personnel

## HTTP Method Distribution

- **GET:** 405 endpoints (47%)
- **POST:** 322 endpoints (37%)
- **PUT:** 70 endpoints (8%)
- **DELETE:** 66 endpoints (8%)
- **PATCH:** 1 endpoints (0%)

## Security Analysis

### Authentication & Authorization Patterns

| Pattern | Endpoints | Usage |
|---------|-----------|-------|
| Protected Endpoints | 201 | 23% |
| Public Endpoints | 663 | 77% |
| Permission-Based | 83 | 10% |
| Role-Based | 9 | 1% |
| Site Access Control | 23 | 3% |
| Production Access | 62 | 7% |

## Validation Analysis

### Zod Schema Distribution

- **Total Schemas:** 121
- **Query Validation:** 4 schemas
- **Body Validation:** 116 schemas
- **Params Validation:** 1 schemas

### Top Validated Modules

- **routings:** 10 schemas
- **workflows:** 10 schemas
- **setupSheets:** 8 schemas
- **inspectionPlans:** 7 schemas
- **timeTracking:** 7 schemas
- **sops:** 6 schemas
- **collaboration:** 6 schemas
- **toolDrawings:** 5 schemas
- **reviews:** 5 schemas
- **notifications:** 5 schemas

## Operational Insights

### API Complexity Analysis

- **routings:** 70 complexity points
- **workflows:** 62 complexity points
- **workInstructions:** 42 complexity points
- **setupSheets:** 41 complexity points
- **inspectionPlans:** 40 complexity points
- **toolDrawings:** 39 complexity points
- **sops:** 39 complexity points
- **equipment:** 36 complexity points
- **eco:** 35 complexity points
- **l2Equipment:** 34 complexity points

### Integration Points

- routings
- workflows
- materials
- processSegments
- l2Equipment
- products
- equipment
- eco
- productionSchedules
- workInstructions
- toolDrawings
- unifiedDocuments
- fai
- sops
- inspectionPlans
- setupSheets
- b2m
- ssoAdmin
- activities
- reviews
- workOrders
- collaboration
- notifications
- spc
- upload
- timeTracking
- audit
- roleTemplates
- workOrderExecution
- traceability
- annotations
- comments
- integration
- media
- parameterGroups
- unifiedApprovals
- auth
- parameterLimits
- personnel
- signatures
- sso
- presence
- search
- serialization

### CRUD Operation Patterns

- **routings:** Create: 15, Read: 20, Update: 5, Delete: 7
- **workflows:** Create: 16, Read: 15, Update: 1, Delete: 1
- **materials:** Create: 8, Read: 20, Update: 3, Delete: 0
- **processSegments:** Create: 8, Read: 16, Update: 3, Delete: 4
- **l2Equipment:** Create: 7, Read: 16, Update: 5, Delete: 0
- **products:** Create: 6, Read: 11, Update: 6, Delete: 5
- **equipment:** Create: 7, Read: 16, Update: 2, Delete: 2
- **eco:** Create: 10, Read: 12, Update: 3, Delete: 1
- **productionSchedules:** Create: 12, Read: 9, Update: 3, Delete: 1
- **workInstructions:** Create: 11, Read: 10, Update: 2, Delete: 2

## Largest Route Modules

1. **routings** (Production Management) - 47 endpoints
2. **workflows** (Workflow Management) - 33 endpoints
3. **materials** (Material Management) - 31 endpoints
4. **processSegments** (Production Management) - 31 endpoints
5. **l2Equipment** (Other) - 28 endpoints
6. **products** (Material Management) - 28 endpoints
7. **equipment** (Equipment Management) - 27 endpoints
8. **eco** (Other) - 26 endpoints
9. **productionSchedules** (Production Management) - 25 endpoints
10. **workInstructions** (Document Management) - 25 endpoints
11. **toolDrawings** (Document Management) - 24 endpoints
12. **unifiedDocuments** (Document Management) - 23 endpoints
13. **fai** (Quality Management) - 22 endpoints
14. **sops** (Document Management) - 22 endpoints
15. **inspectionPlans** (Quality Management) - 21 endpoints

## Recommendations

### Priority Actions

1. **Improve Documentation Coverage**: Current coverage is 57%. Focus on documenting the remaining 369 undocumented endpoints.

2. **Security Standardization**: 663 endpoints appear to be public. Review these for potential security concerns.

3. **Validation Enhancement**: Extend Zod validation to more modules, particularly in the 34 modules without validation.

4. **Domain-Specific Documentation**: Enhance categorization for the "Other" domain which contains 149 endpoints.

### Quick Wins

- Implement OpenAPI spec generation from existing JSDoc comments
- Add request/response examples to high-traffic endpoints
- Standardize error response formats across all domains
- Create domain-specific API guides for manufacturing workflows

---

*This report was generated automatically from TypeScript route analysis. For updates, run `npm run docs:api:inventory`.*

## Appendix: Technical Details

**Analysis Method:** TypeScript AST parsing of Express.js routes
**Route Discovery:** Recursive file system traversal of `src/routes/`
**Validation Detection:** Zod schema extraction and analysis
**Security Analysis:** Middleware pattern recognition
**Business Context:** Domain mapping based on manufacturing workflows

**Generated At:** 2025-10-30T14:20:20.902Z
