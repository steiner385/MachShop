# ERP Integration API Reference

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Integration Management](#integration-management)
4. [Field Mapping](#field-mapping)
5. [Sync Jobs](#sync-jobs)
6. [Webhooks](#webhooks)
7. [Reconciliation](#reconciliation)
8. [Data Operations](#data-operations)
9. [Monitoring](#monitoring)
10. [Error Codes](#error-codes)
11. [Rate Limiting](#rate-limiting)
12. [WebSocket Events](#websocket-events)

## Overview

### Base URL
```
Production: https://api.machshop3.com/api/v1/erp
Staging: https://staging-api.machshop3.com/api/v1/erp
Development: http://localhost:3001/api/v1/erp
```

### API Versioning
The API uses URL versioning. Current version: `v1`

### Request Format
- **Content-Type**: `application/json`
- **Accept**: `application/json`
- **Encoding**: UTF-8

### Response Format
```json
{
  "success": true,
  "data": {},
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0"
  }
}
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERP001",
    "message": "Connection failed",
    "details": {},
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## Authentication

### API Key Authentication

**Header**: `X-API-Key`

```bash
curl -H "X-API-Key: your-api-key" \
  https://api.machshop3.com/api/v1/erp/integrations
```

### JWT Bearer Token

**Header**: `Authorization: Bearer <token>`

```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  https://api.machshop3.com/api/v1/erp/integrations
```

### OAuth 2.0

#### Get Access Token
```http
POST /auth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&
client_id=your_client_id&
client_secret=your_client_secret&
scope=erp:read erp:write
```

**Response**:
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "8xLOxBtZp8...",
  "scope": "erp:read erp:write"
}
```

## Integration Management

### List Integrations

```http
GET /integrations
```

**Query Parameters**:
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| limit | integer | Results per page | 20 |
| offset | integer | Skip records | 0 |
| status | string | Filter by status | all |
| erpSystem | string | Filter by ERP type | all |

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "int_123",
      "name": "sap-production",
      "erpSystem": "SAP",
      "status": "ACTIVE",
      "apiEndpoint": "https://sap.company.com/api",
      "lastSyncAt": "2024-01-15T09:00:00Z",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "total": 5,
    "limit": 20,
    "offset": 0
  }
}
```

### Get Integration Details

```http
GET /integrations/{integrationId}
```

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| integrationId | string | Integration ID |

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "int_123",
    "name": "sap-production",
    "erpSystem": "SAP",
    "description": "Production SAP integration",
    "status": "ACTIVE",
    "config": {
      "apiEndpoint": "https://sap.company.com/api",
      "apiVersion": "v4",
      "authMethod": "OAUTH2",
      "syncSchedule": {
        "suppliers": "0 2 * * *",
        "purchaseOrders": "*/30 * * * *"
      }
    },
    "statistics": {
      "totalSyncs": 1234,
      "successfulSyncs": 1200,
      "failedSyncs": 34,
      "lastSyncAt": "2024-01-15T09:00:00Z"
    }
  }
}
```

### Create Integration

```http
POST /integrations
```

**Request Body**:
```json
{
  "name": "oracle-production",
  "erpSystem": "ORACLE",
  "description": "Oracle Cloud ERP integration",
  "apiEndpoint": "https://oracle.company.com/api",
  "apiVersion": "v13",
  "authMethod": "OAUTH2",
  "clientId": "client_123",
  "clientSecret": "secret_456",
  "syncSchedule": {
    "enabled": true,
    "entities": {
      "suppliers": "0 2 * * *",
      "purchaseOrders": "*/15 * * * *"
    }
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "int_456",
    "name": "oracle-production",
    "status": "PENDING_ACTIVATION"
  }
}
```

### Update Integration

```http
PATCH /integrations/{integrationId}
```

**Request Body**:
```json
{
  "description": "Updated description",
  "syncSchedule": {
    "purchaseOrders": "*/10 * * * *"
  }
}
```

### Delete Integration

```http
DELETE /integrations/{integrationId}
```

**Response**:
```json
{
  "success": true,
  "message": "Integration deleted successfully"
}
```

### Test Connection

```http
POST /integrations/{integrationId}/test-connection
```

**Response**:
```json
{
  "success": true,
  "data": {
    "connected": true,
    "message": "Successfully connected to SAP",
    "responseTime": 245,
    "details": {
      "version": "S/4HANA 2023",
      "modules": ["MM", "PP", "QM"]
    }
  }
}
```

## Field Mapping

### List Field Mappings

```http
GET /field-mappings
```

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| integrationId | string | Filter by integration |
| entityType | string | Filter by entity type |

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "map_789",
      "integrationId": "int_123",
      "entityType": "PurchaseOrder",
      "mappings": [
        {
          "mesField": "poNumber",
          "erpField": "PO_NUMBER",
          "dataType": "string",
          "transformation": "value.toUpperCase()",
          "isRequired": true
        }
      ]
    }
  ]
}
```

### Create/Update Field Mapping

```http
PUT /field-mappings
```

**Request Body**:
```json
{
  "integrationId": "int_123",
  "entityType": "PurchaseOrder",
  "mappings": [
    {
      "mesField": "poNumber",
      "erpField": "PO_NUMBER",
      "dataType": "string",
      "transformation": "value.toUpperCase()",
      "isRequired": true
    },
    {
      "mesField": "vendorId",
      "erpField": "VENDOR_CODE",
      "dataType": "string",
      "transformation": "value.padStart(10, '0')",
      "isRequired": true
    }
  ]
}
```

### Test Field Mapping

```http
POST /field-mappings/test
```

**Request Body**:
```json
{
  "integrationId": "int_123",
  "entityType": "PurchaseOrder",
  "testData": {
    "poNumber": "po123",
    "vendorId": "v456"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "input": {
      "poNumber": "po123",
      "vendorId": "v456"
    },
    "output": {
      "PO_NUMBER": "PO123",
      "VENDOR_CODE": "0000000V456"
    },
    "validations": [
      {
        "field": "PO_NUMBER",
        "valid": true
      },
      {
        "field": "VENDOR_CODE",
        "valid": true
      }
    ]
  }
}
```

## Sync Jobs

### List Sync Jobs

```http
GET /sync-jobs
```

**Query Parameters**:
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| integrationId | string | Filter by integration | - |
| status | string | Filter by status | all |
| entityType | string | Filter by entity | all |
| startDate | datetime | Jobs after date | - |
| endDate | datetime | Jobs before date | - |
| limit | integer | Results per page | 20 |
| offset | integer | Skip records | 0 |

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "job_001",
      "integrationId": "int_123",
      "entityType": "PurchaseOrder",
      "status": "COMPLETED",
      "direction": "MES_TO_ERP",
      "startedAt": "2024-01-15T10:00:00Z",
      "completedAt": "2024-01-15T10:05:00Z",
      "recordsProcessed": 150,
      "recordsFailed": 2,
      "duration": 300
    }
  ]
}
```

### Get Sync Job Details

```http
GET /sync-jobs/{jobId}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "job_001",
    "integrationId": "int_123",
    "entityType": "PurchaseOrder",
    "status": "COMPLETED",
    "statistics": {
      "total": 150,
      "processed": 148,
      "failed": 2,
      "skipped": 0
    },
    "errors": [
      {
        "recordId": "PO123",
        "error": "Vendor not found",
        "timestamp": "2024-01-15T10:03:00Z"
      }
    ]
  }
}
```

### Execute Sync Job

```http
POST /sync-jobs/{integrationId}/execute
```

**Request Body**:
```json
{
  "entityTypes": ["PurchaseOrder", "Supplier"],
  "direction": "MES_TO_ERP",
  "filters": {
    "dateFrom": "2024-01-01",
    "dateTo": "2024-01-15",
    "status": "PENDING"
  },
  "options": {
    "batchSize": 50,
    "validateOnly": false,
    "forceUpdate": false
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "jobId": "job_002",
    "status": "IN_PROGRESS",
    "estimatedRecords": 250
  }
}
```

### Cancel Sync Job

```http
POST /sync-jobs/{jobId}/cancel
```

### Retry Failed Records

```http
POST /sync-jobs/{jobId}/retry
```

**Request Body**:
```json
{
  "recordIds": ["PO123", "PO456"],
  "retryAll": false
}
```

## Webhooks

### Webhook Event Types

```http
GET /webhooks/event-types
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "event": "sync.started",
      "description": "Sync job has started",
      "payload": {
        "jobId": "string",
        "entityType": "string",
        "integrationId": "string"
      }
    },
    {
      "event": "sync.completed",
      "description": "Sync job completed successfully"
    },
    {
      "event": "sync.failed",
      "description": "Sync job failed"
    }
  ]
}
```

### List Webhooks

```http
GET /webhooks/integrations/{integrationId}
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "wh_123",
      "url": "https://example.com/webhook",
      "eventTypes": ["sync.completed", "sync.failed"],
      "isActive": true,
      "description": "Production webhook",
      "lastDeliveryAt": "2024-01-15T10:00:00Z",
      "failureCount": 0
    }
  ]
}
```

### Create Webhook

```http
POST /webhooks/integrations/{integrationId}
```

**Request Body**:
```json
{
  "url": "https://example.com/webhook",
  "eventTypes": [
    "sync.started",
    "sync.completed",
    "sync.failed",
    "reconciliation.discrepancy_found"
  ],
  "description": "Production notifications",
  "secret": "webhook_secret_key"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "wh_456",
    "url": "https://example.com/webhook",
    "secret": "webhook_secret_key",
    "isActive": true
  }
}
```

### Update Webhook

```http
PATCH /webhooks/{webhookId}
```

**Request Body**:
```json
{
  "url": "https://new.example.com/webhook",
  "eventTypes": ["sync.completed"],
  "isActive": true
}
```

### Delete Webhook

```http
DELETE /webhooks/{webhookId}
```

### Test Webhook

```http
POST /webhooks/{webhookId}/test
```

**Response**:
```json
{
  "success": true,
  "data": {
    "delivered": true,
    "statusCode": 200,
    "responseTime": 145,
    "response": "OK"
  }
}
```

### Get Webhook Deliveries

```http
GET /webhooks/{webhookId}/deliveries
```

**Query Parameters**:
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| status | string | Filter by status | all |
| limit | integer | Results per page | 20 |

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "del_789",
      "webhookId": "wh_123",
      "eventType": "sync.completed",
      "status": "DELIVERED",
      "statusCode": 200,
      "attempts": 1,
      "deliveredAt": "2024-01-15T10:00:00Z",
      "responseTime": 125
    }
  ]
}
```

### Retry Webhook Delivery

```http
POST /webhooks/deliveries/{deliveryId}/retry
```

## Reconciliation

### Run Reconciliation

```http
POST /reconciliation/{integrationId}/run
```

**Request Body**:
```json
{
  "entityTypes": ["PurchaseOrder", "Supplier"],
  "dateRange": {
    "from": "2024-01-01",
    "to": "2024-01-15"
  },
  "options": {
    "includeDeleted": false,
    "strictMode": true
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "reconciliationId": "recon_123",
    "status": "IN_PROGRESS",
    "startedAt": "2024-01-15T10:00:00Z"
  }
}
```

### Get Reconciliation Status

```http
GET /reconciliation/{reconciliationId}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "recon_123",
    "status": "COMPLETED",
    "summary": {
      "totalRecords": 1000,
      "matchedRecords": 950,
      "discrepancies": 50,
      "missingInERP": 20,
      "missingInMES": 10,
      "valueMismatches": 20
    },
    "completedAt": "2024-01-15T10:15:00Z"
  }
}
```

### Get Discrepancies

```http
GET /reconciliation/{reconciliationId}/discrepancies
```

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | Filter by discrepancy type |
| entityType | string | Filter by entity |
| limit | integer | Results per page |

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "disc_001",
      "entityType": "PurchaseOrder",
      "entityId": "PO123",
      "type": "VALUE_MISMATCH",
      "field": "totalAmount",
      "mesValue": "1000.00",
      "erpValue": "999.99",
      "difference": "0.01"
    }
  ]
}
```

