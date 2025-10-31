# Kitting & Material Staging System API Documentation

## Overview

The Kitting & Material Staging System provides a comprehensive RESTful API for managing kit generation, staging workflows, and analytics. This API enables integration with ERP systems, MES platforms, and custom applications.

## Table of Contents

1. [Authentication](#authentication)
2. [API Structure](#api-structure)
3. [Kit Management](#kit-management)
4. [Staging Operations](#staging-operations)
5. [Analytics & Reporting](#analytics--reporting)
6. [Vendor Kitting](#vendor-kitting)
7. [Error Handling](#error-handling)
8. [Rate Limiting](#rate-limiting)
9. [Webhooks](#webhooks)

## Authentication

### API Key Authentication
All API requests require authentication using API keys in the request headers:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     https://api.machshop.com/v1/kits
```

### Obtaining API Keys
1. Log in to the MachShop admin panel
2. Navigate to **Settings** → **API Keys**
3. Click **Generate New Key**
4. Copy and securely store the generated key

### Authentication Scopes
API keys support different permission scopes:
- `kits:read` - Read kit information
- `kits:write` - Create and modify kits
- `staging:read` - Read staging data
- `staging:write` - Manage staging operations
- `analytics:read` - Access reporting data
- `admin:write` - Administrative operations

## API Structure

### Base URL
```
Production: https://api.machshop.com/v1
Staging: https://staging-api.machshop.com/v1
```

### Response Format
All responses follow a consistent JSON structure:

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": [
      {
        "field": "workOrderId",
        "message": "Work order ID is required"
      }
    ]
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Kit Management

### Create Kit

**POST** `/kits`

Create a new kit from a work order with automatic BOM analysis.

```bash
curl -X POST https://api.machshop.com/v1/kits \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "kitName": "Engine Assembly Kit - ENG-001",
    "workOrderId": "WO-12345",
    "operationId": "OP-010",
    "priority": "HIGH",
    "assemblyStage": "ASSEMBLY",
    "dueDate": "2024-01-20T14:00:00Z",
    "notes": "Special handling required for precision components",
    "kitItems": [
      {
        "partId": "PART-001",
        "requiredQuantity": 5,
        "notes": "Handle with ESD protection"
      }
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "kit_12345",
    "kitNumber": "KIT-WO-12345-01",
    "kitName": "Engine Assembly Kit - ENG-001",
    "status": "PLANNED",
    "workOrderId": "WO-12345",
    "priority": "HIGH",
    "itemCount": 12,
    "estimatedCost": 15750.50,
    "shortageAlerts": [
      {
        "partId": "PART-003",
        "shortageQuantity": 2,
        "impact": "MEDIUM"
      }
    ],
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### Get Kit Details

**GET** `/kits/{kitId}`

Retrieve detailed information about a specific kit.

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://api.machshop.com/v1/kits/kit_12345
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "kit_12345",
    "kitNumber": "KIT-WO-12345-01",
    "kitName": "Engine Assembly Kit - ENG-001",
    "status": "STAGING",
    "workOrderId": "WO-12345",
    "priority": "HIGH",
    "progress": 75,
    "stagingLocation": {
      "locationCode": "STG-A1",
      "locationName": "Assembly Area 1 Staging",
      "assignedUser": "john.smith@company.com"
    },
    "kitItems": [
      {
        "id": "item_001",
        "partId": "PART-001",
        "partNumber": "ENG-COMP-001",
        "requiredQuantity": 5,
        "allocatedQuantity": 5,
        "pickedQuantity": 4,
        "status": "PARTIAL"
      }
    ],
    "statusHistory": [
      {
        "status": "PLANNED",
        "timestamp": "2024-01-15T10:30:00Z",
        "user": "system"
      },
      {
        "status": "STAGING",
        "timestamp": "2024-01-15T11:00:00Z",
        "user": "jane.coordinator@company.com"
      }
    ],
    "metrics": {
      "leadTime": 4.5,
      "stagingTime": 2.3,
      "efficiency": 87.5
    }
  }
}
```

### List Kits

**GET** `/kits`

Retrieve a list of kits with filtering and pagination.

**Query Parameters:**
- `status` - Filter by kit status (PLANNED, STAGING, STAGED, ISSUED, CONSUMED)
- `priority` - Filter by priority (URGENT, HIGH, NORMAL, LOW)
- `workOrderId` - Filter by work order
- `assignedUser` - Filter by assigned staging user
- `dueDate` - Filter by due date range
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50, max: 100)
- `sortBy` - Sort field (createdAt, dueDate, priority)
- `sortOrder` - Sort direction (asc, desc)

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     "https://api.machshop.com/v1/kits?status=STAGING&priority=HIGH&page=1&limit=25"
```

### Update Kit Status

**PATCH** `/kits/{kitId}/status`

Transition a kit to a new status with validation and audit trail.

```bash
curl -X PATCH https://api.machshop.com/v1/kits/kit_12345/status \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "newStatus": "STAGED",
    "reason": "All components staged and verified",
    "completedBy": "john.operator@company.com",
    "completedAt": "2024-01-15T14:30:00Z",
    "notes": "Quality inspection passed"
  }'
```

### Generate Kit from BOM

**POST** `/kits/generate-from-bom`

Automatically generate kits from a multi-level BOM with shortage analysis.

```bash
curl -X POST https://api.machshop.com/v1/kits/generate-from-bom \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "workOrderId": "WO-12345",
    "bomId": "BOM-ENG-001",
    "quantity": 2,
    "generateSubkits": true,
    "optimizeLocations": true,
    "checkShortages": true
  }'
```

## Staging Operations

### Get Staging Locations

**GET** `/staging/locations`

Retrieve all staging locations with utilization data.

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     "https://api.machshop.com/v1/staging/locations?includeUtilization=true"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "loc_001",
      "locationCode": "STG-A1",
      "locationName": "Assembly Area 1 Staging",
      "areaName": "Assembly Area A",
      "locationType": "ASSEMBLY",
      "maxCapacity": 10,
      "currentOccupancy": 7,
      "utilizationRate": 70,
      "isAvailable": true,
      "isCleanRoom": false,
      "securityLevel": "STANDARD",
      "currentKits": [
        {
          "kitId": "kit_12345",
          "kitNumber": "KIT-WO-12345-01",
          "assignedUser": "john.smith@company.com",
          "startedAt": "2024-01-15T11:00:00Z",
          "progress": 75
        }
      ],
      "metrics": {
        "averageOccupancyTime": 4.2,
        "throughputPerDay": 12.5,
        "onTimeCompletion": 94.2
      }
    }
  ]
}
```

### Assign Kit to Location

**POST** `/staging/assignments`

Assign a kit to a specific staging location with automated optimization.

```bash
curl -X POST https://api.machshop.com/v1/staging/assignments \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "kitId": "kit_12345",
    "locationId": "loc_001",
    "assignedUser": "john.smith@company.com",
    "priority": "HIGH",
    "estimatedDuration": 4.5,
    "specialRequirements": ["CLEAN_ROOM", "ESD_PROTECTION"]
  }'
```

### Get Staging Dashboard Data

**GET** `/staging/dashboard`

Retrieve real-time staging dashboard metrics.

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     "https://api.machshop.com/v1/staging/dashboard?timeRange=today"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "activeStagingProcesses": 12,
      "completedToday": 8,
      "averageCompletionTime": 4.2,
      "pendingAssignments": 3
    },
    "locationUtilization": {
      "STG-A1": { "utilizationRate": 80, "currentOccupancy": 8, "maxCapacity": 10 },
      "STG-A2": { "utilizationRate": 60, "currentOccupancy": 6, "maxCapacity": 10 }
    },
    "alerts": [
      {
        "type": "CAPACITY",
        "severity": "MEDIUM",
        "message": "Staging area STG-B1 near capacity (83%)",
        "locationId": "STG-B1",
        "timestamp": "2024-01-15T10:30:00Z"
      }
    ],
    "performanceMetrics": {
      "onTimeCompletion": 94.2,
      "averageUtilization": 72.3,
      "throughput": 85.6,
      "qualityScore": 98.1
    }
  }
}
```

### Optimize Location Assignments

**POST** `/staging/optimize`

Use AI algorithms to optimize kit assignments across staging locations.

```bash
curl -X POST https://api.machshop.com/v1/staging/optimize \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "kitIds": ["kit_12345", "kit_12346", "kit_12347"],
    "optimizationCriteria": ["MINIMIZE_TRAVEL_TIME", "BALANCE_WORKLOAD", "MAXIMIZE_THROUGHPUT"],
    "constraints": {
      "maxUtilization": 85,
      "skillRequirements": true,
      "securityClearance": true
    }
  }'
```

## Analytics & Reporting

### Get Cost Analysis

**GET** `/analytics/costs`

Retrieve comprehensive cost analysis data.

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     "https://api.machshop.com/v1/analytics/costs?timeRange=last30days&groupBy=priority"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalCost": 1850000,
      "averageCostPerKit": 11859,
      "budgetVariance": -2.3,
      "costEfficiency": 87.5
    },
    "breakdown": [
      { "category": "Materials", "amount": 1295000, "percentage": 70 },
      { "category": "Labor", "amount": 370000, "percentage": 20 },
      { "category": "Overhead", "amount": 185000, "percentage": 10 }
    ],
    "trends": [
      {
        "date": "2024-01-01",
        "totalCost": 1650000,
        "materialCost": 1155000,
        "laborCost": 330000,
        "overheadCost": 165000
      }
    ],
    "optimizations": [
      {
        "type": "material",
        "title": "Consolidate Low-Volume Parts",
        "potentialSaving": 18750,
        "complexity": "medium",
        "timeframe": "3-6 months"
      }
    ]
  }
}
```

### Generate Custom Report

**POST** `/analytics/reports`

Generate custom reports with flexible parameters and export options.

```bash
curl -X POST https://api.machshop.com/v1/analytics/reports \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "reportType": "performance_metrics",
    "timeRange": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    },
    "filters": {
      "status": ["COMPLETED"],
      "priority": ["HIGH", "URGENT"],
      "areas": ["Assembly Area A", "Assembly Area B"]
    },
    "groupBy": "priority",
    "sortBy": "totalCost",
    "sortOrder": "desc",
    "format": "pdf",
    "includeCharts": true
  }'
