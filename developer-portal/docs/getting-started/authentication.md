---
sidebar_position: 3
title: Authentication
description: Learn how to authenticate API requests
---

# Authentication

The MES API uses industry-standard authentication methods to secure your integrations.

## Authentication Methods

### 1. API Key (Server-to-Server)

Best for server-to-server integrations where a single application acts on your behalf.

**When to use:**
- Backend services and microservices
- Scheduled jobs and cron tasks
- Third-party integrations (Zapier, IFTTT)
- Internal tools and scripts

**Getting an API Key:**
1. Log in to [developer dashboard](https://developers.mes.company.com/dashboard)
2. Go to **Settings > API Keys**
3. Click **Create New API Key**
4. Optionally set scopes (default: all permissions)
5. Copy the key (displayed only once)

**Using an API Key:**

```bash
# Using cURL
curl -H "Authorization: Bearer sk-abc123..." \
  https://api.mes.company.com/api/v2/work-orders

# Using JavaScript
const response = await fetch('https://api.mes.company.com/api/v2/work-orders', {
  headers: {
    'Authorization': 'Bearer sk-abc123...'
  }
});
```

**API Key Lifecycle:**
- Keys never expire (rotate for security)
- Can be revoked instantly
- Can be regenerated without losing old keys
- Support multiple active keys

**Security Best Practices:**
- ⚠️ Never commit API keys to version control
- Use environment variables: `process.env.MES_API_KEY`
- Rotate keys every 90 days
- Use different keys for dev/staging/production
- Restrict key scopes to minimum required permissions
- Monitor API key usage in dashboard

### 2. OAuth 2.0 (User Authentication)

Best for user-facing applications where users grant permission.

**When to use:**
- Mobile and web applications
- User-facing integrations
- Customer-facing plugins
- Multi-tenant applications

**OAuth 2.0 Flow:**

```
1. User clicks "Connect with MES"
2. Redirected to MES login
3. User authenticates and grants permission
4. Redirected back with authorization code
5. Exchange code for access token
6. Use token to make API calls on user's behalf
```

**Implementation Example:**

```typescript
// 1. Redirect user to authorization endpoint
const authUrl = 'https://auth.mes.company.com/oauth/authorize';
const params = new URLSearchParams({
  client_id: 'YOUR_CLIENT_ID',
  redirect_uri: 'https://yourapp.com/callback',
  response_type: 'code',
  scope: 'work-orders:read inventory:read'
});

window.location.href = `${authUrl}?${params}`;

// 2. Handle callback (in your /callback endpoint)
const code = req.query.code;

const tokenResponse = await fetch('https://auth.mes.company.com/oauth/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    client_id: 'YOUR_CLIENT_ID',
    client_secret: 'YOUR_CLIENT_SECRET',
    code: code,
    grant_type: 'authorization_code'
  })
});

const { access_token, refresh_token } = await tokenResponse.json();

// 3. Use access token to make API calls
const response = await fetch('https://api.mes.company.com/api/v2/work-orders', {
  headers: {
    'Authorization': `Bearer ${access_token}`
  }
});
```

**Token Refresh:**

```typescript
// Access tokens expire after 1 hour
// Use refresh token to get new access token
const refreshResponse = await fetch('https://auth.mes.company.com/oauth/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    grant_type: 'refresh_token',
    refresh_token: 'YOUR_REFRESH_TOKEN',
    client_id: 'YOUR_CLIENT_ID'
  })
});

const { access_token } = await refreshResponse.json();
```

## Scopes

Define granular permissions for your API key or OAuth token.

| Scope | Description |
|-------|-------------|
| `work-orders:read` | List and read work orders |
| `work-orders:write` | Create and update work orders |
| `operations:read` | List and read operations |
| `operations:write` | Create and update operations |
| `quality:read` | List and read quality data |
| `quality:write` | Create and update quality data |
| `inventory:read` | List and read inventory |
| `inventory:write` | Create and update inventory |
| `webhooks:read` | List webhook endpoints |
| `webhooks:write` | Create and update webhooks |

**Setting Scopes:**

```typescript
// When creating API key
const response = await fetch('https://api.mes.company.com/api/v2/api-keys', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ...' },
  body: JSON.stringify({
    name: 'ERP Integration',
    scopes: ['work-orders:read', 'work-orders:write', 'inventory:read']
  })
});
```

## Rate Limiting

Requests are rate limited to prevent abuse.

**Limits:**
- **Free Tier**: 1,000 requests/minute
- **Professional**: 10,000 requests/minute
- **Enterprise**: Custom limits

**Rate Limit Headers:**

```
HTTP/1.1 200 OK
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640880000
```

**Handling Rate Limits:**

```typescript
const makeRequest = async (url, options) => {
  const response = await fetch(url, options);

  if (response.status === 429) {
    // Rate limited, wait and retry
    const resetTime = parseInt(response.headers.get('X-RateLimit-Reset'));
    const waitMs = (resetTime * 1000) - Date.now();

    await new Promise(resolve => setTimeout(resolve, waitMs));
    return makeRequest(url, options);
  }

  return response;
};
```

## Security Considerations

### Token Storage

**Web Applications:**
- Store in secure, httpOnly cookie
- Never store in localStorage (XSS vulnerable)
- Set SameSite=Strict to prevent CSRF

**Mobile Applications:**
- Use platform keychain (iOS Keychain, Android KeyStore)
- Never store in SharedPreferences or UserDefaults
- Implement certificate pinning

**Backend Services:**
- Store in encrypted configuration
- Use environment variables
- Rotate regularly
- Audit access logs

### HTTPS Required

All API requests must use HTTPS. HTTP requests are rejected.

```bash
# ✅ Correct
curl https://api.mes.company.com/api/v2/work-orders

# ❌ Wrong - will fail
curl http://api.mes.company.com/api/v2/work-orders
```

### Webhook Signature Verification

Verify webhook events came from MES using HMAC signatures.

```typescript
import crypto from 'crypto';

const verifyWebhookSignature = (payload, signature, secret) => {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return hash === signature;
};

// In your webhook endpoint
app.post('/webhooks/mes', (req, res) => {
  const signature = req.headers['x-mes-signature'];

  if (!verifyWebhookSignature(req.body, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Process webhook
  res.status(200).json({ ok: true });
});
```

## Troubleshooting

### 401 Unauthorized

**Causes:**
- Invalid or expired API key
- Missing Authorization header
- Incorrect bearer token format
- Scope insufficient for operation

**Solutions:**
```bash
# Check header format
curl -H "Authorization: Bearer YOUR_KEY" ...

# Verify key is valid and not revoked
# Check in dashboard: Settings > API Keys

# Ensure key has required scopes
```

### 403 Forbidden

**Causes:**
- API key doesn't have permission for this operation
- User account doesn't have permission

**Solutions:**
- Check required scopes for the endpoint
- Add missing scopes to API key
- Check user role/permissions in organization

### Token Expired

**Signs:**
- 401 errors suddenly appear after working fine
- Error message: "Token expired"

**Solution:**
- Refresh using refresh token
- For OAuth: Use refresh_token grant
- For API keys: Get new key from dashboard

## Related Documentation

- [OAuth 2.0 Flow Diagram](../guides/authentication-flow.md)
- [API Key Management](../guides/authentication-flow.md)
- [Webhook Verification](../webhooks/best-practices.md)

---

**Need help?** [Email support](mailto:developers@mes.company.com) | [GitHub Discussions](https://github.com/steiner385/MachShop/discussions)
