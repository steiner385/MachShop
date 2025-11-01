# API Audit Logging Guide

## Overview

The API implements comprehensive audit logging for all API requests and responses. This provides:

- **Compliance**: Complete audit trail for regulatory requirements
- **Security**: Track suspicious activity and unauthorized access attempts
- **Analytics**: Understand API usage patterns and performance
- **Debugging**: Trace issues back to specific requests

## What Gets Logged

### For Every Request:

- **Request ID**: Unique identifier for request tracing
- **Timestamp**: When request was received
- **API Key**: Which key made the request
- **Endpoint**: The API path accessed
- **HTTP Method**: GET, POST, PUT, DELETE, PATCH
- **IP Address**: Client IP making the request
- **User Agent**: Client browser/application info
- **Request Size**: Bytes of request body

### For Every Response:

- **Status Code**: HTTP response code (200, 400, 429, 500, etc.)
- **Response Time**: How long request took (milliseconds)
- **Response Size**: Bytes of response body
- **Error Code**: Application error code (if failed)
- **Error Message**: Human-readable error description
- **Rate Limit Info**: Remaining quota at response time

### Retention Policy

- **Logs are retained for 365 days** (1 year)
- Older logs are automatically deleted
- Can be configured per environment

## Accessing Audit Logs

### View Logs for Your API Key

```bash
GET /admin/api-keys/:keyId/audit-logs?startDate=2021-10-01&endDate=2021-10-31

{
  "success": true,
  "data": [
    {
      "id": "log_123",
      "requestId": "req-abc-123",
      "apiKeyId": "pk_live_xxx",
      "endpoint": "/api/v2/work-orders",
      "httpMethod": "GET",
      "statusCode": 200,
      "responseTime": 145,
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2021-10-15T14:32:00Z"
    },
    ...
  ],
  "pagination": {
    "total": 15000,
    "limit": 100,
    "offset": 0
  }
}
```

### View Usage Statistics

```bash
GET /admin/api-keys/:keyId/stats?startDate=2021-10-01&endDate=2021-10-31

{
  "success": true,
  "data": {
    "period": {
      "startDate": "2021-10-01",
      "endDate": "2021-10-31"
    },
    "totalRequests": 45000,
    "successfulRequests": 44900,
    "failedRequests": 100,
    "successRate": 99.78,
    "avgResponseTime": 125,
    "statusCodes": {
      "200": 44800,
      "201": 100,
      "400": 60,
      "429": 40
    },
    "topEndpoints": [
      {"endpoint": "/api/v2/work-orders", "count": 15000},
      {"endpoint": "/api/v2/products", "count": 12000},
      {"endpoint": "/api/v2/materials", "count": 10000},
      ...
    ]
  }
}
```

## Log Search and Filtering

### By Endpoint

```bash
GET /admin/audit-logs/search?endpoint=/api/v2/work-orders&startDate=2021-10-01
```

### By Status Code

```bash
GET /admin/audit-logs/search?statusCode=500&startDate=2021-10-01
```

### By Error

```bash
GET /admin/audit-logs/search?hasError=true&startDate=2021-10-01

{
  "success": true,
  "data": [
    {
      "requestId": "req-error-1",
      "apiKeyId": "pk_live_xxx",
      "endpoint": "/api/v2/invalid",
      "statusCode": 400,
      "errorCode": "VALIDATION_ERROR",
      "errorMessage": "Missing required field: name",
      "createdAt": "2021-10-15T14:32:00Z"
    },
    ...
  ]
}
```

### By Time Range

```bash
GET /admin/audit-logs/search?startDate=2021-10-15T10:00:00Z&endDate=2021-10-15T11:00:00Z
```

## Using Request IDs for Tracing

Every API response includes a unique `X-Request-ID` header:

```
X-Request-ID: 45a8c-r3f2k9
```

Use this ID to trace the request through all systems:

```bash
# Find the request in audit logs
GET /admin/audit-logs/search?requestId=45a8c-r3f2k9

# Check downstream system logs
grep "45a8c-r3f2k9" /var/log/application.log
grep "45a8c-r3f2k9" /var/log/database.log
```

## Understanding Log Levels

### Success Logs (2xx Status Codes)

```json
{
  "statusCode": 200,
  "responseTime": 145,
  "endpoint": "/api/v2/work-orders",
  "errorCode": null,
  "errorMessage": null
}
```

These are normal, successful requests.

### Client Errors (4xx Status Codes)

```json
{
  "statusCode": 400,
  "responseTime": 45,
  "endpoint": "/api/v2/invalid",
  "errorCode": "VALIDATION_ERROR",
  "errorMessage": "Missing required field: name"
}
```

