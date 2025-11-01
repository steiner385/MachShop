/**
 * BaseSyncJob - Unit Tests
 * Tests for abstract base sync job class
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BaseSyncJob, SyncJobData, SyncJobResult } from '../../../services/erp/jobs/BaseSyncJob';
import { PrismaClient } from '@prisma/client';
import ERPIntegrationService from '../../../services/erp/ERPIntegrationService';

// Mock Prisma and logger
vi.mock('../../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Create a concrete implementation for testing
class TestSyncJob extends BaseSyncJob {
  getJobName(): string {
    return 'TestSync';
  }

  getTransactionType(): string {
    return 'TEST_SYNC';
  }

  getEntityType(): string {
    return 'TestEntity';
  }

  async executeSync(data: SyncJobData): Promise<SyncJobResult> {
    return {
      success: true,
      processedCount: 10,
      failedCount: 0,
      skippedCount: 0,
      errors: [],
      duration: 0,
      message: 'Test completed successfully',
    };
  }
}

describe('BaseSyncJob', () => {
  let syncJob: TestSyncJob;
  let mockPrisma: any;
  let mockERPService: any;

  beforeEach(() => {
    // Mock Prisma
    mockPrisma = {
      erpIntegration: {
        findUnique: vi.fn(),
      },
      erpSyncTransaction: {
        create: vi.fn(),
      },
      $disconnect: vi.fn(),
    };

    // Mock ERP Service
    mockERPService = {
      logSyncTransaction: vi.fn(),
      transformToERP: vi.fn(),
      getFieldMappings: vi.fn(),
    };

    syncJob = new TestSyncJob(mockPrisma, mockERPService);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('handle', () => {
    it('should successfully handle a sync job', async () => {
      const mockIntegration = {
        id: 'integration-1',
        name: 'Test ERP',
        enabled: true,
      };

      mockPrisma.erpIntegration.findUnique.mockResolvedValue(mockIntegration);
      mockERPService.logSyncTransaction.mockResolvedValue({});

      const data: SyncJobData = {
        integrationId: 'integration-1',
        entityType: 'TestEntity',
      };

      const result = await syncJob.handle(data);

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(10);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle disabled integration', async () => {
      const mockIntegration = {
        id: 'integration-1',
        name: 'Test ERP',
        enabled: false,
      };

      mockPrisma.erpIntegration.findUnique.mockResolvedValue(mockIntegration);

      const data: SyncJobData = {
        integrationId: 'integration-1',
        entityType: 'TestEntity',
      };

      const result = await syncJob.handle(data);

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual({
        id: 'integration-1',
        error: 'Integration disabled',
      });
    });

    it('should handle missing integration', async () => {
      mockPrisma.erpIntegration.findUnique.mockResolvedValue(null);

      const data: SyncJobData = {
        integrationId: 'nonexistent',
        entityType: 'TestEntity',
      };

      const result = await syncJob.handle(data);

      expect(result.success).toBe(false);
      expect(result.errors[0].error).toContain('not found');
    });

    it('should catch and return error from executeSync', async () => {
      const mockIntegration = {
        id: 'integration-1',
        name: 'Test ERP',
        enabled: true,
      };

      mockPrisma.erpIntegration.findUnique.mockResolvedValue(mockIntegration);

      // Create a job that throws an error
      class ErrorSyncJob extends BaseSyncJob {
        getJobName(): string {
          return 'ErrorSync';
        }

        getTransactionType(): string {
          return 'ERROR_SYNC';
        }

        getEntityType(): string {
          return 'ErrorEntity';
        }

        async executeSync(): Promise<SyncJobResult> {
          throw new Error('Test error');
        }
      }

      const errorJob = new ErrorSyncJob(mockPrisma, mockERPService);
      mockERPService.logSyncTransaction.mockResolvedValue({});

      const data: SyncJobData = {
        integrationId: 'integration-1',
        entityType: 'ErrorEntity',
      };

      const result = await errorJob.handle(data);

      expect(result.success).toBe(false);
      expect(result.errors[0].error).toContain('Test error');
    });
  });

  describe('getters', () => {
    it('should return correct job name', () => {
      expect(syncJob.getJobName()).toBe('TestSync');
    });

    it('should return correct transaction type', () => {
      expect(syncJob.getTransactionType()).toBe('TEST_SYNC');
    });

    it('should return correct entity type', () => {
      expect(syncJob.getEntityType()).toBe('TestEntity');
    });
  });
});
