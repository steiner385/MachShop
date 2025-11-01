# Frontend Navigation Architecture - Visual Overview

## Application Navigation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    App.tsx (Root Component)                      │
│                                                                   │
│  - Authentication Guard (checks isAuthenticated)                │
│  - Redirects to /login if not authenticated                     │
│  - Wraps all routes with MainLayout                            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │     MainLayout.tsx                    │
        │  (Navigation UI Orchestrator)         │
        └───────────────┬───────────────────────┘
                        │
        ┌───────────────┴───────────────┬───────────────┐
        │                               │               │
        ▼                               ▼               ▼
┌──────────────────┐         ┌──────────────────┐  ┌──────────────────┐
│   Sider          │         │   Header         │  │   Content        │
│  (Fixed Sidebar) │         │  (Fixed Top)     │  │   (Dynamic)      │
│                  │         │                  │  │                  │
│ - Menu Items     │         │ - Toggle Btn     │  │ - Breadcrumbs    │
│ - User Avatar    │         │ - Global Search  │  │ - Routes         │
│ - Logo           │         │ - Site Selector  │  │ - Page Content   │
│                  │         │ - Notifications  │  │                  │
│ Width: 256px     │         │ - User Dropdown  │  │                  │
│ (collapsed: 80)  │         │ Height: 64px     │  │                  │
└──────────────────┘         └──────────────────┘  └──────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────┐
│   Ant Design Menu Component                          │
│                                                      │
│   menuItems = buildMenuItems()                      │
│                                                      │
│   ▼ DASHBOARD                                       │
│   ▼ PRODUCTION                                      │
│     ├─ Work Orders          (permission check)     │
│     ├─ Operations           (role check)           │
│     ├─ Routings             (role check)           │
│     └─ Scheduling           (role check)           │
│   ▼ QUALITY                                         │
│     ├─ Inspections          (role check)           │
│     ├─ NCRs                 (role check)           │
│     ├─ FAI Reports          (role check)           │
│     └─ Signatures           (role check)           │
│   [... 5 more groups ...]                           │
└──────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────┐
│   Menu Item Filtering Logic                          │
│                                                      │
│   checkAccess(permissions, roles) {                 │
│     if (isSystemAdmin) return true;                 │
│     if (hasWildcardPermission) return true;         │
│     if (permissions && user.permissions match)      │
│       return true;                                  │
│     if (roles && user.roles match)                  │
│       return true;                                  │
│     return false;                                   │
│   }                                                  │
└──────────────────────────────────────────────────────┘
```

## Route Protection & Authorization Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser URL                             │
│                    /workorders/:id/edit                         │
└────────────────────────────┬──────────────────────────────────┘
                             │
                             ▼
        ┌────────────────────────────────────┐
        │   App.tsx Route Definition         │
        │                                    │
        │   <Route path="/workorders/:id"    │
        │     element={                      │
        │       <ProtectedRoute              │
        │         permissions=['workorders.write']
        │       >                            │
        │         <WorkOrderEdit />          │
        │       </ProtectedRoute>            │
        │     }                              │
        │   />                               │
        └────────────────┬───────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │   ProtectedRoute Component         │
        │   (Authorization Guard)            │
        │                                    │
        │   1. Check isAuthenticated?        │
        │   2. Check isActive?               │
        │   3. Check permissions?            │
        │   4. Check roles?                  │
        │   5. Render children or 403        │
        └────────────────────────────────────┘
                         │
            ┌────────────┴────────────┐
            │                         │
            ▼ (Access Granted)        ▼ (Access Denied)
        ┌─────────────┐          ┌──────────────────┐
        │  Render     │          │  403 Error Page  │
        │  Component  │          │  (With back btn) │
        └─────────────┘          └──────────────────┘
```

## Authentication & Permission Flow

```
┌────────────────────────────────────────────────────────────┐
│                    Login Request                           │
│              username + password                           │
└──────────────────────┬─────────────────────────────────────┘
                       │
                       ▼
        ┌─────────────────────────────────┐
        │   AuthStore.login()             │
        │   (Zustand Store)               │
        └────────────┬────────────────────┘
                     │
                     ▼
        ┌─────────────────────────────────┐
        │   authAPI.login()               │
        │   (Makes POST request)          │
        └────────────┬────────────────────┘
                     │
                     ▼
        ┌─────────────────────────────────┐
        │   Backend API Response          │
        │   {                             │
        │     token: 'jwt-token',        │
        │     refreshToken: '...',       │
        │     user: {                     │
        │       id: '...',               │
        │       username: '...',         │
        │       roles: ['...'],          │
        │       permissions: ['...']     │
        │     }                           │
        │   }                             │
        └────────────┬────────────────────┘
                     │
                     ▼
        ┌─────────────────────────────────┐
        │   Update AuthStore State        │
        │   - Set user                    │
        │   - Set token                   │
        │   - Set isAuthenticated = true  │
        │   - Persist to localStorage     │
        └────────────┬────────────────────┘
                     │
                     ▼
        ┌─────────────────────────────────┐
        │   Available Hooks               │
        │   const user = useAuthStore()   │
        │   const perms = usePermissions()
        │   const roles = useRoles()      │
        │   const check = usePermissionCheck()
        └─────────────────────────────────┘
```

## Workflow Configuration Hierarchy

