/**
 * Manifest Validation Utility
 *
 * Validates extension manifests against the official schema,
 * providing detailed error reporting.
 */

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ValidationWarning {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationOptions {
  strict?: boolean;
}

/**
 * Validate manifest against schema
 */
export function validateManifestSchema(
  manifest: Record<string, unknown>,
  options: ValidationOptions = {}
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Required fields
  const requiredFields = ['name', 'type', 'version', 'description'];
  for (const field of requiredFields) {
    if (!manifest[field]) {
      errors.push({
        field,
        message: `required field is missing`,
        value: manifest[field],
      });
    }
  }

  // Validate name
  if (manifest.name && typeof manifest.name !== 'string') {
    errors.push({
      field: 'name',
      message: 'must be a string',
      value: manifest.name,
    });
  } else if (manifest.name && !/^[a-z0-9-]+$/.test(manifest.name as string)) {
    errors.push({
      field: 'name',
      message: 'must be lowercase alphanumeric with hyphens only',
      value: manifest.name,
    });
  }

  // Validate type
  const validTypes = [
    'ui-component',
    'business-logic',
    'data-model',
    'integration',
    'compliance',
    'infrastructure',
  ];
  if (manifest.type && !validTypes.includes(manifest.type as string)) {
    errors.push({
      field: 'type',
      message: `must be one of: ${validTypes.join(', ')}`,
      value: manifest.type,
    });
  }

  // Validate version
  if (manifest.version) {
    const versionStr = String(manifest.version);
    if (!/^\d+\.\d+\.\d+/.test(versionStr)) {
      errors.push({
        field: 'version',
        message: 'must follow semantic versioning (major.minor.patch)',
        value: manifest.version,
      });
    }
  }

  // Validate description
  if (manifest.description && typeof manifest.description !== 'string') {
    errors.push({
      field: 'description',
      message: 'must be a string',
      value: manifest.description,
    });
  }

  // Validate optional fields
  if (manifest.author && typeof manifest.author !== 'string') {
    errors.push({
      field: 'author',
      message: 'must be a string',
      value: manifest.author,
    });
  }

  if (manifest.license && typeof manifest.license !== 'string') {
    errors.push({
      field: 'license',
      message: 'must be a string',
      value: manifest.license,
    });
  }

  // Validate dependencies if present
  if (manifest.dependencies) {
    if (!Array.isArray(manifest.dependencies)) {
      errors.push({
        field: 'dependencies',
        message: 'must be an array',
        value: manifest.dependencies,
      });
    } else {
      (manifest.dependencies as unknown[]).forEach((dep, idx) => {
        if (typeof dep !== 'object' || !('name' in dep) || !('version' in dep)) {
          errors.push({
            field: `dependencies[${idx}]`,
            message: 'must have name and version properties',
            value: dep,
          });
        }
      });
    }
  }

  // Validate permissions if present
  if (manifest.permissions) {
    if (!Array.isArray(manifest.permissions)) {
      errors.push({
        field: 'permissions',
        message: 'must be an array',
        value: manifest.permissions,
      });
    }
  }

  // Add warnings for deprecated fields
  if (manifest.deprecated) {
    warnings.push({
      field: 'deprecated',
      message: 'This extension is marked as deprecated',
    });
  }

  // Strict mode additional checks
  if (options.strict) {
    if (!manifest.repository) {
      warnings.push({
        field: 'repository',
        message: 'recommended to include repository URL',
      });
    }

    if (!manifest.bugs) {
      warnings.push({
        field: 'bugs',
        message: 'recommended to include bug report URL',
      });
    }

    if (!manifest.homepage) {
      warnings.push({
        field: 'homepage',
        message: 'recommended to include project homepage',
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
 * Validate manifest file path
 */
export function validateManifestFile(filePath: string): ValidationResult {
  try {
    const fs = require('fs-extra');
    const manifest = fs.readJsonSync(filePath);
    return validateManifestSchema(manifest);
  } catch (error) {
    return {
      valid: false,
      errors: [
        {
          field: 'file',
          message: `Failed to read manifest: ${error.message}`,
        },
      ],
      warnings: [],
    };
  }
}
