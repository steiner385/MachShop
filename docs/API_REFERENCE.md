# Build Record System API Reference

## Overview

The Build Record System API provides RESTful endpoints for managing electronic build records, operations, signatures, photos, and build book generation. All endpoints require authentication and follow AS9100 compliance standards.

## Base URL
```
Production: https://your-domain.com/api
Development: http://localhost:3000/api
```

## Authentication

All API requests require authentication via JWT Bearer token:

```http
Authorization: Bearer <your-jwt-token>
```

### Get Authentication Token
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-123",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "OPERATOR"
  },
  "expiresIn": "24h"
}
```

## Build Records API

### Create Build Record
Creates a new electronic build record for a work order.

```http
POST /api/build-records
Content-Type: application/json
Authorization: Bearer <token>

{
  "workOrderId": "wo-123",
  "operatorId": "user-456"
}
```

**Response:**
```json
{
  "id": "br-789",
  "buildRecordNumber": "BR-2024-001",
  "workOrderId": "wo-123",
  "status": "PENDING",
  "finalDisposition": "PENDING",
  "operatorId": "user-456",
  "startedAt": "2024-01-01T08:00:00Z",
  "operations": [
    {
      "id": "bro-101",
      "operationId": "op-001",
      "status": "PENDING",
      "standardTimeMinutes": 60
    }
  ]
}
```

### List Build Records
Retrieves build records with filtering and pagination.

```http
GET /api/build-records?page=1&limit=10&status=IN_PROGRESS&search=ENG123&customer=Aerospace%20Corp
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Records per page (default: 10, max: 100)
- `status` (string): Filter by status (PENDING, IN_PROGRESS, COMPLETED, ON_HOLD, CANCELLED)
- `search` (string): Search in build record number, work order, engine serial
- `customer` (string): Filter by customer name
- `startDate` (ISO date): Filter records started after date
- `endDate` (ISO date): Filter records started before date
- `sortBy` (string): Sort field (createdAt, status, buildRecordNumber)
- `sortOrder` (string): Sort direction (asc, desc)

**Response:**
```json
{
  "data": [
    {
      "id": "br-789",
      "buildRecordNumber": "BR-2024-001",
      "status": "IN_PROGRESS",
      "workOrder": {
        "orderNumber": "WO-2024-001",
        "engineSerial": "ENG123456",
        "customer": "Aerospace Corp"
      },
      "operator": {
        "name": "John Operator"
      },
      "progress": 65,
      "_count": {
        "photos": 5,
        "deviations": 1
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

### Get Build Record Details
Retrieves complete build record information.

```http
GET /api/build-records/{buildRecordId}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "br-789",
  "buildRecordNumber": "BR-2024-001",
  "status": "COMPLETED",
  "finalDisposition": "ACCEPT",
  "startedAt": "2024-01-01T08:00:00Z",
  "completedAt": "2024-01-01T17:00:00Z",
  "workOrder": {
    "orderNumber": "WO-2024-001",
    "engineSerial": "ENG123456",
    "engineModel": "V12-TURBO",
    "customer": "Aerospace Corp"
  },
  "operator": {
    "id": "user-456",
    "name": "John Operator"
  },
  "inspector": {
    "id": "user-789",
    "name": "Jane Inspector"
  },
  "operations": [...],
  "deviations": [...],
  "photos": [...],
  "signatures": [...],
  "statusHistory": [...]
}
```

### Update Build Record Status
Updates the status of a build record with audit trail.

```http
PUT /api/build-records/{buildRecordId}/status
Content-Type: application/json
Authorization: Bearer <token>

{
  "status": "COMPLETED",
  "reason": "All operations completed successfully"
}
```

### Update Build Record
Updates build record information.

```http
PUT /api/build-records/{buildRecordId}
Content-Type: application/json
Authorization: Bearer <token>

{
  "finalDisposition": "ACCEPT",
  "inspectorId": "user-789",
  "notes": "Build completed successfully with minor deviation"
}
```

### Delete Build Record
Deletes a build record (only allowed for pending records).

```http
DELETE /api/build-records/{buildRecordId}
Authorization: Bearer <token>
```

## Operations API

### Start Operation
Marks an operation as started and assigns operator.

```http
POST /api/build-records/{buildRecordId}/operations/{operationId}/start
Content-Type: application/json
Authorization: Bearer <token>

