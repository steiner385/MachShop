/**
 * ETL Job Service
 * Issue #34: Database Direct Import/ETL Engine
 *
 * Manages ETL job definitions, execution, scheduling, and monitoring
 */

import { logger } from '../../logging/logger';
import DatabaseConnectionService, {
  DatabaseConfig,
  QueryResult
} from './database/DatabaseConnectionService';
import TransformationEngine, {
  FieldMapping,
  Transformation
} from './TransformationEngine';
import cron from 'node-cron';

export interface ETLJobDefinition {
  id?: string;
  name: string;
  description?: string;
  sourceConnectionId: string;
  targetEntityType: string;

  extraction: {
    query?: string;
    table?: string;
    where?: string;
    orderBy?: string;
    incremental?: {
      enabled: boolean;
      watermarkField: string;
      strategy: 'timestamp' | 'id_range';
    };
  };

  transformation: {
    fieldMappings: FieldMapping[];
    transformations: Transformation[];
  };

  load: {
    mode: 'insert' | 'upsert' | 'update';
    batchSize: number;
    parallelism: number;
    errorHandling: 'stop' | 'continue' | 'fail-batch';
  };

  schedule?: {
    enabled: boolean;
    cronExpression: string;
    timezone: string;
  };
}

export interface ETLJobExecution {
  id: string;
  jobId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PARTIAL';
  startedAt: Date;
  completedAt?: Date;
  duration?: number;

  extractedRows: number;
  transformedRows: number;
  loadedRows: number;
  failedRows: number;
  skippedRows: number;

  lastWatermark?: any;

  errors: ETLError[];
  warnings: ETLWarning[];
}

export interface ETLError {
  rowNumber?: number;
  message: string;
  sourceData?: Record<string, any>;
}

export interface ETLWarning {
  rowNumber?: number;
  message: string;
}

export interface PreviewResult {
  rows: any[];
  totalAvailable: number;
  columnNames: string[];
}

