# MachShop Theme System

A comprehensive design system and theme management solution for the MachShop Manufacturing Execution System.

## 🎯 Overview

The MachShop theme system provides:
- **Standardized color palette** with semantic meanings
- **Dark/light mode support** with automatic switching
- **Manufacturing domain-specific colors** for equipment, work orders, and quality states
- **WCAG 2.1 AA accessibility compliance** with built-in validation
- **TypeScript integration** for type-safe color usage
- **Ant Design integration** for consistent component theming

## 📁 Project Structure

```
src/theme/
├── tokens/
│   ├── colors.ts          # Base color palette and domain colors
│   └── semantic.ts        # Semantic color mappings for light/dark themes
├── hooks/
│   └── useTheme.tsx       # React hooks for theme management
├── utils/
│   └── accessibility.ts  # WCAG compliance validation utilities
├── antd.ts               # Ant Design theme configuration
├── globalStyles.css      # CSS custom properties and utility classes
└── index.ts              # Main entry point
```

## 🚀 Quick Start

### 1. Setup Theme Provider

```tsx
// main.tsx
import { ThemeProvider } from '@/theme';

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="machshop-theme">
      <YourApp />
    </ThemeProvider>
  );
}
```

### 2. Use Theme in Components

```tsx
// Component.tsx
import { useTheme } from '@/theme';

function MyComponent() {
  const { colors, toggleTheme } = useTheme();

  return (
    <div style={{ color: colors.text.primary }}>
      <button
        onClick={toggleTheme}
        style={{ backgroundColor: colors.interactive.primaryDefault }}
      >
        Toggle Theme
      </button>
    </div>
  );
}
```

### 3. Use CSS Custom Properties

```css
/* Component.module.css */
.component {
  color: var(--text-primary);
  background-color: var(--bg-primary);
  border: 1px solid var(--border-primary);
}

.success-badge {
  color: var(--status-success);
  background-color: var(--status-success-bg);
}
```

## 🎨 Color System

### Base Colors

The theme system includes a comprehensive color palette with 10 shades for each color:

```typescript
import { baseColors } from '@/theme';

// Primary brand color
baseColors.primary[500]  // #1890ff (main)
baseColors.primary[50]   // lightest
baseColors.primary[900]  // darkest

// Status colors
baseColors.success[500]  // #52c41a
baseColors.error[500]    // #ff4d4f
baseColors.warning[500]  // #faad14
baseColors.info[500]     // #2f54eb
```

### Semantic Colors

Semantic colors provide context-aware color mappings:

```typescript
import { useTheme } from '@/theme';

function Component() {
  const { colors } = useTheme();

  return (
    <div>
      {/* Text colors */}
      <p style={{ color: colors.text.primary }}>Primary text</p>
      <p style={{ color: colors.text.secondary }}>Secondary text</p>

      {/* Status colors */}
      <span style={{ color: colors.status.success }}>Success</span>
      <span style={{ color: colors.status.error }}>Error</span>

      {/* Interactive states */}
      <button style={{
        backgroundColor: colors.interactive.primaryDefault,
        ':hover': { backgroundColor: colors.interactive.primaryHover }
      }}>
        Primary Action
      </button>
    </div>
  );
}
```

### Manufacturing Domain Colors

Specialized color utilities for manufacturing contexts:

```typescript
import { useManufacturingColors } from '@/theme';

function EquipmentStatus({ status }) {
  const { getEquipmentStatusColor } = useManufacturingColors();
  const statusColor = getEquipmentStatusColor(status);

  return (
    <div style={{
      color: statusColor.color,
      backgroundColor: statusColor.background
    }}>
      Equipment Status: {status}
    </div>
  );
}
```

## 🌓 Theme Switching

### Automatic Theme Detection

The theme system automatically detects user preferences:

```typescript
import { useSystemPreferences } from '@/theme';

function ThemeSettings() {
  const { prefersDarkMode, prefersHighContrast } = useSystemPreferences();

  return (
    <div>
      <p>System prefers dark mode: {prefersDarkMode ? 'Yes' : 'No'}</p>
      <p>High contrast mode: {prefersHighContrast ? 'Yes' : 'No'}</p>
    </div>
  );
}
```

### Manual Theme Control

```typescript
import { useTheme } from '@/theme';

function ThemeSelector() {
  const { currentTheme, setTheme, toggleTheme } = useTheme();

  return (
    <div>
      <p>Current theme: {currentTheme}</p>
      <button onClick={toggleTheme}>Toggle Theme</button>
      <button onClick={() => setTheme('light')}>Light Mode</button>
      <button onClick={() => setTheme('dark')}>Dark Mode</button>
    </div>
  );
}
```

## ♿ Accessibility

### WCAG 2.1 AA Compliance

The theme system includes built-in accessibility validation:

```typescript
import { accessibility } from '@/theme/utils/accessibility';

// Check color contrast
const check = accessibility.checkAccessibility('#000000', '#ffffff');
console.log(check.wcagAA); // true
console.log(check.ratio);  // 21 (excellent contrast)

// Validate entire theme
const report = accessibility.validateThemeAccessibility('light');
console.log(report.summary.aaCompliant); // true

// Get accessible color suggestions
const suggestions = accessibility.suggestAccessibleColor('#ffffff', '#1890ff');
```

