/**
 * Workflow Enforcement Routes (Issue #41)
 *
 * REST API endpoints for flexible workflow enforcement including:
 * - Pre-execution validation (can record performance, can start operation, can complete operation)
 * - Prerequisite checking with detailed unmet requirement reporting
 * - Enforcement audit trail queries
 * - Configuration-driven rule enforcement (STRICT, FLEXIBLE, HYBRID modes)
 */

import express, { Request, Response } from 'express';
import { WorkflowEnforcementService } from '../services/WorkflowEnforcementService';

const router = express.Router();
const enforcementService = new WorkflowEnforcementService();

// ============================================================================
// ENFORCEMENT VALIDATION ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/workflow-enforcement/:workOrderId/can-record-performance
 * Check if work performance can be recorded for a work order
 *
 * Query Parameters:
 * - operationId (optional): If provided, check specific operation
 *
 * Response:
 * {
 *   allowed: boolean
 *   reason?: string
 *   warnings: string[]
 *   configMode: 'STRICT' | 'FLEXIBLE' | 'HYBRID'
 *   bypassesApplied: string[] // Which rules were bypassed
 *   enforcementChecks: Array<{
 *     name: string
 *     enforced: boolean
 *     passed: boolean
 *     reason?: string
 *   }>
 * }
 */
router.get('/:workOrderId/can-record-performance', async (req: Request, res: Response): Promise<any> => {
  try {
    const { workOrderId } = req.params;

    if (!workOrderId || workOrderId.trim() === '') {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Work order ID is required',
      });
    }

    const decision = await enforcementService.canRecordPerformance(workOrderId);

    res.status(200).json(decision);
  } catch (error: any) {
    console.error('Error checking performance recording permission:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/workflow-enforcement/:workOrderId/operations/:operationId/can-start
 * Check if an operation can be started
 *
 * Response: EnforcementDecision (same format as above)
 */
router.get('/:workOrderId/operations/:operationId/can-start', async (req: Request, res: Response): Promise<any> => {
  try {
    const { workOrderId, operationId } = req.params;

    if (!workOrderId || !operationId) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Work order ID and operation ID are required',
      });
    }

    const decision = await enforcementService.canStartOperation(workOrderId, operationId);

    res.status(200).json(decision);
  } catch (error: any) {
    console.error('Error checking operation start permission:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/workflow-enforcement/:workOrderId/operations/:operationId/can-complete
 * Check if an operation can be completed
 *
 * Response: EnforcementDecision (same format as above)
 */
router.get('/:workOrderId/operations/:operationId/can-complete', async (req: Request, res: Response): Promise<any> => {
  try {
    const { workOrderId, operationId } = req.params;

    if (!workOrderId || !operationId) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Work order ID and operation ID are required',
      });
    }

    const decision = await enforcementService.canCompleteOperation(workOrderId, operationId);

    res.status(200).json(decision);
  } catch (error: any) {
    console.error('Error checking operation completion permission:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: error.message,
    });
  }
});

// ============================================================================
// PREREQUISITE VALIDATION ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/workflow-enforcement/:workOrderId/operations/:operationId/prerequisites
 * Check operation prerequisites with detailed unmet requirement reporting
 *
 * Query Parameters:
 * - enforceMode: 'STRICT' | 'FLEXIBLE' (default: based on configuration)
 *
 * Response:
 * {
 *   valid: boolean
 *   unmetPrerequisites: Array<{
 *     prerequisiteOperationId: string
 *     prerequisiteOperationName: string
 *     prerequisiteOperationSeq: number
 *     currentOperationSeq: number
 *     dependencyType: string
 *     reason: string
 *   }>
 *   warnings: string[]
 *   enforcementMode: 'STRICT' | 'FLEXIBLE'
 * }
 */
router.get(
  '/:workOrderId/operations/:operationId/prerequisites',
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { workOrderId, operationId } = req.params;
      const { enforceMode = 'STRICT' } = req.query;

      if (!workOrderId || !operationId) {
        return res.status(400).json({
          error: 'ValidationError',
          message: 'Work order ID and operation ID are required',
        });
      }

      if (!['STRICT', 'FLEXIBLE'].includes(enforceMode as string)) {
        return res.status(400).json({
          error: 'ValidationError',
          message: 'enforceMode must be STRICT or FLEXIBLE',
        });
      }

      const validation = await enforcementService.validatePrerequisites(
        workOrderId,
        operationId,
        enforceMode as 'STRICT' | 'FLEXIBLE'
      );

      res.status(200).json(validation);
    } catch (error: any) {
      console.error('Error validating prerequisites:', error);
      res.status(500).json({
        error: 'InternalServerError',
        message: error.message,
      });
    }
  }
);