### Apply Corrections

```http
POST /reconciliation/{reconciliationId}/corrections
```

**Request Body**:
```json
{
  "corrections": [
    {
      "discrepancyId": "disc_001",
      "action": "UPDATE_ERP",
      "value": "1000.00"
    },
    {
      "discrepancyId": "disc_002",
      "action": "UPDATE_MES"
    }
  ],
  "options": {
    "validateBeforeApply": true,
    "createBackup": true
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "applied": 2,
    "failed": 0,
    "results": [
      {
        "discrepancyId": "disc_001",
        "status": "CORRECTED"
      }
    ]
  }
}
```

## Data Operations

### Sync Single Record

```http
POST /data/sync
```

**Request Body**:
```json
{
  "integrationId": "int_123",
  "entityType": "PurchaseOrder",
  "entityId": "PO123",
  "direction": "MES_TO_ERP",
  "force": false
}
```

### Bulk Import

```http
POST /data/import
```

**Request Body** (multipart/form-data):
- `file`: CSV or JSON file
- `integrationId`: Integration ID
- `entityType`: Entity type
- `options`: Import options (JSON)

**Response**:
```json
{
  "success": true,
  "data": {
    "importId": "imp_123",
    "status": "PROCESSING",
    "totalRecords": 500
  }
}
```

