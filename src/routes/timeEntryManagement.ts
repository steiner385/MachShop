/**
 * Time Entry Management API Routes
 * RESTful API endpoints for time entry editing, approvals, and management
 *
 * GitHub Issue #51: Time Entry Management & Approvals System
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import {
  timeEntryEditService,
  TimeEntryEditRequest,
  BulkEditRequest,
  SplitTimeEntryRequest,
  MergeTimeEntriesRequest,
} from '../services/TimeEntryEditService';
import {
  timeEntryApprovalService,
  ApprovalRequest,
  BulkApprovalRequest,
  EscalationRequest,
  DelegationRequest,
} from '../services/TimeEntryApprovalService';
import {
  autoStopService,
  PromptResponse,
} from '../services/AutoStopService';
import { requireAuth, requirePermission } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// ============================================================================
// Validation Schemas
// ============================================================================

const timeEntryEditSchema = z.object({
  timeEntryId: z.string(),
  timeEntryType: z.enum(['LABOR', 'MACHINE']),
  editType: z.enum(['CREATED', 'MODIFIED', 'DELETED', 'SPLIT', 'MERGED', 'TRANSFERRED', 'LOCKED', 'UNLOCKED']),
  originalValues: z.record(z.any()),
  newValues: z.record(z.any()),
  changedFields: z.array(z.string()),
  reason: z.string().min(1),
  reasonCategory: z.enum([
    'TIME_CORRECTION',
    'WORK_ORDER_CORRECTION',
    'RATE_ADJUSTMENT',
    'ADMINISTRATIVE',
    'SYSTEM_AUTOMATED',
    'DATA_MIGRATION',
    'ERROR_CORRECTION',
    'POLICY_COMPLIANCE',
    'OTHER'
  ]),
  entrySource: z.string().optional(),
  deviceId: z.string().optional(),
});

const bulkEditSchema = z.object({
  timeEntryIds: z.array(z.string()).min(1).max(50),
  timeEntryType: z.enum(['LABOR', 'MACHINE']),
  editType: z.enum(['CREATED', 'MODIFIED', 'DELETED', 'SPLIT', 'MERGED', 'TRANSFERRED', 'LOCKED', 'UNLOCKED']),
  newValues: z.record(z.any()),
  reason: z.string().min(1),
  reasonCategory: z.enum([
    'TIME_CORRECTION',
    'WORK_ORDER_CORRECTION',
    'RATE_ADJUSTMENT',
    'ADMINISTRATIVE',
    'SYSTEM_AUTOMATED',
    'DATA_MIGRATION',
    'ERROR_CORRECTION',
    'POLICY_COMPLIANCE',
    'OTHER'
  ]),
});

const splitTimeEntrySchema = z.object({
  timeEntryId: z.string(),
  timeEntryType: z.enum(['LABOR', 'MACHINE']),
  splitPoints: z.array(z.object({
    endTime: z.string().datetime(),
    workOrderId: z.string().optional(),
    operationId: z.string().optional(),
    indirectCodeId: z.string().optional(),
  })).min(1).max(10),
  reason: z.string().min(1),
});

const mergeTimeEntriesSchema = z.object({
  timeEntryIds: z.array(z.string()).min(2).max(10),
  timeEntryType: z.enum(['LABOR', 'MACHINE']),
  targetWorkOrderId: z.string().optional(),
  targetOperationId: z.string().optional(),
  targetIndirectCodeId: z.string().optional(),
  reason: z.string().min(1),
});

const approvalSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'MORE_INFO_NEEDED', 'ESCALATED', 'AUTO_APPROVED']),
  approvalNotes: z.string().optional(),
  delegateTo: z.string().optional(),
  escalateTo: z.string().optional(),
  conditions: z.record(z.any()).optional(),
});

const bulkApprovalSchema = z.object({
  timeEntryEditIds: z.array(z.string()).min(1).max(50),
  status: z.enum(['APPROVED', 'REJECTED']),
  approvalNotes: z.string().optional(),
  batchName: z.string().optional(),
});

const escalationSchema = z.object({
  toUserId: z.string(),
  reason: z.string().min(1),
  notes: z.string().optional(),
});

const delegationSchema = z.object({
  toUserId: z.string(),
  delegationType: z.enum(['TEMPORARY', 'PERMANENT']),
  expiryDate: z.string().datetime().optional(),
  scope: z.object({
    siteIds: z.array(z.string()).optional(),
    userIds: z.array(z.string()).optional(),
    maxAmount: z.number().optional(),
  }).optional(),
  reason: z.string().min(1),
});

const promptResponseSchema = z.object({
  response: z.enum(['CONTINUE', 'STOP', 'EXTEND']),
  extensionMinutes: z.number().min(5).max(480).optional(),
  reason: z.string().optional(),
});

const pendingApprovalsQuerySchema = z.object({
  siteId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
  sortBy: z.enum(['oldest', 'newest', 'priority']).optional(),
  editType: z.array(z.string()).optional(),
  riskScoreMin: z.coerce.number().optional(),
  riskScoreMax: z.coerce.number().optional(),
  amountMin: z.coerce.number().optional(),
  amountMax: z.coerce.number().optional(),
});

const metricsQuerySchema = z.object({
  siteId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// ============================================================================
// Time Entry Edit Endpoints
// ============================================================================

/**
 * POST /api/v1/time-entry-management/edits
 * Create a new time entry edit
 */
