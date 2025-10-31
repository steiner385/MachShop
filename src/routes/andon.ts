/**
 * Andon API Routes
 * GitHub Issue #171: Production Alerts & Andon Core Infrastructure
 *
 * REST API endpoints for Andon system including:
 * - Alert management (create, read, update, close)
 * - Issue type management
 * - Escalation rule management
 * - System statistics and analytics
 * - Manual escalation triggers
 */

import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AndonService } from '../services/AndonService';
import { AndonEscalationEngine } from '../services/AndonEscalationEngine';
import { asyncHandler, ValidationError, NotFoundError, ForbiddenError } from '../middleware/errorHandler';
import { requireSiteAccess, requireAdminAccess } from '../middleware/auth';
import { auditLogger } from '../middleware/requestLogger';
import { logger } from '../utils/logger';
import { AndonSeverity, AndonPriority, AndonAlertStatus } from '@prisma/client';

const router = express.Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

// Alert schemas
const createAlertSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  issueTypeId: z.string().min(1, 'Issue type ID is required'),
  severity: z.nativeEnum(AndonSeverity).optional(),
  priority: z.nativeEnum(AndonPriority).optional(),
  siteId: z.string().optional(),
  areaId: z.string().optional(),
  workCenterId: z.string().optional(),
  equipmentId: z.string().optional(),
  workOrderId: z.string().optional(),
  operationId: z.string().optional(),
  raisedById: z.string().min(1, 'Raised by user ID is required'),
  metadata: z.any().optional(),
  attachments: z.array(z.any()).optional()
});

const updateAlertSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  severity: z.nativeEnum(AndonSeverity).optional(),
  priority: z.nativeEnum(AndonPriority).optional(),
  assignedToId: z.string().optional(),
  status: z.nativeEnum(AndonAlertStatus).optional(),
  resolutionNotes: z.string().max(1000).optional(),
  resolutionActionTaken: z.string().max(1000).optional(),
  metadata: z.any().optional(),
  attachments: z.array(z.any()).optional()
});

const closeAlertSchema = z.object({
  resolutionNotes: z.string().max(1000).optional(),
  resolutionActionTaken: z.string().max(1000).optional()
});

