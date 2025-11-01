/**
 * Inventory Management Service
 * Issue #88: Comprehensive Inventory Management
 *
 * Manages inventory across multiple locations with:
 * - Real-time inventory visibility
 * - Inventory transactions (receipts, issues, transfers, adjustments)
 * - Lot and serial number tracking
 * - Costing methods (FIFO, LIFO, Average)
 * - Replenishment and ABC analysis
 * - Expiration date tracking
 * - Inventory valuation
 */

import prisma from '../lib/database';
import {
  Inventory,
  MaterialTransaction,
  MaterialTransactionType,
  Location,
  InventoryStatus,
} from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

export type CostingMethod = 'FIFO' | 'LIFO' | 'AVERAGE';
export type ABCCategory = 'A' | 'B' | 'C';

interface InventoryCreateInput {
  partId: string;
  locationId: string;
  lotNumber?: string;
  quantity: number;
  unitOfMeasure: string;
  unitCost?: number;
  receivedDate: Date;
  expiryDate?: Date;
}

interface InventoryTransactionInput {
  inventoryId: string;
  transactionType: MaterialTransactionType;
  quantity: number;
  unitOfMeasure: string;
  workOrderId?: string;
  reference?: string;
}

interface InventoryTransferInput {
  fromInventoryId: string;
  toLocationId: string;
  quantity: number;
  partId: string;
  workOrderId?: string;
}

interface ABCAnalysisResult {
  partId: string;
  category: ABCCategory;
  annualValue: number;
  percentage: number;
  quantity: number;
}

export class InventoryService {
  constructor() {}

  // ==================== INVENTORY CREATION & UPDATES ====================

  /**
   * Create new inventory item
   */
  async createInventory(input: InventoryCreateInput): Promise<Inventory> {
    const { partId, locationId, lotNumber, quantity, unitOfMeasure, unitCost, receivedDate, expiryDate } = input;

    // Verify part exists
    const part = await prisma.part.findUnique({ where: { id: partId } });
    if (!part) {
      throw new Error(`Part ${partId} not found`);
    }

    // Verify location exists
    const location = await prisma.location.findUnique({ where: { id: locationId } });
    if (!location) {
      throw new Error(`Location ${locationId} not found`);
    }

    // Create inventory item
    return prisma.inventory.create({
      data: {
        partId,
        locationId,
        location: location.locationCode, // Legacy field
        lotNumber,
        quantity,
        unitOfMeasure,
        unitOfMeasureId: await this.resolveUomId(unitOfMeasure),
        unitCost,
        receivedDate,
        expiryDate,
        isActive: true,
      },
    });
  }

  /**
   * Get inventory by ID
   */
  async getInventory(inventoryId: string): Promise<Inventory | null> {
    return prisma.inventory.findUnique({
      where: { id: inventoryId },
      include: {
        part: true,
        locationRef: true,
      },
    });
  }

  /**
   * Get inventory for a part at all locations
   */
  async getPartInventory(partId: string) {
    return prisma.inventory.findMany({
      where: { partId, isActive: true },
      include: {
        part: true,
        locationRef: true,
        transactions: { take: 10, orderBy: { transactionDate: 'desc' } },
      },
      orderBy: { locationRef: { locationCode: 'asc' } },
    });
  }

  /**
   * Get inventory at a location
   */
  async getLocationInventory(locationId: string) {
    return prisma.inventory.findMany({
      where: { locationId, isActive: true },
      include: {
        part: true,
        locationRef: true,
      },
      orderBy: { part: { partNumber: 'asc' } },
    });
  }

  /**
   * Get total inventory quantity for a part
   */
  async getPartTotalQuantity(partId: string): Promise<number> {
    const result = await prisma.inventory.aggregate({
      where: { partId, isActive: true },
      _sum: { quantity: true },
    });
    return result._sum.quantity || 0;
  }

  /**
   * Update inventory quantity (add/subtract)
   */
  async updateInventoryQuantity(inventoryId: string, quantityDelta: number): Promise<Inventory> {
    const inventory = await this.getInventory(inventoryId);
    if (!inventory) {
      throw new Error(`Inventory ${inventoryId} not found`);
    }

    const newQuantity = inventory.quantity + quantityDelta;
    if (newQuantity < 0) {
      throw new Error(`Insufficient inventory. Available: ${inventory.quantity}, Requested: ${Math.abs(quantityDelta)}`);
    }

    return prisma.inventory.update({
      where: { id: inventoryId },
      data: { quantity: newQuantity },
    });
  }

