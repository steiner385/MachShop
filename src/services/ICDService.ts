/**
 * ✅ GITHUB ISSUE #224: Interface Control Document (ICD) Service
 *
 * ICDService - Core service for managing Interface Control Documents,
 * compliance validation, version control, and complete ICD lifecycle
 *
 * Supports SAE AIR6181A, ASME Y14.24, NASA Interface Management Guidelines, ISO 10007
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../utils/logger';
import {
  ICDCreateInput,
  ICDUpdateInput,
  ICDResponse,
  InterfaceRequirementCreateInput,
  InterfaceRequirementUpdateInput,
  InterfaceRequirementResponse,
  ICDPartImplementationCreateInput,
  ICDPartImplementationResponse,
  ICDPartConsumptionCreateInput,
  ICDPartConsumptionResponse,
  ICDComplianceCheckCreateInput,
  ICDComplianceCheckResponse,
  ICDVersionResponse,
  ICDHistoryResponse,
  ICDAttachmentResponse,
  ICDChangeRequestResponse,
  ICDFilters,
  ICDComplianceFilters,
  ICDAnalytics,
  ICDError,
  ICDValidationError,
  ICDStateError,
  ICDPermissionError,
  ICDNotFoundError,
  ICDComplianceError
} from '../types/icd';
import {
  ICDStatus,
  InterfaceType,
  InterfaceDirection,
  InterfaceCriticality,
  VerificationMethod,
  ComplianceStatus,
  InterfaceEffectivityType
} from '@prisma/client';

export class ICDService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // ============================================================================
  // ICD Lifecycle Management
  // ============================================================================

  /**
   * Create a new Interface Control Document
   */
  async createICD(input: ICDCreateInput): Promise<ICDResponse> {
    try {
      await this.validateICDInput(input);

      // Validate unique ICD number
      await this.validateUniqueICDNumber(input.icdNumber);

      const icd = await this.prisma.interfaceControlDocument.create({
        data: {
          icdNumber: input.icdNumber,
          icdName: input.icdName,
          title: input.title,
          description: input.description,
          version: input.version,
          revisionLevel: input.revisionLevel,
          interfaceType: input.interfaceType,
          interfaceDirection: input.interfaceDirection || InterfaceDirection.BIDIRECTIONAL,
          criticality: input.criticality || InterfaceCriticality.MINOR,
          applicableStandards: input.applicableStandards || [],
          complianceNotes: input.complianceNotes,
          effectiveDate: input.effectiveDate,
          expirationDate: input.expirationDate,
          effectivityType: input.effectivityType,
          effectivityValue: input.effectivityValue,
          ownerId: input.ownerId,
          ownerName: input.ownerName,
          ownerDepartment: input.ownerDepartment,
          reviewCycle: input.reviewCycle,
          nextReviewDate: input.reviewCycle ?
            new Date(Date.now() + input.reviewCycle * 30 * 24 * 60 * 60 * 1000) :
            undefined,
          documentationUrl: input.documentationUrl,
          drawingReferences: input.drawingReferences || [],
          specificationRefs: input.specificationRefs || [],
          createdById: input.createdById,
        },
        include: this.getICDInclude()
      });

      // Create initial history entry
      await this.createHistoryEntry(icd.id, {
        actionType: 'CREATE',
        changeDescription: `ICD ${input.icdNumber} created`,
        changeReason: 'Initial creation',
        changedById: input.createdById,
        changedByName: input.ownerName || 'System',
      });

      // Create initial version entry
      await this.createVersionEntry(icd.id, {
        versionNumber: input.version,
        versionType: 'INITIAL',
        changeDescription: 'Initial version created',
        changeReason: 'ICD creation',
        changeCategory: ['CREATION'],
        createdById: input.createdById,
      });

      logger.info(`ICD created: ${icd.icdNumber}`, { icdId: icd.id });
      return this.mapToICDResponse(icd);

    } catch (error) {
      logger.error('Error creating ICD:', error);
      throw error instanceof ICDError ? error : new ICDError('Failed to create ICD');
    }
  }

  /**
   * Update an existing ICD
   */
  async updateICD(id: string, input: ICDUpdateInput, userId?: string): Promise<ICDResponse> {
    try {
      const existingICD = await this.getICDById(id);

      await this.validateICDUpdate(existingICD, input);

      // Track changes for history
      const changes = this.trackChanges(existingICD, input);

      const icd = await this.prisma.interfaceControlDocument.update({
        where: { id },
        data: {
          ...input,
          lastModifiedById: userId,
          nextReviewDate: input.reviewCycle ?
            new Date(Date.now() + input.reviewCycle * 30 * 24 * 60 * 60 * 1000) :
            undefined,
        },
        include: this.getICDInclude()
      });

      // Create history entries for changes
      for (const change of changes) {
        await this.createHistoryEntry(id, {
          actionType: 'UPDATE',
          fieldChanged: change.field,
          oldValue: change.oldValue,
          newValue: change.newValue,
          changeDescription: `Updated ${change.field}`,
          changedById: userId,
        });
      }

      logger.info(`ICD updated: ${icd.icdNumber}`, { icdId: id, changes: changes.length });
      return this.mapToICDResponse(icd);

    } catch (error) {
      logger.error('Error updating ICD:', error);
      throw error instanceof ICDError ? error : new ICDError('Failed to update ICD');
    }
  }

  /**
   * Get ICD by ID
   */
  async getICDById(id: string): Promise<ICDResponse> {
    try {
      const icd = await this.prisma.interfaceControlDocument.findUnique({
        where: { id },
        include: this.getICDInclude()
      });

      if (!icd) {
        throw new ICDNotFoundError(id);
      }

      return this.mapToICDResponse(icd);
    } catch (error) {
      if (error instanceof ICDNotFoundError) throw error;
      logger.error('Error getting ICD by ID:', error);
      throw new ICDError('Failed to retrieve ICD');
    }
  }

  /**
   * Get ICD by number
   */
  async getICDByNumber(icdNumber: string): Promise<ICDResponse> {
    try {
      const icd = await this.prisma.interfaceControlDocument.findUnique({
        where: { icdNumber },
        include: this.getICDInclude()
      });

      if (!icd) {
        throw new ICDNotFoundError(icdNumber, 'icdNumber');
      }

      return this.mapToICDResponse(icd);
    } catch (error) {
      if (error instanceof ICDNotFoundError) throw error;
      logger.error('Error getting ICD by number:', error);
      throw new ICDError('Failed to retrieve ICD');
    }
  }

  /**
   * List ICDs with filtering and pagination
   */
  async listICDs(
    filters: ICDFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ icds: ICDResponse[]; total: number; page: number; totalPages: number }> {
    try {
      const where = this.buildICDWhereClause(filters);
      const skip = (page - 1) * limit;

      const [icds, total] = await Promise.all([
        this.prisma.interfaceControlDocument.findMany({
          where,
          include: this.getICDInclude(),
          skip,
          take: limit,
          orderBy: [
            { createdAt: 'desc' }
          ]
        }),
        this.prisma.interfaceControlDocument.count({ where })
      ]);

      return {
        icds: icds.map(icd => this.mapToICDResponse(icd)),
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Error listing ICDs:', error);
      throw new ICDError('Failed to list ICDs');
    }
  }

  /**
   * Update ICD status
   */
  async updateICDStatus(
    id: string,
    status: ICDStatus,
    userId?: string,
    notes?: string
  ): Promise<ICDResponse> {
    try {
      const existingICD = await this.getICDById(id);

      await this.validateStatusTransition(existingICD.status, status);

      const updateData: any = {
        status,
        lastModifiedById: userId
      };

      // Set approval fields for approved status
      if (status === ICDStatus.APPROVED && userId) {
        updateData.approvedById = userId;
        updateData.approvedDate = new Date();
      }

      const icd = await this.prisma.interfaceControlDocument.update({
        where: { id },
        data: updateData,
        include: this.getICDInclude()
      });

      // Create history entry
      await this.createHistoryEntry(id, {
        actionType: 'STATUS_CHANGE',
        fieldChanged: 'status',
        oldValue: existingICD.status,
        newValue: status,
        changeDescription: `Status changed from ${existingICD.status} to ${status}`,
        changeReason: notes,
        changedById: userId,
      });

      logger.info(`ICD status updated: ${icd.icdNumber}`, {
        icdId: id,
        oldStatus: existingICD.status,
        newStatus: status
      });

      return this.mapToICDResponse(icd);
    } catch (error) {
      logger.error('Error updating ICD status:', error);
      throw error instanceof ICDError ? error : new ICDError('Failed to update ICD status');
    }
  }

  // ============================================================================
  // Interface Requirements Management
  // ============================================================================

  /**
   * Add requirement to ICD
   */
  async addRequirement(input: InterfaceRequirementCreateInput): Promise<InterfaceRequirementResponse> {
    try {
      await this.validateRequirementInput(input);

      // Validate unique requirement ID within ICD
      await this.validateUniqueRequirementId(input.icdId, input.requirementId);

      const requirement = await this.prisma.interfaceRequirement.create({
        data: {
          ...input,
          flowdownFrom: input.flowdownFrom || [],
          priority: input.priority || 'MEDIUM',
          safetyRelated: input.safetyRelated || false,
          missionCritical: input.missionCritical || false,
          verificationMethod: input.verificationMethod || VerificationMethod.INSPECTION,
        },
        include: {
          childRequirements: true,
          complianceChecks: true,
        }
      });

      // Create history entry for ICD
      await this.createHistoryEntry(input.icdId, {
        actionType: 'REQUIREMENT_ADDED',
        changeDescription: `Added requirement ${input.requirementId}: ${input.title}`,
        changeReason: 'Requirement definition',
      });

      logger.info(`Requirement added to ICD`, {
        icdId: input.icdId,
        requirementId: input.requirementId
      });

      return this.mapToRequirementResponse(requirement);
    } catch (error) {
      logger.error('Error adding requirement:', error);
      throw error instanceof ICDError ? error : new ICDError('Failed to add requirement');
    }
  }

  /**
   * Update requirement
   */
  async updateRequirement(
    requirementId: string,
    input: InterfaceRequirementUpdateInput
  ): Promise<InterfaceRequirementResponse> {
    try {
      const requirement = await this.prisma.interfaceRequirement.update({
        where: { id: requirementId },
        data: input,
        include: {
          childRequirements: true,
          complianceChecks: true,
        }
      });

      logger.info(`Requirement updated`, { requirementId });
      return this.mapToRequirementResponse(requirement);
    } catch (error) {
      logger.error('Error updating requirement:', error);
      throw new ICDError('Failed to update requirement');
    }
  }

  // ============================================================================
  // Part Implementation/Consumption Management
  // ============================================================================

  /**
   * Link part as implementation of ICD
   */
  async linkPartImplementation(input: ICDPartImplementationCreateInput): Promise<ICDPartImplementationResponse> {
    try {
      const implementation = await this.prisma.iCDPartImplementation.create({
        data: {
          ...input,
          complianceStatus: input.complianceStatus || ComplianceStatus.UNDER_EVALUATION,
        }
      });

      await this.createHistoryEntry(input.icdId, {
        actionType: 'PART_LINKED',
        changeDescription: `Linked part ${input.partId} as implementation`,
      });

      logger.info(`Part linked as ICD implementation`, {
        icdId: input.icdId,
        partId: input.partId
      });

      return implementation;
    } catch (error) {
      logger.error('Error linking part implementation:', error);
      throw new ICDError('Failed to link part implementation');
    }
  }

  /**
   * Link part as consumer of ICD
   */
  async linkPartConsumption(input: ICDPartConsumptionCreateInput): Promise<ICDPartConsumptionResponse> {
    try {
      const consumption = await this.prisma.iCDPartConsumption.create({
        data: {
          ...input,
          alternativeOptions: input.alternativeOptions || [],
          isRequired: input.isRequired ?? true,
          isCritical: input.isCritical ?? false,
          quantityRequired: input.quantityRequired || 1,
        }
      });

      await this.createHistoryEntry(input.icdId, {
        actionType: 'PART_LINKED',
        changeDescription: `Linked part ${input.partId} as consumer`,
      });

      logger.info(`Part linked as ICD consumer`, {
        icdId: input.icdId,
        partId: input.partId
      });

      return consumption;
    } catch (error) {
      logger.error('Error linking part consumption:', error);
      throw new ICDError('Failed to link part consumption');
    }
  }

  // ============================================================================
  // Compliance Management
  // ============================================================================

  /**
   * Create compliance check
   */
  async createComplianceCheck(input: ICDComplianceCheckCreateInput): Promise<ICDComplianceCheckResponse> {
    try {
      const complianceCheck = await this.prisma.iCDComplianceCheck.create({
        data: {
          ...input,
          checkMethod: input.checkMethod || VerificationMethod.INSPECTION,
          complianceStatus: this.determineComplianceStatus(input.checkResult),
          reCheckRequired: input.reCheckRequired || false,
          escalationRequired: input.escalationRequired || false,
        }
      });

      await this.createHistoryEntry(input.icdId, {
        actionType: 'COMPLIANCE_CHECK',
        changeDescription: `Compliance check performed: ${input.checkResult}`,
        changeReason: input.checkNotes,
      });

      logger.info(`Compliance check created`, {
        icdId: input.icdId,
        checkType: input.checkType,
        result: input.checkResult
      });

      return complianceCheck;
    } catch (error) {
      logger.error('Error creating compliance check:', error);
      throw new ICDError('Failed to create compliance check');
    }
  }

  /**
   * Get compliance status for ICD
   */
  async getComplianceStatus(icdId: string): Promise<{
    overall: ComplianceStatus;
    details: ICDComplianceCheckResponse[];
    summary: Record<ComplianceStatus, number>;
  }> {
    try {
      const checks = await this.prisma.iCDComplianceCheck.findMany({
        where: { icdId, isActive: true },
        orderBy: { checkDate: 'desc' }
      });

      const summary = checks.reduce((acc, check) => {
        acc[check.complianceStatus] = (acc[check.complianceStatus] || 0) + 1;
        return acc;
      }, {} as Record<ComplianceStatus, number>);

      // Determine overall status
      let overall: ComplianceStatus;
      if (summary[ComplianceStatus.NON_COMPLIANT] > 0) {
        overall = ComplianceStatus.NON_COMPLIANT;
      } else if (summary[ComplianceStatus.CONDITIONALLY_COMPLIANT] > 0) {
        overall = ComplianceStatus.CONDITIONALLY_COMPLIANT;
      } else if (summary[ComplianceStatus.UNDER_EVALUATION] > 0) {
        overall = ComplianceStatus.UNDER_EVALUATION;
      } else {
        overall = ComplianceStatus.COMPLIANT;
      }

      return {
        overall,
        details: checks,
        summary: {
          [ComplianceStatus.COMPLIANT]: summary[ComplianceStatus.COMPLIANT] || 0,
          [ComplianceStatus.NON_COMPLIANT]: summary[ComplianceStatus.NON_COMPLIANT] || 0,
          [ComplianceStatus.CONDITIONALLY_COMPLIANT]: summary[ComplianceStatus.CONDITIONALLY_COMPLIANT] || 0,
          [ComplianceStatus.UNDER_EVALUATION]: summary[ComplianceStatus.UNDER_EVALUATION] || 0,
          [ComplianceStatus.NOT_APPLICABLE]: summary[ComplianceStatus.NOT_APPLICABLE] || 0,
        }
      };
    } catch (error) {
      logger.error('Error getting compliance status:', error);
      throw new ICDError('Failed to get compliance status');
    }
  }

  // ============================================================================
  // Analytics and Reporting
  // ============================================================================

  /**
   * Get ICD analytics
   */
  async getAnalytics(): Promise<ICDAnalytics> {
    try {
      const [
        totalICDs,
        statusCounts,
        typeCounts,
        criticalityCounts,
        complianceCounts,
        requirementCounts,
        upcomingReviews,
        expiringSoon
      ] = await Promise.all([
        this.prisma.interfaceControlDocument.count({ where: { isActive: true } }),
        this.getStatusCounts(),
        this.getTypeCounts(),
        this.getCriticalityCounts(),
        this.getComplianceCounts(),
        this.getRequirementCounts(),
        this.getUpcomingReviews(),
        this.getExpiringSoon()
      ]);

      return {
        totalICDs,
        icdsByStatus: statusCounts,
        icdsByType: typeCounts,
        icdsByCriticality: criticalityCounts,
        complianceOverview: complianceCounts,
        requirementMetrics: requirementCounts,
        upcomingReviews,
        expiringSoon
      };
    } catch (error) {
      logger.error('Error getting ICD analytics:', error);
      throw new ICDError('Failed to get analytics');
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private getICDInclude() {
    return {
      requirements: {
        include: {
          childRequirements: true,
          complianceChecks: true,
        }
      },
      implementingParts: true,
      consumingAssemblies: true,
      versions: true,
      history: {
        orderBy: { changedAt: 'desc' as const },
        take: 50
      },
      attachments: true,
      complianceChecks: true,
      changeRequests: true,
    };
  }

  private mapToICDResponse(icd: any): ICDResponse {
    return {
      id: icd.id,
      persistentUuid: icd.persistentUuid,
      icdNumber: icd.icdNumber,
      icdName: icd.icdName,
      title: icd.title,
      description: icd.description,
      version: icd.version,
      revisionLevel: icd.revisionLevel,
      status: icd.status,
      interfaceType: icd.interfaceType,
      interfaceDirection: icd.interfaceDirection,
      criticality: icd.criticality,
      applicableStandards: icd.applicableStandards,
      complianceNotes: icd.complianceNotes,
      effectiveDate: icd.effectiveDate,
      expirationDate: icd.expirationDate,
      effectivityType: icd.effectivityType,
      effectivityValue: icd.effectivityValue,
      ownerId: icd.ownerId,
      ownerName: icd.ownerName,
      ownerDepartment: icd.ownerDepartment,
      approvedById: icd.approvedById,
      approvedDate: icd.approvedDate,
      reviewCycle: icd.reviewCycle,
      nextReviewDate: icd.nextReviewDate,
      documentationUrl: icd.documentationUrl,
      drawingReferences: icd.drawingReferences,
      specificationRefs: icd.specificationRefs,
      isActive: icd.isActive,
      createdAt: icd.createdAt,
      updatedAt: icd.updatedAt,
      createdById: icd.createdById,
      lastModifiedById: icd.lastModifiedById,
      requirements: icd.requirements?.map((req: any) => this.mapToRequirementResponse(req)),
      implementingParts: icd.implementingParts,
      consumingAssemblies: icd.consumingAssemblies,
      versions: icd.versions,
      history: icd.history,
      attachments: icd.attachments,
      complianceChecks: icd.complianceChecks,
      changeRequests: icd.changeRequests,
    };
  }

  private mapToRequirementResponse(req: any): InterfaceRequirementResponse {
    return {
      id: req.id,
      icdId: req.icdId,
      requirementId: req.requirementId,
      category: req.category,
      subcategory: req.subcategory,
      title: req.title,
      description: req.description,
      specification: req.specification,
      tolerance: req.tolerance,
      units: req.units,
      nominalValue: req.nominalValue,
      minimumValue: req.minimumValue,
      maximumValue: req.maximumValue,
      testConditions: req.testConditions,
      verificationMethod: req.verificationMethod,
      verificationProcedure: req.verificationProcedure,
      acceptanceCriteria: req.acceptanceCriteria,
      parentRequirementId: req.parentRequirementId,
      flowdownFrom: req.flowdownFrom,
      rationale: req.rationale,
      priority: req.priority,
      safetyRelated: req.safetyRelated,
      missionCritical: req.missionCritical,
      isActive: req.isActive,
      createdAt: req.createdAt,
      updatedAt: req.updatedAt,
      childRequirements: req.childRequirements?.map((child: any) => this.mapToRequirementResponse(child)),
      complianceChecks: req.complianceChecks,
    };
  }

  private buildICDWhereClause(filters: ICDFilters): Prisma.InterfaceControlDocumentWhereInput {
    const where: Prisma.InterfaceControlDocumentWhereInput = {};

    if (filters.status && filters.status.length > 0) {
      where.status = { in: filters.status };
    }

    if (filters.interfaceType && filters.interfaceType.length > 0) {
      where.interfaceType = { in: filters.interfaceType };
    }

    if (filters.criticality && filters.criticality.length > 0) {
      where.criticality = { in: filters.criticality };
    }

    if (filters.ownerId) {
      where.ownerId = filters.ownerId;
    }

    if (filters.ownerDepartment) {
      where.ownerDepartment = filters.ownerDepartment;
    }

    if (filters.effectiveDateFrom || filters.effectiveDateTo) {
      where.effectiveDate = {};
      if (filters.effectiveDateFrom) {
        where.effectiveDate.gte = filters.effectiveDateFrom;
      }
      if (filters.effectiveDateTo) {
        where.effectiveDate.lte = filters.effectiveDateTo;
      }
    }

    if (filters.standards && filters.standards.length > 0) {
      where.applicableStandards = {
        hasSome: filters.standards
      };
    }

    if (filters.search) {
      where.OR = [
        { icdNumber: { contains: filters.search, mode: 'insensitive' } },
        { icdName: { contains: filters.search, mode: 'insensitive' } },
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return where;
  }

  private async validateICDInput(input: ICDCreateInput): Promise<void> {
    if (!input.icdNumber || input.icdNumber.trim().length === 0) {
      throw new ICDValidationError('ICD number is required', 'icdNumber');
    }

    if (!input.icdName || input.icdName.trim().length === 0) {
      throw new ICDValidationError('ICD name is required', 'icdName');
    }

    if (!input.title || input.title.trim().length === 0) {
      throw new ICDValidationError('Title is required', 'title');
    }

    if (!input.version || input.version.trim().length === 0) {
      throw new ICDValidationError('Version is required', 'version');
    }

    if (!Object.values(InterfaceType).includes(input.interfaceType)) {
      throw new ICDValidationError('Invalid interface type', 'interfaceType', input.interfaceType);
    }

    if (input.effectiveDate && input.expirationDate && input.effectiveDate >= input.expirationDate) {
      throw new ICDValidationError('Effective date must be before expiration date', 'effectiveDate');
    }
  }

  private async validateUniqueICDNumber(icdNumber: string): Promise<void> {
    const existing = await this.prisma.interfaceControlDocument.findUnique({
      where: { icdNumber }
    });

    if (existing) {
      throw new ICDValidationError(`ICD number ${icdNumber} already exists`, 'icdNumber', icdNumber);
    }
  }

  private async validateUniqueRequirementId(icdId: string, requirementId: string): Promise<void> {
    const existing = await this.prisma.interfaceRequirement.findFirst({
      where: { icdId, requirementId }
    });

    if (existing) {
      throw new ICDValidationError(
        `Requirement ID ${requirementId} already exists in this ICD`,
        'requirementId',
        requirementId
      );
    }
  }

  private async validateICDUpdate(existing: ICDResponse, input: ICDUpdateInput): Promise<void> {
    // Prevent changes to critical fields in certain states
    if (existing.status === ICDStatus.RELEASED || existing.status === ICDStatus.APPROVED) {
      const restrictedFields = ['icdNumber', 'interfaceType', 'criticality'];
      for (const field of restrictedFields) {
        if (input[field as keyof ICDUpdateInput] !== undefined) {
          throw new ICDStateError(
            `Cannot modify ${field} when ICD is in ${existing.status} state`,
            existing.status,
            `update_${field}`
          );
        }
      }
    }
  }

  private validateStatusTransition(currentStatus: ICDStatus, newStatus: ICDStatus): void {
    const validTransitions: Record<ICDStatus, ICDStatus[]> = {
      [ICDStatus.DRAFT]: [ICDStatus.UNDER_REVIEW, ICDStatus.WITHDRAWN],
      [ICDStatus.UNDER_REVIEW]: [ICDStatus.DRAFT, ICDStatus.PENDING_APPROVAL, ICDStatus.WITHDRAWN],
      [ICDStatus.PENDING_APPROVAL]: [ICDStatus.UNDER_REVIEW, ICDStatus.APPROVED, ICDStatus.WITHDRAWN],
      [ICDStatus.APPROVED]: [ICDStatus.RELEASED, ICDStatus.SUPERSEDED],
      [ICDStatus.RELEASED]: [ICDStatus.SUPERSEDED, ICDStatus.OBSOLETE],
      [ICDStatus.SUPERSEDED]: [ICDStatus.OBSOLETE],
      [ICDStatus.OBSOLETE]: [],
      [ICDStatus.WITHDRAWN]: []
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new ICDStateError(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
        currentStatus,
        `transition_to_${newStatus}`
      );
    }
  }

  private async validateRequirementInput(input: InterfaceRequirementCreateInput): Promise<void> {
    if (!input.requirementId || input.requirementId.trim().length === 0) {
      throw new ICDValidationError('Requirement ID is required', 'requirementId');
    }

    if (!input.title || input.title.trim().length === 0) {
      throw new ICDValidationError('Requirement title is required', 'title');
    }

    if (!input.description || input.description.trim().length === 0) {
      throw new ICDValidationError('Requirement description is required', 'description');
    }

    if (!input.category || input.category.trim().length === 0) {
      throw new ICDValidationError('Requirement category is required', 'category');
    }
  }

  private trackChanges(existing: ICDResponse, input: ICDUpdateInput): Array<{
    field: string;
    oldValue: string;
    newValue: string;
  }> {
    const changes: Array<{ field: string; oldValue: string; newValue: string }> = [];

    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined && value !== existing[key as keyof ICDResponse]) {
        changes.push({
          field: key,
          oldValue: String(existing[key as keyof ICDResponse] || ''),
          newValue: String(value)
        });
      }
    }

    return changes;
  }

  private determineComplianceStatus(checkResult: string): ComplianceStatus {
    const result = checkResult.toLowerCase();
    if (result.includes('pass') || result.includes('compliant')) {
      return ComplianceStatus.COMPLIANT;
    } else if (result.includes('fail') || result.includes('non-compliant')) {
      return ComplianceStatus.NON_COMPLIANT;
    } else if (result.includes('conditional')) {
      return ComplianceStatus.CONDITIONALLY_COMPLIANT;
    } else if (result.includes('n/a') || result.includes('not applicable')) {
      return ComplianceStatus.NOT_APPLICABLE;
    } else {
      return ComplianceStatus.UNDER_EVALUATION;
    }
  }

  private async createHistoryEntry(icdId: string, data: {
    actionType: string;
    fieldChanged?: string;
    oldValue?: string;
    newValue?: string;
    changeDescription?: string;
    changeReason?: string;
    changedById?: string;
    changedByName?: string;
  }): Promise<void> {
    await this.prisma.iCDHistory.create({
      data: {
        icdId,
        ...data,
        changedAt: new Date(),
      }
    });
  }

  private async createVersionEntry(icdId: string, data: {
    versionNumber: string;
    versionType: string;
    changeDescription: string;
    changeReason?: string;
    changeCategory: string[];
    createdById?: string;
  }): Promise<void> {
    await this.prisma.iCDVersion.create({
      data: {
        icdId,
        ...data,
        createdDate: new Date(),
      }
    });
  }

  // Analytics helper methods
  private async getStatusCounts(): Promise<Record<ICDStatus, number>> {
    const counts = await this.prisma.interfaceControlDocument.groupBy({
      by: ['status'],
      where: { isActive: true },
      _count: { status: true }
    });

    const result = {} as Record<ICDStatus, number>;
    for (const status of Object.values(ICDStatus)) {
      result[status] = counts.find(c => c.status === status)?._count.status || 0;
    }
    return result;
  }

  private async getTypeCounts(): Promise<Record<InterfaceType, number>> {
    const counts = await this.prisma.interfaceControlDocument.groupBy({
      by: ['interfaceType'],
      where: { isActive: true },
      _count: { interfaceType: true }
    });

    const result = {} as Record<InterfaceType, number>;
    for (const type of Object.values(InterfaceType)) {
      result[type] = counts.find(c => c.interfaceType === type)?._count.interfaceType || 0;
    }
    return result;
  }

  private async getCriticalityCounts(): Promise<Record<InterfaceCriticality, number>> {
    const counts = await this.prisma.interfaceControlDocument.groupBy({
      by: ['criticality'],
      where: { isActive: true },
      _count: { criticality: true }
    });

    const result = {} as Record<InterfaceCriticality, number>;
    for (const criticality of Object.values(InterfaceCriticality)) {
      result[criticality] = counts.find(c => c.criticality === criticality)?._count.criticality || 0;
    }
    return result;
  }

  private async getComplianceCounts(): Promise<{
    compliant: number;
    nonCompliant: number;
    underEvaluation: number;
    conditionallyCompliant: number;
  }> {
    const counts = await this.prisma.iCDComplianceCheck.groupBy({
      by: ['complianceStatus'],
      where: { isActive: true },
      _count: { complianceStatus: true }
    });

    return {
      compliant: counts.find(c => c.complianceStatus === ComplianceStatus.COMPLIANT)?._count.complianceStatus || 0,
      nonCompliant: counts.find(c => c.complianceStatus === ComplianceStatus.NON_COMPLIANT)?._count.complianceStatus || 0,
      underEvaluation: counts.find(c => c.complianceStatus === ComplianceStatus.UNDER_EVALUATION)?._count.complianceStatus || 0,
      conditionallyCompliant: counts.find(c => c.complianceStatus === ComplianceStatus.CONDITIONALLY_COMPLIANT)?._count.complianceStatus || 0,
    };
  }

  private async getRequirementCounts(): Promise<{
    totalRequirements: number;
    safetyRelated: number;
    missionCritical: number;
  }> {
    const [total, safetyRelated, missionCritical] = await Promise.all([
      this.prisma.interfaceRequirement.count({ where: { isActive: true } }),
      this.prisma.interfaceRequirement.count({ where: { isActive: true, safetyRelated: true } }),
      this.prisma.interfaceRequirement.count({ where: { isActive: true, missionCritical: true } })
    ]);

    return {
      totalRequirements: total,
      safetyRelated,
      missionCritical
    };
  }

  private async getUpcomingReviews(): Promise<number> {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    return this.prisma.interfaceControlDocument.count({
      where: {
        isActive: true,
        nextReviewDate: {
          lte: nextWeek
        }
      }
    });
  }

  private async getExpiringSoon(): Promise<number> {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    return this.prisma.interfaceControlDocument.count({
      where: {
        isActive: true,
        expirationDate: {
          lte: nextMonth
        }
      }
    });
  }
}