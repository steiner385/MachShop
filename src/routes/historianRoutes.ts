import { Router, Request, Response } from 'express';
import { getIntegrationManager } from '../services/IntegrationManager';
import { ProficyHistorianAdapter } from '../services/ProficyHistorianAdapter';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * Historian Integration Routes
 *
 * Endpoints for managing GE Proficy Historian integration:
 * - Write equipment data to historian
 * - Query historical time-series data
 * - Manage historian tags
 * - Health monitoring and diagnostics
 */

/**
 * GET /api/v1/historian/health
 * Check connection health to Proficy Historian
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByName('proficy_historian');

    if (!adapter || !(adapter instanceof ProficyHistorianAdapter)) {
      return res.status(404).json({
        success: false,
        error: 'Proficy Historian adapter not configured',
      });
    }

    const health = await adapter.getHealthStatus();

    res.status(200).json({
      success: true,
      data: health,
    });
  } catch (error: any) {
    console.error('Historian health check failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Health check failed',
    });
  }
});

/**
 * POST /api/v1/historian/tags/create
 * Create a new tag in Proficy Historian
 *
 * Body: {
 *   tagName: string;
 *   description?: string;
 *   dataType: 'Float' | 'Integer' | 'String' | 'Boolean' | 'DateTime';
 *   engineeringUnits?: string;
 *   minValue?: number;
 *   maxValue?: number;
 * }
 */
router.post('/tags/create', async (req: Request, res: Response) => {
  try {
    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByName('proficy_historian');

    if (!adapter || !(adapter instanceof ProficyHistorianAdapter)) {
      return res.status(404).json({
        success: false,
        error: 'Proficy Historian adapter not configured',
      });
    }

    const result = await adapter.createTag(req.body);

    res.status(201).json({
      success: true,
      message: 'Tag created successfully',
      data: { created: result },
    });
  } catch (error: any) {
    console.error('Tag creation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create tag',
    });
  }
});

/**
 * POST /api/v1/historian/tags/auto-configure
 * Auto-configure tags for all equipment
 */
router.post('/tags/auto-configure', async (req: Request, res: Response) => {
  try {
    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByName('proficy_historian');

    if (!adapter || !(adapter instanceof ProficyHistorianAdapter)) {
      return res.status(404).json({
        success: false,
        error: 'Proficy Historian adapter not configured',
      });
    }

    const result = await adapter.autoConfigureEquipmentTags();

    res.status(200).json({
      success: true,
      message: 'Auto-configuration completed',
      data: result,
    });
  } catch (error: any) {
    console.error('Auto-configuration failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Auto-configuration failed',
    });
  }
});

/**
 * POST /api/v1/historian/data/write
 * Write data points to Proficy Historian
 *
 * Body: {
 *   dataPoints: Array<{
 *     tagName: string;
 *     value: any;
 *     timestamp: string (ISO 8601);
 *     quality?: number;
 *   }>
 * }
 */
router.post('/data/write', async (req: Request, res: Response) => {
  try {
    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByName('proficy_historian');

    if (!adapter || !(adapter instanceof ProficyHistorianAdapter)) {
      return res.status(404).json({
        success: false,
        error: 'Proficy Historian adapter not configured',
      });
    }

    const { dataPoints } = req.body;

    if (!dataPoints || !Array.isArray(dataPoints)) {
      return res.status(400).json({
        success: false,
        error: 'dataPoints must be an array',
      });
    }

    // Convert ISO timestamps to Date objects
    const formattedDataPoints = dataPoints.map(dp => ({
      ...dp,
      timestamp: new Date(dp.timestamp),
    }));

    const result = await adapter.writeDataPoints(formattedDataPoints);

    res.status(200).json({
      success: result.success,
      message: `Wrote ${result.pointsWritten} data points`,
      data: result,
    });
  } catch (error: any) {
    console.error('Data write failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to write data',
    });
  }
});

/**
 * POST /api/v1/historian/equipment/:equipmentDataCollectionId/push
 * Push a specific equipment data collection to Proficy Historian
 */
router.post('/equipment/:equipmentDataCollectionId/push', async (req: Request, res: Response) => {
  try {
    const { equipmentDataCollectionId } = req.params;

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByName('proficy_historian');

    if (!adapter || !(adapter instanceof ProficyHistorianAdapter)) {
      return res.status(404).json({
        success: false,
        error: 'Proficy Historian adapter not configured',
      });
    }

    const result = await adapter.pushEquipmentData(equipmentDataCollectionId);

    res.status(200).json({
      success: result.success,
      message: 'Equipment data pushed to historian',
      data: result,
    });
  } catch (error: any) {
    console.error('Equipment data push failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to push equipment data',
    });
  }
});

