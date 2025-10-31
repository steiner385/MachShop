# OAuth 2.0/OpenID Connect Integration (Issue #132)

## Overview

This document describes the OAuth 2.0/OpenID Connect (OIDC) integration implemented for the MachShop MES system. This implementation provides modern, standards-based authentication for enterprise identity providers and cloud-based authentication services.

## Features

### Core OAuth 2.0/OIDC Support
- **Authorization Code Flow**: Standard OAuth 2.0 authorization code grant
- **PKCE (Proof Key for Code Exchange)**: Enhanced security for public clients
- **JWT Token Handling**: ID tokens, access tokens, and refresh tokens
- **Discovery Document Support**: Automatic configuration via OIDC discovery
- **Token Validation**: JWT signature verification and claims validation

### Supported Identity Providers
- Azure AD/Entra ID (OIDC)
- Google Workspace/Cloud Identity
- Auth0
- Okta (OIDC)
- AWS Cognito
- Keycloak
- Generic OIDC providers

### Security Features
- **State Parameter**: CSRF protection for authorization flows
- **Nonce Validation**: Replay attack prevention for ID tokens
- **PKCE Support**: Enhanced security for authorization code flow
- **Token Refresh**: Automatic access token renewal
- **Secure Storage**: Encrypted token storage and session management

## Architecture

### Database Schema

The OIDC implementation uses three main database tables:

#### OidcConfig
Stores OIDC provider configurations:
```sql
- id: Unique identifier
- name: Human-readable provider name
- clientId: OAuth client ID
- clientSecret: OAuth client secret (encrypted)
- issuer: OIDC issuer URL
- discoveryUrl: OIDC discovery document URL
- authorizationEndpoint: Authorization endpoint URL
- tokenEndpoint: Token endpoint URL
- userinfoEndpoint: UserInfo endpoint URL
- jwksUri: JSON Web Key Set URI
- scopes: Default OAuth scopes
- responseType: OAuth response type (default: "code")
- responseMode: OAuth response mode (default: "query")
- usePkce: Enable PKCE (default: true)
- claimsMapping: Custom claims mapping configuration
- groupClaimsPath: Path to groups claim in token
- isActive: Configuration status
```

#### OidcSession
Tracks active OIDC authentication sessions:
```sql
- id: Session identifier
- userId: Associated user ID
- sub: OIDC subject identifier
- accessToken: OAuth access token
- refreshToken: OAuth refresh token
- idToken: OIDC ID token
- tokenType: Token type (default: "Bearer")
- expiresAt: Access token expiration
- refreshExpiresAt: Refresh token expiration
- configId: Associated OIDC configuration
- scopes: Granted OAuth scopes
```

#### OidcAuthState
Temporary storage for authorization flow state:
```sql
- id: State identifier
- state: OAuth state parameter
- codeVerifier: PKCE code verifier
- nonce: OIDC nonce value
- redirectUri: Callback redirect URI
- configId: Associated OIDC configuration
- expiresAt: State expiration (10 minutes)
```

### Service Layer

#### OidcService
The main service class handling OIDC operations:

**Key Methods:**
- `initiateAuth(request)`: Start OAuth authorization flow
- `handleCallback(code, state, redirectUri)`: Process authorization callback
- `refreshToken(sessionId)`: Refresh access tokens
- `validateIdToken(idToken, configId)`: Validate JWT ID tokens
- `revokeSession(sessionId)`: Logout and revoke tokens
- `testConnection(configId)`: Test provider connectivity
- `discoverProvider(issuerUrl)`: Auto-discover provider configuration

## API Endpoints

### Public Authentication Endpoints

#### POST /api/v1/sso/oidc/authorize
Initiate OIDC authentication flow.

**Request:**
```json
{
  "configId": "provider-config-id",
  "redirectUri": "https://app.example.com/callback",
  "scopes": ["openid", "profile", "email"],
  "state": "optional-state",
  "nonce": "optional-nonce"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "authUrl": "https://provider.com/auth?client_id=...",
    "state": "generated-state",
    "nonce": "generated-nonce"
  }
}
```

#### GET /api/v1/sso/oidc/callback
Handle OAuth authorization callback.

