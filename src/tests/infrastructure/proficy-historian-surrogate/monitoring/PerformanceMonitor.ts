/**
 * Performance Monitor for tracking system metrics and performance
 * Provides comprehensive monitoring of historian surrogate operations
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private startTime: number;
  private sampleBuffer: MetricSample[] = [];
  private isRunning = false;
  private monitoringInterval?: NodeJS.Timeout;

  constructor() {
    this.startTime = Date.now();
    this.metrics = this.initializeMetrics();
    console.log('PerformanceMonitor initialized');
  }

  /**
   * Start performance monitoring
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.startTime = Date.now();

    // Start periodic metrics collection
    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
      this.calculateRates();
      this.pruneOldSamples();
    }, 5000); // Collect metrics every 5 seconds

    console.log('PerformanceMonitor started');
  }

  /**
   * Stop performance monitoring
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    console.log('PerformanceMonitor stopped');
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics = this.initializeMetrics();
    this.sampleBuffer = [];
    this.startTime = Date.now();
    console.log('PerformanceMonitor metrics reset');
  }

  /**
   * Record a write operation
   */
  recordWriteOperation(pointCount: number, duration: number): void {
    this.metrics.writeOperations.totalCount++;
    this.metrics.writeOperations.totalPoints += pointCount;
    this.metrics.writeOperations.totalDuration += duration;
    this.metrics.writeOperations.lastOperation = Date.now();

    // Update average duration
    this.metrics.writeOperations.averageDuration =
      this.metrics.writeOperations.totalDuration / this.metrics.writeOperations.totalCount;

    // Track throughput
    const throughput = pointCount / (duration / 1000); // points per second
    this.metrics.writeOperations.averageThroughput = this.updateMovingAverage(
      this.metrics.writeOperations.averageThroughput,
      throughput,
      this.metrics.writeOperations.totalCount
    );

    // Update latency percentiles
    this.updateLatencyPercentiles('write', duration);

    // Record sample for trend analysis
    this.recordSample('write', {
      timestamp: Date.now(),
      duration,
      pointCount,
      throughput
    });
  }

  /**
   * Record a read operation
   */
  recordReadOperation(resultCount: number, duration: number, fromCache = false): void {
    this.metrics.readOperations.totalCount++;
    this.metrics.readOperations.totalResults += resultCount;
    this.metrics.readOperations.totalDuration += duration;
    this.metrics.readOperations.lastOperation = Date.now();

    if (fromCache) {
      this.metrics.readOperations.cacheHits++;
    } else {
      this.metrics.readOperations.cacheMisses++;
    }

    // Update average duration
    this.metrics.readOperations.averageDuration =
      this.metrics.readOperations.totalDuration / this.metrics.readOperations.totalCount;

    // Track query throughput
    const throughput = resultCount / (duration / 1000); // results per second
    this.metrics.readOperations.averageThroughput = this.updateMovingAverage(
      this.metrics.readOperations.averageThroughput,
      throughput,
      this.metrics.readOperations.totalCount
    );

    // Update latency percentiles
    this.updateLatencyPercentiles('read', duration);

    // Record sample for trend analysis
    this.recordSample('read', {
      timestamp: Date.now(),
      duration,
      resultCount,
      throughput,
      fromCache
    });
  }

  /**
   * Record a request (for general HTTP monitoring)
   */
  recordRequest(method: string, path: string, statusCode: number, duration: number): void {
    const endpoint = `${method} ${path}`;

    // Initialize endpoint metrics if needed
    if (!this.metrics.endpoints[endpoint]) {
      this.metrics.endpoints[endpoint] = {
        requestCount: 0,
        totalDuration: 0,
        averageDuration: 0,
        successCount: 0,
        errorCount: 0,
        lastRequest: 0
      };
    }

    const endpointMetrics = this.metrics.endpoints[endpoint];
    endpointMetrics.requestCount++;
    endpointMetrics.totalDuration += duration;
    endpointMetrics.averageDuration = endpointMetrics.totalDuration / endpointMetrics.requestCount;
    endpointMetrics.lastRequest = Date.now();

    // Track success/error rates
    if (statusCode >= 200 && statusCode < 400) {
      endpointMetrics.successCount++;
      this.metrics.errors.totalRequests++;
    } else {
      endpointMetrics.errorCount++;
      this.metrics.errors.totalErrors++;
      this.metrics.errors.lastError = Date.now();

      // Track error by type
      const errorCategory = this.categorizeHttpError(statusCode);
      this.metrics.errors.errorsByType[errorCategory] =
        (this.metrics.errors.errorsByType[errorCategory] || 0) + 1;
    }

    // Update overall error rate
    this.metrics.errors.errorRate =
      this.metrics.errors.totalErrors / (this.metrics.errors.totalRequests + this.metrics.errors.totalErrors);
  }

  /**
   * Record memory usage
   */
  recordMemoryUsage(used: number, total: number): void {
    this.metrics.system.memoryUsed = used;
    this.metrics.system.memoryTotal = total;
    this.metrics.system.memoryUtilization = (used / total) * 100;

    // Track peak memory usage
    if (used > this.metrics.system.peakMemoryUsed) {
      this.metrics.system.peakMemoryUsed = used;
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    // Update uptime
    this.metrics.system.uptime = Date.now() - this.startTime;

    // Calculate current rates
    this.calculateCurrentRates();

    return { ...this.metrics }; // Return a copy
  }

  /**
   * Get performance summary
   */
  getSummary(): PerformanceSummary {
    const metrics = this.getMetrics();

    return {
      uptime: metrics.system.uptime,
      writeOperations: {
        totalCount: metrics.writeOperations.totalCount,
        averageDuration: metrics.writeOperations.averageDuration,
        averageThroughput: metrics.writeOperations.averageThroughput,
        currentRate: this.calculateWriteRate()
      },
      readOperations: {
        totalCount: metrics.readOperations.totalCount,
        averageDuration: metrics.readOperations.averageDuration,
        averageThroughput: metrics.readOperations.averageThroughput,
        cacheHitRate: this.calculateCacheHitRate(),
        currentRate: this.calculateReadRate()
      },
      system: {
        memoryUtilization: metrics.system.memoryUtilization,
        peakMemoryUsed: metrics.system.peakMemoryUsed
      },
      errors: {
        errorRate: metrics.errors.errorRate,
        totalErrors: metrics.errors.totalErrors
      }
    };
  }

  /**
   * Get detailed latency statistics
   */
  getLatencyStatistics(): LatencyStatistics {
    return {
      write: { ...this.metrics.latency.write },
      read: { ...this.metrics.latency.read }
    };
  }

  /**
   * Get trend data for charting
   */
  getTrendData(metricType: 'write' | 'read', timeRange = 300000): Promise<TrendData[]> {
    const cutoffTime = Date.now() - timeRange;
    const filteredSamples = this.sampleBuffer
      .filter(sample => sample.type === metricType && sample.timestamp >= cutoffTime)
      .sort((a, b) => a.timestamp - b.timestamp);

    return Promise.resolve(filteredSamples.map(sample => ({
      timestamp: sample.timestamp,
      duration: sample.data.duration,
      throughput: sample.data.throughput,
      count: sample.data.pointCount || sample.data.resultCount || 0
    })));
  }

  // Private helper methods

  private initializeMetrics(): PerformanceMetrics {
    return {
      writeOperations: {
        totalCount: 0,
        totalPoints: 0,
        totalDuration: 0,
        averageDuration: 0,
        averageThroughput: 0,
        lastOperation: 0
      },
      readOperations: {
        totalCount: 0,
        totalResults: 0,
        totalDuration: 0,
        averageDuration: 0,
        averageThroughput: 0,
        cacheHits: 0,
        cacheMisses: 0,
        lastOperation: 0
      },
      system: {
        uptime: 0,
        memoryUsed: 0,
        memoryTotal: 0,
        memoryUtilization: 0,
        peakMemoryUsed: 0,
        cpuUtilization: 0
      },
      errors: {
        totalErrors: 0,
        totalRequests: 0,
        errorRate: 0,
        lastError: 0,
        errorsByType: {}
      },
      latency: {
        write: {
          p50: 0,
          p90: 0,
          p95: 0,
          p99: 0,
          samples: []
        },
        read: {
          p50: 0,
          p90: 0,
          p95: 0,
          p99: 0,
          samples: []
        }
      },
      endpoints: {}
    };
  }

  private updateMovingAverage(currentAvg: number, newValue: number, count: number): number {
    return (currentAvg * (count - 1) + newValue) / count;
  }

  private updateLatencyPercentiles(operation: 'write' | 'read', latency: number): void {
    const latencyMetrics = this.metrics.latency[operation];
    latencyMetrics.samples.push(latency);

    // Keep only recent samples (last 1000)
    if (latencyMetrics.samples.length > 1000) {
      latencyMetrics.samples = latencyMetrics.samples.slice(-1000);
    }

    // Calculate percentiles
    const sorted = [...latencyMetrics.samples].sort((a, b) => a - b);
    const length = sorted.length;

    latencyMetrics.p50 = this.calculatePercentile(sorted, 0.5);
    latencyMetrics.p90 = this.calculatePercentile(sorted, 0.9);
    latencyMetrics.p95 = this.calculatePercentile(sorted, 0.95);
    latencyMetrics.p99 = this.calculatePercentile(sorted, 0.99);
  }

  private calculatePercentile(sortedArray: number[], percentile: number): number {
    const index = (percentile * (sortedArray.length - 1));
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1];
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  private recordSample(type: 'write' | 'read', data: any): void {
    this.sampleBuffer.push({
      type,
      timestamp: Date.now(),
      data
    });

    // Keep buffer size reasonable
    if (this.sampleBuffer.length > 10000) {
      this.sampleBuffer = this.sampleBuffer.slice(-5000); // Keep last 5000 samples
    }
  }

  private collectSystemMetrics(): void {
    // In a real implementation, this would collect actual system metrics
    // For the surrogate, we'll simulate some basic metrics
    const memoryUsage = process.memoryUsage();
    this.recordMemoryUsage(memoryUsage.heapUsed, memoryUsage.heapTotal);
  }

  private calculateRates(): void {
    // Calculate current rates based on recent activity
    // This is a simplified implementation
  }

  private calculateCurrentRates(): void {
    const now = Date.now();
    const timeWindow = 60000; // 1 minute

    // Write rate
    const recentWrites = this.sampleBuffer.filter(
      sample => sample.type === 'write' && now - sample.timestamp <= timeWindow
    );

    // Read rate
    const recentReads = this.sampleBuffer.filter(
      sample => sample.type === 'read' && now - sample.timestamp <= timeWindow
    );
  }

  private calculateWriteRate(): number {
    const now = Date.now();
    const timeWindow = 60000; // 1 minute
    const recentWrites = this.sampleBuffer.filter(
      sample => sample.type === 'write' && now - sample.timestamp <= timeWindow
    );
    return recentWrites.length / (timeWindow / 1000); // operations per second
  }

  private calculateReadRate(): number {
    const now = Date.now();
    const timeWindow = 60000; // 1 minute
    const recentReads = this.sampleBuffer.filter(
      sample => sample.type === 'read' && now - sample.timestamp <= timeWindow
    );
    return recentReads.length / (timeWindow / 1000); // operations per second
  }

  private calculateCacheHitRate(): number {
    const total = this.metrics.readOperations.cacheHits + this.metrics.readOperations.cacheMisses;
    return total > 0 ? (this.metrics.readOperations.cacheHits / total) * 100 : 0;
  }

  private pruneOldSamples(): void {
    const cutoffTime = Date.now() - 300000; // Keep 5 minutes of samples
    this.sampleBuffer = this.sampleBuffer.filter(sample => sample.timestamp >= cutoffTime);
  }

  private categorizeHttpError(statusCode: number): string {
    if (statusCode >= 400 && statusCode < 500) return 'CLIENT_ERROR';
    if (statusCode >= 500) return 'SERVER_ERROR';
    return 'OTHER_ERROR';
  }
}