router.post('/edits', requireAuth, requirePermission('timetracking.edit'), async (req: Request, res: Response) => {
  try {
    const validatedData = timeEntryEditSchema.parse(req.body);
    const userId = (req as any).user.id;

    const editRequest: TimeEntryEditRequest = {
      ...validatedData,
      editedBy: userId,
    };

    const edit = await timeEntryEditService.createEdit(editRequest);

    res.status(201).json({
      success: true,
      data: edit,
      message: 'Time entry edit created successfully'
    });
  } catch (error) {
    console.error('Time entry edit error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create time entry edit'
    });
  }
});

/**
 * POST /api/v1/time-entry-management/edits/bulk
 * Create bulk time entry edits
 */
router.post('/edits/bulk', requireAuth, requirePermission('timetracking.bulk_edit'), async (req: Request, res: Response) => {
  try {
    const validatedData = bulkEditSchema.parse(req.body);
    const userId = (req as any).user.id;

    const bulkRequest: BulkEditRequest = {
      ...validatedData,
      editedBy: userId,
    };

    // Create individual edits for each time entry
    const edits = [];
    for (const timeEntryId of bulkRequest.timeEntryIds) {
      const edit = await timeEntryEditService.createEdit({
        timeEntryId,
        timeEntryType: bulkRequest.timeEntryType,
        editType: bulkRequest.editType,
        originalValues: {}, // Would be populated by service
        newValues: bulkRequest.newValues,
        changedFields: Object.keys(bulkRequest.newValues),
        reason: bulkRequest.reason,
        reasonCategory: bulkRequest.reasonCategory,
        editedBy: userId,
      });
      edits.push(edit);
    }

    res.status(201).json({
      success: true,
      data: { edits, count: edits.length },
      message: `Successfully created ${edits.length} bulk edits`
    });
  } catch (error) {
    console.error('Bulk edit error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create bulk edits'
    });
  }
});

/**
 * POST /api/v1/time-entry-management/edits/:editId/apply
 * Apply an approved edit to the time entry
 */
router.post('/edits/:editId/apply', requireAuth, requirePermission('timetracking.edit'), async (req: Request, res: Response) => {
  try {
    const { editId } = req.params;

    await timeEntryEditService.applyEdit(editId);

    res.json({
      success: true,
      message: 'Edit applied successfully'
    });
  } catch (error) {
    console.error('Apply edit error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to apply edit'
    });
  }
});

/**
 * POST /api/v1/time-entry-management/split
 * Split a time entry into multiple entries
 */
router.post('/split', requireAuth, requirePermission('timetracking.split'), async (req: Request, res: Response) => {
  try {
    const validatedData = splitTimeEntrySchema.parse(req.body);
    const userId = (req as any).user.id;

    const splitRequest: SplitTimeEntryRequest = {
      ...validatedData,
      editedBy: userId,
      splitPoints: validatedData.splitPoints.map(point => ({
        ...point,
        endTime: new Date(point.endTime),
      })),
    };

    const edits = await timeEntryEditService.splitTimeEntry(splitRequest);

    res.status(201).json({
      success: true,
      data: { edits, count: edits.length },
      message: 'Time entry split successfully'
    });
  } catch (error) {
    console.error('Split time entry error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to split time entry'
    });
  }
});

/**
 * POST /api/v1/time-entry-management/merge
 * Merge multiple time entries into one
 */
router.post('/merge', requireAuth, requirePermission('timetracking.merge'), async (req: Request, res: Response) => {
  try {
    const validatedData = mergeTimeEntriesSchema.parse(req.body);
    const userId = (req as any).user.id;

    const mergeRequest: MergeTimeEntriesRequest = {
      ...validatedData,
      editedBy: userId,
    };

    const edits = await timeEntryEditService.mergeTimeEntries(mergeRequest);

    res.status(201).json({
      success: true,
      data: { edits, count: edits.length },
      message: 'Time entries merged successfully'
    });
  } catch (error) {
    console.error('Merge time entries error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to merge time entries'
    });
  }
});

// ============================================================================
// Approval Endpoints
// ============================================================================

/**
 * GET /api/v1/time-entry-management/pending-approvals
 * Get pending approvals for the current supervisor
 */
