/**
 * ✅ GITHUB ISSUE #147: Core Unified Workflow Engine
 *
 * Unified Approval API Routes - Provides consistent REST endpoints for all
 * approval types across the system. This consolidates all disparate approval
 * endpoints into a single, unified interface.
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateJWT, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { UnifiedApprovalIntegration } from '../services/UnifiedApprovalIntegration';
import { logger } from '../utils/logger';
import { z } from 'zod';

const router = express.Router();
const prisma = new PrismaClient();

// Initialize unified approval service (would be done at app startup)
const unifiedApprovalService = new UnifiedApprovalIntegration(prisma);

// ============================================================================
// Validation Schemas
// ============================================================================

const initiateApprovalSchema = z.object({
  entityType: z.enum(['WORK_INSTRUCTION', 'FAI_REPORT', 'QUALITY_PROCESS', 'DOCUMENT']),
  entityId: z.string().min(1),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  requiredApproverRoles: z.array(z.string()).min(1),
  metadata: z.record(z.any()).optional()
});

const processApprovalSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'DELEGATE', 'REQUEST_CHANGES']),
  comments: z.string().optional(),
  delegateToUserId: z.string().optional(),
  requiresSignature: z.boolean().default(false),
  signatureReason: z.string().optional()
});

const getTasksSchema = z.object({
  status: z.enum(['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE']).optional(),
  entityType: z.enum(['WORK_INSTRUCTION', 'FAI_REPORT', 'QUALITY_PROCESS', 'DOCUMENT']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0)
});

// ============================================================================
// Unified Approval Endpoints
// ============================================================================

/**
 * POST /api/v1/approvals/initiate
 * Initiate approval workflow for any entity type
 */
router.post('/initiate',
  authenticateJWT,
  requireRole(['manager', 'quality_manager', 'process_engineer']),
  validateRequest(initiateApprovalSchema),
  async (req, res) => {
    try {
      const { entityType, entityId, priority, requiredApproverRoles, metadata } = req.body;
      const userId = req.user!.id;

      logger.info(`Initiating approval for ${entityType}:${entityId}`, {
        userId,
        priority,
        requiredApproverRoles
      });

      const result = await unifiedApprovalService.initiateApproval(
        {
          entityType,
          entityId,
          currentStatus: 'PENDING_APPROVAL',
          requiredApproverRoles,
          priority,
          metadata
        },
        userId
      );

      res.status(201).json({
        success: true,
        data: result,
        message: `Approval workflow initiated for ${entityType}`
      });

    } catch (error) {
      logger.error('Failed to initiate approval workflow', {
        error: error.message,
        body: req.body,
        userId: req.user?.id
      });

      res.status(400).json({
        success: false,
        error: error.message,
        message: 'Failed to initiate approval workflow'
      });
    }
  }
);

/**
 * POST /api/v1/approvals/:entityType/:entityId/approve
 * Approve specific entity with unified workflow
 */
router.post('/:entityType/:entityId/approve',
  authenticateJWT,
  requireRole(['manager', 'quality_manager', 'approver']),
  validateRequest(processApprovalSchema),
  async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      const { comments, requiresSignature, signatureReason } = req.body;
      const userId = req.user!.id;

      logger.info(`Processing approval for ${entityType}:${entityId}`, {
        userId,
        action: 'APPROVE',
        requiresSignature
      });

      let signatureData = null;
      if (requiresSignature) {
        signatureData = {
          userId,
          reason: signatureReason || 'Approval signature',
          timestamp: new Date(),
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        };
      }

      const result = await unifiedApprovalService.processApprovalAction(
        entityType.toUpperCase(),
        entityId,
        'APPROVE',
        userId,
        comments,
        signatureData
      );

      res.json({
        success: true,
        data: result,
        message: `${entityType} approved successfully`
      });

    } catch (error) {
      logger.error('Failed to process approval', {
        error: error.message,
        entityType: req.params.entityType,
        entityId: req.params.entityId,
        userId: req.user?.id
      });

      res.status(400).json({
        success: false,
        error: error.message,
        message: 'Failed to process approval'
      });
    }
  }
);

/**
 * POST /api/v1/approvals/:entityType/:entityId/reject
 * Reject specific entity with unified workflow
 */
