# MachShop API Documentation

> Comprehensive API reference for the MachShop Manufacturing Execution System

Generated: 10/30/2025, 10:28:12 AM

## Overview

The MachShop API provides comprehensive access to manufacturing execution system functionality with **864 endpoints** across **62 modules**.

### Key Statistics

| Metric | Value |
|--------|-------|
| Total Endpoints | 864 |
| Business Domains | 14 |
| Documentation Coverage | 57% |
| Validation Coverage | 57% |

### Authentication

All API endpoints require authentication using JWT Bearer tokens:

```http
Authorization: Bearer <your-jwt-token>
```

## Business Domains

### Production Management

133 endpoints available

#### routings

Routing API Routes

##### POST /api/v1/routings

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
POST /api/v1/routings HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/routings

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
GET /api/v1/routings HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/routings/:id

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
GET /api/v1/routings/:id HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/routings/number/:routingNumber

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
GET /api/v1/routings/number/:routingNumber HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### PUT /api/v1/routings/:id

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
PUT /api/v1/routings/:id HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### DELETE /api/v1/routings/:id

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
DELETE /api/v1/routings/:id HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/routings/:routingId/steps

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
POST /api/v1/routings/:routingId/steps HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/routings/:routingId/steps

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
GET /api/v1/routings/:routingId/steps HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/routings/steps/:stepId

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
GET /api/v1/routings/steps/:stepId HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### PUT /api/v1/routings/steps/:stepId

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
PUT /api/v1/routings/steps/:stepId HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### DELETE /api/v1/routings/steps/:stepId

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
DELETE /api/v1/routings/steps/:stepId HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/routings/:routingId/steps/resequence

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
POST /api/v1/routings/:routingId/steps/resequence HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/routings/steps/dependencies

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
POST /api/v1/routings/steps/dependencies HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### DELETE /api/v1/routings/steps/dependencies/:dependencyId

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
DELETE /api/v1/routings/steps/dependencies/:dependencyId HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/routings/part-site-availability

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
POST /api/v1/routings/part-site-availability HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/routings/part-site-availability/:partId/:siteId

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
GET /api/v1/routings/part-site-availability/:partId/:siteId HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/routings/parts/:partId/available-sites

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
GET /api/v1/routings/parts/:partId/available-sites HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### PUT /api/v1/routings/part-site-availability/:id

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
PUT /api/v1/routings/part-site-availability/:id HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### DELETE /api/v1/routings/part-site-availability/:id

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
DELETE /api/v1/routings/part-site-availability/:id HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/routings/:id/copy

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
POST /api/v1/routings/:id/copy HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/routings/:id/approve

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
POST /api/v1/routings/:id/approve HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/routings/:id/activate

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
POST /api/v1/routings/:id/activate HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/routings/:id/obsolete

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
POST /api/v1/routings/:id/obsolete HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/routings/:partId/:siteId/versions

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
GET /api/v1/routings/:partId/:siteId/versions HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/routings/:id/timing

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
GET /api/v1/routings/:id/timing HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/routings/:id/validate

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
GET /api/v1/routings/:id/validate HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/routings/templates

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
GET /api/v1/routings/templates HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/routings/templates/categories

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
GET /api/v1/routings/templates/categories HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/routings/templates

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
POST /api/v1/routings/templates HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/routings/templates/:id

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
GET /api/v1/routings/templates/:id HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### PUT /api/v1/routings/templates/:id

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
PUT /api/v1/routings/templates/:id HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### DELETE /api/v1/routings/templates/:id

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
DELETE /api/v1/routings/templates/:id HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/routings/templates/:id/favorite

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
POST /api/v1/routings/templates/:id/favorite HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/routings/templates/:id/use

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
POST /api/v1/routings/templates/:id/use HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/routings/:id/visual-data

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
GET /api/v1/routings/:id/visual-data HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/routings/visual

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
POST /api/v1/routings/visual HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### PUT /api/v1/routings/:id/visual

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
PUT /api/v1/routings/:id/visual HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/routings/by-type/:partId/:siteId/:routingType

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
GET /api/v1/routings/by-type/:partId/:siteId/:routingType HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/routings/primary/:partId/:siteId

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
GET /api/v1/routings/primary/:partId/:siteId HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/routings/:id/alternates

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
GET /api/v1/routings/:id/alternates HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/routings/steps/:stepId/parameters

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
POST /api/v1/routings/steps/:stepId/parameters HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/routings/steps/:stepId/parameters

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
GET /api/v1/routings/steps/:stepId/parameters HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/routings/steps/:stepId/parameters/effective

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
GET /api/v1/routings/steps/:stepId/parameters/effective HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### DELETE /api/v1/routings/steps/:stepId/parameters/:parameterName

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
DELETE /api/v1/routings/steps/:stepId/parameters/:parameterName HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/routings/steps/:stepId/work-instruction

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
POST /api/v1/routings/steps/:stepId/work-instruction HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### DELETE /api/v1/routings/steps/:stepId/work-instruction

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
DELETE /api/v1/routings/steps/:stepId/work-instruction HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/routings/steps/:stepId/work-instruction/effective

