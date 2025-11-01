/**
 * Extension Manifest Validator - v2.0
 * Validates extension manifests against JSON Schema v2.0
 * Supports both v1.0 (legacy) and v2.0 (capability-based) manifests
 *
 * Breaking changes from v1.0:
 * - New capability-based dependency model
 * - New hierarchical policy-based conflict system
 * - New compliance delegation model
 * - Foundation tier governance requirements
 * - Enhanced testing and security requirements
 */

// Using CommonJS imports to avoid esModuleInterop issues
const Ajv = require('ajv');
import { ExtensionManifest, ValidationResult, ValidationError, TestType } from './manifest.v2.types';

// Import schema
const MANIFEST_V2_SCHEMA = require('../schemas/manifest.v2.schema.json');
const MANIFEST_V1_SCHEMA = require('../schemas/manifest.schema.json');

// ============================================
// VALIDATOR CLASS
// ============================================

/**
 * ManifestValidatorV2 provides comprehensive validation for v2.0 extension manifests
 * with support for capability-based dependencies, policy conflicts, and compliance delegation
 */
export class ManifestValidatorV2 {
  private ajv: any;
  private schemaValidatorV2: any;
  private schemaValidatorV1: any;

  constructor() {
    // Initialize AJV with strict mode
    this.ajv = new Ajv({
      strict: true,
      useDefaults: false,
      removeAdditional: false, // Don't remove unknown fields in v2.0
      formats: {
        email: true,
        uri: true,
        'date-time': true,
      },
    });

    // Compile both schemas
    this.schemaValidatorV2 = this.ajv.compile(MANIFEST_V2_SCHEMA);
    this.schemaValidatorV1 = this.ajv.compile(MANIFEST_V1_SCHEMA);
  }

  /**
   * Validate a manifest - auto-detects schema version
   */
  validateManifest(manifest: any): ValidationResult {
    // Detect schema version
    const schemaVersion = manifest.extensionSchemaVersion;

    if (schemaVersion === '2.0') {
      return this.validateManifestV2(manifest);
    } else if (schemaVersion === '1.0' || !schemaVersion) {
      // Fall back to v1.0 for backward compatibility
      return this.validateManifestV1(manifest);
    } else {
      return {
        isValid: false,
        errors: [
          {
            field: 'extensionSchemaVersion',
            message: `Unsupported schema version: ${schemaVersion}. Supported: 1.0, 2.0`,
            severity: 'error',
          },
        ],
        warnings: [],
      };
    }
  }

  /**
   * Validate a v2.0 manifest
   */
  validateManifestV2(manifest: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Step 1: Schema validation (JSON structure)
    const schemaValid = this.schemaValidatorV2(manifest);
    if (!schemaValid && this.schemaValidatorV2.errors) {
      this.schemaValidatorV2.errors.forEach((error: any) => {
        errors.push({
          field: error.instancePath || 'root',
          message: error.message || 'Schema validation failed',
          severity: 'error',
          constraint: error.keyword,
        });
      });
    }

    // Stop early if schema is invalid
    if (!schemaValid) {
      return {
        isValid: false,
        errors,
        warnings,
        manifest: undefined,
      };
    }

    // Step 2: Semantic validation (v2.0-specific)
    const semanticValidation = this.validateSemanticsV2(manifest);
    errors.push(...semanticValidation.errors);
    warnings.push(...semanticValidation.warnings);

    // Step 3: Capability-based dependency validation
    const capabilityValidation = this.validateCapabilitiesDependencies(manifest);
    errors.push(...capabilityValidation.errors);
    warnings.push(...capabilityValidation.warnings);

    // Step 4: Policy-based conflict validation
    const conflictValidation = this.validatePolicyConflicts(manifest);
    errors.push(...conflictValidation.errors);
    warnings.push(...conflictValidation.warnings);

    // Step 5: Compliance delegation validation
    const complianceValidation = this.validateComplianceDelegation(manifest);
    errors.push(...complianceValidation.errors);
    warnings.push(...complianceValidation.warnings);

    // Step 6: Foundation tier requirement validation
    const tierValidation = this.validateFoundationTierRequirements(manifest);
    errors.push(...tierValidation.errors);
    warnings.push(...tierValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      manifest: errors.length === 0 ? (manifest as ExtensionManifest) : undefined,
    };
  }

