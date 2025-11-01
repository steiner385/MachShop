# STEP AP242 Integration API Guide

**Issue #220 Phase 2: REST API Endpoints for CAD/PMI Integration**

## Overview

This guide covers the REST API endpoints for STEP AP242 (ISO 10303-242) Model-Based Enterprise integration. The API enables CAD file import, PMI extraction, digital thread creation, and PLM synchronization.

## API Base Path

All endpoints are prefixed with: `/api/v1/step-ap242`

## Authentication

All endpoints require authentication via the `Authorization` header:
```
Authorization: Bearer <JWT_TOKEN>
```

## File Upload Configuration

- **Max file size:** 500 MB
- **Supported formats:** `.step`, `.stp`, `.jt`, `.pdf`, `.3dxml`
- **Upload directory:** `./uploads/step-files`

---

## Endpoints

### 1. Import STEP File

**POST** `/import`

Import a STEP AP242 file and optionally extract PMI data.

#### Request (multipart/form-data)

```bash
curl -X POST http://localhost:3001/api/v1/step-ap242/import \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@model.step" \
  -F "partId=part-123" \
  -F "extractPMI=true" \
  -F "cadSystemSource=NX" \
  -F "cadModelRevision=A"
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file` | File | ✅ | STEP file to import |
| `partId` | string | ❌ | Manufacturing part ID to link |
| `operationIds` | string[] | ❌ | Operations to associate (JSON array) |
| `extractPMI` | boolean | ❌ | Extract PMI data (default: false) |
| `cadSystemSource` | string | ❌ | CAD system: NX, CATIA, Creo, SolidWorks |
| `cadModelRevision` | string | ❌ | Model revision identifier |

#### Response

```json
{
  "success": true,
  "importId": "import-12345",
  "stepUuid": "550e8400-e29b-41d4-a716-446655440000",
  "message": "STEP file imported successfully",
  "pmiExtracted": true,
  "data": {
    "fileUrl": "/uploads/step-files/step-1234567890.step",
    "fileSize": 1048576,
    "fileName": "model.step"
  }
}
```

#### Example (Python)

```python
import requests

with open('model.step', 'rb') as f:
    files = {'file': f}
    data = {
        'partId': 'part-123',
        'extractPMI': 'true',
        'cadSystemSource': 'NX',
        'cadModelRevision': 'A'
    }
    headers = {'Authorization': f'Bearer {token}'}

    response = requests.post(
        'http://localhost:3001/api/v1/step-ap242/import',
        files=files,
        data=data,
        headers=headers
    )
    print(response.json())
```

---

### 2. Get Import Status

**GET** `/imports/:importId`

Retrieve the status and details of a STEP file import.

#### Request

```bash
curl http://localhost:3001/api/v1/step-ap242/imports/import-12345 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Response

```json
{
  "success": true,
  "import": {
    "id": "import-12345",
    "fileName": "model.step",
    "fileUrl": "/uploads/step-files/step-1234567890.step",
    "status": "success",
    "stepUuid": "550e8400-e29b-41d4-a716-446655440000",
    "cadSystemSource": "NX",
    "pmiExtracted": true,
    "importedAt": "2025-10-31T23:45:00Z",
    "completedAt": "2025-10-31T23:46:30Z",
    "errors": [],
    "warnings": []
  }
}
```

---

### 3. Extract PMI

**POST** `/extract-pmi`

Extract Product Manufacturing Information (PMI) from STEP file data.

#### Request

```json
POST /api/v1/step-ap242/extract-pmi
Content-Type: application/json

