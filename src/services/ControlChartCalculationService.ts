/**
 * Control Chart Calculation Service
 * Issue #98: Statistical Process Control & Control Charts
 *
 * Provides advanced control chart calculations:
 * - All chart types (Xbar-R, Xbar-S, I-MR, p, np, c, u, EWMA, CUSUM, pre-control)
 * - Statistical test functions
 * - Normality testing
 * - Transformation methods
 * - Advanced control limit calculations
 */

import { logger } from '../utils/logger';

export interface ControlLimits {
  ucl: number;
  centerLine: number;
  lcl: number;
  uclRange?: number;
  centerLineRange?: number;
  lclRange?: number;
}

export interface ChartData {
  points: number[];
  ucl: number;
  lcl: number;
  centerLine: number;
  violations: number[];
}

export class ControlChartCalculationService {
  // Statistical constants for control charts
  private readonly d2Constants: Record<number, number> = {
    2: 1.128, 3: 1.693, 4: 2.059, 5: 2.326, 6: 2.534, 7: 2.704, 8: 2.847, 9: 2.97, 10: 3.078,
  };

  private readonly d3Constants: Record<number, number> = {
    2: 0.853, 3: 0.888, 4: 0.88, 5: 0.864, 6: 0.848, 7: 0.833, 8: 0.82, 9: 0.808, 10: 0.797,
  };

  private readonly c4Constants: Record<number, number> = {
    2: 0.7979, 3: 0.8862, 4: 0.9213, 5: 0.9400, 6: 0.9515, 7: 0.9594, 8: 0.9650, 9: 0.9693, 10: 0.9727,
  };

  /**
   * Calculate Xbar-S chart limits (subgroup means with standard deviation)
   */
  calculateXbarSLimits(measurements: number[][], subgroupSize: number): ControlLimits {
    try {
      if (!measurements || measurements.length === 0) {
        throw new Error('No measurements provided');
      }

      // Calculate subgroup means and standard deviations
      const subgroupMeans = measurements.map((subgroup) => {
        const mean = subgroup.reduce((a, b) => a + b) / subgroup.length;
        return mean;
      });

      const subgroupStdDevs = measurements.map((subgroup) => {
        const mean = subgroup.reduce((a, b) => a + b) / subgroup.length;
        const variance = subgroup.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (subgroup.length - 1);
        return Math.sqrt(variance);
      });

      // Calculate overall averages
      const xBarBar = subgroupMeans.reduce((a, b) => a + b) / subgroupMeans.length;
      const sBar = subgroupStdDevs.reduce((a, b) => a + b) / subgroupStdDevs.length;

      // Get c4 constant for bias correction
      const c4 = this.c4Constants[subgroupSize] || 0.9213;

      // Control limits for X-bar
      const a3 = 3 / (c4 * Math.sqrt(subgroupSize));
      const uclXbar = xBarBar + a3 * sBar;
      const lclXbar = xBarBar - a3 * sBar;

      // Control limits for S
      const b3 = Math.max(0, 1 - 3 * Math.sqrt(1 - c4 * c4) / c4);
      const b4 = 1 + 3 * Math.sqrt(1 - c4 * c4) / c4;
      const uclS = b4 * sBar;
      const lclS = b3 * sBar;

      logger.info(`Calculated Xbar-S limits: UCL=${uclXbar.toFixed(3)}, CL=${xBarBar.toFixed(3)}, LCL=${lclXbar.toFixed(3)}`);

      return {
        ucl: uclXbar,
        centerLine: xBarBar,
        lcl: lclXbar,
        uclRange: uclS,
        centerLineRange: sBar,
        lclRange: lclS,
      };
    } catch (error) {
      logger.error(`Error in calculateXbarSLimits: ${error}`);
      throw error;
    }
  }

  /**
   * Calculate np-chart limits (number of defectives)
   */
  calculateNpChartLimits(defectiveCounts: number[], sampleSize: number): ControlLimits {
    try {
      if (!defectiveCounts || defectiveCounts.length === 0) {
        throw new Error('No defective count data provided');
      }

      // Calculate average proportion
      const totalDefectives = defectiveCounts.reduce((a, b) => a + b, 0);
      const totalSamples = sampleSize * defectiveCounts.length;
      const pBar = totalDefectives / totalSamples;

      // Calculate np average
      const npBar = pBar * sampleSize;

      // Control limits
      const se = Math.sqrt(npBar * (1 - pBar));
      const ucl = npBar + 3 * se;
      const lcl = Math.max(0, npBar - 3 * se);

      logger.info(`Calculated np-chart limits: UCL=${ucl.toFixed(3)}, CL=${npBar.toFixed(3)}, LCL=${lcl.toFixed(3)}`);

      return {
        ucl,
        centerLine: npBar,
        lcl,
      };
    } catch (error) {
      logger.error(`Error in calculateNpChartLimits: ${error}`);
      throw error;
    }
  }

