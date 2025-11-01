/**
 * Sync Controller
 * Issue #60: Phase 15 - Bi-directional Real-time Sync
 *
 * REST endpoints for bi-directional sync operations.
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import SyncService, { SyncDirection, SyncStatus } from '../services/erp/sync/SyncService';
import ConflictResolutionService, {
  ConflictResolutionStrategy,
} from '../services/erp/sync/ConflictResolutionService';
import SyncJobService, { SyncJobPriority, SyncJobStatus } from '../services/erp/sync/SyncJobService';
import { logger } from '../utils/logger';

/**
 * Sync Controller
 */
export class SyncController {
  private prisma: PrismaClient;
  private syncService: SyncService;
  private conflictResolution: ConflictResolutionService;
  private syncJobService: SyncJobService;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
    this.syncService = new SyncService(this.prisma);
    this.conflictResolution = new ConflictResolutionService();
    this.syncJobService = new SyncJobService();
  }

  /**
   * Trigger manual sync
   */
  async triggerManualSync(req: Request, res: Response): Promise<void> {
    try {
      const { integrationId, entityType, entityId } = req.params;
      const { sourceData, targetData, direction = SyncDirection.BIDIRECTIONAL, forceSync = false } = req.body;

      if (!integrationId || !entityType || !sourceData || !targetData) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'integrationId, entityType, sourceData, and targetData are required',
        });
        return;
      }

      const syncOp = await this.syncService.syncData(
        integrationId,
        entityType,
        entityId || 'manual',
        sourceData,
        targetData,
        direction,
        { forceSync }
      );

      logger.info('Manual sync triggered via API', {
        integrationId,
        entityType,
        entityId,
        status: syncOp.status,
      });

      res.json({
        timestamp: new Date(),
        syncOperation: syncOp,
      });
    } catch (error) {
      logger.error('Failed to trigger manual sync', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'SYNC_FAILED',
        message: 'Failed to trigger manual sync',
      });
    }
  }

  /**
   * Get sync operation status
   */
  async getSyncStatus(req: Request, res: Response): Promise<void> {
    try {
      const { operationId } = req.params;

      if (!operationId) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'operationId is required',
        });
        return;
      }

      const syncOp = await this.syncService.getSyncStatus(operationId);

      if (!syncOp) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: `Sync operation ${operationId} not found`,
        });
        return;
      }

      res.json({
        timestamp: new Date(),
        syncOperation: syncOp,
      });
    } catch (error) {
      logger.error('Failed to get sync status', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'STATUS_FAILED',
        message: 'Failed to retrieve sync status',
      });
    }
  }

  /**
   * List sync operations
   */
  async listSyncOperations(req: Request, res: Response): Promise<void> {
    try {
      const { integrationId, entityType, status, direction, limit = 50, offset = 0 } = req.query;

      const filters: any = {
        integrationId: integrationId as string,
        entityType: entityType as string,
        status: status as SyncStatus,
        direction: direction as SyncDirection,
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
      };

      const { operations, total } = await this.syncService.getSyncOperations(filters);

      logger.info('Sync operations listed via API', {
        count: operations.length,
        total,
      });

      res.json({
        timestamp: new Date(),
        count: operations.length,
        total,
        limit: filters.limit,
        offset: filters.offset,
        operations,
      });
    } catch (error) {
      logger.error('Failed to list sync operations', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'LIST_FAILED',
        message: 'Failed to list sync operations',
      });
    }
  }

  /**
   * Get sync statistics
   */
  async getSyncStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { integrationId, startDate, endDate } = req.query;

      const filters: any = {
        integrationId: integrationId as string,
      };

      if (startDate) {
        filters.startDate = new Date(startDate as string);
      }
      if (endDate) {
        filters.endDate = new Date(endDate as string);
      }

      const stats = await this.syncService.getSyncStatistics(filters);

      logger.info('Sync statistics retrieved via API', {
        integrationId: filters.integrationId,
        totalSyncs: stats.totalSyncs,
        successRate: stats.successRate,
      });

      res.json({
        timestamp: new Date(),
        stats,
      });
    } catch (error) {
      logger.error('Failed to get sync statistics', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'STATS_FAILED',
        message: 'Failed to retrieve sync statistics',
      });
    }
  }

  /**
   * Get conflicts
   */
  async getConflicts(req: Request, res: Response): Promise<void> {
    try {
      const { operationId, entityType, entityId, status, severity, limit = 50, offset = 0 } = req.query;

      const filters: any = {
        operationId: operationId as string,
        entityType: entityType as string,
        entityId: entityId as string,
        status: status as string,
        severity: severity as string,
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
      };

      const { conflicts, total } = await this.conflictResolution.getConflicts(filters);

      logger.info('Conflicts retrieved via API', {
        count: conflicts.length,
        total,
      });

      res.json({
        timestamp: new Date(),
        count: conflicts.length,
        total,
        limit: filters.limit,
        offset: filters.offset,
        conflicts,
      });
    } catch (error) {
      logger.error('Failed to get conflicts', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'CONFLICTS_FAILED',
        message: 'Failed to retrieve conflicts',
      });
    }
  }

  /**
   * Resolve a conflict
   */
  async resolveConflict(req: Request, res: Response): Promise<void> {
    try {
      const { conflictId } = req.params;
      const { strategy, customValue, notes } = req.body;

      if (!conflictId || !strategy) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'conflictId and strategy are required',
        });
        return;
      }

      const conflict = await this.conflictResolution.resolveConflict(
        conflictId,
        strategy as ConflictResolutionStrategy,
        {
          customValue,
          resolvedBy: (req.user as any)?.id || 'SYSTEM',
          notes,
        }
      );

      if (!conflict) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: `Conflict ${conflictId} not found`,
        });
        return;
      }

      logger.info('Conflict resolved via API', {
        conflictId,
        strategy,
        resolvedBy: (req.user as any)?.id,
      });

      res.json({
        timestamp: new Date(),
        conflict,
      });
    } catch (error) {
      logger.error('Failed to resolve conflict', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'RESOLUTION_FAILED',
        message: 'Failed to resolve conflict',
      });
    }
  }

  /**
   * Approve conflict resolution
   */
  async approveConflictResolution(req: Request, res: Response): Promise<void> {
    try {
      const { conflictId } = req.params;
      const { notes } = req.body;

      if (!conflictId) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'conflictId is required',
        });
        return;
      }

      const conflict = await this.conflictResolution.approveResolution(
        conflictId,
        (req.user as any)?.id || 'SYSTEM',
        { notes }
      );

      if (!conflict) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: `Conflict ${conflictId} not found`,
        });
        return;
      }

      logger.info('Conflict resolution approved via API', {
        conflictId,
        approvedBy: (req.user as any)?.id,
      });

      res.json({
        timestamp: new Date(),
        conflict,
      });
    } catch (error) {
      logger.error('Failed to approve conflict resolution', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'APPROVAL_FAILED',
        message: 'Failed to approve conflict resolution',
      });
    }
  }

  /**
   * Get conflict statistics
   */
  async getConflictStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { entityType, startDate, endDate } = req.query;

      const filters: any = {
        entityType: entityType as string,
      };

      if (startDate) {
        filters.startDate = new Date(startDate as string);
      }
      if (endDate) {
        filters.endDate = new Date(endDate as string);
      }

      const stats = await this.conflictResolution.getConflictStatistics(filters);

      logger.info('Conflict statistics retrieved via API', {
        entityType: filters.entityType,
        totalConflicts: stats.totalConflicts,
        resolutionRate: stats.resolutionRate,
      });

      res.json({
        timestamp: new Date(),
        stats,
      });
    } catch (error) {
      logger.error('Failed to get conflict statistics', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'STATS_FAILED',
        message: 'Failed to retrieve conflict statistics',
      });
    }
  }

  /**
   * Get sync jobs
   */
  async getSyncJobs(req: Request, res: Response): Promise<void> {
    try {
      const { integrationId, entityType, status, priority, limit = 50, offset = 0 } = req.query;

      const filters: any = {
        integrationId: integrationId as string,
        entityType: entityType as string,
        status: status as SyncJobStatus,
        priority: priority ? parseInt(priority as string, 10) : undefined,
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
      };

      const { jobs, total } = await this.syncJobService.getJobs(filters);

      logger.info('Sync jobs retrieved via API', {
        count: jobs.length,
        total,
      });

      res.json({
        timestamp: new Date(),
        count: jobs.length,
        total,
        limit: filters.limit,
        offset: filters.offset,
        jobs,
      });
    } catch (error) {
      logger.error('Failed to get sync jobs', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'JOBS_FAILED',
        message: 'Failed to retrieve sync jobs',
      });
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;

      if (!jobId) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'jobId is required',
        });
        return;
      }

      const job = await this.syncJobService.getJobStatus(jobId);

      if (!job) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: `Sync job ${jobId} not found`,
        });
        return;
      }

      res.json({
        timestamp: new Date(),
        job,
      });
    } catch (error) {
      logger.error('Failed to get job status', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'JOB_STATUS_FAILED',
        message: 'Failed to retrieve job status',
      });
    }
  }

  /**
   * Get job statistics
   */
  async getJobStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { integrationId, startDate, endDate } = req.query;

      const filters: any = {
        integrationId: integrationId as string,
      };

      if (startDate) {
        filters.startDate = new Date(startDate as string);
      }
      if (endDate) {
        filters.endDate = new Date(endDate as string);
      }

      const stats = await this.syncJobService.getJobStatistics(filters);

      logger.info('Sync job statistics retrieved via API', {
        integrationId: filters.integrationId,
        totalJobs: stats.totalJobs,
        successRate: stats.successRate,
      });

      res.json({
        timestamp: new Date(),
        stats,
      });
    } catch (error) {
      logger.error('Failed to get job statistics', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'STATS_FAILED',
        message: 'Failed to retrieve job statistics',
      });
    }
  }

  /**
   * Get queue status
   */
  async getQueueStatus(req: Request, res: Response): Promise<void> {
    try {
      const queueStatus = await this.syncJobService.getQueueStatus();

      logger.info('Queue status retrieved via API', {
        queueLength: queueStatus.queueLength,
      });

      res.json({
        timestamp: new Date(),
        queueStatus,
      });
    } catch (error) {
      logger.error('Failed to get queue status', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'QUEUE_STATUS_FAILED',
        message: 'Failed to retrieve queue status',
      });
    }
  }
}

export default SyncController;
