# OSP Operations Management System - API Reference

**Issue #59: Core OSP/Farmout Operations Management System**

## Base URL

```
http://localhost:3000/api/v1
https://yourcompany.com/api/v1
```

## Authentication

All API endpoints require authentication via JWT Bearer token.

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/v1/osp/operations
```

## Response Format

All responses follow a standard JSON format:

```json
{
  "success": true,
  "data": { /* response data */ },
  "error": null,
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### Error Response

```json
{
  "success": false,
  "data": null,
  "error": "Error message describing what went wrong",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

## OSP Operations Endpoints

### Create OSP Operation

**POST** `/osp/operations`

Creates a new OSP operation for sending to an external supplier.

**Required Permissions**: `osp.operations.create`

**Request Body**:
```json
{
  "operationId": "op-123",
  "vendorId": "vendor-456",
  "quantitySent": 100,
  "requestedReturnDate": "2025-02-15T00:00:00Z",
  "inspectionRequired": true,
  "certificationRequired": ["ISO9001"],
  "notes": "Heat treat with temperature verification"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "osp-789",
    "ospNumber": "OSP-2025-00001",
    "operationId": "op-123",
    "vendorId": "vendor-456",
    "status": "PENDING_SHIPMENT",
    "quantitySent": 100,
    "quantityReceived": 0,
    "quantityAccepted": 0,
    "quantityRejected": 0,
    "estimatedCost": 5000.00,
    "actualCost": null,
    "requestedReturnDate": "2025-02-15T00:00:00Z",
    "inspectionRequired": true,
    "certificationRequired": ["ISO9001"],
    "notes": "Heat treat with temperature verification",
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

**Error Cases**:
- `400`: Missing required fields, invalid operation, or operation not OSP-capable
- `401`: Unauthorized
- `403`: Permission denied

---

### Get OSP Operation by ID

**GET** `/osp/operations/:ospId`

Retrieves a specific OSP operation by ID.

**Required Permissions**: `osp.operations.read`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "osp-789",
    "ospNumber": "OSP-2025-00001",
    "operationId": "op-123",
    "vendorId": "vendor-456",
    "status": "SHIPPED",
    "quantitySent": 100,
    "quantityReceived": 0,
    "quantityAccepted": 0,
    "quantityRejected": 0,
    "estimatedCost": 5000.00,
    "actualCost": null,
    "shippedDate": "2025-01-16T14:22:00Z",
    "requestedReturnDate": "2025-02-15T00:00:00Z",
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-16T14:22:00Z"
  }
}
```

---

### Update OSP Operation

**PUT** `/osp/operations/:ospId`

Updates an OSP operation with new information (quantities, costs, notes).

**Required Permissions**: `osp.operations.update`

**Request Body**:
```json
{
  "quantityReceived": 98,
  "quantityAccepted": 95,
  "quantityRejected": 3,
  "actualCost": 4850.00,
  "notes": "3 units had surface defects"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "osp-789",
    "ospNumber": "OSP-2025-00001",
    "quantityReceived": 98,
    "quantityAccepted": 95,
    "quantityRejected": 3,
    "actualCost": 4850.00,
    "costVariance": 150.00,
    "updatedAt": "2025-01-16T15:00:00Z"
  }
}
```

---

### List OSP Operations

**GET** `/osp/operations`

Retrieves a list of OSP operations with optional filtering.

**Required Permissions**: `osp.operations.read`

**Query Parameters**:
- `status` (optional): Filter by status (PENDING_SHIPMENT, SHIPPED, AT_SUPPLIER, IN_PROGRESS, INSPECTION, RECEIVED, ACCEPTED, REJECTED)
- `vendorId` (optional): Filter by supplier ID
- `workOrderId` (optional): Filter by work order ID
- `limit` (optional): Maximum number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Example**: `GET /osp/operations?status=INSPECTION&vendorId=vendor-456&limit=10`

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "osp-789",
      "ospNumber": "OSP-2025-00001",
      "operationId": "op-123",
      "vendorId": "vendor-456",
      "status": "INSPECTION",
      "quantitySent": 100,
      "quantityReceived": 100,
      "quantityAccepted": 0,
      "quantityRejected": 0,
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ],
  "total": 1
}
```

