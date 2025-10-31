import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PrismaClient, IntegrationType } from '@prisma/client';
import { IntegrationManager } from '../../services/IntegrationManager';

// Mock node-cron
vi.mock('node-cron', () => ({
  default: {
    schedule: vi.fn((schedule, callback) => ({
      stop: vi.fn(),
    })),
    validate: vi.fn((schedule) => {
      // Simple validation - check for basic cron format
      const cronRegex = /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])) (\*|[0-6])$/;
      return cronRegex.test(schedule);
    }),
  },
}));

// Mock all adapter classes
vi.mock('../../services/OracleFusionAdapter', () => ({
  OracleFusionAdapter: vi.fn().mockImplementation(() => ({
    syncItems: vi.fn().mockResolvedValue({
      success: true,
      recordsProcessed: 10,
      recordsCreated: 8,
      recordsUpdated: 2,
      recordsFailed: 0,
      errors: [],
      duration: 1500,
    }),
    syncBOMs: vi.fn().mockResolvedValue({
      success: true,
      recordsProcessed: 5,
      recordsCreated: 5,
      recordsUpdated: 0,
      recordsFailed: 0,
      errors: [],
      duration: 800,
    }),
    syncWorkOrders: vi.fn().mockResolvedValue({
      success: true,
      recordsProcessed: 15,
      recordsCreated: 10,
      recordsUpdated: 5,
      recordsFailed: 0,
      errors: [],
      duration: 2000,
    }),
    getHealthStatus: vi.fn().mockResolvedValue({
      connected: true,
      responseTime: 120,
      error: null,
    }),
  })),
}));

vi.mock('../../services/OracleEBSAdapter', () => ({
  OracleEBSAdapter: vi.fn().mockImplementation(() => ({
    syncItems: vi.fn().mockResolvedValue({
      success: true,
      recordsProcessed: 12,
      recordsCreated: 10,
      recordsUpdated: 2,
      recordsFailed: 0,
      errors: [],
      duration: 1800,
    }),
    syncBOMs: vi.fn().mockResolvedValue({
      success: true,
      recordsProcessed: 6,
      recordsCreated: 6,
      recordsUpdated: 0,
      recordsFailed: 0,
      errors: [],
      duration: 900,
    }),
    syncWorkOrders: vi.fn().mockResolvedValue({
      success: true,
      recordsProcessed: 20,
      recordsCreated: 15,
      recordsUpdated: 5,
      recordsFailed: 0,
      errors: [],
      duration: 2500,
    }),
    getHealthStatus: vi.fn().mockResolvedValue({
      connected: true,
      responseTime: 150,
      error: null,
    }),
  })),
}));

vi.mock('../../services/TeamcenterAdapter', () => ({
  TeamcenterAdapter: vi.fn().mockImplementation(() => ({
    syncItems: vi.fn().mockResolvedValue({
      success: true,
      recordsProcessed: 8,
      recordsCreated: 8,
      recordsUpdated: 0,
      recordsFailed: 0,
      errors: [],
      duration: 1200,
    }),
    syncBOMs: vi.fn().mockResolvedValue({
      success: true,
      recordsProcessed: 4,
      recordsCreated: 4,
      recordsUpdated: 0,
      recordsFailed: 0,
      errors: [],
      duration: 700,
    }),
    getHealthStatus: vi.fn().mockResolvedValue({
      connected: true,
      responseTime: 100,
      error: null,
    }),
  })),
}));

vi.mock('../../services/ProficyHistorianAdapter', () => ({
  ProficyHistorianAdapter: vi.fn().mockImplementation(() => ({
    syncItems: vi.fn().mockResolvedValue({ success: true, recordsProcessed: 0, recordsCreated: 0, recordsUpdated: 0, recordsFailed: 0, errors: [], duration: 100 }),
    syncBOMs: vi.fn().mockResolvedValue({ success: true, recordsProcessed: 0, recordsCreated: 0, recordsUpdated: 0, recordsFailed: 0, errors: [], duration: 100 }),
    getHealthStatus: vi.fn().mockResolvedValue({ connected: true, responseTime: 50, error: null }),
  })),
}));

