/**
 * Typography Utilities
 * Helper functions for consistent typography usage throughout the application
 */

import { typography, headingHierarchy, contentTypography, manufacturingTypography } from '../tokens/typography';
import type { TypographyVariant, HeadingLevel, TypographyStyle } from '../tokens/typography';

/**
 * Get typography styles for a specific variant
 */
export const getTypographyStyle = (variant: TypographyVariant): TypographyStyle => {
  return typography.getStyle(variant);
};

/**
 * Get heading styles by level
 */
export const getHeadingStyle = (level: HeadingLevel): TypographyStyle => {
  return headingHierarchy[level];
};

/**
 * Validate heading hierarchy in a component tree
 */
export interface HeadingValidationResult {
  isValid: boolean;
  violations: Array<{
    level: string;
    issue: string;
    suggestion: string;
  }>;
  maxLevel: number;
  hasH1: boolean;
}

export const validateHeadingHierarchy = (headings: Array<{ level: number; text: string }>): HeadingValidationResult => {
  const violations: HeadingValidationResult['violations'] = [];
  let hasH1 = false;
  let maxLevel = 0;
  let prevLevel = 0;

  headings.forEach((heading, index) => {
    const { level, text } = heading;

    // Track statistics
    if (level === 1) hasH1 = true;
    if (level > maxLevel) maxLevel = level;

    // Check for multiple H1s
    if (level === 1 && hasH1 && index > 0) {
      violations.push({
        level: `h${level}`,
        issue: `Multiple h1 elements found: "${text}"`,
        suggestion: 'Use only one h1 per page for the main title'
      });
    }

    // Check for skipped levels
    if (prevLevel > 0 && level > prevLevel + 1) {
      violations.push({
        level: `h${level}`,
        issue: `Heading level skips from h${prevLevel} to h${level}: "${text}"`,
        suggestion: `Use h${prevLevel + 1} instead of h${level} to maintain sequential hierarchy`
      });
    }

    // Check if page starts with non-h1
    if (index === 0 && level !== 1) {
      violations.push({
        level: `h${level}`,
        issue: `Page starts with h${level} instead of h1: "${text}"`,
        suggestion: 'Use h1 for the main page title'
      });
    }

    prevLevel = level;
  });

  // Check if no h1 exists
  if (!hasH1 && headings.length > 0) {
    violations.push({
      level: 'h1',
      issue: 'No h1 element found on page',
      suggestion: 'Add an h1 element for the main page title'
    });
  }

  return {
    isValid: violations.length === 0,
    violations,
    maxLevel,
    hasH1
  };
};

/**
 * Generate CSS-in-JS styles for typography
 */
export const generateTypographyCSS = () => {
  return typography.generateStyles();
};

/**
 * Get accessible font size (ensures minimum WCAG compliance)
 */
export const getAccessibleFontSize = (size: string, context: 'body' | 'button' | 'input' | 'caption' = 'body'): string => {
  const minSizes = typography.validation.minimumSizes;
  const currentSizePx = parseFloat(size) * (size.includes('rem') ? 16 : 1);

  let minSize: number;
  switch (context) {
    case 'button':
      minSize = parseFloat(minSizes.button);
      break;
    case 'input':
      minSize = parseFloat(minSizes.input);
      break;
    case 'caption':
      minSize = parseFloat(minSizes.caption);
      break;
    default:
      minSize = parseFloat(minSizes.body);
  }

  return currentSizePx >= minSize ? size : `${minSize}px`;
};

/**
 * Manufacturing-specific typography helpers
 */
