import { PrismaClient, ReviewAssignment, ReviewType, ReviewStatus, ReviewRecommendation } from '@prisma/client';
import logger from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
// ✅ GITHUB ISSUE #147: Core Unified Workflow Engine Integration
import { UnifiedApprovalIntegration } from './UnifiedApprovalIntegration';

/**
 * TypeScript interfaces for Review Operations
 */
export interface ReviewAssignmentInput {
  documentType: string;
  documentId: string;
  documentVersion: string;
  reviewerId: string;
  reviewerName: string;
  assignedById: string;
  assignedByName: string;
  reviewType: ReviewType;
  instructions?: string;
  focusAreas?: string[];
  isRequired?: boolean;
  deadline?: Date;
  checklistItems?: any[];
}

export interface ReviewOutcome {
  recommendation: ReviewRecommendation;
  summary?: string;
  timeSpent?: number; // minutes
  signatureId?: string;
}

export interface ReviewFilters {
  status?: ReviewStatus;
  reviewType?: ReviewType;
  isRequired?: boolean;
  overdue?: boolean;
  assignedAfter?: Date;
  deadline?: Date;
  limit?: number;
  offset?: number;
}

export interface ReviewChecklistItem {
  id: string;
  title: string;
  description?: string;
  isRequired: boolean;
  isCompleted: boolean;
  notes?: string;
  completedAt?: Date;
}

export interface ReviewProgress {
  assignment: ReviewAssignment;
  checklistProgress: {
    total: number;
    completed: number;
    percentage: number;
  };
  timeSpent: number;
  commentsAdded: number;
  annotationsAdded: number;
}

/**
 * Review Service - Manages document review assignments and workflow
 */
export class ReviewService {
  private prisma: PrismaClient;
  // ✅ GITHUB ISSUE #147: Core Unified Workflow Engine Integration
  private unifiedApprovalService: UnifiedApprovalIntegration;

  constructor(prisma?: PrismaClient) {
    // Use provided prisma instance or create a new one
    this.prisma = prisma || new PrismaClient({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
    });
    this.unifiedApprovalService = new UnifiedApprovalIntegration(this.prisma);

    // Log Prisma events
    this.prisma.$on('query', (e) => {
      logger.debug('Prisma Query', { query: e.query, params: e.params, duration: e.duration });
    });

    this.prisma.$on('error', (e) => {
      logger.error('Prisma Error', { error: e.message, target: e.target });
    });
  }

  /**
   * Assign a review to a user
   */
  async assignReview(input: ReviewAssignmentInput): Promise<ReviewAssignment> {
    try {
      logger.info('Assigning review', {
        documentType: input.documentType,
        documentId: input.documentId,
        reviewerId: input.reviewerId,
        assignedById: input.assignedById
      });

      // Check if review already exists for this user and document
      const existingReview = await this.prisma.reviewAssignment.findUnique({
        where: {
          documentType_documentId_reviewerId: {
            documentType: input.documentType,
            documentId: input.documentId,
            reviewerId: input.reviewerId
          }
        }
      });

      if (existingReview) {
        throw new AppError('Review already assigned to this user for this document', 409, 'REVIEW_ALREADY_EXISTS');
      }

      const assignment = await this.prisma.reviewAssignment.create({
        data: {
          documentType: input.documentType,
          documentId: input.documentId,
          documentVersion: input.documentVersion,
          reviewerId: input.reviewerId,
          reviewerName: input.reviewerName,
          assignedById: input.assignedById,
          assignedByName: input.assignedByName,
          reviewType: input.reviewType,
          instructions: input.instructions,
          focusAreas: input.focusAreas || [],
          isRequired: input.isRequired !== undefined ? input.isRequired : true,
          deadline: input.deadline,
          checklistItems: input.checklistItems,
        }
      });

      logger.info('Review assigned successfully', { assignmentId: assignment.id });
      return assignment;
    } catch (error: any) {
      logger.error('Failed to assign review', { error: error.message, input });
      throw new AppError('Failed to assign review', 500, 'REVIEW_ASSIGN_FAILED', error);
    }
  }

