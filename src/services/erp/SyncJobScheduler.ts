/**
 * SyncJobScheduler - Manages cron scheduling and execution of ERP sync jobs
 * Issue #60: Phase 2 - Async sync engine
 *
 * Orchestrates:
 * - BullMQ job queue creation and configuration
 * - Sync job registration and processor setup
 * - Cron-based job scheduling
 * - Retry handling with exponential backoff
 * - Progress tracking and status updates
 */

import { Queue, Worker, QueueScheduler } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import ERPIntegrationService from './ERPIntegrationService';

// Import all sync job classes
import { BaseSyncJob, SyncJobData, SyncJobResult } from './jobs/BaseSyncJob';
import { SupplierSyncJob } from './jobs/SupplierSyncJob';
import { PurchaseOrderSyncJob } from './jobs/PurchaseOrderSyncJob';
import { CostSyncJob } from './jobs/CostSyncJob';
import { ShipmentNotificationJob } from './jobs/ShipmentNotificationJob';
import { InventoryTransactionJob } from './jobs/InventoryTransactionJob';

/**
 * Configuration for sync job scheduling
 */
export interface SyncJobScheduleConfig {
  jobType: string;
  enabled: boolean;
  cronExpression?: string;
  frequencyMinutes?: number;
  batchSize?: number;
  maxRetries?: number;
  retryBackoffSeconds?: number;
}

/**
 * Sync job scheduler and orchestrator
 */
export class SyncJobScheduler {
  private prisma: PrismaClient;
  private erpService: ERPIntegrationService;
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private queueSchedulers: Map<string, QueueScheduler> = new Map();
  private syncJobs: Map<string, typeof BaseSyncJob> = new Map();
  private isInitialized = false;

  constructor(prisma?: PrismaClient, erpService?: ERPIntegrationService) {
    this.prisma = prisma || new PrismaClient();
    this.erpService = erpService || new ERPIntegrationService(this.prisma);

    // Register all sync job classes
    this.registerSyncJobs();
  }

  /**
   * Register all available sync job classes
   */
  private registerSyncJobs(): void {
    this.syncJobs.set('SupplierSync', SupplierSyncJob);
    this.syncJobs.set('PurchaseOrderSync', PurchaseOrderSyncJob);
    this.syncJobs.set('CostSync', CostSyncJob);
    this.syncJobs.set('ShipmentNotification', ShipmentNotificationJob);
    this.syncJobs.set('InventoryTransaction', InventoryTransactionJob);

    logger.info('Registered sync job classes', {
      jobCount: this.syncJobs.size,
    });
  }

