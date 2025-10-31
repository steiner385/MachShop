/**
 * Test Configuration and Utilities for Proficy Historian Surrogate Tests
 */

import { SurrogateServerConfig } from '../../../tests/infrastructure/proficy-historian-surrogate/server/ProficyHistorianSurrogate';
import { SurrogateTag, TagDataType, SurrogateDataPoint } from '../../../tests/infrastructure/proficy-historian-surrogate/storage/schemas';

/**
 * Default test configuration for surrogate server
 */
export const DEFAULT_TEST_CONFIG: SurrogateServerConfig = {
  server: {
    port: 0, // Let system assign port
    host: 'localhost',
    enableCors: true,
    requestTimeout: 5000,
    rateLimitEnabled: false,
    rateLimitWindow: 900000,
    rateLimitMax: 1000
  },
  authentication: {
    enabled: true,
    authType: 'basic',
    username: 'testuser',
    password: 'testpass123'
  },
  storage: {
    maxDataPoints: 5000,
    retentionHours: 1,
    compressionEnabled: false,
    aggregationEnabled: true
  },
  errorSimulation: {
    enabled: false,
    errorRate: 0,
    latencySimulation: false,
    averageLatency: 0
  },
  logging: {
    enabled: false,
    level: 'error'
  }
};

/**
 * Performance test configuration for load testing
 */
export const PERFORMANCE_TEST_CONFIG: SurrogateServerConfig = {
  ...DEFAULT_TEST_CONFIG,
  storage: {
    maxDataPoints: 100000,
    retentionHours: 24,
    compressionEnabled: true,
    aggregationEnabled: true
  },
  logging: {
    enabled: false,
    level: 'warn'
  }
};

/**
 * Error simulation test configuration
 */
export const ERROR_SIMULATION_CONFIG: SurrogateServerConfig = {
  ...DEFAULT_TEST_CONFIG,
  errorSimulation: {
    enabled: true,
    errorRate: 0.1,
    latencySimulation: true,
    averageLatency: 100
  }
};

/**
 * Test data factory functions
 */
export class TestDataFactory {
  private static tagCounter = 1;
  private static dataPointCounter = 1;

  /**
   * Create a test tag with default values
   */
  static createTestTag(overrides: Partial<SurrogateTag> = {}): SurrogateTag {
    const defaultTag: SurrogateTag = {
      id: `test-tag-${this.tagCounter++}`,
      tagName: `TEST.TAG.${this.tagCounter}`,
      description: `Test tag ${this.tagCounter}`,
      dataType: TagDataType.Float,
      engineeringUnits: 'units',
      collector: 'TEST',
      compressionType: 'None',
      compressionDeviation: 0,
      storageType: 'Normal',
      retentionHours: 24,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test-factory',
      isActive: true,
      defaultQuality: 100,
      qualityThreshold: 50
    };

    return { ...defaultTag, ...overrides };
  }

  /**
   * Create multiple test tags
   */
  static createTestTags(count: number, baseOverrides: Partial<SurrogateTag> = {}): SurrogateTag[] {
    const tags: SurrogateTag[] = [];

    for (let i = 0; i < count; i++) {
      const overrides = {
        ...baseOverrides,
        tagName: `TEST.BATCH.TAG.${this.tagCounter + i}`,
        description: `Batch test tag ${this.tagCounter + i}`
      };

      tags.push(this.createTestTag(overrides));
    }

    this.tagCounter += count;
    return tags;
  }

  /**
   * Create test data points for a tag
   */
  static createTestDataPoints(
    tagName: string,
    count: number,
    options: {
      startTime?: Date;
      intervalMs?: number;
      valueRange?: { min: number; max: number };
      qualityRange?: { min: number; max: number };
    } = {}
  ): SurrogateDataPoint[] {
    const {
      startTime = new Date(),
      intervalMs = 1000,
      valueRange = { min: 0, max: 100 },
      qualityRange = { min: 95, max: 100 }
    } = options;

    const dataPoints: SurrogateDataPoint[] = [];

    for (let i = 0; i < count; i++) {
      const timestamp = new Date(startTime.getTime() + i * intervalMs);
      const value = valueRange.min + Math.random() * (valueRange.max - valueRange.min);
      const quality = qualityRange.min + Math.random() * (qualityRange.max - qualityRange.min);

      dataPoints.push({
        tagName,
        timestamp,
        value,
        quality: Math.round(quality)
      });
    }

    return dataPoints;
  }

