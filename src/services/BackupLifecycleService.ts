import { BackupSchedule, BackupHistory, BackupEntry, StorageClass, BackupStatus } from '@prisma/client';
import { CloudStorageService } from './CloudStorageService';
import { storageConfig } from '../config/storage';
import { logger } from '../utils/logger';
import * as cron from 'node-cron';
import prisma from '../lib/database';

export interface LifecycleRule {
  id: string;
  name: string;
  enabled: boolean;
  filter: {
    prefix?: string;
    tags?: Record<string, string>;
    minimumAge?: number; // days
    minimumSize?: number; // bytes
  };
  transitions: Array<{
    storageClass: StorageClass;
    afterDays: number;
  }>;
  expiration?: {
    afterDays: number;
    expiredObjectDeleteMarker?: boolean;
  };
}

export interface BackupConfiguration {
  enabled: boolean;
  schedule: string; // cron expression
  retentionDays: number;
  compression: boolean;
  encryption: boolean;
  incrementalBackup: boolean;
  crossRegionReplication: boolean;
  backupBucket: string;
  excludePatterns: string[];
}

export interface BackupResult {
  success: boolean;
  backupId: string;
  totalFiles: number;
  totalSize: number;
  compressedSize?: number;
  compressionRatio?: number;
  duration: number; // milliseconds
  errors: string[];
}

export interface RestoreOptions {
  backupId: string;
  targetLocation?: string;
  restorePoint?: Date;
  includeVersions?: boolean;
  overwriteExisting?: boolean;
}

export interface RestoreResult {
  success: boolean;
  restoredFiles: number;
  skippedFiles: number;
  totalSize: number;
  duration: number;
  errors: Array<{
    file: string;
    error: string;
  }>;
}

export interface LifecycleExecutionResult {
  rulesProcessed: number;
  filesTransitioned: number;
  filesExpired: number;
  totalSizeProcessed: number;
  costSavings: number; // estimated
  errors: Array<{
    ruleId: string;
    error: string;
  }>;
}

/**
 * Backup and Lifecycle Management Service
 * Handles automated backups, lifecycle policies, and disaster recovery
 */
export class BackupLifecycleService {
  private cloudStorageService: CloudStorageService;
  private lifecycleRules: LifecycleRule[] = [];
  private cronJobs: Map<string, any> = new Map();

  constructor() {
    this.cloudStorageService = new CloudStorageService();
    this.initializeLifecycleRules();
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    await this.loadScheduledBackups();
    await this.startLifecyclePolicyExecution();
    logger.info('Backup and Lifecycle Management Service initialized');
  }

