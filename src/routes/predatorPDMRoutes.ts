/**
 * Predator PDM Integration Routes
 *
 * REST API endpoints for Predator PDM (Production Data Management) integration.
 * Manages CAM programs, work instructions, FAI templates, and MBE data.
 *
 * Endpoints:
 * - GET    /api/predator-pdm/nc-program/:partNumber/:operationCode - Get NC program
 * - GET    /api/predator-pdm/work-instruction/:partNumber/:operationCode - Get work instruction
 * - GET    /api/predator-pdm/step-ap242/:partNumber    - Get STEP AP242 3D model
 * - GET    /api/predator-pdm/requirements/:partNumber  - Get requirements (ReqIF)
 * - GET    /api/predator-pdm/fai-template/:partNumber  - Get FAI template
 * - POST   /api/predator-pdm/search-documents          - Search documents
 * - POST   /api/predator-pdm/upload-document           - Upload document
 * - POST   /api/predator-pdm/approve-document          - Approve document
 * - GET    /api/predator-pdm/revision-history/:partNumber - Get revision history
 * - POST   /api/predator-pdm/link-requirement          - Link requirement to document
 * - GET    /api/predator-pdm/health                    - Get PDM connection health
 */

import express, { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getIntegrationManager } from '../services/IntegrationManager';
import { PredatorPDMAdapter } from '../services/PredatorPDMAdapter';

const router = express.Router();

// Require authentication for all routes
router.use(authMiddleware);

/**
 * GET /api/predator-pdm/nc-program/:partNumber/:operationCode
 * Get NC program for part and operation
 */
router.get('/nc-program/:partNumber/:operationCode', async (req: Request, res: Response) => {
  try {
    const { partNumber, operationCode } = req.params;
    const { revision } = req.query;

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('PDM') as PredatorPDMAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'Predator PDM adapter not configured' });
    }

    const program = await adapter.getNCProgram(partNumber, operationCode, revision as string | undefined);

    if (!program) {
      return res.status(404).json({
        success: false,
        error: `NC program not found for ${partNumber} ${operationCode}`,
      });
    }

    res.json({
      success: true,
      program,
    });
  } catch (error: any) {
    console.error('Error fetching NC program:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch NC program',
    });
  }
});

/**
 * GET /api/predator-pdm/work-instruction/:partNumber/:operationCode
 * Get work instruction for part and operation
 */
router.get('/work-instruction/:partNumber/:operationCode', async (req: Request, res: Response) => {
  try {
    const { partNumber, operationCode } = req.params;

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('PDM') as PredatorPDMAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'Predator PDM adapter not configured' });
    }

    const workInstruction = await adapter.getWorkInstruction(partNumber, operationCode);

    if (!workInstruction) {
      return res.status(404).json({
        success: false,
        error: `Work instruction not found for ${partNumber} ${operationCode}`,
      });
    }

    res.json({
      success: true,
      workInstruction,
    });
  } catch (error: any) {
    console.error('Error fetching work instruction:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch work instruction',
    });
  }
});

/**
 * GET /api/predator-pdm/step-ap242/:partNumber
 * Get STEP AP242 3D model with PMI (Model-Based Enterprise)
 */
router.get('/step-ap242/:partNumber', async (req: Request, res: Response) => {
  try {
    const { partNumber } = req.params;
    const { revision } = req.query;

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('PDM') as PredatorPDMAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'Predator PDM adapter not configured' });
    }

    const model = await adapter.getSTEPAP242Model(partNumber, revision as string | undefined);

    if (!model) {
      return res.status(404).json({
        success: false,
        error: `STEP AP242 model not found for ${partNumber}`,
      });
    }

    res.json({
      success: true,
      model,
    });
  } catch (error: any) {
    console.error('Error fetching STEP AP242 model:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch STEP AP242 model',
    });
  }
});

/**
 * GET /api/predator-pdm/requirements/:partNumber
 * Get requirements for part (ReqIF)
 */
