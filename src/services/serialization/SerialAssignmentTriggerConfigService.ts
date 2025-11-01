/**
 * Serial Assignment Trigger Configuration Service
 * Issue #150: Serialization - Advanced Assignment Workflows
 *
 * Manages configurable trigger points for serial number assignment.
 * Supports event-based triggering (MATERIAL_RECEIPT, WORK_ORDER_CREATE,
 * OPERATION_COMPLETE, QUALITY_CHECKPOINT, BATCH_COMPLETION) with
 * conditional logic and assignment strategy selection.
 */

import { PrismaClient, SerialAssignmentTrigger } from '@prisma/client';
import { logger } from '../../utils/logger';

export type TriggerType =
  | 'MATERIAL_RECEIPT'
  | 'WORK_ORDER_CREATE'
  | 'OPERATION_COMPLETE'
  | 'QUALITY_CHECKPOINT'
  | 'BATCH_COMPLETION';

export type AssignmentType = 'VENDOR' | 'SYSTEM_GENERATED' | 'LATE_ASSIGNMENT';

export interface TriggerConfigInput {
  partId: string;
  triggerType: TriggerType;
  operationCode?: string;
  assignmentType: AssignmentType;
  formatConfigId?: string;
  isConditional?: boolean;
  conditions?: Record<string, any>;
  deferSerialization?: boolean;
  batchMode?: boolean;
  batchSize?: number;
  createdBy: string;
}

export interface TriggerUpdateInput {
  triggerId: string;
  isActive?: boolean;
  conditions?: Record<string, any>;
  batchMode?: boolean;
  batchSize?: number;
  updatedBy: string;
}

export interface TriggerExecutionContext {
  partId: string;
  triggerType: TriggerType;
  operationCode?: string;
  workOrderId?: string;
  workCenterId?: string;
  timestamp: Date;
  context?: Record<string, any>;
}

export interface ApplicableTriggers {
  triggers: SerialAssignmentTrigger[];
  applicableCount: number;
  totalConfiguredCount: number;
}

