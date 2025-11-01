/**
 * ECO Approval Routing Engine (Issue #226)
 *
 * Intelligent routing system that determines approval paths based on:
 * - Change classification (Form/Fit/Function)
 * - Safety criticality and certification impact
 * - Affected assemblies and part hierarchies
 * - Organizational structure and approver availability
 * - Supports parallel, sequential, and escalation routing
 */

import { PrismaClient, ECOStatus, ApprovalAction } from '@prisma/client';
import { logger } from '../utils/logger';
import {
  ChangeClassification,
  SafetyCriticality,
  CertificationImpact,
} from './ECOClassificationService';

export enum ApprovalRouteType {
  SEQUENTIAL = 'SEQUENTIAL',       // Approvers must approve in order
  PARALLEL = 'PARALLEL',           // Multiple approvers can approve simultaneously
  ESCALATION = 'ESCALATION',       // Escalate to higher authority if denied
  CONDITIONAL = 'CONDITIONAL',     // Route based on conditions
}

export interface ApprovalRoute {
  routeId: string;
  ecoId: string;
  routeType: ApprovalRouteType;
  approvalSequence: ApprovalStep[];
  totalApproversRequired: number;
  approvalsReceived: number;
  isComplete: boolean;
  startedAt: Date;
  completedAt?: Date;
}

export interface ApprovalStep {
  stepNumber: number;
  approverRole: string;
  approverDepartment: string;
  priority: number;
  approverId?: string;
  approverName?: string;
  assignedAt: Date;
  dueDate: Date;
  status: ApprovalStepStatus;
  responseDate?: Date;
  action?: ApprovalAction;
  comments?: string;
  escalatedFrom?: string;
  escalationReason?: string;
}

export enum ApprovalStepStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ESCALATED = 'ESCALATED',
  DELEGATED = 'DELEGATED',
  SKIPPED = 'SKIPPED',
}

export interface RoutingRequest {
  ecoId: string;
  ecoType: string;
  changeClassification: ChangeClassification;
  safetyCriticality: SafetyCriticality;
  certificationImpact: CertificationImpact;
  affectedAssemblyCount: number;
  estimatedCost?: number;
  affectedDepartments?: string[];
  requiresCRB: boolean;
  customerApprovalRequired?: boolean;
}

export interface RoutingResult {
  ecoId: string;
  recommendedRoute: ApprovalRoute;
  alternativeRoutes?: ApprovalRoute[];
  estimatedApprovalDays: number;
  criticalPath: ApprovalStep[];
  parallelApprovalsAvailable: boolean;
  escalationProbability: number;
  routingRationale: string;
}