Create a new routing

**Middleware:** asyncHandler

**Example Request:**

```http
GET /api/v1/routings/steps/:stepId/work-instruction/effective HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```


#### processSegments

Process Segment Routes

##### POST /api/v1/process-segments

**Example Request:**

```http
POST /api/v1/process-segments HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/process-segments

**Example Request:**

```http
GET /api/v1/process-segments HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/process-segments/code/:segmentCode

**Example Request:**

```http
GET /api/v1/process-segments/code/:segmentCode HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/process-segments/by-code/:operationCode

**Example Request:**

```http
GET /api/v1/process-segments/by-code/:operationCode HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/process-segments/by-classification/:classification

**Example Request:**

```http
GET /api/v1/process-segments/by-classification/:classification HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/process-segments/search

**Example Request:**

```http
GET /api/v1/process-segments/search HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/process-segments/hierarchy/roots

**Example Request:**

```http
GET /api/v1/process-segments/hierarchy/roots HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/process-segments/statistics/overview

**Example Request:**

```http
GET /api/v1/process-segments/statistics/overview HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/process-segments/:id

**Example Request:**

```http
GET /api/v1/process-segments/:id HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### PUT /api/v1/process-segments/:id

**Example Request:**

```http
PUT /api/v1/process-segments/:id HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### DELETE /api/v1/process-segments/:id

**Example Request:**

```http
DELETE /api/v1/process-segments/:id HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/process-segments/:id/hierarchy-tree

**Example Request:**

```http
GET /api/v1/process-segments/:id/hierarchy-tree HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/process-segments/:id/ancestors

**Example Request:**

```http
GET /api/v1/process-segments/:id/ancestors HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/process-segments/:id/children

**Example Request:**

```http
GET /api/v1/process-segments/:id/children HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/process-segments/:id/parameters

**Example Request:**

```http
POST /api/v1/process-segments/:id/parameters HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/process-segments/:id/parameters

**Example Request:**

```http
GET /api/v1/process-segments/:id/parameters HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### PUT /api/v1/process-segments/parameters/:parameterId

**Example Request:**

```http
PUT /api/v1/process-segments/parameters/:parameterId HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### DELETE /api/v1/process-segments/parameters/:parameterId

**Example Request:**

```http
DELETE /api/v1/process-segments/parameters/:parameterId HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/process-segments/dependencies

**Example Request:**

```http
POST /api/v1/process-segments/dependencies HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/process-segments/:id/dependencies

**Example Request:**

```http
GET /api/v1/process-segments/:id/dependencies HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### DELETE /api/v1/process-segments/dependencies/:dependencyId

**Example Request:**

```http
DELETE /api/v1/process-segments/dependencies/:dependencyId HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/process-segments/:id/personnel-specs

**Example Request:**

```http
POST /api/v1/process-segments/:id/personnel-specs HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/process-segments/:id/equipment-specs

**Example Request:**

```http
POST /api/v1/process-segments/:id/equipment-specs HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/process-segments/:id/material-specs

**Example Request:**

```http
POST /api/v1/process-segments/:id/material-specs HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/process-segments/:id/asset-specs

**Example Request:**

```http
POST /api/v1/process-segments/:id/asset-specs HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/process-segments/:id/resource-specs

**Example Request:**

```http
GET /api/v1/process-segments/:id/resource-specs HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/process-segments/:id/total-time

**Example Request:**

```http
GET /api/v1/process-segments/:id/total-time HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### PUT /api/v1/process-segments/:id/terminology

**Example Request:**

```http
PUT /api/v1/process-segments/:id/terminology HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/process-segments/:id/work-instruction

**Example Request:**

```http
POST /api/v1/process-segments/:id/work-instruction HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/process-segments/:id/work-instruction

**Example Request:**

```http
GET /api/v1/process-segments/:id/work-instruction HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### DELETE /api/v1/process-segments/:id/work-instruction

**Example Request:**

```http
DELETE /api/v1/process-segments/:id/work-instruction HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```


#### productionSchedules

Production Schedule Routes (ISA-95 Production Scheduling - Task 1.6)

##### POST /api/v1/production-schedules

**Middleware:** requirePermission

**Example Request:**

```http
POST /api/v1/production-schedules HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/production-schedules/number/:scheduleNumber

**Middleware:** requireProductionAccess

**Example Request:**

```http
GET /api/v1/production-schedules/number/:scheduleNumber HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/production-schedules/:id

**Middleware:** requireProductionAccess

**Example Request:**

```http
GET /api/v1/production-schedules/:id HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/production-schedules

**Middleware:** requireProductionAccess

**Example Request:**

```http
GET /api/v1/production-schedules HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### PUT /api/v1/production-schedules/:id

**Middleware:** requirePermission

**Example Request:**

```http
PUT /api/v1/production-schedules/:id HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### DELETE /api/v1/production-schedules/:id

**Middleware:** requirePermission

**Example Request:**

```http
DELETE /api/v1/production-schedules/:id HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/production-schedules/:id/entries

**Middleware:** requirePermission

**Example Request:**

