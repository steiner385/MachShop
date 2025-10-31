/**
 * Semantic Color Tokens
 * Context-aware color mappings for the MachShop MES application
 *
 * This file maps base color tokens to semantic meanings and use cases.
 * It provides a layer of abstraction between design tokens and implementation,
 * making it easier to maintain consistency and implement theme variations.
 */

import { baseColors, domainColors, accessibilityColors } from './colors';

// Light theme semantic colors (default)
export const lightTheme = {
  // Background colors
  background: {
    primary: baseColors.pure.white,
    secondary: baseColors.neutral[50],
    tertiary: baseColors.neutral[100],
    elevated: baseColors.pure.white,
    inverse: baseColors.neutral[900],
  },

  // Surface colors (cards, panels, modals)
  surface: {
    primary: baseColors.pure.white,
    secondary: baseColors.neutral[50],
    tertiary: baseColors.neutral[100],
    inverse: baseColors.neutral[800],
    overlay: 'rgba(0, 0, 0, 0.45)', // Modal backgrounds
  },

  // Text colors
  text: {
    primary: baseColors.neutral[900],
    secondary: baseColors.neutral[600],
    tertiary: baseColors.neutral[500],
    disabled: baseColors.neutral[400],
    inverse: baseColors.pure.white,
    link: baseColors.primary[500],
    linkHover: baseColors.primary[600],
  },

  // Border colors
  border: {
    primary: baseColors.neutral[300],
    secondary: baseColors.neutral[200],
    focus: baseColors.primary[500],
    error: baseColors.error[500],
    success: baseColors.success[500],
    warning: baseColors.warning[500],
  },

  // Interactive states
  interactive: {
    // Primary actions
    primaryDefault: baseColors.primary[500],
    primaryHover: baseColors.primary[600],
    primaryActive: baseColors.primary[700],
    primaryDisabled: baseColors.neutral[300],

    // Secondary actions
    secondaryDefault: baseColors.pure.white,
    secondaryHover: baseColors.neutral[50],
    secondaryActive: baseColors.neutral[100],
    secondaryDisabled: baseColors.neutral[200],

    // Danger/destructive actions
    dangerDefault: baseColors.error[500],
    dangerHover: baseColors.error[600],
    dangerActive: baseColors.error[700],
    dangerDisabled: baseColors.neutral[300],
  },

  // Status indicators
  status: {
    success: baseColors.success[500],
    successBackground: baseColors.success[50],
    successBorder: baseColors.success[200],

    warning: baseColors.warning[500],
    warningBackground: baseColors.warning[50],
    warningBorder: baseColors.warning[200],

    error: baseColors.error[500],
    errorBackground: baseColors.error[50],
    errorBorder: baseColors.error[200],

    info: baseColors.info[500],
    infoBackground: baseColors.info[50],
    infoBorder: baseColors.info[200],
  },

  // Form elements
  form: {
    inputBackground: baseColors.pure.white,
    inputBorder: baseColors.neutral[300],
    inputBorderHover: baseColors.primary[500],
    inputBorderFocus: baseColors.primary[500],
    inputBorderError: baseColors.error[500],
    inputText: baseColors.neutral[900],
    inputPlaceholder: baseColors.neutral[500],
    labelText: baseColors.neutral[700],
  },

  // Shadows (for consistency with color scheme)
  shadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
} as const;

