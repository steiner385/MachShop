# Torque Management API Reference

This document provides comprehensive API documentation for the torque management system, including all endpoints, request/response formats, and practical examples.

## Base URL

```
https://your-domain.com/api/torque
```

## Authentication

All API endpoints require authentication. Include the bearer token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

## Content Type

All POST and PUT requests must include the Content-Type header:

```http
Content-Type: application/json
```

## Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "data": {...},
  "pagination": {...}, // For paginated responses
  "message": "Optional message"
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error message",
  "details": [...] // Optional validation details
}
```

## Torque Specifications

### Get All Torque Specifications

Retrieve a list of torque specifications with optional filtering.

```http
GET /api/torque/specifications
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `operationId` | string | Filter by operation ID |
| `partId` | string | Filter by part ID |
| `safetyLevel` | string | Filter by safety level (NORMAL, CRITICAL) |
| `method` | string | Filter by torque method |
| `isActive` | boolean | Filter by active status |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20) |

**Example Request:**

```bash
curl -X GET "https://your-domain.com/api/torque/specifications?safetyLevel=CRITICAL&page=1&limit=10" \
  -H "Authorization: Bearer <token>"
```

**Example Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "spec-123",
      "operationId": "op-cylinder-head-001",
      "partId": "part-cylinder-head-v8",
      "torqueValue": 95.0,
      "toleranceLower": 90.0,
      "toleranceUpper": 100.0,
      "targetValue": 95.0,
      "method": "TORQUE_ANGLE",
      "pattern": "STAR",
      "unit": "Nm",
      "numberOfPasses": 3,
      "angleSpec": 180.0,
      "fastenerType": "M12x1.75",
      "fastenerGrade": "10.9",
      "safetyLevel": "CRITICAL",
      "createdAt": "2024-03-01T08:00:00Z",
      "updatedAt": "2024-03-01T08:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "pages": 1
  }
}
```

### Get Torque Specification by ID

Retrieve a specific torque specification.

```http
GET /api/torque/specifications/{id}
```

**Example Request:**

```bash
curl -X GET "https://your-domain.com/api/torque/specifications/spec-123" \
  -H "Authorization: Bearer <token>"
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "id": "spec-123",
    "operationId": "op-cylinder-head-001",
    "partId": "part-cylinder-head-v8",
    "torqueValue": 95.0,
    "toleranceLower": 90.0,
    "toleranceUpper": 100.0,
    "targetValue": 95.0,
    "method": "TORQUE_ANGLE",
    "pattern": "STAR",
    "unit": "Nm",
    "numberOfPasses": 3,
    "angleSpec": 180.0,
    "angleToleranceLower": 175.0,
    "angleToleranceUpper": 185.0,
    "fastenerType": "M12x1.75",
    "fastenerGrade": "10.9",
    "fastenerLength": 85.0,
    "threadCondition": "Dry",
    "lubrication": "None",
    "toolType": "Electronic Angle Torque Wrench",
    "calibrationRequired": true,
    "engineeringApproval": true,
    "approvedBy": "jane.smith",
    "approvedDate": "2024-01-15T00:00:00Z",
    "safetyLevel": "CRITICAL",
    "notes": "Critical engine assembly operation. Follow sequence strictly.",
    "revision": "REV-A",
    "effectiveDate": "2024-01-15T00:00:00Z",
    "expirationDate": "2025-01-15T00:00:00Z",
    "createdAt": "2024-03-01T08:00:00Z",
    "updatedAt": "2024-03-01T08:00:00Z"
  }
}
```

### Create Torque Specification

Create a new torque specification.

```http
POST /api/torque/specifications
```

**Request Body:**

```json
{
  "operationId": "op-intake-manifold-001",
  "partId": "part-intake-manifold",
  "torqueValue": 25.0,
  "toleranceLower": 23.0,
  "toleranceUpper": 27.0,
  "targetValue": 25.0,
  "method": "TORQUE_ONLY",
  "pattern": "SPIRAL",
  "unit": "Nm",
  "numberOfPasses": 2,
  "fastenerType": "M8x1.25",
  "fastenerGrade": "8.8",
  "fastenerLength": 35.0,
  "threadCondition": "Dry",
  "lubrication": "None",
  "toolType": "Electronic Torque Wrench",
  "calibrationRequired": true,
  "engineeringApproval": true,
  "safetyLevel": "NORMAL",
  "notes": "Standard torque specification for intake manifold.",
  "revision": "REV-A",
  "effectiveDate": "2024-03-01T00:00:00Z",
  "expirationDate": "2025-03-01T00:00:00Z"
}
```

**Example Request:**

```bash
curl -X POST "https://your-domain.com/api/torque/specifications" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "operationId": "op-intake-manifold-001",
    "partId": "part-intake-manifold",
    "torqueValue": 25.0,
    "toleranceLower": 23.0,
    "toleranceUpper": 27.0,
    "targetValue": 25.0,
    "method": "TORQUE_ONLY",
    "pattern": "SPIRAL",
    "unit": "Nm",
    "numberOfPasses": 2,
    "fastenerType": "M8x1.25",
    "safetyLevel": "NORMAL"
  }'
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "id": "spec-456",
    "operationId": "op-intake-manifold-001",
    "partId": "part-intake-manifold",
    "torqueValue": 25.0,
    "toleranceLower": 23.0,
    "toleranceUpper": 27.0,
    "targetValue": 25.0,
    "method": "TORQUE_ONLY",
    "pattern": "SPIRAL",
    "unit": "Nm",
    "numberOfPasses": 2,
    "fastenerType": "M8x1.25",
    "fastenerGrade": "8.8",
    "safetyLevel": "NORMAL",
    "createdAt": "2024-03-01T10:30:00Z",
    "updatedAt": "2024-03-01T10:30:00Z"
  }
}
```

### Update Torque Specification

Update an existing torque specification.

```http
PUT /api/torque/specifications/{id}
```

**Request Body:** (Same as create, all fields optional)

**Example Request:**

```bash
curl -X PUT "https://your-domain.com/api/torque/specifications/spec-456" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "torqueValue": 26.0,
    "toleranceLower": 24.0,
    "toleranceUpper": 28.0,
    "notes": "Updated torque value per engineering change notice ECN-2024-001"
  }'
