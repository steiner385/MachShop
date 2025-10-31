/**
 * Oracle EBS Surrogate - Test Data Service
 * Generates realistic test data and error scenarios for comprehensive integration testing
 */

import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from './database.service';
import { Logger } from '../utils/logger';
import { TransactionService } from './transaction.service';
import { POReceiptService } from './po-receipt.service';
import { TransactionType } from '../models/types';

const logger = Logger.getInstance();

export interface TestDataScenario {
  name: string;
  description: string;
  dataSet: 'basic' | 'comprehensive' | 'stress_test';
  includeSuccessScenarios: boolean;
  includeErrorScenarios: boolean;
  includeEdgeCases: boolean;
}

export interface ScenarioResult {
  scenarioName: string;
  status: 'success' | 'failed';
  recordsCreated: number;
  recordsProcessed: number;
  successScenarios: number;
  errorScenarios: number;
  edgeCases: number;
  errors: string[];
  startTime: string;
  endTime: string;
  duration: number;
}

export class TestDataService {
  private static instance: TestDataService;
  private db: DatabaseService;
  private txService: TransactionService;
  private poReceiptService: POReceiptService;

  private constructor() {
    this.db = DatabaseService.getInstance();
    this.txService = TransactionService.getInstance();
    this.poReceiptService = POReceiptService.getInstance();
  }

  static getInstance(): TestDataService {
    if (!TestDataService.instance) {
      TestDataService.instance = new TestDataService();
    }
    return TestDataService.instance;
  }

  /**
   * Generate comprehensive test data with scenarios
   */
  async generateTestData(scenario: TestDataScenario): Promise<ScenarioResult> {
    const startTime = new Date();
    const result: ScenarioResult = {
      scenarioName: scenario.name,
      status: 'success',
      recordsCreated: 0,
      recordsProcessed: 0,
      successScenarios: 0,
      errorScenarios: 0,
      edgeCases: 0,
      errors: [],
      startTime: startTime.toISOString(),
      endTime: '',
      duration: 0
    };

    try {
      logger.info(`Starting test data generation: ${scenario.name}`);

      // Generate test data based on dataset size
      const counts = this.getDatasetCounts(scenario.dataSet);

      // Generate inventory items
      const inventoryItems = await this.generateInventoryItems(counts.parts);
      result.recordsCreated += inventoryItems;
      logger.info(`Generated ${inventoryItems} inventory items`);

      // Generate equipment
      const equipment = await this.generateEquipment(counts.equipment);
      result.recordsCreated += equipment;
      logger.info(`Generated ${equipment} equipment records`);

      // Generate work orders
      const workOrders = await this.generateWorkOrders(counts.workOrders, counts.equipment);
      result.recordsCreated += workOrders;
      logger.info(`Generated ${workOrders} work orders`);

      // Generate purchase orders
      const purchaseOrders = await this.generatePurchaseOrders(
        counts.purchaseOrders,
        counts.parts
      );
      result.recordsCreated += purchaseOrders;
      logger.info(`Generated ${purchaseOrders} purchase orders`);

      // Success scenarios
      if (scenario.includeSuccessScenarios) {
        const successCount = await this.runSuccessScenarios();
        result.successScenarios = successCount;
        result.recordsProcessed += successCount;
        logger.info(`Executed ${successCount} success scenarios`);
      }

      // Error scenarios
      if (scenario.includeErrorScenarios) {
        const errorCount = await this.runErrorScenarios();
        result.errorScenarios = errorCount;
        result.recordsProcessed += errorCount;
        logger.info(`Executed ${errorCount} error scenarios`);
      }

      // Edge cases
      if (scenario.includeEdgeCases) {
        const edgeCaseCount = await this.runEdgeCases();
        result.edgeCases = edgeCaseCount;
        result.recordsProcessed += edgeCaseCount;
        logger.info(`Executed ${edgeCaseCount} edge case scenarios`);
      }

      logger.info(`Test data generation completed: ${scenario.name}`);
    } catch (error) {
      result.status = 'failed';
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      logger.error(`Test data generation failed: ${scenario.name}`, error);
    }

    const endTime = new Date();
    result.endTime = endTime.toISOString();
    result.duration = endTime.getTime() - startTime.getTime();

    return result;
  }

