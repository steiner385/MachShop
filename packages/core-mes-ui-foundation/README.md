# Core MES UI Foundation

**Version**: 2.0.0
**Tier**: core-foundation (mandatory, pre-activated, cannot be disabled)
**Status**: Essential for operation

The Core MES UI Foundation is a mandatory, pre-activated extension that provides all essential Manufacturing Execution System (MES) user interface capabilities for MachShop. This package serves as the baseline for every MachShop deployment and defines the standard for UI consistency across all sites.

## Overview

### What is Included

This extension packages the complete core MES UI into a composable extension with:

#### Core UI Domains
- **Work Order Management** - Create, execute, and track manufacturing work orders
- **Quality Management** - Inspections, NCRs, CAPA, FAI, traceability
- **Materials Management** - Inventory, kits, staging
- **Equipment Management** - Status, maintenance scheduling, SPC
- **Production Scheduling** - Capacity planning, schedule management
- **Routing Management** - Process routing with visual editor
- **Work Instructions** - Authoring and shop floor execution
- **Personnel Management** - Staff assignments, time tracking
- **Admin Functions** - RBAC, plugin management, configuration
- **Analytics & Reporting** - KPI dashboards and reporting

#### Shared Infrastructure
- **Main Layout Component** - Header, sidebar, breadcrumbs
- **Navigation System** - Menu groups and permission-aware menu items
- **Theme System** - Design tokens with light/dark mode support
- **RBAC Integration** - Permission checking and role-based rendering
- **Accessibility** - WCAG 2.1 AA compliance throughout
- **Real-time Collaboration** - Comments, activity feeds, conflict resolution

### Key Features

- ✅ **100% Ant Design** - All components use Ant Design v5.12.8
- ✅ **Theme Tokens** - No hard-coded colors, design tokens only
- ✅ **WCAG 2.1 AA** - Accessibility compliance enforced
- ✅ **Permission-Aware** - RBAC integrated automatically
- ✅ **Multi-Site** - Site-scoped data isolation
- ✅ **Type-Safe** - Full TypeScript with strict mode
- ✅ **Component Contracts** - Defines interfaces for extensions
- ✅ **Slot-Based** - Extensibility through predefined slots

## Component Contracts

This package defines component contracts that ensure extensions can safely integrate without breaking core functionality:

### Available Contracts

1. **Main Layout Contract** - Master layout (cannot be overridden)
2. **Dashboard Widget Contract** - Widgets for dashboard
3. **Dashboard Chart Contract** - Charts and visualizations
4. **Work Order Form Contract** - Work order creation/editing
5. **Quality Inspection Form Contract** - Quality inspection forms
6. **Work Instructions Viewer Contract** - Instruction display and execution
7. **Quality Dashboard Contract** - Quality metrics dashboard
8. **Equipment Status Contract** - Equipment status widgets
9. **Admin Settings Section Contract** - Admin configuration sections
10. **Data Table Contract** - Reusable data table component

### Using Contracts

```typescript
import { contractMap } from '@machshop/core-mes-ui-foundation';

// Get a contract by ID
const workOrderContract = contractMap['work-order-form'];

// Validate your extension implements the contract
if (isUIComponentContract(workOrderContract)) {
  // Your component is contract-compliant
}
```

## Navigation Structure

The Core MES UI Foundation defines the standard navigation structure with pre-approved menu groups:

### Menu Groups

- **PRODUCTION** - Work Orders, Scheduling, Routing, Operations
- **QUALITY** - Inspections, NCRs, Corrective Actions, FAI, Traceability, Analytics
- **MATERIALS** - Inventory, Kits & Staging
- **EQUIPMENT** - Equipment, Maintenance
- **PERSONNEL** - Personnel, Time Tracking
- **ADMIN** - RBAC, Plugins, Configuration (System Administrators only)
- **REPORTS** - Reporting and Analytics

Extensions can add menu items to existing groups without approval. New menu groups require foundation-tier governance approval.

## Dashboard Widgets

The dashboard supports extending with widgets via predefined slots:

- `dashboard-widgets` - KPI cards and summary widgets
- `dashboard-charts` - Charts and data visualizations
- `dashboard-kpi-cards` - KPI card displays

Example:

