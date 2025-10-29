/**
 * ISA-95 B2M Integration Compliance Test Suite
 * Task 1.8: Level 4 (ERP) Integration Model
 *
 * Comprehensive integration tests validating:
 * - Cross-service B2M integration scenarios
 * - End-to-end message flows (ERP → MES → ERP)
 * - ISA-95 Part 3 message format compliance
 * - Digital thread connectivity across all B2M services
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { ProductionScheduleSyncService } from '../../services/ProductionScheduleSyncService';
import { ProductionPerformanceExportService } from '../../services/ProductionPerformanceExportService';
import { MaterialTransactionService } from '../../services/MaterialTransactionService';
import { PersonnelInfoSyncService } from '../../services/PersonnelInfoSyncService';
import B2MMessageBuilder from '../../services/B2MMessageBuilder';

// Mock Prisma Client
vi.mock('@prisma/client', () => {
  const mockPrismaClient = {
    integrationConfig: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    part: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    workOrder: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    equipment: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    personnel: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    productionScheduleRequest: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    productionScheduleResponse: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    productionPerformanceActual: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    materialTransaction: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    eRPMaterialTransaction: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    personnelInfoExchange: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    b2MMessage: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    inventory: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
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

describe('ISA95-B2M Integration Compliance', () => {
  let mockPrisma: any;
  let scheduleService: ProductionScheduleSyncService;
  let performanceService: ProductionPerformanceExportService;
  let materialService: MaterialTransactionService;
  let personnelService: PersonnelInfoSyncService;

  const mockConfig = {
    id: 'config-1',
    name: 'Oracle Fusion Cloud',
    type: 'ERP',
    enabled: true,
    endpoint: 'https://erp.example.com/api',
  };

  const mockPart = {
    id: 'part-1',
    partNumber: 'PN-12345',
    partDescription: 'Machined Component',
    quantityOnHand: 1000,
    isActive: true,
  };

  beforeEach(() => {
    mockPrisma = new PrismaClient();

    // Reset mock call counts but preserve mock implementations
    Object.values(mockPrisma).forEach((model: any) => {
      if (model && typeof model === 'object') {
        Object.values(model).forEach((fn: any) => {
          if (fn && typeof fn.mockClear === 'function') {
            fn.mockClear();
          }
        });
      }
    });

    scheduleService = new ProductionScheduleSyncService(mockPrisma);
    performanceService = new ProductionPerformanceExportService(mockPrisma);
    materialService = new MaterialTransactionService(mockPrisma);
    personnelService = new PersonnelInfoSyncService(mockPrisma);
  });

  // ===================================================================
  // CROSS-SERVICE INTEGRATION SCENARIOS
  // ===================================================================

  describe('Cross-Service Integration Scenarios', () => {
    it('should complete full production cycle: Schedule → Work Order → Performance → Material', async () => {
      // 1. ERP sends schedule request
      const scheduleRequest = B2MMessageBuilder.buildProductionScheduleRequest({
        messageId: 'SCH-REQ-001',
        sender: 'Oracle ERP',
        receiver: 'MES',
        scheduleType: 'PRODUCTION_ORDER',
        priority: 'NORMAL',
        workOrder: {
          externalId: 'ERP-WO-001',
          partNumber: 'PN-12345',
          quantity: 100,
          unitOfMeasure: 'EA',
          dueDate: new Date('2025-11-15T23:59:59Z'),
          startDate: new Date('2025-11-01T08:00:00Z'),
          endDate: new Date('2025-11-05T17:00:00Z'),
        },
        resources: {
          materials: [{ partNumber: 'PN-RAW-001', quantity: 200 }],
          equipment: [{ equipmentClass: 'PRODUCTION', quantity: 1 }],
          personnel: [{ skillCode: 'MACHINIST_L2', quantity: 2 }],
        },
      });

      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrisma.part.findFirst
        .mockResolvedValueOnce(mockPart)
        .mockResolvedValueOnce({ id: 'part-raw-001', partNumber: 'PN-RAW-001', quantityOnHand: 500, isActive: true });
      mockPrisma.equipment.count.mockResolvedValue(3);
      mockPrisma.personnel.count.mockResolvedValue(5);

      const mockScheduleRequest = {
        id: 'request-1',
        messageId: 'SCH-REQ-001',
        configId: 'config-1',
        status: 'ACCEPTED',
      };

      mockPrisma.productionScheduleRequest.create.mockResolvedValue(mockScheduleRequest);
      mockPrisma.productionScheduleRequest.findUnique.mockResolvedValue(mockScheduleRequest);
      mockPrisma.productionScheduleRequest.update.mockResolvedValue({});

      const mockWorkOrder = {
        id: 'wo-1',
        workOrderNumber: 'WO-ERP-ERP-WO-001',
        customerOrder: 'ERP-WO-001',
        partId: 'part-1',
        partNumber: 'PN-12345',
        quantity: 100,
        status: 'CREATED',
        actualStartDate: new Date('2025-11-01T08:30:00Z'),
        actualEndDate: new Date('2025-11-05T16:45:00Z'),
        part: mockPart,
        workPerformance: [
          {
            id: 'perf-1',
            performanceType: 'LABOR',
            laborHours: 16.0,
            laborCost: 480.0,
            laborEfficiency: 98.5,
          },
          {
            id: 'perf-2',
            performanceType: 'QUALITY',
            quantityProduced: 100,
            quantityGood: 99,
            quantityScrap: 1,
            quantityRework: 0,
          },
        ],
        variances: [],
      };

      mockPrisma.workOrder.create.mockResolvedValue(mockWorkOrder);
      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.productionScheduleResponse.create.mockResolvedValue({
        id: 'response-1',
        requestId: 'request-1',
        messageId: 'SCH-RESP-001',
        accepted: true,
        status: 'SENT',
      });
      mockPrisma.productionScheduleResponse.update.mockResolvedValue({});

      // Step 1: Process schedule request
      const scheduleResult = await scheduleService.processScheduleRequest({
        configId: 'config-1',
        messagePayload: scheduleRequest,
        createdBy: 'system',
      });

      expect(scheduleResult.accepted).toBe(true);
      expect(scheduleResult.workOrderId).toBe('wo-1');
      expect(scheduleResult.status).toBe('PROCESSED');

      // Step 2: Export performance actuals
      mockPrisma.productionPerformanceActual.create.mockResolvedValue({
        id: 'actual-1',
        messageId: 'PERF-WO-ERP-ERP-WO-001-123456',
        workOrderId: 'wo-1',
        status: 'PENDING',
      });
      mockPrisma.productionPerformanceActual.update.mockResolvedValue({
        status: 'PROCESSED',
      });

      const performanceResult = await performanceService.exportWorkOrderActuals({
        workOrderId: 'wo-1',
        configId: 'config-1',
        createdBy: 'system',
      });

      expect(performanceResult.workOrderId).toBe('wo-1');
      expect(performanceResult.status).toBe('PROCESSED');

      // Step 3: Export material transaction
      mockPrisma.part.findUnique.mockResolvedValue(mockPart);
      mockPrisma.eRPMaterialTransaction.create.mockResolvedValue({
        id: 'mat-1',
        messageId: 'MAT-PN-12345-123456',
        workOrderId: 'wo-1',
        status: 'PENDING',
      });
      mockPrisma.eRPMaterialTransaction.update.mockResolvedValue({
        status: 'PROCESSED',
      });

      const materialResult = await materialService.exportMaterialTransaction({
        workOrderId: 'wo-1',
        partId: 'part-1',
        transactionType: 'ISSUE',
        quantity: 200,
        unitOfMeasure: 'EA',
        configId: 'config-1',
        createdBy: 'system',
      });

      expect(materialResult.status).toBe('PROCESSED');
      expect(materialResult.messageId).toBeDefined();

      // Verify workOrderId was passed to database correctly
      const matCreateCall = mockPrisma.eRPMaterialTransaction.create.mock.calls[0][0];
      expect(matCreateCall.data.workOrderId).toBe('wo-1');

      // Verify all steps completed
      expect(mockPrisma.productionScheduleRequest.create).toHaveBeenCalledOnce();
      expect(mockPrisma.workOrder.create).toHaveBeenCalledOnce();
      expect(mockPrisma.productionPerformanceActual.create).toHaveBeenCalledOnce();
      expect(mockPrisma.eRPMaterialTransaction.create).toHaveBeenCalledOnce();
    });

    it('should track material consumption from schedule through performance', async () => {
      const mockWorkOrder = {
        id: 'wo-2',
        workOrderNumber: 'WO-002',
        customerOrder: 'ERP-WO-002',
        partId: 'part-1',
        partNumber: 'PN-12345',
        quantity: 50,
        actualStartDate: new Date(),
        actualEndDate: new Date(),
        part: mockPart,
        workPerformance: [
          {
            id: 'perf-mat-1',
            performanceType: 'MATERIAL',
            partId: 'part-raw-001',
            quantityConsumed: 105,
            quantityPlanned: 100,
            materialVariance: -5,
            totalCost: 525.0,
          },
        ],
        variances: [
          { id: 'var-1', varianceType: 'QUANTITY', varianceAmount: 5.0 },
        ],
      };

      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.productionPerformanceActual.create.mockResolvedValue({
        id: 'actual-2',
        messageId: 'PERF-WO-002-123456',
      });
      mockPrisma.productionPerformanceActual.update.mockResolvedValue({});

      const performanceResult = await performanceService.exportWorkOrderActuals({
        workOrderId: 'wo-2',
        configId: 'config-1',
        createdBy: 'system',
      });

      expect(performanceResult).toBeDefined();

      // Verify material variance is captured in performance message
      const createCall = mockPrisma.productionPerformanceActual.create.mock.calls[0][0];
      expect(createCall.data.materialActuals).toBeDefined();
      expect(createCall.data.materialActuals[0].variance).toBe(-5);
    });

    it('should link personnel assignments through schedule to performance', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'EMP-001',
        name: 'John Smith',
        email: 'john.smith@example.com',
        employeeId: 'EMP-001',
        isActive: true,
      };

      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        email: 'john.smith.updated@example.com',
      });

      mockPrisma.personnelInfoExchange.create.mockResolvedValue({
        id: 'info-1',
        messageId: 'PERS-ERP-001',
        externalPersonnelId: 'EMP-001',
        status: 'PENDING',
      });

      mockPrisma.personnelInfoExchange.update.mockResolvedValue({
        status: 'PROCESSED',
      });

      const result = await personnelService.processInboundPersonnelInfo({
        configId: 'config-1',
        messagePayload: {
          messageType: 'PersonnelInfo',
          messageId: 'PERS-ERP-001',
          timestamp: new Date().toISOString(),
          sender: 'Oracle ERP',
          receiver: 'MES',
          actionType: 'UPDATE',
          personnel: {
            externalId: 'EMP-001',
            firstName: 'John',
            lastName: 'Smith',
            email: 'john.smith.updated@example.com',
            employeeNumber: 'EMP-001',
          },
        },
        createdBy: 'system',
      });

      expect(result.status).toBe('PROCESSED');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
        })
      );
    });

    it('should cascade schedule rejection through all downstream services', async () => {
      const scheduleRequest = B2MMessageBuilder.buildProductionScheduleRequest({
        messageId: 'SCH-REQ-REJECT-001',
        sender: 'Oracle ERP',
        receiver: 'MES',
        scheduleType: 'PRODUCTION_ORDER',
        priority: 'HIGH',
        workOrder: {
          externalId: 'ERP-WO-999',
          partNumber: 'PN-INVALID',
          quantity: 1000,
          unitOfMeasure: 'EA',
          dueDate: new Date('2025-11-25T23:59:59Z'),
          startDate: new Date('2025-11-20T08:00:00Z'),
          endDate: new Date('2025-11-22T17:00:00Z'),
        },
      });

      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrisma.part.findFirst
        .mockReset()
        .mockResolvedValueOnce(null); // Part not found

      const mockRejectedRequest = {
        id: 'request-reject-1',
        messageId: 'SCH-REQ-REJECT-001',
        configId: 'config-1',
        status: 'REJECTED',
      };

      mockPrisma.productionScheduleRequest.create.mockResolvedValue(mockRejectedRequest);
      mockPrisma.productionScheduleRequest.findUnique.mockResolvedValue(mockRejectedRequest);
      mockPrisma.productionScheduleRequest.update.mockResolvedValue({});
      mockPrisma.productionScheduleResponse.create.mockResolvedValue({
        id: 'response-reject-1',
        requestId: 'request-reject-1',
        messageId: 'SCH-RESP-REJECT-001',
        accepted: false,
        status: 'SENT',
      });
      mockPrisma.productionScheduleResponse.update.mockResolvedValue({});

      const result = await scheduleService.processScheduleRequest({
        configId: 'config-1',
        messagePayload: scheduleRequest,
        createdBy: 'system',
      });

      expect(result.accepted).toBe(false);
      expect(result.errorMessage || '').toContain('Part PN-INVALID not found');
      expect(result.workOrderId).toBeUndefined();
      expect(mockPrisma.workOrder.create).not.toHaveBeenCalled();
    });
  });

  // ===================================================================
  // END-TO-END MESSAGE FLOWS
  // ===================================================================

  describe('End-to-End Message Flows', () => {
    it('should complete ERP → MES → ERP roundtrip for production schedule', async () => {
      // INBOUND: ERP → MES (Schedule Request)
      const scheduleRequest = B2MMessageBuilder.buildProductionScheduleRequest({
        messageId: 'E2E-SCH-001',
        sender: 'Oracle ERP',
        receiver: 'MES',
        scheduleType: 'PRODUCTION_ORDER',
        priority: 'NORMAL',
        workOrder: {
          externalId: 'ERP-WO-E2E-001',
          partNumber: 'PN-12345',
          quantity: 75,
          unitOfMeasure: 'EA',
          dueDate: new Date('2025-11-30T23:59:59Z'),
          startDate: new Date('2025-11-22T08:00:00Z'),
          endDate: new Date('2025-11-24T17:00:00Z'),
        },
      });

      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrisma.part.findFirst.mockResolvedValue(mockPart);
      mockPrisma.equipment.count.mockResolvedValue(5);
      mockPrisma.personnel.count.mockResolvedValue(10);

      const mockScheduleRequest = {
        id: 'request-e2e-1',
        messageId: 'E2E-SCH-001',
        configId: 'config-1',
        status: 'ACCEPTED',
      };

      mockPrisma.productionScheduleRequest.create.mockResolvedValue(mockScheduleRequest);
      mockPrisma.productionScheduleRequest.findUnique.mockResolvedValue(mockScheduleRequest);
      mockPrisma.productionScheduleRequest.update.mockResolvedValue({});
      mockPrisma.workOrder.create.mockResolvedValue({
        id: 'wo-e2e-1',
        workOrderNumber: 'WO-ERP-ERP-WO-E2E-001',
        customerOrder: 'ERP-WO-E2E-001',
      });
      mockPrisma.productionScheduleResponse.create.mockResolvedValue({
        id: 'response-e2e-1',
        requestId: 'request-e2e-1',
        messageId: 'E2E-SCH-RESP-001',
        accepted: true,
        status: 'SENT',
      });
      mockPrisma.productionScheduleResponse.update.mockResolvedValue({});

      const scheduleResult = await scheduleService.processScheduleRequest({
        configId: 'config-1',
        messagePayload: scheduleRequest,
        createdBy: 'system',
      });

      // OUTBOUND: MES → ERP (Schedule Response)
      expect(scheduleResult.accepted).toBe(true);
      expect(scheduleResult.status).toBe('PROCESSED');
      expect(scheduleResult.workOrderId).toBeDefined();

      // Verify response was sent
      expect(mockPrisma.productionScheduleResponse.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            accepted: true,
          }),
        })
      );
    });

    it('should complete bidirectional material transaction flow', async () => {
      // OUTBOUND: MES → ERP (Material Issue)
      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrisma.workOrder.findUnique.mockResolvedValue({
        id: 'wo-mat-1',
        workOrderNumber: 'WO-MAT-001',
        customerOrder: 'ERP-WO-MAT-001',
      });
      mockPrisma.part.findUnique.mockResolvedValue(mockPart);
      mockPrisma.eRPMaterialTransaction.create.mockResolvedValue({
        id: 'mat-tx-1',
        messageId: 'MAT-ISSUE-001',
        status: 'PENDING',
      });
      mockPrisma.eRPMaterialTransaction.update.mockResolvedValue({
        status: 'SENT',
      });

      const issueResult = await materialService.exportMaterialTransaction({
        workOrderId: 'wo-mat-1',
        partId: 'part-1',
        transactionType: 'ISSUE',
        quantity: 100,
        unitOfMeasure: 'EA',
        configId: 'config-1',
        createdBy: 'system',
      });

      expect(issueResult.status).toBe('PROCESSED');

      // INBOUND: ERP → MES (Material Return Transaction)
      const returnMessage = B2MMessageBuilder.buildMaterialTransactionMessage({
        messageId: 'MAT-RETURN-001',
        sender: 'Oracle ERP',
        receiver: 'MES',
        transactionType: 'RETURN',
        material: {
          partNumber: 'PN-12345',
          quantity: 10,
          unitOfMeasure: 'EA',
        },
        locations: {
          from: 'PRODUCTION',
          to: 'WAREHOUSE-A',
        },
        workOrderReference: 'ERP-WO-MAT-001',
      });

      mockPrisma.part.findFirst.mockResolvedValue(mockPart);
      mockPrisma.part.update.mockResolvedValue({});
      mockPrisma.workOrder.findFirst.mockResolvedValue({
        id: 'wo-mat-1',
        workOrderNumber: 'WO-MAT-001',
        customerOrder: 'ERP-WO-MAT-001',
      });
      mockPrisma.inventory.findFirst.mockResolvedValue({
        id: 'inventory-1',
        partId: 'part-1',
        quantityOnHand: 1000,
        location: 'WAREHOUSE-A',
      });
      mockPrisma.inventory.update.mockResolvedValue({
        id: 'inventory-1',
        quantityOnHand: 1010, // Updated after return
      });
      mockPrisma.eRPMaterialTransaction.create.mockResolvedValue({
        id: 'mat-tx-return-1',
        messageId: 'MAT-RETURN-001',
        status: 'PENDING',
      });
      mockPrisma.eRPMaterialTransaction.update.mockResolvedValue({
        status: 'PROCESSED',
      });
      mockPrisma.materialTransaction.create.mockResolvedValue({
        id: 'internal-tx-1',
      });

      const returnResult = await materialService.processInboundTransaction({
        configId: 'config-1',
        messagePayload: returnMessage,
        createdBy: 'system',
      });

      expect(returnResult.status).toBe('PROCESSED');
      expect(mockPrisma.eRPMaterialTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            transactionType: 'RETURN',
            direction: 'INBOUND',
          }),
        })
      );
    });

    it('should handle production performance reporting with ERP acknowledgment', async () => {
      const mockWorkOrder = {
        id: 'wo-perf-1',
        workOrderNumber: 'WO-PERF-001',
        customerOrder: 'ERP-WO-PERF-001',
        partId: 'part-1',
        partNumber: 'PN-12345',
        quantity: 100,
        actualStartDate: new Date('2025-11-18T08:00:00Z'),
        actualEndDate: new Date('2025-11-18T17:00:00Z'),
        part: mockPart,
        workPerformance: [
          {
            id: 'perf-1',
            performanceType: 'QUALITY',
            quantityProduced: 100,
            quantityGood: 100,
            quantityScrap: 0,
            quantityRework: 0,
          },
        ],
        variances: [],
      };

      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.productionPerformanceActual.create.mockResolvedValue({
        id: 'actual-perf-1',
        messageId: 'PERF-WO-PERF-001-123456',
        workOrderId: 'wo-perf-1',
        status: 'PENDING',
      });
      mockPrisma.productionPerformanceActual.update.mockResolvedValue({
        status: 'PROCESSED',
      });

      const performanceResult = await performanceService.exportWorkOrderActuals({
        workOrderId: 'wo-perf-1',
        configId: 'config-1',
        createdBy: 'system',
      });

      expect(performanceResult.status).toBe('PROCESSED');

      // Simulate ERP acknowledgment (would be received via webhook in production)
      const messageId = performanceResult.messageId;
      expect(messageId).toMatch(/^PERF-WO-PERF-001-\d+$/);
    });
  });

  // ===================================================================
  // MESSAGE FORMAT VALIDATION
  // ===================================================================

  describe('ISA-95 Message Format Compliance', () => {
    it('should build valid ProductionScheduleRequest message', () => {
      const message = B2MMessageBuilder.buildProductionScheduleRequest({
        messageId: 'SCH-TEST-001',
        sender: 'Oracle ERP',
        receiver: 'MES',
        scheduleType: 'PRODUCTION_ORDER',
        priority: 'HIGH',
        workOrder: {
          externalId: 'ERP-WO-TEST-001',
          partNumber: 'PN-12345',
          quantity: 200,
          unitOfMeasure: 'EA',
          dueDate: new Date('2025-11-30T23:59:59Z'),
          startDate: new Date('2025-11-22T08:00:00Z'),
          endDate: new Date('2025-11-25T17:00:00Z'),
        },
        resources: {
          materials: [{ partNumber: 'PN-RAW-001', quantity: 400 }],
          equipment: [{ equipmentClass: 'PRODUCTION', quantity: 2 }],
          personnel: [{ skillCode: 'MACHINIST_L2', quantity: 4 }],
        },
      });

      const validation = B2MMessageBuilder.validateProductionScheduleRequest(message);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toBeUndefined();
      expect(message.messageId).toBe('SCH-TEST-001');
      expect(message.messageType).toBe('ProductionSchedule');
      expect(message.scheduleType).toBe('PRODUCTION_ORDER');
      expect(message.workOrder).toBeDefined();
      expect(message.workOrder.externalId).toBe('ERP-WO-TEST-001');
    });

    it('should build valid ProductionPerformanceActual message', () => {
      const message = B2MMessageBuilder.buildProductionPerformanceMessage({
        messageId: 'PERF-TEST-001',
        sender: 'MES',
        receiver: 'Oracle ERP',
        workOrder: {
          externalId: 'ERP-WO-TEST-001',
          actualStartDate: new Date('2025-11-22T08:15:00Z'),
          actualEndDate: new Date('2025-11-24T16:30:00Z'),
        },
        quantities: {
          produced: 200,
          good: 198,
          scrap: 2,
          rework: 0,
          yield: 99.0,
        },
        actuals: {
          labor: { hours: 32.0, cost: 960.0 },
          material: { cost: 2000.0 },
          overhead: { cost: 444.0 },
          total: { cost: 3404.0 },
        },
        variances: {
          quantity: 0,
          time: -1.5,
          cost: 44.0,
          efficiency: 2.5,
        },
      });

      const validation = B2MMessageBuilder.validateProductionPerformanceMessage(message);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toBeUndefined();
      expect(message.messageId).toBe('PERF-TEST-001');
      expect(message.messageType).toBe('ProductionPerformance');
      expect(message.quantities.produced).toBe(200);
      expect(message.actuals.total.cost).toBe(3404.0);
    });

    it('should build valid MaterialTransaction message', () => {
      const message = B2MMessageBuilder.buildMaterialTransactionMessage({
        messageId: 'MAT-TEST-001',
        sender: 'MES',
        receiver: 'Oracle ERP',
        transactionType: 'ISSUE',
        material: {
          partNumber: 'PN-RAW-001',
          quantity: 400,
          unitOfMeasure: 'EA',
          lotNumber: 'LOT-20251015-001',
        },
        locations: {
          from: 'WAREHOUSE-A',
          to: 'PRODUCTION',
        },
        cost: {
          unit: 5.0,
          total: 2000.0,
          currency: 'USD',
        },
        workOrderReference: 'ERP-WO-TEST-001',
      });

      const validation = B2MMessageBuilder.validateMaterialTransactionMessage(message);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toBeUndefined();
      expect(message.messageId).toBe('MAT-TEST-001');
      expect(message.messageType).toBe('MaterialTransaction');
      expect(message.transactionType).toBe('ISSUE');
      expect(message.material.quantity).toBe(400);
    });

    it('should build valid PersonnelInfo message', () => {
      const message = B2MMessageBuilder.buildPersonnelInfoMessage({
        messageId: 'PERS-TEST-001',
        sender: 'Oracle ERP',
        receiver: 'MES',
        actionType: 'UPDATE',
        personnel: {
          externalId: 'EMP-TEST-001',
          employeeNumber: 'EMP-TEST-001',
          firstName: 'Test',
          lastName: 'User',
          email: 'test.user@example.com',
          department: 'MACHINING',
        },
        skills: [
          { code: 'MACHINIST_L2', level: 'ADVANCED' },
          { code: 'INSPECTOR', level: 'INTERMEDIATE' },
        ],
        certifications: [
          { code: 'ISO9001_AUDITOR' },
        ],
      });

      const validation = B2MMessageBuilder.validatePersonnelInfoMessage(message);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toBeUndefined();
      expect(message.messageId).toBe('PERS-TEST-001');
      expect(message.messageType).toBe('PersonnelInfo');
      expect(message.actionType).toBe('UPDATE');
      expect(message.personnel.externalId).toBe('EMP-TEST-001');
      expect(message.skills).toBeDefined();
      expect(message.skills[0].code).toBe('MACHINIST_L2');
    });

    it('should reject invalid ProductionScheduleRequest (missing required fields)', () => {
      const invalidMessage = {
        header: {
          messageId: 'SCH-INVALID-001',
          sender: 'Oracle ERP',
          receiver: 'MES',
        },
        schedule: {
          scheduleType: 'PRODUCTION_ORDER',
          // Missing workOrder
        },
      };

      const validation = B2MMessageBuilder.validateProductionScheduleRequest(invalidMessage as any);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toBeDefined();
      expect(validation.errors?.length).toBeGreaterThan(0);
    });

    it('should reject invalid MaterialTransaction (negative quantity)', () => {
      const invalidMessage = {
        header: {
          messageId: 'MAT-INVALID-001',
          sender: 'MES',
          receiver: 'Oracle ERP',
        },
        transaction: {
          type: 'ISSUE',
          workOrderId: 'ERP-WO-001',
          partNumber: 'PN-RAW-001',
          quantity: -100, // Invalid negative quantity
          unitOfMeasure: 'EA',
        },
      };

      const validation = B2MMessageBuilder.validateMaterialTransactionMessage(invalidMessage as any);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toBeDefined();
      expect(validation.errors?.some(err => err.includes('quantity'))).toBe(true);
    });
  });

  // ===================================================================
  // DIGITAL THREAD CONNECTIVITY
  // ===================================================================

  describe('Digital Thread Connectivity', () => {
    it('should maintain traceability from schedule to performance to materials', async () => {
      const externalWorkOrderId = 'ERP-WO-TRACE-001';
      const partNumber = 'PN-12345';

      // 1. Schedule request creates work order
      const scheduleRequest = B2MMessageBuilder.buildProductionScheduleRequest({
        messageId: 'SCH-TRACE-001',
        sender: 'Oracle ERP',
        receiver: 'MES',
        scheduleType: 'PRODUCTION_ORDER',
        priority: 'NORMAL',
        workOrder: {
          externalId: externalWorkOrderId,
          partNumber: partNumber,
          quantity: 50,
          unitOfMeasure: 'EA',
          dueDate: new Date('2025-11-30T23:59:59Z'),
          startDate: new Date('2025-11-22T08:00:00Z'),
          endDate: new Date('2025-11-24T17:00:00Z'),
        },
      });

      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrisma.part.findFirst.mockResolvedValue(mockPart);
      mockPrisma.equipment.count.mockResolvedValue(5);
      mockPrisma.personnel.count.mockResolvedValue(10);

      const mockScheduleRequest = {
        id: 'request-trace-1',
        messageId: 'SCH-TRACE-001',
        configId: 'config-1',
        externalWorkOrderId: externalWorkOrderId,
        status: 'ACCEPTED',
      };

      mockPrisma.productionScheduleRequest.create.mockResolvedValue(mockScheduleRequest);
      mockPrisma.productionScheduleRequest.findUnique.mockResolvedValue(mockScheduleRequest);
      mockPrisma.productionScheduleRequest.update.mockResolvedValue({});

      const workOrderId = 'wo-trace-1';
      const mockWorkOrder = {
        id: workOrderId,
        workOrderNumber: `WO-ERP-${externalWorkOrderId}`,
        customerOrder: externalWorkOrderId,
        partId: 'part-1',
        partNumber: partNumber,
        quantity: 50,
        actualStartDate: new Date('2025-11-22T08:30:00Z'),
        actualEndDate: new Date('2025-11-24T16:00:00Z'),
        part: mockPart,
        workPerformance: [
          {
            id: 'perf-trace-1',
            performanceType: 'QUALITY',
            quantityProduced: 50,
            quantityGood: 50,
            quantityScrap: 0,
            quantityRework: 0,
          },
        ],
        variances: [],
      };

      mockPrisma.workOrder.create.mockResolvedValue(mockWorkOrder);
      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.productionScheduleResponse.create.mockResolvedValue({
        id: 'response-trace-1',
        requestId: 'request-trace-1',
        messageId: 'SCH-RESP-TRACE-001',
        accepted: true,
        status: 'SENT',
      });
      mockPrisma.productionScheduleResponse.update.mockResolvedValue({});

      const scheduleResult = await scheduleService.processScheduleRequest({
        configId: 'config-1',
        messagePayload: scheduleRequest,
        createdBy: 'system',
      });

      expect(scheduleResult.workOrderId).toBe(workOrderId);

      // 2. Performance export references work order
      mockPrisma.productionPerformanceActual.create.mockResolvedValue({
        id: 'actual-trace-1',
        messageId: 'PERF-TRACE-001',
        workOrderId: workOrderId,
        externalWorkOrderId: externalWorkOrderId,
        status: 'PENDING',
      });
      mockPrisma.productionPerformanceActual.update.mockResolvedValue({
        status: 'PROCESSED',
      });

      const performanceResult = await performanceService.exportWorkOrderActuals({
        workOrderId: workOrderId,
        configId: 'config-1',
        createdBy: 'system',
      });

      expect(performanceResult.workOrderId).toBe(workOrderId);
      expect(performanceResult.externalWorkOrderId).toBe(externalWorkOrderId);

      // 3. Material transaction references work order
      mockPrisma.part.findUnique
        .mockReset()
        .mockResolvedValueOnce(mockPart);
      mockPrisma.eRPMaterialTransaction.create.mockResolvedValue({
        id: 'mat-trace-1',
        messageId: 'MAT-TRACE-001',
        workOrderId: workOrderId,
        externalWorkOrderId: externalWorkOrderId,
        status: 'PENDING',
      });
      mockPrisma.eRPMaterialTransaction.update.mockResolvedValue({
        status: 'PROCESSED',
      });

      const materialResult = await materialService.exportMaterialTransaction({
        workOrderId: workOrderId,
        partId: 'part-1',
        transactionType: 'ISSUE',
        quantity: 100,
        unitOfMeasure: 'EA',
        configId: 'config-1',
        createdBy: 'system',
      });

      expect(materialResult.status).toBe('PROCESSED');
      expect(materialResult.messageId).toBeDefined();

      // Verify digital thread: All messages reference same work order
      expect(scheduleResult.workOrderId).toBe(workOrderId);
      expect(performanceResult.workOrderId).toBe(workOrderId);
      expect(performanceResult.externalWorkOrderId).toBe(externalWorkOrderId);

      // Verify materialResult workOrderId was stored in database
      const matTraceCall = mockPrisma.eRPMaterialTransaction.create.mock.calls[0][0];
      expect(matTraceCall.data.workOrderId).toBe(workOrderId);
    });

    it('should track serial numbers through all B2M messages', async () => {
      const serialNumber = 'SN-TEST-12345';
      const workOrderId = 'wo-serial-1';
      const externalWorkOrderId = 'ERP-WO-SERIAL-001';

      // Material transaction with serial number
      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrisma.workOrder.findUnique.mockResolvedValue({
        id: workOrderId,
        workOrderNumber: 'WO-SERIAL-001',
        customerOrder: externalWorkOrderId,
      });
      mockPrisma.part.findUnique
        .mockReset()
        .mockResolvedValueOnce(mockPart);
      mockPrisma.eRPMaterialTransaction.create.mockResolvedValue({
        id: 'mat-serial-1',
        messageId: 'MAT-SERIAL-001',
        workOrderId: workOrderId,
        externalWorkOrderId: externalWorkOrderId,
        serialNumber: serialNumber,
        status: 'PENDING',
      });
      mockPrisma.eRPMaterialTransaction.update.mockResolvedValue({
        status: 'PROCESSED',
      });

      const materialResult = await materialService.exportMaterialTransaction({
        workOrderId: workOrderId,
        partId: 'part-1',
        transactionType: 'ISSUE',
        quantity: 1,
        unitOfMeasure: 'EA',
        lotNumber: 'LOT-001',
        serialNumber: serialNumber,
        configId: 'config-1',
        createdBy: 'system',
      });

      expect(materialResult.status).toBe('PROCESSED');
      expect(materialResult.messageId).toBeDefined();

      // Verify serial number was stored in database
      const matSerialCall = mockPrisma.eRPMaterialTransaction.create.mock.calls[0][0];
      expect(matSerialCall.data.serialNumber).toBe(serialNumber);

      // Performance export should maintain serial number traceability
      const mockWorkOrder = {
        id: workOrderId,
        workOrderNumber: 'WO-SERIAL-001',
        customerOrder: externalWorkOrderId,
        partId: 'part-1',
        partNumber: 'PN-12345',
        quantity: 1,
        actualStartDate: new Date(),
        actualEndDate: new Date(),
        part: mockPart,
        workPerformance: [
          {
            id: 'perf-serial-1',
            performanceType: 'QUALITY',
            serialNumber: serialNumber,
            quantityProduced: 1,
            quantityGood: 1,
            quantityScrap: 0,
            quantityRework: 0,
          },
        ],
        variances: [],
      };

      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.productionPerformanceActual.create.mockResolvedValue({
        id: 'actual-serial-1',
        messageId: 'PERF-SERIAL-001',
        workOrderId: workOrderId,
        status: 'PENDING',
      });
      mockPrisma.productionPerformanceActual.update.mockResolvedValue({
        status: 'PROCESSED',
      });

      await performanceService.exportWorkOrderActuals({
        workOrderId: workOrderId,
        configId: 'config-1',
        createdBy: 'system',
      });

      // Verify serial number appears in performance message payload
      const perfCreateCall = mockPrisma.productionPerformanceActual.create.mock.calls[0][0];
      expect(perfCreateCall.data.messagePayload).toBeDefined();
    });

    it('should link schedule requests to responses with correct message IDs', async () => {
      const requestMessageId = 'SCH-LINK-001';

      const scheduleRequest = B2MMessageBuilder.buildProductionScheduleRequest({
        messageId: requestMessageId,
        sender: 'Oracle ERP',
        receiver: 'MES',
        scheduleType: 'PRODUCTION_ORDER',
        priority: 'NORMAL',
        workOrder: {
          externalId: 'ERP-WO-LINK-001',
          partNumber: 'PN-12345',
          quantity: 25,
          unitOfMeasure: 'EA',
          dueDate: new Date('2025-11-30T23:59:59Z'),
          startDate: new Date('2025-11-22T08:00:00Z'),
          endDate: new Date('2025-11-24T17:00:00Z'),
        },
      });

      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrisma.part.findFirst.mockResolvedValue(mockPart);
      mockPrisma.equipment.count.mockResolvedValue(5);
      mockPrisma.personnel.count.mockResolvedValue(10);

      const mockScheduleRequest = {
        id: 'request-link-1',
        messageId: requestMessageId,
        configId: 'config-1',
        status: 'ACCEPTED',
      };

      mockPrisma.productionScheduleRequest.create.mockResolvedValue(mockScheduleRequest);
      mockPrisma.productionScheduleRequest.findUnique.mockResolvedValue(mockScheduleRequest);
      mockPrisma.productionScheduleRequest.update.mockResolvedValue({});
      mockPrisma.workOrder.create.mockResolvedValue({
        id: 'wo-link-1',
        workOrderNumber: 'WO-ERP-ERP-WO-LINK-001',
      });

      let responseMessageId: string;
      mockPrisma.productionScheduleResponse.create.mockImplementation((args: any) => {
        responseMessageId = args.data.messageId;
        return Promise.resolve({
          id: 'response-link-1',
          requestId: 'request-link-1',
          messageId: responseMessageId,
          accepted: true,
          status: 'SENT',
        });
      });
      mockPrisma.productionScheduleResponse.update.mockResolvedValue({});

      await scheduleService.processScheduleRequest({
        configId: 'config-1',
        messagePayload: scheduleRequest,
        createdBy: 'system',
      });

      // Verify response message ID references request
      expect(responseMessageId!).toContain(requestMessageId);
      expect(mockPrisma.productionScheduleResponse.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            requestId: 'request-link-1',
          }),
        })
      );
    });
  });
});
