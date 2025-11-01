/**
 * Time Entry Notification Service
 * Service for managing notifications related to time entry management and approvals
 *
 * GitHub Issue #51: Time Entry Management & Approvals System
 */

import {
  TimeEntryEdit,
  TimeEntryApproval,
  User,
  ApprovalStatus,
  AutoStopBehavior,
  TimeEntryType,
} from '@prisma/client';
import prisma from '../lib/database';

export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  subject: string;
  htmlBody: string;
  textBody: string;
  variables: string[];
}

export interface NotificationRecipient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  preferredChannels: NotificationChannel[];
}

export interface NotificationContext {
  timeEntryEdit?: TimeEntryEdit & {
    editor: User;
    laborTimeEntry?: any;
    machineTimeEntry?: any;
  };
  approval?: TimeEntryApproval & {
    approver: User;
    timeEntryEdit: TimeEntryEdit;
  };
  user?: User;
  supervisor?: User;
  workOrder?: any;
  operation?: any;
  [key: string]: any;
}

export type NotificationType =
  | 'EDIT_SUBMITTED'
  | 'EDIT_AUTO_APPROVED'
  | 'EDIT_APPROVED'
  | 'EDIT_REJECTED'
  | 'EDIT_MORE_INFO_NEEDED'
  | 'EDIT_ESCALATED'
  | 'APPROVAL_REQUIRED'
  | 'APPROVAL_REMINDER'
  | 'AUTO_STOP_WARNING'
  | 'AUTO_STOP_EXECUTED'
  | 'BULK_APPROVAL_COMPLETED'
  | 'DELEGATION_GRANTED'
  | 'DELEGATION_EXPIRED';

export type NotificationChannel = 'EMAIL' | 'SMS' | 'IN_APP' | 'PUSH' | 'WEBHOOK';

export interface NotificationRequest {
  type: NotificationType;
  recipients: string[]; // User IDs
  context: NotificationContext;
  channels?: NotificationChannel[];
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  delay?: number; // Delay in minutes
  groupKey?: string; // For grouping related notifications
}

export interface NotificationPreferences {
  userId: string;
  editSubmitted: NotificationChannel[];
  editApproved: NotificationChannel[];
  editRejected: NotificationChannel[];
  approvalRequired: NotificationChannel[];
  autoStopWarning: NotificationChannel[];
  reminderFrequency: 'IMMEDIATE' | 'HOURLY' | 'DAILY' | 'WEEKLY';
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    timezone: string;
  };
}

export class TimeEntryNotificationService {
  private templates: Map<NotificationType, NotificationTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  /**
   * Send notification for time entry edit submission
   */
  async notifyEditSubmitted(edit: TimeEntryEdit, autoApproved: boolean = false): Promise<void> {
    const context = await this.buildEditContext(edit);

    // Notify editor
    await this.sendNotification({
      type: autoApproved ? 'EDIT_AUTO_APPROVED' : 'EDIT_SUBMITTED',
      recipients: [edit.editedBy],
      context,
      channels: ['IN_APP', 'EMAIL'],
      priority: 'NORMAL',
    });

    // Notify supervisors if approval required
    if (!autoApproved && edit.approvalRequired) {
      const supervisors = await this.getSupervisors(edit);
      await this.sendNotification({
        type: 'APPROVAL_REQUIRED',
        recipients: supervisors.map(s => s.id),
        context,
        channels: ['IN_APP', 'EMAIL'],
        priority: 'HIGH',
        groupKey: `approval-required-${edit.id}`,
      });
    }
  }

