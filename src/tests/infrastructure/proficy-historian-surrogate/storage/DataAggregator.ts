import {
  SurrogateDataPoint,
  AggregatedData,
  AggregationType,
  BucketInterval,
  BucketKeyGenerator,
  TagIndex
} from './schemas';

/**
 * Data Aggregator
 * Provides real-time and historical aggregation calculations for time-series data
 */
export class DataAggregator {
  private aggregationCache: Map<string, CachedAggregation> = new Map();
  private rollingWindows: Map<string, RollingWindow> = new Map();

  /**
   * Calculate aggregation for a specific time range
   */
  async calculateAggregation(
    dataPoints: SurrogateDataPoint[],
    aggregationType: AggregationType,
    interval: BucketInterval,
    startTime: Date,
    endTime: Date
  ): Promise<AggregatedData[]> {
    const results: AggregatedData[] = [];

    // Group data points by time intervals
    const groupedData = this.groupDataByInterval(dataPoints, interval, startTime, endTime);

    for (const [intervalKey, points] of groupedData) {
      if (points.length === 0) continue;

      const intervalStart = this.parseIntervalKey(intervalKey, interval);
      const intervalEnd = new Date(intervalStart.getTime() + this.getIntervalDuration(interval));

      const aggregatedValue = this.computeAggregation(points, aggregationType);

      results.push({
        tagName: points[0].tagName,
        aggregationType,
        interval,
        startTime: intervalStart,
        endTime: intervalEnd,
        value: aggregatedValue.value,
        count: aggregatedValue.count,
        quality: aggregatedValue.quality,
        calculatedAt: new Date(),
        sourcePointCount: points.length
      });
    }

    return results.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  /**
   * Calculate multiple aggregation types for the same data
   */
  async calculateMultipleAggregations(
    dataPoints: SurrogateDataPoint[],
    aggregationTypes: AggregationType[],
    interval: BucketInterval,
    startTime: Date,
    endTime: Date
  ): Promise<{ [aggregationType: string]: AggregatedData[] }> {
    const results: { [aggregationType: string]: AggregatedData[] } = {};

    // Group data once and reuse for all aggregation types
    const groupedData = this.groupDataByInterval(dataPoints, interval, startTime, endTime);

    for (const aggregationType of aggregationTypes) {
      results[aggregationType] = [];

      for (const [intervalKey, points] of groupedData) {
        if (points.length === 0) continue;

        const intervalStart = this.parseIntervalKey(intervalKey, interval);
        const intervalEnd = new Date(intervalStart.getTime() + this.getIntervalDuration(interval));

        const aggregatedValue = this.computeAggregation(points, aggregationType);

        results[aggregationType].push({
          tagName: points[0].tagName,
          aggregationType,
          interval,
          startTime: intervalStart,
          endTime: intervalEnd,
          value: aggregatedValue.value,
          count: aggregatedValue.count,
          quality: aggregatedValue.quality,
          calculatedAt: new Date(),
          sourcePointCount: points.length
        });
      }

      results[aggregationType].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    }

    return results;
  }

  /**
   * Update rolling window aggregations (for real-time calculations)
   */
  updateRollingAggregations(dataPoint: SurrogateDataPoint, windowSizes: number[]): void {
    for (const windowSize of windowSizes) {
      const windowKey = `${dataPoint.tagName}_${windowSize}`;
      let window = this.rollingWindows.get(windowKey);

      if (!window) {
        window = {
          tagName: dataPoint.tagName,
          windowSize,
          dataPoints: [],
          lastUpdate: new Date(),
          aggregations: new Map()
        };
        this.rollingWindows.set(windowKey, window);
      }

      // Add new data point
      window.dataPoints.push(dataPoint);

      // Remove old data points outside the window
      const cutoffTime = new Date(dataPoint.timestamp.getTime() - windowSize);
      window.dataPoints = window.dataPoints.filter(p => p.timestamp >= cutoffTime);

      // Update aggregations
      this.updateWindowAggregations(window);
      window.lastUpdate = new Date();
    }
  }

  /**
   * Get current rolling aggregation value
   */
  getRollingAggregation(tagName: string, windowSize: number, aggregationType: AggregationType): number | null {
    const windowKey = `${tagName}_${windowSize}`;
    const window = this.rollingWindows.get(windowKey);

    if (!window || window.dataPoints.length === 0) {
      return null;
    }

    return window.aggregations.get(aggregationType) || null;
  }

  /**
   * Calculate statistical process control metrics
   */
  calculateSPCMetrics(dataPoints: SurrogateDataPoint[]): SPCMetrics {
    if (dataPoints.length === 0) {
      return {
        mean: 0,
        standardDeviation: 0,
        upperControlLimit: 0,
        lowerControlLimit: 0,
        range: 0,
        controlLimitFactor: 3
      };
    }

    const numericValues = dataPoints
      .map(p => typeof p.value === 'number' ? p.value : 0)
      .filter(v => !isNaN(v));

    if (numericValues.length === 0) {
      return {
        mean: 0,
        standardDeviation: 0,
        upperControlLimit: 0,
        lowerControlLimit: 0,
        range: 0,
        controlLimitFactor: 3
      };
    }

    const mean = this.calculateMean(numericValues);
    const standardDeviation = this.calculateStandardDeviation(numericValues, mean);
    const range = Math.max(...numericValues) - Math.min(...numericValues);
    const controlLimitFactor = 3; // 3-sigma control limits

    return {
      mean,
      standardDeviation,
      upperControlLimit: mean + (controlLimitFactor * standardDeviation),
      lowerControlLimit: mean - (controlLimitFactor * standardDeviation),
      range,
      controlLimitFactor
    };
  }

  /**
   * Calculate process capability indices
   */
  calculateProcessCapability(dataPoints: SurrogateDataPoint[], lowerSpec: number, upperSpec: number): ProcessCapability {
    const spcMetrics = this.calculateSPCMetrics(dataPoints);
    const specificationRange = upperSpec - lowerSpec;

    // Cp - Process Capability (measures precision)
    const cp = specificationRange / (6 * spcMetrics.standardDeviation);

    // Cpk - Process Capability Index (measures both precision and accuracy)
    const cpu = (upperSpec - spcMetrics.mean) / (3 * spcMetrics.standardDeviation);
    const cpl = (spcMetrics.mean - lowerSpec) / (3 * spcMetrics.standardDeviation);
    const cpk = Math.min(cpu, cpl);

    // Pp and Ppk (process performance indices)
    const numericValues = dataPoints
      .map(p => typeof p.value === 'number' ? p.value : 0)
      .filter(v => !isNaN(v));

    const overallStandardDeviation = numericValues.length > 1
      ? this.calculateStandardDeviation(numericValues, spcMetrics.mean)
      : spcMetrics.standardDeviation;

    const pp = specificationRange / (6 * overallStandardDeviation);
    const ppu = (upperSpec - spcMetrics.mean) / (3 * overallStandardDeviation);
    const ppl = (spcMetrics.mean - lowerSpec) / (3 * overallStandardDeviation);
    const ppk = Math.min(ppu, ppl);

    return {
      cp,
      cpk,
      pp,
      ppk,
      cpu,
      cpl,
      ppu,
      ppl,
      specificationRange,
      processSpread: 6 * spcMetrics.standardDeviation
    };
  }

  /**
   * Calculate trend analysis metrics
   */
  calculateTrendMetrics(dataPoints: SurrogateDataPoint[]): TrendMetrics {
    if (dataPoints.length < 2) {
      return {
        slope: 0,
        correlation: 0,
        trendDirection: 'STABLE',
        trendStrength: 'NONE'
      };
    }

    const sortedPoints = dataPoints
      .filter(p => typeof p.value === 'number')
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (sortedPoints.length < 2) {
      return {
        slope: 0,
        correlation: 0,
        trendDirection: 'STABLE',
        trendStrength: 'NONE'
      };
    }

    // Linear regression
    const regression = this.calculateLinearRegression(sortedPoints);

    // Determine trend direction
    let trendDirection: TrendDirection = 'STABLE';
    if (Math.abs(regression.slope) > 0.001) {
      trendDirection = regression.slope > 0 ? 'INCREASING' : 'DECREASING';
    }

    // Determine trend strength based on correlation coefficient
    let trendStrength: TrendStrength = 'NONE';
    const absCorrelation = Math.abs(regression.correlation);
    if (absCorrelation > 0.8) trendStrength = 'STRONG';
    else if (absCorrelation > 0.5) trendStrength = 'MODERATE';
    else if (absCorrelation > 0.3) trendStrength = 'WEAK';

    return {
      slope: regression.slope,
      correlation: regression.correlation,
      trendDirection,
      trendStrength,
      intercept: regression.intercept,
      rSquared: regression.correlation * regression.correlation
    };
  }

  /**
   * Calculate histogram data for distribution analysis
   */
  calculateHistogram(dataPoints: SurrogateDataPoint[], binCount = 20): HistogramData {
    const numericValues = dataPoints
      .map(p => typeof p.value === 'number' ? p.value : 0)
      .filter(v => !isNaN(v));

    if (numericValues.length === 0) {
      return {
        bins: [],
        binWidth: 0,
        min: 0,
        max: 0,
        totalCount: 0
      };
    }

    const min = Math.min(...numericValues);
    const max = Math.max(...numericValues);
    const binWidth = (max - min) / binCount;

    const bins: HistogramBin[] = [];

    for (let i = 0; i < binCount; i++) {
      const binStart = min + (i * binWidth);
      const binEnd = binStart + binWidth;

      const count = numericValues.filter(v =>
        v >= binStart && (i === binCount - 1 ? v <= binEnd : v < binEnd)
      ).length;

      bins.push({
        start: binStart,
        end: binEnd,
        count,
        frequency: count / numericValues.length
      });
    }

    return {
      bins,
      binWidth,
      min,
      max,
      totalCount: numericValues.length
    };
  }

  // Private helper methods

  private groupDataByInterval(
    dataPoints: SurrogateDataPoint[],
    interval: BucketInterval,
    startTime: Date,
    endTime: Date
  ): Map<string, SurrogateDataPoint[]> {
    const groups = new Map<string, SurrogateDataPoint[]>();

    for (const point of dataPoints) {
      if (point.timestamp < startTime || point.timestamp > endTime) {
        continue;
      }

      const intervalKey = BucketKeyGenerator.generateKey(point.timestamp, interval);

      if (!groups.has(intervalKey)) {
        groups.set(intervalKey, []);
      }

      groups.get(intervalKey)!.push(point);
    }

    return groups;
  }

  private computeAggregation(dataPoints: SurrogateDataPoint[], aggregationType: AggregationType): AggregationResult {
    const numericValues = dataPoints
      .map(p => typeof p.value === 'number' ? p.value : 0)
      .filter(v => !isNaN(v));

    const qualities = dataPoints.map(p => p.quality || 100);
    const averageQuality = qualities.reduce((a, b) => a + b, 0) / qualities.length;

    if (numericValues.length === 0) {
      return { value: 0, count: 0, quality: averageQuality };
    }

    let value: number;

    switch (aggregationType) {
      case AggregationType.AVERAGE:
        value = this.calculateMean(numericValues);
        break;

      case AggregationType.MINIMUM:
        value = Math.min(...numericValues);
        break;

      case AggregationType.MAXIMUM:
        value = Math.max(...numericValues);
        break;

      case AggregationType.COUNT:
        value = numericValues.length;
        break;

      case AggregationType.SUM:
        value = numericValues.reduce((a, b) => a + b, 0);
        break;

      case AggregationType.STANDARD_DEVIATION:
        const mean = this.calculateMean(numericValues);
        value = this.calculateStandardDeviation(numericValues, mean);
        break;

      case AggregationType.RANGE:
        value = Math.max(...numericValues) - Math.min(...numericValues);
        break;

      default:
        value = this.calculateMean(numericValues);
    }

    return {
      value,
      count: numericValues.length,
      quality: averageQuality
    };
  }

  private updateWindowAggregations(window: RollingWindow): void {
    if (window.dataPoints.length === 0) return;

    const aggregationTypes = [
      AggregationType.AVERAGE,
      AggregationType.MINIMUM,
      AggregationType.MAXIMUM,
      AggregationType.COUNT,
      AggregationType.STANDARD_DEVIATION
    ];

    for (const aggregationType of aggregationTypes) {
      const result = this.computeAggregation(window.dataPoints, aggregationType);
      window.aggregations.set(aggregationType, result.value);
    }
  }

  private calculateMean(values: number[]): number {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private calculateStandardDeviation(values: number[], mean?: number): number {
    const avg = mean || this.calculateMean(values);
    const squaredDiffs = values.map(value => Math.pow(value - avg, 2));
    const variance = this.calculateMean(squaredDiffs);
    return Math.sqrt(variance);
  }

  private calculateLinearRegression(dataPoints: SurrogateDataPoint[]): LinearRegression {
    const n = dataPoints.length;
    const timeValues = dataPoints.map(p => p.timestamp.getTime());
    const yValues = dataPoints.map(p => typeof p.value === 'number' ? p.value : 0);

    const sumX = timeValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = timeValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = timeValues.reduce((sum, x) => sum + x * x, 0);
    const sumYY = yValues.reduce((sum, y) => sum + y * y, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate correlation coefficient
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    const correlation = denominator === 0 ? 0 : numerator / denominator;

    return { slope, intercept, correlation };
  }

  private parseIntervalKey(intervalKey: string, interval: BucketInterval): Date {
    const parts = intervalKey.split('-').map(Number);

    switch (interval) {
      case BucketInterval.MINUTE:
        return new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], 0, 0);
      case BucketInterval.FIVE_MINUTES:
        return new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], 0, 0);
      case BucketInterval.HOUR:
        return new Date(parts[0], parts[1] - 1, parts[2], parts[3], 0, 0, 0);
      case BucketInterval.DAY:
        return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
      default:
        return new Date();
    }
  }

  private getIntervalDuration(interval: BucketInterval): number {
    switch (interval) {
      case BucketInterval.MINUTE:
        return 60 * 1000;
      case BucketInterval.FIVE_MINUTES:
        return 5 * 60 * 1000;
      case BucketInterval.HOUR:
        return 60 * 60 * 1000;
      case BucketInterval.DAY:
        return 24 * 60 * 60 * 1000;
      default:
        return 60 * 1000;
    }
  }
}

