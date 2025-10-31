/**
 * Oracle EBS Surrogate - Transaction Service
 * Manages inventory transactions with atomicity, rollback, and duplicate detection
 */

import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from './database.service';
import { Logger } from '../utils/logger';
import { TransactionType } from '../models/types';

const logger = Logger.getInstance();

export interface TransactionResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  newBalance?: number;
  oldBalance?: number;
}

export class TransactionService {
  private static instance: TransactionService;
  private db: DatabaseService;
  private processedTransactionIds: Set<string> = new Set();

  private constructor() {
    this.db = DatabaseService.getInstance();
  }

  static getInstance(): TransactionService {
    if (!TransactionService.instance) {
      TransactionService.instance = new TransactionService();
    }
    return TransactionService.instance;
  }

  /**
   * Process an inventory transaction with atomicity and duplicate detection
   */
  async processTransaction(
    partNumber: string,
    transactionType: TransactionType,
    quantity: number,
    workOrderId?: string,
    referenceNumber?: string,
    notes?: string,
    idempotencyKey?: string
  ): Promise<TransactionResult> {
    const txId = uuidv4();

    try {
      // Check for duplicate transaction using idempotency key
      if (idempotencyKey) {
        const existingTx = await this.db.get(
          'SELECT id FROM inventory_transactions WHERE idempotency_key = ?',
          [idempotencyKey]
        );

        if (existingTx) {
          logger.warn(
            `Duplicate transaction detected for idempotency key ${idempotencyKey}. Returning existing transaction.`
          );
          return {
            success: true,
            transactionId: existingTx.id,
            error: 'Duplicate transaction'
          };
        }
      }

      // Get current inventory
      const inventory = await this.db.get(
        'SELECT * FROM inventory_items WHERE part_number = ?',
        [partNumber]
      );

      if (!inventory) {
        return {
          success: false,
          error: `Part ${partNumber} not found in inventory`
        };
      }

      const oldBalance = inventory.on_hand_quantity;
      let newBalance = oldBalance;

      // Validate and calculate new balance based on transaction type
      switch (transactionType) {
        case TransactionType.ISSUE:
          // Check availability for issue
          const availableQty = inventory.on_hand_quantity - inventory.allocated_quantity;
          if (availableQty < quantity) {
            return {
              success: false,
              error: `Insufficient inventory. Available: ${availableQty}, Requested: ${quantity}`,
              oldBalance
            };
          }
          newBalance = oldBalance - quantity;
          break;

        case TransactionType.RECEIVE:
          newBalance = oldBalance + quantity;
          break;

        case TransactionType.ADJUST:
          // Adjust allows any positive or negative change
          newBalance = oldBalance + quantity;
          if (newBalance < 0) {
            return {
              success: false,
              error: 'Adjustment would result in negative inventory balance',
              oldBalance
            };
          }
          break;

        default:
          return {
            success: false,
            error: `Unknown transaction type: ${transactionType}`
          };
      }

      const now = new Date().toISOString();

      // Begin transaction (simulated with error handling)
      try {
        // Insert transaction record
        await this.db.run(
          `INSERT INTO inventory_transactions (
            id, part_number, transaction_type, quantity, unit,
            work_order_id, reference_number, notes, transaction_date,
            idempotency_key, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
            idempotencyKey || null,
            now
          ]
        );

        // Update inventory balance
        await this.db.run(
          'UPDATE inventory_items SET on_hand_quantity = ?, last_transaction_date = ? WHERE part_number = ?',
          [newBalance, now, partNumber]
        );

        // Record transaction result for potential rollback
        await this.db.run(
          `INSERT INTO transaction_results (
            id, transaction_id, part_number, old_balance, new_balance,
            transaction_type, success, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [uuidv4(), txId, partNumber, oldBalance, newBalance, transactionType, 1, now]
        );

        logger.info(
          `Transaction ${txId} succeeded. ${partNumber}: ${oldBalance} → ${newBalance}`
        );

        return {
          success: true,
          transactionId: txId,
          oldBalance,
          newBalance
        };
      } catch (error) {
        // Rollback on error
        logger.error(`Transaction ${txId} failed. Rolling back...`, error);

        // Attempt to undo the transaction
        await this.rollbackTransaction(txId);

        return {
          success: false,
          error: `Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          oldBalance
        };
      }
    } catch (error) {
      logger.error(`Failed to process transaction for ${partNumber}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Rollback a transaction
   */
  private async rollbackTransaction(transactionId: string): Promise<void> {
    try {
      // Get transaction details
      const txResult = await this.db.get(
        'SELECT * FROM transaction_results WHERE transaction_id = ?',
        [transactionId]
      );

      if (!txResult) {
        return;
      }

      // Restore old balance
      const now = new Date().toISOString();
      await this.db.run(
        'UPDATE inventory_items SET on_hand_quantity = ?, last_transaction_date = ? WHERE part_number = ?',
        [txResult.old_balance, now, txResult.part_number]
      );

      // Mark transaction as rolled back
      await this.db.run(
        'UPDATE inventory_transactions SET rolled_back = 1 WHERE id = ?',
        [transactionId]
      );

      logger.info(`Transaction ${transactionId} rolled back successfully`);
    } catch (error) {
      logger.error(`Failed to rollback transaction ${transactionId}`, error);
    }
  }

  /**
   * Get transaction history for a part
   */
  async getTransactionHistory(
    partNumber: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      return await this.db.all(
        `SELECT * FROM inventory_transactions
         WHERE part_number = ?
         ORDER BY transaction_date DESC
         LIMIT ?`,
        [partNumber, limit]
      );
    } catch (error) {
      logger.error(`Failed to get transaction history for ${partNumber}`, error);
      return [];
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId: string): Promise<any> {
    try {
      return await this.db.get(
        'SELECT * FROM inventory_transactions WHERE id = ?',
        [transactionId]
      );
    } catch (error) {
      logger.error(`Failed to get transaction ${transactionId}`, error);
      return null;
    }
  }

  /**
   * Get audit trail for a part (all transactions)
   */
  async getAuditTrail(partNumber: string): Promise<any[]> {
    try {
      return await this.db.all(
        `SELECT
          it.id, it.part_number, it.transaction_type, it.quantity,
          it.work_order_id, it.reference_number, it.notes,
          it.transaction_date, it.rolled_back,
          tr.old_balance, tr.new_balance
         FROM inventory_transactions it
         LEFT JOIN transaction_results tr ON it.id = tr.transaction_id
         WHERE it.part_number = ?
         ORDER BY it.transaction_date DESC`,
        [partNumber]
      );
    } catch (error) {
      logger.error(`Failed to get audit trail for ${partNumber}`, error);
      return [];
    }
  }

  /**
   * Verify transaction consistency
   */
  async verifyConsistency(partNumber: string): Promise<{
    isConsistent: boolean;
    expectedBalance: number;
    actualBalance: number;
    discrepancy: number;
  }> {
    try {
      // Get current balance from inventory_items
      const inventory = await this.db.get(
        'SELECT on_hand_quantity FROM inventory_items WHERE part_number = ?',
        [partNumber]
      );

      if (!inventory) {
        return {
          isConsistent: false,
          expectedBalance: 0,
          actualBalance: 0,
          discrepancy: 0
        };
      }

      // Calculate expected balance from transactions
      const result = await this.db.get(
        `SELECT
          COALESCE(SUM(CASE
            WHEN transaction_type = 'RECEIVE' OR transaction_type = 'ADJUST' THEN quantity
            WHEN transaction_type = 'ISSUE' THEN -quantity
            ELSE 0
          END), 0) as total_change
         FROM inventory_transactions
         WHERE part_number = ? AND (rolled_back = 0 OR rolled_back IS NULL)`,
        [partNumber]
      );

      // We need initial balance - for this simulation, assume initial is 0 + total_change
      const expectedBalance = result?.total_change || 0;
      const actualBalance = inventory.on_hand_quantity;
      const discrepancy = actualBalance - expectedBalance;

      return {
        isConsistent: discrepancy === 0,
        expectedBalance,
        actualBalance,
        discrepancy
      };
    } catch (error) {
      logger.error(`Failed to verify consistency for ${partNumber}`, error);
      return {
        isConsistent: false,
        expectedBalance: 0,
        actualBalance: 0,
        discrepancy: 0
      };
    }
  }

  /**
   * Get transactions for a work order
   */
  async getTransactionsForWorkOrder(workOrderId: string): Promise<any[]> {
    try {
      return await this.db.all(
        `SELECT * FROM inventory_transactions
         WHERE work_order_id = ?
         ORDER BY transaction_date DESC`,
        [workOrderId]
      );
    } catch (error) {
      logger.error(`Failed to get transactions for work order ${workOrderId}`, error);
      return [];
    }
  }
}