  /**
   * Create a new backup schedule
   */
  async createBackupSchedule(
    name: string,
    config: BackupConfiguration,
    userId: string
  ): Promise<BackupSchedule> {
    try {
      const schedule = await prisma.backupSchedule.create({
        data: {
          name,
          bucketName: config.backupBucket,
          cronExpression: config.schedule,
          isActive: config.enabled,
          retentionDays: config.retentionDays,
          enableCompression: config.compression,
          enableEncryption: config.encryption,
          crossRegionReplication: config.crossRegionReplication,
          backupBucket: config.backupBucket,
          frequency: 'CUSTOM', // Default frequency since it's required
          createdById: userId,
        },
      });

      if (schedule.isActive) {
        await this.scheduleBackupJob(schedule);
      }

      logger.info('Backup schedule created:', {
        scheduleId: schedule.id,
        name: schedule.name,
        cronExpression: schedule.cronExpression,
      });

      return schedule;
    } catch (error: any) {
      logger.error('Failed to create backup schedule:', {
        name,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Execute a backup manually or via schedule
   */
  async executeBackup(scheduleId: string): Promise<BackupResult> {
    const startTime = Date.now();

    try {
      const schedule = await prisma.backupSchedule.findUnique({
        where: { id: scheduleId },
      });

      if (!schedule) {
        throw new Error('Backup schedule not found');
      }

      const config = schedule.configuration as BackupConfiguration;

      // Create backup history record
      const backupHistory = await prisma.backupHistory.create({
        data: {
          scheduleId,
          status: BackupStatus.IN_PROGRESS,
          startedAt: new Date(),
        },
      });

      logger.info('Starting backup execution:', {
        scheduleId,
        backupId: backupHistory.id,
        isIncremental: config.incrementalBackup,
      });

      // Get files to backup
      const files = await this.getFilesToBackup(schedule, config);

      let totalSize = 0;
      let compressedSize = 0;
      const errors: string[] = [];
      const backupEntries: any[] = [];

      // Process files in batches
      const batchSize = 100;
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);

        for (const file of batch) {
          try {
            const backupResult = await this.backupFile(file, config, backupHistory.id);

            backupEntries.push({
              backupHistoryId: backupHistory.id,
              fileId: file.id,
              originalPath: file.storageKey,
              backupPath: backupResult.backupPath,
              fileSize: file.size,
              compressedSize: backupResult.compressedSize,
              checksum: file.checksum,
            });

            totalSize += file.size;
            compressedSize += backupResult.compressedSize || file.size;

          } catch (error: any) {
            errors.push(`File ${file.fileName}: ${error.message}`);
            logger.warn('Failed to backup file:', {
              fileId: file.id,
              fileName: file.fileName,
              error: error.message,
            });
          }
        }
      }

      // Create backup entries in batch
      if (backupEntries.length > 0) {
        await prisma.backupEntry.createMany({
          data: backupEntries,
        });
      }

      const duration = Date.now() - startTime;
      const compressionRatio = totalSize > 0 ? (compressedSize / totalSize) * 100 : 100;

      // Update backup history
      await prisma.backupHistory.update({
        where: { id: backupHistory.id },
        data: {
          status: errors.length > 0 ? BackupStatus.COMPLETED_WITH_ERRORS : BackupStatus.COMPLETED,
          completedAt: new Date(),
          totalFiles: files.length,
          totalSize,
          compressedSize,
          compressionRatio,
          errors: errors.length > 0 ? errors : undefined,
        },
      });

      const result: BackupResult = {
        success: errors.length === 0,
        backupId: backupHistory.id,
        totalFiles: files.length,
        totalSize,
        compressedSize,
        compressionRatio,
        duration,
        errors,
      };

      logger.info('Backup execution completed:', {
        ...result,
        scheduleId,
      });

      return result;

    } catch (error: any) {
      const duration = Date.now() - startTime;

      logger.error('Backup execution failed:', {
        scheduleId,
        duration,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Restore files from backup
   */
  async restoreFromBackup(options: RestoreOptions): Promise<RestoreResult> {
    const startTime = Date.now();

    try {
      const backupHistory = await prisma.backupHistory.findUnique({
        where: { id: options.backupId },
        include: {
          backupEntries: {
            include: {
              file: true,
            },
          },
        },
      });

      if (!backupHistory) {
        throw new Error('Backup not found');
      }

      let restoredFiles = 0;
      let skippedFiles = 0;
      let totalSize = 0;
      const errors: Array<{ file: string; error: string }> = [];

      logger.info('Starting restore operation:', {
        backupId: options.backupId,
        totalEntries: backupHistory.backupEntries.length,
      });

      for (const entry of backupHistory.backupEntries) {
        try {
          const shouldRestore = await this.shouldRestoreFile(entry, options);

          if (!shouldRestore) {
            skippedFiles++;
            continue;
          }

          await this.restoreFile(entry, options);
          restoredFiles++;
          totalSize += entry.fileSize;

        } catch (error: any) {
          errors.push({
            file: entry.file?.fileName || entry.originalPath,
            error: error.message,
          });
        }
      }

      const duration = Date.now() - startTime;

      const result: RestoreResult = {
        success: errors.length === 0,
        restoredFiles,
        skippedFiles,
        totalSize,
        duration,
        errors,
      };

      logger.info('Restore operation completed:', result);

      return result;

    } catch (error: any) {
      const duration = Date.now() - startTime;

      logger.error('Restore operation failed:', {
        backupId: options.backupId,
        duration,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Execute lifecycle policies
   */
  async executeLifecyclePolicies(): Promise<LifecycleExecutionResult> {
    try {
      const result: LifecycleExecutionResult = {
        rulesProcessed: 0,
        filesTransitioned: 0,
        filesExpired: 0,
        totalSizeProcessed: 0,
        costSavings: 0,
        errors: [],
      };

      logger.info('Starting lifecycle policy execution');

      for (const rule of this.lifecycleRules) {
        if (!rule.enabled) {
          continue;
        }

        try {
          const ruleResult = await this.executeLifecycleRule(rule);

          result.filesTransitioned += ruleResult.filesTransitioned;
          result.filesExpired += ruleResult.filesExpired;
          result.totalSizeProcessed += ruleResult.totalSizeProcessed;
          result.costSavings += ruleResult.costSavings;
          result.rulesProcessed++;

        } catch (error: any) {
          result.errors.push({
            ruleId: rule.id,
            error: error.message,
          });
        }
      }

      logger.info('Lifecycle policy execution completed:', result);

      return result;

    } catch (error: any) {
      logger.error('Lifecycle policy execution failed:', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get backup history
   */
  async getBackupHistory(
    scheduleId?: string,
    limit: number = 50
  ): Promise<Array<BackupHistory & { schedule: BackupSchedule }>> {
    return await prisma.backupHistory.findMany({
      where: scheduleId ? { scheduleId } : undefined,
      include: {
        schedule: true,
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Clean up old backups based on retention policies
   */
  async cleanupOldBackups(): Promise<{
    deletedBackups: number;
    reclaimedSpace: number;
  }> {
    try {
      const schedules = await prisma.backupSchedule.findMany({
        where: { isActive: true },
      });

      let deletedBackups = 0;
      let reclaimedSpace = 0;

      for (const schedule of schedules) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - schedule.retentionDays);

        const oldBackups = await prisma.backupHistory.findMany({
          where: {
            scheduleId: schedule.id,
            startedAt: { lt: cutoffDate },
            status: BackupStatus.COMPLETED,
          },
          include: {
            backupEntries: true,
          },
        });

        for (const backup of oldBackups) {
          try {
            // Delete backup files from storage
            await this.deleteBackupFiles(backup.backupEntries);

            // Delete database records
            await prisma.backupHistory.delete({
              where: { id: backup.id },
            });

            deletedBackups++;
            reclaimedSpace += backup.totalSize || 0;

          } catch (error: any) {
            logger.warn('Failed to delete old backup:', {
              backupId: backup.id,
              error: error.message,
            });
          }
        }
      }

      logger.info('Old backup cleanup completed:', {
        deletedBackups,
        reclaimedSpace,
      });

      return { deletedBackups, reclaimedSpace };

    } catch (error: any) {
      logger.error('Failed to cleanup old backups:', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private initializeLifecycleRules(): void {
    this.lifecycleRules = [
      {
        id: 'standard-to-warm',
        name: 'Standard to Warm Storage',
        enabled: true,
        filter: {
          minimumAge: 30,
        },
        transitions: [
          {
            storageClass: StorageClass.WARM,
            afterDays: 30,
          },
        ],
      },
      {
        id: 'warm-to-cold',
        name: 'Warm to Cold Storage',
        enabled: true,
        filter: {
          minimumAge: 90,
        },
        transitions: [
          {
            storageClass: StorageClass.COLD,
            afterDays: 90,
          },
        ],
      },
      {
        id: 'cold-to-archive',
        name: 'Cold to Archive Storage',
        enabled: true,
        filter: {
          minimumAge: 365,
        },
        transitions: [
          {
            storageClass: StorageClass.ARCHIVE,
            afterDays: 365,
          },
        ],
      },
    ];
  }

  private async loadScheduledBackups(): Promise<void> {
    const schedules = await prisma.backupSchedule.findMany({
      where: { isActive: true },
    });

    for (const schedule of schedules) {
      await this.scheduleBackupJob(schedule);
    }

    logger.info(`Loaded ${schedules.length} backup schedules`);
  }

  private async scheduleBackupJob(schedule: BackupSchedule): Promise<void> {
    const jobId = `backup-${schedule.id}`;

    // Remove existing job if any
    if (this.cronJobs.has(jobId)) {
      this.cronJobs.get(jobId).destroy();
    }

    // Create new cron job
    const job = cron.schedule(schedule.cronExpression, async () => {
      try {
        await this.executeBackup(schedule.id);
      } catch (error: any) {
        logger.error('Scheduled backup execution failed:', {
          scheduleId: schedule.id,
          error: error.message,
        });
      }
    }, {
      scheduled: true,
    });

    this.cronJobs.set(jobId, job);
  }

  private async startLifecyclePolicyExecution(): Promise<void> {
    // Run lifecycle policies daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
      try {
        await this.executeLifecyclePolicies();
      } catch (error: any) {
        logger.error('Scheduled lifecycle policy execution failed:', {
          error: error.message,
        });
      }
    });
  }

  private async getFilesToBackup(
    schedule: BackupSchedule,
    config: BackupConfiguration
  ): Promise<any[]> {
    const baseQuery: any = {
      deletedAt: null,
    };

    // Add incremental backup filter
    if (config.incrementalBackup && schedule.lastBackupAt) {
      baseQuery.updatedAt = {
        gte: schedule.lastBackupAt,
      };
    }

    return await prisma.storedFile.findMany({
      where: baseQuery,
      select: {
        id: true,
        fileName: true,
        storageKey: true,
        size: true,
        checksum: true,
        mimeType: true,
        updatedAt: true,
      },
    });
  }

  private async backupFile(
    file: any,
    config: BackupConfiguration,
    backupId: string
  ): Promise<{ backupPath: string; compressedSize?: number }> {
    // This is a simplified implementation
    // In practice, you would copy files to backup storage
    const backupPath = `backups/${backupId}/${file.storageKey}`;

    return {
      backupPath,
      compressedSize: config.compression ? Math.floor(file.size * 0.7) : undefined,
    };
  }

  private async shouldRestoreFile(entry: any, options: RestoreOptions): boolean {
    if (options.restorePoint && entry.file.updatedAt > options.restorePoint) {
      return false;
    }

    if (!options.overwriteExisting) {
      const existingFile = await prisma.storedFile.findUnique({
        where: { id: entry.fileId },
      });

      if (existingFile && !existingFile.deletedAt) {
        return false;
      }
    }

    return true;
  }

  private async restoreFile(entry: any, options: RestoreOptions): Promise<void> {
    // Simplified restore implementation
    // In practice, you would copy files from backup storage
    logger.debug('Restoring file:', {
      fileId: entry.fileId,
      backupPath: entry.backupPath,
    });
  }

  private async executeLifecycleRule(rule: LifecycleRule): Promise<any> {
    // Simplified lifecycle rule execution
    return {
      filesTransitioned: 0,
      filesExpired: 0,
      totalSizeProcessed: 0,
      costSavings: 0,
    };
  }

  private async deleteBackupFiles(entries: any[]): Promise<void> {
    // Delete backup files from storage
    for (const entry of entries) {
      try {
        // Implementation would delete actual backup files
        logger.debug('Deleting backup file:', entry.backupPath);
      } catch (error) {
        logger.warn('Failed to delete backup file:', {
          backupPath: entry.backupPath,
          error,
        });
      }
    }
  }
}

// Export both the class and a default instance
export const backupLifecycleService = new BackupLifecycleService();
export default BackupLifecycleService;