---

### Transition OSP Operation Status

**POST** `/osp/operations/:ospId/transition`

Transitions an OSP operation to the next status in the workflow.

**Required Permissions**: `osp.operations.manage`

**Request Body**:
```json
{
  "status": "SHIPPED"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "osp-789",
    "ospNumber": "OSP-2025-00001",
    "status": "SHIPPED",
    "shippedDate": "2025-01-16T14:22:00Z",
    "updatedAt": "2025-01-16T14:22:00Z"
  }
}
```

**Valid Transitions**:
- PENDING_SHIPMENT → SHIPPED
- SHIPPED → AT_SUPPLIER
- AT_SUPPLIER → IN_PROGRESS
- IN_PROGRESS → INSPECTION
- INSPECTION → RECEIVED
- RECEIVED → ACCEPTED or REJECTED

**Error**: `400` - Invalid status transition

---

### Cancel OSP Operation

**POST** `/osp/operations/:ospId/cancel`

Cancels an OSP operation (not allowed if ACCEPTED).

**Required Permissions**: `osp.operations.manage`

**Request Body**:
```json
{
  "reason": "Supplier unable to deliver on time"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "osp-789",
    "ospNumber": "OSP-2025-00001",
    "status": "CANCELLED",
    "cancelledAt": "2025-01-16T15:30:00Z",
    "notes": "Original notes\nCancelled: Supplier unable to deliver on time"
  }
}
```

---

## OSP Shipments Endpoints

### Create Shipment

**POST** `/osp/shipments`

Creates a new shipment for an OSP operation.

**Required Permissions**: `osp.shipments.create`

**Request Body**:
```json
{
  "ospOperationId": "osp-789",
  "shipmentType": "TO_SUPPLIER",
  "sendingVendorId": "vendor-internal",
  "receivingVendorId": "vendor-456",
  "quantity": 100,
  "shippingMethod": "Ground"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "shipment-123",
    "shipmentNumber": "SHP-202501-0001",
    "ospOperationId": "osp-789",
    "shipmentType": "TO_SUPPLIER",
    "status": "DRAFT",
    "quantity": 100,
    "shippingMethod": "Ground",
    "createdAt": "2025-01-16T10:00:00Z"
  }
}
```

---

### Get Shipment by ID

**GET** `/osp/shipments/:shipmentId`

Retrieves a specific shipment.

**Required Permissions**: `osp.shipments.read`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "shipment-123",
    "shipmentNumber": "SHP-202501-0001",
    "ospOperationId": "osp-789",
    "status": "SHIPPED",
    "trackingNumber": "FDX123456789",
    "carrierName": "FedEx",
    "shipDate": "2025-01-16T14:22:00Z",
    "estimatedDeliveryDate": "2025-01-20T00:00:00Z"
  }
}
```

---

### Update Shipment

**PUT** `/osp/shipments/:shipmentId`

Updates shipment information.

**Required Permissions**: `osp.shipments.update`

**Request Body**:
```json
{
  "status": "IN_TRANSIT",
  "trackingNumber": "FDX123456789",
  "carrierName": "FedEx",
  "notes": "In FedEx facility in Chicago"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "shipment-123",
    "shipmentNumber": "SHP-202501-0001",
    "status": "IN_TRANSIT",
    "trackingNumber": "FDX123456789",
    "carrierName": "FedEx",
    "updatedAt": "2025-01-16T15:00:00Z"
  }
}
```

---

### List Shipments

**GET** `/osp/shipments`

Retrieves a list of shipments with optional filtering.

**Required Permissions**: `osp.shipments.read`

**Query Parameters**:
- `status` (optional): Filter by status (DRAFT, RELEASED, SHIPPED, IN_TRANSIT, DELIVERED, RECEIVED)
- `ospOperationId` (optional): Filter by operation ID
- `vendorId` (optional): Filter by supplier ID
- `limit` (optional): Maximum results (default: 50)

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "shipment-123",
      "shipmentNumber": "SHP-202501-0001",
      "ospOperationId": "osp-789",
      "status": "IN_TRANSIT",
      "quantity": 100,
      "trackingNumber": "FDX123456789"
    }
  ],
  "total": 1
}
```