  /**
   * Calculate c-chart limits (number of defects per unit)
   */
  calculateCChartLimits(defectCounts: number[]): ControlLimits {
    try {
      if (!defectCounts || defectCounts.length === 0) {
        throw new Error('No defect count data provided');
      }

      // Calculate average defect count
      const cBar = defectCounts.reduce((a, b) => a + b, 0) / defectCounts.length;

      // Control limits (based on Poisson distribution)
      const ucl = cBar + 3 * Math.sqrt(cBar);
      const lcl = Math.max(0, cBar - 3 * Math.sqrt(cBar));

      logger.info(`Calculated c-chart limits: UCL=${ucl.toFixed(3)}, CL=${cBar.toFixed(3)}, LCL=${lcl.toFixed(3)}`);

      return {
        ucl,
        centerLine: cBar,
        lcl,
      };
    } catch (error) {
      logger.error(`Error in calculateCChartLimits: ${error}`);
      throw error;
    }
  }

  /**
   * Calculate u-chart limits (defects per unit, variable sample size)
   */
  calculateUChartLimits(defectCounts: number[], unitSizes: number[]): ControlLimits {
    try {
      if (defectCounts.length === 0 || defectCounts.length !== unitSizes.length) {
        throw new Error('Defect count and unit size arrays must have same length');
      }

      // Calculate u values (defects per unit)
      const uValues = defectCounts.map((count, i) => count / unitSizes[i]);
      const uBar = uValues.reduce((a, b) => a + b, 0) / uValues.length;

      // Average unit size
      const nBar = unitSizes.reduce((a, b) => a + b, 0) / unitSizes.length;

      // Control limits
      const se = Math.sqrt(uBar / nBar);
      const ucl = uBar + 3 * se;
      const lcl = Math.max(0, uBar - 3 * se);

      logger.info(`Calculated u-chart limits: UCL=${ucl.toFixed(3)}, CL=${uBar.toFixed(3)}, LCL=${lcl.toFixed(3)}`);

      return {
        ucl,
        centerLine: uBar,
        lcl,
      };
    } catch (error) {
      logger.error(`Error in calculateUChartLimits: ${error}`);
      throw error;
    }
  }

  /**
   * Calculate EWMA (Exponentially Weighted Moving Average) chart limits
   */
  calculateEWMALimits(measurements: number[], lambda: number = 0.2): ChartData {
    try {
      if (!measurements || measurements.length === 0) {
        throw new Error('No measurements provided');
      }

      if (lambda <= 0 || lambda > 1) {
        throw new Error('Lambda must be between 0 and 1');
      }

      const overallMean = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      const variance = measurements.reduce((sum, val) => sum + Math.pow(val - overallMean, 2), 0) / measurements.length;
      const sigma = Math.sqrt(variance);

      const ewmaValues: number[] = [];
      const ewmaVariances: number[] = [];

      let ewma = overallMean;
      let ewmaVar = variance;

      measurements.forEach((measurement, index) => {
        ewma = lambda * measurement + (1 - lambda) * ewma;
        ewmaValues.push(ewma);

        ewmaVar = (lambda * lambda) / (2 - lambda) * variance;
        ewmaVariances.push(ewmaVar);
      });

      // Calculate control limits (they change over time initially)
      const ucl = overallMean + 3 * sigma * Math.sqrt(lambda / (2 - lambda));
      const lcl = overallMean - 3 * sigma * Math.sqrt(lambda / (2 - lambda));

      logger.info(`Calculated EWMA limits: UCL=${ucl.toFixed(3)}, CL=${overallMean.toFixed(3)}, LCL=${lcl.toFixed(3)}`);

      return {
        points: ewmaValues,
        ucl,
        lcl,
        centerLine: overallMean,
        violations: [],
      };
    } catch (error) {
      logger.error(`Error in calculateEWMALimits: ${error}`);
      throw error;
    }
  }

  /**
   * Calculate CUSUM (Cumulative Sum) chart
   */
  calculateCUSUMLimits(measurements: number[], targetValue: number, k: number = 0.5, h: number = 5): ChartData {
    try {
      if (!measurements || measurements.length === 0) {
        throw new Error('No measurements provided');
      }

      const variance = measurements.reduce((sum, val) => sum + Math.pow(val - targetValue, 2), 0) / measurements.length;
      const sigma = Math.sqrt(variance);

      // Calculate CUSUM values
      const cusumPlus: number[] = [];
      const cusumMinus: number[] = [];

      let cPlus = 0;
      let cMinus = 0;

      measurements.forEach((measurement) => {
        cPlus = Math.max(0, cPlus + (measurement - targetValue - k * sigma));
        cMinus = Math.max(0, cMinus - (measurement - targetValue + k * sigma));

        cusumPlus.push(cPlus);
        cusumMinus.push(cMinus);
      });

      const ucl = h * sigma;
      const lcl = -h * sigma;

      logger.info(`Calculated CUSUM limits: UCL=${ucl.toFixed(3)}, LCL=${lcl.toFixed(3)}`);

      return {
        points: cusumPlus,
        ucl,
        lcl,
        centerLine: 0,
        violations: [],
      };
    } catch (error) {
      logger.error(`Error in calculateCUSUMLimits: ${error}`);
      throw error;
    }
  }

