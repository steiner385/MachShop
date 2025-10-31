# Developer Portal Guide

## Overview

The Developer Portal provides self-service API key management for developers. Create keys, monitor usage, rotate credentials, and manage access permissions without contacting support.

## Getting Started

### Register as a Developer

First-time users need to register:

```bash
POST /api/developers/register

{
  "name": "John Developer",
  "email": "john@example.com",
  "company": "Tech Corp"  // optional
}

Response:
{
  "success": true,
  "message": "Developer registered successfully",
  "data": {
    "id": "dev_1234567890",
    "name": "John Developer",
    "email": "john@example.com",
    "company": "Tech Corp",
    "apiKeysCount": 0,
    "totalRequests": 0,
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

## API Key Tiers

The platform offers three tiers of API access, each with different rate limits and capabilities:

### PUBLIC Tier

**Best for:** Public data access, testing, development

- **Rate Limit:** 100 requests per minute
- **Auto-Approval:** Yes (instant access)
- **Scopes Available:**
  - `read:work-orders`
  - `read:materials`
  - `read:operations`
  - `read:products`
  - `read:users` (own profile only)
- **Perfect For:**
  - Public API integration
  - Development and testing
  - Simple data retrieval

**Create a PUBLIC key:**

```bash
POST /api/developers/keys

{
  "name": "Mobile App Dev",
  "tier": "PUBLIC",
  "scopes": ["read:work-orders", "read:materials"]
}

Response:
{
  "success": true,
  "message": "API key created successfully",
  "data": {
    "keyId": "pk_live_abc123xyz789",
    "apiKey": "pk_live_1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p",
    "requiresApproval": false,
    "note": "Save the API key now - it will not be shown again"
  }
}
```

### SDK Tier

**Best for:** Production applications, higher volume integrations

- **Rate Limit:** 500 requests per minute
- **Auto-Approval:** No (requires admin review)
- **Approval Time:** Usually 1-2 business days
- **Scopes Available:** All PUBLIC scopes plus:
  - `write:work-orders`
  - `write:materials`
  - `write:operations`
  - `write:products`
- **Perfect For:**
  - Production integrations
  - Custom applications
  - Higher traffic endpoints

**Request an SDK key:**

```bash
POST /api/developers/keys

{
  "name": "Production Integration",
  "tier": "SDK",
  "scopes": ["read:work-orders", "write:work-orders", "read:materials"]
}

Response:
{
  "success": true,
  "message": "API key created and is pending approval",
  "data": {
    "keyId": "sdk_live_def456ghi789",
    "apiKey": "sdk_live_1x2y3z4a5b6c7d8e9f0g1h2i3j4k5l6m",
    "requiresApproval": true,
    "note": "Save the API key now - it will not be shown again"
  }
}
```

After approval, you'll receive an email notification with status update.

### PRIVATE Tier

**Best for:** Enterprise integrations, unlimited access

- **Rate Limit:** 10,000 requests per minute
- **Auto-Approval:** No (requires direct contact)
- **Approval Time:** 2-5 business days
- **Scopes Available:** All (including `*` for full access)
- **Perfect For:**
  - Enterprise integrations
  - High-volume production
  - Full API access needs

**Request a PRIVATE key:**

```bash
POST /api/developers/keys

{
  "name": "Enterprise System",
  "tier": "PRIVATE",
  "scopes": ["*"]  // Full access
}

Response:
{
  "success": true,
  "message": "API key created and is pending approval",
  "data": {
    "keyId": "pvt_live_jkl789mno012",
    "apiKey": "pvt_live_2a3b4c5d6e7f8g9h0i1j2k3l4m5n6o7p",
    "requiresApproval": true,
    "note": "Save the API key now - it will not be shown again"
  }
}
```

## Managing Your Keys

### List Your API Keys

View all keys you've created:

```bash
GET /api/developers/keys

