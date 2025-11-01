import { PrismaClient, SPCChartType, LimitCalculationMethod, SPCConfiguration } from '@prisma/client';
import { mean, standardDeviation, quantile } from 'simple-statistics';
import { createLogger } from '../utils/logger';

const logger = createLogger('SPCService');

/**
 * Control Limit Results
 */
export interface ControlLimits {
  UCL: number; // Upper Control Limit
  centerLine: number; // Process mean or median
  LCL: number; // Lower Control Limit
  rangeUCL?: number; // For range charts (R-chart)
  rangeCL?: number; // Range center line
  rangeLCL?: number; // Range lower control limit
  sigma: number; // Standard deviation
}

/**
 * Capability Indices
 */
export interface CapabilityIndices {
  Cp: number; // Process capability
  Cpk: number; // Process capability index (accounts for centering)
  Pp: number; // Process performance
  Ppk: number; // Process performance index
  Cpm?: number; // Taguchi capability index (if target is specified)
}

/**
 * Western Electric Rule Violation
 */
export interface RuleViolation {
  ruleNumber: number;
  ruleName: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  description: string;
  dataPointIndices: number[];
  values: number[];
}

/**
 * Statistical Process Control Service
 *
 * Implements SPC calculations including:
 * - Control limit calculations for various chart types
 * - Western Electric Rules (8 rules)
 * - Process capability indices (Cp, Cpk, Pp, Ppk, Cpm)
 */
export class SPCService {
  private prisma: PrismaClient;

  // Constants for control chart calculations
  private readonly D3_FACTORS = [0, 0, 0, 0, 0, 0, 0.076, 0.136, 0.184, 0.223, 0.256];
  private readonly D4_FACTORS = [0, 0, 3.267, 2.574, 2.282, 2.114, 2.004, 1.924, 1.864, 1.816, 1.777];
  private readonly A2_FACTORS = [0, 0, 1.880, 1.023, 0.729, 0.577, 0.483, 0.419, 0.373, 0.337, 0.308];
  private readonly A3_FACTORS = [0, 0, 2.659, 1.954, 1.628, 1.427, 1.287, 1.182, 1.099, 1.032, 0.975];
  private readonly d2_FACTORS = [0, 0, 1.128, 1.693, 2.059, 2.326, 2.534, 2.704, 2.847, 2.970, 3.078];

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Calculate control limits for X-bar and R chart
   */
  async calculateXBarRLimits(
    subgroups: number[][],
    specLimits?: { USL?: number; LSL?: number; target?: number }
  ): Promise<ControlLimits> {
    // Validation
    if (subgroups.length === 0) {
      throw new Error('No subgroups provided for control limit calculation');
    }

    if (subgroups.length < 2) {
      throw new Error('Minimum 2 subgroups required for X-bar R chart');
    }

    const subgroupSize = subgroups[0].length;
    if (subgroupSize < 2) {
      throw new Error('Subgroup size must be at least 2');
    }

    if (subgroupSize > 10) {
      throw new Error('Subgroup size must be between 2 and 10');
    }

    // Validate all subgroups have consistent sizes
    const inconsistentSubgroup = subgroups.find(sg => sg.length !== subgroupSize);
    if (inconsistentSubgroup) {
      throw new Error(`All subgroups must have consistent size. Expected ${subgroupSize} but found ${inconsistentSubgroup.length}`);
    }

    // Calculate subgroup means and ranges
    const subgroupMeans = subgroups.map(sg => mean(sg));
    const subgroupRanges = subgroups.map(sg => Math.max(...sg) - Math.min(...sg));

    // Calculate process mean and average range
    const xBarBar = mean(subgroupMeans);
    const rBar = mean(subgroupRanges);

    // Get control chart constants
    const A2 = this.A2_FACTORS[subgroupSize];
    const D3 = this.D3_FACTORS[subgroupSize];
    const D4 = this.D4_FACTORS[subgroupSize];
    const d2 = this.d2_FACTORS[subgroupSize];

    // Calculate control limits for X-bar chart
    const UCL = xBarBar + A2 * rBar;
    const LCL = xBarBar - A2 * rBar;

    // Calculate control limits for R chart
    const rangeUCL = D4 * rBar;
    const rangeCL = rBar;
    const rangeLCL = D3 * rBar;

    // Estimate process standard deviation
    const sigma = rBar / d2;

    logger.debug('X-bar R limits calculated', {
      subgroups: subgroups.length,
      subgroupSize,
      xBarBar,
      rBar,
      UCL,
      LCL,
      sigma,
    });

    return {
      UCL,
      centerLine: xBarBar,
      LCL,
      rangeUCL,
      rangeCL,
      rangeLCL,
      sigma,
    };
  }

