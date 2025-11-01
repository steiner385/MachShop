# Serialization Workflows - API Reference
**Issue #150: Serialization - Advanced Assignment Workflows**

## Overview

This API reference documents all REST endpoints for advanced serial number management workflows. The system supports vendor-provided serials, system-generated numbers, deferred assignment, propagation tracking, uniqueness validation, and configurable triggers.

## Base URL

```
http://localhost:3000/api/v1/serialization
```

## Authentication

All endpoints require:
- **Header**: `Authorization: Bearer <token>`
- **Access Level**: Production Access Required

## Response Format

All responses follow this format:

```json
{
  "success": true,
  "data": { /* resource data */ },
  "error": null,
  "timestamp": "2024-11-01T12:00:00Z"
}
```

---

## 1. Vendor Serial Endpoints

### 1.1 Receive Vendor Serial

**POST** `/vendor/receive`

Receive and register a vendor-provided serial number.

**Request Body:**
```json
{
  "vendorSerialNumber": "VS-2024-001",
  "vendorName": "Acme Corp",
  "partId": "part-123",
  "receivedDate": "2024-11-01T10:00:00Z"
}
```

**Response:**
```json
{
  "id": "vendor-serial-456",
  "vendorSerialNumber": "VS-2024-001",
  "vendorName": "Acme Corp",
  "partId": "part-123",
  "status": "PENDING",
  "receivedAt": "2024-11-01T10:00:00Z"
}
```

**Status Codes:**
- `201 Created` - Serial received successfully
- `400 Bad Request` - Invalid input data
- `401 Unauthorized` - Missing authentication
- `403 Forbidden` - Insufficient permissions

---

### 1.2 Accept Vendor Serial

**POST** `/vendor/:vendorSerialId/accept`

Accept a vendor serial for internal use.

**Request Body:**
```json
{
  "acceptedBy": "operator-001",
  "internalSerialId": "INT-2024-001"
}
```

**Response:**
```json
{
  "id": "vendor-serial-456",
  "status": "ACCEPTED",
  "internalSerialId": "INT-2024-001",
  "acceptedAt": "2024-11-01T10:30:00Z"
}
```

---

### 1.3 Reject Vendor Serial

**POST** `/vendor/:vendorSerialId/reject`

Reject a vendor serial with reason.

**Request Body:**
```json
{
  "rejectionReason": "Format does not match spec",
  "rejectedBy": "quality-manager-001"
}
```

**Response:**
```json
{
  "id": "vendor-serial-456",
  "status": "REJECTED",
  "rejectionReason": "Format does not match spec",
  "rejectedAt": "2024-11-01T10:45:00Z"
}
```

---

### 1.4 Get Vendor Serial

**GET** `/vendor/:vendorSerialId`

Retrieve vendor serial details.

**Response:**
```json
{
  "id": "vendor-serial-456",
  "vendorSerialNumber": "VS-2024-001",
  "vendorName": "Acme Corp",
  "status": "ACCEPTED",
  "createdAt": "2024-11-01T10:00:00Z",
  "updatedAt": "2024-11-01T10:30:00Z"
}
```

---

### 1.5 List Vendor Serials for Part

**GET** `/vendor/part/:partId`

Get all vendor serials for a specific part.

