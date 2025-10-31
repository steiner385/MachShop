/**
 * ✅ GITHUB ISSUE #54: Hierarchical Cause Code System - Phase 1-2
 * CauseCodeService
 *
 * Manages hierarchical cause codes with:
 * - Tree-based navigation with parent-child relationships
 * - Version control and audit trail
 * - Scope management (global vs site-specific)
 * - Circular reference prevention
 * - Multi-level hierarchy support (2-10 levels)
 */

import {
  CauseCode,
  CauseCodeNode,
  CauseCodeHistory,
  CauseCodeChangeType,
  CauseCodeScope,
  CauseCodeStatus,
  CauseCodeHierarchyValidationResult,
  CauseCodeSearchResult
} from '@/types/quality';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

/**
 * CauseCodeService
 * Manages cause code lifecycle, hierarchy, versioning, and search
 */
export class CauseCodeService {
  constructor(private prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Create a new cause code
   */
  async createCauseCode(
    code: string,
    name: string,
    level: number,
    scope: CauseCodeScope,
    createdBy: string,
    parentCauseCodeId?: string,
    siteId?: string,
    description?: string,
    capaRequired: boolean = false,
    notificationRecipients?: string[],
    displayOrder?: number,
    effectiveDate?: Date
  ): Promise<CauseCode> {
    // Validate code format (alphanumeric with hyphens/underscores)
    if (!/^[A-Z0-9_-]+$/.test(code)) {
      throw new Error('Code must be uppercase alphanumeric with hyphens or underscores');
    }

    // Check for duplicate code within same scope and site
    const existing = await this.prisma?.causeCode.findFirst({
      where: {
        code,
        scope,
        siteId: siteId || null
      }
    });

    if (existing) {
      throw new Error(`Cause code ${code} already exists in this scope`);
    }

    // Validate parent exists if provided
    let parentCode: CauseCode | null = null;
    if (parentCauseCodeId) {
      parentCode = await this.getCauseCodeById(parentCauseCodeId);
      if (!parentCode) {
        throw new Error(`Parent cause code ${parentCauseCodeId} not found`);
      }

      // Prevent circular references
      const isCircular = await this.wouldCreateCircularReference(parentCauseCodeId, parentCauseCodeId);
      if (isCircular) {
        throw new Error('Cannot create circular reference in hierarchy');
      }

      // Validate level (must be parent level + 1)
      if (level !== parentCode.level + 1) {
        throw new Error(`Level must be ${parentCode.level + 1} for this parent`);
      }
    } else if (level !== 1) {
      throw new Error('Top-level cause codes must have level 1');
    }

    const newCauseCode: CauseCode = {
      id: uuidv4(),
      code,
      name,
      description,
      level,
      parentCauseCodeId,
      scope,
      siteId: scope === CauseCodeScope.SITE_SPECIFIC ? siteId : undefined,
      status: CauseCodeStatus.ACTIVE,
      effectiveDate: effectiveDate || new Date(),
      capaRequired,
      notificationRecipients,
      displayOrder,
      version: 1,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save to database
    await this.prisma?.causeCode.create({
      data: {
        id: newCauseCode.id,
        code: newCauseCode.code,
        name: newCauseCode.name,
        description: newCauseCode.description,
        level: newCauseCode.level,
        parentCauseCodeId: newCauseCode.parentCauseCodeId,
        scope: newCauseCode.scope,
        siteId: newCauseCode.siteId,
        status: newCauseCode.status,
        effectiveDate: newCauseCode.effectiveDate,
        capaRequired: newCauseCode.capaRequired,
        notificationRecipients: newCauseCode.notificationRecipients,
        displayOrder: newCauseCode.displayOrder,
        version: newCauseCode.version,
        createdBy: newCauseCode.createdBy,
        createdAt: newCauseCode.createdAt,
        updatedAt: newCauseCode.updatedAt
      }
    });

    return newCauseCode;
  }

  /**
   * Get cause code by ID
   */
  async getCauseCodeById(id: string): Promise<CauseCode | null> {
    const causeCode = await this.prisma?.causeCode.findUnique({
      where: { id }
    });

    return causeCode || null;
  }

  /**
   * Get cause code by code string (code + scope + siteId)
   */
  async getCauseCodeByCode(
    code: string,
    scope: CauseCodeScope,
    siteId?: string
  ): Promise<CauseCode | null> {
    const causeCode = await this.prisma?.causeCode.findFirst({
      where: {
        code,
        scope,
        siteId: scope === CauseCodeScope.SITE_SPECIFIC ? siteId : null
      }
    });

    return causeCode || null;
  }

  /**
   * Get all cause codes at a specific level
   */
  async getCauseCodesByLevel(
    level: number,
    scope?: CauseCodeScope,
    siteId?: string
  ): Promise<CauseCode[]> {
    const where: any = { level, status: CauseCodeStatus.ACTIVE };

    if (scope) {
      where.scope = scope;
    }

    if (siteId && scope === CauseCodeScope.SITE_SPECIFIC) {
      where.siteId = siteId;
    }

    const causeCodes = await this.prisma?.causeCode.findMany({
      where,
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }]
    });

    return causeCodes || [];
  }

