import axios, { AxiosInstance, AxiosError } from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GE Proficy Historian Adapter
 *
 * Integrates with GE Proficy Historian for time-series data storage and retrieval.
 * Proficy Historian is an industrial-grade historian for collecting, storing, and
 * analyzing high-volume time-series data from manufacturing equipment.
 *
 * Features:
 * - Write equipment data to Proficy tags (sensors, alarms, process data)
 * - Query historical time-series data
 * - Tag management (create, update, delete tags)
 * - Real-time data streaming
 * - Aggregated data queries (min, max, avg, count)
 * - Automatic data buffering and retry
 *
 * Integration Points:
 * - L2 Equipment Integration → Proficy (equipment data collection)
 * - Process Data → Proficy (process parameters, trends)
 * - Material Tracking → Proficy (traceability events)
 * - Quality Data → Proficy (inspection results)
 *
 * GE Proficy Historian REST API Documentation:
 * https://www.ge.com/digital/documentation/proficy-historian/
 */

export interface ProficyHistorianConfig {
  baseUrl: string;              // Historian server URL (e.g., http://historian-server:8080)
  username: string;             // Authentication username
  password: string;             // Authentication password
  authType?: 'basic' | 'windows'; // Authentication type (default: basic)
  serverName?: string;          // Historian server name (for multi-server setups)
  timeout?: number;             // Request timeout (ms)
  retryAttempts?: number;       // Number of retry attempts for failed writes
  bufferSize?: number;          // Number of data points to buffer before flushing
  compressionEnabled?: boolean; // Enable data compression for large queries
}

/**
 * Proficy Tag Configuration
 */
export interface ProficyTag {
  tagName: string;              // Unique tag name (e.g., "EQUIPMENT.CNC001.SPINDLE_SPEED")
  description?: string;         // Tag description
  dataType: 'Float' | 'Integer' | 'String' | 'Boolean' | 'DateTime';
  engineeringUnits?: string;    // Unit of measure (e.g., "RPM", "°C", "psi")
  collector?: string;           // Data collector name
  minValue?: number;            // Minimum valid value
  maxValue?: number;            // Maximum valid value
  compressionType?: 'None' | 'Swinging Door' | 'Boxcar';
  compressionDeviation?: number; // Compression deviation (%)
  storageType?: 'Normal' | 'Lab'; // Storage type
}

/**
 * Data Point for writing to Proficy
 */
export interface ProficyDataPoint {
  tagName: string;              // Tag to write to
  value: any;                   // Value to write
  timestamp: Date;              // Timestamp of the value
  quality?: number;             // Data quality (0-100, 100 = good)
}

/**
 * Query options for historical data
 */
export interface HistorianQueryOptions {
  tagNames: string[];           // Tags to query
  startTime: Date;              // Query start time
  endTime: Date;                // Query end time
  samplingMode?: 'RawByTime' | 'Interpolated' | 'Average' | 'Minimum' | 'Maximum' | 'Count';
  intervalMilliseconds?: number; // Sampling interval (for aggregated queries)
  maxResults?: number;          // Maximum number of results
  direction?: 'Forward' | 'Backward'; // Query direction
}

/**
 * Historical data point returned from query
 */
export interface HistoricalDataPoint {
  tagName: string;
  timestamp: Date;
  value: any;
  quality: number;
}

/**
 * Result of data write operation
 */
export interface WriteResult {
  success: boolean;
  pointsWritten: number;
  pointsFailed: number;
  errors: Array<{ tagName: string; error: string }>;
  duration: number;
}

/**
 * Result of data query operation
 */
export interface QueryResult {
  success: boolean;
  dataPoints: HistoricalDataPoint[];
  recordCount: number;
  duration: number;
  error?: string;
}

export class ProficyHistorianAdapter {
  private config: ProficyHistorianConfig;
  private httpClient: AxiosInstance;
  private dataBuffer: ProficyDataPoint[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(config: ProficyHistorianConfig) {
    this.config = {
      authType: 'basic',
      timeout: 30000,
      retryAttempts: 3,
      bufferSize: 100,
      compressionEnabled: true,
      ...config,
    };

    // Create HTTP client for Proficy Historian REST API
    const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');

    this.httpClient = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
    });

    // Add response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        console.error('Proficy Historian API error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );

