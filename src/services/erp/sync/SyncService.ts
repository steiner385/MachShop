/**
 * Sync Service
 * Issue #60: Phase 15 - Bi-directional Real-time Sync
 *
 * Handles bi-directional synchronization between ERP and MES systems.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../../utils/logger';

/**
 * Sync direction
 */
export enum SyncDirection {
  ERP_TO_MES = 'ERP_TO_MES',
  MES_TO_ERP = 'MES_TO_ERP',
  BIDIRECTIONAL = 'BIDIRECTIONAL',
}

/**
 * Sync status
 */
export enum SyncStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL',
  CONFLICT = 'CONFLICT',
}

/**
 * Sync operation record
 */
export interface SyncOperation {
  id: string;
  integrationId: string;
  direction: SyncDirection;
  entityType: string;
  entityId: string;
  sourceSystem: 'ERP' | 'MES';
  targetSystem: 'ERP' | 'MES';
  status: SyncStatus;
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  recordsConflicted: number;
  sourceData: Record<string, any>;
  targetData: Record<string, any>;
  changedFields: string[];
  conflictDetails?: Record<string, any>;
  errorMessage?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Sync transformation rule
 */
export interface SyncTransformRule {
  sourceField: string;
  targetField: string;
  transformer?: (value: any) => any;
  required?: boolean;
}

/**
 * Sync configuration
 */
export interface SyncConfig {
  integrationId: string;
  entityType: string;
  direction: SyncDirection;
  enabled: boolean;
  transformRules: SyncTransformRule[];
  maxRetries: number;
  retryDelayMs: number;
  batchSize: number;
  conflictResolutionStrategy: 'LAST_WRITE_WINS' | 'SOURCE_PRIORITY' | 'TARGET_PRIORITY' | 'MANUAL';
  sourceFields: string[];
  targetFields: string[];
}

/**
 * Sync Service
 */
export class SyncService {
  private prisma: PrismaClient;
  private syncOperations: Map<string, SyncOperation> = new Map();
  private syncConfigs: Map<string, SyncConfig> = new Map();
  private operationCounter = 0;
  private configCounter = 0;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Register a sync configuration
   */
  async registerSyncConfig(config: SyncConfig): Promise<void> {
    try {
      const configId = `sync-config-${Date.now()}-${++this.configCounter}`;

      this.syncConfigs.set(configId, config);

      logger.info('Sync configuration registered', {
        configId,
        integrationId: config.integrationId,
        entityType: config.entityType,
        direction: config.direction,
      });
    } catch (error) {
      logger.error('Failed to register sync configuration', {
        error: error instanceof Error ? error.message : String(error),
        integrationId: config.integrationId,
      });
      throw error;
    }
  }