  /**
   * Start a review (mark as in progress)
   */
  async startReview(assignmentId: string, userId: string): Promise<ReviewAssignment> {
    try {
      logger.info('Starting review', { assignmentId, userId });

      // Verify the assignment exists and belongs to the user
      const assignment = await this.prisma.reviewAssignment.findUnique({
        where: { id: assignmentId }
      });

      if (!assignment) {
        throw new AppError('Review assignment not found', 404, 'ASSIGNMENT_NOT_FOUND');
      }

      if (assignment.reviewerId !== userId) {
        throw new AppError('Not authorized to start this review', 403, 'UNAUTHORIZED');
      }

      if (assignment.status !== ReviewStatus.NOT_STARTED) {
        throw new AppError('Review already started or completed', 409, 'REVIEW_ALREADY_STARTED');
      }

      const updatedAssignment = await this.prisma.reviewAssignment.update({
        where: { id: assignmentId },
        data: {
          status: ReviewStatus.IN_PROGRESS,
          startedAt: new Date(),
        }
      });

      logger.info('Review started successfully', { assignmentId });
      return updatedAssignment;
    } catch (error: any) {
      logger.error('Failed to start review', { error: error.message, assignmentId });
      throw new AppError('Failed to start review', 500, 'REVIEW_START_FAILED', error);
    }
  }

  /**
   * Complete a review
   */
  async completeReview(assignmentId: string, outcome: ReviewOutcome, userId: string): Promise<ReviewAssignment> {
    try {
      logger.info('Completing review', { assignmentId, userId, recommendation: outcome.recommendation });

      // Verify the assignment exists and belongs to the user
      const assignment = await this.prisma.reviewAssignment.findUnique({
        where: { id: assignmentId }
      });

      if (!assignment) {
        throw new AppError('Review assignment not found', 404, 'ASSIGNMENT_NOT_FOUND');
      }

      if (assignment.reviewerId !== userId) {
        throw new AppError('Not authorized to complete this review', 403, 'UNAUTHORIZED');
      }

      if (assignment.status === ReviewStatus.COMPLETED) {
        throw new AppError('Review already completed', 409, 'REVIEW_ALREADY_COMPLETED');
      }

      const updatedAssignment = await this.prisma.reviewAssignment.update({
        where: { id: assignmentId },
        data: {
          status: ReviewStatus.COMPLETED,
          completedAt: new Date(),
          recommendation: outcome.recommendation,
          summary: outcome.summary,
          timeSpent: outcome.timeSpent,
          signatureId: outcome.signatureId,
          signedOffAt: outcome.signatureId ? new Date() : undefined,
        }
      });

      logger.info('Review completed successfully', { assignmentId, recommendation: outcome.recommendation });
      return updatedAssignment;
    } catch (error: any) {
      logger.error('Failed to complete review', { error: error.message, assignmentId });
      throw new AppError('Failed to complete review', 500, 'REVIEW_COMPLETE_FAILED', error);
    }
  }

  /**
   * Update review checklist
   */
  async updateChecklist(assignmentId: string, checklistItems: ReviewChecklistItem[], userId: string): Promise<ReviewAssignment> {
    try {
      logger.info('Updating review checklist', { assignmentId, userId });

      const assignment = await this.prisma.reviewAssignment.findUnique({
        where: { id: assignmentId }
      });

      if (!assignment) {
        throw new AppError('Review assignment not found', 404, 'ASSIGNMENT_NOT_FOUND');
      }

      if (assignment.reviewerId !== userId) {
        throw new AppError('Not authorized to update this review', 403, 'UNAUTHORIZED');
      }

      const updatedAssignment = await this.prisma.reviewAssignment.update({
        where: { id: assignmentId },
        data: {
          checklistItems: checklistItems,
          status: assignment.status === ReviewStatus.NOT_STARTED ? ReviewStatus.IN_PROGRESS : assignment.status,
          startedAt: assignment.startedAt || new Date(),
        }
      });

      logger.info('Review checklist updated', { assignmentId });
      return updatedAssignment;
    } catch (error: any) {
      logger.error('Failed to update review checklist', { error: error.message, assignmentId });
      throw new AppError('Failed to update review checklist', 500, 'CHECKLIST_UPDATE_FAILED', error);
    }
  }