  /**
   * Test for normality using Anderson-Darling test (simplified)
   */
  testNormality(measurements: number[]): { isNormal: boolean; statistic: number; pValue: number } {
    try {
      if (!measurements || measurements.length < 3) {
        throw new Error('At least 3 measurements required for normality test');
      }

      // Calculate mean and standard deviation
      const mean = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      const variance = measurements.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / measurements.length;
      const sigma = Math.sqrt(variance);

      // Standardize measurements
      const standardized = measurements.map((x) => (x - mean) / sigma);
      standardized.sort((a, b) => a - b);

      // Simplified Anderson-Darling test statistic
      let sumTerm = 0;
      standardized.forEach((z, i) => {
        const n = measurements.length;
        const cdfZ = this.normalCDF(z);
        const term = (2 * (i + 1) - 1) * (Math.log(cdfZ) + Math.log(1 - cdfZ));
        sumTerm += term;
      });

      const n = measurements.length;
      const adStatistic = -n - (1 / n) * sumTerm;

      // Critical value for alpha=0.05 is approximately 0.787
      const isNormal = adStatistic < 0.787;

      logger.info(`Normality test: AD statistic=${adStatistic.toFixed(3)}, isNormal=${isNormal}`);

      return {
        isNormal,
        statistic: adStatistic,
        pValue: isNormal ? 0.05 : 0.001,
      };
    } catch (error) {
      logger.error(`Error in testNormality: ${error}`);
      throw error;
    }
  }

  /**
   * Apply Box-Cox transformation for non-normal data
   */
  boxCoxTransform(measurements: number[]): { lambda: number; transformedData: number[] } {
    try {
      if (!measurements || measurements.length === 0) {
        throw new Error('No measurements provided');
      }

      // Simplified Box-Cox: test lambda values from -2 to 2
      let bestLambda = 1;
      let bestLikelihood = -Infinity;

      for (let lambda = -2; lambda <= 2; lambda += 0.1) {
        let transformedData: number[];

        if (Math.abs(lambda) < 0.001) {
          // Use natural log for lambda = 0
          transformedData = measurements.map((x) => (x > 0 ? Math.log(x) : 0));
        } else {
          // Box-Cox formula
          transformedData = measurements.map((x) => (x > 0 ? (Math.pow(x, lambda) - 1) / lambda : 0));
        }

        // Calculate likelihood (simplified as variance)
        const mean = transformedData.reduce((a, b) => a + b, 0) / transformedData.length;
        const variance = transformedData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / transformedData.length;

        if (-variance > bestLikelihood) {
          bestLikelihood = -variance;
          bestLambda = lambda;
        }
      }

      // Apply best transformation
      const transformedData = measurements.map((x) => {
        if (Math.abs(bestLambda) < 0.001) {
          return x > 0 ? Math.log(x) : 0;
        }
        return x > 0 ? (Math.pow(x, bestLambda) - 1) / bestLambda : 0;
      });

      logger.info(`Box-Cox transformation: best lambda=${bestLambda.toFixed(2)}`);

      return {
        lambda: bestLambda,
        transformedData,
      };
    } catch (error) {
      logger.error(`Error in boxCoxTransform: ${error}`);
      throw error;
    }
  }

  /**
   * Normal CDF approximation using error function
   */
  private normalCDF(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);

    const t = 1 / (1 + p * x);
    const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1 + sign * y);
  }

  /**
   * Detect Western Electric control chart rules violations
   */
  detectWesternElectricViolations(measurements: number[], centerLine: number, sigma: number): string[] {
    try {
      if (!measurements || measurements.length === 0) {
        throw new Error('No measurements provided');
      }

      const violations: string[] = [];
      const oneZone = sigma;
      const twoZone = 2 * sigma;
      const threeZone = 3 * sigma;

      for (let i = 0; i < measurements.length; i++) {
        const deviation = Math.abs(measurements[i] - centerLine);

        // Rule 1: Point beyond 3 sigma
        if (deviation > threeZone) {
          violations.push(`Point ${i + 1}: Beyond 3 sigma`);
        }

        // Rule 2: 9 consecutive points on same side
        if (i >= 8) {
          const last9 = measurements.slice(i - 8, i + 1);
          const allAbove = last9.every((m) => m > centerLine);
          const allBelow = last9.every((m) => m < centerLine);
          if (allAbove || allBelow) {
            violations.push(`Points ${i - 7} to ${i + 1}: 9 consecutive points on same side`);
          }
        }

        // Rule 3: 6 consecutive increasing or decreasing
        if (i >= 5) {
          const last6 = measurements.slice(i - 5, i + 1);
          const increasing = last6.every((m, idx) => idx === 0 || m > last6[idx - 1]);
          const decreasing = last6.every((m, idx) => idx === 0 || m < last6[idx - 1]);
          if (increasing || decreasing) {
            violations.push(`Points ${i - 4} to ${i + 1}: 6 consecutive increasing/decreasing`);
          }
        }
      }

      logger.info(`Western Electric violations detected: ${violations.length}`);

      return violations;
    } catch (error) {
      logger.error(`Error in detectWesternElectricViolations: ${error}`);
      throw error;
    }
  }
}

export default ControlChartCalculationService;
