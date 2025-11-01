/**
 * useTheme Hook
 *
 * Provides access to theme configuration and utilities for extensions.
 * Ensures extensions use design tokens instead of hard-coded colors.
 *
 * @module frontend-extension-sdk/theme/useTheme
 */

import * as React from 'react';
import { useExtensionContext, ThemeConfig } from '../context';

/**
 * Design tokens available to extensions
 */
export interface DesignTokens {
  // Colors
  colorPrimary: string;
  colorSuccess: string;
  colorError: string;
  colorWarning: string;
  colorInfo: string;

  // Manufacturing domain colors
  colorProduction: string;
  colorQuality: string;
  colorMaterials: string;
  colorEquipment: string;
  colorScheduling: string;

  // Status colors
  colorRunning: string;
  colorIdle: string;
  colorMaintenance: string;
  colorStopped: string;

  // Work order status
  colorWONew: string;
  colorWOInProgress: string;
  colorWOCompleted: string;
  colorWOOnHold: string;
  colorWOCancelled: string;

  // Text colors
  colorTextPrimary: string;
  colorTextSecondary: string;
  colorTextTertiary: string;
  colorTextInverse: string;

  // Background colors
  colorBgPrimary: string;
  colorBgSecondary: string;
  colorBgTertiary: string;

  // Neutral palette
  colorNeutral50: string;
  colorNeutral100: string;
  colorNeutral200: string;
  colorNeutral300: string;
  colorNeutral400: string;
  colorNeutral500: string;
  colorNeutral600: string;
  colorNeutral700: string;
  colorNeutral800: string;
  colorNeutral900: string;

  // Typography
  fontSizeBase: number;
  fontSizeSmall: number;
  fontSizeLarge: number;
  fontSizeHeading1: number;
  fontSizeHeading2: number;
  fontSizeHeading3: number;
  fontWeightRegular: number;
  fontWeightMedium: number;
  fontWeightSemibold: number;
  fontWeightBold: number;

  // Spacing
  spacingXs: number;
  spacingSm: number;
  spacingMd: number;
  spacingLg: number;
  spacingXl: number;

  // Border radius
  borderRadius: number;
  borderRadiusSm: number;
  borderRadiusLg: number;

  // Shadows
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;
  shadowXl: string;

  [key: string]: any;
}

/**
 * Theme hook return value
 */
export interface ThemeHookReturn {
  /**
   * Current theme mode (light/dark)
   */
  mode: 'light' | 'dark';

  /**
   * Design tokens for use in styling
   */
  tokens: DesignTokens;

  /**
   * CSS variable for a token (e.g., var(--color-primary))
   */
  token: (name: string) => string;

  /**
   * Toggle theme between light and dark
   */
  toggleTheme: () => void;

  /**
   * Check if in dark mode
   */
  isDark: boolean;

  /**
   * Check if in light mode
   */
  isLight: boolean;
}

/**
 * Default design tokens for light theme
 */
