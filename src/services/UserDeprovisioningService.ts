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

export interface DeprovisioningRule {
  id: string;
  name: string;
  description: string;
  triggerEvent: DeprovisioningTrigger;
  conditions?: DeprovisioningCondition[];
  actions: DeprovisioningAction[];
  isActive: boolean;
  priority: number;
  gracePeriodDays?: number; // Days before actual deprovisioning
  dataRetentionDays?: number; // Days to retain user data
}

export enum DeprovisioningTrigger {
  USER_TERMINATION = 'USER_TERMINATION',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  TERMINATION_DATE_REACHED = 'TERMINATION_DATE_REACHED',
  ROLE_VIOLATION = 'ROLE_VIOLATION',
  COMPLIANCE_VIOLATION = 'COMPLIANCE_VIOLATION',
  MANUAL_DEPROVISION = 'MANUAL_DEPROVISION',
  DORMANT_ACCOUNT = 'DORMANT_ACCOUNT',
  SECURITY_INCIDENT = 'SECURITY_INCIDENT',
  EMERGENCY_DISABLE = 'EMERGENCY_DISABLE'
}

export interface DeprovisioningCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'in' | 'not_in' | 'exists' | 'not_exists' | 'greater_than' | 'less_than';
  value: any;
}

export interface DeprovisioningAction {
  type: DeprovisioningActionType;
  target: string;
  operation: string;
  parameters: Record<string, any>;
  executeAfterDays?: number; // Execute after X days from trigger
  requiresApproval?: boolean;
  approvers?: string[];
  isReversible?: boolean;
}

export enum DeprovisioningActionType {
  DISABLE_USER_ACCOUNT = 'DISABLE_USER_ACCOUNT',
  REVOKE_ALL_ACCESS = 'REVOKE_ALL_ACCESS',
  REVOKE_SPECIFIC_ROLES = 'REVOKE_SPECIFIC_ROLES',
  TRANSFER_OWNERSHIP = 'TRANSFER_OWNERSHIP',
  BACKUP_USER_DATA = 'BACKUP_USER_DATA',
  DELETE_USER_DATA = 'DELETE_USER_DATA',
  NOTIFY_STAKEHOLDERS = 'NOTIFY_STAKEHOLDERS',
  CREATE_AUDIT_REPORT = 'CREATE_AUDIT_REPORT',
  DISABLE_SAVIYNT_ACCOUNT = 'DISABLE_SAVIYNT_ACCOUNT',
  ARCHIVE_USER_PROFILE = 'ARCHIVE_USER_PROFILE',
  RESET_PASSWORDS = 'RESET_PASSWORDS',
  CLOSE_SERVICE_TICKETS = 'CLOSE_SERVICE_TICKETS',
  UPDATE_SECURITY_GROUPS = 'UPDATE_SECURITY_GROUPS'
}

export interface DeprovisioningRequest {
  id: string;
  userId: string;
  trigger: DeprovisioningTrigger;
  ruleId: string;
  actions: DeprovisioningScheduledAction[];
  status: DeprovisioningRequestStatus;
  priority: number;
  requestedBy: string;
  requestedAt: Date;
  scheduledStartDate?: Date;
  gracePeriodEndDate?: Date;
  approvals?: DeprovisioningApproval[];
  executionLog?: DeprovisioningExecutionStep[];
  completedAt?: Date;
  errorMessage?: string;
  reversalRequested?: boolean;
  reversalApprovedBy?: string;
  reversalCompletedAt?: Date;
}

export interface DeprovisioningScheduledAction extends DeprovisioningAction {
  scheduledFor: Date;
  executed: boolean;
  executedAt?: Date;
}

export enum DeprovisioningRequestStatus {
  PENDING = 'PENDING',
  IN_GRACE_PERIOD = 'IN_GRACE_PERIOD',
  AWAITING_APPROVAL = 'AWAITING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REVERSED = 'REVERSED'
}

