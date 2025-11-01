/**
 * CAPA (Corrective & Preventive Action) Service
 * Issue #56: CAPA Tracking System
 *
 * Comprehensive service for managing CAPA lifecycle from creation through
 * effectiveness verification. Integrates with NCR workflow and provides
 * auto-approval logic based on business rules.
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { Logger } from './LoggerService';

export interface CreateCapaInput {
  ncrId: string;
  title: string;
  description: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  plannedDueDate: Date;
  rootCauseAnalysis?: string;
  causeCodeIds?: string[];
  estimatedCost?: number;
  ownerDepartment?: string;
}

export interface UpdateCapaInput {
  title?: string;
  description?: string;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  plannedDueDate?: Date;
  rootCauseAnalysis?: string;
  estimatedCost?: number;
  verificationMethod?: string;
}

export interface CreateCapaActionInput {
  capaId: string;
  actionType: 'IMMEDIATE' | 'PREVENTIVE' | 'CORRECTIVE' | 'SYSTEMIC';
  description: string;
  ownerId: string;
  plannedDueDate: Date;
  estimatedCost?: number;
  estimatedEffort?: string;
  dependsOnActionId?: string;
  requiresApproval?: boolean;
}

export interface UpdateCapaActionInput {
  percentComplete?: number;
  status?: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED';
  actualEffort?: string;
  actualCost?: number;
  notes?: string;
  completedDate?: Date;
}

export interface CreateVerificationInput {
  capaId: string;
  verificationDate: Date;
  verificationMethod: string;
  sampleSize?: number;
  result: 'VERIFIED_EFFECTIVE' | 'VERIFIED_INEFFECTIVE' | 'INCONCLUSIVE';
  metrics?: Record<string, any>;
  evidence?: Record<string, any>;
  verifiedBy: string;
  verificationNotes?: string;
  rootCauseOfFailure?: string;
  recommendedActions?: string;
}

export interface CapaMetrics {
  effectivenessRate: number;
  averageCycleTime: number;
  overdueActionCount: number;
  capasByStatus: Record<string, number>;
  capasByRiskLevel: Record<string, number>;
  totalCost: number;
  costByType: Record<string, number>;
  costByRiskLevel: Record<string, number>;
}

export interface AutoApprovalResult {
  shouldAutoApprove: boolean;
  reason: string;
  approvalThreshold: string;
}

class CapaService {
  private prisma: PrismaClient;
  private logger: Logger;

  constructor(prisma: PrismaClient, logger: Logger) {
    this.prisma = prisma;
    this.logger = logger;
  }

  /**
   * Create a new CAPA from an NCR
   * Auto-assigns owner to the NCR creator
   */
  async createCapaFromNCR(
    ncrId: string,
    input: CreateCapaInput,
    userId: string
  ): Promise<any> {
    try {
      // Fetch NCR to get creator and site information
      const ncr = await this.prisma.nCR.findUnique({
        where: { id: ncrId },
        include: { createdBy: true, site: true },
      });

      if (!ncr) {
        throw new Error(`NCR not found: ${ncrId}`);
      }

      // Generate CAPA number (format: CAPA-YYYY-001)
      const year = new Date().getFullYear();
      const count = await this.prisma.cAPA.count({
        where: {
          createdAt: {
            gte: new Date(`${year}-01-01`),
            lt: new Date(`${year + 1}-01-01`),
          },
        },
      });

      const capaNumber = `CAPA-${year}-${String(count + 1).padStart(4, '0')}`;

      // Create CAPA record
      const capa = await this.prisma.cAPA.create({
        data: {
          capaNumber,
          ncrId,
          siteId: ncr.siteId,
          title: input.title,
          description: input.description,
          status: 'DRAFT',
          riskLevel: input.riskLevel,
          ownerId: input.ownerId || ncr.createdById,
          ownerDepartment: input.ownerDepartment,
          createdById: userId,
          plannedDueDate: input.plannedDueDate,
          rootCauseAnalysis: input.rootCauseAnalysis,
          causeCodeIds: input.causeCodeIds ? JSON.stringify(input.causeCodeIds) : null,
          estimatedCost: input.estimatedCost ? new Prisma.Decimal(input.estimatedCost) : null,
        },
        include: {
          ncr: true,
          owner: true,
          createdBy: true,
          site: true,
          actions: true,
          verifications: true,
          stateHistory: true,
        },
      });

      // Record initial state
      await this.recordStateTransition(
        capa.id,
        null,
        'DRAFT',
        userId,
        'CAPA created from NCR'
      );

      this.logger.info('CAPA created', { capaId: capa.id, capaNumber, ncrId });

      return capa;
    } catch (error) {
      this.logger.error('Failed to create CAPA from NCR', { ncrId, error });
      throw error;
    }
  }

  /**
   * Get CAPA by ID with all relations
   */
  async getCapaById(capaId: string): Promise<any> {
    try {
      const capa = await this.prisma.cAPA.findUnique({
        where: { id: capaId },
        include: {
          ncr: true,
          site: true,
          owner: true,
          createdBy: true,
          approvedBy: true,
          actions: {
            orderBy: { actionNumber: 'asc' },
          },
          verifications: {
            orderBy: { verificationNumber: 'desc' },
          },
          stateHistory: {
            orderBy: { changedAt: 'desc' },
          },
        },
      });

      if (!capa) {
        throw new Error(`CAPA not found: ${capaId}`);
      }

      return capa;
    } catch (error) {
      this.logger.error('Failed to get CAPA', { capaId, error });
      throw error;
    }
  }

  /**
   * Get CAPAs for a site with filtering and pagination
   */
  async getCapasForSite(
    siteId: string,
    filters?: {
      status?: string;
      riskLevel?: string;
      ownerId?: string;
      overdue?: boolean;
      page?: number;
      limit?: number;
    }
  ): Promise<{ items: any[]; total: number; page: number; pageSize: number }> {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const skip = (page - 1) * limit;

      const where: Prisma.CAPAWhereInput = {
        siteId,
      };

      if (filters?.status) {
        where.status = filters.status as any;
      }

      if (filters?.riskLevel) {
        where.riskLevel = filters.riskLevel as any;
      }

      if (filters?.ownerId) {
        where.ownerId = filters.ownerId;
      }

      if (filters?.overdue) {
        where.plannedDueDate = {
          lt: new Date(),
        };
        where.status = { notIn: ['CLOSED', 'CANCELLED'] };
      }

      const [items, total] = await Promise.all([
        this.prisma.cAPA.findMany({
          where,
          include: {
            owner: true,
            ncr: true,
            actions: true,
            verifications: true,
          },
          orderBy: { plannedDueDate: 'asc' },
          skip,
          take: limit,
        }),
        this.prisma.cAPA.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        pageSize: limit,
      };
    } catch (error) {
      this.logger.error('Failed to get CAPAs for site', { siteId, error });
      throw error;
    }
  }

  /**
   * Get all CAPAs related to an NCR
   */
  async getCapasForNCR(ncrId: string): Promise<any[]> {
    try {
      return await this.prisma.cAPA.findMany({
        where: { ncrId },
        include: {
          owner: true,
          actions: true,
          verifications: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error('Failed to get CAPAs for NCR', { ncrId, error });
      throw error;
    }
  }

  /**
   * Update CAPA fields
   */
  async updateCapa(capaId: string, input: UpdateCapaInput, userId: string): Promise<any> {
    try {
      const capa = await this.getCapaById(capaId);

      const updated = await this.prisma.cAPA.update({
        where: { id: capaId },
        data: {
          title: input.title || capa.title,
          description: input.description || capa.description,
          riskLevel: input.riskLevel || capa.riskLevel,
          plannedDueDate: input.plannedDueDate || capa.plannedDueDate,
          rootCauseAnalysis: input.rootCauseAnalysis || capa.rootCauseAnalysis,
          estimatedCost: input.estimatedCost
            ? new Prisma.Decimal(input.estimatedCost)
            : capa.estimatedCost,
          verificationMethod: input.verificationMethod || capa.verificationMethod,
          updatedAt: new Date(),
        },
        include: {
          ncr: true,
          owner: true,
          actions: true,
          verifications: true,
        },
      });

      this.logger.info('CAPA updated', { capaId, updatedBy: userId });
      return updated;
    } catch (error) {
      this.logger.error('Failed to update CAPA', { capaId, error });
      throw error;
    }
  }

  /**
   * Transition CAPA to a new status
   */
  async transitionCapaStatus(
    capaId: string,
    toStatus: string,
    userId: string,
    reason?: string,
    skipApproval?: boolean
  ): Promise<any> {
    try {
      const capa = await this.getCapaById(capaId);

      // Validate transition
      const validTransitions = this.getValidTransitions(capa.status);
      if (!validTransitions.includes(toStatus)) {
        throw new Error(
          `Invalid transition from ${capa.status} to ${toStatus}`
        );
      }

      // Validate pre-conditions for certain transitions
      if (toStatus === 'CLOSED') {
        await this.validateCapaBeforeClose(capaId);
      }

      // Update CAPA status
      const updated = await this.prisma.cAPA.update({
        where: { id: capaId },
        data: {
          status: toStatus as any,
          updatedAt: new Date(),
          closedAt: toStatus === 'CLOSED' ? new Date() : capa.closedAt,
          closedBy: toStatus === 'CLOSED' ? userId : capa.closedBy,
        },
        include: {
          ncr: true,
          owner: true,
          actions: true,
          verifications: true,
          stateHistory: true,
        },
      });

      // Record state transition
      await this.recordStateTransition(
        capaId,
        capa.status as any,
        toStatus as any,
        userId,
        reason
      );

      this.logger.info('CAPA status transitioned', {
        capaId,
        fromStatus: capa.status,
        toStatus,
        transitionedBy: userId,
      });

      return updated;
    } catch (error) {
      this.logger.error('Failed to transition CAPA status', { capaId, toStatus, error });
      throw error;
    }
  }

  /**
   * Add an action to a CAPA
   */
  async addCapaAction(input: CreateCapaActionInput, userId: string): Promise<any> {
    try {
      const capa = await this.getCapaById(input.capaId);

      // Get next action number
      const maxActionNumber = Math.max(
        0,
        ...capa.actions.map((a: any) => a.actionNumber)
      );
      const actionNumber = maxActionNumber + 1;

      // Validate dependencies
      if (input.dependsOnActionId) {
        const dependsOnAction = capa.actions.find(
          (a: any) => a.id === input.dependsOnActionId
        );
        if (!dependsOnAction) {
          throw new Error('Dependent action not found');
        }
        // Ensure due date is after dependent action's due date
        if (input.plannedDueDate <= dependsOnAction.plannedDueDate) {
          throw new Error(
            'Action due date must be after dependent action due date'
          );
        }
      }

      const action = await this.prisma.capaAction.create({
        data: {
          capaId: input.capaId,
          actionNumber,
          actionType: input.actionType as any,
          description: input.description,
          status: 'OPEN',
          ownerId: input.ownerId,
          createdById: userId,
          plannedDueDate: input.plannedDueDate,
          estimatedCost: input.estimatedCost
            ? new Prisma.Decimal(input.estimatedCost)
            : null,
          estimatedEffort: input.estimatedEffort,
          dependsOnActionId: input.dependsOnActionId,
          requiresApproval: input.requiresApproval || false,
        },
        include: {
          capa: true,
          owner: true,
          createdBy: true,
        },
      });

      this.logger.info('CAPA action added', {
        capaId: input.capaId,
        actionId: action.id,
        actionNumber,
      });

      return action;
    } catch (error) {
      this.logger.error('Failed to add CAPA action', { capaId: input.capaId, error });
      throw error;
    }
  }

  /**
   * Update a CAPA action
   */
  async updateCapaAction(
    actionId: string,
    input: UpdateCapaActionInput,
    userId: string
  ): Promise<any> {
    try {
      const action = await this.prisma.capaAction.findUnique({
        where: { id: actionId },
      });

      if (!action) {
        throw new Error(`Action not found: ${actionId}`);
      }

      const updated = await this.prisma.capaAction.update({
        where: { id: actionId },
        data: {
          status: input.status || action.status,
          percentComplete: input.percentComplete !== undefined
            ? input.percentComplete
            : action.percentComplete,
          actualCost: input.actualCost
            ? new Prisma.Decimal(input.actualCost)
            : action.actualCost,
          actualEffort: input.actualEffort || action.actualEffort,
          completedDate: input.completedDate || action.completedDate,
          notes: input.notes || action.notes,
          updatedAt: new Date(),
        },
        include: {
          capa: true,
          owner: true,
        },
      });

      // Check if action should be auto-approved
      if (input.status === 'COMPLETED') {
        const approvalResult = this.shouldAutoApprove(updated);
        if (approvalResult.shouldAutoApprove) {
          updated.approvedBy = userId;
          updated.approvedAt = new Date();
          await this.prisma.capaAction.update({
            where: { id: actionId },
            data: {
              approvedBy: userId,
              approvedAt: new Date(),
            },
          });
        }
      }

      this.logger.info('CAPA action updated', { actionId, updatedBy: userId });
      return updated;
    } catch (error) {
      this.logger.error('Failed to update CAPA action', { actionId, error });
      throw error;
    }
  }

  /**
   * Create an effectiveness verification
   */
  async createVerification(input: CreateVerificationInput): Promise<any> {
    try {
      const capa = await this.getCapaById(input.capaId);

      // Get next verification number
      const maxVerificationNumber = Math.max(
        0,
        ...capa.verifications.map((v: any) => v.verificationNumber)
      );
      const verificationNumber = maxVerificationNumber + 1;

      const verification = await this.prisma.capaVerification.create({
        data: {
          capaId: input.capaId,
          verificationNumber,
          verificationDate: input.verificationDate,
          verificationMethod: input.verificationMethod,
          sampleSize: input.sampleSize,
          result: input.result,
          metrics: input.metrics ? JSON.stringify(input.metrics) : null,
          evidence: input.evidence ? JSON.stringify(input.evidence) : null,
          verifiedBy: input.verifiedBy,
          verificationNotes: input.verificationNotes,
          rootCauseOfFailure: input.rootCauseOfFailure,
          recommendedActions: input.recommendedActions,
          approvalRequired: true,
        },
        include: {
          capa: true,
        },
      });

      // If VERIFIED_INEFFECTIVE, mark CAPA for replanning
      if (input.result === 'VERIFIED_INEFFECTIVE') {
        await this.prisma.cAPA.update({
          where: { id: input.capaId },
          data: {
            requiresReplanning: true,
            replanDate: new Date(),
          },
        });
      }

      // If VERIFIED_EFFECTIVE, allow closure
      if (input.result === 'VERIFIED_EFFECTIVE') {
        await this.prisma.cAPA.update({
          where: { id: input.capaId },
          data: {
            verificationResult: 'VERIFIED_EFFECTIVE',
            verificationApprovedBy: input.verifiedBy,
            verificationApprovedAt: new Date(),
          },
        });
      }

      this.logger.info('CAPA verification created', {
        capaId: input.capaId,
        verificationId: verification.id,
        result: input.result,
      });

      return verification;
    } catch (error) {
      this.logger.error('Failed to create verification', { capaId: input.capaId, error });
      throw error;
    }
  }

  /**
   * Get CAPA metrics for dashboard
   */
  async getCapaMetrics(
    siteId: string,
    dateRange?: { startDate: Date; endDate: Date }
  ): Promise<CapaMetrics> {
    try {
      const where: Prisma.CAPAWhereInput = { siteId };
      if (dateRange) {
        where.createdAt = {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        };
      }

      const capas = await this.prisma.cAPA.findMany({
        where,
        include: {
          actions: true,
          verifications: true,
        },
      });

      // Calculate metrics
      const verifiedCapas = capas.filter((c: any) =>
        c.verifications.some((v: any) => v.result === 'VERIFIED_EFFECTIVE')
      );
      const effectivenessRate =
        capas.length > 0 ? (verifiedCapas.length / capas.length) * 100 : 0;

      const completedCapas = capas.filter(
        (c: any) => c.status === 'CLOSED' && c.actualCompletionDate
      );
      const cycleTimes = completedCapas.map((c: any) => {
        const created = new Date(c.createdAt).getTime();
        const completed = new Date(c.actualCompletionDate).getTime();
        return (completed - created) / (1000 * 60 * 60 * 24); // days
      });
      const averageCycleTime =
        cycleTimes.length > 0
          ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length
          : 0;

      const overdueActions = await this.getOverdueActions(siteId);

      // Group by status
      const capasByStatus: Record<string, number> = {
        DRAFT: 0,
        PLANNED: 0,
        IN_PROGRESS: 0,
        PENDING_VERIFICATION: 0,
        VERIFIED_EFFECTIVE: 0,
        VERIFIED_INEFFECTIVE: 0,
        CLOSED: 0,
        CANCELLED: 0,
      };
      capas.forEach((c: any) => {
        capasByStatus[c.status] = (capasByStatus[c.status] || 0) + 1;
      });

      // Group by risk level
      const capasByRiskLevel: Record<string, number> = {
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0,
      };
      capas.forEach((c: any) => {
        capasByRiskLevel[c.riskLevel] = (capasByRiskLevel[c.riskLevel] || 0) + 1;
      });

      // Calculate costs
      const totalCost = capas.reduce((sum: number, c: any) => {
        return sum + (c.actualCost ? parseFloat(c.actualCost.toString()) : 0);
      }, 0);

      const costByType: Record<string, number> = {
        IMMEDIATE: 0,
        PREVENTIVE: 0,
        CORRECTIVE: 0,
        SYSTEMIC: 0,
      };
      capas.forEach((c: any) => {
        c.actions.forEach((a: any) => {
          const actionCost = a.actualCost ? parseFloat(a.actualCost.toString()) : 0;
          costByType[a.actionType] = (costByType[a.actionType] || 0) + actionCost;
        });
      });

      const costByRiskLevel: Record<string, number> = {
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0,
      };
      capas.forEach((c: any) => {
        const cost = c.actualCost ? parseFloat(c.actualCost.toString()) : 0;
        costByRiskLevel[c.riskLevel] = (costByRiskLevel[c.riskLevel] || 0) + cost;
      });

      return {
        effectivenessRate: Math.round(effectivenessRate * 100) / 100,
        averageCycleTime: Math.round(averageCycleTime * 100) / 100,
        overdueActionCount: overdueActions.length,
        capasByStatus,
        capasByRiskLevel,
        totalCost,
        costByType,
        costByRiskLevel,
      };
    } catch (error) {
      this.logger.error('Failed to get CAPA metrics', { siteId, error });
      throw error;
    }
  }

  /**
   * Get overdue actions for a site
   */
  async getOverdueActions(siteId: string): Promise<any[]> {
    try {
      const now = new Date();
      return await this.prisma.capaAction.findMany({
        where: {
          capa: { siteId },
          plannedDueDate: { lt: now },
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
        include: {
          capa: true,
          owner: true,
        },
        orderBy: { plannedDueDate: 'asc' },
      });
    } catch (error) {
      this.logger.error('Failed to get overdue actions', { siteId, error });
      throw error;
    }
  }

  /**
   * Determine if a CAPA action should be auto-approved based on business rules
   */
  shouldAutoApprove(action: any): AutoApprovalResult {
    // Rule 1: Cost < $500
    const cost = action.actualCost ? parseFloat(action.actualCost.toString()) : 0;
    if (cost < 500 && action.capa?.riskLevel === 'LOW') {
      return {
        shouldAutoApprove: true,
        reason: 'Low cost and low risk',
        approvalThreshold: '$500',
      };
    }

    // Rule 2: Immediate action completed within 24 hours
    if (
      action.actionType === 'IMMEDIATE' &&
      action.completedDate &&
      action.capa?.createdAt
    ) {
      const completedTime = new Date(action.completedDate).getTime();
      const createdTime = new Date(action.capa.createdAt).getTime();
      const hoursElapsed = (completedTime - createdTime) / (1000 * 60 * 60);
      if (hoursElapsed <= 24) {
        return {
          shouldAutoApprove: true,
          reason: 'Immediate action completed within 24 hours',
          approvalThreshold: '24 hours',
        };
      }
    }

    // Rule 3: Cost < $1000 and not critical or high risk
    if (cost < 1000 && ['LOW', 'MEDIUM'].includes(action.capa?.riskLevel)) {
      return {
        shouldAutoApprove: true,
        reason: 'Cost within threshold for risk level',
        approvalThreshold: '$1000',
      };
    }

    return {
      shouldAutoApprove: false,
      reason: 'Manual approval required',
      approvalThreshold: 'N/A',
    };
  }

  /**
   * Validate CAPA can be closed
   */
  async validateCapaBeforeClose(capaId: string): Promise<void> {
    try {
      const capa = await this.getCapaById(capaId);

      // All actions must be completed
      const openActions = capa.actions.filter((a: any) => a.status !== 'COMPLETED');
      if (openActions.length > 0) {
        throw new Error(`Cannot close CAPA with ${openActions.length} incomplete actions`);
      }

      // All actions must be approved
      const unapprovedActions = capa.actions.filter(
        (a: any) => a.requiresApproval && !a.approvedAt
      );
      if (unapprovedActions.length > 0) {
        throw new Error(
          `Cannot close CAPA with ${unapprovedActions.length} unapproved actions`
        );
      }

      // Must have verification performed
      if (capa.verifications.length === 0) {
        throw new Error('CAPA must have effectiveness verification before closure');
      }

      // Last verification must be effective
      const lastVerification = capa.verifications[0];
      if (lastVerification.result !== 'VERIFIED_EFFECTIVE') {
        throw new Error('CAPA must be verified effective before closure');
      }
    } catch (error) {
      this.logger.error('CAPA validation failed', { capaId, error });
      throw error;
    }
  }

  /**
   * Record state transition in audit trail
   */
  private async recordStateTransition(
    capaId: string,
    fromState: string | null,
    toState: string,
    changedBy: string,
    reason?: string
  ): Promise<void> {
    try {
      await this.prisma.capaStateHistory.create({
        data: {
          capaId,
          fromState: fromState as any,
          toState: toState as any,
          changedBy,
          changeReason: reason,
          changedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error('Failed to record state transition', { capaId, error });
      // Don't re-throw, as this is auxiliary logging
    }
  }

  /**
   * Get valid state transitions based on current status
   */
  private getValidTransitions(currentStatus: string): string[] {
    const transitions: Record<string, string[]> = {
      DRAFT: ['PLANNED', 'CANCELLED'],
      PLANNED: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['PENDING_VERIFICATION', 'CANCELLED'],
      PENDING_VERIFICATION: ['IN_PROGRESS', 'VERIFIED_EFFECTIVE', 'VERIFIED_INEFFECTIVE'],
      VERIFIED_EFFECTIVE: ['CLOSED'],
      VERIFIED_INEFFECTIVE: ['IN_PROGRESS', 'CANCELLED'],
      CLOSED: [],
      CANCELLED: [],
    };
    return transitions[currentStatus] || [];
  }
}

export default CapaService;
