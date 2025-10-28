/**
 * ✅ GITHUB ISSUE #23: SOPService
 *
 * Service for managing Standard Operating Procedure (SOP) documents - safety procedures,
 * quality procedures, and general operational guidelines with acknowledgments and audit tracking.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// Import enums from Prisma
import type { SOPType } from '@prisma/client';

// Types for SOP operations
export interface SOPCreateInput {
  title: string;
  description?: string;
  sopType: SOPType;
  scope: string;
  applicability?: string;
  responsibleRoles?: string[];
  references?: any;
  safetyWarnings?: string[];
  requiredPPE?: string[];
  emergencyProcedure?: string;
  trainingRequired?: boolean;
  trainingFrequency?: string;
  reviewFrequency?: string;
  nextReviewDate?: Date;
  imageUrls?: string[];
  videoUrls?: string[];
  attachmentUrls?: string[];
  tags?: string[];
  categories?: string[];
  keywords?: string[];
  thumbnailUrl?: string;
  steps?: SOPStepCreateInput[];
}

export interface SOPStepCreateInput {
  stepNumber: number;
  title: string;
  instructions: string;
  isWarning?: boolean;
  isCritical?: boolean;
  imageUrls?: string[];
  videoUrls?: string[];
}

export interface SOPUpdateInput {
  title?: string;
  description?: string;
  sopType?: SOPType;
  scope?: string;
  applicability?: string;
  responsibleRoles?: string[];
  references?: any;
  safetyWarnings?: string[];
  requiredPPE?: string[];
  emergencyProcedure?: string;
  trainingRequired?: boolean;
  trainingFrequency?: string;
  reviewFrequency?: string;
  nextReviewDate?: Date;
  imageUrls?: string[];
  videoUrls?: string[];
  attachmentUrls?: string[];
  tags?: string[];
  categories?: string[];
  keywords?: string[];
  thumbnailUrl?: string;
}

export interface SOPFilters {
  status?: string[];
  sopType?: SOPType[];
  searchTerm?: string;
  tags?: string[];
  categories?: string[];
  responsibleRoles?: string[];
  createdById?: string;
  approvedById?: string;
  isActive?: boolean;
  trainingRequired?: boolean;
  nextReviewDue?: boolean;
}

export interface SOPAcknowledgmentInput {
  userId: string;
  userName: string;
  trainingCompletedAt?: Date;
  assessmentScore?: number;
  assessmentPassed?: boolean;
  signatureId?: string;
}

export interface SOPAuditInput {
  auditDate: Date;
  auditorId: string;
  auditorName: string;
  complianceChecks: any;
  overallCompliance: boolean;
  findingsCount?: number;
  findings?: string;
  correctiveActions?: any;
}

export class SOPService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // ============================================================================
  // SOP CRUD Operations
  // ============================================================================

  /**
   * Create a new SOP
   */
  async createSOP(
    input: SOPCreateInput,
    createdById: string
  ): Promise<any> {
    try {
      // Validate required fields
      if (!input.title?.trim()) {
        throw new Error('SOP title is required');
      }

      if (!input.sopType) {
        throw new Error('SOP type is required');
      }

      if (!input.scope?.trim()) {
        throw new Error('SOP scope is required');
      }

      // Generate document number
      const documentNumber = await this.generateDocumentNumber();

      // Create SOP with related data
      const sop = await this.prisma.standardOperatingProcedure.create({
        data: {
          documentNumber,
          title: input.title.trim(),
          description: input.description?.trim(),
          sopType: input.sopType,
          scope: input.scope.trim(),
          applicability: input.applicability?.trim(),
          responsibleRoles: input.responsibleRoles || [],
          references: input.references,
          safetyWarnings: input.safetyWarnings || [],
          requiredPPE: input.requiredPPE || [],
          emergencyProcedure: input.emergencyProcedure?.trim(),
          trainingRequired: input.trainingRequired || false,
          trainingFrequency: input.trainingFrequency,
          reviewFrequency: input.reviewFrequency,
          nextReviewDate: input.nextReviewDate,
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
              isWarning: step.isWarning || false,
              isCritical: step.isCritical || false,
              imageUrls: step.imageUrls || [],
              videoUrls: step.videoUrls || []
            }))
          } : undefined
        },
        include: this.getDefaultInclude()
      });

      logger.info('SOP created successfully', {
        sopId: sop.id,
        documentNumber: sop.documentNumber,
        createdById
      });

      return sop;

    } catch (error) {
      logger.error('Error creating SOP:', error);
      throw error;
    }
  }

  /**
   * Get SOP by ID
   */
  async getSOPById(id: string): Promise<any> {
    const sop = await this.prisma.standardOperatingProcedure.findUnique({
      where: { id },
      include: this.getDefaultInclude()
    });

    if (!sop) {
      throw new Error('SOP not found');
    }

    return sop;
  }

  /**
   * Get SOP by document number
   */
  async getSOPByDocumentNumber(documentNumber: string): Promise<any> {
    const sop = await this.prisma.standardOperatingProcedure.findUnique({
      where: { documentNumber },
      include: this.getDefaultInclude()
    });

    if (!sop) {
      throw new Error('SOP not found');
    }

    return sop;
  }

  /**
   * Get SOPs with filtering and pagination
   */
  async getSOPs(
    filters: SOPFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const where = this.buildWhereClause(filters);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.standardOperatingProcedure.findMany({
        where,
        include: this.getDefaultInclude(),
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.standardOperatingProcedure.count({ where })
    ]);

    return {
      data,
      total,
      page,
      limit
    };
  }

  /**
   * Update SOP
   */
  async updateSOP(
    id: string,
    input: SOPUpdateInput,
    updatedById: string
  ): Promise<any> {
    try {
      // Check if SOP exists
      const existingSOP = await this.prisma.standardOperatingProcedure.findUnique({
        where: { id }
      });

      if (!existingSOP) {
        throw new Error('SOP not found');
      }

      // Update SOP
      const updatedSOP = await this.prisma.standardOperatingProcedure.update({
        where: { id },
        data: {
          ...input,
          updatedById,
          updatedAt: new Date()
        },
        include: this.getDefaultInclude()
      });

      logger.info('SOP updated successfully', {
        sopId: id,
        updatedById
      });

      return updatedSOP;

    } catch (error) {
      logger.error('Error updating SOP:', error);
      throw error;
    }
  }

  /**
   * Delete SOP (soft delete by setting isActive = false)
   */
  async deleteSOP(id: string, deletedById: string): Promise<void> {
    try {
      await this.prisma.standardOperatingProcedure.update({
        where: { id },
        data: {
          isActive: false,
          updatedById: deletedById,
          updatedAt: new Date()
        }
      });

      logger.info('SOP deleted successfully', {
        sopId: id,
        deletedById
      });

    } catch (error) {
      logger.error('Error deleting SOP:', error);
      throw error;
    }
  }

  // ============================================================================
  // SOP Step Management
  // ============================================================================

  /**
   * Add step to SOP
   */
  async addSOPStep(
    sopId: string,
    stepInput: SOPStepCreateInput
  ): Promise<any> {
    try {
      const step = await this.prisma.sOPStep.create({
        data: {
          sopId,
          stepNumber: stepInput.stepNumber,
          title: stepInput.title,
          instructions: stepInput.instructions,
          isWarning: stepInput.isWarning || false,
          isCritical: stepInput.isCritical || false,
          imageUrls: stepInput.imageUrls || [],
          videoUrls: stepInput.videoUrls || []
        }
      });

      logger.info('SOP step added successfully', {
        sopId,
        stepId: step.id
      });

      return step;

    } catch (error) {
      logger.error('Error adding SOP step:', error);
      throw error;
    }
  }

  /**
   * Update SOP step
   */
  async updateSOPStep(
    stepId: string,
    stepInput: Partial<SOPStepCreateInput>
  ): Promise<any> {
    try {
      const updatedStep = await this.prisma.sOPStep.update({
        where: { id: stepId },
        data: stepInput
      });

      logger.info('SOP step updated successfully', { stepId });

      return updatedStep;

    } catch (error) {
      logger.error('Error updating SOP step:', error);
      throw error;
    }
  }

  /**
   * Delete SOP step
   */
  async deleteSOPStep(stepId: string): Promise<void> {
    try {
      await this.prisma.sOPStep.delete({
        where: { id: stepId }
      });

      logger.info('SOP step deleted successfully', { stepId });

    } catch (error) {
      logger.error('Error deleting SOP step:', error);
      throw error;
    }
  }

  // ============================================================================
  // SOP Acknowledgment Management
  // ============================================================================

  /**
   * Create SOP acknowledgment (user acknowledges reading/training)
   */
  async createSOPAcknowledgment(
    sopId: string,
    input: SOPAcknowledgmentInput
  ): Promise<any> {
    try {
      const acknowledgment = await this.prisma.sOPAcknowledgment.create({
        data: {
          sopId,
          userId: input.userId,
          userName: input.userName,
          trainingCompletedAt: input.trainingCompletedAt,
          assessmentScore: input.assessmentScore,
          assessmentPassed: input.assessmentPassed,
          signatureId: input.signatureId
        },
        include: {
          sop: {
            select: {
              id: true,
              documentNumber: true,
              title: true
            }
          },
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      logger.info('SOP acknowledgment created', {
        sopId,
        userId: input.userId,
        acknowledgedAt: acknowledgment.acknowledgedAt
      });

      return acknowledgment;

    } catch (error) {
      logger.error('Error creating SOP acknowledgment:', error);
      throw error;
    }
  }

  /**
   * Get SOP acknowledgments
   */
  async getSOPAcknowledgments(
    sopId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.sOPAcknowledgment.findMany({
        where: { sopId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { acknowledgedAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.sOPAcknowledgment.count({
        where: { sopId }
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
   * Check if user has acknowledged SOP
   */
  async hasUserAcknowledgedSOP(sopId: string, userId: string): Promise<boolean> {
    const acknowledgment = await this.prisma.sOPAcknowledgment.findUnique({
      where: {
        sopId_userId: {
          sopId,
          userId
        }
      }
    });

    return !!acknowledgment;
  }

  // ============================================================================
  // SOP Audit Management
  // ============================================================================

  /**
   * Create SOP audit
   */
  async createSOPAudit(
    sopId: string,
    input: SOPAuditInput
  ): Promise<any> {
    try {
      const audit = await this.prisma.sOPAudit.create({
        data: {
          sopId,
          auditDate: input.auditDate,
          auditorId: input.auditorId,
          auditorName: input.auditorName,
          complianceChecks: input.complianceChecks,
          overallCompliance: input.overallCompliance,
          findingsCount: input.findingsCount || 0,
          findings: input.findings,
          correctiveActions: input.correctiveActions
        },
        include: {
          sop: {
            select: {
              id: true,
              documentNumber: true,
              title: true
            }
          },
          auditor: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      logger.info('SOP audit created', {
        sopId,
        auditId: audit.id,
        auditorId: input.auditorId,
        overallCompliance: input.overallCompliance
      });

      return audit;

    } catch (error) {
      logger.error('Error creating SOP audit:', error);
      throw error;
    }
  }

  /**
   * Get SOP audits
   */
  async getSOPAudits(
    sopId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.sOPAudit.findMany({
        where: { sopId },
        include: {
          auditor: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { auditDate: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.sOPAudit.count({
        where: { sopId }
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
  // Review Management
  // ============================================================================

  /**
   * Get SOPs due for review
   */
  async getSOPsDueForReview(): Promise<any[]> {
    const today = new Date();

    return this.prisma.standardOperatingProcedure.findMany({
      where: {
        isActive: true,
        nextReviewDate: {
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
      orderBy: { nextReviewDate: 'asc' }
    });
  }

  /**
   * Update next review date
   */
  async updateNextReviewDate(
    sopId: string,
    nextReviewDate: Date,
    updatedById: string
  ): Promise<any> {
    try {
      const updatedSOP = await this.prisma.standardOperatingProcedure.update({
        where: { id: sopId },
        data: {
          nextReviewDate,
          updatedById,
          updatedAt: new Date()
        },
        include: this.getDefaultInclude()
      });

      logger.info('SOP review date updated', {
        sopId,
        nextReviewDate,
        updatedById
      });

      return updatedSOP;

    } catch (error) {
      logger.error('Error updating SOP review date:', error);
      throw error;
    }
  }

  // ============================================================================
  // Version Control
  // ============================================================================

  /**
   * Create new version of SOP
   */
  async createVersion(
    sopId: string,
    input: SOPCreateInput,
    createdById: string
  ): Promise<any> {
    try {
      // Get current SOP
      const currentSOP = await this.getSOPById(sopId);

      // Create new version
      const newVersion = await this.createSOP({
        ...input,
        title: input.title || currentSOP.title,
        sopType: input.sopType || currentSOP.sopType,
        scope: input.scope || currentSOP.scope
      }, createdById);

      // Link versions
      await this.prisma.standardOperatingProcedure.update({
        where: { id: newVersion.id },
        data: {
          parentVersionId: sopId,
          version: this.incrementVersion(currentSOP.version)
        }
      });

      logger.info('SOP version created', {
        originalId: sopId,
        newVersionId: newVersion.id
      });

      return newVersion;

    } catch (error) {
      logger.error('Error creating SOP version:', error);
      throw error;
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private async generateDocumentNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = 'SOP';

    // Find the latest document number for this year
    const latestSOP = await this.prisma.standardOperatingProcedure.findFirst({
      where: {
        documentNumber: {
          startsWith: `${prefix}-${year}-`
        }
      },
      orderBy: { documentNumber: 'desc' }
    });

    let sequence = 1;
    if (latestSOP) {
      const match = latestSOP.documentNumber.match(/-(\d+)$/);
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
      acknowledgments: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { acknowledgedAt: 'desc' },
        take: 10 // Limit recent acknowledgments
      },
      audits: {
        include: {
          auditor: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { auditDate: 'desc' },
        take: 5 // Limit recent audits
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

  private buildWhereClause(filters: SOPFilters): any {
    const where: any = {};

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    } else {
      where.isActive = true; // Default to active only
    }

    if (filters.status?.length) {
      where.status = { in: filters.status };
    }

    if (filters.sopType?.length) {
      where.sopType = { in: filters.sopType };
    }

    if (filters.createdById) {
      where.createdById = filters.createdById;
    }

    if (filters.approvedById) {
      where.approvedById = filters.approvedById;
    }

    if (filters.trainingRequired !== undefined) {
      where.trainingRequired = filters.trainingRequired;
    }

    if (filters.nextReviewDue) {
      where.nextReviewDate = { lte: new Date() };
    }

    if (filters.responsibleRoles?.length) {
      where.responsibleRoles = { hasSome: filters.responsibleRoles };
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
        { scope: { contains: filters.searchTerm, mode: 'insensitive' } },
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