/**
 * Approval Workflow Controller
 *
 * Admin endpoints for managing API key approval requests.
 * Handles approval/rejection of SDK and PRIVATE tier keys.
 *
 * @module modules/approval-workflow/controllers/approval-workflow.controller
 * @see GitHub Issue #74: API Access Control & Security Model
 */

import { Request, Response } from 'express';
import { approvalWorkflowService } from '../services/approval-workflow.service';
import { logger } from '../../../utils/logger';

/**
 * Get all pending approval requests
 * GET /admin/approval-requests
 */
export async function getPendingRequests(req: Request, res: Response): Promise<void> {
  try {
    const { tier, developerEmail } = req.query;

    // Build filters
    const filters: any = {};
    if (tier) {
      filters.tier = tier as string;
    }
    if (developerEmail) {
      filters.developerEmail = developerEmail as string;
    }

    const requests = await approvalWorkflowService.getPendingRequests(filters);

    res.json({
      success: true,
      data: requests,
      total: requests.length
    });
  } catch (error) {
    logger.error('Failed to get pending requests', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get pending requests'
    });
  }
}

/**
 * Get approval request details
 * GET /admin/approval-requests/:requestId
 */
export async function getApprovalRequest(req: Request, res: Response): Promise<void> {
  try {
    const { requestId } = req.params;

    if (!requestId) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Request ID is required'
      });
      return;
    }

    const request = await approvalWorkflowService.getApprovalRequest(requestId);

    if (!request) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Approval request not found'
      });
      return;
    }

    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    logger.error('Failed to get approval request', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get approval request'
    });
  }
}

/**
 * Approve an API key request
 * POST /admin/approval-requests/:requestId/approve
 */
export async function approveRequest(req: Request, res: Response): Promise<void> {
  try {
    const { requestId } = req.params;
    const { notes } = req.body;
    const approverEmail = req.user?.email || req.headers['x-admin-email'];

    if (!requestId) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Request ID is required'
      });
      return;
    }

    if (!approverEmail) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Admin email required'
      });
      return;
    }

    const updatedRequest = await approvalWorkflowService.approveRequest(
      requestId,
      approverEmail as string,
      notes
    );

    logger.info('Approval request approved', {
      requestId,
      approver: approverEmail,
      apiKeyId: updatedRequest.apiKeyId
    });

    res.json({
      success: true,
      message: 'API key approved successfully',
      data: updatedRequest
    });
  } catch (error) {
    logger.error('Failed to approve request', { error });

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({
          error: 'Not Found',
          message: error.message
        });
        return;
      }
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to approve request'
    });
  }
}

/**
 * Reject an API key request
 * POST /admin/approval-requests/:requestId/reject
 */
export async function rejectRequest(req: Request, res: Response): Promise<void> {
  try {
    const { requestId } = req.params;
    const { rejectionReason } = req.body;
    const approverEmail = req.user?.email || req.headers['x-admin-email'];

    if (!requestId) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Request ID is required'
      });
      return;
    }

    if (!rejectionReason) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Rejection reason is required'
      });
      return;
    }

    if (!approverEmail) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Admin email required'
      });
      return;
    }

    const updatedRequest = await approvalWorkflowService.rejectRequest(
      requestId,
      approverEmail as string,
      rejectionReason
    );

    logger.info('Approval request rejected', {
      requestId,
      approver: approverEmail,
      apiKeyId: updatedRequest.apiKeyId,
      reason: rejectionReason
    });

    res.json({
      success: true,
      message: 'API key request rejected',
      data: updatedRequest
    });
  } catch (error) {
    logger.error('Failed to reject request', { error });

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({
          error: 'Not Found',
          message: error.message
        });
        return;
      }
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to reject request'
    });
  }
}

/**
 * Get approval request statistics
 * GET /admin/approval-requests/stats
 */
export async function getApprovalStats(req: Request, res: Response): Promise<void> {
  try {
    const stats = await approvalWorkflowService.getApprovalStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Failed to get approval stats', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get approval statistics'
    });
  }
}

/**
 * Get approval request history for a developer
 * GET /admin/approval-requests/history/:developerEmail
 */
export async function getApprovalHistory(req: Request, res: Response): Promise<void> {
  try {
    const { developerEmail } = req.params;
    const { limit } = req.query;

    if (!developerEmail) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Developer email is required'
      });
      return;
    }

    const history = await approvalWorkflowService.getApprovalHistory(
      developerEmail,
      limit ? parseInt(limit as string) : 50
    );

    res.json({
      success: true,
      data: history,
      total: history.length
    });
  } catch (error) {
    logger.error('Failed to get approval history', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get approval history'
    });
  }
}

/**
 * Approve multiple requests in bulk
 * POST /admin/approval-requests/bulk-approve
 */
export async function approveBulk(req: Request, res: Response): Promise<void> {
  try {
    const { requestIds } = req.body;
    const approverEmail = req.user?.email || req.headers['x-admin-email'];

    if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'requestIds array is required and must not be empty'
      });
      return;
    }

    if (!approverEmail) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Admin email required'
      });
      return;
    }

    const successCount = await approvalWorkflowService.approveBulk(
      requestIds,
      approverEmail as string
    );

    logger.info('Bulk approval completed', {
      total: requestIds.length,
      successful: successCount,
      approver: approverEmail
    });

    res.json({
      success: true,
      message: `${successCount} of ${requestIds.length} requests approved`,
      data: {
        total: requestIds.length,
        successful: successCount,
        failed: requestIds.length - successCount
      }
    });
  } catch (error) {
    logger.error('Failed to perform bulk approval', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to perform bulk approval'
    });
  }
}

/**
 * Reject multiple requests in bulk
 * POST /admin/approval-requests/bulk-reject
 */
export async function rejectBulk(req: Request, res: Response): Promise<void> {
  try {
    const { requestIds, rejectionReason } = req.body;
    const approverEmail = req.user?.email || req.headers['x-admin-email'];

    if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'requestIds array is required and must not be empty'
      });
      return;
    }

    if (!rejectionReason) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Rejection reason is required'
      });
      return;
    }

    if (!approverEmail) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Admin email required'
      });
      return;
    }

    const successCount = await approvalWorkflowService.rejectBulk(
      requestIds,
      approverEmail as string,
      rejectionReason
    );

    logger.info('Bulk rejection completed', {
      total: requestIds.length,
      successful: successCount,
      approver: approverEmail
    });

    res.json({
      success: true,
      message: `${successCount} of ${requestIds.length} requests rejected`,
      data: {
        total: requestIds.length,
        successful: successCount,
        failed: requestIds.length - successCount
      }
    });
  } catch (error) {
    logger.error('Failed to perform bulk rejection', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to perform bulk rejection'
    });
  }
}
