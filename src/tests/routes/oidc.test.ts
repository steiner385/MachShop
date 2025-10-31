/**
 * OAuth 2.0/OpenID Connect API Routes Tests (Issue #132)
 *
 * Test suite for OIDC API endpoints including authentication flows,
 * configuration management, and admin operations.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import oidcRoutes from '../../routes/oidc';
import prisma from '../../lib/database';
import { OidcConfig, User } from '@prisma/client';

// Mock the OIDC service
vi.mock('../../services/OidcService', () => ({
  default: {
    getInstance: () => ({
      initiateAuth: vi.fn().mockResolvedValue({
        authUrl: 'https://provider.example.com/auth?client_id=test',
        state: 'test-state',
        nonce: 'test-nonce',
        codeVerifier: 'test-verifier'
      }),
      handleCallback: vi.fn().mockResolvedValue({
        success: true,
        user: {
          id: 'user-id',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          roles: ['user'],
          permissions: []
        },
        session: {
          id: 'session-id',
          expiresAt: new Date()
        },
        tokens: {
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          tokenType: 'Bearer',
          expiresIn: 3600
        }
      }),
      refreshToken: vi.fn().mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        tokenType: 'Bearer',
        expiresIn: 3600
      }),
      revokeSession: vi.fn().mockResolvedValue(true),
      validateIdToken: vi.fn().mockResolvedValue({
        sub: 'test-subject',
        email: 'test@example.com',
        name: 'Test User'
      }),
      testConnection: vi.fn().mockResolvedValue({
        success: true,
        endpoints: {
          issuer: 'https://provider.example.com',
          authorization_endpoint: 'https://provider.example.com/auth',
          token_endpoint: 'https://provider.example.com/token'
        }
      }),
      discoverProvider: vi.fn().mockResolvedValue({
        success: true,
        configuration: {
          issuer: 'https://provider.example.com',
          authorization_endpoint: 'https://provider.example.com/auth',
          token_endpoint: 'https://provider.example.com/token',
          userinfo_endpoint: 'https://provider.example.com/userinfo'
        }
      })
    })
  }
}));

// Mock auth middleware
vi.mock('../../middleware/auth', () => ({
  requirePermission: () => (req: any, res: any, next: any) => next()
}));

describe('OIDC API Routes', () => {
  let app: express.Application;
  let testConfig: OidcConfig;
  let testUser: User;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use('/oidc', oidcRoutes);

    // Create test data
    testConfig = await prisma.oidcConfig.create({
      data: {
        name: 'Test OIDC Provider',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        issuer: 'https://test.example.com',
        discoveryUrl: 'https://test.example.com/.well-known/openid_configuration',
        scopes: ['openid', 'profile', 'email'],
        responseType: 'code',
        responseMode: 'query',
        usePkce: true,
        isActive: true
      }
    });

    testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        passwordHash: 'hashed-password',
        isActive: true,
        roles: ['user'],
        permissions: []
      }
    });
  });

  afterEach(async () => {
    await prisma.oidcSession.deleteMany();
    await prisma.oidcAuthState.deleteMany();
    await prisma.oidcConfig.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('Public Authentication Endpoints', () => {
    describe('POST /oidc/authorize', () => {
      it('should initiate OIDC authentication flow', async () => {
        const response = await request(app)
          .post('/oidc/authorize')
          .send({
            configId: testConfig.id,
            redirectUri: 'https://app.example.com/callback',
            scopes: ['openid', 'profile', 'email']
          });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          success: true,
          data: {
            authUrl: expect.any(String),
            state: expect.any(String),
            nonce: expect.any(String)
          }
        });
      });

      it('should reject invalid request data', async () => {
        const response = await request(app)
          .post('/oidc/authorize')
          .send({
            configId: '',
            redirectUri: 'invalid-uri'
          });

        expect(response.status).toBe(400);
      });
    });

    describe('GET /oidc/callback', () => {
      it('should handle successful OAuth callback', async () => {
        const response = await request(app)
          .get('/oidc/callback')
          .query({
            code: 'test-authorization-code',
            state: 'test-state'
          });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          success: true,
          data: {
            user: expect.any(Object),
            session: expect.any(Object),
            tokens: expect.any(Object)
          }
        });
      });

      it('should handle OAuth error responses', async () => {
        const response = await request(app)
          .get('/oidc/callback')
          .query({
            error: 'access_denied',
            error_description: 'User denied access'
          });

        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({
          success: false,
          error: 'OAUTH_ERROR'
        });
      });

      it('should reject missing parameters', async () => {
        const response = await request(app)
          .get('/oidc/callback')
          .query({
            code: 'test-code'
            // Missing state parameter
          });

        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({
          success: false,
          error: 'INVALID_CALLBACK'
        });
      });
    });

    describe('POST /oidc/refresh', () => {
      it('should refresh access token', async () => {
        const response = await request(app)
          .post('/oidc/refresh')
          .send({
            sessionId: 'test-session-id'
          });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          success: true,
          data: {
            tokens: expect.any(Object)
          }
        });
      });

      it('should reject invalid session ID', async () => {
        const response = await request(app)
          .post('/oidc/refresh')
          .send({
            sessionId: ''
          });

        expect(response.status).toBe(400);
      });
    });

    describe('POST /oidc/logout', () => {
      it('should logout and revoke session', async () => {
        const response = await request(app)
          .post('/oidc/logout')
          .send({
            sessionId: 'test-session-id'
          });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          success: true,
          message: 'Logout successful'
        });
      });
    });

    describe('POST /oidc/validate', () => {
      it('should validate ID token', async () => {
        const response = await request(app)
          .post('/oidc/validate')
          .send({
            idToken: 'test-id-token',
            configId: testConfig.id
          });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          success: true,
          data: {
            claims: expect.any(Object)
          }
        });
      });
    });
  });

  describe('Admin Configuration Endpoints', () => {
    describe('GET /oidc/admin/configs', () => {
      it('should list OIDC configurations', async () => {
        const response = await request(app)
          .get('/oidc/admin/configs');

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          success: true,
          data: expect.any(Array)
        });
      });
    });

    describe('GET /oidc/admin/configs/:id', () => {
      it('should get specific OIDC configuration', async () => {
        const response = await request(app)
          .get(`/oidc/admin/configs/${testConfig.id}`);

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          success: true,
          data: {
            id: testConfig.id,
            name: testConfig.name,
            issuer: testConfig.issuer
          }
        });
      });

      it('should return 404 for non-existent configuration', async () => {
        const response = await request(app)
          .get('/oidc/admin/configs/non-existent-id');

        expect(response.status).toBe(404);
      });
    });

    describe('POST /oidc/admin/configs', () => {
      it('should create new OIDC configuration', async () => {
        const configData = {
          name: 'New OIDC Provider',
          clientId: 'new-client-id',
          clientSecret: 'new-client-secret',
          issuer: 'https://new.example.com',
          scopes: ['openid', 'profile', 'email'],
          usePkce: true
        };

        const response = await request(app)
          .post('/oidc/admin/configs')
          .send(configData);

        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({
          success: true,
          data: {
            name: configData.name,
            issuer: configData.issuer
          }
        });
      });

      it('should reject invalid configuration data', async () => {
        const response = await request(app)
          .post('/oidc/admin/configs')
          .send({
            name: '',
            clientId: 'test',
            // Missing required fields
          });

        expect(response.status).toBe(400);
      });
    });

    describe('PUT /oidc/admin/configs/:id', () => {
      it('should update OIDC configuration', async () => {
        const updateData = {
          scopes: ['openid', 'profile', 'email', 'groups'],
          usePkce: false
        };

        const response = await request(app)
          .put(`/oidc/admin/configs/${testConfig.id}`)
          .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          success: true,
          data: {
            id: testConfig.id
          }
        });
      });
    });

    describe('DELETE /oidc/admin/configs/:id', () => {
      it('should delete OIDC configuration', async () => {
        const response = await request(app)
          .delete(`/oidc/admin/configs/${testConfig.id}`);

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          success: true,
          message: 'Configuration deleted successfully'
        });
      });
    });

    describe('POST /oidc/admin/discovery', () => {
      it('should discover OIDC provider configuration', async () => {
        const response = await request(app)
          .post('/oidc/admin/discovery')
          .send({
            issuerUrl: 'https://provider.example.com'
          });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          success: true,
          data: {
            issuer: expect.any(String),
            authorization_endpoint: expect.any(String),
            token_endpoint: expect.any(String)
          }
        });
      });

      it('should reject invalid issuer URL', async () => {
        const response = await request(app)
          .post('/oidc/admin/discovery')
          .send({
            issuerUrl: 'invalid-url'
          });

        expect(response.status).toBe(400);
      });
    });

    describe('POST /oidc/admin/test/:id', () => {
      it('should test OIDC provider connection', async () => {
        const response = await request(app)
          .post(`/oidc/admin/test/${testConfig.id}`);

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          success: true,
          data: {
            message: 'Connection test successful',
            endpoints: expect.any(Object)
          }
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/oidc/authorize')
        .send('invalid-json')
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/oidc/authorize')
        .send({});

      expect(response.status).toBe(400);
    });
  });
});