```
┌────────────────────────────────────────────────────────────┐
│                   Effective Configuration                  │
│              (Resolved Inheritance Chain)                  │
└──────────────────────┬─────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Site Level  │  │ Routing     │  │ Work Order  │
│ (Base)      │  │ Override    │  │ Override    │
│             │  │ (Optional)  │  │ (Approval)  │
├─────────────┤  ├─────────────┤  ├─────────────┤
│ Set by:     │  │ Set by:     │  │ Set by:     │
│ Plant Mgr   │  │ Plant Mgr   │  │ Supervisor  │
│             │  │             │  │             │
│ Applies to: │  │ Applies to: │  │ Applies to: │
│ All ops     │  │ This routing│  │ This WO     │
│ at site     │  │             │  │             │
│             │  │ Approval:   │  │ Approval:   │
│ Approval:   │  │ None        │  │ REQUIRED    │
│ None        │  │             │  │ (approvedBy)
│             │  │ Audit:      │  │             │
│ History:    │  │ Tracked     │  │ Audit:      │
│ Tracked     │  │             │  │ Full Trail  │
└─────────────┘  └─────────────┘  └─────────────┘
        │              │              │
        └──────────────┼──────────────┘
                       │
                       ▼
        ┌────────────────────────────┐
        │  ConfigurationHistory      │
        │  (Audit Trail)             │
        │                            │
        │  - configType              │
        │  - previousMode            │
        │  - newMode                 │
        │  - changedFields           │
        │  - changeReason            │
        │  - createdBy               │
        │  - createdAt               │
        └────────────────────────────┘
```

## Plugin/Extension Lifecycle with Approval

```
┌──────────────┐
│  Upload      │
│  Plugin      │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│  PENDING_APPROVAL    │
│  (Initial Status)    │
└──────┬───────────────┘
       │
       │ Admin Reviews manifest:
       │ - Dependencies
       │ - Conflicts
       │ - Compliance requirements
       │ - Permissions needed
       │
       ▼
┌──────────────────────┐
│  approvePlugin()     │
│  (Admin Decision)    │
└──────┬───────────────┘
       │
       ├─── Rejected ───► FAILED
       │
       └─── Approved ───┐
                        │
                        ▼
                   ┌──────────────────┐
                   │  ACTIVE          │
                   │  (Approved)      │
                   └──────┬───────────┘
                          │
                          ▼
         ┌────────────────────────────┐
         │  Webhook Registration      │
         │  (Subscribe to events)     │
         │                            │
         │  registerWebhook(          │
         │    pluginId,               │
         │    eventType,              │
         │    webhookUrl,             │
         │    secret                  │
         │  )                         │
         └────────────────────────────┘
                          │
                          ▼
         ┌────────────────────────────┐
         │  Webhook Execution         │
         │                            │
         │  On Event: POST to URL     │
         │  Track: successCount       │
         │        failureCount        │
         │        lastTriggeredAt     │
         │        failedDeliveries    │
         └────────────────────────────┘
```

## Permission Check Examples

```
┌────────────────────────────────────────────────────────────┐
│              Permission Check Patterns                      │
└────────────────────────────────────────────────────────────┘

1. Check Single Permission:
   ───────────────────────
   const check = usePermissionCheck();
   if (check.hasPermission('workorders.read')) {
     // Show Work Orders menu item
   }

2. Check Any of Multiple Permissions:
   ────────────────────────────────────
   if (check.hasAnyPermission(['read', 'write', 'admin'])) {
     // User has at least one of these
   }

3. Check All Permissions (AND logic):
   ────────────────────────────────
   if (check.hasAllPermissions(['read', 'write'])) {
     // User must have both read AND write
   }

4. Check Roles:
   ───────────
   if (check.hasRole('Quality Engineer')) {
     // User has this role
   }

5. System Admin Bypass:
   ──────────────────
   if (check.hasRole('System Administrator')) {
     // Has access to EVERYTHING
     // (Auto-pass all permission checks)
   }

6. Wildcard Permission:
   ────────────────────
   if (user.permissions.includes('*')) {
     // Has universal access
   }
```

## Component-Level Authorization

```
┌────────────────────────────────────────────────────────────┐
│         Conditional UI Rendering                           │
└────────────────────────────────────────────────────────────┘

// Option 1: ProtectedRoute (Full page guard)
<Route path="/admin" element={
  <ProtectedRoute roles={['System Administrator']}>
    <AdminPanel />
  </ProtectedRoute>
} />

// Option 2: ConditionalRender (Partial page)
<ConditionalRender
  roles={['Quality Engineer']}
  permissions={['quality.write']}
  requireAll={false}  // OR logic
  fallback={<NoAccess />}
>
  <QualityToolbar />
</ConditionalRender>

// Option 3: Hook-based check
function QualityReportButton() {
  const check = usePermissionCheck();
  
  if (!check.hasPermission('quality.write')) {
    return null;  // Don't render button
  }
  
  return <Button>Generate Report</Button>;
}
```

---

## File Dependency Tree

```
App.tsx
├── MainLayout.tsx
│   ├── Menu Items Configuration
│   ├── AuthStore (user roles/permissions)
│   ├── buildMenuItems() (recursive filtering)
│   ├── checkAccess() (permission logic)
│   ├── Breadcrumbs.tsx
│   │   └── RouteNameMap
│   ├── SiteSelector.tsx
│   ├── GlobalSearch.tsx
│   └── User Dropdown Menu
│
├── Routes
│   ├── /dashboard (ProtectedRoute)
│   ├── /workorders (ProtectedRoute + permissions)
│   ├── /quality/* (ProtectedRoute + roles)
│   ├── /materials (ProtectedRoute + permissions)
│   └── [... 40+ more routes ...]
│
└── Authentication
    ├── AuthStore.tsx
    │   ├── useAuthStore()
    │   ├── usePermissions()
    │   ├── useRoles()
    │   └── usePermissionCheck()
    │
    ├── ProtectedRoute.tsx
    │   └── usePermissionCheck() hook
    │
    └── types/auth.ts
        ├── User interface
        ├── ROLES constants
        └── PERMISSIONS constants
```

