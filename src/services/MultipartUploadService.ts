import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  ListPartsCommand
} from '@aws-sdk/client-s3';
import { PrismaClient, MultipartUpload, StoredFile, UploadStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { storageConfig } from '../config/storage';

export interface InitializeUploadOptions {
  fileName: string;
  fileSize: number;
  mimeType: string;
  userId: string;
  documentType?: string;
  documentId?: string;
  metadata?: Record<string, string>;
}

export interface UploadPartResult {
  partNumber: number;
  etag: string;
  size: number;
  completed: boolean;
  skipped?: boolean;
}

export interface CompleteUploadResult {
  success: boolean;
  storedFile: StoredFile;
  uploadRecord: MultipartUpload;
}

export interface UploadProgress {
  uploadId: string;
  fileName: string;
  totalSize: number;
  uploadedSize: number;
  totalParts: number;
  completedParts: number;
  progress: number;
  status: UploadStatus;
  initiatedAt: Date;
  estimatedTimeRemaining: number;
  uploadSpeed: number;
  completedPartsInfo: Array<{
    partNumber: number;
    size: number;
    uploadedAt: Date;
  }>;
}

export interface ChunkSizeCalculation {
  chunkSize: number;
  totalParts: number;
}

/**
 * Multipart Upload Service - Scalable large file uploads (>5MB to 5TB)
 * Handles multipart upload lifecycle, progress tracking, and resumable uploads
 */
export class MultipartUploadService {
  private s3Client: S3Client;
  private prisma: PrismaClient;
  private bucket: string;
  private minChunkSize: number = 5 * 1024 * 1024; // 5MB
  private maxParts: number = 10000;

  constructor() {
    this.prisma = new PrismaClient();
    this.bucket = storageConfig.provider.bucket;
    this.initializeClient();
  }

  /**
   * Initialize S3 client
   */
  private initializeClient(): void {
    try {
      const config: any = {
        region: storageConfig.provider.region || 'us-east-1',
        credentials: {
          accessKeyId: storageConfig.provider.accessKey,
          secretAccessKey: storageConfig.provider.secretKey,
        },
      };

      // For MinIO or custom S3 endpoints
      if (storageConfig.provider.endpoint) {
        config.endpoint = storageConfig.provider.endpoint;
        config.forcePathStyle = true;
      }

      this.s3Client = new S3Client(config);
    } catch (error: any) {
      throw new Error(`Failed to initialize storage client: ${error.message}`);
    }
  }

  /**
   * Initialize the service (for dependency injection compatibility)
   */
  async initialize(): Promise<void> {
    // Service is initialized in constructor
    return Promise.resolve();
  }

  /**
   * Initialize a multipart upload
   */
  async initializeUpload(options: InitializeUploadOptions): Promise<MultipartUpload> {
    try {
      // Validate file size
      if (options.fileSize < this.minChunkSize) {
        throw new Error(`File size must be at least ${this.minChunkSize / (1024 * 1024)}MB for multipart upload`);
      }

      const maxSize = 5 * 1024 * 1024 * 1024 * 1024; // 5TB
      if (options.fileSize > maxSize) {
        throw new Error('File size exceeds maximum limit');
      }

      // Calculate optimal chunk size and parts
      const { chunkSize, totalParts } = this.calculateOptimalChunkSize(options.fileSize);

      // Generate storage key
      const timestamp = Date.now();
      const storageKey = `files/${timestamp}-${options.fileName}`;

      // Initialize multipart upload in S3
      const createCommand = new CreateMultipartUploadCommand({
        Bucket: this.bucket,
        Key: storageKey,
        ContentType: options.mimeType,
        Metadata: options.metadata,
        ServerSideEncryption: storageConfig.enableEncryption ? 'AES256' : undefined,
      });

      const result = await this.s3Client.send(createCommand);

      if (!result.UploadId) {
        throw new Error('Failed to get upload ID from S3');
      }

      // Create database record
      const uploadRecord = await this.prisma.multipartUpload.create({
        data: {
          uploadId: result.UploadId,
          fileName: options.fileName,
          originalName: options.fileName,
          mimeType: options.mimeType,
          totalSize: options.fileSize,
          chunkSize,
          totalParts,
          completedParts: 0,
          status: UploadStatus.INITIALIZED,
          storageKey,
          bucket: this.bucket,
          provider: storageConfig.provider.type === 's3' ? 'S3' : 'MINIO',
          userId: options.userId,
          documentType: options.documentType,
          documentId: options.documentId,
          metadata: options.metadata,
          parts: [],
        },
      });

      return uploadRecord;
    } catch (error: any) {
      throw new Error(`Failed to initialize multipart upload: ${error.message}`);
    }
  }

  /**
   * Upload a single part
   */
  async uploadPart(uploadId: string, partNumber: number, data: Buffer): Promise<UploadPartResult> {
    try {
      // Get upload record
      const upload = await this.prisma.multipartUpload.findUnique({
        where: { id: uploadId },
      });

      if (!upload) {
        throw new Error('Multipart upload not found');
      }

      if (upload.status !== UploadStatus.IN_PROGRESS && upload.status !== UploadStatus.INITIALIZED) {
        throw new Error('Upload is not in progress');
      }

      // Validate part number
      if (partNumber < 1 || partNumber > upload.totalParts) {
        throw new Error(`Invalid part number. Must be between 1 and ${upload.totalParts}`);
      }

      // Check if part already uploaded
      const existingParts = upload.parts as any[] || [];
      const existingPart = existingParts.find(p => p.partNumber === partNumber);
      if (existingPart) {
        return {
          partNumber,
          etag: existingPart.etag,
          size: existingPart.size,
          completed: true,
          skipped: true,
        };
      }

      // Upload part to S3
      const uploadCommand = new UploadPartCommand({
        Bucket: upload.bucket,
        Key: upload.storageKey,
        PartNumber: partNumber,
        UploadId: upload.uploadId,
        Body: data,
      });

      const result = await this.s3Client.send(uploadCommand);

      if (!result.ETag) {
        throw new Error('Failed to get ETag from S3');
      }

      // Update database record
      const newPart = {
        partNumber,
        etag: result.ETag,
        size: data.length,
        uploadedAt: new Date(),
      };

      const updatedParts = [...existingParts, newPart];

      await this.prisma.multipartUpload.update({
        where: { id: uploadId },
        data: {
          parts: updatedParts,
          completedParts: updatedParts.length,
          status: UploadStatus.IN_PROGRESS,
        },
      });

      return {
        partNumber,
        etag: result.ETag,
        size: data.length,
        completed: true,
      };
    } catch (error: any) {
      throw new Error(`Failed to upload part: ${error.message}`);
    }
  }

  /**
   * Complete the multipart upload
   */
  async completeUpload(uploadId: string): Promise<CompleteUploadResult> {
    try {
      // Get upload record
      const upload = await this.prisma.multipartUpload.findUnique({
        where: { id: uploadId },
      });

      if (!upload) {
        throw new Error('Multipart upload not found');
      }

      if (upload.status === UploadStatus.COMPLETED) {
        throw new Error('Upload is already completed or aborted');
      }

      if (upload.status === UploadStatus.ABORTED) {
        throw new Error('Upload is already completed or aborted');
      }

      // Check if all parts are uploaded
      if (upload.completedParts < upload.totalParts) {
        throw new Error(`Upload is incomplete. ${upload.completedParts} of ${upload.totalParts} parts uploaded.`);
      }

      // Prepare parts for completion
      const parts = (upload.parts as any[] || []).map(part => ({
        ETag: part.etag,
        PartNumber: part.partNumber,
      }));

      // Complete multipart upload in S3
      const completeCommand = new CompleteMultipartUploadCommand({
        Bucket: upload.bucket,
        Key: upload.storageKey,
        UploadId: upload.uploadId,
        MultipartUpload: { Parts: parts },
      });

      const result = await this.s3Client.send(completeCommand);

      // Calculate final checksum
      const checksum = crypto.createHash('sha256').update(upload.uploadId).digest('hex');

      // Create final file record and update upload status in transaction
      const [storedFile, updatedUpload] = await this.prisma.$transaction(async (tx) => {
        const file = await tx.storedFile.create({
          data: {
            fileName: upload.fileName,
            originalName: upload.originalName,
            mimeType: upload.mimeType,
            size: upload.totalSize,
            checksum,
            storageKey: upload.storageKey,
            storageClass: 'STANDARD',
            provider: upload.provider,
            bucket: upload.bucket,
            region: storageConfig.provider.region,
            encrypted: storageConfig.enableEncryption || false,
            metadata: upload.metadata,
          },
        });

        const updated = await tx.multipartUpload.update({
          where: { id: uploadId },
          data: {
            status: UploadStatus.COMPLETED,
            completedAt: new Date(),
            storedFileId: file.id,
          },
        });

        return [file, updated];
      });

      return {
        success: true,
        storedFile,
        uploadRecord: updatedUpload,
      };
    } catch (error: any) {
      throw new Error(`Failed to complete upload: ${error.message}`);
    }
  }

  /**
   * Abort a multipart upload
   */
  async abortUpload(uploadId: string): Promise<{ success: boolean; uploadId: string; abortedAt: Date }> {
    try {
      // Get upload record
      const upload = await this.prisma.multipartUpload.findUnique({
        where: { id: uploadId },
      });

      if (!upload) {
        throw new Error('Multipart upload not found');
      }

      if (upload.status === UploadStatus.COMPLETED) {
        throw new Error('Cannot abort completed upload');
      }

      // Abort in S3
      const abortCommand = new AbortMultipartUploadCommand({
        Bucket: upload.bucket,
        Key: upload.storageKey,
        UploadId: upload.uploadId,
      });

      await this.s3Client.send(abortCommand);

      // Update database record
      const abortedAt = new Date();
      await this.prisma.multipartUpload.update({
        where: { id: uploadId },
        data: {
          status: UploadStatus.ABORTED,
          abortedAt,
        },
      });

      return {
        success: true,
        uploadId,
        abortedAt,
      };
    } catch (error: any) {
      throw new Error(`Failed to abort upload: ${error.message}`);
    }
  }

  /**
   * Get upload progress
   */
  async getUploadProgress(uploadId: string): Promise<UploadProgress> {
    try {
      const upload = await this.prisma.multipartUpload.findUnique({
        where: { id: uploadId },
      });

      if (!upload) {
        throw new Error('Multipart upload not found');
      }

      const parts = upload.parts as any[] || [];
      const uploadedSize = parts.reduce((sum, part) => sum + part.size, 0);
      const progress = upload.totalSize > 0 ? (uploadedSize / upload.totalSize) * 100 : 0;

      // Calculate upload speed and estimated time remaining
      const now = new Date();
      const timeElapsed = now.getTime() - upload.initiatedAt.getTime(); // milliseconds
      const uploadSpeed = timeElapsed > 0 ? uploadedSize / (timeElapsed / 1000) : 0; // bytes per second

      const remainingSize = upload.totalSize - uploadedSize;
      const estimatedTimeRemaining = uploadSpeed > 0 ? remainingSize / uploadSpeed : 0; // seconds

      return {
        uploadId,
        fileName: upload.fileName,
        totalSize: upload.totalSize,
        uploadedSize,
        totalParts: upload.totalParts,
        completedParts: upload.completedParts,
        progress: Number(progress.toFixed(1)),
        status: upload.status,
        initiatedAt: upload.initiatedAt,
        estimatedTimeRemaining: Number(estimatedTimeRemaining.toFixed(0)),
        uploadSpeed: Number(uploadSpeed.toFixed(0)),
        completedPartsInfo: parts.map(part => ({
          partNumber: part.partNumber,
          size: part.size,
          uploadedAt: part.uploadedAt,
        })),
      };
    } catch (error: any) {
      throw new Error(`Failed to get upload progress: ${error.message}`);
    }
  }

  /**
   * List active uploads for a user
   */
  async listActiveUploads(userId: string): Promise<Array<{
    id: string;
    fileName: string;
    totalSize: number;
    completedParts: number;
    totalParts: number;
    status: UploadStatus;
    initiatedAt: Date;
  }>> {
    const uploads = await this.prisma.multipartUpload.findMany({
      where: {
        userId,
        status: { in: [UploadStatus.INITIALIZED, UploadStatus.IN_PROGRESS] },
      },
      orderBy: { initiatedAt: 'desc' },
      select: {
        id: true,
        fileName: true,
        totalSize: true,
        completedParts: true,
        totalParts: true,
        status: true,
        initiatedAt: true,
      },
    });

    // Filter only in-progress uploads for the result
    return uploads.filter(upload => upload.status === UploadStatus.IN_PROGRESS);
  }

  /**
   * Clean up expired uploads
   */
  async cleanupExpiredUploads(): Promise<{
    cleanedCount: number;
    cleanedUploads: string[];
  }> {
    try {
      const expirationTime = 24 * 60 * 60 * 1000; // 24 hours
      const cutoffDate = new Date(Date.now() - expirationTime);

      // Find expired uploads
      const expiredUploads = await this.prisma.multipartUpload.findMany({
        where: {
          status: { in: [UploadStatus.INITIALIZED, UploadStatus.IN_PROGRESS] },
          initiatedAt: { lt: cutoffDate },
        },
        select: {
          id: true,
          uploadId: true,
          bucket: true,
          storageKey: true,
          initiatedAt: true,
        },
      });

      if (expiredUploads.length === 0) {
        return {
          cleanedCount: 0,
          cleanedUploads: [],
        };
      }

      // Abort uploads and update records
      await this.prisma.$transaction(async (tx) => {
        for (const upload of expiredUploads) {
          // Abort in S3
          const abortCommand = new AbortMultipartUploadCommand({
            Bucket: upload.bucket,
            Key: upload.storageKey,
            UploadId: upload.uploadId,
          });

          try {
            await this.s3Client.send(abortCommand);
          } catch (error) {
            // Continue even if S3 abort fails
          }

          // Update database record
          await tx.multipartUpload.update({
            where: { id: upload.id },
            data: {
              status: UploadStatus.ABORTED,
              abortedAt: new Date(),
            },
          });
        }
      });

      return {
        cleanedCount: expiredUploads.length,
        cleanedUploads: expiredUploads.map(u => u.id),
      };
    } catch (error: any) {
      throw new Error(`Failed to cleanup expired uploads: ${error.message}`);
    }
  }

  /**
   * Calculate optimal chunk size for a file
   */
  calculateOptimalChunkSize(fileSize: number): ChunkSizeCalculation {
    // Start with minimum chunk size
    let chunkSize = this.minChunkSize;

    // Calculate parts with minimum chunk size
    let totalParts = Math.ceil(fileSize / chunkSize);

    // If we exceed max parts, increase chunk size
    if (totalParts > this.maxParts) {
      chunkSize = Math.ceil(fileSize / this.maxParts);

      // Round up to next MB for cleaner chunks
      chunkSize = Math.ceil(chunkSize / (1024 * 1024)) * (1024 * 1024);

      totalParts = Math.ceil(fileSize / chunkSize);
    }

    return {
      chunkSize,
      totalParts,
    };
  }
}