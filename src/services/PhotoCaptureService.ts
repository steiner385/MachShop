import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import {
  BuildRecordPhoto,
  PhotoType,
} from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const CapturePhotoSchema = z.object({
  buildRecordId: z.string().cuid(),
  operationId: z.string().cuid().optional(),
  deviationId: z.string().cuid().optional(),
  photoType: z.nativeEnum(PhotoType),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  capturedBy: z.string().cuid(),
  locationCaptured: z.string().optional(),
  operationNumber: z.string().optional(),
  partNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  equipmentUsed: z.string().optional(),
  annotations: z.any().optional(),
  metadata: z.any().optional(),
  qualityControlPhoto: z.boolean().default(false),
  mandatoryPhoto: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
});

export const UpdatePhotoSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  annotations: z.any().optional(),
  metadata: z.any().optional(),
  approved: z.boolean().optional(),
  approvedBy: z.string().cuid().optional(),
  rejected: z.boolean().optional(),
  rejectedBy: z.string().cuid().optional(),
  rejectionReason: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const PhotoSearchSchema = z.object({
  buildRecordId: z.string().cuid().optional(),
  operationId: z.string().cuid().optional(),
  deviationId: z.string().cuid().optional(),
  photoType: z.nativeEnum(PhotoType).optional(),
  capturedBy: z.string().cuid().optional(),
  partNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  tags: z.array(z.string()).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  approved: z.boolean().optional(),
  qualityControlPhoto: z.boolean().optional(),
  mandatoryPhoto: z.boolean().optional(),
});

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type CapturePhotoRequest = z.infer<typeof CapturePhotoSchema>;
export type UpdatePhotoRequest = z.infer<typeof UpdatePhotoSchema>;
export type PhotoSearchRequest = z.infer<typeof PhotoSearchSchema>;

export interface PhotoUploadData {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface PhotoMetadata {
  originalName: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  captureDate: Date;
  deviceInfo?: {
    make?: string;
    model?: string;
    software?: string;
  };
  cameraSettings?: {
    iso?: number;
    aperture?: string;
    shutterSpeed?: string;
    focalLength?: string;
    flash?: boolean;
  };
  gpsLocation?: {
    latitude?: number;
    longitude?: number;
    altitude?: number;
  };
  checksum: string;
}

export interface PhotoAnnotation {
  id: string;
  type: 'arrow' | 'circle' | 'rectangle' | 'text' | 'measurement';
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color: string;
  strokeWidth: number;
  createdBy: string;
  createdAt: Date;
  measurements?: {
    value: number;
    unit: string;
    scale: number;
  };
}

export interface PhotoWithDetails extends BuildRecordPhoto {
  capturedByUser: {
    firstName: string;
    lastName: string;
    email: string;
  };
  approvedByUser?: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  rejectedByUser?: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  buildRecord: {
    buildRecordNumber: string;
    engineModel: string;
    serialNumber: string;
  };
  operation?: {
    operationNumber: string;
    operationName: string;
  } | null;
  deviation?: {
    title: string;
    deviationType: string;
  } | null;
}

export interface PhotoProcessingOptions {
  resize?: {
    width: number;
    height: number;
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  };
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  watermark?: {
    text: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity: number;
  };
  generateThumbnail?: boolean;
  thumbnailSize?: { width: number; height: number };
}

export interface PhotoStorageConfig {
  basePath: string;
  maxFileSize: number; // in bytes
  allowedFormats: string[];
  compressionQuality: number;
  generateThumbnails: boolean;
  thumbnailSizes: { width: number; height: number }[];
  storageStructure: 'flat' | 'date' | 'buildRecord';
}

// ============================================================================
// PHOTO CAPTURE SERVICE
// ============================================================================

export class PhotoCaptureService {
  private static readonly DEFAULT_STORAGE_CONFIG: PhotoStorageConfig = {
    basePath: path.join(process.cwd(), 'storage', 'photos'),
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFormats: ['image/jpeg', 'image/png', 'image/webp'],
    compressionQuality: 85,
    generateThumbnails: true,
    thumbnailSizes: [
      { width: 150, height: 150 }, // Small thumbnail
      { width: 300, height: 300 }, // Medium thumbnail
    ],
    storageStructure: 'buildRecord',
  };

