import { PrismaClient, ParameterGroup, ParameterGroupType } from '@prisma/client';
import { createLogger } from '../utils/logger';

const prisma = new PrismaClient();
const logger = createLogger('ParameterGroupService');

export interface ParameterGroupWithChildren extends ParameterGroup {
  childGroups?: ParameterGroupWithChildren[];
  parameters?: any[];
  _count?: {
    parameters: number;
    childGroups: number;
  };
}

export interface CreateGroupInput {
  groupName: string;
  parentGroupId?: string;
  groupType: ParameterGroupType;
  description?: string;
  tags?: string[];
  displayOrder?: number;
  icon?: string;
  color?: string;
}

export class ParameterGroupService {
  /**
   * Create a new parameter group
   */
  async createGroup(input: CreateGroupInput): Promise<ParameterGroup> {
    // ✅ GITHUB ISSUE #12 FIX: Enhanced parent reference validation with context
    if (input.parentGroupId) {
      const parent = await prisma.parameterGroup.findUnique({
        where: { id: input.parentGroupId },
        include: { parentGroup: true }
      });
      if (!parent) {
        throw new Error(
          `Parent group ${input.parentGroupId} not found. ` +
          `Cannot create parameter group '${input.groupName}' because the specified parent group does not exist. ` +
          `Verify the parent group ID is correct and the parent group exists in the system. ` +
          `Use GET /api/v1/parameter-groups to list available groups, or create the parent group first.`
        );
      }
    }

    logger.info('Creating parameter group', { groupName: input.groupName });

    return await prisma.parameterGroup.create({
      data: {
        groupName: input.groupName,
        parentGroupId: input.parentGroupId,
        groupType: input.groupType,
        description: input.description,
        tags: input.tags || [],
        displayOrder: input.displayOrder,
        icon: input.icon,
        color: input.color,
      },
    });
  }

  /**
   * Get a group by ID with optional relations
   */
  async getGroup(
    id: string,
    includeChildren = false,
    includeParameters = false
  ): Promise<ParameterGroupWithChildren | null> {
    return await prisma.parameterGroup.findUnique({
      where: { id },
      include: {
        childGroups: includeChildren,
        parameters: includeParameters,
        parentGroup: true,
        _count: {
          select: {
            parameters: true,
            childGroups: true,
          },
        },
      },
    });
  }

