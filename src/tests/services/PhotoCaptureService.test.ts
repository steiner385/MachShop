import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { PhotoCaptureService } from '../../services/PhotoCaptureService';
import { prisma } from '../../lib/prisma';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

// Mock dependencies
vi.mock('../../lib/prisma', () => ({
  prisma: {
    buildRecordPhoto: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    buildRecord: {
      findUnique: vi.fn(),
    },
    buildRecordOperation: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('sharp', () => {
  const mockSharp = {
    resize: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    png: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('processed image')),
    toFile: vi.fn().mockResolvedValue({}),
    metadata: vi.fn().mockResolvedValue({
      width: 1920,
      height: 1080,
      format: 'jpeg',
      size: 1024000,
    }),
    composite: vi.fn().mockReturnThis(),
    clone: vi.fn().mockReturnThis(),
  };

  return {
    default: vi.fn(() => mockSharp),
  };
});

vi.mock('fs/promises', () => ({
  default: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    readFile: vi.fn(),
    unlink: vi.fn(),
    access: vi.fn(),
    stat: vi.fn(),
  },
}));

vi.mock('path', () => ({
  default: {
    join: vi.fn(),
    dirname: vi.fn(),
    basename: vi.fn(),
    extname: vi.fn(),
  },
}));

describe('PhotoCaptureService', () => {
  let photoCaptureService: PhotoCaptureService;
  const mockPrisma = prisma as any;
  const mockFs = fs as any;
  const mockPath = path as any;
  const mockSharp = sharp as any;

  beforeEach(() => {
    photoCaptureService = new PhotoCaptureService();
    vi.clearAllMocks();

    // Setup default path mock behavior
    mockPath.join.mockImplementation((...args: string[]) => args.join('/'));
    mockPath.dirname.mockImplementation((p: string) => p.split('/').slice(0, -1).join('/'));
    mockPath.basename.mockImplementation((p: string) => p.split('/').pop());
    mockPath.extname.mockImplementation((p: string) => {
      const name = p.split('/').pop() || '';
      const lastDot = name.lastIndexOf('.');
      return lastDot > 0 ? name.substring(lastDot) : '';
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const mockBuildRecord = {
    id: 'br-1',
    buildRecordNumber: 'BR-2024-001',
    status: 'IN_PROGRESS',
  };

  const mockOperation = {
    id: 'bro-1',
    buildRecordId: 'br-1',
    operationId: 'op-1',
    operation: {
      operationNumber: '010',
      description: 'Assembly Operation',
    },
  };

  const mockUser = {
    id: 'user-1',
    name: 'John Operator',
    email: 'john@example.com',
  };

  describe('capturePhoto', () => {
    const captureData = {
      buildRecordId: 'br-1',
      operationId: 'bro-1',
      photoData: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAAA...',
      caption: 'Assembly progress photo',
      category: 'PROGRESS',
      tags: ['assembly', 'progress'],
      takenBy: 'user-1',
    };

    beforeEach(() => {
      mockPrisma.buildRecord.findUnique.mockResolvedValue(mockBuildRecord);
      mockPrisma.buildRecordOperation.findUnique.mockResolvedValue(mockOperation);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
    });

    it('should capture photo successfully', async () => {
      const mockPhoto = {
        id: 'photo-1',
        filename: 'photo_20240101_120000.jpg',
        originalName: 'Assembly progress photo.jpg',
        filePath: '/uploads/photos/br-1/photo_20240101_120000.jpg',
        thumbnailPath: '/uploads/photos/br-1/thumb_photo_20240101_120000.jpg',
        buildRecordId: 'br-1',
        operationId: 'bro-1',
        caption: 'Assembly progress photo',
        category: 'PROGRESS',
        tags: ['assembly', 'progress'],
        takenAt: new Date(),
        takenBy: 'user-1',
        metadata: {
          width: 1920,
          height: 1080,
          format: 'jpeg',
          size: 1024000,
        },
      };

      mockPrisma.buildRecordPhoto.create.mockResolvedValue(mockPhoto);

      const result = await photoCaptureService.capturePhoto(captureData);

      expect(mockPrisma.buildRecord.findUnique).toHaveBeenCalledWith({
        where: { id: 'br-1' },
      });

      expect(mockPrisma.buildRecordOperation.findUnique).toHaveBeenCalledWith({
        where: { id: 'bro-1' },
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });

      expect(mockFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('/uploads/photos/br-1'),
        { recursive: true }
      );

      expect(mockFs.writeFile).toHaveBeenCalledTimes(2); // Original and thumbnail

      expect(mockPrisma.buildRecordPhoto.create).toHaveBeenCalledWith({
        data: {
          filename: expect.stringMatching(/^photo_\d{8}_\d{6}\.jpg$/),
          originalName: expect.any(String),
          filePath: expect.stringContaining('/uploads/photos/br-1/'),
          thumbnailPath: expect.stringContaining('/uploads/photos/br-1/thumb_'),
          buildRecordId: 'br-1',
          operationId: 'bro-1',
          caption: 'Assembly progress photo',
          category: 'PROGRESS',
          tags: ['assembly', 'progress'],
          takenAt: expect.any(Date),
          takenBy: 'user-1',
          metadata: expect.any(Object),
        },
      });

      expect(result).toEqual(mockPhoto);
    });

    it('should handle photo without operation', async () => {
      const captureDataWithoutOp = {
        ...captureData,
        operationId: undefined,
      };

      const mockPhoto = {
        id: 'photo-1',
        buildRecordId: 'br-1',
        operationId: null,
      };

      mockPrisma.buildRecordPhoto.create.mockResolvedValue(mockPhoto);

      await photoCaptureService.capturePhoto(captureDataWithoutOp);

      expect(mockPrisma.buildRecordOperation.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.buildRecordPhoto.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          operationId: null,
        }),
      });
    });

    it('should throw error if build record not found', async () => {
      mockPrisma.buildRecord.findUnique.mockResolvedValue(null);

      await expect(
        photoCaptureService.capturePhoto(captureData)
      ).rejects.toThrow('Build record not found');
    });

    it('should throw error if operation not found', async () => {
      mockPrisma.buildRecordOperation.findUnique.mockResolvedValue(null);

      await expect(
        photoCaptureService.capturePhoto(captureData)
      ).rejects.toThrow('Operation not found');
    });

    it('should throw error if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        photoCaptureService.capturePhoto(captureData)
      ).rejects.toThrow('User not found');
    });

    it('should generate unique filename with timestamp', async () => {
      const mockPhoto = { id: 'photo-1' };
      mockPrisma.buildRecordPhoto.create.mockResolvedValue(mockPhoto);

      await photoCaptureService.capturePhoto(captureData);

      const createCall = mockPrisma.buildRecordPhoto.create.mock.calls[0][0];
      expect(createCall.data.filename).toMatch(/^photo_\d{8}_\d{6}\.jpg$/);
    });

    it('should create thumbnail with correct size', async () => {
      const mockSharpInstance = mockSharp();
      mockSharp.mockReturnValue(mockSharpInstance);

      await photoCaptureService.capturePhoto(captureData);

      expect(mockSharpInstance.resize).toHaveBeenCalledWith(300, 300, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    });

    it('should preserve image metadata', async () => {
      const metadata = {
        width: 1920,
        height: 1080,
        format: 'jpeg',
        size: 1024000,
      };

      mockSharp().metadata.mockResolvedValue(metadata);

      const mockPhoto = { id: 'photo-1' };
      mockPrisma.buildRecordPhoto.create.mockResolvedValue(mockPhoto);

      await photoCaptureService.capturePhoto(captureData);

      const createCall = mockPrisma.buildRecordPhoto.create.mock.calls[0][0];
      expect(createCall.data.metadata).toEqual(metadata);
    });
  });

  describe('uploadPhoto', () => {
    const mockFile = {
      fieldname: 'photo',
      originalname: 'test-photo.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('test image data'),
      size: 1024000,
    } as Express.Multer.File;

    const uploadData = {
      buildRecordId: 'br-1',
      operationId: 'bro-1',
      caption: 'Uploaded photo',
      category: 'INSPECTION',
      tags: ['inspection', 'quality'],
      uploadedBy: 'user-1',
    };

    beforeEach(() => {
      mockPrisma.buildRecord.findUnique.mockResolvedValue(mockBuildRecord);
      mockPrisma.buildRecordOperation.findUnique.mockResolvedValue(mockOperation);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockFs.mkdir.mockResolvedValue(undefined);
    });

    it('should upload photo successfully', async () => {
      const mockPhoto = {
        id: 'photo-1',
        filename: 'photo_20240101_120000.jpg',
        originalName: 'test-photo.jpg',
        filePath: '/uploads/photos/br-1/photo_20240101_120000.jpg',
        thumbnailPath: '/uploads/photos/br-1/thumb_photo_20240101_120000.jpg',
      };

      mockPrisma.buildRecordPhoto.create.mockResolvedValue(mockPhoto);

      const result = await photoCaptureService.uploadPhoto(mockFile, uploadData);

      expect(mockSharp).toHaveBeenCalledWith(mockFile.buffer);
      expect(result).toEqual(mockPhoto);
    });

    it('should validate file type', async () => {
      const invalidFile = {
        ...mockFile,
        mimetype: 'text/plain',
      };

      await expect(
        photoCaptureService.uploadPhoto(invalidFile as Express.Multer.File, uploadData)
      ).rejects.toThrow('Invalid file type. Only images are allowed');
    });

    it('should validate file size', async () => {
      const largeFile = {
        ...mockFile,
        size: 15 * 1024 * 1024, // 15MB
      };

      await expect(
        photoCaptureService.uploadPhoto(largeFile as Express.Multer.File, uploadData)
      ).rejects.toThrow('File size exceeds 10MB limit');
    });
  });

  describe('addAnnotations', () => {
    const mockPhoto = {
      id: 'photo-1',
      filePath: '/uploads/photos/br-1/photo_20240101_120000.jpg',
      annotations: null,
    };

    const annotations = [
      {
        type: 'arrow',
        points: [100, 100, 200, 200],
        color: '#ff0000',
        strokeWidth: 2,
      },
      {
        type: 'text',
        x: 150,
        y: 150,
        text: 'Issue here',
        color: '#0000ff',
        fontSize: 16,
      },
    ];

    it('should add annotations to photo', async () => {
      const annotatedPhoto = {
        ...mockPhoto,
        annotations,
      };

      mockPrisma.buildRecordPhoto.findUnique.mockResolvedValue(mockPhoto);
      mockPrisma.buildRecordPhoto.update.mockResolvedValue(annotatedPhoto);
      mockFs.readFile.mockResolvedValue(Buffer.from('original image'));

      const result = await photoCaptureService.addAnnotations('photo-1', annotations);

      expect(mockPrisma.buildRecordPhoto.findUnique).toHaveBeenCalledWith({
        where: { id: 'photo-1' },
      });

      expect(mockPrisma.buildRecordPhoto.update).toHaveBeenCalledWith({
        where: { id: 'photo-1' },
        data: {
          annotations,
          annotatedFilePath: expect.stringContaining('annotated_'),
        },
      });

      expect(result).toEqual(annotatedPhoto);
    });

    it('should throw error if photo not found', async () => {
      mockPrisma.buildRecordPhoto.findUnique.mockResolvedValue(null);

      await expect(
        photoCaptureService.addAnnotations('nonexistent', annotations)
      ).rejects.toThrow('Photo not found');
    });

    it('should create annotated image file', async () => {
      const mockSharpInstance = mockSharp();
      mockSharp.mockReturnValue(mockSharpInstance);

      mockPrisma.buildRecordPhoto.findUnique.mockResolvedValue(mockPhoto);
      mockPrisma.buildRecordPhoto.update.mockResolvedValue(mockPhoto);
      mockFs.readFile.mockResolvedValue(Buffer.from('original image'));

      await photoCaptureService.addAnnotations('photo-1', annotations);

      expect(mockSharpInstance.composite).toHaveBeenCalled();
      expect(mockSharpInstance.toFile).toHaveBeenCalled();
    });
  });

  describe('getPhotosByBuildRecord', () => {
    const mockPhotos = [
      {
        id: 'photo-1',
        filename: 'photo1.jpg',
        caption: 'First photo',
        takenAt: new Date('2024-01-01T08:00:00Z'),
      },
      {
        id: 'photo-2',
        filename: 'photo2.jpg',
        caption: 'Second photo',
        takenAt: new Date('2024-01-01T09:00:00Z'),
      },
    ];

    it('should return photos for build record', async () => {
      mockPrisma.buildRecordPhoto.findMany.mockResolvedValue(mockPhotos);

      const result = await photoCaptureService.getPhotosByBuildRecord('br-1');

      expect(mockPrisma.buildRecordPhoto.findMany).toHaveBeenCalledWith({
        where: {
          buildRecordId: 'br-1',
        },
        include: {
          operation: {
            include: {
              operation: true,
            },
          },
        },
        orderBy: {
          takenAt: 'asc',
        },
      });

      expect(result).toEqual(mockPhotos);
    });

    it('should filter photos by operation', async () => {
      await photoCaptureService.getPhotosByBuildRecord('br-1', 'bro-1');

      expect(mockPrisma.buildRecordPhoto.findMany).toHaveBeenCalledWith({
        where: {
          buildRecordId: 'br-1',
          operationId: 'bro-1',
        },
        include: {
          operation: {
            include: {
              operation: true,
            },
          },
        },
        orderBy: {
          takenAt: 'asc',
        },
      });
    });

    it('should filter photos by category', async () => {
      await photoCaptureService.getPhotosByBuildRecord('br-1', undefined, 'PROGRESS');

      expect(mockPrisma.buildRecordPhoto.findMany).toHaveBeenCalledWith({
        where: {
          buildRecordId: 'br-1',
          category: 'PROGRESS',
        },
        include: {
          operation: {
            include: {
              operation: true,
            },
          },
        },
        orderBy: {
          takenAt: 'asc',
        },
      });
    });
  });

  describe('deletePhoto', () => {
    const mockPhoto = {
      id: 'photo-1',
      filePath: '/uploads/photos/br-1/photo_20240101_120000.jpg',
      thumbnailPath: '/uploads/photos/br-1/thumb_photo_20240101_120000.jpg',
      annotatedFilePath: '/uploads/photos/br-1/annotated_photo_20240101_120000.jpg',
    };

    it('should delete photo and associated files', async () => {
      mockPrisma.buildRecordPhoto.findUnique.mockResolvedValue(mockPhoto);
      mockPrisma.buildRecordPhoto.delete.mockResolvedValue(mockPhoto);
      mockFs.unlink.mockResolvedValue(undefined);

      await photoCaptureService.deletePhoto('photo-1');

      expect(mockPrisma.buildRecordPhoto.delete).toHaveBeenCalledWith({
        where: { id: 'photo-1' },
      });

      expect(mockFs.unlink).toHaveBeenCalledTimes(3); // Original, thumbnail, and annotated
      expect(mockFs.unlink).toHaveBeenCalledWith(mockPhoto.filePath);
      expect(mockFs.unlink).toHaveBeenCalledWith(mockPhoto.thumbnailPath);
      expect(mockFs.unlink).toHaveBeenCalledWith(mockPhoto.annotatedFilePath);
    });

    it('should handle missing files gracefully', async () => {
      mockPrisma.buildRecordPhoto.findUnique.mockResolvedValue(mockPhoto);
      mockPrisma.buildRecordPhoto.delete.mockResolvedValue(mockPhoto);
      mockFs.unlink.mockRejectedValue(new Error('File not found'));

      // Should not throw error
      await photoCaptureService.deletePhoto('photo-1');

      expect(mockPrisma.buildRecordPhoto.delete).toHaveBeenCalled();
    });

    it('should throw error if photo not found', async () => {
      mockPrisma.buildRecordPhoto.findUnique.mockResolvedValue(null);

      await expect(
        photoCaptureService.deletePhoto('nonexistent')
      ).rejects.toThrow('Photo not found');
    });
  });

  describe('processImage', () => {
    it('should process image with quality optimization', async () => {
      const inputBuffer = Buffer.from('input image');
      const outputBuffer = Buffer.from('processed image');

      const mockSharpInstance = mockSharp();
      mockSharp.mockReturnValue(mockSharpInstance);
      mockSharpInstance.toBuffer.mockResolvedValue(outputBuffer);

      const result = await photoCaptureService.processImage(inputBuffer, {
        quality: 80,
        maxWidth: 1920,
        maxHeight: 1080,
      });

      expect(mockSharp).toHaveBeenCalledWith(inputBuffer);
      expect(mockSharpInstance.resize).toHaveBeenCalledWith(1920, 1080, {
        fit: 'inside',
        withoutEnlargement: true,
      });
      expect(mockSharpInstance.jpeg).toHaveBeenCalledWith({ quality: 80 });
      expect(result).toEqual(outputBuffer);
    });

    it('should handle different image formats', async () => {
      const inputBuffer = Buffer.from('input image');
      const mockSharpInstance = mockSharp();
      mockSharp.mockReturnValue(mockSharpInstance);

      await photoCaptureService.processImage(inputBuffer, {
        format: 'png',
        quality: 90,
      });

      expect(mockSharpInstance.png).toHaveBeenCalledWith({ quality: 90 });
    });

    it('should apply watermark if specified', async () => {
      const inputBuffer = Buffer.from('input image');
      const mockSharpInstance = mockSharp();
      mockSharp.mockReturnValue(mockSharpInstance);

      await photoCaptureService.processImage(inputBuffer, {
        watermark: {
          text: 'CONFIDENTIAL',
          position: 'bottom-right',
          opacity: 0.5,
        },
      });

      expect(mockSharpInstance.composite).toHaveBeenCalled();
    });
  });
});