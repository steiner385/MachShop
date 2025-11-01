/**
 * Machine Time Tracking Service
 *
 * Handles machine-based time tracking with support for:
 * - Automatic start/stop based on equipment signals
 * - Manual time entry creation and management
 * - Multiple machines working on same operation concurrently
 * - Cost calculation based on configurable costing models
 * - Integration with equipment signals and IoT sensors
 *
 * @module services/MachineTimeTrackingService
 * @see GitHub Issue #49: Machine-Based Time Tracking & Costing System
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Machine Time Entry interface
 */
export interface MachineTimeEntryData {
  equipmentId: string;
  workOrderId?: string;
  operationId?: string;
  startTime: Date;
  endTime?: Date;
  entrySource: string;
  dataSource?: string;
  cycleCount?: number;
  partCount?: number;
  machineUtilization?: number;
  machineRate?: number;
}

/**
 * Machine Time Tracking Service
 */
export class MachineTimeTrackingService {
  private static readonly DEFAULT_IDLE_TIMEOUT_SECONDS = 300; // 5 minutes

  /**
   * Start machine time entry
   *
   * @param data - Machine time entry data
   * @returns Created machine time entry
   */
  async startMachineTime(data: MachineTimeEntryData): Promise<any> {
    try {
      // Check if equipment exists
      const equipment = await prisma.equipment.findUnique({
        where: { id: data.equipmentId },
      });

      if (!equipment) {
        throw new Error(`Equipment not found: ${data.equipmentId}`);
      }

      // Check for overlapping active entries for the same equipment
      const activeEntry = await prisma.machineTimeEntry.findFirst({
        where: {
          equipmentId: data.equipmentId,
          endTime: null,
        },
      });

      if (activeEntry) {
        throw new Error(
          `Equipment ${data.equipmentId} already has active time entry: ${activeEntry.id}`
        );
      }

      // Create machine time entry
      const entry = await prisma.machineTimeEntry.create({
        data: {
          equipmentId: data.equipmentId,
          workOrderId: data.workOrderId,
          operationId: data.operationId,
          startTime: data.startTime,
          entrySource: data.entrySource,
          dataSource: data.dataSource,
          cycleCount: data.cycleCount,
          partCount: data.partCount,
          machineUtilization: data.machineUtilization,
          machineRate: data.machineRate || equipment.machineHourRate || 0,
          status: 'ACTIVE',
        },
      });

      logger.info('Machine time entry started', {
        entryId: entry.id,
        equipmentId: data.equipmentId,
        workOrderId: data.workOrderId,
        source: data.entrySource,
      });

      return entry;
    } catch (error) {
      logger.error('Failed to start machine time entry', { error });
      throw error;
    }
  }

  /**
   * Stop machine time entry
   *
   * @param entryId - Machine time entry ID
   * @param endTime - Time when machine stopped
   * @returns Updated machine time entry with calculated duration
   */
  async stopMachineTime(entryId: string, endTime?: Date): Promise<any> {
    try {
      const entry = await prisma.machineTimeEntry.findUnique({
        where: { id: entryId },
      });

      if (!entry) {
        throw new Error(`Machine time entry not found: ${entryId}`);
      }

      if (entry.status === 'COMPLETED') {
        throw new Error(`Machine time entry already completed: ${entryId}`);
      }

      const actualEndTime = endTime || new Date();
      const duration =
        (actualEndTime.getTime() - entry.startTime.getTime()) / 1000; // seconds

      // Calculate cost
      const cost = this.calculateMachineHourCost(
        duration,
        entry.machineRate || 0
      );

      const updatedEntry = await prisma.machineTimeEntry.update({
        where: { id: entryId },
        data: {
          endTime: actualEndTime,
          duration: duration / 3600, // convert to hours
          machineCost: cost,
          status: 'COMPLETED',
        },
      });

      logger.info('Machine time entry stopped', {
        entryId,
        duration: duration / 3600,
        cost,
      });

      return updatedEntry;
    } catch (error) {
      logger.error('Failed to stop machine time entry', { error });
      throw error;
    }
  }

  /**
   * Pause machine time entry (without ending it)
   *
   * @param entryId - Machine time entry ID
   * @returns Updated machine time entry
   */
  async pauseMachineTime(entryId: string): Promise<any> {
    try {
      const entry = await prisma.machineTimeEntry.findUnique({
        where: { id: entryId },
      });

      if (!entry) {
        throw new Error(`Machine time entry not found: ${entryId}`);
      }

      const updatedEntry = await prisma.machineTimeEntry.update({
        where: { id: entryId },
        data: {
          status: 'PAUSED',
        },
      });

      logger.info('Machine time entry paused', { entryId });

      return updatedEntry;
    } catch (error) {
      logger.error('Failed to pause machine time entry', { error });
      throw error;
    }
  }

