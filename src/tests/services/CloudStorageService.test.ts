import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CloudStorageService } from '../../services/CloudStorageService';
import { prisma } from '../../lib/prisma';
import { S3Client } from '@aws-sdk/client-s3';

// Mock AWS S3 Client
vi.mock('@aws-sdk/client-s3');
vi.mock('@aws-sdk/s3-request-presigner');

// Mock prisma
vi.mock('../../lib/prisma', () => ({
  prisma: {
    storedFile: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    fileAccessLog: {
      create: vi.fn(),
    },
    storageMetrics: {
      create: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

// Mock storage configuration
vi.mock('../../config/storage', () => ({
  getStorageConfig: () => ({
    provider: {
      type: 's3',
      region: 'us-east-1',
      accessKey: 'test-access-key',
      secretKey: 'test-secret-key',
      bucket: 'test-bucket',
    },
    enableEncryption: true,
    defaultStorageClass: 'STANDARD',
  }),
}));

describe('CloudStorageService', () => {
  let cloudStorageService: CloudStorageService;
  let mockS3Client: any;

  beforeEach(async () => {
    cloudStorageService = new CloudStorageService();
    await cloudStorageService.initialize();

    mockS3Client = {
      send: vi.fn(),
    };

    // Mock the S3Client constructor to return our mock
    (S3Client as any).mockImplementation(() => mockS3Client);

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('uploadFile', () => {
    it('should upload file successfully to S3', async () => {
      const mockFileBuffer = Buffer.from('test file content');
      const mockStoredFile = {
        id: 'file-1',
        fileName: 'test-file.txt',
        originalName: 'test-file.txt',
        mimeType: 'text/plain',
        size: mockFileBuffer.length,
        checksum: 'test-checksum',
        storageKey: 'files/test-file.txt',
        storageClass: 'STANDARD',
        provider: 'S3',
        bucket: 'test-bucket',
        region: 'us-east-1',
        encrypted: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock successful S3 upload
      mockS3Client.send.mockResolvedValue({
        ETag: '"test-etag"',
        Location: 'https://test-bucket.s3.amazonaws.com/files/test-file.txt',
      });

      // Mock prisma create
      (prisma.storedFile.create as any).mockResolvedValue(mockStoredFile);

      const result = await cloudStorageService.uploadFile(
        mockFileBuffer,
        'test-file.txt',
        'text/plain'
      );

      expect(mockS3Client.send).toHaveBeenCalled();
      expect(prisma.storedFile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fileName: 'test-file.txt',
          originalName: 'test-file.txt',
          mimeType: 'text/plain',
          size: mockFileBuffer.length,
          provider: 'S3',
          bucket: 'test-bucket',
          encrypted: true,
        }),
      });
      expect(result).toEqual(mockStoredFile);
    });

    it('should handle upload failure', async () => {
      const mockFileBuffer = Buffer.from('test file content');

      // Mock S3 upload failure
      mockS3Client.send.mockRejectedValue(new Error('S3 upload failed'));

      await expect(
        cloudStorageService.uploadFile(mockFileBuffer, 'test-file.txt', 'text/plain')
      ).rejects.toThrow('Failed to upload file to cloud storage');
    });

    it('should validate file size limits', async () => {
      const largeMockBuffer = Buffer.alloc(6 * 1024 * 1024 * 1024); // 6GB

      await expect(
        cloudStorageService.uploadFile(largeMockBuffer, 'large-file.bin', 'application/octet-stream')
      ).rejects.toThrow('File size exceeds maximum limit');
    });
  });

  describe('downloadFile', () => {
    it('should download file successfully', async () => {
      const mockFileContent = Buffer.from('test file content');
      const mockStoredFile = {
        id: 'file-1',
        storageKey: 'files/test-file.txt',
        bucket: 'test-bucket',
        provider: 'S3',
        fileName: 'test-file.txt',
        mimeType: 'text/plain',
      };

      // Mock prisma findUnique
      (prisma.storedFile.findUnique as any).mockResolvedValue(mockStoredFile);

      // Mock S3 download
      mockS3Client.send.mockResolvedValue({
        Body: {
          transformToByteArray: () => Promise.resolve(new Uint8Array(mockFileContent)),
        },
      });

      const result = await cloudStorageService.downloadFile('file-1');

      expect(prisma.storedFile.findUnique).toHaveBeenCalledWith({
        where: { id: 'file-1' },
      });
      expect(mockS3Client.send).toHaveBeenCalled();
      expect(result).toEqual(mockFileContent);
    });

    it('should throw error for non-existent file', async () => {
      (prisma.storedFile.findUnique as any).mockResolvedValue(null);

      await expect(cloudStorageService.downloadFile('non-existent-file')).rejects.toThrow(
        'File not found'
      );
    });

    it('should log file access', async () => {
      const mockStoredFile = {
        id: 'file-1',
        storageKey: 'files/test-file.txt',
        bucket: 'test-bucket',
        provider: 'S3',
      };
      const mockFileContent = Buffer.from('test content');

      (prisma.storedFile.findUnique as any).mockResolvedValue(mockStoredFile);
      mockS3Client.send.mockResolvedValue({
        Body: {
          transformToByteArray: () => Promise.resolve(new Uint8Array(mockFileContent)),
        },
      });

      await cloudStorageService.downloadFile('file-1', 'user-1');

      expect(prisma.fileAccessLog.create).toHaveBeenCalledWith({
        data: {
          fileId: 'file-1',
          userId: 'user-1',
          action: 'DOWNLOAD',
          ipAddress: undefined,
          userAgent: undefined,
        },
      });
    });
  });

  describe('generateSignedUrl', () => {
    it('should generate signed URL for download', async () => {
      const mockStoredFile = {
        id: 'file-1',
        storageKey: 'files/test-file.txt',
        bucket: 'test-bucket',
        provider: 'S3',
      };

      (prisma.storedFile.findUnique as any).mockResolvedValue(mockStoredFile);

      // Mock getSignedUrl
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      (getSignedUrl as any).mockResolvedValue('https://signed-url.com/test-file.txt');

      const result = await cloudStorageService.generateSignedUrl('file-1', 'download', 3600);

      expect(result).toBe('https://signed-url.com/test-file.txt');
    });

    it('should generate signed URL for upload', async () => {
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      (getSignedUrl as any).mockResolvedValue('https://signed-upload-url.com/test-file.txt');

      const result = await cloudStorageService.generateSignedUrl(
        'files/new-file.txt',
        'upload',
        3600
      );

      expect(result).toBe('https://signed-upload-url.com/test-file.txt');
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      const mockStoredFile = {
        id: 'file-1',
        storageKey: 'files/test-file.txt',
        bucket: 'test-bucket',
        provider: 'S3',
      };

      (prisma.storedFile.findUnique as any).mockResolvedValue(mockStoredFile);
      mockS3Client.send.mockResolvedValue({});
      (prisma.storedFile.delete as any).mockResolvedValue(mockStoredFile);

      await cloudStorageService.deleteFile('file-1');

      expect(mockS3Client.send).toHaveBeenCalled();
      expect(prisma.storedFile.delete).toHaveBeenCalledWith({
        where: { id: 'file-1' },
      });
    });

    it('should handle soft delete', async () => {
      const mockStoredFile = {
        id: 'file-1',
        storageKey: 'files/test-file.txt',
        bucket: 'test-bucket',
        provider: 'S3',
      };

      (prisma.storedFile.findUnique as any).mockResolvedValue(mockStoredFile);
      (prisma.storedFile.update as any).mockResolvedValue({
        ...mockStoredFile,
        deletedAt: new Date(),
      });

      await cloudStorageService.deleteFile('file-1', false);

      expect(prisma.storedFile.update).toHaveBeenCalledWith({
        where: { id: 'file-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('checkDuplicates', () => {
    it('should find duplicate files by checksum', async () => {
      const mockDuplicates = [
        {
          id: 'file-1',
          fileName: 'test1.txt',
          checksum: 'test-checksum',
          size: 100,
        },
        {
          id: 'file-2',
          fileName: 'test2.txt',
          checksum: 'test-checksum',
          size: 100,
        },
      ];

      (prisma.storedFile.findMany as any).mockResolvedValue(mockDuplicates);

      const result = await cloudStorageService.checkDuplicates('test-checksum');

      expect(prisma.storedFile.findMany).toHaveBeenCalledWith({
        where: {
          checksum: 'test-checksum',
          deletedAt: null,
        },
        select: {
          id: true,
          fileName: true,
          checksum: true,
          size: true,
          createdAt: true,
        },
      });
      expect(result).toEqual(mockDuplicates);
    });
  });

  describe('getStorageStatistics', () => {
    it('should return comprehensive storage statistics', async () => {
      // Mock file count and size aggregation
      (prisma.storedFile.count as any).mockResolvedValue(150);
      (prisma.storedFile.aggregate as any).mockResolvedValue({
        _sum: { size: 5000000000 }, // 5GB
      });

      // Mock files by provider
      (prisma.storedFile.findMany as any)
        .mockResolvedValueOnce([
          { provider: 'S3', _count: 100 },
          { provider: 'MINIO', _count: 50 },
        ])
        .mockResolvedValueOnce([
          { storageClass: 'STANDARD', _count: 120 },
          { storageClass: 'INFREQUENT_ACCESS', _count: 30 },
        ]);

      const result = await cloudStorageService.getStorageStatistics();

      expect(result).toEqual({
        totalFiles: 150,
        totalSize: 5000000000,
        totalSizeFormatted: '4.66 GB',
        filesByProvider: {
          S3: 100,
          MINIO: 50,
        },
        filesByStorageClass: {
          STANDARD: 120,
          INFREQUENT_ACCESS: 30,
        },
        averageFileSize: 33333333.33,
        averageFileSizeFormatted: '31.78 MB',
      });
    });
  });

  describe('copyFile', () => {
    it('should copy file within same bucket', async () => {
      const sourceFile = {
        id: 'source-file',
        storageKey: 'files/source.txt',
        bucket: 'test-bucket',
        provider: 'S3',
        fileName: 'source.txt',
        mimeType: 'text/plain',
        size: 100,
        checksum: 'source-checksum',
      };

      const newFile = {
        id: 'new-file',
        storageKey: 'files/destination.txt',
        bucket: 'test-bucket',
        provider: 'S3',
        fileName: 'destination.txt',
        mimeType: 'text/plain',
        size: 100,
        checksum: 'source-checksum',
      };

      (prisma.storedFile.findUnique as any).mockResolvedValue(sourceFile);
      mockS3Client.send.mockResolvedValue({});
      (prisma.storedFile.create as any).mockResolvedValue(newFile);

      const result = await cloudStorageService.copyFile('source-file', 'files/destination.txt');

      expect(mockS3Client.send).toHaveBeenCalled();
      expect(prisma.storedFile.create).toHaveBeenCalled();
      expect(result).toEqual(newFile);
    });
  });

  describe('moveFile', () => {
    it('should move file to new location', async () => {
      const sourceFile = {
        id: 'file-1',
        storageKey: 'files/old-location.txt',
        bucket: 'test-bucket',
        provider: 'S3',
      };

      const updatedFile = {
        ...sourceFile,
        storageKey: 'files/new-location.txt',
      };

      (prisma.storedFile.findUnique as any).mockResolvedValue(sourceFile);
      mockS3Client.send.mockResolvedValue({}).mockResolvedValue({});
      (prisma.storedFile.update as any).mockResolvedValue(updatedFile);

      const result = await cloudStorageService.moveFile('file-1', 'files/new-location.txt');

      expect(mockS3Client.send).toHaveBeenCalledTimes(2); // Copy and delete
      expect(prisma.storedFile.update).toHaveBeenCalledWith({
        where: { id: 'file-1' },
        data: { storageKey: 'files/new-location.txt' },
      });
      expect(result).toEqual(updatedFile);
    });
  });

  describe('error handling', () => {
    it('should handle S3 service errors gracefully', async () => {
      const mockFileBuffer = Buffer.from('test');

      mockS3Client.send.mockRejectedValue(new Error('ServiceUnavailable'));

      await expect(
        cloudStorageService.uploadFile(mockFileBuffer, 'test.txt', 'text/plain')
      ).rejects.toThrow('Failed to upload file to cloud storage');
    });

    it('should handle database errors during file operations', async () => {
      const mockFileBuffer = Buffer.from('test');

      mockS3Client.send.mockResolvedValue({ ETag: '"test"' });
      (prisma.storedFile.create as any).mockRejectedValue(new Error('Database error'));

      await expect(
        cloudStorageService.uploadFile(mockFileBuffer, 'test.txt', 'text/plain')
      ).rejects.toThrow('Failed to upload file to cloud storage');
    });
  });
});