### Bulk Export

```http
GET /data/export
```

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| integrationId | string | Integration ID |
| entityType | string | Entity type |
| format | string | csv, json, excel |
| dateFrom | date | Start date |
| dateTo | date | End date |

**Response**: File download

### Query Data

```http
POST /data/query
```

**Request Body**:
```json
{
  "integrationId": "int_123",
  "entityType": "PurchaseOrder",
  "filters": {
    "status": "OPEN",
    "vendor": "VENDOR001",
    "dateRange": {
      "from": "2024-01-01",
      "to": "2024-01-15"
    }
  },
  "fields": ["poNumber", "vendorId", "totalAmount"],
  "sort": {
    "field": "createdAt",
    "order": "desc"
  },
  "pagination": {
    "limit": 50,
    "offset": 0
  }
}
```

## Monitoring

### Health Check

```http
GET /health
```

**Response**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 864000,
    "version": "1.0.0",
    "integrations": {
      "total": 5,
      "active": 4,
      "inactive": 1
    },
    "database": "connected",
    "cache": "connected",
    "queue": {
      "status": "operational",
      "pending": 12,
      "processing": 3
    }
  }
}
```

### Integration Health

```http
GET /integrations/{integrationId}/health
```

**Response**:
```json
{
  "success": true,
  "data": {
    "integrationId": "int_123",
    "status": "healthy",
    "connection": {
      "status": "connected",
      "lastCheck": "2024-01-15T10:00:00Z",
      "responseTime": 234
    },
    "syncStatus": {
      "lastSync": "2024-01-15T09:00:00Z",
      "nextSync": "2024-01-15T09:30:00Z",
      "queuedJobs": 0
    },
    "errorRate": 0.02,
    "successRate": 0.98
  }
}
```

### Metrics

```http
GET /metrics
```

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| integrationId | string | Filter by integration |
| period | string | 1h, 24h, 7d, 30d |
| metrics | array | Specific metrics |

**Response**:
```json
{
  "success": true,
  "data": {
    "period": "24h",
    "metrics": {
      "syncJobs": {
        "total": 48,
        "successful": 45,
        "failed": 3,
        "averageDuration": 300
      },
      "records": {
        "synced": 5000,
        "created": 1000,
        "updated": 3500,
        "deleted": 500
      },
      "webhooks": {
        "delivered": 150,
        "failed": 5,
        "averageResponseTime": 145
      },
      "errors": {
        "total": 25,
        "byType": {
          "CONNECTION": 5,
          "VALIDATION": 10,
          "TRANSFORMATION": 10
        }
      }
    }
  }
}
```

### Activity Log

```http
GET /activity
```

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| integrationId | string | Filter by integration |
| activityType | string | Filter by type |
| userId | string | Filter by user |
| startDate | datetime | Start date |
| endDate | datetime | End date |

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "act_123",
      "timestamp": "2024-01-15T10:00:00Z",
      "type": "INTEGRATION_CREATED",
      "userId": "user_456",
      "integrationId": "int_789",
      "details": {
        "name": "sap-production",
        "erpSystem": "SAP"
      }
    }
  ]
}
```

