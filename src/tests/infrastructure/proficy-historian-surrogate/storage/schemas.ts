/**
 * Time-Series Database Schemas for GE Proficy Historian Surrogate
 *
 * In-memory data structures optimized for testing scenarios with
 * efficient storage, querying, and aggregation capabilities.
 */

/**
 * Tag metadata and configuration
 */
export interface SurrogateTag {
  id: string;                           // Unique identifier
  tagName: string;                      // "EQUIPMENT.CNC001.SPINDLE_SPEED"
  description: string;                  // Human-readable description
  dataType: TagDataType;                // Value data type
  engineeringUnits: string;             // "RPM", "°C", "psi", etc.
  collector: string;                    // "MES", "PLC", "SCADA"

  // Value constraints
  minValue?: number;                    // Minimum valid value (for numeric types)
  maxValue?: number;                    // Maximum valid value (for numeric types)

  // Compression settings
  compressionType: CompressionType;     // Data compression algorithm
  compressionDeviation: number;         // Compression deviation percentage (0.0-1.0)

  // Storage configuration
  storageType: StorageType;             // Storage optimization type
  retentionHours: number;               // Data retention period in hours

  // Metadata
  createdAt: Date;                      // Tag creation timestamp
  updatedAt: Date;                      // Last modification timestamp
  createdBy: string;                    // Creator identifier
  isActive: boolean;                    // Whether tag is accepting data

  // Quality settings
  defaultQuality: number;               // Default quality value (0-100)
  qualityThreshold: number;             // Minimum quality for storage
}

/**
 * Supported data types for tag values
 */
export enum TagDataType {
  FLOAT = 'Float',
  INTEGER = 'Integer',
  STRING = 'String',
  BOOLEAN = 'Boolean',
  DATETIME = 'DateTime'
}

/**
 * Compression algorithms for time-series data
 */
export enum CompressionType {
  NONE = 'None',                        // No compression
  SWINGING_DOOR = 'Swinging Door',      // Swinging door algorithm (default)
  BOXCAR = 'Boxcar'                     // Boxcar averaging
}

/**
 * Storage optimization types
 */
export enum StorageType {
  NORMAL = 'Normal',                    // Standard storage
  LAB = 'Lab'                          // Laboratory data (higher precision)
}

/**
 * Individual time-series data point
 */
export interface SurrogateDataPoint {
  tagName: string;                      // Reference to tag
  timestamp: Date;                      // Data point timestamp
  value: TagValue;                      // Actual value
  quality: number;                      // Data quality (0-100, 100=good)
  source?: string;                      // Optional source identifier
}

/**
 * Union type for tag values based on data type
 */
export type TagValue = number | string | boolean | Date;

/**
 * Time-series data storage bucket for efficient querying
 * Groups data points by time intervals for faster access
 */
export interface TimeSeriesBucket {
  tagName: string;                      // Tag identifier
  bucketStart: Date;                    // Start of time bucket
  bucketEnd: Date;                      // End of time bucket
  interval: BucketInterval;             // Bucket time interval
  dataPoints: SurrogateDataPoint[];     // Data points in this bucket
  pointCount: number;                   // Number of points in bucket

  // Bucket statistics for quick access
  stats: BucketStatistics;

  // Compression state
  isCompressed: boolean;                // Whether bucket is compressed
  compressionRatio: number;             // Compression ratio achieved
  lastCompression: Date;                // Last compression timestamp
}

/**
 * Time bucket intervals for organizing data
 */
export enum BucketInterval {
  MINUTE = '1m',                        // 1-minute buckets
  FIVE_MINUTES = '5m',                  // 5-minute buckets
  HOUR = '1h',                          // 1-hour buckets
  DAY = '1d'                           // 1-day buckets
}

/**
 * Statistical summary for time-series buckets
 */
export interface BucketStatistics {
  count: number;                        // Number of data points
  min: number;                          // Minimum value
  max: number;                          // Maximum value
  avg: number;                          // Average value
  sum: number;                          // Sum of values
  firstTimestamp: Date;                 // First data point timestamp
  lastTimestamp: Date;                  // Last data point timestamp
  qualityAvg: number;                   // Average quality
}

/**
 * Pre-computed aggregation data for fast queries
 */
export interface AggregatedData {
  tagName: string;                      // Tag identifier
  aggregationType: AggregationType;     // Type of aggregation
  interval: BucketInterval;             // Aggregation interval
  startTime: Date;                      // Aggregation period start
  endTime: Date;                        // Aggregation period end

  // Aggregated values
  value: number;                        // Aggregated value
  count: number;                        // Number of points aggregated
  quality: number;                      // Aggregated quality

  // Metadata
  calculatedAt: Date;                   // When aggregation was computed
  sourcePointCount: number;             // Original data points used
}

/**
 * Supported aggregation types
 */
export enum AggregationType {
  AVERAGE = 'Average',
  MINIMUM = 'Minimum',
  MAXIMUM = 'Maximum',
  COUNT = 'Count',
  SUM = 'Sum',
  STANDARD_DEVIATION = 'StandardDeviation',
  RANGE = 'Range'
}

