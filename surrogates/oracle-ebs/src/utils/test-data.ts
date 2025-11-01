/**
 * Oracle EBS Surrogate - Test Data Utility
 * Generates realistic test data for development and testing
 */

import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../services/database.service';
import { Logger } from './logger';
import {
  WorkOrder,
  InventoryItem,
  PurchaseOrder,
  WorkOrderStatus,
  POReceiptStatus
} from '../models/types';

const logger = Logger.getInstance();

export class TestDataGenerator {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  async seedInitialData(): Promise<void> {
    logger.info('Seeding initial test data...');

    try {
      // Create sample inventory
      await this.createSampleInventory();

      // Create sample work orders
      await this.createSampleWorkOrders();

      // Create sample purchase orders
      await this.createSamplePurchaseOrders();

      // Create sample equipment
      await this.createSampleEquipment();

      // Create sample gauges
      await this.createSampleGauges();

      logger.info('Initial test data seeded successfully');
    } catch (error) {
      logger.error('Failed to seed initial test data', error);
      throw error;
    }
  }

  private async createSampleInventory(): Promise<void> {
    const partNumbers = [
      { partNumber: 'PART-001', description: 'Steel Plate - 1mm', quantity: 500 },
      { partNumber: 'PART-002', description: 'Aluminum Bar - 50mm', quantity: 300 },
      { partNumber: 'PART-003', description: 'Bearing Assembly', quantity: 150 },
      { partNumber: 'PART-004', description: 'Fastener Kit', quantity: 1000 },
      { partNumber: 'PART-005', description: 'Gasket Material', quantity: 250 }
    ];

    for (const part of partNumbers) {
      const inventoryId = uuidv4();
      const now = new Date().toISOString();

      await this.db.run(
        `INSERT INTO inventory_items (
          id, part_number, description, on_hand_quantity, allocated_quantity,
          unit, warehouse_location, last_transaction_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          inventoryId,
          part.partNumber,
          part.description,
          part.quantity,
          0,
          'EA',
          'WH-A-001',
          now
        ]
      );
    }

    logger.info(`Created ${partNumbers.length} inventory items`);
  }

  private async createSampleWorkOrders(): Promise<void> {
    const workOrders = [
      {
        orderNumber: 'WO-2024-001',
        description: 'Assembly Engine Block',
        quantity: 10,
        status: WorkOrderStatus.RELEASED
      },
      {
        orderNumber: 'WO-2024-002',
        description: 'Machine Cylinder Head',
        quantity: 5,
        status: WorkOrderStatus.IN_PROCESS
      },
      {
        orderNumber: 'WO-2024-003',
        description: 'Test & Inspect',
        quantity: 2,
        status: WorkOrderStatus.COMPLETED
      },
      {
        orderNumber: 'WO-2024-004',
        description: 'Pack & Ship',
        quantity: 15,
        status: WorkOrderStatus.RELEASED
      }
    ];

    for (const wo of workOrders) {
      const id = uuidv4();
      const now = new Date().toISOString();
      const startDate = new Date();
      const dueDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

      await this.db.run(
        `INSERT INTO work_orders (
          id, order_number, description, status, quantity,
          start_date, due_date, cost_center, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          wo.orderNumber,
          wo.description,
          wo.status,
          wo.quantity,
          startDate.toISOString(),
          dueDate.toISOString(),
          'CC-001',
          now,
          now
        ]
      );
    }

    logger.info(`Created ${workOrders.length} work orders`);
  }

