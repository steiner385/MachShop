import express from 'express';
import { z } from 'zod';
import multer from 'multer';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { handleAsync } from '../middleware/errorHandler';
import BuildRecordService, {
  CreateBuildRecordSchema,
  UpdateBuildRecordSchema,
  CreateBuildRecordOperationSchema,
  CreateBuildDeviationSchema,
} from '../services/BuildRecordService';
import PhotoCaptureService, {
  CapturePhotoSchema,
  UpdatePhotoSchema,
  PhotoSearchSchema,
} from '../services/PhotoCaptureService';
import AsBuiltConfigurationService, {
  RecordActualPartUsageSchema,
  RecordActualOperationSchema,
  CompareConfigurationSchema,
} from '../services/AsBuiltConfigurationService';
import { BuildRecordStatus, FinalDisposition } from '@prisma/client';

const router = express.Router();

// Configure multer for photo uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// ============================================================================
// VALIDATION SCHEMAS FOR QUERY PARAMETERS
// ============================================================================

const GetBuildRecordsQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  pageSize: z.string().optional().transform(val => val ? parseInt(val) : 20),
  sortBy: z.string().optional().default('buildStartDate'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  status: z.nativeEnum(BuildRecordStatus).optional(),
  engineModel: z.string().optional(),
  customerName: z.string().optional(),
  hasDeviations: z.string().optional().transform(val => val === 'true'),
  isCompliant: z.string().optional().transform(val => val === 'true'),
  assignedToId: z.string().cuid().optional(),
  dateFrom: z.string().optional().transform(val => val ? new Date(val) : undefined),
  dateTo: z.string().optional().transform(val => val ? new Date(val) : undefined),
});

const OperationSignOffSchema = z.object({
  signatureType: z.enum(['OPERATOR', 'INSPECTOR', 'ENGINEER']),
  signatureData: z.any(),
  qualityApproved: z.boolean().optional(),
  notes: z.string().optional(),
});

// ============================================================================
// BUILD RECORD CRUD ENDPOINTS
// ============================================================================

/**
 * GET /api/build-records
 * Get list of build records with filtering and pagination
 */
