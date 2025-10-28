/**
 * ✅ GITHUB ISSUE #21: Advanced Multi-Stage Approval Workflow Engine
 *
 * WorkflowNotificationService - Service for managing workflow notifications,
 * escalations, reminders, and communication
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import {
  WorkflowEngineError
} from '../types/workflow';
import {
  WorkflowEventType,
  Priority
} from '@prisma/client';

export interface NotificationData {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  htmlContent: string;
  textContent: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  templateId?: string;
  templateData?: Record<string, any>;
  attachments?: NotificationAttachment[];
}

export interface NotificationAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface EscalationContext {
  assignmentId: string;
  workflowInstanceId: string;
  stageNumber: number;
  assignedToId: string;
  escalatedToId: string;
  escalationLevel: number;
  daysPending: number;
  entityType: string;
  entityId: string;
}

export interface ReminderContext {
  assignmentId: string;
  assignedToId: string;
  taskTitle: string;
  dueDate: Date;
  priority: Priority;
  reminderCount: number;
  workflowInstanceId: string;
  entityType: string;
  entityId: string;
}

export interface DigestContext {
  userId: string;
  pendingTasks: Array<{
    id: string;
    title: string;
    dueDate: Date;
    priority: Priority;
    daysPending: number;
  }>;
  overdueTasks: Array<{
    id: string;
    title: string;
    dueDate: Date;
    priority: Priority;
    daysPending: number;
  }>;
  completedToday: number;
}

export class WorkflowNotificationService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // ============================================================================
  // Assignment Notifications
  // ============================================================================

  /**
   * Send assignment notification to approver
   */
  async sendAssignmentNotification(assignmentId: string): Promise<void> {
    try {
      logger.info(`Sending assignment notification for assignment: ${assignmentId}`);

      const assignment = await this.prisma.workflowAssignment.findUnique({
        where: { id: assignmentId },
        include: {
          stageInstance: {
            include: {
              workflowInstance: {
                include: { workflow: true }
              }
            }
          }
        }
      });

      if (!assignment) {
        throw new WorkflowEngineError('Assignment not found', 'ASSIGNMENT_NOT_FOUND');
      }

      const { stageInstance } = assignment;
      const { workflowInstance } = stageInstance;

      // Get user email (would integrate with user service)
      const userEmail = await this.getUserEmail(assignment.assignedToId);
      if (!userEmail) {
        logger.warn(`No email found for user: ${assignment.assignedToId}`);
        return;
      }

      const notificationData: NotificationData = {
        to: [userEmail],
        subject: `New Approval Task: ${workflowInstance.entityType} ${workflowInstance.entityId}`,
        htmlContent: this.generateAssignmentEmailHTML({
          assigneeName: await this.getUserName(assignment.assignedToId),
          stageName: stageInstance.stageName,
          entityType: workflowInstance.entityType,
          entityId: workflowInstance.entityId,
          workflowName: workflowInstance.workflow.name,
          dueDate: assignment.dueDate,
          priority: workflowInstance.priority,
          actionUrl: this.generateActionUrl(assignmentId)
        }),
        textContent: this.generateAssignmentEmailText({
          assigneeName: await this.getUserName(assignment.assignedToId),
          stageName: stageInstance.stageName,
          entityType: workflowInstance.entityType,
          entityId: workflowInstance.entityId,
          workflowName: workflowInstance.workflow.name,
          dueDate: assignment.dueDate,
          priority: workflowInstance.priority
        }),
        priority: this.mapPriorityToNotification(workflowInstance.priority)
      };

      await this.sendNotification(notificationData);

      // Create notification history
      await this.createNotificationHistory({
        workflowInstanceId: workflowInstance.id,
        eventType: 'ASSIGNMENT_NOTIFICATION',
        recipientId: assignment.assignedToId,
        notificationData
      });

      logger.info(`Assignment notification sent successfully for assignment: ${assignmentId}`);
    } catch (error: any) {
      logger.error('Failed to send assignment notification:', {
        error: error?.message || 'Unknown error',
        assignmentId
      });
      throw error instanceof WorkflowEngineError
        ? error
        : new WorkflowEngineError('Failed to send assignment notification', 'NOTIFICATION_ERROR', error);
    }
  }

  /**
   * Send reminder notification for pending assignment
   */
  async sendReminderNotification(assignmentId: string): Promise<void> {
    try {
      logger.info(`Sending reminder notification for assignment: ${assignmentId}`);

      const assignment = await this.prisma.workflowAssignment.findUnique({
        where: { id: assignmentId },
        include: {
          stageInstance: {
            include: {
              workflowInstance: {
                include: { workflow: true }
              }
            }
          }
        }
      });

      if (!assignment) {
        throw new WorkflowEngineError('Assignment not found', 'ASSIGNMENT_NOT_FOUND');
      }

      if (assignment.action) {
        logger.info(`Assignment already completed, skipping reminder: ${assignmentId}`);
        return;
      }

      const { stageInstance } = assignment;
      const { workflowInstance } = stageInstance;

      // Update reminder count
      await this.prisma.workflowTask.updateMany({
        where: { assignmentId },
        data: {
          reminderCount: { increment: 1 },
          lastReminderSent: new Date()
        }
      });

      // Get updated reminder count
      const task = await this.prisma.workflowTask.findFirst({
        where: { assignmentId }
      });

      const userEmail = await this.getUserEmail(assignment.assignedToId);
      if (!userEmail) {
        logger.warn(`No email found for user: ${assignment.assignedToId}`);
        return;
      }

      const daysPending = assignment.dueDate
        ? Math.ceil((new Date().getTime() - assignment.dueDate.getTime()) / (1000 * 3600 * 24))
        : 0;

      const notificationData: NotificationData = {
        to: [userEmail],
        subject: `⏰ Reminder: Pending Approval Task (${task?.reminderCount || 1} of 3)`,
        htmlContent: this.generateReminderEmailHTML({
          assigneeName: await this.getUserName(assignment.assignedToId),
          stageName: stageInstance.stageName,
          entityType: workflowInstance.entityType,
          entityId: workflowInstance.entityId,
          workflowName: workflowInstance.workflow.name,
          dueDate: assignment.dueDate,
          daysPending,
          reminderCount: task?.reminderCount || 1,
          priority: workflowInstance.priority,
          actionUrl: this.generateActionUrl(assignmentId)
        }),
        textContent: this.generateReminderEmailText({
          assigneeName: await this.getUserName(assignment.assignedToId),
          stageName: stageInstance.stageName,
          entityType: workflowInstance.entityType,
          entityId: workflowInstance.entityId,
          daysPending,
          reminderCount: task?.reminderCount || 1
        }),
        priority: daysPending > 3 ? 'HIGH' : 'NORMAL'
      };

      await this.sendNotification(notificationData);

      // Create notification history
      await this.createNotificationHistory({
        workflowInstanceId: workflowInstance.id,
        eventType: 'REMINDER_SENT',
        recipientId: assignment.assignedToId,
        notificationData
      });

      logger.info(`Reminder notification sent successfully for assignment: ${assignmentId}`);
    } catch (error: any) {
      logger.error('Failed to send reminder notification:', {
        error: error?.message || 'Unknown error',
        assignmentId
      });
      throw error instanceof WorkflowEngineError
        ? error
        : new WorkflowEngineError('Failed to send reminder notification', 'REMINDER_ERROR', error);
    }
  }

  /**
   * Send escalation notification
   */
  async sendEscalationNotification(context: EscalationContext): Promise<void> {
    try {
      logger.info(`Sending escalation notification`, {
        assignmentId: context.assignmentId,
        escalationLevel: context.escalationLevel
      });

      const assignment = await this.prisma.workflowAssignment.findUnique({
        where: { id: context.assignmentId },
        include: {
          stageInstance: {
            include: {
              workflowInstance: {
                include: { workflow: true }
              }
            }
          }
        }
      });

      if (!assignment) {
        throw new WorkflowEngineError('Assignment not found', 'ASSIGNMENT_NOT_FOUND');
      }

      const { stageInstance } = assignment;
      const { workflowInstance } = stageInstance;

      // Update assignment with escalation info
      await this.prisma.workflowAssignment.update({
        where: { id: context.assignmentId },
        data: {
          escalationLevel: context.escalationLevel,
          escalatedAt: new Date(),
          escalatedToId: context.escalatedToId
        }
      });

      // Send notification to escalated user
      const escalatedUserEmail = await this.getUserEmail(context.escalatedToId);
      const originalUserEmail = await this.getUserEmail(context.assignedToId);

      if (!escalatedUserEmail) {
        logger.warn(`No email found for escalated user: ${context.escalatedToId}`);
        return;
      }

      const notificationData: NotificationData = {
        to: [escalatedUserEmail],
        cc: originalUserEmail ? [originalUserEmail] : [],
        subject: `🚨 ESCALATED: Overdue Approval Task - ${context.entityType} ${context.entityId}`,
        htmlContent: this.generateEscalationEmailHTML({
          escalatedUserName: await this.getUserName(context.escalatedToId),
          originalUserName: await this.getUserName(context.assignedToId),
          stageName: stageInstance.stageName,
          entityType: context.entityType,
          entityId: context.entityId,
          workflowName: workflowInstance.workflow.name,
          daysPending: context.daysPending,
          escalationLevel: context.escalationLevel,
          priority: workflowInstance.priority,
          actionUrl: this.generateActionUrl(context.assignmentId)
        }),
        textContent: this.generateEscalationEmailText({
          escalatedUserName: await this.getUserName(context.escalatedToId),
          originalUserName: await this.getUserName(context.assignedToId),
          stageName: stageInstance.stageName,
          entityType: context.entityType,
          entityId: context.entityId,
          daysPending: context.daysPending,
          escalationLevel: context.escalationLevel
        }),
        priority: 'HIGH'
      };

      await this.sendNotification(notificationData);

      // Create notification history
      await this.createNotificationHistory({
        workflowInstanceId: context.workflowInstanceId,
        eventType: 'ESCALATED',
        recipientId: context.escalatedToId,
        notificationData
      });

      logger.info(`Escalation notification sent successfully`, {
        assignmentId: context.assignmentId,
        escalatedToId: context.escalatedToId
      });
    } catch (error: any) {
      logger.error('Failed to send escalation notification:', {
        error: error?.message || 'Unknown error',
        context
      });
      throw error instanceof WorkflowEngineError
        ? error
        : new WorkflowEngineError('Failed to send escalation notification', 'ESCALATION_ERROR', error);
    }
  }

  // ============================================================================
  // Workflow Completion Notifications
  // ============================================================================

  /**
   * Send workflow completion notification
   */
  async sendCompletionNotification(workflowInstanceId: string): Promise<void> {
    try {
      logger.info(`Sending completion notification for workflow: ${workflowInstanceId}`);

      const instance = await this.prisma.workflowInstance.findUnique({
        where: { id: workflowInstanceId },
        include: { workflow: true }
      });

      if (!instance) {
        throw new WorkflowEngineError('Workflow instance not found', 'INSTANCE_NOT_FOUND');
      }

      const creatorEmail = await this.getUserEmail(instance.createdById);
      if (!creatorEmail) {
        logger.warn(`No email found for workflow creator: ${instance.createdById}`);
        return;
      }

      const notificationData: NotificationData = {
        to: [creatorEmail],
        subject: `✅ Workflow Completed: ${instance.entityType} ${instance.entityId}`,
        htmlContent: this.generateCompletionEmailHTML({
          creatorName: await this.getUserName(instance.createdById),
          entityType: instance.entityType,
          entityId: instance.entityId,
          workflowName: instance.workflow.name,
          completedAt: instance.completedAt || new Date(),
          totalDays: this.calculateDaysBetween(instance.startedAt, instance.completedAt || new Date())
        }),
        textContent: this.generateCompletionEmailText({
          creatorName: await this.getUserName(instance.createdById),
          entityType: instance.entityType,
          entityId: instance.entityId,
          workflowName: instance.workflow.name,
          completedAt: instance.completedAt || new Date()
        }),
        priority: 'NORMAL'
      };

      await this.sendNotification(notificationData);

      // Create notification history
      await this.createNotificationHistory({
        workflowInstanceId,
        eventType: 'WORKFLOW_COMPLETED',
        recipientId: instance.createdById,
        notificationData
      });

      logger.info(`Completion notification sent successfully for workflow: ${workflowInstanceId}`);
    } catch (error: any) {
      logger.error('Failed to send completion notification:', {
        error: error?.message || 'Unknown error',
        workflowInstanceId
      });
      throw error instanceof WorkflowEngineError
        ? error
        : new WorkflowEngineError('Failed to send completion notification', 'COMPLETION_ERROR', error);
    }
  }

  /**
   * Send workflow rejection notification
   */
  async sendRejectionNotification(workflowInstanceId: string): Promise<void> {
    try {
      logger.info(`Sending rejection notification for workflow: ${workflowInstanceId}`);

      const instance = await this.prisma.workflowInstance.findUnique({
        where: { id: workflowInstanceId },
        include: { workflow: true }
      });

      if (!instance) {
        throw new WorkflowEngineError('Workflow instance not found', 'INSTANCE_NOT_FOUND');
      }

      const creatorEmail = await this.getUserEmail(instance.createdById);
      if (!creatorEmail) {
        logger.warn(`No email found for workflow creator: ${instance.createdById}`);
        return;
      }

      const notificationData: NotificationData = {
        to: [creatorEmail],
        subject: `❌ Workflow Rejected: ${instance.entityType} ${instance.entityId}`,
        htmlContent: this.generateRejectionEmailHTML({
          creatorName: await this.getUserName(instance.createdById),
          entityType: instance.entityType,
          entityId: instance.entityId,
          workflowName: instance.workflow.name,
          rejectedAt: instance.completedAt || new Date()
        }),
        textContent: this.generateRejectionEmailText({
          creatorName: await this.getUserName(instance.createdById),
          entityType: instance.entityType,
          entityId: instance.entityId,
          workflowName: instance.workflow.name,
          rejectedAt: instance.completedAt || new Date()
        }),
        priority: 'HIGH'
      };

      await this.sendNotification(notificationData);

      // Create notification history
      await this.createNotificationHistory({
        workflowInstanceId,
        eventType: 'APPROVAL_REJECTED',
        recipientId: instance.createdById,
        notificationData
      });

      logger.info(`Rejection notification sent successfully for workflow: ${workflowInstanceId}`);
    } catch (error: any) {
      logger.error('Failed to send rejection notification:', {
        error: error?.message || 'Unknown error',
        workflowInstanceId
      });
      throw error instanceof WorkflowEngineError
        ? error
        : new WorkflowEngineError('Failed to send rejection notification', 'REJECTION_ERROR', error);
    }
  }

  // ============================================================================
  // Daily Digest
  // ============================================================================

  /**
   * Send daily digest email to user
   */
  async sendDailyDigest(userId: string): Promise<void> {
    try {
      logger.info(`Sending daily digest to user: ${userId}`);

      // Get user's pending and overdue tasks
      const tasks = await this.prisma.workflowTask.findMany({
        where: {
          assignedToId: userId,
          status: { in: ['PENDING', 'IN_PROGRESS'] }
        },
        orderBy: { dueDate: 'asc' }
      });

      if (tasks.length === 0) {
        logger.info(`No pending tasks for user ${userId}, skipping digest`);
        return;
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const pendingTasks = tasks.filter(t => !t.dueDate || t.dueDate >= today);
      const overdueTasks = tasks.filter(t => t.dueDate && t.dueDate < today);

      // Get completed tasks from today
      const completedToday = await this.prisma.workflowTask.count({
        where: {
          assignedToId: userId,
          status: 'COMPLETED',
          createdAt: { gte: today }
        }
      });

      const userEmail = await this.getUserEmail(userId);
      if (!userEmail) {
        logger.warn(`No email found for user: ${userId}`);
        return;
      }

      const digestContext: DigestContext = {
        userId,
        pendingTasks: pendingTasks.map(t => ({
          id: t.id,
          title: t.taskTitle,
          dueDate: t.dueDate || new Date(),
          priority: t.priority,
          daysPending: this.calculateDaysBetween(t.createdAt, now)
        })),
        overdueTasks: overdueTasks.map(t => ({
          id: t.id,
          title: t.taskTitle,
          dueDate: t.dueDate || new Date(),
          priority: t.priority,
          daysPending: this.calculateDaysBetween(t.dueDate || t.createdAt, now)
        })),
        completedToday
      };

      const notificationData: NotificationData = {
        to: [userEmail],
        subject: `📋 Daily Workflow Digest - ${pendingTasks.length + overdueTasks.length} tasks pending`,
        htmlContent: this.generateDigestEmailHTML(digestContext),
        textContent: this.generateDigestEmailText(digestContext),
        priority: overdueTasks.length > 0 ? 'HIGH' : 'NORMAL'
      };

      await this.sendNotification(notificationData);

      logger.info(`Daily digest sent successfully to user: ${userId}`, {
        pendingCount: pendingTasks.length,
        overdueCount: overdueTasks.length,
        completedToday
      });
    } catch (error: any) {
      logger.error('Failed to send daily digest:', {
        error: error?.message || 'Unknown error',
        userId
      });
      throw error instanceof WorkflowEngineError
        ? error
        : new WorkflowEngineError('Failed to send daily digest', 'DIGEST_ERROR', error);
    }
  }

  // ============================================================================
  // Cron Jobs and Background Tasks
  // ============================================================================

  /**
   * Process pending reminders and escalations (called by cron job)
   */
  async processScheduledNotifications(): Promise<void> {
    try {
      logger.info('Processing scheduled notifications');

      const now = new Date();

      // Find overdue assignments that need reminders
      const overdueAssignments = await this.prisma.workflowTask.findMany({
        where: {
          status: { in: ['PENDING', 'IN_PROGRESS'] },
          dueDate: { lt: now },
          OR: [
            { lastReminderSent: null },
            { lastReminderSent: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } // 24 hours ago
          ]
        },
        take: 100 // Process in batches
      });

      logger.info(`Found ${overdueAssignments.length} assignments needing reminders`);

      for (const task of overdueAssignments) {
        try {
          if (task.reminderCount < 3) {
            await this.sendReminderNotification(task.assignmentId);
          } else {
            // Escalate after 3 reminders
            // TODO: Implement escalation logic based on stage configuration
            logger.info(`Assignment ${task.assignmentId} needs escalation (${task.reminderCount} reminders sent)`);
          }
        } catch (error) {
          logger.error(`Failed to process notification for assignment ${task.assignmentId}:`, error);
        }
      }

      logger.info('Scheduled notifications processing completed');
    } catch (error: any) {
      logger.error('Failed to process scheduled notifications:', error);
      throw error instanceof WorkflowEngineError
        ? error
        : new WorkflowEngineError('Failed to process scheduled notifications', 'SCHEDULED_NOTIFICATION_ERROR', error);
    }
  }

  /**
   * Send daily digests to all users (called by cron job)
   */
  async sendDailyDigests(): Promise<void> {
    try {
      logger.info('Sending daily digests to all users');

      // Get all users with pending tasks
      const usersWithTasks = await this.prisma.workflowTask.findMany({
        where: {
          status: { in: ['PENDING', 'IN_PROGRESS'] }
        },
        select: { assignedToId: true },
        distinct: ['assignedToId']
      });

      logger.info(`Sending digests to ${usersWithTasks.length} users`);

      for (const userTask of usersWithTasks) {
        try {
          await this.sendDailyDigest(userTask.assignedToId);
        } catch (error) {
          logger.error(`Failed to send digest to user ${userTask.assignedToId}:`, error);
        }
      }

      logger.info('Daily digests sent successfully');
    } catch (error: any) {
      logger.error('Failed to send daily digests:', error);
      throw error instanceof WorkflowEngineError
        ? error
        : new WorkflowEngineError('Failed to send daily digests', 'DIGEST_BATCH_ERROR', error);
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async sendNotification(data: NotificationData): Promise<void> {
    try {
      // TODO: Implement actual email sending logic
      // This would integrate with email service like SendGrid, AWS SES, etc.
      logger.info('Sending notification:', {
        to: data.to,
        subject: data.subject,
        priority: data.priority
      });

      // For now, just log the notification
      // In production, this would send actual emails
    } catch (error) {
      logger.error('Failed to send notification:', error);
      throw error;
    }
  }

  private async createNotificationHistory(data: {
    workflowInstanceId: string;
    eventType: WorkflowEventType;
    recipientId: string;
    notificationData: NotificationData;
  }): Promise<void> {
    try {
      await this.prisma.workflowHistory.create({
        data: {
          workflowInstanceId: data.workflowInstanceId,
          eventType: data.eventType,
          eventDescription: `Notification sent to ${data.recipientId}: ${data.notificationData.subject}`,
          performedById: 'system',
          performedByName: 'Notification System',
          details: {
            recipientId: data.recipientId,
            subject: data.notificationData.subject,
            priority: data.notificationData.priority
          }
        }
      });
    } catch (error) {
      logger.error('Failed to create notification history:', error);
      // Don't throw - notification history is not critical
    }
  }

  private async getUserEmail(userId: string): Promise<string | null> {
    // TODO: Implement actual user email lookup
    // This would integrate with user service or database
    return `user-${userId}@company.com`;
  }

  private async getUserName(userId: string): Promise<string> {
    // TODO: Implement actual user name lookup
    // This would integrate with user service or database
    return `User ${userId}`;
  }

  private generateActionUrl(assignmentId: string): string {
    // TODO: Generate actual URL to approval interface
    return `${process.env.FRONTEND_URL || 'http://localhost:3000'}/approvals/${assignmentId}`;
  }

  private mapPriorityToNotification(priority: Priority): 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL' {
    switch (priority) {
      case 'CRITICAL': return 'CRITICAL';
      case 'HIGH': return 'HIGH';
      case 'NORMAL': return 'NORMAL';
      case 'LOW': return 'LOW';
      default: return 'NORMAL';
    }
  }

  private calculateDaysBetween(start: Date, end: Date): number {
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
  }

  // ============================================================================
  // Email Template Generators
  // ============================================================================

  private generateAssignmentEmailHTML(context: any): string {
    return `
      <html>
        <head>
          <style>
            .container { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
            .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .button { background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; }
            .priority-${context.priority.toLowerCase()} { border-left: 4px solid #ef4444; padding-left: 16px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Approval Task Assigned</h1>
            </div>
            <div class="content">
              <div class="priority-${context.priority.toLowerCase()}">
                <p>Hello ${context.assigneeName},</p>

                <p>You have been assigned a new approval task:</p>

                <ul>
                  <li><strong>Stage:</strong> ${context.stageName}</li>
                  <li><strong>Document:</strong> ${context.entityType} ${context.entityId}</li>
                  <li><strong>Workflow:</strong> ${context.workflowName}</li>
                  <li><strong>Due Date:</strong> ${context.dueDate ? context.dueDate.toLocaleDateString() : 'No deadline'}</li>
                  <li><strong>Priority:</strong> ${context.priority}</li>
                </ul>

                <p><a href="${context.actionUrl}" class="button">Review and Approve</a></p>

                <p>Please review and take action on this task at your earliest convenience.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateAssignmentEmailText(context: any): string {
    return `
New Approval Task Assigned

Hello ${context.assigneeName},

You have been assigned a new approval task:

Stage: ${context.stageName}
Document: ${context.entityType} ${context.entityId}
Workflow: ${context.workflowName}
Due Date: ${context.dueDate ? context.dueDate.toLocaleDateString() : 'No deadline'}
Priority: ${context.priority}

Please review and take action on this task at your earliest convenience.

View Task: ${this.generateActionUrl('assignment-id')}
    `;
  }

  private generateReminderEmailHTML(context: any): string {
    return `
      <html>
        <head>
          <style>
            .container { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
            .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .button { background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; }
            .urgent { border-left: 4px solid #ef4444; padding-left: 16px; background-color: #fef2f2; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏰ Approval Task Reminder</h1>
            </div>
            <div class="content">
              <div class="urgent">
                <p>Hello ${context.assigneeName},</p>

                <p>This is reminder #${context.reminderCount} for a pending approval task:</p>

                <ul>
                  <li><strong>Stage:</strong> ${context.stageName}</li>
                  <li><strong>Document:</strong> ${context.entityType} ${context.entityId}</li>
                  <li><strong>Workflow:</strong> ${context.workflowName}</li>
                  <li><strong>Original Due Date:</strong> ${context.dueDate ? context.dueDate.toLocaleDateString() : 'No deadline'}</li>
                  <li><strong>Days Pending:</strong> ${context.daysPending}</li>
                  <li><strong>Priority:</strong> ${context.priority}</li>
                </ul>

                <p><a href="${context.actionUrl}" class="button">Review and Approve Now</a></p>

                <p><strong>Please take immediate action to avoid escalation.</strong></p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateReminderEmailText(context: any): string {
    return `
⏰ Approval Task Reminder

Hello ${context.assigneeName},

This is reminder #${context.reminderCount} for a pending approval task:

Stage: ${context.stageName}
Document: ${context.entityType} ${context.entityId}
Days Pending: ${context.daysPending}

Please take immediate action to avoid escalation.

View Task: ${this.generateActionUrl('assignment-id')}
    `;
  }

  private generateEscalationEmailHTML(context: any): string {
    return `
      <html>
        <head>
          <style>
            .container { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
            .header { background-color: #ef4444; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .button { background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; }
            .critical { border-left: 4px solid #ef4444; padding-left: 16px; background-color: #fef2f2; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚨 ESCALATED: Overdue Approval Task</h1>
            </div>
            <div class="content">
              <div class="critical">
                <p>Hello ${context.escalatedUserName},</p>

                <p>An approval task has been escalated to you due to prolonged delay:</p>

                <ul>
                  <li><strong>Originally Assigned To:</strong> ${context.originalUserName}</li>
                  <li><strong>Stage:</strong> ${context.stageName}</li>
                  <li><strong>Document:</strong> ${context.entityType} ${context.entityId}</li>
                  <li><strong>Workflow:</strong> ${context.workflowName}</li>
                  <li><strong>Days Overdue:</strong> ${context.daysPending}</li>
                  <li><strong>Escalation Level:</strong> ${context.escalationLevel}</li>
                  <li><strong>Priority:</strong> ${context.priority}</li>
                </ul>

                <p><a href="${context.actionUrl}" class="button">Take Action Now</a></p>

                <p><strong>This task requires immediate attention to prevent further delays.</strong></p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateEscalationEmailText(context: any): string {
    return `
🚨 ESCALATED: Overdue Approval Task

Hello ${context.escalatedUserName},

An approval task has been escalated to you due to prolonged delay:

Originally Assigned To: ${context.originalUserName}
Stage: ${context.stageName}
Document: ${context.entityType} ${context.entityId}
Days Overdue: ${context.daysPending}
Escalation Level: ${context.escalationLevel}

This task requires immediate attention to prevent further delays.

Take Action: ${this.generateActionUrl('assignment-id')}
    `;
  }

  private generateCompletionEmailHTML(context: any): string {
    return `
      <html>
        <head>
          <style>
            .container { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
            .header { background-color: #10b981; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .success { border-left: 4px solid #10b981; padding-left: 16px; background-color: #f0fdf4; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Workflow Completed Successfully</h1>
            </div>
            <div class="content">
              <div class="success">
                <p>Hello ${context.creatorName},</p>

                <p>Great news! Your workflow has been completed successfully:</p>

                <ul>
                  <li><strong>Document:</strong> ${context.entityType} ${context.entityId}</li>
                  <li><strong>Workflow:</strong> ${context.workflowName}</li>
                  <li><strong>Completed:</strong> ${context.completedAt.toLocaleDateString()}</li>
                  <li><strong>Total Duration:</strong> ${context.totalDays} days</li>
                </ul>

                <p>All required approvals have been obtained and the document is now active.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateCompletionEmailText(context: any): string {
    return `
✅ Workflow Completed Successfully

Hello ${context.creatorName},

Great news! Your workflow has been completed successfully:

Document: ${context.entityType} ${context.entityId}
Workflow: ${context.workflowName}
Completed: ${context.completedAt.toLocaleDateString()}

All required approvals have been obtained and the document is now active.
    `;
  }

  private generateRejectionEmailHTML(context: any): string {
    return `
      <html>
        <head>
          <style>
            .container { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
            .header { background-color: #ef4444; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .rejection { border-left: 4px solid #ef4444; padding-left: 16px; background-color: #fef2f2; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>❌ Workflow Rejected</h1>
            </div>
            <div class="content">
              <div class="rejection">
                <p>Hello ${context.creatorName},</p>

                <p>Your workflow has been rejected and requires attention:</p>

                <ul>
                  <li><strong>Document:</strong> ${context.entityType} ${context.entityId}</li>
                  <li><strong>Workflow:</strong> ${context.workflowName}</li>
                  <li><strong>Rejected:</strong> ${context.rejectedAt.toLocaleDateString()}</li>
                </ul>

                <p>Please review the feedback and make necessary changes before resubmitting.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateRejectionEmailText(context: any): string {
    return `
❌ Workflow Rejected

Hello ${context.creatorName},

Your workflow has been rejected and requires attention:

Document: ${context.entityType} ${context.entityId}
Workflow: ${context.workflowName}
Rejected: ${context.rejectedAt.toLocaleDateString()}

Please review the feedback and make necessary changes before resubmitting.
    `;
  }

  private generateDigestEmailHTML(context: DigestContext): string {
    const pendingList = context.pendingTasks.map(t =>
      `<li>${t.title} - Due: ${t.dueDate.toLocaleDateString()} (${t.priority})</li>`
    ).join('');

    const overdueList = context.overdueTasks.map(t =>
      `<li><strong>${t.title}</strong> - Overdue by ${t.daysPending} days (${t.priority})</li>`
    ).join('');

    return `
      <html>
        <head>
          <style>
            .container { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
            .header { background-color: #6366f1; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .section { margin-bottom: 20px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 4px; }
            .overdue { background-color: #fef2f2; border-color: #ef4444; }
            .pending { background-color: #f8fafc; border-color: #64748b; }
            .completed { background-color: #f0fdf4; border-color: #10b981; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📋 Daily Workflow Digest</h1>
            </div>
            <div class="content">
              <div class="section completed">
                <h3>✅ Completed Today</h3>
                <p>You completed <strong>${context.completedToday}</strong> tasks today. Great work!</p>
              </div>

              ${context.overdueTasks.length > 0 ? `
              <div class="section overdue">
                <h3>🚨 Overdue Tasks (${context.overdueTasks.length})</h3>
                <ul>${overdueList}</ul>
              </div>
              ` : ''}

              ${context.pendingTasks.length > 0 ? `
              <div class="section pending">
                <h3>⏳ Pending Tasks (${context.pendingTasks.length})</h3>
                <ul>${pendingList}</ul>
              </div>
              ` : ''}
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateDigestEmailText(context: DigestContext): string {
    const pendingList = context.pendingTasks.map(t =>
      `- ${t.title} - Due: ${t.dueDate.toLocaleDateString()} (${t.priority})`
    ).join('\n');

    const overdueList = context.overdueTasks.map(t =>
      `- ${t.title} - Overdue by ${t.daysPending} days (${t.priority})`
    ).join('\n');

    return `
📋 Daily Workflow Digest

✅ Completed Today: ${context.completedToday} tasks

${context.overdueTasks.length > 0 ? `
🚨 Overdue Tasks (${context.overdueTasks.length}):
${overdueList}
` : ''}

${context.pendingTasks.length > 0 ? `
⏳ Pending Tasks (${context.pendingTasks.length}):
${pendingList}
` : ''}
    `;
  }
}

export default WorkflowNotificationService;