{
  "stepUuid": "550e8400-e29b-41d4-a716-446655440000",
  "cadModelUuid": "550e8400-e29b-41d4-a716-446655440001",
  "features": [
    {
      "id": "feature-1",
      "uuid": "f-uuid-1",
      "name": "Hole A",
      "geometry": {
        "type": "CYLINDER",
        "diameter": 10,
        "depth": 25
      }
    }
  ],
  "tolerances": [
    {
      "type": "POSITION",
      "value": 0.1,
      "unit": "mm",
      "featureId": "feature-1",
      "modifier": "MMC",
      "datumReferences": ["DATUM-A", "DATUM-B"]
    }
  ],
  "dimensions": [
    {
      "type": "DIAMETER",
      "value": 10,
      "unit": "mm",
      "featureId": "feature-1"
    }
  ]
}
```

#### Response

```json
{
  "success": true,
  "pmiData": {
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "cadModelUuid": "550e8400-e29b-41d4-a716-446655440001",
    "extractionDate": "2025-10-31T23:47:00Z",
    "hasPMI": true,
    "features": [
      {
        "id": "feature-1",
        "uuid": "f-uuid-1",
        "name": "Hole A",
        "geometry": { ... }
      }
    ],
    "tolerances": [ ... ],
    "dimensions": [ ... ]
  },
  "summary": {
    "featuresCount": 1,
    "tolerancesCount": 1,
    "dimensionsCount": 1,
    "hasPMI": true
  }
}
```

---

### 4. Link STEP to Part

**POST** `/link-to-part`

Associate a STEP model with a manufacturing part.

#### Request

```bash
curl -X POST http://localhost:3001/api/v1/step-ap242/link-to-part \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "stepUuid": "550e8400-e29b-41d4-a716-446655440000",
    "partId": "part-123"
  }'
```

#### Response

```json
{
  "success": true,
  "message": "STEP model 550e8400-e29b-41d4-a716-446655440000 linked to part part-123",
  "part": {
    "id": "part-123",
    "partNumber": "PART-001",
    "partName": "Connector Assembly",
    "stepAp242Uuid": "550e8400-e29b-41d4-a716-446655440000",
    "cadModelUuid": "550e8400-e29b-41d4-a716-446655440000",
    "hasPMI": true,
    "stepAp242LastSync": "2025-10-31T23:48:00Z"
  }
}
```

---

### 5. Map PMI to Quality Characteristics

**POST** `/map-pmi-to-characteristics`

Map PMI tolerances and dimensions to quality characteristics for inspection.

#### Request

```json
POST /api/v1/step-ap242/map-pmi-to-characteristics
Content-Type: application/json

{
  "partId": "part-123",
  "tolerances": [
    {
      "type": "POSITION",
      "value": 0.1,
      "unit": "mm",
      "featureId": "feature-1",
      "modifier": "MMC",
      "datumReferences": ["DATUM-A"]
    }
  ],
  "dimensions": [
    {
      "type": "DIAMETER",
      "value": 10,
      "unit": "mm",
      "featureId": "feature-1"
    }
  ]
}
```

#### Response

```json
{
  "success": true,
  "message": "Mapped 2 PMI features to quality characteristics",
  "mapping": {
    "feature-1": [
      "char-123",
      "char-124"
    ]
  },
  "characteristicCount": 2
}
```

---

### 6. Create Digital Thread Trace

**POST** `/digital-thread`

Create a digital thread linking CAD geometry to manufacturing operations.

#### Request

```bash
curl -X POST http://localhost:3001/api/v1/step-ap242/digital-thread \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cadModelUuid": "550e8400-e29b-41d4-a716-446655440000",
    "pmiFeatureId": "feature-1",
    "partId": "part-123",
    "operationId": "op-456"
  }'
```

#### Response

```json
{
  "success": true,
  "message": "Digital thread trace created",
  "trace": {
    "id": "trace-789",
    "cadModelUuid": "550e8400-e29b-41d4-a716-446655440000",
    "pmiFeatureId": "feature-1",
    "partId": "part-123",
    "operationId": "op-456",
    "createdAt": "2025-10-31T23:50:00Z"
  }
}
```

---

### 7. Get Digital Thread

**GET** `/digital-thread/:traceId`

Retrieve digital thread details including linked operation and quality characteristics.

#### Request

```bash
curl http://localhost:3001/api/v1/step-ap242/digital-thread/trace-789 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Response

```json
{
  "success": true,
  "trace": {
    "id": "trace-789",
    "cadModelUuid": "550e8400-e29b-41d4-a716-446655440000",
    "pmiFeatureId": "feature-1",
    "partId": "part-123",
    "operationId": "op-456",
    "measurementData": {
      "actualDiameter": 10.05
    },
    "asBuiltNominal": 10.0,
    "asBuiltActual": 10.05,
    "asBuiltDeviation": -0.05,
    "withinTolerance": true,
    "deviationStatus": "PASS",
    "part": {
      "id": "part-123",
      "partNumber": "PART-001",
      "partName": "Connector Assembly"
    },
    "operation": {
      "id": "op-456",
      "operationCode": "OP-010",
      "operationName": "Drilling"
    },
    "qualityCharacteristic": {
      "id": "char-123",
      "characteristic": "Hole Diameter",
      "specification": "10.0 ± 0.1 mm"
    },
    "createdAt": "2025-10-31T23:50:00Z",
    "verifiedAt": "2025-10-31T23:55:00Z"
  }
}
```

