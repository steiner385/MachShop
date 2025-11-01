/**
 * Serial Uniqueness Validator Service
 * Issue #150: Serialization - Advanced Assignment Workflows
 *
 * Provides real-time validation of serial number uniqueness across different scopes:
 * - Site Level: Unique within a single manufacturing site
 * - Enterprise Level: Unique across the entire enterprise
 * - Part Type Level: Unique within parts of the same type
 *
 * Handles conflict resolution and maintains uniqueness scope tracking.
 */

import { PrismaClient, SerialUniquenessScope } from '@prisma/client';
import { logger } from '../../utils/logger';

export type UniquenessScope = 'SITE' | 'ENTERPRISE' | 'PART_TYPE';
export type ConflictResolution = 'KEEP' | 'RETIRE' | 'MARK_INVALID';

export interface UniquenessCheckInput {
  serialNumber: string;
  partId: string;
  scope?: UniquenessScope[];
  siteId?: string;
}

export interface ConflictDetectionResult {
  hasConflict: boolean;
  conflictingSerialIds: string[];
  conflictType?: 'DUPLICATE_SERIAL' | 'DUPLICATE_IN_SCOPE';
  conflictingScopes: UniquenessScope[];
}

export interface ConflictResolutionInput {
  serialNumber: string;
  partId: string;
  conflictResolution: ConflictResolution;
  retiredSerialId?: string;
  resolutionReason: string;
  resolvedBy: string;
}

export interface UniquenessReport {
  serialNumber: string;
  partId: string;
  isSiteUnique: boolean;
  isEnterpriseUnique: boolean;
  isPartTypeUnique: boolean;
  totalConflicts: number;
  conflictingSerials: Array<{
    serialId: string;
    serialNumber: string;
    scope: UniquenessScope;
  }>;
}