Client errors indicate problems with the request:
- 400: Bad Request (invalid parameters)
- 401: Unauthorized (invalid credentials)
- 403: Forbidden (insufficient permissions)
- 404: Not Found (resource doesn't exist)
- 429: Too Many Requests (rate limit exceeded)

### Server Errors (5xx Status Codes)

```json
{
  "statusCode": 500,
  "responseTime": 1200,
  "endpoint": "/api/v2/work-orders",
  "errorCode": "DATABASE_ERROR",
  "errorMessage": "Connection to database failed"
}
```

Server errors indicate problems with the API:
- 500: Internal Server Error
- 502: Bad Gateway
- 503: Service Unavailable
- 504: Gateway Timeout

## Analyzing Usage Patterns

### Peak Usage Times

```bash
GET /admin/api-keys/:keyId/stats?startDate=2021-10-01&granularity=hourly
```

Identify when your API key makes most requests.

### Most-Used Endpoints

```bash
GET /admin/api-keys/:keyId/stats?startDate=2021-10-01

# Check topEndpoints in response
"topEndpoints": [
  {"endpoint": "/api/v2/work-orders", "count": 15000},
  ...
]
```

Optimize high-traffic endpoints first.

### Error Rates by Endpoint

```bash
GET /admin/audit-logs/search?startDate=2021-10-01

# Calculate: errors / total_for_endpoint
```

Identify problem areas and improve error handling.

## Performance Monitoring

### Response Time Trends

```bash
GET /admin/api-keys/:keyId/stats?startDate=2021-10-01

# Check avgResponseTime
"avgResponseTime": 125  # milliseconds
```

Monitor response time trends:
- **< 100ms**: Excellent
- **100-300ms**: Good
- **300-1000ms**: Acceptable
- **> 1000ms**: Investigate

### Bottleneck Identification

```bash
# Find slowest endpoints
GET /admin/audit-logs/search?startDate=2021-10-01&orderBy=responseTime&limit=10
```

## Security Monitoring

### Unauthorized Access Attempts

```bash
GET /admin/audit-logs/search?statusCode=401&startDate=2021-10-01

# Large number of 401s from same IP = possible attack
```

### Rate Limit Violations

```bash
GET /admin/audit-logs/search?statusCode=429&startDate=2021-10-01

# Sudden increase may indicate:
# - Application bug (retry loop)
# - Intentional abuse
# - Legitimate burst traffic
```

### Suspicious Activity

Look for:
- Multiple failed authentication attempts (401)
- Rapid requests from different IPs
- Requests to unusual endpoints
- Unusual request patterns

## Log Retention and Deletion

### Manual Export

```bash
GET /admin/audit-logs/export?startDate=2021-09-01&endDate=2021-09-30&format=csv
```

Export logs before they're automatically deleted.

### Permanent Archival

For compliance, archive logs to:
- AWS S3
- Azure Blob Storage
- On-premises storage

## Compliance and Reporting

### SOC 2 Compliance

Logs support SOC 2 requirements:
- ✅ Complete audit trail of API access
- ✅ User identification (API key)
- ✅ Timestamp accuracy
- ✅ Immutable storage
- ✅ Access controls

### HIPAA Compliance

For healthcare organizations:
- ✅ PHI access logging
- ✅ User accountability
- ✅ Encryption in transit
- ✅ Audit log encryption at rest

### GDPR Compliance

For EU data:
- ✅ Right to access (retrieve logs)
- ✅ Right to deletion (automatic after retention)
- ✅ Right to audit trail
- ✅ Data breach notification support

## Best Practices

1. **Regularly monitor logs**
   - Check daily for errors
   - Review weekly statistics
   - Investigate anomalies

2. **Set up alerts**
   - 429 errors (rate limit)
   - 5xx errors (server problems)
   - Unusual patterns

3. **Archive old logs**
   - Keep recent logs in database
   - Archive to S3 for long-term storage
   - Maintain compliance requirements

4. **Secure log access**
   - Restrict log retrieval to admins
   - Use API key authorization
   - Audit who accesses logs

5. **Use structured logging**
   - Applications should log with request ID
   - Correlate API logs with app logs
   - End-to-end tracing

## Troubleshooting

### Where are my logs?

Logs appear immediately after request completes. If not visible:
1. Check correct date range
2. Verify API key is correct
3. Ensure you have permission to view logs
4. Check if older than 365 days (auto-deleted)

### How do I export logs?

```bash
GET /admin/audit-logs/export?startDate=2021-09-01&format=json > logs.json
```

Supports JSON, CSV, and XML formats.

### How long are logs kept?

Default: **365 days**
Can be configured per environment.

## Support

For audit logging questions:
- Email: support@mes.company.com
- Docs: https://docs.mes.company.com/api/audit-logging
- Status: https://status.mes.company.com
