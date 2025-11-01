import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrismaClient, ReviewStatus, ReviewType, ReviewRecommendation } from '@prisma/client';
import ReviewService, {
  ReviewAssignmentInput,
  ReviewOutcome,
  ReviewFilters,
  ReviewChecklistItem,
  ReviewProgress
} from '../../services/ReviewService';
import { AppError } from '../../middleware/errorHandler';
import { UnifiedApprovalIntegration } from '../../services/UnifiedApprovalIntegration';

// Mock Prisma Client
const mockPrisma = {
  reviewAssignment: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  documentComment: {
    count: vi.fn(),
  },
  documentAnnotation: {
    count: vi.fn(),
  },
  $disconnect: vi.fn(),
  $on: vi.fn(),
} as unknown as PrismaClient;

// Mock UnifiedApprovalIntegration
vi.mock('../../services/UnifiedApprovalIntegration', () => ({
  UnifiedApprovalIntegration: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(true),
    initiateApproval: vi.fn().mockResolvedValue({
      success: true,
      workflowInstanceId: 'workflow-123',
      currentStage: 'quality_review',
      nextApprovers: ['approver-1', 'approver-2']
    }),
    processApprovalAction: vi.fn().mockResolvedValue({
      success: true,
      workflowInstanceId: 'workflow-123',
      currentStage: 'approved'
    }),
    getApprovalStatus: vi.fn().mockResolvedValue({
      hasActiveWorkflow: true,
      workflowStatus: 'IN_PROGRESS',
      currentStage: 'quality_review',
      completionPercentage: 50,
      nextApprovers: ['approver-1'],
      approvalHistory: []
    }),
    getPendingApprovalsForUser: vi.fn().mockResolvedValue([
      { entityType: 'DOCUMENT', entityId: 'doc-1', id: 'task-1' },
      { entityType: 'WORK_ORDER', entityId: 'wo-1', id: 'task-2' }
    ])
  }))
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('ReviewService', () => {
  let service: ReviewService;
  let mockUnifiedApprovalService: any;

  // Test data
  const mockReviewAssignment = {
    id: 'review-123',
    documentType: 'SOP',
    documentId: 'doc-456',
    documentVersion: '1.0',
    reviewerId: 'user-123',
    reviewerName: 'John Doe',
    assignedById: 'user-456',
    assignedByName: 'Jane Smith',
    reviewType: ReviewType.TECHNICAL,
    instructions: 'Review technical accuracy',
    focusAreas: ['technical', 'safety'],
    isRequired: true,
    deadline: new Date('2024-12-31'),
    status: ReviewStatus.NOT_STARTED,
    assignedAt: new Date('2024-01-01'),
    startedAt: null,
    completedAt: null,
    recommendation: null,
    summary: null,
    timeSpent: null,
    signatureId: null,
    signedOffAt: null,
    checklistItems: [],
  };

  const mockReviewInput: ReviewAssignmentInput = {
    documentType: 'SOP',
    documentId: 'doc-456',
    documentVersion: '1.0',
    reviewerId: 'user-123',
    reviewerName: 'John Doe',
    assignedById: 'user-456',
    assignedByName: 'Jane Smith',
    reviewType: ReviewType.TECHNICAL,
    instructions: 'Review technical accuracy',
    focusAreas: ['technical', 'safety'],
    isRequired: true,
    deadline: new Date('2024-12-31'),
    checklistItems: []
  };

  const mockReviewOutcome: ReviewOutcome = {
    recommendation: ReviewRecommendation.APPROVE,
    summary: 'Document is technically sound',
    timeSpent: 120,
    signatureId: 'sig-123'
  };

  const mockChecklistItems: ReviewChecklistItem[] = [
    {
      id: 'item-1',
      title: 'Technical Accuracy',
      description: 'Verify technical content',
      isRequired: true,
      isCompleted: true,
      notes: 'All technical aspects verified',
      completedAt: new Date()
    },
    {
      id: 'item-2',
      title: 'Safety Requirements',
      description: 'Check safety procedures',
      isRequired: true,
      isCompleted: false
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ReviewService(mockPrisma);
    mockUnifiedApprovalService = (service as any).unifiedApprovalService;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should initialize with provided prisma instance', () => {
      expect(service).toBeInstanceOf(ReviewService);
      expect((service as any).prisma).toBe(mockPrisma);
    });

    it('should initialize with default prisma instance when none provided', () => {
      const newService = new ReviewService();
      expect(newService).toBeInstanceOf(ReviewService);
    });

    it('should set up prisma event listeners', () => {
      expect(mockPrisma.$on).toHaveBeenCalledWith('query', expect.any(Function));
      expect(mockPrisma.$on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('assignReview', () => {
    it('should assign review with valid input', async () => {
      mockPrisma.reviewAssignment.findUnique.mockResolvedValue(null);
      mockPrisma.reviewAssignment.create.mockResolvedValue(mockReviewAssignment);

      const result = await service.assignReview(mockReviewInput);

      expect(result).toEqual(mockReviewAssignment);
      expect(mockPrisma.reviewAssignment.findUnique).toHaveBeenCalledWith({
        where: {
          documentType_documentId_reviewerId: {
            documentType: mockReviewInput.documentType,
            documentId: mockReviewInput.documentId,
            reviewerId: mockReviewInput.reviewerId
          }
        }
      });
      expect(mockPrisma.reviewAssignment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          documentType: mockReviewInput.documentType,
          documentId: mockReviewInput.documentId,
          reviewerId: mockReviewInput.reviewerId,
          reviewType: mockReviewInput.reviewType,
          isRequired: true
        })
      });
    });

    it('should throw error when review already exists', async () => {
      mockPrisma.reviewAssignment.findUnique.mockResolvedValue(mockReviewAssignment);

      await expect(service.assignReview(mockReviewInput)).rejects.toThrow(AppError);
      expect(mockPrisma.reviewAssignment.create).not.toHaveBeenCalled();
    });

    it('should handle optional fields correctly', async () => {
      const inputWithoutOptionals = {
        ...mockReviewInput,
        instructions: undefined,
        focusAreas: undefined,
        isRequired: undefined,
        deadline: undefined,
        checklistItems: undefined
      };

      mockPrisma.reviewAssignment.findUnique.mockResolvedValue(null);
      mockPrisma.reviewAssignment.create.mockResolvedValue(mockReviewAssignment);

      await service.assignReview(inputWithoutOptionals);

      expect(mockPrisma.reviewAssignment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          focusAreas: [],
          isRequired: true,
          instructions: undefined,
          deadline: undefined,
          checklistItems: undefined
        })
      });
    });

    it('should handle database errors', async () => {
      mockPrisma.reviewAssignment.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(service.assignReview(mockReviewInput)).rejects.toThrow(AppError);
    });
  });

  describe('startReview', () => {
    it('should start review with valid assignment', async () => {
      const startedAssignment = {
        ...mockReviewAssignment,
        status: ReviewStatus.IN_PROGRESS,
        startedAt: new Date()
      };

      mockPrisma.reviewAssignment.findUnique.mockResolvedValue(mockReviewAssignment);
      mockPrisma.reviewAssignment.update.mockResolvedValue(startedAssignment);

      const result = await service.startReview(mockReviewAssignment.id, mockReviewAssignment.reviewerId);

      expect(result).toEqual(startedAssignment);
      expect(mockPrisma.reviewAssignment.update).toHaveBeenCalledWith({
        where: { id: mockReviewAssignment.id },
        data: {
          status: ReviewStatus.IN_PROGRESS,
          startedAt: expect.any(Date)
        }
      });
    });

    it('should throw error when assignment not found', async () => {
      mockPrisma.reviewAssignment.findUnique.mockResolvedValue(null);

      await expect(service.startReview('invalid-id', 'user-123')).rejects.toThrow(AppError);
      expect(mockPrisma.reviewAssignment.update).not.toHaveBeenCalled();
    });

    it('should throw error when user not authorized', async () => {
      mockPrisma.reviewAssignment.findUnique.mockResolvedValue(mockReviewAssignment);

      await expect(service.startReview(mockReviewAssignment.id, 'wrong-user')).rejects.toThrow(AppError);
      expect(mockPrisma.reviewAssignment.update).not.toHaveBeenCalled();
    });

    it('should throw error when review already started', async () => {
      const inProgressAssignment = {
        ...mockReviewAssignment,
        status: ReviewStatus.IN_PROGRESS
      };
      mockPrisma.reviewAssignment.findUnique.mockResolvedValue(inProgressAssignment);

      await expect(service.startReview(mockReviewAssignment.id, mockReviewAssignment.reviewerId)).rejects.toThrow(AppError);
      expect(mockPrisma.reviewAssignment.update).not.toHaveBeenCalled();
    });
  });

  describe('completeReview', () => {
    it('should complete review with valid outcome', async () => {
      const inProgressAssignment = {
        ...mockReviewAssignment,
        status: ReviewStatus.IN_PROGRESS
      };
      const completedAssignment = {
        ...inProgressAssignment,
        status: ReviewStatus.COMPLETED,
        completedAt: new Date(),
        recommendation: mockReviewOutcome.recommendation,
        summary: mockReviewOutcome.summary,
        timeSpent: mockReviewOutcome.timeSpent,
        signatureId: mockReviewOutcome.signatureId,
        signedOffAt: new Date()
      };

      mockPrisma.reviewAssignment.findUnique.mockResolvedValue(inProgressAssignment);
      mockPrisma.reviewAssignment.update.mockResolvedValue(completedAssignment);

      const result = await service.completeReview(mockReviewAssignment.id, mockReviewOutcome, mockReviewAssignment.reviewerId);

      expect(result).toEqual(completedAssignment);
      expect(mockPrisma.reviewAssignment.update).toHaveBeenCalledWith({
        where: { id: mockReviewAssignment.id },
        data: expect.objectContaining({
          status: ReviewStatus.COMPLETED,
          completedAt: expect.any(Date),
          recommendation: mockReviewOutcome.recommendation,
          summary: mockReviewOutcome.summary,
          timeSpent: mockReviewOutcome.timeSpent,
          signatureId: mockReviewOutcome.signatureId,
          signedOffAt: expect.any(Date)
        })
      });
    });

    it('should complete review without signature', async () => {
      const outcomeWithoutSignature = {
        ...mockReviewOutcome,
        signatureId: undefined
      };
      const inProgressAssignment = {
        ...mockReviewAssignment,
        status: ReviewStatus.IN_PROGRESS
      };

      mockPrisma.reviewAssignment.findUnique.mockResolvedValue(inProgressAssignment);
      mockPrisma.reviewAssignment.update.mockResolvedValue({
        ...inProgressAssignment,
        status: ReviewStatus.COMPLETED
      });

      await service.completeReview(mockReviewAssignment.id, outcomeWithoutSignature, mockReviewAssignment.reviewerId);

      expect(mockPrisma.reviewAssignment.update).toHaveBeenCalledWith({
        where: { id: mockReviewAssignment.id },
        data: expect.objectContaining({
          signedOffAt: undefined
        })
      });
    });

    it('should throw error when assignment not found', async () => {
      mockPrisma.reviewAssignment.findUnique.mockResolvedValue(null);

      await expect(service.completeReview('invalid-id', mockReviewOutcome, 'user-123')).rejects.toThrow(AppError);
    });

    it('should throw error when user not authorized', async () => {
      mockPrisma.reviewAssignment.findUnique.mockResolvedValue(mockReviewAssignment);

      await expect(service.completeReview(mockReviewAssignment.id, mockReviewOutcome, 'wrong-user')).rejects.toThrow(AppError);
    });

    it('should throw error when review already completed', async () => {
      const completedAssignment = {
        ...mockReviewAssignment,
        status: ReviewStatus.COMPLETED
      };
      mockPrisma.reviewAssignment.findUnique.mockResolvedValue(completedAssignment);

      await expect(service.completeReview(mockReviewAssignment.id, mockReviewOutcome, mockReviewAssignment.reviewerId)).rejects.toThrow(AppError);
    });
  });

  describe('updateChecklist', () => {
    it('should update checklist items', async () => {
      const updatedAssignment = {
        ...mockReviewAssignment,
        checklistItems: mockChecklistItems,
        status: ReviewStatus.IN_PROGRESS,
        startedAt: new Date()
      };

      mockPrisma.reviewAssignment.findUnique.mockResolvedValue(mockReviewAssignment);
      mockPrisma.reviewAssignment.update.mockResolvedValue(updatedAssignment);

      const result = await service.updateChecklist(mockReviewAssignment.id, mockChecklistItems, mockReviewAssignment.reviewerId);

      expect(result).toEqual(updatedAssignment);
      expect(mockPrisma.reviewAssignment.update).toHaveBeenCalledWith({
        where: { id: mockReviewAssignment.id },
        data: {
          checklistItems: mockChecklistItems,
          status: ReviewStatus.IN_PROGRESS,
          startedAt: expect.any(Date)
        }
      });
    });

    it('should not change status if already in progress', async () => {
      const inProgressAssignment = {
        ...mockReviewAssignment,
        status: ReviewStatus.IN_PROGRESS,
        startedAt: new Date('2024-01-02')
      };

      mockPrisma.reviewAssignment.findUnique.mockResolvedValue(inProgressAssignment);
      mockPrisma.reviewAssignment.update.mockResolvedValue(inProgressAssignment);

      await service.updateChecklist(mockReviewAssignment.id, mockChecklistItems, mockReviewAssignment.reviewerId);

      expect(mockPrisma.reviewAssignment.update).toHaveBeenCalledWith({
        where: { id: mockReviewAssignment.id },
        data: {
          checklistItems: mockChecklistItems,
          status: ReviewStatus.IN_PROGRESS,
          startedAt: inProgressAssignment.startedAt
        }
      });
    });

    it('should throw error when assignment not found', async () => {
      mockPrisma.reviewAssignment.findUnique.mockResolvedValue(null);

      await expect(service.updateChecklist('invalid-id', mockChecklistItems, 'user-123')).rejects.toThrow(AppError);
    });

    it('should throw error when user not authorized', async () => {
      mockPrisma.reviewAssignment.findUnique.mockResolvedValue(mockReviewAssignment);

      await expect(service.updateChecklist(mockReviewAssignment.id, mockChecklistItems, 'wrong-user')).rejects.toThrow(AppError);
    });
  });

  describe('getMyReviews', () => {
    const mockReviews = [
      mockReviewAssignment,
      {
        ...mockReviewAssignment,
        id: 'review-456',
        status: ReviewStatus.IN_PROGRESS,
        reviewType: ReviewType.SAFETY
      }
    ];

    it('should get user reviews without filters', async () => {
      mockPrisma.reviewAssignment.findMany.mockResolvedValue(mockReviews);

      const result = await service.getMyReviews('user-123');

      expect(result).toEqual(mockReviews);
      expect(mockPrisma.reviewAssignment.findMany).toHaveBeenCalledWith({
        where: { reviewerId: 'user-123' },
        orderBy: [
          { deadline: 'asc' },
          { assignedAt: 'desc' }
        ],
        take: undefined,
        skip: undefined
      });
    });

    it('should apply status filter', async () => {
      const filters: ReviewFilters = { status: ReviewStatus.IN_PROGRESS };
      mockPrisma.reviewAssignment.findMany.mockResolvedValue([mockReviews[1]]);

      await service.getMyReviews('user-123', filters);

      expect(mockPrisma.reviewAssignment.findMany).toHaveBeenCalledWith({
        where: {
          reviewerId: 'user-123',
          status: ReviewStatus.IN_PROGRESS
        },
        orderBy: [
          { deadline: 'asc' },
          { assignedAt: 'desc' }
        ],
        take: undefined,
        skip: undefined
      });
    });

    it('should apply review type filter', async () => {
      const filters: ReviewFilters = { reviewType: ReviewType.TECHNICAL };
      mockPrisma.reviewAssignment.findMany.mockResolvedValue([mockReviews[0]]);

      await service.getMyReviews('user-123', filters);

      expect(mockPrisma.reviewAssignment.findMany).toHaveBeenCalledWith({
        where: {
          reviewerId: 'user-123',
          reviewType: ReviewType.TECHNICAL
        },
        orderBy: [
          { deadline: 'asc' },
          { assignedAt: 'desc' }
        ],
        take: undefined,
        skip: undefined
      });
    });

    it('should apply overdue filter', async () => {
      const filters: ReviewFilters = { overdue: true };
      mockPrisma.reviewAssignment.findMany.mockResolvedValue([]);

      await service.getMyReviews('user-123', filters);

      expect(mockPrisma.reviewAssignment.findMany).toHaveBeenCalledWith({
        where: {
          reviewerId: 'user-123',
          deadline: { lt: expect.any(Date) },
          status: { notIn: [ReviewStatus.COMPLETED] }
        },
        orderBy: [
          { deadline: 'asc' },
          { assignedAt: 'desc' }
        ],
        take: undefined,
        skip: undefined
      });
    });

    it('should apply pagination', async () => {
      const filters: ReviewFilters = { limit: 10, offset: 20 };
      mockPrisma.reviewAssignment.findMany.mockResolvedValue(mockReviews);

      await service.getMyReviews('user-123', filters);

      expect(mockPrisma.reviewAssignment.findMany).toHaveBeenCalledWith({
        where: { reviewerId: 'user-123' },
        orderBy: [
          { deadline: 'asc' },
          { assignedAt: 'desc' }
        ],
        take: 10,
        skip: 20
      });
    });

    it('should apply date range filters', async () => {
      const assignedAfter = new Date('2024-01-01');
      const deadline = new Date('2024-12-31');
      const filters: ReviewFilters = { assignedAfter, deadline };
      mockPrisma.reviewAssignment.findMany.mockResolvedValue(mockReviews);

      await service.getMyReviews('user-123', filters);

      expect(mockPrisma.reviewAssignment.findMany).toHaveBeenCalledWith({
        where: {
          reviewerId: 'user-123',
          assignedAt: { gte: assignedAfter },
          deadline: { lte: deadline }
        },
        orderBy: [
          { deadline: 'asc' },
          { assignedAt: 'desc' }
        ],
        take: undefined,
        skip: undefined
      });
    });
  });

  describe('getReviewersForDocument', () => {
    it('should get reviewers for document', async () => {
      mockPrisma.reviewAssignment.findMany.mockResolvedValue([mockReviewAssignment]);

      const result = await service.getReviewersForDocument('SOP', 'doc-456');

      expect(result).toEqual([mockReviewAssignment]);
      expect(mockPrisma.reviewAssignment.findMany).toHaveBeenCalledWith({
        where: {
          documentType: 'SOP',
          documentId: 'doc-456'
        },
        orderBy: { assignedAt: 'desc' }
      });
    });

    it('should handle empty results', async () => {
      mockPrisma.reviewAssignment.findMany.mockResolvedValue([]);

      const result = await service.getReviewersForDocument('SOP', 'nonexistent');

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockPrisma.reviewAssignment.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getReviewersForDocument('SOP', 'doc-456')).rejects.toThrow(AppError);
    });
  });

  describe('getReviewProgress', () => {
    it('should get review progress', async () => {
      const assignmentWithChecklist = {
        ...mockReviewAssignment,
        checklistItems: mockChecklistItems
      };

      mockPrisma.reviewAssignment.findUnique.mockResolvedValue(assignmentWithChecklist);
      mockPrisma.documentComment.count.mockResolvedValue(5);
      mockPrisma.documentAnnotation.count.mockResolvedValue(3);

      const result = await service.getReviewProgress(mockReviewAssignment.id);

      expect(result).toEqual({
        assignment: assignmentWithChecklist,
        checklistProgress: {
          total: 2,
          completed: 1,
          percentage: 50
        },
        timeSpent: 0,
        commentsAdded: 5,
        annotationsAdded: 3
      });
    });

    it('should handle empty checklist', async () => {
      const assignmentWithoutChecklist = {
        ...mockReviewAssignment,
        checklistItems: []
      };

      mockPrisma.reviewAssignment.findUnique.mockResolvedValue(assignmentWithoutChecklist);
      mockPrisma.documentComment.count.mockResolvedValue(0);
      mockPrisma.documentAnnotation.count.mockResolvedValue(0);

      const result = await service.getReviewProgress(mockReviewAssignment.id);

      expect(result.checklistProgress).toEqual({
        total: 0,
        completed: 0,
        percentage: 0
      });
    });

    it('should throw error when assignment not found', async () => {
      mockPrisma.reviewAssignment.findUnique.mockResolvedValue(null);

      await expect(service.getReviewProgress('invalid-id')).rejects.toThrow(AppError);
    });
  });

  describe('sendReviewReminder', () => {
    it('should send review reminder', async () => {
      mockPrisma.reviewAssignment.findUnique.mockResolvedValue(mockReviewAssignment);

      await expect(service.sendReviewReminder(mockReviewAssignment.id)).resolves.toBeUndefined();
    });

    it('should throw error when assignment not found', async () => {
      mockPrisma.reviewAssignment.findUnique.mockResolvedValue(null);

      await expect(service.sendReviewReminder('invalid-id')).rejects.toThrow(AppError);
    });
  });

  describe('getOverdueReviews', () => {
    it('should get overdue reviews and update status', async () => {
      const overdueReviews = [
        {
          ...mockReviewAssignment,
          id: 'overdue-1',
          deadline: new Date(Date.now() - 86400000), // 1 day ago
          status: ReviewStatus.IN_PROGRESS
        }
      ];

      const updatedOverdueReviews = [
        {
          ...overdueReviews[0],
          status: ReviewStatus.OVERDUE
        }
      ];

      mockPrisma.reviewAssignment.findMany
        .mockResolvedValueOnce(overdueReviews)
        .mockResolvedValueOnce(updatedOverdueReviews);
      mockPrisma.reviewAssignment.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.getOverdueReviews();

      expect(result).toEqual(updatedOverdueReviews);
      expect(mockPrisma.reviewAssignment.updateMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: ['overdue-1']
          }
        },
        data: {
          status: ReviewStatus.OVERDUE
        }
      });
    });

    it('should handle no overdue reviews', async () => {
      mockPrisma.reviewAssignment.findMany.mockResolvedValue([]);

      const result = await service.getOverdueReviews();

      expect(result).toEqual([]);
      expect(mockPrisma.reviewAssignment.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('getReviewStats', () => {
    const mockStatsReviews = [
      {
        status: ReviewStatus.COMPLETED,
        reviewType: ReviewType.TECHNICAL,
        assignedAt: new Date('2024-01-01'),
        completedAt: new Date('2024-01-02'),
        timeSpent: 120,
        deadline: new Date('2024-01-03')
      },
      {
        status: ReviewStatus.IN_PROGRESS,
        reviewType: ReviewType.SAFETY,
        assignedAt: new Date('2024-01-02'),
        completedAt: null,
        timeSpent: null,
        deadline: new Date('2023-12-31') // Overdue
      },
      {
        status: ReviewStatus.NOT_STARTED,
        reviewType: ReviewType.TECHNICAL,
        assignedAt: new Date('2024-01-03'),
        completedAt: null,
        timeSpent: null,
        deadline: new Date('2024-12-31')
      }
    ];

    it('should get review statistics for user', async () => {
      mockPrisma.reviewAssignment.findMany.mockResolvedValue(mockStatsReviews);

      const result = await service.getReviewStats('user-123');

      expect(result).toEqual({
        totalReviews: 3,
        completedReviews: 1,
        overdueReviews: 1,
        averageCompletionTime: 2, // 120 minutes / 60 = 2 hours
        reviewsByStatus: {
          [ReviewStatus.COMPLETED]: 1,
          [ReviewStatus.IN_PROGRESS]: 1,
          [ReviewStatus.NOT_STARTED]: 1
        },
        reviewsByType: {
          [ReviewType.TECHNICAL]: 2,
          [ReviewType.SAFETY]: 1
        }
      });
    });

    it('should get global review statistics', async () => {
      mockPrisma.reviewAssignment.findMany.mockResolvedValue(mockStatsReviews);

      const result = await service.getReviewStats();

      expect(mockPrisma.reviewAssignment.findMany).toHaveBeenCalledWith({
        where: {},
        select: expect.any(Object)
      });
      expect(result.totalReviews).toBe(3);
    });

    it('should handle zero completion time reviews', async () => {
      const reviewsWithoutTime = [
        {
          status: ReviewStatus.COMPLETED,
          reviewType: ReviewType.TECHNICAL,
          assignedAt: new Date(),
          completedAt: new Date(),
          timeSpent: null,
          deadline: new Date()
        }
      ];

      mockPrisma.reviewAssignment.findMany.mockResolvedValue(reviewsWithoutTime);

      const result = await service.getReviewStats();

      expect(result.averageCompletionTime).toBe(0);
    });
  });

  describe('createChecklistTemplate', () => {
    it('should create technical review checklist', () => {
      const checklist = service.createChecklistTemplate(ReviewType.TECHNICAL);

      expect(checklist).toHaveLength(3);
      expect(checklist[0]).toEqual(expect.objectContaining({
        title: 'Technical Accuracy',
        isRequired: true,
        isCompleted: false
      }));
      expect(checklist[1]).toEqual(expect.objectContaining({
        title: 'Implementation Feasibility',
        isRequired: true,
        isCompleted: false
      }));
      expect(checklist[2]).toEqual(expect.objectContaining({
        title: 'Resource Requirements',
        isRequired: true,
        isCompleted: false
      }));
    });

    it('should create safety review checklist', () => {
      const checklist = service.createChecklistTemplate(ReviewType.SAFETY);

      expect(checklist).toHaveLength(3);
      expect(checklist[0].title).toBe('Hazard Identification');
      expect(checklist[1].title).toBe('Personal Protective Equipment');
      expect(checklist[2].title).toBe('Emergency Procedures');
    });

    it('should create quality review checklist', () => {
      const checklist = service.createChecklistTemplate(ReviewType.QUALITY);

      expect(checklist).toHaveLength(2);
      expect(checklist[0].title).toBe('Quality Standards');
      expect(checklist[1].title).toBe('Inspection Criteria');
    });

    it('should create default checklist for unknown type', () => {
      const checklist = service.createChecklistTemplate('UNKNOWN' as ReviewType);

      expect(checklist).toHaveLength(2);
      expect(checklist[0].title).toBe('Content Review');
      expect(checklist[1].title).toBe('Clarity and Readability');
      expect(checklist[1].isRequired).toBe(false);
    });
  });

  describe('Workflow Integration', () => {
    describe('submitDocumentForApproval', () => {
      it('should submit document for approval', async () => {
        const result = await service.submitDocumentForApproval(
          'doc-123',
          'SOP',
          'user-123',
          ['quality_manager'],
          'HIGH'
        );

        expect(mockUnifiedApprovalService.initialize).toHaveBeenCalledWith('user-123');
        expect(mockUnifiedApprovalService.initiateApproval).toHaveBeenCalledWith(
          {
            entityType: 'DOCUMENT',
            entityId: 'doc-123',
            currentStatus: 'PENDING_APPROVAL',
            requiredApproverRoles: ['quality_manager'],
            priority: 'HIGH',
            metadata: expect.objectContaining({
              submittedBy: 'user-123',
              documentType: 'SOP',
              processType: 'document_review'
            })
          },
          'user-123'
        );
        expect(result.success).toBe(true);
      });

      it('should use default parameters', async () => {
        await service.submitDocumentForApproval('doc-123', 'SOP', 'user-123');

        expect(mockUnifiedApprovalService.initiateApproval).toHaveBeenCalledWith(
          expect.objectContaining({
            requiredApproverRoles: ['quality_manager', 'document_approver'],
            priority: 'MEDIUM'
          }),
          'user-123'
        );
      });

      it('should handle workflow errors', async () => {
        mockUnifiedApprovalService.initiateApproval.mockRejectedValue(new Error('Workflow error'));

        await expect(service.submitDocumentForApproval('doc-123', 'SOP', 'user-123')).rejects.toThrow('Workflow error');
      });
    });

    describe('approveDocument', () => {
      it('should approve document with signature', async () => {
        const result = await service.approveDocument('doc-123', 'user-123', 'Looks good', true);

        expect(mockUnifiedApprovalService.processApprovalAction).toHaveBeenCalledWith(
          'DOCUMENT',
          'doc-123',
          'APPROVE',
          'user-123',
          'Looks good',
          expect.objectContaining({
            userId: 'user-123',
            reason: 'Document approval signature',
            timestamp: expect.any(Date)
          })
        );
        expect(result.success).toBe(true);
      });

      it('should approve document without signature', async () => {
        await service.approveDocument('doc-123', 'user-123', 'Looks good', false);

        expect(mockUnifiedApprovalService.processApprovalAction).toHaveBeenCalledWith(
          'DOCUMENT',
          'doc-123',
          'APPROVE',
          'user-123',
          'Looks good',
          null
        );
      });

      it('should handle approval errors', async () => {
        mockUnifiedApprovalService.processApprovalAction.mockResolvedValue({
          success: false,
          error: 'Approval failed'
        });

        await expect(service.approveDocument('doc-123', 'user-123')).rejects.toThrow('Approval failed');
      });
    });

    describe('rejectDocument', () => {
      it('should reject document', async () => {
        const result = await service.rejectDocument('doc-123', 'user-123', 'Technical issues', 'Details here');

        expect(mockUnifiedApprovalService.processApprovalAction).toHaveBeenCalledWith(
          'DOCUMENT',
          'doc-123',
          'REJECT',
          'user-123',
          'Technical issues: Details here'
        );
        expect(result.success).toBe(true);
      });
    });

    describe('getDocumentApprovalStatus', () => {
      it('should get document approval status', async () => {
        const result = await service.getDocumentApprovalStatus('doc-123');

        expect(mockUnifiedApprovalService.getApprovalStatus).toHaveBeenCalledWith('DOCUMENT', 'doc-123');
        expect(result.hasActiveWorkflow).toBe(true);
      });
    });

    describe('getPendingDocumentApprovals', () => {
      it('should get pending document approvals for user', async () => {
        const result = await service.getPendingDocumentApprovals('user-123');

        expect(mockUnifiedApprovalService.getPendingApprovalsForUser).toHaveBeenCalledWith('user-123');
        expect(result).toHaveLength(1);
        expect(result[0].entityType).toBe('DOCUMENT');
      });
    });

    describe('completeReviewWithWorkflow', () => {
      it('should complete review and trigger approval workflow', async () => {
        const inProgressAssignment = {
          ...mockReviewAssignment,
          status: ReviewStatus.IN_PROGRESS
        };
        const completedAssignment = {
          ...inProgressAssignment,
          status: ReviewStatus.COMPLETED
        };

        mockPrisma.reviewAssignment.findUnique.mockResolvedValue(inProgressAssignment);
        mockPrisma.reviewAssignment.update.mockResolvedValue(completedAssignment);

        const result = await service.completeReviewWithWorkflow(
          mockReviewAssignment.id,
          mockReviewOutcome,
          mockReviewAssignment.reviewerId,
          true
        );

        expect(result).toEqual(completedAssignment);
        expect(mockUnifiedApprovalService.initiateApproval).toHaveBeenCalledWith(
          expect.objectContaining({
            entityId: mockReviewAssignment.documentId,
            entityType: 'DOCUMENT'
          }),
          mockReviewAssignment.reviewerId
        );
      });

      it('should complete review without triggering workflow', async () => {
        const inProgressAssignment = {
          ...mockReviewAssignment,
          status: ReviewStatus.IN_PROGRESS
        };
        const completedAssignment = {
          ...inProgressAssignment,
          status: ReviewStatus.COMPLETED
        };

        mockPrisma.reviewAssignment.findUnique.mockResolvedValue(inProgressAssignment);
        mockPrisma.reviewAssignment.update.mockResolvedValue(completedAssignment);

        const result = await service.completeReviewWithWorkflow(
          mockReviewAssignment.id,
          mockReviewOutcome,
          mockReviewAssignment.reviewerId,
          false
        );

        expect(result).toEqual(completedAssignment);
        expect(mockUnifiedApprovalService.initiateApproval).not.toHaveBeenCalled();
      });

      it('should not trigger approval for reject recommendation', async () => {
        const rejectOutcome = {
          ...mockReviewOutcome,
          recommendation: ReviewRecommendation.REJECT
        };
        const inProgressAssignment = {
          ...mockReviewAssignment,
          status: ReviewStatus.IN_PROGRESS
        };

        mockPrisma.reviewAssignment.findUnique.mockResolvedValue(inProgressAssignment);
        mockPrisma.reviewAssignment.update.mockResolvedValue(inProgressAssignment);

        await service.completeReviewWithWorkflow(
          mockReviewAssignment.id,
          rejectOutcome,
          mockReviewAssignment.reviewerId,
          true
        );

        expect(mockUnifiedApprovalService.initiateApproval).not.toHaveBeenCalled();
      });
    });
  });

  describe('Manufacturing Scenarios', () => {
    it('should handle aerospace SOP review workflow', async () => {
      const aerospaceInput = {
        ...mockReviewInput,
        documentType: 'AEROSPACE_SOP',
        reviewType: ReviewType.SAFETY,
        focusAreas: ['safety', 'compliance', 'AS9100'],
        isRequired: true
      };

      mockPrisma.reviewAssignment.findUnique.mockResolvedValue(null);
      mockPrisma.reviewAssignment.create.mockResolvedValue({
        ...mockReviewAssignment,
        ...aerospaceInput
      });

      const result = await service.assignReview(aerospaceInput);

      expect(result.focusAreas).toContain('AS9100');
      expect(result.reviewType).toBe(ReviewType.SAFETY);
    });

    it('should handle quality review with checklist progress tracking', async () => {
      const qualityChecklist = service.createChecklistTemplate(ReviewType.QUALITY);
      const assignmentWithProgress = {
        ...mockReviewAssignment,
        checklistItems: qualityChecklist.map((item, index) => ({
          ...item,
          isCompleted: index === 0 // First item completed
        }))
      };

      mockPrisma.reviewAssignment.findUnique.mockResolvedValue(assignmentWithProgress);
      mockPrisma.documentComment.count.mockResolvedValue(2);
      mockPrisma.documentAnnotation.count.mockResolvedValue(1);

      const progress = await service.getReviewProgress(mockReviewAssignment.id);

      expect(progress.checklistProgress.total).toBe(2);
      expect(progress.checklistProgress.completed).toBe(1);
      expect(progress.checklistProgress.percentage).toBe(50);
    });

    it('should handle batch review assignment for document revisions', async () => {
      const reviewInputs = [
        { ...mockReviewInput, reviewerId: 'reviewer-1', reviewerName: 'Technical Reviewer' },
        { ...mockReviewInput, reviewerId: 'reviewer-2', reviewerName: 'Safety Reviewer', reviewType: ReviewType.SAFETY },
        { ...mockReviewInput, reviewerId: 'reviewer-3', reviewerName: 'Quality Reviewer', reviewType: ReviewType.QUALITY }
      ];

      mockPrisma.reviewAssignment.findUnique.mockResolvedValue(null);
      mockPrisma.reviewAssignment.create
        .mockResolvedValueOnce({ ...mockReviewAssignment, id: 'review-1', reviewerId: 'reviewer-1' })
        .mockResolvedValueOnce({ ...mockReviewAssignment, id: 'review-2', reviewerId: 'reviewer-2', reviewType: ReviewType.SAFETY })
        .mockResolvedValueOnce({ ...mockReviewAssignment, id: 'review-3', reviewerId: 'reviewer-3', reviewType: ReviewType.QUALITY });

      const results = await Promise.all(reviewInputs.map(input => service.assignReview(input)));

      expect(results).toHaveLength(3);
      expect(results[0].reviewerId).toBe('reviewer-1');
      expect(results[1].reviewType).toBe(ReviewType.SAFETY);
      expect(results[2].reviewType).toBe(ReviewType.QUALITY);
    });

    it('should handle overdue review escalation workflow', async () => {
      const overdueReviews = [
        {
          ...mockReviewAssignment,
          id: 'overdue-critical',
          deadline: new Date(Date.now() - 7 * 86400000), // 7 days overdue
          status: ReviewStatus.IN_PROGRESS,
          isRequired: true
        }
      ];

      mockPrisma.reviewAssignment.findMany
        .mockResolvedValueOnce(overdueReviews)
        .mockResolvedValueOnce(overdueReviews.map(r => ({ ...r, status: ReviewStatus.OVERDUE })));
      mockPrisma.reviewAssignment.updateMany.mockResolvedValue({ count: 1 });

      const results = await service.getOverdueReviews();

      expect(results[0].status).toBe(ReviewStatus.OVERDUE);
      expect(mockPrisma.reviewAssignment.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['overdue-critical'] } },
        data: { status: ReviewStatus.OVERDUE }
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle concurrent review assignment attempts', async () => {
      // First call succeeds, second call fails due to existing review
      mockPrisma.reviewAssignment.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockReviewAssignment);
      mockPrisma.reviewAssignment.create.mockResolvedValue(mockReviewAssignment);

      // First assignment should succeed
      await expect(service.assignReview(mockReviewInput)).resolves.toEqual(mockReviewAssignment);

      // Second assignment should fail
      await expect(service.assignReview(mockReviewInput)).rejects.toThrow('Review already assigned');
    });

    it('should handle malformed checklist data', async () => {
      const malformedChecklist = [
        { id: 'item-1', isCompleted: true }, // Missing required fields
        null,
        undefined
      ] as any;

      mockPrisma.reviewAssignment.findUnique.mockResolvedValue(mockReviewAssignment);
      mockPrisma.reviewAssignment.update.mockResolvedValue({
        ...mockReviewAssignment,
        checklistItems: malformedChecklist
      });

      await expect(service.updateChecklist(mockReviewAssignment.id, malformedChecklist, mockReviewAssignment.reviewerId))
        .resolves.toBeDefined();
    });

    it('should handle database connection issues', async () => {
      mockPrisma.reviewAssignment.findUnique.mockRejectedValue(new Error('Connection timeout'));

      await expect(service.startReview(mockReviewAssignment.id, mockReviewAssignment.reviewerId))
        .rejects.toThrow(AppError);
    });

    it('should handle extremely large review datasets', async () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        ...mockReviewAssignment,
        id: `review-${i}`,
        reviewerId: `user-${i % 100}` // 100 different reviewers
      }));

      mockPrisma.reviewAssignment.findMany.mockResolvedValue(largeDataset);

      const stats = await service.getReviewStats();

      expect(stats.totalReviews).toBe(10000);
    });

    it('should handle workflow integration failures gracefully', async () => {
      mockUnifiedApprovalService.initiateApproval.mockRejectedValue(new Error('Workflow service unavailable'));

      await expect(service.submitDocumentForApproval('doc-123', 'SOP', 'user-123'))
        .rejects.toThrow('Workflow service unavailable');
    });
  });

  describe('disconnect', () => {
    it('should disconnect from database', async () => {
      await service.disconnect();
      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });
  });

  describe('Performance and Optimization', () => {
    it('should efficiently handle bulk review status updates', async () => {
      const bulkReviews = Array.from({ length: 100 }, (_, i) => ({
        id: `review-${i}`,
        deadline: new Date(Date.now() - 86400000) // All overdue
      }));

      mockPrisma.reviewAssignment.findMany.mockResolvedValue(bulkReviews);
      mockPrisma.reviewAssignment.updateMany.mockResolvedValue({ count: 100 });

      await service.getOverdueReviews();

      expect(mockPrisma.reviewAssignment.updateMany).toHaveBeenCalledOnce();
    });

    it('should optimize review statistics queries', async () => {
      const optimizedSelect = {
        status: true,
        reviewType: true,
        assignedAt: true,
        completedAt: true,
        timeSpent: true,
        deadline: true
      };

      mockPrisma.reviewAssignment.findMany.mockResolvedValue([]);

      await service.getReviewStats('user-123');

      expect(mockPrisma.reviewAssignment.findMany).toHaveBeenCalledWith({
        where: { reviewerId: 'user-123' },
        select: optimizedSelect
      });
    });

    it('should handle complex filter combinations efficiently', async () => {
      const complexFilters: ReviewFilters = {
        status: ReviewStatus.IN_PROGRESS,
        reviewType: ReviewType.TECHNICAL,
        isRequired: true,
        overdue: false,
        assignedAfter: new Date('2024-01-01'),
        deadline: new Date('2024-12-31'),
        limit: 50,
        offset: 100
      };

      mockPrisma.reviewAssignment.findMany.mockResolvedValue([]);

      await service.getMyReviews('user-123', complexFilters);

      expect(mockPrisma.reviewAssignment.findMany).toHaveBeenCalledWith({
        where: {
          reviewerId: 'user-123',
          status: ReviewStatus.IN_PROGRESS,
          reviewType: ReviewType.TECHNICAL,
          isRequired: true,
          assignedAt: { gte: complexFilters.assignedAfter },
          deadline: { lte: complexFilters.deadline }
        },
        orderBy: [
          { deadline: 'asc' },
          { assignedAt: 'desc' }
        ],
        take: 50,
        skip: 100
      });
    });
  });
});