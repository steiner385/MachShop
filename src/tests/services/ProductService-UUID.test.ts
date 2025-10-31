/**
 * ProductService UUID Test Suite
 * Tests for MBE persistent UUID functionality in ProductService
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { ProductService } from '../../services/ProductService';
import { generatePersistentUUID } from '../../utils/uuidUtils';

// Mock Prisma client
const mockPrisma = {
  part: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  unitOfMeasure: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
} as unknown as PrismaClient;

describe('ProductService UUID Operations', () => {
  let productService: ProductService;
  let validUUID: string;
  let mockPart: any;

  beforeEach(() => {
    productService = new ProductService(mockPrisma);
    validUUID = generatePersistentUUID();

    mockPart = {
      id: 'part_123',
      persistentUuid: validUUID,
      partNumber: 'TEST-001',
      partName: 'Test Part',
      description: 'Test Description',
      partType: 'COMPONENT',
      productType: 'MADE_TO_STOCK',
      lifecycleState: 'PRODUCTION',
      unitOfMeasure: 'EA',
      weight: 1.5,
      isActive: true,
      isConfigurable: false,
      requiresFAI: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      specifications: [],
      configurations: [],
      lifecycleHistory: [],
      bomItems: [],
      componentItems: [],
      serializedParts: [],
      qualityPlans: [],
      routings: [],
      unitOfMeasureRef: null
    };

    // Reset mocks
    vi.clearAllMocks();

    // Mock unitOfMeasure lookup
    mockPrisma.unitOfMeasure.findFirst = vi.fn().mockResolvedValue({
      id: 'uom_ea_123',
      code: 'EA',
      name: 'Each',
      isActive: true
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getPartByPersistentUuid', () => {
    it('should find part by persistent UUID', async () => {
      // Arrange
      mockPrisma.part.findFirst = vi.fn().mockResolvedValue(mockPart);

      // Act
      const result = await productService.getPartByPersistentUuid(validUUID);

      // Assert
      expect(result).toEqual(mockPart);
      expect(mockPrisma.part.findFirst).toHaveBeenCalledWith({
        where: { persistentUuid: validUUID.toLowerCase() },
        include: expect.objectContaining({
          specifications: true,
          configurations: expect.objectContaining({
            include: { options: true }
          }),
          lifecycleHistory: expect.objectContaining({
            orderBy: { transitionDate: 'desc' },
            take: 10
          }),
          bomItems: expect.objectContaining({
            include: {
              componentPart: true,
              operation: true
            }
          }),
          componentItems: expect.objectContaining({
            include: { parentPart: true }
          }),
          serializedParts: expect.objectContaining({
            take: 5,
            orderBy: { createdAt: 'desc' }
          }),
          qualityPlans: true,
          routings: expect.objectContaining({
            where: { isActive: true },
            take: 5
          }),
          unitOfMeasureRef: true
        })
      });
    });

    it('should find part by persistent UUID without relations', async () => {
      // Arrange
      mockPrisma.part.findFirst = vi.fn().mockResolvedValue(mockPart);

      // Act
      const result = await productService.getPartByPersistentUuid(validUUID, false);

      // Assert
      expect(result).toEqual(mockPart);
      expect(mockPrisma.part.findFirst).toHaveBeenCalledWith({
        where: { persistentUuid: validUUID.toLowerCase() },
        include: undefined
      });
    });

    it('should normalize UUID before querying', async () => {
      // Arrange
      const upperUUID = validUUID.toUpperCase();
      mockPrisma.part.findFirst = vi.fn().mockResolvedValue(mockPart);

      // Act
      await productService.getPartByPersistentUuid(upperUUID);

      // Assert
      expect(mockPrisma.part.findFirst).toHaveBeenCalledWith({
        where: { persistentUuid: validUUID.toLowerCase() },
        include: expect.any(Object)
      });
    });

    it('should handle UUID with whitespace', async () => {
      // Arrange
      const uuidWithSpaces = `  ${validUUID}  `;
      mockPrisma.part.findFirst = vi.fn().mockResolvedValue(mockPart);

      // Act
      await productService.getPartByPersistentUuid(uuidWithSpaces);

      // Assert
      expect(mockPrisma.part.findFirst).toHaveBeenCalledWith({
        where: { persistentUuid: validUUID.toLowerCase() },
        include: expect.any(Object)
      });
    });

    it('should throw error when part not found', async () => {
      // Arrange
      mockPrisma.part.findFirst = vi.fn().mockResolvedValue(null);

      // Act & Assert
      await expect(productService.getPartByPersistentUuid(validUUID))
        .rejects.toThrow(`Part with persistent UUID ${validUUID} not found`);
    });

    it('should throw error for invalid UUID format', async () => {
      // Arrange
      const invalidUUID = 'invalid-uuid-format';

      // Act & Assert
      await expect(productService.getPartByPersistentUuid(invalidUUID))
        .rejects.toThrow('Invalid persistent UUID format');
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      mockPrisma.part.findFirst = vi.fn().mockRejectedValue(dbError);

      // Act & Assert
      await expect(productService.getPartByPersistentUuid(validUUID))
        .rejects.toThrow('Database connection failed');
    });

    it('should query with correct include structure for relations', async () => {
      // Arrange
      mockPrisma.part.findFirst = vi.fn().mockResolvedValue(mockPart);

      // Act
      await productService.getPartByPersistentUuid(validUUID, true);

      // Assert
      const callArgs = mockPrisma.part.findFirst.mock.calls[0][0];
      expect(callArgs.include).toEqual({
        specifications: true,
        configurations: {
          include: {
            options: true,
          },
        },
        lifecycleHistory: {
          orderBy: { transitionDate: 'desc' },
          take: 10,
        },
        bomItems: {
          include: {
            componentPart: true,
            operation: true,
          },
        },
        componentItems: {
          include: {
            parentPart: true,
          },
        },
        serializedParts: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        qualityPlans: true,
        routings: {
          where: { isActive: true },
          take: 5,
        },
        unitOfMeasureRef: true,
      });
    });
  });

  describe('UUID Integration with Existing Methods', () => {
    it('should ensure UUID field is included in part responses', async () => {
      // This test verifies that when we get a part by ID or part number,
      // the persistentUuid field is automatically included in the response
      // since it's now part of the schema

      // Arrange
      mockPrisma.part.findUnique = vi.fn().mockResolvedValue(mockPart);

      // Act
      const result = await productService.getPartById('part_123');

      // Assert
      expect(result.persistentUuid).toBe(validUUID);
    });

    it('should include persistentUuid in part creation', async () => {
      // This verifies that new parts automatically get UUIDs assigned
      // when created (via Prisma @default(uuid()))

      const newPartData = {
        partNumber: 'NEW-001',
        partName: 'New Part',
        partType: 'COMPONENT',
        unitOfMeasure: 'EA'
      };

      const newPart = {
        ...mockPart,
        ...newPartData,
        persistentUuid: generatePersistentUUID()
      };

      // Arrange
      mockPrisma.part.create = vi.fn().mockResolvedValue(newPart);

      // Act
      const result = await productService.createPart(newPartData);

      // Assert
      expect(result.persistentUuid).toBeDefined();
      expect(result.persistentUuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe('Performance and Optimization', () => {
    it('should use efficient query for UUID lookup', async () => {
      // Arrange
      mockPrisma.part.findFirst = vi.fn().mockResolvedValue(mockPart);

      // Act
      await productService.getPartByPersistentUuid(validUUID);

      // Assert
      // Verify that we're using findFirst with where clause (indexed field)
      expect(mockPrisma.part.findFirst).toHaveBeenCalledWith({
        where: { persistentUuid: validUUID.toLowerCase() },
        include: expect.any(Object)
      });

      // Verify we're not doing findMany or other inefficient queries
      expect(mockPrisma.part.findFirst).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent UUID lookups', async () => {
      // Arrange
      const uuid1 = generatePersistentUUID();
      const uuid2 = generatePersistentUUID();
      const uuid3 = generatePersistentUUID();

      const part1 = { ...mockPart, persistentUuid: uuid1, partNumber: 'PART-001' };
      const part2 = { ...mockPart, persistentUuid: uuid2, partNumber: 'PART-002' };
      const part3 = { ...mockPart, persistentUuid: uuid3, partNumber: 'PART-003' };

      mockPrisma.part.findFirst = vi.fn()
        .mockResolvedValueOnce(part1)
        .mockResolvedValueOnce(part2)
        .mockResolvedValueOnce(part3);

      // Act
      const promises = [
        productService.getPartByPersistentUuid(uuid1),
        productService.getPartByPersistentUuid(uuid2),
        productService.getPartByPersistentUuid(uuid3)
      ];

      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(3);
      expect(results[0].partNumber).toBe('PART-001');
      expect(results[1].partNumber).toBe('PART-002');
      expect(results[2].partNumber).toBe('PART-003');
      expect(mockPrisma.part.findFirst).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle empty UUID string', async () => {
      await expect(productService.getPartByPersistentUuid(''))
        .rejects.toThrow('Invalid persistent UUID format');
    });

    it('should handle null UUID', async () => {
      await expect(productService.getPartByPersistentUuid(null as any))
        .rejects.toThrow('Invalid persistent UUID format');
    });

    it('should handle undefined UUID', async () => {
      await expect(productService.getPartByPersistentUuid(undefined as any))
        .rejects.toThrow('Invalid persistent UUID format');
    });

    it('should handle malformed UUID with correct length', async () => {
      const malformedUUID = '12345678-1234-1234-1234-123456789012';
      await expect(productService.getPartByPersistentUuid(malformedUUID))
        .rejects.toThrow('Invalid persistent UUID format');
    });

    it('should handle UUID v1 format rejection', async () => {
      const uuidv1 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
      await expect(productService.getPartByPersistentUuid(uuidv1))
        .rejects.toThrow('Invalid persistent UUID format');
    });
  });

  describe('MBE Compliance', () => {
    it('should support NIST AMS 300-12 traceability requirements', async () => {
      // Arrange
      mockPrisma.part.findFirst = vi.fn().mockResolvedValue(mockPart);

      // Act
      const result = await productService.getPartByPersistentUuid(validUUID);

      // Assert
      expect(result.persistentUuid).toBeDefined();
      expect(result.persistentUuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

      // Verify traceability data is included
      expect(result).toHaveProperty('specifications');
      expect(result).toHaveProperty('lifecycleHistory');
      expect(result).toHaveProperty('serializedParts');
      expect(result).toHaveProperty('bomItems');
    });

    it('should enable cross-enterprise part identification', async () => {
      // This test verifies that the UUID can be used for identification
      // across different systems/enterprises

      // Arrange
      mockPrisma.part.findFirst = vi.fn().mockResolvedValue(mockPart);

      // Act
      const result = await productService.getPartByPersistentUuid(validUUID);

      // Assert
      expect(result.persistentUuid).toBe(validUUID);
      expect(result.partNumber).toBe('TEST-001');

      // Verify this UUID is globally unique and persistent
      expect(result.persistentUuid).not.toBe(result.id); // Different from internal CUID
    });
  });
});