/**
 * CorrectiveActionService - CAPA (Corrective & Preventive Action) Tracking
 * Issue #56: CAPA Tracking System
 *
 * Manages the full lifecycle of corrective and preventive actions including:
 * - Creation and planning
 * - Implementation tracking
 * - Effectiveness verification
 * - Integration with NCR workflow
 * - Notifications and escalations
 * - Audit trail tracking
 */

import { PrismaClient } from '@prisma/client';
import type { CorrectiveAction } from '@prisma/client';
import { QMSCAStatus } from '@prisma/client';
import type { QMSCASource, QMSRCAMethod } from '@prisma/client';
import { BaseService } from './BaseService';
import { notificationService } from './NotificationService';
// Note: logger is no longer imported - use this.logInfo/Error/Warn from BaseService

interface CreateCAParams {
  title: string;
  description: string;
  source: QMSCASource;
  sourceReference?: string;
  assignedToId: string;
  targetDate: Date;
  verificationDueDate?: Date;
  rootCauseMethod?: QMSRCAMethod;
  rootCause?: string;
  correctiveAction: string;
  preventiveAction?: string;
  createdById: string;
  estimatedCost?: number;
  verificationMethod?: string;
}

interface UpdateCAParams {
  title?: string;
  description?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  targetDate?: Date;
  rootCause?: string;
  rootCauseMethod?: QMSRCAMethod;
}

interface VerifyCAParams {
  verifiedById: string;
  verifiedAt: Date;
  isEffective: boolean;
  verificationMethod?: string;
  notes?: string;
}

interface AuditTrailEntry {
  id: string;
  caId: string;
  userId: string;
  action: string;
  previousValue?: Record<string, any>;
  newValue?: Record<string, any>;
  notes?: string;
  timestamp: Date;
}

export class CorrectiveActionService extends BaseService {
  constructor(prisma?: PrismaClient) {
    super(prisma, 'CorrectiveActionService');
  }

  /**
   * Creates a new corrective action
   */
  async createCorrectiveAction(params: CreateCAParams): Promise<CorrectiveAction> {
    try {
      // Generate unique CA number
      const caNumber = this.generateCANumber();

      const ca = await this.prisma.correctiveAction.create({
        data: {
          caNumber,
          title: params.title,
          description: params.description,
          source: params.source,
          sourceReference: params.sourceReference,
          assignedToId: params.assignedToId,
          targetDate: params.targetDate,
          rootCauseMethod: params.rootCauseMethod,
          rootCause: params.rootCause,
          correctiveAction: params.correctiveAction,
          preventiveAction: params.preventiveAction,
          createdById: params.createdById,
          verificationMethod: params.verificationMethod,
          status: QMSCAStatus.OPEN,
        },
        include: {
          assignedTo: true,
          createdBy: true,
        },
      });

      // Send notification to assigned person
      try {
        await notificationService.createNotification({
          userId: params.assignedToId,
          type: 'APPROVAL_GRANTED' as any,
          title: `Corrective Action Assigned: ${caNumber}`,
          message: `You have been assigned corrective action: ${params.title}`,
          relatedEntityType: 'CORRECTIVE_ACTION',
          relatedEntityId: ca.id,
          actionUrl: `/quality/corrective-actions/${ca.id}`,
          priority: 'HIGH',
        });
      } catch (error) {
        this.logWarn('Failed to send CAPA assignment notification', { error, caId: ca.id });
      }

      // Record creation in audit trail
      await this.recordAuditTrail(
        ca.id,
        params.createdById,
        'CREATED',
        undefined,
        {
          caNumber: ca.caNumber,
          title: ca.title,
          status: ca.status,
          assignedToId: ca.assignedToId,
          targetDate: ca.targetDate,
        },
        'Corrective action created'
      );

      this.logInfo('Corrective action created', { caNumber, assignedToId: params.assignedToId });
      return ca;
    } catch (error) {
      this.logError('Failed to create corrective action', { error });
      throw error;
    }
  }

