import * as AWS from 'aws-sdk';
import { Client as MinioClient } from 'minio';
import { PrismaClient, StoredFile, FileVersion, StorageClass, UploadMethod, CacheStatus } from '@prisma/client';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PassThrough } from 'stream';
import logger from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { storageConfig, StoragePathBuilder } from '../config/storage';

/**
 * TypeScript interfaces for Cloud Storage Operations
 */
export interface CloudFile {
  key: string;
  size: number;
  lastModified: Date;
  etag: string;
  storageClass?: StorageClass;
  metadata?: Record<string, string>;
}

export interface UploadOptions {
  filename: string;
  contentType?: string;
  metadata?: Record<string, string>;
  storageClass?: StorageClass;
  cacheControl?: string;
  documentType?: string;
  documentId?: string;
  attachmentType?: string;
  enableVersioning?: boolean;
  enableDeduplication?: boolean;
}

export interface DownloadOptions {
  expirationTime?: number; // seconds
  responseContentType?: string;
  responseContentDisposition?: string;
}

export interface MultipartUploadOptions {
  partSize?: number; // bytes
  queueSize?: number; // concurrent parts
  leavePartsOnError?: boolean;
}

export interface ListOptions {
  prefix?: string;
  maxKeys?: number;
  continuationToken?: string;
  delimiter?: string;
}

export interface StorageStats {
  totalFiles: number;
  totalSize: number;
  sizeByStorageClass: Record<StorageClass, number>;
  filesByType: Record<string, number>;
}

/**
 * Cloud Storage Service - Enterprise-grade file storage with S3/MinIO support
 * Handles uploads, downloads, versioning, deduplication, and lifecycle management
 */
