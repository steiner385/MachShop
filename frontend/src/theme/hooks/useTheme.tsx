/**
 * Theme Management Hook
 * Provides theme context and utilities for the MachShop application
 *
 * This hook manages theme state, provides access to color tokens,
 * and handles theme switching functionality.
 */

import React, { useContext, createContext, useState, useEffect, ReactNode } from 'react';
import { ConfigProvider } from 'antd';
import type { ThemeConfig } from 'antd';
import { baseColors, domainColors, getColor, getDomainColor } from '../tokens/colors';
import { lightTheme, darkTheme, manufacturingSemantics, themes } from '../tokens/semantic';
import { lightAntdTheme, darkAntdTheme, antdThemes } from '../antd';
import type { ThemeName, SemanticColors } from '../tokens/semantic';
import type { AntdThemeName } from '../antd';

// Theme context type definition
interface ThemeContextType {
  // Current theme
  currentTheme: ThemeName;

  // Theme switching
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;

  // Theme data access
  colors: SemanticColors;
  antdConfig: ThemeConfig;

  // Color utilities
  getSemanticColor: (path: string) => string;
  getBaseColor: (category: string, shade?: string) => string;
  getDomainColor: (category: string, state: string) => string;

  // Manufacturing-specific utilities
  getEquipmentStatusColor: (status: string) => { color: string; background: string };
  getWorkOrderStatusColor: (status: string) => { color: string; background: string };
  getQualityStatusColor: (status: string) => { color: string; background: string };

  // System preferences
  prefersDarkMode: boolean;
  prefersReducedMotion: boolean;
  prefersHighContrast: boolean;
}