const alertFiltersSchema = z.object({
  status: z.array(z.nativeEnum(AndonAlertStatus)).optional(),
  severity: z.array(z.nativeEnum(AndonSeverity)).optional(),
  priority: z.array(z.nativeEnum(AndonPriority)).optional(),
  issueTypeId: z.string().optional(),
  siteId: z.string().optional(),
  areaId: z.string().optional(),
  workCenterId: z.string().optional(),
  equipmentId: z.string().optional(),
  raisedById: z.string().optional(),
  assignedToId: z.string().optional(),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  isOverdue: z.boolean().optional(),
  search: z.string().optional(),
  page: z.number().int().positive().optional().default(1),
  pageSize: z.number().int().positive().max(100).optional().default(20),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

// Issue type schemas
const createIssueTypeSchema = z.object({
  typeCode: z.string().min(1, 'Type code is required').max(50),
  typeName: z.string().min(1, 'Type name is required').max(200),
  description: z.string().max(1000).optional(),
  defaultSeverity: z.nativeEnum(AndonSeverity).optional(),
  defaultPriority: z.nativeEnum(AndonPriority).optional(),
  requiresAttachment: z.boolean().optional(),
  requiresWorkOrder: z.boolean().optional(),
  requiresEquipment: z.boolean().optional(),
  autoAssignRole: z.string().optional(),
  autoAssignUserId: z.string().optional(),
  enableEscalation: z.boolean().optional(),
  escalationTimeoutMins: z.number().int().positive().optional(),
  siteId: z.string().optional(),
  iconName: z.string().optional(),
  colorCode: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color code').optional(),
  displayOrder: z.number().int().optional()
});

const updateIssueTypeSchema = z.object({
  typeName: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  defaultSeverity: z.nativeEnum(AndonSeverity).optional(),
  defaultPriority: z.nativeEnum(AndonPriority).optional(),
  requiresAttachment: z.boolean().optional(),
  requiresWorkOrder: z.boolean().optional(),
  requiresEquipment: z.boolean().optional(),
  autoAssignRole: z.string().optional(),
  autoAssignUserId: z.string().optional(),
  enableEscalation: z.boolean().optional(),
  escalationTimeoutMins: z.number().int().positive().optional(),
  iconName: z.string().optional(),
  colorCode: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color code').optional(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional()
});

// Escalation rule schemas
const createEscalationRuleSchema = z.object({
  ruleName: z.string().min(1, 'Rule name is required').max(200),
  description: z.string().max(1000).optional(),
  siteId: z.string().optional(),
  issueTypeId: z.string().optional(),
  triggerSeverity: z.array(z.nativeEnum(AndonSeverity)).min(1, 'At least one severity required'),
  triggerAfterMinutes: z.number().int().positive(),
  escalationLevel: z.number().int().positive(),
  notifyUserIds: z.array(z.string()).optional(),
  notifyRoles: z.array(z.string()).optional(),
  notifyChannels: z.array(z.string()).optional(),
  assignToUserId: z.string().optional(),
  assignToRole: z.string().optional(),
  conditions: z.any().optional(),
  priority: z.number().int().optional()
});

const updateEscalationRuleSchema = z.object({
  ruleName: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  triggerSeverity: z.array(z.nativeEnum(AndonSeverity)).min(1).optional(),
  triggerAfterMinutes: z.number().int().positive().optional(),
  escalationLevel: z.number().int().positive().optional(),
  notifyUserIds: z.array(z.string()).optional(),
  notifyRoles: z.array(z.string()).optional(),
  notifyChannels: z.array(z.string()).optional(),
  assignToUserId: z.string().optional(),
  assignToRole: z.string().optional(),
  conditions: z.any().optional(),
  isActive: z.boolean().optional(),
  priority: z.number().int().optional()
});

// ============================================================================
// ANDON ALERT ROUTES
// ============================================================================

/**
 * @route POST /api/v1/andon/alerts
 * @desc Create a new Andon alert
 * @access Private - Requires site access
 */
router.post('/alerts',
  requireSiteAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const validationResult = createAlertSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid alert data', validationResult.error.errors);
    }

    const alertData = validationResult.data;

    // Ensure user has access to the site if specified
    if (alertData.siteId && !req.user?.sites?.includes(alertData.siteId)) {
      throw new ForbiddenError('Access denied to specified site');
    }

    const alert = await AndonService.createAndonAlert(alertData);

    auditLogger.info('Andon alert created', {
      userId: req.user?.id,
      alertId: alert.id,
      alertNumber: alert.alertNumber,
      issueTypeId: alert.issueTypeId,
      severity: alert.severity
    });

    res.status(201).json({
      success: true,
      data: alert,
      message: 'Andon alert created successfully'
    });
  })
);

/**
 * @route GET /api/v1/andon/alerts
 * @desc Get Andon alerts with filtering and pagination
 * @access Private - Requires site access
 */
router.get('/alerts',
  requireSiteAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const validationResult = alertFiltersSchema.safeParse({
      ...req.query,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
      status: req.query.status ? (Array.isArray(req.query.status) ? req.query.status : [req.query.status]) : undefined,
      severity: req.query.severity ? (Array.isArray(req.query.severity) ? req.query.severity : [req.query.severity]) : undefined,
      priority: req.query.priority ? (Array.isArray(req.query.priority) ? req.query.priority : [req.query.priority]) : undefined,
      isOverdue: req.query.isOverdue === 'true' ? true : req.query.isOverdue === 'false' ? false : undefined,
      createdAfter: req.query.createdAfter ? new Date(req.query.createdAfter as string).toISOString() : undefined,
      createdBefore: req.query.createdBefore ? new Date(req.query.createdBefore as string).toISOString() : undefined
    });

    if (!validationResult.success) {
      throw new ValidationError('Invalid query parameters', validationResult.error.errors);
    }

    const { search, ...filters } = validationResult.data;
    const { page, pageSize, sortBy, sortOrder, ...filterOptions } = filters;

    const pagination = { page, pageSize, sortBy, sortOrder };

    let result;
    if (search) {
      result = await AndonService.searchAndonAlerts(search, filterOptions, pagination);
    } else {
      result = await AndonService.listAndonAlerts(filterOptions, pagination);
    }

    res.json({
      success: true,
      data: result.alerts,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages
      }
    });
  })
);

