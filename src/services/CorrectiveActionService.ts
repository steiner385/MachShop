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
 */

import { PrismaClient } from '@prisma/client';
import type { CorrectiveAction } from '@prisma/client';
import { QMSCAStatus } from '@prisma/client';
import type { QMSCASource, QMSRCAMethod } from '@prisma/client';
import { logger } from '../utils/logger';
import { notificationService } from './NotificationService';

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

export class CorrectiveActionService {
  constructor(private prisma: PrismaClient) {}

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
        logger.warn('Failed to send CAPA assignment notification', { error, caId: ca.id });
      }

      logger.info('Corrective action created', { caNumber, assignedToId: params.assignedToId });
      return ca;
    } catch (error) {
      logger.error('Failed to create corrective action', { error });
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
      logger.error('Failed to fetch corrective action', { error, id });
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
      logger.error('Failed to list corrective actions', { error });
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
      logger.error('Failed to fetch user corrective actions', { error, userId });
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

      logger.info('Corrective action updated', { caId: id });
      return ca;
    } catch (error) {
      logger.error('Failed to update corrective action', { error, id });
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

      logger.info('Corrective action marked in progress', { caId: id, userId });
      return ca;
    } catch (error) {
      logger.error('Failed to mark corrective action in progress', { error, id });
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

      logger.info('Corrective action marked implemented', { caId: id, userId });
      return ca;
    } catch (error) {
      logger.error('Failed to mark corrective action implemented', { error, id });
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
        logger.warn('Failed to send verification notification', { error, caId: ca.id });
      }

      logger.info('Corrective action verified', {
        caId: id,
        isEffective: params.isEffective,
        verifiedById: params.verifiedById,
      });

      return ca;
    } catch (error) {
      logger.error('Failed to verify corrective action', { error, id });
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

      logger.info('Corrective action cancelled', { caId: id, userId, reason });
      return ca;
    } catch (error) {
      logger.error('Failed to cancel corrective action', { error, id });
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
      logger.error('Failed to fetch overdue corrective actions', { error });
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
      logger.error('Failed to fetch corrective action statistics', { error });
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

export const correctiveActionService = new CorrectiveActionService(
  new PrismaClient()
);