/**
 * Index structure for efficient tag-based queries
 */
export interface TagIndex {
  tagName: string;                      // Tag identifier
  dataType: TagDataType;                // Value type for optimization
  buckets: Map<string, TimeSeriesBucket>; // Time buckets by key
  aggregations: Map<string, AggregatedData[]>; // Pre-computed aggregations

  // Index statistics
  totalPoints: number;                  // Total data points for this tag
  memoryUsage: number;                  // Estimated memory usage in bytes
  lastWrite: Date;                      // Last write timestamp
  lastRead: Date;                       // Last read timestamp

  // Performance metrics
  writeCount: number;                   // Total writes to this tag
  readCount: number;                    // Total reads from this tag
  compressionSavings: number;           // Bytes saved through compression
}

/**
 * Global time-series storage configuration
 */
export interface StorageConfiguration {
  // Memory management
  maxDataPoints: number;                // Maximum total data points
  maxMemoryUsage: number;               // Maximum memory usage in bytes
  maxTagCount: number;                  // Maximum number of tags

  // Retention policies
  defaultRetentionHours: number;        // Default data retention
  cleanupInterval: number;              // Cleanup interval in minutes

  // Compression settings
  compressionEnabled: boolean;          // Enable automatic compression
  compressionThreshold: number;         // Points threshold for compression
  compressionInterval: number;          // Compression interval in minutes

  // Aggregation settings
  enablePreAggregation: boolean;        // Enable automatic aggregation
  aggregationIntervals: BucketInterval[]; // Intervals to pre-compute
  aggregationTypes: AggregationType[];  // Types to pre-compute

  // Performance tuning
  bucketSize: number;                   // Default bucket size in minutes
  indexingEnabled: boolean;             // Enable advanced indexing
  cacheSize: number;                    // Query result cache size
}

/**
 * Query filter for time-series data retrieval
 */
export interface TimeSeriesQuery {
  tagNames: string[];                   // Tags to query
  startTime: Date;                      // Query start time
  endTime: Date;                        // Query end time

  // Sampling options
  samplingMode: SamplingMode;           // How to sample data
  intervalMilliseconds?: number;        // Sampling interval
  maxResults?: number;                  // Maximum results to return

  // Filtering
  qualityFilter?: QualityFilter;        // Quality filtering options
  valueFilter?: ValueFilter;            // Value filtering options

  // Aggregation
  aggregationType?: AggregationType;    // Optional aggregation
  aggregationInterval?: BucketInterval; // Aggregation grouping
}

/**
 * Data sampling modes for queries
 */
export enum SamplingMode {
  RAW_BY_TIME = 'RawByTime',           // Raw data points
  INTERPOLATED = 'Interpolated',        // Interpolated values
  AVERAGE = 'Average',                  // Average values
  MINIMUM = 'Minimum',                  // Minimum values
  MAXIMUM = 'Maximum',                  // Maximum values
  COUNT = 'Count'                       // Count of points
}

/**
 * Quality filtering options
 */
export interface QualityFilter {
  minQuality: number;                   // Minimum quality threshold
  maxQuality: number;                   // Maximum quality threshold
  excludeBadQuality: boolean;           // Exclude quality < 50
}

/**
 * Value filtering options
 */
export interface ValueFilter {
  minValue?: number;                    // Minimum value (numeric types)
  maxValue?: number;                    // Maximum value (numeric types)
  stringPattern?: string;               // Regex pattern (string types)
  booleanValue?: boolean;               // Exact boolean value
}

/**
 * Query result structure
 */
export interface QueryResult {
  success: boolean;                     // Query success status
  dataPoints: SurrogateDataPoint[];     // Retrieved data points
  aggregatedData?: AggregatedData[];    // Aggregated results

  // Metadata
  recordCount: number;                  // Number of records returned
  totalRecords: number;                 // Total available records
  executionTime: number;                // Query execution time (ms)
  fromCache: boolean;                   // Whether result came from cache

  // Error information
  error?: string;                       // Error message if failed
  warnings: string[];                   // Non-fatal warnings
}

/**
 * Write operation result
 */
export interface WriteResult {
  success: boolean;                     // Write success status
  pointsWritten: number;                // Successfully written points
  pointsFailed: number;                 // Failed points

  // Error details
  errors: WriteError[];                 // Individual point errors
  warnings: string[];                   // Non-fatal warnings

  // Performance metrics
  executionTime: number;                // Write execution time (ms)
  throughput: number;                   // Points per second
}

/**
 * Individual write error details
 */
export interface WriteError {
  tagName: string;                      // Tag that failed
  timestamp: Date;                      // Timestamp of failed point
  error: string;                        // Error description
  errorCode: WriteErrorCode;            // Categorized error code
}

/**
 * Write error categorization
 */
