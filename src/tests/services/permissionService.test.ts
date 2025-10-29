/**
 * Permission Service Tests - GitHub Issue #29
 *
 * Tests for the database-driven RBAC permission resolution service
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import {
  resolveUserPermissions,
  hasPermission,
  hasRole,
  hasAllPermissions,
  expandWildcardPermissions,
  getAllPermissions,
  clearUserPermissionCache,
  clearAllPermissionCaches
} from '../../services/permissionService';

const prisma = new PrismaClient();

describe('Permission Service', () => {
  let testUserId: string;
  let testSiteId: string;
  let testRoleId: string;
  let testPermissionId: string;
  let wildcardPermissionId: string;

  beforeAll(async () => {
    // Clear all caches before tests
    clearAllPermissionCaches();
  });

  beforeEach(async () => {
    // Create test data
    const testUser = await prisma.user.create({
      data: {
        username: 'testuser_rbac',
        email: 'testuser_rbac@test.com',
        passwordHash: 'hashedpassword',
        firstName: 'Test',
        lastName: 'User',
        roles: [],
        permissions: []
      }
    });
    testUserId = testUser.id;

    const testSite = await prisma.site.create({
      data: {
        siteCode: 'TEST_RBAC',
        siteName: 'Test Site RBAC',
        description: 'Test site for RBAC testing',
        isActive: true
      }
    });
    testSiteId = testSite.id;

    const testRole = await prisma.role.create({
      data: {
        roleCode: 'test_role',
        roleName: 'Test Role',
        description: 'Test role for RBAC testing',
        isActive: true,
        isGlobal: true,
        createdBy: 'system'
      }
    });
    testRoleId = testRole.id;

    const testPermission = await prisma.permission.create({
      data: {
        permissionCode: 'workorders.read',
        permissionName: 'Read Work Orders',
        description: 'Permission to read work orders',
        category: 'workorders',
        isActive: true,
        isWildcard: false
      }
    });
    testPermissionId = testPermission.id;

    const wildcardPermission = await prisma.permission.create({
      data: {
        permissionCode: 'workorders.*',
        permissionName: 'All Work Order Permissions',
        description: 'Wildcard permission for all work order operations',
        category: 'workorders',
        isActive: true,
        isWildcard: true
      }
    });
    wildcardPermissionId = wildcardPermission.id;

    // Clear cache after setup
    clearAllPermissionCaches();
  });

  afterEach(async () => {
    // Clean up test data - be forgiving if tables don't exist
    try {
      // Only try to delete if we have the IDs (meaning the tables exist)
      if (testUserId) {
        try {
          await prisma.userSiteRole.deleteMany({ where: { userId: testUserId } });
        } catch (e) {
          // Table may not exist yet
        }
        try {
          await prisma.userRole.deleteMany({ where: { userId: testUserId } });
        } catch (e) {
          // Table may not exist yet
        }
        await prisma.user.deleteMany({ where: { username: 'testuser_rbac' } });
      }

      if (testRoleId) {
        try {
          await prisma.rolePermission.deleteMany({ where: { roleId: testRoleId } });
        } catch (e) {
          // Table may not exist yet
        }
        try {
          await prisma.role.deleteMany({ where: { roleCode: 'test_role' } });
        } catch (e) {
          // Table may not exist yet
        }
      }

      try {
        await prisma.permission.deleteMany({
          where: {
            permissionCode: { in: ['workorders.read', 'workorders.*', 'workorders.write', 'workorders.create'] }
          }
        });
      } catch (e) {
        // Table may not exist yet
      }

      if (testSiteId) {
        await prisma.site.deleteMany({ where: { siteCode: 'TEST_RBAC' } });
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }

    // Clear cache after each test
    clearAllPermissionCaches();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('getAllPermissions', () => {
    it('should return all active permissions', async () => {
      const permissions = await getAllPermissions();
      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions.length).toBeGreaterThan(0);
      expect(permissions).toContain('workorders.read');
    });
  });

  describe('expandWildcardPermissions', () => {
    beforeEach(async () => {
      // Create additional test permissions for wildcard expansion
      await prisma.permission.createMany({
        data: [
          {
            permissionCode: 'workorders.write',
            permissionName: 'Write Work Orders',
            description: 'Permission to write work orders',
            category: 'workorders',
            isActive: true,
            isWildcard: false
          },
          {
            permissionCode: 'workorders.create',
            permissionName: 'Create Work Orders',
            description: 'Permission to create work orders',
            category: 'workorders',
            isActive: true,
            isWildcard: false
          }
        ]
      });
    });

    it('should expand global wildcard permission', async () => {
      const expanded = await expandWildcardPermissions(['*']);
      expect(Array.isArray(expanded)).toBe(true);
      expect(expanded.length).toBeGreaterThan(3);
      expect(expanded).toContain('workorders.read');
      expect(expanded).toContain('workorders.write');
      expect(expanded).toContain('workorders.create');
    });

    it('should expand category wildcard permission', async () => {
      const expanded = await expandWildcardPermissions(['workorders.*']);
      expect(Array.isArray(expanded)).toBe(true);
      expect(expanded.length).toBeGreaterThanOrEqual(3);
      expect(expanded).toContain('workorders.read');
      expect(expanded).toContain('workorders.write');
      expect(expanded).toContain('workorders.create');
    });

    it('should return empty array for empty input', async () => {
      const expanded = await expandWildcardPermissions([]);
      expect(expanded).toEqual([]);
    });

    it('should handle non-wildcard permissions', async () => {
      const expanded = await expandWildcardPermissions(['workorders.read']);
      expect(expanded).toEqual(['workorders.read']);
    });
  });

  describe('resolveUserPermissions', () => {
    it('should return empty permissions for user with no role assignments', async () => {
      const resolved = await resolveUserPermissions(testUserId);

      expect(resolved.globalRoles).toEqual([]);
      expect(resolved.siteRoles).toEqual([]);
      expect(resolved.permissions).toEqual([]);
      expect(resolved.wildcardPermissions).toEqual([]);
      expect(resolved.isSystemAdmin).toBe(false);
    });

    it('should resolve global role permissions', async () => {
      // Assign permission to role
      await prisma.rolePermission.create({
        data: {
          roleId: testRoleId,
          permissionId: testPermissionId,
          grantedBy: 'system'
        }
      });

      // Assign role to user
      await prisma.userRole.create({
        data: {
          userId: testUserId,
          roleId: testRoleId,
          assignedBy: 'system'
        }
      });

      const resolved = await resolveUserPermissions(testUserId);

      expect(resolved.globalRoles).toContain('Test Role');
      expect(resolved.permissions).toContain('workorders.read');
      expect(resolved.isSystemAdmin).toBe(false);
    });

    it('should resolve wildcard permissions', async () => {
      // Assign wildcard permission to role
      await prisma.rolePermission.create({
        data: {
          roleId: testRoleId,
          permissionId: wildcardPermissionId,
          grantedBy: 'system'
        }
      });

      // Assign role to user
      await prisma.userRole.create({
        data: {
          userId: testUserId,
          roleId: testRoleId,
          assignedBy: 'system'
        }
      });

      const resolved = await resolveUserPermissions(testUserId);

      expect(resolved.wildcardPermissions).toContain('workorders.*');
      expect(resolved.permissions.length).toBeGreaterThan(0);
    });

    it('should resolve site-specific role permissions', async () => {
      // Assign permission to role
      await prisma.rolePermission.create({
        data: {
          roleId: testRoleId,
          permissionId: testPermissionId,
          grantedBy: 'system'
        }
      });

      // Assign site-specific role to user
      await prisma.userSiteRole.create({
        data: {
          userId: testUserId,
          siteId: testSiteId,
          roleId: testRoleId,
          assignedBy: 'system'
        }
      });

      const resolved = await resolveUserPermissions(testUserId, testSiteId);

      expect(resolved.siteRoles.length).toBe(1);
      expect(resolved.siteRoles[0].siteId).toBe(testSiteId);
      expect(resolved.siteRoles[0].roles).toContain('Test Role');
      expect(resolved.permissions).toContain('workorders.read');
    });

    it('should identify system administrator', async () => {
      // Create global admin permission
      const adminPermission = await prisma.permission.create({
        data: {
          permissionCode: '*',
          permissionName: 'Global Administrator Access',
          description: 'Global administrator permission',
          category: 'admin',
          isActive: true,
          isWildcard: true
        }
      });

      // Assign admin permission to role
      await prisma.rolePermission.create({
        data: {
          roleId: testRoleId,
          permissionId: adminPermission.id,
          grantedBy: 'system'
        }
      });

      // Assign role to user
      await prisma.userRole.create({
        data: {
          userId: testUserId,
          roleId: testRoleId,
          assignedBy: 'system'
        }
      });

      const resolved = await resolveUserPermissions(testUserId);

      expect(resolved.isSystemAdmin).toBe(true);
      expect(resolved.wildcardPermissions).toContain('*');
    });
  });

  describe('hasPermission', () => {
    beforeEach(async () => {
      // Set up role with permission
      await prisma.rolePermission.create({
        data: {
          roleId: testRoleId,
          permissionId: testPermissionId,
          grantedBy: 'system'
        }
      });

      await prisma.userRole.create({
        data: {
          userId: testUserId,
          roleId: testRoleId,
          assignedBy: 'system'
        }
      });
    });

    it('should return true for granted permission', async () => {
      const result = await hasPermission(testUserId, 'workorders.read');
      expect(result).toBe(true);
    });

    it('should return false for non-granted permission', async () => {
      const result = await hasPermission(testUserId, 'workorders.write');
      expect(result).toBe(false);
    });

    it('should work with site-specific permissions', async () => {
      // Remove global assignment and add site-specific
      await prisma.userRole.deleteMany({ where: { userId: testUserId } });
      await prisma.userSiteRole.create({
        data: {
          userId: testUserId,
          siteId: testSiteId,
          roleId: testRoleId,
          assignedBy: 'system'
        }
      });

      const result = await hasPermission(testUserId, 'workorders.read', testSiteId);
      expect(result).toBe(true);
    });
  });

  describe('hasRole', () => {
    beforeEach(async () => {
      await prisma.userRole.create({
        data: {
          userId: testUserId,
          roleId: testRoleId,
          assignedBy: 'system'
        }
      });
    });

    it('should return true for assigned role', async () => {
      const result = await hasRole(testUserId, 'Test Role');
      expect(result).toBe(true);
    });

    it('should return false for non-assigned role', async () => {
      const result = await hasRole(testUserId, 'Non-existent Role');
      expect(result).toBe(false);
    });

    it('should work with array of roles', async () => {
      const result = await hasRole(testUserId, ['Test Role', 'Another Role']);
      expect(result).toBe(true);
    });

    it('should work with site-specific roles', async () => {
      // Remove global assignment and add site-specific
      await prisma.userRole.deleteMany({ where: { userId: testUserId } });
      await prisma.userSiteRole.create({
        data: {
          userId: testUserId,
          siteId: testSiteId,
          roleId: testRoleId,
          assignedBy: 'system'
        }
      });

      const result = await hasRole(testUserId, 'Test Role', testSiteId);
      expect(result).toBe(true);
    });
  });

  describe('hasAllPermissions', () => {
    beforeEach(async () => {
      // Create additional permission
      const writePermission = await prisma.permission.create({
        data: {
          permissionCode: 'workorders.write',
          permissionName: 'Write Work Orders',
          description: 'Permission to write work orders',
          category: 'workorders',
          isActive: true,
          isWildcard: false
        }
      });

      // Assign both permissions to role
      await prisma.rolePermission.createMany({
        data: [
          {
            roleId: testRoleId,
            permissionId: testPermissionId,
            grantedBy: 'system'
          },
          {
            roleId: testRoleId,
            permissionId: writePermission.id,
            grantedBy: 'system'
          }
        ]
      });

      await prisma.userRole.create({
        data: {
          userId: testUserId,
          roleId: testRoleId,
          assignedBy: 'system'
        }
      });
    });

    it('should return true when user has all permissions', async () => {
      const result = await hasAllPermissions(testUserId, ['workorders.read', 'workorders.write']);
      expect(result).toBe(true);
    });

    it('should return false when user is missing permissions', async () => {
      const result = await hasAllPermissions(testUserId, ['workorders.read', 'workorders.delete']);
      expect(result).toBe(false);
    });
  });

  describe('caching', () => {
    beforeEach(async () => {
      await prisma.rolePermission.create({
        data: {
          roleId: testRoleId,
          permissionId: testPermissionId,
          grantedBy: 'system'
        }
      });

      await prisma.userRole.create({
        data: {
          userId: testUserId,
          roleId: testRoleId,
          assignedBy: 'system'
        }
      });
    });

    it('should cache permission resolution results', async () => {
      // First call
      const start1 = Date.now();
      await resolveUserPermissions(testUserId);
      const duration1 = Date.now() - start1;

      // Second call (should be faster due to caching)
      const start2 = Date.now();
      await resolveUserPermissions(testUserId);
      const duration2 = Date.now() - start2;

      // Cache should make second call faster
      expect(duration2).toBeLessThanOrEqual(duration1);
    });

    it('should clear user-specific cache', async () => {
      // Populate cache
      await resolveUserPermissions(testUserId);

      // Clear cache
      clearUserPermissionCache(testUserId);

      // Next call should work normally
      const result = await resolveUserPermissions(testUserId);
      expect(result.globalRoles).toContain('Test Role');
    });
  });
});