vi.mock('../../services/IBMMaximoAdapter', () => ({
  IBMMaximoAdapter: vi.fn().mockImplementation(() => ({
    syncItems: vi.fn().mockResolvedValue({ success: true, recordsProcessed: 0, recordsCreated: 0, recordsUpdated: 0, recordsFailed: 0, errors: [], duration: 100 }),
    syncBOMs: vi.fn().mockResolvedValue({ success: true, recordsProcessed: 0, recordsCreated: 0, recordsUpdated: 0, recordsFailed: 0, errors: [], duration: 100 }),
    getHealthStatus: vi.fn().mockResolvedValue({ connected: true, responseTime: 50, error: null }),
  })),
}));

vi.mock('../../services/IndysoftAdapter', () => ({
  IndysoftAdapter: vi.fn().mockImplementation(() => ({
    syncItems: vi.fn().mockResolvedValue({ success: true, recordsProcessed: 0, recordsCreated: 0, recordsUpdated: 0, recordsFailed: 0, errors: [], duration: 100 }),
    syncBOMs: vi.fn().mockResolvedValue({ success: true, recordsProcessed: 0, recordsCreated: 0, recordsUpdated: 0, recordsFailed: 0, errors: [], duration: 100 }),
    getHealthStatus: vi.fn().mockResolvedValue({ connected: true, responseTime: 50, error: null }),
  })),
}));

vi.mock('../../services/CovalentAdapter', () => ({
  CovalentAdapter: vi.fn().mockImplementation(() => ({
    syncItems: vi.fn().mockResolvedValue({ success: true, recordsProcessed: 0, recordsCreated: 0, recordsUpdated: 0, recordsFailed: 0, errors: [], duration: 100 }),
    syncBOMs: vi.fn().mockResolvedValue({ success: true, recordsProcessed: 0, recordsCreated: 0, recordsUpdated: 0, recordsFailed: 0, errors: [], duration: 100 }),
    getHealthStatus: vi.fn().mockResolvedValue({ connected: true, responseTime: 50, error: null }),
  })),
}));

vi.mock('../../services/ShopFloorConnectAdapter', () => ({
  ShopFloorConnectAdapter: vi.fn().mockImplementation(() => ({
    syncItems: vi.fn().mockResolvedValue({ success: true, recordsProcessed: 0, recordsCreated: 0, recordsUpdated: 0, recordsFailed: 0, errors: [], duration: 100 }),
    syncBOMs: vi.fn().mockResolvedValue({ success: true, recordsProcessed: 0, recordsCreated: 0, recordsUpdated: 0, recordsFailed: 0, errors: [], duration: 100 }),
    getHealthStatus: vi.fn().mockResolvedValue({ connected: true, responseTime: 50, error: null }),
  })),
}));

vi.mock('../../services/PredatorPDMAdapter', () => ({
  PredatorPDMAdapter: vi.fn().mockImplementation(() => ({
    syncItems: vi.fn().mockResolvedValue({ success: true, recordsProcessed: 0, recordsCreated: 0, recordsUpdated: 0, recordsFailed: 0, errors: [], duration: 100 }),
    syncBOMs: vi.fn().mockResolvedValue({ success: true, recordsProcessed: 0, recordsCreated: 0, recordsUpdated: 0, recordsFailed: 0, errors: [], duration: 100 }),
    getHealthStatus: vi.fn().mockResolvedValue({ connected: true, responseTime: 50, error: null }),
  })),
}));

vi.mock('../../services/PredatorDNCAdapter', () => ({
  PredatorDNCAdapter: vi.fn().mockImplementation(() => ({
    syncItems: vi.fn().mockResolvedValue({ success: true, recordsProcessed: 0, recordsCreated: 0, recordsUpdated: 0, recordsFailed: 0, errors: [], duration: 100 }),
    syncBOMs: vi.fn().mockResolvedValue({ success: true, recordsProcessed: 0, recordsCreated: 0, recordsUpdated: 0, recordsFailed: 0, errors: [], duration: 100 }),
    getHealthStatus: vi.fn().mockResolvedValue({ connected: true, responseTime: 50, error: null }),
  })),
}));