```http
POST /api/v1/production-schedules/:id/entries HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/production-schedules/:id/entries

**Middleware:** requireProductionAccess

**Example Request:**

```http
GET /api/v1/production-schedules/:id/entries HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### PUT /api/v1/production-schedules/entries/:entryId

**Middleware:** requirePermission

**Example Request:**

```http
PUT /api/v1/production-schedules/entries/:entryId HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/production-schedules/entries/:entryId/cancel

**Middleware:** requirePermission

**Example Request:**

```http
POST /api/v1/production-schedules/entries/:entryId/cancel HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/production-schedules/entries/:entryId/constraints

**Middleware:** requirePermission

**Example Request:**

```http
POST /api/v1/production-schedules/entries/:entryId/constraints HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/production-schedules/entries/:entryId/constraints

**Middleware:** requireProductionAccess

**Example Request:**

```http
GET /api/v1/production-schedules/entries/:entryId/constraints HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### PUT /api/v1/production-schedules/constraints/:constraintId

**Middleware:** requirePermission

**Example Request:**

```http
PUT /api/v1/production-schedules/constraints/:constraintId HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/production-schedules/constraints/:constraintId/resolve

**Middleware:** requirePermission

**Example Request:**

```http
POST /api/v1/production-schedules/constraints/:constraintId/resolve HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/production-schedules/constraints/:constraintId/check

**Middleware:** requireProductionAccess

**Example Request:**

```http
POST /api/v1/production-schedules/constraints/:constraintId/check HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/production-schedules/:id/state/transition

**Middleware:** requirePermission

**Example Request:**

```http
POST /api/v1/production-schedules/:id/state/transition HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/production-schedules/:id/state/history

**Middleware:** requireProductionAccess

**Example Request:**

```http
GET /api/v1/production-schedules/:id/state/history HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/production-schedules/:id/sequencing/priority

**Middleware:** requirePermission

**Example Request:**

```http
POST /api/v1/production-schedules/:id/sequencing/priority HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/production-schedules/:id/sequencing/edd

**Middleware:** requirePermission

**Example Request:**

```http
POST /api/v1/production-schedules/:id/sequencing/edd HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/production-schedules/:id/feasibility/check

**Middleware:** requireProductionAccess

**Example Request:**

```http
POST /api/v1/production-schedules/:id/feasibility/check HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/production-schedules/entries/:entryId/dispatch

**Middleware:** requirePermission

**Example Request:**

```http
POST /api/v1/production-schedules/entries/:entryId/dispatch HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/production-schedules/:id/dispatch/all

**Middleware:** requirePermission

**Example Request:**

```http
POST /api/v1/production-schedules/:id/dispatch/all HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/production-schedules/dispatch/ready

**Middleware:** requireProductionAccess

**Example Request:**

```http
GET /api/v1/production-schedules/dispatch/ready HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/production-schedules/statistics/overview

**Middleware:** requireProductionAccess

**Example Request:**

```http
GET /api/v1/production-schedules/statistics/overview HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/production-schedules/state/:state

**Middleware:** requireProductionAccess

**Example Request:**

```http
GET /api/v1/production-schedules/state/:state HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```


#### workOrders

##### GET /api/v1/workorders

Get work orders list with filtering and pagination

**Middleware:** requireSiteAccess, requireProductionAccess, asyncHandler

**Example Request:**

```http
GET /api/v1/workorders HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/workorders/:id

Get work orders list with filtering and pagination

**Middleware:** requireSiteAccess, requireProductionAccess, asyncHandler

**Example Request:**

```http
GET /api/v1/workorders/:id HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/workorders

Get work orders list with filtering and pagination

**Middleware:** requirePermission

**Example Request:**

```http
POST /api/v1/workorders HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### PUT /api/v1/workorders/:id

Get work orders list with filtering and pagination

**Middleware:** requirePermission

**Example Request:**

```http
PUT /api/v1/workorders/:id HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### DELETE /api/v1/workorders/:id

Get work orders list with filtering and pagination

**Middleware:** requirePermission

**Example Request:**

```http
DELETE /api/v1/workorders/:id HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/workorders/:id/release

Get work orders list with filtering and pagination

**Middleware:** requirePermission

**Example Request:**

```http
POST /api/v1/workorders/:id/release HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/workorders/:id/operations

Get work orders list with filtering and pagination

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
GET /api/v1/workorders/:id/operations HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/workorders/operations/my-assignments

Get work orders list with filtering and pagination

**Middleware:** requirePermission

**Example Request:**

```http
GET /api/v1/workorders/operations/my-assignments HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/workorders/:id/operations/:operationNumber

Get work orders list with filtering and pagination

**Middleware:** requirePermission

**Example Request:**

```http
GET /api/v1/workorders/:id/operations/:operationNumber HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/workorders/:id/operations/:operationNumber/start

Get work orders list with filtering and pagination

**Middleware:** requirePermission

**Example Request:**

```http
POST /api/v1/workorders/:id/operations/:operationNumber/start HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/workorders/:id/operations/:operationNumber/record

Get work orders list with filtering and pagination

**Middleware:** requirePermission

**Example Request:**

```http
POST /api/v1/workorders/:id/operations/:operationNumber/record HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/workorders/:id/operations/:operationNumber/complete

