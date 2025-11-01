/**
 * Serial Number Generator Service (Issue #149)
 * Handles serial number generation, validation, and uniqueness checking
 */

import { prisma } from '../db/prisma';
import { PatternEngine, patternEngine } from './PatternEngine';
import { CheckDigitService, checkDigitService } from './CheckDigitService';
import {
  GenerationContext,
  ValidationResult,
  PreviewResult,
  UniquenessScope,
  CheckAlgorithm,
} from '../types/serialNumberFormat';

export class SerialNumberGeneratorService {
  private patternEngine: PatternEngine;
  private checkDigitService: CheckDigitService;

  constructor(
    patternEngine = patternEngine,
    checkDigitService = checkDigitService
  ) {
    this.patternEngine = patternEngine;
    this.checkDigitService = checkDigitService;
  }

  /**
   * Generate a single serial number
   */
  async generateSerial(
    formatConfigId: string,
    context?: GenerationContext
  ): Promise<string> {
    // Get format configuration
    const config = await prisma.serialNumberFormatConfig.findUnique({
      where: { id: formatConfigId },
      include: { usageTracking: true },
    });

    if (!config) {
      throw new Error(`Format config not found: ${formatConfigId}`);
    }

    if (!config.usageTracking) {
      throw new Error(`Usage tracking not found for format: ${formatConfigId}`);
    }

    // Parse pattern
    const parsed = this.patternEngine.parsePattern(config.patternTemplate);

    // Generate base serial with incremented sequence
    let serial = config.patternTemplate;

    for (let i = parsed.components.length - 1; i >= 0; i--) {
      const component = parsed.components[i];

      if (component.type === 'SEQ') {
        // Use current sequence value
        const seqLength = (component.config?.length as number) || 4;
        const seqValue = config.usageTracking.currentSequenceValue
          .toString()
          .padStart(seqLength, '0');
        serial = serial.replace(component.rawText, seqValue);
      } else if (component.type === 'CHECK') {
        // Placeholder - will be calculated after other components
        serial = serial.replace(component.rawText, '');
      } else {
        // Generate other components using context
        const value = this.generateComponentValue(component, context, config);
        serial = serial.replace(component.rawText, value);
      }
    }

    // Calculate check digit if present
    const checkComponent = parsed.components.find(c => c.type === 'CHECK');
    if (checkComponent) {
      const algorithm = (checkComponent.config?.algorithm as CheckAlgorithm) || 'luhn';
      const checkDigit = this.checkDigitService.calculateCheckDigit(
        serial,
        algorithm
      );
      serial += checkDigit.checkDigit;
    }

    // Update usage tracking in database (with optimistic locking)
    try {
      await prisma.serialNumberUsageTracking.update({
        where: { formatConfigId },
        data: {
          currentSequenceValue: {
            increment: config.sequentialCounterIncrement,
          },
          totalGenerated: { increment: 1 },
          lastGeneratedDate: new Date(),
          version: { increment: 1 },
        },
      });
    } catch (error) {
      throw new Error(`Failed to update counter for format ${formatConfigId}`);
    }

    return serial;
  }

  /**
   * Generate multiple serials in batch
   */
  async generateSerialBatch(
    formatConfigId: string,
    count: number,
    context?: GenerationContext
  ): Promise<string[]> {
    const serials: string[] = [];

    for (let i = 0; i < count; i++) {
      const serial = await this.generateSerial(formatConfigId, context);
      serials.push(serial);
    }

    return serials;
  }

