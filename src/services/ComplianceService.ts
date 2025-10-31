import prisma from '../lib/database';
import { logger } from '../utils/logger';
import { ControlledDocument, TrainingCourse, TrainingRecord, QMSDocumentStatus, QMSDocumentType, CourseType } from '@prisma/client';

/**
 * QMS Compliance Service (Issue #102)
 *
 * Manages Quality Management System compliance including:
 * - Document control and approval workflows
 * - Training course management
 * - Training record tracking and competency assessments
 * - Training expiration monitoring
 */

export interface CreateDocumentInput {
  documentNumber: string;
  title: string;
  description?: string;
  documentType: QMSDocumentType;
  category?: string;
  fileUrl: string;
  fileName: string;
  reviewFrequency?: number;
  isControlled?: boolean;
  createdBy: string;
}

export interface UpdateDocumentInput {
  title?: string;
  description?: string;
  status?: QMSDocumentStatus;
  reviewFrequency?: number;
  lastReviewDate?: Date;
  updatedBy: string;
}

export interface CreateTrainingCourseInput {
  courseNumber: string;
  courseName: string;
  description?: string;
  courseType: CourseType;
  duration?: number;
  objectives?: string;
  materials?: string;
  requiredForRoles?: string[];
  createdBy: string;
}

export interface CreateTrainingRecordInput {
  trainingCourseId: string;
  traineeId: string;
  trainingDate: Date;
  instructorId?: string;
  testScore?: number;
  passed?: boolean;
  certificateUrl?: string;
  notes?: string;
}

export class ComplianceService {
  /**
   * Create a new controlled document
   */
  async createDocument(input: CreateDocumentInput): Promise<ControlledDocument> {
    try {
      // Check for duplicate document number
      const existing = await prisma.controlledDocument.findMany({
        where: { documentNumber: input.documentNumber },
        take: 1,
      });
      if (existing.length > 0) {
        throw new Error(`Document number ${input.documentNumber} already exists`);
      }

      const document = await prisma.controlledDocument.create({
        data: {
          documentNumber: input.documentNumber,
          title: input.title,
          description: input.description,
          documentType: input.documentType,
          category: input.category,
          fileUrl: input.fileUrl,
          fileName: input.fileName,
          reviewFrequency: input.reviewFrequency,
          isControlled: input.isControlled ?? true,
          status: 'DRAFT',
          createdById: input.createdBy,
          nextReviewDate: input.reviewFrequency
            ? new Date(Date.now() + input.reviewFrequency * 30 * 24 * 60 * 60 * 1000)
            : undefined,
        },
        include: {
          approvals: true,
          approvedBy: true,
        },
      });

      logger.info(`Created controlled document: ${document.documentNumber} (${document.title})`);
      return document;
    } catch (error) {
      logger.error('Failed to create controlled document', error);
      throw error;
    }
  }

  /**
   * Get a specific document
   */
  async getDocument(id: string): Promise<ControlledDocument | null> {
    try {
      const document = await prisma.controlledDocument.findUnique({
        where: { id },
        include: {
          approvals: {
            include: {
              approver: true,
            },
          },
          approvedBy: true,
          parentDocument: true,
          childRevisions: true,
        },
      });

      return document;
    } catch (error) {
      logger.error(`Failed to get document ${id}`, error);
      throw error;
    }
  }

  /**
   * Get all documents with filtering
   */
  async getDocuments(filters?: {
    documentType?: QMSDocumentType;
    status?: QMSDocumentStatus;
    isControlled?: boolean;
  }): Promise<ControlledDocument[]> {
    try {
      const documents = await prisma.controlledDocument.findMany({
        where: {
          ...(filters?.documentType && { documentType: filters.documentType }),
          ...(filters?.status && { status: filters.status }),
          ...(filters?.isControlled !== undefined && { isControlled: filters.isControlled }),
        },
        orderBy: [{ status: 'asc' }, { documentNumber: 'asc' }],
        include: {
          approvedBy: true,
        },
      });

      return documents;
    } catch (error) {
      logger.error('Failed to get documents', error);
      throw error;
    }
  }

  /**
   * Update a document
   */
  async updateDocument(id: string, input: UpdateDocumentInput): Promise<ControlledDocument> {
    try {
      const existing = await this.getDocument(id);
      if (!existing) {
        throw new Error(`Document ${id} not found`);
      }

      const document = await prisma.controlledDocument.update({
        where: { id },
        data: {
          ...(input.title && { title: input.title }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.status && { status: input.status }),
          ...(input.reviewFrequency && { reviewFrequency: input.reviewFrequency }),
          ...(input.lastReviewDate && { lastReviewDate: input.lastReviewDate }),
          updatedAt: new Date(),
        },
        include: {
          approvals: true,
          approvedBy: true,
        },
      });

      logger.info(`Updated document: ${document.documentNumber}`);
      return document;
    } catch (error) {
      logger.error(`Failed to update document ${id}`, error);
      throw error;
    }
  }

