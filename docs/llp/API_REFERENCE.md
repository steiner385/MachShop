# LLP API Reference

## Overview

The Life-Limited Parts (LLP) API provides comprehensive endpoints for managing aerospace component lifecycle tracking, regulatory compliance, and back-to-birth traceability. All endpoints require production access authentication.

**Base URL**: `/api/v1/llp`

**Authentication**: Bearer token with production access permissions

**Content-Type**: `application/json`

## Configuration Management

### Configure LLP Part Settings

Configure life limit parameters and regulatory requirements for a part.

```http
POST /api/v1/llp/configuration
```

**Request Body**:
```json
{
  "partId": "string",
  "isLifeLimited": true,
  "criticalityLevel": "CRITICAL | CONTROLLED | TRACKED",
  "retirementType": "CYCLES_ONLY | TIME_ONLY | CYCLES_OR_TIME",
  "cycleLimit": 1000,
  "timeLimit": 8760,
  "inspectionInterval": 100,
  "regulatoryReference": "FAA-AD-2024-001",
  "certificationRequired": true,
  "notes": "Critical turbine blade requiring life tracking"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "partId": "part-uuid",
  "configurationId": "config-uuid",
  "message": "LLP configuration created successfully"
}
```

### Get LLP Configuration

Retrieve current LLP configuration for a part.

```http
GET /api/v1/llp/configuration/{partId}
```

**Response** (200 OK):
```json
{
  "partId": "part-uuid",
  "isLifeLimited": true,
  "criticalityLevel": "CRITICAL",
  "retirementType": "CYCLES_OR_TIME",
  "cycleLimit": 1000,
  "timeLimit": 8760,
  "inspectionInterval": 100,
  "regulatoryReference": "FAA-AD-2024-001",
  "certificationRequired": true,
  "notes": "Critical turbine blade requiring life tracking",
  "createdAt": "2023-01-15T10:30:00Z",
  "updatedAt": "2023-01-15T10:30:00Z"
}
```

## Life Event Tracking

### Record Life Event

Record a lifecycle event for an LLP component.

```http
POST /api/v1/llp/life-events
```

**Request Body**:
```json
{
  "serializedPartId": "serialized-part-uuid",
  "eventType": "MANUFACTURING_COMPLETE | INSTALLATION | OPERATION | MAINTENANCE | INSPECTION | REPAIR | REMOVAL | OVERHAUL | RETIREMENT",
  "eventDate": "2023-01-15T14:30:00Z",
  "cyclesAtEvent": 500,
  "hoursAtEvent": 4380,
  "parentAssemblyId": "ENGINE-ASSEMBLY-001",
  "parentSerialNumber": "ENG-SN-12345",
  "workOrderId": "WO-INSTALL-001",
  "operationId": "OP-001",
  "performedBy": "MECHANIC-001",
  "location": "Engine Assembly Bay",
  "notes": "Installation in engine assembly per procedure",
  "certificationUrls": ["/api/llp/documents/cert-001.pdf"],
  "inspectionResults": {
    "dimensionalCheck": "PASS",
    "visualInspection": "PASS",
    "ndt": {
      "ultrasonicTest": "PASS",
      "eddyCurrent": "PASS"
    }
  },
  "repairDetails": {
    "repairType": "BLEND_REPAIR",
    "location": "LEADING_EDGE",
    "beforeDimensions": {"thickness": "0.125in"},
    "afterDimensions": {"thickness": "0.123in"}
  },
  "metadata": {
    "environmentalConditions": {
      "temperature": "72°F",
      "humidity": "45%"
    },
    "toolsUsed": ["TORQUE_WRENCH", "ALIGNMENT_FIXTURE"]
  }
}
```

**Response** (201 Created):
```json
{
  "id": "life-event-uuid",
  "message": "Life event recorded successfully"
}
```

### Get Life Status

Get current life utilization and status for a serialized part.

```http
GET /api/v1/llp/life-status/{serializedPartId}
```

**Response** (200 OK):
```json
{
  "serializedPartId": "serialized-part-uuid",
  "currentCycles": 500,
  "currentHours": 4380,
  "cycleLimit": 1000,
  "timeLimit": 8760,
  "overallPercentageUsed": 50.0,
  "cyclePercentageUsed": 50.0,
  "timePercentageUsed": 50.0,
  "status": "ACTIVE",
  "alertLevel": "INFO",
  "retirementDue": "2024-06-15T12:00:00Z",
  "daysUntilRetirement": 180,
  "retirementRequired": false,
  "retirementReason": null,
  "lastEventDate": "2023-06-01T08:30:00Z",
  "lastEventType": "OPERATION"
}
```