  /**
   * Calculate control limits for X-bar and S chart
   */
  async calculateXBarSLimits(
    subgroups: number[][],
    specLimits?: { USL?: number; LSL?: number; target?: number }
  ): Promise<ControlLimits> {
    if (subgroups.length === 0) {
      throw new Error('No subgroups provided for control limit calculation');
    }

    const subgroupSize = subgroups[0].length;
    if (subgroupSize < 2) {
      throw new Error('Subgroup size must be at least 2');
    }

    // Calculate subgroup means and standard deviations
    const subgroupMeans = subgroups.map(sg => mean(sg));
    const subgroupStdDevs = subgroups.map(sg => standardDeviation(sg));

    // Calculate process mean and average standard deviation
    const xBarBar = mean(subgroupMeans);
    const sBar = mean(subgroupStdDevs);

    // Get control chart constants (using approximations for n > 10)
    const c4 = this.calculateC4(subgroupSize);
    const A3 = subgroupSize <= 10 ? this.A3_FACTORS[subgroupSize] : 3 / (c4 * Math.sqrt(subgroupSize));

    // Calculate control limits for X-bar chart
    const UCL = xBarBar + A3 * sBar;
    const LCL = xBarBar - A3 * sBar;

    // Estimate process standard deviation
    const sigma = sBar / c4;

    logger.debug('X-bar S limits calculated', {
      subgroups: subgroups.length,
      subgroupSize,
      xBarBar,
      sBar,
      UCL,
      LCL,
      sigma,
    });

    return {
      UCL,
      centerLine: xBarBar,
      LCL,
      sigma,
    };
  }

  /**
   * Calculate control limits for Individual and Moving Range (I-MR) chart
   */
  async calculateIMRLimits(
    individuals: number[],
    movingRangeSpan: number = 2
  ): Promise<ControlLimits> {
    // Validation
    if (individuals.length < 4) {
      throw new Error('Minimum 4 data points required for I-MR chart');
    }

    if (individuals.length < movingRangeSpan) {
      throw new Error(`At least ${movingRangeSpan} data points required for I-MR chart with moving range span ${movingRangeSpan}`);
    }

    // Calculate process mean
    const xBar = mean(individuals);

    // Calculate moving ranges
    const movingRanges: number[] = [];
    for (let i = 0; i < individuals.length - (movingRangeSpan - 1); i++) {
      const span = individuals.slice(i, i + movingRangeSpan);
      const range = Math.max(...span) - Math.min(...span);
      movingRanges.push(range);
    }

    const mR = mean(movingRanges);

    // Constants for moving range of 2
    const d2 = 1.128;
    const D3 = 0;
    const D4 = 3.267;

    // Estimate process standard deviation
    const sigma = mR / d2;

    // Calculate control limits for individuals chart
    const UCL = xBar + 3 * sigma;
    const LCL = xBar - 3 * sigma;

    // Calculate control limits for moving range chart
    const rangeUCL = D4 * mR;
    const rangeCL = mR;
    const rangeLCL = D3 * mR;

    logger.debug('I-MR limits calculated', {
      individuals: individuals.length,
      xBar,
      mR,
      UCL,
      LCL,
      sigma,
    });

    return {
      UCL,
      centerLine: xBar,
      LCL,
      rangeUCL,
      rangeCL,
      rangeLCL,
      sigma,
    };
  }