## Error Codes

### General Errors (ERP000-ERP099)

| Code | Message | Description |
|------|---------|-------------|
| ERP001 | Connection failed | Unable to connect to ERP system |
| ERP002 | Authentication failed | Invalid credentials or token |
| ERP003 | Invalid field mapping | Field mapping configuration error |
| ERP004 | Transformation error | Field transformation failed |
| ERP005 | Rate limit exceeded | Too many requests |
| ERP006 | Webhook delivery failed | Unable to deliver webhook |
| ERP007 | Timeout exceeded | Operation timed out |
| ERP008 | Validation error | Data validation failed |
| ERP009 | Reconciliation error | Reconciliation process failed |
| ERP010 | Queue overflow | Job queue is full |

### Integration Errors (ERP100-ERP199)

| Code | Message | Description |
|------|---------|-------------|
| ERP100 | Integration not found | Specified integration doesn't exist |
| ERP101 | Integration inactive | Integration is disabled |
| ERP102 | Invalid configuration | Integration configuration is invalid |
| ERP103 | Duplicate integration | Integration name already exists |

### Sync Errors (ERP200-ERP299)

| Code | Message | Description |
|------|---------|-------------|
| ERP200 | Sync job not found | Specified job doesn't exist |
| ERP201 | Sync already in progress | Another sync is running |
| ERP202 | Invalid entity type | Entity type not supported |
| ERP203 | No records to sync | No matching records found |

