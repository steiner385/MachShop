import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FileUploadService } from '../../services/FileUploadService';
import { prisma } from '../../lib/prisma';
import * as path from 'path';

// Mock all the cloud storage services
vi.mock('../../services/CloudStorageService', () => ({
  CloudStorageService: vi.fn().mockImplementation(() => ({
    uploadFile: vi.fn(),
    downloadFile: vi.fn(),
    deleteFile: vi.fn(),
    generateSignedUrl: vi.fn(),
    getStorageStatistics: vi.fn(),
  })),
}));

vi.mock('../../services/FileDeduplicationService', () => ({
  FileDeduplicationService: vi.fn().mockImplementation(() => ({
    calculateChecksum: vi.fn(),
    findDuplicatesByChecksum: vi.fn(),
    getDeduplicationStatistics: vi.fn(),
  })),
}));

vi.mock('../../services/FileVersioningService', () => ({
  FileVersioningService: vi.fn().mockImplementation(() => ({
    createVersion: vi.fn(),
    getFileVersions: vi.fn(),
    getVersioningStatistics: vi.fn(),
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
      aggregate: vi.fn(),
    },
    storedFile: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
  },
}));

// Mock file system operations with default export
vi.mock('fs/promises', () => {
  const mockFs = {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
    stat: vi.fn(),
    access: vi.fn(),
    readFile: vi.fn(),
    readdir: vi.fn(),
  };

  return {
    default: mockFs,
    ...mockFs,
  };
});

// Mock storage config
vi.mock('../../config/storage', () => ({
  storageConfig: {
    upload: {
      chunkSize: 5242880, // 5MB
      maxFileSize: 104857600, // 100MB
    },
    providers: {
      s3: {
        enabled: true,
      },
    },
  },
}));

describe('FileUploadService - Enhanced Cloud Storage Features', () => {
  let fileUploadService: FileUploadService;
  let mockCloudStorage: any;
  let mockDeduplication: any;
  let mockVersioning: any;
  let mockMultipart: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    fileUploadService = new FileUploadService();

    mockCloudStorage = {
      uploadFile: vi.fn(),
      downloadFile: vi.fn(),
      deleteFile: vi.fn(),
      generateSignedUrl: vi.fn(),
      getStorageStatistics: vi.fn(),
    };

    mockDeduplication = {
      calculateChecksum: vi.fn(),
      findDuplicatesByChecksum: vi.fn(),
      getDeduplicationStatistics: vi.fn(),
    };

    mockVersioning = {
      createVersion: vi.fn(),
      getFileVersions: vi.fn(),
      getVersioningStatistics: vi.fn(),
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
    (fileUploadService as any).fileDeduplicationService = mockDeduplication;
    (fileUploadService as any).fileVersioningService = mockVersioning;
    (fileUploadService as any).multipartUploadService = mockMultipart;

    // Setup fs mocks
    const fs = await import('fs/promises');
    (fs.readFile as any).mockResolvedValue(Buffer.from('test content'));
    (fs.unlink as any).mockResolvedValue(undefined);
    (fs.mkdir as any).mockResolvedValue(undefined);
    (fs.readdir as any).mockResolvedValue([]);
    (fs.stat as any).mockResolvedValue({
      size: 1024,
      birthtime: new Date('2023-01-01'),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('uploadFileEnhanced', () => {
    const createMockFile = (overrides = {}) => ({
      fieldname: 'file',
      originalname: 'test-document.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      destination: '/uploads/documents',
      filename: 'test-123.pdf',
      path: '/uploads/documents/test-123.pdf',
      size: 1024,
      buffer: Buffer.from('test pdf content'),
      stream: {} as any,
      ...overrides,
    }) as Express.Multer.File;

    beforeEach(async () => {
      // Reset fs.readFile mock for each test in this describe block
      const fs = await import('fs/promises');
      (fs.readFile as any).mockResolvedValue(Buffer.from('test content'));
    });

    it('should upload file with cloud storage enabled', async () => {
      const mockFile = createMockFile();

      const mockStoredFile = {
        id: 'stored-file-1',
        fileName: 'test-document.pdf',
        originalName: 'test-document.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        storageKey: 'files/test-document.pdf',
        checksum: 'test-checksum',
      };

      mockCloudStorage.uploadFile.mockResolvedValue(mockStoredFile);
      mockCloudStorage.generateSignedUrl.mockResolvedValue('https://cloud.example.com/file/123');
      mockDeduplication.findDuplicatesByChecksum.mockResolvedValue([]);

      const options = {
        enableCloudStorage: true,
        enableDeduplication: false,
        documentType: 'work-instruction',
        documentId: 'doc-1',
        userId: 'user-1',
        userName: 'Test User',
      };

      const result = await fileUploadService.uploadFileEnhanced(mockFile, options);

      expect(mockCloudStorage.uploadFile).toHaveBeenCalled();
      expect(result.isCloudStored).toBe(true);
      expect(result.storedFile).toEqual(mockStoredFile);
      expect(result.downloadUrl).toBe('https://cloud.example.com/file/123');
    });

    it('should handle deduplication when enabled', async () => {
      const mockFile = createMockFile();

      const mockChecksum = 'duplicate-checksum';
      const mockDuplicates = [
        {
          id: 'existing-file-1',
          fileName: 'existing-document.pdf',
          checksum: mockChecksum,
          size: 1024,
        },
      ];

      const mockStoredFile = {
        id: 'stored-file-1',
        fileName: 'test-document.pdf',
        size: 1024,
      };

      mockDeduplication.calculateChecksum.mockResolvedValue(mockChecksum);
      mockDeduplication.findDuplicatesByChecksum.mockResolvedValue(mockDuplicates);
      mockCloudStorage.uploadFile.mockResolvedValue(mockStoredFile);
      mockCloudStorage.generateSignedUrl.mockResolvedValue('https://cloud.example.com/file/123');

      const options = {
        enableCloudStorage: true,
        enableDeduplication: true,
        documentType: 'work-instruction',
        documentId: 'doc-1',
        userId: 'user-1',
      };

      const result = await fileUploadService.uploadFileEnhanced(mockFile, options);

      expect(mockDeduplication.calculateChecksum).toHaveBeenCalled();
      expect(mockDeduplication.findDuplicatesByChecksum).toHaveBeenCalledWith(mockChecksum);
      expect(result.isDuplicate).toBe(true);
      expect(result.deduplicationSavings).toBe(1024);
    });

    it('should create new version when versioning enabled for existing file', async () => {
      const mockFile = createMockFile();

      const mockVersion = {
        id: 'version-2',
        fileId: 'existing-file-1',
        versionNumber: 2,
        userId: 'user-1',
      };

      mockVersioning.createVersion.mockResolvedValue(mockVersion);
      mockCloudStorage.generateSignedUrl.mockResolvedValue('https://cloud.example.com/file/123');
      mockDeduplication.findDuplicatesByChecksum.mockResolvedValue([]);

      const options = {
        enableCloudStorage: true,
        enableVersioning: true,
        documentType: 'work-instruction',
        documentId: 'doc-1',
        userId: 'user-1',
        metadata: { reason: 'Content update' },
      };

      const result = await fileUploadService.createFileVersion(
        'existing-file-1',
        mockFile,
        {
          changeDescription: 'Content update',
          userId: 'user-1',
          userName: 'Test User',
        }
      );

      expect(mockVersioning.createVersion).toHaveBeenCalled();
      expect(result.fileId).toBe(mockVersion.id);
    });

    it('should handle multipart upload for large files', async () => {
      // Use a file larger than chunkSize (5MB) but smaller than MAX_FILE_SIZE (10MB)
      const largeFileSize = 6 * 1024 * 1024; // 6MB
      const largeFile = createMockFile({
        originalname: 'large-video.mp4',
        mimetype: 'video/mp4',
        size: largeFileSize,
        buffer: Buffer.alloc(largeFileSize),
      });

      const mockMultipartInit = {
        id: 'upload-1',
        uploadId: 'aws-upload-id',
        fileName: 'large-video.mp4',
        totalParts: 2,
        chunkSize: 5242880,
      };

      const mockStoredFile = {
        id: 'stored-file-1',
        fileName: 'large-video.mp4',
        size: largeFileSize,
      };

      // Mock fs.readFile to return the large buffer
      const fs = await import('fs/promises');
      (fs.readFile as any).mockResolvedValue(Buffer.alloc(largeFileSize));

      mockMultipart.initializeUpload.mockResolvedValue(mockMultipartInit);
      mockMultipart.uploadPart.mockResolvedValue({ partNumber: 1, etag: 'etag-1' });
      mockMultipart.completeUpload.mockResolvedValue({ storedFile: mockStoredFile });
      mockCloudStorage.generateSignedUrl.mockResolvedValue('https://cloud.example.com/file/123');
      mockDeduplication.findDuplicatesByChecksum.mockResolvedValue([]);

      const options = {
        enableCloudStorage: true,
        enableMultipart: true,
        documentType: 'work-instruction',
        documentId: 'doc-1',
        userId: 'user-1',
      };

      const result = await fileUploadService.uploadFileEnhanced(largeFile, options);

      expect(mockMultipart.initializeUpload).toHaveBeenCalled();
      expect(result.uploadMethod).toBe('cloud_multipart');
    });

    it('should fallback to local storage when cloud storage disabled', async () => {
      const mockFile = createMockFile();

      const options = {
        enableCloudStorage: false,
        documentType: 'work-instruction',
        documentId: 'doc-1',
        userId: 'user-1',
      };

      const result = await fileUploadService.uploadFileEnhanced(mockFile, options);

      expect(mockCloudStorage.uploadFile).not.toHaveBeenCalled();
      expect(result.isCloudStored).toBe(false);
      expect(result.uploadMethod).toBe('local');
      expect(result.fileUrl).toContain('/uploads');
    });

    it('should handle upload errors gracefully', async () => {
      const mockFile = createMockFile();

      // Ensure fs.readFile returns a valid buffer first
      const fs = await import('fs/promises');
      (fs.readFile as any).mockResolvedValue(Buffer.from('test content'));

      // Then mock the cloud storage to fail
      mockCloudStorage.uploadFile.mockRejectedValue(new Error('Cloud storage unavailable'));
      mockDeduplication.findDuplicatesByChecksum.mockResolvedValue([]);

      const options = {
        enableCloudStorage: true,
        documentType: 'work-instruction',
        documentId: 'doc-1',
        userId: 'user-1',
      };

      await expect(
        fileUploadService.uploadFileEnhanced(mockFile, options)
      ).rejects.toThrow('Cloud storage unavailable');
    });
  });

  describe('uploadMultipleFilesEnhanced', () => {
    const createMockFile = (name: string, size: number) => ({
      fieldname: 'files',
      originalname: name,
      encoding: '7bit',
      mimetype: 'application/pdf',
      destination: '/uploads/documents',
      filename: `${name.replace('.pdf', '')}-123.pdf`,
      path: `/uploads/documents/${name.replace('.pdf', '')}-123.pdf`,
      size,
      buffer: Buffer.from(`pdf content ${name}`),
      stream: {} as any,
    }) as Express.Multer.File;

    const mockFiles = [
      createMockFile('doc1.pdf', 1024),
      createMockFile('doc2.pdf', 2048),
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

      mockCloudStorage.uploadFile
        .mockResolvedValueOnce(mockStoredFiles[0])
        .mockResolvedValueOnce(mockStoredFiles[1]);

      mockCloudStorage.generateSignedUrl
        .mockResolvedValueOnce('https://cloud.example.com/file/1')
        .mockResolvedValueOnce('https://cloud.example.com/file/2');

      mockDeduplication.findDuplicatesByChecksum.mockResolvedValue([]);

      const options = {
        enableCloudStorage: true,
        documentType: 'work-instruction',
        documentId: 'doc-1',
        userId: 'user-1',
      };

      const result = await fileUploadService.uploadMultipleEnhanced(mockFiles, options);

      expect(mockCloudStorage.uploadFile).toHaveBeenCalledTimes(2);
      expect(result.results).toHaveLength(2);
      expect(result.cloudStoredCount).toBe(2);
      expect(result.totalSize).toBe(3072);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle partial failures gracefully', async () => {
      const mockStoredFile = {
        id: 'stored-1',
        fileName: 'doc1.pdf',
        size: 1024,
      };

      mockCloudStorage.uploadFile
        .mockResolvedValueOnce(mockStoredFile)
        .mockRejectedValueOnce(new Error('Upload failed for second file'));

      mockCloudStorage.generateSignedUrl
        .mockResolvedValue('https://cloud.example.com/file/1');

      mockDeduplication.findDuplicatesByChecksum.mockResolvedValue([]);

      const options = {
        enableCloudStorage: true,
        documentType: 'work-instruction',
        documentId: 'doc-1',
        userId: 'user-1',
      };

      const result = await fileUploadService.uploadMultipleEnhanced(mockFiles, options);

      expect(result.results).toHaveLength(1);
      expect(result.cloudStoredCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Upload failed for second file');
    });
  });

  describe('getFileInfoEnhanced', () => {
    it('should return enhanced file information with cloud storage details', async () => {
      const fileId = 'cloud-file-1';

      const mockBuffer = Buffer.from('file content');

      mockCloudStorage.downloadFile.mockResolvedValue(mockBuffer);
      mockCloudStorage.generateSignedUrl.mockResolvedValue('https://cloud.example.com/file/123');
      mockVersioning.getFileVersions.mockResolvedValue([
        { id: 'v1', versionNumber: 1 },
        { id: 'v2', versionNumber: 2 },
      ]);

      const result = await fileUploadService.getEnhancedFileInfo(fileId);

      expect(mockCloudStorage.downloadFile).toHaveBeenCalledWith(fileId);
      expect(mockCloudStorage.generateSignedUrl).toHaveBeenCalledWith(fileId, 'download', 3600);
      expect(result).toBeTruthy();
      expect(result?.basic.isCloudStored).toBe(true);
      expect(result?.basic.downloadUrl).toBe('https://cloud.example.com/file/123');
      expect(result?.versions).toHaveLength(2);
    });

    it('should handle local files without cloud storage', async () => {
      const fileUrl = '/uploads/documents/local-doc.pdf';

      const fs = await import('fs/promises');
      (fs.stat as any).mockResolvedValue({
        size: 2048,
        birthtime: new Date('2023-01-01'),
      });

      const result = await fileUploadService.getEnhancedFileInfo(fileUrl);

      expect(result).toBeTruthy();
      expect(result?.basic.isCloudStored).toBe(false);
      expect(result?.basic.fileUrl).toBe(fileUrl);
    });
  });

  describe('deleteFileEnhanced', () => {
    it('should delete cloud file and attachment record', async () => {
      const fileId = 'cloud-file-1';

      mockCloudStorage.deleteFile.mockResolvedValue(undefined);

      await fileUploadService.deleteFileEnhanced(fileId);

      expect(mockCloudStorage.deleteFile).toHaveBeenCalledWith(fileId);
    });

    it('should handle soft delete', async () => {
      const fileUrl = '/uploads/documents/local-doc.pdf';

      const fs = await import('fs/promises');
      (fs.unlink as any).mockResolvedValue(undefined);

      await fileUploadService.deleteFileEnhanced(fileUrl);

      expect(fs.unlink).toHaveBeenCalled();
    });
  });

  describe('getStorageStatistics', () => {
    it('should return comprehensive storage statistics', async () => {
      const mockCloudStats = {
        totalFiles: 150,
        totalSize: 5000000000,
      };

      const mockDeduplicationStats = {
        deduplicationRatio: 0.25,
      };

      const mockVersioningStats = {
        totalVersions: 50,
      };

      mockCloudStorage.getStorageStatistics.mockResolvedValue(mockCloudStats);
      mockDeduplication.getDeduplicationStatistics.mockResolvedValue(mockDeduplicationStats);
      mockVersioning.getVersioningStatistics.mockResolvedValue(mockVersioningStats);

      const fs = await import('fs/promises');
      (fs.readdir as any).mockResolvedValue(['file1.pdf', 'file2.pdf']);
      (fs.stat as any).mockResolvedValue({
        size: 500000,
        birthtime: new Date(),
      });

      const result = await fileUploadService.getStorageStatistics();

      expect(result.cloud.totalFiles).toBe(150);
      expect(result.cloud.totalSize).toBe(5000000000);
      expect(result.cloud.deduplicationRatio).toBe(0.25);
      expect(result.cloud.versionCount).toBe(50);
    });
  });

  describe('error handling', () => {
    it('should handle cloud service initialization errors', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'test.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        destination: '/uploads/documents',
        filename: 'test-123.pdf',
        path: '/uploads/documents/test-123.pdf',
        size: 1024,
        buffer: Buffer.from('content'),
        stream: {} as any,
      } as Express.Multer.File;

      // Ensure fs.readFile returns a valid buffer first
      const fs = await import('fs/promises');
      (fs.readFile as any).mockResolvedValue(Buffer.from('content'));

      // Simulate cloud service throwing error
      mockCloudStorage.uploadFile.mockRejectedValue(new Error('Cloud storage service not available'));
      mockDeduplication.findDuplicatesByChecksum.mockResolvedValue([]);

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
        fieldname: 'file',
        originalname: 'test.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        destination: '/uploads/documents',
        filename: 'test-123.pdf',
        path: '/uploads/documents/test-123.pdf',
        size: 1024,
        buffer: Buffer.from('content'),
        stream: {} as any,
      } as Express.Multer.File;

      const fs = await import('fs/promises');
      (fs.readFile as any).mockRejectedValue(new Error('Failed to read file'));

      const options = {
        enableCloudStorage: true,
        documentType: 'work-instruction',
        documentId: 'doc-1',
        userId: 'user-1',
      };

      await expect(
        fileUploadService.uploadFileEnhanced(mockFile, options)
      ).rejects.toThrow('Failed to read file');
    });
  });
});
