import { Request, Response } from 'express';
import { TimeSeriesStore } from '../storage/TimeSeriesStore';
import { TagRegistry } from '../storage/TagRegistry';
import { ErrorSimulator } from '../simulation/ErrorSimulator';
import { PerformanceMonitor } from '../monitoring/PerformanceMonitor';
import {
  TimeSeriesQuery,
  QueryResult,
  SamplingMode,
  AggregationType,
  BucketInterval,
  QualityFilter,
  ValueFilter
} from '../storage/schemas';

/**
 * Data Query Controller
 * Handles REST API endpoints for querying time-series data from the historian
 */
export class DataQueryController {
  constructor(
    private timeSeriesStore: TimeSeriesStore,
    private tagRegistry: TagRegistry,
    private errorSimulator: ErrorSimulator,
    private performanceMonitor: PerformanceMonitor
  ) {}

  /**
   * GET /historian/data/query
   * Query historical time-series data
   */
  async queryData(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      // Parse and validate query parameters
      const query = await this.parseQueryParameters(req.query);

      // Validate tags exist
      const tagValidation = await this.validateQueryTags(query.tagNames);
      if (!tagValidation.success) {
        res.status(400).json({
          error: 'Tag validation failed',
          details: tagValidation.errors,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Execute query
      const queryResult = await this.timeSeriesStore.queryData(query);

      // Format response to match Proficy Historian API
      const response = this.formatQueryResponse(queryResult, query);
      const statusCode = queryResult.success ? 200 : 500;

      res.status(statusCode).json(response);

    } catch (error: any) {
      console.error('Query operation failed:', error);
      res.status(400).json({
        error: 'Invalid query parameters',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      // Record performance metrics
      const duration = Date.now() - startTime;
      this.performanceMonitor.recordReadOperation(0, duration); // Will be updated with actual result count
    }
  }

  /**
   * GET /historian/data/aggregate
   * Query aggregated time-series data
   */
  async queryAggregatedData(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      // Parse aggregation parameters
      const {
        tagNames,
        startTime: queryStartTime,
        endTime: queryEndTime,
        aggregationType,
        interval
      } = this.parseAggregationParameters(req.query);

      // Validate parameters
      if (!tagNames || tagNames.length === 0) {
        res.status(400).json({
          error: 'TagNames parameter is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Execute aggregation query
      const queryResult = await this.timeSeriesStore.queryAggregatedData(
        tagNames,
        queryStartTime,
        queryEndTime,
        aggregationType,
        interval
      );

      // Format aggregation response
      const response = this.formatAggregationResponse(queryResult);
      const statusCode = queryResult.success ? 200 : 500;

      res.status(statusCode).json(response);

    } catch (error: any) {
      console.error('Aggregation query failed:', error);
      res.status(400).json({
        error: 'Invalid aggregation parameters',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      const duration = Date.now() - startTime;
      this.performanceMonitor.recordReadOperation(0, duration);
    }
  }

  /**
   * GET /historian/data/latest
   * Get latest values for specified tags
   */
  async getLatestValues(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      // Parse tag names
      const tagNamesParam = req.query.TagNames as string;
      if (!tagNamesParam) {
        res.status(400).json({
          error: 'TagNames parameter is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const tagNames = tagNamesParam.split(',').map(tag => tag.trim());

      // Get latest values
      const queryResult = await this.timeSeriesStore.getLatestValues(tagNames);

      // Format response
      const response = this.formatLatestValuesResponse(queryResult);
      const statusCode = queryResult.success ? 200 : 500;

      res.status(statusCode).json(response);

    } catch (error: any) {
      console.error('Latest values query failed:', error);
      res.status(500).json({
        error: 'Failed to retrieve latest values',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      const duration = Date.now() - startTime;
      this.performanceMonitor.recordReadOperation(0, duration);
    }
  }

  /**
   * GET /historian/data/summary
   * Get data summary statistics for tags
   */
  async getDataSummary(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const tagNamesParam = req.query.TagNames as string;
      const startTimeParam = req.query.StartTime as string;
      const endTimeParam = req.query.EndTime as string;

      if (!tagNamesParam || !startTimeParam || !endTimeParam) {
        res.status(400).json({
          error: 'TagNames, StartTime, and EndTime parameters are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const tagNames = tagNamesParam.split(',').map(tag => tag.trim());
      const startTimeValue = new Date(startTimeParam);
      const endTimeValue = new Date(endTimeParam);

      // Generate summary for each tag
      const summaries = await Promise.all(
        tagNames.map(tagName => this.generateTagSummary(tagName, startTimeValue, endTimeValue))
      );

      res.status(200).json({
        Success: true,
        TagSummaries: summaries,
        Timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Data summary query failed:', error);
      res.status(500).json({
        error: 'Failed to generate data summary',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      const duration = Date.now() - startTime;
      this.performanceMonitor.recordReadOperation(0, duration);
    }
  }

  /**
   * GET /historian/data/count
   * Get count of data points for tags in time range
   */
  async getDataPointCount(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const query = await this.parseQueryParameters(req.query);

      // Create a count-only query
      const countQuery: TimeSeriesQuery = {
        ...query,
        maxResults: undefined, // Remove limit for accurate count
        samplingMode: SamplingMode.COUNT
      };

      const queryResult = await this.timeSeriesStore.queryData(countQuery);

      res.status(200).json({
        Success: queryResult.success,
        TagCounts: query.tagNames.map(tagName => ({
          TagName: tagName,
          Count: queryResult.dataPoints.filter(p => p.tagName === tagName).length
        })),
        TotalCount: queryResult.recordCount,
        Timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      res.status(400).json({
        error: 'Invalid count query parameters',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      const duration = Date.now() - startTime;
      this.performanceMonitor.recordReadOperation(0, duration);
    }
  }

  // Private helper methods

  /**
   * Parse query parameters from HTTP request
   */
  private async parseQueryParameters(query: any): Promise<TimeSeriesQuery> {
    // Required parameters
    const tagNamesParam = query.TagNames as string;
    const startTimeParam = query.StartTime as string;
    const endTimeParam = query.EndTime as string;

    if (!tagNamesParam) {
      throw new Error('TagNames parameter is required');
    }
    if (!startTimeParam) {
      throw new Error('StartTime parameter is required');
    }
    if (!endTimeParam) {
      throw new Error('EndTime parameter is required');
    }

    // Parse tag names
    const tagNames = tagNamesParam.split(',').map(tag => tag.trim());

    // Parse timestamps
    const startTime = new Date(startTimeParam);
    const endTime = new Date(endTimeParam);

    if (isNaN(startTime.getTime())) {
      throw new Error('Invalid StartTime format');
    }
    if (isNaN(endTime.getTime())) {
      throw new Error('Invalid EndTime format');
    }
    if (startTime >= endTime) {
      throw new Error('StartTime must be before EndTime');
    }

    // Optional parameters with defaults
    const samplingMode = this.parseSamplingMode(query.SamplingMode);
    const intervalMilliseconds = query.IntervalMilliseconds ? parseInt(query.IntervalMilliseconds) : undefined;
    const maxResults = query.MaxResults ? parseInt(query.MaxResults) : 10000;

    // Quality filtering
    const qualityFilter = this.parseQualityFilter(query);

    // Value filtering
    const valueFilter = this.parseValueFilter(query);

    // Aggregation parameters
    const aggregationType = this.parseAggregationType(query.AggregationType);
    const aggregationInterval = this.parseAggregationInterval(query.AggregationInterval);

    return {
      tagNames,
      startTime,
      endTime,
      samplingMode,
      intervalMilliseconds,
      maxResults,
      qualityFilter,
      valueFilter,
      aggregationType,
      aggregationInterval
    };
  }

  /**
   * Parse aggregation parameters
   */
  private parseAggregationParameters(query: any): {
    tagNames: string[];
    startTime: Date;
    endTime: Date;
    aggregationType: AggregationType;
    interval: BucketInterval;
  } {
    const tagNamesParam = query.TagNames as string;
    const startTimeParam = query.StartTime as string;
    const endTimeParam = query.EndTime as string;
    const aggregationTypeParam = query.AggregationType as string;
    const intervalParam = query.Interval as string;

    if (!tagNamesParam || !startTimeParam || !endTimeParam || !aggregationTypeParam) {
      throw new Error('TagNames, StartTime, EndTime, and AggregationType are required');
    }

    const tagNames = tagNamesParam.split(',').map(tag => tag.trim());
    const startTime = new Date(startTimeParam);
    const endTime = new Date(endTimeParam);
    const aggregationType = this.parseAggregationType(aggregationTypeParam);
    const interval = this.parseAggregationInterval(intervalParam) || BucketInterval.HOUR;

    return {
      tagNames,
      startTime,
      endTime,
      aggregationType,
      interval
    };
  }

  /**
   * Parse sampling mode from string
   */
  private parseSamplingMode(mode: string | undefined): SamplingMode {
    if (!mode) return SamplingMode.RAW_BY_TIME;

    switch (mode.toUpperCase()) {
      case 'RAWBYTIME': return SamplingMode.RAW_BY_TIME;
      case 'INTERPOLATED': return SamplingMode.INTERPOLATED;
      case 'AVERAGE': return SamplingMode.AVERAGE;
      case 'MINIMUM': return SamplingMode.MINIMUM;
      case 'MAXIMUM': return SamplingMode.MAXIMUM;
      case 'COUNT': return SamplingMode.COUNT;
      default: return SamplingMode.RAW_BY_TIME;
    }
  }

  /**
   * Parse aggregation type from string
   */
  private parseAggregationType(type: string | undefined): AggregationType | undefined {
    if (!type) return undefined;

    switch (type.toUpperCase()) {
      case 'AVERAGE': return AggregationType.AVERAGE;
      case 'MINIMUM': return AggregationType.MINIMUM;
      case 'MAXIMUM': return AggregationType.MAXIMUM;
      case 'COUNT': return AggregationType.COUNT;
      case 'SUM': return AggregationType.SUM;
      case 'STANDARDDEVIATION': return AggregationType.STANDARD_DEVIATION;
      case 'RANGE': return AggregationType.RANGE;
      default: return undefined;
    }
  }

  /**
   * Parse aggregation interval from string
   */
  private parseAggregationInterval(interval: string | undefined): BucketInterval | undefined {
    if (!interval) return undefined;

    switch (interval.toLowerCase()) {
      case '1m': case 'minute': return BucketInterval.MINUTE;
      case '5m': case 'fiveminutes': return BucketInterval.FIVE_MINUTES;
      case '1h': case 'hour': return BucketInterval.HOUR;
      case '1d': case 'day': return BucketInterval.DAY;
      default: return undefined;
    }
  }

  /**
   * Parse quality filter parameters
   */
  private parseQualityFilter(query: any): QualityFilter | undefined {
    const minQuality = query.MinQuality ? parseInt(query.MinQuality) : undefined;
    const maxQuality = query.MaxQuality ? parseInt(query.MaxQuality) : undefined;
    const excludeBadQuality = query.ExcludeBadQuality === 'true';

    if (minQuality !== undefined || maxQuality !== undefined || excludeBadQuality) {
      return {
        minQuality: minQuality || 0,
        maxQuality: maxQuality || 100,
        excludeBadQuality
      };
    }

    return undefined;
  }

  /**
   * Parse value filter parameters
   */
  private parseValueFilter(query: any): ValueFilter | undefined {
    const minValue = query.MinValue ? parseFloat(query.MinValue) : undefined;
    const maxValue = query.MaxValue ? parseFloat(query.MaxValue) : undefined;
    const stringPattern = query.StringPattern as string;
    const booleanValue = query.BooleanValue ? query.BooleanValue === 'true' : undefined;

    if (minValue !== undefined || maxValue !== undefined || stringPattern || booleanValue !== undefined) {
      return {
        minValue,
        maxValue,
        stringPattern,
        booleanValue
      };
    }

    return undefined;
  }

  /**
   * Validate that queried tags exist
   */
  private async validateQueryTags(tagNames: string[]): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    for (const tagName of tagNames) {
      const exists = await this.tagRegistry.tagExists(tagName);
      if (!exists) {
        errors.push(`Tag does not exist: ${tagName}`);
      }
    }

    return {
      success: errors.length === 0,
      errors
    };
  }

  /**
   * Format query response to match Proficy Historian API
   */
  private formatQueryResponse(queryResult: QueryResult, query: TimeSeriesQuery): any {
    const response: any = {
      Success: queryResult.success,
      RecordCount: queryResult.recordCount,
      TotalRecords: queryResult.totalRecords,
      ExecutionTime: queryResult.executionTime,
      FromCache: queryResult.fromCache,
      Timestamp: new Date().toISOString()
    };

    if (queryResult.success) {
      // Format data points
      response.Data = queryResult.dataPoints.map(point => ({
        TagName: point.tagName,
        Timestamp: point.timestamp.toISOString(),
        Value: point.value,
        Quality: point.quality
      }));

      // Add query metadata
      response.Query = {
        TagNames: query.tagNames,
        StartTime: query.startTime.toISOString(),
        EndTime: query.endTime.toISOString(),
        SamplingMode: query.samplingMode,
        MaxResults: query.maxResults
      };
    }

    if (queryResult.error) {
      response.Error = queryResult.error;
    }

    if (queryResult.warnings && queryResult.warnings.length > 0) {
      response.Warnings = queryResult.warnings;
    }

    return response;
  }

  /**
   * Format aggregation response
   */
  private formatAggregationResponse(queryResult: QueryResult): any {
    const response: any = {
      Success: queryResult.success,
      RecordCount: queryResult.recordCount,
      ExecutionTime: queryResult.executionTime,
      Timestamp: new Date().toISOString()
    };

    if (queryResult.success && queryResult.aggregatedData) {
      response.AggregatedData = queryResult.aggregatedData.map(agg => ({
        TagName: agg.tagName,
        AggregationType: agg.aggregationType,
        Interval: agg.interval,
        StartTime: agg.startTime.toISOString(),
        EndTime: agg.endTime.toISOString(),
        Value: agg.value,
        Count: agg.count,
        Quality: agg.quality
      }));
    }

    if (queryResult.error) {
      response.Error = queryResult.error;
    }

    return response;
  }

  /**
   * Format latest values response
   */
  private formatLatestValuesResponse(queryResult: QueryResult): any {
    return {
      Success: queryResult.success,
      LatestValues: queryResult.dataPoints.map(point => ({
        TagName: point.tagName,
        Timestamp: point.timestamp.toISOString(),
        Value: point.value,
        Quality: point.quality
      })),
      Timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate tag summary statistics
   */
  private async generateTagSummary(tagName: string, startTime: Date, endTime: Date): Promise<any> {
    // Query raw data for the tag
    const query: TimeSeriesQuery = {
      tagNames: [tagName],
      startTime,
      endTime,
      samplingMode: SamplingMode.RAW_BY_TIME
    };

    const queryResult = await this.timeSeriesStore.queryData(query);

    if (!queryResult.success || queryResult.dataPoints.length === 0) {
      return {
        TagName: tagName,
        Count: 0,
        HasData: false
      };
    }

    const values = queryResult.dataPoints
      .filter(p => typeof p.value === 'number')
      .map(p => p.value as number);

    const summary = {
      TagName: tagName,
      Count: queryResult.dataPoints.length,
      HasData: true,
      StartTime: startTime.toISOString(),
      EndTime: endTime.toISOString(),
      FirstTimestamp: queryResult.dataPoints[0].timestamp.toISOString(),
      LastTimestamp: queryResult.dataPoints[queryResult.dataPoints.length - 1].timestamp.toISOString()
    };

    // Add numeric statistics if applicable
    if (values.length > 0) {
      Object.assign(summary, {
        MinValue: Math.min(...values),
        MaxValue: Math.max(...values),
        AverageValue: values.reduce((a, b) => a + b, 0) / values.length,
        StandardDeviation: this.calculateStandardDeviation(values)
      });
    }

    return summary;
  }

  /**
   * Calculate standard deviation
   */
  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }
}