---

### 8. Create Model View State

**POST** `/model-view-state`

Save 3D model camera position and visibility state for a manufacturing operation.

#### Request

```json
POST /api/v1/step-ap242/model-view-state
Content-Type: application/json

{
  "modelUuid": "550e8400-e29b-41d4-a716-446655440000",
  "operationId": "op-456",
  "viewName": "Drilling Operation Setup",
  "cameraPosition": {
    "x": 10,
    "y": 20,
    "z": 30
  },
  "cameraTarget": {
    "x": 0,
    "y": 0,
    "z": 0
  },
  "cameraUp": {
    "x": 0,
    "y": 1,
    "z": 0
  },
  "fov": 45
}
```

#### Response

```json
{
  "success": true,
  "message": "Model view state created",
  "viewState": {
    "id": "view-1",
    "modelUuid": "550e8400-e29b-41d4-a716-446655440000",
    "operationId": "op-456",
    "viewName": "Drilling Operation Setup",
    "cameraPosition": { "x": 10, "y": 20, "z": 30 },
    "cameraTarget": { "x": 0, "y": 0, "z": 0 },
    "fov": 45,
    "createdAt": "2025-10-31T23:52:00Z"
  }
}
```

---

### 9. Get Operation View States

**GET** `/model-view-state/:operationId`

Retrieve all 3D view states for an operation.

#### Request

```bash
curl http://localhost:3001/api/v1/step-ap242/model-view-state/op-456 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Response

```json
{
  "success": true,
  "operationId": "op-456",
  "viewStates": [
    {
      "id": "view-1",
      "modelUuid": "550e8400-e29b-41d4-a716-446655440000",
      "viewName": "Drilling Operation Setup",
      "cameraPosition": { "x": 10, "y": 20, "z": 30 },
      "cameraTarget": { "x": 0, "y": 0, "z": 0 },
      "fov": 45,
      "createdAt": "2025-10-31T23:52:00Z"
    }
  ],
  "count": 1
}
```

---

### 10. Get Part Metadata

**GET** `/part/:partId/metadata`

Retrieve STEP AP242 metadata for a part.

#### Request

```bash
curl http://localhost:3001/api/v1/step-ap242/part/part-123/metadata \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Response

```json
{
  "success": true,
  "partId": "part-123",
  "metadata": {
    "stepAp242Uuid": "550e8400-e29b-41d4-a716-446655440000",
    "stepAp242FileUrl": "/uploads/step-files/model.step",
    "cadModelUuid": "550e8400-e29b-41d4-a716-446655440000",
    "cadSystemSource": "NX",
    "cadModelFormat": "STEP",
    "hasPMI": true,
    "pmiExtractionDate": "2025-10-31T23:46:30Z",
    "plmItemId": "ITEM-NX-001",
    "digitalThreadCount": 5,
    "lastSync": "2025-10-31T23:48:00Z"
  }
}
```

---

### 11. Register PLM System

**POST** `/plm/register`

Register and configure a PLM system connection.

#### Request

```json
POST /api/v1/step-ap242/plm/register
Content-Type: application/json

{
  "systemName": "Teamcenter",
  "baseUrl": "https://plm.company.com/tc",
  "apiVersion": "v12.3.0.15",
  "credentialsEncrypted": "enc_credentials_base64",
  "autoSync": true
}
```

#### Response

```json
{
  "success": true,
  "message": "PLM system Teamcenter registered",
  "system": {
    "systemName": "Teamcenter",
    "baseUrl": "https://plm.company.com/tc",
    "apiVersion": "v12.3.0.15",
    "autoSync": true
  }
}
```

---

### 12. Sync from PLM

**POST** `/plm/sync`

Synchronize STEP data from a PLM system.

#### Request

```bash
curl -X POST http://localhost:3001/api/v1/step-ap242/plm/sync \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "systemName": "Teamcenter",
    "plmItemId": "ITEM-NX-001"
  }'
```

#### Response

```json
{
  "success": true,
  "message": "Synced PLM item ITEM-NX-001 from Teamcenter",
  "syncedAt": "2025-10-31T23:56:00Z"
}
```

---

### 13. Verify Digital Thread

**POST** `/verify-digital-thread/:traceId`

Mark a digital thread as verified/approved.

#### Request

