/**
 * Serial Propagation Service
 * Issue #150: Serialization - Advanced Assignment Workflows
 *
 * Handles tracking of serial numbers through manufacturing routing operations.
 * Supports pass-through propagation, splits (one serial to many), merges (many
 * to one), and transformations with parent-child relationship tracking.
 */

import { PrismaClient, SerialPropagation, SerializedPart } from '@prisma/client';
import { logger } from '../../utils/logger';

export type PropagationType = 'PASS_THROUGH' | 'SPLIT' | 'MERGE' | 'TRANSFORMATION';

export interface SerialPropagationInput {
  sourceSerialId: string;
  propagationType: PropagationType;
  operationCode: string;
  workCenterId?: string;
  routingSequence: number;
  quantity: number;
  createdBy: string;
  notes?: string;
}

export interface SplitPropagationInput {
  sourceSerialId: string;
  operationCode: string;
  workCenterId?: string;
  routingSequence: number;
  targetSerialIds: string[];
  createdBy: string;
  notes?: string;
}

export interface MergePropagationInput {
  sourceSerialIds: string[];
  operationCode: string;
  workCenterId?: string;
  routingSequence: number;
  targetSerialId: string;
  createdBy: string;
  notes?: string;
}

export interface SerialLineageResult {
  serial: SerializedPart;
  ancestors: SerializedPart[];
  descendants: SerializedPart[];
  propagationHistory: SerialPropagation[];
}

