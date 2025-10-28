/**
 * ✅ GITHUB ISSUE #23: UnifiedDocumentService
 *
 * Service providing unified operations across all document types:
 * WorkInstructions, SetupSheets, InspectionPlans, SOPs, and ToolDrawings.
 * Enables cross-document search, impact analysis, and bulk operations.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { SetupSheetService } from './SetupSheetService';
import { InspectionPlanService } from './InspectionPlanService';
import { SOPService } from './SOPService';
import { ToolDrawingService } from './ToolDrawingService';

// Import enums from Prisma
import type { DocumentType } from '@prisma/client';

// Types for unified document operations
export interface UnifiedSearchFilters {
  searchTerm?: string;
  documentTypes?: DocumentType[];
  status?: string[];
  tags?: string[];
  categories?: string[];
  createdById?: string;
  approvedById?: string;
  isActive?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface DocumentCollection {
  workInstructions: any[];
  setupSheets: any[];
  inspectionPlans: any[];
  sops: any[];
  toolDrawings: any[];
}

export interface ImpactAnalysisResult {
  operationId?: string;
  partId?: string;
  workCenterId?: string;
  affectedDocuments: {
    workInstructions: any[];
    setupSheets: any[];
    inspectionPlans: any[];
    sops: any[];
    toolDrawings: any[];
  };
  totalDocuments: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendations: string[];
}

export interface BulkUpdateInput {
  documentIds: string[];
  documentType: DocumentType;
  updates: any;
  updatedById: string;
}

export interface BulkUpdateResult {
  successful: string[];
  failed: { id: string; error: string }[];
  totalProcessed: number;
}

export interface CrossDocumentReference {
  sourceType: DocumentType;
  sourceId: string;
  targetType: DocumentType;
  targetId: string;
  relationshipType: 'PREREQUISITE' | 'REFERENCE' | 'SUPERSEDES' | 'RELATED';
  description?: string;
}

export class UnifiedDocumentService {
  private prisma: PrismaClient;
  private setupSheetService: SetupSheetService;
  private inspectionPlanService: InspectionPlanService;
  private sopService: SOPService;
  private toolDrawingService: ToolDrawingService;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.setupSheetService = new SetupSheetService(prisma);
    this.inspectionPlanService = new InspectionPlanService(prisma);
    this.sopService = new SOPService(prisma);
    this.toolDrawingService = new ToolDrawingService(prisma);
  }

  // ============================================================================
  // Unified Search Operations
  // ============================================================================

  /**
   * Search across all document types
   */
  async searchAllDocuments(
    filters: UnifiedSearchFilters,
    page: number = 1,
    limit: number = 50
  ): Promise<{ data: any[]; total: number; page: number; limit: number; breakdown: any }> {
    try {
      const searchPromises: Promise<any>[] = [];
      const documentTypes = filters.documentTypes || [
        'WORK_INSTRUCTION',
        'SETUP_SHEET',
        'INSPECTION_PLAN',
        'SOP',
        'TOOL_DRAWING'
      ];

      // Prepare search filters for each document type
      const baseFilters = {
        searchTerm: filters.searchTerm,
        status: filters.status,
        tags: filters.tags,
        categories: filters.categories,
        createdById: filters.createdById,
        approvedById: filters.approvedById,
        isActive: filters.isActive
      };

      // Search WorkInstructions
      if (documentTypes.includes('WORK_INSTRUCTION')) {
        searchPromises.push(
          this.searchWorkInstructions(baseFilters, page, limit)
        );
      }

      // Search SetupSheets
      if (documentTypes.includes('SETUP_SHEET')) {
        searchPromises.push(
          this.setupSheetService.getSetupSheets(baseFilters, page, limit)
            .then(result => ({ ...result, type: 'SETUP_SHEET' }))
        );
      }

      // Search InspectionPlans
      if (documentTypes.includes('INSPECTION_PLAN')) {
        searchPromises.push(
          this.inspectionPlanService.getInspectionPlans(baseFilters, page, limit)
            .then(result => ({ ...result, type: 'INSPECTION_PLAN' }))
        );
      }

      // Search SOPs
      if (documentTypes.includes('SOP')) {
        searchPromises.push(
          this.sopService.getSOPs(baseFilters, page, limit)
            .then(result => ({ ...result, type: 'SOP' }))
        );
      }

      // Search ToolDrawings
      if (documentTypes.includes('TOOL_DRAWING')) {
        searchPromises.push(
          this.toolDrawingService.getToolDrawings(baseFilters, page, limit)
            .then(result => ({ ...result, type: 'TOOL_DRAWING' }))
        );
      }

      const results = await Promise.all(searchPromises);

      // Combine and sort results
      const allDocuments: any[] = [];
      const breakdown: any = {};

      results.forEach(result => {
        const type = result.type || 'WORK_INSTRUCTION';
        breakdown[type] = {
          total: result.total,
          returned: result.data.length
        };

        // Add type information to each document
        result.data.forEach((doc: any) => {
          allDocuments.push({
            ...doc,
            documentType: type
          });
        });
      });

      // Sort by creation date (newest first)
      allDocuments.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Apply pagination to combined results
      const skip = (page - 1) * limit;
      const paginatedData = allDocuments.slice(skip, skip + limit);
      const totalDocuments = Object.values(breakdown).reduce((sum: number, b: any) => sum + b.total, 0);

      return {
        data: paginatedData,
        total: totalDocuments,
        page,
        limit,
        breakdown
      };

    } catch (error) {
      logger.error('Error searching all documents:', error);
      throw error;
    }
  }

  /**
   * Get all documents associated with an operation
   */
  async getDocumentsByOperation(operationId: string): Promise<DocumentCollection> {
    try {
      const [workInstructions, setupSheets, inspectionPlans, sops, toolDrawings] = await Promise.all([
        this.searchWorkInstructionsByOperation(operationId),
        this.setupSheetService.getSetupSheets({ operationId }, 1, 100),
        this.inspectionPlanService.getInspectionPlans({ operationId }, 1, 100),
        this.sopService.getSOPs({ searchTerm: operationId }, 1, 100), // SOPs don't have direct operation link
        this.toolDrawingService.getToolDrawings({ applicableOperation: operationId }, 1, 100)
      ]);

      return {
        workInstructions: workInstructions.data || [],
        setupSheets: setupSheets.data,
        inspectionPlans: inspectionPlans.data,
        sops: sops.data,
        toolDrawings: toolDrawings.data
      };

    } catch (error) {
      logger.error('Error getting documents by operation:', error);
      throw error;
    }
  }

  /**
   * Get all documents associated with a part
   */
  async getDocumentsByPart(partId: string): Promise<DocumentCollection> {
    try {
      const [workInstructions, setupSheets, inspectionPlans, sops, toolDrawings] = await Promise.all([
        this.searchWorkInstructionsByPart(partId),
        this.setupSheetService.getSetupSheets({ partId }, 1, 100),
        this.inspectionPlanService.getInspectionPlans({ partId }, 1, 100),
        this.sopService.getSOPs({ searchTerm: partId }, 1, 100), // SOPs don't have direct part link
        this.toolDrawingService.getToolDrawings({ applicablePartId: partId }, 1, 100)
      ]);

      return {
        workInstructions: workInstructions.data || [],
        setupSheets: setupSheets.data,
        inspectionPlans: inspectionPlans.data,
        sops: sops.data,
        toolDrawings: toolDrawings.data
      };

    } catch (error) {
      logger.error('Error getting documents by part:', error);
      throw error;
    }
  }

  // ============================================================================
  // Impact Analysis
  // ============================================================================

  /**
   * Analyze impact of changes to operation, part, or work center
   */
  async analyzeDocumentImpact(
    entityType: 'OPERATION' | 'PART' | 'WORK_CENTER',
    entityId: string
  ): Promise<ImpactAnalysisResult> {
    try {
      let affectedDocuments: DocumentCollection;

      switch (entityType) {
        case 'OPERATION':
          affectedDocuments = await this.getDocumentsByOperation(entityId);
          break;
        case 'PART':
          affectedDocuments = await this.getDocumentsByPart(entityId);
          break;
        case 'WORK_CENTER':
          affectedDocuments = await this.getDocumentsByWorkCenter(entityId);
          break;
        default:
          throw new Error(`Invalid entity type: ${entityType}`);
      }

      const totalDocuments = Object.values(affectedDocuments).reduce(
        (sum, docs) => sum + docs.length, 0
      );

      // Calculate risk level based on number and types of affected documents
      const riskLevel = this.calculateRiskLevel(affectedDocuments, totalDocuments);

      // Generate recommendations
      const recommendations = this.generateRecommendations(affectedDocuments, entityType);

      const result: ImpactAnalysisResult = {
        ...(entityType === 'OPERATION' && { operationId: entityId }),
        ...(entityType === 'PART' && { partId: entityId }),
        ...(entityType === 'WORK_CENTER' && { workCenterId: entityId }),
        affectedDocuments,
        totalDocuments,
        riskLevel,
        recommendations
      };

      logger.info('Document impact analysis completed', {
        entityType,
        entityId,
        totalDocuments,
        riskLevel
      });

      return result;

    } catch (error) {
      logger.error('Error analyzing document impact:', error);
      throw error;
    }
  }

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  /**
   * Bulk update documents of the same type
   */
  async bulkUpdateDocuments(input: BulkUpdateInput): Promise<BulkUpdateResult> {
    try {
      const result: BulkUpdateResult = {
        successful: [],
        failed: [],
        totalProcessed: input.documentIds.length
      };

      for (const documentId of input.documentIds) {
        try {
          switch (input.documentType) {
            case 'SETUP_SHEET':
              await this.setupSheetService.updateSetupSheet(
                documentId,
                input.updates,
                input.updatedById
              );
              break;
            case 'INSPECTION_PLAN':
              await this.inspectionPlanService.updateInspectionPlan(
                documentId,
                input.updates,
                input.updatedById
              );
              break;
            case 'SOP':
              await this.sopService.updateSOP(
                documentId,
                input.updates,
                input.updatedById
              );
              break;
            case 'TOOL_DRAWING':
              await this.toolDrawingService.updateToolDrawing(
                documentId,
                input.updates,
                input.updatedById
              );
              break;
            default:
              throw new Error(`Unsupported document type: ${input.documentType}`);
          }

          result.successful.push(documentId);

        } catch (error) {
          result.failed.push({
            id: documentId,
            error: error.message
          });
        }
      }

      logger.info('Bulk update completed', {
        documentType: input.documentType,
        totalProcessed: result.totalProcessed,
        successful: result.successful.length,
        failed: result.failed.length
      });

      return result;

    } catch (error) {
      logger.error('Error in bulk update:', error);
      throw error;
    }
  }

  // ============================================================================
  // Document Template Operations
  // ============================================================================

  /**
   * Create document template
   */
  async createDocumentTemplate(
    name: string,
    description: string,
    documentType: DocumentType,
    templateData: any,
    defaultValues: any,
    createdById: string,
    isPublic: boolean = false
  ): Promise<any> {
    try {
      const template = await this.prisma.documentTemplate.create({
        data: {
          name,
          description,
          documentType,
          templateData,
          defaultValues,
          isPublic,
          createdById,
          updatedById: createdById
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
      });

      logger.info('Document template created', {
        templateId: template.id,
        name,
        documentType,
        createdById
      });

      return template;

    } catch (error) {
      logger.error('Error creating document template:', error);
      throw error;
    }
  }

  /**
   * Get document templates by type
   */
  async getDocumentTemplates(
    documentType?: DocumentType,
    isPublic?: boolean,
    createdById?: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const where: any = { isActive: true };

    if (documentType) {
      where.documentType = documentType;
    }

    if (isPublic !== undefined) {
      where.isPublic = isPublic;
    }

    if (createdById) {
      where.OR = [
        { createdById },
        { isPublic: true }
      ];
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.documentTemplate.findMany({
        where,
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
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.documentTemplate.count({ where })
    ]);

    return {
      data,
      total,
      page,
      limit
    };
  }

  /**
   * Apply template to create new document
   */
  async applyTemplate(templateId: string, overrides: any, createdById: string): Promise<any> {
    try {
      const template = await this.prisma.documentTemplate.findUnique({
        where: { id: templateId }
      });

      if (!template) {
        throw new Error('Template not found');
      }

      // Merge template data with overrides
      const documentData = {
        ...template.defaultValues,
        ...template.templateData,
        ...overrides
      };

      // Create document based on type
      let result;
      switch (template.documentType) {
        case 'SETUP_SHEET':
          result = await this.setupSheetService.createSetupSheet(documentData, createdById);
          break;
        case 'INSPECTION_PLAN':
          result = await this.inspectionPlanService.createInspectionPlan(documentData, createdById);
          break;
        case 'SOP':
          result = await this.sopService.createSOP(documentData, createdById);
          break;
        case 'TOOL_DRAWING':
          result = await this.toolDrawingService.createToolDrawing(documentData, createdById);
          break;
        default:
          throw new Error(`Unsupported template type: ${template.documentType}`);
      }

      // Update template usage count
      await this.prisma.documentTemplate.update({
        where: { id: templateId },
        data: { usageCount: { increment: 1 } }
      });

      logger.info('Template applied successfully', {
        templateId,
        documentType: template.documentType,
        resultId: result.id,
        createdById
      });

      return result;

    } catch (error) {
      logger.error('Error applying template:', error);
      throw error;
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private async searchWorkInstructions(filters: any, page: number, limit: number): Promise<any> {
    // This would interface with the existing WorkInstructionService
    // For now, return empty structure
    return {
      data: [],
      total: 0,
      page,
      limit,
      type: 'WORK_INSTRUCTION'
    };
  }

  private async searchWorkInstructionsByOperation(operationId: string): Promise<any> {
    // This would interface with the existing WorkInstructionService
    return { data: [] };
  }

  private async searchWorkInstructionsByPart(partId: string): Promise<any> {
    // This would interface with the existing WorkInstructionService
    return { data: [] };
  }

  private async getDocumentsByWorkCenter(workCenterId: string): Promise<DocumentCollection> {
    const [setupSheets, toolDrawings] = await Promise.all([
      this.setupSheetService.getSetupSheets({ workCenterId }, 1, 100),
      this.toolDrawingService.getToolDrawings({ searchTerm: workCenterId }, 1, 100)
    ]);

    return {
      workInstructions: [],
      setupSheets: setupSheets.data,
      inspectionPlans: [],
      sops: [],
      toolDrawings: toolDrawings.data
    };
  }

  private calculateRiskLevel(
    affectedDocuments: DocumentCollection,
    totalDocuments: number
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    // Risk calculation based on number and criticality of affected documents
    if (totalDocuments === 0) return 'LOW';
    if (totalDocuments <= 2) return 'LOW';
    if (totalDocuments <= 5) return 'MEDIUM';
    if (totalDocuments <= 10) return 'HIGH';
    return 'CRITICAL';
  }

  private generateRecommendations(
    affectedDocuments: DocumentCollection,
    entityType: string
  ): string[] {
    const recommendations: string[] = [];

    const totalDocs = Object.values(affectedDocuments).reduce(
      (sum, docs) => sum + docs.length, 0
    );

    if (totalDocs > 0) {
      recommendations.push(`Review all ${totalDocs} affected document(s) before implementing changes`);
    }

    if (affectedDocuments.setupSheets.length > 0) {
      recommendations.push('Update setup procedures and verify equipment configurations');
    }

    if (affectedDocuments.inspectionPlans.length > 0) {
      recommendations.push('Review inspection criteria and measurement methods');
    }

    if (affectedDocuments.sops.length > 0) {
      recommendations.push('Conduct training sessions for affected Standard Operating Procedures');
    }

    if (affectedDocuments.toolDrawings.length > 0) {
      recommendations.push('Verify tool compatibility and update calibration schedules');
    }

    if (totalDocs > 5) {
      recommendations.push('Consider staging changes across multiple phases to reduce risk');
    }

    return recommendations;
  }
}