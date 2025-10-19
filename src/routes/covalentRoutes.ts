/**
 * Covalent Skills Tracking Integration Routes
 *
 * AS9100 Clause 7.2: Competence
 * REST API endpoints for Covalent skills tracking integration.
 *
 * Endpoints:
 * - POST   /api/covalent/check-authorization    - Check work authorization for operator
 * - POST   /api/covalent/validate-fai-inspector - Validate FAI inspector qualification
 * - POST   /api/covalent/check-dnc-authorization - Check DNC program load authorization
 * - GET    /api/covalent/operator/:operatorId/certifications - Get operator certifications
 * - GET    /api/covalent/operator/:operatorId/skills - Get operator skills
 * - GET    /api/covalent/health                  - Get Covalent connection health
 */

import express, { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getIntegrationManager } from '../services/IntegrationManager';
import { CovalentAdapter } from '../services/CovalentAdapter';

const router = express.Router();

// Require authentication for all routes
router.use(authMiddleware);

/**
 * POST /api/covalent/check-authorization
 * Check work authorization for an operator
 */
router.post('/check-authorization', async (req: Request, res: Response) => {
  try {
    const {
      operatorId,
      workType,
      partNumber,
      partComplexity,
      machineType,
      requiredCertifications,
    } = req.body;

    if (!operatorId || !workType) {
      return res.status(400).json({
        error: 'Missing required fields: operatorId, workType',
      });
    }

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('SKILLS') as CovalentAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'Covalent adapter not configured' });
    }

    const result = await adapter.checkWorkAuthorization({
      operatorId,
      workType,
      partNumber,
      partComplexity,
      machineType,
      requiredCertifications,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error checking work authorization:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check work authorization',
    });
  }
});

/**
 * POST /api/covalent/validate-fai-inspector
 * Validate FAI inspector qualification
 */
router.post('/validate-fai-inspector', async (req: Request, res: Response) => {
  try {
    const { operatorId } = req.body;

    if (!operatorId) {
      return res.status(400).json({ error: 'Missing required field: operatorId' });
    }

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('SKILLS') as CovalentAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'Covalent adapter not configured' });
    }

    const result = await adapter.validateFAIInspector(operatorId);

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error validating FAI inspector:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to validate FAI inspector',
    });
  }
});

/**
 * POST /api/covalent/check-dnc-authorization
 * Check DNC program load authorization
 */
router.post('/check-dnc-authorization', async (req: Request, res: Response) => {
  try {
    const { operatorId, machineType, programName, partNumber, partComplexity } = req.body;

    if (!operatorId || !machineType || !programName || !partNumber || !partComplexity) {
      return res.status(400).json({
        error: 'Missing required fields: operatorId, machineType, programName, partNumber, partComplexity',
      });
    }

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('SKILLS') as CovalentAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'Covalent adapter not configured' });
    }

    const result = await adapter.checkDNCAuthorization({
      operatorId,
      machineType,
      programName,
      partNumber,
      partComplexity,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error checking DNC authorization:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check DNC authorization',
    });
  }
});

/**
 * GET /api/covalent/operator/:operatorId/certifications
 * Get operator certifications
 */
router.get('/operator/:operatorId/certifications', async (req: Request, res: Response) => {
  try {
    const { operatorId } = req.params;

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('SKILLS') as CovalentAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'Covalent adapter not configured' });
    }

    const certifications = await adapter.getOperatorCertifications(operatorId);

    res.json({
      success: true,
      operatorId,
      certifications,
      count: certifications.length,
    });
  } catch (error: any) {
    console.error('Error fetching operator certifications:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch operator certifications',
    });
  }
});

/**
 * GET /api/covalent/operator/:operatorId/skills
 * Get operator skills
 */
router.get('/operator/:operatorId/skills', async (req: Request, res: Response) => {
  try {
    const { operatorId } = req.params;

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('SKILLS') as CovalentAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'Covalent adapter not configured' });
    }

    const skills = await adapter.getOperatorSkills(operatorId);

    res.json({
      success: true,
      operatorId,
      skills,
      count: skills.length,
    });
  } catch (error: any) {
    console.error('Error fetching operator skills:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch operator skills',
    });
  }
});

/**
 * GET /api/covalent/health
 * Get Covalent adapter health status
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('SKILLS') as CovalentAdapter | undefined;

    if (!adapter) {
      return res.json({
        connected: false,
        error: 'Covalent adapter not configured',
      });
    }

    const health = await adapter.getHealthStatus();

    res.json(health);
  } catch (error: any) {
    console.error('Error checking Covalent health:', error);
    res.status(500).json({
      connected: false,
      error: error.message || 'Failed to check health',
    });
  }
});

export default router;
