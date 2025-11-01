/**
 * Inventory Service Test Suite
 * Issue #88: Comprehensive Inventory Management
 *
 * Tests for:
 * - Inventory CRUD operations
 * - Transaction logging
 * - Inventory transfers
 * - Costing methods (FIFO, LIFO, Average)
 * - ABC analysis
 * - Expiration tracking
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import InventoryService from '../../services/InventoryService';
import prisma from '../../lib/database';
import { MaterialTransactionType } from '@prisma/client';

describe('InventoryService', () => {
  let inventoryService: InventoryService;
  let testPart: any;
  let testLocation: any;
  let testInventory: any;

  beforeAll(async () => {
    inventoryService = new InventoryService();

    // Create test part
    testPart = await prisma.part.create({
      data: {
        partNumber: `TEST-INV-${Date.now()}`,
        description: 'Test Inventory Part',
        isActive: true,
      },
    });

    // Create test location
    testLocation = await prisma.location.create({
      data: {
        locationCode: `LOC-${Date.now()}`,
        locationName: 'Test Location',
        locationType: 'WAREHOUSE',
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.inventory.deleteMany({ where: { part: { id: testPart.id } } });
    await prisma.part.delete({ where: { id: testPart.id } });
    await prisma.location.delete({ where: { id: testLocation.id } });
  });

  describe('Inventory Creation', () => {
    it('should create a new inventory item', async () => {
      const inventory = await inventoryService.createInventory({
        partId: testPart.id,
        locationId: testLocation.id,
        quantity: 100,
        unitOfMeasure: 'EA',
        unitCost: 10.5,
        receivedDate: new Date(),
      });

      testInventory = inventory;

      expect(inventory).toBeDefined();
      expect(inventory.partId).toBe(testPart.id);
      expect(inventory.locationId).toBe(testLocation.id);
      expect(inventory.quantity).toBe(100);
      expect(inventory.unitCost).toBe(10.5);
    });

    it('should throw error for non-existent part', async () => {
      await expect(
        inventoryService.createInventory({
          partId: 'non-existent',
          locationId: testLocation.id,
          quantity: 100,
          unitOfMeasure: 'EA',
          receivedDate: new Date(),
        })
      ).rejects.toThrow();
    });

    it('should throw error for non-existent location', async () => {
      await expect(
        inventoryService.createInventory({
          partId: testPart.id,
          locationId: 'non-existent',
          quantity: 100,
          unitOfMeasure: 'EA',
          receivedDate: new Date(),
        })
      ).rejects.toThrow();
    });
  });

  describe('Inventory Retrieval', () => {
    it('should retrieve inventory by ID', async () => {
      const inventory = await inventoryService.getInventory(testInventory.id);

      expect(inventory).toBeDefined();
      expect(inventory?.id).toBe(testInventory.id);
      expect(inventory?.quantity).toBe(100);
    });

    it('should get part inventory across all locations', async () => {
      const inventory = await inventoryService.getPartInventory(testPart.id);

      expect(Array.isArray(inventory)).toBe(true);
      expect(inventory.length).toBeGreaterThan(0);
      expect(inventory.some((inv) => inv.id === testInventory.id)).toBe(true);
    });

    it('should get total quantity for a part', async () => {
      const total = await inventoryService.getPartTotalQuantity(testPart.id);

      expect(typeof total).toBe('number');
      expect(total).toBeGreaterThanOrEqual(100);
    });
  });

  describe('Inventory Updates', () => {
    it('should update inventory quantity', async () => {
      const updated = await inventoryService.updateInventoryQuantity(testInventory.id, 50);

      expect(updated.quantity).toBe(150);
    });

    it('should throw error when quantity goes negative', async () => {
      await expect(
        inventoryService.updateInventoryQuantity(testInventory.id, -200)
      ).rejects.toThrow();
    });
  });

  describe('Transaction Logging', () => {
    it('should log a receipt transaction', async () => {
      const transaction = await inventoryService.logTransaction({
        inventoryId: testInventory.id,
        transactionType: MaterialTransactionType.RECEIPT,
        quantity: 50,
        unitOfMeasure: 'EA',
      });

      expect(transaction).toBeDefined();
      expect(transaction.transactionType).toBe(MaterialTransactionType.RECEIPT);
      expect(transaction.quantity).toBe(50);

      // Verify inventory was updated
      const inventory = await inventoryService.getInventory(testInventory.id);
      expect(inventory?.quantity).toBe(200); // 150 + 50
    });

    it('should log an issue transaction', async () => {
      const transaction = await inventoryService.logTransaction({
        inventoryId: testInventory.id,
        transactionType: MaterialTransactionType.ISSUE,
        quantity: 25,
        unitOfMeasure: 'EA',
      });

      expect(transaction.transactionType).toBe(MaterialTransactionType.ISSUE);

      // Verify inventory was updated
      const inventory = await inventoryService.getInventory(testInventory.id);
      expect(inventory?.quantity).toBe(175); // 200 - 25
    });

    it('should get transaction history', async () => {
      const transactions = await inventoryService.getTransactionHistory(testInventory.id);

      expect(Array.isArray(transactions)).toBe(true);
      expect(transactions.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Inventory Transfers', () => {
    it('should transfer inventory between locations', async () => {
      const location2 = await prisma.location.create({
        data: {
          locationCode: `LOC2-${Date.now()}`,
          locationName: 'Test Location 2',
          locationType: 'WAREHOUSE',
        },
      });

      const result = await inventoryService.transferInventory({
        fromInventoryId: testInventory.id,
        toLocationId: location2.id,
        quantity: 50,
        partId: testPart.id,
      });

      expect(result.source.quantity).toBe(125); // 175 - 50
      expect(result.destination.quantity).toBe(50);
      expect(result.transaction.transactionType).toBe(MaterialTransactionType.TRANSFER);

      await prisma.location.delete({ where: { id: location2.id } });
    });

    it('should throw error when transferring more than available', async () => {
      const location2 = await prisma.location.create({
        data: {
          locationCode: `LOC3-${Date.now()}`,
          locationName: 'Test Location 3',
          locationType: 'WAREHOUSE',
        },
      });

      await expect(
        inventoryService.transferInventory({
          fromInventoryId: testInventory.id,
          toLocationId: location2.id,
          quantity: 500,
          partId: testPart.id,
        })
      ).rejects.toThrow('Insufficient quantity');

      await prisma.location.delete({ where: { id: location2.id } });
    });
  });

  describe('FIFO Costing', () => {
    beforeEach(async () => {
      // Create multiple inventory batches
      await prisma.inventory.deleteMany({ where: { part: { id: testPart.id } } });

      // Batch 1: 100 units at $10/unit received first
      await inventoryService.createInventory({
        partId: testPart.id,
        locationId: testLocation.id,
        quantity: 100,
        unitOfMeasure: 'EA',
        unitCost: 10,
        receivedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      });

      // Batch 2: 100 units at $12/unit received later
      await inventoryService.createInventory({
        partId: testPart.id,
        locationId: testLocation.id,
        quantity: 100,
        unitOfMeasure: 'EA',
        unitCost: 12,
        receivedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      });
    });

    it('should calculate FIFO cost correctly', async () => {
      const cost = await inventoryService.calculateFIFOCost(testPart.id, 150);

      // Should use all 100 units @ $10 + 50 units @ $12
      const expectedCost = 100 * 10 + 50 * 12; // $1600
      expect(cost.totalCost).toBe(expectedCost);
      expect(cost.unitCost).toBeCloseTo(expectedCost / 150);
    });

    it('should throw error when insufficient inventory for FIFO', async () => {
      await expect(
        inventoryService.calculateFIFOCost(testPart.id, 300)
      ).rejects.toThrow('Insufficient inventory');
    });
  });

  describe('LIFO Costing', () => {
    beforeEach(async () => {
      // Create multiple inventory batches
      await prisma.inventory.deleteMany({ where: { part: { id: testPart.id } } });

      // Batch 1: 100 units at $10/unit
      await inventoryService.createInventory({
        partId: testPart.id,
        locationId: testLocation.id,
        quantity: 100,
        unitOfMeasure: 'EA',
        unitCost: 10,
        receivedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      });

      // Batch 2: 100 units at $12/unit
      await inventoryService.createInventory({
        partId: testPart.id,
        locationId: testLocation.id,
        quantity: 100,
        unitOfMeasure: 'EA',
        unitCost: 12,
        receivedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      });
    });

    it('should calculate LIFO cost correctly', async () => {
      const cost = await inventoryService.calculateLIFOCost(testPart.id, 150);

      // Should use all 100 units @ $12 (newest) + 50 units @ $10
      const expectedCost = 100 * 12 + 50 * 10; // $1700
      expect(cost.totalCost).toBe(expectedCost);
      expect(cost.unitCost).toBeCloseTo(expectedCost / 150);
    });
  });

  describe('Average Costing', () => {
    beforeEach(async () => {
      // Create multiple inventory batches
      await prisma.inventory.deleteMany({ where: { part: { id: testPart.id } } });

      // Batch 1: 100 units at $10/unit
      await inventoryService.createInventory({
        partId: testPart.id,
        locationId: testLocation.id,
        quantity: 100,
        unitOfMeasure: 'EA',
        unitCost: 10,
        receivedDate: new Date(),
      });

      // Batch 2: 100 units at $12/unit
      await inventoryService.createInventory({
        partId: testPart.id,
        locationId: testLocation.id,
        quantity: 100,
        unitOfMeasure: 'EA',
        unitCost: 12,
        receivedDate: new Date(),
      });
    });

    it('should calculate average cost correctly', async () => {
      const cost = await inventoryService.calculateAverageCost(testPart.id, 100);

      // Average unit cost = (100*10 + 100*12) / 200 = $11
      const expectedUnitCost = 11;
      expect(cost.unitCost).toBe(expectedUnitCost);
      expect(cost.totalCost).toBe(expectedUnitCost * 100);
    });
  });

  describe('Inventory Valuation', () => {
    it('should calculate total inventory valuation', async () => {
      const valuation = await inventoryService.calculateInventoryValuation();

      expect(valuation).toHaveProperty('total');
      expect(valuation).toHaveProperty('byPart');
      expect(typeof valuation.total).toBe('number');
      expect(Array.isArray(valuation.byPart)).toBe(true);
    });

    it('should calculate valuation for specific part', async () => {
      const valuation = await inventoryService.calculateInventoryValuation(testPart.id);

      expect(valuation.byPart.length).toBeGreaterThan(0);
      expect(valuation.byPart.some((p) => p.partId === testPart.id)).toBe(true);
    });
  });

  describe('ABC Analysis', () => {
    it('should perform ABC analysis', async () => {
      const analysis = await inventoryService.performABCAnalysis();

      expect(Array.isArray(analysis)).toBe(true);
      expect(analysis.length).toBeGreaterThan(0);

      // Verify categories are assigned
      const categories = new Set(analysis.map((item) => item.category));
      expect(categories.has('A') || categories.has('B') || categories.has('C')).toBe(true);

      // Verify percentages
      analysis.forEach((item) => {
        expect(item.percentage).toBeGreaterThan(0);
        expect(item.annualValue).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Replenishment Recommendations', () => {
    it('should get replenishment recommendations', async () => {
      const recommendations = await inventoryService.getReplenishmentRecommendations(50);

      expect(Array.isArray(recommendations)).toBe(true);
      recommendations.forEach((rec) => {
        expect(rec.currentQuantity).toBeLessThan(50);
        expect(rec.shortfall).toBeGreaterThan(0);
      });
    });
  });

  describe('Expiration Management', () => {
    it('should get expiring inventory', async () => {
      // Create inventory with near expiration
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);

      await inventoryService.createInventory({
        partId: testPart.id,
        locationId: testLocation.id,
        quantity: 10,
        unitOfMeasure: 'EA',
        receivedDate: new Date(),
        expiryDate: futureDate,
      });

      const expiringItems = await inventoryService.getExpiringInventory(30);

      expect(Array.isArray(expiringItems)).toBe(true);
    });

    it('should get expired inventory', async () => {
      // Create expired inventory
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      await inventoryService.createInventory({
        partId: testPart.id,
        locationId: testLocation.id,
        quantity: 5,
        unitOfMeasure: 'EA',
        receivedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        expiryDate: pastDate,
      });

      const expiredItems = await inventoryService.getExpiredInventory();

      expect(Array.isArray(expiredItems)).toBe(true);
      expect(expiredItems.some((item) => item.expiryDate! < new Date())).toBe(true);
    });
  });
});
