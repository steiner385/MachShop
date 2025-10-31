import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { SaviyntService, UserSyncResult } from '../../services/SaviyntService';
import { SaviyntApiClient } from '../../services/SaviyntApiClient';
import { SaviyntOperation, SaviyntSyncStatus } from '@prisma/client';

// Mock dependencies
vi.mock('@prisma/client');
vi.mock('../../services/SaviyntApiClient');

describe('SaviyntService', () => {
  let service: SaviyntService;
  let mockPrisma: any;
  let mockApiClient: any;

  beforeEach(() => {
    // Mock Prisma client
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        update: vi.fn()
      },
      role: {
        findUnique: vi.fn()
      },
      saviyntUserMapping: {
        create: vi.fn(),
        update: vi.fn(),
        findFirst: vi.fn()
      },
      saviyntRoleMapping: {
        create: vi.fn(),
        update: vi.fn(),
        findFirst: vi.fn()
      },
      saviyntSyncLog: {
        create: vi.fn(),
        findMany: vi.fn(),
        groupBy: vi.fn(),
        aggregate: vi.fn()
      }
    };

    // Mock API client
    mockApiClient = {
      authenticate: vi.fn(),
      testConnection: vi.fn(),
      createUser: vi.fn(),
      updateUser: vi.fn(),
      disableUser: vi.fn(),
      enableUser: vi.fn(),
      getUser: vi.fn(),
      createRole: vi.fn(),
      updateRole: vi.fn(),
      getRole: vi.fn()
    };

    service = new SaviyntService(mockPrisma as PrismaClient, {});
    service['apiClient'] = mockApiClient;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize successfully when enabled', async () => {
      service['isEnabled'] = true;
      mockApiClient.authenticate.mockResolvedValueOnce(undefined);
      mockApiClient.testConnection.mockResolvedValueOnce(true);

      await service.initialize();

      expect(mockApiClient.authenticate).toHaveBeenCalled();
      expect(mockApiClient.testConnection).toHaveBeenCalled();
    });

    it('should skip initialization when disabled', async () => {
      service['isEnabled'] = false;

      await service.initialize();

      expect(mockApiClient.authenticate).not.toHaveBeenCalled();
      expect(mockApiClient.testConnection).not.toHaveBeenCalled();
    });

    it('should handle initialization failure', async () => {
      service['isEnabled'] = true;
      mockApiClient.authenticate.mockRejectedValueOnce(new Error('Auth failed'));

      await expect(service.initialize()).rejects.toThrow('Auth failed');
    });
  });

  describe('Health Status', () => {
    it('should return healthy status when enabled and connected', async () => {
      service['isEnabled'] = true;
      mockApiClient.testConnection.mockResolvedValueOnce(true);

      const status = await service.getHealthStatus();

      expect(status.isHealthy).toBe(true);
      expect(status.lastChecked).toBeInstanceOf(Date);
      expect(status.responseTime).toBeGreaterThan(0);
    });

    it('should return unhealthy status when disabled', async () => {
      service['isEnabled'] = false;

      const status = await service.getHealthStatus();

      expect(status.isHealthy).toBe(false);
      expect(status.errorMessage).toBe('Saviynt integration is disabled');
    });

    it('should return unhealthy status on connection failure', async () => {
      service['isEnabled'] = true;
      mockApiClient.testConnection.mockRejectedValueOnce(new Error('Connection failed'));

      const status = await service.getHealthStatus();

      expect(status.isHealthy).toBe(false);
      expect(status.errorMessage).toBe('Connection failed');
    });
  });

  describe('User Synchronization', () => {
    const mockUser = {
      id: 'user123',
      username: 'testuser',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      isActive: true,
      employeeNumber: 'EMP001',
      department: 'IT',
      phone: '+1234567890',
      saviyntUserMapping: null
    };

    it('should provision new user successfully', async () => {
      service['isEnabled'] = true;

      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      mockApiClient.createUser.mockResolvedValueOnce('saviynt123');
      mockPrisma.saviyntUserMapping.create.mockResolvedValueOnce({});
      mockPrisma.saviyntSyncLog.create.mockResolvedValueOnce({});

      const result = await service.syncUser('user123', SaviyntOperation.PROVISION, 'test-user');

      expect(result.success).toBe(true);
      expect(result.userKey).toBe('saviynt123');
      expect(result.operation).toBe(SaviyntOperation.PROVISION);

      expect(mockApiClient.createUser).toHaveBeenCalledWith(expect.objectContaining({
        username: 'testuser',
        email: 'test@example.com',
        firstname: 'Test',
        lastname: 'User'
      }));

      expect(mockPrisma.saviyntUserMapping.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user123',
          saviyntUserId: 'saviynt123',
          saviyntUsername: 'testuser',
          syncStatus: SaviyntSyncStatus.COMPLETED
        })
      });
    });

    it('should update existing user successfully', async () => {
      service['isEnabled'] = true;

      const userWithMapping = {
        ...mockUser,
        saviyntUserMapping: {
          userId: 'user123',
          saviyntUserId: 'saviynt123',
          saviyntUsername: 'testuser'
        }
      };

      mockPrisma.user.findUnique.mockResolvedValueOnce(userWithMapping);
      mockApiClient.updateUser.mockResolvedValueOnce(undefined);
      mockPrisma.saviyntUserMapping.update.mockResolvedValueOnce({});
      mockPrisma.saviyntSyncLog.create.mockResolvedValueOnce({});

      const result = await service.syncUser('user123', SaviyntOperation.UPDATE, 'test-user');

      expect(result.success).toBe(true);
      expect(result.operation).toBe(SaviyntOperation.UPDATE);

      expect(mockApiClient.updateUser).toHaveBeenCalledWith(
        'saviynt123',
        expect.objectContaining({
          email: 'test@example.com',
          firstname: 'Test',
          lastname: 'User'
        })
      );
    });

    it('should deprovision user successfully', async () => {
      service['isEnabled'] = true;

      const userWithMapping = {
        ...mockUser,
        saviyntUserMapping: {
          userId: 'user123',
          saviyntUserId: 'saviynt123',
          saviyntUsername: 'testuser'
        }
      };

      mockPrisma.user.findUnique.mockResolvedValueOnce(userWithMapping);
      mockApiClient.disableUser.mockResolvedValueOnce(undefined);
      mockPrisma.saviyntUserMapping.update.mockResolvedValueOnce({});
      mockPrisma.saviyntSyncLog.create.mockResolvedValueOnce({});

      const result = await service.syncUser('user123', SaviyntOperation.DEPROVISION, 'test-user');

      expect(result.success).toBe(true);
      expect(result.operation).toBe(SaviyntOperation.DEPROVISION);

      expect(mockApiClient.disableUser).toHaveBeenCalledWith('saviynt123');
    });

    it('should handle user not found error', async () => {
      service['isEnabled'] = true;

      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.saviyntSyncLog.create.mockResolvedValueOnce({});

      const result = await service.syncUser('nonexistent', SaviyntOperation.PROVISION, 'test-user');

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('User not found');
    });

    it('should handle API errors gracefully', async () => {
      service['isEnabled'] = true;

      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      mockApiClient.createUser.mockRejectedValueOnce(new Error('API Error'));
      mockPrisma.saviyntSyncLog.create.mockResolvedValueOnce({});

      const result = await service.syncUser('user123', SaviyntOperation.PROVISION, 'test-user');

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('API Error');
    });

    it('should throw error when disabled', async () => {
      service['isEnabled'] = false;

      await expect(
        service.syncUser('user123', SaviyntOperation.PROVISION, 'test-user')
      ).rejects.toThrow('Saviynt integration is disabled');
    });
  });

  describe('Role Synchronization', () => {
    const mockRole = {
      id: 'role123',
      roleCode: 'TEST_ROLE',
      roleName: 'Test Role',
      description: 'Test role description',
      isGlobal: true,
      createdBy: 'admin',
      permissions: [
        { permission: { permissionCode: 'READ_USERS' } },
        { permission: { permissionCode: 'WRITE_USERS' } }
      ],
      saviyntRoleMappings: []
    };

    it('should create role mapping successfully', async () => {
      service['isEnabled'] = true;

      mockPrisma.role.findUnique.mockResolvedValueOnce(mockRole);
      mockPrisma.saviyntRoleMapping.findFirst.mockResolvedValueOnce(null);
      mockApiClient.getRole.mockResolvedValueOnce(null);
      mockApiClient.createRole.mockResolvedValueOnce('saviyntrole123');
      mockPrisma.saviyntRoleMapping.create.mockResolvedValueOnce({});
      mockPrisma.saviyntSyncLog.create.mockResolvedValueOnce({});

      const result = await service.syncRole('role123', SaviyntOperation.CREATE, 'test-user');

      expect(result.success).toBe(true);
      expect(result.roleKey).toBe('saviyntrole123');
      expect(result.operation).toBe(SaviyntOperation.CREATE);

      expect(mockApiClient.createRole).toHaveBeenCalledWith(expect.objectContaining({
        rolename: 'TEST_ROLE',
        roledisplayname: 'Test Role',
        roledescription: 'Test role description'
      }));
    });

    it('should update existing role mapping', async () => {
      service['isEnabled'] = true;

      const roleWithMapping = {
        ...mockRole,
        saviyntRoleMappings: [{
          id: 'mapping123',
          saviyntRoleId: 'saviyntrole123'
        }]
      };

      mockPrisma.role.findUnique.mockResolvedValueOnce(roleWithMapping);
      mockApiClient.updateRole.mockResolvedValueOnce(undefined);
      mockPrisma.saviyntRoleMapping.update.mockResolvedValueOnce({});
      mockPrisma.saviyntSyncLog.create.mockResolvedValueOnce({});

      const result = await service.syncRole('role123', SaviyntOperation.UPDATE, 'test-user');

      expect(result.success).toBe(true);
      expect(result.operation).toBe(SaviyntOperation.UPDATE);

      expect(mockApiClient.updateRole).toHaveBeenCalledWith(
        'saviyntrole123',
        expect.objectContaining({
          roledisplayname: 'Test Role',
          roledescription: 'Test role description'
        })
      );
    });
  });

  describe('Sync Statistics', () => {
    it('should return sync statistics', async () => {
      mockPrisma.saviyntSyncLog.groupBy.mockResolvedValueOnce([
        { status: 'COMPLETED', entityType: 'USER', operation: 'CREATE', _count: 10 },
        { status: 'FAILED', entityType: 'USER', operation: 'UPDATE', _count: 2 }
      ]);

      mockPrisma.saviyntSyncLog.aggregate.mockResolvedValueOnce({
        _avg: { duration: 1500 },
        _sum: { duration: 15000 }
      });

      const stats = await service.getSyncStatistics();

      expect(stats.operations).toHaveLength(2);
      expect(stats.averageDuration).toBe(1500);
      expect(stats.totalDuration).toBe(15000);
    });

    it('should return sync statistics with time range', async () => {
      const timeRange = {
        start: new Date('2023-01-01'),
        end: new Date('2023-12-31')
      };

      mockPrisma.saviyntSyncLog.groupBy.mockResolvedValueOnce([]);
      mockPrisma.saviyntSyncLog.aggregate.mockResolvedValueOnce({
        _avg: { duration: null },
        _sum: { duration: null }
      });

      const stats = await service.getSyncStatistics(timeRange);

      expect(mockPrisma.saviyntSyncLog.groupBy).toHaveBeenCalledWith({
        by: ['status', 'entityType', 'operation'],
        where: {
          startedAt: {
            gte: timeRange.start,
            lte: timeRange.end
          }
        },
        _count: true
      });
    });
  });

  describe('Recent Sync Logs', () => {
    it('should return recent sync logs', async () => {
      const mockLogs = [
        { id: 'log1', entityType: 'USER', operation: 'CREATE', status: 'COMPLETED' },
        { id: 'log2', entityType: 'ROLE', operation: 'UPDATE', status: 'FAILED' }
      ];

      mockPrisma.saviyntSyncLog.findMany.mockResolvedValueOnce(mockLogs);

      const logs = await service.getRecentSyncLogs(50);

      expect(logs).toEqual(mockLogs);
      expect(mockPrisma.saviyntSyncLog.findMany).toHaveBeenCalledWith({
        take: 50,
        orderBy: { startedAt: 'desc' }
      });
    });

    it('should use default limit when not specified', async () => {
      mockPrisma.saviyntSyncLog.findMany.mockResolvedValueOnce([]);

      await service.getRecentSyncLogs();

      expect(mockPrisma.saviyntSyncLog.findMany).toHaveBeenCalledWith({
        take: 50,
        orderBy: { startedAt: 'desc' }
      });
    });
  });

  describe('Connectivity Testing', () => {
    it('should test connectivity and return health status', async () => {
      service['isEnabled'] = true;
      mockApiClient.testConnection.mockResolvedValueOnce(true);

      const status = await service.testConnectivity();

      expect(status.isHealthy).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database errors gracefully', async () => {
      service['isEnabled'] = true;

      mockPrisma.user.findUnique.mockRejectedValueOnce(new Error('Database error'));
      mockPrisma.saviyntSyncLog.create.mockResolvedValueOnce({});

      const result = await service.syncUser('user123', SaviyntOperation.PROVISION, 'test-user');

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('Database error');
    });

    it('should handle unsupported operations', async () => {
      service['isEnabled'] = true;

      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      mockPrisma.saviyntSyncLog.create.mockResolvedValueOnce({});

      const result = await service.syncUser('user123', 'UNSUPPORTED_OP' as any, 'test-user');

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Unsupported operation');
    });
  });
});