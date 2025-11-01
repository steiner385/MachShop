/**
 * Entity Reconciliation Service
 * Issue #60: Phase 12 - Data Reconciliation System
 *
 * Handles reconciliation logic for specific entity types (Supplier, PurchaseOrder, etc.)
 * Compares data between MES and ERP systems using field mappings.
 */

import { PrismaClient } from '@prisma/client';
import DiscrepancyService, { DiscrepancyDetail } from './DiscrepancyService';
import { logger } from '../../../utils/logger';

/**
 * Entity reconciliation result
 */
export interface EntityReconciliationResult {
  entityType: string;
  totalMesRecords: number;
  totalErpRecords: number;
  matchedRecords: number;
  discrepancies: DiscrepancyDetail[];
}

/**
 * Entity Reconciliation Service
 */
export class EntityReconciliationService {
  private prisma: PrismaClient;
  private discrepancyService: DiscrepancyService;

  constructor(prisma?: PrismaClient, discrepancyService?: DiscrepancyService) {
    this.prisma = prisma || new PrismaClient();
    this.discrepancyService = discrepancyService || new DiscrepancyService(this.prisma);
  }

  /**
   * Reconcile supplier master data
   */
  async reconcileSuppliers(
    integrationId: string,
    reconciliationId: string,
    fieldMappings: Record<string, string> = {}
  ): Promise<EntityReconciliationResult> {
    try {
      logger.info('Starting supplier reconciliation', { integrationId });

      // Get suppliers from MES
      const mesSuppliers = await this.getMesSuppliers(integrationId);

      // Get suppliers from ERP (simulated)
      const erpSuppliers = await this.getErpSuppliers(integrationId);

      const discrepancies: DiscrepancyDetail[] = [];
      let matchedCount = 0;

      // Compare each MES supplier with ERP
      for (const mesSup of mesSuppliers) {
        const erpSup = erpSuppliers.find((s) => s.id === mesSup.id || s.vendorId === mesSup.vendorId);

        if (!erpSup) {
          // Supplier exists in MES but not in ERP
          const disc = await this.discrepancyService.detectDiscrepancies(
            reconciliationId,
            'Supplier',
            mesSup.id,
            { exists: true },
            { exists: false },
            fieldMappings
          );
          discrepancies.push(...disc);
        } else {
          // Compare fields
          const disc = await this.discrepancyService.detectDiscrepancies(
            reconciliationId,
            'Supplier',
            mesSup.id,
            mesSup,
            erpSup,
            fieldMappings
          );

          if (disc.length === 0) {
            matchedCount++;
          } else {
            discrepancies.push(...disc);
          }
        }
      }

      // Check for suppliers in ERP but not in MES
      for (const erpSup of erpSuppliers) {
        const mesSup = mesSuppliers.find((s) => s.id === erpSup.id || s.vendorId === erpSup.vendorId);
        if (!mesSup) {
          const disc = await this.discrepancyService.detectDiscrepancies(
            reconciliationId,
            'Supplier',
            erpSup.id,
            { exists: false },
            { exists: true },
            fieldMappings
          );
          discrepancies.push(...disc);
        }
      }

      logger.info('Supplier reconciliation completed', {
        integrationId,
        mesCount: mesSuppliers.length,
        erpCount: erpSuppliers.length,
        matchedCount,
        discrepancyCount: discrepancies.length,
      });

      return {
        entityType: 'Supplier',
        totalMesRecords: mesSuppliers.length,
        totalErpRecords: erpSuppliers.length,
        matchedRecords: matchedCount,
        discrepancies,
      };
    } catch (error) {
      logger.error('Failed to reconcile suppliers', {
        error: error instanceof Error ? error.message : String(error),
        integrationId,
      });
      throw error;
    }
  }

  /**
   * Reconcile purchase orders
   */
  async reconcilePurchaseOrders(
    integrationId: string,
    reconciliationId: string,
    fieldMappings: Record<string, string> = {}
  ): Promise<EntityReconciliationResult> {
    try {
      logger.info('Starting purchase order reconciliation', { integrationId });

      // Get POs from MES
      const mesPOs = await this.getMesPurchaseOrders(integrationId);

      // Get POs from ERP (simulated)
      const erpPOs = await this.getErpPurchaseOrders(integrationId);

      const discrepancies: DiscrepancyDetail[] = [];
      let matchedCount = 0;

      // Compare each MES PO with ERP
      for (const mesPO of mesPOs) {
        const erpPO = erpPOs.find((p) => p.id === mesPO.id || p.poNumber === mesPO.poNumber);

        if (!erpPO) {
          const disc = await this.discrepancyService.detectDiscrepancies(
            reconciliationId,
            'PurchaseOrder',
            mesPO.id,
            { exists: true },
            { exists: false },
            fieldMappings
          );
          discrepancies.push(...disc);
        } else {
          const disc = await this.discrepancyService.detectDiscrepancies(
            reconciliationId,
            'PurchaseOrder',
            mesPO.id,
            mesPO,
            erpPO,
            fieldMappings
          );

          if (disc.length === 0) {
            matchedCount++;
          } else {
            discrepancies.push(...disc);
          }
        }
      }

      // Check for POs in ERP but not in MES
      for (const erpPO of erpPOs) {
        const mesPO = mesPOs.find((p) => p.id === erpPO.id || p.poNumber === erpPO.poNumber);
        if (!mesPO) {
          const disc = await this.discrepancyService.detectDiscrepancies(
            reconciliationId,
            'PurchaseOrder',
            erpPO.id,
            { exists: false },
            { exists: true },
            fieldMappings
          );
          discrepancies.push(...disc);
        }
      }

      logger.info('Purchase order reconciliation completed', {
        integrationId,
        mesCount: mesPOs.length,
        erpCount: erpPOs.length,
        matchedCount,
        discrepancyCount: discrepancies.length,
      });

      return {
        entityType: 'PurchaseOrder',
        totalMesRecords: mesPOs.length,
        totalErpRecords: erpPOs.length,
        matchedRecords: matchedCount,
        discrepancies,
      };
    } catch (error) {
      logger.error('Failed to reconcile purchase orders', {
        error: error instanceof Error ? error.message : String(error),
        integrationId,
      });
      throw error;
    }
  }

