import { SurrogateDataPoint } from '../storage/schemas';

/**
 * Trend Generator
 * Generates long-term trends, seasonal patterns, and cyclic behaviors
 */
export class TrendGenerator {
  private startTime: number;
  private trends: Map<string, TrendDefinition> = new Map();

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Define a trend for a specific tag
   */
  defineTrend(tagName: string, trendDefinition: TrendDefinition): void {
    this.trends.set(tagName, trendDefinition);
  }

  /**
   * Generate trend-influenced data point
   */
  generateTrendData(tagName: string, baseValue: number, timestamp: Date): SurrogateDataPoint {
    const trend = this.trends.get(tagName);
    if (!trend) {
      return {
        tagName,
        timestamp,
        value: baseValue,
        quality: 100
      };
    }

    const trendValue = this.calculateTrendValue(trend, timestamp);
    const adjustedValue = this.applyTrendToValue(baseValue, trendValue, trend);

    return {
      tagName,
      timestamp,
      value: adjustedValue,
      quality: 100
    };
  }

  /**
   * Generate equipment degradation trend
   */
  generateDegradationTrend(equipmentId: string, parameter: string, initialValue: number, degradationRate: number): TrendDefinition {
    return {
      type: 'LINEAR',
      duration: 365 * 24 * 60 * 60 * 1000, // 1 year
      startValue: 0,
      endValue: initialValue * degradationRate,
      influence: 'ADDITIVE',
      noiseLevel: 0.05,
      description: `Equipment degradation for ${equipmentId} ${parameter}`
    };
  }

  /**
   * Generate seasonal temperature trend
   */
  generateSeasonalTrend(baselineTemp: number, seasonalVariation: number): TrendDefinition {
    return {
      type: 'SINUSOIDAL',
      duration: 365 * 24 * 60 * 60 * 1000, // 1 year cycle
      amplitude: seasonalVariation,
      phase: -Math.PI / 2, // Start at winter (minimum)
      offset: baselineTemp,
      influence: 'OVERRIDE',
      noiseLevel: 0.1,
      description: 'Seasonal temperature variation'
    };
  }

  /**
   * Generate daily production cycle
   */
  generateDailyProductionCycle(peakHours: number[], efficiency: number): TrendDefinition {
    return {
      type: 'MULTI_SINUSOIDAL',
      cycles: [
        {
          duration: 24 * 60 * 60 * 1000, // 24 hours
          amplitude: efficiency * 0.3,
          phase: 0,
          offset: efficiency
        },
        {
          duration: 8 * 60 * 60 * 1000, // 8 hour work shifts
          amplitude: efficiency * 0.2,
          phase: Math.PI / 4,
          offset: 0
        }
      ],
      influence: 'MULTIPLICATIVE',
      noiseLevel: 0.05,
      description: 'Daily production efficiency cycle'
    };
  }

  /**
   * Generate tool wear progression
   */
  generateToolWearTrend(toolLife: number, wearRate: 'LINEAR' | 'EXPONENTIAL'): TrendDefinition {
    return {
      type: wearRate === 'LINEAR' ? 'LINEAR' : 'EXPONENTIAL',
      duration: toolLife * 60 * 1000, // Tool life in minutes
      startValue: 0,
      endValue: 1, // Normalized wear (0 = new, 1 = worn out)
      growthRate: wearRate === 'EXPONENTIAL' ? 0.001 : undefined,
      influence: 'ADDITIVE',
      noiseLevel: 0.02,
      description: `Tool wear progression (${wearRate.toLowerCase()})`
    };
  }

  /**
   * Generate process drift trend
   */
  generateProcessDriftTrend(driftRate: number, maxDrift: number): TrendDefinition {
    return {
      type: 'RANDOM_WALK',
      stepSize: driftRate,
      bounds: { min: -maxDrift, max: maxDrift },
      resetProbability: 0.001, // 0.1% chance to reset per step
      influence: 'ADDITIVE',
      noiseLevel: 0.03,
      description: 'Process parameter drift'
    };
  }

  /**
   * Generate equipment warm-up curve
   */
  generateWarmupCurve(warmupTime: number, finalValue: number): TrendDefinition {
    return {
      type: 'EXPONENTIAL_APPROACH',
      duration: warmupTime * 60 * 1000, // Warmup time in minutes
      startValue: 0,
      endValue: finalValue,
      timeConstant: warmupTime * 0.3, // 30% of warmup time
      influence: 'ADDITIVE',
      noiseLevel: 0.05,
      description: 'Equipment warm-up curve'
    };
  }

