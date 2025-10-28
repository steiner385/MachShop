import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FileDeduplicationService } from '../../services/FileDeduplicationService';
import { prisma } from '../../lib/prisma';
import * as crypto from 'crypto';

// Mock crypto module
vi.mock('crypto', () => ({
  createHash: vi.fn(),
}));

// Mock prisma
vi.mock('../../lib/prisma', () => ({
  prisma: {
    storedFile: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock CloudStorageService
vi.mock('../../services/CloudStorageService', () => ({
  CloudStorageService: vi.fn().mockImplementation(() => ({
    downloadFile: vi.fn(),
    deleteFile: vi.fn(),
  })),
}));

describe('FileDeduplicationService', () => {
  let deduplicationService: FileDeduplicationService;
  let mockHash: any;

  beforeEach(() => {
    deduplicationService = new FileDeduplicationService();

    mockHash = {
      update: vi.fn().mockReturnThis(),
      digest: vi.fn().mockReturnValue('test-checksum-123'),
    };

    (crypto.createHash as any).mockReturnValue(mockHash);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('calculateChecksum', () => {
    it('should calculate SHA-256 checksum for buffer', async () => {
      const testBuffer = Buffer.from('test content');

      const result = await deduplicationService.calculateChecksum(testBuffer);

      expect(crypto.createHash).toHaveBeenCalledWith('sha256');
      expect(mockHash.update).toHaveBeenCalledWith(testBuffer);
      expect(mockHash.digest).toHaveBeenCalledWith('hex');
      expect(result).toBe('test-checksum-123');
    });
  });

  describe('findDuplicateFiles', () => {
    it('should find all duplicate files grouped by checksum', async () => {
      const mockGroupedResults = [
        {
          checksum: 'checksum-1',
          _count: { id: 3 },
        },
        {
          checksum: 'checksum-2',
          _count: { id: 2 },
        },
      ];

      const mockDuplicateFiles = [
        {
          id: 'file-1',
          fileName: 'file1.txt',
          checksum: 'checksum-1',
          size: 100,
          storageKey: 'files/file1.txt',
          createdAt: new Date('2023-01-01'),
        },
        {
          id: 'file-2',
          fileName: 'file2.txt',
          checksum: 'checksum-1',
          size: 100,
          storageKey: 'files/file2.txt',
          createdAt: new Date('2023-01-02'),
        },
        {
          id: 'file-3',
          fileName: 'file3.txt',
          checksum: 'checksum-1',
          size: 100,
          storageKey: 'files/file3.txt',
          createdAt: new Date('2023-01-03'),
        },
      ];

      (prisma.storedFile.groupBy as any).mockResolvedValue(mockGroupedResults);
      (prisma.storedFile.findMany as any).mockResolvedValue(mockDuplicateFiles);

      const result = await deduplicationService.findDuplicateFiles();

      expect(prisma.storedFile.groupBy).toHaveBeenCalledWith({
        by: ['checksum'],
        where: {
          deletedAt: null,
          checksum: { not: null },
        },
        having: {
          id: { _count: { gt: 1 } },
        },
        _count: { id: true },
      });

      expect(result).toEqual([
        {
          checksum: 'checksum-1',
          count: 3,
          files: mockDuplicateFiles,
          totalSize: 300,
          potentialSavings: 200, // Keep 1, remove 2
        },
      ]);
    });

    it('should handle empty duplicate results', async () => {
      (prisma.storedFile.groupBy as any).mockResolvedValue([]);

      const result = await deduplicationService.findDuplicateFiles();

      expect(result).toEqual([]);
    });
  });

  describe('findDuplicatesByChecksum', () => {
    it('should find duplicates for specific checksum', async () => {
      const mockFiles = [
        {
          id: 'file-1',
          fileName: 'original.txt',
          checksum: 'test-checksum',
          size: 100,
          createdAt: new Date('2023-01-01'),
        },
        {
          id: 'file-2',
          fileName: 'duplicate.txt',
          checksum: 'test-checksum',
          size: 100,
          createdAt: new Date('2023-01-02'),
        },
      ];

      (prisma.storedFile.findMany as any).mockResolvedValue(mockFiles);

      const result = await deduplicationService.findDuplicatesByChecksum('test-checksum');

      expect(prisma.storedFile.findMany).toHaveBeenCalledWith({
        where: {
          checksum: 'test-checksum',
          deletedAt: null,
        },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          fileName: true,
          originalName: true,
          size: true,
          checksum: true,
          storageKey: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      expect(result).toEqual(mockFiles);
    });
  });

  describe('performDeduplication', () => {
    it('should deduplicate files keeping the oldest', async () => {
      const mockFiles = [
        {
          id: 'file-1',
          fileName: 'original.txt',
          checksum: 'test-checksum',
          size: 100,
          createdAt: new Date('2023-01-01'),
        },
        {
          id: 'file-2',
          fileName: 'duplicate1.txt',
          checksum: 'test-checksum',
          size: 100,
          createdAt: new Date('2023-01-02'),
        },
        {
          id: 'file-3',
          fileName: 'duplicate2.txt',
          checksum: 'test-checksum',
          size: 100,
          createdAt: new Date('2023-01-03'),
        },
      ];

      (prisma.storedFile.findMany as any).mockResolvedValue(mockFiles);
      (prisma.$transaction as any).mockImplementation((fn) => fn(prisma));
      (prisma.storedFile.update as any).mockResolvedValue({});

      const result = await deduplicationService.performDeduplication('test-checksum', 'soft');

      expect(prisma.storedFile.update).toHaveBeenCalledTimes(2); // Update 2 duplicates
      expect(result).toEqual({
        keptFile: mockFiles[0],
        removedFiles: [mockFiles[1], mockFiles[2]],
        spaceSaved: 200,
        method: 'soft',
      });
    });

    it('should perform hard deletion when specified', async () => {
      const mockFiles = [
        {
          id: 'file-1',
          fileName: 'original.txt',
          size: 100,
          createdAt: new Date('2023-01-01'),
        },
        {
          id: 'file-2',
          fileName: 'duplicate.txt',
          size: 100,
          createdAt: new Date('2023-01-02'),
        },
      ];

      (prisma.storedFile.findMany as any).mockResolvedValue(mockFiles);
      (prisma.$transaction as any).mockImplementation((fn) => fn(prisma));
      (prisma.storedFile.delete as any).mockResolvedValue({});

      const result = await deduplicationService.performDeduplication('test-checksum', 'hard');

      expect(prisma.storedFile.delete).toHaveBeenCalledWith({
        where: { id: 'file-2' },
      });
      expect(result.method).toBe('hard');
    });

    it('should throw error when no files found', async () => {
      (prisma.storedFile.findMany as any).mockResolvedValue([]);

      await expect(
        deduplicationService.performDeduplication('non-existent-checksum', 'soft')
      ).rejects.toThrow('No files found with checksum: non-existent-checksum');
    });

    it('should not deduplicate single file', async () => {
      const mockFiles = [
        {
          id: 'file-1',
          fileName: 'unique.txt',
          size: 100,
          createdAt: new Date('2023-01-01'),
        },
      ];

      (prisma.storedFile.findMany as any).mockResolvedValue(mockFiles);

      await expect(
        deduplicationService.performDeduplication('unique-checksum', 'soft')
      ).rejects.toThrow('Only one file found with this checksum. No deduplication needed.');
    });
  });

  describe('bulkDeduplication', () => {
    it('should perform bulk deduplication on all duplicates', async () => {
      const mockDuplicates = [
        {
          checksum: 'checksum-1',
          count: 3,
          files: [
            { id: 'file-1', size: 100, createdAt: new Date('2023-01-01') },
            { id: 'file-2', size: 100, createdAt: new Date('2023-01-02') },
            { id: 'file-3', size: 100, createdAt: new Date('2023-01-03') },
          ],
          totalSize: 300,
          potentialSavings: 200,
        },
        {
          checksum: 'checksum-2',
          count: 2,
          files: [
            { id: 'file-4', size: 200, createdAt: new Date('2023-01-01') },
            { id: 'file-5', size: 200, createdAt: new Date('2023-01-02') },
          ],
          totalSize: 400,
          potentialSavings: 200,
        },
      ];

      // Mock the methods that bulkDeduplication calls
      vi.spyOn(deduplicationService, 'findDuplicateFiles').mockResolvedValue(mockDuplicates);
      vi.spyOn(deduplicationService, 'performDeduplication')
        .mockResolvedValueOnce({
          keptFile: mockDuplicates[0].files[0],
          removedFiles: [mockDuplicates[0].files[1], mockDuplicates[0].files[2]],
          spaceSaved: 200,
          method: 'soft',
        })
        .mockResolvedValueOnce({
          keptFile: mockDuplicates[1].files[0],
          removedFiles: [mockDuplicates[1].files[1]],
          spaceSaved: 200,
          method: 'soft',
        });

      const result = await deduplicationService.bulkDeduplication('soft', 2);

      expect(deduplicationService.performDeduplication).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        processedChecksums: 2,
        totalFilesRemoved: 3,
        totalSpaceSaved: 400,
        details: expect.any(Array),
      });
    });

    it('should respect batch size limit', async () => {
      const mockDuplicates = Array.from({ length: 10 }, (_, i) => ({
        checksum: `checksum-${i}`,
        count: 2,
        files: [
          { id: `file-${i}-1`, size: 100, createdAt: new Date('2023-01-01') },
          { id: `file-${i}-2`, size: 100, createdAt: new Date('2023-01-02') },
        ],
        totalSize: 200,
        potentialSavings: 100,
      }));

      vi.spyOn(deduplicationService, 'findDuplicateFiles').mockResolvedValue(mockDuplicates);
      vi.spyOn(deduplicationService, 'performDeduplication').mockResolvedValue({
        keptFile: { id: 'file-1', size: 100 } as any,
        removedFiles: [{ id: 'file-2', size: 100 } as any],
        spaceSaved: 100,
        method: 'soft',
      });

      const result = await deduplicationService.bulkDeduplication('soft', 5);

      expect(deduplicationService.performDeduplication).toHaveBeenCalledTimes(5);
      expect(result.processedChecksums).toBe(5);
    });
  });

  describe('verifyFileIntegrity', () => {
    it('should verify file integrity successfully', async () => {
      const mockFile = {
        id: 'file-1',
        checksum: 'original-checksum',
        storageKey: 'files/test.txt',
      };
      const mockFileContent = Buffer.from('test content');

      (prisma.storedFile.findUnique as any).mockResolvedValue(mockFile);

      // Mock CloudStorageService
      const mockCloudService = {
        downloadFile: vi.fn().mockResolvedValue(mockFileContent),
      };

      // Replace the internal cloudStorageService
      (deduplicationService as any).cloudStorageService = mockCloudService;

      const result = await deduplicationService.verifyFileIntegrity('file-1');

      expect(mockCloudService.downloadFile).toHaveBeenCalledWith('file-1');
      expect(result).toEqual({
        fileId: 'file-1',
        isValid: true,
        originalChecksum: 'original-checksum',
        currentChecksum: 'test-checksum-123',
      });
    });

    it('should detect corrupted files', async () => {
      const mockFile = {
        id: 'file-1',
        checksum: 'original-checksum',
        storageKey: 'files/test.txt',
      };
      const mockFileContent = Buffer.from('corrupted content');

      (prisma.storedFile.findUnique as any).mockResolvedValue(mockFile);

      // Mock different checksum for corrupted file
      mockHash.digest.mockReturnValue('different-checksum');

      const mockCloudService = {
        downloadFile: vi.fn().mockResolvedValue(mockFileContent),
      };

      (deduplicationService as any).cloudStorageService = mockCloudService;

      const result = await deduplicationService.verifyFileIntegrity('file-1');

      expect(result).toEqual({
        fileId: 'file-1',
        isValid: false,
        originalChecksum: 'original-checksum',
        currentChecksum: 'different-checksum',
      });
    });
  });

  describe('cleanupOrphanedReferences', () => {
    it('should identify and clean orphaned file references', async () => {
      const mockOrphanedFiles = [
        {
          id: 'orphan-1',
          fileName: 'orphaned1.txt',
          storageKey: 'files/orphaned1.txt',
        },
        {
          id: 'orphan-2',
          fileName: 'orphaned2.txt',
          storageKey: 'files/orphaned2.txt',
        },
      ];

      // Mock the cloud storage service to return false for file existence
      const mockCloudService = {
        checkFileExists: vi.fn().mockResolvedValue(false),
      };

      (deduplicationService as any).cloudStorageService = mockCloudService;
      (prisma.storedFile.findMany as any).mockResolvedValue(mockOrphanedFiles);
      (prisma.$transaction as any).mockImplementation((fn) => fn(prisma));
      (prisma.storedFile.delete as any).mockResolvedValue({});

      const result = await deduplicationService.cleanupOrphanedReferences(false);

      expect(result).toEqual({
        totalScanned: 2,
        orphanedFound: 2,
        cleaned: 2,
        orphanedFiles: mockOrphanedFiles,
      });
    });

    it('should perform dry run without deleting', async () => {
      const mockOrphanedFiles = [
        {
          id: 'orphan-1',
          fileName: 'orphaned1.txt',
          storageKey: 'files/orphaned1.txt',
        },
      ];

      const mockCloudService = {
        checkFileExists: vi.fn().mockResolvedValue(false),
      };

      (deduplicationService as any).cloudStorageService = mockCloudService;
      (prisma.storedFile.findMany as any).mockResolvedValue(mockOrphanedFiles);

      const result = await deduplicationService.cleanupOrphanedReferences(true);

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(result.cleaned).toBe(0);
      expect(result.orphanedFound).toBe(1);
    });
  });

  describe('getDeduplicationStatistics', () => {
    it('should return comprehensive deduplication statistics', async () => {
      // Mock various aggregations
      (prisma.storedFile.count as any)
        .mockResolvedValueOnce(1000) // Total files
        .mockResolvedValueOnce(200); // Unique files

      (prisma.storedFile.aggregate as any)
        .mockResolvedValueOnce({ _sum: { size: 5000000000 } }) // Total size
        .mockResolvedValueOnce({ _sum: { size: 2000000000 } }); // Unique size

      const mockDuplicateGroups = [
        {
          checksum: 'checksum-1',
          _count: { id: 3 },
          _sum: { size: 300 },
        },
        {
          checksum: 'checksum-2',
          _count: { id: 2 },
          _sum: { size: 400 },
        },
      ];

      (prisma.storedFile.groupBy as any).mockResolvedValue(mockDuplicateGroups);

      const result = await deduplicationService.getDeduplicationStatistics();

      expect(result).toEqual({
        totalFiles: 1000,
        uniqueFiles: 200,
        duplicateFiles: 800,
        duplicateGroups: 2,
        totalSize: 5000000000,
        totalSizeFormatted: '4.66 GB',
        uniqueSize: 2000000000,
        uniqueSizeFormatted: '1.86 GB',
        duplicateSize: 3000000000,
        duplicateSizeFormatted: '2.79 GB',
        potentialSavings: 3000000000,
        potentialSavingsFormatted: '2.79 GB',
        deduplicationRatio: 60.0,
        averageDuplicatesPerGroup: 2.5,
      });
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      (prisma.storedFile.findMany as any).mockRejectedValue(new Error('Database error'));

      await expect(deduplicationService.findDuplicateFiles()).rejects.toThrow(
        'Failed to find duplicate files'
      );
    });

    it('should handle checksum calculation errors', async () => {
      (crypto.createHash as any).mockImplementation(() => {
        throw new Error('Hash calculation failed');
      });

      await expect(
        deduplicationService.calculateChecksum(Buffer.from('test'))
      ).rejects.toThrow('Failed to calculate file checksum');
    });
  });
});