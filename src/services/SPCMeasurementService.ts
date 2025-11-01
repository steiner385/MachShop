/**
 * SPC Measurement Service
 * Issue #98: Statistical Process Control & Control Charts
 *
 * Manages SPC measurement data collection:
 * - Individual and subgroup measurement recording
 * - Subgroup organization and statistics calculation
 * - Measurement validation and outlier detection
 * - Subgroup mean, range, and standard deviation calculation
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export interface MeasurementInput {
  planId: string;
  values: number[];
  subgroupNumber?: number;
  samplingTime?: Date;
  operatorId?: string;
  equipmentId?: string;
  batchId?: string;
  notes?: string;
}

export interface SPCSubgroup {
  id: string;
  planId: string;
  subgroupNumber: number;
  values: number[];
  mean: number;
  range: number;
  standardDeviation: number;
  movingRange?: number;
  samplingTime: Date;
  recordedDate: Date;
}

export interface MeasurementStatistics {
  subgroupMean: number;
  subgroupRange: number;
  subgroupStdDev: number;
  min: number;
  max: number;
  count: number;
}

export class SPCMeasurementService {
  private prisma: PrismaClient;
  private subgroupCounter: Map<string, number> = new Map(); // Track subgroup count per plan
  private previousValue: Map<string, number> = new Map(); // Track previous value for moving range

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Record a measurement for a plan
   */
  async recordMeasurement(input: MeasurementInput): Promise<SPCSubgroup> {
    try {
      if (!input.planId || !input.values || input.values.length === 0) {
        throw new Error('Plan ID and measurement values are required');
      }

      // Validate measurements are numbers
      if (!input.values.every((v) => typeof v === 'number' && !isNaN(v))) {
        throw new Error('All measurement values must be valid numbers');
      }

      // Calculate subgroup statistics
      const stats = this.calculateSubgroupStatistics(input.values);

      // Increment subgroup counter for this plan
      const currentSubgroup = (this.subgroupCounter.get(input.planId) || 0) + 1;
      this.subgroupCounter.set(input.planId, currentSubgroup);

      const subgroup: SPCSubgroup = {
        id: `SG-${input.planId}-${currentSubgroup}`,
        planId: input.planId,
        subgroupNumber: input.subgroupNumber || currentSubgroup,
        values: input.values,
        mean: stats.subgroupMean,
        range: stats.subgroupRange,
        standardDeviation: stats.subgroupStdDev,
        samplingTime: input.samplingTime || new Date(),
        recordedDate: new Date(),
      };

      logger.info(`Recorded measurement for plan ${input.planId}: subgroup ${currentSubgroup}, mean=${stats.subgroupMean.toFixed(3)}, range=${stats.subgroupRange.toFixed(3)}`);
      return subgroup;
    } catch (error) {
      logger.error(`Error in recordMeasurement: ${error}`);
      throw error;
    }
  }

  /**
   * Record individual measurement (for I-MR charts)
   */
  async recordIndividualMeasurement(planId: string, value: number, samplingTime?: Date): Promise<SPCSubgroup> {
    try {
      if (typeof value !== 'number' || isNaN(value)) {
        throw new Error('Measurement value must be a valid number');
      }

      // Calculate moving range from previous value
      let movingRange: number | undefined;
      const previousVal = this.previousValue.get(planId);
      if (previousVal !== undefined) {
        movingRange = Math.abs(value - previousVal);
      }
      this.previousValue.set(planId, value);

      // Increment subgroup counter
      const currentSubgroup = (this.subgroupCounter.get(planId) || 0) + 1;
      this.subgroupCounter.set(planId, currentSubgroup);

      const subgroup: SPCSubgroup = {
        id: `IM-${planId}-${currentSubgroup}`,
        planId,
        subgroupNumber: currentSubgroup,
        values: [value],
        mean: value,
        range: movingRange || 0,
        standardDeviation: 0,
        movingRange,
        samplingTime: samplingTime || new Date(),
        recordedDate: new Date(),
      };

      logger.info(`Recorded individual measurement for plan ${planId}: value=${value.toFixed(3)}, moving range=${movingRange ? movingRange.toFixed(3) : 'N/A'}`);
      return subgroup;
    } catch (error) {
      logger.error(`Error in recordIndividualMeasurement: ${error}`);
      throw error;
    }
  }

  /**
   * Calculate subgroup statistics (mean, range, std dev)
   */
  calculateSubgroupStatistics(values: number[]): MeasurementStatistics {
    if (!values || values.length === 0) {
      throw new Error('Values array cannot be empty');
    }

    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / count;

    // Calculate range
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;

    // Calculate standard deviation
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (count - 1 > 0 ? count - 1 : count);
    const stdDev = Math.sqrt(variance);

    return {
      subgroupMean: mean,
      subgroupRange: range,
      subgroupStdDev: stdDev,
      min,
      max,
      count,
    };
  }

  /**
   * Get all measurements for a plan
   */
  async getPlanMeasurements(planId: string): Promise<SPCSubgroup[]> {
    try {
      logger.info(`Retrieved measurements for plan ${planId}`);
      return []; // Would fetch from DB
    } catch (error) {
      logger.error(`Error in getPlanMeasurements: ${error}`);
      throw error;
    }
  }

  /**
   * Get the last N subgroups for a plan
   */
  async getRecentSubgroups(planId: string, count: number = 25): Promise<SPCSubgroup[]> {
    try {
      if (count <= 0) {
        throw new Error('Count must be greater than 0');
      }

      logger.info(`Retrieved last ${count} subgroups for plan ${planId}`);
      return []; // Would fetch from DB
    } catch (error) {
      logger.error(`Error in getRecentSubgroups: ${error}`);
      throw error;
    }
  }

  /**
   * Get subgroup by ID
   */
  async getSubgroup(subgroupId: string): Promise<SPCSubgroup | null> {
    try {
      logger.info(`Retrieved subgroup ${subgroupId}`);
      return null; // Would fetch from DB
    } catch (error) {
      logger.error(`Error in getSubgroup: ${error}`);
      throw error;
    }
  }

  /**
   * Detect outliers in measurements using IQR method
   */
  detectOutliers(values: number[]): { outliers: number[]; threshold: number } {
    try {
      if (values.length < 4) {
        return { outliers: [], threshold: 0 };
      }

      // Sort values
      const sorted = [...values].sort((a, b) => a - b);

      // Calculate quartiles
      const q1Index = Math.floor(sorted.length * 0.25);
      const q3Index = Math.floor(sorted.length * 0.75);
      const q1 = sorted[q1Index];
      const q3 = sorted[q3Index];

      const iqr = q3 - q1;
      const threshold = 1.5 * iqr;

      // Detect outliers
      const outliers = values.filter((v) => v < q1 - threshold || v > q3 + threshold);

      logger.info(`Outlier detection: found ${outliers.length} outliers with threshold ${threshold.toFixed(3)}`);

      return { outliers, threshold };
    } catch (error) {
      logger.error(`Error in detectOutliers: ${error}`);
      throw error;
    }
  }

  /**
   * Calculate running statistics for multiple subgroups
   */
  calculateRunningStatistics(subgroups: SPCSubgroup[]): {
    overallMean: number;
    overallRange: number;
    overallStdDev: number;
  } {
    try {
      if (!subgroups || subgroups.length === 0) {
        throw new Error('Subgroups array cannot be empty');
      }

      // Calculate overall mean (grand average of subgroup means)
      const means = subgroups.map((sg) => sg.mean);
      const overallMean = means.reduce((a, b) => a + b, 0) / means.length;

      // Calculate overall range (average of ranges)
      const ranges = subgroups.map((sg) => sg.range);
      const overallRange = ranges.reduce((a, b) => a + b, 0) / ranges.length;

      // Calculate overall standard deviation
      const allValues = subgroups.flatMap((sg) => sg.values);
      const stats = this.calculateSubgroupStatistics(allValues);
      const overallStdDev = stats.subgroupStdDev;

      logger.info(`Running statistics: overall mean=${overallMean.toFixed(3)}, range=${overallRange.toFixed(3)}, stdDev=${overallStdDev.toFixed(3)}`);

      return {
        overallMean,
        overallRange,
        overallStdDev,
      };
    } catch (error) {
      logger.error(`Error in calculateRunningStatistics: ${error}`);
      throw error;
    }
  }

  /**
   * Validate measurements against specification limits
   */
  validateAgainstSpecLimits(
    values: number[],
    upperSpec?: number,
    lowerSpec?: number
  ): { conforming: number[]; nonconforming: number[]; rate: number } {
    try {
      const conforming: number[] = [];
      const nonconforming: number[] = [];

      values.forEach((value) => {
        let isConforming = true;

        if (upperSpec !== undefined && value > upperSpec) {
          isConforming = false;
        }
        if (lowerSpec !== undefined && value < lowerSpec) {
          isConforming = false;
        }

        if (isConforming) {
          conforming.push(value);
        } else {
          nonconforming.push(value);
        }
      });

      const rate = values.length > 0 ? (nonconforming.length / values.length) * 100 : 0;

      logger.info(`Spec validation: ${conforming.length} conforming, ${nonconforming.length} nonconforming (${rate.toFixed(2)}%)`);

      return { conforming, nonconforming, rate };
    } catch (error) {
      logger.error(`Error in validateAgainstSpecLimits: ${error}`);
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

export default SPCMeasurementService;
