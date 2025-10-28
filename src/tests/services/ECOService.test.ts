/**
 * ✅ GITHUB ISSUE #22: ECO Service Unit Tests
 *
 * Comprehensive unit tests for ECOService covering:
 * - ECO lifecycle management
 * - Impact analysis
 * - Task management
 * - Status transitions
 * - Attachment handling
 */

import { PrismaClient } from '@prisma/client';
import { ECOService } from '../../services/ECOService';
import { ECOCreateInput, ECOUpdateInput, ECOTaskCreateInput } from '../../types/eco';
import {
  ECOType,
  ECOPriority,
  ECOStatus,
  ECOTaskType,
  ECOTaskStatus,
  AttachmentType
} from '@prisma/client';

// Mock Prisma Client
const mockPrisma = {
  engineeringChangeOrder: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn()
  },
  eCOTask: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn()
  },
  eCOAffectedDocument: {
    create: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn()
  },
  eCOAttachment: {
    create: jest.fn(),
    findMany: jest.fn()
  },
  eCOHistory: {
    create: jest.fn(),
    findMany: jest.fn()
  },
  workInstruction: {
    findMany: jest.fn()
  },
  setupSheet: {
    findMany: jest.fn()
  },
  $transaction: jest.fn()
} as unknown as PrismaClient;