  /**
   * Create time series data with specific patterns
   */
  static createPatternedDataPoints(
    tagName: string,
    count: number,
    pattern: 'sine' | 'ramp' | 'step' | 'random',
    options: {
      startTime?: Date;
      intervalMs?: number;
      amplitude?: number;
      offset?: number;
      frequency?: number;
    } = {}
  ): SurrogateDataPoint[] {
    const {
      startTime = new Date(),
      intervalMs = 1000,
      amplitude = 10,
      offset = 50,
      frequency = 0.1
    } = options;

    const dataPoints: SurrogateDataPoint[] = [];

    for (let i = 0; i < count; i++) {
      const timestamp = new Date(startTime.getTime() + i * intervalMs);
      let value: number;

      switch (pattern) {
        case 'sine':
          value = offset + amplitude * Math.sin(2 * Math.PI * frequency * i);
          break;
        case 'ramp':
          value = offset + (amplitude * i) / count;
          break;
        case 'step':
          value = offset + amplitude * Math.floor(i / 10) % 2;
          break;
        case 'random':
        default:
          value = offset + (Math.random() - 0.5) * amplitude * 2;
          break;
      }

      dataPoints.push({
        tagName,
        timestamp,
        value,
        quality: 100
      });
    }

    return dataPoints;
  }

  /**
   * Create anomalous data points (outliers, bad quality, etc.)
   */
  static createAnomalousDataPoints(
    tagName: string,
    count: number,
    anomalyType: 'outlier' | 'bad_quality' | 'null_value' | 'future_timestamp'
  ): SurrogateDataPoint[] {
    const dataPoints: SurrogateDataPoint[] = [];
    const baseTime = new Date();

    for (let i = 0; i < count; i++) {
      let dataPoint: SurrogateDataPoint;

      switch (anomalyType) {
        case 'outlier':
          dataPoint = {
            tagName,
            timestamp: new Date(baseTime.getTime() + i * 1000),
            value: Math.random() > 0.5 ? 1000000 : -1000000, // Extreme values
            quality: 100
          };
          break;

        case 'bad_quality':
          dataPoint = {
            tagName,
            timestamp: new Date(baseTime.getTime() + i * 1000),
            value: 50 + Math.random() * 10,
            quality: Math.random() * 30 // 0-30% quality
          };
          break;

        case 'null_value':
          dataPoint = {
            tagName,
            timestamp: new Date(baseTime.getTime() + i * 1000),
            value: null as any,
            quality: 0
          };
          break;

        case 'future_timestamp':
          dataPoint = {
            tagName,
            timestamp: new Date(baseTime.getTime() + 365 * 24 * 60 * 60 * 1000), // 1 year in future
            value: 50,
            quality: 100
          };
          break;

        default:
          dataPoint = {
            tagName,
            timestamp: new Date(baseTime.getTime() + i * 1000),
            value: 50,
            quality: 100
          };
      }

      dataPoints.push(dataPoint);
    }

    return dataPoints;
  }

  /**
   * Reset counters (useful for test isolation)
   */
  static resetCounters(): void {
    this.tagCounter = 1;
    this.dataPointCounter = 1;
  }
}

/**
 * Test utilities for common testing operations
 */
export class TestUtils {
  /**
   * Wait for a condition to be true with timeout
   */
  static async waitForCondition(
    condition: () => boolean | Promise<boolean>,
    timeoutMs: number = 5000,
    intervalMs: number = 100
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      if (await condition()) {
        return;
      }
      await this.sleep(intervalMs);
    }

