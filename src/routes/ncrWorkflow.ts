/**
 * NCR Workflow Routes
 *
 * REST API endpoints for NCR workflow state transitions, approvals,
 * and configuration management (Issue #55).
 *
 * @module routes/ncrWorkflow
 * @see GitHub Issue #55: Enhanced NCR Workflow States & Disposition Management
 */

import { Router, Request, Response } from 'express';
import { ncrStateTransitionService } from '../services/NCRStateTransitionService';
import { ncrApprovalService } from '../services/NCRApprovalService';
import { ncrWorkflowConfigService } from '../services/NCRWorkflowConfigService';
import { logger } from '../utils/logger';

const router = Router();

// =============================================================================
// STATE TRANSITION ENDPOINTS
// =============================================================================

/**
 * GET /api/v2/ncr/:ncrId/available-transitions
 * Get available state transitions for current NCR state
 */
router.get('/:ncrId/available-transitions', async (req: Request, res: Response) => {
  try {
    const { ncrId } = req.params;

    // TODO: Get NCR and its current status
    // const ncr = await getNcrById(ncrId);
    // const transitions = ncrStateTransitionService.getAvailableTransitions(ncr.status);

    res.status(200).json({
      success: true,
      data: {
        ncrId,
        // transitions: transitions.map(t => ({
        //   toState: t.to,
        //   description: t.description,
        //   requiresApproval: t.requiresApproval,
        //   requiredRole: t.requiredRole,
        // })),
      },
    });
  } catch (error) {
    logger.error('Failed to get available transitions', { error });
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/v2/ncr/:ncrId/transition
 * Execute state transition
 */
router.post('/:ncrId/transition', async (req: Request, res: Response) => {
  try {
    const { ncrId } = req.params;
    const { toState, reason } = req.body;
    const userId = (req as any).user?.id || 'system';

    if (!toState) {
      res.status(400).json({
        success: false,
        error: 'toState is required',
      });
      return;
    }

    // TODO: Get current NCR status
    // const result = await ncrStateTransitionService.executeTransition({
    //   ncrId,
    //   fromState: ncr.status,
    //   toState,
    //   userId,
    //   reason,
    // });

    // if (!result.success) {
    //   return res.status(400).json(result);
    // }

    res.status(200).json({
      success: true,
      data: {
        ncrId,
        toState,
        message: 'State transition executed',
        // approvalRequired: result.approvalRequired,
        // approvalRequestId: result.approvalRequestId,
      },
    });
  } catch (error) {
    logger.error('Failed to execute state transition', { error });
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

// =============================================================================
// APPROVAL ENDPOINTS
// =============================================================================

/**
 * GET /api/v2/ncr/approvals/pending
 * Get pending approvals for current user
 */
router.get('/approvals/pending', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
      return;
    }

    const approvals = await ncrApprovalService.getPendingApprovalsForUser(userId);

    res.status(200).json({
      success: true,
      data: approvals,
      count: approvals.length,
    });
  } catch (error) {
    logger.error('Failed to get pending approvals', { error });
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/v2/ncr/approvals/:approvalRequestId/approve
 * Approve a request
 */
router.post('/approvals/:approvalRequestId/approve', async (req: Request, res: Response) => {
  try {
    const { approvalRequestId } = req.params;
    const { approvalNotes } = req.body;
    const userId = (req as any).user?.id || 'system';

    const result = await ncrApprovalService.approveRequest(
      approvalRequestId,
      userId,
      approvalNotes
    );

    res.status(200).json({
      success: true,
      data: result,
      message: 'Approval request approved',
    });
  } catch (error) {
    logger.error('Failed to approve request', { error });
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/v2/ncr/approvals/:approvalRequestId/reject
 * Reject a request
 */
router.post('/approvals/:approvalRequestId/reject', async (req: Request, res: Response) => {
  try {
    const { approvalRequestId } = req.params;
    const { rejectionReason } = req.body;
    const userId = (req as any).user?.id || 'system';

    if (!rejectionReason) {
      res.status(400).json({
        success: false,
        error: 'rejectionReason is required',
      });
      return;
    }

    const result = await ncrApprovalService.rejectRequest(
      approvalRequestId,
      userId,
      rejectionReason
    );

    res.status(200).json({
      success: true,
      data: result,
      message: 'Approval request rejected',
    });
  } catch (error) {
    logger.error('Failed to reject request', { error });
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/v2/ncr/approvals/:approvalRequestId/delegate
 * Delegate approval to another user
 */
router.post('/approvals/:approvalRequestId/delegate', async (req: Request, res: Response) => {
  try {
    const { approvalRequestId } = req.params;
    const { delegateTo } = req.body;
    const userId = (req as any).user?.id || 'system';

    if (!delegateTo) {
      res.status(400).json({
        success: false,
        error: 'delegateTo is required',
      });
      return;
    }

    const result = await ncrApprovalService.delegateRequest(
      approvalRequestId,
      delegateTo,
      userId
    );

    res.status(200).json({
      success: true,
      data: result,
      message: 'Approval request delegated',
    });
  } catch (error) {
    logger.error('Failed to delegate request', { error });
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/v2/ncr/:ncrId/approvals
 * Get approval history for NCR
 */
router.get('/:ncrId/approvals', async (req: Request, res: Response) => {
  try {
    const { ncrId } = req.params;

    const history = await ncrApprovalService.getApprovalHistory(ncrId);

    res.status(200).json({
      success: true,
      data: history,
      count: history.length,
    });
  } catch (error) {
    logger.error('Failed to get approval history', { error });
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

// =============================================================================
// CONFIGURATION ENDPOINTS
// =============================================================================

/**
 * GET /api/v2/ncr/config/:siteId?
 * Get workflow configuration for site/severity
 */
router.get('/config/:siteId?', async (req: Request, res: Response) => {
  try {
    const { siteId } = req.params;
    const { severity } = req.query;

    const config = await ncrWorkflowConfigService.getConfiguration(
      siteId,
      severity as any
    );

    res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    logger.error('Failed to get workflow configuration', { error });
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/v2/ncr/config
 * Save workflow configuration
 */
router.post('/config', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'system';
    const configData = {
      ...req.body,
      createdBy: userId,
    };

    const config = await ncrWorkflowConfigService.saveConfiguration(configData);

    res.status(201).json({
      success: true,
      data: config,
      message: 'Workflow configuration saved',
    });
  } catch (error) {
    logger.error('Failed to save workflow configuration', { error });
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/v2/ncr/config/sites/:siteId
 * Get all configurations for a site
 */
router.get('/config/sites/:siteId', async (req: Request, res: Response) => {
  try {
    const { siteId } = req.params;

    const configs = await ncrWorkflowConfigService.getSiteConfigurations(siteId);

    res.status(200).json({
      success: true,
      data: configs,
      count: configs.length,
    });
  } catch (error) {
    logger.error('Failed to get site configurations', { error });
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

// =============================================================================
// ADMIN ENDPOINTS
// =============================================================================

/**
 * GET /api/v2/ncr/admin/approvals/stats
 * Get approval statistics (admin only)
 */
router.get('/admin/approvals/stats', async (req: Request, res: Response) => {
  try {
    // TODO: Check admin role
    const stats = await ncrApprovalService.getApprovalStatistics();

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Failed to get approval statistics', { error });
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/v2/ncr/admin/approvals/escalate-overdue
 * Escalate overdue approvals (admin only)
 */
router.post('/admin/approvals/escalate-overdue', async (req: Request, res: Response) => {
  try {
    // TODO: Check admin role
    const escalatedCount = await ncrApprovalService.escalateOverdueApprovals();

    res.status(200).json({
      success: true,
      data: {
        escalatedCount,
      },
      message: `${escalatedCount} approvals escalated`,
    });
  } catch (error) {
    logger.error('Failed to escalate overdue approvals', { error });
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

export default router;
