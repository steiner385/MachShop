/**
 * Manifest Validator
 *
 * Validates extension manifests against schema and rules.
 *
 * @module extension-validation-framework/validators/manifestValidator
 */

import Ajv, { JSONSchemaType } from 'ajv';
import { ValidationContext, ValidationIssue, ManifestSchema } from '../types';

const ajv = new Ajv();

/**
 * Manifest JSON schema v2.0
 */
const MANIFEST_SCHEMA: JSONSchemaType<any> = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'MachShop Extension Manifest v2.0',
  type: 'object',
  required: ['id', 'name', 'version', 'manifest_version'],
  properties: {
    id: { type: 'string', pattern: '^[a-z0-9-]+$' },
    name: { type: 'string', minLength: 1, maxLength: 100 },
    version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+' },
    manifest_version: { type: 'string', enum: ['2.0.0'] },
    description: { type: 'string', maxLength: 500 },
    author: { type: 'string' },
    license: { type: 'string' },
    homepage: { type: 'string', format: 'uri' },
    repository: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        url: { type: 'string' },
      },
    },
    capabilities: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
          description: { type: 'string' },
          required: { type: 'boolean' },
        },
      },
    },
    ui_components: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'type'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string', enum: ['widget', 'page', 'modal', 'form'] },
          slot: { type: 'string' },
          permissions: { type: 'array', items: { type: 'string' } },
          category: { type: 'string' },
        },
      },
    },
    navigation: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          label: { type: 'string' },
          path: { type: 'string' },
          group: { type: 'string' },
          icon: { type: 'string' },
          permissions: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    configurations: {
      type: 'object',
      additionalProperties: true,
    },
  },
  additionalProperties: true,
};

/**
 * Validate manifest JSON schema
 */
export async function validateManifestSchema(
  context: ValidationContext
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  const validate = ajv.compile(MANIFEST_SCHEMA);
  const valid = validate(context.manifest);

  if (!valid && validate.errors) {
    validate.errors.forEach((error) => {
      issues.push({
        code: 'MANIFEST_SCHEMA_ERROR',
        message: `${error.instancePath || 'root'}: ${error.message}`,
        severity: 'error',
        file: context.manifestPath,
        ruleId: 'manifest-schema',
        fix: `Check manifest structure at ${error.instancePath}`,
      });
    });
  }

  return issues;
}

/**
 * Validate manifest semantics
 */
export async function validateManifestSemantics(
  context: ValidationContext
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const manifest = context.manifest;

  // Check ID format
  if (!/^[a-z0-9-]+$/.test(manifest.id)) {
    issues.push({
      code: 'INVALID_ID_FORMAT',
      message: `Extension ID must be lowercase alphanumeric with hyphens: ${manifest.id}`,
      severity: 'error',
      file: context.manifestPath,
      ruleId: 'manifest-semantics',
      fix: `Use lowercase letters, numbers, and hyphens (e.g., my-extension)`,
    });
  }

  // Check version format
  if (!/^\d+\.\d+\.\d+(-[a-z0-9]+)?$/.test(manifest.version)) {
    issues.push({
      code: 'INVALID_VERSION_FORMAT',
      message: `Version must follow semantic versioning: ${manifest.version}`,
      severity: 'error',
      file: context.manifestPath,
      ruleId: 'manifest-semantics',
      fix: `Use semver format like 1.0.0 or 1.0.0-alpha`,
    });
  }

  // Check name length
  if (manifest.name.length < 1) {
    issues.push({
      code: 'NAME_TOO_SHORT',
      message: 'Extension name is required',
      severity: 'error',
      file: context.manifestPath,
      ruleId: 'manifest-semantics',
    });
  }

  if (manifest.name.length > 100) {
    issues.push({
      code: 'NAME_TOO_LONG',
      message: `Extension name must be 100 characters or less: ${manifest.name.length}`,
      severity: 'error',
      file: context.manifestPath,
      ruleId: 'manifest-semantics',
      fix: `Shorten the extension name`,
    });
  }

  // Check for duplicate component IDs
  if (manifest.ui_components) {
    const ids = new Set<string>();
    manifest.ui_components.forEach((comp: any) => {
      if (ids.has(comp.id)) {
        issues.push({
          code: 'DUPLICATE_COMPONENT_ID',
          message: `Duplicate component ID: ${comp.id}`,
          severity: 'error',
          file: context.manifestPath,
          ruleId: 'manifest-semantics',
        });
      }
      ids.add(comp.id);
    });
  }

  // Check for duplicate navigation IDs
  if (manifest.navigation) {
    const ids = new Set<string>();
    manifest.navigation.forEach((nav: any) => {
      if (ids.has(nav.id)) {
        issues.push({
          code: 'DUPLICATE_NAVIGATION_ID',
          message: `Duplicate navigation ID: ${nav.id}`,
          severity: 'error',
          file: context.manifestPath,
          ruleId: 'manifest-semantics',
        });
      }
      ids.add(nav.id);
    });
  }

  // Warn if description missing
  if (!manifest.description) {
    issues.push({
      code: 'MISSING_DESCRIPTION',
      message: 'Extension should have a description',
      severity: 'warning',
      file: context.manifestPath,
      ruleId: 'manifest-semantics',
      fix: `Add a "description" field to manifest`,
    });
  }

  // Warn if author missing
  if (!manifest.author) {
    issues.push({
      code: 'MISSING_AUTHOR',
      message: 'Extension should specify an author',
      severity: 'warning',
      file: context.manifestPath,
      ruleId: 'manifest-semantics',
      fix: `Add an "author" field to manifest`,
    });
  }

  return issues;
}

