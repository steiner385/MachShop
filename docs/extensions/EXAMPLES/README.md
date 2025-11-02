# MachShop Extension Examples

This directory contains production-ready code examples demonstrating best practices for MachShop extension development. Each example is fully functional and can be used as a reference or starting point for your own extensions.

## 📚 Available Examples

### 1. BasicWidget.tsx
**A simple dashboard widget with core functionality**

Demonstrates:
- ✅ Proper TypeScript typing
- ✅ Permission checking with `usePermissions` hook
- ✅ Theme token usage for consistent styling
- ✅ Loading, error, and empty states
- ✅ CSS Module styling
- ✅ Auto-refresh functionality

**Use when:** Creating simple dashboard widgets that display metrics or status information.

**Key Concepts:**
```typescript
const { hasPermission } = usePermissions();
const { theme } = useTheme();
```

---

### 2. PermissionAwareComponent.tsx
**Component with comprehensive permission handling**

Demonstrates:
- ✅ Permission checking (read, write, delete)
- ✅ Graceful degradation when permissions are missing
- ✅ Role-based feature gating
- ✅ Conditional rendering based on permissions
- ✅ Multiple permission levels
- ✅ User feedback for denied access

**Use when:** Building components that need fine-grained access control.

**Key Concepts:**
```typescript
const { hasPermission, hasAllPermissions, hasAnyPermission } = usePermissions();
const canEdit = hasPermission('resource:write');
```

---

### 3. DarkModeAwareComponent.tsx
**Theme-aware component with dark mode support**

Demonstrates:
- ✅ Theme token access via `useTheme` hook
- ✅ Dark/light mode handling
- ✅ CSS variable usage
- ✅ Dynamic theme switching
- ✅ Theme color palette display
- ✅ Responsive theme adaptation

**Use when:** Creating components that must work in both light and dark themes.

**Key Concepts:**
```typescript
const { theme, isDark, toggleTheme } = useTheme();
// Use theme.tokens.colorPrimary instead of hard-coded colors
```

---

### 4. FormWithValidation.tsx
**Complete form with comprehensive validation**

Demonstrates:
- ✅ Ant Design Form component
- ✅ Synchronous field validation
- ✅ Asynchronous validation (API calls)
- ✅ Custom validation rules
- ✅ Error handling and display
- ✅ Form state management
- ✅ Accessibility features

**Use when:** Building forms with complex validation requirements.

**Key Concepts:**
```typescript
const validateEmail = async (_, value) => {
  // Custom async validation
};

<Form.Item rules={[{ validator: validateEmail }]}>
```

---

### 5. DataTableWithFiltering.tsx
**Advanced data table with full feature set**

Demonstrates:
- ✅ Ant Design Table component
- ✅ Sorting and filtering
- ✅ Pagination (client and server-side)
- ✅ Bulk actions and row selection
- ✅ Empty states
- ✅ Custom column rendering
- ✅ Search functionality
- ✅ Responsive design

**Use when:** Displaying and managing tabular data with user interactions.

**Key Concepts:**
```typescript
const columns: ColumnsType<DataRecord> = [
  {
    title: 'Name',
    dataIndex: 'name',
    sorter: true,
    filters: [...],
  }
];
```

---

### 6. CustomChart.tsx
**Data visualization with theme integration**

Demonstrates:
- ✅ Chart component structure
- ✅ Theme color usage for charts
- ✅ Responsive design
- ✅ Error handling
- ✅ Loading and empty states
- ✅ Multiple chart types
- ✅ Integration pattern for charting libraries

**Use when:** Creating data visualizations (line charts, bar charts, etc.).

**Key Concepts:**
```typescript
const chartColors = {
  primary: theme.tokens.colorPrimary,
  success: theme.tokens.colorSuccess,
  // Use theme colors for chart elements
};
```

**Note:** Replace the placeholder rendering with your actual charting library (recharts, chart.js, etc.).

---

### 7. AccessibleForm.tsx
**WCAG 2.1 AA compliant form**

Demonstrates:
- ✅ WCAG 2.1 AA compliance
- ✅ Proper ARIA labels and attributes
- ✅ Keyboard navigation support
- ✅ Screen reader support
- ✅ Focus management
- ✅ Error announcements
- ✅ Accessible validation

**Use when:** Building forms that must meet accessibility standards.

**Key Concepts:**
```typescript
<Input
  id="email"
  aria-label="Email address"
  aria-required="true"
  aria-describedby="email-help"
/>
<div id="email-help" className="sr-only">
  Help text for screen readers
</div>
```

---

### 8. ErrorBoundaryExample.tsx
**Error handling with error boundaries**

Demonstrates:
- ✅ Error boundary component implementation
- ✅ Fallback UI for error states
- ✅ Error logging and reporting
- ✅ User feedback mechanisms
- ✅ Recovery options
- ✅ Component stack traces

**Use when:** Wrapping components to gracefully handle errors without crashing the app.

**Key Concepts:**
```typescript
<ErrorBoundary
  onError={handleError}
  showErrorDetails={isDevelopment}
  enableReporting={true}
>
  <YourComponent />
</ErrorBoundary>
```

