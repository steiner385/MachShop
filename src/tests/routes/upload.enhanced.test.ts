import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import multer from 'multer';

// Mock the FileUploadService and other services
vi.mock('../../services/FileUploadService', () => ({
  FileUploadService: vi.fn().mockImplementation(() => ({
    uploadFileEnhanced: vi.fn(),
    uploadMultipleFilesEnhanced: vi.fn(),
    getFileInfoEnhanced: vi.fn(),
    deleteFileEnhanced: vi.fn(),
    getStorageStatistics: vi.fn(),
  })),
}));

vi.mock('../../services/MultipartUploadService', () => ({
  MultipartUploadService: vi.fn().mockImplementation(() => ({
    initializeUpload: vi.fn(),
    uploadPart: vi.fn(),
    completeUpload: vi.fn(),
    abortUpload: vi.fn(),
    getUploadProgress: vi.fn(),
    listActiveUploads: vi.fn(),
  })),
}));

vi.mock('../../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { id: 'user-1', name: 'Test User' };
    next();
  },
}));

vi.mock('../../middleware/upload', () => ({
  upload: {
    single: () => (req: any, res: any, next: any) => {
      req.file = {
        originalname: 'test-file.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('test content'),
        size: 1024,
      };
      next();
    },
    array: () => (req: any, res: any, next: any) => {
      req.files = [
        {
          originalname: 'file1.pdf',
          mimetype: 'application/pdf',
          buffer: Buffer.from('content 1'),
          size: 1024,
        },
        {
          originalname: 'file2.pdf',
          mimetype: 'application/pdf',
          buffer: Buffer.from('content 2'),
          size: 2048,
        },
      ];
      next();
    },
  },
}));

// Import the enhanced upload routes
import uploadRoutes from '../../routes/upload';

