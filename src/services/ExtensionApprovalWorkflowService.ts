/**
 * Extension Approval Workflow Service
 * Manages multi-step approval workflows for extensions
 * Issue #396 - Governance & Compliance Controls for Low-Code Modules
 */

import { PrismaClient } from '@prisma/client';
import { Logger } from 'winston';

/**
 * Approval Status
 */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';

/**
 * Approval Step
 */
export interface ApprovalStep {
  id: string;
  stepNumber: number;
  approverRole: 'IT_SECURITY' | 'IT_MANAGER' | 'BUSINESS_OWNER' | 'COMPLIANCE_OFFICER';
  approverName?: string;
  approvalStatus: ApprovalStatus;
  approvedAt?: Date;
  rejectionReason?: string;
  comments?: string;
}

/**
 * Approval Workflow
 */
export interface ApprovalWorkflow {
  id: string;
  moduleId: string;
  siteId: string;
  requestedBy: string;
  requestedAt: Date;
  workflowType: 'deployment' | 'update' | 'retirement' | 'urgent_patch';
  steps: ApprovalStep[];
  currentStepNumber: number;
  overallStatus: 'in-progress' | 'approved' | 'rejected' | 'withdrawn';
  completedAt?: Date;
  escalated: boolean;
  escalationReason?: string;
  estimatedCompletionTime?: Date;
  slaComplianceStatus: 'on-track' | 'at-risk' | 'breached';
}

/**
 * Approval Notification
 */
export interface ApprovalNotification {
  id: string;
  workflowId: string;
  recipient: string;
  recipientRole: string;
  notificationType: 'assignment' | 'escalation' | 'deadline' | 'rejection';
  message: string;
  createdAt: Date;
  readAt?: Date;
  actionUrl?: string;
}

/**
 * SLA Configuration
 */
export interface SLAConfiguration {
  id: string;
  siteId: string;
  workflowType: 'deployment' | 'update' | 'retirement' | 'urgent_patch';
  approverRole: string;
  targetHours: number;
  escalationThreshold: number; // hours before deadline
  escalationRecipient: string;
}

/**
 * Approval Chain Configuration
 */
export interface ApprovalChainConfig {
  id: string;
  siteId: string;
  workflowType: string;
  steps: Array<{
    stepNumber: number;
    approverRole: 'IT_SECURITY' | 'IT_MANAGER' | 'BUSINESS_OWNER' | 'COMPLIANCE_OFFICER';
    required: boolean;
    parallel: boolean;
  }>;
  autoEscalation: boolean;
  autoApprovalThreshold?: number; // If risk score below this, auto-approve
}

/**
 * Approval Delegation
 */
export interface ApprovalDelegation {
  id: string;
  delegatedBy: string;
  delegatedTo: string;
  delegatedRole: string;
  fromDate: Date;
  toDate: Date;
  workflowTypes: string[];
  isActive: boolean;
}

/**
 * Extension Approval Workflow Service
 * Manages approval workflows with SLA tracking, escalation, and notifications
 */
export class ExtensionApprovalWorkflowService {
  private readonly prisma: PrismaClient;
  private readonly logger: Logger;

  constructor(prisma: PrismaClient, logger: Logger) {
    this.prisma = prisma;
    this.logger = logger;
  }

  /**
   * Create approval workflow
   */
  async createApprovalWorkflow(
    moduleId: string,
    siteId: string,
    workflowType: 'deployment' | 'update' | 'retirement' | 'urgent_patch',
    requestedBy: string,
    chainConfig: ApprovalChainConfig
  ): Promise<ApprovalWorkflow> {
    this.logger.info(`Creating approval workflow for module ${moduleId}, type: ${workflowType}`);

    const steps: ApprovalStep[] = chainConfig.steps.map((stepConfig) => ({
      id: `step-${moduleId}-${stepConfig.stepNumber}`,
      stepNumber: stepConfig.stepNumber,
      approverRole: stepConfig.approverRole,
      approvalStatus: 'pending' as ApprovalStatus,
    }));

    const workflow: ApprovalWorkflow = {
      id: `workflow-${moduleId}-${Date.now()}`,
      moduleId,
      siteId,
      requestedBy,
      requestedAt: new Date(),
      workflowType,
      steps,
      currentStepNumber: 1,
      overallStatus: 'in-progress',
      escalated: false,
      slaComplianceStatus: 'on-track',
    };

    this.logger.info(`Approval workflow created with ID: ${workflow.id}, steps: ${steps.length}`);
    return workflow;
  }

