---
sidebar_position: 2
title: Error Handling
---

# Error Handling Guide

## Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Use response |
| 201 | Created | Resource created |
| 400 | Bad Request | Fix input |
| 401 | Unauthorized | Check auth |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Check resource ID |
| 429 | Rate Limited | Implement backoff |
| 500 | Server Error | Retry with backoff |

## Error Response Format

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

## Retry Strategy

```typescript
const retry = async (fn, maxAttempts = 3) => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxAttempts - 1) throw error;
      const delay = Math.pow(2, i) * 1000;
      await new Promise(r => setTimeout(r, delay));
    }
  }
};
```

---

See [Making Requests](../getting-started/making-requests.md) for more examples.
