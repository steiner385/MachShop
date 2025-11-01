/**
 * Serial Number Format Config Service (Issue #149)
 * Manages format configuration CRUD, validation, and assignment operations
 */

import { prisma } from '../db/prisma';
import { PatternEngine } from './PatternEngine';
import {
  FormatConfigDTO,
  CreateFormatConfigDTO,
  UpdateFormatConfigDTO,
  ValidationResult,
  FilterOptions,
  AssignmentOptions,
  UsageStatistics,
  CounterStatus,
} from '../types/serialNumberFormat';

export class SerialNumberFormatConfigService {
  private patternEngine: PatternEngine;

  constructor() {
    this.patternEngine = new PatternEngine();
  }

  /**
   * Create a new format configuration
   */
  async createFormatConfig(
    data: CreateFormatConfigDTO
  ): Promise<any> {
    // Validate pattern before creating
    const validation = await this.validateFormatPattern(data.patternTemplate);
    if (!validation.isValid) {
      throw new Error(`Invalid pattern: ${validation.errors.join(', ')}`);
    }

    // Create format config with transaction
    const config = await prisma.serialNumberFormatConfig.create({
      data: {
        name: data.name,
        description: data.description,
        patternTemplate: data.patternTemplate,
        siteId: data.siteId,
        isActive: data.isActive ?? true,
        validationRules: data.validationRules
          ? JSON.stringify(data.validationRules)
          : null,
        sequentialCounterStart: data.sequentialCounterStart ?? 1,
        sequentialCounterIncrement: data.sequentialCounterIncrement ?? 1,
        counterResetRule: data.counterResetRule ?? null,
        createdBy: data.createdBy,
      },
    });

    // Create usage tracking record
    await prisma.serialNumberUsageTracking.create({
      data: {
        formatConfigId: config.id,
        currentSequenceValue: config.sequentialCounterStart,
      },
    });

    return config;
  }

  /**
   * Update an existing format configuration
   */
  async updateFormatConfig(
    id: string,
    data: UpdateFormatConfigDTO
  ): Promise<any> {
    // Validate pattern if being updated
    if (data.patternTemplate) {
      const validation = await this.validateFormatPattern(data.patternTemplate);
      if (!validation.isValid) {
        throw new Error(`Invalid pattern: ${validation.errors.join(', ')}`);
      }
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.patternTemplate !== undefined) {
      updateData.patternTemplate = data.patternTemplate;
      // Increment version when pattern changes
      const current = await prisma.serialNumberFormatConfig.findUnique({
        where: { id },
      });
      updateData.version = (current?.version ?? 1) + 1;
    }
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.validationRules !== undefined) {
      updateData.validationRules = data.validationRules
        ? JSON.stringify(data.validationRules)
        : null;
    }
    if (data.sequentialCounterStart !== undefined) {
      updateData.sequentialCounterStart = data.sequentialCounterStart;
    }
    if (data.sequentialCounterIncrement !== undefined) {
      updateData.sequentialCounterIncrement = data.sequentialCounterIncrement;
    }
    if (data.counterResetRule !== undefined) {
      updateData.counterResetRule = data.counterResetRule;
    }

    return prisma.serialNumberFormatConfig.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Delete a format configuration
   */
  async deleteFormatConfig(id: string): Promise<void> {
    // Delete in transaction to ensure consistency
    await prisma.$transaction([
      // Delete all assignments first
      prisma.serialFormatPartAssignment.deleteMany({
        where: { formatConfigId: id },
      }),
      prisma.serialFormatPartFamilyAssignment.deleteMany({
        where: { formatConfigId: id },
      }),
      // Delete usage tracking
      prisma.serialNumberUsageTracking.deleteMany({
        where: { formatConfigId: id },
      }),
      // Finally delete the config
      prisma.serialNumberFormatConfig.delete({
        where: { id },
      }),
    ]);
  }

  /**
   * Get a specific format configuration
   */
  async getFormatConfig(id: string): Promise<any> {
    const config = await prisma.serialNumberFormatConfig.findUnique({
      where: { id },
      include: {
        partAssignments: {
          include: { part: true },
        },
        usageTracking: true,
      },
    });

    if (!config) {
      throw new Error(`Format config not found: ${id}`);
    }

    return config;
  }

