/**
 * Traveler Digitization API Routes
 * Issue #36: Paper-Based Traveler Digitization
 *
 * REST API endpoints for traveler digitization, templates, and QA review
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { logger } from '../../utils/logger';
import TravelerDigitizationService, {
  DigitizedTravelerData,
  ManualEntryRequest,
  TravelerReviewData,
  BatchProcessingConfig
} from '../../services/migration/TravelerDigitizationService';
import WorkOrderIntegrationService from '../../services/migration/WorkOrderIntegrationService';
import { TravelerTemplate, FieldDefinition } from '../../services/migration/TemplateMatcher';
import { OCRConfig } from '../../services/migration/OCRService';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Initialize traveler digitization service
const ocrConfig: OCRConfig = {
  provider: (process.env.OCR_PROVIDER as any) || 'tesseract',
  apiKey: process.env.OCR_API_KEY,
  apiEndpoint: process.env.OCR_API_ENDPOINT,
  region: process.env.OCR_REGION,
  projectId: process.env.OCR_PROJECT_ID
};

const digitizationService = new TravelerDigitizationService(ocrConfig);
const workOrderIntegrationService = new WorkOrderIntegrationService();

// ============================================================================
// Template Management
// ============================================================================

/**
 * POST /api/v1/migration/traveler-digitization/templates
 * Define a new traveler template
 */
