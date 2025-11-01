/**
 * Machine Cost Calculation Service
 *
 * Handles cost calculations for machine time with support for:
 * - Multiple costing models (Labor Hours, Machine Hours, Combined)
 * - Overhead allocation and absorption costing
 * - Time-based and piece-rate pricing
 * - Cost center tracking and allocation
 * - Product/operation costing
 * - Cost variance analysis
 *
 * @module services/MachineCostCalculationService
 * @see GitHub Issue #49: Machine-Based Time Tracking & Costing System
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Costing configuration
 */
export interface CostingConfiguration {
  costingModel: 'LABOR_HOURS' | 'MACHINE_HOURS' | 'BOTH';
  useOverheadAllocation: boolean;
  overheadRate?: number; // percentage
  useAbsorptionCosting: boolean;
  costCenterTracking: boolean;
  trackVariances: boolean;
  roundingDecimalPlaces: number;
}

/**
 * Cost calculation result
 */
export interface CostCalculationResult {
  baseMachineHours: number;
  machineHourRate: number;
  machineCost: number;
  laborHours: number;
  laborHourRate: number;
  laborCost: number;
  overheadCost: number;
  totalCost: number;
  costPerUnit?: number;
  costCenterId?: string;
  costingModel: string;
  timestamp: Date;
}

/**
 * Operation cost summary
 */
export interface OperationCostSummary {
  operationId: string;
  operationName: string;
  workOrderId: string;
  totalMachineHours: number;
  totalMachineCost: number;
  totalLaborHours: number;
  totalLaborCost: number;
  totalOverheadCost: number;
  totalCost: number;
  estimatedVsActual?: {
    estimatedCost: number;
    actualCost: number;
    variance: number;
    variancePercent: number;
  };
}

/**
 * Machine Cost Calculation Service
 */
export class MachineCostCalculationService {
  private costingConfig: CostingConfiguration;

  constructor(config?: Partial<CostingConfiguration>) {
    this.costingConfig = {
      costingModel: config?.costingModel || 'MACHINE_HOURS',
      useOverheadAllocation: config?.useOverheadAllocation ?? true,
      overheadRate: config?.overheadRate || 0.15, // 15% default
      useAbsorptionCosting: config?.useAbsorptionCosting ?? false,
      costCenterTracking: config?.costCenterTracking ?? true,
      trackVariances: config?.trackVariances ?? true,
      roundingDecimalPlaces: config?.roundingDecimalPlaces || 2,
    };

    logger.info('Machine cost calculation service initialized', {
      costingModel: this.costingConfig.costingModel,
      overheadRate: this.costingConfig.overheadRate,
    });
  }

  /**
   * Calculate machine hour cost
   *
   * @param durationSeconds - Duration in seconds
   * @param hourlyRate - Hourly rate in currency
   * @returns Calculated cost
   */
  calculateMachineHourCost(durationSeconds: number, hourlyRate: number): number {
    const durationHours = durationSeconds / 3600;
    const baseCost = durationHours * hourlyRate;
    return this.roundCost(baseCost);
  }