Get work orders list with filtering and pagination

**Middleware:** requirePermission

**Example Request:**

```http
POST /api/v1/workorders/:id/operations/:operationNumber/complete HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/workorders/:id/operations/:operationNumber/issues

Get work orders list with filtering and pagination

**Middleware:** requirePermission

**Example Request:**

```http
POST /api/v1/workorders/:id/operations/:operationNumber/issues HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/workorders/dashboard/metrics

Get work orders list with filtering and pagination

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
GET /api/v1/workorders/dashboard/metrics HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/workorders/:id/assign

Get work orders list with filtering and pagination

**Middleware:** requirePermission

**Example Request:**

```http
POST /api/v1/workorders/:id/assign HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/workorders/:id/status

Get work orders list with filtering and pagination

**Middleware:** requirePermission

**Example Request:**

```http
POST /api/v1/workorders/:id/status HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/workorders/team-queue

Get work orders list with filtering and pagination

**Middleware:** requirePermission

**Example Request:**

```http
GET /api/v1/workorders/team-queue HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```


#### workOrderExecution

Work Order Execution Routes (ISA-95 Production Dispatching & Execution - Task 1.7)

##### POST /api/v1/workorders/execution/dispatch

**Example Request:**

```http
POST /api/v1/workorders/execution/dispatch HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/workorders/execution/dispatch/ready

**Example Request:**

```http
GET /api/v1/workorders/execution/dispatch/ready HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/workorders/execution/dispatch/bulk

**Example Request:**

```http
POST /api/v1/workorders/execution/dispatch/bulk HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/workorders/execution/:id/status

**Example Request:**

```http
POST /api/v1/workorders/execution/:id/status HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/workorders/execution/:id/status/history

**Example Request:**

```http
GET /api/v1/workorders/execution/:id/status/history HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/workorders/execution/status/:status

**Example Request:**

```http
GET /api/v1/workorders/execution/status/:status HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/workorders/execution/:id/performance

**Example Request:**

```http
POST /api/v1/workorders/execution/:id/performance HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/workorders/execution/:id/performance

**Example Request:**

```http
GET /api/v1/workorders/execution/:id/performance HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/workorders/execution/:id/performance/:type

**Example Request:**

```http
GET /api/v1/workorders/execution/:id/performance/:type HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/workorders/execution/:id/variances

**Example Request:**

```http
GET /api/v1/workorders/execution/:id/variances HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/workorders/execution/:id/variances/summary

**Example Request:**

```http
GET /api/v1/workorders/execution/:id/variances/summary HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/workorders/execution/:id/variances/:type

**Example Request:**

```http
GET /api/v1/workorders/execution/:id/variances/:type HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/workorders/execution/dashboard

**Example Request:**

```http
GET /api/v1/workorders/execution/dashboard HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```


#### routingTemplates

Routing Template API Routes


### Quality Management

91 endpoints available

#### fai

##### POST /api/v1/fai

Create a new FAI report

**Example Request:**

```http
POST /api/v1/fai HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/fai

Create a new FAI report

**Example Request:**

```http
GET /api/v1/fai HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/fai/:id

Create a new FAI report

**Example Request:**

```http
GET /api/v1/fai/:id HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/fai/number/:faiNumber

Create a new FAI report

**Example Request:**

```http
GET /api/v1/fai/number/:faiNumber HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### PUT /api/v1/fai/:id

Create a new FAI report

**Example Request:**

```http
PUT /api/v1/fai/:id HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### DELETE /api/v1/fai/:id

Create a new FAI report

**Example Request:**

```http
DELETE /api/v1/fai/:id HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/fai/:id/characteristics

Create a new FAI report

**Example Request:**

```http
POST /api/v1/fai/:id/characteristics HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/fai/:id/characteristics

Create a new FAI report

**Example Request:**

```http
GET /api/v1/fai/:id/characteristics HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### PUT /api/v1/fai/:id/characteristics/:charId

Create a new FAI report

**Example Request:**

```http
PUT /api/v1/fai/:id/characteristics/:charId HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### DELETE /api/v1/fai/:id/characteristics/:charId

Create a new FAI report

**Example Request:**

```http
DELETE /api/v1/fai/:id/characteristics/:charId HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/fai/:id/approve

Create a new FAI report

**Example Request:**

```http
POST /api/v1/fai/:id/approve HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/fai/:id/form1

Create a new FAI report

**Example Request:**

```http
GET /api/v1/fai/:id/form1 HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/fai/:id/form2

Create a new FAI report

**Example Request:**

```http
GET /api/v1/fai/:id/form2 HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/fai/:id/import-cmm/preview

Create a new FAI report

**Example Request:**

```http
POST /api/v1/fai/:id/import-cmm/preview HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/fai/:id/import-cmm

Create a new FAI report

**Example Request:**

```http
POST /api/v1/fai/:id/import-cmm HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/fai/:id/import-cmm/validate

Create a new FAI report

**Example Request:**

```http
POST /api/v1/fai/:id/import-cmm/validate HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/fai/:id/generate-pdf