router.get('/pending-approvals', requireAuth, requirePermission('timetracking.approve'), async (req: Request, res: Response) => {
  try {
    const query = pendingApprovalsQuerySchema.parse(req.query);
    const userId = (req as any).user.id;

    const options = {
      siteId: query.siteId,
      limit: query.limit,
      offset: query.offset,
      sortBy: query.sortBy,
      filters: {
        editType: query.editType,
        riskScore: {
          min: query.riskScoreMin,
          max: query.riskScoreMax,
        },
        amount: {
          min: query.amountMin,
          max: query.amountMax,
        },
      },
    };

    const result = await timeEntryApprovalService.getPendingApprovalsForSupervisor(userId, options);

    res.json({
      success: true,
      data: result,
      message: 'Pending approvals retrieved successfully'
    });
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get pending approvals'
    });
  }
});

/**
 * POST /api/v1/time-entry-management/approvals/:editId
 * Process an approval decision
 */
router.post('/approvals/:editId', requireAuth, requirePermission('timetracking.approve'), async (req: Request, res: Response) => {
  try {
    const { editId } = req.params;
    const validatedData = approvalSchema.parse(req.body);
    const userId = (req as any).user.id;

    const approvalRequest: ApprovalRequest = {
      timeEntryEditId: editId,
      approverUserId: userId,
      ...validatedData,
    };

    const approval = await timeEntryApprovalService.processApproval(approvalRequest);

    res.status(201).json({
      success: true,
      data: approval,
      message: `Edit ${validatedData.status.toLowerCase()} successfully`
    });
  } catch (error) {
    console.error('Process approval error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process approval'
    });
  }
});

/**
 * POST /api/v1/time-entry-management/approvals/bulk
 * Process bulk approvals
 */
router.post('/approvals/bulk', requireAuth, requirePermission('timetracking.bulk_approve'), async (req: Request, res: Response) => {
  try {
    const validatedData = bulkApprovalSchema.parse(req.body);
    const userId = (req as any).user.id;

    const bulkRequest: BulkApprovalRequest = {
      ...validatedData,
      approverUserId: userId,
    };

    const batch = await timeEntryApprovalService.processBulkApproval(bulkRequest);

    res.status(201).json({
      success: true,
      data: batch,
      message: `Bulk ${validatedData.status.toLowerCase()} processed successfully`
    });
  } catch (error) {
    console.error('Bulk approval error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process bulk approval'
    });
  }
});

/**
 * POST /api/v1/time-entry-management/approvals/:editId/escalate
 * Escalate an approval to a higher authority
 */
router.post('/approvals/:editId/escalate', requireAuth, requirePermission('timetracking.escalate'), async (req: Request, res: Response) => {
  try {
    const { editId } = req.params;
    const validatedData = escalationSchema.parse(req.body);
    const userId = (req as any).user.id;

    const escalationRequest: EscalationRequest = {
      timeEntryEditId: editId,
      fromUserId: userId,
      ...validatedData,
    };

    const edit = await timeEntryApprovalService.escalateApproval(escalationRequest);

    res.json({
      success: true,
      data: edit,
      message: 'Approval escalated successfully'
    });
  } catch (error) {
    console.error('Escalate approval error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to escalate approval'
    });
  }
});

/**
 * POST /api/v1/time-entry-management/delegate
 * Delegate approval authority
 */
router.post('/delegate', requireAuth, requirePermission('timetracking.delegate'), async (req: Request, res: Response) => {
  try {
    const validatedData = delegationSchema.parse(req.body);
    const userId = (req as any).user.id;

    const delegationRequest: DelegationRequest = {
      fromUserId: userId,
      ...validatedData,
      expiryDate: validatedData.expiryDate ? new Date(validatedData.expiryDate) : undefined,
    };

    await timeEntryApprovalService.delegateApprovalAuthority(delegationRequest);

    res.json({
      success: true,
      message: 'Approval authority delegated successfully'
    });
  } catch (error) {
    console.error('Delegate approval error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delegate approval authority'
    });
  }
});

/**
 * GET /api/v1/time-entry-management/metrics
 * Get approval metrics and analytics
 */
router.get('/metrics', requireAuth, requirePermission('timetracking.view_metrics'), async (req: Request, res: Response) => {
  try {
    const query = metricsQuerySchema.parse(req.query);
    const userId = (req as any).user.id;

    const dateRange = query.startDate && query.endDate ? {
      start: new Date(query.startDate),
      end: new Date(query.endDate),
    } : undefined;

    const metrics = await timeEntryApprovalService.getApprovalMetrics(
      userId,
      query.siteId,
      dateRange
    );

    res.json({
      success: true,
      data: metrics,
      message: 'Approval metrics retrieved successfully'
    });
  } catch (error) {
    console.error('Get metrics error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get approval metrics'
    });
  }
});

