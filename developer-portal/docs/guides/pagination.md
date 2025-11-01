---
sidebar_position: 3
title: Pagination
---

# Pagination Guide

## Using Pagination

```bash
# Get page 2, 50 items per page
curl "https://api.mes.company.com/api/v2/work-orders?page=2&limit=50"
```

## Response

```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 50,
    "total": 1000,
    "hasMore": true
  }
}
```

## Best Practices

- Use `limit=100` for maximum efficiency
- Implement cursor-based pagination for large datasets
- Cache pagination results when possible
- Don't request single items in loops (use bulk endpoints)

---

See [Making Requests](../getting-started/making-requests.md).
