/**
 * ISA-95 Level 2 (Equipment) Integration Routes
 *
 * RESTful API endpoints for equipment integration:
 * - Equipment data collection
 * - Equipment commands
 * - Material movement tracking
 * - Process data collection
 */

import express, { Request, Response } from 'express';
import { EquipmentDataCollectionService } from '../services/EquipmentDataCollectionService';
import { EquipmentCommandService } from '../services/EquipmentCommandService';
import { MaterialMovementTrackingService } from '../services/MaterialMovementTrackingService';
import { ProcessDataCollectionService } from '../services/ProcessDataCollectionService';
import { DataCollectionType, CommandType } from '@prisma/client';

const router = express.Router();

// ============================================================================
// Equipment Data Collection Routes
// ============================================================================

/**
 * POST /equipment/data/collect
 * Collect a single data point from equipment
 */
router.post('/equipment/data/collect', async (req: Request, res: Response): Promise<any> => {
  try {
    const result = await EquipmentDataCollectionService.collectDataPoint(req.body);

    res.status(200).json({
      success: true,
      message: 'Data point collected successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Error collecting data point:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to collect data point',
    });
  }
});

/**
 * POST /equipment/data/collect-batch
 * Collect multiple data points in batch
 */
router.post('/equipment/data/collect-batch', async (req: Request, res: Response): Promise<any> => {
  try {
    const { dataPoints } = req.body;

    if (!Array.isArray(dataPoints)) {
      return res.status(400).json({
        success: false,
        error: 'dataPoints must be an array',
      });
    }

    const result = await EquipmentDataCollectionService.collectDataPointsBatch(dataPoints);

    res.status(200).json({
      success: true,
      message: `Collected ${result.successful.length} data points, ${result.failed.length} failed`,
      data: result,
    });
  } catch (error: any) {
    console.error('Error collecting data points batch:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to collect data points batch',
    });
  }
});

/**
 * GET /equipment/data/query
 * Query data points with filters
 */
router.get('/equipment/data/query', async (req: Request, res: Response): Promise<any> => {
  try {
    const query = {
      equipmentId: req.query.equipmentId as string | undefined,
      dataPointName: req.query.dataPointName as string | undefined,
      dataCollectionType: req.query.dataCollectionType as DataCollectionType | undefined,
      workOrderId: req.query.workOrderId as string | undefined,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };

    const result = await EquipmentDataCollectionService.queryDataPoints(query);

    res.status(200).json({
      success: true,
      data: result,
      total: result.length,
    });
  } catch (error: any) {
    console.error('Error querying data points:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to query data points',
    });
  }
});

/**
 * GET /equipment/data/:equipmentId/latest
 * Get all latest data points for equipment
 */
router.get('/equipment/data/:equipmentId/latest', async (req: Request, res: Response): Promise<any> => {
  try {
    const { equipmentId } = req.params;

    const result = await EquipmentDataCollectionService.getLatestDataPointsForEquipment(equipmentId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error getting latest data points:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get latest data points',
    });
  }
});

/**
 * GET /equipment/data/:equipmentId/summary
 * Generate data collection summary for equipment
 */
router.get('/equipment/data/:equipmentId/summary', async (req: Request, res: Response): Promise<any> => {
  try {
    const { equipmentId } = req.params;
    const dataCollectionType = req.query.dataCollectionType as DataCollectionType | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const result = await EquipmentDataCollectionService.generateDataCollectionSummary(
      equipmentId,
      dataCollectionType,
      startDate,
      endDate
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error generating data collection summary:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate data collection summary',
    });
  }
});

/**
 * GET /equipment/data/:equipmentId/trend
 * Get data point trend (time series)
 */
router.get('/equipment/data/:equipmentId/trend', async (req: Request, res: Response): Promise<any> => {
  try {
    const { equipmentId } = req.params;
    const { dataPointName, startDate, endDate, limit } = req.query;

    if (!dataPointName) {
      return res.status(400).json({
        success: false,
        error: 'dataPointName is required',
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required',
      });
    }

    const result = await EquipmentDataCollectionService.getDataPointTrend(
      equipmentId,
      dataPointName as string,
      new Date(startDate as string),
      new Date(endDate as string),
      limit ? parseInt(limit as string) : undefined
    );

    // Calculate statistics for numeric data points if there are any data points
    let statistics;
    if (result.dataPoints.length > 0) {
      statistics = await EquipmentDataCollectionService.calculateDataPointStatistics(
        equipmentId,
        dataPointName as string,
        new Date(startDate as string),
        new Date(endDate as string)
      );
    }

    res.status(200).json({
      success: true,
      data: {
        ...result,
        statistics,
      },
    });
  } catch (error: any) {
    console.error('Error getting data point trend:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get data point trend',
    });
  }
});

