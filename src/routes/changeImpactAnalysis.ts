/**
 * Change Impact Analysis Routes (Issue #225)
 *
 * REST API endpoints for change impact analysis including where-used analysis,
 * impact assessment, and change recommendations.
 */

import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { ChangeImpactAnalysisService } from '../services/ChangeImpactAnalysisService';
import { logger } from '../utils/logger';

const router = Router();
const changeImpactService = ChangeImpactAnalysisService.getInstance();

// ============================================================================
// WHERE-USED ANALYSIS ENDPOINTS
// ============================================================================

/**
 * GET /api/change-impact/where-used/:partId
 * Perform where-used analysis for a part
 */
router.get('/where-used/:partId', authenticate, async (req: Request, res: Response) => {
  try {
    const { partId } = req.params;
    const { maxDepth = 10, includeEffectivity = true, effectiveDate } = req.query;

    logger.info(`Where-used analysis requested for part ${partId}`);

    const analysis = await changeImpactService.analyzeWhereUsed({
      partId,
      maxDepth: parseInt(maxDepth as string) || 10,
      includeEffectivity: includeEffectivity === 'true',
      effectiveDate: effectiveDate ? new Date(effectiveDate as string) : undefined,
    });

    res.status(200).json({
      success: true,
      data: analysis,
    });
  } catch (error: any) {
    logger.error(`Where-used analysis failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/change-impact/where-used/:partId/export
 * Export where-used analysis in specified format
 */
router.get('/where-used/:partId/export', authenticate, async (req: Request, res: Response) => {
  try {
    const { partId } = req.params;
    const { format = 'JSON' } = req.query;

    logger.info(`Where-used analysis export requested for part ${partId} in format ${format}`);

    const exportData = await changeImpactService.exportWhereUsedAnalysis(
      partId,
      (format as 'JSON' | 'CSV' | 'PDF') || 'JSON'
    );

    if (format === 'CSV') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="where-used-${partId}.csv"`);
      res.status(200).send(exportData);
    } else {
      res.status(200).json({
        success: true,
        data: exportData,
      });
    }
  } catch (error: any) {
    logger.error(`Where-used analysis export failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// IMPACT ASSESSMENT ENDPOINTS
// ============================================================================

/**
 * POST /api/change-impact/assess
 * Perform comprehensive impact assessment for a change
 */
router.post('/assess', authenticate, requireRole(['ENGINEER', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const {
      sourcePart,
      changeDescription,
      changeType,
      severity,
      affectedAssemblies,
    } = req.body;

    logger.info(`Impact assessment requested for part ${sourcePart.partNumber}`);

    // Validate required fields
    if (!sourcePart?.id || !changeType || !severity) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: sourcePart.id, changeType, severity',
      });
    }

    const assessment = await changeImpactService.assessChangeImpact({
      sourcePart,
      changeDescription,
      changeType,
      severity,
      affectedAssemblies: affectedAssemblies || [],
    });

    res.status(200).json({
      success: true,
      data: assessment,
    });
  } catch (error: any) {
    logger.error(`Impact assessment failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// ANALYSIS SUMMARY ENDPOINTS
// ============================================================================

/**
 * GET /api/change-impact/summary/:partId
 * Get quick summary of change impact for a part
 */
router.get('/summary/:partId', authenticate, async (req: Request, res: Response) => {
  try {
    const { partId } = req.params;

    logger.info(`Change impact summary requested for part ${partId}`);

    const analysis = await changeImpactService.analyzeWhereUsed({
      partId,
      maxDepth: 5, // Limit depth for quick summary
    });

    const summary = {
      partId: analysis.partId,
      partNumber: analysis.partNumber,
      partName: analysis.partName,
      totalAffectedAssemblies: analysis.totalAffectedCount,
      hierarchyDepth: analysis.hierarchyDepth,
      hasInterfaceBoundaries: analysis.affectedAssemblies.some((a) => a.hasInterfaceBoundary),
      interfaceControlDocuments: Array.from(
        new Set(
          analysis.affectedAssemblies
            .flatMap((a) => a.interfaceControlDocuments || [])
        )
      ),
      riskIndicators: {
        highImpact: analysis.totalAffectedCount > 5,
        hasICDChanges: analysis.affectedAssemblies.some((a) => a.interfaceControlDocuments && a.interfaceControlDocuments.length > 0),
        deepHierarchy: analysis.hierarchyDepth > 6,
      },
    };

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    logger.error(`Change impact summary failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * GET /api/change-impact/health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Change Impact Analysis Service is operational',
  });
});

export default router;
