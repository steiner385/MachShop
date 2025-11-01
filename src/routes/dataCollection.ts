/**
 * Data Collection Routes (Issue #45 - Phase 2)
 * API endpoints for data collection forms and submissions
 */

import express, { Request, Response, NextFunction } from 'express';
import { DataCollectionService } from '../services/DataCollectionService';
import { Logger } from '../utils/logger';

const router = express.Router();
const dataCollectionService = new DataCollectionService();
const logger = Logger.getInstance();

// ============================================================================
// Middleware
// ============================================================================

// Middleware to track request start time for analytics
const trackRequestTime = (req: Request, res: Response, next: NextFunction) => {
  req.startTime = Date.now();
  next();
};

router.use(trackRequestTime);

// ============================================================================
// Get Data Collection Forms for Operation
// ============================================================================

/**
 * GET /api/v1/data-collection/operations/:operationId/forms
 * Get all active data collection forms for a routing operation
 */
router.get('/operations/:operationId/forms', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { operationId } = req.params;

    logger.info(`Fetching data collection forms for operation ${operationId}`);

    const forms = await dataCollectionService.getDataCollectionForms(operationId);

    res.json({
      success: true,
      data: forms,
      count: forms.length,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// Get Specific Data Collection Form
// ============================================================================

/**
 * GET /api/v1/data-collection/forms/:formId
 * Get a specific data collection form by ID
 */
router.get('/forms/:formId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { formId } = req.params;

    logger.info(`Fetching data collection form ${formId}`);

    const form = await dataCollectionService.getDataCollectionForm(formId);

    if (!form) {
      return res.status(404).json({
        success: false,
        error: `Data collection form ${formId} not found`,
      });
    }

    res.json({
      success: true,
      data: form,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// Create Data Collection Form
// ============================================================================

/**
 * POST /api/v1/data-collection/operations/:operationId/forms
 * Create a new data collection form for a routing operation
 */
router.post('/operations/:operationId/forms', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { operationId } = req.params;
    const { formName, description, fields, requiredForCompletion, displayOrder } = req.body;
    const userId = (req as any).user?.id || 'SYSTEM'; // From auth middleware

    // Validate required fields
    if (!formName || !fields || !Array.isArray(fields)) {
      return res.status(400).json({
        success: false,
        error: 'formName and fields are required',
      });
    }

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one field is required',
      });
    }

    logger.info(`Creating data collection form "${formName}" for operation ${operationId}`);

    const form = await dataCollectionService.createDataCollectionForm(
      operationId,
      formName,
      fields,
      userId,
      {
        description,
        requiredForCompletion,
        displayOrder,
      }
    );

    res.status(201).json({
      success: true,
      data: form,
      message: 'Data collection form created successfully',
    });
  } catch (error) {
    logger.error('Error creating data collection form', error);
    next(error);
  }
});

// ============================================================================
// Update Data Collection Form
// ============================================================================

/**
 * PUT /api/v1/data-collection/forms/:formId
 * Update a data collection form
 */
router.put('/forms/:formId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { formId } = req.params;
    const { formName, description, fields, requiredForCompletion, displayOrder, isActive } = req.body;

    logger.info(`Updating data collection form ${formId}`);

    const form = await dataCollectionService.updateDataCollectionForm(formId, {
      formName,
      description,
      fields,
      requiredForCompletion,
      displayOrder,
      isActive,
    });

    res.json({
      success: true,
      data: form,
      message: 'Data collection form updated successfully',
    });
  } catch (error) {
    logger.error(`Error updating data collection form ${formId}`, error);
    next(error);
  }
});

// ============================================================================
// Submit Data Collection
// ============================================================================

/**
 * POST /api/v1/data-collection/operations/:operationId/submit
 * Submit collected data for an operation
 */
router.post('/operations/:operationId/submit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { operationId } = req.params;
    const { formId, data, deviceInfo, locationCode, notes, offlineSubmitted } = req.body;
    const userId = (req as any).user?.id || 'SYSTEM';

    // Validate required fields
    if (!formId || !data) {
      return res.status(400).json({
        success: false,
        error: 'formId and data are required',
      });
    }

    logger.info(`Submitting data collection for operation ${operationId}, form ${formId}`);

    const submission = await dataCollectionService.submitDataCollection(
      operationId,
      formId,
      data,
      userId,
      {
        deviceInfo,
        locationCode,
        notes,
        offlineSubmitted,
      }
    );

    res.status(201).json({
      success: true,
      data: submission,
      message: 'Data collection submitted successfully',
      validationStatus: submission.validationStatus,
    });
  } catch (error) {
    logger.error(`Error submitting data collection for operation ${operationId}`, error);
    next(error);
  }
});

