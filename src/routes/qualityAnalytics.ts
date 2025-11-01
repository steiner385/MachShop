/**
 * Quality Analytics API Routes (Issue #58)
 * REST endpoints for quality metrics, Pareto analysis, and Cost of Quality tracking
 */

import express, { Request, Response } from "express";
import { QualityAnalyticsService } from "../services/QualityAnalyticsService";
import prisma from "../lib/database";

const router = express.Router();
const analyticsService = new QualityAnalyticsService();

// ============================================================================
// QUALITY METRICS ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/quality/metrics/summary
 * Get comprehensive quality summary for a site
 *
 * Query Parameters:
 *   - siteId (required)
 *   - period (optional): DAY, WEEK, MONTH (default: DAY)
 *
 * Response:
 * {
 *   siteId: string
 *   period: string
 *   metrics: {
 *     ncrRate: number
 *     firstPassYield: number
 *     dpmo: number
 *     copq: number
 *     scrapRate: number
 *     reworkRate: number
 *   }
 *   trends: { ... }
 *   topPareto: [ ... ]
 *   alertCount: number
 *   escapeCount: number
 * }
 */
router.get("/metrics/summary", async (req: Request, res: Response): Promise<any> => {
  try {
    const { siteId, period } = req.query;

    if (!siteId || typeof siteId !== "string" || siteId.trim() === "") {
      return res.status(400).json({
        error: "ValidationError",
        message: "Site ID is required",
      });
    }

    const periodValue = (period as string)?.toUpperCase() || "DAY";
    if (!["DAY", "WEEK", "MONTH"].includes(periodValue)) {
      return res.status(400).json({
        error: "ValidationError",
        message: "Period must be DAY, WEEK, or MONTH",
      });
    }

    const summary = await analyticsService.getQualitySummary(
      siteId,
      periodValue as "DAY" | "WEEK" | "MONTH"
    );

    res.status(200).json(summary);
  } catch (error: any) {
    console.error("Error fetching quality summary:", error);
    res.status(500).json({
      error: "InternalServerError",
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/quality/metrics/ncr-rate
 * Calculate NCR Rate metric
 *
 * Query Parameters:
 *   - siteId (required)
 *   - startDate (required): ISO format
 *   - endDate (required): ISO format
 *   - defectType (optional)
 *   - product (optional)
 */
router.get("/metrics/ncr-rate", async (req: Request, res: Response): Promise<any> => {
  try {
    const { siteId, startDate, endDate, defectType, product } = req.query;

    if (!siteId) {
      return res.status(400).json({
        error: "ValidationError",
        message: "Site ID is required",
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: "ValidationError",
        message: "Start date and end date are required",
      });
    }

    const metric = await analyticsService.calculateNCRRate(
      siteId as string,
      new Date(startDate as string),
      new Date(endDate as string),
      defectType as string,
      product as string
    );

    res.status(200).json(metric);
  } catch (error: any) {
    console.error("Error calculating NCR rate:", error);
    res.status(500).json({
      error: "InternalServerError",
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/quality/metrics/first-pass-yield
 * Calculate First Pass Yield metric
 *
 * Query Parameters:
 *   - siteId (required)
 *   - startDate (required): ISO format
 *   - endDate (required): ISO format
 *   - product (optional)
 */
router.get(
  "/metrics/first-pass-yield",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { siteId, startDate, endDate, product } = req.query;

      if (!siteId || !startDate || !endDate) {
        return res.status(400).json({
          error: "ValidationError",
          message: "Site ID, start date, and end date are required",
        });
      }

      const metric = await analyticsService.calculateFirstPassYield(
        siteId as string,
        new Date(startDate as string),
        new Date(endDate as string),
        product as string
      );

      res.status(200).json(metric);
    } catch (error: any) {
      console.error("Error calculating first pass yield:", error);
      res.status(500).json({
        error: "InternalServerError",
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/v1/quality/metrics/dpmo
 * Calculate DPMO (Defects Per Million Opportunities) metric
 *
 * Query Parameters:
 *   - siteId (required)
 *   - startDate (required): ISO format
 *   - endDate (required): ISO format
 *   - severity (optional)
 */
router.get("/metrics/dpmo", async (req: Request, res: Response): Promise<any> => {
  try {
    const { siteId, startDate, endDate, severity } = req.query;

    if (!siteId || !startDate || !endDate) {
      return res.status(400).json({
        error: "ValidationError",
        message: "Site ID, start date, and end date are required",
      });
    }

    const metric = await analyticsService.calculateDPMO(
      siteId as string,
      new Date(startDate as string),
      new Date(endDate as string),
      severity as string
    );

    res.status(200).json(metric);
  } catch (error: any) {
    console.error("Error calculating DPMO:", error);
    res.status(500).json({
      error: "InternalServerError",
      message: error.message,
    });
  }
});

// ============================================================================
// PARETO ANALYSIS ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/quality/pareto/:analysisType
 * Generate Pareto analysis for specified dimension
 *
 * Path Parameters:
 *   - analysisType: DEFECT_TYPE, ROOT_CAUSE, PRODUCT, SUPPLIER, etc.
 *
 * Query Parameters:
 *   - siteId (required)
 *   - startDate (required): ISO format
 *   - endDate (required): ISO format
 *   - severity (optional)
 *   - defectType (optional)
 */
router.get(
  "/pareto/:analysisType",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { analysisType } = req.params;
      const { siteId, startDate, endDate, severity, defectType } = req.query;

      if (!siteId) {
        return res.status(400).json({
          error: "ValidationError",
          message: "Site ID is required",
        });
      }

      if (!startDate || !endDate) {
        return res.status(400).json({
          error: "ValidationError",
          message: "Start date and end date are required",
        });
      }

      if (!analysisType) {
        return res.status(400).json({
          error: "ValidationError",
          message: "Analysis type is required",
        });
      }

      const paretoResult = await analyticsService.generateParetoAnalysis(
        siteId as string,
        analysisType,
        new Date(startDate as string),
        new Date(endDate as string),
        severity as string,
        defectType as string
      );

      res.status(200).json(paretoResult);
    } catch (error: any) {
      console.error("Error generating Pareto analysis:", error);
      res.status(500).json({
        error: "InternalServerError",
        message: error.message,
      });
    }
  }
);

// ============================================================================
// COST OF QUALITY ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/quality/coq
 * Calculate Cost of Quality by PAF model
 *
 * Query Parameters:
 *   - siteId (required)
 *   - startDate (required): ISO format
 *   - endDate (required): ISO format
 */
router.get("/coq", async (req: Request, res: Response): Promise<any> => {
  try {
    const { siteId, startDate, endDate } = req.query;

    if (!siteId || !startDate || !endDate) {
      return res.status(400).json({
        error: "ValidationError",
        message: "Site ID, start date, and end date are required",
      });
    }

    const coq = await analyticsService.calculateCostOfQuality(
      siteId as string,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.status(200).json(coq);
  } catch (error: any) {
    console.error("Error calculating cost of quality:", error);
    res.status(500).json({
      error: "InternalServerError",
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/quality/coq/history
 * Get Cost of Quality historical data
 *
 * Query Parameters:
 *   - siteId (required)
 *   - months (optional): Number of months to retrieve (default: 12)
 */
router.get("/coq/history", async (req: Request, res: Response): Promise<any> => {
  try {
    const { siteId, months } = req.query;

    if (!siteId || typeof siteId !== "string" || siteId.trim() === "") {
      return res.status(400).json({
        error: "ValidationError",
        message: "Site ID is required",
      });
    }

    const monthsBack = Math.max(1, Math.min(120, parseInt((months as string) || "12")));
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);

    const coqHistory = await prisma.qualityCoqTracking.findMany({
      where: {
        siteId,
        periodStart: {
          gte: startDate,
        },
      },
      orderBy: {
        periodStart: "asc",
      },
    });

    res.status(200).json({
      siteId,
      period: `Last ${monthsBack} months`,
      data: coqHistory,
    });
  } catch (error: any) {
    console.error("Error fetching CoQ history:", error);
    res.status(500).json({
      error: "InternalServerError",
      message: error.message,
    });
  }
});

// ============================================================================
// QUALITY CONFIGURATION ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/quality/config/:siteId
 * Get quality configuration for a site
 */
router.get("/config/:siteId", async (req: Request, res: Response): Promise<any> => {
  try {
    const { siteId } = req.params;

    if (!siteId || siteId.trim() === "") {
      return res.status(400).json({
        error: "ValidationError",
        message: "Site ID is required",
      });
    }

    const config = await prisma.qualityConfiguration.findUnique({
      where: { siteId },
    });

    if (!config) {
      return res.status(404).json({
        error: "NotFound",
        message: "Quality configuration not found for this site",
      });
    }

    res.status(200).json(config);
  } catch (error: any) {
    console.error("Error fetching quality configuration:", error);
    res.status(500).json({
      error: "InternalServerError",
      message: error.message,
    });
  }
});

/**
 * POST /api/v1/quality/config/:siteId
 * Create or update quality configuration
 */
router.post("/config/:siteId", async (req: Request, res: Response): Promise<any> => {
  try {
    const { siteId } = req.params;
    const {
      ncrRateThreshold,
      fypThreshold,
      dpmoThreshold,
      copqThreshold,
      alertEnabled,
      alertRecipients,
      reportingCurrency,
      createdBy,
    } = req.body;

    if (!siteId || siteId.trim() === "") {
      return res.status(400).json({
        error: "ValidationError",
        message: "Site ID is required",
      });
    }

    const config = await prisma.qualityConfiguration.upsert({
      where: { siteId },
      create: {
        siteId,
        ncrRateThreshold,
        fypThreshold,
        dpmoThreshold,
        copqThreshold,
        alertEnabled,
        alertRecipients,
        reportingCurrency,
        createdBy,
      },
      update: {
        ncrRateThreshold,
        fypThreshold,
        dpmoThreshold,
        copqThreshold,
        alertEnabled,
        alertRecipients,
        reportingCurrency,
      },
    });

    res.status(200).json(config);
  } catch (error: any) {
    console.error("Error upserting quality configuration:", error);
    res.status(500).json({
      error: "InternalServerError",
      message: error.message,
    });
  }
});

export default router;
