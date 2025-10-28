/**
 * Unified Document API Routes
 * GitHub Issue #23: Multi-Document Type Support Extension
 *
 * REST API endpoints for unified document operations across all document types
 */

import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { unifiedDocumentService } from '../services/UnifiedDocumentService';
import { logger } from '../utils/logger';
import { DocumentType } from '@prisma/client';

const router = express.Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const searchDocumentsSchema = z.object({
  query: z.string().optional(),
  documentTypes: z.array(z.nativeEnum(DocumentType)).optional(),
  partId: z.string().optional(),
  operationId: z.string().optional(),
  workCenterId: z.string().optional(),
  status: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  createdBy: z.string().optional(),
  approvedBy: z.string().optional(),
  page: z.number().int().positive().optional().default(1),
  pageSize: z.number().int().positive().max(100).optional().default(25),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'documentNumber', 'status']).optional().default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

const bulkUpdateSchema = z.object({
  documentIds: z.array(z.string()).min(1, 'At least one document ID is required'),
  updates: z.object({
    tags: z.array(z.string()).optional(),
    categories: z.array(z.string()).optional(),
    status: z.string().optional()
  })
});

const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  documentType: z.nativeEnum(DocumentType),
  templateData: z.record(z.any()),
  tags: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  isPublic: z.boolean().optional().default(false)
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  templateData: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  isPublic: z.boolean().optional()
});

// ============================================================================
// UNIFIED SEARCH ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/documents/search
 * @desc    Search across all document types
 * @access  Private
 */