```

### Delete Torque Specification

Delete a torque specification.

```http
DELETE /api/torque/specifications/{id}
```

**Example Request:**

```bash
curl -X DELETE "https://your-domain.com/api/torque/specifications/spec-456" \
  -H "Authorization: Bearer <token>"
```

**Example Response:**

```json
{
  "success": true,
  "message": "Torque specification deleted successfully"
}
```

## Torque Sequences

### Get Sequences for Specification

Retrieve torque sequences for a specific specification.

```http
GET /api/torque/specifications/{id}/sequences
```

**Example Request:**

```bash
curl -X GET "https://your-domain.com/api/torque/specifications/spec-123/sequences" \
  -H "Authorization: Bearer <token>"
```

**Example Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "seq-001",
      "specificationId": "spec-123",
      "boltPosition": 1,
      "sequenceNumber": 1,
      "x": 100,
      "y": 50,
      "description": "Cylinder Head Bolt 1",
      "createdAt": "2024-03-01T08:00:00Z"
    },
    {
      "id": "seq-002",
      "specificationId": "spec-123",
      "boltPosition": 9,
      "sequenceNumber": 2,
      "x": 300,
      "y": 50,
      "description": "Cylinder Head Bolt 9",
      "createdAt": "2024-03-01T08:00:00Z"
    }
  ]
}
```

### Create Torque Sequence

Create a new torque sequence for a specification.

```http
POST /api/torque/specifications/{id}/sequences
```

**Request Body:**

```json
{
  "boltPosition": 17,
  "sequenceNumber": 17,
  "x": 125,
  "y": 75,
  "description": "Additional Cylinder Head Bolt"
}
```

