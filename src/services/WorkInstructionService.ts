import { PrismaClient, WorkInstruction, WorkInstructionStep, WorkInstructionStatus, Prisma } from '@prisma/client';
import { logger } from '../utils/logger';
import {
  CreateWorkInstructionInput,
  UpdateWorkInstructionInput,
  CreateStepInput,
  UpdateStepInput,
  WorkInstructionQueryParams,
  WorkInstructionResponse,
  WorkInstructionListResponse,
} from '../types/workInstruction';
// ✅ GITHUB ISSUE #18 - Phase 3: Enhanced relations management
import ExportTemplateService from './ExportTemplateService';
import DataCollectionFieldTemplateService, { DataCollectionFieldTemplate } from './DataCollectionFieldTemplateService';

const prisma = new PrismaClient();

export class WorkInstructionService {
  // ✅ GITHUB ISSUE #18 - Phase 3: Enhanced relations management
  private exportTemplateService: ExportTemplateService;
  private fieldTemplateService: DataCollectionFieldTemplateService;

  constructor() {
    this.exportTemplateService = new ExportTemplateService(prisma);
    this.fieldTemplateService = new DataCollectionFieldTemplateService(prisma);
  }

  /**
   * Create a new work instruction
   */
  async createWorkInstruction(
    data: CreateWorkInstructionInput,
    userId: string
  ): Promise<WorkInstructionResponse> {
    try {
      const workInstruction = await prisma.workInstruction.create({
        data: {
          ...data,
          createdById: userId,
          updatedById: userId,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          updatedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          approvedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          steps: {
            orderBy: {
              stepNumber: 'asc',
            },
          },
          // GitHub Issue #18: Include media and export template relationships
          media: {
            orderBy: {
              createdAt: 'desc',
            },
          },
          exportTemplate: true,
        },
      });

      logger.info(`Work instruction created: ${workInstruction.id}`, {
        workInstructionId: workInstruction.id,
        title: workInstruction.title,
        userId,
      });

      return workInstruction as WorkInstructionResponse;
    } catch (error) {
      logger.error('Error creating work instruction:', error);
      throw error;
    }
  }

  /**
   * Get work instruction by ID
   */
  async getWorkInstructionById(id: string): Promise<WorkInstructionResponse | null> {
    try {
      const workInstruction = await prisma.workInstruction.findUnique({
        where: { id },
        include: {
          createdBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          updatedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          approvedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          steps: {
            orderBy: {
              stepNumber: 'asc',
            },
          },
          // GitHub Issue #18: Include media and export template relationships
          media: {
            orderBy: {
              createdAt: 'desc',
            },
          },
          exportTemplate: true,
        },
      });

      return workInstruction as WorkInstructionResponse | null;
    } catch (error) {
      logger.error(`Error fetching work instruction ${id}:`, error);
      throw error;
    }
  }

