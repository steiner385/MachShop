/**
 * ✅ GITHUB ISSUE #23: SetupSheetService
 *
 * Service for managing Setup Sheet documents - machine/equipment setup procedures
 * and parameters with full lifecycle management, version control, and execution tracking.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// Types for Setup Sheet operations
export interface SetupSheetCreateInput {
  title: string;
  description?: string;
  equipmentId?: string;
  operationId?: string;
  partId?: string;
  workCenterId?: string;
  estimatedSetupTime?: number;
  safetyChecklist?: any;
  requiredPPE?: string[];
  imageUrls?: string[];
  videoUrls?: string[];
  attachmentUrls?: string[];
  tags?: string[];
  categories?: string[];
  keywords?: string[];
  thumbnailUrl?: string;
  steps?: SetupStepCreateInput[];
  parameters?: SetupParameterCreateInput[];
  toolList?: SetupToolCreateInput[];
}

export interface SetupStepCreateInput {
  stepNumber: number;
  title: string;
  instructions: string;
  imageUrls?: string[];
  videoUrls?: string[];
  estimatedDuration?: number;
  isCritical?: boolean;
  requiresVerification?: boolean;
}

export interface SetupParameterCreateInput {
  parameterName: string;
  targetValue: string;
  tolerance?: string;
  unit?: string;
  equipmentSetting?: string;
  verificationMethod?: string;
}

export interface SetupToolCreateInput {
  toolId?: string;
  toolName: string;
  toolNumber?: string;
  quantity?: number;
  toolOffset?: string;
  notes?: string;
}

export interface SetupSheetUpdateInput {
  title?: string;
  description?: string;
  equipmentId?: string;
  operationId?: string;
  partId?: string;
  workCenterId?: string;
  estimatedSetupTime?: number;
  safetyChecklist?: any;
  requiredPPE?: string[];
  imageUrls?: string[];
  videoUrls?: string[];
  attachmentUrls?: string[];
  tags?: string[];
  categories?: string[];
  keywords?: string[];
  thumbnailUrl?: string;
}

export interface SetupSheetFilters {
  status?: string[];
  equipmentId?: string;
  operationId?: string;
  partId?: string;
  workCenterId?: string;
  searchTerm?: string;
  tags?: string[];
  categories?: string[];
  createdById?: string;
  approvedById?: string;
  isActive?: boolean;
}

export interface SetupExecutionCreateInput {
  workOrderId?: string;
  operationId?: string;
  startedById: string;
}

export interface SetupExecutionCompleteInput {
  completedById: string;
  actualSetupTime?: number;
  verificationData?: any;
  firstPieceResults?: any;
}

export class SetupSheetService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // ============================================================================
  // Setup Sheet CRUD Operations
  // ============================================================================

  /**
   * Create a new setup sheet
   */
  async createSetupSheet(
    input: SetupSheetCreateInput,
    createdById: string
  ): Promise<any> {
    try {
      // Validate required fields
      if (!input.title?.trim()) {
        throw new Error('Setup sheet title is required');
      }

      // Generate document number
      const documentNumber = await this.generateDocumentNumber();

      // Create setup sheet with related data
      const setupSheet = await this.prisma.setupSheet.create({
        data: {
          documentNumber,
          title: input.title.trim(),
          description: input.description?.trim(),
          equipmentId: input.equipmentId,
          operationId: input.operationId,
          partId: input.partId,
          workCenterId: input.workCenterId,
          estimatedSetupTime: input.estimatedSetupTime,
          safetyChecklist: input.safetyChecklist,
          requiredPPE: input.requiredPPE || [],
          imageUrls: input.imageUrls || [],
          videoUrls: input.videoUrls || [],
          attachmentUrls: input.attachmentUrls || [],
          tags: input.tags || [],
          categories: input.categories || [],
          keywords: input.keywords || [],
          thumbnailUrl: input.thumbnailUrl,
          createdById,
          updatedById: createdById,

          // Create related steps
          steps: input.steps ? {
            create: input.steps.map(step => ({
              stepNumber: step.stepNumber,
              title: step.title,
              instructions: step.instructions,
              imageUrls: step.imageUrls || [],
              videoUrls: step.videoUrls || [],
              estimatedDuration: step.estimatedDuration,
              isCritical: step.isCritical || false,
              requiresVerification: step.requiresVerification || false
            }))
          } : undefined,

          // Create related parameters
          parameters: input.parameters ? {
            create: input.parameters.map(param => ({
              parameterName: param.parameterName,
              targetValue: param.targetValue,
              tolerance: param.tolerance,
              unit: param.unit,
              equipmentSetting: param.equipmentSetting,
              verificationMethod: param.verificationMethod
            }))
          } : undefined,

          // Create related tools
          toolList: input.toolList ? {
            create: input.toolList.map(tool => ({
              toolId: tool.toolId,
              toolName: tool.toolName,
              toolNumber: tool.toolNumber,
              quantity: tool.quantity || 1,
              toolOffset: tool.toolOffset,
              notes: tool.notes
            }))
          } : undefined
        },
        include: this.getDefaultInclude()
      });

      logger.info('Setup sheet created successfully', {
        setupSheetId: setupSheet.id,
        documentNumber: setupSheet.documentNumber,
        createdById
      });

      return setupSheet;

    } catch (error) {
      logger.error('Error creating setup sheet:', error);
      throw error;
    }
  }

  /**
   * Get setup sheet by ID
   */
  async getSetupSheetById(id: string): Promise<any> {
    const setupSheet = await this.prisma.setupSheet.findUnique({
      where: { id },
      include: this.getDefaultInclude()
    });

    if (!setupSheet) {
      throw new Error('Setup sheet not found');
    }

    return setupSheet;
  }

  /**
   * Get setup sheet by document number
   */
  async getSetupSheetByDocumentNumber(documentNumber: string): Promise<any> {
    const setupSheet = await this.prisma.setupSheet.findUnique({
      where: { documentNumber },
      include: this.getDefaultInclude()
    });

    if (!setupSheet) {
      throw new Error('Setup sheet not found');
    }

    return setupSheet;
  }

  /**
   * Get setup sheets with filtering and pagination
   */
  async getSetupSheets(
    filters: SetupSheetFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const where = this.buildWhereClause(filters);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.setupSheet.findMany({
        where,
        include: this.getDefaultInclude(),
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.setupSheet.count({ where })
    ]);

    return {
      data,
      total,
      page,
      limit
    };
  }

  /**
   * Update setup sheet
   */
  async updateSetupSheet(
    id: string,
    input: SetupSheetUpdateInput,
    updatedById: string
  ): Promise<any> {
    try {
      // Check if setup sheet exists
      const existingSetupSheet = await this.prisma.setupSheet.findUnique({
        where: { id }
      });

      if (!existingSetupSheet) {
        throw new Error('Setup sheet not found');
      }

      // Update setup sheet
      const updatedSetupSheet = await this.prisma.setupSheet.update({
        where: { id },
        data: {
          ...input,
          updatedById,
          updatedAt: new Date()
        },
        include: this.getDefaultInclude()
      });

      logger.info('Setup sheet updated successfully', {
        setupSheetId: id,
        updatedById
      });

      return updatedSetupSheet;

    } catch (error) {
      logger.error('Error updating setup sheet:', error);
      throw error;
    }
  }

  /**
   * Delete setup sheet (soft delete by setting isActive = false)
   */
  async deleteSetupSheet(id: string, deletedById: string): Promise<void> {
    try {
      await this.prisma.setupSheet.update({
        where: { id },
        data: {
          isActive: false,
          updatedById: deletedById,
          updatedAt: new Date()
        }
      });

      logger.info('Setup sheet deleted successfully', {
        setupSheetId: id,
        deletedById
      });

    } catch (error) {
      logger.error('Error deleting setup sheet:', error);
      throw error;
    }
  }

  // ============================================================================
  // Setup Sheet Step Management
  // ============================================================================

  /**
   * Add step to setup sheet
   */
  async addSetupStep(
    setupSheetId: string,
    stepInput: SetupStepCreateInput
  ): Promise<any> {
    try {
      const step = await this.prisma.setupStep.create({
        data: {
          setupSheetId,
          stepNumber: stepInput.stepNumber,
          title: stepInput.title,
          instructions: stepInput.instructions,
          imageUrls: stepInput.imageUrls || [],
          videoUrls: stepInput.videoUrls || [],
          estimatedDuration: stepInput.estimatedDuration,
          isCritical: stepInput.isCritical || false,
          requiresVerification: stepInput.requiresVerification || false
        }
      });

      logger.info('Setup step added successfully', {
        setupSheetId,
        stepId: step.id
      });

      return step;

    } catch (error) {
      logger.error('Error adding setup step:', error);
      throw error;
    }
  }

  /**
   * Update setup step
   */
  async updateSetupStep(
    stepId: string,
    stepInput: Partial<SetupStepCreateInput>
  ): Promise<any> {
    try {
      const updatedStep = await this.prisma.setupStep.update({
        where: { id: stepId },
        data: stepInput
      });

      logger.info('Setup step updated successfully', { stepId });

      return updatedStep;

    } catch (error) {
      logger.error('Error updating setup step:', error);
      throw error;
    }
  }

  /**
   * Delete setup step
   */
  async deleteSetupStep(stepId: string): Promise<void> {
    try {
      await this.prisma.setupStep.delete({
        where: { id: stepId }
      });

      logger.info('Setup step deleted successfully', { stepId });

    } catch (error) {
      logger.error('Error deleting setup step:', error);
      throw error;
    }
  }

  // ============================================================================
  // Setup Execution Management
  // ============================================================================

  /**
   * Start setup execution
   */
  async startSetupExecution(
    setupSheetId: string,
    input: SetupExecutionCreateInput
  ): Promise<any> {
    try {
      const execution = await this.prisma.setupExecution.create({
        data: {
          setupSheetId,
          workOrderId: input.workOrderId,
          operationId: input.operationId,
          startedById: input.startedById,
          status: 'IN_PROGRESS'
        },
        include: {
          setupSheet: true,
          startedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      logger.info('Setup execution started', {
        executionId: execution.id,
        setupSheetId,
        startedById: input.startedById
      });

      return execution;

    } catch (error) {
      logger.error('Error starting setup execution:', error);
      throw error;
    }
  }

  /**
   * Complete setup execution
   */
  async completeSetupExecution(
    executionId: string,
    input: SetupExecutionCompleteInput
  ): Promise<any> {
    try {
      const execution = await this.prisma.setupExecution.update({
        where: { id: executionId },
        data: {
          completedById: input.completedById,
          completedAt: new Date(),
          actualSetupTime: input.actualSetupTime,
          verificationData: input.verificationData,
          firstPieceResults: input.firstPieceResults,
          status: 'COMPLETED'
        },
        include: {
          setupSheet: true,
          startedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          },
          completedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      logger.info('Setup execution completed', {
        executionId,
        completedById: input.completedById
      });

      return execution;

    } catch (error) {
      logger.error('Error completing setup execution:', error);
      throw error;
    }
  }

  /**
   * Get setup executions by setup sheet
   */
  async getSetupExecutions(setupSheetId: string): Promise<any[]> {
    return this.prisma.setupExecution.findMany({
      where: { setupSheetId },
      include: {
        startedBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        },
        completedBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { startedAt: 'desc' }
    });
  }

  // ============================================================================
  // Version Control
  // ============================================================================

  /**
   * Create new version of setup sheet
   */
  async createVersion(
    setupSheetId: string,
    input: SetupSheetCreateInput,
    createdById: string
  ): Promise<any> {
    try {
      // Get current setup sheet
      const currentSetupSheet = await this.getSetupSheetById(setupSheetId);

      // Create new version
      const newVersion = await this.createSetupSheet({
        ...input,
        title: input.title || currentSetupSheet.title
      }, createdById);

      // Link versions
      await this.prisma.setupSheet.update({
        where: { id: newVersion.id },
        data: {
          parentVersionId: setupSheetId,
          version: this.incrementVersion(currentSetupSheet.version)
        }
      });

      logger.info('Setup sheet version created', {
        originalId: setupSheetId,
        newVersionId: newVersion.id
      });

      return newVersion;

    } catch (error) {
      logger.error('Error creating setup sheet version:', error);
      throw error;
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private async generateDocumentNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = 'SS';

    // Find the latest document number for this year
    const latestSetupSheet = await this.prisma.setupSheet.findFirst({
      where: {
        documentNumber: {
          startsWith: `${prefix}-${year}-`
        }
      },
      orderBy: { documentNumber: 'desc' }
    });

    let sequence = 1;
    if (latestSetupSheet) {
      const match = latestSetupSheet.documentNumber.match(/-(\d+)$/);
      if (match) {
        sequence = parseInt(match[1]) + 1;
      }
    }

    return `${prefix}-${year}-${sequence.toString().padStart(4, '0')}`;
  }

  private getDefaultInclude() {
    return {
      createdBy: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true
        }
      },
      updatedBy: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true
        }
      },
      approvedBy: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true
        }
      },
      steps: {
        orderBy: { stepNumber: 'asc' }
      },
      parameters: true,
      toolList: true,
      executions: {
        include: {
          startedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          },
          completedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { startedAt: 'desc' }
      },
      parentVersion: {
        select: {
          id: true,
          documentNumber: true,
          version: true,
          title: true
        }
      },
      childVersions: {
        select: {
          id: true,
          documentNumber: true,
          version: true,
          title: true
        }
      }
    };
  }

  private buildWhereClause(filters: SetupSheetFilters): any {
    const where: any = {};

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    } else {
      where.isActive = true; // Default to active only
    }

    if (filters.status?.length) {
      where.status = { in: filters.status };
    }

    if (filters.equipmentId) {
      where.equipmentId = filters.equipmentId;
    }

    if (filters.operationId) {
      where.operationId = filters.operationId;
    }

    if (filters.partId) {
      where.partId = filters.partId;
    }

    if (filters.workCenterId) {
      where.workCenterId = filters.workCenterId;
    }

    if (filters.createdById) {
      where.createdById = filters.createdById;
    }

    if (filters.approvedById) {
      where.approvedById = filters.approvedById;
    }

    if (filters.tags?.length) {
      where.tags = { hasSome: filters.tags };
    }

    if (filters.categories?.length) {
      where.categories = { hasSome: filters.categories };
    }

    if (filters.searchTerm) {
      where.OR = [
        { title: { contains: filters.searchTerm, mode: 'insensitive' } },
        { description: { contains: filters.searchTerm, mode: 'insensitive' } },
        { documentNumber: { contains: filters.searchTerm, mode: 'insensitive' } },
        { keywords: { hasSome: [filters.searchTerm] } }
      ];
    }

    return where;
  }

  private incrementVersion(currentVersion: string): string {
    const parts = currentVersion.split('.');
    const major = parseInt(parts[0]) || 1;
    const minor = parseInt(parts[1]) || 0;
    const patch = parseInt(parts[2]) || 0;

    return `${major}.${minor}.${patch + 1}`;
  }
}