  /**
   * Capture and store a photo with metadata
   */
  static async capturePhoto(
    photoData: CapturePhotoRequest,
    uploadData: PhotoUploadData,
    processingOptions: PhotoProcessingOptions = {}
  ): Promise<PhotoWithDetails> {
    // Validate input
    const validatedData = CapturePhotoSchema.parse(photoData);

    // Validate file
    this.validateUploadData(uploadData);

    // Verify build record exists
    const buildRecord = await prisma.buildRecord.findUnique({
      where: { id: validatedData.buildRecordId },
      select: { id: true, buildRecordNumber: true }
    });

    if (!buildRecord) {
      throw new Error('Build record not found');
    }

    // Generate file paths
    const fileId = uuidv4();
    const { filePath, thumbnailPaths } = this.generateFilePaths(
      validatedData.buildRecordId,
      fileId,
      uploadData.originalName
    );

    // Ensure directory exists
    await this.ensureDirectoryExists(path.dirname(filePath));

    try {
      // Process and save main image
      const processedImageInfo = await this.processAndSaveImage(
        uploadData.buffer,
        filePath,
        processingOptions
      );

      // Generate thumbnails
      const thumbnailInfo = await this.generateThumbnails(
        uploadData.buffer,
        thumbnailPaths
      );

      // Extract metadata
      const metadata = await this.extractMetadata(uploadData);

      // Save to database
      const photo = await prisma.buildRecordPhoto.create({
        data: {
          buildRecordId: validatedData.buildRecordId,
          operationId: validatedData.operationId,
          deviationId: validatedData.deviationId,
          photoType: validatedData.photoType,
          title: validatedData.title,
          description: validatedData.description,
          filePath,
          fileName: uploadData.originalName,
          fileSize: processedImageInfo.size,
          mimeType: `image/${processedImageInfo.format}`,
          imageWidth: processedImageInfo.width,
          imageHeight: processedImageInfo.height,
          capturedBy: validatedData.capturedBy,
          capturedAt: new Date(),
          locationCaptured: validatedData.locationCaptured,
          operationNumber: validatedData.operationNumber,
          partNumber: validatedData.partNumber,
          serialNumber: validatedData.serialNumber,
          equipmentUsed: validatedData.equipmentUsed,
          annotations: validatedData.annotations,
          metadata: {
            ...metadata,
            thumbnails: thumbnailInfo,
            processing: processingOptions,
          },
          qualityControlPhoto: validatedData.qualityControlPhoto,
          mandatoryPhoto: validatedData.mandatoryPhoto,
          approved: false,
          rejected: false,
          isArchived: false,
          tags: validatedData.tags,
        },
        include: {
          capturedByUser: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            }
          },
          buildRecord: {
            select: {
              buildRecordNumber: true,
              engineModel: true,
              serialNumber: true,
            }
          },
          operation: {
            select: {
              operationNumber: true,
              operationName: true,
            }
          },
          deviation: {
            select: {
              title: true,
              deviationType: true,
            }
          },
        },
      });

