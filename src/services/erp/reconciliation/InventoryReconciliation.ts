/**
 * InventoryReconciliation - Reconcile inventory balances between MES and ERP
 * Issue #60: Phase 3 - Data reconciliation and audit capability
 */

import { EntityReconciliation, Discrepancy } from './ReconciliationService';
import { PrismaClient } from '@prisma/client';
import ERPIntegrationService from '../ERPIntegrationService';
import { logger } from '../../../utils/logger';

/**
 * Inventory balance record from MES or ERP
 */
interface InventoryBalance {
  materialId: string;
  location: string;
  onHandQuantity: number;
  reservedQuantity: number;
  consignmentQuantity: number;
  totalValue: number;
}

/**
 * Reconcile inventory balances between MES and ERP
 */
export class InventoryReconciliation extends EntityReconciliation {
  constructor(prisma?: PrismaClient, erpService?: ERPIntegrationService) {
    super(prisma, erpService);
  }

  getEntityType(): string {
    return 'Inventory';
  }

  /**
   * Fetch MES inventory balances
   */
  async fetchMESRecords(integrationId: string, filters?: any): Promise<InventoryBalance[]> {
    try {
      const materials = await this.prisma.material.findMany({
        select: {
          id: true,
          inventoryTransactions: {
            select: {
              id: true,
              type: true,
              quantity: true,
              totalCost: true,
            },
          },
        },
        ...(filters?.limit && { take: filters.limit }),
        ...(filters?.offset && { skip: filters.offset }),
      });

      // Calculate balances from transaction history
      const balances: InventoryBalance[] = [];

      for (const material of materials) {
        let onHand = 0;
        let reserved = 0;
        let consignment = 0;
        let totalValue = 0;

        for (const txn of material.inventoryTransactions) {
          switch (txn.type) {
            case 'RECEIPT':
              onHand += txn.quantity;
              totalValue += txn.totalCost || 0;
              break;
            case 'ISSUE':
              onHand -= txn.quantity;
              totalValue -= txn.totalCost || 0;
              break;
            case 'CONSIGNMENT_RECEIPT':
              consignment += txn.quantity;
              totalValue += txn.totalCost || 0;
              break;
            case 'CONSIGNMENT_RETURN':
              consignment -= txn.quantity;
              totalValue -= txn.totalCost || 0;
              break;
            case 'RESERVATION':
              reserved += txn.quantity;
              break;
            case 'SCRAP':
              onHand -= txn.quantity;
              totalValue -= txn.totalCost || 0;
              break;
          }
        }

        if (onHand !== 0 || reserved !== 0 || consignment !== 0) {
          balances.push({
            materialId: material.id,
            location: 'MES',
            onHandQuantity: onHand,
            reservedQuantity: reserved,
            consignmentQuantity: consignment,
            totalValue,
          });
        }
      }

      return balances;
    } catch (error) {
      logger.warn('Failed to fetch MES inventory balances', {
        integrationId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Fetch ERP inventory balances via adapter
   */
  async fetchERPRecords(integrationId: string, filters?: any): Promise<InventoryBalance[]> {
    try {
      // TODO: In Phase 4+, fetch from actual ERP adapter
      // For Phase 3, use mock data from sync table
      const syncedInventory = await this.prisma.erpInventorySync.findMany({
        where: { erpIntegrationId: integrationId },
        select: {
          inventoryTransactionId: true,
          transactionType: true,
          erpData: true,
        },
        ...(filters?.limit && { take: filters.limit }),
        ...(filters?.offset && { skip: filters.offset }),
      });

      const balances: InventoryBalance[] = [];
      const materialBalances = new Map<string, InventoryBalance>();

      for (const sync of syncedInventory) {
        const erpData = sync.erpData ? JSON.parse(String(sync.erpData)) : {};
        const key = `${erpData.materialId || 'unknown'}-ERP`;

        let balance = materialBalances.get(key);
        if (!balance) {
          balance = {
            materialId: erpData.materialId || 'unknown',
            location: 'ERP',
            onHandQuantity: 0,
            reservedQuantity: 0,
            consignmentQuantity: 0,
            totalValue: 0,
          };
          materialBalances.set(key, balance);
        }

        const quantity = parseInt(String(erpData.quantity || 0));
        const value = parseFloat(String(erpData.totalCost || 0));

        switch (sync.transactionType) {
          case 'RECEIPT':
            balance.onHandQuantity += quantity;
            balance.totalValue += value;
            break;
          case 'ISSUE':
            balance.onHandQuantity -= quantity;
            balance.totalValue -= value;
            break;
          case 'CONSIGNMENT_RECEIPT':
            balance.consignmentQuantity += quantity;
            balance.totalValue += value;
            break;
          case 'CONSIGNMENT_RETURN':
            balance.consignmentQuantity -= quantity;
            balance.totalValue -= value;
            break;
          case 'ADJUSTMENT':
            // Adjustments update based on delta
            balance.onHandQuantity += quantity;
            break;
        }
      }

      return Array.from(materialBalances.values());
    } catch (error) {
      logger.warn('Failed to fetch ERP inventory balances', {
        integrationId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Get unique identifier for inventory record
   */
  getRecordId(record: InventoryBalance): string {
    return record.materialId;
  }

  /**
   * Compare inventory balances for discrepancies
   */
  async compareRecords(
    mesRecord: InventoryBalance,
    erpRecord: InventoryBalance,
    integrationId: string
  ): Promise<Discrepancy[]> {
    const discrepancies: Discrepancy[] = [];
    const recordId = this.getRecordId(mesRecord);

    // Check on-hand quantity
    if (mesRecord.onHandQuantity !== erpRecord.onHandQuantity) {
      const variance = mesRecord.onHandQuantity - erpRecord.onHandQuantity;
      const severity = Math.abs(variance) > 10 ? 'HIGH' : 'MEDIUM';

      discrepancies.push({
        entityType: this.getEntityType(),
        entityId: recordId,
        mesValue: mesRecord.onHandQuantity,
        erpValue: erpRecord.onHandQuantity,
        fieldName: 'onHandQuantity',
        discrepancyType: 'QUANTITY_VARIANCE',
        severity: severity as any,
        description: `On-hand quantity variance: ${variance > 0 ? '+' : ''}${variance} (MES=${mesRecord.onHandQuantity} vs ERP=${erpRecord.onHandQuantity})`,
        correctionRequired: true,
      });
    }

    // Check reserved quantity
    if (mesRecord.reservedQuantity !== erpRecord.reservedQuantity) {
      const variance = mesRecord.reservedQuantity - erpRecord.reservedQuantity;

      discrepancies.push({
        entityType: this.getEntityType(),
        entityId: recordId,
        mesValue: mesRecord.reservedQuantity,
        erpValue: erpRecord.reservedQuantity,
        fieldName: 'reservedQuantity',
        discrepancyType: 'QUANTITY_VARIANCE',
        severity: 'MEDIUM',
        description: `Reserved quantity variance: ${variance > 0 ? '+' : ''}${variance}`,
        correctionRequired: false,
      });
    }

    // Check consignment quantity
    if (mesRecord.consignmentQuantity !== erpRecord.consignmentQuantity) {
      const variance = mesRecord.consignmentQuantity - erpRecord.consignmentQuantity;

      discrepancies.push({
        entityType: this.getEntityType(),
        entityId: recordId,
        mesValue: mesRecord.consignmentQuantity,
        erpValue: erpRecord.consignmentQuantity,
        fieldName: 'consignmentQuantity',
        discrepancyType: 'QUANTITY_VARIANCE',
        severity: 'HIGH',
        description: `Consignment quantity variance: ${variance > 0 ? '+' : ''}${variance}`,
        correctionRequired: true,
      });
    }

    // Check total value
    if (mesRecord.totalValue && erpRecord.totalValue) {
      const variance = mesRecord.totalValue - erpRecord.totalValue;
      const variancePercent = (variance / Math.abs(erpRecord.totalValue || 1)) * 100;

      if (Math.abs(variancePercent) > 0.01) {
        const severity = Math.abs(variancePercent) > 1 ? 'HIGH' : 'MEDIUM';

        discrepancies.push({
          entityType: this.getEntityType(),
          entityId: recordId,
          mesValue: mesRecord.totalValue,
          erpValue: erpRecord.totalValue,
          fieldName: 'totalValue',
          discrepancyType: 'VALUE_MISMATCH',
          severity: severity as any,
          description: `Inventory value variance: ${variancePercent.toFixed(2)}% ($${variance.toFixed(2)})`,
          correctionRequired: Math.abs(variancePercent) > 1,
        });
      }
    }

    return discrepancies;
  }
}

export default InventoryReconciliation;
