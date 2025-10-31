/**
 * API endpoint tests for Temporal Roles - GitHub Issue #126
 * Tests all temporal role management endpoints with authentication and authorization
 */

import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import temporalRolesRoutes from '../../../routes/admin/temporal-roles';

// Mock the temporal role service
const mockTemporalRoleService = {
  assignTemporalRole: vi.fn(),
  extendTemporalRole: vi.fn(),
  revokeTemporalRole: vi.fn(),
  grantEmergencyAccess: vi.fn(),
  cleanupExpiredRoles: vi.fn(),
  getTemporalAccessLogs: vi.fn(),
};

// Mock the permission service
const mockPermissionService = {
  getUserTemporalRoles: vi.fn(),
};

// Mock authentication middleware
const mockAuthMiddleware = (req: any, res: any, next: any) => {
  req.user = { id: 'admin-1', name: 'Admin User' };
  next();
};

// Mock role requirement middleware
const mockRequireRole = (role: string) => (req: any, res: any, next: any) => {
  if (req.user?.id === 'admin-1') {
    next();
  } else {
    res.status(403).json({ error: 'Insufficient permissions' });
  }
};

// Mock Prisma client for statistics endpoint
const mockPrisma = {
  userRole: {
    count: vi.fn(),
  },
  userSiteRole: {
    count: vi.fn(),
  },
  temporalAccessLog: {
    count: vi.fn(),
  },
};