**Example Request:**

```bash
curl -X POST "https://your-domain.com/api/torque/specifications/spec-123/sequences" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "boltPosition": 17,
    "sequenceNumber": 17,
    "x": 125,
    "y": 75,
    "description": "Additional Cylinder Head Bolt"
  }'
```

## Torque Events

### Get Torque Events

Retrieve torque events with filtering and pagination.

```http
GET /api/torque/events
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `sessionId` | string | Filter by session ID |
| `operatorId` | string | Filter by operator ID |
| `wrenchId` | string | Filter by wrench ID |
| `status` | string | Filter by status (PASS, UNDER_TORQUE, OVER_TORQUE, etc.) |
| `startDate` | string | Filter events after date (ISO 8601) |
| `endDate` | string | Filter events before date (ISO 8601) |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20) |

**Example Request:**

```bash
curl -X GET "https://your-domain.com/api/torque/events?sessionId=session-123&status=PASS" \
  -H "Authorization: Bearer <token>"
```

**Example Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "event-001",
      "sessionId": "session-123",
      "sequenceId": "seq-001",
      "passNumber": 1,
      "actualTorque": 94.8,
      "targetTorque": 95.0,
      "angle": 179.5,
      "targetAngle": 180.0,
      "status": "PASS",
      "isValid": true,
      "deviation": -0.2,
      "percentDeviation": -0.21,
      "wrenchId": "wrench-prod-001",
      "operatorId": "john.doe",
      "timestamp": "2024-03-01T08:15:30Z",
      "createdAt": "2024-03-01T08:15:30Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

### Get Torque Event by ID

Retrieve a specific torque event.

```http
GET /api/torque/events/{id}
```

**Example Request:**

```bash
curl -X GET "https://your-domain.com/api/torque/events/event-001" \
  -H "Authorization: Bearer <token>"
```

## Digital Wrench Management

### Get All Digital Wrenches

Retrieve all configured digital wrenches.

```http
GET /api/torque/wrenches
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `isActive` | boolean | Filter by active status |
| `connectionType` | string | Filter by connection type |
| `brand` | string | Filter by wrench brand |

**Example Request:**

```bash
curl -X GET "https://your-domain.com/api/torque/wrenches?isActive=true" \
  -H "Authorization: Bearer <token>"
```

**Example Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "wrench-prod-001",
      "name": "Production Line Wrench #1",
      "brand": "SNAP_ON",
      "model": "ATECH3F150",
      "connectionType": "BLUETOOTH",
      "address": "00:11:22:33:44:55",
      "serialNumber": "SN-SNAPON-001",
      "calibrationDate": "2024-01-15T00:00:00Z",
      "calibrationDue": "2025-01-15T00:00:00Z",
      "isActive": true,
      "settings": {
        "units": "Nm",
        "precision": 0.1,
        "autoMode": true,
        "timeout": 30000
      }
    }
  ]
}
```

### Add Digital Wrench

Add a new digital wrench configuration.

```http
POST /api/torque/wrenches
```

**Request Body:**

```json
{
  "id": "wrench-new-001",
  "name": "New Production Wrench",
  "brand": "NORBAR",
  "model": "EvoTorque Pro",
  "connectionType": "WIFI",
  "address": "192.168.10.150",
  "serialNumber": "SN-NORBAR-NEW-001",
  "calibrationDate": "2024-03-01T00:00:00Z",
  "calibrationDue": "2025-03-01T00:00:00Z",
  "isActive": true,
  "settings": {
    "units": "Nm",
    "precision": 0.05,
    "autoMode": true,
    "timeout": 45000,
    "maxTorque": 300.0,
    "minTorque": 10.0
  }
}
```

**Example Request:**

```bash
curl -X POST "https://your-domain.com/api/torque/wrenches" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "wrench-new-001",
    "name": "New Production Wrench",
    "brand": "NORBAR",
    "model": "EvoTorque Pro",
    "connectionType": "WIFI",
    "address": "192.168.10.150",
    "isActive": true
  }'
