import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import saviyntSurrogateRoutes from '../../routes/saviynt-surrogate';

describe('Saviynt IDM Surrogate API Routes', () => {
  let app: express.Application;
  let server: any;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/testing/saviynt-idm', saviyntSurrogateRoutes);

    server = app.listen(0); // Use random port for testing
  });

  afterAll((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  beforeEach(async () => {
    // Reset mock data before each test
    await request(app)
      .post('/api/testing/saviynt-idm/system/reset')
      .expect(200);
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/testing/saviynt-idm/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.service).toBe('Saviynt IDM Surrogate');
      expect(response.body.status).toBe('healthy');
      expect(response.body.mockMode).toBe(true);
      expect(typeof response.body.userCount).toBe('number');
      expect(typeof response.body.roleCount).toBe('number');
    });
  });

  describe('OAuth 2.0 Endpoints', () => {
    it('should generate OAuth token with valid credentials', async () => {
      const tokenRequest = {
        grant_type: 'client_credentials',
        client_id: 'mes-test-client',
        client_secret: 'mes-test-secret-12345',
        scope: 'read write',
      };

      const response = await request(app)
        .post('/api/testing/saviynt-idm/oauth/token')
        .send(tokenRequest)
        .expect(200);

      expect(response.body.access_token).toBeDefined();
      expect(response.body.token_type).toBe('Bearer');
      expect(response.body.expires_in).toBe(3600);
      expect(response.body.refresh_token).toBeDefined();
      expect(response.body.scope).toBe('read write');
    });

    it('should reject OAuth token request with invalid credentials', async () => {
      const tokenRequest = {
        grant_type: 'client_credentials',
        client_id: 'invalid-client',
        client_secret: 'invalid-secret',
        scope: 'read',
      };

      const response = await request(app)
        .post('/api/testing/saviynt-idm/oauth/token')
        .send(tokenRequest)
        .expect(401);

      expect(response.body.error).toBe('invalid_client');
      expect(response.body.error_description).toContain('Invalid client credentials');
    });

    it('should validate OAuth token via introspection', async () => {
      // First generate a token
      const tokenRequest = {
        grant_type: 'client_credentials',
        client_id: 'mes-test-client',
        client_secret: 'mes-test-secret-12345',
        scope: 'read',
      };

      const tokenResponse = await request(app)
        .post('/api/testing/saviynt-idm/oauth/token')
        .send(tokenRequest)
        .expect(200);

      // Then introspect it
      const introspectResponse = await request(app)
        .post('/api/testing/saviynt-idm/oauth/introspect')
        .send({ token: tokenResponse.body.access_token })
        .expect(200);

      expect(introspectResponse.body.active).toBe(true);
      expect(introspectResponse.body.scope).toBe('read');
      expect(introspectResponse.body.client_id).toBe('mes-test-client');
    });

    it('should return inactive for invalid token introspection', async () => {
      const response = await request(app)
        .post('/api/testing/saviynt-idm/oauth/introspect')
        .send({ token: 'invalid-token' })
        .expect(200);

      expect(response.body.active).toBe(false);
    });
  });

  describe('SAML Assertion Endpoints', () => {
    it('should generate SAML assertion for valid user', async () => {
      const samlRequest = {
        userId: 'user-john-doe',
        audience: 'https://mes.company.com',
        attributes: {
          customAttribute: 'testValue',
        },
      };

      const response = await request(app)
        .post('/api/testing/saviynt-idm/saml/assert')
        .send(samlRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.assertion).toBeDefined();
      expect(response.body.assertion.id).toBeDefined();
      expect(response.body.assertion.issuer).toContain('saviynt-mes-testing-tenant');
      expect(response.body.assertion.audience).toBe('https://mes.company.com');
      expect(response.body.assertion.attributes.customAttribute).toBe('testValue');
    });

    it('should fail SAML assertion for non-existent user', async () => {
      const samlRequest = {
        userId: 'non-existent-user',
        audience: 'https://mes.company.com',
      };

      const response = await request(app)
        .post('/api/testing/saviynt-idm/saml/assert')
        .send(samlRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('User Management Endpoints', () => {
    it('should provision new user', async () => {
      const userData = {
        username: 'test.user',
        firstName: 'Test',
        lastName: 'User',
        email: 'test.user@company.com',
        department: 'Engineering',
        accountType: 'EMPLOYEE',
      };

      const response = await request(app)
        .post('/api/testing/saviynt-idm/users')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.userId).toBeDefined();
      expect(response.body.message).toContain('provisioned successfully');
    });

    it('should fail user provisioning with invalid data', async () => {
      const invalidUserData = {
        username: 'test.user',
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/testing/saviynt-idm/users')
        .send(invalidUserData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid user data');
    });

    it('should get user by identifier', async () => {
      const response = await request(app)
        .get('/api/testing/saviynt-idm/users/john.doe')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe('john.doe');
      expect(response.body.user.firstName).toBe('John');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/testing/saviynt-idm/users/non.existent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('User not found');
    });

    it('should get users by department', async () => {
      const response = await request(app)
        .get('/api/testing/saviynt-idm/departments/Production/users')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.users).toBeDefined();
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body.count).toBeDefined();
    });

    it('should deprovision user', async () => {
      // First provision a user
      const userData = {
        username: 'deprovision.test',
        firstName: 'Deprovision',
        lastName: 'Test',
        email: 'deprovision@company.com',
      };

      const provisionResponse = await request(app)
        .post('/api/testing/saviynt-idm/users')
        .send(userData)
        .expect(201);

      // Then deprovision
      const deprovisionResponse = await request(app)
        .delete(`/api/testing/saviynt-idm/users/${provisionResponse.body.userId}`)
        .send({ reason: 'Test deprovisioning' })
        .expect(200);

      expect(deprovisionResponse.body.success).toBe(true);
      expect(deprovisionResponse.body.message).toContain('deprovisioned successfully');
    });
  });

  describe('Role Management Endpoints', () => {
    it('should get role information', async () => {
      const response = await request(app)
        .get('/api/testing/saviynt-idm/roles/role-quality-engineer')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.role).toBeDefined();
      expect(response.body.role.roleName).toBe('Quality Engineer');
      expect(response.body.role.permissions).toBeDefined();
    });

    it('should return 404 for non-existent role', async () => {
      const response = await request(app)
        .get('/api/testing/saviynt-idm/roles/non-existent-role')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Role not found');
    });

    it('should get user roles', async () => {
      const response = await request(app)
        .get('/api/testing/saviynt-idm/users/user-john-doe/roles')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.roles).toBeDefined();
      expect(Array.isArray(response.body.roles)).toBe(true);
      expect(response.body.count).toBeDefined();
    });

    it('should assign role to user', async () => {
      const roleAssignment = {
        userId: 'user-john-doe',
        roleId: 'role-quality-engineer',
        justification: 'Test assignment',
      };

      const response = await request(app)
        .post('/api/testing/saviynt-idm/role-assignments')
        .set('x-assigned-by', 'test-admin')
        .send(roleAssignment)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('assigned successfully');
    });

    it('should detect SoD conflicts during role assignment', async () => {
      // First provision a user
      const userData = {
        username: 'sod.test',
        firstName: 'SoD',
        lastName: 'Test',
        email: 'sod@company.com',
      };

      const userResponse = await request(app)
        .post('/api/testing/saviynt-idm/users')
        .send(userData)
        .expect(201);

      // Assign first role
      await request(app)
        .post('/api/testing/saviynt-idm/role-assignments')
        .send({
          userId: userResponse.body.userId,
          roleId: 'role-financial-approver',
        })
        .expect(201);

      // Assign conflicting role
      const conflictResponse = await request(app)
        .post('/api/testing/saviynt-idm/role-assignments')
        .send({
          userId: userResponse.body.userId,
          roleId: 'role-financial-requestor',
        })
        .expect(201);

      expect(conflictResponse.body.success).toBe(true);
      expect(conflictResponse.body.warnings).toBeDefined();
      expect(conflictResponse.body.sodConflicts).toBeDefined();
    });
  });

  describe('Access Request Management', () => {
    it('should create access request', async () => {
      const requestData = {
        requestType: 'ROLE_ASSIGNMENT',
        requestedFor: 'user-john-doe',
        businessJustification: 'Need access for project work',
        urgency: 'NORMAL',
      };

      const response = await request(app)
        .post('/api/testing/saviynt-idm/access-requests')
        .set('x-requested-by', 'user-manager')
        .send(requestData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.requestId).toBeDefined();
      expect(response.body.message).toContain('created successfully');
    });
  });

  describe('SoD Management Endpoints', () => {
    it('should get SoD conflicts for user', async () => {
      const response = await request(app)
        .get('/api/testing/saviynt-idm/users/user-john-doe/sod-conflicts')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.conflicts).toBeDefined();
      expect(Array.isArray(response.body.conflicts)).toBe(true);
      expect(response.body.count).toBeDefined();
    });
  });

  describe('Audit and Compliance Endpoints', () => {
    it('should get audit events', async () => {
      const response = await request(app)
        .get('/api/testing/saviynt-idm/audit/events')
        .query({ limit: '10' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.events).toBeDefined();
      expect(Array.isArray(response.body.events)).toBe(true);
      expect(response.body.count).toBeDefined();
    });

    it('should filter audit events by event type', async () => {
      const response = await request(app)
        .get('/api/testing/saviynt-idm/audit/events')
        .query({ eventType: 'USER_LOGIN', limit: '5' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.events).toBeDefined();
      expect(response.body.filters.eventType).toBe('USER_LOGIN');
    });

    it('should filter audit events by date range', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const response = await request(app)
        .get('/api/testing/saviynt-idm/audit/events')
        .query({
          fromDate: oneHourAgo.toISOString(),
          toDate: now.toISOString(),
          limit: '10',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.filters.fromDate).toBeDefined();
      expect(response.body.filters.toDate).toBeDefined();
    });
  });

  describe('SCIM 2.0 Compatibility Endpoints', () => {
    it('should list users via SCIM endpoint', async () => {
      const response = await request(app)
        .get('/api/testing/saviynt-idm/scim/v2/Users')
        .query({ startIndex: '1', count: '10' })
        .expect(200);

      expect(response.body.schemas).toContain('urn:ietf:params:scim:api:messages:2.0:ListResponse');
      expect(response.body.Resources).toBeDefined();
      expect(Array.isArray(response.body.Resources)).toBe(true);
      expect(response.body.totalResults).toBeDefined();
      expect(response.body.startIndex).toBe(1);
    });

    it('should create user via SCIM endpoint', async () => {
      const scimUser = {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        userName: 'scim.test',
        active: true,
        name: {
          givenName: 'SCIM',
          familyName: 'Test',
        },
        emails: [{
          value: 'scim.test@company.com',
          primary: true,
        }],
      };

      const response = await request(app)
        .post('/api/testing/saviynt-idm/scim/v2/Users')
        .send(scimUser)
        .expect(201);

      expect(response.body.schemas).toContain('urn:ietf:params:scim:schemas:core:2.0:User');
      expect(response.body.id).toBeDefined();
      expect(response.body.userName).toBe('scim.test');
      expect(response.body.active).toBe(true);
    });

    it('should handle SCIM user creation errors', async () => {
      const invalidScimUser = {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/testing/saviynt-idm/scim/v2/Users')
        .send(invalidScimUser)
        .expect(400);

      expect(response.body.schemas).toContain('urn:ietf:params:scim:api:messages:2.0:Error');
      expect(response.body.status).toBe('400');
    });
  });

  describe('System Management Endpoints', () => {
    it('should reset mock data in development mode', async () => {
      // This test assumes NODE_ENV is 'test' which allows reset
      const response = await request(app)
        .post('/api/testing/saviynt-idm/system/reset')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('reset successfully');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON in request body', async () => {
      await request(app)
        .post('/api/testing/saviynt-idm/users')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      // Test passes if we get 400 status (handled by Express JSON parser)
    });

    it('should handle validation errors', async () => {
      const invalidData = {
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/testing/saviynt-idm/users')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should handle server errors gracefully', async () => {
      // Test with invalid parameters - may be handled gracefully or cause error
      const response = await request(app)
        .get('/api/testing/saviynt-idm/audit/events')
        .query({ fromDate: 'invalid-date' });

      // Either succeeds with empty results or fails with error
      expect([200, 400, 500]).toContain(response.status);
      if (response.status !== 200) {
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      }
    });
  });

  describe('Integration Scenarios', () => {
    it('should support complete user lifecycle', async () => {
      // 1. Provision user
      const userData = {
        username: 'lifecycle.test',
        firstName: 'Lifecycle',
        lastName: 'Test',
        email: 'lifecycle@company.com',
        department: 'IT',
      };

      const provisionResponse = await request(app)
        .post('/api/testing/saviynt-idm/users')
        .send(userData)
        .expect(201);

      const userId = provisionResponse.body.userId;

      // 2. Assign role
      await request(app)
        .post('/api/testing/saviynt-idm/role-assignments')
        .send({
          userId,
          roleId: 'role-production-operator',
          justification: 'Initial role assignment',
        })
        .expect(201);

      // 3. Create access request
      await request(app)
        .post('/api/testing/saviynt-idm/access-requests')
        .send({
          requestType: 'ROLE_ASSIGNMENT',
          requestedFor: userId,
          businessJustification: 'Additional access needed',
        })
        .expect(201);

      // 4. Generate OAuth token
      const tokenResponse = await request(app)
        .post('/api/testing/saviynt-idm/oauth/token')
        .send({
          grant_type: 'client_credentials',
          client_id: 'mes-test-client',
          client_secret: 'mes-test-secret-12345',
          username: userData.username,
        })
        .expect(200);

      expect(tokenResponse.body.access_token).toBeDefined();

      // 5. Generate SAML assertion
      const samlResponse = await request(app)
        .post('/api/testing/saviynt-idm/saml/assert')
        .send({
          userId,
          audience: 'https://mes.company.com',
        })
        .expect(200);

      expect(samlResponse.body.success).toBe(true);

      // 6. Check audit trail
      const auditResponse = await request(app)
        .get('/api/testing/saviynt-idm/audit/events')
        .query({ userId: 'system', limit: '20' })
        .expect(200);

      expect(auditResponse.body.events.length).toBeGreaterThan(0);

      // 7. Deprovision user
      await request(app)
        .delete(`/api/testing/saviynt-idm/users/${userId}`)
        .send({ reason: 'End of test lifecycle' })
        .expect(200);
    });

    it('should support OAuth + SAML SSO workflow', async () => {
      // 1. Generate OAuth token for service authentication
      const tokenResponse = await request(app)
        .post('/api/testing/saviynt-idm/oauth/token')
        .send({
          grant_type: 'client_credentials',
          client_id: 'mes-test-client',
          client_secret: 'mes-test-secret-12345',
          scope: 'saml:generate',
        })
        .expect(200);

      // 2. Use token to generate SAML assertion
      const samlResponse = await request(app)
        .post('/api/testing/saviynt-idm/saml/assert')
        .set('Authorization', `Bearer ${tokenResponse.body.access_token}`)
        .send({
          userId: 'user-john-doe',
          audience: 'https://mes.company.com',
          attributes: { ssoProvider: 'Saviynt' },
        })
        .expect(200);

      expect(samlResponse.body.assertion.attributes.ssoProvider).toBe('Saviynt');

      // 3. Validate token is still active
      const introspectResponse = await request(app)
        .post('/api/testing/saviynt-idm/oauth/introspect')
        .send({ token: tokenResponse.body.access_token })
        .expect(200);

      expect(introspectResponse.body.active).toBe(true);
    });
  });
});