router.post('/templates', async (req: Request, res: Response) => {
  try {
    const templateDef: TravelerTemplate = req.body;

    // Validate template definition
    if (!templateDef.name || !templateDef.documentType || !templateDef.fields) {
      return res.status(400).json({
        error: 'Missing required fields: name, documentType, fields'
      });
    }

    // Store template in database
    const template = await prisma.travelerTemplate.create({
      data: {
        name: templateDef.name,
        description: templateDef.description,
        version: templateDef.version || 1,
        documentType: templateDef.documentType,
        fields: templateDef.fields,
        matchPatterns: templateDef.matchPatterns || []
      }
    });

    // Register with service
    digitizationService.registerTemplate({
      id: template.id,
      ...templateDef
    });

    logger.info('Traveler template created', {
      templateId: template.id,
      templateName: template.name
    });

    res.status(201).json({
      success: true,
      data: {
        id: template.id,
        name: template.name,
        documentType: template.documentType,
        fieldCount: (template.fields as any[]).length
      }
    });
  } catch (error) {
    logger.error('Failed to create traveler template:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/v1/migration/traveler-digitization/templates
 * List all templates
 */
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const templates = await prisma.travelerTemplate.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        documentType: true,
        version: true,
        description: true
      }
    });

    res.json({
      success: true,
      data: templates,
      count: templates.length
    });
  } catch (error) {
    logger.error('Failed to list templates:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/v1/migration/traveler-digitization/templates/:id
 * Get template details
 */
router.get('/templates/:id', async (req: Request, res: Response) => {
  try {
    const template = await prisma.travelerTemplate.findUnique({
      where: { id: req.params.id }
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// Traveler Digitization
// ============================================================================

/**
 * POST /api/v1/migration/traveler-digitization/digitize
 * Upload and digitize a scanned traveler document
 */
router.post('/digitize', upload.single('document'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const templateIds = req.body.templateIds ? JSON.parse(req.body.templateIds) : undefined;

    // Digitize traveler
    const traveler = await digitizationService.digitizeTraveler(
      req.file.buffer,
      req.file.originalname,
      templateIds
    );

    // Store in database
    const dbTraveler = await prisma.digitizedTraveler.create({
      data: {
        sourceFileName: traveler.sourceDocument?.fileName,
        sourceUploadedAt: traveler.sourceDocument?.uploadedAt,
        processingMethod: traveler.sourceDocument?.processingMethod || 'ocr',
        workOrderNumber: traveler.workOrderNumber,
        partNumber: traveler.partNumber,
        partDescription: traveler.partDescription,
        quantity: traveler.quantity,
        dueDate: traveler.dueDate,
        priority: traveler.priority,
        templateId: traveler.extractedFrom?.templateId,
        matchConfidence: traveler.extractedFrom?.matchConfidence,
        status: traveler.status,
        confidence: traveler.confidence,
        warnings: traveler.warnings || [],
        errors: traveler.errors || [],
        createdBy: req.user?.id || 'system'
      }
    });

    // Add operations
    if (traveler.operations && traveler.operations.length > 0) {
      for (const op of traveler.operations) {
        await prisma.digitizedOperation.create({
          data: {
            travelerId: dbTraveler.id,
            operationNumber: op.operationNumber,
            operationDescription: op.operationDescription,
            workCenter: op.workCenter,
            quantity: op.quantity,
            startTime: op.startTime,
            endTime: op.endTime,
            status: op.status,
            notes: op.notes,
            laborHours: op.laborHours,
            materialUsed: op.materialUsed,
            tools: op.tools || [],
            qualityNotes: op.qualityNotes
          }
        });
      }
    }

    logger.info('Traveler digitized', {
      travelerId: dbTraveler.id,
      workOrderNumber: dbTraveler.workOrderNumber,
      status: dbTraveler.status
    });

    res.status(201).json({
      success: true,
      data: {
        id: dbTraveler.id,
        workOrderNumber: dbTraveler.workOrderNumber,
        partNumber: dbTraveler.partNumber,
        status: dbTraveler.status,
        confidence: dbTraveler.confidence,
        templateMatch: traveler.extractedFrom?.templateName
      }
    });
  } catch (error) {
    logger.error('Traveler digitization failed:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Digitization failed'
    });
  }
});

/**
 * POST /api/v1/migration/traveler-digitization/manual
 * Create traveler manually
 */
router.post('/manual', async (req: Request, res: Response) => {
  try {
    const request: ManualEntryRequest = req.body;

    // Validate required fields
    if (!request.workOrderNumber || !request.partNumber || !request.quantity) {
      return res.status(400).json({
        error: 'Missing required fields: workOrderNumber, partNumber, quantity'
      });
    }

    // Create traveler
    const traveler = await digitizationService.createManualEntry(request);

    // Store in database
    const dbTraveler = await prisma.digitizedTraveler.create({
      data: {
        sourceFileName: traveler.sourceDocument?.fileName,
        sourceUploadedAt: traveler.sourceDocument?.uploadedAt,
        processingMethod: 'manual',
        workOrderNumber: traveler.workOrderNumber,
        partNumber: traveler.partNumber,
        partDescription: traveler.partDescription,
        quantity: traveler.quantity,
        dueDate: traveler.dueDate,
        priority: traveler.priority,
        status: traveler.status,
        confidence: traveler.confidence,
        createdBy: req.user?.id || 'system'
      }
    });

    // Add operations
    if (traveler.operations && traveler.operations.length > 0) {
      for (const op of traveler.operations) {
        await prisma.digitizedOperation.create({
          data: {
            travelerId: dbTraveler.id,
            operationNumber: op.operationNumber,
            operationDescription: op.operationDescription,
            workCenter: op.workCenter,
            quantity: op.quantity,
            startTime: op.startTime,
            endTime: op.endTime,
            status: op.status,
            notes: op.notes,
            laborHours: op.laborHours,
            materialUsed: op.materialUsed,
            tools: op.tools || [],
            qualityNotes: op.qualityNotes
          }
        });
      }
    }

    logger.info('Manual traveler entry created', {
      travelerId: dbTraveler.id,
      workOrderNumber: dbTraveler.workOrderNumber
    });

    res.status(201).json({
      success: true,
      data: {
        id: dbTraveler.id,
        workOrderNumber: dbTraveler.workOrderNumber,
        status: dbTraveler.status
      }
    });
  } catch (error) {
    logger.error('Failed to create manual entry:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create entry'
    });
  }
});

/**
 * GET /api/v1/migration/traveler-digitization/travelers/:id
 * Get traveler details
 */
router.get('/travelers/:id', async (req: Request, res: Response) => {
  try {
    const traveler = await prisma.digitizedTraveler.findUnique({
      where: { id: req.params.id },
      include: {
        operations: true,
        template: true
      }
    });

    if (!traveler) {
      return res.status(404).json({ error: 'Traveler not found' });
    }

    res.json({
      success: true,
      data: traveler
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/migration/traveler-digitization/travelers
 * List travelers with filtering
 */
router.get('/travelers', async (req: Request, res: Response) => {
  try {
    const { status, workOrderNumber, partNumber, skip = 0, take = 50 } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (workOrderNumber) where.workOrderNumber = { contains: workOrderNumber as string, mode: 'insensitive' };
    if (partNumber) where.partNumber = { contains: partNumber as string, mode: 'insensitive' };

    const travelers = await prisma.digitizedTraveler.findMany({
      where,
      include: { operations: true },
      skip: Number(skip),
      take: Number(take),
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.digitizedTraveler.count({ where });

    res.json({
      success: true,
      data: travelers,
      pagination: {
        total,
        skip: Number(skip),
        take: Number(take)
      }
    });
  } catch (error) {
    logger.error('Failed to list travelers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// Traveler Review
// ============================================================================

/**
 * GET /api/v1/migration/traveler-digitization/review-queue
 * Get travelers pending review
 */
router.get('/review-queue', async (req: Request, res: Response) => {
  try {
    const travelers = await prisma.digitizedTraveler.findMany({
      where: { status: 'pending_review' },
      include: { operations: true, template: true },
      orderBy: { confidence: 'asc' } // Low confidence first
    });

    res.json({
      success: true,
      data: travelers,
      count: travelers.length
    });
  } catch (error) {
    logger.error('Failed to get review queue:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/migration/traveler-digitization/travelers/:id/review
 * Submit traveler review and approval/rejection
 */
router.post('/travelers/:id/review', async (req: Request, res: Response) => {
  try {
    const reviewData: TravelerReviewData = {
      travelerId: req.params.id,
      ...req.body
    };

    const traveler = await prisma.digitizedTraveler.findUnique({
      where: { id: req.params.id },
      include: { operations: true }
    });

    if (!traveler) {
      return res.status(404).json({ error: 'Traveler not found' });
    }

    if (traveler.status !== 'pending_review') {
      return res.status(400).json({ error: 'Traveler is not pending review' });
    }

    // Apply corrections if provided
    const updateData: any = {
      status: reviewData.approved ? 'approved' : 'rejected',
      reviewerNotes: reviewData.reviewerNotes,
      reviewedBy: req.user?.id || 'system',
      reviewedAt: new Date()
    };

    if (reviewData.corrections && reviewData.corrections.length > 0) {
      for (const correction of reviewData.corrections) {
        // Update traveler or operation fields
        const fieldPath = correction.fieldName.split('.');
        if (fieldPath[0] === 'operations' && !isNaN(Number(fieldPath[1]))) {
          // Update operation
          const opIndex = Number(fieldPath[1]);
          const fieldName = fieldPath[2];
          if (traveler.operations[opIndex]) {
            await prisma.digitizedOperation.update({
              where: { id: traveler.operations[opIndex].id },
              data: { [fieldName]: correction.newValue }
            });
          }
        } else {
          // Update traveler field
          updateData[fieldPath[0]] = correction.newValue;
        }
      }
    }

    const updated = await prisma.digitizedTraveler.update({
      where: { id: req.params.id },
      data: updateData,
      include: { operations: true }
    });

    logger.info('Traveler reviewed', {
      travelerId: req.params.id,
      approved: reviewData.approved
    });

    res.json({
      success: true,
      data: {
        id: updated.id,
        status: updated.status,
        reviewedAt: updated.reviewedAt
      }
    });
  } catch (error) {
    logger.error('Failed to review traveler:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Review failed'
    });
  }
});

/**
 * POST /api/v1/migration/traveler-digitization/travelers/:id/create-work-order
 * Create work order from approved traveler
 */
router.post('/travelers/:id/create-work-order', async (req: Request, res: Response) => {
  try {
    const traveler = await prisma.digitizedTraveler.findUnique({
      where: { id: req.params.id }
    });

    if (!traveler) {
      return res.status(404).json({ error: 'Traveler not found' });
    }

    if (traveler.status !== 'approved') {
      return res.status(400).json({ error: 'Traveler must be approved' });
    }

    // Update traveler status
    const updated = await prisma.digitizedTraveler.update({
      where: { id: req.params.id },
      data: { status: 'work_order_created' }
    });

    // In real implementation, would create actual work order
    // For now, return stub response
    res.status(201).json({
      success: true,
      data: {
        workOrderId: `wo_${Date.now()}`,
        workOrderNumber: traveler.workOrderNumber,
        travelerId: traveler.id,
        createdAt: new Date()
      }
    });
  } catch (error) {
    logger.error('Failed to create work order:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create work order'
    });
  }
});

// ============================================================================
// Batch Processing
// ============================================================================

/**
 * POST /api/v1/migration/traveler-digitization/batch
 * Process batch of documents
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const config: BatchProcessingConfig = req.body;

    if (!config.fileNames || config.fileNames.length === 0) {
      return res.status(400).json({ error: 'No files specified' });
    }

    // Process batch
    const result = await digitizationService.processBatch(config);

    logger.info('Batch processing completed', {
      processed: result.processedCount,
      success: result.successCount
    });

    res.status(202).json({
      success: true,
      data: {
        totalFiles: result.totalFiles,
        processed: result.processedCount,
        success: result.successCount,
        failure: result.failureCount,
        partial: result.partialCount,
        travelersCreated: result.travelersCreated,
        duration: result.duration
      }
    });
  } catch (error) {
    logger.error('Batch processing failed:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Batch processing failed'
    });
  }
});

// ============================================================================
// Work Order Integration (Phase 8)
// ============================================================================

/**
 * POST /api/v1/migration/travelers/:travelerId/create-work-order
 * Create work order from approved traveler
 */
router.post('/travelers/:travelerId/create-work-order', async (req: Request, res: Response) => {
  try {
    const { travelerId } = req.params;

    const result = await workOrderIntegrationService.createWorkOrderFromTraveler(
      travelerId,
      (req as any).user?.id
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    logger.info('Work order created from traveler', {
      travelerId,
      workOrderId: result.workOrderId
    });

    res.status(201).json({
      success: true,
      data: {
        travelerId,
        workOrderId: result.workOrderId,
        workOrderNumber: result.workOrderNumber,
        warnings: result.warnings
      }
    });
  } catch (error) {
    logger.error('Failed to create work order from traveler:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create work order'
    });
  }
});

/**
 * GET /api/v1/migration/travelers/work-order-candidates
 * Get list of travelers ready for work order creation
 */
router.get('/travelers/work-order-candidates', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const result = await workOrderIntegrationService.getWorkOrderCandidates({
      limit,
      offset
    });

    res.status(200).json({
      success: true,
      data: {
        candidates: result.candidates,
        total: result.total,
        limit,
        offset
      }
    });
  } catch (error) {
    logger.error('Failed to get work order candidates:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get candidates'
    });
  }
});

/**
 * POST /api/v1/migration/travelers/bulk-create-work-orders
 * Create work orders for multiple approved travelers
 */
router.post('/travelers/bulk-create-work-orders', async (req: Request, res: Response) => {
  try {
    const { travelerIds } = req.body;

    if (!Array.isArray(travelerIds) || travelerIds.length === 0) {
      return res.status(400).json({
        error: 'travelerIds must be a non-empty array'
      });
    }

    const result = await workOrderIntegrationService.bulkCreateWorkOrders(
      travelerIds,
      (req as any).user?.id
    );

    logger.info('Bulk work order creation submitted', {
      submitted: result.submitted,
      successful: result.successful,
      failed: result.failed
    });

    res.status(202).json({
      success: true,
      data: {
        submitted: result.submitted,
        completed: result.completed,
        successful: result.successful,
        failed: result.failed,
        duration: result.duration,
        results: result.results
      }
    });
  } catch (error) {
    logger.error('Bulk work order creation failed:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Bulk creation failed'
    });
  }
});

/**
 * GET /api/v1/migration/travelers/:travelerId/work-order
 * Get work order linked to traveler
 */
router.get('/travelers/:travelerId/work-order', async (req: Request, res: Response) => {
  try {
    const { travelerId } = req.params;

    const workOrder = await workOrderIntegrationService.getTravelerWorkOrder(travelerId);

    if (!workOrder) {
      return res.status(404).json({
        error: 'No work order found for this traveler'
      });
    }

    res.status(200).json({
      success: true,
      data: workOrder
    });
  } catch (error) {
    logger.error('Failed to get traveler work order:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get work order'
    });
  }
});

export default router;
