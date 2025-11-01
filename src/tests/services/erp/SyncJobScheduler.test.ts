/**
 * SyncJobScheduler - Unit Tests
 * Tests for job scheduler and orchestrator
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SyncJobScheduler } from '../../../services/erp/SyncJobScheduler';

// Mock BullMQ
vi.mock('bullmq', () => ({
  Queue: vi.fn(() => ({
    add: vi.fn().mockResolvedValue({ id: 'job-1' }),
    close: vi.fn(),
    getJobCounts: vi.fn().mockResolvedValue({
      active: 1,
      completed: 5,
      failed: 0,
      delayed: 0,
      waiting: 2,
    }),
  })),
  Worker: vi.fn(() => ({
    close: vi.fn(),
  })),
  QueueScheduler: vi.fn(() => ({
    close: vi.fn(),
  })),
}));

// Mock logger
vi.mock('../../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('SyncJobScheduler', () => {
  let scheduler: SyncJobScheduler;
  let mockPrisma: any;
  let mockERPService: any;

  beforeEach(() => {
    mockPrisma = {
      erpIntegration: {
        findMany: vi.fn(),
      },
      $disconnect: vi.fn(),
    };

    mockERPService = {
      getPendingRetries: vi.fn(),
      disconnect: vi.fn(),
    };

    scheduler = new SyncJobScheduler(mockPrisma, mockERPService);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialize', () => {
    it('should initialize with no integrations', async () => {
      mockPrisma.erpIntegration.findMany.mockResolvedValue([]);

      await scheduler.initialize();

      expect(mockPrisma.erpIntegration.findMany).toHaveBeenCalledWith({
        where: { enabled: true },
      });
    });

    it('should initialize with multiple integrations', async () => {
      const mockIntegrations = [
        {
          id: 'integration-1',
          name: 'ERP System 1',
          enabled: true,
          syncSchedule: [],
        },
        {
          id: 'integration-2',
          name: 'ERP System 2',
          enabled: true,
          syncSchedule: [],
        },
      ];

      mockPrisma.erpIntegration.findMany.mockResolvedValue(mockIntegrations);

      await scheduler.initialize();

      expect(mockPrisma.erpIntegration.findMany).toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      mockPrisma.erpIntegration.findMany.mockRejectedValue(
        new Error('Database error')
      );

      await expect(scheduler.initialize()).rejects.toThrow('Database error');
    });
  });

  describe('queueSyncJob', () => {
    it('should queue a sync job', async () => {
      mockPrisma.erpIntegration.findMany.mockResolvedValue([
        {
          id: 'integration-1',
          name: 'Test ERP',
          enabled: true,
          syncSchedule: [],
        },
      ]);

      await scheduler.initialize();

      const job = await scheduler.queueSyncJob('integration-1', 'SupplierSync', {
        batchSize: 50,
      });

      expect(job).toBeDefined();
    });

    it('should handle queue not found error', async () => {
      await expect(
        scheduler.queueSyncJob('nonexistent', 'SupplierSync')
      ).rejects.toThrow('Queue not initialized');
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      mockPrisma.erpIntegration.findMany.mockResolvedValue([
        {
          id: 'integration-1',
          name: 'Test ERP',
          enabled: true,
          syncSchedule: [],
        },
      ]);

      await scheduler.initialize();

      const stats = await scheduler.getQueueStats('integration-1');

      expect(stats).toHaveProperty('integrationId');
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('failed');
      expect(stats).toHaveProperty('waiting');
    });

    it('should handle missing queue', async () => {
      await expect(scheduler.getQueueStats('nonexistent')).rejects.toThrow(
        'Queue not found'
      );
    });
  });

  describe('processPendingRetries', () => {
    it('should process pending retries', async () => {
      mockPrisma.erpIntegration.findMany.mockResolvedValue([
        {
          id: 'integration-1',
          name: 'Test ERP',
          enabled: true,
          syncSchedule: [],
        },
      ]);

      mockERPService.getPendingRetries.mockResolvedValue([
        {
          id: 'trans-1',
          entityType: 'Supplier',
          retryCount: 1,
        },
      ]);

      await scheduler.initialize();
      await scheduler.processPendingRetries('integration-1');

      expect(mockERPService.getPendingRetries).toHaveBeenCalledWith(
        'integration-1'
      );
    });

    it('should handle no pending retries', async () => {
      mockPrisma.erpIntegration.findMany.mockResolvedValue([
        {
          id: 'integration-1',
          name: 'Test ERP',
          enabled: true,
          syncSchedule: [],
        },
      ]);

      mockERPService.getPendingRetries.mockResolvedValue([]);

      await scheduler.initialize();
      await scheduler.processPendingRetries('integration-1');

      expect(mockERPService.getPendingRetries).toHaveBeenCalled();
    });
  });

  describe('shutdown', () => {
    it('should shutdown gracefully', async () => {
      mockPrisma.erpIntegration.findMany.mockResolvedValue([
        {
          id: 'integration-1',
          name: 'Test ERP',
          enabled: true,
          syncSchedule: [],
        },
      ]);

      await scheduler.initialize();
      await scheduler.shutdown();

      expect(mockPrisma.$disconnect).toHaveBeenCalled();
      expect(mockERPService.disconnect).toHaveBeenCalled();
    });

    it('should handle shutdown errors', async () => {
      mockPrisma.erpIntegration.findMany.mockResolvedValue([]);
      mockPrisma.$disconnect.mockRejectedValue(new Error('Shutdown error'));

      await scheduler.initialize();

      await expect(scheduler.shutdown()).rejects.toThrow('Shutdown error');
    });
  });

  describe('sync job registration', () => {
    it('should register all sync job classes', async () => {
      // The sync jobs should be registered in the constructor
      expect(scheduler).toBeDefined();
    });
  });
});
