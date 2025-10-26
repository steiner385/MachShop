/**
 * Parameter Formulas Routes
 *
 * REST API endpoints for formula engine management including:
 * - Formula CRUD operations
 * - Formula validation and testing
 * - Formula evaluation with test cases
 * - Dependency tracking
 * - Triggered formula execution
 */

import express, { Request, Response } from 'express';
import { formulaEngine } from '../services/FormulaEngine';
import { createLogger } from '../utils/logger';

const router = express.Router();
const logger = createLogger('ParameterFormulasRoutes');

// ======================
// FORMULA CRUD OPERATIONS
// ======================

/**
 * POST /api/v1/formulas
 * Create a new formula
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const formula = await formulaEngine.createFormula(req.body);

    logger.info('Formula created', { formulaId: formula.id });
    return res.status(201).json(formula);
  } catch (error: any) {
    logger.error('Error creating formula', { error: error.message });
    return res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/v1/formulas/:id
 * Get a formula by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const formula = await formulaEngine.getFormula(id);

    if (!formula) {
      return res.status(404).json({ error: 'Formula not found' });
    }

    return res.json(formula);
  } catch (error: any) {
    logger.error('Error fetching formula', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/v1/formulas/:id
 * Update a formula
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id || 'system'; // Get user from auth middleware

    const formula = await formulaEngine.updateFormula(id, req.body, userId);

    logger.info('Formula updated', { formulaId: id });
    return res.json(formula);
  } catch (error: any) {
    logger.error('Error updating formula', { error: error.message });
    return res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/v1/formulas/:id
 * Delete a formula
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await formulaEngine.deleteFormula(id);

    logger.info('Formula deleted', { formulaId: id });
    return res.status(204).send();
  } catch (error: any) {
    logger.error('Error deleting formula', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/formulas
 * List all formulas with optional filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const filters: any = {};

    if (req.query.isActive !== undefined) {
      filters.isActive = req.query.isActive === 'true';
    }

    if (req.query.outputParameterId) {
      filters.outputParameterId = req.query.outputParameterId as string;
    }

    const formulas = await formulaEngine.listFormulas(filters);
    return res.json(formulas);
  } catch (error: any) {
    logger.error('Error listing formulas', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

// ======================
// FORMULA EVALUATION
// ======================

/**
 * POST /api/v1/formulas/:id/evaluate
 * Evaluate a formula with given parameter values
 * Body: { parameterValues: Record<string, any> }
 */
router.post('/:id/evaluate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { parameterValues } = req.body;

    if (!parameterValues || typeof parameterValues !== 'object') {
      return res.status(400).json({ error: 'parameterValues object is required' });
    }

    const result = await formulaEngine.evaluateFormula(id, parameterValues);
    return res.json(result);
  } catch (error: any) {
    logger.error('Error evaluating formula', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/formulas/evaluate-expression
 * Evaluate a formula expression directly (for testing)
 * Body: { expression: string, scope: Record<string, any> }
 */
router.post('/evaluate-expression', async (req: Request, res: Response) => {
  try {
    const { expression, scope } = req.body;

    if (!expression || typeof expression !== 'string') {
      return res.status(400).json({ error: 'expression string is required' });
    }

    if (!scope || typeof scope !== 'object') {
      return res.status(400).json({ error: 'scope object is required' });
    }

    const result = await formulaEngine.evaluate(expression, scope);
    return res.json(result);
  } catch (error: any) {
    logger.error('Error evaluating expression', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

// ======================
// FORMULA VALIDATION & TESTING
// ======================

/**
 * POST /api/v1/formulas/validate
 * Validate a formula expression without saving
 * Body: { expression: string }
 */
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { expression } = req.body;

    if (!expression || typeof expression !== 'string') {
      return res.status(400).json({ error: 'expression string is required' });
    }

    const validation = await formulaEngine.validateFormula(expression);
    return res.json(validation);
  } catch (error: any) {
    logger.error('Error validating formula', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/formulas/test
 * Run test cases against a formula expression
 * Body: { expression: string, testCases: TestCase[] }
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { expression, testCases } = req.body;

    if (!expression || typeof expression !== 'string') {
      return res.status(400).json({ error: 'expression string is required' });
    }

    if (!Array.isArray(testCases)) {
      return res.status(400).json({ error: 'testCases array is required' });
    }

    const results = await formulaEngine.runTestCases(expression, testCases);
    return res.json(results);
  } catch (error: any) {
    logger.error('Error running test cases', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/formulas/extract-dependencies
 * Extract parameter dependencies from a formula expression
 * Body: { expression: string }
 */
router.post('/extract-dependencies', async (req: Request, res: Response) => {
  try {
    const { expression } = req.body;

    if (!expression || typeof expression !== 'string') {
      return res.status(400).json({ error: 'expression string is required' });
    }

    const dependencies = formulaEngine.extractDependencies(expression);
    return res.json({ dependencies });
  } catch (error: any) {
    logger.error('Error extracting dependencies', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

// ======================
// FORMULA ACTIVATION
// ======================

/**
 * PATCH /api/v1/formulas/:id/active
 * Activate or deactivate a formula
 * Body: { isActive: boolean }
 */
router.patch('/:id/active', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive boolean is required' });
    }

    const formula = await formulaEngine.setFormulaActive(id, isActive);

    logger.info('Formula activation changed', { formulaId: id, isActive });
    return res.json(formula);
  } catch (error: any) {
    logger.error('Error changing formula activation', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

// ======================
// PARAMETER RELATIONSHIPS
// ======================

/**
 * GET /api/v1/formulas/parameter/:parameterId
 * Get all formulas for a parameter (as input or output)
 */
router.get('/parameter/:parameterId', async (req: Request, res: Response) => {
  try {
    const { parameterId } = req.params;
    const formulas = await formulaEngine.getFormulasForParameter(parameterId);

    return res.json(formulas);
  } catch (error: any) {
    logger.error('Error fetching formulas for parameter', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/formulas/triggered/:parameterId
 * Get formulas that should be evaluated when a parameter changes
 */
router.get('/triggered/:parameterId', async (req: Request, res: Response) => {
  try {
    const { parameterId } = req.params;
    const formulas = await formulaEngine.getTriggeredFormulas(parameterId);

    return res.json(formulas);
  } catch (error: any) {
    logger.error('Error fetching triggered formulas', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/formulas/evaluate-triggered/:parameterId
 * Evaluate all formulas triggered by a parameter change
 * Body: { allParameterValues: Record<string, any> }
 */
router.post('/evaluate-triggered/:parameterId', async (req: Request, res: Response) => {
  try {
    const { parameterId } = req.params;
    const { allParameterValues } = req.body;

    if (!allParameterValues || typeof allParameterValues !== 'object') {
      return res.status(400).json({ error: 'allParameterValues object is required' });
    }

    const results = await formulaEngine.evaluateTriggeredFormulas(parameterId, allParameterValues);
    return res.json(results);
  } catch (error: any) {
    logger.error('Error evaluating triggered formulas', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

export default router;
