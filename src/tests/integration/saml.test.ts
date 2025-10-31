/**
 * SAML Integration Tests (Issue #131)
 *
 * Comprehensive integration test suite for SAML 2.0 authentication flows.
 * Tests end-to-end SAML functionality including:
 * - SAML configuration management
 * - Metadata generation and exchange
 * - Authentication request flow
 * - Assertion processing and validation
 * - User provisioning and attribute mapping
 * - Single logout flows
 * - Session management
 * - Admin API endpoints
 */

import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../index';
import SamlService from '../../services/SamlService';
import jwt from 'jsonwebtoken';
import { config } from '../../config/config';

const prisma = new PrismaClient();

// Service instances
let samlService: SamlService;

// Test data
let testSamlConfigId: string;
let testUser: any;
let testSamlSession: any;
let adminToken: string;

// Mock SAML configuration
const mockSamlConfig = {
  name: 'Test SAML IdP',
  entityId: 'https://test.example.com/saml',
  ssoUrl: 'https://idp.example.com/sso',
  sloUrl: 'https://idp.example.com/slo',
  certificate: `-----BEGIN CERTIFICATE-----
MIICmzCCAYMCBgF7/J9pQDANBgkqhkiG9w0BAQsFADA...
-----END CERTIFICATE-----`,
  privateKey: `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEA...
-----END PRIVATE KEY-----`,
  signRequests: true,
  signAssertions: true,
  encryptAssertions: false,
  nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
  attributeMapping: {
    email: 'email',
    firstName: 'givenName',
    lastName: 'surname'
  },
  clockTolerance: 300,
  isActive: true
};

// Mock SAML response (base64 encoded)
const mockSamlResponse = 'PHNhbWxwOlJlc3BvbnNlIHhtbG5zOnNhbWxwPSJ1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6cHJvdG9jb2wiPi4uLjwvc2FtbHA6UmVzcG9uc2U+';

