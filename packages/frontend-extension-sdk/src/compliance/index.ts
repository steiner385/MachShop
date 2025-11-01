/**
 * Compliance Module
 *
 * Provides component accessibility validation and theme token compliance checking.
 * Ensures extensions meet design system and accessibility requirements.
 */

import type React from 'react';

export interface AccessibilityAuditResult {
  componentName: string;
  violations: AccessibilityViolation[];
  warnings: AccessibilityWarning[];
  passed: boolean;
}

export interface AccessibilityViolation {
  rule: string;
  message: string;
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  element?: string;
}

export interface AccessibilityWarning {
  rule: string;
  message: string;
  suggestion: string;
}

export interface ThemeComplianceResult {
  compliant: boolean;
  violations: ThemeViolation[];
  hardcodedColors: string[];
}

export interface ThemeViolation {
  location: string;
  issue: string;
  suggestion: string;
}

export interface ComplianceReport {
  componentName: string;
  timestamp: Date;
  accessibility: AccessibilityAuditResult;
  theme: ThemeComplianceResult;
  overallCompliant: boolean;
}

/**
 * Check component accessibility
 */
export function validateAccessibility(component: React.ReactNode, componentName: string): AccessibilityAuditResult {
  const violations: AccessibilityViolation[] = [];
  const warnings: AccessibilityWarning[] = [];

  // Check for proper ARIA labels
  // This is a simplified check - in production, would use actual a11y-testing library
  const componentStr = JSON.stringify(component);

  // Check for missing alt text on images
  if (componentStr.includes('<img') && !componentStr.includes('alt=')) {
    violations.push({
      rule: 'img-alt-text',
      message: 'Image elements must have alt text',
      severity: 'serious',
      element: 'img',
    });
  }

  // Check for proper button labeling
  if (componentStr.includes('<button>') && !componentStr.match(/<button[^>]*aria-label/)) {
    violations.push({
      rule: 'button-has-label',
      message: 'Buttons must have accessible labels',
      severity: 'serious',
      element: 'button',
    });
  }

  // Check for proper heading hierarchy
  if (componentStr.includes('<h3') && !componentStr.includes('<h2')) {
    warnings.push({
      rule: 'heading-hierarchy',
      message: 'Heading hierarchy should be maintained',
      suggestion: 'Use h2 before h3 for proper document structure',
    });
  }

  // Check for keyboard navigation support
  if (componentStr.includes('onClick') && !componentStr.includes('onKeyDown')) {
    warnings.push({
      rule: 'keyboard-navigation',
      message: 'Interactive elements should support keyboard navigation',
      suggestion: 'Add onKeyDown handler to handle Enter and Space keys',
    });
  }

  return {
    componentName,
    violations,
    warnings,
    passed: violations.length === 0,
  };
}

/**
 * Check theme token compliance
 */
export function validateThemeCompliance(componentCode: string): ThemeComplianceResult {
  const violations: ThemeViolation[] = [];
  const hardcodedColors: string[] = [];

  // Check for hardcoded hex colors
  const hexColorRegex = /#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g;
  const matches = componentCode.match(hexColorRegex) || [];

  matches.forEach((color) => {
    if (!hardcodedColors.includes(color)) {
      hardcodedColors.push(color);
      violations.push({
        location: `Hardcoded color: ${color}`,
        issue: `Found hardcoded color value instead of design token`,
        suggestion: `Use design tokens from theme instead: theme.token.colorPrimary, theme.token.colorError, etc.`,
      });
    }
  });

  // Check for hardcoded pixel values
  const pixelRegex = /(\d+)px(?![a-zA-Z])/g;
  const pixelMatches = componentCode.match(pixelRegex) || [];

  pixelMatches.forEach((pixel) => {
    const value = parseInt(pixel);
    if (value > 4) {
      // Only flag non-standard spacing values
      violations.push({
        location: `Hardcoded value: ${pixel}`,
        issue: `Found hardcoded pixel value instead of design token spacing`,
        suggestion: `Use spacing tokens: theme.spacing, margin, padding helpers`,
      });
    }
  });

  return {
    compliant: violations.length === 0,
    violations: violations.slice(0, 10), // Limit to 10 violations in report
    hardcodedColors,
  };
}

/**
 * Generate comprehensive compliance report
 */
export function generateComplianceReport(
  componentName: string,
  component: React.ReactNode,
  componentCode: string
): ComplianceReport {
  const accessibility = validateAccessibility(component, componentName);
  const theme = validateThemeCompliance(componentCode);

  return {
    componentName,
    timestamp: new Date(),
    accessibility,
    theme,
    overallCompliant: accessibility.passed && theme.compliant,
  };
}

/**
 * Check if a component is compliant
 */
export function isCompliant(report: ComplianceReport): boolean {
  return report.overallCompliant;
}

/**
 * Get compliance violation summary
 */
export function getComplianceSummary(report: ComplianceReport): string {
  const accessibilityViolations = report.accessibility.violations.length;
  const themeViolations = report.theme.violations.length;
  const totalViolations = accessibilityViolations + themeViolations;

  if (totalViolations === 0) {
    return `✅ Component ${report.componentName} is fully compliant`;
  }

  return `⚠️ Component ${report.componentName} has ${totalViolations} compliance issues: ${accessibilityViolations} accessibility violations, ${themeViolations} theme violations`;
}