router.get(
  '/',
  authenticateToken,
  requireRole(['staging_operator', 'staging_coordinator', 'production_manager', 'admin']),
  validateRequest({ query: GetBuildRecordsQuerySchema }),
  handleAsync(async (req, res) => {
    const query = req.query as z.infer<typeof GetBuildRecordsQuerySchema>;

    // Extract filters and pagination
    const filters = {
      status: query.status,
      engineModel: query.engineModel,
      customerName: query.customerName,
      hasDeviations: query.hasDeviations,
      isCompliant: query.isCompliant,
      assignedToId: query.assignedToId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    };

    const pagination = {
      page: query.page,
      pageSize: query.pageSize,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    };

    const result = await BuildRecordService.getBuildRecords(filters, pagination);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/build-records/:id
 * Get build record by ID with full details
 */
router.get(
  '/:id',
  authenticateToken,
  requireRole(['staging_operator', 'staging_coordinator', 'production_manager', 'admin']),
  handleAsync(async (req, res) => {
    const { id } = req.params;

    const buildRecord = await BuildRecordService.getBuildRecordById(id);

    if (!buildRecord) {
      return res.status(404).json({
        success: false,
        error: 'Build record not found',
      });
    }

    res.json({
      success: true,
      data: buildRecord,
    });
  })
);

/**
 * POST /api/build-records
 * Create new build record
 */
router.post(
  '/',
  authenticateToken,
  requireRole(['staging_coordinator', 'production_manager', 'admin']),
  validateRequest({ body: CreateBuildRecordSchema }),
  handleAsync(async (req, res) => {
    const buildRecordData = req.body;
    const createdById = req.user!.id;

    const buildRecord = await BuildRecordService.createBuildRecord(
      buildRecordData,
      createdById
    );

    res.status(201).json({
      success: true,
      data: buildRecord,
      message: 'Build record created successfully',
    });
  })
);

/**
 * PUT /api/build-records/:id
 * Update build record
 */
router.put(
  '/:id',
  authenticateToken,
  requireRole(['staging_coordinator', 'production_manager', 'admin']),
  validateRequest({ body: UpdateBuildRecordSchema }),
  handleAsync(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    const updatedById = req.user!.id;

    const buildRecord = await BuildRecordService.updateBuildRecord(
      id,
      updateData,
      updatedById
    );

    res.json({
      success: true,
      data: buildRecord,
      message: 'Build record updated successfully',
    });
  })
);

/**
 * GET /api/build-records/summary
 * Get build record summary statistics
 */
router.get(
  '/summary/statistics',
  authenticateToken,
  requireRole(['staging_coordinator', 'production_manager', 'admin']),
  handleAsync(async (req, res) => {
    const filters = {
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      engineModel: req.query.engineModel as string,
      customerName: req.query.customerName as string,
    };

    const summary = await BuildRecordService.getBuildRecordSummary(filters);

    res.json({
      success: true,
      data: summary,
    });
  })
);

// ============================================================================
// BUILD RECORD OPERATION ENDPOINTS
// ============================================================================

/**
 * POST /api/build-records/:id/operations
 * Create new operation for build record
 */
router.post(
  '/:id/operations',
  authenticateToken,
  requireRole(['staging_coordinator', 'production_manager', 'admin']),
  validateRequest({ body: CreateBuildRecordOperationSchema }),
  handleAsync(async (req, res) => {
    const { id: buildRecordId } = req.params;
    const operationData = { ...req.body, buildRecordId };

    const operation = await BuildRecordService.createBuildRecordOperation(operationData);

    res.status(201).json({
      success: true,
      data: operation,
      message: 'Operation created successfully',
    });
  })
);

/**
 * POST /api/build-records/operations/:operationId/start
 * Start operation (operator sign-on)
 */
router.post(
  '/operations/:operationId/start',
  authenticateToken,
  requireRole(['staging_operator', 'staging_coordinator', 'admin']),
  handleAsync(async (req, res) => {
    const { operationId } = req.params;
    const operatorId = req.user!.id;

    const operation = await BuildRecordService.startOperation(operationId, operatorId);

    res.json({
      success: true,
      data: operation,
      message: 'Operation started successfully',
    });
  })
);

/**
 * POST /api/build-records/operations/:operationId/complete
 * Complete operation (operator sign-off)
 */
router.post(
  '/operations/:operationId/complete',
  authenticateToken,
  requireRole(['staging_operator', 'staging_coordinator', 'admin']),
  validateRequest({ body: OperationSignOffSchema }),
  handleAsync(async (req, res) => {
    const { operationId } = req.params;
    const { signatureData, notes } = req.body;
    const operatorId = req.user!.id;

    const operation = await BuildRecordService.completeOperation(
      operationId,
      operatorId,
      signatureData,
      notes
    );

    res.json({
      success: true,
      data: operation,
      message: 'Operation completed successfully',
    });
  })
);

/**
 * POST /api/build-records/operations/:operationId/inspect
 * Inspector sign-off for operation
 */
router.post(
  '/operations/:operationId/inspect',
  authenticateToken,
  requireRole(['staging_coordinator', 'production_manager', 'admin']),
  validateRequest({ body: OperationSignOffSchema }),
  handleAsync(async (req, res) => {
    const { operationId } = req.params;
    const { signatureData, qualityApproved = true, notes } = req.body;
    const inspectorId = req.user!.id;

    const operation = await BuildRecordService.inspectorSignOff(
      operationId,
      inspectorId,
      signatureData,
      qualityApproved,
      notes
    );

    res.json({
      success: true,
      data: operation,
      message: 'Inspector sign-off completed successfully',
    });
  })
);

// ============================================================================
// BUILD DEVIATION ENDPOINTS
// ============================================================================

/**
 * POST /api/build-records/:id/deviations
 * Create new build deviation
 */
router.post(
  '/:id/deviations',
  authenticateToken,
  requireRole(['staging_operator', 'staging_coordinator', 'production_manager', 'admin']),
  validateRequest({ body: CreateBuildDeviationSchema }),
  handleAsync(async (req, res) => {
    const { id: buildRecordId } = req.params;
    const deviationData = { ...req.body, buildRecordId, detectedBy: req.user!.id };

    const deviation = await BuildRecordService.createBuildDeviation(deviationData);

    res.status(201).json({
      success: true,
      data: deviation,
      message: 'Build deviation created successfully',
    });
  })
);

// ============================================================================
// PHOTO DOCUMENTATION ENDPOINTS
// ============================================================================

/**
 * POST /api/build-records/:id/photos
 * Capture and upload photo for build record
 */
router.post(
  '/:id/photos',
  authenticateToken,
  requireRole(['staging_operator', 'staging_coordinator', 'production_manager', 'admin']),
  upload.single('photo'),
  validateRequest({ body: CapturePhotoSchema }),
  handleAsync(async (req, res) => {
    const { id: buildRecordId } = req.params;
    const photoData = { ...req.body, buildRecordId, capturedBy: req.user!.id };

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No photo file provided',
      });
    }

    const uploadData = {
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
    };

    const photo = await PhotoCaptureService.capturePhoto(photoData, uploadData);

    res.status(201).json({
      success: true,
      data: photo,
      message: 'Photo captured successfully',
    });
  })
);

