/**
 * CMM (Coordinate Measuring Machine) Integration Routes
 *
 * REST API endpoints for CMM integration (PC-DMIS, Calypso) with QIF support.
 *
 * Endpoints:
 * - POST   /api/v1/cmm/qif/plan/import           - Import QIF measurement plan
 * - GET    /api/v1/cmm/qif/plan/:qifPlanId       - Export QIF measurement plan
 * - POST   /api/v1/cmm/qif/results/import        - Import QIF measurement results
 * - GET    /api/v1/cmm/qif/results/:qifResultsId - Export QIF measurement results
 * - POST   /api/v1/cmm/inspection/execute        - Execute CMM inspection program
 * - GET    /api/v1/cmm/inspection/:inspectionId  - Get inspection status
 * - GET    /api/v1/cmm/inspection/:inspectionId/results - Get measurement results
 * - GET    /api/v1/cmm/inspection/:inspectionId/qif - Get QIF results from CMM
 * - GET    /api/v1/cmm/programs                  - List CMM programs
 * - GET    /api/v1/cmm/programs/:partNumber      - List programs by part number
 * - POST   /api/v1/cmm/plan/create               - Create MES QIF plan from characteristics
 * - GET    /api/v1/cmm/health                    - Get CMM connection health
 */

import express, { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getIntegrationManager } from '../services/IntegrationManager';
import { CMMAdapter } from '../services/CMMAdapter';

const router = express.Router();

// Require authentication for all routes
router.use(authMiddleware);

/**
 * POST /api/v1/cmm/qif/plan/import
 * Import QIF Measurement Plan XML
 */
router.post('/qif/plan/import', async (req: Request, res: Response): Promise<any> => {
  try {
    const { qifXml } = req.body;

    if (!qifXml) {
      return res.status(400).json({ error: 'Missing required field: qifXml' });
    }

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('CMM') as CMMAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'CMM adapter not configured' });
    }

    const qifPlanId = await adapter.importQIFPlan(qifXml);

    res.json({
      success: true,
      message: 'QIF measurement plan imported successfully',
      qifPlanId,
    });
  } catch (error: any) {
    console.error('Error importing QIF plan:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to import QIF plan',
    });
  }
});

/**
 * GET /api/v1/cmm/qif/plan/:qifPlanId
 * Export QIF Measurement Plan XML (UUID-enhanced)
 */
router.get('/qif/plan/:qifPlanId', async (req: Request, res: Response): Promise<any> => {
  try {
    const { qifPlanId } = req.params;
    const {
      format = 'xml',
      includeUuids = 'true',
      nistCompliance = 'true',
      validateUuid = 'true'
    } = req.query;

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('CMM') as CMMAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'CMM adapter not configured' });
    }

    // Enhanced export with UUID options
    const exportOptions = {
      format: format as string,
      includeUuids: includeUuids === 'true',
      nistCompliance: nistCompliance === 'true',
      validateUuid: validateUuid === 'true',
      supportLegacyIds: true,
    };

    const result = await adapter.exportQIFPlan(qifPlanId, exportOptions);

    // Add NIST compliance headers
    res.set('Content-Type', format === 'json' ? 'application/json' : 'application/xml');
    res.set('X-QIF-Version', '3.0.0');
    res.set('X-NIST-Compliance', nistCompliance === 'true' ? 'AMS-300-12' : 'false');
    res.set('X-UUID-Support', includeUuids);

    if (format === 'json') {
      res.json(result);
    } else {
      res.send(result);
    }
  } catch (error: any) {
    console.error('Error exporting QIF plan (UUID-enhanced):', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to export QIF plan',
      supportedFormats: ['xml', 'json'],
      nistCompliance: 'AMS-300-12'
    });
  }
});

/**
 * POST /api/v1/cmm/qif/results/import
 * Import QIF Measurement Results XML
 */
router.post('/qif/results/import', async (req: Request, res: Response): Promise<any> => {
  try {
    const { qifXml, workOrderId, serializedPartId } = req.body;

    if (!qifXml) {
      return res.status(400).json({ error: 'Missing required field: qifXml' });
    }

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('CMM') as CMMAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'CMM adapter not configured' });
    }

    const qifResultsId = await adapter.importQIFResults(qifXml, workOrderId, serializedPartId);

    res.json({
      success: true,
      message: 'QIF measurement results imported successfully',
      qifResultsId,
    });
  } catch (error: any) {
    console.error('Error importing QIF results:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to import QIF results',
    });
  }
});

/**
 * GET /api/v1/cmm/qif/results/:qifResultsId
 * Export QIF Measurement Results XML (UUID-enhanced)
 */
router.get('/qif/results/:qifResultsId', async (req: Request, res: Response): Promise<any> => {
  try {
    const { qifResultsId } = req.params;
    const {
      format = 'xml',
      includeUuids = 'true',
      nistCompliance = 'true',
      validateUuid = 'true',
      includeStatistics = 'false'
    } = req.query;

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('CMM') as CMMAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'CMM adapter not configured' });
    }

    // Enhanced export with UUID options
    const exportOptions = {
      format: format as string,
      includeUuids: includeUuids === 'true',
      nistCompliance: nistCompliance === 'true',
      validateUuid: validateUuid === 'true',
      supportLegacyIds: true,
      includeStatistics: includeStatistics === 'true',
    };

    const result = await adapter.exportQIFResults(qifResultsId, exportOptions);

    // Add NIST compliance headers
    res.set('Content-Type', format === 'json' ? 'application/json' : 'application/xml');
    res.set('X-QIF-Version', '3.0.0');
    res.set('X-NIST-Compliance', nistCompliance === 'true' ? 'AMS-300-12' : 'false');
    res.set('X-UUID-Support', includeUuids);
    res.set('X-Statistics-Included', includeStatistics);

    if (format === 'json') {
      res.json(result);
    } else {
      res.send(result);
    }
  } catch (error: any) {
    console.error('Error exporting QIF results (UUID-enhanced):', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to export QIF results',
      supportedFormats: ['xml', 'json'],
      nistCompliance: 'AMS-300-12'
    });
  }
});

