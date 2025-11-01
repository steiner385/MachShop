---
sidebar_position: 2
title: Work Orders API
description: Create, read, update, and manage work orders
---

# Work Orders API

Work Orders represent manufacturing tasks that need to be completed. Each work order contains operations, quality requirements, and material allocations.

## List Work Orders

Get a paginated list of work orders.

**Endpoint:** `GET /work-orders`

**Parameters:**
- `page` (number) - Page number (default: 1)
- `limit` (number) - Items per page (default: 20, max: 100)
- `status` (string) - Filter by status: OPEN, IN_PROGRESS, COMPLETED, CANCELLED, PAUSED
- `sort` (string) - Sort by field, prefix with `-` for descending

**Request:**

```bash
curl "https://api.mes.company.com/api/v2/work-orders?page=1&limit=20&status=IN_PROGRESS" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**

```json
{
  "data": [
    {
      "id": "wo-123",
      "orderNumber": "WO-2024-001",
      "status": "IN_PROGRESS",
      "product": "Widget A",
      "quantity": 100,
      "completedQuantity": 45,
      "priority": "HIGH",
      "dueDate": "2024-01-25T00:00:00Z",
      "startDate": "2024-01-15T08:00:00Z",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T11:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "hasMore": true
  }
}
```

## Get Work Order

Get a specific work order by ID.

**Endpoint:** `GET /work-orders/{id}`

**Request:**

```bash
curl "https://api.mes.company.com/api/v2/work-orders/wo-123" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**

```json
{
  "data": {
    "id": "wo-123",
    "orderNumber": "WO-2024-001",
    "status": "IN_PROGRESS",
    "product": "Widget A",
    "quantity": 100,
    "completedQuantity": 45,
    "priority": "HIGH",
    "customer": "Customer Corp",
    "dueDate": "2024-01-25T00:00:00Z",
    "startDate": "2024-01-15T08:00:00Z",
    "estimatedCompletionDate": "2024-01-22T00:00:00Z",
    "notes": "Rush order - expedite processing",
    "operationIds": ["op-456", "op-457", "op-458"],
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T11:00:00Z"
  }
}
```

## Create Work Order

Create a new work order.

**Endpoint:** `POST /work-orders`

**Request Body:**

```json
{
  "orderNumber": "WO-2024-NEW",
  "product": "Widget B",
  "quantity": 50,
  "priority": "NORMAL",
  "customer": "Customer Corp",
  "dueDate": "2024-02-01T00:00:00Z",
  "notes": "Standard order"
}
```

**Request:**

```bash
curl -X POST "https://api.mes.company.com/api/v2/work-orders" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "orderNumber": "WO-2024-NEW",
    "product": "Widget B",
    "quantity": 50,
    "priority": "NORMAL",
    "dueDate": "2024-02-01T00:00:00Z"
  }'
```

**Response (201 Created):**

```json
{
  "data": {
    "id": "wo-999",
    "orderNumber": "WO-2024-NEW",
    "status": "OPEN",
    "product": "Widget B",
    "quantity": 50,
    "completedQuantity": 0,
    "priority": "NORMAL",
    "dueDate": "2024-02-01T00:00:00Z",
    "createdAt": "2024-01-15T15:30:00Z",
    "updatedAt": "2024-01-15T15:30:00Z"
  }
}
```

## Update Work Order

Update an existing work order.

**Endpoint:** `PUT /work-orders/{id}`

**Request Body:**

```json
{
  "status": "PAUSED",
  "notes": "Waiting for material delivery"
}
```

**Request:**

```bash
curl -X PUT "https://api.mes.company.com/api/v2/work-orders/wo-123" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "PAUSED",
    "notes": "Waiting for material"
  }'
```

**Response:**

```json
{
  "data": {
    "id": "wo-123",
    "orderNumber": "WO-2024-001",
    "status": "PAUSED",
    "notes": "Waiting for material",
    "updatedAt": "2024-01-15T16:00:00Z"
  }
}
```

## Start Work Order

Begin processing a work order.

**Endpoint:** `POST /work-orders/{id}/start`

**Request:**

```bash
curl -X POST "https://api.mes.company.com/api/v2/work-orders/wo-123/start" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**

```json
{
  "data": {
    "id": "wo-123",
    "status": "IN_PROGRESS",
    "startDate": "2024-01-15T16:00:00Z",
    "updatedAt": "2024-01-15T16:00:00Z"
  }
}
```

## Complete Work Order

Mark a work order as completed.

**Endpoint:** `POST /work-orders/{id}/complete`

**Request Body:**

```json
{
  "completedQuantity": 100,
  "notes": "Production complete"
}
```

**Request:**

```bash
curl -X POST "https://api.mes.company.com/api/v2/work-orders/wo-123/complete" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "completedQuantity": 100,
    "notes": "Production complete"
  }'
