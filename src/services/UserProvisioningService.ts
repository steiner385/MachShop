import { PrismaClient } from '@prisma/client';
import { SaviyntService } from './SaviyntService';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import {
  SaviyntOperation,
  SaviyntSyncStatus,
  SaviyntSyncType,
  SaviyntEntityType
} from '@prisma/client';

export interface ProvisioningRule {
  id: string;
  name: string;
  description: string;
  triggerEvent: ProvisioningTrigger;
  conditions?: ProvisioningCondition[];
  actions: ProvisioningAction[];
  isActive: boolean;
  priority: number;
}

export enum ProvisioningTrigger {
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_ACTIVATED = 'USER_ACTIVATED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  ROLE_ASSIGNED = 'ROLE_ASSIGNED',
  ROLE_REMOVED = 'ROLE_REMOVED',
  DEPARTMENT_CHANGED = 'DEPARTMENT_CHANGED',
  HIRE_DATE_REACHED = 'HIRE_DATE_REACHED',
  TERMINATION_DATE_REACHED = 'TERMINATION_DATE_REACHED',
  MANUAL_TRIGGER = 'MANUAL_TRIGGER'
}

export interface ProvisioningCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'in' | 'not_in' | 'exists' | 'not_exists';
  value: any;
}

export interface ProvisioningAction {
  type: ProvisioningActionType;
  target: string; // Saviynt, MES, External System
  operation: string;
  parameters: Record<string, any>;
  requiresApproval?: boolean;
  approvers?: string[];
}

export enum ProvisioningActionType {
  PROVISION_USER = 'PROVISION_USER',
  DEPROVISION_USER = 'DEPROVISION_USER',
  UPDATE_USER = 'UPDATE_USER',
  ASSIGN_ROLE = 'ASSIGN_ROLE',
  REMOVE_ROLE = 'REMOVE_ROLE',
  SYNC_ATTRIBUTES = 'SYNC_ATTRIBUTES',
  SEND_NOTIFICATION = 'SEND_NOTIFICATION',
  CREATE_TICKET = 'CREATE_TICKET',
  EXECUTE_WORKFLOW = 'EXECUTE_WORKFLOW'
}

export interface ProvisioningRequest {
  id: string;
  userId: string;
  trigger: ProvisioningTrigger;
  ruleId: string;
  actions: ProvisioningAction[];
  status: ProvisioningRequestStatus;
  priority: number;
  requestedBy: string;
  requestedAt: Date;
  approvals?: ProvisioningApproval[];
  executionLog?: ProvisioningExecutionStep[];
  completedAt?: Date;
  errorMessage?: string;
}

export enum ProvisioningRequestStatus {
  PENDING = 'PENDING',
  AWAITING_APPROVAL = 'AWAITING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export interface ProvisioningApproval {
  id: string;
  requestId: string;
  approverId: string;
  approverName: string;
  status: ApprovalStatus;
  decision?: 'APPROVE' | 'REJECT';
  comments?: string;
  decidedAt?: Date;
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED'
}

export interface ProvisioningExecutionStep {
  stepId: string;
  action: ProvisioningAction;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  errorMessage?: string;
  retryCount: number;
}

export class UserProvisioningService {
  private prisma: PrismaClient;
  private saviyntService: SaviyntService;
  private rules: Map<string, ProvisioningRule> = new Map();
  private activeRequests: Map<string, ProvisioningRequest> = new Map();
  private isEnabled: boolean;

  constructor(prisma: PrismaClient, saviyntService: SaviyntService) {
    this.prisma = prisma;
    this.saviyntService = saviyntService;
    this.isEnabled = config.saviynt.enabled;
  }

  /**
   * Initialize the provisioning service with default rules
   */
  public async initialize(): Promise<void> {
    if (!this.isEnabled) {
      logger.info('User provisioning service is disabled (Saviynt integration disabled)');
      return;
    }

    try {
      await this.loadProvisioningRules();
      await this.schedulePeriodicTasks();
      logger.info('User provisioning service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize user provisioning service', { error });
      throw error;
    }
  }