// ============================================================================
// Auto-Stop Endpoints
// ============================================================================

/**
 * POST /api/v1/time-entry-management/auto-stop/start
 * Start auto-stop monitoring
 */
router.post('/auto-stop/start', requireAuth, requirePermission('timetracking.admin'), async (req: Request, res: Response) => {
  try {
    autoStopService.startMonitoring();

    res.json({
      success: true,
      message: 'Auto-stop monitoring started'
    });
  } catch (error) {
    console.error('Start auto-stop error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start auto-stop monitoring'
    });
  }
});

/**
 * POST /api/v1/time-entry-management/auto-stop/stop
 * Stop auto-stop monitoring
 */
router.post('/auto-stop/stop', requireAuth, requirePermission('timetracking.admin'), async (req: Request, res: Response) => {
  try {
    autoStopService.stopMonitoring();

    res.json({
      success: true,
      message: 'Auto-stop monitoring stopped'
    });
  } catch (error) {
    console.error('Stop auto-stop error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to stop auto-stop monitoring'
    });
  }
});

/**
 * POST /api/v1/time-entry-management/auto-stop/respond/:timeEntryId
 * Respond to an auto-stop prompt
 */
router.post('/auto-stop/respond/:timeEntryId', requireAuth, requirePermission('timetracking.clockin'), async (req: Request, res: Response) => {
  try {
    const { timeEntryId } = req.params;
    const validatedData = promptResponseSchema.parse(req.body);
    const userId = (req as any).user.id;

    const promptResponse: PromptResponse = {
      timeEntryId,
      ...validatedData,
      userId,
    };

    await autoStopService.processOperatorResponse(promptResponse);

    res.json({
      success: true,
      message: 'Auto-stop response processed successfully'
    });
  } catch (error) {
    console.error('Auto-stop response error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process auto-stop response'
    });
  }
});

/**
 * GET /api/v1/time-entry-management/edits/:editId
 * Get details of a specific edit
 */
router.get('/edits/:editId', requireAuth, requirePermission('timetracking.view'), async (req: Request, res: Response) => {
  try {
    const { editId } = req.params;

    const edit = await prisma.timeEntryEdit.findUnique({
      where: { id: editId },
      include: {
        editor: {
          select: { id: true, firstName: true, lastName: true, username: true }
        },
        approver: {
          select: { id: true, firstName: true, lastName: true, username: true }
        },
        laborTimeEntry: {
          include: {
            user: true,
            workOrder: true,
            operation: true,
            indirectCode: true,
          }
        },
        machineTimeEntry: {
          include: {
            equipment: true,
            workOrder: true,
            operation: true,
          }
        },
        approvals: {
          include: {
            approver: {
              select: { id: true, firstName: true, lastName: true, username: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!edit) {
      return res.status(404).json({
        success: false,
        error: 'Edit not found'
      });
    }

    res.json({
      success: true,
      data: edit,
      message: 'Edit details retrieved successfully'
    });
  } catch (error) {
    console.error('Get edit details error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get edit details'
    });
  }
});

/**
 * GET /api/v1/time-entry-management/edits
 * Get list of edits with filtering
 */
router.get('/edits', requireAuth, requirePermission('timetracking.view'), async (req: Request, res: Response) => {
  try {
    const {
      userId,
      timeEntryType,
      editType,
      approvalStatus,
      startDate,
      endDate,
      limit = 50,
      offset = 0
    } = req.query;

    const where: any = {};

    if (userId) where.editedBy = userId as string;
    if (timeEntryType) where.timeEntryType = timeEntryType as string;
    if (editType) where.editType = editType as string;
    if (approvalStatus) where.approvalStatus = approvalStatus as string;

    if (startDate || endDate) {
      where.editedAt = {};
      if (startDate) where.editedAt.gte = new Date(startDate as string);
      if (endDate) where.editedAt.lte = new Date(endDate as string);
    }

    const [edits, total] = await Promise.all([
      prisma.timeEntryEdit.findMany({
        where,
        include: {
          editor: {
            select: { id: true, firstName: true, lastName: true, username: true }
          },
          laborTimeEntry: {
            select: {
              id: true,
              workOrderId: true,
              operationId: true,
              timeType: true,
              user: {
                select: { id: true, firstName: true, lastName: true, username: true }
              }
            }
          },
          machineTimeEntry: {
            select: {
              id: true,
              workOrderId: true,
              operationId: true,
              equipment: {
                select: { id: true, name: true, equipmentNumber: true }
              }
            }
          }
        },
        orderBy: { editedAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.timeEntryEdit.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        edits,
        total,
        hasMore: Number(offset) + edits.length < total
      },
      message: 'Edits retrieved successfully'
    });
  } catch (error) {
    console.error('Get edits error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get edits'
    });
  }
});

export default router;