router.post('/:entityType/:entityId/reject',
  authenticateJWT,
  requireRole(['manager', 'quality_manager', 'approver']),
  validateRequest(processApprovalSchema),
  async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      const { comments } = req.body;
      const userId = req.user!.id;

      if (!comments || comments.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Comments are required when rejecting an approval',
          message: 'Rejection reason must be provided'
        });
      }

      logger.info(`Rejecting ${entityType}:${entityId}`, {
        userId,
        comments: comments.substring(0, 100) + '...'
      });

      const result = await unifiedApprovalService.processApprovalAction(
        entityType.toUpperCase(),
        entityId,
        'REJECT',
        userId,
        comments
      );

      res.json({
        success: true,
        data: result,
        message: `${entityType} rejected`
      });

    } catch (error) {
      logger.error('Failed to reject approval', {
        error: error.message,
        entityType: req.params.entityType,
        entityId: req.params.entityId,
        userId: req.user?.id
      });

      res.status(400).json({
        success: false,
        error: error.message,
        message: 'Failed to reject approval'
      });
    }
  }
);

/**
 * POST /api/v1/approvals/:entityType/:entityId/delegate
 * Delegate approval task to another user
 */
router.post('/:entityType/:entityId/delegate',
  authenticateJWT,
  requireRole(['manager', 'quality_manager', 'approver']),
  validateRequest(z.object({
    delegateToUserId: z.string().min(1),
    reason: z.string().min(1),
    comments: z.string().optional()
  })),
  async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      const { delegateToUserId, reason, comments } = req.body;
      const userId = req.user!.id;

      logger.info(`Delegating approval for ${entityType}:${entityId}`, {
        userId,
        delegateToUserId,
        reason
      });

      // TODO: Implement delegation through workflow engine
      // For now, return a placeholder response
      res.json({
        success: true,
        message: `Approval for ${entityType} delegated to user ${delegateToUserId}`,
        data: {
          entityType,
          entityId,
          delegatedTo: delegateToUserId,
          reason,
          delegatedAt: new Date()
        }
      });

    } catch (error) {
      logger.error('Failed to delegate approval', {
        error: error.message,
        entityType: req.params.entityType,
        entityId: req.params.entityId,
        userId: req.user?.id
      });

      res.status(400).json({
        success: false,
        error: error.message,
        message: 'Failed to delegate approval'
      });
    }
  }
);

// ============================================================================
// Status and Progress Endpoints
// ============================================================================

/**
 * GET /api/v1/approvals/:entityType/:entityId/status
 * Get approval status for specific entity
 */
router.get('/:entityType/:entityId/status',
  authenticateJWT,
  async (req, res) => {
    try {
      const { entityType, entityId } = req.params;

      logger.debug(`Getting approval status for ${entityType}:${entityId}`, {
        userId: req.user?.id
      });

      const status = await unifiedApprovalService.getApprovalStatus(
        entityType.toUpperCase(),
        entityId
      );

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      logger.error('Failed to get approval status', {
        error: error.message,
        entityType: req.params.entityType,
        entityId: req.params.entityId,
        userId: req.user?.id
      });

      res.status(400).json({
        success: false,
        error: error.message,
        message: 'Failed to get approval status'
      });
    }
  }
);

/**
 * GET /api/v1/approvals/my-tasks
 * Get all pending approval tasks for the current user
 */
router.get('/my-tasks',
  authenticateJWT,
  validateRequest(getTasksSchema, 'query'),
  async (req, res) => {
    try {
      const { status, entityType, priority, limit, offset } = req.query;
      const userId = req.user!.id;

      logger.debug(`Getting approval tasks for user ${userId}`, {
        status,
        entityType,
        priority,
        limit,
        offset
      });

      const tasks = await unifiedApprovalService.getPendingApprovalsForUser(userId);

      // Filter tasks based on query parameters
      let filteredTasks = tasks;

      if (entityType) {
        filteredTasks = filteredTasks.filter(task =>
          task.entityType.toUpperCase() === (entityType as string).toUpperCase()
        );
      }

      if (priority) {
        filteredTasks = filteredTasks.filter(task =>
          task.priority.toUpperCase() === (priority as string).toUpperCase()
        );
      }

      // Apply pagination
      const startIndex = Number(offset) || 0;
      const endIndex = startIndex + (Number(limit) || 50);
      const paginatedTasks = filteredTasks.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: {
          tasks: paginatedTasks,
          total: filteredTasks.length,
          limit: Number(limit) || 50,
          offset: Number(offset) || 0,
          hasMore: endIndex < filteredTasks.length
        }
      });

    } catch (error) {
      logger.error('Failed to get user approval tasks', {
        error: error.message,
        userId: req.user?.id,
        query: req.query
      });

      res.status(400).json({
        success: false,
        error: error.message,
        message: 'Failed to get approval tasks'
      });
    }
  }
);