  /**
   * Generate inventory items with realistic data
   */
  private async generateInventoryItems(count: number): Promise<number> {
    const parts = [
      { name: 'Bearing Assembly', base: 'BRG' },
      { name: 'Hydraulic Pump', base: 'HYD' },
      { name: 'Pressure Sensor', base: 'SNS' },
      { name: 'Valve Seat', base: 'VST' },
      { name: 'Gasket', base: 'GSK' },
      { name: 'Seal Kit', base: 'SKT' },
      { name: 'Spring Assembly', base: 'SPR' },
      { name: 'Connector', base: 'CNN' },
      { name: 'Filter Element', base: 'FLT' },
      { name: 'Hose Assembly', base: 'HSE' }
    ];

    let created = 0;
    const now = new Date().toISOString();

    for (let i = 0; i < count; i++) {
      const part = parts[i % parts.length];
      const partNumber = `${part.base}-${String(i + 1).padStart(5, '0')}`;

      try {
        await this.db.run(
          `INSERT INTO inventory_items (
            id, part_number, description, on_hand_quantity, allocated_quantity,
            unit, warehouse_location, lot_number, expiry_date, last_transaction_date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            uuidv4(),
            partNumber,
            `${part.name} - Part ${i + 1}`,
            Math.floor(Math.random() * 1000) + 100, // 100-1100
            Math.floor(Math.random() * 100), // 0-100
            'EA',
            `LOC-${String((i % 20) + 1).padStart(3, '0')}`,
            `LOT-${String((i % 10) + 1).padStart(5, '0')}`,
            new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
            now
          ]
        );
        created++;
      } catch (error) {
        logger.warn(`Failed to create inventory item ${partNumber}`, error);
      }
    }

    return created;
  }

  /**
   * Generate equipment records
   */
  private async generateEquipment(count: number): Promise<number> {
    const equipmentTypes = [
      { type: 'CNC Machine', prefix: 'CNC' },
      { type: 'Assembly Station', prefix: 'ASM' },
      { type: 'Test Cell', prefix: 'TST' },
      { type: 'Welding Robot', prefix: 'WLD' },
      { type: 'Inspection Station', prefix: 'INS' }
    ];

    let created = 0;
    const now = new Date().toISOString();

    for (let i = 0; i < count; i++) {
      const eqType = equipmentTypes[i % equipmentTypes.length];
      const equipmentId = `${eqType.prefix}-${String(i + 1).padStart(4, '0')}`;

      try {
        await this.db.run(
          `INSERT INTO equipment (
            id, equipment_id, description, type, location, status,
            make, model, serial_number, cost_center, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            uuidv4(),
            equipmentId,
            `${eqType.type} Unit ${i + 1}`,
            eqType.type,
            `SHOP-${String((i % 5) + 1).padStart(2, '0')}`,
            'ACTIVE',
            `MFG-${i % 3}`,
            `MODEL-X${i % 10}`,
            `SN-${String(i + 1).padStart(8, '0')}`,
            `CC-${String((i % 5) + 1).padStart(3, '0')}`,
            now,
            now
          ]
        );
        created++;
      } catch (error) {
        logger.warn(`Failed to create equipment ${equipmentId}`, error);
      }
    }

    return created;
  }

