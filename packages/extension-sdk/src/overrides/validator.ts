/**
 * Component Override Validator
 * Issue #428: Component Override Safety System with Fallback & Approval
 */

import type {
  ComponentOverrideDeclaration,
  ComponentContract,
  ValidationReport,
  ValidationError,
  ValidationWarning,
  ConflictDetectionResult,
  OverrideConflict,
  TestReport,
  IOverrideValidator,
} from './types';
import { OverrideValidationError, OverrideConflictError } from './types';
import { getOverrideRegistry } from './registry';

/**
 * Component Override Validator
 */
export class OverrideValidator implements IOverrideValidator {
  private componentContracts: Map<string, ComponentContract> = new Map();

  /**
   * Register a component contract
   */
  registerContract(contract: ComponentContract): void {
    this.componentContracts.set(contract.id, contract);
  }

  /**
   * Get component contract
   */
  getContract(componentId: string): ComponentContract | undefined {
    return this.componentContracts.get(componentId);
  }

  /**
   * Validate override declaration
   */
  validateOverride(declaration: ComponentOverrideDeclaration): ValidationReport {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields
    if (!declaration.overridesComponentId) {
      errors.push({
        field: 'overridesComponentId',
        message: 'Component ID is required',
        code: 'REQUIRED',
        severity: 'error',
      });
    }

    if (!declaration.component) {
      errors.push({
        field: 'component',
        message: 'Override component is required',
        code: 'REQUIRED',
        severity: 'error',
      });
    }

    if (!declaration.reason) {
      errors.push({
        field: 'reason',
        message: 'Business reason is required',
        code: 'REQUIRED',
        severity: 'error',
      });
    }

    if (!declaration.extensionId) {
      errors.push({
        field: 'extensionId',
        message: 'Extension ID is required',
        code: 'REQUIRED',
        severity: 'error',
      });
    }

    if (!declaration.version) {
      errors.push({
        field: 'version',
        message: 'Version is required',
        code: 'REQUIRED',
        severity: 'error',
      });
    }

    // Breaking change should have detailed justification
    if (declaration.breaking && declaration.reason.length < 20) {
      warnings.push({
        field: 'reason',
        message: 'Breaking change with short justification - consider providing more detail',
        code: 'SHORT_JUSTIFICATION',
      });
    }

    // Test report should be provided
    if (!declaration.testingReport) {
      warnings.push({
        field: 'testingReport',
        message: 'Test report URL not provided - strongly recommended',
        code: 'MISSING_TEST_REPORT',
      });
    }

    // Fallback should be provided
    if (!declaration.fallbackComponent) {
      warnings.push({
        field: 'fallbackComponent',
        message: 'No fallback component provided - override may break UI if loading fails',
        code: 'NO_FALLBACK',
      });
    }

    // Validate contract if exists
    let contractValid = true;
    if (declaration.implementsContract) {
      const contract = this.componentContracts.get(declaration.implementsContract);
      if (!contract) {
        errors.push({
          field: 'implementsContract',
          message: `Contract not found: ${declaration.implementsContract}`,
          code: 'CONTRACT_NOT_FOUND',
          severity: 'error',
        });
        contractValid = false;
      }
    }

    // Validate version constraints
    let versionConstraintsValid = true;
    const versionErrors = this.validateVersionConstraints(declaration);
    if (!versionErrors.valid) {
      errors.push(...versionErrors.errors);
      versionConstraintsValid = false;
    }

    // Validate site scoping
    if (declaration.scopedToSites && declaration.scopedToSites.length === 0) {
      warnings.push({
        field: 'scopedToSites',
        message: 'Empty site scope - override will not be applied',
        code: 'EMPTY_SITE_SCOPE',
      });
    }

    // Detect conflicts
    const conflictResult = this.detectConflicts(declaration);
    let conflictsFree = !conflictResult.hasConflicts;
    if (conflictResult.hasConflicts) {
      errors.push({
        field: 'overridesComponentId',
        message: `${conflictResult.conflicts.length} conflict(s) detected with other overrides`,
        code: 'CONFLICTS_DETECTED',
        severity: 'critical',
      });
      conflictsFree = false;
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      details: {
        contractValid,
        versionConstraintsValid,
        testReportValid: !!declaration.testingReport,
        fallbackValid: !!declaration.fallbackComponent,
        conflictsFree,
      },
    };
  }

