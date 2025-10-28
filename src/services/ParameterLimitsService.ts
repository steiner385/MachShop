import { PrismaClient, ParameterLimits } from '@prisma/client';
import { createLogger } from '../utils/logger';

const prisma = new PrismaClient();
const logger = createLogger('ParameterLimitsService');

export interface LimitViolation {
  severity: 'OK' | 'INFO' | 'WARNING' | 'CRITICAL';
  type: string;
  message: string;
  value: number;
  limit?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class ParameterLimitsService {
  /**
   * Create or update parameter limits
   */
  async upsertLimits(
    parameterId: string,
    limits: Omit<ParameterLimits, 'id' | 'parameterId' | 'parameter' | 'createdAt' | 'updatedAt'>
  ): Promise<ParameterLimits> {
    // ✅ GITHUB ISSUE #12 FIX: Enhanced limit hierarchy validation with detailed guidance
    const validation = this.validateLimitHierarchy(limits);
    if (!validation.valid) {
      throw new Error(
        `Invalid parameter limit hierarchy configuration. The limit values do not follow the required ordering constraints. ` +
        `Parameter limits must follow this hierarchy: engineeringMin ≤ lowLowAlarm ≤ lowAlarm ≤ operatingMin ≤ LSL ≤ nominal ≤ USL ≤ operatingMax ≤ highAlarm ≤ highHighAlarm ≤ engineeringMax. ` +
        `Validation errors found: ${validation.errors.join('; ')}. ` +
        `To resolve this issue: ` +
        `1) Review and adjust the limit values to maintain proper ordering, ` +
        `2) Ensure each limit type serves its intended purpose (engineering limits protect equipment, alarms trigger notifications, operating limits define normal range, spec limits define quality boundaries), ` +
        `3) Consider setting unused limits to null instead of conflicting values, ` +
        `or 4) Use GET /api/v1/parameter-limits/validate to test limit configurations before saving.`
      );
    }

    logger.info('Upserting parameter limits', { parameterId });

    return await prisma.parameterLimits.upsert({
      where: { parameterId },
      create: {
        parameterId,
        ...limits,
      },
      update: limits,
    });
  }

  /**
   * Get limits for a parameter
   */
  async getLimits(parameterId: string): Promise<ParameterLimits | null> {
    return await prisma.parameterLimits.findUnique({
      where: { parameterId },
      include: {
        parameter: true,
      },
    });
  }

  /**
   * Delete limits for a parameter
   */
  async deleteLimits(parameterId: string): Promise<void> {
    await prisma.parameterLimits.delete({
      where: { parameterId },
    });
    logger.info('Deleted parameter limits', { parameterId });
  }

  /**
   * Validate that limit values follow proper hierarchy
   * engineeringMin <= lowLowAlarm <= lowAlarm <= operatingMin <= LSL <= nominal <= USL <= operatingMax <= highAlarm <= highHighAlarm <= engineeringMax
   */
  validateLimitHierarchy(
    limits: Omit<ParameterLimits, 'id' | 'parameterId' | 'parameter' | 'createdAt' | 'updatedAt'>
  ): ValidationResult {
    const errors: string[] = [];

    // Build ordered hierarchy of defined limits
    const hierarchy: Array<{ value: number | null; name: string }> = [
      { value: limits.engineeringMin, name: 'Engineering Min' },
      { value: limits.lowLowAlarm, name: 'Low-Low Alarm' },
      { value: limits.lowAlarm, name: 'Low Alarm' },
      { value: limits.operatingMin, name: 'Operating Min' },
      { value: limits.LSL, name: 'LSL' },
      { value: limits.nominalValue, name: 'Nominal' },
      { value: limits.USL, name: 'USL' },
      { value: limits.operatingMax, name: 'Operating Max' },
      { value: limits.highAlarm, name: 'High Alarm' },
      { value: limits.highHighAlarm, name: 'High-High Alarm' },
      { value: limits.engineeringMax, name: 'Engineering Max' },
    ];

    // Check that each value <= next value (ignoring nulls)
    for (let i = 0; i < hierarchy.length - 1; i++) {
      const current = hierarchy[i];

      if (current.value === null) continue;

      // Find next non-null value
      for (let j = i + 1; j < hierarchy.length; j++) {
        const next = hierarchy[j];
        if (next.value === null) continue;

        if (current.value > next.value) {
          // ✅ GITHUB ISSUE #12 FIX: Enhanced limit ordering validation messages
          errors.push(
            `${current.name} (${current.value}) must be ≤ ${next.name} (${next.value}). ` +
            `Current configuration violates the limit hierarchy ordering requirement.`
          );
        }
        break; // Only compare to next defined limit
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Evaluate a measured value against parameter limits
   * Returns the most severe violation found
   */
  evaluateValue(value: number, limits: ParameterLimits): LimitViolation {
    // Check limits in order of severity (most severe first)

    // Critical violations (engineering limits)
    if (limits.engineeringMax !== null && value > limits.engineeringMax) {
      return {
        severity: 'CRITICAL',
        type: 'ENGINEERING_HIGH',
        message: `Value exceeds engineering maximum limit - equipment damage risk`,
        value,
        limit: limits.engineeringMax,
      };
    }
    if (limits.engineeringMin !== null && value < limits.engineeringMin) {
      return {
        severity: 'CRITICAL',
        type: 'ENGINEERING_LOW',
        message: `Value below engineering minimum limit - equipment damage risk`,
        value,
        limit: limits.engineeringMin,
      };
    }

    // Critical alarms
    if (limits.highHighAlarm !== null && value > limits.highHighAlarm) {
      return {
        severity: 'CRITICAL',
        type: 'ALARM_HIGH_HIGH',
        message: `Critical high alarm - immediate action required`,
        value,
        limit: limits.highHighAlarm,
      };
    }
    if (limits.lowLowAlarm !== null && value < limits.lowLowAlarm) {
      return {
        severity: 'CRITICAL',
        type: 'ALARM_LOW_LOW',
        message: `Critical low alarm - immediate action required`,
        value,
        limit: limits.lowLowAlarm,
      };
    }

    // Warning level violations
    if (limits.highAlarm !== null && value > limits.highAlarm) {
      return {
        severity: 'WARNING',
        type: 'ALARM_HIGH',
        message: `High alarm - monitor closely`,
        value,
        limit: limits.highAlarm,
      };
    }
    if (limits.lowAlarm !== null && value < limits.lowAlarm) {
      return {
        severity: 'WARNING',
        type: 'ALARM_LOW',
        message: `Low alarm - monitor closely`,
        value,
        limit: limits.lowAlarm,
      };
    }

    // Operating range violations (info level)
    if (limits.operatingMax !== null && value > limits.operatingMax) {
      return {
        severity: 'INFO',
        type: 'OPERATING_HIGH',
        message: `Value above normal operating range`,
        value,
        limit: limits.operatingMax,
      };
    }
    if (limits.operatingMin !== null && value < limits.operatingMin) {
      return {
        severity: 'INFO',
        type: 'OPERATING_LOW',
        message: `Value below normal operating range`,
        value,
        limit: limits.operatingMin,
      };
    }

    // Quality spec violations (warning level)
    if (limits.USL !== null && value > limits.USL) {
      return {
        severity: 'WARNING',
        type: 'SPEC_HIGH',
        message: `Value exceeds upper specification limit (USL) - out of spec`,
        value,
        limit: limits.USL,
      };
    }
    if (limits.LSL !== null && value < limits.LSL) {
      return {
        severity: 'WARNING',
        type: 'SPEC_LOW',
        message: `Value below lower specification limit (LSL) - out of spec`,
        value,
        limit: limits.LSL,
      };
    }

    // All checks passed
    return {
      severity: 'OK',
      type: 'IN_SPEC',
      message: 'Value within all limits',
      value,
    };
  }

  /**
   * Get all parameters with limits
   */
  async getAllParametersWithLimits() {
    return await prisma.parameterLimits.findMany({
      include: {
        parameter: true,
      },
    });
  }
}

export const parameterLimitsService = new ParameterLimitsService();
