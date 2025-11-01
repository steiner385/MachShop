# UI Extension Contracts

Type-safe contracts and registries for managing UI extensions in the MachShop composable extension architecture.

## Overview

This package provides the core infrastructure for UI extension management:

- **Component Contracts**: Define what extensions can do and how they must behave
- **Widget Registry**: Manage dynamic component loading into predefined slots
- **Navigation Registry**: Manage menu items and navigation structure
- **Type Safety**: Full TypeScript support with comprehensive type guards
- **Validation**: Built-in validation for contracts, widgets, and navigation items

## Core Concepts

### UI Slots

Predefined extension points where widgets can be injected:

- **Dashboard**: `DASHBOARD_WIDGETS`, `DASHBOARD_CHARTS`, `DASHBOARD_KPI_CARDS`
- **Forms**: `FORM_FIELDS`, `FORM_SECTIONS`, `FORM_ACTIONS`
- **Tables**: `TABLE_ACTIONS`, `TABLE_COLUMNS`, `TABLE_BULK_ACTIONS`, `TABLE_ROW_EXPANSION`
- **Reports**: `REPORT_SECTIONS`, `REPORT_FILTERS`, `REPORT_EXPORTS`
- **Navigation**: `NAVIGATION_MENU_ITEMS`, `NAVIGATION_BREADCRUMBS`
- **Pages**: `PAGE_HEADER_ACTIONS`, `PAGE_FOOTER_ACTIONS`, `PAGE_SIDEBARS`
- **Admin**: `ADMIN_SETTINGS_SECTIONS`, `ADMIN_CONFIGURATION_FORMS`
- **Custom**: `CUSTOM` (for extension-specific slots)

### Component Types

Categorization for UI components:

- `WIDGET` - Self-contained widget component
- `FORM_FIELD` - Custom form field
- `FORM_SECTION` - Form section grouping
- `TABLE` - Table component
- `CHART` - Chart/visualization
- `DASHBOARD` - Dashboard page
- `PAGE` - Full page component
- `LAYOUT` - Layout component
- `NAVIGATION` - Navigation component
- `ACTION` - Action button/command
- `FILTER` - Filter component
- `EXPORT` - Export component
- `REPORT` - Report component
- `CUSTOM` - Custom type

### Accessibility Levels

Minimum accessibility compliance required:

- `WCAG_A` - Level A compliance
- `WCAG_AA` - Level AA compliance (recommended minimum)
- `WCAG_AAA` - Level AAA compliance (enhanced)

## Usage

### Creating a Registry

```typescript
import { getUIExtensionRegistry } from '@machshop/ui-extension-contracts';

// Get global singleton registry
const registry = getUIExtensionRegistry();

// Get individual registries
const contractRegistry = registry.getContractRegistry();
const widgetRegistry = registry.getWidgetRegistry();
const navigationRegistry = registry.getNavigationRegistry();
```

### Registering a Widget

```typescript
import { UISlot, type RegisteredWidget } from '@machshop/ui-extension-contracts';
import MyDashboardWidget from './MyDashboardWidget';

const widget: RegisteredWidget = {
  id: 'my-extension:dashboard-widget',
  extensionId: 'my-extension',
  slot: UISlot.DASHBOARD_WIDGETS,
  component: MyDashboardWidget,
  order: 10,
  requiredPermission: 'dashboard:view',
  registeredAt: new Date(),
  implementsContract: 'dashboard-widget-contract',
  contractVersion: '1.0.0'
};

widgetRegistry.registerWidget(widget);
```

### Getting Widgets for a Slot

```typescript
// Get all widgets for a slot
const widgets = widgetRegistry.getWidgetsForSlot(
  UISlot.DASHBOARD_WIDGETS,
  currentSiteId
);

// Widgets are sorted by order
widgets.forEach(widget => {
  if (!widget.requiredPermission || userHasPermission(widget.requiredPermission)) {
    renderWidget(widget);
  }
});
```

### Registering a Component Contract

```typescript
import {
  UIComponentContract,
  ComponentType,
  UISlot,
  AccessibilityLevel
} from '@machshop/ui-extension-contracts';

const contract: UIComponentContract = {
  id: 'dashboard-widget-contract',
  name: 'Dashboard Widget',
  description: 'A widget that can be placed on the dashboard',
  type: ComponentType.WIDGET,
  version: '1.0.0',
  supportedSlots: [UISlot.DASHBOARD_WIDGETS],
  minimumAccessibilityLevel: AccessibilityLevel.WCAG_AA,
  requiredComponents: ['Button', 'Card'],
  forbiddenComponents: ['Drawer'], // Don't use Drawer in dashboard widgets
  slotDataSchema: {
    [UISlot.DASHBOARD_WIDGETS]: {
      slot: UISlot.DASHBOARD_WIDGETS,
      schema: {
        type: 'object',
        properties: {
          siteId: { type: 'string' },
          userPermissions: { type: 'array', items: { type: 'string' } },
          theme: { type: 'object' }
        }
      },
      example: {
        siteId: 'site-123',
        userPermissions: ['dashboard:view'],
        theme: { mode: 'light' }
      },
      requiredFields: ['siteId']
    }
  }
};

contractRegistry.registerContract(contract);
```

