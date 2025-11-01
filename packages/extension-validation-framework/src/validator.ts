/**
 * Extension Validator
 *
 * Main validator that runs all validation rules.
 *
 * @module extension-validation-framework/validator
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  validateManifestSchema,
  validateManifestSemantics,
  validateCapabilities,
  validateUIComponents,
  validateNavigation,
} from './validators/manifestValidator';
import {
  validateTypeScriptConfig,
  validateCodeQuality,
  validateSecurity,
  validateErrorHandling,
} from './validators/codeValidator';
import {
  validateAccessibility,
  validateColorContrast,
} from './validators/accessibilityValidator';
import {
  ValidationContext,
  ValidationReport,
  ValidationIssue,
  ValidationRule,
} from './types';

/**
 * Run all validation rules on an extension
 */
export async function validateExtension(
  extensionPath: string,
  options?: Record<string, any>
): Promise<ValidationReport> {
  const startTime = Date.now();
  const issues: ValidationIssue[] = [];
  const rulesRun: string[] = [];

  // Load manifest
  const manifestPath = path.join(extensionPath, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return {
      valid: false,
      issues: [
        {
          code: 'NO_MANIFEST',
          message: 'manifest.json not found',
          severity: 'error',
          file: 'manifest.json',
          ruleId: 'manifest',
        },
      ],
      errorCount: 1,
      warningCount: 0,
      infoCount: 0,
      duration: Date.now() - startTime,
      rulesRun: ['manifest-exists'],
      timestamp: new Date(),
    };
  }

  const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
  let manifest: any;
  try {
    manifest = JSON.parse(manifestContent);
  } catch (error) {
    return {
      valid: false,
      issues: [
        {
          code: 'INVALID_JSON',
          message: `Invalid JSON in manifest.json: ${error instanceof Error ? error.message : String(error)}`,
          severity: 'error',
          file: 'manifest.json',
          ruleId: 'manifest-json',
        },
      ],
      errorCount: 1,
      warningCount: 0,
      infoCount: 0,
      duration: Date.now() - startTime,
      rulesRun: ['manifest-json'],
      timestamp: new Date(),
    };
  }

  // Load package.json if exists
  const packageJsonPath = path.join(extensionPath, 'package.json');
  let packageJson: any;
  if (fs.existsSync(packageJsonPath)) {
    try {
      packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    } catch (error) {
      // Ignore package.json errors
    }
  }

  // Load tsconfig.json if exists
  const tsconfigPath = path.join(extensionPath, 'tsconfig.json');
  let tsConfig: any;
  if (fs.existsSync(tsconfigPath)) {
    try {
      tsConfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
    } catch (error) {
      // Ignore tsconfig errors
    }
  }

  // Get list of files
  const files = getAllFiles(extensionPath);

  const context: ValidationContext = {
    manifestPath,
    manifest,
    sourceDir: path.join(extensionPath, 'src'),
    files,
    packageJson,
    tsConfig,
    options,
  };

  // Run manifest validators
  const manifestValidators = [
    { id: 'manifest-schema', fn: validateManifestSchema },
    { id: 'manifest-semantics', fn: validateManifestSemantics },
    { id: 'manifest-capabilities', fn: validateCapabilities },
    { id: 'manifest-ui-components', fn: validateUIComponents },
    { id: 'manifest-navigation', fn: validateNavigation },
  ];

  for (const validator of manifestValidators) {
    try {
      const validationIssues = await validator.fn(context);
      issues.push(...validationIssues);
      rulesRun.push(validator.id);
    } catch (error) {
      console.error(`Error in validator ${validator.id}:`, error);
    }
  }

  // Run code validators
  if (fs.existsSync(context.sourceDir)) {
    const codeValidators = [
      { id: 'code-typescript', fn: validateTypeScriptConfig },
      { id: 'code-quality', fn: validateCodeQuality },
      { id: 'security', fn: validateSecurity },
      { id: 'error-handling', fn: validateErrorHandling },
    ];

    for (const validator of codeValidators) {
      try {
        const validationIssues = await validator.fn(context);
        issues.push(...validationIssues);
        rulesRun.push(validator.id);
      } catch (error) {
        console.error(`Error in validator ${validator.id}:`, error);
      }
    }

    // Run accessibility validators
    const a11yValidators = [
      { id: 'accessibility', fn: validateAccessibility },
      { id: 'a11y-contrast', fn: validateColorContrast },
    ];

    for (const validator of a11yValidators) {
      try {
        const validationIssues = await validator.fn(context);
        issues.push(...validationIssues);
        rulesRun.push(validator.id);
      } catch (error) {
        console.error(`Error in validator ${validator.id}:`, error);
      }
    }
  }

  // Count issues by severity
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const infoCount = issues.filter((i) => i.severity === 'info').length;

  return {
    valid: errorCount === 0,
    issues,
    errorCount,
    warningCount,
    infoCount,
    duration: Date.now() - startTime,
    rulesRun,
    timestamp: new Date(),
  };
}

/**
 * Get all files in directory
 */
function getAllFiles(dir: string, baseDir: string = dir): string[] {
  const files: string[] = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      // Skip node_modules and hidden directories
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
        continue;
      }

      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(baseDir, fullPath);

      if (entry.isDirectory()) {
        files.push(...getAllFiles(fullPath, baseDir));
      } else {
        files.push(relPath);
      }
    }
  } catch (error) {
    // Directory doesn't exist or can't be read
  }

  return files;
}

/**
 * Format validation report for display
 */
export function formatValidationReport(report: ValidationReport): string {
  const lines: string[] = [];

  lines.push('\n=== Extension Validation Report ===\n');
  lines.push(`Status: ${report.valid ? '✅ PASS' : '❌ FAIL'}`);
  lines.push(`Duration: ${report.duration}ms\n`);

  lines.push(`Errors: ${report.errorCount}`);
  lines.push(`Warnings: ${report.warningCount}`);
  lines.push(`Info: ${report.infoCount}\n`);

  if (report.issues.length === 0) {
    lines.push('No issues found! 🎉\n');
  } else {
    lines.push('Issues:\n');

    const byFile = new Map<string, ValidationIssue[]>();
    for (const issue of report.issues) {
      const file = issue.file || 'global';
      if (!byFile.has(file)) {
        byFile.set(file, []);
      }
      byFile.get(file)!.push(issue);
    }

    for (const [file, fileIssues] of byFile) {
      lines.push(`  ${file}:`);
      for (const issue of fileIssues) {
        const location = issue.line ? `:${issue.line}` : '';
        const severity = issue.severity.toUpperCase();
        lines.push(`    [${severity}] ${issue.message} (${issue.code})`);
        if (issue.fix) {
          lines.push(`    → ${issue.fix}`);
        }
      }
      lines.push('');
    }
  }

  lines.push(`Rules run: ${report.rulesRun.length}`);

  return lines.join('\n');
}