export class SerialAssignmentTriggerConfigService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create a trigger configuration for serial assignment
   */
  async createTrigger(input: TriggerConfigInput): Promise<SerialAssignmentTrigger> {
    try {
      logger.info(
        `Creating trigger configuration for part ${input.partId} with trigger type ${input.triggerType}`
      );

      // Verify part exists
      const part = await this.prisma.part.findUnique({
        where: { id: input.partId },
      });

      if (!part) {
        throw new Error(`Part ${input.partId} not found`);
      }

      // If SYSTEM_GENERATED assignment, verify format config exists
      if (
        input.assignmentType === 'SYSTEM_GENERATED' &&
        input.formatConfigId
      ) {
        const formatConfig = await this.prisma.serialNumberFormatConfig.findUnique(
          {
            where: { id: input.formatConfigId },
          }
        );

        if (!formatConfig) {
          throw new Error(`Format config ${input.formatConfigId} not found`);
        }
      }

      // Create trigger
      const trigger = await this.prisma.serialAssignmentTrigger.create({
        data: {
          partId: input.partId,
          triggerType: input.triggerType,
          operationCode: input.operationCode,
          assignmentType: input.assignmentType,
          formatConfigId: input.formatConfigId,
          isConditional: input.isConditional || false,
          conditions: input.conditions ? JSON.stringify(input.conditions) : null,
          deferSerialization: input.deferSerialization || false,
          batchMode: input.batchMode || false,
          batchSize: input.batchSize,
          isActive: true,
          createdBy: input.createdBy,
        },
      });

      // Create audit trail
      await this.createAuditTrail({
        triggerId: trigger.id,
        partId: input.partId,
        eventType: 'TRIGGER_CREATED',
        performedBy: input.createdBy,
        details: JSON.stringify({
          triggerType: input.triggerType,
          assignmentType: input.assignmentType,
          isConditional: input.isConditional,
        }),
      });

      logger.info(
        `Trigger configuration ${trigger.id} created successfully for part ${input.partId}`
      );
      return trigger;
    } catch (error) {
      logger.error(
        `Error creating trigger: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Update a trigger configuration
   */
  async updateTrigger(input: TriggerUpdateInput): Promise<SerialAssignmentTrigger> {
    try {
      logger.info(`Updating trigger ${input.triggerId}`);

      // Verify trigger exists
      const trigger = await this.prisma.serialAssignmentTrigger.findUnique({
        where: { id: input.triggerId },
      });

      if (!trigger) {
        throw new Error(`Trigger ${input.triggerId} not found`);
      }

      // Update trigger
      const updated = await this.prisma.serialAssignmentTrigger.update({
        where: { id: input.triggerId },
        data: {
          isActive: input.isActive !== undefined ? input.isActive : trigger.isActive,
          conditions: input.conditions ? JSON.stringify(input.conditions) : trigger.conditions,
          batchMode: input.batchMode !== undefined ? input.batchMode : trigger.batchMode,
          batchSize: input.batchSize !== undefined ? input.batchSize : trigger.batchSize,
        },
      });

      // Create audit trail
      await this.createAuditTrail({
        triggerId: input.triggerId,
        partId: trigger.partId,
        eventType: 'TRIGGER_UPDATED',
        performedBy: input.updatedBy,
        details: JSON.stringify({
          isActive: input.isActive,
          batchMode: input.batchMode,
          batchSize: input.batchSize,
        }),
      });

      logger.info(`Trigger ${input.triggerId} updated successfully`);
      return updated;
    } catch (error) {
      logger.error(
        `Error updating trigger: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Get trigger configuration by ID
   */
  async getTrigger(triggerId: string): Promise<SerialAssignmentTrigger | null> {
    try {
      return await this.prisma.serialAssignmentTrigger.findUnique({
        where: { id: triggerId },
        include: { formatConfig: true },
      });
    } catch (error) {
      logger.error(
        `Error getting trigger: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Get all triggers for a part
   */
  async getTriggersForPart(partId: string): Promise<SerialAssignmentTrigger[]> {
    try {
      return await this.prisma.serialAssignmentTrigger.findMany({
        where: { partId },
        include: { formatConfig: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      logger.error(
        `Error getting triggers for part: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }

  /**
   * Get applicable triggers for an execution context
   */
  async getApplicableTriggers(
    context: TriggerExecutionContext
  ): Promise<ApplicableTriggers> {
    try {
      logger.info(
        `Finding applicable triggers for part ${context.partId} with trigger type ${context.triggerType}`
      );

      // Get all triggers for the part matching the trigger type
      const allTriggers = await this.prisma.serialAssignmentTrigger.findMany({
        where: {
          partId: context.partId,
          triggerType: context.triggerType,
          isActive: true,
        },
        include: { formatConfig: true },
      });

      // Filter by conditions if applicable
      const applicableTriggers: SerialAssignmentTrigger[] = [];

      for (const trigger of allTriggers) {
        if (trigger.isConditional && trigger.conditions) {
          const conditionsMet = this.evaluateConditions(
            JSON.parse(trigger.conditions),
            context
          );
          if (conditionsMet) {
            applicableTriggers.push(trigger);
          }
        } else {
          applicableTriggers.push(trigger);
        }
      }

      return {
        triggers: applicableTriggers,
        applicableCount: applicableTriggers.length,
        totalConfiguredCount: allTriggers.length,
      };
    } catch (error) {
      logger.error(
        `Error getting applicable triggers: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }

  /**
   * Evaluate trigger conditions against context
   */
  private evaluateConditions(conditions: Record<string, any>, context: any): boolean {
    try {
      // Simple condition evaluation - can be extended with complex logic
      if (!conditions || Object.keys(conditions).length === 0) {
        return true;
      }

      // Check if all conditions match
      for (const [key, value] of Object.entries(conditions)) {
        if (context[key] !== value) {
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error(
        `Error evaluating conditions: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  /**
   * Disable a trigger
   */
  async disableTrigger(
    triggerId: string,
    disabledBy: string
  ): Promise<SerialAssignmentTrigger> {
    try {
      logger.info(`Disabling trigger ${triggerId}`);

      const trigger = await this.prisma.serialAssignmentTrigger.update({
        where: { id: triggerId },
        data: { isActive: false },
      });

      // Create audit trail
      await this.createAuditTrail({
        triggerId,
        partId: trigger.partId,
        eventType: 'TRIGGER_DISABLED',
        performedBy: disabledBy,
      });

      logger.info(`Trigger ${triggerId} disabled successfully`);
      return trigger;
    } catch (error) {
      logger.error(
        `Error disabling trigger: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Enable a trigger
   */
  async enableTrigger(
    triggerId: string,
    enabledBy: string
  ): Promise<SerialAssignmentTrigger> {
    try {
      logger.info(`Enabling trigger ${triggerId}`);

      const trigger = await this.prisma.serialAssignmentTrigger.update({
        where: { id: triggerId },
        data: { isActive: true },
      });

      // Create audit trail
      await this.createAuditTrail({
        triggerId,
        partId: trigger.partId,
        eventType: 'TRIGGER_ENABLED',
        performedBy: enabledBy,
      });

      logger.info(`Trigger ${triggerId} enabled successfully`);
      return trigger;
    } catch (error) {
      logger.error(
        `Error enabling trigger: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Delete a trigger
   */
  async deleteTrigger(triggerId: string, deletedBy: string): Promise<void> {
    try {
      logger.info(`Deleting trigger ${triggerId}`);

      // Get trigger for audit
      const trigger = await this.prisma.serialAssignmentTrigger.findUnique({
        where: { id: triggerId },
      });

      if (!trigger) {
        throw new Error(`Trigger ${triggerId} not found`);
      }

      // Delete trigger
      await this.prisma.serialAssignmentTrigger.delete({
        where: { id: triggerId },
      });

      // Create audit trail
      await this.createAuditTrail({
        triggerId,
        partId: trigger.partId,
        eventType: 'TRIGGER_DELETED',
        performedBy: deletedBy,
        details: JSON.stringify({
          triggerType: trigger.triggerType,
          assignmentType: trigger.assignmentType,
        }),
      });

      logger.info(`Trigger ${triggerId} deleted successfully`);
    } catch (error) {
      logger.error(
        `Error deleting trigger: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Get trigger configuration statistics
   */
  async getTriggerStatistics(partId?: string): Promise<{
    totalTriggers: number;
    activeTriggers: number;
    byTriggerType: Record<TriggerType, number>;
    byAssignmentType: Record<AssignmentType, number>;
    withConditions: number;
    batchEnabled: number;
  }> {
    try {
      const where = partId ? { partId } : {};

      const allTriggers = await this.prisma.serialAssignmentTrigger.findMany({
        where,
      });

      const activeTriggers = allTriggers.filter((t) => t.isActive).length;
      const withConditions = allTriggers.filter((t) => t.isConditional).length;
      const batchEnabled = allTriggers.filter((t) => t.batchMode).length;

      const byTriggerType: Record<TriggerType, number> = {
        MATERIAL_RECEIPT: 0,
        WORK_ORDER_CREATE: 0,
        OPERATION_COMPLETE: 0,
        QUALITY_CHECKPOINT: 0,
        BATCH_COMPLETION: 0,
      };

      const byAssignmentType: Record<AssignmentType, number> = {
        VENDOR: 0,
        SYSTEM_GENERATED: 0,
        LATE_ASSIGNMENT: 0,
      };

      allTriggers.forEach((t) => {
        byTriggerType[t.triggerType as TriggerType]++;
        byAssignmentType[t.assignmentType as AssignmentType]++;
      });

      return {
        totalTriggers: allTriggers.length,
        activeTriggers,
        byTriggerType,
        byAssignmentType,
        withConditions,
        batchEnabled,
      };
    } catch (error) {
      logger.error(
        `Error getting trigger statistics: ${
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
    triggerId: string;
    partId: string;
    eventType: string;
    performedBy: string;
    details?: string;
  }): Promise<void> {
    try {
      await this.prisma.serialAssignmentAudit.create({
        data: {
          serialNumber: input.triggerId,
          serialId: input.triggerId,
          partId: input.partId,
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

export default SerialAssignmentTriggerConfigService;