  /**
   * Sync data from source to target system
   */
  async syncData(
    integrationId: string,
    entityType: string,
    entityId: string,
    sourceData: Record<string, any>,
    targetData: Record<string, any>,
    direction: SyncDirection = SyncDirection.BIDIRECTIONAL,
    options?: {
      forceSync?: boolean;
      skipConflictCheck?: boolean;
      metadata?: Record<string, any>;
    }
  ): Promise<SyncOperation> {
    try {
      const startTime = Date.now();
      const operationId = `sync-op-${Date.now()}-${++this.operationCounter}`;

      // Determine source and target systems
      let sourceSystem: 'ERP' | 'MES' = 'ERP';
      let targetSystem: 'ERP' | 'MES' = 'MES';

      if (direction === SyncDirection.MES_TO_ERP) {
        sourceSystem = 'MES';
        targetSystem = 'ERP';
      }

      // Compare data and detect changes
      const changedFields = this.detectChanges(sourceData, targetData);

      // Check for conflicts
      let conflicts: Record<string, any> = {};
      let hasConflicts = false;

      if (!options?.skipConflictCheck) {
        const conflictCheck = await this.checkConflicts(
          entityType,
          entityId,
          sourceData,
          targetData,
          sourceSystem,
          targetSystem
        );
        hasConflicts = conflictCheck.hasConflicts;
        conflicts = conflictCheck.conflicts;
      }

      // Apply transformations
      const transformedData = this.transformData(sourceData, entityType);

      const syncOp: SyncOperation = {
        id: operationId,
        integrationId,
        direction,
        entityType,
        entityId,
        sourceSystem,
        targetSystem,
        status: hasConflicts && !options?.forceSync ? SyncStatus.CONFLICT : SyncStatus.IN_PROGRESS,
        recordsProcessed: 1,
        recordsSucceeded: hasConflicts && !options?.forceSync ? 0 : 1,
        recordsFailed: 0,
        recordsConflicted: hasConflicts ? 1 : 0,
        sourceData,
        targetData,
        changedFields,
        conflictDetails: hasConflicts ? conflicts : undefined,
        startTime: new Date(),
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // If forced or no conflicts, mark as completed
      if (options?.forceSync || !hasConflicts) {
        syncOp.status = SyncStatus.COMPLETED;
        syncOp.endTime = new Date();
        syncOp.duration = Date.now() - startTime;
      }

      this.syncOperations.set(operationId, syncOp);

      logger.info('Data synced', {
        operationId,
        integrationId,
        entityType,
        entityId,
        direction,
        status: syncOp.status,
        changedFields: changedFields.length,
        hasConflicts,
      });

      return syncOp;
    } catch (error) {
      logger.error('Failed to sync data', {
        error: error instanceof Error ? error.message : String(error),
        integrationId,
        entityType,
        entityId,
      });
      throw error;
    }
  }

  /**
   * Batch sync multiple records
   */
  async batchSync(
    integrationId: string,
    entityType: string,
    records: Array<{
      entityId: string;
      sourceData: Record<string, any>;
      targetData: Record<string, any>;
    }>,
    direction: SyncDirection = SyncDirection.BIDIRECTIONAL
  ): Promise<SyncOperation> {
    try {
      const startTime = Date.now();
      const operationId = `sync-batch-${Date.now()}-${++this.operationCounter}`;

      let succeeded = 0;
      let failed = 0;
      let conflicted = 0;

      const syncResults: Record<string, any> = {};

      // Process each record
      for (const record of records) {
        try {
          const syncOp = await this.syncData(
            integrationId,
            entityType,
            record.entityId,
            record.sourceData,
            record.targetData,
            direction
          );

          if (syncOp.status === SyncStatus.COMPLETED) {
            succeeded++;
          } else if (syncOp.status === SyncStatus.CONFLICT) {
            conflicted++;
          } else if (syncOp.status === SyncStatus.FAILED) {
            failed++;
          }

          syncResults[record.entityId] = syncOp;
        } catch (error) {
          failed++;
          syncResults[record.entityId] = {
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }

      const batchOp: SyncOperation = {
        id: operationId,
        integrationId,
        direction,
        entityType,
        entityId: 'batch',
        sourceSystem: direction === SyncDirection.MES_TO_ERP ? 'MES' : 'ERP',
        targetSystem: direction === SyncDirection.MES_TO_ERP ? 'ERP' : 'MES',
        status:
          failed === 0 && conflicted === 0
            ? SyncStatus.COMPLETED
            : conflicted > 0
              ? SyncStatus.PARTIAL
              : SyncStatus.FAILED,
        recordsProcessed: records.length,
        recordsSucceeded: succeeded,
        recordsFailed: failed,
        recordsConflicted: conflicted,
        sourceData: syncResults,
        targetData: syncResults,
        changedFields: [],
        startTime: new Date(startTime),
        endTime: new Date(),
        duration: Date.now() - startTime,
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.syncOperations.set(operationId, batchOp);

      logger.info('Batch sync completed', {
        operationId,
        integrationId,
        entityType,
        totalRecords: records.length,
        succeeded,
        failed,
        conflicted,
        duration: batchOp.duration,
      });

      return batchOp;
    } catch (error) {
      logger.error('Failed to perform batch sync', {
        error: error instanceof Error ? error.message : String(error),
        integrationId,
        entityType,
      });
      throw error;
    }
  }

  /**
   * Get sync operation status
   */
  async getSyncStatus(operationId: string): Promise<SyncOperation | null> {
    try {
      const operation = this.syncOperations.get(operationId);

      if (!operation) {
        return null;
      }

      return operation;
    } catch (error) {
      logger.error('Failed to get sync status', {
        error: error instanceof Error ? error.message : String(error),
        operationId,
      });
      throw error;
    }
  }

  /**
   * Get sync operations
   */
  async getSyncOperations(options?: {
    integrationId?: string;
    entityType?: string;
    status?: SyncStatus;
    direction?: SyncDirection;
    limit?: number;
    offset?: number;
  }): Promise<{ operations: SyncOperation[]; total: number }> {
    try {
      let operations = Array.from(this.syncOperations.values());

      if (options?.integrationId) {
        operations = operations.filter((o) => o.integrationId === options.integrationId);
      }
      if (options?.entityType) {
        operations = operations.filter((o) => o.entityType === options.entityType);
      }
      if (options?.status) {
        operations = operations.filter((o) => o.status === options.status);
      }
      if (options?.direction) {
        operations = operations.filter((o) => o.direction === options.direction);
      }

      // Sort by createdAt descending
      operations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const total = operations.length;
      const limit = options?.limit || 50;
      const offset = options?.offset || 0;
      const sliced = operations.slice(offset, offset + limit);

      return { operations: sliced, total };
    } catch (error) {
      logger.error('Failed to get sync operations', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Detect changes between source and target data
   */
  private detectChanges(sourceData: Record<string, any>, targetData: Record<string, any>): string[] {
    const changed: string[] = [];

    // Check for changes in source
    for (const key in sourceData) {
      if (JSON.stringify(sourceData[key]) !== JSON.stringify(targetData[key])) {
        changed.push(key);
      }
    }

    // Check for missing fields in target
    for (const key in targetData) {
      if (!(key in sourceData)) {
        changed.push(key);
      }
    }

    return changed;
  }

  /**
   * Check for conflicts
   */
  private async checkConflicts(
    entityType: string,
    entityId: string,
    sourceData: Record<string, any>,
    targetData: Record<string, any>,
    sourceSystem: 'ERP' | 'MES',
    targetSystem: 'ERP' | 'MES'
  ): Promise<{ hasConflicts: boolean; conflicts: Record<string, any> }> {
    const conflicts: Record<string, any> = {};
    const changed = this.detectChanges(sourceData, targetData);

    // For each changed field, check if both sides have modified it
    for (const field of changed) {
      if (sourceData[field] !== undefined && targetData[field] !== undefined) {
        // Both have values and they differ - this is a conflict
        if (sourceData[field] !== targetData[field]) {
          conflicts[field] = {
            sourceValue: sourceData[field],
            targetValue: targetData[field],
            sourceSystem,
            targetSystem,
          };
        }
      }
    }

    return {
      hasConflicts: Object.keys(conflicts).length > 0,
      conflicts,
    };
  }

  /**
   * Transform data according to rules
   */
  private transformData(data: Record<string, any>, entityType: string): Record<string, any> {
    try {
      const config = Array.from(this.syncConfigs.values()).find(
        (c) => c.entityType === entityType
      );

      if (!config) {
        return data;
      }

      const transformed: Record<string, any> = {};

      for (const rule of config.transformRules) {
        if (rule.sourceField in data) {
          const value = data[rule.sourceField];
          transformed[rule.targetField] = rule.transformer ? rule.transformer(value) : value;
        }
      }

      return transformed;
    } catch (error) {
      logger.error('Failed to transform data', {
        error: error instanceof Error ? error.message : String(error),
        entityType,
      });
      return data;
    }
  }

  /**
   * Get sync statistics
   */
  async getSyncStatistics(options?: {
    integrationId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    conflictedSyncs: number;
    totalRecordsProcessed: number;
    successRate: number;
    averageDuration: number;
    syncsByStatus: Record<string, number>;
  }> {
    try {
      let operations = Array.from(this.syncOperations.values());

      if (options?.integrationId) {
        operations = operations.filter((o) => o.integrationId === options.integrationId);
      }

      if (options?.startDate) {
        operations = operations.filter((o) => o.createdAt >= options.startDate!);
      }

      if (options?.endDate) {
        operations = operations.filter((o) => o.createdAt <= options.endDate!);
      }

      const successful = operations.filter((o) => o.status === SyncStatus.COMPLETED).length;
      const failed = operations.filter((o) => o.status === SyncStatus.FAILED).length;
      const conflicted = operations.filter((o) => o.status === SyncStatus.CONFLICT).length;

      const totalRecords = operations.reduce((sum, o) => sum + o.recordsProcessed, 0);
      const totalDuration = operations.reduce((sum, o) => sum + (o.duration || 0), 0);
      const averageDuration = operations.length > 0 ? totalDuration / operations.length : 0;

      // Count by status
      const syncsByStatus: Record<string, number> = {};
      operations.forEach((o) => {
        syncsByStatus[o.status] = (syncsByStatus[o.status] || 0) + 1;
      });

      const successRate = operations.length > 0 ? (successful / operations.length) * 100 : 100;

      return {
        totalSyncs: operations.length,
        successfulSyncs: successful,
        failedSyncs: failed,
        conflictedSyncs: conflicted,
        totalRecordsProcessed: totalRecords,
        successRate,
        averageDuration,
        syncsByStatus,
      };
    } catch (error) {
      logger.error('Failed to get sync statistics', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Retry failed sync
   */
  async retrySyncOperation(operationId: string): Promise<SyncOperation | null> {
    try {
      const operation = this.syncOperations.get(operationId);

      if (!operation) {
        return null;
      }

      if (operation.retryCount >= operation.maxRetries) {
        throw new Error('Maximum retry attempts exceeded');
      }

      operation.retryCount++;
      operation.status = SyncStatus.IN_PROGRESS;
      operation.updatedAt = new Date();

      // Retry the sync
      const retryOp = await this.syncData(
        operation.integrationId,
        operation.entityType,
        operation.entityId,
        operation.sourceData,
        operation.targetData,
        operation.direction,
        { forceSync: false }
      );

      logger.info('Sync operation retried', {
        operationId,
        retryCount: operation.retryCount,
        newStatus: retryOp.status,
      });

      return retryOp;
    } catch (error) {
      logger.error('Failed to retry sync operation', {
        error: error instanceof Error ? error.message : String(error),
        operationId,
      });
      throw error;
    }
  }
}

export default SyncService;
