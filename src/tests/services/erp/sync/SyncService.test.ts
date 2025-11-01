/**
 * Sync Service Unit Tests
 * Issue #60: Phase 15 - Bi-directional Real-time Sync
 */

import { describe, it, expect, beforeEach } from 'vitest';
import SyncService, { SyncDirection, SyncStatus } from '../../../../services/erp/sync/SyncService';

describe('SyncService', () => {
  let syncService: SyncService;

  beforeEach(() => {
    syncService = new SyncService();
  });

  describe('syncData', () => {
    it('should sync data when no conflicts', async () => {
      const sourceData = { id: '1', name: 'Item 1', quantity: 100 };
      const targetData = { id: '1', name: 'Item 1', quantity: 100 };

      const syncOp = await syncService.syncData(
        'erp-1',
        'Product',
        'prod-1',
        sourceData,
        targetData,
        SyncDirection.ERP_TO_MES
      );

      expect(syncOp.id).toBeDefined();
      expect(syncOp.status).toBe(SyncStatus.COMPLETED);
      expect(syncOp.integrationId).toBe('erp-1');
      expect(syncOp.entityType).toBe('Product');
      expect(syncOp.recordsSucceeded).toBe(1);
    });

    it('should detect conflicts when data differs', async () => {
      const sourceData = { id: '1', name: 'Item 1', quantity: 100 };
      const targetData = { id: '1', name: 'Item 1', quantity: 50 };

      const syncOp = await syncService.syncData(
        'erp-1',
        'Product',
        'prod-1',
        sourceData,
        targetData,
        SyncDirection.ERP_TO_MES
      );

      expect(syncOp.status).toBe(SyncStatus.CONFLICT);
      expect(syncOp.recordsConflicted).toBe(1);
      expect(syncOp.conflictDetails).toBeDefined();
    });

    it('should force sync when forceSync is true', async () => {
      const sourceData = { id: '1', name: 'Item 1', quantity: 100 };
      const targetData = { id: '1', name: 'Item 1', quantity: 50 };

      const syncOp = await syncService.syncData(
        'erp-1',
        'Product',
        'prod-1',
        sourceData,
        targetData,
        SyncDirection.ERP_TO_MES,
        { forceSync: true }
      );

      expect(syncOp.status).toBe(SyncStatus.COMPLETED);
      expect(syncOp.recordsSucceeded).toBe(1);
    });

    it('should detect changed fields', async () => {
      const sourceData = { id: '1', name: 'Updated Item', quantity: 100, price: 99.99 };
      const targetData = { id: '1', name: 'Item 1', quantity: 100, price: 99.99 };

      const syncOp = await syncService.syncData(
        'erp-1',
        'Product',
        'prod-1',
        sourceData,
        targetData,
        SyncDirection.ERP_TO_MES
      );

      expect(syncOp.changedFields).toContain('name');
      expect(syncOp.changedFields.length).toBe(1);
    });

    it('should support MES_TO_ERP direction', async () => {
      const sourceData = { id: '1', name: 'Item 1', quantity: 100 };
      const targetData = { id: '1', name: 'Item 1', quantity: 100 };

      const syncOp = await syncService.syncData(
        'erp-1',
        'Product',
        'prod-1',
        sourceData,
        targetData,
        SyncDirection.MES_TO_ERP
      );

      expect(syncOp.sourceSystem).toBe('MES');
      expect(syncOp.targetSystem).toBe('ERP');
    });
  });

  describe('batchSync', () => {
    it('should sync multiple records', async () => {
      const records = [
        {
          entityId: 'prod-1',
          sourceData: { id: '1', name: 'Item 1', quantity: 100 },
          targetData: { id: '1', name: 'Item 1', quantity: 100 },
        },
        {
          entityId: 'prod-2',
          sourceData: { id: '2', name: 'Item 2', quantity: 50 },
          targetData: { id: '2', name: 'Item 2', quantity: 50 },
        },
      ];

      const batchOp = await syncService.batchSync('erp-1', 'Product', records);

      expect(batchOp.recordsProcessed).toBe(2);
      expect(batchOp.recordsSucceeded).toBeGreaterThan(0);
    });

    it('should handle partial failures in batch', async () => {
      const records = [
        {
          entityId: 'prod-1',
          sourceData: { id: '1', name: 'Item 1', quantity: 100 },
          targetData: { id: '1', name: 'Item 1', quantity: 100 },
        },
        {
          entityId: 'prod-2',
          sourceData: { id: '2', name: 'Item 2', quantity: 50 },
          targetData: { id: '2', name: 'Item 2', quantity: 75 },
        },
      ];

      const batchOp = await syncService.batchSync('erp-1', 'Product', records);

      expect(batchOp.recordsProcessed).toBe(2);
      expect(batchOp.recordsConflicted).toBeGreaterThan(0);
    });
  });

  describe('getSyncStatus', () => {
    it('should return sync operation status', async () => {
      const syncOp = await syncService.syncData(
        'erp-1',
        'Product',
        'prod-1',
        { id: '1', name: 'Item 1' },
        { id: '1', name: 'Item 1' }
      );

      const retrieved = await syncService.getSyncStatus(syncOp.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(syncOp.id);
      expect(retrieved?.status).toBe(SyncStatus.COMPLETED);
    });

    it('should return null for non-existent operation', async () => {
      const retrieved = await syncService.getSyncStatus('non-existent');

      expect(retrieved).toBeNull();
    });
  });

  describe('getSyncOperations', () => {
    beforeEach(async () => {
      await syncService.syncData(
        'erp-1',
        'Product',
        'prod-1',
        { id: '1', name: 'Item 1' },
        { id: '1', name: 'Item 1' }
      );
      await syncService.syncData(
        'erp-1',
        'Order',
        'order-1',
        { id: '2', name: 'Order 1' },
        { id: '2', name: 'Order 1' }
      );
      await syncService.syncData(
        'erp-2',
        'Product',
        'prod-2',
        { id: '3', name: 'Item 3' },
        { id: '3', name: 'Item 3' }
      );
    });

    it('should list all sync operations', async () => {
      const { operations, total } = await syncService.getSyncOperations();

      expect(operations.length).toBeGreaterThan(0);
      expect(total).toBe(3);
    });

    it('should filter by integrationId', async () => {
      const { operations } = await syncService.getSyncOperations({ integrationId: 'erp-1' });

      expect(operations.every((o) => o.integrationId === 'erp-1')).toBe(true);
      expect(operations.length).toBe(2);
    });

    it('should filter by entityType', async () => {
      const { operations } = await syncService.getSyncOperations({ entityType: 'Product' });

      expect(operations.every((o) => o.entityType === 'Product')).toBe(true);
    });

    it('should support pagination', async () => {
      const { operations: page1, total } = await syncService.getSyncOperations({ limit: 2, offset: 0 });

      expect(page1.length).toBeLessThanOrEqual(2);
      expect(total).toBe(3);
    });
  });

  describe('getSyncStatistics', () => {
    beforeEach(async () => {
      for (let i = 0; i < 5; i++) {
        await syncService.syncData(
          'erp-1',
          'Product',
          `prod-${i}`,
          { id: String(i), name: `Item ${i}` },
          { id: String(i), name: `Item ${i}` }
        );
      }
    });

    it('should return sync statistics', async () => {
      const stats = await syncService.getSyncStatistics();

      expect(stats.totalSyncs).toBeGreaterThan(0);
      expect(stats.successfulSyncs).toBeGreaterThan(0);
      expect(stats.successRate).toBeGreaterThan(0);
    });

    it('should provide sync status breakdown', async () => {
      const stats = await syncService.getSyncStatistics();

      expect(stats.syncsByStatus).toBeDefined();
      expect(Object.keys(stats.syncsByStatus).length).toBeGreaterThan(0);
    });

    it('should filter by integrationId', async () => {
      const stats = await syncService.getSyncStatistics({ integrationId: 'erp-1' });

      expect(stats.totalSyncs).toBeGreaterThan(0);
    });
  });

  describe('retrySyncOperation', () => {
    it('should retry a failed sync operation', async () => {
      const syncOp = await syncService.syncData(
        'erp-1',
        'Product',
        'prod-1',
        { id: '1', name: 'Item 1', quantity: 100 },
        { id: '1', name: 'Item 1', quantity: 50 }
      );

      expect(syncOp.status).toBe(SyncStatus.CONFLICT);

      // When retrying a conflict, it will either remain CONFLICT or resolve to COMPLETED
      // depending on the forceSync flag
      const retried = await syncService.retrySyncOperation(syncOp.id);

      expect(retried).toBeDefined();
      expect([SyncStatus.CONFLICT, SyncStatus.COMPLETED]).toContain(retried?.status);
    });
  });
});
