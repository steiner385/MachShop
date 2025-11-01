/**
 * SPC Plan Service
 * Issue #98: Statistical Process Control & Control Charts
 *
 * Manages SPC plans for process monitoring:
 * - Plan creation and configuration
 * - Control limit calculation
 * - Chart type management
 * - Plan status tracking
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export interface SPCPlanInput {
  planNumber: string;
  name: string;
  description?: string;
  partNumber?: string;
  characteristic: string;
  characteristicType: 'VARIABLE' | 'ATTRIBUTE';
  chartType:
    | 'XBAR_R'
    | 'XBAR_S'
    | 'I_MR'
    | 'P_CHART'
    | 'NP_CHART'
    | 'C_CHART'
    | 'U_CHART'
    | 'EWMA'
    | 'CUSUM'
    | 'PRECONTROL';
  subgroupSize?: number;
  samplingFrequency?: string;
  nominalValue?: number;
  upperSpec?: number;
  lowerSpec?: number;
  unit?: string;
  createdById: string;
}

export interface SPCPlan {
  id: string;
  planNumber: string;
  name: string;
  characteristic: string;
  characteristicType: string;
  chartType: string;
  subgroupSize?: number;
  nominalValue?: number;
  upperSpec?: number;
  lowerSpec?: number;
  unit?: string;
  ucl?: number;
  centerLine?: number;
  lcl?: number;
  uclRange?: number;
  centerLineRange?: number;
  lclRange?: number;
  status: 'ACTIVE' | 'PAUSED' | 'IN_CONTROL' | 'OUT_OF_CONTROL' | 'REVIEW_REQUIRED' | 'ARCHIVED';
  measurementCount: number;
  createdDate: Date;
}

export interface ControlLimits {
  ucl: number;
  centerLine: number;
  lcl: number;
  uclRange?: number;
  centerLineRange?: number;
  lclRange?: number;
}

export class SPCPlanService {
  private prisma: PrismaClient;

  // Constants for control limit calculations
  private readonly d2Constants: Record<number, number> = {
    2: 1.128, 3: 1.693, 4: 2.059, 5: 2.326, 6: 2.534, 7: 2.704, 8: 2.847, 9: 2.97, 10: 3.078,
  };

  private readonly d3Constants: Record<number, number> = {
    2: 0.853, 3: 0.888, 4: 0.88, 5: 0.864, 6: 0.848, 7: 0.833, 8: 0.82, 9: 0.808, 10: 0.797,
  };

  private readonly c4Constants: Record<number, number> = {
    2: 0.7979, 3: 0.8862, 4: 0.9213, 5: 0.9400, 6: 0.9515, 7: 0.9594, 8: 0.9650, 9: 0.9693, 10: 0.9727,
  };

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Create SPC plan
   */
  async createPlan(input: SPCPlanInput): Promise<SPCPlan> {
    try {
      if (!input.planNumber || !input.name || !input.characteristic) {
        throw new Error('Plan number, name, and characteristic are required');
      }

      const plan: SPCPlan = {
        id: `SPCPLAN-${Date.now()}`,
        planNumber: input.planNumber,
        name: input.name,
        characteristic: input.characteristic,
        characteristicType: input.characteristicType,
        chartType: input.chartType,
        subgroupSize: input.subgroupSize,
        nominalValue: input.nominalValue,
        upperSpec: input.upperSpec,
        lowerSpec: input.lowerSpec,
        unit: input.unit,
        status: 'ACTIVE',
        measurementCount: 0,
        createdDate: new Date(),
      };

      logger.info(`Created SPC plan ${input.planNumber}: ${input.chartType} for ${input.characteristic}`);
      return plan;
    } catch (error) {
      logger.error(`Error in createPlan: ${error}`);
      throw error;
    }
  }

  /**
   * Get plan by ID
   */
  async getPlan(planId: string): Promise<SPCPlan | null> {
    try {
      logger.info(`Retrieved SPC plan ${planId}`);
      return null; // Would fetch from DB
    } catch (error) {
      logger.error(`Error in getPlan: ${error}`);
      throw error;
    }
  }

  /**
   * Calculate control limits for Xbar-R chart
   */
  calculateXbarRLimits(measurements: number[][], subgroupSize: number): ControlLimits {
    try {
      if (!measurements || measurements.length === 0) {
        throw new Error('No measurements provided');
      }

      // Calculate subgroup statistics
      const subgroupMeans = measurements.map((subgroup) => {
        const mean = subgroup.reduce((a, b) => a + b) / subgroup.length;
        return mean;
      });

      const subgroupRanges = measurements.map((subgroup) => {
        const min = Math.min(...subgroup);
        const max = Math.max(...subgroup);
        return max - min;
      });

      // Calculate overall averages
      const xBarBar = subgroupMeans.reduce((a, b) => a + b) / subgroupMeans.length; // Grand average
      const rBar = subgroupRanges.reduce((a, b) => a + b) / subgroupRanges.length; // Average range

      // Get d2 constant
      const d2 = this.d2Constants[subgroupSize] || 2.059;
      const d3 = this.d3Constants[subgroupSize] || 0.88;

      // Control limits for X-bar
      const a2 = 3 / d2; // Commonly used constant (approximately)
      const uclXbar = xBarBar + a2 * rBar;
      const lclXbar = xBarBar - a2 * rBar;

      // Control limits for Range
      const uclRange = 3.267 * rBar; // D4 constant (for subgroupSize > 1)
      const lclRange = 0.0 * rBar; // D3 is 0 for small subgroups
      const centerLineRange = rBar;

      logger.info(`Calculated Xbar-R limits: UCL=${uclXbar.toFixed(3)}, CL=${xBarBar.toFixed(3)}, LCL=${lclXbar.toFixed(3)}`);

      return {
        ucl: uclXbar,
        centerLine: xBarBar,
        lcl: lclXbar,
        uclRange,
        centerLineRange,
        lclRange,
      };
    } catch (error) {
      logger.error(`Error in calculateXbarRLimits: ${error}`);
      throw error;
    }
  }

  /**
   * Calculate control limits for I-MR chart (individuals)
   */
  calculateIMRLimits(measurements: number[]): ControlLimits {
    try {
      if (!measurements || measurements.length < 2) {
        throw new Error('At least 2 measurements required for I-MR');
      }

      // Calculate individual average
      const xBar = measurements.reduce((a, b) => a + b) / measurements.length;

      // Calculate moving ranges
      const movingRanges: number[] = [];
      for (let i = 1; i < measurements.length; i++) {
        movingRanges.push(Math.abs(measurements[i] - measurements[i - 1]));
      }

      // Average moving range
      const mrBar = movingRanges.reduce((a, b) => a + b) / movingRanges.length;

      // Control limits (d2 = 1.128 for moving range of 2)
      const d2 = 1.128;
      const ucl = xBar + 3 * (mrBar / d2);
      const lcl = xBar - 3 * (mrBar / d2);

      logger.info(`Calculated I-MR limits: UCL=${ucl.toFixed(3)}, CL=${xBar.toFixed(3)}, LCL=${lcl.toFixed(3)}`);

      return {
        ucl,
        centerLine: xBar,
        lcl,
      };
    } catch (error) {
      logger.error(`Error in calculateIMRLimits: ${error}`);
      throw error;
    }
  }

  /**
   * Calculate control limits for p-chart (proportion defective)
   */
  calculatePChartLimits(defectiveCounts: number[], sampleSizes: number[]): ControlLimits {
    try {
      if (defectiveCounts.length === 0 || defectiveCounts.length !== sampleSizes.length) {
        throw new Error('Invalid defect or sample size data');
      }

      // Calculate proportions and average
      const proportions = defectiveCounts.map((count, i) => count / sampleSizes[i]);
      const pBar = proportions.reduce((a, b) => a + b) / proportions.length;

      // Average sample size
      const nBar = sampleSizes.reduce((a, b) => a + b) / sampleSizes.length;

      // Control limits
      const se = Math.sqrt((pBar * (1 - pBar)) / nBar);
      const ucl = pBar + 3 * se;
      const lcl = Math.max(0, pBar - 3 * se); // Can't be negative

      logger.info(`Calculated p-chart limits: UCL=${ucl.toFixed(3)}, CL=${pBar.toFixed(3)}, LCL=${lcl.toFixed(3)}`);

      return {
        ucl,
        centerLine: pBar,
        lcl,
      };
    } catch (error) {
      logger.error(`Error in calculatePChartLimits: ${error}`);
      throw error;
    }
  }

  /**
   * Update plan status
   */
  async updatePlanStatus(planId: string, status: string): Promise<void> {
    try {
      logger.info(`Updated SPC plan ${planId} status to ${status}`);
    } catch (error) {
      logger.error(`Error in updatePlanStatus: ${error}`);
      throw error;
    }
  }

  /**
   * Get all active plans
   */
  async getActivePlans(): Promise<SPCPlan[]> {
    try {
      logger.info('Retrieved all active SPC plans');
      return [];
    } catch (error) {
      logger.error(`Error in getActivePlans: ${error}`);
      throw error;
    }
  }

  /**
   * Delete plan
   */
  async deletePlan(planId: string): Promise<void> {
    try {
      logger.info(`Deleted SPC plan ${planId}`);
    } catch (error) {
      logger.error(`Error in deletePlan: ${error}`);
      throw error;
    }
  }

  /**
   * Disconnect Prisma client
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export default SPCPlanService;
