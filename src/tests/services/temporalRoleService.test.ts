/**
 * Comprehensive tests for Temporal Role Service - GitHub Issue #126
 * Tests temporal role assignment, extension, revocation, emergency access, and cleanup
 */

import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import {
  assignTemporalRole,
  extendTemporalRole,
  revokeTemporalRole,
  grantEmergencyAccess,
  cleanupExpiredRoles,
  getTemporalAccessLogs,
  TemporalRoleAssignmentRequest,
  TemporalRoleExtensionRequest,
  TemporalRoleRevocationRequest,
  EmergencyAccessRequest
} from '../../services/temporalRoleService';
import { clearPermissionCache } from '../../services/permissionService';

// Mock Prisma client
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
  },
  role: {
    findUnique: vi.fn(),
  },
  site: {
    findUnique: vi.fn(),
  },
  userRole: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  userSiteRole: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  temporalAccessLog: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  $transaction: vi.fn(),
};

// Mock permission service
vi.mock('../../services/permissionService', () => ({
  clearPermissionCache: vi.fn(),
}));

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

describe('TemporalRoleService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup common mock returns
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', name: 'John Doe' });
    mockPrisma.role.findUnique.mockResolvedValue({ id: 'role-1', name: 'Temporary Access' });
    mockPrisma.site.findUnique.mockResolvedValue({ id: 'site-1', name: 'Main Site' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('assignTemporalRole', () => {
    it('should assign temporary global role successfully', async () => {
      const request: TemporalRoleAssignmentRequest = {
        userId: 'user-1',
        roleId: 'role-1',
        isTemporary: true,
        expiresAt: new Date('2025-12-31T23:59:59Z'),
        grantReason: 'Contractor assignment',
        assignedBy: 'admin-1'
      };

      mockPrisma.userRole.findFirst.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation((callback) => callback(mockPrisma));
      mockPrisma.userRole.create.mockResolvedValue({
        id: 'user-role-1',
        userId: 'user-1',
        roleId: 'role-1',
        isTemporary: true,
        expiresAt: request.expiresAt,
        grantReason: 'Contractor assignment'
      });
      mockPrisma.temporalAccessLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await assignTemporalRole(request);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Temporal role assigned successfully');
      expect(result.assignmentId).toBe('user-role-1');
      expect(result.auditLogId).toBe('log-1');
      expect(clearPermissionCache).toHaveBeenCalledWith('user-1');
    });

    it('should assign temporary site role successfully', async () => {
      const request: TemporalRoleAssignmentRequest = {
        userId: 'user-1',
        roleId: 'role-1',
        siteId: 'site-1',
        isTemporary: true,
        expiresAt: new Date('2025-12-31T23:59:59Z'),
        grantReason: 'Site-specific access',
        assignedBy: 'admin-1'
      };

      mockPrisma.userSiteRole.findFirst.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation((callback) => callback(mockPrisma));
      mockPrisma.userSiteRole.create.mockResolvedValue({
        id: 'user-site-role-1',
        userId: 'user-1',
        roleId: 'role-1',
        siteId: 'site-1',
        isTemporary: true,
        expiresAt: request.expiresAt
      });
      mockPrisma.temporalAccessLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await assignTemporalRole(request);

      expect(result.success).toBe(true);
      expect(result.assignmentId).toBe('user-site-role-1');
    });

    it('should reject assignment if user already has the role', async () => {
      const request: TemporalRoleAssignmentRequest = {
        userId: 'user-1',
        roleId: 'role-1',
        isTemporary: true,
        expiresAt: new Date('2025-12-31T23:59:59Z'),
        grantReason: 'Duplicate assignment',
        assignedBy: 'admin-1'
      };

      mockPrisma.userRole.findFirst.mockResolvedValue({
        id: 'existing-role',
        userId: 'user-1',
        roleId: 'role-1'
      });

      const result = await assignTemporalRole(request);

      expect(result.success).toBe(false);
      expect(result.message).toContain('User already has this role');
    });

    it('should reject assignment if user does not exist', async () => {
      const request: TemporalRoleAssignmentRequest = {
        userId: 'nonexistent-user',
        roleId: 'role-1',
        isTemporary: true,
        expiresAt: new Date('2025-12-31T23:59:59Z'),
        grantReason: 'Invalid user',
        assignedBy: 'admin-1'
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await assignTemporalRole(request);

      expect(result.success).toBe(false);
      expect(result.message).toContain('User not found');
    });

    it('should assign permanent role when isTemporary is false', async () => {
      const request: TemporalRoleAssignmentRequest = {
        userId: 'user-1',
        roleId: 'role-1',
        isTemporary: false,
        grantReason: 'Permanent assignment',
        assignedBy: 'admin-1'
      };

      mockPrisma.userRole.findFirst.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation((callback) => callback(mockPrisma));
      mockPrisma.userRole.create.mockResolvedValue({
        id: 'user-role-1',
        userId: 'user-1',
        roleId: 'role-1',
        isTemporary: false,
        expiresAt: null
      });
      mockPrisma.temporalAccessLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await assignTemporalRole(request);

      expect(result.success).toBe(true);
      expect(mockPrisma.userRole.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isTemporary: false,
            expiresAt: null
          })
        })
      );
    });
  });

  describe('extendTemporalRole', () => {
    it('should extend global role expiration successfully', async () => {
      const request: TemporalRoleExtensionRequest = {
        userRoleId: 'user-role-1',
        newExpiresAt: new Date('2026-01-31T23:59:59Z'),
        extensionReason: 'Project extended',
        extendedBy: 'admin-1'
      };

      const existingRole = {
        id: 'user-role-1',
        userId: 'user-1',
        roleId: 'role-1',
        isTemporary: true,
        expiresAt: new Date('2025-12-31T23:59:59Z')
      };

      mockPrisma.userRole.findFirst.mockResolvedValue(existingRole);
      mockPrisma.$transaction.mockImplementation((callback) => callback(mockPrisma));
      mockPrisma.userRole.update.mockResolvedValue({
        ...existingRole,
        expiresAt: request.newExpiresAt
      });
      mockPrisma.temporalAccessLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await extendTemporalRole(request);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Temporal role extended successfully');
      expect(clearPermissionCache).toHaveBeenCalledWith('user-1');
    });

    it('should extend site role expiration successfully', async () => {
      const request: TemporalRoleExtensionRequest = {
        userSiteRoleId: 'user-site-role-1',
        newExpiresAt: new Date('2026-01-31T23:59:59Z'),
        extensionReason: 'Site access extended',
        extendedBy: 'admin-1'
      };

      const existingRole = {
        id: 'user-site-role-1',
        userId: 'user-1',
        roleId: 'role-1',
        siteId: 'site-1',
        isTemporary: true,
        expiresAt: new Date('2025-12-31T23:59:59Z')
      };

      mockPrisma.userSiteRole.findFirst.mockResolvedValue(existingRole);
      mockPrisma.$transaction.mockImplementation((callback) => callback(mockPrisma));
      mockPrisma.userSiteRole.update.mockResolvedValue({
        ...existingRole,
        expiresAt: request.newExpiresAt
      });
      mockPrisma.temporalAccessLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await extendTemporalRole(request);

      expect(result.success).toBe(true);
      expect(result.assignmentId).toBe('user-site-role-1');
    });

    it('should reject extension if role assignment not found', async () => {
      const request: TemporalRoleExtensionRequest = {
        userRoleId: 'nonexistent-role',
        newExpiresAt: new Date('2026-01-31T23:59:59Z'),
        extensionReason: 'Invalid extension',
        extendedBy: 'admin-1'
      };

      mockPrisma.userRole.findFirst.mockResolvedValue(null);

      const result = await extendTemporalRole(request);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Temporal role assignment not found');
    });

    it('should reject extension if role is not temporary', async () => {
      const request: TemporalRoleExtensionRequest = {
        userRoleId: 'user-role-1',
        newExpiresAt: new Date('2026-01-31T23:59:59Z'),
        extensionReason: 'Permanent role extension',
        extendedBy: 'admin-1'
      };

      mockPrisma.userRole.findFirst.mockResolvedValue({
        id: 'user-role-1',
        userId: 'user-1',
        roleId: 'role-1',
        isTemporary: false,
        expiresAt: null
      });

      const result = await extendTemporalRole(request);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Cannot extend non-temporal role');
    });
  });

  describe('revokeTemporalRole', () => {
    it('should revoke global role successfully', async () => {
      const request: TemporalRoleRevocationRequest = {
        userRoleId: 'user-role-1',
        revocationReason: 'Contract ended',
        revokedBy: 'admin-1',
        immediateRevocation: true
      };

      const existingRole = {
        id: 'user-role-1',
        userId: 'user-1',
        roleId: 'role-1',
        isTemporary: true,
        expiresAt: new Date('2025-12-31T23:59:59Z')
      };

      mockPrisma.userRole.findFirst.mockResolvedValue(existingRole);
      mockPrisma.$transaction.mockImplementation((callback) => callback(mockPrisma));
      mockPrisma.userRole.update.mockResolvedValue({
        ...existingRole,
        expiresAt: new Date() // Expired immediately
      });
      mockPrisma.temporalAccessLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await revokeTemporalRole(request);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Temporal role revoked successfully');
      expect(clearPermissionCache).toHaveBeenCalledWith('user-1');
    });

    it('should schedule future revocation when immediateRevocation is false', async () => {
      const request: TemporalRoleRevocationRequest = {
        userRoleId: 'user-role-1',
        revocationReason: 'Contract ends soon',
        revokedBy: 'admin-1',
        immediateRevocation: false
      };

      const existingRole = {
        id: 'user-role-1',
        userId: 'user-1',
        roleId: 'role-1',
        isTemporary: true,
        expiresAt: new Date('2025-12-31T23:59:59Z')
      };

      mockPrisma.userRole.findFirst.mockResolvedValue(existingRole);
      mockPrisma.$transaction.mockImplementation((callback) => callback(mockPrisma));
      mockPrisma.userRole.update.mockResolvedValue(existingRole);
      mockPrisma.temporalAccessLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await revokeTemporalRole(request);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Temporal role revocation scheduled');
    });
  });

  describe('grantEmergencyAccess', () => {
    it('should grant emergency access successfully', async () => {
      const request: EmergencyAccessRequest = {
        userId: 'user-1',
        roleId: 'role-1',
        emergencyReason: 'Production line down - immediate access needed',
        durationHours: 4,
        requestedBy: 'operator-1',
        approvedBy: 'supervisor-1'
      };

      mockPrisma.userRole.findFirst.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation((callback) => callback(mockPrisma));
      mockPrisma.userRole.create.mockResolvedValue({
        id: 'emergency-role-1',
        userId: 'user-1',
        roleId: 'role-1',
        isTemporary: true,
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 hours from now
      });
      mockPrisma.temporalAccessLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await grantEmergencyAccess(request);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Emergency access granted');
      expect(result.assignmentId).toBe('emergency-role-1');
      expect(clearPermissionCache).toHaveBeenCalledWith('user-1');
    });

    it('should grant emergency site access successfully', async () => {
      const request: EmergencyAccessRequest = {
        userId: 'user-1',
        roleId: 'role-1',
        siteId: 'site-1',
        emergencyReason: 'Critical site issue - immediate access needed',
        durationHours: 2,
        requestedBy: 'operator-1',
        approvedBy: 'supervisor-1'
      };

      mockPrisma.userSiteRole.findFirst.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation((callback) => callback(mockPrisma));
      mockPrisma.userSiteRole.create.mockResolvedValue({
        id: 'emergency-site-role-1',
        userId: 'user-1',
        roleId: 'role-1',
        siteId: 'site-1',
        isTemporary: true,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours from now
      });
      mockPrisma.temporalAccessLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await grantEmergencyAccess(request);

      expect(result.success).toBe(true);
      expect(result.assignmentId).toBe('emergency-site-role-1');
    });

    it('should reject emergency access if duration exceeds maximum', async () => {
      const request: EmergencyAccessRequest = {
        userId: 'user-1',
        roleId: 'role-1',
        emergencyReason: 'Very long emergency',
        durationHours: 200, // More than 168 hours (7 days)
        requestedBy: 'operator-1',
        approvedBy: 'supervisor-1'
      };

      const result = await grantEmergencyAccess(request);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Duration cannot exceed 168 hours');
    });
  });

  describe('cleanupExpiredRoles', () => {
    it('should cleanup expired roles successfully', async () => {
      const now = new Date();
      const expiredGlobalRoles = [
        { id: 'expired-1', userId: 'user-1', roleId: 'role-1', expiresAt: new Date(now.getTime() - 1000) },
        { id: 'expired-2', userId: 'user-2', roleId: 'role-2', expiresAt: new Date(now.getTime() - 2000) }
      ];
      const expiredSiteRoles = [
        { id: 'expired-site-1', userId: 'user-3', roleId: 'role-1', siteId: 'site-1', expiresAt: new Date(now.getTime() - 1000) }
      ];

      mockPrisma.userRole.findMany.mockResolvedValue(expiredGlobalRoles);
      mockPrisma.userSiteRole.findMany.mockResolvedValue(expiredSiteRoles);
      mockPrisma.$transaction.mockImplementation((callback) => callback(mockPrisma));
      mockPrisma.temporalAccessLog.create.mockResolvedValue({ id: 'cleanup-log' });

      const result = await cleanupExpiredRoles();

      expect(result.success).toBe(true);
      expect(result.expiredRolesRemoved).toBe(3);
      expect(result.globalRoles).toBe(2);
      expect(result.siteRoles).toBe(1);
      expect(result.auditLogsCreated).toBe(3);
      expect(clearPermissionCache).toHaveBeenCalledTimes(3);
    });

    it('should handle cleanup with no expired roles', async () => {
      mockPrisma.userRole.findMany.mockResolvedValue([]);
      mockPrisma.userSiteRole.findMany.mockResolvedValue([]);

      const result = await cleanupExpiredRoles();

      expect(result.success).toBe(true);
      expect(result.expiredRolesRemoved).toBe(0);
      expect(result.globalRoles).toBe(0);
      expect(result.siteRoles).toBe(0);
    });

    it('should handle errors during cleanup gracefully', async () => {
      mockPrisma.userRole.findMany.mockResolvedValue([
        { id: 'expired-1', userId: 'user-1', roleId: 'role-1', expiresAt: new Date(Date.now() - 1000) }
      ]);
      mockPrisma.userSiteRole.findMany.mockResolvedValue([]);

      // Simulate error during update
      mockPrisma.$transaction.mockRejectedValue(new Error('Database error'));

      const result = await cleanupExpiredRoles();

      expect(result.success).toBe(true); // Should continue despite errors
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Database error');
    });
  });

  describe('getTemporalAccessLogs', () => {
    it('should retrieve filtered audit logs successfully', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          userId: 'user-1',
          roleId: 'role-1',
          accessType: 'ASSIGNMENT',
          timestamp: new Date(),
          details: { reason: 'Contractor assignment' }
        },
        {
          id: 'log-2',
          userId: 'user-1',
          roleId: 'role-1',
          accessType: 'EXTENSION',
          timestamp: new Date(),
          details: { reason: 'Project extended' }
        }
      ];

      mockPrisma.temporalAccessLog.findMany.mockResolvedValue(mockLogs);

      const logs = await getTemporalAccessLogs(
        'user-1',
        'role-1',
        undefined,
        'ASSIGNMENT',
        new Date('2025-01-01'),
        new Date('2025-12-31'),
        10
      );

      expect(logs).toEqual(mockLogs);
      expect(mockPrisma.temporalAccessLog.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          roleId: 'role-1',
          accessType: 'ASSIGNMENT',
          timestamp: {
            gte: new Date('2025-01-01'),
            lte: new Date('2025-12-31')
          }
        },
        orderBy: { timestamp: 'desc' },
        take: 10,
        include: {
          user: { select: { id: true, name: true } },
          role: { select: { id: true, name: true } },
          site: { select: { id: true, name: true } }
        }
      });
    });

    it('should retrieve logs without filters', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          timestamp: new Date(),
          accessType: 'ASSIGNMENT'
        }
      ];

      mockPrisma.temporalAccessLog.findMany.mockResolvedValue(mockLogs);

      const logs = await getTemporalAccessLogs();

      expect(logs).toEqual(mockLogs);
      expect(mockPrisma.temporalAccessLog.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { timestamp: 'desc' },
        take: 100,
        include: {
          user: { select: { id: true, name: true } },
          role: { select: { id: true, name: true } },
          site: { select: { id: true, name: true } }
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully in assignTemporalRole', async () => {
      const request: TemporalRoleAssignmentRequest = {
        userId: 'user-1',
        roleId: 'role-1',
        isTemporary: true,
        expiresAt: new Date('2025-12-31T23:59:59Z'),
        grantReason: 'Test assignment',
        assignedBy: 'admin-1'
      };

      mockPrisma.userRole.findFirst.mockRejectedValue(new Error('Database connection failed'));

      const result = await assignTemporalRole(request);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to assign temporal role');
    });

    it('should handle transaction rollback on error', async () => {
      const request: TemporalRoleAssignmentRequest = {
        userId: 'user-1',
        roleId: 'role-1',
        isTemporary: true,
        expiresAt: new Date('2025-12-31T23:59:59Z'),
        grantReason: 'Test assignment',
        assignedBy: 'admin-1'
      };

      mockPrisma.userRole.findFirst.mockResolvedValue(null);
      mockPrisma.$transaction.mockRejectedValue(new Error('Transaction failed'));

      const result = await assignTemporalRole(request);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to assign temporal role');
    });
  });
});