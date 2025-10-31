import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MultipartUploadService } from '../../services/MultipartUploadService';
import { prisma } from '../../lib/prisma';
import { S3Client } from '@aws-sdk/client-s3';

// Mock AWS S3 Client
vi.mock('@aws-sdk/client-s3');

// Mock prisma
vi.mock('../../lib/prisma', () => ({
  prisma: {
    multipartUpload: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    storedFile: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock CloudStorageService
vi.mock('../../services/CloudStorageService', () => ({
  CloudStorageService: vi.fn().mockImplementation(() => ({
    generateSignedUrl: vi.fn(),
    uploadFile: vi.fn(),
  })),
}));

// Mock storage configuration
vi.mock('../../config/storage', () => ({
  storageConfig: {
    provider: {
      type: 's3',
      region: 'us-east-1',
      accessKey: 'test-access-key',
      secretKey: 'test-secret-key',
      bucket: 'test-bucket',
    },
    multipart: {
      chunkSize: 5 * 1024 * 1024, // 5MB
      maxParts: 10000,
      expirationTime: 24 * 60 * 60 * 1000, // 24 hours
    },
  },
}));

describe('MultipartUploadService', () => {
  let multipartService: MultipartUploadService;
  let mockS3Client: any;

  beforeEach(async () => {
    multipartService = new MultipartUploadService();
    await multipartService.initialize();

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

  describe('initializeUpload', () => {
    it('should initialize multipart upload successfully', async () => {
      const mockInitResponse = {
        UploadId: 'test-upload-id-123',
        Bucket: 'test-bucket',
        Key: 'files/large-file.bin',
      };

      const mockUploadRecord = {
        id: 'upload-1',
        uploadId: 'test-upload-id-123',
        fileName: 'large-file.bin',
        totalSize: 100000000,
        chunkSize: 5242880,
        totalParts: 20,
        status: 'INITIALIZED',
        storageKey: 'files/large-file.bin',
        bucket: 'test-bucket',
        provider: 'S3',
        initiatedAt: new Date(),
      };

      mockS3Client.send.mockResolvedValue(mockInitResponse);
      (prisma.multipartUpload.create as any).mockResolvedValue(mockUploadRecord);

      const result = await multipartService.initializeUpload({
        fileName: 'large-file.bin',
        fileSize: 100000000,
        mimeType: 'application/octet-stream',
        userId: 'user-1',
        metadata: { description: 'Large test file' },
      });

      expect(mockS3Client.send).toHaveBeenCalled();
      expect(prisma.multipartUpload.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          uploadId: 'test-upload-id-123',
          fileName: 'large-file.bin',
          totalSize: 100000000,
          chunkSize: 5242880,
          totalParts: 20,
          status: 'INITIALIZED',
          userId: 'user-1',
        }),
      });
      expect(result).toEqual(mockUploadRecord);
    });

    it('should validate file size requirements', async () => {
      const smallFileSize = 1024 * 1024; // 1MB - below minimum

      await expect(
        multipartService.initializeUpload({
          fileName: 'small-file.txt',
          fileSize: smallFileSize,
          mimeType: 'text/plain',
          userId: 'user-1',
        })
      ).rejects.toThrow('File size must be at least 5MB for multipart upload');
    });

    it('should validate maximum file size', async () => {
      const hugeFileSize = 6 * 1024 * 1024 * 1024 * 1024; // 6TB

      await expect(
        multipartService.initializeUpload({
          fileName: 'huge-file.bin',
          fileSize: hugeFileSize,
          mimeType: 'application/octet-stream',
          userId: 'user-1',
        })
      ).rejects.toThrow('File size exceeds maximum limit');
    });

    it('should handle S3 initialization failure', async () => {
      mockS3Client.send.mockRejectedValue(new Error('S3 initialization failed'));

      await expect(
        multipartService.initializeUpload({
          fileName: 'test-file.bin',
          fileSize: 100000000,
          mimeType: 'application/octet-stream',
          userId: 'user-1',
        })
      ).rejects.toThrow('Failed to initialize multipart upload');
    });
  });

  describe('uploadPart', () => {
    it('should upload part successfully', async () => {
      const mockUpload = {
        id: 'upload-1',
        uploadId: 'test-upload-id-123',
        fileName: 'large-file.bin',
        status: 'IN_PROGRESS',
        bucket: 'test-bucket',
        storageKey: 'files/large-file.bin',
        totalParts: 10,
        completedParts: 0,
      };

      const mockPartResponse = {
        ETag: '"part-etag-123"',
      };

      const partBuffer = Buffer.alloc(5242880); // 5MB chunk

      (prisma.multipartUpload.findUnique as any).mockResolvedValue(mockUpload);
      mockS3Client.send.mockResolvedValue(mockPartResponse);
      (prisma.multipartUpload.update as any).mockResolvedValue({
        ...mockUpload,
        completedParts: 1,
        parts: [{ partNumber: 1, etag: '"part-etag-123"', size: 5242880 }],
      });

      const result = await multipartService.uploadPart('upload-1', 1, partBuffer);

      expect(prisma.multipartUpload.findUnique).toHaveBeenCalledWith({
        where: { id: 'upload-1' },
      });
      expect(mockS3Client.send).toHaveBeenCalled();
      expect(result).toEqual({
        partNumber: 1,
        etag: '"part-etag-123"',
        size: 5242880,
        completed: true,
      });
    });

    it('should handle duplicate part upload', async () => {
      const mockUpload = {
        id: 'upload-1',
        uploadId: 'test-upload-id-123',
        status: 'IN_PROGRESS',
        parts: [
          { partNumber: 1, etag: '"existing-etag"', size: 5242880 }
        ],
      };

      (prisma.multipartUpload.findUnique as any).mockResolvedValue(mockUpload);

      const partBuffer = Buffer.alloc(5242880);
      const result = await multipartService.uploadPart('upload-1', 1, partBuffer);

      expect(mockS3Client.send).not.toHaveBeenCalled();
      expect(result).toEqual({
        partNumber: 1,
        etag: '"existing-etag"',
        size: 5242880,
        completed: true,
        skipped: true,
      });
    });

    it('should validate part number', async () => {
      const mockUpload = {
        id: 'upload-1',
        totalParts: 10,
        status: 'IN_PROGRESS',
      };

      (prisma.multipartUpload.findUnique as any).mockResolvedValue(mockUpload);

      const partBuffer = Buffer.alloc(5242880);

      await expect(
        multipartService.uploadPart('upload-1', 15, partBuffer)
      ).rejects.toThrow('Invalid part number. Must be between 1 and 10');
    });

    it('should handle upload not found', async () => {
      (prisma.multipartUpload.findUnique as any).mockResolvedValue(null);

      const partBuffer = Buffer.alloc(5242880);

      await expect(
        multipartService.uploadPart('non-existent-upload', 1, partBuffer)
      ).rejects.toThrow('Multipart upload not found');
    });
  });

  describe('completeUpload', () => {
    it('should complete multipart upload successfully', async () => {
      const mockUpload = {
        id: 'upload-1',
        uploadId: 'test-upload-id-123',
        fileName: 'large-file.bin',
        originalName: 'large-file.bin',
        mimeType: 'application/octet-stream',
        totalSize: 10485760,
        totalParts: 2,
        completedParts: 2,
        status: 'IN_PROGRESS',
        bucket: 'test-bucket',
        storageKey: 'files/large-file.bin',
        provider: 'S3',
        userId: 'user-1',
        parts: [
          { partNumber: 1, etag: '"etag-1"', size: 5242880 },
          { partNumber: 2, etag: '"etag-2"', size: 5242880 },
        ],
      };

      const mockCompleteResponse = {
        Location: 'https://test-bucket.s3.amazonaws.com/files/large-file.bin',
        ETag: '"final-etag"',
      };

      const mockStoredFile = {
        id: 'file-1',
        fileName: 'large-file.bin',
        originalName: 'large-file.bin',
        mimeType: 'application/octet-stream',
        size: 10485760,
        storageKey: 'files/large-file.bin',
        provider: 'S3',
        bucket: 'test-bucket',
        checksum: 'calculated-checksum',
        createdAt: new Date(),
      };

      (prisma.multipartUpload.findUnique as any).mockResolvedValue(mockUpload);
      mockS3Client.send.mockResolvedValue(mockCompleteResponse);
      (prisma.$transaction as any).mockImplementation((fn) => fn(prisma));
      (prisma.storedFile.create as any).mockResolvedValue(mockStoredFile);
      (prisma.multipartUpload.update as any).mockResolvedValue({
        ...mockUpload,
        status: 'COMPLETED',
        completedAt: new Date(),
      });

      const result = await multipartService.completeUpload('upload-1');

      expect(mockS3Client.send).toHaveBeenCalled();
      expect(prisma.storedFile.create).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        storedFile: mockStoredFile,
        uploadRecord: expect.objectContaining({
          status: 'COMPLETED',
        }),
      });
    });

    it('should handle incomplete upload', async () => {
      const mockUpload = {
        id: 'upload-1',
        totalParts: 10,
        completedParts: 8,
        status: 'IN_PROGRESS',
        parts: Array.from({ length: 8 }, (_, i) => ({
          partNumber: i + 1,
          etag: `"etag-${i + 1}"`,
          size: 5242880,
        })),
      };

      (prisma.multipartUpload.findUnique as any).mockResolvedValue(mockUpload);

      await expect(multipartService.completeUpload('upload-1')).rejects.toThrow(
        'Upload is incomplete. 8 of 10 parts uploaded.'
      );
    });

    it('should handle already completed upload', async () => {
      const mockUpload = {
        id: 'upload-1',
        status: 'COMPLETED',
      };

      (prisma.multipartUpload.findUnique as any).mockResolvedValue(mockUpload);

      await expect(multipartService.completeUpload('upload-1')).rejects.toThrow(
        'Upload is already completed or aborted'
      );
    });
  });

  describe('abortUpload', () => {
    it('should abort multipart upload successfully', async () => {
      const mockUpload = {
        id: 'upload-1',
        uploadId: 'test-upload-id-123',
        status: 'IN_PROGRESS',
        bucket: 'test-bucket',
        storageKey: 'files/large-file.bin',
      };

      (prisma.multipartUpload.findUnique as any).mockResolvedValue(mockUpload);
      mockS3Client.send.mockResolvedValue({});
      (prisma.multipartUpload.update as any).mockResolvedValue({
        ...mockUpload,
        status: 'ABORTED',
        abortedAt: new Date(),
      });

      const result = await multipartService.abortUpload('upload-1');

      expect(mockS3Client.send).toHaveBeenCalled();
      expect(prisma.multipartUpload.update).toHaveBeenCalledWith({
        where: { id: 'upload-1' },
        data: {
          status: 'ABORTED',
          abortedAt: expect.any(Date),
        },
      });
      expect(result.success).toBe(true);
    });

    it('should handle already completed upload', async () => {
      const mockUpload = {
        id: 'upload-1',
        status: 'COMPLETED',
      };

      (prisma.multipartUpload.findUnique as any).mockResolvedValue(mockUpload);

      await expect(multipartService.abortUpload('upload-1')).rejects.toThrow(
        'Cannot abort completed upload'
      );
    });
  });

  describe('getUploadProgress', () => {
    it('should return upload progress information', async () => {
      const mockUpload = {
        id: 'upload-1',
        fileName: 'large-file.bin',
        totalSize: 104857600, // 100MB
        totalParts: 20,
        completedParts: 12,
        status: 'IN_PROGRESS',
        initiatedAt: new Date('2023-01-01T10:00:00Z'),
        parts: Array.from({ length: 12 }, (_, i) => ({
          partNumber: i + 1,
          size: 5242880,
          uploadedAt: new Date(`2023-01-01T10:${(i + 1).toString().padStart(2, '0')}:00Z`),
        })),
      };

      (prisma.multipartUpload.findUnique as any).mockResolvedValue(mockUpload);

      const result = await multipartService.getUploadProgress('upload-1');

      expect(result).toEqual({
        uploadId: 'upload-1',
        fileName: 'large-file.bin',
        totalSize: 104857600,
        uploadedSize: 62914560, // 12 parts * 5MB
        totalParts: 20,
        completedParts: 12,
        progress: 60.0,
        status: 'IN_PROGRESS',
        initiatedAt: mockUpload.initiatedAt,
        estimatedTimeRemaining: expect.any(Number),
        uploadSpeed: expect.any(Number),
        completedPartsInfo: expect.any(Array),
      });
    });

    it('should handle completed upload progress', async () => {
      const mockUpload = {
        id: 'upload-1',
        fileName: 'large-file.bin',
        totalSize: 104857600,
        totalParts: 20,
        completedParts: 20,
        status: 'COMPLETED',
        completedAt: new Date(),
      };

      (prisma.multipartUpload.findUnique as any).mockResolvedValue(mockUpload);

      const result = await multipartService.getUploadProgress('upload-1');

      expect(result.progress).toBe(100.0);
      expect(result.status).toBe('COMPLETED');
      expect(result.estimatedTimeRemaining).toBe(0);
    });
  });

  describe('listActiveUploads', () => {
    it('should list active uploads for user', async () => {
      const mockUploads = [
        {
          id: 'upload-1',
          fileName: 'file1.bin',
          totalSize: 104857600,
          completedParts: 5,
          totalParts: 20,
          status: 'IN_PROGRESS',
          initiatedAt: new Date(),
        },
        {
          id: 'upload-2',
          fileName: 'file2.bin',
          totalSize: 52428800,
          completedParts: 10,
          totalParts: 10,
          status: 'COMPLETED',
          initiatedAt: new Date(),
        },
      ];

      (prisma.multipartUpload.findMany as any).mockResolvedValue(mockUploads);

      const result = await multipartService.listActiveUploads('user-1');

      expect(prisma.multipartUpload.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          status: { in: ['INITIALIZED', 'IN_PROGRESS'] },
        },
        orderBy: { initiatedAt: 'desc' },
        select: expect.any(Object),
      });
      expect(result).toHaveLength(1); // Only IN_PROGRESS uploads
    });
  });

  describe('cleanupExpiredUploads', () => {
    it('should cleanup expired uploads', async () => {
      const expiredDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago

      const mockExpiredUploads = [
        {
          id: 'expired-1',
          uploadId: 'expired-upload-id-1',
          bucket: 'test-bucket',
          storageKey: 'files/expired1.bin',
          initiatedAt: expiredDate,
        },
        {
          id: 'expired-2',
          uploadId: 'expired-upload-id-2',
          bucket: 'test-bucket',
          storageKey: 'files/expired2.bin',
          initiatedAt: expiredDate,
        },
      ];

      (prisma.multipartUpload.findMany as any).mockResolvedValue(mockExpiredUploads);
      mockS3Client.send.mockResolvedValue({});
      (prisma.$transaction as any).mockImplementation((fn) => fn(prisma));
      (prisma.multipartUpload.update as any).mockResolvedValue({});

      const result = await multipartService.cleanupExpiredUploads();

      expect(mockS3Client.send).toHaveBeenCalledTimes(2); // Abort each upload
      expect(result).toEqual({
        cleanedCount: 2,
        cleanedUploads: mockExpiredUploads.map(u => u.id),
      });
    });

    it('should handle cleanup with no expired uploads', async () => {
      (prisma.multipartUpload.findMany as any).mockResolvedValue([]);

      const result = await multipartService.cleanupExpiredUploads();

      expect(result).toEqual({
        cleanedCount: 0,
        cleanedUploads: [],
      });
    });
  });

  describe('calculateOptimalChunkSize', () => {
    it('should calculate optimal chunk size for large files', async () => {
      const fileSize = 500 * 1024 * 1024 * 1024; // 500GB

      const result = await multipartService.calculateOptimalChunkSize(fileSize);

      expect(result.chunkSize).toBeGreaterThan(5 * 1024 * 1024); // At least 5MB
      expect(result.totalParts).toBeLessThanOrEqual(10000); // AWS limit
      expect(result.chunkSize * result.totalParts).toBeGreaterThanOrEqual(fileSize);
    });

    it('should use minimum chunk size for smaller files', async () => {
      const fileSize = 50 * 1024 * 1024; // 50MB

      const result = await multipartService.calculateOptimalChunkSize(fileSize);

      expect(result.chunkSize).toBe(5 * 1024 * 1024); // 5MB minimum
      expect(result.totalParts).toBe(10);
    });
  });

  describe('error handling', () => {
    it('should handle S3 service errors gracefully', async () => {
      mockS3Client.send.mockRejectedValue(new Error('ServiceUnavailable'));

      await expect(
        multipartService.initializeUpload({
          fileName: 'test.bin',
          fileSize: 100000000,
          mimeType: 'application/octet-stream',
          userId: 'user-1',
        })
      ).rejects.toThrow('Failed to initialize multipart upload');
    });

    it('should handle database errors during upload operations', async () => {
      const mockUpload = {
        id: 'upload-1',
        uploadId: 'test-upload-id',
        status: 'IN_PROGRESS',
        bucket: 'test-bucket',
        storageKey: 'files/test.bin',
        totalParts: 10,
        completedParts: 0,
      };

      (prisma.multipartUpload.findUnique as any).mockResolvedValue(mockUpload);
      mockS3Client.send.mockResolvedValue({ ETag: '"test-etag"' });
      (prisma.multipartUpload.update as any).mockRejectedValue(new Error('Database error'));

      const partBuffer = Buffer.alloc(5242880);

      await expect(
        multipartService.uploadPart('upload-1', 1, partBuffer)
      ).rejects.toThrow('Failed to upload part');
    });
  });
});