/**
 * @route GET /api/v1/andon/alerts/:id
 * @desc Get specific Andon alert by ID
 * @access Private - Requires site access
 */
router.get('/alerts/:id',
  requireSiteAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const includeRelations = req.query.include === 'true';

    const alert = await AndonService.getAndonAlertById(id, includeRelations);

    if (!alert) {
      throw new NotFoundError('Andon alert not found');
    }

    // Check site access
    if (alert.siteId && !req.user?.sites?.includes(alert.siteId)) {
      throw new ForbiddenError('Access denied to this alert');
    }

    res.json({
      success: true,
      data: alert
    });
  })
);

/**
 * @route PUT /api/v1/andon/alerts/:id
 * @desc Update an Andon alert
 * @access Private - Requires site access
 */
router.put('/alerts/:id',
  requireSiteAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const validationResult = updateAlertSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid alert update data', validationResult.error.errors);
    }

    // Check if alert exists and user has access
    const existingAlert = await AndonService.getAndonAlertById(id);
    if (!existingAlert) {
      throw new NotFoundError('Andon alert not found');
    }

    if (existingAlert.siteId && !req.user?.sites?.includes(existingAlert.siteId)) {
      throw new ForbiddenError('Access denied to this alert');
    }

    const updatedAlert = await AndonService.updateAndonAlert(id, validationResult.data);

    auditLogger.info('Andon alert updated', {
      userId: req.user?.id,
      alertId: id,
      changes: validationResult.data
    });

    res.json({
      success: true,
      data: updatedAlert,
      message: 'Andon alert updated successfully'
    });
  })
);

/**
 * @route POST /api/v1/andon/alerts/:id/close
 * @desc Close an Andon alert
 * @access Private - Requires site access
 */
router.post('/alerts/:id/close',
  requireSiteAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const validationResult = closeAlertSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid close alert data', validationResult.error.errors);
    }

    // Check if alert exists and user has access
    const existingAlert = await AndonService.getAndonAlertById(id);
    if (!existingAlert) {
      throw new NotFoundError('Andon alert not found');
    }

    if (existingAlert.siteId && !req.user?.sites?.includes(existingAlert.siteId)) {
      throw new ForbiddenError('Access denied to this alert');
    }

    if (!req.user?.id) {
      throw new ValidationError('User ID is required');
    }

    const closedAlert = await AndonService.closeAndonAlert(
      id,
      req.user.id,
      validationResult.data.resolutionNotes,
      validationResult.data.resolutionActionTaken
    );

    auditLogger.info('Andon alert closed', {
      userId: req.user.id,
      alertId: id,
      resolutionNotes: validationResult.data.resolutionNotes
    });

    res.json({
      success: true,
      data: closedAlert,
      message: 'Andon alert closed successfully'
    });
  })
);

/**
 * @route POST /api/v1/andon/alerts/:id/escalate
 * @desc Manually trigger escalation for an alert
 * @access Private - Requires site access
 */
router.post('/alerts/:id/escalate',
  requireSiteAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Check if alert exists and user has access
    const existingAlert = await AndonService.getAndonAlertById(id);
    if (!existingAlert) {
      throw new NotFoundError('Andon alert not found');
    }

    if (existingAlert.siteId && !req.user?.sites?.includes(existingAlert.siteId)) {
      throw new ForbiddenError('Access denied to this alert');
    }

    const escalationResult = await AndonEscalationEngine.forceEscalation(id);

    auditLogger.info('Andon alert manually escalated', {
      userId: req.user?.id,
      alertId: id,
      escalationResult: escalationResult.success
    });

    res.json({
      success: true,
      data: escalationResult,
      message: 'Alert escalation triggered successfully'
    });
  })
);

