/**
 * Discrepancy Service Unit Tests
 * Issue #60: Phase 12 - Data Reconciliation System
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import DiscrepancyService, { DiscrepancySeverity, DiscrepancyStatus } from '../../../../services/erp/reconciliation/DiscrepancyService';

describe('DiscrepancyService', () => {
  let service: DiscrepancyService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      erpIntegration: {
        findUnique: vi.fn(),
      },
    };

    service = new DiscrepancyService(mockPrisma);
  });

  describe('detectDiscrepancies', () => {
    it('should detect field differences', async () => {
      const mesData = { name: 'Supplier A', vendorId: 'V123', status: 'active' };
      const erpData = { name: 'Supplier A', vendorId: 'V123', status: 'inactive' };

      const discrepancies = await service.detectDiscrepancies(
        'reconcile-1',
        'Supplier',
        'sup-1',
        mesData,
        erpData
      );

      expect(discrepancies).toHaveLength(1);
      expect(discrepancies[0].field).toBe('status');
      expect(discrepancies[0].mesValue).toBe('active');
      expect(discrepancies[0].erpValue).toBe('inactive');
      expect(discrepancies[0].status).toBe(DiscrepancyStatus.DETECTED);
    });

    it('should ignore matching fields', async () => {
      const mesData = { name: 'Supplier A', vendorId: 'V123' };
      const erpData = { name: 'Supplier A', vendorId: 'V123' };

      const discrepancies = await service.detectDiscrepancies(
        'reconcile-1',
        'Supplier',
        'sup-1',
        mesData,
        erpData
      );

      expect(discrepancies).toHaveLength(0);
    });

    it('should handle null/undefined values', async () => {
      const mesData = { name: 'Supplier A', city: null };
      const erpData = { name: 'Supplier A', city: 'New York' };

      const discrepancies = await service.detectDiscrepancies(
        'reconcile-1',
        'Supplier',
        'sup-1',
        mesData,
        erpData
      );

      expect(discrepancies).toHaveLength(1);
      expect(discrepancies[0].mesValue).toBe(null);
      expect(discrepancies[0].erpValue).toBe('New York');
    });

    it('should handle string whitespace differences', async () => {
      const mesData = { name: '  Supplier A  ' };
      const erpData = { name: 'Supplier A' };

      const discrepancies = await service.detectDiscrepancies(
        'reconcile-1',
        'Supplier',
        'sup-1',
        mesData,
        erpData
      );

      expect(discrepancies).toHaveLength(0);
    });

    it('should handle numeric tolerance', async () => {
      const mesData = { quantity: 100.0 };
      const erpData = { quantity: 100.005 };

      const discrepancies = await service.detectDiscrepancies(
        'reconcile-1',
        'PurchaseOrder',
        'po-1',
        mesData,
        erpData
      );

      expect(discrepancies).toHaveLength(0);
    });

    it('should detect numeric differences exceeding tolerance', async () => {
      const mesData = { quantity: 100.0 };
      const erpData = { quantity: 105.0 };

      const discrepancies = await service.detectDiscrepancies(
        'reconcile-1',
        'PurchaseOrder',
        'po-1',
        mesData,
        erpData
      );

      expect(discrepancies).toHaveLength(1);
      expect(discrepancies[0].difference).toContain('%');
    });

    it('should handle date differences with tolerance', async () => {
      const date1 = new Date('2025-01-01T12:00:00Z');
      const date2 = new Date('2025-01-01T12:00:00.500Z');

      const mesData = { createdDate: date1 };
      const erpData = { createdDate: date2 };

      const discrepancies = await service.detectDiscrepancies(
        'reconcile-1',
        'PurchaseOrder',
        'po-1',
        mesData,
        erpData
      );

      expect(discrepancies).toHaveLength(0);
    });

    it('should detect array differences', async () => {
      const mesData = { items: [1, 2, 3] };
      const erpData = { items: [1, 2, 4] };

      const discrepancies = await service.detectDiscrepancies(
        'reconcile-1',
        'PurchaseOrder',
        'po-1',
        mesData,
        erpData
      );

      expect(discrepancies).toHaveLength(1);
    });
  });

  describe('calculateSeverity', () => {
    it('should mark critical fields as HIGH severity', async () => {
      const mesData = { quantity: 100 };
      const erpData = { quantity: 200 };

      const discrepancies = await service.detectDiscrepancies(
        'reconcile-1',
        'PurchaseOrder',
        'po-1',
        mesData,
        erpData
      );

      expect(discrepancies[0].severity).toBe(DiscrepancySeverity.HIGH);
    });

    it('should mark status fields as HIGH severity for critical entities', async () => {
      const mesData = { status: 'DRAFT' };
      const erpData = { status: 'APPROVED' };

      const discrepancies = await service.detectDiscrepancies(
        'reconcile-1',
        'PurchaseOrder',
        'po-1',
        mesData,
        erpData
      );

      // Status is a critical field for PurchaseOrder, so marked as HIGH
      expect(discrepancies[0].severity).toBe(DiscrepancySeverity.HIGH);
    });

    it('should mark non-critical fields as LOW severity', async () => {
      const mesData = { notes: 'Old note' };
      const erpData = { notes: 'New note' };

      const discrepancies = await service.detectDiscrepancies(
        'reconcile-1',
        'PurchaseOrder',
        'po-1',
        mesData,
        erpData
      );

      expect(discrepancies[0].severity).toBe(DiscrepancySeverity.LOW);
    });

    it('should mark large percentage differences as HIGH for financial fields', async () => {
      const mesData = { unitPrice: 100 };
      const erpData = { unitPrice: 150 };

      const discrepancies = await service.detectDiscrepancies(
        'reconcile-1',
        'PurchaseOrder',
        'po-1',
        mesData,
        erpData
      );

      // unitPrice is a financial field, so marked as HIGH
      expect(discrepancies[0].severity).toBe(DiscrepancySeverity.HIGH);
    });
  });

  describe('suggestResolution', () => {
    it('should suggest SYNC_CORRECTION when MES is missing value', () => {
      const discrepancy = {
        id: 'disc-1',
        reconciliationId: 'rec-1',
        entityType: 'Supplier',
        entityId: 'sup-1',
        field: 'city',
        mesValue: null,
        erpValue: 'New York',
        difference: 'MES null vs ERP New York',
        severity: DiscrepancySeverity.MEDIUM,
        status: DiscrepancyStatus.DETECTED,
        description: 'city differs',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const suggestion = service.suggestResolution(discrepancy);

      expect(suggestion.suggestedType).toBe('SYNC_CORRECTION');
      expect(suggestion.recommendedValue).toBe('New York');
    });

    it('should suggest SYNC_CORRECTION for master data discrepancies', () => {
      const discrepancy = {
        id: 'disc-1',
        reconciliationId: 'rec-1',
        entityType: 'Supplier',
        entityId: 'sup-1',
        field: 'name',
        mesValue: 'Old Name',
        erpValue: 'New Name',
        difference: 'ERP New Name vs MES Old Name',
        severity: DiscrepancySeverity.MEDIUM,
        status: DiscrepancyStatus.DETECTED,
        description: 'name differs',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const suggestion = service.suggestResolution(discrepancy);

      expect(suggestion.suggestedType).toBe('SYNC_CORRECTION');
    });

    it('should suggest MANUAL_CORRECTION for high severity', () => {
      const discrepancy = {
        id: 'disc-1',
        reconciliationId: 'rec-1',
        entityType: 'PurchaseOrder',
        entityId: 'po-1',
        field: 'quantity',
        mesValue: 100,
        erpValue: 200,
        difference: 'ERP 200 vs MES 100 (100% difference)',
        severity: DiscrepancySeverity.HIGH,
        status: DiscrepancyStatus.DETECTED,
        description: 'quantity differs',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const suggestion = service.suggestResolution(discrepancy);

      expect(suggestion.suggestedType).toBe('MANUAL_CORRECTION');
    });

    it('should suggest ACKNOWLEDGED_DIFFERENCE for low severity', () => {
      const discrepancy = {
        id: 'disc-1',
        reconciliationId: 'rec-1',
        entityType: 'PurchaseOrder',
        entityId: 'po-1',
        field: 'notes',
        mesValue: 'Old',
        erpValue: 'New',
        difference: 'ERP New vs MES Old',
        severity: DiscrepancySeverity.LOW,
        status: DiscrepancyStatus.DETECTED,
        description: 'notes differs',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const suggestion = service.suggestResolution(discrepancy);

      expect(suggestion.suggestedType).toBe('ACKNOWLEDGED_DIFFERENCE');
    });
  });

  describe('getSummary', () => {
    it('should summarize discrepancies by severity', async () => {
      const mesData = { field1: 'a', field2: 'x', field3: 'p' };
      const erpData = { field1: 'b', field2: 'y', field3: 'q' };

      const discrepancies = await service.detectDiscrepancies(
        'reconcile-1',
        'PurchaseOrder',
        'po-1',
        mesData,
        erpData
      );

      const summary = await service.getSummary(discrepancies);

      expect(summary.total).toBe(3);
      expect(summary.bySeverity).toHaveProperty(DiscrepancySeverity.LOW);
      expect(summary.bySeverity).toHaveProperty(DiscrepancySeverity.MEDIUM);
      expect(summary.bySeverity).toHaveProperty(DiscrepancySeverity.HIGH);
    });

    it('should count discrepancies requiring action', async () => {
      const mesData = { quantity: 100, status: 'draft', notes: 'test' };
      const erpData = { quantity: 200, status: 'approved', notes: 'updated' };

      const discrepancies = await service.detectDiscrepancies(
        'reconcile-1',
        'PurchaseOrder',
        'po-1',
        mesData,
        erpData
      );

      const summary = await service.getSummary(discrepancies);

      expect(summary.requiresAction).toBeGreaterThan(0);
    });

    it('should group by entity type', async () => {
      const discrepancy1 = {
        id: 'disc-1',
        reconciliationId: 'rec-1',
        entityType: 'Supplier',
        entityId: 'sup-1',
        field: 'name',
        mesValue: 'A',
        erpValue: 'B',
        difference: 'A vs B',
        severity: DiscrepancySeverity.LOW,
        status: DiscrepancyStatus.DETECTED,
        description: 'name differs',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const discrepancy2 = {
        ...discrepancy1,
        id: 'disc-2',
        entityType: 'PurchaseOrder',
        entityId: 'po-1',
      };

      const summary = await service.getSummary([discrepancy1, discrepancy2]);

      expect(summary.entityTypeSummary.Supplier).toBe(1);
      expect(summary.entityTypeSummary.PurchaseOrder).toBe(1);
    });
  });

  describe('resolveDiscrepancy', () => {
    it('should resolve a discrepancy', async () => {
      await service.resolveDiscrepancy(
        'disc-1',
        'SYNC_CORRECTION',
        'corrected_value',
        'Applied ERP sync',
        'user-123'
      );

      expect(true).toBe(true); // Should not throw
    });
  });
});
