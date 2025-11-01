# Saviynt IDM Surrogate - Testing Infrastructure

## Overview

The Saviynt IDM Surrogate is a comprehensive mock implementation of Saviynt Identity Management APIs designed to enable SSO and user provisioning workflow testing without requiring live Saviynt system access during CI/CD testing.

**Issue**: [#245 - Testing Infrastructure: Identity Management Surrogates (Saviynt IDM)](https://github.com/steiner385/MachShop/issues/245)

## Features

### Core Identity Management
- **User Lifecycle Management**: Provisioning, deprovisioning, and modification
- **Access Governance**: Role-based access control and policy enforcement
- **Role Management**: Role assignment, conflict detection, and certification
- **OAuth 2.0 Authentication**: Token generation, validation, and introspection
- **SAML 2.0 SSO**: Assertion generation with customizable attributes
- **Identity Analytics**: Compliance reporting and audit trails

### Advanced Capabilities
- **Segregation of Duties (SoD)**: Automatic conflict detection and reporting
- **Access Request Workflows**: Request creation and approval simulation
- **Audit Trail**: Comprehensive logging for compliance requirements
- **SCIM 2.0 Compatibility**: Standardized provisioning endpoint support
- **Automated User Provisioning**: Integration with existing authentication flows

### Standards Compliance
- **SCIM 2.0** for user provisioning
- **OAuth 2.0** / **OpenID Connect** for authentication
- **SAML 2.0** for SSO
- **RBAC** for access control
- **SOX compliance** for audit trails

## Architecture

### Service Layer
- `SaviyntIDMSurrogate.ts` - Core service implementing identity management logic
- In-memory data storage for fast testing
- Configurable behavior for different testing scenarios

### API Layer
- `saviynt-surrogate.ts` - RESTful API endpoints
- OAuth 2.0 and SAML 2.0 protocol implementations
- SCIM 2.0 compatible user provisioning endpoints

### Integration
- Mounted at `/api/v1/testing/saviynt-idm/` (no authentication required for testing)
- Service available as importable module for direct usage

## Configuration

### Basic Configuration
```typescript
import { SaviyntIDMSurrogate } from '../services/SaviyntIDMSurrogate';

const saviyntSurrogate = new SaviyntIDMSurrogate({
  mockMode: true,
  tenantId: 'your-tenant-id',
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  tokenExpirationMinutes: 60,
  enableAuditLogging: true,
  enforceSoD: true,
  autoProvisioningEnabled: true,
});
```

### Configuration Options
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mockMode` | boolean | true | Enable mock mode for testing |
| `tenantId` | string | required | Saviynt tenant identifier |
| `clientId` | string | required | OAuth client ID |
| `clientSecret` | string | required | OAuth client secret |
| `tokenExpirationMinutes` | number | 60 | Mock token expiration time |
| `enableAuditLogging` | boolean | true | Enable audit trail logging |
| `enforceSoD` | boolean | true | Enforce segregation of duties |
| `autoProvisioningEnabled` | boolean | true | Auto-provision users |

## API Reference

### Base URL
```
/api/v1/testing/saviynt-idm
```

### Authentication Endpoints

#### Generate OAuth Token
```http
POST /oauth/token
Content-Type: application/json

{
  "grant_type": "client_credentials",
  "client_id": "mes-test-client",
  "client_secret": "mes-test-secret-12345",
  "scope": "read write"
}
```

**Response:**
```json
{
  "access_token": "a1b2c3d4e5f6...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "r1e2f3r4e5s6h...",
  "scope": "read write"
}
```

#### Token Introspection
```http
POST /oauth/introspect
Content-Type: application/json

{
  "token": "a1b2c3d4e5f6..."
}
```

**Response:**
```json
{
  "active": true,
  "scope": "read write",
  "client_id": "mes-test-client",
  "username": "john.doe",
  "exp": 1635724800,
  "iat": 1635721200
}
```

#### Generate SAML Assertion
```http
POST /saml/assert
Content-Type: application/json

{
  "userId": "user-john-doe",
  "audience": "https://mes.company.com",
  "attributes": {
    "department": "Production",
    "clearanceLevel": "Standard"
  }
}
```

**Response:**
```json
{
  "success": true,
  "assertion": {
    "id": "saml-12345",
    "issuer": "saviynt-mes-testing-tenant",
    "audience": "https://mes.company.com",
    "subject": {
      "nameId": "john.doe@company.com",
      "format": "urn:oasis:names:tc:SAML:2.0:nameid-format:emailAddress"
    },
    "sessionIndex": "session-67890",
    "attributes": {
      "email": "john.doe@company.com",
      "firstName": "John",
      "lastName": "Doe",
      "department": "Production",
      "clearanceLevel": "Standard"
    },
    "notBefore": "2023-11-01T10:00:00Z",
    "notOnOrAfter": "2023-11-01T14:00:00Z",
    "signatureValid": true
  }
}
```

### User Management Endpoints

#### Provision User
```http
POST /users
Content-Type: application/json

{
  "username": "new.user",
  "firstName": "New",
  "lastName": "User",
  "email": "new.user@company.com",
  "department": "Engineering",
  "accountType": "EMPLOYEE",
  "roles": ["role-production-operator"],
  "attributes": {
    "location": "Plant A",
    "clearanceLevel": "Standard"
  }
}
```

#### Get User
```http
GET /users/{identifier}
```

Where `{identifier}` can be userId, username, or email.

#### Get Users by Department
```http
GET /departments/{department}/users
```

#### Deprovision User
```http
DELETE /users/{userId}
Content-Type: application/json

{
  "reason": "Employee terminated"
}
```

### Role Management Endpoints

#### Get Role Information
```http
GET /roles/{roleId}
```

#### Get User Roles
```http
GET /users/{userId}/roles
```

#### Assign Role
```http
POST /role-assignments
Content-Type: application/json
X-Assigned-By: admin-user-id

{
  "userId": "user-12345",
  "roleId": "role-quality-engineer",
  "justification": "New project requirements"
}
```

**Response with SoD Conflicts:**
```json
{
  "success": true,
  "message": "Role assigned successfully",
  "warnings": ["SoD conflicts detected"],
  "sodConflicts": [
    {
      "conflictId": "sod-conflict-123",
      "conflictType": "ROLE_CONFLICT",
      "conflictingRoles": ["role-financial-approver", "role-financial-requestor"],
      "riskLevel": "HIGH",
      "description": "SoD conflict detected: Financial Approver conflicts with Financial Requestor"
    }
  ]
}
```

### Access Request Management

#### Create Access Request
```http
POST /access-requests
Content-Type: application/json
X-Requested-By: manager-user-id

{
  "requestType": "ROLE_ASSIGNMENT",
  "requestedFor": "user-12345",
  "businessJustification": "Need access for new project",
  "urgency": "NORMAL",
  "requestDetails": {
    "roleId": "role-quality-engineer",
    "temporaryAccess": false
  }
}
```

### SoD Management

#### Get SoD Conflicts
```http
GET /users/{userId}/sod-conflicts
```

### Audit and Compliance

#### Get Audit Events
```http
GET /audit/events?userId={userId}&eventType={type}&fromDate={date}&toDate={date}&limit={limit}
```

**Example:**
```http
GET /audit/events?eventType=ROLE_ASSIGNED&limit=50
```

**Response:**
```json
{
  "success": true,
  "events": [
    {
      "eventId": "audit-12345",
      "eventType": "ROLE_ASSIGNED",
      "userId": "admin",
      "targetUserId": "user-12345",
      "resourceId": "role-quality-engineer",
      "action": "ROLE_ASSIGNMENT",
      "result": "SUCCESS",
      "riskScore": 3,
      "details": {
        "roleName": "Quality Engineer",
        "justification": "New project requirements"
      },
      "timestamp": "2023-11-01T10:15:30Z"
    }
  ],
  "count": 1
}
```

### SCIM 2.0 Endpoints

#### List Users (SCIM)
```http
GET /scim/v2/Users?startIndex=1&count=20
```

#### Create User (SCIM)
```http
POST /scim/v2/Users
Content-Type: application/json

{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "userName": "scim.user",
  "active": true,
  "name": {
    "givenName": "SCIM",
    "familyName": "User"
  },
  "emails": [
    {
      "value": "scim.user@company.com",
      "primary": true
    }
  ]
}
```

### System Management

#### Health Check
```http
GET /health
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2023-11-01T10:00:00Z",
  "service": "Saviynt IDM Surrogate",
  "version": "1.0.0",
  "status": "healthy",
  "mockMode": true,
  "userCount": 15,
  "roleCount": 8,
  "activeTokens": 3,
  "auditEventCount": 142,
  "sodConflictCount": 2
}
```

#### Reset Mock Data
```http
POST /system/reset
```

*Note: Only available in test/development environments*

## Usage Examples

### Testing SSO Integration
```typescript
// Test OAuth + SAML workflow
describe('SSO Integration', () => {
  it('should authenticate user and generate SAML assertion', async () => {
    // 1. Get OAuth token
    const tokenResponse = await request(app)
      .post('/api/v1/testing/saviynt-idm/oauth/token')
      .send({
        grant_type: 'client_credentials',
        client_id: 'test-client',
        client_secret: 'test-secret',
        scope: 'saml:generate'
      });

    const token = tokenResponse.body.access_token;

    // 2. Generate SAML assertion
    const samlResponse = await request(app)
      .post('/api/v1/testing/saviynt-idm/saml/assert')
      .set('Authorization', `Bearer ${token}`)
      .send({
        userId: 'user-john-doe',
        audience: 'https://mes.company.com'
      });

    expect(samlResponse.body.assertion).toBeDefined();
  });
});
```

### Testing User Provisioning
```typescript
// Test automated user provisioning
describe('User Provisioning', () => {
  it('should provision user with default role', async () => {
    const userData = {
      username: 'auto.provision',
      firstName: 'Auto',
      lastName: 'Provision',
      email: 'auto.provision@company.com',
      department: 'Production'
    };

    const response = await request(app)
      .post('/api/v1/testing/saviynt-idm/users')
      .send(userData);

    expect(response.body.success).toBe(true);

    // Verify user has default role
    const userRoles = await request(app)
      .get(`/api/v1/testing/saviynt-idm/users/${response.body.userId}/roles`);

    expect(userRoles.body.roles.length).toBeGreaterThan(0);
  });
});
```

### Testing SoD Violations
```typescript
// Test segregation of duties enforcement
describe('SoD Enforcement', () => {
  it('should detect conflicting role assignments', async () => {
    // Provision user
    const userResponse = await provisionTestUser();

    // Assign first role
    await assignRole(userResponse.body.userId, 'role-financial-approver');

    // Assign conflicting role - should detect SoD violation
    const conflictResponse = await assignRole(
      userResponse.body.userId,
      'role-financial-requestor'
    );

    expect(conflictResponse.body.sodConflicts).toBeDefined();
    expect(conflictResponse.body.sodConflicts.length).toBeGreaterThan(0);
  });
});
```

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: Identity Management Tests
on: [push, pull_request]

jobs:
  idm-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run IDM surrogate tests
        run: npm test -- src/tests/services/SaviyntIDMSurrogate.test.ts

      - name: Run IDM API tests
        run: npm test -- src/tests/routes/saviynt-surrogate.test.ts
```

