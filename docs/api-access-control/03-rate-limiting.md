# API Rate Limiting Guide

## Overview

The API implements distributed rate limiting using Redis to prevent abuse and ensure fair resource allocation across all API consumers.

## Rate Limit Tiers

### PUBLIC Tier
- **Requests per Minute**: 100
- **Requests per Hour**: 5,000
- **Requests per Day**: 10,000
- **Burst Allowance**: 1.5x for 60 seconds

**Use Case**: External third-party integrations, public applications

### SDK Tier
- **Requests per Minute**: 500
- **Requests per Hour**: 25,000
- **Requests per Day**: 100,000
- **Burst Allowance**: 2.0x for 60 seconds

**Use Case**: System integrators, plugin developers

### PRIVATE Tier
- **Requests per Minute**: 10,000
- **Requests per Hour**: 500,000
- **Requests per Day**: 1,000,000
- **Burst Allowance**: 5.0x for 60 seconds

**Use Case**: Internal services, first-party applications

## How Rate Limiting Works

### Token Bucket Algorithm

The rate limiter uses the token bucket algorithm:

1. Tokens are added to the bucket at a fixed rate
2. Each request consumes 1 token
3. When the bucket is empty, requests are rejected
4. The bucket size determines burst capacity

### Multi-Window Enforcement

Rate limits are enforced across three time windows:

- **Minute Window**: Per-minute quota (hard limit)
- **Hour Window**: Per-hour quota (soft limit)
- **Day Window**: Per-day quota (soft limit)

If ANY window is exhausted, the request is rejected.

## Rate Limit Headers

Every response includes rate limit information:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1635890430
Retry-After: 60
```

### Header Explanation

- `X-RateLimit-Limit`: Total requests allowed in current window
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when window resets
- `Retry-After`: Seconds to wait before retrying (on 429 response)

## Handling Rate Limit Errors

### 429 Too Many Requests Response

When rate limit is exceeded:

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 60
}
```

### Best Practices

1. **Check headers before making requests**
   ```javascript
   const remaining = parseInt(res.headers['x-ratelimit-remaining']);
   if (remaining < 10) {
     // Slow down
   }
   ```

2. **Implement exponential backoff**
   ```javascript
   let delay = 1000; // 1 second
   while (retries < 3) {
     try {
       return await makeRequest();
     } catch (error) {
       if (error.status === 429) {
         await sleep(delay);
         delay *= 2; // Double the delay
         retries++;
       } else {
         throw error;
       }
     }
   }
   ```

3. **Cache responses when possible**
   - Avoid repeated requests for the same data
   - Implement proper cache invalidation

4. **Batch operations**
   - Use bulk endpoints when available
   - Reduce total number of API calls

## Resource-Specific Rate Limits

Certain expensive operations may have tighter limits:

- `/api/v2/reports/generate`: 10 req/min (any tier)
- `/api/v2/export`: 5 req/min (any tier)
- `/api/v2/analytics`: 100 req/min (tier-dependent)

Check API documentation for resource-specific limits.

## Quota Reset Times

- **Minute Window**: Resets every 60 seconds
- **Hour Window**: Resets at the top of each hour (UTC)
- **Day Window**: Resets at midnight UTC

Example:
- If 100-request minute limit is exhausted at 14:35:45 UTC
- Window resets at 14:36:00 UTC (15 seconds to wait)

## Monitoring Rate Limit Usage

Use the API to monitor your current usage:

```bash
GET /admin/api-keys/:keyId/stats?startDate=2021-10-01&endDate=2021-10-31

{
  "success": true,
  "data": {
    "apiKeyId": "pk_live_xxx",
    "totalRequests": 45000,
    "requestsByStatusCode": {
      "200": 44900,
      "429": 100
    },
    "requestsByEndpoint": {
      "/api/v2/work-orders": 15000,
      "/api/v2/products": 20000,
      ...
    },
    "averageResponseTime": 125,
    "errorRate": 0.002
  }
}
```

## Requesting Higher Limits

If you consistently hit rate limits:

1. **Optimize your API usage**
   - Cache responses
   - Batch operations
   - Reduce request frequency

2. **Request tier upgrade**
   - Contact support with usage patterns
   - Provide business justification
   - Current tier requirements

3. **Custom limits**
   - Available for enterprise plans
   - Contact sales team
   - Requires API contract amendment

## Burst Allowance

The burst allowance lets you exceed per-minute limits temporarily:

- PUBLIC: Can burst to 150 requests/min for 60 seconds
- SDK: Can burst to 1,000 requests/min for 60 seconds
- PRIVATE: Can burst to 50,000 requests/min for 60 seconds

**Use Cases**:
- Batch processing during off-hours
- Initial data sync
- One-time bulk operations

**Note**: Burst requests are still counted against hourly/daily limits.

## Rate Limit Best Practices

1. **Distribute requests over time**
   - Don't send all requests at once
   - Use scheduling/queuing

2. **Monitor remaining quota**
   - Check headers after each request
   - Implement alerts for low quota

3. **Implement circuits breakers**
   - Stop retrying after multiple failures
   - Exponential backoff with jitter

4. **Use webhooks instead of polling**
   - Webhooks for real-time updates
   - Reduce polling frequency

5. **Coordinate with team**
   - Share API keys across team
   - Pool quota usage
   - Avoid key duplication

## Troubleshooting

### Frequently Hitting Rate Limits?

1. **Check current usage**
   ```bash
   GET /admin/api-keys/:keyId/stats
   ```

2. **Identify heavy endpoints**
   - Which endpoints use most quota?
   - Can they be optimized?

3. **Review request patterns**
   - Unnecessary requests?
   - Can responses be cached?

4. **Consider tier upgrade**
   - Current tier insufficient?
   - Request higher tier

### Rate Limit Not Resetting?

- Limits reset at specific times (minute, hour boundary)
- Check `X-RateLimit-Reset` header for exact time
- Limits are per-API-key, not per-IP

### Getting 429 But Headers Say Available?

- Headers show minute window only
- Hourly/daily windows may be exhausted
- Check all three windows in API

## Support

For rate limiting issues:
- Email: api-support@mes.company.com
- Status Page: https://status.mes.company.com
- Docs: https://docs.mes.company.com/api/rate-limiting
