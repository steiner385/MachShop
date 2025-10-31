import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ParameterGroupService } from '../../services/ParameterGroupService';
import { ParameterGroup, ParameterGroupType } from '@prisma/client';

// Mock PrismaClient
const mockPrisma = {
  parameterGroup: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  operationParameter: {
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
};

// Mock the database module
vi.mock('../../lib/database', () => ({
  default: mockPrisma,
}));

describe('ParameterGroupService', () => {
  let groupService: ParameterGroupService;

  beforeEach(() => {
    groupService = new ParameterGroupService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== CREATE GROUP ====================

  describe('createGroup', () => {
    it('should create a root group', async () => {
      const input = {
        groupName: 'Temperature Controls',
        groupType: 'PROCESS' as ParameterGroupType,
        description: 'Temperature control parameters',
        tags: ['temperature', 'control'],
        displayOrder: 1,
      };

      const mockGroup: ParameterGroup = {
        id: '1',
        parentGroupId: null,
        ...input,
        icon: null,
        color: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockPrisma.parameterGroup.create).mockResolvedValue(mockGroup);

      const result = await groupService.createGroup(input);

      expect(result).toEqual(mockGroup);
      expect(mockPrisma.parameterGroup.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          groupName: input.groupName,
          groupType: input.groupType,
          parentGroupId: undefined,
        }),
      });
    });

    it('should create a child group with valid parent', async () => {
      const input = {
        groupName: 'Child Group',
        parentGroupId: 'parent-1',
        groupType: 'PROCESS' as ParameterGroupType,
      };

      const mockParent: ParameterGroup = {
        id: 'parent-1',
        groupName: 'Parent Group',
        parentGroupId: null,
        groupType: 'PROCESS',
        description: null,
        tags: [],
        displayOrder: null,
        icon: null,
        color: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockGroup: ParameterGroup = {
        id: '2',
        ...input,
        description: null,
        tags: [],
        displayOrder: null,
        icon: null,
        color: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockPrisma.parameterGroup.findUnique).mockResolvedValue(mockParent);
      vi.mocked(mockPrisma.parameterGroup.create).mockResolvedValue(mockGroup);

      const result = await groupService.createGroup(input);

      expect(result).toEqual(mockGroup);
      expect(mockPrisma.parameterGroup.findUnique).toHaveBeenCalledWith({
        where: { id: 'parent-1' },
      });
    });

    it('should reject creation with non-existent parent', async () => {
      const input = {
        groupName: 'Child Group',
        parentGroupId: 'nonexistent',
        groupType: 'PROCESS' as ParameterGroupType,
      };

      vi.mocked(mockPrisma.parameterGroup.findUnique).mockResolvedValue(null);

      await expect(groupService.createGroup(input)).rejects.toThrow('Parent group nonexistent not found');
    });
  });

  // ==================== GET GROUP ====================

  describe('getGroup', () => {
    it('should retrieve group with default options', async () => {
      const mockGroup: any = {
        id: '1',
        groupName: 'Test Group',
        parentGroupId: null,
        groupType: 'PROCESS',
        description: 'Test',
        tags: [],
        displayOrder: 1,
        icon: null,
        color: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        parentGroup: null,
        _count: {
          parameters: 5,
          childGroups: 2,
        },
      };

      vi.mocked(mockPrisma.parameterGroup.findUnique).mockResolvedValue(mockGroup);

      const result = await groupService.getGroup('1');

      expect(result).toEqual(mockGroup);
      expect(mockPrisma.parameterGroup.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: {
          childGroups: false,
          parameters: false,
          parentGroup: true,
          _count: {
            select: {
              parameters: true,
              childGroups: true,
            },
          },
        },
      });
    });

    it('should include children when requested', async () => {
      const mockGroup: any = {
        id: '1',
        groupName: 'Parent',
        childGroups: [
          { id: '2', groupName: 'Child 1' },
          { id: '3', groupName: 'Child 2' },
        ],
      };

      vi.mocked(mockPrisma.parameterGroup.findUnique).mockResolvedValue(mockGroup);

      const result = await groupService.getGroup('1', true, false);

      expect(result?.childGroups).toHaveLength(2);
    });

    it('should return null for non-existent group', async () => {
      vi.mocked(mockPrisma.parameterGroup.findUnique).mockResolvedValue(null);

      const result = await groupService.getGroup('nonexistent');

      expect(result).toBeNull();
    });
  });

  // ==================== GET ROOT GROUPS ====================

  describe('getRootGroups', () => {
    it('should retrieve all root groups', async () => {
      const mockGroups: any[] = [
        {
          id: '1',
          groupName: 'Root 1',
          parentGroupId: null,
          groupType: 'PROCESS',
          _count: { parameters: 3, childGroups: 2 },
        },
        {
          id: '2',
          groupName: 'Root 2',
          parentGroupId: null,
          groupType: 'QUALITY',
          _count: { parameters: 5, childGroups: 1 },
        },
      ];

      vi.mocked(mockPrisma.parameterGroup.findMany).mockResolvedValue(mockGroups);

      const result = await groupService.getRootGroups();

      expect(result).toHaveLength(2);
      expect(mockPrisma.parameterGroup.findMany).toHaveBeenCalledWith({
        where: { parentGroupId: null },
        include: {
          _count: {
            select: {
              parameters: true,
              childGroups: true,
            },
          },
        },
        orderBy: [{ displayOrder: 'asc' }, { groupName: 'asc' }],
      });
    });
  });

  // ==================== GET GROUP TREE ====================

  describe('getGroupTree', () => {
    it('should build complete hierarchical tree', async () => {
      const mockRootGroups: any[] = [
        {
          id: '1',
          groupName: 'Root 1',
          parentGroupId: null,
          _count: { parameters: 0, childGroups: 2 },
        },
      ];

      const mockChildren: any[] = [
        {
          id: '2',
          groupName: 'Child 1',
          parentGroupId: '1',
          _count: { parameters: 1, childGroups: 0 },
        },
      ];

      // Mock the initial root groups call
      vi.mocked(mockPrisma.parameterGroup.findMany)
        .mockResolvedValueOnce(mockRootGroups) // getRootGroups()
        .mockResolvedValue(mockChildren); // loadChildren() recursive calls

      const result = await groupService.getGroupTree();

      expect(result).toHaveLength(1);
      expect(result[0].childGroups).toBeDefined();
    });
  });

  // ==================== UPDATE GROUP ====================

  describe('updateGroup', () => {
    it('should update group properties', async () => {
      const updates = {
        groupName: 'Updated Name',
        description: 'Updated Description',
        displayOrder: 5,
      };

      const mockUpdated: ParameterGroup = {
        id: '1',
        ...updates,
        parentGroupId: null,
        groupType: 'PROCESS',
        tags: [],
        icon: null,
        color: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock isDescendant check - no parent change
      vi.mocked(mockPrisma.parameterGroup.update).mockResolvedValue(mockUpdated);

      const result = await groupService.updateGroup('1', updates);

      expect(result).toEqual(mockUpdated);
      expect(mockPrisma.parameterGroup.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updates,
      });
    });

    it('should prevent circular references when changing parent', async () => {
      const updates = {
        parentGroupId: 'child-1',
      };

      // Mock the group structure where '1' is parent of 'child-1'
      vi.mocked(mockPrisma.parameterGroup.findMany)
        .mockResolvedValueOnce([{ id: 'child-1' }] as any) // Direct children
        .mockResolvedValueOnce([] as any); // No grandchildren

      await expect(groupService.updateGroup('1', updates)).rejects.toThrow(
        'Cannot set parent to a descendant group (circular reference)'
      );
    });
  });

  // ==================== DELETE GROUP ====================

  describe('deleteGroup', () => {
    it('should delete empty group', async () => {
      const mockGroup: any = {
        id: '1',
        groupName: 'Empty Group',
        _count: {
          childGroups: 0,
          parameters: 0,
        },
      };

      vi.mocked(mockPrisma.parameterGroup.findUnique).mockResolvedValue(mockGroup);
      vi.mocked(mockPrisma.parameterGroup.delete).mockResolvedValue(mockGroup);

      await groupService.deleteGroup('1', false);

      expect(mockPrisma.parameterGroup.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should reject deleting group with children', async () => {
      const mockGroup: any = {
        id: '1',
        groupName: 'Group with Children',
        _count: {
          childGroups: 2,
          parameters: 0,
        },
      };

      vi.mocked(mockPrisma.parameterGroup.findUnique).mockResolvedValue(mockGroup);

      await expect(groupService.deleteGroup('1', false)).rejects.toThrow(
        'Cannot delete group with 2 child groups'
      );
    });

    it('should reject deleting group with parameters', async () => {
      const mockGroup: any = {
        id: '1',
        groupName: 'Group with Parameters',
        _count: {
          childGroups: 0,
          parameters: 5,
        },
      };

      vi.mocked(mockPrisma.parameterGroup.findUnique).mockResolvedValue(mockGroup);

      await expect(groupService.deleteGroup('1', false)).rejects.toThrow(
        'Cannot delete group with 5 parameters'
      );
    });

    it('should force delete group with children', async () => {
      const mockGroup: any = {
        id: '1',
        groupName: 'Group to Force Delete',
        _count: {
          childGroups: 1,
          parameters: 2,
        },
      };

      vi.mocked(mockPrisma.parameterGroup.findUnique).mockResolvedValue(mockGroup);
      vi.mocked(mockPrisma.parameterGroup.findMany).mockResolvedValue([]);
      vi.mocked(mockPrisma.operationParameter.updateMany).mockResolvedValue({ count: 2 } as any);
      vi.mocked(mockPrisma.parameterGroup.delete).mockResolvedValue(mockGroup);

      await groupService.deleteGroup('1', true);

      expect(mockPrisma.parameterGroup.delete).toHaveBeenCalled();
    });
  });

  // ==================== MOVE GROUP ====================

  describe('moveGroup', () => {
    it('should move group to new parent', async () => {
      const mockUpdated: ParameterGroup = {
        id: '1',
        groupName: 'Moved Group',
        parentGroupId: 'new-parent',
        groupType: 'PROCESS',
        description: null,
        tags: [],
        displayOrder: null,
        icon: null,
        color: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockPrisma.parameterGroup.findMany).mockResolvedValue([]);
      vi.mocked(mockPrisma.parameterGroup.update).mockResolvedValue(mockUpdated);

      const result = await groupService.moveGroup('1', 'new-parent');

      expect(result.parentGroupId).toBe('new-parent');
    });

    it('should prevent moving group to its own descendant', async () => {
      // Mock the descendant check to return true
      vi.mocked(mockPrisma.parameterGroup.findMany)
        .mockResolvedValueOnce([{ id: 'child-1' }] as any)
        .mockResolvedValueOnce([{ id: 'grandchild-1' }] as any)
        .mockResolvedValueOnce([] as any);

      await expect(groupService.moveGroup('1', 'child-1')).rejects.toThrow(
        'Cannot move group to its own descendant (circular reference)'
      );
    });

    it('should allow moving group to root level', async () => {
      const mockUpdated: ParameterGroup = {
        id: '1',
        groupName: 'Now Root Group',
        parentGroupId: null,
        groupType: 'PROCESS',
        description: null,
        tags: [],
        displayOrder: null,
        icon: null,
        color: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockPrisma.parameterGroup.update).mockResolvedValue(mockUpdated);

      const result = await groupService.moveGroup('1', null);

      expect(result.parentGroupId).toBeNull();
    });
  });

  // ==================== GET GROUP PARAMETERS ====================

  describe('getGroupParameters', () => {
    it('should get parameters for single group (non-recursive)', async () => {
      const mockParameters: any[] = [
        { id: 'param1', parameterName: 'Temperature', parameterGroupId: '1' },
        { id: 'param2', parameterName: 'Pressure', parameterGroupId: '1' },
      ];

      vi.mocked(mockPrisma.operationParameter.findMany).mockResolvedValue(mockParameters);

      const result = await groupService.getGroupParameters('1', false);

      expect(result).toHaveLength(2);
      expect(mockPrisma.operationParameter.findMany).toHaveBeenCalledWith({
        where: { parameterGroupId: '1' },
        include: {
          operation: true,
          limits: true,
        },
      });
    });

    it('should get parameters recursively from all descendants', async () => {
      const mockParameters: any[] = [
        { id: 'param1', parameterName: 'Temperature', parameterGroupId: '1' },
        { id: 'param2', parameterName: 'Pressure', parameterGroupId: 'child-1' },
      ];

      vi.mocked(mockPrisma.parameterGroup.findMany)
        .mockResolvedValueOnce([{ id: 'child-1' }] as any)
        .mockResolvedValueOnce([] as any);

      vi.mocked(mockPrisma.operationParameter.findMany).mockResolvedValue(mockParameters);

      const result = await groupService.getGroupParameters('1', true);

      expect(result).toHaveLength(2);
      expect(mockPrisma.operationParameter.findMany).toHaveBeenCalledWith({
        where: {
          parameterGroupId: {
            in: ['child-1', '1'],
          },
        },
        include: {
          operation: true,
          limits: true,
          parameterGroup: true,
        },
      });
    });
  });

  // ==================== ASSIGN PARAMETER ====================

  describe('assignParameter', () => {
    it('should assign parameter to group', async () => {
      const mockGroup: ParameterGroup = {
        id: 'group-1',
        groupName: 'Test Group',
        parentGroupId: null,
        groupType: 'PROCESS',
        description: null,
        tags: [],
        displayOrder: null,
        icon: null,
        color: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockParameter: any = {
        id: 'param-1',
        parameterName: 'Temperature',
        parameterGroupId: 'group-1',
      };

      vi.mocked(mockPrisma.parameterGroup.findUnique).mockResolvedValue(mockGroup);
      vi.mocked(mockPrisma.operationParameter.update).mockResolvedValue(mockParameter);

      const result = await groupService.assignParameter('param-1', 'group-1');

      expect(result.parameterGroupId).toBe('group-1');
      expect(mockPrisma.operationParameter.update).toHaveBeenCalledWith({
        where: { id: 'param-1' },
        data: { parameterGroupId: 'group-1' },
      });
    });

    it('should unassign parameter from group', async () => {
      const mockParameter: any = {
        id: 'param-1',
        parameterName: 'Temperature',
        parameterGroupId: null,
      };

      vi.mocked(mockPrisma.operationParameter.update).mockResolvedValue(mockParameter);

      const result = await groupService.assignParameter('param-1', null);

      expect(result.parameterGroupId).toBeNull();
    });

    it('should reject assignment to non-existent group', async () => {
      vi.mocked(mockPrisma.parameterGroup.findUnique).mockResolvedValue(null);

      await expect(groupService.assignParameter('param-1', 'nonexistent')).rejects.toThrow(
        'Group nonexistent not found'
      );
    });
  });

  // ==================== SEARCH GROUPS ====================

  describe('searchGroups', () => {
    it('should search groups by name', async () => {
      const mockGroups: any[] = [
        {
          id: '1',
          groupName: 'Temperature Control',
          description: 'Controls temperature',
          tags: [],
        },
        {
          id: '2',
          groupName: 'Temperature Sensors',
          description: 'Sensor parameters',
          tags: [],
        },
      ];

      vi.mocked(mockPrisma.parameterGroup.findMany).mockResolvedValue(mockGroups);

      const result = await groupService.searchGroups('temperature');

      expect(result).toHaveLength(2);
      expect(mockPrisma.parameterGroup.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { groupName: { contains: 'temperature', mode: 'insensitive' } },
            { description: { contains: 'temperature', mode: 'insensitive' } },
            { tags: { has: 'temperature' } },
          ],
        },
        include: {
          parentGroup: true,
          _count: {
            select: {
              parameters: true,
              childGroups: true,
            },
          },
        },
        orderBy: { groupName: 'asc' },
      });
    });
  });

  // ==================== GET GROUPS BY TYPE ====================

  describe('getGroupsByType', () => {
    it('should filter groups by type', async () => {
      const mockGroups: any[] = [
        {
          id: '1',
          groupName: 'Process Group 1',
          groupType: 'PROCESS',
        },
        {
          id: '2',
          groupName: 'Process Group 2',
          groupType: 'PROCESS',
        },
      ];

      vi.mocked(mockPrisma.parameterGroup.findMany).mockResolvedValue(mockGroups);

      const result = await groupService.getGroupsByType('PROCESS' as ParameterGroupType);

      expect(result).toHaveLength(2);
      expect(result.every((g) => g.groupType === 'PROCESS')).toBe(true);
      expect(mockPrisma.parameterGroup.findMany).toHaveBeenCalledWith({
        where: { groupType: 'PROCESS' },
        include: {
          parentGroup: true,
          _count: {
            select: {
              parameters: true,
              childGroups: true,
            },
          },
        },
        orderBy: [{ displayOrder: 'asc' }, { groupName: 'asc' }],
      });
    });
  });
});
