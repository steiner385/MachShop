/**
 * Part Interchangeability & Substitution Group Service (Issue #223)
 *
 * Service for managing part interchangeability groups, substitution rules,
 * and approval workflows for AS9100 compliance configuration management.
 *
 * Features:
 * - Part interchangeability group management
 * - Two-way and one-way substitution rules
 * - Engineering approval workflow
 * - MES integration for work order validation
 * - Comprehensive audit logging
 */

import prisma from '../lib/database';
import { logger } from '../utils/logger';
import {
  PartInterchangeabilityGroup,
  PartSubstitution,
  InterchangeabilityApproval,
  WorkOrderPartSubstitution,
  InterchangeabilityAuditLog,
  InterchangeabilityType,
  SubstitutionType,
  SubstitutionDirection,
  InterchangeabilityApprovalType,
  ApprovalStatus,
  SubstitutionReason,
  AuditAction
} from '@prisma/client';

export interface CreateInterchangeabilityGroupRequest {
  name: string;
  description?: string;
  groupType: InterchangeabilityType;
  category?: string;
  engineeringBasis?: string;
  complianceStandard?: string;
  effectiveDate?: Date;
  obsoleteDate?: Date;
  createdBy: string;
}

export interface CreatePartSubstitutionRequest {
  groupId: string;
  primaryPartId: string;
  substitutePartId: string;
  substitutionType: SubstitutionType;
  direction: SubstitutionDirection;
  priority?: number;
  effectiveDate?: Date;
  obsoleteDate?: Date;
  quantityRatio?: number;
  notes?: string;
  engineeringJustification?: string;
  testingReference?: string;
  restrictionConditions?: string;
  createdBy: string;
}

export interface CreateApprovalRequest {
  groupId: string;
  partId?: string;
  approvalType: InterchangeabilityApprovalType;
  requestedBy: string;
  engineeringEvidence?: string;
  riskAssessment?: string;
  complianceNotes?: string;
  attachments?: any;
  effectiveDate?: Date;
  expirationDate?: Date;
  comments?: string;
}

export interface SubstitutionValidationRequest {
  originalPartId: string;
  substitutePartId: string;
  workOrderId?: string;
  operationId?: string;
  quantity: number;
  effectiveDate?: Date;
}

export interface SubstitutionValidationResult {
  isValid: boolean;
  substitutionRule?: PartSubstitution & {
    group: PartInterchangeabilityGroup;
    primaryPart: { partNumber: string; partName: string };
    substitutePart: { partNumber: string; partName: string };
  };
  reasons: string[];
  warnings: string[];
  approvalRequired: boolean;
  priority?: number;
}

export class PartInterchangeabilityService {
  private static instance: PartInterchangeabilityService;

  private constructor() {}

  public static getInstance(): PartInterchangeabilityService {
    if (!PartInterchangeabilityService.instance) {
      PartInterchangeabilityService.instance = new PartInterchangeabilityService();
    }
    return PartInterchangeabilityService.instance;
  }

  // ============================================================================
  // Interchangeability Group Management
  // ============================================================================

