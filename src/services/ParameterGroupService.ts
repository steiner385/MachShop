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
    // Validate parent exists if specified
    if (input.parentGroupId) {
      const parent = await prisma.parameterGroup.findUnique({
        where: { id: input.parentGroupId },
      });
      if (!parent) {
        throw new Error(`Parent group ${input.parentGroupId} not found`);
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
    // Prevent circular references if changing parent
    if (updates.parentGroupId) {
      const isDescendant = await this.isDescendant(id, updates.parentGroupId);
      if (isDescendant) {
        throw new Error('Cannot set parent to a descendant group (circular reference)');
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
        throw new Error(
          `Cannot delete group with ${group._count.childGroups} child groups. Delete children first or use force=true.`
        );
      }
      if (group._count && group._count.parameters > 0) {
        throw new Error(
          `Cannot delete group with ${group._count.parameters} parameters. Reassign parameters first or use force=true.`
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
    // Check for circular references
    if (newParentId) {
      const isDescendant = await this.isDescendant(id, newParentId);
      if (isDescendant) {
        throw new Error('Cannot move group to its own descendant (circular reference)');
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
      const group = await prisma.parameterGroup.findUnique({ where: { id: groupId } });
      if (!group) {
        throw new Error(`Group ${groupId} not found`);
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