const DEFAULT_LIGHT_TOKENS: DesignTokens = {
  // Colors
  colorPrimary: '#1890ff',
  colorSuccess: '#52c41a',
  colorError: '#ff4d4f',
  colorWarning: '#faad14',
  colorInfo: '#1890ff',

  // Manufacturing domain colors
  colorProduction: '#13c2c2',
  colorQuality: '#722ed1',
  colorMaterials: '#fa8c16',
  colorEquipment: '#eb2f96',
  colorScheduling: '#f5222d',

  // Status colors
  colorRunning: '#52c41a',
  colorIdle: '#faad14',
  colorMaintenance: '#ff4d4f',
  colorStopped: '#8c8c8c',

  // Work order status
  colorWONew: '#1890ff',
  colorWOInProgress: '#faad14',
  colorWOCompleted: '#52c41a',
  colorWOOnHold: '#ff7a45',
  colorWOCancelled: '#d9d9d9',

  // Text colors
  colorTextPrimary: 'rgba(0, 0, 0, 0.85)',
  colorTextSecondary: 'rgba(0, 0, 0, 0.65)',
  colorTextTertiary: 'rgba(0, 0, 0, 0.45)',
  colorTextInverse: 'rgba(255, 255, 255, 0.85)',

  // Background colors
  colorBgPrimary: '#ffffff',
  colorBgSecondary: '#fafafa',
  colorBgTertiary: '#f5f5f5',

  // Neutral palette
  colorNeutral50: '#fafafa',
  colorNeutral100: '#f5f5f5',
  colorNeutral200: '#eeeeee',
  colorNeutral300: '#e8e8e8',
  colorNeutral400: '#d9d9d9',
  colorNeutral500: '#bfbfbf',
  colorNeutral600: '#8c8c8c',
  colorNeutral700: '#595959',
  colorNeutral800: '#434343',
  colorNeutral900: '#262626',

  // Typography
  fontSizeBase: 14,
  fontSizeSmall: 12,
  fontSizeLarge: 16,
  fontSizeHeading1: 32,
  fontSizeHeading2: 28,
  fontSizeHeading3: 24,
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightSemibold: 600,
  fontWeightBold: 700,

  // Spacing
  spacingXs: 4,
  spacingSm: 8,
  spacingMd: 16,
  spacingLg: 24,
  spacingXl: 32,

  // Border radius
  borderRadius: 2,
  borderRadiusSm: 2,
  borderRadiusLg: 6,

  // Shadows
  shadowSm: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
  shadowMd: '0 3px 6px -4px rgba(0, 0, 0, 0.12)',
  shadowLg: '0 6px 16px -8px rgba(0, 0, 0, 0.08)',
  shadowXl: '0 12px 24px -8px rgba(0, 0, 0, 0.15)',
};

/**
 * Default design tokens for dark theme
 */
const DEFAULT_DARK_TOKENS: DesignTokens = {
  ...DEFAULT_LIGHT_TOKENS,
  // Override for dark mode
  colorTextPrimary: 'rgba(255, 255, 255, 0.85)',
  colorTextSecondary: 'rgba(255, 255, 255, 0.65)',
  colorTextTertiary: 'rgba(255, 255, 255, 0.45)',
  colorTextInverse: 'rgba(0, 0, 0, 0.85)',
  colorBgPrimary: '#141414',
  colorBgSecondary: '#1f1f1f',
  colorBgTertiary: '#262626',
};

/**
 * Hook to access theme configuration and tokens
 *
 * @returns Theme configuration and utilities
 *
 * @example
 * ```typescript
 * const { tokens, mode, isDark } = useTheme();
 * return <div style={{ color: tokens.colorPrimary }}>Content</div>;
 * ```
 */
export function useTheme(): ThemeHookReturn {
  const context = useExtensionContext();
  const [mode, setMode] = React.useState<'light' | 'dark'>(context.theme.mode);

  // Get tokens from context or use defaults
  const tokens: DesignTokens = {
    ...(mode === 'light' ? DEFAULT_LIGHT_TOKENS : DEFAULT_DARK_TOKENS),
    ...(context.theme.tokens || {}),
  };

  const toggleTheme = React.useCallback(() => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const token = React.useCallback((name: string): string => {
    return `var(--${name.replace(/([A-Z])/g, '-$1').toLowerCase()})`;
  }, []);

  return {
    mode,
    tokens,
    token,
    toggleTheme,
    isDark: mode === 'dark',
    isLight: mode === 'light',
  };
}

/**
 * Provider component for theme
 */
export function ThemeProvider({
  children,
  tokens,
}: {
  children: React.ReactNode;
  tokens?: Partial<DesignTokens>;
}): React.ReactElement {
  const mergedTokens: DesignTokens = {
    ...DEFAULT_LIGHT_TOKENS,
    ...tokens,
  };

  // Create CSS variables
  const cssVariables = Object.entries(mergedTokens)
    .map(([key, value]) => {
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `--${cssKey}: ${typeof value === 'number' ? `${value}px` : value};`;
    })
    .join('\n');

  return (
    <>
      <style>{`:root { ${cssVariables} }`}</style>
      {children}
    </>
  );
}