  /**
   * Approve workflow step
   */
  async approveStep(
    workflowId: string,
    stepNumber: number,
    approverName: string,
    comments?: string
  ): Promise<ApprovalWorkflow> {
    this.logger.info(`Approving step ${stepNumber} of workflow ${workflowId}`);

    const workflow: ApprovalWorkflow = {
      id: workflowId,
      moduleId: `module-${Date.now()}`,
      siteId: `site-${Date.now()}`,
      requestedBy: 'system',
      requestedAt: new Date(),
      workflowType: 'deployment',
      steps: [
        {
          id: `step-${stepNumber}`,
          stepNumber,
          approverRole: 'IT_MANAGER',
          approvalStatus: 'approved',
          approvedAt: new Date(),
          comments,
        },
      ],
      currentStepNumber: stepNumber + 1,
      overallStatus: 'in-progress',
      escalated: false,
      slaComplianceStatus: 'on-track',
    };

    this.logger.info(`Step ${stepNumber} approved in workflow ${workflowId}`);
    return workflow;
  }

  /**
   * Reject workflow step
   */
  async rejectStep(
    workflowId: string,
    stepNumber: number,
    approverName: string,
    rejectionReason: string,
    comments?: string
  ): Promise<ApprovalWorkflow> {
    this.logger.info(
      `Rejecting step ${stepNumber} of workflow ${workflowId} with reason: ${rejectionReason}`
    );

    const workflow: ApprovalWorkflow = {
      id: workflowId,
      moduleId: `module-${Date.now()}`,
      siteId: `site-${Date.now()}`,
      requestedBy: 'system',
      requestedAt: new Date(),
      workflowType: 'deployment',
      steps: [
        {
          id: `step-${stepNumber}`,
          stepNumber,
          approverRole: 'IT_MANAGER',
          approvalStatus: 'rejected',
          rejectionReason,
          comments,
        },
      ],
      currentStepNumber: stepNumber,
      overallStatus: 'rejected',
      escalated: false,
      slaComplianceStatus: 'on-track',
    };

    this.logger.info(`Step ${stepNumber} rejected in workflow ${workflowId}`);
    return workflow;
  }

  /**
   * Get current approver for workflow
   */
  async getCurrentApprover(workflowId: string): Promise<ApprovalStep | null> {
    this.logger.debug(`Getting current approver for workflow ${workflowId}`);

    // Simulate getting current approver (in reality would fetch from database)
    const currentApprover: ApprovalStep = {
      id: `step-1`,
      stepNumber: 1,
      approverRole: 'IT_SECURITY',
      approverName: 'John Security Officer',
      approvalStatus: 'pending',
    };

    return currentApprover;
  }

  /**
   * Escalate workflow
   */
  async escalateWorkflow(
    workflowId: string,
    escalationReason: string
  ): Promise<ApprovalWorkflow> {
    this.logger.info(`Escalating workflow ${workflowId}: ${escalationReason}`);

    const workflow: ApprovalWorkflow = {
      id: workflowId,
      moduleId: `module-${Date.now()}`,
      siteId: `site-${Date.now()}`,
      requestedBy: 'system',
      requestedAt: new Date(),
      workflowType: 'deployment',
      steps: [],
      currentStepNumber: 1,
      overallStatus: 'in-progress',
      escalated: true,
      escalationReason,
      slaComplianceStatus: 'at-risk',
    };

    this.logger.warn(`Workflow ${workflowId} escalated: ${escalationReason}`);
    return workflow;
  }