```

### Connect to Digital Wrench

Establish connection to a digital wrench.

```http
POST /api/torque/wrenches/{id}/connect
```

**Example Request:**

```bash
curl -X POST "https://your-domain.com/api/torque/wrenches/wrench-prod-001/connect" \
  -H "Authorization: Bearer <token>"
```

**Example Response:**

```json
{
  "success": true,
  "message": "Successfully connected to wrench",
  "data": {
    "wrenchId": "wrench-prod-001",
    "connectionStatus": "CONNECTED",
    "batteryLevel": 85,
    "signalStrength": 90,
    "timestamp": "2024-03-01T10:30:00Z"
  }
}
```

### Disconnect from Digital Wrench

Disconnect from a digital wrench.

```http
POST /api/torque/wrenches/{id}/disconnect
```

**Example Request:**

```bash
curl -X POST "https://your-domain.com/api/torque/wrenches/wrench-prod-001/disconnect" \
  -H "Authorization: Bearer <token>"
```

### Get Wrench Status

Get current status of a digital wrench.

```http
GET /api/torque/wrenches/{id}/status
```

**Example Request:**

```bash
curl -X GET "https://your-domain.com/api/torque/wrenches/wrench-prod-001/status" \
  -H "Authorization: Bearer <token>"
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "wrenchId": "wrench-prod-001",
    "isConnected": true,
    "connectionStatus": "CONNECTED",
    "batteryLevel": 85,
    "signalStrength": 90,
    "lastReading": "2024-03-01T10:25:00Z",
    "calibrationStatus": "CURRENT",
    "operationalStatus": "READY",
    "temperature": 22.5,
    "errors": []
  }
}
```

### Discover Available Wrenches

Discover digital wrenches available for connection.

```http
GET /api/torque/wrenches/discover
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `connectionType` | string | Filter by connection type |
| `timeout` | number | Discovery timeout in seconds (default: 30) |

**Example Request:**

```bash
curl -X GET "https://your-domain.com/api/torque/wrenches/discover?connectionType=BLUETOOTH" \
  -H "Authorization: Bearer <token>"
```