  /**
   * Calculate complete cost for machine time entry
   *
   * @param machineTimeEntryId - Machine time entry ID
   * @returns Cost calculation result
   */
  async calculateMachineTimeCost(machineTimeEntryId: string): Promise<CostCalculationResult> {
    try {
      const entry = await prisma.machineTimeEntry.findUnique({
        where: { id: machineTimeEntryId },
        include: {
          equipment: true,
          workOrder: true,
          operation: true,
        },
      });

      if (!entry) {
        throw new Error(`Machine time entry not found: ${machineTimeEntryId}`);
      }

      if (!entry.duration || !entry.endTime) {
        throw new Error('Machine time entry not completed');
      }

      const machineHours = entry.duration;
      const machineRate = entry.machineRate || entry.equipment?.machineHourRate || 0;
      const machineCost = this.calculateMachineHourCost(
        (entry.endTime.getTime() - entry.startTime.getTime()) / 1000,
        machineRate
      );

      // Calculate labor cost if using BOTH model
      let laborCost = 0;
      let laborHours = 0;
      if (this.costingConfig.costingModel === 'BOTH' || this.costingConfig.costingModel === 'LABOR_HOURS') {
        // Get labor hours for same operation
        const laborEntries = await prisma.laborTimeEntry.findMany({
          where: {
            operationId: entry.operationId,
            startTime: { gte: entry.startTime, lte: entry.endTime },
          },
          include: { employee: true },
        });

        for (const laborEntry of laborEntries) {
          if (laborEntry.endTime) {
            const duration = laborEntry.endTime.getTime() - laborEntry.startTime.getTime();
            const hours = duration / (1000 * 60 * 60);
            const rate = laborEntry.employee?.hourlyRate || 0;
            laborHours += hours;
            laborCost += this.roundCost(hours * rate);
          }
        }
      }

      // Calculate overhead
      let overheadCost = 0;
      if (this.costingConfig.useOverheadAllocation) {
        const allocableBase =
          this.costingConfig.costingModel === 'LABOR_HOURS'
            ? laborCost
            : machineCost + laborCost;
        overheadCost = this.roundCost(
          allocableBase * (this.costingConfig.overheadRate || 0)
        );
      }

      const totalCost = this.roundCost(machineCost + laborCost + overheadCost);

      // Calculate cost per unit if available
      let costPerUnit: number | undefined;
      if (entry.partCount && entry.partCount > 0) {
        costPerUnit = this.roundCost(totalCost / entry.partCount);
      }

      const result: CostCalculationResult = {
        baseMachineHours: machineHours,
        machineHourRate: machineRate,
        machineCost,
        laborHours,
        laborHourRate: laborHours > 0 ? laborCost / laborHours : 0,
        laborCost,
        overheadCost,
        totalCost,
        costPerUnit,
        costCenterId: entry.equipment?.costCenterId,
        costingModel: this.costingConfig.costingModel,
        timestamp: new Date(),
      };

      logger.info('Machine time cost calculated', {
        entryId: machineTimeEntryId,
        machineHours,
        totalCost,
      });

      return result;
    } catch (error) {
      logger.error('Failed to calculate machine time cost', { error });
      throw error;
    }
  }

  /**
   * Calculate operation cost summary
   *
   * @param operationId - Operation ID
   * @returns Operation cost summary
   */
  async calculateOperationCostSummary(operationId: string): Promise<OperationCostSummary> {
    try {
      const operation = await prisma.operation.findUnique({
        where: { id: operationId },
        include: {
          workOrder: true,
        },
      });

      if (!operation) {
        throw new Error(`Operation not found: ${operationId}`);
      }

      // Get all machine time entries for operation
      const machineEntries = await prisma.machineTimeEntry.findMany({
        where: {
          operationId,
          status: 'COMPLETED',
        },
        include: { equipment: true },
      });

      // Get all labor time entries for operation
      const laborEntries = await prisma.laborTimeEntry.findMany({
        where: {
          operationId,
          status: 'COMPLETED',
        },
        include: { employee: true },
      });

      let totalMachineHours = 0;
      let totalMachineCost = 0;
      let totalLaborHours = 0;
      let totalLaborCost = 0;

      // Calculate machine costs
      for (const entry of machineEntries) {
        if (entry.duration) {
          totalMachineHours += entry.duration;
          const rate = entry.machineRate || entry.equipment?.machineHourRate || 0;
          totalMachineCost += entry.machineCost || this.calculateMachineHourCost(
            entry.duration * 3600,
            rate
          );
        }
      }

      // Calculate labor costs
      for (const entry of laborEntries) {
        if (entry.endTime) {
          const duration = entry.endTime.getTime() - entry.startTime.getTime();
          const hours = duration / (1000 * 60 * 60);
          totalLaborHours += hours;
          const rate = entry.employee?.hourlyRate || 0;
          totalLaborCost += this.roundCost(hours * rate);
        }
      }

      // Calculate overhead
      let totalOverheadCost = 0;
      if (this.costingConfig.useOverheadAllocation) {
        const allocableBase =
          this.costingConfig.costingModel === 'LABOR_HOURS'
            ? totalLaborCost
            : totalMachineCost + totalLaborCost;
        totalOverheadCost = this.roundCost(
          allocableBase * (this.costingConfig.overheadRate || 0)
        );
      }

      const totalCost = this.roundCost(totalMachineCost + totalLaborCost + totalOverheadCost);

      const summary: OperationCostSummary = {
        operationId,
        operationName: operation.name,
        workOrderId: operation.workOrderId,
        totalMachineHours,
        totalMachineCost,
        totalLaborHours,
        totalLaborCost,
        totalOverheadCost,
        totalCost,
      };

      // Calculate variance if tracking enabled and estimate available
      if (this.costingConfig.trackVariances && operation.estimatedCost) {
        const variance = totalCost - operation.estimatedCost;
        const variancePercent =
          operation.estimatedCost > 0
            ? (variance / operation.estimatedCost) * 100
            : 0;

        summary.estimatedVsActual = {
          estimatedCost: operation.estimatedCost,
          actualCost: totalCost,
          variance,
          variancePercent: this.roundCost(variancePercent),
        };
      }

      logger.info('Operation cost summary calculated', {
        operationId,
        totalCost,
      });

      return summary;
    } catch (error) {
      logger.error('Failed to calculate operation cost summary', { error });
      throw error;
    }
  }