  /**
   * Send notification for approval decision
   */
  async notifyApprovalDecision(approval: TimeEntryApproval): Promise<void> {
    const context = await this.buildApprovalContext(approval);

    let type: NotificationType;
    switch (approval.status) {
      case ApprovalStatus.APPROVED:
        type = 'EDIT_APPROVED';
        break;
      case ApprovalStatus.REJECTED:
        type = 'EDIT_REJECTED';
        break;
      case ApprovalStatus.MORE_INFO_NEEDED:
        type = 'EDIT_MORE_INFO_NEEDED';
        break;
      case ApprovalStatus.ESCALATED:
        type = 'EDIT_ESCALATED';
        break;
      default:
        return; // No notification for other statuses
    }

    // Notify the original editor
    await this.sendNotification({
      type,
      recipients: [approval.timeEntryEdit.editedBy],
      context,
      channels: ['IN_APP', 'EMAIL'],
      priority: approval.status === ApprovalStatus.REJECTED ? 'HIGH' : 'NORMAL',
    });

    // If escalated, notify the escalation target
    if (approval.status === ApprovalStatus.ESCALATED && approval.escalatedTo) {
      await this.sendNotification({
        type: 'APPROVAL_REQUIRED',
        recipients: [approval.escalatedTo],
        context,
        channels: ['IN_APP', 'EMAIL'],
        priority: 'HIGH',
      });
    }
  }

  /**
   * Send auto-stop notifications
   */
  async notifyAutoStop(
    timeEntryId: string,
    timeEntryType: TimeEntryType,
    behavior: AutoStopBehavior,
    reason: string,
    userId?: string
  ): Promise<void> {
    const context = {
      timeEntryId,
      timeEntryType,
      behavior,
      reason,
      timestamp: new Date(),
    };

    if (behavior === AutoStopBehavior.PROMPT_OPERATOR && userId) {
      // Send prompt notification to operator
      await this.sendNotification({
        type: 'AUTO_STOP_WARNING',
        recipients: [userId],
        context,
        channels: ['IN_APP', 'PUSH', 'SMS'],
        priority: 'URGENT',
      });
    } else if (behavior !== AutoStopBehavior.DO_NOTHING && userId) {
      // Send execution notification
      await this.sendNotification({
        type: 'AUTO_STOP_EXECUTED',
        recipients: [userId],
        context,
        channels: ['IN_APP', 'EMAIL'],
        priority: 'HIGH',
      });

      // Notify supervisors
      const supervisors = await this.getSupervisorsByUserId(userId);
      await this.sendNotification({
        type: 'AUTO_STOP_EXECUTED',
        recipients: supervisors.map(s => s.id),
        context,
        channels: ['IN_APP'],
        priority: 'NORMAL',
      });
    }
  }

  /**
   * Send bulk approval completion notification
   */
  async notifyBulkApprovalCompleted(
    batchId: string,
    approverId: string,
    successCount: number,
    errorCount: number
  ): Promise<void> {
    const context = {
      batchId,
      successCount,
      errorCount,
      totalCount: successCount + errorCount,
      timestamp: new Date(),
    };

    await this.sendNotification({
      type: 'BULK_APPROVAL_COMPLETED',
      recipients: [approverId],
      context,
      channels: ['IN_APP', 'EMAIL'],
      priority: errorCount > 0 ? 'HIGH' : 'NORMAL',
    });
  }

  /**
   * Send approval reminders
   */
  async sendApprovalReminders(): Promise<void> {
    // Find pending approvals older than 24 hours
    const pendingApprovals = await prisma.timeEntryEdit.findMany({
      where: {
        approvalStatus: ApprovalStatus.PENDING,
        editedAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        },
      },
      include: {
        editor: true,
        laborTimeEntry: {
          include: { user: true }
        },
      },
    });

    // Group by potential approvers
    const approverGroups = new Map<string, typeof pendingApprovals>();

    for (const edit of pendingApprovals) {
      const supervisors = await this.getSupervisors(edit);

      for (const supervisor of supervisors) {
        if (!approverGroups.has(supervisor.id)) {
          approverGroups.set(supervisor.id, []);
        }
        approverGroups.get(supervisor.id)!.push(edit);
      }
    }