  /**
   * Calculate control limits for P-chart (proportion defective)
   */
  async calculatePChartLimits(
    defectCounts: number[],
    sampleSizes: number[]
  ): Promise<ControlLimits> {
    // Validation
    if (defectCounts.length !== sampleSizes.length) {
      throw new Error('Defect counts and sample sizes arrays must have same length');
    }

    if (defectCounts.length === 0) {
      throw new Error('No data provided for P-chart calculation');
    }

    // Validate all values are non-negative
    const negativeDefect = defectCounts.find(d => d < 0);
    if (negativeDefect !== undefined) {
      throw new Error('Defect counts cannot be negative');
    }

    const negativeSample = sampleSizes.find(s => s < 0);
    if (negativeSample !== undefined) {
      throw new Error('Sample sizes cannot be negative');
    }

    // Validate defect counts don't exceed sample sizes
    for (let i = 0; i < defectCounts.length; i++) {
      if (defectCounts[i] > sampleSizes[i]) {
        throw new Error(`Defect count (${defectCounts[i]}) cannot exceed sample size (${sampleSizes[i]}) at index ${i}`);
      }
    }

    // Calculate proportions
    const proportions = defectCounts.map((d, i) => d / sampleSizes[i]);

    // Calculate average proportion (p-bar)
    const totalDefects = defectCounts.reduce((sum, d) => sum + d, 0);
    const totalSamples = sampleSizes.reduce((sum, n) => sum + n, 0);
    const pBar = totalDefects / totalSamples;

    // Calculate average sample size
    const nBar = mean(sampleSizes);

    // Calculate control limits
    const sigma = Math.sqrt((pBar * (1 - pBar)) / nBar);
    const UCL = pBar + 3 * sigma;
    const LCL = Math.max(0, pBar - 3 * sigma); // Can't be negative

    logger.debug('P-chart limits calculated', {
      samples: defectCounts.length,
      pBar,
      nBar,
      UCL,
      LCL,
    });

    return {
      UCL,
      centerLine: pBar,
      LCL,
      sigma,
    };
  }

  /**
   * Calculate control limits for C-chart (count of defects)
   */
  async calculateCChartLimits(defectCounts: number[]): Promise<ControlLimits> {
    // Validation
    if (defectCounts.length === 0) {
      throw new Error('No defect counts provided');
    }

    if (defectCounts.length < 2) {
      throw new Error('Minimum 2 data points required for C-chart');
    }

    // Validate all values are non-negative
    const negativeDefect = defectCounts.find(d => d < 0);
    if (negativeDefect !== undefined) {
      throw new Error('Defect counts cannot be negative');
    }

    // Calculate average defects per unit (c-bar)
    const cBar = mean(defectCounts);

    // For Poisson distribution, sigma = sqrt(lambda) = sqrt(cBar)
    const sigma = Math.sqrt(cBar);

    // Calculate control limits
    const UCL = cBar + 3 * sigma;
    const LCL = Math.max(0, cBar - 3 * sigma); // Can't be negative

    logger.debug('C-chart limits calculated', {
      samples: defectCounts.length,
      cBar,
      UCL,
      LCL,
    });

    return {
      UCL,
      centerLine: cBar,
      LCL,
      sigma,
    };
  }