### Test Environment Setup
```typescript
// Setup for integration tests
beforeAll(async () => {
  // Reset mock data
  await request(app)
    .post('/api/v1/testing/saviynt-idm/system/reset')
    .expect(200);

  // Create test users and roles
  await setupTestData();
});
```

## Sample Data

The surrogate initializes with sample data for testing:

### Sample Users
- **john.doe** (Production, role-production-operator)
- **jane.smith** (Quality, role-quality-engineer)

### Sample Roles
- **role-production-operator** (LOW risk, basic permissions)
- **role-quality-engineer** (MEDIUM risk, quality permissions)
- **role-financial-approver** (HIGH risk, SOD sensitive)
- **role-financial-requestor** (HIGH risk, SOD sensitive)

### SoD Conflicts
- Financial Approver ↔ Financial Requestor (mutual exclusion)

## Error Handling

### Common Error Responses

#### Invalid Credentials (401)
```json
{
  "error": "invalid_client",
  "error_description": "Authentication failed"
}
```

#### User Not Found (404)
```json
{
  "success": false,
  "error": "User not found"
}
```

#### Validation Error (400)
```json
{
  "success": false,
  "error": "Invalid user data",
  "details": "firstName is required"
}
```

#### Server Error (500)
```json
{
  "success": false,
  "error": "Internal server error",
  "details": "Detailed error message"
}
```

