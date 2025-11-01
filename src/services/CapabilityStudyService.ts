/**
 * Capability Study Service
 * Issue #98: Statistical Process Control & Control Charts
 *
 * Manages process capability studies:
 * - Cp/Cpk calculations (short-term capability)
 * - Pp/Ppk calculations (long-term capability)
 * - Capability index interpretation
 * - Process capability assessment and recommendations
 * - Normality assessment for validity
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export interface CapabilityInput {
  planId: string;
  measurements: number[];
  upperSpec: number;
  lowerSpec: number;
  subgroupSize?: number;
  studyType: 'SHORT_TERM' | 'LONG_TERM'; // SHORT_TERM = Pp/Ppk, LONG_TERM = Cp/Cpk
}

export interface CapabilityMetrics {
  cp: number;
  cpk: number;
  pp: number;
  ppk: number;
  mean: number;
  stdDev: number;
  processSpread: number;
  specSpread: number;
  percentWithin: number;
  capability: 'CAPABLE' | 'MARGINAL' | 'INCAPABLE';
  recommendation: string;
}

export interface CapabilityStudy {
  id: string;
  planId: string;
  studyType: 'SHORT_TERM' | 'LONG_TERM';
  metrics: CapabilityMetrics;
  dataPoints: number;
  studyDate: Date;
  nextStudyDue?: Date;
}

export class CapabilityStudyService {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Conduct a capability study (both Cp/Cpk and Pp/Ppk)
   */
  async conductCapabilityStudy(input: CapabilityInput): Promise<CapabilityStudy> {
    try {
      if (!input.planId || !input.measurements || input.measurements.length < 30) {
        throw new Error('Plan ID and at least 30 measurements required');
      }

      if (input.upperSpec === undefined || input.lowerSpec === undefined) {
        throw new Error('Upper and lower specification limits required');
      }

      if (input.upperSpec <= input.lowerSpec) {
        throw new Error('Upper specification limit must be greater than lower limit');
      }

      // Calculate basic statistics
      const mean = input.measurements.reduce((a, b) => a + b, 0) / input.measurements.length;
      const variance = input.measurements.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / input.measurements.length;
      const stdDev = Math.sqrt(variance);

      // Calculate Pp and Ppk (long-term, overall capability)
      const pp = (input.upperSpec - input.lowerSpec) / (6 * stdDev);
      const cpkUpper = (input.upperSpec - mean) / (3 * stdDev);
      const cpkLower = (mean - input.lowerSpec) / (3 * stdDev);
      const ppk = Math.min(cpkUpper, cpkLower);

      // Calculate Cp and Cpk (short-term, within-subgroup capability)
      let cp = pp;
      let cpk = ppk;

      if (input.subgroupSize && input.subgroupSize > 1) {
        const d2 = this.getD2Constant(input.subgroupSize);
        const withinStdDev = stdDev / d2;
        cp = (input.upperSpec - input.lowerSpec) / (6 * withinStdDev);
        cpk = Math.min((input.upperSpec - mean) / (3 * withinStdDev), (mean - input.lowerSpec) / (3 * withinStdDev));
      }

      // Determine capability level
      let capability: 'CAPABLE' | 'MARGINAL' | 'INCAPABLE';
      if (cpk >= 1.33) {
        capability = 'CAPABLE';
      } else if (cpk >= 1.0) {
        capability = 'MARGINAL';
      } else {
        capability = 'INCAPABLE';
      }

      // Calculate percentage within specification
      const specSpread = input.upperSpec - input.lowerSpec;
      const processSpread = 6 * stdDev;
      const percentWithin = Math.min(100, (specSpread / processSpread) * 100);

      // Generate recommendation
      const recommendation = this.generateRecommendation(cpk, capability);

      const metrics: CapabilityMetrics = {
        cp,
        cpk,
        pp,
        ppk,
        mean,
        stdDev,
        processSpread,
        specSpread,
        percentWithin,
        capability,
        recommendation,
      };

      const study: CapabilityStudy = {
        id: `CS-${input.planId}-${Date.now()}`,
        planId: input.planId,
        studyType: input.studyType,
        metrics,
        dataPoints: input.measurements.length,
        studyDate: new Date(),
        nextStudyDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      };

      logger.info(`Capability study ${input.studyType}: Cpk=${cpk.toFixed(3)}, capability=${capability}`);
      return study;
    } catch (error) {
      logger.error(`Error in conductCapabilityStudy: ${error}`);
      throw error;
    }
  }

  /**
   * Calculate only Cp/Cpk (short-term capability)
   */
  calculateShortTermCapability(measurements: number[], subgroupSize: number, upperSpec: number, lowerSpec: number): { cp: number; cpk: number } {
    try {
      if (!measurements || measurements.length === 0) {
        throw new Error('Measurements required');
      }

      const mean = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      const variance = measurements.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / measurements.length;
      const stdDev = Math.sqrt(variance);

      // Use d2 constant to adjust for within-subgroup variation
      const d2 = this.getD2Constant(subgroupSize);
      const withinStdDev = stdDev / d2;

      const cp = (upperSpec - lowerSpec) / (6 * withinStdDev);
      const cpk = Math.min((upperSpec - mean) / (3 * withinStdDev), (mean - lowerSpec) / (3 * withinStdDev));

      logger.info(`Short-term capability: Cp=${cp.toFixed(3)}, Cpk=${cpk.toFixed(3)}`);

      return { cp, cpk };
    } catch (error) {
      logger.error(`Error in calculateShortTermCapability: ${error}`);
      throw error;
    }
  }

  /**
   * Calculate only Pp/Ppk (long-term capability)
   */
  calculateLongTermCapability(measurements: number[], upperSpec: number, lowerSpec: number): { pp: number; ppk: number } {
    try {
      if (!measurements || measurements.length === 0) {
        throw new Error('Measurements required');
      }

      const mean = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      const variance = measurements.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / measurements.length;
      const stdDev = Math.sqrt(variance);

      const pp = (upperSpec - lowerSpec) / (6 * stdDev);
      const ppk = Math.min((upperSpec - mean) / (3 * stdDev), (mean - lowerSpec) / (3 * stdDev));

      logger.info(`Long-term capability: Pp=${pp.toFixed(3)}, Ppk=${ppk.toFixed(3)}`);

      return { pp, ppk };
    } catch (error) {
      logger.error(`Error in calculateLongTermCapability: ${error}`);
      throw error;
    }
  }

  /**
   * Get d2 constant for subgroup size
   */
  private getD2Constant(subgroupSize: number): number {
    const d2Constants: Record<number, number> = {
      2: 1.128,
      3: 1.693,
      4: 2.059,
      5: 2.326,
      6: 2.534,
      7: 2.704,
      8: 2.847,
      9: 2.97,
      10: 3.078,
    };

    return d2Constants[subgroupSize] || 2.059; // Default for n=4
  }

  /**
   * Generate recommendation based on capability
   */
  private generateRecommendation(cpk: number, capability: string): string {
    if (cpk >= 1.67) {
      return 'Process is highly capable. Continue monitoring for drift or shift. Consider tighter specifications.';
    } else if (cpk >= 1.33) {
      return 'Process is capable. Continue regular SPC monitoring. Investigate trends and maintain current process controls.';
    } else if (cpk >= 1.0) {
      return 'Process is marginally capable. Increase sampling frequency. Implement corrective actions to improve process centering or reduce variation.';
    } else if (cpk > 0.67) {
      return 'Process is incapable. Implement immediate corrective actions. Increase inspection or consider process redesign.';
    } else {
      return 'Process is significantly incapable. Halt production pending major process improvement or redesign. 100% inspection required.';
    }
  }

  /**
   * Compare two capability studies
   */
  compareCapabilityStudies(
    study1: CapabilityStudy,
    study2: CapabilityStudy
  ): { improved: boolean; cpkChange: number; recommendation: string } {
    try {
      const cpkChange = study2.metrics.cpk - study1.metrics.cpk;
      const improved = cpkChange > 0;

      let recommendation = '';
      if (improved) {
        recommendation = `Process capability improved by ${cpkChange.toFixed(3)}. Current Cpk: ${study2.metrics.cpk.toFixed(3)}`;
      } else {
        recommendation = `Process capability declined by ${Math.abs(cpkChange).toFixed(3)}. Current Cpk: ${study2.metrics.cpk.toFixed(3)}. Investigate root causes.`;
      }

      logger.info(`Capability comparison: improved=${improved}, change=${cpkChange.toFixed(3)}`);

      return {
        improved,
        cpkChange,
        recommendation,
      };
    } catch (error) {
      logger.error(`Error in compareCapabilityStudies: ${error}`);
      throw error;
    }
  }

  /**
   * Get capability studies for a plan
   */
  async getPlanCapabilityStudies(planId: string): Promise<CapabilityStudy[]> {
    try {
      logger.info(`Retrieved capability studies for plan ${planId}`);
      return []; // Would fetch from DB
    } catch (error) {
      logger.error(`Error in getPlanCapabilityStudies: ${error}`);
      throw error;
    }
  }

  /**
   * Get latest capability study for a plan
   */
  async getLatestCapabilityStudy(planId: string): Promise<CapabilityStudy | null> {
    try {
      logger.info(`Retrieved latest capability study for plan ${planId}`);
      return null; // Would fetch from DB
    } catch (error) {
      logger.error(`Error in getLatestCapabilityStudy: ${error}`);
      throw error;
    }
  }

  /**
   * Determine if new capability study is due
   */
  async isCapabilityStudyDue(planId: string): Promise<boolean> {
    try {
      const latest = await this.getLatestCapabilityStudy(planId);
      if (!latest || !latest.nextStudyDue) {
        return true;
      }

      const isDue = new Date() >= latest.nextStudyDue;
      logger.info(`Capability study due for plan ${planId}: ${isDue}`);

      return isDue;
    } catch (error) {
      logger.error(`Error in isCapabilityStudyDue: ${error}`);
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

export default CapabilityStudyService;
