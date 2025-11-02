# Theme Guide

## Table of Contents

- [Introduction](#introduction)
- [Design Tokens](#design-tokens)
- [Theme Context](#theme-context)
- [Accessing Theme in Components](#accessing-theme-in-components)
- [Dark Mode Support](#dark-mode-support)
- [CSS Variables](#css-variables)
- [Theme Switching](#theme-switching)
- [Color Palette](#color-palette)
- [Typography and Spacing](#typography-and-spacing)
- [Styling Best Practices](#styling-best-practices)

## Introduction

The theming system provides a consistent, customizable design language for your extension. It supports light and dark modes, custom color palettes, and responsive design tokens.

### Theme Benefits

- **Consistency**: Unified design across all components
- **Maintainability**: Single source of truth for design values
- **Accessibility**: Built-in contrast requirements
- **Customization**: Easy to brand and personalize
- **Dark Mode**: Automatic support with proper token usage

### Design System Philosophy

```
Design Tokens → Theme → Components → User Interface
```

## Design Tokens

### Core Token Categories

```typescript
// src/theme/tokens.ts
export const tokens = {
  // Colors
  colors: {
    // Primary brand colors
    primary: {
      50: '#e3f2fd',
      100: '#bbdefb',
      200: '#90caf9',
      300: '#64b5f6',
      400: '#42a5f5',
      500: '#2196f3', // Main
      600: '#1e88e5',
      700: '#1976d2',
      800: '#1565c0',
      900: '#0d47a1',
    },

    // Semantic colors
    success: {
      light: '#81c784',
      main: '#4caf50',
      dark: '#388e3c',
    },
    warning: {
      light: '#ffb74d',
      main: '#ff9800',
      dark: '#f57c00',
    },
    error: {
      light: '#e57373',
      main: '#f44336',
      dark: '#d32f2f',
    },
    info: {
      light: '#64b5f6',
      main: '#2196f3',
      dark: '#1976d2',
    },

    // Neutral colors
    grey: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#eeeeee',
      300: '#e0e0e0',
      400: '#bdbdbd',
      500: '#9e9e9e',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
    },

    // Text colors
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
      disabled: 'rgba(0, 0, 0, 0.38)',
      hint: 'rgba(0, 0, 0, 0.38)',
    },

    // Background colors
    background: {
      default: '#ffffff',
      paper: '#ffffff',
      elevated: '#f5f5f5',
    },

    // Divider
    divider: 'rgba(0, 0, 0, 0.12)',

    // Action colors
    action: {
      active: 'rgba(0, 0, 0, 0.54)',
      hover: 'rgba(0, 0, 0, 0.04)',
      selected: 'rgba(0, 0, 0, 0.08)',
      disabled: 'rgba(0, 0, 0, 0.26)',
      disabledBackground: 'rgba(0, 0, 0, 0.12)',
    },
  },

  // Typography
  typography: {
    fontFamily: {
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      serif: 'Georgia, "Times New Roman", Times, serif',
      mono: '"Fira Code", "Courier New", monospace',
    },
    fontSize: {
      xs: '0.75rem',      // 12px
      sm: '0.875rem',     // 14px
      base: '1rem',       // 16px
      lg: '1.125rem',     // 18px
      xl: '1.25rem',      // 20px
      '2xl': '1.5rem',    // 24px
      '3xl': '1.875rem',  // 30px
      '4xl': '2.25rem',   // 36px
      '5xl': '3rem',      // 48px
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      none: 1,
      tight: 1.25,
      snug: 1.375,
      normal: 1.5,
      relaxed: 1.625,
      loose: 2,
    },
    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em',
    },
  },

  // Spacing
  spacing: {
    0: '0',
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
    16: '4rem',     // 64px
    20: '5rem',     // 80px
    24: '6rem',     // 96px
  },

  // Breakpoints
  breakpoints: {
    xs: '0px',
    sm: '600px',
    md: '900px',
    lg: '1200px',
    xl: '1536px',
  },

  // Shadows
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  },

  // Border radius
  borderRadius: {
    none: '0',
    sm: '0.125rem',   // 2px
    base: '0.25rem',  // 4px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    full: '9999px',
  },

  // Transitions
  transitions: {
    duration: {
      fast: '150ms',
      base: '200ms',
      slow: '300ms',
      slower: '500ms',
    },
    easing: {
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
      linear: 'linear',
    },
  },

  // Z-index
  zIndex: {
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    modalBackdrop: 1300,
    modal: 1400,
    popover: 1500,
    tooltip: 1600,
  },
} as const;

export type Tokens = typeof tokens;
```

### Dark Mode Tokens

```typescript
// src/theme/darkTokens.ts
export const darkTokens = {
  colors: {
    // Primary colors remain the same
    primary: tokens.colors.primary,

    // Adjusted semantic colors for dark mode
    success: {
      light: '#66bb6a',
      main: '#4caf50',
      dark: '#388e3c',
    },
    warning: {
      light: '#ffa726',
      main: '#ff9800',
      dark: '#f57c00',
    },
    error: {
      light: '#ef5350',
      main: '#f44336',
      dark: '#c62828',
    },

    // Dark mode neutrals
    grey: tokens.colors.grey,

    // Dark mode text
    text: {
      primary: 'rgba(255, 255, 255, 0.87)',
      secondary: 'rgba(255, 255, 255, 0.6)',
      disabled: 'rgba(255, 255, 255, 0.38)',
      hint: 'rgba(255, 255, 255, 0.38)',
    },

    // Dark mode backgrounds
    background: {
      default: '#121212',
      paper: '#1e1e1e',
      elevated: '#2c2c2c',
    },

    // Dark mode divider
    divider: 'rgba(255, 255, 255, 0.12)',

    // Dark mode actions
    action: {
      active: 'rgba(255, 255, 255, 0.56)',
      hover: 'rgba(255, 255, 255, 0.08)',
      selected: 'rgba(255, 255, 255, 0.16)',
      disabled: 'rgba(255, 255, 255, 0.3)',
      disabledBackground: 'rgba(255, 255, 255, 0.12)',
    },
  },

  // Other tokens remain the same
  typography: tokens.typography,
  spacing: tokens.spacing,
  breakpoints: tokens.breakpoints,
  shadows: tokens.shadows,
  borderRadius: tokens.borderRadius,
  transitions: tokens.transitions,
  zIndex: tokens.zIndex,
} as const;
```

## Theme Context

### Theme Provider

```typescript
// src/contexts/ThemeContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { tokens } from '@/theme/tokens';
import { darkTokens } from '@/theme/darkTokens';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedMode: 'light' | 'dark';
  tokens: typeof tokens;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultMode?: ThemeMode;
}

export function ThemeProvider({ children, defaultMode = 'system' }: ThemeProviderProps) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem('theme-mode');
    return (stored as ThemeMode) || defaultMode;
  });

  const [systemMode, setSystemMode] = useState<'light' | 'dark'>(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemMode(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Resolve theme mode
  const resolvedMode = mode === 'system' ? systemMode : mode;

  // Get tokens based on resolved mode
  const currentTokens = resolvedMode === 'dark' ? darkTokens : tokens;

  // Apply theme class to document
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(resolvedMode);
    document.documentElement.setAttribute('data-theme', resolvedMode);
  }, [resolvedMode]);

  // Persist mode preference
  useEffect(() => {
    localStorage.setItem('theme-mode', mode);
  }, [mode]);

  const toggleMode = () => {
    setMode(current => {
      if (current === 'light') return 'dark';
      if (current === 'dark') return 'system';
      return 'light';
    });
  };

  const value: ThemeContextValue = {
    mode,
    resolvedMode,
    tokens: currentTokens,
    setMode,
    toggleMode,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
}
```

## Accessing Theme in Components

### Using the useTheme Hook

```typescript
// Basic usage
import { useTheme } from '@/contexts/ThemeContext';

function ThemedButton() {
  const { tokens } = useTheme();

  return (
    <button
      style={{
        backgroundColor: tokens.colors.primary[500],
        color: tokens.colors.text.primary,
        padding: `${tokens.spacing[2]} ${tokens.spacing[4]}`,
        borderRadius: tokens.borderRadius.md,
        fontSize: tokens.typography.fontSize.base,
        fontWeight: tokens.typography.fontWeight.medium,
        transition: `all ${tokens.transitions.duration.base} ${tokens.transitions.easing.easeInOut}`,
      }}
    >
      Click me
    </button>
  );
}

// With hover styles
function InteractiveButton() {
  const { tokens } = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: isHovered
          ? tokens.colors.primary[600]
          : tokens.colors.primary[500],
        color: tokens.colors.text.primary,
        padding: `${tokens.spacing[3]} ${tokens.spacing[6]}`,
        borderRadius: tokens.borderRadius.lg,
        boxShadow: isHovered ? tokens.shadows.md : tokens.shadows.base,
      }}
    >
      Hover me
    </button>
  );
}
```

### Styled Components Pattern

```typescript
// src/components/Button/Button.styles.ts
import styled from 'styled-components';
import { tokens } from '@/theme/tokens';

export const StyledButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: ${tokens.spacing[3]} ${tokens.spacing[6]};
  font-size: ${tokens.typography.fontSize.base};
  font-weight: ${tokens.typography.fontWeight.medium};
  border-radius: ${tokens.borderRadius.md};
  border: none;
  cursor: pointer;
  transition: all ${tokens.transitions.duration.base} ${tokens.transitions.easing.easeInOut};

  ${({ variant = 'primary' }) => variant === 'primary' && `
    background-color: ${tokens.colors.primary[500]};
    color: white;

    &:hover {
      background-color: ${tokens.colors.primary[600]};
      box-shadow: ${tokens.shadows.md};
    }

    &:active {
      background-color: ${tokens.colors.primary[700]};
    }
  `}

  ${({ variant }) => variant === 'secondary' && `
    background-color: transparent;
    color: ${tokens.colors.primary[500]};
    border: 2px solid ${tokens.colors.primary[500]};

    &:hover {
      background-color: ${tokens.colors.primary[50]};
    }
  `}

  &:disabled {
    background-color: ${tokens.colors.action.disabledBackground};
    color: ${tokens.colors.action.disabled};
    cursor: not-allowed;
  }
`;

// Usage
import { StyledButton } from './Button.styles';

function Button({ children, variant = 'primary', ...props }) {
  return (
    <StyledButton variant={variant} {...props}>
      {children}
    </StyledButton>
  );
}
```

### CSS Modules with Tokens

```typescript
// Button.module.css
.button {
  padding: var(--spacing-3) var(--spacing-6);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  border-radius: var(--border-radius-md);
  background-color: var(--color-primary-500);
  color: var(--color-text-primary);
  transition: all var(--transition-duration-base) var(--transition-easing-ease-in-out);
}

.button:hover {
  background-color: var(--color-primary-600);
  box-shadow: var(--shadow-md);
}

// Button.tsx
import styles from './Button.module.css';

function Button({ children }) {
  return (
    <button className={styles.button}>
      {children}
    </button>
  );
}
```

## Dark Mode Support

### Implementing Dark Mode

```typescript
// Automatic dark mode colors
function Card() {
  const { tokens } = useTheme();

  return (
    <div
      style={{
        backgroundColor: tokens.colors.background.paper,
        color: tokens.colors.text.primary,
        padding: tokens.spacing[6],
        borderRadius: tokens.borderRadius.lg,
        boxShadow: tokens.shadows.md,
      }}
    >
      <h2>Card Title</h2>
      <p style={{ color: tokens.colors.text.secondary }}>
        This card automatically adapts to light and dark modes.
      </p>
    </div>
  );
}
```

### Dark Mode Best Practices

```typescript
// Use semantic color tokens, not hardcoded colors
// Good:
const styles = {
  color: tokens.colors.text.primary,
  backgroundColor: tokens.colors.background.default,
};

// Bad:
const styles = {
  color: '#000000',
  backgroundColor: '#ffffff',
};

// Handle images in dark mode
function Logo() {
  const { resolvedMode } = useTheme();

  return (
    <img
      src={resolvedMode === 'dark' ? '/logo-dark.svg' : '/logo-light.svg'}
      alt="Logo"
    />
  );
}

// Adjust opacity for dark mode
function Overlay() {
  const { resolvedMode, tokens } = useTheme();

  return (
    <div
      style={{
        backgroundColor: resolvedMode === 'dark'
          ? 'rgba(0, 0, 0, 0.7)'
          : 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(8px)',
      }}
    />
  );
}
```

### Dark Mode Testing

```typescript
// Test component in both modes
describe('ThemedComponent', () => {
  it('should render correctly in light mode', () => {
    render(
      <ThemeProvider defaultMode="light">
        <ThemedComponent />
      </ThemeProvider>
    );

    const element = screen.getByTestId('themed-element');
    expect(element).toHaveStyle({
      backgroundColor: tokens.colors.background.default,
    });
  });

  it('should render correctly in dark mode', () => {
    render(
      <ThemeProvider defaultMode="dark">
        <ThemedComponent />
      </ThemeProvider>
    );

    const element = screen.getByTestId('themed-element');
    expect(element).toHaveStyle({
      backgroundColor: darkTokens.colors.background.default,
    });
  });
});
```

## CSS Variables

### Generating CSS Variables

```typescript
// src/theme/cssVariables.ts
import { tokens } from './tokens';

export function generateCSSVariables(theme: typeof tokens): string {
  const variables: string[] = [];

  // Colors
  Object.entries(theme.colors.primary).forEach(([key, value]) => {
    variables.push(`--color-primary-${key}: ${value};`);
  });

  Object.entries(theme.colors.grey).forEach(([key, value]) => {
    variables.push(`--color-grey-${key}: ${value};`);
  });

  Object.entries(theme.colors.text).forEach(([key, value]) => {
    variables.push(`--color-text-${key}: ${value};`);
  });

  Object.entries(theme.colors.background).forEach(([key, value]) => {
    variables.push(`--color-background-${key}: ${value};`);
  });

  // Typography
  Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
    variables.push(`--font-size-${key}: ${value};`);
  });

  Object.entries(theme.typography.fontWeight).forEach(([key, value]) => {
    variables.push(`--font-weight-${key}: ${value};`);
  });

  // Spacing
  Object.entries(theme.spacing).forEach(([key, value]) => {
    variables.push(`--spacing-${key}: ${value};`);
  });

  // Shadows
  Object.entries(theme.shadows).forEach(([key, value]) => {
    variables.push(`--shadow-${key}: ${value};`);
  });

  // Border radius
  Object.entries(theme.borderRadius).forEach(([key, value]) => {
    variables.push(`--border-radius-${key}: ${value};`);
  });

  // Transitions
  Object.entries(theme.transitions.duration).forEach(([key, value]) => {
    variables.push(`--transition-duration-${key}: ${value};`);
  });

  return variables.join('\n  ');
}
```

### Applying CSS Variables

```typescript
// Apply variables to document
useEffect(() => {
  const cssVariables = generateCSSVariables(currentTokens);
  const styleTag = document.getElementById('theme-variables') || document.createElement('style');

  styleTag.id = 'theme-variables';
  styleTag.textContent = `
    :root {
      ${cssVariables}
    }
  `;

  if (!styleTag.parentElement) {
    document.head.appendChild(styleTag);
  }
}, [currentTokens]);

// Use in CSS
.button {
  background-color: var(--color-primary-500);
  padding: var(--spacing-3) var(--spacing-6);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-base);
  transition: all var(--transition-duration-base);
}

.button:hover {
  background-color: var(--color-primary-600);
  box-shadow: var(--shadow-md);
}
```

## Theme Switching

### Theme Toggle Component

```typescript
// src/components/ThemeToggle/ThemeToggle.tsx
import { useTheme } from '@/contexts/ThemeContext';
import { SunIcon, MoonIcon, ComputerIcon } from '@/icons';

export function ThemeToggle() {
  const { mode, setMode, tokens } = useTheme();

  const modes: ThemeMode[] = ['light', 'dark', 'system'];
  const icons = {
    light: SunIcon,
    dark: MoonIcon,
    system: ComputerIcon,
  };

  const Icon = icons[mode];

  return (
    <div className="theme-toggle">
      <button
        onClick={() => {
          const currentIndex = modes.indexOf(mode);
          const nextIndex = (currentIndex + 1) % modes.length;
          setMode(modes[nextIndex]);
        }}
        aria-label={`Switch to ${modes[(modes.indexOf(mode) + 1) % modes.length]} mode`}
        style={{
          padding: tokens.spacing[2],
          borderRadius: tokens.borderRadius.full,
          backgroundColor: tokens.colors.background.elevated,
          border: `1px solid ${tokens.colors.divider}`,
        }}
      >
        <Icon size={20} />
      </button>
    </div>
  );
}

// Advanced toggle with dropdown
export function ThemeToggleDropdown() {
  const { mode, setMode, tokens } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const modes = [
    { value: 'light' as ThemeMode, label: 'Light', icon: SunIcon },
    { value: 'dark' as ThemeMode, label: 'Dark', icon: MoonIcon },
    { value: 'system' as ThemeMode, label: 'System', icon: ComputerIcon },
  ];

  return (
    <div className="theme-toggle-dropdown">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Theme selector"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        {modes.find(m => m.value === mode)?.icon || SunIcon}
      </button>

      {isOpen && (
        <div role="menu" className="dropdown-menu">
          {modes.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              role="menuitem"
              onClick={() => {
                setMode(value);
                setIsOpen(false);
              }}
              className={mode === value ? 'active' : ''}
            >
              <Icon />
              <span>{label}</span>
              {mode === value && <CheckIcon />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Persisting Theme Preference

```typescript
// Automatically handled by ThemeProvider
// Additional persistence strategies:

// 1. Sync across tabs
useEffect(() => {
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'theme-mode' && e.newValue) {
      setMode(e.newValue as ThemeMode);
    }
  };

  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
}, []);

// 2. Server-side persistence
async function saveThemeToServer(mode: ThemeMode) {
  await fetch('/api/user/preferences', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ theme: mode }),
  });
}

// 3. Cookie-based SSR support
document.cookie = `theme=${mode}; path=/; max-age=31536000`;
```

## Color Palette

### Primary Colors

```typescript
// Using primary color scale
function Button({ variant = 'default' }) {
  const { tokens } = useTheme();

  const variants = {
    default: tokens.colors.primary[500],
    light: tokens.colors.primary[300],
    dark: tokens.colors.primary[700],
  };

  return (
    <button style={{ backgroundColor: variants[variant] }}>
      Click me
    </button>
  );
}
```

### Semantic Colors

```typescript
// Success, warning, error states
function StatusBadge({ status }: { status: 'success' | 'warning' | 'error' }) {
  const { tokens } = useTheme();

  const colors = {
    success: tokens.colors.success.main,
    warning: tokens.colors.warning.main,
    error: tokens.colors.error.main,
  };

  const backgroundColors = {
    success: tokens.colors.success.light,
    warning: tokens.colors.warning.light,
    error: tokens.colors.error.light,
  };

  return (
    <span
      style={{
        backgroundColor: backgroundColors[status],
        color: colors[status],
        padding: `${tokens.spacing[1]} ${tokens.spacing[3]}`,
        borderRadius: tokens.borderRadius.full,
        fontSize: tokens.typography.fontSize.sm,
        fontWeight: tokens.typography.fontWeight.medium,
      }}
    >
      {status}
    </span>
  );
}
```

### Custom Color Palettes

```typescript
// Extend theme with custom colors
const customTokens = {
  ...tokens,
  colors: {
    ...tokens.colors,
    brand: {
      purple: '#6b46c1',
      teal: '#319795',
      orange: '#dd6b20',
    },
  },
};

// Use custom colors
function BrandedButton() {
  return (
    <button
      style={{
        backgroundColor: customTokens.colors.brand.purple,
        color: 'white',
      }}
    >
      Brand Button
    </button>
  );
}
```

## Typography and Spacing

### Typography System

```typescript
// Heading components
function Heading({ level = 1, children }) {
  const { tokens } = useTheme();

  const styles = {
    1: {
      fontSize: tokens.typography.fontSize['5xl'],
      fontWeight: tokens.typography.fontWeight.bold,
      lineHeight: tokens.typography.lineHeight.tight,
    },
    2: {
      fontSize: tokens.typography.fontSize['4xl'],
      fontWeight: tokens.typography.fontWeight.bold,
      lineHeight: tokens.typography.lineHeight.tight,
    },
    3: {
      fontSize: tokens.typography.fontSize['3xl'],
      fontWeight: tokens.typography.fontWeight.semibold,
      lineHeight: tokens.typography.lineHeight.snug,
    },
    4: {
      fontSize: tokens.typography.fontSize['2xl'],
      fontWeight: tokens.typography.fontWeight.semibold,
      lineHeight: tokens.typography.lineHeight.snug,
    },
  };

  const Tag = `h${level}` as keyof JSX.IntrinsicElements;

  return (
    <Tag
      style={{
        ...styles[level],
        color: tokens.colors.text.primary,
        marginBottom: tokens.spacing[4],
      }}
    >
      {children}
    </Tag>
  );
}

// Text variants
function Text({ variant = 'body', children }) {
  const { tokens } = useTheme();

  const variants = {
    body: {
      fontSize: tokens.typography.fontSize.base,
      lineHeight: tokens.typography.lineHeight.normal,
      color: tokens.colors.text.primary,
    },
    small: {
      fontSize: tokens.typography.fontSize.sm,
      lineHeight: tokens.typography.lineHeight.normal,
      color: tokens.colors.text.secondary,
    },
    caption: {
      fontSize: tokens.typography.fontSize.xs,
      lineHeight: tokens.typography.lineHeight.normal,
      color: tokens.colors.text.secondary,
    },
  };

  return <p style={variants[variant]}>{children}</p>;
}
```

### Spacing System

```typescript
// Layout with consistent spacing
function CardLayout({ children }) {
  const { tokens } = useTheme();

  return (
    <div
      style={{
        padding: tokens.spacing[6],
        marginBottom: tokens.spacing[4],
        gap: tokens.spacing[4],
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {children}
    </div>
  );
}

// Responsive spacing
function ResponsiveContainer() {
  const { tokens } = useTheme();

  return (
    <div
      style={{
        padding: `${tokens.spacing[4]} ${tokens.spacing[6]}`,
        '@media (min-width: 768px)': {
          padding: `${tokens.spacing[6]} ${tokens.spacing[12]}`,
        },
      }}
    >
      Content
    </div>
  );
}
```

## Styling Best Practices

### Component Styling Patterns

```typescript
// 1. Co-located styles
const buttonStyles = (tokens) => ({
  base: {
    padding: `${tokens.spacing[3]} ${tokens.spacing[6]}`,
    borderRadius: tokens.borderRadius.md,
    fontSize: tokens.typography.fontSize.base,
    fontWeight: tokens.typography.fontWeight.medium,
    border: 'none',
    cursor: 'pointer',
    transition: `all ${tokens.transitions.duration.base}`,
  },
  primary: {
    backgroundColor: tokens.colors.primary[500],
    color: 'white',
  },
  secondary: {
    backgroundColor: 'transparent',
    color: tokens.colors.primary[500],
    border: `2px solid ${tokens.colors.primary[500]}`,
  },
});

function Button({ variant = 'primary', children }) {
  const { tokens } = useTheme();
  const styles = buttonStyles(tokens);

  return (
    <button style={{ ...styles.base, ...styles[variant] }}>
      {children}
    </button>
  );
}

// 2. Theme-aware utilities
function getSpacing(...values: number[]) {
  const { tokens } = useTheme();
  return values.map(v => tokens.spacing[v]).join(' ');
}

// Usage: getSpacing(4, 6) => "1rem 1.5rem"

// 3. Consistent component APIs
interface StyledProps {
  p?: number;  // padding
  m?: number;  // margin
  bg?: string; // background
  color?: string;
}

function Box({ p, m, bg, color, children, ...props }: StyledProps) {
  const { tokens } = useTheme();

  return (
    <div
      style={{
        padding: p ? tokens.spacing[p] : undefined,
        margin: m ? tokens.spacing[m] : undefined,
        backgroundColor: bg,
        color: color,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

// Usage: <Box p={4} m={2} bg={tokens.colors.background.paper}>
```

### Performance Optimization

```typescript
// Memoize theme-dependent styles
function OptimizedComponent() {
  const { tokens } = useTheme();

  const styles = useMemo(() => ({
    container: {
      padding: tokens.spacing[6],
      backgroundColor: tokens.colors.background.paper,
      borderRadius: tokens.borderRadius.lg,
    },
    title: {
      fontSize: tokens.typography.fontSize['2xl'],
      fontWeight: tokens.typography.fontWeight.bold,
      color: tokens.colors.text.primary,
    },
  }), [tokens]);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Title</h2>
    </div>
  );
}
```

### Accessibility

```typescript
// Ensure sufficient contrast
function AccessibleButton() {
  const { tokens } = useTheme();

  return (
    <button
      style={{
        backgroundColor: tokens.colors.primary[500],
        color: 'white', // Ensure 4.5:1 contrast ratio
        fontSize: tokens.typography.fontSize.base,
        padding: `${tokens.spacing[3]} ${tokens.spacing[6]}`,
      }}
    >
      Click me
    </button>
  );
}

// Focus indicators
function FocusableElement() {
  const { tokens } = useTheme();

  return (
    <button
      style={{
        outline: 'none',
      }}
      onFocus={(e) => {
        e.currentTarget.style.boxShadow = `0 0 0 3px ${tokens.colors.primary[200]}`;
      }}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      Focus me
    </button>
  );
}
```

---

## Summary

Effective theming requires:

1. **Design Tokens**: Single source of truth for design values
2. **Theme Context**: Centralized theme management
3. **CSS Variables**: Dynamic styling that responds to theme changes
4. **Dark Mode**: Automatic support with proper token usage
5. **Semantic Colors**: Use meaningful color names, not hardcoded values
6. **Typography System**: Consistent text styling
7. **Spacing Scale**: Harmonious layout spacing
8. **Best Practices**: Performance, accessibility, and maintainability

Remember: Good theming makes your extension beautiful, consistent, and maintainable.