Create a new FAI report

**Example Request:**

```http
POST /api/v1/fai/:id/generate-pdf HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/fai/:id/download-pdf

Create a new FAI report

**Example Request:**

```http
GET /api/v1/fai/:id/download-pdf HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/fai/:id/qif/plan

Create a new FAI report

**Example Request:**

```http
POST /api/v1/fai/:id/qif/plan HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/fai/:id/qif/results

Create a new FAI report

**Example Request:**

```http
POST /api/v1/fai/:id/qif/results HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/fai/:id/qif/export

Create a new FAI report

**Example Request:**

```http
GET /api/v1/fai/:id/qif/export HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/fai/:id/qif/import

Create a new FAI report

**Example Request:**

```http
POST /api/v1/fai/:id/qif/import HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```


#### inspectionPlans

Inspection Plan API Routes

##### POST /api/v1/inspection-plans

Create a new inspection plan

**Example Request:**

```http
POST /api/v1/inspection-plans HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/inspection-plans

Create a new inspection plan

**Example Request:**

```http
GET /api/v1/inspection-plans HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/inspection-plans/:id

Create a new inspection plan

**Example Request:**

```http
GET /api/v1/inspection-plans/:id HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### PUT /api/v1/inspection-plans/:id

Create a new inspection plan

**Example Request:**

```http
PUT /api/v1/inspection-plans/:id HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### DELETE /api/v1/inspection-plans/:id

Create a new inspection plan

**Example Request:**

```http
DELETE /api/v1/inspection-plans/:id HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/inspection-plans/:id/characteristics

Create a new inspection plan

**Example Request:**

```http
POST /api/v1/inspection-plans/:id/characteristics HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### PUT /api/v1/inspection-plans/characteristics/:characteristicId

Create a new inspection plan

**Example Request:**

```http
PUT /api/v1/inspection-plans/characteristics/:characteristicId HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### DELETE /api/v1/inspection-plans/characteristics/:characteristicId

Create a new inspection plan

**Example Request:**

```http
DELETE /api/v1/inspection-plans/characteristics/:characteristicId HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/inspection-plans/:id/steps

Create a new inspection plan

**Example Request:**

```http
POST /api/v1/inspection-plans/:id/steps HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### DELETE /api/v1/inspection-plans/steps/:stepId

Create a new inspection plan

**Example Request:**

```http
DELETE /api/v1/inspection-plans/steps/:stepId HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/inspection-plans/:id/executions

Create a new inspection plan

**Example Request:**

```http
POST /api/v1/inspection-plans/:id/executions HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/inspection-plans/executions/:executionId/results

Create a new inspection plan

**Example Request:**

```http
POST /api/v1/inspection-plans/executions/:executionId/results HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### PUT /api/v1/inspection-plans/executions/:executionId/complete

Create a new inspection plan

**Example Request:**

```http
PUT /api/v1/inspection-plans/executions/:executionId/complete HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/inspection-plans/:id/executions

Create a new inspection plan

**Example Request:**

```http
GET /api/v1/inspection-plans/:id/executions HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/inspection-plans/:id/statistics

Create a new inspection plan

**Example Request:**

```http
GET /api/v1/inspection-plans/:id/statistics HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/inspection-plans/statistics/summary

Create a new inspection plan

**Example Request:**

```http
GET /api/v1/inspection-plans/statistics/summary HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/inspection-plans/:id/approve

Create a new inspection plan

**Example Request:**

```http
POST /api/v1/inspection-plans/:id/approve HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/inspection-plans/:id/reject

Create a new inspection plan

**Example Request:**

```http
POST /api/v1/inspection-plans/:id/reject HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/inspection-plans/part/:partId

Create a new inspection plan

**Example Request:**

```http
GET /api/v1/inspection-plans/part/:partId HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/inspection-plans/operation/:operationId

Create a new inspection plan

**Example Request:**

```http
GET /api/v1/inspection-plans/operation/:operationId HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/inspection-plans/:id/media

Create a new inspection plan

**Example Request:**

```http
POST /api/v1/inspection-plans/:id/media HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```


#### spc

##### POST /api/v1/spc/configurations

Create SPC configuration for a parameter

**Middleware:** authMiddleware

**Example Request:**

```http
POST /api/v1/spc/configurations HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/spc/configurations/:parameterId

Create SPC configuration for a parameter

**Middleware:** authMiddleware

**Example Request:**

```http
GET /api/v1/spc/configurations/:parameterId HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/spc/configurations

Create SPC configuration for a parameter

**Middleware:** authMiddleware

**Example Request:**

```http
GET /api/v1/spc/configurations HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### PUT /api/v1/spc/configurations/:parameterId

Create SPC configuration for a parameter

**Middleware:** authMiddleware

**Example Request:**

```http
PUT /api/v1/spc/configurations/:parameterId HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### DELETE /api/v1/spc/configurations/:parameterId

Create SPC configuration for a parameter

**Middleware:** authMiddleware

**Example Request:**

```http
DELETE /api/v1/spc/configurations/:parameterId HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/spc/control-limits/xbar-r

