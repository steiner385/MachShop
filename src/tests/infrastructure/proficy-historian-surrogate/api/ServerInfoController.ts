import { Request, Response } from 'express';
import { SurrogateServerConfig } from '../server/ProficyHistorianSurrogate';

/**
 * Server Info Controller
 * Handles endpoints for server information and status
 */
export class ServerInfoController {
  private startTime: number = Date.now();

  constructor(private config: SurrogateServerConfig) {}

  /**
   * GET /historian/server/info
   * Get comprehensive server information
   */
  async getServerInfo(req: Request, res: Response): Promise<void> {
    try {
      const serverInfo = {
        ServerName: 'GE Proficy Historian Surrogate',
        Version: '1.0.0',
        Description: 'Mock implementation for integration testing',
        Vendor: 'MachShop3 Test Infrastructure',

        // Server capabilities
        Capabilities: {
          TimeSeriesStorage: true,
          TagManagement: true,
          RealTimeData: true,
          HistoricalQueries: true,
          Aggregations: true,
          DataCompression: this.config.storage.compressionEnabled,
          ErrorSimulation: true,
          PerformanceMonitoring: true
        },

        // API information
        API: {
          Version: '2.0',
          Protocol: 'REST',
          Format: 'JSON',
          Authentication: this.config.authentication.enabled ? this.config.authentication.authType : 'none',
          Endpoints: {
            ServerInfo: '/historian/server/info',
            ServerStatus: '/historian/server/status',
            Tags: '/historian/tags',
            DataWrite: '/historian/data/write',
            DataQuery: '/historian/data/query',
            DataAggregate: '/historian/data/aggregate',
            LatestValues: '/historian/data/latest',
            Health: '/historian/health'
          }
        },

        // Configuration summary
        Configuration: {
          MaxDataPoints: this.config.storage.maxDataPoints,
          RetentionHours: this.config.storage.retentionHours,
          CompressionEnabled: this.config.storage.compressionEnabled,
          AggregationEnabled: this.config.storage.aggregationEnabled,
          ErrorSimulation: this.config.errorSimulation.enabled,
          LatencySimulation: this.config.errorSimulation.latencySimulation
        },

        // Supported data types
        SupportedDataTypes: [
          { Name: 'Float', Description: 'Floating point numbers' },
          { Name: 'Integer', Description: 'Integer numbers' },
          { Name: 'String', Description: 'Text values' },
          { Name: 'Boolean', Description: 'True/false values' },
          { Name: 'DateTime', Description: 'Date and time values' }
        ],

        // Supported aggregation types
        SupportedAggregations: [
          { Name: 'Average', Description: 'Average value over time interval' },
          { Name: 'Minimum', Description: 'Minimum value over time interval' },
          { Name: 'Maximum', Description: 'Maximum value over time interval' },
          { Name: 'Count', Description: 'Number of data points in interval' },
          { Name: 'Sum', Description: 'Sum of values over time interval' },
          { Name: 'StandardDeviation', Description: 'Standard deviation of values' },
          { Name: 'Range', Description: 'Range (max - min) of values' }
        ],

        // Supported sampling modes
        SupportedSamplingModes: [
          { Name: 'RawByTime', Description: 'Raw data points by timestamp' },
          { Name: 'Interpolated', Description: 'Interpolated values at regular intervals' },
          { Name: 'Average', Description: 'Average values over intervals' },
          { Name: 'Minimum', Description: 'Minimum values over intervals' },
          { Name: 'Maximum', Description: 'Maximum values over intervals' },
          { Name: 'Count', Description: 'Count of data points over intervals' }
        ],

        // Time zone and format information
        TimeInfo: {
          ServerTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          CurrentTime: new Date().toISOString(),
          TimestampFormat: 'ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)',
          SupportedFormats: ['ISO 8601', 'Unix timestamp', 'RFC 3339']
        },

        // License and legal
        License: {
          Type: 'Testing/Development',
          Restrictions: 'For integration testing only',
          ExpirationDate: null,
          Features: 'All features enabled'
        },

        Timestamp: new Date().toISOString()
      };

      res.status(200).json(serverInfo);

    } catch (error: any) {
      console.error('Failed to get server info:', error);
      res.status(500).json({
        error: 'Failed to retrieve server information',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /historian/server/status
   * Get current server status and runtime information
   */
  async getServerStatus(req: Request, res: Response): Promise<void> {
    try {
      const uptime = Date.now() - this.startTime;
      const uptimeHours = Math.floor(uptime / (1000 * 60 * 60));
      const uptimeMinutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
      const uptimeSeconds = Math.floor((uptime % (1000 * 60)) / 1000);

      const status = {
        Status: 'Running',
        Health: 'Healthy',

        // Runtime information
        Runtime: {
          Uptime: uptime,
          UptimeFormatted: `${uptimeHours}h ${uptimeMinutes}m ${uptimeSeconds}s`,
          StartTime: new Date(this.startTime).toISOString(),
          CurrentTime: new Date().toISOString(),
          TimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },

        // Memory information
        Memory: this.getMemoryInfo(),

        // Service status
        Services: {
          TimeSeriesStorage: { Status: 'Running', Health: 'Healthy' },
          TagRegistry: { Status: 'Running', Health: 'Healthy' },
          ErrorSimulation: {
            Status: this.config.errorSimulation.enabled ? 'Running' : 'Disabled',
            Health: 'Healthy'
          },
          PerformanceMonitoring: { Status: 'Running', Health: 'Healthy' },
          Authentication: {
            Status: this.config.authentication.enabled ? 'Enabled' : 'Disabled',
            Type: this.config.authentication.authType
          }
        },

        // Configuration status
        ConfigurationStatus: {
          StorageConfigured: true,
          AuthenticationConfigured: this.config.authentication.enabled,
          ErrorSimulationConfigured: this.config.errorSimulation.enabled,
          LoggingConfigured: this.config.logging.enabled
        },

        // Environment information
        Environment: {
          NodeVersion: process.version,
          Platform: process.platform,
          Architecture: process.arch,
          ProcessId: process.pid
        },

        Timestamp: new Date().toISOString()
      };

      res.status(200).json(status);

    } catch (error: any) {
      console.error('Failed to get server status:', error);
      res.status(500).json({
        error: 'Failed to retrieve server status',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /historian/server/capabilities
   * Get detailed server capabilities
   */
  async getCapabilities(req: Request, res: Response): Promise<void> {
    try {
      const capabilities = {
        DataStorage: {
          MaxDataPoints: this.config.storage.maxDataPoints,
          RetentionHours: this.config.storage.retentionHours,
          CompressionSupported: true,
          CompressionEnabled: this.config.storage.compressionEnabled,
          SupportedCompressionTypes: ['None', 'Swinging Door', 'Boxcar']
        },

        DataTypes: {
          Numeric: {
            Supported: true,
            Types: ['Float', 'Integer'],
            Precision: 'Double precision (64-bit)',
            Range: 'IEEE 754 double precision'
          },
          Text: {
            Supported: true,
            MaxLength: 4096,
            Encoding: 'UTF-8'
          },
          Boolean: {
            Supported: true,
            Values: ['true', 'false']
          },
          DateTime: {
            Supported: true,
            Format: 'ISO 8601',
            Precision: 'Milliseconds',
            Range: '1970-01-01 to 2038-01-19'
          }
        },

        Querying: {
          MaxResultsPerQuery: 1000000,
          MaxTimeRangeMonths: 12,
          SupportedSamplingModes: ['RawByTime', 'Interpolated', 'Average', 'Minimum', 'Maximum', 'Count'],
          SupportedAggregations: ['Average', 'Minimum', 'Maximum', 'Count', 'Sum', 'StandardDeviation', 'Range'],
          FilteringSupported: true,
          QualityFilteringSupported: true,
          ValueFilteringSupported: true
        },

        Performance: {
          MaxWriteRate: '100,000 points/second',
          MaxQueryRate: '10,000 queries/second',
          TypicalWriteLatency: '< 10ms',
          TypicalQueryLatency: '< 100ms',
          ConcurrentUsers: 1000
        },

        Testing: {
          ErrorSimulation: this.config.errorSimulation.enabled,
          LatencySimulation: this.config.errorSimulation.latencySimulation,
          DataPatternGeneration: true,
          TestScenarios: true,
          PerformanceMetrics: true
        },

        Timestamp: new Date().toISOString()
      };

      res.status(200).json(capabilities);

    } catch (error: any) {
      console.error('Failed to get capabilities:', error);
      res.status(500).json({
        error: 'Failed to retrieve server capabilities',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /historian/server/version
   * Get version information
   */
  async getVersion(req: Request, res: Response): Promise<void> {
    try {
      const version = {
        ProductName: 'GE Proficy Historian Surrogate',
        Version: '1.0.0',
        BuildNumber: '1000',
        BuildDate: '2025-10-31',

        API: {
          Version: '2.0',
          Compatibility: ['1.0', '1.5', '2.0'],
          MinimumClientVersion: '1.0'
        },

        Dependencies: {
          NodeJS: process.version,
          Express: '^4.18.0',
          TypeScript: '^5.0.0'
        },

        Copyright: 'MachShop3 Test Infrastructure',
        License: 'MIT (Testing Only)',

        Timestamp: new Date().toISOString()
      };

      res.status(200).json(version);

    } catch (error: any) {
      console.error('Failed to get version:', error);
      res.status(500).json({
        error: 'Failed to retrieve version information',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Private helper methods

  /**
   * Get memory usage information
   */
  private getMemoryInfo(): any {
    const memoryUsage = process.memoryUsage();

    return {
      HeapUsed: {
        Bytes: memoryUsage.heapUsed,
        MB: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100
      },
      HeapTotal: {
        Bytes: memoryUsage.heapTotal,
        MB: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100
      },
      External: {
        Bytes: memoryUsage.external,
        MB: Math.round(memoryUsage.external / 1024 / 1024 * 100) / 100
      },
      RSS: {
        Bytes: memoryUsage.rss,
        MB: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100
      },
      HeapUtilization: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100 * 100) / 100
    };
  }
}