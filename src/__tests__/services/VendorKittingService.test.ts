/**
 * Unit Tests for Vendor Kitting Service
 *
 * Comprehensive test suite covering vendor kit management functionality including
 * vendor kit requests, status updates, quality inspections, and performance analytics.
 */

import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

import { VendorKittingService } from '../../services/VendorKittingService';
import {
  KittingError,
  KittingErrorType,
  KittingErrorSeverity
} from '../../utils/kittingErrors';

// Mock Prisma client
const prismaMock = mockDeep<PrismaClient>();
type MockContext = {
  prisma: DeepMockProxy<PrismaClient>;
};

const createMockContext = (): MockContext => {
  return {
    prisma: prismaMock,
  };
};

describe('VendorKittingService', () => {
  let service: VendorKittingService;
  let mockContext: MockContext;

  beforeEach(() => {
    mockContext = createMockContext();
    service = new VendorKittingService(mockContext.prisma);
    mockReset(prismaMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('requestVendorKit', () => {
    const mockVendorId = 'vendor-123';
    const mockWorkOrderId = 'wo-456';
    const mockRequesterId = 'user-789';

    const mockVendor = {
      id: mockVendorId,
      code: 'VENDOR001',
      name: 'Test Vendor Inc.',
      contactEmail: 'vendor@test.com',
      isActive: true,
      preferredVendor: true,
      qualityRating: 95.5,
      onTimeDeliveryRate: 98.2,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockWorkOrder = {
      id: mockWorkOrderId,
      partId: 'part-123',
      quantity: 5,
      partNumber: 'TEST-ASSEMBLY-001',
      description: 'Test assembly for vendor kitting',
      status: 'OPEN',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockParts = [
      {
        id: 'part-comp-1',
        partNumber: 'COMP-001',
        partName: 'Component 1',
        description: 'First component',
        isActive: true,
        makeOrBuy: 'BUY'
      },
      {
        id: 'part-comp-2',
        partNumber: 'COMP-002',
        partName: 'Component 2',
        description: 'Second component',
        isActive: true,
        makeOrBuy: 'BUY'
      }
    ];

    const mockVendorKitRequest = {
      vendorId: mockVendorId,
      workOrderId: mockWorkOrderId,
      kitSpecification: {
        kitName: 'Test Vendor Kit',
        assemblyStage: 'ASSEMBLY',
        priority: 'NORMAL' as const,
        requiredDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        specialInstructions: 'Handle with care'
      },
      kitItems: [
        {
          partId: 'part-comp-1',
          requiredQuantity: 10,
          specifications: { material: 'Aluminum' },
          qualityRequirements: ['AS9100']
        },
        {
          partId: 'part-comp-2',
          requiredQuantity: 5,
          specifications: { coating: 'Anodized' },
          qualityRequirements: ['ISO9001']
        }
      ],
      deliveryLocation: {
        locationId: 'loc-staging-01',
        contactPerson: 'John Doe',
        specialHandling: ['Fragile']
      },
      qualityRequirements: {
        inspectionLevel: 'ENHANCED' as const,
        certificationRequired: true,
        testRequirements: ['Dimensional', 'Material'],
        complianceStandards: ['AS9100', 'ISO9001']
      }
    };

    const mockCreatedVendorKit = {
      id: 'vendor-kit-123',
      vendorKitNumber: 'VK-VENDOR001-001',
      vendorId: mockVendorId,
      workOrderId: mockWorkOrderId,
      status: 'REQUESTED',
      kitName: 'Test Vendor Kit',
      priority: 'NORMAL',
      requestedDate: new Date(),
      requiredDeliveryDate: mockVendorKitRequest.kitSpecification.requiredDeliveryDate,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should successfully request a vendor kit', async () => {
      // Mock vendor validation
      prismaMock.vendor.findUnique.mockResolvedValue(mockVendor);

      // Mock work order validation
      prismaMock.workOrder.findUnique.mockResolvedValue(mockWorkOrder);

      // Mock parts validation
      prismaMock.part.findMany.mockResolvedValue(mockParts);

      // Mock transaction execution
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          ...prismaMock,
          vendorKit: {
            ...prismaMock.vendorKit,
            create: jest.fn().mockResolvedValue(mockCreatedVendorKit)
          },
          vendorKitItem: {
            ...prismaMock.vendorKitItem,
            create: jest.fn().mockResolvedValue({})
          },
          vendorKitHistory: {
            ...prismaMock.vendorKitHistory,
            create: jest.fn().mockResolvedValue({})
          }
        };
        return await callback(mockTx as any);
      });

      // Mock vendor kit number generation
      jest.spyOn(service as any, 'generateVendorKitNumber')
        .mockResolvedValue('VK-VENDOR001-001');

      // Mock vendor notification
      jest.spyOn(service as any, 'notifyVendor')
        .mockResolvedValue(undefined);

      const result = await service.requestVendorKit(mockVendorKitRequest, mockRequesterId);

      expect(result).toEqual(mockCreatedVendorKit);
      expect(prismaMock.vendor.findUnique).toHaveBeenCalledWith({
        where: { id: mockVendorId }
      });
      expect(prismaMock.workOrder.findUnique).toHaveBeenCalledWith({
        where: { id: mockWorkOrderId }
      });
      expect(prismaMock.part.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['part-comp-1', 'part-comp-2'] } }
      });
    });

    it('should throw KittingError for non-existent vendor', async () => {
      prismaMock.vendor.findUnique.mockResolvedValue(null);

      await expect(service.requestVendorKit(mockVendorKitRequest, mockRequesterId))
        .rejects
        .toThrow(KittingError);

      await expect(service.requestVendorKit(mockVendorKitRequest, mockRequesterId))
        .rejects
        .toMatchObject({
          type: KittingErrorType.SUPPLIER_UNAVAILABLE,
          context: expect.objectContaining({
            vendorId: mockVendorId
          })
        });
    });

    it('should throw KittingError for inactive vendor', async () => {
      const inactiveVendor = { ...mockVendor, isActive: false };
      prismaMock.vendor.findUnique.mockResolvedValue(inactiveVendor);

      await expect(service.requestVendorKit(mockVendorKitRequest, mockRequesterId))
        .rejects
        .toThrow(KittingError);

      await expect(service.requestVendorKit(mockVendorKitRequest, mockRequesterId))
        .rejects
        .toMatchObject({
          type: KittingErrorType.SUPPLIER_UNAVAILABLE,
          context: expect.objectContaining({
            vendorName: mockVendor.name
          })
        });
    });

    it('should throw KittingError for invalid work order', async () => {
      prismaMock.vendor.findUnique.mockResolvedValue(mockVendor);
      prismaMock.workOrder.findUnique.mockResolvedValue(null);

      await expect(service.requestVendorKit(mockVendorKitRequest, mockRequesterId))
        .rejects
        .toThrow(KittingError);

      await expect(service.requestVendorKit(mockVendorKitRequest, mockRequesterId))
        .rejects
        .toMatchObject({
          type: KittingErrorType.INVALID_WORK_ORDER,
          context: expect.objectContaining({
            workOrderId: mockWorkOrderId
          })
        });
    });

    it('should throw KittingError for missing parts', async () => {
      prismaMock.vendor.findUnique.mockResolvedValue(mockVendor);
      prismaMock.workOrder.findUnique.mockResolvedValue(mockWorkOrder);

      // Return only one part instead of two
      prismaMock.part.findMany.mockResolvedValue([mockParts[0]]);

      await expect(service.requestVendorKit(mockVendorKitRequest, mockRequesterId))
        .rejects
        .toThrow(KittingError);

      await expect(service.requestVendorKit(mockVendorKitRequest, mockRequesterId))
        .rejects
        .toMatchObject({
          type: KittingErrorType.BOM_NOT_FOUND,
          context: expect.objectContaining({
            missingPartIds: ['part-comp-2']
          })
        });
    });

    it('should throw KittingError for invalid quantities', async () => {
      const invalidQuantityRequest = {
        ...mockVendorKitRequest,
        kitItems: [
          {
            partId: 'part-comp-1',
            requiredQuantity: -5, // Invalid negative quantity
            specifications: {},
            qualityRequirements: []
          }
        ]
      };

      prismaMock.vendor.findUnique.mockResolvedValue(mockVendor);
      prismaMock.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      prismaMock.part.findMany.mockResolvedValue([mockParts[0]]);

      prismaMock.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          ...prismaMock,
          vendorKit: {
            ...prismaMock.vendorKit,
            create: jest.fn().mockResolvedValue(mockCreatedVendorKit)
          }
        };
        return await callback(mockTx as any);
      });

      jest.spyOn(service as any, 'generateVendorKitNumber')
        .mockResolvedValue('VK-VENDOR001-001');

      await expect(service.requestVendorKit(invalidQuantityRequest, mockRequesterId))
        .rejects
        .toThrow(KittingError);

      await expect(service.requestVendorKit(invalidQuantityRequest, mockRequesterId))
        .rejects
        .toMatchObject({
          type: KittingErrorType.INVALID_QUANTITY,
          context: expect.objectContaining({
            quantity: -5
          })
        });
    });

    it('should handle vendor notification failures gracefully', async () => {
      prismaMock.vendor.findUnique.mockResolvedValue(mockVendor);
      prismaMock.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      prismaMock.part.findMany.mockResolvedValue(mockParts);

      prismaMock.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          ...prismaMock,
          vendorKit: {
            ...prismaMock.vendorKit,
            create: jest.fn().mockResolvedValue(mockCreatedVendorKit)
          },
          vendorKitItem: {
            ...prismaMock.vendorKitItem,
            create: jest.fn().mockResolvedValue({})
          },
          vendorKitHistory: {
            ...prismaMock.vendorKitHistory,
            create: jest.fn().mockResolvedValue({})
          }
        };
        return await callback(mockTx as any);
      });

      jest.spyOn(service as any, 'generateVendorKitNumber')
        .mockResolvedValue('VK-VENDOR001-001');

      // Mock notification failure
      jest.spyOn(service as any, 'notifyVendor')
        .mockRejectedValue(new Error('Email service unavailable'));

      // Should still succeed despite notification failure
      const result = await service.requestVendorKit(mockVendorKitRequest, mockRequesterId);

      expect(result).toEqual(mockCreatedVendorKit);
    });

    it('should handle database transaction failures', async () => {
      prismaMock.vendor.findUnique.mockResolvedValue(mockVendor);
      prismaMock.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      prismaMock.part.findMany.mockResolvedValue(mockParts);

      // Mock transaction failure
      prismaMock.$transaction.mockRejectedValue(new Error('Database transaction failed'));

      await expect(service.requestVendorKit(mockVendorKitRequest, mockRequesterId))
        .rejects
        .toThrow(KittingError);

      await expect(service.requestVendorKit(mockVendorKitRequest, mockRequesterId))
        .rejects
        .toMatchObject({
          type: KittingErrorType.VENDOR_REQUEST_FAILED,
          context: expect.objectContaining({
            vendorId: mockVendorId,
            workOrderId: mockWorkOrderId
          })
        });
    });
  });

  describe('updateVendorKitStatus', () => {
    const mockVendorKitId = 'vendor-kit-123';
    const mockUserId = 'user-456';

    const mockVendorKit = {
      id: mockVendorKitId,
      vendorKitNumber: 'VK-VENDOR001-001',
      vendorId: 'vendor-123',
      status: 'REQUESTED',
      kitName: 'Test Vendor Kit',
      priority: 'NORMAL',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should successfully update vendor kit status', async () => {
      const updatedVendorKit = { ...mockVendorKit, status: 'ACKNOWLEDGED' };

      prismaMock.vendorKit.findUnique.mockResolvedValue(mockVendorKit);
      prismaMock.vendorKit.update.mockResolvedValue(updatedVendorKit);
      prismaMock.vendorKitHistory.create.mockResolvedValue({});

      const result = await service.updateVendorKitStatus(
        mockVendorKitId,
        'ACKNOWLEDGED',
        mockUserId,
        'Vendor confirmed receipt of request'
      );

      expect(result).toEqual(updatedVendorKit);
      expect(prismaMock.vendorKit.update).toHaveBeenCalledWith({
        where: { id: mockVendorKitId },
        data: { status: 'ACKNOWLEDGED', updatedAt: expect.any(Date) }
      });
      expect(prismaMock.vendorKitHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          vendorKitId: mockVendorKitId,
          action: 'STATUS_UPDATED',
          userId: mockUserId,
          notes: expect.stringContaining('Vendor confirmed receipt')
        })
      });
    });

    it('should throw KittingError for non-existent vendor kit', async () => {
      prismaMock.vendorKit.findUnique.mockResolvedValue(null);

      await expect(service.updateVendorKitStatus(mockVendorKitId, 'ACKNOWLEDGED', mockUserId))
        .rejects
        .toThrow(KittingError);

      await expect(service.updateVendorKitStatus(mockVendorKitId, 'ACKNOWLEDGED', mockUserId))
        .rejects
        .toMatchObject({
          type: KittingErrorType.VENDOR_REQUEST_FAILED,
          context: expect.objectContaining({
            vendorKitId: mockVendorKitId
          })
        });
    });

    it('should validate status transitions', async () => {
      const completedVendorKit = { ...mockVendorKit, status: 'ACCEPTED' };
      prismaMock.vendorKit.findUnique.mockResolvedValue(completedVendorKit);

      // Try to change from ACCEPTED back to REQUESTED (invalid transition)
      await expect(service.updateVendorKitStatus(mockVendorKitId, 'REQUESTED', mockUserId))
        .rejects
        .toThrow(KittingError);

      await expect(service.updateVendorKitStatus(mockVendorKitId, 'REQUESTED', mockUserId))
        .rejects
        .toMatchObject({
          type: KittingErrorType.INVALID_STATUS_TRANSITION
        });
    });
  });

  describe('receiveVendorKit', () => {
    const mockVendorKitId = 'vendor-kit-123';
    const mockUserId = 'user-456';

    const mockVendorKit = {
      id: mockVendorKitId,
      vendorKitNumber: 'VK-VENDOR001-001',
      vendorId: 'vendor-123',
      status: 'SHIPPED',
      kitName: 'Test Vendor Kit',
      priority: 'NORMAL',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockReceiptData = {
      actualReceiveDate: new Date(),
      trackingNumber: 'TRK123456789',
      deliveryNotes: 'Package delivered in good condition',
      items: [
        {
          vendorKitItemId: 'item-1',
          quantityReceived: 10,
          lotNumber: 'LOT001',
          serialNumbers: ['SN001', 'SN002'],
          notes: 'All items received'
        }
      ]
    };

    it('should successfully receive vendor kit', async () => {
      const receivedVendorKit = { ...mockVendorKit, status: 'RECEIVED' };

      prismaMock.vendorKit.findUnique.mockResolvedValue(mockVendorKit);
      prismaMock.vendorKit.update.mockResolvedValue(receivedVendorKit);
      prismaMock.vendorKitItem.update.mockResolvedValue({});
      prismaMock.vendorKitHistory.create.mockResolvedValue({});

      const result = await service.receiveVendorKit(mockVendorKitId, mockReceiptData, mockUserId);

      expect(result).toEqual(receivedVendorKit);
      expect(prismaMock.vendorKit.update).toHaveBeenCalledWith({
        where: { id: mockVendorKitId },
        data: expect.objectContaining({
          status: 'RECEIVED',
          actualReceiveDate: mockReceiptData.actualReceiveDate,
          trackingNumber: mockReceiptData.trackingNumber
        })
      });
    });

    it('should throw KittingError for invalid kit status', async () => {
      const invalidStatusKit = { ...mockVendorKit, status: 'REQUESTED' };
      prismaMock.vendorKit.findUnique.mockResolvedValue(invalidStatusKit);

      await expect(service.receiveVendorKit(mockVendorKitId, mockReceiptData, mockUserId))
        .rejects
        .toThrow(KittingError);

      await expect(service.receiveVendorKit(mockVendorKitId, mockReceiptData, mockUserId))
        .rejects
        .toMatchObject({
          type: KittingErrorType.INVALID_STATUS_TRANSITION
        });
    });
  });

  describe('performInspection', () => {
    const mockVendorKitId = 'vendor-kit-123';
    const mockUserId = 'user-456';

    const mockVendorKit = {
      id: mockVendorKitId,
      vendorKitNumber: 'VK-VENDOR001-001',
      vendorId: 'vendor-123',
      status: 'RECEIVED',
      kitName: 'Test Vendor Kit',
      priority: 'NORMAL',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockInspectionData = {
      inspectionType: 'RECEIVING' as const,
      result: 'PASS' as const,
      conformingQuantity: 10,
      nonConformingQuantity: 0,
      notes: 'All items passed inspection',
      correctionRequired: false,
      certificatesReceived: true
    };

    it('should successfully perform vendor kit inspection', async () => {
      const mockInspection = {
        id: 'inspection-123',
        vendorKitId: mockVendorKitId,
        inspectorId: mockUserId,
        inspectionType: 'RECEIVING',
        result: 'PASS',
        conformingQuantity: 10,
        nonConformingQuantity: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.vendorKit.findUnique.mockResolvedValue(mockVendorKit);
      prismaMock.vendorKitInspection.create.mockResolvedValue(mockInspection);
      prismaMock.vendorKit.update.mockResolvedValue({ ...mockVendorKit, status: 'INSPECTING' });

      const result = await service.performInspection(mockVendorKitId, mockInspectionData, mockUserId);

      expect(result).toEqual(mockInspection);
      expect(prismaMock.vendorKitInspection.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          vendorKitId: mockVendorKitId,
          inspectorId: mockUserId,
          inspectionType: 'RECEIVING',
          result: 'PASS'
        })
      });
    });

    it('should handle inspection failures', async () => {
      const failedInspectionData = {
        ...mockInspectionData,
        result: 'FAIL' as const,
        conformingQuantity: 8,
        nonConformingQuantity: 2,
        correctionRequired: true,
        notes: 'Found 2 defective items requiring replacement'
      };

      const mockFailedInspection = {
        id: 'inspection-124',
        vendorKitId: mockVendorKitId,
        inspectorId: mockUserId,
        inspectionType: 'RECEIVING',
        result: 'FAIL',
        conformingQuantity: 8,
        nonConformingQuantity: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.vendorKit.findUnique.mockResolvedValue(mockVendorKit);
      prismaMock.vendorKitInspection.create.mockResolvedValue(mockFailedInspection);
      prismaMock.vendorKit.update.mockResolvedValue({ ...mockVendorKit, status: 'REJECTED' });

      const result = await service.performInspection(mockVendorKitId, failedInspectionData, mockUserId);

      expect(result).toEqual(mockFailedInspection);
      expect(prismaMock.vendorKit.update).toHaveBeenCalledWith({
        where: { id: mockVendorKitId },
        data: expect.objectContaining({ status: 'REJECTED' })
      });
    });

    it('should throw KittingError for vendor kit not ready for inspection', async () => {
      const notReadyKit = { ...mockVendorKit, status: 'REQUESTED' };
      prismaMock.vendorKit.findUnique.mockResolvedValue(notReadyKit);

      await expect(service.performInspection(mockVendorKitId, mockInspectionData, mockUserId))
        .rejects
        .toThrow(KittingError);

      await expect(service.performInspection(mockVendorKitId, mockInspectionData, mockUserId))
        .rejects
        .toMatchObject({
          type: KittingErrorType.VENDOR_INSPECTION_FAILED
        });
    });
  });

  describe('getVendorPerformance', () => {
    const mockVendorId = 'vendor-123';

    it('should calculate vendor performance metrics', async () => {
      const mockMetrics = [
        {
          id: 'metric-1',
          vendorId: mockVendorId,
          metricType: 'ON_TIME_DELIVERY',
          metricPeriod: new Date(),
          periodType: 'MONTHLY',
          value: 95.5,
          target: 90.0,
          unit: '%',
          calculatedAt: new Date()
        },
        {
          id: 'metric-2',
          vendorId: mockVendorId,
          metricType: 'QUALITY_RATING',
          metricPeriod: new Date(),
          periodType: 'MONTHLY',
          value: 98.2,
          target: 95.0,
          unit: '%',
          calculatedAt: new Date()
        }
      ];

      prismaMock.vendorPerformanceMetric.findMany.mockResolvedValue(mockMetrics);

      const result = await service.getVendorPerformance(mockVendorId, {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date()
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        metricType: 'ON_TIME_DELIVERY',
        value: 95.5,
        target: 90.0
      });
    });

    it('should handle vendor with no performance metrics', async () => {
      prismaMock.vendorPerformanceMetric.findMany.mockResolvedValue([]);

      const result = await service.getVendorPerformance(mockVendorId, {});

      expect(result).toHaveLength(0);
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle database connection failures', async () => {
      const mockVendorKitRequest = {
        vendorId: 'vendor-123',
        workOrderId: 'wo-456',
        kitSpecification: {
          kitName: 'Test Kit',
          priority: 'NORMAL' as const,
          requiredDeliveryDate: new Date()
        },
        kitItems: [],
        deliveryLocation: {
          locationId: 'loc-1',
          contactPerson: 'John Doe'
        },
        qualityRequirements: {
          inspectionLevel: 'STANDARD' as const,
          certificationRequired: false,
          complianceStandards: []
        }
      };

      prismaMock.vendor.findUnique.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.requestVendorKit(mockVendorKitRequest, 'user-123'))
        .rejects
        .toThrow(KittingError);

      await expect(service.requestVendorKit(mockVendorKitRequest, 'user-123'))
        .rejects
        .toMatchObject({
          type: KittingErrorType.VENDOR_REQUEST_FAILED
        });
    });

    it('should handle concurrent modifications gracefully', async () => {
      const mockVendorKitId = 'vendor-kit-123';
      const mockUserId = 'user-456';

      // Mock concurrent modification error
      prismaMock.vendorKit.findUnique.mockResolvedValue({
        id: mockVendorKitId,
        status: 'REQUESTED',
        updatedAt: new Date()
      });

      prismaMock.vendorKit.update.mockRejectedValue(
        new Error('Record was modified by another user')
      );

      await expect(service.updateVendorKitStatus(mockVendorKitId, 'ACKNOWLEDGED', mockUserId))
        .rejects
        .toThrow(KittingError);
    });

    it('should validate inspection data integrity', async () => {
      const mockVendorKitId = 'vendor-kit-123';
      const mockUserId = 'user-456';

      const invalidInspectionData = {
        inspectionType: 'RECEIVING' as const,
        result: 'PASS' as const,
        conformingQuantity: -5, // Invalid negative quantity
        nonConformingQuantity: 0,
        notes: 'Invalid inspection data'
      };

      const mockVendorKit = {
        id: mockVendorKitId,
        status: 'RECEIVED',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.vendorKit.findUnique.mockResolvedValue(mockVendorKit);

      await expect(service.performInspection(mockVendorKitId, invalidInspectionData, mockUserId))
        .rejects
        .toThrow(KittingError);

      await expect(service.performInspection(mockVendorKitId, invalidInspectionData, mockUserId))
        .rejects
        .toMatchObject({
          type: KittingErrorType.INVALID_QUANTITY
        });
    });
  });
});