/**
 * POST /equipment/data/utilization
 * Calculate equipment utilization from status data points
 */
router.post('/equipment/data/utilization', async (req: Request, res: Response): Promise<any> => {
  try {
    const { equipmentId, startDate, endDate } = req.body;

    if (!equipmentId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'equipmentId, startDate, and endDate are required',
      });
    }

    const result = await EquipmentDataCollectionService.calculateEquipmentUtilization(
      equipmentId,
      new Date(startDate),
      new Date(endDate)
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error calculating equipment utilization:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to calculate equipment utilization',
    });
  }
});

// ============================================================================
// Equipment Command Routes
// ============================================================================

/**
 * POST /equipment/commands/issue
 * Issue a command to equipment
 */
router.post('/equipment/commands/issue', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user?.id;

    const result = await EquipmentCommandService.issueCommand({
      ...req.body,
      issuedBy: userId || 'SYSTEM',
    });

    res.status(200).json({
      success: true,
      message: 'Command issued successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Error issuing command:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to issue command',
    });
  }
});

/**
 * PUT /equipment/commands/:commandId/status
 * Update command status
 */
router.put('/equipment/commands/:commandId/status', async (req: Request, res: Response): Promise<any> => {
  try {
    const { commandId } = req.params;

    const result = await EquipmentCommandService.updateCommandStatus({
      commandId,
      ...req.body,
    });

    res.status(200).json({
      success: true,
      message: 'Command status updated successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Error updating command status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update command status',
    });
  }
});

/**
 * PUT /equipment/commands/:commandId/complete
 * Mark command as completed
 */
router.put('/equipment/commands/:commandId/complete', async (req: Request, res: Response): Promise<any> => {
  try {
    const { commandId } = req.params;
    const { responsePayload, responseCode, responseMessage } = req.body;

    const result = await EquipmentCommandService.completeCommand(
      commandId,
      responsePayload,
      responseCode,
      responseMessage
    );

    res.status(200).json({
      success: true,
      message: 'Command completed successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Error completing command:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to complete command',
    });
  }
});

/**
 * PUT /equipment/commands/:commandId/fail
 * Mark command as failed
 */
router.put('/equipment/commands/:commandId/fail', async (req: Request, res: Response): Promise<any> => {
  try {
    const { commandId } = req.params;
    const { responseMessage, responseCode, responsePayload } = req.body;

    if (!responseMessage) {
      return res.status(400).json({
        success: false,
        error: 'responseMessage is required',
      });
    }

    const result = await EquipmentCommandService.failCommand(
      commandId,
      responseMessage,
      responseCode,
      responsePayload
    );

    res.status(200).json({
      success: true,
      message: 'Command marked as failed',
      data: result,
    });
  } catch (error: any) {
    console.error('Error failing command:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fail command',
    });
  }
});

/**
 * POST /equipment/commands/:commandId/retry
 * Retry a failed command
 */
router.post('/equipment/commands/:commandId/retry', async (req: Request, res: Response): Promise<any> => {
  try {
    const { commandId } = req.params;

    const result = await EquipmentCommandService.retryCommand(commandId);

    res.status(200).json({
      success: true,
      message: 'Command retry initiated',
      data: result,
    });
  } catch (error: any) {
    console.error('Error retrying command:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retry command',
    });
  }
});

/**
 * GET /equipment/commands/query
 * Query commands with filters
 */
router.get('/equipment/commands/query', async (req: Request, res: Response): Promise<any> => {
  try {
    const query = {
      equipmentId: req.query.equipmentId as string | undefined,
      commandType: req.query.commandType as CommandType | undefined,
      commandStatus: req.query.commandStatus as any,
      workOrderId: req.query.workOrderId as string | undefined,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      priority: req.query.priority ? parseInt(req.query.priority as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };

    const result = await EquipmentCommandService.queryCommands(query);

    res.status(200).json({
      success: true,
      data: result,
      total: result.length,
    });
  } catch (error: any) {
    console.error('Error querying commands:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to query commands',
    });
  }
});