Response:
{
  "success": true,
  "data": [
    {
      "id": "pk_live_abc123xyz789",
      "name": "Mobile App Dev",
      "tier": "PUBLIC",
      "status": "ACTIVE",
      "createdAt": "2024-01-15T10:30:00Z",
      "lastUsedAt": "2024-01-15T11:45:00Z",
      "expiresAt": null,
      "keyPrefix": "pk_live_"
    },
    {
      "id": "sdk_live_def456ghi789",
      "name": "Production Integration",
      "tier": "SDK",
      "status": "PENDING_APPROVAL",
      "createdAt": "2024-01-15T10:35:00Z",
      "lastUsedAt": null,
      "expiresAt": null,
      "keyPrefix": "sdk_live_"
    },
    ...
  ],
  "total": 5
}
```

### View Key Details

Get full details for a specific key:

```bash
GET /api/developers/keys/{keyId}

Response:
{
  "success": true,
  "data": {
    "id": "pk_live_abc123xyz789",
    "name": "Mobile App Dev",
    "tier": "PUBLIC",
    "status": "ACTIVE",
    "scopes": ["read:work-orders", "read:materials"],
    "createdAt": "2024-01-15T10:30:00Z",
    "lastUsedAt": "2024-01-15T11:45:00Z",
    "lastUsedIp": "192.168.1.100",
    "expiresAt": null,
    "keyPrefix": "pk_live_"
  }
}
```

### Update Key Settings

Change a key's name or set an expiration date:

```bash
PATCH /api/developers/keys/{keyId}

{
  "name": "Mobile App Production",
  "expiresAt": "2025-01-15T23:59:59Z"  // optional, ISO 8601 format
}

Response:
{
  "success": true,
  "message": "API key settings updated successfully"
}
```

### Rotate a Key

Generate a new key to replace an existing one. The old key remains valid for 24 hours.

```bash
POST /api/developers/keys/{keyId}/rotate

Response:
{
  "success": true,
  "message": "API key rotated successfully",
  "data": {
    "newKeyId": "pk_live_new_xyz789",
    "apiKey": "pk_live_7p8q9r0s1t2u3v4w5x6y7z8a9b0c1d2e",
    "note": "Save the new API key now - it will not be shown again"
  }
}
```

**Best Practice:** Rotate keys every 90 days or when compromised.

### Revoke a Key

Immediately disable a key (cannot be undone):

```bash
POST /api/developers/keys/{keyId}/revoke

Response:
{
  "success": true,
  "message": "API key revoked successfully"
}
```

The key cannot be used after revocation.

### Check Pending Approvals

See SDK and PRIVATE keys awaiting approval:

```bash
GET /api/developers/keys/pending

Response:
{
  "success": true,
  "data": [
    {
      "id": "sdk_live_def456ghi789",
      "name": "Production Integration",
      "tier": "SDK",
      "createdAt": "2024-01-15T10:35:00Z",
      "scopes": ["read:work-orders", "write:work-orders"]
    },
    ...
  ],
  "total": 2,
  "message": "Your keys are pending approval. You will be notified once they are reviewed."
}
```

## Monitoring and Analytics

### View Usage Statistics

Track your API usage over time:

```bash
GET /api/developers/usage?startDate=2024-01-01&endDate=2024-01-31

Query Parameters:
- startDate: ISO 8601 format (default: 30 days ago)
- endDate: ISO 8601 format (default: today)