  /**
   * Get reviews assigned to a user
   */
  async getMyReviews(userId: string, filters: ReviewFilters = {}): Promise<ReviewAssignment[]> {
    try {
      logger.info('Getting user reviews', { userId, filters });

      const whereClause: any = {
        reviewerId: userId,
      };

      // Apply filters
      if (filters.status) {
        whereClause.status = filters.status;
      }
      if (filters.reviewType) {
        whereClause.reviewType = filters.reviewType;
      }
      if (filters.isRequired !== undefined) {
        whereClause.isRequired = filters.isRequired;
      }
      if (filters.overdue) {
        whereClause.deadline = {
          lt: new Date()
        };
        whereClause.status = {
          notIn: [ReviewStatus.COMPLETED]
        };
      }
      if (filters.assignedAfter) {
        whereClause.assignedAt = { ...whereClause.assignedAt, gte: filters.assignedAfter };
      }
      if (filters.deadline) {
        whereClause.deadline = { ...whereClause.deadline, lte: filters.deadline };
      }

      const reviews = await this.prisma.reviewAssignment.findMany({
        where: whereClause,
        orderBy: [
          { deadline: 'asc' },
          { assignedAt: 'desc' }
        ],
        take: filters.limit,
        skip: filters.offset,
      });

      logger.info('User reviews retrieved', { userId, count: reviews.length });
      return reviews;
    } catch (error: any) {
      logger.error('Failed to get user reviews', { error: error.message, userId });
      throw new AppError('Failed to get user reviews', 500, 'GET_REVIEWS_FAILED', error);
    }
  }

  /**
   * Get reviewers for a document
   */
  async getReviewersForDocument(documentType: string, documentId: string): Promise<ReviewAssignment[]> {
    try {
      logger.info('Getting reviewers for document', { documentType, documentId });

      const reviewers = await this.prisma.reviewAssignment.findMany({
        where: {
          documentType,
          documentId,
        },
        orderBy: { assignedAt: 'desc' }
      });

      logger.info('Document reviewers retrieved', { documentType, documentId, count: reviewers.length });
      return reviewers;
    } catch (error: any) {
      logger.error('Failed to get document reviewers', { error: error.message, documentType, documentId });
      throw new AppError('Failed to get document reviewers', 500, 'GET_REVIEWERS_FAILED', error);
    }
  }

  /**
   * Get review progress for an assignment
   */
  async getReviewProgress(assignmentId: string): Promise<ReviewProgress> {
    try {
      logger.info('Getting review progress', { assignmentId });

      const assignment = await this.prisma.reviewAssignment.findUnique({
        where: { id: assignmentId }
      });

      if (!assignment) {
        throw new AppError('Review assignment not found', 404, 'ASSIGNMENT_NOT_FOUND');
      }

      // Calculate checklist progress
      const checklistItems = (assignment.checklistItems as ReviewChecklistItem[]) || [];
      const completedItems = checklistItems.filter(item => item.isCompleted);
      const checklistProgress = {
        total: checklistItems.length,
        completed: completedItems.length,
        percentage: checklistItems.length > 0 ? (completedItems.length / checklistItems.length) * 100 : 0
      };

      // Get comments and annotations added during review
      const [commentsAdded, annotationsAdded] = await Promise.all([
        this.prisma.documentComment.count({
          where: {
            documentType: assignment.documentType,
            documentId: assignment.documentId,
            authorId: assignment.reviewerId,
            createdAt: assignment.startedAt ? { gte: assignment.startedAt } : undefined
          }
        }),
        this.prisma.documentAnnotation.count({
          where: {
            documentType: assignment.documentType,
            documentId: assignment.documentId,
            authorId: assignment.reviewerId,
            createdAt: assignment.startedAt ? { gte: assignment.startedAt } : undefined
          }
        })
      ]);

      const progress: ReviewProgress = {
        assignment,
        checklistProgress,
        timeSpent: assignment.timeSpent || 0,
        commentsAdded,
        annotationsAdded
      };

      logger.info('Review progress retrieved', { assignmentId, progress: checklistProgress.percentage });
      return progress;
    } catch (error: any) {
      logger.error('Failed to get review progress', { error: error.message, assignmentId });
      throw new AppError('Failed to get review progress', 500, 'GET_PROGRESS_FAILED', error);
    }
  }

