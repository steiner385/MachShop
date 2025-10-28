import * as AWS from 'aws-sdk';
import { Client as MinioClient } from 'minio';
import { PrismaClient, MultipartUpload, UploadStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { PassThrough } from 'stream';
import logger from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { storageConfig } from '../config/storage';
import { cloudStorageService } from './CloudStorageService';

/**
 * TypeScript interfaces for Multipart Upload Operations
 */
export interface MultipartUploadInit {
  fileName: string;
  fileSize: number;
  contentType?: string;
  documentType?: string;
  documentId?: string;
  attachmentType?: string;
  partSize?: number; // bytes
  metadata?: Record<string, string>;
  uploadedById: string;
  uploadedByName: string;
}

export interface UploadPart {
  partNumber: number;
  size: number;
  etag: string;
  checksum?: string;
}

export interface UploadProgress {
  uploadId: string;
  fileName: string;
  totalParts: number;
  completedParts: number;
  uploadedBytes: number;
  totalBytes: number;
  percentComplete: number;
  estimatedTimeRemaining?: number; // seconds
  uploadSpeed?: number; // bytes per second
}

export interface MultipartUploadResult {
  uploadId: string;
  fileName: string;
  fileSize: number;
  finalFileId?: string;
  parts: UploadPart[];
  completedAt: Date;
  duration: number; // seconds
}

export interface UploadSession {
  uploadId: string;
  uploadUrl?: string; // For S3 pre-signed URLs
  partUrls?: Record<number, string>; // Pre-signed URLs for each part
  expiresAt: Date;
  metadata: Record<string, any>;
}

/**
 * Multipart Upload Service - Handles large file uploads with resumable functionality
 * Supports both S3 and MinIO backends with progress tracking and error recovery
 */
class MultipartUploadService {
  private s3?: AWS.S3;
  private minio?: MinioClient;
  private prisma: PrismaClient;
  private bucket: string;

  constructor() {
    this.prisma = new PrismaClient();
    this.bucket = storageConfig.provider.bucket;
    this.initializeClient();
  }

  /**
   * Initialize the appropriate storage client
   */
  private initializeClient(): void {
    try {
      if (storageConfig.provider.type === 's3') {
        this.s3 = new AWS.S3({
          accessKeyId: storageConfig.provider.accessKey,
          secretAccessKey: storageConfig.provider.secretKey,
          region: storageConfig.provider.region,
          endpoint: storageConfig.provider.endpoint,
          s3ForcePathStyle: storageConfig.provider.pathStyle,
          signatureVersion: 'v4',
        });
      } else if (storageConfig.provider.type === 'minio') {
        this.minio = new MinioClient({
          endPoint: storageConfig.provider.endpoint!,
          port: storageConfig.provider.port,
          useSSL: storageConfig.provider.useSSL,
          accessKey: storageConfig.provider.accessKey,
          secretKey: storageConfig.provider.secretKey,
        });
      }
    } catch (error: any) {
      logger.error('Failed to initialize multipart upload client', { error: error.message });
      throw new AppError('Client initialization failed', 500, 'CLIENT_INIT_FAILED', error);
    }
  }

  /**
   * Initialize a multipart upload session
   */
  async initializeUpload(options: MultipartUploadInit): Promise<UploadSession> {
    try {
      logger.info('Initializing multipart upload', {
        fileName: options.fileName,
        fileSize: options.fileSize,
        contentType: options.contentType
      });

      // Generate storage path
      const storagePath = this.generateStoragePath(options);
      const uploadId = crypto.randomUUID();
      const partSize = options.partSize || storageConfig.upload.chunkSize;
      const totalParts = Math.ceil(options.fileSize / partSize);

      // Initialize cloud storage multipart upload
      let cloudUploadId: string;
      let partUrls: Record<number, string> = {};

      if (this.s3) {
        const createParams: AWS.S3.CreateMultipartUploadRequest = {
          Bucket: this.bucket,
          Key: storagePath,
          ContentType: options.contentType || 'application/octet-stream',
          Metadata: options.metadata,
        };

        const createResult = await this.s3.createMultipartUpload(createParams).promise();
        cloudUploadId = createResult.UploadId!;

        // Generate pre-signed URLs for each part
        for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
          const uploadPartParams: AWS.S3.UploadPartRequest = {
            Bucket: this.bucket,
            Key: storagePath,
            PartNumber: partNumber,
            UploadId: cloudUploadId,
            Body: Buffer.alloc(0), // Dummy body for URL generation
          };

          partUrls[partNumber] = this.s3.getSignedUrl('uploadPart', {
            Bucket: this.bucket,
            Key: storagePath,
            PartNumber: partNumber,
            UploadId: cloudUploadId,
            Expires: 3600, // 1 hour
          });
        }
      } else if (this.minio) {
        // MinIO doesn't have native multipart upload APIs like S3
        // We'll simulate it by using a unique upload ID
        cloudUploadId = `minio_${uploadId}`;
      } else {
        throw new AppError('No storage client available', 500, 'NO_CLIENT');
      }

      // Store upload session in database
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await this.prisma.multipartUpload.create({
        data: {
          id: uploadId,
          fileName: options.fileName,
          originalFileName: options.fileName,
          totalSize: options.fileSize,
          partSize,
          totalParts,
          storagePath,
          cloudUploadId,
          status: UploadStatus.INITIATED,
          uploadedById: options.uploadedById,
          uploadedByName: options.uploadedByName,
          documentType: options.documentType,
          documentId: options.documentId,
          attachmentType: options.attachmentType as any,
          parts: [],
          metadata: {
            ...options.metadata,
            bucket: this.bucket,
            contentType: options.contentType,
          },
          expiresAt,
        }
      });

      const session: UploadSession = {
        uploadId,
        partUrls,
        expiresAt,
        metadata: {
          storagePath,
          cloudUploadId,
          partSize,
          totalParts,
        }
      };

      logger.info('Multipart upload initialized', {
        uploadId,
        cloudUploadId,
        totalParts,
        partSize
      });

      return session;
    } catch (error: any) {
      logger.error('Failed to initialize multipart upload', {
        error: error.message,
        fileName: options.fileName
      });
      throw new AppError('Upload initialization failed', 500, 'INIT_FAILED', error);
    }
  }

  /**
   * Upload a single part of the multipart upload
   */
  async uploadPart(
    uploadId: string,
    partNumber: number,
    partData: Buffer,
    options: {
      expectedSize?: number;
      checksum?: string;
    } = {}
  ): Promise<UploadPart> {
    try {
      logger.debug('Uploading part', {
        uploadId,
        partNumber,
        size: partData.length
      });

      // Get upload session
      const upload = await this.prisma.multipartUpload.findUnique({
        where: { id: uploadId }
      });

      if (!upload) {
        throw new AppError('Upload session not found', 404, 'UPLOAD_NOT_FOUND');
      }

      if (upload.status !== UploadStatus.INITIATED && upload.status !== UploadStatus.IN_PROGRESS) {
        throw new AppError('Upload session is not active', 400, 'UPLOAD_NOT_ACTIVE');
      }

      // Validate part size (except for the last part)
      if (partNumber < upload.totalParts && partData.length !== upload.partSize) {
        throw new AppError(
          `Invalid part size. Expected ${upload.partSize}, got ${partData.length}`,
          400,
          'INVALID_PART_SIZE'
        );
      }

      // Calculate checksum for data integrity
      const partChecksum = crypto.createHash('md5').update(partData).digest('hex');
      if (options.checksum && options.checksum !== partChecksum) {
        throw new AppError('Part checksum mismatch', 400, 'CHECKSUM_MISMATCH');
      }

      // Upload part to cloud storage
      let etag: string;

      if (this.s3) {
        const uploadPartParams: AWS.S3.UploadPartRequest = {
          Bucket: this.bucket,
          Key: upload.storagePath,
          PartNumber: partNumber,
          UploadId: upload.cloudUploadId,
          Body: partData,
          ContentMD5: Buffer.from(partChecksum, 'hex').toString('base64'),
        };

        const result = await this.s3.uploadPart(uploadPartParams).promise();
        etag = result.ETag!.replace(/"/g, ''); // Remove quotes
      } else if (this.minio) {
        // For MinIO, we'll store parts as separate objects and combine later
        const partKey = `${upload.storagePath}.part.${partNumber}`;
        const putResult = await this.minio.putObject(
          this.bucket,
          partKey,
          partData,
          partData.length,
          {
            'Content-Type': 'application/octet-stream',
            'x-amz-meta-upload-id': uploadId,
            'x-amz-meta-part-number': partNumber.toString(),
          }
        );
        etag = putResult.etag || crypto.randomUUID();
      } else {
        throw new AppError('No storage client available', 500, 'NO_CLIENT');
      }

      // Update database with part information
      const existingParts = upload.parts as UploadPart[];
      const updatedParts = existingParts.filter(p => p.partNumber !== partNumber);
      updatedParts.push({
        partNumber,
        size: partData.length,
        etag,
        checksum: partChecksum,
      });

      // Sort parts by part number
      updatedParts.sort((a, b) => a.partNumber - b.partNumber);

      await this.prisma.multipartUpload.update({
        where: { id: uploadId },
        data: {
          parts: updatedParts,
          status: UploadStatus.IN_PROGRESS,
          lastActivityAt: new Date(),
        }
      });

      logger.debug('Part uploaded successfully', {
        uploadId,
        partNumber,
        etag,
        size: partData.length
      });

      return {
        partNumber,
        size: partData.length,
        etag,
        checksum: partChecksum,
      };
    } catch (error: any) {
      logger.error('Failed to upload part', {
        error: error.message,
        uploadId,
        partNumber
      });
      throw new AppError('Part upload failed', 500, 'PART_UPLOAD_FAILED', error);
    }
  }

  /**
   * Complete the multipart upload
   */
  async completeUpload(uploadId: string): Promise<MultipartUploadResult> {
    try {
      logger.info('Completing multipart upload', { uploadId });

      // Get upload session
      const upload = await this.prisma.multipartUpload.findUnique({
        where: { id: uploadId }
      });

      if (!upload) {
        throw new AppError('Upload session not found', 404, 'UPLOAD_NOT_FOUND');
      }

      const parts = upload.parts as UploadPart[];

      // Validate all parts are uploaded
      if (parts.length !== upload.totalParts) {
        throw new AppError(
          `Missing parts. Expected ${upload.totalParts}, got ${parts.length}`,
          400,
          'MISSING_PARTS'
        );
      }

      // Validate part sequence
      for (let i = 1; i <= upload.totalParts; i++) {
        if (!parts.find(p => p.partNumber === i)) {
          throw new AppError(`Missing part ${i}`, 400, 'MISSING_PART');
        }
      }

      const startTime = upload.startedAt.getTime();
      const completionTime = Date.now();
      const duration = Math.round((completionTime - startTime) / 1000);

      // Complete upload in cloud storage
      let finalFileKey: string;

      if (this.s3) {
        const completeParams: AWS.S3.CompleteMultipartUploadRequest = {
          Bucket: this.bucket,
          Key: upload.storagePath,
          UploadId: upload.cloudUploadId,
          MultipartUpload: {
            Parts: parts
              .sort((a, b) => a.partNumber - b.partNumber)
              .map(part => ({
                ETag: part.etag,
                PartNumber: part.partNumber,
              }))
          }
        };

        const result = await this.s3.completeMultipartUpload(completeParams).promise();
        finalFileKey = result.Key!;
      } else if (this.minio) {
        // For MinIO, combine all parts into final file
        finalFileKey = upload.storagePath;
        await this.combineMinIOParts(upload, parts);
      } else {
        throw new AppError('No storage client available', 500, 'NO_CLIENT');
      }

      // Calculate final file hash
      const fileHash = await this.calculateUploadHash(upload, parts);

      // Create final StoredFile record
      const storedFile = await cloudStorageService.uploadFile(Buffer.alloc(0), {
        filename: upload.fileName,
        contentType: upload.metadata?.contentType || 'application/octet-stream',
        documentType: upload.documentType,
        documentId: upload.documentId,
        attachmentType: upload.attachmentType,
        metadata: {
          ...upload.metadata,
          multipartUploadId: uploadId,
          finalFileKey,
          fileHash,
        }
      });

      // Update upload status
      await this.prisma.multipartUpload.update({
        where: { id: uploadId },
        data: {
          status: UploadStatus.COMPLETED,
          completedAt: new Date(),
          finalFileId: storedFile.id,
        }
      });

      const result: MultipartUploadResult = {
        uploadId,
        fileName: upload.fileName,
        fileSize: upload.totalSize,
        finalFileId: storedFile.id,
        parts,
        completedAt: new Date(),
        duration,
      };

      logger.info('Multipart upload completed', {
        uploadId,
        finalFileId: storedFile.id,
        duration,
        fileSize: upload.totalSize
      });

      return result;
    } catch (error: any) {
      logger.error('Failed to complete multipart upload', { error: error.message, uploadId });

      // Mark upload as failed
      await this.prisma.multipartUpload.update({
        where: { id: uploadId },
        data: { status: UploadStatus.FAILED }
      }).catch(() => {}); // Ignore errors in error handler

      throw new AppError('Upload completion failed', 500, 'COMPLETION_FAILED', error);
    }
  }

  /**
   * Abort a multipart upload
   */
  async abortUpload(uploadId: string): Promise<void> {
    try {
      logger.info('Aborting multipart upload', { uploadId });

      const upload = await this.prisma.multipartUpload.findUnique({
        where: { id: uploadId }
      });

      if (!upload) {
        throw new AppError('Upload session not found', 404, 'UPLOAD_NOT_FOUND');
      }

      // Abort upload in cloud storage
      if (this.s3) {
        await this.s3.abortMultipartUpload({
          Bucket: this.bucket,
          Key: upload.storagePath,
          UploadId: upload.cloudUploadId,
        }).promise();
      } else if (this.minio) {
        // Clean up part objects
        const parts = upload.parts as UploadPart[];
        for (const part of parts) {
          const partKey = `${upload.storagePath}.part.${part.partNumber}`;
          try {
            await this.minio.removeObject(this.bucket, partKey);
          } catch (cleanupError: any) {
            logger.warn('Failed to cleanup part object', {
              partKey,
              error: cleanupError.message
            });
          }
        }
      }

      // Update upload status
      await this.prisma.multipartUpload.update({
        where: { id: uploadId },
        data: { status: UploadStatus.ABORTED }
      });

      logger.info('Multipart upload aborted', { uploadId });
    } catch (error: any) {
      logger.error('Failed to abort multipart upload', { error: error.message, uploadId });
      throw new AppError('Upload abort failed', 500, 'ABORT_FAILED', error);
    }
  }

  /**
   * Get upload progress
   */
  async getUploadProgress(uploadId: string): Promise<UploadProgress> {
    try {
      const upload = await this.prisma.multipartUpload.findUnique({
        where: { id: uploadId }
      });

      if (!upload) {
        throw new AppError('Upload session not found', 404, 'UPLOAD_NOT_FOUND');
      }

      const parts = upload.parts as UploadPart[];
      const completedParts = parts.length;
      const uploadedBytes = parts.reduce((total, part) => total + part.size, 0);
      const percentComplete = (uploadedBytes / upload.totalSize) * 100;

      // Calculate upload speed and ETA
      const elapsedTime = (Date.now() - upload.startedAt.getTime()) / 1000; // seconds
      const uploadSpeed = elapsedTime > 0 ? uploadedBytes / elapsedTime : 0;
      const remainingBytes = upload.totalSize - uploadedBytes;
      const estimatedTimeRemaining = uploadSpeed > 0 ? remainingBytes / uploadSpeed : undefined;

      return {
        uploadId,
        fileName: upload.fileName,
        totalParts: upload.totalParts,
        completedParts,
        uploadedBytes,
        totalBytes: upload.totalSize,
        percentComplete: Math.round(percentComplete * 100) / 100,
        estimatedTimeRemaining: estimatedTimeRemaining ? Math.round(estimatedTimeRemaining) : undefined,
        uploadSpeed: Math.round(uploadSpeed),
      };
    } catch (error: any) {
      logger.error('Failed to get upload progress', { error: error.message, uploadId });
      throw new AppError('Progress retrieval failed', 500, 'PROGRESS_FAILED', error);
    }
  }

  /**
   * Clean up expired uploads
   */
  async cleanupExpiredUploads(): Promise<{
    cleanedUp: number;
    errors: string[];
  }> {
    try {
      logger.info('Cleaning up expired multipart uploads');

      const expiredUploads = await this.prisma.multipartUpload.findMany({
        where: {
          expiresAt: { lt: new Date() },
          status: { in: [UploadStatus.INITIATED, UploadStatus.IN_PROGRESS] }
        }
      });

      const result = {
        cleanedUp: 0,
        errors: [] as string[]
      };

      for (const upload of expiredUploads) {
        try {
          await this.abortUpload(upload.id);
          result.cleanedUp++;
        } catch (error: any) {
          result.errors.push(`Failed to cleanup ${upload.id}: ${error.message}`);
        }
      }

      logger.info('Expired uploads cleanup completed', {
        expiredCount: expiredUploads.length,
        cleanedUp: result.cleanedUp,
        errors: result.errors.length
      });

      return result;
    } catch (error: any) {
      logger.error('Failed to cleanup expired uploads', { error: error.message });
      throw new AppError('Cleanup failed', 500, 'CLEANUP_FAILED', error);
    }
  }

  /**
   * Private helper methods
   */

  private generateStoragePath(options: MultipartUploadInit): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const randomId = crypto.randomBytes(8).toString('hex');
    const ext = options.fileName.split('.').pop() || '';
    const baseName = options.fileName.replace(`.${ext}`, '');

    if (options.documentType && options.documentId) {
      return `${options.documentType}/${options.documentId}/${baseName}-${randomId}.${ext}`;
    }

    return `multipart/${timestamp}/${randomId}/${options.fileName}`;
  }

  private async combineMinIOParts(upload: MultipartUpload, parts: UploadPart[]): Promise<void> {
    // For MinIO, we need to combine all parts into the final file
    const combinedStream = new PassThrough();
    const sortedParts = parts.sort((a, b) => a.partNumber - b.partNumber);

    // Stream all parts sequentially to the combined stream
    for (const part of sortedParts) {
      const partKey = `${upload.storagePath}.part.${part.partNumber}`;
      const partStream = await this.minio!.getObject(this.bucket, partKey);

      partStream.pipe(combinedStream, { end: false });

      await new Promise<void>((resolve, reject) => {
        partStream.on('end', resolve);
        partStream.on('error', reject);
      });
    }

    combinedStream.end();

    // Upload the combined stream as the final file
    await this.minio!.putObject(
      this.bucket,
      upload.storagePath,
      combinedStream,
      upload.totalSize,
      { 'Content-Type': upload.metadata?.contentType || 'application/octet-stream' }
    );

    // Clean up part objects
    for (const part of sortedParts) {
      const partKey = `${upload.storagePath}.part.${part.partNumber}`;
      try {
        await this.minio!.removeObject(this.bucket, partKey);
      } catch (cleanupError: any) {
        logger.warn('Failed to cleanup part object', {
          partKey,
          error: cleanupError.message
        });
      }
    }
  }

  private async calculateUploadHash(upload: MultipartUpload, parts: UploadPart[]): Promise<string> {
    // Calculate hash by combining part checksums
    const sortedParts = parts.sort((a, b) => a.partNumber - b.partNumber);
    const combinedChecksum = sortedParts.map(p => p.checksum).join('');
    return crypto.createHash('sha256').update(combinedChecksum).digest('hex');
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export const multipartUploadService = new MultipartUploadService();
export default multipartUploadService;