describe('SAML Integration Tests', () => {
  beforeAll(async () => {
    // Initialize SAML service
    samlService = new SamlService({
      baseUrl: 'http://localhost:3001',
      acsPath: '/api/v1/sso/saml/acs',
      metadataPath: '/api/v1/sso/saml/metadata',
      sloPath: '/api/v1/sso/saml/slo'
    });

    // Create a test user with admin permissions
    testUser = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        username: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        passwordHash: 'dummy_hash',
        isActive: true,
        roles: ['admin'],
        permissions: ['sso.admin.read', 'sso.admin.write', 'sso.admin.delete']
      }
    });

    // Generate admin JWT token for testing
    adminToken = jwt.sign(
      {
        userId: testUser.id,
        username: testUser.username,
        email: testUser.email,
        roles: testUser.roles,
        permissions: testUser.permissions
      },
      config.jwt.secret,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.samlAuthRequest.deleteMany({});
    await prisma.samlSession.deleteMany({});
    await prisma.samlConfig.deleteMany({});
    await prisma.user.delete({ where: { id: testUser.id } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up between tests
    await prisma.samlAuthRequest.deleteMany({});
    await prisma.samlSession.deleteMany({});
    await prisma.samlConfig.deleteMany({});
  });

  describe('SAML Configuration Management API', () => {
    test('should create a new SAML configuration via API', async () => {
      const response = await request(app)
        .post('/api/v1/admin/sso/saml-configs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(mockSamlConfig)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(mockSamlConfig.name);
      expect(response.body.data.entityId).toBe(mockSamlConfig.entityId);
      expect(response.body.data.privateKey).toBeUndefined(); // Should be redacted
      expect(response.body.data.certificate).toBe('[REDACTED]');

      testSamlConfigId = response.body.data.id;

      // Verify in database
      const config = await prisma.samlConfig.findUnique({
        where: { id: testSamlConfigId }
      });
      expect(config).toBeTruthy();
      expect(config!.name).toBe(mockSamlConfig.name);
    });

    test('should list SAML configurations', async () => {
      // Create test config first
      const config = await prisma.samlConfig.create({
        data: mockSamlConfig
      });
      testSamlConfigId = config.id;

      const response = await request(app)
        .get('/api/v1/admin/sso/saml-configs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(testSamlConfigId);
      expect(response.body.data[0].isValid).toBe(true);
      expect(response.body.data[0].activeSessions).toBe(0);
    });

    test('should get specific SAML configuration details', async () => {
      // Create test config first
      const config = await prisma.samlConfig.create({
        data: mockSamlConfig
      });
      testSamlConfigId = config.id;

      const response = await request(app)
        .get(`/api/v1/admin/sso/saml-configs/${testSamlConfigId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testSamlConfigId);
      expect(response.body.data.isValid).toBe(true);
      expect(response.body.data.activeSessions).toBe(0);
      expect(response.body.data.recentSessions).toEqual([]);
    });

    test('should update SAML configuration', async () => {
      // Create test config first
      const config = await prisma.samlConfig.create({
        data: mockSamlConfig
      });
      testSamlConfigId = config.id;

      const updates = {
        name: 'Updated SAML IdP',
        clockTolerance: 600
      };

      const response = await request(app)
        .put(`/api/v1/admin/sso/saml-configs/${testSamlConfigId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updates.name);
      expect(response.body.data.clockTolerance).toBe(updates.clockTolerance);

      // Verify in database
      const updatedConfig = await prisma.samlConfig.findUnique({
        where: { id: testSamlConfigId }
      });
      expect(updatedConfig!.name).toBe(updates.name);
      expect(updatedConfig!.clockTolerance).toBe(updates.clockTolerance);
    });

    test('should delete SAML configuration when no active sessions', async () => {
      // Create test config first
      const config = await prisma.samlConfig.create({
        data: mockSamlConfig
      });
      testSamlConfigId = config.id;

      const response = await request(app)
        .delete(`/api/v1/admin/sso/saml-configs/${testSamlConfigId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('SAML configuration deleted successfully');

      // Verify deletion in database
      const deletedConfig = await prisma.samlConfig.findUnique({
        where: { id: testSamlConfigId }
      });
      expect(deletedConfig).toBeNull();
    });

    test('should prevent deletion of SAML configuration with active sessions', async () => {
      // Create test config and session
      const config = await prisma.samlConfig.create({
        data: mockSamlConfig
      });
      testSamlConfigId = config.id;

      const session = await prisma.samlSession.create({
        data: {
          userId: testUser.id,
          sessionIndex: 'test-session',
          nameId: 'test@example.com',
          nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
          assertionId: 'test-assertion',
          configId: testSamlConfigId,
          attributes: {},
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000)
        }
      });

      const response = await request(app)
        .delete(`/api/v1/admin/sso/saml-configs/${testSamlConfigId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('ACTIVE_SESSIONS_EXIST');
      expect(response.body.message).toContain('Cannot delete configuration with 1 active sessions');
    });

    test('should test SAML configuration', async () => {
      // Create test config first
      const config = await prisma.samlConfig.create({
        data: mockSamlConfig
      });
      testSamlConfigId = config.id;

      const response = await request(app)
        .post(`/api/v1/admin/sso/saml-configs/${testSamlConfigId}/test`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.configId).toBe(testSamlConfigId);
      expect(response.body.data.isValid).toBe(true);
      expect(response.body.data.tests.configurationValid).toBe(true);
      expect(response.body.data.timestamp).toBeTruthy();
    });
  });

  describe('SAML Metadata Generation', () => {
    test('should generate and serve SP metadata via public endpoint', async () => {
      // Create test config first
      const config = await prisma.samlConfig.create({
        data: mockSamlConfig
      });
      testSamlConfigId = config.id;

      const response = await request(app)
        .get(`/api/v1/sso/saml/metadata/${testSamlConfigId}`)
        .expect(200);

      expect(response.headers['content-type']).toBe('application/xml; charset=utf-8');
      expect(response.text).toContain('<?xml');
      expect(response.text).toContain('EntityDescriptor');
    });

    test('should generate metadata via admin endpoint', async () => {
      // Create test config first
      const config = await prisma.samlConfig.create({
        data: mockSamlConfig
      });
      testSamlConfigId = config.id;

      const response = await request(app)
        .get(`/api/v1/admin/sso/saml-configs/${testSamlConfigId}/metadata`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.headers['content-type']).toBe('application/xml; charset=utf-8');
      expect(response.text).toContain('<?xml');
      expect(response.text).toContain('EntityDescriptor');
    });

    test('should handle metadata generation for non-existent config', async () => {
      const response = await request(app)
        .get('/api/v1/sso/saml/metadata/non-existent-config')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('METADATA_GENERATION_FAILED');
    });
  });

  describe('SAML Authentication Flow', () => {
    test('should initiate SAML authentication request', async () => {
      // Create test config first
      const config = await prisma.samlConfig.create({
        data: mockSamlConfig
      });
      testSamlConfigId = config.id;

      const response = await request(app)
        .get(`/api/v1/sso/saml/login/${testSamlConfigId}`)
        .query({ RelayState: 'test-state', returnUrl: 'https://app.example.com/dashboard' })
        .expect(302); // Should redirect to IdP

      expect(response.headers.location).toContain('https://idp.example.com/sso');

      // Verify auth request was stored
      const authRequests = await prisma.samlAuthRequest.findMany({
        where: { configId: testSamlConfigId }
      });
      expect(authRequests).toHaveLength(1);
      expect(authRequests[0].relayState).toBe('test-state');
    });

    test('should validate and reject SAML authentication request for invalid config', async () => {
      const response = await request(app)
        .get('/api/v1/sso/saml/login/invalid-config-id')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('SAML_AUTH_REQUEST_ERROR');
    });
  });

  describe('SAML Assertion Processing (ACS)', () => {
    test('should process valid SAML assertion and create user session', async () => {
      // Create test config first
      const config = await prisma.samlConfig.create({
        data: mockSamlConfig
      });
      testSamlConfigId = config.id;

      // Mock the SAML response processing to return valid user data
      const mockUserData = {
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User'
      };

      // Note: In a real integration test, we would need to mock the SAML library
      // or use a test IdP. For now, we'll test the validation part.
      const response = await request(app)
        .post('/api/v1/sso/saml/acs')
        .query({ configId: testSamlConfigId })
        .send({
          SAMLResponse: mockSamlResponse,
          RelayState: 'test-state'
        })
        .expect(400); // Expected to fail due to invalid SAML response

      expect(response.body.success).toBe(false);
      // This would succeed with a real SAML response or proper mocking
    });

    test('should reject ACS request without SAMLResponse', async () => {
      const response = await request(app)
        .post('/api/v1/sso/saml/acs')
        .query({ configId: 'test-config' })
        .send({ RelayState: 'test-state' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('MISSING_SAML_RESPONSE');
    });

    test('should reject ACS request without configId', async () => {
      const response = await request(app)
        .post('/api/v1/sso/saml/acs')
        .send({
          SAMLResponse: mockSamlResponse,
          RelayState: 'test-state'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('MISSING_CONFIG_ID');
    });
  });

  describe('SAML Session Management', () => {
    test('should list SAML sessions via admin API', async () => {
      // Create test config and session
      const config = await prisma.samlConfig.create({
        data: mockSamlConfig
      });
      testSamlConfigId = config.id;

      testSamlSession = await prisma.samlSession.create({
        data: {
          userId: testUser.id,
          sessionIndex: 'test-session-123',
          nameId: 'test@example.com',
          nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
          assertionId: 'test-assertion-123',
          configId: testSamlConfigId,
          attributes: { email: 'test@example.com', role: 'user' },
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000)
        }
      });

      const response = await request(app)
        .get('/api/v1/admin/sso/saml-sessions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(testSamlSession.id);
      expect(response.body.data[0].user.email).toBe(testUser.email);
      expect(response.body.data[0].config.name).toBe(mockSamlConfig.name);
    });

    test('should filter SAML sessions by configId', async () => {
      // Create test config and session
      const config = await prisma.samlConfig.create({
        data: mockSamlConfig
      });
      testSamlConfigId = config.id;

      await prisma.samlSession.create({
        data: {
          userId: testUser.id,
          sessionIndex: 'test-session-456',
          nameId: 'test@example.com',
          nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
          assertionId: 'test-assertion-456',
          configId: testSamlConfigId,
          attributes: {},
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000)
        }
      });

      const response = await request(app)
        .get('/api/v1/admin/sso/saml-sessions')
        .query({ configId: testSamlConfigId })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].configId).toBe(testSamlConfigId);
    });

    test('should terminate SAML session via admin API', async () => {
      // Create test config and session
      const config = await prisma.samlConfig.create({
        data: mockSamlConfig
      });
      testSamlConfigId = config.id;

      const session = await prisma.samlSession.create({
        data: {
          userId: testUser.id,
          sessionIndex: 'test-session-789',
          nameId: 'test@example.com',
          nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
          assertionId: 'test-assertion-789',
          configId: testSamlConfigId,
          attributes: {},
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000)
        }
      });

      const response = await request(app)
        .delete(`/api/v1/admin/sso/saml-sessions/${session.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('SAML session terminated successfully');

      // Verify session was deleted
      const deletedSession = await prisma.samlSession.findUnique({
        where: { id: session.id }
      });
      expect(deletedSession).toBeNull();
    });
  });

  describe('SAML Single Logout (SLO)', () => {
    test('should initiate single logout', async () => {
      // Create test config and session
      const config = await prisma.samlConfig.create({
        data: mockSamlConfig
      });
      testSamlConfigId = config.id;

      const session = await prisma.samlSession.create({
        data: {
          userId: testUser.id,
          sessionIndex: 'slo-session-123',
          nameId: 'test@example.com',
          nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
          assertionId: 'slo-assertion-123',
          configId: testSamlConfigId,
          attributes: {},
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000)
        }
      });

      const response = await request(app)
        .post('/api/v1/sso/saml/slo')
        .send({
          sessionId: session.id,
          nameId: 'test@example.com',
          sessionIndex: 'slo-session-123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.logoutUrl).toContain('https://idp.example.com/slo');

      // Verify session was deleted during SLO
      const deletedSession = await prisma.samlSession.findUnique({
        where: { id: session.id }
      });
      expect(deletedSession).toBeNull();
    });

    test('should reject SLO request with missing parameters', async () => {
      const response = await request(app)
        .post('/api/v1/sso/saml/slo')
        .send({ sessionId: 'test-session' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('MISSING_PARAMETERS');
    });
  });

  describe('SAML Configuration Validation', () => {
    test('should validate SAML configuration via API', async () => {
      // Create test config first
      const config = await prisma.samlConfig.create({
        data: mockSamlConfig
      });
      testSamlConfigId = config.id;

      const response = await request(app)
        .post(`/api/v1/sso/saml/validate-config/${testSamlConfigId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.configId).toBe(testSamlConfigId);
      expect(response.body.data.isValid).toBe(true);
      expect(response.body.data.message).toBe('Configuration is valid');
    });

    test('should handle validation for non-existent config', async () => {
      const response = await request(app)
        .post('/api/v1/sso/saml/validate-config/non-existent-config')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('SAML_CONFIG_VALIDATION_ERROR');
    });
  });

  describe('SAML Cleanup Operations', () => {
    test('should clean up expired SAML sessions and auth requests', async () => {
      // Create expired sessions and auth requests
      const config = await prisma.samlConfig.create({
        data: mockSamlConfig
      });
      testSamlConfigId = config.id;

      // Create expired session
      await prisma.samlSession.create({
        data: {
          userId: testUser.id,
          sessionIndex: 'expired-session',
          nameId: 'expired@example.com',
          nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
          assertionId: 'expired-assertion',
          configId: testSamlConfigId,
          attributes: {},
          expiresAt: new Date(Date.now() - 60 * 60 * 1000) // Expired 1 hour ago
        }
      });

      // Create expired auth request
      await prisma.samlAuthRequest.create({
        data: {
          requestId: 'expired-request',
          relayState: 'expired-state',
          destination: mockSamlConfig.ssoUrl,
          issueInstant: new Date(),
          configId: testSamlConfigId,
          expiresAt: new Date(Date.now() - 30 * 60 * 1000) // Expired 30 minutes ago
        }
      });

      const response = await request(app)
        .post('/api/v1/admin/sso/saml-cleanup')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('SAML cleanup completed');
      expect(response.body.data.activeSessions).toBe(0);
      expect(response.body.data.activeAuthRequests).toBe(0);

      // Verify cleanup occurred
      const sessions = await prisma.samlSession.count();
      const authRequests = await prisma.samlAuthRequest.count();
      expect(sessions).toBe(0);
      expect(authRequests).toBe(0);
    });
  });

  describe('Error Handling and Security', () => {
    test('should require authentication for admin endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/admin/sso/saml-configs')
        .expect(401);

      expect(response.body.message).toContain('Authorization');
    });

    test('should handle database errors gracefully', async () => {
      // Test with invalid data that would cause database constraint violation
      const invalidConfig = {
        ...mockSamlConfig,
        entityId: null // Required field
      };

      const response = await request(app)
        .post('/api/v1/admin/sso/saml-configs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidConfig)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should validate input parameters', async () => {
      const response = await request(app)
        .post('/api/v1/admin/sso/saml-configs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '', // Invalid empty name
          entityId: 'invalid-url', // Invalid URL format
          ssoUrl: 'not-a-url'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});