**Example Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "discovered-001",
      "name": "Snap-On ATECH3F150",
      "brand": "SNAP_ON",
      "model": "ATECH3F150",
      "connectionType": "BLUETOOTH",
      "address": "00:11:22:33:44:77",
      "signalStrength": 85,
      "isConfigured": false
    }
  ]
}
```

## Session Management

### Create Torque Session

Create a new torque session for executing a torque specification.

```http
POST /api/torque/sessions
```

**Request Body:**

```json
{
  "sessionId": "session-456",
  "specificationId": "spec-123",
  "operatorId": "john.doe",
  "wrenchId": "wrench-prod-001",
  "workOrderId": "wo-12345",
  "notes": "Cylinder head installation for engine serial ABC123"
}
```

**Example Request:**

```bash
curl -X POST "https://your-domain.com/api/torque/sessions" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session-456",
    "specificationId": "spec-123",
    "operatorId": "john.doe",
    "wrenchId": "wrench-prod-001"
  }'
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "sessionId": "session-456",
    "specificationId": "spec-123",
    "operatorId": "john.doe",
    "wrenchId": "wrench-prod-001",
    "status": "ACTIVE",
    "startTime": "2024-03-01T10:30:00Z",
    "currentSequenceIndex": 0,
    "currentPassNumber": 1,
    "totalSequences": 16,
    "totalPasses": 3,
    "progressPercent": 0
  }
}
```

### Get Session by ID

Retrieve session information.

```http
GET /api/torque/sessions/{id}
```

**Example Request:**

```bash
curl -X GET "https://your-domain.com/api/torque/sessions/session-456" \
  -H "Authorization: Bearer <token>"
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "sessionId": "session-456",
    "specificationId": "spec-123",
    "operatorId": "john.doe",
    "wrenchId": "wrench-prod-001",
    "status": "ACTIVE",
    "startTime": "2024-03-01T10:30:00Z",
    "currentSequenceIndex": 2,
    "currentPassNumber": 1,
    "totalSequences": 16,
    "totalPasses": 3,
    "progressPercent": 12.5,
    "lastActivity": "2024-03-01T10:35:00Z",
    "eventsRecorded": 2,
    "passedEvents": 2,
    "failedEvents": 0
  }
}
```

### Process Torque Reading

Submit a torque reading for processing and validation.

```http
POST /api/torque/sessions/{id}/readings
```

**Request Body:**

```json
{
  "wrenchId": "wrench-prod-001",
  "torque": 94.8,
  "angle": 179.5,
  "timestamp": "2024-03-01T10:35:00Z",
  "units": "Nm",
  "temperature": 22.5,
  "batteryLevel": 85
}
```

**Example Request:**

```bash
curl -X POST "https://your-domain.com/api/torque/sessions/session-456/readings" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "wrenchId": "wrench-prod-001",
    "torque": 94.8,
    "angle": 179.5,
    "timestamp": "2024-03-01T10:35:00Z",
    "units": "Nm"
  }'
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "event": {
      "id": "event-123",
      "sessionId": "session-456",
      "sequenceId": "seq-003",
      "passNumber": 1,
      "actualTorque": 94.8,
      "targetTorque": 95.0,
      "status": "PASS",
      "isValid": true,
      "deviation": -0.2,
      "percentDeviation": -0.21,
      "timestamp": "2024-03-01T10:35:00Z"
    },
    "validationResult": {
      "sessionId": "session-456",
      "isValid": true,
      "status": "PASS",
      "deviation": -0.2,
      "percentDeviation": -0.21,
      "message": "Reading within specification",
      "severity": "INFO"
    },
    "nextSequence": {
      "id": "seq-004",
      "boltPosition": 13,
      "sequenceNumber": 4,
      "x": 400,
      "y": 100,
      "description": "Cylinder Head Bolt 13"
    },
    "sessionProgress": {
      "currentSequenceIndex": 3,
      "currentPassNumber": 1,
      "progressPercent": 18.75,
      "isComplete": false
    }
  }
}
```

### Get Current Sequence

Get the current sequence for an active session.

```http
GET /api/torque/sessions/{id}/current-sequence
```

**Example Request:**

```bash
curl -X GET "https://your-domain.com/api/torque/sessions/session-456/current-sequence" \
  -H "Authorization: Bearer <token>"
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "id": "seq-004",
    "specificationId": "spec-123",
    "boltPosition": 13,
    "sequenceNumber": 4,
    "x": 400,
    "y": 100,
    "description": "Cylinder Head Bolt 13",
    "targetTorque": 95.0,
    "targetAngle": 180.0,
    "passNumber": 1,
    "totalPasses": 3
  }
}
```

### End Session

End an active torque session.

```http
POST /api/torque/sessions/{id}/end
```

**Example Request:**

```bash
curl -X POST "https://your-domain.com/api/torque/sessions/session-456/end" \
  -H "Authorization: Bearer <token>"