  private async createSamplePurchaseOrders(): Promise<void> {
    const purchaseOrders = [
      {
        poNumber: 'PO-2024-001',
        vendor: 'Steel Suppliers Inc',
        totalAmount: 25000,
        lineItems: [
          { partNumber: 'PART-001', quantity: 100, unitPrice: 250 },
          { partNumber: 'PART-005', quantity: 50, unitPrice: 100 }
        ]
      },
      {
        poNumber: 'PO-2024-002',
        vendor: 'Bearing Manufacturers Ltd',
        totalAmount: 15000,
        lineItems: [
          { partNumber: 'PART-003', quantity: 75, unitPrice: 200 }
        ]
      }
    ];

    for (const po of purchaseOrders) {
      const poId = uuidv4();
      const now = new Date().toISOString();
      const poDate = new Date();
      const dueDate = new Date(poDate.getTime() + 30 * 24 * 60 * 60 * 1000);

      await this.db.run(
        `INSERT INTO purchase_orders (
          id, po_number, vendor, description, po_date, due_date,
          total_amount, currency, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          poId,
          po.poNumber,
          po.vendor,
          `Order from ${po.vendor}`,
          poDate.toISOString(),
          dueDate.toISOString(),
          po.totalAmount,
          'USD',
          'OPEN',
          now,
          now
        ]
      );

      // Add line items
      for (const line of po.lineItems) {
        const lineId = uuidv4();
        const lineTotal = line.quantity * line.unitPrice;

        await this.db.run(
          `INSERT INTO po_lines (
            id, po_id, line_number, part_number, description,
            quantity, unit, unit_price, total_price
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            lineId,
            poId,
            1,
            line.partNumber,
            `${line.partNumber} - Ordered`,
            line.quantity,
            'EA',
            line.unitPrice,
            lineTotal
          ]
        );
      }
    }

    logger.info(`Created ${purchaseOrders.length} purchase orders`);
  }

  private async createSampleEquipment(): Promise<void> {
    const equipment = [
      {
        equipmentId: 'EQ-CNC-001',
        description: 'CNC Mill - Horizontal',
        type: 'Milling Machine',
        location: 'CELL-A'
      },
      {
        equipmentId: 'EQ-TURN-001',
        description: 'Lathe - Production',
        type: 'Lathe',
        location: 'CELL-B'
      },
      {
        equipmentId: 'EQ-HEAT-001',
        description: 'Heat Treat Furnace',
        type: 'Furnace',
        location: 'HEAT-TREAT'
      },
      {
        equipmentId: 'EQ-PRESS-001',
        description: 'Hydraulic Press',
        type: 'Press',
        location: 'CELL-C'
      }
    ];

    for (const eq of equipment) {
      const id = uuidv4();
      const now = new Date().toISOString();

      await this.db.run(
        `INSERT INTO equipment (
          id, equipment_id, description, type, location,
          status, cost_center, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          eq.equipmentId,
          eq.description,
          eq.type,
          eq.location,
          'ACTIVE',
          'CC-001',
          now,
          now
        ]
      );
    }

    logger.info(`Created ${equipment.length} equipment records`);
  }

  private async createSampleGauges(): Promise<void> {
    const gauges = [
      {
        gaugeId: 'GAGE-CAL-001',
        description: 'Caliper - Digital',
        type: 'Caliper',
        accuracy: '±0.01mm',
        resolution: '0.01mm'
      },
      {
        gaugeId: 'GAGE-MIC-001',
        description: 'Micrometer - Outside',
        type: 'Micrometer',
        accuracy: '±0.005mm',
        resolution: '0.001mm'
      },
      {
        gaugeId: 'GAGE-CMM-001',
        description: 'Coordinate Measuring Machine',
        type: 'CMM',
        accuracy: '±0.03mm',
        resolution: '0.001mm'
      }
    ];

    for (const gauge of gauges) {
      const id = uuidv4();
      const now = new Date().toISOString();
      const dueDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

      await this.db.run(
        `INSERT INTO gauges (
          id, gauge_id, description, type, location,
          accuracy, resolution, calibration_due_date,
          calibration_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          gauge.gaugeId,
          gauge.description,
          gauge.type,
          'METROLOGY-LAB',
          gauge.accuracy,
          gauge.resolution,
          dueDate.toISOString(),
          'CALIBRATED',
          now,
          now
        ]
      );
    }

    logger.info(`Created ${gauges.length} gauge records`);
  }

  async resetToInitialState(): Promise<void> {
    logger.info('Resetting database to initial state...');

    try {
      // Clear all tables
      const tables = [
        'po_receipt_lines',
        'po_receipts',
        'po_lines',
        'purchase_orders',
        'inventory_transactions',
        'inventory_items',
        'work_orders',
        'equipment',
        'gauges'
      ];

      for (const table of tables) {
        await this.db.run(`DELETE FROM ${table}`);
      }

      // Re-seed data
      await this.seedInitialData();
      logger.info('Database reset successfully');
    } catch (error) {
      logger.error('Failed to reset database', error);
      throw error;
    }
  }
}