vi.mock('../../services/CMMAdapter', () => ({
  CMMAdapter: vi.fn().mockImplementation(() => ({
    syncItems: vi.fn().mockResolvedValue({ success: true, recordsProcessed: 0, recordsCreated: 0, recordsUpdated: 0, recordsFailed: 0, errors: [], duration: 100 }),
    syncBOMs: vi.fn().mockResolvedValue({ success: true, recordsProcessed: 0, recordsCreated: 0, recordsUpdated: 0, recordsFailed: 0, errors: [], duration: 100 }),
    getHealthStatus: vi.fn().mockResolvedValue({ connected: true, responseTime: 50, error: null }),
  })),
}));

// Mock @prisma/client enums
vi.mock('@prisma/client', async () => {
  const actual = await vi.importActual('@prisma/client');
  return {
    ...actual,
    IntegrationType: {
      ERP: 'ERP',
      PLM: 'PLM',
      CMMS: 'CMMS',
      HISTORIAN: 'HISTORIAN',
      CALIBRATION: 'CALIBRATION',
      SKILLS: 'SKILLS',
      SFC: 'SFC',
      PDM: 'PDM',
      DNC: 'DNC',
      CMM: 'CMM',
    },
  };
});

// Mock Prisma Client
vi.mock('../../lib/database', () => ({
  default: {
    integrationConfig: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    integrationLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe('IntegrationManager', () => {
  let manager: IntegrationManager;
  let mockPrisma: any;

  const mockOracleFusionConfig = {
    id: 'config-fusion',
    name: 'oracle-fusion',
    displayName: 'Oracle Fusion Cloud',
    type: 'ERP' as IntegrationType,
    enabled: true,
    config: {
      baseUrl: 'https://fusion.oracle.com',
      clientId: 'client-123',
      clientSecret: 'secret-456',
      scopes: ['items', 'boms', 'workorders'],
    },
    lastSync: null,
    lastSyncStatus: null,
    lastError: null,
    errorCount: 0,
    totalSyncs: 0,
    successCount: 0,
    failureCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTeamcenterConfig = {
    id: 'config-tc',
    name: 'teamcenter',
    displayName: 'Siemens Teamcenter',
    type: 'PLM' as IntegrationType,
    enabled: true,
    config: {
      baseUrl: 'https://tc.example.com',
      username: 'tcuser',
      password: 'tcpass',
    },
    lastSync: null,
    lastSyncStatus: null,
    lastError: null,
    errorCount: 0,
    totalSyncs: 0,
    successCount: 0,
    failureCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    // Import the mocked database
    const { default: prisma } = await import('../../lib/database');
    mockPrisma = prisma;
    manager = new IntegrationManager(mockPrisma, 'test-encryption-key');
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Stop all jobs after each test to prevent leaks
    manager.stopAllJobs();
  });

  describe('initialize', () => {
    it('should initialize with enabled integrations', async () => {
      mockPrisma.integrationConfig.findMany.mockResolvedValue([
        mockOracleFusionConfig,
        mockTeamcenterConfig,
      ]);

      mockPrisma.integrationConfig.findUnique
        .mockResolvedValueOnce(mockOracleFusionConfig)
        .mockResolvedValueOnce(mockTeamcenterConfig);

      await manager.initialize();

      expect(mockPrisma.integrationConfig.findMany).toHaveBeenCalledWith({
        where: { enabled: true },
      });
    });

    it('should handle errors when loading adapters', async () => {
      const invalidConfig = {
        ...mockOracleFusionConfig,
        id: 'invalid-config',
        name: 'invalid-erp',
      };

      mockPrisma.integrationConfig.findMany.mockResolvedValue([invalidConfig]);
      mockPrisma.integrationConfig.findUnique.mockResolvedValue(invalidConfig);

      // Should not throw - errors are logged but initialization continues
      await expect(manager.initialize()).resolves.not.toThrow();
    });

    it('should skip disabled integrations', async () => {
      const disabledConfig = { ...mockOracleFusionConfig, enabled: false };

      mockPrisma.integrationConfig.findMany
        .mockResolvedValueOnce([]) // First call for enabled integrations returns empty
        .mockResolvedValueOnce([disabledConfig]); // Second call for scheduleJobs

      await manager.initialize();

      // Should not load any adapters since no enabled configs
      expect(manager.getAdapter(disabledConfig.id)).toBeUndefined();
    });
  });

  describe('getAdapter', () => {
    it('should return adapter by config ID', async () => {
      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockOracleFusionConfig);

      // Manually load adapter first
      await manager['loadAdapter'](mockOracleFusionConfig.id);

      const adapter = manager.getAdapter(mockOracleFusionConfig.id);

      expect(adapter).toBeDefined();
    });

    it('should return undefined for non-existent adapter', () => {
      const adapter = manager.getAdapter('non-existent-id');

      expect(adapter).toBeUndefined();
    });
  });

  describe('getAdapterByName', () => {
    it('should return adapter by config name', async () => {
      mockPrisma.integrationConfig.findUnique
        .mockResolvedValueOnce(mockOracleFusionConfig)
        .mockResolvedValueOnce(mockOracleFusionConfig);

      const adapter = await manager.getAdapterByName('oracle-fusion');

      expect(adapter).toBeDefined();
      expect(mockPrisma.integrationConfig.findUnique).toHaveBeenCalledWith({
        where: { name: 'oracle-fusion' },
      });
    });

    it('should return undefined if config not found', async () => {
      mockPrisma.integrationConfig.findUnique.mockResolvedValue(null);

      const adapter = await manager.getAdapterByName('non-existent');

      expect(adapter).toBeUndefined();
    });

    it('should load adapter if not already loaded', async () => {
      mockPrisma.integrationConfig.findUnique
        .mockResolvedValueOnce(mockOracleFusionConfig)
        .mockResolvedValueOnce(mockOracleFusionConfig);

      const adapter = await manager.getAdapterByName('oracle-fusion');

      expect(adapter).toBeDefined();
    });
  });

  describe('getAdapterByType', () => {
    it('should return first adapter of specified type', async () => {
      mockPrisma.integrationConfig.findFirst.mockResolvedValue(mockOracleFusionConfig);
      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockOracleFusionConfig);

      const adapter = await manager.getAdapterByType('ERP');

      expect(adapter).toBeDefined();
      expect(mockPrisma.integrationConfig.findFirst).toHaveBeenCalledWith({
        where: { type: 'ERP', enabled: true },
      });
    });

    it('should return undefined if no adapter of type exists', async () => {
      mockPrisma.integrationConfig.findFirst.mockResolvedValue(null);

      const adapter = await manager.getAdapterByType('CMMS');

      expect(adapter).toBeUndefined();
    });
  });

  describe('executeSyncJob', () => {
    it('should execute sync_items job successfully', async () => {
      mockPrisma.integrationConfig.findUnique
        .mockResolvedValueOnce(mockOracleFusionConfig)
        .mockResolvedValueOnce(mockOracleFusionConfig)
        .mockResolvedValueOnce(mockOracleFusionConfig);

      mockPrisma.integrationConfig.update.mockResolvedValue({});
      mockPrisma.integrationLog.create.mockResolvedValue({});

      await manager.executeSyncJob({
        configName: 'oracle-fusion',
        jobType: 'sync_items',
      });

      expect(mockPrisma.integrationLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            configId: 'config-fusion',
            operation: 'sync_items',
            direction: 'INBOUND',
            status: 'SUCCESS',
          }),
        })
      );

      expect(mockPrisma.integrationConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'config-fusion' },
          data: expect.objectContaining({
            lastSyncStatus: 'SUCCESS',
            successCount: 1,
          }),
        })
      );
    });

    it('should execute sync_boms job successfully', async () => {
      mockPrisma.integrationConfig.findUnique
        .mockResolvedValueOnce(mockOracleFusionConfig)
        .mockResolvedValueOnce(mockOracleFusionConfig)
        .mockResolvedValueOnce(mockOracleFusionConfig);

      mockPrisma.integrationConfig.update.mockResolvedValue({});
      mockPrisma.integrationLog.create.mockResolvedValue({});

      await manager.executeSyncJob({
        configName: 'oracle-fusion',
        jobType: 'sync_boms',
        filters: { assemblyItemNumber: 'ASSY-001' },
      });

      expect(mockPrisma.integrationLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            operation: 'sync_boms',
            status: 'SUCCESS',
          }),
        })
      );
    });

    it('should execute sync_workorders job successfully', async () => {
      mockPrisma.integrationConfig.findUnique
        .mockResolvedValueOnce(mockOracleFusionConfig)
        .mockResolvedValueOnce(mockOracleFusionConfig)
        .mockResolvedValueOnce(mockOracleFusionConfig);

      mockPrisma.integrationConfig.update.mockResolvedValue({});
      mockPrisma.integrationLog.create.mockResolvedValue({});

      await manager.executeSyncJob({
        configName: 'oracle-fusion',
        jobType: 'sync_workorders',
      });

      expect(mockPrisma.integrationLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            operation: 'sync_workorders',
            status: 'SUCCESS',
          }),
        })
      );
    });

    it('should throw error if adapter not found', async () => {
      mockPrisma.integrationConfig.findUnique.mockResolvedValue(null);

      await expect(
        manager.executeSyncJob({
          configName: 'non-existent',
          jobType: 'sync_items',
        })
      ).rejects.toThrow('Adapter not found: non-existent');
    });

    it('should throw error if config not found', async () => {
      mockPrisma.integrationConfig.findUnique.mockResolvedValue(null);

      await expect(
        manager.executeSyncJob({
          configName: 'oracle-fusion',
          jobType: 'sync_items',
        })
      ).rejects.toThrow('Adapter not found: oracle-fusion');
    });

    it('should handle partial sync failures', async () => {
      const partialFailureAdapter = {
        syncItems: vi.fn().mockResolvedValue({
          success: false,
          recordsProcessed: 10,
          recordsCreated: 5,
          recordsUpdated: 2,
          recordsFailed: 3,
          errors: [{ error: 'Some items failed' }],
          duration: 1500,
        }),
        syncBOMs: vi.fn(),
        getHealthStatus: vi.fn(),
      };

      // We need to inject the partial failure adapter
      mockPrisma.integrationConfig.findUnique
        .mockResolvedValueOnce(mockOracleFusionConfig)
        .mockResolvedValueOnce(mockOracleFusionConfig)
        .mockResolvedValueOnce(mockOracleFusionConfig);

      mockPrisma.integrationConfig.update.mockResolvedValue({});
      mockPrisma.integrationLog.create.mockResolvedValue({});

      // Create a new manager with the partial failure adapter
      const testManager = new IntegrationManager(mockPrisma);
      (testManager as any).adapters.set('config-fusion', partialFailureAdapter);

      await testManager.executeSyncJob({
        configName: 'oracle-fusion',
        jobType: 'sync_items',
      });

      expect(mockPrisma.integrationLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PARTIAL',
            errorCount: 3,
          }),
        })
      );
    });

    it('should log failure on exception', async () => {
      mockPrisma.integrationConfig.findUnique
        .mockResolvedValueOnce(mockOracleFusionConfig)
        .mockResolvedValueOnce(mockOracleFusionConfig)
        .mockResolvedValueOnce(mockOracleFusionConfig);

      const errorAdapter = {
        syncItems: vi.fn().mockRejectedValue(new Error('Connection timeout')),
        syncBOMs: vi.fn(),
        getHealthStatus: vi.fn(),
      };

      const testManager = new IntegrationManager(mockPrisma);
      (testManager as any).adapters.set('config-fusion', errorAdapter);

      mockPrisma.integrationConfig.update.mockResolvedValue({});
      mockPrisma.integrationLog.create.mockResolvedValue({});

      await expect(
        testManager.executeSyncJob({
          configName: 'oracle-fusion',
          jobType: 'sync_items',
        })
      ).rejects.toThrow('Connection timeout');

      expect(mockPrisma.integrationLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'FAILURE',
            errorCount: 1,
          }),
        })
      );

      expect(mockPrisma.integrationConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lastSyncStatus: 'FAILURE',
            lastError: 'Connection timeout',
          }),
        })
      );
    });
  });

  describe('runHealthCheck', () => {
    it('should update config on successful health check', async () => {
      mockPrisma.integrationConfig.findUnique
        .mockResolvedValueOnce(mockOracleFusionConfig)
        .mockResolvedValueOnce(mockOracleFusionConfig);

      mockPrisma.integrationConfig.update.mockResolvedValue({});

      // Load adapter first
      await manager['loadAdapter'](mockOracleFusionConfig.id);

      await manager.runHealthCheck(mockOracleFusionConfig.id);

      expect(mockPrisma.integrationConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'config-fusion' },
          data: expect.objectContaining({
            lastError: null,
            errorCount: 0,
          }),
        })
      );
    });

    it('should update config on failed health check', async () => {
      const failedHealthAdapter = {
        syncItems: vi.fn(),
        syncBOMs: vi.fn(),
        getHealthStatus: vi.fn().mockResolvedValue({
          connected: false,
          responseTime: 0,
          error: 'Connection refused',
        }),
      };

      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockOracleFusionConfig);
      mockPrisma.integrationConfig.update.mockResolvedValue({});

      const testManager = new IntegrationManager(mockPrisma);
      (testManager as any).adapters.set('config-fusion', failedHealthAdapter);

      await testManager.runHealthCheck('config-fusion');

      expect(mockPrisma.integrationConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'config-fusion' },
          data: expect.objectContaining({
            lastError: 'Connection refused',
            errorCount: 1,
          }),
        })
      );
    });

    it('should handle adapter not loaded', async () => {
      await manager.runHealthCheck('non-existent-adapter');

      // Should return without throwing
      expect(mockPrisma.integrationConfig.update).not.toHaveBeenCalled();
    });
  });

  describe('getAllHealthStatus', () => {
    it('should return health status for all integrations', async () => {
      mockPrisma.integrationConfig.findMany.mockResolvedValue([
        mockOracleFusionConfig,
        mockTeamcenterConfig,
      ]);

      mockPrisma.integrationConfig.findUnique
        .mockResolvedValueOnce(mockOracleFusionConfig)
        .mockResolvedValueOnce(mockTeamcenterConfig);

      // Load adapters
      await manager['loadAdapter'](mockOracleFusionConfig.id);
      await manager['loadAdapter'](mockTeamcenterConfig.id);

      const healthStatuses = await manager.getAllHealthStatus();

      expect(healthStatuses).toHaveLength(2);
      expect(healthStatuses[0]).toMatchObject({
        configId: 'config-fusion',
        name: 'Oracle Fusion Cloud',
        type: 'ERP',
        enabled: true,
        connected: true,
      });
      expect(healthStatuses[1]).toMatchObject({
        configId: 'config-tc',
        name: 'Siemens Teamcenter',
        type: 'PLM',
        enabled: true,
        connected: true,
      });
    });

    it('should show disconnected status for adapters with errors', async () => {
      const failedAdapter = {
        syncItems: vi.fn(),
        syncBOMs: vi.fn(),
        getHealthStatus: vi.fn().mockRejectedValue(new Error('Connection error')),
      };

      mockPrisma.integrationConfig.findMany.mockResolvedValue([mockOracleFusionConfig]);

      const testManager = new IntegrationManager(mockPrisma);
      (testManager as any).adapters.set('config-fusion', failedAdapter);

      const healthStatuses = await testManager.getAllHealthStatus();

      expect(healthStatuses[0].connected).toBe(false);
    });

    it('should calculate success rate correctly', async () => {
      const configWithStats = {
        ...mockOracleFusionConfig,
        totalSyncs: 100,
        successCount: 95,
        failureCount: 5,
      };

      mockPrisma.integrationConfig.findMany.mockResolvedValue([configWithStats]);

      const healthStatuses = await manager.getAllHealthStatus();

      expect(healthStatuses[0].statistics.successRate).toBe(95);
    });
  });

  describe('stopAllJobs', () => {
    it('should stop all scheduled jobs', () => {
      const mockCronTask = { stop: vi.fn() };

      (manager as any).jobs.set('job-1', {
        id: 'job-1',
        cronTask: mockCronTask,
      });

      (manager as any).jobs.set('job-2', {
        id: 'job-2',
        cronTask: mockCronTask,
      });

      manager.stopAllJobs();

      expect(mockCronTask.stop).toHaveBeenCalledTimes(2);
      expect((manager as any).jobs.size).toBe(0);
    });
  });

  describe('encryptConfig / decryptConfig', () => {
    it('should encrypt and decrypt config correctly', () => {
      const originalConfig = {
        baseUrl: 'https://example.com',
        username: 'testuser',
        password: 'testpass',
      };

      const encrypted = manager.encryptConfig(originalConfig);
      const decrypted = manager.decryptConfig(encrypted);

      expect(decrypted).toEqual(originalConfig);
    });

    it('should return object as-is if already decrypted', () => {
      const config = { baseUrl: 'https://example.com' };

      const result = manager.decryptConfig(config);

      expect(result).toEqual(config);
    });

    it('should produce different encrypted values each time', () => {
      const config = { baseUrl: 'https://example.com' };

      const encrypted1 = manager.encryptConfig(config);
      const encrypted2 = manager.encryptConfig(config);

      // IV is random, so encrypted strings should differ
      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to the same value
      expect(manager.decryptConfig(encrypted1)).toEqual(config);
      expect(manager.decryptConfig(encrypted2)).toEqual(config);
    });
  });

  describe('adapter loading for different types', () => {
    it('should load Oracle EBS adapter', async () => {
      const ebsConfig = {
        ...mockOracleFusionConfig,
        id: 'config-ebs',
        name: 'oracle-ebs',
        displayName: 'Oracle E-Business Suite',
      };

      mockPrisma.integrationConfig.findUnique.mockResolvedValue(ebsConfig);

      await manager['loadAdapter'](ebsConfig.id);

      expect(manager.getAdapter(ebsConfig.id)).toBeDefined();
    });

    it('should load Teamcenter adapter for PLM type', async () => {
      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockTeamcenterConfig);

      await manager['loadAdapter'](mockTeamcenterConfig.id);

      expect(manager.getAdapter(mockTeamcenterConfig.id)).toBeDefined();
    });

    it('should throw error for unsupported integration type', async () => {
      const unsupportedConfig = {
        ...mockOracleFusionConfig,
        type: 'UNSUPPORTED' as any,
      };

      mockPrisma.integrationConfig.findUnique.mockResolvedValue(unsupportedConfig);

      await expect(manager['loadAdapter']('config-unsupported')).rejects.toThrow(
        'Unsupported integration type: UNSUPPORTED'
      );
    });

    it('should throw error for unknown ERP system', async () => {
      const unknownERPConfig = {
        ...mockOracleFusionConfig,
        name: 'unknown-erp-system',
      };

      mockPrisma.integrationConfig.findUnique.mockResolvedValue(unknownERPConfig);

      await expect(manager['loadAdapter']('config-unknown')).rejects.toThrow(
        'Unknown ERP type for config: unknown-erp-system'
      );
    });
  });
});
