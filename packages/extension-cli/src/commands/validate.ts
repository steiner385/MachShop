/**
 * Manifest Validation Command
 *
 * Validates extension manifest files against the official schema,
 * providing detailed error reporting and auto-fix suggestions.
 */

import path from 'path';
import fs from 'fs-extra';
import { validateManifestSchema } from '../utils/manifest-validator';
import { printValidationResults } from '../utils/output-formatter';

export interface ValidateOptions {
  format?: string;
  strict?: boolean;
  fix?: boolean;
}

/**
 * Validate extension manifest
 */
export async function validateManifest(
  filePath?: string,
  options: ValidateOptions = {}
): Promise<void> {
  try {
    // Resolve manifest path
    const manifestPath = filePath
      ? path.resolve(filePath)
      : path.resolve('extension.manifest.json');

    // Check if file exists
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Manifest file not found: ${manifestPath}`);
    }

    console.log(`\n📋 Validating manifest: ${manifestPath}\n`);

    // Read manifest file
    let manifest: Record<string, unknown>;
    try {
      const content = fs.readFileSync(manifestPath, 'utf-8');
      manifest = JSON.parse(content);
    } catch (error) {
      throw new Error(`Invalid JSON in manifest: ${error.message}`);
    }

    // Validate manifest against schema
    const validationResult = validateManifestSchema(manifest, {
      strict: options.strict,
    });

    // Auto-fix if requested
    if (options.fix && validationResult.errors.length > 0) {
      console.log('🔧 Attempting to fix validation errors...\n');
      const fixed = attemptAutoFix(manifest, validationResult.errors);
      if (fixed) {
        manifest = fixed;
        // Re-validate after fixing
        const revalidation = validateManifestSchema(manifest, {
          strict: options.strict,
        });
        validationResult.errors = revalidation.errors;
        validationResult.warnings = revalidation.warnings;
      }
    }

    // Print results based on format
    if (options.format === 'json') {
      console.log(
        JSON.stringify(validationResult, null, 2)
      );
    } else {
      printValidationResults(validationResult);
    }

    // Write fixed manifest if auto-fix was applied
    if (options.fix && validationResult.errors.length === 0) {
      fs.writeJsonSync(manifestPath, manifest, { spaces: 2 });
      console.log(`\n✅ Manifest fixed and saved to ${manifestPath}\n`);
    }

    // Exit with appropriate code
    if (validationResult.errors.length > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error(`\n❌ Validation error: ${error.message}\n`);
    process.exit(1);
  }
}

/**
 * Attempt to auto-fix common validation errors
 */
function attemptAutoFix(
  manifest: Record<string, unknown>,
  errors: Array<{ field: string; message: string }>
): Record<string, unknown> | null {
  let fixed = { ...manifest };
  let hasChanges = false;

  for (const error of errors) {
    // Fix missing required fields
    if (error.message.includes('required')) {
      if (error.field === 'version' && !fixed.version) {
        fixed.version = '1.0.0';
        hasChanges = true;
      }
      if (error.field === 'name' && !fixed.name) {
        fixed.name = 'unknown-extension';
        hasChanges = true;
      }
      if (error.field === 'type' && !fixed.type) {
        fixed.type = 'ui-component';
        hasChanges = true;
      }
    }

    // Fix invalid types
    if (error.message.includes('type')) {
      if (error.field === 'version') {
        fixed.version = String(fixed.version);
        hasChanges = true;
      }
    }

    // Fix common naming issues
    if (error.message.includes('must be lowercase')) {
      const value = String(fixed[error.field] || '');
      fixed[error.field] = value.toLowerCase();
      hasChanges = true;
    }
  }

  return hasChanges ? fixed : null;
}
