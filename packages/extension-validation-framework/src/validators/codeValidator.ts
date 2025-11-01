/**
 * Code Validator
 *
 * Validates extension code for quality, security, and best practices.
 *
 * @module extension-validation-framework/validators/codeValidator
 */

import * as fs from 'fs';
import * as path from 'path';
import { ValidationContext, ValidationIssue } from '../types';

/**
 * Check for TypeScript strict mode
 */
export async function validateTypeScriptConfig(
  context: ValidationContext
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  if (!context.tsConfig) {
    issues.push({
      code: 'NO_TSCONFIG',
      message: 'tsconfig.json not found',
      severity: 'error',
      file: 'tsconfig.json',
      ruleId: 'code-typescript',
      fix: `Create a tsconfig.json file with strict mode enabled`,
    });
    return issues;
  }

  const compilerOptions = context.tsConfig.compilerOptions || {};

  // Check strict mode
  if (!compilerOptions.strict) {
    issues.push({
      code: 'TYPESCRIPT_NOT_STRICT',
      message: 'TypeScript strict mode is not enabled',
      severity: 'error',
      file: 'tsconfig.json',
      ruleId: 'code-typescript',
      fix: `Set "strict": true in compilerOptions`,
    });
  }

  // Check other important flags
  const requiredFlags = {
    noImplicitAny: true,
    noImplicitThis: true,
    strictNullChecks: true,
    strictFunctionTypes: true,
  };

  Object.entries(requiredFlags).forEach(([flag, required]) => {
    if (required && !compilerOptions[flag]) {
      issues.push({
        code: 'TYPESCRIPT_FLAG_MISSING',
        message: `TypeScript flag "${flag}" is not enabled`,
        severity: 'warning',
        file: 'tsconfig.json',
        ruleId: 'code-typescript',
      });
    }
  });

  return issues;
}

/**
 * Check for common code issues
 */
export async function validateCodeQuality(
  context: ValidationContext
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  for (const file of context.files) {
    if (!file.endsWith('.ts') && !file.endsWith('.tsx')) {
      continue;
    }

    const filePath = path.join(context.sourceDir, file);
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Check for console logs in production code
      if (/console\.(log|warn|error)/.test(line) && !line.includes('if (process.env.NODE_ENV')) {
        issues.push({
          code: 'CONSOLE_LOG_FOUND',
          message: 'Console log found in production code',
          severity: 'warning',
          file: path.relative(context.sourceDir, filePath),
          line: lineNum,
          ruleId: 'code-quality',
          fix: `Remove console log or wrap in development check`,
        });
      }

      // Check for any type
      if (/:\s*any\b/.test(line) && !line.includes('// @ts-ignore')) {
        issues.push({
          code: 'ANY_TYPE_USED',
          message: 'Use of "any" type found',
          severity: 'warning',
          file: path.relative(context.sourceDir, filePath),
          line: lineNum,
          ruleId: 'code-quality',
          fix: `Replace "any" with specific type`,
        });
      }

      // Check for TODO/FIXME comments
      if (/TODO|FIXME/.test(line)) {
        issues.push({
          code: 'UNRESOLVED_TODO',
          message: `Unresolved ${line.includes('FIXME') ? 'FIXME' : 'TODO'} comment`,
          severity: 'info',
          file: path.relative(context.sourceDir, filePath),
          line: lineNum,
          ruleId: 'code-quality',
        });
      }

      // Check for hard-coded colors
      if (/#[0-9a-f]{6}|#[0-9a-f]{3}\b/i.test(line) && !line.includes('tokens.color')) {
        issues.push({
          code: 'HARDCODED_COLOR',
          message: 'Hard-coded color value found',
          severity: 'error',
          file: path.relative(context.sourceDir, filePath),
          line: lineNum,
          ruleId: 'code-quality',
          fix: `Use design tokens from useTheme() hook`,
        });
      }

      // Check for hard-coded spacing
      if (/padding|margin|gap|width|height/.test(line)) {
        if (/:\s*(4|8|16|24|32|48|64)px/.test(line) && !line.includes('tokens.spacing')) {
          issues.push({
            code: 'HARDCODED_SPACING',
            message: 'Hard-coded spacing value found',
            severity: 'error',
            file: path.relative(context.sourceDir, filePath),
            line: lineNum,
            ruleId: 'code-quality',
            fix: `Use design tokens from useTheme() hook`,
          });
        }
      }
    });
  }

  return issues;
}