---

### 9. CustomHook.tsx
**Reusable React hooks collection**

Demonstrates:
- ✅ Custom hook creation patterns
- ✅ Data fetching with caching (`useDataFetcher`)
- ✅ Pagination management (`usePagination`)
- ✅ Debouncing (`useDebounce`)
- ✅ Local storage sync (`useLocalStorage`)
- ✅ Interval management (`useInterval`)
- ✅ Boolean toggle (`useToggle`)
- ✅ Window size tracking (`useWindowSize`)
- ✅ Click outside detection (`useOnClickOutside`)

**Use when:** Creating reusable logic that can be shared across components.

**Key Concepts:**
```typescript
const { data, loading, error, refetch } = useDataFetcher('/api/endpoint');
const debouncedValue = useDebounce(searchTerm, 500);
const { currentPage, nextPage, prevPage } = usePagination(totalItems);
```

---

### 10. NavigationMenuItem.tsx
**Menu item registration and navigation**

Demonstrates:
- ✅ Menu item declaration
- ✅ Permission-based menu visibility
- ✅ Icon usage in navigation
- ✅ Nested menu structure
- ✅ Active state handling
- ✅ Badge support
- ✅ Route integration

**Use when:** Adding navigation items to the MachShop menu system.

**Key Concepts:**
```typescript
const menuItems: NavigationMenuItem[] = [
  {
    id: 'my-menu',
    label: 'My Menu',
    path: '/my-path',
    icon: 'DashboardOutlined',
    permissions: ['menu:read'],
    children: [...]
  }
];
```

---

## 🎯 Quick Start

1. **Browse the examples** to find one that matches your use case
2. **Copy the component** to your extension project
3. **Update the TODO comments** with your implementation
4. **Customize** the styling and functionality
5. **Test thoroughly** before deploying

## 📖 Usage Patterns

### Importing Examples

```typescript
// Copy the file to your project and import
import { BasicWidget } from './components/BasicWidget';

// Use in your component
function Dashboard() {
  return (
    <BasicWidget
      title="Production Status"
      refreshInterval={30000}
    />
  );
}
```

### Combining Examples

Many examples work well together:

```typescript
import { ErrorBoundary } from './ErrorBoundaryExample';
import { DataTableWithFiltering } from './DataTableWithFiltering';
import { useDataFetcher } from './CustomHook';

function ProductList() {
  const { data, loading, error } = useDataFetcher('/api/products');

  return (
    <ErrorBoundary>
      <DataTableWithFiltering
        dataSource={data}
        loading={loading}
      />
    </ErrorBoundary>
  );
}
```

## 🔑 Key Principles

All examples follow these principles:

1. **Type Safety**: Full TypeScript typing with no `any` types
2. **Accessibility**: WCAG 2.1 AA compliance where applicable
3. **Theme Aware**: Use theme tokens, never hard-coded colors
4. **Permission Aware**: Check permissions before rendering
5. **Error Handling**: Graceful error states with user feedback
6. **Loading States**: Clear loading indicators
7. **Responsive**: Work on mobile, tablet, and desktop
8. **Documented**: Comprehensive comments and JSDoc

## 🛠️ Customization Guide

### Modifying Examples

1. **Update Interfaces**: Change props and data types to match your needs
2. **Adjust Permissions**: Update permission strings to match your extension
3. **Customize Styling**: Modify CSS modules while keeping theme tokens
4. **Add Features**: Extend functionality as needed
5. **Update Tests**: Add tests for your customizations

### Common Modifications

#### Change API Endpoint
```typescript
// Before
const response = await fetch('/api/widgets/data');

// After
const response = await fetch('/api/my-extension/my-data');
```

#### Update Permissions
```typescript
// Before
const canView = hasPermission('dashboard:read');

// After
const canView = hasPermission('my-extension:read');
```

#### Customize Theme Colors
```typescript
// Use different theme token
// Before: theme.tokens.colorPrimary
// After: theme.tokens.colorSuccess (or any other token)
```

## 📚 Additional Resources

- **[UI Standards Guide](../UI_STANDARDS_GUIDE.md)**: Complete design system documentation
- **[Component Development Guide](../COMPONENT_DEVELOPMENT.md)**: Best practices
- **[Testing Guide](../TESTING_GUIDE.md)**: How to test your components
- **[Accessibility Guide](../ACCESSIBILITY_GUIDE.md)**: Accessibility requirements
- **[Permission Guide](../PERMISSION_GUIDE.md)**: RBAC integration
- **[Theme Guide](../THEME_GUIDE.md)**: Theme system documentation

## 🤝 Contributing

Found an issue or have a suggestion?
- Open an issue in the repository
- Submit a pull request with improvements
- Share your own examples

## 📄 License

These examples are provided as-is for use in MachShop extensions.
Follow the same license as your extension project.

---

**Need Help?**
- Check the [FAQ](../FAQ.md)
- Review [Troubleshooting Guide](../TROUBLESHOOTING.md)
- Contact support

**Happy coding! 🚀**
