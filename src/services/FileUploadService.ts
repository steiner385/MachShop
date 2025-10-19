import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

// Configuration
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB default
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

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
