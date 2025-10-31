/**
 * Oracle EBS Surrogate - Workflow Service
 * Manages work order status transitions and state machine validation
 */

import { DatabaseService } from './database.service';
import { Logger } from '../utils/logger';
import { WorkOrderStatus } from '../models/types';

const logger = Logger.getInstance();

export interface StateTransition {
  from: WorkOrderStatus;
  to: WorkOrderStatus;
  allowed: boolean;
}

export class WorkflowService {
  private static instance: WorkflowService;
  private db: DatabaseService;

  // Define valid state transitions
  private readonly validTransitions: Map<WorkOrderStatus, WorkOrderStatus[]> = new Map([
    [WorkOrderStatus.RELEASED, [WorkOrderStatus.IN_PROCESS, WorkOrderStatus.CLOSED]],
    [WorkOrderStatus.IN_PROCESS, [WorkOrderStatus.COMPLETED, WorkOrderStatus.RELEASED]],
    [WorkOrderStatus.COMPLETED, [WorkOrderStatus.CLOSED]],
    [WorkOrderStatus.CLOSED, []] // Terminal state
  ]);

  private constructor() {
    this.db = DatabaseService.getInstance();
  }

  static getInstance(): WorkflowService {
    if (!WorkflowService.instance) {
      WorkflowService.instance = new WorkflowService();
    }
    return WorkflowService.instance;
  }

  /**
   * Check if a status transition is valid
   */
  isValidTransition(fromStatus: WorkOrderStatus, toStatus: WorkOrderStatus): boolean {
    const allowedTransitions = this.validTransitions.get(fromStatus) || [];
    return allowedTransitions.includes(toStatus);
  }

  /**
   * Get allowed transitions for a given status
   */
  getAllowedTransitions(status: WorkOrderStatus): WorkOrderStatus[] {
    return this.validTransitions.get(status) || [];
  }

  /**
   * Transition a work order to a new status with validation
   */
  async transitionWorkOrder(
    workOrderId: string,
    newStatus: WorkOrderStatus
  ): Promise<{ success: boolean; error?: string; workOrder?: any }> {
    try {
      // Get current work order
      const workOrder = await this.db.get(
        'SELECT * FROM work_orders WHERE id = ?',
        [workOrderId]
      );

      if (!workOrder) {
        return {
          success: false,
          error: 'Work order not found'
        };
      }

      const currentStatus = workOrder.status as WorkOrderStatus;

      // Validate transition
      if (!this.isValidTransition(currentStatus, newStatus)) {
        const allowed = this.getAllowedTransitions(currentStatus);
        return {
          success: false,
          error: `Invalid transition from ${currentStatus} to ${newStatus}. Allowed: ${allowed.join(', ')}`
        };
      }

      // Update status
      const now = new Date().toISOString();
      await this.db.run(
        'UPDATE work_orders SET status = ?, updated_at = ? WHERE id = ?',
        [newStatus, now, workOrderId]
      );

      // Log transition
      const transitionId = require('uuid').v4();
      await this.db.run(
        `INSERT INTO work_order_transitions (
          id, work_order_id, from_status, to_status, transition_date, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [transitionId, workOrderId, currentStatus, newStatus, now, now]
      );

      logger.info(`Work order ${workOrderId} transitioned from ${currentStatus} to ${newStatus}`);

      const updated = await this.db.get('SELECT * FROM work_orders WHERE id = ?', [
        workOrderId
      ]);

      return {
        success: true,
        workOrder: updated
      };
    } catch (error) {
      logger.error('Failed to transition work order', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get transition history for a work order
   */
  async getTransitionHistory(workOrderId: string): Promise<any[]> {
    try {
      return await this.db.all(
        `SELECT * FROM work_order_transitions
         WHERE work_order_id = ?
         ORDER BY transition_date DESC`,
        [workOrderId]
      );
    } catch (error) {
      logger.error('Failed to get transition history', error);
      return [];
    }
  }

  /**
   * Get current status of a work order
   */
  async getWorkOrderStatus(workOrderId: string): Promise<WorkOrderStatus | null> {
    try {
      const wo = await this.db.get('SELECT status FROM work_orders WHERE id = ?', [
        workOrderId
      ]);
      return wo?.status || null;
    } catch (error) {
      logger.error('Failed to get work order status', error);
      return null;
    }
  }

  /**
   * Bulk get allowed transitions for multiple work orders
   */
  async getAvailableTransitions(workOrderIds: string[]): Promise<Map<string, WorkOrderStatus[]>> {
    const result = new Map<string, WorkOrderStatus[]>();

    try {
      for (const id of workOrderIds) {
        const status = await this.getWorkOrderStatus(id);
        if (status) {
          result.set(id, this.getAllowedTransitions(status));
        }
      }
    } catch (error) {
      logger.error('Failed to get available transitions', error);
    }

    return result;
  }
}
