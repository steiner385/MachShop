/**
 * Torque Signature Workflow Service
 * Orchestrates electronic signature workflows for torque management operations
 * Integrates with existing ElectronicSignatureService for AS9100 compliance
 */

import { EventEmitter } from 'events';
import { ElectronicSignatureService } from './ElectronicSignatureService';
import { TorqueRealtimeService } from './TorqueRealtimeService';
import {
  TorqueReportData,
  TorqueEventSummary,
  TorqueSpecificationWithMetadata,
  ValidationContext
} from '../types/torque';

export interface TorqueSignatureWorkflow {
  id: string;
  workflowType: 'torque_completion' | 'rework_approval' | 'supervisor_override' | 'quality_review';
  workOrderId: string;
  torqueSpecId: string;
  operatorId: string;
  documentId: string;
  documentType: string;
  requiredSignatures: Array<{
    role: string;
    order: number;
    required: boolean;
    description: string;
    completed: boolean;
    signatureId?: string;
    completedAt?: Date;
    completedBy?: string;
  }>;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'expired';
  createdAt: Date;
  completedAt?: Date;
  expiresAt: Date;
  metadata: {
    torqueEvents?: TorqueEventSummary[];
    outOfSpecCount?: number;
    reworkReason?: string;
    overrideReason?: string;
    reportData?: TorqueReportData;
  };
}

export interface SignatureNotification {
  id: string;
  workflowId: string;
  recipientId: string;
  recipientRole: string;
  recipientEmail: string;
  notificationType: 'signature_required' | 'workflow_completed' | 'workflow_expired' | 'signature_reminder';
  subject: string;
  message: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  sentAt?: Date;
  acknowledgedAt?: Date;
  metadata: {
    workOrderId: string;
    documentType: string;
    dueDate: Date;
  };
}

export class TorqueSignatureWorkflowService extends EventEmitter {
  private electronicsignatureService: ElectronicSignatureService;
  private realtimeService?: TorqueRealtimeService;
  private workflows = new Map<string, TorqueSignatureWorkflow>();
  private notifications = new Map<string, SignatureNotification>();

  constructor(
    electronicsignatureService: ElectronicSignatureService,
    realtimeService?: TorqueRealtimeService
  ) {
    super();
    this.electronicsignatureService = electronicsignatureService;
    this.realtimeService = realtimeService;
  }

  /**
   * Create torque completion signature workflow
   */
  async createTorqueCompletionWorkflow(
    workOrderId: string,
    torqueSpecId: string,
    operatorId: string,
    torqueEvents: TorqueEventSummary[],
    reportData: TorqueReportData
  ): Promise<string> {
    const workflowId = this.generateWorkflowId();
    const documentId = `torque_report_${workOrderId}_${Date.now()}`;

    // Determine required signatures based on torque results
    const outOfSpecCount = torqueEvents.filter(e => !e.isInSpec).length;
    const requiresRework = torqueEvents.some(e => e.requiresRework);
    const successRate = (torqueEvents.filter(e => e.isInSpec).length / torqueEvents.length) * 100;

    const requiredSignatures = [
      {
        role: 'Production Operator',
        order: 1,
        required: true,
        description: 'Operator certification of torque sequence completion',
        completed: false
      },
      {
        role: 'Quality Inspector',
        order: 2,
        required: true,
        description: 'Quality verification of torque compliance',
        completed: false
      }
    ];

    // Add supervisor signature for critical cases
    if (outOfSpecCount > 0 || requiresRework || successRate < 95) {
      requiredSignatures.push({
        role: 'Production Supervisor',
        order: 3,
        required: true,
        description: 'Supervisor approval for out-of-spec torque events',
        completed: false
      });
    }

    // Add quality engineer for significant issues
    if (outOfSpecCount > 3 || successRate < 90) {
      requiredSignatures.push({
        role: 'Quality Engineer',
        order: 4,
        required: true,
        description: 'Quality engineering review of torque discrepancies',
        completed: false
      });
    }

    const workflow: TorqueSignatureWorkflow = {
      id: workflowId,
      workflowType: 'torque_completion',
      workOrderId,
      torqueSpecId,
      operatorId,
      documentId,
      documentType: 'torque_report',
      requiredSignatures,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      metadata: {
        torqueEvents,
        outOfSpecCount,
        reportData
      }
    };

    this.workflows.set(workflowId, workflow);

    // Send notifications to required signers
    await this.sendInitialNotifications(workflow);

    this.emit('workflow_created', {
      workflowId,
      workflowType: workflow.workflowType,
      workOrderId,
      requiredSignatures: requiredSignatures.length,
      outOfSpecCount
    });

    return workflowId;
  }