export class SerialUniquenessValidator {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Check serial uniqueness across specified scopes
   */
  async checkUniqueness(input: UniquenessCheckInput): Promise<ConflictDetectionResult> {
    try {
      logger.info(
        `Checking uniqueness for serial ${input.serialNumber} on part ${input.partId}`
      );

      const scopes = input.scope || ['SITE', 'ENTERPRISE', 'PART_TYPE'];
      const conflictingScopes: UniquenessScope[] = [];
      const conflictingSerialIds = new Set<string>();

      // Get the part
      const part = await this.prisma.part.findUnique({
        where: { id: input.partId },
      });

      if (!part) {
        throw new Error(`Part ${input.partId} not found`);
      }

      // Check each scope
      for (const scope of scopes) {
        const conflicts = await this.checkScopeUniqueness(
          input.serialNumber,
          input.partId,
          scope,
          part,
          input.siteId
        );

        if (conflicts.length > 0) {
          conflictingScopes.push(scope);
          conflicts.forEach((c) => conflictingSerialIds.add(c));
        }
      }

      const hasConflict = conflictingSerialIds.size > 0;

      return {
        hasConflict,
        conflictingSerialIds: Array.from(conflictingSerialIds),
        conflictType: hasConflict ? 'DUPLICATE_IN_SCOPE' : undefined,
        conflictingScopes,
      };
    } catch (error) {
      logger.error(
        `Error checking uniqueness: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Check uniqueness within a specific scope
   */
  private async checkScopeUniqueness(
    serialNumber: string,
    partId: string,
    scope: UniquenessScope,
    part: any,
    siteId?: string
  ): Promise<string[]> {
    try {
      const where: any = {};

      if (scope === 'SITE' && siteId) {
        where.site = { id: siteId };
      } else if (scope === 'ENTERPRISE') {
        where.site = {};
      }

      if (scope === 'PART_TYPE') {
        where.part = { partType: part.partType };
      } else {
        where.part = { id: partId };
      }

      // Find existing serials with same number in this scope
      const existing = await this.prisma.serializedPart.findMany({
        where: {
          serialNumber,
          ...where,
        },
      });

      return existing.map((s) => s.id);
    } catch (error) {
      logger.error(
        `Error checking scope uniqueness: ${error instanceof Error ? error.message : String(error)}`
      );
      return [];
    }
  }

  /**
   * Register a serial in uniqueness scopes
   */
  async registerSerialUniqueness(
    serialNumber: string,
    partId: string,
    scopes?: UniquenessScope[]
  ): Promise<SerialUniquenessScope> {
    try {
      logger.info(
        `Registering serial ${serialNumber} for part ${partId} with uniqueness tracking`
      );

      const defaultScopes = scopes || ['SITE', 'PART_TYPE'];

      // Create or update scope record
      const scope = await this.prisma.serialUniquenessScope.upsert({
        where: {
          serialNumber_partId: {
            serialNumber,
            partId,
          },
        },
        create: {
          serialNumber,
          partId,
          siteLevel: defaultScopes.includes('SITE'),
          enterpriseLevel: defaultScopes.includes('ENTERPRISE'),
          partTypeLevel: defaultScopes.includes('PART_TYPE'),
          hasConflict: false,
        },
        update: {
          siteLevel: defaultScopes.includes('SITE'),
          enterpriseLevel: defaultScopes.includes('ENTERPRISE'),
          partTypeLevel: defaultScopes.includes('PART_TYPE'),
        },
      });

      logger.info(
        `Serial ${serialNumber} registered for uniqueness tracking on part ${partId}`
      );
      return scope;
    } catch (error) {
      logger.error(
        `Error registering serial uniqueness: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }

  /**
   * Mark a serial as having conflicts
   */
  async markConflict(
    serialNumber: string,
    partId: string,
    conflictingSerialIds: string[]
  ): Promise<SerialUniquenessScope> {
    try {
      logger.warn(
        `Marking conflicts for serial ${serialNumber} on part ${partId}`
      );

      const scope = await this.prisma.serialUniquenessScope.update({
        where: {
          serialNumber_partId: {
            serialNumber,
            partId,
          },
        },
        data: {
          hasConflict: true,
          conflictingSerialIds,
          validatedat: new Date(),
        },
      });

      // Create audit entry
      await this.createAuditTrail({
        serialNumber,
        partId,
        eventType: 'CONFLICT_DETECTED',
        details: JSON.stringify({
          conflictCount: conflictingSerialIds.length,
          conflictingSerialIds,
        }),
      });

      return scope;
    } catch (error) {
      logger.error(
        `Error marking conflict: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Resolve a serial uniqueness conflict
   */
  async resolveConflict(input: ConflictResolutionInput): Promise<SerialUniquenessScope> {
    try {
      logger.info(
        `Resolving conflict for serial ${input.serialNumber} on part ${input.partId}`
      );

      // Get the scope
      const scope = await this.prisma.serialUniquenessScope.findUnique({
        where: {
          serialNumber_partId: {
            serialNumber: input.serialNumber,
            partId: input.partId,
          },
        },
      });

      if (!scope) {
        throw new Error(`Scope record not found for serial ${input.serialNumber}`);
      }

      // Apply resolution strategy
      switch (input.conflictResolution) {
        case 'RETIRE':
          // Retire the conflicting serial
          if (input.retiredSerialId) {
            await this.prisma.serializedPart.update({
              where: { id: input.retiredSerialId },
              data: {
                status: 'RETIRED',
              },
            });
          }
          break;

        case 'MARK_INVALID':
          // Mark conflicting serials as invalid
          if (scope.conflictingSerialIds.length > 0) {
            await this.prisma.serializedPart.updateMany({
              where: {
                id: { in: scope.conflictingSerialIds },
              },
              data: {
                status: 'INVALID',
              },
            });
          }
          break;

        case 'KEEP':
        default:
          // Keep the current serial as is
          break;
      }

      // Update scope record
      const updated = await this.prisma.serialUniquenessScope.update({
        where: {
          serialNumber_partId: {
            serialNumber: input.serialNumber,
            partId: input.partId,
          },
        },
        data: {
          hasConflict: false,
          conflictResolution: input.conflictResolution,
          validatedat: new Date(),
        },
      });

      // Create audit entry
      await this.createAuditTrail({
        serialNumber: input.serialNumber,
        partId: input.partId,
        eventType: 'CONFLICT_RESOLVED',
        details: JSON.stringify({
          resolution: input.conflictResolution,
          reason: input.resolutionReason,
          resolvedBy: input.resolvedBy,
        }),
      });

      logger.info(
        `Conflict resolved for serial ${input.serialNumber} using ${input.conflictResolution}`
      );
      return updated;
    } catch (error) {
      logger.error(
        `Error resolving conflict: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Get detailed uniqueness report for a serial
   */
  async getUniquenessReport(
    serialNumber: string,
    partId: string
  ): Promise<UniquenessReport> {
    try {
      logger.info(
        `Generating uniqueness report for serial ${serialNumber} on part ${partId}`
      );

      const part = await this.prisma.part.findUnique({
        where: { id: partId },
      });

      if (!part) {
        throw new Error(`Part ${partId} not found`);
      }

      // Get scope record
      const scope = await this.prisma.serialUniquenessScope.findUnique({
        where: {
          serialNumber_partId: {
            serialNumber,
            partId,
          },
        },
      });

      // Check each scope level
      const siteDuplicates = await this.prisma.serializedPart.findMany({
        where: {
          serialNumber,
          NOT: { id: { in: scope?.conflictingSerialIds || [] } },
        },
        select: { id: true, serialNumber: true },
      });

      const partTypeDuplicates = await this.prisma.serializedPart.findMany({
        where: {
          serialNumber,
          part: { partType: part.partType },
          NOT: { id: { in: scope?.conflictingSerialIds || [] } },
        },
        select: { id: true, serialNumber: true },
      });

      const enterpriseDuplicates = await this.prisma.serializedPart.findMany({
        where: {
          serialNumber,
          NOT: { id: { in: scope?.conflictingSerialIds || [] } },
        },
        select: { id: true, serialNumber: true },
      });

      const conflictingSerials: UniquenessReport['conflictingSerials'] = [];

      if (scope?.conflictingSerialIds) {
        const conflictSerials = await this.prisma.serializedPart.findMany({
          where: { id: { in: scope.conflictingSerialIds } },
          select: { id: true, serialNumber: true },
        });

        conflictSerials.forEach((s) => {
          conflictingSerials.push({
            serialId: s.id,
            serialNumber: s.serialNumber,
            scope: 'SITE', // Simplified for now
          });
        });
      }

      return {
        serialNumber,
        partId,
        isSiteUnique: siteDuplicates.length === 0,
        isEnterpriseUnique: enterpriseDuplicates.length === 0,
        isPartTypeUnique: partTypeDuplicates.length === 0,
        totalConflicts: conflictingSerials.length,
        conflictingSerials,
      };
    } catch (error) {
      logger.error(
        `Error generating uniqueness report: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }

  /**
   * Get all pending conflicts
   */
  async getPendingConflicts(partId?: string): Promise<SerialUniquenessScope[]> {
    try {
      const where = {
        hasConflict: true,
        ...(partId && { partId }),
      };

      return await this.prisma.serialUniquenessScope.findMany({
        where,
        orderBy: { validatedat: 'desc' },
      });
    } catch (error) {
      logger.error(
        `Error getting pending conflicts: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Get conflict resolution history
   */
  async getConflictResolutionHistory(
    partId?: string
  ): Promise<SerialUniquenessScope[]> {
    try {
      const where = {
        conflictResolution: { not: null },
        ...(partId && { partId }),
      };

      return await this.prisma.serialUniquenessScope.findMany({
        where,
        orderBy: { validatedat: 'desc' },
      });
    } catch (error) {
      logger.error(
        `Error getting conflict resolution history: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }

  /**
   * Get uniqueness statistics
   */
  async getUniquenessStatistics(partId?: string): Promise<{
    totalUniqueSerials: number;
    serialsWithConflicts: number;
    resolvedConflicts: number;
    conflictRate: number;
  }> {
    try {
      const where = partId ? { partId } : {};

      const total = await this.prisma.serialUniquenessScope.count({ where });
      const conflicts = await this.prisma.serialUniquenessScope.count({
        where: { ...where, hasConflict: true },
      });
      const resolved = await this.prisma.serialUniquenessScope.count({
        where: { ...where, conflictResolution: { not: null } },
      });

      return {
        totalUniqueSerials: total,
        serialsWithConflicts: conflicts,
        resolvedConflicts: resolved,
        conflictRate: total > 0 ? Math.round((conflicts / total) * 100) : 0,
      };
    } catch (error) {
      logger.error(
        `Error getting uniqueness statistics: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }

  /**
   * Create audit trail entry
   */
  private async createAuditTrail(input: {
    serialNumber: string;
    partId: string;
    eventType: string;
    details?: string;
  }): Promise<void> {
    try {
      await this.prisma.serialAssignmentAudit.create({
        data: {
          serialNumber: input.serialNumber,
          serialId: input.serialNumber,
          partId: input.partId,
          eventType: input.eventType,
          eventSource: 'SYSTEM_GENERATED',
          performedBy: 'SYSTEM',
          performedAt: new Date(),
          details: input.details,
        },
      });
    } catch (error) {
      logger.error(
        `Error creating audit trail: ${error instanceof Error ? error.message : String(error)}`
      );
      // Don't throw - audit trail failure shouldn't block main operation
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export default SerialUniquenessValidator;