    throw new Error(`Condition not met within ${timeoutMs}ms`);
  }

  /**
   * Sleep for specified milliseconds
   */
  static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate a unique test identifier
   */
  static generateTestId(): string {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create temporary directory for test files
   */
  static createTempDir(): string {
    const os = require('os');
    const path = require('path');
    const fs = require('fs');

    const tempDir = path.join(os.tmpdir(), this.generateTestId());
    fs.mkdirSync(tempDir, { recursive: true });
    return tempDir;
  }

  /**
   * Clean up temporary directory
   */
  static cleanupTempDir(dirPath: string): void {
    const fs = require('fs');
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to cleanup temp directory ${dirPath}:`, error);
    }
  }

  /**
   * Assert that a value is within a tolerance
   */
  static assertWithinTolerance(actual: number, expected: number, tolerance: number): void {
    const diff = Math.abs(actual - expected);
    if (diff > tolerance) {
      throw new Error(`Expected ${actual} to be within ${tolerance} of ${expected}, but difference was ${diff}`);
    }
  }

  /**
   * Assert that array contains expected values
   */
  static assertArrayContains<T>(array: T[], expectedValues: T[]): void {
    for (const expectedValue of expectedValues) {
      if (!array.includes(expectedValue)) {
        throw new Error(`Expected array to contain ${expectedValue}, but it was not found`);
      }
    }
  }

  /**
   * Create mock authentication headers
   */
  static createAuthHeaders(username: string = 'testuser', password: string = 'testpass123'): Record<string, string> {
    const credentials = Buffer.from(`${username}:${password}`).toString('base64');
    return {
      'Authorization': `Basic ${credentials}`
    };
  }

  /**
   * Measure execution time of a function
   */
  static async measureExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T; timeMs: number }> {
    const startTime = Date.now();
    const result = await fn();
    const timeMs = Date.now() - startTime;
    return { result, timeMs };
  }

  /**
   * Generate load test data
   */
  static generateLoadTestData(tagCount: number, pointsPerTag: number): {
    tags: SurrogateTag[];
    dataPoints: SurrogateDataPoint[];
  } {
    const tags = TestDataFactory.createTestTags(tagCount);
    const dataPoints: SurrogateDataPoint[] = [];

    for (const tag of tags) {
      const points = TestDataFactory.createTestDataPoints(tag.tagName, pointsPerTag, {
        startTime: new Date(Date.now() - pointsPerTag * 1000),
        intervalMs: 1000
      });
      dataPoints.push(...points);
    }

    return { tags, dataPoints };
  }
}

/**
 * Performance test helpers
 */
export class PerformanceTestHelpers {
  /**
   * Run a performance benchmark
   */
  static async benchmark(
    name: string,
    fn: () => Promise<void>,
    iterations: number = 100
  ): Promise<{
    name: string;
    iterations: number;
    totalTimeMs: number;
    averageTimeMs: number;
    minTimeMs: number;
    maxTimeMs: number;
  }> {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const { timeMs } = await TestUtils.measureExecutionTime(fn);
      times.push(timeMs);
    }

    const totalTimeMs = times.reduce((sum, time) => sum + time, 0);
    const averageTimeMs = totalTimeMs / iterations;
    const minTimeMs = Math.min(...times);
    const maxTimeMs = Math.max(...times);

    return {
      name,
      iterations,
      totalTimeMs,
      averageTimeMs,
      minTimeMs,
      maxTimeMs
    };
  }

  /**
   * Assert performance meets requirements
   */
  static assertPerformance(
    benchmarkResult: Awaited<ReturnType<typeof PerformanceTestHelpers.benchmark>>,
    requirements: {
      maxAverageTimeMs?: number;
      maxTimeMs?: number;
      minThroughputPerSecond?: number;
    }
  ): void {
    if (requirements.maxAverageTimeMs && benchmarkResult.averageTimeMs > requirements.maxAverageTimeMs) {
      throw new Error(
        `Performance requirement failed: average time ${benchmarkResult.averageTimeMs}ms > ${requirements.maxAverageTimeMs}ms`
      );
    }

    if (requirements.maxTimeMs && benchmarkResult.maxTimeMs > requirements.maxTimeMs) {
      throw new Error(
        `Performance requirement failed: max time ${benchmarkResult.maxTimeMs}ms > ${requirements.maxTimeMs}ms`
      );
    }

    if (requirements.minThroughputPerSecond) {
      const actualThroughput = 1000 / benchmarkResult.averageTimeMs;
      if (actualThroughput < requirements.minThroughputPerSecond) {
        throw new Error(
          `Performance requirement failed: throughput ${actualThroughput}/s < ${requirements.minThroughputPerSecond}/s`
        );
      }
    }
  }
}

/**
 * Export commonly used test constants
 */
export const TEST_CONSTANTS = {
  DEFAULT_TIMEOUT: 30000,
  INTEGRATION_TIMEOUT: 60000,
  PERFORMANCE_TIMEOUT: 120000,
  DEFAULT_TEST_TAG_NAME: 'TEST.DEFAULT.TAG',
  DEFAULT_TEST_SCENARIO: 'test_scenario',
  MAX_TEST_DATA_POINTS: 10000,
  MIN_QUALITY_THRESHOLD: 50,
  MAX_QUALITY_VALUE: 100
} as const;