import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PartInterchangeabilityService } from '../../services/PartInterchangeabilityService';
import {
  InterchangeabilityType,
  ConfigurationControl,
  SubstitutionType,
  SubstitutionDirection,
  InterchangeabilityApprovalType,
  ApprovalStatus,
  SubstitutionReason,
  AuditAction,
  GroupStatus
} from '@prisma/client';

// Import the database module
import prisma from '../../lib/database';

// Mock the database module
vi.mock('../../lib/database', () => ({
  default: {
    partInterchangeabilityGroup: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    partSubstitution: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    interchangeabilityApproval: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    workOrderPartSubstitution: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    interchangeabilityAuditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    part: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    workOrder: {
      findUnique: vi.fn(),
    },
    operation: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('PartInterchangeabilityService', () => {
  let service: PartInterchangeabilityService;
  const mockPrisma = prisma as any;

  beforeEach(() => {
    service = PartInterchangeabilityService.getInstance();
    vi.clearAllMocks();
  });

  // ==================== INTERCHANGEABILITY GROUPS ====================

  describe('createInterchangeabilityGroup', () => {
    it('should create a new interchangeability group successfully', async () => {
      const mockGroup = {
        id: 'group-123',
        name: 'Test Group',
        description: 'Test Description',
        type: InterchangeabilityType.FORM_FIT_FUNCTION,
        configurationControl: ConfigurationControl.FULL_PROPAGATION,
        status: GroupStatus.ACTIVE,
        createdBy: 'user-123',
        createdAt: new Date(),
      };

      const mockUser = { id: 'user-123', username: 'testuser' };

      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(mockPrisma.partInterchangeabilityGroup.create).mockResolvedValue(mockGroup);
      vi.mocked(mockPrisma.interchangeabilityAuditLog.create).mockResolvedValue({});

      const groupData = {
        name: 'Test Group',
        description: 'Test Description',
        type: InterchangeabilityType.FORM_FIT_FUNCTION,
        configurationControl: ConfigurationControl.FULL_PROPAGATION,
        createdBy: 'user-123'
      };

      const result = await service.createInterchangeabilityGroup(groupData);

      expect(result).toEqual(mockGroup);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' }
      });
      expect(mockPrisma.partInterchangeabilityGroup.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Test Group',
          description: 'Test Description',
          type: InterchangeabilityType.FORM_FIT_FUNCTION,
          configurationControl: ConfigurationControl.FULL_PROPAGATION,
          createdBy: 'user-123',
          status: GroupStatus.ACTIVE
        }),
        include: expect.any(Object)
      });
    });

    it('should throw error if user not found', async () => {
      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(null);

      const groupData = {
        name: 'Test Group',
        type: InterchangeabilityType.FORM_FIT_FUNCTION,
        configurationControl: ConfigurationControl.FULL_PROPAGATION,
        createdBy: 'invalid-user'
      };

      await expect(service.createInterchangeabilityGroup(groupData))
        .rejects.toThrow('User invalid-user not found');
    });

    it('should throw error if name is empty', async () => {
      const groupData = {
        name: '',
        type: InterchangeabilityType.FORM_FIT_FUNCTION,
        configurationControl: ConfigurationControl.FULL_PROPAGATION,
        createdBy: 'user-123'
      };

      await expect(service.createInterchangeabilityGroup(groupData))
        .rejects.toThrow('Group name is required');
    });
  });

  describe('searchInterchangeabilityGroups', () => {
    it('should search groups with pagination', async () => {
      const mockGroups = [
        {
          id: 'group-1',
          name: 'Group 1',
          type: InterchangeabilityType.FORM_FIT_FUNCTION,
          status: GroupStatus.ACTIVE,
        },
        {
          id: 'group-2',
          name: 'Group 2',
          type: InterchangeabilityType.INTERFACE_ONLY,
          status: GroupStatus.ACTIVE,
        }
      ];

      vi.mocked(mockPrisma.partInterchangeabilityGroup.findMany).mockResolvedValue(mockGroups);
      vi.mocked(mockPrisma.partInterchangeabilityGroup.count).mockResolvedValue(25);

      const options = {
        page: 1,
        limit: 10,
        search: 'Group',
        type: InterchangeabilityType.FORM_FIT_FUNCTION
      };

      const result = await service.searchInterchangeabilityGroups(options);

      expect(result.data).toEqual(mockGroups);
      expect(result.total).toBe(25);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(3);
      expect(mockPrisma.partInterchangeabilityGroup.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              OR: [
                { name: { contains: 'Group', mode: 'insensitive' } },
                { description: { contains: 'Group', mode: 'insensitive' } }
              ]
            },
            { type: InterchangeabilityType.FORM_FIT_FUNCTION }
          ]
        },
        include: expect.any(Object),
        orderBy: { name: 'asc' },
        skip: 0,
        take: 10
      });
    });
  });

  // ==================== PART SUBSTITUTIONS ====================

  describe('createPartSubstitution', () => {
    it('should create a new part substitution successfully', async () => {
      const mockFromPart = { id: 'part-1', partNumber: 'P001' };
      const mockToPart = { id: 'part-2', partNumber: 'P002' };
      const mockGroup = { id: 'group-1', name: 'Test Group' };
      const mockUser = { id: 'user-123', username: 'testuser' };

      const mockSubstitution = {
        id: 'sub-123',
        fromPartId: 'part-1',
        toPartId: 'part-2',
        groupId: 'group-1',
        type: SubstitutionType.DIRECT,
        direction: SubstitutionDirection.BIDIRECTIONAL,
        quantityRatio: 1.0,
        priority: 1,
        createdBy: 'user-123',
        status: GroupStatus.ACTIVE
      };

      vi.mocked(mockPrisma.part.findUnique)
        .mockResolvedValueOnce(mockFromPart)
        .mockResolvedValueOnce(mockToPart);
      vi.mocked(mockPrisma.partInterchangeabilityGroup.findUnique).mockResolvedValue(mockGroup);
      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(mockPrisma.partSubstitution.findMany).mockResolvedValue([]);
      vi.mocked(mockPrisma.partSubstitution.create).mockResolvedValue(mockSubstitution);

      const substitutionData = {
        fromPartId: 'part-1',
        toPartId: 'part-2',
        groupId: 'group-1',
        type: SubstitutionType.DIRECT,
        direction: SubstitutionDirection.BIDIRECTIONAL,
        quantityRatio: 1.0,
        priority: 1,
        createdBy: 'user-123'
      };

      const result = await service.createPartSubstitution(substitutionData);

      expect(result).toEqual(mockSubstitution);
      expect(mockPrisma.partSubstitution.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fromPartId: 'part-1',
          toPartId: 'part-2',
          groupId: 'group-1',
          type: SubstitutionType.DIRECT,
          direction: SubstitutionDirection.BIDIRECTIONAL,
          quantityRatio: 1.0,
          priority: 1,
          createdBy: 'user-123',
          status: GroupStatus.ACTIVE
        }),
        include: expect.any(Object)
      });
    });

    it('should throw error if from part not found', async () => {
      vi.mocked(mockPrisma.part.findUnique).mockResolvedValue(null);

      const substitutionData = {
        fromPartId: 'invalid-part',
        toPartId: 'part-2',
        groupId: 'group-1',
        type: SubstitutionType.DIRECT,
        direction: SubstitutionDirection.BIDIRECTIONAL,
        createdBy: 'user-123'
      };

      await expect(service.createPartSubstitution(substitutionData))
        .rejects.toThrow('From part invalid-part not found');
    });

    it('should throw error if duplicate substitution exists', async () => {
      const mockFromPart = { id: 'part-1', partNumber: 'P001' };
      const mockToPart = { id: 'part-2', partNumber: 'P002' };
      const mockGroup = { id: 'group-1', name: 'Test Group' };
      const mockUser = { id: 'user-123', username: 'testuser' };

      const existingSubstitution = { id: 'existing-sub' };

      vi.mocked(mockPrisma.part.findUnique)
        .mockResolvedValueOnce(mockFromPart)
        .mockResolvedValueOnce(mockToPart);
      vi.mocked(mockPrisma.partInterchangeabilityGroup.findUnique).mockResolvedValue(mockGroup);
      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(mockPrisma.partSubstitution.findMany).mockResolvedValue([existingSubstitution]);

      const substitutionData = {
        fromPartId: 'part-1',
        toPartId: 'part-2',
        groupId: 'group-1',
        type: SubstitutionType.DIRECT,
        direction: SubstitutionDirection.BIDIRECTIONAL,
        createdBy: 'user-123'
      };

      await expect(service.createPartSubstitution(substitutionData))
        .rejects.toThrow('Substitution rule already exists between these parts');
    });
  });

  describe('validateSubstitution', () => {
    it('should validate substitution successfully', async () => {
      const mockSubstitution = {
        id: 'sub-123',
        fromPartId: 'part-1',
        toPartId: 'part-2',
        type: SubstitutionType.DIRECT,
        quantityRatio: 1.0,
        effectiveDate: new Date('2024-01-01'),
        expirationDate: new Date('2025-12-31'),
        status: GroupStatus.ACTIVE,
        requiresApproval: false
      };

      vi.mocked(mockPrisma.partSubstitution.findMany).mockResolvedValue([mockSubstitution]);

      const result = await service.validateSubstitution('part-1', 'part-2');

      expect(result.isValid).toBe(true);
      expect(result.canSubstitute).toBe(true);
      expect(result.substitutionRule).toEqual(mockSubstitution);
    });

    it('should return invalid if no substitution rule found', async () => {
      vi.mocked(mockPrisma.partSubstitution.findMany).mockResolvedValue([]);

      const result = await service.validateSubstitution('part-1', 'part-2');

      expect(result.isValid).toBe(false);
      expect(result.canSubstitute).toBe(false);
      expect(result.validationMessages).toContain('No substitution rule found between part-1 and part-2');
    });

    it('should return invalid if substitution is expired', async () => {
      const mockSubstitution = {
        id: 'sub-123',
        fromPartId: 'part-1',
        toPartId: 'part-2',
        type: SubstitutionType.DIRECT,
        quantityRatio: 1.0,
        effectiveDate: new Date('2023-01-01'),
        expirationDate: new Date('2023-12-31'), // Expired
        status: GroupStatus.ACTIVE,
        requiresApproval: false
      };

      vi.mocked(mockPrisma.partSubstitution.findMany).mockResolvedValue([mockSubstitution]);

      const result = await service.validateSubstitution('part-1', 'part-2');

      expect(result.isValid).toBe(false);
      expect(result.canSubstitute).toBe(false);
      expect(result.validationMessages).toContain('Substitution rule has expired');
    });
  });

  // ==================== APPROVAL WORKFLOW ====================

  describe('createApproval', () => {
    it('should create a new approval request successfully', async () => {
      const mockUser = { id: 'user-123', username: 'testuser' };
      const mockApprover = { id: 'approver-123', username: 'approver' };
      const mockApproval = {
        id: 'approval-123',
        type: InterchangeabilityApprovalType.GROUP_CREATION,
        entityId: 'group-123',
        requestedBy: 'user-123',
        approverId: 'approver-123',
        status: ApprovalStatus.PENDING,
        requestReason: 'New group creation',
        priority: 'MEDIUM'
      };

      vi.mocked(mockPrisma.user.findUnique)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockApprover);
      vi.mocked(mockPrisma.interchangeabilityApproval.create).mockResolvedValue(mockApproval);

      const approvalData = {
        type: InterchangeabilityApprovalType.GROUP_CREATION,
        entityId: 'group-123',
        requestedBy: 'user-123',
        approverId: 'approver-123',
        requestReason: 'New group creation',
        priority: 'MEDIUM' as const
      };

      const result = await service.createApproval(approvalData);

      expect(result).toEqual(mockApproval);
      expect(mockPrisma.interchangeabilityApproval.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: InterchangeabilityApprovalType.GROUP_CREATION,
          entityId: 'group-123',
          requestedBy: 'user-123',
          approverId: 'approver-123',
          status: ApprovalStatus.PENDING,
          requestReason: 'New group creation',
          priority: 'MEDIUM'
        }),
        include: expect.any(Object)
      });
    });
  });

  describe('processApproval', () => {
    it('should approve an approval request successfully', async () => {
      const mockApproval = {
        id: 'approval-123',
        type: InterchangeabilityApprovalType.GROUP_CREATION,
        entityId: 'group-123',
        status: ApprovalStatus.PENDING,
        requestedBy: 'user-123',
        approverId: 'approver-123'
      };

      const mockUpdatedApproval = {
        ...mockApproval,
        status: ApprovalStatus.APPROVED,
        processedBy: 'approver-123',
        processedAt: new Date(),
        comments: 'Approved'
      };

      vi.mocked(mockPrisma.interchangeabilityApproval.findUnique).mockResolvedValue(mockApproval);
      vi.mocked(mockPrisma.interchangeabilityApproval.update).mockResolvedValue(mockUpdatedApproval);

      const result = await service.processApproval(
        'approval-123',
        ApprovalStatus.APPROVED,
        'approver-123',
        'Approved'
      );

      expect(result).toEqual(mockUpdatedApproval);
      expect(mockPrisma.interchangeabilityApproval.update).toHaveBeenCalledWith({
        where: { id: 'approval-123' },
        data: {
          status: ApprovalStatus.APPROVED,
          processedBy: 'approver-123',
          processedAt: expect.any(Date),
          comments: 'Approved'
        },
        include: expect.any(Object)
      });
    });

    it('should throw error if approval not found', async () => {
      vi.mocked(mockPrisma.interchangeabilityApproval.findUnique).mockResolvedValue(null);

      await expect(service.processApproval(
        'invalid-approval',
        ApprovalStatus.APPROVED,
        'approver-123'
      )).rejects.toThrow('Approval invalid-approval not found');
    });

    it('should throw error if approval already processed', async () => {
      const mockApproval = {
        id: 'approval-123',
        status: ApprovalStatus.APPROVED,
        processedBy: 'someone-else'
      };

      vi.mocked(mockPrisma.interchangeabilityApproval.findUnique).mockResolvedValue(mockApproval);

      await expect(service.processApproval(
        'approval-123',
        ApprovalStatus.APPROVED,
        'approver-123'
      )).rejects.toThrow('Approval has already been processed');
    });
  });

  // ==================== WORK ORDER INTEGRATION ====================

  describe('logWorkOrderSubstitution', () => {
    it('should log work order substitution successfully', async () => {
      const mockWorkOrder = { id: 'wo-123', workOrderNumber: 'WO001' };
      const mockFromPart = { id: 'part-1', partNumber: 'P001' };
      const mockToPart = { id: 'part-2', partNumber: 'P002' };
      const mockUser = { id: 'user-123', username: 'testuser' };

      const mockSubstitution = {
        id: 'wo-sub-123',
        workOrderId: 'wo-123',
        operationId: 'op-123',
        fromPartId: 'part-1',
        toPartId: 'part-2',
        quantitySubstituted: 10,
        reason: SubstitutionReason.UNAVAILABLE,
        authorizedBy: 'user-123'
      };

      vi.mocked(mockPrisma.workOrder.findUnique).mockResolvedValue(mockWorkOrder);
      vi.mocked(mockPrisma.part.findUnique)
        .mockResolvedValueOnce(mockFromPart)
        .mockResolvedValueOnce(mockToPart);
      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(mockPrisma.workOrderPartSubstitution.create).mockResolvedValue(mockSubstitution);

      const substitutionData = {
        workOrderId: 'wo-123',
        operationId: 'op-123',
        fromPartId: 'part-1',
        toPartId: 'part-2',
        quantitySubstituted: 10,
        reason: SubstitutionReason.UNAVAILABLE,
        authorizedBy: 'user-123'
      };

      const result = await service.logWorkOrderSubstitution(substitutionData);

      expect(result).toEqual(mockSubstitution);
      expect(mockPrisma.workOrderPartSubstitution.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workOrderId: 'wo-123',
          operationId: 'op-123',
          fromPartId: 'part-1',
          toPartId: 'part-2',
          quantitySubstituted: 10,
          reason: SubstitutionReason.UNAVAILABLE,
          authorizedBy: 'user-123'
        }),
        include: expect.any(Object)
      });
    });
  });

  // ==================== UTILITY METHODS ====================

  describe('getAvailableSubstitutes', () => {
    it('should return available substitutes for a part', async () => {
      const mockSubstitutions = [
        {
          id: 'sub-1',
          fromPartId: 'part-1',
          toPartId: 'part-2',
          type: SubstitutionType.DIRECT,
          quantityRatio: 1.0,
          priority: 1,
          status: GroupStatus.ACTIVE,
          effectiveDate: new Date('2024-01-01'),
          expirationDate: null,
          toPart: { id: 'part-2', partNumber: 'P002', description: 'Part 2' },
          group: { id: 'group-1', name: 'Test Group' }
        }
      ];

      vi.mocked(mockPrisma.partSubstitution.findMany).mockResolvedValue(mockSubstitutions);

      const result = await service.getAvailableSubstitutes('part-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockSubstitutions[0]);
      expect(mockPrisma.partSubstitution.findMany).toHaveBeenCalledWith({
        where: {
          fromPartId: 'part-1',
          status: GroupStatus.ACTIVE,
          OR: [
            { effectiveDate: null },
            { effectiveDate: { lte: expect.any(Date) } }
          ],
          AND: [
            {
              OR: [
                { expirationDate: null },
                { expirationDate: { gte: expect.any(Date) } }
              ]
            }
          ]
        },
        include: expect.any(Object),
        orderBy: { priority: 'desc' }
      });
    });
  });

  // ==================== ERROR HANDLING ====================

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      vi.mocked(mockPrisma.partInterchangeabilityGroup.create).mockRejectedValue(
        new Error('Database connection failed')
      );

      const groupData = {
        name: 'Test Group',
        type: InterchangeabilityType.FORM_FIT_FUNCTION,
        configurationControl: ConfigurationControl.FULL_PROPAGATION,
        createdBy: 'user-123'
      };

      await expect(service.createInterchangeabilityGroup(groupData))
        .rejects.toThrow('Database connection failed');
    });
  });

  // ==================== SINGLETON PATTERN ====================

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = PartInterchangeabilityService.getInstance();
      const instance2 = PartInterchangeabilityService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});