import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaClient, StoredFile, StorageClass } from '@prisma/client';
import * as crypto from 'crypto';
import { storageConfig } from '../config/storage';

/**
 * Cloud Storage Service - Enterprise-grade file storage with S3/MinIO support
 * Handles uploads, downloads, versioning, deduplication, and lifecycle management
 */
export class CloudStorageService {
  private s3Client: S3Client;
  private prisma: PrismaClient;
  private bucket: string;

  constructor() {
    this.prisma = new PrismaClient();
    this.bucket = storageConfig.provider.bucket;
    this.initializeClient();
  }

  /**
   * Initialize S3 client for both S3 and MinIO
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
   * Upload a file to cloud storage
   */
  async uploadFile(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    options?: {
      storageClass?: StorageClass;
      metadata?: Record<string, string>;
      documentType?: string;
      documentId?: string;
    }
  ): Promise<StoredFile> {
    try {
      // Validate file size
      const maxSize = 5 * 1024 * 1024 * 1024; // 5GB
      if (buffer.length > maxSize) {
        throw new Error('File size exceeds maximum limit');
      }

      // Calculate checksum
      const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

      // Generate storage key
      const timestamp = Date.now();
      const extension = fileName.split('.').pop();
      const storageKey = `files/${timestamp}-${fileName}`;

      // Upload to S3/MinIO
      const putCommand = new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        Body: buffer,
        ContentType: mimeType,
        StorageClass: options?.storageClass || StorageClass.STANDARD,
        Metadata: options?.metadata,
        ServerSideEncryption: storageConfig.enableEncryption ? 'AES256' : undefined,
      });

      const result = await this.s3Client.send(putCommand);

      // Create database record
      const storedFile = await this.prisma.storedFile.create({
        data: {
          fileName,
          originalName: fileName,
          mimeType,
          size: buffer.length,
          checksum,
          storageKey,
          storageClass: options?.storageClass || StorageClass.STANDARD,
          provider: storageConfig.provider.type === 's3' ? 'S3' : 'MINIO',
          bucket: this.bucket,
          region: storageConfig.provider.region,
          encrypted: storageConfig.enableEncryption || false,
          metadata: options?.metadata,
        },
      });