router.post('/search', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const validatedData = searchDocumentsSchema.parse(req.body);

    const searchParams = {
      ...validatedData,
      dateFrom: validatedData.dateFrom ? new Date(validatedData.dateFrom) : undefined,
      dateTo: validatedData.dateTo ? new Date(validatedData.dateTo) : undefined
    };

    const result = await unifiedDocumentService.searchAllDocuments(searchParams);

    logger.info('Unified document search performed', {
      userId: (req as any).user?.id,
      query: validatedData.query,
      documentTypes: validatedData.documentTypes,
      resultCount: result.documents.length,
      totalCount: result.totalCount
    });

    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   GET /api/v1/documents/search
 * @desc    Search across all document types (GET version for simple queries)
 * @access  Private
 */
router.get('/search', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const searchParams = {
      query: req.query.q as string,
      documentTypes: req.query.types ? (req.query.types as string).split(',') as DocumentType[] : undefined,
      partId: req.query.partId as string,
      operationId: req.query.operationId as string,
      workCenterId: req.query.workCenterId as string,
      status: req.query.status ? (req.query.status as string).split(',') : undefined,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      categories: req.query.categories ? (req.query.categories as string).split(',') : undefined,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      createdBy: req.query.createdBy as string,
      approvedBy: req.query.approvedBy as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 25,
      sortBy: (req.query.sortBy as any) || 'updatedAt',
      sortOrder: (req.query.sortOrder as any) || 'desc'
    };

    const result = await unifiedDocumentService.searchAllDocuments(searchParams);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// DOCUMENT CONTEXT ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/v1/documents/part/:partId
 * @desc    Get all documents for a specific part
 * @access  Private
 */
router.get('/part/:partId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { partId } = req.params;
    const documentTypes = req.query.types ? (req.query.types as string).split(',') as DocumentType[] : undefined;

    const documents = await unifiedDocumentService.getDocumentsByPart(partId, documentTypes);

    res.json(documents);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/documents/operation/:operationId
 * @desc    Get all documents for a specific operation
 * @access  Private
 */
router.get('/operation/:operationId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { operationId } = req.params;
    const documentTypes = req.query.types ? (req.query.types as string).split(',') as DocumentType[] : undefined;

    const documents = await unifiedDocumentService.getDocumentsByOperation(operationId, documentTypes);

    res.json(documents);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/documents/work-center/:workCenterId
 * @desc    Get all documents for a specific work center
 * @access  Private
 */
router.get('/work-center/:workCenterId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { workCenterId } = req.params;
    const documentTypes = req.query.types ? (req.query.types as string).split(',') as DocumentType[] : undefined;

    const documents = await unifiedDocumentService.getDocumentsByWorkCenter(workCenterId, documentTypes);

    res.json(documents);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// IMPACT ANALYSIS ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/v1/documents/impact-analysis/part/:partId
 * @desc    Analyze impact of changes to a part across all document types
 * @access  Private
 */
router.get('/impact-analysis/part/:partId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { partId } = req.params;

    const impact = await unifiedDocumentService.analyzePartImpact(partId);

    logger.info('Part impact analysis performed', {
      userId: (req as any).user?.id,
      partId,
      totalDocuments: impact.totalDocuments,
      documentTypes: Object.keys(impact.documentsByType)
    });

    res.json(impact);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/documents/impact-analysis/operation/:operationId
 * @desc    Analyze impact of changes to an operation across all document types
 * @access  Private
 */
router.get('/impact-analysis/operation/:operationId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { operationId } = req.params;

    const impact = await unifiedDocumentService.analyzeOperationImpact(operationId);

    logger.info('Operation impact analysis performed', {
      userId: (req as any).user?.id,
      operationId,
      totalDocuments: impact.totalDocuments,
      documentTypes: Object.keys(impact.documentsByType)
    });

    res.json(impact);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/documents/impact-analysis/work-center/:workCenterId
 * @desc    Analyze impact of changes to a work center across all document types
 * @access  Private
 */
router.get('/impact-analysis/work-center/:workCenterId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { workCenterId } = req.params;

    const impact = await unifiedDocumentService.analyzeWorkCenterImpact(workCenterId);

    logger.info('Work center impact analysis performed', {
      userId: (req as any).user?.id,
      workCenterId,
      totalDocuments: impact.totalDocuments,
      documentTypes: Object.keys(impact.documentsByType)
    });

    res.json(impact);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// BULK OPERATIONS ENDPOINTS
// ============================================================================

/**
 * @route   PUT /api/v1/documents/bulk-update
 * @desc    Bulk update documents across types
 * @access  Private
 */
router.put('/bulk-update', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const validatedData = bulkUpdateSchema.parse(req.body);

    // Get user ID from auth middleware
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const result = await unifiedDocumentService.bulkUpdateDocuments(
      validatedData.documentIds,
      validatedData.updates,
      userId
    );

    logger.info('Bulk document update performed', {
      userId,
      documentCount: validatedData.documentIds.length,
      updates: Object.keys(validatedData.updates),
      successCount: result.successCount,
      failureCount: result.failureCount
    });

    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   POST /api/v1/documents/bulk-approve
 * @desc    Bulk approve documents across types
 * @access  Private
 */
router.post('/bulk-approve', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { documentIds } = req.body;

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      res.status(400).json({ error: 'Document IDs array is required' });
      return;
    }

    // Get user ID from auth middleware
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const result = await unifiedDocumentService.bulkApproveDocuments(documentIds, userId);

    logger.info('Bulk document approval performed', {
      userId,
      documentCount: documentIds.length,
      successCount: result.successCount,
      failureCount: result.failureCount
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// DOCUMENT TEMPLATE ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/documents/templates
 * @desc    Create document template
 * @access  Private
 */
router.post('/templates', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const validatedData = createTemplateSchema.parse(req.body);

    // Get user ID from auth middleware
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const template = await unifiedDocumentService.createDocumentTemplate({
      ...validatedData,
      createdBy: userId
    });

    logger.info('Document template created', {
      userId,
      templateId: template.id,
      templateName: template.name,
      documentType: template.documentType
    });

    res.status(201).json(template);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   GET /api/v1/documents/templates
 * @desc    List document templates
 * @access  Private
 */
router.get('/templates', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const queryParams = {
      documentType: req.query.documentType as DocumentType,
      createdBy: req.query.createdBy as string,
      isPublic: req.query.isPublic === 'true' ? true : req.query.isPublic === 'false' ? false : undefined,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      categories: req.query.categories ? (req.query.categories as string).split(',') : undefined,
      search: req.query.search as string
    };

    const templates = await unifiedDocumentService.listDocumentTemplates(queryParams);

    res.json(templates);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/documents/templates/:id
 * @desc    Get document template by ID
 * @access  Private
 */
router.get('/templates/:id', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    const template = await unifiedDocumentService.getDocumentTemplateById(id);

    if (!template) {
      res.status(404).json({ error: 'Document template not found' });
      return;
    }

    res.json(template);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/documents/templates/:id
 * @desc    Update document template
 * @access  Private
 */
router.put('/templates/:id', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const validatedData = updateTemplateSchema.parse(req.body);

    // Get user ID from auth middleware
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const template = await unifiedDocumentService.updateDocumentTemplate(id, validatedData, userId);

    res.json(template);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/documents/templates/:id
 * @desc    Delete document template
 * @access  Private
 */
router.delete('/templates/:id', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    await unifiedDocumentService.deleteDocumentTemplate(id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/documents/templates/:id/use
 * @desc    Create document from template
 * @access  Private
 */
router.post('/templates/:id/use', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const { customData } = req.body;

    // Get user ID from auth middleware
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const document = await unifiedDocumentService.createDocumentFromTemplate(id, customData, userId);

    logger.info('Document created from template', {
      userId,
      templateId: id,
      documentId: document.id,
      documentType: document.type
    });

    res.status(201).json(document);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// ANALYTICS AND REPORTING ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/v1/documents/analytics/summary
 * @desc    Get document analytics summary
 * @access  Private
 */
router.get('/analytics/summary', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const departmentFilter = req.query.department as string;

    const analytics = await unifiedDocumentService.getDocumentAnalytics({
      days,
      departmentFilter
    });

    res.json(analytics);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/documents/analytics/trends
 * @desc    Get document creation and update trends
 * @access  Private
 */
router.get('/analytics/trends', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const documentType = req.query.documentType as DocumentType;

    const trends = await unifiedDocumentService.getDocumentTrends({
      days,
      documentType
    });

    res.json(trends);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/documents/analytics/status-distribution
 * @desc    Get document status distribution across types
 * @access  Private
 */
router.get('/analytics/status-distribution', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const documentType = req.query.documentType as DocumentType;

    const distribution = await unifiedDocumentService.getDocumentStatusDistribution(documentType);

    res.json(distribution);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// UTILITY ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/v1/documents/types
 * @desc    Get available document types and their counts
 * @access  Private
 */
router.get('/types', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const types = await unifiedDocumentService.getDocumentTypeCounts();

    res.json(types);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/documents/tags
 * @desc    Get all available tags across document types
 * @access  Private
 */
router.get('/tags', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const documentType = req.query.documentType as DocumentType;
    const tags = await unifiedDocumentService.getAllDocumentTags(documentType);

    res.json(tags);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/documents/categories
 * @desc    Get all available categories across document types
 * @access  Private
 */
router.get('/categories', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const documentType = req.query.documentType as DocumentType;
    const categories = await unifiedDocumentService.getAllDocumentCategories(documentType);

    res.json(categories);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/documents/health-check
 * @desc    Health check for document system
 * @access  Private
 */
router.get('/health-check', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const healthStatus = await unifiedDocumentService.getSystemHealthCheck();

    res.json(healthStatus);
  } catch (error) {
    next(error);
  }
});

export default router;