  /**
   * Create a new interchangeability group
   */
  public async createInterchangeabilityGroup(
    request: CreateInterchangeabilityGroupRequest
  ): Promise<PartInterchangeabilityGroup> {
    try {
      const group = await prisma.partInterchangeabilityGroup.create({
        data: {
          name: request.name,
          description: request.description,
          groupType: request.groupType,
          category: request.category,
          engineeringBasis: request.engineeringBasis,
          complianceStandard: request.complianceStandard,
          effectiveDate: request.effectiveDate || new Date(),
          obsoleteDate: request.obsoleteDate,
          createdBy: request.createdBy
        }
      });

      // Log creation
      await this.createAuditLog({
        groupId: group.id,
        action: AuditAction.CREATE,
        entityType: 'group',
        entityId: group.id,
        newValues: group,
        performedBy: request.createdBy
      });

      logger.info('Interchangeability group created', {
        groupId: group.id,
        name: group.name,
        groupType: group.groupType,
        createdBy: request.createdBy
      });

      return group;
    } catch (error) {
      logger.error('Failed to create interchangeability group', {
        request,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Get interchangeability group by ID with related data
   */
  public async getInterchangeabilityGroup(
    groupId: string,
    includeSubstitutions = true
  ): Promise<PartInterchangeabilityGroup & {
    partSubstitutions?: (PartSubstitution & {
      primaryPart: { partNumber: string; partName: string };
      substitutePart: { partNumber: string; partName: string };
    })[];
    approvals?: InterchangeabilityApproval[];
  } | null> {
    try {
      const group = await prisma.partInterchangeabilityGroup.findUnique({
        where: { id: groupId },
        include: {
          partSubstitutions: includeSubstitutions ? {
            include: {
              primaryPart: {
                select: { partNumber: true, partName: true }
              },
              substitutePart: {
                select: { partNumber: true, partName: true }
              }
            },
            orderBy: { priority: 'asc' }
          } : false,
          approvals: {
            include: {
              requester: {
                select: { firstName: true, lastName: true, email: true }
              },
              approver: {
                select: { firstName: true, lastName: true, email: true }
              }
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      return group;
    } catch (error) {
      logger.error('Failed to get interchangeability group', {
        groupId,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * List interchangeability groups with filtering
   */
  public async listInterchangeabilityGroups(options: {
    category?: string;
    groupType?: InterchangeabilityType;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    groups: PartInterchangeabilityGroup[];
    total: number;
  }> {
    try {
      const where: any = {};

      if (options.category) where.category = options.category;
      if (options.groupType) where.groupType = options.groupType;
      if (options.isActive !== undefined) where.isActive = options.isActive;

      const [groups, total] = await Promise.all([
        prisma.partInterchangeabilityGroup.findMany({
          where,
          orderBy: { name: 'asc' },
          take: options.limit || 50,
          skip: options.offset || 0
        }),
        prisma.partInterchangeabilityGroup.count({ where })
      ]);

      return { groups, total };
    } catch (error) {
      logger.error('Failed to list interchangeability groups', {
        options,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Update interchangeability group
   */
  public async updateInterchangeabilityGroup(
    groupId: string,
    updates: Partial<CreateInterchangeabilityGroupRequest>,
    performedBy: string
  ): Promise<PartInterchangeabilityGroup> {
    try {
      const previousGroup = await prisma.partInterchangeabilityGroup.findUnique({
        where: { id: groupId }
      });

      if (!previousGroup) {
        throw new Error(`Interchangeability group not found: ${groupId}`);
      }

      const updatedGroup = await prisma.partInterchangeabilityGroup.update({
        where: { id: groupId },
        data: updates
      });

      // Log update
      await this.createAuditLog({
        groupId,
        action: AuditAction.UPDATE,
        entityType: 'group',
        entityId: groupId,
        previousValues: previousGroup,
        newValues: updatedGroup,
        performedBy
      });

      logger.info('Interchangeability group updated', {
        groupId,
        updates,
        performedBy
      });

      return updatedGroup;
    } catch (error) {
      logger.error('Failed to update interchangeability group', {
        groupId,
        updates,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  // ============================================================================
  // Part Substitution Management
  // ============================================================================

  /**
   * Create a new part substitution rule
   */
  public async createPartSubstitution(
    request: CreatePartSubstitutionRequest
  ): Promise<PartSubstitution> {
    try {
      // Validate the group exists
      const group = await prisma.partInterchangeabilityGroup.findUnique({
        where: { id: request.groupId }
      });

      if (!group) {
        throw new Error(`Interchangeability group not found: ${request.groupId}`);
      }

      // Check for duplicate substitution
      const existingSubstitution = await prisma.partSubstitution.findFirst({
        where: {
          groupId: request.groupId,
          primaryPartId: request.primaryPartId,
          substitutePartId: request.substitutePartId
        }
      });

      if (existingSubstitution) {
        throw new Error('Substitution rule already exists for these parts in this group');
      }

      const substitution = await prisma.partSubstitution.create({
        data: {
          groupId: request.groupId,
          primaryPartId: request.primaryPartId,
          substitutePartId: request.substitutePartId,
          substitutionType: request.substitutionType,
          direction: request.direction,
          priority: request.priority || 1,
          effectiveDate: request.effectiveDate || new Date(),
          obsoleteDate: request.obsoleteDate,
          quantityRatio: request.quantityRatio || 1.0,
          notes: request.notes,
          engineeringJustification: request.engineeringJustification,
          testingReference: request.testingReference,
          restrictionConditions: request.restrictionConditions,
          createdBy: request.createdBy
        }
      });

      // Log creation
      await this.createAuditLog({
        groupId: request.groupId,
        substitutionId: substitution.id,
        action: AuditAction.CREATE,
        entityType: 'substitution',
        entityId: substitution.id,
        newValues: substitution,
        performedBy: request.createdBy
      });

      logger.info('Part substitution created', {
        substitutionId: substitution.id,
        groupId: request.groupId,
        primaryPartId: request.primaryPartId,
        substitutePartId: request.substitutePartId,
        createdBy: request.createdBy
      });

      return substitution;
    } catch (error) {
      logger.error('Failed to create part substitution', {
        request,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Validate if a part substitution is allowed
   */
  public async validateSubstitution(
    request: SubstitutionValidationRequest
  ): Promise<SubstitutionValidationResult> {
    try {
      const effectiveDate = request.effectiveDate || new Date();
      const reasons: string[] = [];
      const warnings: string[] = [];

      // Find valid substitution rules
      const substitutionRules = await prisma.partSubstitution.findMany({
        where: {
          OR: [
            // Direct substitution: original -> substitute
            {
              primaryPartId: request.originalPartId,
              substitutePartId: request.substitutePartId,
              direction: { in: [SubstitutionDirection.TWO_WAY, SubstitutionDirection.ONE_WAY] }
            },
            // Reverse substitution: substitute -> original (only for TWO_WAY)
            {
              primaryPartId: request.substitutePartId,
              substitutePartId: request.originalPartId,
              direction: SubstitutionDirection.TWO_WAY
            }
          ],
          isActive: true,
          effectiveDate: { lte: effectiveDate },
          OR: [
            { obsoleteDate: null },
            { obsoleteDate: { gt: effectiveDate } }
          ]
        },
        include: {
          group: true,
          primaryPart: {
            select: { partNumber: true, partName: true }
          },
          substitutePart: {
            select: { partNumber: true, partName: true }
          }
        },
        orderBy: { priority: 'asc' }
      });

      if (substitutionRules.length === 0) {
        reasons.push('No valid substitution rule found for these parts');
        return {
          isValid: false,
          reasons,
          warnings,
          approvalRequired: true
        };
      }

      // Use the highest priority (lowest priority number) rule
      const bestRule = substitutionRules[0];

      // Check group is active and effective
      if (!bestRule.group.isActive) {
        reasons.push('Interchangeability group is inactive');
      }

      if (bestRule.group.effectiveDate > effectiveDate) {
        reasons.push('Interchangeability group is not yet effective');
      }

      if (bestRule.group.obsoleteDate && bestRule.group.obsoleteDate <= effectiveDate) {
        reasons.push('Interchangeability group is obsolete');
      }

      // Check for conditional restrictions
      if (bestRule.restrictionConditions) {
        warnings.push(`Restrictions apply: ${bestRule.restrictionConditions}`);
      }

      // Check quantity ratio
      if (bestRule.quantityRatio !== 1.0) {
        warnings.push(`Quantity ratio required: ${bestRule.quantityRatio}:1`);
      }

      const isValid = reasons.length === 0;

      if (isValid) {
        logger.info('Part substitution validated', {
          originalPartId: request.originalPartId,
          substitutePartId: request.substitutePartId,
          ruleId: bestRule.id,
          priority: bestRule.priority
        });
      } else {
        logger.warn('Part substitution validation failed', {
          originalPartId: request.originalPartId,
          substitutePartId: request.substitutePartId,
          reasons
        });
      }

      return {
        isValid,
        substitutionRule: bestRule,
        reasons,
        warnings,
        approvalRequired: !isValid || warnings.length > 0,
        priority: bestRule.priority
      };

    } catch (error) {
      logger.error('Failed to validate substitution', {
        request,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Log a work order part substitution
   */
  public async logWorkOrderSubstitution(request: {
    workOrderId: string;
    operationId?: string;
    originalPartId: string;
    substitutedPartId: string;
    substitutionRuleId?: string;
    quantity: number;
    reason: SubstitutionReason;
    justification?: string;
    approvedBy?: string;
    notes?: string;
    serialNumbers?: string[];
    createdBy: string;
  }): Promise<WorkOrderPartSubstitution> {
    try {
      const substitution = await prisma.workOrderPartSubstitution.create({
        data: {
          workOrderId: request.workOrderId,
          operationId: request.operationId,
          originalPartId: request.originalPartId,
          substitutedPartId: request.substitutedPartId,
          substitutionRuleId: request.substitutionRuleId,
          quantity: request.quantity,
          reason: request.reason,
          justification: request.justification,
          approvedBy: request.approvedBy,
          notes: request.notes,
          serialNumbers: request.serialNumbers || [],
          createdBy: request.createdBy
        }
      });

      logger.info('Work order part substitution logged', {
        substitutionId: substitution.id,
        workOrderId: request.workOrderId,
        originalPartId: request.originalPartId,
        substitutedPartId: request.substitutedPartId,
        reason: request.reason,
        createdBy: request.createdBy
      });

      return substitution;
    } catch (error) {
      logger.error('Failed to log work order substitution', {
        request,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  // ============================================================================
  // Approval Workflow Management
  // ============================================================================

  /**
   * Create an approval request
   */
  public async createApprovalRequest(
    request: CreateApprovalRequest
  ): Promise<InterchangeabilityApproval> {
    try {
      const approval = await prisma.interchangeabilityApproval.create({
        data: {
          groupId: request.groupId,
          partId: request.partId,
          approvalType: request.approvalType,
          requestedBy: request.requestedBy,
          engineeringEvidence: request.engineeringEvidence,
          riskAssessment: request.riskAssessment,
          complianceNotes: request.complianceNotes,
          attachments: request.attachments,
          effectiveDate: request.effectiveDate,
          expirationDate: request.expirationDate,
          comments: request.comments
        }
      });

      // Log creation
      await this.createAuditLog({
        groupId: request.groupId,
        approvalId: approval.id,
        action: AuditAction.CREATE,
        entityType: 'approval',
        entityId: approval.id,
        newValues: approval,
        performedBy: request.requestedBy
      });

      logger.info('Interchangeability approval request created', {
        approvalId: approval.id,
        groupId: request.groupId,
        approvalType: request.approvalType,
        requestedBy: request.requestedBy
      });

      return approval;
    } catch (error) {
      logger.error('Failed to create approval request', {
        request,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Approve or reject an approval request
   */
  public async processApproval(
    approvalId: string,
    decision: 'APPROVED' | 'REJECTED',
    approvedBy: string,
    comments?: string,
    rejectionReason?: string
  ): Promise<InterchangeabilityApproval> {
    try {
      const previousApproval = await prisma.interchangeabilityApproval.findUnique({
        where: { id: approvalId }
      });

      if (!previousApproval) {
        throw new Error(`Approval request not found: ${approvalId}`);
      }

      if (previousApproval.status !== ApprovalStatus.PENDING &&
          previousApproval.status !== ApprovalStatus.IN_REVIEW) {
        throw new Error(`Approval request is already ${previousApproval.status.toLowerCase()}`);
      }

      const updatedApproval = await prisma.interchangeabilityApproval.update({
        where: { id: approvalId },
        data: {
          status: decision === 'APPROVED' ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED,
          approvedBy,
          approvalDate: new Date(),
          comments,
          rejectionReason: decision === 'REJECTED' ? rejectionReason : undefined
        }
      });

      // Log decision
      await this.createAuditLog({
        groupId: previousApproval.groupId,
        approvalId,
        action: decision === 'APPROVED' ? AuditAction.APPROVE : AuditAction.REJECT,
        entityType: 'approval',
        entityId: approvalId,
        previousValues: previousApproval,
        newValues: updatedApproval,
        performedBy: approvedBy,
        reason: decision === 'REJECTED' ? rejectionReason : comments
      });

      logger.info('Interchangeability approval processed', {
        approvalId,
        decision,
        approvedBy,
        previousStatus: previousApproval.status
      });

      return updatedApproval;
    } catch (error) {
      logger.error('Failed to process approval', {
        approvalId,
        decision,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  // ============================================================================
  // Search and Query Methods
  // ============================================================================

  /**
   * Find all valid substitutes for a given part
   */
  public async findValidSubstitutes(
    partId: string,
    effectiveDate?: Date
  ): Promise<{
    partId: string;
    partNumber: string;
    partName: string;
    substitutionRule: PartSubstitution & {
      group: PartInterchangeabilityGroup;
    };
  }[]> {
    try {
      const checkDate = effectiveDate || new Date();

      const substitutions = await prisma.partSubstitution.findMany({
        where: {
          OR: [
            // Direct substitutions where part is primary
            {
              primaryPartId: partId,
              direction: { in: [SubstitutionDirection.TWO_WAY, SubstitutionDirection.ONE_WAY] }
            },
            // Reverse substitutions where part is substitute (only TWO_WAY)
            {
              substitutePartId: partId,
              direction: SubstitutionDirection.TWO_WAY
            }
          ],
          isActive: true,
          effectiveDate: { lte: checkDate },
          OR: [
            { obsoleteDate: null },
            { obsoleteDate: { gt: checkDate } }
          ],
          group: {
            isActive: true,
            effectiveDate: { lte: checkDate },
            OR: [
              { obsoleteDate: null },
              { obsoleteDate: { gt: checkDate } }
            ]
          }
        },
        include: {
          group: true,
          primaryPart: {
            select: { partNumber: true, partName: true }
          },
          substitutePart: {
            select: { partNumber: true, partName: true }
          }
        },
        orderBy: { priority: 'asc' }
      });

      return substitutions.map(sub => {
        // Determine which part is the substitute
        const isPartPrimary = sub.primaryPartId === partId;
        const substitutePart = isPartPrimary ? sub.substitutePart : sub.primaryPart;
        const substitutePartId = isPartPrimary ? sub.substitutePartId : sub.primaryPartId;

        return {
          partId: substitutePartId,
          partNumber: substitutePart.partNumber,
          partName: substitutePart.partName,
          substitutionRule: sub
        };
      });
    } catch (error) {
      logger.error('Failed to find valid substitutes', {
        partId,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Get substitution history for a work order
   */
  public async getWorkOrderSubstitutionHistory(
    workOrderId: string
  ): Promise<(WorkOrderPartSubstitution & {
    originalPart: { partNumber: string; partName: string };
    substitutedPart: { partNumber: string; partName: string };
    substitutionRule?: PartSubstitution & {
      group: PartInterchangeabilityGroup;
    };
  })[]> {
    try {
      const substitutions = await prisma.workOrderPartSubstitution.findMany({
        where: { workOrderId },
        include: {
          originalPart: {
            select: { partNumber: true, partName: true }
          },
          substitutedPart: {
            select: { partNumber: true, partName: true }
          },
          substitutionRule: {
            include: {
              group: true
            }
          }
        },
        orderBy: { substitutionDate: 'desc' }
      });

      return substitutions;
    } catch (error) {
      logger.error('Failed to get work order substitution history', {
        workOrderId,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  // ============================================================================
  // Audit Logging
  // ============================================================================

  private async createAuditLog(data: {
    groupId?: string;
    substitutionId?: string;
    approvalId?: string;
    action: AuditAction;
    entityType: string;
    entityId: string;
    previousValues?: any;
    newValues?: any;
    reason?: string;
    performedBy: string;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  }): Promise<InterchangeabilityAuditLog> {
    try {
      return await prisma.interchangeabilityAuditLog.create({
        data: {
          groupId: data.groupId,
          substitutionId: data.substitutionId,
          approvalId: data.approvalId,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          previousValues: data.previousValues,
          newValues: data.newValues,
          reason: data.reason,
          performedBy: data.performedBy,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          sessionId: data.sessionId
        }
      });
    } catch (error) {
      logger.error('Failed to create audit log entry', {
        data,
        error: error instanceof Error ? error.message : error
      });
      // Don't throw here - audit logging failure shouldn't break the main operation
      return {} as InterchangeabilityAuditLog;
    }
  }
}

export default PartInterchangeabilityService;