router.get('/requirements/:partNumber', async (req: Request, res: Response) => {
  try {
    const { partNumber } = req.params;

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('PDM') as PredatorPDMAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'Predator PDM adapter not configured' });
    }

    const requirements = await adapter.getRequirements(partNumber);

    res.json({
      success: true,
      partNumber,
      requirements,
      count: requirements.length,
    });
  } catch (error: any) {
    console.error('Error fetching requirements:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch requirements',
    });
  }
});

/**
 * GET /api/predator-pdm/fai-template/:partNumber
 * Get FAI template for part
 */
router.get('/fai-template/:partNumber', async (req: Request, res: Response) => {
  try {
    const { partNumber } = req.params;

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('PDM') as PredatorPDMAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'Predator PDM adapter not configured' });
    }

    const template = await adapter.getFAITemplate(partNumber);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: `FAI template not found for ${partNumber}`,
      });
    }

    res.json({
      success: true,
      template,
    });
  } catch (error: any) {
    console.error('Error fetching FAI template:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch FAI template',
    });
  }
});

/**
 * POST /api/predator-pdm/search-documents
 * Search documents in PDM
 */
router.post('/search-documents', async (req: Request, res: Response) => {
  try {
    const { partNumber, documentType, status, revision, tags } = req.body;

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('PDM') as PredatorPDMAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'Predator PDM adapter not configured' });
    }

    const documents = await adapter.searchDocuments({
      partNumber,
      documentType,
      status,
      revision,
      tags,
    });

    res.json({
      success: true,
      documents,
      count: documents.length,
    });
  } catch (error: any) {
    console.error('Error searching documents:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to search documents',
    });
  }
});

/**
 * POST /api/predator-pdm/approve-document
 * Approve document in PDM
 */
router.post('/approve-document', async (req: Request, res: Response) => {
  try {
    const { documentId, approvedBy } = req.body;

    if (!documentId || !approvedBy) {
      return res.status(400).json({
        error: 'Missing required fields: documentId, approvedBy',
      });
    }

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('PDM') as PredatorPDMAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'Predator PDM adapter not configured' });
    }

    const success = await adapter.approveDocument(documentId, approvedBy);

    if (success) {
      res.json({
        success: true,
        message: `Document ${documentId} approved by ${approvedBy}`,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to approve document',
      });
    }
  } catch (error: any) {
    console.error('Error approving document:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to approve document',
    });
  }
});

/**
 * GET /api/predator-pdm/revision-history/:partNumber
 * Get document revision history for part
 */
router.get('/revision-history/:partNumber', async (req: Request, res: Response) => {
  try {
    const { partNumber } = req.params;
    const { documentType } = req.query;

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('PDM') as PredatorPDMAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'Predator PDM adapter not configured' });
    }

    const revisions = await adapter.getRevisionHistory(partNumber, documentType as string | undefined);

    res.json({
      success: true,
      partNumber,
      revisions,
      count: revisions.length,
    });
  } catch (error: any) {
    console.error('Error fetching revision history:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch revision history',
    });
  }
});

/**
 * POST /api/predator-pdm/link-requirement
 * Link requirement to document (digital thread)
 */
router.post('/link-requirement', async (req: Request, res: Response) => {
  try {
    const { requirementId, documentId } = req.body;

    if (!requirementId || !documentId) {
      return res.status(400).json({
        error: 'Missing required fields: requirementId, documentId',
      });
    }

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('PDM') as PredatorPDMAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'Predator PDM adapter not configured' });
    }

    const success = await adapter.linkRequirementToDocument(requirementId, documentId);

    if (success) {
      res.json({
        success: true,
        message: `Linked requirement ${requirementId} to document ${documentId}`,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to link requirement to document',
      });
    }
  } catch (error: any) {
    console.error('Error linking requirement:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to link requirement',
    });
  }
});

/**
 * GET /api/predator-pdm/health
 * Get Predator PDM adapter health status
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('PDM') as PredatorPDMAdapter | undefined;

    if (!adapter) {
      return res.json({
        connected: false,
        error: 'Predator PDM adapter not configured',
      });
    }

    const health = await adapter.getHealthStatus();

    res.json(health);
  } catch (error: any) {
    console.error('Error checking Predator PDM health:', error);
    res.status(500).json({
      connected: false,
      error: error.message || 'Failed to check health',
    });
  }
});

export default router;