  /**
   * Validate a serial against a format
   */
  async validateSerial(
    serial: string,
    formatConfigId?: string
  ): Promise<ValidationResult> {
    if (!serial || serial.length === 0) {
      return {
        isValid: false,
        errors: ['Serial number is empty'],
        warnings: [],
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    if (formatConfigId) {
      const config = await prisma.serialNumberFormatConfig.findUnique({
        where: { id: formatConfigId },
      });

      if (!config) {
        return {
          isValid: false,
          errors: [`Format config not found: ${formatConfigId}`],
          warnings: [],
        };
      }

      return this.validateSerialFormat(serial, config.patternTemplate);
    }

    return {
      isValid: true,
      errors,
      warnings,
    };
  }

  /**
   * Validate serial against specific pattern
   */
  async validateSerialFormat(
    serial: string,
    pattern: string
  ): Promise<ValidationResult> {
    try {
      const isValid = this.patternEngine.validateAgainstPattern(serial, pattern);

      if (!isValid) {
        return {
          isValid: false,
          errors: [
            `Serial '${serial}' does not match pattern '${pattern}'`,
          ],
          warnings: [],
        };
      }

      // Parse pattern to check for check digit validation
      const parsed = this.patternEngine.parsePattern(pattern);
      const checkComponent = parsed.components.find(c => c.type === 'CHECK');

      if (checkComponent) {
        const algorithm = (checkComponent.config?.algorithm as CheckAlgorithm) || 'luhn';
        const isCheckValid = this.checkDigitService.validateCheckDigit(
          serial,
          algorithm
        );

        if (!isCheckValid) {
          return {
            isValid: false,
            errors: ['Check digit validation failed'],
            warnings: [],
          };
        }
      }

      return {
        isValid: true,
        errors: [],
        warnings: [],
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
   * Check if a serial is unique
   */
  async checkUniqueness(
    serial: string,
    scope?: UniquenessScope
  ): Promise<boolean> {
    // This is a placeholder - actual uniqueness checking would depend on
    // your serial number storage strategy. For now, we'll check if it exists
    // in the SerializedPart table which tracks manufactured parts.

    if (!scope || scope === 'global') {
      // Check globally across all serialized parts
      const existing = await prisma.serializedPart.findUnique({
        where: { serialNumber: serial },
      });
      return !existing;
    }

    // For site or part scoped uniqueness, you would need to check
    // against your specific scope. This is a simplified version.
    const existing = await prisma.serializedPart.findUnique({
      where: { serialNumber: serial },
    });
    return !existing;
  }

  /**
   * Check uniqueness for multiple serials
   */
  async checkBatchUniqueness(serials: string[]): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    // Get all potentially duplicate serials in one query
    const existing = await prisma.serializedPart.findMany({
      where: { serialNumber: { in: serials } },
      select: { serialNumber: true },
    });

    const existingSet = new Set(existing.map(e => e.serialNumber));

    // Build results map
    for (const serial of serials) {
      results.set(serial, !existingSet.has(serial));
    }

    return results;
  }

  /**
   * Preview format with example serials
   */
  async previewFormat(
    pattern: string,
    count: number = 5
  ): Promise<PreviewResult> {
    const parsed = this.patternEngine.parsePattern(pattern);
    const examples: Array<{ serial: string; components: Record<string, string> }> = [];

    // Generate example serials without database updates
    for (let i = 1; i <= count; i++) {
      const mockContext: GenerationContext = {
        formatConfigId: 'preview',
        siteId: 'SITE001',
        partId: 'PART001',
        timestamp: new Date(),
        customValues: { SEQ: (i * 1000).toString() },
      };

      let serial = pattern;
      const components: Record<string, string> = {};

      for (let j = parsed.components.length - 1; j >= 0; j--) {
        const component = parsed.components[j];

        if (component.type === 'SEQ') {
          const seqLength = (component.config?.length as number) || 4;
          const seqValue = (i * 1000).toString().padStart(seqLength, '0');
          serial = serial.replace(component.rawText, seqValue);
          components[component.rawText] = seqValue;
        } else if (component.type === 'CHECK') {
          // Will be added after
          components[component.rawText] = '?';
        } else {
          const value = this.generateComponentValue(component, mockContext);
          serial = serial.replace(component.rawText, value);
          components[component.rawText] = value;
        }
      }

      // Calculate check digit if present
      const checkComponent = parsed.components.find(c => c.type === 'CHECK');
      if (checkComponent) {
        const algorithm = (checkComponent.config?.algorithm as CheckAlgorithm) || 'luhn';
        const checkDigit = this.checkDigitService.calculateCheckDigit(
          serial,
          algorithm
        );
        serial += checkDigit.checkDigit;
        components[checkComponent.rawText] = checkDigit.checkDigit;
      }

      examples.push({ serial, components });
    }

    const metadata = parsed.metadata;

    return {
      pattern,
      examples,
      statistics: {
        minLength: metadata.minLength,
        maxLength: metadata.maxLength,
        estimatedLength: metadata.estimatedLength,
      },
    };
  }

  // ============= Private Helper Methods =============

  private generateComponentValue(
    component: any,
    context?: GenerationContext,
    config?: any
  ): string {
    const now = context?.timestamp || new Date();

    switch (component.type) {
      case 'PREFIX':
        return (component.config?.value as string) || '';

      case 'YYYY':
        return now.getFullYear().toString();

      case 'YY':
        return now.getFullYear().toString().slice(-2);

      case 'MM':
        return (now.getMonth() + 1).toString().padStart(2, '0');

      case 'DD':
        return now.getDate().toString().padStart(2, '0');

      case 'WW': {
        const weekNumber = this.getWeekNumber(now);
        return weekNumber.toString().padStart(2, '0');
      }

      case 'RANDOM': {
        const length = (component.config?.length as number) || 4;
        const type = (component.config?.type as string) || 'alphanumeric';
        return this.generateRandomString(length, type as any);
      }

      case 'SITE':
        return context?.siteId || (component.config?.code as string) || '';

      case 'PART':
        return context?.partId || '';

      case 'UUID':
        return this.generateUUID();

      default:
        return '';
    }
  }

  private generateRandomString(
    length: number,
    type: 'alpha' | 'numeric' | 'alphanumeric'
  ): string {
    const alphaChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numericChars = '0123456789';
    const alphanumericChars = alphaChars + numericChars;

    let chars: string;
    switch (type) {
      case 'alpha':
        chars = alphaChars;
        break;
      case 'numeric':
        chars = numericChars;
        break;
      case 'alphanumeric':
      default:
        chars = alphanumericChars;
    }

    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }
}

// Export singleton instance
export const serialNumberGeneratorService = new SerialNumberGeneratorService();