{
  "operatorId": "user-456"
}
```

**Response:**
```json
{
  "id": "bro-101",
  "status": "IN_PROGRESS",
  "operatorId": "user-456",
  "startedAt": "2024-01-01T08:30:00Z",
  "operation": {
    "operationNumber": "010",
    "description": "Assembly Operation"
  }
}
```

### Complete Operation
Marks operation as completed with details.

```http
POST /api/build-records/{buildRecordId}/operations/{operationId}/complete
Content-Type: application/json
Authorization: Bearer <token>

{
  "notes": "Operation completed successfully",
  "toolsUsed": ["Torque Wrench", "Digital Caliper"],
  "partsUsed": [
    {
      "partNumber": "P-12345",
      "quantity": 2,
      "serialNumbers": ["SN001", "SN002"],
      "lotNumber": "LOT123"
    }
  ]
}
```

### Get Operation Details
Retrieves detailed operation information.

```http
GET /api/build-records/{buildRecordId}/operations/{operationId}
Authorization: Bearer <token>
```

## Electronic Signatures API

### Create Signature
Creates an electronic signature for an operation.

```http
POST /api/build-records/{buildRecordId}/operations/{operationId}/sign
Content-Type: application/json
Authorization: Bearer <token>

{
  "signatureType": "OPERATOR",
  "comments": "Operation completed successfully",
  "signatureData": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB...",
  "metadata": {
    "certificationConfirmed": true,
    "qualityChecked": true,
    "acceptsResponsibility": true,
    "ipAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0..."
  }
}
```

**Signature Types:**
- `OPERATOR`: Operation completion signature
- `INSPECTOR`: Quality inspection signature
- `ENGINEER`: Engineering approval signature
- `QUALITY`: Quality manager signature
- `FINAL_APPROVAL`: Final management approval

**Response:**
```json
{
  "id": "sig-123",
  "type": "OPERATOR",
  "signedAt": "2024-01-01T10:00:00Z",
  "signedBy": "user-456",
  "isValid": true,
  "comments": "Operation completed successfully",
  "signer": {
    "name": "John Operator",
    "email": "john@example.com"
  }
}
```

### Invalidate Signature
Invalidates an existing signature (requires appropriate permissions).

```http
POST /api/build-records/signatures/{signatureId}/invalidate
Content-Type: application/json
Authorization: Bearer <token>

{
  "reason": "Signature invalidated due to process change"
}
```

## Photos API

### Upload Photo
Uploads a photo with metadata and optional annotations.

```http
POST /api/build-records/{buildRecordId}/photos
Content-Type: multipart/form-data
Authorization: Bearer <token>

photo: <file>
caption: "Assembly progress photo"
category: "PROGRESS"
operationId: "bro-101"
tags: ["assembly", "progress", "station-1"]
notes: "Photo taken after torque application"
annotations: [
  {
    "type": "arrow",
    "points": [100, 100, 200, 200],
    "color": "#ff0000",
    "strokeWidth": 2
  }
]
```

**Photo Categories:**
- `PROGRESS`: Work progress documentation
- `ISSUE`: Problem or issue documentation
- `INSPECTION`: Quality inspection photos
- `COMPLETION`: Operation completion photos
- `DEVIATION`: Deviation documentation
- `REFERENCE`: Reference or comparison photos

**Response:**
```json
{
  "id": "photo-123",
  "filename": "photo_20240101_120000.jpg",
  "originalName": "progress_photo.jpg",
  "filePath": "/uploads/photos/br-789/photo_20240101_120000.jpg",
  "thumbnailPath": "/uploads/photos/br-789/thumb_photo_20240101_120000.jpg",
  "caption": "Assembly progress photo",
  "category": "PROGRESS",
  "tags": ["assembly", "progress", "station-1"],
  "takenAt": "2024-01-01T12:00:00Z",
  "takenBy": "user-456",
  "metadata": {
    "width": 1920,
    "height": 1080,
    "format": "jpeg",
    "size": 1024000
  }
}
```

### List Photos
Gets photos for a build record with filtering.

```http
GET /api/build-records/{buildRecordId}/photos?operationId=bro-101&category=PROGRESS
Authorization: Bearer <token>
```

### Add Photo Annotations
Adds annotations to an existing photo.

```http
POST /api/build-records/{buildRecordId}/photos/{photoId}/annotations
Content-Type: application/json
Authorization: Bearer <token>