/**
 * GET /api/build-records/photos/search
 * Search photos with filters
 */
router.get(
  '/photos/search',
  authenticateToken,
  requireRole(['staging_operator', 'staging_coordinator', 'production_manager', 'admin']),
  validateRequest({ query: PhotoSearchSchema }),
  handleAsync(async (req, res) => {
    const searchCriteria = req.query as z.infer<typeof PhotoSearchSchema>;
    const pagination = {
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 20,
      sortBy: req.query.sortBy as string || 'capturedAt',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
    };

    const result = await PhotoCaptureService.searchPhotos(searchCriteria, pagination);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/build-records/photos/:photoId
 * Get photo file stream
 */
router.get(
  '/photos/:photoId',
  authenticateToken,
  requireRole(['staging_operator', 'staging_coordinator', 'production_manager', 'admin']),
  handleAsync(async (req, res) => {
    const { photoId } = req.params;
    const thumbnail = req.query.thumbnail === 'true';

    const photoStream = await PhotoCaptureService.getPhotoStream(photoId, thumbnail);

    if (!photoStream) {
      return res.status(404).json({
        success: false,
        error: 'Photo not found',
      });
    }

    res.setHeader('Content-Type', photoStream.mimeType);
    photoStream.stream.pipe(res);
  })
);

/**
 * PUT /api/build-records/photos/:photoId
 * Update photo metadata and annotations
 */
router.put(
  '/photos/:photoId',
  authenticateToken,
  requireRole(['staging_operator', 'staging_coordinator', 'production_manager', 'admin']),
  validateRequest({ body: UpdatePhotoSchema }),
  handleAsync(async (req, res) => {
    const { photoId } = req.params;
    const updateData = req.body;
    const updatedBy = req.user!.id;

    const photo = await PhotoCaptureService.updatePhoto(photoId, updateData, updatedBy);

    res.json({
      success: true,
      data: photo,
      message: 'Photo updated successfully',
    });
  })
);

/**
 * POST /api/build-records/photos/:photoId/annotations
 * Add annotation to photo
 */
router.post(
  '/photos/:photoId/annotations',
  authenticateToken,
  requireRole(['staging_operator', 'staging_coordinator', 'production_manager', 'admin']),
  handleAsync(async (req, res) => {
    const { photoId } = req.params;
    const annotation = req.body;
    const annotatedBy = req.user!.id;

    const photo = await PhotoCaptureService.addPhotoAnnotation(
      photoId,
      annotation,
      annotatedBy
    );

    res.json({
      success: true,
      data: photo,
      message: 'Annotation added successfully',
    });
  })
);

// ============================================================================
// AS-BUILT CONFIGURATION ENDPOINTS
// ============================================================================

/**
 * POST /api/build-records/:id/actual-part-usage
 * Record actual part usage
 */
router.post(
  '/:id/actual-part-usage',
  authenticateToken,
  requireRole(['staging_operator', 'staging_coordinator', 'admin']),
  validateRequest({ body: RecordActualPartUsageSchema }),
  handleAsync(async (req, res) => {
    const { id: buildRecordId } = req.params;
    const partUsageData = { ...req.body, buildRecordId, recordedBy: req.user!.id };

    await AsBuiltConfigurationService.recordActualPartUsage(partUsageData);

    res.json({
      success: true,
      message: 'Actual part usage recorded successfully',
    });
  })
);

/**
 * POST /api/build-records/operations/:operationId/actual-operation
 * Record actual operation performance
 */
router.post(
  '/operations/:operationId/actual-operation',
  authenticateToken,
  requireRole(['staging_operator', 'staging_coordinator', 'admin']),
  validateRequest({ body: RecordActualOperationSchema }),
  handleAsync(async (req, res) => {
    const { operationId } = req.params;
    const operationData = { ...req.body, operationId, recordedBy: req.user!.id };

    await AsBuiltConfigurationService.recordActualOperation(operationData);

    res.json({
      success: true,
      message: 'Actual operation performance recorded successfully',
    });
  })
);

/**
 * POST /api/build-records/:id/compare-configuration
 * Compare as-designed vs as-built configuration
 */
router.post(
  '/:id/compare-configuration',
  authenticateToken,
  requireRole(['staging_coordinator', 'production_manager', 'admin']),
  validateRequest({ body: CompareConfigurationSchema }),
  handleAsync(async (req, res) => {
    const { id: buildRecordId } = req.params;
    const comparisonRequest = { ...req.body, buildRecordId };

    const comparison = await AsBuiltConfigurationService.compareConfiguration(comparisonRequest);

    res.json({
      success: true,
      data: comparison,
    });
  })
);

/**
 * GET /api/build-records/:id/as-built-summary
 * Get as-built configuration summary
 */
router.get(
  '/:id/as-built-summary',
  authenticateToken,
  requireRole(['staging_operator', 'staging_coordinator', 'production_manager', 'admin']),
  handleAsync(async (req, res) => {
    const { id: buildRecordId } = req.params;

    const summary = await AsBuiltConfigurationService.getAsBuiltSummary(buildRecordId);

    res.json({
      success: true,
      data: summary,
    });
  })
);

/**
 * POST /api/build-records/:id/validate-configuration
 * Validate as-built configuration against design
 */
router.post(
  '/:id/validate-configuration',
  authenticateToken,
  requireRole(['staging_coordinator', 'production_manager', 'admin']),
  handleAsync(async (req, res) => {
    const { id: buildRecordId } = req.params;

    const validation = await AsBuiltConfigurationService.validateAsBuiltConfiguration(buildRecordId);

    res.json({
      success: true,
      data: validation,
    });
  })
);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// Handle multer errors
router.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File size too large. Maximum size is 10MB.',
      });
    }
    return res.status(400).json({
      success: false,
      error: `Upload error: ${error.message}`,
    });
  }

  if (error.message === 'Only image files are allowed') {
    return res.status(400).json({
      success: false,
      error: 'Only image files are allowed for photo upload.',
    });
  }

  next(error);
});

export default router;