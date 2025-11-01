/**
 * Extension Manifest Validator
 * Validates extension manifests against the JSON Schema v1.0
 */

import Ajv, { ValidateFunction, JSONSchemaType } from 'ajv';
import {
  ExtensionManifest,
  ValidationResult,
  ValidationError,
  ExtensionType,
  ExtensionCategory,
  Permission,
  isExtensionManifest,
} from './manifest.types';

// Import schema
const MANIFEST_SCHEMA = require('../schemas/manifest.schema.json');

// ============================================
// VALIDATOR CLASS
// ============================================

/**
 * ManifestValidator provides comprehensive validation for extension manifests
 */
export class ManifestValidator {
  private ajv: Ajv;
  private schemaValidator: ValidateFunction<ExtensionManifest>;

  constructor() {
    // Initialize AJV with strict mode and formats
    this.ajv = new Ajv({
      strict: true,
      useDefaults: false,
      removeAdditional: 'all',
      formats: {
        email: true,
        uri: true,
        'date-time': true,
      },
    });

    // Compile the schema
    this.schemaValidator = this.ajv.compile<ExtensionManifest>(MANIFEST_SCHEMA);
  }

  /**
   * Validate a manifest object against the schema
   */
  validateManifest(manifest: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Schema validation
    const schemaValid = this.schemaValidator(manifest);

    if (!schemaValid && this.schemaValidator.errors) {
      this.schemaValidator.errors.forEach((error) => {
        errors.push({
          field: error.schemaPath || 'root',
          message: error.message || 'Validation failed',
          constraint: error.keyword,
        });
      });
    }

    // Semantic validation (additional checks beyond schema)
    if (schemaValid) {
      const semanticErrors = this.validateSemantics(manifest);
      errors.push(...semanticErrors.errors);
      warnings.push(...semanticErrors.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      manifest: schemaValid ? (manifest as ExtensionManifest) : undefined,
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
          },
        ],
        warnings: [],
      };
    }
  }

  /**
   * Validate manifest from file
   */
  validateFile(filePath: string): ValidationResult {
    try {
      const fs = require('fs');
      const content = fs.readFileSync(filePath, 'utf-8');
      return this.validateJSON(content);
    } catch (error) {
      return {
        isValid: false,
        errors: [
          {
            field: 'file',
            message: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        warnings: [],
      };
    }
  }

  /**
   * Perform semantic validation beyond schema
   */
  private validateSemantics(manifest: ExtensionManifest): { errors: ValidationError[]; warnings: ValidationError[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Validate ID format (additional check)
    if (manifest.id && !/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(manifest.id)) {
      errors.push({
        field: 'id',
        message: 'ID must be kebab-case with only lowercase letters, numbers, and hyphens',
        value: manifest.id,
      });
    }

    // Validate version is semver
    if (manifest.version && !this.isSemVer(manifest.version)) {
      errors.push({
        field: 'version',
        message: 'Version must follow SemVer format (e.g., 1.0.0)',
        value: manifest.version,
      });
    }

    // Validate dependency cycles (simple check)
    if (manifest.dependencies) {
      const hasSelfDep = Object.keys(manifest.dependencies).includes(manifest.id);
      if (hasSelfDep) {
        errors.push({
          field: 'dependencies',
          message: 'Extension cannot depend on itself',
          value: manifest.dependencies,
        });
      }
    }

    // Validate capabilities match type
    if (manifest.type === ExtensionType.UI_EXTENSION && !manifest.capabilities?.ui) {
      warnings.push({
        field: 'capabilities',
        message: 'UI extension should declare UI capabilities',
      });
    }

    if (
      manifest.type === ExtensionType.BUSINESS_LOGIC &&
      (!manifest.capabilities?.hooks || manifest.capabilities.hooks.length === 0)
    ) {
      warnings.push({
        field: 'capabilities',
        message: 'Business logic extension should declare hook capabilities',
      });
    }

    // Validate hook priorities are in range
    if (manifest.capabilities?.hooks) {
      manifest.capabilities.hooks.forEach((hook, index) => {
        if (hook.priority !== undefined && (hook.priority < 0 || hook.priority > 1000)) {
          errors.push({
            field: `capabilities.hooks[${index}].priority`,
            message: 'Hook priority must be between 0 and 1000',
            value: hook.priority,
          });
        }
      });
    }

    // Validate permissions are recognized
    if (manifest.permissions) {
      const validPermissions = Object.values(Permission);
      manifest.permissions.forEach((perm, index) => {
        if (!validPermissions.includes(perm as Permission)) {
          warnings.push({
            field: `permissions[${index}]`,
            message: `Unknown permission: ${perm}`,
            value: perm,
          });
        }
      });
    }

    // Validate configuration requirements
    if (manifest.configuration?.required && manifest.configuration?.properties) {
      manifest.configuration.required.forEach((requiredKey) => {
        if (!manifest.configuration?.properties?.[requiredKey]) {
          errors.push({
            field: 'configuration',
            message: `Required configuration key '${requiredKey}' not defined in properties`,
          });
        }
      });
    }

    // Validate deprecation notice if deprecated
    if (manifest.deprecated && !manifest.deprecationNotice) {
      warnings.push({
        field: 'deprecationNotice',
        message: 'Deprecated extension should include deprecation notice',
      });
    }

    // Validate test coverage
    if (manifest.testing?.coverage !== undefined) {
      if (manifest.testing.coverage < 50) {
        warnings.push({
          field: 'testing.coverage',
          message: 'Test coverage is below 50% - consider improving test coverage',
          value: manifest.testing.coverage,
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Check if string is valid SemVer
   */
  private isSemVer(version: string): boolean {
    const semverRegex =
      /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
    return semverRegex.test(version);
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Quick validation function
 */
export function validateManifest(manifest: any): ValidationResult {
  const validator = new ManifestValidator();
  return validator.validateManifest(manifest);
}

/**
 * Validate manifest from JSON string
 */
export function validateJSON(jsonString: string): ValidationResult {
  const validator = new ManifestValidator();
  return validator.validateJSON(jsonString);
}

/**
 * Validate manifest from file path
 */
export function validateFile(filePath: string): ValidationResult {
  const validator = new ManifestValidator();
  return validator.validateFile(filePath);
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(result: ValidationResult): string {
  if (result.isValid) {
    return '✓ Manifest is valid';
  }

  let output = '✗ Manifest validation failed:\n\n';

  if (result.errors.length > 0) {
    output += 'ERRORS:\n';
    result.errors.forEach((error) => {
      output += `  • ${error.field}: ${error.message}\n`;
      if (error.value !== undefined) {
        output += `    Value: ${JSON.stringify(error.value)}\n`;
      }
    });
  }

  if (result.warnings.length > 0) {
    output += '\nWARNINGS:\n';
    result.warnings.forEach((warning) => {
      output += `  ⚠ ${warning.field}: ${warning.message}\n`;
    });
  }

  return output;
}

/**
 * Check for dependency conflicts
 */
export function checkConflicts(manifest: ExtensionManifest, otherManifests: ExtensionManifest[]): string[] {
  const conflicts: string[] = [];

  if (!manifest.conflicts) {
    return conflicts;
  }

  otherManifests.forEach((other) => {
    const conflict = manifest.conflicts?.find((c) => c.id === other.id);
    if (conflict) {
      conflicts.push(`${other.name} (${other.id}) - ${conflict.reason || 'Incompatible'}`);
    }
  });

  return conflicts;
}

/**
 * Resolve version constraint (simple implementation)
 */
export function resolveVersionConstraint(version: string, constraint: string): boolean {
  const versionParts = version.split('.').map(Number);
  const constraintStr = constraint.trim();

  // Exact version match
  if (!constraintStr.match(/^[\^~><=]/)) {
    return version === constraintStr;
  }

  // Caret (^) - compatible with version
  if (constraintStr.startsWith('^')) {
    const baseParts = constraintStr.substring(1).split('.').map(Number);
    return (
      versionParts[0] === baseParts[0] &&
      (versionParts[1] > baseParts[1] ||
        (versionParts[1] === baseParts[1] && versionParts[2] >= baseParts[2]))
    );
  }

  // Tilde (~) - reasonably close version
  if (constraintStr.startsWith('~')) {
    const baseParts = constraintStr.substring(1).split('.').map(Number);
    return (
      versionParts[0] === baseParts[0] &&
      versionParts[1] === baseParts[1] &&
      versionParts[2] >= baseParts[2]
    );
  }

  // Greater than or equal (>=)
  if (constraintStr.startsWith('>=')) {
    const baseParts = constraintStr.substring(2).split('.').map(Number);
    return (
      versionParts[0] > baseParts[0] ||
      (versionParts[0] === baseParts[0] &&
        (versionParts[1] > baseParts[1] ||
          (versionParts[1] === baseParts[1] && versionParts[2] >= baseParts[2])))
    );
  }

  return false;
}
