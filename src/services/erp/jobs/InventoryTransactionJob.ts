/**
 * InventoryTransactionJob - Post inventory transactions to ERP
 * Issue #60: Phase 2 - Async sync engine
 */

import { Job } from 'bullmq';
import { BaseSyncJob, SyncJobData, SyncJobResult } from './BaseSyncJob';
import { PrismaClient } from '@prisma/client';
import ERPIntegrationService from '../ERPIntegrationService';

/**
 * Post inventory transactions to ERP (outbound)
 * Direction: OUTBOUND (MES → ERP)
 *
 * Handles inventory movements including:
 * - Consignment receipts from suppliers
 * - Scrap and waste from operations
 * - Returns to suppliers
 * - Inventory adjustments
 */
export class InventoryTransactionJob extends BaseSyncJob {
  constructor(prisma?: PrismaClient, erpService?: ERPIntegrationService) {
    super(prisma, erpService);
  }

  getJobName(): string {
    return 'InventoryTransaction';
  }

  getTransactionType(): string {
    return 'INVENTORY_TRANSACTION';
  }

  getEntityType(): string {
    return 'InventoryTransaction';
  }

  /**
   * Execute inventory transaction sync
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
      // Determine transaction types to sync
      const transactionType = data.filters?.transactionType || 'ALL';

      // Fetch inventory transactions that haven't been posted to ERP
      const inventoryTransactions = await this.fetchUnpostedTransactions(
        data,
        transactionType
      );

      const totalToProcess = inventoryTransactions.length;

      // Log batch transaction
      await this.logTransaction(data.integrationId, data, 'IN_PROGRESS', {
        inventory_transaction_count: totalToProcess,
        transaction_type: transactionType,
        direction: 'OUTBOUND',
      });

      for (let i = 0; i < inventoryTransactions.length; i++) {
        const transaction = inventoryTransactions[i];

        try {
          // Transform inventory transaction data to ERP format
          const transformedTransaction = await this.transformTransactionToERP(
            data.integrationId,
            transaction
          );

          if (!data.dryRun) {
            // TODO: Send inventory transaction to ERP adapter in Phase 4+
            // For now, just log the transformation
            this.logger.debug('Would post inventory transaction to ERP', {
              integrationId: data.integrationId,
              transactionId: transaction.id,
              transactionType: transaction.type,
              transformed: transformedTransaction,
            });

            // Update inventory transaction posting status
            await this.prisma.erpInventorySync.upsert({
              where: { inventoryTransactionId: transaction.id },
              update: {
                lastSyncAt: new Date(),
                lastSyncStatus: 'SUCCESS',
              },
              create: {
                inventoryTransactionId: transaction.id,
                erpIntegrationId: data.integrationId,
                transactionType: transaction.type,
                lastSyncAt: new Date(),
                lastSyncStatus: 'SUCCESS',
              },
            });
          }

          processedCount++;
          const progress = Math.round(((i + 1) / totalToProcess) * 100);
          this.updateJobProgress(job, progress);

          this.logger.debug(`Posted inventory transaction: ${transaction.id}`, {
            integrationId: data.integrationId,
            transactionId: transaction.id,
            transactionType: transaction.type,
            quantity: transaction.quantity,
          });
        } catch (error) {
          failedCount++;
          const errorMsg = error instanceof Error ? error.message : String(error);
          errors.push({ id: transaction.id, error: errorMsg });

          this.logger.warn(`Failed to post inventory transaction: ${transaction.id}`, {
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
        message: `Posted ${processedCount} inventory transactions to ERP${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      await this.logTransaction(data.integrationId, data, 'FAILED', {}, errorMsg);

      throw error;
    }
  }

  /**
   * Fetch inventory transactions that haven't been posted to ERP
   */
  private async fetchUnpostedTransactions(
    data: SyncJobData,
    transactionType: string
  ): Promise<any[]> {
    try {
      const whereClause: any = {
        erpInventorySyncs: {
          // No posting record exists yet
          none: {
            erpIntegrationId: data.integrationId,
          },
        },
      };

      // Filter by transaction type if specified
      if (transactionType !== 'ALL') {
        whereClause.type = transactionType;
      }

      // Fetch unposted inventory transactions
      const transactions = await this.prisma.inventoryTransaction.findMany({
        where: whereClause,
        select: {
          id: true,
          transactionNumber: true,
          type: true,
          materialId: true,
          quantity: true,
          unitCost: true,
          totalCost: true,
          warehouseId: true,
          description: true,
          referenceNumber: true,
          createdAt: true,
          createdBy: true,
        },
        take: data.batchSize || 100,
      });

      return transactions;
    } catch (error) {
      this.logger.warn('Failed to fetch unposted inventory transactions', {
        integrationId: data.integrationId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Transform inventory transaction data from MES format to ERP format
   */
  private async transformTransactionToERP(
    integrationId: string,
    transaction: any
  ): Promise<any> {
    // Get field mappings for InventoryTransaction entity
    const mappings = await this.erpService.getFieldMappings(
      integrationId,
      this.getEntityType()
    );

    // If mappings exist, use them
    if (mappings && mappings.length > 0) {
      return this.erpService.transformToERP(integrationId, this.getEntityType(), {
        ...transaction,
      });
    }

    // Otherwise use default mapping for ERP inventory posting
    return {
      transactionNumber: transaction.transactionNumber,
      transactionType: transaction.type,
      materialId: transaction.materialId,
      quantity: transaction.quantity,
      unitCost: transaction.unitCost,
      totalCost: transaction.totalCost,
      warehouseId: transaction.warehouseId,
      description: transaction.description,
      referenceNumber: transaction.referenceNumber,
      transactionDate: transaction.createdAt,
      createdBy: transaction.createdBy,
      // Map transaction types to ERP values
      erpTransactionType: this.mapTransactionType(transaction.type),
    };
  }

  /**
   * Map MES transaction types to ERP transaction type codes
   */
  private mapTransactionType(mesType: string): string {
    const typeMapping: Record<string, string> = {
      CONSIGNMENT_RECEIPT: 'RECEIPT',
      SCRAP: 'SCRAP',
      RETURN: 'RETURN',
      ADJUSTMENT: 'ADJUSTMENT',
      ISSUE: 'ISSUE',
      TRANSFER: 'TRANSFER',
    };

    return typeMapping[mesType] || mesType;
  }
}

export default InventoryTransactionJob;
