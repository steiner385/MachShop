/**
 * Configuration Inheritance Resolver
 * Implements three-level configuration hierarchy for extensions:
 * 1. Extension Default Configuration
 * 2. Enterprise-wide Configuration Override
 * 3. Site-specific Configuration Override
 */

import { Logger } from 'winston';
import { ConfigurationHierarchy } from '../types/siteExtensionDeployment';

export class ConfigurationInheritanceResolver {
  constructor(private logger: Logger) {}

  /**
   * Resolve configuration with three-level inheritance
   * Returns merged configuration with audit trail
   */
  resolveConfiguration(
    extensionDefault: Record<string, unknown>,
    enterpriseOverride?: Record<string, unknown>,
    siteOverride?: Record<string, unknown>,
    inheritFromEnterprise: boolean = true,
    inheritFromExtension: boolean = true
  ): ConfigurationHierarchy {
    this.logger.debug('Resolving configuration hierarchy', {
      hasExtensionDefault: !!extensionDefault,
      hasEnterpriseOverride: !!enterpriseOverride,
      hasSiteOverride: !!siteOverride,
      inheritFromEnterprise,
      inheritFromExtension,
    });

    // Start with extension default or empty object
    let resolvedConfig = inheritFromExtension && extensionDefault
      ? this.deepClone(extensionDefault)
      : {};

    // Apply enterprise override
    if (inheritFromEnterprise && enterpriseOverride) {
      resolvedConfig = this.mergeConfigurations(resolvedConfig, enterpriseOverride);
      this.logger.debug('Applied enterprise configuration override');
    }

    // Apply site override (highest priority)
    if (siteOverride) {
      resolvedConfig = this.mergeConfigurations(resolvedConfig, siteOverride);
      this.logger.debug('Applied site-specific configuration override');
    }

    return {
      extensionDefault,
      enterpriseOverride,
      siteOverride,
      resolvedConfig,
      inheritFromEnterprise,
      inheritFromExtension,
    };
  }

  /**
   * Merge two configuration objects
   * Site and Enterprise configurations take precedence
   */
  private mergeConfigurations(
    base: Record<string, unknown>,
    override: Record<string, unknown>
  ): Record<string, unknown> {
    const merged = this.deepClone(base);

    for (const [key, overrideValue] of Object.entries(override)) {
      if (overrideValue === null || overrideValue === undefined) {
        // null/undefined values explicitly remove inherited settings
        delete merged[key];
        continue;
      }

      const baseValue = merged[key];

      // Deep merge objects, otherwise replace
      if (
        typeof baseValue === 'object' &&
        typeof overrideValue === 'object' &&
        !Array.isArray(baseValue) &&
        !Array.isArray(overrideValue)
      ) {
        merged[key] = this.mergeConfigurations(
          baseValue as Record<string, unknown>,
          overrideValue as Record<string, unknown>
        );
      } else {
        // Array and primitive values are replaced, not merged
        merged[key] = overrideValue;
      }
    }

    return merged;
  }

  /**
   * Deep clone an object to avoid mutations
   */
  private deepClone(obj: unknown): Record<string, unknown> {
    if (typeof obj !== 'object' || obj === null) {
      return {};
    }

    if (Array.isArray(obj)) {
      return obj.map(item =>
        typeof item === 'object' && item !== null ? this.deepClone(item) : item
      ) as unknown as Record<string, unknown>;
    }

    const cloned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (typeof value === 'object' && value !== null) {
        cloned[key] = this.deepClone(value);
      } else {
        cloned[key] = value;
      }
    }
    return cloned;
  }

  /**
   * Get difference between two configurations
   * Useful for change detection and auditing
   */
  getConfigurationDifference(
    baseConfig: Record<string, unknown>,
    newConfig: Record<string, unknown>
  ): Array<{
    path: string;
    oldValue: unknown;
    newValue: unknown;
    changeType: 'added' | 'removed' | 'modified';
  }> {
    const changes: Array<{
      path: string;
      oldValue: unknown;
      newValue: unknown;
      changeType: 'added' | 'removed' | 'modified';
    }> = [];

    const allKeys = new Set([
      ...Object.keys(baseConfig || {}),
      ...Object.keys(newConfig || {}),
    ]);

    for (const key of allKeys) {
      const oldValue = baseConfig?.[key];
      const newValue = newConfig?.[key];

      if (oldValue === newValue) {
        continue;
      }

      if (oldValue === undefined) {
        changes.push({
          path: key,
          oldValue: undefined,
          newValue,
          changeType: 'added',
        });
      } else if (newValue === undefined) {
        changes.push({
          path: key,
          oldValue,
          newValue: undefined,
          changeType: 'removed',
        });
      } else {
        changes.push({
          path: key,
          oldValue,
          newValue,
          changeType: 'modified',
        });
      }
    }

    return changes;
  }

  /**
   * Validate configuration against schema/rules
   */
  validateConfiguration(
    config: Record<string, unknown>,
    validationRules: Record<string, ValidationRule>
  ): {
    valid: boolean;
    errors: Array<{
      field: string;
      message: string;
      value: unknown;
    }>;
  } {
    const errors: Array<{
      field: string;
      message: string;
      value: unknown;
    }> = [];

    for (const [field, rule] of Object.entries(validationRules)) {
      const value = config[field];

      // Check required
      if (rule.required && (value === undefined || value === null)) {
        errors.push({
          field,
          message: `Field ${field} is required`,
          value,
        });
        continue;
      }

      if (value === undefined || value === null) {
        continue;
      }

      // Check type
      if (rule.type && typeof value !== rule.type) {
        errors.push({
          field,
          message: `Field ${field} must be of type ${rule.type}`,
          value,
        });
        continue;
      }

      // Check enum
      if (rule.enum && !rule.enum.includes(value as string)) {
        errors.push({
          field,
          message: `Field ${field} must be one of: ${rule.enum.join(', ')}`,
          value,
        });
        continue;
      }

      // Check min/max for numbers
      if (typeof value === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          errors.push({
            field,
            message: `Field ${field} must be at least ${rule.min}`,
            value,
          });
        }
        if (rule.max !== undefined && value > rule.max) {
          errors.push({
            field,
            message: `Field ${field} must be at most ${rule.max}`,
            value,
          });
        }
      }

      // Check pattern for strings
      if (typeof value === 'string' && rule.pattern) {
        if (!rule.pattern.test(value)) {
          errors.push({
            field,
            message: `Field ${field} does not match required pattern`,
            value,
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate configuration hash for change detection
   */
  generateConfigurationHash(config: Record<string, unknown>): string {
    const crypto = require('crypto');
    const configString = JSON.stringify(config, Object.keys(config).sort());
    return crypto.createHash('sha256').update(configString).digest('hex');
  }
}

/**
 * Validation rule for configuration fields
 */
export interface ValidationRule {
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  enum?: (string | number)[];
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: unknown) => boolean;
}
