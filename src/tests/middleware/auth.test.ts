/**
 * Unit Tests for Authentication Middleware
 * Tests JWT authentication, role-based access control, and database-driven RBAC
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import {
  authMiddleware,
  requirePermission,
  requireRole,
  requireAnyRole,
  requireSiteAccess,
  requireResourceOwnership,
  requireQualityAccess,
  requireProductionAccess,
  requireMaintenanceAccess,
  requireManagementAccess,
  requireDashboardAccess,
  requireRoutingAccess,
  requireRoutingWrite,
  requireRoutingApproval,
  requireRoutingActivation,
  optionalAuth,
  requirePermissionDB,
  requireRoleDB,
  requireAnyRoleDB,
  requireAllPermissionsDB,
  requireSiteAccessDB,
  requirePermissionHybrid
} from '../../middleware/auth';
import { AuthenticationError, AuthorizationError } from '../../middleware/errorHandler';

// Set up test environment variables before any imports
process.env.JWT_SECRET = 'test-jwt-secret-for-testing';
process.env.DATABASE_URL = 'postgresql://test_user:test_password@localhost:5432/test_db';
process.env.NODE_ENV = 'test';

// Mock dependencies
vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
    JsonWebTokenError: class JsonWebTokenError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'JsonWebTokenError';
      }
    },
    TokenExpiredError: class TokenExpiredError extends Error {
      constructor(message: string, expiredAt: Date) {
        super(message);
        this.name = 'TokenExpiredError';
        this.expiredAt = expiredAt;
      }
      expiredAt: Date;
    },
    NotBeforeError: class NotBeforeError extends Error {
      constructor(message: string, date: Date) {
        super(message);
        this.name = 'NotBeforeError';
        this.date = date;
      }
      date: Date;
    }
  },
  verify: vi.fn(),
  JsonWebTokenError: class JsonWebTokenError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'JsonWebTokenError';
    }
  },
  TokenExpiredError: class TokenExpiredError extends Error {
    constructor(message: string, expiredAt: Date) {
      super(message);
      this.name = 'TokenExpiredError';
      this.expiredAt = expiredAt;
    }
    expiredAt: Date;
  },
  NotBeforeError: class NotBeforeError extends Error {
    constructor(message: string, date: Date) {
      super(message);
      this.name = 'NotBeforeError';
      this.date = date;
    }
    date: Date;
  }
}));

vi.mock('../../config/config', () => ({
  config: {
    jwt: {
      secret: 'test-jwt-secret-for-testing'
    }
  }
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

vi.mock('../services/permissionService', () => ({
  hasPermission: vi.fn(),
  hasRole: vi.fn(),
  hasAllPermissions: vi.fn(),
  resolveUserPermissions: vi.fn()
}));

const mockedJwt = jwt as any;

describe('Authentication Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
      params: {},
      query: {},
      path: '/api/test',
      method: 'GET',
      ip: '127.0.0.1',
      get: vi.fn().mockReturnValue('test-user-agent')
    };
    mockRes = {};
    mockNext = vi.fn();

    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret';

    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.JWT_SECRET;
  });

  describe('authMiddleware', () => {
    it('should authenticate valid JWT token', async () => {
      const mockPayload = {
        userId: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        roles: ['Production Operator'],
        permissions: ['production.read'],
        siteId: 'site-1',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      mockReq.headers!.authorization = 'Bearer valid-jwt-token';
      mockedJwt.verify.mockReturnValue(mockPayload);

      await authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual({
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        roles: ['Production Operator'],
        permissions: ['production.read'],
        siteId: 'site-1'
      });
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject request without authorization header', async () => {
      await authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AuthenticationError)
      );
      expect(mockReq.user).toBeUndefined();
    });

    it('should reject invalid authorization format', async () => {
      mockReq.headers!.authorization = 'Invalid token format';

      await authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AuthenticationError)
      );
    });

    it('should handle JWT verification errors', async () => {
      mockReq.headers!.authorization = 'Bearer invalid-token';
      mockedJwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('Invalid token');
      });

      await authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AuthenticationError)
      );
    });

    it('should handle expired token', async () => {
      mockReq.headers!.authorization = 'Bearer expired-token';
      mockedJwt.verify.mockImplementation(() => {
        throw new jwt.TokenExpiredError('Token expired', new Date());
      });

      await authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AuthenticationError)
      );
    });

    it('should handle missing token after Bearer prefix', async () => {
      mockReq.headers!.authorization = 'Bearer ';

      await authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AuthenticationError)
      );
    });
  });

  describe('requirePermission', () => {
    beforeEach(() => {
      mockReq.user = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        roles: ['Production Operator'],
        permissions: ['production.read', 'quality.read'],
        siteId: 'site-1'
      };
    });

    it('should allow access with required permission', () => {
      const middleware = requirePermission('production.read');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access without required permission', () => {
      const middleware = requirePermission('admin.write');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AuthorizationError)
      );
    });

    it('should require authentication', () => {
      delete mockReq.user;
      const middleware = requirePermission('production.read');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AuthenticationError)
      );
    });
  });

  describe('requireRole', () => {
    beforeEach(() => {
      mockReq.user = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        roles: ['Production Operator', 'Quality Inspector'],
        permissions: ['production.read'],
        siteId: 'site-1'
      };
    });

    it('should allow access with required role', () => {
      const middleware = requireRole('Production Operator');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access without required role', () => {
      const middleware = requireRole('System Administrator');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AuthorizationError)
      );
    });

    it('should require authentication', () => {
      delete mockReq.user;
      const middleware = requireRole('Production Operator');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AuthenticationError)
      );
    });
  });

  describe('requireAnyRole', () => {
    beforeEach(() => {
      mockReq.user = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        roles: ['Production Operator'],
        permissions: ['production.read'],
        siteId: 'site-1'
      };
    });

    it('should allow access with one of required roles', () => {
      const middleware = requireAnyRole(['System Administrator', 'Production Operator']);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access without any required roles', () => {
      const middleware = requireAnyRole(['System Administrator', 'Plant Manager']);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AuthorizationError)
      );
    });

    it('should require authentication', () => {
      delete mockReq.user;
      const middleware = requireAnyRole(['Production Operator']);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AuthenticationError)
      );
    });
  });

  describe('requireSiteAccess', () => {
    beforeEach(() => {
      mockReq.user = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        roles: ['Production Operator'],
        permissions: ['production.read'],
        siteId: 'site-1'
      };
    });

    it('should allow access when no site is requested', () => {
      requireSiteAccess(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow System Administrator to access any site', () => {
      mockReq.user!.roles = ['System Administrator'];
      mockReq.params = { siteId: 'site-2' };

      requireSiteAccess(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow access to users own site', () => {
      mockReq.params = { siteId: 'site-1' };

      requireSiteAccess(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access to different site', () => {
      mockReq.params = { siteId: 'site-2' };

      requireSiteAccess(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AuthorizationError)
      );
    });

    it('should require authentication', () => {
      delete mockReq.user;
      requireSiteAccess(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AuthenticationError)
      );
    });
  });

  describe('requireResourceOwnership', () => {
    beforeEach(() => {
      mockReq.user = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        roles: ['Production Operator'],
        permissions: ['production.read'],
        siteId: 'site-1'
      };
      mockReq.params = { resourceId: 'resource-1' };
    });

    it('should allow System Administrator access to any resource', async () => {
      mockReq.user!.roles = ['System Administrator'];
      const middleware = requireResourceOwnership('resourceId');

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should require authentication', async () => {
      delete mockReq.user;
      const middleware = requireResourceOwnership('resourceId');

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AuthenticationError)
      );
    });

    it('should require resource ID parameter', async () => {
      delete mockReq.params!.resourceId;
      const middleware = requireResourceOwnership('resourceId');

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AuthorizationError)
      );
    });
  });

  describe('requireDashboardAccess', () => {
    beforeEach(() => {
      mockReq.user = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        roles: ['Production Operator'],
        permissions: ['production.read'],
        siteId: 'site-1'
      };
    });

    it('should allow production roles access', () => {
      requireDashboardAccess(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow wildcard read permission', () => {
      mockReq.user!.roles = ['DCMA Inspector'];
      mockReq.user!.permissions = ['*.read'];

      requireDashboardAccess(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access without proper roles or permissions', () => {
      mockReq.user!.roles = ['Unauthorized Role'];
      mockReq.user!.permissions = ['other.permission'];

      requireDashboardAccess(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AuthorizationError)
      );
    });

    it('should require authentication', () => {
      delete mockReq.user;
      requireDashboardAccess(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AuthenticationError)
      );
    });
  });

  describe('requireRoutingAccess', () => {
    beforeEach(() => {
      mockReq.user = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        roles: ['Manufacturing Engineer'],
        permissions: ['routings.read'],
        siteId: 'site-1'
      };
    });

    it('should allow Manufacturing Engineer access', () => {
      requireRoutingAccess(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow wildcard permission', () => {
      mockReq.user!.roles = ['Custom Role'];
      mockReq.user!.permissions = ['*'];

      requireRoutingAccess(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow specific routing permissions', () => {
      mockReq.user!.roles = ['Custom Role'];
      mockReq.user!.permissions = ['routings.read'];

      requireRoutingAccess(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access without proper authorization', () => {
      mockReq.user!.roles = ['Unauthorized Role'];
      mockReq.user!.permissions = ['other.permission'];

      requireRoutingAccess(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AuthorizationError)
      );
    });
  });

  describe('requireRoutingWrite', () => {
    beforeEach(() => {
      mockReq.user = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        roles: ['Manufacturing Engineer'],
        permissions: ['routings.write'],
        siteId: 'site-1'
      };
    });

    it('should allow with write permission', () => {
      requireRoutingWrite(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow with wildcard permission', () => {
      mockReq.user!.permissions = ['*'];

      requireRoutingWrite(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny without write permission', () => {
      mockReq.user!.permissions = ['routings.read'];

      requireRoutingWrite(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AuthorizationError)
      );
    });
  });

  describe('requireRoutingApproval', () => {
    beforeEach(() => {
      mockReq.user = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        roles: ['Manufacturing Engineer'],
        permissions: ['routings.approve'],
        siteId: 'site-1'
      };
    });

    it('should allow with approval permission', () => {
      requireRoutingApproval(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny without approval permission', () => {
      mockReq.user!.permissions = ['routings.write'];

      requireRoutingApproval(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AuthorizationError)
      );
    });
  });

  describe('requireRoutingActivation', () => {
    beforeEach(() => {
      mockReq.user = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        roles: ['Manufacturing Engineer'],
        permissions: ['routings.activate'],
        siteId: 'site-1'
      };
    });

    it('should allow with activation permission', () => {
      requireRoutingActivation(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny without activation permission', () => {
      mockReq.user!.permissions = ['routings.write'];

      requireRoutingActivation(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AuthorizationError)
      );
    });
  });

  describe('optionalAuth', () => {
    it('should attach user when valid token provided', async () => {
      const mockPayload = {
        userId: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        roles: ['Production Operator'],
        permissions: ['production.read'],
        siteId: 'site-1'
      };

      mockReq.headers!.authorization = 'Bearer valid-token';
      mockedJwt.verify.mockReturnValue(mockPayload);

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeDefined();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should continue without user when no token provided', async () => {
      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should continue without user when invalid token provided', async () => {
      mockReq.headers!.authorization = 'Bearer invalid-token';
      mockedJwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('Invalid token');
      });

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('Predefined Role Access Functions', () => {
    beforeEach(() => {
      mockReq.user = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        roles: ['Quality Engineer'],
        permissions: ['quality.read'],
        siteId: 'site-1'
      };
    });

    it('should allow Quality Engineer quality access', () => {
      requireQualityAccess(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny quality access for non-quality roles', () => {
      mockReq.user!.roles = ['Production Operator'];
      requireQualityAccess(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthorizationError));
    });

    it('should allow Production Operator production access', () => {
      mockReq.user!.roles = ['Production Operator'];
      requireProductionAccess(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow Maintenance Technician maintenance access', () => {
      mockReq.user!.roles = ['Maintenance Technician'];
      requireMaintenanceAccess(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow Plant Manager management access', () => {
      mockReq.user!.roles = ['Plant Manager'];
      requireManagementAccess(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });
  });
});