  /**
   * Create rework approval workflow
   */
  async createReworkApprovalWorkflow(
    workOrderId: string,
    torqueSpecId: string,
    operatorId: string,
    reworkReason: string,
    torqueEvents: TorqueEventSummary[]
  ): Promise<string> {
    const workflowId = this.generateWorkflowId();
    const documentId = `rework_approval_${workOrderId}_${Date.now()}`;

    const workflow: TorqueSignatureWorkflow = {
      id: workflowId,
      workflowType: 'rework_approval',
      workOrderId,
      torqueSpecId,
      operatorId,
      documentId,
      documentType: 'rework_approval',
      requiredSignatures: [
        {
          role: 'Production Supervisor',
          order: 1,
          required: true,
          description: `Supervisor approval for rework: ${reworkReason}`,
          completed: false
        },
        {
          role: 'Quality Engineer',
          order: 2,
          required: true,
          description: 'Quality engineering review of rework procedure',
          completed: false
        }
      ],
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
      metadata: {
        torqueEvents,
        reworkReason
      }
    };

    this.workflows.set(workflowId, workflow);
    await this.sendInitialNotifications(workflow);

    this.emit('workflow_created', {
      workflowId,
      workflowType: workflow.workflowType,
      workOrderId,
      reworkReason
    });

    return workflowId;
  }

  /**
   * Create supervisor override workflow
   */
  async createSupervisorOverrideWorkflow(
    workOrderId: string,
    torqueSpecId: string,
    operatorId: string,
    overrideReason: string,
    torqueEvents: TorqueEventSummary[]
  ): Promise<string> {
    const workflowId = this.generateWorkflowId();
    const documentId = `supervisor_override_${workOrderId}_${Date.now()}`;

    const outOfSpecCount = torqueEvents.filter(e => !e.isInSpec).length;
    const requiresManagementApproval = outOfSpecCount > 5 ||
      torqueEvents.some(e => e.deviationPercent && Math.abs(e.deviationPercent) > 20);

    const requiredSignatures = [
      {
        role: 'Production Supervisor',
        order: 1,
        required: true,
        description: `Supervisor override approval: ${overrideReason}`,
        completed: false
      },
      {
        role: 'Quality Engineer',
        order: 2,
        required: true,
        description: 'Quality engineering review of out-of-spec approval',
        completed: false
      }
    ];

    if (requiresManagementApproval) {
      requiredSignatures.push({
        role: 'Plant Manager',
        order: 3,
        required: true,
        description: 'Management approval for critical override',
        completed: false
      });
    }

    const workflow: TorqueSignatureWorkflow = {
      id: workflowId,
      workflowType: 'supervisor_override',
      workOrderId,
      torqueSpecId,
      operatorId,
      documentId,
      documentType: 'supervisor_review',
      requiredSignatures,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours for urgent override
      metadata: {
        torqueEvents,
        outOfSpecCount,
        overrideReason
      }
    };

    this.workflows.set(workflowId, workflow);
    await this.sendInitialNotifications(workflow);

    this.emit('workflow_created', {
      workflowId,
      workflowType: workflow.workflowType,
      workOrderId,
      overrideReason,
      outOfSpecCount
    });

    return workflowId;
  }

