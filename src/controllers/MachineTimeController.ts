/**
 * Machine Time Controller
 *
 * REST API endpoints for machine time tracking operations:
 * - Start/stop/pause/resume machine time entries
 * - Query active and historical machine time data
 * - Calculate machine utilization metrics
 * - Generate cost summaries and reports
 * - Handle equipment signals for auto start/stop
 * - Validate machine time entries
 *
 * @module controllers/MachineTimeController
 * @see GitHub Issue #49: Machine-Based Time Tracking & Costing System
 */

import { Request, Response } from 'express';
import { machineTimeTrackingService } from '../services/MachineTimeTrackingService';
import { equipmentSignalProcessor } from '../services/EquipmentSignalProcessor';
import { logger } from '../utils/logger';

/**
 * Machine Time Controller
 */
export class MachineTimeController {
  /**
   * Start machine time entry
   * POST /api/v2/machine-time/start
   *
   * @param req - Express request with body containing machine time entry data
   * @param res - Express response
   */
  async startMachineTime(req: Request, res: Response): Promise<void> {
    try {
      const { equipmentId, workOrderId, operationId, entrySource, dataSource } = req.body;

      // Validate required fields
      if (!equipmentId) {
        res.status(400).json({
          success: false,
          error: 'equipmentId is required',
        });
        return;
      }

      const entry = await machineTimeTrackingService.startMachineTime({
        equipmentId,
        workOrderId,
        operationId,
        startTime: new Date(),
        entrySource: entrySource || 'MANUAL',
        dataSource: dataSource || 'API',
      });

      res.status(201).json({
        success: true,
        data: entry,
        message: 'Machine time entry started successfully',
      });
    } catch (error) {
      logger.error('Failed to start machine time', { error });
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Stop machine time entry
   * POST /api/v2/machine-time/:entryId/stop
   *
   * @param req - Express request with entryId param and optional endTime
   * @param res - Express response
   */
  async stopMachineTime(req: Request, res: Response): Promise<void> {
    try {
      const { entryId } = req.params;
      const { endTime } = req.body;

      if (!entryId) {
        res.status(400).json({
          success: false,
          error: 'entryId is required',
        });
        return;
      }

      const entry = await machineTimeTrackingService.stopMachineTime(
        entryId,
        endTime ? new Date(endTime) : undefined
      );

      res.status(200).json({
        success: true,
        data: entry,
        message: 'Machine time entry stopped successfully',
      });
    } catch (error) {
      logger.error('Failed to stop machine time', { error });
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Pause machine time entry
   * POST /api/v2/machine-time/:entryId/pause
   *
   * @param req - Express request with entryId param
   * @param res - Express response
   */
  async pauseMachineTime(req: Request, res: Response): Promise<void> {
    try {
      const { entryId } = req.params;

      if (!entryId) {
        res.status(400).json({
          success: false,
          error: 'entryId is required',
        });
        return;
      }

      const entry = await machineTimeTrackingService.pauseMachineTime(entryId);

      res.status(200).json({
        success: true,
        data: entry,
        message: 'Machine time entry paused successfully',
      });
    } catch (error) {
      logger.error('Failed to pause machine time', { error });
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Resume paused machine time entry
   * POST /api/v2/machine-time/:entryId/resume
   *
   * @param req - Express request with entryId param
   * @param res - Express response
   */
  async resumeMachineTime(req: Request, res: Response): Promise<void> {
    try {
      const { entryId } = req.params;

      if (!entryId) {
        res.status(400).json({
          success: false,
          error: 'entryId is required',
        });
        return;
      }

      const entry = await machineTimeTrackingService.resumeMachineTime(entryId);

      res.status(200).json({
        success: true,
        data: entry,
        message: 'Machine time entry resumed successfully',
      });
    } catch (error) {
      logger.error('Failed to resume machine time', { error });
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Get active machine time entries
   * GET /api/v2/machine-time/active
   *
   * @param req - Express request with optional equipmentId query param
   * @param res - Express response
   */
  async getActiveEntries(req: Request, res: Response): Promise<void> {
    try {
      const { equipmentId } = req.query;

      const entries = await machineTimeTrackingService.getActiveEntries(
        equipmentId ? String(equipmentId) : undefined
      );

      res.status(200).json({
        success: true,
        data: entries,
        count: entries.length,
      });
    } catch (error) {
      logger.error('Failed to get active entries', { error });
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Get machine time history
   * GET /api/v2/machine-time/history/:equipmentId
   *
   * @param req - Express request with equipmentId param and optional date filters
   * @param res - Express response
   */
  async getMachineTimeHistory(req: Request, res: Response): Promise<void> {
    try {
      const { equipmentId } = req.params;
      const { startDate, endDate } = req.query;

      if (!equipmentId) {
        res.status(400).json({
          success: false,
          error: 'equipmentId is required',
        });
        return;
      }

      const entries = await machineTimeTrackingService.getMachineTimeHistory(
        equipmentId,
        startDate ? new Date(String(startDate)) : undefined,
        endDate ? new Date(String(endDate)) : undefined
      );

      res.status(200).json({
        success: true,
        data: entries,
        count: entries.length,
      });
    } catch (error) {
      logger.error('Failed to get machine time history', { error });
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Get machine utilization metrics
   * GET /api/v2/machine-time/utilization/:equipmentId
   *
   * @param req - Express request with equipmentId param and required date filters
   * @param res - Express response
   */
  async getMachineUtilization(req: Request, res: Response): Promise<void> {
    try {
      const { equipmentId } = req.params;
      const { startDate, endDate } = req.query;

      if (!equipmentId) {
        res.status(400).json({
          success: false,
          error: 'equipmentId is required',
        });
        return;
      }

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'startDate and endDate are required query parameters',
        });
        return;
      }

      const utilization = await machineTimeTrackingService.getMachineUtilization(
        equipmentId,
        new Date(String(startDate)),
        new Date(String(endDate))
      );

      res.status(200).json({
        success: true,
        data: utilization,
      });
    } catch (error) {
      logger.error('Failed to get machine utilization', { error });
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Get machine cost summary
   * GET /api/v2/machine-time/costs/:equipmentId
   *
   * @param req - Express request with equipmentId param and required date filters
   * @param res - Express response
   */
  async getMachineCostSummary(req: Request, res: Response): Promise<void> {
    try {
      const { equipmentId } = req.params;
      const { startDate, endDate } = req.query;

      if (!equipmentId) {
        res.status(400).json({
          success: false,
          error: 'equipmentId is required',
        });
        return;
      }

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'startDate and endDate are required query parameters',
        });
        return;
      }

      const costSummary = await machineTimeTrackingService.getMachineCostSummary(
        equipmentId,
        new Date(String(startDate)),
        new Date(String(endDate))
      );

      res.status(200).json({
        success: true,
        data: costSummary,
      });
    } catch (error) {
      logger.error('Failed to get machine cost summary', { error });
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Validate machine time entry
   * GET /api/v2/machine-time/:entryId/validate
   *
   * @param req - Express request with entryId param
   * @param res - Express response
   */
  async validateMachineTimeEntry(req: Request, res: Response): Promise<void> {
    try {
      const { entryId } = req.params;

      if (!entryId) {
        res.status(400).json({
          success: false,
          error: 'entryId is required',
        });
        return;
      }

      const validation = await machineTimeTrackingService.validateMachineTimeEntry(entryId);

      res.status(200).json({
        success: true,
        data: validation,
      });
    } catch (error) {
      logger.error('Failed to validate machine time entry', { error });
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Handle equipment signal for auto start/stop
   * POST /api/v2/machine-time/signal
   *
   * @param req - Express request with signal data
   * @param res - Express response
   */
  async handleEquipmentSignal(req: Request, res: Response): Promise<void> {
    try {
      const { equipmentId, signalType, workOrderId, operationId } = req.body;

      if (!equipmentId || !signalType) {
        res.status(400).json({
          success: false,
          error: 'equipmentId and signalType are required',
        });
        return;
      }

      const entry = await machineTimeTrackingService.handleEquipmentSignal(
        equipmentId,
        signalType,
        workOrderId,
        operationId
      );

      res.status(200).json({
        success: true,
        data: entry,
        message: 'Equipment signal processed successfully',
      });
    } catch (error) {
      logger.error('Failed to handle equipment signal', { error });
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Process equipment signal from external system
   * POST /api/v2/machine-time/process-signal
   *
   * @param req - Express request with equipment signal data
   * @param res - Express response
   */
  async processEquipmentSignal(req: Request, res: Response): Promise<void> {
    try {
      const { equipmentId, signalType, sourceType, value, quality } = req.body;

      if (!equipmentId || !signalType || !sourceType) {
        res.status(400).json({
          success: false,
          error: 'equipmentId, signalType, and sourceType are required',
        });
        return;
      }

      const signal = {
        equipmentId,
        signalType,
        sourceType,
        timestamp: new Date(),
        value,
        quality: quality || 'GOOD',
      };

      await equipmentSignalProcessor.processSignal(signal);

      res.status(202).json({
        success: true,
        message: 'Equipment signal accepted for processing',
      });
    } catch (error) {
      logger.error('Failed to process equipment signal', { error });
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Get signal history for equipment
   * GET /api/v2/machine-time/:equipmentId/signal-history
   *
   * @param req - Express request with equipmentId param and optional limit
   * @param res - Express response
   */
  async getSignalHistory(req: Request, res: Response): Promise<void> {
    try {
      const { equipmentId } = req.params;
      const { limit } = req.query;

      if (!equipmentId) {
        res.status(400).json({
          success: false,
          error: 'equipmentId is required',
        });
        return;
      }

      const history = equipmentSignalProcessor.getSignalHistory(
        equipmentId,
        limit ? parseInt(String(limit), 10) : 100
      );

      res.status(200).json({
        success: true,
        data: history,
        count: history.length,
      });
    } catch (error) {
      logger.error('Failed to get signal history', { error });
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Get processor state for equipment
   * GET /api/v2/machine-time/:equipmentId/processor-state
   *
   * @param req - Express request with equipmentId param
   * @param res - Express response
   */
  async getProcessorState(req: Request, res: Response): Promise<void> {
    try {
      const { equipmentId } = req.params;

      if (!equipmentId) {
        res.status(400).json({
          success: false,
          error: 'equipmentId is required',
        });
        return;
      }

      const state = equipmentSignalProcessor.getProcessorState(equipmentId);

      if (!state) {
        res.status(404).json({
          success: false,
          error: 'No processor state found for equipment',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: state,
      });
    } catch (error) {
      logger.error('Failed to get processor state', { error });
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Auto-stop idle machines
   * POST /api/v2/machine-time/auto-stop-idle
   *
   * @param req - Express request with optional idleTimeoutSeconds
   * @param res - Express response
   */
  async autoStopIdleMachines(req: Request, res: Response): Promise<void> {
    try {
      const { idleTimeoutSeconds } = req.body;

      const stoppedCount = await machineTimeTrackingService.autoStopIdleMachines(
        idleTimeoutSeconds
      );

      res.status(200).json({
        success: true,
        data: {
          stoppedCount,
        },
        message: `${stoppedCount} idle machine time entries stopped`,
      });
    } catch (error) {
      logger.error('Failed to auto-stop idle machines', { error });
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Get machine time entry details
   * GET /api/v2/machine-time/:entryId
   *
   * @param req - Express request with entryId param
   * @param res - Express response
   */
  async getMachineTimeEntry(req: Request, res: Response): Promise<void> {
    try {
      const { entryId } = req.params;

      if (!entryId) {
        res.status(400).json({
          success: false,
          error: 'entryId is required',
        });
        return;
      }

      // This would require a service method to get single entry
      // For now, we'll get active entries and find the one
      const entries = await machineTimeTrackingService.getActiveEntries();
      const entry = entries.find((e) => e.id === entryId);

      if (!entry) {
        res.status(404).json({
          success: false,
          error: 'Machine time entry not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: entry,
      });
    } catch (error) {
      logger.error('Failed to get machine time entry', { error });
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }
}

// Export singleton instance
export const machineTimeController = new MachineTimeController();
