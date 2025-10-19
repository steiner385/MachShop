/**
 * Work Order State Machine Service
 * Manages work order state transitions with validation
 *
 * State Flow:
 * CREATED → RELEASED → IN_PROGRESS → COMPLETED
 *         ↓                        ↓
 *    CANCELLED ←─────────────── CANCELLED
 */

import { WorkOrderStatus } from '../types';

export interface StateTransition {
  from: WorkOrderStatus;
  to: WorkOrderStatus;
  event: string;
  validatePrerequisites?: (workOrder: any) => { valid: boolean; reason?: string };
}

export class StateMachineService {
  private transitions: Map<string, StateTransition[]>;

  constructor() {
    this.transitions = new Map();
    this.initializeTransitions();
  }

  /**
   * Initialize valid state transitions
   */
  private initializeTransitions(): void {
    const allTransitions: StateTransition[] = [
      // CREATED state transitions
      {
        from: WorkOrderStatus.CREATED,
        to: WorkOrderStatus.RELEASED,
        event: 'RELEASE',
        validatePrerequisites: (workOrder) => {
          if (!workOrder.partId) {
            return { valid: false, reason: 'Part information is required before release' };
          }
          if (!workOrder.routeId) {
            return { valid: false, reason: 'Manufacturing route is required before release' };
          }
          return { valid: true };
        }
      },
      {
        from: WorkOrderStatus.CREATED,
        to: WorkOrderStatus.CANCELLED,
        event: 'CANCEL',
        validatePrerequisites: (workOrder) => {
          if (workOrder.quantityCompleted > 0) {
            return { valid: false, reason: 'Cannot cancel work order with completed quantities' };
          }
          return { valid: true };
        }
      },

      // RELEASED state transitions
      {
        from: WorkOrderStatus.RELEASED,
        to: WorkOrderStatus.IN_PROGRESS,
        event: 'START',
        validatePrerequisites: (workOrder) => {
          if (!workOrder.operations || workOrder.operations.length === 0) {
            return { valid: false, reason: 'Work order must have operations before starting' };
          }
          return { valid: true };
        }
      },
      {
        from: WorkOrderStatus.RELEASED,
        to: WorkOrderStatus.CANCELLED,
        event: 'CANCEL',
        validatePrerequisites: (workOrder) => {
          if (workOrder.quantityCompleted > 0) {
            return { valid: false, reason: 'Cannot cancel work order with completed quantities' };
          }
          return { valid: true };
        }
      },

      // IN_PROGRESS state transitions
      {
        from: WorkOrderStatus.IN_PROGRESS,
        to: WorkOrderStatus.COMPLETED,
        event: 'COMPLETE',
        validatePrerequisites: (workOrder) => {
          if (workOrder.quantityCompleted === 0) {
            return { valid: false, reason: 'Cannot complete work order with zero completed quantity' };
          }
          if (workOrder.quantityCompleted < workOrder.quantityOrdered) {
            return {
              valid: false,
              reason: `Completed quantity (${workOrder.quantityCompleted}) is less than ordered quantity (${workOrder.quantityOrdered})`
            };
          }
          return { valid: true };
        }
      },
      {
        from: WorkOrderStatus.IN_PROGRESS,
        to: WorkOrderStatus.CANCELLED,
        event: 'CANCEL',
        validatePrerequisites: (workOrder) => {
          // IN_PROGRESS work orders can be cancelled, but warn if quantities exist
          if (workOrder.quantityCompleted > 0) {
            return {
              valid: false,
              reason: 'Cannot cancel in-progress work order with completed quantities. Consider completing instead.'
            };
          }
          return { valid: true };
        }
      },

      // COMPLETED state transitions (none - terminal state)
      // CANCELLED state transitions (none - terminal state)
    ];

    // Build transition map for quick lookup
    allTransitions.forEach(transition => {
      const key = this.getTransitionKey(transition.from, transition.event);
      const existing = this.transitions.get(key) || [];
      existing.push(transition);
      this.transitions.set(key, existing);
    });
  }

  /**
   * Get transition key for lookup
   */
  private getTransitionKey(from: WorkOrderStatus, event: string): string {
    return `${from}:${event}`;
  }

  /**
   * Validates if a state transition is allowed
   */
  public canTransition(
    currentStatus: WorkOrderStatus,
    event: string,
    workOrder?: any
  ): { allowed: boolean; targetStatus?: WorkOrderStatus; reason?: string } {
    const key = this.getTransitionKey(currentStatus, event);
    const transitions = this.transitions.get(key);

    if (!transitions || transitions.length === 0) {
      return {
        allowed: false,
        reason: `Invalid transition: cannot ${event} from ${currentStatus} state`
      };
    }

    // For simplicity, use the first matching transition
    const transition = transitions[0];

    // Validate prerequisites if provided
    if (transition.validatePrerequisites && workOrder) {
      const prerequisiteCheck = transition.validatePrerequisites(workOrder);
      if (!prerequisiteCheck.valid) {
        return {
          allowed: false,
          reason: prerequisiteCheck.reason
        };
      }
    }

    return {
      allowed: true,
      targetStatus: transition.to
    };
  }

  /**
   * Get all valid transitions from current state
   */
  public getValidTransitions(currentStatus: WorkOrderStatus): string[] {
    const validEvents: string[] = [];
    const events = ['RELEASE', 'START', 'COMPLETE', 'CANCEL'];

    events.forEach(event => {
      const result = this.canTransition(currentStatus, event);
      if (result.allowed) {
        validEvents.push(event);
      }
    });

    return validEvents;
  }

  /**
   * Execute state transition
   */
  public transition(
    currentStatus: WorkOrderStatus,
    event: string,
    workOrder?: any
  ): { success: boolean; newStatus?: WorkOrderStatus; reason?: string } {
    const canTransitionResult = this.canTransition(currentStatus, event, workOrder);

    if (!canTransitionResult.allowed) {
      return {
        success: false,
        reason: canTransitionResult.reason
      };
    }

    return {
      success: true,
      newStatus: canTransitionResult.targetStatus
    };
  }

  /**
   * Check if status is terminal (no further transitions possible)
   */
  public isTerminalState(status: WorkOrderStatus): boolean {
    return status === WorkOrderStatus.COMPLETED || status === WorkOrderStatus.CANCELLED;
  }

  /**
   * Get human-readable state name
   */
  public getStateName(status: WorkOrderStatus): string {
    const names: Record<WorkOrderStatus, string> = {
      [WorkOrderStatus.CREATED]: 'Created',
      [WorkOrderStatus.RELEASED]: 'Released to Production',
      [WorkOrderStatus.IN_PROGRESS]: 'In Progress',
      [WorkOrderStatus.COMPLETED]: 'Completed',
      [WorkOrderStatus.CANCELLED]: 'Cancelled'
    };

    return names[status] || status;
  }

  /**
   * Get state description
   */
  public getStateDescription(status: WorkOrderStatus): string {
    const descriptions: Record<WorkOrderStatus, string> = {
      [WorkOrderStatus.CREATED]: 'Work order created, awaiting release to production',
      [WorkOrderStatus.RELEASED]: 'Released to production floor, ready to start',
      [WorkOrderStatus.IN_PROGRESS]: 'Production in progress',
      [WorkOrderStatus.COMPLETED]: 'All operations completed',
      [WorkOrderStatus.CANCELLED]: 'Work order cancelled'
    };

    return descriptions[status] || 'Unknown status';
  }
}

/**
 * Export singleton instance
 */
export const stateMachine = new StateMachineService();