Response:
{
  "success": true,
  "data": {
    "developer": "john@example.com",
    "period": {
      "startDate": "2024-01-01T00:00:00Z",
      "endDate": "2024-01-31T23:59:59Z"
    },
    "totalRequests": 145000,
    "totalKeys": 3,
    "successRate": 99.2,
    "keys": [
      {
        "keyId": "pk_live_abc123xyz789",
        "name": "Mobile App Dev",
        "tier": "PUBLIC",
        "totalRequests": 95000,
        "successfulRequests": 94500,
        "failedRequests": 500,
        "avgResponseTime": 125,
        "statusCodes": {
          "200": 94500,
          "400": 300,
          "429": 200
        }
      },
      ...
    ]
  }
}
```

**Usage Analysis Tips:**

- **Success Rate:** Aim for > 99%. Lower rates indicate bugs or misuse.
- **Response Time:** < 100ms is excellent, > 500ms may need optimization.
- **Error Codes:**
  - 429: Rate limit exceeded (adjust usage or upgrade tier)
  - 400: Invalid requests (check API documentation)
  - 500: Server errors (contact support)

### View Recent Activity

Get a summary of last 30 days activity:

```bash
GET /api/developers/activity

Response:
{
  "success": true,
  "data": {
    "developer": "john@example.com",
    "period": "30 days",
    "lastActive": "2024-01-15T15:30:00Z",
    "totalRequests": 145000,
    "apiKeysActive": 3,
    "successRate": 99.2
  }
}
```

## API Key Usage

### Include in Request Header

All API requests must include your API key:

```bash
curl -H "Authorization: Bearer pk_live_abc123xyz789" \
     https://api.example.com/api/v2/work-orders
```

### Response Headers

Every response includes useful information:

```
X-Request-ID: req-abc-123        # Unique request identifier
X-RateLimit-Limit: 100            # Rate limit for this tier
X-RateLimit-Remaining: 42         # Remaining requests this minute
X-RateLimit-Reset: 1705349200     # Unix timestamp when limit resets
X-Response-Time: 125              # Response time in milliseconds
```

### Example Full Request/Response

```bash
curl -i -H "Authorization: Bearer pk_live_abc123xyz789" \
     https://api.example.com/api/v2/work-orders

HTTP/2 200 OK
X-Request-ID: req-abc-123
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1705349200
X-Response-Time: 125
Content-Type: application/json

{
  "success": true,
  "data": [
    {
      "id": "wo_123",
      "name": "Order #456",
      "status": "IN_PROGRESS",
      "createdAt": "2024-01-15T10:00:00Z"
    },
    ...
  ],
  "pagination": {
    "total": 1250,
    "limit": 10,
    "offset": 0
  }
}
```

## Approval Process

### SDK Tier Approval

1. **Submit Request:** Create key with tier: SDK
2. **Review Period:** 1-2 business days
3. **Email Notification:** Receive approval or rejection
4. **Start Using:** Once approved, key is immediately active

**What Admins Review:**
- Your company information
- Integration use case
- Requested scopes
- Rate limit requirements

### PRIVATE Tier Approval

1. **Contact Sales:** email: sales@example.com
2. **Discussion:** Talk about your needs
3. **Custom Agreement:** Create terms for your use case
4. **Key Issued:** Receive key after agreement signed

### Rejection Reasons

Keys may be rejected for:

- **Suspicious Activity:** Detected during review
- **Terms Violation:** Use case doesn't comply with policy
- **Business Reason:** Not in compliance with our guidelines
- **Incomplete Profile:** Need more information

**Appeal Process:**

If your request is rejected, you can:
1. Update your profile information
2. Provide additional context
3. Resubmit after addressing feedback
4. Contact support: support@example.com

## Security Best Practices

### API Key Storage

```
❌ DON'T:
- Store in version control (Git)
- Log keys in output
- Share via email or chat
- Hardcode in source code
- Check into environment config files

✅ DO:
- Use environment variables
- Store in secure vaults (AWS Secrets Manager, HashiCorp Vault)
- Use configuration management tools
- Keep in .gitignore
- Rotate regularly (90 days)
```

### Code Example - Secure Storage

```python
import os
from dotenv import load_dotenv

load_dotenv()  # Load from .env file
api_key = os.getenv('API_KEY')

