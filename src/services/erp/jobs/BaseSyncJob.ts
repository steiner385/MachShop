/**
 * BaseSyncJob - Abstract base class for all ERP sync jobs
 * Issue #60: Phase 2 - Async sync engine
 *
 * Provides common functionality for all sync operations:
 * - Job lifecycle management
 * - Retry logic with exponential backoff
 * - Transaction logging
 * - Error handling
 * - Progress tracking
 */

import { Job, Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../../utils/logger';
import ERPIntegrationService from '../ERPIntegrationService';
import WebhookService, { WebhookEventType } from '../webhooks/WebhookService';

export interface SyncJobData {
  integrationId: string;
  entityType: string;
  batchSize?: number;
  filters?: Record<string, any>;
  dryRun?: boolean;
  source?: string;
  priority?: number;
}

export interface SyncJobResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  skippedCount: number;
  errors: Array<{ id: string; error: string }>;
  duration: number;
  message: string;
}

/**
 * Abstract base class for ERP sync jobs
 */
export abstract class BaseSyncJob {
  protected prisma: PrismaClient;
  protected erpService: ERPIntegrationService;
  protected webhookService: WebhookService;
  protected logger = logger;

  constructor(prisma?: PrismaClient, erpService?: ERPIntegrationService) {
    this.prisma = prisma || new PrismaClient();
    this.erpService = erpService || new ERPIntegrationService(this.prisma);
    this.webhookService = new WebhookService(this.prisma);
  }

  /**
   * Execute the sync job
   * Implemented by subclasses for specific sync logic
   */
  abstract executeSync(data: SyncJobData, job?: Job): Promise<SyncJobResult>;

  /**
   * Get the job name
   */
  abstract getJobName(): string;

  /**
   * Get the ERP transaction type for this job
   */
  abstract getTransactionType(): string;

  /**
   * Get entity type being synced
   */
  abstract getEntityType(): string;

  /**
   * Main job execution handler
   */
  async handle(data: SyncJobData, job?: Job): Promise<SyncJobResult> {
    const startTime = Date.now();
    const jobName = this.getJobName();

    this.logger.info(`Starting ${jobName}`, {
      integrationId: data.integrationId,
      jobId: job?.id,
      dryRun: data.dryRun,
    });

    // Emit SYNC_STARTED webhook event
    try {
      await this.webhookService.emitEvent(
        data.integrationId,
        WebhookEventType.SYNC_STARTED,
        {
          jobName,
          entityType: this.getEntityType(),
          batchSize: data.batchSize,
          dryRun: data.dryRun,
        }
      );
    } catch (err) {
      this.logger.warn('Failed to emit SYNC_STARTED webhook event', {
        error: err instanceof Error ? err.message : String(err),
        integrationId: data.integrationId,
      });
      // Don't throw - webhook emission should not block sync execution
    }

    try {
      // Get integration configuration
      const integration = await this.prisma.erpIntegration.findUnique({
        where: { id: data.integrationId },
      });

      if (!integration) {
        throw new Error(`Integration ${data.integrationId} not found`);
      }

      if (!integration.enabled) {
        this.logger.warn(`Integration ${integration.name} is disabled`);
        return {
          success: false,
          processedCount: 0,
          failedCount: 0,
          skippedCount: 0,
          errors: [{ id: data.integrationId, error: 'Integration disabled' }],
          duration: Date.now() - startTime,
          message: 'Integration is disabled',
        };
      }

      // Execute the sync
      const result = await this.executeSync(data, job);

      const duration = Date.now() - startTime;

      this.logger.info(`Completed ${jobName}`, {
        integrationId: data.integrationId,
        success: result.success,
        processedCount: result.processedCount,
        failedCount: result.failedCount,
        duration,
      });

      // Emit SYNC_COMPLETED webhook event
      if (result.success) {
        try {
          await this.webhookService.emitEvent(
            data.integrationId,
            WebhookEventType.SYNC_COMPLETED,
            {
              jobName,
              entityType: this.getEntityType(),
              processedCount: result.processedCount,
              failedCount: result.failedCount,
              skippedCount: result.skippedCount,
              duration,
              message: result.message,
            }
          );
        } catch (err) {
          this.logger.warn('Failed to emit SYNC_COMPLETED webhook event', {
            error: err instanceof Error ? err.message : String(err),
            integrationId: data.integrationId,
          });
        }
      }

      return {
        ...result,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`Failed ${jobName}`, {
        integrationId: data.integrationId,
        error: errorMessage,
        duration,
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Emit SYNC_FAILED webhook event
      try {
        await this.webhookService.emitEvent(
          data.integrationId,
          WebhookEventType.SYNC_FAILED,
          {
            jobName,
            entityType: this.getEntityType(),
            error: errorMessage,
            duration,
          }
        );
      } catch (err) {
        this.logger.warn('Failed to emit SYNC_FAILED webhook event', {
          error: err instanceof Error ? err.message : String(err),
          integrationId: data.integrationId,
        });
      }

      return {
        success: false,
        processedCount: 0,
        failedCount: 0,
        skippedCount: 0,
        errors: [{ id: data.integrationId, error: errorMessage }],
        duration,
        message: `Job failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Log sync transaction for audit trail
   */
  protected async logTransaction(
    integrationId: string,
    data: SyncJobData,
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED',
    payload?: any,
    error?: string
  ) {
    try {
      await this.erpService.logSyncTransaction(integrationId, {
        transactionType: this.getTransactionType(),
        direction: 'INBOUND', // Will be overridden by subclasses if needed
        entityType: this.getEntityType(),
        entityId: `batch-${Date.now()}`, // Batch operation
        mesPayload: payload || {},
        status,
      });
    } catch (err) {
      this.logger.warn('Failed to log sync transaction', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Transform entity data to ERP format
   */
  protected async transformToERP(
    integrationId: string,
    entityType: string,
    entity: any
  ): Promise<any> {
    return this.erpService.transformToERP(integrationId, entityType, entity);
  }

  /**
   * Schedule retry for job
   */
  protected async scheduleRetry(
    integrationId: string,
    data: SyncJobData,
    maxRetries: number = 3,
    backoffSeconds: number = 60
  ): Promise<void> {
    // This would be called if we want to retry the entire job
    // Actual retry would be handled by BullMQ retry mechanism
    this.logger.info('Job scheduled for retry', {
      integrationId,
      jobName: this.getJobName(),
      maxRetries,
    });
  }

  /**
   * Update job progress (for BullMQ progress tracking)
   */
  protected updateJobProgress(job: Job | undefined, progress: number): void {
    if (job) {
      job.updateProgress(progress);
    }
  }

  /**
   * Cleanup on job completion
   */
  async cleanup(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export default BaseSyncJob;