```

**Example Response:**

```json
{
  "success": true,
  "message": "Session ended successfully",
  "data": {
    "sessionId": "session-456",
    "status": "COMPLETED",
    "endTime": "2024-03-01T11:15:00Z",
    "duration": 2700,
    "totalEvents": 48,
    "passedEvents": 47,
    "failedEvents": 1,
    "finalStatus": "COMPLETED_WITH_EXCEPTIONS"
  }
}
```

### Pause Session

Pause an active session.

```http
POST /api/torque/sessions/{id}/pause
```

### Resume Session

Resume a paused session.

```http
POST /api/torque/sessions/{id}/resume
```

### Get Session Metrics

Get performance metrics for a session.

```http
GET /api/torque/sessions/{id}/metrics
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "sessionId": "session-456",
    "totalReadings": 48,
    "passedReadings": 47,
    "failedReadings": 1,
    "passRate": 97.9,
    "averageTorque": 94.92,
    "averageDeviation": -0.08,
    "standardDeviation": 0.45,
    "currentSequenceIndex": 16,
    "currentPassNumber": 3,
    "progressPercent": 100,
    "duration": 2700,
    "avgTimePerBolt": 56.25,
    "processCapability": {
      "cpk": 1.85,
      "cp": 2.1
    }
  }
}
```

## Reporting

### Generate Report

Generate a torque report in various formats.

```http
POST /api/torque/reports
```

**Request Body:**

```json
{
  "sessionId": "session-456",
  "format": "PDF",
  "includeAnalytics": true,
  "includeTraceability": true,
  "includeSignatures": true,
  "reportTitle": "Cylinder Head Torque Report - Engine ABC123",
  "customData": {
    "engineSerial": "ABC123",
    "customerPO": "PO-2024-001"
  }
}
```

**Example Request:**

```bash
curl -X POST "https://your-domain.com/api/torque/reports" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session-456",
    "format": "PDF",
    "includeAnalytics": true
  }'
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "reportId": "report-789",
    "sessionId": "session-456",
    "format": "PDF",
    "size": 1024576,
    "generatedAt": "2024-03-01T11:20:00Z",
    "checksum": "sha256:abc123...",
    "downloadUrl": "/api/torque/reports/report-789/download"
  }
}
```

### Download Report

Download a generated report.

```http
GET /api/torque/reports/{id}/download
```

**Example Request:**

```bash
curl -X GET "https://your-domain.com/api/torque/reports/report-789/download" \
  -H "Authorization: Bearer <token>" \
  -o "torque-report.pdf"
```

### Get Report by ID

Get report information.

```http
GET /api/torque/reports/{id}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "reportId": "report-789",
    "sessionId": "session-456",
    "format": "PDF",
    "size": 1024576,
    "generatedAt": "2024-03-01T11:20:00Z",
    "generatedBy": "john.doe",
    "checksum": "sha256:abc123...",
    "metadata": {
      "includeAnalytics": true,
      "includeTraceability": true,
      "reportTitle": "Cylinder Head Torque Report - Engine ABC123"
    }
  }
}
```

## Analytics

### Get Analytics Dashboard

Get comprehensive analytics data for a date range.

```http
GET /api/torque/analytics/dashboard
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `startDate` | string | Start date (ISO 8601) |
| `endDate` | string | End date (ISO 8601) |
| `operationId` | string | Filter by operation |
| `partId` | string | Filter by part |

**Example Request:**

```bash
curl -X GET "https://your-domain.com/api/torque/analytics/dashboard?startDate=2024-03-01&endDate=2024-03-31" \
  -H "Authorization: Bearer <token>"
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "timeRange": {
      "start": "2024-03-01T00:00:00Z",
      "end": "2024-03-31T23:59:59Z"
    },
    "overallMetrics": {
      "totalSessions": 156,
      "completedSessions": 152,
      "averageSessionDuration": 2650,
      "firstPassYield": 94.2,
      "processCapability": {
        "cpk": 1.75,
        "cp": 2.05
      }
    },
    "qualityMetrics": {
      "defectRate": 2.1,
      "reworkRate": 1.8,
      "scrapRate": 0.3,
      "customerComplaints": 0
    },
    "operatorPerformance": {
      "john.doe": {
        "operatorId": "john.doe",
        "operatorName": "John Doe",
        "sessionsCompleted": 45,
        "averageAccuracy": 96.8,
        "firstPassYield": 95.5,
        "averageSessionTime": 2580
      }
    },
    "alerts": [
      {
        "id": "alert-001",
        "type": "CALIBRATION_DUE",
        "severity": "WARNING",
        "message": "Wrench wrench-prod-002 calibration due in 15 days",
        "timestamp": "2024-03-15T10:00:00Z"
      }
    ]
  }
}
```

### Get Specification Analytics

Get analytics for a specific torque specification.