  // ==================== INVENTORY TRANSACTIONS ====================

  /**
   * Log an inventory transaction
   */
  async logTransaction(input: InventoryTransactionInput): Promise<MaterialTransaction> {
    const { inventoryId, transactionType, quantity, unitOfMeasure, workOrderId, reference } = input;

    // Get inventory
    const inventory = await this.getInventory(inventoryId);
    if (!inventory) {
      throw new Error(`Inventory ${inventoryId} not found`);
    }

    // Create transaction
    const transaction = await prisma.materialTransaction.create({
      data: {
        inventoryId,
        transactionType,
        quantity,
        unitOfMeasure,
        unitOfMeasureId: await this.resolveUomId(unitOfMeasure),
        workOrderId,
        reference,
        transactionDate: new Date(),
      },
    });

    // Update inventory quantity based on transaction type
    switch (transactionType) {
      case MaterialTransactionType.RECEIPT:
        await this.updateInventoryQuantity(inventoryId, quantity);
        break;
      case MaterialTransactionType.ISSUE:
        await this.updateInventoryQuantity(inventoryId, -quantity);
        break;
      case MaterialTransactionType.ADJUSTMENT:
        await this.updateInventoryQuantity(inventoryId, quantity);
        break;
      case MaterialTransactionType.SCRAP:
        await this.updateInventoryQuantity(inventoryId, -quantity);
        break;
      // TRANSFER is handled separately
    }

    return transaction;
  }

  /**
   * Transfer inventory between locations
   */
  async transferInventory(input: InventoryTransferInput): Promise<{ source: Inventory; destination: Inventory; transaction: MaterialTransaction }> {
    const { fromInventoryId, toLocationId, quantity, partId, workOrderId } = input;

    // Get source inventory
    const sourceInventory = await this.getInventory(fromInventoryId);
    if (!sourceInventory) {
      throw new Error(`Source inventory ${fromInventoryId} not found`);
    }

    if (sourceInventory.quantity < quantity) {
      throw new Error(`Insufficient quantity. Available: ${sourceInventory.quantity}, Requested: ${quantity}`);
    }

    // Create or get destination inventory
    let destinationInventory = await prisma.inventory.findFirst({
      where: {
        partId,
        locationId: toLocationId,
        isActive: true,
      },
    });

    if (!destinationInventory) {
      // Create new inventory at destination location
      const location = await prisma.location.findUnique({ where: { id: toLocationId } });
      if (!location) {
        throw new Error(`Location ${toLocationId} not found`);
      }

      destinationInventory = await prisma.inventory.create({
        data: {
          partId,
          locationId: toLocationId,
          location: location.locationCode,
          quantity: 0,
          unitOfMeasure: sourceInventory.unitOfMeasure,
          unitOfMeasureId: sourceInventory.unitOfMeasureId,
          unitCost: sourceInventory.unitCost,
          isActive: true,
        },
      });
    }

    // Log transfer transaction
    const transaction = await prisma.materialTransaction.create({
      data: {
        inventoryId: fromInventoryId,
        transactionType: MaterialTransactionType.TRANSFER,
        quantity,
        unitOfMeasure: sourceInventory.unitOfMeasure,
        unitOfMeasureId: sourceInventory.unitOfMeasureId,
        workOrderId,
        reference: `Transfer to ${toLocationId}`,
        transactionDate: new Date(),
      },
    });

    // Update quantities
    await this.updateInventoryQuantity(fromInventoryId, -quantity);
    await this.updateInventoryQuantity(destinationInventory.id, quantity);

    return {
      source: await this.getInventory(fromInventoryId),
      destination: await this.getInventory(destinationInventory.id),
      transaction,
    };
  }

  /**
   * Get transaction history for an inventory item
   */
  async getTransactionHistory(inventoryId: string, limit: number = 50) {
    return prisma.materialTransaction.findMany({
      where: { inventoryId },
      include: {
        workOrder: { select: { workOrderNumber: true, status: true } },
      },
      orderBy: { transactionDate: 'desc' },
      take: limit,
    });
  }

  // ==================== INVENTORY COSTING ====================