// Supporting interfaces

interface CachedAggregation {
  value: number;
  timestamp: Date;
  interval: BucketInterval;
  aggregationType: AggregationType;
}

interface RollingWindow {
  tagName: string;
  windowSize: number; // milliseconds
  dataPoints: SurrogateDataPoint[];
  lastUpdate: Date;
  aggregations: Map<AggregationType, number>;
}

interface AggregationResult {
  value: number;
  count: number;
  quality: number;
}

export interface SPCMetrics {
  mean: number;
  standardDeviation: number;
  upperControlLimit: number;
  lowerControlLimit: number;
  range: number;
  controlLimitFactor: number;
}

export interface ProcessCapability {
  cp: number;   // Process Capability
  cpk: number;  // Process Capability Index
  pp: number;   // Process Performance
  ppk: number;  // Process Performance Index
  cpu: number;  // Upper Process Capability
  cpl: number;  // Lower Process Capability
  ppu: number;  // Upper Process Performance
  ppl: number;  // Lower Process Performance
  specificationRange: number;
  processSpread: number;
}

export interface TrendMetrics {
  slope: number;
  correlation: number;
  trendDirection: TrendDirection;
  trendStrength: TrendStrength;
  intercept?: number;
  rSquared?: number;
}

export type TrendDirection = 'INCREASING' | 'DECREASING' | 'STABLE';
export type TrendStrength = 'STRONG' | 'MODERATE' | 'WEAK' | 'NONE';

interface LinearRegression {
  slope: number;
  intercept: number;
  correlation: number;
}

export interface HistogramData {
  bins: HistogramBin[];
  binWidth: number;
  min: number;
  max: number;
  totalCount: number;
}

export interface HistogramBin {
  start: number;
  end: number;
  count: number;
  frequency: number;
}

export default DataAggregator;