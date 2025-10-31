import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaClient, B2MMessageStatus } from '@prisma/client';
import { ProductionPerformanceExportService } from '../../services/ProductionPerformanceExportService';

// Mock Prisma Client
vi.mock('../../lib/database', () => {
  const mockPrismaClient = {
    workOrder: {
      findUnique: vi.fn(),
    },
    integrationConfig: {
      findUnique: vi.fn(),
    },
    productionPerformanceActual: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  };

  return {
    PrismaClient: vi.fn(() => mockPrismaClient),
    B2MMessageStatus: {
      PENDING: 'PENDING',
      PROCESSED: 'PROCESSED',
      SENT: 'SENT',
      CONFIRMED: 'CONFIRMED',
      FAILED: 'FAILED',
    },
  };
});

describe('ProductionPerformanceExportService', () => {
  let service: ProductionPerformanceExportService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = new PrismaClient();
    service = new ProductionPerformanceExportService(mockPrisma);
    vi.clearAllMocks();
  });

  describe('exportWorkOrderActuals', () => {
    const mockWorkOrder = {
      id: 'wo-1',
      workOrderNumber: 'WO-001',
      customerOrder: 'CO-001',
      partNumber: 'PN-123',
      quantity: 100,
      actualStartDate: new Date('2025-10-01T08:00:00Z'),
      actualEndDate: new Date('2025-10-01T16:00:00Z'),
      part: { id: 'part-1', partNumber: 'PN-123' },
      workPerformance: [
        {
          id: 'perf-1',
          performanceType: 'LABOR',
          personnelId: 'user-1',
          laborHours: 8.0,
          laborCost: 240.0,
          laborEfficiency: 95.0,
          quantityProduced: null,
          quantityGood: null,
          quantityScrap: null,
          quantityRework: null,
        },
        {
          id: 'perf-2',
          performanceType: 'QUALITY',
          quantityProduced: 100,
          quantityGood: 98,
          quantityScrap: 2,
          quantityRework: 0,
        },
        {
          id: 'perf-3',
          performanceType: 'MATERIAL',
          partId: 'part-2',
          quantityConsumed: 105,
          quantityPlanned: 100,
          materialVariance: -5,
          totalCost: 525.0,
        },
      ],
      variances: [
        { id: 'var-1', varianceType: 'QUANTITY', varianceAmount: -2.0 },
        { id: 'var-2', varianceType: 'COST', varianceAmount: 15.5 },
      ],
    };

    const mockConfig = {
      id: 'config-1',
      name: 'Oracle Fusion',
      type: 'ERP',
      enabled: true,
    };

    it('should export work order actuals successfully', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrisma.productionPerformanceActual.create.mockResolvedValue({
        id: 'actual-1',
        messageId: 'PERF-WO-001-123456',
        workOrderId: 'wo-1',
        externalWorkOrderId: 'CO-001',
        status: 'PENDING',
        sentToERP: false,
      });
      mockPrisma.productionPerformanceActual.update.mockResolvedValue({
        id: 'actual-1',
        messageId: 'PERF-WO-001-123456',
        status: 'PROCESSED',
      });

      const result = await service.exportWorkOrderActuals({
        workOrderId: 'wo-1',
        configId: 'config-1',
        createdBy: 'user-admin',
      });

      expect(result).toBeDefined();
      expect(result.workOrderId).toBe('wo-1');
      expect(result.externalWorkOrderId).toBe('CO-001');
      expect(result.status).toBe('PROCESSED');
      expect(mockPrisma.productionPerformanceActual.create).toHaveBeenCalledOnce();
    });

    it('should calculate aggregated quantities correctly', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrisma.productionPerformanceActual.create.mockResolvedValue({ id: 'actual-1', messageId: 'test' });
      mockPrisma.productionPerformanceActual.update.mockResolvedValue({});

      await service.exportWorkOrderActuals({
        workOrderId: 'wo-1',
        configId: 'config-1',
        createdBy: 'user-admin',
      });

      const createCall = mockPrisma.productionPerformanceActual.create.mock.calls[0][0];
      expect(createCall.data.quantityProduced).toBe(100);
      expect(createCall.data.quantityGood).toBe(98);
      expect(createCall.data.quantityScrap).toBe(2);
      expect(createCall.data.yieldPercentage).toBe(98.0);
    });

    it('should throw error if work order not found', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.exportWorkOrderActuals({
          workOrderId: 'invalid-wo',
          configId: 'config-1',
          createdBy: 'user-admin',
        })
      ).rejects.toThrow('Work order invalid-wo not found');
    });

    it('should throw error if config disabled', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.integrationConfig.findUnique.mockResolvedValue({ ...mockConfig, enabled: false });

      await expect(
        service.exportWorkOrderActuals({
          workOrderId: 'wo-1',
          configId: 'config-1',
          createdBy: 'user-admin',
        })
      ).rejects.toThrow('Integration config config-1 is disabled');
    });
  });

  describe('getExportStatus', () => {
    it('should return export status successfully', async () => {
      const mockExport = {
        messageId: 'PERF-WO-001-123',
        workOrderId: 'wo-1',
        externalWorkOrderId: 'CO-001',
        status: 'PROCESSED',
        sentToERP: false,
        workOrder: { workOrderNumber: 'WO-001', partNumber: 'PN-123', quantity: 100 },
      };

      mockPrisma.productionPerformanceActual.findUnique.mockResolvedValue(mockExport);

      const result = await service.getExportStatus('PERF-WO-001-123');

      expect(result).toBeDefined();
      expect(result.messageId).toBe('PERF-WO-001-123');
      expect(result.status).toBe('PROCESSED');
    });

    it('should throw error if export not found', async () => {
      mockPrisma.productionPerformanceActual.findUnique.mockResolvedValue(null);

      await expect(
        service.getExportStatus('invalid-message-id')
      ).rejects.toThrow('Production performance export invalid-message-id not found');
    });
  });

  describe('retryExport', () => {
    it('should retry failed export successfully', async () => {
      const mockFailedExport = {
        messageId: 'PERF-WO-001-123',
        workOrderId: 'wo-1',
        configId: 'config-1',
        status: 'FAILED',
      };

      const mockWorkOrder = {
        id: 'wo-1',
        workOrderNumber: 'WO-001',
        customerOrder: 'CO-001',
        actualStartDate: new Date(),
        actualEndDate: new Date(),
        part: { id: 'part-1' },
        workPerformance: [],
        variances: [],
      };

      const mockConfig = { id: 'config-1', name: 'Oracle', type: 'ERP', enabled: true };

      mockPrisma.productionPerformanceActual.findUnique.mockResolvedValue(mockFailedExport);
      mockPrisma.productionPerformanceActual.update.mockResolvedValue({ status: 'PENDING' });
      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrisma.productionPerformanceActual.create.mockResolvedValue({
        id: 'actual-retry',
        messageId: 'PERF-WO-001-123-retry',
      });

      const result = await service.retryExport('PERF-WO-001-123', 'user-admin');

      expect(result).toBeDefined();
      expect(mockPrisma.productionPerformanceActual.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { messageId: 'PERF-WO-001-123' },
          data: { status: 'PENDING', errorMessage: null },
        })
      );
    });

    it('should throw error if export already confirmed', async () => {
      mockPrisma.productionPerformanceActual.findUnique.mockResolvedValue({
        messageId: 'PERF-WO-001-123',
        status: 'CONFIRMED',
      });

      await expect(
        service.retryExport('PERF-WO-001-123', 'user-admin')
      ).rejects.toThrow('Export PERF-WO-001-123 is already confirmed, cannot retry');
    });
  });
});