/**
 * GET /equipment/commands/:equipmentId/pending
 * Get pending commands for equipment
 */
router.get('/equipment/commands/:equipmentId/pending', async (req: Request, res: Response): Promise<any> => {
  try {
    const { equipmentId } = req.params;

    const result = await EquipmentCommandService.getPendingCommands(equipmentId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error getting pending commands:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get pending commands',
    });
  }
});

/**
 * GET /equipment/commands/:equipmentId/summary
 * Generate command execution summary
 */
router.get('/equipment/commands/:equipmentId/summary', async (req: Request, res: Response): Promise<any> => {
  try {
    const { equipmentId } = req.params;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const result = await EquipmentCommandService.generateCommandExecutionSummary(
      equipmentId,
      startDate,
      endDate
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error generating command execution summary:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate command execution summary',
    });
  }
});

/**
 * GET /equipment/commands/check-timeouts
 * Check for timed out commands and mark them
 */
router.get('/equipment/commands/check-timeouts', async (req: Request, res: Response): Promise<any> => {
  try {
    const result = await EquipmentCommandService.checkAndMarkTimedOutCommands();

    res.status(200).json({
      success: true,
      message: `Detected and marked ${result.timedOutCount} timed out commands`,
      data: result,
    });
  } catch (error: any) {
    console.error('Error checking for timed out commands:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check for timed out commands',
    });
  }
});

// ============================================================================
// Material Movement Tracking Routes
// ============================================================================

/**
 * POST /equipment/material/movement
 * Record a material movement
 */
router.post('/equipment/material/movement', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user?.id;

    const result = await MaterialMovementTrackingService.recordMaterialMovement({
      ...req.body,
      recordedBy: req.body.recordedBy || userId || 'EQUIPMENT',
    });

    res.status(200).json({
      success: true,
      message: 'Material movement recorded successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Error recording material movement:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to record material movement',
    });
  }
});

/**
 * GET /equipment/material/query
 * Query material movements with filters
 */
router.get('/equipment/material/query', async (req: Request, res: Response): Promise<any> => {
  try {
    const query = {
      equipmentId: req.query.equipmentId as string | undefined,
      partNumber: req.query.partNumber as string | undefined,
      lotNumber: req.query.lotNumber as string | undefined,
      serialNumber: req.query.serialNumber as string | undefined,
      movementType: req.query.movementType as string | undefined,
      workOrderId: req.query.workOrderId as string | undefined,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };

    const result = await MaterialMovementTrackingService.queryMaterialMovements(query);

    res.status(200).json({
      success: true,
      data: result,
      total: result.length,
    });
  } catch (error: any) {
    console.error('Error querying material movements:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to query material movements',
    });
  }
});

/**
 * GET /equipment/material/:equipmentId/summary
 * Generate material movement summary
 */
router.get('/equipment/material/:equipmentId/summary', async (req: Request, res: Response): Promise<any> => {
  try {
    const { equipmentId } = req.params;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const result = await MaterialMovementTrackingService.generateMovementSummary(
      equipmentId,
      startDate,
      endDate
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error generating material movement summary:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate material movement summary',
    });
  }
});

/**
 * GET /equipment/material/traceability/:movementId
 * Build traceability chain for a movement
 */
router.get('/equipment/material/traceability/:movementId', async (req: Request, res: Response): Promise<any> => {
  try {
    const { movementId } = req.params;

    const result = await MaterialMovementTrackingService.buildTraceabilityChain(movementId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error building traceability chain:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to build traceability chain',
    });
  }
});

/**
 * GET /equipment/material/:equipmentId/balance
 * Get material balance for equipment
 */
router.get('/equipment/material/:equipmentId/balance', async (req: Request, res: Response): Promise<any> => {
  try {
    const { equipmentId } = req.params;
    const partNumber = req.query.partNumber as string | undefined;

    const result = await MaterialMovementTrackingService.getMaterialBalance(equipmentId, partNumber);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error getting material balance:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get material balance',
    });
  }
});