// ============================================================================
// ISSUE TYPE ROUTES
// ============================================================================

/**
 * @route POST /api/v1/andon/issue-types
 * @desc Create a new issue type
 * @access Private - Requires admin access
 */
router.post('/issue-types',
  requireAdminAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const validationResult = createIssueTypeSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid issue type data', validationResult.error.errors);
    }

    if (!req.user?.id) {
      throw new ValidationError('User ID is required');
    }

    const issueTypeData = { ...validationResult.data, createdBy: req.user.id };
    const issueType = await AndonService.createAndonIssueType(issueTypeData);

    auditLogger.info('Andon issue type created', {
      userId: req.user.id,
      issueTypeId: issueType.id,
      typeCode: issueType.typeCode
    });

    res.status(201).json({
      success: true,
      data: issueType,
      message: 'Issue type created successfully'
    });
  })
);

/**
 * @route GET /api/v1/andon/issue-types
 * @desc Get issue types list
 * @access Private - Requires site access
 */
router.get('/issue-types',
  requireSiteAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const siteId = req.query.siteId as string;
    const activeOnly = req.query.activeOnly !== 'false';

    const issueTypes = await AndonService.listAndonIssueTypes(siteId, activeOnly);

    res.json({
      success: true,
      data: issueTypes
    });
  })
);

/**
 * @route GET /api/v1/andon/issue-types/:id
 * @desc Get specific issue type by ID
 * @access Private - Requires site access
 */
router.get('/issue-types/:id',
  requireSiteAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const includeRelations = req.query.include === 'true';

    const issueType = await AndonService.getAndonIssueTypeById(id, includeRelations);

    if (!issueType) {
      throw new NotFoundError('Issue type not found');
    }

    res.json({
      success: true,
      data: issueType
    });
  })
);

/**
 * @route PUT /api/v1/andon/issue-types/:id
 * @desc Update an issue type
 * @access Private - Requires admin access
 */
router.put('/issue-types/:id',
  requireAdminAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const validationResult = updateIssueTypeSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid issue type update data', validationResult.error.errors);
    }

    if (!req.user?.id) {
      throw new ValidationError('User ID is required');
    }

    const updateData = { ...validationResult.data, updatedBy: req.user.id };
    const updatedIssueType = await AndonService.updateAndonIssueType(id, updateData);

    auditLogger.info('Andon issue type updated', {
      userId: req.user.id,
      issueTypeId: id,
      changes: validationResult.data
    });

    res.json({
      success: true,
      data: updatedIssueType,
      message: 'Issue type updated successfully'
    });
  })
);

// ============================================================================
// ESCALATION RULE ROUTES
// ============================================================================

/**
 * @route POST /api/v1/andon/escalation-rules
 * @desc Create a new escalation rule
 * @access Private - Requires admin access
 */
router.post('/escalation-rules',
  requireAdminAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const validationResult = createEscalationRuleSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid escalation rule data', validationResult.error.errors);
    }

    if (!req.user?.id) {
      throw new ValidationError('User ID is required');
    }

    const ruleData = { ...validationResult.data, createdBy: req.user.id };
    const rule = await AndonService.createAndonEscalationRule(ruleData);

    auditLogger.info('Andon escalation rule created', {
      userId: req.user.id,
      ruleId: rule.id,
      ruleName: rule.ruleName
    });

    res.status(201).json({
      success: true,
      data: rule,
      message: 'Escalation rule created successfully'
    });
  })
);

/**
 * @route GET /api/v1/andon/escalation-rules
 * @desc Get escalation rules list
 * @access Private - Requires admin access
 */
