/**
 * POReconciliation - Reconcile purchase orders between MES and ERP
 * Issue #60: Phase 3 - Data reconciliation and audit capability
 */

import { EntityReconciliation, Discrepancy } from './ReconciliationService';
import { PrismaClient } from '@prisma/client';
import ERPIntegrationService from '../ERPIntegrationService';
import { logger } from '../../../utils/logger';

/**
 * Reconcile purchase orders between MES and ERP
 */
export class POReconciliation extends EntityReconciliation {
  constructor(prisma?: PrismaClient, erpService?: ERPIntegrationService) {
    super(prisma, erpService);
  }

  getEntityType(): string {
    return 'PurchaseOrder';
  }

  /**
   * Fetch MES purchase orders
   */
  async fetchMESRecords(integrationId: string, filters?: any): Promise<any[]> {
    try {
      return await this.prisma.purchaseOrder.findMany({
        select: {
          id: true,
          poNumber: true,
          vendorId: true,
          status: true,
          totalAmount: true,
          quantity: true,
          requiredDate: true,
          createdAt: true,
          updatedAt: true,
        },
        ...(filters?.limit && { take: filters.limit }),
        ...(filters?.offset && { skip: filters.offset }),
      });
    } catch (error) {
      logger.warn('Failed to fetch MES purchase orders', {
        integrationId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Fetch ERP purchase orders via adapter
   */
  async fetchERPRecords(integrationId: string, filters?: any): Promise<any[]> {
    try {
      // TODO: In Phase 4+, fetch from actual ERP adapter
      // For Phase 3, use mock data from sync table
      const syncedPOs = await this.prisma.erpPurchaseOrderSync.findMany({
        where: { erpIntegrationId: integrationId },
        select: {
          purchaseOrderId: true,
          erpPoNumber: true,
          lastSyncAt: true,
          erpPoData: true,
        },
        ...(filters?.limit && { take: filters.limit }),
        ...(filters?.offset && { skip: filters.offset }),
      });

      return syncedPOs.map((p) => ({
        id: p.erpPoNumber,
        poNumber: p.erpPoNumber,
        data: p.erpPoData ? JSON.parse(String(p.erpPoData)) : {},
        lastSyncAt: p.lastSyncAt,
        mesPoId: p.purchaseOrderId,
      }));
    } catch (error) {
      logger.warn('Failed to fetch ERP purchase orders', {
        integrationId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Get unique identifier for PO record
   */
  getRecordId(record: any): string {
    return record.poNumber || record.id;
  }

  /**
   * Compare PO records for discrepancies
   */
  async compareRecords(
    mesRecord: any,
    erpRecord: any,
    integrationId: string
  ): Promise<Discrepancy[]> {
    const discrepancies: Discrepancy[] = [];
    const recordId = this.getRecordId(mesRecord);

    // Check PO status
    const mesStatus = mesRecord.status;
    const erpStatus = erpRecord.data?.status;

    if (mesStatus !== erpStatus && erpStatus) {
      discrepancies.push({
        entityType: this.getEntityType(),
        entityId: recordId,
        mesValue: mesStatus,
        erpValue: erpStatus,
        fieldName: 'status',
        discrepancyType: 'VALUE_MISMATCH',
        severity: 'HIGH',
        description: `PO status mismatch: MES="${mesStatus}" vs ERP="${erpStatus}"`,
        correctionRequired: true,
      });
    }

    // Check total amount
    if (mesRecord.totalAmount && erpRecord.data?.totalAmount) {
      const meAmount = parseFloat(String(mesRecord.totalAmount));
      const erpAmount = parseFloat(String(erpRecord.data.totalAmount));

      const variance = Math.abs(meAmount - erpAmount);
      const variancePercent = (variance / erpAmount) * 100;

      if (variancePercent > 0.01) {
        // Allow 0.01% variance for rounding
        const severity = variancePercent > 1 ? 'HIGH' : 'MEDIUM';
        discrepancies.push({
          entityType: this.getEntityType(),
          entityId: recordId,
          mesValue: meAmount,
          erpValue: erpAmount,
          fieldName: 'totalAmount',
          discrepancyType: 'VALUE_MISMATCH',
          severity: severity as any,
          description: `PO amount variance: ${variancePercent.toFixed(2)}% (MES=$${meAmount} vs ERP=$${erpAmount})`,
          correctionRequired: variancePercent > 1,
        });
      }
    }

    // Check quantity
    if (mesRecord.quantity && erpRecord.data?.quantity) {
      const mesQuantity = parseInt(String(mesRecord.quantity));
      const erpQuantity = parseInt(String(erpRecord.data.quantity));

      if (mesQuantity !== erpQuantity) {
        discrepancies.push({
          entityType: this.getEntityType(),
          entityId: recordId,
          mesValue: mesQuantity,
          erpValue: erpQuantity,
          fieldName: 'quantity',
          discrepancyType: 'QUANTITY_VARIANCE',
          severity: 'HIGH',
          description: `PO quantity mismatch: MES=${mesQuantity} vs ERP=${erpQuantity}`,
          correctionRequired: true,
        });
      }
    }

    // Check required date
    if (mesRecord.requiredDate && erpRecord.data?.requiredDate) {
      const mesDate = new Date(mesRecord.requiredDate).getTime();
      const erpDate = new Date(erpRecord.data.requiredDate).getTime();

      // Check if dates differ by more than 1 day
      const dayDiff = Math.abs(mesDate - erpDate) / (1000 * 60 * 60 * 24);

      if (dayDiff > 1) {
        discrepancies.push({
          entityType: this.getEntityType(),
          entityId: recordId,
          mesValue: mesRecord.requiredDate,
          erpValue: erpRecord.data.requiredDate,
          fieldName: 'requiredDate',
          discrepancyType: 'VALUE_MISMATCH',
          severity: 'MEDIUM',
          description: `PO required date difference: ${dayDiff.toFixed(1)} days`,
          correctionRequired: false,
        });
      }
    }

    // Check for received quantity discrepancy (if tracked)
    if (mesRecord.receivedQuantity && erpRecord.data?.receivedQuantity) {
      const mesReceived = parseInt(String(mesRecord.receivedQuantity));
      const erpReceived = parseInt(String(erpRecord.data.receivedQuantity));

      if (mesReceived !== erpReceived) {
        discrepancies.push({
          entityType: this.getEntityType(),
          entityId: recordId,
          mesValue: mesReceived,
          erpValue: erpReceived,
          fieldName: 'receivedQuantity',
          discrepancyType: 'QUANTITY_VARIANCE',
          severity: 'HIGH',
          description: `PO received quantity mismatch: MES=${mesReceived} vs ERP=${erpReceived}`,
          correctionRequired: true,
        });
      }
    }

    return discrepancies;
  }
}

export default POReconciliation;
