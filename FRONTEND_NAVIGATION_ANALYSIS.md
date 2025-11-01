# Frontend Navigation System Architecture Analysis

## Executive Summary

The MachShop2 frontend implements a role-based, permission-based navigation system built on **React Router** with **Zustand state management** and **Ant Design UI components**. The architecture supports dynamic menu visibility based on user roles and permissions, with approval/workflow patterns integrated throughout.

---

## 1. Current Navigation Architecture Overview

### Technology Stack
- **Routing**: React Router v6
- **State Management**: Zustand (persistent store with devtools)
- **UI Components**: Ant Design (Menu, Layout, Breadcrumbs)
- **Authorization**: Custom authentication store with role/permission checks

### Core Pattern
The navigation system uses a **declarative menu configuration** pattern where menu items are defined with associated roles/permissions that determine visibility and accessibility.

---

## 2. Key Files and Their Purposes

### Primary Navigation Files

#### `/frontend/src/components/Layout/MainLayout.tsx` (571 lines)
**Purpose**: Main layout container that orchestrates the complete navigation UI

**Key Components**:
- **Fixed Sidebar (Sider)**: Dark-themed collapsible navigation panel
- **Header**: Fixed top bar with menu toggle, global search, notifications, site selector
- **Content Area**: Main content renderer with breadcrumbs

**Features**:
- Collapsible sidebar with automatic width adjustment (256px expanded, 80px collapsed)
- Dynamic menu building based on user roles/permissions
- User dropdown menu (Profile, Settings, Logout)
- Site selector for multi-site deployments
- Global search integration
- Responsive breadcrumb navigation

**Menu Structure**:
```typescript
menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
  {
    type: 'group',
    label: 'PRODUCTION',
    children: [
      { key: '/workorders', permissions: ['workorders.read'], ... },
      { key: '/operations', roles: ['Production Planner', 'Plant Manager'], ... },
      { key: '/routings', roles: [...], ... },
      { key: '/scheduling', roles: [...], ... },
    ]
  },
  // ... more groups: QUALITY, MATERIALS, PERSONNEL, EQUIPMENT & TOOLS, WORK INSTRUCTIONS, ADMINISTRATION
]
```

**Access Control Method** (lines 353-404):
```typescript
const buildMenuItems = (items: any[]) => {
  // Recursively filters menu items based on user permissions/roles
  // Uses checkAccess() function to verify authorization
}

const checkAccess = (permissions?: string[], roles?: string[]) => {
  // System admins have access to everything
  // Wildcard permission '*' grants all access
  // Checks if user has required permissions (OR logic)
  // Checks if user has required roles (OR logic)
}
```

#### `/frontend/src/components/Navigation/Breadcrumbs.tsx` (125 lines)
**Purpose**: Provides hierarchical location tracking for user orientation