Create SPC configuration for a parameter

**Middleware:** authMiddleware

**Example Request:**

```http
POST /api/v1/spc/control-limits/xbar-r HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/spc/control-limits/xbar-s

Create SPC configuration for a parameter

**Middleware:** authMiddleware

**Example Request:**

```http
POST /api/v1/spc/control-limits/xbar-s HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/spc/control-limits/imr

Create SPC configuration for a parameter

**Middleware:** authMiddleware

**Example Request:**

```http
POST /api/v1/spc/control-limits/imr HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/spc/control-limits/p-chart

Create SPC configuration for a parameter

**Middleware:** authMiddleware

**Example Request:**

```http
POST /api/v1/spc/control-limits/p-chart HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/spc/control-limits/c-chart

Create SPC configuration for a parameter

**Middleware:** authMiddleware

**Example Request:**

```http
POST /api/v1/spc/control-limits/c-chart HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/spc/capability

Create SPC configuration for a parameter

**Middleware:** authMiddleware

**Example Request:**

```http
POST /api/v1/spc/capability HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/spc/evaluate-rules

Create SPC configuration for a parameter

**Middleware:** authMiddleware

**Example Request:**

```http
POST /api/v1/spc/evaluate-rules HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/spc/rule-violations/:parameterId

Create SPC configuration for a parameter

**Middleware:** authMiddleware

**Example Request:**

```http
GET /api/v1/spc/rule-violations/:parameterId HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/spc/rule-violations/:violationId/acknowledge

Create SPC configuration for a parameter

**Middleware:** authMiddleware

**Example Request:**

```http
POST /api/v1/spc/rule-violations/:violationId/acknowledge HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/spc/rules

Create SPC configuration for a parameter

**Middleware:** authMiddleware

**Example Request:**

```http
GET /api/v1/spc/rules HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/spc/analyze

Create SPC configuration for a parameter

**Middleware:** authMiddleware

**Example Request:**

```http
POST /api/v1/spc/analyze HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```


#### parameterFormulas

Parameter Formulas Routes

##### POST /api/v1/parameter-formulas

**Example Request:**

```http
POST /api/v1/parameter-formulas HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/parameter-formulas/:id

**Example Request:**

```http
GET /api/v1/parameter-formulas/:id HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### PUT /api/v1/parameter-formulas/:id

**Example Request:**

```http
PUT /api/v1/parameter-formulas/:id HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### DELETE /api/v1/parameter-formulas/:id

**Example Request:**

```http
DELETE /api/v1/parameter-formulas/:id HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/parameter-formulas

**Example Request:**

```http
GET /api/v1/parameter-formulas HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/parameter-formulas/:id/evaluate

**Example Request:**

```http
POST /api/v1/parameter-formulas/:id/evaluate HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/parameter-formulas/evaluate-expression

**Example Request:**

```http
POST /api/v1/parameter-formulas/evaluate-expression HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/parameter-formulas/validate

**Example Request:**

```http
POST /api/v1/parameter-formulas/validate HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/parameter-formulas/test

**Example Request:**

```http
POST /api/v1/parameter-formulas/test HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/parameter-formulas/extract-dependencies

**Example Request:**

```http
POST /api/v1/parameter-formulas/extract-dependencies HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### PATCH /api/v1/parameter-formulas/:id/active

**Example Request:**

```http
PATCH /api/v1/parameter-formulas/:id/active HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/parameter-formulas/parameter/:parameterId

**Example Request:**

```http
GET /api/v1/parameter-formulas/parameter/:parameterId HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/parameter-formulas/triggered/:parameterId

**Example Request:**

```http
GET /api/v1/parameter-formulas/triggered/:parameterId HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/parameter-formulas/evaluate-triggered/:parameterId

**Example Request:**

```http
POST /api/v1/parameter-formulas/evaluate-triggered/:parameterId HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```


#### parameterGroups

Parameter Groups Routes

##### POST /api/v1/parameter-groups

**Example Request:**

```http
POST /api/v1/parameter-groups HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/parameter-groups/:id

**Example Request:**

```http
GET /api/v1/parameter-groups/:id HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### PUT /api/v1/parameter-groups/:id

**Example Request:**

```http
PUT /api/v1/parameter-groups/:id HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### DELETE /api/v1/parameter-groups/:id

**Example Request:**

```http
DELETE /api/v1/parameter-groups/:id HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/parameter-groups

**Example Request:**

```http
GET /api/v1/parameter-groups HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/parameter-groups/:id/move

**Example Request:**

```http
POST /api/v1/parameter-groups/:id/move HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/parameter-groups/:id/parameters

**Example Request:**

```http
GET /api/v1/parameter-groups/:id/parameters HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/parameter-groups/assign

**Example Request:**

```http
POST /api/v1/parameter-groups/assign HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/parameter-groups/search/query

**Example Request:**

```http
GET /api/v1/parameter-groups/search/query HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```


#### parameterLimits

Parameter Limits Routes

##### POST /api/v1/parameter-limits/:parameterId/limits

**Example Request:**

```http
POST /api/v1/parameter-limits/:parameterId/limits HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/parameter-limits/:parameterId/limits

