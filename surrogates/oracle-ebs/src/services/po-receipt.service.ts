/**
 * Oracle EBS Surrogate - PO Receipt Service
 * Manages purchase order receipts and three-way match (PO, Receipt, Invoice)
 */

import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from './database.service';
import { Logger } from '../utils/logger';
import { TransactionService } from './transaction.service';
import { POReceiptStatus, TransactionType } from '../models/types';

const logger = Logger.getInstance();

export interface POReceiptLineValidation {
  lineNumber: number;
  partNumber: string;
  poQuantity: number;
  receivedQuantity: number;
  rejectedQuantity: number;
  discrepancy: number;
  isValid: boolean;
  error?: string;
}

export interface ReceiptValidationResult {
  receiptNumber: string;
  isValid: boolean;
  validLines: POReceiptLineValidation[];
  threeWayMatch: boolean;
  errors: string[];
}

export class POReceiptService {
  private static instance: POReceiptService;
  private db: DatabaseService;
  private txService: TransactionService;

  private constructor() {
    this.db = DatabaseService.getInstance();
    this.txService = TransactionService.getInstance();
  }

  static getInstance(): POReceiptService {
    if (!POReceiptService.instance) {
      POReceiptService.instance = new POReceiptService();
    }
    return POReceiptService.instance;
  }