{
  "annotations": [
    {
      "type": "text",
      "x": 150,
      "y": 150,
      "text": "Check torque here",
      "color": "#0000ff",
      "fontSize": 16
    }
  ]
}
```

### Delete Photo
Deletes a photo and its associated files.

```http
DELETE /api/build-records/{buildRecordId}/photos/{photoId}
Authorization: Bearer <token>
```

## Deviations API

### Create Deviation
Documents a deviation from standard process.

```http
POST /api/build-records/{buildRecordId}/deviations
Content-Type: application/json
Authorization: Bearer <token>

{
  "type": "PROCESS",
  "category": "QUALITY",
  "severity": "MEDIUM",
  "title": "Torque specification deviation",
  "description": "Bolt torque was 5% over specification due to calibration drift",
  "operationId": "bro-101",
  "rootCause": "Torque wrench calibration drift",
  "correctiveAction": "Re-torqued to specification with calibrated tool",
  "preventiveAction": "Implement daily calibration check",
  "impactAssessment": "No impact on part integrity, within acceptable tolerance",
  "targetResolutionDate": "2024-01-01T17:00:00Z"
}
```

**Deviation Types:**
- `PROCESS`: Process deviation
- `MATERIAL`: Material issue
- `DESIGN`: Design discrepancy
- `TOOLING`: Tool-related issue
- `MEASUREMENT`: Measurement discrepancy
- `DOCUMENTATION`: Documentation error
- `OTHER`: Other type

**Severity Levels:**
- `LOW`: Minor impact, no safety concern
- `MEDIUM`: Moderate impact, requires attention
- `HIGH`: Significant impact, immediate action needed
- `CRITICAL`: Critical impact, stop work

**Response:**
```json
{
  "id": "dev-123",
  "buildRecordId": "br-789",
  "type": "PROCESS",
  "severity": "MEDIUM",
  "status": "REPORTED",
  "title": "Torque specification deviation",
  "detectedAt": "2024-01-01T09:30:00Z",
  "detectedBy": "user-456",
  "assignedTo": "user-engineer",
  "approvals": []
}
```

### Update Deviation
Updates deviation information and status.

```http
PUT /api/build-records/{buildRecordId}/deviations/{deviationId}
Content-Type: application/json
Authorization: Bearer <token>

{
  "status": "UNDER_REVIEW",
  "assignedTo": "user-engineer",
  "rootCause": "Updated root cause analysis"
}
```

### Add Deviation Approval
Adds approval to a deviation.

```http
POST /api/build-records/{buildRecordId}/deviations/{deviationId}/approvals
Content-Type: application/json
Authorization: Bearer <token>

{
  "level": "ENGINEER",
  "status": "APPROVED",
  "comments": "Deviation is acceptable with corrective action"
}
```

## Build Books API

### Generate Build Book
Generates AS9100 compliant PDF build book.

```http
POST /api/build-books/generate/{buildRecordId}
Content-Type: application/json
Authorization: Bearer <token>

{
  "templateId": "template-123",
  "templateSettings": {
    "header": {
      "title": "Custom Build Book Title",
      "showDate": true
    },
    "content": {
      "includePhotos": true,
      "watermark": "CONFIDENTIAL"
    }
  }
}
```

**Response:** PDF file download

### Generate Preview
Generates preview version of build book.

```http
POST /api/build-books/preview/{buildRecordId}
Content-Type: application/json
Authorization: Bearer <token>

{
  "templateSettings": {
    "sections": {
      "coverPage": true,
      "operationsList": true
    }
  }
}
```

### Create Template
Creates a new build book template.

```http
POST /api/build-books/templates
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "AS9100 Standard Template",
  "description": "Standard template for AS9100 compliance",
  "isDefault": false,
  "customerId": "customer-123",
  "settings": {
    "header": {
      "enabled": true,
      "title": "Electronic Build Book",
      "logoPosition": "left"
    },
    "footer": {
      "enabled": true,
      "text": "Confidential Document"
    },
    "sections": {
      "coverPage": true,
      "tableOfContents": true,
      "engineIdentification": true,
      "operationsList": true,
      "photoGallery": true,
      "signaturePages": true
    },
    "compliance": {
      "as9100": true,
      "faaPart43": true
    }
  }
}
```

### List Templates
Gets available build book templates.

```http
GET /api/build-books/templates?customerId=customer-123
Authorization: Bearer <token>
```

### Update Template
Updates an existing template.

```http
PUT /api/build-books/templates/{templateId}
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Updated Template Name",
  "settings": {...}
}
```

### Delete Template
Deletes a template (cannot delete default templates).

```http
DELETE /api/build-books/templates/{templateId}
Authorization: Bearer <token>
```

## Configuration API

### Record As-Built Configuration
Records actual configuration vs. designed.

```http
POST /api/build-records/{buildRecordId}/configuration
Content-Type: application/json
Authorization: Bearer <token>