/**
 * Performance metrics structure
 */
export interface PerformanceMetrics {
  writeOperations: {
    totalCount: number;
    totalPoints: number;
    totalDuration: number;
    averageDuration: number;
    averageThroughput: number;
    lastOperation: number;
  };
  readOperations: {
    totalCount: number;
    totalResults: number;
    totalDuration: number;
    averageDuration: number;
    averageThroughput: number;
    cacheHits: number;
    cacheMisses: number;
    lastOperation: number;
  };
  system: {
    uptime: number;
    memoryUsed: number;
    memoryTotal: number;
    memoryUtilization: number;
    peakMemoryUsed: number;
    cpuUtilization: number;
  };
  errors: {
    totalErrors: number;
    totalRequests: number;
    errorRate: number;
    lastError: number;
    errorsByType: { [key: string]: number };
  };
  latency: {
    write: LatencyMetrics;
    read: LatencyMetrics;
  };
  endpoints: { [endpoint: string]: EndpointMetrics };
}

/**
 * Latency metrics for percentile tracking
 */
export interface LatencyMetrics {
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  samples: number[];
}

/**
 * Endpoint-specific metrics
 */
export interface EndpointMetrics {
  requestCount: number;
  totalDuration: number;
  averageDuration: number;
  successCount: number;
  errorCount: number;
  lastRequest: number;
}

/**
 * Performance summary for dashboards
 */
export interface PerformanceSummary {
  uptime: number;
  writeOperations: {
    totalCount: number;
    averageDuration: number;
    averageThroughput: number;
    currentRate: number;
  };
  readOperations: {
    totalCount: number;
    averageDuration: number;
    averageThroughput: number;
    cacheHitRate: number;
    currentRate: number;
  };
  system: {
    memoryUtilization: number;
    peakMemoryUsed: number;
  };
  errors: {
    errorRate: number;
    totalErrors: number;
  };
}

/**
 * Latency statistics
 */
export interface LatencyStatistics {
  write: LatencyMetrics;
  read: LatencyMetrics;
}

/**
 * Trend data for charting
 */
export interface TrendData {
  timestamp: number;
  duration: number;
  throughput: number;
  count: number;
}

/**
 * Metric sample for trend analysis
 */
interface MetricSample {
  type: 'write' | 'read';
  timestamp: number;
  data: any;
}