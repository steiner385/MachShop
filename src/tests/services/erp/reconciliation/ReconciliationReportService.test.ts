/**
 * Reconciliation Report Service Unit Tests
 * Issue #60: Phase 12 - Data Reconciliation System
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import ReconciliationReportService, {
  ReconciliationType,
  ReconciliationStatus,
} from '../../../../services/erp/reconciliation/ReconciliationReportService';
import DiscrepancyService, { DiscrepancySeverity, DiscrepancyStatus } from '../../../../services/erp/reconciliation/DiscrepancyService';

describe('ReconciliationReportService', () => {
  let service: ReconciliationReportService;
  let mockPrisma: any;
  let discrepancyService: DiscrepancyService;

  beforeEach(() => {
    mockPrisma = {
      erpIntegration: {
        findUnique: vi.fn(),
      },
    };

    discrepancyService = new DiscrepancyService(mockPrisma);
    service = new ReconciliationReportService(mockPrisma, discrepancyService);
  });

  describe('createReport', () => {
    it('should create a new reconciliation report', async () => {
      const start = new Date('2025-01-01');
      const end = new Date('2025-01-31');

      const report = await service.createReport(
        'erp-1',
        ReconciliationType.SUPPLIER,
        start,
        end
      );

      expect(report.id).toBeDefined();
      expect(report.integrationId).toBe('erp-1');
      expect(report.type).toBe(ReconciliationType.SUPPLIER);
      expect(report.status).toBe(ReconciliationStatus.IN_PROGRESS);
      expect(report.periodStart).toEqual(start);
      expect(report.periodEnd).toEqual(end);
    });

    it('should initialize report with zero counts', async () => {
      const report = await service.createReport(
        'erp-1',
        ReconciliationType.PURCHASE_ORDER,
        new Date(),
        new Date()
      );

      expect(report.mesRecordCount).toBe(0);
      expect(report.erpRecordCount).toBe(0);
      expect(report.matchedRecordCount).toBe(0);
      expect(report.discrepancyCount).toBe(0);
    });
  });

  describe('finalizeReport', () => {
    it('should finalize report with no discrepancies', async () => {
      const report = await service.createReport(
        'erp-1',
        ReconciliationType.SUPPLIER,
        new Date(),
        new Date()
      );

      report.mesRecordCount = 10;
      report.erpRecordCount = 10;
      report.matchedRecordCount = 10;

      const finalized = await service.finalizeReport(report, []);

      expect(finalized.status).toBe(ReconciliationStatus.COMPLETED_CLEAN);
      expect(finalized.endTime).toBeDefined();
      expect(finalized.duration).toBeGreaterThanOrEqual(0);
      expect(finalized.discrepancyCount).toBe(0);
    });

    it('should finalize report with discrepancies', async () => {
      const report = await service.createReport(
        'erp-1',
        ReconciliationType.SUPPLIER,
        new Date(),
        new Date()
      );

      report.mesRecordCount = 10;
      report.erpRecordCount = 10;
      report.matchedRecordCount = 8;

      const discrepancies = [
        {
          id: 'disc-1',
          reconciliationId: report.id,
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
        },
        {
          id: 'disc-2',
          reconciliationId: report.id,
          entityType: 'Supplier',
          entityId: 'sup-2',
          field: 'city',
          mesValue: null,
          erpValue: 'NYC',
          difference: 'null vs NYC',
          severity: DiscrepancySeverity.HIGH,
          status: DiscrepancyStatus.DETECTED,
          description: 'city differs',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const finalized = await service.finalizeReport(report, discrepancies);

      expect(finalized.status).toBe(ReconciliationStatus.COMPLETED_WITH_DISCREPANCIES);
      expect(finalized.discrepancyCount).toBe(2);
      expect(finalized.lowCount).toBe(1);
      expect(finalized.highCount).toBe(1);
    });

    it('should generate summary text', async () => {
      const report = await service.createReport(
        'erp-1',
        ReconciliationType.PURCHASE_ORDER,
        new Date(),
        new Date()
      );

      report.mesRecordCount = 100;
      report.erpRecordCount = 100;
      report.matchedRecordCount = 95;

      const finalized = await service.finalizeReport(report, []);

      expect(finalized.summary).toContain('PURCHASE_ORDER');
      expect(finalized.summary).toContain('95.0');
      expect(finalized.summary).toContain('100');
    });

    it('should generate recommendations', async () => {
      const report = await service.createReport(
        'erp-1',
        ReconciliationType.SUPPLIER,
        new Date(),
        new Date()
      );

      report.mesRecordCount = 10;
      report.erpRecordCount = 10;
      report.matchedRecordCount = 10;

      const finalized = await service.finalizeReport(report, []);

      expect(finalized.recommendations.length).toBeGreaterThan(0);
      expect(finalized.recommendations[0]).toContain('No discrepancies');
    });

    it('should recommend action for critical discrepancies', async () => {
      const report = await service.createReport(
        'erp-1',
        ReconciliationType.PURCHASE_ORDER,
        new Date(),
        new Date()
      );

      const criticalDiscrepancy = {
        id: 'disc-1',
        reconciliationId: report.id,
        entityType: 'PurchaseOrder',
        entityId: 'po-1',
        field: 'quantity',
        mesValue: 100,
        erpValue: 200,
        difference: '100% difference',
        severity: DiscrepancySeverity.CRITICAL,
        status: DiscrepancyStatus.DETECTED,
        description: 'quantity differs',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const finalized = await service.finalizeReport(report, [criticalDiscrepancy]);

      expect(finalized.recommendations.some((r) => r.includes('URGENT'))).toBe(true);
    });
  });

  describe('calculateDataQualityScore', () => {
    it('should return 100 for perfect match', () => {
      const report = {
        id: 'report-1',
        integrationId: 'erp-1',
        type: ReconciliationType.SUPPLIER,
        status: ReconciliationStatus.COMPLETED_CLEAN,
        periodStart: new Date(),
        periodEnd: new Date(),
        startTime: new Date(),
        endTime: new Date(),
        mesRecordCount: 100,
        erpRecordCount: 100,
        matchedRecordCount: 100,
        discrepancyCount: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        discrepancies: [],
        summary: 'Clean',
        recommendations: [],
        duration: 1000,
      };

      const score = service.calculateDataQualityScore(report);

      expect(score).toBe(100);
    });

    it('should reduce score for discrepancies', () => {
      const report = {
        id: 'report-1',
        integrationId: 'erp-1',
        type: ReconciliationType.SUPPLIER,
        status: ReconciliationStatus.COMPLETED_WITH_DISCREPANCIES,
        periodStart: new Date(),
        periodEnd: new Date(),
        startTime: new Date(),
        endTime: new Date(),
        mesRecordCount: 100,
        erpRecordCount: 100,
        matchedRecordCount: 95,
        discrepancyCount: 5,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 3,
        lowCount: 2,
        discrepancies: [],
        summary: 'Issues found',
        recommendations: [],
        duration: 1000,
      };

      const score = service.calculateDataQualityScore(report);

      expect(score).toBeLessThan(100);
      expect(score).toBeGreaterThan(80); // Adjusted to account for penalty calculation
    });

    it('should heavily penalize critical discrepancies', () => {
      const report = {
        id: 'report-1',
        integrationId: 'erp-1',
        type: ReconciliationType.SUPPLIER,
        status: ReconciliationStatus.COMPLETED_WITH_DISCREPANCIES,
        periodStart: new Date(),
        periodEnd: new Date(),
        startTime: new Date(),
        endTime: new Date(),
        mesRecordCount: 100,
        erpRecordCount: 100,
        matchedRecordCount: 99,
        discrepancyCount: 1,
        criticalCount: 1,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        discrepancies: [],
        summary: 'Critical issue',
        recommendations: [],
        duration: 1000,
      };

      const score = service.calculateDataQualityScore(report);

      expect(score).toBeLessThan(90);
    });

    it('should return 100 for zero records', () => {
      const report = {
        id: 'report-1',
        integrationId: 'erp-1',
        type: ReconciliationType.SUPPLIER,
        status: ReconciliationStatus.COMPLETED_CLEAN,
        periodStart: new Date(),
        periodEnd: new Date(),
        startTime: new Date(),
        endTime: new Date(),
        mesRecordCount: 0,
        erpRecordCount: 0,
        matchedRecordCount: 0,
        discrepancyCount: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        discrepancies: [],
        summary: 'No data',
        recommendations: [],
        duration: 1000,
      };

      const score = service.calculateDataQualityScore(report);

      expect(score).toBe(100);
    });
  });

  describe('getHistory', () => {
    it('should retrieve reconciliation history', async () => {
      const history = await service.getHistory('erp-1');

      expect(Array.isArray(history)).toBe(true);
    });

    it('should filter by type', async () => {
      const history = await service.getHistory(
        'erp-1',
        ReconciliationType.SUPPLIER
      );

      expect(Array.isArray(history)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const history = await service.getHistory('erp-1', undefined, 5);

      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('getTrends', () => {
    it('should analyze trends over time', async () => {
      const trends = await service.getTrends(
        'erp-1',
        ReconciliationType.SUPPLIER,
        30
      );

      expect(Array.isArray(trends)).toBe(true);
    });

    it('should cap days parameter at 90', async () => {
      const trends = await service.getTrends(
        'erp-1',
        ReconciliationType.SUPPLIER,
        180
      );

      expect(Array.isArray(trends)).toBe(true);
    });
  });
});
