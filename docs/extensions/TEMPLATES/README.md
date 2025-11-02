# MachShop Extension Templates

This directory contains starter templates for quickly creating new MachShop extension components. These templates provide the basic structure and boilerplate code, with TODO comments marking areas you need to customize.

## 🚀 Quick Start Templates

### Component Templates

#### 1. WidgetTemplate.tsx
**Basic widget scaffold**

Use for: Dashboard widgets, metric displays, status indicators

Features:
- Permission checking
- Loading/error/empty states
- Auto-refresh capability
- Theme integration
- CSS Module styling

**Quick Start:**
```bash
# Copy template to your project
cp WidgetTemplate.tsx src/components/MyWidget.tsx
cp WidgetTemplate.module.css src/components/MyWidget.module.css

# Search for TODO and replace with your implementation
```

---

#### 2. FormComponentTemplate.tsx
**Form component scaffold**

Use for: Data entry forms, settings forms, dialog forms

Features:
- Form validation
- Submit/cancel handling
- Error display
- Read-only mode support
- Loading states

**Quick Start:**
```bash
cp FormComponentTemplate.tsx src/components/MyForm.tsx
cp FormComponentTemplate.module.css src/components/MyForm.module.css
```

---

#### 3. DashboardWidgetTemplate.tsx
**Dashboard widget scaffold**

Use for: Dashboard metrics, KPI displays, status widgets

Features:
- Statistic display
- Trend indicators
- Auto-refresh
- Permission checking
- Compact layout

**Quick Start:**
```bash
cp DashboardWidgetTemplate.tsx src/components/MyDashboardWidget.tsx
cp DashboardWidgetTemplate.module.css src/components/MyDashboardWidget.module.css
```

---

#### 4. PageLayoutTemplate.tsx
**Full page layout scaffold**

Use for: Full-page views, list pages, detail pages

Features:
- Breadcrumb navigation
- Page header with actions
- Content area
- Permission checking
- Responsive layout

**Quick Start:**
```bash
cp PageLayoutTemplate.tsx src/pages/MyPage.tsx
cp PageLayoutTemplate.module.css src/pages/MyPage.module.css
```

---

#### 5. CustomFieldTemplate.tsx
**Custom form field scaffold**

Use for: Specialized input fields, composite fields, custom controls

Features:
- Value/onChange pattern (Ant Design compatible)
- Add/remove items
- Tag-based UI example
- Disabled state support

**Quick Start:**
```bash
cp CustomFieldTemplate.tsx src/components/fields/MyField.tsx
cp CustomFieldTemplate.module.css src/components/fields/MyField.module.css
```

---

#### 6. DataTableTemplate.tsx
**Data table scaffold**

Use for: List views, data grids, searchable tables

Features:
- Column definitions
- Sorting and filtering
- Search functionality
- Action buttons
- Pagination

**Quick Start:**
```bash
cp DataTableTemplate.tsx src/components/MyTable.tsx
cp DataTableTemplate.module.css src/components/MyTable.module.css
```

---

### Configuration Templates

#### 7. extension-manifest.json
**Extension manifest template**

The manifest file defines your extension's:
- Metadata (name, version, author)
- Permissions required
- Widgets and pages
- Navigation items
- API endpoints
- Database schema
- Settings schema
- Hooks and lifecycle methods

**Quick Start:**
```bash
cp extension-manifest.json ./extension-manifest.json
# Update all fields with your extension details
```

**Key Sections to Update:**
- `name`: Your extension identifier (kebab-case)
- `displayName`: User-facing name
- `permissions`: Define required permissions
- `widgets`: Register dashboard widgets
- `pages`: Register full pages
- `navigation`: Add menu items
- `settings.schema`: Define user-configurable settings

---

#### 8. tsconfig.json
**TypeScript configuration**

Pre-configured with:
- Strict type checking
- Path aliases (@/ imports)
- React JSX support
- Modern ES2020 target
- Source maps for debugging

**Quick Start:**
```bash
cp tsconfig.json ./tsconfig.json
# Customize paths and compiler options as needed
```

---

#### 9. jest.config.js
**Jest test configuration**

Pre-configured with:
- TypeScript support via ts-jest
- React Testing Library setup
- Module path aliases
- CSS/image mocks
- Coverage thresholds (70%)
- Watch plugins

**Quick Start:**
```bash
cp jest.config.js ./jest.config.js
# Create setup file: src/tests/setup.ts
```

---

#### 10. README.md
**Extension README template**

Complete documentation template with sections for:
- Overview and features
- Installation instructions
- Configuration guide
- Usage examples
- API reference
- Development setup
- Troubleshooting
- Contributing guidelines

**Quick Start:**
```bash
cp README.md ./README.md
# Fill in all sections with your extension details
```

---

## 📋 Template Usage Guide

### Step 1: Choose Your Template