// Create theme context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Theme provider component
interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemeName;
  storageKey?: string;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'light',
  storageKey = 'machshop-theme',
}) => {
  // System preferences detection
  const [prefersDarkMode, setPrefersDarkMode] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [prefersHighContrast, setPrefersHighContrast] = useState(false);

  // Theme state
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(() => {
    // Try to load from localStorage first
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored && (stored === 'light' || stored === 'dark')) {
        return stored as ThemeName;
      }
    }
    return defaultTheme;
  });

  // Detect system preferences
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');

    setPrefersDarkMode(darkModeQuery.matches);
    setPrefersReducedMotion(reducedMotionQuery.matches);
    setPrefersHighContrast(highContrastQuery.matches);

    const handleDarkModeChange = (e: MediaQueryListEvent) => setPrefersDarkMode(e.matches);
    const handleReducedMotionChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    const handleHighContrastChange = (e: MediaQueryListEvent) => setPrefersHighContrast(e.matches);

    darkModeQuery.addEventListener('change', handleDarkModeChange);
    reducedMotionQuery.addEventListener('change', handleReducedMotionChange);
    highContrastQuery.addEventListener('change', handleHighContrastChange);

    return () => {
      darkModeQuery.removeEventListener('change', handleDarkModeChange);
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
      highContrastQuery.removeEventListener('change', handleHighContrastChange);
    };
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', currentTheme);

      // Store in localStorage
      localStorage.setItem(storageKey, currentTheme);
    }
  }, [currentTheme, storageKey]);

  // Theme switching functions
  const setTheme = (theme: ThemeName) => {
    setCurrentTheme(theme);
  };

  const toggleTheme = () => {
    setCurrentTheme(currentTheme === 'light' ? 'dark' : 'light');
  };

  // Get current theme colors and config
  const colors = themes[currentTheme];
  const antdConfig = antdThemes[currentTheme as AntdThemeName];

  // Color utility functions
  const getSemanticColor = (path: string): string => {
    const pathArray = path.split('.');
    let current: any = colors;

    for (const key of pathArray) {
      current = current[key];
      if (current === undefined) break;
    }

    return current || '#000000';
  };

  const getBaseColor = (category: string, shade: string = '500'): string => {
    return getColor(category as any, shade as any);
  };

  const getDomainColorValue = (category: string, state: string): string => {
    return getDomainColor(category as any, state);
  };

  // Manufacturing-specific color utilities
  const getEquipmentStatusColor = (status: string) => {
    const statusMap = {
      running: manufacturingSemantics.equipment.operational,
      operational: manufacturingSemantics.equipment.operational,
      idle: manufacturingSemantics.equipment.warning,
      warning: manufacturingSemantics.equipment.warning,
      maintenance: manufacturingSemantics.equipment.maintenance,
      fault: manufacturingSemantics.equipment.critical,
      critical: manufacturingSemantics.equipment.critical,
      offline: manufacturingSemantics.equipment.offline,
    };

    return statusMap[status.toLowerCase() as keyof typeof statusMap] || manufacturingSemantics.equipment.offline;
  };

  const getWorkOrderStatusColor = (status: string) => {
    const statusMap = {
      'not-started': manufacturingSemantics.workOrder.notStarted,
      pending: manufacturingSemantics.workOrder.notStarted,
      'in-progress': manufacturingSemantics.workOrder.inProgress,
      inProgress: manufacturingSemantics.workOrder.inProgress,
      completed: manufacturingSemantics.workOrder.completed,
      'on-hold': manufacturingSemantics.workOrder.onHold,
      onHold: manufacturingSemantics.workOrder.onHold,
      cancelled: manufacturingSemantics.workOrder.cancelled,
    };

    return statusMap[status as keyof typeof statusMap] || manufacturingSemantics.workOrder.notStarted;
  };

  const getQualityStatusColor = (status: string) => {
    const statusMap = {
      pass: manufacturingSemantics.quality.passed,
      passed: manufacturingSemantics.quality.passed,
      fail: manufacturingSemantics.quality.failed,
      failed: manufacturingSemantics.quality.failed,
      review: manufacturingSemantics.quality.underReview,
      'under-review': manufacturingSemantics.quality.underReview,
      pending: manufacturingSemantics.quality.pending,
    };

    return statusMap[status.toLowerCase() as keyof typeof statusMap] || manufacturingSemantics.quality.pending;
  };

  // Context value
  const contextValue: ThemeContextType = {
    currentTheme,
    setTheme,
    toggleTheme,
    colors,
    antdConfig,
    getSemanticColor,
    getBaseColor,
    getDomainColor: getDomainColorValue,
    getEquipmentStatusColor,
    getWorkOrderStatusColor,
    getQualityStatusColor,
    prefersDarkMode,
    prefersReducedMotion,
    prefersHighContrast,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <ConfigProvider theme={antdConfig}>
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
};

// Hook to use theme context
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Utility hooks for specific use cases
export const useThemeColors = () => {
  const { colors } = useTheme();
  return colors;
};

export const useManufacturingColors = () => {
  const { getEquipmentStatusColor, getWorkOrderStatusColor, getQualityStatusColor } = useTheme();
  return {
    getEquipmentStatusColor,
    getWorkOrderStatusColor,
    getQualityStatusColor,
  };
};

export const useColorUtilities = () => {
  const { getSemanticColor, getBaseColor, getDomainColor } = useTheme();
  return {
    getSemanticColor,
    getBaseColor,
    getDomainColor,
  };
};

// System preferences hook
export const useSystemPreferences = () => {
  const { prefersDarkMode, prefersReducedMotion, prefersHighContrast } = useTheme();
  return {
    prefersDarkMode,
    prefersReducedMotion,
    prefersHighContrast,
  };
};

// Theme-aware component wrapper
interface ThemedComponentProps {
  children: (theme: ThemeContextType) => ReactNode;
}

export const ThemedComponent: React.FC<ThemedComponentProps> = ({ children }) => {
  const theme = useTheme();
  return <>{children(theme)}</>;
};

// Export types for external use
export type { ThemeContextType, ThemeName, SemanticColors };