### Get Back-to-Birth Traceability

Retrieve complete lifecycle history for regulatory compliance.

```http
GET /api/v1/llp/back-to-birth/{serializedPartId}
```

**Response** (200 OK):
```json
{
  "serializedPartId": "serialized-part-uuid",
  "partDetails": {
    "partNumber": "LLP-TB-001",
    "partName": "High-Pressure Turbine Blade",
    "criticalityLevel": "CRITICAL",
    "retirementType": "CYCLES_OR_TIME"
  },
  "manufacturingHistory": [
    {
      "eventId": "event-uuid",
      "eventType": "MANUFACTURING_COMPLETE",
      "eventDate": "2023-01-15T10:00:00Z",
      "performedBy": "OPERATOR-001",
      "location": "Manufacturing Plant A",
      "metadata": {
        "batchNumber": "BATCH-2023-001",
        "materialCertification": "MTR-123456"
      }
    }
  ],
  "installationHistory": [
    {
      "eventId": "event-uuid",
      "eventType": "INSTALLATION",
      "eventDate": "2023-02-01T14:30:00Z",
      "parentAssemblyId": "ENGINE-001",
      "parentSerialNumber": "ENG-12345",
      "workOrderId": "WO-001",
      "performedBy": "MECHANIC-001",
      "location": "Assembly Line 1"
    }
  ],
  "maintenanceHistory": [
    {
      "eventId": "event-uuid",
      "eventType": "MAINTENANCE",
      "eventDate": "2023-08-01T09:15:00Z",
      "cyclesAtEvent": 400,
      "hoursAtEvent": 3500,
      "workOrderId": "WO-MAINT-001",
      "performedBy": "MECHANIC-002",
      "location": "Maintenance Hangar B",
      "inspectionResults": {
        "visualInspection": "PASS",
        "dimensionalCheck": "PASS"
      }
    }
  ],
  "qualityHistory": [
    {
      "eventId": "event-uuid",
      "eventType": "QUALITY_INSPECTION",
      "eventDate": "2023-01-16T11:00:00Z",
      "performedBy": "QC-INSPECTOR-001",
      "location": "Quality Lab",
      "inspectionResults": {
        "dimensionalCheck": "PASS",
        "materialVerification": "PASS",
        "ndt": {
          "ultrasonicTest": "PASS",
          "eddyCurrent": "PASS"
        }
      }
    }
  ],
  "currentStatus": {
    "status": "ACTIVE",
    "location": "In Service",
    "currentCycles": 500,
    "currentHours": 4380,
    "percentageUsed": 50.0
  }
}
```

### Get Life History (Paginated)

Retrieve paginated lifecycle events for a serialized part.

```http
GET /api/v1/llp/life-history/{serializedPartId}?page=1&limit=50&eventType=OPERATION
```

**Query Parameters**:
- `page` (integer): Page number (default: 1)
- `limit` (integer): Items per page (default: 50, max: 100)
- `eventType` (string): Filter by event type

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "event-uuid",
      "eventType": "OPERATION",
      "eventDate": "2023-06-01T08:30:00Z",
      "cyclesAtEvent": 500,
      "hoursAtEvent": 4380,
      "performedBy": "SYSTEM",
      "location": "In Service",
      "notes": "Operational data recorded"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 25,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

## Alert Management

### Configure Alert Settings

Configure alert thresholds and notification preferences.

```http
POST /api/v1/llp/alerts/configuration
```

**Request Body**:
```json
{
  "serializedPartId": "serialized-part-uuid",
  "globalConfig": false,
  "enabled": true,
  "thresholds": {
    "info": 50,
    "warning": 75,
    "critical": 90,
    "urgent": 95
  },
  "notifications": {
    "email": true,
    "sms": false,
    "dashboard": true
  },
  "recipients": ["supervisor@company.com", "maintenance@company.com"]
}
```

**Response** (200 OK):
```json
{
  "message": "Alert configuration updated successfully"
}
```

### Get Alerts

Retrieve alerts with filtering and pagination.

```http
GET /api/v1/llp/alerts?serializedPartId={id}&severity=CRITICAL&isActive=true&page=1&limit=50
```