/**
 * POST /api/v1/cmm/inspection/execute
 * Execute CMM inspection program
 */
router.post('/inspection/execute', async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      programName,
      partNumber,
      serialNumber,
      operatorId,
      workOrderNumber,
      qifMeasurementPlanId,
    } = req.body;

    if (!programName || !partNumber) {
      return res.status(400).json({
        error: 'Missing required fields: programName, partNumber',
      });
    }

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('CMM') as CMMAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'CMM adapter not configured' });
    }

    const status = await adapter.executeInspection({
      programName,
      partNumber,
      serialNumber,
      operatorId,
      workOrderNumber,
      qifMeasurementPlanId,
    });

    res.json({
      success: true,
      message: 'CMM inspection started successfully',
      ...status,
    });
  } catch (error: any) {
    console.error('Error executing CMM inspection:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to execute CMM inspection',
    });
  }
});

/**
 * GET /api/v1/cmm/inspection/:inspectionId
 * Get inspection status
 */
router.get('/inspection/:inspectionId', async (req: Request, res: Response): Promise<any> => {
  try {
    const { inspectionId } = req.params;

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('CMM') as CMMAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'CMM adapter not configured' });
    }

    const status = await adapter.getInspectionStatus(inspectionId);

    res.json({
      success: true,
      ...status,
    });
  } catch (error: any) {
    console.error('Error fetching inspection status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch inspection status',
    });
  }
});

/**
 * GET /api/v1/cmm/inspection/:inspectionId/results
 * Get measurement results
 */
router.get('/inspection/:inspectionId/results', async (req: Request, res: Response): Promise<any> => {
  try {
    const { inspectionId } = req.params;

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('CMM') as CMMAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'CMM adapter not configured' });
    }

    const results = await adapter.getMeasurementResults(inspectionId);

    if (!results) {
      return res.status(404).json({
        success: false,
        error: 'Measurement results not found',
      });
    }

    res.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error('Error fetching measurement results:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch measurement results',
    });
  }
});

/**
 * GET /api/v1/cmm/inspection/:inspectionId/qif
 * Get QIF measurement results from CMM
 */
router.get('/inspection/:inspectionId/qif', async (req: Request, res: Response): Promise<any> => {
  try {
    const { inspectionId } = req.params;

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('CMM') as CMMAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'CMM adapter not configured' });
    }

    const qifXml = await adapter.getQIFResultsFromCMM(inspectionId);

    if (!qifXml) {
      return res.status(404).json({
        success: false,
        error: 'QIF results not available',
      });
    }

    res.set('Content-Type', 'application/xml');
    res.send(qifXml);
  } catch (error: any) {
    console.error('Error fetching QIF results:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch QIF results',
    });
  }
});

/**
 * GET /api/v1/cmm/programs
 * List all CMM programs
 */
router.get('/programs', async (req: Request, res: Response): Promise<any> => {
  try {
    const { partNumber } = req.query;

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('CMM') as CMMAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'CMM adapter not configured' });
    }

    const programs = await adapter.listPrograms(partNumber as string | undefined);

    res.json({
      success: true,
      programs,
      count: programs.length,
    });
  } catch (error: any) {
    console.error('Error listing CMM programs:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to list CMM programs',
    });
  }
});

/**
 * POST /api/v1/cmm/plan/create
 * Create MES QIF Plan from characteristics
 */
router.post('/plan/create', async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      partNumber,
      revision,
      characteristics,
      workOrderId,
      faiReportId,
    } = req.body;

    if (!partNumber || !revision || !characteristics || !Array.isArray(characteristics)) {
      return res.status(400).json({
        error: 'Missing required fields: partNumber, revision, characteristics (array)',
      });
    }

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('CMM') as CMMAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'CMM adapter not configured' });
    }

    const qifPlan = await adapter.createMESQIFPlan(
      partNumber,
      revision,
      characteristics,
      workOrderId,
      faiReportId
    );

    res.json({
      success: true,
      message: 'QIF measurement plan created successfully',
      qifPlan,
    });
  } catch (error: any) {
    console.error('Error creating QIF plan:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create QIF plan',
    });
  }
});

/**
 * GET /api/v1/cmm/health
 * Get CMM adapter health status
 */
router.get('/health', async (req: Request, res: Response): Promise<any> => {
  try {
    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('CMM') as CMMAdapter | undefined;

    if (!adapter) {
      return res.json({
        connected: false,
        error: 'CMM adapter not configured',
      });
    }

    const health = await adapter.getHealthStatus();

    res.json(health);
  } catch (error: any) {
    console.error('Error checking CMM health:', error);
    res.status(500).json({
      connected: false,
      error: error.message || 'Failed to check health',
    });
  }
});

export default router;
