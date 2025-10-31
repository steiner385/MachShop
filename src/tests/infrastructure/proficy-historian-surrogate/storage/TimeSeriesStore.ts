import {
  SurrogateDataPoint,
  TimeSeriesBucket,
  TagIndex,
  BucketInterval,
  BucketKeyGenerator,
  StorageConfiguration,
  DEFAULT_STORAGE_CONFIG,
  TimeSeriesQuery,
  QueryResult,
  WriteResult,
  WriteError,
  WriteErrorCode,
  StorageHealth,
  AggregatedData,
  AggregationType,
  BucketStatistics
} from './schemas';

/**
 * In-memory time-series data storage engine
 * Optimized for testing scenarios with efficient querying and aggregation
 */
export class TimeSeriesStore {
  private config: StorageConfiguration;
  private tagIndexes: Map<string, TagIndex> = new Map();
  private maintenanceTimer: NodeJS.Timeout | null = null;
  private compressionTimer: NodeJS.Timeout | null = null;

  // Performance metrics
  private totalWrites = 0;
  private totalReads = 0;
  private totalDataPoints = 0;
  private startTime = Date.now();
  private lastWriteTime = new Date();
  private lastReadTime = new Date();

  constructor(config: Partial<StorageConfiguration> = {}) {
    this.config = { ...DEFAULT_STORAGE_CONFIG, ...config };
    console.log('TimeSeriesStore initialized with config:', this.config);
  }