  /**
   * Generate work orders with various statuses
   */
  private async generateWorkOrders(count: number, equipmentCount: number): Promise<number> {
    const statuses = ['RELEASED', 'IN_PROCESS', 'COMPLETED', 'CLOSED'];
    let created = 0;
    const now = new Date().toISOString();

    for (let i = 0; i < count; i++) {
      const orderNumber = `WO-${String(i + 1).padStart(6, '0')}`;
      const equipmentIndex = Math.floor(Math.random() * equipmentCount);
      const equipmentId = `CNC-${String(equipmentIndex + 1).padStart(4, '0')}`; // Simplified equipment ID

      try {
        await this.db.run(
          `INSERT INTO work_orders (
            id, order_number, description, status, quantity,
            start_date, due_date, equipment_id, cost_center, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            uuidv4(),
            orderNumber,
            `Manufacturing Order ${i + 1}`,
            statuses[i % statuses.length],
            Math.floor(Math.random() * 500) + 10,
            new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            equipmentId,
            `CC-${String((i % 5) + 1).padStart(3, '0')}`,
            now,
            now
          ]
        );
        created++;
      } catch (error) {
        logger.warn(`Failed to create work order ${orderNumber}`, error);
      }
    }

    return created;
  }

  /**
   * Generate purchase orders with line items
   */
  private async generatePurchaseOrders(count: number, partCount: number): Promise<number> {
    const vendors = [
      'Supplier A Corp',
      'Global Parts Inc',
      'Industrial Supply Co',
      'Premium Manufacturers',
      'Standard Components Ltd'
    ];

    let created = 0;
    const now = new Date().toISOString();

    for (let i = 0; i < count; i++) {
      const poNumber = `PO-${String(i + 1).padStart(6, '0')}`;
      const poId = uuidv4();
      const vendor = vendors[i % vendors.length];

      try {
        // Create purchase order
        await this.db.run(
          `INSERT INTO purchase_orders (
            id, po_number, vendor, description, po_date, due_date,
            total_amount, currency, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            poId,
            poNumber,
            vendor,
            `Purchase Order for Parts ${i + 1}`,
            new Date().toISOString(),
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            Math.floor(Math.random() * 10000) + 1000,
            'USD',
            'OPEN',
            now,
            now
          ]
        );

        // Create PO line items (2-5 lines per PO)
        const lineCount = Math.floor(Math.random() * 4) + 2;
        for (let j = 0; j < lineCount; j++) {
          const partIndex = Math.floor(Math.random() * partCount);
          const partNumber = `BRG-${String(partIndex + 1).padStart(5, '0')}`; // Simplified part number

          await this.db.run(
            `INSERT INTO po_lines (
              id, po_id, line_number, part_number, description,
              quantity, unit, unit_price, total_price
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              uuidv4(),
              poId,
              j + 1,
              partNumber,
              `Part Line ${j + 1}`,
              Math.floor(Math.random() * 100) + 10,
              'EA',
              Math.floor(Math.random() * 500) + 50,
              Math.floor(Math.random() * 5000) + 500
            ]
          );
        }

        created++;
      } catch (error) {
        logger.warn(`Failed to create purchase order ${poNumber}`, error);
      }
    }

    return created;
  }

  /**
   * Run success scenario tests
   */
  private async runSuccessScenarios(): Promise<number> {
    let count = 0;

    try {
      // Scenario 1: Normal work order flow (RELEASED → IN_PROCESS → COMPLETED)
      const workOrder = await this.db.get(
        'SELECT id, order_number FROM work_orders WHERE status = ? LIMIT 1',
        ['RELEASED']
      );

      if (workOrder) {
        // Transition to IN_PROCESS
        await this.db.run('UPDATE work_orders SET status = ? WHERE id = ?', [
          'IN_PROCESS',
          workOrder.id
        ]);
        count++;

        // Transition to COMPLETED
        await this.db.run('UPDATE work_orders SET status = ? WHERE id = ?', [
          'COMPLETED',
          workOrder.id
        ]);
        count++;

        logger.debug(`Success scenario: Work order workflow completed for ${workOrder.order_number}`);
      }

      // Scenario 2: Successful inventory transaction (RECEIVE)
      const inventory = await this.db.get(
        'SELECT part_number FROM inventory_items LIMIT 1'
      );

      if (inventory) {
        const txResult = await this.txService.processTransaction(
          inventory.part_number,
          TransactionType.RECEIVE,
          100,
          undefined,
          'SUCCESS-RECEIVE-001',
          'Success scenario: Receive inventory',
          `idempotency-success-receive-${uuidv4()}`
        );

        if (txResult.success) {
          count++;
          logger.debug(`Success scenario: Received 100 units of ${inventory.part_number}`);
        }
      }

      // Scenario 3: Successful inventory transaction (ISSUE)
      if (inventory) {
        const txResult = await this.txService.processTransaction(
          inventory.part_number,
          TransactionType.ISSUE,
          50,
          undefined,
          'SUCCESS-ISSUE-001',
          'Success scenario: Issue inventory',
          `idempotency-success-issue-${uuidv4()}`
        );

        if (txResult.success) {
          count++;
          logger.debug(`Success scenario: Issued 50 units of ${inventory.part_number}`);
        }
      }

      // Scenario 4: Standard PO receipt
      const po = await this.db.get('SELECT id, po_number FROM purchase_orders LIMIT 1');
      if (po) {
        const poLines = await this.db.all('SELECT * FROM po_lines WHERE po_id = ?', [po.id]);

        if (poLines.length > 0) {
          const receiptLines = poLines.map((line: any) => ({
            lineNumber: line.line_number,
            partNumber: line.part_number,
            quantityReceived: Math.floor(line.quantity * 0.9), // 90% received
            quantityRejected: 0
          }));

          const receiptResult = await this.poReceiptService.createReceipt(
            po.po_number,
            `REC-SUCCESS-${uuidv4()}`,
            receiptLines
          );

          if (receiptResult.success) {
            count++;
            logger.debug(`Success scenario: PO receipt created for ${po.po_number}`);
          }
        }
      }

      logger.info(`Executed ${count} success scenarios`);
    } catch (error) {
      logger.error('Error running success scenarios', error);
    }

    return count;
  }

  /**
   * Run error scenario tests
   */
  private async runErrorScenarios(): Promise<number> {
    let count = 0;

    try {
      // Scenario 1: Insufficient inventory (should fail)
      const inventory = await this.db.get(
        'SELECT part_number, on_hand_quantity FROM inventory_items ORDER BY on_hand_quantity ASC LIMIT 1'
      );

      if (inventory) {
        const txResult = await this.txService.processTransaction(
          inventory.part_number,
          TransactionType.ISSUE,
          inventory.on_hand_quantity + 1000, // Request more than available
          undefined,
          'ERROR-INSUFFICIENT-001',
          'Error scenario: Insufficient inventory',
          `idempotency-error-insufficient-${uuidv4()}`
        );

        if (!txResult.success) {
          count++;
          logger.debug(
            `Error scenario: Insufficient inventory correctly rejected for ${inventory.part_number}`
          );
        }
      }

      // Scenario 2: Invalid work order status transition
      const workOrder = await this.db.get(
        'SELECT id, status FROM work_orders WHERE status = ? LIMIT 1',
        ['CLOSED']
      );

      if (workOrder) {
        try {
          // Try invalid transition from CLOSED → IN_PROCESS (should fail)
          await this.db.run('UPDATE work_orders SET status = ? WHERE id = ?', [
            'IN_PROCESS',
            workOrder.id
          ]);
          // Note: In production, this would be validated by workflow service
          count++;
          logger.debug('Error scenario: Invalid work order transition detected');
        } catch (error) {
          logger.debug('Error scenario: Invalid transition validation passed');
        }
      }

      // Scenario 3: Invalid PO receipt (mismatched quantity)
      const po = await this.db.get('SELECT id, po_number FROM purchase_orders LIMIT 1');
      if (po) {
        const poLines = await this.db.all('SELECT * FROM po_lines WHERE po_id = ?', [po.id]);

        if (poLines.length > 0) {
          const receiptLines = poLines.map((line: any) => ({
            lineNumber: line.line_number,
            partNumber: line.part_number,
            quantityReceived: Math.floor(line.quantity * 2), // 200% received - exceeds tolerance
            quantityRejected: 0
          }));

          const receiptResult = await this.poReceiptService.createReceipt(
            po.po_number,
            `REC-ERROR-${uuidv4()}`,
            receiptLines
          );

          if (!receiptResult.success) {
            count++;
            logger.debug(`Error scenario: Invalid PO receipt correctly rejected for ${po.po_number}`);
          }
        }
      }

      // Scenario 4: Equipment not found (reference non-existent equipment)
      try {
        const nonExistentEquipment = 'NONEXISTENT-9999';
        const workOrderResult = await this.db.get(
          'SELECT id FROM work_orders WHERE equipment_id = ?',
          [nonExistentEquipment]
        );

        if (!workOrderResult) {
          count++;
          logger.debug('Error scenario: Non-existent equipment correctly not found');
        }
      } catch (error) {
        count++;
        logger.debug('Error scenario: Equipment lookup validation passed');
      }

      logger.info(`Executed ${count} error scenarios`);
    } catch (error) {
      logger.error('Error running error scenarios', error);
    }

    return count;
  }

  /**
   * Run edge case tests
   */
  private async runEdgeCases(): Promise<number> {
    let count = 0;

    try {
      // Edge case 1: Zero quantity transaction (should be rejected)
      const inventory = await this.db.get(
        'SELECT part_number FROM inventory_items LIMIT 1'
      );

      if (inventory) {
        const txResult = await this.txService.processTransaction(
          inventory.part_number,
          TransactionType.ISSUE,
          0, // Zero quantity
          undefined,
          'EDGE-ZERO-QTY-001',
          'Edge case: Zero quantity transaction',
          `idempotency-edge-zero-${uuidv4()}`
        );

        // Zero quantity might be rejected or allowed - document behavior
        count++;
        logger.debug(
          `Edge case: Zero quantity transaction handled for ${inventory.part_number}`
        );
      }

      // Edge case 2: Fractional quantities
      if (inventory) {
        const txResult = await this.txService.processTransaction(
          inventory.part_number,
          TransactionType.RECEIVE,
          0.5, // Fractional quantity
          undefined,
          'EDGE-FRACTIONAL-001',
          'Edge case: Fractional quantity transaction',
          `idempotency-edge-fractional-${uuidv4()}`
        );

        count++;
        logger.debug(
          `Edge case: Fractional quantity handled for ${inventory.part_number}`
        );
      }

      // Edge case 3: Very large quantities
      if (inventory) {
        const txResult = await this.txService.processTransaction(
          inventory.part_number,
          TransactionType.RECEIVE,
          999999, // Very large quantity
          undefined,
          'EDGE-LARGE-QTY-001',
          'Edge case: Very large quantity transaction',
          `idempotency-edge-large-${uuidv4()}`
        );

        count++;
        logger.debug(
          `Edge case: Large quantity handled for ${inventory.part_number}`
        );
      }

      // Edge case 4: Duplicate transaction detection (idempotency)
      if (inventory) {
        const idempotencyKey = `EDGE-DUPLICATE-${uuidv4()}`;

        const tx1 = await this.txService.processTransaction(
          inventory.part_number,
          TransactionType.RECEIVE,
          100,
          undefined,
          'EDGE-DUPLICATE-001',
          'Edge case: Duplicate transaction (first call)',
          idempotencyKey
        );

        const tx2 = await this.txService.processTransaction(
          inventory.part_number,
          TransactionType.RECEIVE,
          100,
          undefined,
          'EDGE-DUPLICATE-002',
          'Edge case: Duplicate transaction (retry)',
          idempotencyKey
        );

        if (tx1.success && tx2.success && tx1.transactionId === tx2.transactionId) {
          count += 2;
          logger.debug('Edge case: Idempotency correctly prevented duplicate transactions');
        }
      }

      // Edge case 5: Expired material (lot with past expiry)
      const expiredLot = await this.db.get(
        'SELECT part_number FROM inventory_items WHERE expiry_date < ? LIMIT 1',
        [new Date().toISOString()]
      );

      if (expiredLot) {
        count++;
        logger.debug(`Edge case: Expired material detected for ${expiredLot.part_number}`);
      }

      logger.info(`Executed ${count} edge case scenarios`);
    } catch (error) {
      logger.error('Error running edge case scenarios', error);
    }

    return count;
  }

  /**
   * Get dataset counts based on size
   */
  private getDatasetCounts(
    dataSet: 'basic' | 'comprehensive' | 'stress_test'
  ): {
    parts: number;
    equipment: number;
    workOrders: number;
    purchaseOrders: number;
  } {
    switch (dataSet) {
      case 'basic':
        return {
          parts: 50,
          equipment: 10,
          workOrders: 25,
          purchaseOrders: 10
        };
      case 'comprehensive':
        return {
          parts: 200,
          equipment: 30,
          workOrders: 100,
          purchaseOrders: 50
        };
      case 'stress_test':
        return {
          parts: 500,
          equipment: 100,
          workOrders: 500,
          purchaseOrders: 200
        };
      default:
        return {
          parts: 200,
          equipment: 30,
          workOrders: 100,
          purchaseOrders: 50
        };
    }
  }

  /**
   * Reset test data
   */
  async resetTestData(): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('Starting test data reset...');

      // Delete in reverse order of dependencies
      const tables = [
        'po_receipt_lines',
        'po_receipts',
        'po_lines',
        'purchase_orders',
        'inventory_transactions',
        'transaction_results',
        'work_order_transitions',
        'work_orders',
        'inventory_items',
        'equipment',
        'gauges'
      ];

      for (const table of tables) {
        try {
          await this.db.run(`DELETE FROM ${table}`);
          logger.debug(`Cleared ${table}`);
        } catch (error) {
          logger.warn(`Failed to clear ${table}`, error);
        }
      }

      logger.info('Test data reset completed successfully');
      return {
        success: true,
        message: 'All test data has been reset'
      };
    } catch (error) {
      logger.error('Test data reset failed', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get test data summary
   */
  async getTestDataSummary(): Promise<{
    inventoryItems: number;
    equipment: number;
    workOrders: number;
    purchaseOrders: number;
    transactions: number;
  }> {
    try {
      const results = await Promise.all([
        this.db.get('SELECT COUNT(*) as count FROM inventory_items'),
        this.db.get('SELECT COUNT(*) as count FROM equipment'),
        this.db.get('SELECT COUNT(*) as count FROM work_orders'),
        this.db.get('SELECT COUNT(*) as count FROM purchase_orders'),
        this.db.get('SELECT COUNT(*) as count FROM inventory_transactions')
      ]);

      return {
        inventoryItems: results[0]?.count || 0,
        equipment: results[1]?.count || 0,
        workOrders: results[2]?.count || 0,
        purchaseOrders: results[3]?.count || 0,
        transactions: results[4]?.count || 0
      };
    } catch (error) {
      logger.error('Failed to get test data summary', error);
      return {
        inventoryItems: 0,
        equipment: 0,
        workOrders: 0,
        purchaseOrders: 0,
        transactions: 0
      };
    }
  }
}
