/**
 * Typography Token System
 * Comprehensive typography scale and semantic heading hierarchy for MachShop
 *
 * This system provides:
 * - WCAG 2.1 AA compliant font sizes and line heights
 * - Semantic heading hierarchy enforcement
 * - Consistent typography scales across the application
 * - Manufacturing domain-specific typography patterns
 */

// Base typography scale following design system best practices
export const typographyScale = {
  // Font sizes (rem-based for accessibility)
  fontSize: {
    xs: '0.75rem',   // 12px
    sm: '0.875rem',  // 14px
    base: '1rem',    // 16px (base)
    lg: '1.125rem',  // 18px
    xl: '1.25rem',   // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem',     // 48px
    '6xl': '3.75rem',  // 60px
  },

  // Line heights for optimal readability
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },

  // Letter spacing for different contexts
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },

  // Font weights
  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
} as const;

// Semantic heading hierarchy definitions
export const headingHierarchy = {
  h1: {
    fontSize: typographyScale.fontSize['4xl'], // 36px
    lineHeight: typographyScale.lineHeight.tight,
    fontWeight: typographyScale.fontWeight.bold,
    letterSpacing: typographyScale.letterSpacing.tight,
    marginBottom: '1.5rem',
    marginTop: '0',
    semanticRole: 'primary-page-title',
    description: 'Main page title - one per page',
  },
  h2: {
    fontSize: typographyScale.fontSize['3xl'], // 30px
    lineHeight: typographyScale.lineHeight.tight,
    fontWeight: typographyScale.fontWeight.semibold,
    letterSpacing: typographyScale.letterSpacing.tight,
    marginBottom: '1rem',
    marginTop: '2rem',
    semanticRole: 'section-title',
    description: 'Major section headings',
  },
  h3: {
    fontSize: typographyScale.fontSize['2xl'], // 24px
    lineHeight: typographyScale.lineHeight.snug,
    fontWeight: typographyScale.fontWeight.semibold,
    letterSpacing: typographyScale.letterSpacing.normal,
    marginBottom: '0.75rem',
    marginTop: '1.5rem',
    semanticRole: 'subsection-title',
    description: 'Subsection headings within h2 sections',
  },
  h4: {
    fontSize: typographyScale.fontSize.xl, // 20px
    lineHeight: typographyScale.lineHeight.snug,
    fontWeight: typographyScale.fontWeight.medium,
    letterSpacing: typographyScale.letterSpacing.normal,
    marginBottom: '0.5rem',
    marginTop: '1rem',
    semanticRole: 'detail-title',
    description: 'Detail headings within h3 subsections',
  },
  h5: {
    fontSize: typographyScale.fontSize.lg, // 18px
    lineHeight: typographyScale.lineHeight.normal,
    fontWeight: typographyScale.fontWeight.medium,
    letterSpacing: typographyScale.letterSpacing.normal,
    marginBottom: '0.5rem',
    marginTop: '1rem',
    semanticRole: 'minor-title',
    description: 'Minor headings for detailed content',
  },
  h6: {
    fontSize: typographyScale.fontSize.base, // 16px
    lineHeight: typographyScale.lineHeight.normal,
    fontWeight: typographyScale.fontWeight.semibold,
    letterSpacing: typographyScale.letterSpacing.wide,
    marginBottom: '0.25rem',
    marginTop: '0.75rem',
    semanticRole: 'label-title',
    description: 'Label-style headings for forms and details',
  },
} as const;

// Body text and content typography
export const contentTypography = {
  body: {
    fontSize: typographyScale.fontSize.base,
    lineHeight: typographyScale.lineHeight.normal,
    fontWeight: typographyScale.fontWeight.normal,
    letterSpacing: typographyScale.letterSpacing.normal,
  },
  bodyLarge: {
    fontSize: typographyScale.fontSize.lg,
    lineHeight: typographyScale.lineHeight.relaxed,
    fontWeight: typographyScale.fontWeight.normal,
    letterSpacing: typographyScale.letterSpacing.normal,
  },
  bodySmall: {
    fontSize: typographyScale.fontSize.sm,
    lineHeight: typographyScale.lineHeight.normal,
    fontWeight: typographyScale.fontWeight.normal,
    letterSpacing: typographyScale.letterSpacing.normal,
  },
  caption: {
    fontSize: typographyScale.fontSize.xs,
    lineHeight: typographyScale.lineHeight.snug,
    fontWeight: typographyScale.fontWeight.normal,
    letterSpacing: typographyScale.letterSpacing.wide,
  },
  lead: {
    fontSize: typographyScale.fontSize.xl,
    lineHeight: typographyScale.lineHeight.relaxed,
    fontWeight: typographyScale.fontWeight.normal,
    letterSpacing: typographyScale.letterSpacing.normal,
  },
} as const;