class CloudStorageService {
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
   * Initialize the appropriate storage client based on configuration
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
        logger.info('S3 client initialized', { region: storageConfig.provider.region });
      } else if (storageConfig.provider.type === 'minio') {
        this.minio = new MinioClient({
          endPoint: storageConfig.provider.endpoint!,
          port: storageConfig.provider.port,
          useSSL: storageConfig.provider.useSSL,
          accessKey: storageConfig.provider.accessKey,
          secretKey: storageConfig.provider.secretKey,
        });
        logger.info('MinIO client initialized', { endpoint: storageConfig.provider.endpoint });
      }
    } catch (error: any) {
      logger.error('Failed to initialize storage client', { error: error.message });
      throw new AppError('Storage client initialization failed', 500, 'STORAGE_INIT_FAILED', error);
    }
  }

  /**
   * Upload a file to cloud storage with deduplication and versioning
   */
  async uploadFile(
    filePath: string | Buffer,
    options: UploadOptions
  ): Promise<StoredFile> {
    try {
      logger.info('Starting file upload', { filename: options.filename });

      // Read file content and calculate hash for deduplication
      const fileContent = Buffer.isBuffer(filePath)
        ? filePath
        : await fs.readFile(filePath);
      const fileHash = crypto.createHash('sha256').update(fileContent).digest('hex');
      const fileSize = fileContent.length;

      // Check for existing file with same hash (deduplication)
      let existingFile: StoredFile | null = null;
      if (options.enableDeduplication !== false) {
        existingFile = await this.prisma.storedFile.findFirst({
          where: { fileHash }
        });

        if (existingFile) {
          logger.info('File already exists, creating reference', {
            fileHash,
            existingFileId: existingFile.id
          });

          // Increment reference count and create new record
          await this.prisma.storedFile.update({
            where: { id: existingFile.id },
            data: { deduplicationRefs: { increment: 1 } }
          });

          // Create new record pointing to existing file
          const newFileRecord = await this.prisma.storedFile.create({
            data: {
              fileName: options.filename,
              originalFileName: options.filename,
              fileSize,
              mimeType: options.contentType || 'application/octet-stream',
              fileHash,
              storagePath: existingFile.storagePath,
              storageProvider: storageConfig.provider.type.toUpperCase() as any,
              bucket: this.bucket,
              storageClass: options.storageClass || StorageClass.HOT,
              uploadMethod: UploadMethod.DIRECT,
              cacheStatus: CacheStatus.NOT_CACHED,
              uploadedById: 'system', // TODO: Get from context
              uploadedByName: 'System', // TODO: Get from context
              documentType: options.documentType,
              documentId: options.documentId,
              attachmentType: options.attachmentType as any,
              originalFileId: existingFile.id,
              metadata: options.metadata || {},
            }
          });

          return newFileRecord;
        }
      }

      // Generate storage path
      const storagePath = this.generateStoragePath(options);

      // Upload to cloud storage
      const uploadResult = await this.performUpload(fileContent, storagePath, options);

      // Create database record
      const storedFile = await this.prisma.storedFile.create({
        data: {
          fileName: options.filename,
          originalFileName: options.filename,
          fileSize,
          mimeType: options.contentType || 'application/octet-stream',
          fileHash,
          storagePath,
          storageProvider: storageConfig.provider.type.toUpperCase() as any,
          bucket: this.bucket,
          storageClass: options.storageClass || StorageClass.HOT,
          uploadMethod: fileSize > storageConfig.upload.chunkSize
            ? UploadMethod.MULTIPART
            : UploadMethod.DIRECT,
          cacheStatus: CacheStatus.NOT_CACHED,
          uploadedById: 'system', // TODO: Get from context
          uploadedByName: 'System', // TODO: Get from context
          documentType: options.documentType,
          documentId: options.documentId,
          attachmentType: options.attachmentType as any,
          metadata: {
            ...options.metadata,
            etag: uploadResult.etag,
            bucket: this.bucket,
          },
        }
      });

      // Create initial version if versioning is enabled
      if (options.enableVersioning !== false) {
        await this.createFileVersion(storedFile.id, 'CREATE', 'Initial upload');
      }

      logger.info('File uploaded successfully', {
        fileId: storedFile.id,
        storagePath,
        size: fileSize
      });

      return storedFile;
    } catch (error: any) {
      logger.error('File upload failed', { error: error.message, filename: options.filename });
      throw new AppError('File upload failed', 500, 'UPLOAD_FAILED', error);
    }
  }

  /**
   * Download a file from cloud storage
   */
  async downloadFile(
    fileId: string,
    options: DownloadOptions = {}
  ): Promise<{ stream: NodeJS.ReadableStream; metadata: any }> {
    try {
      logger.info('Starting file download', { fileId });

      // Get file record
      const storedFile = await this.prisma.storedFile.findUnique({
        where: { id: fileId }
      });

      if (!storedFile) {
        throw new AppError('File not found', 404, 'FILE_NOT_FOUND');
      }

      // Log access
      await this.logFileAccess(fileId, 'DOWNLOAD');

      // Generate download stream
      const stream = await this.getFileStream(storedFile.storagePath, options);

      logger.info('File download initiated', { fileId, storagePath: storedFile.storagePath });

      return {
        stream,
        metadata: {
          filename: storedFile.fileName,
          contentType: storedFile.mimeType,
          size: storedFile.fileSize,
          ...(storedFile.metadata as Record<string, any>)
        }
      };
    } catch (error: any) {
      logger.error('File download failed', { error: error.message, fileId });
      throw new AppError('File download failed', 500, 'DOWNLOAD_FAILED', error);
    }
  }

  /**
   * Generate a signed URL for direct access
   */
  async generateSignedUrl(
    fileId: string,
    operation: 'get' | 'put' = 'get',
    expirationTime?: number
  ): Promise<string> {
    try {
      const storedFile = await this.prisma.storedFile.findUnique({
        where: { id: fileId }
      });

      if (!storedFile) {
        throw new AppError('File not found', 404, 'FILE_NOT_FOUND');
      }

      const expiration = expirationTime || storageConfig.security.signedUrlExpirationMinutes * 60;

      let signedUrl: string;

      if (this.s3) {
        const params = {
          Bucket: this.bucket,
          Key: storedFile.storagePath,
          Expires: expiration,
        };
        signedUrl = this.s3.getSignedUrl(operation === 'get' ? 'getObject' : 'putObject', params);
      } else if (this.minio) {
        signedUrl = await this.minio.presignedUrl(
          operation === 'get' ? 'GET' : 'PUT',
          this.bucket,
          storedFile.storagePath,
          expiration
        );
      } else {
        throw new AppError('No storage client available', 500, 'NO_CLIENT');
      }

      // Log access for signed URLs
      if (operation === 'get') {
        await this.logFileAccess(fileId, 'SIGNED_URL');
      }

      logger.info('Signed URL generated', { fileId, operation, expiration });
      return signedUrl;
    } catch (error: any) {
      logger.error('Signed URL generation failed', { error: error.message, fileId });
      throw new AppError('Signed URL generation failed', 500, 'SIGNED_URL_FAILED', error);
    }
  }

  /**
   * Delete a file from cloud storage and database
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      logger.info('Starting file deletion', { fileId });

      const storedFile = await this.prisma.storedFile.findUnique({
        where: { id: fileId },
        include: { duplicateFiles: true }
      });

      if (!storedFile) {
        throw new AppError('File not found', 404, 'FILE_NOT_FOUND');
      }

      // Handle deduplication - only delete from storage if no other references
      if (storedFile.originalFileId) {
        // This is a duplicate, just delete the record and decrement reference count
        await this.prisma.storedFile.delete({ where: { id: fileId } });

        await this.prisma.storedFile.update({
          where: { id: storedFile.originalFileId },
          data: { deduplicationRefs: { decrement: 1 } }
        });
      } else if (storedFile.duplicateFiles.length > 0) {
        // This is an original with duplicates, transfer ownership to first duplicate
        const newOwner = storedFile.duplicateFiles[0];

        // Update all duplicates to point to new owner
        await this.prisma.storedFile.updateMany({
          where: { originalFileId: fileId },
          data: { originalFileId: newOwner.id }
        });

        // Update new owner to have no original file reference
        await this.prisma.storedFile.update({
          where: { id: newOwner.id },
          data: { originalFileId: null }
        });

        // Delete the current record
        await this.prisma.storedFile.delete({ where: { id: fileId } });
      } else {
        // No duplicates, safe to delete from storage
        await this.deleteFromStorage(storedFile.storagePath);
        await this.prisma.storedFile.delete({ where: { id: fileId } });
      }

      logger.info('File deleted successfully', { fileId });
    } catch (error: any) {
      logger.error('File deletion failed', { error: error.message, fileId });
      throw new AppError('File deletion failed', 500, 'DELETE_FAILED', error);
    }
  }

  /**
   * List files with filtering and pagination
   */
  async listFiles(options: {
    documentType?: string;
    documentId?: string;
    storageClass?: StorageClass;
    limit?: number;
    offset?: number;
    orderBy?: 'createdAt' | 'filename' | 'fileSize';
    orderDirection?: 'asc' | 'desc';
  } = {}): Promise<{ files: StoredFile[]; total: number }> {
    try {
      const whereClause: any = {};

      if (options.documentType) {
        whereClause.documentType = options.documentType;
      }
      if (options.documentId) {
        whereClause.documentId = options.documentId;
      }
      if (options.storageClass) {
        whereClause.storageClass = options.storageClass;
      }

      const [files, total] = await Promise.all([
        this.prisma.storedFile.findMany({
          where: whereClause,
          take: options.limit,
          skip: options.offset,
          orderBy: {
            [options.orderBy || 'createdAt']: options.orderDirection || 'desc'
          }
        }),
        this.prisma.storedFile.count({ where: whereClause })
      ]);

      return { files, total };
    } catch (error: any) {
      logger.error('File listing failed', { error: error.message });
      throw new AppError('File listing failed', 500, 'LIST_FAILED', error);
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<StorageStats> {
    try {
      const [files, totalSize, storageClassStats] = await Promise.all([
        this.prisma.storedFile.count(),
        this.prisma.storedFile.aggregate({
          _sum: { fileSize: true }
        }),
        this.prisma.storedFile.groupBy({
          by: ['storageClass'],
          _sum: { fileSize: true },
          _count: true
        })
      ]);

      const sizeByStorageClass: Record<StorageClass, number> = {
        [StorageClass.HOT]: 0,
        [StorageClass.WARM]: 0,
        [StorageClass.COLD]: 0,
        [StorageClass.ARCHIVE]: 0,
      };

      const filesByType: Record<string, number> = {};

      storageClassStats.forEach(stat => {
        sizeByStorageClass[stat.storageClass] = stat._sum.fileSize || 0;
      });

      // Get file type distribution
      const typeStats = await this.prisma.storedFile.groupBy({
        by: ['contentType'],
        _count: true
      });

      typeStats.forEach(stat => {
        filesByType[stat.contentType] = stat._count;
      });

      return {
        totalFiles: files,
        totalSize: totalSize._sum.fileSize || 0,
        sizeByStorageClass,
        filesByType
      };
    } catch (error: any) {
      logger.error('Storage stats failed', { error: error.message });
      throw new AppError('Storage stats failed', 500, 'STATS_FAILED', error);
    }
  }

  /**
   * Private helper methods
   */

  private generateStoragePath(options: UploadOptions): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const randomId = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(options.filename);
    const baseName = path.basename(options.filename, ext);

    if (options.documentType && options.documentId) {
      return StoragePathBuilder.buildDocumentPath(
        options.documentType,
        options.documentId,
        `${baseName}-${randomId}${ext}`
      );
    }

    return `files/${timestamp}/${randomId}/${options.filename}`;
  }

  private async performUpload(
    content: Buffer,
    storagePath: string,
    options: UploadOptions
  ): Promise<{ etag: string }> {
    const metadata = {
      'Content-Type': options.contentType || 'application/octet-stream',
      'Cache-Control': options.cacheControl || 'public, max-age=86400',
      ...options.metadata
    };

    if (this.s3) {
      const result = await this.s3.upload({
        Bucket: this.bucket,
        Key: storagePath,
        Body: content,
        ContentType: options.contentType,
        Metadata: options.metadata,
        StorageClass: this.mapStorageClass(options.storageClass),
        CacheControl: options.cacheControl,
      }).promise();

      return { etag: result.ETag || '' };
    } else if (this.minio) {
      const result = await this.minio.putObject(
        this.bucket,
        storagePath,
        content,
        content.length,
        metadata
      );

      return { etag: result.etag || '' };
    }

    throw new AppError('No storage client available', 500, 'NO_CLIENT');
  }

  private async getFileStream(
    storagePath: string,
    options: DownloadOptions
  ): Promise<NodeJS.ReadableStream> {
    if (this.s3) {
      const params: AWS.S3.GetObjectRequest = {
        Bucket: this.bucket,
        Key: storagePath,
      };

      if (options.responseContentType) {
        params.ResponseContentType = options.responseContentType;
      }
      if (options.responseContentDisposition) {
        params.ResponseContentDisposition = options.responseContentDisposition;
      }

      return this.s3.getObject(params).createReadStream();
    } else if (this.minio) {
      return await this.minio.getObject(this.bucket, storagePath);
    }

    throw new AppError('No storage client available', 500, 'NO_CLIENT');
  }

  private async deleteFromStorage(storagePath: string): Promise<void> {
    if (this.s3) {
      await this.s3.deleteObject({
        Bucket: this.bucket,
        Key: storagePath,
      }).promise();
    } else if (this.minio) {
      await this.minio.removeObject(this.bucket, storagePath);
    } else {
      throw new AppError('No storage client available', 500, 'NO_CLIENT');
    }
  }

  private mapStorageClass(storageClass?: StorageClass): string {
    if (!storageClass) return 'STANDARD';

    const mapping = {
      [StorageClass.HOT]: 'STANDARD',
      [StorageClass.WARM]: 'STANDARD_IA',
      [StorageClass.COLD]: 'GLACIER',
      [StorageClass.ARCHIVE]: 'DEEP_ARCHIVE',
    };

    return mapping[storageClass] || 'STANDARD';
  }

  private async createFileVersion(
    fileId: string,
    changeType: string,
    changeDescription?: string
  ): Promise<FileVersion> {
    const versions = await this.prisma.fileVersion.count({
      where: { fileId }
    });

    return this.prisma.fileVersion.create({
      data: {
        fileId,
        versionNumber: versions + 1,
        versionId: `v${versions + 1}`, // Generate version ID
        storagePath: 'temp-path', // TODO: Generate proper versioned path
        fileSize: 0, // TODO: Get from stored file
        fileHash: 'temp-hash', // TODO: Get from stored file
        mimeType: 'application/octet-stream', // TODO: Get from stored file
        changeType: changeType as any,
        changeDescription,
        createdById: 'system', // TODO: Get from context
        createdByName: 'System', // TODO: Get from context
      }
    });
  }

  private async logFileAccess(
    fileId: string,
    operation: string,
    userId?: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<void> {
    try {
      await this.prisma.fileAccessLog.create({
        data: {
          fileId,
          accessType: 'DOWNLOAD' as any, // TODO: Map operation to proper AccessType enum
          accessMethod: operation,
          userId: userId || 'anonymous',
          userAgent,
          ipAddress,
        }
      });
    } catch (error: any) {
      // Don't fail the main operation if logging fails
      logger.warn('Failed to log file access', { error: error.message, fileId, operation });
    }
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export const cloudStorageService = new CloudStorageService();
export default cloudStorageService;