export enum WriteErrorCode {
  TAG_NOT_FOUND = 'TAG_NOT_FOUND',
  INVALID_VALUE = 'INVALID_VALUE',
  INVALID_TIMESTAMP = 'INVALID_TIMESTAMP',
  QUALITY_TOO_LOW = 'QUALITY_TOO_LOW',
  VALUE_OUT_OF_RANGE = 'VALUE_OUT_OF_RANGE',
  STORAGE_FULL = 'STORAGE_FULL',
  TAG_INACTIVE = 'TAG_INACTIVE',
  DUPLICATE_TIMESTAMP = 'DUPLICATE_TIMESTAMP'
}

/**
 * Storage engine health and statistics
 */
export interface StorageHealth {
  // Overall status
  healthy: boolean;                     // Overall health status
  uptime: number;                       // Uptime in milliseconds

  // Storage statistics
  totalTags: number;                    // Total tags in system
  totalDataPoints: number;              // Total data points stored
  memoryUsage: number;                  // Current memory usage (bytes)
  memoryUtilization: number;            // Memory utilization percentage

  // Performance metrics
  writesPerSecond: number;              // Current write rate
  readsPerSecond: number;               // Current read rate
  averageWriteLatency: number;          // Average write latency (ms)
  averageReadLatency: number;           // Average read latency (ms)

  // Compression statistics
  compressionRatio: number;             // Overall compression ratio
  compressedBuckets: number;            // Number of compressed buckets

  // Error statistics
  writeErrors: number;                  // Total write errors
  readErrors: number;                   // Total read errors
  lastError?: Date;                     // Last error timestamp

  // Maintenance status
  lastCleanup: Date;                    // Last cleanup timestamp
  lastCompression: Date;                // Last compression timestamp
}

/**
 * Default storage configuration for testing
 */
export const DEFAULT_STORAGE_CONFIG: StorageConfiguration = {
  // Memory limits suitable for testing
  maxDataPoints: 1000000,               // 1M points max
  maxMemoryUsage: 256 * 1024 * 1024,    // 256MB max
  maxTagCount: 10000,                   // 10K tags max

  // Retention for test scenarios
  defaultRetentionHours: 24,            // 24 hours default
  cleanupInterval: 60,                  // Cleanup every hour

  // Compression for efficiency
  compressionEnabled: true,
  compressionThreshold: 1000,           // Compress buckets with 1000+ points
  compressionInterval: 5,               // Compress every 5 minutes

  // Pre-aggregation for performance
  enablePreAggregation: true,
  aggregationIntervals: [
    BucketInterval.MINUTE,
    BucketInterval.FIVE_MINUTES,
    BucketInterval.HOUR
  ],
  aggregationTypes: [
    AggregationType.AVERAGE,
    AggregationType.MINIMUM,
    AggregationType.MAXIMUM,
    AggregationType.COUNT
  ],

  // Performance optimization
  bucketSize: 5,                        // 5-minute default buckets
  indexingEnabled: true,
  cacheSize: 1000                       // Cache 1000 query results
};

/**
 * Bucket key generation utilities
 */
export class BucketKeyGenerator {
  /**
   * Generate bucket key for a timestamp and interval
   */
  static generateKey(timestamp: Date, interval: BucketInterval): string {
    const date = new Date(timestamp);

    switch (interval) {
      case BucketInterval.MINUTE:
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;

      case BucketInterval.FIVE_MINUTES:
        const fiveMinBlock = Math.floor(date.getMinutes() / 5) * 5;
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}-${fiveMinBlock}`;

      case BucketInterval.HOUR:
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}`;

      case BucketInterval.DAY:
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

      default:
        throw new Error(`Unsupported bucket interval: ${interval}`);
    }
  }

  /**
   * Get bucket start time for a timestamp and interval
   */
  static getBucketStart(timestamp: Date, interval: BucketInterval): Date {
    const date = new Date(timestamp);

    switch (interval) {
      case BucketInterval.MINUTE:
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(),
                       date.getHours(), date.getMinutes(), 0, 0);

      case BucketInterval.FIVE_MINUTES:
        const fiveMinBlock = Math.floor(date.getMinutes() / 5) * 5;
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(),
                       date.getHours(), fiveMinBlock, 0, 0);

      case BucketInterval.HOUR:
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(),
                       date.getHours(), 0, 0, 0);

      case BucketInterval.DAY:
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(),
                       0, 0, 0, 0);

      default:
        throw new Error(`Unsupported bucket interval: ${interval}`);
    }
  }

  /**
   * Get bucket end time for a timestamp and interval
   */
  static getBucketEnd(timestamp: Date, interval: BucketInterval): Date {
    const start = this.getBucketStart(timestamp, interval);

    switch (interval) {
      case BucketInterval.MINUTE:
        return new Date(start.getTime() + 60 * 1000 - 1);

      case BucketInterval.FIVE_MINUTES:
        return new Date(start.getTime() + 5 * 60 * 1000 - 1);

      case BucketInterval.HOUR:
        return new Date(start.getTime() + 60 * 60 * 1000 - 1);

      case BucketInterval.DAY:
        return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);

      default:
        throw new Error(`Unsupported bucket interval: ${interval}`);
    }
  }
}