  /**
   * Load provisioning rules from configuration or database
   */
  private async loadProvisioningRules(): Promise<void> {
    // Default provisioning rules
    const defaultRules: ProvisioningRule[] = [
      {
        id: 'auto-provision-new-user',
        name: 'Auto-provision New User',
        description: 'Automatically provision new users in Saviynt when created in MES',
        triggerEvent: ProvisioningTrigger.USER_CREATED,
        conditions: [
          { field: 'isActive', operator: 'equals', value: true },
          { field: 'email', operator: 'exists', value: null }
        ],
        actions: [
          {
            type: ProvisioningActionType.PROVISION_USER,
            target: 'Saviynt',
            operation: 'createUser',
            parameters: { syncAttributes: true }
          }
        ],
        isActive: true,
        priority: 1
      },
      {
        id: 'auto-sync-user-updates',
        name: 'Auto-sync User Updates',
        description: 'Sync user attribute changes to Saviynt',
        triggerEvent: ProvisioningTrigger.USER_UPDATED,
        conditions: [
          { field: 'isActive', operator: 'equals', value: true }
        ],
        actions: [
          {
            type: ProvisioningActionType.SYNC_ATTRIBUTES,
            target: 'Saviynt',
            operation: 'updateUser',
            parameters: { fields: ['email', 'firstName', 'lastName', 'department', 'phone'] }
          }
        ],
        isActive: true,
        priority: 2
      },
      {
        id: 'auto-deactivate-user',
        name: 'Auto-deactivate User',
        description: 'Deactivate user in Saviynt when deactivated in MES',
        triggerEvent: ProvisioningTrigger.USER_DEACTIVATED,
        actions: [
          {
            type: ProvisioningActionType.DEPROVISION_USER,
            target: 'Saviynt',
            operation: 'disableUser',
            parameters: { retainData: true }
          }
        ],
        isActive: true,
        priority: 1
      },
      {
        id: 'role-assignment-sync',
        name: 'Role Assignment Sync',
        description: 'Sync role assignments to Saviynt',
        triggerEvent: ProvisioningTrigger.ROLE_ASSIGNED,
        conditions: [
          { field: 'isActive', operator: 'equals', value: true }
        ],
        actions: [
          {
            type: ProvisioningActionType.ASSIGN_ROLE,
            target: 'Saviynt',
            operation: 'assignRole',
            parameters: { validatePermissions: true }
          }
        ],
        isActive: true,
        priority: 2
      },
      {
        id: 'privileged-role-approval',
        name: 'Privileged Role Assignment Approval',
        description: 'Require approval for privileged role assignments',
        triggerEvent: ProvisioningTrigger.ROLE_ASSIGNED,
        conditions: [
          { field: 'roleCode', operator: 'in', value: ['ADMIN', 'SECURITY_ADMIN', 'AUDIT_ADMIN'] }
        ],
        actions: [
          {
            type: ProvisioningActionType.ASSIGN_ROLE,
            target: 'Saviynt',
            operation: 'assignRole',
            parameters: { validatePermissions: true },
            requiresApproval: true,
            approvers: ['security-manager', 'it-manager']
          }
        ],
        isActive: true,
        priority: 1
      }
    ];

    for (const rule of defaultRules) {
      this.rules.set(rule.id, rule);
    }

    logger.info(`Loaded ${this.rules.size} provisioning rules`);
  }

