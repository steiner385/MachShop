/**
 * Sync Jobs - Unit Tests
 * Tests for SupplierSyncJob, PurchaseOrderSyncJob, CostSyncJob, etc.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SupplierSyncJob } from '../../../services/erp/jobs/SupplierSyncJob';
import { PurchaseOrderSyncJob } from '../../../services/erp/jobs/PurchaseOrderSyncJob';
import { CostSyncJob } from '../../../services/erp/jobs/CostSyncJob';
import { ShipmentNotificationJob } from '../../../services/erp/jobs/ShipmentNotificationJob';
import { InventoryTransactionJob } from '../../../services/erp/jobs/InventoryTransactionJob';
import { SyncJobData, SyncJobResult } from '../../../services/erp/jobs/BaseSyncJob';

// Mock logger
vi.mock('../../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('SupplierSyncJob', () => {
  let syncJob: SupplierSyncJob;
  let mockPrisma: any;
  let mockERPService: any;

  beforeEach(() => {
    mockPrisma = {
      vendor: {
        upsert: vi.fn(),
      },
      erpSupplierSync: {
        upsert: vi.fn(),
      },
      erpIntegration: {
        findUnique: vi.fn(),
      },
      erpSyncTransaction: {
        create: vi.fn(),
      },
      $disconnect: vi.fn(),
    };

    mockERPService = {
      getFieldMappings: vi.fn(),
      transformToERP: vi.fn(),
      logSyncTransaction: vi.fn(),
    };

    syncJob = new SupplierSyncJob(mockPrisma, mockERPService);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('executeSync', () => {
    it('should sync suppliers successfully', async () => {
      const data: SyncJobData = {
        integrationId: 'integration-1',
        entityType: 'Supplier',
      };

      mockERPService.logSyncTransaction.mockResolvedValue({});
      mockPrisma.vendor.upsert.mockResolvedValue({});
      mockPrisma.erpSupplierSync.upsert.mockResolvedValue({});

      const result = await syncJob.executeSync(data);

      expect(result.success).toBe(true);
      expect(result.processedCount).toBeGreaterThanOrEqual(0);
    });

    it('should handle dry run mode', async () => {
      const data: SyncJobData = {
        integrationId: 'integration-1',
        entityType: 'Supplier',
        dryRun: true,
      };

      mockERPService.logSyncTransaction.mockResolvedValue({});

      const result = await syncJob.executeSync(data);

      expect(result.success).toBe(true);
      // In dry run mode, no database writes should occur
      expect(mockPrisma.vendor.upsert).not.toHaveBeenCalled();
    });
  });

  describe('getters', () => {
    it('should return correct job name', () => {
      expect(syncJob.getJobName()).toBe('SupplierSync');
    });

    it('should return correct transaction type', () => {
      expect(syncJob.getTransactionType()).toBe('SUPPLIER_SYNC');
    });

    it('should return correct entity type', () => {
      expect(syncJob.getEntityType()).toBe('Supplier');
    });
  });
});

describe('PurchaseOrderSyncJob', () => {
  let syncJob: PurchaseOrderSyncJob;
  let mockPrisma: any;
  let mockERPService: any;

  beforeEach(() => {
    mockPrisma = {
      erpPurchaseOrderSync: {
        upsert: vi.fn(),
      },
      erpIntegration: {
        findUnique: vi.fn(),
      },
      erpSyncTransaction: {
        create: vi.fn(),
      },
      $disconnect: vi.fn(),
    };

    mockERPService = {
      getFieldMappings: vi.fn(),
      transformToERP: vi.fn(),
      logSyncTransaction: vi.fn(),
    };

    syncJob = new PurchaseOrderSyncJob(mockPrisma, mockERPService);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('executeSync', () => {
    it('should sync POs outbound by default', async () => {
      const data: SyncJobData = {
        integrationId: 'integration-1',
        entityType: 'PurchaseOrder',
      };

      mockERPService.logSyncTransaction.mockResolvedValue({});
      mockPrisma.erpPurchaseOrderSync.upsert.mockResolvedValue({});

      const result = await syncJob.executeSync(data);

      expect(result.success).toBe(true);
    });

    it('should handle inbound direction', async () => {
      const data: SyncJobData = {
        integrationId: 'integration-1',
        entityType: 'PurchaseOrder',
        filters: {
          direction: 'INBOUND',
        },
      };

      mockERPService.logSyncTransaction.mockResolvedValue({});

      const result = await syncJob.executeSync(data);

      expect(result.success).toBe(true);
    });
  });

  describe('getters', () => {
    it('should return correct job name', () => {
      expect(syncJob.getJobName()).toBe('PurchaseOrderSync');
    });

    it('should return correct transaction type', () => {
      expect(syncJob.getTransactionType()).toBe('PO_CREATE');
    });

    it('should return correct entity type', () => {
      expect(syncJob.getEntityType()).toBe('PurchaseOrder');
    });
  });
});

describe('CostSyncJob', () => {
  let syncJob: CostSyncJob;
  let mockPrisma: any;
  let mockERPService: any;

  beforeEach(() => {
    mockPrisma = {
      oSPOperation: {
        findMany: vi.fn(),
      },
      erpCostSync: {
        upsert: vi.fn(),
      },
      erpIntegration: {
        findUnique: vi.fn(),
      },
      erpSyncTransaction: {
        create: vi.fn(),
      },
      $disconnect: vi.fn(),
    };

    mockERPService = {
      getFieldMappings: vi.fn(),
      transformToERP: vi.fn(),
      logSyncTransaction: vi.fn(),
    };

    syncJob = new CostSyncJob(mockPrisma, mockERPService);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('executeSync', () => {
    it('should sync costs successfully', async () => {
      const data: SyncJobData = {
        integrationId: 'integration-1',
        entityType: 'Cost',
      };

      mockPrisma.oSPOperation.findMany.mockResolvedValue([]);
      mockERPService.logSyncTransaction.mockResolvedValue({});

      const result = await syncJob.executeSync(data);

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(0);
    });

    it('should process batch of costs', async () => {
      const mockOSPOps = [
        {
          id: 'osp-1',
          ospNumber: 'OSP-2024-00001',
          estimatedCost: 1000,
          actualCost: 950,
        },
        {
          id: 'osp-2',
          ospNumber: 'OSP-2024-00002',
          estimatedCost: 2000,
          actualCost: 2100,
        },
      ];

      const data: SyncJobData = {
        integrationId: 'integration-1',
        entityType: 'Cost',
      };

      mockPrisma.oSPOperation.findMany.mockResolvedValue(mockOSPOps);
      mockERPService.logSyncTransaction.mockResolvedValue({});
      mockPrisma.erpCostSync.upsert.mockResolvedValue({});

      const result = await syncJob.executeSync(data);

      expect(result.processedCount).toBe(2);
      expect(mockPrisma.erpCostSync.upsert).toHaveBeenCalledTimes(2);
    });
  });

  describe('getters', () => {
    it('should return correct job name', () => {
      expect(syncJob.getJobName()).toBe('CostSync');
    });

    it('should return correct transaction type', () => {
      expect(syncJob.getTransactionType()).toBe('COST_SYNC');
    });

    it('should return correct entity type', () => {
      expect(syncJob.getEntityType()).toBe('Cost');
    });
  });
});

describe('ShipmentNotificationJob', () => {
  let syncJob: ShipmentNotificationJob;
  let mockPrisma: any;
  let mockERPService: any;

  beforeEach(() => {
    mockPrisma = {
      oSPShipment: {
        findMany: vi.fn(),
      },
      erpShipmentNotification: {
        upsert: vi.fn(),
      },
      erpIntegration: {
        findUnique: vi.fn(),
      },
      erpSyncTransaction: {
        create: vi.fn(),
      },
      $disconnect: vi.fn(),
    };

    mockERPService = {
      getFieldMappings: vi.fn(),
      transformToERP: vi.fn(),
      logSyncTransaction: vi.fn(),
    };

    syncJob = new ShipmentNotificationJob(mockPrisma, mockERPService);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('executeSync', () => {
    it('should notify shipments successfully', async () => {
      const data: SyncJobData = {
        integrationId: 'integration-1',
        entityType: 'Shipment',
      };

      mockPrisma.oSPShipment.findMany.mockResolvedValue([]);
      mockERPService.logSyncTransaction.mockResolvedValue({});

      const result = await syncJob.executeSync(data);

      expect(result.success).toBe(true);
    });

    it('should filter by shipment type', async () => {
      const data: SyncJobData = {
        integrationId: 'integration-1',
        entityType: 'Shipment',
        filters: {
          shipmentType: 'TO_SUPPLIER',
        },
      };

      mockPrisma.oSPShipment.findMany.mockResolvedValue([]);
      mockERPService.logSyncTransaction.mockResolvedValue({});

      const result = await syncJob.executeSync(data);

      expect(result.success).toBe(true);
      expect(mockPrisma.oSPShipment.findMany).toHaveBeenCalled();
    });
  });

  describe('getters', () => {
    it('should return correct job name', () => {
      expect(syncJob.getJobName()).toBe('ShipmentNotification');
    });

    it('should return correct transaction type', () => {
      expect(syncJob.getTransactionType()).toBe('SHIPMENT_NOTIFICATION');
    });

    it('should return correct entity type', () => {
      expect(syncJob.getEntityType()).toBe('Shipment');
    });
  });
});

describe('InventoryTransactionJob', () => {
  let syncJob: InventoryTransactionJob;
  let mockPrisma: any;
  let mockERPService: any;

  beforeEach(() => {
    mockPrisma = {
      inventoryTransaction: {
        findMany: vi.fn(),
      },
      erpInventorySync: {
        upsert: vi.fn(),
      },
      erpIntegration: {
        findUnique: vi.fn(),
      },
      erpSyncTransaction: {
        create: vi.fn(),
      },
      $disconnect: vi.fn(),
    };

    mockERPService = {
      getFieldMappings: vi.fn(),
      transformToERP: vi.fn(),
      logSyncTransaction: vi.fn(),
    };

    syncJob = new InventoryTransactionJob(mockPrisma, mockERPService);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('executeSync', () => {
    it('should post inventory transactions successfully', async () => {
      const data: SyncJobData = {
        integrationId: 'integration-1',
        entityType: 'InventoryTransaction',
      };

      mockPrisma.inventoryTransaction.findMany.mockResolvedValue([]);
      mockERPService.logSyncTransaction.mockResolvedValue({});

      const result = await syncJob.executeSync(data);

      expect(result.success).toBe(true);
    });

    it('should filter by transaction type', async () => {
      const data: SyncJobData = {
        integrationId: 'integration-1',
        entityType: 'InventoryTransaction',
        filters: {
          transactionType: 'CONSIGNMENT_RECEIPT',
        },
      };

      mockPrisma.inventoryTransaction.findMany.mockResolvedValue([]);
      mockERPService.logSyncTransaction.mockResolvedValue({});

      const result = await syncJob.executeSync(data);

      expect(result.success).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      const mockTransactions = [
        {
          id: 'trans-1',
          transactionNumber: 'TXN-001',
          type: 'CONSIGNMENT_RECEIPT',
          quantity: 100,
        },
      ];

      const data: SyncJobData = {
        integrationId: 'integration-1',
        entityType: 'InventoryTransaction',
      };

      mockPrisma.inventoryTransaction.findMany.mockResolvedValue(mockTransactions);
      mockERPService.logSyncTransaction.mockResolvedValue({});
      mockPrisma.erpInventorySync.upsert.mockRejectedValue(
        new Error('Database error')
      );

      const result = await syncJob.executeSync(data);

      expect(result.failedCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Database error');
    });
  });

  describe('getters', () => {
    it('should return correct job name', () => {
      expect(syncJob.getJobName()).toBe('InventoryTransaction');
    });

    it('should return correct transaction type', () => {
      expect(syncJob.getTransactionType()).toBe('INVENTORY_TRANSACTION');
    });

    it('should return correct entity type', () => {
      expect(syncJob.getEntityType()).toBe('InventoryTransaction');
    });
  });
});
