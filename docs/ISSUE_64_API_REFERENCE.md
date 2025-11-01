# Material Movement & Logistics Management System - API Reference
**Issue #64**

## Authentication

All API endpoints require Bearer token authentication. Include the token in the `Authorization` header:

```
Authorization: Bearer YOUR_API_TOKEN
```

## Base URL

```
https://api.yourcompany.com/api/v1
```

## Response Format

All responses follow a consistent JSON format:

### Success Response (200, 201)
```json
{
  "id": "resource-id",
  "data": {...},
  "message": "Operation successful",
  "timestamp": "2024-11-01T10:30:00Z"
}
```

### List Response (200)
```json
{
  "data": [...],
  "count": 10,
  "total": 50,
  "page": 1,
  "limit": 10,
  "hasMore": true
}
```

### Error Response (400, 500)
```json
{
  "error": "ERROR_CODE",
  "message": "Human readable error message",
  "details": {...},
  "timestamp": "2024-11-01T10:30:00Z"
}
```

## Material Movement Endpoints

### Create Movement
```http
POST /movements/create
Content-Type: application/json
Authorization: Bearer {token}

{
  "fromLocation": "Warehouse A",
  "toLocation": "Warehouse B",
  "materialId": "MAT-001",
  "quantity": 50,
  "movedBy": "operator-1",
  "movementType": "TRANSFER",
  "notes": "Optional notes"
}
```

**Response (201):**
```json
{
  "id": "mov-abc123",
  "erpMovementNumber": "MOV-2024-0001",
  "status": "REQUESTED",
  "fromLocation": "Warehouse A",
  "toLocation": "Warehouse B",
  "materialId": "MAT-001",
  "quantity": 50,
  "createdAt": "2024-11-01T10:30:00Z"
}
```

**Error Codes:**
- `VALIDATION_ERROR` - Missing or invalid fields
- `LOCATION_NOT_FOUND` - Source or destination location doesn't exist
- `MATERIAL_NOT_FOUND` - Material ID doesn't exist
- `INSUFFICIENT_QUANTITY` - Not enough material available

---

### Get Movement
```http
GET /movements/:movementId
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "id": "mov-abc123",
  "erpMovementNumber": "MOV-2024-0001",
  "status": "APPROVED",
  "fromLocation": "Warehouse A",
  "toLocation": "Warehouse B",
  "materialId": "MAT-001",
  "quantity": 50,
  "movedBy": "operator-1",
  "approvedBy": "supervisor-1",
  "approvedAt": "2024-11-01T11:00:00Z",
  "createdAt": "2024-11-01T10:30:00Z",
  "updatedAt": "2024-11-01T11:00:00Z"
}
```

---

### List Movements
```http
GET /movements?status=APPROVED&location=Warehouse A&limit=10&offset=0&sort=createdAt&order=DESC
Authorization: Bearer {token}
```

**Query Parameters:**
- `status` - Filter by movement status (REQUESTING, APPROVED, IN_TRANSIT, COMPLETED, CANCELLED)
- `location` - Filter by source location
- `limit` - Max results (default: 10, max: 100)
- `offset` - Pagination offset (default: 0)
- `sort` - Sort field (createdAt, updatedAt, quantity)
- `order` - Sort order (ASC, DESC)

**Response (200):**
```json
{
  "data": [
    {
      "id": "mov-abc123",
      "status": "APPROVED",
      "fromLocation": "Warehouse A",
      "toLocation": "Warehouse B",
      "quantity": 50,
      "createdAt": "2024-11-01T10:30:00Z"
    }
  ],
  "count": 10,
  "total": 50,
  "page": 1,
  "hasMore": true
}
```

---

### Update Movement
```http
PUT /movements/:movementId
Content-Type: application/json
Authorization: Bearer {token}

{
  "toLocation": "Warehouse C",
  "notes": "Updated destination"
}
```

**Response (200):** Updated movement object

---

### Approve Movement
```http
POST /movements/:movementId/approve
Content-Type: application/json
Authorization: Bearer {token}

{
  "approvedBy": "supervisor-1"
}
```

**Response (200):** Updated movement with status = APPROVED

**Error Codes:**
- `INVALID_STATUS` - Movement not in REQUESTING status
- `UNAUTHORIZED` - User lacks approval permission

---

### Transition Status
```http
POST /movements/:movementId/transition
Content-Type: application/json
Authorization: Bearer {token}

{
  "newStatus": "IN_TRANSIT",
  "transitionedBy": "operator-1"
}
```

**Valid Transitions:**
- REQUESTING → APPROVED
- APPROVED → ASSIGNED
- ASSIGNED → IN_TRANSIT
- IN_TRANSIT → AT_LOCATION
- AT_LOCATION → COMPLETED
- (Any) → CANCELLED