  /**
   * Reconcile work orders
   */
  async reconcileWorkOrders(
    integrationId: string,
    reconciliationId: string,
    fieldMappings: Record<string, string> = {}
  ): Promise<EntityReconciliationResult> {
    try {
      logger.info('Starting work order reconciliation', { integrationId });

      const mesWOs = await this.getMesWorkOrders(integrationId);
      const erpWOs = await this.getErpWorkOrders(integrationId);

      const discrepancies: DiscrepancyDetail[] = [];
      let matchedCount = 0;

      for (const mesWO of mesWOs) {
        const erpWO = erpWOs.find((w) => w.id === mesWO.id || w.workOrderNumber === mesWO.workOrderNumber);

        if (!erpWO) {
          const disc = await this.discrepancyService.detectDiscrepancies(
            reconciliationId,
            'WorkOrder',
            mesWO.id,
            { exists: true },
            { exists: false },
            fieldMappings
          );
          discrepancies.push(...disc);
        } else {
          const disc = await this.discrepancyService.detectDiscrepancies(
            reconciliationId,
            'WorkOrder',
            mesWO.id,
            mesWO,
            erpWO,
            fieldMappings
          );

          if (disc.length === 0) {
            matchedCount++;
          } else {
            discrepancies.push(...disc);
          }
        }
      }

      logger.info('Work order reconciliation completed', {
        integrationId,
        mesCount: mesWOs.length,
        erpCount: erpWOs.length,
        matchedCount,
        discrepancyCount: discrepancies.length,
      });

      return {
        entityType: 'WorkOrder',
        totalMesRecords: mesWOs.length,
        totalErpRecords: erpWOs.length,
        matchedRecords: matchedCount,
        discrepancies,
      };
    } catch (error) {
      logger.error('Failed to reconcile work orders', {
        error: error instanceof Error ? error.message : String(error),
        integrationId,
      });
      throw error;
    }
  }

  /**
   * Reconcile inventory
   */
  async reconcileInventory(
    integrationId: string,
    reconciliationId: string,
    fieldMappings: Record<string, string> = {}
  ): Promise<EntityReconciliationResult> {
    try {
      logger.info('Starting inventory reconciliation', { integrationId });

      const mesInventory = await this.getMesInventory(integrationId);
      const erpInventory = await this.getErpInventory(integrationId);

      const discrepancies: DiscrepancyDetail[] = [];
      let matchedCount = 0;

      for (const mesItem of mesInventory) {
        const erpItem = erpInventory.find((i) => i.partNumber === mesItem.partNumber);

        if (!erpItem) {
          const disc = await this.discrepancyService.detectDiscrepancies(
            reconciliationId,
            'Inventory',
            mesItem.id,
            { exists: true },
            { exists: false },
            fieldMappings
          );
          discrepancies.push(...disc);
        } else {
          const disc = await this.discrepancyService.detectDiscrepancies(
            reconciliationId,
            'Inventory',
            mesItem.id,
            mesItem,
            erpItem,
            fieldMappings
          );

          if (disc.length === 0) {
            matchedCount++;
          } else {
            discrepancies.push(...disc);
          }
        }
      }

      logger.info('Inventory reconciliation completed', {
        integrationId,
        mesCount: mesInventory.length,
        erpCount: erpInventory.length,
        matchedCount,
        discrepancyCount: discrepancies.length,
      });

      return {
        entityType: 'Inventory',
        totalMesRecords: mesInventory.length,
        totalErpRecords: erpInventory.length,
        matchedRecords: matchedCount,
        discrepancies,
      };
    } catch (error) {
      logger.error('Failed to reconcile inventory', {
        error: error instanceof Error ? error.message : String(error),
        integrationId,
      });
      throw error;
    }
  }

  // Helper methods to simulate data retrieval
  private async getMesSuppliers(integrationId: string): Promise<any[]> {
    // In real implementation: return this.prisma.supplier.findMany()
    return [];
  }

  private async getErpSuppliers(integrationId: string): Promise<any[]> {
    // In real implementation: fetch from ERP system
    return [];
  }

  private async getMesPurchaseOrders(integrationId: string): Promise<any[]> {
    // In real implementation: return this.prisma.purchaseOrder.findMany()
    return [];
  }

  private async getErpPurchaseOrders(integrationId: string): Promise<any[]> {
    // In real implementation: fetch from ERP system
    return [];
  }

  private async getMesWorkOrders(integrationId: string): Promise<any[]> {
    // In real implementation: return this.prisma.workOrder.findMany()
    return [];
  }

  private async getErpWorkOrders(integrationId: string): Promise<any[]> {
    // In real implementation: fetch from ERP system
    return [];
  }

  private async getMesInventory(integrationId: string): Promise<any[]> {
    // In real implementation: return this.prisma.inventory.findMany()
    return [];
  }

  private async getErpInventory(integrationId: string): Promise<any[]> {
    // In real implementation: fetch from ERP system
    return [];
  }
}

export default EntityReconciliationService;
