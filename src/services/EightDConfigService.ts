/**
 * 8D Configuration Service
 * Manages site-level configuration for the 8D problem-solving framework
 */

import { PrismaClient } from '@prisma/client';

export interface EightDConfigInput {
  siteId?: string;
  autoSuggestOnCustomerComplaint?: boolean;
  autoSuggestOnCriticalNCR?: boolean;
  autoSuggestOnCostThreshold?: boolean;
  costThreshold?: number;
  autoSuggestOnRecurrence?: boolean;
  recurrenceThreshold?: number;
  requireQualityApprovalD4?: boolean;
  requireEngineeringApprovalD5?: boolean;
  requireManagementApprovalD8?: boolean;
  defaultD1TargetDays?: number;
  defaultD4TargetDays?: number;
  defaultD6TargetDays?: number;
  defaultCompletionTargetDays?: number;
  reportTemplate?: Record<string, any>;
}

export class EightDConfigService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get 8D configuration for a site (or global default)
   */
  async getConfig(siteId?: string): Promise<any> {
    const config = await this.prisma.eightDConfig.findUnique({
      where: { siteId: siteId || null },
    });

    if (!config && !siteId) {
      // Return default global configuration
      return this.getDefaultConfig();
    }

    return config;
  }

  /**
   * Create or update 8D configuration
   */
  async upsertConfig(input: EightDConfigInput): Promise<any> {
    const siteId = input.siteId || null;

    return this.prisma.eightDConfig.upsert({
      where: { siteId },
      update: {
        autoSuggestOnCustomerComplaint: input.autoSuggestOnCustomerComplaint,
        autoSuggestOnCriticalNCR: input.autoSuggestOnCriticalNCR,
        autoSuggestOnCostThreshold: input.autoSuggestOnCostThreshold,
        costThreshold: input.costThreshold ? BigInt(Math.floor(input.costThreshold * 100)) / BigInt(100) : undefined,
        autoSuggestOnRecurrence: input.autoSuggestOnRecurrence,
        recurrenceThreshold: input.recurrenceThreshold,
        requireQualityApprovalD4: input.requireQualityApprovalD4,
        requireEngineeringApprovalD5: input.requireEngineeringApprovalD5,
        requireManagementApprovalD8: input.requireManagementApprovalD8,
        defaultD1TargetDays: input.defaultD1TargetDays,
        defaultD4TargetDays: input.defaultD4TargetDays,
        defaultD6TargetDays: input.defaultD6TargetDays,
        defaultCompletionTargetDays: input.defaultCompletionTargetDays,
        reportTemplate: input.reportTemplate,
        updatedAt: new Date(),
      },
      create: {
        siteId,
        autoSuggestOnCustomerComplaint: input.autoSuggestOnCustomerComplaint ?? true,
        autoSuggestOnCriticalNCR: input.autoSuggestOnCriticalNCR ?? true,
        autoSuggestOnCostThreshold: input.autoSuggestOnCostThreshold ?? true,
        costThreshold: input.costThreshold ? BigInt(Math.floor(input.costThreshold * 100)) / BigInt(100) : undefined,
        autoSuggestOnRecurrence: input.autoSuggestOnRecurrence ?? true,
        recurrenceThreshold: input.recurrenceThreshold,
        requireQualityApprovalD4: input.requireQualityApprovalD4 ?? true,
        requireEngineeringApprovalD5: input.requireEngineeringApprovalD5 ?? true,
        requireManagementApprovalD8: input.requireManagementApprovalD8 ?? true,
        defaultD1TargetDays: input.defaultD1TargetDays ?? 3,
        defaultD4TargetDays: input.defaultD4TargetDays ?? 10,
        defaultD6TargetDays: input.defaultD6TargetDays ?? 30,
        defaultCompletionTargetDays: input.defaultCompletionTargetDays ?? 60,
        reportTemplate: input.reportTemplate,
      },
    });
  }

  /**
   * Check if 8D should be suggested for an NCR
   */
  async shouldSuggest8D(siteId: string, ncrData: {
    isCustomerComplaint?: boolean;
    severity?: string;
    estimatedCost?: number;
    causeCodeFrequency?: number;
  }): Promise<boolean> {
    const config = await this.getConfig(siteId);

    // Customer complaint
    if (ncrData.isCustomerComplaint && config.autoSuggestOnCustomerComplaint) {
      return true;
    }

    // Critical severity
    if (ncrData.severity === 'CRITICAL' && config.autoSuggestOnCriticalNCR) {
      return true;
    }

    // Cost threshold
    if (config.autoSuggestOnCostThreshold && config.costThreshold) {
      if (ncrData.estimatedCost && ncrData.estimatedCost >= Number(config.costThreshold)) {
        return true;
      }
    }

    // Recurrence
    if (config.autoSuggestOnRecurrence && config.recurrenceThreshold) {
      if (ncrData.causeCodeFrequency && ncrData.causeCodeFrequency >= config.recurrenceThreshold) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get default global 8D configuration
   */
  private getDefaultConfig(): any {
    return {
      id: 'default',
      siteId: null,
      autoSuggestOnCustomerComplaint: true,
      autoSuggestOnCriticalNCR: true,
      autoSuggestOnCostThreshold: true,
      costThreshold: 5000,
      autoSuggestOnRecurrence: true,
      recurrenceThreshold: 3,
      requireQualityApprovalD4: true,
      requireEngineeringApprovalD5: true,
      requireManagementApprovalD8: true,
      defaultD1TargetDays: 3,
      defaultD4TargetDays: 10,
      defaultD6TargetDays: 30,
      defaultCompletionTargetDays: 60,
      reportTemplate: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

export default EightDConfigService;
