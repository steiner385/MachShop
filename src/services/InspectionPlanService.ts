/**
 * ✅ GITHUB ISSUE #23: InspectionPlanService
 *
 * Service for managing Inspection Plan documents - quality inspection procedures
 * and acceptance criteria with characteristics, measurement methods, and execution tracking.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// Import enums from Prisma
import type { InspectionType, InspectionFrequency, MeasurementType, InspectionResult, Disposition } from '@prisma/client';

// Types for Inspection Plan operations
export interface InspectionPlanCreateInput {
  title: string;
  description?: string;
  partId?: string;
  operationId?: string;
  inspectionType: InspectionType;
  frequency: InspectionFrequency;
  samplingPlan?: any;
  dispositionRules?: any;
  gageRRRequired?: boolean;
  gageRRFrequency?: string;
  imageUrls?: string[];
  videoUrls?: string[];
  attachmentUrls?: string[];
  tags?: string[];
  categories?: string[];
  keywords?: string[];
  thumbnailUrl?: string;
  characteristics?: InspectionCharacteristicCreateInput[];
  steps?: InspectionStepCreateInput[];
}

export interface InspectionCharacteristicCreateInput {
  characteristicNumber: number;
  characteristicName: string;
  measurementType: MeasurementType;
  nominal?: number;
  upperLimit?: number;
  lowerLimit?: number;
  unit?: string;
  measurementMethod?: string;
  gageType?: string;
  isCritical?: boolean;
}

export interface InspectionStepCreateInput {
  stepNumber: number;
  title: string;
  instructions: string;
  characteristicRefs?: number[];
  imageUrls?: string[];
}

export interface InspectionPlanUpdateInput {
  title?: string;
  description?: string;
  partId?: string;
  operationId?: string;
  inspectionType?: InspectionType;
  frequency?: InspectionFrequency;
  samplingPlan?: any;
  dispositionRules?: any;
  gageRRRequired?: boolean;
  gageRRFrequency?: string;
  imageUrls?: string[];
  videoUrls?: string[];
  attachmentUrls?: string[];
  tags?: string[];
  categories?: string[];
  keywords?: string[];
  thumbnailUrl?: string;
}

export interface InspectionPlanFilters {
  status?: string[];
  inspectionType?: InspectionType[];
  frequency?: InspectionFrequency[];
  partId?: string;
  operationId?: string;
  searchTerm?: string;
  tags?: string[];
  categories?: string[];
  createdById?: string;
  approvedById?: string;
  isActive?: boolean;
  gageRRRequired?: boolean;
}

export interface InspectionExecutionCreateInput {
  workOrderId?: string;
  operationId?: string;
  lotNumber?: string;
  serialNumber?: string;
  inspectorId: string;
  results: any;
  overallResult: InspectionResult;
  defectsFound?: any;
  disposition?: Disposition;
  signatureId?: string;
}

export class InspectionPlanService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // ============================================================================
  // Inspection Plan CRUD Operations
  // ============================================================================

  /**
   * Create a new inspection plan
   */
  async createInspectionPlan(
    input: InspectionPlanCreateInput,
    createdById: string
  ): Promise<any> {
    try {
      // Validate required fields
      if (!input.title?.trim()) {
        throw new Error('Inspection plan title is required');
      }

      if (!input.inspectionType) {
        throw new Error('Inspection type is required');
      }

      if (!input.frequency) {
        throw new Error('Inspection frequency is required');
      }

      // Generate document number
      const documentNumber = await this.generateDocumentNumber();

      // Create inspection plan with related data
      const inspectionPlan = await this.prisma.inspectionPlan.create({
        data: {
          documentNumber,
          title: input.title.trim(),
          description: input.description?.trim(),
          partId: input.partId,
          operationId: input.operationId,
          inspectionType: input.inspectionType,
          frequency: input.frequency,
          samplingPlan: input.samplingPlan,
          dispositionRules: input.dispositionRules,
          gageRRRequired: input.gageRRRequired || false,
          gageRRFrequency: input.gageRRFrequency,
          imageUrls: input.imageUrls || [],
          videoUrls: input.videoUrls || [],
          attachmentUrls: input.attachmentUrls || [],
          tags: input.tags || [],
          categories: input.categories || [],
          keywords: input.keywords || [],
          thumbnailUrl: input.thumbnailUrl,
          createdById,
          updatedById: createdById,

          // Create related characteristics
          characteristics: input.characteristics ? {
            create: input.characteristics.map(char => ({
              characteristicNumber: char.characteristicNumber,
              characteristicName: char.characteristicName,
              measurementType: char.measurementType,
              nominal: char.nominal,
              upperLimit: char.upperLimit,
              lowerLimit: char.lowerLimit,
              unit: char.unit,
              measurementMethod: char.measurementMethod,
              gageType: char.gageType,
              isCritical: char.isCritical || false
            }))
          } : undefined,

          // Create related steps
          steps: input.steps ? {
            create: input.steps.map(step => ({
              stepNumber: step.stepNumber,
              title: step.title,
              instructions: step.instructions,
              characteristicRefs: step.characteristicRefs || [],
              imageUrls: step.imageUrls || []
            }))
          } : undefined
        },
        include: this.getDefaultInclude()
      });

      logger.info('Inspection plan created successfully', {
        inspectionPlanId: inspectionPlan.id,
        documentNumber: inspectionPlan.documentNumber,
        createdById
      });

      return inspectionPlan;

    } catch (error) {
      logger.error('Error creating inspection plan:', error);
      throw error;
    }
  }

  /**
   * Get inspection plan by ID
   */
  async getInspectionPlanById(id: string): Promise<any> {
    const inspectionPlan = await this.prisma.inspectionPlan.findUnique({
      where: { id },
      include: this.getDefaultInclude()
    });

    if (!inspectionPlan) {
      throw new Error('Inspection plan not found');
    }

    return inspectionPlan;
  }

  /**
   * Get inspection plan by document number
   */
  async getInspectionPlanByDocumentNumber(documentNumber: string): Promise<any> {
    const inspectionPlan = await this.prisma.inspectionPlan.findUnique({
      where: { documentNumber },
      include: this.getDefaultInclude()
    });

    if (!inspectionPlan) {
      throw new Error('Inspection plan not found');
    }

    return inspectionPlan;
  }

  /**
   * Get inspection plans with filtering and pagination
   */
  async getInspectionPlans(
    filters: InspectionPlanFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const where = this.buildWhereClause(filters);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.inspectionPlan.findMany({
        where,
        include: this.getDefaultInclude(),
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.inspectionPlan.count({ where })
    ]);

    return {
      data,
      total,
      page,
      limit
    };
  }

  /**
   * Update inspection plan
   */
  async updateInspectionPlan(
    id: string,
    input: InspectionPlanUpdateInput,
    updatedById: string
  ): Promise<any> {
    try {
      // Check if inspection plan exists
      const existingPlan = await this.prisma.inspectionPlan.findUnique({
        where: { id }
      });

      if (!existingPlan) {
        throw new Error('Inspection plan not found');
      }

      // Update inspection plan
      const updatedPlan = await this.prisma.inspectionPlan.update({
        where: { id },
        data: {
          ...input,
          updatedById,
          updatedAt: new Date()
        },
        include: this.getDefaultInclude()
      });

      logger.info('Inspection plan updated successfully', {
        inspectionPlanId: id,
        updatedById
      });

      return updatedPlan;

    } catch (error) {
      logger.error('Error updating inspection plan:', error);
      throw error;
    }
  }

  /**
   * Delete inspection plan (soft delete by setting isActive = false)
   */
  async deleteInspectionPlan(id: string, deletedById: string): Promise<void> {
    try {
      await this.prisma.inspectionPlan.update({
        where: { id },
        data: {
          isActive: false,
          updatedById: deletedById,
          updatedAt: new Date()
        }
      });

      logger.info('Inspection plan deleted successfully', {
        inspectionPlanId: id,
        deletedById
      });

    } catch (error) {
      logger.error('Error deleting inspection plan:', error);
      throw error;
    }
  }

  // ============================================================================
  // Inspection Characteristics Management
  // ============================================================================

  /**
   * Add characteristic to inspection plan
   */
  async addInspectionCharacteristic(
    inspectionPlanId: string,
    characteristicInput: InspectionCharacteristicCreateInput
  ): Promise<any> {
    try {
      const characteristic = await this.prisma.inspectionCharacteristic.create({
        data: {
          inspectionPlanId,
          characteristicNumber: characteristicInput.characteristicNumber,
          characteristicName: characteristicInput.characteristicName,
          measurementType: characteristicInput.measurementType,
          nominal: characteristicInput.nominal,
          upperLimit: characteristicInput.upperLimit,
          lowerLimit: characteristicInput.lowerLimit,
          unit: characteristicInput.unit,
          measurementMethod: characteristicInput.measurementMethod,
          gageType: characteristicInput.gageType,
          isCritical: characteristicInput.isCritical || false
        }
      });

      logger.info('Inspection characteristic added successfully', {
        inspectionPlanId,
        characteristicId: characteristic.id
      });

      return characteristic;

    } catch (error) {
      logger.error('Error adding inspection characteristic:', error);
      throw error;
    }
  }

  /**
   * Update inspection characteristic
   */
  async updateInspectionCharacteristic(
    characteristicId: string,
    characteristicInput: Partial<InspectionCharacteristicCreateInput>
  ): Promise<any> {
    try {
      const updatedCharacteristic = await this.prisma.inspectionCharacteristic.update({
        where: { id: characteristicId },
        data: characteristicInput
      });

      logger.info('Inspection characteristic updated successfully', { characteristicId });

      return updatedCharacteristic;

    } catch (error) {
      logger.error('Error updating inspection characteristic:', error);
      throw error;
    }
  }

  /**
   * Delete inspection characteristic
   */
  async deleteInspectionCharacteristic(characteristicId: string): Promise<void> {
    try {
      await this.prisma.inspectionCharacteristic.delete({
        where: { id: characteristicId }
      });

      logger.info('Inspection characteristic deleted successfully', { characteristicId });

    } catch (error) {
      logger.error('Error deleting inspection characteristic:', error);
      throw error;
    }
  }

  // ============================================================================
  // Inspection Execution Management
  // ============================================================================

  /**
   * Create inspection execution (record inspection results)
   */
  async createInspectionExecution(
    inspectionPlanId: string,
    input: InspectionExecutionCreateInput
  ): Promise<any> {
    try {
      const execution = await this.prisma.inspectionExecution.create({
        data: {
          inspectionPlanId,
          workOrderId: input.workOrderId,
          operationId: input.operationId,
          lotNumber: input.lotNumber,
          serialNumber: input.serialNumber,
          inspectorId: input.inspectorId,
          results: input.results,
          overallResult: input.overallResult,
          defectsFound: input.defectsFound,
          disposition: input.disposition,
          signatureId: input.signatureId
        },
        include: {
          inspectionPlan: true,
          inspector: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      logger.info('Inspection execution created', {
        executionId: execution.id,
        inspectionPlanId,
        inspectorId: input.inspectorId,
        overallResult: input.overallResult
      });

      return execution;

    } catch (error) {
      logger.error('Error creating inspection execution:', error);
      throw error;
    }
  }

  /**
   * Get inspection executions by inspection plan
   */
  async getInspectionExecutions(
    inspectionPlanId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.inspectionExecution.findMany({
        where: { inspectionPlanId },
        include: {
          inspector: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { inspectedAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.inspectionExecution.count({
        where: { inspectionPlanId }
      })
    ]);

    return {
      data,
      total,
      page,
      limit
    };
  }

  /**
   * Get inspection statistics
   */
  async getInspectionStatistics(inspectionPlanId: string): Promise<any> {
    const executions = await this.prisma.inspectionExecution.findMany({
      where: { inspectionPlanId },
      select: {
        overallResult: true,
        disposition: true,
        inspectedAt: true
      }
    });

    const total = executions.length;
    const passed = executions.filter(e => e.overallResult === 'PASS').length;
    const failed = executions.filter(e => e.overallResult === 'FAIL').length;
    const conditional = executions.filter(e => e.overallResult === 'CONDITIONAL_PASS').length;
    const pending = executions.filter(e => e.overallResult === 'PENDING_REVIEW').length;

    const passRate = total > 0 ? (passed / total) * 100 : 0;

    return {
      total,
      passed,
      failed,
      conditional,
      pending,
      passRate: Math.round(passRate * 100) / 100
    };
  }

  // ============================================================================
  // Version Control
  // ============================================================================

  /**
   * Create new version of inspection plan
   */
  async createVersion(
    inspectionPlanId: string,
    input: InspectionPlanCreateInput,
    createdById: string
  ): Promise<any> {
    try {
      // Get current inspection plan
      const currentPlan = await this.getInspectionPlanById(inspectionPlanId);

      // Create new version
      const newVersion = await this.createInspectionPlan({
        ...input,
        title: input.title || currentPlan.title,
        inspectionType: input.inspectionType || currentPlan.inspectionType,
        frequency: input.frequency || currentPlan.frequency
      }, createdById);

      // Link versions
      await this.prisma.inspectionPlan.update({
        where: { id: newVersion.id },
        data: {
          parentVersionId: inspectionPlanId,
          version: this.incrementVersion(currentPlan.version)
        }
      });

      logger.info('Inspection plan version created', {
        originalId: inspectionPlanId,
        newVersionId: newVersion.id
      });

      return newVersion;

    } catch (error) {
      logger.error('Error creating inspection plan version:', error);
      throw error;
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private async generateDocumentNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = 'IP';

    // Find the latest document number for this year
    const latestPlan = await this.prisma.inspectionPlan.findFirst({
      where: {
        documentNumber: {
          startsWith: `${prefix}-${year}-`
        }
      },
      orderBy: { documentNumber: 'desc' }
    });

    let sequence = 1;
    if (latestPlan) {
      const match = latestPlan.documentNumber.match(/-(\d+)$/);
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
      characteristics: {
        orderBy: { characteristicNumber: 'asc' }
      },
      steps: {
        orderBy: { stepNumber: 'asc' }
      },
      executions: {
        include: {
          inspector: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { inspectedAt: 'desc' },
        take: 10 // Limit recent executions
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

  private buildWhereClause(filters: InspectionPlanFilters): any {
    const where: any = {};

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    } else {
      where.isActive = true; // Default to active only
    }

    if (filters.status?.length) {
      where.status = { in: filters.status };
    }

    if (filters.inspectionType?.length) {
      where.inspectionType = { in: filters.inspectionType };
    }

    if (filters.frequency?.length) {
      where.frequency = { in: filters.frequency };
    }

    if (filters.partId) {
      where.partId = filters.partId;
    }

    if (filters.operationId) {
      where.operationId = filters.operationId;
    }

    if (filters.createdById) {
      where.createdById = filters.createdById;
    }

    if (filters.approvedById) {
      where.approvedById = filters.approvedById;
    }

    if (filters.gageRRRequired !== undefined) {
      where.gageRRRequired = filters.gageRRRequired;
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