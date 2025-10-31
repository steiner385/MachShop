/**
 * Base Color Tokens
 * Core color palette for the MachShop Manufacturing Execution System
 *
 * This file defines the foundational color tokens that serve as the building blocks
 * for all color usage throughout the application. These tokens are design-system agnostic
 * and can be used to generate theme variations, accessibility modes, and brand themes.
 */

export const baseColors = {
  // Primary Brand Colors
  primary: {
    50: '#e6f7ff',
    100: '#bae7ff',
    200: '#91d5ff',
    300: '#69c0ff',
    400: '#40a9ff',
    500: '#1890ff', // Main primary color (most used: 197 occurrences)
    600: '#096dd9',
    700: '#0050b3',
    800: '#003a8c',
    900: '#002766',
  },

  // Success/Safe/Operational Colors
  success: {
    50: '#f6ffed',
    100: '#d9f7be',
    200: '#b7eb8f',
    300: '#95de64',
    400: '#73d13d',
    500: '#52c41a', // Main success color (169 occurrences)
    600: '#389e0d',
    700: '#237804',
    800: '#135200',
    900: '#092b00',
  },

  // Error/Warning/Critical Colors
  error: {
    50: '#fff2f0',
    100: '#ffccc7',
    200: '#ffa39e',
    300: '#ff7875',
    400: '#ff7875',
    500: '#ff4d4f', // Main error color (95 occurrences)
    600: '#f5222d',
    700: '#cf1322',
    800: '#a8071a',
    900: '#820014',
  },

  // Warning/Caution Colors
  warning: {
    50: '#fffbe6',
    100: '#fff1b8',
    200: '#ffe58f',
    300: '#ffd666',
    400: '#ffc53d',
    500: '#faad14', // Main warning color (81 occurrences)
    600: '#d48806',
    700: '#ad6800',
    800: '#874d00',
    900: '#613400',
  },

  // Information/Processing Colors
  info: {
    50: '#f0f5ff',
    100: '#d6e4ff',
    200: '#adc6ff',
    300: '#85a5ff',
    400: '#597ef7',
    500: '#2f54eb',
    600: '#1d39c4',
    700: '#10239e',
    800: '#061178',
    900: '#030852',
  },

  // Purple/Secondary Brand (54 occurrences)
  purple: {
    50: '#f9f0ff',
    100: '#efdbff',
    200: '#d3adf7',
    300: '#b37feb',
    400: '#9254de',
    500: '#722ed1', // Main purple color
    600: '#531dab',
    700: '#391085',
    800: '#22075e',
    900: '#120338',
  },

  // Neutral/Gray Scale
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#f0f0f0',
    300: '#d9d9d9',
    400: '#bfbfbf',
    500: '#8c8c8c',
    600: '#595959',
    700: '#434343',
    800: '#262626',
    900: '#1f1f1f',
    950: '#141414',
  },

  // Pure colors for absolute needs
  pure: {
    white: '#ffffff',
    black: '#000000',
  },
} as const;

// Manufacturing domain-specific colors
export const domainColors = {
  // Equipment status colors
  equipment: {
    running: baseColors.success[500],
    idle: baseColors.warning[500],
    maintenance: baseColors.info[500],
    fault: baseColors.error[500],
    offline: baseColors.neutral[500],
  },

  // Work order status colors
  workOrder: {
    pending: baseColors.neutral[500],
    inProgress: baseColors.primary[500],
    completed: baseColors.success[500],
    onHold: baseColors.warning[500],
    cancelled: baseColors.error[500],
  },

  // Quality/Inspection colors
  quality: {
    pass: baseColors.success[500],
    fail: baseColors.error[500],
    review: baseColors.warning[500],
    pending: baseColors.info[500],
  },

  // Material status colors
  material: {
    available: baseColors.success[500],
    allocated: baseColors.primary[500],
    depleted: baseColors.error[500],
    expired: baseColors.warning[500],
  },

  // Workflow/Approval colors
  workflow: {
    draft: baseColors.neutral[400],
    submitted: baseColors.info[500],
    approved: baseColors.success[500],
    rejected: baseColors.error[500],
    pending: baseColors.warning[500],
  },
} as const;

// Accessibility-focused color definitions
export const accessibilityColors = {
  // High contrast variants for accessibility
  highContrast: {
    text: baseColors.pure.black,
    background: baseColors.pure.white,
    primary: '#0066cc',
    success: '#006600',
    error: '#cc0000',
    warning: '#cc6600',
  },

  // Focus indicators
  focus: {
    ring: baseColors.primary[500],
    offset: baseColors.pure.white,
  },
} as const;

// Color type definitions for TypeScript
export type BaseColorKey = keyof typeof baseColors;
export type BaseColorShade = keyof typeof baseColors.primary;
export type DomainColorCategory = keyof typeof domainColors;
export type AccessibilityColorKey = keyof typeof accessibilityColors;

// Helper function to get color values
export const getColor = (
  category: BaseColorKey,
  shade: BaseColorShade = '500'
): string => {
  return baseColors[category][shade];
};

export const getDomainColor = (
  category: DomainColorCategory,
  state: string
): string => {
  const categoryColors = domainColors[category] as Record<string, string>;
  return categoryColors[state] || baseColors.neutral[500];
};