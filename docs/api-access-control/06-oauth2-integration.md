# OAuth 2.0 Integration Guide

## Overview

The API implements OAuth 2.0 for secure third-party application integration. OAuth 2.0 enables:

- **Delegated Access**: Users authorize apps without sharing passwords
- **Token-Based Security**: Temporary tokens instead of permanent credentials
- **Scope Limitations**: Apps request only needed permissions
- **Easy Revocation**: Users can revoke app access instantly
- **Standardized Flow**: Industry-standard OAuth 2.0 specification

## OAuth 2.0 Flows

### Authorization Code Flow (Recommended)

**Best for:** Web applications, mobile apps, desktop applications

Flow diagram:
```
User → App → Authorization Server → User (login & consent) → App → Token Server → App
```

**Steps:**

1. **User clicks "Connect" in your app**
2. **App redirects to authorization endpoint**
   ```
   GET https://api.example.com/oauth/authorize?
     client_id=YOUR_CLIENT_ID&
     redirect_uri=https://yourapp.com/callback&
     scope=read:work-orders%20write:work-orders&
     response_type=code&
     state=random_state_string
   ```

3. **User logs in and grants permission**
   - Sees what permissions your app is requesting
   - Can approve or deny

4. **Authorization server redirects back to your app**
   ```
   GET https://yourapp.com/callback?
     code=AUTHORIZATION_CODE&
     state=random_state_string
   ```

5. **Your app exchanges code for token** (backend only)
   ```bash
   POST https://api.example.com/oauth/token

   {
     "grant_type": "authorization_code",
     "code": "AUTHORIZATION_CODE",
     "client_id": "YOUR_CLIENT_ID",
     "client_secret": "YOUR_CLIENT_SECRET",
     "redirect_uri": "https://yourapp.com/callback"
   }

   Response:
   {
     "access_token": "ACCESS_TOKEN",
     "refresh_token": "REFRESH_TOKEN",
     "token_type": "Bearer",
     "expires_in": 3600,
     "scope": "read:work-orders write:work-orders"
   }
   ```

6. **Your app uses access token for API requests**
   ```bash
   curl -H "Authorization: Bearer ACCESS_TOKEN" \
        https://api.example.com/api/v2/work-orders
   ```

**Advantages:**
- ✅ User controls what permissions to grant
- ✅ App never sees user's password
- ✅ Users can revoke access anytime
- ✅ Access token expires automatically
- ✅ Refresh token for extended sessions

### Client Credentials Flow

**Best for:** Server-to-server integrations, batch jobs, system integrations

**No user involvement** - Direct application-to-application authentication.

**Steps:**

1. **App authenticates with OAuth server**
   ```bash
   POST https://api.example.com/oauth/token

   {
     "grant_type": "client_credentials",
     "client_id": "YOUR_CLIENT_ID",
     "client_secret": "YOUR_CLIENT_SECRET",
     "scope": "read:work-orders write:work-orders"
   }

   Response:
   {
     "access_token": "ACCESS_TOKEN",
     "token_type": "Bearer",
     "expires_in": 3600,
     "scope": "read:work-orders write:work-orders"
   }
   ```

2. **App uses access token for API requests**
   ```bash
   curl -H "Authorization: Bearer ACCESS_TOKEN" \
        https://api.example.com/api/v2/work-orders
   ```

**Advantages:**
- ✅ No user login needed
- ✅ Perfect for backend services
- ✅ Simple and fast
- ✅ No refresh token needed (short-lived tokens)

**Disadvantages:**
- ❌ Shares client secret (must be stored securely)
- ❌ No user consent
- ❌ Less granular permissions

### Refresh Token Flow

**Extend access when token expires**

```bash
POST https://api.example.com/oauth/token

{
  "grant_type": "refresh_token",
  "refresh_token": "REFRESH_TOKEN",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET"
}

Response:
{
  "access_token": "NEW_ACCESS_TOKEN",
  "refresh_token": "NEW_REFRESH_TOKEN",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

**Key points:**
- Refresh tokens are long-lived (30 days)
- Use refresh tokens to get new access tokens
- New access tokens valid for 1 hour
- Implement token refresh before expiration

## OAuth Client Registration

### Register Your App

**Admin endpoint to create OAuth client:**

```bash
POST /admin/oauth/clients

