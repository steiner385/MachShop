/**
 * Unit Tests for Kit Generation Service
 *
 * Comprehensive test suite covering kit generation functionality including
 * BOM analysis, shortage detection, error handling, and vendor kit integration.
 */

import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

import { KitGenerationService } from '../../services/KitGenerationService';
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

describe('KitGenerationService', () => {
  let service: KitGenerationService;
  let mockContext: MockContext;

  beforeEach(() => {
    mockContext = createMockContext();
    service = new KitGenerationService(mockContext.prisma);
    mockReset(prismaMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateKitsForWorkOrder', () => {
    const mockWorkOrderId = 'wo-test-123';
    const mockPartId = 'part-test-456';

    const mockWorkOrder = {
      id: mockWorkOrderId,
      partId: mockPartId,
      quantity: 5,
      partNumber: 'TEST-PART-001',
      description: 'Test Assembly Part',
      status: 'OPEN',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockBOMItems = [
      {
        id: 'bom-item-1',
        parentPartId: mockPartId,
        componentPartId: 'component-1',
        quantity: 2,
        unitOfMeasure: 'EA',
        isActive: true,
        effectiveDate: null,
        obsoleteDate: null,
        componentPart: {
          id: 'component-1',
          partNumber: 'COMP-001',
          partName: 'Component 1',
          description: 'First component',
          unitOfMeasure: 'EA',
          isActive: true,
          makeOrBuy: 'MAKE'
        }
      },
      {
        id: 'bom-item-2',
        parentPartId: mockPartId,
        componentPartId: 'component-2',
        quantity: 1,
        unitOfMeasure: 'EA',
        isActive: true,
        effectiveDate: null,
        obsoleteDate: null,
        componentPart: {
          id: 'component-2',
          partNumber: 'COMP-002',
          partName: 'Component 2',
          description: 'Second component',
          unitOfMeasure: 'EA',
          isActive: true,
          makeOrBuy: 'BUY'
        }
      }
    ];

    const mockInventory = [
      {
        id: 'inv-1',
        partId: 'component-1',
        quantity: 100,
        location: 'A1-B2-C3',
        lotNumber: 'LOT001',
        receivedDate: new Date(),
        isActive: true
      },
      {
        id: 'inv-2',
        partId: 'component-2',
        quantity: 50,
        location: 'A2-B3-C4',
        lotNumber: 'LOT002',
        receivedDate: new Date(),
        isActive: true
      }
    ];

    it('should successfully generate kits for a valid work order', async () => {
      // Mock work order lookup
      prismaMock.workOrder.findUnique.mockResolvedValue(mockWorkOrder);

      // Mock BOM traversal
      prismaMock.bOMItem.findMany.mockResolvedValueOnce(mockBOMItems);
      prismaMock.bOMItem.findMany.mockResolvedValue([]); // No sub-components

      // Mock inventory lookup
      prismaMock.inventory.findMany.mockResolvedValue(mockInventory);

      // Mock kit creation transaction
      const mockKit = {
        id: 'kit-123',
        kitNumber: 'KIT-001',
        workOrderId: mockWorkOrderId,
        status: 'PLANNED',
        priority: 'NORMAL',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.$transaction.mockImplementation(async (callback) => {
        return await callback(prismaMock);
      });

      prismaMock.kit.create.mockResolvedValue(mockKit);
      prismaMock.kitItem.createMany.mockResolvedValue({ count: 2 });

      const options = {
        workOrderId: mockWorkOrderId,
        priority: 'NORMAL' as const,
        scrapFactor: 0.05,
        autoStage: true
      };

      const result = await service.generateKitsForWorkOrder(options);

      expect(result).toBeDefined();
      expect(result.kits).toHaveLength(1);
      expect(result.analysis.totalItems).toBe(2);
      expect(result.shortages).toHaveLength(0);
      expect(prismaMock.workOrder.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockWorkOrderId }
        })
      );
    });

    it('should throw KittingError for invalid work order', async () => {
      prismaMock.workOrder.findUnique.mockResolvedValue(null);

      const options = {
        workOrderId: 'invalid-wo-id',
        priority: 'NORMAL' as const
      };

      await expect(service.generateKitsForWorkOrder(options))
        .rejects
        .toThrow(KittingError);

      await expect(service.generateKitsForWorkOrder(options))
        .rejects
        .toMatchObject({
          type: KittingErrorType.INVALID_WORK_ORDER,
          context: expect.objectContaining({
            workOrderId: 'invalid-wo-id'
          })
        });
    });

    it('should throw KittingError for work order without part', async () => {
      const invalidWorkOrder = { ...mockWorkOrder, partId: null };
      prismaMock.workOrder.findUnique.mockResolvedValue(invalidWorkOrder);

      const options = {
        workOrderId: mockWorkOrderId,
        priority: 'NORMAL' as const
      };

      await expect(service.generateKitsForWorkOrder(options))
        .rejects
        .toThrow(KittingError);

      await expect(service.generateKitsForWorkOrder(options))
        .rejects
        .toMatchObject({
          type: KittingErrorType.INVALID_WORK_ORDER
        });
    });

    it('should detect and throw error for circular BOM references', async () => {
      prismaMock.workOrder.findUnique.mockResolvedValue(mockWorkOrder);

      // Mock circular BOM structure
      const circularBOMItems = [
        {
          id: 'bom-circular-1',
          parentPartId: mockPartId,
          componentPartId: 'circular-part-1',
          quantity: 1,
          unitOfMeasure: 'EA',
          isActive: true,
          effectiveDate: null,
          obsoleteDate: null,
          componentPart: {
            id: 'circular-part-1',
            partNumber: 'CIRCULAR-001',
            partName: 'Circular Part 1',
            description: 'Part causing circular reference',
            unitOfMeasure: 'EA',
            isActive: true,
            makeOrBuy: 'MAKE'
          }
        }
      ];

      const circularSubBOMItems = [
        {
          id: 'bom-circular-2',
          parentPartId: 'circular-part-1',
          componentPartId: mockPartId, // Points back to original part
          quantity: 1,
          unitOfMeasure: 'EA',
          isActive: true,
          effectiveDate: null,
          obsoleteDate: null,
          componentPart: mockWorkOrder
        }
      ];

      prismaMock.bOMItem.findMany
        .mockResolvedValueOnce(circularBOMItems) // First level
        .mockResolvedValueOnce(circularSubBOMItems); // Circular reference

      const options = {
        workOrderId: mockWorkOrderId,
        priority: 'NORMAL' as const
      };

      await expect(service.generateKitsForWorkOrder(options))
        .rejects
        .toThrow(KittingError);

      await expect(service.generateKitsForWorkOrder(options))
        .rejects
        .toMatchObject({
          type: KittingErrorType.CIRCULAR_BOM_REFERENCE
        });
    });

    it('should identify critical shortages and throw error', async () => {
      prismaMock.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      prismaMock.bOMItem.findMany.mockResolvedValueOnce(mockBOMItems);
      prismaMock.bOMItem.findMany.mockResolvedValue([]); // No sub-components

      // Mock insufficient inventory (shortage > 50% of required)
      const insufficientInventory = [
        {
          id: 'inv-1',
          partId: 'component-1',
          quantity: 1, // Need 10 (5 WO qty * 2 BOM qty), have only 1 = 90% shortage
          location: 'A1-B2-C3',
          lotNumber: 'LOT001',
          receivedDate: new Date(),
          isActive: true
        }
      ];

      prismaMock.inventory.findMany.mockResolvedValue(insufficientInventory);

      const options = {
        workOrderId: mockWorkOrderId,
        priority: 'NORMAL' as const
      };

      await expect(service.generateKitsForWorkOrder(options))
        .rejects
        .toThrow(KittingError);

      await expect(service.generateKitsForWorkOrder(options))
        .rejects
        .toMatchObject({
          type: KittingErrorType.CRITICAL_SHORTAGE,
          context: expect.objectContaining({
            criticalShortages: expect.arrayContaining([
              expect.objectContaining({
                partNumber: 'COMP-001'
              })
            ])
          })
        });
    });

    it('should handle BOM analysis errors', async () => {
      prismaMock.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      prismaMock.bOMItem.findMany.mockRejectedValue(new Error('Database connection failed'));

      const options = {
        workOrderId: mockWorkOrderId,
        priority: 'NORMAL' as const
      };

      await expect(service.generateKitsForWorkOrder(options))
        .rejects
        .toThrow(KittingError);

      await expect(service.generateKitsForWorkOrder(options))
        .rejects
        .toMatchObject({
          type: KittingErrorType.BOM_ANALYSIS_FAILED,
          context: expect.objectContaining({
            partId: mockPartId
          })
        });
    });

    it('should handle database transaction failures', async () => {
      prismaMock.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      prismaMock.bOMItem.findMany.mockResolvedValueOnce(mockBOMItems);
      prismaMock.bOMItem.findMany.mockResolvedValue([]);
      prismaMock.inventory.findMany.mockResolvedValue(mockInventory);

      // Mock transaction failure
      prismaMock.$transaction.mockRejectedValue(new Error('Transaction failed'));

      const options = {
        workOrderId: mockWorkOrderId,
        priority: 'NORMAL' as const
      };

      await expect(service.generateKitsForWorkOrder(options))
        .rejects
        .toThrow(KittingError);

      await expect(service.generateKitsForWorkOrder(options))
        .rejects
        .toMatchObject({
          type: KittingErrorType.DATA_INTEGRITY_VIOLATION
        });
    });

    it('should generate multiple kits when maxKitSize is specified', async () => {
      prismaMock.workOrder.findUnique.mockResolvedValue(mockWorkOrder);

      // Mock larger BOM with more items
      const largeBOMItems = [
        ...mockBOMItems,
        {
          id: 'bom-item-3',
          parentPartId: mockPartId,
          componentPartId: 'component-3',
          quantity: 1,
          unitOfMeasure: 'EA',
          isActive: true,
          effectiveDate: null,
          obsoleteDate: null,
          componentPart: {
            id: 'component-3',
            partNumber: 'COMP-003',
            partName: 'Component 3',
            description: 'Third component',
            unitOfMeasure: 'EA',
            isActive: true,
            makeOrBuy: 'BUY'
          }
        }
      ];

      prismaMock.bOMItem.findMany.mockResolvedValueOnce(largeBOMItems);
      prismaMock.bOMItem.findMany.mockResolvedValue([]);
      prismaMock.inventory.findMany.mockResolvedValue([
        ...mockInventory,
        {
          id: 'inv-3',
          partId: 'component-3',
          quantity: 25,
          location: 'A3-B4-C5',
          lotNumber: 'LOT003',
          receivedDate: new Date(),
          isActive: true
        }
      ]);

      // Mock multiple kit creation
      const mockKits = [
        {
          id: 'kit-123',
          kitNumber: 'KIT-001',
          workOrderId: mockWorkOrderId,
          status: 'PLANNED',
          priority: 'NORMAL',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'kit-124',
          kitNumber: 'KIT-002',
          workOrderId: mockWorkOrderId,
          status: 'PLANNED',
          priority: 'NORMAL',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      prismaMock.$transaction.mockImplementation(async (callback) => {
        return await callback(prismaMock);
      });

      prismaMock.kit.create
        .mockResolvedValueOnce(mockKits[0])
        .mockResolvedValueOnce(mockKits[1]);
      prismaMock.kitItem.createMany.mockResolvedValue({ count: 3 });

      const options = {
        workOrderId: mockWorkOrderId,
        priority: 'NORMAL' as const,
        maxKitSize: 2 // Force split into multiple kits
      };

      const result = await service.generateKitsForWorkOrder(options);

      expect(result.kits).toHaveLength(2);
      expect(result.analysis.totalItems).toBe(3);
    });

    it('should include vendor kit handling preferences', async () => {
      prismaMock.workOrder.findUnique.mockResolvedValue(mockWorkOrder);

      // Mock BOM with vendor kit items
      const vendorBOMItems = [
        ...mockBOMItems,
        {
          id: 'bom-vendor-1',
          parentPartId: mockPartId,
          componentPartId: 'vendor-component-1',
          quantity: 1,
          unitOfMeasure: 'EA',
          isActive: true,
          effectiveDate: null,
          obsoleteDate: null,
          componentPart: {
            id: 'vendor-component-1',
            partNumber: 'VENDOR-001',
            partName: 'Vendor Component',
            description: 'Component from vendor',
            unitOfMeasure: 'EA',
            isActive: true,
            makeOrBuy: 'BUY'
          }
        }
      ];

      prismaMock.bOMItem.findMany.mockResolvedValueOnce(vendorBOMItems);
      prismaMock.bOMItem.findMany.mockResolvedValue([]);
      prismaMock.inventory.findMany.mockResolvedValue(mockInventory);

      const mockKit = {
        id: 'kit-123',
        kitNumber: 'KIT-001',
        workOrderId: mockWorkOrderId,
        status: 'PLANNED',
        priority: 'NORMAL',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.$transaction.mockImplementation(async (callback) => {
        return await callback(prismaMock);
      });

      prismaMock.kit.create.mockResolvedValue(mockKit);
      prismaMock.kitItem.createMany.mockResolvedValue({ count: 3 });

      const options = {
        workOrderId: mockWorkOrderId,
        priority: 'NORMAL' as const,
        vendorKitHandling: 'separate' as const
      };

      const result = await service.generateKitsForWorkOrder(options);

      expect(result).toBeDefined();
      expect(result.analysis.vendorKitItems).toBeDefined();
    });
  });

  describe('Error recovery and retry logic', () => {
    it('should retry on transient failures', async () => {
      const mockWorkOrder = {
        id: 'wo-test-123',
        partId: 'part-test-456',
        quantity: 5,
        partNumber: 'TEST-PART-001',
        description: 'Test Assembly Part',
        status: 'OPEN',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock transient failure followed by success
      prismaMock.workOrder.findUnique
        .mockRejectedValueOnce(new Error('Connection timeout'))
        .mockResolvedValue(mockWorkOrder);

      prismaMock.bOMItem.findMany.mockResolvedValue([]);
      prismaMock.inventory.findMany.mockResolvedValue([]);

      const mockKit = {
        id: 'kit-123',
        kitNumber: 'KIT-001',
        workOrderId: 'wo-test-123',
        status: 'PLANNED',
        priority: 'NORMAL',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.$transaction.mockImplementation(async (callback) => {
        return await callback(prismaMock);
      });

      prismaMock.kit.create.mockResolvedValue(mockKit);
      prismaMock.kitItem.createMany.mockResolvedValue({ count: 0 });

      const options = {
        workOrderId: 'wo-test-123',
        priority: 'NORMAL' as const
      };

      const result = await service.generateKitsForWorkOrder(options);

      expect(result).toBeDefined();
      expect(prismaMock.workOrder.findUnique).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should handle work order with zero quantity', async () => {
      const zeroQuantityWorkOrder = {
        id: 'wo-zero-123',
        partId: 'part-test-456',
        quantity: 0,
        partNumber: 'TEST-PART-001',
        description: 'Zero quantity work order',
        status: 'OPEN',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.workOrder.findUnique.mockResolvedValue(zeroQuantityWorkOrder);
      prismaMock.bOMItem.findMany.mockResolvedValue([]);
      prismaMock.inventory.findMany.mockResolvedValue([]);

      const options = {
        workOrderId: 'wo-zero-123',
        priority: 'NORMAL' as const
      };

      const result = await service.generateKitsForWorkOrder(options);

      expect(result.kits).toHaveLength(0);
      expect(result.analysis.totalQuantity).toBe(0);
    });

    it('should handle BOM with negative quantities gracefully', async () => {
      const mockWorkOrder = {
        id: 'wo-test-123',
        partId: 'part-test-456',
        quantity: 5,
        partNumber: 'TEST-PART-001',
        description: 'Test Assembly Part',
        status: 'OPEN',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const negativeBOMItems = [
        {
          id: 'bom-negative-1',
          parentPartId: 'part-test-456',
          componentPartId: 'component-1',
          quantity: -1, // Negative quantity
          unitOfMeasure: 'EA',
          isActive: true,
          effectiveDate: null,
          obsoleteDate: null,
          componentPart: {
            id: 'component-1',
            partNumber: 'COMP-001',
            partName: 'Component 1',
            description: 'Component with negative quantity',
            unitOfMeasure: 'EA',
            isActive: true,
            makeOrBuy: 'MAKE'
          }
        }
      ];

      prismaMock.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      prismaMock.bOMItem.findMany.mockResolvedValueOnce(negativeBOMItems);
      prismaMock.bOMItem.findMany.mockResolvedValue([]);

      const options = {
        workOrderId: 'wo-test-123',
        priority: 'NORMAL' as const
      };

      // Should handle negative quantities gracefully (treat as 0 or error)
      const result = await service.generateKitsForWorkOrder(options);
      expect(result.warnings).toContain(
        expect.stringMatching(/negative quantity/i)
      );
    });

    it('should validate scrap factor bounds', async () => {
      const mockWorkOrder = {
        id: 'wo-test-123',
        partId: 'part-test-456',
        quantity: 5,
        partNumber: 'TEST-PART-001',
        description: 'Test Assembly Part',
        status: 'OPEN',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      prismaMock.bOMItem.findMany.mockResolvedValue([]);
      prismaMock.inventory.findMany.mockResolvedValue([]);

      const mockKit = {
        id: 'kit-123',
        kitNumber: 'KIT-001',
        workOrderId: 'wo-test-123',
        status: 'PLANNED',
        priority: 'NORMAL',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.$transaction.mockImplementation(async (callback) => {
        return await callback(prismaMock);
      });

      prismaMock.kit.create.mockResolvedValue(mockKit);
      prismaMock.kitItem.createMany.mockResolvedValue({ count: 0 });

      // Test with extreme scrap factor
      const options = {
        workOrderId: 'wo-test-123',
        priority: 'NORMAL' as const,
        scrapFactor: 1.5 // 150% scrap factor
      };

      const result = await service.generateKitsForWorkOrder(options);

      // Should either cap the scrap factor or include appropriate warnings
      expect(result.warnings).toContain(
        expect.stringMatching(/scrap factor/i)
      );
    });
  });
});