import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import adminUserRoutes from '../../routes/admin/users';
import { UserService } from '../../services/UserService';
import {
  AuthTestHelper,
  RequestTestHelper,
  ValidationTestHelper,
  ServiceMockHelper,
  ResponseTestHelper,
  DatabaseTestHelper
} from '../helpers/routeTestHelpers';
import { setupTestDatabase, teardownTestDatabase, cleanupTestData } from '../helpers/database';

// Mock the UserService
vi.mock('../../services/UserService');

// Mock RBAC middleware
const mockRBACMiddleware = (requiredPermission: string) => {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!req.user.permissions.includes(requiredPermission)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
};

// Mock auth middleware
const mockAuthMiddleware = (user: any = null) => {
  return (req: any, res: any, next: any) => {
    if (user) {
      req.user = user;
      next();
    } else {
      res.status(401).json({ success: false, error: 'Unauthorized' });
    }
  };
};

describe('Admin User Routes', () => {
  let app: express.Application;
  let mockUserService: any;
  let testDb: PrismaClient;
  let adminUser: any;
  let managerUser: any;
  let operatorUser: any;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Create test users with different permission levels
    adminUser = AuthTestHelper.createMockUser({
      id: 'admin-user-001',
      username: 'admin',
      roles: ['System Administrator'],
      permissions: [
        'admin.read', 'admin.write', 'admin.execute', 'admin.admin',
        'user.read', 'user.write', 'user.admin',
        'role.read', 'role.write', 'role.admin',
        'permission.read', 'permission.write', 'permission.admin',
        'site.access'
      ]
    });

    managerUser = AuthTestHelper.createManagerUser();
    managerUser.permissions.push('admin.read', 'user.read'); // Some admin permissions

    operatorUser = AuthTestHelper.createReadOnlyUser();

    // Setup Express app
    app = express();
    app.use(express.json());

    // Setup authentication middleware that varies by test
    let currentUser: any = adminUser; // Default to admin for most tests

    app.use((req, res, next) => {
      if (currentUser) {
        req.user = currentUser;
        next();
      } else {
        res.status(401).json({ success: false, error: 'Unauthorized' });
      }
    });

    // Mount admin routes with RBAC middleware
    app.use('/api/v1/admin/users', adminUserRoutes);

    // Create mock service
    mockUserService = ServiceMockHelper.createMockService('UserService', [
      'createUser',
      'getUsers',
      'getUserById',
      'updateUser',
      'deleteUser',
      'activateUser',
      'deactivateUser',
      'resetPassword',
      'assignRoles',
      'revokeRoles',
      'getUserPermissions',
      'getUserHistory',
      'getUserStatistics'
    ]);

    (UserService as any).mockImplementation(() => mockUserService);

    vi.clearAllMocks();

    // Helper to change current user for specific tests
    this.setCurrentUser = (user: any) => {
      currentUser = user;
    };
  });

  afterEach(async () => {
    await cleanupTestData(testDb);
    vi.restoreAllMocks();
  });

  describe('POST /api/v1/admin/users', () => {
    const validUserData = {
      username: 'newuser',
      email: 'newuser@example.com',
      firstName: 'New',
      lastName: 'User',
      password: 'SecurePassword123!',
      roles: ['Production Operator'],
      isActive: true
    };

    it('should create a new user when user has admin permissions', async () => {
      const mockCreatedUser = {
        id: 'user-new-001',
        ...validUserData,
        passwordHash: '$2b$10$hashedpassword',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdById: adminUser.id
      };
      delete (mockCreatedUser as any).password;

      ServiceMockHelper.mockServiceSuccess(mockUserService, 'createUser', mockCreatedUser);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/admin/users', adminUser, validUserData
      );

      ResponseTestHelper.expectCreatedResponse(response);
      expect(response.body.data).not.toHaveProperty('password');
      expect(response.body.data).not.toHaveProperty('passwordHash');
      expect(mockUserService.createUser).toHaveBeenCalledWith({
        ...validUserData,
        createdById: adminUser.id
      });
    });

    it('should return 403 for users without admin.write permission', async () => {
      // Test with manager who has admin.read but not admin.write
      const limitedManagerUser = { ...managerUser };
      limitedManagerUser.permissions = limitedManagerUser.permissions.filter(p => p !== 'admin.write');

      await RequestTestHelper.testForbiddenAccess(
        app, 'post', '/api/v1/admin/users', limitedManagerUser, validUserData
      );
    });

    it('should return 403 for operator users', async () => {
      await RequestTestHelper.testForbiddenAccess(
        app, 'post', '/api/v1/admin/users', operatorUser, validUserData
      );
    });

    it('should validate required fields', async () => {
      await ValidationTestHelper.testRequiredFields(
        app, 'post', '/api/v1/admin/users', adminUser, validUserData,
        ['username', 'email', 'firstName', 'lastName', 'password']
      );
    });

    it('should validate email format', async () => {
      const invalidData = { ...validUserData, email: 'invalid-email' };

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/admin/users', adminUser, invalidData
      );

      ResponseTestHelper.expectValidationError(response);
    });

    it('should validate password strength', async () => {
      const weakPasswords = ['123', 'password', 'abc123'];

      for (const weakPassword of weakPasswords) {
        const invalidData = { ...validUserData, password: weakPassword };

        const response = await RequestTestHelper.makeAuthenticatedRequest(
          app, 'post', '/api/v1/admin/users', adminUser, invalidData
        );

        ResponseTestHelper.expectValidationError(response);
      }
    });

    it('should handle username conflicts', async () => {
      const error = new Error('Username already exists');
      (error as any).code = 'DUPLICATE_USERNAME';
      ServiceMockHelper.mockServiceError(mockUserService, 'createUser', error);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/admin/users', adminUser, validUserData
      );

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Username already exists');
    });
  });

  describe('GET /api/v1/admin/users', () => {
    it('should retrieve users when user has admin.read permission', async () => {
      const mockUsers = [
        {
          id: 'user-001',
          username: 'user1',
          email: 'user1@example.com',
          firstName: 'User',
          lastName: 'One',
          roles: ['Production Operator'],
          isActive: true,
          lastLoginAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        },
        {
          id: 'user-002',
          username: 'user2',
          email: 'user2@example.com',
          firstName: 'User',
          lastName: 'Two',
          roles: ['Production Supervisor'],
          isActive: true,
          lastLoginAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        }
      ];

      const mockResponse = {
        data: mockUsers,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1
        }
      };

      ServiceMockHelper.mockServiceSuccess(mockUserService, 'getUsers', mockResponse);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/admin/users', adminUser, undefined, { page: 1, limit: 10 }
      );

      ResponseTestHelper.expectPaginatedResponse(response);
      expect(response.body.data).toEqual(mockUsers);
      // Ensure passwords are not returned
      response.body.data.forEach((user: any) => {
        expect(user).not.toHaveProperty('password');
        expect(user).not.toHaveProperty('passwordHash');
      });
    });

    it('should allow managers with admin.read to view users', async () => {
      const mockResponse = {
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
      };

      ServiceMockHelper.mockServiceSuccess(mockUserService, 'getUsers', mockResponse);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/admin/users', managerUser, undefined, { page: 1, limit: 10 }
      );

      expect(response.status).toBe(200);
    });

    it('should return 403 for operator users', async () => {
      await RequestTestHelper.testForbiddenAccess(
        app, 'get', '/api/v1/admin/users', operatorUser
      );
    });

    it('should filter users by role', async () => {
      const mockResponse = {
        data: [{ id: 'user-001', roles: ['Production Supervisor'] }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
      };

      ServiceMockHelper.mockServiceSuccess(mockUserService, 'getUsers', mockResponse);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/admin/users', adminUser, undefined,
        { role: 'Production Supervisor', page: 1, limit: 10 }
      );

      ResponseTestHelper.expectPaginatedResponse(response);
      expect(mockUserService.getUsers).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        role: 'Production Supervisor'
      });
    });

    it('should filter users by active status', async () => {
      const mockResponse = {
        data: [{ id: 'user-001', isActive: true }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
      };

      ServiceMockHelper.mockServiceSuccess(mockUserService, 'getUsers', mockResponse);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/admin/users', adminUser, undefined,
        { isActive: 'true', page: 1, limit: 10 }
      );

      ResponseTestHelper.expectPaginatedResponse(response);
      expect(mockUserService.getUsers).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        isActive: true
      });
    });
  });

  describe('GET /api/v1/admin/users/:id', () => {
    it('should retrieve specific user when user has admin.read permission', async () => {
      const mockUser = {
        id: 'user-001',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        roles: ['Production Operator'],
        permissions: ['production.read', 'site.access'],
        isActive: true,
        lastLoginAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      ServiceMockHelper.mockServiceSuccess(mockUserService, 'getUserById', mockUser);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/admin/users/user-001', adminUser
      );

      ResponseTestHelper.expectSuccessResponse(response, mockUser);
      expect(response.body.data).not.toHaveProperty('password');
      expect(response.body.data).not.toHaveProperty('passwordHash');
      expect(mockUserService.getUserById).toHaveBeenCalledWith('user-001');
    });

    it('should return 403 for operator users', async () => {
      await RequestTestHelper.testForbiddenAccess(
        app, 'get', '/api/v1/admin/users/user-001', operatorUser
      );
    });

    it('should return 404 for non-existent user', async () => {
      ServiceMockHelper.mockServiceNotFoundError(mockUserService, 'getUserById');

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/admin/users/non-existent', adminUser
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/admin/users/:id', () => {
    const updateData = {
      firstName: 'Updated',
      lastName: 'Name',
      email: 'updated@example.com',
      roles: ['Production Supervisor']
    };

    it('should update user when user has admin.write permission', async () => {
      const mockUpdatedUser = {
        id: 'user-001',
        username: 'testuser',
        ...updateData,
        isActive: true,
        updatedAt: new Date().toISOString()
      };

      ServiceMockHelper.mockServiceSuccess(mockUserService, 'updateUser', mockUpdatedUser);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'put', '/api/v1/admin/users/user-001', adminUser, updateData
      );

      ResponseTestHelper.expectSuccessResponse(response, mockUpdatedUser);
      expect(mockUserService.updateUser).toHaveBeenCalledWith('user-001', updateData);
    });

    it('should return 403 for users without admin.write permission', async () => {
      await RequestTestHelper.testForbiddenAccess(
        app, 'put', '/api/v1/admin/users/user-001', managerUser, updateData
      );
    });

    it('should prevent users from updating themselves', async () => {
      const error = new Error('Cannot update own user account');
      (error as any).code = 'SELF_UPDATE_FORBIDDEN';
      ServiceMockHelper.mockServiceError(mockUserService, 'updateUser', error);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'put', `/api/v1/admin/users/${adminUser.id}`, adminUser, updateData
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Cannot update own user account');
    });

    it('should validate email format on update', async () => {
      const invalidData = { ...updateData, email: 'invalid-email' };

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'put', '/api/v1/admin/users/user-001', adminUser, invalidData
      );

      ResponseTestHelper.expectValidationError(response);
    });
  });

  describe('POST /api/v1/admin/users/:id/roles', () => {
    const roleAssignmentData = {
      roles: ['Production Supervisor', 'Quality Inspector']
    };

    it('should assign roles when user has role.admin permission', async () => {
      const mockUpdatedUser = {
        id: 'user-001',
        username: 'testuser',
        roles: ['Production Supervisor', 'Quality Inspector'],
        updatedAt: new Date().toISOString()
      };

      ServiceMockHelper.mockServiceSuccess(mockUserService, 'assignRoles', mockUpdatedUser);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/admin/users/user-001/roles', adminUser, roleAssignmentData
      );

      ResponseTestHelper.expectSuccessResponse(response, mockUpdatedUser);
      expect(mockUserService.assignRoles).toHaveBeenCalledWith('user-001', roleAssignmentData.roles);
    });

    it('should return 403 for users without role.admin permission', async () => {
      await RequestTestHelper.testForbiddenAccess(
        app, 'post', '/api/v1/admin/users/user-001/roles', managerUser, roleAssignmentData
      );
    });

    it('should validate role names', async () => {
      const invalidRoleData = { roles: ['InvalidRole', 'AnotherInvalidRole'] };

      const error = new Error('Invalid role names provided');
      (error as any).code = 'INVALID_ROLES';
      ServiceMockHelper.mockServiceError(mockUserService, 'assignRoles', error);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/admin/users/user-001/roles', adminUser, invalidRoleData
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/admin/users/:id/deactivate', () => {
    it('should deactivate user when user has admin.execute permission', async () => {
      const mockDeactivatedUser = {
        id: 'user-001',
        username: 'testuser',
        isActive: false,
        deactivatedAt: new Date().toISOString(),
        deactivatedById: adminUser.id
      };

      ServiceMockHelper.mockServiceSuccess(mockUserService, 'deactivateUser', mockDeactivatedUser);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/admin/users/user-001/deactivate', adminUser
      );

      ResponseTestHelper.expectSuccessResponse(response, mockDeactivatedUser);
      expect(mockUserService.deactivateUser).toHaveBeenCalledWith('user-001', adminUser.id);
    });

    it('should return 403 for users without admin.execute permission', async () => {
      await RequestTestHelper.testForbiddenAccess(
        app, 'post', '/api/v1/admin/users/user-001/deactivate', managerUser
      );
    });

    it('should prevent deactivating own account', async () => {
      const error = new Error('Cannot deactivate own account');
      (error as any).code = 'SELF_DEACTIVATION_FORBIDDEN';
      ServiceMockHelper.mockServiceError(mockUserService, 'deactivateUser', error);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', `/api/v1/admin/users/${adminUser.id}/deactivate`, adminUser
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Cannot deactivate own account');
    });
  });

  describe('DELETE /api/v1/admin/users/:id', () => {
    it('should delete user when user has admin.admin permission', async () => {
      const mockDeletedUser = {
        id: 'user-001',
        username: 'testuser',
        deletedAt: new Date().toISOString()
      };

      ServiceMockHelper.mockServiceSuccess(mockUserService, 'deleteUser', mockDeletedUser);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'delete', '/api/v1/admin/users/user-001', adminUser
      );

      ResponseTestHelper.expectSuccessResponse(response);
      expect(response.body.message).toBe('User deleted successfully');
      expect(mockUserService.deleteUser).toHaveBeenCalledWith('user-001');
    });

    it('should return 403 for users without admin.admin permission', async () => {
      await RequestTestHelper.testForbiddenAccess(
        app, 'delete', '/api/v1/admin/users/user-001', managerUser
      );
    });

    it('should prevent deleting own account', async () => {
      const error = new Error('Cannot delete own account');
      (error as any).code = 'SELF_DELETION_FORBIDDEN';
      ServiceMockHelper.mockServiceError(mockUserService, 'deleteUser', error);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'delete', `/api/v1/admin/users/${adminUser.id}`, adminUser
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Cannot delete own account');
    });
  });

  describe('Authentication and Authorization Edge Cases', () => {
    it('should return 401 for requests without authentication token', async () => {
      const response = await request(app).get('/api/v1/admin/users');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 for requests with invalid authentication token', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', 'Bearer invalid-token');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should handle expired tokens gracefully', async () => {
      // Mock an expired token scenario
      const expiredUser = null; // Simulating expired/invalid token

      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', 'Bearer expired-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should validate permission hierarchy', async () => {
      // Test that lower-level permissions don't grant higher-level access
      const limitedUser = AuthTestHelper.createMockUser({
        permissions: ['admin.read'] // Only read, not write
      });

      await RequestTestHelper.testForbiddenAccess(
        app, 'post', '/api/v1/admin/users', limitedUser, {
          username: 'test', email: 'test@example.com',
          firstName: 'Test', lastName: 'User', password: 'Password123!'
        }
      );
    });
  });
});