```

### Get Performance Metrics

**GET** `/analytics/performance`

Retrieve key performance indicators and benchmarks.

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     "https://api.machshop.com/v1/analytics/performance?timeRange=last7days"
```

## Vendor Kitting

### Create Vendor Kit Request

**POST** `/vendor-kits`

Request a kit from a qualified vendor with specifications.

```bash
curl -X POST https://api.machshop.com/v1/vendor-kits \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "vendorId": "vendor_001",
    "workOrderId": "WO-12345",
    "kitSpecification": {
      "kitItems": [
        {
          "partNumber": "VENDOR-PART-001",
          "quantity": 10,
          "qualityLevel": "AS9100"
        }
      ]
    },
    "requiredDeliveryDate": "2024-01-25T09:00:00Z",
    "qualityRequirements": ["INSPECTION_REQUIRED", "COC_REQUIRED"],
    "deliveryLocation": "RECEIVING_DOCK_A"
  }'
```

### Track Vendor Kit Status

**GET** `/vendor-kits/{vendorKitId}/status`

Get real-time status updates from vendor systems.

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://api.machshop.com/v1/vendor-kits/vkit_12345/status
```

## Error Handling

### Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_ERROR` | Request validation failed | 400 |
| `UNAUTHORIZED` | Invalid or missing authentication | 401 |
| `FORBIDDEN` | Insufficient permissions | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `CONFLICT` | Resource conflict or constraint violation | 409 |
| `RATE_LIMITED` | Too many requests | 429 |
| `INTERNAL_ERROR` | Server error | 500 |
| `SERVICE_UNAVAILABLE` | Temporary service interruption | 503 |

