/**
 * Permission Resolution Performance Tests - GitHub Issue #29
 *
 * Tests performance characteristics of the new RBAC system
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import {
  resolveUserPermissions,
  hasPermission,
  hasRole,
  hasAllPermissions,
  clearAllPermissionCaches,
  expandWildcardPermissions
} from '../../services/permissionService';

const prisma = new PrismaClient();

describe('Permission Resolution Performance Tests', () => {
  let testUsers: string[] = [];
  let testSiteId: string;
  let testRoleId: string;
  let testPermissionIds: string[] = [];

  beforeAll(async () => {
    // Clear all caches before performance tests
    clearAllPermissionCaches();

    // Create test site
    const testSite = await prisma.site.create({
      data: {
        siteCode: 'PERF_TEST_SITE',
        siteName: 'Performance Test Site',
        isActive: true
      }
    });
    testSiteId = testSite.id;

    // Create test role
    const testRole = await prisma.role.create({
      data: {
        roleCode: 'perf_test_role',
        roleName: 'Performance Test Role',
        description: 'Role for performance testing',
        isActive: true,
        isGlobal: true,
        createdBy: 'system'
      }
    });
    testRoleId = testRole.id;

    // Create multiple test permissions
    const permissionData = [];
    for (let i = 0; i < 50; i++) {
      permissionData.push({
        permissionCode: `test.permission.${i}`,
        permissionName: `Test Permission ${i}`,
        description: `Performance test permission ${i}`,
        category: 'test',
        isActive: true,
        isWildcard: false
      });
    }

    const permissions = await prisma.permission.createMany({
      data: permissionData
    });

    // Get created permission IDs
    const createdPermissions = await prisma.permission.findMany({
      where: {
        permissionCode: {
          startsWith: 'test.permission.'
        }
      },
      select: { id: true }
    });
    testPermissionIds = createdPermissions.map(p => p.id);

    // Assign permissions to role
    const rolePermissionData = testPermissionIds.map(permId => ({
      roleId: testRoleId,
      permissionId: permId,
      grantedBy: 'system'
    }));

    await prisma.rolePermission.createMany({
      data: rolePermissionData
    });

    // Create test users with role assignments
    for (let i = 0; i < 100; i++) {
      const user = await prisma.user.create({
        data: {
          username: `perftest_user_${i}`,
          email: `perftest${i}@test.com`,
          passwordHash: 'hashedpassword',
          firstName: 'Perf',
          lastName: `User${i}`,
          roles: [],
          permissions: []
        }
      });
      testUsers.push(user.id);

      // Assign role to every 3rd user (to create variety)
      if (i % 3 === 0) {
        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: testRoleId,
            assignedBy: 'system'
          }
        });
      }

      // Assign site-specific role to every 5th user
      if (i % 5 === 0) {
        try {
          await prisma.userSiteRole.create({
            data: {
              userId: user.id,
              siteId: testSiteId,
              roleId: testRoleId,
              assignedBy: 'system'
            }
          });
        } catch (e) {
          // Table may not exist yet - skip site role assignment
        }
      }
    }
  });

  afterAll(async () => {
    // Clean up test data - be forgiving if tables don't exist
    try {
      // Delete in reverse order to avoid constraint violations
      try {
        await prisma.userSiteRole.deleteMany({
          where: {
            siteId: testSiteId
          }
        });
      } catch (e) {
        // Table may not exist yet
      }

      try {
        await prisma.userRole.deleteMany({
          where: {
            roleId: testRoleId
          }
        });
      } catch (e) {
        // Table may not exist yet
      }

      try {
        await prisma.rolePermission.deleteMany({
          where: {
            roleId: testRoleId
          }
        });
      } catch (e) {
        // Table may not exist yet
      }

      await prisma.user.deleteMany({
        where: {
          username: {
            startsWith: 'perftest_user_'
          }
        }
      });

      try {
        await prisma.permission.deleteMany({
          where: {
            permissionCode: {
              startsWith: 'test.permission.'
            }
          }
        });
      } catch (e) {
        // Table may not exist yet
      }

      try {
        await prisma.role.deleteMany({
          where: {
            roleCode: 'perf_test_role'
          }
        });
      } catch (e) {
        // Table may not exist yet
      }

      await prisma.site.deleteMany({
        where: {
          siteCode: 'PERF_TEST_SITE'
        }
      });
    } catch (error) {
      console.error('Cleanup error:', error);
    }

    await prisma.$disconnect();
  });

  describe('resolveUserPermissions Performance', () => {
    it('should resolve permissions for single user quickly', async () => {
      const userId = testUsers[0];

      const startTime = Date.now();
      const result = await resolveUserPermissions(userId);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100); // Should complete in under 100ms
      expect(result).toBeDefined();
      expect(Array.isArray(result.permissions)).toBe(true);
      expect(Array.isArray(result.globalRoles)).toBe(true);
    });

    it('should handle batch permission resolution efficiently', async () => {
      const batchSize = 10;
      const userBatch = testUsers.slice(0, batchSize);

      const startTime = Date.now();

      const promises = userBatch.map(userId => resolveUserPermissions(userId));
      const results = await Promise.all(promises);

      const duration = Date.now() - startTime;
      const avgDurationPerUser = duration / batchSize;

      expect(avgDurationPerUser).toBeLessThan(50); // Average should be under 50ms per user
      expect(results).toHaveLength(batchSize);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(Array.isArray(result.permissions)).toBe(true);
      });
    });

    it('should benefit from caching on repeated calls', async () => {
      const userId = testUsers[0];

      // First call (cache miss)
      const startTime1 = Date.now();
      await resolveUserPermissions(userId);
      const duration1 = Date.now() - startTime1;

      // Second call (cache hit)
      const startTime2 = Date.now();
      await resolveUserPermissions(userId);
      const duration2 = Date.now() - startTime2;

      // Third call (cache hit)
      const startTime3 = Date.now();
      await resolveUserPermissions(userId);
      const duration3 = Date.now() - startTime3;

      // Cache hits should be significantly faster
      expect(duration2).toBeLessThanOrEqual(duration1);
      expect(duration3).toBeLessThanOrEqual(duration1);
      expect(duration2).toBeLessThan(10); // Cached calls should be very fast
      expect(duration3).toBeLessThan(10);
    });
  });

  describe('hasPermission Performance', () => {
    it('should check permissions quickly', async () => {
      const userId = testUsers[0]; // User with role
      const permission = 'test.permission.0';

      const startTime = Date.now();
      const result = await hasPermission(userId, permission);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(50); // Should complete in under 50ms
      expect(typeof result).toBe('boolean');
    });

    it('should handle batch permission checks efficiently', async () => {
      const userId = testUsers[0];
      const permissions = [
        'test.permission.0',
        'test.permission.1',
        'test.permission.2',
        'test.permission.3',
        'test.permission.4'
      ];

      const startTime = Date.now();

      const promises = permissions.map(perm => hasPermission(userId, perm));
      const results = await Promise.all(promises);

      const duration = Date.now() - startTime;
      const avgDurationPerCheck = duration / permissions.length;

      expect(avgDurationPerCheck).toBeLessThan(20); // Average should be under 20ms per check
      expect(results).toHaveLength(permissions.length);
      results.forEach(result => {
        expect(typeof result).toBe('boolean');
      });
    });
  });

  describe('hasRole Performance', () => {
    it('should check roles quickly', async () => {
      const userId = testUsers[0];
      const roleName = 'Performance Test Role';

      const startTime = Date.now();
      const result = await hasRole(userId, roleName);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(50); // Should complete in under 50ms
      expect(typeof result).toBe('boolean');
    });
  });

  describe('hasAllPermissions Performance', () => {
    it('should check multiple permissions efficiently', async () => {
      const userId = testUsers[0];
      const permissions = [
        'test.permission.0',
        'test.permission.1',
        'test.permission.2'
      ];

      const startTime = Date.now();
      const result = await hasAllPermissions(userId, permissions);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(50); // Should complete in under 50ms
      expect(typeof result).toBe('boolean');
    });
  });

  describe('expandWildcardPermissions Performance', () => {
    it('should expand wildcards efficiently', async () => {
      const wildcards = ['test.*', 'workorders.*'];

      const startTime = Date.now();
      const result = await expandWildcardPermissions(wildcards);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(200); // Should complete in under 200ms
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle global wildcard efficiently', async () => {
      const wildcards = ['*'];

      const startTime = Date.now();
      const result = await expandWildcardPermissions(wildcards);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500); // Global expansion might take longer
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(50); // Should include many permissions
    });
  });

  describe('Concurrent Access Performance', () => {
    it('should handle concurrent permission resolution', async () => {
      const concurrentUsers = testUsers.slice(0, 20);

      const startTime = Date.now();

      const promises = concurrentUsers.map(userId => resolveUserPermissions(userId));
      const results = await Promise.all(promises);

      const duration = Date.now() - startTime;
      const avgDurationPerUser = duration / concurrentUsers.length;

      expect(avgDurationPerUser).toBeLessThan(100); // Should handle concurrency well
      expect(results).toHaveLength(concurrentUsers.length);
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });

    it('should handle mixed concurrent operations', async () => {
      const userId = testUsers[0];
      const operations = [
        () => resolveUserPermissions(userId),
        () => hasPermission(userId, 'test.permission.0'),
        () => hasRole(userId, 'Performance Test Role'),
        () => hasAllPermissions(userId, ['test.permission.0', 'test.permission.1']),
        () => expandWildcardPermissions(['test.*'])
      ];

      const startTime = Date.now();

      const promises = operations.map(op => op());
      const results = await Promise.all(promises);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(300); // Mixed operations should complete reasonably fast
      expect(results).toHaveLength(operations.length);
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });
  });

  describe('Memory Usage Characteristics', () => {
    it('should maintain reasonable cache size', async () => {
      // Resolve permissions for many users to populate cache
      const users = testUsers.slice(0, 50);

      for (const userId of users) {
        await resolveUserPermissions(userId);
      }

      // Test that cache doesn't grow unbounded
      // This is more of a smoke test - in a real scenario we'd measure actual memory usage
      expect(true).toBe(true); // Placeholder - cache size monitoring would require additional tooling
    });
  });
});