```http
GET /api/torque/analytics/specifications/{id}
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `startDate` | string | Start date (ISO 8601) |
| `endDate` | string | End date (ISO 8601) |

**Example Request:**

```bash
curl -X GET "https://your-domain.com/api/torque/analytics/specifications/spec-123?startDate=2024-03-01" \
  -H "Authorization: Bearer <token>"
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "specificationId": "spec-123",
    "timeRange": {
      "start": "2024-03-01T00:00:00Z",
      "end": "2024-03-31T23:59:59Z"
    },
    "totalEvents": 768,
    "passCount": 742,
    "failCount": 26,
    "firstPassYield": 96.6,
    "averageTorque": 94.85,
    "averageDeviation": -0.15,
    "standardDeviation": 0.52,
    "processCapability": {
      "cpk": 1.92,
      "cp": 2.15
    },
    "trends": {
      "direction": "stable",
      "strength": 0.15,
      "r2": 0.02
    },
    "outOfSpecAnalysis": {
      "underTorqueCount": 18,
      "overTorqueCount": 8,
      "commonCauses": [
        "Tool calibration drift",
        "Operator technique variation"
      ]
    }
  }
}
```

## Validation Rules

### Get All Validation Rules

Get all configured validation rules.

```http
GET /api/torque/validation/rules
```

**Example Request:**

```bash
curl -X GET "https://your-domain.com/api/torque/validation/rules" \
  -H "Authorization: Bearer <token>"
```

**Example Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "rule-standard-tolerance",
      "name": "Standard Tolerance Check",
      "description": "Standard ±3% tolerance for normal torque operations",
      "ruleType": "TOLERANCE",
      "parameters": {
        "tolerancePercent": 3.0,
        "allowOverTorque": false,
        "maxRetries": 3
      },
      "isActive": true,
      "severity": "ERROR",
      "applicableOperations": ["normal", "standard"],
      "applicableSafetyLevels": ["NORMAL"]
    }
  ]
}
```

### Create Validation Rule

Create a new validation rule.

```http
POST /api/torque/validation/rules
```

**Request Body:**

```json
{
  "id": "rule-custom-tolerance",
  "name": "Custom Tolerance Check",
  "description": "Custom ±2% tolerance for special operations",
  "ruleType": "TOLERANCE",
  "parameters": {
    "tolerancePercent": 2.0,
    "allowOverTorque": false,
    "maxRetries": 2,
    "requireApprovalForFailure": true
  },
  "isActive": true,
  "severity": "ERROR",
  "applicableOperations": ["custom"],
  "applicableSafetyLevels": ["NORMAL", "CRITICAL"]
}
```

### Update Validation Rule

Update an existing validation rule.

```http
PUT /api/torque/validation/rules/{id}
```

### Delete Validation Rule

Delete a validation rule.

```http
DELETE /api/torque/validation/rules/{id}
```

## System Status

### Get System Status

Get overall system status and health.

```http
GET /api/torque/system/status
```

**Example Request:**