      return storedFile;
    } catch (error: any) {
      throw new Error(`Failed to upload file to cloud storage: ${error.message}`);
    }
  }

  /**
   * Download a file from cloud storage
   */
  async downloadFile(
    fileId: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<Buffer> {
    try {
      // Get file record
      const storedFile = await this.prisma.storedFile.findUnique({
        where: { id: fileId },
      });

      if (!storedFile) {
        throw new Error('File not found');
      }

      // Download from S3/MinIO
      const getCommand = new GetObjectCommand({
        Bucket: storedFile.bucket,
        Key: storedFile.storageKey,
      });

      const result = await this.s3Client.send(getCommand);

      if (!result.Body) {
        throw new Error('File content not found');
      }

      const buffer = Buffer.from(await result.Body.transformToByteArray());

      // Log access if userId provided
      if (userId) {
        await this.prisma.fileAccessLog.create({
          data: {
            fileId,
            userId,
            action: 'DOWNLOAD',
            ipAddress,
            userAgent,
          },
        });
      }

      return buffer;
    } catch (error: any) {
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  /**
   * Generate a signed URL for file access
   */
  async generateSignedUrl(
    fileIdOrKey: string,
    action: 'upload' | 'download',
    expirationTime: number = 3600
  ): Promise<string> {
    try {
      let key: string;

      // If it looks like a file ID, get the storage key
      if (fileIdOrKey.length < 50) {
        const storedFile = await this.prisma.storedFile.findUnique({
          where: { id: fileIdOrKey },
        });

        if (!storedFile) {
          throw new Error('File not found');
        }

        key = storedFile.storageKey;
      } else {
        key = fileIdOrKey;
      }

      const command = action === 'upload'
        ? new PutObjectCommand({ Bucket: this.bucket, Key: key })
        : new GetObjectCommand({ Bucket: this.bucket, Key: key });

      return await getSignedUrl(this.s3Client, command, { expiresIn: expirationTime });
    } catch (error: any) {
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  /**
   * Delete a file from cloud storage
   */
  async deleteFile(fileId: string, permanent: boolean = false): Promise<void> {
    try {
      const storedFile = await this.prisma.storedFile.findUnique({
        where: { id: fileId },
      });

      if (!storedFile) {
        throw new Error('File not found');
      }

      if (permanent) {
        // Delete from S3/MinIO
        const deleteCommand = new DeleteObjectCommand({
          Bucket: storedFile.bucket,
          Key: storedFile.storageKey,
        });

        await this.s3Client.send(deleteCommand);

        // Delete database record
        await this.prisma.storedFile.delete({
          where: { id: fileId },
        });
      } else {
        // Soft delete
        await this.prisma.storedFile.update({
          where: { id: fileId },
          data: { deletedAt: new Date() },
        });
      }
    } catch (error: any) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Copy a file within storage
   */
  async copyFile(sourceFileId: string, destinationKey: string): Promise<StoredFile> {
    try {
      const sourceFile = await this.prisma.storedFile.findUnique({
        where: { id: sourceFileId },
      });

      if (!sourceFile) {
        throw new Error('Source file not found');
      }

      // Copy in S3/MinIO
      const copyCommand = new CopyObjectCommand({
        Bucket: this.bucket,
        Key: destinationKey,
        CopySource: `${sourceFile.bucket}/${sourceFile.storageKey}`,
      });

      await this.s3Client.send(copyCommand);

      // Create new database record
      const newFile = await this.prisma.storedFile.create({
        data: {
          fileName: sourceFile.fileName,
          originalName: sourceFile.originalName,
          mimeType: sourceFile.mimeType,
          size: sourceFile.size,
          checksum: sourceFile.checksum,
          storageKey: destinationKey,
          storageClass: sourceFile.storageClass,
          provider: sourceFile.provider,
          bucket: this.bucket,
          region: sourceFile.region,
          encrypted: sourceFile.encrypted,
          metadata: sourceFile.metadata,
        },
      });

      return newFile;
    } catch (error: any) {
      throw new Error(`Failed to copy file: ${error.message}`);
    }
  }

  /**
   * Move a file to a new location
   */
  async moveFile(fileId: string, newKey: string): Promise<StoredFile> {
    try {
      // Copy to new location
      const copiedFile = await this.copyFile(fileId, newKey);

      // Delete original
      await this.deleteFile(fileId, true);

      // Update the copied file's ID to match original
      const updatedFile = await this.prisma.storedFile.update({
        where: { id: copiedFile.id },
        data: { storageKey: newKey },
      });

      return updatedFile;
    } catch (error: any) {
      throw new Error(`Failed to move file: ${error.message}`);
    }
  }

  /**
   * Find duplicate files by checksum
   */
  async checkDuplicates(checksum: string): Promise<Array<{
    id: string;
    fileName: string;
    checksum: string;
    size: number;
    createdAt: Date;
  }>> {
    return await this.prisma.storedFile.findMany({
      where: {
        checksum,
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
  }

  /**
   * Get storage statistics
   */
  async getStorageStatistics(): Promise<{
    totalFiles: number;
    totalSize: number;
    totalSizeFormatted: string;
    filesByProvider: Record<string, number>;
    filesByStorageClass: Record<string, number>;
    averageFileSize: number;
    averageFileSizeFormatted: string;
  }> {
    try {
      // Get total counts and size
      const totalFiles = await this.prisma.storedFile.count({
        where: { deletedAt: null },
      });

      const aggregation = await this.prisma.storedFile.aggregate({
        where: { deletedAt: null },
        _sum: { size: true },
      });

      const totalSize = aggregation._sum.size || 0;

      // Get files by provider
      const providerStats = await this.prisma.storedFile.groupBy({
        by: ['provider'],
        where: { deletedAt: null },
        _count: { id: true },
      });

      const filesByProvider: Record<string, number> = {};
      providerStats.forEach(stat => {
        filesByProvider[stat.provider] = stat._count.id;
      });

      // Get files by storage class
      const storageClassStats = await this.prisma.storedFile.groupBy({
        by: ['storageClass'],
        where: { deletedAt: null },
        _count: { id: true },
      });

      const filesByStorageClass: Record<string, number> = {};
      storageClassStats.forEach(stat => {
        filesByStorageClass[stat.storageClass] = stat._count.id;
      });

      const averageFileSize = totalFiles > 0 ? totalSize / totalFiles : 0;

      return {
        totalFiles,
        totalSize,
        totalSizeFormatted: this.formatBytes(totalSize),
        filesByProvider,
        filesByStorageClass,
        averageFileSize,
        averageFileSizeFormatted: this.formatBytes(averageFileSize),
      };
    } catch (error: any) {
      throw new Error(`Failed to get storage statistics: ${error.message}`);
    }
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }
}