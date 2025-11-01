---
sidebar_position: 1
title: API Overview
description: MES API reference and endpoint documentation
---

# API Reference Overview

The MES API provides RESTful endpoints for managing manufacturing operations, work orders, quality data, inventory, and more.

## Base URL

```
https://api.mes.company.com/api/v2/
```

## Authentication

All requests require authentication using an API key:

```bash
Authorization: Bearer YOUR_API_KEY
```

[Learn about authentication →](../getting-started/authentication.md)

## API Endpoints

### Work Orders

Manage manufacturing work orders:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/work-orders` | List work orders |
| `GET` | `/work-orders/{id}` | Get work order |
| `POST` | `/work-orders` | Create work order |
| `PUT` | `/work-orders/{id}` | Update work order |
| `DELETE` | `/work-orders/{id}` | Delete work order |
| `POST` | `/work-orders/{id}/start` | Start work order |
| `POST` | `/work-orders/{id}/complete` | Complete work order |

[Full Work Orders API →](./work-orders.md)

### Operations

Manage operations within work orders:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/operations` | List operations |
| `GET` | `/operations/{id}` | Get operation |
| `POST` | `/operations` | Create operation |
| `PUT` | `/operations/{id}` | Update operation |
| `POST` | `/operations/{id}/start` | Start operation |
| `POST` | `/operations/{id}/complete` | Complete operation |

[Full Operations API →](./operations.md)

### Quality

Quality management and non-conformance reports:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/quality/ncrs` | List NCRs |
| `POST` | `/quality/ncrs` | Create NCR |
| `GET` | `/quality/inspections` | List inspections |
| `POST` | `/quality/inspections` | Create inspection |
| `GET` | `/quality/analytics` | Quality analytics |

[Full Quality API →](./quality.md)

### Inventory

Material and inventory management:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/inventory/materials` | List materials |
| `GET` | `/inventory/materials/{id}` | Get material |
| `GET` | `/inventory/stock-levels` | Get stock levels |
| `POST` | `/inventory/movements` | Record material movement |
| `GET` | `/inventory/locations` | List storage locations |

[Full Inventory API →](./inventory.md)

## Response Format

All successful responses return a JSON object with `data` field:

```json
{
  "data": {
    "id": "wo-123",
    "orderNumber": "WO-2024-001",
    "status": "IN_PROGRESS"
  }
}
```

List endpoints include pagination:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "hasMore": true
  }
}
```

## Error Responses

Errors include an error code and message:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid quantity",
    "details": {
      "field": "quantity",
      "reason": "MUST_BE_POSITIVE"
    }
  }
}
```

## Status Codes

| Code | Meaning |
|------|---------|
| `200` | OK - Request succeeded |
| `201` | Created - Resource created |
| `204` | No Content - Success with no body |
| `400` | Bad Request - Invalid input |
| `401` | Unauthorized - Invalid API key |
| `403` | Forbidden - No permission |
| `404` | Not Found - Resource not found |
| `409` | Conflict - State conflict |
| `429` | Too Many Requests - Rate limited |
| `500` | Server Error - Internal error |

## Rate Limiting

Rate limits depend on your API tier:

- **Free**: 1,000 requests/minute
- **Professional**: 10,000 requests/minute
- **Enterprise**: Custom limits

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640880000
```

## Pagination

List endpoints support pagination:

```bash
GET /work-orders?page=1&limit=20&sort=-createdAt
```

Parameters:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `sort` - Sort field (prefix with `-` for descending)

## Filtering

Filter resources by field:

```bash
# Exact match
GET /work-orders?status=IN_PROGRESS

# Comparison operators
GET /work-orders?quantity>=100&createdAfter=2024-01-01

# Contains
GET /work-orders?product~Widget
```

## Common Query Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `page` | Page number | `?page=2` |
| `limit` | Items per page | `?limit=50` |
| `sort` | Sort order | `?sort=-createdAt` |
| `filter` | Filter conditions | `?status=IN_PROGRESS` |
| `fields` | Response fields | `?fields=id,orderNumber` |
| `expand` | Include relations | `?expand=operations` |

## Data Types

### Date/Time

Dates and times are ISO 8601 format (UTC):

```
2024-01-15T10:30:00Z
```

### IDs

Resource IDs are prefixed with resource type:

```
wo-123      (work order)
op-456      (operation)
ncr-789     (non-conformance report)
mat-101     (material)
```

### Enums

Status enums use SCREAMING_SNAKE_CASE:

```
OPEN
IN_PROGRESS
COMPLETED
CANCELLED
PAUSED
```

## Webhooks

Receive real-time notifications:

```bash
POST /webhooks/endpoints
{
  "url": "https://yourapp.com/webhooks",
  "events": ["work_order.created", "work_order.completed"]
}
```

[Webhooks documentation →](../webhooks/overview.md)

## SDK & Libraries

Official SDKs (coming soon):
- JavaScript/TypeScript
- Python
- C# / .NET
- Java

Community libraries available on GitHub.

## API Changelog

Stay updated on API changes:

- [API Changelog](../changelog) - Breaking changes, new features, deprecations
- [RSS Feed](../changelog/feed.xml) - Subscribe for updates
- [Migration Guides](../changelog) - How to migrate between versions

## Versioning

Current version: **v2**

API versions are included in the URL path:

```
https://api.mes.company.com/api/v2/...
```

Previous versions remain supported for 2 years after deprecation notice.

## Best Practices

### ✅ Do

- Use pagination for large datasets
- Implement retry logic with exponential backoff
- Validate input before sending
- Use appropriate HTTP methods
- Check status codes
- Handle errors gracefully
- Monitor rate limits

### ❌ Don't

- Hardcode API keys
- Make unlimited requests without pagination
- Retry immediately without backoff
- Ignore 429 (Too Many Requests) responses
- Store sensitive data in plain text
- Make synchronous blocking requests
- Request individual resources in a loop (use bulk endpoints)

## Support

- **API Docs**: [developers.mes.company.com](https://developers.mes.company.com)
- **Status**: [status.mes.company.com](https://status.mes.company.com)
- **Email**: [developers@mes.company.com](mailto:developers@mes.company.com)
- **GitHub Issues**: [github.com/steiner385/MachShop/issues](https://github.com/steiner385/MachShop/issues)

---

**Next**: [Work Orders API](./work-orders.md) | [Full Documentation](../guides/authentication-flow.md)
