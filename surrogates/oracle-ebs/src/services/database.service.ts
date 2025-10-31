/**
 * Oracle EBS Surrogate - Database Service
 * Manages SQLite database for mock ERP data
 */

import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { Logger } from '../utils/logger';
import * as path from 'path';

const logger = Logger.getInstance();

export class DatabaseService {
  private static instance: DatabaseService;
  private db: sqlite3.Database | null = null;
  private dbPath: string;

  private constructor() {
    const env = process.env.NODE_ENV || 'development';
    const dbDir = process.env.DB_PATH || ':memory:';
    this.dbPath = dbDir === ':memory:' ? ':memory:' : path.join(dbDir, 'oracle-ebs.db');
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, async (err) => {
        if (err) {
          logger.error(`Failed to open database at ${this.dbPath}: ${err.message}`);
          reject(err);
          return;
        }

        logger.info(`Database connected at ${this.dbPath}`);

        try {
          await this.createTables();
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  private async createTables(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const run = promisify(this.db.run.bind(this.db));

    // Work Orders Table
    await run(`
      CREATE TABLE IF NOT EXISTS work_orders (
        id TEXT PRIMARY KEY,
        order_number TEXT UNIQUE NOT NULL,
        description TEXT,
        status TEXT NOT NULL,
        quantity INTEGER,
        start_date TEXT,
        due_date TEXT,
        equipment_id TEXT,
        cost_center TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Inventory Items Table
    await run(`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id TEXT PRIMARY KEY,
        part_number TEXT UNIQUE NOT NULL,
        description TEXT,
        on_hand_quantity REAL,
        allocated_quantity REAL,
        unit TEXT,
        warehouse_location TEXT,
        lot_number TEXT,
        expiry_date TEXT,
        last_transaction_date TEXT
      )
    `);

    // Inventory Transactions Table
    await run(`
      CREATE TABLE IF NOT EXISTS inventory_transactions (
        id TEXT PRIMARY KEY,
        part_number TEXT NOT NULL,
        transaction_type TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit TEXT,
        work_order_id TEXT,
        reference_number TEXT,
        notes TEXT,
        transaction_date TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (part_number) REFERENCES inventory_items(part_number)
      )
    `);

    // Purchase Orders Table
    await run(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id TEXT PRIMARY KEY,
        po_number TEXT UNIQUE NOT NULL,
        vendor TEXT NOT NULL,
        description TEXT,
        po_date TEXT,
        due_date TEXT,
        total_amount REAL,
        currency TEXT,
        status TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // PO Lines Table
    await run(`
      CREATE TABLE IF NOT EXISTS po_lines (
        id TEXT PRIMARY KEY,
        po_id TEXT NOT NULL,
        line_number INTEGER,
        part_number TEXT,
        description TEXT,
        quantity REAL,
        unit TEXT,
        unit_price REAL,
        total_price REAL,
        FOREIGN KEY (po_id) REFERENCES purchase_orders(id)
      )
    `);

    // PO Receipts Table
    await run(`
      CREATE TABLE IF NOT EXISTS po_receipts (
        id TEXT PRIMARY KEY,
        po_number TEXT NOT NULL,
        receipt_number TEXT UNIQUE NOT NULL,
        receipt_date TEXT,
        status TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (po_number) REFERENCES purchase_orders(po_number)
      )
    `);

    // PO Receipt Lines Table
    await run(`
      CREATE TABLE IF NOT EXISTS po_receipt_lines (
        id TEXT PRIMARY KEY,
        receipt_id TEXT NOT NULL,
        line_number INTEGER,
        part_number TEXT,
        quantity_received REAL,
        quantity_rejected REAL,
        unit TEXT,
        notes TEXT,
        FOREIGN KEY (receipt_id) REFERENCES po_receipts(id)
      )
    `);

    // Equipment Master Data Table
    await run(`
      CREATE TABLE IF NOT EXISTS equipment (
        id TEXT PRIMARY KEY,
        equipment_id TEXT UNIQUE NOT NULL,
        description TEXT,
        type TEXT,
        location TEXT,
        status TEXT,
        make TEXT,
        model TEXT,
        serial_number TEXT,
        cost_center TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Gauge Master Data Table
    await run(`
      CREATE TABLE IF NOT EXISTS gauges (
        id TEXT PRIMARY KEY,
        gauge_id TEXT UNIQUE NOT NULL,
        description TEXT,
        type TEXT,
        location TEXT,
        accuracy TEXT,
        resolution TEXT,
        calibration_due_date TEXT,
        calibration_status TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Work Order Transitions Table (Phase 2)
    await run(`
      CREATE TABLE IF NOT EXISTS work_order_transitions (
        id TEXT PRIMARY KEY,
        work_order_id TEXT NOT NULL,
        from_status TEXT NOT NULL,
        to_status TEXT NOT NULL,
        transition_date TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (work_order_id) REFERENCES work_orders(id)
      )
    `);

    // Transaction Results Table (Phase 2 - for rollback tracking)
    await run(`
      CREATE TABLE IF NOT EXISTS transaction_results (
        id TEXT PRIMARY KEY,
        transaction_id TEXT UNIQUE NOT NULL,
        part_number TEXT NOT NULL,
        old_balance REAL,
        new_balance REAL,
        transaction_type TEXT,
        success INTEGER,
        created_at TEXT NOT NULL,
        FOREIGN KEY (transaction_id) REFERENCES inventory_transactions(id),
        FOREIGN KEY (part_number) REFERENCES inventory_items(part_number)
      )
    `);

    // Update inventory_transactions table for Phase 2
    await run(`
      CREATE TABLE IF NOT EXISTS inventory_transactions_v2 (
        id TEXT PRIMARY KEY,
        part_number TEXT NOT NULL,
        transaction_type TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit TEXT,
        work_order_id TEXT,
        reference_number TEXT,
        notes TEXT,
        transaction_date TEXT NOT NULL,
        idempotency_key TEXT UNIQUE,
        rolled_back INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (part_number) REFERENCES inventory_items(part_number)
      )
    `);

    // Backflush Records Table (Phase 2)
    await run(`
      CREATE TABLE IF NOT EXISTS backflush_records (
        id TEXT PRIMARY KEY,
        work_order_id TEXT NOT NULL,
        part_number TEXT NOT NULL,
        quantity_issued REAL,
        labor_hours REAL,
        labor_cost REAL,
        material_cost REAL,
        backflush_date TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
        FOREIGN KEY (part_number) REFERENCES inventory_items(part_number)
      )
    `);

    logger.info('All database tables created successfully');
  }

  run(sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  get(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      this.db.close((err) => {
        if (err) reject(err);
        else {
          logger.info('Database connection closed');
          resolve();
        }
      });
    });
  }
}