describe('ECOService', () => {
  let ecoService: ECOService;

  beforeEach(() => {
    ecoService = new ECOService(mockPrisma);
    jest.clearAllMocks();
  });

  describe('createECO', () => {
    const validECOInput: ECOCreateInput = {
      title: 'Test ECO Title',
      description: 'Test ECO Description',
      ecoType: ECOType.IMPROVEMENT,
      priority: ECOPriority.MEDIUM,
      currentState: 'Current process state',
      proposedChange: 'Proposed improvement',
      reasonForChange: 'Efficiency improvement needed',
      requestorId: 'user-123',
      requestorName: 'John Doe',
      requestorDept: 'Engineering',
      affectedParts: ['PART-001', 'PART-002'],
      affectedOperations: ['OP-001'],
      estimatedCost: 5000,
      estimatedSavings: 10000
    };

    it('should create ECO successfully with valid input', async () => {
      const mockCreatedECO = {
        id: 'eco-123',
        ecoNumber: 'ECO-2024-I-0001',
        ...validECOInput,
        status: ECOStatus.REQUESTED,
        createdAt: new Date(),
        updatedAt: new Date(),
        affectedDocuments: [],
        tasks: [],
        attachments: [],
        history: [],
        crbReviews: [],
        relatedECOs: []
      };

      mockPrisma.engineeringChangeOrder.create.mockResolvedValue(mockCreatedECO);
      mockPrisma.engineeringChangeOrder.findFirst.mockResolvedValue(null); // No existing ECO for number generation

      const result = await ecoService.createECO(validECOInput);

      expect(mockPrisma.engineeringChangeOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: validECOInput.title,
            description: validECOInput.description,
            ecoType: validECOInput.ecoType,
            priority: validECOInput.priority,
            status: ECOStatus.REQUESTED
          }),
          include: expect.any(Object)
        })
      );

      expect(result.id).toBe('eco-123');
      expect(result.ecoNumber).toMatch(/^ECO-\d{4}-\w-\d{4}$/);
      expect(result.status).toBe(ECOStatus.REQUESTED);
    });

    it('should throw validation error for missing title', async () => {
      const invalidInput = { ...validECOInput, title: '' };

      await expect(ecoService.createECO(invalidInput)).rejects.toThrow('Title is required');
    });

    it('should throw validation error for missing description', async () => {
      const invalidInput = { ...validECOInput, description: '' };

      await expect(ecoService.createECO(invalidInput)).rejects.toThrow('Description is required');
    });

    it('should generate correct ECO number format', async () => {
      const mockCreatedECO = {
        id: 'eco-123',
        ecoNumber: 'ECO-2024-I-0001',
        ...validECOInput,
        status: ECOStatus.REQUESTED
      };

      mockPrisma.engineeringChangeOrder.create.mockResolvedValue(mockCreatedECO);
      mockPrisma.engineeringChangeOrder.findFirst.mockResolvedValue(null);

      const result = await ecoService.createECO(validECOInput);

      expect(result.ecoNumber).toMatch(/^ECO-\d{4}-[A-Z]-\d{4}$/);
    });
  });

  describe('updateECO', () => {
    it('should update ECO successfully', async () => {
      const ecoId = 'eco-123';
      const updateInput: ECOUpdateInput = {
        title: 'Updated ECO Title',
        estimatedCost: 7500
      };

      const mockExistingECO = {
        id: ecoId,
        requestorId: 'user-123',
        sponsorId: null,
        status: ECOStatus.REQUESTED
      };

      const mockUpdatedECO = {
        ...mockExistingECO,
        ...updateInput,
        updatedAt: new Date()
      };

      mockPrisma.engineeringChangeOrder.findUnique.mockResolvedValue(mockExistingECO);
      mockPrisma.engineeringChangeOrder.update.mockResolvedValue(mockUpdatedECO);

      const result = await ecoService.updateECO(ecoId, updateInput, 'user-123');

      expect(mockPrisma.engineeringChangeOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: ecoId },
          data: expect.objectContaining(updateInput)
        })
      );

      expect(result.title).toBe(updateInput.title);
      expect(result.estimatedCost).toBe(updateInput.estimatedCost);
    });

    it('should throw permission error for unauthorized user', async () => {
      const ecoId = 'eco-123';
      const updateInput: ECOUpdateInput = { title: 'Updated Title' };

      const mockExistingECO = {
        id: ecoId,
        requestorId: 'user-456',
        sponsorId: null
      };

      mockPrisma.engineeringChangeOrder.findUnique.mockResolvedValue(mockExistingECO);

      await expect(ecoService.updateECO(ecoId, updateInput, 'user-123')).rejects.toThrow(
        'User does not have permission to update this ECO'
      );
    });
  });

  describe('changeECOStatus', () => {
    it('should change status successfully with valid transition', async () => {
      const ecoId = 'eco-123';
      const mockECO = {
        id: ecoId,
        status: ECOStatus.REQUESTED,
        ecoNumber: 'ECO-2024-I-0001'
      };

      const mockUpdatedECO = {
        ...mockECO,
        status: ECOStatus.UNDER_REVIEW
      };

      mockPrisma.engineeringChangeOrder.findUnique.mockResolvedValue(mockECO);
      mockPrisma.engineeringChangeOrder.update.mockResolvedValue(mockUpdatedECO);

      const result = await ecoService.changeECOStatus(
        ecoId,
        ECOStatus.UNDER_REVIEW,
        'user-123',
        'Moving to review'
      );

      expect(result.status).toBe(ECOStatus.UNDER_REVIEW);
    });

    it('should throw error for invalid status transition', async () => {
      const ecoId = 'eco-123';
      const mockECO = {
        id: ecoId,
        status: ECOStatus.COMPLETED
      };

      mockPrisma.engineeringChangeOrder.findUnique.mockResolvedValue(mockECO);

      await expect(
        ecoService.changeECOStatus(ecoId, ECOStatus.REQUESTED, 'user-123')
      ).rejects.toThrow('Invalid status transition');
    });
  });

  describe('completeECO', () => {
    it('should complete ECO when all tasks are done', async () => {
      const ecoId = 'eco-123';
      const mockECO = {
        id: ecoId,
        status: ECOStatus.VERIFICATION,
        ecoNumber: 'ECO-2024-I-0001'
      };

      mockPrisma.engineeringChangeOrder.findUnique.mockResolvedValue(mockECO);
      mockPrisma.eCOTask.count.mockResolvedValue(0); // No pending tasks
      mockPrisma.engineeringChangeOrder.update.mockResolvedValue({
        ...mockECO,
        status: ECOStatus.COMPLETED
      });

      const result = await ecoService.completeECO(ecoId, 'user-123');

      expect(result.status).toBe(ECOStatus.COMPLETED);
    });

    it('should throw error if tasks are still pending', async () => {
      const ecoId = 'eco-123';
      const mockECO = {
        id: ecoId,
        status: ECOStatus.IMPLEMENTATION
      };

      mockPrisma.engineeringChangeOrder.findUnique.mockResolvedValue(mockECO);
      mockPrisma.eCOTask.count.mockResolvedValue(3); // 3 pending tasks

      await expect(ecoService.completeECO(ecoId, 'user-123')).rejects.toThrow(
        'Cannot complete ECO: 3 tasks are not completed'
      );
    });
  });

  describe('createTask', () => {
    it('should create task successfully', async () => {
      const ecoId = 'eco-123';
      const taskInput: ECOTaskCreateInput = {
        taskName: 'Update Documentation',
        description: 'Update work instructions',
        taskType: ECOTaskType.DOCUMENT_UPDATE,
        assignedToId: 'user-456',
        assignedToName: 'Jane Smith',
        dueDate: new Date('2024-12-31')
      };

      const mockCreatedTask = {
        id: 'task-123',
        ecoId,
        ...taskInput,
        status: ECOTaskStatus.PENDING,
        createdAt: new Date()
      };

      mockPrisma.engineeringChangeOrder.findUnique.mockResolvedValue({ id: ecoId });
      mockPrisma.eCOTask.create.mockResolvedValue(mockCreatedTask);

      const result = await ecoService.createTask(ecoId, taskInput);

      expect(mockPrisma.eCOTask.create).toHaveBeenCalledWith({
        data: {
          ecoId,
          ...taskInput
        }
      });

      expect(result.id).toBe('task-123');
      expect(result.taskName).toBe(taskInput.taskName);
      expect(result.status).toBe(ECOTaskStatus.PENDING);
    });
  });

  describe('completeTask', () => {
    it('should complete task successfully', async () => {
      const taskId = 'task-123';
      const notes = 'Task completed successfully';

      const mockUpdatedTask = {
        id: taskId,
        ecoId: 'eco-123',
        taskName: 'Update Documentation',
        status: ECOTaskStatus.COMPLETED,
        completedAt: new Date(),
        completionNotes: notes
      };

      mockPrisma.eCOTask.update.mockResolvedValue(mockUpdatedTask);

      const result = await ecoService.completeTask(taskId, notes, 'user-123');

      expect(mockPrisma.eCOTask.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: taskId },
          data: expect.objectContaining({
            status: ECOTaskStatus.COMPLETED,
            completionNotes: notes
          })
        })
      );

      expect(result.status).toBe(ECOTaskStatus.COMPLETED);
      expect(result.completionNotes).toBe(notes);
    });
  });

  describe('analyzeImpact', () => {
    it('should analyze impact and identify affected documents', async () => {
      const ecoId = 'eco-123';
      const mockECO = {
        id: ecoId,
        affectedParts: ['PART-001', 'PART-002'],
        affectedOperations: ['OP-001'],
        estimatedCost: 5000,
        priority: ECOPriority.MEDIUM
      };

      const mockWorkInstructions = [
        { id: 'wi-001', title: 'Work Instruction 1', version: '1.0' },
        { id: 'wi-002', title: 'Work Instruction 2', version: '2.0' }
      ];

      const mockSetupSheets = [
        { id: 'ss-001', name: 'Setup Sheet 1', version: '1.0' }
      ];

      mockPrisma.engineeringChangeOrder.findUnique.mockResolvedValue(mockECO);
      mockPrisma.workInstruction.findMany.mockResolvedValue(mockWorkInstructions);
      mockPrisma.setupSheet.findMany.mockResolvedValue(mockSetupSheets);
      mockPrisma.eCOAffectedDocument.upsert.mockResolvedValue({});
      mockPrisma.engineeringChangeOrder.update.mockResolvedValue(mockECO);

      const result = await ecoService.analyzeImpact({ ecoId });

      expect(result.totalDocumentsAffected).toBe(3); // 2 WI + 1 SS
      expect(result.implementationComplexity).toBeDefined();
      expect(result.estimatedImplementationTime).toBeGreaterThan(0);
      expect(result.costImpact).toBeDefined();
      expect(result.operationalImpact).toBeDefined();
    });
  });

  describe('addAttachment', () => {
    it('should add attachment successfully', async () => {
      const ecoId = 'eco-123';
      const attachmentInput = {
        fileName: 'test-document.pdf',
        fileUrl: '/uploads/test-document.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        attachmentType: AttachmentType.SUPPORTING_DOC,
        uploadedById: 'user-123',
        uploadedByName: 'John Doe'
      };

      const mockCreatedAttachment = {
        id: 'attachment-123',
        ecoId,
        ...attachmentInput,
        uploadedAt: new Date()
      };

      mockPrisma.engineeringChangeOrder.findUnique.mockResolvedValue({ id: ecoId });
      mockPrisma.eCOAttachment.create.mockResolvedValue(mockCreatedAttachment);

      const result = await ecoService.addAttachment(ecoId, attachmentInput);

      expect(mockPrisma.eCOAttachment.create).toHaveBeenCalledWith({
        data: {
          ecoId,
          ...attachmentInput
        }
      });

      expect(result.id).toBe('attachment-123');
      expect(result.fileName).toBe(attachmentInput.fileName);
    });
  });

  describe('getECOs', () => {
    it('should return filtered ECOs', async () => {
      const filters = {
        status: [ECOStatus.REQUESTED, ECOStatus.UNDER_REVIEW],
        priority: [ECOPriority.HIGH],
        searchTerm: 'improvement'
      };

      const mockECOs = [
        {
          id: 'eco-1',
          ecoNumber: 'ECO-2024-I-0001',
          title: 'Process Improvement',
          status: ECOStatus.REQUESTED,
          priority: ECOPriority.HIGH
        },
        {
          id: 'eco-2',
          ecoNumber: 'ECO-2024-I-0002',
          title: 'Quality Improvement',
          status: ECOStatus.UNDER_REVIEW,
          priority: ECOPriority.HIGH
        }
      ];

      mockPrisma.engineeringChangeOrder.findMany.mockResolvedValue(mockECOs);

      const result = await ecoService.getECOs(filters);

      expect(mockPrisma.engineeringChangeOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: filters.status },
            priority: { in: filters.priority },
            OR: expect.arrayContaining([
              { title: { contains: filters.searchTerm, mode: 'insensitive' } }
            ])
          })
        })
      );

      expect(result).toHaveLength(2);
      expect(result[0].title).toContain('Improvement');
    });
  });

  describe('getECOById', () => {
    it('should return ECO when found', async () => {
      const ecoId = 'eco-123';
      const mockECO = {
        id: ecoId,
        ecoNumber: 'ECO-2024-I-0001',
        title: 'Test ECO',
        status: ECOStatus.REQUESTED
      };

      mockPrisma.engineeringChangeOrder.findUnique.mockResolvedValue(mockECO);

      const result = await ecoService.getECOById(ecoId);

      expect(result.id).toBe(ecoId);
      expect(result.ecoNumber).toBe('ECO-2024-I-0001');
    });

    it('should throw error when ECO not found', async () => {
      const ecoId = 'non-existent';

      mockPrisma.engineeringChangeOrder.findUnique.mockResolvedValue(null);

      await expect(ecoService.getECOById(ecoId)).rejects.toThrow('ECO not found');
    });
  });
});