  /**
   * Gets a corrective action by ID
   */
  async getCorrectiveAction(id: string): Promise<CorrectiveAction | null> {
    try {
      return await this.prisma.correctiveAction.findUnique({
        where: { id },
        include: {
          assignedTo: true,
          verifiedBy: true,
          createdBy: true,
        },
      });
    } catch (error) {
      this.logError('Failed to fetch corrective action', { error, id });
      throw error;
    }
  }

  /**
   * Lists corrective actions with filtering
   */
  async listCorrectiveActions(filters?: {
    status?: QMSCAStatus;
    assignedToId?: string;
    source?: QMSCASource;
    limit?: number;
    offset?: number;
  }): Promise<{ actions: CorrectiveAction[]; total: number }> {
    try {
      const where: any = {};

      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.assignedToId) {
        where.assignedToId = filters.assignedToId;
      }

      if (filters?.source) {
        where.source = filters.source;
      }

      const limit = Math.min(filters?.limit || 50, 100);
      const offset = filters?.offset || 0;

      const [actions, total] = await Promise.all([
        this.prisma.correctiveAction.findMany({
          where,
          include: {
            assignedTo: true,
            createdBy: true,
            verifiedBy: true,
          },
          orderBy: { targetDate: 'asc' },
          take: limit,
          skip: offset,
        }),
        this.prisma.correctiveAction.count({ where }),
      ]);

      return { actions, total };
    } catch (error) {
      this.logError('Failed to list corrective actions', { error });
      throw error;
    }
  }

  /**
   * Gets corrective actions assigned to a user
   */
  async getMyCorrectiveActions(userId: string, status?: QMSCAStatus): Promise<CorrectiveAction[]> {
    try {
      const where: any = {
        assignedToId: userId,
      };

      if (status) {
        where.status = status;
      }

      return await this.prisma.correctiveAction.findMany({
        where,
        include: {
          assignedTo: true,
          createdBy: true,
          verifiedBy: true,
        },
        orderBy: { targetDate: 'asc' },
      });
    } catch (error) {
      this.logError('Failed to fetch user corrective actions', { error, userId });
      throw error;
    }
  }

  /**
   * Updates a corrective action
   */
  async updateCorrectiveAction(id: string, params: UpdateCAParams): Promise<CorrectiveAction> {
    try {
      const ca = await this.prisma.correctiveAction.update({
        where: { id },
        data: {
          ...(params.title && { title: params.title }),
          ...(params.description && { description: params.description }),
          ...(params.correctiveAction && { correctiveAction: params.correctiveAction }),
          ...(params.preventiveAction && { preventiveAction: params.preventiveAction }),
          ...(params.targetDate && { targetDate: params.targetDate }),
          ...(params.rootCause && { rootCause: params.rootCause }),
          ...(params.rootCauseMethod && { rootCauseMethod: params.rootCauseMethod }),
        },
        include: {
          assignedTo: true,
          createdBy: true,
          verifiedBy: true,
        },
      });

      this.logInfo('Corrective action updated', { caId: id });
      return ca;
    } catch (error) {
      this.logError('Failed to update corrective action', { error, id });
      throw error;
    }
  }

  /**
   * Marks corrective action as in progress
   */
  async markInProgress(id: string, userId: string): Promise<CorrectiveAction> {
    try {
      const ca = await this.prisma.correctiveAction.update({
        where: { id },
        data: {
          status: QMSCAStatus.IN_PROGRESS,
        },
        include: {
          assignedTo: true,
          createdBy: true,
        },
      });

      // Notify relevant parties
      try {
        await notificationService.createNotification({
          userId: ca.assignedToId,
          type: 'APPROVAL_GRANTED' as any,
          title: `CA In Progress: ${ca.caNumber}`,
          message: `You have started implementation of corrective action: ${ca.title}`,
          relatedEntityType: 'CORRECTIVE_ACTION',
          relatedEntityId: ca.id,
          actionUrl: `/quality/corrective-actions/${ca.id}`,
          priority: 'MEDIUM',
        });
      } catch (error) {
        this.logWarn('Failed to send in-progress notification', { error, caId: ca.id });
      }

      // Record status change in audit trail
      await this.recordAuditTrail(
        id,
        userId,
        'STATUS_CHANGED',
        { status: QMSCAStatus.OPEN },
        { status: QMSCAStatus.IN_PROGRESS },
        'Status updated to IN_PROGRESS'
      );

      this.logInfo('Corrective action marked in progress', { caId: id, userId });
      return ca;
    } catch (error) {
      this.logError('Failed to mark corrective action in progress', { error, id });
      throw error;
    }
  }

  /**
   * Marks corrective action as implemented
   */
  async markImplemented(id: string, userId: string, implementedDate?: Date): Promise<CorrectiveAction> {
    try {
      const ca = await this.prisma.correctiveAction.update({
        where: { id },
        data: {
          status: QMSCAStatus.IMPLEMENTED,
          implementedDate: implementedDate || new Date(),
        },
        include: {
          assignedTo: true,
          createdBy: true,
        },
      });

      // Notify quality team for verification
      try {
        await notificationService.createNotification({
          userId: ca.assignedToId,
          type: 'APPROVAL_GRANTED' as any,
          title: `CA Implemented: ${ca.caNumber}`,
          message: `Implementation complete for: ${ca.title}. Ready for effectiveness verification.`,
          relatedEntityType: 'CORRECTIVE_ACTION',
          relatedEntityId: ca.id,
          actionUrl: `/quality/corrective-actions/${ca.id}`,
          priority: 'MEDIUM',
        });
      } catch (error) {
        this.logWarn('Failed to send implementation notification', { error, caId: ca.id });
      }

      // Record status change in audit trail
      await this.recordAuditTrail(
        id,
        userId,
        'STATUS_CHANGED',
        { status: QMSCAStatus.IN_PROGRESS },
        { status: QMSCAStatus.IMPLEMENTED },
        'Status updated to IMPLEMENTED'
      );

      this.logInfo('Corrective action marked implemented', { caId: id, userId });
      return ca;
    } catch (error) {
      this.logError('Failed to mark corrective action implemented', { error, id });
      throw error;
    }
  }

  /**
   * Verifies effectiveness of a corrective action
   */
  async verifyEffectiveness(id: string, params: VerifyCAParams): Promise<CorrectiveAction> {
    try {
      const newStatus = params.isEffective
        ? QMSCAStatus.VERIFIED_EFFECTIVE
        : QMSCAStatus.VERIFIED_INEFFECTIVE;

      const ca = await this.prisma.correctiveAction.update({
        where: { id },
        data: {
          status: newStatus,
          verifiedById: params.verifiedById,
          verifiedAt: params.verifiedAt,
          isEffective: params.isEffective,
          verificationMethod: params.verificationMethod,
        },
        include: {
          assignedTo: true,
          createdBy: true,
          verifiedBy: true,
        },
      });

      // Notify assigned person of verification result
      try {
        const notificationType = params.isEffective ? 'APPROVAL_GRANTED' : 'APPROVAL_REJECTED';
        const message = params.isEffective
          ? `Your corrective action has been verified as effective`
          : `Your corrective action was not effective and requires replanning`;

        await notificationService.createNotification({
          userId: ca.assignedToId,
          type: notificationType as any,
          title: `Verification: ${ca.title}`,
          message,
          relatedEntityType: 'CORRECTIVE_ACTION',
          relatedEntityId: ca.id,
          actionUrl: `/quality/corrective-actions/${ca.id}`,
          priority: params.isEffective ? 'MEDIUM' : 'HIGH',
        });
      } catch (error) {
        this.logWarn('Failed to send verification notification', { error, caId: ca.id });
      }

      // Record verification in audit trail
      await this.recordAuditTrail(
        id,
        params.verifiedById,
        'VERIFIED',
        { status: QMSCAStatus.IMPLEMENTED },
        { status: newStatus, isEffective: params.isEffective },
        `CA verified as ${params.isEffective ? 'effective' : 'ineffective'}`
      );

      this.logInfo('Corrective action verified', {
        caId: id,
        isEffective: params.isEffective,
        verifiedById: params.verifiedById,
      });

      return ca;
    } catch (error) {
      this.logError('Failed to verify corrective action', { error, id });
      throw error;
    }
  }

  /**
   * Marks a corrective action as cancelled
   */
  async cancel(id: string, userId: string, reason?: string): Promise<CorrectiveAction> {
    try {
      const ca = await this.prisma.correctiveAction.update({
        where: { id },
        data: {
          status: QMSCAStatus.CANCELLED,
        },
        include: {
          assignedTo: true,
          createdBy: true,
        },
      });

      this.logInfo('Corrective action cancelled', { caId: id, userId, reason });
      return ca;
    } catch (error) {
      this.logError('Failed to cancel corrective action', { error, id });
      throw error;
    }
  }

  /**
   * Checks for overdue corrective actions
   */
  async getOverdueActions(): Promise<CorrectiveAction[]> {
    try {
      const now = new Date();

      const overdueActions = await this.prisma.correctiveAction.findMany({
        where: {
          targetDate: {
            lt: now,
          },
          status: {
            in: [QMSCAStatus.OPEN, QMSCAStatus.IN_PROGRESS],
          },
        },
        include: {
          assignedTo: true,
          createdBy: true,
        },
        orderBy: { targetDate: 'asc' },
      });

      return overdueActions;
    } catch (error) {
      this.logError('Failed to fetch overdue corrective actions', { error });
      throw error;
    }
  }

  /**
   * Gets corrective action statistics
   */
  async getStatistics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    overdue: number;
    effectiveness: {
      effective: number;
      ineffective: number;
      pending: number;
      effectivenessRate: number;
    };
  }> {
    try {
      const total = await this.prisma.correctiveAction.count();

      const byStatus = await Promise.all(
        Object.values(QMSCAStatus).map(async (status) => ({
          status,
          count: await this.prisma.correctiveAction.count({
            where: { status },
          }),
        }))
      );

      const now = new Date();
      const overdue = await this.prisma.correctiveAction.count({
        where: {
          targetDate: { lt: now },
          status: {
            in: [QMSCAStatus.OPEN, QMSCAStatus.IN_PROGRESS],
          },
        },
      });

      const effective = await this.prisma.correctiveAction.count({
        where: {
          status: QMSCAStatus.VERIFIED_EFFECTIVE,
          isEffective: true,
        },
      });

      const ineffective = await this.prisma.correctiveAction.count({
        where: {
          status: QMSCAStatus.VERIFIED_INEFFECTIVE,
        },
      });

      const pending = await this.prisma.correctiveAction.count({
        where: {
          status: {
            in: [
              QMSCAStatus.OPEN,
              QMSCAStatus.IN_PROGRESS,
              QMSCAStatus.IMPLEMENTED,
            ],
          },
        },
      });

      const totalVerified = effective + ineffective;
      const effectivenessRate = totalVerified > 0 ? (effective / totalVerified) * 100 : 0;

      return {
        total,
        byStatus: Object.fromEntries(byStatus.map((item) => [item.status, item.count])),
        overdue,
        effectiveness: {
          effective,
          ineffective,
          pending,
          effectivenessRate,
        },
      };
    } catch (error) {
      this.logError('Failed to fetch corrective action statistics', { error });
      throw error;
    }
  }

  /**
   * Gets audit trail for a corrective action
   */
  async getAuditTrail(caId: string): Promise<AuditTrailEntry[]> {
    try {
      this.logInfo('Fetching audit trail', { caId });

      const auditEntries = await this.prisma.correctiveActionAudit.findMany({
        where: { caId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
      });

      return auditEntries.map((entry) => ({
        id: entry.id,
        caId: entry.caId,
        userId: entry.userId,
        action: entry.action,
        previousValue: entry.previousValue ? JSON.parse(entry.previousValue) : undefined,
        newValue: entry.newValue ? JSON.parse(entry.newValue) : undefined,
        notes: entry.notes || undefined,
        timestamp: entry.timestamp,
      }));
    } catch (error) {
      this.logError('Failed to fetch audit trail', { error, caId });
      throw error;
    }
  }

  /**
   * Gets dashboard metrics for all corrective actions
   */
  async getDashboardMetrics() {
    try {
      this.logInfo('Calculating CAPA dashboard metrics');

      const total = await this.prisma.correctiveAction.count();

      // Get counts by status
      const byStatus: Record<string, number> = {};
      for (const status of Object.values(QMSCAStatus)) {
        byStatus[status] = await this.prisma.correctiveAction.count({
          where: { status },
        });
      }

      // Get overdue count
      const now = new Date();
      const overdue = await this.prisma.correctiveAction.count({
        where: {
          targetDate: { lt: now },
          status: {
            in: [QMSCAStatus.OPEN, QMSCAStatus.IN_PROGRESS],
          },
        },
      });

      // Get approaching deadline count (due in next 7 days)
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const approachingDeadline = await this.prisma.correctiveAction.count({
        where: {
          targetDate: {
            gte: now,
            lte: sevenDaysFromNow,
          },
          status: {
            in: [QMSCAStatus.OPEN, QMSCAStatus.IN_PROGRESS],
          },
        },
      });

      // Calculate average resolution time
      const completedActions = await this.prisma.correctiveAction.findMany({
        where: {
          status: QMSCAStatus.VERIFIED_EFFECTIVE,
          completedDate: { not: null },
        },
        select: {
          createdAt: true,
          completedDate: true,
        },
      });

      let averageResolutionTime = 0;
      if (completedActions.length > 0) {
        const totalTime = completedActions.reduce((sum, action) => {
          if (action.completedDate) {
            return sum + (action.completedDate.getTime() - action.createdAt.getTime());
          }
          return sum;
        }, 0);
        averageResolutionTime = Math.round(totalTime / completedActions.length / (1000 * 60 * 60 * 24)); // in days
      }

      // Calculate effectiveness rate
      const effective = await this.prisma.correctiveAction.count({
        where: { status: QMSCAStatus.VERIFIED_EFFECTIVE },
      });

      const ineffective = await this.prisma.correctiveAction.count({
        where: { status: QMSCAStatus.VERIFIED_INEFFECTIVE },
      });

      const totalVerified = effective + ineffective;
      const effectivenessRate = totalVerified > 0 ? (effective / totalVerified) * 100 : 0;

      this.logInfo('Dashboard metrics calculated', {
        total,
        overdue,
        approachingDeadline,
        effectivenessRate: Math.round(effectivenessRate),
      });

      return {
        total,
        byStatus,
        overdue,
        approachingDeadline,
        averageResolutionTime,
        effectivenessRate: Math.round(effectivenessRate * 100) / 100,
      };
    } catch (error) {
      this.logError('Failed to calculate dashboard metrics', { error });
      throw error;
    }
  }

  /**
   * Requests RCA approval from a designated approver
   */
  async requestRCAApproval(
    caId: string,
    requesterId: string,
    approverId: string,
    dueDate?: Date
  ): Promise<any> {
    try {
      const approvalRequest = await this.prisma.cAApprovalRequest.create({
        data: {
          caId,
          approvalType: 'RCA_APPROVAL',
          requestedBy: requesterId,
          approverUserId: approverId,
          status: 'PENDING',
          dueDate,
        },
      });

      // Send notification to approver
      try {
        await notificationService.createNotification({
          userId: approverId,
          type: 'APPROVAL_GRANTED' as any,
          title: 'RCA Approval Request',
          message: `Root cause analysis requires your approval for corrective action`,
          relatedEntityType: 'CORRECTIVE_ACTION',
          relatedEntityId: caId,
          actionUrl: `/quality/corrective-actions/${caId}`,
          priority: 'HIGH',
        });
      } catch (error) {
        this.logWarn('Failed to send approval request notification', { error, caId });
      }

      this.logInfo('RCA approval requested', {
        caId,
        approverId,
        requesterId,
      });

      return approvalRequest;
    } catch (error) {
      this.logError('Failed to request RCA approval', { error, caId });
      throw error;
    }
  }

  /**
   * Approves root cause analysis
   */
  async approveRCA(id: string, userId: string, approved: boolean, notes?: string): Promise<CorrectiveAction> {
    try {
      // Update approval request
      if (approved) {
        await this.prisma.cAApprovalRequest.updateMany({
          where: {
            caId: id,
            approvalType: 'RCA_APPROVAL',
            approverUserId: userId,
          },
          data: {
            status: 'APPROVED',
            approvalNotes: notes,
            approvedAt: new Date(),
          },
        });
      }

      const ca = await this.prisma.correctiveAction.findUnique({
        where: { id },
        include: {
          assignedTo: true,
          createdBy: true,
          verifiedBy: true,
        },
      });

      if (!ca) {
        throw new Error('Corrective action not found');
      }

      // Record approval in audit trail
      await this.recordAuditTrail(
        id,
        userId,
        'APPROVED',
        { rcaApprovalStatus: 'PENDING' },
        { rcaApprovalStatus: approved ? 'APPROVED' : 'REJECTED' },
        `RCA ${approved ? 'approved' : 'rejected'}: ${notes || 'No comments'}`
      );

      this.logInfo('RCA approval recorded', {
        caId: id,
        userId,
        approved,
        notes,
      });

      return ca;
    } catch (error) {
      this.logError('Failed to approve RCA', { error, id });
      throw error;
    }
  }

  /**
   * Requests effectiveness verification approval
   */
  async requestEffectivenessApproval(
    caId: string,
    requesterId: string,
    approverId: string,
    dueDate?: Date
  ): Promise<any> {
    try {
      const approvalRequest = await this.prisma.cAApprovalRequest.create({
        data: {
          caId,
          approvalType: 'EFFECTIVENESS_APPROVAL',
          requestedBy: requesterId,
          approverUserId: approverId,
          status: 'PENDING',
          dueDate,
        },
      });

      // Send notification to approver
      try {
        await notificationService.createNotification({
          userId: approverId,
          type: 'APPROVAL_GRANTED' as any,
          title: 'Effectiveness Verification Request',
          message: `Effectiveness verification requires your approval for corrective action`,
          relatedEntityType: 'CORRECTIVE_ACTION',
          relatedEntityId: caId,
          actionUrl: `/quality/corrective-actions/${caId}`,
          priority: 'HIGH',
        });
      } catch (error) {
        this.logWarn('Failed to send verification approval notification', { error, caId });
      }

      this.logInfo('Effectiveness approval requested', {
        caId,
        approverId,
        requesterId,
      });

      return approvalRequest;
    } catch (error) {
      this.logError('Failed to request effectiveness approval', { error, caId });
      throw error;
    }
  }

  /**
   * Records an action in the audit trail
   */
  private async recordAuditTrail(
    caId: string,
    userId: string,
    action: string,
    previousValue?: Record<string, any>,
    newValue?: Record<string, any>,
    notes?: string
  ): Promise<void> {
    try {
      await this.prisma.correctiveActionAudit.create({
        data: {
          caId,
          userId,
          action,
          previousValue: previousValue ? JSON.stringify(previousValue) : null,
          newValue: newValue ? JSON.stringify(newValue) : null,
          notes,
        },
      });

      this.logInfo('Audit trail entry recorded', {
        caId,
        userId,
        action,
      });
    } catch (error) {
      this.logWarn('Failed to record audit trail entry', { error, caId, action });
      // Don't throw - audit trail is non-critical
    }
  }

  /**
   * Creates a CAPA from an SPC rule violation
   */
  async createCAFromSPCViolation(
    violationId: string,
    userId: string,
    ruleViolation: any
  ): Promise<CorrectiveAction> {
    try {
      this.logInfo('Creating CA from SPC violation', {
        violationId,
        ruleName: ruleViolation.ruleName,
      });

      // Determine priority based on violation severity
      const priorityMap: Record<string, QMSCASource> = {
        CRITICAL: 'SPC_VIOLATION',
        HIGH: 'SPC_VIOLATION',
        MEDIUM: 'SPC_VIOLATION',
        LOW: 'SPC_VIOLATION',
      };

      // Create CA with SPC violation as source
      const ca = await this.createCorrectiveAction({
        title: `SPC Rule ${ruleViolation.ruleNumber} Violation: ${ruleViolation.ruleName}`,
        description: `Automatic CAPA triggered by SPC rule violation. Value: ${ruleViolation.value}, Rule: ${ruleViolation.ruleName}, Severity: ${ruleViolation.severity}`,
        source: 'SPC_VIOLATION' as any,
        sourceReference: violationId,
        assignedToId: userId,
        targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        correctiveAction: `Investigate SPC rule ${ruleViolation.ruleNumber} violation and implement corrective measures`,
        preventiveAction: 'Establish controls to prevent recurrence of this violation',
        createdById: userId,
        estimatedCost: 0,
        verificationMethod: 'SPC monitoring',
      });

      // Link violation to CA
      await this.prisma.sPCRuleViolation.update({
        where: { id: violationId },
        data: {
          correctiveActionId: ca.id,
        },
      });

      // Send notification
      try {
        await notificationService.createNotification({
          userId,
          type: 'APPROVAL_GRANTED' as any,
          title: `Auto-triggered CA from SPC Violation`,
          message: `CA created for rule ${ruleViolation.ruleNumber}: ${ruleViolation.ruleName}`,
          relatedEntityType: 'CORRECTIVE_ACTION',
          relatedEntityId: ca.id,
          actionUrl: `/quality/corrective-actions/${ca.id}`,
          priority: 'HIGH',
        });
      } catch (error) {
        this.logWarn('Failed to send SPC violation notification', { error, caId: ca.id });
      }

      this.logInfo('CA created from SPC violation', {
        caId: ca.id,
        violationId,
      });

      return ca;
    } catch (error) {
      this.logError('Failed to create CA from SPC violation', { error, violationId });
      throw error;
    }
  }

  /**
   * Links an existing CA to SPC violations for tracking
   */
  async linkCAToSPCViolations(caId: string, violationIds: string[]): Promise<void> {
    try {
      await this.prisma.sPCRuleViolation.updateMany({
        where: { id: { in: violationIds } },
        data: { correctiveActionId: caId },
      });

      this.logInfo('CA linked to SPC violations', {
        caId,
        violationCount: violationIds.length,
      });
    } catch (error) {
      this.logError('Failed to link CA to SPC violations', { error, caId });
      throw error;
    }
  }

  /**
   * Gets SPC violations associated with a CA
   */
  async getSPCViolations(caId: string): Promise<any[]> {
    try {
      const violations = await this.prisma.sPCRuleViolation.findMany({
        where: { correctiveActionId: caId },
        orderBy: { timestamp: 'desc' },
      });

      return violations;
    } catch (error) {
      this.logError('Failed to fetch SPC violations', { error, caId });
      throw error;
    }
  }

  /**
   * Generates a unique CA number
   */
  private generateCANumber(): string {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-4);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `CA-${year}-${timestamp}${random}`;
  }
}

// Lazy-loaded singleton with Proxy for backward compatibility
let _instance: CorrectiveActionService | null = null;

function getInstance(): CorrectiveActionService {
  if (!_instance) {
    _instance = new CorrectiveActionService();
  }
  return _instance;
}

// Export as a Proxy that delegates to the lazy-loaded singleton
export const correctiveActionService = new Proxy({} as CorrectiveActionService, {
  get: (target, prop) => {
    const instance = getInstance();
    return (instance as any)[prop];
  },
});