response = requests.get(
    'https://api.example.com/api/v2/work-orders',
    headers={'Authorization': f'Bearer {api_key}'}
)
```

### Handling Compromised Keys

If you suspect a key is compromised:

1. **Immediately revoke it:** POST /api/developers/keys/{keyId}/revoke
2. **Create new key:** POST /api/developers/keys (for same tier)
3. **Update applications:** Replace key in all applications
4. **Monitor usage:** Check activity logs for suspicious access
5. **Contact support:** If significant compromise

### Scope Limitations

Each key has scopes that limit what it can access:

```
read:work-orders    - View work orders only
write:work-orders   - Create/update work orders
read:materials      - View materials only
write:materials     - Create/update materials
read:operations     - View operations only
write:operations    - Create/update operations
read:products       - View products only
write:products      - Create/update products
read:users          - View own user profile only
write:users         - Update own profile only
*                   - Full access (PRIVATE keys only)
```

**Best Practice:** Request only scopes your application needs.

## Troubleshooting

### "Invalid API Key" Error

```
{
  "error": "Unauthorized",
  "message": "Invalid API key"
}
```

**Solutions:**
1. Check key hasn't been revoked: GET /api/developers/keys
2. Verify key is active (not REVOKED or SUSPENDED)
3. Ensure it's the full key, not just the prefix
4. Check for typos in Authorization header

### "Rate Limit Exceeded" Error

```
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded: 100 requests per minute"
}
```

**Solutions:**
1. Wait for window to reset (check X-RateLimit-Reset header)
2. Implement exponential backoff in your code
3. Upgrade to higher tier (SDK or PRIVATE)
4. Optimize requests:
   - Batch operations
   - Cache results
   - Use pagination

### "Scope Not Allowed" Error

```
{
  "error": "Forbidden",
  "message": "Your key does not have scope: write:work-orders"
}
```

**Solutions:**
1. Create new key with required scopes: POST /api/developers/keys
2. Or request scope addition (contact support)
3. Check key scopes: GET /api/developers/keys/{keyId}

### "Key Pending Approval" Error

```
{
  "error": "Forbidden",
  "message": "API key is pending approval"
}
```

**Solutions:**
1. Wait for approval (usually 1-2 business days)
2. Check pending keys: GET /api/developers/keys/pending
3. If rejected, see rejection reason
4. Create PUBLIC key for testing in the meantime

### "Account Suspended" Error

```
{
  "error": "Forbidden",
  "message": "Your developer account is suspended"
}
```

**Solutions:**
1. Contact support: support@example.com
2. Common reasons:
   - Terms of service violation
   - Suspicious activity detected
   - Non-payment (enterprise)

## Frequently Asked Questions

**Q: How many API keys can I have?**
A: Up to 50 keys per account. Contact support to increase.

**Q: How long do keys last?**
A: Keys never expire by default. You can set custom expiration.

**Q: Can I see who uses my keys?**
A: You can't see specific users, but can see:
   - IP addresses used
   - Endpoints accessed
   - Request patterns in audit logs

**Q: What happens if my key is leaked?**
A:
1. Immediately revoke it: POST /api/developers/keys/{keyId}/revoke
2. Create a new one
3. All future requests with old key will fail (403 Forbidden)

**Q: How do I upgrade from PUBLIC to SDK tier?**
A: Create a new SDK key and request approval. Don't delete your PUBLIC key.

**Q: Can I transfer keys between accounts?**
A: No. Create new keys in target account.

**Q: How often should I rotate keys?**
A: Every 90 days or immediately if compromised.

**Q: What's the difference between revoke and suspend?**
A:
- **Revoke:** Permanent deletion, cannot be recovered
- **Suspend:** Temporary disable, can be reactivated (admins only)

**Q: How long does SDK approval take?**
A: Usually 1-2 business days. We review weekdays 9 AM - 5 PM PT.

**Q: Can I use one key in multiple applications?**
A: Yes, but we recommend one key per application for security.

## Support

Need help?

- **Documentation:** https://docs.example.com
- **Email:** support@example.com
- **Chat:** Available in portal
- **Status:** https://status.example.com
- **Issues:** Report via portal or email