### Data Errors (ERP300-ERP399)

| Code | Message | Description |
|------|---------|-------------|
| ERP300 | Record not found | Specified record doesn't exist |
| ERP301 | Duplicate record | Record already exists |
| ERP302 | Invalid data format | Data format is incorrect |
| ERP303 | Required field missing | Required field is empty |

### System-Specific Errors (ERP400-ERP599)

| Code | Message | System | Description |
|------|---------|--------|-------------|
| ERP400 | Invalid PO format | Impact | Purchase order format invalid |
| ERP401 | Session expired | Impact | Impact session timeout |
| ERP450 | CSRF token invalid | SAP | SAP CSRF validation failed |
| ERP451 | Lock conflict | SAP | SAP record is locked |
| ERP500 | OAuth token expired | Oracle | Oracle OAuth token expired |
| ERP501 | Business validation failed | Oracle | Oracle business rule violation |

## Rate Limiting

### Rate Limit Headers

All API responses include rate limit information:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1642248000
X-RateLimit-Reset-After: 3600
```

### Rate Limits by Endpoint

| Endpoint Pattern | Limit | Window |
|-----------------|-------|--------|
| GET /integrations | 1000/hour | 1 hour |
| POST /sync-jobs/*/execute | 100/hour | 1 hour |
| POST /webhooks | 100/hour | 1 hour |
| POST /data/import | 10/hour | 1 hour |
| GET /data/export | 100/hour | 1 hour |
| * (default) | 5000/hour | 1 hour |

### Rate Limit Response

When rate limit is exceeded:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 3600

{
  "success": false,
  "error": {
    "code": "ERP005",
    "message": "Rate limit exceeded",
    "details": {
      "limit": 1000,
      "remaining": 0,
      "resetAt": "2024-01-15T11:00:00Z"
    }
  }
}
```