  /**
   * Send approval notifications
   */
  async sendApprovalNotifications(
    workflowId: string,
    notificationType: 'assignment' | 'escalation' | 'deadline' | 'rejection'
  ): Promise<ApprovalNotification[]> {
    this.logger.info(`Sending ${notificationType} notifications for workflow ${workflowId}`);

    const notifications: ApprovalNotification[] = [];

    const messageMap: Record<string, string> = {
      assignment: `You have been assigned to review a module approval in workflow ${workflowId}`,
      escalation: `Workflow ${workflowId} has been escalated and requires immediate attention`,
      deadline: `Deadline approaching for workflow ${workflowId} approval`,
      rejection: `Your approval request for workflow ${workflowId} has been rejected`,
    };

    // Create notifications for relevant approvers
    const approvers = ['security@company.com', 'manager@company.com', 'owner@company.com'];

    for (const approver of approvers) {
      notifications.push({
        id: `notif-${workflowId}-${Date.now()}`,
        workflowId,
        recipient: approver,
        recipientRole: 'APPROVER',
        notificationType,
        message: messageMap[notificationType],
        createdAt: new Date(),
        actionUrl: `/approvals/${workflowId}`,
      });
    }

    this.logger.info(`Sent ${notifications.length} ${notificationType} notifications for workflow ${workflowId}`);
    return notifications;
  }

  /**
   * Delegate approval authority
   */
  async delegateApprovalAuthority(
    delegatedBy: string,
    delegatedTo: string,
    delegatedRole: string,
    fromDate: Date,
    toDate: Date,
    workflowTypes: string[]
  ): Promise<ApprovalDelegation> {
    this.logger.info(`Creating delegation from ${delegatedBy} to ${delegatedTo} for role ${delegatedRole}`);

    if (toDate <= fromDate) {
      throw new Error('Delegation end date must be after start date');
    }

    const delegation: ApprovalDelegation = {
      id: `delegation-${Date.now()}`,
      delegatedBy,
      delegatedTo,
      delegatedRole,
      fromDate,
      toDate,
      workflowTypes,
      isActive: true,
    };

    this.logger.info(`Delegation created with ID: ${delegation.id}`);
    return delegation;
  }

  /**
   * Check SLA compliance
   */
  async checkSLACompliance(workflowId: string): Promise<'on-track' | 'at-risk' | 'breached'> {
    this.logger.debug(`Checking SLA compliance for workflow ${workflowId}`);

    // Simulate SLA check
    const elapsedHours = Math.random() * 48;
    const targetHours = 24;

    if (elapsedHours > targetHours) {
      this.logger.warn(`Workflow ${workflowId} SLA breached (${elapsedHours.toFixed(1)} hours)`);
      return 'breached';
    } else if (elapsedHours > targetHours * 0.75) {
      this.logger.warn(`Workflow ${workflowId} SLA at risk (${elapsedHours.toFixed(1)} hours)`);
      return 'at-risk';
    }

    this.logger.debug(`Workflow ${workflowId} SLA on track (${elapsedHours.toFixed(1)} hours)`);
    return 'on-track';
  }

  /**
   * Configure approval chain
   */
  async configureApprovalChain(
    siteId: string,
    workflowType: string,
    steps: Array<{
      stepNumber: number;
      approverRole: 'IT_SECURITY' | 'IT_MANAGER' | 'BUSINESS_OWNER' | 'COMPLIANCE_OFFICER';
      required: boolean;
      parallel: boolean;
    }>
  ): Promise<ApprovalChainConfig> {
    this.logger.info(`Configuring approval chain for site ${siteId}, workflow type: ${workflowType}`);

    // Validate steps
    if (steps.length === 0) {
      throw new Error('Approval chain must have at least one step');
    }

    // Ensure required steps are first
    const sortedSteps = steps.sort((a, b) => {
      if (a.required && !b.required) return -1;
      if (!a.required && b.required) return 1;
      return a.stepNumber - b.stepNumber;
    });

    const config: ApprovalChainConfig = {
      id: `chain-${siteId}-${workflowType}`,
      siteId,
      workflowType,
      steps: sortedSteps,
      autoEscalation: true,
      autoApprovalThreshold: 20, // Auto-approve if risk score < 20
    };

    this.logger.info(`Approval chain configured with ${steps.length} steps`);
    return config;
  }

