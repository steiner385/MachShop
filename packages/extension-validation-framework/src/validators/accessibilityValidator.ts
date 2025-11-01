/**
 * Accessibility Validator
 *
 * Validates extension accessibility compliance (WCAG 2.1 AA).
 *
 * @module extension-validation-framework/validators/accessibilityValidator
 */

import * as fs from 'fs';
import * as path from 'path';
import { ValidationContext, ValidationIssue, AccessibilityResult, AccessibilityIssue } from '../types';

/**
 * Validate accessibility in code
 */
export async function validateAccessibility(
  context: ValidationContext
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  for (const file of context.files) {
    if (!file.endsWith('.tsx')) {
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

      // Check for missing alt text on images
      if (/<img\s/.test(line) && !/alt=/.test(line)) {
        issues.push({
          code: 'IMG_MISSING_ALT',
          message: '<img> tag missing alt text',
          severity: 'error',
          file: path.relative(context.sourceDir, filePath),
          line: lineNum,
          ruleId: 'accessibility',
          fix: `Add alt attribute with descriptive text to <img>`,
        });
      }

      // Check for missing labels on form inputs
      if (/<input\s/.test(line) && !/aria-label|<label/.test(line)) {
        if (!line.includes('type="hidden"')) {
          issues.push({
            code: 'INPUT_MISSING_LABEL',
            message: '<input> tag missing associated label',
            severity: 'error',
            file: path.relative(context.sourceDir, filePath),
            line: lineNum,
            ruleId: 'accessibility',
            fix: `Add <label> tag or aria-label attribute`,
          });
        }
      }

      // Check for missing form labels
      if (/<textarea\s/.test(line) && !/aria-label|<label/.test(line)) {
        issues.push({
          code: 'TEXTAREA_MISSING_LABEL',
          message: '<textarea> tag missing associated label',
          severity: 'error',
          file: path.relative(context.sourceDir, filePath),
          line: lineNum,
          ruleId: 'accessibility',
          fix: `Add <label> tag or aria-label attribute`,
        });
      }

      // Check for missing button accessibility
      if (/<button\s/.test(line) && !/aria-label|type=|>.*<\/button>/.test(line)) {
        // Button without label - warn
        if (!line.includes('</button>') && !line.includes('>')) {
          issues.push({
            code: 'BUTTON_NO_ACCESSIBLE_NAME',
            message: '<button> tag may not have accessible name',
            severity: 'warning',
            file: path.relative(context.sourceDir, filePath),
            line: lineNum,
            ruleId: 'accessibility',
            fix: `Ensure button has text content or aria-label`,
          });
        }
      }

      // Check for divs used as buttons
      if (/<div\s+.*onClick/.test(line) && !/role=["']button["']/.test(line)) {
        issues.push({
          code: 'DIV_BUTTON_NO_ROLE',
          message: '<div> used as button without role="button"',
          severity: 'error',
          file: path.relative(context.sourceDir, filePath),
          line: lineNum,
          ruleId: 'accessibility',
          fix: `Use <button> tag or add role="button" with ARIA attributes`,
        });
      }

      // Check for divs used as lists
      if (/<div.*>\s*<div/.test(line)) {
        if (!/role=["']list/.test(line) && !/role=["']listitem/.test(line)) {
          // Might be a list - info level
          issues.push({
            code: 'DIV_USED_FOR_LIST',
            message: 'Using <div> instead of semantic <ul> or <ol>',
            severity: 'info',
            file: path.relative(context.sourceDir, filePath),
            line: lineNum,
            ruleId: 'accessibility',
            fix: `Use semantic <ul>, <ol>, <li> tags or add proper ARIA roles`,
          });
        }
      }

      // Check for missing heading hierarchy
      if (/<h[2-6]\s/.test(line)) {
        // Check if previous headings are in order
        const previousHeadings = content.substring(0, content.indexOf(line)).match(/<h[1-6]/g);
        if (previousHeadings && previousHeadings.length > 0) {
          const lastHeading = previousHeadings[previousHeadings.length - 1];
          const currentLevel = parseInt(line.match(/<h([1-6])/)?.[1] || '1');
          const lastLevel = parseInt(lastHeading.match(/h([1-6])/)?.[1] || '1');

          if (currentLevel > lastLevel + 1) {
            issues.push({
              code: 'HEADING_HIERARCHY_BROKEN',
              message: `Heading hierarchy broken: jumping from h${lastLevel} to h${currentLevel}`,
              severity: 'warning',
              file: path.relative(context.sourceDir, filePath),
              line: lineNum,
              ruleId: 'accessibility',
              fix: `Use heading levels in order (h1, h2, h3, etc.)`,
            });
          }
        }
      }

      // Check for missing aria-label on icon buttons
      if (/<Button.*icon/.test(line) && !/aria-label|title=/.test(line)) {
        issues.push({
          code: 'ICON_BUTTON_NO_LABEL',
          message: 'Icon button missing aria-label or title',
          severity: 'error',
          file: path.relative(context.sourceDir, filePath),
          line: lineNum,
          ruleId: 'accessibility',
          fix: `Add aria-label or title attribute to describe button purpose`,
        });
      }

      // Check for skip navigation links
      if (/export function|export const/.test(line) && /App|Layout|Page/.test(line)) {
        if (!content.includes('skip-to-content') && !content.includes('skipNav')) {
          issues.push({
            code: 'NO_SKIP_NAV',
            message: 'Consider adding skip navigation link for keyboard users',
            severity: 'info',
            file: path.relative(context.sourceDir, filePath),
            line: lineNum,
            ruleId: 'accessibility',
            fix: `Add a hidden skip-to-content link at top of page`,
          });
        }
      }
    });
  }

  return issues;
}

/**
 * Check color contrast
 */
export async function validateColorContrast(
  context: ValidationContext
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  // Check if using design tokens for colors
  for (const file of context.files) {
    if (!file.endsWith('.tsx')) {
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

      // Check for hardcoded colors
      if (/#[0-9a-f]{6}|#[0-9a-f]{3}\b|rgb\s*\(|rgba\s*\(/i.test(line)) {
        if (!line.includes('tokens.color') && !line.includes('// color:')) {
          issues.push({
            code: 'HARDCODED_COLOR_CONTRAST_RISK',
            message: 'Hard-coded color may not meet contrast requirements',
            severity: 'warning',
            file: path.relative(context.sourceDir, filePath),
            line: lineNum,
            ruleId: 'accessibility',
            fix: `Use design tokens which are guaranteed to meet WCAG AA contrast`,
          });
        }
      }
    });
  }

  return issues;
}