### Error Response Examples

**Validation Error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": [
      {
        "field": "workOrderId",
        "message": "Work order ID is required",
        "code": "REQUIRED_FIELD"
      }
    ]
  }
}
```

**Resource Not Found:**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Kit not found",
    "resourceType": "kit",
    "resourceId": "kit_12345"
  }
}
```

## Rate Limiting

### Limits
- **Standard API**: 1000 requests per hour
- **Analytics API**: 100 requests per hour
- **Bulk Operations**: 50 requests per hour

### Headers
Rate limit information is included in response headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642248000
```

### Handling Rate Limits
When rate limited, the API returns HTTP 429 with:
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded",
    "retryAfter": 3600
  }
}
```

## Webhooks

### Configuring Webhooks

**POST** `/webhooks`

Set up webhook endpoints for real-time notifications.

```bash
curl -X POST https://api.machshop.com/v1/webhooks \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-system.com/webhooks/kitting",
    "events": ["kit.status.changed", "shortage.detected", "quality.issue"],
    "secret": "your_webhook_secret",
    "active": true
  }'
```

### Webhook Events

Available webhook events:
- `kit.created` - New kit generated
- `kit.status.changed` - Kit status transition
- `kit.completed` - Kit staging completed
- `shortage.detected` - Material shortage identified
- `location.capacity.alert` - Staging area near capacity
- `quality.issue` - Quality problem detected
- `vendor.kit.received` - Vendor kit delivery

### Webhook Payload Example

```json
{
  "event": "kit.status.changed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "kitId": "kit_12345",
    "kitNumber": "KIT-WO-12345-01",
    "previousStatus": "STAGING",
    "newStatus": "STAGED",
    "changedBy": "john.operator@company.com",
    "location": "STG-A1"
  },
  "signature": "sha256=..."
}
```

---

**API Support**: For API-related questions, contact our developer support team or check the [FAQ section](../FAQ.md).