  /**
   * Resume paused machine time entry
   *
   * @param entryId - Machine time entry ID
   * @returns Updated machine time entry
   */
  async resumeMachineTime(entryId: string): Promise<any> {
    try {
      const entry = await prisma.machineTimeEntry.findUnique({
        where: { id: entryId },
      });

      if (!entry) {
        throw new Error(`Machine time entry not found: ${entryId}`);
      }

      if (entry.status !== 'PAUSED') {
        throw new Error(
          `Machine time entry is not paused: ${entryId} (status: ${entry.status})`
        );
      }

      const updatedEntry = await prisma.machineTimeEntry.update({
        where: { id: entryId },
        data: {
          status: 'ACTIVE',
        },
      });

      logger.info('Machine time entry resumed', { entryId });

      return updatedEntry;
    } catch (error) {
      logger.error('Failed to resume machine time entry', { error });
      throw error;
    }
  }

  /**
   * Handle equipment signal for auto-start/stop
   *
   * @param equipmentId - Equipment ID
   * @param signalType - Signal type (START, STOP, RUNNING, IDLE)
   * @param workOrderId - Work order ID (for auto-start)
   * @param operationId - Operation ID (for auto-start)
   * @returns Created or updated machine time entry
   */
  async handleEquipmentSignal(
    equipmentId: string,
    signalType: string,
    workOrderId?: string,
    operationId?: string
  ): Promise<any> {
    try {
      const equipment = await prisma.equipment.findUnique({
        where: { id: equipmentId },
      });

      if (!equipment) {
        throw new Error(`Equipment not found: ${equipmentId}`);
      }

      // Check for active entry
      const activeEntry = await prisma.machineTimeEntry.findFirst({
        where: {
          equipmentId,
          status: { in: ['ACTIVE', 'PAUSED'] },
        },
      });

      switch (signalType.toUpperCase()) {
        case 'START':
        case 'RUNNING':
          if (!activeEntry) {
            // Auto-start new entry
            return await this.startMachineTime({
              equipmentId,
              workOrderId,
              operationId,
              startTime: new Date(),
              entrySource: 'MACHINE_AUTO',
              dataSource: 'EQUIPMENT_SIGNAL',
            });
          }
          return activeEntry;

        case 'STOP':
        case 'IDLE':
          if (activeEntry) {
            // Auto-stop active entry
            return await this.stopMachineTime(activeEntry.id);
          }
          return null;

        default:
          logger.warn('Unknown signal type', { signalType, equipmentId });
          return activeEntry;
      }
    } catch (error) {
      logger.error('Failed to handle equipment signal', { error });
      throw error;
    }
  }

  /**
   * Get active machine time entries for equipment
   *
   * @param equipmentId - Equipment ID
   * @returns List of active/paused entries
   */
  async getActiveEntries(equipmentId?: string): Promise<any[]> {
    try {
      const where: any = {
        status: { in: ['ACTIVE', 'PAUSED'] },
      };

      if (equipmentId) {
        where.equipmentId = equipmentId;
      }

      const entries = await prisma.machineTimeEntry.findMany({
        where,
        include: {
          equipment: true,
          workOrder: true,
        },
        orderBy: { startTime: 'desc' },
      });

      return entries;
    } catch (error) {
      logger.error('Failed to get active entries', { error });
      throw error;
    }
  }

  /**
   * Get machine time history for equipment
   *
   * @param equipmentId - Equipment ID
   * @param startDate - Start date filter
   * @param endDate - End date filter
   * @returns List of completed machine time entries
   */
  async getMachineTimeHistory(
    equipmentId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]> {
    try {
      const where: any = {
        equipmentId,
        status: 'COMPLETED',
      };

      if (startDate || endDate) {
        where.startTime = {};
        if (startDate) {
          where.startTime.gte = startDate;
        }
        if (endDate) {
          where.startTime.lte = endDate;
        }
      }

      const entries = await prisma.machineTimeEntry.findMany({
        where,
        include: {
          equipment: true,
          workOrder: true,
          operation: true,
        },
        orderBy: { startTime: 'desc' },
      });

      return entries;
    } catch (error) {
      logger.error('Failed to get machine time history', { error });
      throw error;
    }
  }