**Features**:
- Dynamic breadcrumb generation from URL pathname
- UUID/ID detection (doesn't create breadcrumbs for IDs)
- Human-readable labels from `routeNameMap`
- Home icon linking to dashboard
- Links on non-terminal breadcrumbs for navigation

**Route Name Mapping**:
```typescript
const routeNameMap: RouteNameMap = {
  dashboard: 'Dashboard',
  workorders: 'Work Orders',
  'work-instructions': 'Work Instructions',
  quality: 'Quality',
  inspections: 'Inspections',
  // ... 40+ more mappings
}
```

#### `/frontend/src/App.tsx` (621 lines)
**Purpose**: Root application routing component

**Key Features**:
- Authentication guard (redirects to login if not authenticated)
- Protected route wrapping for all authenticated routes
- Comprehensive route definitions with role/permission guards
- Nested route structure (e.g., `/quality/inspections`, `/quality/ncrs`)

**Route Organization Pattern**:
```typescript
// Root & Dashboard
<Route path="/" element={<Navigate to="/dashboard" replace />} />
<Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

// Work Orders with permission checks
<Route path="/workorders" 
  element={<ProtectedRoute permissions={['workorders.read']}><WorkOrders /></ProtectedRoute>} />

// Quality Management with role checks
<Route path="/quality/inspections"
  element={<ProtectedRoute roles={['Quality Engineer', 'Quality Inspector']}><Inspections /></ProtectedRoute>} />
```

#### `/frontend/src/routes/ospRoutes.ts` (2KB)
**Purpose**: Handles Open System Protocol routes configuration

---

### Authentication & Authorization Files

#### `/frontend/src/store/AuthStore.tsx` (500+ lines, examined first 150)
**Purpose**: Zustand store for authentication state and actions

**State**:
```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  samlProviders: SamlProviderInfo[];
  isSamlDiscovering: boolean;
  samlDiscoveryResult: SamlDiscoveryResponse | null;
}
```

**Actions**:
- `login()`: Handles credentials-based login
- `logout()`: Clears auth state
- `refreshAccessToken()`: Handles token refresh
- `discoverSamlProviders()`: SAML provider discovery
- `initiateSamlAuth()`: SAML authentication flow

**Hooks Exported**:
- `useAuthStore()`: Access full auth state
- `usePermissions()`: Get user permissions array
- `useRoles()`: Get user roles array
- `usePermissionCheck()`: Utility for checking access

#### `/frontend/src/components/Auth/ProtectedRoute.tsx` (186 lines)
**Purpose**: Route guard component that enforces authorization

**Features**:
- Checks authentication status
- Validates user account is active
- Verifies required permissions (with `requireAll` option)
- Verifies required roles (with `requireAll` option)
- Renders 403 Access Denied on failure
- System admin bypass (inherits all permissions/roles)

**Hooks Provided**:
```typescript
usePermissionCheck() // Returns object with methods:
  - hasPermission(permission): boolean
  - hasRole(role): boolean
  - hasAnyRole(roles[]): boolean
  - hasAllRoles(roles[]): boolean
  - hasAnyPermission(permissions[]): boolean
  - hasAllPermissions(permissions[]): boolean

ConditionalRender // Component for conditional UI rendering based on permissions/roles
```

#### `/frontend/src/types/auth.ts` (100+ lines, examined first 100)
**Purpose**: TypeScript type definitions for authentication

**Key Types**:
```typescript
interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  permissions: string[];
  siteId?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

// Role constants (SYSTEM_ADMIN, PLANT_MANAGER, PRODUCTION_PLANNER, etc.)
// Permission constants (WORKORDERS_READ, MATERIALS_READ, TRACEABILITY_READ, etc.)
```

---

### Workflow & Configuration Files

#### `/frontend/src/types/workflowConfiguration.ts` (151 lines)
**Purpose**: Type definitions for site-level workflow configuration (GitHub Issue #40)

**Key Concepts**:
- **Workflow Modes**: STRICT, FLEXIBLE, HYBRID
- **Three-Level Configuration Hierarchy**:
  1. Site-level base configuration
  2. Routing-level overrides (optional)
  3. Work order-level overrides (requires approval)

**Configuration Tracking**:
```typescript
interface SiteWorkflowConfiguration {
  id: string;
  siteId: string;
  mode: WorkflowMode;
  enforceOperationSequence?: boolean;
  enforceStatusGating?: boolean;
  allowExternalVouching?: boolean;
  enforceQualityChecks?: boolean;
  requireApproval?: boolean;
  effectiveDate: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

interface ConfigurationHistory {
  id: string;
  configType: 'SITE' | 'ROUTING' | 'WORK_ORDER';
  configId: string;
  previousMode?: WorkflowMode;
  newMode?: WorkflowMode;
  changedFields: Record<string, any>;
  changeReason?: string;
  createdAt: string;
  createdBy?: string;
}
```

#### `/frontend/src/api/workflowConfiguration.ts` (231 lines)
**Purpose**: API client for workflow configuration management

**Main Features**:
- **Site Configuration**: Get/update site workflow config
- **Effective Configuration**: Retrieve resolved configuration with inheritance
- **Operation Execution Guards**: `canExecuteOperation()`, `canCollectData()`
- **Routing Overrides**: Create/update/delete routing-level configurations
- **Work Order Overrides**: Create/update/delete work order configurations (approval required)
- **Configuration History**: Paginated history retrieval with audit trails

**Approval Pattern**:
```typescript
createWorkOrderOverride(workOrderId: string, override: {
  overrideReason: string;        // Required
  approvedBy: string;            // Required - tracks who approved
  [workflow config fields]
}): Promise<WorkOrderWorkflowConfiguration>
```

---

### Plugin & Extension Files

#### `/frontend/src/store/pluginStore.ts` (100+ lines examined)
**Purpose**: Zustand store for plugin/extension lifecycle management

**Key State**:
```typescript
interface Plugin {
  id: string;
  pluginId: string;
  name: string;
  version: string;
  status: 'PENDING_APPROVAL' | 'INSTALLED' | 'ACTIVE' | 'DISABLED' | 'FAILED' | 'UNINSTALLED';
  isActive: boolean;
  installedAt: string;
  installedBy: string;
  manifest: Record<string, any>;
  configuration?: Record<string, any>;
  packageUrl: string;
}

interface PluginWebhook {
  id: string;
  pluginId: string;
  eventType: string;
  webhookUrl: string;
  secret: string;
  maxRetries: number;
  isActive: boolean;
  lastTriggeredAt?: string;
  successCount: number;
  failureCount: number;
}

interface PluginExecution {
  id: string;
  pluginId: string;
  hookPoint: string;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  status: 'STARTED' | 'COMPLETED' | 'FAILED' | 'TIMEOUT' | 'REJECTED';
  errorMessage?: string;
}
```

**Plugin Lifecycle**:
- `installPlugin()`: Initial installation
- `approvePlugin()`: Approval before activation (PENDING_APPROVAL → ACTIVE)
- `activatePlugin()`: Enable plugin functionality
- `deactivatePlugin()`: Disable plugin
- `uninstallPlugin()`: Remove plugin

**Webhook Management**:
- `registerWebhook()`: Subscribe to plugin events
- `unregisterWebhook()`: Unsubscribe
- `testWebhook()`: Validate webhook connectivity
- `retryWebhook()`: Retry failed deliveries

---

## 3. Current Menu/Navigation Structure

### Menu Groups & Organization

The navigation menu is organized into **7 logical groups** plus the dashboard:

```
├── DASHBOARD
├── PRODUCTION
│   ├── Work Orders (workorders.read)
│   ├── Process Segments (Production Planner, Plant Manager)
│   ├── Operations (Production Planner, Plant Manager)
│   ├── Routings (Production Planner, Plant Manager)
│   └── Scheduling (Production Planner, Plant Manager)
├── QUALITY
│   ├── Inspections (Quality Engineer, Quality Inspector)
│   ├── NCRs (Quality Engineer)
│   ├── FAI Reports (Quality Engineer, Quality Inspector)
│   └── Signatures (Quality Engineer, Quality Inspector)
├── MATERIALS
│   ├── Materials (materials.read)
│   ├── Kit Management (Production Planner, Manufacturing Engineer, Material Coordinator, Plant Manager)
│   │   ├── Kit Dashboard
│   │   └── Analytics & Reports
│   ├── Staging Dashboard (Production Planner, Manufacturing Engineer, Plant Manager)
│   └── Traceability (traceability.read)
├── PERSONNEL
│   └── Personnel (Plant Manager, System Admin)
├── EQUIPMENT & TOOLS
│   ├── Equipment (Maintenance Technician, Plant Manager)
│   └── Serialization (traceability.read)
│       ├── Overview
│       └── Serialized Parts
├── WORK INSTRUCTIONS
│   ├── View All (workinstructions.read)
│   └── Create New (workinstructions.create)
└── ADMINISTRATION
    ├── Integrations (Plant Manager, System Admin)
    │   ├── Dashboard
    │   ├── Configuration
    │   └── Logs
    ├── Admin (System Admin)
    └── Settings (all authenticated users)
```

### Access Control Patterns

**Role-Based (Most Common)**:
```typescript
roles: [ROLES.PRODUCTION_PLANNER, ROLES.PLANT_MANAGER]
```

**Permission-Based**:
```typescript
permissions: [PERMISSIONS.WORKORDERS_READ, PERMISSIONS.MATERIALS_READ]
```

**Nested Items**:
- Child items inherit parent's access requirements
- Filtering is recursive in `buildMenuItems()`

---

## 4. Existing Navigation Hooks & Utilities

### Hooks Available

**From AuthStore**:
- `useAuthStore()`: Main auth store access
- `usePermissions()`: Get permissions array
- `useRoles()`: Get roles array

**From ProtectedRoute**:
- `usePermissionCheck()`: Comprehensive permission checking utility

### Permission Check Utilities

```typescript
const permissionCheck = usePermissionCheck();

// Single checks
permissionCheck.hasPermission('workorders.read')
permissionCheck.hasRole('Quality Engineer')

// Multiple checks
permissionCheck.hasAnyPermission(['read', 'write'])
permissionCheck.hasAllPermissions(['read', 'write', 'delete'])
permissionCheck.hasAnyRole(['Manager', 'Supervisor'])
permissionCheck.hasAllRoles(['Manager', 'QualityLead'])
```

### Conditional Rendering Component

```typescript
<ConditionalRender
  roles={['Plant Manager']}
  permissions={['admin.write']}
  requireAll={false}  // OR logic
  fallback={<NoAccess />}
>
  <AdminPanel />
</ConditionalRender>
```

---

## 5. Approval & Workflow Patterns

### Pattern 1: Plugin Installation Approval

**Flow**:
1. Plugin uploaded → `PENDING_APPROVAL` status
2. Admin calls `approvePlugin(pluginId)` 
3. Status changes to `ACTIVE`
4. System begins executing plugin hooks

**Webhook Tracking**:
- `lastTriggeredAt`: When plugin last executed
- `successCount` / `failureCount`: Execution statistics
- `failedDeliveries`: Failed webhook attempts for retry

### Pattern 2: Workflow Configuration Overrides

**Three-Level Hierarchy**:

1. **Site Level** (Base Configuration):
   - Set by plant manager
   - Applies to all operations at site
   - Versioned with effective dates

2. **Routing Level** (Optional Override):
   - Override site config for specific routing
   - No approval required
   - Tracked for audit

3. **Work Order Level** (Approval Required):
   - Override for specific work order
   - **Requires approval** with `approvedBy` field
   - Captures `overrideReason` and `approvedAt`
   - Full audit trail in configuration history

**Configuration Change Tracking**:
```typescript
ConfigurationHistory {
  id: string;
  configType: 'SITE' | 'ROUTING' | 'WORK_ORDER';
  previousMode?: WorkflowMode;
  newMode?: WorkflowMode;
  changedFields: Record<string, any>;
  changeReason?: string;
  createdAt: string;
  createdBy?: string;
}
```

### Pattern 3: Route-Level Authorization

**In App.tsx**:
```typescript
<Route path="/quality/ncrs" 
  element={
    <ProtectedRoute roles={['Quality Engineer']}>
      <NCRs />
    </ProtectedRoute>
  } 
/>
```

**Fallback**: 403 Access Denied page with option to go back

---

## 6. Navigation Configuration & Manifest Patterns

### Extension Framework (GitHub Issue #410)

The system supports an **Extension Framework v2.0** with:

**Manifest Structure** (from `workflowConfiguration.ts` and `pluginStore.ts`):
```json
{
  "id": "plugin-id",
  "name": "Plugin Name",
  "version": "1.0.0",
  "status": "ACTIVE",
  "manifest": {
    "dependencies": {
      "capabilities": [
        {
          "capability": "erp-integration",
          "minVersion": "v1.0",
          "provider": "sap-ebs-adapter"
        }
      ]
    },
    "conflicts": {
      "policyExclusions": [
        {
          "scope": "capability",
          "capability": "work-instruction-authoring",
          "conflictsWith": ["plm-authoring", "external-authoring"]
        }
      ]
    },
    "compliance": {
      "complianceModel": "delegated",
      "delegations": [
        {
          "aspect": "electronic-signature-validation",
          "delegatedTo": "quality-focal",
          "requiresSignoff": true,
          "auditTrail": true
        }
      ]
    }
  },
  "configuration": {}
}
```

**Four-Tier Classification**:
| Tier | Test Coverage | Security | Approval | Use Case |
|------|---------------|----------|----------|----------|
| **core-foundation** | 90%+ | Sandbox + Sign | Platform | Authentication, audit logging |
| **foundation** | 80%+ | Sandbox + Sign | Standard | ERP integration, core compliance |
| **application** | 70%+ | Standard | Standard | Feature extensions |
| **optional** | None | Standard | Standard | Nice-to-have add-ons |

### Site-Scoped Configuration

**Multi-Tenant Support**:
- Configurations tracked per site (`siteId`)
- Compliance signoffs recorded per site
- Conflict detection and dependency validation per site
- Separate effective configuration resolution per site

---

## 7. Key Design Patterns

### 1. Declarative Menu Configuration
Menu items are defined statically with metadata about access requirements. The system recursively filters based on user context.

### 2. Hierarchical Authorization
- Menu level: Uses `buildMenuItems()` to filter visibility
- Route level: Uses `<ProtectedRoute>` to enforce access
- Component level: Uses `<ConditionalRender>` for UI elements

### 3. Approval-Based Workflow
- Explicit `approvedBy` field tracks who made decisions
- Audit trail in `ConfigurationHistory`
- Different approval requirements for different override levels

### 4. Capability-Based Dependencies
Plugins can declare dependencies on abstract "capabilities" rather than specific providers, enabling flexible integration.

### 5. Multi-Site Isolation
Configuration, compliance signoffs, and state are scoped per site with proper isolation and conflict detection.

---

## 8. Integration Points

### With Authentication System
- AuthStore provides user roles/permissions
- ProtectedRoute enforces access
- Breadcrumbs use authenticated state

### With Plugin System
- pluginStore manages installation/approval lifecycle
- Webhooks execute on workflow events
- Configuration history records plugin-related changes

### With Workflow Configuration
- Menu visibility can be affected by effective configuration
- Operations check `canExecuteOperation()` before rendering
- Data collection checks `canCollectData()`

### With Site Context
- Multi-site selector in header
- Site-scoped configuration resolution
- Site-specific compliance tracking

---

## 9. Current Limitations & Considerations

1. **Static Menu Definition**: Menu structure is hardcoded in MainLayout.tsx. No dynamic menu from backend or plugins.

2. **Limited Dynamic Navigation**: Cannot add navigation items from plugins or external configuration at runtime.

3. **No Navigation Approval**: Navigation items themselves don't require approval before visibility (unlike workflow configurations).

4. **Recursive Filtering**: Menu building uses recursion which could be inefficient for very large menu structures.

5. **No Navigation History**: Breadcrumbs are generated client-side from URL, no server-side tracking.

6. **No Menu Permissions Audit**: Unlike workflow configuration history, menu access changes aren't tracked.

---

## 10. Recommendations for Enhancement

1. **Dynamic Navigation Registry**: Build a plugin-based navigation registration system
2. **Navigation Approval Workflows**: Allow workflows to govern menu visibility changes
3. **Granular Permission Audit**: Track all navigation-related permission changes
4. **Menu Configuration Export**: Support exporting/importing menu structures
5. **Role-Based Menu Customization**: Allow roles to customize visible menu items per site

---

## File Location Summary

| File | Path | Purpose |
|------|------|---------|
| Main Layout | `/frontend/src/components/Layout/MainLayout.tsx` | Navigation UI orchestrator |
| Breadcrumbs | `/frontend/src/components/Navigation/Breadcrumbs.tsx` | Location tracking |
| App Routes | `/frontend/src/App.tsx` | Route definitions & guards |
| Auth Store | `/frontend/src/store/AuthStore.tsx` | Authentication state |
| Protected Route | `/frontend/src/components/Auth/ProtectedRoute.tsx` | Route authorization |
| Auth Types | `/frontend/src/types/auth.ts` | Type definitions |
| Workflow Config Types | `/frontend/src/types/workflowConfiguration.ts` | Configuration schemas |
| Workflow Config API | `/frontend/src/api/workflowConfiguration.ts` | Configuration API client |
| Plugin Store | `/frontend/src/store/pluginStore.ts` | Extension lifecycle |
| OSP Routes | `/frontend/src/routes/ospRoutes.ts` | Protocol-specific routes |