/**
 * GET /api/v1/approvals/dashboard
 * Get approval dashboard summary for managers
 */
router.get('/dashboard',
  authenticateJWT,
  requireRole(['manager', 'quality_manager', 'plant_manager']),
  async (req, res) => {
    try {
      const userId = req.user!.id;

      logger.debug(`Getting approval dashboard for user ${userId}`);

      // TODO: Implement dashboard aggregation
      // For now, return placeholder data
      const dashboardData = {
        totalPendingApprovals: 25,
        myPendingTasks: 8,
        overdueApprovals: 3,
        approvalsByType: {
          WORK_INSTRUCTION: 12,
          FAI_REPORT: 6,
          QUALITY_PROCESS: 4,
          DOCUMENT: 3
        },
        approvalsByPriority: {
          CRITICAL: 2,
          HIGH: 8,
          MEDIUM: 12,
          LOW: 3
        },
        recentActivity: [],
        avgApprovalTime: '2.3 days'
      };

      res.json({
        success: true,
        data: dashboardData
      });

    } catch (error) {
      logger.error('Failed to get approval dashboard', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(400).json({
        success: false,
        error: error.message,
        message: 'Failed to get approval dashboard'
      });
    }
  }
);

// ============================================================================
// Entity-Specific Convenience Endpoints
// ============================================================================

/**
 * POST /api/v1/approvals/work-instructions/:id/approve
 * Convenience endpoint for work instruction approval
 */
router.post('/work-instructions/:id/approve',
  authenticateJWT,
  requireRole(['manager', 'quality_manager', 'process_engineer']),
  validateRequest(z.object({
    comments: z.string().optional(),
    requiresSignature: z.boolean().default(false)
  })),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { comments, requiresSignature } = req.body;
      const userId = req.user!.id;

      const result = await unifiedApprovalService.approveWorkInstruction(
        id,
        userId,
        comments,
        requiresSignature
      );

      res.json({
        success: true,
        data: result,
        message: 'Work instruction approved successfully'
      });

    } catch (error) {
      logger.error('Failed to approve work instruction', {
        error: error.message,
        workInstructionId: req.params.id,
        userId: req.user?.id
      });

      res.status(400).json({
        success: false,
        error: error.message,
        message: 'Failed to approve work instruction'
      });
    }
  }
);

/**
 * POST /api/v1/approvals/fai-reports/:id/approve
 * Convenience endpoint for FAI report approval (requires signature)
 */
router.post('/fai-reports/:id/approve',
  authenticateJWT,
  requireRole(['quality_manager', 'customer_representative']),
  validateRequest(z.object({
    comments: z.string().min(1, 'Comments required for FAI approval'),
    signatureReason: z.string().optional()
  })),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { comments, signatureReason } = req.body;
      const userId = req.user!.id;

      const result = await unifiedApprovalService.approveFAIReport(
        id,
        userId,
        comments,
        true // FAI always requires signature
      );

      res.json({
        success: true,
        data: result,
        message: 'FAI report approved successfully'
      });

    } catch (error) {
      logger.error('Failed to approve FAI report', {
        error: error.message,
        faiId: req.params.id,
        userId: req.user?.id
      });

      res.status(400).json({
        success: false,
        error: error.message,
        message: 'Failed to approve FAI report'
      });
    }
  }
);

// ============================================================================
// Error Handling
// ============================================================================

// Handle 404 for undefined routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `${req.method} ${req.originalUrl} is not a valid approval endpoint`
  });
});

// Error handling middleware
router.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unified approval API error', {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    userId: req.user?.id
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: 'An unexpected error occurred while processing the approval request'
  });
});

export default router;