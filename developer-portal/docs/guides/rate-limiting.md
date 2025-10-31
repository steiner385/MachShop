---
sidebar_position: 4
title: Rate Limiting
---

# Rate Limiting Guide

## Limits

- Free: 1,000 requests/minute
- Professional: 10,000 requests/minute
- Enterprise: Custom

## Headers

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640880000
```

## Handling 429

```typescript
if (response.status === 429) {
  const resetTime = parseInt(response.headers.get('X-RateLimit-Reset'));
  const delay = (resetTime * 1000) - Date.now();
  await sleep(delay);
  // Retry
}
```

---

See [Making Requests](../getting-started/making-requests.md).
