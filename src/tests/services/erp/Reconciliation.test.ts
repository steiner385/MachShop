/**
 * Reconciliation Services - Unit Tests
 * Tests for ReconciliationService and entity reconciliation implementations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ReconciliationService,
  EntityReconciliation,
} from '../../../services/erp/reconciliation/ReconciliationService';
import { SupplierReconciliation } from '../../../services/erp/reconciliation/SupplierReconciliation';
import { POReconciliation } from '../../../services/erp/reconciliation/POReconciliation';
import { InventoryReconciliation } from '../../../services/erp/reconciliation/InventoryReconciliation';

// Mock logger
vi.mock('../../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('ReconciliationService', () => {
  let reconciliationService: ReconciliationService;
  let mockPrisma: any;
  let mockERPService: any;

  beforeEach(() => {
    mockPrisma = {
      erpReconciliationReport: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      erpReconciliationDiscrepancy: {
        createMany: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      $disconnect: vi.fn(),
    };

    mockERPService = {
      disconnect: vi.fn(),
    };

    reconciliationService = new ReconciliationService(mockPrisma, mockERPService);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('registration', () => {
    it('should register entity reconciliation', () => {
      const mockReconciliation = {
        getEntityType: () => 'TestEntity',
      } as any;

      reconciliationService.registerEntityReconciliation('TestEntity', mockReconciliation);

      expect(reconciliationService).toBeDefined();
    });
  });

  describe('reconcile', () => {
    it('should execute reconciliation for registered entity type', async () => {
      const mockReconciliation = {
        getEntityType: () => 'TestEntity',
        reconcile: vi.fn().mockResolvedValue({
          integrationId: 'integration-1',
          entityType: 'TestEntity',
          status: 'COMPLETED',
          totalRecords: 100,
          matchedRecords: 95,
          discrepancyCount: 5,
          discrepancies: [],
        }),
      } as any;

      reconciliationService.registerEntityReconciliation('TestEntity', mockReconciliation);

      mockPrisma.erpReconciliationReport.create.mockResolvedValue({
        id: 'report-1',
      });

      const report = await reconciliationService.reconcile('integration-1', 'TestEntity');

      expect(report).toBeDefined();
      expect(report?.status).toBe('COMPLETED');
      expect(report?.discrepancyCount).toBe(5);
    });

    it('should return null for unregistered entity type', async () => {
      const report = await reconciliationService.reconcile('integration-1', 'UnknownEntity');

      expect(report).toBeNull();
    });
  });

  describe('reconcileAll', () => {
    it('should execute reconciliation for all registered entities', async () => {
      const mockSupplierReconciliation = {
        getEntityType: () => 'Supplier',
        reconcile: vi.fn().mockResolvedValue({
          integrationId: 'integration-1',
          entityType: 'Supplier',
          status: 'COMPLETED',
          totalRecords: 50,
          matchedRecords: 48,
          discrepancyCount: 2,
          discrepancies: [],
        }),
      } as any;

      const mockPOReconciliation = {
        getEntityType: () => 'PurchaseOrder',
        reconcile: vi.fn().mockResolvedValue({
          integrationId: 'integration-1',
          entityType: 'PurchaseOrder',
          status: 'COMPLETED',
          totalRecords: 200,
          matchedRecords: 195,
          discrepancyCount: 5,
          discrepancies: [],
        }),
      } as any;

      reconciliationService.registerEntityReconciliation('Supplier', mockSupplierReconciliation);
      reconciliationService.registerEntityReconciliation('PurchaseOrder', mockPOReconciliation);

      mockPrisma.erpReconciliationReport.create.mockResolvedValue({ id: 'report-1' });

      const reports = await reconciliationService.reconcileAll('integration-1');

      expect(reports).toHaveLength(2);
      expect(reports[0].entityType).toBe('Supplier');
      expect(reports[1].entityType).toBe('PurchaseOrder');
    });
  });

  describe('getPendingDiscrepancies', () => {
    it('should fetch pending discrepancies', async () => {
      const mockDiscrepancies = [
        {
          id: 'disc-1',
          entityType: 'Supplier',
          entityId: 'supplier-1',
          fieldName: 'name',
          severity: 'MEDIUM',
          correctionStatus: 'PENDING',
        },
      ];

      mockPrisma.erpReconciliationDiscrepancy.findMany.mockResolvedValue(
        mockDiscrepancies
      );

      const discrepancies = await reconciliationService.getPendingDiscrepancies(
        'integration-1'
      );

      expect(discrepancies).toHaveLength(1);
      expect(discrepancies[0].correctionStatus).toBe('PENDING');
    });
  });

  describe('applyCorrection', () => {
    it('should apply correction to discrepancy', async () => {
      mockPrisma.erpReconciliationDiscrepancy.findUnique.mockResolvedValue({
        id: 'disc-1',
        entityId: 'supplier-1',
      });

      mockPrisma.erpReconciliationDiscrepancy.update.mockResolvedValue({
        id: 'disc-1',
        correctionStatus: 'APPLIED',
      });

      await reconciliationService.applyCorrection('disc-1', 'UPDATE_MES');

      expect(mockPrisma.erpReconciliationDiscrepancy.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'disc-1' },
          data: expect.objectContaining({
            correctionStatus: 'APPLIED',
          }),
        })
      );
    });

    it('should handle missing discrepancy', async () => {
      mockPrisma.erpReconciliationDiscrepancy.findUnique.mockResolvedValue(null);

      await expect(
        reconciliationService.applyCorrection('nonexistent', 'UPDATE_MES')
      ).rejects.toThrow('not found');
    });
  });

  describe('disconnect', () => {
    it('should disconnect and cleanup', async () => {
      await reconciliationService.disconnect();

      expect(mockERPService.disconnect).toHaveBeenCalled();
      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });
  });
});

describe('SupplierReconciliation', () => {
  let reconciliation: SupplierReconciliation;
  let mockPrisma: any;
  let mockERPService: any;

  beforeEach(() => {
    mockPrisma = {
      vendor: {
        findMany: vi.fn(),
      },
      erpSupplierSync: {
        findMany: vi.fn(),
      },
      erpReconciliationReport: {
        create: vi.fn(),
      },
      erpReconciliationDiscrepancy: {
        createMany: vi.fn(),
      },
      $disconnect: vi.fn(),
    };

    mockERPService = {
      getFieldMappings: vi.fn(),
      disconnect: vi.fn(),
    };

    reconciliation = new SupplierReconciliation(mockPrisma, mockERPService);
    vi.clearAllMocks();
  });

  describe('reconcile', () => {
    it('should detect missing suppliers in ERP', async () => {
      mockPrisma.vendor.findMany.mockResolvedValue([
        {
          id: 'supplier-1',
          code: 'SUPP001',
          name: 'Supplier One',
          address: '123 Main St',
          approvedStatus: true,
        },
      ]);

      mockPrisma.erpSupplierSync.findMany.mockResolvedValue([]);

      mockPrisma.erpReconciliationReport.create.mockResolvedValue({ id: 'report-1' });
      mockPrisma.erpReconciliationDiscrepancy.createMany.mockResolvedValue({
        count: 1,
      });

      const report = await reconciliation.reconcile('integration-1');

      expect(report.status).toBe('COMPLETED');
      expect(report.discrepancyCount).toBeGreaterThan(0);
    });

    it('should detect supplier name mismatches', async () => {
      const mesSupplier = {
        id: 'supplier-1',
        code: 'SUPP001',
        name: 'MES Supplier Name',
        address: '123 Main St',
        approvedStatus: true,
      };

      const erpSupplier = {
        id: 'SUPP001',
        code: 'SUPP001',
        name: 'ERP Supplier Name',
        data: { name: 'ERP Supplier Name' },
      };

      const discrepancies = await reconciliation.compareRecords(
        mesSupplier,
        erpSupplier,
        'integration-1'
      );

      expect(discrepancies.length).toBeGreaterThan(0);
      expect(discrepancies[0].fieldName).toBe('name');
      expect(discrepancies[0].discrepancyType).toBe('VALUE_MISMATCH');
    });

    it('should detect approval status mismatches', async () => {
      const mesSupplier = {
        id: 'supplier-1',
        code: 'SUPP001',
        name: 'Supplier',
        approvedStatus: true,
      };

      const erpSupplier = {
        id: 'SUPP001',
        code: 'SUPP001',
        name: 'Supplier',
        data: { approved: false },
      };

      const discrepancies = await reconciliation.compareRecords(
        mesSupplier,
        erpSupplier,
        'integration-1'
      );

      const approvalDiscrepancy = discrepancies.find((d) => d.fieldName === 'approvedStatus');
      expect(approvalDiscrepancy).toBeDefined();
      expect(approvalDiscrepancy?.severity).toBe('HIGH');
      expect(approvalDiscrepancy?.correctionRequired).toBe(true);
    });
  });
});

describe('POReconciliation', () => {
  let reconciliation: POReconciliation;
  let mockPrisma: any;
  let mockERPService: any;

  beforeEach(() => {
    mockPrisma = {
      purchaseOrder: {
        findMany: vi.fn(),
      },
      erpPurchaseOrderSync: {
        findMany: vi.fn(),
      },
      erpReconciliationReport: {
        create: vi.fn(),
      },
      erpReconciliationDiscrepancy: {
        createMany: vi.fn(),
      },
      $disconnect: vi.fn(),
    };

    mockERPService = {
      disconnect: vi.fn(),
    };

    reconciliation = new POReconciliation(mockPrisma, mockERPService);
    vi.clearAllMocks();
  });

  describe('compareRecords', () => {
    it('should detect status mismatches', async () => {
      const mesPO = {
        poNumber: 'PO-001',
        status: 'DRAFT',
        totalAmount: 1000,
      };

      const erpPO = {
        id: 'PO-001',
        poNumber: 'PO-001',
        data: { status: 'APPROVED' },
      };

      const discrepancies = await reconciliation.compareRecords(mesPO, erpPO, 'integration-1');

      const statusDiscrepancy = discrepancies.find((d) => d.fieldName === 'status');
      expect(statusDiscrepancy).toBeDefined();
      expect(statusDiscrepancy?.severity).toBe('HIGH');
    });

    it('should detect quantity variances', async () => {
      const mesPO = {
        poNumber: 'PO-001',
        status: 'APPROVED',
        quantity: 100,
      };

      const erpPO = {
        id: 'PO-001',
        poNumber: 'PO-001',
        data: { status: 'APPROVED', quantity: 95 },
      };

      const discrepancies = await reconciliation.compareRecords(mesPO, erpPO, 'integration-1');

      const qtyDiscrepancy = discrepancies.find((d) => d.fieldName === 'quantity');
      expect(qtyDiscrepancy).toBeDefined();
      expect(qtyDiscrepancy?.discrepancyType).toBe('QUANTITY_VARIANCE');
    });

    it('should detect amount variances with percent threshold', async () => {
      const mesPO = {
        poNumber: 'PO-001',
        status: 'APPROVED',
        totalAmount: 1000,
      };

      const erpPO = {
        id: 'PO-001',
        poNumber: 'PO-001',
        data: { status: 'APPROVED', totalAmount: 1020 }, // 2% variance
      };

      const discrepancies = await reconciliation.compareRecords(mesPO, erpPO, 'integration-1');

      const amountDiscrepancy = discrepancies.find((d) => d.fieldName === 'totalAmount');
      expect(amountDiscrepancy).toBeDefined();
      expect(amountDiscrepancy?.severity).toBe('HIGH'); // >1% is HIGH
    });
  });
});

describe('InventoryReconciliation', () => {
  let reconciliation: InventoryReconciliation;
  let mockPrisma: any;
  let mockERPService: any;

  beforeEach(() => {
    mockPrisma = {
      material: {
        findMany: vi.fn(),
      },
      erpInventorySync: {
        findMany: vi.fn(),
      },
      erpReconciliationReport: {
        create: vi.fn(),
      },
      erpReconciliationDiscrepancy: {
        createMany: vi.fn(),
      },
      $disconnect: vi.fn(),
    };

    mockERPService = {
      disconnect: vi.fn(),
    };

    reconciliation = new InventoryReconciliation(mockPrisma, mockERPService);
    vi.clearAllMocks();
  });

  describe('compareRecords', () => {
    it('should detect on-hand quantity variances', async () => {
      const mesInventory = {
        materialId: 'MAT-001',
        location: 'MES',
        onHandQuantity: 100,
        reservedQuantity: 0,
        consignmentQuantity: 0,
        totalValue: 1000,
      };

      const erpInventory = {
        materialId: 'MAT-001',
        location: 'ERP',
        onHandQuantity: 95,
        reservedQuantity: 0,
        consignmentQuantity: 0,
        totalValue: 950,
      };

      const discrepancies = await reconciliation.compareRecords(
        mesInventory,
        erpInventory,
        'integration-1'
      );

      const qtyDiscrepancy = discrepancies.find((d) => d.fieldName === 'onHandQuantity');
      expect(qtyDiscrepancy).toBeDefined();
      expect(qtyDiscrepancy?.discrepancyType).toBe('QUANTITY_VARIANCE');
      expect(qtyDiscrepancy?.correctionRequired).toBe(true);
    });

    it('should detect consignment quantity mismatches', async () => {
      const mesInventory = {
        materialId: 'MAT-001',
        location: 'MES',
        onHandQuantity: 100,
        reservedQuantity: 0,
        consignmentQuantity: 50,
        totalValue: 1000,
      };

      const erpInventory = {
        materialId: 'MAT-001',
        location: 'ERP',
        onHandQuantity: 100,
        reservedQuantity: 0,
        consignmentQuantity: 40,
        totalValue: 1000,
      };

      const discrepancies = await reconciliation.compareRecords(
        mesInventory,
        erpInventory,
        'integration-1'
      );

      const consignmentDiscrepancy = discrepancies.find(
        (d) => d.fieldName === 'consignmentQuantity'
      );
      expect(consignmentDiscrepancy).toBeDefined();
      expect(consignmentDiscrepancy?.severity).toBe('HIGH');
    });

    it('should detect inventory value variances', async () => {
      const mesInventory = {
        materialId: 'MAT-001',
        location: 'MES',
        onHandQuantity: 100,
        reservedQuantity: 0,
        consignmentQuantity: 0,
        totalValue: 1000,
      };

      const erpInventory = {
        materialId: 'MAT-001',
        location: 'ERP',
        onHandQuantity: 100,
        reservedQuantity: 0,
        consignmentQuantity: 0,
        totalValue: 990, // 1% variance
      };

      const discrepancies = await reconciliation.compareRecords(
        mesInventory,
        erpInventory,
        'integration-1'
      );

      const valueDiscrepancy = discrepancies.find((d) => d.fieldName === 'totalValue');
      expect(valueDiscrepancy).toBeDefined();
      expect(valueDiscrepancy?.discrepancyType).toBe('VALUE_MISMATCH');
    });
  });
});
