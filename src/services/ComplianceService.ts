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

  // ============================================================================
  // PHASE 2: AUDIT MANAGEMENT (ISO 9001 Clause 9.2)
  // ============================================================================

  /**
   * Create a new internal audit
   */
  async createAudit(input: {
    auditNumber: string;
    auditTitle: string;
    auditType: string;
    auditScope?: string;
    plannedDate: Date;
    leadAuditorId: string;
    auditeeId: string;
  }): Promise<any> {
    try {
      const audit = await prisma.internalAudit.create({
        data: {
          auditNumber: input.auditNumber,
          auditTitle: input.auditTitle,
          auditType: input.auditType as any,
          auditScope: input.auditScope,
          plannedDate: input.plannedDate,
          leadAuditorId: input.leadAuditorId,
          auditeeId: input.auditeeId,
          status: 'PLANNED',
        },
        include: {
          leadAuditor: true,
          auditee: true,
          findings: true,
        },
      });

      logger.info(`Created internal audit: ${audit.auditNumber} (${audit.auditTitle})`);
      return audit;
    } catch (error) {
      logger.error('Failed to create internal audit', error);
      throw error;
    }
  }

  /**
   * Get a specific audit with findings
   */
  async getAudit(id: string): Promise<any> {
    try {
      const audit = await prisma.internalAudit.findUnique({
        where: { id },
        include: {
          leadAuditor: true,
          auditee: true,
          findings: {
            include: {
              correctiveAction: true,
              verifiedBy: true,
            },
          },
          closedBy: true,
        },
      });

      return audit;
    } catch (error) {
      logger.error(`Failed to get audit ${id}`, error);
      throw error;
    }
  }

  /**
   * Get all audits with optional filtering
   */
  async getAudits(filters?: {
    status?: string;
    auditType?: string;
  }): Promise<any[]> {
    try {
      const audits = await prisma.internalAudit.findMany({
        where: {
          ...(filters?.status && { status: filters.status as any }),
          ...(filters?.auditType && { auditType: filters.auditType as any }),
        },
        orderBy: { plannedDate: 'desc' },
        include: {
          leadAuditor: true,
          auditee: true,
          findings: true,
        },
      });

      return audits;
    } catch (error) {
      logger.error('Failed to get audits', error);
      throw error;
    }
  }

  /**
   * Close an audit
   */
  async closeAudit(
    auditId: string,
    userId: string,
    reportUrl?: string,
    summary?: string
  ): Promise<any> {
    try {
      const audit = await prisma.internalAudit.update({
        where: { id: auditId },
        data: {
          status: 'CLOSED',
          closedById: userId,
          closedAt: new Date(),
          reportUrl,
          summary,
        },
        include: {
          findings: true,
          leadAuditor: true,
        },
      });

      logger.info(`Closed audit: ${audit.auditNumber}`);
      return audit;
    } catch (error) {
      logger.error(`Failed to close audit ${auditId}`, error);
      throw error;
    }
  }

  // ============================================================================
  // AUDIT FINDINGS (ISO 9001 Clause 9.2.2)
  // ============================================================================

  /**
   * Create an audit finding
   */
  async createFinding(input: {
    auditId: string;
    findingNumber: string;
    findingType: string;
    clause?: string;
    description: string;
    objectiveEvidence?: string;
    severity: string;
  }): Promise<any> {
    try {
      const finding = await prisma.auditFinding.create({
        data: {
          auditId: input.auditId,
          findingNumber: input.findingNumber,
          findingType: input.findingType as any,
          clause: input.clause,
          description: input.description,
          objectiveEvidence: input.objectiveEvidence,
          severity: input.severity as any,
          status: 'OPEN',
        },
        include: {
          audit: true,
          correctiveAction: true,
        },
      });

      logger.info(`Created audit finding: ${finding.findingNumber}`);
      return finding;
    } catch (error) {
      logger.error('Failed to create audit finding', error);
      throw error;
    }
  }

  /**
   * Get findings for an audit
   */
  async getAuditFindings(auditId: string): Promise<any[]> {
    try {
      const findings = await prisma.auditFinding.findMany({
        where: { auditId },
        include: {
          correctiveAction: true,
          verifiedBy: true,
        },
        orderBy: { severity: 'desc' },
      });

      return findings;
    } catch (error) {
      logger.error(`Failed to get audit findings for audit ${auditId}`, error);
      throw error;
    }
  }

  // ============================================================================
  // CORRECTIVE/PREVENTIVE ACTIONS (CAPA) (ISO 9001 Clause 10)
  // ============================================================================

  /**
   * Create a corrective action
   */
  async createCorrectiveAction(input: {
    caNumber: string;
    title: string;
    description?: string;
    source: string;
    sourceReference?: string;
    rootCauseMethod: string;
    rootCause?: string;
    correctiveAction?: string;
    preventiveAction?: string;
    assignedToId: string;
    targetDate: Date;
  }): Promise<any> {
    try {
      const action = await prisma.correctiveAction.create({
        data: {
          caNumber: input.caNumber,
          title: input.title,
          description: input.description,
          source: input.source as any,
          sourceReference: input.sourceReference,
          rootCauseMethod: input.rootCauseMethod as any,
          rootCause: input.rootCause,
          correctiveAction: input.correctiveAction,
          preventiveAction: input.preventiveAction,
          assignedToId: input.assignedToId,
          targetDate: input.targetDate,
          status: 'OPEN',
        },
        include: {
          assignedTo: true,
          verifiedBy: true,
        },
      });

      logger.info(`Created corrective action: ${action.caNumber}`);
      return action;
    } catch (error) {
      logger.error('Failed to create corrective action', error);
      throw error;
    }
  }

  /**
   * Get a corrective action
   */
  async getCorrectiveAction(id: string): Promise<any> {
    try {
      const action = await prisma.correctiveAction.findUnique({
        where: { id },
        include: {
          assignedTo: true,
          verifiedBy: true,
        },
      });

      return action;
    } catch (error) {
      logger.error(`Failed to get corrective action ${id}`, error);
      throw error;
    }
  }

  /**
   * Implement a corrective action
   */
  async implementAction(
    actionId: string,
    implementationDetails: {
      correctiveAction?: string;
      preventiveAction?: string;
    }
  ): Promise<any> {
    try {
      const action = await prisma.correctiveAction.update({
        where: { id: actionId },
        data: {
          status: 'IMPLEMENTED',
          implementedDate: new Date(),
          ...(implementationDetails.correctiveAction && {
            correctiveAction: implementationDetails.correctiveAction,
          }),
          ...(implementationDetails.preventiveAction && {
            preventiveAction: implementationDetails.preventiveAction,
          }),
        },
        include: {
          assignedTo: true,
        },
      });

      logger.info(`Implemented corrective action: ${action.caNumber}`);
      return action;
    } catch (error) {
      logger.error(`Failed to implement corrective action ${actionId}`, error);
      throw error;
    }
  }

  /**
   * Verify effectiveness of corrective action
   */
  async verifyAction(
    actionId: string,
    userId: string,
    isEffective: boolean
  ): Promise<any> {
    try {
      const action = await prisma.correctiveAction.update({
        where: { id: actionId },
        data: {
          status: isEffective ? 'EFFECTIVE' : 'OPEN',
          verifiedById: userId,
          verifiedAt: new Date(),
          isEffective,
        },
        include: {
          verifiedBy: true,
        },
      });

      logger.info(
        `Verified corrective action: ${action.caNumber} - Effective: ${isEffective}`
      );
      return action;
    } catch (error) {
      logger.error(`Failed to verify corrective action ${actionId}`, error);
      throw error;
    }
  }

  /**
   * Get all corrective actions due
   */
  async getActionsOverdue(): Promise<any[]> {
    try {
      const today = new Date();
      const actions = await prisma.correctiveAction.findMany({
        where: {
          status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] },
          targetDate: {
            lt: today,
          },
        },
        include: {
          assignedTo: true,
        },
        orderBy: { targetDate: 'asc' },
      });

      return actions;
    } catch (error) {
      logger.error('Failed to get overdue corrective actions', error);
      throw error;
    }
  }

  // ============================================================================
  // MANAGEMENT REVIEW (ISO 9001 Clause 9.3)
  // ============================================================================

  /**
   * Create a management review
   */
  async createManagementReview(input: {
    reviewNumber: string;
    reviewDate: Date;
    chairpersonId: string;
    inputsDiscussed?: string;
  }): Promise<any> {
    try {
      const review = await prisma.managementReview.create({
        data: {
          reviewNumber: input.reviewNumber,
          reviewDate: input.reviewDate,
          chairpersonId: input.chairpersonId,
          inputsDiscussed: input.inputsDiscussed,
          status: 'SCHEDULED',
        },
        include: {
          chairperson: true,
          actionItems: true,
        },
      });

      logger.info(`Created management review: ${review.reviewNumber}`);
      return review;
    } catch (error) {
      logger.error('Failed to create management review', error);
      throw error;
    }
  }

  /**
   * Get a management review
   */
  async getManagementReview(id: string): Promise<any> {
    try {
      const review = await prisma.managementReview.findUnique({
        where: { id },
        include: {
          chairperson: true,
          actionItems: {
            include: {
              assignedTo: true,
            },
          },
        },
      });

      return review;
    } catch (error) {
      logger.error(`Failed to get management review ${id}`, error);
      throw error;
    }
  }

  /**
   * Record management review completion
   */
  async completeManagementReview(
    reviewId: string,
    input: {
      decisions?: string;
      resourceNeeds?: string;
      minutesUrl?: string;
    }
  ): Promise<any> {
    try {
      const review = await prisma.managementReview.update({
        where: { id: reviewId },
        data: {
          status: 'COMPLETED',
          decisions: input.decisions,
          resourceNeeds: input.resourceNeeds,
          minutesUrl: input.minutesUrl,
        },
        include: {
          actionItems: true,
        },
      });

      logger.info(`Completed management review: ${review.reviewNumber}`);
      return review;
    } catch (error) {
      logger.error(`Failed to complete management review ${reviewId}`, error);
      throw error;
    }
  }

  /**
   * Add action item to management review
   */
  async addReviewAction(input: {
    reviewId: string;
    actionDescription: string;
    assignedToId: string;
    dueDate: Date;
  }): Promise<any> {
    try {
      const action = await prisma.managementReviewAction.create({
        data: {
          reviewId: input.reviewId,
          actionDescription: input.actionDescription,
          assignedToId: input.assignedToId,
          dueDate: input.dueDate,
          status: 'OPEN',
        },
        include: {
          assignedTo: true,
        },
      });

      logger.info(`Added management review action for review ${input.reviewId}`);
      return action;
    } catch (error) {
      logger.error('Failed to add management review action', error);
      throw error;
    }
  }

  /**
   * Close a review action
   */
  async closeReviewAction(actionId: string): Promise<any> {
    try {
      const action = await prisma.managementReviewAction.update({
        where: { id: actionId },
        data: {
          status: 'COMPLETED',
          completedDate: new Date(),
        },
      });

      return action;
    } catch (error) {
      logger.error(`Failed to close review action ${actionId}`, error);
      throw error;
    }
  }

  /**
   * Get open management review actions
   */
  async getOpenReviewActions(): Promise<any[]> {
    try {
      const actions = await prisma.managementReviewAction.findMany({
        where: {
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
        include: {
          assignedTo: true,
          review: true,
        },
        orderBy: { dueDate: 'asc' },
      });

      return actions;
    } catch (error) {
      logger.error('Failed to get open review actions', error);
      throw error;
    }
  }

  // ============================================================================
  // CHANGE MANAGEMENT (AS9100D Clause 8.5.6)
  // ============================================================================

  /**
   * Create a change request
   */
  async createChangeRequest(input: {
    changeNumber: string;
    title: string;
    description?: string;
    changeType: string;
    affectedParts?: string[];
    reason?: string;
    benefits?: string;
    risks?: string;
    impactAssessment?: string;
    customerNotificationRequired?: boolean;
    createdById: string;
  }): Promise<any> {
    try {
      const change = await prisma.changeRequest.create({
        data: {
          changeNumber: input.changeNumber,
          title: input.title,
          description: input.description,
          changeType: input.changeType as any,
          affectedParts: input.affectedParts || [],
          reason: input.reason,
          benefits: input.benefits,
          risks: input.risks,
          impactAssessment: input.impactAssessment,
          customerNotificationRequired: input.customerNotificationRequired ?? false,
          createdById: input.createdById,
          status: 'PROPOSED',
        },
        include: {
          createdBy: true,
          approvedBy: true,
        },
      });

      logger.info(`Created change request: ${change.changeNumber}`);
      return change;
    } catch (error) {
      logger.error('Failed to create change request', error);
      throw error;
    }
  }

  /**
   * Get a change request
   */
  async getChangeRequest(id: string): Promise<any> {
    try {
      const change = await prisma.changeRequest.findUnique({
        where: { id },
        include: {
          createdBy: true,
          approvedBy: true,
        },
      });

      return change;
    } catch (error) {
      logger.error(`Failed to get change request ${id}`, error);
      throw error;
    }
  }

  /**
   * Get all change requests with optional filtering
   */
  async getChangeRequests(filters?: {
    status?: string;
    changeType?: string;
  }): Promise<any[]> {
    try {
      const changes = await prisma.changeRequest.findMany({
        where: {
          ...(filters?.status && { status: filters.status as any }),
          ...(filters?.changeType && { changeType: filters.changeType as any }),
        },
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: true,
          approvedBy: true,
        },
      });

      return changes;
    } catch (error) {
      logger.error('Failed to get change requests', error);
      throw error;
    }
  }

  /**
   * Approve a change request
   */
  async approveChangeRequest(
    changeId: string,
    userId: string,
    implementationPlan?: string,
    implementationDate?: Date
  ): Promise<any> {
    try {
      const change = await prisma.changeRequest.update({
        where: { id: changeId },
        data: {
          status: 'APPROVED',
          approvedById: userId,
          approvedAt: new Date(),
          implementationPlan,
          implementationDate,
        },
        include: {
          approvedBy: true,
        },
      });

      logger.info(`Approved change request: ${change.changeNumber}`);
      return change;
    } catch (error) {
      logger.error(`Failed to approve change request ${changeId}`, error);
      throw error;
    }
  }

  /**
   * Implement a change request
   */
  async implementChangeRequest(changeId: string): Promise<any> {
    try {
      const change = await prisma.changeRequest.update({
        where: { id: changeId },
        data: {
          status: 'IMPLEMENTED',
          implementationDate: new Date(),
        },
      });

      logger.info(`Implemented change request: ${change.changeNumber}`);
      return change;
    } catch (error) {
      logger.error(`Failed to implement change request ${changeId}`, error);
      throw error;
    }
  }
}

export default new ComplianceService();