  /**
   * Generate maintenance cycle effect
   */
  generateMaintenanceCycle(maintenanceInterval: number, improvementFactor: number): TrendDefinition {
    return {
      type: 'SAWTOOTH',
      duration: maintenanceInterval * 24 * 60 * 60 * 1000, // Interval in days
      amplitude: improvementFactor,
      direction: 'FALLING', // Performance degrades until maintenance
      influence: 'MULTIPLICATIVE',
      noiseLevel: 0.02,
      description: 'Maintenance cycle effect on performance'
    };
  }

  /**
   * Generate production batch variation
   */
  generateBatchVariation(batchSize: number, variationFactor: number): TrendDefinition {
    return {
      type: 'STEP_FUNCTION',
      stepDuration: batchSize * 60 * 1000, // Batch duration in minutes
      stepHeight: variationFactor,
      randomization: 0.3,
      influence: 'MULTIPLICATIVE',
      noiseLevel: 0.04,
      description: 'Batch-to-batch variation'
    };
  }

  // Private helper methods

  private calculateTrendValue(trend: TrendDefinition, timestamp: Date): number {
    const elapsedTime = timestamp.getTime() - this.startTime;

    switch (trend.type) {
      case 'LINEAR':
        return this.calculateLinearTrend(trend, elapsedTime);

      case 'SINUSOIDAL':
        return this.calculateSinusoidalTrend(trend, elapsedTime);

      case 'MULTI_SINUSOIDAL':
        return this.calculateMultiSinusoidalTrend(trend, elapsedTime);

      case 'EXPONENTIAL':
        return this.calculateExponentialTrend(trend, elapsedTime);

      case 'EXPONENTIAL_APPROACH':
        return this.calculateExponentialApproachTrend(trend, elapsedTime);

      case 'RANDOM_WALK':
        return this.calculateRandomWalkTrend(trend, elapsedTime);

      case 'SAWTOOTH':
        return this.calculateSawtoothTrend(trend, elapsedTime);

      case 'STEP_FUNCTION':
        return this.calculateStepFunctionTrend(trend, elapsedTime);

      default:
        return 0;
    }
  }

  private calculateLinearTrend(trend: TrendDefinition, elapsedTime: number): number {
    const progress = Math.min(elapsedTime / trend.duration, 1);
    const value = trend.startValue! + (trend.endValue! - trend.startValue!) * progress;
    return this.addNoise(value, trend.noiseLevel);
  }

  private calculateSinusoidalTrend(trend: TrendDefinition, elapsedTime: number): number {
    const cycles = elapsedTime / trend.duration;
    const phase = trend.phase || 0;
    const value = trend.offset! + trend.amplitude! * Math.sin(2 * Math.PI * cycles + phase);
    return this.addNoise(value, trend.noiseLevel);
  }

  private calculateMultiSinusoidalTrend(trend: TrendDefinition, elapsedTime: number): number {
    let totalValue = 0;

    for (const cycle of trend.cycles!) {
      const cycles = elapsedTime / cycle.duration;
      const value = cycle.offset + cycle.amplitude * Math.sin(2 * Math.PI * cycles + cycle.phase);
      totalValue += value;
    }

    return this.addNoise(totalValue, trend.noiseLevel);
  }

  private calculateExponentialTrend(trend: TrendDefinition, elapsedTime: number): number {
    const timeInSeconds = elapsedTime / 1000;
    const value = trend.startValue! * Math.exp(trend.growthRate! * timeInSeconds);
    const clampedValue = Math.min(value, trend.endValue!);
    return this.addNoise(clampedValue, trend.noiseLevel);
  }

  private calculateExponentialApproachTrend(trend: TrendDefinition, elapsedTime: number): number {
    const timeConstantMs = trend.timeConstant! * 1000;
    const exponentialFactor = 1 - Math.exp(-elapsedTime / timeConstantMs);
    const value = trend.startValue! + (trend.endValue! - trend.startValue!) * exponentialFactor;
    return this.addNoise(value, trend.noiseLevel);
  }

  private calculateRandomWalkTrend(trend: TrendDefinition, elapsedTime: number): number {
    // Simple random walk implementation
    // In a real implementation, this would maintain state
    const steps = Math.floor(elapsedTime / 60000); // Steps per minute
    let value = 0;

    for (let i = 0; i < steps; i++) {
      const step = (Math.random() - 0.5) * 2 * trend.stepSize!;
      value += step;

      // Apply bounds if specified
      if (trend.bounds) {
        value = Math.max(trend.bounds.min, Math.min(trend.bounds.max, value));
      }

      // Random reset
      if (Math.random() < trend.resetProbability!) {
        value = 0;
      }
    }

    return this.addNoise(value, trend.noiseLevel);
  }