  /**
   * Get all children of a cause code
   */
  async getChildren(parentId: string): Promise<CauseCode[]> {
    const children = await this.prisma?.causeCode.findMany({
      where: {
        parentCauseCodeId: parentId,
        status: CauseCodeStatus.ACTIVE
      },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }]
    });

    return children || [];
  }

  /**
   * Get cause code hierarchy as tree structure (recursive)
   */
  async getCauseCodeTree(
    scope?: CauseCodeScope,
    siteId?: string,
    expandAll: boolean = false
  ): Promise<CauseCodeNode[]> {
    // Get all level 1 nodes
    const roots = await this.getCauseCodesByLevel(1, scope, siteId);

    const tree: CauseCodeNode[] = [];

    for (const root of roots) {
      const node = await this.buildCauseCodeNode(root, expandAll);
      tree.push(node);
    }

    return tree;
  }

  /**
   * Build a hierarchical node with children (recursive)
   */
  private async buildCauseCodeNode(
    causeCode: CauseCode,
    expandAll: boolean = false
  ): Promise<CauseCodeNode> {
    const children = await this.getChildren(causeCode.id);
    const childNodes: CauseCodeNode[] = [];

    for (const child of children) {
      const childNode = await this.buildCauseCodeNode(child, expandAll);
      childNodes.push(childNode);
    }

    return {
      ...causeCode,
      children: childNodes.length > 0 ? childNodes : undefined,
      isExpanded: expandAll,
      childCount: childNodes.length
    };
  }

  /**
   * Get hierarchy path for a cause code (breadcrumb trail)
   */
  async getHierarchyPath(id: string): Promise<CauseCode[]> {
    const path: CauseCode[] = [];
    let current = await this.getCauseCodeById(id);

    while (current) {
      path.unshift(current);
      if (current.parentCauseCodeId) {
        current = await this.getCauseCodeById(current.parentCauseCodeId);
      } else {
        break;
      }
    }

    return path;
  }

  /**
   * Get hierarchy path as formatted string
   */
  async getHierarchyPathString(id: string, separator: string = ' > '): Promise<string> {
    const path = await this.getHierarchyPath(id);
    return path.map(c => c.name).join(separator);
  }

  /**
   * Check if one cause code is an ancestor of another
   */
  private async wouldCreateCircularReference(
    parentId: string,
    checkAgainstId: string,
    visited: Set<string> = new Set()
  ): Promise<boolean> {
    if (visited.has(parentId)) {
      return true; // Circular reference detected
    }

    if (parentId === checkAgainstId) {
      return true;
    }

    visited.add(parentId);

    const parent = await this.getCauseCodeById(parentId);
    if (!parent || !parent.parentCauseCodeId) {
      return false;
    }

    return this.wouldCreateCircularReference(
      parent.parentCauseCodeId,
      checkAgainstId,
      visited
    );
  }

  /**
   * Update a cause code
   */
  async updateCauseCode(
    id: string,
    updates: Partial<Omit<CauseCode, 'id' | 'createdAt' | 'createdBy'>>,
    changedBy: string,
    changeReason?: string
  ): Promise<CauseCode> {
    const existing = await this.getCauseCodeById(id);
    if (!existing) {
      throw new Error(`Cause code ${id} not found`);
    }

    // Prevent code change
    if (updates.code && updates.code !== existing.code) {
      throw new Error('Cannot change cause code once created');
    }

    // Validate parent change (prevent circular references)
    if (updates.parentCauseCodeId && updates.parentCauseCodeId !== existing.parentCauseCodeId) {
      const isCircular = await this.wouldCreateCircularReference(
        updates.parentCauseCodeId,
        id
      );
      if (isCircular) {
        throw new Error('Cannot create circular reference in hierarchy');
      }
    }

    // Track changed fields for history
    const changedFields: Record<string, { oldValue: any; newValue: any }> = {};
    for (const [key, newValue] of Object.entries(updates)) {
      if (newValue !== (existing as any)[key]) {
        changedFields[key] = {
          oldValue: (existing as any)[key],
          newValue
        };
      }
    }

    // Create history record
    const newVersion = existing.version + 1;
    await this.prisma?.causeCodeHistory.create({
      data: {
        id: uuidv4(),
        causeCodeId: id,
        version: newVersion,
        changeType: CauseCodeChangeType.MODIFIED,
        changedFields,
        changeReason,
        changedBy,
        changedAt: new Date()
      }
    });

    // Update the cause code
    const updated = await this.prisma?.causeCode.update({
      where: { id },
      data: {
        ...updates,
        version: newVersion,
        updatedAt: new Date()
      }
    });

    return updated!;
  }

  /**
   * Deprecate a cause code
   */
  async deprecateCauseCode(
    id: string,
    deprecatedBy: string,
    expirationDate?: Date
  ): Promise<CauseCode> {
    return this.updateCauseCode(
      id,
      {
        status: CauseCodeStatus.DEPRECATED,
        expirationDate: expirationDate || new Date()
      },
      deprecatedBy,
      'Cause code deprecated'
    );
  }

  /**
   * Restore a deprecated cause code
   */
  async restoreCauseCode(
    id: string,
    restoredBy: string
  ): Promise<CauseCode> {
    const existing = await this.getCauseCodeById(id);
    if (!existing) {
      throw new Error(`Cause code ${id} not found`);
    }

    if (existing.status !== CauseCodeStatus.DEPRECATED) {
      throw new Error('Can only restore deprecated cause codes');
    }

    return this.updateCauseCode(
      id,
      {
        status: CauseCodeStatus.ACTIVE,
        expirationDate: undefined
      },
      restoredBy,
      'Cause code restored'
    );
  }

  /**
   * Get change history for a cause code
   */
  async getCauseCodeHistory(id: string): Promise<CauseCodeHistory[]> {
    const history = await this.prisma?.causeCodeHistory.findMany({
      where: { causeCodeId: id },
      orderBy: { changedAt: 'desc' }
    });

    return history || [];
  }

  /**
   * Restore cause code to a previous version
   */
  async restoreToPreviousVersion(
    id: string,
    targetVersion: number,
    restoredBy: string
  ): Promise<CauseCode> {
    const history = await this.prisma?.causeCodeHistory.findFirst({
      where: {
        causeCodeId: id,
        version: targetVersion
      }
    });

    if (!history) {
      throw new Error(`Version ${targetVersion} not found for cause code ${id}`);
    }

    const current = await this.getCauseCodeById(id);
    if (!current) {
      throw new Error(`Cause code ${id} not found`);
    }

    // Reconstruct the state from history
    const restored: any = { ...current };
    for (const [field, change] of Object.entries(history.changedFields)) {
      restored[field] = (change as any).oldValue;
    }

    return this.updateCauseCode(
      id,
      restored,
      restoredBy,
      `Restored from version ${targetVersion}`
    );
  }

  /**
   * Search cause codes by keyword
   */
  async searchCauseCodes(
    keyword: string,
    scope?: CauseCodeScope,
    siteId?: string
  ): Promise<CauseCodeSearchResult[]> {
    const where: any = {
      status: CauseCodeStatus.ACTIVE,
      OR: [
        { code: { contains: keyword, mode: 'insensitive' } },
        { name: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } }
      ]
    };

    if (scope) {
      where.scope = scope;
    }

    if (siteId && scope === CauseCodeScope.SITE_SPECIFIC) {
      where.siteId = siteId;
    }

    const results = await this.prisma?.causeCode.findMany({
      where,
      orderBy: [{ level: 'asc' }, { displayOrder: 'asc' }]
    });

    if (!results) {
      return [];
    }

    // Convert to search results with hierarchy paths
    const searchResults: CauseCodeSearchResult[] = [];

    for (const result of results) {
      const hierarchyPath = await this.getHierarchyPathString(result.id);

      // Determine which field matched
      let matchedField: 'code' | 'name' | 'description' = 'name';
      if (result.code.toLowerCase().includes(keyword.toLowerCase())) {
        matchedField = 'code';
      } else if (result.description?.toLowerCase().includes(keyword.toLowerCase())) {
        matchedField = 'description';
      }

      // Calculate relevance score (0-100)
      let relevanceScore = 50;
      if (matchedField === 'code') {
        relevanceScore = result.code.toLowerCase() === keyword.toLowerCase() ? 100 : 75;
      } else if (matchedField === 'name') {
        relevanceScore = result.name.toLowerCase() === keyword.toLowerCase() ? 100 : 75;
      }

      searchResults.push({
        id: result.id,
        code: result.code,
        name: result.name,
        level: result.level,
        scope: result.scope,
        siteId: result.siteId,
        status: result.status,
        hierarchyPath,
        matchedField,
        relevanceScore
      });
    }

    return searchResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Validate the entire hierarchy structure
   */
  async validateHierarchy(scope?: CauseCodeScope, siteId?: string): Promise<CauseCodeHierarchyValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const allCodes = await this.prisma?.causeCode.findMany({
      where: {
        ...(scope ? { scope } : {}),
        ...(siteId && scope === CauseCodeScope.SITE_SPECIFIC ? { siteId } : {})
      }
    });

    if (!allCodes) {
      return { isValid: true, errors, warnings };
    }

    const codesById = new Map(allCodes.map(c => [c.id, c]));

    for (const code of allCodes) {
      // Validate parent exists
      if (code.parentCauseCodeId) {
        const parent = codesById.get(code.parentCauseCodeId);
        if (!parent) {
          errors.push(`Code ${code.code}: Parent ${code.parentCauseCodeId} not found`);
        } else if (parent.level + 1 !== code.level) {
          errors.push(`Code ${code.code}: Level ${code.level} doesn't match parent level + 1`);
        }
      } else if (code.level !== 1) {
        errors.push(`Code ${code.code}: Level ${code.level} but has no parent`);
      }

      // Check for expired codes
      if (code.expirationDate && code.expirationDate < new Date() && code.status !== CauseCodeStatus.DEPRECATED) {
        warnings.push(`Code ${code.code}: Expiration date passed but status is not DEPRECATED`);
      }

      // Check for deprecated codes with future expiration
      if (code.status === CauseCodeStatus.DEPRECATED && code.expirationDate && code.expirationDate > new Date()) {
        warnings.push(`Code ${code.code}: Deprecated but expiration date is in the future`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Bulk import cause codes from array
   */
  async bulkImportCauseCodes(
    codes: Array<Omit<CauseCode, 'id' | 'createdAt' | 'updatedAt'> & { parentCode?: string }>,
    importedBy: string
  ): Promise<{ created: CauseCode[]; failed: Array<{ code: string; error: string }> }> {
    const created: CauseCode[] = [];
    const failed: Array<{ code: string; error: string }> = [];
    const codeMap = new Map<string, string>(); // code -> id mapping

    for (const codeData of codes) {
      try {
        let parentId: string | undefined;

        if (codeData.parentCode) {
          const parentId_lookup = codeMap.get(codeData.parentCode);
          if (parentId_lookup) {
            parentId = parentId_lookup;
          } else {
            const parent = await this.getCauseCodeByCode(
              codeData.parentCode,
              codeData.scope,
              codeData.siteId
            );
            parentId = parent?.id;
          }
        }

        const newCode = await this.createCauseCode(
          codeData.code,
          codeData.name,
          codeData.level,
          codeData.scope,
          importedBy,
          parentId,
          codeData.siteId,
          codeData.description,
          codeData.capaRequired,
          codeData.notificationRecipients,
          codeData.displayOrder,
          codeData.effectiveDate
        );

        created.push(newCode);
        codeMap.set(codeData.code, newCode.id);
      } catch (error) {
        failed.push({
          code: codeData.code,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return { created, failed };
  }

  /**
   * Get cause code statistics
   */
  async getCauseCodeStats(): Promise<{
    totalActiveCodes: number;
    totalDeprecatedCodes: number;
    levelDistribution: Record<number, number>;
    scopeDistribution: Record<string, number>;
    averageChildrenPerNode: number;
  }> {
    const allCodes = await this.prisma?.causeCode.findMany();

    if (!allCodes || allCodes.length === 0) {
      return {
        totalActiveCodes: 0,
        totalDeprecatedCodes: 0,
        levelDistribution: {},
        scopeDistribution: {},
        averageChildrenPerNode: 0
      };
    }

    const stats = {
      totalActiveCodes: allCodes.filter(c => c.status === CauseCodeStatus.ACTIVE).length,
      totalDeprecatedCodes: allCodes.filter(c => c.status === CauseCodeStatus.DEPRECATED).length,
      levelDistribution: {} as Record<number, number>,
      scopeDistribution: {} as Record<string, number>,
      averageChildrenPerNode: 0
    };

    // Calculate level distribution
    for (const code of allCodes) {
      stats.levelDistribution[code.level] = (stats.levelDistribution[code.level] || 0) + 1;
      stats.scopeDistribution[code.scope] = (stats.scopeDistribution[code.scope] || 0) + 1;
    }

    // Calculate average children per node
    let totalChildren = 0;
    let nodeCount = 0;
    for (const code of allCodes) {
      const children = await this.getChildren(code.id);
      totalChildren += children.length;
      nodeCount++;
    }

    if (nodeCount > 0) {
      stats.averageChildrenPerNode = totalChildren / nodeCount;
    }

    return stats;
  }

  /**
   * Deactivate a cause code (mark as inactive without deprecating)
   */
  async deactivateCauseCode(
    id: string,
    deactivatedBy: string,
    reason?: string
  ): Promise<CauseCode> {
    return this.updateCauseCode(
      id,
      { status: CauseCodeStatus.INACTIVE },
      deactivatedBy,
      reason || 'Cause code deactivated'
    );
  }

  /**
   * Reactivate an inactive cause code
   */
  async reactivateCauseCode(
    id: string,
    reactivatedBy: string
  ): Promise<CauseCode> {
    const existing = await this.getCauseCodeById(id);
    if (!existing) {
      throw new Error(`Cause code ${id} not found`);
    }

    if (existing.status !== CauseCodeStatus.INACTIVE) {
      throw new Error('Can only reactivate inactive cause codes');
    }

    return this.updateCauseCode(
      id,
      { status: CauseCodeStatus.ACTIVE },
      reactivatedBy,
      'Cause code reactivated'
    );
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect();
    }
  }
}