---

### Mark Shipment as Shipped

**POST** `/osp/shipments/:shipmentId/mark-shipped`

Records carrier pickup and tracking information.

**Required Permissions**: `osp.shipments.update`

**Request Body**:
```json
{
  "trackingNumber": "FDX123456789",
  "carrierName": "FedEx"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "shipment-123",
    "shipmentNumber": "SHP-202501-0001",
    "status": "SHIPPED",
    "trackingNumber": "FDX123456789",
    "carrierName": "FedEx",
    "shipDate": "2025-01-16T14:22:00Z"
  }
}
```

---

### Mark Shipment as Received

**POST** `/osp/shipments/:shipmentId/mark-received`

Records receipt of shipment at destination.

**Required Permissions**: `osp.shipments.update`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "shipment-123",
    "shipmentNumber": "SHP-202501-0001",
    "status": "RECEIVED",
    "actualDeliveryDate": "2025-01-20T10:15:00Z"
  }
}
```

---

### Track Shipment by Tracking Number

**GET** `/osp/shipments/track/:trackingNumber`

Retrieves shipment information by carrier tracking number.

**Required Permissions**: `osp.shipments.read`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "shipment-123",
    "shipmentNumber": "SHP-202501-0001",
    "ospOperationId": "osp-789",
    "trackingNumber": "FDX123456789",
    "carrierName": "FedEx",
    "status": "IN_TRANSIT",
    "estimatedDeliveryDate": "2025-01-20T00:00:00Z"
  }
}
```

---

## Supplier Performance Endpoints

### Record Performance Metrics

**POST** `/osp/suppliers/:vendorId/metrics`

Records supplier performance metrics for a specific period.

**Required Permissions**: `osp.performance.write`

**Request Body**:
```json
{
  "metricType": "MONTHLY",
  "periodStart": "2025-01-01T00:00:00Z",
  "periodEnd": "2025-01-31T23:59:59Z",
  "onTimePercentage": 95.5,
  "qualityPercentage": 98.0,
  "costVariancePercentage": 2.5
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "metric-456",
    "vendorId": "vendor-456",
    "metricType": "MONTHLY",
    "periodStart": "2025-01-01T00:00:00Z",
    "periodEnd": "2025-01-31T23:59:59Z",
    "onTimePercentage": 95.5,
    "qualityPercentage": 98.0,
    "costVariancePercentage": 2.5,
    "overallScore": 94.8,
    "createdAt": "2025-02-01T00:00:00Z"
  }
}
```

---

### Get Supplier Metrics

**GET** `/osp/suppliers/:vendorId/metrics`

Retrieves all performance metrics for a supplier.

**Required Permissions**: `osp.performance.read`