/**
 * Validate manifest capabilities
 */
export async function validateCapabilities(
  context: ValidationContext
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const manifest = context.manifest;

  if (!manifest.capabilities || manifest.capabilities.length === 0) {
    issues.push({
      code: 'NO_CAPABILITIES',
      message: 'Extension should declare required capabilities',
      severity: 'info',
      file: context.manifestPath,
      ruleId: 'manifest-capabilities',
      fix: `Declare capabilities in the "capabilities" array`,
    });
    return issues;
  }

  // Validate each capability
  manifest.capabilities.forEach((cap: any, index: number) => {
    if (!cap.id) {
      issues.push({
        code: 'INVALID_CAPABILITY',
        message: `Capability ${index} missing ID`,
        severity: 'error',
        file: context.manifestPath,
        ruleId: 'manifest-capabilities',
      });
    }

    if (cap.id && !/^[a-z0-9:_-]+$/.test(cap.id)) {
      issues.push({
        code: 'INVALID_CAPABILITY_ID',
        message: `Invalid capability ID format: ${cap.id}`,
        severity: 'error',
        file: context.manifestPath,
        ruleId: 'manifest-capabilities',
      });
    }
  });

  return issues;
}

/**
 * Validate UI components
 */
export async function validateUIComponents(
  context: ValidationContext
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const manifest = context.manifest;

  if (!manifest.ui_components) {
    return issues;
  }

  manifest.ui_components.forEach((comp: any, index: number) => {
    // Check required fields
    if (!comp.id) {
      issues.push({
        code: 'COMPONENT_MISSING_ID',
        message: `Component ${index} missing ID`,
        severity: 'error',
        file: context.manifestPath,
        ruleId: 'manifest-ui-components',
      });
    }

    if (!comp.type) {
      issues.push({
        code: 'COMPONENT_MISSING_TYPE',
        message: `Component ${comp.id} missing type`,
        severity: 'error',
        file: context.manifestPath,
        ruleId: 'manifest-ui-components',
      });
    }

    // Validate type
    const validTypes = ['widget', 'page', 'modal', 'form'];
    if (comp.type && !validTypes.includes(comp.type)) {
      issues.push({
        code: 'INVALID_COMPONENT_TYPE',
        message: `Invalid component type: ${comp.type}. Must be one of: ${validTypes.join(', ')}`,
        severity: 'error',
        file: context.manifestPath,
        ruleId: 'manifest-ui-components',
      });
    }

    // Warn if widget without slot
    if (comp.type === 'widget' && !comp.slot) {
      issues.push({
        code: 'WIDGET_MISSING_SLOT',
        message: `Widget component ${comp.id} should specify a slot`,
        severity: 'warning',
        file: context.manifestPath,
        ruleId: 'manifest-ui-components',
      });
    }
  });

  return issues;
}

/**
 * Validate navigation configuration
 */
export async function validateNavigation(
  context: ValidationContext
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const manifest = context.manifest;

  if (!manifest.navigation) {
    return issues;
  }

  manifest.navigation.forEach((nav: any, index: number) => {
    // Check required fields
    if (!nav.id) {
      issues.push({
        code: 'NAV_MISSING_ID',
        message: `Navigation item ${index} missing ID`,
        severity: 'error',
        file: context.manifestPath,
        ruleId: 'manifest-navigation',
      });
    }

    if (!nav.label) {
      issues.push({
        code: 'NAV_MISSING_LABEL',
        message: `Navigation item ${nav.id} missing label`,
        severity: 'error',
        file: context.manifestPath,
        ruleId: 'manifest-navigation',
      });
    }

    // Warn if no path or href
    if (!nav.path && !nav.href) {
      issues.push({
        code: 'NAV_NO_TARGET',
        message: `Navigation item ${nav.id} should have path or href`,
        severity: 'warning',
        file: context.manifestPath,
        ruleId: 'manifest-navigation',
      });
    }
  });

  return issues;
}
