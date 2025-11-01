/**
 * Inventory Management API Routes
 * Issue #88: Comprehensive Inventory Management
 *
 * Endpoints for:
 * - Inventory CRUD operations
 * - Transaction logging
 * - Inventory transfers
 * - Costing calculations
 * - ABC analysis and replenishment
 * - Expiration tracking
 */

import { Router, Request, Response } from 'express';
import InventoryService from '../services/InventoryService';
import { MaterialTransactionType } from '@prisma/client';
import { authenticateRequest, authorizeAction } from '../middleware/auth';

const router = Router();
const inventoryService = new InventoryService();

// ==================== INVENTORY OPERATIONS ====================

/**
 * Create new inventory item
 * POST /inventory/create
 */
router.post('/create', authenticateRequest, authorizeAction('inventory_create'), async (req: Request, res: Response) => {
  try {
    const { partId, locationId, lotNumber, quantity, unitOfMeasure, unitCost, receivedDate, expiryDate } = req.body;

    // Validate required fields
    if (!partId || !locationId || !quantity || !unitOfMeasure) {
      return res.status(400).json({ error: 'Missing required fields: partId, locationId, quantity, unitOfMeasure' });
    }

    const inventory = await inventoryService.createInventory({
      partId,
      locationId,
      lotNumber,
      quantity,
      unitOfMeasure,
      unitCost,
      receivedDate: new Date(receivedDate),
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
    });

    res.json({ success: true, data: inventory });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get inventory by ID
 * GET /inventory/:id
 */
router.get('/:id', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const inventory = await inventoryService.getInventory(req.params.id);

    if (!inventory) {
      return res.status(404).json({ error: 'Inventory not found' });
    }

    res.json({ success: true, data: inventory });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get inventory for a part
 * GET /inventory/part/:partId
 */
router.get('/part/:partId', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const inventory = await inventoryService.getPartInventory(req.params.partId);
    res.json({ success: true, data: inventory, count: inventory.length });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get inventory at a location
 * GET /inventory/location/:locationId
 */
router.get('/location/:locationId', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const inventory = await inventoryService.getLocationInventory(req.params.locationId);
    res.json({ success: true, data: inventory, count: inventory.length });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get total quantity for a part
 * GET /inventory/part/:partId/total
 */
router.get('/part/:partId/total', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const totalQuantity = await inventoryService.getPartTotalQuantity(req.params.partId);
    res.json({ success: true, data: { partId: req.params.partId, totalQuantity } });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Update inventory quantity
 * POST /inventory/:id/adjust
 */
router.post('/:id/adjust', authenticateRequest, authorizeAction('inventory_adjust'), async (req: Request, res: Response) => {
  try {
    const { quantityDelta } = req.body;

    if (quantityDelta === undefined) {
      return res.status(400).json({ error: 'Missing required field: quantityDelta' });
    }

    const updated = await inventoryService.updateInventoryQuantity(req.params.id, quantityDelta);
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== TRANSACTIONS ====================

/**
 * Log an inventory transaction
 * POST /inventory/:id/transaction
 */
router.post('/:id/transaction', authenticateRequest, authorizeAction('inventory_transaction'), async (req: Request, res: Response) => {
  try {
    const { transactionType, quantity, unitOfMeasure, workOrderId, reference } = req.body;

    if (!transactionType || !quantity || !unitOfMeasure) {
      return res.status(400).json({ error: 'Missing required fields: transactionType, quantity, unitOfMeasure' });
    }

    const transaction = await inventoryService.logTransaction({
      inventoryId: req.params.id,
      transactionType: transactionType as MaterialTransactionType,
      quantity,
      unitOfMeasure,
      workOrderId,
      reference,
    });

    res.json({ success: true, data: transaction });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get transaction history
 * GET /inventory/:id/transactions
 */
router.get('/:id/transactions', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const transactions = await inventoryService.getTransactionHistory(req.params.id, limit);
    res.json({ success: true, data: transactions, count: transactions.length });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== TRANSFERS ====================

/**
 * Transfer inventory between locations
 * POST /inventory/transfer
 */
router.post('/transfer', authenticateRequest, authorizeAction('inventory_transfer'), async (req: Request, res: Response) => {
  try {
    const { fromInventoryId, toLocationId, quantity, partId, workOrderId } = req.body;

    if (!fromInventoryId || !toLocationId || !quantity || !partId) {
      return res.status(400).json({ error: 'Missing required fields: fromInventoryId, toLocationId, quantity, partId' });
    }

    const result = await inventoryService.transferInventory({
      fromInventoryId,
      toLocationId,
      quantity,
      partId,
      workOrderId,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== COSTING ====================

/**
 * Calculate FIFO cost
 * POST /inventory/costing/fifo
 */
router.post('/costing/fifo', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const { partId, quantity } = req.body;

    if (!partId || !quantity) {
      return res.status(400).json({ error: 'Missing required fields: partId, quantity' });
    }

    const cost = await inventoryService.calculateFIFOCost(partId, quantity);
    res.json({ success: true, data: { method: 'FIFO', ...cost } });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Calculate LIFO cost
 * POST /inventory/costing/lifo
 */
router.post('/costing/lifo', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const { partId, quantity } = req.body;

    if (!partId || !quantity) {
      return res.status(400).json({ error: 'Missing required fields: partId, quantity' });
    }

    const cost = await inventoryService.calculateLIFOCost(partId, quantity);
    res.json({ success: true, data: { method: 'LIFO', ...cost } });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Calculate average cost
 * POST /inventory/costing/average
 */
router.post('/costing/average', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const { partId, quantity } = req.body;

    if (!partId || !quantity) {
      return res.status(400).json({ error: 'Missing required fields: partId, quantity' });
    }

    const cost = await inventoryService.calculateAverageCost(partId, quantity);
    res.json({ success: true, data: { method: 'AVERAGE', ...cost } });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Calculate inventory valuation
 * GET /inventory/valuation
 */
router.get('/valuation', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const partId = req.query.partId as string;
    const valuation = await inventoryService.calculateInventoryValuation(partId);
    res.json({ success: true, data: valuation });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== ABC ANALYSIS & REPLENISHMENT ====================

/**
 * Perform ABC analysis
 * GET /inventory/analysis/abc
 */
router.get('/analysis/abc', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const analysis = await inventoryService.performABCAnalysis();
    res.json({ success: true, data: analysis });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get replenishment recommendations
 * GET /inventory/replenishment
 */
router.get('/replenishment', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const minQuantity = parseInt(req.query.minQuantity as string) || 10;
    const recommendations = await inventoryService.getReplenishmentRecommendations(minQuantity);
    res.json({ success: true, data: recommendations, count: recommendations.length });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== EXPIRATION MANAGEMENT ====================

/**
 * Get expiring inventory
 * GET /inventory/expiring
 */
router.get('/expiring', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const daysUntilExpiration = parseInt(req.query.days as string) || 30;
    const items = await inventoryService.getExpiringInventory(daysUntilExpiration);
    res.json({ success: true, data: items, count: items.length });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get expired inventory
 * GET /inventory/expired
 */
router.get('/expired', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const items = await inventoryService.getExpiredInventory();
    res.json({ success: true, data: items, count: items.length });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