/**
 * POST /api/v1/historian/process/:processDataCollectionId/push
 * Push a specific process data collection to Proficy Historian
 */
router.post('/process/:processDataCollectionId/push', async (req: Request, res: Response) => {
  try {
    const { processDataCollectionId } = req.params;

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByName('proficy_historian');

    if (!adapter || !(adapter instanceof ProficyHistorianAdapter)) {
      return res.status(404).json({
        success: false,
        error: 'Proficy Historian adapter not configured',
      });
    }

    const result = await adapter.pushProcessData(processDataCollectionId);

    res.status(200).json({
      success: result.success,
      message: 'Process data pushed to historian',
      data: result,
    });
  } catch (error: any) {
    console.error('Process data push failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to push process data',
    });
  }
});

/**
 * GET /api/v1/historian/data/query
 * Query historical time-series data
 *
 * Query params:
 *   tagNames: string (comma-separated tag names)
 *   startTime: string (ISO 8601)
 *   endTime: string (ISO 8601)
 *   samplingMode?: 'RawByTime' | 'Interpolated' | 'Average' | 'Minimum' | 'Maximum' | 'Count'
 *   intervalMilliseconds?: number
 *   maxResults?: number
 */
router.get('/data/query', async (req: Request, res: Response) => {
  try {
    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByName('proficy_historian');

    if (!adapter || !(adapter instanceof ProficyHistorianAdapter)) {
      return res.status(404).json({
        success: false,
        error: 'Proficy Historian adapter not configured',
      });
    }

    const {
      tagNames,
      startTime,
      endTime,
      samplingMode,
      intervalMilliseconds,
      maxResults,
    } = req.query;

    if (!tagNames || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'tagNames, startTime, and endTime are required',
      });
    }

    const queryOptions = {
      tagNames: (tagNames as string).split(',').map(t => t.trim()),
      startTime: new Date(startTime as string),
      endTime: new Date(endTime as string),
      samplingMode: samplingMode as any,
      intervalMilliseconds: intervalMilliseconds ? parseInt(intervalMilliseconds as string) : undefined,
      maxResults: maxResults ? parseInt(maxResults as string) : undefined,
    };

    const result = await adapter.queryHistoricalData(queryOptions);

    res.status(200).json({
      success: result.success,
      data: {
        dataPoints: result.dataPoints,
        recordCount: result.recordCount,
        duration: result.duration,
      },
    });
  } catch (error: any) {
    console.error('Data query failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to query data',
    });
  }
});

/**
 * GET /api/v1/historian/data/aggregate
 * Query aggregated historical data (min, max, avg)
 *
 * Query params:
 *   tagNames: string (comma-separated tag names)
 *   startTime: string (ISO 8601)
 *   endTime: string (ISO 8601)
 *   aggregateType: 'Average' | 'Minimum' | 'Maximum' | 'Count'
 *   intervalMinutes?: number (default: 60)
 */
router.get('/data/aggregate', async (req: Request, res: Response) => {
  try {
    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByName('proficy_historian');

    if (!adapter || !(adapter instanceof ProficyHistorianAdapter)) {
      return res.status(404).json({
        success: false,
        error: 'Proficy Historian adapter not configured',
      });
    }

    const {
      tagNames,
      startTime,
      endTime,
      aggregateType,
      intervalMinutes,
    } = req.query;

    if (!tagNames || !startTime || !endTime || !aggregateType) {
      return res.status(400).json({
        success: false,
        error: 'tagNames, startTime, endTime, and aggregateType are required',
      });
    }

    const result = await adapter.queryAggregatedData(
      (tagNames as string).split(',').map(t => t.trim()),
      new Date(startTime as string),
      new Date(endTime as string),
      aggregateType as any,
      intervalMinutes ? parseInt(intervalMinutes as string) : 60
    );

    res.status(200).json({
      success: result.success,
      data: {
        dataPoints: result.dataPoints,
        recordCount: result.recordCount,
        duration: result.duration,
      },
    });
  } catch (error: any) {
    console.error('Aggregate query failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to query aggregated data',
    });
  }
});

/**
 * POST /api/v1/historian/buffer/flush
 * Manually flush buffered data to historian
 */
router.post('/buffer/flush', async (req: Request, res: Response) => {
  try {
    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByName('proficy_historian');

    if (!adapter || !(adapter instanceof ProficyHistorianAdapter)) {
      return res.status(404).json({
        success: false,
        error: 'Proficy Historian adapter not configured',
      });
    }

    const result = await adapter.flushBuffer();

    res.status(200).json({
      success: true,
      message: 'Buffer flushed successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Buffer flush failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to flush buffer',
    });
  }
});

export default router;
