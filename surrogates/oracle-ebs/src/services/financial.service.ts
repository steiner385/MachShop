/**
 * Oracle EBS Surrogate - Financial Service
 * Manages cost transactions, financial tracking, and GL account mapping
 */

import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from './database.service';
import { Logger } from '../utils/logger';

const logger = Logger.getInstance();

export interface CostTransaction {
  id: string;
  transactionType: 'LABOR' | 'MATERIAL' | 'OVERHEAD' | 'ADJUSTMENT';
  amount: number;
  currency: string;
  workOrderId?: string;
  partNumber?: string;
  costCenter: string;
  glAccount: string;
  description: string;
  transactionDate: string;
  createdAt: string;
}

export interface CostAllocation {
  workOrderId: string;
  laborCost: number;
  materialCost: number;
  overheadCost: number;
  totalCost: number;
  costCenter: string;
  completionDate: string;
}

export interface CostCenterReport {
  costCenter: string;
  period: string;
  laborCost: number;
  materialCost: number;
  overheadCost: number;
  totalCost: number;
  transactionCount: number;
  averageTransaction: number;
}

export class FinancialService {
  private static instance: FinancialService;
  private db: DatabaseService;

  private constructor() {
    this.db = DatabaseService.getInstance();
  }

  static getInstance(): FinancialService {
    if (!FinancialService.instance) {
      FinancialService.instance = new FinancialService();
    }
    return FinancialService.instance;
  }