export interface DeprovisioningApproval {
  id: string;
  requestId: string;
  approverId: string;
  approverName: string;
  actionType: DeprovisioningActionType;
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

export interface DeprovisioningExecutionStep {
  stepId: string;
  action: DeprovisioningAction;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'SKIPPED' | 'REVERSED';
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  errorMessage?: string;
  retryCount: number;
  reversalData?: any; // Data needed to reverse the action
}

export interface UserBackupData {
  userId: string;
  userData: any;
  roleData: any[];
  accessData: any[];
  systemAccounts: any[];
  backupDate: Date;
  retentionUntil: Date;
}

export class UserDeprovisioningService {
  private prisma: PrismaClient;
  private saviyntService: SaviyntService;
  private rules: Map<string, DeprovisioningRule> = new Map();
  private activeRequests: Map<string, DeprovisioningRequest> = new Map();
  private scheduledActions: Map<string, NodeJS.Timeout> = new Map();
  private isEnabled: boolean;

  constructor(prisma: PrismaClient, saviyntService: SaviyntService) {
    this.prisma = prisma;
    this.saviyntService = saviyntService;
    this.isEnabled = config.saviynt.enabled;
  }

  /**
   * Initialize the deprovisioning service
   */
  public async initialize(): Promise<void> {
    if (!this.isEnabled) {
      logger.info('User deprovisioning service is disabled (Saviynt integration disabled)');
      return;
    }

    try {
      await this.loadDeprovisioningRules();
      await this.loadPendingRequests();
      await this.schedulePeriodicTasks();
      logger.info('User deprovisioning service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize user deprovisioning service', { error });
      throw error;
    }
  }

