/**
 * Accessibility Validation Utilities
 * WCAG 2.1 AA compliance helpers for the MachShop theme system
 */

import { baseColors } from '../tokens/colors';
import { lightTheme, darkTheme } from '../tokens/semantic';
import { typography } from '../tokens/typography';
import { validateHeadingHierarchy } from './typography';
import type { HeadingValidationResult } from './typography';

// WCAG 2.1 AA contrast ratio requirements
const WCAG_AA_NORMAL = 4.5;
const WCAG_AA_LARGE = 3.0;
const WCAG_AAA_NORMAL = 7.0;
const WCAG_AAA_LARGE = 4.5;

/**
 * Calculate relative luminance of a color
 * @param color Hex color string (e.g., "#ff0000")
 */
function getLuminance(color: string): number {
  // Remove # if present
  const hex = color.replace('#', '');

  // Parse RGB values
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;

  // Apply gamma correction
  const rLinear = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gLinear = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bLinear = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  // Calculate relative luminance
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calculate contrast ratio between two colors
 * @param color1 First color (hex)
 * @param color2 Second color (hex)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color combination meets WCAG requirements
 */
export interface AccessibilityCheck {
  ratio: number;
  wcagAA: boolean;
  wcagAAA: boolean;
  wcagAALarge: boolean;
  wcagAAALarge: boolean;
  grade: 'AAA' | 'AA' | 'Fail';
}

export function checkAccessibility(
  foreground: string,
  background: string,
  isLargeText: boolean = false
): AccessibilityCheck {
  const ratio = getContrastRatio(foreground, background);

  const wcagAANormal = ratio >= WCAG_AA_NORMAL;
  const wcagAALarge = ratio >= WCAG_AA_LARGE;
  const wcagAAA = ratio >= WCAG_AAA_NORMAL;
  const wcagAAALarge = ratio >= WCAG_AAA_LARGE;

  const wcagAA = isLargeText ? wcagAALarge : wcagAANormal;
  const wcagAAAPass = isLargeText ? wcagAAALarge : wcagAAA;

  let grade: 'AAA' | 'AA' | 'Fail' = 'Fail';
  if (wcagAAAPass) grade = 'AAA';
  else if (wcagAA) grade = 'AA';

  return {
    ratio,
    wcagAA,
    wcagAAA: wcagAAAPass,
    wcagAALarge,
    wcagAAALarge,
    grade,
  };
}

/**
 * Validate all theme color combinations
 */
export interface ThemeAccessibilityReport {
  theme: 'light' | 'dark';
  checks: Array<{
    description: string;
    foreground: string;
    background: string;
    result: AccessibilityCheck;
  }>;
  summary: {
    total: number;
    passing: number;
    failing: number;
    aaCompliant: boolean;
    aaaCompliant: boolean;
  };
}

export function validateThemeAccessibility(theme: 'light' | 'dark'): ThemeAccessibilityReport {
  const colors = theme === 'light' ? lightTheme : darkTheme;

  const checks = [
    // Primary text combinations
    {
      description: 'Primary text on primary background',
      foreground: colors.text.primary,
      background: colors.background.primary,
    },
    {
      description: 'Secondary text on primary background',
      foreground: colors.text.secondary,
      background: colors.background.primary,
    },
    {
      description: 'Primary text on secondary background',
      foreground: colors.text.primary,
      background: colors.background.secondary,
    },

    // Interactive elements
    {
      description: 'Primary button text on primary button background',
      foreground: colors.surface.primary,
      background: colors.interactive.primaryDefault,
    },
    {
      description: 'Danger button text on danger button background',
      foreground: colors.surface.primary,
      background: colors.interactive.dangerDefault,
    },

    // Status indicators
    {
      description: 'Success text on success background',
      foreground: colors.status.success,
      background: colors.status.successBackground,
    },
    {
      description: 'Warning text on warning background',
      foreground: colors.status.warning,
      background: colors.status.warningBackground,
    },
    {
      description: 'Error text on error background',
      foreground: colors.status.error,
      background: colors.status.errorBackground,
    },
    {
      description: 'Info text on info background',
      foreground: colors.status.info,
      background: colors.status.infoBackground,
    },

    // Form elements
    {
      description: 'Form input text on form input background',
      foreground: colors.form.inputText,
      background: colors.form.inputBackground,
    },
    {
      description: 'Form label text on primary background',
      foreground: colors.form.labelText,
      background: colors.background.primary,
    },
    {
      description: 'Form placeholder text on form input background',
      foreground: colors.form.inputPlaceholder,
      background: colors.form.inputBackground,
    },
  ];

  const results = checks.map(check => ({
    ...check,
    result: checkAccessibility(check.foreground, check.background),
  }));

  const passing = results.filter(r => r.result.wcagAA).length;
  const failing = results.length - passing;
  const aaCompliant = failing === 0;
  const aaaCompliant = results.every(r => r.result.wcagAAA);

  return {
    theme,
    checks: results,
    summary: {
      total: results.length,
      passing,
      failing,
      aaCompliant,
      aaaCompliant,
    },
  };
}

/**
 * Get accessible color suggestions
 */
export function suggestAccessibleColor(
  targetBackground: string,
  baseColor: string,
  targetRatio: number = WCAG_AA_NORMAL
): string[] {
  const suggestions: string[] = [];

  // Try different shades of the base color
  const baseColorKey = Object.entries(baseColors).find(([_, colorMap]) =>
    Object.values(colorMap).includes(baseColor as any)
  );

  if (baseColorKey) {
    const [colorName, colorMap] = baseColorKey;

    Object.entries(colorMap).forEach(([shade, color]) => {
      const ratio = getContrastRatio(color, targetBackground);
      if (ratio >= targetRatio) {
        suggestions.push(color);
      }
    });
  }

  return suggestions;
}

/**
 * Typography accessibility validation
 */
export interface TypographyAccessibilityReport {
  isCompliant: boolean;
  fontSizeIssues: Array<{
    element: string;
    currentSize: string;
    minimumSize: string;
    issue: string;
  }>;
  headingHierarchy: HeadingValidationResult;
  lineHeightIssues: Array<{
    element: string;
    currentLineHeight: string;
    recommendedLineHeight: string;
    issue: string;
  }>;
}

export function validateTypographyAccessibility(
  headings: Array<{ level: number; text: string; fontSize?: string; lineHeight?: string }> = []
): TypographyAccessibilityReport {
  const fontSizeIssues: TypographyAccessibilityReport['fontSizeIssues'] = [];
  const lineHeightIssues: TypographyAccessibilityReport['lineHeightIssues'] = [];

  // Validate heading hierarchy
  const headingHierarchy = validateHeadingHierarchy(headings);

  // Check font sizes against WCAG minimums
  headings.forEach((heading) => {
    if (heading.fontSize) {
      const sizePx = parseFloat(heading.fontSize) * (heading.fontSize.includes('rem') ? 16 : 1);
      const minSize = parseFloat(typography.validation.minimumSizes.body);

      if (sizePx < minSize) {
        fontSizeIssues.push({
          element: `h${heading.level}`,
          currentSize: heading.fontSize,
          minimumSize: `${minSize}px`,
          issue: `Font size ${heading.fontSize} is below WCAG minimum of ${minSize}px`
        });
      }
    }

    // Check line height for readability
    if (heading.lineHeight) {
      const lineHeight = parseFloat(heading.lineHeight);
      const recommendedMinimum = 1.25; // WCAG recommendation for headings

      if (lineHeight < recommendedMinimum) {
        lineHeightIssues.push({
          element: `h${heading.level}`,
          currentLineHeight: heading.lineHeight,
          recommendedLineHeight: recommendedMinimum.toString(),
          issue: `Line height ${heading.lineHeight} is below recommended minimum of ${recommendedMinimum}`
        });
      }
    }
  });

  return {
    isCompliant: fontSizeIssues.length === 0 && lineHeightIssues.length === 0 && headingHierarchy.isValid,
    fontSizeIssues,
    headingHierarchy,
    lineHeightIssues
  };
}

/**
 * Comprehensive accessibility validation
 */
export interface ComprehensiveAccessibilityReport {
  colors: ThemeAccessibilityReport;
  typography: TypographyAccessibilityReport;
  manufacturing: ThemeAccessibilityReport;
  summary: {
    overallCompliant: boolean;
    colorCompliant: boolean;
    typographyCompliant: boolean;
    manufacturingCompliant: boolean;
    totalIssues: number;
  };
}

export function validateCompleteAccessibility(
  theme: 'light' | 'dark' = 'light',
  headings: Array<{ level: number; text: string; fontSize?: string; lineHeight?: string }> = []
): ComprehensiveAccessibilityReport {
  const colors = validateThemeAccessibility(theme);
  const typography = validateTypographyAccessibility(headings);
  const manufacturing = validateManufacturingColors();

  const colorCompliant = colors.summary.aaCompliant;
  const typographyCompliant = typography.isCompliant;
  const manufacturingCompliant = manufacturing.summary.aaCompliant;
  const overallCompliant = colorCompliant && typographyCompliant && manufacturingCompliant;

  const totalIssues =
    colors.summary.failing +
    typography.fontSizeIssues.length +
    typography.lineHeightIssues.length +
    typography.headingHierarchy.violations.length +
    manufacturing.summary.failing;

  return {
    colors,
    typography,
    manufacturing,
    summary: {
      overallCompliant,
      colorCompliant,
      typographyCompliant,
      manufacturingCompliant,
      totalIssues
    }
  };
}

/**
 * Manufacturing domain accessibility checks
 */
export function validateManufacturingColors(): ThemeAccessibilityReport {
  const manufacturingChecks = [
    // Equipment status combinations
    {
      description: 'Equipment running status',
      foreground: baseColors.success[500],
      background: baseColors.success[50],
    },
    {
      description: 'Equipment fault status',
      foreground: baseColors.error[500],
      background: baseColors.error[50],
    },
    {
      description: 'Equipment idle status',
      foreground: baseColors.warning[500],
      background: baseColors.warning[50],
    },

    // Work order status combinations
    {
      description: 'Work order in progress',
      foreground: baseColors.primary[500],
      background: baseColors.primary[50],
    },
    {
      description: 'Work order completed',
      foreground: baseColors.success[500],
      background: baseColors.success[50],
    },
    {
      description: 'Work order on hold',
      foreground: baseColors.warning[500],
      background: baseColors.warning[50],
    },
  ];

  const results = manufacturingChecks.map(check => ({
    ...check,
    result: checkAccessibility(check.foreground, check.background),
  }));

  const passing = results.filter(r => r.result.wcagAA).length;
  const failing = results.length - passing;

  return {
    theme: 'manufacturing' as any,
    checks: results,
    summary: {
      total: results.length,
      passing,
      failing,
      aaCompliant: failing === 0,
      aaaCompliant: results.every(r => r.result.wcagAAA),
    },
  };
}

// Export validation utilities
export const accessibility = {
  checkAccessibility,
  getContrastRatio,
  validateThemeAccessibility,
  validateManufacturingColors,
  suggestAccessibleColor,
  validateTypographyAccessibility,
  validateCompleteAccessibility,
};