**Response (200):** Updated movement

---

### Cancel Movement
```http
POST /movements/:movementId/cancel
Content-Type: application/json
Authorization: Bearer {token}

{
  "reason": "Equipment breakdown",
  "cancelledBy": "supervisor-1"
}
```

**Response (200):** Updated movement with status = CANCELLED

---

### Update Tracking
```http
POST /movements/:movementId/tracking
Content-Type: application/json
Authorization: Bearer {token}

{
  "currentLocation": "In Transit - Highway 95",
  "trackingData": {
    "gps": {
      "latitude": 40.7128,
      "longitude": -74.0060
    },
    "temperature": 22,
    "humidity": 45
  },
  "updatedBy": "operator-1"
}
```

**Response (200):** Updated movement with tracking data

---

## Container Endpoints

### Create Container
```http
POST /movements/containers/create
Content-Type: application/json
Authorization: Bearer {token}

{
  "containerNumber": "CONT-001",
  "containerType": "Tote",
  "size": "Large",
  "capacity": 100,
  "currentLocation": "Warehouse A",
  "status": "EMPTY"
}
```

**Response (201):** Created container object

---

### Get Container
```http
GET /movements/containers/:containerId
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "id": "cont-abc123",
  "containerNumber": "CONT-001",
  "containerType": "Tote",
  "size": "Large",
  "status": "LOADED",
  "currentLocation": "Warehouse A",
  "capacity": 100,
  "currentQuantity": 75,
  "currentContents": ["PART-123", "PART-456"],
  "utilizationPercent": 75,
  "createdAt": "2024-11-01T09:00:00Z",
  "updatedAt": "2024-11-01T10:30:00Z"
}
```

---

### Load Container
```http
POST /movements/containers/:containerId/load
Content-Type: application/json
Authorization: Bearer {token}

{
  "partNumbers": ["PART-123", "PART-456"],
  "quantity": 50,
  "loadedBy": "operator-1"
}
```

**Response (200):** Updated container

**Error Codes:**
- `CAPACITY_EXCEEDED` - Quantity exceeds container capacity
- `CONTAINER_NOT_FOUND` - Container doesn't exist
- `INVALID_STATUS` - Container in wrong status (e.g., IN_TRANSIT)

---

### Unload Container
```http
POST /movements/containers/:containerId/unload
Content-Type: application/json
Authorization: Bearer {token}

{
  "quantity": 25,
  "targetLocation": "Warehouse B",
  "unloadedBy": "operator-1"
}
```

**Response (200):** Updated container

---

### Transfer Container
```http
POST /movements/containers/:containerId/transfer
Content-Type: application/json
Authorization: Bearer {token}

{
  "toLocation": "Warehouse B",
  "transferredBy": "operator-1"
}
```

**Response (200):** Updated container with new location

---

### Get Container History
```http
GET /movements/containers/:containerId/history
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "move-xyz789",
      "containerId": "cont-abc123",
      "fromLocation": "Warehouse A",
      "toLocation": "Warehouse B",
      "timestamp": "2024-11-01T10:30:00Z",
      "movedBy": "operator-1",
      "reason": "Transfer to customer"
    }
  ],
  "count": 5
}
```

---

### Get Container Utilization
```http
GET /movements/containers/:containerId/utilization
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "containerId": "cont-abc123",
  "utilizationPercent": 75,
  "currentQuantity": 75,
  "capacity": 100,
  "efficiency": 0.95,
  "lastUpdated": "2024-11-01T10:30:00Z"
}
```

---

## Forklift Endpoints

### Create Forklift
```http
POST /movements/forklifts/create
Content-Type: application/json
Authorization: Bearer {token}

{
  "forkliftNumber": "FL-001",
  "model": "Toyota 8FGUN25",
  "maxCapacity": 2500,
  "assignedSite": "Main Warehouse",
  "status": "AVAILABLE"
}
```

**Response (201):** Created forklift object

---

### Get Forklift
```http
GET /movements/forklifts/:forkliftId
Authorization: Bearer {token}
```

**Response (200):** Forklift details with current status and assignment

---

### List Forklifts by Site
```http
GET /movements/forklifts/site/:siteId
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "fl-abc123",
      "forkliftNumber": "FL-001",
      "status": "AVAILABLE",
      "assignedOperator": "op-xyz789",
      "currentLocation": "Warehouse A",
      "lastMaintenanceDate": "2024-10-15"
    }
  ],
  "count": 5
}
```

---

### Update Forklift
```http
PUT /movements/forklifts/:forkliftId
Content-Type: application/json
Authorization: Bearer {token}

{
  "status": "MAINTENANCE",
  "maintenanceReason": "Oil change",
  "estimatedReturnDate": "2024-11-02T17:00:00Z"
}
```

