import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { ProductionScheduleSyncService } from '../../services/ProductionScheduleSyncService';
import { ProductionScheduleService } from '../../services/ProductionScheduleService';

// Mock Prisma Client
vi.mock('@prisma/client', () => {
  const mockPrismaClient = {
    integrationConfig: {
      findUnique: vi.fn(),
    },
    part: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    equipment: {
      count: vi.fn(),
    },
    personnel: {
      count: vi.fn(),
    },
    productionScheduleRequest: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    productionScheduleResponse: {
      create: vi.fn(),
      update: vi.fn(),
    },
    workOrder: {
      create: vi.fn(),
    },
  };

  return {
    PrismaClient: vi.fn(() => mockPrismaClient),
    B2MMessageStatus: {
      PENDING: 'PENDING',
      PROCESSED: 'PROCESSED',
      SENT: 'SENT',
      FAILED: 'FAILED',
      ACCEPTED: 'ACCEPTED',
      REJECTED: 'REJECTED',
    },
    ScheduleType: {
      MASTER: 'MASTER',
      DETAILED: 'DETAILED',
      DISPATCH: 'DISPATCH',
    },
    SchedulePriority: {
      LOW: 'LOW',
      NORMAL: 'NORMAL',
      HIGH: 'HIGH',
      URGENT: 'URGENT',
    },
  };
});