  /**
   * Calculate work order cost summary
   *
   * @param workOrderId - Work order ID
   * @returns Work order cost summary
   */
  async calculateWorkOrderCostSummary(workOrderId: string): Promise<{
    workOrderId: string;
    totalMachineHours: number;
    totalMachineCost: number;
    totalLaborHours: number;
    totalLaborCost: number;
    totalOverheadCost: number;
    totalCost: number;
    costPerUnit: number;
    operationCosts: OperationCostSummary[];
  }> {
    try {
      const workOrder = await prisma.workOrder.findUnique({
        where: { id: workOrderId },
        include: {
          product: true,
          operations: true,
        },
      });

      if (!workOrder) {
        throw new Error(`Work order not found: ${workOrderId}`);
      }

      let totalMachineHours = 0;
      let totalMachineCost = 0;
      let totalLaborHours = 0;
      let totalLaborCost = 0;
      let totalOverheadCost = 0;
      const operationCosts: OperationCostSummary[] = [];

      // Calculate costs for each operation
      for (const operation of workOrder.operations) {
        const opCost = await this.calculateOperationCostSummary(operation.id);
        operationCosts.push(opCost);

        totalMachineHours += opCost.totalMachineHours;
        totalMachineCost += opCost.totalMachineCost;
        totalLaborHours += opCost.totalLaborHours;
        totalLaborCost += opCost.totalLaborCost;
        totalOverheadCost += opCost.totalOverheadCost;
      }

      const totalCost = this.roundCost(totalMachineCost + totalLaborCost + totalOverheadCost);
      const costPerUnit = workOrder.quantity
        ? this.roundCost(totalCost / workOrder.quantity)
        : 0;

      logger.info('Work order cost summary calculated', {
        workOrderId,
        totalCost,
        costPerUnit,
      });

      return {
        workOrderId,
        totalMachineHours,
        totalMachineCost,
        totalLaborHours,
        totalLaborCost,
        totalOverheadCost,
        totalCost,
        costPerUnit,
        operationCosts,
      };
    } catch (error) {
      logger.error('Failed to calculate work order cost summary', { error });
      throw error;
    }
  }