  /**
   * Get all root groups (no parent)
   */
  async getRootGroups(): Promise<ParameterGroupWithChildren[]> {
    return await prisma.parameterGroup.findMany({
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
  }

  /**
   * Get complete group tree starting from root
   */
  async getGroupTree(): Promise<ParameterGroupWithChildren[]> {
    const rootGroups = await this.getRootGroups();

    // Recursively load children
    const loadChildren = async (
      group: ParameterGroupWithChildren
    ): Promise<ParameterGroupWithChildren> => {
      const children = await prisma.parameterGroup.findMany({
        where: { parentGroupId: group.id },
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

      group.childGroups = await Promise.all(children.map(loadChildren));
      return group;
    };

    return await Promise.all(rootGroups.map(loadChildren));
  }

  /**
   * Update a group
   */
  async updateGroup(
    id: string,
    updates: Partial<CreateGroupInput>
  ): Promise<ParameterGroup> {
    // ✅ GITHUB ISSUE #12 FIX: Enhanced circular reference prevention for group updates
    if (updates.parentGroupId) {
      const isDescendant = await this.isDescendant(id, updates.parentGroupId);
      if (isDescendant) {
        const currentGroup = await this.getGroup(id);
        const targetGroup = await this.getGroup(updates.parentGroupId);
        throw new Error(
          `Cannot update parameter group '${currentGroup?.groupName || id}' to have parent '${targetGroup?.groupName || updates.parentGroupId}' because this would create a circular reference. ` +
          `The target parent group is already a descendant of the current group in the hierarchy. ` +
          `Circular references are prevented to maintain data integrity and avoid infinite loops in hierarchy traversal. ` +
          `To resolve this issue: ` +
          `1) Choose a different parent group that is not a descendant of the current group, ` +
          `2) Use GET /api/v1/parameter-groups/tree to visualize the current hierarchy structure, ` +
          `3) Move the target parent group to a different location first, ` +
          `or 4) Set parentGroupId to null to make this group a root-level group.`
        );
      }
    }

    logger.info('Updating parameter group', { id, updates });

    return await prisma.parameterGroup.update({
      where: { id },
      data: updates,
    });
  }

  /**
   * Delete a group (will fail if it has children or parameters)
   */
  async deleteGroup(id: string, force = false): Promise<void> {
    const group = await this.getGroup(id, true, true);
    if (!group) {
      throw new Error(`Group ${id} not found`);
    }

    if (!force) {
      if (group._count && group._count.childGroups > 0) {
        // ✅ GITHUB ISSUE #12 FIX: Enhanced child group deletion protection with detailed guidance
        throw new Error(
          `Cannot delete parameter group '${group.groupName}' because it contains ${group._count.childGroups} child group${group._count.childGroups > 1 ? 's' : ''}. ` +
          `Parameter groups with children cannot be deleted to maintain data integrity and prevent orphaned data. ` +
          `To resolve this issue: ` +
          `1) Delete or move all child groups first using DELETE /api/v1/parameter-groups/{childId} or POST /api/v1/parameter-groups/{childId}/move, ` +
          `2) Use force=true parameter to recursively delete all children (WARNING: This will permanently delete all descendant groups and unlink their parameters), ` +
          `or 3) Use GET /api/v1/parameter-groups/${group.id}?includeChildren=true to review the child groups before deletion.`
        );
      }
      if (group._count && group._count.parameters > 0) {
        // ✅ GITHUB ISSUE #12 FIX: Enhanced parameter deletion protection with detailed guidance
        throw new Error(
          `Cannot delete parameter group '${group.groupName}' because it contains ${group._count.parameters} parameter${group._count.parameters > 1 ? 's' : ''}. ` +
          `Parameter groups with assigned parameters cannot be deleted to prevent data loss and maintain parameter organization. ` +
          `To resolve this issue: ` +
          `1) Reassign all parameters to other groups using POST /api/v1/parameter-groups/assign with parameterId and new groupId, ` +
          `2) Unlink parameters by setting their groupId to null, ` +
          `3) Use force=true parameter to automatically unlink all parameters (parameters will remain but lose group association), ` +
          `or 4) Use GET /api/v1/parameter-groups/${group.id}/parameters to review the parameters before deletion.`
        );
      }
    }

    if (force) {
      // Recursively delete all children and unlink parameters
      await this.deleteGroupRecursive(id);
    } else {
      await prisma.parameterGroup.delete({ where: { id } });
    }

    logger.info('Deleted parameter group', { id, force });
  }

  /**
   * Move a group to a new parent
   */
  async moveGroup(id: string, newParentId: string | null): Promise<ParameterGroup> {
    // ✅ GITHUB ISSUE #12 FIX: Enhanced circular reference prevention for group moves
    if (newParentId) {
      const isDescendant = await this.isDescendant(id, newParentId);
      if (isDescendant) {
        const currentGroup = await this.getGroup(id);
        const targetGroup = await this.getGroup(newParentId);
        throw new Error(
          `Cannot move parameter group '${currentGroup?.groupName || id}' to parent '${targetGroup?.groupName || newParentId}' because this would create a circular reference. ` +
          `The target parent group is already a descendant of the group being moved in the hierarchy. ` +
          `Circular references are prevented to maintain data integrity and avoid infinite loops in hierarchy traversal. ` +
          `To resolve this issue: ` +
          `1) Choose a different parent group that is not a descendant of the group being moved, ` +
          `2) Use GET /api/v1/parameter-groups/tree to visualize the current hierarchy structure, ` +
          `3) Move the target parent group to a different location first, ` +
          `or 4) Set newParentId to null to make this group a root-level group.`
        );
      }
    }

    logger.info('Moving parameter group', { id, newParentId });

    return await prisma.parameterGroup.update({
      where: { id },
      data: { parentGroupId: newParentId },
    });
  }

  /**
   * Get all parameters in a group (including descendants if recursive=true)
   */
  async getGroupParameters(id: string, recursive = false) {
    if (!recursive) {
      return await prisma.operationParameter.findMany({
        where: { parameterGroupId: id },
        include: {
          operation: true,
          limits: true,
        },
      });
    }

    // Get all descendant group IDs
    const descendantIds = await this.getDescendantIds(id);
    descendantIds.push(id); // Include the group itself

    return await prisma.operationParameter.findMany({
      where: {
        parameterGroupId: {
          in: descendantIds,
        },
      },
      include: {
        operation: true,
        limits: true,
        parameterGroup: true,
      },
    });
  }

  /**
   * Assign a parameter to a group
   */
  async assignParameter(parameterId: string, groupId: string | null) {
    if (groupId) {
      const group = await prisma.parameterGroup.findUnique({
        where: { id: groupId },
        include: { parentGroup: true }
      });
      if (!group) {
        // ✅ GITHUB ISSUE #12 FIX: Enhanced group reference validation for parameter assignment
        throw new Error(
          `Parameter group ${groupId} not found. ` +
          `Cannot assign parameter to group because the specified group does not exist. ` +
          `Verify the group ID is correct and the group exists in the system. ` +
          `Use GET /api/v1/parameter-groups to list available groups, or create the group first.`
        );
      }
    }

    return await prisma.operationParameter.update({
      where: { id: parameterId },
      data: { parameterGroupId: groupId },
    });
  }

  /**
   * Search groups by name or tags
   */
  async searchGroups(query: string): Promise<ParameterGroupWithChildren[]> {
    return await prisma.parameterGroup.findMany({
      where: {
        OR: [
          { groupName: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { tags: { has: query } },
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
  }

  /**
   * Get groups by type
   */
  async getGroupsByType(type: ParameterGroupType): Promise<ParameterGroupWithChildren[]> {
    return await prisma.parameterGroup.findMany({
      where: { groupType: type },
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
  }

  // Private helper methods

  /**
   * Check if targetId is a descendant of ancestorId
   */
  private async isDescendant(ancestorId: string, targetId: string): Promise<boolean> {
    if (ancestorId === targetId) return true;

    const descendants = await this.getDescendantIds(ancestorId);
    return descendants.includes(targetId);
  }

  /**
   * Get all descendant IDs of a group
   */
  private async getDescendantIds(id: string): Promise<string[]> {
    const children = await prisma.parameterGroup.findMany({
      where: { parentGroupId: id },
      select: { id: true },
    });

    const descendantIds: string[] = [];
    for (const child of children) {
      descendantIds.push(child.id);
      const childDescendants = await this.getDescendantIds(child.id);
      descendantIds.push(...childDescendants);
    }

    return descendantIds;
  }

  /**
   * Recursively delete a group and all its descendants
   */
  private async deleteGroupRecursive(id: string): Promise<void> {
    const children = await prisma.parameterGroup.findMany({
      where: { parentGroupId: id },
      select: { id: true },
    });

    // Delete all children first
    for (const child of children) {
      await this.deleteGroupRecursive(child.id);
    }

    // Unlink all parameters
    await prisma.operationParameter.updateMany({
      where: { parameterGroupId: id },
      data: { parameterGroupId: null },
    });

    // Delete the group
    await prisma.parameterGroup.delete({ where: { id } });
  }
}

export const parameterGroupService = new ParameterGroupService();