```bash
curl -X GET "https://your-domain.com/api/torque/system/status" \
  -H "Authorization: Bearer <token>"
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "systemHealth": "HEALTHY",
    "timestamp": "2024-03-01T12:00:00Z",
    "orchestration": {
      "isRunning": true,
      "totalSessions": 5,
      "activeSessions": 2,
      "completedSessions": 3,
      "averageSessionDuration": 2650
    },
    "realtime": {
      "isRunning": true,
      "totalClients": 8,
      "activeClients": 6,
      "messagesSent": 1456,
      "messagesPerSecond": 2.3,
      "uptime": 86400
    },
    "wrenches": {
      "totalConfigured": 5,
      "activeWrenches": 4,
      "connectedWrenches": 2,
      "calibrationExpiring": 1
    },
    "validation": {
      "totalRules": 10,
      "activeRules": 8,
      "totalValidations": 768,
      "passRate": 96.6
    },
    "alerts": [
      {
        "id": "alert-cal-001",
        "type": "CALIBRATION_WARNING",
        "severity": "WARNING",
        "message": "Wrench wrench-prod-002 calibration expires in 15 days",
        "timestamp": "2024-03-01T12:00:00Z"
      }
    ]
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid request format or parameters |
| 401 | Unauthorized - Invalid or missing authentication token |
| 403 | Forbidden - Insufficient permissions for operation |
| 404 | Not Found - Requested resource does not exist |
| 409 | Conflict - Resource already exists or conflicts with current state |
| 422 | Unprocessable Entity - Validation errors in request data |
| 500 | Internal Server Error - Unexpected server error |
| 503 | Service Unavailable - System temporarily unavailable |

## Rate Limiting

API requests are limited to:
- **Authentication**: 10 requests per minute
- **Read operations**: 100 requests per minute
- **Write operations**: 50 requests per minute
- **Real-time data**: 500 requests per minute

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## WebSocket Events

For real-time updates, connect to:
```
wss://your-domain.com/api/torque/realtime
```

### Connection Authentication

Include JWT token in connection:
```javascript
const ws = new WebSocket('wss://your-domain.com/api/torque/realtime', [], {
  headers: {
    'Authorization': 'Bearer <token>'
  }
});
```

### Event Types

#### Torque Event
```json
{
  "type": "TORQUE_EVENT",
  "payload": {
    "sessionId": "session-456",
    "event": {
      "id": "event-123",
      "actualTorque": 94.8,
      "status": "PASS",
      "timestamp": "2024-03-01T10:35:00Z"
    }
  },
  "timestamp": "2024-03-01T10:35:01Z"
}
```

#### Validation Result
```json
{
  "type": "VALIDATION_RESULT",
  "payload": {
    "sessionId": "session-456",
    "isValid": true,
    "status": "PASS",
    "message": "Reading within specification"
  },
  "timestamp": "2024-03-01T10:35:01Z"
}
```

#### Session Status Update
```json
{
  "type": "SESSION_STATUS",
  "payload": {
    "sessionId": "session-456",
    "status": "ACTIVE",
    "progressPercent": 25.0,
    "currentSequence": 4
  },
  "timestamp": "2024-03-01T10:35:01Z"
}
```

## SDK Examples

### JavaScript/TypeScript

```typescript
import { TorqueAPI } from '@your-company/torque-sdk';

const client = new TorqueAPI({
  baseURL: 'https://your-domain.com/api/torque',
  authToken: 'your-jwt-token'
});

// Create a torque session
const session = await client.sessions.create({
  sessionId: 'session-001',
  specificationId: 'spec-123',
  operatorId: 'john.doe',
  wrenchId: 'wrench-prod-001'
});

// Process torque readings
const result = await client.sessions.processReading('session-001', {
  wrenchId: 'wrench-prod-001',
  torque: 94.8,
  angle: 179.5,
  timestamp: new Date().toISOString(),
  units: 'Nm'
});

// Subscribe to real-time events
client.realtime.subscribe('session-001', (event) => {
  console.log('Torque event:', event);
});
```

### Python

```python
from torque_client import TorqueClient

client = TorqueClient(
    base_url='https://your-domain.com/api/torque',
    auth_token='your-jwt-token'
)

# Create a torque session
session = client.sessions.create(
    session_id='session-001',
    specification_id='spec-123',
    operator_id='john.doe',
    wrench_id='wrench-prod-001'
)

# Process torque reading
result = client.sessions.process_reading('session-001', {
    'wrenchId': 'wrench-prod-001',
    'torque': 94.8,
    'angle': 179.5,
    'timestamp': '2024-03-01T10:35:00Z',
    'units': 'Nm'
})

print(f"Validation result: {result['validationResult']['status']}")
```

## Support

For API support and documentation updates:
- **Documentation**: https://docs.your-domain.com/torque-api
- **Support**: api-support@your-domain.com
- **Status Page**: https://status.your-domain.com
- **Rate Limits**: Contact support for enterprise rate limit increases