## WebSocket Events

### Connection

```javascript
const ws = new WebSocket('wss://api.machshop3.com/ws/erp');

ws.on('open', () => {
  // Authenticate
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'your-jwt-token'
  }));

  // Subscribe to events
  ws.send(JSON.stringify({
    type: 'subscribe',
    integrations: ['int_123'],
    events: ['sync.*', 'reconciliation.*']
  }));
});
```

### Event Types

```javascript
// Sync started
{
  "type": "sync.started",
  "data": {
    "jobId": "job_123",
    "integrationId": "int_456",
    "entityType": "PurchaseOrder"
  }
}

// Sync progress
{
  "type": "sync.progress",
  "data": {
    "jobId": "job_123",
    "processed": 50,
    "total": 100,
    "percentage": 50
  }
}

// Sync completed
{
  "type": "sync.completed",
  "data": {
    "jobId": "job_123",
    "success": true,
    "recordsProcessed": 100,
    "duration": 300
  }
}

// Error occurred
{
  "type": "error",
  "data": {
    "code": "ERP001",
    "message": "Connection failed",
    "integrationId": "int_456"
  }
}
```

## SDK Examples

### JavaScript/Node.js

```javascript
const ERPClient = require('@machshop3/erp-sdk');

const client = new ERPClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.machshop3.com'
});

// List integrations
const integrations = await client.integrations.list();

// Execute sync job
const job = await client.syncJobs.execute('int_123', {
  entityTypes: ['PurchaseOrder'],
  direction: 'MES_TO_ERP'
});

// Subscribe to events
client.on('sync.completed', (event) => {
  console.log('Sync completed:', event);
});
```

### Python

```python
from machshop3_erp import ERPClient

client = ERPClient(
    api_key='your-api-key',
    base_url='https://api.machshop3.com'
)

# List integrations
integrations = client.integrations.list()

# Execute sync job
job = client.sync_jobs.execute(
    'int_123',
    entity_types=['PurchaseOrder'],
    direction='MES_TO_ERP'
)

# Run reconciliation
reconciliation = client.reconciliation.run(
    'int_123',
    entity_types=['PurchaseOrder'],
    date_range={'from': '2024-01-01', 'to': '2024-01-15'}
)
```

### cURL

```bash
# List integrations
curl -X GET https://api.machshop3.com/api/v1/erp/integrations \
  -H "X-API-Key: your-api-key"

# Execute sync job
curl -X POST https://api.machshop3.com/api/v1/erp/sync-jobs/int_123/execute \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"entityTypes": ["PurchaseOrder"], "direction": "MES_TO_ERP"}'

# Create webhook
curl -X POST https://api.machshop3.com/api/v1/erp/webhooks/integrations/int_123 \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/webhook", "eventTypes": ["sync.completed"]}'
```

## API Versioning and Deprecation

### Version History

| Version | Status | Release Date | End of Life |
|---------|--------|--------------|-------------|
| v1 | Current | 2024-01-01 | - |
| v2 | Beta | 2024-07-01 | - |

### Deprecation Policy

- APIs are supported for minimum 12 months after deprecation announcement
- Deprecation warnings included in response headers
- Migration guides provided for breaking changes

### Deprecation Headers

```http
Sunset: Sat, 31 Dec 2024 23:59:59 GMT
Deprecation: true
Link: <https://docs.machshop3.com/migration>; rel="deprecation"
```

## Support

- **API Documentation**: https://docs.machshop3.com/api
- **SDK Downloads**: https://github.com/machshop3/erp-sdk
- **API Status**: https://status.machshop3.com
- **Support Portal**: https://support.machshop3.com
- **Developer Forum**: https://forum.machshop3.com/api

For API support, contact api-support@machshop3.com