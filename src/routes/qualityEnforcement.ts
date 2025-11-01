/**
 * Quality Enforcement Routes (Issue #44)
 *
 * REST API endpoints for configurable quality enforcement including:
 * - Quality requirement checks (STRICT/FLEXIBLE/OPTIONAL/EXTERNAL modes)
 * - Operation completion validation
 * - NCR disposition validation
 * - Electronic signature requirements
 */

import express, { Request, Response } from "express";
import { QualityEnforcementService } from "../services/QualityEnforcementService";

const router = express.Router();
const enforcementService = new QualityEnforcementService();

// ============================================================================
// QUALITY REQUIREMENT ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/quality-enforcement/:operationId/is-required
 * Check if quality inspection is required for an operation
 *
 * Response:
 * {
 *   required: boolean
 *   mode: 'STRICT' | 'RECOMMENDED' | 'OPTIONAL' | 'EXTERNAL'
 *   inspectionType?: string
 *   sampleSize?: number
 *   reason: string
 *   source: 'SITE' | 'ROUTING' | 'OPERATION'
 * }
 */
router.get("/:operationId/is-required", async (req: Request, res: Response): Promise<any> => {
  try {
    const { operationId } = req.params;

    if (!operationId || operationId.trim() === "") {
      return res.status(400).json({
        error: "ValidationError",
        message: "Operation ID is required",
      });
    }

    const requirement = await enforcementService.isQualityInspectionRequired(
      operationId
    );

    res.status(200).json(requirement);
  } catch (error: any) {
    console.error("Error checking quality requirement:", error);
    res.status(500).json({
      error: "InternalServerError",
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/quality-enforcement/:operationId/configuration
 * Get effective quality configuration for an operation
 *
 * Response:
 * {
 *   mode: 'STRICT' | 'RECOMMENDED' | 'OPTIONAL' | 'EXTERNAL'
 *   enforceInspectionPass: boolean
 *   requireElectronicSig: boolean
 *   acceptExternalQuality: boolean
 *   qualityRequired: boolean
 *   inspectionType?: string
 *   sampleSize?: number
 *   source: { site, routing?, operation? }
 * }
 */
router.get(
  "/:operationId/configuration",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { operationId } = req.params;

      if (!operationId || operationId.trim() === "") {
        return res.status(400).json({
          error: "ValidationError",
          message: "Operation ID is required",
        });
      }

      const configuration = await enforcementService.getEffectiveQualityConfiguration(
        operationId
      );

      res.status(200).json(configuration);
    } catch (error: any) {
      console.error("Error fetching quality configuration:", error);
      res.status(500).json({
        error: "InternalServerError",
        message: error.message,
      });
    }
  }
);

// ============================================================================
// OPERATION COMPLETION VALIDATION ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/quality-enforcement/:operationId/can-complete
 * Check if operation can complete without passing quality inspection
 *
 * Response:
 * {
 *   allowed: boolean
 *   reason?: string
 *   warnings: string[]
 *   configMode: 'STRICT' | 'RECOMMENDED' | 'OPTIONAL' | 'EXTERNAL'
 *   bypassesApplied: string[]
 * }
 */
router.get(
  "/:operationId/can-complete",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { operationId } = req.params;

      if (!operationId || operationId.trim() === "") {
        return res.status(400).json({
          error: "ValidationError",
          message: "Operation ID is required",
        });
      }

      const decision = await enforcementService.canCompleteWithoutPassingInspection(
        operationId
      );

      res.status(200).json(decision);
    } catch (error: any) {
      console.error("Error checking operation completion:", error);
      res.status(500).json({
        error: "InternalServerError",
        message: error.message,
      });
    }
  }
);

// ============================================================================
// NCR DISPOSITION VALIDATION ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/quality-enforcement/ncr/:ncrId/validate-disposition
 * Validate NCR disposition against configured rules
 *
 * Body:
 * {
 *   disposition: string (e.g., "USE_AS_IS", "REWORK", "SCRAP")
 * }
 *
 * Response:
 * {
 *   valid: boolean
 *   reason?: string
 *   requiresApproval: boolean
 *   approvalLevel?: string
 * }
 */
router.post(
  "/ncr/:ncrId/validate-disposition",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { ncrId } = req.params;
      const { disposition } = req.body;

      if (!ncrId || ncrId.trim() === "") {
        return res.status(400).json({
          error: "ValidationError",
          message: "NCR ID is required",
        });
      }

      if (!disposition || disposition.trim() === "") {
        return res.status(400).json({
          error: "ValidationError",
          message: "Disposition is required",
        });
      }

      const validation = await enforcementService.validateNCRDisposition(
        ncrId,
        disposition
      );

      res.status(200).json(validation);
    } catch (error: any) {
      console.error("Error validating NCR disposition:", error);
      res.status(500).json({
        error: "InternalServerError",
        message: error.message,
      });
    }
  }
);

// ============================================================================
// ELECTRONIC SIGNATURE REQUIREMENT ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/quality-enforcement/:siteId/signature-requirement/:actionType
 * Check if electronic signature is required for a quality action
 *
 * Response:
 * {
 *   required: boolean
 *   signatureLevel?: string ("OPERATOR" | "SUPERVISOR" | "QUALITY_MANAGER")
 *   actionType: string
 * }
 */
router.get(
  "/:siteId/signature-requirement/:actionType",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { siteId, actionType } = req.params;

      if (!siteId || siteId.trim() === "") {
        return res.status(400).json({
          error: "ValidationError",
          message: "Site ID is required",
        });
      }

      if (!actionType || actionType.trim() === "") {
        return res.status(400).json({
          error: "ValidationError",
          message: "Action type is required",
        });
      }

      const requirement = await enforcementService.isElectronicSignatureRequired(
        actionType,
        siteId
      );

      res.status(200).json(requirement);
    } catch (error: any) {
      console.error("Error checking electronic signature requirement:", error);
      res.status(500).json({
        error: "InternalServerError",
        message: error.message,
      });
    }
  }
);

export default router;
