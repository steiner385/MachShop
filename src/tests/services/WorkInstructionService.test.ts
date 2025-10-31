import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { WorkInstructionService } from '../../services/WorkInstructionService';
import { WorkInstructionStatus } from '../../types/workInstruction';

// Mock Prisma Client
vi.mock('../../lib/database', () => {
  const mockPrismaClient = {
    workInstruction: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    workInstructionStep: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  return {
    PrismaClient: vi.fn(() => mockPrismaClient),
    WorkInstructionStatus: {
      DRAFT: 'DRAFT',
      REVIEW: 'REVIEW',
      APPROVED: 'APPROVED',
      SUPERSEDED: 'SUPERSEDED',
      ARCHIVED: 'ARCHIVED',
    },
  };
});

describe('WorkInstructionService', () => {
  let service: WorkInstructionService;
  let mockPrisma: any;

  beforeEach(() => {
    service = new WorkInstructionService();
    mockPrisma = new PrismaClient();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createWorkInstruction', () => {
    it('should create a work instruction successfully', async () => {
      const mockData = {
        title: 'Test Work Instruction',
        description: 'Test description',
        version: '1.0.0',
      };

      const mockUserId = 'user-123';

      const mockResult = {
        id: 'wi-123',
        ...mockData,
        createdById: mockUserId,
        updatedById: mockUserId,
        status: WorkInstructionStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: {
          id: mockUserId,
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
        },
        updatedBy: {
          id: mockUserId,
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
        },
        approvedBy: null,
        steps: [],
      };

      mockPrisma.workInstruction.create.mockResolvedValue(mockResult);

      const result = await service.createWorkInstruction(mockData, mockUserId);

      expect(mockPrisma.workInstruction.create).toHaveBeenCalledWith({
        data: {
          ...mockData,
          createdById: mockUserId,
          updatedById: mockUserId,
        },
        include: expect.any(Object),
      });

      expect(result).toEqual(mockResult);
      expect(result.title).toBe(mockData.title);
      expect(result.createdById).toBe(mockUserId);
    });

    it('should handle errors when creating work instruction', async () => {
      const mockData = {
        title: 'Test Work Instruction',
      };

      const mockUserId = 'user-123';
      const mockError = new Error('Database error');

      mockPrisma.workInstruction.create.mockRejectedValue(mockError);

      await expect(
        service.createWorkInstruction(mockData, mockUserId)
      ).rejects.toThrow('Database error');
    });
  });

  describe('getWorkInstructionById', () => {
    it('should return work instruction by ID', async () => {
      const mockId = 'wi-123';
      const mockResult = {
        id: mockId,
        title: 'Test Work Instruction',
        status: WorkInstructionStatus.DRAFT,
        version: '1.0.0',
        createdBy: {
          id: 'user-123',
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
        },
        steps: [
          {
            id: 'step-1',
            stepNumber: 1,
            title: 'Step 1',
            content: 'Content',
            imageUrls: [],
            videoUrls: [],
            attachmentUrls: [],
          },
        ],
      };

      mockPrisma.workInstruction.findUnique.mockResolvedValue(mockResult);

      const result = await service.getWorkInstructionById(mockId);

      expect(mockPrisma.workInstruction.findUnique).toHaveBeenCalledWith({
        where: { id: mockId },
        include: expect.any(Object),
      });

      expect(result).toEqual(mockResult);
      expect(result?.id).toBe(mockId);
      expect(result?.steps).toHaveLength(1);
    });

    it('should return null if work instruction not found', async () => {
      const mockId = 'non-existent';

      mockPrisma.workInstruction.findUnique.mockResolvedValue(null);

      const result = await service.getWorkInstructionById(mockId);

      expect(result).toBeNull();
    });
  });

  describe('listWorkInstructions', () => {
    it('should list work instructions with default parameters', async () => {
      const mockData = [
        {
          id: 'wi-1',
          title: 'Work Instruction 1',
          status: WorkInstructionStatus.DRAFT,
          version: '1.0.0',
          createdBy: { id: 'user-1', username: 'user1' },
          steps: [],
        },
        {
          id: 'wi-2',
          title: 'Work Instruction 2',
          status: WorkInstructionStatus.APPROVED,
          version: '1.0.0',
          createdBy: { id: 'user-2', username: 'user2' },
          steps: [],
        },
      ];

      const mockCount = 2;

      mockPrisma.workInstruction.findMany.mockResolvedValue(mockData);
      mockPrisma.workInstruction.count.mockResolvedValue(mockCount);

      const result = await service.listWorkInstructions({});

      expect(result.data).toEqual(mockData);
      expect(result.total).toBe(mockCount);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('should filter work instructions by status', async () => {
      const mockData = [
        {
          id: 'wi-1',
          title: 'Approved Work Instruction',
          status: WorkInstructionStatus.APPROVED,
        },
      ];

      mockPrisma.workInstruction.findMany.mockResolvedValue(mockData);
      mockPrisma.workInstruction.count.mockResolvedValue(1);

      await service.listWorkInstructions({
        status: WorkInstructionStatus.APPROVED,
      });

      expect(mockPrisma.workInstruction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: WorkInstructionStatus.APPROVED,
          }),
        })
      );
    });

    it('should search work instructions by title', async () => {
      const searchTerm = 'blade assembly';

      mockPrisma.workInstruction.findMany.mockResolvedValue([]);
      mockPrisma.workInstruction.count.mockResolvedValue(0);

      await service.listWorkInstructions({
        search: searchTerm,
      });

      expect(mockPrisma.workInstruction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { title: { contains: searchTerm, mode: 'insensitive' } },
            ]),
          }),
        })
      );
    });

    it('should paginate results correctly', async () => {
      mockPrisma.workInstruction.findMany.mockResolvedValue([]);
      mockPrisma.workInstruction.count.mockResolvedValue(100);

      const result = await service.listWorkInstructions({
        page: 3,
        pageSize: 10,
      });

      expect(mockPrisma.workInstruction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (page 3 - 1) * 10
          take: 10,
        })
      );

      expect(result.totalPages).toBe(10); // 100 / 10
    });
  });

  describe('updateWorkInstruction', () => {
    it('should update work instruction successfully', async () => {
      const mockId = 'wi-123';
      const mockUserId = 'user-123';
      const mockData = {
        title: 'Updated Title',
        description: 'Updated description',
      };

      const mockResult = {
        id: mockId,
        ...mockData,
        updatedById: mockUserId,
        updatedAt: new Date(),
      };

      mockPrisma.workInstruction.update.mockResolvedValue(mockResult);

      const result = await service.updateWorkInstruction(mockId, mockData, mockUserId);

      expect(mockPrisma.workInstruction.update).toHaveBeenCalledWith({
        where: { id: mockId },
        data: {
          ...mockData,
          updatedById: mockUserId,
        },
        include: expect.any(Object),
      });

      expect(result.title).toBe(mockData.title);
    });
  });

  describe('deleteWorkInstruction', () => {
    it('should delete work instruction successfully', async () => {
      const mockId = 'wi-123';

      mockPrisma.workInstruction.delete.mockResolvedValue({ id: mockId });

      await service.deleteWorkInstruction(mockId);

      expect(mockPrisma.workInstruction.delete).toHaveBeenCalledWith({
        where: { id: mockId },
      });
    });
  });

  describe('addStep', () => {
    it('should add step to work instruction', async () => {
      const mockWorkInstructionId = 'wi-123';
      const mockStepData = {
        stepNumber: 1,
        title: 'Step 1',
        content: 'Step content',
        imageUrls: [],
        videoUrls: [],
        attachmentUrls: [],
        isCritical: false,
        requiresSignature: false,
      };

      const mockResult = {
        id: 'step-123',
        workInstructionId: mockWorkInstructionId,
        ...mockStepData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.workInstructionStep.create.mockResolvedValue(mockResult);

      const result = await service.addStep(mockWorkInstructionId, mockStepData);

      expect(mockPrisma.workInstructionStep.create).toHaveBeenCalledWith({
        data: {
          workInstructionId: mockWorkInstructionId,
          ...mockStepData,
        },
      });

      expect(result.stepNumber).toBe(1);
      expect(result.title).toBe('Step 1');
    });
  });

  describe('updateStep', () => {
    it('should update step successfully', async () => {
      const mockStepId = 'step-123';
      const mockData = {
        title: 'Updated Step Title',
        content: 'Updated content',
      };

      const mockResult = {
        id: mockStepId,
        ...mockData,
        stepNumber: 1,
        workInstructionId: 'wi-123',
        updatedAt: new Date(),
      };

      mockPrisma.workInstructionStep.update.mockResolvedValue(mockResult);

      const result = await service.updateStep(mockStepId, mockData);

      expect(mockPrisma.workInstructionStep.update).toHaveBeenCalledWith({
        where: { id: mockStepId },
        data: mockData,
      });

      expect(result.title).toBe(mockData.title);
    });
  });

  describe('deleteStep', () => {
    it('should delete step successfully', async () => {
      const mockStepId = 'step-123';

      mockPrisma.workInstructionStep.delete.mockResolvedValue({ id: mockStepId });

      await service.deleteStep(mockStepId);

      expect(mockPrisma.workInstructionStep.delete).toHaveBeenCalledWith({
        where: { id: mockStepId },
      });
    });
  });

  // ✅ GITHUB ISSUE #147: Legacy approval tests removed
  // Approval functionality now uses the unified workflow system
  // See: src/tests/services/UnifiedApprovalIntegration.test.ts
  // See: src/tests/unit/approval-double-update-prevention.test.ts

  describe('getWorkInstructionsByPartId', () => {
    it('should return approved work instructions for part', async () => {
      const mockPartId = 'part-123';
      const mockData = [
        {
          id: 'wi-1',
          partId: mockPartId,
          status: WorkInstructionStatus.APPROVED,
          version: '2.0.0',
        },
        {
          id: 'wi-2',
          partId: mockPartId,
          status: WorkInstructionStatus.APPROVED,
          version: '1.0.0',
        },
      ];

      mockPrisma.workInstruction.findMany.mockResolvedValue(mockData);

      const result = await service.getWorkInstructionsByPartId(mockPartId);

      expect(mockPrisma.workInstruction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            partId: mockPartId,
            status: WorkInstructionStatus.APPROVED,
          },
        })
      );

      expect(result).toEqual(mockData);
    });
  });

  describe('reorderSteps', () => {
    it('should reorder steps in work instruction', async () => {
      const mockWorkInstructionId = 'wi-123';
      const mockStepOrder = [
        { stepId: 'step-1', newStepNumber: 2 },
        { stepId: 'step-2', newStepNumber: 1 },
      ];

      mockPrisma.$transaction.mockResolvedValue([]);

      await service.reorderSteps(mockWorkInstructionId, mockStepOrder);

      expect(mockPrisma.$transaction).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.any(Object),
          expect.any(Object),
        ])
      );
    });
  });
});
