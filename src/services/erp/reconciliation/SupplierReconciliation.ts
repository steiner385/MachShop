/**
 * SupplierReconciliation - Reconcile supplier/vendor master data between MES and ERP
 * Issue #60: Phase 3 - Data reconciliation and audit capability
 */

import { EntityReconciliation, Discrepancy } from './ReconciliationService';
import { PrismaClient } from '@prisma/client';
import ERPIntegrationService from '../ERPIntegrationService';
import { logger } from '../../../utils/logger';

/**
 * Reconcile supplier/vendor master data
 */
export class SupplierReconciliation extends EntityReconciliation {
  constructor(prisma?: PrismaClient, erpService?: ERPIntegrationService) {
    super(prisma, erpService);
  }

  getEntityType(): string {
    return 'Supplier';
  }

  /**
   * Fetch MES supplier records
   */
  async fetchMESRecords(integrationId: string, filters?: any): Promise<any[]> {
    try {
      return await this.prisma.vendor.findMany({
        select: {
          id: true,
          code: true,
          name: true,
          address: true,
          contactEmail: true,
          contactPhone: true,
          approvedStatus: true,
          qualityRating: true,
          onTimeDeliveryRate: true,
          createdAt: true,
          updatedAt: true,
        },
        ...(filters?.limit && { take: filters.limit }),
        ...(filters?.offset && { skip: filters.offset }),
      });
    } catch (error) {
      logger.warn('Failed to fetch MES suppliers', {
        integrationId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Fetch ERP supplier records via adapter
   */
  async fetchERPRecords(integrationId: string, filters?: any): Promise<any[]> {
    try {
      // TODO: In Phase 4+, fetch from actual ERP adapter
      // For Phase 3, use mock data from sync table
      const syncedSuppliers = await this.prisma.erpSupplierSync.findMany({
        where: { erpIntegrationId: integrationId },
        select: {
          erpVendorId: true,
          erpVendorCode: true,
          erpVendorName: true,
          erpVendorData: true,
          lastSyncAt: true,
          erpHash: true,
        },
        ...(filters?.limit && { take: filters.limit }),
        ...(filters?.offset && { skip: filters.offset }),
      });

      return syncedSuppliers.map((s) => ({
        id: s.erpVendorId,
        code: s.erpVendorCode,
        name: s.erpVendorName,
        data: s.erpVendorData ? JSON.parse(String(s.erpVendorData)) : {},
        lastSyncAt: s.lastSyncAt,
        hash: s.erpHash,
      }));
    } catch (error) {
      logger.warn('Failed to fetch ERP suppliers', {
        integrationId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Get unique identifier for supplier record
   */
  getRecordId(record: any): string {
    return record.code || record.id;
  }

  /**
   * Compare supplier records for discrepancies
   */
  async compareRecords(
    mesRecord: any,
    erpRecord: any,
    integrationId: string
  ): Promise<Discrepancy[]> {
    const discrepancies: Discrepancy[] = [];
    const recordId = this.getRecordId(mesRecord);

    // Check supplier name
    if (mesRecord.name !== erpRecord.name) {
      discrepancies.push({
        entityType: this.getEntityType(),
        entityId: recordId,
        mesValue: mesRecord.name,
        erpValue: erpRecord.name,
        fieldName: 'name',
        discrepancyType: 'VALUE_MISMATCH',
        severity: 'MEDIUM',
        description: `Supplier name mismatch: MES="${mesRecord.name}" vs ERP="${erpRecord.name}"`,
        correctionRequired: false,
      });
    }

    // Check supplier address
    if (mesRecord.address !== erpRecord.data?.address) {
      discrepancies.push({
        entityType: this.getEntityType(),
        entityId: recordId,
        mesValue: mesRecord.address,
        erpValue: erpRecord.data?.address,
        fieldName: 'address',
        discrepancyType: 'VALUE_MISMATCH',
        severity: 'LOW',
        description: `Supplier address mismatch for ${recordId}`,
        correctionRequired: false,
      });
    }

    // Check approval status
    const mesApproved = mesRecord.approvedStatus === true;
    const erpApproved = erpRecord.data?.approved !== false;

    if (mesApproved !== erpApproved) {
      discrepancies.push({
        entityType: this.getEntityType(),
        entityId: recordId,
        mesValue: mesApproved,
        erpValue: erpApproved,
        fieldName: 'approvedStatus',
        discrepancyType: 'VALUE_MISMATCH',
        severity: 'HIGH',
        description: `Supplier approval status mismatch for ${recordId}`,
        correctionRequired: true,
      });
    }

    // Check quality rating (if in ERP)
    if (erpRecord.data?.quality_rating !== undefined) {
      const mesQuality = mesRecord.qualityRating || 0;
      const erpQuality = erpRecord.data?.quality_rating || 0;

      if (Math.abs(mesQuality - erpQuality) > 0.01) {
        discrepancies.push({
          entityType: this.getEntityType(),
          entityId: recordId,
          mesValue: mesQuality,
          erpValue: erpQuality,
          fieldName: 'qualityRating',
          discrepancyType: 'VALUE_MISMATCH',
          severity: 'LOW',
          description: `Supplier quality rating variance for ${recordId}`,
          correctionRequired: false,
        });
      }
    }

    // Check on-time delivery rate (if in ERP)
    if (erpRecord.data?.on_time_rate !== undefined) {
      const mesOnTime = mesRecord.onTimeDeliveryRate || 0;
      const erpOnTime = erpRecord.data?.on_time_rate || 0;

      if (Math.abs(mesOnTime - erpOnTime) > 0.01) {
        discrepancies.push({
          entityType: this.getEntityType(),
          entityId: recordId,
          mesValue: mesOnTime,
          erpValue: erpOnTime,
          fieldName: 'onTimeDeliveryRate',
          discrepancyType: 'VALUE_MISMATCH',
          severity: 'LOW',
          description: `Supplier on-time delivery rate variance for ${recordId}`,
          correctionRequired: false,
        });
      }
    }

    return discrepancies;
  }
}

export default SupplierReconciliation;