// ============================================================================
// AUDIT TRAIL ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/workflow-enforcement/:workOrderId/audit-trail
 * Get enforcement audit trail for a work order
 *
 * Query Parameters:
 * - limit: number (default: 100, max: 1000)
 * - offset: number (default: 0)
 *
 * Response:
 * {
 *   items: Array<{
 *     id: string
 *     workOrderId: string
 *     operationId?: string
 *     action: string
 *     enforcementMode: string
 *     bypassesApplied: string[]
 *     warnings: string[]
 *     userId?: string
 *     timestamp: ISO8601
 *   }>
 *   total: number
 *   limit: number
 *   offset: number
 * }
 */
router.get('/:workOrderId/audit-trail', async (req: Request, res: Response): Promise<any> => {
  try {
    const { workOrderId } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    if (!workOrderId || workOrderId.trim() === '') {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Work order ID is required',
      });
    }

    const auditTrail = await enforcementService.getAuditTrail(workOrderId);

    // Apply pagination
    const limitNum = Math.min(parseInt(limit as string) || 100, 1000);
    const offsetNum = parseInt(offset as string) || 0;
    const items = auditTrail.slice(offsetNum, offsetNum + limitNum);

    res.status(200).json({
      items,
      total: auditTrail.length,
      limit: limitNum,
      offset: offsetNum,
    });
  } catch (error: any) {
    console.error('Error fetching audit trail:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/workflow-enforcement/:workOrderId/enforcement-summary
 * Get enforcement enforcement summary for a work order
 * Shows what rules are enforced and what bypasses have been applied
 *
 * Response:
 * {
 *   workOrderId: string
 *   status: string
 *   configMode: 'STRICT' | 'FLEXIBLE' | 'HYBRID'
 *   enforcedRules: {
 *     statusGating: { enforced: boolean, bypassed: number }
 *     operationSequence: { enforced: boolean, bypassed: number }
 *     qualityChecks: { enforced: boolean, bypassed: number }
 *   }
 *   totalBypasses: number
 *   lastBypassAt?: ISO8601
 *   riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
 * }
 */
router.get('/:workOrderId/enforcement-summary', async (req: Request, res: Response): Promise<any> => {
  try {
    const { workOrderId } = req.params;

    if (!workOrderId || workOrderId.trim() === '') {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Work order ID is required',
      });
    }

    // Get audit trail
    const auditTrail = await enforcementService.getAuditTrail(workOrderId);

    // Analyze bypasses
    const bypassCounts = {
      statusGating: 0,
      operationSequence: 0,
      qualityChecks: 0,
    };

    for (const audit of auditTrail) {
      if (audit.bypassesApplied) {
        for (const bypass of audit.bypassesApplied) {
          if (bypass === 'status_gating') bypassCounts.statusGating++;
          if (bypass === 'operation_sequence') bypassCounts.operationSequence++;
          if (bypass === 'quality_checks') bypassCounts.qualityChecks++;
        }
      }
    }

    const totalBypasses = Object.values(bypassCounts).reduce((a, b) => a + b, 0);
    const lastBypass = auditTrail.length > 0 ? auditTrail[0].timestamp : undefined;

    // Determine risk level based on bypasses
    let riskLevel = 'LOW';
    if (totalBypasses > 10) riskLevel = 'HIGH';
    else if (totalBypasses > 5) riskLevel = 'MEDIUM';

    res.status(200).json({
      workOrderId,
      enforcedRules: {
        statusGating: {
          enforced: true,
          bypassed: bypassCounts.statusGating,
        },
        operationSequence: {
          enforced: true,
          bypassed: bypassCounts.operationSequence,
        },
        qualityChecks: {
          enforced: true,
          bypassed: bypassCounts.qualityChecks,
        },
      },
      totalBypasses,
      lastBypassAt: lastBypass,
      riskLevel,
    });
  } catch (error: any) {
    console.error('Error fetching enforcement summary:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: error.message,
    });
  }
});

export default router;