```typescript
import { UISlot } from '@machshop/ui-extension-contracts';
import { registerWidget } from '@machshop/frontend-extension-sdk';

registerWidget({
  id: 'my-extension:custom-kpi',
  extensionId: 'my-extension',
  slot: UISlot.DASHBOARD_WIDGETS,
  component: MyKPIWidget,
  order: 100,
  requiredPermission: 'analytics:view'
});
```

## Theme System

The Core MES UI Foundation provides a comprehensive theme system:

### Design Tokens

- **Colors**: Primary, Success, Error, Warning, Info, manufacturing domain colors
- **Typography**: Font sizes, weights, line heights
- **Spacing**: Margins, paddings, gaps
- **Shadows**: Elevation levels
- **Accessibility**: High contrast colors, WCAG AA compliant

### Using Theme

```typescript
import { useTheme } from '@machshop/frontend-extension-sdk';

export function MyComponent() {
  const theme = useTheme();

  return (
    <div style={{ color: theme.tokens.colorPrimary }}>
      Content using theme colors
    </div>
  );
}
```

## RBAC & Permissions

All components are permission-aware and integrate with MachShop's role-based access control:

### Standard Permissions

```
workorders:read, workorders:write, workorders:execute
quality:read, quality:write, quality:approve
materials:read, materials:write
equipment:read, equipment:write
scheduling:read, scheduling:write
personnel:read, personnel:write
routing:read, routing:write
work-instructions:read, work-instructions:write, work-instructions:execute
admin:manage-rbac, admin:manage-plugins, admin:manage-config
analytics:read
```

### Permission Checking

```typescript
import { usePermission } from '@machshop/frontend-extension-sdk';

export function AdminPanel() {
  const { hasPermission } = usePermission();

  if (!hasPermission('admin:manage-rbac')) {
    return <div>Access Denied</div>;
  }

  return <RBACConfiguration />;
}
```

## Accessibility

The Core MES UI Foundation is WCAG 2.1 AA compliant:

- ✅ Keyboard navigation throughout
- ✅ Screen reader support
- ✅ High contrast color options
- ✅ Focus indicators visible
- ✅ Semantic HTML structure
- ✅ ARIA labels where appropriate

All extensions should maintain this level of accessibility. Use provided accessibility utilities to validate your extensions.

## Installation

```bash
npm install @machshop/core-mes-ui-foundation
```

## Initialization

```typescript
import {
  initializeCoreMessUIFoundation,
  coreUIContracts
} from '@machshop/core-mes-ui-foundation';

// During app startup
await initializeCoreMessUIFoundation();
```

## Integration with Extensions

Extensions can:

1. **Add widgets to slots** - Extend dashboard with custom widgets
2. **Add menu items** - Extend navigation with new menu items (existing groups only)
3. **Override components** - Override specific components (with approval and testing)
4. **Provide new capabilities** - Declare new capability providers
5. **Integrate with theme** - Use design tokens for consistent styling
6. **Check permissions** - Use RBAC to gate features

Extensions cannot:

1. ❌ Override the main layout
2. ❌ Create new navigation groups (without approval)
3. ❌ Change the core MES data model
4. ❌ Use hard-coded colors (must use theme tokens)
5. ❌ Disable core functionality
6. ❌ Create permission escalations

## Architecture

### Pages (28 categories, 86 files)

- Work Orders: Create, Edit, Details, Execute
- Quality: Inspections, NCRs, CAPA, FAI, Traceability
- Materials: Inventory, Kits, Staging
- Equipment: Status, Maintenance
- Scheduling: Production schedule, capacity planning
- Routing: Visual routing editor, routing templates
- Work Instructions: Authoring, shop floor execution
- Personnel: Staff assignments, time tracking
- Admin: RBAC, plugins, configuration
- Analytics: Quality metrics, equipment KPIs

### Shared Components (45 categories, 190 files)

- Routing editor with visual diagram
- Work instruction editor with rich text
- Annotation system for image markup
- Collaboration system with real-time updates
- Time tracking and kiosk interface
- Quality analytics dashboards
- SPC and statistical process control
- CAPA and corrective action workflow
- Electronic signatures and audit trails

### Stores (13+ Zustand stores)

- AuthStore - User authentication and permissions
- EquipmentStore - Equipment inventory and status
- MaterialsStore - Materials and inventory
- SchedulingStore - Production scheduling
- RoutingStore - Process routing data
- OperationStore - Manufacturing operations
- WorkInstructionStore - Work instruction data
- SettingsStore - User preferences
- FAIStore - First Article Inspection
- KitStore - Kit management
- SignatureStore - Electronic signature state
- AndonStore - Andon alert system
- ExecutionLayoutStore - Configurable layouts