  /**
   * Validate contract compatibility
   */
  validateContractCompatibility(
    override: ComponentOverrideDeclaration,
    contract: ComponentContract
  ): ValidationReport {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check required props are implemented
    if (contract.requiredProps) {
      for (const prop of Object.keys(contract.requiredProps)) {
        // This would require runtime inspection or JSDoc analysis
        // For now, we'll assume compatibility if component exists
        warnings.push({
          field: `props.${prop}`,
          message: `Required prop "${prop}" should be supported`,
          code: 'MISSING_PROP',
        });
      }
    }

    // Check accessibility requirements
    if (contract.a11yRequirements && contract.a11yRequirements.length > 0) {
      warnings.push({
        field: 'a11yRequirements',
        message: `Override must support ${contract.a11yRequirements.length} accessibility requirements`,
        code: 'A11Y_REQUIREMENTS',
      });
    }

    // Check theme token usage
    if (contract.themeTokens && contract.themeTokens.length > 0) {
      warnings.push({
        field: 'themeTokens',
        message: `Override must respect ${contract.themeTokens.length} theme tokens`,
        code: 'THEME_TOKENS',
      });
    }

    // Check performance requirements
    if (contract.performanceRequirements) {
      if (contract.performanceRequirements.maxLoadTimeMs) {
        warnings.push({
          field: 'performance.loadTime',
          message: `Override must load in <= ${contract.performanceRequirements.maxLoadTimeMs}ms`,
          code: 'PERF_REQUIREMENT',
        });
      }
      if (contract.performanceRequirements.maxRenderTimeMs) {
        warnings.push({
          field: 'performance.renderTime',
          message: `Override must render in <= ${contract.performanceRequirements.maxRenderTimeMs}ms`,
          code: 'PERF_REQUIREMENT',
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      details: {
        contractValid: true,
        versionConstraintsValid: true,
        testReportValid: true,
        fallbackValid: true,
        conflictsFree: true,
      },
    };
  }

  /**
   * Validate version constraints
   */
  validateVersionConstraints(override: ComponentOverrideDeclaration): ValidationReport {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!override.versionConstraints) {
      warnings.push({
        field: 'versionConstraints',
        message: 'No version constraints specified - compatibility not verified',
        code: 'NO_VERSION_CONSTRAINTS',
      });
      return {
        valid: true,
        errors,
        warnings,
        details: {
          contractValid: true,
          versionConstraintsValid: false,
          testReportValid: true,
          fallbackValid: true,
          conflictsFree: true,
        },
      };
    }

    // Validate constraint format
    for (const [key, constraint] of Object.entries(override.versionConstraints)) {
      if (!this.isValidVersionConstraint(constraint)) {
        errors.push({
          field: `versionConstraints.${key}`,
          message: `Invalid version constraint: ${constraint}`,
          code: 'INVALID_CONSTRAINT',
          severity: 'error',
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      details: {
        contractValid: true,
        versionConstraintsValid: errors.length === 0,
        testReportValid: true,
        fallbackValid: true,
        conflictsFree: true,
      },
    };
  }

  /**
   * Validate test report
   */
  async validateTestReport(testReportUrl: string): Promise<ValidationReport> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!testReportUrl) {
      warnings.push({
        field: 'testingReport',
        message: 'No test report provided',
        code: 'NO_TEST_REPORT',
      });
      return {
        valid: true,
        errors,
        warnings,
        details: {
          contractValid: true,
          versionConstraintsValid: true,
          testReportValid: false,
          fallbackValid: true,
          conflictsFree: true,
        },
      };
    }

    // In a real implementation, fetch and validate the test report
    // For now, we just check the URL format
    try {
      new URL(testReportUrl);
    } catch {
      errors.push({
        field: 'testingReport',
        message: 'Invalid test report URL format',
        code: 'INVALID_URL',
        severity: 'error',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      details: {
        contractValid: true,
        versionConstraintsValid: true,
        testReportValid: errors.length === 0,
        fallbackValid: true,
        conflictsFree: true,
      },
    };
  }

  /**
   * Detect conflicts with other overrides
   */
  detectConflicts(override: ComponentOverrideDeclaration): ConflictDetectionResult {
    const registry = getOverrideRegistry();
    const conflicts: OverrideConflict[] = [];

    // Get other overrides for the same component
    const existingOverrides = registry.getOverridesForComponent(override.overridesComponentId);

    for (const existing of existingOverrides) {
      // Check for duplicate
      if (existing.overridesComponentId === override.overridesComponentId &&
          existing.extensionId !== override.extensionId) {
        conflicts.push({
          overrideId1: existing.id,
          overrideId2: override.id || `new-${override.extensionId}`,
          componentId: override.overridesComponentId,
          conflictType: 'duplicate',
          description: `Multiple extensions (${existing.extensionId}, ${override.extensionId}) are overriding the same component`,
          suggestedResolution: 'Coordinate with the other extension owner or use site scoping',
        });
      }

      // Check for site overlap
      if (override.scopedToSites && existing.scopedToSites) {
        const overlap = override.scopedToSites.filter(s => existing.scopedToSites!.includes(s));
        if (overlap.length > 0) {
          conflicts.push({
            overrideId1: existing.id,
            overrideId2: override.id || `new-${override.extensionId}`,
            componentId: override.overridesComponentId,
            conflictType: 'site_overlap',
            description: `Site scope overlap on: ${overlap.join(', ')}`,
            suggestedResolution: 'Adjust site scopes to avoid overlap or set priority',
          });
        }
      }

      // Check version compatibility
      if (existing.compatibleWith && override.compatibleWith) {
        const versionConflict = this.checkVersionConflict(
          existing.compatibleWith,
          override.compatibleWith
        );
        if (versionConflict) {
          conflicts.push({
            overrideId1: existing.id,
            overrideId2: override.id || `new-${override.extensionId}`,
            componentId: override.overridesComponentId,
            conflictType: 'incompatible_versions',
            description: versionConflict,
            suggestedResolution: 'Update version constraints to be compatible',
          });
        }
      }
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
    };
  }

  /**
   * Check if version constraint is valid
   */
  private isValidVersionConstraint(constraint: string): boolean {
    // Simple validation for patterns like ">=1.0.0", "^1.2.3", "~1.2.0", "1.2.3"
    const pattern = /^(>=|<=|>|<|=|~|\^)?(\d+\.\d+\.\d+)$/;
    return pattern.test(constraint);
  }

  /**
   * Check for version conflicts
   */
  private checkVersionConflict(
    version1: Record<string, string>,
    version2: Record<string, string>
  ): string | null {
    // Check if both require incompatible versions of same dependency
    for (const [pkg, v1] of Object.entries(version1)) {
      if (pkg in version2) {
        const v2 = version2[pkg];
        if (!this.versionsCompatible(v1, v2)) {
          return `Incompatible versions: ${pkg} requires ${v1} vs ${v2}`;
        }
      }
    }
    return null;
  }

  /**
   * Check if two version constraints are compatible
   */
  private versionsCompatible(v1: string, v2: string): boolean {
    // Simplified compatibility check
    // In production, would use semver library
    const extract = (v: string) => v.replace(/^[>=<~^]+/, '');
    const v1Base = extract(v1);
    const v2Base = extract(v2);

    // If either is exact version, check equality
    if (!v1.match(/[>=<~^]/)) return v1 === v2Base;
    if (!v2.match(/[>=<~^]/)) return v2 === v1Base;

    // Both are ranges - assume compatible for now
    return true;
  }
}

/**
 * Singleton instance
 */
let validator: OverrideValidator | null = null;

/**
 * Get or create singleton validator
 */
export function getOverrideValidator(): OverrideValidator {
  if (!validator) {
    validator = new OverrideValidator();
  }
  return validator;
}