**Example Request:**

```http
GET /api/v1/parameter-limits/:parameterId/limits HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### DELETE /api/v1/parameter-limits/:parameterId/limits

**Example Request:**

```http
DELETE /api/v1/parameter-limits/:parameterId/limits HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/parameter-limits/validate

**Example Request:**

```http
POST /api/v1/parameter-limits/validate HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/parameter-limits/:parameterId/limits/evaluate

**Example Request:**

```http
POST /api/v1/parameter-limits/:parameterId/limits/evaluate HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/parameter-limits/limits

**Example Request:**

```http
GET /api/v1/parameter-limits/limits HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```


#### quality

##### GET /api/v1/quality/inspections

Get inspections list

**Middleware:** asyncHandler

**Example Request:**

```http
GET /api/v1/quality/inspections HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/quality/inspections

Get inspections list

**Middleware:** asyncHandler

**Example Request:**

```http
POST /api/v1/quality/inspections HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/quality/ncrs

Get inspections list

**Middleware:** asyncHandler

**Example Request:**

```http
GET /api/v1/quality/ncrs HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```


### Material Management

71 endpoints available

#### materials

##### GET /api/v1/materials/classes

Get all material classes

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
GET /api/v1/materials/classes HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/materials/classes/:id

Get all material classes

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
GET /api/v1/materials/classes/:id HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/materials/classes/:id/hierarchy

Get all material classes

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
GET /api/v1/materials/classes/:id/hierarchy HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/materials/classes/:id/children

Get all material classes

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
GET /api/v1/materials/classes/:id/children HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/materials/definitions

Get all material classes

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
GET /api/v1/materials/definitions HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/materials/definitions/:id

Get all material classes

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
GET /api/v1/materials/definitions/:id HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/materials/definitions/number/:materialNumber

Get all material classes

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
GET /api/v1/materials/definitions/number/:materialNumber HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### PUT /api/v1/materials/definitions/:id

Get all material classes

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
PUT /api/v1/materials/definitions/:id HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/materials/definitions/:materialId/properties

Get all material classes

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
GET /api/v1/materials/definitions/:materialId/properties HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/materials/properties

Get all material classes

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
POST /api/v1/materials/properties HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/materials/lots

Get all material classes

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
GET /api/v1/materials/lots HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/materials/lots/:id

Get all material classes

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
GET /api/v1/materials/lots/:id HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/materials/lots/number/:lotNumber

Get all material classes

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
GET /api/v1/materials/lots/number/:lotNumber HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### PUT /api/v1/materials/lots/:id

Get all material classes

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
PUT /api/v1/materials/lots/:id HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/materials/lots/expiring/soon

Get all material classes

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
GET /api/v1/materials/lots/expiring/soon HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/materials/lots/expired/all

Get all material classes

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
GET /api/v1/materials/lots/expired/all HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/materials/lots/statistics/summary

Get all material classes

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
GET /api/v1/materials/lots/statistics/summary HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/materials/lots/:lotId/sublots

Get all material classes

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
GET /api/v1/materials/lots/:lotId/sublots HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/materials/lots/:lotId/split

Get all material classes

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
POST /api/v1/materials/lots/:lotId/split HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/materials/lots/merge

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
POST /api/v1/materials/lots/merge HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/materials/lots/:lotId/genealogy

Get all material classes

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
GET /api/v1/materials/lots/:lotId/genealogy HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/materials/lots/:lotId/genealogy/tree

Get all material classes

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
GET /api/v1/materials/lots/:lotId/genealogy/tree HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/materials/genealogy

Get all material classes

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
POST /api/v1/materials/genealogy HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/materials/lots/:lotId/history

Get all material classes

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
GET /api/v1/materials/lots/:lotId/history HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### PUT /api/v1/materials/lots/:lotId/state

Get all material classes

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
PUT /api/v1/materials/lots/:lotId/state HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/materials/lots/:lotId/quarantine

Get all material classes

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
POST /api/v1/materials/lots/:lotId/quarantine HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/materials/lots/:lotId/release

Get all material classes

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
POST /api/v1/materials/lots/:lotId/release HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/materials/lots/:lotId/reject

Get all material classes

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
POST /api/v1/materials/lots/:lotId/reject HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/materials/work-orders/:workOrderId/usage

Get all material classes

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
GET /api/v1/materials/work-orders/:workOrderId/usage HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/materials/inventory

Get all material classes

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
GET /api/v1/materials/inventory HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/materials/consumption

Get all material classes

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
POST /api/v1/materials/consumption HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```


#### products

Product Routes (ISA-95 Product Definition Model - Task 1.5)

##### POST /api/v1/products

**Example Request:**

```http
POST /api/v1/products HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/products/:id

**Example Request:**

```http
GET /api/v1/products/:id HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/products/part-number/:partNumber

**Example Request:**

```http
GET /api/v1/products/part-number/:partNumber HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/products

**Example Request:**

