/**
 * Oracle EBS Surrogate - Main Server
 * Provides mock ERP API for MES integration testing
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

import { DatabaseService } from './services/database.service';
import { TestDataGenerator } from './utils/test-data';
import { Logger } from './utils/logger';
import {
  WorkOrder,
  InventoryItem,
  InventoryTransaction,
  PurchaseOrder,
  Equipment,
  Gauge,
  WorkOrderStatus,
  TransactionType,
  ApiResponse,
  ErrorResponse
} from './models/types';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3002;
const db = DatabaseService.getInstance();
const logger = Logger.getInstance();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Error handler type
interface CustomError extends Error {
  status?: number;
  code?: string;
}

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================

app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Oracle EBS Surrogate is healthy',
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// WORK ORDER ENDPOINTS
// ============================================================================

// GET - List all work orders
app.get('/api/workorders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string | undefined;

    let query = 'SELECT * FROM work_orders';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    const workOrders = await db.all(query, params);

    res.json({
      success: true,
      data: workOrders,
      timestamp: new Date().toISOString()
    } as ApiResponse<WorkOrder[]>);
  } catch (error) {
    next(error);
  }
});

// GET - Get single work order
app.get('/api/workorders/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const workOrder = await db.get(
      'SELECT * FROM work_orders WHERE id = ? OR order_number = ?',
      [id, id]
    );

    if (!workOrder) {
      return res.status(404).json({
        success: false,
        error: 'Work order not found',
        errorCode: 'WO_NOT_FOUND',
        timestamp: new Date().toISOString()
      } as ErrorResponse);
    }

    res.json({
      success: true,
      data: workOrder,
      timestamp: new Date().toISOString()
    } as ApiResponse<WorkOrder>);
  } catch (error) {
    next(error);
  }
});

// POST - Create work order
app.post('/api/workorders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderNumber, description, quantity, dueDate, costCenter } = req.body;

    // Validation
    if (!orderNumber || !description || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: orderNumber, description, quantity',
        errorCode: 'INVALID_REQUEST',
        timestamp: new Date().toISOString()
      } as ErrorResponse);
    }

    // Check for duplicate
    const existing = await db.get(
      'SELECT id FROM work_orders WHERE order_number = ?',
      [orderNumber]
    );

    if (existing) {
      return res.status(400).json({
        success: false,
        error: `Work order with number ${orderNumber} already exists`,
        errorCode: 'DUPLICATE_WO',
        timestamp: new Date().toISOString()
      } as ErrorResponse);
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const startDate = new Date().toISOString();
    const dueDateStr = dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await db.run(
      `INSERT INTO work_orders (
        id, order_number, description, status, quantity,
        start_date, due_date, cost_center, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        orderNumber,
        description,
        WorkOrderStatus.RELEASED,
        quantity,
        startDate,
        dueDateStr,
        costCenter || 'CC-001',
        now,
        now
      ]
    );

    const newWorkOrder = await db.get('SELECT * FROM work_orders WHERE id = ?', [id]);

    res.status(201).json({
      success: true,
      data: newWorkOrder,
      timestamp: new Date().toISOString()
    } as ApiResponse<WorkOrder>);
  } catch (error) {
    next(error);
  }
});

// PUT - Update work order status
app.put('/api/workorders/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required',
        errorCode: 'INVALID_REQUEST',
        timestamp: new Date().toISOString()
      } as ErrorResponse);
    }

    // Validate status
    const validStatuses = Object.values(WorkOrderStatus);
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        errorCode: 'INVALID_STATUS',
        timestamp: new Date().toISOString()
      } as ErrorResponse);
    }

    const workOrder = await db.get(
      'SELECT * FROM work_orders WHERE id = ? OR order_number = ?',
      [id, id]
    );

    if (!workOrder) {
      return res.status(404).json({
        success: false,
        error: 'Work order not found',
        errorCode: 'WO_NOT_FOUND',
        timestamp: new Date().toISOString()
      } as ErrorResponse);
    }

    const now = new Date().toISOString();

    await db.run(
      'UPDATE work_orders SET status = ?, updated_at = ? WHERE id = ?',
      [status, now, workOrder.id]
    );

    const updated = await db.get('SELECT * FROM work_orders WHERE id = ?', [workOrder.id]);

    res.json({
      success: true,
      data: updated,
      timestamp: new Date().toISOString()
    } as ApiResponse<WorkOrder>);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// INVENTORY ENDPOINTS
// ============================================================================

// GET - List inventory items
app.get('/api/inventory', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const partNumber = req.query.partNumber as string | undefined;

    let query = 'SELECT * FROM inventory_items';
    const params: any[] = [];

    if (partNumber) {
      query += ' WHERE part_number LIKE ?';
      params.push(`%${partNumber}%`);
    }

    const items = await db.all(query, params);

    res.json({
      success: true,
      data: items,
      timestamp: new Date().toISOString()
    } as ApiResponse<InventoryItem[]>);
  } catch (error) {
    next(error);
  }
});

// GET - Get inventory for specific part
app.get('/api/inventory/:partNumber', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { partNumber } = req.params;

    const item = await db.get(
      'SELECT * FROM inventory_items WHERE part_number = ?',
      [partNumber]
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        error: `Inventory not found for part ${partNumber}`,
        errorCode: 'INVENTORY_NOT_FOUND',
        timestamp: new Date().toISOString()
      } as ErrorResponse);
    }

    res.json({
      success: true,
      data: item,
      timestamp: new Date().toISOString()
    } as ApiResponse<InventoryItem>);
  } catch (error) {
    next(error);
  }
});

// POST - Record inventory transaction
app.post(
  '/api/inventory/transactions',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { partNumber, transactionType, quantity, workOrderId, referenceNumber, notes } =
        req.body;

      // Validation
      if (!partNumber || !transactionType || !quantity) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: partNumber, transactionType, quantity',
          errorCode: 'INVALID_REQUEST',
          timestamp: new Date().toISOString()
        } as ErrorResponse);
      }

      // Check if part exists
      const inventory = await db.get(
        'SELECT * FROM inventory_items WHERE part_number = ?',
        [partNumber]
      );

      if (!inventory) {
        return res.status(404).json({
          success: false,
          error: `Part ${partNumber} not found in inventory`,
          errorCode: 'PART_NOT_FOUND',
          timestamp: new Date().toISOString()
        } as ErrorResponse);
      }

      // Validate transaction type
      const validTypes = Object.values(TransactionType);
      if (!validTypes.includes(transactionType)) {
        return res.status(400).json({
          success: false,
          error: `Invalid transaction type. Must be one of: ${validTypes.join(', ')}`,
          errorCode: 'INVALID_TYPE',
          timestamp: new Date().toISOString()
        } as ErrorResponse);
      }

      // Check inventory availability for ISSUE
      if (transactionType === TransactionType.ISSUE) {
        const availableQty = inventory.on_hand_quantity - inventory.allocated_quantity;
        if (availableQty < quantity) {
          return res.status(400).json({
            success: false,
            error: `Insufficient inventory. Available: ${availableQty}, Requested: ${quantity}`,
            errorCode: 'INSUFFICIENT_INVENTORY',
            timestamp: new Date().toISOString()
          } as ErrorResponse);
        }
      }

      // Record transaction
      const txId = uuidv4();
      const now = new Date().toISOString();

      await db.run(
        `INSERT INTO inventory_transactions (
          id, part_number, transaction_type, quantity, unit,
          work_order_id, reference_number, notes, transaction_date, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          txId,
          partNumber,
          transactionType,
          quantity,
          inventory.unit,
          workOrderId || null,
          referenceNumber || null,
          notes || null,
          now,
          now
        ]
      );

      // Update inventory balance
      let newOnHand = inventory.on_hand_quantity;
      const newAllocated = inventory.allocated_quantity;

      if (transactionType === TransactionType.ISSUE) {
        newOnHand -= quantity;
      } else if (transactionType === TransactionType.RECEIVE) {
        newOnHand += quantity;
      }

      // Prevent negative balance
      if (newOnHand < 0) {
        return res.status(400).json({
          success: false,
          error: 'Transaction would result in negative inventory balance',
          errorCode: 'NEGATIVE_BALANCE',
          timestamp: new Date().toISOString()
        } as ErrorResponse);
      }

      await db.run(
        'UPDATE inventory_items SET on_hand_quantity = ?, last_transaction_date = ? WHERE part_number = ?',
        [newOnHand, now, partNumber]
      );

      const transaction = await db.get('SELECT * FROM inventory_transactions WHERE id = ?', [
        txId
      ]);

      res.status(201).json({
        success: true,
        data: transaction,
        timestamp: new Date().toISOString()
      } as ApiResponse<InventoryTransaction>);
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// PURCHASE ORDER ENDPOINTS
// ============================================================================

// GET - List purchase orders
app.get('/api/purchaseorders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string | undefined;

    let query = 'SELECT * FROM purchase_orders';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    const pos = await db.all(query, params);

    res.json({
      success: true,
      data: pos,
      timestamp: new Date().toISOString()
    } as ApiResponse<PurchaseOrder[]>);
  } catch (error) {
    next(error);
  }
});

// GET - Get single purchase order
app.get('/api/purchaseorders/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const po = await db.get(
      'SELECT * FROM purchase_orders WHERE id = ? OR po_number = ?',
      [id, id]
    );

    if (!po) {
      return res.status(404).json({
        success: false,
        error: 'Purchase order not found',
        errorCode: 'PO_NOT_FOUND',
        timestamp: new Date().toISOString()
      } as ErrorResponse);
    }

    // Get line items
    const lines = await db.all('SELECT * FROM po_lines WHERE po_id = ?', [po.id]);
    po.lines = lines;

    res.json({
      success: true,
      data: po,
      timestamp: new Date().toISOString()
    } as ApiResponse<PurchaseOrder>);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// EQUIPMENT ENDPOINTS
// ============================================================================

// GET - List equipment
app.get('/api/equipment', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const equipment = await db.all('SELECT * FROM equipment');

    res.json({
      success: true,
      data: equipment,
      timestamp: new Date().toISOString()
    } as ApiResponse<Equipment[]>);
  } catch (error) {
    next(error);
  }
});

// GET - Get single equipment
app.get('/api/equipment/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const equipment = await db.get(
      'SELECT * FROM equipment WHERE id = ? OR equipment_id = ?',
      [id, id]
    );

    if (!equipment) {
      return res.status(404).json({
        success: false,
        error: 'Equipment not found',
        errorCode: 'EQUIPMENT_NOT_FOUND',
        timestamp: new Date().toISOString()
      } as ErrorResponse);
    }

    res.json({
      success: true,
      data: equipment,
      timestamp: new Date().toISOString()
    } as ApiResponse<Equipment>);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GAUGE ENDPOINTS
// ============================================================================

// GET - List gauges
app.get('/api/gauges', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gauges = await db.all('SELECT * FROM gauges');

    res.json({
      success: true,
      data: gauges,
      timestamp: new Date().toISOString()
    } as ApiResponse<Gauge[]>);
  } catch (error) {
    next(error);
  }
});

// GET - Get single gauge
app.get('/api/gauges/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const gauge = await db.get('SELECT * FROM gauges WHERE id = ? OR gauge_id = ?', [id, id]);

    if (!gauge) {
      return res.status(404).json({
        success: false,
        error: 'Gauge not found',
        errorCode: 'GAUGE_NOT_FOUND',
        timestamp: new Date().toISOString()
      } as ErrorResponse);
    }

    res.json({
      success: true,
      data: gauge,
      timestamp: new Date().toISOString()
    } as ApiResponse<Gauge>);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// DATA MANAGEMENT ENDPOINTS
// ============================================================================

// POST - Reset to initial state
app.post('/api/admin/reset', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const generator = new TestDataGenerator();
    await generator.resetToInitialState();

    res.json({
      success: true,
      message: 'Database reset to initial state',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((err: CustomError, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', err);

  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({
    success: false,
    error: message,
    errorCode: err.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  } as ErrorResponse);
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.path}`,
    errorCode: 'NOT_FOUND',
    timestamp: new Date().toISOString()
  } as ErrorResponse);
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function startServer() {
  try {
    // Initialize database
    await db.initialize();
    logger.info('Database initialized');

    // Seed initial data
    const generator = new TestDataGenerator();
    await generator.seedInitialData();

    // Start server
    app.listen(port, () => {
      logger.info(`Oracle EBS Surrogate running on http://localhost:${port}`);
      logger.info('Health check: http://localhost:' + port + '/health');
      logger.info('API Documentation: See README.md');
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  await db.close();
  process.exit(0);
});

startServer();

export default app;
