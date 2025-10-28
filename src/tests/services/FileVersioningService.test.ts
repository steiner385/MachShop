import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FileVersioningService } from '../../services/FileVersioningService';
import { prisma } from '../../lib/prisma';

// Mock prisma
vi.mock('../../lib/prisma', () => ({
  prisma: {
    storedFile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    fileVersion: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock CloudStorageService
vi.mock('../../services/CloudStorageService', () => ({
  CloudStorageService: vi.fn().mockImplementation(() => ({
    uploadFile: vi.fn(),
    downloadFile: vi.fn(),
    copyFile: vi.fn(),
    deleteFile: vi.fn(),
  })),
}));

// Mock file comparison utilities
vi.mock('../../utils/fileComparison', () => ({
  compareTextFiles: vi.fn(),
  generateFileDiff: vi.fn(),
  calculateSimilarity: vi.fn(),
}));

describe('FileVersioningService', () => {
  let versioningService: FileVersioningService;
  let mockCloudStorage: any;

  beforeEach(() => {
    versioningService = new FileVersioningService();

    mockCloudStorage = {
      uploadFile: vi.fn(),
      downloadFile: vi.fn(),
      copyFile: vi.fn(),
      deleteFile: vi.fn(),
    };

    // Replace the internal cloudStorageService
    (versioningService as any).cloudStorageService = mockCloudStorage;

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createVersion', () => {
    it('should create new version successfully', async () => {
      const mockOriginalFile = {
        id: 'file-1',
        fileName: 'document.txt',
        mimeType: 'text/plain',
        size: 1000,
        checksum: 'original-checksum',
        storageKey: 'files/document.txt',
        currentVersion: 1,
      };

      const mockNewFile = {
        id: 'new-file-1',
        fileName: 'document.txt',
        mimeType: 'text/plain',
        size: 1200,
        checksum: 'new-checksum',
        storageKey: 'files/document_v2.txt',
      };

      const mockVersion = {
        id: 'version-1',
        fileId: 'file-1',
        versionNumber: 2,
        storedFileId: 'new-file-1',
        changeType: 'CONTENT_MODIFIED',
        comment: 'Updated content',
        createdBy: 'user-1',
        createdAt: new Date(),
      };

      const fileBuffer = Buffer.from('new file content');

      (prisma.storedFile.findUnique as any).mockResolvedValue(mockOriginalFile);
      mockCloudStorage.uploadFile.mockResolvedValue(mockNewFile);
      (prisma.$transaction as any).mockImplementation((fn) => fn(prisma));
      (prisma.fileVersion.create as any).mockResolvedValue(mockVersion);
      (prisma.storedFile.update as any).mockResolvedValue({
        ...mockOriginalFile,
        currentVersion: 2,
      });

      const result = await versioningService.createVersion({
        fileId: 'file-1',
        fileData: fileBuffer,
        changeType: 'CONTENT_MODIFIED',
        comment: 'Updated content',
        userId: 'user-1',
      });

      expect(mockCloudStorage.uploadFile).toHaveBeenCalledWith(
        fileBuffer,
        'document_v2.txt',
        'text/plain'
      );
      expect(prisma.fileVersion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fileId: 'file-1',
          versionNumber: 2,
          storedFileId: 'new-file-1',
          changeType: 'CONTENT_MODIFIED',
          comment: 'Updated content',
          createdBy: 'user-1',
        }),
        include: expect.any(Object),
      });
      expect(result).toEqual(mockVersion);
    });

    it('should handle file not found', async () => {
      (prisma.storedFile.findUnique as any).mockResolvedValue(null);

      const fileBuffer = Buffer.from('content');

      await expect(
        versioningService.createVersion({
          fileId: 'non-existent-file',
          fileData: fileBuffer,
          changeType: 'CONTENT_MODIFIED',
          userId: 'user-1',
        })
      ).rejects.toThrow('File not found');
    });

    it('should validate file size limits', async () => {
      const mockFile = {
        id: 'file-1',
        fileName: 'document.txt',
        mimeType: 'text/plain',
        currentVersion: 1,
      };

      const largeBuffer = Buffer.alloc(6 * 1024 * 1024 * 1024); // 6GB

      (prisma.storedFile.findUnique as any).mockResolvedValue(mockFile);

      await expect(
        versioningService.createVersion({
          fileId: 'file-1',
          fileData: largeBuffer,
          changeType: 'CONTENT_MODIFIED',
          userId: 'user-1',
        })
      ).rejects.toThrow('File size exceeds maximum limit');
    });
  });

  describe('getVersionHistory', () => {
    it('should return complete version history', async () => {
      const mockVersions = [
        {
          id: 'version-3',
          versionNumber: 3,
          changeType: 'CONTENT_MODIFIED',
          comment: 'Latest update',
          createdBy: 'user-1',
          createdAt: new Date('2023-01-03'),
          storedFile: {
            id: 'stored-3',
            size: 1500,
            checksum: 'checksum-3',
          },
        },
        {
          id: 'version-2',
          versionNumber: 2,
          changeType: 'CONTENT_MODIFIED',
          comment: 'Second update',
          createdBy: 'user-2',
          createdAt: new Date('2023-01-02'),
          storedFile: {
            id: 'stored-2',
            size: 1200,
            checksum: 'checksum-2',
          },
        },
        {
          id: 'version-1',
          versionNumber: 1,
          changeType: 'CREATED',
          comment: 'Initial version',
          createdBy: 'user-1',
          createdAt: new Date('2023-01-01'),
          storedFile: {
            id: 'stored-1',
            size: 1000,
            checksum: 'checksum-1',
          },
        },
      ];

      (prisma.fileVersion.findMany as any).mockResolvedValue(mockVersions);

      const result = await versioningService.getVersionHistory('file-1');

      expect(prisma.fileVersion.findMany).toHaveBeenCalledWith({
        where: { fileId: 'file-1' },
        include: {
          storedFile: {
            select: {
              id: true,
              size: true,
              checksum: true,
              storageKey: true,
              createdAt: true,
            },
          },
        },
        orderBy: { versionNumber: 'desc' },
      });
      expect(result).toEqual(mockVersions);
    });

    it('should handle file with no versions', async () => {
      (prisma.fileVersion.findMany as any).mockResolvedValue([]);

      const result = await versioningService.getVersionHistory('file-without-versions');

      expect(result).toEqual([]);
    });
  });

  describe('getVersion', () => {
    it('should retrieve specific version', async () => {
      const mockVersion = {
        id: 'version-2',
        fileId: 'file-1',
        versionNumber: 2,
        changeType: 'CONTENT_MODIFIED',
        comment: 'Updated content',
        createdBy: 'user-1',
        storedFile: {
          id: 'stored-2',
          storageKey: 'files/document_v2.txt',
          size: 1200,
          checksum: 'checksum-2',
        },
      };

      (prisma.fileVersion.findUnique as any).mockResolvedValue(mockVersion);

      const result = await versioningService.getVersion('file-1', 2);

      expect(prisma.fileVersion.findUnique).toHaveBeenCalledWith({
        where: {
          fileId_versionNumber: {
            fileId: 'file-1',
            versionNumber: 2,
          },
        },
        include: {
          storedFile: {
            select: {
              id: true,
              size: true,
              checksum: true,
              storageKey: true,
              mimeType: true,
              createdAt: true,
            },
          },
        },
      });
      expect(result).toEqual(mockVersion);
    });

    it('should handle version not found', async () => {
      (prisma.fileVersion.findUnique as any).mockResolvedValue(null);

      await expect(versioningService.getVersion('file-1', 999)).rejects.toThrow(
        'Version 999 not found for file file-1'
      );
    });
  });

  describe('restoreVersion', () => {
    it('should restore version successfully', async () => {
      const mockOriginalFile = {
        id: 'file-1',
        fileName: 'document.txt',
        mimeType: 'text/plain',
        currentVersion: 3,
        storageKey: 'files/document.txt',
      };

      const mockVersionToRestore = {
        id: 'version-2',
        versionNumber: 2,
        storedFile: {
          id: 'stored-2',
          storageKey: 'files/document_v2.txt',
          size: 1200,
          checksum: 'checksum-2',
        },
      };

      const mockNewVersion = {
        id: 'version-4',
        fileId: 'file-1',
        versionNumber: 4,
        changeType: 'RESTORED',
        comment: 'Restored from version 2',
        restoredFromVersion: 2,
        createdBy: 'user-1',
      };

      (prisma.storedFile.findUnique as any).mockResolvedValue(mockOriginalFile);
      (prisma.fileVersion.findUnique as any).mockResolvedValue(mockVersionToRestore);
      mockCloudStorage.copyFile.mockResolvedValue({
        id: 'new-stored-file',
        storageKey: 'files/document_v4.txt',
      });
      (prisma.$transaction as any).mockImplementation((fn) => fn(prisma));
      (prisma.fileVersion.create as any).mockResolvedValue(mockNewVersion);
      (prisma.storedFile.update as any).mockResolvedValue({
        ...mockOriginalFile,
        currentVersion: 4,
      });

      const result = await versioningService.restoreVersion('file-1', 2, 'user-1');

      expect(mockCloudStorage.copyFile).toHaveBeenCalledWith(
        'stored-2',
        'files/document_v4.txt'
      );
      expect(prisma.fileVersion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fileId: 'file-1',
          versionNumber: 4,
          changeType: 'RESTORED',
          comment: 'Restored from version 2',
          restoredFromVersion: 2,
          createdBy: 'user-1',
        }),
        include: expect.any(Object),
      });
      expect(result).toEqual(mockNewVersion);
    });

    it('should handle restore to current version', async () => {
      const mockFile = {
        id: 'file-1',
        currentVersion: 2,
      };

      (prisma.storedFile.findUnique as any).mockResolvedValue(mockFile);

      await expect(versioningService.restoreVersion('file-1', 2, 'user-1')).rejects.toThrow(
        'Cannot restore to current version'
      );
    });
  });

  describe('compareVersions', () => {
    it('should compare text file versions', async () => {
      const mockVersion1 = {
        storedFile: { id: 'stored-1', mimeType: 'text/plain' },
      };
      const mockVersion2 = {
        storedFile: { id: 'stored-2', mimeType: 'text/plain' },
      };

      const content1 = Buffer.from('Original content\nLine 2');
      const content2 = Buffer.from('Modified content\nLine 2\nNew line');

      (prisma.fileVersion.findUnique as any)
        .mockResolvedValueOnce(mockVersion1)
        .mockResolvedValueOnce(mockVersion2);

      mockCloudStorage.downloadFile
        .mockResolvedValueOnce(content1)
        .mockResolvedValueOnce(content2);

      // Mock file comparison utilities
      const { compareTextFiles } = await import('../../utils/fileComparison');
      (compareTextFiles as any).mockResolvedValue({
        differences: [
          { type: 'modified', line: 1, oldText: 'Original content', newText: 'Modified content' },
          { type: 'added', line: 3, newText: 'New line' },
        ],
        similarity: 75.5,
        linesAdded: 1,
        linesRemoved: 0,
        linesModified: 1,
      });

      const result = await versioningService.compareVersions('file-1', 1, 2);

      expect(compareTextFiles).toHaveBeenCalledWith(content1, content2);
      expect(result).toEqual({
        version1: 1,
        version2: 2,
        mimeType: 'text/plain',
        isTextComparison: true,
        differences: expect.any(Array),
        similarity: 75.5,
        summary: {
          linesAdded: 1,
          linesRemoved: 0,
          linesModified: 1,
        },
      });
    });

    it('should compare binary files', async () => {
      const mockVersion1 = {
        storedFile: { id: 'stored-1', mimeType: 'image/png', size: 1000, checksum: 'checksum-1' },
      };
      const mockVersion2 = {
        storedFile: { id: 'stored-2', mimeType: 'image/png', size: 1200, checksum: 'checksum-2' },
      };

      (prisma.fileVersion.findUnique as any)
        .mockResolvedValueOnce(mockVersion1)
        .mockResolvedValueOnce(mockVersion2);

      const result = await versioningService.compareVersions('file-1', 1, 2);

      expect(result).toEqual({
        version1: 1,
        version2: 2,
        mimeType: 'image/png',
        isTextComparison: false,
        differences: [],
        similarity: 0,
        summary: {
          sizeDifference: 200,
          checksumMatch: false,
          version1Size: 1000,
          version2Size: 1200,
          version1Checksum: 'checksum-1',
          version2Checksum: 'checksum-2',
        },
      });
    });

    it('should handle identical versions', async () => {
      const mockVersion1 = {
        storedFile: { id: 'stored-1', mimeType: 'text/plain', checksum: 'same-checksum' },
      };
      const mockVersion2 = {
        storedFile: { id: 'stored-2', mimeType: 'text/plain', checksum: 'same-checksum' },
      };

      (prisma.fileVersion.findUnique as any)
        .mockResolvedValueOnce(mockVersion1)
        .mockResolvedValueOnce(mockVersion2);

      const result = await versioningService.compareVersions('file-1', 1, 2);

      expect(result.similarity).toBe(100);
      expect(result.differences).toEqual([]);
    });
  });

  describe('deleteVersion', () => {
    it('should delete version successfully', async () => {
      const mockVersion = {
        id: 'version-2',
        versionNumber: 2,
        storedFileId: 'stored-2',
        fileId: 'file-1',
      };

      const mockFile = {
        id: 'file-1',
        currentVersion: 3,
      };

      (prisma.fileVersion.findUnique as any).mockResolvedValue(mockVersion);
      (prisma.storedFile.findUnique as any).mockResolvedValue(mockFile);
      (prisma.$transaction as any).mockImplementation((fn) => fn(prisma));
      (prisma.fileVersion.delete as any).mockResolvedValue(mockVersion);
      mockCloudStorage.deleteFile.mockResolvedValue(undefined);

      const result = await versioningService.deleteVersion('file-1', 2);

      expect(prisma.fileVersion.delete).toHaveBeenCalledWith({
        where: {
          fileId_versionNumber: {
            fileId: 'file-1',
            versionNumber: 2,
          },
        },
      });
      expect(mockCloudStorage.deleteFile).toHaveBeenCalledWith('stored-2', true);
      expect(result.success).toBe(true);
    });

    it('should prevent deletion of current version', async () => {
      const mockVersion = {
        id: 'version-3',
        versionNumber: 3,
        fileId: 'file-1',
      };

      const mockFile = {
        id: 'file-1',
        currentVersion: 3,
      };

      (prisma.fileVersion.findUnique as any).mockResolvedValue(mockVersion);
      (prisma.storedFile.findUnique as any).mockResolvedValue(mockFile);

      await expect(versioningService.deleteVersion('file-1', 3)).rejects.toThrow(
        'Cannot delete current version'
      );
    });
  });

  describe('applyRetentionPolicy', () => {
    it('should apply retention policy to old versions', async () => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 days ago

      const mockOldVersions = [
        {
          id: 'version-1',
          versionNumber: 1,
          fileId: 'file-1',
          storedFileId: 'stored-1',
          createdAt: new Date(cutoffDate.getTime() - 86400000), // 91 days ago
        },
        {
          id: 'version-2',
          versionNumber: 2,
          fileId: 'file-1',
          storedFileId: 'stored-2',
          createdAt: new Date(cutoffDate.getTime() - 86400000), // 91 days ago
        },
      ];

      const mockCurrentFiles = [
        { id: 'file-1', currentVersion: 5 },
      ];

      (prisma.storedFile.findMany as any).mockResolvedValue(mockCurrentFiles);
      (prisma.fileVersion.findMany as any).mockResolvedValue(mockOldVersions);
      (prisma.$transaction as any).mockImplementation((fn) => fn(prisma));
      (prisma.fileVersion.delete as any).mockResolvedValue({});
      mockCloudStorage.deleteFile.mockResolvedValue(undefined);

      const result = await versioningService.applyRetentionPolicy({
        maxAge: 90,
        keepMinimumVersions: 2,
      });

      expect(result).toEqual({
        processedFiles: 1,
        deletedVersions: 2,
        spaceSaved: 0, // Mock doesn't return size
        details: expect.any(Array),
      });
    });

    it('should respect minimum version count', async () => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);

      const mockVersions = [
        {
          id: 'version-1',
          versionNumber: 1,
          fileId: 'file-1',
          createdAt: new Date(cutoffDate.getTime() - 86400000), // 31 days ago
        },
        {
          id: 'version-2',
          versionNumber: 2,
          fileId: 'file-1',
          createdAt: new Date(cutoffDate.getTime() - 86400000), // 31 days ago
        },
      ];

      const mockCurrentFiles = [
        { id: 'file-1', currentVersion: 2 }, // Only 2 versions total
      ];

      (prisma.storedFile.findMany as any).mockResolvedValue(mockCurrentFiles);
      (prisma.fileVersion.findMany as any).mockResolvedValue(mockVersions);

      const result = await versioningService.applyRetentionPolicy({
        maxAge: 30,
        keepMinimumVersions: 3, // Want to keep at least 3, but only have 2
      });

      expect(result.deletedVersions).toBe(0); // Should not delete any
    });
  });

  describe('getVersionStatistics', () => {
    it('should return comprehensive version statistics', async () => {
      (prisma.fileVersion.count as any)
        .mockResolvedValueOnce(150) // Total versions
        .mockResolvedValueOnce(45); // Files with versions

      const mockVersionStats = [
        { fileId: 'file-1', _count: { id: 5 } },
        { fileId: 'file-2', _count: { id: 3 } },
        { fileId: 'file-3', _count: { id: 8 } },
      ];

      const mockChangeTypeStats = [
        { changeType: 'CONTENT_MODIFIED', _count: { id: 100 } },
        { changeType: 'CREATED', _count: { id: 45 } },
        { changeType: 'RESTORED', _count: { id: 5 } },
      ];

      (prisma.fileVersion.groupBy as any)
        .mockResolvedValueOnce(mockVersionStats)
        .mockResolvedValueOnce(mockChangeTypeStats);

      const result = await versioningService.getVersionStatistics();

      expect(result).toEqual({
        totalVersions: 150,
        filesWithVersions: 45,
        averageVersionsPerFile: 3.33,
        maxVersionsPerFile: 8,
        versionsByChangeType: {
          CONTENT_MODIFIED: 100,
          CREATED: 45,
          RESTORED: 5,
        },
        totalStorageUsed: 0, // Mock doesn't calculate storage
        totalStorageUsedFormatted: '0 B',
      });
    });
  });

  describe('error handling', () => {
    it('should handle cloud storage errors gracefully', async () => {
      const mockFile = {
        id: 'file-1',
        fileName: 'document.txt',
        mimeType: 'text/plain',
        currentVersion: 1,
      };

      (prisma.storedFile.findUnique as any).mockResolvedValue(mockFile);
      mockCloudStorage.uploadFile.mockRejectedValue(new Error('Storage service unavailable'));

      const fileBuffer = Buffer.from('content');

      await expect(
        versioningService.createVersion({
          fileId: 'file-1',
          fileData: fileBuffer,
          changeType: 'CONTENT_MODIFIED',
          userId: 'user-1',
        })
      ).rejects.toThrow('Failed to create file version');
    });

    it('should handle database errors during version operations', async () => {
      const mockFile = {
        id: 'file-1',
        fileName: 'document.txt',
        mimeType: 'text/plain',
        currentVersion: 1,
      };

      const mockNewFile = {
        id: 'new-file-1',
        storageKey: 'files/document_v2.txt',
      };

      (prisma.storedFile.findUnique as any).mockResolvedValue(mockFile);
      mockCloudStorage.uploadFile.mockResolvedValue(mockNewFile);
      (prisma.$transaction as any).mockRejectedValue(new Error('Database transaction failed'));

      const fileBuffer = Buffer.from('content');

      await expect(
        versioningService.createVersion({
          fileId: 'file-1',
          fileData: fileBuffer,
          changeType: 'CONTENT_MODIFIED',
          userId: 'user-1',
        })
      ).rejects.toThrow('Failed to create file version');
    });
  });
});