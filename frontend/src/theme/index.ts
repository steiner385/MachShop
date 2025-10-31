/**
 * Theme System Entry Point
 * MachShop Manufacturing Execution System
 *
 * This file exports all theme-related functionality and serves as the
 * single entry point for the theme system.
 */

// Core color tokens
export * from './tokens/colors';
export * from './tokens/semantic';

// Ant Design integration
export * from './antd';

// React hooks and components
export * from './hooks/useTheme';

// Re-export commonly used items with convenient names
export { baseColors as colors } from './tokens/colors';
export { lightTheme, darkTheme, themes } from './tokens/semantic';
export { lightAntdTheme, darkAntdTheme, antdThemes } from './antd';

// Theme configuration object for easy setup
export const themeConfig = {
  // Default theme settings
  defaults: {
    theme: 'light' as const,
    storageKey: 'machshop-theme',
  },

  // Available themes
  themes: ['light', 'dark'] as const,

  // CSS class names for theme switching
  classNames: {
    light: 'theme-light',
    dark: 'theme-dark',
  },

  // CSS custom property prefixes
  cssVarPrefix: '--color-',
} as const;

export type ThemeConfig = typeof themeConfig;