describe('Upload Routes - Enhanced Cloud Storage Features', () => {
  let app: express.Application;
  let mockFileUploadService: any;
  let mockMultipartService: any;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use('/api/upload', uploadRoutes);

    mockFileUploadService = {
      uploadFileEnhanced: vi.fn(),
      uploadMultipleFilesEnhanced: vi.fn(),
      getFileInfoEnhanced: vi.fn(),
      deleteFileEnhanced: vi.fn(),
      getStorageStatistics: vi.fn(),
    };

    mockMultipartService = {
      initializeUpload: vi.fn(),
      uploadPart: vi.fn(),
      completeUpload: vi.fn(),
      abortUpload: vi.fn(),
      getUploadProgress: vi.fn(),
      listActiveUploads: vi.fn(),
    };

    // Mock the service instances
    const { FileUploadService } = require('../../services/FileUploadService');
    const { MultipartUploadService } = require('../../services/MultipartUploadService');

    FileUploadService.mockImplementation(() => mockFileUploadService);
    MultipartUploadService.mockImplementation(() => mockMultipartService);

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /enhanced/single', () => {
    it('should upload single file with enhanced features', async () => {
      const mockResult = {
        success: true,
        attachment: {
          id: 'attachment-1',
          filename: 'test-file.pdf',
          size: 1024,
          cloudFileId: 'stored-file-1',
        },
        cloudFile: {
          id: 'stored-file-1',
          storageKey: 'files/test-file.pdf',
          provider: 'S3',
        },
        deduplication: {
          isDuplicate: false,
        },
      };

      mockFileUploadService.uploadFileEnhanced.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/upload/enhanced/single')
        .field('documentType', 'work-instruction')
        .field('documentId', 'doc-1')
        .field('attachmentType', 'REFERENCE')
        .field('enableCloudStorage', 'true')
        .field('enableDeduplication', 'true')
        .field('enableVersioning', 'false')
        .attach('file', Buffer.from('test content'), 'test-file.pdf');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'File uploaded successfully',
        data: mockResult,
      });

      expect(mockFileUploadService.uploadFileEnhanced).toHaveBeenCalledWith(
        expect.objectContaining({
          originalname: 'test-file.pdf',
          mimetype: 'application/pdf',
          size: 1024,
        }),
        expect.objectContaining({
          enableCloudStorage: true,
          enableDeduplication: true,
          enableVersioning: false,
          documentType: 'work-instruction',
          documentId: 'doc-1',
          attachmentType: 'REFERENCE',
          userId: 'user-1',
          userName: 'Test User',
        })
      );
    });

    it('should handle multipart upload initialization for large files', async () => {
      const mockMultipartResult = {
        success: true,
        multipartUpload: {
          id: 'upload-1',
          uploadId: 'aws-upload-id',
          fileName: 'large-file.mp4',
          totalParts: 20,
          chunkSize: 5242880,
        },
        isMultipart: true,
      };

      mockFileUploadService.uploadFileEnhanced.mockResolvedValue(mockMultipartResult);

      const response = await request(app)
        .post('/api/upload/enhanced/single')
        .field('documentType', 'work-instruction')
        .field('documentId', 'doc-1')
        .field('enableCloudStorage', 'true')
        .field('enableMultipart', 'true')
        .attach('file', Buffer.alloc(100 * 1024 * 1024), 'large-file.mp4');

      expect(response.status).toBe(200);
      expect(response.body.data.isMultipart).toBe(true);
      expect(response.body.data.multipartUpload).toEqual(mockMultipartResult.multipartUpload);
    });

    it('should handle upload errors', async () => {
      mockFileUploadService.uploadFileEnhanced.mockRejectedValue(
        new Error('Cloud storage unavailable')
      );

      const response = await request(app)
        .post('/api/upload/enhanced/single')
        .field('documentType', 'work-instruction')
        .field('documentId', 'doc-1')
        .attach('file', Buffer.from('test content'), 'test-file.pdf');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: 'Upload failed',
        error: 'Cloud storage unavailable',
      });
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/upload/enhanced/single')
        .attach('file', Buffer.from('test content'), 'test-file.pdf');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: 'Missing required fields: documentType, documentId',
      });
    });
  });

  describe('POST /enhanced/multiple', () => {
    it('should upload multiple files successfully', async () => {
      const mockResult = {
        success: true,
        totalFiles: 2,
        successfulUploads: 2,
        failedUploads: 0,
        totalSize: 3072,
        uploads: [
          {
            filename: 'file1.pdf',
            success: true,
            attachment: { id: 'attachment-1', cloudFileId: 'stored-1' },
            cloudFile: { id: 'stored-1', storageKey: 'files/file1.pdf' },
          },
          {
            filename: 'file2.pdf',
            success: true,
            attachment: { id: 'attachment-2', cloudFileId: 'stored-2' },
            cloudFile: { id: 'stored-2', storageKey: 'files/file2.pdf' },
          },
        ],
        errors: [],
      };

      mockFileUploadService.uploadMultipleFilesEnhanced.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/upload/enhanced/multiple')
        .field('documentType', 'work-instruction')
        .field('documentId', 'doc-1')
        .field('enableCloudStorage', 'true')
        .attach('files', Buffer.from('content 1'), 'file1.pdf')
        .attach('files', Buffer.from('content 2'), 'file2.pdf');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Files uploaded successfully',
        data: mockResult,
      });
    });

    it('should handle partial upload failures', async () => {
      const mockResult = {
        success: false,
        totalFiles: 2,
        successfulUploads: 1,
        failedUploads: 1,
        uploads: [
          {
            filename: 'file1.pdf',
            success: true,
            attachment: { id: 'attachment-1' },
          },
          {
            filename: 'file2.pdf',
            success: false,
            error: 'File too large',
          },
        ],
        errors: ['File too large'],
      };

      mockFileUploadService.uploadMultipleFilesEnhanced.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/upload/enhanced/multiple')
        .field('documentType', 'work-instruction')
        .field('documentId', 'doc-1')
        .attach('files', Buffer.from('content 1'), 'file1.pdf')
        .attach('files', Buffer.alloc(10 * 1024 * 1024), 'file2.pdf');

      expect(response.status).toBe(207); // Multi-status
      expect(response.body.data.successfulUploads).toBe(1);
      expect(response.body.data.failedUploads).toBe(1);
    });
  });

  describe('POST /multipart/initialize', () => {
    it('should initialize multipart upload', async () => {
      const mockUpload = {
        id: 'upload-1',
        uploadId: 'aws-upload-id-123',
        fileName: 'large-video.mp4',
        totalSize: 500000000,
        totalParts: 95,
        chunkSize: 5242880,
        status: 'INITIALIZED',
      };

      mockMultipartService.initializeUpload.mockResolvedValue(mockUpload);

      const response = await request(app)
        .post('/api/upload/multipart/initialize')
        .send({
          fileName: 'large-video.mp4',
          fileSize: 500000000,
          mimeType: 'video/mp4',
          documentType: 'work-instruction',
          documentId: 'doc-1',
          metadata: { description: 'Training video' },
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Multipart upload initialized',
        data: mockUpload,
      });

      expect(mockMultipartService.initializeUpload).toHaveBeenCalledWith({
        fileName: 'large-video.mp4',
        fileSize: 500000000,
        mimeType: 'video/mp4',
        documentType: 'work-instruction',
        documentId: 'doc-1',
        userId: 'user-1',
        metadata: { description: 'Training video' },
      });
    });

    it('should validate file size requirements', async () => {
      const response = await request(app)
        .post('/api/upload/multipart/initialize')
        .send({
          fileName: 'small-file.txt',
          fileSize: 1024, // Too small for multipart
          mimeType: 'text/plain',
          documentType: 'work-instruction',
          documentId: 'doc-1',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('File size must be at least');
    });
  });

  describe('POST /multipart/:uploadId/part/:partNumber', () => {
    it('should upload part successfully', async () => {
      const mockResult = {
        partNumber: 1,
        etag: '"part-etag-123"',
        size: 5242880,
        completed: true,
      };

      mockMultipartService.uploadPart.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/upload/multipart/upload-1/part/1')
        .send({
          data: Buffer.alloc(5242880).toString('base64'),
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Part uploaded successfully',
        data: mockResult,
      });

      expect(mockMultipartService.uploadPart).toHaveBeenCalledWith(
        'upload-1',
        1,
        expect.any(Buffer)
      );
    });

    it('should handle invalid part number', async () => {
      const response = await request(app)
        .post('/api/upload/multipart/upload-1/part/0')
        .send({
          data: Buffer.alloc(5242880).toString('base64'),
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid part number');
    });

    it('should handle missing data', async () => {
      const response = await request(app)
        .post('/api/upload/multipart/upload-1/part/1')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Missing part data');
    });
  });

  describe('POST /multipart/:uploadId/complete', () => {
    it('should complete multipart upload successfully', async () => {
      const mockResult = {
        success: true,
        storedFile: {
          id: 'stored-file-1',
          fileName: 'large-video.mp4',
          size: 500000000,
          storageKey: 'files/large-video.mp4',
        },
        uploadRecord: {
          id: 'upload-1',
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      };

      mockMultipartService.completeUpload.mockResolvedValue(mockResult);

      const response = await request(app).post('/api/upload/multipart/upload-1/complete');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Multipart upload completed successfully',
        data: mockResult,
      });

      expect(mockMultipartService.completeUpload).toHaveBeenCalledWith('upload-1');
    });

    it('should handle incomplete upload', async () => {
      mockMultipartService.completeUpload.mockRejectedValue(
        new Error('Upload is incomplete. 8 of 10 parts uploaded.')
      );

      const response = await request(app).post('/api/upload/multipart/upload-1/complete');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Failed to complete upload');
      expect(response.body.error).toBe('Upload is incomplete. 8 of 10 parts uploaded.');
    });
  });

  describe('DELETE /multipart/:uploadId/abort', () => {
    it('should abort multipart upload successfully', async () => {
      const mockResult = {
        success: true,
        uploadId: 'upload-1',
        abortedAt: new Date(),
      };

      mockMultipartService.abortUpload.mockResolvedValue(mockResult);

      const response = await request(app).delete('/api/upload/multipart/upload-1/abort');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Multipart upload aborted successfully',
        data: mockResult,
      });

      expect(mockMultipartService.abortUpload).toHaveBeenCalledWith('upload-1');
    });
  });

  describe('GET /multipart/:uploadId/progress', () => {
    it('should return upload progress', async () => {
      const mockProgress = {
        uploadId: 'upload-1',
        fileName: 'large-video.mp4',
        totalSize: 500000000,
        uploadedSize: 250000000,
        totalParts: 95,
        completedParts: 47,
        progress: 50.0,
        status: 'IN_PROGRESS',
        estimatedTimeRemaining: 300000, // 5 minutes
        uploadSpeed: 1048576, // 1 MB/s
      };

      mockMultipartService.getUploadProgress.mockResolvedValue(mockProgress);

      const response = await request(app).get('/api/upload/multipart/upload-1/progress');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockProgress,
      });

      expect(mockMultipartService.getUploadProgress).toHaveBeenCalledWith('upload-1');
    });
  });

  describe('GET /multipart/active', () => {
    it('should return active uploads for user', async () => {
      const mockActiveUploads = [
        {
          id: 'upload-1',
          fileName: 'video1.mp4',
          totalSize: 500000000,
          completedParts: 47,
          totalParts: 95,
          status: 'IN_PROGRESS',
          initiatedAt: new Date(),
        },
        {
          id: 'upload-2',
          fileName: 'video2.mp4',
          totalSize: 300000000,
          completedParts: 10,
          totalParts: 57,
          status: 'IN_PROGRESS',
          initiatedAt: new Date(),
        },
      ];

      mockMultipartService.listActiveUploads.mockResolvedValue(mockActiveUploads);

      const response = await request(app).get('/api/upload/multipart/active');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: {
          activeUploads: mockActiveUploads,
          count: 2,
        },
      });

      expect(mockMultipartService.listActiveUploads).toHaveBeenCalledWith('user-1');
    });
  });

  describe('GET /file/:id/info', () => {
    it('should return enhanced file information', async () => {
      const mockFileInfo = {
        id: 'attachment-1',
        filename: 'document.pdf',
        size: 1024,
        sizeFormatted: '1.00 KB',
        type: 'application/pdf',
        uploadedAt: new Date(),
        uploadedBy: 'user-1',
        uploadedByName: 'Test User',
        isCloudFile: true,
        cloudStorage: {
          provider: 'S3',
          bucket: 'test-bucket',
          region: 'us-east-1',
          storageClass: 'STANDARD',
          encrypted: true,
        },
      };

      mockFileUploadService.getFileInfoEnhanced.mockResolvedValue(mockFileInfo);

      const response = await request(app).get('/api/upload/file/attachment-1/info');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockFileInfo,
      });

      expect(mockFileUploadService.getFileInfoEnhanced).toHaveBeenCalledWith('attachment-1');
    });

    it('should handle file not found', async () => {
      mockFileUploadService.getFileInfoEnhanced.mockRejectedValue(new Error('File not found'));

      const response = await request(app).get('/api/upload/file/non-existent/info');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        message: 'File not found',
      });
    });
  });

  describe('DELETE /file/:id/enhanced', () => {
    it('should delete file with enhanced options', async () => {
      const mockResult = {
        success: true,
        deletedAttachment: {
          id: 'attachment-1',
          filename: 'document.pdf',
        },
        deletedFromCloud: true,
        permanent: true,
      };

      mockFileUploadService.deleteFileEnhanced.mockResolvedValue(mockResult);

      const response = await request(app)
        .delete('/api/upload/file/attachment-1/enhanced')
        .send({
          permanent: true,
          deleteFromCloud: true,
          reason: 'No longer needed',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'File deleted successfully',
        data: mockResult,
      });

      expect(mockFileUploadService.deleteFileEnhanced).toHaveBeenCalledWith('attachment-1', {
        permanent: true,
        deleteFromCloud: true,
        reason: 'No longer needed',
        userId: 'user-1',
      });
    });

    it('should handle soft delete by default', async () => {
      const mockResult = {
        success: true,
        deletedAttachment: {
          id: 'attachment-1',
          filename: 'document.pdf',
          deletedAt: new Date(),
        },
        deletedFromCloud: false,
        permanent: false,
      };

      mockFileUploadService.deleteFileEnhanced.mockResolvedValue(mockResult);

      const response = await request(app).delete('/api/upload/file/attachment-1/enhanced');

      expect(response.status).toBe(200);
      expect(mockFileUploadService.deleteFileEnhanced).toHaveBeenCalledWith('attachment-1', {
        permanent: false,
        deleteFromCloud: false,
        userId: 'user-1',
      });
    });
  });

  describe('GET /statistics', () => {
    it('should return comprehensive storage statistics', async () => {
      const mockStats = {
        local: {
          totalFiles: 50,
          totalSize: 1000000,
          totalSizeFormatted: '976.56 KB',
        },
        cloud: {
          totalFiles: 150,
          totalSize: 5000000000,
          totalSizeFormatted: '4.66 GB',
          filesByProvider: { S3: 100, MINIO: 50 },
          filesByStorageClass: { STANDARD: 120, INFREQUENT_ACCESS: 30 },
        },
        total: {
          totalFiles: 200,
          totalSize: 5001000000,
          totalSizeFormatted: '4.66 GB',
          cloudStoragePercentage: 99.98,
        },
      };

      mockFileUploadService.getStorageStatistics.mockResolvedValue(mockStats);

      const response = await request(app).get('/api/upload/statistics');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockStats,
      });

      expect(mockFileUploadService.getStorageStatistics).toHaveBeenCalled();
    });
  });

  describe('Error handling and validation', () => {
    it('should handle unauthorized requests', async () => {
      // Mock authentication failure
      vi.mock('../../middleware/auth', () => ({
        authenticateToken: (req: any, res: any, next: any) => {
          res.status(401).json({ success: false, message: 'Unauthorized' });
        },
      }));

      const response = await request(app)
        .post('/api/upload/enhanced/single')
        .attach('file', Buffer.from('test'), 'test.pdf');

      expect(response.status).toBe(401);
    });

    it('should handle malformed requests', async () => {
      const response = await request(app)
        .post('/api/upload/multipart/initialize')
        .send({
          fileName: '', // Empty filename
          fileSize: 'invalid', // Invalid size
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle service unavailable errors', async () => {
      mockFileUploadService.uploadFileEnhanced.mockRejectedValue(
        new Error('Service temporarily unavailable')
      );

      const response = await request(app)
        .post('/api/upload/enhanced/single')
        .field('documentType', 'work-instruction')
        .field('documentId', 'doc-1')
        .attach('file', Buffer.from('test'), 'test.pdf');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: 'Upload failed',
        error: 'Service temporarily unavailable',
      });
    });
  });
});