  /**
   * Load deprovisioning rules
   */
  private async loadDeprovisioningRules(): Promise<void> {
    const defaultRules: DeprovisioningRule[] = [
      {
        id: 'immediate-security-disable',
        name: 'Immediate Security Disable',
        description: 'Immediately disable user for security incidents',
        triggerEvent: DeprovisioningTrigger.SECURITY_INCIDENT,
        actions: [
          {
            type: DeprovisioningActionType.DISABLE_USER_ACCOUNT,
            target: 'MES',
            operation: 'disableUser',
            parameters: { immediate: true },
            executeAfterDays: 0,
            isReversible: true
          },
          {
            type: DeprovisioningActionType.DISABLE_SAVIYNT_ACCOUNT,
            target: 'Saviynt',
            operation: 'disableUser',
            parameters: { immediate: true },
            executeAfterDays: 0,
            isReversible: true
          },
          {
            type: DeprovisioningActionType.REVOKE_ALL_ACCESS,
            target: 'All Systems',
            operation: 'revokeAccess',
            parameters: { scope: 'all' },
            executeAfterDays: 0,
            isReversible: true
          },
          {
            type: DeprovisioningActionType.NOTIFY_STAKEHOLDERS,
            target: 'Notification',
            operation: 'sendAlert',
            parameters: {
              recipients: ['security-team', 'it-manager'],
              priority: 'HIGH',
              reason: 'security-incident'
            },
            executeAfterDays: 0
          }
        ],
        isActive: true,
        priority: 1
      },
      {
        id: 'standard-termination',
        name: 'Standard Employee Termination',
        description: 'Standard deprovisioning process for employee termination',
        triggerEvent: DeprovisioningTrigger.USER_TERMINATION,
        gracePeriodDays: 1, // 1 day grace period
        dataRetentionDays: 90, // Retain data for 90 days
        actions: [
          {
            type: DeprovisioningActionType.NOTIFY_STAKEHOLDERS,
            target: 'Notification',
            operation: 'sendNotification',
            parameters: {
              recipients: ['manager', 'hr', 'it-team'],
              template: 'termination-notification'
            },
            executeAfterDays: 0
          },
          {
            type: DeprovisioningActionType.BACKUP_USER_DATA,
            target: 'DataBackup',
            operation: 'backupUserData',
            parameters: { includePersonalFiles: true },
            executeAfterDays: 0
          },
          {
            type: DeprovisioningActionType.TRANSFER_OWNERSHIP,
            target: 'MES',
            operation: 'transferOwnership',
            parameters: { transferTo: 'manager' },
            executeAfterDays: 1,
            requiresApproval: true,
            approvers: ['manager', 'hr-manager']
          },
          {
            type: DeprovisioningActionType.DISABLE_USER_ACCOUNT,
            target: 'MES',
            operation: 'disableUser',
            parameters: { retainProfile: true },
            executeAfterDays: 1,
            isReversible: true
          },
          {
            type: DeprovisioningActionType.DISABLE_SAVIYNT_ACCOUNT,
            target: 'Saviynt',
            operation: 'disableUser',
            parameters: { retainProfile: true },
            executeAfterDays: 1,
            isReversible: true
          },
          {
            type: DeprovisioningActionType.REVOKE_ALL_ACCESS,
            target: 'All Systems',
            operation: 'revokeAccess',
            parameters: { graceful: true },
            executeAfterDays: 1,
            isReversible: true
          },
          {
            type: DeprovisioningActionType.ARCHIVE_USER_PROFILE,
            target: 'MES',
            operation: 'archiveProfile',
            parameters: { retentionDays: 90 },
            executeAfterDays: 30
          },
          {
            type: DeprovisioningActionType.DELETE_USER_DATA,
            target: 'All Systems',
            operation: 'deletePersonalData',
            parameters: { keepAuditLogs: true },
            executeAfterDays: 90,
            requiresApproval: true,
            approvers: ['data-protection-officer']
          }
        ],
        isActive: true,
        priority: 2
      },
      {
        id: 'dormant-account-cleanup',
        name: 'Dormant Account Cleanup',
        description: 'Clean up accounts that have been inactive for extended periods',
        triggerEvent: DeprovisioningTrigger.DORMANT_ACCOUNT,
        conditions: [
          { field: 'lastLoginAt', operator: 'less_than', value: 90 }, // 90 days
          { field: 'isActive', operator: 'equals', value: true }
        ],
        gracePeriodDays: 7,
        actions: [
          {
            type: DeprovisioningActionType.NOTIFY_STAKEHOLDERS,
            target: 'Notification',
            operation: 'sendWarning',
            parameters: {
              recipients: ['user', 'manager'],
              template: 'dormant-account-warning'
            },
            executeAfterDays: 0
          },
          {
            type: DeprovisioningActionType.DISABLE_USER_ACCOUNT,
            target: 'MES',
            operation: 'disableUser',
            parameters: { reason: 'dormant' },
            executeAfterDays: 7,
            isReversible: true
          },
          {
            type: DeprovisioningActionType.DISABLE_SAVIYNT_ACCOUNT,
            target: 'Saviynt',
            operation: 'disableUser',
            parameters: { reason: 'dormant' },
            executeAfterDays: 7,
            isReversible: true
          }
        ],
        isActive: true,
        priority: 3
      },
      {
        id: 'compliance-violation-response',
        name: 'Compliance Violation Response',
        description: 'Respond to compliance violations with appropriate access restrictions',
        triggerEvent: DeprovisioningTrigger.COMPLIANCE_VIOLATION,
        actions: [
          {
            type: DeprovisioningActionType.REVOKE_SPECIFIC_ROLES,
            target: 'MES',
            operation: 'revokeRoles',
            parameters: { roleTypes: ['privileged', 'administrative'] },
            executeAfterDays: 0,
            requiresApproval: true,
            approvers: ['compliance-officer', 'security-manager'],
            isReversible: true
          },
          {
            type: DeprovisioningActionType.CREATE_AUDIT_REPORT,
            target: 'Audit',
            operation: 'generateReport',
            parameters: { reportType: 'compliance-violation' },
            executeAfterDays: 0
          },
          {
            type: DeprovisioningActionType.NOTIFY_STAKEHOLDERS,
            target: 'Notification',
            operation: 'sendAlert',
            parameters: {
              recipients: ['compliance-team', 'legal', 'security-team'],
              priority: 'HIGH'
            },
            executeAfterDays: 0
          }
        ],
        isActive: true,
        priority: 1
      }
    ];

    for (const rule of defaultRules) {
      this.rules.set(rule.id, rule);
    }

    logger.info(`Loaded ${this.rules.size} deprovisioning rules`);
  }

  /**
   * Load pending deprovisioning requests from storage
   */
  private async loadPendingRequests(): Promise<void> {
    // In a real implementation, this would load from the database
    // For now, we'll start with an empty state
    logger.info('Loaded pending deprovisioning requests');
  }

