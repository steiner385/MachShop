# SAML 2.0 Integration Guide

## Overview

This guide provides comprehensive instructions for implementing SAML 2.0 Single Sign-On (SSO) authentication in the Manufacturing Execution System (MES). SAML 2.0 integration enables enterprise-grade authentication with existing Identity Provider (IdP) systems.

**GitHub Issue:** [#131 - SAML 2.0 Integration](https://github.com/organization/repository/issues/131)

**Implementation Status:** ✅ Complete

---

## Table of Contents

1. [SAML 2.0 Overview](#saml-20-overview)
2. [Prerequisites](#prerequisites)
3. [System Architecture](#system-architecture)
4. [Configuration Setup](#configuration-setup)
5. [Identity Provider Setup](#identity-provider-setup)
6. [API Reference](#api-reference)
7. [User Provisioning](#user-provisioning)
8. [Session Management](#session-management)
9. [Single Logout (SLO)](#single-logout-slo)
10. [Testing and Validation](#testing-and-validation)
11. [Troubleshooting](#troubleshooting)
12. [Security Considerations](#security-considerations)
13. [Monitoring and Analytics](#monitoring-and-analytics)

---

## SAML 2.0 Overview

Security Assertion Markup Language (SAML) 2.0 is an XML-based standard for exchanging authentication and authorization data between identity providers and service providers.

### Key Concepts

- **Identity Provider (IdP)**: The system that authenticates users and provides identity assertions
- **Service Provider (SP)**: The MES application that relies on the IdP for authentication
- **Assertion**: XML document containing authentication and attribute information
- **Metadata**: XML document describing the capabilities and requirements of IdP/SP
- **Single Sign-On (SSO)**: Authentication mechanism allowing users to access multiple applications with one login
- **Single Logout (SLO)**: Mechanism to log users out from all connected applications

### SAML Flow

```
User → SP → IdP → User → IdP → SP → User
  1. User requests access to MES
  2. MES redirects to IdP for authentication
  3. User authenticates with IdP
  4. IdP sends SAML assertion back to MES
  5. MES validates assertion and creates session
  6. User gains access to MES
```

---

## Prerequisites

### Software Requirements

- Node.js 18+ with TypeScript support
- Express.js web framework
- PostgreSQL database
- SAML 2.0 compatible Identity Provider

### Dependencies

The following packages are required and included in the project:

```json
{
  "@node-saml/node-saml": "^5.1.0",
  "express": "^4.18.2",
  "jsonwebtoken": "^9.0.2",
  "@prisma/client": "^5.22.0"
}
```

### Database Schema

The SAML integration uses the following database models:

- `SamlConfig`: SAML configuration settings
- `SamlSession`: Active SAML user sessions
- `SamlAuthRequest`: Pending authentication requests

---

## System Architecture

### Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Identity      │    │      MES        │    │     Database    │
│   Provider      │◄──►│   Application   │◄──►│   (PostgreSQL)  │
│     (IdP)       │    │      (SP)       │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │
        │                       │
        ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│   SAML          │    │    Session      │
│   Assertions    │    │   Management    │
└─────────────────┘    └─────────────────┘
```

### Service Layer

- **SamlService**: Core SAML 2.0 functionality
- **SSO Routes**: Public authentication endpoints
- **SSO Admin Routes**: Administrative management endpoints
- **Session Management**: User session lifecycle

---

## Configuration Setup

### 1. Environment Variables

Configure the following environment variables:

```bash
# Base URL for SAML endpoints
BASE_URL=https://your-mes-domain.com

# JWT Configuration
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRE=1h
JWT_REFRESH_EXPIRE=7d

# Frontend URL for redirects
FRONTEND_URL=https://your-frontend-domain.com
```

### 2. SAML Service Configuration

The SAML service is configured with the following endpoints:

```typescript
const samlConfig = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3001',
  acsPath: '/api/v1/sso/saml/acs',        // Assertion Consumer Service
  metadataPath: '/api/v1/sso/saml/metadata', // SP Metadata
  sloPath: '/api/v1/sso/saml/slo'         // Single Logout
};
```

### 3. Database Configuration

Ensure the database schema is up to date:

```bash
npm run schema:build
npx prisma generate
npx prisma migrate dev
```

---

## Identity Provider Setup

### Step 1: Create SAML Configuration

Use the admin API to create a new SAML configuration:

```bash
curl -X POST https://your-mes-domain.com/api/v1/admin/sso/saml-configs \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Company SAML IdP",
    "entityId": "https://your-mes-domain.com/saml",
    "ssoUrl": "https://your-idp.com/saml/sso",
    "sloUrl": "https://your-idp.com/saml/slo",
    "certificate": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----",
    "privateKey": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----",
    "signRequests": true,
    "signAssertions": true,
    "nameIdFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
    "attributeMapping": {
      "email": "email",
      "firstName": "givenName",
      "lastName": "surname"
    },
    "clockTolerance": 300,
    "isActive": true
  }'
```

### Step 2: Download SP Metadata

Provide your IdP administrator with the Service Provider metadata:

```bash
curl https://your-mes-domain.com/api/v1/sso/saml/metadata/{CONFIG_ID} > sp-metadata.xml
```

### Step 3: Configure IdP

Configure your Identity Provider with the following information:

#### Required SP Settings

- **Entity ID**: `https://your-mes-domain.com/saml`
- **ACS URL**: `https://your-mes-domain.com/api/v1/sso/saml/acs?configId={CONFIG_ID}`
- **SLO URL**: `https://your-mes-domain.com/api/v1/sso/saml/slo`
- **Name ID Format**: `urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress`

#### Required Attributes

The following attributes must be included in SAML assertions:

| Attribute | SAML Claim | Required | Description |
|-----------|------------|----------|-------------|
| email | email | Yes | User's email address |
| firstName | givenName | No | User's first name |
| lastName | surname | No | User's last name |

#### Common IdP-Specific Configurations

##### Azure AD

1. Create Enterprise Application
2. Configure Single Sign-On with SAML
3. Set Identifier: `https://your-mes-domain.com/saml`
4. Set Reply URL: `https://your-mes-domain.com/api/v1/sso/saml/acs?configId={CONFIG_ID}`
5. Configure attribute claims

##### Okta

1. Create SAML 2.0 Web App
2. Set Single Sign-On URL: `https://your-mes-domain.com/api/v1/sso/saml/acs?configId={CONFIG_ID}`
3. Set Audience URI: `https://your-mes-domain.com/saml`
4. Configure attribute statements

##### ADFS

1. Add Relying Party Trust
2. Set Relying Party Identifier: `https://your-mes-domain.com/saml`
3. Set SAML 2.0 WebSSO Endpoint: `https://your-mes-domain.com/api/v1/sso/saml/acs?configId={CONFIG_ID}`
4. Configure claim rules

---

## API Reference

### Public SAML Endpoints

#### Authentication Endpoints

```http
GET /api/v1/sso/saml/login/{configId}
```
Initiates SAML authentication flow.

**Parameters:**
- `configId` (path): SAML configuration ID
- `RelayState` (query): Optional state to maintain across authentication
- `returnUrl` (query): Optional return URL after authentication

**Response:** Redirects to IdP login page

---

```http
POST /api/v1/sso/saml/acs
```
Assertion Consumer Service endpoint for processing SAML responses.

**Parameters:**
- `configId` (query): SAML configuration ID
- `SAMLResponse` (body): Base64-encoded SAML response
- `RelayState` (body): Optional relay state

**Response:** Redirects to frontend with authentication tokens

---

```http
GET /api/v1/sso/saml/metadata/{configId}
```
Service Provider metadata for IdP configuration.

**Parameters:**
- `configId` (path): SAML configuration ID

**Response:** XML metadata document

---

```http
POST /api/v1/sso/saml/slo
```
Single Logout endpoint.

**Body:**
```json
{
  "sessionId": "string",
  "nameId": "string",
  "sessionIndex": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "logoutUrl": "https://idp.example.com/slo?SAMLRequest=..."
  }
}
```

---

```http
POST /api/v1/sso/saml/validate-config/{configId}
```
Validates SAML configuration.

**Response:**
```json
{
  "success": true,
  "data": {
    "configId": "string",
    "isValid": true,
    "message": "Configuration is valid"
  }
}
```

### Administrative Endpoints

All administrative endpoints require authentication and `sso.admin.*` permissions.

#### Configuration Management

```http
GET /api/v1/admin/sso/saml-configs
```
List all SAML configurations.

**Query Parameters:**
- `isActive` (boolean): Filter by active status

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "name": "string",
      "entityId": "string",
      "isActive": true,
      "isValid": true,
      "activeSessions": 5,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 1
}
```

---

```http
POST /api/v1/admin/sso/saml-configs
```
Create new SAML configuration.

**Body:**
```json
{
  "name": "Company SAML IdP",
  "entityId": "https://your-mes-domain.com/saml",
  "ssoUrl": "https://idp.example.com/sso",
  "sloUrl": "https://idp.example.com/slo",
  "certificate": "-----BEGIN CERTIFICATE-----...",
  "privateKey": "-----BEGIN PRIVATE KEY-----...",
  "signRequests": true,
  "signAssertions": true,
  "nameIdFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
  "attributeMapping": {
    "email": "email",
    "firstName": "givenName",
    "lastName": "surname"
  },
  "clockTolerance": 300,
  "isActive": true
}
```

---

```http
PUT /api/v1/admin/sso/saml-configs/{id}
```
Update SAML configuration.

---

```http
DELETE /api/v1/admin/sso/saml-configs/{id}
```
Delete SAML configuration (only if no active sessions exist).

#### Session Management

```http
GET /api/v1/admin/sso/saml-sessions
```
List SAML sessions with filtering and pagination.

**Query Parameters:**
- `configId` (string): Filter by configuration
- `userId` (string): Filter by user
- `limit` (number): Results per page (default: 50)
- `offset` (number): Pagination offset (default: 0)

---

```http
DELETE /api/v1/admin/sso/saml-sessions/{id}
```
Terminate specific SAML session.

#### Maintenance

```http
POST /api/v1/admin/sso/saml-cleanup
```
Clean up expired sessions and auth requests.

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "SAML cleanup completed",
    "activeSessions": 10,
    "activeAuthRequests": 2,
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

---

## User Provisioning

### Just-In-Time (JIT) Provisioning

The system supports automatic user creation when users authenticate via SAML for the first time.

#### Process Flow

1. User authenticates with IdP
2. SAML assertion is received and validated
3. System searches for existing user by email
4. If user doesn't exist, creates new user with attributes from assertion
5. If user exists, updates attributes from assertion
6. Creates SAML session and returns authentication tokens

#### Attribute Mapping

Configure attribute mapping in the SAML configuration:

```json
{
  "attributeMapping": {
    "email": "email",           // Maps SAML 'email' to user email
    "firstName": "givenName",   // Maps SAML 'givenName' to firstName
    "lastName": "surname",      // Maps SAML 'surname' to lastName
    "department": "department", // Maps SAML 'department' to user metadata
    "role": "role"             // Maps SAML 'role' to user role
  }
}
```

#### Custom Attribute Processing

For advanced attribute processing, extend the `findOrCreateUser` method in `SamlService`:

```typescript
// Example: Custom role mapping
const userRole = this.mapSamlRoleToMesRole(assertion.attributes.role);
const userData = {
  ...basicUserData,
  roles: [userRole],
  customAttributes: assertion.attributes
};
```

---

## Session Management

### Session Lifecycle

1. **Creation**: Session created after successful SAML assertion validation
2. **Validation**: Sessions validated on each request using JWT tokens
3. **Renewal**: Sessions can be renewed using refresh tokens
4. **Expiration**: Sessions expire after 8 hours by default
5. **Cleanup**: Expired sessions are automatically cleaned up

### Session Data

SAML sessions store the following information:

```typescript
interface SamlSession {
  id: string;
  userId: string;
  sessionIndex?: string;     // IdP session index
  nameId: string;           // SAML NameID
  nameIdFormat: string;     // NameID format
  assertionId: string;      // Unique assertion identifier
  configId: string;         // SAML configuration used
  attributes: object;       // User attributes from assertion
  expiresAt: Date;         // Session expiration
  createdAt: Date;         // Session creation time
}
```

### JWT Token Structure

Authentication tokens include SAML-specific information:

```json
{
  "userId": "user-123",
  "username": "john.doe",
  "email": "john.doe@company.com",
  "roles": ["user", "operator"],
  "permissions": ["read", "write"],
  "sessionId": "saml-session-123",
  "authType": "sso",
  "isSystemAdmin": false,
  "iat": 1640995200,
  "exp": 1640998800
}
```

---

## Single Logout (SLO)

### SLO Process

1. User initiates logout from MES or IdP
2. MES calls SAML SLO endpoint
3. System terminates local session
4. Redirects user to IdP for global logout
5. IdP terminates sessions across all connected applications

### Implementation

#### Initiate SLO from MES

```javascript
// Frontend logout function
async function logoutUser(sessionId, nameId) {
  const response = await fetch('/api/v1/sso/saml/slo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, nameId })
  });

  const result = await response.json();
  if (result.success) {
    window.location.href = result.data.logoutUrl;
  }
}
```

#### Handle IdP-Initiated SLO

For IdP-initiated SLO, configure your IdP to send SLO requests to:
```
POST https://your-mes-domain.com/api/v1/sso/saml/slo
```

---

## Testing and Validation

### Configuration Testing

Use the built-in configuration testing endpoint:

```bash
curl -X POST https://your-mes-domain.com/api/v1/admin/sso/saml-configs/{CONFIG_ID}/test \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Expected response:
```json
{
  "success": true,
  "data": {
    "configId": "config-123",
    "isValid": true,
    "metadataGenerated": true,
    "metadataError": null,
    "tests": {
      "configurationValid": true,
      "metadataGeneration": true
    }
  }
}
```

### Manual Testing Process

1. **Configuration Test**: Verify SAML configuration is valid
2. **Metadata Test**: Download and verify SP metadata
3. **Authentication Test**: Complete full authentication flow
4. **Session Test**: Verify session creation and management
5. **Logout Test**: Test single logout functionality

### Unit Tests

Run the comprehensive SAML unit tests:

```bash
npm run test src/tests/services/SamlService.test.ts
```

### Integration Tests

Run SAML integration tests:

```bash
npm run test src/tests/integration/saml.test.ts
```

---

## Troubleshooting

### Common Issues

#### 1. Metadata Generation Fails

**Error**: `METADATA_GENERATION_FAILED`

**Causes:**
- Invalid certificate format
- Missing required configuration fields
- Incorrect entity ID

**Solution:**
- Verify certificate is in PEM format
- Check all required fields are populated
- Ensure entity ID matches SP identifier in IdP

#### 2. SAML Assertion Validation Fails

**Error**: `ASSERTION_PROCESSING_FAILED`

**Causes:**
- Clock skew between SP and IdP
- Invalid signature
- Assertion replay attack
- Incorrect audience or recipient

**Solution:**
- Adjust `clockTolerance` setting (default: 300 seconds)
- Verify IdP certificate is correct
- Check assertion ID uniqueness
- Validate audience and recipient URLs

#### 3. User Provisioning Fails

**Error**: `USER_PROVISIONING_FAILED`

**Causes:**
- Missing email attribute in assertion
- Invalid attribute mapping
- Database constraints violation

**Solution:**
- Verify IdP sends required attributes
- Check attribute mapping configuration
- Review user creation constraints

#### 4. Session Not Created

**Error**: Session creation fails after successful authentication

**Causes:**
- Database connection issues
- Invalid session data
- JWT configuration problems

**Solution:**
- Check database connectivity
- Verify session data structure
- Validate JWT secret configuration

### Debug Mode

Enable debug logging by setting environment variable:

```bash
DEBUG=saml:* npm start
```

### Log Analysis

Monitor SAML-related logs:

```bash
# Authentication requests
grep "SAML authentication request" /var/log/mes/application.log

# Assertion processing
grep "SAML assertion processing" /var/log/mes/application.log

# Session management
grep "SAML session" /var/log/mes/application.log
```

---

## Security Considerations

### Certificate Management

1. **Use Strong Certificates**
   - Minimum 2048-bit RSA keys
   - SHA-256 signature algorithm
   - Valid certificate chain

2. **Certificate Rotation**
   - Plan regular certificate rotation
   - Update both SP and IdP configurations
   - Test before production deployment

3. **Private Key Security**
   - Store private keys securely
   - Limit access to authorized personnel
   - Consider hardware security modules (HSMs)

### Assertion Security

1. **Signature Validation**
   - Always validate assertion signatures
   - Verify certificate chain
   - Check signature algorithms

2. **Replay Attack Prevention**
   - Track assertion IDs
   - Implement time-based validation
   - Use appropriate clock tolerance

3. **Audience Validation**
   - Verify assertion audience
   - Check recipient URLs
   - Validate InResponseTo values

### Transport Security

1. **HTTPS Only**
   - All SAML endpoints must use HTTPS
   - Implement HSTS headers
   - Use strong TLS configurations

2. **Network Security**
   - Implement firewall rules
   - Use VPN for sensitive environments
   - Monitor network traffic

### Session Security

1. **Session Management**
   - Use secure session storage
   - Implement session timeouts
   - Regular session cleanup

2. **Token Security**
   - Use strong JWT secrets
   - Implement token rotation
   - Set appropriate expiration times

---

## Monitoring and Analytics

### Metrics to Monitor

1. **Authentication Metrics**
   - Successful authentication rate
   - Failed authentication attempts
   - Authentication response times

2. **Session Metrics**
   - Active session count
   - Session duration
   - Session termination reasons

3. **Error Metrics**
   - Configuration validation errors
   - Assertion processing errors
   - Certificate validation failures

### Monitoring Tools

#### Built-in Analytics

The system includes built-in SAML analytics accessible via:

```bash
curl https://your-mes-domain.com/api/v1/admin/sso/analytics \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### Custom Monitoring

Set up custom monitoring using the event system:

```typescript
samlService.on('authenticationSuccessful', (event) => {
  // Log successful authentication
  metrics.increment('saml.auth.success');
});

samlService.on('authenticationFailed', (event) => {
  // Log failed authentication
  metrics.increment('saml.auth.failure');
});
```

### Alerting

Set up alerts for:

- High authentication failure rates
- Certificate expiration warnings
- Configuration validation failures
- Unexpected session terminations

---

## Migration from Other SSO Methods

### From Azure AD Direct Integration

1. Create SAML configuration using existing Azure AD application
2. Update frontend to use SAML endpoints
3. Migrate existing sessions gradually
4. Decommission old Azure AD integration

### From OAuth 2.0/OpenID Connect

1. Configure IdP for SAML 2.0 support
2. Create parallel SAML configuration
3. Test SAML flow thoroughly
4. Switch frontend to SAML endpoints
5. Remove OAuth/OIDC configuration

---

## Performance Optimization

### Caching

1. **SAML Instance Caching**
   - SAML configurations are cached in memory
   - Reduces database queries
   - Improves response times

2. **Metadata Caching**
   - Generated metadata is cached
   - Reduces CPU overhead
   - Enables faster IdP requests

### Database Optimization

1. **Index Configuration**
   - Index on frequently queried fields
   - Optimize session lookup queries
   - Regular database maintenance

2. **Connection Pooling**
   - Use appropriate pool sizes
   - Monitor connection usage
   - Optimize query patterns

---

## Support and Resources

### Documentation

- [SSO Administration Guide](./SSO_ADMINISTRATION_GUIDE.md)
- [Azure AD Integration Guide](./AZURE_AD_INTEGRATION_GUIDE.md)
- [System Architecture](./SYSTEM_ARCHITECTURE.md)

### Community Resources

- [SAML 2.0 Specification](https://docs.oasis-open.org/security/saml/v2.0/)
- [Node SAML Documentation](https://github.com/node-saml/node-saml)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

### Professional Support

For enterprise support and custom implementations:
- Email: support@mes-system.com
- Documentation: https://docs.mes-system.com
- GitHub Issues: https://github.com/organization/repository/issues

---

## Appendices

### Appendix A: Sample Configurations

#### Azure AD Configuration

```json
{
  "name": "Azure AD SAML",
  "entityId": "https://your-mes-domain.com/saml",
  "ssoUrl": "https://login.microsoftonline.com/YOUR_TENANT_ID/saml2",
  "sloUrl": "https://login.microsoftonline.com/YOUR_TENANT_ID/saml2",
  "nameIdFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
  "attributeMapping": {
    "email": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
    "firstName": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname",
    "lastName": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname"
  }
}
```

#### Okta Configuration

```json
{
  "name": "Okta SAML",
  "entityId": "https://your-mes-domain.com/saml",
  "ssoUrl": "https://your-org.okta.com/app/your-app-id/sso/saml",
  "sloUrl": "https://your-org.okta.com/app/your-app-id/slo/saml",
  "nameIdFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
  "attributeMapping": {
    "email": "email",
    "firstName": "firstName",
    "lastName": "lastName"
  }
}
```

### Appendix B: Certificate Generation

Generate self-signed certificates for testing:

```bash
# Generate private key
openssl genrsa -out saml-private.key 2048

# Generate certificate
openssl req -new -x509 -key saml-private.key -out saml-cert.pem -days 365

# Convert to PEM format if needed
openssl x509 -in saml-cert.pem -out saml-cert-formatted.pem
```

### Appendix C: Error Codes Reference

| Error Code | Description | Resolution |
|------------|-------------|------------|
| `METADATA_GENERATION_FAILED` | SP metadata generation failed | Check configuration and certificates |
| `MISSING_SAML_RESPONSE` | SAML response not provided | Verify IdP sends response to ACS URL |
| `INVALID_ASSERTION` | SAML assertion validation failed | Check signatures and time constraints |
| `REPLAY_ATTACK` | Assertion ID already used | Verify assertion uniqueness implementation |
| `USER_PROVISIONING_FAILED` | User creation/update failed | Check attribute mapping and database constraints |
| `SAML_CONFIG_VALIDATION_ERROR` | Configuration validation failed | Verify all required fields are present |
| `SAML_SESSION_NOT_FOUND` | Session not found for SLO | Check session ID and expiration |

---

**Last Updated:** October 31, 2024
**Version:** 1.0.0
**Implementation Status:** ✅ Complete