export class ECOApprovalRoutingEngine {
  private prisma: PrismaClient;
  private approvalDueHours: Map<string, number>;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.approvalDueHours = new Map([
      ['ENGINEERING', 3],
      ['QUALITY', 5],
      ['MANUFACTURING', 5],
      ['SUPPLY_CHAIN', 7],
      ['CUSTOMER', 10],
      ['CRB', 5],
    ]);
  }

  /**
   * Generate intelligent routing for an ECO
   */
  async routeECO(request: RoutingRequest): Promise<RoutingResult> {
    try {
      logger.info(`Routing ECO ${request.ecoId}`, {
        classification: request.changeClassification,
        criticality: request.safetyCriticality,
      });

      // Determine base approvers required
      const requiredApprovers = this.determineRequiredApprovers(request);

      // Build approval sequence based on routing strategy
      const sequenceStrategy = this.selectSequenceStrategy(
        request,
        requiredApprovers
      );

      // Generate approval steps
      const approvalSequence = await this.generateApprovalSequence(
        request.ecoId,
        requiredApprovers,
        sequenceStrategy
      );

      // Create the primary route
      const primaryRoute: ApprovalRoute = {
        routeId: `route-${request.ecoId}-primary`,
        ecoId: request.ecoId,
        routeType: sequenceStrategy,
        approvalSequence,
        totalApproversRequired: approvalSequence.length,
        approvalsReceived: 0,
        isComplete: false,
        startedAt: new Date(),
      };

      // Generate alternative routes
      const alternativeRoutes = this.generateAlternativeRoutes(
        request,
        primaryRoute
      );

      // Calculate timeline
      const estimatedApprovalDays = this.calculateEstimatedDays(approvalSequence);

      // Identify critical path
      const criticalPath = this.identifyCriticalPath(
        approvalSequence,
        sequenceStrategy
      );

      // Determine parallel approval potential
      const parallelApprovalsAvailable =
        sequenceStrategy === ApprovalRouteType.PARALLEL;

      // Estimate escalation probability
      const escalationProbability = this.estimateEscalationProbability(request);

      // Build rationale
      const routingRationale = this.buildRoutingRationale(request, primaryRoute);

      const result: RoutingResult = {
        ecoId: request.ecoId,
        recommendedRoute: primaryRoute,
        alternativeRoutes,
        estimatedApprovalDays,
        criticalPath,
        parallelApprovalsAvailable,
        escalationProbability,
        routingRationale,
      };

      logger.info(`ECO routing complete for ${request.ecoId}`, {
        routeType: sequenceStrategy,
        approverCount: approvalSequence.length,
        estimatedDays: estimatedApprovalDays,
      });

      return result;

    } catch (error) {
      logger.error('Error routing ECO:', error);
      throw new Error(`Failed to route ECO: ${error.message}`);
    }
  }

  /**
   * Handle an approval action and advance routing
   */
  async handleApprovalAction(
    ecoId: string,
    stepNumber: number,
    action: ApprovalAction,
    approverId: string,
    comments?: string
  ): Promise<ApprovalRoute> {
    try {
      logger.info(`Processing approval for ECO ${ecoId} step ${stepNumber}`, {
        action,
        approverId,
      });

      // Get current route
      const eco = await this.prisma.engineeringChangeOrder.findUnique({
        where: { id: ecoId },
      });

      if (!eco) {
        throw new Error(`ECO ${ecoId} not found`);
      }

      // Update the step with approval
      const routingData = (eco.impactAnalysis as any) || {};
      const route = routingData.approvalRoute as any;

      if (!route || !route.approvalSequence) {
        throw new Error('No approval route found for ECO');
      }

      const step = route.approvalSequence[stepNumber - 1];
      if (!step) {
        throw new Error(`Approval step ${stepNumber} not found`);
      }

      // Update step status
      step.status = this.mapActionToStatus(action);
      step.responseDate = new Date();
      step.action = action;
      step.comments = comments;
      step.approverId = approverId;

      // Process approval logic
      if (action === ApprovalAction.APPROVED) {
        route.approvalsReceived = (route.approvalsReceived || 0) + 1;

        // Check if we can advance to next step
        if (route.routeType === ApprovalRouteType.SEQUENTIAL) {
          const nextStep = route.approvalSequence[stepNumber];
          if (nextStep) {
            nextStep.status = ApprovalStepStatus.ASSIGNED;
            nextStep.assignedAt = new Date();
            nextStep.dueDate = new Date(
              Date.now() +
                (this.approvalDueHours.get(nextStep.approverRole) || 24) * 60 * 60 * 1000
            );
          }
        }

        // Check if all approvals received
        if (route.approvalsReceived >= route.totalApproversRequired) {
          route.isComplete = true;
          route.completedAt = new Date();
        }
      } else if (action === ApprovalAction.REJECTED) {
        // Trigger escalation or route revision
        await this.handleRejection(ecoId, step, route);
      } else if (action === ApprovalAction.DELEGATED) {
        step.status = ApprovalStepStatus.DELEGATED;
      }

      // Update ECO with routing data
      await this.prisma.engineeringChangeOrder.update({
        where: { id: ecoId },
        data: {
          impactAnalysis: { ...routingData, approvalRoute: route },
        },
      });

      logger.info(`Approval processed for ECO ${ecoId}`, {
        stepNumber,
        newStatus: step.status,
        routeComplete: route.isComplete,
      });

      return route as ApprovalRoute;

    } catch (error) {
      logger.error('Error handling approval action:', error);
      throw new Error(`Failed to process approval: ${error.message}`);
    }
  }

  /**
   * Escalate an approval step
   */
  async escalateApproval(
    ecoId: string,
    stepNumber: number,
    reason: string,
    escalatedBy: string
  ): Promise<void> {
    try {
      logger.info(`Escalating ECO ${ecoId} step ${stepNumber}`, { reason });

      const eco = await this.prisma.engineeringChangeOrder.findUnique({
        where: { id: ecoId },
      });

      if (!eco) {
        throw new Error(`ECO ${ecoId} not found`);
      }

      const routingData = (eco.impactAnalysis as any) || {};
      const route = routingData.approvalRoute as any;

      if (!route || !route.approvalSequence) {
        throw new Error('No approval route found');
      }

      const step = route.approvalSequence[stepNumber - 1];
      step.status = ApprovalStepStatus.ESCALATED;
      step.escalationReason = reason;
      step.escalatedFrom = step.approverRole;

      // Create escalation step to manager/director
      const escalatedRole = this.getEscalatedRole(step.approverRole);
      const escalationStep: ApprovalStep = {
        stepNumber: stepNumber,
        approverRole: escalatedRole,
        approverDepartment: step.approverDepartment,
        priority: step.priority + 1,
        assignedAt: new Date(),
        dueDate: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour SLA for escalations
        status: ApprovalStepStatus.ASSIGNED,
      };

      // Insert escalation step
      if (route.routeType === ApprovalRouteType.SEQUENTIAL) {
        route.approvalSequence.splice(stepNumber, 0, escalationStep);
        // Renumber subsequent steps
        for (let i = stepNumber + 1; i < route.approvalSequence.length; i++) {
          route.approvalSequence[i].stepNumber = i + 1;
        }
      }

      await this.prisma.engineeringChangeOrder.update({
        where: { id: ecoId },
        data: {
          impactAnalysis: { ...routingData, approvalRoute: route },
        },
      });

      logger.info(`Escalation processed for ECO ${ecoId}`);

    } catch (error) {
      logger.error('Error escalating approval:', error);
      throw new Error(`Failed to escalate approval: ${error.message}`);
    }
  }

  /**
   * Delegate an approval step to another approver
   */
  async delegateApproval(
    ecoId: string,
    stepNumber: number,
    delegateApproverId: string,
    delegateApproverName: string,
    delegatedBy: string
  ): Promise<void> {
    try {
      logger.info(`Delegating ECO ${ecoId} step ${stepNumber}`, {
        delegateApproverId,
      });

      const eco = await this.prisma.engineeringChangeOrder.findUnique({
        where: { id: ecoId },
      });

      if (!eco) {
        throw new Error(`ECO ${ecoId} not found`);
      }

      const routingData = (eco.impactAnalysis as any) || {};
      const route = routingData.approvalRoute as any;

      if (!route || !route.approvalSequence) {
        throw new Error('No approval route found');
      }

      const step = route.approvalSequence[stepNumber - 1];
      step.approverId = delegateApproverId;
      step.approverName = delegateApproverName;
      step.status = ApprovalStepStatus.DELEGATED;

      await this.prisma.engineeringChangeOrder.update({
        where: { id: ecoId },
        data: {
          impactAnalysis: { ...routingData, approvalRoute: route },
        },
      });

      logger.info(`Delegation processed for ECO ${ecoId}`);

    } catch (error) {
      logger.error('Error delegating approval:', error);
      throw new Error(`Failed to delegate approval: ${error.message}`);
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private determineRequiredApprovers(request: RoutingRequest): string[] {
    const approvers: string[] = [];

    // Always need engineering approval
    approvers.push('ENGINEERING');

    // Quality approval for certified items
    if (request.certificationImpact !== CertificationImpact.NONE) {
      approvers.push('QUALITY');
    }

    // Manufacturing for fit/function changes
    if (
      request.changeClassification === ChangeClassification.FIT_CHANGE ||
      request.changeClassification === ChangeClassification.FUNCTION_CHANGE
    ) {
      approvers.push('MANUFACTURING');
    }

    // Supply chain for significant changes
    if (
      request.safetyCriticality === SafetyCriticality.HIGH ||
      request.safetyCriticality === SafetyCriticality.CRITICAL ||
      (request.estimatedCost && request.estimatedCost > 10000)
    ) {
      approvers.push('SUPPLY_CHAIN');
    }

    // Customer approval if required
    if (request.customerApprovalRequired) {
      approvers.push('CUSTOMER');
    }

    // CRB for high-impact changes
    if (request.requiresCRB) {
      approvers.push('CRB');
    }

    return approvers;
  }

  private selectSequenceStrategy(
    request: RoutingRequest,
    approvers: string[]
  ): ApprovalRouteType {
    // Critical changes require sequential approval
    if (request.safetyCriticality === SafetyCriticality.CRITICAL) {
      return ApprovalRouteType.SEQUENTIAL;
    }

    // Certification impact requires sequential
    if (
      request.certificationImpact === CertificationImpact.MAJOR ||
      request.certificationImpact === CertificationImpact.COMPLETE_RECERTIFICATION
    ) {
      return ApprovalRouteType.SEQUENTIAL;
    }

    // Customer approval must be sequential (last)
    if (request.customerApprovalRequired) {
      return ApprovalRouteType.SEQUENTIAL;
    }

    // Function changes require sequential
    if (request.changeClassification === ChangeClassification.FUNCTION_CHANGE) {
      return ApprovalRouteType.SEQUENTIAL;
    }

    // Default to parallel for independent approvers
    return ApprovalRouteType.PARALLEL;
  }

  private async generateApprovalSequence(
    ecoId: string,
    approvers: string[],
    strategy: ApprovalRouteType
  ): Promise<ApprovalStep[]> {
    const sequence: ApprovalStep[] = [];
    let stepNumber = 1;

    if (strategy === ApprovalRouteType.SEQUENTIAL) {
      // Customer approval always goes last
      const customerLast = approvers.filter((a) => a !== 'CUSTOMER');
      const customerApprovalRequired = approvers.includes('CUSTOMER');

      for (const approver of customerLast) {
        sequence.push(
          this.createApprovalStep(stepNumber, approver, stepNumber)
        );
        stepNumber++;
      }

      if (customerApprovalRequired) {
        sequence.push(
          this.createApprovalStep(stepNumber, 'CUSTOMER', stepNumber)
        );
      }
    } else {
      // Parallel: all approvers at once
      for (const approver of approvers) {
        sequence.push(this.createApprovalStep(stepNumber, approver, 1));
        stepNumber++;
      }
    }

    return sequence;
  }

  private createApprovalStep(
    stepNumber: number,
    approverRole: string,
    priority: number
  ): ApprovalStep {
    const dueHours = this.approvalDueHours.get(approverRole) || 24;
    return {
      stepNumber,
      approverRole,
      approverDepartment: this.getRoleDepartment(approverRole),
      priority,
      assignedAt: new Date(),
      dueDate: new Date(Date.now() + dueHours * 60 * 60 * 1000),
      status: ApprovalStepStatus.ASSIGNED,
    };
  }

  private getRoleDepartment(role: string): string {
    const deptMap: { [key: string]: string } = {
      ENGINEERING: 'ENGINEERING',
      QUALITY: 'QUALITY',
      MANUFACTURING: 'MANUFACTURING',
      SUPPLY_CHAIN: 'PROCUREMENT',
      CUSTOMER: 'CUSTOMER_RELATIONS',
      CRB: 'CONFIGURATION_MANAGEMENT',
    };
    return deptMap[role] || 'GENERAL';
  }

  private generateAlternativeRoutes(
    request: RoutingRequest,
    primaryRoute: ApprovalRoute
  ): ApprovalRoute[] {
    // For now, return at most one alternative route
    // Could generate escalation route as alternative
    if (
      request.safetyCriticality !== SafetyCriticality.CRITICAL &&
      request.changeClassification !== ChangeClassification.FUNCTION_CHANGE
    ) {
      // Create alternative sequential route for more conservative approach
      const altRoute = JSON.parse(JSON.stringify(primaryRoute));
      altRoute.routeId = `route-${request.ecoId}-alt-sequential`;
      altRoute.routeType = ApprovalRouteType.SEQUENTIAL;
      // Sort by priority to enforce sequence
      altRoute.approvalSequence.sort((a, b) => a.priority - b.priority);
      return [altRoute];
    }

    return [];
  }

  private calculateEstimatedDays(sequence: ApprovalStep[]): number {
    if (sequence.length === 0) return 0;

    const maxHours = Math.max(
      ...sequence.map((s) => {
        const diff = s.dueDate.getTime() - s.assignedAt.getTime();
        return diff / (60 * 60 * 1000);
      })
    );

    return Math.ceil(maxHours / 24);
  }

  private identifyCriticalPath(
    sequence: ApprovalStep[],
    strategy: ApprovalRouteType
  ): ApprovalStep[] {
    if (strategy === ApprovalRouteType.SEQUENTIAL) {
      return sequence;
    }

    // For parallel, critical path is the longest single approval
    return sequence.slice(0, 1);
  }

  private estimateEscalationProbability(request: RoutingRequest): number {
    let probability = 0.1; // Base 10%

    if (request.safetyCriticality === SafetyCriticality.CRITICAL) {
      probability += 0.3;
    } else if (request.safetyCriticality === SafetyCriticality.HIGH) {
      probability += 0.15;
    }

    if (
      request.certificationImpact === CertificationImpact.COMPLETE_RECERTIFICATION
    ) {
      probability += 0.2;
    }

    if (request.affectedAssemblyCount > 10) {
      probability += 0.1;
    }

    return Math.min(probability, 0.95);
  }

  private buildRoutingRationale(
    request: RoutingRequest,
    route: ApprovalRoute
  ): string {
    const parts: string[] = [
      `Route type: ${route.routeType}`,
      `Approvers required: ${route.totalApproversRequired}`,
      `Change classification: ${request.changeClassification}`,
    ];

    if (request.safetyCriticality === SafetyCriticality.CRITICAL) {
      parts.push('Sequential routing enforced due to critical safety impact');
    }

    if (request.requiresCRB) {
      parts.push('CRB review required for change validation');
    }

    return parts.join('; ');
  }

  private mapActionToStatus(action: ApprovalAction): ApprovalStepStatus {
    const statusMap: { [key: string]: ApprovalStepStatus } = {
      [ApprovalAction.APPROVED]: ApprovalStepStatus.APPROVED,
      [ApprovalAction.REJECTED]: ApprovalStepStatus.REJECTED,
      [ApprovalAction.PENDING]: ApprovalStepStatus.IN_PROGRESS,
    };
    return statusMap[action] || ApprovalStepStatus.IN_PROGRESS;
  }

  private handleRejection(
    ecoId: string,
    step: ApprovalStep,
    route: ApprovalRoute
  ): void {
    // Mark route as requiring revision
    route.isComplete = false;
    logger.info(`ECO ${ecoId} rejected at step ${step.stepNumber}`);
  }

  private getEscalatedRole(role: string): string {
    const escalationMap: { [key: string]: string } = {
      ENGINEERING: 'ENGINEERING_DIRECTOR',
      QUALITY: 'QUALITY_DIRECTOR',
      MANUFACTURING: 'MANUFACTURING_DIRECTOR',
      SUPPLY_CHAIN: 'SUPPLY_CHAIN_DIRECTOR',
      CUSTOMER: 'CUSTOMER_DIRECTOR',
      CRB: 'CRB_CHAIRMAN',
    };
    return escalationMap[role] || 'EXECUTIVE';
  }
}

export default ECOApprovalRoutingEngine;