**Query Parameters:**
- `code`: Authorization code from provider
- `state`: State parameter for CSRF protection
- `error`: OAuth error code (if error occurred)

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "roles": ["user"],
      "permissions": []
    },
    "session": {
      "id": "session-id",
      "expiresAt": "2024-12-01T10:00:00Z"
    },
    "tokens": {
      "accessToken": "access-token",
      "refreshToken": "refresh-token",
      "tokenType": "Bearer",
      "expiresIn": 3600
    }
  }
}
```

#### POST /api/v1/sso/oidc/refresh
Refresh access token using refresh token.

**Request:**
```json
{
  "sessionId": "session-id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tokens": {
      "accessToken": "new-access-token",
      "refreshToken": "new-refresh-token",
      "tokenType": "Bearer",
      "expiresIn": 3600
    }
  }
}
```

#### POST /api/v1/sso/oidc/logout
Logout and revoke OIDC session.

**Request:**
```json
{
  "sessionId": "session-id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

### Admin Configuration Endpoints

#### GET /api/v1/admin/oidc/configs
List all OIDC configurations.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "config-id",
      "name": "Azure AD",
      "issuer": "https://login.microsoftonline.com/tenant/v2.0",
      "scopes": ["openid", "profile", "email"],
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /api/v1/admin/oidc/configs
Create new OIDC configuration.

**Request:**
```json
{
  "name": "Google Workspace",
  "clientId": "google-client-id",
  "clientSecret": "google-client-secret",
  "issuer": "https://accounts.google.com",
  "discoveryUrl": "https://accounts.google.com/.well-known/openid_configuration",
  "scopes": ["openid", "profile", "email"],
  "usePkce": true,
  "claimsMapping": {
    "firstName": "given_name",
    "lastName": "family_name"
  },
  "groupClaimsPath": "groups"
}
```

#### POST /api/v1/admin/oidc/discovery
Discover OIDC provider configuration.

**Request:**
```json
{
  "issuerUrl": "https://login.microsoftonline.com/tenant/v2.0"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "issuer": "https://login.microsoftonline.com/tenant/v2.0",
    "authorization_endpoint": "https://login.microsoftonline.com/tenant/oauth2/v2.0/authorize",
    "token_endpoint": "https://login.microsoftonline.com/tenant/oauth2/v2.0/token",
    "userinfo_endpoint": "https://graph.microsoft.com/oidc/userinfo",
    "jwks_uri": "https://login.microsoftonline.com/tenant/discovery/v2.0/keys",
    "scopes_supported": ["openid", "profile", "email"],
    "response_types_supported": ["code", "id_token", "token"]
  }
}
```

## Configuration Examples

### Azure AD/Entra ID

```json
{
  "name": "Azure AD",
  "clientId": "your-azure-client-id",
  "clientSecret": "your-azure-client-secret",
  "issuer": "https://login.microsoftonline.com/{tenant-id}/v2.0",
  "discoveryUrl": "https://login.microsoftonline.com/{tenant-id}/v2.0/.well-known/openid_configuration",
  "scopes": ["openid", "profile", "email"],
  "usePkce": true,
  "claimsMapping": {
    "firstName": "given_name",
    "lastName": "family_name",
    "email": "email"
  },
  "groupClaimsPath": "groups"
}
```

### Google Workspace

```json
{
  "name": "Google Workspace",
  "clientId": "your-google-client-id.googleusercontent.com",
  "clientSecret": "your-google-client-secret",
  "issuer": "https://accounts.google.com",
  "discoveryUrl": "https://accounts.google.com/.well-known/openid_configuration",
  "scopes": ["openid", "profile", "email"],
  "usePkce": true,
  "claimsMapping": {
    "firstName": "given_name",
    "lastName": "family_name",
    "email": "email",
    "picture": "picture"
  }
}
```

### Auth0

```json
{
  "name": "Auth0",
  "clientId": "your-auth0-client-id",
  "clientSecret": "your-auth0-client-secret",
  "issuer": "https://your-domain.auth0.com/",
  "discoveryUrl": "https://your-domain.auth0.com/.well-known/openid_configuration",
  "scopes": ["openid", "profile", "email"],
  "usePkce": true,
  "claimsMapping": {
    "firstName": "given_name",
    "lastName": "family_name",
    "email": "email"
  },
  "groupClaimsPath": "https://example.com/roles"
}
```

## Claims Mapping

The OIDC implementation supports flexible claims mapping to accommodate different provider token formats.

### Configuration

Claims mapping is configured in the `claimsMapping` field of the OIDC configuration:

```json
{
  "claimsMapping": {
    "firstName": "given_name",
    "lastName": "family_name",
    "email": "email",
    "department": "custom_department",
    "title": "job_title"
  }
}
```

### Nested Claims

For nested claims, use dot notation:

```json
{
  "claimsMapping": {
    "firstName": "profile.firstName",
    "department": "organization.department"
  }
}
```

### Group Claims

Configure group claims extraction using the `groupClaimsPath` field:

```json
{
  "groupClaimsPath": "groups"
}
```

For nested group claims:
```json
{
  "groupClaimsPath": "profile.groups"
}
```

## User Provisioning

### Automatic User Creation

When a user authenticates via OIDC for the first time, the system automatically creates a user record with:

- Email from OIDC claims
- First and last name from mapped claims
- Username set to email address
- Default "user" role assigned
- Empty password hash (OIDC users don't need passwords)

### User Updates

On subsequent logins, the system updates user information with the latest data from OIDC claims, including:

- First and last name
- Last login timestamp

### Role Mapping

Future enhancement: Map OIDC groups to MES roles automatically based on configuration.

## Security Considerations

### PKCE (Proof Key for Code Exchange)

PKCE is enabled by default and provides additional security for the authorization code flow:

1. Client generates a `code_verifier` (random string)
2. Client generates a `code_challenge` (SHA256 hash of verifier)
3. Authorization request includes `code_challenge`
4. Token exchange includes `code_verifier` for verification

### State Parameter

The state parameter provides CSRF protection:
- Generated for each authorization request
- Stored server-side with expiration
- Validated on callback to ensure request integrity

### Nonce Validation

ID token nonce validation prevents replay attacks:
- Generated for each authorization request
- Included in ID token by provider
- Validated on token receipt

### Token Storage

- Access tokens stored encrypted in database
- Refresh tokens stored encrypted in database
- Session data includes expiration timestamps
- Automatic cleanup of expired sessions

## Troubleshooting

### Common Issues

#### Discovery Fails
**Symptoms:** Provider discovery returns errors
**Solutions:**
- Verify issuer URL is correct and accessible
- Check network connectivity to provider
- Ensure provider supports OIDC discovery

#### Authentication Redirects Fail
**Symptoms:** Users not redirected after authentication
**Solutions:**
- Verify redirect URI is registered with provider
- Check redirect URI matches exactly (including protocol)
- Ensure callback endpoint is accessible

#### Token Validation Fails
**Symptoms:** ID token validation errors
**Solutions:**
- Verify client ID matches token audience
- Check token signature against JWKS
- Ensure system clock is synchronized

#### User Creation Fails
**Symptoms:** Users can't be provisioned automatically
**Solutions:**
- Verify required claims (email) are available
- Check claims mapping configuration
- Ensure database permissions for user creation

### Debugging

Enable debug logging by setting log level to debug in the OIDC service:

```typescript
logger.debug('OIDC authentication initiated', {
  configId,
  state,
  scopes
});
```

## Migration from Existing SSO

If migrating from the generic SSO system to dedicated OIDC:

1. **Export existing configurations**: Document current provider settings
2. **Create OIDC configurations**: Use the admin API to create equivalent OIDC configs
3. **Test authentication flows**: Verify each provider works correctly
4. **Update frontend**: Point authentication flows to new OIDC endpoints
5. **Migrate user sessions**: Optional - existing sessions can coexist

## Performance Considerations

### Caching

The OIDC service caches:
- Provider discovery documents (per configuration)
- OIDC clients (per configuration)
- Issuer metadata (per configuration)

### Database Optimization

- Index on `OidcSession.userId` for user lookups
- Index on `OidcSession.expiresAt` for cleanup operations
- Index on `OidcAuthState.state` for callback validation
- Automatic cleanup of expired auth states

### Token Management

- Use refresh tokens to minimize token endpoint calls
- Implement token preemptive refresh (before expiration)
- Clean up expired sessions regularly

## Future Enhancements

### Planned Features
1. **Automatic role mapping** from OIDC groups
2. **Just-in-time (JIT) provisioning** configuration
3. **Multi-tenant support** for OIDC configurations
4. **Advanced claims transformation** with scripting
5. **SSO session federation** across multiple applications
6. **Admin dashboard** for OIDC management

### Integration Opportunities
- **Workflow system** integration for approval flows
- **Audit logging** for authentication events
- **Monitoring and alerting** for authentication failures
- **Analytics dashboard** for authentication metrics