**Query Parameters**:
- `serializedPartId` (string): Filter by serialized part
- `severity` (string): Filter by severity level
- `isActive` (boolean): Filter by active status
- `page` (integer): Page number
- `limit` (integer): Items per page

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "alert-uuid",
      "serializedPartId": "serialized-part-uuid",
      "alertType": "LIFE_LIMIT_APPROACHING",
      "severity": "CRITICAL",
      "title": "Critical Life Limit Warning",
      "message": "Part has reached 90% of life limit - retirement planning required",
      "currentCycles": 900,
      "currentHours": 7884,
      "cycleThreshold": 900,
      "hourThreshold": 7884,
      "isActive": true,
      "isAcknowledged": false,
      "generatedAt": "2023-10-01T14:30:00Z",
      "metadata": {
        "percentageUsed": 90,
        "estimatedRetirementDate": "2024-03-01",
        "requiresImmediateAction": true
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 15,
    "totalPages": 1
  }
}
```

### Acknowledge Alert

Acknowledge an alert to indicate it has been reviewed.

```http
POST /api/v1/llp/alerts/{alertId}/acknowledge
```

**Request Body**:
```json
{
  "notes": "Alert reviewed and retirement scheduled for next maintenance cycle"
}
```

**Response** (200 OK):
```json
{
  "message": "Alert acknowledged successfully"
}
```

### Resolve Alert

Mark an alert as resolved with resolution details.

```http
POST /api/v1/llp/alerts/{alertId}/resolve
```

**Request Body**:
```json
{
  "resolution": "RETIREMENT_SCHEDULED | INSPECTION_COMPLETED | FALSE_POSITIVE | PART_RETIRED",
  "notes": "Part retired and removed from service per procedure"
}
```

**Response** (200 OK):
```json
{
  "message": "Alert resolved successfully"
}
```

## Certification Management

### Upload Certification Document

Upload a certification document with metadata.

```http
POST /api/v1/llp/certifications/upload
Content-Type: multipart/form-data
```

**Form Data**:
- `document` (file): PDF, JPEG, PNG, TIFF, DOC, DOCX, or TXT file (max 50MB)
- `metadata` (JSON string): Optional metadata object

**Response** (201 Created):
```json
{
  "success": true,
  "documentId": "doc-uuid",
  "documentUrl": "/api/llp/documents/doc-uuid.pdf",
  "fileName": "certification.pdf",
  "fileSize": 2048576,
  "mimeType": "application/pdf",
  "uploadedAt": "2023-01-15T10:30:00Z"
}
```

### Create Certification Record

Create a certification record for a serialized part.

```http
POST /api/v1/llp/certifications
```

**Request Body**:
```json
{
  "serializedPartId": "serialized-part-uuid",
  "certificationType": "MANUFACTURING | INSTALLATION | MAINTENANCE | OVERHAUL | REPAIR",
  "certificationNumber": "MANUF-2023-001234",
  "issuingOrganization": "Manufacturing Quality Assurance",
  "issuedDate": "2023-01-15T10:00:00Z",
  "expirationDate": "2025-01-15T10:00:00Z",
  "certificationStandard": "AS9100",
  "documentUrl": "/api/llp/documents/cert-001.pdf",
  "isActive": true,
  "metadata": {
    "batchNumber": "BATCH-2023-001",
    "qualityLevel": "CRITICAL",
    "inspectionResults": {
      "dimensionalCheck": "PASS",
      "materialVerification": "PASS"
    }
  }
}
```

**Response** (201 Created):
```json
{
  "id": "certification-uuid",
  "message": "Certification created successfully"
}
```

### Get Certification Status

Get comprehensive certification status for a serialized part.

```http
GET /api/v1/llp/certifications/{serializedPartId}
```

**Response** (200 OK):
```json
{
  "serializedPartId": "serialized-part-uuid",
  "isCompliant": true,
  "totalCertifications": 3,
  "activeCertifications": 3,
  "verifiedCertifications": 2,
  "expiringSoon": [
    {
      "id": "cert-uuid",
      "certificationType": "MAINTENANCE",
      "certificationNumber": "MAINT-2023-005678",
      "expirationDate": "2024-02-01T10:00:00Z",
      "daysUntilExpiration": 45
    }
  ],
  "missingCertifications": [],
  "certificationsByType": {
    "MANUFACTURING": [
      {
        "id": "cert-uuid",
        "certificationNumber": "MANUF-2023-001234",
        "issuingOrganization": "Manufacturing QA",
        "issuedDate": "2023-01-15T10:00:00Z",
        "isActive": true,
        "isVerified": true
      }
    ],
    "INSTALLATION": [],
    "MAINTENANCE": []
  }
}
```

### Verify Certification

Verify a certification document for authenticity and compliance.

```http
POST /api/v1/llp/certifications/verify
```

**Request Body**:
```json
{
  "certificationId": "cert-uuid",
  "verifiedBy": "QA-MANAGER-001",
  "verificationNotes": "Certification reviewed and verified as authentic",
  "complianceStandards": ["AS9100", "ISO 9001"]
}
```

**Response** (200 OK):
```json
{
  "message": "Certification verified successfully"
}
```

### Get Expiring Certifications

Get certifications expiring within specified days.

```http
GET /api/v1/llp/certifications/expiring?daysAhead=30
```

**Query Parameters**:
- `daysAhead` (integer): Days ahead to check for expiration (default: 30)

**Response** (200 OK):
```json
[
  {
    "id": "cert-uuid",
    "partNumber": "LLP-TB-001",
    "serialNumber": "SN-TB-001",
    "partName": "High-Pressure Turbine Blade",
    "certificationType": "MAINTENANCE",
    "certificationNumber": "MAINT-2023-005678",
    "issuingOrganization": "Authorized Maintenance Organization",
    "expirationDate": "2024-02-01T10:00:00Z",
    "daysUntilExpiration": 15,
    "criticalityLevel": "CRITICAL"
  }
]
```

## Reporting

### Generate Fleet Status Report

Generate a comprehensive fleet status report.

```http
POST /api/v1/llp/reports/fleet-status
```

**Request Body**:
```json
{
  "format": "PDF | EXCEL | CSV | JSON",
  "filters": {
    "partNumber": "LLP-TB-001",
    "criticalityLevel": "CRITICAL",
    "status": "ACTIVE",
    "dateRange": {
      "startDate": "2023-01-01T00:00:00Z",
      "endDate": "2023-12-31T23:59:59Z"
    }
  },
  "includeGraphics": true,
  "includeRawData": false
}
```

**Response** (201 Created):
```json
{
  "reportId": "FLEET_STATUS-1698765432-abc123",
  "fileName": "fleet-status-1698765432-abc123.pdf",
  "fileSize": 2048576,
  "downloadUrl": "/api/v1/llp/reports/download/FLEET_STATUS-1698765432-abc123",
  "generatedAt": "2023-10-31T14:30:00Z",
  "expiresAt": "2023-11-07T14:30:00Z",
  "metadata": {
    "reportType": "FLEET_STATUS",
    "format": "PDF",
    "recordCount": 150,
    "filters": {
      "criticalityLevel": "CRITICAL"
    },
    "generationTime": 3542,
    "requestedBy": "user-uuid",
    "complianceLevel": "FULL"
  }
}
```

### Generate Retirement Forecast Report

Generate a retirement forecast report for planning purposes.

```http
POST /api/v1/llp/reports/retirement-forecast
```

**Request Body**:
```json
{
  "daysAhead": 365,
  "format": "PDF | EXCEL | JSON"
}
```

**Response** (201 Created):
```json
{
  "reportId": "RETIREMENT_FORECAST-1698765432-def456",
  "fileName": "retirement-forecast-1698765432-def456.pdf",
  "fileSize": 1536000,
  "downloadUrl": "/api/v1/llp/reports/download/RETIREMENT_FORECAST-1698765432-def456",
  "generatedAt": "2023-10-31T14:30:00Z",
  "expiresAt": "2023-11-07T14:30:00Z",
  "metadata": {
    "reportType": "RETIREMENT_FORECAST",
    "format": "PDF",
    "recordCount": 45,
    "filters": {
      "daysAhead": 365
    },
    "generationTime": 2156,
    "requestedBy": "user-uuid",
    "complianceLevel": "FULL"
  }
}
```

### Generate Compliance Report

Generate regulatory compliance report for audit purposes.

```http
POST /api/v1/llp/reports/compliance
```

**Request Body**:
```json
{
  "regulatoryStandard": "ALL | FAA | EASA | IATA",
  "format": "PDF | EXCEL | JSON"
}
```

**Response** (201 Created):
```json
{
  "reportId": "REGULATORY_COMPLIANCE-1698765432-ghi789",
  "fileName": "compliance-1698765432-ghi789.pdf",
  "fileSize": 3072000,
  "downloadUrl": "/api/v1/llp/reports/download/REGULATORY_COMPLIANCE-1698765432-ghi789",
  "generatedAt": "2023-10-31T14:30:00Z",
  "expiresAt": "2023-11-07T14:30:00Z",
  "metadata": {
    "reportType": "REGULATORY_COMPLIANCE",
    "format": "PDF",
    "recordCount": 200,
    "filters": {
      "regulatoryStandard": "FAA"
    },
    "generationTime": 4832,
    "requestedBy": "user-uuid",
    "complianceLevel": "FULL"
  }
}
```

### Download Report

Download a generated report file.

```http
GET /api/v1/llp/reports/download/{reportId}
```

**Response** (200 OK):
- **Content-Type**: `application/octet-stream`
- **Content-Disposition**: `attachment; filename="llp-report-{reportId}"`
- **Body**: Binary file content

### Get Available Report Formats

Get information about available report types and formats.

```http
GET /api/v1/llp/reports/formats
```

**Response** (200 OK):
```json
{
  "exportFormats": ["PDF", "EXCEL", "CSV", "JSON"],
  "reportTypes": ["FLEET_STATUS", "RETIREMENT_FORECAST", "REGULATORY_COMPLIANCE"],
  "supportedCombinations": [
    {
      "reportType": "FLEET_STATUS",
      "formats": ["PDF", "EXCEL", "CSV", "JSON"]
    },
    {
      "reportType": "RETIREMENT_FORECAST",
      "formats": ["PDF", "EXCEL", "JSON"]
    },
    {
      "reportType": "REGULATORY_COMPLIANCE",
      "formats": ["PDF", "EXCEL", "JSON"]
    }
  ],
  "maxRetentionDays": 7
}
```

## Retirement Management

### Retire LLP

Retire an LLP component and record disposition.

```http
POST /api/v1/llp/retirement
```

**Request Body**:
```json
{
  "serializedPartId": "serialized-part-uuid",
  "retirementDate": "2024-01-01T10:00:00Z",
  "retirementCycles": 1000,
  "retirementReason": "Reached cycle limit",
  "disposition": "SCRAP | MUSEUM | TRAINING | RETURN_TO_OEM",
  "performedBy": "SUPERVISOR-001",
  "location": "Retirement Facility",
  "notes": "Part retired due to reaching maximum cycle limit"
}
```

**Response** (201 Created):
```json
{
  "id": "retirement-event-uuid",
  "message": "Part retired successfully"
}
```

### Get Retirement Forecast

Get forecast of parts approaching retirement.

```http
GET /api/v1/llp/retirement-forecast?daysAhead=90
```

**Query Parameters**:
- `daysAhead` (integer): Days ahead to forecast (default: 90)

**Response** (200 OK):
```json
[
  {
    "partNumber": "LLP-TB-001",
    "serialNumber": "SN-TB-001",
    "partName": "High-Pressure Turbine Blade",
    "currentLifeUsed": 95.0,
    "forecastRetirementDate": "2024-03-15T12:00:00Z",
    "daysUntilRetirement": 45,
    "criticalityLevel": "CRITICAL",
    "retirementReason": "Approaching cycle limit"
  }
]
```

## System Health

### Health Check

Check system health and service status.

```http
GET /api/v1/llp/health
```

**Response** (200 OK):
```json
{
  "status": "healthy",
  "timestamp": "2023-10-31T14:30:00Z",
  "services": {
    "llpService": "operational",
    "alertService": "operational",
    "certificationService": "operational",
    "database": "operational"
  },
  "version": "1.0.0"
}
```

## Error Responses

### Standard Error Format

All API errors follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": ["Additional error details"],
  "timestamp": "2023-10-31T14:30:00Z"
}
```

### Common Error Codes

- **400 Bad Request**: Invalid input data
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **409 Conflict**: Duplicate resource or constraint violation
- **422 Unprocessable Entity**: Validation errors
- **500 Internal Server Error**: Server-side error

### Example Error Response

```json
{
  "error": "Invalid LLP configuration data",
  "code": "VALIDATION_ERROR",
  "details": [
    "cycleLimit must be a positive integer",
    "criticalityLevel must be one of: CRITICAL, CONTROLLED, TRACKED"
  ],
  "timestamp": "2023-10-31T14:30:00Z"
}
```

## Rate Limiting

- **Rate Limit**: 1000 requests per hour per user
- **Headers**:
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp

## Authentication

All endpoints require Bearer token authentication with production access permissions:

```http
Authorization: Bearer <your-jwt-token>
```

Tokens must include the `llp.access` permission scope.

---

**API Version**: 1.0
**Last Updated**: Current
**Support**: Contact system administrator for API support