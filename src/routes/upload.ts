import express, { Request, Response, NextFunction } from 'express';
import { fileUploadService } from '../services/FileUploadService';
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