// ============================================================================
// Process Data Collection Routes
// ============================================================================

/**
 * POST /equipment/process/start
 * Start a new process data collection
 */
router.post('/equipment/process/start', async (req: Request, res: Response): Promise<any> => {
  try {
    const result = await ProcessDataCollectionService.startProcessDataCollection(req.body);

    res.status(200).json({
      success: true,
      message: 'Process data collection started successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Error starting process data collection:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start process data collection',
    });
  }
});

/**
 * PUT /equipment/process/:processDataCollectionId/complete
 * Complete a process data collection
 */
router.put('/equipment/process/:processDataCollectionId/complete', async (req: Request, res: Response): Promise<any> => {
  try {
    const { processDataCollectionId } = req.params;
    const { endTimestamp: endTimestampString, ...otherFields } = req.body;

    const result = await ProcessDataCollectionService.completeProcessDataCollection({
      processDataCollectionId,
      endTimestamp: endTimestampString ? new Date(endTimestampString) : new Date(),
      ...otherFields,
    });

    res.status(200).json({
      success: true,
      message: 'Process data collection completed successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Error completing process data collection:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to complete process data collection',
    });
  }
});

/**
 * PUT /equipment/process/:processDataCollectionId/parameters
 * Update process parameters
 */
router.put('/equipment/process/:processDataCollectionId/parameters', async (req: Request, res: Response): Promise<any> => {
  try {
    const { processDataCollectionId } = req.params;
    const { parameters } = req.body;

    if (!parameters || typeof parameters !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'parameters object is required',
      });
    }

    const result = await ProcessDataCollectionService.updateProcessParameters(
      processDataCollectionId,
      parameters
    );

    res.status(200).json({
      success: true,
      message: 'Process parameters updated successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Error updating process parameters:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update process parameters',
    });
  }
});

/**
 * GET /equipment/process/query
 * Query process data collections
 */
router.get('/equipment/process/query', async (req: Request, res: Response): Promise<any> => {
  try {
    const query = {
      equipmentId: req.query.equipmentId as string | undefined,
      processName: req.query.processName as string | undefined,
      workOrderId: req.query.workOrderId as string | undefined,
      partNumber: req.query.partNumber as string | undefined,
      lotNumber: req.query.lotNumber as string | undefined,
      serialNumber: req.query.serialNumber as string | undefined,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };

    const result = await ProcessDataCollectionService.queryProcessData(query);

    res.status(200).json({
      success: true,
      data: result,
      total: result.length,
    });
  } catch (error: any) {
    console.error('Error querying process data:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to query process data',
    });
  }
});

/**
 * GET /equipment/process/:equipmentId/active
 * Get active processes for equipment
 */
router.get('/equipment/process/:equipmentId/active', async (req: Request, res: Response): Promise<any> => {
  try {
    const { equipmentId } = req.params;

    const result = await ProcessDataCollectionService.getActiveProcesses(equipmentId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error getting active processes:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get active processes',
    });
  }
});

/**
 * GET /equipment/process/:equipmentId/summary
 * Generate process data summary
 */
router.get('/equipment/process/:equipmentId/summary', async (req: Request, res: Response): Promise<any> => {
  try {
    const { equipmentId } = req.params;
    const { processName, startDate, endDate } = req.query;

    if (!processName) {
      return res.status(400).json({
        success: false,
        error: 'processName is required',
      });
    }

    const result = await ProcessDataCollectionService.generateProcessSummary(
      equipmentId,
      processName as string,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error generating process summary:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate process summary',
    });
  }
});

/**
 * GET /equipment/process/:equipmentId/trend
 * Get process parameter trend
 */
router.get('/equipment/process/:equipmentId/trend', async (req: Request, res: Response): Promise<any> => {
  try {
    const { equipmentId } = req.params;
    const { processName, parameterName, startDate, endDate } = req.query;

    if (!processName || !parameterName) {
      return res.status(400).json({
        success: false,
        error: 'processName and parameterName are required',
      });
    }

    const result = await ProcessDataCollectionService.getProcessParameterTrend(
      equipmentId,
      processName as string,
      parameterName as string,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error getting process parameter trend:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get process parameter trend',
    });
  }
});

export default router;
