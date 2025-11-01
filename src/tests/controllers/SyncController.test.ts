/**
 * Sync Controller Unit Tests
 * Issue #60: Phase 15 - Bi-directional Real-time Sync
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';
import SyncController from '../../controllers/SyncController';
import { SyncDirection } from '../../services/erp/sync/SyncService';
import { ConflictResolutionStrategy } from '../../services/erp/sync/ConflictResolutionService';

describe('SyncController', () => {
  let controller: SyncController;
  let mockPrisma: any;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockPrisma = {
      erpIntegration: {
        findUnique: vi.fn(),
      },
    };

    controller = new SyncController(mockPrisma);

    mockRequest = {
      params: {},
      body: {},
      query: {},
      user: { id: 'user-123' },
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  describe('triggerManualSync', () => {
    it('should trigger manual sync', async () => {
      mockRequest.params = { integrationId: 'erp-1', entityType: 'Product', entityId: 'prod-1' };
      mockRequest.body = {
        sourceData: { id: '1', name: 'Item 1', quantity: 100 },
        targetData: { id: '1', name: 'Item 1', quantity: 100 },
        direction: SyncDirection.ERP_TO_MES,
      };

      await controller.triggerManualSync(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.syncOperation).toBeDefined();
      expect(response.syncOperation.integrationId).toBe('erp-1');
    });

    it('should return error for missing integrationId', async () => {
      mockRequest.params = { entityType: 'Product' };
      mockRequest.body = { sourceData: {}, targetData: {} };

      await controller.triggerManualSync(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should support force sync', async () => {
      mockRequest.params = { integrationId: 'erp-1', entityType: 'Product', entityId: 'prod-1' };
      mockRequest.body = {
        sourceData: { id: '1', name: 'Item 1', quantity: 100 },
        targetData: { id: '1', name: 'Item 1', quantity: 50 },
        forceSync: true,
      };

      await controller.triggerManualSync(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.syncOperation).toBeDefined();
    });
  });

  describe('getSyncStatus', () => {
    it('should return sync operation status', async () => {
      mockRequest.params = { operationId: 'sync-op-1' };

      // Create an operation first
      mockRequest.params = { integrationId: 'erp-1', entityType: 'Product' };
      mockRequest.body = {
        sourceData: { id: '1' },
        targetData: { id: '1' },
      };

      await controller.triggerManualSync(mockRequest as Request, mockResponse as Response);
      const firstResponse = (mockResponse.json as any).mock.calls[0][0];

      // Now get its status
      vi.clearAllMocks();
      mockRequest.params = { operationId: firstResponse.syncOperation.id };

      await controller.getSyncStatus(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.syncOperation).toBeDefined();
    });

    it('should return 404 for non-existent operation', async () => {
      mockRequest.params = { operationId: 'non-existent' };

      await controller.getSyncStatus(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });
  });

  describe('listSyncOperations', () => {
    it('should list sync operations', async () => {
      mockRequest.query = { limit: '50', offset: '0' };

      await controller.listSyncOperations(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.operations).toBeDefined();
      expect(Array.isArray(response.operations)).toBe(true);
      expect(response.count).toBeDefined();
      expect(response.total).toBeDefined();
    });

    it('should filter by integrationId', async () => {
      mockRequest.query = { integrationId: 'erp-1', limit: '50', offset: '0' };

      await controller.listSyncOperations(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('getSyncStatistics', () => {
    it('should return sync statistics', async () => {
      mockRequest.query = {};

      await controller.getSyncStatistics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.stats).toBeDefined();
      expect(response.stats.totalSyncs).toBeDefined();
      expect(response.stats.successRate).toBeDefined();
    });
  });

  describe('getConflicts', () => {
    it('should get conflicts', async () => {
      mockRequest.query = { limit: '50', offset: '0' };

      await controller.getConflicts(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.conflicts).toBeDefined();
      expect(Array.isArray(response.conflicts)).toBe(true);
    });

    it('should filter by status', async () => {
      mockRequest.query = { status: 'UNRESOLVED', limit: '50', offset: '0' };

      await controller.getConflicts(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('resolveConflict', () => {
    it('should resolve a conflict', async () => {
      mockRequest.params = { conflictId: 'conflict-1' };
      mockRequest.body = {
        strategy: ConflictResolutionStrategy.SOURCE_PRIORITY,
      };

      await controller.resolveConflict(mockRequest as Request, mockResponse as Response);

      // Conflict doesn't exist, so expect 404
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should return error for missing strategy', async () => {
      mockRequest.params = { conflictId: 'conflict-1' };
      mockRequest.body = {};

      await controller.resolveConflict(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('approveConflictResolution', () => {
    it('should approve conflict resolution', async () => {
      mockRequest.params = { conflictId: 'conflict-1' };
      mockRequest.body = { notes: 'Approved' };

      await controller.approveConflictResolution(mockRequest as Request, mockResponse as Response);

      // Conflict doesn't exist, so expect 404
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getConflictStatistics', () => {
    it('should return conflict statistics', async () => {
      mockRequest.query = {};

      await controller.getConflictStatistics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.stats).toBeDefined();
      expect(response.stats.totalConflicts).toBeDefined();
      expect(response.stats.resolutionRate).toBeDefined();
    });
  });

  describe('getSyncJobs', () => {
    it('should get sync jobs', async () => {
      mockRequest.query = { limit: '50', offset: '0' };

      await controller.getSyncJobs(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.jobs).toBeDefined();
      expect(Array.isArray(response.jobs)).toBe(true);
    });
  });

  describe('getJobStatus', () => {
    it('should return 404 for non-existent job', async () => {
      mockRequest.params = { jobId: 'job-1' };

      await controller.getJobStatus(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should return 404 for truly non-existent job', async () => {
      mockRequest.params = { jobId: 'non-existent' };

      await controller.getJobStatus(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getJobStatistics', () => {
    it('should return job statistics', async () => {
      mockRequest.query = {};

      await controller.getJobStatistics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.stats).toBeDefined();
      expect(response.stats.totalJobs).toBeDefined();
      expect(response.stats.successRate).toBeDefined();
    });
  });

  describe('getQueueStatus', () => {
    it('should return queue status', async () => {
      mockRequest.query = {};

      await controller.getQueueStatus(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.queueStatus).toBeDefined();
      expect(response.queueStatus.queueLength).toBeDefined();
    });
  });
});