**Query Parameters:**
- `status` (optional): Filter by status (PENDING, ACCEPTED, REJECTED)
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "data": [
    { /* vendor serial objects */ }
  ],
  "total": 10,
  "limit": 50,
  "offset": 0
}
```

---

## 2. System-Generated Serial Endpoints

### 2.1 Generate System Serial

**POST** `/system-generated/generate`

Generate a serial number using configured pattern.

**Request Body:**
```json
{
  "partId": "part-123",
  "formatConfigId": "format-config-789",
  "generatedBy": "operator-001",
  "context": {
    "siteId": "site-001",
    "workCenterId": "wc-001"
  }
}
```

**Response:**
```json
{
  "id": "serial-001",
  "serialNumber": "TST-2024-1101-0001",
  "partId": "part-123",
  "formatConfigId": "format-config-789",
  "status": "ACTIVE",
  "generatedAt": "2024-11-01T10:00:00Z"
}
```

---

### 2.2 Trigger Serial Generation

**POST** `/system-generated/trigger`

Generate serials based on event trigger.

**Request Body:**
```json
{
  "partId": "part-123",
  "triggerType": "MATERIAL_RECEIPT",
  "context": {
    "purchaseOrderId": "po-456"
  },
  "triggeredBy": "system"
}
```

**Response:**
```json
{
  "triggerId": "trigger-789",
  "serialNumber": "TST-2024-1101-0002",
  "triggerType": "MATERIAL_RECEIPT",
  "status": "GENERATED"
}
```

---

### 2.3 List Generated Serials

**GET** `/system-generated/part/:partId`

Get all system-generated serials for a part.

**Response:**
```json
[
  {
    "id": "serial-001",
    "serialNumber": "TST-2024-1101-0001",
    "status": "ACTIVE",
    "generatedAt": "2024-11-01T10:00:00Z"
  }
]
```

---

## 3. Late Assignment Endpoints

### 3.1 Create Placeholder

**POST** `/late-assignment/placeholder`

Create a placeholder for deferred serialization.

**Request Body:**
```json
{
  "partId": "part-123",
  "workOrderId": "wo-456",
  "operationCode": "OP-002",
  "quantity": 5,
  "createdBy": "operator-001"
}
```

**Response:**
```json
{
  "id": "placeholder-001",
  "partId": "part-123",
  "status": "PENDING",
  "quantity": 5,
  "createdAt": "2024-11-01T10:00:00Z"
}
```

---

### 3.2 Assign Serial to Placeholder

**POST** `/late-assignment/placeholder/:placeholderId/assign`

Assign a serial number to a placeholder.

**Request Body:**
```json
{
  "serialNumber": "LATE-2024-0001",
  "assignedBy": "operator-001"
}
```

**Response:**
```json
{
  "id": "placeholder-001",
  "status": "SERIALIZED",
  "serialNumber": "LATE-2024-0001",
  "assignedAt": "2024-11-01T15:00:00Z"
}
```

---

### 3.3 Mark Placeholder Failed

**POST** `/late-assignment/placeholder/:placeholderId/fail`

Mark a placeholder as failed (no serial assigned).

**Request Body:**
```json
{
  "reason": "Part damaged during operation",
  "failedBy": "operator-001"
}
```

**Response:**
```json
{
  "id": "placeholder-001",
  "status": "FAILED",
  "failureReason": "Part damaged during operation"
}
```

---

### 3.4 Get Pending Placeholders

**GET** `/late-assignment/pending`

Get all pending placeholders awaiting serialization.

**Response:**
```json
[
  {
    "id": "placeholder-001",
    "partId": "part-123",
    "status": "PENDING",
    "createdAt": "2024-11-01T10:00:00Z"
  }
]
```

---

### 3.5 Get Statistics

**GET** `/late-assignment/statistics/:partId`

Get late assignment statistics for a part.

**Response:**
```json
{
  "totalPending": 10,
  "totalSerialized": 45,
  "totalFailed": 2,
  "successRate": 95.7,
  "averageTimeToSerialization": 3.5
}
```

---

## 4. Serial Propagation Endpoints

### 4.1 Pass-Through Propagation

**POST** `/propagation/pass-through`

Record serial passing through an operation.

**Request Body:**
```json
{
  "sourceSerialId": "serial-001",
  "operationCode": "OP-001",
  "routingSequence": 1,
  "workCenterId": "wc-001",
  "quantity": 1,
  "createdBy": "operator-001"
}
```

**Response:**
```json
{
  "id": "propagation-001",
  "sourceSerialId": "serial-001",
  "propagationType": "PASS_THROUGH",
  "operationCode": "OP-001",
  "status": "RECORDED"
}
```

---

### 4.2 Split Propagation

**POST** `/propagation/split`

Record serial split (one to many).

**Request Body:**
```json
{
  "sourceSerialId": "serial-001",
  "operationCode": "OP-SPLIT",
  "routingSequence": 5,
  "targetSerialIds": ["serial-002", "serial-003"],
  "createdBy": "operator-001"
}
```

**Response:**
```json
[
  {
    "id": "propagation-002",
    "sourceSerialId": "serial-001",
    "targetSerialId": "serial-002",
    "propagationType": "SPLIT",
    "quantity": 1
  },
  {
    "id": "propagation-003",
    "sourceSerialId": "serial-001",
    "targetSerialId": "serial-003",
    "propagationType": "SPLIT",
    "quantity": 1
  }
]
```

---

### 4.3 Merge Propagation

**POST** `/propagation/merge`

Record serial merge (many to one).

**Request Body:**
```json
{
  "sourceSerialIds": ["serial-002", "serial-003"],
  "operationCode": "OP-MERGE",
  "routingSequence": 10,
  "targetSerialId": "serial-004",
  "createdBy": "operator-001"
}
```

**Response:**
```json
{
  "id": "propagation-004",
  "sourceSerialIds": ["serial-002", "serial-003"],
  "targetSerialId": "serial-004",
  "propagationType": "MERGE",
  "quantity": 2
}
```

---

### 4.4 Get Serial Lineage

**GET** `/propagation/lineage/:serialId`

Get complete serial lineage (ancestors, descendants, history).

**Response:**
```json
{
  "serial": {
    "id": "serial-001",
    "serialNumber": "TST-2024-1101-0001"
  },
  "ancestors": [/* parent serials */],
  "descendants": [/* child serials */],
  "propagationHistory": [
    {
      "operationCode": "OP-001",
      "routingSequence": 1,
      "propagationType": "PASS_THROUGH",
      "performedAt": "2024-11-01T10:00:00Z"
    }
  ]
}
```

---

### 4.5 Get Propagation History

**GET** `/propagation/history/:partId`

Get propagation history for a part.

**Query Parameters:**
- `operationCode` (optional): Filter by operation
- `propagationType` (optional): Filter by type (PASS_THROUGH, SPLIT, MERGE, TRANSFORMATION)

**Response:**
```json
[
  {
    "id": "propagation-001",
    "sourceSerialId": "serial-001",
    "operationCode": "OP-001",
    "propagationType": "PASS_THROUGH",
    "recordedAt": "2024-11-01T10:00:00Z"
  }
]
```

---

### 4.6 Get Statistics

**GET** `/propagation/statistics/:partId`

Get propagation statistics for a part.

**Response:**
```json
{
  "totalPropagations": 150,
  "byType": {
    "PASS_THROUGH": 100,
    "SPLIT": 30,
    "MERGE": 20
  },
  "byOperation": {
    "OP-001": 45,
    "OP-002": 55
  },
  "averageDepth": 3.2
}
```

---

## 5. Serial Uniqueness Endpoints

### 5.1 Check Uniqueness

**POST** `/uniqueness/check`

Check serial uniqueness across scopes.

**Request Body:**
```json
{
  "serialNumber": "TEST-001",
  "partId": "part-123",
  "scope": ["SITE", "ENTERPRISE"],
  "siteId": "site-001"
}
```

**Response:**
```json
{
  "hasConflict": false,
  "conflictingSerialIds": [],
  "conflictingScopes": [],
  "conflictType": null
}
```

---

### 5.2 Register Serial for Uniqueness

**POST** `/uniqueness/register`

Register serial for uniqueness tracking.

**Request Body:**
```json
{
  "serialNumber": "TEST-001",
  "partId": "part-123",
  "scope": ["SITE", "PART_TYPE"]
}
```

**Response:**
```json
{
  "serialNumber": "TEST-001",
  "partId": "part-123",
  "siteLevel": true,
  "enterpriseLevel": false,
  "partTypeLevel": true,
  "hasConflict": false
}
```

---

### 5.3 Resolve Conflict

**POST** `/uniqueness/conflict/resolve`

Resolve a uniqueness conflict.

**Request Body:**
```json
{
  "serialNumber": "CONFLICT-001",
  "partId": "part-123",
  "conflictResolution": "RETIRE",
  "retiredSerialId": "serial-conflict-001",
  "resolutionReason": "Duplicate detected",
  "resolvedBy": "quality-manager"
}
```

**Response:**
```json
{
  "serialNumber": "CONFLICT-001",
  "hasConflict": false,
  "conflictResolution": "RETIRE",
  "resolvedAt": "2024-11-01T11:00:00Z"
}
```

---

### 5.4 Get Uniqueness Report

**GET** `/uniqueness/report/:serialNumber/:partId`

Get detailed uniqueness report for a serial.

**Response:**
```json
{
  "serialNumber": "TEST-001",
  "partId": "part-123",
  "isSiteUnique": true,
  "isEnterpriseUnique": true,
  "isPartTypeUnique": true,
  "totalConflicts": 0,
  "conflictingSerials": []
}
```

---

### 5.5 Get Pending Conflicts

**GET** `/uniqueness/conflicts/pending`

Get all pending conflicts.

**Query Parameters:**
- `partId` (optional): Filter by part

**Response:**
```json
[
  {
    "serialNumber": "CONFLICT-001",
    "partId": "part-123",
    "hasConflict": true,
    "conflictingSerialIds": ["serial-001", "serial-002"]
  }
]
```

---

### 5.6 Get Statistics

**GET** `/uniqueness/statistics/:partId`

Get uniqueness statistics for a part.

**Response:**
```json
{
  "totalUniqueSerials": 150,
  "serialsWithConflicts": 3,
  "resolvedConflicts": 2,
  "conflictRate": 2.0
}
```

---

## 6. Trigger Configuration Endpoints

### 6.1 Create Trigger

**POST** `/triggers`

Create a trigger configuration.

**Request Body:**
```json
{
  "partId": "part-123",
  "triggerType": "MATERIAL_RECEIPT",
  "assignmentType": "SYSTEM_GENERATED",
  "formatConfigId": "format-config-789",
  "operationCode": "OP-001",
  "isConditional": true,
  "conditions": {
    "siteId": "site-001"
  },
  "batchMode": true,
  "batchSize": 10,
  "createdBy": "admin-001"
}
```

**Response:**
```json
{
  "id": "trigger-001",
  "partId": "part-123",
  "triggerType": "MATERIAL_RECEIPT",
  "assignmentType": "SYSTEM_GENERATED",
  "isActive": true,
  "createdAt": "2024-11-01T10:00:00Z"
}
```

---

### 6.2 Update Trigger

**PATCH** `/triggers/:triggerId`

Update trigger configuration.

**Request Body:**
```json
{
  "isActive": false,
  "batchSize": 20,
  "updatedBy": "admin-001"
}
```

**Response:**
```json
{
  "id": "trigger-001",
  "isActive": false,
  "batchSize": 20,
  "updatedAt": "2024-11-01T11:00:00Z"
}
```

---

### 6.3 Get Trigger

**GET** `/triggers/:triggerId`

Get trigger by ID.

**Response:**
```json
{
  "id": "trigger-001",
  "partId": "part-123",
  "triggerType": "MATERIAL_RECEIPT",
  "assignmentType": "SYSTEM_GENERATED",
  "isActive": true,
  "createdAt": "2024-11-01T10:00:00Z"
}
```

---

### 6.4 List Triggers for Part

**GET** `/triggers/part/:partId`

Get all triggers for a part.

**Response:**
```json
[
  {
    "id": "trigger-001",
    "triggerType": "MATERIAL_RECEIPT",
    "isActive": true
  },
  {
    "id": "trigger-002",
    "triggerType": "WORK_ORDER_CREATE",
    "isActive": false
  }
]
```

---

### 6.5 Enable Trigger

**POST** `/triggers/:triggerId/enable`

Enable a trigger.

**Request Body:**
```json
{
  "enabledBy": "admin-001"
}
```

**Response:**
```json
{
  "id": "trigger-001",
  "isActive": true,
  "enabledAt": "2024-11-01T11:00:00Z"
}
```

---

### 6.6 Disable Trigger

**POST** `/triggers/:triggerId/disable`

Disable a trigger.

**Request Body:**
```json
{
  "disabledBy": "admin-001"
}
```

**Response:**
```json
{
  "id": "trigger-001",
  "isActive": false,
  "disabledAt": "2024-11-01T11:00:00Z"
}
```

---

### 6.7 Delete Trigger

**DELETE** `/triggers/:triggerId`

Delete a trigger configuration.

**Request Body:**
```json
{
  "deletedBy": "admin-001"
}
```

**Response:**
```
204 No Content
```

---

### 6.8 Get Statistics

**GET** `/triggers/statistics/:partId`

Get trigger statistics for a part.

**Response:**
```json
{
  "totalTriggers": 5,
  "activeTriggers": 3,
  "byTriggerType": {
    "MATERIAL_RECEIPT": 2,
    "WORK_ORDER_CREATE": 1
  },
  "byAssignmentType": {
    "SYSTEM_GENERATED": 2,
    "VENDOR": 1
  },
  "withConditions": 2,
  "batchEnabled": 1
}
```

---

## Error Handling

### Common Error Responses

**400 Bad Request**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid input data",
  "details": [
    {
      "field": "serialNumber",
      "message": "Serial number format invalid"
    }
  ]
}
```

**401 Unauthorized**
```json
{
  "error": "UNAUTHORIZED",
  "message": "Authentication token missing or invalid"
}
```

**403 Forbidden**
```json
{
  "error": "FORBIDDEN",
  "message": "Insufficient permissions for this operation"
}
```

**404 Not Found**
```json
{
  "error": "NOT_FOUND",
  "message": "Resource not found",
  "resourceType": "SerialNumber",
  "resourceId": "serial-123"
}
```

**500 Internal Server Error**
```json
{
  "error": "INTERNAL_SERVER_ERROR",
  "message": "An unexpected error occurred",
  "requestId": "req-abc123"
}
```

---

## Rate Limiting

- **Limit**: 1000 requests per minute
- **Headers**:
  - `X-RateLimit-Limit: 1000`
  - `X-RateLimit-Remaining: 999`
  - `X-RateLimit-Reset: 1699007400`

---

## Pagination

List endpoints support pagination with:
- `limit`: Number of results (default: 50, max: 500)
- `offset`: Pagination offset (default: 0)

Example:
```
GET /vendor/part/part-123?limit=25&offset=50
```

---

## Next Steps

- See [USER_GUIDE.md](./USER_GUIDE.md) for step-by-step workflows
- See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment instructions
- See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues
