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

/**
 * GET /api/v1/routings/:routingId/workflow-configuration
 * Get routing override configuration
 */
router.get(
  "/routings/:routingId/workflow-configuration",
  async (req: Request, res: Response) => {
    try {
      const { routingId } = req.params;
      const config = await configService.getRoutingOverride(routingId);

      if (!config) {
        return res.status(404).json({
          success: false,
          error: "No override found for this routing",
        });
      }

      res.json({
        success: true,
        data: config,
      });
    } catch (error) {
      logger.error("Failed to get routing override", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * POST /api/v1/routings/:routingId/workflow-configuration
 * Create or update routing override
 */
router.post(
  "/routings/:routingId/workflow-configuration",
  async (req: Request, res: Response) => {
    try {
      const { routingId } = req.params;
      const { mode, enforceOperationSequence, enforceStatusGating, allowExternalVouching, enforceQualityChecks, requireStartTransition, overrideReason, approvedBy } = req.body;
      const userId = (req as any).user?.id;

      const override = await configService.createRoutingOverride(
        routingId,
        {
          mode,
          enforceOperationSequence,
          enforceStatusGating,
          allowExternalVouching,
          enforceQualityChecks,
          requireStartTransition,
          overrideReason,
          approvedBy,
        },
        userId
      );

      res.status(201).json({
        success: true,
        data: override,
      });
    } catch (error) {
      logger.error("Failed to create routing override", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * DELETE /api/v1/routings/:routingId/workflow-configuration
 * Delete routing override
 */
router.delete(
  "/routings/:routingId/workflow-configuration",
  async (req: Request, res: Response) => {
    try {
      const { routingId } = req.params;
      await configService.deleteRoutingOverride(routingId);

      res.json({
        success: true,
      });
    } catch (error) {
      logger.error("Failed to delete routing override", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /api/v1/work-orders/:workOrderId/workflow-configuration
 * Get work order override configuration
 */
router.get(
  "/work-orders/:workOrderId/workflow-configuration",
  async (req: Request, res: Response) => {
    try {
      const { workOrderId } = req.params;
      const config = await configService.getWorkOrderOverride(workOrderId);

      if (!config) {
        return res.status(404).json({
          success: false,
          error: "No override found for this work order",
        });
      }

      res.json({
        success: true,
        data: config,
      });
    } catch (error) {
      logger.error("Failed to get work order override", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * POST /api/v1/work-orders/:workOrderId/workflow-configuration
 * Create or update work order override (requires approval)
 */
router.post(
  "/work-orders/:workOrderId/workflow-configuration",
  async (req: Request, res: Response) => {
    try {
      const { workOrderId } = req.params;
      const { mode, enforceOperationSequence, enforceStatusGating, allowExternalVouching, enforceQualityChecks, requireStartTransition, overrideReason, approvedBy } = req.body;
      const userId = (req as any).user?.id;

      // Validate required fields for approval
      if (!approvedBy) {
        return res.status(400).json({
          success: false,
          error: "Approver (approvedBy) is required for work order overrides",
        });
      }

      if (!overrideReason) {
        return res.status(400).json({
          success: false,
          error: "Override reason is required for work order overrides",
        });
      }

      const override = await configService.createWorkOrderOverride(
        workOrderId,
        {
          mode,
          enforceOperationSequence,
          enforceStatusGating,
          allowExternalVouching,
          enforceQualityChecks,
          requireStartTransition,
        },
        overrideReason,
        approvedBy,
        userId
      );

      res.status(201).json({
        success: true,
        data: override,
      });
    } catch (error) {
      logger.error("Failed to create work order override", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * DELETE /api/v1/work-orders/:workOrderId/workflow-configuration
 * Delete work order override
 */
router.delete(
  "/work-orders/:workOrderId/workflow-configuration",
  async (req: Request, res: Response) => {
    try {
      const { workOrderId } = req.params;
      await configService.deleteWorkOrderOverride(workOrderId);

      res.json({
        success: true,
      });
    } catch (error) {
      logger.error("Failed to delete work order override", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /api/v1/sites/:siteId/workflow-configuration/history
 * Get configuration change history for site
 */
router.get(
  "/sites/:siteId/workflow-configuration/history",
  async (req: Request, res: Response) => {
    try {
      const { siteId } = req.params;
      const { limit } = req.query;

      // Get site config ID
      const siteConfig = await configService.getSiteConfiguration(siteId);

      const history = await configService.getConfigurationHistory(
        "SITE",
        siteConfig.id,
        limit ? parseInt(limit as string) : 50
      );

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      logger.error("Failed to get configuration history", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /api/v1/routings/:routingId/workflow-configuration/history
 * Get configuration change history for routing
 */
router.get(
  "/routings/:routingId/workflow-configuration/history",
  async (req: Request, res: Response) => {
    try {
      const { routingId } = req.params;
      const { limit } = req.query;

      const routingConfig = await configService.getRoutingOverride(routingId);

      if (!routingConfig) {
        return res.status(404).json({
          success: false,
          error: "No override found for this routing",
        });
      }

      const history = await configService.getConfigurationHistory(
        "ROUTING",
        routingConfig.id,
        limit ? parseInt(limit as string) : 50
      );

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      logger.error("Failed to get routing configuration history", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

export default router;
