import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FileUploadService } from '../../services/FileUploadService';
import { prisma } from '../../lib/prisma';

// Mock all the cloud storage services
vi.mock('../../services/CloudStorageService', () => ({
  CloudStorageService: vi.fn().mockImplementation(() => ({
    uploadFile: vi.fn(),
    downloadFile: vi.fn(),
    deleteFile: vi.fn(),
    getStorageStatistics: vi.fn(),
  })),
}));

vi.mock('../../services/FileDeduplicationService', () => ({
  FileDeduplicationService: vi.fn().mockImplementation(() => ({
    calculateChecksum: vi.fn(),
    findDuplicatesByChecksum: vi.fn(),
  })),
}));

vi.mock('../../services/FileVersioningService', () => ({
  FileVersioningService: vi.fn().mockImplementation(() => ({
    createVersion: vi.fn(),
  })),
}));

vi.mock('../../services/MultipartUploadService', () => ({
  MultipartUploadService: vi.fn().mockImplementation(() => ({
    initializeUpload: vi.fn(),
    uploadPart: vi.fn(),
    completeUpload: vi.fn(),
    abortUpload: vi.fn(),
    getUploadProgress: vi.fn(),
  })),
}));

// Mock prisma
vi.mock('../../lib/prisma', () => ({
  prisma: {
    attachment: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    storedFile: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
  },
}));

// Mock file system operations
vi.mock('fs/promises', () => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
  stat: vi.fn(),
}));