  /**
   * Write data points to the store
   */
  async writeDataPoints(dataPoints: SurrogateDataPoint[]): Promise<WriteResult> {
    const startTime = Date.now();
    const result: WriteResult = {
      success: false,
      pointsWritten: 0,
      pointsFailed: 0,
      errors: [],
      warnings: [],
      executionTime: 0,
      throughput: 0
    };

    try {
      // Check storage limits
      if (this.totalDataPoints + dataPoints.length > this.config.maxDataPoints) {
        throw new Error(`Storage limit exceeded. Max: ${this.config.maxDataPoints}, Current: ${this.totalDataPoints}`);
      }

      // Process each data point
      for (const dataPoint of dataPoints) {
        try {
          await this.writeDataPoint(dataPoint);
          result.pointsWritten++;
          this.totalDataPoints++;
        } catch (error: any) {
          result.pointsFailed++;
          result.errors.push({
            tagName: dataPoint.tagName,
            timestamp: dataPoint.timestamp,
            error: error.message,
            errorCode: this.categorizeWriteError(error.message)
          });
        }
      }

      result.success = result.pointsWritten > 0;
      result.executionTime = Date.now() - startTime;
      result.throughput = result.pointsWritten / (result.executionTime / 1000);

      this.totalWrites++;
      this.lastWriteTime = new Date();

      console.log(`Wrote ${result.pointsWritten}/${dataPoints.length} data points in ${result.executionTime}ms`);
      return result;

    } catch (error: any) {
      result.pointsFailed = dataPoints.length;
      result.errors.push({
        tagName: 'bulk_write',
        timestamp: new Date(),
        error: error.message,
        errorCode: WriteErrorCode.STORAGE_FULL
      });
      result.executionTime = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Write a single data point
   */
  private async writeDataPoint(dataPoint: SurrogateDataPoint): Promise<void> {
    // Validate data point
    this.validateDataPoint(dataPoint);

    // Get or create tag index
    let tagIndex = this.tagIndexes.get(dataPoint.tagName);
    if (!tagIndex) {
      tagIndex = this.createTagIndex(dataPoint.tagName);
      this.tagIndexes.set(dataPoint.tagName, tagIndex);
    }

    // Determine bucket for this timestamp
    const bucketKey = BucketKeyGenerator.generateKey(dataPoint.timestamp, BucketInterval.FIVE_MINUTES);
    let bucket = tagIndex.buckets.get(bucketKey);

    if (!bucket) {
      bucket = this.createBucket(dataPoint.tagName, dataPoint.timestamp, BucketInterval.FIVE_MINUTES);
      tagIndex.buckets.set(bucketKey, bucket);
    }

    // Add data point to bucket
    bucket.dataPoints.push(dataPoint);
    bucket.pointCount++;

    // Update bucket statistics
    this.updateBucketStatistics(bucket, dataPoint);

    // Update tag index metadata
    tagIndex.totalPoints++;
    tagIndex.lastWrite = new Date();
    tagIndex.writeCount++;

    // Check if bucket needs compression
    if (this.config.compressionEnabled &&
        bucket.pointCount >= this.config.compressionThreshold &&
        !bucket.isCompressed) {
      await this.compressBucket(bucket);
    }

    // Update aggregations if enabled
    if (this.config.enablePreAggregation) {
      await this.updateAggregations(dataPoint.tagName, dataPoint.timestamp);
    }
  }

  /**
   * Query time-series data
   */
  async queryData(query: TimeSeriesQuery): Promise<QueryResult> {
    const startTime = Date.now();
    const result: QueryResult = {
      success: false,
      dataPoints: [],
      recordCount: 0,
      totalRecords: 0,
      executionTime: 0,
      fromCache: false,
      warnings: []
    };

    try {
      // Validate query
      this.validateQuery(query);

      const allDataPoints: SurrogateDataPoint[] = [];

      // Query each tag
      for (const tagName of query.tagNames) {
        const tagIndex = this.tagIndexes.get(tagName);
        if (!tagIndex) {
          result.warnings.push(`Tag not found: ${tagName}`);
          continue;
        }

        // Get data points for this tag in the time range
        const tagDataPoints = await this.queryTagData(tagIndex, query);
        allDataPoints.push(...tagDataPoints);

        // Update tag statistics
        tagIndex.readCount++;
        tagIndex.lastRead = new Date();
      }

      // Sort by timestamp
      allDataPoints.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // Apply filtering and sampling
      const filteredPoints = this.applyFiltering(allDataPoints, query);
      const sampledPoints = this.applySampling(filteredPoints, query);

      // Apply result limits
      const limitedPoints = query.maxResults
        ? sampledPoints.slice(0, query.maxResults)
        : sampledPoints;

      result.dataPoints = limitedPoints;
      result.recordCount = limitedPoints.length;
      result.totalRecords = allDataPoints.length;
      result.success = true;
      result.executionTime = Date.now() - startTime;

      this.totalReads++;
      this.lastReadTime = new Date();

      console.log(`Queried ${result.recordCount} data points for ${query.tagNames.length} tags in ${result.executionTime}ms`);
      return result;

    } catch (error: any) {
      result.error = error.message;
      result.executionTime = Date.now() - startTime;
      console.error('Query failed:', error.message);
      return result;
    }
  }

  /**
   * Query aggregated data
   */
  async queryAggregatedData(
    tagNames: string[],
    startTime: Date,
    endTime: Date,
    aggregationType: AggregationType,
    interval: BucketInterval
  ): Promise<QueryResult> {
    const queryStartTime = Date.now();
    const result: QueryResult = {
      success: false,
      dataPoints: [],
      aggregatedData: [],
      recordCount: 0,
      totalRecords: 0,
      executionTime: 0,
      fromCache: false,
      warnings: []
    };

    try {
      const aggregatedData: AggregatedData[] = [];

      for (const tagName of tagNames) {
        const tagIndex = this.tagIndexes.get(tagName);
        if (!tagIndex) {
          result.warnings.push(`Tag not found: ${tagName}`);
          continue;
        }

        // Check for pre-computed aggregations
        const precomputed = this.getPrecomputedAggregation(
          tagIndex, aggregationType, interval, startTime, endTime
        );

        if (precomputed.length > 0) {
          aggregatedData.push(...precomputed);
        } else {
          // Compute aggregation on-the-fly
          const computed = await this.computeAggregation(
            tagIndex, aggregationType, interval, startTime, endTime
          );
          aggregatedData.push(...computed);
        }
      }

      result.aggregatedData = aggregatedData;
      result.recordCount = aggregatedData.length;
      result.success = true;
      result.executionTime = Date.now() - queryStartTime;

      console.log(`Computed ${result.recordCount} aggregated values in ${result.executionTime}ms`);
      return result;

    } catch (error: any) {
      result.error = error.message;
      result.executionTime = Date.now() - queryStartTime;
      return result;
    }
  }

  /**
   * Get latest values for tags
   */
  async getLatestValues(tagNames: string[]): Promise<QueryResult> {
    const startTime = Date.now();
    const latestPoints: SurrogateDataPoint[] = [];

    for (const tagName of tagNames) {
      const tagIndex = this.tagIndexes.get(tagName);
      if (!tagIndex) continue;

      // Find the latest data point across all buckets
      let latestPoint: SurrogateDataPoint | null = null;
      let latestTimestamp = 0;

      for (const bucket of tagIndex.buckets.values()) {
        for (const point of bucket.dataPoints) {
          if (point.timestamp.getTime() > latestTimestamp) {
            latestTimestamp = point.timestamp.getTime();
            latestPoint = point;
          }
        }
      }

      if (latestPoint) {
        latestPoints.push(latestPoint);
      }
    }

    return {
      success: true,
      dataPoints: latestPoints,
      recordCount: latestPoints.length,
      totalRecords: latestPoints.length,
      executionTime: Date.now() - startTime,
      fromCache: false,
      warnings: []
    };
  }

  /**
   * Get storage health status
   */
  getHealthStatus(): StorageHealth {
    const now = Date.now();
    const uptime = now - this.startTime;

    return {
      healthy: true,
      uptime,
      totalTags: this.tagIndexes.size,
      totalDataPoints: this.totalDataPoints,
      memoryUsage: this.calculateMemoryUsage(),
      memoryUtilization: this.calculateMemoryUsage() / (this.config.maxMemoryUsage || 256 * 1024 * 1024),
      writesPerSecond: this.calculateWriteRate(),
      readsPerSecond: this.calculateReadRate(),
      averageWriteLatency: 5, // Placeholder
      averageReadLatency: 10, // Placeholder
      compressionRatio: this.calculateCompressionRatio(),
      compressedBuckets: this.countCompressedBuckets(),
      writeErrors: 0, // Track these in real implementation
      readErrors: 0,
      lastCleanup: new Date(),
      lastCompression: new Date()
    };
  }

  /**
   * Start maintenance processes
   */
  startMaintenance(): void {
    // Cleanup old data
    this.maintenanceTimer = setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupInterval * 60 * 1000);

    // Compression process
    if (this.config.compressionEnabled) {
      this.compressionTimer = setInterval(() => {
        this.performCompression();
      }, this.config.compressionInterval * 60 * 1000);
    }

    console.log('TimeSeriesStore maintenance processes started');
  }

  /**
   * Stop maintenance processes
   */
  stopMaintenance(): void {
    if (this.maintenanceTimer) {
      clearInterval(this.maintenanceTimer);
      this.maintenanceTimer = null;
    }

    if (this.compressionTimer) {
      clearInterval(this.compressionTimer);
      this.compressionTimer = null;
    }

    console.log('TimeSeriesStore maintenance processes stopped');
  }

  /**
   * Clear all data
   */
  async clear(): Promise<void> {
    this.tagIndexes.clear();
    this.totalDataPoints = 0;
    this.totalWrites = 0;
    this.totalReads = 0;
    console.log('TimeSeriesStore cleared');
  }

  // Private helper methods

  private validateDataPoint(dataPoint: SurrogateDataPoint): void {
    if (!dataPoint.tagName || typeof dataPoint.tagName !== 'string') {
      throw new Error('Invalid tag name');
    }

    if (!(dataPoint.timestamp instanceof Date) || isNaN(dataPoint.timestamp.getTime())) {
      throw new Error('Invalid timestamp');
    }

    if (dataPoint.value === undefined || dataPoint.value === null) {
      throw new Error('Invalid value');
    }

    if (dataPoint.quality !== undefined &&
        (typeof dataPoint.quality !== 'number' || dataPoint.quality < 0 || dataPoint.quality > 100)) {
      throw new Error('Invalid quality value');
    }
  }

  private validateQuery(query: TimeSeriesQuery): void {
    if (!query.tagNames || query.tagNames.length === 0) {
      throw new Error('No tags specified');
    }

    if (!(query.startTime instanceof Date) || !(query.endTime instanceof Date)) {
      throw new Error('Invalid time range');
    }

    if (query.startTime >= query.endTime) {
      throw new Error('Start time must be before end time');
    }
  }

  private createTagIndex(tagName: string): TagIndex {
    return {
      tagName,
      dataType: 'Float', // Will be determined from first data point
      buckets: new Map(),
      aggregations: new Map(),
      totalPoints: 0,
      memoryUsage: 0,
      lastWrite: new Date(),
      lastRead: new Date(),
      writeCount: 0,
      readCount: 0,
      compressionSavings: 0
    };
  }

  private createBucket(tagName: string, timestamp: Date, interval: BucketInterval): TimeSeriesBucket {
    return {
      tagName,
      bucketStart: BucketKeyGenerator.getBucketStart(timestamp, interval),
      bucketEnd: BucketKeyGenerator.getBucketEnd(timestamp, interval),
      interval,
      dataPoints: [],
      pointCount: 0,
      stats: {
        count: 0,
        min: Number.MAX_VALUE,
        max: Number.MIN_VALUE,
        avg: 0,
        sum: 0,
        firstTimestamp: timestamp,
        lastTimestamp: timestamp,
        qualityAvg: 100
      },
      isCompressed: false,
      compressionRatio: 1.0,
      lastCompression: new Date()
    };
  }

  private updateBucketStatistics(bucket: TimeSeriesBucket, dataPoint: SurrogateDataPoint): void {
    const numericValue = typeof dataPoint.value === 'number' ? dataPoint.value : 0;
    const quality = dataPoint.quality || 100;

    const stats = bucket.stats;
    stats.count++;
    stats.min = Math.min(stats.min, numericValue);
    stats.max = Math.max(stats.max, numericValue);
    stats.sum += numericValue;
    stats.avg = stats.sum / stats.count;
    stats.lastTimestamp = dataPoint.timestamp;
    stats.qualityAvg = ((stats.qualityAvg * (stats.count - 1)) + quality) / stats.count;
  }

  private async queryTagData(tagIndex: TagIndex, query: TimeSeriesQuery): Promise<SurrogateDataPoint[]> {
    const dataPoints: SurrogateDataPoint[] = [];

    // Iterate through relevant buckets
    for (const bucket of tagIndex.buckets.values()) {
      // Check if bucket overlaps with query time range
      if (bucket.bucketEnd < query.startTime || bucket.bucketStart > query.endTime) {
        continue;
      }

      // Extract data points within the time range
      for (const point of bucket.dataPoints) {
        if (point.timestamp >= query.startTime && point.timestamp <= query.endTime) {
          dataPoints.push(point);
        }
      }
    }

    return dataPoints;
  }

  private applyFiltering(dataPoints: SurrogateDataPoint[], query: TimeSeriesQuery): SurrogateDataPoint[] {
    let filtered = dataPoints;

    // Quality filtering
    if (query.qualityFilter) {
      filtered = filtered.filter(point => {
        const quality = point.quality || 100;
        return quality >= (query.qualityFilter!.minQuality || 0) &&
               quality <= (query.qualityFilter!.maxQuality || 100);
      });
    }

    // Value filtering
    if (query.valueFilter) {
      filtered = filtered.filter(point => {
        if (typeof point.value === 'number') {
          const min = query.valueFilter!.minValue;
          const max = query.valueFilter!.maxValue;
          return (min === undefined || point.value >= min) &&
                 (max === undefined || point.value <= max);
        }
        return true;
      });
    }

    return filtered;
  }

  private applySampling(dataPoints: SurrogateDataPoint[], query: TimeSeriesQuery): SurrogateDataPoint[] {
    // For now, return raw data points
    // In a full implementation, this would handle interpolation, averaging, etc.
    return dataPoints;
  }

  private categorizeWriteError(errorMessage: string): WriteErrorCode {
    if (errorMessage.includes('tag name')) return WriteErrorCode.INVALID_VALUE;
    if (errorMessage.includes('timestamp')) return WriteErrorCode.INVALID_TIMESTAMP;
    if (errorMessage.includes('value')) return WriteErrorCode.INVALID_VALUE;
    if (errorMessage.includes('quality')) return WriteErrorCode.QUALITY_TOO_LOW;
    if (errorMessage.includes('limit')) return WriteErrorCode.STORAGE_FULL;
    return WriteErrorCode.INVALID_VALUE;
  }

  private async compressBucket(bucket: TimeSeriesBucket): Promise<void> {
    // Placeholder for compression algorithm
    bucket.isCompressed = true;
    bucket.compressionRatio = 0.7; // Assume 30% compression
    bucket.lastCompression = new Date();
  }

  private async updateAggregations(tagName: string, timestamp: Date): Promise<void> {
    // Placeholder for aggregation updates
    // In a full implementation, this would update pre-computed aggregations
  }

  private getPrecomputedAggregation(
    tagIndex: TagIndex,
    aggregationType: AggregationType,
    interval: BucketInterval,
    startTime: Date,
    endTime: Date
  ): AggregatedData[] {
    // Placeholder - return empty array for now
    return [];
  }

  private async computeAggregation(
    tagIndex: TagIndex,
    aggregationType: AggregationType,
    interval: BucketInterval,
    startTime: Date,
    endTime: Date
  ): Promise<AggregatedData[]> {
    // Placeholder for on-the-fly aggregation computation
    return [];
  }

  private calculateMemoryUsage(): number {
    // Rough estimate based on data structures
    return this.totalDataPoints * 100; // Assume 100 bytes per data point
  }

  private calculateWriteRate(): number {
    const uptimeSeconds = (Date.now() - this.startTime) / 1000;
    return this.totalWrites / uptimeSeconds;
  }

  private calculateReadRate(): number {
    const uptimeSeconds = (Date.now() - this.startTime) / 1000;
    return this.totalReads / uptimeSeconds;
  }

  private calculateCompressionRatio(): number {
    // Calculate overall compression ratio
    return 0.8; // Placeholder
  }

  private countCompressedBuckets(): number {
    let count = 0;
    for (const tagIndex of this.tagIndexes.values()) {
      for (const bucket of tagIndex.buckets.values()) {
        if (bucket.isCompressed) count++;
      }
    }
    return count;
  }

  private performCleanup(): void {
    const cutoffTime = new Date(Date.now() - this.config.defaultRetentionHours * 60 * 60 * 1000);
    let cleanedPoints = 0;

    for (const tagIndex of this.tagIndexes.values()) {
      const bucketsToDelete: string[] = [];

      for (const [bucketKey, bucket] of tagIndex.buckets.entries()) {
        if (bucket.bucketEnd < cutoffTime) {
          cleanedPoints += bucket.pointCount;
          bucketsToDelete.push(bucketKey);
        }
      }

      // Remove old buckets
      for (const bucketKey of bucketsToDelete) {
        tagIndex.buckets.delete(bucketKey);
      }
    }

    this.totalDataPoints -= cleanedPoints;
    if (cleanedPoints > 0) {
      console.log(`Cleaned up ${cleanedPoints} old data points`);
    }
  }

  private performCompression(): void {
    let compressedBuckets = 0;

    for (const tagIndex of this.tagIndexes.values()) {
      for (const bucket of tagIndex.buckets.values()) {
        if (!bucket.isCompressed && bucket.pointCount >= this.config.compressionThreshold) {
          this.compressBucket(bucket);
          compressedBuckets++;
        }
      }
    }

    if (compressedBuckets > 0) {
      console.log(`Compressed ${compressedBuckets} buckets`);
    }
  }
}