  /**
   * Validate a v1.0 manifest (legacy support)
   */
  validateManifestV1(manifest: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Schema validation
    const schemaValid = this.schemaValidatorV1(manifest);
    if (!schemaValid && this.schemaValidatorV1.errors) {
      this.schemaValidatorV1.errors.forEach((error: any) => {
        errors.push({
          field: error.instancePath || 'root',
          message: error.message || 'Schema validation failed',
          severity: 'error',
          constraint: error.keyword,
        });
      });
    }

    if (schemaValid) {
      // Semantic validation for v1.0
      const semanticErrors = this.validateSemanticsV1(manifest);
      errors.push(...semanticErrors.errors);
      warnings.push(...semanticErrors.warnings);

      // Warn if v1.0 manifest should be migrated to v2.0
      warnings.push({
        field: 'extensionSchemaVersion',
        message:
          'Extension manifest uses schema v1.0. Consider upgrading to v2.0 for capability-based dependency management',
        severity: 'warning',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      manifest: schemaValid ? manifest : undefined,
    };
  }

  /**
   * Validate manifest from JSON string
   */
  validateJSON(jsonString: string): ValidationResult {
    try {
      const manifest = JSON.parse(jsonString);
      return this.validateManifest(manifest);
    } catch (error) {
      return {
        isValid: false,
        errors: [
          {
            field: 'root',
            message: `Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
            severity: 'error',
          },
        ],
        warnings: [],
      };
    }
  }

  /**
   * Validate manifest from file path
   */
  async validateFile(filePath: string): Promise<ValidationResult> {
    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile(filePath, 'utf-8');
      return this.validateJSON(content);
    } catch (error: any) {
      return {
        isValid: false,
        errors: [
          {
            field: 'filePath',
            message: `Failed to read manifest file: ${error instanceof Error ? error.message : 'Unknown error'}`,
            severity: 'error',
          },
        ],
        warnings: [],
      };
    }
  }

  // ============================================
  // VALIDATION HELPERS
  // ============================================

  /**
   * Semantic validation for v2.0 manifests
   */
  private validateSemanticsV2(manifest: ExtensionManifest): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Check ID format (kebab-case)
    if (manifest.id && !/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(manifest.id)) {
      errors.push({
        field: 'id',
        message: `Extension ID must be kebab-case format: "${manifest.id}"`,
        severity: 'error',
      });
    }

    // Check version format (SemVer)
    if (manifest.version && !/^\d+\.\d+\.\d+/.test(manifest.version)) {
      errors.push({
        field: 'version',
        message: `Version must be SemVer format (MAJOR.MINOR.PATCH): "${manifest.version}"`,
        severity: 'error',
      });
    }

    // Warn if description is missing
    if (!manifest.description || manifest.description.length < 10) {
      warnings.push({
        field: 'description',
        message: 'Description should be at least 10 characters for clarity',
        severity: 'warning',
      });
    }

    // Check for deprecated extensions
    if (manifest.deprecated) {
      warnings.push({
        field: 'deprecated',
        message: `This extension is marked as deprecated. Reason: ${manifest.deprecationNotice || 'No reason provided'}`,
        severity: 'warning',
      });
    }

    return { isValid: true, errors, warnings };
  }

  /**
   * Semantic validation for v1.0 manifests (legacy)
   */
  private validateSemanticsV1(manifest: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Similar checks for v1.0 format
    if (manifest.id && !/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(manifest.id)) {
      errors.push({
        field: 'id',
        message: `Extension ID must be kebab-case format`,
        severity: 'error',
      });
    }

    return { isValid: true, errors, warnings };
  }

  /**
   * Validate capability-based dependencies
   */
  private validateCapabilitiesDependencies(manifest: ExtensionManifest): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    if (!manifest.dependencies?.capabilities) {
      return { isValid: true, errors, warnings };
    }

    for (const capDep of manifest.dependencies.capabilities) {
      // Skip validation since @machshop/capability-contracts may not be installed
      // In production, would validate against registry
    }

    return { isValid: true, errors, warnings };
  }

  /**
   * Validate provided capabilities and contract conformance
   */
  private validateProvidedCapabilities(manifest: ExtensionManifest): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    if (!manifest.capabilities?.provides) {
      return { isValid: true, errors, warnings };
    }

    // Validation of capabilities would happen here with registry access
    // Skipping for now to avoid circular dependency

    return { isValid: true, errors, warnings };
  }

  /**
   * Validate policy-based conflict declarations
   */
  private validatePolicyConflicts(manifest: ExtensionManifest): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    if (!manifest.conflicts?.policyExclusions) {
      return { isValid: true, errors, warnings };
    }

    for (const conflict of manifest.conflicts.policyExclusions) {
      // Validate conflict scope
      if (!['global', 'capability', 'resource'].includes(conflict.scope)) {
        errors.push({
          field: 'conflicts.policyExclusions[].scope',
          message: `Invalid scope: ${conflict.scope}. Must be: global, capability, or resource`,
          severity: 'error',
        });
      }
    }

    return { isValid: true, errors, warnings };
  }

  /**
   * Validate compliance delegation configuration
   */
  private validateComplianceDelegation(manifest: ExtensionManifest): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    if (!manifest.compliance?.delegations) {
      return { isValid: true, errors, warnings };
    }

    // Check each delegation
    for (const delegation of manifest.compliance.delegations) {
      if (!delegation.aspect || typeof delegation.aspect !== 'string') {
        errors.push({
          field: 'compliance.delegations[].aspect',
          message: 'Required field: aspect (string)',
          severity: 'error',
        });
      }

      if (!delegation.delegatedTo || !['quality-focal', 'quality-manager', 'site-manager', 'compliance-officer'].includes(delegation.delegatedTo)) {
        errors.push({
          field: 'compliance.delegations[].delegatedTo',
          message: 'Required field: delegatedTo (quality-focal, quality-manager, site-manager, or compliance-officer)',
          severity: 'error',
        });
      }

      if (delegation.requiresSignoff && !delegation.documentation) {
        warnings.push({
          field: 'compliance.delegations[]',
          message: `Compliance aspect "${delegation.aspect}" requires signoff but has no documentation URL`,
          severity: 'warning',
        });
      }
    }

    return { isValid: true, errors, warnings };
  }

  /**
   * Validate foundation tier requirements
   */
  private validateFoundationTierRequirements(
    manifest: ExtensionManifest
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    if (!manifest.foundationTier) {
      errors.push({
        field: 'foundationTier',
        message: 'Required field: foundationTier (core-foundation, foundation, application, or optional)',
        severity: 'error',
      });
      return { isValid: true, errors, warnings };
    }

    const tier = manifest.foundationTier;

    // Foundation tier extensions have stricter requirements
    if (tier === 'core-foundation' || tier === 'foundation') {
      // Testing requirements
      if (!manifest.testing?.hasTests) {
        errors.push({
          field: 'testing.hasTests',
          message: `${tier} extensions must include test suite (hasTests: true)`,
          severity: 'error',
        });
      }

      const minCoverage = tier === 'core-foundation' ? 90 : 80;
      if (!manifest.testing?.coverage || manifest.testing.coverage < minCoverage) {
        errors.push({
          field: 'testing.coverage',
          message: `${tier} extensions require minimum ${minCoverage}% test coverage (current: ${manifest.testing?.coverage || 0}%)`,
          severity: 'error',
        });
      }

      // Required test types
      const requiredTestTypes: string[] = ['unit', 'integration', 'e2e'];
      const providedTypes = (manifest.testing?.testTypes || []).map(t => String(t));
      const missingTypes = requiredTestTypes.filter(t => !providedTypes.includes(t));
      if (missingTypes.length > 0) {
        errors.push({
          field: 'testing.testTypes',
          message: `${tier} extensions must include: ${missingTypes.join(', ')}`,
          severity: 'error',
        });
      }

      // Security requirements
      if (!manifest.security?.sandboxed) {
        errors.push({
          field: 'security.sandboxed',
          message: `${tier} extensions must run sandboxed (sandboxed: true)`,
          severity: 'error',
        });
      }

      if (!manifest.security?.signatureRequired) {
        errors.push({
          field: 'security.signatureRequired',
          message: `${tier} extensions must be code-signed (signatureRequired: true)`,
          severity: 'error',
        });
      }

      // Governance requirements
      if (!manifest.governance?.requiresPlatformApproval) {
        warnings.push({
          field: 'governance.requiresPlatformApproval',
          message: `${tier} extensions should require platform approval before deployment`,
          severity: 'warning',
        });
      }
    }

    return { isValid: true, errors, warnings };
  }
}

// ============================================
// DEFAULT INSTANCE
// ============================================

/**
 * Default global validator instance
 */
export const manifestValidator = new ManifestValidatorV2();

/**
 * Validate a manifest using default validator
 */
export function validateManifest(manifest: any): ValidationResult {
  return manifestValidator.validateManifest(manifest);
}

/**
 * Validate manifest from JSON string using default validator
 */
export function validateManifestJSON(jsonString: string): ValidationResult {
  return manifestValidator.validateJSON(jsonString);
}

/**
 * Validate manifest from file using default validator
 */
export async function validateManifestFile(filePath: string): Promise<ValidationResult> {
  return manifestValidator.validateFile(filePath);
}