  /**
   * Handle user lifecycle event
   */
  public async handleUserEvent(
    userId: string,
    trigger: ProvisioningTrigger,
    userData: any,
    triggeredBy: string
  ): Promise<ProvisioningRequest[]> {
    if (!this.isEnabled) {
      return [];
    }

    try {
      // Find applicable rules
      const applicableRules = await this.findApplicableRules(trigger, userData);

      if (applicableRules.length === 0) {
        logger.debug('No applicable provisioning rules found', { userId, trigger });
        return [];
      }

      // Create provisioning requests
      const requests: ProvisioningRequest[] = [];

      for (const rule of applicableRules) {
        const request = await this.createProvisioningRequest(
          userId,
          trigger,
          rule,
          triggeredBy
        );

        requests.push(request);
        this.activeRequests.set(request.id, request);

        // Execute request (with or without approval)
        await this.processProvisioningRequest(request.id);
      }

      logger.info('Created provisioning requests', {
        userId,
        trigger,
        requestCount: requests.length
      });

      return requests;
    } catch (error) {
      logger.error('Failed to handle user event', { userId, trigger, error });
      throw error;
    }
  }

  /**
   * Find rules that apply to the given trigger and user data
   */
  private async findApplicableRules(
    trigger: ProvisioningTrigger,
    userData: any
  ): Promise<ProvisioningRule[]> {
    const applicableRules: ProvisioningRule[] = [];

    for (const rule of this.rules.values()) {
      if (!rule.isActive || rule.triggerEvent !== trigger) {
        continue;
      }

      // Check conditions
      if (rule.conditions && !this.evaluateConditions(rule.conditions, userData)) {
        continue;
      }

      applicableRules.push(rule);
    }

    // Sort by priority (lower number = higher priority)
    return applicableRules.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Evaluate rule conditions against user data
   */
  private evaluateConditions(conditions: ProvisioningCondition[], userData: any): boolean {
    return conditions.every(condition => {
      const fieldValue = this.getNestedValue(userData, condition.field);

      switch (condition.operator) {
        case 'equals':
          return fieldValue === condition.value;
        case 'not_equals':
          return fieldValue !== condition.value;
        case 'contains':
          return String(fieldValue).includes(String(condition.value));
        case 'not_contains':
          return !String(fieldValue).includes(String(condition.value));
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(fieldValue);
        case 'not_in':
          return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
        case 'exists':
          return fieldValue !== undefined && fieldValue !== null;
        case 'not_exists':
          return fieldValue === undefined || fieldValue === null;
        default:
          return false;
      }
    });
  }

  /**
   * Get nested object value by dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Create a new provisioning request
   */
  private async createProvisioningRequest(
    userId: string,
    trigger: ProvisioningTrigger,
    rule: ProvisioningRule,
    triggeredBy: string
  ): Promise<ProvisioningRequest> {
    const requestId = `prov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const request: ProvisioningRequest = {
      id: requestId,
      userId,
      trigger,
      ruleId: rule.id,
      actions: rule.actions,
      status: ProvisioningRequestStatus.PENDING,
      priority: rule.priority,
      requestedBy: triggeredBy,
      requestedAt: new Date(),
      executionLog: []
    };

    // Check if any actions require approval
    const requiresApproval = rule.actions.some(action => action.requiresApproval);

    if (requiresApproval) {
      request.status = ProvisioningRequestStatus.AWAITING_APPROVAL;
      request.approvals = await this.createApprovalRequests(request, rule);
    }

    return request;
  }

  /**
   * Create approval requests for a provisioning request
   */
  private async createApprovalRequests(
    request: ProvisioningRequest,
    rule: ProvisioningRule
  ): Promise<ProvisioningApproval[]> {
    const approvals: ProvisioningApproval[] = [];

    for (const action of rule.actions) {
      if (action.requiresApproval && action.approvers) {
        for (const approverId of action.approvers) {
          // Get approver details
          const approver = await this.prisma.user.findUnique({
            where: { id: approverId },
            select: { id: true, firstName: true, lastName: true }
          });

          if (approver) {
            approvals.push({
              id: `appr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              requestId: request.id,
              approverId: approver.id,
              approverName: `${approver.firstName} ${approver.lastName}`,
              status: ApprovalStatus.PENDING
            });
          }
        }
      }
    }

    return approvals;
  }

  /**
   * Process a provisioning request
   */
  public async processProvisioningRequest(requestId: string): Promise<void> {
    const request = this.activeRequests.get(requestId);
    if (!request) {
      throw new Error(`Provisioning request not found: ${requestId}`);
    }

    try {
      // Check if approval is required and pending
      if (request.status === ProvisioningRequestStatus.AWAITING_APPROVAL) {
        const allApproved = request.approvals?.every(approval =>
          approval.status === ApprovalStatus.APPROVED
        ) ?? false;

        if (!allApproved) {
          logger.debug('Provisioning request awaiting approval', { requestId });
          return;
        }

        request.status = ProvisioningRequestStatus.APPROVED;
      }

      // Execute actions
      request.status = ProvisioningRequestStatus.IN_PROGRESS;

      for (const action of request.actions) {
        const step: ProvisioningExecutionStep = {
          stepId: `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          action,
          status: 'PENDING',
          retryCount: 0
        };

        request.executionLog!.push(step);

        try {
          await this.executeProvisioningAction(request.userId, action, step);
          step.status = 'COMPLETED';
          step.completedAt = new Date();
        } catch (error) {
          step.status = 'FAILED';
          step.errorMessage = error instanceof Error ? error.message : 'Unknown error';
          step.completedAt = new Date();

          logger.error('Provisioning action failed', {
            requestId,
            action: action.type,
            error: step.errorMessage
          });

          // For critical failures, stop execution
          if (action.type === ProvisioningActionType.PROVISION_USER ||
              action.type === ProvisioningActionType.DEPROVISION_USER) {
            request.status = ProvisioningRequestStatus.FAILED;
            request.errorMessage = step.errorMessage;
            return;
          }
        }
      }

      // Mark as completed
      request.status = ProvisioningRequestStatus.COMPLETED;
      request.completedAt = new Date();

      logger.info('Provisioning request completed', {
        requestId,
        userId: request.userId,
        actionsExecuted: request.actions.length
      });

    } catch (error) {
      request.status = ProvisioningRequestStatus.FAILED;
      request.errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Provisioning request failed', {
        requestId,
        error: request.errorMessage
      });
    } finally {
      // Update request in storage
      this.activeRequests.set(requestId, request);
    }
  }

  /**
   * Execute a specific provisioning action
   */
  private async executeProvisioningAction(
    userId: string,
    action: ProvisioningAction,
    step: ProvisioningExecutionStep
  ): Promise<void> {
    step.status = 'IN_PROGRESS';
    step.startedAt = new Date();

    switch (action.type) {
      case ProvisioningActionType.PROVISION_USER:
        await this.saviyntService.syncUser(userId, SaviyntOperation.PROVISION, 'auto-provisioning');
        break;

      case ProvisioningActionType.DEPROVISION_USER:
        await this.saviyntService.syncUser(userId, SaviyntOperation.DEPROVISION, 'auto-provisioning');
        break;

      case ProvisioningActionType.UPDATE_USER:
      case ProvisioningActionType.SYNC_ATTRIBUTES:
        await this.saviyntService.syncUser(userId, SaviyntOperation.SYNC, 'auto-provisioning');
        break;

      case ProvisioningActionType.ASSIGN_ROLE:
        await this.handleRoleAssignment(userId, action.parameters);
        break;

      case ProvisioningActionType.REMOVE_ROLE:
        await this.handleRoleRemoval(userId, action.parameters);
        break;

      case ProvisioningActionType.SEND_NOTIFICATION:
        await this.sendNotification(userId, action.parameters);
        break;

      case ProvisioningActionType.CREATE_TICKET:
        await this.createServiceTicket(userId, action.parameters);
        break;

      default:
        throw new Error(`Unsupported action type: ${action.type}`);
    }
  }

  /**
   * Handle role assignment
   */
  private async handleRoleAssignment(userId: string, parameters: any): Promise<void> {
    // This would integrate with the role assignment logic
    // For now, just log the action
    logger.info('Role assignment requested', { userId, parameters });
  }

  /**
   * Handle role removal
   */
  private async handleRoleRemoval(userId: string, parameters: any): Promise<void> {
    // This would integrate with the role removal logic
    // For now, just log the action
    logger.info('Role removal requested', { userId, parameters });
  }

  /**
   * Send notification
   */
  private async sendNotification(userId: string, parameters: any): Promise<void> {
    // This would integrate with the notification service
    logger.info('Notification sent', { userId, parameters });
  }

  /**
   * Create service ticket
   */
  private async createServiceTicket(userId: string, parameters: any): Promise<void> {
    // This would integrate with the ticketing system
    logger.info('Service ticket created', { userId, parameters });
  }

  /**
   * Schedule periodic tasks (cleanup, monitoring, etc.)
   */
  private async schedulePeriodicTasks(): Promise<void> {
    // Clean up completed requests older than 30 days
    setInterval(async () => {
      const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      for (const [requestId, request] of this.activeRequests.entries()) {
        if (request.completedAt && request.completedAt < cutoffDate) {
          this.activeRequests.delete(requestId);
        }
      }
    }, 24 * 60 * 60 * 1000); // Daily cleanup

    logger.info('Scheduled periodic tasks for user provisioning service');
  }

  /**
   * Get provisioning statistics
   */
  public getProvisioningStatistics() {
    const requests = Array.from(this.activeRequests.values());

    const statusCounts = requests.reduce((acc, req) => {
      acc[req.status] = (acc[req.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const triggerCounts = requests.reduce((acc, req) => {
      acc[req.trigger] = (acc[req.trigger] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalRequests: requests.length,
      statusBreakdown: statusCounts,
      triggerBreakdown: triggerCounts,
      activeRules: this.rules.size,
      averageProcessingTime: this.calculateAverageProcessingTime(requests)
    };
  }

  /**
   * Calculate average processing time for completed requests
   */
  private calculateAverageProcessingTime(requests: ProvisioningRequest[]): number {
    const completedRequests = requests.filter(req =>
      req.status === ProvisioningRequestStatus.COMPLETED &&
      req.completedAt
    );

    if (completedRequests.length === 0) return 0;

    const totalTime = completedRequests.reduce((sum, req) => {
      const processingTime = req.completedAt!.getTime() - req.requestedAt.getTime();
      return sum + processingTime;
    }, 0);

    return totalTime / completedRequests.length; // Average in milliseconds
  }

  /**
   * Get active provisioning requests
   */
  public getActiveRequests(): ProvisioningRequest[] {
    return Array.from(this.activeRequests.values());
  }

  /**
   * Approve a provisioning request
   */
  public async approveRequest(
    requestId: string,
    approverId: string,
    comments?: string
  ): Promise<void> {
    const request = this.activeRequests.get(requestId);
    if (!request) {
      throw new Error(`Provisioning request not found: ${requestId}`);
    }

    const approval = request.approvals?.find(appr => appr.approverId === approverId);
    if (!approval) {
      throw new Error(`Approval not found for approver: ${approverId}`);
    }

    approval.status = ApprovalStatus.APPROVED;
    approval.decision = 'APPROVE';
    approval.comments = comments;
    approval.decidedAt = new Date();

    logger.info('Provisioning request approved', {
      requestId,
      approverId,
      comments
    });

    // Check if all approvals are complete and process request
    await this.processProvisioningRequest(requestId);
  }

  /**
   * Reject a provisioning request
   */
  public async rejectRequest(
    requestId: string,
    approverId: string,
    comments: string
  ): Promise<void> {
    const request = this.activeRequests.get(requestId);
    if (!request) {
      throw new Error(`Provisioning request not found: ${requestId}`);
    }

    const approval = request.approvals?.find(appr => appr.approverId === approverId);
    if (!approval) {
      throw new Error(`Approval not found for approver: ${approverId}`);
    }

    approval.status = ApprovalStatus.REJECTED;
    approval.decision = 'REJECT';
    approval.comments = comments;
    approval.decidedAt = new Date();

    request.status = ProvisioningRequestStatus.REJECTED;

    logger.info('Provisioning request rejected', {
      requestId,
      approverId,
      comments
    });
  }
}