  /**
   * Create a PO receipt with validation
   */
  async createReceipt(
    poNumber: string,
    receiptNumber: string,
    receiptLines: Array<{
      lineNumber: number;
      partNumber: string;
      quantityReceived: number;
      quantityRejected: number;
    }>
  ): Promise<{ success: boolean; receiptId?: string; error?: string }> {
    try {
      // Validate PO exists
      const po = await this.db.get(
        'SELECT * FROM purchase_orders WHERE po_number = ?',
        [poNumber]
      );

      if (!po) {
        return {
          success: false,
          error: `Purchase order ${poNumber} not found`
        };
      }

      // Validate receipt doesn't already exist
      const existingReceipt = await this.db.get(
        'SELECT id FROM po_receipts WHERE receipt_number = ?',
        [receiptNumber]
      );

      if (existingReceipt) {
        return {
          success: false,
          error: `Receipt ${receiptNumber} already exists`
        };
      }

      // Validate receipt lines against PO
      const validationResult = await this.validateReceiptLines(
        po.id,
        receiptLines
      );

      if (!validationResult.isValid) {
        return {
          success: false,
          error: `Receipt validation failed: ${validationResult.errors.join(', ')}`
        };
      }

      // Create receipt
      const receiptId = uuidv4();
      const now = new Date().toISOString();

      await this.db.run(
        `INSERT INTO po_receipts (
          id, po_number, receipt_number, receipt_date, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          receiptId,
          poNumber,
          receiptNumber,
          now,
          POReceiptStatus.RECEIVED,
          now,
          now
        ]
      );

      // Create receipt lines and update inventory
      for (const line of receiptLines) {
        const lineId = uuidv4();

        await this.db.run(
          `INSERT INTO po_receipt_lines (
            id, receipt_id, line_number, part_number,
            quantity_received, quantity_rejected, unit
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            lineId,
            receiptId,
            line.lineNumber,
            line.partNumber,
            line.quantityReceived,
            line.quantityRejected || 0,
            'EA'
          ]
        );

        // Update inventory if received quantity > 0
        if (line.quantityReceived > 0) {
          const idempotencyKey = `PO_${poNumber}_${line.lineNumber}`;
          await this.txService.processTransaction(
            line.partNumber,
            TransactionType.RECEIVE,
            line.quantityReceived,
            undefined,
            `${poNumber}-${line.lineNumber}`,
            `Receipt from PO ${poNumber}`,
            idempotencyKey
          );
        }
      }

      logger.info(`PO Receipt ${receiptNumber} created successfully`);

      return {
        success: true,
        receiptId
      };
    } catch (error) {
      logger.error(`Failed to create PO receipt`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate receipt lines against PO
   */
  private async validateReceiptLines(
    poId: string,
    receiptLines: Array<{
      lineNumber: number;
      partNumber: string;
      quantityReceived: number;
      quantityRejected: number;
    }>
  ): Promise<ReceiptValidationResult> {
    const errors: string[] = [];
    const validLines: POReceiptLineValidation[] = [];

    try {
      // Get PO lines
      const poLines = await this.db.all(
        'SELECT * FROM po_lines WHERE po_id = ?',
        [poId]
      );

      for (const receiptLine of receiptLines) {
        // Find matching PO line
        const poLine = poLines.find(
          (l: any) =>
            l.line_number === receiptLine.lineNumber &&
            l.part_number === receiptLine.partNumber
        );

        if (!poLine) {
          errors.push(
            `PO line ${receiptLine.lineNumber} (${receiptLine.partNumber}) not found`
          );
          continue;
        }

        // Calculate discrepancy
        const discrepancy =
          receiptLine.quantityReceived +
          receiptLine.quantityRejected -
          poLine.quantity;
        const tolerance = poLine.quantity * 0.05; // 5% tolerance

        let isValid = Math.abs(discrepancy) <= tolerance;
        let error: string | undefined;

        if (!isValid) {
          error = `Quantity discrepancy exceeds tolerance (${discrepancy.toFixed(2)})`;
          errors.push(error);
        }

        validLines.push({
          lineNumber: receiptLine.lineNumber,
          partNumber: receiptLine.partNumber,
          poQuantity: poLine.quantity,
          receivedQuantity: receiptLine.quantityReceived,
          rejectedQuantity: receiptLine.quantityRejected || 0,
          discrepancy,
          isValid,
          error
        });
      }

      return {
        receiptNumber: '',
        isValid: errors.length === 0,
        validLines,
        threeWayMatch: errors.length === 0,
        errors
      };
    } catch (error) {
      logger.error('Failed to validate receipt lines', error);
      return {
        receiptNumber: '',
        isValid: false,
        validLines: [],
        threeWayMatch: false,
        errors: [error instanceof Error ? error.message : 'Validation failed']
      };
    }
  }

  /**
   * Get receipt details with lines
   */
  async getReceipt(receiptId: string): Promise<any> {
    try {
      const receipt = await this.db.get(
        'SELECT * FROM po_receipts WHERE id = ?',
        [receiptId]
      );

      if (!receipt) {
        return null;
      }

      const lines = await this.db.all(
        'SELECT * FROM po_receipt_lines WHERE receipt_id = ?',
        [receiptId]
      );

      return {
        ...receipt,
        lines
      };
    } catch (error) {
      logger.error(`Failed to get receipt ${receiptId}`, error);
      return null;
    }
  }

  /**
   * Get all receipts for a PO
   */
  async getReceiptsForPO(poNumber: string): Promise<any[]> {
    try {
      return await this.db.all(
        `SELECT * FROM po_receipts
         WHERE po_number = ?
         ORDER BY receipt_date DESC`,
        [poNumber]
      );
    } catch (error) {
      logger.error(`Failed to get receipts for PO ${poNumber}`, error);
      return [];
    }
  }

  /**
   * Update receipt status
   */
  async updateReceiptStatus(
    receiptId: string,
    status: POReceiptStatus
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const now = new Date().toISOString();

      await this.db.run(
        'UPDATE po_receipts SET status = ?, updated_at = ? WHERE id = ?',
        [status, now, receiptId]
      );

      logger.info(`Receipt ${receiptId} status updated to ${status}`);

      return { success: true };
    } catch (error) {
      logger.error(`Failed to update receipt status`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Three-way match validation (PO, Receipt, Invoice)
   * Simplified: checks PO vs Receipt (Invoice not implemented in this phase)
   */
  async performThreeWayMatch(receiptId: string): Promise<{
    isMatch: boolean;
    details: {
      poQuantity: number;
      receivedQuantity: number;
      invoicedQuantity: number;
      variance: number;
      withinTolerance: boolean;
    };
  }> {
    try {
      const receipt = await this.getReceipt(receiptId);

      if (!receipt) {
        return {
          isMatch: false,
          details: {
            poQuantity: 0,
            receivedQuantity: 0,
            invoicedQuantity: 0,
            variance: 0,
            withinTolerance: false
          }
        };
      }

      // Get PO for reference
      const po = await this.db.get(
        'SELECT * FROM purchase_orders WHERE po_number = ?',
        [receipt.po_number]
      );

      if (!po) {
        return {
          isMatch: false,
          details: {
            poQuantity: 0,
            receivedQuantity: 0,
            invoicedQuantity: 0,
            variance: 0,
            withinTolerance: false
          }
        };
      }

      // Sum quantities
      const poQuantity = await this.db.get(
        'SELECT SUM(quantity) as total FROM po_lines WHERE po_id = ?',
        [po.id]
      );

      const receivedQuantity = receipt.lines.reduce(
        (sum: number, line: any) => sum + (line.quantity_received || 0),
        0
      );

      // In Phase 2, invoice quantity = received quantity (simplified)
      const invoicedQuantity = receivedQuantity;
      const variance = Math.abs(poQuantity.total - receivedQuantity);
      const tolerance = poQuantity.total * 0.05; // 5% tolerance
      const withinTolerance = variance <= tolerance;

      return {
        isMatch: withinTolerance,
        details: {
          poQuantity: poQuantity.total || 0,
          receivedQuantity,
          invoicedQuantity,
          variance,
          withinTolerance
        }
      };
    } catch (error) {
      logger.error(`Failed to perform three-way match`, error);
      return {
        isMatch: false,
        details: {
          poQuantity: 0,
          receivedQuantity: 0,
          invoicedQuantity: 0,
          variance: 0,
          withinTolerance: false
        }
      };
    }
  }

  /**
   * Get PO receipt summary (how much received vs ordered)
   */
  async getPOReceiptSummary(poNumber: string): Promise<{
    poQuantity: number;
    totalReceived: number;
    totalRejected: number;
    outstanding: number;
    receiptCount: number;
  }> {
    try {
      const po = await this.db.get(
        'SELECT id FROM purchase_orders WHERE po_number = ?',
        [poNumber]
      );

      if (!po) {
        return {
          poQuantity: 0,
          totalReceived: 0,
          totalRejected: 0,
          outstanding: 0,
          receiptCount: 0
        };
      }

      const poQty = await this.db.get(
        'SELECT SUM(quantity) as total FROM po_lines WHERE po_id = ?',
        [po.id]
      );

      const received = await this.db.get(
        `SELECT SUM(quantity_received) as total FROM po_receipt_lines
         WHERE receipt_id IN (SELECT id FROM po_receipts WHERE po_number = ?)`,
        [poNumber]
      );

      const rejected = await this.db.get(
        `SELECT SUM(quantity_rejected) as total FROM po_receipt_lines
         WHERE receipt_id IN (SELECT id FROM po_receipts WHERE po_number = ?)`,
        [poNumber]
      );

      const receiptCount = await this.db.get(
        'SELECT COUNT(*) as count FROM po_receipts WHERE po_number = ?',
        [poNumber]
      );

      const poQuantity = poQty?.total || 0;
      const totalReceived = received?.total || 0;
      const totalRejected = rejected?.total || 0;

      return {
        poQuantity,
        totalReceived,
        totalRejected,
        outstanding: poQuantity - totalReceived,
        receiptCount: receiptCount?.count || 0
      };
    } catch (error) {
      logger.error(`Failed to get PO receipt summary`, error);
      return {
        poQuantity: 0,
        totalReceived: 0,
        totalRejected: 0,
        outstanding: 0,
        receiptCount: 0
      };
    }
  }
}
