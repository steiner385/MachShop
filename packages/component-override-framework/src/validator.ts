/**
 * Component Override Validator
 *
 * Validates component overrides against contracts and detects compatibility issues.
 *
 * @module component-override-framework/validator
 */

import {
  ComponentContract,
  ComponentOverrideDeclaration,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  CompatibilityCheckResult,
  CompatibilityIssue,
} from './types';

/**
 * Validate a component override against a contract
 */
export function validateOverride(
  override: ComponentOverrideDeclaration,
  contract: ComponentContract
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check required props
  for (const requiredProp of contract.requiredProps) {
    if (!hasRequiredProps(override.component, requiredProp.name)) {
      errors.push({
        code: 'MISSING_REQUIRED_PROP',
        message: `Override missing required prop: ${requiredProp.name}`,
        prop: requiredProp.name,
        severity: 'critical',
        fix: `Add ${requiredProp.name} to component's destructured props`,
      });
    }
  }

  // Check prop types
  for (const requiredProp of contract.requiredProps) {
    const propType = getPropType(override.component, requiredProp.name);
    if (propType && !isCompatibleType(propType, requiredProp.type)) {
      errors.push({
        code: 'TYPE_MISMATCH',
        message: `Prop ${requiredProp.name} has incompatible type: expected ${requiredProp.type}, got ${propType}`,
        prop: requiredProp.name,
        severity: 'critical',
        fix: `Update ${requiredProp.name} to accept ${requiredProp.type}`,
      });
    }
  }

  // Check hooks usage
  if (contract.hooks) {
    for (const hook of contract.hooks) {
      if (!usesHook(override.component, hook)) {
        warnings.push({
          code: 'MISSING_HOOK',
          message: `Override should use hook: ${hook}`,
          prop: hook,
          suggestion: `Consider using ${hook} for consistency with contract`,
        });
      }
    }
  }

  // Custom validation
  if (contract.customValidator) {
    const customResult = contract.customValidator(override.component);
    errors.push(...customResult.errors);
    warnings.push(...customResult.warnings);
  }

  // Override custom validation
  if (override.customValidator) {
    const overrideResult = override.customValidator(override.component, {});
    errors.push(...overrideResult.errors);
    warnings.push(...overrideResult.warnings);
  }

  return {
    valid: errors.length === 0,
    errors: errors.filter((e) => e.severity !== 'warning'),
    warnings,
  };
}

/**
 * Check component compatibility with contract
 */
export function checkCompatibility(
  override: ComponentOverrideDeclaration,
  contract: ComponentContract
): CompatibilityCheckResult {
  const issues: CompatibilityIssue[] = [];
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  const suggestions: string[] = [];

  // Check version compatibility
  if (contract.compatibilityRange) {
    if (!isVersionInRange(contract.version, contract.compatibilityRange)) {
      const issue: CompatibilityIssue = {
        type: 'version_incompatible',
        description: `Contract version ${contract.version} not in range ${contract.compatibilityRange}`,
        affected: contract.id,
        severity: 'high',
        suggestedFix: `Update override to support version ${contract.version}`,
      };
      issues.push(issue);
      riskLevel = 'high';
    }
  }

  // Check for breaking changes
  if (contract.breakingChanges && contract.breakingChanges.length > 0) {
    const issue: CompatibilityIssue = {
      type: 'other',
      description: `Contract has breaking changes: ${contract.breakingChanges.join(', ')}`,
      affected: contract.id,
      severity: 'high',
      suggestedFix: 'Review breaking changes and update override accordingly',
    };
    issues.push(issue);
    suggestions.push('Review and test with breaking changes');
    riskLevel = 'high';
  }

  // Check dependencies
  if (contract.dependencies) {
    for (const dep of contract.dependencies) {
      if (!hasDependency(override.component, dep)) {
        const issue: CompatibilityIssue = {
          type: 'dependency_missing',
          description: `Missing dependency: ${dep}`,
          affected: dep,
          severity: 'medium',
        };
        issues.push(issue);
        suggestions.push(`Ensure dependency ${dep} is available`);
        if (riskLevel !== 'high' && riskLevel !== 'critical') {
          riskLevel = 'medium';
        }
      }
    }
  }

  // Check prop compatibility
  const validation = validateOverride(override, contract);
  if (!validation.valid) {
    for (const error of validation.errors) {
      if (error.severity === 'critical') {
        const issue: CompatibilityIssue = {
          type: 'prop_mismatch',
          description: error.message,
          affected: error.prop || 'unknown',
          severity: 'critical',
          suggestedFix: error.fix,
        };
        issues.push(issue);
        riskLevel = 'critical';
      } else {
        const issue: CompatibilityIssue = {
          type: 'prop_mismatch',
          description: error.message,
          affected: error.prop || 'unknown',
          severity: 'high',
          suggestedFix: error.fix,
        };
        issues.push(issue);
        if (riskLevel !== 'critical') {
          riskLevel = 'high';
        }
      }
    }
  }

  return {
    compatible: issues.every((i) => i.severity !== 'critical'),
    issues,
    suggestions,
    riskLevel,
  };
}

/**
 * Get override impact assessment
 */
export function assessImpact(
  override: ComponentOverrideDeclaration,
  contract: ComponentContract
): {
  affectedComponents: string[];
  affectedUsers: number;
  performanceImpact: 'low' | 'medium' | 'high';
  securityImpact: 'none' | 'low' | 'medium' | 'high' | 'critical';
} {
  return {
    affectedComponents: contract.dependencies || [],
    affectedUsers: 0, // Would be determined from analytics
    performanceImpact: 'low', // Would be profiled
    securityImpact: 'none',
  };
}

// Helper functions

function hasRequiredProps(component: any, propName: string): boolean {
  if (!component || !component.length) return false;
  const code = component.toString();
  return code.includes(propName) || code.includes(`{${propName}}`);
}

function getPropType(component: any, propName: string): string | null {
  // In a real implementation, this would use TypeScript AST or reflection
  return null;
}

function isCompatibleType(actual: string, expected: string): boolean {
  // Simplified type compatibility check
  if (actual === expected) return true;
  if (expected === 'any') return true;
  if (actual === 'any') return false; // Stricter
  return false;
}

function usesHook(component: any, hookName: string): boolean {
  const code = component.toString();
  return code.includes(hookName);
}

function hasDependency(component: any, depName: string): boolean {
  // In a real implementation, check import statements
  return true; // Assume available for now
}

function isVersionInRange(version: string, range: string): boolean {
  // Simplified semver range check
  return true; // Would use semver library in production
}

/**
 * Create a fallback component wrapper
 */
export function createFallbackWrapper<P extends object>(
  component: React.ComponentType<P>,
  fallback: React.ComponentType<P>,
  onError?: (error: Error) => void
): React.ComponentType<P> {
  return function FallbackWrapper(props: P) {
    try {
      return React.createElement(component, props);
    } catch (error) {
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
      return React.createElement(fallback, props);
    }
  };
}

/**
 * Wrap component with validation
 */
export function wrapWithValidation<P extends object>(
  component: React.ComponentType<P>,
  validation: ValidationResult,
  onValidationFail?: () => void
): React.ComponentType<P> {
  return function ValidatedComponent(props: P) {
    if (!validation.valid) {
      if (onValidationFail) {
        onValidationFail();
      }
      console.error('Component validation failed:', validation.errors);
    }

    return React.createElement(component, props);
  };
}

// Import React for createElement
import * as React from 'react';