export class SerialPropagationService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Record pass-through propagation (serial unchanged through operation)
   */
  async propagatePassThrough(input: SerialPropagationInput): Promise<SerialPropagation> {
    try {
      logger.info(
        `Recording pass-through propagation for serial ${input.sourceSerialId} through operation ${input.operationCode}`
      );

      // Verify source serial exists
      const sourceSerial = await this.prisma.serializedPart.findUnique({
        where: { id: input.sourceSerialId },
      });

      if (!sourceSerial) {
        throw new Error(`Source serial ${input.sourceSerialId} not found`);
      }

      // Create propagation record
      const propagation = await this.prisma.serialPropagation.create({
        data: {
          sourceSerialId: input.sourceSerialId,
          propagationType: 'PASS_THROUGH',
          quantity: input.quantity,
          operationCode: input.operationCode,
          workCenterId: input.workCenterId,
          routingSequence: input.routingSequence,
          createdBy: input.createdBy,
          notes: input.notes,
        },
      });

      // Create audit trail
      await this.createAuditTrail({
        serialId: input.sourceSerialId,
        eventType: 'PROPAGATED',
        performedBy: input.createdBy,
        details: JSON.stringify({
          propagationType: 'PASS_THROUGH',
          operationCode: input.operationCode,
          workCenter: input.workCenterId,
          quantity: input.quantity,
        }),
      });

      logger.info(
        `Pass-through propagation recorded for serial ${input.sourceSerialId}`
      );
      return propagation;
    } catch (error) {
      logger.error(
        `Error recording pass-through propagation: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }

  /**
   * Record split propagation (one serial becomes many)
   */
  async propagateSplit(input: SplitPropagationInput): Promise<SerialPropagation[]> {
    try {
      logger.info(
        `Recording split propagation for serial ${input.sourceSerialId} into ${input.targetSerialIds.length} serials`
      );

      // Verify source serial exists
      const sourceSerial = await this.prisma.serializedPart.findUnique({
        where: { id: input.sourceSerialId },
      });

      if (!sourceSerial) {
        throw new Error(`Source serial ${input.sourceSerialId} not found`);
      }

      // Verify all target serials exist
      const targetSerials = await this.prisma.serializedPart.findMany({
        where: { id: { in: input.targetSerialIds } },
      });

      if (targetSerials.length !== input.targetSerialIds.length) {
        throw new Error('One or more target serials not found');
      }

      const propagations: SerialPropagation[] = [];

      // Create propagation record for each target
      for (const targetId of input.targetSerialIds) {
        const propagation = await this.prisma.serialPropagation.create({
          data: {
            sourceSerialId: input.sourceSerialId,
            targetSerialId: targetId,
            propagationType: 'SPLIT',
            quantity: 1,
            operationCode: input.operationCode,
            workCenterId: input.workCenterId,
            routingSequence: input.routingSequence,
            parentSerialIds: [input.sourceSerialId],
            childSerialIds: input.targetSerialIds,
            createdBy: input.createdBy,
            notes: input.notes,
          },
        });

        propagations.push(propagation);
      }

      // Create audit trail
      await this.createAuditTrail({
        serialId: input.sourceSerialId,
        eventType: 'SPLIT',
        performedBy: input.createdBy,
        details: JSON.stringify({
          propagationType: 'SPLIT',
          targetCount: input.targetSerialIds.length,
          operationCode: input.operationCode,
          workCenter: input.workCenterId,
        }),
      });

      logger.info(
        `Split propagation recorded: serial ${input.sourceSerialId} split into ${input.targetSerialIds.length} serials`
      );
      return propagations;
    } catch (error) {
      logger.error(
        `Error recording split propagation: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Record merge propagation (many serials become one)
   */
  async propagateMerge(input: MergePropagationInput): Promise<SerialPropagation> {
    try {
      logger.info(
        `Recording merge propagation: ${input.sourceSerialIds.length} serials merged into ${input.targetSerialId}`
      );

      // Verify all source serials exist
      const sourceSerials = await this.prisma.serializedPart.findMany({
        where: { id: { in: input.sourceSerialIds } },
      });

      if (sourceSerials.length !== input.sourceSerialIds.length) {
        throw new Error('One or more source serials not found');
      }

      // Verify target serial exists
      const targetSerial = await this.prisma.serializedPart.findUnique({
        where: { id: input.targetSerialId },
      });

      if (!targetSerial) {
        throw new Error(`Target serial ${input.targetSerialId} not found`);
      }

      // Create single propagation record for merge
      const propagation = await this.prisma.serialPropagation.create({
        data: {
          sourceSerialId: input.sourceSerialIds[0],
          targetSerialId: input.targetSerialId,
          propagationType: 'MERGE',
          quantity: input.sourceSerialIds.length,
          operationCode: input.operationCode,
          workCenterId: input.workCenterId,
          routingSequence: input.routingSequence,
          parentSerialIds: input.sourceSerialIds,
          childSerialIds: [input.targetSerialId],
          createdBy: input.createdBy,
          notes: input.notes,
        },
      });

      // Create audit trail for each source
      for (const sourceId of input.sourceSerialIds) {
        await this.createAuditTrail({
          serialId: sourceId,
          eventType: 'MERGED',
          performedBy: input.createdBy,
          details: JSON.stringify({
            propagationType: 'MERGE',
            targetSerial: input.targetSerialId,
            operationCode: input.operationCode,
          }),
        });
      }

      logger.info(
        `Merge propagation recorded: ${input.sourceSerialIds.length} serials merged into ${input.targetSerialId}`
      );
      return propagation;
    } catch (error) {
      logger.error(
        `Error recording merge propagation: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Record transformation propagation (serial changes characteristics)
   */
  async propagateTransformation(input: SerialPropagationInput): Promise<SerialPropagation> {
    try {
      logger.info(
        `Recording transformation propagation for serial ${input.sourceSerialId}`
      );

      // Verify source serial exists
      const sourceSerial = await this.prisma.serializedPart.findUnique({
        where: { id: input.sourceSerialId },
      });

      if (!sourceSerial) {
        throw new Error(`Source serial ${input.sourceSerialId} not found`);
      }

      // Create propagation record
      const propagation = await this.prisma.serialPropagation.create({
        data: {
          sourceSerialId: input.sourceSerialId,
          propagationType: 'TRANSFORMATION',
          quantity: input.quantity,
          operationCode: input.operationCode,
          workCenterId: input.workCenterId,
          routingSequence: input.routingSequence,
          createdBy: input.createdBy,
          notes: input.notes,
        },
      });

      // Create audit trail
      await this.createAuditTrail({
        serialId: input.sourceSerialId,
        eventType: 'TRANSFORMED',
        performedBy: input.createdBy,
        details: JSON.stringify({
          propagationType: 'TRANSFORMATION',
          operationCode: input.operationCode,
          workCenter: input.workCenterId,
        }),
      });

      logger.info(
        `Transformation propagation recorded for serial ${input.sourceSerialId}`
      );
      return propagation;
    } catch (error) {
      logger.error(
        `Error recording transformation propagation: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }

  /**
   * Get complete lineage for a serial (ancestors and descendants)
   */
  async getSerialLineage(serialId: string): Promise<SerialLineageResult> {
    try {
      logger.info(`Retrieving lineage for serial ${serialId}`);

      // Get the serial
      const serial = await this.prisma.serializedPart.findUnique({
        where: { id: serialId },
      });

      if (!serial) {
        throw new Error(`Serial ${serialId} not found`);
      }

      // Get propagation history
      const propagations = await this.prisma.serialPropagation.findMany({
        where: {
          OR: [{ sourceSerialId: serialId }, { targetSerialId: serialId }],
        },
        orderBy: { createdAt: 'asc' },
      });

      // Get ancestors (follow parent links)
      const ancestors = await this.getAncestors(serialId);

      // Get descendants (follow child links)
      const descendants = await this.getDescendants(serialId);

      return {
        serial,
        ancestors,
        descendants,
        propagationHistory: propagations,
      };
    } catch (error) {
      logger.error(
        `Error retrieving serial lineage: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Get ancestors of a serial
   */
  private async getAncestors(serialId: string): Promise<SerializedPart[]> {
    try {
      const ancestors: SerializedPart[] = [];
      const visited = new Set<string>();
      const queue = [serialId];

      while (queue.length > 0) {
        const currentId = queue.shift()!;

        if (visited.has(currentId)) {
          continue;
        }

        visited.add(currentId);

        // Find propagations where current is target
        const propagations = await this.prisma.serialPropagation.findMany({
          where: { targetSerialId: currentId },
        });

        for (const prop of propagations) {
          const parentSerial = await this.prisma.serializedPart.findUnique({
            where: { id: prop.sourceSerialId },
          });

          if (parentSerial && !visited.has(parentSerial.id)) {
            ancestors.push(parentSerial);
            queue.push(parentSerial.id);
          }
        }
      }

      return ancestors;
    } catch (error) {
      logger.error(
        `Error getting ancestors: ${error instanceof Error ? error.message : String(error)}`
      );
      return [];
    }
  }

  /**
   * Get descendants of a serial
   */
  private async getDescendants(serialId: string): Promise<SerializedPart[]> {
    try {
      const descendants: SerializedPart[] = [];
      const visited = new Set<string>();
      const queue = [serialId];

      while (queue.length > 0) {
        const currentId = queue.shift()!;

        if (visited.has(currentId)) {
          continue;
        }

        visited.add(currentId);

        // Find propagations where current is source
        const propagations = await this.prisma.serialPropagation.findMany({
          where: { sourceSerialId: currentId },
        });

        for (const prop of propagations) {
          if (prop.targetSerialId) {
            const childSerial = await this.prisma.serializedPart.findUnique({
              where: { id: prop.targetSerialId },
            });

            if (childSerial && !visited.has(childSerial.id)) {
              descendants.push(childSerial);
              queue.push(childSerial.id);
            }
          }
        }
      }

      return descendants;
    } catch (error) {
      logger.error(
        `Error getting descendants: ${error instanceof Error ? error.message : String(error)}`
      );
      return [];
    }
  }

  /**
   * Get propagation history for a part
   */
  async getPropagationHistory(
    partId: string,
    filters?: {
      operationCode?: string;
      propagationType?: PropagationType;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<SerialPropagation[]> {
    try {
      const where: any = {
        sourceSerial: {
          partId,
        },
      };

      if (filters?.operationCode) {
        where.operationCode = filters.operationCode;
      }

      if (filters?.propagationType) {
        where.propagationType = filters.propagationType;
      }

      if (filters?.startDate || filters?.endDate) {
        where.createdAt = {};
        if (filters?.startDate) {
          where.createdAt.gte = filters.startDate;
        }
        if (filters?.endDate) {
          where.createdAt.lte = filters.endDate;
        }
      }

      return await this.prisma.serialPropagation.findMany({
        where,
        include: { sourceSerial: true, targetSerial: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      logger.error(
        `Error getting propagation history: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }

  /**
   * Get propagation statistics for a part
   */
  async getPropagationStatistics(partId: string): Promise<{
    totalPropagations: number;
    byType: Record<PropagationType, number>;
    byOperation: Record<string, number>;
  }> {
    try {
      const propagations = await this.prisma.serialPropagation.findMany({
        where: {
          sourceSerial: {
            partId,
          },
        },
      });

      const byType: Record<PropagationType, number> = {
        PASS_THROUGH: 0,
        SPLIT: 0,
        MERGE: 0,
        TRANSFORMATION: 0,
      };

      const byOperation: Record<string, number> = {};

      for (const prop of propagations) {
        byType[prop.propagationType as PropagationType]++;

        if (prop.operationCode) {
          byOperation[prop.operationCode] = (byOperation[prop.operationCode] || 0) + 1;
        }
      }

      return {
        totalPropagations: propagations.length,
        byType,
        byOperation,
      };
    } catch (error) {
      logger.error(
        `Error getting propagation statistics: ${
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
    serialId: string;
    eventType: string;
    performedBy: string;
    details?: string;
  }): Promise<void> {
    try {
      // Get the part ID from the serial
      const serial = await this.prisma.serializedPart.findUnique({
        where: { id: input.serialId },
      });

      if (!serial) {
        return;
      }

      await this.prisma.serialAssignmentAudit.create({
        data: {
          serialNumber: serial.serialNumber,
          serialId: input.serialId,
          partId: serial.partId,
          eventType: input.eventType,
          eventSource: 'SYSTEM_GENERATED',
          performedBy: input.performedBy,
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

export default SerialPropagationService;
