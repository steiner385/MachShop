/**
 * Parameter Limits Routes
 *
 * REST API endpoints for parameter limit management including:
 * - Multi-level limit configuration
 * - Limit validation against hierarchy
 * - Value evaluation against limits
 * - Engineering, operating, quality, and alarm limits
 */

import express, { Request, Response } from 'express';
import { parameterLimitsService } from '../services/ParameterLimitsService';
import { createLogger } from '../utils/logger';

const router = express.Router();
const logger = createLogger('ParameterLimitsRoutes');

// ======================
// PARAMETER LIMITS CRUD
// ======================

/**
 * POST /api/v1/parameters/:parameterId/limits
 * Create or update limits for a parameter
 */
router.post('/:parameterId/limits', async (req: Request, res: Response) => {
  try {
    const { parameterId } = req.params;
    const limits = await parameterLimitsService.upsertLimits(parameterId, req.body);

    logger.info('Parameter limits upserted', { parameterId });
    return res.status(200).json(limits);
  } catch (error: any) {
    logger.error('Error upserting parameter limits', { error: error.message });
    return res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/v1/parameters/:parameterId/limits
 * Get limits for a parameter
 */
router.get('/:parameterId/limits', async (req: Request, res: Response) => {
  try {
    const { parameterId } = req.params;
    const limits = await parameterLimitsService.getLimits(parameterId);

    if (!limits) {
      return res.status(404).json({ error: 'Parameter limits not found' });
    }

    return res.json(limits);
  } catch (error: any) {
    logger.error('Error fetching parameter limits', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/v1/parameters/:parameterId/limits
 * Delete limits for a parameter
 */
router.delete('/:parameterId/limits', async (req: Request, res: Response) => {
  try {
    const { parameterId } = req.params;
    await parameterLimitsService.deleteLimits(parameterId);

    logger.info('Parameter limits deleted', { parameterId });
    return res.status(204).send();
  } catch (error: any) {
    logger.error('Error deleting parameter limits', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

// ======================
// LIMIT VALIDATION
// ======================

/**
 * POST /api/v1/parameters/limits/validate
 * Validate limit hierarchy without saving
 */
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const validation = parameterLimitsService.validateLimitHierarchy(req.body);
    return res.json(validation);
  } catch (error: any) {
    logger.error('Error validating limits', { error: error.message });
    return res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/v1/parameters/:parameterId/limits/evaluate
 * Evaluate a value against parameter limits
 * Body: { value: number }
 */
router.post('/:parameterId/limits/evaluate', async (req: Request, res: Response) => {
  try {
    const { parameterId } = req.params;
    const { value } = req.body;

    if (typeof value !== 'number') {
      return res.status(400).json({ error: 'Value must be a number' });
    }

    const limits = await parameterLimitsService.getLimits(parameterId);
    if (!limits) {
      return res.status(404).json({ error: 'Parameter limits not found' });
    }

    const evaluation = parameterLimitsService.evaluateValue(value, limits);
    return res.json(evaluation);
  } catch (error: any) {
    logger.error('Error evaluating value', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

// ======================
// BULK OPERATIONS
// ======================

/**
 * GET /api/v1/parameters/limits
 * Get all parameters with limits
 */
router.get('/limits', async (req: Request, res: Response) => {
  try {
    const parameters = await parameterLimitsService.getAllParametersWithLimits();
    return res.json(parameters);
  } catch (error: any) {
    logger.error('Error fetching all parameters with limits', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

export default router;