  /**
   * Handle user deprovisioning event
   */
  public async handleDeprovisioningEvent(
    userId: string,
    trigger: DeprovisioningTrigger,
    userData: any,
    triggeredBy: string,
    reason?: string
  ): Promise<DeprovisioningRequest[]> {
    if (!this.isEnabled) {
      return [];
    }

    try {
      // Find applicable rules
      const applicableRules = await this.findApplicableRules(trigger, userData);

      if (applicableRules.length === 0) {
        logger.debug('No applicable deprovisioning rules found', { userId, trigger });
        return [];
      }

      // Create deprovisioning requests
      const requests: DeprovisioningRequest[] = [];

      for (const rule of applicableRules) {
        const request = await this.createDeprovisioningRequest(
          userId,
          trigger,
          rule,
          triggeredBy,
          reason
        );

        requests.push(request);
        this.activeRequests.set(request.id, request);

        // Schedule the deprovisioning process
        await this.scheduleDeprovisioningRequest(request.id);
      }

      logger.info('Created deprovisioning requests', {
        userId,
        trigger,
        requestCount: requests.length,
        reason
      });

      return requests;
    } catch (error) {
      logger.error('Failed to handle deprovisioning event', { userId, trigger, error });
      throw error;
    }
  }

  /**
   * Find applicable rules for the trigger and user data
   */
  private async findApplicableRules(
    trigger: DeprovisioningTrigger,
    userData: any
  ): Promise<DeprovisioningRule[]> {
    const applicableRules: DeprovisioningRule[] = [];

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
  private evaluateConditions(conditions: DeprovisioningCondition[], userData: any): boolean {
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
        case 'greater_than':
          return Number(fieldValue) > Number(condition.value);
        case 'less_than':
          return Number(fieldValue) < Number(condition.value);
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
   * Create a new deprovisioning request
   */
  private async createDeprovisioningRequest(
    userId: string,
    trigger: DeprovisioningTrigger,
    rule: DeprovisioningRule,
    triggeredBy: string,
    reason?: string
  ): Promise<DeprovisioningRequest> {
    const requestId = `deprov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    // Calculate scheduled dates for actions
    const scheduledActions: DeprovisioningScheduledAction[] = rule.actions.map(action => {
      const scheduledFor = new Date(now.getTime() + (action.executeAfterDays || 0) * 24 * 60 * 60 * 1000);
      return {
        ...action,
        scheduledFor,
        executed: false
      };
    });

    const request: DeprovisioningRequest = {
      id: requestId,
      userId,
      trigger,
      ruleId: rule.id,
      actions: scheduledActions,
      status: DeprovisioningRequestStatus.PENDING,
      priority: rule.priority,
      requestedBy: triggeredBy,
      requestedAt: now,
      executionLog: []
    };

    // Set grace period if applicable
    if (rule.gracePeriodDays && rule.gracePeriodDays > 0) {
      request.gracePeriodEndDate = new Date(now.getTime() + rule.gracePeriodDays * 24 * 60 * 60 * 1000);
      request.status = DeprovisioningRequestStatus.IN_GRACE_PERIOD;
    }

    // Check if any actions require approval
    const requiresApproval = rule.actions.some(action => action.requiresApproval);
    if (requiresApproval) {
      request.approvals = await this.createApprovalRequests(request, rule);
      if (request.status === DeprovisioningRequestStatus.PENDING) {
        request.status = DeprovisioningRequestStatus.AWAITING_APPROVAL;
      }
    }

    return request;
  }

  /**
   * Create approval requests for actions that require approval
   */
  private async createApprovalRequests(
    request: DeprovisioningRequest,
    rule: DeprovisioningRule
  ): Promise<DeprovisioningApproval[]> {
    const approvals: DeprovisioningApproval[] = [];

    for (const action of rule.actions) {
      if (action.requiresApproval && action.approvers) {
        for (const approverId of action.approvers) {
          const approver = await this.prisma.user.findUnique({
            where: { id: approverId },
            select: { id: true, firstName: true, lastName: true }
          });

          if (approver) {
            approvals.push({
              id: `deprov-appr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              requestId: request.id,
              approverId: approver.id,
              approverName: `${approver.firstName} ${approver.lastName}`,
              actionType: action.type,
              status: ApprovalStatus.PENDING
            });
          }
        }
      }
    }

    return approvals;
  }

  /**
   * Schedule a deprovisioning request for execution
   */
  private async scheduleDeprovisioningRequest(requestId: string): Promise<void> {
    const request = this.activeRequests.get(requestId);
    if (!request) {
      throw new Error(`Deprovisioning request not found: ${requestId}`);
    }

    // Schedule immediate actions
    const immediateActions = request.actions.filter(action =>
      action.executeAfterDays === 0 &&
      !action.executed &&
      !action.requiresApproval
    );

    if (immediateActions.length > 0) {
      await this.executeScheduledActions(requestId, immediateActions);
    }

    // Schedule future actions
    for (const action of request.actions) {
      if (!action.executed && action.executeAfterDays! > 0) {
        const delay = action.scheduledFor.getTime() - Date.now();

        if (delay > 0) {
          const timeoutId = setTimeout(async () => {
            await this.executeScheduledAction(requestId, action);
          }, delay);

          this.scheduledActions.set(`${requestId}-${action.type}`, timeoutId);
        }
      }
    }

    logger.info('Scheduled deprovisioning request', {
      requestId,
      totalActions: request.actions.length,
      immediateActions: immediateActions.length
    });
  }

  /**
   * Execute scheduled actions for a deprovisioning request
   */
  private async executeScheduledActions(
    requestId: string,
    actions: DeprovisioningScheduledAction[]
  ): Promise<void> {
    const request = this.activeRequests.get(requestId);
    if (!request) {
      throw new Error(`Deprovisioning request not found: ${requestId}`);
    }

    request.status = DeprovisioningRequestStatus.IN_PROGRESS;

    for (const action of actions) {
      await this.executeScheduledAction(requestId, action);
    }

    // Check if all actions are completed
    const allCompleted = request.actions.every(action => action.executed);
    if (allCompleted) {
      request.status = DeprovisioningRequestStatus.COMPLETED;
      request.completedAt = new Date();

      logger.info('Deprovisioning request completed', {
        requestId,
        userId: request.userId,
        totalActions: request.actions.length
      });
    }
  }

  /**
   * Execute a single scheduled action
   */
  private async executeScheduledAction(
    requestId: string,
    action: DeprovisioningScheduledAction
  ): Promise<void> {
    const request = this.activeRequests.get(requestId);
    if (!request) {
      throw new Error(`Deprovisioning request not found: ${requestId}`);
    }

    // Check approval status if required
    if (action.requiresApproval) {
      const actionApprovals = request.approvals?.filter(approval =>
        approval.actionType === action.type
      ) || [];

      const allApproved = actionApprovals.length > 0 &&
        actionApprovals.every(approval => approval.status === ApprovalStatus.APPROVED);

      if (!allApproved) {
        logger.debug('Skipping action pending approval', {
          requestId,
          actionType: action.type
        });
        return;
      }
    }

    const step: DeprovisioningExecutionStep = {
      stepId: `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      action,
      status: 'PENDING',
      retryCount: 0
    };

    request.executionLog!.push(step);

    try {
      step.status = 'IN_PROGRESS';
      step.startedAt = new Date();

      await this.executeDeprovisioningAction(request.userId, action, step);

      step.status = 'COMPLETED';
      step.completedAt = new Date();
      action.executed = true;
      action.executedAt = new Date();

      logger.info('Deprovisioning action completed', {
        requestId,
        actionType: action.type,
        userId: request.userId
      });

    } catch (error) {
      step.status = 'FAILED';
      step.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      step.completedAt = new Date();

      logger.error('Deprovisioning action failed', {
        requestId,
        actionType: action.type,
        error: step.errorMessage
      });

      // For critical failures, mark the entire request as failed
      if (action.type === DeprovisioningActionType.DISABLE_USER_ACCOUNT ||
          action.type === DeprovisioningActionType.REVOKE_ALL_ACCESS) {
        request.status = DeprovisioningRequestStatus.FAILED;
        request.errorMessage = step.errorMessage;
      }
    }
  }

  /**
   * Execute a specific deprovisioning action
   */
  private async executeDeprovisioningAction(
    userId: string,
    action: DeprovisioningAction,
    step: DeprovisioningExecutionStep
  ): Promise<void> {
    switch (action.type) {
      case DeprovisioningActionType.DISABLE_USER_ACCOUNT:
        await this.disableUserAccount(userId, action.parameters, step);
        break;

      case DeprovisioningActionType.DISABLE_SAVIYNT_ACCOUNT:
        await this.saviyntService.syncUser(userId, SaviyntOperation.DEPROVISION, 'auto-deprovisioning');
        break;

      case DeprovisioningActionType.REVOKE_ALL_ACCESS:
        await this.revokeAllAccess(userId, action.parameters, step);
        break;

      case DeprovisioningActionType.REVOKE_SPECIFIC_ROLES:
        await this.revokeSpecificRoles(userId, action.parameters, step);
        break;

      case DeprovisioningActionType.BACKUP_USER_DATA:
        await this.backupUserData(userId, action.parameters, step);
        break;

      case DeprovisioningActionType.TRANSFER_OWNERSHIP:
        await this.transferOwnership(userId, action.parameters, step);
        break;

      case DeprovisioningActionType.NOTIFY_STAKEHOLDERS:
        await this.notifyStakeholders(userId, action.parameters, step);
        break;

      case DeprovisioningActionType.CREATE_AUDIT_REPORT:
        await this.createAuditReport(userId, action.parameters, step);
        break;

      case DeprovisioningActionType.ARCHIVE_USER_PROFILE:
        await this.archiveUserProfile(userId, action.parameters, step);
        break;

      case DeprovisioningActionType.DELETE_USER_DATA:
        await this.deleteUserData(userId, action.parameters, step);
        break;

      default:
        throw new Error(`Unsupported action type: ${action.type}`);
    }
  }

  /**
   * Disable user account in MES
   */
  private async disableUserAccount(
    userId: string,
    parameters: any,
    step: DeprovisioningExecutionStep
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Store current state for potential reversal
    step.reversalData = {
      previousState: {
        isActive: user.isActive,
        terminationDate: user.terminationDate
      }
    };

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        terminationDate: parameters.immediate ? new Date() : user.terminationDate || new Date()
      }
    });

    logger.info('User account disabled', { userId, parameters });
  }

  /**
   * Revoke all access for user
   */
  private async revokeAllAccess(
    userId: string,
    parameters: any,
    step: DeprovisioningExecutionStep
  ): Promise<void> {
    // Get current user roles for potential reversal
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true }
    });

    step.reversalData = { previousRoles: userRoles };

    // Remove all role assignments
    await this.prisma.userRole.deleteMany({
      where: { userId }
    });

    // Remove site-specific roles
    await this.prisma.userSiteRole.deleteMany({
      where: { userId }
    });

    logger.info('All access revoked for user', { userId, revokedRoles: userRoles.length });
  }

  /**
   * Revoke specific roles from user
   */
  private async revokeSpecificRoles(
    userId: string,
    parameters: any,
    step: DeprovisioningExecutionStep
  ): Promise<void> {
    const roleTypes = parameters.roleTypes || [];

    // Find roles to revoke based on type or specific role codes
    const rolesToRevoke = await this.prisma.userRole.findMany({
      where: {
        userId,
        role: {
          OR: [
            { roleCode: { in: roleTypes } },
            // Add more criteria based on role attributes
          ]
        }
      },
      include: { role: true }
    });

    step.reversalData = { revokedRoles: rolesToRevoke };

    // Remove the specific roles
    const roleIds = rolesToRevoke.map(ur => ur.roleId);
    await this.prisma.userRole.deleteMany({
      where: {
        userId,
        roleId: { in: roleIds }
      }
    });

    logger.info('Specific roles revoked for user', {
      userId,
      revokedRoles: rolesToRevoke.length,
      roleTypes
    });
  }

  /**
   * Backup user data
   */
  private async backupUserData(
    userId: string,
    parameters: any,
    step: DeprovisioningExecutionStep
  ): Promise<void> {
    // This would integrate with backup systems
    // For now, just log the action
    logger.info('User data backup initiated', { userId, parameters });

    // Simulate backup process
    step.result = {
      backupId: `backup-${Date.now()}`,
      backupLocation: '/backups/users/',
      includePersonalFiles: parameters.includePersonalFiles || false
    };
  }

  /**
   * Transfer ownership of user's resources
   */
  private async transferOwnership(
    userId: string,
    parameters: any,
    step: DeprovisioningExecutionStep
  ): Promise<void> {
    const transferTo = parameters.transferTo;

    // This would transfer ownership of various resources
    logger.info('Ownership transfer initiated', { userId, transferTo });

    step.result = {
      transferredItems: [],
      transferTo
    };
  }

  /**
   * Notify stakeholders about deprovisioning actions
   */
  private async notifyStakeholders(
    userId: string,
    parameters: any,
    step: DeprovisioningExecutionStep
  ): Promise<void> {
    // This would integrate with notification systems
    logger.info('Stakeholder notifications sent', { userId, parameters });
  }

  /**
   * Create audit report for deprovisioning
   */
  private async createAuditReport(
    userId: string,
    parameters: any,
    step: DeprovisioningExecutionStep
  ): Promise<void> {
    // This would generate comprehensive audit reports
    logger.info('Audit report created', { userId, parameters });

    step.result = {
      reportId: `audit-${Date.now()}`,
      reportType: parameters.reportType || 'deprovisioning'
    };
  }

  /**
   * Archive user profile
   */
  private async archiveUserProfile(
    userId: string,
    parameters: any,
    step: DeprovisioningExecutionStep
  ): Promise<void> {
    const retentionDays = parameters.retentionDays || 90;

    // This would move user data to archive storage
    logger.info('User profile archived', { userId, retentionDays });

    step.result = {
      archiveId: `archive-${Date.now()}`,
      retentionUntil: new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000)
    };
  }

  /**
   * Delete user data (with compliance considerations)
   */
  private async deleteUserData(
    userId: string,
    parameters: any,
    step: DeprovisioningExecutionStep
  ): Promise<void> {
    const keepAuditLogs = parameters.keepAuditLogs !== false;

    // This would permanently delete user data while preserving audit logs
    logger.info('User data deletion initiated', { userId, keepAuditLogs });

    step.result = {
      deletionId: `deletion-${Date.now()}`,
      auditLogsPreserved: keepAuditLogs
    };
  }

  /**
   * Schedule periodic tasks
   */
  private async schedulePeriodicTasks(): Promise<void> {
    // Check for dormant accounts daily
    setInterval(async () => {
      await this.checkDormantAccounts();
    }, 24 * 60 * 60 * 1000);

    // Check for expired grace periods every hour
    setInterval(async () => {
      await this.checkExpiredGracePeriods();
    }, 60 * 60 * 1000);

    // Clean up completed requests older than 1 year
    setInterval(async () => {
      await this.cleanupOldRequests();
    }, 24 * 60 * 60 * 1000);

    logger.info('Scheduled periodic tasks for deprovisioning service');
  }

  /**
   * Check for dormant accounts that need deprovisioning
   */
  private async checkDormantAccounts(): Promise<void> {
    const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days

    const dormantUsers = await this.prisma.user.findMany({
      where: {
        isActive: true,
        lastLoginAt: { lt: cutoffDate }
      }
    });

    for (const user of dormantUsers) {
      await this.handleDeprovisioningEvent(
        user.id,
        DeprovisioningTrigger.DORMANT_ACCOUNT,
        user,
        'system-automated',
        'Account dormant for 90+ days'
      );
    }

    if (dormantUsers.length > 0) {
      logger.info('Processed dormant accounts', { count: dormantUsers.length });
    }
  }

  /**
   * Check for expired grace periods
   */
  private async checkExpiredGracePeriods(): Promise<void> {
    const now = new Date();

    for (const [requestId, request] of this.activeRequests.entries()) {
      if (request.status === DeprovisioningRequestStatus.IN_GRACE_PERIOD &&
          request.gracePeriodEndDate &&
          now > request.gracePeriodEndDate) {

        request.status = DeprovisioningRequestStatus.PENDING;
        await this.scheduleDeprovisioningRequest(requestId);
      }
    }
  }

  /**
   * Clean up old completed requests
   */
  private async cleanupOldRequests(): Promise<void> {
    const cutoffDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year

    let cleaned = 0;
    for (const [requestId, request] of this.activeRequests.entries()) {
      if (request.completedAt && request.completedAt < cutoffDate) {
        this.activeRequests.delete(requestId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info('Cleaned up old deprovisioning requests', { count: cleaned });
    }
  }

  /**
   * Cancel a deprovisioning request
   */
  public async cancelRequest(requestId: string, cancelledBy: string, reason: string): Promise<void> {
    const request = this.activeRequests.get(requestId);
    if (!request) {
      throw new Error(`Deprovisioning request not found: ${requestId}`);
    }

    // Cancel scheduled actions
    for (const action of request.actions) {
      const timeoutKey = `${requestId}-${action.type}`;
      const timeoutId = this.scheduledActions.get(timeoutKey);
      if (timeoutId) {
        clearTimeout(timeoutId);
        this.scheduledActions.delete(timeoutKey);
      }
    }

    request.status = DeprovisioningRequestStatus.CANCELLED;
    request.errorMessage = `Cancelled by ${cancelledBy}: ${reason}`;

    logger.info('Deprovisioning request cancelled', {
      requestId,
      cancelledBy,
      reason
    });
  }

  /**
   * Reverse a completed deprovisioning request (if actions are reversible)
   */
  public async reverseRequest(
    requestId: string,
    reversedBy: string,
    reason: string
  ): Promise<void> {
    const request = this.activeRequests.get(requestId);
    if (!request) {
      throw new Error(`Deprovisioning request not found: ${requestId}`);
    }

    if (request.status !== DeprovisioningRequestStatus.COMPLETED) {
      throw new Error(`Cannot reverse request in status: ${request.status}`);
    }

    // Check if actions are reversible
    const reversibleActions = request.actions.filter(action => action.isReversible);
    if (reversibleActions.length === 0) {
      throw new Error('No reversible actions found in this request');
    }

    request.reversalRequested = true;
    request.reversalApprovedBy = reversedBy;

    // Execute reversal for each reversible action
    for (const action of reversibleActions) {
      const executionStep = request.executionLog?.find(step =>
        step.action.type === action.type && step.status === 'COMPLETED'
      );

      if (executionStep?.reversalData) {
        await this.reverseAction(request.userId, action, executionStep);
        executionStep.status = 'REVERSED';
      }
    }

    request.status = DeprovisioningRequestStatus.REVERSED;
    request.reversalCompletedAt = new Date();

    logger.info('Deprovisioning request reversed', {
      requestId,
      reversedBy,
      reason,
      reversedActions: reversibleActions.length
    });
  }

  /**
   * Reverse a specific action
   */
  private async reverseAction(
    userId: string,
    action: DeprovisioningAction,
    step: DeprovisioningExecutionStep
  ): Promise<void> {
    switch (action.type) {
      case DeprovisioningActionType.DISABLE_USER_ACCOUNT:
        if (step.reversalData?.previousState) {
          await this.prisma.user.update({
            where: { id: userId },
            data: step.reversalData.previousState
          });
        }
        break;

      case DeprovisioningActionType.REVOKE_ALL_ACCESS:
        if (step.reversalData?.previousRoles) {
          // Restore previous roles
          for (const roleData of step.reversalData.previousRoles) {
            await this.prisma.userRole.create({
              data: {
                userId,
                roleId: roleData.roleId,
                assignedAt: roleData.assignedAt,
                assignedBy: roleData.assignedBy,
                expiresAt: roleData.expiresAt
              }
            });
          }
        }
        break;

      case DeprovisioningActionType.REVOKE_SPECIFIC_ROLES:
        if (step.reversalData?.revokedRoles) {
          // Restore revoked roles
          for (const roleData of step.reversalData.revokedRoles) {
            await this.prisma.userRole.create({
              data: {
                userId,
                roleId: roleData.roleId,
                assignedAt: roleData.assignedAt,
                assignedBy: roleData.assignedBy,
                expiresAt: roleData.expiresAt
              }
            });
          }
        }
        break;

      default:
        logger.warn('Action reversal not implemented', { actionType: action.type });
    }
  }

  /**
   * Get deprovisioning statistics
   */
  public getDeprovisioningStatistics() {
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
      scheduledActions: this.scheduledActions.size
    };
  }

  /**
   * Get active deprovisioning requests
   */
  public getActiveRequests(): DeprovisioningRequest[] {
    return Array.from(this.activeRequests.values());
  }
}