  /**
   * List format configurations with filtering
   */
  async listFormatConfigs(
    siteId: string,
    filters?: FilterOptions
  ): Promise<any[]> {
    return prisma.serialNumberFormatConfig.findMany({
      where: {
        siteId,
        isActive: filters?.isActive,
        ...(filters?.search && {
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        partAssignments: { include: { part: true } },
        usageTracking: true,
      },
      skip: filters?.skip,
      take: filters?.take,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Validate a format pattern
   */
  async validateFormatPattern(pattern: string): Promise<ValidationResult> {
    try {
      const syntax = this.patternEngine.validatePatternSyntax(pattern);

      if (!syntax.isValid) {
        return {
          isValid: false,
          errors: syntax.errors.map(e => e.message),
          warnings: [],
        };
      }

      const parsed = this.patternEngine.parsePattern(pattern);

      // Check for best practices
      const warnings: string[] = [];
      if (parsed.components.length === 0) {
        warnings.push('Pattern contains no components');
      }
      if (!parsed.metadata.hasCheckDigit) {
        warnings.push(
          'Pattern does not include a check digit for validation'
        );
      }
      if (!parsed.metadata.hasSequential) {
        warnings.push(
          'Pattern does not include sequential counter for uniqueness'
        );
      }

      return {
        isValid: syntax.isValid,
        errors: [],
        warnings,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [(error as Error).message],
        warnings: [],
      };
    }
  }

  /**
   * Validate complete format definition
   */
  async validateFormatDefinition(
    config: FormatConfigDTO
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate name
    if (!config.name || config.name.trim().length === 0) {
      errors.push('Format name is required');
    }

    // Validate pattern
    const patternValidation = await this.validateFormatPattern(
      config.patternTemplate
    );
    if (!patternValidation.isValid) {
      errors.push(...patternValidation.errors);
    }
    warnings.push(...patternValidation.warnings);

    // Validate counter settings
    if (config.sequentialCounterStart !== undefined) {
      if (config.sequentialCounterStart < 0) {
        errors.push('Sequential counter start must be >= 0');
      }
    }

    if (config.sequentialCounterIncrement !== undefined) {
      if (config.sequentialCounterIncrement < 1) {
        errors.push('Sequential counter increment must be >= 1');
      }
    }

    // Validate counter reset rule
    if (config.counterResetRule) {
      const validRules = ['daily', 'monthly', 'yearly'];
      if (!validRules.includes(config.counterResetRule)) {
        errors.push(
          `Invalid counter reset rule. Must be one of: ${validRules.join(', ')}`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Assign a format to a part
   */
  async assignFormatToPart(
    partId: string,
    formatConfigId: string,
    options?: AssignmentOptions
  ): Promise<any> {
    // Check that both part and format exist
    const [part, format] = await Promise.all([
      prisma.part.findUnique({ where: { id: partId } }),
      prisma.serialNumberFormatConfig.findUnique({
        where: { id: formatConfigId },
      }),
    ]);

    if (!part) {
      throw new Error(`Part not found: ${partId}`);
    }
    if (!format) {
      throw new Error(`Format config not found: ${formatConfigId}`);
    }

    // Upsert the assignment
    return prisma.serialFormatPartAssignment.upsert({
      where: {
        partId_formatConfigId: { partId, formatConfigId },
      },
      create: {
        partId,
        formatConfigId,
        isDefault: options?.isDefault ?? false,
        priority: options?.priority ?? 0,
        effectiveFrom: options?.effectiveFrom ?? new Date(),
        effectiveUntil: options?.effectiveUntil,
      },
      update: {
        isDefault: options?.isDefault,
        priority: options?.priority,
        effectiveFrom: options?.effectiveFrom,
        effectiveUntil: options?.effectiveUntil,
      },
    });
  }

  /**
   * Unassign a format from a part
   */
  async unassignFormatFromPart(
    partId: string,
    formatConfigId: string
  ): Promise<void> {
    await prisma.serialFormatPartAssignment.delete({
      where: {
        partId_formatConfigId: { partId, formatConfigId },
      },
    });
  }

  /**
   * Get the format assigned to a part (respecting priority and effective dates)
   */
  async getFormatForPart(partId: string): Promise<any | null> {
    const now = new Date();

    const assignment = await prisma.serialFormatPartAssignment.findFirst({
      where: {
        partId,
        effectiveFrom: { lte: now },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: now } }],
      },
      include: { formatConfig: true },
      orderBy: { priority: 'desc' },
    });

    return assignment?.formatConfig || null;
  }

  /**
   * Get usage statistics for a format
   */
  async getFormatUsageStats(formatConfigId: string): Promise<UsageStatistics> {
    const tracking = await prisma.serialNumberUsageTracking.findUnique({
      where: { formatConfigId },
    });

    if (!tracking) {
      throw new Error(`Usage tracking not found for format: ${formatConfigId}`);
    }

    return {
      formatConfigId,
      totalGenerated: tracking.totalGenerated,
      totalUsed: tracking.totalUsed,
      duplicateAttempts: tracking.duplicateAttempts,
      lastGeneratedDate: tracking.lastGeneratedDate,
      counterResetDate: tracking.counterResetDate,
    };
  }

  /**
   * Reset the sequential counter
   */
  async resetSequentialCounter(formatConfigId: string): Promise<void> {
    const config = await prisma.serialNumberFormatConfig.findUnique({
      where: { id: formatConfigId },
    });

    if (!config) {
      throw new Error(`Format config not found: ${formatConfigId}`);
    }

    await prisma.serialNumberUsageTracking.update({
      where: { formatConfigId },
      data: {
        currentSequenceValue: config.sequentialCounterStart,
        counterResetDate: new Date(),
        version: { increment: 1 }, // For optimistic locking
      },
    });
  }

  /**
   * Get counter status
   */
  async getCounterStatus(formatConfigId: string): Promise<CounterStatus> {
    const [config, tracking] = await Promise.all([
      prisma.serialNumberFormatConfig.findUnique({
        where: { id: formatConfigId },
      }),
      prisma.serialNumberUsageTracking.findUnique({
        where: { formatConfigId },
      }),
    ]);

    if (!config || !tracking) {
      throw new Error(`Configuration not found: ${formatConfigId}`);
    }

    return {
      formatConfigId,
      currentValue: tracking.currentSequenceValue,
      lastGenerated: tracking.lastGeneratedDate,
      totalGenerated: tracking.totalGenerated,
      totalUsed: tracking.totalUsed,
      duplicateAttempts: tracking.duplicateAttempts,
      nextValue: tracking.currentSequenceValue + config.sequentialCounterIncrement,
    };
  }
}

// Export singleton instance
export const serialNumberFormatConfigService = new SerialNumberFormatConfigService();
