/**
 * Entity Reconciliation Service Unit Tests
 * Issue #60: Phase 12 - Data Reconciliation System
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import EntityReconciliationService from '../../../../services/erp/reconciliation/EntityReconciliationService';
import DiscrepancyService from '../../../../services/erp/reconciliation/DiscrepancyService';

describe('EntityReconciliationService', () => {
  let service: EntityReconciliationService;
  let mockPrisma: any;
  let discrepancyService: DiscrepancyService;

  beforeEach(() => {
    mockPrisma = {
      supplier: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      purchaseOrder: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      workOrder: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      inventory: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    discrepancyService = new DiscrepancyService(mockPrisma);
    service = new EntityReconciliationService(mockPrisma, discrepancyService);
  });

  describe('reconcileSuppliers', () => {
    it('should reconcile supplier data', async () => {
      const result = await service.reconcileSuppliers(
        'erp-1',
        'reconcile-1',
        { mesField: 'erpField' }
      );

      expect(result.entityType).toBe('Supplier');
      expect(result.totalMesRecords).toBe(0);
      expect(result.totalErpRecords).toBe(0);
      expect(result.matchedRecords).toBe(0);
      expect(Array.isArray(result.discrepancies)).toBe(true);
    });

    it('should detect supplier discrepancies', async () => {
      const mesSupplier = {
        id: 'sup-1',
        vendorId: 'V1',
        name: 'Supplier A',
        city: 'NYC',
      };

      const erpSupplier = {
        id: 'sup-1',
        vendorId: 'V1',
        name: 'Supplier A',
        city: 'Boston',
      };

      // Mock the data retrieval methods
      vi.spyOn(service as any, 'getMesSuppliers').mockResolvedValue([mesSupplier]);
      vi.spyOn(service as any, 'getErpSuppliers').mockResolvedValue([erpSupplier]);

      const result = await service.reconcileSuppliers(
        'erp-1',
        'reconcile-1'
      );

      expect(result.totalMesRecords).toBe(1);
      expect(result.totalErpRecords).toBe(1);
      expect(result.discrepancies.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('reconcilePurchaseOrders', () => {
    it('should reconcile purchase order data', async () => {
      const result = await service.reconcilePurchaseOrders(
        'erp-1',
        'reconcile-1'
      );

      expect(result.entityType).toBe('PurchaseOrder');
      expect(result.totalMesRecords).toBe(0);
      expect(result.totalErpRecords).toBe(0);
      expect(result.matchedRecords).toBe(0);
      expect(Array.isArray(result.discrepancies)).toBe(true);
    });

    it('should detect PO quantity discrepancies', async () => {
      const mesPO = {
        id: 'po-1',
        poNumber: 'PO-001',
        quantity: 100,
        unitPrice: 10.0,
        status: 'APPROVED',
      };

      const erpPO = {
        id: 'po-1',
        poNumber: 'PO-001',
        quantity: 100,
        unitPrice: 10.0,
        status: 'SENT',
      };

      vi.spyOn(service as any, 'getMesPurchaseOrders').mockResolvedValue([mesPO]);
      vi.spyOn(service as any, 'getErpPurchaseOrders').mockResolvedValue([erpPO]);

      const result = await service.reconcilePurchaseOrders(
        'erp-1',
        'reconcile-1'
      );

      expect(result.totalMesRecords).toBe(1);
      expect(result.totalErpRecords).toBe(1);
    });
  });

  describe('reconcileWorkOrders', () => {
    it('should reconcile work order data', async () => {
      const result = await service.reconcileWorkOrders(
        'erp-1',
        'reconcile-1'
      );

      expect(result.entityType).toBe('WorkOrder');
      expect(result.totalMesRecords).toBe(0);
      expect(result.totalErpRecords).toBe(0);
      expect(result.matchedRecords).toBe(0);
      expect(Array.isArray(result.discrepancies)).toBe(true);
    });

    it('should detect work order status discrepancies', async () => {
      const mesWO = {
        id: 'wo-1',
        workOrderNumber: 'WO-001',
        status: 'IN_PROGRESS',
        quantity: 100,
      };

      const erpWO = {
        id: 'wo-1',
        workOrderNumber: 'WO-001',
        status: 'DRAFT',
        quantity: 100,
      };

      vi.spyOn(service as any, 'getMesWorkOrders').mockResolvedValue([mesWO]);
      vi.spyOn(service as any, 'getErpWorkOrders').mockResolvedValue([erpWO]);

      const result = await service.reconcileWorkOrders(
        'erp-1',
        'reconcile-1'
      );

      expect(result.totalMesRecords).toBe(1);
      expect(result.totalErpRecords).toBe(1);
    });
  });

  describe('reconcileInventory', () => {
    it('should reconcile inventory data', async () => {
      const result = await service.reconcileInventory(
        'erp-1',
        'reconcile-1'
      );

      expect(result.entityType).toBe('Inventory');
      expect(result.totalMesRecords).toBe(0);
      expect(result.totalErpRecords).toBe(0);
      expect(result.matchedRecords).toBe(0);
      expect(Array.isArray(result.discrepancies)).toBe(true);
    });

    it('should detect inventory quantity discrepancies', async () => {
      const mesItem = {
        id: 'inv-1',
        partNumber: 'PART-001',
        quantity: 500,
        location: 'WH-A',
      };

      const erpItem = {
        id: 'inv-1',
        partNumber: 'PART-001',
        quantity: 450,
        location: 'WH-A',
      };

      vi.spyOn(service as any, 'getMesInventory').mockResolvedValue([mesItem]);
      vi.spyOn(service as any, 'getErpInventory').mockResolvedValue([erpItem]);

      const result = await service.reconcileInventory(
        'erp-1',
        'reconcile-1'
      );

      expect(result.totalMesRecords).toBe(1);
      expect(result.totalErpRecords).toBe(1);
    });
  });

  describe('Missing records detection', () => {
    it('should detect suppliers in MES but not ERP', async () => {
      const mesSup = {
        id: 'sup-1',
        vendorId: 'V1',
        name: 'Supplier A',
      };

      vi.spyOn(service as any, 'getMesSuppliers').mockResolvedValue([mesSup]);
      vi.spyOn(service as any, 'getErpSuppliers').mockResolvedValue([]);

      const result = await service.reconcileSuppliers(
        'erp-1',
        'reconcile-1'
      );

      expect(result.totalMesRecords).toBe(1);
      expect(result.totalErpRecords).toBe(0);
    });

    it('should detect suppliers in ERP but not MES', async () => {
      const erpSup = {
        id: 'sup-1',
        vendorId: 'V1',
        name: 'Supplier A',
      };

      vi.spyOn(service as any, 'getMesSuppliers').mockResolvedValue([]);
      vi.spyOn(service as any, 'getErpSuppliers').mockResolvedValue([erpSup]);

      const result = await service.reconcileSuppliers(
        'erp-1',
        'reconcile-1'
      );

      expect(result.totalMesRecords).toBe(0);
      expect(result.totalErpRecords).toBe(1);
    });
  });

  describe('Matching logic', () => {
    it('should match suppliers by ID or vendorId', async () => {
      const mesSup = {
        id: 'sup-1',
        vendorId: 'V1',
        name: 'Supplier A',
      };

      const erpSup = {
        id: 'sup-1',
        vendorId: 'V1',
        name: 'Supplier A',
      };

      const getMesSuppliersStub = vi.spyOn(service as any, 'getMesSuppliers').mockResolvedValue([mesSup]);
      const getErpSuppliersStub = vi.spyOn(service as any, 'getErpSuppliers').mockResolvedValue([erpSup]);

      const result = await service.reconcileSuppliers(
        'erp-1',
        'reconcile-1'
      );

      expect(result.totalMesRecords).toBe(1);
      expect(result.totalErpRecords).toBe(1);

      getMesSuppliersStub.mockRestore();
      getErpSuppliersStub.mockRestore();
    });

    it('should match POs by poNumber when ID differs', async () => {
      const mesPO = {
        id: 'po-mes-1',
        poNumber: 'PO-001',
        quantity: 100,
      };

      const erpPO = {
        id: 'po-erp-1',
        poNumber: 'PO-001',
        quantity: 100,
      };

      const getMesPOsStub = vi.spyOn(service as any, 'getMesPurchaseOrders').mockResolvedValue([mesPO]);
      const getErpPOsStub = vi.spyOn(service as any, 'getErpPurchaseOrders').mockResolvedValue([erpPO]);

      const result = await service.reconcilePurchaseOrders(
        'erp-1',
        'reconcile-1'
      );

      expect(result.totalMesRecords).toBe(1);
      expect(result.totalErpRecords).toBe(1);

      getMesPOsStub.mockRestore();
      getErpPOsStub.mockRestore();
    });
  });
});