**Response (200):** Updated forklift

---

### Assign Operator
```http
POST /movements/forklifts/:forkliftId/assign
Content-Type: application/json
Authorization: Bearer {token}

{
  "operatorId": "op-123",
  "assignedBy": "supervisor-1"
}
```

**Response (200):** Updated forklift with operator assignment

---

## Webhook Endpoints

### Shipment Status Update
```http
POST /webhooks/shipments/status
Content-Type: application/json
X-Webhook-Signature: sha256=...

{
  "erpShipmentNumber": "SHP-2024-001234",
  "erpOrderNumber": "ORD-2024-5678",
  "status": "SHIPPED",
  "statusReason": "Left warehouse",
  "trackingNumber": "1Z999AA10123456784",
  "carrier": "FedEx",
  "estimatedDeliveryDate": "2024-11-05T18:00:00Z",
  "containerIds": ["CONT-001", "CONT-002"],
  "lastUpdateTime": "2024-11-01T10:30:00Z",
  "updateSource": "ERP"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Shipment status updated successfully",
  "shipmentId": "ship-abc123",
  "previousStatus": "PENDING",
  "newStatus": "SHIPPED"
}
```

---

### Tracking Update
```http
POST /webhooks/shipments/tracking
Content-Type: application/json

{
  "shipmentId": "ship-abc123",
  "trackingNumber": "1Z999AA10123456784",
  "carrier": "FedEx",
  "lastLocation": "Memphis, TN Distribution Center",
  "lastUpdateTime": "2024-11-01T14:30:00Z",
  "estimatedDeliveryDate": "2024-11-03T17:00:00Z"
}
```

**Response (200):** Tracking update confirmation

---

### Delivery Confirmation
```http
POST /webhooks/shipments/delivered
Content-Type: application/json

{
  "shipmentId": "ship-abc123",
  "containerIds": ["CONT-001", "CONT-002"],
  "deliveryTime": "2024-11-03T15:45:00Z",
  "receivedBy": "John Doe",
  "location": "Warehouse A, Receiving Dock",
  "signatureRequired": true,
  "comments": "Delivered in good condition"
}
```

**Response (200):** Delivery confirmation

---

### Exception/Delay Notification
```http
POST /webhooks/shipments/exception
Content-Type: application/json

{
  "shipmentId": "ship-abc123",
  "exceptionType": "DELAY",
  "reason": "Vehicle breakdown, rerouting to alternate location",
  "revisedDeliveryDate": "2024-11-05T18:00:00Z"
}
```

**Response (200):** Exception handling confirmation

---

### Container Receipt
```http
POST /webhooks/containers/received
Content-Type: application/json

{
  "containerId": "CONT-001",
  "location": "Warehouse A, Bay 5",
  "receivedBy": "Jane Smith",
  "receiptTime": "2024-11-01T10:15:00Z"
}
```

**Response (200):** Receipt confirmation

---

### Webhook History
```http
GET /webhooks/history?eventType=shipment:status_updated&sourceSystem=ERP&fromDate=2024-10-01&toDate=2024-11-01&limit=50
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "event-123",
      "eventType": "shipment:status_updated",
      "sourceSystem": "ERP",
      "status": "success",
      "payload": {...},
      "timestamp": "2024-11-01T10:30:00Z"
    }
  ],
  "count": 50,
  "total": 245
}
```

---

### Webhook Statistics
```http
GET /webhooks/stats?timeRangeHours=24
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "timeRangeHours": 24,
  "totalEvents": 1250,
  "successfulEvents": 1235,
  "failedEvents": 15,
  "successRate": 98.8,
  "averageResponseTime": 245,
  "eventsByType": {
    "shipment:status_updated": 500,
    "tracking:updated": 400,
    "delivery:confirmed": 350
  }
}
```

---

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `VALIDATION_ERROR` | 400 | Missing or invalid request fields |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication token |
| `FORBIDDEN` | 403 | User lacks permission for operation |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Operation conflicts with resource state |
| `RATE_LIMITED` | 429 | Too many requests, retry after delay |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `INVALID_SIGNATURE` | 401 | Webhook signature verification failed |
| `INVALID_SOURCE` | 403 | Webhook source not in whitelist |

---

## Rate Limiting

API requests are rate limited to prevent abuse:
- **Standard Limit**: 1000 requests per hour per API key
- **Burst Limit**: 100 requests per minute
- **Rate Limit Headers**:
  - `X-RateLimit-Limit` - Total requests allowed
  - `X-RateLimit-Remaining` - Requests remaining
  - `X-RateLimit-Reset` - Unix timestamp when limit resets

---

## Examples

See `ISSUE_64_MATERIAL_MOVEMENT_GUIDE.md` for more examples and use cases.