  /**
   * Send review reminder
   */
  async sendReviewReminder(assignmentId: string): Promise<void> {
    try {
      logger.info('Sending review reminder', { assignmentId });

      const assignment = await this.prisma.reviewAssignment.findUnique({
        where: { id: assignmentId }
      });

      if (!assignment) {
        throw new AppError('Review assignment not found', 404, 'ASSIGNMENT_NOT_FOUND');
      }

      // This would typically integrate with the notification service
      // For now, we'll just log the reminder
      logger.info('Review reminder sent', {
        assignmentId,
        reviewerId: assignment.reviewerId,
        deadline: assignment.deadline
      });

      // TODO: Integrate with NotificationService when implemented
    } catch (error: any) {
      logger.error('Failed to send review reminder', { error: error.message, assignmentId });
      throw new AppError('Failed to send review reminder', 500, 'REMINDER_SEND_FAILED', error);
    }
  }

  /**
   * Get overdue reviews
   */
  async getOverdueReviews(): Promise<ReviewAssignment[]> {
    try {
      logger.info('Getting overdue reviews');

      const overdueReviews = await this.prisma.reviewAssignment.findMany({
        where: {
          deadline: {
            lt: new Date()
          },
          status: {
            notIn: [ReviewStatus.COMPLETED]
          }
        },
        orderBy: { deadline: 'asc' }
      });

      // Update status to OVERDUE
      if (overdueReviews.length > 0) {
        await this.prisma.reviewAssignment.updateMany({
          where: {
            id: {
              in: overdueReviews.map(r => r.id)
            }
          },
          data: {
            status: ReviewStatus.OVERDUE
          }
        });

        // Refresh the data with updated status
        const updatedOverdueReviews = await this.prisma.reviewAssignment.findMany({
          where: {
            id: {
              in: overdueReviews.map(r => r.id)
            }
          }
        });

        logger.info('Overdue reviews retrieved and updated', { count: updatedOverdueReviews.length });
        return updatedOverdueReviews;
      }

      logger.info('No overdue reviews found');
      return [];
    } catch (error: any) {
      logger.error('Failed to get overdue reviews', { error: error.message });
      throw new AppError('Failed to get overdue reviews', 500, 'GET_OVERDUE_FAILED', error);
    }
  }

  /**
   * Get review statistics
   */
  async getReviewStats(userId?: string): Promise<{
    totalReviews: number;
    completedReviews: number;
    overdueReviews: number;
    averageCompletionTime: number; // hours
    reviewsByStatus: Record<ReviewStatus, number>;
    reviewsByType: Record<ReviewType, number>;
  }> {
    try {
      logger.info('Getting review statistics', { userId });

      const whereClause = userId ? { reviewerId: userId } : {};

      const reviews = await this.prisma.reviewAssignment.findMany({
        where: whereClause,
        select: {
          status: true,
          reviewType: true,
          assignedAt: true,
          completedAt: true,
          timeSpent: true,
          deadline: true
        }
      });

      const totalReviews = reviews.length;
      const completedReviews = reviews.filter(r => r.status === ReviewStatus.COMPLETED).length;
      const overdueReviews = reviews.filter(r =>
        r.deadline && r.deadline < new Date() && r.status !== ReviewStatus.COMPLETED
      ).length;

      // Calculate average completion time
      const completedWithTime = reviews.filter(r => r.timeSpent && r.timeSpent > 0);
      const averageCompletionTime = completedWithTime.length > 0
        ? completedWithTime.reduce((sum, r) => sum + (r.timeSpent || 0), 0) / completedWithTime.length / 60 // Convert to hours
        : 0;

      // Count by status
      const reviewsByStatus: Record<ReviewStatus, number> = {} as Record<ReviewStatus, number>;
      const reviewsByType: Record<ReviewType, number> = {} as Record<ReviewType, number>;

      reviews.forEach(review => {
        reviewsByStatus[review.status] = (reviewsByStatus[review.status] || 0) + 1;
        reviewsByType[review.reviewType] = (reviewsByType[review.reviewType] || 0) + 1;
      });

      const stats = {
        totalReviews,
        completedReviews,
        overdueReviews,
        averageCompletionTime,
        reviewsByStatus,
        reviewsByType
      };

      logger.info('Review statistics calculated', { stats });
      return stats;
    } catch (error: any) {
      logger.error('Failed to get review statistics', { error: error.message });
      throw new AppError('Failed to get review statistics', 500, 'GET_STATS_FAILED', error);
    }
  }