```bash
curl -X POST http://localhost:3001/api/v1/step-ap242/verify-digital-thread/trace-789 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "verifiedBy": "user-123"
  }'
```

#### Response

```json
{
  "success": true,
  "message": "Digital thread trace-789 verified",
  "verifiedAt": "2025-10-31T23:58:00Z",
  "verifiedBy": "user-123"
}
```

---

### 14. List Imports

**GET** `/imports`

List all STEP imports with optional filtering.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status: pending, processing, success, failed |
| `partId` | string | Filter by part ID |
| `limit` | number | Results per page (default: 20) |
| `offset` | number | Pagination offset (default: 0) |

#### Request

```bash
curl "http://localhost:3001/api/v1/step-ap242/imports?status=success&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Response

```json
{
  "success": true,
  "imports": [
    {
      "id": "import-12345",
      "fileName": "model.step",
      "status": "success",
      "stepUuid": "550e8400-e29b-41d4-a716-446655440000",
      "importedAt": "2025-10-31T23:45:00Z"
    }
  ],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "total": 25,
    "pages": 3
  }
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `NO_FILE` | 400 | No file provided in upload |
| `INVALID_FILE_FORMAT` | 400 | File format not supported |
| `MISSING_PARAMETERS` | 400 | Required parameters missing |
| `MISSING_STEP_UUID` | 400 | STEP UUID is required |
| `MISSING_PART_ID` | 400 | Part ID is required |
| `NOT_FOUND` | 404 | Resource not found |
| `PMI_EXTRACTION_FAILED` | 500 | PMI extraction error |
| `LINK_FAILED` | 500 | Failed to link STEP to part |
| `DIGITAL_THREAD_FAILED` | 500 | Digital thread creation failed |
| `PLM_REGISTRATION_FAILED` | 500 | PLM registration failed |
| `PLM_SYNC_FAILED` | 500 | PLM synchronization failed |
| `INTERNAL_ERROR` | 500 | Internal server error |

---

## Workflow Examples

### Complete STEP Integration Workflow

```bash
#!/bin/bash

# 1. Import STEP file
IMPORT_RESPONSE=$(curl -X POST http://localhost:3001/api/v1/step-ap242/import \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@model.step" \
  -F "partId=part-123" \
  -F "extractPMI=true" \
  -F "cadSystemSource=NX")

IMPORT_ID=$(echo $IMPORT_RESPONSE | jq -r '.importId')
STEP_UUID=$(echo $IMPORT_RESPONSE | jq -r '.stepUuid')

# 2. Extract PMI (if not done during import)
curl -X POST http://localhost:3001/api/v1/step-ap242/extract-pmi \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"stepUuid\": \"$STEP_UUID\"}"

# 3. Map PMI to quality characteristics
curl -X POST http://localhost:3001/api/v1/step-ap242/map-pmi-to-characteristics \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"partId\": \"part-123\"}"

# 4. Create digital thread for operation
THREAD_RESPONSE=$(curl -X POST http://localhost:3001/api/v1/step-ap242/digital-thread \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"cadModelUuid\": \"$STEP_UUID\", \"pmiFeatureId\": \"feature-1\", \"partId\": \"part-123\", \"operationId\": \"op-456\"}")

TRACE_ID=$(echo $THREAD_RESPONSE | jq -r '.trace.id')

# 5. Verify digital thread
curl -X POST http://localhost:3001/api/v1/step-ap242/verify-digital-thread/$TRACE_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"verifiedBy\": \"user-123\"}"
```

---

## Best Practices

1. **File Management**: Store STEP files in a centralized repository with version control
2. **PMI Validation**: Always validate extracted PMI before using in manufacturing
3. **Digital Thread Traceability**: Create digital threads for critical features only to reduce overhead
4. **PLM Sync**: Schedule automatic PLM synchronization during off-peak hours
5. **Error Handling**: Implement retry logic for transient failures
6. **Access Control**: Restrict STEP import and PLM configuration to authorized personnel

---

## Rate Limiting

- **Default:** 1000 requests per 15 minutes per IP address
- **File uploads:** 500 MB maximum file size
- **PMI extraction:** Timeout after 60 seconds for large files

---

## Related Documentation

- [STEP AP242 Schema Guide](./STEP_AP242_SCHEMA_ADDITIONS.md)
- [Type Definitions](../src/types/step-ap242.ts)
- [Service Implementation](../src/services/StepAp242Service.ts)