  /**
   * Calculate FIFO cost for inventory
   * First In, First Out - oldest batches are used first
   */
  async calculateFIFOCost(partId: string, quantityNeeded: number): Promise<{ totalCost: number; unitCost: number }> {
    const inventory = await prisma.inventory.findMany({
      where: { partId, isActive: true },
      orderBy: { receivedDate: 'asc' }, // Oldest first
    });

    let totalCost = 0;
    let quantityRemaining = quantityNeeded;

    for (const item of inventory) {
      if (quantityRemaining <= 0) break;

      const quantityToUse = Math.min(item.quantity, quantityRemaining);
      const itemCost = (item.unitCost || 0) * quantityToUse;
      totalCost += itemCost;
      quantityRemaining -= quantityToUse;
    }

    if (quantityRemaining > 0) {
      throw new Error(`Insufficient inventory for part ${partId}. Short by ${quantityRemaining} units`);
    }

    return {
      totalCost,
      unitCost: totalCost / quantityNeeded,
    };
  }

  /**
   * Calculate LIFO cost for inventory
   * Last In, First Out - newest batches are used first
   */
  async calculateLIFOCost(partId: string, quantityNeeded: number): Promise<{ totalCost: number; unitCost: number }> {
    const inventory = await prisma.inventory.findMany({
      where: { partId, isActive: true },
      orderBy: { receivedDate: 'desc' }, // Newest first
    });

    let totalCost = 0;
    let quantityRemaining = quantityNeeded;

    for (const item of inventory) {
      if (quantityRemaining <= 0) break;

      const quantityToUse = Math.min(item.quantity, quantityRemaining);
      const itemCost = (item.unitCost || 0) * quantityToUse;
      totalCost += itemCost;
      quantityRemaining -= quantityToUse;
    }

    if (quantityRemaining > 0) {
      throw new Error(`Insufficient inventory for part ${partId}. Short by ${quantityRemaining} units`);
    }

    return {
      totalCost,
      unitCost: totalCost / quantityNeeded,
    };
  }

  /**
   * Calculate average cost for inventory
   * Weighted average of all available inventory
   */
  async calculateAverageCost(partId: string, quantityNeeded: number): Promise<{ totalCost: number; unitCost: number }> {
    const inventory = await prisma.inventory.findMany({
      where: { partId, isActive: true },
    });

    let totalQuantity = 0;
    let totalValue = 0;

    for (const item of inventory) {
      totalQuantity += item.quantity;
      totalValue += (item.unitCost || 0) * item.quantity;
    }

    if (totalQuantity < quantityNeeded) {
      throw new Error(`Insufficient inventory for part ${partId}. Available: ${totalQuantity}, Needed: ${quantityNeeded}`);
    }

    const averageUnitCost = totalQuantity > 0 ? totalValue / totalQuantity : 0;
    const totalCost = averageUnitCost * quantityNeeded;

    return {
      totalCost,
      unitCost: averageUnitCost,
    };
  }

  /**
   * Calculate inventory valuation
   */
  async calculateInventoryValuation(partId?: string): Promise<{ total: number; byPart: any[] }> {
    const where = partId ? { partId } : {};

    const inventory = await prisma.inventory.findMany({
      where: { ...where, isActive: true },
      include: { part: true },
    });

    let total = 0;
    const byPart: any[] = [];

    for (const item of inventory) {
      const value = (item.unitCost || 0) * item.quantity;
      total += value;

      const existing = byPart.find((p) => p.partId === item.partId);
      if (existing) {
        existing.totalValue += value;
        existing.quantity += item.quantity;
      } else {
        byPart.push({
          partId: item.partId,
          partNumber: item.part?.partNumber,
          totalValue: value,
          quantity: item.quantity,
          unitCost: item.unitCost,
        });
      }
    }

    return { total, byPart };
  }

  // ==================== REPLENISHMENT & ABC ANALYSIS ====================