  /**
   * Request document approval
   */
  async requestApproval(
    documentId: string,
    approverRole: string,
    approverId: string,
    sequence: number
  ): Promise<any> {
    try {
      const document = await this.getDocument(documentId);
      if (!document) {
        throw new Error(`Document ${documentId} not found`);
      }

      const approval = await prisma.documentApproval.create({
        data: {
          documentId,
          approverRole,
          approverId,
          sequence,
          status: 'PENDING',
        },
        include: {
          approver: true,
        },
      });

      // Update document status to IN_REVIEW
      await prisma.controlledDocument.update({
        where: { id: documentId },
        data: { status: 'IN_REVIEW' },
      });

      logger.info(`Requested approval for document ${documentId} from role ${approverRole}`);
      return approval;
    } catch (error) {
      logger.error(`Failed to request approval for document ${documentId}`, error);
      throw error;
    }
  }

  /**
   * Approve a document
   */
  async approveDocument(approvalId: string, userId: string, comments?: string): Promise<any> {
    try {
      const approval = await prisma.documentApproval.update({
        where: { id: approvalId },
        data: {
          status: 'APPROVED',
          reviewedAt: new Date(),
          comments,
        },
        include: {
          document: true,
          approver: true,
        },
      });

      // Check if all approvals are complete
      const document = approval.document;
      const allApprovals = await prisma.documentApproval.findMany({
        where: { documentId: document.id },
      });

      const allApproved = allApprovals.every((a) => a.status === 'APPROVED');
      if (allApproved) {
        await prisma.controlledDocument.update({
          where: { id: document.id },
          data: {
            status: 'APPROVED',
            approvedById: userId,
            approvedAt: new Date(),
            effectiveDate: new Date(),
          },
        });
        logger.info(`Document ${document.documentNumber} fully approved`);
      }

      return approval;
    } catch (error) {
      logger.error(`Failed to approve document`, error);
      throw error;
    }
  }

  /**
   * Create a new training course
   */
  async createCourse(input: CreateTrainingCourseInput): Promise<TrainingCourse> {
    try {
      // Check for duplicate course number
      const existing = await prisma.trainingCourse.findMany({
        where: { courseNumber: input.courseNumber },
        take: 1,
      });
      if (existing.length > 0) {
        throw new Error(`Course number ${input.courseNumber} already exists`);
      }

      const course = await prisma.trainingCourse.create({
        data: {
          courseNumber: input.courseNumber,
          courseName: input.courseName,
          description: input.description,
          courseType: input.courseType,
          duration: input.duration,
          objectives: input.objectives,
          materials: input.materials,
          requiredForRoles: input.requiredForRoles || [],
          createdById: input.createdBy,
          isActive: true,
        },
        include: {
          trainingRecords: true,
          competencyTest: true,
        },
      });

      logger.info(`Created training course: ${course.courseNumber} (${course.courseName})`);
      return course;
    } catch (error) {
      logger.error('Failed to create training course', error);
      throw error;
    }
  }

  /**
   * Get a training course with all details
   */
  async getCourse(id: string): Promise<TrainingCourse | null> {
    try {
      const course = await prisma.trainingCourse.findUnique({
        where: { id },
        include: {
          trainingRecords: {
            include: {
              trainee: true,
              instructor: true,
            },
          },
          competencyTest: {
            include: {
              questions: true,
            },
          },
        },
      });

      return course;
    } catch (error) {
      logger.error(`Failed to get course ${id}`, error);
      throw error;
    }
  }

  /**
   * Get all training courses
   */
  async getCourses(isActive?: boolean): Promise<TrainingCourse[]> {
    try {
      const courses = await prisma.trainingCourse.findMany({
        where: {
          ...(isActive !== undefined && { isActive }),
        },
        orderBy: { courseNumber: 'asc' },
        include: {
          trainingRecords: true,
        },
      });

      return courses;
    } catch (error) {
      logger.error('Failed to get courses', error);
      throw error;
    }
  }

