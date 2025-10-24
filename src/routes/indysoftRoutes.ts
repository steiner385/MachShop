/**
 * Indysoft Gauge Calibration Integration Routes
 *
 * AS9100 Clause 7.1.5: Monitoring and measuring resources
 * ISO 17025: Calibration laboratory competence
 *
 * REST API endpoints for Indysoft gauge calibration integration.
 *
 * Endpoints:
 * - POST   /api/indysoft/sync-gauges                      - Sync gauges from Indysoft
 * - GET    /api/indysoft/gauge/:gaugeId          - Get gauge details
 * - GET    /api/indysoft/gauge/:gaugeId/certificate       - Get calibration certificate
 * - GET    /api/indysoft/gauge/:gaugeId/uncertainty       - Get uncertainty budget
 * - GET    /api/indysoft/gauge/:gaugeId/gage-rr           - Get Gage R&R study results
 * - POST   /api/indysoft/gauge/:gaugeId/validate          - Validate gauge calibration status
 * - GET    /api/indysoft/gauge/:gaugeId/qif/resource      - Export gauge as QIF 3.0 Resource
 * - POST   /api/indysoft/qif/resources                    - Export multiple gauges as QIF Resources
 * - GET    /api/indysoft/qif/resources/measurement-type/:type - Export gauges by measurement type
 * - POST   /api/indysoft/out-of-cal                       - Handle out-of-calibration investigation
 * - GET    /api/indysoft/health                           - Get Indysoft connection health
 */

import express, { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getIntegrationManager } from '../services/IntegrationManager';
import { IndysoftAdapter } from '../services/IndysoftAdapter';

const router = express.Router();

// Require authentication for all routes
router.use(authMiddleware);

/**
 * POST /api/indysoft/sync-gauges
 * Sync gauges from Indysoft to MES
 */
router.post('/sync-gauges', async (req: Request, res: Response): Promise<any> => {
  try {
    const { activeOnly } = req.body;

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('CALIBRATION') as IndysoftAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'Indysoft adapter not configured' });
    }

    const result = await adapter.syncGaugesFromIndysoft(activeOnly !== false);

    res.json({
      message: `Synced gauges from Indysoft`,
      ...result,
    });
  } catch (error: any) {
    console.error('Error syncing gauges from Indysoft:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync gauges from Indysoft',
    });
  }
});

/**
 * GET /api/indysoft/gauge/:gaugeId/certificate
 * Get calibration certificate for a gauge
 */
router.get('/gauge/:gaugeId/certificate', async (req: Request, res: Response): Promise<any> => {
  try {
    const { gaugeId } = req.params;

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('CALIBRATION') as IndysoftAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'Indysoft adapter not configured' });
    }

    const certificate = await adapter.getCalibrationCertificate(gaugeId);

    if (!certificate) {
      return res.status(404).json({
        success: false,
        error: `Calibration certificate not found for gauge ${gaugeId}`,
      });
    }

    res.json({
      success: true,
      certificate,
    });
  } catch (error: any) {
    console.error('Error fetching calibration certificate:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch calibration certificate',
    });
  }
});

/**
 * GET /api/indysoft/gauge/:gaugeId/uncertainty
 * Get measurement uncertainty budget for a gauge
 */
router.get('/gauge/:gaugeId/uncertainty', async (req: Request, res: Response): Promise<any> => {
  try {
    const { gaugeId } = req.params;

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('CALIBRATION') as IndysoftAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'Indysoft adapter not configured' });
    }

    const uncertaintyBudget = await adapter.getUncertaintyBudget(gaugeId);

    if (!uncertaintyBudget) {
      return res.status(404).json({
        success: false,
        error: `Uncertainty budget not found for gauge ${gaugeId}`,
      });
    }

    res.json({
      success: true,
      uncertaintyBudget,
    });
  } catch (error: any) {
    console.error('Error fetching uncertainty budget:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch uncertainty budget',
    });
  }
});

/**
 * GET /api/indysoft/gauge/:gaugeId/gage-rr
 * Get Gage R&R study results
 */
router.get('/gauge/:gaugeId/gage-rr', async (req: Request, res: Response): Promise<any> => {
  try {
    const { gaugeId } = req.params;

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('CALIBRATION') as IndysoftAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'Indysoft adapter not configured' });
    }

    const gageRR = await adapter.getGageRRStudy(gaugeId);

    if (!gageRR) {
      return res.status(404).json({
        success: false,
        error: `Gage R&R study not found for gauge ${gaugeId}`,
      });
    }

    res.json({
      success: true,
      gageRR,
    });
  } catch (error: any) {
    console.error('Error fetching Gage R&R study:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch Gage R&R study',
    });
  }
});

