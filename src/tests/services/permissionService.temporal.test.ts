/**
 * Tests for Temporal Permission Validation in Permission Service - GitHub Issue #126
 * Tests enhanced permission service with time-based role validation
 */

import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import {
  getUserPermissions,
  getUserTemporalRoles,
  clearPermissionCache,
  ResolvedPermissions
} from '../../services/permissionService';

// Mock Prisma client
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
  },
  userRole: {
    findMany: vi.fn(),
  },
  userSiteRole: {
    findMany: vi.fn(),
  },
  role: {
    findMany: vi.fn(),
  },
  permission: {
    findMany: vi.fn(),
  },
};

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock Prisma import
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

describe('PermissionService - Temporal Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Clear any existing cache
    clearPermissionCache('test-user');

    // Setup common mock returns
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'test-user',
      name: 'Test User',
      isActive: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getUserPermissions with Temporal Validation', () => {
    it('should include permissions from active temporal roles', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

      // Mock user roles with temporal validation
      mockPrisma.userRole.findMany.mockResolvedValue([
        // Regular permanent role
        {
          id: 'regular-role',
          roleId: 'role-1',
          isTemporary: false,
          validFrom: null,
          expiresAt: null,
          role: {
            id: 'role-1',
            name: 'Regular User',
            isActive: true,
            rolePermissions: [
              {
                permission: {
                  id: 'perm-1',
                  name: 'read_documents',
                  resource: 'documents',
                  action: 'read'
                }
              }
            ]
          }
        },
        // Active temporal role
        {
          id: 'temporal-role-active',
          roleId: 'role-2',
          isTemporary: true,
          validFrom: pastDate,
          expiresAt: futureDate,
          grantReason: 'Contractor assignment',
          role: {
            id: 'role-2',
            name: 'Temporary Access',
            isActive: true,
            rolePermissions: [
              {
                permission: {
                  id: 'perm-2',
                  name: 'write_workorders',
                  resource: 'workorders',
                  action: 'write'
                }
              }
            ]
          }
        },
        // Expired temporal role (should be excluded)
        {
          id: 'temporal-role-expired',
          roleId: 'role-3',
          isTemporary: true,
          validFrom: pastDate,
          expiresAt: pastDate, // Already expired
          grantReason: 'Expired contract',
          role: {
            id: 'role-3',
            name: 'Expired Access',
            isActive: true,
            rolePermissions: [
              {
                permission: {
                  id: 'perm-3',
                  name: 'admin_access',
                  resource: 'admin',
                  action: 'all'
                }
              }
            ]
          }
        },
        // Future temporal role (should be excluded)
        {
          id: 'temporal-role-future',
          roleId: 'role-4',
          isTemporary: true,
          validFrom: futureDate, // Starts in the future
          expiresAt: new Date(futureDate.getTime() + 24 * 60 * 60 * 1000),
          grantReason: 'Future assignment',
          role: {
            id: 'role-4',
            name: 'Future Access',
            isActive: true,
            rolePermissions: [
              {
                permission: {
                  id: 'perm-4',
                  name: 'delete_data',
                  resource: 'data',
                  action: 'delete'
                }
              }
            ]
          }
        }
      ]);

      mockPrisma.userSiteRole.findMany.mockResolvedValue([]);

      const permissions = await getUserPermissions('test-user');

      expect(permissions.success).toBe(true);
      expect(permissions.globalPermissions).toHaveLength(2); // Regular + active temporal
      expect(permissions.globalPermissions.map(p => p.name)).toEqual([
        'read_documents',
        'write_workorders'
      ]);

      // Should not include expired or future permissions
      expect(permissions.globalPermissions.map(p => p.name)).not.toContain('admin_access');
      expect(permissions.globalPermissions.map(p => p.name)).not.toContain('delete_data');
    });

    it('should include permissions from active site temporal roles', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      mockPrisma.userRole.findMany.mockResolvedValue([]);
      mockPrisma.userSiteRole.findMany.mockResolvedValue([
        {
          id: 'site-temporal-role',
          roleId: 'site-role-1',
          siteId: 'site-1',
          isTemporary: true,
          validFrom: null, // No start restriction
          expiresAt: futureDate,
          grantReason: 'Site maintenance access',
          role: {
            id: 'site-role-1',
            name: 'Site Maintenance',
            isActive: true,
            rolePermissions: [
              {
                permission: {
                  id: 'site-perm-1',
                  name: 'maintain_equipment',
                  resource: 'equipment',
                  action: 'maintain'
                }
              }
            ]
          },
          site: {
            id: 'site-1',
            name: 'Main Production Site'
          }
        }
      ]);

      const permissions = await getUserPermissions('test-user', 'site-1');

      expect(permissions.success).toBe(true);
      expect(permissions.sitePermissions?.['site-1']).toHaveLength(1);
      expect(permissions.sitePermissions?.['site-1'][0].name).toBe('maintain_equipment');
    });

    it('should exclude permissions from inactive temporal roles', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      mockPrisma.userRole.findMany.mockResolvedValue([
        {
          id: 'inactive-temporal-role',
          roleId: 'inactive-role',
          isTemporary: true,
          validFrom: null,
          expiresAt: futureDate,
          grantReason: 'Test assignment',
          role: {
            id: 'inactive-role',
            name: 'Inactive Role',
            isActive: false, // Role is inactive
            rolePermissions: [
              {
                permission: {
                  id: 'inactive-perm',
                  name: 'should_not_appear',
                  resource: 'test',
                  action: 'read'
                }
              }
            ]
          }
        }
      ]);

      mockPrisma.userSiteRole.findMany.mockResolvedValue([]);

      const permissions = await getUserPermissions('test-user');

      expect(permissions.success).toBe(true);
      expect(permissions.globalPermissions).toHaveLength(0);
      expect(permissions.globalPermissions.map(p => p.name)).not.toContain('should_not_appear');
    });

    it('should handle roles with emergency access flags', async () => {
      const now = new Date();
      const shortDuration = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now

      mockPrisma.userRole.findMany.mockResolvedValue([
        {
          id: 'emergency-role',
          roleId: 'emergency-role-1',
          isTemporary: true,
          validFrom: null,
          expiresAt: shortDuration,
          grantReason: 'EMERGENCY: Production line down',
          role: {
            id: 'emergency-role-1',
            name: 'Emergency Access',
            isActive: true,
            rolePermissions: [
              {
                permission: {
                  id: 'emergency-perm',
                  name: 'emergency_override',
                  resource: 'production',
                  action: 'override'
                }
              }
            ]
          }
        }
      ]);

      mockPrisma.userSiteRole.findMany.mockResolvedValue([]);

      const permissions = await getUserPermissions('test-user');

      expect(permissions.success).toBe(true);
      expect(permissions.globalPermissions).toHaveLength(1);
      expect(permissions.globalPermissions[0].name).toBe('emergency_override');

      // Emergency roles should be included even with short durations
      expect(permissions.temporalContext?.hasEmergencyAccess).toBe(true);
      expect(permissions.temporalContext?.emergencyRoles).toHaveLength(1);
    });
  });

  describe('getUserTemporalRoles', () => {
    it('should return all temporal roles for user', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      mockPrisma.userRole.findMany.mockResolvedValue([
        {
          id: 'temp-role-1',
          roleId: 'role-1',
          isTemporary: true,
          validFrom: pastDate,
          expiresAt: futureDate,
          grantReason: 'Contractor assignment',
          assignedAt: pastDate,
          assignedBy: 'admin-1',
          role: {
            id: 'role-1',
            name: 'Temporary Access'
          }
        }
      ]);

      mockPrisma.userSiteRole.findMany.mockResolvedValue([
        {
          id: 'temp-site-role-1',
          roleId: 'site-role-1',
          siteId: 'site-1',
          isTemporary: true,
          validFrom: null,
          expiresAt: futureDate,
          grantReason: 'Site maintenance',
          assignedAt: now,
          assignedBy: 'site-admin',
          role: {
            id: 'site-role-1',
            name: 'Site Access'
          },
          site: {
            id: 'site-1',
            name: 'Main Site'
          }
        }
      ]);

      const temporalRoles = await getUserTemporalRoles('test-user');

      expect(temporalRoles).toHaveLength(2);

      const globalRole = temporalRoles.find(r => !r.siteId);
      expect(globalRole).toBeDefined();
      expect(globalRole?.roleName).toBe('Temporary Access');
      expect(globalRole?.grantReason).toBe('Contractor assignment');
      expect(globalRole?.status).toBe('active');

      const siteRole = temporalRoles.find(r => r.siteId === 'site-1');
      expect(siteRole).toBeDefined();
      expect(siteRole?.roleName).toBe('Site Access');
      expect(siteRole?.siteName).toBe('Main Site');
      expect(siteRole?.status).toBe('active');
    });

    it('should return temporal roles with correct status flags', async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const futureStartDate = new Date(now.getTime() + 12 * 60 * 60 * 1000);
      const futureEndDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      mockPrisma.userRole.findMany.mockResolvedValue([
        // Expired role
        {
          id: 'expired-role',
          roleId: 'role-1',
          isTemporary: true,
          validFrom: pastDate,
          expiresAt: pastDate,
          grantReason: 'Expired contract',
          role: { id: 'role-1', name: 'Expired Role' }
        },
        // Pending role
        {
          id: 'pending-role',
          roleId: 'role-2',
          isTemporary: true,
          validFrom: futureStartDate,
          expiresAt: futureEndDate,
          grantReason: 'Future assignment',
          role: { id: 'role-2', name: 'Future Role' }
        },
        // Active role
        {
          id: 'active-role',
          roleId: 'role-3',
          isTemporary: true,
          validFrom: pastDate,
          expiresAt: futureEndDate,
          grantReason: 'Current assignment',
          role: { id: 'role-3', name: 'Active Role' }
        }
      ]);

      mockPrisma.userSiteRole.findMany.mockResolvedValue([]);

      const temporalRoles = await getUserTemporalRoles('test-user');

      expect(temporalRoles).toHaveLength(3);

      const expiredRole = temporalRoles.find(r => r.roleName === 'Expired Role');
      expect(expiredRole?.status).toBe('expired');

      const pendingRole = temporalRoles.find(r => r.roleName === 'Future Role');
      expect(pendingRole?.status).toBe('pending');

      const activeRole = temporalRoles.find(r => r.roleName === 'Active Role');
      expect(activeRole?.status).toBe('active');
    });

    it('should filter temporal roles by site when siteId provided', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      mockPrisma.userRole.findMany.mockResolvedValue([]);
      mockPrisma.userSiteRole.findMany.mockResolvedValue([
        // Site 1 role
        {
          id: 'site1-role',
          roleId: 'role-1',
          siteId: 'site-1',
          isTemporary: true,
          validFrom: null,
          expiresAt: futureDate,
          grantReason: 'Site 1 access',
          role: { id: 'role-1', name: 'Site 1 Role' },
          site: { id: 'site-1', name: 'Site 1' }
        },
        // Site 2 role (should be filtered out)
        {
          id: 'site2-role',
          roleId: 'role-2',
          siteId: 'site-2',
          isTemporary: true,
          validFrom: null,
          expiresAt: futureDate,
          grantReason: 'Site 2 access',
          role: { id: 'role-2', name: 'Site 2 Role' },
          site: { id: 'site-2', name: 'Site 2' }
        }
      ]);

      const temporalRoles = await getUserTemporalRoles('test-user', 'site-1');

      expect(temporalRoles).toHaveLength(1);
      expect(temporalRoles[0].siteId).toBe('site-1');
      expect(temporalRoles[0].siteName).toBe('Site 1');
    });

    it('should handle emergency access roles', async () => {
      const now = new Date();
      const shortDuration = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours

      mockPrisma.userRole.findMany.mockResolvedValue([
        {
          id: 'emergency-role',
          roleId: 'emergency-role-1',
          isTemporary: true,
          validFrom: null,
          expiresAt: shortDuration,
          grantReason: 'EMERGENCY: Critical system failure',
          assignedAt: now,
          assignedBy: 'emergency-admin',
          role: {
            id: 'emergency-role-1',
            name: 'Emergency Override'
          }
        }
      ]);

      mockPrisma.userSiteRole.findMany.mockResolvedValue([]);

      const temporalRoles = await getUserTemporalRoles('test-user');

      expect(temporalRoles).toHaveLength(1);
      expect(temporalRoles[0].isEmergency).toBe(true);
      expect(temporalRoles[0].grantReason).toContain('EMERGENCY:');
      expect(temporalRoles[0].status).toBe('active');
    });
  });

  describe('Permission Cache with Temporal Context', () => {
    it('should cache permissions with temporal metadata', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      mockPrisma.userRole.findMany.mockResolvedValue([
        {
          id: 'temporal-role',
          roleId: 'role-1',
          isTemporary: true,
          validFrom: null,
          expiresAt: futureDate,
          grantReason: 'Contractor assignment',
          role: {
            id: 'role-1',
            name: 'Temporary Access',
            isActive: true,
            rolePermissions: [
              {
                permission: {
                  id: 'perm-1',
                  name: 'read_documents',
                  resource: 'documents',
                  action: 'read'
                }
              }
            ]
          }
        }
      ]);

      mockPrisma.userSiteRole.findMany.mockResolvedValue([]);

      // First call should hit database
      const permissions1 = await getUserPermissions('test-user');
      expect(permissions1.temporalContext?.hasTemporalRoles).toBe(true);
      expect(permissions1.temporalContext?.temporalRoleCount).toBe(1);

      // Second call should use cache
      const permissions2 = await getUserPermissions('test-user');
      expect(permissions2.temporalContext?.hasTemporalRoles).toBe(true);
      expect(permissions2.temporalContext?.temporalRoleCount).toBe(1);

      // Should only call database once due to caching
      expect(mockPrisma.userRole.findMany).toHaveBeenCalledTimes(1);
    });

    it('should clear cache when temporal roles change', async () => {
      mockPrisma.userRole.findMany.mockResolvedValue([]);
      mockPrisma.userSiteRole.findMany.mockResolvedValue([]);

      // First call
      await getUserPermissions('test-user');

      // Clear cache (simulating temporal role change)
      clearPermissionCache('test-user');

      // Second call should hit database again
      await getUserPermissions('test-user');

      expect(mockPrisma.userRole.findMany).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockPrisma.userRole.findMany.mockRejectedValue(new Error('Database connection failed'));

      const permissions = await getUserPermissions('test-user');

      expect(permissions.success).toBe(false);
      expect(permissions.error).toContain('Database connection failed');
    });

    it('should handle missing user gracefully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const permissions = await getUserPermissions('nonexistent-user');

      expect(permissions.success).toBe(false);
      expect(permissions.error).toContain('User not found');
    });

    it('should handle inactive users', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'inactive-user',
        name: 'Inactive User',
        isActive: false
      });

      const permissions = await getUserPermissions('inactive-user');

      expect(permissions.success).toBe(false);
      expect(permissions.error).toContain('User is not active');
    });
  });
});