  /**
   * Sign document in workflow
   */
  async signWorkflowDocument(
    workflowId: string,
    userId: string,
    password: string,
    signatureReason: string,
    ipAddress: string,
    userAgent: string,
    biometricTemplate?: string
  ): Promise<{
    signatureId: string;
    workflowCompleted: boolean;
  }> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    if (workflow.status === 'completed' || workflow.status === 'expired') {
      throw new Error(`Workflow ${workflowId} is ${workflow.status}`);
    }

    // Find the user's required signature
    const userRole = await this.getUserRole(userId);
    const requiredSignature = workflow.requiredSignatures.find(rs => rs.role === userRole);

    if (!requiredSignature) {
      throw new Error(`Role ${userRole} is not required for this workflow`);
    }

    if (requiredSignature.completed) {
      throw new Error(`Role ${userRole} has already signed this document`);
    }

    // Check if previous required signatures are completed
    const previousSignatures = workflow.requiredSignatures.filter(
      rs => rs.order < requiredSignature.order && rs.required
    );
    const incompletePrevious = previousSignatures.filter(ps => !ps.completed);

    if (incompletePrevious.length > 0) {
      throw new Error('Previous required signatures must be completed first');
    }

    // Create electronic signature
    const signatureResponse = await this.electronicsignatureService.createSignature({
      userId,
      password,
      signatureType: 'ELECTRONIC',
      signatureLevel: 'ADVANCED',
      signedEntityType: 'torque_workflow',
      signedEntityId: workflowId,
      signatureReason,
      ipAddress,
      userAgent,
      biometricType: biometricTemplate ? 'FINGERPRINT' : undefined,
      biometricTemplate,
      biometricScore: biometricTemplate ? 95 : undefined,
      signedDocument: {
        workflowId,
        documentId: workflow.documentId,
        documentType: workflow.documentType,
        workOrderId: workflow.workOrderId,
        timestamp: new Date()
      }
    });

    // Update workflow signature status
    requiredSignature.completed = true;
    requiredSignature.signatureId = signatureResponse.id;
    requiredSignature.completedAt = new Date();
    requiredSignature.completedBy = userId;

    workflow.status = 'in_progress';

    // Check if workflow is complete
    const allRequiredCompleted = workflow.requiredSignatures
      .filter(rs => rs.required)
      .every(rs => rs.completed);

    let workflowCompleted = false;

    if (allRequiredCompleted) {
      workflow.status = 'completed';
      workflow.completedAt = new Date();
      workflowCompleted = true;

      this.emit('workflow_completed', {
        workflowId,
        workflowType: workflow.workflowType,
        workOrderId: workflow.workOrderId,
        completedAt: workflow.completedAt,
        totalSignatures: workflow.requiredSignatures.length
      });

      // Send completion notifications
      await this.sendCompletionNotifications(workflow);
    }

    this.emit('document_signed', {
      workflowId,
      signatureId: signatureResponse.id,
      userId,
      userRole,
      documentId: workflow.documentId,
      workflowCompleted
    });

    // Send real-time update
    if (this.realtimeService) {
      this.realtimeService.broadcastMessage({
        type: 'signature_completed',
        data: {
          workflowId,
          signatureId: signatureResponse.id,
          userRole,
          workflowCompleted,
          remainingSignatures: workflow.requiredSignatures.filter(rs => rs.required && !rs.completed).length
        },
        timestamp: new Date(),
        messageId: `sig_${Date.now()}`,
        workOrderId: workflow.workOrderId
      });
    }