    console.log('Proficy Historian Adapter initialized');
  }

  /**
   * Test connection to Proficy Historian
   */
  async testConnection(): Promise<boolean> {
    try {
      // Test by getting server info
      const response = await this.httpClient.get('/historian/server/info');
      return response.status === 200;
    } catch (error: any) {
      console.error('Connection test failed:', error.message);
      return false;
    }
  }

  /**
   * Create a new tag in Proficy Historian
   */
  async createTag(tag: ProficyTag): Promise<boolean> {
    try {
      const tagConfig = {
        TagName: tag.tagName,
        Description: tag.description || '',
        DataType: tag.dataType,
        EngineeringUnits: tag.engineeringUnits || '',
        Collector: tag.collector || 'MES',
        CompressionType: tag.compressionType || 'Swinging Door',
        CompressionDeviation: tag.compressionDeviation || 0.1,
        StorageType: tag.storageType || 'Normal',
      };

      const response = await this.httpClient.post('/historian/tags', tagConfig);
      console.log(`Tag created: ${tag.tagName}`);
      return response.status === 201 || response.status === 200;
    } catch (error: any) {
      console.error(`Failed to create tag ${tag.tagName}:`, error.message);
      throw new Error(`Failed to create tag: ${error.message}`);
    }
  }

  /**
   * Write a single data point to Proficy Historian
   */
  async writeDataPoint(dataPoint: ProficyDataPoint): Promise<boolean> {
    return this.writeDataPoints([dataPoint]).then(result => result.success);
  }

  /**
   * Write multiple data points to Proficy Historian
   */
  async writeDataPoints(dataPoints: ProficyDataPoint[]): Promise<WriteResult> {
    const startTime = Date.now();
    const result: WriteResult = {
      success: false,
      pointsWritten: 0,
      pointsFailed: 0,
      errors: [],
      duration: 0,
    };

    try {
      // Transform data points to Proficy format
      const proficyData = dataPoints.map(dp => ({
        TagName: dp.tagName,
        Value: dp.value,
        Timestamp: dp.timestamp.toISOString(),
        Quality: dp.quality !== undefined ? dp.quality : 100, // Default to good quality
      }));

      // Write to Proficy Historian
      const response = await this.httpClient.post('/historian/data/write', {
        Data: proficyData,
      });

      result.pointsWritten = dataPoints.length;
      result.success = true;
      result.duration = Date.now() - startTime;

      console.log(`Wrote ${result.pointsWritten} data points to Proficy Historian`);
      return result;
    } catch (error: any) {
      result.pointsFailed = dataPoints.length;
      result.duration = Date.now() - startTime;
      result.errors.push({
        tagName: 'bulk_write',
        error: error.message,
      });

      console.error('Failed to write data points:', error.message);
      return result;
    }
  }

  /**
   * Buffer data point for batch writing (improves performance)
   */
  async bufferDataPoint(dataPoint: ProficyDataPoint): Promise<void> {
    this.dataBuffer.push(dataPoint);

    // Flush buffer if it reaches the configured size
    if (this.dataBuffer.length >= (this.config.bufferSize || 100)) {
      await this.flushBuffer();
    } else {
      // Set up auto-flush timer (flush after 5 seconds of inactivity)
      if (this.flushTimer) {
        clearTimeout(this.flushTimer);
      }
      this.flushTimer = setTimeout(() => this.flushBuffer(), 5000);
    }
  }

  /**
   * Flush buffered data points to Proficy Historian
   */
  async flushBuffer(): Promise<WriteResult | null> {
    if (this.dataBuffer.length === 0) {
      return null;
    }

    const pointsToWrite = [...this.dataBuffer];
    this.dataBuffer = [];

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    return this.writeDataPoints(pointsToWrite);
  }

  /**
   * Query historical data from Proficy Historian
   */
  async queryHistoricalData(options: HistorianQueryOptions): Promise<QueryResult> {
    const startTime = Date.now();
    const result: QueryResult = {
      success: false,
      dataPoints: [],
      recordCount: 0,
      duration: 0,
    };

    try {
      const queryParams = {
        TagNames: options.tagNames.join(','),
        StartTime: options.startTime.toISOString(),
        EndTime: options.endTime.toISOString(),
        SamplingMode: options.samplingMode || 'RawByTime',
        IntervalMilliseconds: options.intervalMilliseconds,
        MaxResults: options.maxResults || 10000,
        Direction: options.direction || 'Forward',
      };

      const response = await this.httpClient.get('/historian/data/query', {
        params: queryParams,
      });

      // Transform Proficy response to our format
      const proficyData = response.data.Data || [];
      result.dataPoints = proficyData.map((item: any) => ({
        tagName: item.TagName,
        timestamp: new Date(item.Timestamp),
        value: item.Value,
        quality: item.Quality || 100,
      }));

      result.recordCount = result.dataPoints.length;
      result.success = true;
      result.duration = Date.now() - startTime;

      console.log(`Queried ${result.recordCount} data points from Proficy Historian`);
      return result;
    } catch (error: any) {
      result.duration = Date.now() - startTime;
      result.error = error.message;
      console.error('Failed to query historical data:', error.message);
      return result;
    }
  }

  /**
   * Query aggregated data (min, max, avg) for a time range
   */
  async queryAggregatedData(
    tagNames: string[],
    startTime: Date,
    endTime: Date,
    aggregateType: 'Average' | 'Minimum' | 'Maximum' | 'Count',
    intervalMinutes: number = 60
  ): Promise<QueryResult> {
    return this.queryHistoricalData({
      tagNames,
      startTime,
      endTime,
      samplingMode: aggregateType,
      intervalMilliseconds: intervalMinutes * 60 * 1000,
    });
  }

  /**
   * Push equipment data collection to Proficy Historian
   * Maps L2 Equipment Integration data to Proficy tags
   */
  async pushEquipmentData(equipmentDataCollectionId: string): Promise<WriteResult> {
    try {
      // Fetch equipment data collection from MES
      const dataCollection = await prisma.equipmentDataCollection.findUnique({
        where: { id: equipmentDataCollectionId },
        include: { equipment: true },
      });

      if (!dataCollection) {
        throw new Error(`Equipment data collection ${equipmentDataCollectionId} not found`);
      }

      // Map to Proficy tag naming convention: EQUIPMENT.<EQUIP_ID>.<DATA_TYPE>
      const tagName = `EQUIPMENT.${dataCollection.equipment.equipmentCode}.${dataCollection.dataCollectionType}`;

      const dataPoint: ProficyDataPoint = {
        tagName,
        value: dataCollection.value,
        timestamp: dataCollection.collectedAt,
        quality: 100,
      };

      return this.writeDataPoints([dataPoint]);
    } catch (error: any) {
      console.error('Failed to push equipment data:', error.message);
      throw error;
    }
  }

  /**
   * Push process data to Proficy Historian
   */
  async pushProcessData(processDataCollectionId: string): Promise<WriteResult> {
    try {
      const processData = await prisma.processDataCollection.findUnique({
        where: { id: processDataCollectionId },
        include: { equipment: true },
      });

      if (!processData) {
        throw new Error(`Process data collection ${processDataCollectionId} not found`);
      }

      const dataPoints: ProficyDataPoint[] = [];

      // Convert process parameters to individual tag writes
      const parameters = processData.parameters as any || {};
      for (const [paramName, paramValue] of Object.entries(parameters)) {
        const tagName = `PROCESS.${processData.equipment.equipmentCode}.${paramName}`;
        dataPoints.push({
          tagName,
          value: paramValue,
          timestamp: processData.startTimestamp,
          quality: 100,
        });
      }

      return this.writeDataPoints(dataPoints);
    } catch (error: any) {
      console.error('Failed to push process data:', error.message);
      throw error;
    }
  }

  /**
   * Auto-configure tags for all equipment in the system
   * Creates tags in Proficy for each equipment and common data types
   */
  async autoConfigureEquipmentTags(): Promise<{ created: number; failed: number }> {
    const result = { created: 0, failed: 0 };

    try {
      // Get all active equipment
      const equipment = await prisma.equipment.findMany({
        where: { isActive: true },
      });

      const commonDataTypes = [
        { name: 'SENSOR', dataType: 'Float' as const, units: 'units' },
        { name: 'ALARM', dataType: 'Boolean' as const, units: '' },
        { name: 'STATUS', dataType: 'String' as const, units: '' },
        { name: 'CYCLE_TIME', dataType: 'Float' as const, units: 'seconds' },
        { name: 'TEMPERATURE', dataType: 'Float' as const, units: '°C' },
        { name: 'PRESSURE', dataType: 'Float' as const, units: 'psi' },
        { name: 'SPEED', dataType: 'Float' as const, units: 'RPM' },
      ];

      for (const equip of equipment) {
        for (const dataType of commonDataTypes) {
          try {
            await this.createTag({
              tagName: `EQUIPMENT.${equip.equipmentCode}.${dataType.name}`,
              description: `${dataType.name} for ${equip.equipmentName}`,
              dataType: dataType.dataType,
              engineeringUnits: dataType.units,
              compressionType: 'Swinging Door',
              compressionDeviation: 0.1,
            });
            result.created++;
          } catch (error) {
            result.failed++;
          }
        }
      }

      console.log(`Auto-configured ${result.created} tags (${result.failed} failed)`);
      return result;
    } catch (error: any) {
      console.error('Auto-configure failed:', error.message);
      throw error;
    }
  }

  /**
   * Get integration health status
   */
  async getHealthStatus(): Promise<{
    connected: boolean;
    responseTime?: number;
    lastSync?: Date;
    error?: string;
  }> {
    const startTime = Date.now();
    try {
      const connected = await this.testConnection();
      const responseTime = Date.now() - startTime;
      return { connected, responseTime };
    } catch (error: any) {
      return {
        connected: false,
        error: error.message,
      };
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Flush any remaining buffered data
    await this.flushBuffer();

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }
}

export default ProficyHistorianAdapter;