Select the template that best matches what you want to build:
- **Widget?** → WidgetTemplate or DashboardWidgetTemplate
- **Form?** → FormComponentTemplate
- **Table?** → DataTableTemplate
- **Full Page?** → PageLayoutTemplate
- **Custom Field?** → CustomFieldTemplate

### Step 2: Copy Template

```bash
# Copy component template
cp TEMPLATES/WidgetTemplate.tsx src/components/YourComponent.tsx
cp TEMPLATES/WidgetTemplate.module.css src/components/YourComponent.module.css
```

### Step 3: Replace TODOs

Search for `TODO` comments in the copied files:

```typescript
// TODO: Define your widget props interface
// TODO: Add your form fields here
// TODO: Implement data fetching logic
```

Replace each TODO with your actual implementation.

### Step 4: Customize Styling

Update the CSS module with your custom styles:

```css
/* Keep theme token usage */
.myCustomClass {
  color: var(--color-text-base);
  padding: var(--margin-md);
}
```

### Step 5: Test

Create tests for your component:

```typescript
import { render, screen } from '@testing-library/react';
import { YourComponent } from './YourComponent';

describe('YourComponent', () => {
  it('renders correctly', () => {
    render(<YourComponent />);
    expect(screen.getByText('Your Content')).toBeInTheDocument();
  });
});
```

## 🎨 Customization Checklist

When using a template, update these items:

### Component Templates
- [ ] Component name and display name
- [ ] Props interface
- [ ] Data interfaces
- [ ] Permission strings
- [ ] API endpoints
- [ ] Error messages
- [ ] Loading messages
- [ ] Empty state messages
- [ ] Button labels
- [ ] Form field labels
- [ ] CSS class names
- [ ] Component logic

### Manifest Template
- [ ] Extension name and ID
- [ ] Display name and description
- [ ] Author information
- [ ] Version number
- [ ] Repository URL
- [ ] License
- [ ] Keywords
- [ ] Permissions list
- [ ] Widget definitions
- [ ] Page routes
- [ ] Navigation items
- [ ] API endpoints
- [ ] Settings schema

### Configuration Templates
- [ ] Package name in tsconfig paths
- [ ] Test setup file paths
- [ ] Coverage thresholds
- [ ] README sections

## 🔍 Template Comparison

| Template | Complexity | Use Case | Key Features |
|----------|-----------|----------|--------------|
| WidgetTemplate | Simple | Dashboard widgets | Auto-refresh, states |
| FormComponentTemplate | Medium | Data entry | Validation, submit |
| DashboardWidgetTemplate | Simple | Metrics display | Statistics, trends |
| PageLayoutTemplate | Medium | Full pages | Navigation, layout |
| CustomFieldTemplate | Medium | Form fields | Custom input logic |
| DataTableTemplate | Complex | Data lists | Sort, filter, pagination |

## 💡 Tips and Best Practices

### DO ✅

- Copy both `.tsx` and `.module.css` files
- Replace all TODO comments
- Keep theme token usage
- Maintain accessibility features
- Add proper TypeScript types
- Test your components
- Follow naming conventions

### DON'T ❌

- Skip permission checks
- Use hard-coded colors
- Remove accessibility attributes
- Ignore error handling
- Skip loading states
- Use `any` types
- Forget to update display names

## 🛠️ Advanced Customization

### Adding New Props

```typescript
// Add to props interface
export interface YourComponentProps {
  // Existing props...

  // New prop
  customProp?: string;
  onCustomEvent?: (data: any) => void;
}

// Use in component
export const YourComponent: React.FC<YourComponentProps> = ({
  // ...existing props
  customProp,
  onCustomEvent,
}) => {
  // Implementation
};
```

### Adding New State

```typescript
// Add state
const [customState, setCustomState] = useState<CustomType>(initialValue);

// Use in effects
useEffect(() => {
  // React to state changes
}, [customState]);
```

### Adding New Hooks

```typescript
// Import additional hooks
import { useCustomHook } from '@/hooks/useCustomHook';

// Use in component
const customData = useCustomHook();
```

## 📚 Related Resources

- **[Examples Directory](../EXAMPLES/)**: Production-ready code examples
- **[UI Standards Guide](../UI_STANDARDS_GUIDE.md)**: Design system reference
- **[Component Development](../COMPONENT_DEVELOPMENT.md)**: Best practices
- **[Testing Guide](../TESTING_GUIDE.md)**: Testing patterns
- **[API Reference](../API_REFERENCE.md)**: Platform APIs

## 🆘 Getting Help

**Template Not Working?**
1. Check that all TODO items are replaced
2. Verify imports are correct
3. Ensure dependencies are installed
4. Review console for errors

**Need a Different Template?**
1. Check the Examples directory for similar patterns
2. Combine multiple templates
3. Request a new template in GitHub issues

**Questions?**
- Check the [FAQ](../FAQ.md)
- Review [Troubleshooting Guide](../TROUBLESHOOTING.md)
- Contact support

---

**Ready to build? Pick a template and start creating! 🎉**
