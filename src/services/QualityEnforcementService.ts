/**
 * Quality Enforcement Service (Issue #44)
 * Enforces configurable quality requirements with STRICT/FLEXIBLE/OPTIONAL/EXTERNAL modes
 * Supports site, routing, and operation-level quality configuration inheritance
 */

import { Prisma, QualityEnforcementMode } from "@prisma/client";
import prisma from "../lib/database";
import { logger } from "../utils/logger";
import { WorkflowConfigurationService } from "./WorkflowConfigurationService";

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface QualityRequirement {
  required: boolean;
  mode: QualityEnforcementMode;
  inspectionType?: string;
  sampleSize?: number;
  reason: string;
  source: "SITE" | "ROUTING" | "OPERATION";
}

export interface EffectiveQualityConfiguration {
  mode: QualityEnforcementMode;
  enforceInspectionPass: boolean;
  requireElectronicSig: boolean;
  acceptExternalQuality: boolean;
  qualityRequired: boolean;
  inspectionType?: string;
  sampleSize?: number;
  source: {
    site?: any;
    routing?: any;
    operation?: any;
  };
}

export interface QualityEnforcementDecision {
  allowed: boolean;
  reason?: string;
  warnings: string[];
  configMode: QualityEnforcementMode;
  bypassesApplied: string[];
}

export interface DispositionValidation {
  valid: boolean;
  reason?: string;
  requiresApproval: boolean;
  approvalLevel?: string;
}

export interface SignatureRequirement {
  required: boolean;
  signatureLevel?: string;
  actionType: string;
}

// ============================================================================
// Quality Enforcement Service
// ============================================================================

export class QualityEnforcementService {
  private configService: WorkflowConfigurationService;

  constructor(configService?: WorkflowConfigurationService) {
    this.configService =
      configService || new WorkflowConfigurationService();
  }

  /**
   * Get effective quality configuration with inheritance
   * Precedence: Operation > Routing > Site
   */
  async getEffectiveQualityConfiguration(
    operationId: string
  ): Promise<EffectiveQualityConfiguration> {
    try {
      // Get operation with routing
      const operation = await prisma.workOrderOperation.findUnique({
        where: { id: operationId },
        include: {
          routingOperation: {
            include: {
              operation: {
                include: {
                  qualityConfiguration: true,
                },
              },
              routing: {
                include: {
                  qualityConfiguration: true,
                },
              },
            },
          },
          workOrder: true,
        },
      });

      if (!operation) {
        throw new Error(`Operation ${operationId} not found`);
      }

      // Get site configuration
      const siteConfig = await prisma.siteWorkflowConfiguration.findUnique({
        where: { siteId: operation.workOrder.siteId! },
      });

      if (!siteConfig) {
        throw new Error(
          `No site configuration found for site ${operation.workOrder.siteId}`
        );
      }

      // Get routing quality config if exists
      const routingQualityConfig =
        operation.routingOperation?.routing?.qualityConfiguration;

      // Get operation quality config if exists
      const operationQualityConfig =
        operation.routingOperation?.operation?.qualityConfiguration;

      // Resolve quality enforcement mode
      const mode: QualityEnforcementMode =
        routingQualityConfig?.qualityEnforcementMode ??
        (siteConfig.enforceQualityChecks ? "STRICT" : "OPTIONAL");

      // Resolve inspection pass requirement
      const enforceInspectionPass =
        routingQualityConfig?.enforceInspectionPass ??
        siteConfig.enforceQualityChecks;

      // Resolve electronic signature requirement
      const requireElectronicSig =
        routingQualityConfig?.requireElectronicSig ?? false;

      // Resolve external quality acceptance
      const acceptExternalQuality =
        operationQualityConfig?.acceptExternalQuality ?? false;

      // Determine if quality is required at operation level
      const qualityRequired =
        operationQualityConfig?.qualityRequired ?? true;

      return {
        mode,
        enforceInspectionPass,
        requireElectronicSig,
        acceptExternalQuality,
        qualityRequired,
        inspectionType: operationQualityConfig?.inspectionType,
        sampleSize: operationQualityConfig?.sampleSize,
        source: {
          site: siteConfig,
          routing: routingQualityConfig,
          operation: operationQualityConfig,
        },
      };
    } catch (error) {
      logger.error("Error getting effective quality configuration", error);
      throw error;
    }
  }

  /**
   * Check if quality inspection is required for an operation
   */
  async isQualityInspectionRequired(
    operationId: string
  ): Promise<QualityRequirement> {
    try {
      const config = await this.getEffectiveQualityConfiguration(operationId);

      // EXTERNAL mode: Quality managed by external system
      if (config.mode === "EXTERNAL") {
        return {
          required: false,
          mode: "EXTERNAL",
          reason: "Quality managed by external system",
          source: "SITE",
        };
      }

      // OPTIONAL mode: No quality required
      if (config.mode === "OPTIONAL") {
        return {
          required: false,
          mode: "OPTIONAL",
          reason: "Quality enforcement mode is OPTIONAL",
          source: "SITE",
        };
      }

      // Check operation-specific configuration
      if (!config.qualityRequired) {
        return {
          required: false,
          mode: config.mode,
          reason: "Operation marked as quality-exempt",
          source: "OPERATION",
        };
      }

      // Quality required (STRICT or RECOMMENDED)
      return {
        required: true,
        mode: config.mode,
        inspectionType: config.inspectionType,
        sampleSize: config.sampleSize,
        reason: `Quality inspection required (${config.mode} mode)`,
        source: config.source.operation
          ? "OPERATION"
          : config.source.routing
          ? "ROUTING"
          : "SITE",
      };
    } catch (error) {
      logger.error("Error checking quality inspection requirement", error);
      throw error;
    }
  }