  /**
   * Calculate process capability indices
   */
  calculateCapabilityIndices(
    data: number[],
    USL?: number,
    LSL?: number,
    target?: number
  ): CapabilityIndices | null {
    // Validation
    if (data.length < 3) {
      throw new Error('At least 3 data points required for capability analysis');
    }

    if (!USL && !LSL) {
      throw new Error('At least one specification limit (USL or LSL) required');
    }

    // Validate USL > LSL if both are provided
    if (USL !== undefined && LSL !== undefined && USL <= LSL) {
      throw new Error(`Upper specification limit (${USL}) must be greater than lower specification limit (${LSL})`);
    }

    const mu = mean(data);
    const sigma = standardDeviation(data);

    // Handle zero or near-zero variation (perfect process)
    // Return very large values (999) instead of Infinity to avoid JSON serialization issues
    if (sigma === 0 || sigma < 0.0001) {
      return {
        Cp: 999,
        Cpk: 999,
        Pp: 999,
        Ppk: 999,
        Cpm: target !== undefined ? 999 : undefined,
      };
    }

    let Cp = 0;
    let Cpk = 0;
    let Pp = 0;
    let Ppk = 0;

    // Cp = (USL - LSL) / (6 * sigma)
    if (USL !== undefined && LSL !== undefined) {
      Cp = (USL - LSL) / (6 * sigma);
      Pp = Cp; // For long-term performance, use overall standard deviation
    }

    // Cpk = min[(USL - mu) / (3 * sigma), (mu - LSL) / (3 * sigma)]
    if (USL !== undefined && LSL !== undefined) {
      const cpkUpper = (USL - mu) / (3 * sigma);
      const cpkLower = (mu - LSL) / (3 * sigma);
      Cpk = Math.min(cpkUpper, cpkLower);
      Ppk = Cpk;
    } else if (USL !== undefined) {
      Cpk = (USL - mu) / (3 * sigma);
      Ppk = Cpk;
    } else if (LSL !== undefined) {
      Cpk = (mu - LSL) / (3 * sigma);
      Ppk = Cpk;
    }

    // Cpm (Taguchi index) - only if target is specified
    let Cpm: number | undefined;
    if (target !== undefined && USL !== undefined && LSL !== undefined) {
      const tau = Math.sqrt(sigma ** 2 + (mu - target) ** 2);
      Cpm = (USL - LSL) / (6 * tau);
    }

    logger.debug('Capability indices calculated', {
      dataPoints: data.length,
      mu,
      sigma,
      Cp,
      Cpk,
      Pp,
      Ppk,
      Cpm,
    });

    return {
      Cp,
      Cpk,
      Pp,
      Ppk,
      Cpm,
    };
  }

  /**
   * Calculate c4 constant for unbiasing standard deviation
   */
  private calculateC4(n: number): number {
    if (n <= 1) return 1;

    // Approximation for c4
    // c4 = 4(n-1) / (4n - 3)
    // More accurate: use gamma function, but approximation is sufficient for n >= 2
    if (n === 2) return 0.7979;
    if (n === 3) return 0.8862;
    if (n === 4) return 0.9213;
    if (n === 5) return 0.9400;
    if (n === 6) return 0.9515;
    if (n === 7) return 0.9594;
    if (n === 8) return 0.9650;
    if (n === 9) return 0.9693;
    if (n === 10) return 0.9727;

    // For n > 10, use approximation
    return 4 * (n - 1) / (4 * n - 3);
  }

