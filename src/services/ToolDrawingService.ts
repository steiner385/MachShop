/**
 * ✅ GITHUB ISSUE #23: ToolDrawingService
 *
 * Service for managing Tool & Fixture Drawing documents - tool specifications,
 * maintenance records, calibration tracking, and usage logs with inventory management.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// Import enums from Prisma
import type { ToolType, MaintenanceType } from '@prisma/client';

// Types for Tool Drawing operations
export interface ToolDrawingCreateInput {
  title: string;
  description?: string;
  toolType: ToolType;
  toolSubtype?: string;
  dimensions?: any;
  material?: string;
  weight?: number;
  weightUnit?: string;
  vendorId?: string;
  vendorName?: string;
  vendorPartNumber?: string;
  catalogNumber?: string;
  cost?: number;
  costCurrency?: string;
  applicablePartIds?: string[];
  applicableOperations?: string[];
  usageInstructions?: string;
  maintenanceProcedure?: string;
  requiresCalibration?: boolean;
  calibrationInterval?: number;
  lastCalibrationDate?: Date;
  nextCalibrationDate?: Date;
  storageLocation?: string;
  quantityOnHand?: number;
  minimumQuantity?: number;
  cadFileUrls?: string[];
  imageUrls?: string[];
  videoUrls?: string[];
  attachmentUrls?: string[];
  tags?: string[];
  categories?: string[];
  keywords?: string[];
  thumbnailUrl?: string;
}

export interface ToolDrawingUpdateInput {
  title?: string;
  description?: string;
  toolType?: ToolType;
  toolSubtype?: string;
  dimensions?: any;
  material?: string;
  weight?: number;
  weightUnit?: string;
  vendorId?: string;
  vendorName?: string;
  vendorPartNumber?: string;
  catalogNumber?: string;
  cost?: number;
  costCurrency?: string;
  applicablePartIds?: string[];
  applicableOperations?: string[];
  usageInstructions?: string;
  maintenanceProcedure?: string;
  requiresCalibration?: boolean;
  calibrationInterval?: number;
  lastCalibrationDate?: Date;
  nextCalibrationDate?: Date;
  storageLocation?: string;
  quantityOnHand?: number;
  minimumQuantity?: number;
  cadFileUrls?: string[];
  imageUrls?: string[];
  videoUrls?: string[];
  attachmentUrls?: string[];
  tags?: string[];
  categories?: string[];
  keywords?: string[];
  thumbnailUrl?: string;
}

export interface ToolDrawingFilters {
  status?: string[];
  toolType?: ToolType[];
  vendorId?: string;
  searchTerm?: string;
  tags?: string[];
  categories?: string[];
  createdById?: string;
  approvedById?: string;
  isActive?: boolean;
  requiresCalibration?: boolean;
  calibrationDue?: boolean;
  lowInventory?: boolean;
  applicablePartId?: string;
  applicableOperation?: string;
}

export interface ToolMaintenanceInput {
  performedById: string;
  performedByName: string;
  maintenanceType: MaintenanceType;
  description: string;
  partsReplaced?: any;
  cost?: number;
  toolConditionBefore?: string;
  toolConditionAfter?: string;
}

export interface ToolCalibrationInput {
  performedById: string;
  performedByName: string;
  calibrationResults: any;
  passed: boolean;
  certificationNumber?: string;
  certificateUrl?: string;
  nextDueDate: Date;
}

export interface ToolUsageInput {
  usedById: string;
  usedByName: string;
  workOrderId?: string;
  operationId?: string;
  usageDuration?: number;
  conditionAfterUse?: string;
}

export class ToolDrawingService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // ============================================================================
  // Tool Drawing CRUD Operations
  // ============================================================================

  /**
   * Create a new tool drawing
   */
  async createToolDrawing(
    input: ToolDrawingCreateInput,
    createdById: string
  ): Promise<any> {
    try {
      // Validate required fields
      if (!input.title?.trim()) {
        throw new Error('Tool drawing title is required');
      }

      if (!input.toolType) {
        throw new Error('Tool type is required');
      }

      // Generate document number
      const documentNumber = await this.generateDocumentNumber();

      // Calculate next calibration date if required
      let nextCalibrationDate = input.nextCalibrationDate;
      if (input.requiresCalibration && input.calibrationInterval && !nextCalibrationDate) {
        const lastCalDate = input.lastCalibrationDate || new Date();
        nextCalibrationDate = new Date(lastCalDate);
        nextCalibrationDate.setDate(nextCalibrationDate.getDate() + input.calibrationInterval);
      }

      // Create tool drawing
      const toolDrawing = await this.prisma.toolDrawing.create({
        data: {
          documentNumber,
          title: input.title.trim(),
          description: input.description?.trim(),
          toolType: input.toolType,
          toolSubtype: input.toolSubtype,
          dimensions: input.dimensions,
          material: input.material,
          weight: input.weight,
          weightUnit: input.weightUnit,
          vendorId: input.vendorId,
          vendorName: input.vendorName,
          vendorPartNumber: input.vendorPartNumber,
          catalogNumber: input.catalogNumber,
          cost: input.cost,
          costCurrency: input.costCurrency,
          applicablePartIds: input.applicablePartIds || [],
          applicableOperations: input.applicableOperations || [],
          usageInstructions: input.usageInstructions,
          maintenanceProcedure: input.maintenanceProcedure,
          requiresCalibration: input.requiresCalibration || false,
          calibrationInterval: input.calibrationInterval,
          lastCalibrationDate: input.lastCalibrationDate,
          nextCalibrationDate,
          storageLocation: input.storageLocation,
          quantityOnHand: input.quantityOnHand,
          minimumQuantity: input.minimumQuantity,
          cadFileUrls: input.cadFileUrls || [],
          imageUrls: input.imageUrls || [],
          videoUrls: input.videoUrls || [],
          attachmentUrls: input.attachmentUrls || [],
          tags: input.tags || [],
          categories: input.categories || [],
          keywords: input.keywords || [],
          thumbnailUrl: input.thumbnailUrl,
          createdById,
          updatedById: createdById
        },
        include: this.getDefaultInclude()
      });

      logger.info('Tool drawing created successfully', {
        toolDrawingId: toolDrawing.id,
        documentNumber: toolDrawing.documentNumber,
        createdById
      });

      return toolDrawing;

    } catch (error) {
      logger.error('Error creating tool drawing:', error);
      throw error;
    }
  }

  /**
   * Get tool drawing by ID
   */
  async getToolDrawingById(id: string): Promise<any> {
    const toolDrawing = await this.prisma.toolDrawing.findUnique({
      where: { id },
      include: this.getDefaultInclude()
    });

    if (!toolDrawing) {
      throw new Error('Tool drawing not found');
    }

    return toolDrawing;
  }

  /**
   * Get tool drawing by document number
   */
  async getToolDrawingByDocumentNumber(documentNumber: string): Promise<any> {
    const toolDrawing = await this.prisma.toolDrawing.findUnique({
      where: { documentNumber },
      include: this.getDefaultInclude()
    });

    if (!toolDrawing) {
      throw new Error('Tool drawing not found');
    }

    return toolDrawing;
  }

  /**
   * Get tool drawings with filtering and pagination
   */
  async getToolDrawings(
    filters: ToolDrawingFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const where = this.buildWhereClause(filters);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.toolDrawing.findMany({
        where,
        include: this.getDefaultInclude(),
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.toolDrawing.count({ where })
    ]);

    return {
      data,
      total,
      page,
      limit
    };
  }

  /**
   * Update tool drawing
   */
  async updateToolDrawing(
    id: string,
    input: ToolDrawingUpdateInput,
    updatedById: string
  ): Promise<any> {
    try {
      // Check if tool drawing exists
      const existingTool = await this.prisma.toolDrawing.findUnique({
        where: { id }
      });

      if (!existingTool) {
        throw new Error('Tool drawing not found');
      }

      // Update calibration date if interval changed
      let updateData = { ...input };
      if (input.calibrationInterval && input.calibrationInterval !== existingTool.calibrationInterval) {
        const lastCalDate = input.lastCalibrationDate || existingTool.lastCalibrationDate || new Date();
        const nextCalDate = new Date(lastCalDate);
        nextCalDate.setDate(nextCalDate.getDate() + input.calibrationInterval);
        updateData.nextCalibrationDate = nextCalDate;
      }

      // Update tool drawing
      const updatedTool = await this.prisma.toolDrawing.update({
        where: { id },
        data: {
          ...updateData,
          updatedById,
          updatedAt: new Date()
        },
        include: this.getDefaultInclude()
      });

      logger.info('Tool drawing updated successfully', {
        toolDrawingId: id,
        updatedById
      });

      return updatedTool;

    } catch (error) {
      logger.error('Error updating tool drawing:', error);
      throw error;
    }
  }

  /**
   * Delete tool drawing (soft delete by setting isActive = false)
   */
  async deleteToolDrawing(id: string, deletedById: string): Promise<void> {
    try {
      await this.prisma.toolDrawing.update({
        where: { id },
        data: {
          isActive: false,
          updatedById: deletedById,
          updatedAt: new Date()
        }
      });

      logger.info('Tool drawing deleted successfully', {
        toolDrawingId: id,
        deletedById
      });

    } catch (error) {
      logger.error('Error deleting tool drawing:', error);
      throw error;
    }
  }

  // ============================================================================
  // Tool Maintenance Management
  // ============================================================================

  /**
   * Record tool maintenance
   */
  async recordToolMaintenance(
    toolDrawingId: string,
    input: ToolMaintenanceInput
  ): Promise<any> {
    try {
      const maintenance = await this.prisma.toolMaintenanceRecord.create({
        data: {
          toolDrawingId,
          maintenanceDate: new Date(),
          performedById: input.performedById,
          performedByName: input.performedByName,
          maintenanceType: input.maintenanceType,
          description: input.description,
          partsReplaced: input.partsReplaced,
          cost: input.cost,
          toolConditionBefore: input.toolConditionBefore,
          toolConditionAfter: input.toolConditionAfter
        },
        include: {
          toolDrawing: {
            select: {
              id: true,
              documentNumber: true,
              title: true
            }
          },
          performedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      logger.info('Tool maintenance recorded', {
        toolDrawingId,
        maintenanceId: maintenance.id,
        performedById: input.performedById
      });

      return maintenance;

    } catch (error) {
      logger.error('Error recording tool maintenance:', error);
      throw error;
    }
  }

  /**
   * Get tool maintenance records
   */
  async getToolMaintenanceRecords(
    toolDrawingId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.toolMaintenanceRecord.findMany({
        where: { toolDrawingId },
        include: {
          performedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { maintenanceDate: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.toolMaintenanceRecord.count({
        where: { toolDrawingId }
      })
    ]);

    return {
      data,
      total,
      page,
      limit
    };
  }

  // ============================================================================
  // Tool Calibration Management
  // ============================================================================

  /**
   * Record tool calibration
   */
  async recordToolCalibration(
    toolDrawingId: string,
    input: ToolCalibrationInput
  ): Promise<any> {
    try {
      // Create calibration record
      const calibration = await this.prisma.toolCalibrationRecord.create({
        data: {
          toolDrawingId,
          calibrationDate: new Date(),
          performedById: input.performedById,
          performedByName: input.performedByName,
          calibrationResults: input.calibrationResults,
          passed: input.passed,
          certificationNumber: input.certificationNumber,
          certificateUrl: input.certificateUrl,
          nextDueDate: input.nextDueDate
        },
        include: {
          toolDrawing: {
            select: {
              id: true,
              documentNumber: true,
              title: true
            }
          },
          performedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      // Update tool drawing with latest calibration info
      await this.prisma.toolDrawing.update({
        where: { id: toolDrawingId },
        data: {
          lastCalibrationDate: new Date(),
          nextCalibrationDate: input.nextDueDate
        }
      });

      logger.info('Tool calibration recorded', {
        toolDrawingId,
        calibrationId: calibration.id,
        performedById: input.performedById,
        passed: input.passed
      });

      return calibration;

    } catch (error) {
      logger.error('Error recording tool calibration:', error);
      throw error;
    }
  }

  /**
   * Get tool calibration records
   */
  async getToolCalibrationRecords(
    toolDrawingId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.toolCalibrationRecord.findMany({
        where: { toolDrawingId },
        include: {
          performedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { calibrationDate: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.toolCalibrationRecord.count({
        where: { toolDrawingId }
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
   * Get tools due for calibration
   */
  async getToolsDueForCalibration(): Promise<any[]> {
    const today = new Date();

    return this.prisma.toolDrawing.findMany({
      where: {
        isActive: true,
        requiresCalibration: true,
        nextCalibrationDate: {
          lte: today
        }
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { nextCalibrationDate: 'asc' }
    });
  }

  // ============================================================================
  // Tool Usage Tracking
  // ============================================================================

  /**
   * Record tool usage
   */
  async recordToolUsage(
    toolDrawingId: string,
    input: ToolUsageInput
  ): Promise<any> {
    try {
      const usage = await this.prisma.toolUsageLog.create({
        data: {
          toolDrawingId,
          usedById: input.usedById,
          usedByName: input.usedByName,
          workOrderId: input.workOrderId,
          operationId: input.operationId,
          usageDuration: input.usageDuration,
          conditionAfterUse: input.conditionAfterUse
        },
        include: {
          toolDrawing: {
            select: {
              id: true,
              documentNumber: true,
              title: true
            }
          },
          usedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      logger.info('Tool usage recorded', {
        toolDrawingId,
        usageId: usage.id,
        usedById: input.usedById
      });

      return usage;

    } catch (error) {
      logger.error('Error recording tool usage:', error);
      throw error;
    }
  }

  /**
   * Get tool usage logs
   */
  async getToolUsageLogs(
    toolDrawingId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.toolUsageLog.findMany({
        where: { toolDrawingId },
        include: {
          usedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { usedAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.toolUsageLog.count({
        where: { toolDrawingId }
      })
    ]);

    return {
      data,
      total,
      page,
      limit
    };
  }

  // ============================================================================
  // Inventory Management
  // ============================================================================

  /**
   * Update tool inventory
   */
  async updateToolInventory(
    toolDrawingId: string,
    quantityOnHand: number,
    updatedById: string
  ): Promise<any> {
    try {
      const updatedTool = await this.prisma.toolDrawing.update({
        where: { id: toolDrawingId },
        data: {
          quantityOnHand,
          updatedById,
          updatedAt: new Date()
        },
        include: this.getDefaultInclude()
      });

      logger.info('Tool inventory updated', {
        toolDrawingId,
        quantityOnHand,
        updatedById
      });

      return updatedTool;

    } catch (error) {
      logger.error('Error updating tool inventory:', error);
      throw error;
    }
  }

  /**
   * Get tools with low inventory
   */
  async getToolsWithLowInventory(): Promise<any[]> {
    return this.prisma.toolDrawing.findMany({
      where: {
        isActive: true,
        quantityOnHand: {
          not: null
        },
        minimumQuantity: {
          not: null
        },
        // This is a PostgreSQL-specific raw query for comparison
        // In a real implementation, you might need to handle this differently
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      }
    }).then(tools =>
      tools.filter(tool =>
        tool.quantityOnHand !== null &&
        tool.minimumQuantity !== null &&
        tool.quantityOnHand <= tool.minimumQuantity
      )
    );
  }

  // ============================================================================
  // Version Control
  // ============================================================================

  /**
   * Create new version of tool drawing
   */
  async createVersion(
    toolDrawingId: string,
    input: ToolDrawingCreateInput,
    createdById: string
  ): Promise<any> {
    try {
      // Get current tool drawing
      const currentTool = await this.getToolDrawingById(toolDrawingId);

      // Create new version
      const newVersion = await this.createToolDrawing({
        ...input,
        title: input.title || currentTool.title,
        toolType: input.toolType || currentTool.toolType
      }, createdById);

      // Link versions
      await this.prisma.toolDrawing.update({
        where: { id: newVersion.id },
        data: {
          parentVersionId: toolDrawingId,
          version: this.incrementVersion(currentTool.version)
        }
      });

      logger.info('Tool drawing version created', {
        originalId: toolDrawingId,
        newVersionId: newVersion.id
      });

      return newVersion;

    } catch (error) {
      logger.error('Error creating tool drawing version:', error);
      throw error;
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private async generateDocumentNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = 'TD';

    // Find the latest document number for this year
    const latestTool = await this.prisma.toolDrawing.findFirst({
      where: {
        documentNumber: {
          startsWith: `${prefix}-${year}-`
        }
      },
      orderBy: { documentNumber: 'desc' }
    });

    let sequence = 1;
    if (latestTool) {
      const match = latestTool.documentNumber.match(/-(\d+)$/);
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
      maintenanceRecords: {
        include: {
          performedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { maintenanceDate: 'desc' },
        take: 5 // Limit recent maintenance records
      },
      calibrationRecords: {
        include: {
          performedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { calibrationDate: 'desc' },
        take: 5 // Limit recent calibration records
      },
      usageLogs: {
        include: {
          usedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { usedAt: 'desc' },
        take: 10 // Limit recent usage logs
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

  private buildWhereClause(filters: ToolDrawingFilters): any {
    const where: any = {};

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    } else {
      where.isActive = true; // Default to active only
    }

    if (filters.status?.length) {
      where.status = { in: filters.status };
    }

    if (filters.toolType?.length) {
      where.toolType = { in: filters.toolType };
    }

    if (filters.vendorId) {
      where.vendorId = filters.vendorId;
    }

    if (filters.createdById) {
      where.createdById = filters.createdById;
    }

    if (filters.approvedById) {
      where.approvedById = filters.approvedById;
    }

    if (filters.requiresCalibration !== undefined) {
      where.requiresCalibration = filters.requiresCalibration;
    }

    if (filters.calibrationDue) {
      where.requiresCalibration = true;
      where.nextCalibrationDate = { lte: new Date() };
    }

    if (filters.applicablePartId) {
      where.applicablePartIds = { has: filters.applicablePartId };
    }

    if (filters.applicableOperation) {
      where.applicableOperations = { has: filters.applicableOperation };
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
        { vendorName: { contains: filters.searchTerm, mode: 'insensitive' } },
        { vendorPartNumber: { contains: filters.searchTerm, mode: 'insensitive' } },
        { catalogNumber: { contains: filters.searchTerm, mode: 'insensitive' } },
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