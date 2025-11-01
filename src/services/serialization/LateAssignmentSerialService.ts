/**
 * Late Assignment Serial Service
 * Issue #150: Serialization - Advanced Assignment Workflows
 *
 * Handles deferred serialization for post-manufacturing processes where serials
 * cannot be assigned until later stages. Common in additive manufacturing,
 * casting, and other processes with post-manufacturing operations.
 */

import { PrismaClient, LateAssignmentPlaceholder, SerializedPart } from '@prisma/client';
import { logger } from '../../utils/logger';

export interface LateAssignmentPlaceholderInput {
  partId: string;
  workOrderId?: string;
  lotNumber?: string;
  createdBy: string;
  quantity?: number;
}

export interface LateSerialAssignmentInput {
  placeholderId: string;
  serialNumber: string;
  assignmentOperationCode: string;
  assignedBy: string;
  notes?: string;
}

export interface PlaceholderListInput {
  partId: string;
  status?: 'PENDING' | 'SERIALIZED' | 'FAILED';
  workOrderId?: string;
  lotNumber?: string;
}

export class LateAssignmentSerialService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create a late assignment placeholder for deferred serialization
   */
  async createPlaceholder(input: LateAssignmentPlaceholderInput): Promise<LateAssignmentPlaceholder> {
    try {
      logger.info(
        `Creating late assignment placeholder for part ${input.partId} (WO: ${input.workOrderId})`
      );

      // Verify part exists
      const part = await this.prisma.part.findUnique({
        where: { id: input.partId },
      });

      if (!part) {
        throw new Error(`Part ${input.partId} not found`);
      }

      // Generate unique placeholder ID
      const placeholderId = `LATE-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      // Create placeholder
      const placeholder = await this.prisma.lateAssignmentPlaceholder.create({
        data: {
          placeholderId,
          partId: input.partId,
          workOrderId: input.workOrderId,
          lotNumber: input.lotNumber,
          status: 'PENDING',
          createdAt: new Date(),
        },
      });

      // Create audit trail
      await this.createAuditTrail({
        placeholderId: placeholder.id,
        partId: input.partId,
        eventType: 'CREATED',
        performedBy: input.createdBy,
        details: JSON.stringify({
          workOrderId: input.workOrderId,
          lotNumber: input.lotNumber,
          quantity: input.quantity,
        }),
      });

      logger.info(`Late assignment placeholder ${placeholderId} created successfully`);
      return placeholder;
    } catch (error) {
      logger.error(
        `Error creating late assignment placeholder: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }

  /**
   * Create multiple placeholders for batch processing
   */
  async createBatchPlaceholders(
    input: LateAssignmentPlaceholderInput & { quantity: number }
  ): Promise<LateAssignmentPlaceholder[]> {
    try {
      logger.info(`Creating batch of ${input.quantity} late assignment placeholders`);

      const placeholders: LateAssignmentPlaceholder[] = [];

      for (let i = 0; i < input.quantity; i++) {
        const placeholder = await this.createPlaceholder({
          partId: input.partId,
          workOrderId: input.workOrderId,
          lotNumber: input.lotNumber,
          createdBy: input.createdBy,
        });

        placeholders.push(placeholder);
      }

      logger.info(`Batch creation completed: ${input.quantity} placeholders created`);
      return placeholders;
    } catch (error) {
      logger.error(
        `Error creating batch placeholders: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Assign a serial number to a late assignment placeholder
   */
  async assignSerialToPlaceholder(
    input: LateSerialAssignmentInput
  ): Promise<LateAssignmentPlaceholder> {
    try {
      logger.info(`Assigning serial ${input.serialNumber} to placeholder ${input.placeholderId}`);

      // Find placeholder
      const placeholder = await this.prisma.lateAssignmentPlaceholder.findUnique({
        where: { id: input.placeholderId },
      });

      if (!placeholder) {
        throw new Error(`Placeholder ${input.placeholderId} not found`);
      }

      if (placeholder.status === 'SERIALIZED') {
        throw new Error('Placeholder already has an assigned serial');
      }

      if (placeholder.status === 'FAILED') {
        throw new Error('Placeholder is marked as failed and cannot be serialized');
      }

      // Check serial uniqueness
      const isUnique = await this.checkSerialUniqueness(input.serialNumber, placeholder.partId);
      if (!isUnique) {
        throw new Error(`Serial ${input.serialNumber} is not unique for this part`);
      }

      // Create SerializedPart record
      const serial = await this.prisma.serializedPart.create({
        data: {
          partId: placeholder.partId,
          serialNumber: input.serialNumber,
          status: 'ACTIVE',
          generatedDate: new Date(),
          generatedMethod: 'LATE_ASSIGNMENT',
          notes: `Late assignment from placeholder ${placeholder.placeholderId}`,
        },
      });

      // Update placeholder
      const updated = await this.prisma.lateAssignmentPlaceholder.update({
        where: { id: input.placeholderId },
        data: {
          assignedSerialId: serial.id,
          status: 'SERIALIZED',
          serializedDate: new Date(),
          triggeredBy: input.assignedBy,
          assignmentOperationCode: input.assignmentOperationCode,
        },
      });

      // Create audit trail
      await this.createAuditTrail({
        placeholderId: input.placeholderId,
        partId: placeholder.partId,
        eventType: 'SERIALIZED',
        performedBy: input.assignedBy,
        details: JSON.stringify({
          serialNumber: input.serialNumber,
          operationCode: input.assignmentOperationCode,
          notes: input.notes,
        }),
      });

      logger.info(`Serial ${input.serialNumber} assigned to placeholder successfully`);
      return updated;
    } catch (error) {
      logger.error(
        `Error assigning serial to placeholder: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }

  /**
   * Mark a placeholder as failed if serialization cannot complete
   */
  async markPlaceholderFailed(
    placeholderId: string,
    reason: string,
    failedBy: string
  ): Promise<LateAssignmentPlaceholder> {
    try {
      logger.info(`Marking placeholder ${placeholderId} as failed`);

      const placeholder = await this.prisma.lateAssignmentPlaceholder.findUnique({
        where: { id: placeholderId },
      });

      if (!placeholder) {
        throw new Error(`Placeholder ${placeholderId} not found`);
      }

      if (placeholder.status === 'SERIALIZED') {
        throw new Error('Cannot fail a placeholder that has already been serialized');
      }

      // Update placeholder
      const updated = await this.prisma.lateAssignmentPlaceholder.update({
        where: { id: placeholderId },
        data: {
          status: 'FAILED',
          triggeredBy: failedBy,
          updatedAt: new Date(),
        },
      });

      // Create audit trail
      await this.createAuditTrail({
        placeholderId,
        partId: placeholder.partId,
        eventType: 'FAILED',
        performedBy: failedBy,
        details: JSON.stringify({
          failureReason: reason,
        }),
      });

      logger.info(`Placeholder ${placeholderId} marked as failed`);
      return updated;
    } catch (error) {
      logger.error(
        `Error marking placeholder failed: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Retrieve pending placeholders for a part
   */
  async getPendingPlaceholders(partId: string): Promise<LateAssignmentPlaceholder[]> {
    try {
      return await this.prisma.lateAssignmentPlaceholder.findMany({
        where: {
          partId,
          status: 'PENDING',
        },
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      logger.error(
        `Error getting pending placeholders: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Retrieve all placeholders for a part with optional filtering
   */
  async getPlaceholders(input: PlaceholderListInput): Promise<LateAssignmentPlaceholder[]> {
    try {
      const where: any = { partId: input.partId };

      if (input.status) {
        where.status = input.status;
      }

      if (input.workOrderId) {
        where.workOrderId = input.workOrderId;
      }

      if (input.lotNumber) {
        where.lotNumber = input.lotNumber;
      }

      return await this.prisma.lateAssignmentPlaceholder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      logger.error(
        `Error getting placeholders: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Get placeholder by ID
   */
  async getPlaceholder(placeholderId: string): Promise<LateAssignmentPlaceholder | null> {
    try {
      return await this.prisma.lateAssignmentPlaceholder.findUnique({
        where: { id: placeholderId },
      });
    } catch (error) {
      logger.error(
        `Error getting placeholder: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Get serialized results from placeholders
   */
  async getSerializedFromPlaceholders(
    partId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<(LateAssignmentPlaceholder & { serial: SerializedPart | null })[]> {
    try {
      const where: any = {
        partId,
        status: 'SERIALIZED',
      };

      if (startDate || endDate) {
        where.serializedDate = {};
        if (startDate) {
          where.serializedDate.gte = startDate;
        }
        if (endDate) {
          where.serializedDate.lte = endDate;
        }
      }

      const placeholders = await this.prisma.lateAssignmentPlaceholder.findMany({
        where,
        include: { serializedPart: true },
      });

      return placeholders.map((p) => ({
        ...p,
        serial: p.serializedPart,
      }));
    } catch (error) {
      logger.error(
        `Error getting serialized placeholders: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }

  /**
   * Get summary statistics for late assignment placeholders
   */
  async getPlaceholderStatistics(partId: string): Promise<{
    totalPlaceholders: number;
    pendingCount: number;
    serializedCount: number;
    failedCount: number;
    pendingPercentage: number;
    serializedPercentage: number;
    failedPercentage: number;
  }> {
    try {
      const total = await this.prisma.lateAssignmentPlaceholder.count({
        where: { partId },
      });

      const pending = await this.prisma.lateAssignmentPlaceholder.count({
        where: { partId, status: 'PENDING' },
      });

      const serialized = await this.prisma.lateAssignmentPlaceholder.count({
        where: { partId, status: 'SERIALIZED' },
      });

      const failed = await this.prisma.lateAssignmentPlaceholder.count({
        where: { partId, status: 'FAILED' },
      });

      return {
        totalPlaceholders: total,
        pendingCount: pending,
        serializedCount: serialized,
        failedCount: failed,
        pendingPercentage: total > 0 ? Math.round((pending / total) * 100) : 0,
        serializedPercentage: total > 0 ? Math.round((serialized / total) * 100) : 0,
        failedPercentage: total > 0 ? Math.round((failed / total) * 100) : 0,
      };
    } catch (error) {
      logger.error(
        `Error getting placeholder statistics: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }

  /**
   * Check serial uniqueness
   */
  private async checkSerialUniqueness(serialNumber: string, partId: string): Promise<boolean> {
    try {
      const existing = await this.prisma.serializedPart.findFirst({
        where: {
          serialNumber,
          partId,
        },
      });

      return !existing;
    } catch (error) {
      logger.error(
        `Error checking uniqueness: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  /**
   * Create audit trail entry
   */
  private async createAuditTrail(input: {
    placeholderId: string;
    partId: string;
    eventType: string;
    performedBy: string;
    details?: string;
  }): Promise<void> {
    try {
      await this.prisma.serialAssignmentAudit.create({
        data: {
          serialNumber: input.placeholderId,
          serialId: input.placeholderId,
          partId: input.partId,
          eventType: input.eventType,
          eventSource: 'LATE_ASSIGNMENT',
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

export default LateAssignmentSerialService;