export class ETLJobService {
  private dbService: DatabaseConnectionService;
  private jobs: Map<string, ETLJobDefinition> = new Map();
  private executions: Map<string, ETLJobExecution> = new Map();
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.dbService = new DatabaseConnectionService();
  }

  /**
   * Create ETL job
   */
  async createJob(job: ETLJobDefinition): Promise<ETLJobDefinition> {
    try {
      const jobId = job.id || `job_${Date.now()}`;

      // Validate transformations
      const validation = TransformationEngine.validateTransformations(job.transformation.transformations);
      if (!validation.valid) {
        throw new Error(`Transformation validation failed: ${validation.errors.join(', ')}`);
      }

      const jobDef: ETLJobDefinition = {
        ...job,
        id: jobId
      };

      this.jobs.set(jobId, jobDef);

      logger.info('ETL job created', {
        jobId,
        jobName: job.name,
        targetEntityType: job.targetEntityType
      });

      return jobDef;
    } catch (error) {
      logger.error('Failed to create ETL job:', error);
      throw error;
    }
  }

  /**
   * Get ETL job
   */
  getJob(jobId: string): ETLJobDefinition | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Update ETL job
   */
  async updateJob(jobId: string, updates: Partial<ETLJobDefinition>): Promise<ETLJobDefinition> {
    try {
      const job = this.jobs.get(jobId);
      if (!job) {
        throw new Error(`Job not found: ${jobId}`);
      }

      const updated: ETLJobDefinition = {
        ...job,
        ...updates,
        id: jobId
      };

      // Validate transformations if modified
      if (updates.transformation) {
        const validation = TransformationEngine.validateTransformations(updates.transformation.transformations);
        if (!validation.valid) {
          throw new Error(`Transformation validation failed: ${validation.errors.join(', ')}`);
        }
      }

      this.jobs.set(jobId, updated);

      logger.info('ETL job updated', { jobId });

      return updated;
    } catch (error) {
      logger.error('Failed to update ETL job:', error);
      throw error;
    }
  }

  /**
   * Delete ETL job
   */
  async deleteJob(jobId: string): Promise<void> {
    try {
      const job = this.jobs.get(jobId);
      if (!job) {
        throw new Error(`Job not found: ${jobId}`);
      }

      // Cancel scheduled job if exists
      if (job.schedule?.enabled) {
        this.unscheduleJob(jobId);
      }

      this.jobs.delete(jobId);

      logger.info('ETL job deleted', { jobId });
    } catch (error) {
      logger.error('Failed to delete ETL job:', error);
      throw error;
    }
  }

  /**
   * Preview extraction
   */
  async previewExtraction(jobId: string, limit: number = 100): Promise<PreviewResult> {
    try {
      const job = this.jobs.get(jobId);
      if (!job) {
        throw new Error(`Job not found: ${jobId}`);
      }

      const query = this.buildExtractionQuery(job, limit);

      const result = await this.dbService.executeQuery(job.sourceConnectionId, query);

      return {
        rows: result.rows.slice(0, limit),
        totalAvailable: result.rowCount,
        columnNames: result.rows.length > 0 ? Object.keys(result.rows[0]) : []
      };
    } catch (error) {
      logger.error('Preview extraction failed:', error);
      throw error;
    }
  }

  /**
   * Execute ETL job
   */
  async executeJob(jobId: string, options?: { dryRun?: boolean }): Promise<ETLJobExecution> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    const executionId = `exec_${Date.now()}`;
    const execution: ETLJobExecution = {
      id: executionId,
      jobId,
      status: 'RUNNING',
      startedAt: new Date(),
      extractedRows: 0,
      transformedRows: 0,
      loadedRows: 0,
      failedRows: 0,
      skippedRows: 0,
      errors: [],
      warnings: []
    };

    this.executions.set(executionId, execution);

    try {
      logger.info('Starting ETL job execution', { jobId, executionId });

      // Build extraction query
      const query = this.buildExtractionQuery(job);

      // Execute extraction with streaming
      let rowNumber = 0;
      await this.dbService.streamQuery(job.sourceConnectionId, query, async (row: any) => {
        rowNumber++;
        execution.extractedRows++;

        // Transform
        const transformResult = TransformationEngine.transformRecord(
          row,
          job.transformation.fieldMappings,
          job.transformation.transformations
        );

        if (transformResult.success) {
          execution.transformedRows++;
          execution.loadedRows++; // In real implementation, would call persistence layer

          // Collect warnings
          if (transformResult.warnings.length > 0) {
            transformResult.warnings.forEach((warning: string) => {
              execution.warnings.push({
                rowNumber,
                message: warning
              });
            });
          }
        } else {
          execution.failedRows++;

          // Collect errors
          transformResult.errors.forEach((error: string) => {
            execution.errors.push({
              rowNumber,
              message: error,
              sourceData: row
            });
          });

          // Handle error strategy
          if (job.load.errorHandling === 'stop') {
            throw new Error(`ETL execution stopped due to error at row ${rowNumber}`);
          }
        }
      });

      execution.status = execution.failedRows > 0 ? 'PARTIAL' : 'COMPLETED';
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();

      logger.info('ETL job execution completed', {
        jobId,
        executionId,
        status: execution.status,
        extracted: execution.extractedRows,
        transformed: execution.transformedRows,
        loaded: execution.loadedRows,
        failed: execution.failedRows,
        duration: execution.duration
      });

      return execution;
    } catch (error) {
      execution.status = 'FAILED';
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();
      execution.errors.push({
        message: error instanceof Error ? error.message : String(error)
      });

      logger.error('ETL job execution failed:', {
        jobId,
        executionId,
        error
      });

      return execution;
    }
  }

  /**
   * Schedule ETL job
   */
  async scheduleJob(jobId: string, schedule: { cronExpression: string; timezone?: string }): Promise<void> {
    try {
      const job = this.jobs.get(jobId);
      if (!job) {
        throw new Error(`Job not found: ${jobId}`);
      }

      // Validate cron expression
      if (!cron.validate(schedule.cronExpression)) {
        throw new Error(`Invalid cron expression: ${schedule.cronExpression}`);
      }

      // Cancel existing schedule if any
      this.unscheduleJob(jobId);

      // Create new schedule
      const task = cron.schedule(schedule.cronExpression, async () => {
        try {
          logger.info('Executing scheduled ETL job', { jobId });
          await this.executeJob(jobId);
        } catch (error) {
          logger.error('Scheduled ETL job failed:', { jobId, error });
        }
      });

      this.scheduledJobs.set(jobId, task as any);

      // Update job with schedule config
      job.schedule = {
        enabled: true,
        cronExpression: schedule.cronExpression,
        timezone: schedule.timezone || 'UTC'
      };

      logger.info('ETL job scheduled', {
        jobId,
        cronExpression: schedule.cronExpression
      });
    } catch (error) {
      logger.error('Failed to schedule ETL job:', error);
      throw error;
    }
  }

  /**
   * Unschedule ETL job
   */
  unscheduleJob(jobId: string): void {
    const task = this.scheduledJobs.get(jobId);
    if (task) {
      task.stop();
      this.scheduledJobs.delete(jobId);

      const job = this.jobs.get(jobId);
      if (job && job.schedule) {
        job.schedule.enabled = false;
      }

      logger.info('ETL job unscheduled', { jobId });
    }
  }

  /**
   * Get execution status
   */
  getExecutionStatus(executionId: string): ETLJobExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * List jobs
   */
  listJobs(): ETLJobDefinition[] {
    return Array.from(this.jobs.values());
  }

  /**
   * List executions for job
   */
  listExecutions(jobId: string): ETLJobExecution[] {
    return Array.from(this.executions.values()).filter((exec) => exec.jobId === jobId);
  }

  /**
   * Build extraction query
   */
  private buildExtractionQuery(job: ETLJobDefinition, limit?: number): string {
    let query: string;

    if (job.extraction.query) {
      // Use custom query
      query = job.extraction.query;
    } else if (job.extraction.table) {
      // Build query from table
      query = `SELECT * FROM ${job.extraction.table}`;

      if (job.extraction.where) {
        query += ` WHERE ${job.extraction.where}`;
      }

      if (job.extraction.orderBy) {
        query += ` ORDER BY ${job.extraction.orderBy}`;
      }
    } else {
      throw new Error('Either custom query or table name must be specified');
    }

    if (limit) {
      query += ` LIMIT ${limit}`;
    }

    return query;
  }
}

export default ETLJobService;
