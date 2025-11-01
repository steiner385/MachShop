/**
 * Product Genealogy & BOM Management API Routes
 * Issue #105: Product Genealogy & BOM Management
 *
 * Endpoints for:
 * - Product genealogy queries (forward, backward, full tree)
 * - BOM management (as-built, variants, comparisons)
 * - Recall simulation and impact analysis
 */

import { Router, Request, Response } from 'express';
import ProductGenealogyService from '../services/ProductGenealogyService';
import AsBuiltBOMService from '../services/AsBuiltBOMService';
import RecallSimulationService from '../services/RecallSimulationService';
import { authenticateRequest, authorizeAction } from '../middleware/auth';

const router = Router();
const genealogyService = new ProductGenealogyService();
const bomService = new AsBuiltBOMService();
const recallService = new RecallSimulationService();

// ==================== PRODUCT GENEALOGY ====================

/**
 * Get backward traceability (upstream - where part comes from)
 * GET /product-genealogy/parts/:partId/backward
 */
router.get('/parts/:partId/backward', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const depth = parseInt(req.query.depth as string) || 10;
    const traceability = await genealogyService.getBackwardTraceability(req.params.partId, depth);
    res.json({ success: true, data: traceability });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get forward traceability (downstream - where part is used)
 * GET /product-genealogy/parts/:partId/forward
 */
router.get('/parts/:partId/forward', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const depth = parseInt(req.query.depth as string) || 10;
    const traceability = await genealogyService.getForwardTraceability(req.params.partId, depth);
    res.json({ success: true, data: traceability });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get full genealogy tree (upstream and downstream)
 * GET /product-genealogy/parts/:partId/genealogy
 */
router.get('/parts/:partId/genealogy', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const upstreamDepth = parseInt(req.query.upstreamDepth as string) || 5;
    const downstreamDepth = parseInt(req.query.downstreamDepth as string) || 5;
    const tree = await genealogyService.getFullGenealogyTree(
      req.params.partId,
      upstreamDepth,
      downstreamDepth
    );
    res.json({ success: true, data: tree });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get genealogy depth
 * GET /product-genealogy/parts/:partId/depth
 */
router.get('/parts/:partId/depth', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const depth = await genealogyService.getGenealogyDepth(req.params.partId);
    res.json({ success: true, data: depth });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Analyze recall impact on product genealogy
 * GET /product-genealogy/parts/:partId/recall-impact
 */
router.get('/parts/:partId/recall-impact', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const impact = await genealogyService.analyzeRecallImpact(req.params.partId);
    res.json({ success: true, data: impact });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get part numbering scheme
 * GET /product-genealogy/schemes/:schemeId
 */
router.get('/schemes/:schemeId', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const scheme = await genealogyService.getPartNumberingScheme(req.params.schemeId);
    res.json({ success: true, data: scheme });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get product family and variants
 * GET /product-genealogy/families/:partId
 */
router.get('/families/:partId', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const family = await genealogyService.getProductFamily(req.params.partId);
    res.json({ success: true, data: family });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== BOM MANAGEMENT ====================

/**
 * Get As-Built BOM
 * GET /product-genealogy/bom/:partId
 */
router.get('/bom/:partId', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const bom = await bomService.getAsBuiltBOM(req.params.partId);
    res.json({ success: true, data: bom });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Create or update As-Built BOM
 * POST /product-genealogy/bom/:partId
 */
router.post('/bom/:partId', authenticateRequest, authorizeAction('bom_manage'), async (req: Request, res: Response) => {
  try {
    const { components, notes } = req.body;

    if (!components || !Array.isArray(components)) {
      return res.status(400).json({ error: 'Missing required field: components (array)' });
    }

    const bom = await bomService.createOrUpdateAsBuiltBOM(
      req.params.partId,
      components,
      req.user?.id || 'SYSTEM',
      notes
    );

    res.json({ success: true, data: bom });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get BOM variants
 * GET /product-genealogy/bom/:partId/variants
 */
router.get('/bom/:partId/variants', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const variants = await bomService.getBOMVariants(req.params.partId);
    res.json({ success: true, data: variants, count: variants.length });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Compare planned BOM vs As-Built BOM
 * POST /product-genealogy/bom/:partId/compare
 */
router.post('/bom/:partId/compare', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const { plannedBOM, asBuiltBOM } = req.body;

    if (!plannedBOM || !asBuiltBOM) {
      return res.status(400).json({ error: 'Missing required fields: plannedBOM, asBuiltBOM' });
    }

    const comparison = await bomService.compareBOMs(req.params.partId, plannedBOM, asBuiltBOM);
    res.json({ success: true, data: comparison });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Check component substitutions
 * GET /product-genealogy/substitutions/:componentPartId
 */
router.get('/substitutions/:componentPartId', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const substitutions = await bomService.checkComponentSubstitutions(req.params.componentPartId);
    res.json({ success: true, data: substitutions, count: substitutions.length });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Apply component substitution
 * POST /product-genealogy/substitutions
 */
router.post('/substitutions', authenticateRequest, authorizeAction('bom_manage'), async (req: Request, res: Response) => {
  try {
    const { originalComponentId, substitutionComponentId, parentPartId, notes } = req.body;

    if (!originalComponentId || !substitutionComponentId || !parentPartId) {
      return res.status(400).json({
        error: 'Missing required fields: originalComponentId, substitutionComponentId, parentPartId',
      });
    }

    const result = await bomService.applySubstitution(
      originalComponentId,
      substitutionComponentId,
      parentPartId,
      req.user?.id || 'SYSTEM',
      notes
    );

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get BOM version history
 * GET /product-genealogy/bom/:partId/versions
 */
router.get('/bom/:partId/versions', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const history = await bomService.getBOMVersionHistory(req.params.partId);
    res.json({ success: true, data: history, count: history.length });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Validate BOM completeness
 * GET /product-genealogy/bom/:partId/validate
 */
router.get('/bom/:partId/validate', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const validation = await bomService.validateBOMCompleteness(req.params.partId);
    res.json({ success: true, data: validation });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Analyze BOM cost
 * GET /product-genealogy/bom/:partId/cost
 */
router.get('/bom/:partId/cost', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const cost = await bomService.analyzeBOMCost(req.params.partId);
    res.json({ success: true, data: cost });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== RECALL SIMULATION ====================

/**
 * Simulate a product recall
 * POST /product-genealogy/recalls/simulate
 */
router.post('/recalls/simulate', authenticateRequest, authorizeAction('recall_simulate'), async (req: Request, res: Response) => {
  try {
    const { partId, severity, reason } = req.body;

    if (!partId || !severity || !reason) {
      return res.status(400).json({
        error: 'Missing required fields: partId, severity, reason',
      });
    }

    const simulation = await recallService.simulateRecall(partId, severity, reason);
    res.json({ success: true, data: simulation });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get recall impact analysis
 * GET /product-genealogy/recalls/:recallId/impact
 */
router.get('/recalls/:recallId/impact', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const impact = await recallService.getRecallImpactAnalysis(req.params.recallId);
    res.json({ success: true, data: impact });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Generate recall action plan
 * POST /product-genealogy/recalls/:recallId/action-plan
 */
router.post('/recalls/:recallId/action-plan', authenticateRequest, authorizeAction('recall_manage'), async (req: Request, res: Response) => {
  try {
    const { affectedUnits, severity } = req.body;

    if (!affectedUnits || !severity) {
      return res.status(400).json({
        error: 'Missing required fields: affectedUnits, severity',
      });
    }

    const actions = await recallService.generateRecallActionPlan(
      req.params.recallId,
      affectedUnits,
      severity
    );

    res.json({ success: true, data: actions, count: actions.length });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Track recall effectiveness
 * GET /product-genealogy/recalls/:recallId/effectiveness
 */
router.get('/recalls/:recallId/effectiveness', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const effectiveness = await recallService.trackRecallEffectiveness(req.params.recallId);
    res.json({ success: true, data: effectiveness });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Estimate recall cost
 * POST /product-genealogy/recalls/estimate-cost
 */
router.post('/recalls/estimate-cost', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const { affectedUnits, severity, recallType } = req.body;

    if (!affectedUnits || !severity || !recallType) {
      return res.status(400).json({
        error: 'Missing required fields: affectedUnits, severity, recallType',
      });
    }

    const estimate = await recallService.estimateRecallCost(affectedUnits, severity, recallType);
    res.json({ success: true, data: estimate });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Identify critical recall areas
 * GET /product-genealogy/recalls/:recallId/critical-areas
 */
router.get('/recalls/:recallId/critical-areas', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const areas = await recallService.identifyCriticalAreas(req.params.recallId);
    res.json({ success: true, data: areas, count: areas.length });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Generate recall report
 * GET /product-genealogy/recalls/:recallId/report
 */
router.get('/recalls/:recallId/report', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const report = await recallService.generateRecallReport(req.params.recallId);
    res.json({ success: true, data: report });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