### Theme System

- Color tokens (base, domain-specific, semantic)
- Typography scales (10+ sizes with responsive variants)
- Spacing and layout tokens
- Accessibility utilities
- Light/dark mode support
- CSS custom properties for runtime switching

## Best Practices

### For Extension Developers

1. **Use Ant Design components** - Never create custom components
2. **Use design tokens** - No hard-coded colors
3. **Check permissions** - Always gate sensitive features
4. **Respect contracts** - Implement component interfaces
5. **Test accessibility** - Validate WCAG 2.1 AA compliance
6. **Support dark mode** - Components should work with theme switching

### For MachShop Implementers

1. **Do not modify** - Core MES UI Foundation cannot be disabled
2. **Do not fork** - Extend through the extension system instead
3. **Do extend** - Add capabilities through extensions
4. **Do customize** - Use theme tokens to brand the system
5. **Do integrate** - Connect other systems through extensions

## Component Export Pattern

All pages and components follow a consistent export pattern:

```typescript
// Page export
export { WorkOrdersPage } from './pages/WorkOrders';

// Component export
export { WorkOrderForm } from './components/WorkOrder/WorkOrderForm';

// Hook export
export { useWorkOrders } from './hooks/useWorkOrders';

// Store export
export { useWorkOrderStore } from './stores/WorkOrderStore';
```

## Dependencies

### Core Dependencies

- React 18.2.0+
- React Router DOM 6.20.0+
- Ant Design 5.12.8+
- Zustand 4.4.7+

### Optional Dependencies

- Socket.io Client (for real-time features)
- Recharts (for charts)
- D3 (for advanced visualizations)
- Lexical (for rich text editing)

## Stability Guarantees

As a core-foundation extension:

- ✅ **API Stability** - Core APIs are stable and versioned
- ✅ **Component Stability** - Component interfaces don't break
- ✅ **Permission Stability** - Permission names don't change
- ✅ **Data Model Stability** - Core data structures don't change
- ✅ **Navigation Stability** - Menu groups don't change

Breaking changes follow semantic versioning and include migration guides.

## Performance

- Bundle size: ~500KB (gzipped)
- Initial load: <3 seconds (on 4G)
- Time to interactive: <5 seconds
- Lighthouse score: >90
- Accessibility score: 100

## Accessibility

- WCAG 2.1 Level AA compliance
- Keyboard navigation throughout
- Screen reader support
- High contrast mode support
- Color blind friendly
- Focus indicators visible

## Security

- Electronic signature support (FDA 21 CFR Part 11)
- Role-based access control integration
- Permission-based rendering
- CSRF protection
- XSS prevention
- Data encryption support

## Testing

Test patterns and utilities provided for:

- Unit testing components
- Integration testing pages
- Accessibility testing
- Performance benchmarking
- State management testing

## Documentation

- API documentation: `API.md`
- Architecture documentation: `ARCHITECTURE.md`
- Component guide: `COMPONENT_GUIDE.md`
- Testing guide: `TESTING_GUIDE.md`
- Changelog: `CHANGELOG.md`

## Support

- **Issue Tracker**: GitHub Issues
- **Documentation**: `/docs/core-mes-ui-foundation`
- **Examples**: `/examples/core-mes-extensions`
- **Support**: MachShop Support Portal

## License

MIT

## Contributing

Contributions are welcome! See `CONTRIBUTING.md` for guidelines.

## Roadmap

### Version 2.1 (Q1 2026)

- Enhanced analytics dashboard
- Advanced SPC charting
- Batch reporting improvements
- Performance optimizations

### Version 2.2 (Q2 2026)

- Mobile-first responsive improvements
- Offline-first capabilities
- Real-time collaboration enhancements
- Accessibility improvements

## Related Packages

- `@machshop/ui-extension-contracts` - Component contracts and registry
- `@machshop/frontend-extension-sdk` - SDK for extension developers
- `@machshop/extension-sdk` - Backend extension framework
- `@machshop/configuration-validator` - Configuration validation service

---

**Note**: This is the foundation of all MachShop UI. All customization should be done through the extension system to ensure consistency and maintainability across deployments.