describe('ProductionScheduleSyncService', () => {
  let service: ProductionScheduleSyncService;
  let mockPrisma: any;
  let mockScheduleService: any;

  beforeEach(() => {
    mockPrisma = new PrismaClient();
    mockScheduleService = {
      createSchedule: vi.fn(),
      addScheduleEntry: vi.fn(),
    };
    service = new ProductionScheduleSyncService(mockPrisma, mockScheduleService);
    vi.clearAllMocks();
  });

  // ============================================================================
  // INBOUND SCHEDULE REQUEST PROCESSING
  // ============================================================================

  describe('processScheduleRequest', () => {
    const mockConfig = {
      id: 'config-1',
      name: 'Oracle Fusion',
      type: 'ERP',
      enabled: true,
    };

    const mockPart = {
      id: 'part-1',
      partNumber: 'PN-12345',
      description: 'Test Part',
      quantityOnHand: 1000,
      unitOfMeasure: 'EA',
    };

    const validScheduleRequest = {
      messageType: 'ProductionSchedule',
      messageId: 'SCH-REQ-001',
      timestamp: new Date().toISOString(),
      sender: 'Oracle-ERP',
      receiver: 'MES',
      scheduleType: 'MASTER',
      priority: 'NORMAL',
      workOrder: {
        externalId: 'ERP-WO-12345',
        partNumber: 'PN-12345',
        quantity: 100,
        unitOfMeasure: 'EA',
        dueDate: new Date('2025-12-31').toISOString(),
        startDate: new Date('2025-11-01').toISOString(),
        endDate: new Date('2025-12-15').toISOString(),
      },
      resources: {
        personnel: [{ skillCode: 'MACHINIST-L2', quantity: 2 }],
        equipment: [{ equipmentClass: 'PRODUCTION', quantity: 1 }],
        materials: [{ partNumber: 'PN-RAW-001', quantity: 200 }],
      },
    };

    it('should accept and process valid schedule request', async () => {
      const mockRequest = {
        id: 'request-1',
        messageId: 'SCH-REQ-001',
        configId: 'config-1',
        status: 'PENDING',
        requestedDate: new Date(),
      };

      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrisma.part.findFirst.mockResolvedValue(mockPart);
      mockPrisma.part.findUnique.mockResolvedValue({ ...mockPart, quantityOnHand: 500 });
      mockPrisma.equipment.count.mockResolvedValue(5);
      mockPrisma.personnel.count.mockResolvedValue(10);

      mockPrisma.productionScheduleRequest.create.mockResolvedValue(mockRequest);
      mockPrisma.productionScheduleRequest.findUnique.mockResolvedValue(mockRequest);

      mockPrisma.workOrder.create.mockResolvedValue({
        id: 'wo-1',
        orderNumber: 'WO-ERP-ERP-WO-12345',
        partId: 'part-1',
        quantity: 100,
        status: 'CREATED',
      });

      mockPrisma.productionScheduleRequest.update.mockResolvedValue({});

      mockPrisma.productionScheduleResponse.create.mockResolvedValue({
        id: 'response-1',
        requestId: 'request-1',
        messageId: 'SCH-RESP-SCH-REQ-001-123456',
        accepted: true,
        status: 'PENDING',
      });

      mockPrisma.productionScheduleResponse.update.mockResolvedValue({});

      const result = await service.processScheduleRequest({
        configId: 'config-1',
        messagePayload: validScheduleRequest,
        createdBy: 'system',
      });

      expect(result.accepted).toBe(true);
      expect(result.status).toBe('PROCESSED');
      expect(result.workOrderId).toBe('wo-1');
      expect(mockPrisma.productionScheduleRequest.create).toHaveBeenCalledOnce();
      expect(mockPrisma.workOrder.create).toHaveBeenCalledOnce();
      expect(mockPrisma.productionScheduleResponse.create).toHaveBeenCalledOnce();
    });

    it('should reject request if part not found', async () => {
      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrisma.part.findFirst.mockResolvedValue(null);

      const mockRequest = {
        id: 'request-2',
        messageId: 'SCH-REQ-002',
        configId: 'config-1',
        status: 'REJECTED',
      };

      mockPrisma.productionScheduleRequest.create.mockResolvedValue(mockRequest);

      // Mock findUnique to return the created request when sendScheduleResponse calls it
      mockPrisma.productionScheduleRequest.findUnique.mockResolvedValue(mockRequest);

      mockPrisma.productionScheduleResponse.create.mockResolvedValue({
        id: 'response-2',
        requestId: 'request-2',
        accepted: false,
      });

      mockPrisma.productionScheduleResponse.update.mockResolvedValue({});

      const result = await service.processScheduleRequest({
        configId: 'config-1',
        messagePayload: validScheduleRequest,
        createdBy: 'system',
      });

      expect(result.accepted).toBe(false);
      expect(result.status).toBe('FAILED');
      expect(result.errorMessage).toContain('Part PN-12345 not found');
    });

    it('should reject request if integration config disabled', async () => {
      mockPrisma.integrationConfig.findUnique.mockResolvedValue({
        ...mockConfig,
        enabled: false,
      });

      await expect(
        service.processScheduleRequest({
          configId: 'config-1',
          messagePayload: validScheduleRequest,
          createdBy: 'system',
        })
      ).rejects.toThrow('Integration config config-1 is disabled');
    });

    it('should reject request if config not found', async () => {
      mockPrisma.integrationConfig.findUnique.mockResolvedValue(null);

      await expect(
        service.processScheduleRequest({
          configId: 'invalid-config',
          messagePayload: validScheduleRequest,
          createdBy: 'system',
        })
      ).rejects.toThrow('Integration config invalid-config not found');
    });

    it('should reject request with invalid message format', async () => {
      const invalidMessage = {
        messageType: 'InvalidType',
        messageId: 'INVALID',
      };

      await expect(
        service.processScheduleRequest({
          configId: 'config-1',
          messagePayload: invalidMessage,
          createdBy: 'system',
        })
      ).rejects.toThrow();
    });

    it('should reject request if start date is in the past', async () => {
      const pastDateRequest = {
        ...validScheduleRequest,
        workOrder: {
          ...validScheduleRequest.workOrder,
          startDate: new Date('2020-01-01').toISOString(),
          endDate: new Date('2020-02-01').toISOString(),
          dueDate: new Date('2020-02-15').toISOString(),
        },
      };

      const mockRequest = {
        id: 'request-3',
        messageId: 'SCH-REQ-003',
        configId: 'config-1',
        status: 'REJECTED',
      };

      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrisma.part.findFirst.mockResolvedValue(mockPart);
      mockPrisma.part.findUnique.mockResolvedValue(mockPart);

      mockPrisma.productionScheduleRequest.create.mockResolvedValue(mockRequest);
      mockPrisma.productionScheduleRequest.findUnique.mockResolvedValue(mockRequest);

      mockPrisma.productionScheduleResponse.create.mockResolvedValue({
        id: 'response-3',
        accepted: false,
      });

      mockPrisma.productionScheduleResponse.update.mockResolvedValue({});

      const result = await service.processScheduleRequest({
        configId: 'config-1',
        messagePayload: pastDateRequest,
        createdBy: 'system',
      });

      expect(result.accepted).toBe(false);
      expect(result.errorMessage).toContain('Start date is in the past');
    });

    it('should reject request if insufficient materials', async () => {
      const mockRequest = {
        id: 'request-4',
        messageId: 'SCH-REQ-004',
        configId: 'config-1',
        status: 'REJECTED',
      };

      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockConfig);
      // First call for main part PN-12345
      // Second call for material part PN-RAW-001
      mockPrisma.part.findFirst
        .mockResolvedValueOnce(mockPart) // Main part found
        .mockResolvedValueOnce({ // Material part found but insufficient quantity
          id: 'part-raw-001',
          partNumber: 'PN-RAW-001',
          quantityOnHand: 50, // Insufficient (needs 200)
        });

      mockPrisma.part.findUnique.mockResolvedValue({ partNumber: 'PN-RAW-001', quantityOnHand: 50 });
      mockPrisma.equipment.count.mockResolvedValue(5);
      mockPrisma.personnel.count.mockResolvedValue(10);

      mockPrisma.productionScheduleRequest.create.mockResolvedValue(mockRequest);
      mockPrisma.productionScheduleRequest.findUnique.mockResolvedValue(mockRequest);

      mockPrisma.productionScheduleResponse.create.mockResolvedValue({
        id: 'response-4',
        accepted: false,
      });

      mockPrisma.productionScheduleResponse.update.mockResolvedValue({});

      const result = await service.processScheduleRequest({
        configId: 'config-1',
        messagePayload: validScheduleRequest,
        createdBy: 'system',
      });

      expect(result.accepted).toBe(false);
      expect(result.errorMessage).toContain('Insufficient material');
    });

    it('should reject request if insufficient equipment', async () => {
      const mockRequest = {
        id: 'request-5',
        messageId: 'SCH-REQ-005',
        configId: 'config-1',
        status: 'REJECTED',
      };

      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrisma.part.findFirst.mockResolvedValue(mockPart);
      mockPrisma.part.findUnique.mockResolvedValue({ ...mockPart, quantityOnHand: 500 });
      mockPrisma.equipment.count.mockResolvedValue(0); // No equipment available
      mockPrisma.personnel.count.mockResolvedValue(10);

      mockPrisma.productionScheduleRequest.create.mockResolvedValue(mockRequest);
      mockPrisma.productionScheduleRequest.findUnique.mockResolvedValue(mockRequest);

      mockPrisma.productionScheduleResponse.create.mockResolvedValue({
        id: 'response-5',
        accepted: false,
      });

      mockPrisma.productionScheduleResponse.update.mockResolvedValue({});

      const result = await service.processScheduleRequest({
        configId: 'config-1',
        messagePayload: validScheduleRequest,
        createdBy: 'system',
      });

      expect(result.accepted).toBe(false);
      expect(result.errorMessage).toContain('Insufficient equipment');
    });

    it('should reject request if insufficient personnel with required skills', async () => {
      const mockRequest = {
        id: 'request-6',
        messageId: 'SCH-REQ-006',
        configId: 'config-1',
        status: 'REJECTED',
      };

      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrisma.part.findFirst.mockResolvedValue(mockPart);
      mockPrisma.part.findUnique.mockResolvedValue({ ...mockPart, quantityOnHand: 500 });
      mockPrisma.equipment.count.mockResolvedValue(5);
      mockPrisma.personnel.count.mockResolvedValue(1); // Insufficient personnel

      mockPrisma.productionScheduleRequest.create.mockResolvedValue(mockRequest);
      mockPrisma.productionScheduleRequest.findUnique.mockResolvedValue(mockRequest);

      mockPrisma.productionScheduleResponse.create.mockResolvedValue({
        id: 'response-6',
        accepted: false,
      });

      mockPrisma.productionScheduleResponse.update.mockResolvedValue({});

      const result = await service.processScheduleRequest({
        configId: 'config-1',
        messagePayload: validScheduleRequest,
        createdBy: 'system',
      });

      expect(result.accepted).toBe(false);
      expect(result.errorMessage).toContain('Insufficient personnel');
    });
  });

  // ============================================================================
  // SCHEDULE RESPONSE
  // ============================================================================

  describe('sendScheduleResponse', () => {
    it('should send acceptance response successfully', async () => {
      const mockRequest = {
        id: 'request-1',
        messageId: 'SCH-REQ-001',
        configId: 'config-1',
        externalWorkOrderId: 'ERP-WO-12345',
      };

      mockPrisma.productionScheduleRequest.findUnique.mockResolvedValue(mockRequest);

      mockPrisma.productionScheduleResponse.create.mockResolvedValue({
        id: 'response-1',
        requestId: 'request-1',
        messageId: 'SCH-RESP-SCH-REQ-001-123456',
        accepted: true,
        status: 'PENDING',
      });

      mockPrisma.productionScheduleResponse.update.mockResolvedValue({
        id: 'response-1',
        status: 'SENT',
      });

      const result = await service.sendScheduleResponse({
        requestId: 'request-1',
        accepted: true,
        confirmedStartDate: new Date('2025-11-01'),
        confirmedEndDate: new Date('2025-12-15'),
        confirmedQuantity: 100,
        respondedBy: 'system',
        messagePayload: {},
      });

      expect(result.status).toBe('SENT');
      expect(mockPrisma.productionScheduleResponse.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          requestId: 'request-1',
          accepted: true,
          confirmedQuantity: 100,
        }),
      });
    });

    it('should send rejection response with reason', async () => {
      const mockRequest = {
        id: 'request-2',
        messageId: 'SCH-REQ-002',
        configId: 'config-1',
        externalWorkOrderId: 'ERP-WO-67890',
      };

      mockPrisma.productionScheduleRequest.findUnique.mockResolvedValue(mockRequest);

      mockPrisma.productionScheduleResponse.create.mockResolvedValue({
        id: 'response-2',
        requestId: 'request-2',
        messageId: 'SCH-RESP-SCH-REQ-002-123456',
        accepted: false,
        status: 'PENDING',
      });

      mockPrisma.productionScheduleResponse.update.mockResolvedValue({});

      const result = await service.sendScheduleResponse({
        requestId: 'request-2',
        accepted: false,
        rejectionReason: 'Insufficient capacity',
        constraints: { capacityShortage: 50 },
        respondedBy: 'system',
        messagePayload: {},
      });

      expect(result.status).toBe('SENT');
      expect(mockPrisma.productionScheduleResponse.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          requestId: 'request-2',
          accepted: false,
          rejectionReason: 'Insufficient capacity',
        }),
      });
    });

    it('should throw error if request not found', async () => {
      mockPrisma.productionScheduleRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.sendScheduleResponse({
          requestId: 'non-existent',
          accepted: true,
          respondedBy: 'system',
          messagePayload: {},
        })
      ).rejects.toThrow('Production schedule request non-existent not found');
    });
  });

  // ============================================================================
  // STATUS AND RETRIEVAL
  // ============================================================================

  describe('getRequestStatus', () => {
    it('should return request status with response details', async () => {
      const mockRequest = {
        messageId: 'SCH-REQ-001',
        externalWorkOrderId: 'ERP-WO-12345',
        partNumber: 'PN-12345',
        quantity: 100,
        dueDate: new Date('2025-12-31'),
        status: 'ACCEPTED',
        requestedDate: new Date(),
        workOrder: {
          orderNumber: 'WO-ERP-ERP-WO-12345',
          status: 'CREATED',
          quantity: 100,
        },
        response: {
          messageId: 'SCH-RESP-001',
          accepted: true,
          confirmedStartDate: new Date('2025-11-01'),
          confirmedEndDate: new Date('2025-12-15'),
          confirmedQuantity: 100,
          rejectionReason: null,
          constraints: null,
        },
      };

      mockPrisma.productionScheduleRequest.findUnique.mockResolvedValue(mockRequest);

      const result = await service.getRequestStatus('SCH-REQ-001');

      expect(result.messageId).toBe('SCH-REQ-001');
      expect(result.accepted).toBe(true);
      expect(result.workOrderNumber).toBe('WO-ERP-ERP-WO-12345');
      expect(result.response).toBeDefined();
      expect(result.response?.accepted).toBe(true);
    });

    it('should throw error if request not found', async () => {
      mockPrisma.productionScheduleRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.getRequestStatus('non-existent')
      ).rejects.toThrow('Production schedule request non-existent not found');
    });
  });

  describe('getConfigRequests', () => {
    it('should return all requests for a config', async () => {
      const mockRequests = [
        {
          messageId: 'SCH-REQ-001',
          externalWorkOrderId: 'ERP-WO-001',
          partNumber: 'PN-001',
          quantity: 100,
          dueDate: new Date('2025-12-31'),
          status: 'ACCEPTED',
          requestedDate: new Date('2025-10-01'),
          workOrder: {
            orderNumber: 'WO-001',
            status: 'CREATED',
          },
        },
        {
          messageId: 'SCH-REQ-002',
          externalWorkOrderId: 'ERP-WO-002',
          partNumber: 'PN-002',
          quantity: 50,
          dueDate: new Date('2025-11-30'),
          status: 'REJECTED',
          requestedDate: new Date('2025-10-02'),
          workOrder: null,
        },
      ];

      mockPrisma.productionScheduleRequest.findMany.mockResolvedValue(mockRequests);

      const result = await service.getConfigRequests('config-1');

      expect(result).toHaveLength(2);
      expect(result[0].messageId).toBe('SCH-REQ-001');
      expect(result[1].messageId).toBe('SCH-REQ-002');
    });

    it('should filter requests by status', async () => {
      const mockRequests = [
        {
          messageId: 'SCH-REQ-001',
          externalWorkOrderId: 'ERP-WO-001',
          partNumber: 'PN-001',
          quantity: 100,
          dueDate: new Date(),
          status: 'ACCEPTED',
          requestedDate: new Date(),
          workOrder: { orderNumber: 'WO-001', status: 'CREATED' },
        },
      ];

      mockPrisma.productionScheduleRequest.findMany.mockResolvedValue(mockRequests);

      const result = await service.getConfigRequests('config-1', {
        status: 'ACCEPTED',
      });

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('ACCEPTED');
    });

    it('should filter requests by date range', async () => {
      mockPrisma.productionScheduleRequest.findMany.mockResolvedValue([]);

      await service.getConfigRequests('config-1', {
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
      });

      expect(mockPrisma.productionScheduleRequest.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          configId: 'config-1',
          requestedDate: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
        orderBy: { requestedDate: 'desc' },
        include: expect.any(Object),
      });
    });
  });

  // ============================================================================
  // RETRY LOGIC
  // ============================================================================

  describe('retryRequest', () => {
    it('should retry failed request successfully', async () => {
      const mockRequest = {
        messageId: 'SCH-REQ-FAIL-001',
        configId: 'config-1',
        status: 'FAILED',
        requestPayload: {
          messageType: 'ProductionSchedule',
          messageId: 'SCH-REQ-FAIL-001',
          timestamp: new Date().toISOString(),
          sender: 'Oracle-ERP',
          receiver: 'MES',
          scheduleType: 'MASTER',
          priority: 'NORMAL',
          workOrder: {
            externalId: 'ERP-WO-12345',
            partNumber: 'PN-12345',
            quantity: 100,
            unitOfMeasure: 'EA',
            dueDate: new Date('2025-12-31').toISOString(),
            startDate: new Date('2025-11-01').toISOString(),
            endDate: new Date('2025-12-15').toISOString(),
          },
        },
      };

      mockPrisma.productionScheduleRequest.findUnique
        .mockResolvedValueOnce(mockRequest)  // First call in retryRequest
        .mockResolvedValueOnce(mockRequest); // Second call in processScheduleRequest

      mockPrisma.productionScheduleRequest.update.mockResolvedValue({});

      // Mock successful retry
      mockPrisma.integrationConfig.findUnique.mockResolvedValue({
        id: 'config-1',
        enabled: true,
      });

      mockPrisma.part.findFirst.mockResolvedValue({
        id: 'part-1',
        partNumber: 'PN-12345',
      });

      mockPrisma.part.findUnique.mockResolvedValue({ quantityOnHand: 500 });
      mockPrisma.equipment.count.mockResolvedValue(5);
      mockPrisma.personnel.count.mockResolvedValue(10);

      mockPrisma.productionScheduleRequest.create.mockResolvedValue({
        id: 'request-retry',
        status: 'PENDING',
      });

      mockPrisma.workOrder.create.mockResolvedValue({
        id: 'wo-retry',
      });

      mockPrisma.productionScheduleResponse.create.mockResolvedValue({
        id: 'response-retry',
      });

      mockPrisma.productionScheduleResponse.update.mockResolvedValue({});

      const result = await service.retryRequest('SCH-REQ-FAIL-001', 'system');

      expect(result.accepted).toBe(true);
      expect(mockPrisma.productionScheduleRequest.update).toHaveBeenCalledWith({
        where: { messageId: 'SCH-REQ-FAIL-001' },
        data: { status: 'PENDING' },
      });
    });

    it('should throw error if retrying accepted request', async () => {
      mockPrisma.productionScheduleRequest.findUnique.mockResolvedValue({
        messageId: 'SCH-REQ-001',
        status: 'ACCEPTED',
      });

      await expect(
        service.retryRequest('SCH-REQ-001', 'system')
      ).rejects.toThrow('Request SCH-REQ-001 is already accepted, cannot retry');
    });

    it('should throw error if request not found', async () => {
      mockPrisma.productionScheduleRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.retryRequest('non-existent', 'system')
      ).rejects.toThrow('Production schedule request non-existent not found');
    });
  });

  // ============================================================================
  // EDGE CASES AND VALIDATION
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle request without optional resource requirements', async () => {
      const minimalRequest = {
        messageType: 'ProductionSchedule',
        messageId: 'SCH-REQ-MINIMAL',
        timestamp: new Date().toISOString(),
        sender: 'Oracle-ERP',
        receiver: 'MES',
        scheduleType: 'MASTER',
        priority: 'NORMAL',
        workOrder: {
          externalId: 'ERP-WO-MINIMAL',
          partNumber: 'PN-12345',
          quantity: 100,
          unitOfMeasure: 'EA',
          dueDate: new Date('2025-12-31').toISOString(),
          startDate: new Date('2025-11-01').toISOString(),
          endDate: new Date('2025-12-15').toISOString(),
        },
        // No resources specified
      };

      const mockRequest = {
        id: 'request-minimal',
        messageId: 'SCH-REQ-MINIMAL',
        configId: 'config-1',
        status: 'PENDING',
      };

      mockPrisma.integrationConfig.findUnique.mockResolvedValue({
        id: 'config-1',
        enabled: true,
      });

      mockPrisma.part.findFirst.mockResolvedValue({
        id: 'part-1',
        partNumber: 'PN-12345',
      });

      mockPrisma.productionScheduleRequest.create.mockResolvedValue(mockRequest);
      mockPrisma.productionScheduleRequest.findUnique.mockResolvedValue(mockRequest);

      mockPrisma.workOrder.create.mockResolvedValue({
        id: 'wo-minimal',
      });

      mockPrisma.productionScheduleRequest.update.mockResolvedValue({});

      mockPrisma.productionScheduleResponse.create.mockResolvedValue({
        id: 'response-minimal',
      });

      mockPrisma.productionScheduleResponse.update.mockResolvedValue({});

      const result = await service.processScheduleRequest({
        configId: 'config-1',
        messagePayload: minimalRequest,
        createdBy: 'system',
      });

      expect(result.accepted).toBe(true);
    });

    it('should handle request with missing material in database', async () => {
      const requestWithUnknownMaterial = {
        messageType: 'ProductionSchedule',
        messageId: 'SCH-REQ-UNKNOWN-MAT',
        timestamp: new Date().toISOString(),
        sender: 'Oracle-ERP',
        receiver: 'MES',
        scheduleType: 'MASTER',
        priority: 'NORMAL',
        workOrder: {
          externalId: 'ERP-WO-UNK',
          partNumber: 'PN-12345',
          quantity: 100,
          unitOfMeasure: 'EA',
          dueDate: new Date('2025-12-31').toISOString(),
          startDate: new Date('2025-11-01').toISOString(),
          endDate: new Date('2025-12-15').toISOString(),
        },
        resources: {
          materials: [{ partNumber: 'PN-UNKNOWN', quantity: 50 }],
        },
      };

      const mockRequest = {
        id: 'request-unk-mat',
        messageId: 'SCH-REQ-UNKNOWN-MAT',
        configId: 'config-1',
        status: 'REJECTED',
      };

      mockPrisma.integrationConfig.findUnique.mockResolvedValue({
        id: 'config-1',
        enabled: true,
      });

      mockPrisma.part.findFirst
        .mockResolvedValueOnce({ id: 'part-1', partNumber: 'PN-12345' })
        .mockResolvedValueOnce(null); // Unknown material

      mockPrisma.productionScheduleRequest.create.mockResolvedValue(mockRequest);
      mockPrisma.productionScheduleRequest.findUnique.mockResolvedValue(mockRequest);

      mockPrisma.productionScheduleResponse.create.mockResolvedValue({
        id: 'response-unk-mat',
      });

      mockPrisma.productionScheduleResponse.update.mockResolvedValue({});

      const result = await service.processScheduleRequest({
        configId: 'config-1',
        messagePayload: requestWithUnknownMaterial,
        createdBy: 'system',
      });

      expect(result.accepted).toBe(false);
      expect(result.errorMessage).toContain('Material PN-UNKNOWN not found');
    });
  });
});