  /**
   * Initialize the scheduler and set up job queues
   */
  async initialize(redisConfig?: any): Promise<void> {
    try {
      logger.info('Initializing ERP Sync Job Scheduler');

      // Get all enabled ERP integrations
      const integrations = await this.prisma.erpIntegration.findMany({
        where: { enabled: true },
      });

      // Initialize queue for each integration
      for (const integration of integrations) {
        await this.initializeIntegrationQueue(integration, redisConfig);
      }

      this.isInitialized = true;

      logger.info('ERP Sync Job Scheduler initialized successfully', {
        integrationCount: integrations.length,
      });
    } catch (error) {
      logger.error('Failed to initialize ERP Sync Job Scheduler', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Initialize job queue for a specific ERP integration
   */
  private async initializeIntegrationQueue(
    integration: any,
    redisConfig?: any
  ): Promise<void> {
    const queueName = `erp-sync-${integration.id}`;

    try {
      // Create the job queue with Redis connection
      const queue = new Queue(queueName, {
        connection: redisConfig || {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
        },
      });

      // Create queue scheduler for cron support
      const scheduler = new QueueScheduler(queueName, {
        connection: redisConfig || {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
        },
      });

      // Create worker to process jobs
      const worker = new Worker(
        queueName,
        async (job) => {
          return await this.processJob(integration.id, job);
        },
        {
          connection: redisConfig || {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
          },
          concurrency: 1, // Process one job at a time per integration
        }
      );

      // Store references
      this.queues.set(integration.id, queue);
      this.workers.set(integration.id, worker);
      this.queueSchedulers.set(integration.id, scheduler);

      // Schedule configured jobs
      await this.scheduleIntegrationJobs(queue, integration);

      logger.info(`Queue initialized for integration: ${integration.name}`, {
        integrationId: integration.id,
        queueName,
      });
    } catch (error) {
      logger.error(`Failed to initialize queue for integration: ${integration.name}`, {
        integrationId: integration.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Schedule sync jobs for an integration based on its configuration
   */
  private async scheduleIntegrationJobs(queue: Queue, integration: any): Promise<void> {
    try {
      // Get or create default schedule if none exists
      let schedule = integration.syncSchedule || this.getDefaultSchedule();

      // Add each configured job to the queue
      for (const jobConfig of schedule) {
        if (!jobConfig.enabled) {
          continue;
        }

        // Schedule with repeat pattern for recurring jobs
        if (jobConfig.cronExpression) {
          await queue.add(
            `${integration.id}-${jobConfig.jobType}`,
            {
              integrationId: integration.id,
              entityType: jobConfig.jobType,
              batchSize: jobConfig.batchSize || 100,
            } as SyncJobData,
            {
              repeat: {
                pattern: jobConfig.cronExpression,
              },
              removeOnComplete: true,
              removeOnFail: false,
              attempts: jobConfig.maxRetries || 3,
              backoff: {
                type: 'exponential',
                delay: (jobConfig.retryBackoffSeconds || 60) * 1000,
              },
            }
          );

          logger.debug(`Scheduled recurring job: ${jobConfig.jobType}`, {
            integrationId: integration.id,
            cronExpression: jobConfig.cronExpression,
          });
        } else if (jobConfig.frequencyMinutes) {
          // Schedule with interval-based repeat
          await queue.add(
            `${integration.id}-${jobConfig.jobType}`,
            {
              integrationId: integration.id,
              entityType: jobConfig.jobType,
              batchSize: jobConfig.batchSize || 100,
            } as SyncJobData,
            {
              repeat: {
                every: jobConfig.frequencyMinutes * 60 * 1000,
              },
              removeOnComplete: true,
              removeOnFail: false,
              attempts: jobConfig.maxRetries || 3,
              backoff: {
                type: 'exponential',
                delay: (jobConfig.retryBackoffSeconds || 60) * 1000,
              },
            }
          );

          logger.debug(`Scheduled interval job: ${jobConfig.jobType}`, {
            integrationId: integration.id,
            frequencyMinutes: jobConfig.frequencyMinutes,
          });
        }
      }
    } catch (error) {
      logger.warn(`Failed to schedule jobs for integration`, {
        integrationId: integration.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get default sync schedule for new integrations
   */
  private getDefaultSchedule(): SyncJobScheduleConfig[] {
    return [
      {
        jobType: 'SupplierSync',
        enabled: true,
        frequencyMinutes: 60, // Hourly
        batchSize: 100,
        maxRetries: 3,
        retryBackoffSeconds: 60,
      },
      {
        jobType: 'PurchaseOrderSync',
        enabled: true,
        frequencyMinutes: 30, // Every 30 minutes
        batchSize: 100,
        maxRetries: 3,
        retryBackoffSeconds: 60,
      },
      {
        jobType: 'CostSync',
        enabled: true,
        frequencyMinutes: 120, // Every 2 hours
        batchSize: 50,
        maxRetries: 3,
        retryBackoffSeconds: 120,
      },
      {
        jobType: 'ShipmentNotification',
        enabled: true,
        frequencyMinutes: 15, // Every 15 minutes
        batchSize: 200,
        maxRetries: 5,
        retryBackoffSeconds: 30,
      },
      {
        jobType: 'InventoryTransaction',
        enabled: true,
        frequencyMinutes: 60, // Hourly
        batchSize: 100,
        maxRetries: 3,
        retryBackoffSeconds: 60,
      },
    ];
  }

  /**
   * Process a queued sync job
   */
  private async processJob(integrationId: string, job: any): Promise<SyncJobResult> {
    const jobData: SyncJobData = job.data;

    try {
      logger.info(`Processing sync job: ${jobData.entityType}`, {
        integrationId,
        jobId: job.id,
        jobName: job.name,
      });

      // Get the sync job class
      const SyncJobClass = this.syncJobs.get(jobData.entityType);
      if (!SyncJobClass) {
        throw new Error(`Unknown sync job type: ${jobData.entityType}`);
      }

      // Instantiate and execute the sync job
      const syncJob = new SyncJobClass(this.prisma, this.erpService);
      const result = await syncJob.handle(jobData, job);

      logger.info(`Completed sync job: ${jobData.entityType}`, {
        integrationId,
        jobId: job.id,
        success: result.success,
        processedCount: result.processedCount,
        failedCount: result.failedCount,
        duration: result.duration,
      });

      return result;
    } catch (error) {
      logger.error(`Failed to process sync job: ${jobData.entityType}`, {
        integrationId,
        jobId: job.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw error;
    }
  }

  /**
   * Manually queue a sync job (on-demand)
   */
  async queueSyncJob(
    integrationId: string,
    jobType: string,
    options?: {
      batchSize?: number;
      dryRun?: boolean;
      filters?: Record<string, any>;
    }
  ): Promise<any> {
    try {
      const queue = this.queues.get(integrationId);
      if (!queue) {
        throw new Error(`Queue not initialized for integration: ${integrationId}`);
      }

      const job = await queue.add(
        `${integrationId}-${jobType}-manual`,
        {
          integrationId,
          entityType: jobType,
          batchSize: options?.batchSize || 100,
          dryRun: options?.dryRun || false,
          filters: options?.filters || {},
        } as SyncJobData,
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 60000,
          },
        }
      );

      logger.info(`Queued manual sync job: ${jobType}`, {
        integrationId,
        jobId: job.id,
      });

      return job;
    } catch (error) {
      logger.error(`Failed to queue sync job`, {
        integrationId,
        jobType,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Process pending retries for failed transactions
   */
  async processPendingRetries(integrationId: string): Promise<void> {
    try {
      const pendingRetries = await this.erpService.getPendingRetries(integrationId);

      logger.info(`Processing ${pendingRetries.length} pending retries`, {
        integrationId,
      });

      for (const transaction of pendingRetries) {
        // Queue a retry job for the failed transaction
        const queue = this.queues.get(integrationId);
        if (queue) {
          await queue.add(
            `${integrationId}-retry-${transaction.id}`,
            {
              integrationId,
              entityType: transaction.entityType,
              transactionId: transaction.id,
              isRetry: true,
            } as SyncJobData,
            {
              priority: 10, // High priority for retries
              attempts: transaction.retryCount + 1,
              backoff: {
                type: 'exponential',
                delay: 60000,
              },
            }
          );
        }
      }
    } catch (error) {
      logger.error(`Failed to process pending retries`, {
        integrationId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get job queue statistics
   */
  async getQueueStats(integrationId: string): Promise<any> {
    try {
      const queue = this.queues.get(integrationId);
      if (!queue) {
        throw new Error(`Queue not found for integration: ${integrationId}`);
      }

      const counts = await queue.getJobCounts();

      return {
        integrationId,
        active: counts.active,
        completed: counts.completed,
        failed: counts.failed,
        delayed: counts.delayed,
        waiting: counts.waiting,
      };
    } catch (error) {
      logger.error(`Failed to get queue stats`, {
        integrationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Shutdown the scheduler and clean up resources
   */
  async shutdown(): Promise<void> {
    try {
      logger.info('Shutting down ERP Sync Job Scheduler');

      // Close all workers
      for (const worker of this.workers.values()) {
        await worker.close();
      }

      // Close all queue schedulers
      for (const scheduler of this.queueSchedulers.values()) {
        await scheduler.close();
      }

      // Close all queues
      for (const queue of this.queues.values()) {
        await queue.close();
      }

      await this.erpService.disconnect();
      await this.prisma.$disconnect();

      logger.info('ERP Sync Job Scheduler shut down successfully');
    } catch (error) {
      logger.error('Failed to shutdown scheduler', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

export default SyncJobScheduler;
