/**
 * CSRF Protection Middleware Tests
 * Tests for GitHub Issue #117 - Cross-Site Request Forgery Protection
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { csrfProtection, generateCSRFTokenPair, verifyCSRFTokenPair } from '../../middleware/csrf';
import { authMiddleware } from '../../middleware/auth';
import { errorHandler } from '../../middleware/errorHandler';

// Mock user for testing
const mockUser = {
  id: 'test-user-123',
  username: 'testuser',
  email: 'test@example.com',
  roles: ['user']
};

// Test app setup
const createTestApp = () => {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());

  // Mock auth middleware that adds user to request
  app.use((req: any, res, next) => {
    if (req.headers.authorization === 'Bearer valid-token') {
      req.user = mockUser;
    }
    next();
  });

  // CSRF protection middleware
  app.use('/api/v1', (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Skip CSRF protection for auth and SSO endpoints (like in production)
    if (req.path.startsWith('/auth') || req.path.startsWith('/sso')) {
      return next();
    }
    return csrfProtection(req, res, next);
  });

  // Test routes
  app.get('/api/v1/dashboard', (req, res) => {
    res.json({ message: 'Dashboard data', user: (req as any).user });
  });

  app.post('/api/v1/workorders', (req, res) => {
    res.json({ message: 'Work order created', data: req.body });
  });

  app.put('/api/v1/workorders/123', (req, res) => {
    res.json({ message: 'Work order updated', data: req.body });
  });

  app.delete('/api/v1/workorders/123', (req, res) => {
    res.json({ message: 'Work order deleted' });
  });

  // Auth endpoints (should be exempt from CSRF)
  app.post('/api/v1/auth/login', (req, res) => {
    res.json({ message: 'Login successful', token: 'test-token' });
  });

  app.post('/api/v1/sso/callback', (req, res) => {
    res.json({ message: 'SSO callback processed' });
  });

  // Add error handler middleware
  app.use(errorHandler);

  return app;
};

describe('CSRF Protection Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('CSRF Token Generation', () => {
    it('should generate valid CSRF token pairs', () => {
      const tokenPair = generateCSRFTokenPair();

      expect(tokenPair.clientToken).toBeDefined();
      expect(tokenPair.serverToken).toBeDefined();
      expect(tokenPair.clientToken).toHaveLength(36); // UUID v4 length
      expect(tokenPair.serverToken).toHaveLength(64); // SHA-256 hex length
    });

    it('should generate unique token pairs', () => {
      const pair1 = generateCSRFTokenPair();
      const pair2 = generateCSRFTokenPair();

      expect(pair1.clientToken).not.toBe(pair2.clientToken);
      expect(pair1.serverToken).not.toBe(pair2.serverToken);
    });

    it('should verify valid token pairs', () => {
      const tokenPair = generateCSRFTokenPair();
      const isValid = verifyCSRFTokenPair(tokenPair.clientToken, tokenPair.serverToken);

      expect(isValid).toBe(true);
    });

    it('should reject invalid token pairs', () => {
      const tokenPair = generateCSRFTokenPair();
      const isValid = verifyCSRFTokenPair('invalid-client-token', tokenPair.serverToken);

      expect(isValid).toBe(false);
    });

    it('should reject mismatched token pairs', () => {
      const pair1 = generateCSRFTokenPair();
      const pair2 = generateCSRFTokenPair();
      const isValid = verifyCSRFTokenPair(pair1.clientToken, pair2.serverToken);

      expect(isValid).toBe(false);
    });

    it('should reject empty tokens', () => {
      expect(verifyCSRFTokenPair('', '')).toBe(false);
      expect(verifyCSRFTokenPair('token', '')).toBe(false);
      expect(verifyCSRFTokenPair('', 'token')).toBe(false);
    });
  });

  describe('GET Requests - Token Injection', () => {
    it('should inject CSRF tokens for authenticated GET requests', async () => {
      const response = await request(app)
        .get('/api/v1/dashboard')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.headers['x-csrf-client-token']).toBeDefined();
      expect(response.headers['set-cookie']).toBeDefined();

      const cookieHeader = response.headers['set-cookie'][0];
      expect(cookieHeader).toContain('X-CSRF-Server-Token=');
      expect(cookieHeader).toContain('HttpOnly');
      expect(cookieHeader).toContain('SameSite=Strict');
    });

    it('should not inject CSRF tokens for unauthenticated GET requests', async () => {
      const response = await request(app)
        .get('/api/v1/dashboard')
        .expect(200);

      expect(response.headers['x-csrf-client-token']).toBeUndefined();
      expect(response.headers['set-cookie']).toBeUndefined();
    });
  });

  describe('State-Changing Requests - Token Validation', () => {
    let clientToken: string;
    let serverTokenCookie: string;

    beforeEach(async () => {
      // Get CSRF tokens from a GET request
      const getResponse = await request(app)
        .get('/api/v1/dashboard')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      clientToken = getResponse.headers['x-csrf-client-token'];
      serverTokenCookie = getResponse.headers['set-cookie'][0];
    });

    it('should accept POST requests with valid CSRF tokens', async () => {
      await request(app)
        .post('/api/v1/workorders')
        .set('Authorization', 'Bearer valid-token')
        .set('X-CSRF-Client-Token', clientToken)
        .set('Cookie', serverTokenCookie)
        .send({ partNumber: 'TEST-001', quantity: 10 })
        .expect(200);
    });

    it('should accept PUT requests with valid CSRF tokens', async () => {
      await request(app)
        .put('/api/v1/workorders/123')
        .set('Authorization', 'Bearer valid-token')
        .set('X-CSRF-Client-Token', clientToken)
        .set('Cookie', serverTokenCookie)
        .send({ status: 'In Progress' })
        .expect(200);
    });

    it('should accept DELETE requests with valid CSRF tokens', async () => {
      await request(app)
        .delete('/api/v1/workorders/123')
        .set('Authorization', 'Bearer valid-token')
        .set('X-CSRF-Client-Token', clientToken)
        .set('Cookie', serverTokenCookie)
        .expect(200);
    });

    it('should reject POST requests without CSRF client token', async () => {
      const response = await request(app)
        .post('/api/v1/workorders')
        .set('Authorization', 'Bearer valid-token')
        .set('Cookie', serverTokenCookie)
        .send({ partNumber: 'TEST-001', quantity: 10 })
        .expect(403);

      expect(response.body.message).toBe('CSRF token is required for this request');
      expect(response.body.error).toBe('CSRF_TOKEN_MISSING');
    });

    it('should reject POST requests without CSRF server token', async () => {
      const response = await request(app)
        .post('/api/v1/workorders')
        .set('Authorization', 'Bearer valid-token')
        .set('X-CSRF-Client-Token', clientToken)
        .send({ partNumber: 'TEST-001', quantity: 10 })
        .expect(403);

      expect(response.body.message).toBe('CSRF token is required for this request');
      expect(response.body.error).toBe('CSRF_TOKEN_MISSING');
    });

    it('should reject POST requests with invalid CSRF tokens', async () => {
      const response = await request(app)
        .post('/api/v1/workorders')
        .set('Authorization', 'Bearer valid-token')
        .set('X-CSRF-Client-Token', 'invalid-token')
        .set('Cookie', serverTokenCookie)
        .send({ partNumber: 'TEST-001', quantity: 10 })
        .expect(403);

      expect(response.body.message).toBe('CSRF token is invalid or expired');
      expect(response.body.error).toBe('CSRF_TOKEN_INVALID');
    });

    it('should reject POST requests with mismatched token pairs', async () => {
      // Get different token pair
      const anotherResponse = await request(app)
        .get('/api/v1/dashboard')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      const differentClientToken = anotherResponse.headers['x-csrf-client-token'];

      const response = await request(app)
        .post('/api/v1/workorders')
        .set('Authorization', 'Bearer valid-token')
        .set('X-CSRF-Client-Token', differentClientToken)
        .set('Cookie', serverTokenCookie)
        .send({ partNumber: 'TEST-001', quantity: 10 })
        .expect(403);

      expect(response.body.message).toBe('CSRF token is invalid or expired');
      expect(response.body.error).toBe('CSRF_TOKEN_INVALID');
    });
  });

  describe('Unauthenticated Requests', () => {
    it('should allow unauthenticated POST requests (skip CSRF validation)', async () => {
      await request(app)
        .post('/api/v1/workorders')
        .send({ partNumber: 'TEST-001', quantity: 10 })
        .expect(200);
    });

    it('should allow unauthenticated PUT requests (skip CSRF validation)', async () => {
      await request(app)
        .put('/api/v1/workorders/123')
        .send({ status: 'Updated' })
        .expect(200);
    });

    it('should allow unauthenticated DELETE requests (skip CSRF validation)', async () => {
      await request(app)
        .delete('/api/v1/workorders/123')
        .expect(200);
    });
  });

  describe('Exempt Endpoints', () => {
    it('should allow POST to auth endpoints without CSRF tokens', async () => {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'testuser', password: 'password' })
        .expect(200);
    });

    it('should allow POST to SSO endpoints without CSRF tokens', async () => {
      await request(app)
        .post('/api/v1/sso/callback')
        .send({ code: 'auth-code' })
        .expect(200);
    });

    it('should allow authenticated POST to auth endpoints without CSRF tokens', async () => {
      await request(app)
        .post('/api/v1/auth/login')
        .set('Authorization', 'Bearer valid-token')
        .send({ username: 'testuser', password: 'password' })
        .expect(200);
    });
  });

  describe('Safe HTTP Methods', () => {
    it('should allow GET requests without CSRF validation', async () => {
      await request(app)
        .get('/api/v1/dashboard')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
    });

    it('should allow HEAD requests without CSRF validation', async () => {
      await request(app)
        .head('/api/v1/dashboard')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
    });

    it('should allow OPTIONS requests without CSRF validation', async () => {
      await request(app)
        .options('/api/v1/dashboard')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
    });
  });

  describe('Error Handling', () => {
    it('should return proper error structure for missing tokens', async () => {
      const response = await request(app)
        .post('/api/v1/workorders')
        .set('Authorization', 'Bearer valid-token')
        .send({ partNumber: 'TEST-001' })
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.error).toBe('CSRF_TOKEN_MISSING');
    });

    it('should return proper error structure for invalid tokens', async () => {
      const response = await request(app)
        .post('/api/v1/workorders')
        .set('Authorization', 'Bearer valid-token')
        .set('X-CSRF-Client-Token', 'invalid')
        .set('Cookie', 'X-CSRF-Server-Token=invalid')
        .send({ partNumber: 'TEST-001' })
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.error).toBe('CSRF_TOKEN_INVALID');
    });
  });
});