```

**Response:**

```json
{
  "data": {
    "id": "wo-123",
    "status": "COMPLETED",
    "completedQuantity": 100,
    "completionDate": "2024-01-22T14:30:00Z",
    "updatedAt": "2024-01-22T14:30:00Z"
  }
}
```

## Delete Work Order

Delete a work order (only if not in progress).

**Endpoint:** `DELETE /work-orders/{id}`

**Request:**

```bash
curl -X DELETE "https://api.mes.company.com/api/v2/work-orders/wo-123" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response (204 No Content):**

```
[No response body]
```

## Work Order Statuses

| Status | Description |
|--------|-------------|
| `OPEN` | Created but not started |
| `IN_PROGRESS` | Currently being processed |
| `COMPLETED` | Finished successfully |
| `CANCELLED` | Cancelled and will not be completed |
| `PAUSED` | Temporarily stopped |
| `ON_HOLD` | Waiting for approval or resources |

## Work Order Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `orderNumber` | string | Human-readable order number |
| `status` | string | Current status (OPEN, IN_PROGRESS, etc.) |
| `product` | string | Product name or SKU |
| `quantity` | number | Quantity to produce |
| `completedQuantity` | number | Quantity completed |
| `priority` | string | Priority level (LOW, NORMAL, HIGH, CRITICAL) |
| `dueDate` | string | ISO 8601 date |
| `startDate` | string | When production started |
| `completionDate` | string | When production completed |
| `customer` | string | Customer name |
| `notes` | string | Additional notes |
| `createdAt` | string | Creation timestamp |
| `updatedAt` | string | Last update timestamp |

## Code Examples

### JavaScript

```typescript
import fetch from 'node-fetch';

const apiKey = process.env.MES_API_KEY;

// List work orders
const listResponse = await fetch(
  'https://api.mes.company.com/api/v2/work-orders?status=IN_PROGRESS',
  {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  }
);
const list = await listResponse.json();

// Create work order
const createResponse = await fetch(
  'https://api.mes.company.com/api/v2/work-orders',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      orderNumber: 'WO-2024-NEW',
      product: 'Widget',
      quantity: 100,
      priority: 'HIGH',
      dueDate: '2024-02-01T00:00:00Z'
    })
  }
);
const created = await createResponse.json();
```

### Python

```python
import requests

api_key = os.getenv('MES_API_KEY')
base_url = 'https://api.mes.company.com/api/v2'

# List work orders
response = requests.get(
    f'{base_url}/work-orders',
    params={'status': 'IN_PROGRESS'},
    headers={'Authorization': f'Bearer {api_key}'}
)
work_orders = response.json()

# Create work order
response = requests.post(
    f'{base_url}/work-orders',
    headers={
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    },
    json={
        'orderNumber': 'WO-2024-NEW',
        'product': 'Widget',
        'quantity': 100,
        'priority': 'HIGH',
        'dueDate': '2024-02-01T00:00:00Z'
    }
)
created = response.json()
```

### C#

```csharp
using System.Net.Http;
using System.Text;
using Newtonsoft.Json;

var client = new HttpClient();
client.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");

// List work orders
var response = await client.GetAsync(
    "https://api.mes.company.com/api/v2/work-orders?status=IN_PROGRESS"
);
var content = await response.Content.ReadAsStringAsync();

// Create work order
var newOrder = new {
    orderNumber = "WO-2024-NEW",
    product = "Widget",
    quantity = 100,
    priority = "HIGH",
    dueDate = "2024-02-01T00:00:00Z"
};

var json = JsonConvert.SerializeObject(newOrder);
var request = new StringContent(json, Encoding.UTF8, "application/json");
var createResponse = await client.PostAsync(
    "https://api.mes.company.com/api/v2/work-orders",
    request
);
```

## Error Responses

### 400 Bad Request

Invalid input or validation error.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "field": "quantity",
      "reason": "MUST_BE_POSITIVE"
    }
  }
}
```

### 404 Not Found

Work order doesn't exist.

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Work order not found"
  }
}
```

### 409 Conflict

Work order cannot be moved to requested state.

```json
{
  "error": {
    "code": "INVALID_STATE_TRANSITION",
    "message": "Cannot start work order that is already completed"
  }
}
```

## Related Documentation

- [Making Requests](../getting-started/making-requests.md) - Pagination, filtering, sorting
- [Error Handling](../guides/error-handling.md) - How to handle API errors
- [Webhooks](../webhooks/overview.md) - Real-time work order notifications
- [Operations API](./operations.md) - Operations within work orders

---

**Need help?** [Email support](mailto:developers@mes.company.com)