{
  "name": "My Integration App",
  "redirectUris": [
    "https://myapp.com/callback",
    "https://myapp.com/oauth-callback"
  ],
  "allowedScopes": [
    "read:work-orders",
    "write:work-orders",
    "read:materials"
  ],
  "isConfidential": true
}

Response:
{
  "success": true,
  "message": "OAuth client created successfully",
  "data": {
    "clientId": "oauth_client_abc123xyz789",
    "clientSecret": "YOUR_SECRET_KEEP_THIS_SAFE",
    "name": "My Integration App",
    "redirectUris": [...],
    "allowedScopes": [...],
    "createdAt": "2024-01-15T10:00:00Z",
    "note": "Save the client secret now - it will not be shown again"
  }
}
```

**Important:**
- Save `clientSecret` immediately - not shown again
- Keep secret in secure vault (AWS Secrets Manager, HashiCorp Vault)
- Never commit to version control
- Rotate periodically

### Manage OAuth Clients

**List clients:**
```bash
GET /admin/oauth/clients

Response:
{
  "success": true,
  "data": [
    {
      "clientId": "oauth_client_abc123xyz789",
      "name": "My Integration App",
      "redirectUris": ["https://myapp.com/callback"],
      "allowedScopes": ["read:*", "write:*"],
      "isConfidential": true,
      "isActive": true,
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    },
    ...
  ]
}
```

**Get client details:**
```bash
GET /admin/oauth/clients/:clientId
```

**Update client:**
```bash
PATCH /admin/oauth/clients/:clientId

{
  "name": "Updated App Name",
  "redirectUris": ["https://newdomain.com/callback"],
  "allowedScopes": ["read:*"],
  "isActive": true
}
```

**Deactivate client:**
```bash
PATCH /admin/oauth/clients/:clientId

{
  "isActive": false
}
```

All tokens issued to inactive client will be rejected.

**Delete client:**
```bash
DELETE /admin/oauth/clients/:clientId
```

## OAuth Scopes

Scopes define what permissions an OAuth application has:

### Available Scopes

```
read:work-orders      - View work orders
write:work-orders     - Create/update work orders
read:materials        - View materials
write:materials       - Create/update materials
read:operations       - View operations
write:operations      - Create/update operations
read:products         - View products
write:products        - Create/update products
read:users            - View user profile
write:users           - Update user profile
read:*                - All read operations
write:*               - All write operations
*                     - Full access
```

### Scope Hierarchy

```
read:*
├── read:work-orders
├── read:materials
├── read:operations
├── read:products
└── read:users

write:*
├── write:work-orders
├── write:materials
├── write:operations
├── write:products
└── write:users
```

### Request Scopes

In Authorization Code flow:
```
GET /oauth/authorize?
  scope=read:work-orders%20write:work-orders%20read:materials
```

In Client Credentials flow:
```
POST /oauth/token
{
  "scope": "read:work-orders write:work-orders"
}
```

**Best Practice:** Request only scopes your app needs.

## Implementing OAuth in Your App

### JavaScript/Node.js Example

```javascript
// Install dependencies
npm install express axios dotenv

// .env file
CLIENT_ID=oauth_client_abc123xyz789
CLIENT_SECRET=your_secret_key
REDIRECT_URI=http://localhost:3000/callback
```

**Complete flow:**

```javascript
const express = require('express');
const axios = require('axios');

const app = express();

