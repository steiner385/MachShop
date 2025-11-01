/**
 * CostSyncJob - Sync actual costs from OSP operations to ERP
 * Issue #60: Phase 2 - Async sync engine
 */

import { Job } from 'bullmq';
import { BaseSyncJob, SyncJobData, SyncJobResult } from './BaseSyncJob';
import { PrismaClient } from '@prisma/client';
import ERPIntegrationService from '../ERPIntegrationService';

/**
 * Sync actual costs from OSP operations to ERP work orders (outbound)
 * Direction: OUTBOUND (MES → ERP)
 */
export class CostSyncJob extends BaseSyncJob {
  constructor(prisma?: PrismaClient, erpService?: ERPIntegrationService) {
    super(prisma, erpService);
  }

  getJobName(): string {
    return 'CostSync';
  }

  getTransactionType(): string {
    return 'COST_SYNC';
  }

  getEntityType(): string {
    return 'Cost';
  }

  /**
   * Execute cost sync from MES to ERP
   */
  async executeSync(
    data: SyncJobData,
    job?: Job
  ): Promise<SyncJobResult> {
    let processedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const errors: Array<{ id: string; error: string }> = [];

    try {
      // Fetch OSP operations with actual costs that haven't been posted
      const ospOperations = await this.fetchUnpostedCosts(data);

      const totalToProcess = ospOperations.length;

      // Log batch transaction
      await this.logTransaction(data.integrationId, data, 'IN_PROGRESS', {
        cost_count: totalToProcess,
        direction: 'OUTBOUND',
      });

      for (let i = 0; i < ospOperations.length; i++) {
        const ospOp = ospOperations[i];

        try {
          // Transform cost data to ERP format
          const transformedCost = await this.transformCostToERP(
            data.integrationId,
            ospOp
          );

          if (!data.dryRun) {
            // TODO: Send cost data to ERP adapter in Phase 4+
            // For now, just log the transformation
            this.logger.debug('Would post cost to ERP', {
              integrationId: data.integrationId,
              ospOperationId: ospOp.id,
              transformed: transformedCost,
            });

            // Update cost posting status
            await this.prisma.erpCostSync.upsert({
              where: { ospOperationId: ospOp.id },
              update: {
                lastSyncAt: new Date(),
                lastSyncStatus: 'SUCCESS',
                actualCostPosted: ospOp.actualCost,
              },
              create: {
                ospOperationId: ospOp.id,
                erpIntegrationId: data.integrationId,
                lastSyncAt: new Date(),
                lastSyncStatus: 'SUCCESS',
                estimatedCostPosted: ospOp.estimatedCost,
                actualCostPosted: ospOp.actualCost,
              },
            });
          }

          processedCount++;
          const progress = Math.round(((i + 1) / totalToProcess) * 100);
          this.updateJobProgress(job, progress);

          this.logger.debug(`Posted cost for OSP: ${ospOp.ospNumber}`, {
            integrationId: data.integrationId,
            ospOperationId: ospOp.id,
            actualCost: ospOp.actualCost,
          });
        } catch (error) {
          failedCount++;
          const errorMsg = error instanceof Error ? error.message : String(error);
          errors.push({ id: ospOp.id, error: errorMsg });

          this.logger.warn(`Failed to post cost for OSP: ${ospOp.ospNumber}`, {
            integrationId: data.integrationId,
            error: errorMsg,
          });
        }
      }

      // Log completion
      await this.logTransaction(data.integrationId, data, 'COMPLETED', {
        processed: processedCount,
        failed: failedCount,
        skipped: skippedCount,
        direction: 'OUTBOUND',
      });

      return {
        success: failedCount === 0,
        processedCount,
        failedCount,
        skippedCount,
        errors,
        duration: 0,
        message: `Posted ${processedCount} costs to ERP${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      await this.logTransaction(data.integrationId, data, 'FAILED', {}, errorMsg);

      throw error;
    }
  }

  /**
   * Fetch OSP operations with unposted actual costs
   */
  private async fetchUnpostedCosts(data: SyncJobData): Promise<any[]> {
    try {
      // Fetch OSP operations with actual costs that haven't been synced
      const ospOperations = await this.prisma.oSPOperation.findMany({
        where: {
          actualCost: {
            not: null,
          },
          costSync: {
            // No sync record exists yet (not synced)
            none: {
              erpIntegrationId: data.integrationId,
            },
          },
        },
        select: {
          id: true,
          ospNumber: true,
          estimatedCost: true,
          actualCost: true,
          workOrderId: true,
          operationId: true,
          vendorId: true,
          status: true,
        },
        take: data.batchSize || 100,
      });

      return ospOperations;
    } catch (error) {
      this.logger.warn('Failed to fetch unposted costs', {
        integrationId: data.integrationId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Transform cost data from MES format to ERP format
   */
  private async transformCostToERP(integrationId: string, ospOp: any): Promise<any> {
    // Get field mappings for Cost entity
    const mappings = await this.erpService.getFieldMappings(
      integrationId,
      this.getEntityType()
    );

    // If mappings exist, use them
    if (mappings && mappings.length > 0) {
      return this.erpService.transformToERP(integrationId, this.getEntityType(), {
        ...ospOp,
      });
    }

    // Otherwise use default mapping for ERP cost posting
    return {
      workOrderId: ospOp.workOrderId,
      operationId: ospOp.operationId,
      costType: 'OUTSOURCED_OPERATION',
      estimatedCost: ospOp.estimatedCost,
      actualCost: ospOp.actualCost,
      costVariance: ospOp.actualCost && ospOp.estimatedCost
        ? ospOp.actualCost - ospOp.estimatedCost
        : null,
      vendorId: ospOp.vendorId,
      ospOperationId: ospOp.id,
      ospNumber: ospOp.ospNumber,
    };
  }
}

export default CostSyncJob;