// ============================================================================
// Validate Data Collection
// ============================================================================

/**
 * POST /api/v1/data-collection/forms/:formId/validate
 * Validate collected data against form schema (without submission)
 */
router.post('/forms/:formId/validate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { formId } = req.params;
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'data is required',
      });
    }

    logger.info(`Validating data collection for form ${formId}`);

    const validationResult = await dataCollectionService.validateDataCollection(formId, data);

    res.json({
      success: true,
      data: validationResult,
    });
  } catch (error) {
    logger.error(`Error validating data collection for form ${formId}`, error);
    next(error);
  }
});

// ============================================================================
// Get Submission History
// ============================================================================

/**
 * GET /api/v1/data-collection/operations/:operationId/submissions
 * Get submission history for an operation
 */
router.get('/operations/:operationId/submissions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { operationId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

    logger.info(
      `Fetching submission history for operation ${operationId} (limit: ${limit}, offset: ${offset})`
    );

    const result = await dataCollectionService.getSubmissionHistory(operationId, {
      limit,
      offset,
    });

    res.json({
      success: true,
      data: result.submissions,
      pagination: {
        limit,
        offset,
        total: result.total,
        hasMore: offset + limit < result.total,
      },
    });
  } catch (error) {
    logger.error(`Error fetching submission history for operation ${operationId}`, error);
    next(error);
  }
});

// ============================================================================
// Get Specific Submission
// ============================================================================

/**
 * GET /api/v1/data-collection/submissions/:submissionId
 * Get a specific data collection submission
 */
router.get('/submissions/:submissionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { submissionId } = req.params;

    logger.info(`Fetching data collection submission ${submissionId}`);

    // Note: In a real app, you'd fetch from the service
    // For now, this is a placeholder for the route structure

    res.json({
      success: true,
      message: 'Submission detail endpoint',
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// Offline Sync
// ============================================================================

/**
 * POST /api/v1/data-collection/sync
 * Sync pending offline submissions
 */
router.post('/sync', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pendingSubmissions } = req.body;

    if (!pendingSubmissions || !Array.isArray(pendingSubmissions)) {
      return res.status(400).json({
        success: false,
        error: 'pendingSubmissions array is required',
      });
    }

    logger.info(`Syncing ${pendingSubmissions.length} pending offline submissions`);

    const results = [];

    // Process each pending submission
    for (const submission of pendingSubmissions) {
      try {
        const result = await dataCollectionService.submitDataCollection(
          submission.workOrderOperationId,
          submission.formId,
          submission.data,
          submission.submittedBy,
          {
            deviceInfo: submission.deviceInfo,
            locationCode: submission.locationCode,
            notes: submission.notes,
            offlineSubmitted: true,
          }
        );

        results.push({
          id: submission.id,
          status: 'SYNCED',
          result,
        });

        // Mark original as synced if it has an ID
        if (submission.id) {
          await dataCollectionService.markSubmissionSynced(submission.id);
        }
      } catch (error) {
        logger.error(`Error syncing submission`, error);
        results.push({
          id: submission.id,
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    res.json({
      success: true,
      data: {
        synced: results.filter((r) => r.status === 'SYNCED').length,
        failed: results.filter((r) => r.status === 'FAILED').length,
        results,
      },
    });
  } catch (error) {
    logger.error('Error syncing offline submissions', error);
    next(error);
  }
});

// ============================================================================
// Track Work Instruction View
// ============================================================================

/**
 * POST /api/v1/data-collection/work-instructions/:instructionId/view
 * Track a work instruction view for analytics
 */
router.post('/work-instructions/:instructionId/view', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { instructionId } = req.params;
    const { workOrderOperationId, viewDuration, stepsViewed, deviceType, deviceId } = req.body;
    const userId = (req as any).user?.id || 'SYSTEM';

    logger.info(`Tracking view of work instruction ${instructionId} by user ${userId}`);

    await dataCollectionService.trackWorkInstructionView(instructionId, userId, {
      workOrderOperationId,
      viewDuration,
      stepsViewed,
      deviceType,
      deviceId,
    });

    res.json({
      success: true,
      message: 'Work instruction view tracked',
    });
  } catch (error) {
    // Don't fail the request for analytics errors
    logger.error(`Error tracking work instruction view`, error);
    res.json({
      success: true,
      message: 'View tracked (with errors)',
    });
  }
});

// ============================================================================
// Health Check
// ============================================================================

/**
 * GET /api/v1/data-collection/health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'healthy',
    service: 'DataCollection',
    timestamp: new Date().toISOString(),
  });
});

export default router;
