import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { cloudStorageService } from './CloudStorageService';
import { multipartUploadService } from './MultipartUploadService';
import { fileDeduplicationService } from './FileDeduplicationService';
import { fileVersioningService } from './FileVersioningService';
import { storageConfig } from '../config/storage';
import { StoredFile } from '@prisma/client';

// Configuration
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB default
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

// Enhanced types for cloud storage integration
export interface EnhancedUploadOptions {
  enableCloudStorage?: boolean;
  enableDeduplication?: boolean;
  enableVersioning?: boolean;
  enableMultipart?: boolean;
  documentType?: string;
  documentId?: string;
  attachmentType?: string;
  userId?: string;
  userName?: string;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  // Legacy fields for backward compatibility
  fileUrl?: string;
  filename?: string;
  mimetype?: string;
  size?: number;

  // Enhanced fields for cloud storage
  storedFile?: StoredFile;
  isCloudStored: boolean;
  fileId?: string;
  isDuplicate?: boolean;
  uploadMethod?: 'local' | 'cloud_direct' | 'cloud_multipart';
  deduplicationSavings?: number;
  downloadUrl?: string;
}

export interface MultipleUploadResult {
  results: UploadResult[];
  totalSize: number;
  cloudStoredCount: number;
  localStoredCount: number;
  duplicateCount: number;
  errors: Array<{ filename: string; error: string }>;
}

export class FileUploadService {
  private storage: multer.StorageEngine;

  constructor() {
    // Configure multer storage
    this.storage = multer.diskStorage({
      destination: async (req, file, cb) => {
        const uploadPath = path.join(UPLOAD_DIR, this.getFileCategoryPath(file.mimetype));

        try {
          await fs.mkdir(uploadPath, { recursive: true });
          cb(null, uploadPath);
        } catch (error) {
          logger.error('Error creating upload directory:', error);
          cb(error as Error, uploadPath);
        }
      },
      filename: (req, file, cb) => {
        const uniqueId = uuidv4();
        const ext = path.extname(file.originalname);
        const filename = `${uniqueId}${ext}`;
        cb(null, filename);
      },
    });
  }

  /**
   * Get category-based subdirectory for file
   */
  private getFileCategoryPath(mimetype: string): string {
    if (ALLOWED_IMAGE_TYPES.includes(mimetype)) {
      return 'images';
    } else if (ALLOWED_VIDEO_TYPES.includes(mimetype)) {
      return 'videos';
    } else if (ALLOWED_DOCUMENT_TYPES.includes(mimetype)) {
      return 'documents';
    }
    return 'others';
  }

  /**
   * File filter function for multer
   */
  private fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = [
      ...ALLOWED_IMAGE_TYPES,
      ...ALLOWED_VIDEO_TYPES,
      ...ALLOWED_DOCUMENT_TYPES,
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      logger.warn(`File type not allowed: ${file.mimetype}`, {
        filename: file.originalname,
        mimetype: file.mimetype,
      });
      cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
  };

  /**
   * Get multer upload middleware
   */
  getUploadMiddleware(fieldName: string = 'file', maxCount: number = 10) {
    return multer({
      storage: this.storage,
      fileFilter: this.fileFilter,
      limits: {
        fileSize: MAX_FILE_SIZE,
        files: maxCount,
      },
    });
  }

  /**
   * Upload single file
   */
  uploadSingle(fieldName: string = 'file') {
    return this.getUploadMiddleware(fieldName, 1).single(fieldName);
  }

  /**
   * Upload multiple files
   */
  uploadMultiple(fieldName: string = 'files', maxCount: number = 10) {
    return this.getUploadMiddleware(fieldName, maxCount).array(fieldName, maxCount);
  }

  /**
   * Get file URL from uploaded file
   */
  getFileUrl(file: Express.Multer.File): string {
    const relativePath = file.path.replace(UPLOAD_DIR, '');
    return `/uploads${relativePath}`;
  }

  /**
   * Get multiple file URLs
   */
  getFileUrls(files: Express.Multer.File[]): string[] {
    return files.map(file => this.getFileUrl(file));
  }

  /**
   * Delete file by URL
   */
  async deleteFile(fileUrl: string): Promise<void> {
    try {
      const filePath = path.join(UPLOAD_DIR, fileUrl.replace('/uploads', ''));
      await fs.unlink(filePath);
      logger.info(`File deleted: ${fileUrl}`);
    } catch (error) {
      logger.error(`Error deleting file ${fileUrl}:`, error);
      throw error;
    }
  }

