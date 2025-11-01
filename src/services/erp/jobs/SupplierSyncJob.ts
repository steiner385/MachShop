/**
 * SupplierSyncJob - Sync supplier/vendor master data from ERP to MES
 * Issue #60: Phase 2 - Async sync engine
 */

import { Job } from 'bullmq';
import { BaseSyncJob, SyncJobData, SyncJobResult } from './BaseSyncJob';
import { PrismaClient } from '@prisma/client';
import ERPIntegrationService from '../ERPIntegrationService';

export interface SupplierData {
  vendorId: string;
  code: string;
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  certifications?: string[];
  approvedVendor?: boolean;
  qualityRating?: number;
  onTimeDeliveryRate?: number;
}

/**
 * Sync supplier/vendor master data from ERP to MES
 * Direction: INBOUND (ERP → MES)
 */
export class SupplierSyncJob extends BaseSyncJob {
  constructor(prisma?: PrismaClient, erpService?: ERPIntegrationService) {
    super(prisma, erpService);
  }

  getJobName(): string {
    return 'SupplierSync';
  }

  getTransactionType(): string {
    return 'SUPPLIER_SYNC';
  }

  getEntityType(): string {
    return 'Supplier';
  }

  /**
   * Execute supplier sync from ERP
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
      // In Phase 2, we mock the ERP adapter
      // In Phase 4+, actual adapters will be plugged in
      const suppliers = await this.mockFetchSuppliersFromERP(data);

      const totalToProcess = suppliers.length;

      // Log batch transaction
      await this.logTransaction(data.integrationId, data, 'IN_PROGRESS', {
        supplier_count: totalToProcess,
      });

      for (let i = 0; i < suppliers.length; i++) {
        const supplier = suppliers[i];

        try {
          // Transform ERP data to MES format
          const transformedData = await this.transformSupplierData(
            data.integrationId,
            supplier
          );

          if (!data.dryRun) {
            // Upsert supplier in MES database
            await this.prisma.vendor.upsert({
              where: { code: transformedData.code },
              update: transformedData,
              create: {
                code: transformedData.code,
                name: transformedData.name,
                ...transformedData,
              },
            });

            // Update sync status
            await this.prisma.erpSupplierSync.upsert({
              where: { vendorId: transformedData.id || supplier.vendorId },
              update: {
                lastSyncAt: new Date(),
                lastSyncStatus: 'SUCCESS',
                erpHash: this.hashObject(supplier),
              },
              create: {
                vendorId: transformedData.id || supplier.vendorId,
                erpVendorId: supplier.vendorId,
                erpIntegrationId: data.integrationId,
                lastSyncAt: new Date(),
                lastSyncStatus: 'SUCCESS',
                erpHash: this.hashObject(supplier),
              },
            });
          }

          processedCount++;

          // Update progress
          const progress = Math.round(((i + 1) / totalToProcess) * 100);
          this.updateJobProgress(job, progress);

          this.logger.debug(`Synced supplier: ${supplier.code}`, {
            integrationId: data.integrationId,
            supplier: supplier.code,
          });
        } catch (error) {
          failedCount++;
          const errorMsg = error instanceof Error ? error.message : String(error);
          errors.push({
            id: supplier.vendorId || supplier.code,
            error: errorMsg,
          });

          this.logger.warn(`Failed to sync supplier: ${supplier.code}`, {
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
      });

      return {
        success: failedCount === 0,
        processedCount,
        failedCount,
        skippedCount,
        errors,
        duration: 0,
        message: `Synced ${processedCount} suppliers${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      await this.logTransaction(data.integrationId, data, 'FAILED', {}, errorMsg);

      throw error;
    }
  }

  /**
   * Transform supplier data from ERP format to MES format
   */
  private async transformSupplierData(
    integrationId: string,
    erpSupplier: any
  ): Promise<any> {
    // Get field mappings for Supplier entity
    const mappings = await this.erpService.getFieldMappings(
      integrationId,
      this.getEntityType()
    );

    // If mappings exist, use them
    if (mappings && mappings.length > 0) {
      return this.erpService.transformToERP(integrationId, this.getEntityType(), {
        ...erpSupplier,
      });
    }

    // Otherwise use default mapping
    return {
      id: erpSupplier.id,
      code: erpSupplier.code,
      name: erpSupplier.name,
      contactEmail: erpSupplier.email,
      contactPhone: erpSupplier.phone,
      address: erpSupplier.address,
      certifications: erpSupplier.certifications || [],
      approvedVendor: erpSupplier.approved !== false,
      qualityRating: erpSupplier.quality_rating || 0,
      onTimeDeliveryRate: erpSupplier.on_time_rate || 0,
    };
  }

  /**
   * Mock ERP supplier fetch (replaced in Phase 4 with actual adapter)
   */
  private async mockFetchSuppliersFromERP(
    data: SyncJobData
  ): Promise<any[]> {
    // TODO: Replace with actual ERP adapter in Phase 4
    // For now, return empty array (safe for testing)
    this.logger.info('Using mock supplier fetch - adapter not yet implemented', {
      integrationId: data.integrationId,
    });

    return [];
  }

  /**
   * Hash object for change detection
   */
  private hashObject(obj: any): string {
    const crypto = require('crypto');
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(obj))
      .digest('hex');
  }
}

export default SupplierSyncJob;