### High Contrast Support

```css
/* Automatically applied in high contrast mode */
@media (prefers-contrast: high) {
  :root {
    --border-primary: var(--color-black);
    --text-primary: var(--color-black);
  }
}
```

## 🧪 Testing

### Color Validation Script

```bash
# Run accessibility validation
npm run theme:validate

# Check specific component colors
npm run theme:check -- --component=PersonnelList
```

### Unit Tests

```typescript
import { renderWithTheme } from '@/test-utils';
import { accessibility } from '@/theme/utils/accessibility';

describe('Theme System', () => {
  it('maintains WCAG AA compliance', () => {
    const lightReport = accessibility.validateThemeAccessibility('light');
    const darkReport = accessibility.validateThemeAccessibility('dark');

    expect(lightReport.summary.aaCompliant).toBe(true);
    expect(darkReport.summary.aaCompliant).toBe(true);
  });

  it('renders components with correct theme colors', () => {
    const { getByTestId } = renderWithTheme(<MyComponent />, { theme: 'dark' });
    // Assert theme-specific styles
  });
});
```

## 📋 Migration Guide

### From Hardcoded Colors

**Before:**
```tsx
<div style={{ color: '#666', backgroundColor: '#1890ff' }}>
  Content
</div>
```

**After:**
```tsx
import { useTheme } from '@/theme';

function Component() {
  const { colors } = useTheme();

  return (
    <div style={{
      color: colors.text.secondary,
      backgroundColor: colors.interactive.primaryDefault
    }}>
      Content
    </div>
  );
}
```

### Using CSS Variables

**Before:**
```css
.button {
  background-color: #1890ff;
  color: white;
}
```

**After:**
```css
.button {
  background-color: var(--interactive-primary-default);
  color: var(--text-inverse);
}
```

## 🔧 Configuration

### Custom Theme Colors

```typescript
// theme/custom.ts
import { createTheme } from '@/theme';

export const customTheme = createTheme({
  primary: '#ff6b35',    // Orange primary
  success: '#4caf50',    // Custom green
  // ... other overrides
});
```

### Manufacturing Specific Setup

```typescript
// For manufacturing-specific color contexts
import { manufacturingSemantics } from '@/theme';

const equipmentColors = manufacturingSemantics.equipment;
// equipmentColors.operational, equipmentColors.critical, etc.
```

## 📊 Performance

- **CSS Custom Properties**: Native browser support with fallbacks
- **Theme Switching**: Instant with CSS variable updates
- **Bundle Size**: ~12KB gzipped for complete theme system
- **Runtime Performance**: Minimal overhead with React context

## 🐛 Troubleshooting

### Common Issues

1. **Colors not updating on theme switch**
   - Ensure components use theme hooks or CSS variables
   - Check that ThemeProvider wraps your app

2. **TypeScript errors with color properties**
   - Import types: `import type { SemanticColors } from '@/theme'`
   - Use theme utilities: `getSemanticColor('text.primary')`

3. **Accessibility warnings**
   - Run validation: `accessibility.validateThemeAccessibility('light')`
   - Check contrast ratios with dev tools

### Debug Mode

```typescript
// Enable theme debugging
localStorage.setItem('theme-debug', 'true');

// View current theme state
console.log(window.__THEME_DEBUG__);
```

## 📚 API Reference

### useTheme Hook

```typescript
interface ThemeContextType {
  currentTheme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  colors: SemanticColors;
  getSemanticColor: (path: string) => string;
  getBaseColor: (category: string, shade?: string) => string;
  getEquipmentStatusColor: (status: string) => { color: string; background: string };
  // ... more utilities
}
```

### CSS Variables

All CSS variables follow the naming convention: `--{category}-{property}-{modifier}`

Examples:
- `--text-primary`
- `--bg-secondary`
- `--interactive-primary-hover`
- `--status-success-bg`
- `--equipment-running`

## 🤝 Contributing

1. **Adding New Colors**: Update base color tokens in `tokens/colors.ts`
2. **Semantic Mappings**: Add context-aware mappings in `tokens/semantic.ts`
3. **Manufacturing Colors**: Extend domain colors for new equipment/workflow states
4. **Accessibility**: Ensure all new colors meet WCAG 2.1 AA standards

### Development Workflow

```bash
# Start development
npm run dev

# Run accessibility checks
npm run theme:validate

# Build and test
npm run build
npm run test

# Commit changes
git commit -m "feat: add new equipment status colors"
```

---

## 📈 Migration Status

✅ **Phase 1 Complete**: Foundation & Infrastructure
- [x] Base color token system
- [x] Semantic color mappings
- [x] Ant Design integration
- [x] CSS custom properties
- [x] React hooks & context
- [x] Accessibility validation

🔄 **Phase 2 In Progress**: Component Migration
- [x] Main app integration
- [x] PersonnelList component (example)
- [ ] Layout components
- [ ] Critical manufacturing components
- [ ] ... (see THEME_MIGRATION_PLAN.md)

For detailed migration progress, see [THEME_MIGRATION_PLAN.md](./THEME_MIGRATION_PLAN.md)