  /**
   * Check if operation can complete without passing inspection
   */
  async canCompleteWithoutPassingInspection(
    operationId: string
  ): Promise<QualityEnforcementDecision> {
    try {
      const config = await this.getEffectiveQualityConfiguration(operationId);
      const bypassesApplied: string[] = [];
      const warnings: string[] = [];

      // Get latest quality inspection
      const inspection = await prisma.qualityInspection.findFirst({
        where: {
          workOrderOperationId: operationId,
          status: "COMPLETED",
        },
        orderBy: { completedAt: "desc" },
      });

      // No inspection found
      if (!inspection) {
        if (config.mode === "STRICT") {
          return {
            allowed: false,
            reason: "Quality inspection required but not performed",
            warnings: [],
            configMode: config.mode,
            bypassesApplied: [],
          };
        } else if (config.mode === "RECOMMENDED") {
          return {
            allowed: true,
            reason:
              "Quality inspection recommended but not required (RECOMMENDED mode)",
            warnings: ["No quality inspection performed"],
            configMode: config.mode,
            bypassesApplied: ["quality_inspection"],
          };
        } else {
          // OPTIONAL or EXTERNAL
          return {
            allowed: true,
            reason: "Quality inspection not required",
            warnings: [],
            configMode: config.mode,
            bypassesApplied: [],
          };
        }
      }

      // Inspection found, check result
      if (inspection.result !== "PASS") {
        if (
          config.enforceInspectionPass &&
          config.mode === "STRICT"
        ) {
          return {
            allowed: false,
            reason: `Quality inspection failed (${inspection.result}). Cannot complete in STRICT mode.`,
            warnings: [],
            configMode: config.mode,
            bypassesApplied: [],
          };
        } else if (config.mode === "RECOMMENDED") {
          bypassesApplied.push("quality_pass_requirement");
          warnings.push(`Quality inspection result: ${inspection.result}`);
          return {
            allowed: true,
            reason:
              "Operation can complete despite quality failure (RECOMMENDED mode)",
            warnings,
            configMode: config.mode,
            bypassesApplied,
          };
        }
      }

      return {
        allowed: true,
        reason: "Quality inspection passed or not required",
        warnings,
        configMode: config.mode,
        bypassesApplied,
      };
    } catch (error) {
      logger.error("Error checking operation completion", error);
      throw error;
    }
  }

  /**
   * Validate NCR disposition against configured rules
   */
  async validateNCRDisposition(
    ncrId: string,
    disposition: string
  ): Promise<DispositionValidation> {
    try {
      const ncr = await prisma.nCR.findUnique({
        where: { id: ncrId },
      });

      if (!ncr) {
        return {
          valid: false,
          reason: "NCR not found",
          requiresApproval: false,
        };
      }

      // Get disposition rules for site
      const rules = await prisma.nCRDispositionRule.findMany({
        where: {
          severity: ncr.severity!,
          isActive: true,
          OR: [{ siteId: ncr.siteId }, { siteId: null }], // Site-specific or global rules
        },
      });

      // If rules exist, check against them
      if (rules.length > 0) {
        for (const rule of rules) {
          if (rule.allowedDisposition.includes(disposition)) {
            return {
              valid: true,
              requiresApproval: rule.requiresApproval,
              approvalLevel: rule.approvalLevel || undefined,
            };
          }
        }

        // No matching rule found
        return {
          valid: false,
          reason: `Disposition '${disposition}' not allowed for ${ncr.severity} severity NCRs`,
          requiresApproval: false,
        };
      }

      // No rules configured - use default behavior
      // Default: Critical NCRs cannot use USE_AS_IS
      if (
        ncr.severity === "CRITICAL" &&
        disposition === "USE_AS_IS"
      ) {
        return {
          valid: false,
          reason:
            "Critical NCRs cannot be dispositioned as USE_AS_IS without explicit rule",
          requiresApproval: false,
        };
      }

      return {
        valid: true,
        requiresApproval: true, // Default: require approval
      };
    } catch (error) {
      logger.error("Error validating NCR disposition", error);
      throw error;
    }
  }

  /**
   * Check if electronic signature is required for quality action
   */
  async isElectronicSignatureRequired(
    actionType: string,
    siteId: string
  ): Promise<SignatureRequirement> {
    try {
      const requirement =
        await prisma.electronicSignatureRequirement.findFirst({
          where: {
            actionType,
            OR: [{ siteId }, { siteId: null }], // Site-specific or global
          },
        });

      return {
        required: requirement?.requiresSignature ?? false,
        signatureLevel: requirement?.signatureLevel || undefined,
        actionType,
      };
    } catch (error) {
      logger.error("Error checking electronic signature requirement", error);
      throw error;
    }
  }

  /**
   * Record quality enforcement action in audit trail
   */
  async recordQualityEnforcementAction(
    workOrderId: string,
    operationId: string,
    actionType: string,
    decision: QualityEnforcementDecision,
    userId?: string
  ): Promise<void> {
    try {
      await prisma.workflowEnforcementAudit.create({
        data: {
          workOrderId,
          operationId,
          action: `QUALITY_${actionType}`,
          enforcementMode: decision.configMode,
          bypassesApplied: decision.bypassesApplied,
          warnings: decision.warnings,
          userId,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      logger.error("Error recording quality enforcement action", error);
      // Don't throw - audit trail failure shouldn't block operations
    }
  }
}