  /**
   * Create review checklist template
   */
  createChecklistTemplate(reviewType: ReviewType): ReviewChecklistItem[] {
    const baseId = Date.now();

    switch (reviewType) {
      case ReviewType.TECHNICAL:
        return [
          {
            id: `tech_${baseId}_1`,
            title: 'Technical Accuracy',
            description: 'Verify technical content is accurate and current',
            isRequired: true,
            isCompleted: false
          },
          {
            id: `tech_${baseId}_2`,
            title: 'Implementation Feasibility',
            description: 'Confirm procedures can be implemented as described',
            isRequired: true,
            isCompleted: false
          },
          {
            id: `tech_${baseId}_3`,
            title: 'Resource Requirements',
            description: 'Validate required tools, materials, and skills',
            isRequired: true,
            isCompleted: false
          }
        ];

      case ReviewType.SAFETY:
        return [
          {
            id: `safety_${baseId}_1`,
            title: 'Hazard Identification',
            description: 'Identify and document all potential hazards',
            isRequired: true,
            isCompleted: false
          },
          {
            id: `safety_${baseId}_2`,
            title: 'Personal Protective Equipment',
            description: 'Verify PPE requirements are specified',
            isRequired: true,
            isCompleted: false
          },
          {
            id: `safety_${baseId}_3`,
            title: 'Emergency Procedures',
            description: 'Confirm emergency response procedures are included',
            isRequired: true,
            isCompleted: false
          }
        ];

      case ReviewType.QUALITY:
        return [
          {
            id: `quality_${baseId}_1`,
            title: 'Quality Standards',
            description: 'Verify compliance with quality standards',
            isRequired: true,
            isCompleted: false
          },
          {
            id: `quality_${baseId}_2`,
            title: 'Inspection Criteria',
            description: 'Validate inspection and acceptance criteria',
            isRequired: true,
            isCompleted: false
          }
        ];

      default:
        return [
          {
            id: `general_${baseId}_1`,
            title: 'Content Review',
            description: 'Review document content for accuracy and completeness',
            isRequired: true,
            isCompleted: false
          },
          {
            id: `general_${baseId}_2`,
            title: 'Clarity and Readability',
            description: 'Ensure document is clear and easy to understand',
            isRequired: false,
            isCompleted: false
          }
        ];
    }
  }

  // ✅ GITHUB ISSUE #147: Core Unified Workflow Engine Integration - Document Approval Process