  /**
   * Get machine utilization metrics
   *
   * @param equipmentId - Equipment ID
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Utilization statistics
   */
  async getMachineUtilization(
    equipmentId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalRunTime: number;
    totalIdleTime: number;
    utilizationRate: number;
    cyclesCompleted: number;
    averageCycleTime: number;
  }> {
    try {
      const entries = await this.getMachineTimeHistory(
        equipmentId,
        startDate,
        endDate
      );

      let totalRunTime = 0; // hours
      let totalCycles = 0;

      entries.forEach((entry) => {
        if (entry.duration) {
          totalRunTime += entry.duration;
        }
        if (entry.cycleCount) {
          totalCycles += entry.cycleCount;
        }
      });

      const periodHours =
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
      const utilizationRate =
        periodHours > 0 ? (totalRunTime / periodHours) * 100 : 0;
      const averageCycleTime =
        totalCycles > 0 ? totalRunTime / totalCycles : 0;

      return {
        totalRunTime,
        totalIdleTime: periodHours - totalRunTime,
        utilizationRate,
        cyclesCompleted: totalCycles,
        averageCycleTime,
      };
    } catch (error) {
      logger.error('Failed to calculate machine utilization', { error });
      throw error;
    }
  }

  /**
   * Calculate machine hour cost
   *
   * @param durationSeconds - Duration in seconds
   * @param hourlyRate - Hourly rate
   * @returns Calculated cost
   */
  private calculateMachineHourCost(
    durationSeconds: number,
    hourlyRate: number
  ): number {
    const durationHours = durationSeconds / 3600;
    return Math.round(durationHours * hourlyRate * 100) / 100; // Round to 2 decimals
  }

  /**
   * Get cost summary for machine time entries
   *
   * @param equipmentId - Equipment ID
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Cost summary
   */
  async getMachineCostSummary(
    equipmentId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalMachineHours: number;
    totalMachineCost: number;
    averageHourlyRate: number;
    entriesCount: number;
  }> {
    try {
      const entries = await this.getMachineTimeHistory(
        equipmentId,
        startDate,
        endDate
      );

      let totalHours = 0;
      let totalCost = 0;

      entries.forEach((entry) => {
        if (entry.duration) {
          totalHours += entry.duration;
        }
        if (entry.machineCost) {
          totalCost += entry.machineCost;
        }
      });

      return {
        totalMachineHours: totalHours,
        totalMachineCost: totalCost,
        averageHourlyRate: totalHours > 0 ? totalCost / totalHours : 0,
        entriesCount: entries.length,
      };
    } catch (error) {
      logger.error('Failed to get machine cost summary', { error });
      throw error;
    }
  }

  /**
   * Validate machine time entry
   *
   * @param entryId - Machine time entry ID
   * @returns Validation result with any errors
   */
  async validateMachineTimeEntry(
    entryId: string
  ): Promise<{ isValid: boolean; errors: string[] }> {
    try {
      const entry = await prisma.machineTimeEntry.findUnique({
        where: { id: entryId },
        include: { equipment: true, workOrder: true },
      });

      if (!entry) {
        return {
          isValid: false,
          errors: [`Machine time entry not found: ${entryId}`],
        };
      }

      const errors: string[] = [];

      // Validate equipment exists
      if (!entry.equipment) {
        errors.push('Equipment not found');
      }

      // Validate time range
      if (entry.endTime && entry.startTime >= entry.endTime) {
        errors.push('Start time must be before end time');
      }

      // Validate work order if specified
      if (entry.workOrderId && !entry.workOrder) {
        errors.push('Work order not found');
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      logger.error('Failed to validate machine time entry', { error });
      throw error;
    }
  }

  /**
   * Auto-stop idle machines
   *
   * @param idleTimeoutSeconds - Idle timeout in seconds
   * @returns Number of entries auto-stopped
   */
  async autoStopIdleMachines(
    idleTimeoutSeconds = MachineTimeTrackingService.DEFAULT_IDLE_TIMEOUT_SECONDS
  ): Promise<number> {
    try {
      const cutoffTime = new Date(
        Date.now() - idleTimeoutSeconds * 1000
      );

      // Find active entries that haven't been updated recently
      const activeEntries = await prisma.machineTimeEntry.findMany({
        where: {
          status: 'ACTIVE',
          updatedAt: {
            lt: cutoffTime,
          },
        },
      });

      let stoppedCount = 0;

      for (const entry of activeEntries) {
        try {
          await this.stopMachineTime(entry.id, cutoffTime);
          stoppedCount++;
        } catch (error) {
          logger.error('Failed to auto-stop idle machine', {
            entryId: entry.id,
            error,
          });
        }
      }

      logger.info('Auto-stopped idle machines', {
        count: stoppedCount,
        idleTimeout: idleTimeoutSeconds,
      });

      return stoppedCount;
    } catch (error) {
      logger.error('Failed to auto-stop idle machines', { error });
      throw error;
    }
  }
}

// Export singleton instance
export const machineTimeTrackingService = new MachineTimeTrackingService();