router.get('/escalation-rules',
  requireAdminAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const siteId = req.query.siteId as string;
    const issueTypeId = req.query.issueTypeId as string;
    const activeOnly = req.query.activeOnly !== 'false';

    const rules = await AndonService.listAndonEscalationRules(siteId, issueTypeId, activeOnly);

    res.json({
      success: true,
      data: rules
    });
  })
);

/**
 * @route GET /api/v1/andon/escalation-rules/:id
 * @desc Get specific escalation rule by ID
 * @access Private - Requires admin access
 */
router.get('/escalation-rules/:id',
  requireAdminAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const includeRelations = req.query.include === 'true';

    const rule = await AndonService.getAndonEscalationRuleById(id, includeRelations);

    if (!rule) {
      throw new NotFoundError('Escalation rule not found');
    }

    res.json({
      success: true,
      data: rule
    });
  })
);

/**
 * @route POST /api/v1/andon/escalation-rules/:id/test
 * @desc Test an escalation rule with a specific alert
 * @access Private - Requires admin access
 */
router.post('/escalation-rules/:id/test',
  requireAdminAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { id: ruleId } = req.params;
    const { alertId } = req.body;

    if (!alertId) {
      throw new ValidationError('Alert ID is required for testing');
    }

    const result = await AndonEscalationEngine.testEscalationRule(ruleId, alertId);

    res.json({
      success: true,
      data: result,
      message: 'Escalation rule tested successfully'
    });
  })
);

// ============================================================================
// SYSTEM STATISTICS AND ANALYTICS
// ============================================================================

/**
 * @route GET /api/v1/andon/stats
 * @desc Get Andon system statistics
 * @access Private - Requires site access
 */
router.get('/stats',
  requireSiteAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const siteId = req.query.siteId as string;
    const from = req.query.from ? new Date(req.query.from as string) : undefined;
    const to = req.query.to ? new Date(req.query.to as string) : undefined;

    const dateRange = from && to ? { from, to } : undefined;

    const stats = await AndonService.getAndonSystemStats(siteId, dateRange);

    res.json({
      success: true,
      data: stats
    });
  })
);

/**
 * @route GET /api/v1/andon/escalation-stats
 * @desc Get escalation system statistics
 * @access Private - Requires admin access
 */
router.get('/escalation-stats',
  requireAdminAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const siteId = req.query.siteId as string;
    const from = req.query.from ? new Date(req.query.from as string) : undefined;
    const to = req.query.to ? new Date(req.query.to as string) : undefined;

    const dateRange = from && to ? { from, to } : undefined;

    const stats = await AndonEscalationEngine.getEscalationStats(siteId, dateRange);

    res.json({
      success: true,
      data: stats
    });
  })
);

/**
 * @route GET /api/v1/andon/overdue-alerts
 * @desc Get alerts that are overdue for escalation
 * @access Private - Requires site access
 */
router.get('/overdue-alerts',
  requireSiteAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const siteId = req.query.siteId as string;

    const overdueAlerts = await AndonService.getOverdueAlerts(siteId);

    res.json({
      success: true,
      data: overdueAlerts,
      count: overdueAlerts.length
    });
  })
);

/**
 * @route POST /api/v1/andon/process-escalations
 * @desc Manually trigger escalation processing
 * @access Private - Requires admin access
 */
router.post('/process-escalations',
  requireAdminAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const siteId = req.query.siteId as string;

    const stats = await AndonEscalationEngine.processEscalations(siteId);

    auditLogger.info('Manual escalation processing triggered', {
      userId: req.user?.id,
      siteId,
      stats
    });

    res.json({
      success: true,
      data: stats,
      message: 'Escalation processing completed'
    });
  })
);

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================

router.use((error: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Andon API Error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    userId: req.user?.id
  });

  if (error instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: error.message,
      details: error.details
    });
  }

  if (error instanceof NotFoundError) {
    return res.status(404).json({
      success: false,
      error: 'Not Found',
      message: error.message
    });
  }

  if (error instanceof ForbiddenError) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: error.message
    });
  }

  // Generic error response
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: 'An unexpected error occurred'
  });
});

export default router;