  /**
   * Delete multiple files by URLs
   */
  async deleteFiles(fileUrls: string[]): Promise<void> {
    try {
      await Promise.all(fileUrls.map(url => this.deleteFile(url)));
      logger.info(`Deleted ${fileUrls.length} files`);
    } catch (error) {
      logger.error('Error deleting files:', error);
      throw error;
    }
  }

  /**
   * Validate uploaded file
   */
  validateFile(file: Express.Multer.File): { valid: boolean; error?: string } {
    if (!file) {
      return { valid: false, error: 'No file provided' };
    }

    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`
      };
    }

    const allowedTypes = [
      ...ALLOWED_IMAGE_TYPES,
      ...ALLOWED_VIDEO_TYPES,
      ...ALLOWED_DOCUMENT_TYPES,
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: `File type ${file.mimetype} is not allowed`
      };
    }

    return { valid: true };
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(fileUrl: string): Promise<{
    size: number;
    mimetype: string;
    filename: string;
    createdAt: Date;
  } | null> {
    try {
      const filePath = path.join(UPLOAD_DIR, fileUrl.replace('/uploads', ''));
      const stats = await fs.stat(filePath);
      const filename = path.basename(filePath);

      // Determine mimetype from extension (simplified)
      const ext = path.extname(filename).toLowerCase();
      let mimetype = 'application/octet-stream';

      if (['.jpg', '.jpeg'].includes(ext)) mimetype = 'image/jpeg';
      else if (ext === '.png') mimetype = 'image/png';
      else if (ext === '.gif') mimetype = 'image/gif';
      else if (ext === '.webp') mimetype = 'image/webp';
      else if (ext === '.mp4') mimetype = 'video/mp4';
      else if (ext === '.webm') mimetype = 'video/webm';
      else if (ext === '.mov') mimetype = 'video/quicktime';
      else if (ext === '.pdf') mimetype = 'application/pdf';

      return {
        size: stats.size,
        mimetype,
        filename,
        createdAt: stats.birthtime,
      };
    } catch (error) {
      logger.error(`Error getting file metadata for ${fileUrl}:`, error);
      return null;
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(fileUrl: string): Promise<boolean> {
    try {
      const filePath = path.join(UPLOAD_DIR, fileUrl.replace('/uploads', ''));
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Enhanced upload method with cloud storage support
   */
  async uploadFileEnhanced(
    file: Express.Multer.File,
    options: EnhancedUploadOptions = {}
  ): Promise<UploadResult> {
    try {
      const validation = this.validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const useCloudStorage = options.enableCloudStorage ??
        (process.env.CLOUD_STORAGE_ENABLED === 'true');

      if (useCloudStorage) {
        return await this.uploadToCloudStorage(file, options);
      } else {
        return await this.uploadToLocalStorage(file, options);
      }
    } catch (error: any) {
      logger.error('Enhanced file upload failed:', {
        filename: file.originalname,
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Upload multiple files with enhanced features
   */
  async uploadMultipleEnhanced(
    files: Express.Multer.File[],
    options: EnhancedUploadOptions = {}
  ): Promise<MultipleUploadResult> {
    const result: MultipleUploadResult = {
      results: [],
      totalSize: 0,
      cloudStoredCount: 0,
      localStoredCount: 0,
      duplicateCount: 0,
      errors: []
    };

    for (const file of files) {
      try {
        const uploadResult = await this.uploadFileEnhanced(file, options);
        result.results.push(uploadResult);
        result.totalSize += file.size;

        if (uploadResult.isCloudStored) {
          result.cloudStoredCount++;
        } else {
          result.localStoredCount++;
        }

        if (uploadResult.isDuplicate) {
          result.duplicateCount++;
        }
      } catch (error: any) {
        result.errors.push({
          filename: file.originalname,
          error: error.message
        });
      }
    }

    logger.info('Multiple file upload completed', {
      totalFiles: files.length,
      successful: result.results.length,
      errors: result.errors.length,
      cloudStored: result.cloudStoredCount,
      localStored: result.localStoredCount,
      duplicates: result.duplicateCount
    });

    return result;
  }

  /**
   * Upload to cloud storage with advanced features
   */
  private async uploadToCloudStorage(
    file: Express.Multer.File,
    options: EnhancedUploadOptions
  ): Promise<UploadResult> {
    try {
      const fileContent = await fs.readFile(file.path);
      const isLargeFile = file.size > storageConfig.upload.chunkSize;

      let storedFile: StoredFile;
      let uploadMethod: 'cloud_direct' | 'cloud_multipart' = 'cloud_direct';

      // Check for deduplication first
      let isDuplicate = false;
      let deduplicationSavings = 0;

      if (options.enableDeduplication !== false) {
        const fileHash = await fileDeduplicationService.calculateFileHash(fileContent);
        const duplicationResult = await fileDeduplicationService.checkForDuplicate(fileHash);

        if (duplicationResult.isDuplicate) {
          isDuplicate = true;
          deduplicationSavings = duplicationResult.spacesSaved;
        }
      }

      // Use multipart upload for large files
      if (isLargeFile && options.enableMultipart !== false) {
        uploadMethod = 'cloud_multipart';

        const multipartSession = await multipartUploadService.initializeUpload({
          fileName: file.originalname,
          fileSize: file.size,
          contentType: file.mimetype,
          documentType: options.documentType,
          documentId: options.documentId,
          attachmentType: options.attachmentType,
          uploadedById: options.userId || 'anonymous',
          uploadedByName: options.userName || 'Anonymous',
          metadata: options.metadata,
        });

        // For simplicity, upload as single part in this demo
        // In production, you'd split into chunks
        await multipartUploadService.uploadPart(
          multipartSession.uploadId,
          1,
          fileContent
        );

        const uploadResult = await multipartUploadService.completeUpload(
          multipartSession.uploadId
        );

        storedFile = await cloudStorageService.listFiles({
          limit: 1
        }).then(res => res.files[0]); // Get the uploaded file
      } else {
        // Direct upload to cloud storage
        storedFile = await cloudStorageService.uploadFile(fileContent, {
          filename: file.originalname,
          contentType: file.mimetype,
          documentType: options.documentType,
          documentId: options.documentId,
          attachmentType: options.attachmentType,
          enableDeduplication: options.enableDeduplication,
          enableVersioning: options.enableVersioning,
          metadata: options.metadata,
        });
      }

      // Generate download URL
      const downloadUrl = await cloudStorageService.generateSignedUrl(
        storedFile.id,
        'get',
        3600 // 1 hour
      );

      // Clean up temporary local file
      try {
        await fs.unlink(file.path);
      } catch (cleanupError) {
        logger.warn('Failed to cleanup temporary file:', {
          path: file.path,
          error: cleanupError
        });
      }

      return {
        // Legacy compatibility
        fileUrl: downloadUrl,
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size,

        // Enhanced fields
        storedFile,
        isCloudStored: true,
        fileId: storedFile.id,
        isDuplicate,
        uploadMethod,
        deduplicationSavings,
        downloadUrl,
      };
    } catch (error: any) {
      logger.error('Cloud storage upload failed:', {
        filename: file.originalname,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Upload to local storage (backward compatibility)
   */
  private async uploadToLocalStorage(
    file: Express.Multer.File,
    options: EnhancedUploadOptions
  ): Promise<UploadResult> {
    const fileUrl = this.getFileUrl(file);

    return {
      // Legacy compatibility
      fileUrl,
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,

      // Enhanced fields
      isCloudStored: false,
      uploadMethod: 'local',
      isDuplicate: false,
      deduplicationSavings: 0,
    };
  }

  /**
   * Create a new version of an existing file
   */
  async createFileVersion(
    originalFileId: string,
    newFile: Express.Multer.File,
    options: {
      changeDescription?: string;
      userId: string;
      userName: string;
    }
  ): Promise<UploadResult> {
    try {
      const fileContent = await fs.readFile(newFile.path);

      const versionResult = await fileVersioningService.createVersion(
        originalFileId,
        fileContent,
        {
          changeType: 'UPDATE',
          changeDescription: options.changeDescription,
          userId: options.userId,
          userName: options.userName,
        }
      );

      // Generate download URL
      const downloadUrl = await cloudStorageService.generateSignedUrl(
        versionResult.fileId,
        'get',
        3600
      );

      // Clean up temporary file
      try {
        await fs.unlink(newFile.path);
      } catch (cleanupError) {
        logger.warn('Failed to cleanup temporary file:', {
          path: newFile.path,
          error: cleanupError
        });
      }

      return {
        fileUrl: downloadUrl,
        filename: newFile.originalname,
        mimetype: newFile.mimetype,
        size: newFile.size,
        isCloudStored: true,
        fileId: versionResult.id,
        uploadMethod: 'cloud_direct',
        downloadUrl,
      };
    } catch (error: any) {
      logger.error('File version creation failed:', {
        originalFileId,
        filename: newFile.originalname,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get enhanced file information including cloud storage details
   */
  async getEnhancedFileInfo(fileIdOrUrl: string): Promise<{
    basic: UploadResult;
    versions?: any[];
    duplicates?: any[];
    analytics?: any;
  } | null> {
    try {
      // Check if it's a cloud storage file ID
      if (!fileIdOrUrl.startsWith('/uploads')) {
        // It's a file ID, get from cloud storage
        const file = await cloudStorageService.listFiles({ limit: 1 });
        if (file.files.length === 0) return null;

        const storedFile = file.files[0];
        const downloadUrl = await cloudStorageService.generateSignedUrl(
          storedFile.id,
          'get',
          3600
        );

        // Get version history
        const versions = await fileVersioningService.getVersionHistory(storedFile.id);

        // Get duplicates
        const duplicates = await fileDeduplicationService.getDuplicateFiles(
          storedFile.fileHash
        );

        return {
          basic: {
            fileUrl: downloadUrl,
            filename: storedFile.fileName,
            mimetype: storedFile.mimeType,
            size: storedFile.fileSize,
            isCloudStored: true,
            fileId: storedFile.id,
            downloadUrl,
          },
          versions: versions.versions,
          duplicates,
        };
      } else {
        // It's a local file URL, use legacy method
        const metadata = await this.getFileMetadata(fileIdOrUrl);
        if (!metadata) return null;

        return {
          basic: {
            fileUrl: fileIdOrUrl,
            filename: metadata.filename,
            mimetype: metadata.mimetype,
            size: metadata.size,
            isCloudStored: false,
          }
        };
      }
    } catch (error: any) {
      logger.error('Failed to get enhanced file info:', {
        fileIdOrUrl,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Delete file with cloud storage support
   */
  async deleteFileEnhanced(fileIdOrUrl: string): Promise<void> {
    try {
      if (!fileIdOrUrl.startsWith('/uploads')) {
        // Cloud storage file
        await cloudStorageService.deleteFile(fileIdOrUrl);
        logger.info('Cloud storage file deleted:', { fileId: fileIdOrUrl });
      } else {
        // Local file
        await this.deleteFile(fileIdOrUrl);
        logger.info('Local file deleted:', { fileUrl: fileIdOrUrl });
      }
    } catch (error: any) {
      logger.error('Enhanced file deletion failed:', {
        fileIdOrUrl,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStatistics(): Promise<{
    local: {
      totalFiles: number;
      totalSize: number;
    };
    cloud: {
      totalFiles: number;
      totalSize: number;
      deduplicationRatio: number;
      versionCount: number;
    };
  }> {
    try {
      // Get local storage stats
      let localFiles = 0;
      let localSize = 0;

      const categories = ['images', 'videos', 'documents', 'others'];
      for (const category of categories) {
        try {
          const categoryPath = path.join(UPLOAD_DIR, category);
          const files = await fs.readdir(categoryPath);

          for (const file of files) {
            const filePath = path.join(categoryPath, file);
            const stats = await fs.stat(filePath);
            localFiles++;
            localSize += stats.size;
          }
        } catch {
          // Category might not exist
          continue;
        }
      }

      // Get cloud storage stats
      const cloudStats = await cloudStorageService.getStorageStats();
      const deduplicationStats = await fileDeduplicationService.getDeduplicationStats();
      const versioningStats = await fileVersioningService.getVersioningStats();

      return {
        local: {
          totalFiles: localFiles,
          totalSize: localSize,
        },
        cloud: {
          totalFiles: cloudStats.totalFiles,
          totalSize: cloudStats.totalSize,
          deduplicationRatio: deduplicationStats.deduplicationRatio,
          versionCount: versioningStats.totalVersions,
        },
      };
    } catch (error: any) {
      logger.error('Failed to get storage statistics:', error);
      throw error;
    }
  }

  /**
   * Clean up orphaned files older than specified days
   */
  async cleanupOldFiles(daysOld: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      let deletedCount = 0;

      const categories = ['images', 'videos', 'documents', 'others'];

      for (const category of categories) {
        const categoryPath = path.join(UPLOAD_DIR, category);

        try {
          const files = await fs.readdir(categoryPath);

          for (const file of files) {
            const filePath = path.join(categoryPath, file);
            const stats = await fs.stat(filePath);

            if (stats.birthtime < cutoffDate) {
              await fs.unlink(filePath);
              deletedCount++;
            }
          }
        } catch (error) {
          // Category directory might not exist
          continue;
        }
      }

      logger.info(`Cleaned up ${deletedCount} old files older than ${daysOld} days`);
      return deletedCount;
    } catch (error) {
      logger.error('Error cleaning up old files:', error);
      throw error;
    }
  }
}

export const fileUploadService = new FileUploadService();