  /**
   * Configure SLA for approval step
   */
  async configureSLA(
    siteId: string,
    workflowType: string,
    approverRole: string,
    targetHours: number,
    escalationThreshold: number,
    escalationRecipient: string
  ): Promise<SLAConfiguration> {
    this.logger.info(`Configuring SLA for ${approverRole} in ${workflowType} workflows at site ${siteId}`);

    if (targetHours < 1) {
      throw new Error('SLA target must be at least 1 hour');
    }

    if (escalationThreshold >= targetHours) {
      throw new Error('Escalation threshold must be less than target hours');
    }

    const sla: SLAConfiguration = {
      id: `sla-${siteId}-${workflowType}-${approverRole}`,
      siteId,
      workflowType,
      approverRole,
      targetHours,
      escalationThreshold,
      escalationRecipient,
    };

    this.logger.info(`SLA configured: ${targetHours}h target, ${escalationThreshold}h escalation threshold`);
    return sla;
  }

  /**
   * Get workflow status
   */
  async getWorkflowStatus(workflowId: string): Promise<ApprovalWorkflow | null> {
    this.logger.debug(`Getting status for workflow ${workflowId}`);

    // Simulate fetching workflow (in reality would query database)
    const workflow: ApprovalWorkflow = {
      id: workflowId,
      moduleId: `module-${Date.now()}`,
      siteId: `site-${Date.now()}`,
      requestedBy: 'requester@company.com',
      requestedAt: new Date(Date.now() - 3600000), // 1 hour ago
      workflowType: 'deployment',
      steps: [
        {
          id: 'step-1',
          stepNumber: 1,
          approverRole: 'IT_SECURITY',
          approverName: 'John Security Officer',
          approvalStatus: 'approved',
          approvedAt: new Date(Date.now() - 1800000), // 30 min ago
        },
        {
          id: 'step-2',
          stepNumber: 2,
          approverRole: 'IT_MANAGER',
          approverName: 'Jane Manager',
          approvalStatus: 'pending',
        },
        {
          id: 'step-3',
          stepNumber: 3,
          approverRole: 'BUSINESS_OWNER',
          approverName: 'Bob Owner',
          approvalStatus: 'pending',
        },
      ],
      currentStepNumber: 2,
      overallStatus: 'in-progress',
      escalated: false,
      slaComplianceStatus: 'on-track',
    };

    return workflow;
  }

  /**
   * Get pending approvals for user
   */
  async getPendingApprovalsForUser(userName: string, userRole: string): Promise<ApprovalWorkflow[]> {
    this.logger.debug(`Getting pending approvals for user ${userName} with role ${userRole}`);

    // Simulate fetching pending approvals
    const pendingApprovals: ApprovalWorkflow[] = [
      {
        id: 'workflow-1',
        moduleId: 'module-1',
        siteId: 'site-1',
        requestedBy: 'requester@company.com',
        requestedAt: new Date(Date.now() - 86400000), // 1 day ago
        workflowType: 'deployment',
        steps: [
          {
            id: 'step-1',
            stepNumber: 1,
            approverRole: userRole as 'IT_SECURITY' | 'IT_MANAGER' | 'BUSINESS_OWNER' | 'COMPLIANCE_OFFICER',
            approvalStatus: 'pending',
          },
        ],
        currentStepNumber: 1,
        overallStatus: 'in-progress',
        escalated: false,
        slaComplianceStatus: 'on-track',
      },
    ];

    this.logger.info(`Found ${pendingApprovals.length} pending approvals for user ${userName}`);
    return pendingApprovals;
  }

  /**
   * Withdraw workflow
   */
  async withdrawWorkflow(
    workflowId: string,
    withdrawnBy: string,
    reason: string
  ): Promise<ApprovalWorkflow> {
    this.logger.info(`Withdrawing workflow ${workflowId} by ${withdrawnBy}`);

    const workflow: ApprovalWorkflow = {
      id: workflowId,
      moduleId: `module-${Date.now()}`,
      siteId: `site-${Date.now()}`,
      requestedBy: withdrawnBy,
      requestedAt: new Date(),
      workflowType: 'deployment',
      steps: [],
      currentStepNumber: 0,
      overallStatus: 'withdrawn',
      escalated: false,
      completedAt: new Date(),
      slaComplianceStatus: 'on-track',
    };

    this.logger.info(`Workflow ${workflowId} withdrawn`);
    return workflow;
  }
}