## Performance Considerations

- **In-Memory Storage**: Fast access but limited to test data volumes
- **Token Cleanup**: Automatic cleanup of expired tokens
- **Audit Log Rotation**: Keeps last 10,000 events in memory
- **Concurrent Access**: Thread-safe for CI/CD parallel execution

## Security Notes

- **Test Environment Only**: Not for production use
- **No Real Authentication**: Mock credentials only
- **Audit Trail**: All actions logged for test verification
- **No Persistence**: Data reset between test runs

## Troubleshooting

### Common Issues

#### Connection Errors
- Ensure service is running on correct port
- Check endpoint URLs match documentation
- Verify no authentication middleware blocking access

#### Token Issues
- Check client credentials match configuration
- Verify token hasn't expired (default 60 minutes)
- Use introspection endpoint to validate tokens

#### SoD Conflicts Not Detected
- Ensure `enforceSoD: true` in configuration
- Check role definitions include `conflictingRoles`
- Verify roles exist in mock data

#### Test Data Reset
```typescript
// Reset between tests
beforeEach(async () => {
  await request(app)
    .post('/api/v1/testing/saviynt-idm/system/reset')
    .expect(200);
});
```

### Debug Logging
Enable debug logging for detailed operation tracking:
```typescript
const saviyntSurrogate = new SaviyntIDMSurrogate({
  ...config,
  enableAuditLogging: true
});

// Check audit events for debugging
const events = await saviyntSurrogate.getAuditEvents({
  limit: 50
});
console.log('Recent events:', events);
```

## Development

### Adding New Features
1. Update `SaviyntIDMSurrogate.ts` service
2. Add corresponding API endpoints in `saviynt-surrogate.ts`
3. Create tests for both service and API layers
4. Update documentation

### Testing Changes
```bash
# Run service tests
npm test src/tests/services/SaviyntIDMSurrogate.test.ts

# Run API tests
npm test src/tests/routes/saviynt-surrogate.test.ts

# Run all IDM surrogate tests
npm test -- --grep "Saviynt"
```

## Future Enhancements

- **Database Persistence**: Optional persistent storage
- **Advanced Workflows**: Multi-step approval processes
- **Risk Analytics**: Enhanced risk scoring algorithms
- **Performance Metrics**: Response time and throughput monitoring
- **Integration Templates**: Pre-built integration patterns

## Support

For issues or questions regarding the Saviynt IDM Surrogate:

1. Check this documentation for common solutions
2. Review test files for usage examples
3. Create issue in GitHub repository with detailed description
4. Include configuration and error logs for troubleshooting

---

**Note**: This is a testing infrastructure component designed to enable comprehensive identity management testing without external dependencies. It should not be used in production environments.