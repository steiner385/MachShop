---
sidebar_position: 4
title: Making Requests
description: How to make HTTP requests to the MES API
---

# Making Requests

Learn how to structure API requests to the MES API.

## Base URL

All API requests use the base URL:

```
https://api.mes.company.com/api/v2/
```

## HTTP Methods

| Method | Purpose |
|--------|---------|
| `GET` | Retrieve data |
| `POST` | Create new resource |
| `PUT` | Update entire resource |
| `PATCH` | Partially update resource |
| `DELETE` | Delete resource |

## Request Format

All requests must include standard HTTP headers:

```bash
curl -X GET https://api.mes.company.com/api/v2/work-orders \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json"
```

## Request Parameters

### Path Parameters

```bash
# Get a specific work order by ID
curl https://api.mes.company.com/api/v2/work-orders/wo-123 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Query Parameters

```bash
# Pagination
curl "https://api.mes.company.com/api/v2/work-orders?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_API_KEY"

# Filtering
curl "https://api.mes.company.com/api/v2/work-orders?status=IN_PROGRESS" \
  -H "Authorization: Bearer YOUR_API_KEY"

# Sorting
curl "https://api.mes.company.com/api/v2/work-orders?sort=-createdAt" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Request Body

For POST and PUT requests, include JSON body:

```bash
curl -X POST https://api.mes.company.com/api/v2/work-orders \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "orderNumber": "WO-2024-001",
    "product": "Widget A",
    "quantity": 100,
    "dueDate": "2024-01-25T00:00:00Z"
  }'
```

## Response Format

All responses are JSON:

```json
{
  "data": {
    "id": "wo-123",
    "orderNumber": "WO-2024-001",
    "status": "IN_PROGRESS"
  }
}
```

## Pagination

For endpoints that return lists, use pagination:

```bash
# Page 2, 50 items per page
curl "https://api.mes.company.com/api/v2/work-orders?page=2&limit=50"
```

Response includes pagination metadata:

```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 50,
    "total": 500,
    "hasMore": true
  }
}
```

**Pagination Parameters:**
- `page` - Page number (1-indexed, default: 1)
- `limit` - Items per page (default: 20, max: 100)

## Filtering

Filter resources by fields:

```bash
# Get active work orders
curl "https://api.mes.company.com/api/v2/work-orders?status=IN_PROGRESS"

# Multiple filters (AND condition)
curl "https://api.mes.company.com/api/v2/work-orders?status=IN_PROGRESS&priority=HIGH"

# Complex filters
curl "https://api.mes.company.com/api/v2/work-orders?createdAfter=2024-01-01"
```

**Filter Operators:**
- `=` - Equals (default)
- `!=` - Not equals
- `>` - Greater than
- `<` - Less than
- `>=` - Greater or equal
- `<=` - Less or equal
- `~` - Contains (substring)
- `in` - In array

## Sorting

Sort results by field:

```bash
# Ascending order (default)
curl "https://api.mes.company.com/api/v2/work-orders?sort=createdAt"

# Descending order (prefix with -)
curl "https://api.mes.company.com/api/v2/work-orders?sort=-createdAt"

# Multiple fields
curl "https://api.mes.company.com/api/v2/work-orders?sort=-priority,createdAt"
```

## Error Handling

API errors include an error code and message:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid quantity: must be positive integer",
    "details": {
      "field": "quantity",
      "reason": "MUST_BE_POSITIVE"
    }
  }
}
```

**HTTP Status Codes:**
- `200` - Success (GET, PUT, PATCH)
- `201` - Created (POST)
- `204` - No Content (successful DELETE)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid API key)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate or state conflict)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

## Retries & Exponential Backoff

Implement retry logic with exponential backoff for reliability:

```typescript
const makeRequestWithRetry = async (url, options, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        // Rate limited
        const resetTime = parseInt(response.headers.get('X-RateLimit-Reset'));
        const waitMs = (resetTime * 1000) - Date.now() + 1000;
        await new Promise(resolve => setTimeout(resolve, waitMs));
        continue;
      }

      if (response.status >= 500) {
        // Server error, retry
        const waitMs = Math.pow(2, i) * 1000 + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, waitMs));
        continue;
      }

      return response;
    } catch (error) {
      // Network error, retry
      if (i < maxRetries - 1) {
        const waitMs = Math.pow(2, i) * 1000 + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, waitMs));
      } else {
        throw error;
      }
    }
  }
};
```

## Best Practices

### ✅ Do

- Use pagination for large result sets
- Implement retry logic with exponential backoff
- Validate input before sending
- Use appropriate HTTP methods
- Handle errors gracefully
- Cache responses when appropriate
- Use compression (gzip)

### ❌ Don't

- Hardcode API keys in code
- Make synchronous blocking requests
- Request all results without pagination
- Retry immediately without backoff
- Ignore rate limiting
- Make unnecessary requests
- Expose error details to users

## Code Examples

### JavaScript/Node.js

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.mes.company.com/api/v2',
  headers: {
    'Authorization': `Bearer ${process.env.MES_API_KEY}`
  }
});

// Get work orders
const response = await api.get('/work-orders', {
  params: {
    page: 1,
    limit: 20,
    status: 'IN_PROGRESS'
  }
});

console.log(response.data);
```

### Python

```python
import requests

api_key = os.getenv('MES_API_KEY')

response = requests.get(
    'https://api.mes.company.com/api/v2/work-orders',
    headers={'Authorization': f'Bearer {api_key}'},
    params={
        'page': 1,
        'limit': 20,
        'status': 'IN_PROGRESS'
    }
)

work_orders = response.json()
```

### C#

```csharp
var client = new HttpClient();
client.DefaultRequestHeaders.Add(
    "Authorization",
    $"Bearer {apiKey}"
);

var response = await client.GetAsync(
    "https://api.mes.company.com/api/v2/work-orders?status=IN_PROGRESS"
);

var content = await response.Content.ReadAsStringAsync();
```

---

**Need help?** [Error Handling Guide](../guides/error-handling.md) | [Rate Limiting](../guides/rate-limiting.md)
