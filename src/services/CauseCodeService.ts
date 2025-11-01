import prisma from '../lib/database';
import { logger } from '../utils/logger';
import { CauseCode, CauseCodeCategory } from '@prisma/client';

/**
 * Hierarchical Cause Code Service (Issue #54)
 *
 * Manages the hierarchical cause code system for root cause analysis in NCRs.
 * Supports multiple levels of categorization and detailed cause code tracking.
 */

export interface CreateCauseCodeCategoryInput {
  code: string;
  name: string;
  description?: string;
  parentId?: string;
  createdBy: string;
}

export interface CreateCauseCodeInput {
  code: string;
  name: string;
  description?: string;
  categoryId: string;
  parentId?: string;
  createdBy: string;
}

export interface UpdateCauseCodeInput {
  name?: string;
  description?: string;
  enabled?: boolean;
  updatedBy: string;
  reason?: string;
}

export interface CauseCodeHierarchy {
  id: string;
  code: string;
  name: string;
  description?: string;
  level: number;
  children: CauseCodeHierarchy[];
  enabled: boolean;
  usageCount: number;
}

export class CauseCodeService {
  /**
   * Create a new cause code category
   */
  async createCategory(input: CreateCauseCodeCategoryInput): Promise<CauseCodeCategory> {
    try {
      // Validate parent exists if specified
      if (input.parentId) {
        const parent = await prisma.causeCodeCategory.findUnique({
          where: { id: input.parentId },
        });
        if (!parent) {
          throw new Error(`Parent category ${input.parentId} not found`);
        }
      }

      // Check for duplicate code
      const existing = await prisma.causeCodeCategory.findMany({
        where: { code: input.code },
        take: 1,
      });
      if (existing.length > 0) {
        throw new Error(`Category code ${input.code} already exists`);
      }

      const category = await prisma.causeCodeCategory.create({
        data: {
          code: input.code,
          name: input.name,
          description: input.description,
          parentId: input.parentId,
          createdBy: input.createdBy,
        },
      });

      logger.info(`Created cause code category: ${category.code} (${category.name})`);
      return category;
    } catch (error) {
      logger.error('Failed to create cause code category', error);
      throw error;
    }
  }

  /**
   * Create a new cause code
   */
  async createCauseCode(input: CreateCauseCodeInput): Promise<CauseCode> {
    try {
      // Validate category exists
      const category = await prisma.causeCodeCategory.findUnique({
        where: { id: input.categoryId },
      });
      if (!category) {
        throw new Error(`Category ${input.categoryId} not found`);
      }

      // Validate parent exists if specified
      let parentLevel = 0;
      if (input.parentId) {
        const parent = await prisma.causeCode.findUnique({
          where: { id: input.parentId },
        });
        if (!parent) {
          throw new Error(`Parent cause code ${input.parentId} not found`);
        }
        parentLevel = parent.level;
      }

      // Check for duplicate code
      const existing = await prisma.causeCode.findMany({
        where: { code: input.code },
        take: 1,
      });
      if (existing.length > 0) {
        throw new Error(`Cause code ${input.code} already exists`);
      }

      const causeCode = await prisma.causeCode.create({
        data: {
          code: input.code,
          name: input.name,
          description: input.description,
          categoryId: input.categoryId,
          parentId: input.parentId,
          level: parentLevel + 1,
          createdBy: input.createdBy,
        },
      });

      // Create history entry
      await this.createHistoryEntry(
        causeCode.id,
        'CREATED',
        null,
        JSON.stringify({ code: causeCode.code, name: causeCode.name }),
        `Created new cause code`,
        input.createdBy
      );

      logger.info(`Created cause code: ${causeCode.code} (${causeCode.name})`);
      return causeCode;
    } catch (error) {
      logger.error('Failed to create cause code', error);
      throw error;
    }
  }

  /**
   * Get all cause codes with hierarchy
   */
  async getHierarchy(categoryId?: string): Promise<CauseCodeHierarchy[]> {
    try {
      const where = categoryId ? { categoryId, parentId: null } : { parentId: null };

      const rootCodes = await prisma.causeCode.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
      });