  /**
   * Submit document for approval using unified workflow engine
   */
  async submitDocumentForApproval(
    documentId: string,
    documentType: string,
    userId: string,
    requiredApproverRoles: string[] = ['quality_manager', 'document_approver'],
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM'
  ): Promise<{
    success: boolean;
    workflowInstanceId?: string;
    currentStage?: string;
    nextApprovers?: string[];
    error?: string;
  }> {
    try {
      // Initialize the unified approval service if needed
      await this.unifiedApprovalService.initialize(userId);

      // Initiate approval workflow for document
      const result = await this.unifiedApprovalService.initiateApproval(
        {
          entityType: 'DOCUMENT',
          entityId: documentId,
          currentStatus: 'PENDING_APPROVAL',
          requiredApproverRoles,
          priority,
          metadata: {
            submittedAt: new Date().toISOString(),
            submittedBy: userId,
            documentType,
            processType: 'document_review'
          }
        },
        userId
      );

      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Approve document using unified workflow engine
   */
  async approveDocument(
    documentId: string,
    userId: string,
    comments?: string,
    requiresSignature: boolean = false
  ): Promise<{
    success: boolean;
    workflowInstanceId?: string;
    currentStage?: string;
    error?: string;
  }> {
    try {
      let signatureData = null;
      if (requiresSignature) {
        signatureData = {
          userId,
          reason: 'Document approval signature',
          timestamp: new Date(),
          ipAddress: '127.0.0.1', // This would come from the request context
          userAgent: 'ReviewService'
        };
      }

      // Use unified approval service
      const approvalResult = await this.unifiedApprovalService.processApprovalAction(
        'DOCUMENT',
        documentId,
        'APPROVE',
        userId,
        comments,
        signatureData
      );

      if (!approvalResult.success) {
        throw new Error(`Approval failed: ${approvalResult.error || 'Unknown error'}`);
      }

      return approvalResult;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reject document using unified workflow engine
   */
  async rejectDocument(
    documentId: string,
    userId: string,
    rejectionReason: string,
    comments: string
  ): Promise<{
    success: boolean;
    workflowInstanceId?: string;
    error?: string;
  }> {
    try {
      // Use unified approval service for rejection
      const rejectionResult = await this.unifiedApprovalService.processApprovalAction(
        'DOCUMENT',
        documentId,
        'REJECT',
        userId,
        `${rejectionReason}: ${comments}`
      );

      if (!rejectionResult.success) {
        throw new Error(`Rejection failed: ${rejectionResult.error || 'Unknown error'}`);
      }

      return rejectionResult;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get approval status for document from unified workflow engine
   */
  async getDocumentApprovalStatus(documentId: string): Promise<{
    hasActiveWorkflow: boolean;
    workflowStatus?: string;
    currentStage?: string;
    completionPercentage?: number;
    nextApprovers?: string[];
    approvalHistory?: any[];
  }> {
    try {
      const status = await this.unifiedApprovalService.getApprovalStatus(
        'DOCUMENT',
        documentId
      );

      return status;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get pending document approvals for user
   */
  async getPendingDocumentApprovals(userId: string): Promise<any[]> {
    try {
      const allTasks = await this.unifiedApprovalService.getPendingApprovalsForUser(userId);

      // Filter for document approval tasks only
      return allTasks.filter(task => task.entityType === 'DOCUMENT');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Complete review and trigger workflow approval if needed
   */
  async completeReviewWithWorkflow(
    assignmentId: string,
    outcome: ReviewOutcome,
    userId: string,
    triggerApproval: boolean = false
  ): Promise<ReviewAssignment> {
    try {
      // Complete the review assignment first
      const completedReview = await this.completeReview(assignmentId, outcome, userId);

      // If approval is needed and review recommendation is positive, initiate workflow
      if (triggerApproval && outcome.recommendation === ReviewRecommendation.APPROVE) {
        await this.submitDocumentForApproval(
          completedReview.documentId,
          completedReview.documentType,
          userId,
          ['quality_manager', 'document_approver'],
          'MEDIUM'
        );

        logger.info('Document approval workflow initiated after review completion', {
          assignmentId,
          documentId: completedReview.documentId,
          documentType: completedReview.documentType
        });
      }

      return completedReview;
    } catch (error) {
      logger.error('Failed to complete review with workflow', { error: error.message, assignmentId });
      throw new AppError('Failed to complete review with workflow', 500, 'REVIEW_WORKFLOW_FAILED', error);
    }
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export const reviewService = new ReviewService();
export default reviewService;