  private calculateSawtoothTrend(trend: TrendDefinition, elapsedTime: number): number {
    const cycleProgress = (elapsedTime % trend.duration) / trend.duration;
    let value: number;

    if (trend.direction === 'FALLING') {
      value = trend.amplitude! * (1 - cycleProgress);
    } else {
      value = trend.amplitude! * cycleProgress;
    }

    return this.addNoise(value, trend.noiseLevel);
  }

  private calculateStepFunctionTrend(trend: TrendDefinition, elapsedTime: number): number {
    const stepNumber = Math.floor(elapsedTime / trend.stepDuration!);
    let stepValue = trend.stepHeight!;

    // Add randomization if specified
    if (trend.randomization) {
      const randomFactor = 1 + (Math.random() - 0.5) * 2 * trend.randomization;
      stepValue *= randomFactor;
    }

    // Alternate step direction
    if (stepNumber % 2 === 1) {
      stepValue *= -1;
    }

    return this.addNoise(stepValue, trend.noiseLevel);
  }

  private applyTrendToValue(baseValue: number, trendValue: number, trend: TrendDefinition): number {
    switch (trend.influence) {
      case 'ADDITIVE':
        return baseValue + trendValue;

      case 'MULTIPLICATIVE':
        return baseValue * (1 + trendValue);

      case 'OVERRIDE':
        return trendValue;

      default:
        return baseValue;
    }
  }

  private addNoise(value: number, noiseLevel: number): number {
    if (noiseLevel === 0) return value;

    const noise = (Math.random() - 0.5) * 2 * value * noiseLevel;
    return value + noise;
  }

  /**
   * Get predefined trends for common manufacturing scenarios
   */
  static getCommonTrends(): { [key: string]: TrendDefinition } {
    return {
      seasonalTemperature: {
        type: 'SINUSOIDAL',
        duration: 365 * 24 * 60 * 60 * 1000,
        amplitude: 15,
        phase: -Math.PI / 2,
        offset: 20,
        influence: 'ADDITIVE',
        noiseLevel: 0.1,
        description: 'Seasonal ambient temperature variation'
      },

      toolWear: {
        type: 'EXPONENTIAL',
        duration: 8 * 60 * 60 * 1000,
        startValue: 0,
        endValue: 1,
        growthRate: 0.0002,
        influence: 'ADDITIVE',
        noiseLevel: 0.02,
        description: 'Progressive tool wear'
      },

      dailyEfficiency: {
        type: 'SINUSOIDAL',
        duration: 24 * 60 * 60 * 1000,
        amplitude: 0.15,
        phase: 0,
        offset: 0.85,
        influence: 'MULTIPLICATIVE',
        noiseLevel: 0.03,
        description: 'Daily efficiency variation'
      },

      maintenanceCycle: {
        type: 'SAWTOOTH',
        duration: 30 * 24 * 60 * 60 * 1000,
        amplitude: 0.2,
        direction: 'FALLING',
        influence: 'MULTIPLICATIVE',
        noiseLevel: 0.02,
        description: 'Monthly maintenance cycle'
      }
    };
  }
}

/**
 * Trend definition interface
 */
export interface TrendDefinition {
  type: 'LINEAR' | 'SINUSOIDAL' | 'MULTI_SINUSOIDAL' | 'EXPONENTIAL' | 'EXPONENTIAL_APPROACH' |
        'RANDOM_WALK' | 'SAWTOOTH' | 'STEP_FUNCTION';
  duration: number; // Duration in milliseconds

  // Linear trend parameters
  startValue?: number;
  endValue?: number;

  // Sinusoidal trend parameters
  amplitude?: number;
  phase?: number;
  offset?: number;

  // Multi-sinusoidal parameters
  cycles?: Array<{
    duration: number;
    amplitude: number;
    phase: number;
    offset: number;
  }>;

  // Exponential parameters
  growthRate?: number;
  timeConstant?: number;

  // Random walk parameters
  stepSize?: number;
  bounds?: { min: number; max: number };
  resetProbability?: number;

  // Sawtooth parameters
  direction?: 'RISING' | 'FALLING';

  // Step function parameters
  stepDuration?: number;
  stepHeight?: number;
  randomization?: number;

  // General parameters
  influence: 'ADDITIVE' | 'MULTIPLICATIVE' | 'OVERRIDE';
  noiseLevel: number;
  description: string;
}

export default TrendGenerator;