{
  "mainAssembly": {
    "partNumber": "P-MAIN-001",
    "serialNumber": "SN-MAIN-123",
    "lotNumber": "LOT-456"
  },
  "components": [
    {
      "partNumber": "P-COMP-001",
      "position": "A1",
      "quantity": 2,
      "serialNumbers": ["SN-001", "SN-002"],
      "lotNumber": "LOT-789",
      "operationUsed": "bro-101"
    }
  ]
}
```

### Compare Configuration
Compares as-designed vs as-built configuration.

```http
POST /api/build-records/{buildRecordId}/configuration/compare
Authorization: Bearer <token>
```

**Response:**
```json
{
  "summary": {
    "totalComponents": 10,
    "matchingComponents": 9,
    "deviations": 1,
    "compliancePercentage": 90
  },
  "components": [
    {
      "partNumber": "P-COMP-001",
      "matches": false,
      "differences": ["quantity"],
      "asDesigned": {
        "quantity": 2
      },
      "asBuilt": {
        "quantity": 3
      }
    }
  ]
}
```

### Generate Traceability Report
Generates complete traceability report.

```http
GET /api/build-records/{buildRecordId}/traceability
Authorization: Bearer <token>
```

## Analytics API

### Build Record Analytics
Gets analytics for build records.

```http
GET /api/analytics/build-records?startDate=2024-01-01&endDate=2024-01-31&groupBy=customer
Authorization: Bearer <token>
```

**Query Parameters:**
- `startDate` (ISO date): Start date for analysis
- `endDate` (ISO date): End date for analysis
- `groupBy` (string): Group results by (customer, operator, status, month)
- `metric` (string): Metric to analyze (count, avgDuration, deviationRate)

### Operation Performance
Gets operation performance metrics.

```http
GET /api/analytics/operations?operationNumber=010&startDate=2024-01-01
Authorization: Bearer <token>
```

### Quality Metrics
Gets quality and deviation metrics.

```http
GET /api/analytics/quality?metric=deviationRate&period=monthly
Authorization: Bearer <token>
```

## Error Handling

The API uses standard HTTP status codes and returns errors in the following format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "workOrderId",
        "message": "Work order ID is required"
      }
    ]
  },
  "timestamp": "2024-01-01T12:00:00Z",
  "path": "/api/build-records",
  "requestId": "req-123"
}
```

### Common Error Codes
- `400 BAD_REQUEST`: Invalid request data
- `401 UNAUTHORIZED`: Authentication required
- `403 FORBIDDEN`: Insufficient permissions
- `404 NOT_FOUND`: Resource not found
- `409 CONFLICT`: Resource conflict (e.g., operation already started)
- `422 VALIDATION_ERROR`: Request validation failed
- `500 INTERNAL_ERROR`: Server error

## Rate Limiting

API endpoints are rate limited to prevent abuse:
- **Standard endpoints**: 100 requests per minute per user
- **File upload endpoints**: 20 requests per minute per user
- **PDF generation**: 5 requests per minute per user

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1609459200
```

## Webhooks

The system can send webhooks for important events:

### Configure Webhook
```http
POST /api/webhooks
Content-Type: application/json
Authorization: Bearer <token>

{
  "url": "https://your-system.com/webhook",
  "events": ["build_record.completed", "deviation.created"],
  "secret": "your-webhook-secret"
}
```

### Webhook Events
- `build_record.created`
- `build_record.completed`
- `operation.started`
- `operation.completed`
- `signature.created`
- `deviation.created`
- `deviation.approved`
- `build_book.generated`

### Webhook Payload Example
```json
{
  "event": "build_record.completed",
  "timestamp": "2024-01-01T17:00:00Z",
  "data": {
    "buildRecordId": "br-789",
    "buildRecordNumber": "BR-2024-001",
    "workOrderId": "wo-123",
    "completedAt": "2024-01-01T17:00:00Z"
  }
}
```

---

*API Reference Version: 1.0*
*Last Updated: January 2024*