  /**
   * Calculate equipment cost allocation
   *
   * @param equipmentId - Equipment ID
   * @param startDate - Start date for period
   * @param endDate - End date for period
   * @returns Equipment cost allocation
   */
  async calculateEquipmentCostAllocation(
    equipmentId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    equipmentId: string;
    periodStartDate: Date;
    periodEndDate: Date;
    totalMachineHours: number;
    totalMachineCost: number;
    fixedCostAllocation: number;
    totalCostWithFixedAllocation: number;
    costPerHour: number;
    utilizationPercent: number;
  }> {
    try {
      const equipment = await prisma.equipment.findUnique({
        where: { id: equipmentId },
      });

      if (!equipment) {
        throw new Error(`Equipment not found: ${equipmentId}`);
      }

      // Get machine time entries for period
      const entries = await prisma.machineTimeEntry.findMany({
        where: {
          equipmentId,
          status: 'COMPLETED',
          startTime: { gte: startDate, lte: endDate },
        },
      });

      let totalMachineHours = 0;
      let totalMachineCost = 0;

      for (const entry of entries) {
        if (entry.duration) {
          totalMachineHours += entry.duration;
          totalMachineCost += entry.machineCost || 0;
        }
      }

      // Calculate period hours (24 hours * days)
      const periodDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      const periodHours = periodDays * 24;

      // Calculate utilization
      const utilizationPercent = periodHours > 0
        ? this.roundCost((totalMachineHours / periodHours) * 100)
        : 0;

      // Allocate fixed costs (equipment depreciation, maintenance, etc.)
      const fixedCostPerDay = equipment.dailyFixedCost || 0;
      const fixedCostAllocation = this.roundCost(fixedCostPerDay * periodDays);

      const totalCostWithFixedAllocation = this.roundCost(
        totalMachineCost + fixedCostAllocation
      );
      const costPerHour = totalMachineHours > 0
        ? this.roundCost(totalCostWithFixedAllocation / totalMachineHours)
        : 0;

      logger.info('Equipment cost allocation calculated', {
        equipmentId,
        totalMachineHours,
        totalCost: totalCostWithFixedAllocation,
      });

      return {
        equipmentId,
        periodStartDate: startDate,
        periodEndDate: endDate,
        totalMachineHours,
        totalMachineCost,
        fixedCostAllocation,
        totalCostWithFixedAllocation,
        costPerHour,
        utilizationPercent,
      };
    } catch (error) {
      logger.error('Failed to calculate equipment cost allocation', { error });
      throw error;
    }
  }

  /**
   * Update costing configuration
   *
   * @param config - Partial costing configuration to update
   */
  updateConfiguration(config: Partial<CostingConfiguration>): void {
    this.costingConfig = {
      ...this.costingConfig,
      ...config,
    };

    logger.info('Costing configuration updated', {
      costingModel: this.costingConfig.costingModel,
      overheadRate: this.costingConfig.overheadRate,
    });
  }

  /**
   * Get current costing configuration
   *
   * @returns Current costing configuration
   */
  getConfiguration(): CostingConfiguration {
    return { ...this.costingConfig };
  }

  /**
   * Round cost to configured decimal places
   *
   * @param cost - Cost value to round
   * @returns Rounded cost
   */
  private roundCost(cost: number): number {
    const factor = Math.pow(10, this.costingConfig.roundingDecimalPlaces);
    return Math.round(cost * factor) / factor;
  }

  /**
   * Validate costing configuration
   *
   * @param config - Configuration to validate
   * @returns Validation result with errors if any
   */
  static validateConfiguration(config: Partial<CostingConfiguration>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (
      config.costingModel &&
      !['LABOR_HOURS', 'MACHINE_HOURS', 'BOTH'].includes(config.costingModel)
    ) {
      errors.push('Invalid costing model');
    }

    if (config.overheadRate !== undefined) {
      if (config.overheadRate < 0 || config.overheadRate > 1) {
        errors.push('Overhead rate must be between 0 and 1');
      }
    }

    if (config.roundingDecimalPlaces !== undefined) {
      if (config.roundingDecimalPlaces < 0 || config.roundingDecimalPlaces > 10) {
        errors.push('Rounding decimal places must be between 0 and 10');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// Export singleton instance with default configuration
export const machineCostCalculationService = new MachineCostCalculationService();