### Registering a Menu Item

```typescript
import { type NavigationMenuItemContract } from '@machshop/ui-extension-contracts';

const menuItem: NavigationMenuItemContract = {
  id: 'my-extension:analytics-menu',
  label: 'Analytics',
  icon: 'BarChartOutlined',
  path: '/analytics',
  parentGroup: 'REPORTS',
  order: 1,
  requiredPermission: 'analytics:view'
};

navigationRegistry.registerMenuItem(menuItem);
```

### Querying the Registry

```typescript
// Get all contracts
const allContracts = contractRegistry.getAllContracts();

// Get contract by ID
const contract = contractRegistry.getContract('dashboard-widget-contract');

// Get contracts for a slot
const slotContracts = contractRegistry.getContractsForSlot(UISlot.DASHBOARD_WIDGETS);

// Get menu items for a group
const adminItems = navigationRegistry.getMenuItemsForGroup('ADMIN');

// Get all navigation groups
const groups = navigationRegistry.getNavigationGroups();

// Get registry statistics
const stats = registry.getStatistics();
console.log(`Total contracts: ${stats.totalContracts}`);
console.log(`Total widgets: ${stats.totalWidgets}`);
console.log(`Slots with widgets: ${stats.slotsWithWidgets}`);
```

## Type Guards

Runtime validation functions:

```typescript
import {
  isUIComponentContract,
  isRegisteredWidget,
  isNavigationMenuItemContract,
  isFormFieldContract,
  isComponentValidationReport
} from '@machshop/ui-extension-contracts';

if (isUIComponentContract(obj)) {
  // obj is UIComponentContract
}

if (isRegisteredWidget(obj)) {
  // obj is RegisteredWidget
}
```

## Integration with Extension SDK

This package is the foundation for the `@machshop/frontend-extension-sdk`:

```typescript
import { useExtensionSDK } from '@machshop/frontend-extension-sdk';

const MyExtension = () => {
  const sdk = useExtensionSDK();

  // Register widget
  sdk.registerWidget(widget);

  // Get widgets for slot
  const widgets = sdk.getWidgetsForSlot(UISlot.DASHBOARD_WIDGETS);

  // Register menu item
  sdk.registerMenuItem(menuItem);
};
```

## Testing

```typescript
import { resetUIExtensionRegistry } from '@machshop/ui-extension-contracts';

describe('My Extension', () => {
  beforeEach(() => {
    // Clear registry before each test
    resetUIExtensionRegistry();
  });

  it('should register widget correctly', () => {
    const registry = getUIExtensionRegistry();
    registry.getWidgetRegistry().registerWidget(widget);

    const registered = registry.getWidgetRegistry().getWidget('my-extension:widget');
    expect(registered).toBeDefined();
  });
});
```

## Architecture

```
UIExtensionRegistry (Master)
├── ContractRegistry
│   ├── registerContract()
│   ├── getContract()
│   ├── getContractsForSlot()
│   └── getAllContracts()
├── WidgetRegistry
│   ├── registerWidget()
│   ├── getWidgetsForSlot()
│   ├── getWidget()
│   ├── unregisterWidget()
│   └── getValidationReport()
└── NavigationRegistry
    ├── registerMenuItem()
    ├── getMenuItemsForGroup()
    ├── getMenuItem()
    ├── getNavigationGroups()
    └── unregisterMenuItem()
```

## Best Practices

1. **Always validate before registering**: Use type guards and validation functions
2. **Use IDs consistently**: `extensionId:componentId` pattern
3. **Set proper ordering**: Use `order` field for widget ordering
4. **Require permissions**: Set `requiredPermission` for permission-aware rendering
5. **Define contracts**: Document component interfaces with contracts
6. **Test thoroughly**: Test widget registration and retrieval
7. **Handle errors**: Catch RegistryError exceptions

## Error Handling

```typescript
import { RegistryError } from '@machshop/ui-extension-contracts';

try {
  widgetRegistry.registerWidget(widget);
} catch (error) {
  if (error instanceof RegistryError) {
    console.error(`Registry error [${error.code}]: ${error.message}`);
    console.error('Details:', error.details);
  }
}
```

## Contributing

When adding new contract types or registry functionality:

1. Update the types in `src/types.ts`
2. Add corresponding registry methods in `src/registry.ts`
3. Create type guards for new types
4. Update documentation
5. Add tests
6. Update version number

## Related Packages

- `@machshop/frontend-extension-sdk` - High-level SDK for extension developers
- `@machshop/extension-sdk` - Backend extension framework
- `@machshop/configuration-validator` - Configuration validation service

## License

MIT