  /**
   * Record a training completion
   */
  async recordTraining(input: CreateTrainingRecordInput): Promise<TrainingRecord> {
    try {
      const course = await this.getCourse(input.trainingCourseId);
      if (!course) {
        throw new Error(`Course ${input.trainingCourseId} not found`);
      }

      // Check if trainee exists
      const trainee = await prisma.user.findUnique({
        where: { id: input.traineeId },
      });
      if (!trainee) {
        throw new Error(`Trainee ${input.traineeId} not found`);
      }

      let expirationDate: Date | undefined;
      if (input.passed && course.courseType === 'CERTIFICATION') {
        // Assume 1-year expiration for certifications
        expirationDate = new Date(input.trainingDate);
        expirationDate.setFullYear(expirationDate.getFullYear() + 1);
      }

      const record = await prisma.trainingRecord.create({
        data: {
          trainingCourseId: input.trainingCourseId,
          traineeId: input.traineeId,
          trainingDate: input.trainingDate,
          instructorId: input.instructorId,
          testScore: input.testScore,
          passed: input.passed,
          certificationDate: input.passed ? new Date() : undefined,
          expirationDate,
          certificateUrl: input.certificateUrl,
          notes: input.notes,
        },
        include: {
          trainingCourse: true,
          trainee: true,
        },
      });

      logger.info(
        `Recorded training for ${trainee.username} in course ${course.courseNumber}`
      );
      return record;
    } catch (error) {
      logger.error('Failed to record training', error);
      throw error;
    }
  }

  /**
   * Get training records for a user
   */
  async getUserTrainingRecords(userId: string): Promise<TrainingRecord[]> {
    try {
      const records = await prisma.trainingRecord.findMany({
        where: { traineeId: userId },
        orderBy: { trainingDate: 'desc' },
        include: {
          trainingCourse: true,
          instructor: true,
        },
      });

      return records;
    } catch (error) {
      logger.error(`Failed to get training records for user ${userId}`, error);
      throw error;
    }
  }

  /**
   * Get expiring certifications
   */
  async getExpiringCertifications(daysUntilExpiry: number = 30): Promise<TrainingRecord[]> {
    try {
      const today = new Date();
      const expiryDate = new Date(today);
      expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry);

      const records = await prisma.trainingRecord.findMany({
        where: {
          expirationDate: {
            gte: today,
            lte: expiryDate,
          },
          passed: true,
        },
        orderBy: { expirationDate: 'asc' },
        include: {
          trainee: true,
          trainingCourse: true,
        },
      });

      return records;
    } catch (error) {
      logger.error('Failed to get expiring certifications', error);
      throw error;
    }
  }

  /**
   * Get documents due for review
   */
  async getDocumentsDueForReview(): Promise<ControlledDocument[]> {
    try {
      const today = new Date();
      const documents = await prisma.controlledDocument.findMany({
        where: {
          status: { in: ['ACTIVE', 'APPROVED'] },
          nextReviewDate: {
            lte: today,
          },
        },
        orderBy: { nextReviewDate: 'asc' },
        include: {
          approvedBy: true,
        },
      });

      return documents;
    } catch (error) {
      logger.error('Failed to get documents due for review', error);
      throw error;
    }
  }

  /**
   * Get compliance statistics
   */
  async getComplianceStats(): Promise<{
    totalDocuments: number;
    activeDocuments: number;
    draftDocuments: number;
    documentsAwaitingApproval: number;
    totalCourses: number;
    activeCourses: number;
    totalTrainingRecords: number;
    certificationExpiringIn30Days: number;
    documentsDueForReview: number;
  }> {
    try {
      const [
        totalDocuments,
        activeDocuments,
        draftDocuments,
        documentsAwaitingApproval,
        totalCourses,
        activeCourses,
        totalTrainingRecords,
        certificationExpiringIn30Days,
        documentsDueForReview,
      ] = await Promise.all([
        prisma.controlledDocument.count(),
        prisma.controlledDocument.count({ where: { status: 'ACTIVE' } }),
        prisma.controlledDocument.count({ where: { status: 'DRAFT' } }),
        prisma.controlledDocument.count({ where: { status: 'IN_REVIEW' } }),
        prisma.trainingCourse.count(),
        prisma.trainingCourse.count({ where: { isActive: true } }),
        prisma.trainingRecord.count(),
        (await this.getExpiringCertifications(30)).length,
        (await this.getDocumentsDueForReview()).length,
      ]);

      return {
        totalDocuments,
        activeDocuments,
        draftDocuments,
        documentsAwaitingApproval,
        totalCourses,
        activeCourses,
        totalTrainingRecords,
        certificationExpiringIn30Days,
        documentsDueForReview,
      };
    } catch (error) {
      logger.error('Failed to get compliance statistics', error);
      throw error;
    }
  }
}

export default new ComplianceService();