  /**
   * Record a labor cost transaction
   */
  async recordLaborCost(
    workOrderId: string,
    hours: number,
    hourlyRate: number,
    costCenter: string,
    description?: string
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      const amount = hours * hourlyRate;
      const txId = uuidv4();
      const now = new Date().toISOString();

      await this.db.run(
        `INSERT INTO cost_transactions (
          id, transaction_type, amount, currency, work_order_id,
          cost_center, gl_account, description, transaction_date, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          txId,
          'LABOR',
          amount,
          'USD',
          workOrderId,
          costCenter,
          '5100', // Labor GL account
          description || `Labor cost: ${hours} hours @ $${hourlyRate}/hr`,
          now,
          now
        ]
      );

      logger.info(`Labor cost recorded: $${amount} for work order ${workOrderId}`);

      return {
        success: true,
        transactionId: txId
      };
    } catch (error) {
      logger.error('Failed to record labor cost', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Record a material cost transaction
   */
  async recordMaterialCost(
    workOrderId: string,
    partNumber: string,
    quantity: number,
    unitCost: number,
    costCenter: string,
    description?: string
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      const amount = quantity * unitCost;
      const txId = uuidv4();
      const now = new Date().toISOString();

      await this.db.run(
        `INSERT INTO cost_transactions (
          id, transaction_type, amount, currency, work_order_id,
          part_number, cost_center, gl_account, description, transaction_date, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          txId,
          'MATERIAL',
          amount,
          'USD',
          workOrderId,
          partNumber,
          costCenter,
          '5200', // Material GL account
          description || `Material cost: ${quantity} units of ${partNumber} @ $${unitCost}`,
          now,
          now
        ]
      );

      logger.info(`Material cost recorded: $${amount} for part ${partNumber}`);

      return {
        success: true,
        transactionId: txId
      };
    } catch (error) {
      logger.error('Failed to record material cost', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Allocate overhead costs to work orders
   */
  async allocateOverheadCost(
    workOrderId: string,
    amount: number,
    costCenter: string,
    description?: string
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      const txId = uuidv4();
      const now = new Date().toISOString();

      await this.db.run(
        `INSERT INTO cost_transactions (
          id, transaction_type, amount, currency, work_order_id,
          cost_center, gl_account, description, transaction_date, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          txId,
          'OVERHEAD',
          amount,
          'USD',
          workOrderId,
          costCenter,
          '5300', // Overhead GL account
          description || `Overhead allocation: $${amount}`,
          now,
          now
        ]
      );

      logger.info(`Overhead cost allocated: $${amount} to work order ${workOrderId}`);

      return {
        success: true,
        transactionId: txId
      };
    } catch (error) {
      logger.error('Failed to allocate overhead cost', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get cost allocation for a work order
   */
  async getCostAllocation(workOrderId: string): Promise<CostAllocation | null> {
    try {
      // Get work order details
      const workOrder = await this.db.get(
        'SELECT * FROM work_orders WHERE id = ?',
        [workOrderId]
      );

      if (!workOrder) {
        return null;
      }

      // Get all costs for this work order
      const costs = await this.db.all(
        `SELECT transaction_type, SUM(amount) as total FROM cost_transactions
         WHERE work_order_id = ? GROUP BY transaction_type`,
        [workOrderId]
      );

      let laborCost = 0;
      let materialCost = 0;
      let overheadCost = 0;

      for (const cost of costs) {
        switch (cost.transaction_type) {
          case 'LABOR':
            laborCost = cost.total || 0;
            break;
          case 'MATERIAL':
            materialCost = cost.total || 0;
            break;
          case 'OVERHEAD':
            overheadCost = cost.total || 0;
            break;
        }
      }

      return {
        workOrderId,
        laborCost,
        materialCost,
        overheadCost,
        totalCost: laborCost + materialCost + overheadCost,
        costCenter: workOrder.cost_center,
        completionDate: workOrder.updated_at
      };
    } catch (error) {
      logger.error(`Failed to get cost allocation for ${workOrderId}`, error);
      return null;
    }
  }

  /**
   * Get cost center report
   */
  async getCostCenterReport(
    costCenter: string,
    startDate: string,
    endDate: string
  ): Promise<CostCenterReport | null> {
    try {
      const period = `${startDate} to ${endDate}`;

      // Get aggregated costs
      const result = await this.db.get(
        `SELECT
          transaction_type,
          SUM(amount) as total,
          COUNT(*) as count
         FROM cost_transactions
         WHERE cost_center = ? AND transaction_date BETWEEN ? AND ?
         GROUP BY transaction_type`,
        [costCenter, startDate, endDate]
      );

      let laborCost = 0;
      let materialCost = 0;
      let overheadCost = 0;
      let totalTransactions = 0;

      const costs = await this.db.all(
        `SELECT transaction_type, SUM(amount) as total, COUNT(*) as count
         FROM cost_transactions
         WHERE cost_center = ? AND transaction_date BETWEEN ? AND ?
         GROUP BY transaction_type`,
        [costCenter, startDate, endDate]
      );

      for (const cost of costs) {
        totalTransactions += cost.count || 0;
        switch (cost.transaction_type) {
          case 'LABOR':
            laborCost = cost.total || 0;
            break;
          case 'MATERIAL':
            materialCost = cost.total || 0;
            break;
          case 'OVERHEAD':
            overheadCost = cost.total || 0;
            break;
        }
      }

      const totalCost = laborCost + materialCost + overheadCost;

      return {
        costCenter,
        period,
        laborCost,
        materialCost,
        overheadCost,
        totalCost,
        transactionCount: totalTransactions,
        averageTransaction: totalTransactions > 0 ? totalCost / totalTransactions : 0
      };
    } catch (error) {
      logger.error(
        `Failed to get cost center report for ${costCenter}`,
        error
      );
      return null;
    }
  }

  /**
   * Get all cost transactions for a work order
   */
  async getWorkOrderCosts(workOrderId: string): Promise<CostTransaction[]> {
    try {
      const costs = await this.db.all(
        `SELECT * FROM cost_transactions
         WHERE work_order_id = ?
         ORDER BY transaction_date DESC`,
        [workOrderId]
      );

      return costs.map((cost: any) => ({
        id: cost.id,
        transactionType: cost.transaction_type,
        amount: cost.amount,
        currency: cost.currency,
        workOrderId: cost.work_order_id,
        partNumber: cost.part_number,
        costCenter: cost.cost_center,
        glAccount: cost.gl_account,
        description: cost.description,
        transactionDate: cost.transaction_date,
        createdAt: cost.created_at
      }));
    } catch (error) {
      logger.error(`Failed to get costs for work order ${workOrderId}`, error);
      return [];
    }
  }

  /**
   * Get GL account mapping
   */
  async getGLAccountMapping(): Promise<{ [key: string]: string }> {
    return {
      LABOR: '5100',
      MATERIAL: '5200',
      OVERHEAD: '5300',
      ADJUSTMENT: '5400'
    };
  }

  /**
   * Calculate variance analysis for cost center
   */
  async calculateCostVariance(
    costCenter: string,
    budgetAmount: number,
    startDate: string,
    endDate: string
  ): Promise<{
    budgetAmount: number;
    actualAmount: number;
    variance: number;
    variancePercent: number;
    status: 'UNDER' | 'OVER' | 'ONTRACK';
  }> {
    try {
      const costs = await this.db.all(
        `SELECT SUM(amount) as total FROM cost_transactions
         WHERE cost_center = ? AND transaction_date BETWEEN ? AND ?`,
        [costCenter, startDate, endDate]
      );

      const actualAmount = costs[0]?.total || 0;
      const variance = budgetAmount - actualAmount;
      const variancePercent = budgetAmount > 0 ? (variance / budgetAmount) * 100 : 0;

      let status: 'UNDER' | 'OVER' | 'ONTRACK' = 'ONTRACK';
      if (variance < -100) {
        status = 'OVER'; // Over by more than $100
      } else if (variance > 100) {
        status = 'UNDER'; // Under by more than $100
      }

      return {
        budgetAmount,
        actualAmount,
        variance,
        variancePercent,
        status
      };
    } catch (error) {
      logger.error(`Failed to calculate variance for ${costCenter}`, error);
      return {
        budgetAmount,
        actualAmount: 0,
        variance: budgetAmount,
        variancePercent: 0,
        status: 'ONTRACK'
      };
    }
  }

  /**
   * Batch record cost transactions
   */
  async recordBatchCosts(
    transactions: Array<{
      type: 'LABOR' | 'MATERIAL' | 'OVERHEAD';
      amount: number;
      workOrderId?: string;
      partNumber?: string;
      costCenter: string;
      description?: string;
    }>
  ): Promise<{ success: boolean; transactionCount: number; errors: string[] }> {
    const errors: string[] = [];
    let successCount = 0;
    const now = new Date().toISOString();

    try {
      for (const tx of transactions) {
        try {
          const txId = uuidv4();
          const glMap = await this.getGLAccountMapping();
          const glAccount = glMap[tx.type];

          await this.db.run(
            `INSERT INTO cost_transactions (
              id, transaction_type, amount, currency, work_order_id,
              part_number, cost_center, gl_account, description, transaction_date, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              txId,
              tx.type,
              tx.amount,
              'USD',
              tx.workOrderId || null,
              tx.partNumber || null,
              tx.costCenter,
              glAccount,
              tx.description || `${tx.type} cost: $${tx.amount}`,
              now,
              now
            ]
          );

          successCount++;
        } catch (error) {
          errors.push(
            error instanceof Error ? error.message : 'Unknown error'
          );
        }
      }

      logger.info(`Batch cost recording: ${successCount} succeeded, ${errors.length} failed`);

      return {
        success: errors.length === 0,
        transactionCount: successCount,
        errors
      };
    } catch (error) {
      logger.error('Batch cost recording failed', error);
      return {
        success: false,
        transactionCount: successCount,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Get cost summary statistics
   */
  async getCostSummary(): Promise<{
    totalCosts: number;
    laborTotal: number;
    materialTotal: number;
    overheadTotal: number;
    transactionCount: number;
    averageCost: number;
  }> {
    try {
      const result = await this.db.get(
        `SELECT
          SUM(amount) as total,
          COUNT(*) as count
         FROM cost_transactions`
      );

      const byType = await this.db.all(
        `SELECT transaction_type, SUM(amount) as total FROM cost_transactions
         GROUP BY transaction_type`
      );

      let laborTotal = 0;
      let materialTotal = 0;
      let overheadTotal = 0;

      for (const cost of byType) {
        switch (cost.transaction_type) {
          case 'LABOR':
            laborTotal = cost.total || 0;
            break;
          case 'MATERIAL':
            materialTotal = cost.total || 0;
            break;
          case 'OVERHEAD':
            overheadTotal = cost.total || 0;
            break;
        }
      }

      const totalCosts = result?.total || 0;
      const transactionCount = result?.count || 0;

      return {
        totalCosts,
        laborTotal,
        materialTotal,
        overheadTotal,
        transactionCount,
        averageCost: transactionCount > 0 ? totalCosts / transactionCount : 0
      };
    } catch (error) {
      logger.error('Failed to get cost summary', error);
      return {
        totalCosts: 0,
        laborTotal: 0,
        materialTotal: 0,
        overheadTotal: 0,
        transactionCount: 0,
        averageCost: 0
      };
    }
  }
}