**Query Parameters**:
- `limit` (optional): Maximum results

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "metric-456",
      "vendorId": "vendor-456",
      "metricType": "MONTHLY",
      "periodStart": "2025-01-01T00:00:00Z",
      "onTimePercentage": 95.5,
      "qualityPercentage": 98.0,
      "costVariancePercentage": 2.5,
      "overallScore": 94.8
    }
  ]
}
```

---

### Get Supplier Performance Scorecard

**GET** `/osp/suppliers/:vendorId/scorecard`

Retrieves aggregated performance scorecard for a supplier.

**Required Permissions**: `osp.performance.read`

**Query Parameters**:
- `months` (optional): Number of months to include (default: 12)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "vendorId": "vendor-456",
    "vendorName": "Acme Heat Treat",
    "monthsCovered": 12,
    "averageOnTimePercentage": 94.2,
    "averageQualityPercentage": 96.8,
    "averageCostVariancePercentage": 1.5,
    "overallAverageScore": 94.3,
    "monthlyMetrics": [
      {
        "month": "2025-01",
        "onTimePercentage": 95.5,
        "qualityPercentage": 98.0,
        "costVariancePercentage": 2.5,
        "overallScore": 94.8
      }
    ]
  }
}
```

---

### Get Supplier Rankings

**GET** `/osp/suppliers/rankings`

Retrieves ranked list of suppliers by overall performance score.

**Required Permissions**: `osp.performance.read`

**Query Parameters**:
- `limit` (optional): Maximum number of suppliers (default: 50)

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "vendorId": "vendor-456",
      "vendorName": "Acme Heat Treat",
      "overallScore": 94.8,
      "onTimePercentage": 95.5,
      "qualityPercentage": 98.0,
      "costVariancePercentage": 2.5
    },
    {
      "rank": 2,
      "vendorId": "vendor-789",
      "vendorName": "Best Plating Inc",
      "overallScore": 92.1,
      "onTimePercentage": 90.0,
      "qualityPercentage": 94.5,
      "costVariancePercentage": 1.0
    }
  ]
}
```

---

### Calculate Metrics from Operations

**POST** `/osp/suppliers/:vendorId/calculate-metrics`

Automatically calculates performance metrics from completed operations for a period.

**Required Permissions**: `osp.performance.write`

**Request Body**:
```json
{
  "metricType": "MONTHLY",
  "periodStart": "2025-01-01T00:00:00Z",
  "periodEnd": "2025-01-31T23:59:59Z"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "vendorId": "vendor-456",
    "metricType": "MONTHLY",
    "periodStart": "2025-01-01T00:00:00Z",
    "periodEnd": "2025-01-31T23:59:59Z",
    "onTimePercentage": 95.5,
    "qualityPercentage": 98.0,
    "costVariancePercentage": 2.5,
    "overallScore": 94.8,
    "operationsAnalyzed": 45,
    "message": "Metrics calculated from 45 completed operations"
  }
}
```

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid request data |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 500 | Server Error - Internal server error |

---

## Common Error Messages

```json
{
  "success": false,
  "error": "Operation not found"
}
```

```json
{
  "success": false,
  "error": "Invalid status transition from PENDING_SHIPMENT to INSPECTION"
}
```

```json
{
  "success": false,
  "error": "Missing required field: vendorId"
}
```

---

## Example Usage

### Create and Track an OSP Operation

```bash
# 1. Create operation
curl -X POST http://localhost:3000/api/v1/osp/operations \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operationId": "op-123",
    "vendorId": "vendor-456",
    "quantitySent": 100,
    "requestedReturnDate": "2025-02-15T00:00:00Z"
  }'

# 2. Create shipment
curl -X POST http://localhost:3000/api/v1/osp/shipments \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ospOperationId": "osp-789",
    "shipmentType": "TO_SUPPLIER",
    "sendingVendorId": "vendor-internal",
    "receivingVendorId": "vendor-456",
    "quantity": 100,
    "shippingMethod": "Ground"
  }'

# 3. Mark as shipped
curl -X POST http://localhost:3000/api/v1/osp/shipments/shipment-123/mark-shipped \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "trackingNumber": "FDX123456789",
    "carrierName": "FedEx"
  }'

# 4. Track shipment
curl http://localhost:3000/api/v1/osp/shipments/track/FDX123456789 \
  -H "Authorization: Bearer JWT_TOKEN"
```

---

**Last Updated**: November 1, 2025
**Version**: 1.0.0
**Issue Reference**: #59
