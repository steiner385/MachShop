/**
 * NCR Approval API Routes - Issue #55 Phase 3
 *
 * Provides REST endpoints for NCR approval workflow management with integration to:
 * - Real-time WebSocket notifications
 * - Email notifications
 * - In-app notification system
 *
 * Endpoints:
 * POST /api/v2/ncr/approvals/pending - Get pending approvals for current user
 * POST /api/v2/ncr/{id}/approvals/request - Request approval for state transition
 * POST /api/v2/ncr/approvals/{id}/approve - Approve an approval request
 * POST /api/v2/ncr/approvals/{id}/reject - Reject an approval request
 * POST /api/v2/ncr/approvals/{id}/delegate - Delegate an approval request
 * GET /api/v2/ncr/approvals/statistics - Get approval workflow statistics
 */

import express from 'express';
import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import { ncrApprovalService } from '../services/NCRApprovalService';
import { emailNotificationService } from '../services/EmailNotificationService';
import { notificationService } from '../services/NotificationService';
import { webSocketService, WebSocketMessageType } from '../services/WebSocketService';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Get pending approvals for the current user
 * GET /api/v2/ncr/approvals/pending
 */
router.get('/pending', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const approvals = await ncrApprovalService.getPendingApprovalsForUser(userId, limit);

    res.json({
      success: true,
      data: approvals,
      count: approvals.length,
    });
  } catch (error) {
    logger.error('Failed to get pending approvals', { error });
    res.status(500).json({
      error: 'APPROVAL_FETCH_FAILED',
      message: 'Failed to retrieve pending approvals',
    });
  }
});

/**
 * Get approval statistics
 * GET /api/v2/ncr/approvals/statistics
 */
router.get('/statistics', authMiddleware, async (req: Request, res: Response) => {
  try {
    const stats = await ncrApprovalService.getApprovalStatistics();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Failed to get approval statistics', { error });
    res.status(500).json({
      error: 'STATS_FETCH_FAILED',
      message: 'Failed to retrieve approval statistics',
    });
  }
});

/**
 * Approve an approval request
 * POST /api/v2/ncr/approvals/{id}/approve
 */
router.post('/:id/approve', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const userId = req.user?.id;
    const userEmail = req.user?.email;

    if (!userId || !userEmail) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }

    // Get the approval request details
    const approval = await prisma.nCRApprovalRequest.findUnique({
      where: { id },
      include: {
        ncr: true,
      },
    });

    if (!approval) {
      return res.status(404).json({
        error: 'APPROVAL_NOT_FOUND',
        message: 'Approval request not found',
      });
    }

    // Approve the request
    const result = await ncrApprovalService.approveRequest(id, userId, notes);

    if (!result || !result.id) {
      return res.status(400).json({
        error: 'APPROVAL_FAILED',
        message: 'Failed to approve request',
      });
    }

    // Send WebSocket notification to the requester
    if (approval.requestedBy) {
      webSocketService.broadcastToUser(
        approval.requestedBy,
        {
          approvalId: id,
          ncrNumber: approval.ncr.ncrNumber,
          status: 'APPROVED',
          approvedBy: req.user?.username || userId,
          message: `Your approval request for NCR ${approval.ncr.ncrNumber} has been approved`,
        },
        WebSocketMessageType.NOTIFICATION
      );
    }

    // Send in-app notification
    try {
      await notificationService.createNotification({
        userId: approval.requestedBy || '',
        type: 'APPROVAL_APPROVED',
        title: 'Approval Approved',
        message: `Your approval request for NCR ${approval.ncr.ncrNumber} (${approval.requestType}) has been approved`,
        relatedEntityType: 'NCR_APPROVAL',
        relatedEntityId: id,
        actionUrl: `/quality/ncr/${approval.ncrId}`,
        priority: 'HIGH',
      });
    } catch (error) {
      logger.warn('Failed to create in-app notification', { error });
    }

    // Log the approval
    logger.info('NCR approval approved', {
      approvalId: id,
      userId,
      ncrNumber: approval.ncr.ncrNumber,
    });

    res.json({
      success: true,
      data: result,
      message: 'Approval request approved successfully',
    });
  } catch (error) {
    logger.error('Failed to approve request', { error });
    res.status(500).json({
      error: 'APPROVAL_PROCESS_FAILED',
      message: 'Failed to process approval',
    });
  }
});

