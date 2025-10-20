/**
 * Predator DNC Integration Routes
 *
 * CRITICAL: Multi-System Authorization Handshake
 * REST API endpoints for Predator DNC (Distributed Numerical Control) integration.
 *
 * Authorization Handshake validates:
 * 1. Operator authentication
 * 2. Work order validation (correct operation)
 * 3. Operator certification (via Covalent)
 * 4. Program version validation (via Shop Floor Connect)
 * 5. Gauge calibration check (via Indysoft)
 *
 * Endpoints:
 * - POST   /api/predator-dnc/authorization-handshake  - Perform authorization handshake (CRITICAL)
 * - POST   /api/predator-dnc/transfer-program         - Transfer program to equipment
 * - GET    /api/predator-dnc/machine/:machineId/status - Get machine status
 * - GET    /api/predator-dnc/machine/:machineId/active-program - Get active program on machine
 * - GET    /api/predator-dnc/download-log/:downloadId - Get program download log
 * - GET    /api/predator-dnc/authorization/:authId    - Get authorization result
 * - GET    /api/predator-dnc/health                   - Get DNC connection health
 */

import express, { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getIntegrationManager } from '../services/IntegrationManager';
import { PredatorDNCAdapter } from '../services/PredatorDNCAdapter';

const router = express.Router();

// Require authentication for all routes
router.use(authMiddleware);

/**
 * POST /api/predator-dnc/authorization-handshake
 * CRITICAL: Perform multi-system authorization handshake before program transfer
 *
 * Validates:
 * 1. Operator authentication
 * 2. Work order validation
 * 3. Operator certification (via Covalent)
 * 4. Program version (via Shop Floor Connect)
 * 5. Gauge calibration (via Indysoft)
 */
router.post('/authorization-handshake', async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      operatorId,
      machineId,
      programName,
      partNumber,
      operationCode,
      workOrderNumber,
    } = req.body;

    if (!operatorId || !machineId || !programName || !partNumber || !operationCode) {
      return res.status(400).json({
        error: 'Missing required fields: operatorId, machineId, programName, partNumber, operationCode',
      });
    }

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('DNC') as PredatorDNCAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'Predator DNC adapter not configured' });
    }

    const result = await adapter.performAuthorizationHandshake({
      operatorId,
      machineId,
      programName,
      partNumber,
      operationCode,
      workOrderNumber,
    });

    // Log authorization result
    console.log(`DNC Authorization Handshake Result:`, {
      authorized: result.authorized,
      operatorId,
      machineId,
      programName,
      authorizationId: result.authorizationId,
    });

    if (result.authorized) {
      res.json({
        success: true,
        message: 'Authorization handshake successful',
        ...result,
      });
    } else {
      res.status(403).json({
        success: false,
        message: 'Authorization handshake failed',
        ...result,
      });
    }
  } catch (error: any) {
    console.error('Error performing authorization handshake:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to perform authorization handshake',
    });
  }
});

/**
 * POST /api/predator-dnc/transfer-program
 * Transfer CNC program to equipment
 * Requires valid authorizationId from authorization handshake
 */
router.post('/transfer-program', async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      operatorId,
      machineId,
      programName,
      partNumber,
      operationCode,
      workOrderNumber,
      authorizationId,
    } = req.body;

    if (!operatorId || !machineId || !programName || !partNumber || !operationCode || !authorizationId) {
      return res.status(400).json({
        error: 'Missing required fields: operatorId, machineId, programName, partNumber, operationCode, authorizationId',
      });
    }

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('DNC') as PredatorDNCAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'Predator DNC adapter not configured' });
    }

    const result = await adapter.transferProgram(
      {
        operatorId,
        machineId,
        programName,
        partNumber,
        operationCode,
        workOrderNumber,
      },
      authorizationId
    );

    if (result.success) {
      res.json({
        success: true,
        message: `Program ${programName} transferred to machine ${machineId}`,
        ...result,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to transfer program',
        ...result,
      });
    }
  } catch (error: any) {
    console.error('Error transferring program:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to transfer program',
    });
  }
});

/**
 * GET /api/predator-dnc/machine/:machineId/status
 * Get machine status from DNC
 */
router.get('/machine/:machineId/status', async (req: Request, res: Response): Promise<any> => {
  try {
    const { machineId } = req.params;

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('DNC') as PredatorDNCAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'Predator DNC adapter not configured' });
    }

    const status = await adapter.getMachineStatus(machineId);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: `Machine ${machineId} not found or not connected`,
      });
    }

    res.json({
      success: true,
      machineId,
      ...status,
    });
  } catch (error: any) {
    console.error('Error fetching machine status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch machine status',
    });
  }
});

/**
 * GET /api/predator-dnc/machine/:machineId/active-program
 * Get active program on machine
 */
router.get('/machine/:machineId/active-program', async (req: Request, res: Response): Promise<any> => {
  try {
    const { machineId } = req.params;

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('DNC') as PredatorDNCAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'Predator DNC adapter not configured' });
    }

    const program = await adapter.getActiveProgramOnMachine(machineId);

    if (!program) {
      return res.status(404).json({
        success: false,
        error: `No active program on machine ${machineId}`,
      });
    }

    res.json({
      success: true,
      machineId,
      program,
    });
  } catch (error: any) {
    console.error('Error fetching active program:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch active program',
    });
  }
});

/**
 * GET /api/predator-dnc/download-log/:downloadId
 * Get program download log
 */
router.get('/download-log/:downloadId', async (req: Request, res: Response): Promise<any> => {
  try {
    const { downloadId } = req.params;

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('DNC') as PredatorDNCAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'Predator DNC adapter not configured' });
    }

    const downloadLog = await adapter.getDownloadLog(downloadId);

    if (!downloadLog) {
      return res.status(404).json({
        success: false,
        error: `Download log ${downloadId} not found`,
      });
    }

    res.json({
      success: true,
      downloadLog,
    });
  } catch (error: any) {
    console.error('Error fetching download log:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch download log',
    });
  }
});

/**
 * GET /api/predator-dnc/authorization/:authId
 * Get authorization result by ID
 */
router.get('/authorization/:authId', async (req: Request, res: Response): Promise<any> => {
  try {
    const { authId } = req.params;

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('DNC') as PredatorDNCAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'Predator DNC adapter not configured' });
    }

    const authorization = await adapter.getAuthorizationResult(authId);

    if (!authorization) {
      return res.status(404).json({
        success: false,
        error: `Authorization ${authId} not found`,
      });
    }

    res.json({
      success: true,
      authorization,
    });
  } catch (error: any) {
    console.error('Error fetching authorization result:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch authorization result',
    });
  }
});

/**
 * GET /api/predator-dnc/health
 * Get Predator DNC adapter health status
 */
router.get('/health', async (req: Request, res: Response): Promise<any> => {
  try {
    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('DNC') as PredatorDNCAdapter | undefined;

    if (!adapter) {
      return res.json({
        connected: false,
        error: 'Predator DNC adapter not configured',
      });
    }

    const health = await adapter.getHealthStatus();

    res.json(health);
  } catch (error: any) {
    console.error('Error checking Predator DNC health:', error);
    res.status(500).json({
      connected: false,
      error: error.message || 'Failed to check health',
    });
  }
});

export default router;
