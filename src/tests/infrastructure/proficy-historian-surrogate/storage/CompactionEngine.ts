import {
  SurrogateDataPoint,
  TimeSeriesBucket,
  CompressionType,
  BucketStatistics
} from './schemas';

/**
 * Compaction Engine
 * Handles data compression, optimization, and cleanup for time-series storage
 */
export class CompactionEngine {
  private compressionStats: CompressionStatistics = {
    totalPointsProcessed: 0,
    totalPointsRetained: 0,
    totalBytesOriginal: 0,
    totalBytesCompressed: 0,
    compressionOperations: 0,
    lastCompression: new Date()
  };

  /**
   * Compress a time-series bucket using specified algorithm
   */
  async compressBucket(bucket: TimeSeriesBucket, compressionType: CompressionType, deviation = 0.1): Promise<CompactionResult> {
    const originalCount = bucket.dataPoints.length;
    const originalSize = this.estimateDataSize(bucket.dataPoints);

    if (originalCount === 0) {
      return {
        success: true,
        originalPointCount: 0,
        compressedPointCount: 0,
        compressionRatio: 1.0,
        spaceSaved: 0,
        compressionType,
        processingTime: 0
      };
    }

    const startTime = Date.now();
    let compressedPoints: SurrogateDataPoint[];

    try {
      switch (compressionType) {
        case CompressionType.SWINGING_DOOR:
          compressedPoints = this.swingingDoorCompression(bucket.dataPoints, deviation);
          break;

        case CompressionType.BOXCAR:
          compressedPoints = this.boxcarCompression(bucket.dataPoints, 60000); // 1 minute intervals
          break;

        case CompressionType.NONE:
        default:
          compressedPoints = [...bucket.dataPoints];
          break;
      }

      // Update bucket with compressed data
      bucket.dataPoints = compressedPoints;
      bucket.pointCount = compressedPoints.length;
      bucket.isCompressed = true;
      bucket.lastCompression = new Date();

      // Recalculate statistics
      this.updateBucketStatistics(bucket);

      const compressedSize = this.estimateDataSize(compressedPoints);
      const compressionRatio = originalSize > 0 ? compressedSize / originalSize : 1.0;
      const processingTime = Date.now() - startTime;

      // Update global stats
      this.updateCompressionStats(originalCount, compressedPoints.length, originalSize, compressedSize);

      bucket.compressionRatio = compressionRatio;

      return {
        success: true,
        originalPointCount: originalCount,
        compressedPointCount: compressedPoints.length,
        compressionRatio,
        spaceSaved: originalSize - compressedSize,
        compressionType,
        processingTime
      };

    } catch (error: any) {
      return {
        success: false,
        originalPointCount: originalCount,
        compressedPointCount: originalCount,
        compressionRatio: 1.0,
        spaceSaved: 0,
        compressionType,
        processingTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Swinging door compression algorithm
   * Removes points that fall within a tolerance corridor
   */
  private swingingDoorCompression(dataPoints: SurrogateDataPoint[], deviation: number): SurrogateDataPoint[] {
    if (dataPoints.length <= 2) {
      return [...dataPoints];
    }

    const compressed: SurrogateDataPoint[] = [];
    const sortedPoints = [...dataPoints].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Always keep the first point
    compressed.push(sortedPoints[0]);

    let anchorIndex = 0;
    let candidateIndex = 1;

    while (candidateIndex < sortedPoints.length - 1) {
      const anchor = sortedPoints[anchorIndex];
      const candidate = sortedPoints[candidateIndex];
      const next = sortedPoints[candidateIndex + 1];

      // Calculate tolerance bounds
      const anchorValue = typeof anchor.value === 'number' ? anchor.value : 0;
      const candidateValue = typeof candidate.value === 'number' ? candidate.value : 0;
      const nextValue = typeof next.value === 'number' ? next.value : 0;

      const tolerance = Math.abs(anchorValue * deviation);
      const upperBound = anchorValue + tolerance;
      const lowerBound = anchorValue - tolerance;

      // Check if the candidate point can be removed
      const slope1 = this.calculateSlope(anchor, candidate);
      const slope2 = this.calculateSlope(anchor, next);

      const interpolatedValue = anchorValue + slope1 * (next.timestamp.getTime() - anchor.timestamp.getTime()) /
                               (candidate.timestamp.getTime() - anchor.timestamp.getTime());

      const withinTolerance = nextValue >= lowerBound && nextValue <= upperBound &&
                             Math.abs(interpolatedValue - nextValue) <= tolerance;

      if (withinTolerance) {
        // Skip the candidate point
        candidateIndex++;
      } else {
        // Keep the candidate point and make it the new anchor
        compressed.push(candidate);
        anchorIndex = candidateIndex;
        candidateIndex++;
      }
    }

    // Always keep the last point
    compressed.push(sortedPoints[sortedPoints.length - 1]);

    return compressed;
  }

  /**
   * Boxcar compression algorithm
   * Averages values within fixed time intervals
   */
  private boxcarCompression(dataPoints: SurrogateDataPoint[], intervalMs: number): SurrogateDataPoint[] {
    if (dataPoints.length === 0) return [];

    const compressed: SurrogateDataPoint[] = [];
    const sortedPoints = [...dataPoints].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    let currentBucket: SurrogateDataPoint[] = [];
    let bucketStartTime = sortedPoints[0].timestamp.getTime();

    for (const point of sortedPoints) {
      const pointTime = point.timestamp.getTime();

      if (pointTime - bucketStartTime >= intervalMs) {
        // Process the current bucket
        if (currentBucket.length > 0) {
          compressed.push(this.averageDataPoints(currentBucket));
        }

        // Start new bucket
        currentBucket = [point];
        bucketStartTime = pointTime;
      } else {
        currentBucket.push(point);
      }
    }

    // Process the final bucket
    if (currentBucket.length > 0) {
      compressed.push(this.averageDataPoints(currentBucket));
    }

    return compressed;
  }

  /**
   * Deadline-driven compression for storage optimization
   */
  async deadlineCompression(buckets: TimeSeriesBucket[], targetCompressionRatio: number): Promise<CompactionSummary> {
    const summary: CompactionSummary = {
      bucketsProcessed: 0,
      bucketsCompressed: 0,
      totalPointsOriginal: 0,
      totalPointsCompressed: 0,
      totalSpaceSaved: 0,
      averageCompressionRatio: 0,
      processingTime: 0,
      errors: []
    };

    const startTime = Date.now();

    for (const bucket of buckets) {
      summary.bucketsProcessed++;
      summary.totalPointsOriginal += bucket.pointCount;

      if (bucket.isCompressed) {
        summary.totalPointsCompressed += bucket.pointCount;
        continue;
      }

      try {
        // Choose compression strategy based on data characteristics
        const compressionType = this.selectOptimalCompression(bucket);
        const deviation = this.calculateOptimalDeviation(bucket, targetCompressionRatio);

        const result = await this.compressBucket(bucket, compressionType, deviation);

        if (result.success) {
          summary.bucketsCompressed++;
          summary.totalPointsCompressed += result.compressedPointCount;
          summary.totalSpaceSaved += result.spaceSaved;
        } else {
          summary.errors.push(`Failed to compress bucket: ${result.error}`);
          summary.totalPointsCompressed += bucket.pointCount;
        }

      } catch (error: any) {
        summary.errors.push(`Error processing bucket: ${error.message}`);
        summary.totalPointsCompressed += bucket.pointCount;
      }
    }

    summary.processingTime = Date.now() - startTime;
    summary.averageCompressionRatio = summary.totalPointsOriginal > 0
      ? summary.totalPointsCompressed / summary.totalPointsOriginal
      : 1.0;

    return summary;
  }

  /**
   * Clean up old or unnecessary data
   */
  async cleanupOldData(buckets: TimeSeriesBucket[], retentionHours: number): Promise<CleanupResult> {
    const cutoffTime = new Date(Date.now() - retentionHours * 60 * 60 * 1000);
    let bucketsRemoved = 0;
    let pointsRemoved = 0;
    let spaceSaved = 0;

    const bucketsToKeep: TimeSeriesBucket[] = [];

    for (const bucket of buckets) {
      if (bucket.bucketEnd < cutoffTime) {
        // Remove entire bucket
        bucketsRemoved++;
        pointsRemoved += bucket.pointCount;
        spaceSaved += this.estimateDataSize(bucket.dataPoints);
      } else if (bucket.bucketStart < cutoffTime) {
        // Partial cleanup within bucket
        const originalCount = bucket.dataPoints.length;
        bucket.dataPoints = bucket.dataPoints.filter(p => p.timestamp >= cutoffTime);
        const removedCount = originalCount - bucket.dataPoints.length;

        pointsRemoved += removedCount;
        bucket.pointCount = bucket.dataPoints.length;

        // Update bucket statistics
        this.updateBucketStatistics(bucket);

        bucketsToKeep.push(bucket);
      } else {
        bucketsToKeep.push(bucket);
      }
    }

    return {
      bucketsRemoved,
      pointsRemoved,
      spaceSaved,
      remainingBuckets: bucketsToKeep.length,
      processingTime: 0 // Would be measured in real implementation
    };
  }

  /**
   * Optimize storage by removing redundant data
   */
  async optimizeStorage(buckets: TimeSeriesBucket[]): Promise<OptimizationResult> {
    let totalOptimizations = 0;
    let totalSpaceSaved = 0;
    const errors: string[] = [];

    for (const bucket of buckets) {
      try {
        // Remove duplicate timestamps
        const uniquePoints = this.removeDuplicateTimestamps(bucket.dataPoints);
        const duplicatesRemoved = bucket.dataPoints.length - uniquePoints.length;

        if (duplicatesRemoved > 0) {
          bucket.dataPoints = uniquePoints;
          bucket.pointCount = uniquePoints.length;
          totalOptimizations += duplicatesRemoved;
          totalSpaceSaved += duplicatesRemoved * 50; // Estimated bytes per point
          this.updateBucketStatistics(bucket);
        }

        // Remove outliers if they seem like sensor errors
        const cleanedPoints = this.removeOutliers(bucket.dataPoints);
        const outliersRemoved = bucket.dataPoints.length - cleanedPoints.length;

        if (outliersRemoved > 0) {
          bucket.dataPoints = cleanedPoints;
          bucket.pointCount = cleanedPoints.length;
          totalOptimizations += outliersRemoved;
          totalSpaceSaved += outliersRemoved * 50;
          this.updateBucketStatistics(bucket);
        }

      } catch (error: any) {
        errors.push(`Optimization error: ${error.message}`);
      }
    }

    return {
      optimizationsApplied: totalOptimizations,
      spaceSaved: totalSpaceSaved,
      errors
    };
  }

  /**
   * Get compression statistics
   */
  getCompressionStatistics(): CompressionStatistics {
    return { ...this.compressionStats };
  }

  /**
   * Reset compression statistics
   */
  resetStatistics(): void {
    this.compressionStats = {
      totalPointsProcessed: 0,
      totalPointsRetained: 0,
      totalBytesOriginal: 0,
      totalBytesCompressed: 0,
      compressionOperations: 0,
      lastCompression: new Date()
    };
  }

  // Private helper methods

  private calculateSlope(point1: SurrogateDataPoint, point2: SurrogateDataPoint): number {
    const value1 = typeof point1.value === 'number' ? point1.value : 0;
    const value2 = typeof point2.value === 'number' ? point2.value : 0;
    const timeDiff = point2.timestamp.getTime() - point1.timestamp.getTime();
    return timeDiff === 0 ? 0 : (value2 - value1) / timeDiff;
  }

  private averageDataPoints(points: SurrogateDataPoint[]): SurrogateDataPoint {
    if (points.length === 1) return points[0];

    const numericValues = points
      .map(p => typeof p.value === 'number' ? p.value : 0)
      .filter(v => !isNaN(v));

    const averageValue = numericValues.length > 0
      ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length
      : 0;

    const averageQuality = points.reduce((sum, p) => sum + (p.quality || 100), 0) / points.length;

    // Use middle timestamp
    const middleIndex = Math.floor(points.length / 2);

    return {
      tagName: points[0].tagName,
      timestamp: points[middleIndex].timestamp,
      value: averageValue,
      quality: averageQuality,
      source: 'compressed'
    };
  }

  private selectOptimalCompression(bucket: TimeSeriesBucket): CompressionType {
    // Analyze data characteristics to choose best compression
    const dataPoints = bucket.dataPoints;

    if (dataPoints.length < 10) {
      return CompressionType.NONE;
    }

    // Calculate variability
    const numericValues = dataPoints
      .map(p => typeof p.value === 'number' ? p.value : 0)
      .filter(v => !isNaN(v));

    if (numericValues.length === 0) {
      return CompressionType.NONE;
    }

    const mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
    const variance = numericValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / numericValues.length;
    const coefficientOfVariation = mean !== 0 ? Math.sqrt(variance) / Math.abs(mean) : 0;

    // High variability: use swinging door
    // Low variability: use boxcar
    return coefficientOfVariation > 0.1 ? CompressionType.SWINGING_DOOR : CompressionType.BOXCAR;
  }

  private calculateOptimalDeviation(bucket: TimeSeriesBucket, targetRatio: number): number {
    // Calculate deviation to achieve target compression ratio
    const baseDeviation = 0.05; // 5% base deviation
    const maxDeviation = 0.5;   // 50% max deviation

    // Estimate current variability
    const numericValues = bucket.dataPoints
      .map(p => typeof p.value === 'number' ? p.value : 0)
      .filter(v => !isNaN(v));

    if (numericValues.length === 0) return baseDeviation;

    const mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
    const stdDev = Math.sqrt(
      numericValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / numericValues.length
    );

    const relativeStdDev = mean !== 0 ? stdDev / Math.abs(mean) : 0;

    // Adjust deviation based on target ratio and data characteristics
    let deviation = baseDeviation + (relativeStdDev * 0.1);

    // Scale by target ratio (higher target = more compression = higher deviation)
    deviation *= (2 - targetRatio); // If target is 0.5, multiply by 1.5

    return Math.min(deviation, maxDeviation);
  }

  private removeDuplicateTimestamps(dataPoints: SurrogateDataPoint[]): SurrogateDataPoint[] {
    const seen = new Set<number>();
    return dataPoints.filter(point => {
      const timestamp = point.timestamp.getTime();
      if (seen.has(timestamp)) {
        return false;
      }
      seen.add(timestamp);
      return true;
    });
  }

  private removeOutliers(dataPoints: SurrogateDataPoint[]): SurrogateDataPoint[] {
    const numericValues = dataPoints
      .map(p => typeof p.value === 'number' ? p.value : 0)
      .filter(v => !isNaN(v));

    if (numericValues.length < 10) return dataPoints; // Not enough data for outlier detection

    // Calculate IQR-based outlier bounds
    const sorted = [...numericValues].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);
    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;

    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    // Filter out outliers
    return dataPoints.filter(point => {
      const value = typeof point.value === 'number' ? point.value : 0;
      return value >= lowerBound && value <= upperBound;
    });
  }

  private estimateDataSize(dataPoints: SurrogateDataPoint[]): number {
    // Rough estimate: 50 bytes per data point
    return dataPoints.length * 50;
  }

  private updateBucketStatistics(bucket: TimeSeriesBucket): void {
    const numericValues = bucket.dataPoints
      .map(p => typeof p.value === 'number' ? p.value : 0)
      .filter(v => !isNaN(v));

    if (numericValues.length === 0) return;

    const stats: BucketStatistics = {
      count: bucket.dataPoints.length,
      min: Math.min(...numericValues),
      max: Math.max(...numericValues),
      avg: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
      sum: numericValues.reduce((a, b) => a + b, 0),
      firstTimestamp: bucket.dataPoints[0].timestamp,
      lastTimestamp: bucket.dataPoints[bucket.dataPoints.length - 1].timestamp,
      qualityAvg: bucket.dataPoints.reduce((sum, p) => sum + (p.quality || 100), 0) / bucket.dataPoints.length
    };

    bucket.stats = stats;
  }

  private updateCompressionStats(
    originalCount: number,
    compressedCount: number,
    originalSize: number,
    compressedSize: number
  ): void {
    this.compressionStats.totalPointsProcessed += originalCount;
    this.compressionStats.totalPointsRetained += compressedCount;
    this.compressionStats.totalBytesOriginal += originalSize;
    this.compressionStats.totalBytesCompressed += compressedSize;
    this.compressionStats.compressionOperations++;
    this.compressionStats.lastCompression = new Date();
  }
}

// Supporting interfaces

export interface CompactionResult {
  success: boolean;
  originalPointCount: number;
  compressedPointCount: number;
  compressionRatio: number;
  spaceSaved: number;
  compressionType: CompressionType;
  processingTime: number;
  error?: string;
}

export interface CompactionSummary {
  bucketsProcessed: number;
  bucketsCompressed: number;
  totalPointsOriginal: number;
  totalPointsCompressed: number;
  totalSpaceSaved: number;
  averageCompressionRatio: number;
  processingTime: number;
  errors: string[];
}

export interface CleanupResult {
  bucketsRemoved: number;
  pointsRemoved: number;
  spaceSaved: number;
  remainingBuckets: number;
  processingTime: number;
}

export interface OptimizationResult {
  optimizationsApplied: number;
  spaceSaved: number;
  errors: string[];
}

export interface CompressionStatistics {
  totalPointsProcessed: number;
  totalPointsRetained: number;
  totalBytesOriginal: number;
  totalBytesCompressed: number;
  compressionOperations: number;
  lastCompression: Date;
}

export default CompactionEngine;