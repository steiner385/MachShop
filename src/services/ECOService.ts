/**
 * ✅ GITHUB ISSUE #22: ECO (Engineering Change Order) Service
 *
 * ECOService - Core service for managing Engineering Change Orders,
 * impact analysis, task management, and complete ECO lifecycle
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../utils/logger';
import {
  ECOCreateInput,
  ECOUpdateInput,
  ECOResponse,
  ECOTaskCreateInput,
  ECOTaskUpdateInput,
  ECOTaskResponse,
  ECOAffectedDocumentCreateInput,
  ECOAffectedDocumentResponse,
  ECOAttachmentCreateInput,
  ECOAttachmentResponse,
  ECOHistoryCreateInput,
  ECOHistoryResponse,
  ECOFilters,
  ECOTaskFilters,
  ImpactAnalysisInput,
  ImpactAnalysisResponse,
  OperationalImpact,
  CostImpact,
  RiskAssessment,
  ECOAnalytics,
  ECOError,
  ECOValidationError,
  ECOStateError,
  ECOPermissionError
} from '../types/eco';
import {
  ECOType,
  ECOPriority,
  ECOStatus,
  ECOTaskType,
  ECOTaskStatus,
  ECOEventType,
  EffectivityType,
  AttachmentType,
  DocUpdateStatus
} from '@prisma/client';

export class ECOService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // ============================================================================
  // ECO Lifecycle Management
  // ============================================================================

  /**
   * Create a new Engineering Change Order
   */
  async createECO(input: ECOCreateInput): Promise<ECOResponse> {
    try {
      await this.validateECOInput(input);

      const ecoNumber = await this.generateECONumber(input.ecoType);

      const eco = await this.prisma.engineeringChangeOrder.create({
        data: {
          ecoNumber,
          title: input.title,
          description: input.description,
          ecoType: input.ecoType,
          priority: input.priority,
          currentState: input.currentState,
          proposedChange: input.proposedChange,
          reasonForChange: input.reasonForChange,
          benefitsExpected: input.benefitsExpected,
          risksIfNotImplemented: input.risksIfNotImplemented,
          requestorId: input.requestorId,
          requestorName: input.requestorName,
          requestorDept: input.requestorDept,
          sponsorId: input.sponsorId,
          sponsorName: input.sponsorName,
          affectedParts: input.affectedParts || [],
          affectedOperations: input.affectedOperations || [],
          estimatedCost: input.estimatedCost,
          estimatedSavings: input.estimatedSavings,
          requestedEffectiveDate: input.requestedEffectiveDate,
          effectivityType: input.effectivityType,
          effectivityValue: input.effectivityValue,
          isInterchangeable: input.isInterchangeable || false,
        },
        include: this.getECOInclude()
      });

      // Create history entry
      await this.createHistoryEntry(eco.id, {
        eventType: ECOEventType.ECO_CREATED,
        eventDescription: `ECO ${ecoNumber} created`,
        toStatus: ECOStatus.REQUESTED,
        performedById: input.requestorId,
        performedByName: input.requestorName,
        performedByRole: 'Requestor'
      });

      logger.info(`ECO created successfully: ${ecoNumber}`, { ecoId: eco.id });
      return this.mapECOToResponse(eco);

    } catch (error) {
      logger.error('Error creating ECO:', error);
      throw new ECOError(`Failed to create ECO: ${error.message}`);
    }
  }

  /**
   * Update an existing ECO
   */
  async updateECO(ecoId: string, input: ECOUpdateInput, userId: string): Promise<ECOResponse> {
    try {
      const existingECO = await this.getECOById(ecoId);
      await this.validateECOUpdatePermissions(existingECO, userId);

      const eco = await this.prisma.engineeringChangeOrder.update({
        where: { id: ecoId },
        data: {
          ...input,
          updatedAt: new Date()
        },
        include: this.getECOInclude()
      });

      // Create history entry for significant updates
      const significantFields = ['title', 'description', 'priority', 'estimatedCost'];
      const hasSignificantChanges = significantFields.some(field => field in input);

      if (hasSignificantChanges) {
        await this.createHistoryEntry(ecoId, {
          eventType: ECOEventType.ECO_CREATED, // Reusing for updates
          eventDescription: 'ECO updated with significant changes',
          performedById: userId,
          performedByName: 'User', // Would get from user context
          performedByRole: 'Editor',
          details: input
        });
      }

      logger.info(`ECO updated successfully: ${eco.ecoNumber}`, { ecoId });
      return this.mapECOToResponse(eco);

    } catch (error) {
      logger.error('Error updating ECO:', error);
      throw new ECOError(`Failed to update ECO: ${error.message}`);
    }
  }

  /**
   * Change ECO status with validation
   */
  async changeECOStatus(
    ecoId: string,
    newStatus: ECOStatus,
    userId: string,
    reason?: string
  ): Promise<ECOResponse> {
    try {
      const existingECO = await this.getECOById(ecoId);
      await this.validateStatusTransition(existingECO.status, newStatus);

      const eco = await this.prisma.engineeringChangeOrder.update({
        where: { id: ecoId },
        data: {
          status: newStatus,
          updatedAt: new Date(),
          // Set completion dates based on status
          ...(newStatus === ECOStatus.COMPLETED && { completedDate: new Date() }),
          ...(newStatus === ECOStatus.VERIFICATION && { verifiedDate: new Date() }),
          ...(newStatus === ECOStatus.CANCELLED && { closedDate: new Date(), closedById: userId })
        },
        include: this.getECOInclude()
      });

      // Create history entry
      await this.createHistoryEntry(ecoId, {
        eventType: ECOEventType.STATUS_CHANGED,
        eventDescription: `Status changed from ${existingECO.status} to ${newStatus}${reason ? `: ${reason}` : ''}`,
        fromStatus: existingECO.status,
        toStatus: newStatus,
        performedById: userId,
        performedByName: 'User',
        performedByRole: 'Manager'
      });

      logger.info(`ECO status changed: ${eco.ecoNumber} -> ${newStatus}`, { ecoId });
      return this.mapECOToResponse(eco);

    } catch (error) {
      logger.error('Error changing ECO status:', error);
      throw new ECOError(`Failed to change ECO status: ${error.message}`);
    }
  }

  /**
   * Cancel an ECO
   */
  async cancelECO(ecoId: string, reason: string, userId: string): Promise<ECOResponse> {
    try {
      const eco = await this.changeECOStatus(ecoId, ECOStatus.CANCELLED, userId, reason);

      // Cancel all pending tasks
      await this.prisma.eCOTask.updateMany({
        where: {
          ecoId,
          status: { in: [ECOTaskStatus.PENDING, ECOTaskStatus.IN_PROGRESS] }
        },
        data: {
          status: ECOTaskStatus.CANCELLED,
          completionNotes: `Cancelled due to ECO cancellation: ${reason}`
        }
      });

      return eco;
    } catch (error) {
      logger.error('Error cancelling ECO:', error);
      throw new ECOError(`Failed to cancel ECO: ${error.message}`);
    }
  }

  /**
   * Complete an ECO
   */
  async completeECO(ecoId: string, userId: string): Promise<ECOResponse> {
    try {
      // Validate all tasks are completed
      const pendingTasks = await this.prisma.eCOTask.count({
        where: {
          ecoId,
          status: { not: ECOTaskStatus.COMPLETED }
        }
      });

      if (pendingTasks > 0) {
        throw new ECOStateError(`Cannot complete ECO: ${pendingTasks} tasks are not completed`, ECOStatus.IMPLEMENTATION);
      }

      const eco = await this.changeECOStatus(ecoId, ECOStatus.COMPLETED, userId);

      await this.createHistoryEntry(ecoId, {
        eventType: ECOEventType.ECO_COMPLETED,
        eventDescription: 'ECO completed successfully',
        performedById: userId,
        performedByName: 'User',
        performedByRole: 'Manager'
      });

      return eco;
    } catch (error) {
      logger.error('Error completing ECO:', error);
      throw new ECOError(`Failed to complete ECO: ${error.message}`);
    }
  }

  // ============================================================================
  // Impact Analysis
  // ============================================================================

  /**
   * Analyze impact of an ECO
   */
  async analyzeImpact(input: ImpactAnalysisInput): Promise<ImpactAnalysisResponse> {
    try {
      const eco = await this.getECOById(input.ecoId);

      const affectedDocuments = await this.identifyAffectedDocuments(input.ecoId);
      const operationalImpact = await this.calculateOperationalImpact(eco);
      const costImpact = await this.calculateCostImpact(eco);
      const riskAssessment = await this.assessRisk(eco);

      const documentsByType = affectedDocuments.reduce((acc, doc) => {
        acc[doc.documentType] = (acc[doc.documentType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const implementationComplexity = this.determineImplementationComplexity(
        affectedDocuments.length,
        operationalImpact,
        costImpact
      );

      const estimatedImplementationTime = this.estimateImplementationTime(
        affectedDocuments.length,
        operationalImpact,
        implementationComplexity
      );

      // Update ECO with impact analysis
      await this.prisma.engineeringChangeOrder.update({
        where: { id: input.ecoId },
        data: {
          impactAnalysis: {
            totalDocumentsAffected: affectedDocuments.length,
            documentsByType,
            operationalImpact,
            costImpact,
            riskAssessment,
            implementationComplexity,
            estimatedImplementationTime,
            generatedAt: new Date()
          }
        }
      });

      return {
        ecoId: input.ecoId,
        totalDocumentsAffected: affectedDocuments.length,
        documentsByType,
        operationalImpact,
        costImpact,
        riskAssessment,
        implementationComplexity,
        estimatedImplementationTime,
        affectedDocuments,
        generatedAt: new Date()
      };

    } catch (error) {
      logger.error('Error analyzing ECO impact:', error);
      throw new ECOError(`Failed to analyze ECO impact: ${error.message}`);
    }
  }

  /**
   * Identify all documents affected by the ECO
   */
  async identifyAffectedDocuments(ecoId: string): Promise<ECOAffectedDocumentResponse[]> {
    try {
      const eco = await this.getECOById(ecoId);
      const affectedDocuments: ECOAffectedDocumentCreateInput[] = [];

      // Find WorkInstructions that use affected parts
      if (eco.affectedParts.length > 0) {
        const workInstructions = await this.prisma.workInstruction.findMany({
          where: {
            partId: { in: eco.affectedParts },
            status: { not: 'ARCHIVED' }
          },
          select: { id: true, title: true, version: true }
        });

        workInstructions.forEach(wi => {
          affectedDocuments.push({
            documentType: 'WorkInstruction',
            documentId: wi.id,
            documentTitle: wi.title,
            currentVersion: wi.version
          });
        });
      }

      // Find SetupSheets for affected operations
      if (eco.affectedOperations.length > 0) {
        const setupSheets = await this.prisma.setupSheet.findMany({
          where: {
            operationId: { in: eco.affectedOperations }
          },
          select: { id: true, name: true, version: true }
        });

        setupSheets.forEach(ss => {
          affectedDocuments.push({
            documentType: 'SetupSheet',
            documentId: ss.id,
            documentTitle: ss.name,
            currentVersion: ss.version || '1.0'
          });
        });
      }

      // Create affected document records
      const createdDocuments = await Promise.all(
        affectedDocuments.map(doc =>
          this.prisma.eCOAffectedDocument.upsert({
            where: {
              ecoId_documentType_documentId: {
                ecoId,
                documentType: doc.documentType,
                documentId: doc.documentId
              }
            },
            update: {},
            create: {
              ecoId,
              ...doc
            }
          })
        )
      );

      return createdDocuments.map(this.mapAffectedDocumentToResponse);

    } catch (error) {
      logger.error('Error identifying affected documents:', error);
      throw new ECOError(`Failed to identify affected documents: ${error.message}`);
    }
  }

  // ============================================================================
  // Task Management
  // ============================================================================

  /**
   * Create a new ECO task
   */
  async createTask(ecoId: string, input: ECOTaskCreateInput): Promise<ECOTaskResponse> {
    try {
      await this.getECOById(ecoId); // Validate ECO exists

      const task = await this.prisma.eCOTask.create({
        data: {
          ecoId,
          ...input
        }
      });

      await this.createHistoryEntry(ecoId, {
        eventType: ECOEventType.TASK_CREATED,
        eventDescription: `Task created: ${input.taskName}`,
        performedById: input.assignedToId || 'system',
        performedByName: input.assignedToName || 'System',
        performedByRole: 'Manager'
      });

      logger.info(`ECO task created: ${input.taskName}`, { ecoId, taskId: task.id });
      return this.mapTaskToResponse(task);

    } catch (error) {
      logger.error('Error creating ECO task:', error);
      throw new ECOError(`Failed to create ECO task: ${error.message}`);
    }
  }

  /**
   * Assign a task to a user
   */
  async assignTask(taskId: string, userId: string, userName: string): Promise<ECOTaskResponse> {
    try {
      const task = await this.prisma.eCOTask.update({
        where: { id: taskId },
        data: {
          assignedToId: userId,
          assignedToName: userName,
          updatedAt: new Date()
        }
      });

      await this.createHistoryEntry(task.ecoId, {
        eventType: ECOEventType.TASK_CREATED, // Reusing for assignment
        eventDescription: `Task "${task.taskName}" assigned to ${userName}`,
        performedById: userId,
        performedByName: userName,
        performedByRole: 'Manager'
      });

      return this.mapTaskToResponse(task);

    } catch (error) {
      logger.error('Error assigning ECO task:', error);
      throw new ECOError(`Failed to assign ECO task: ${error.message}`);
    }
  }

  /**
   * Complete a task
   */
  async completeTask(taskId: string, notes: string, userId: string): Promise<ECOTaskResponse> {
    try {
      const task = await this.prisma.eCOTask.update({
        where: { id: taskId },
        data: {
          status: ECOTaskStatus.COMPLETED,
          completedAt: new Date(),
          completionNotes: notes,
          updatedAt: new Date()
        }
      });

      await this.createHistoryEntry(task.ecoId, {
        eventType: ECOEventType.TASK_COMPLETED,
        eventDescription: `Task completed: ${task.taskName}`,
        performedById: userId,
        performedByName: 'User',
        performedByRole: 'Assignee',
        details: { notes }
      });

      logger.info(`ECO task completed: ${task.taskName}`, { ecoId: task.ecoId, taskId });
      return this.mapTaskToResponse(task);

    } catch (error) {
      logger.error('Error completing ECO task:', error);
      throw new ECOError(`Failed to complete ECO task: ${error.message}`);
    }
  }

  /**
   * Get ECO tasks with filters
   */
  async getECOTasks(ecoId: string, filters?: ECOTaskFilters): Promise<ECOTaskResponse[]> {
    try {
      const where: Prisma.ECOTaskWhereInput = {
        ecoId,
        ...(filters?.status && { status: { in: filters.status } }),
        ...(filters?.taskType && { taskType: { in: filters.taskType } }),
        ...(filters?.assignedToId && { assignedToId: filters.assignedToId }),
        ...(filters?.dueDateFrom && { dueDate: { gte: filters.dueDateFrom } }),
        ...(filters?.dueDateTo && { dueDate: { lte: filters.dueDateTo } })
      };

      const tasks = await this.prisma.eCOTask.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: filters?.page ? (filters.page - 1) * (filters.limit || 20) : 0,
        take: filters?.limit || 20
      });

      return tasks.map(this.mapTaskToResponse);

    } catch (error) {
      logger.error('Error getting ECO tasks:', error);
      throw new ECOError(`Failed to get ECO tasks: ${error.message}`);
    }
  }

  // ============================================================================
  // Attachment Management
  // ============================================================================

  /**
   * Add attachment to ECO
   */
  async addAttachment(ecoId: string, input: ECOAttachmentCreateInput): Promise<ECOAttachmentResponse> {
    try {
      await this.getECOById(ecoId); // Validate ECO exists

      const attachment = await this.prisma.eCOAttachment.create({
        data: {
          ecoId,
          ...input
        }
      });

      await this.createHistoryEntry(ecoId, {
        eventType: ECOEventType.ATTACHMENT_ADDED,
        eventDescription: `Attachment added: ${input.fileName}`,
        performedById: input.uploadedById,
        performedByName: input.uploadedByName,
        performedByRole: 'User'
      });

      logger.info(`ECO attachment added: ${input.fileName}`, { ecoId, attachmentId: attachment.id });
      return this.mapAttachmentToResponse(attachment);

    } catch (error) {
      logger.error('Error adding ECO attachment:', error);
      throw new ECOError(`Failed to add ECO attachment: ${error.message}`);
    }
  }

  /**
   * Get ECO attachments
   */
  async getAttachments(ecoId: string, type?: AttachmentType): Promise<ECOAttachmentResponse[]> {
    try {
      const attachments = await this.prisma.eCOAttachment.findMany({
        where: {
          ecoId,
          ...(type && { attachmentType: type })
        },
        orderBy: { uploadedAt: 'desc' }
      });

      return attachments.map(this.mapAttachmentToResponse);

    } catch (error) {
      logger.error('Error getting ECO attachments:', error);
      throw new ECOError(`Failed to get ECO attachments: ${error.message}`);
    }
  }

  // ============================================================================
  // Query Methods
  // ============================================================================

  /**
   * Get ECOs with filters
   */
  async getECOs(filters?: ECOFilters): Promise<ECOResponse[]> {
    try {
      const where: Prisma.EngineeringChangeOrderWhereInput = {
        ...(filters?.status && { status: { in: filters.status } }),
        ...(filters?.priority && { priority: { in: filters.priority } }),
        ...(filters?.ecoType && { ecoType: { in: filters.ecoType } }),
        ...(filters?.requestorId && { requestorId: filters.requestorId }),
        ...(filters?.requestDateFrom && { requestDate: { gte: filters.requestDateFrom } }),
        ...(filters?.requestDateTo && { requestDate: { lte: filters.requestDateTo } }),
        ...(filters?.affectedPart && { affectedParts: { has: filters.affectedPart } }),
        ...(filters?.searchTerm && {
          OR: [
            { title: { contains: filters.searchTerm, mode: 'insensitive' } },
            { description: { contains: filters.searchTerm, mode: 'insensitive' } },
            { ecoNumber: { contains: filters.searchTerm, mode: 'insensitive' } }
          ]
        })
      };

      const ecos = await this.prisma.engineeringChangeOrder.findMany({
        where,
        include: this.getECOInclude(),
        orderBy: { createdAt: 'desc' },
        skip: filters?.page ? (filters.page - 1) * (filters.limit || 20) : 0,
        take: filters?.limit || 20
      });

      return ecos.map(this.mapECOToResponse);

    } catch (error) {
      logger.error('Error getting ECOs:', error);
      throw new ECOError(`Failed to get ECOs: ${error.message}`);
    }
  }

  /**
   * Get ECO by ID
   */
  async getECOById(ecoId: string): Promise<ECOResponse> {
    try {
      const eco = await this.prisma.engineeringChangeOrder.findUnique({
        where: { id: ecoId },
        include: this.getECOInclude()
      });

      if (!eco) {
        throw new ECOError(`ECO not found: ${ecoId}`, 'ECO_NOT_FOUND');
      }

      return this.mapECOToResponse(eco);

    } catch (error) {
      logger.error('Error getting ECO by ID:', error);
      throw new ECOError(`Failed to get ECO: ${error.message}`);
    }
  }

  /**
   * Get ECO by number
   */
  async getECOByNumber(ecoNumber: string): Promise<ECOResponse> {
    try {
      const eco = await this.prisma.engineeringChangeOrder.findUnique({
        where: { ecoNumber },
        include: this.getECOInclude()
      });

      if (!eco) {
        throw new ECOError(`ECO not found: ${ecoNumber}`, 'ECO_NOT_FOUND');
      }

      return this.mapECOToResponse(eco);

    } catch (error) {
      logger.error('Error getting ECO by number:', error);
      throw new ECOError(`Failed to get ECO: ${error.message}`);
    }
  }

  /**
   * Get ECOs assigned to user
   */
  async getMyECOs(userId: string): Promise<ECOResponse[]> {
    try {
      // Get ECOs where user is requestor, sponsor, or has assigned tasks
      const ecos = await this.prisma.engineeringChangeOrder.findMany({
        where: {
          OR: [
            { requestorId: userId },
            { sponsorId: userId },
            { tasks: { some: { assignedToId: userId } } }
          ]
        },
        include: this.getECOInclude(),
        orderBy: { createdAt: 'desc' }
      });

      return ecos.map(this.mapECOToResponse);

    } catch (error) {
      logger.error('Error getting user ECOs:', error);
      throw new ECOError(`Failed to get user ECOs: ${error.message}`);
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async validateECOInput(input: ECOCreateInput): Promise<void> {
    if (!input.title?.trim()) {
      throw new ECOValidationError('Title is required', 'title');
    }
    if (!input.description?.trim()) {
      throw new ECOValidationError('Description is required', 'description');
    }
    if (!input.currentState?.trim()) {
      throw new ECOValidationError('Current state is required', 'currentState');
    }
    if (!input.proposedChange?.trim()) {
      throw new ECOValidationError('Proposed change is required', 'proposedChange');
    }
    if (!input.reasonForChange?.trim()) {
      throw new ECOValidationError('Reason for change is required', 'reasonForChange');
    }
  }

  private async validateECOUpdatePermissions(eco: ECOResponse, userId: string): Promise<void> {
    // Allow requestor, sponsor, or admin to update
    if (eco.requestorId !== userId && eco.sponsorId !== userId) {
      // Could add admin role check here
      throw new ECOPermissionError('User does not have permission to update this ECO', userId);
    }
  }

  private async validateStatusTransition(currentStatus: ECOStatus, newStatus: ECOStatus): Promise<void> {
    const validTransitions: Record<ECOStatus, ECOStatus[]> = {
      [ECOStatus.REQUESTED]: [ECOStatus.UNDER_REVIEW, ECOStatus.REJECTED, ECOStatus.CANCELLED],
      [ECOStatus.UNDER_REVIEW]: [ECOStatus.PENDING_CRB, ECOStatus.REJECTED, ECOStatus.ON_HOLD],
      [ECOStatus.PENDING_CRB]: [ECOStatus.CRB_APPROVED, ECOStatus.REJECTED],
      [ECOStatus.CRB_APPROVED]: [ECOStatus.IMPLEMENTATION],
      [ECOStatus.IMPLEMENTATION]: [ECOStatus.VERIFICATION, ECOStatus.ON_HOLD],
      [ECOStatus.VERIFICATION]: [ECOStatus.COMPLETED, ECOStatus.IMPLEMENTATION],
      [ECOStatus.ON_HOLD]: [ECOStatus.UNDER_REVIEW, ECOStatus.IMPLEMENTATION, ECOStatus.CANCELLED],
      [ECOStatus.COMPLETED]: [],
      [ECOStatus.REJECTED]: [],
      [ECOStatus.CANCELLED]: []
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new ECOStateError(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
        currentStatus
      );
    }
  }

  private async generateECONumber(ecoType: ECOType): Promise<string> {
    const year = new Date().getFullYear();
    const typePrefix = ecoType.charAt(0); // First letter of ECO type

    // Get next sequence number for this year and type
    const lastECO = await this.prisma.engineeringChangeOrder.findFirst({
      where: {
        ecoNumber: { startsWith: `ECO-${year}-${typePrefix}` }
      },
      orderBy: { createdAt: 'desc' }
    });

    let nextSequence = 1;
    if (lastECO) {
      const lastSequence = parseInt(lastECO.ecoNumber.split('-').pop() || '0');
      nextSequence = lastSequence + 1;
    }

    return `ECO-${year}-${typePrefix}-${nextSequence.toString().padStart(4, '0')}`;
  }

  private async createHistoryEntry(ecoId: string, input: ECOHistoryCreateInput): Promise<void> {
    await this.prisma.eCOHistory.create({
      data: {
        ecoId,
        ...input
      }
    });
  }

  private async calculateOperationalImpact(eco: ECOResponse): Promise<OperationalImpact> {
    // Simplified impact calculation - would be more complex in real implementation
    return {
      activeWorkOrdersAffected: eco.affectedParts.length * 2,
      plannedWorkOrdersAffected: eco.affectedParts.length * 5,
      inventoryImpact: {
        wipValue: eco.estimatedCost || 0,
        finishedGoodsValue: (eco.estimatedCost || 0) * 1.5,
        rawMaterialsValue: (eco.estimatedCost || 0) * 0.3
      },
      productionCapacityImpact: eco.priority === ECOPriority.CRITICAL ? 15 : 5,
      trainingRequired: eco.affectedOperations.length > 0,
      trainingHours: eco.affectedOperations.length * 4
    };
  }

  private async calculateCostImpact(eco: ECOResponse): Promise<CostImpact> {
    const implementationCost = eco.estimatedCost || 0;
    const toolingCost = implementationCost * 0.2;
    const trainingCost = eco.affectedOperations.length * 500;
    const totalCost = implementationCost + toolingCost + trainingCost;
    const potentialSavings = eco.estimatedSavings || 0;

    return {
      implementationCost,
      toolingCost,
      equipmentCost: 0,
      trainingCost,
      scrapReworkCost: 0,
      totalCost,
      potentialSavings,
      netBenefit: potentialSavings - totalCost,
      paybackPeriodMonths: potentialSavings > 0 ? Math.ceil((totalCost / potentialSavings) * 12) : undefined
    };
  }

  private async assessRisk(eco: ECOResponse): Promise<RiskAssessment> {
    const complexity = eco.affectedParts.length + eco.affectedOperations.length;
    const riskLevel = complexity > 10 ? 'HIGH' : complexity > 5 ? 'MEDIUM' : 'LOW';

    return {
      technicalRisk: riskLevel,
      scheduleRisk: eco.priority === ECOPriority.EMERGENCY ? 'HIGH' : 'MEDIUM',
      costRisk: (eco.estimatedCost || 0) > 100000 ? 'HIGH' : 'LOW',
      qualityRisk: riskLevel,
      overallRisk: riskLevel,
      mitigationActions: [
        'Conduct thorough impact analysis',
        'Schedule phased implementation',
        'Perform validation testing'
      ]
    };
  }

  private determineImplementationComplexity(
    documentCount: number,
    operationalImpact: OperationalImpact,
    costImpact: CostImpact
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const score = documentCount +
                  operationalImpact.activeWorkOrdersAffected +
                  (costImpact.totalCost / 10000);

    if (score > 50) return 'CRITICAL';
    if (score > 20) return 'HIGH';
    if (score > 10) return 'MEDIUM';
    return 'LOW';
  }

  private estimateImplementationTime(
    documentCount: number,
    operationalImpact: OperationalImpact,
    complexity: string
  ): number {
    const baseTime = documentCount * 2; // 2 days per document
    const operationalTime = operationalImpact.activeWorkOrdersAffected * 0.5;
    const complexityMultiplier = {
      'LOW': 1,
      'MEDIUM': 1.5,
      'HIGH': 2,
      'CRITICAL': 3
    }[complexity] || 1;

    return Math.ceil((baseTime + operationalTime) * complexityMultiplier);
  }

  private getECOInclude() {
    return {
      affectedDocuments: true,
      tasks: true,
      attachments: true,
      history: {
        orderBy: { occurredAt: 'desc' as const },
        take: 10
      },
      crbReviews: true,
      relatedECOs: {
        include: {
          relatedEco: {
            select: {
              ecoNumber: true,
              title: true,
              status: true
            }
          }
        }
      }
    };
  }

  private mapECOToResponse(eco: any): ECOResponse {
    return {
      id: eco.id,
      ecoNumber: eco.ecoNumber,
      title: eco.title,
      description: eco.description,
      ecoType: eco.ecoType,
      priority: eco.priority,
      status: eco.status,
      currentState: eco.currentState,
      proposedChange: eco.proposedChange,
      reasonForChange: eco.reasonForChange,
      benefitsExpected: eco.benefitsExpected,
      risksIfNotImplemented: eco.risksIfNotImplemented,
      requestorId: eco.requestorId,
      requestorName: eco.requestorName,
      requestorDept: eco.requestorDept,
      requestDate: eco.requestDate,
      sponsorId: eco.sponsorId,
      sponsorName: eco.sponsorName,
      impactAnalysis: eco.impactAnalysis,
      affectedParts: eco.affectedParts,
      affectedOperations: eco.affectedOperations,
      estimatedCost: eco.estimatedCost,
      actualCost: eco.actualCost,
      estimatedSavings: eco.estimatedSavings,
      actualSavings: eco.actualSavings,
      costCurrency: eco.costCurrency,
      requestedEffectiveDate: eco.requestedEffectiveDate,
      plannedEffectiveDate: eco.plannedEffectiveDate,
      actualEffectiveDate: eco.actualEffectiveDate,
      effectivityType: eco.effectivityType,
      effectivityValue: eco.effectivityValue,
      isInterchangeable: eco.isInterchangeable,
      crbReviewDate: eco.crbReviewDate,
      crbDecision: eco.crbDecision,
      crbNotes: eco.crbNotes,
      completedDate: eco.completedDate,
      verifiedDate: eco.verifiedDate,
      closedDate: eco.closedDate,
      closedById: eco.closedById,
      isActive: eco.isActive,
      createdAt: eco.createdAt,
      updatedAt: eco.updatedAt,
      affectedDocuments: eco.affectedDocuments?.map(this.mapAffectedDocumentToResponse),
      tasks: eco.tasks?.map(this.mapTaskToResponse),
      attachments: eco.attachments?.map(this.mapAttachmentToResponse),
      history: eco.history?.map(this.mapHistoryToResponse),
      crbReviews: eco.crbReviews?.map(this.mapCRBReviewToResponse),
      relatedECOs: eco.relatedECOs?.map(this.mapRelationToResponse)
    };
  }

  private mapTaskToResponse(task: any): ECOTaskResponse {
    return {
      id: task.id,
      ecoId: task.ecoId,
      taskName: task.taskName,
      description: task.description,
      taskType: task.taskType,
      assignedToId: task.assignedToId,
      assignedToName: task.assignedToName,
      assignedToDept: task.assignedToDept,
      status: task.status,
      dueDate: task.dueDate,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      prerequisiteTasks: task.prerequisiteTasks,
      completionNotes: task.completionNotes,
      verifiedById: task.verifiedById,
      verifiedAt: task.verifiedAt,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    };
  }

  private mapAffectedDocumentToResponse(doc: any): ECOAffectedDocumentResponse {
    return {
      id: doc.id,
      ecoId: doc.ecoId,
      documentType: doc.documentType,
      documentId: doc.documentId,
      documentTitle: doc.documentTitle,
      currentVersion: doc.currentVersion,
      targetVersion: doc.targetVersion,
      status: doc.status,
      assignedToId: doc.assignedToId,
      assignedToName: doc.assignedToName,
      updateStartedAt: doc.updateStartedAt,
      updateCompletedAt: doc.updateCompletedAt,
      approvedAt: doc.approvedAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }

  private mapAttachmentToResponse(attachment: any): ECOAttachmentResponse {
    return {
      id: attachment.id,
      ecoId: attachment.ecoId,
      fileName: attachment.fileName,
      fileUrl: attachment.fileUrl,
      fileSize: attachment.fileSize,
      mimeType: attachment.mimeType,
      attachmentType: attachment.attachmentType,
      description: attachment.description,
      uploadedById: attachment.uploadedById,
      uploadedByName: attachment.uploadedByName,
      uploadedAt: attachment.uploadedAt
    };
  }

  private mapHistoryToResponse(history: any): ECOHistoryResponse {
    return {
      id: history.id,
      ecoId: history.ecoId,
      eventType: history.eventType,
      eventDescription: history.eventDescription,
      fromStatus: history.fromStatus,
      toStatus: history.toStatus,
      details: history.details,
      performedById: history.performedById,
      performedByName: history.performedByName,
      performedByRole: history.performedByRole,
      occurredAt: history.occurredAt
    };
  }

  private mapCRBReviewToResponse(review: any): any {
    return {
      id: review.id,
      ecoId: review.ecoId,
      meetingDate: review.meetingDate,
      meetingAgenda: review.meetingAgenda,
      members: review.members,
      discussionNotes: review.discussionNotes,
      questionsConcerns: review.questionsConcerns,
      decision: review.decision,
      decisionRationale: review.decisionRationale,
      votesFor: review.votesFor,
      votesAgainst: review.votesAgainst,
      votesAbstain: review.votesAbstain,
      conditions: review.conditions,
      actionItems: review.actionItems,
      nextReviewDate: review.nextReviewDate,
      createdById: review.createdById,
      createdAt: review.createdAt
    };
  }

  private mapRelationToResponse(relation: any): any {
    return {
      id: relation.id,
      parentEcoId: relation.parentEcoId,
      relatedEcoId: relation.relatedEcoId,
      relationType: relation.relationType,
      description: relation.description,
      createdAt: relation.createdAt,
      relatedEco: relation.relatedEco
    };
  }
}