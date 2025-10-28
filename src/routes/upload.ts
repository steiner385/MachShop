import express, { Request, Response, NextFunction } from 'express';
import { fileUploadService, EnhancedUploadOptions } from '../services/FileUploadService';
import { multipartUploadService } from '../services/MultipartUploadService';
import { cloudStorageService } from '../services/CloudStorageService';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * @route   POST /api/v1/upload/single
 * @desc    Upload a single file
 * @access  Private
 */
router.post('/single', (req: Request, res: Response, next: NextFunction) => {
  const upload = fileUploadService.uploadSingle('file');

  upload(req, res, (err: any) => {
    if (err) {
      logger.error('File upload error:', err);
      return res.status(400).json({
        error: 'File upload failed',
        message: err.message,
      });
    }

    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Validate file
    const validation = fileUploadService.validateFile(file);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const fileUrl = fileUploadService.getFileUrl(file);

    logger.info(`File uploaded: ${fileUrl}`, {
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    return res.json({
      url: fileUrl,
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });
  });
});

/**
 * @route   POST /api/v1/upload/multiple
 * @desc    Upload multiple files
 * @access  Private
 */
router.post('/multiple', (req: Request, res: Response, next: NextFunction) => {
  const upload = fileUploadService.uploadMultiple('files', 10);

  upload(req, res, (err: any) => {
    if (err) {
      logger.error('Multiple file upload error:', err);
      return res.status(400).json({
        error: 'File upload failed',
        message: err.message,
      });
    }

    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    // Validate all files
    const validationResults = files.map(file => ({
      file,
      validation: fileUploadService.validateFile(file),
    }));

    const invalidFiles = validationResults.filter(r => !r.validation.valid);
    if (invalidFiles.length > 0) {
      return res.status(400).json({
        error: 'Some files are invalid',
        invalidFiles: invalidFiles.map(r => ({
          filename: r.file.originalname,
          error: r.validation.error,
        })),
      });
    }

    const fileUrls = fileUploadService.getFileUrls(files);

    logger.info(`${files.length} files uploaded`, {
      count: files.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
    });

    return res.json({
      files: files.map((file, index) => ({
        url: fileUrls[index],
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      })),
      count: files.length,
    });
  });
});

/**
 * @route   DELETE /api/v1/upload/file
 * @desc    Delete a file
 * @access  Private
 */
router.delete('/file', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { fileUrl } = req.body;

    if (!fileUrl) {
      return res.status(400).json({ error: 'fileUrl is required' });
    }

    const exists = await fileUploadService.fileExists(fileUrl);
    if (!exists) {
      return res.status(404).json({ error: 'File not found' });
    }

    await fileUploadService.deleteFile(fileUrl);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/upload/files
 * @desc    Delete multiple files
 * @access  Private
 */
router.delete('/files', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { fileUrls } = req.body;

    if (!fileUrls || !Array.isArray(fileUrls)) {
      return res.status(400).json({ error: 'fileUrls must be an array' });
    }

    await fileUploadService.deleteFiles(fileUrls);

    res.json({
      message: 'Files deleted successfully',
      count: fileUrls.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/upload/file/metadata
 * @desc    Get file metadata
 * @access  Private
 */
router.get('/file/metadata', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const fileUrl = req.query.fileUrl as string;

    if (!fileUrl) {
      return res.status(400).json({ error: 'fileUrl query parameter is required' });
    }

    const metadata = await fileUploadService.getFileMetadata(fileUrl);

    if (!metadata) {
      return res.status(404).json({ error: 'File not found or metadata unavailable' });
    }

    res.json(metadata);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/upload/enhanced/single
 * @desc    Upload a single file with cloud storage support
 * @access  Private
 */
router.post('/enhanced/single', (req: Request, res: Response, next: NextFunction) => {
  const upload = fileUploadService.uploadSingle('file');

  upload(req, res, async (err: any) => {
    if (err) {
      logger.error('Enhanced file upload error:', err);
      return res.status(400).json({
        error: 'File upload failed',
        message: err.message,
      });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    try {
      // Parse enhanced upload options from request body
      const options: EnhancedUploadOptions = {
        enableCloudStorage: req.body.enableCloudStorage !== 'false',
        enableDeduplication: req.body.enableDeduplication !== 'false',
        enableVersioning: req.body.enableVersioning === 'true',
        enableMultipart: req.body.enableMultipart !== 'false',
        documentType: req.body.documentType,
        documentId: req.body.documentId,
        attachmentType: req.body.attachmentType,
        userId: req.body.userId || 'anonymous',
        userName: req.body.userName || 'Anonymous',
        metadata: req.body.metadata ? JSON.parse(req.body.metadata) : {},
      };

      const result = await fileUploadService.uploadFileEnhanced(file, options);

      logger.info('Enhanced file upload completed', {
        filename: file.originalname,
        isCloudStored: result.isCloudStored,
        isDuplicate: result.isDuplicate,
        uploadMethod: result.uploadMethod,
        fileId: result.fileId
      });

      return res.json({
        success: true,
        result,
        // Legacy compatibility
        url: result.fileUrl,
        filename: result.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        // Enhanced features
        fileId: result.fileId,
        isCloudStored: result.isCloudStored,
        isDuplicate: result.isDuplicate,
        uploadMethod: result.uploadMethod,
        deduplicationSavings: result.deduplicationSavings,
        downloadUrl: result.downloadUrl,
      });
    } catch (error: any) {
      logger.error('Enhanced upload processing failed:', error);
      return res.status(500).json({
        error: 'Upload processing failed',
        message: error.message,
      });
    }
  });
});

/**
 * @route   POST /api/v1/upload/enhanced/multiple
 * @desc    Upload multiple files with cloud storage support
 * @access  Private
 */
router.post('/enhanced/multiple', (req: Request, res: Response, next: NextFunction) => {
  const upload = fileUploadService.uploadMultiple('files', 10);

  upload(req, res, async (err: any) => {
    if (err) {
      logger.error('Enhanced multiple file upload error:', err);
      return res.status(400).json({
        error: 'File upload failed',
        message: err.message,
      });
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    try {
      // Parse enhanced upload options
      const options: EnhancedUploadOptions = {
        enableCloudStorage: req.body.enableCloudStorage !== 'false',
        enableDeduplication: req.body.enableDeduplication !== 'false',
        enableVersioning: req.body.enableVersioning === 'true',
        enableMultipart: req.body.enableMultipart !== 'false',
        documentType: req.body.documentType,
        documentId: req.body.documentId,
        attachmentType: req.body.attachmentType,
        userId: req.body.userId || 'anonymous',
        userName: req.body.userName || 'Anonymous',
        metadata: req.body.metadata ? JSON.parse(req.body.metadata) : {},
      };

      const result = await fileUploadService.uploadMultipleEnhanced(files, options);

      logger.info('Enhanced multiple file upload completed', {
        totalFiles: files.length,
        successful: result.results.length,
        cloudStored: result.cloudStoredCount,
        duplicates: result.duplicateCount,
        errors: result.errors.length
      });

      return res.json({
        success: true,
        result,
        summary: {
          totalFiles: files.length,
          successfulUploads: result.results.length,
          cloudStoredCount: result.cloudStoredCount,
          localStoredCount: result.localStoredCount,
          duplicateCount: result.duplicateCount,
          totalSize: result.totalSize,
          errorCount: result.errors.length,
        }
      });
    } catch (error: any) {
      logger.error('Enhanced multiple upload processing failed:', error);
      return res.status(500).json({
        error: 'Upload processing failed',
        message: error.message,
      });
    }
  });
});

/**
 * @route   POST /api/v1/upload/multipart/initialize
 * @desc    Initialize multipart upload for large files
 * @access  Private
 */
router.post('/multipart/initialize', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const {
      fileName,
      fileSize,
      contentType,
      documentType,
      documentId,
      attachmentType,
      userId = 'anonymous',
      userName = 'Anonymous',
      metadata = {}
    } = req.body;

    if (!fileName || !fileSize) {
      return res.status(400).json({
        error: 'fileName and fileSize are required'
      });
    }

    const session = await multipartUploadService.initializeUpload({
      fileName,
      fileSize,
      contentType,
      documentType,
      documentId,
      attachmentType,
      uploadedById: userId,
      uploadedByName: userName,
      metadata,
    });

    return res.json({
      success: true,
      session,
    });
  } catch (error: any) {
    logger.error('Multipart upload initialization failed:', error);
    return res.status(500).json({
      error: 'Multipart upload initialization failed',
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/v1/upload/multipart/:uploadId/part/:partNumber
 * @desc    Upload a part of multipart upload
 * @access  Private
 */
router.post('/multipart/:uploadId/part/:partNumber', (req: Request, res: Response, next: NextFunction) => {
  const upload = fileUploadService.uploadSingle('part');

  upload(req, res, async (err: any) => {
    if (err) {
      return res.status(400).json({
        error: 'Part upload failed',
        message: err.message,
      });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No part data provided' });
    }

    try {
      const { uploadId, partNumber } = req.params;
      const partNum = parseInt(partNumber);

      if (isNaN(partNum) || partNum < 1) {
        return res.status(400).json({ error: 'Invalid part number' });
      }

      // Read part data
      const partData = await require('fs/promises').readFile(file.path);

      const result = await multipartUploadService.uploadPart(
        uploadId,
        partNum,
        partData,
        {
          expectedSize: file.size,
          checksum: req.body.checksum,
        }
      );

      // Clean up temporary file
      await require('fs/promises').unlink(file.path);

      return res.json({
        success: true,
        part: result,
      });
    } catch (error: any) {
      logger.error('Part upload failed:', error);
      return res.status(500).json({
        error: 'Part upload failed',
        message: error.message,
      });
    }
  });
});

/**
 * @route   POST /api/v1/upload/multipart/:uploadId/complete
 * @desc    Complete multipart upload
 * @access  Private
 */
router.post('/multipart/:uploadId/complete', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { uploadId } = req.params;

    const result = await multipartUploadService.completeUpload(uploadId);

    return res.json({
      success: true,
      result,
    });
  } catch (error: any) {
    logger.error('Multipart upload completion failed:', error);
    return res.status(500).json({
      error: 'Multipart upload completion failed',
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/v1/upload/multipart/:uploadId/abort
 * @desc    Abort multipart upload
 * @access  Private
 */
router.post('/multipart/:uploadId/abort', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { uploadId } = req.params;

    await multipartUploadService.abortUpload(uploadId);

    return res.json({
      success: true,
      message: 'Multipart upload aborted successfully',
    });
  } catch (error: any) {
    logger.error('Multipart upload abort failed:', error);
    return res.status(500).json({
      error: 'Multipart upload abort failed',
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/upload/multipart/:uploadId/progress
 * @desc    Get multipart upload progress
 * @access  Private
 */
router.get('/multipart/:uploadId/progress', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { uploadId } = req.params;

    const progress = await multipartUploadService.getUploadProgress(uploadId);

    return res.json({
      success: true,
      progress,
    });
  } catch (error: any) {
    logger.error('Progress retrieval failed:', error);
    return res.status(500).json({
      error: 'Progress retrieval failed',
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/upload/file/:fileId/info
 * @desc    Get enhanced file information
 * @access  Private
 */
router.get('/file/:fileId/info', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { fileId } = req.params;
    const includeVersions = req.query.includeVersions === 'true';
    const includeDuplicates = req.query.includeDuplicates === 'true';

    const fileInfo = await fileUploadService.getEnhancedFileInfo(fileId);

    if (!fileInfo) {
      return res.status(404).json({ error: 'File not found' });
    }

    const response: any = {
      success: true,
      file: fileInfo.basic,
    };

    if (includeVersions && fileInfo.versions) {
      response.versions = fileInfo.versions;
    }

    if (includeDuplicates && fileInfo.duplicates) {
      response.duplicates = fileInfo.duplicates;
    }

    return res.json(response);
  } catch (error: any) {
    logger.error('File info retrieval failed:', error);
    return res.status(500).json({
      error: 'File info retrieval failed',
      message: error.message,
    });
  }
});

/**
 * @route   DELETE /api/v1/upload/enhanced/file
 * @desc    Delete file with cloud storage support
 * @access  Private
 */
router.delete('/enhanced/file', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { fileId, fileUrl } = req.body;
    const identifier = fileId || fileUrl;

    if (!identifier) {
      return res.status(400).json({ error: 'fileId or fileUrl is required' });
    }

    await fileUploadService.deleteFileEnhanced(identifier);

    res.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error: any) {
    logger.error('Enhanced file deletion failed:', error);
    return res.status(500).json({
      error: 'File deletion failed',
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/upload/statistics
 * @desc    Get storage statistics
 * @access  Private
 */
router.get('/statistics', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const stats = await fileUploadService.getStorageStatistics();

    return res.json({
      success: true,
      statistics: stats,
    });
  } catch (error: any) {
    logger.error('Statistics retrieval failed:', error);
    return res.status(500).json({
      error: 'Statistics retrieval failed',
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/v1/upload/cleanup
 * @desc    Clean up orphaned files older than specified days
 * @access  Private (Admin only)
 */
router.post('/cleanup', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    // TODO: Add admin permission check

    const { daysOld = 90 } = req.body;

    const deletedCount = await fileUploadService.cleanupOldFiles(daysOld);

    res.json({
      message: 'Cleanup completed successfully',
      deletedCount,
      daysOld,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
