/**
 * Workflow Configuration Routes (Issue #40)
 * API endpoints for managing site, routing, and work order workflow configurations
 */

import express, { Router, Request, Response } from "express";
import { WorkflowConfigurationService } from "../services/WorkflowConfigurationService";
import { requireAuth } from "../middleware/auth";
import { Logger } from "../utils/logger";

const router: Router = express.Router();
const logger = Logger.getInstance();
const configService = new WorkflowConfigurationService();

// Middleware: Require authentication
router.use(requireAuth);

/**
 * GET /api/v1/sites/:siteId/workflow-configuration
 * Get site workflow configuration
 */
router.get("/sites/:siteId/workflow-configuration", async (req: Request, res: Response) => {
  try {
    const { siteId } = req.params;
    const config = await configService.getSiteConfiguration(siteId);

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    logger.error("Failed to get site configuration", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * PUT /api/v1/sites/:siteId/workflow-configuration
 * Update site workflow configuration
 */
router.put(
  "/sites/:siteId/workflow-configuration",
  async (req: Request, res: Response) => {
    try {
      const { siteId } = req.params;
      const { mode, enforceOperationSequence, enforceStatusGating, allowExternalVouching, enforceQualityChecks, requireStartTransition, requireJustification, requireApproval } = req.body;
      const userId = (req as any).user?.id;
      const reason = (req as any).body?.reason;

      // Validate configuration
      const validation = await configService.validateConfiguration({
        mode,
        enforceOperationSequence,
        enforceStatusGating,
        allowExternalVouching,
        enforceQualityChecks,
        requireStartTransition,
      });

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          errors: validation.errors,
        });
      }

      const updated = await configService.updateSiteConfiguration(
        siteId,
        {
          mode,
          enforceOperationSequence,
          enforceStatusGating,
          allowExternalVouching,
          enforceQualityChecks,
          requireStartTransition,
          requireJustification,
          requireApproval,
        },
        userId,
        reason
      );

      res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      logger.error("Failed to update site configuration", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /api/v1/work-orders/:workOrderId/effective-configuration
 * Get effective workflow configuration for a work order
 */
router.get(
  "/work-orders/:workOrderId/effective-configuration",
  async (req: Request, res: Response) => {
    try {
      const { workOrderId } = req.params;
      const config = await configService.getEffectiveConfiguration(workOrderId);

      res.json({
        success: true,
        data: config,
      });
    } catch (error) {
      logger.error("Failed to get effective configuration", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /api/v1/work-orders/:workOrderId/can-execute-operation/:operationId
 * Check if operation can be executed given workflow configuration
 */
router.get(
  "/work-orders/:workOrderId/can-execute-operation/:operationId",
  async (req: Request, res: Response) => {
    try {
      const { workOrderId, operationId } = req.params;
      const permission = await configService.canExecuteOperation(
        workOrderId,
        operationId
      );

      res.json({
        success: true,
        data: permission,
      });
    } catch (error) {
      logger.error("Failed to check operation execution permission", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /api/v1/work-orders/:workOrderId/can-collect-data
 * Check if data can be collected given workflow configuration
 */
router.get(
  "/work-orders/:workOrderId/can-collect-data",
  async (req: Request, res: Response) => {
    try {
      const { workOrderId } = req.params;
      const permission = await configService.canCollectData(workOrderId);

      res.json({
        success: true,
        data: permission,
      });
    } catch (error) {
      logger.error("Failed to check data collection permission", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

export default router;