/**
 * POST /api/indysoft/gauge/:gaugeId/validate
 * Validate gauge calibration status before use
 */
router.post('/gauge/:gaugeId/validate', async (req: Request, res: Response): Promise<any> => {
  try {
    const { gaugeId } = req.params;

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('CALIBRATION') as IndysoftAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'Indysoft adapter not configured' });
    }

    const validation = await adapter.validateGaugeInCalibration(gaugeId);

    res.json({
      success: true,
      ...validation,
    });
  } catch (error: any) {
    console.error('Error validating gauge calibration:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to validate gauge calibration',
    });
  }
});

/**
 * POST /api/indysoft/out-of-cal
 * Handle out-of-calibration investigation
 */
router.post('/out-of-cal', async (req: Request, res: Response): Promise<any> => {
  try {
    const { gaugeId, asFoundCondition, outOfToleranceBy } = req.body;

    if (!gaugeId || !asFoundCondition || outOfToleranceBy === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: gaugeId, asFoundCondition, outOfToleranceBy',
      });
    }

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('CALIBRATION') as IndysoftAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'Indysoft adapter not configured' });
    }

    const investigation = await adapter.handleOutOfCalibration(
      gaugeId,
      asFoundCondition,
      parseFloat(outOfToleranceBy)
    );

    res.json({
      success: true,
      message: 'Out-of-calibration investigation initiated',
      investigation,
    });
  } catch (error: any) {
    console.error('Error handling out-of-calibration:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to handle out-of-calibration investigation',
    });
  }
});

/**
 * GET /api/indysoft/gauge/:gaugeId/qif/resource
 * Export gauge as QIF 3.0 Resource document
 */
router.get('/gauge/:gaugeId/qif/resource', async (req: Request, res: Response): Promise<any> => {
  try {
    const { gaugeId } = req.params;

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('CALIBRATION') as IndysoftAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'Indysoft adapter not configured' });
    }

    const qifXml = await adapter.exportGaugeAsQIFResource(gaugeId);

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="QIF-Resource-${gaugeId}.xml"`);
    res.send(qifXml);
  } catch (error: any) {
    console.error('Error exporting gauge as QIF Resource:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to export gauge as QIF Resource',
    });
  }
});

/**
 * POST /api/indysoft/qif/resources
 * Export multiple gauges as QIF 3.0 Resources document
 * Body: { gaugeIds?: string[], activeOnly?: boolean }
 */
router.post('/qif/resources', async (req: Request, res: Response): Promise<any> => {
  try {
    const { gaugeIds, activeOnly = true } = req.body;

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('CALIBRATION') as IndysoftAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'Indysoft adapter not configured' });
    }

    const qifXml = await adapter.exportGaugesAsQIFResources(gaugeIds, activeOnly);

    const filename = gaugeIds && gaugeIds.length > 0
      ? `QIF-Resources-${gaugeIds.length}-gauges.xml`
      : 'QIF-Resources-All-Gauges.xml';

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(qifXml);
  } catch (error: any) {
    console.error('Error exporting gauges as QIF Resources:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to export gauges as QIF Resources',
    });
  }
});

/**
 * GET /api/indysoft/qif/resources/measurement-type/:type
 * Export gauges by measurement type as QIF 3.0 Resources
 * Example: /api/indysoft/qif/resources/measurement-type/Length
 */
router.get('/qif/resources/measurement-type/:type', async (req: Request, res: Response): Promise<any> => {
  try {
    const { type } = req.params;

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('CALIBRATION') as IndysoftAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'Indysoft adapter not configured' });
    }

    const qifXml = await adapter.exportGaugesByMeasurementType(type);

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="QIF-Resources-${type}.xml"`);
    res.send(qifXml);
  } catch (error: any) {
    console.error('Error exporting gauges by measurement type:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to export gauges by measurement type',
    });
  }
});

/**
 * GET /api/indysoft/health
 * Get Indysoft adapter health status
 */
router.get('/health', async (req: Request, res: Response): Promise<any> => {
  try {
    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('CALIBRATION') as IndysoftAdapter | undefined;

    if (!adapter) {
      return res.json({
        connected: false,
        error: 'Indysoft adapter not configured',
      });
    }

    const health = await adapter.getHealthStatus();

    res.json(health);
  } catch (error: any) {
    console.error('Error checking Indysoft health:', error);
    res.status(500).json({
      connected: false,
      error: error.message || 'Failed to check health',
    });
  }
});

export default router;