      return photo as PhotoWithDetails;

    } catch (error) {
      // Clean up files if database save fails
      await this.cleanupFiles([filePath, ...thumbnailPaths]);
      throw new Error(`Photo capture failed: ${error.message}`);
    }
  }

  /**
   * Get photo by ID with full details
   */
  static async getPhotoById(id: string): Promise<PhotoWithDetails | null> {
    const photo = await prisma.buildRecordPhoto.findUnique({
      where: { id },
      include: {
        capturedByUser: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        approvedByUser: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        rejectedByUser: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        buildRecord: {
          select: {
            buildRecordNumber: true,
            engineModel: true,
            serialNumber: true,
          }
        },
        operation: {
          select: {
            operationNumber: true,
            operationName: true,
          }
        },
        deviation: {
          select: {
            title: true,
            deviationType: true,
          }
        },
      },
    });

    return photo as PhotoWithDetails | null;
  }

  /**
   * Update photo metadata and annotations
   */
  static async updatePhoto(
    id: string,
    updateData: UpdatePhotoRequest,
    updatedBy: string
  ): Promise<PhotoWithDetails> {
    const validatedData = UpdatePhotoSchema.parse(updateData);

    // Get current photo
    const currentPhoto = await prisma.buildRecordPhoto.findUnique({
      where: { id }
    });

    if (!currentPhoto) {
      throw new Error('Photo not found');
    }

    // Prepare update data
    const updatePayload: any = { ...validatedData };

    // Handle approval/rejection
    if (validatedData.approved) {
      updatePayload.approvedAt = new Date();
      updatePayload.rejected = false;
      updatePayload.rejectedAt = null;
      updatePayload.rejectionReason = null;
    }

    if (validatedData.rejected) {
      updatePayload.rejectedAt = new Date();
      updatePayload.approved = false;
      updatePayload.approvedAt = null;
    }

    // Update photo
    const updatedPhoto = await prisma.buildRecordPhoto.update({
      where: { id },
      data: updatePayload,
      include: {
        capturedByUser: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        approvedByUser: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        rejectedByUser: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        buildRecord: {
          select: {
            buildRecordNumber: true,
            engineModel: true,
            serialNumber: true,
          }
        },
        operation: {
          select: {
            operationNumber: true,
            operationName: true,
          }
        },
        deviation: {
          select: {
            title: true,
            deviationType: true,
          }
        },
      },
    });

    return updatedPhoto as PhotoWithDetails;
  }

  /**
   * Add annotation to photo
   */
  static async addPhotoAnnotation(
    photoId: string,
    annotation: Omit<PhotoAnnotation, 'id' | 'createdAt'>,
    annotatedBy: string
  ): Promise<PhotoWithDetails> {
    const photo = await prisma.buildRecordPhoto.findUnique({
      where: { id: photoId }
    });

    if (!photo) {
      throw new Error('Photo not found');
    }

    // Get existing annotations
    const existingAnnotations = (photo.annotations as PhotoAnnotation[]) || [];

    // Add new annotation
    const newAnnotation: PhotoAnnotation = {
      ...annotation,
      id: uuidv4(),
      createdBy: annotatedBy,
      createdAt: new Date(),
    };

    const updatedAnnotations = [...existingAnnotations, newAnnotation];

    // Update photo
    const updatedPhoto = await prisma.buildRecordPhoto.update({
      where: { id: photoId },
      data: {
        annotations: updatedAnnotations,
      },
      include: {
        capturedByUser: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        buildRecord: {
          select: {
            buildRecordNumber: true,
            engineModel: true,
            serialNumber: true,
          }
        },
        operation: {
          select: {
            operationNumber: true,
            operationName: true,
          }
        },
        deviation: {
          select: {
            title: true,
            deviationType: true,
          }
        },
      },
    });

    return updatedPhoto as PhotoWithDetails;
  }

  /**
   * Search photos with filters
   */
  static async searchPhotos(
    searchCriteria: PhotoSearchRequest,
    pagination: {
      page?: number;
      pageSize?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ) {
    const validatedCriteria = PhotoSearchSchema.parse(searchCriteria);
    const {
      page = 1,
      pageSize = 20,
      sortBy = 'capturedAt',
      sortOrder = 'desc'
    } = pagination;

    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: any = {};

    if (validatedCriteria.buildRecordId) where.buildRecordId = validatedCriteria.buildRecordId;
    if (validatedCriteria.operationId) where.operationId = validatedCriteria.operationId;
    if (validatedCriteria.deviationId) where.deviationId = validatedCriteria.deviationId;
    if (validatedCriteria.photoType) where.photoType = validatedCriteria.photoType;
    if (validatedCriteria.capturedBy) where.capturedBy = validatedCriteria.capturedBy;
    if (validatedCriteria.partNumber) where.partNumber = { contains: validatedCriteria.partNumber, mode: 'insensitive' };
    if (validatedCriteria.serialNumber) where.serialNumber = { contains: validatedCriteria.serialNumber, mode: 'insensitive' };
    if (validatedCriteria.approved !== undefined) where.approved = validatedCriteria.approved;
    if (validatedCriteria.qualityControlPhoto !== undefined) where.qualityControlPhoto = validatedCriteria.qualityControlPhoto;
    if (validatedCriteria.mandatoryPhoto !== undefined) where.mandatoryPhoto = validatedCriteria.mandatoryPhoto;

    if (validatedCriteria.tags && validatedCriteria.tags.length > 0) {
      where.tags = { hasSome: validatedCriteria.tags };
    }

    if (validatedCriteria.dateFrom || validatedCriteria.dateTo) {
      where.capturedAt = {};
      if (validatedCriteria.dateFrom) where.capturedAt.gte = validatedCriteria.dateFrom;
      if (validatedCriteria.dateTo) where.capturedAt.lte = validatedCriteria.dateTo;
    }

    // Get total count
    const total = await prisma.buildRecordPhoto.count({ where });

    // Get photos
    const photos = await prisma.buildRecordPhoto.findMany({
      where,
      include: {
        capturedByUser: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        buildRecord: {
          select: {
            buildRecordNumber: true,
            engineModel: true,
            serialNumber: true,
          }
        },
        operation: {
          select: {
            operationNumber: true,
            operationName: true,
          }
        },
        deviation: {
          select: {
            title: true,
            deviationType: true,
          }
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: pageSize,
    });

    return {
      photos: photos as PhotoWithDetails[],
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get photo file stream
   */
  static async getPhotoStream(id: string, thumbnail: boolean = false): Promise<{ stream: fs.ReadStream; mimeType: string } | null> {
    const photo = await prisma.buildRecordPhoto.findUnique({
      where: { id },
      select: { filePath: true, mimeType: true, metadata: true }
    });

    if (!photo) {
      return null;
    }

    let filePath = photo.filePath;

    // Use thumbnail if requested and available
    if (thumbnail && photo.metadata) {
      const metadata = photo.metadata as any;
      if (metadata.thumbnails && metadata.thumbnails.length > 0) {
        filePath = metadata.thumbnails[0].path;
      }
    }

    if (!fs.existsSync(filePath)) {
      throw new Error('Photo file not found');
    }

    const stream = fs.createReadStream(filePath);
    return {
      stream,
      mimeType: photo.mimeType,
    };
  }

  /**
   * Delete photo and associated files
   */
  static async deletePhoto(id: string): Promise<void> {
    const photo = await prisma.buildRecordPhoto.findUnique({
      where: { id },
      select: { filePath: true, metadata: true }
    });

    if (!photo) {
      throw new Error('Photo not found');
    }

    // Get all file paths to delete
    const filesToDelete = [photo.filePath];
    if (photo.metadata) {
      const metadata = photo.metadata as any;
      if (metadata.thumbnails) {
        filesToDelete.push(...metadata.thumbnails.map((t: any) => t.path));
      }
    }

    // Delete from database first
    await prisma.buildRecordPhoto.delete({
      where: { id }
    });

    // Clean up files
    await this.cleanupFiles(filesToDelete);
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Validate upload data
   */
  private static validateUploadData(uploadData: PhotoUploadData): void {
    const config = this.DEFAULT_STORAGE_CONFIG;

    if (uploadData.size > config.maxFileSize) {
      throw new Error(`File size exceeds maximum allowed size of ${config.maxFileSize} bytes`);
    }

    if (!config.allowedFormats.includes(uploadData.mimeType)) {
      throw new Error(`File format ${uploadData.mimeType} not allowed`);
    }
  }

  /**
   * Generate file paths for storage
   */
  private static generateFilePaths(
    buildRecordId: string,
    fileId: string,
    originalName: string
  ): { filePath: string; thumbnailPaths: string[] } {
    const config = this.DEFAULT_STORAGE_CONFIG;
    const ext = path.extname(originalName);
    const baseName = `${fileId}${ext}`;

    let directory: string;
    switch (config.storageStructure) {
      case 'date':
        const date = new Date();
        directory = path.join(
          config.basePath,
          date.getFullYear().toString(),
          (date.getMonth() + 1).toString().padStart(2, '0'),
          date.getDate().toString().padStart(2, '0')
        );
        break;
      case 'buildRecord':
        directory = path.join(config.basePath, buildRecordId);
        break;
      default:
        directory = config.basePath;
    }

    const filePath = path.join(directory, baseName);
    const thumbnailPaths = config.thumbnailSizes.map((size, index) =>
      path.join(directory, 'thumbnails', `${fileId}_${size.width}x${size.height}${ext}`)
    );

    return { filePath, thumbnailPaths };
  }

  /**
   * Ensure directory exists
   */
  private static async ensureDirectoryExists(dirPath: string): Promise<void> {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Process and save image
   */
  private static async processAndSaveImage(
    buffer: Buffer,
    filePath: string,
    options: PhotoProcessingOptions
  ): Promise<{ width: number; height: number; size: number; format: string }> {
    let sharpInstance = sharp(buffer);

    // Apply resize if specified
    if (options.resize) {
      sharpInstance = sharpInstance.resize(
        options.resize.width,
        options.resize.height,
        { fit: options.resize.fit || 'inside' }
      );
    }

    // Apply format and quality
    const format = options.format || 'jpeg';
    const quality = options.quality || this.DEFAULT_STORAGE_CONFIG.compressionQuality;

    switch (format) {
      case 'jpeg':
        sharpInstance = sharpInstance.jpeg({ quality });
        break;
      case 'png':
        sharpInstance = sharpInstance.png({ quality });
        break;
      case 'webp':
        sharpInstance = sharpInstance.webp({ quality });
        break;
    }

    // Add watermark if specified
    if (options.watermark) {
      // Watermark implementation would go here
    }

    // Get metadata before saving
    const metadata = await sharpInstance.metadata();

    // Save the processed image
    await sharpInstance.toFile(filePath);

    // Get file stats
    const stats = fs.statSync(filePath);

    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      size: stats.size,
      format,
    };
  }

  /**
   * Generate thumbnails
   */
  private static async generateThumbnails(
    buffer: Buffer,
    thumbnailPaths: string[]
  ): Promise<Array<{ path: string; width: number; height: number; size: number }>> {
    const config = this.DEFAULT_STORAGE_CONFIG;
    const thumbnailInfo = [];

    for (let i = 0; i < thumbnailPaths.length; i++) {
      const thumbnailPath = thumbnailPaths[i];
      const size = config.thumbnailSizes[i];

      // Ensure thumbnail directory exists
      await this.ensureDirectoryExists(path.dirname(thumbnailPath));

      // Generate thumbnail
      await sharp(buffer)
        .resize(size.width, size.height, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      // Get file stats
      const stats = fs.statSync(thumbnailPath);

      thumbnailInfo.push({
        path: thumbnailPath,
        width: size.width,
        height: size.height,
        size: stats.size,
      });
    }

    return thumbnailInfo;
  }

  /**
   * Extract metadata from image
   */
  private static async extractMetadata(uploadData: PhotoUploadData): Promise<PhotoMetadata> {
    const sharpInstance = sharp(uploadData.buffer);
    const metadata = await sharpInstance.metadata();

    // Generate checksum
    const crypto = require('crypto');
    const checksum = crypto.createHash('sha256').update(uploadData.buffer).digest('hex');

    return {
      originalName: uploadData.originalName,
      mimeType: uploadData.mimeType,
      size: uploadData.size,
      width: metadata.width,
      height: metadata.height,
      captureDate: new Date(),
      deviceInfo: {
        make: metadata.exif?.image?.Make,
        model: metadata.exif?.image?.Model,
        software: metadata.exif?.image?.Software,
      },
      cameraSettings: {
        iso: metadata.exif?.photo?.ISO,
        aperture: metadata.exif?.photo?.FNumber,
        shutterSpeed: metadata.exif?.photo?.ExposureTime,
        focalLength: metadata.exif?.photo?.FocalLength,
        flash: !!metadata.exif?.photo?.Flash,
      },
      gpsLocation: metadata.exif?.gps ? {
        latitude: metadata.exif.gps.GPSLatitude,
        longitude: metadata.exif.gps.GPSLongitude,
        altitude: metadata.exif.gps.GPSAltitude,
      } : undefined,
      checksum,
    };
  }

  /**
   * Clean up files
   */
  private static async cleanupFiles(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        console.error(`Failed to delete file ${filePath}:`, error);
      }
    }
  }
}

export default PhotoCaptureService;