/**
 * Validate security practices
 */
export async function validateSecurity(
  context: ValidationContext
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  for (const file of context.files) {
    if (!file.endsWith('.ts') && !file.endsWith('.tsx')) {
      continue;
    }

    const filePath = path.join(context.sourceDir, file);
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Check for dangerouslySetInnerHTML
      if (/dangerouslySetInnerHTML/.test(line)) {
        issues.push({
          code: 'DANGEROUS_HTML',
          message: 'dangerouslySetInnerHTML found - potential XSS vulnerability',
          severity: 'error',
          file: path.relative(context.sourceDir, filePath),
          line: lineNum,
          ruleId: 'security',
          fix: `Use React text content instead or sanitize HTML with DOMPurify`,
        });
      }

      // Check for eval usage
      if (/\beval\s*\(/.test(line)) {
        issues.push({
          code: 'EVAL_USED',
          message: 'eval() found - security risk',
          severity: 'error',
          file: path.relative(context.sourceDir, filePath),
          line: lineNum,
          ruleId: 'security',
          fix: `Remove eval() usage`,
        });
      }

      // Check for potential secret exposure
      if (/SECRET|PASSWORD|API_KEY|TOKEN/.test(line) && /=|:/.test(line)) {
        if (!/process\.env|import|from|const/.test(line)) {
          issues.push({
            code: 'POTENTIAL_SECRET_EXPOSED',
            message: 'Potential secret or credential found in code',
            severity: 'error',
            file: path.relative(context.sourceDir, filePath),
            line: lineNum,
            ruleId: 'security',
            fix: `Move secrets to environment variables`,
          });
        }
      }

      // Check for hardcoded URLs
      if (/https?:\/\/localhost|127\.0\.0\.1|192\.168|10\.0\.0/.test(line)) {
        issues.push({
          code: 'HARDCODED_URL',
          message: 'Hard-coded development URL found',
          severity: 'error',
          file: path.relative(context.sourceDir, filePath),
          line: lineNum,
          ruleId: 'security',
          fix: `Use environment variables for API URLs`,
        });
      }
    });
  }

  return issues;
}

/**
 * Check for missing error handling
 */
export async function validateErrorHandling(
  context: ValidationContext
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  for (const file of context.files) {
    if (!file.endsWith('.ts') && !file.endsWith('.tsx')) {
      continue;
    }

    const filePath = path.join(context.sourceDir, file);
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    // Check for async functions without try-catch or error handling
    const asyncFuncMatches = content.matchAll(/async\s+function|\basync\s*\(/g);
    let lastWasTryCatch = false;

    for (const match of asyncFuncMatches) {
      const beforeMatch = content.substring(Math.max(0, match.index! - 100), match.index);
      if (!beforeMatch.includes('try {')) {
        const lines = content.substring(0, match.index).split('\n');
        issues.push({
          code: 'ASYNC_WITHOUT_ERROR_HANDLING',
          message: 'Async function without visible error handling',
          severity: 'warning',
          file: path.relative(context.sourceDir, filePath),
          line: lines.length,
          ruleId: 'error-handling',
          fix: `Wrap async operations in try-catch or .catch()`,
        });
      }
    }

    // Check for unhandled promise rejections
    if (/\.then\(/.test(content) && !/\.catch\(|\.finally\(/.test(content)) {
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (/.then\(/.test(line) && !/.catch\(/.test(line)) {
          issues.push({
            code: 'UNHANDLED_PROMISE',
            message: 'Promise .then() without .catch()',
            severity: 'warning',
            file: path.relative(context.sourceDir, filePath),
            line: index + 1,
            ruleId: 'error-handling',
            fix: `Add .catch() to handle promise rejection`,
          });
        }
      });
    }
  }

  return issues;
}