describe('FileUploadService - Enhanced Cloud Storage Features', () => {
  let fileUploadService: FileUploadService;
  let mockCloudStorage: any;
  let mockDeduplication: any;
  let mockVersioning: any;
  let mockMultipart: any;

  beforeEach(() => {
    fileUploadService = new FileUploadService();

    mockCloudStorage = {
      uploadFile: vi.fn(),
      downloadFile: vi.fn(),
      deleteFile: vi.fn(),
      getStorageStatistics: vi.fn(),
    };

    mockDeduplication = {
      calculateChecksum: vi.fn(),
      findDuplicatesByChecksum: vi.fn(),
    };

    mockVersioning = {
      createVersion: vi.fn(),
    };

    mockMultipart = {
      initializeUpload: vi.fn(),
      uploadPart: vi.fn(),
      completeUpload: vi.fn(),
      abortUpload: vi.fn(),
      getUploadProgress: vi.fn(),
    };

    // Replace internal services
    (fileUploadService as any).cloudStorageService = mockCloudStorage;
    (fileUploadService as any).deduplicationService = mockDeduplication;
    (fileUploadService as any).versioningService = mockVersioning;
    (fileUploadService as any).multipartUploadService = mockMultipart;

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('uploadFileEnhanced', () => {
    const mockFile = {
      originalname: 'test-document.pdf',
      mimetype: 'application/pdf',
      buffer: Buffer.from('test pdf content'),
      size: 1024,
    };

    it('should upload file with cloud storage enabled', async () => {
      const mockStoredFile = {
        id: 'stored-file-1',
        fileName: 'test-document.pdf',
        originalName: 'test-document.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        storageKey: 'files/test-document.pdf',
        checksum: 'test-checksum',
      };

      const mockAttachment = {
        id: 'attachment-1',
        filename: 'test-document.pdf',
        filepath: 'files/test-document.pdf',
        size: 1024,
        type: 'application/pdf',
        documentType: 'work-instruction',
        documentId: 'doc-1',
        attachmentType: 'REFERENCE',
        cloudFileId: 'stored-file-1',
      };

      mockCloudStorage.uploadFile.mockResolvedValue(mockStoredFile);
      (prisma.attachment.create as any).mockResolvedValue(mockAttachment);

      const options = {
        enableCloudStorage: true,
        enableDeduplication: false,
        enableVersioning: false,
        documentType: 'work-instruction',
        documentId: 'doc-1',
        attachmentType: 'REFERENCE',
        userId: 'user-1',
        userName: 'Test User',
      };

      const result = await fileUploadService.uploadFileEnhanced(mockFile, options);

      expect(mockCloudStorage.uploadFile).toHaveBeenCalledWith(
        mockFile.buffer,
        mockFile.originalname,
        mockFile.mimetype
      );
      expect(prisma.attachment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          filename: 'test-document.pdf',
          documentType: 'work-instruction',
          documentId: 'doc-1',
          attachmentType: 'REFERENCE',
          cloudFileId: 'stored-file-1',
          uploadedBy: 'user-1',
          uploadedByName: 'Test User',
        }),
      });
      expect(result).toEqual({
        success: true,
        attachment: mockAttachment,
        cloudFile: mockStoredFile,
        deduplication: undefined,
        version: undefined,
      });
    });

    it('should handle deduplication when enabled', async () => {
      const mockChecksum = 'duplicate-checksum';
      const mockDuplicates = [
        {
          id: 'existing-file-1',
          fileName: 'existing-document.pdf',
          checksum: mockChecksum,
          size: 1024,
        },
      ];

      const mockAttachment = {
        id: 'attachment-1',
        filename: 'test-document.pdf',
        cloudFileId: 'existing-file-1', // Links to existing file
      };

      mockDeduplication.calculateChecksum.mockResolvedValue(mockChecksum);
      mockDeduplication.findDuplicatesByChecksum.mockResolvedValue(mockDuplicates);
      (prisma.attachment.create as any).mockResolvedValue(mockAttachment);

      const options = {
        enableCloudStorage: true,
        enableDeduplication: true,
        documentType: 'work-instruction',
        documentId: 'doc-1',
        userId: 'user-1',
      };

      const result = await fileUploadService.uploadFileEnhanced(mockFile, options);

      expect(mockDeduplication.calculateChecksum).toHaveBeenCalledWith(mockFile.buffer);
      expect(mockDeduplication.findDuplicatesByChecksum).toHaveBeenCalledWith(mockChecksum);
      expect(mockCloudStorage.uploadFile).not.toHaveBeenCalled(); // Should not upload duplicate
      expect(result).toEqual({
        success: true,
        attachment: mockAttachment,
        cloudFile: mockDuplicates[0],
        deduplication: {
          isDuplicate: true,
          existingFiles: mockDuplicates,
          spaceSaved: 1024,
        },
        version: undefined,
      });
    });

    it('should create new version when versioning enabled for existing file', async () => {
      const mockExistingFile = {
        id: 'existing-file-1',
        fileName: 'document.pdf',
        currentVersion: 1,
      };

      const mockVersion = {
        id: 'version-2',
        fileId: 'existing-file-1',
        versionNumber: 2,
        changeType: 'CONTENT_MODIFIED',
        createdBy: 'user-1',
      };

      const mockAttachment = {
        id: 'attachment-1',
        filename: 'document.pdf',
        cloudFileId: 'existing-file-1',
      };

      (prisma.storedFile.findUnique as any).mockResolvedValue(mockExistingFile);
      mockVersioning.createVersion.mockResolvedValue(mockVersion);
      (prisma.attachment.create as any).mockResolvedValue(mockAttachment);

      const options = {
        enableCloudStorage: true,
        enableVersioning: true,
        existingFileId: 'existing-file-1',
        documentType: 'work-instruction',
        documentId: 'doc-1',
        userId: 'user-1',
        metadata: { reason: 'Content update' },
      };

      const result = await fileUploadService.uploadFileEnhanced(mockFile, options);

      expect(mockVersioning.createVersion).toHaveBeenCalledWith({
        fileId: 'existing-file-1',
        fileData: mockFile.buffer,
        changeType: 'CONTENT_MODIFIED',
        comment: undefined,
        userId: 'user-1',
        metadata: { reason: 'Content update' },
      });
      expect(result.version).toEqual(mockVersion);
    });

    it('should handle multipart upload for large files', async () => {
      const largeFile = {
        originalname: 'large-video.mp4',
        mimetype: 'video/mp4',
        buffer: Buffer.alloc(100 * 1024 * 1024), // 100MB
        size: 100 * 1024 * 1024,
      };

      const mockMultipartInit = {
        id: 'upload-1',
        uploadId: 'aws-upload-id',
        fileName: 'large-video.mp4',
        totalParts: 20,
        chunkSize: 5242880,
      };

      mockMultipart.initializeUpload.mockResolvedValue(mockMultipartInit);

      const options = {
        enableCloudStorage: true,
        enableMultipart: true,
        documentType: 'work-instruction',
        documentId: 'doc-1',
        userId: 'user-1',
      };

      const result = await fileUploadService.uploadFileEnhanced(largeFile, options);

      expect(mockMultipart.initializeUpload).toHaveBeenCalledWith({
        fileName: 'large-video.mp4',
        fileSize: 100 * 1024 * 1024,
        mimeType: 'video/mp4',
        userId: 'user-1',
        documentType: 'work-instruction',
        documentId: 'doc-1',
      });
      expect(result).toEqual({
        success: true,
        multipartUpload: mockMultipartInit,
        isMultipart: true,
      });
    });

    it('should fallback to local storage when cloud storage disabled', async () => {
      const mockAttachment = {
        id: 'attachment-1',
        filename: 'test-document.pdf',
        filepath: '/uploads/test-document.pdf',
        size: 1024,
        type: 'application/pdf',
        cloudFileId: null,
      };

      // Mock successful local file operations
      const fs = await import('fs/promises');
      (fs.mkdir as any).mockResolvedValue(undefined);
      (fs.writeFile as any).mockResolvedValue(undefined);
      (prisma.attachment.create as any).mockResolvedValue(mockAttachment);

      const options = {
        enableCloudStorage: false,
        documentType: 'work-instruction',
        documentId: 'doc-1',
        userId: 'user-1',
      };

      const result = await fileUploadService.uploadFileEnhanced(mockFile, options);

      expect(fs.writeFile).toHaveBeenCalled();
      expect(mockCloudStorage.uploadFile).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        attachment: mockAttachment,
        cloudFile: undefined,
      });
    });

    it('should handle upload errors gracefully', async () => {
      mockCloudStorage.uploadFile.mockRejectedValue(new Error('Cloud storage unavailable'));

      const options = {
        enableCloudStorage: true,
        documentType: 'work-instruction',
        documentId: 'doc-1',
        userId: 'user-1',
      };

      await expect(
        fileUploadService.uploadFileEnhanced(mockFile, options)
      ).rejects.toThrow('Failed to upload file');
    });
  });

  describe('uploadMultipleFilesEnhanced', () => {
    const mockFiles = [
      {
        originalname: 'doc1.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('pdf content 1'),
        size: 1024,
      },
      {
        originalname: 'doc2.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('pdf content 2'),
        size: 2048,
      },
    ];

    it('should upload multiple files with cloud storage', async () => {
      const mockStoredFiles = [
        {
          id: 'stored-1',
          fileName: 'doc1.pdf',
          size: 1024,
        },
        {
          id: 'stored-2',
          fileName: 'doc2.pdf',
          size: 2048,
        },
      ];

      const mockAttachments = [
        {
          id: 'attachment-1',
          filename: 'doc1.pdf',
          cloudFileId: 'stored-1',
        },
        {
          id: 'attachment-2',
          filename: 'doc2.pdf',
          cloudFileId: 'stored-2',
        },
      ];

      mockCloudStorage.uploadFile
        .mockResolvedValueOnce(mockStoredFiles[0])
        .mockResolvedValueOnce(mockStoredFiles[1]);

      (prisma.attachment.create as any)
        .mockResolvedValueOnce(mockAttachments[0])
        .mockResolvedValueOnce(mockAttachments[1]);

      const options = {
        enableCloudStorage: true,
        documentType: 'work-instruction',
        documentId: 'doc-1',
        userId: 'user-1',
      };

      const result = await fileUploadService.uploadMultipleFilesEnhanced(mockFiles, options);

      expect(mockCloudStorage.uploadFile).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        success: true,
        totalFiles: 2,
        successfulUploads: 2,
        failedUploads: 0,
        totalSize: 3072,
        uploads: [
          {
            filename: 'doc1.pdf',
            success: true,
            attachment: mockAttachments[0],
            cloudFile: mockStoredFiles[0],
          },
          {
            filename: 'doc2.pdf',
            success: true,
            attachment: mockAttachments[1],
            cloudFile: mockStoredFiles[1],
          },
        ],
        errors: [],
      });
    });

    it('should handle partial failures gracefully', async () => {
      const mockStoredFile = {
        id: 'stored-1',
        fileName: 'doc1.pdf',
        size: 1024,
      };

      const mockAttachment = {
        id: 'attachment-1',
        filename: 'doc1.pdf',
        cloudFileId: 'stored-1',
      };

      mockCloudStorage.uploadFile
        .mockResolvedValueOnce(mockStoredFile)
        .mockRejectedValueOnce(new Error('Upload failed for second file'));

      (prisma.attachment.create as any).mockResolvedValueOnce(mockAttachment);

      const options = {
        enableCloudStorage: true,
        documentType: 'work-instruction',
        documentId: 'doc-1',
        userId: 'user-1',
      };

      const result = await fileUploadService.uploadMultipleFilesEnhanced(mockFiles, options);

      expect(result).toEqual({
        success: false,
        totalFiles: 2,
        successfulUploads: 1,
        failedUploads: 1,
        totalSize: 1024, // Only successful upload size
        uploads: [
          {
            filename: 'doc1.pdf',
            success: true,
            attachment: mockAttachment,
            cloudFile: mockStoredFile,
          },
          {
            filename: 'doc2.pdf',
            success: false,
            error: 'Upload failed for second file',
          },
        ],
        errors: ['Upload failed for second file'],
      });
    });
  });

  describe('getFileInfoEnhanced', () => {
    it('should return enhanced file information with cloud storage details', async () => {
      const mockAttachment = {
        id: 'attachment-1',
        filename: 'document.pdf',
        size: 1024,
        type: 'application/pdf',
        cloudFileId: 'stored-file-1',
        uploadedAt: new Date('2023-01-01'),
        uploadedBy: 'user-1',
        uploadedByName: 'Test User',
        cloudFile: {
          id: 'stored-file-1',
          storageKey: 'files/document.pdf',
          provider: 'S3',
          bucket: 'test-bucket',
          region: 'us-east-1',
          storageClass: 'STANDARD',
          checksum: 'file-checksum',
          encrypted: true,
        },
      };

      (prisma.attachment.findUnique as any).mockResolvedValue(mockAttachment);

      const result = await fileUploadService.getFileInfoEnhanced('attachment-1');

      expect(prisma.attachment.findUnique).toHaveBeenCalledWith({
        where: { id: 'attachment-1' },
        include: { cloudFile: true },
      });
      expect(result).toEqual({
        id: 'attachment-1',
        filename: 'document.pdf',
        size: 1024,
        sizeFormatted: '1.00 KB',
        type: 'application/pdf',
        uploadedAt: mockAttachment.uploadedAt,
        uploadedBy: 'user-1',
        uploadedByName: 'Test User',
        isCloudFile: true,
        cloudStorage: {
          provider: 'S3',
          bucket: 'test-bucket',
          region: 'us-east-1',
          storageClass: 'STANDARD',
          storageKey: 'files/document.pdf',
          checksum: 'file-checksum',
          encrypted: true,
        },
      });
    });

    it('should handle local files without cloud storage', async () => {
      const mockAttachment = {
        id: 'attachment-1',
        filename: 'local-document.pdf',
        filepath: '/uploads/local-document.pdf',
        size: 2048,
        type: 'application/pdf',
        cloudFileId: null,
        cloudFile: null,
        uploadedAt: new Date('2023-01-01'),
      };

      (prisma.attachment.findUnique as any).mockResolvedValue(mockAttachment);

      const result = await fileUploadService.getFileInfoEnhanced('attachment-1');

      expect(result.isCloudFile).toBe(false);
      expect(result.cloudStorage).toBeUndefined();
      expect(result.localPath).toBe('/uploads/local-document.pdf');
    });
  });

  describe('deleteFileEnhanced', () => {
    it('should delete cloud file and attachment record', async () => {
      const mockAttachment = {
        id: 'attachment-1',
        filename: 'document.pdf',
        cloudFileId: 'stored-file-1',
        cloudFile: {
          id: 'stored-file-1',
          storageKey: 'files/document.pdf',
        },
      };

      (prisma.attachment.findUnique as any).mockResolvedValue(mockAttachment);
      mockCloudStorage.deleteFile.mockResolvedValue(undefined);
      (prisma.attachment.delete as any).mockResolvedValue(mockAttachment);

      const result = await fileUploadService.deleteFileEnhanced('attachment-1', {
        permanent: true,
        deleteFromCloud: true,
      });

      expect(mockCloudStorage.deleteFile).toHaveBeenCalledWith('stored-file-1', true);
      expect(prisma.attachment.delete).toHaveBeenCalledWith({
        where: { id: 'attachment-1' },
      });
      expect(result).toEqual({
        success: true,
        deletedAttachment: mockAttachment,
        deletedFromCloud: true,
        permanent: true,
      });
    });

    it('should handle soft delete', async () => {
      const mockAttachment = {
        id: 'attachment-1',
        filename: 'document.pdf',
        cloudFileId: 'stored-file-1',
      };

      const mockUpdatedAttachment = {
        ...mockAttachment,
        deletedAt: new Date(),
      };

      (prisma.attachment.findUnique as any).mockResolvedValue(mockAttachment);
      (prisma.attachment.update as any).mockResolvedValue(mockUpdatedAttachment);

      const result = await fileUploadService.deleteFileEnhanced('attachment-1', {
        permanent: false,
        deleteFromCloud: false,
      });

      expect(mockCloudStorage.deleteFile).not.toHaveBeenCalled();
      expect(prisma.attachment.update).toHaveBeenCalledWith({
        where: { id: 'attachment-1' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(result).toEqual({
        success: true,
        deletedAttachment: mockUpdatedAttachment,
        deletedFromCloud: false,
        permanent: false,
      });
    });
  });

  describe('getStorageStatistics', () => {
    it('should return comprehensive storage statistics', async () => {
      const mockLocalStats = {
        totalFiles: 50,
        totalSize: 1000000,
      };

      const mockCloudStats = {
        totalFiles: 150,
        totalSize: 5000000000,
        totalSizeFormatted: '4.66 GB',
        filesByProvider: { S3: 100, MINIO: 50 },
        filesByStorageClass: { STANDARD: 120, INFREQUENT_ACCESS: 30 },
      };

      (prisma.attachment.count as any)
        .mockResolvedValueOnce(50) // Local files
        .mockResolvedValueOnce(150); // Cloud files

      (prisma.attachment.aggregate as any)
        .mockResolvedValueOnce({ _sum: { size: 1000000 } }) // Local size
        .mockResolvedValueOnce({ _sum: { size: 5000000000 } }); // Cloud size

      mockCloudStorage.getStorageStatistics.mockResolvedValue(mockCloudStats);

      const result = await fileUploadService.getStorageStatistics();

      expect(result).toEqual({
        local: {
          totalFiles: 50,
          totalSize: 1000000,
          totalSizeFormatted: '976.56 KB',
        },
        cloud: mockCloudStats,
        total: {
          totalFiles: 200,
          totalSize: 5001000000,
          totalSizeFormatted: '4.66 GB',
          cloudStoragePercentage: 99.98,
        },
      });
    });
  });

  describe('error handling', () => {
    it('should handle cloud service initialization errors', async () => {
      const mockFile = {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('content'),
        size: 1024,
      };

      // Simulate cloud service initialization failure
      (fileUploadService as any).cloudStorageService = null;

      const options = {
        enableCloudStorage: true,
        documentType: 'work-instruction',
        documentId: 'doc-1',
        userId: 'user-1',
      };

      await expect(
        fileUploadService.uploadFileEnhanced(mockFile, options)
      ).rejects.toThrow('Cloud storage service not available');
    });

    it('should handle database connection errors', async () => {
      const mockFile = {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('content'),
        size: 1024,
      };

      mockCloudStorage.uploadFile.mockResolvedValue({ id: 'stored-1' });
      (prisma.attachment.create as any).mockRejectedValue(new Error('Database connection failed'));

      const options = {
        enableCloudStorage: true,
        documentType: 'work-instruction',
        documentId: 'doc-1',
        userId: 'user-1',
      };

      await expect(
        fileUploadService.uploadFileEnhanced(mockFile, options)
      ).rejects.toThrow('Failed to upload file');
    });
  });
});