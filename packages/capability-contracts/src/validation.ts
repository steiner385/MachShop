/**
 * Validation utilities for capability contracts
 */

import {
  CapabilityContract,
  CapabilityProvides,
  CapabilityDependency,
  MethodDefinition,
} from './types';
import { capabilityRegistry } from './registry';

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  value?: any;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// ============================================
// CONTRACT VALIDATION
// ============================================

/**
 * Validate a capability contract definition
 */
export function validateCapabilityContract(contract: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Required fields
  if (!contract.id || typeof contract.id !== 'string') {
    errors.push({
      field: 'id',
      message: 'Required field: id (string)',
      severity: 'error',
      value: contract.id,
    });
  }

  if (!contract.name || typeof contract.name !== 'string') {
    errors.push({
      field: 'name',
      message: 'Required field: name (string)',
      severity: 'error',
      value: contract.name,
    });
  }

  if (!contract.version || typeof contract.version !== 'string') {
    errors.push({
      field: 'version',
      message: 'Required field: version (string, SemVer format)',
      severity: 'error',
      value: contract.version,
    });
  }

  // Validate version format (basic SemVer check)
  if (contract.version && !/^v\d+\.\d+(\.\d+)?$/.test(contract.version)) {
    errors.push({
      field: 'version',
      message: `Invalid SemVer format: "${contract.version}" (expected vMAJOR.MINOR[.PATCH])`,
      severity: 'error',
      value: contract.version,
    });
  }

  // Validate interface
  if (!contract.interface || typeof contract.interface !== 'object') {
    errors.push({
      field: 'interface',
      message: 'Required field: interface (object)',
      severity: 'error',
    });
  } else if (!Array.isArray(contract.interface.methods)) {
    errors.push({
      field: 'interface.methods',
      message: 'Required field: interface.methods (array of MethodDefinition)',
      severity: 'error',
    });
  } else if (contract.interface.methods.length === 0) {
    warnings.push({
      field: 'interface.methods',
      message: 'Capability has no methods defined',
      severity: 'warning',
    });
  }

  // Validate required methods are listed
  if (contract.requiredMethods) {
    if (!Array.isArray(contract.requiredMethods)) {
      errors.push({
        field: 'requiredMethods',
        message: 'requiredMethods must be an array of method names',
        severity: 'error',
      });
    } else {
      const definedMethods = contract.interface?.methods?.map((m: any) => m.name) || [];
      for (const methodName of contract.requiredMethods) {
        if (!definedMethods.includes(methodName)) {
          errors.push({
            field: 'requiredMethods',
            message: `Required method "${methodName}" not defined in interface.methods`,
            severity: 'error',
            value: methodName,
          });
        }
      }
    }
  }

  // Validate knownProviders
  if (contract.knownProviders && !Array.isArray(contract.knownProviders)) {
    errors.push({
      field: 'knownProviders',
      message: 'knownProviders must be an array',
      severity: 'error',
    });
  } else if (!contract.knownProviders || contract.knownProviders.length === 0) {
    warnings.push({
      field: 'knownProviders',
      message: 'No known providers specified for capability',
      severity: 'warning',
    });
  }

  // Validate stability
  if (contract.stability && !['stable', 'beta', 'experimental'].includes(contract.stability)) {
    errors.push({
      field: 'stability',
      message: 'stability must be one of: stable, beta, experimental',
      severity: 'error',
      value: contract.stability,
    });
  }

  // Validate foundation tier if present
  if (
    contract.foundationTier &&
    !['core-foundation', 'foundation', 'application'].includes(contract.foundationTier)
  ) {
    errors.push({
      field: 'foundationTier',
      message: 'foundationTier must be one of: core-foundation, foundation, application',
      severity: 'error',
      value: contract.foundationTier,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================
// CAPABILITY PROVIDES VALIDATION
// ============================================

/**
 * Validate a CapabilityProvides declaration (from extension manifest)
 */
export function validateCapabilityProvides(
  provides: any,
  extensionId?: string
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Required fields
  if (!provides.name || typeof provides.name !== 'string') {
    errors.push({
      field: 'capabilities.provides[].name',
      message: 'Required field: name (string)',
      severity: 'error',
      value: provides.name,
    });
    return { valid: false, errors, warnings };
  }

  if (!provides.version || typeof provides.version !== 'string') {
    errors.push({
      field: 'capabilities.provides[].version',
      message: 'Required field: version (string)',
      severity: 'error',
      value: provides.version,
    });
  }

  // Check if capability exists in registry
  const contract = capabilityRegistry.getContract(provides.name);
  if (!contract) {
    errors.push({
      field: 'capabilities.provides[].name',
      message: `Capability "${provides.name}" not found in capability registry`,
      severity: 'error',
      value: provides.name,
    });
  } else {
    // Validate that all implemented methods exist in contract
    if (provides.implements && Array.isArray(provides.implements)) {
      const contractMethods = contract.interface.methods.map((m: MethodDefinition) => m.name);
      for (const method of provides.implements) {
        if (!contractMethods.includes(method)) {
          errors.push({
            field: 'capabilities.provides[].implements',
            message: `Method "${method}" not defined in capability contract`,
            severity: 'error',
            value: method,
          });
        }
      }

      // Warn if required methods are not implemented
      for (const requiredMethod of contract.requiredMethods) {
        if (!provides.implements.includes(requiredMethod)) {
          warnings.push({
            field: 'capabilities.provides[].implements',
            message: `Required method "${requiredMethod}" not implemented`,
            severity: 'warning',
            value: requiredMethod,
          });
        }
      }
    }

    // Validate policy if provided
    if (provides.policy) {
      const policies = contract.policies || [];
      if (!policies.find(p => p.id === provides.policy)) {
        warnings.push({
          field: 'capabilities.provides[].policy',
          message: `Policy "${provides.policy}" not defined in capability contract`,
          severity: 'warning',
          value: provides.policy,
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================
// CAPABILITY DEPENDENCY VALIDATION
// ============================================

/**
 * Validate a CapabilityDependency declaration (from extension manifest)
 */
export function validateCapabilityDependency(dependency: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Required fields
  if (!dependency.capability || typeof dependency.capability !== 'string') {
    errors.push({
      field: 'dependencies.capabilities[].capability',
      message: 'Required field: capability (string)',
      severity: 'error',
      value: dependency.capability,
    });
    return { valid: false, errors, warnings };
  }

  // Check if capability exists
  const contract = capabilityRegistry.getContract(dependency.capability);
  if (!contract) {
    errors.push({
      field: 'dependencies.capabilities[].capability',
      message: `Capability "${dependency.capability}" not found in registry`,
      severity: 'error',
      value: dependency.capability,
    });
  } else {
    // Check if preferred provider is valid
    if (dependency.provider) {
      const providers = capabilityRegistry.getProvidersFor(dependency.capability);
      if (!providers.includes(dependency.provider)) {
        errors.push({
          field: 'dependencies.capabilities[].provider',
          message: `Provider "${dependency.provider}" does not provide capability "${dependency.capability}"`,
          severity: 'error',
          value: dependency.provider,
        });
      }
    }

    // Warn if capability requires compliance signoff
    if (contract.compliance?.signoffRequired) {
      warnings.push({
        field: 'dependencies.capabilities[]',
        message: `Capability "${dependency.capability}" requires compliance signoff at each site`,
        severity: 'warning',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================
// CAPABILITY VERSION VALIDATION
// ============================================

/**
 * Validate version constraint
 */
export function validateCapabilityVersion(
  capabilityId: string,
  minVersion?: string
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!minVersion) {
    return { valid: true, errors, warnings };
  }

  const contract = capabilityRegistry.getContract(capabilityId);
  if (!contract) {
    errors.push({
      field: 'minVersion',
      message: `Capability "${capabilityId}" not found`,
      severity: 'error',
      value: minVersion,
    });
    return { valid: false, errors, warnings };
  }

  // Validate version format
  if (!/^v\d+(\.\d+)?$/.test(minVersion)) {
    errors.push({
      field: 'minVersion',
      message: `Invalid version format: "${minVersion}" (expected vMAJOR or vMAJOR.MINOR)`,
      severity: 'error',
      value: minVersion,
    });
  }

  // Check if available version satisfies constraint
  const versionResult = capabilityRegistry.validateVersionConstraint(
    contract.version,
    minVersion
  );

  if (!versionResult.satisfied) {
    errors.push({
      field: 'minVersion',
      message: versionResult.reason || 'Version constraint not satisfied',
      severity: 'error',
      value: minVersion,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================
// POLICY CONFLICT VALIDATION
// ============================================

/**
 * Validate policy conflict declaration
 */
export function validatePolicyConflict(conflict: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Required fields
  if (!conflict.scope || !['global', 'capability', 'resource'].includes(conflict.scope)) {
    errors.push({
      field: 'conflicts.policyExclusions[].scope',
      message: 'Required field: scope (must be: global, capability, or resource)',
      severity: 'error',
      value: conflict.scope,
    });
  }

  if (!conflict.policy || typeof conflict.policy !== 'string') {
    errors.push({
      field: 'conflicts.policyExclusions[].policy',
      message: 'Required field: policy (string)',
      severity: 'error',
      value: conflict.policy,
    });
  }

  if (!conflict.conflictsWith || !Array.isArray(conflict.conflictsWith)) {
    errors.push({
      field: 'conflicts.policyExclusions[].conflictsWith',
      message: 'Required field: conflictsWith (array of policy names)',
      severity: 'error',
      value: conflict.conflictsWith,
    });
  }

  // Scope-specific validation
  if (conflict.scope === 'capability' || conflict.scope === 'resource') {
    if (!conflict.capability || typeof conflict.capability !== 'string') {
      errors.push({
        field: 'conflicts.policyExclusions[].capability',
        message:
          'Required field when scope is capability or resource: capability (string)',
        severity: 'error',
        value: conflict.capability,
      });
    } else {
      // Check if capability exists
      const contract = capabilityRegistry.getContract(conflict.capability);
      if (!contract) {
        errors.push({
          field: 'conflicts.policyExclusions[].capability',
          message: `Capability "${conflict.capability}" not found in registry`,
          severity: 'error',
          value: conflict.capability,
        });
      }
    }
  }

  if (conflict.scope === 'resource') {
    if (!conflict.resource || typeof conflict.resource !== 'string') {
      errors.push({
        field: 'conflicts.policyExclusions[].resource',
        message: 'Required field when scope is resource: resource (string)',
        severity: 'error',
        value: conflict.resource,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Batch validate multiple validations
 */
export function aggregateValidationResults(results: ValidationResult[]): ValidationResult {
  const aggregated: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  for (const result of results) {
    if (!result.valid) {
      aggregated.valid = false;
    }
    aggregated.errors.push(...result.errors);
    aggregated.warnings.push(...result.warnings);
  }

  return aggregated;
}