export const manufacturingTypographyHelpers = {
  /**
   * Format equipment codes with proper typography
   */
  formatEquipmentCode: (code: string): TypographyStyle & { value: string } => ({
    ...manufacturingTypography.equipmentCode,
    value: code.toUpperCase()
  }),

  /**
   * Format serial numbers with proper typography
   */
  formatSerialNumber: (serial: string): TypographyStyle & { value: string } => ({
    ...manufacturingTypography.serialNumber,
    value: serial
  }),

  /**
   * Format status labels with proper typography
   */
  formatStatusLabel: (status: string): TypographyStyle & { value: string } => ({
    ...manufacturingTypography.statusLabel,
    value: status.toUpperCase()
  }),

  /**
   * Format data values with proper typography
   */
  formatDataValue: (value: string | number): TypographyStyle & { value: string } => ({
    ...manufacturingTypography.dataValue,
    value: value.toString()
  })
};

/**
 * Responsive typography helpers
 */
export const responsiveTypography = {
  /**
   * Get responsive font sizes based on breakpoints
   */
  getResponsiveFontSize: (baseSize: string, scale: 'mobile' | 'tablet' | 'desktop' = 'desktop') => {
    const basePx = parseFloat(baseSize) * (baseSize.includes('rem') ? 16 : 1);

    switch (scale) {
      case 'mobile':
        return `${Math.max(basePx * 0.875, 14)}px`; // 87.5% of base, minimum 14px
      case 'tablet':
        return `${Math.max(basePx * 0.9375, 14)}px`; // 93.75% of base, minimum 14px
      default:
        return baseSize;
    }
  },

  /**
   * Generate responsive heading styles
   */
  getResponsiveHeadingStyles: (level: HeadingLevel) => {
    const baseStyle = headingHierarchy[level];

    return {
      fontSize: baseStyle.fontSize,
      '@media (max-width: 768px)': {
        fontSize: responsiveTypography.getResponsiveFontSize(baseStyle.fontSize, 'tablet')
      },
      '@media (max-width: 480px)': {
        fontSize: responsiveTypography.getResponsiveFontSize(baseStyle.fontSize, 'mobile')
      }
    };
  }
};

/**
 * Accessibility typography helpers
 */
export const accessibilityHelpers = {
  /**
   * Apply focus-visible styles for keyboard navigation
   */
  getFocusStyles: (baseStyles: TypographyStyle): TypographyStyle & { '&:focus-visible': any } => ({
    ...baseStyles,
    '&:focus-visible': {
      ...typography.accessibility.focusIndicator,
      outlineColor: 'currentColor'
    }
  }),

  /**
   * Apply high contrast mode adaptations
   */
  getHighContrastStyles: (baseStyles: TypographyStyle): TypographyStyle & { '@media (prefers-contrast: high)': any } => ({
    ...baseStyles,
    '@media (prefers-contrast: high)': typography.accessibility.highContrast['@media (prefers-contrast: high)']
  }),

  /**
   * Apply reduced motion preferences
   */
  getReducedMotionStyles: (baseStyles: TypographyStyle): TypographyStyle & { '@media (prefers-reduced-motion: reduce)': any } => ({
    ...baseStyles,
    '@media (prefers-reduced-motion: reduce)': typography.accessibility.reducedMotion['@media (prefers-reduced-motion: reduce)']
  }),

  /**
   * Create screen reader only text
   */
  getScreenReaderOnlyStyles: (): any => typography.accessibility.screenReaderOnly
};

/**
 * Typography debugging helpers
 */
export const debugTypography = {
  /**
   * Analyze typography usage in a component
   */
  analyzeComponent: (component: string): Array<{ element: string; level?: number; issues: string[] }> => {
    // This would be used with a linting tool or dev-time analysis
    // For now, return an empty array as placeholder
    return [];
  },

  /**
   * Generate typography usage report
   */
  generateReport: () => {
    return {
      totalHeadingLevels: Object.keys(headingHierarchy).length,
      contentVariants: Object.keys(contentTypography).length,
      manufacturingVariants: Object.keys(manufacturingTypography).length,
      accessibilityFeatures: Object.keys(typography.accessibility).length
    };
  }
};

// Export all utilities
export {
  typography,
  headingHierarchy,
  contentTypography,
  manufacturingTypography
};

// Export types
export type {
  TypographyVariant,
  HeadingLevel,
  TypographyStyle
};