    return {
      signatureId: signatureResponse.id,
      workflowCompleted
    };
  }

  /**
   * Get workflow status
   */
  getWorkflowStatus(workflowId: string): TorqueSignatureWorkflow | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * Get pending workflows for user
   */
  getPendingWorkflowsForUser(userId: string): Promise<TorqueSignatureWorkflow[]> {
    return new Promise(async (resolve) => {
      const userRole = await this.getUserRole(userId);

      const pendingWorkflows = Array.from(this.workflows.values()).filter(workflow => {
        if (workflow.status !== 'pending' && workflow.status !== 'in_progress') {
          return false;
        }

        // Check if user's role is required and not yet completed
        const requiredSignature = workflow.requiredSignatures.find(rs =>
          rs.role === userRole && rs.required && !rs.completed
        );

        if (!requiredSignature) {
          return false;
        }

        // Check if previous signatures are completed
        const previousSignatures = workflow.requiredSignatures.filter(
          rs => rs.order < requiredSignature.order && rs.required
        );

        return previousSignatures.every(ps => ps.completed);
      });

      resolve(pendingWorkflows);
    });
  }

  /**
   * Send signature reminder notifications
   */
  async sendSignatureReminders(): Promise<void> {
    const now = new Date();
    const reminderThreshold = 4 * 60 * 60 * 1000; // 4 hours before expiry

    for (const workflow of this.workflows.values()) {
      if (workflow.status !== 'pending' && workflow.status !== 'in_progress') {
        continue;
      }

      const timeToExpiry = workflow.expiresAt.getTime() - now.getTime();

      if (timeToExpiry <= reminderThreshold && timeToExpiry > 0) {
        await this.sendReminderNotifications(workflow);
      }
    }
  }

  /**
   * Expire overdue workflows
   */
  async expireOverdueWorkflows(): Promise<void> {
    const now = new Date();
    const expiredWorkflows: string[] = [];

    for (const [workflowId, workflow] of this.workflows) {
      if ((workflow.status === 'pending' || workflow.status === 'in_progress') &&
          workflow.expiresAt < now) {
        workflow.status = 'expired';
        expiredWorkflows.push(workflowId);

        this.emit('workflow_expired', {
          workflowId,
          workflowType: workflow.workflowType,
          workOrderId: workflow.workOrderId,
          expiredAt: now
        });
      }
    }

    if (expiredWorkflows.length > 0) {
      await this.sendExpirationNotifications(expiredWorkflows);
    }
  }

  /**
   * Generate workflow audit report
   */
  async generateWorkflowAuditReport(
    workOrderId?: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<{
    totalWorkflows: number;
    completedWorkflows: number;
    expiredWorkflows: number;
    averageCompletionTime: number;
    workflows: TorqueSignatureWorkflow[];
  }> {
    let workflows = Array.from(this.workflows.values());

    // Filter by work order if specified
    if (workOrderId) {
      workflows = workflows.filter(w => w.workOrderId === workOrderId);
    }

    // Filter by date range if specified
    if (dateRange) {
      workflows = workflows.filter(w =>
        w.createdAt >= dateRange.start && w.createdAt <= dateRange.end
      );
    }

    const completedWorkflows = workflows.filter(w => w.status === 'completed');
    const expiredWorkflows = workflows.filter(w => w.status === 'expired');

    // Calculate average completion time
    const completionTimes = completedWorkflows
      .filter(w => w.completedAt)
      .map(w => w.completedAt!.getTime() - w.createdAt.getTime());

    const averageCompletionTime = completionTimes.length > 0
      ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length
      : 0;

    return {
      totalWorkflows: workflows.length,
      completedWorkflows: completedWorkflows.length,
      expiredWorkflows: expiredWorkflows.length,
      averageCompletionTime: averageCompletionTime / (1000 * 60), // Convert to minutes
      workflows
    };
  }

  /**
   * Send initial notifications when workflow is created
   */
  private async sendInitialNotifications(workflow: TorqueSignatureWorkflow): Promise<void> {
    // Get first required signer
    const firstSignature = workflow.requiredSignatures
      .filter(rs => rs.required)
      .sort((a, b) => a.order - b.order)[0];

    if (firstSignature) {
      const users = await this.getUsersByRole(firstSignature.role);

      for (const user of users) {
        const notification: SignatureNotification = {
          id: this.generateNotificationId(),
          workflowId: workflow.id,
          recipientId: user.id,
          recipientRole: user.role,
          recipientEmail: user.email,
          notificationType: 'signature_required',
          subject: `Torque Management Signature Required - Work Order ${workflow.workOrderId}`,
          message: `Your electronic signature is required for ${workflow.documentType}. ${firstSignature.description}`,
          urgency: workflow.workflowType === 'supervisor_override' ? 'high' : 'medium',
          createdAt: new Date(),
          metadata: {
            workOrderId: workflow.workOrderId,
            documentType: workflow.documentType,
            dueDate: workflow.expiresAt
          }
        };

        this.notifications.set(notification.id, notification);
        await this.sendNotification(notification);
      }
    }
  }

  /**
   * Send completion notifications
   */
  private async sendCompletionNotifications(workflow: TorqueSignatureWorkflow): Promise<void> {
    // Notify all signers and stakeholders
    const stakeholderRoles = ['Production Supervisor', 'Quality Manager', 'Plant Manager'];

    for (const role of stakeholderRoles) {
      const users = await this.getUsersByRole(role);

      for (const user of users) {
        const notification: SignatureNotification = {
          id: this.generateNotificationId(),
          workflowId: workflow.id,
          recipientId: user.id,
          recipientRole: user.role,
          recipientEmail: user.email,
          notificationType: 'workflow_completed',
          subject: `Torque Management Workflow Completed - Work Order ${workflow.workOrderId}`,
          message: `The torque management workflow for Work Order ${workflow.workOrderId} has been completed with all required signatures.`,
          urgency: 'low',
          createdAt: new Date(),
          metadata: {
            workOrderId: workflow.workOrderId,
            documentType: workflow.documentType,
            dueDate: workflow.expiresAt
          }
        };

        this.notifications.set(notification.id, notification);
        await this.sendNotification(notification);
      }
    }
  }

  /**
   * Send reminder notifications
   */
  private async sendReminderNotifications(workflow: TorqueSignatureWorkflow): Promise<void> {
    const pendingSignatures = workflow.requiredSignatures.filter(rs => rs.required && !rs.completed);

    for (const signature of pendingSignatures) {
      const users = await this.getUsersByRole(signature.role);

      for (const user of users) {
        const notification: SignatureNotification = {
          id: this.generateNotificationId(),
          workflowId: workflow.id,
          recipientId: user.id,
          recipientRole: user.role,
          recipientEmail: user.email,
          notificationType: 'signature_reminder',
          subject: `REMINDER: Torque Management Signature Required - Work Order ${workflow.workOrderId}`,
          message: `Reminder: Your electronic signature is still required for ${workflow.documentType}. This workflow expires soon.`,
          urgency: 'high',
          createdAt: new Date(),
          metadata: {
            workOrderId: workflow.workOrderId,
            documentType: workflow.documentType,
            dueDate: workflow.expiresAt
          }
        };

        this.notifications.set(notification.id, notification);
        await this.sendNotification(notification);
      }
    }
  }

  /**
   * Send expiration notifications
   */
  private async sendExpirationNotifications(expiredWorkflowIds: string[]): Promise<void> {
    // Implementation would send notifications about expired workflows
    console.log(`${expiredWorkflowIds.length} workflows have expired`);
  }

  /**
   * Send notification (placeholder implementation)
   */
  private async sendNotification(notification: SignatureNotification): Promise<void> {
    // In a real implementation, this would:
    // - Send email notifications
    // - Create in-app notifications
    // - Send SMS for urgent notifications
    // - Integrate with notification services

    this.emit('notification_sent', notification);
  }

  /**
   * Get user role (placeholder implementation)
   */
  private async getUserRole(userId: string): Promise<string> {
    // This would query the user database to get the user's role
    // Placeholder implementation
    return 'Production Operator';
  }

  /**
   * Get users by role (placeholder implementation)
   */
  private async getUsersByRole(role: string): Promise<Array<{id: string; role: string; email: string}>> {
    // This would query the user database to get users with the specified role
    // Placeholder implementation
    return [
      { id: 'user1', role, email: 'user1@company.com' }
    ];
  }

  /**
   * Generate unique workflow ID
   */
  private generateWorkflowId(): string {
    return `TWF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique notification ID
   */
  private generateNotificationId(): string {
    return `TN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default TorqueSignatureWorkflowService;