  /**
   * Create or update SPC configuration
   */
  async createSPCConfiguration(
    parameterId: string,
    chartType: SPCChartType,
    subgroupSize: number | null,
    historicalData: number[],
    options?: {
      USL?: number;
      LSL?: number;
      targetValue?: number;
      limitsBasedOn?: LimitCalculationMethod;
      historicalDataDays?: number;
      enabledRules?: number[];
      ruleSensitivity?: string;
      enableCapability?: boolean;
      confidenceLevel?: number;
      isActive?: boolean;
    },
    createdBy: string = 'system'
  ): Promise<SPCConfiguration> {
    // Extract options with defaults
    const {
      USL,
      LSL,
      targetValue,
      limitsBasedOn = 'HISTORICAL_DATA' as LimitCalculationMethod,
      historicalDataDays = 30,
      enabledRules = [1, 2, 3, 4, 5, 6, 7, 8],
      ruleSensitivity = 'NORMAL',
      enableCapability = true,
      confidenceLevel = 0.95,
      isActive = true,
    } = options || {};
    // Calculate control limits based on chart type (only if historical data is available)
    let limits: ControlLimits | null = null;

    // Only calculate limits if we have sufficient historical data
    if (historicalData && historicalData.length > 0) {
      try {
        switch (chartType) {
          case 'I_MR':
            if (historicalData.length >= 4) {
              limits = await this.calculateIMRLimits(historicalData);
            }
            break;

          case 'P_CHART':
          case 'NP_CHART':
          case 'C_CHART':
          case 'U_CHART':
            if (historicalData.length >= 2) {
              // For attribute charts, use simple mean-based limits
              const chartMean = mean(historicalData);
              const chartSigma = standardDeviation(historicalData);
              limits = {
                UCL: chartMean + 3 * chartSigma,
                centerLine: chartMean,
                LCL: Math.max(0, chartMean - 3 * chartSigma),
                sigma: chartSigma,
              };
            }
            break;

          case 'X_BAR_R':
          case 'X_BAR_S':
          case 'EWMA':
          case 'CUSUM':
          default:
            if (historicalData.length >= 2) {
              // For these charts, we need subgroups - use placeholder for now
              const overallMean = mean(historicalData);
              const overallSigma = standardDeviation(historicalData);
              limits = {
                UCL: overallMean + 3 * overallSigma,
                centerLine: overallMean,
                LCL: overallMean - 3 * overallSigma,
                sigma: overallSigma,
              };
            }
            break;
        }
      } catch (error: any) {
        logger.warn('Could not calculate control limits with provided historical data', {
          chartType,
          dataPoints: historicalData.length,
          error: error.message,
        });
        limits = null;
      }
    }

    // Check if configuration already exists
    const existing = await this.prisma.sPCConfiguration.findUnique({
      where: { parameterId },
    });

    if (existing) {
      // Update existing configuration
      return await this.prisma.sPCConfiguration.update({
        where: { parameterId },
        data: {
          chartType,
          subgroupSize,
          UCL: limits?.UCL ?? null,
          centerLine: limits?.centerLine ?? null,
          LCL: limits?.LCL ?? null,
          rangeUCL: limits?.rangeUCL ?? null,
          rangeCL: limits?.rangeCL ?? null,
          rangeLCL: limits?.rangeLCL ?? null,
          USL,
          LSL,
          targetValue,
          limitsBasedOn,
          historicalDataDays,
          lastCalculatedAt: limits ? new Date() : null,
          enabledRules,
          ruleSensitivity,
          enableCapability,
          confidenceLevel,
          isActive,
          lastModifiedBy: createdBy,
        },
      });
    } else {
      // Create new configuration
      return await this.prisma.sPCConfiguration.create({
        data: {
          parameterId,
          chartType,
          subgroupSize,
          UCL: limits?.UCL ?? null,
          centerLine: limits?.centerLine ?? null,
          LCL: limits?.LCL ?? null,
          rangeUCL: limits?.rangeUCL ?? null,
          rangeCL: limits?.rangeCL ?? null,
          rangeLCL: limits?.rangeLCL ?? null,
          USL,
          LSL,
          targetValue,
          limitsBasedOn,
          historicalDataDays,
          lastCalculatedAt: limits ? new Date() : null,
          enabledRules,
          ruleSensitivity,
          enableCapability,
          confidenceLevel,
          isActive,
          createdBy,
        },
      });
    }
  }

  /**
   * Get SPC configuration by parameter ID
   */
  async getSPCConfiguration(parameterId: string): Promise<SPCConfiguration | null> {
    return await this.prisma.sPCConfiguration.findUnique({
      where: { parameterId },
      include: {
        parameter: true,
      },
    });
  }

  /**
   * Update SPC configuration
   */
  async updateSPCConfiguration(
    parameterId: string,
    updates: Partial<SPCConfiguration>,
    userId: string
  ): Promise<SPCConfiguration> {
    // Remove fields that shouldn't be updated directly
    const { id, parameterId: _, createdBy, createdAt, ...updateData } = updates as any;

    return await this.prisma.sPCConfiguration.update({
      where: { parameterId },
      data: {
        ...updateData,
        lastModifiedBy: userId,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete SPC configuration
   */
  async deleteSPCConfiguration(parameterId: string): Promise<void> {
    await this.prisma.sPCConfiguration.delete({
      where: { parameterId },
    });
    logger.info('SPC configuration deleted', { parameterId });
  }

  /**
   * List all SPC configurations
   */
  async listSPCConfigurations(filters?: { isActive?: boolean; chartType?: SPCChartType }) {
    return await this.prisma.sPCConfiguration.findMany({
      where: filters,
      include: {
        parameter: {
          include: {
            operation: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

// Lazy-loaded singleton for backward compatibility
// This pattern allows tests to mock Prisma before the service is instantiated
let _spcServiceInstance: SPCService | null = null;

export function getSPCService(): SPCService {
  if (!_spcServiceInstance) {
    _spcServiceInstance = new SPCService();
  }
  return _spcServiceInstance;
}

// For backward compatibility with existing code that imports spcService directly
export const spcService = new Proxy(
  {},
  {
    get: (target, prop) => {
      return (getSPCService() as any)[prop];
    },
  }
) as any as SPCService;