// Step 1: Redirect to authorization endpoint
app.get('/connect', (req, res) => {
  const authUrl = new URL('https://api.example.com/oauth/authorize');
  authUrl.searchParams.append('client_id', process.env.CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', process.env.REDIRECT_URI);
  authUrl.searchParams.append('scope', 'read:work-orders write:work-orders');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('state', generateRandomState());

  res.redirect(authUrl.toString());
});

// Step 2: Handle callback and exchange code for token
app.get('/callback', async (req, res) => {
  const { code, state } = req.query;

  // Verify state matches (CSRF protection)
  if (!isValidState(state)) {
    return res.status(400).send('Invalid state parameter');
  }

  try {
    // Exchange code for token
    const response = await axios.post('https://api.example.com/oauth/token', {
      grant_type: 'authorization_code',
      code,
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      redirect_uri: process.env.REDIRECT_URI
    });

    const { access_token, refresh_token, expires_in } = response.data;

    // Store tokens securely (in session or database)
    req.session.accessToken = access_token;
    req.session.refreshToken = refresh_token;
    req.session.expiresAt = Date.now() + expires_in * 1000;

    res.redirect('/dashboard');
  } catch (error) {
    res.status(500).send('Token exchange failed');
  }
});

// Step 3: Use access token for API calls
app.get('/api-data', async (req, res) => {
  try {
    const response = await axios.get(
      'https://api.example.com/api/v2/work-orders',
      {
        headers: {
          Authorization: `Bearer ${req.session.accessToken}`
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    if (error.response?.status === 401) {
      // Token expired, refresh it
      await refreshToken(req);
      // Retry the request
    }
  }
});

// Refresh access token
async function refreshToken(req) {
  const response = await axios.post('https://api.example.com/oauth/token', {
    grant_type: 'refresh_token',
    refresh_token: req.session.refreshToken,
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET
  });

  req.session.accessToken = response.data.access_token;
  req.session.expiresAt = Date.now() + response.data.expires_in * 1000;
}

app.listen(3000);
```

### Python Example

```python
# Install dependencies
pip install flask requests python-dotenv

# .env file
CLIENT_ID=oauth_client_abc123xyz789
CLIENT_SECRET=your_secret_key
REDIRECT_URI=http://localhost:5000/callback
```

**Complete flow:**

```python
import os
import requests
from flask import Flask, session, redirect, request, url_for
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = 'change_me'

@app.route('/connect')
def connect():
    auth_url = 'https://api.example.com/oauth/authorize'
    params = {
        'client_id': os.getenv('CLIENT_ID'),
        'redirect_uri': os.getenv('REDIRECT_URI'),
        'scope': 'read:work-orders write:work-orders',
        'response_type': 'code'
    }

    return redirect(f"{auth_url}?{'&'.join([f'{k}={v}' for k, v in params.items()])}")

@app.route('/callback')
def callback():
    code = request.args.get('code')

    # Exchange code for token
    token_response = requests.post(
        'https://api.example.com/oauth/token',
        json={
            'grant_type': 'authorization_code',
            'code': code,
            'client_id': os.getenv('CLIENT_ID'),
            'client_secret': os.getenv('CLIENT_SECRET'),
            'redirect_uri': os.getenv('REDIRECT_URI')
        }
    )

    token_data = token_response.json()
    session['access_token'] = token_data['access_token']
    session['refresh_token'] = token_data['refresh_token']

    return redirect(url_for('dashboard'))

@app.route('/api-data')
def api_data():
    headers = {'Authorization': f"Bearer {session['access_token']}"}

    response = requests.get(
        'https://api.example.com/api/v2/work-orders',
        headers=headers
    )

    return response.json()

if __name__ == '__main__':
    app.run(debug=True)
```

## Security Best Practices

### Client Credentials Security

```
❌ DON'T:
- Store secret in frontend code
- Commit to version control
- Share with users
- Log the secret
- Use same secret across environments

✅ DO:
- Store in environment variables
- Use secrets management system (AWS Secrets Manager, Vault)
- Rotate regularly (every 90 days)
- Use different secrets per environment
- Limit secret access to authorized personnel only
```

### Token Handling

```
❌ DON'T:
- Store in localStorage (XSS vulnerable)
- Log tokens
- Pass in URLs
- Share tokens

✅ DO:
- Store in memory for SPAs
- Use httpOnly cookies for web apps
- Store in secure storage on mobile
- Use short-lived tokens (1 hour)
- Implement refresh token rotation
```

### Authorization Code Flow Security

```
❌ DON'T:
- Skip state parameter validation
- Allow multiple redirect URIs
- Trust user input
- Log authorization codes

✅ DO:
- Use state parameter (CSRF protection)
- Register exact redirect URIs
- Validate all inputs
- Use HTTPS only
- Implement PKCE for mobile apps
```

### Token Expiration

```javascript
// Always check expiration
if (Date.now() > session.expiresAt) {
  // Refresh the token
  await refreshToken(session);
}

// Implement automatic refresh
setInterval(() => {
  if (shouldRefresh(session)) {
    refreshToken(session);
  }
}, 5 * 60 * 1000); // Check every 5 minutes
```

## Token Revocation

### Revoke Access Token

```bash
POST /oauth/revoke

{
  "token": "ACCESS_TOKEN",
  "token_type_hint": "access",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET"
}

Response: 200 OK
```

### Revoke Refresh Token

```bash
POST /oauth/revoke

{
  "token": "REFRESH_TOKEN",
  "token_type_hint": "refresh",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET"
}

Response: 200 OK
```

**Automatic revocation:**
- Tokens expire automatically (access: 1 hour, refresh: 30 days)
- Deactivating OAuth client revokes all issued tokens

## OAuth Statistics

### Get Token Statistics (Admin)

```bash
GET /admin/oauth/stats

Response:
{
  "success": true,
  "data": {
    "totalTokensIssued": 1523,
    "activeTokens": 287,
    "revokedTokens": 156,
    "expiredTokens": 1080
  }
}
```

## Troubleshooting

### "Invalid client" Error

```
{
  "error": "invalid_client",
  "error_description": "Client authentication failed"
}
```

**Solutions:**
1. Check client_id is correct
2. Verify client is active: `GET /admin/oauth/clients/:clientId`
3. Check client_secret matches (for confidential clients)
4. Ensure client hasn't been deleted

### "Invalid redirect URI" Error

```
{
  "error": "invalid_request",
  "error_description": "Redirect URI not registered"
}
```

**Solutions:**
1. Check redirect URI exactly matches registration
2. Update client if needed: `PATCH /admin/oauth/clients/:clientId`
3. Must be HTTPS in production (http allowed for localhost only)

### "Invalid scope" Error

```
{
  "error": "invalid_scope",
  "error_description": "Invalid scopes"
}
```

**Solutions:**
1. Check requested scope in allowed scopes: `GET /admin/oauth/clients/:clientId`
2. Request scopes in this format: `read:work-orders write:work-orders`
3. Check scope spelling (case-sensitive)

### "Token expired" Error

```
{
  "error": "Unauthorized",
  "message": "Access token has expired"
}
```

**Solutions:**
1. Use refresh token to get new access token
2. Check expiration time in response: `X-Token-Expires: TIMESTAMP`
3. Implement automatic token refresh

## Best Practices

1. **Always use HTTPS** - Never use OAuth over HTTP
2. **Validate state parameter** - Protect against CSRF attacks
3. **Use short-lived tokens** - Limit exposure if token compromised
4. **Implement refresh token rotation** - Get new refresh token on refresh
5. **Store secrets securely** - Never expose in code
6. **Log security events** - Track token generation and revocation
7. **Monitor token usage** - Alert on unusual patterns
8. **Implement token expiration** - Automatic cleanup of old tokens

## Compliance & Standards

- ✅ **RFC 6749** - OAuth 2.0 Authorization Framework
- ✅ **RFC 6750** - OAuth 2.0 Bearer Token Usage
- ✅ **RFC 6819** - OAuth 2.0 Threat Model and Security Considerations
- ✅ **PKCE** - Proof Key for Public Clients (coming in Phase 4.1)
- ✅ **OpenID Connect** - Future phase

## Support

For OAuth integration help:
- Documentation: https://docs.example.com/oauth
- Email: support@example.com
- Status: https://status.example.com

