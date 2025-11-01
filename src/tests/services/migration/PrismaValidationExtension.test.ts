/**
 * Prisma Validation Extension Tests
 * Phase 2: Foreign Key and Duplicate Validation Integration Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaValidationExtension } from '../../../services/migration/validation/PrismaValidationExtension';

// Mock Prisma client
const mockPrisma = {
  Part: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn()
  },
  BOMItem: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn()
  },
  MaterialClass: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn()
  }
} as unknown as PrismaClient;

describe('PrismaValidationExtension - Phase 2: Foreign Key & Duplicate Validation', () => {
  let extension: PrismaValidationExtension;

  beforeEach(() => {
    extension = new PrismaValidationExtension(mockPrisma);
    vi.clearAllMocks();
  });

  // ============================================================================
  // FOREIGN KEY VALIDATION
  // ============================================================================

  describe('Foreign Key Validation', () => {
    it('should validate existing foreign key', async () => {
      (mockPrisma.MaterialClass.findUnique as any).mockResolvedValue({
        id: 'mc-001'
      });

      const result = await extension.validateForeignKeyExists(
        'mc-001',
        { table: 'MaterialClass', field: 'id' }
      );

      expect(result).toBe(true);
    });

    it('should return false for non-existent foreign key', async () => {
      (mockPrisma.MaterialClass.findUnique as any).mockResolvedValue(null);

      const result = await extension.validateForeignKeyExists(
        'mc-999',
        { table: 'MaterialClass', field: 'id' }
      );

      expect(result).toBe(false);
    });

    it('should handle null values when allowed', async () => {
      const result = await extension.validateForeignKeyExists(
        null,
        { table: 'MaterialClass', field: 'id' },
        true // allowNull
      );

      expect(result).toBe(true);
      expect(mockPrisma.MaterialClass.findUnique).not.toHaveBeenCalled();
    });

    it('should return false for null values when not allowed', async () => {
      const result = await extension.validateForeignKeyExists(
        null,
        { table: 'MaterialClass', field: 'id' },
        false // disallow null
      );

      expect(result).toBe(false);
    });

    it('should use cache for repeated foreign key checks', async () => {
      (mockPrisma.MaterialClass.findUnique as any).mockResolvedValue({
        id: 'mc-001'
      });

      // First call
      await extension.validateForeignKeyExists(
        'mc-001',
        { table: 'MaterialClass', field: 'id' }
      );

      // Second call - should use cache
      const result = await extension.validateForeignKeyExists(
        'mc-001',
        { table: 'MaterialClass', field: 'id' }
      );

      expect(result).toBe(true);
      // Should only call database once
      expect(mockPrisma.MaterialClass.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should handle undefined foreign key values', async () => {
      const result = await extension.validateForeignKeyExists(
        undefined,
        { table: 'MaterialClass', field: 'id' }
      );

      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // DUPLICATE DETECTION
  // ============================================================================

  describe('Duplicate Detection', () => {
    it('should detect duplicate record', async () => {
      (mockPrisma.Part.findFirst as any).mockResolvedValue({
        id: 'p-001',
        partNumber: 'P-001'
      });

      const result = await extension.checkDuplicateExists(
        'P-001',
        { table: 'Part', field: 'partNumber' }
      );

      expect(result).toBe(true);
    });

    it('should return false for unique value', async () => {
      (mockPrisma.Part.findFirst as any).mockResolvedValue(null);

      const result = await extension.checkDuplicateExists(
        'P-999',
        { table: 'Part', field: 'partNumber' }
      );

      expect(result).toBe(false);
    });

    it('should handle null values', async () => {
      const result = await extension.checkDuplicateExists(
        null,
        { table: 'Part', field: 'partNumber' }
      );

      expect(result).toBe(false);
      expect(mockPrisma.Part.findFirst).not.toHaveBeenCalled();
    });

    it('should exclude current record from duplicate check', async () => {
      (mockPrisma.Part.findFirst as any).mockResolvedValue(null);

      await extension.checkDuplicateExists(
        'P-001',
        { table: 'Part', field: 'partNumber' },
        'p-001' // excludeId
      );

      expect(mockPrisma.Part.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            NOT: { id: 'p-001' }
          })
        })
      );
    });

    it('should support case-insensitive duplicate detection', async () => {
      (mockPrisma.Part.findFirst as any).mockResolvedValue(null);

      await extension.checkDuplicateExists(
        'P-001',
        { table: 'Part', field: 'partNumber', caseSensitive: false }
      );

      expect(mockPrisma.Part.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            partNumber: expect.objectContaining({
              mode: 'insensitive'
            })
          })
        })
      );
    });
  });

  // ============================================================================
  // BATCH FOREIGN KEY CHECKS
  // ============================================================================

  describe('Batch Foreign Key Checks', () => {
    it('should check multiple foreign keys in batch', async () => {
      (mockPrisma.MaterialClass.findMany as any).mockResolvedValue([
        { id: 'mc-001' },
        { id: 'mc-002' }
      ]);

      const result = await extension.checkForeignKeysBatch(
        ['mc-001', 'mc-002', 'mc-003'],
        { table: 'MaterialClass', field: 'id' }
      );

      expect(result.get('mc-001')).toBe(true);
      expect(result.get('mc-002')).toBe(true);
      expect(result.get('mc-003')).toBe(false);
    });

    it('should use cache in batch checks', async () => {
      (mockPrisma.MaterialClass.findMany as any).mockResolvedValue([
        { id: 'mc-001' }
      ]);

      // First batch
      await extension.checkForeignKeysBatch(
        ['mc-001', 'mc-002'],
        { table: 'MaterialClass', field: 'id' }
      );

      // Second batch with cached value
      const result = await extension.checkForeignKeysBatch(
        ['mc-001', 'mc-003'],
        { table: 'MaterialClass', field: 'id' }
      );

      expect(result.get('mc-001')).toBe(true);
      // Should only call database twice (once per unique value)
      expect(mockPrisma.MaterialClass.findMany).toHaveBeenCalledTimes(2);
    });

    it('should handle empty batch', async () => {
      const result = await extension.checkForeignKeysBatch(
        [],
        { table: 'MaterialClass', field: 'id' }
      );

      expect(result.size).toBe(0);
      expect(mockPrisma.MaterialClass.findMany).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // FUZZY MATCHING FOR SUGGESTIONS
  // ============================================================================

  describe('Similar Record Matching', () => {
    it('should find similar records', async () => {
      (mockPrisma.Part.findMany as any).mockResolvedValue([
        { id: 'p-001', partNumber: 'P-001' },
        { id: 'p-002', partNumber: 'P-002' }
      ]);

      const result = await extension.findSimilarRecords(
        'P-00',
        { table: 'Part', field: 'id', displayField: 'partNumber' }
      );

      expect(result).toHaveLength(2);
    });

    it('should limit similar records to specified limit', async () => {
      const mockRecords = Array.from({ length: 10 }, (_, i) => ({
        id: `p-${i}`,
        partNumber: `P-${i}`
      }));
      (mockPrisma.Part.findMany as any).mockResolvedValue(mockRecords);

      await extension.findSimilarRecords(
        'P-',
        { table: 'Part', field: 'id' },
        5 // limit
      );

      expect(mockPrisma.Part.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5
        })
      );
    });
  });

  // ============================================================================
  // BATCH DUPLICATE CHECK IN RECORDS
  // ============================================================================

  describe('Batch Duplicate Detection in Records', () => {
    it('should detect duplicates in batch', async () => {
      const records = [
        { partNumber: 'P-001' },
        { partNumber: 'P-002' },
        { partNumber: 'P-001' } // Duplicate value
      ];

      (mockPrisma.Part.findMany as any).mockResolvedValue([
        { partNumber: 'P-001' }
      ]);

      const result = await extension.checkDuplicatesInBatch(
        records,
        'partNumber',
        'Part'
      );

      // Indices 0 and 2 have values that exist in database
      expect(result.get(0)).toBe(true);
      expect(result.get(1)).toBe(false);
      expect(result.get(2)).toBe(true);
    });

    it('should handle empty records', async () => {
      const result = await extension.checkDuplicatesInBatch(
        [],
        'partNumber',
        'Part'
      );

      expect(result.size).toBe(0);
    });

    it('should handle null values in batch', async () => {
      const records = [
        { partNumber: 'P-001' },
        { partNumber: null },
        { partNumber: 'P-002' }
      ];

      (mockPrisma.Part.findMany as any).mockResolvedValue([
        { partNumber: 'P-001' }
      ]);

      const result = await extension.checkDuplicatesInBatch(
        records,
        'partNumber',
        'Part'
      );

      // Null should not be checked
      expect(result.has(1)).toBe(false);
    });
  });

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  describe('Cache Management', () => {
    it('should report cache statistics', async () => {
      // Populate cache
      (mockPrisma.MaterialClass.findUnique as any).mockResolvedValue({
        id: 'mc-001'
      });

      await extension.validateForeignKeyExists(
        'mc-001',
        { table: 'MaterialClass', field: 'id' }
      );

      const stats = extension.getCacheStats();

      expect(stats.foreignKeyCache.size).toBeGreaterThan(0);
      expect(stats.foreignKeyCache.maxSize).toBe(100000);
    });

    it('should clear caches', async () => {
      (mockPrisma.MaterialClass.findUnique as any).mockResolvedValue({
        id: 'mc-001'
      });

      // Populate cache
      await extension.validateForeignKeyExists(
        'mc-001',
        { table: 'MaterialClass', field: 'id' }
      );

      // Clear cache
      extension.clearCaches();

      // Next check should hit database
      (mockPrisma.MaterialClass.findUnique as any).mockClear();
      (mockPrisma.MaterialClass.findUnique as any).mockResolvedValue({
        id: 'mc-001'
      });

      await extension.validateForeignKeyExists(
        'mc-001',
        { table: 'MaterialClass', field: 'id' }
      );

      expect(mockPrisma.MaterialClass.findUnique).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // TABLE NAME CONVERSION
  // ============================================================================

  describe('Table Name to Model Name Conversion', () => {
    it('should convert snake_case table names to PascalCase model names', async () => {
      // Test by using BOMItem which is a special case
      (mockPrisma.BOMItem.findUnique as any).mockResolvedValue({
        id: 'bom-001'
      });

      const result = await extension.validateForeignKeyExists(
        'bom-001',
        { table: 'bom_items', field: 'id' }
      );

      expect(result).toBe(true);
      expect(mockPrisma.BOMItem.findUnique).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle database errors gracefully in foreign key validation', async () => {
      (mockPrisma.MaterialClass.findUnique as any).mockRejectedValue(
        new Error('Database connection error')
      );

      const result = await extension.validateForeignKeyExists(
        'mc-001',
        { table: 'MaterialClass', field: 'id' }
      );

      // Should return true (assume valid) on error
      expect(result).toBe(true);
    });

    it('should handle database errors in batch checks', async () => {
      (mockPrisma.MaterialClass.findMany as any).mockRejectedValue(
        new Error('Database connection error')
      );

      const result = await extension.checkForeignKeysBatch(
        ['mc-001', 'mc-002'],
        { table: 'MaterialClass', field: 'id' }
      );

      // Should return all as valid on error
      expect(result.get('mc-001')).toBe(true);
      expect(result.get('mc-002')).toBe(true);
    });

    it('should handle unknown table/model', async () => {
      (mockPrisma.UnknownTable as any) = undefined;

      const result = await extension.validateForeignKeyExists(
        'value',
        { table: 'UnknownTable', field: 'id' }
      );

      // Should return true (assume valid) for unknown tables
      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // PERFORMANCE TESTS
  // ============================================================================

  describe('Performance Optimization', () => {
    it('should cache frequently checked foreign keys', async () => {
      (mockPrisma.MaterialClass.findUnique as any).mockResolvedValue({
        id: 'mc-001'
      });

      // Validate same foreign key 100 times
      for (let i = 0; i < 100; i++) {
        await extension.validateForeignKeyExists(
          'mc-001',
          { table: 'MaterialClass', field: 'id' }
        );
      }

      // Should only query database once
      expect(mockPrisma.MaterialClass.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should handle large batch checks efficiently', async () => {
      const largeValueSet = Array.from({ length: 1000 }, (_, i) => `mc-${i}`);

      (mockPrisma.MaterialClass.findMany as any).mockResolvedValue(
        largeValueSet.slice(0, 500).map(id => ({ id }))
      );

      const result = await extension.checkForeignKeysBatch(
        largeValueSet,
        { table: 'MaterialClass', field: 'id' }
      );

      expect(result.size).toBe(1000);
      expect(mockPrisma.MaterialClass.findMany).toHaveBeenCalledTimes(1);
    });
  });
});