// Manufacturing domain-specific typography patterns
export const manufacturingTypography = {
  // Equipment identifiers and codes
  equipmentCode: {
    fontSize: typographyScale.fontSize.sm,
    lineHeight: typographyScale.lineHeight.none,
    fontWeight: typographyScale.fontWeight.medium,
    letterSpacing: typographyScale.letterSpacing.wider,
    fontFamily: 'monospace',
    textTransform: 'uppercase' as const,
  },

  // Serial numbers and part numbers
  serialNumber: {
    fontSize: typographyScale.fontSize.base,
    lineHeight: typographyScale.lineHeight.tight,
    fontWeight: typographyScale.fontWeight.semibold,
    letterSpacing: typographyScale.letterSpacing.wide,
    fontFamily: 'monospace',
  },

  // Status indicators
  statusLabel: {
    fontSize: typographyScale.fontSize.xs,
    lineHeight: typographyScale.lineHeight.none,
    fontWeight: typographyScale.fontWeight.bold,
    letterSpacing: typographyScale.letterSpacing.widest,
    textTransform: 'uppercase' as const,
  },

  // Data values and measurements
  dataValue: {
    fontSize: typographyScale.fontSize.lg,
    lineHeight: typographyScale.lineHeight.none,
    fontWeight: typographyScale.fontWeight.bold,
    letterSpacing: typographyScale.letterSpacing.tight,
    fontFamily: 'monospace',
  },

  // Work order and batch identifiers
  workOrderId: {
    fontSize: typographyScale.fontSize.base,
    lineHeight: typographyScale.lineHeight.tight,
    fontWeight: typographyScale.fontWeight.medium,
    letterSpacing: typographyScale.letterSpacing.normal,
    fontFamily: 'monospace',
  },
} as const;

// Accessibility-compliant typography utilities
export const accessibilityTypography = {
  // Screen reader optimized
  screenReaderOnly: {
    position: 'absolute' as const,
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden' as const,
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap' as const,
    border: '0',
  },

  // High contrast mode support
  highContrast: {
    '@media (prefers-contrast: high)': {
      fontWeight: typographyScale.fontWeight.bold,
      letterSpacing: typographyScale.letterSpacing.wide,
    },
  },

  // Reduced motion support
  reducedMotion: {
    '@media (prefers-reduced-motion: reduce)': {
      transition: 'none',
      animation: 'none',
    },
  },

  // Focus indicators for keyboard navigation
  focusIndicator: {
    outline: '2px solid',
    outlineOffset: '2px',
    borderRadius: '2px',
  },
} as const;

// Typography validation rules for accessibility compliance
export const typographyValidation = {
  // WCAG 2.1 AA minimum contrast ratios
  contrastRatios: {
    normalText: 4.5,
    largeText: 3.0, // 18pt+ or 14pt+ bold
    uiComponents: 3.0,
  },

  // Minimum font sizes for readability
  minimumSizes: {
    body: '14px',
    caption: '12px',
    button: '14px',
    input: '16px', // Prevents zoom on iOS
  },

  // Maximum line lengths for readability
  maxLineLength: {
    characters: 80,
    rem: '45rem',
  },

  // Heading hierarchy rules
  hierarchyRules: {
    maxH1PerPage: 1,
    mustBeSequential: true,
    allowedSkips: [], // No skipping allowed (h1->h3, etc.)
  },
} as const;

// Export utility functions for typography
export const getTypographyStyle = (variant: keyof typeof headingHierarchy | keyof typeof contentTypography | keyof typeof manufacturingTypography) => {
  if (variant in headingHierarchy) {
    return headingHierarchy[variant as keyof typeof headingHierarchy];
  }
  if (variant in contentTypography) {
    return contentTypography[variant as keyof typeof contentTypography];
  }
  if (variant in manufacturingTypography) {
    return manufacturingTypography[variant as keyof typeof manufacturingTypography];
  }
  return contentTypography.body;
};

// CSS-in-JS styles for easy integration
export const generateTypographyStyles = () => {
  const styles: Record<string, any> = {};

  // Generate heading styles
  Object.entries(headingHierarchy).forEach(([tag, style]) => {
    styles[tag] = {
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
      fontWeight: style.fontWeight,
      letterSpacing: style.letterSpacing,
      marginBottom: style.marginBottom,
      marginTop: style.marginTop,
    };
  });

  // Generate content styles
  Object.entries(contentTypography).forEach(([name, style]) => {
    styles[name] = style;
  });

  // Generate manufacturing styles
  Object.entries(manufacturingTypography).forEach(([name, style]) => {
    styles[name] = style;
  });

  return styles;
};

// Export all typography tokens
export const typography = {
  scale: typographyScale,
  headings: headingHierarchy,
  content: contentTypography,
  manufacturing: manufacturingTypography,
  accessibility: accessibilityTypography,
  validation: typographyValidation,
  getStyle: getTypographyStyle,
  generateStyles: generateTypographyStyles,
} as const;

// Type definitions for TypeScript integration
export type TypographyVariant =
  | keyof typeof headingHierarchy
  | keyof typeof contentTypography
  | keyof typeof manufacturingTypography;

export type HeadingLevel = keyof typeof headingHierarchy;

export type TypographyStyle = {
  fontSize: string;
  lineHeight: string;
  fontWeight: string;
  letterSpacing: string;
  marginBottom?: string;
  marginTop?: string;
  fontFamily?: string;
  textTransform?: 'uppercase' | 'lowercase' | 'capitalize' | 'none';
};