// Dark theme semantic colors
export const darkTheme = {
  // Background colors
  background: {
    primary: baseColors.neutral[900],
    secondary: baseColors.neutral[800],
    tertiary: baseColors.neutral[700],
    elevated: baseColors.neutral[800],
    inverse: baseColors.pure.white,
  },

  // Surface colors
  surface: {
    primary: baseColors.neutral[800],
    secondary: baseColors.neutral[700],
    tertiary: baseColors.neutral[600],
    inverse: baseColors.neutral[100],
    overlay: 'rgba(0, 0, 0, 0.75)',
  },

  // Text colors
  text: {
    primary: baseColors.neutral[100],
    secondary: baseColors.neutral[300],
    tertiary: baseColors.neutral[400],
    disabled: baseColors.neutral[500],
    inverse: baseColors.neutral[900],
    link: baseColors.primary[400],
    linkHover: baseColors.primary[300],
  },

  // Border colors
  border: {
    primary: baseColors.neutral[600],
    secondary: baseColors.neutral[700],
    focus: baseColors.primary[400],
    error: baseColors.error[400],
    success: baseColors.success[400],
    warning: baseColors.warning[400],
  },

  // Interactive states (adjusted for dark mode)
  interactive: {
    primaryDefault: baseColors.primary[500],
    primaryHover: baseColors.primary[400],
    primaryActive: baseColors.primary[600],
    primaryDisabled: baseColors.neutral[600],

    secondaryDefault: baseColors.neutral[700],
    secondaryHover: baseColors.neutral[600],
    secondaryActive: baseColors.neutral[500],
    secondaryDisabled: baseColors.neutral[700],

    dangerDefault: baseColors.error[500],
    dangerHover: baseColors.error[400],
    dangerActive: baseColors.error[600],
    dangerDisabled: baseColors.neutral[600],
  },

  // Status indicators (adjusted for dark mode)
  status: {
    success: baseColors.success[400],
    successBackground: baseColors.success[900],
    successBorder: baseColors.success[700],

    warning: baseColors.warning[400],
    warningBackground: baseColors.warning[900],
    warningBorder: baseColors.warning[700],

    error: baseColors.error[400],
    errorBackground: baseColors.error[900],
    errorBorder: baseColors.error[700],

    info: baseColors.info[400],
    infoBackground: baseColors.info[900],
    infoBorder: baseColors.info[700],
  },

  // Form elements
  form: {
    inputBackground: baseColors.neutral[800],
    inputBorder: baseColors.neutral[600],
    inputBorderHover: baseColors.primary[400],
    inputBorderFocus: baseColors.primary[400],
    inputBorderError: baseColors.error[400],
    inputText: baseColors.neutral[100],
    inputPlaceholder: baseColors.neutral[400],
    labelText: baseColors.neutral[200],
  },

  // Shadows (darker for dark mode)
  shadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.2)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
  },
} as const;

// Manufacturing domain-specific semantic mappings
export const manufacturingSemantics = {
  // Equipment status colors with semantic meanings
  equipment: {
    operational: {
      color: domainColors.equipment.running,
      background: baseColors.success[50],
      border: baseColors.success[200],
    },
    warning: {
      color: domainColors.equipment.idle,
      background: baseColors.warning[50],
      border: baseColors.warning[200],
    },
    maintenance: {
      color: domainColors.equipment.maintenance,
      background: baseColors.info[50],
      border: baseColors.info[200],
    },
    critical: {
      color: domainColors.equipment.fault,
      background: baseColors.error[50],
      border: baseColors.error[200],
    },
    offline: {
      color: domainColors.equipment.offline,
      background: baseColors.neutral[50],
      border: baseColors.neutral[200],
    },
  },

  // Work order progress indicators
  workOrder: {
    notStarted: {
      color: baseColors.neutral[500],
      background: baseColors.neutral[50],
    },
    inProgress: {
      color: baseColors.primary[500],
      background: baseColors.primary[50],
    },
    completed: {
      color: baseColors.success[500],
      background: baseColors.success[50],
    },
    onHold: {
      color: baseColors.warning[500],
      background: baseColors.warning[50],
    },
    cancelled: {
      color: baseColors.error[500],
      background: baseColors.error[50],
    },
  },

  // Quality/Inspection result colors
  quality: {
    passed: {
      color: baseColors.success[600],
      background: baseColors.success[50],
      icon: baseColors.success[500],
    },
    failed: {
      color: baseColors.error[600],
      background: baseColors.error[50],
      icon: baseColors.error[500],
    },
    underReview: {
      color: baseColors.warning[600],
      background: baseColors.warning[50],
      icon: baseColors.warning[500],
    },
    pending: {
      color: baseColors.info[600],
      background: baseColors.info[50],
      icon: baseColors.info[500],
    },
  },

  // Material/Inventory status colors
  material: {
    inStock: {
      color: baseColors.success[500],
      background: baseColors.success[50],
    },
    lowStock: {
      color: baseColors.warning[500],
      background: baseColors.warning[50],
    },
    outOfStock: {
      color: baseColors.error[500],
      background: baseColors.error[50],
    },
    allocated: {
      color: baseColors.primary[500],
      background: baseColors.primary[50],
    },
  },
} as const;

// Accessibility semantic colors
export const accessibilitySemantics = {
  focus: {
    ring: accessibilityColors.focus.ring,
    offset: accessibilityColors.focus.offset,
    width: '2px',
  },
  highContrast: accessibilityColors.highContrast,
} as const;

// Export all themes and semantics
export const themes = {
  light: lightTheme,
  dark: darkTheme,
} as const;

export type ThemeName = keyof typeof themes;
export type SemanticColors = typeof lightTheme;
export type ManufacturingSemantics = typeof manufacturingSemantics;