      const hierarchy: CauseCodeHierarchy[] = [];

      for (const code of rootCodes) {
        hierarchy.push(await this.buildHierarchy(code));
      }

      return hierarchy;
    } catch (error) {
      logger.error('Failed to get cause code hierarchy', error);
      throw error;
    }
  }

  /**
   * Build hierarchical structure recursively
   */
  private async buildHierarchy(code: CauseCode): Promise<CauseCodeHierarchy> {
    const children = await prisma.causeCode.findMany({
      where: { parentId: code.id },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });

    const childHierarchy: CauseCodeHierarchy[] = [];
    for (const child of children) {
      childHierarchy.push(await this.buildHierarchy(child));
    }

    return {
      id: code.id,
      code: code.code,
      name: code.name,
      description: code.description || undefined,
      level: code.level,
      children: childHierarchy,
      enabled: code.enabled,
      usageCount: code.usageCount,
    };
  }

  /**
   * Get a specific cause code with its full path
   */
  async getCauseCode(id: string): Promise<CauseCode | null> {
    try {
      const causeCode = await prisma.causeCode.findUnique({
        where: { id },
        include: {
          category: true,
          parent: true,
        },
      });

      return causeCode;
    } catch (error) {
      logger.error(`Failed to get cause code ${id}`, error);
      throw error;
    }
  }

  /**
   * Get the full path for a cause code (e.g., "Material > Defective Lot > Scratches")
   */
  async getFullPath(id: string): Promise<string> {
    try {
      const causeCode = await this.getCauseCode(id);
      if (!causeCode) {
        return '';
      }

      const path: string[] = [causeCode.code];
      let current = causeCode;

      while (current.parentId) {
        const parent = await this.getCauseCode(current.parentId);
        if (parent) {
          path.unshift(parent.code);
          current = parent;
        } else {
          break;
        }
      }

      return path.join(' > ');
    } catch (error) {
      logger.error(`Failed to get full path for cause code ${id}`, error);
      throw error;
    }
  }

  /**
   * Update a cause code
   */
  async updateCauseCode(id: string, input: UpdateCauseCodeInput): Promise<CauseCode> {
    try {
      const existing = await this.getCauseCode(id);
      if (!existing) {
        throw new Error(`Cause code ${id} not found`);
      }

      const oldValue = JSON.stringify({
        name: existing.name,
        description: existing.description,
        enabled: existing.enabled,
      });

      const updated = await prisma.causeCode.update({
        where: { id },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.enabled !== undefined && { enabled: input.enabled }),
          updatedAt: new Date(),
        },
      });

      const newValue = JSON.stringify({
        name: updated.name,
        description: updated.description,
        enabled: updated.enabled,
      });

      // Create history entry
      await this.createHistoryEntry(
        id,
        'UPDATED',
        oldValue,
        newValue,
        input.reason || 'Updated cause code',
        input.updatedBy
      );

      logger.info(`Updated cause code: ${updated.code}`);
      return updated;
    } catch (error) {
      logger.error(`Failed to update cause code ${id}`, error);
      throw error;
    }
  }

  /**
   * Disable a cause code (soft delete)
   */
  async disableCauseCode(id: string, reason: string, updatedBy: string): Promise<CauseCode> {
    try {
      const causeCode = await this.getCauseCode(id);
      if (!causeCode) {
        throw new Error(`Cause code ${id} not found`);
      }

      if (!causeCode.enabled) {
        throw new Error(`Cause code ${id} is already disabled`);
      }

      // Disable children as well
      await prisma.causeCode.updateMany({
        where: { parentId: id },
        data: { enabled: false },
      });

      const updated = await prisma.causeCode.update({
        where: { id },
        data: { enabled: false, updatedAt: new Date() },
      });

      // Create history entry
      await this.createHistoryEntry(
        id,
        'DISABLED',
        JSON.stringify({ enabled: true }),
        JSON.stringify({ enabled: false }),
        reason,
        updatedBy
      );

      logger.info(`Disabled cause code: ${updated.code}`);
      return updated;
    } catch (error) {
      logger.error(`Failed to disable cause code ${id}`, error);
      throw error;
    }
  }

  /**
   * Record usage of a cause code (increment counter and update lastUsedAt)
   */
  async recordUsage(id: string): Promise<void> {
    try {
      await prisma.causeCode.update({
        where: { id },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      });

      logger.debug(`Recorded usage of cause code ${id}`);
    } catch (error) {
      logger.error(`Failed to record usage for cause code ${id}`, error);
      throw error;
    }
  }

  /**
   * Get cause codes by category
   */
  async getCauseCodesByCategory(categoryId: string): Promise<CauseCode[]> {
    try {
      const codes = await prisma.causeCode.findMany({
        where: { categoryId, enabled: true },
        orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }],
      });

      return codes;
    } catch (error) {
      logger.error(`Failed to get cause codes for category ${categoryId}`, error);
      throw error;
    }
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<CauseCodeCategory[]> {
    try {
      const categories = await prisma.causeCodeCategory.findMany({
        where: { enabled: true },
        orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
      });

      return categories;
    } catch (error) {
      logger.error('Failed to get cause code categories', error);
      throw error;
    }
  }

  /**
   * Get cause code statistics
   */
  async getStatistics(): Promise<{
    totalCategories: number;
    totalCauseCodes: number;
    mostUsedCodes: Array<{ id: string; code: string; name: string; usageCount: number }>;
    recentlyCreated: Array<{ id: string; code: string; name: string; createdAt: Date }>;
  }> {
    try {
      const totalCategories = await prisma.causeCodeCategory.count();
      const totalCauseCodes = await prisma.causeCode.count();

      const mostUsedCodes = await prisma.causeCode.findMany({
        select: { id: true, code: true, name: true, usageCount: true },
        orderBy: { usageCount: 'desc' },
        take: 10,
      });

      const recentlyCreated = await prisma.causeCode.findMany({
        select: { id: true, code: true, name: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      return {
        totalCategories,
        totalCauseCodes,
        mostUsedCodes,
        recentlyCreated,
      };
    } catch (error) {
      logger.error('Failed to get cause code statistics', error);
      throw error;
    }
  }

  /**
   * Create a history entry
   */
  private async createHistoryEntry(
    causeCodeId: string,
    changeType: string,
    oldValue: string | null,
    newValue: string,
    changeReason: string,
    changedBy: string
  ): Promise<void> {
    try {
      await prisma.causeCodeHistory.create({
        data: {
          causeCodeId,
          changeType,
          oldValue,
          newValue,
          changeReason,
          changedBy,
        },
      });
    } catch (error) {
      logger.error(`Failed to create history entry for cause code ${causeCodeId}`, error);
      // Don't throw - history is supplementary
    }
  }

  /**
   * Get history for a cause code
   */
  async getHistory(causeCodeId: string, limit: number = 50): Promise<any[]> {
    try {
      const history = await prisma.causeCodeHistory.findMany({
        where: { causeCodeId },
        orderBy: { changedAt: 'desc' },
        take: limit,
      });

      return history;
    } catch (error) {
      logger.error(`Failed to get history for cause code ${causeCodeId}`, error);
      throw error;
    }
  }

  /**
   * Search cause codes by name or code
   */
  async search(query: string, limit: number = 20): Promise<CauseCode[]> {
    try {
      const codes = await prisma.causeCode.findMany({
        where: {
          enabled: true,
          OR: [
            { code: { contains: query, mode: 'insensitive' } },
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        orderBy: [{ level: 'asc' }, { code: 'asc' }],
        take: limit,
      });

      return codes;
    } catch (error) {
      logger.error(`Failed to search cause codes for ${query}`, error);
      throw error;
    }
  }
}

export default new CauseCodeService();
