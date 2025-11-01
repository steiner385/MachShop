import { Request, Response } from 'express';
import { TimeSeriesStore } from '../storage/TimeSeriesStore';
import { TagRegistry } from '../storage/TagRegistry';
import { ErrorSimulator } from '../simulation/ErrorSimulator';
import { PerformanceMonitor } from '../monitoring/PerformanceMonitor';
import { SurrogateDataPoint, TagValue, WriteResult } from '../storage/schemas';

/**
 * Data Write Controller
 * Handles REST API endpoints for writing time-series data to the historian
 */
export class DataWriteController {
  constructor(
    private timeSeriesStore: TimeSeriesStore,
    private tagRegistry: TagRegistry,
    private errorSimulator: ErrorSimulator,
    private performanceMonitor: PerformanceMonitor
  ) {}

  /**
   * POST /historian/data/write
   * Write bulk data points to the historian
   */
  async writeData(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      // Validate request body
      if (!req.body || !req.body.Data) {
        res.status(400).json({
          error: 'Invalid request body. Expected { Data: [...] }',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const inputData = req.body.Data;
      if (!Array.isArray(inputData)) {
        res.status(400).json({
          error: 'Data must be an array of data points',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Convert input format to internal format
      const dataPoints: SurrogateDataPoint[] = [];
      const validationErrors: string[] = [];

      for (let i = 0; i < inputData.length; i++) {
        try {
          const point = this.convertToDataPoint(inputData[i]);
          dataPoints.push(point);
        } catch (error: any) {
          validationErrors.push(`Point ${i}: ${error.message}`);
        }
      }

      // If all points failed validation, return error
      if (dataPoints.length === 0 && validationErrors.length > 0) {
        res.status(400).json({
          error: 'All data points failed validation',
          validationErrors,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check if tags exist (create auto-tags if configured)
      const tagValidationResult = await this.validateTags(dataPoints);
      if (!tagValidationResult.success) {
        res.status(400).json({
          error: 'Tag validation failed',
          details: tagValidationResult.errors,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Write data to store
      const writeResult = await this.timeSeriesStore.writeDataPoints(dataPoints);

      // Format response to match Proficy Historian API
      const response = this.formatWriteResponse(writeResult, validationErrors);
      const statusCode = writeResult.success ? 200 : 207; // 207 for partial success

      res.status(statusCode).json(response);

    } catch (error: any) {
      console.error('Write operation failed:', error);
      res.status(500).json({
        error: 'Internal server error during write operation',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      // Record performance metrics
      const duration = Date.now() - startTime;
      this.performanceMonitor.recordWriteOperation(req.body?.Data?.length || 0, duration);
    }
  }

  /**
   * POST /historian/data/write/single
   * Write a single data point (convenience endpoint)
   */
  async writeSingleDataPoint(req: Request, res: Response): Promise<void> {
    try {
      // Convert single point to array format
      const singlePoint = req.body;
      req.body = { Data: [singlePoint] };

      // Delegate to bulk write
      await this.writeData(req, res);
    } catch (error: any) {
      res.status(500).json({
        error: 'Failed to write single data point',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * POST /historian/data/write/buffered
   * Write data points with buffering (for high-frequency writes)
   */
  async writeBufferedData(req: Request, res: Response): Promise<void> {
    try {
      if (!req.body || !req.body.Data) {
        res.status(400).json({
          error: 'Invalid request body. Expected { Data: [...] }',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const inputData = req.body.Data;
      const dataPoints: SurrogateDataPoint[] = [];

      // Convert and validate data points
      for (const point of inputData) {
        try {
          const dataPoint = this.convertToDataPoint(point);
          dataPoints.push(dataPoint);
        } catch (error: any) {
          // Log validation errors but continue processing
          console.warn(`Skipping invalid data point: ${error.message}`);
        }
      }

      // For buffered writes, we would typically add to a buffer instead of immediate write
      // For this implementation, we'll write immediately but acknowledge buffering concept
      const writeResult = await this.timeSeriesStore.writeDataPoints(dataPoints);

      res.status(202).json({ // 202 Accepted for buffered operation
        message: 'Data points accepted for buffered write',
        pointsAccepted: dataPoints.length,
        pointsRejected: inputData.length - dataPoints.length,
        bufferStatus: 'processing',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      res.status(500).json({
        error: 'Buffered write operation failed',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * POST /historian/data/write/validate
   * Validate data points without writing (dry run)
   */
  async validateDataPoints(req: Request, res: Response): Promise<void> {
    try {
      if (!req.body || !req.body.Data) {
        res.status(400).json({
          error: 'Invalid request body. Expected { Data: [...] }',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const inputData = req.body.Data;
      const validationResults: ValidationResult[] = [];

      for (let i = 0; i < inputData.length; i++) {
        const result: ValidationResult = {
          index: i,
          valid: false,
          errors: []
        };

        try {
          // Validate data point format
          const dataPoint = this.convertToDataPoint(inputData[i]);

          // Check if tag exists
          const tagExists = await this.tagRegistry.tagExists(dataPoint.tagName);
          if (!tagExists) {
            result.errors.push(`Tag does not exist: ${dataPoint.tagName}`);
          }

          // Additional validations can be added here
          result.valid = result.errors.length === 0;

        } catch (error: any) {
          result.errors.push(error.message);
        }

        validationResults.push(result);
      }

      const validCount = validationResults.filter(r => r.valid).length;
      const invalidCount = validationResults.length - validCount;

      res.status(200).json({
        totalPoints: validationResults.length,
        validPoints: validCount,
        invalidPoints: invalidCount,
        validationResults,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      res.status(500).json({
        error: 'Validation operation failed',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Private helper methods

  /**
   * Convert Proficy format data point to internal format
   */
  private convertToDataPoint(input: any): SurrogateDataPoint {
    // Validate required fields
    if (!input.TagName || typeof input.TagName !== 'string') {
      throw new Error('TagName is required and must be a string');
    }

    if (input.Value === undefined || input.Value === null) {
      throw new Error('Value is required');
    }

    if (!input.Timestamp) {
      throw new Error('Timestamp is required');
    }

    // Parse timestamp
    let timestamp: Date;
    try {
      timestamp = new Date(input.Timestamp);
      if (isNaN(timestamp.getTime())) {
        throw new Error('Invalid timestamp format');
      }
    } catch (error) {
      throw new Error('Invalid timestamp format');
    }

    // Validate timestamp is not too far in the future
    const maxFutureTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    if (timestamp > maxFutureTime) {
      throw new Error('Timestamp cannot be more than 24 hours in the future');
    }

    // Validate timestamp is not too old
    const minPastTime = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year
    if (timestamp < minPastTime) {
      throw new Error('Timestamp cannot be more than 1 year in the past');
    }

    // Validate and convert value
    const value = this.validateAndConvertValue(input.Value);

    // Validate quality
    let quality = 100; // Default quality
    if (input.Quality !== undefined) {
      if (typeof input.Quality !== 'number' || input.Quality < 0 || input.Quality > 100) {
        throw new Error('Quality must be a number between 0 and 100');
      }
      quality = input.Quality;
    }

    return {
      tagName: input.TagName,
      timestamp,
      value,
      quality,
      source: input.Source || 'api'
    };
  }

  /**
   * Validate and convert value based on expected type
   */
  private validateAndConvertValue(value: any): TagValue {
    // Handle different value types
    if (typeof value === 'number') {
      if (!isFinite(value)) {
        throw new Error('Numeric value must be finite');
      }
      return value;
    }

    if (typeof value === 'string') {
      // Try to parse as number if it looks numeric
      const numericValue = Number(value);
      if (!isNaN(numericValue) && isFinite(numericValue)) {
        return numericValue;
      }
      return value;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    // Try to parse Date
    if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
      return new Date(value);
    }

    // For other types, convert to string
    return String(value);
  }

  /**
   * Validate that all required tags exist
   */
  private async validateTags(dataPoints: SurrogateDataPoint[]): Promise<TagValidationResult> {
    const result: TagValidationResult = {
      success: true,
      errors: []
    };

    const uniqueTags = new Set(dataPoints.map(p => p.tagName));

    for (const tagName of uniqueTags) {
      const tagExists = await this.tagRegistry.tagExists(tagName);
      if (!tagExists) {
        result.success = false;
        result.errors.push(`Tag does not exist: ${tagName}`);
      }
    }

    return result;
  }

  /**
   * Format write response to match Proficy Historian API
   */
  private formatWriteResponse(writeResult: WriteResult, validationErrors: string[]): any {
    const response: any = {
      Success: writeResult.success,
      PointsWritten: writeResult.pointsWritten,
      PointsFailed: writeResult.pointsFailed,
      ExecutionTime: writeResult.executionTime,
      Throughput: writeResult.throughput,
      Timestamp: new Date().toISOString()
    };

    // Add errors if any occurred
    if (writeResult.errors.length > 0 || validationErrors.length > 0) {
      response.Errors = [
        ...writeResult.errors.map(e => ({
          TagName: e.tagName,
          Timestamp: e.timestamp.toISOString(),
          Error: e.error,
          ErrorCode: e.errorCode
        })),
        ...validationErrors.map(e => ({
          TagName: 'validation',
          Error: e,
          ErrorCode: 'VALIDATION_ERROR'
        }))
      ];
    }

    // Add warnings if any
    if (writeResult.warnings.length > 0) {
      response.Warnings = writeResult.warnings;
    }

    // Add performance metrics
    response.Performance = {
      ThroughputPointsPerSecond: writeResult.throughput,
      AverageLatencyMs: writeResult.executionTime / (writeResult.pointsWritten || 1),
      SuccessRate: writeResult.pointsWritten / (writeResult.pointsWritten + writeResult.pointsFailed)
    };

    return response;
  }
}

/**
 * Validation result for individual data point
 */
interface ValidationResult {
  index: number;
  valid: boolean;
  errors: string[];
}

/**
 * Tag validation result
 */
interface TagValidationResult {
  success: boolean;
  errors: string[];
}