    // Send reminders
    for (const [supervisorId, edits] of approverGroups) {
      const preferences = await this.getUserNotificationPreferences(supervisorId);

      if (this.shouldSendReminder(preferences)) {
        await this.sendNotification({
          type: 'APPROVAL_REMINDER',
          recipients: [supervisorId],
          context: {
            pendingCount: edits.length,
            oldestDays: Math.ceil(
              (Date.now() - Math.min(...edits.map(e => e.editedAt.getTime()))) / (24 * 60 * 60 * 1000)
            ),
            edits: edits.slice(0, 5), // Include up to 5 examples
          },
          channels: preferences.approvalRequired.length > 0 ? preferences.approvalRequired : ['EMAIL'],
          priority: edits.length > 10 ? 'HIGH' : 'NORMAL',
          groupKey: `reminder-${supervisorId}`,
        });
      }
    }
  }

  /**
   * Send notification for delegation events
   */
  async notifyDelegation(
    fromUserId: string,
    toUserId: string,
    delegationType: 'TEMPORARY' | 'PERMANENT',
    expiryDate?: Date
  ): Promise<void> {
    const context = {
      delegationType,
      expiryDate,
      fromUser: await prisma.user.findUnique({ where: { id: fromUserId } }),
      toUser: await prisma.user.findUnique({ where: { id: toUserId } }),
    };

    // Notify delegate
    await this.sendNotification({
      type: 'DELEGATION_GRANTED',
      recipients: [toUserId],
      context,
      channels: ['IN_APP', 'EMAIL'],
      priority: 'HIGH',
    });
  }

  /**
   * Core notification sending method
   */
  private async sendNotification(request: NotificationRequest): Promise<void> {
    try {
      // Get template
      const template = this.templates.get(request.type);
      if (!template) {
        console.warn(`No template found for notification type: ${request.type}`);
        return;
      }

      // Process each recipient
      for (const recipientId of request.recipients) {
        const recipient = await this.getRecipient(recipientId);
        if (!recipient) continue;

        const preferences = await this.getUserNotificationPreferences(recipientId);
        const channels = this.determineChannels(request, preferences);

        if (channels.length === 0) continue;

        // Check quiet hours
        if (this.isInQuietHours(preferences)) {
          if (request.priority !== 'URGENT') {
            await this.scheduleNotification(request, recipientId, channels);
            continue;
          }
        }

        // Render message
        const message = this.renderTemplate(template, request.context, recipient);

        // Send via each channel
        for (const channel of channels) {
          await this.sendViaChannel(channel, recipient, message, request.priority);
        }

        // Store notification record
        await this.storeNotificationRecord(recipientId, request, message);
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  /**
   * Helper methods
   */
  private async buildEditContext(edit: TimeEntryEdit): Promise<NotificationContext> {
    const fullEdit = await prisma.timeEntryEdit.findUnique({
      where: { id: edit.id },
      include: {
        editor: true,
        laborTimeEntry: {
          include: {
            user: true,
            workOrder: true,
            operation: true,
            indirectCode: true,
          }
        },
        machineTimeEntry: {
          include: {
            equipment: true,
            workOrder: true,
            operation: true,
          }
        },
      },
    });

    return {
      timeEntryEdit: fullEdit,
      workOrder: fullEdit?.laborTimeEntry?.workOrder || fullEdit?.machineTimeEntry?.workOrder,
      operation: fullEdit?.laborTimeEntry?.operation || fullEdit?.machineTimeEntry?.operation,
    };
  }

  private async buildApprovalContext(approval: TimeEntryApproval): Promise<NotificationContext> {
    const fullApproval = await prisma.timeEntryApproval.findUnique({
      where: { id: approval.id },
      include: {
        approver: true,
        timeEntryEdit: {
          include: {
            editor: true,
            laborTimeEntry: {
              include: {
                user: true,
                workOrder: true,
                operation: true,
              }
            },
          }
        },
      },
    });

    return {
      approval: fullApproval,
      timeEntryEdit: fullApproval?.timeEntryEdit,
    };
  }

  private async getSupervisors(edit: TimeEntryEdit): Promise<User[]> {
    // Get supervisors based on site roles
    // This is a simplified implementation
    return await prisma.user.findMany({
      where: {
        userRoles: {
          some: {
            role: {
              name: { in: ['SUPERVISOR', 'MANAGER'] }
            }
          }
        }
      }
    });
  }

  private async getSupervisorsByUserId(userId: string): Promise<User[]> {
    // Get supervisors for a specific user
    return await prisma.user.findMany({
      where: {
        userRoles: {
          some: {
            role: {
              name: { in: ['SUPERVISOR', 'MANAGER'] }
            }
          }
        }
      }
    });
  }

  private async getRecipient(userId: string): Promise<NotificationRecipient | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return null;

    return {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      phone: user.phoneNumber,
      preferredChannels: ['IN_APP', 'EMAIL'], // Default preferences
    };
  }

  private async getUserNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    // This would typically come from a user preferences table
    // For now, return defaults
    return {
      userId,
      editSubmitted: ['IN_APP'],
      editApproved: ['IN_APP', 'EMAIL'],
      editRejected: ['IN_APP', 'EMAIL'],
      approvalRequired: ['IN_APP', 'EMAIL'],
      autoStopWarning: ['IN_APP', 'PUSH', 'SMS'],
      reminderFrequency: 'DAILY',
      quietHours: {
        enabled: true,
        startTime: '22:00',
        endTime: '06:00',
        timezone: 'UTC',
      },
    };
  }

  private determineChannels(
    request: NotificationRequest,
    preferences: NotificationPreferences
  ): NotificationChannel[] {
    if (request.channels) {
      return request.channels;
    }

    // Map notification types to preference settings
    switch (request.type) {
      case 'EDIT_SUBMITTED':
      case 'EDIT_AUTO_APPROVED':
        return preferences.editSubmitted;
      case 'EDIT_APPROVED':
        return preferences.editApproved;
      case 'EDIT_REJECTED':
        return preferences.editRejected;
      case 'APPROVAL_REQUIRED':
        return preferences.approvalRequired;
      case 'AUTO_STOP_WARNING':
        return preferences.autoStopWarning;
      default:
        return ['IN_APP'];
    }
  }

  private isInQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHours.enabled) return false;

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:mm

    const startTime = preferences.quietHours.startTime;
    const endTime = preferences.quietHours.endTime;

    if (startTime <= endTime) {
      // Same day range (e.g., 09:00 - 17:00)
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Overnight range (e.g., 22:00 - 06:00)
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  private shouldSendReminder(preferences: NotificationPreferences): boolean {
    // Simple logic - in real implementation, would check last reminder time
    return preferences.reminderFrequency !== 'WEEKLY' || Math.random() > 0.8;
  }

  private renderTemplate(
    template: NotificationTemplate,
    context: NotificationContext,
    recipient: NotificationRecipient
  ): { subject: string; htmlBody: string; textBody: string } {
    const variables = {
      ...context,
      recipient,
      timestamp: new Date().toISOString(),
    };

    const subject = this.interpolateTemplate(template.subject, variables);
    const htmlBody = this.interpolateTemplate(template.htmlBody, variables);
    const textBody = this.interpolateTemplate(template.textBody, variables);

    return { subject, htmlBody, textBody };
  }

  private interpolateTemplate(template: string, variables: any): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const value = this.getNestedValue(variables, path);
      return value !== undefined ? String(value) : match;
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private async sendViaChannel(
    channel: NotificationChannel,
    recipient: NotificationRecipient,
    message: { subject: string; htmlBody: string; textBody: string },
    priority?: string
  ): Promise<void> {
    switch (channel) {
      case 'EMAIL':
        await this.sendEmail(recipient, message);
        break;
      case 'SMS':
        await this.sendSMS(recipient, message.textBody);
        break;
      case 'IN_APP':
        await this.sendInAppNotification(recipient, message);
        break;
      case 'PUSH':
        await this.sendPushNotification(recipient, message.subject, message.textBody);
        break;
      case 'WEBHOOK':
        await this.sendWebhook(recipient, message, priority);
        break;
    }
  }

  private async sendEmail(recipient: NotificationRecipient, message: any): Promise<void> {
    // Integration with email service (SendGrid, AWS SES, etc.)
    console.log(`Sending email to ${recipient.email}: ${message.subject}`);
  }

  private async sendSMS(recipient: NotificationRecipient, text: string): Promise<void> {
    // Integration with SMS service (Twilio, AWS SNS, etc.)
    console.log(`Sending SMS to ${recipient.phone}: ${text}`);
  }

  private async sendInAppNotification(recipient: NotificationRecipient, message: any): Promise<void> {
    // Store in database for in-app display
    console.log(`Sending in-app notification to ${recipient.id}: ${message.subject}`);
  }

  private async sendPushNotification(recipient: NotificationRecipient, title: string, body: string): Promise<void> {
    // Integration with push notification service
    console.log(`Sending push notification to ${recipient.id}: ${title}`);
  }

  private async sendWebhook(recipient: NotificationRecipient, message: any, priority?: string): Promise<void> {
    // Send to webhook endpoint
    console.log(`Sending webhook for ${recipient.id}: ${message.subject}`);
  }

  private async scheduleNotification(
    request: NotificationRequest,
    recipientId: string,
    channels: NotificationChannel[]
  ): Promise<void> {
    // Schedule notification for later (outside quiet hours)
    console.log(`Scheduling notification for ${recipientId} after quiet hours`);
  }

  private async storeNotificationRecord(
    recipientId: string,
    request: NotificationRequest,
    message: any
  ): Promise<void> {
    // Store notification in database for audit/tracking
    console.log(`Storing notification record for ${recipientId}: ${request.type}`);
  }

  private initializeTemplates(): void {
    // Initialize notification templates
    this.templates.set('EDIT_SUBMITTED', {
      id: 'edit-submitted',
      name: 'Edit Submitted',
      type: 'EDIT_SUBMITTED',
      subject: 'Time Entry Edit Submitted',
      htmlBody: `
        <h3>Time Entry Edit Submitted</h3>
        <p>Your time entry edit has been submitted for approval.</p>
        <p><strong>Reason:</strong> {{timeEntryEdit.reason}}</p>
        <p><strong>Changes:</strong> {{timeEntryEdit.changedFields.length}} field(s)</p>
      `,
      textBody: 'Your time entry edit has been submitted for approval. Reason: {{timeEntryEdit.reason}}',
      variables: ['timeEntryEdit'],
    });

    this.templates.set('EDIT_AUTO_APPROVED', {
      id: 'edit-auto-approved',
      name: 'Edit Auto-Approved',
      type: 'EDIT_AUTO_APPROVED',
      subject: 'Time Entry Edit Auto-Approved',
      htmlBody: `
        <h3>Time Entry Edit Auto-Approved</h3>
        <p>Your time entry edit has been automatically approved and applied.</p>
        <p><strong>Reason:</strong> {{timeEntryEdit.reason}}</p>
      `,
      textBody: 'Your time entry edit has been automatically approved. Reason: {{timeEntryEdit.reason}}',
      variables: ['timeEntryEdit'],
    });

    this.templates.set('APPROVAL_REQUIRED', {
      id: 'approval-required',
      name: 'Approval Required',
      type: 'APPROVAL_REQUIRED',
      subject: 'Time Entry Approval Required',
      htmlBody: `
        <h3>Time Entry Approval Required</h3>
        <p>A time entry edit requires your approval.</p>
        <p><strong>Editor:</strong> {{timeEntryEdit.editor.firstName}} {{timeEntryEdit.editor.lastName}}</p>
        <p><strong>Reason:</strong> {{timeEntryEdit.reason}}</p>
        <p><strong>Risk Score:</strong> {{timeEntryEdit.riskScore}}/100</p>
      `,
      textBody: 'Time entry edit from {{timeEntryEdit.editor.firstName}} {{timeEntryEdit.editor.lastName}} requires approval. Risk: {{timeEntryEdit.riskScore}}/100',
      variables: ['timeEntryEdit'],
    });

    // Add more templates...
  }
}

export const timeEntryNotificationService = new TimeEntryNotificationService();