  /**
   * Calculate ABC analysis based on annual value
   */
  async performABCAnalysis(): Promise<ABCAnalysisResult[]> {
    // Get all active inventory
    const inventory = await prisma.inventory.findMany({
      where: { isActive: true },
      include: { part: true },
    });

    // Calculate annual value for each part
    const partValues: Map<string, { value: number; quantity: number }> = new Map();

    for (const item of inventory) {
      const annualValue = (item.unitCost || 0) * item.quantity * 12; // Rough estimate
      const key = item.partId;

      if (partValues.has(key)) {
        const existing = partValues.get(key)!;
        existing.value += annualValue;
        existing.quantity += item.quantity;
      } else {
        partValues.set(key, { value: annualValue, quantity: item.quantity });
      }
    }

    // Sort by annual value descending
    const sorted = Array.from(partValues.entries())
      .sort((a, b) => b[1].value - a[1].value)
      .map(([partId, data]) => ({ partId, ...data }));

    // Calculate total value
    const totalValue = sorted.reduce((sum, item) => sum + item.value, 0);

    // Assign ABC categories
    let runningPercentage = 0;
    const results: ABCAnalysisResult[] = [];

    for (const item of sorted) {
      const percentage = (item.value / totalValue) * 100;
      runningPercentage += percentage;

      let category: ABCCategory;
      if (runningPercentage <= 80) {
        category = 'A';
      } else if (runningPercentage <= 95) {
        category = 'B';
      } else {
        category = 'C';
      }

      results.push({
        partId: item.partId,
        category,
        annualValue: item.value,
        percentage,
        quantity: item.quantity,
      });
    }

    return results;
  }

  /**
   * Get replenishment recommendations
   */
  async getReplenishmentRecommendations(minQuantity: number = 10) {
    const inventory = await prisma.inventory.findMany({
      where: { isActive: true, quantity: { lt: minQuantity } },
      include: {
        part: {
          select: {
            id: true,
            partNumber: true,
            description: true,
          },
        },
      },
      orderBy: { quantity: 'asc' },
    });

    return inventory.map((item) => ({
      partId: item.partId,
      partNumber: item.part?.partNumber,
      description: item.part?.description,
      currentQuantity: item.quantity,
      minimumQuantity: minQuantity,
      shortfall: Math.max(0, minQuantity - item.quantity),
    }));
  }

  // ==================== EXPIRATION MANAGEMENT ====================

  /**
   * Get inventory items approaching expiration
   */
  async getExpiringInventory(daysUntilExpiration: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysUntilExpiration);

    return prisma.inventory.findMany({
      where: {
        isActive: true,
        expiryDate: {
          lte: cutoffDate,
          gte: new Date(),
        },
      },
      include: {
        part: true,
        locationRef: true,
      },
      orderBy: { expiryDate: 'asc' },
    });
  }

  /**
   * Get expired inventory
   */
  async getExpiredInventory() {
    return prisma.inventory.findMany({
      where: {
        isActive: true,
        expiryDate: {
          lt: new Date(),
        },
      },
      include: {
        part: true,
        locationRef: true,
      },
      orderBy: { expiryDate: 'asc' },
    });
  }

  // ==================== HELPER METHODS ====================

  /**
   * Resolve UnitOfMeasure ID from string code
   */
  private async resolveUomId(uomCode: string): Promise<string | null> {
    if (!uomCode) return null;

    // If it's already a CUID, assume it's an ID
    if (uomCode.startsWith('c') && uomCode.length > 20) {
      return uomCode;
    }

    // Look up by code
    const uom = await prisma.unitOfMeasure.findFirst({
      where: {
        code: { equals: uomCode.toUpperCase(), mode: 'insensitive' },
        isActive: true,
      },
      select: { id: true },
    });

    return uom?.id || null;
  }

  /**
   * Calculate inventory turnover ratio
   */
  async calculateTurnoverRatio(partId: string, periodMonths: number = 12): Promise<number> {
    // Get COGS (Cost of Goods Sold) from transactions
    const transactions = await prisma.materialTransaction.findMany({
      where: {
        inventory: { partId },
        transactionType: { in: [MaterialTransactionType.ISSUE, MaterialTransactionType.SCRAP] },
        transactionDate: {
          gte: new Date(Date.now() - periodMonths * 30 * 24 * 60 * 60 * 1000),
        },
      },
      include: { inventory: true },
    });

    let cogs = 0;
    for (const transaction of transactions) {
      cogs += (transaction.inventory.unitCost || 0) * transaction.quantity;
    }

    // Get average inventory value
    const { total } = await this.calculateInventoryValuation(partId);

    return total > 0 ? cogs / total : 0;
  }
}

export default InventoryService;