```http
GET /api/v1/products HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### PUT /api/v1/products/:id

**Example Request:**

```http
PUT /api/v1/products/:id HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### DELETE /api/v1/products/:id

**Example Request:**

```http
DELETE /api/v1/products/:id HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/products/:id/specifications

**Example Request:**

```http
POST /api/v1/products/:id/specifications HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/products/:id/specifications

**Example Request:**

```http
GET /api/v1/products/:id/specifications HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### PUT /api/v1/products/specifications/:specificationId

**Example Request:**

```http
PUT /api/v1/products/specifications/:specificationId HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### DELETE /api/v1/products/specifications/:specificationId

**Example Request:**

```http
DELETE /api/v1/products/specifications/:specificationId HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/products/configurations/:configurationId/options

**Example Request:**

```http
POST /api/v1/products/configurations/:configurationId/options HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### PUT /api/v1/products/configurations/:configurationId

**Example Request:**

```http
PUT /api/v1/products/configurations/:configurationId HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### DELETE /api/v1/products/configurations/:configurationId

**Example Request:**

```http
DELETE /api/v1/products/configurations/:configurationId HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/products/:id/configurations

**Example Request:**

```http
POST /api/v1/products/:id/configurations HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/products/:id/configurations

**Example Request:**

```http
GET /api/v1/products/:id/configurations HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### PUT /api/v1/products/configurations/:configurationId

**Example Request:**

```http
PUT /api/v1/products/configurations/:configurationId HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### PUT /api/v1/products/options/:optionId

**Example Request:**

```http
PUT /api/v1/products/options/:optionId HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### DELETE /api/v1/products/options/:optionId

**Example Request:**

```http
DELETE /api/v1/products/options/:optionId HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/products/:id/lifecycle/transition

**Example Request:**

```http
POST /api/v1/products/:id/lifecycle/transition HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/products/:id/lifecycle/history

**Example Request:**

```http
GET /api/v1/products/:id/lifecycle/history HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/products/:id/bom

**Example Request:**

```http
POST /api/v1/products/:id/bom HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/products/:id/bom

**Example Request:**

```http
GET /api/v1/products/:id/bom HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/products/:id/where-used

**Example Request:**

```http
GET /api/v1/products/:id/where-used HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### PUT /api/v1/products/bom/:bomItemId

**Example Request:**

```http
PUT /api/v1/products/bom/:bomItemId HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### DELETE /api/v1/products/bom/:bomItemId

**Example Request:**

```http
DELETE /api/v1/products/bom/:bomItemId HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/products/statistics/overview

**Example Request:**

```http
GET /api/v1/products/statistics/overview HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/products/configurable/list

**Example Request:**

```http
GET /api/v1/products/configurable/list HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/products/lifecycle/:state

**Example Request:**

```http
GET /api/v1/products/lifecycle/:state HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```


#### traceability

##### GET /api/v1/traceability/forward/:lotNumber

Forward traceability - Find all products made from a specific lot

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
GET /api/v1/traceability/forward/:lotNumber HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/traceability/backward/:serialNumber

Forward traceability - Find all products made from a specific lot

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
GET /api/v1/traceability/backward/:serialNumber HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/traceability/genealogy-graph/:serialNumber

Forward traceability - Find all products made from a specific lot

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
GET /api/v1/traceability/genealogy-graph/:serialNumber HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### POST /api/v1/traceability/genealogy

Forward traceability - Find all products made from a specific lot

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
POST /api/v1/traceability/genealogy HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/traceability/circular-check/:serialNumber

Forward traceability - Find all products made from a specific lot

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
GET /api/v1/traceability/circular-check/:serialNumber HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/traceability/serial/:serialNumber

Forward traceability - Find all products made from a specific lot

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
GET /api/v1/traceability/serial/:serialNumber HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/traceability/genealogy/:serialNumber

Forward traceability - Find all products made from a specific lot

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
GET /api/v1/traceability/genealogy/:serialNumber HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/traceability/history/:serialNumber

Forward traceability - Find all products made from a specific lot

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
GET /api/v1/traceability/history/:serialNumber HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/traceability/certificates/:serialNumber

Forward traceability - Find all products made from a specific lot

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
GET /api/v1/traceability/certificates/:serialNumber HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/traceability/quality/:serialNumber

Forward traceability - Find all products made from a specific lot

**Middleware:** requireProductionAccess, asyncHandler

**Example Request:**

```http
GET /api/v1/traceability/quality/:serialNumber HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/traceability/forward-legacy/:materialLot

Forward traceability - Find all products made from a specific lot

**Middleware:** requireProductionAccess, asyncHandler

⚠️ **DEPRECATED**

**Example Request:**

```http
GET /api/v1/traceability/forward-legacy/:materialLot HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```

##### GET /api/v1/traceability/search

Forward traceability - Find all products made from a specific lot

**Middleware:** requireSiteAccess, requireProductionAccess, asyncHandler

⚠️ **DEPRECATED**

**Example Request:**

```http
GET /api/v1/traceability/search HTTP/1.1
Host: api.machshop.com
Authorization: Bearer <token>
Content-Type: application/json
```


#### serialization