  /**
   * List work instructions with filtering and pagination
   */
  async listWorkInstructions(
    params: WorkInstructionQueryParams
  ): Promise<WorkInstructionListResponse> {
    try {
      const {
        page = 1,
        pageSize = 20,
        status,
        partId,
        search,
        sortBy = 'updatedAt',
        sortOrder = 'desc',
      } = params;

      const skip = (page - 1) * pageSize;
      const take = pageSize;

      // Build where clause
      const where: Prisma.WorkInstructionWhereInput = {};

      if (status) {
        where.status = status;
      }

      if (partId) {
        where.partId = partId;
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { version: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Build orderBy clause
      const orderBy: Prisma.WorkInstructionOrderByWithRelationInput = {
        [sortBy]: sortOrder,
      };

      // Execute queries
      const [data, total] = await Promise.all([
        prisma.workInstruction.findMany({
          where,
          skip,
          take,
          orderBy,
          include: {
            createdBy: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
            updatedBy: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
            approvedBy: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
            _count: {
              select: {
                steps: true,
              },
            },
            // GitHub Issue #18: Include media relationships for list view
            media: {
              select: {
                id: true,
                mediaType: true,
                fileName: true,
                fileUrl: true,
                thumbnailUrl: true,
              },
              orderBy: {
                createdAt: 'desc',
              },
              take: 3, // Only show first 3 media items in list view
            },
            exportTemplate: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        prisma.workInstruction.count({ where }),
      ]);

      const totalPages = Math.ceil(total / pageSize);

      return {
        data: data as WorkInstructionResponse[],
        total,
        page,
        pageSize,
        totalPages,
      };
    } catch (error) {
      logger.error('Error listing work instructions:', error);
      throw error;
    }
  }

  /**
   * Update work instruction
   */
  async updateWorkInstruction(
    id: string,
    data: UpdateWorkInstructionInput,
    userId: string
  ): Promise<WorkInstructionResponse> {
    try {
      const workInstruction = await prisma.workInstruction.update({
        where: { id },
        data: {
          ...data,
          updatedById: userId,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          updatedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          approvedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          steps: {
            orderBy: {
              stepNumber: 'asc',
            },
          },
        },
      });

      logger.info(`Work instruction updated: ${id}`, {
        workInstructionId: id,
        userId,
      });

      return workInstruction as WorkInstructionResponse;
    } catch (error) {
      logger.error(`Error updating work instruction ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete work instruction
   */
  async deleteWorkInstruction(id: string): Promise<void> {
    try {
      await prisma.workInstruction.delete({
        where: { id },
      });

      logger.info(`Work instruction deleted: ${id}`);
    } catch (error) {
      logger.error(`Error deleting work instruction ${id}:`, error);
      throw error;
    }
  }

  /**
   * Add step to work instruction
   */
  async addStep(
    workInstructionId: string,
    data: CreateStepInput
  ): Promise<WorkInstructionStep> {
    try {
      const step = await prisma.workInstructionStep.create({
        data: {
          workInstructionId,
          ...data,
        },
      });

      logger.info(`Step added to work instruction: ${workInstructionId}`, {
        stepId: step.id,
        stepNumber: step.stepNumber,
      });

      return step;
    } catch (error) {
      logger.error(`Error adding step to work instruction ${workInstructionId}:`, error);
      throw error;
    }
  }

  /**
   * Update step
   */
  async updateStep(
    stepId: string,
    data: UpdateStepInput
  ): Promise<WorkInstructionStep> {
    try {
      const step = await prisma.workInstructionStep.update({
        where: { id: stepId },
        data,
      });

      logger.info(`Step updated: ${stepId}`);

      return step;
    } catch (error) {
      logger.error(`Error updating step ${stepId}:`, error);
      throw error;
    }
  }

  /**
   * Delete step
   */
  async deleteStep(stepId: string): Promise<void> {
    try {
      await prisma.workInstructionStep.delete({
        where: { id: stepId },
      });

      logger.info(`Step deleted: ${stepId}`);
    } catch (error) {
      logger.error(`Error deleting step ${stepId}:`, error);
      throw error;
    }
  }

  /**
   * Approve work instruction
   */
  async approveWorkInstruction(
    id: string,
    userId: string
  ): Promise<WorkInstructionResponse> {
    try {
      const workInstruction = await prisma.workInstruction.update({
        where: { id },
        data: {
          status: WorkInstructionStatus.APPROVED,
          approvedById: userId,
          approvedAt: new Date(),
          updatedById: userId,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          updatedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          approvedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          steps: {
            orderBy: {
              stepNumber: 'asc',
            },
          },
        },
      });

      logger.info(`Work instruction approved: ${id}`, {
        workInstructionId: id,
        approvedBy: userId,
      });

      return workInstruction as WorkInstructionResponse;
    } catch (error) {
      logger.error(`Error approving work instruction ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get work instructions by part ID
   */
  async getWorkInstructionsByPartId(partId: string): Promise<WorkInstructionResponse[]> {
    try {
      const workInstructions = await prisma.workInstruction.findMany({
        where: {
          partId,
          status: WorkInstructionStatus.APPROVED,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          steps: {
            orderBy: {
              stepNumber: 'asc',
            },
          },
          // GitHub Issue #18: Include media relationships
          media: {
            orderBy: {
              createdAt: 'desc',
            },
          },
          exportTemplate: true,
        },
        orderBy: {
          version: 'desc',
        },
      });

      return workInstructions as WorkInstructionResponse[];
    } catch (error) {
      logger.error(`Error fetching work instructions for part ${partId}:`, error);
      throw error;
    }
  }

  /**
   * Reorder steps
   */
  async reorderSteps(
    workInstructionId: string,
    stepOrder: { stepId: string; newStepNumber: number }[]
  ): Promise<void> {
    try {
      // Use transaction to update all steps atomically
      await prisma.$transaction(
        stepOrder.map(({ stepId, newStepNumber }) =>
          prisma.workInstructionStep.update({
            where: { id: stepId },
            data: { stepNumber: newStepNumber },
          })
        )
      );

      logger.info(`Steps reordered for work instruction: ${workInstructionId}`);
    } catch (error) {
      logger.error(`Error reordering steps for work instruction ${workInstructionId}:`, error);
      throw error;
    }
  }

  /**
   * Reject work instruction
   */
  async rejectWorkInstruction(
    id: string,
    userId: string,
    rejectionReason: string,
    comments: string
  ): Promise<WorkInstructionResponse> {
    try {
      // Get user details for rejection record
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get current work instruction to retrieve approval history
      const currentWI = await prisma.workInstruction.findUnique({
        where: { id },
        select: { approvalHistory: true },
      });

      const approvalHistory = (currentWI?.approvalHistory as any) || [];

      // Create rejection entry
      const rejectionEntry = {
        id: Date.now().toString(),
        title: 'Review',
        description: 'Technical review',
        status: 'error',
        approver: {
          id: user.id,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
          email: user.email,
          avatar: undefined,
        },
        rejectedAt: new Date().toISOString(),
        rejectionReason,
        comments,
      };

      // Update work instruction with rejection
      const workInstruction = await prisma.workInstruction.update({
        where: { id },
        data: {
          status: 'REJECTED' as WorkInstructionStatus,
          updatedById: userId,
          approvalHistory: [...approvalHistory, rejectionEntry] as any,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          updatedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          approvedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          steps: {
            orderBy: {
              stepNumber: 'asc',
            },
          },
        },
      });

      logger.info(`Work instruction rejected: ${id}`, {
        workInstructionId: id,
        rejectedBy: userId,
        rejectionReason,
      });

      // TODO: Send email notification to author
      // const authorEmail = workInstruction.createdBy.email;
      // await sendRejectionEmail(authorEmail, workInstruction.title, rejectionReason, comments);

      return workInstruction as WorkInstructionResponse;
    } catch (error) {
      logger.error(`Error rejecting work instruction ${id}:`, error);
      throw error;
    }
  }

  // GitHub Issue #18: Document management methods

  /**
   * Update native content for work instruction
   */
  async updateNativeContent(
    id: string,
    nativeContent: any,
    userId: string
  ): Promise<WorkInstructionResponse> {
    try {
      const workInstruction = await prisma.workInstruction.update({
        where: { id },
        data: {
          nativeContent,
          contentFormat: 'NATIVE',
          updatedById: userId,
          updatedAt: new Date(),
        },
        include: {
          createdBy: {
            select: { id: true, username: true, firstName: true, lastName: true },
          },
          updatedBy: {
            select: { id: true, username: true, firstName: true, lastName: true },
          },
          steps: { orderBy: { stepNumber: 'asc' } },
          media: { orderBy: { createdAt: 'desc' } },
          exportTemplate: true,
        },
      });

      logger.info(`Native content updated for work instruction: ${id}`, {
        workInstructionId: id,
        userId,
      });

      return workInstruction as WorkInstructionResponse;
    } catch (error) {
      logger.error(`Error updating native content for work instruction ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update document management metadata
   */
  async updateDocumentMetadata(
    id: string,
    metadata: {
      tags?: string[];
      categories?: string[];
      keywords?: string[];
      thumbnailUrl?: string;
      exportTemplateId?: string;
    },
    userId: string
  ): Promise<WorkInstructionResponse> {
    try {
      const workInstruction = await prisma.workInstruction.update({
        where: { id },
        data: {
          ...metadata,
          updatedById: userId,
          updatedAt: new Date(),
        },
        include: {
          createdBy: {
            select: { id: true, username: true, firstName: true, lastName: true },
          },
          updatedBy: {
            select: { id: true, username: true, firstName: true, lastName: true },
          },
          steps: { orderBy: { stepNumber: 'asc' } },
          media: { orderBy: { createdAt: 'desc' } },
          exportTemplate: true,
        },
      });

      logger.info(`Document metadata updated for work instruction: ${id}`, {
        workInstructionId: id,
        userId,
        updates: Object.keys(metadata),
      });

      return workInstruction as WorkInstructionResponse;
    } catch (error) {
      logger.error(`Error updating document metadata for work instruction ${id}:`, error);
      throw error;
    }
  }

  /**
   * Search work instructions with document management filters
   */
  async searchWithDocumentFilters(filters: {
    text?: string;
    tags?: string[];
    categories?: string[];
    contentFormat?: string;
    hasMedia?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<WorkInstructionResponse[]> {
    try {
      const where: any = {};

      // Text search
      if (filters.text) {
        where.OR = [
          { title: { contains: filters.text, mode: 'insensitive' } },
          { description: { contains: filters.text, mode: 'insensitive' } },
          { keywords: { has: filters.text } },
        ];
      }

      // Tag filters
      if (filters.tags && filters.tags.length > 0) {
        where.tags = { hasSome: filters.tags };
      }

      // Category filters
      if (filters.categories && filters.categories.length > 0) {
        where.categories = { hasSome: filters.categories };
      }

      // Content format filter
      if (filters.contentFormat) {
        where.contentFormat = filters.contentFormat;
      }

      // Media presence filter
      if (filters.hasMedia !== undefined) {
        if (filters.hasMedia) {
          where.media = { some: {} };
        } else {
          where.media = { none: {} };
        }
      }

      const workInstructions = await prisma.workInstruction.findMany({
        where,
        include: {
          createdBy: {
            select: { id: true, username: true, firstName: true, lastName: true },
          },
          steps: { orderBy: { stepNumber: 'asc' } },
          media: {
            select: { id: true, mediaType: true, fileName: true, fileUrl: true },
            orderBy: { createdAt: 'desc' },
            take: 3,
          },
          exportTemplate: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: filters.offset || 0,
        take: filters.limit || 50,
      });

      return workInstructions as WorkInstructionResponse[];
    } catch (error) {
      logger.error('Error searching work instructions with document filters:', error);
      throw error;
    }
  }

  // ✅ GITHUB ISSUE #18 - Phase 3: Enhanced relations management methods

  /**
   * Associate export template with work instruction
   */
  async associateExportTemplate(
    workInstructionId: string,
    templateId: string,
    userId: string
  ): Promise<WorkInstructionResponse> {
    try {
      logger.info(`Associating export template ${templateId} with work instruction ${workInstructionId}`);

      // Verify template exists
      const template = await this.exportTemplateService.getTemplate(templateId);
      if (!template) {
        throw new Error(`Export template not found: ${templateId}`);
      }

      const workInstruction = await prisma.workInstruction.update({
        where: { id: workInstructionId },
        data: {
          exportTemplateId: templateId,
          updatedById: userId,
          updatedAt: new Date(),
        },
        include: {
          createdBy: {
            select: { id: true, username: true, firstName: true, lastName: true },
          },
          updatedBy: {
            select: { id: true, username: true, firstName: true, lastName: true },
          },
          steps: { orderBy: { stepNumber: 'asc' } },
          media: { orderBy: { createdAt: 'desc' } },
          exportTemplate: true,
          dataCollectionFields: { orderBy: { order: 'asc' } },
        },
      });

      logger.info(`Export template associated successfully`, {
        workInstructionId,
        templateId,
        templateName: template.name,
      });

      return workInstruction as WorkInstructionResponse;
    } catch (error: any) {
      logger.error('Error associating export template:', {
        error: error?.message || 'Unknown error',
        workInstructionId,
        templateId,
      });
      throw error;
    }
  }

  /**
   * Remove export template association
   */
  async removeExportTemplate(
    workInstructionId: string,
    userId: string
  ): Promise<WorkInstructionResponse> {
    try {
      logger.info(`Removing export template from work instruction ${workInstructionId}`);

      const workInstruction = await prisma.workInstruction.update({
        where: { id: workInstructionId },
        data: {
          exportTemplateId: null,
          updatedById: userId,
          updatedAt: new Date(),
        },
        include: {
          createdBy: {
            select: { id: true, username: true, firstName: true, lastName: true },
          },
          updatedBy: {
            select: { id: true, username: true, firstName: true, lastName: true },
          },
          steps: { orderBy: { stepNumber: 'asc' } },
          media: { orderBy: { createdAt: 'desc' } },
          exportTemplate: true,
          dataCollectionFields: { orderBy: { order: 'asc' } },
        },
      });

      logger.info(`Export template association removed successfully`);
      return workInstruction as WorkInstructionResponse;
    } catch (error: any) {
      logger.error('Error removing export template association:', {
        error: error?.message || 'Unknown error',
        workInstructionId,
      });
      throw error;
    }
  }

  /**
   * Add data collection field to work instruction
   */
  async addDataCollectionField(
    workInstructionId: string,
    fieldTemplateId: string,
    fieldConfiguration: {
      order: number;
      isRequired?: boolean;
      customLabel?: string;
      customValidationRules?: any[];
      stepId?: string;
    },
    userId: string
  ): Promise<any> {
    try {
      logger.info(`Adding data collection field to work instruction ${workInstructionId}`);

      // Verify field template exists
      const template = await this.fieldTemplateService.getFieldTemplate(fieldTemplateId);
      if (!template) {
        throw new Error(`Field template not found: ${fieldTemplateId}`);
      }

      // Create the data collection field instance
      const field = await prisma.workInstructionDataField.create({
        data: {
          workInstructionId,
          fieldTemplateId,
          stepId: fieldConfiguration.stepId,
          order: fieldConfiguration.order,
          isRequired: fieldConfiguration.isRequired ?? template.isRequired,
          customLabel: fieldConfiguration.customLabel,
          customValidationRules: fieldConfiguration.customValidationRules || [],
          createdById: userId,
        },
        include: {
          fieldTemplate: true,
          step: true,
        },
      });

      // Update work instruction timestamp
      await prisma.workInstruction.update({
        where: { id: workInstructionId },
        data: {
          updatedById: userId,
          updatedAt: new Date(),
        },
      });

      logger.info(`Data collection field added successfully`, {
        workInstructionId,
        fieldId: field.id,
        templateName: template.name,
      });

      return field;
    } catch (error: any) {
      logger.error('Error adding data collection field:', {
        error: error?.message || 'Unknown error',
        workInstructionId,
        fieldTemplateId,
      });
      throw error;
    }
  }

  /**
   * Update data collection field configuration
   */
  async updateDataCollectionField(
    fieldId: string,
    updates: {
      order?: number;
      isRequired?: boolean;
      customLabel?: string;
      customValidationRules?: any[];
      stepId?: string;
    },
    userId: string
  ): Promise<any> {
    try {
      logger.info(`Updating data collection field ${fieldId}`);

      const field = await prisma.workInstructionDataField.update({
        where: { id: fieldId },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
        include: {
          fieldTemplate: true,
          step: true,
          workInstruction: true,
        },
      });

      // Update work instruction timestamp
      await prisma.workInstruction.update({
        where: { id: field.workInstructionId },
        data: {
          updatedById: userId,
          updatedAt: new Date(),
        },
      });

      logger.info(`Data collection field updated successfully`);
      return field;
    } catch (error: any) {
      logger.error('Error updating data collection field:', {
        error: error?.message || 'Unknown error',
        fieldId,
      });
      throw error;
    }
  }

  /**
   * Remove data collection field from work instruction
   */
  async removeDataCollectionField(fieldId: string, userId: string): Promise<void> {
    try {
      logger.info(`Removing data collection field ${fieldId}`);

      const field = await prisma.workInstructionDataField.findUnique({
        where: { id: fieldId },
        select: { workInstructionId: true },
      });

      if (!field) {
        throw new Error(`Data collection field not found: ${fieldId}`);
      }

      await prisma.workInstructionDataField.delete({
        where: { id: fieldId },
      });

      // Update work instruction timestamp
      await prisma.workInstruction.update({
        where: { id: field.workInstructionId },
        data: {
          updatedById: userId,
          updatedAt: new Date(),
        },
      });

      logger.info(`Data collection field removed successfully`);
    } catch (error: any) {
      logger.error('Error removing data collection field:', {
        error: error?.message || 'Unknown error',
        fieldId,
      });
      throw error;
    }
  }

  /**
   * Get data collection fields for work instruction
   */
  async getDataCollectionFields(workInstructionId: string): Promise<any[]> {
    try {
      logger.debug(`Fetching data collection fields for work instruction ${workInstructionId}`);

      const fields = await prisma.workInstructionDataField.findMany({
        where: { workInstructionId },
        include: {
          fieldTemplate: true,
          step: {
            select: {
              id: true,
              stepNumber: true,
              title: true,
            },
          },
        },
        orderBy: [
          { stepId: 'asc' },
          { order: 'asc' },
        ],
      });

      return fields;
    } catch (error: any) {
      logger.error('Error fetching data collection fields:', {
        error: error?.message || 'Unknown error',
        workInstructionId,
      });
      throw error;
    }
  }

  /**
   * Reorder data collection fields
   */
  async reorderDataCollectionFields(
    workInstructionId: string,
    fieldOrders: { fieldId: string; newOrder: number }[],
    userId: string
  ): Promise<void> {
    try {
      logger.info(`Reordering data collection fields for work instruction ${workInstructionId}`);

      // Use transaction to update all field orders atomically
      await prisma.$transaction([
        ...fieldOrders.map(({ fieldId, newOrder }) =>
          prisma.workInstructionDataField.update({
            where: { id: fieldId },
            data: { order: newOrder },
          })
        ),
        // Update work instruction timestamp
        prisma.workInstruction.update({
          where: { id: workInstructionId },
          data: {
            updatedById: userId,
            updatedAt: new Date(),
          },
        }),
      ]);

      logger.info(`Data collection fields reordered successfully`);
    } catch (error: any) {
      logger.error('Error reordering data collection fields:', {
        error: error?.message || 'Unknown error',
        workInstructionId,
      });
      throw error;
    }
  }

  /**
   * Add media to work instruction with relationships
   */
  async addMedia(
    workInstructionId: string,
    mediaData: {
      fileName: string;
      fileUrl: string;
      mediaType: string;
      fileSize: number;
      mimeType: string;
      thumbnailUrl?: string;
      stepId?: string;
      description?: string;
      tags?: string[];
    },
    userId: string
  ): Promise<any> {
    try {
      logger.info(`Adding media to work instruction ${workInstructionId}`);

      const media = await prisma.workInstructionMedia.create({
        data: {
          workInstructionId,
          stepId: mediaData.stepId,
          fileName: mediaData.fileName,
          fileUrl: mediaData.fileUrl,
          mediaType: mediaData.mediaType,
          fileSize: mediaData.fileSize,
          mimeType: mediaData.mimeType,
          thumbnailUrl: mediaData.thumbnailUrl,
          description: mediaData.description,
          tags: mediaData.tags || [],
          uploadedById: userId,
        },
        include: {
          step: {
            select: {
              id: true,
              stepNumber: true,
              title: true,
            },
          },
          uploadedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Update work instruction timestamp
      await prisma.workInstruction.update({
        where: { id: workInstructionId },
        data: {
          updatedById: userId,
          updatedAt: new Date(),
        },
      });

      logger.info(`Media added successfully`, {
        workInstructionId,
        mediaId: media.id,
        fileName: mediaData.fileName,
      });

      return media;
    } catch (error: any) {
      logger.error('Error adding media to work instruction:', {
        error: error?.message || 'Unknown error',
        workInstructionId,
        fileName: mediaData.fileName,
      });
      throw error;
    }
  }

  /**
   * Get comprehensive work instruction with all relations
   */
  async getWorkInstructionWithRelations(id: string): Promise<WorkInstructionResponse | null> {
    try {
      logger.debug(`Fetching work instruction with full relations: ${id}`);

      const workInstruction = await prisma.workInstruction.findUnique({
        where: { id },
        include: {
          createdBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          updatedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          approvedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          steps: {
            include: {
              media: {
                orderBy: { createdAt: 'desc' },
              },
              dataCollectionFields: {
                include: {
                  fieldTemplate: true,
                },
                orderBy: { order: 'asc' },
              },
            },
            orderBy: { stepNumber: 'asc' },
          },
          media: {
            include: {
              uploadedBy: {
                select: {
                  id: true,
                  username: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
          exportTemplate: true,
          dataCollectionFields: {
            include: {
              fieldTemplate: true,
              step: {
                select: {
                  id: true,
                  stepNumber: true,
                  title: true,
                },
              },
            },
            orderBy: [
              { stepId: 'asc' },
              { order: 'asc' },
            ],
          },
        },
      });

      return workInstruction as WorkInstructionResponse | null;
    } catch (error: any) {
      logger.error('Error fetching work instruction with relations:', {
        error: error?.message || 'Unknown error',
        workInstructionId: id,
      });
      throw error;
    }
  }

  /**
   * Get work instruction analytics and relations summary
   */
  async getWorkInstructionAnalytics(id: string): Promise<{
    totalSteps: number;
    totalMediaItems: number;
    totalDataCollectionFields: number;
    mediaByType: Record<string, number>;
    fieldsByType: Record<string, number>;
    exportTemplate: any;
    lastUpdated: Date;
    averageStepCompletionTime?: number;
  }> {
    try {
      logger.debug(`Getting analytics for work instruction: ${id}`);

      const [workInstruction, steps, media, dataFields] = await Promise.all([
        prisma.workInstruction.findUnique({
          where: { id },
          include: { exportTemplate: true },
        }),
        prisma.workInstructionStep.count({
          where: { workInstructionId: id },
        }),
        prisma.workInstructionMedia.findMany({
          where: { workInstructionId: id },
          select: { mediaType: true },
        }),
        prisma.workInstructionDataField.findMany({
          where: { workInstructionId: id },
          include: { fieldTemplate: { select: { fieldType: true } } },
        }),
      ]);

      if (!workInstruction) {
        throw new Error(`Work instruction not found: ${id}`);
      }

      // Analyze media by type
      const mediaByType: Record<string, number> = {};
      media.forEach(item => {
        mediaByType[item.mediaType] = (mediaByType[item.mediaType] || 0) + 1;
      });

      // Analyze fields by type
      const fieldsByType: Record<string, number> = {};
      dataFields.forEach(field => {
        const fieldType = field.fieldTemplate.fieldType;
        fieldsByType[fieldType] = (fieldsByType[fieldType] || 0) + 1;
      });

      return {
        totalSteps: steps,
        totalMediaItems: media.length,
        totalDataCollectionFields: dataFields.length,
        mediaByType,
        fieldsByType,
        exportTemplate: workInstruction.exportTemplate,
        lastUpdated: workInstruction.updatedAt,
      };
    } catch (error: any) {
      logger.error('Error getting work instruction analytics:', {
        error: error?.message || 'Unknown error',
        workInstructionId: id,
      });
      throw error;
    }
  }

  /**
   * Duplicate work instruction with all relations
   */
  async duplicateWorkInstructionWithRelations(
    id: string,
    newTitle: string,
    userId: string,
    options: {
      includeMedia?: boolean;
      includeDataFields?: boolean;
      includeExportTemplate?: boolean;
    } = {}
  ): Promise<WorkInstructionResponse> {
    try {
      logger.info(`Duplicating work instruction with relations: ${id}`);

      const {
        includeMedia = true,
        includeDataFields = true,
        includeExportTemplate = true,
      } = options;

      const original = await this.getWorkInstructionWithRelations(id);
      if (!original) {
        throw new Error(`Work instruction not found: ${id}`);
      }

      // Create new work instruction
      const duplicated = await this.createWorkInstruction({
        title: newTitle,
        description: original.description,
        partId: original.partId,
        version: original.version,
        status: 'DRAFT' as WorkInstructionStatus,
        tags: original.tags,
        categories: original.categories,
        keywords: original.keywords,
        nativeContent: original.nativeContent,
        contentFormat: original.contentFormat,
        exportTemplateId: includeExportTemplate ? original.exportTemplateId : undefined,
      }, userId);

      // Duplicate steps
      if (original.steps && original.steps.length > 0) {
        for (const step of original.steps) {
          const newStep = await this.addStep(duplicated.id, {
            stepNumber: step.stepNumber,
            title: step.title,
            description: step.description,
            instructions: step.instructions,
            estimatedDuration: step.estimatedDuration,
            requiredTools: step.requiredTools,
            safetyNotes: step.safetyNotes,
          });

          // Duplicate step media if requested
          if (includeMedia && step.media && step.media.length > 0) {
            for (const media of step.media) {
              await this.addMedia(duplicated.id, {
                fileName: `Copy of ${media.fileName}`,
                fileUrl: media.fileUrl, // Note: May need to duplicate actual files
                mediaType: media.mediaType,
                fileSize: media.fileSize,
                mimeType: media.mimeType,
                thumbnailUrl: media.thumbnailUrl,
                stepId: newStep.id,
                description: media.description,
                tags: media.tags,
              }, userId);
            }
          }

          // Duplicate step data collection fields if requested
          if (includeDataFields && step.dataCollectionFields && step.dataCollectionFields.length > 0) {
            for (const field of step.dataCollectionFields) {
              await this.addDataCollectionField(duplicated.id, field.fieldTemplateId, {
                order: field.order,
                isRequired: field.isRequired,
                customLabel: field.customLabel,
                customValidationRules: field.customValidationRules,
                stepId: newStep.id,
              }, userId);
            }
          }
        }
      }

      // Duplicate global media if requested
      if (includeMedia && original.media && original.media.length > 0) {
        for (const media of original.media) {
          if (!media.stepId) { // Only global media (not step-specific)
            await this.addMedia(duplicated.id, {
              fileName: `Copy of ${media.fileName}`,
              fileUrl: media.fileUrl,
              mediaType: media.mediaType,
              fileSize: media.fileSize,
              mimeType: media.mimeType,
              thumbnailUrl: media.thumbnailUrl,
              description: media.description,
              tags: media.tags,
            }, userId);
          }
        }
      }

      // Duplicate global data collection fields if requested
      if (includeDataFields && original.dataCollectionFields && original.dataCollectionFields.length > 0) {
        for (const field of original.dataCollectionFields) {
          if (!field.stepId) { // Only global fields (not step-specific)
            await this.addDataCollectionField(duplicated.id, field.fieldTemplateId, {
              order: field.order,
              isRequired: field.isRequired,
              customLabel: field.customLabel,
              customValidationRules: field.customValidationRules,
            }, userId);
          }
        }
      }

      logger.info(`Work instruction duplicated successfully`, {
        originalId: id,
        duplicatedId: duplicated.id,
        newTitle,
      });

      return await this.getWorkInstructionWithRelations(duplicated.id) as WorkInstructionResponse;
    } catch (error: any) {
      logger.error('Error duplicating work instruction with relations:', {
        error: error?.message || 'Unknown error',
        workInstructionId: id,
      });
      throw error;
    }
  }
}

export const workInstructionService = new WorkInstructionService();