/**
 * Reject an approval request
 * POST /api/v2/ncr/approvals/{id}/reject
 */
router.post('/:id/reject', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }

    // Get the approval request details
    const approval = await prisma.nCRApprovalRequest.findUnique({
      where: { id },
      include: {
        ncr: true,
      },
    });

    if (!approval) {
      return res.status(404).json({
        error: 'APPROVAL_NOT_FOUND',
        message: 'Approval request not found',
      });
    }

    // Reject the request
    const result = await ncrApprovalService.rejectRequest(id, userId, reason);

    if (!result || !result.id) {
      return res.status(400).json({
        error: 'REJECTION_FAILED',
        message: 'Failed to reject request',
      });
    }

    // Send WebSocket notification
    if (approval.requestedBy) {
      webSocketService.broadcastToUser(
        approval.requestedBy,
        {
          approvalId: id,
          ncrNumber: approval.ncr.ncrNumber,
          status: 'REJECTED',
          rejectedBy: req.user?.username || userId,
          rejectionReason: reason,
          message: `Your approval request for NCR ${approval.ncr.ncrNumber} has been rejected`,
        },
        WebSocketMessageType.NOTIFICATION
      );
    }

    // Send email notification
    try {
      const requester = await prisma.user.findUnique({
        where: { id: approval.requestedBy || '' },
      });

      if (requester?.email) {
        await emailNotificationService.sendRejectionEmail(
          approval.ncr.ncrNumber,
          requester.email,
          reason,
          req.user?.username || userId
        );
      }
    } catch (error) {
      logger.warn('Failed to send rejection email', { error });
    }

    // Log the rejection
    logger.info('NCR approval rejected', {
      approvalId: id,
      userId,
      ncrNumber: approval.ncr.ncrNumber,
    });

    res.json({
      success: true,
      data: result,
      message: 'Approval request rejected successfully',
    });
  } catch (error) {
    logger.error('Failed to reject request', { error });
    res.status(500).json({
      error: 'REJECTION_PROCESS_FAILED',
      message: 'Failed to process rejection',
    });
  }
});

/**
 * Delegate an approval request
 * POST /api/v2/ncr/approvals/{id}/delegate
 */
router.post('/:id/delegate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { delegateTo } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }

    if (!delegateTo) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'delegateTo user ID is required',
      });
    }

    // Get the approval request details
    const approval = await prisma.nCRApprovalRequest.findUnique({
      where: { id },
      include: {
        ncr: true,
      },
    });

    if (!approval) {
      return res.status(404).json({
        error: 'APPROVAL_NOT_FOUND',
        message: 'Approval request not found',
      });
    }

    // Delegate the request
    const result = await ncrApprovalService.delegateRequest(id, userId, delegateTo);

    if (!result || !result.id) {
      return res.status(400).json({
        error: 'DELEGATION_FAILED',
        message: 'Failed to delegate request',
      });
    }

    // Send WebSocket notification to the new approver
    webSocketService.broadcastToUser(
      delegateTo,
      {
        approvalId: id,
        ncrNumber: approval.ncr.ncrNumber,
        status: 'DELEGATED',
        delegatedFrom: req.user?.username || userId,
        message: `An approval request for NCR ${approval.ncr.ncrNumber} has been delegated to you`,
      },
      WebSocketMessageType.APPROVAL_REQUEST
    );

    // Send in-app notification to new approver
    try {
      await notificationService.createNotification({
        userId: delegateTo,
        type: 'APPROVAL_DELEGATED',
        title: 'Approval Delegated to You',
        message: `An approval request for NCR ${approval.ncr.ncrNumber} (${approval.requestType}) has been delegated to you`,
        relatedEntityType: 'NCR_APPROVAL',
        relatedEntityId: id,
        actionUrl: `/quality/ncr/${approval.ncrId}/approvals`,
        priority: 'HIGH',
      });
    } catch (error) {
      logger.warn('Failed to create delegation notification', { error });
    }

    // Log the delegation
    logger.info('NCR approval delegated', {
      approvalId: id,
      userId,
      delegateTo,
      ncrNumber: approval.ncr.ncrNumber,
    });

    res.json({
      success: true,
      data: result,
      message: 'Approval request delegated successfully',
    });
  } catch (error) {
    logger.error('Failed to delegate request', { error });
    res.status(500).json({
      error: 'DELEGATION_PROCESS_FAILED',
      message: 'Failed to process delegation',
    });
  }
});

export default router;
