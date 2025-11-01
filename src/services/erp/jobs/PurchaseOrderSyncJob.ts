/**
 * PurchaseOrderSyncJob - Sync purchase orders between MES and ERP
 * Issue #60: Phase 2 - Async sync engine
 */

import { Job } from 'bullmq';
import { BaseSyncJob, SyncJobData, SyncJobResult } from './BaseSyncJob';
import { PrismaClient } from '@prisma/client';
import ERPIntegrationService from '../ERPIntegrationService';

/**
 * Sync purchase orders - can be bidirectional
 * OUTBOUND: MES → ERP (create/update POs in ERP)
 * INBOUND: ERP → MES (sync POs from ERP to MES)
 */
export class PurchaseOrderSyncJob extends BaseSyncJob {
  private direction: 'INBOUND' | 'OUTBOUND' = 'OUTBOUND';

  constructor(prisma?: PrismaClient, erpService?: ERPIntegrationService) {
    super(prisma, erpService);
  }

  getJobName(): string {
    return 'PurchaseOrderSync';
  }

  getTransactionType(): string {
    return 'PO_CREATE';
  }

  getEntityType(): string {
    return 'PurchaseOrder';
  }

  /**
   * Execute PO sync
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
      // Determine direction from job data or config
      this.direction = data.filters?.direction || 'OUTBOUND';

      if (this.direction === 'OUTBOUND') {
        return await this.syncOutbound(data, job, {
          processedCount,
          failedCount,
          skippedCount,
          errors,
        });
      } else {
        return await this.syncInbound(data, job, {
          processedCount,
          failedCount,
          skippedCount,
          errors,
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      await this.logTransaction(data.integrationId, data, 'FAILED', {}, errorMsg);

      throw error;
    }
  }

  /**
   * Sync POs from MES to ERP (outbound)
   */
  private async syncOutbound(
    data: SyncJobData,
    job: Job | undefined,
    context: any
  ): Promise<SyncJobResult> {
    const { processedCount: initialProcessed, failedCount: initialFailed, errors } = context;
    let processedCount = initialProcessed;
    let failedCount = initialFailed;

    try {
      // Fetch unsync'd purchase orders from MES
      const purchaseOrders = await this.fetchUnsynchedPOs(data);

      const totalToProcess = purchaseOrders.length;

      await this.logTransaction(data.integrationId, data, 'IN_PROGRESS', {
        po_count: totalToProcess,
        direction: 'OUTBOUND',
      });

      for (let i = 0; i < purchaseOrders.length; i++) {
        const po = purchaseOrders[i];

        try {
          if (!data.dryRun) {
            // Transform to ERP format
            const transformedPO = await this.transformPoToERP(
              data.integrationId,
              po
            );

            // TODO: Send to ERP adapter in Phase 4+
            // For now, just log the transformation
            this.logger.debug('Would sync PO to ERP', {
              integrationId: data.integrationId,
              poId: po.id,
              transformed: transformedPO,
            });

            // Update sync status
            await this.prisma.erpPurchaseOrderSync.upsert({
              where: { purchaseOrderId: po.id },
              update: {
                lastSyncAt: new Date(),
                lastSyncStatus: 'SUCCESS',
              },
              create: {
                purchaseOrderId: po.id,
                erpIntegrationId: data.integrationId,
                lastSyncAt: new Date(),
                lastSyncStatus: 'SUCCESS',
              },
            });
          }

          processedCount++;
          const progress = Math.round(((i + 1) / totalToProcess) * 100);
          this.updateJobProgress(job, progress);

          this.logger.debug(`Synced PO: ${po.id}`, {
            integrationId: data.integrationId,
            poId: po.id,
          });
        } catch (error) {
          failedCount++;
          const errorMsg = error instanceof Error ? error.message : String(error);
          errors.push({ id: po.id, error: errorMsg });

          this.logger.warn(`Failed to sync PO: ${po.id}`, {
            integrationId: data.integrationId,
            error: errorMsg,
          });
        }
      }

      await this.logTransaction(data.integrationId, data, 'COMPLETED', {
        processed: processedCount,
        failed: failedCount,
        direction: 'OUTBOUND',
      });

      return {
        success: failedCount === 0,
        processedCount,
        failedCount,
        skippedCount: 0,
        errors,
        duration: 0,
        message: `Synced ${processedCount} POs to ERP${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Sync POs from ERP to MES (inbound)
   */
  private async syncInbound(
    data: SyncJobData,
    job: Job | undefined,
    context: any
  ): Promise<SyncJobResult> {
    const { processedCount: initialProcessed, failedCount: initialFailed, errors } = context;
    let processedCount = initialProcessed;
    let failedCount = initialFailed;

    try {
      // TODO: Fetch from ERP adapter in Phase 4+
      const purchaseOrders: any[] = [];

      const totalToProcess = purchaseOrders.length;

      await this.logTransaction(data.integrationId, data, 'IN_PROGRESS', {
        po_count: totalToProcess,
        direction: 'INBOUND',
      });

      // Process and upsert each PO
      for (let i = 0; i < purchaseOrders.length; i++) {
        const po = purchaseOrders[i];

        try {
          if (!data.dryRun) {
            // TODO: Upsert to MES database
            // await this.prisma.purchaseOrder.upsert({ ... })
          }

          processedCount++;
          const progress = Math.round(((i + 1) / totalToProcess) * 100);
          this.updateJobProgress(job, progress);
        } catch (error) {
          failedCount++;
          const errorMsg = error instanceof Error ? error.message : String(error);
          errors.push({ id: po.id, error: errorMsg });
        }
      }

      await this.logTransaction(data.integrationId, data, 'COMPLETED', {
        processed: processedCount,
        failed: failedCount,
        direction: 'INBOUND',
      });

      return {
        success: failedCount === 0,
        processedCount,
        failedCount,
        skippedCount: 0,
        errors,
        duration: 0,
        message: `Synced ${processedCount} POs from ERP${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Fetch POs from MES that haven't been synced yet
   */
  private async fetchUnsynchedPOs(data: SyncJobData): Promise<any[]> {
    // TODO: Implement actual PO fetch when PurchaseOrder model exists
    // For now return empty to be safe
    return [];
  }

  /**
   * Transform PO from MES format to ERP format
   */
  private async transformPoToERP(integrationId: string, po: any): Promise<any> {
    return this.erpService.transformToERP(integrationId, this.getEntityType(), po);
  }
}

export default PurchaseOrderSyncJob;
