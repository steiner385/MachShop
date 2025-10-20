/**
 * Shop Floor Connect Integration Routes
 *
 * AS9100 Clause 8.5.6: Control of changes
 * REST API endpoints for Shop Floor Connect CNC program version control.
 *
 * Endpoints:
 * - POST   /api/shop-floor-connect/sync-programs        - Sync programs from Teamcenter
 * - POST   /api/shop-floor-connect/check-revision       - Check program revision
 * - POST   /api/shop-floor-connect/authorize-download   - Authorize program download
 * - POST   /api/shop-floor-connect/approve-first-piece  - Approve first piece for program
 * - GET    /api/shop-floor-connect/program/:programName - Get program details
 * - GET    /api/shop-floor-connect/eco/:ecoNumber       - Get ECO details
 * - GET    /api/shop-floor-connect/health               - Get SFC connection health
 */

import express, { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getIntegrationManager } from '../services/IntegrationManager';
import { ShopFloorConnectAdapter } from '../services/ShopFloorConnectAdapter';

const router = express.Router();

// Require authentication for all routes
router.use(authMiddleware);

/**
 * POST /api/shop-floor-connect/sync-programs
 * Sync CNC programs from Teamcenter
 */
router.post('/sync-programs', async (req: Request, res: Response): Promise<any> => {
  try {
    const { partNumber } = req.body;

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('SFC') as ShopFloorConnectAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'Shop Floor Connect adapter not configured' });
    }

    const result = await adapter.syncProgramsFromTeamcenter(partNumber);

    res.json({
      success: true,
      message: `Synced ${result.syncedCount} programs from Teamcenter`,
      ...result,
    });
  } catch (error: any) {
    console.error('Error syncing programs:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync programs from Teamcenter',
    });
  }
});

/**
 * POST /api/shop-floor-connect/check-revision
 * Check program revision for a part
 */
router.post('/check-revision', async (req: Request, res: Response): Promise<any> => {
  try {
    const { programName, partNumber, workOrderNumber } = req.body;

    if (!programName || !partNumber) {
      return res.status(400).json({
        error: 'Missing required fields: programName, partNumber',
      });
    }

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('SFC') as ShopFloorConnectAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'Shop Floor Connect adapter not configured' });
    }

    const result = await adapter.checkProgramRevision({
      programName,
      partNumber,
      workOrderNumber,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error checking program revision:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check program revision',
    });
  }
});

/**
 * POST /api/shop-floor-connect/authorize-download
 * Authorize CNC program download to equipment
 */
router.post('/authorize-download', async (req: Request, res: Response): Promise<any> => {
  try {
    const { programName, partNumber, revision, machineId, operatorId, workOrderNumber } = req.body;

    if (!programName || !partNumber || !revision || !machineId || !operatorId) {
      return res.status(400).json({
        error: 'Missing required fields: programName, partNumber, revision, machineId, operatorId',
      });
    }

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('SFC') as ShopFloorConnectAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'Shop Floor Connect adapter not configured' });
    }

    const result = await adapter.authorizeProgramDownload({
      programName,
      partNumber,
      revision,
      machineId,
      operatorId,
      workOrderNumber,
    });

    res.json({
      success: result.authorized,
      ...result,
    });
  } catch (error: any) {
    console.error('Error authorizing program download:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to authorize program download',
    });
  }
});

/**
 * POST /api/shop-floor-connect/approve-first-piece
 * Approve first piece for a CNC program
 */
router.post('/approve-first-piece', async (req: Request, res: Response): Promise<any> => {
  try {
    const { programId, programName, revision, faiReportNumber, approvedBy, approvalDate } = req.body;

    if (!programId || !programName || !revision || !faiReportNumber || !approvedBy) {
      return res.status(400).json({
        error: 'Missing required fields: programId, programName, revision, faiReportNumber, approvedBy',
      });
    }

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('SFC') as ShopFloorConnectAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'Shop Floor Connect adapter not configured' });
    }

    const success = await adapter.approveFirstPiece({
      programId,
      programName,
      revision,
      faiReportNumber,
      approvedBy,
      approvalDate: approvalDate ? new Date(approvalDate) : new Date(),
    });

    if (success) {
      res.json({
        success: true,
        message: `First piece approved for program ${programName} revision ${revision}`,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to approve first piece',
      });
    }
  } catch (error: any) {
    console.error('Error approving first piece:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to approve first piece',
    });
  }
});

/**
 * GET /api/shop-floor-connect/program/:programName
 * Get CNC program details
 */
router.get('/program/:programName', async (req: Request, res: Response): Promise<any> => {
  try {
    const { programName } = req.params;
    const { partNumber } = req.query;

    if (!partNumber) {
      return res.status(400).json({ error: 'Missing required query parameter: partNumber' });
    }

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('SFC') as ShopFloorConnectAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'Shop Floor Connect adapter not configured' });
    }

    const program = await adapter.getProgramDetails(programName, partNumber as string);

    if (!program) {
      return res.status(404).json({
        success: false,
        error: `Program ${programName} not found for part ${partNumber}`,
      });
    }

    res.json({
      success: true,
      program,
    });
  } catch (error: any) {
    console.error('Error fetching program details:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch program details',
    });
  }
});

/**
 * GET /api/shop-floor-connect/eco/:ecoNumber
 * Get Engineering Change Order details
 */
router.get('/eco/:ecoNumber', async (req: Request, res: Response): Promise<any> => {
  try {
    const { ecoNumber } = req.params;

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('SFC') as ShopFloorConnectAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'Shop Floor Connect adapter not configured' });
    }

    const eco = await adapter.getECODetails(ecoNumber);

    if (!eco) {
      return res.status(404).json({
        success: false,
        error: `ECO ${ecoNumber} not found`,
      });
    }

    res.json({
      success: true,
      eco,
    });
  } catch (error: any) {
    console.error('Error fetching ECO details:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch ECO details',
    });
  }
});

/**
 * GET /api/shop-floor-connect/health
 * Get Shop Floor Connect adapter health status
 */
router.get('/health', async (req: Request, res: Response): Promise<any> => {
  try {
    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('SFC') as ShopFloorConnectAdapter | undefined;

    if (!adapter) {
      return res.json({
        connected: false,
        error: 'Shop Floor Connect adapter not configured',
      });
    }

    const health = await adapter.getHealthStatus();

    res.json(health);
  } catch (error: any) {
    console.error('Error checking Shop Floor Connect health:', error);
    res.status(500).json({
      connected: false,
      error: error.message || 'Failed to check health',
    });
  }
});

export default router;