// Mock logger
vi.mock('../../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock services
vi.mock('../../../services/temporalRoleService', () => mockTemporalRoleService);
vi.mock('../../../services/permissionService', () => mockPermissionService);
vi.mock('../../../middleware/auth', () => ({
  requireRole: mockRequireRole,
}));
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

describe('Temporal Roles API Endpoints', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(mockAuthMiddleware);
    app.use('/admin/temporal-roles', temporalRolesRoutes);

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /admin/temporal-roles/assign', () => {
    it('should assign temporal role successfully', async () => {
      const assignmentData = {
        userId: 'user-1',
        roleId: 'role-1',
        isTemporary: true,
        expiresAt: '2025-12-31T23:59:59Z',
        grantReason: 'Contractor assignment'
      };

      mockTemporalRoleService.assignTemporalRole.mockResolvedValue({
        success: true,
        message: 'Temporal role assigned successfully',
        assignmentId: 'assignment-1',
        auditLogId: 'log-1'
      });

      const response = await request(app)
        .post('/admin/temporal-roles/assign')
        .send(assignmentData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.assignmentId).toBe('assignment-1');
      expect(response.body.auditLogId).toBe('log-1');
      expect(mockTemporalRoleService.assignTemporalRole).toHaveBeenCalledWith({
        ...assignmentData,
        validFrom: undefined,
        expiresAt: new Date(assignmentData.expiresAt),
        assignedBy: 'admin-1',
        isEmergency: false
      });
    });

    it('should assign site-specific temporal role successfully', async () => {
      const assignmentData = {
        userId: 'user-1',
        roleId: 'role-1',
        siteId: 'site-1',
        isTemporary: true,
        expiresAt: '2025-12-31T23:59:59Z',
        grantReason: 'Site-specific access'
      };

      mockTemporalRoleService.assignTemporalRole.mockResolvedValue({
        success: true,
        message: 'Site temporal role assigned successfully',
        assignmentId: 'assignment-1',
        auditLogId: 'log-1'
      });

      const response = await request(app)
        .post('/admin/temporal-roles/assign')
        .send(assignmentData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should reject assignment with missing required fields', async () => {
      const invalidData = {
        userId: 'user-1',
        // Missing roleId and isTemporary
        expiresAt: '2025-12-31T23:59:59Z'
      };

      const response = await request(app)
        .post('/admin/temporal-roles/assign')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required fields');
    });

    it('should reject temporary assignment without expiration', async () => {
      const invalidData = {
        userId: 'user-1',
        roleId: 'role-1',
        isTemporary: true,
        // Missing expiresAt
        grantReason: 'Invalid assignment'
      };

      const response = await request(app)
        .post('/admin/temporal-roles/assign')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Expiration required for temporary roles');
    });

    it('should handle service errors gracefully', async () => {
      const assignmentData = {
        userId: 'user-1',
        roleId: 'role-1',
        isTemporary: true,
        expiresAt: '2025-12-31T23:59:59Z',
        grantReason: 'Test assignment'
      };

      mockTemporalRoleService.assignTemporalRole.mockResolvedValue({
        success: false,
        message: 'User already has this role'
      });

      const response = await request(app)
        .post('/admin/temporal-roles/assign')
        .send(assignmentData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Failed to assign temporal role');
      expect(response.body.details).toBe('User already has this role');
    });
  });

  describe('PUT /admin/temporal-roles/extend', () => {
    it('should extend temporal role successfully', async () => {
      const extensionData = {
        userRoleId: 'user-role-1',
        newExpiresAt: '2026-01-31T23:59:59Z',
        extensionReason: 'Project extended'
      };

      mockTemporalRoleService.extendTemporalRole.mockResolvedValue({
        success: true,
        message: 'Temporal role extended successfully',
        assignmentId: 'user-role-1',
        auditLogId: 'log-1'
      });

      const response = await request(app)
        .put('/admin/temporal-roles/extend')
        .send(extensionData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockTemporalRoleService.extendTemporalRole).toHaveBeenCalledWith({
        ...extensionData,
        newExpiresAt: new Date(extensionData.newExpiresAt),
        extendedBy: 'admin-1'
      });
    });

    it('should extend site temporal role successfully', async () => {
      const extensionData = {
        userSiteRoleId: 'user-site-role-1',
        newExpiresAt: '2026-01-31T23:59:59Z',
        extensionReason: 'Site access extended'
      };

      mockTemporalRoleService.extendTemporalRole.mockResolvedValue({
        success: true,
        message: 'Site temporal role extended successfully',
        assignmentId: 'user-site-role-1',
        auditLogId: 'log-1'
      });

      const response = await request(app)
        .put('/admin/temporal-roles/extend')
        .send(extensionData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject extension with missing required fields', async () => {
      const invalidData = {
        userRoleId: 'user-role-1',
        // Missing newExpiresAt and extensionReason
      };

      const response = await request(app)
        .put('/admin/temporal-roles/extend')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required fields');
    });

    it('should reject extension without assignment ID', async () => {
      const invalidData = {
        // Missing both userRoleId and userSiteRoleId
        newExpiresAt: '2026-01-31T23:59:59Z',
        extensionReason: 'Test extension'
      };

      const response = await request(app)
        .put('/admin/temporal-roles/extend')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing assignment ID');
    });
  });

  describe('DELETE /admin/temporal-roles/revoke', () => {
    it('should revoke temporal role successfully', async () => {
      const revocationData = {
        userRoleId: 'user-role-1',
        revocationReason: 'Contract ended',
        immediateRevocation: true
      };

      mockTemporalRoleService.revokeTemporalRole.mockResolvedValue({
        success: true,
        message: 'Temporal role revoked successfully',
        assignmentId: 'user-role-1',
        auditLogId: 'log-1'
      });

      const response = await request(app)
        .delete('/admin/temporal-roles/revoke')
        .send(revocationData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockTemporalRoleService.revokeTemporalRole).toHaveBeenCalledWith({
        ...revocationData,
        revokedBy: 'admin-1'
      });
    });

    it('should reject revocation without reason', async () => {
      const invalidData = {
        userRoleId: 'user-role-1',
        // Missing revocationReason
        immediateRevocation: true
      };

      const response = await request(app)
        .delete('/admin/temporal-roles/revoke')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required fields');
    });
  });

  describe('POST /admin/temporal-roles/emergency-access', () => {
    it('should grant emergency access successfully', async () => {
      const emergencyData = {
        userId: 'user-1',
        roleId: 'role-1',
        emergencyReason: 'Production line down - immediate access needed',
        durationHours: 4,
        approvedBy: 'supervisor-1'
      };

      mockTemporalRoleService.grantEmergencyAccess.mockResolvedValue({
        success: true,
        message: 'Emergency access granted successfully',
        assignmentId: 'emergency-1',
        auditLogId: 'log-1'
      });

      const response = await request(app)
        .post('/admin/temporal-roles/emergency-access')
        .send(emergencyData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.assignmentId).toBe('emergency-1');
      expect(response.body.expiresAt).toBeDefined();
      expect(mockTemporalRoleService.grantEmergencyAccess).toHaveBeenCalledWith({
        ...emergencyData,
        requestedBy: 'admin-1'
      });
    });

    it('should reject emergency access with invalid duration', async () => {
      const invalidData = {
        userId: 'user-1',
        roleId: 'role-1',
        emergencyReason: 'Test emergency',
        durationHours: 200 // Exceeds 168 hours maximum
      };

      const response = await request(app)
        .post('/admin/temporal-roles/emergency-access')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid duration');
    });

    it('should reject emergency access with zero duration', async () => {
      const invalidData = {
        userId: 'user-1',
        roleId: 'role-1',
        emergencyReason: 'Test emergency',
        durationHours: 0
      };

      const response = await request(app)
        .post('/admin/temporal-roles/emergency-access')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid duration');
    });
  });

  describe('GET /admin/temporal-roles/user/:userId', () => {
    it('should get user temporal roles successfully', async () => {
      const mockTemporalRoles = [
        {
          id: 'role-1',
          roleId: 'role-1',
          roleName: 'Temporary Access',
          isTemporary: true,
          expiresAt: '2025-12-31T23:59:59Z',
          grantReason: 'Contractor assignment'
        }
      ];

      mockPermissionService.getUserTemporalRoles.mockResolvedValue(mockTemporalRoles);

      const response = await request(app)
        .get('/admin/temporal-roles/user/user-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.userId).toBe('user-1');
      expect(response.body.temporalRoles).toEqual(mockTemporalRoles);
      expect(mockPermissionService.getUserTemporalRoles).toHaveBeenCalledWith('user-1', undefined);
    });

    it('should get user temporal roles for specific site', async () => {
      const mockTemporalRoles = [
        {
          id: 'site-role-1',
          roleId: 'role-1',
          siteId: 'site-1',
          roleName: 'Site Access',
          isTemporary: true,
          expiresAt: '2025-12-31T23:59:59Z'
        }
      ];

      mockPermissionService.getUserTemporalRoles.mockResolvedValue(mockTemporalRoles);

      const response = await request(app)
        .get('/admin/temporal-roles/user/user-1?siteId=site-1');

      expect(response.status).toBe(200);
      expect(response.body.siteId).toBe('site-1');
      expect(mockPermissionService.getUserTemporalRoles).toHaveBeenCalledWith('user-1', 'site-1');
    });

    it('should reject request for missing user ID', async () => {
      const response = await request(app)
        .get('/admin/temporal-roles/user/');

      expect(response.status).toBe(404); // Route not found
    });
  });

  describe('GET /admin/temporal-roles/audit-logs', () => {
    it('should get audit logs with filters successfully', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          userId: 'user-1',
          roleId: 'role-1',
          accessType: 'ASSIGNMENT',
          timestamp: '2025-10-31T10:00:00Z',
          details: { reason: 'Contractor assignment' }
        }
      ];

      mockTemporalRoleService.getTemporalAccessLogs.mockResolvedValue(mockLogs);

      const response = await request(app)
        .get('/admin/temporal-roles/audit-logs')
        .query({
          userId: 'user-1',
          roleId: 'role-1',
          accessType: 'ASSIGNMENT',
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          limit: '50'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.logs).toEqual(mockLogs);
      expect(response.body.count).toBe(1);
      expect(mockTemporalRoleService.getTemporalAccessLogs).toHaveBeenCalledWith(
        'user-1',
        'role-1',
        undefined,
        'ASSIGNMENT',
        new Date('2025-01-01'),
        new Date('2025-12-31'),
        50
      );
    });

    it('should get audit logs without filters', async () => {
      const mockLogs = [];
      mockTemporalRoleService.getTemporalAccessLogs.mockResolvedValue(mockLogs);

      const response = await request(app)
        .get('/admin/temporal-roles/audit-logs');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockTemporalRoleService.getTemporalAccessLogs).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        100
      );
    });
  });

  describe('POST /admin/temporal-roles/cleanup', () => {
    it('should perform cleanup successfully', async () => {
      const cleanupResult = {
        success: true,
        expiredRolesRemoved: 5,
        globalRoles: 3,
        siteRoles: 2,
        auditLogsCreated: 5,
        errors: []
      };

      mockTemporalRoleService.cleanupExpiredRoles.mockResolvedValue(cleanupResult);

      const response = await request(app)
        .post('/admin/temporal-roles/cleanup');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.result.expiredRolesRemoved).toBe(5);
      expect(response.body.result.errorCount).toBe(0);
    });

    it('should handle cleanup with errors', async () => {
      const cleanupResult = {
        success: true,
        expiredRolesRemoved: 3,
        globalRoles: 2,
        siteRoles: 1,
        auditLogsCreated: 3,
        errors: ['Failed to cleanup role user-role-1: Database error']
      };

      mockTemporalRoleService.cleanupExpiredRoles.mockResolvedValue(cleanupResult);

      const response = await request(app)
        .post('/admin/temporal-roles/cleanup');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.result.errorCount).toBe(1);
      expect(response.body.result.errors).toContain('Failed to cleanup role user-role-1: Database error');
    });
  });

  describe('GET /admin/temporal-roles/stats', () => {
    it('should get statistics successfully', async () => {
      const now = new Date();

      // Mock Promise.all results for statistics
      mockPrisma.userRole.count
        .mockResolvedValueOnce(5) // Active global roles
        .mockResolvedValueOnce(3) // Expired global roles
        .mockResolvedValueOnce(2); // Pending global roles

      mockPrisma.userSiteRole.count
        .mockResolvedValueOnce(4) // Active site roles
        .mockResolvedValueOnce(2) // Expired site roles
        .mockResolvedValueOnce(1); // Pending site roles

      mockPrisma.temporalAccessLog.count
        .mockResolvedValueOnce(3) // Emergency access last 24h
        .mockResolvedValueOnce(15); // Audit activity last 7d

      const response = await request(app)
        .get('/admin/temporal-roles/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.statistics.activeTemporalRoles).toBe(9); // 5 + 4
      expect(response.body.statistics.expiredTemporalRoles).toBe(5); // 3 + 2
      expect(response.body.statistics.pendingTemporalRoles).toBe(3); // 2 + 1
      expect(response.body.statistics.emergencyAccessLast24h).toBe(3);
      expect(response.body.statistics.auditActivityLast7d).toBe(15);
    });
  });

  describe('Error Handling', () => {
    it('should handle service exceptions gracefully', async () => {
      mockTemporalRoleService.assignTemporalRole.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/admin/temporal-roles/assign')
        .send({
          userId: 'user-1',
          roleId: 'role-1',
          isTemporary: true,
          expiresAt: '2025-12-31T23:59:59Z',
          grantReason: 'Test assignment'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
      expect(response.body.details).toBe('Failed to process temporal role assignment');
    });

    it('should handle permission service exceptions', async () => {
      mockPermissionService.getUserTemporalRoles.mockRejectedValue(new Error('Permission service error'));

      const response = await request(app)
        .get('/admin/temporal-roles/user/user-1');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
      expect(response.body.details).toBe('Failed to retrieve user temporal roles');
    });

    it('should handle statistics query errors', async () => {
      mockPrisma.userRole.count.mockRejectedValue(new Error('Database query failed'));

      const response = await request(app)
        .get('/admin/temporal-roles/stats');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
      expect(response.body.details).toBe('Failed to retrieve temporal role statistics');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require System Administrator role', async () => {
      // Create app without admin user
      const unauthorizedApp = express();
      unauthorizedApp.use(express.json());
      unauthorizedApp.use((req: any, res: any, next: any) => {
        req.user = { id: 'regular-user', name: 'Regular User' };
        next();
      });
      unauthorizedApp.use('/admin/temporal-roles', temporalRolesRoutes);

      const response = await request(unauthorizedApp)
        .post('/admin/temporal-roles/assign')
        .send({
          userId: 'user-1',
          roleId: 'role-1',
          isTemporary: true,
          expiresAt: '2025-12-31T23:59:59Z',
          grantReason: 'Unauthorized attempt'
        });

      expect(response.status).toBe(403);
    });
  });
});