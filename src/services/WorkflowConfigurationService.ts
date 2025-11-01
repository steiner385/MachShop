/**
 * Workflow Configuration Service (Issue #40)
 * Manages site, routing, and work order-level workflow configurations
 * Supports three modes: STRICT, FLEXIBLE, HYBRID
 */

import { Prisma, WorkflowMode } from "@prisma/client";
import prisma from "../lib/database";
import { logger } from "../utils/logger";

export interface EffectiveWorkflowConfiguration {
  mode: WorkflowMode;
  enforceOperationSequence: boolean;
  enforceStatusGating: boolean;
  allowExternalVouching: boolean;
  enforceQualityChecks: boolean;
  requireStartTransition: boolean;
  requireJustification: boolean;
  requireApproval: boolean;
  source: {
    site: any;
    routing?: any;
    workOrder?: any;
  };
  isStrictMode: boolean;
  isFlexibleMode: boolean;
  isHybridMode: boolean;
}

export interface OperationExecutionPermission {
  allowed: boolean;
  reason?: string;
  requiresApproval?: boolean;
}

export interface DataCollectionPermission {
  allowed: boolean;
  reason?: string;
  requiresApproval?: boolean;
}

export class WorkflowConfigurationService {
  /**
   * Get effective configuration for a work order with inheritance
   * Precedence: WorkOrder > Routing > Site
   */
  async getEffectiveConfiguration(
    workOrderId: string
  ): Promise<EffectiveWorkflowConfiguration> {
    try {
      // Get work order with routing
      const workOrder = await prisma.workOrder.findUnique({
        where: { id: workOrderId },
        include: {
          routing: true,
          workflowConfiguration: true,
        },
      });

      if (!workOrder) {
        throw new Error(`Work order ${workOrderId} not found`);
      }

      // Get site configuration
      const siteConfig = await prisma.siteWorkflowConfiguration.findUnique({
        where: { siteId: workOrder.siteId! },
      });

      if (!siteConfig) {
        throw new Error(
          `No site configuration found for site ${workOrder.siteId}`
        );
      }

      // Get routing configuration if exists
      let routingConfig = null;
      if (workOrder.routingId) {
        routingConfig = await prisma.routingWorkflowConfiguration.findUnique({
          where: { routingId: workOrder.routingId },
        });
      }

      // Get work order configuration if exists
      const woConfig = workOrder.workflowConfiguration;

      // Resolve with precedence: WorkOrder > Routing > Site
      const mode = woConfig?.mode ?? routingConfig?.mode ?? siteConfig.mode;

      return {
        mode,
        enforceOperationSequence:
          woConfig?.enforceOperationSequence ??
          routingConfig?.enforceOperationSequence ??
          siteConfig.enforceOperationSequence,
        enforceStatusGating:
          woConfig?.enforceStatusGating ??
          routingConfig?.enforceStatusGating ??
          siteConfig.enforceStatusGating,
        allowExternalVouching:
          woConfig?.allowExternalVouching ??
          routingConfig?.allowExternalVouching ??
          siteConfig.allowExternalVouching,
        enforceQualityChecks:
          woConfig?.enforceQualityChecks ??
          routingConfig?.enforceQualityChecks ??
          siteConfig.enforceQualityChecks,
        requireStartTransition:
          woConfig?.requireStartTransition ??
          routingConfig?.requireStartTransition ??
          siteConfig.requireStartTransition,
        requireJustification: siteConfig.requireJustification,
        requireApproval: siteConfig.requireApproval,
        source: { site: siteConfig, routing: routingConfig, workOrder: woConfig },
        isStrictMode: mode === "STRICT",
        isFlexibleMode: mode === "FLEXIBLE",
        isHybridMode: mode === "HYBRID",
      };
    } catch (error) {
      logger.error(
        `Failed to get effective configuration for ${workOrderId}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get site configuration
   */
  async getSiteConfiguration(siteId: string) {
    try {
      const config = await prisma.siteWorkflowConfiguration.findUnique({
        where: { siteId },
      });

      if (!config) {
        // Create default STRICT configuration if not exists
        return await this.createDefaultSiteConfiguration(siteId);
      }

      return config;
    } catch (error) {
      logger.error(`Failed to get site configuration for ${siteId}`, error);
      throw error;
    }
  }

  /**
   * Create default site configuration (STRICT mode)
   */
  async createDefaultSiteConfiguration(siteId: string) {
    try {
      return await prisma.siteWorkflowConfiguration.create({
        data: {
          siteId,
          mode: "STRICT",
          enforceOperationSequence: true,
          enforceStatusGating: true,
          allowExternalVouching: false,
          enforceQualityChecks: true,
          requireStartTransition: true,
          requireJustification: false,
          requireApproval: false,
          createdBy: "SYSTEM",
        },
      });
    } catch (error) {
      logger.error(`Failed to create default site configuration`, error);
      throw error;
    }
  }

  /**
   * Update site configuration
   */
  async updateSiteConfiguration(
    siteId: string,
    config: Partial<{
      mode: WorkflowMode;
      enforceOperationSequence: boolean;
      enforceStatusGating: boolean;
      allowExternalVouching: boolean;
      enforceQualityChecks: boolean;
      requireStartTransition: boolean;
      requireJustification: boolean;
      requireApproval: boolean;
    }>,
    updatedBy: string,
    reason?: string
  ) {
    try {
      const existing = await this.getSiteConfiguration(siteId);

      // Track changes for history
      const changes: any[] = [];
      for (const [key, value] of Object.entries(config)) {
        if ((existing as any)[key] !== value) {
          changes.push({
            field: key,
            oldValue: JSON.stringify((existing as any)[key]),
            newValue: JSON.stringify(value),
            changeReason: reason,
            changedBy: updatedBy,
          });
        }
      }

      // Update configuration
      const updated = await prisma.siteWorkflowConfiguration.update({
        where: { siteId },
        data: {
          ...config,
          updatedBy,
          updatedAt: new Date(),
        },
      });

      // Record history
      if (changes.length > 0) {
        await prisma.workflowConfigurationHistory.createMany({
          data: changes.map((change) => ({
            ...change,
            configType: "SITE",
            configId: existing.id,
            siteConfigId: existing.id,
          })),
        });

        logger.info(`Updated site configuration for ${siteId}`, {
          changes: changes.length,
          updatedBy,
        });
      }

      return updated;
    } catch (error) {
      logger.error(`Failed to update site configuration`, error);
      throw error;
    }
  }

  /**
   * Check if operation can be executed given configuration
   */
  async canExecuteOperation(
    workOrderId: string,
    operationId: string
  ): Promise<OperationExecutionPermission> {
    try {
      const config = await this.getEffectiveConfiguration(workOrderId);
      const workOrder = await prisma.workOrder.findUnique({
        where: { id: workOrderId },
      });

      if (!workOrder) {
        return {
          allowed: false,
          reason: "Work order not found",
        };
      }

      // STRICT mode: Require IN_PROGRESS status
      if (config.isStrictMode && workOrder.status !== "IN_PROGRESS") {
        return {
          allowed: false,
          reason:
            "STRICT mode requires work order to be IN_PROGRESS to execute operations",
        };
      }

      // FLEXIBLE mode: Allow any status
      if (config.isFlexibleMode) {
        return { allowed: true };
      }

      // HYBRID mode: Allow if status is valid or external vouching is approved
      if (config.isHybridMode) {
        if (
          workOrder.status === "IN_PROGRESS" ||
          workOrder.status === "COMPLETED"
        ) {
          return { allowed: true };
        }
        return {
          allowed: config.allowExternalVouching,
          reason: "HYBRID mode requires IN_PROGRESS status or external vouching",
          requiresApproval: config.allowExternalVouching,
        };
      }

      return { allowed: true };
    } catch (error) {
      logger.error(`Failed to check operation execution permission`, error);
      return {
        allowed: false,
        reason: "Error checking permissions",
      };
    }
  }

  /**
   * Check if data can be collected
   */
  async canCollectData(workOrderId: string): Promise<DataCollectionPermission> {
    try {
      const config = await this.getEffectiveConfiguration(workOrderId);
      const workOrder = await prisma.workOrder.findUnique({
        where: { id: workOrderId },
      });

      if (!workOrder) {
        return {
          allowed: false,
          reason: "Work order not found",
        };
      }

      // STRICT mode: Require status gating
      if (config.isStrictMode && config.enforceStatusGating) {
        if (workOrder.status !== "IN_PROGRESS") {
          return {
            allowed: false,
            reason:
              "STRICT mode with status gating requires IN_PROGRESS status",
          };
        }
      }

      // FLEXIBLE mode: Allow data collection without status constraints
      if (config.isFlexibleMode) {
        return { allowed: true };
      }

      // HYBRID mode: Allow if external vouching is enabled
      if (config.isHybridMode) {
        return { allowed: config.allowExternalVouching };
      }

      return { allowed: true };
    } catch (error) {
      logger.error(`Failed to check data collection permission`, error);
      return {
        allowed: false,
        reason: "Error checking permissions",
      };
    }
  }

  /**
   * Validate configuration
   */
  async validateConfiguration(
    config: Partial<any>
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validate mode
    if (config.mode && !["STRICT", "FLEXIBLE", "HYBRID"].includes(config.mode)) {
      errors.push("Invalid workflow mode");
    }

    // Validate STRICT mode: cannot have relaxed enforcement
    if (config.mode === "STRICT") {
      if (config.enforceOperationSequence === false) {
        errors.push("STRICT mode requires enforceOperationSequence");
      }
      if (config.enforceStatusGating === false) {
        errors.push("STRICT mode requires enforceStatusGating");
      }
      if (config.allowExternalVouching === true) {
        errors.push("STRICT mode does not allow external vouching");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create or update routing override
   */
  async createRoutingOverride(
    routingId: string,
    config: Partial<{
      mode?: WorkflowMode;
      enforceOperationSequence?: boolean;
      enforceStatusGating?: boolean;
      allowExternalVouching?: boolean;
      enforceQualityChecks?: boolean;
      requireStartTransition?: boolean;
      overrideReason?: string;
      approvedBy?: string;
    }>,
    createdBy: string
  ) {
    try {
      // Check if routing exists
      const routing = await prisma.routing.findUnique({
        where: { id: routingId },
      });

      if (!routing) {
        throw new Error(`Routing ${routingId} not found`);
      }

      // Get site configuration for default values
      const siteConfig = await this.getSiteConfiguration(routing.siteId!);

      // Check for existing override
      const existing = await prisma.routingWorkflowConfiguration.findUnique({
        where: { routingId },
      });

      let result;
      if (existing) {
        // Update existing override
        const changes: any[] = [];
        for (const [key, value] of Object.entries(config)) {
          if (key !== "overrideReason" && key !== "approvedBy") {
            if ((existing as any)[key] !== value) {
              changes.push({
                field: key,
                oldValue: JSON.stringify((existing as any)[key]),
                newValue: JSON.stringify(value),
                changedBy: createdBy,
              });
            }
          }
        }

        result = await prisma.routingWorkflowConfiguration.update({
          where: { routingId },
          data: {
            ...config,
            updatedAt: new Date(),
          },
        });

        // Record history
        if (changes.length > 0) {
          await prisma.workflowConfigurationHistory.createMany({
            data: changes.map((change) => ({
              ...change,
              configType: "ROUTING",
              configId: existing.id,
              siteConfigId: siteConfig.id,
            })),
          });
        }
      } else {
        // Create new override
        result = await prisma.routingWorkflowConfiguration.create({
          data: {
            routingId,
            siteConfigId: siteConfig.id,
            mode: config.mode || null,
            enforceOperationSequence: config.enforceOperationSequence || null,
            enforceStatusGating: config.enforceStatusGating || null,
            allowExternalVouching: config.allowExternalVouching || null,
            enforceQualityChecks: config.enforceQualityChecks || null,
            requireStartTransition: config.requireStartTransition || null,
            overrideReason: config.overrideReason,
            approvedBy: config.approvedBy,
            approvedAt: config.approvedBy ? new Date() : null,
            createdBy,
          },
        });

        logger.info(`Created routing override for ${routingId}`, {
          reason: config.overrideReason,
          createdBy,
        });
      }

      return result;
    } catch (error) {
      logger.error(`Failed to create routing override`, error);
      throw error;
    }
  }

  /**
   * Delete routing override
   */
  async deleteRoutingOverride(routingId: string) {
    try {
      await prisma.routingWorkflowConfiguration.delete({
        where: { routingId },
      });

      logger.info(`Deleted routing override for ${routingId}`);
      return { success: true };
    } catch (error) {
      logger.error(`Failed to delete routing override`, error);
      throw error;
    }
  }

  /**
   * Create work order override (requires approval)
   */
  async createWorkOrderOverride(
    workOrderId: string,
    config: Partial<{
      mode?: WorkflowMode;
      enforceOperationSequence?: boolean;
      enforceStatusGating?: boolean;
      allowExternalVouching?: boolean;
      enforceQualityChecks?: boolean;
      requireStartTransition?: boolean;
    }>,
    overrideReason: string,
    approvedBy: string,
    createdBy: string
  ) {
    try {
      // Validate inputs
      if (!overrideReason || overrideReason.trim().length === 0) {
        throw new Error("Override reason is required for work order overrides");
      }

      if (!approvedBy || approvedBy.trim().length === 0) {
        throw new Error("Approver is required for work order overrides");
      }

      // Check if work order exists
      const workOrder = await prisma.workOrder.findUnique({
        where: { id: workOrderId },
      });

      if (!workOrder) {
        throw new Error(`Work order ${workOrderId} not found`);
      }

      // Validate configuration
      const validation = await this.validateConfiguration(config);
      if (!validation.valid) {
        throw new Error(`Configuration validation failed: ${validation.errors.join(", ")}`);
      }

      // Check for existing override
      const existing = await prisma.workOrderWorkflowConfiguration.findUnique({
        where: { workOrderId },
      });

      let result;
      if (existing) {
        // Update existing override
        result = await prisma.workOrderWorkflowConfiguration.update({
          where: { workOrderId },
          data: {
            mode: config.mode || null,
            enforceOperationSequence: config.enforceOperationSequence || null,
            enforceStatusGating: config.enforceStatusGating || null,
            allowExternalVouching: config.allowExternalVouching || null,
            enforceQualityChecks: config.enforceQualityChecks || null,
            requireStartTransition: config.requireStartTransition || null,
            overrideReason,
            approvedBy,
            approvedAt: new Date(),
          },
        });

        logger.info(`Updated work order override for ${workOrderId}`, {
          reason: overrideReason,
          approvedBy,
        });
      } else {
        // Create new override
        result = await prisma.workOrderWorkflowConfiguration.create({
          data: {
            workOrderId,
            mode: config.mode || null,
            enforceOperationSequence: config.enforceOperationSequence || null,
            enforceStatusGating: config.enforceStatusGating || null,
            allowExternalVouching: config.allowExternalVouching || null,
            enforceQualityChecks: config.enforceQualityChecks || null,
            requireStartTransition: config.requireStartTransition || null,
            overrideReason,
            approvedBy,
            approvedAt: new Date(),
            createdBy,
          },
        });

        logger.info(`Created work order override for ${workOrderId}`, {
          reason: overrideReason,
          approvedBy,
        });
      }

      return result;
    } catch (error) {
      logger.error(`Failed to create work order override`, error);
      throw error;
    }
  }

  /**
   * Delete work order override
   */
  async deleteWorkOrderOverride(workOrderId: string) {
    try {
      await prisma.workOrderWorkflowConfiguration.delete({
        where: { workOrderId },
      });

      logger.info(`Deleted work order override for ${workOrderId}`);
      return { success: true };
    } catch (error) {
      logger.error(`Failed to delete work order override`, error);
      throw error;
    }
  }

  /**
   * Get configuration change history
   */
  async getConfigurationHistory(
    configType: "SITE" | "ROUTING" | "WORK_ORDER",
    configId: string,
    limit: number = 50
  ) {
    try {
      const history = await prisma.workflowConfigurationHistory.findMany({
        where: {
          configType,
          configId,
        },
        orderBy: { changedAt: "desc" },
        take: limit,
      });

      return history;
    } catch (error) {
      logger.error(`Failed to get configuration history`, error);
      throw error;
    }
  }

  /**
   * Get routing override
   */
  async getRoutingOverride(routingId: string) {
    try {
      return await prisma.routingWorkflowConfiguration.findUnique({
        where: { routingId },
      });
    } catch (error) {
      logger.error(`Failed to get routing override`, error);
      throw error;
    }
  }

  /**
   * Get work order override
   */
  async getWorkOrderOverride(workOrderId: string) {
    try {
      return await prisma.workOrderWorkflowConfiguration.findUnique({
        where: { workOrderId },
      });
    } catch (error) {
      logger.error(`Failed to get work order override`, error);
      throw error;
    }
  }
}

export default new WorkflowConfigurationService();
