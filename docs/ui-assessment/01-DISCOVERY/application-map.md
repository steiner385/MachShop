# Application Route Mapping & Navigation Structure

## Overview

The MachShop MES application is built with React 18 + TypeScript using React Router DOM v6 for navigation. The application features a comprehensive role-based access control (RBAC) system with 53 distinct routes organized into 7 main functional groups.

## Application Architecture

### Frontend Stack
- **Framework**: React 18 + TypeScript
- **Routing**: React Router DOM v6
- **UI Library**: Ant Design 5.x
- **State Management**: Zustand (AuthStore, etc.)
- **Build Tool**: Vite (dev server on port 5178)

### Layout Structure
- **MainLayout**: Fixed sidebar + collapsible navigation + header with breadcrumbs
- **Header Components**: Global search, site selector, notifications, user dropdown
- **Sidebar**: Dark theme, 7 grouped sections, role-based filtering
- **Content Area**: Breadcrumbs + main content with 24px padding

## Complete Route Inventory (53 Routes)

### Authentication & Core Routes (4 routes)
| Route | Component | Access Control | Description |
|-------|-----------|----------------|-------------|
| `/` | `Navigate to /dashboard` | Public | Root redirect |
| `/login` | `LoginPage` | Public | Authentication page |
| `/dashboard` | `Dashboard` | Protected (any authenticated user) | Main dashboard |
| `/profile` | `Profile` | Protected (any authenticated user) | User profile management |

### Production Management (14 routes)
| Route | Component | Access Control | Description |
|-------|-----------|----------------|-------------|
| `/workorders` | `WorkOrders` | Permissions: `workorders.read` | Work order list |
| `/workorders/:id` | `WorkOrderDetails` | Permissions: `workorders.read` | Work order details |
| `/workorders/:id/edit` | `WorkOrderEdit` | Permissions: `workorders.write` | Work order editing |
| `/workorders/:id/execute/:operationNumber` | `WorkOrderExecution` | Permissions: `workorders.execute` | Shop floor execution |
| `/operations` | `OperationListPage` | Roles: Production Planner, Plant Manager | Operations management |
| `/operations/create` | `OperationCreatePage` | Roles: Production Planner, Plant Manager | Create new operations |
| `/routings` | `RoutingListPage` | Roles: Production Planner, Plant Manager, Manufacturing Engineer | Routing management |
| `/routings/create` | `RoutingCreatePage` | Roles: Production Planner, Plant Manager, Manufacturing Engineer | Create new routing |
| `/routings/new` | `Navigate to /routings/create` | - | Redirect (duplicate elimination) |
| `/routings/templates` | `RoutingTemplatesPage` | Roles: Production Planner, Plant Manager, Manufacturing Engineer | Routing templates |
| `/routings/:id/edit` | `RoutingEditPage` | Roles: Production Planner, Plant Manager, Manufacturing Engineer | Edit routing |
| `/routings/:id` | `RoutingDetailPage` | Roles: Production Planner, Plant Manager, Manufacturing Engineer | Routing details |
| `/production/scheduling` | `SchedulingPage` | Roles: Production Planner, Plant Manager | Production scheduling dashboard |
| `/production/scheduling/:id` | `ScheduleDetailPage` | Roles: Production Planner, Plant Manager | Schedule details |
| `/scheduling` | `Navigate to /production/scheduling` | - | Backwards compatibility redirect |
| `/production/team-queue` | `TeamWorkQueue` | Roles: Production Supervisor, Plant Manager | Team work queue |

### Quality Management (7 routes)
| Route | Component | Access Control | Description |
|-------|-----------|----------------|-------------|
| `/quality` | `Quality` | Roles: Quality Engineer, Quality Inspector | Quality dashboard |
| `/quality/inspections` | `Inspections` | Roles: Quality Engineer, Quality Inspector | Quality inspections list |
| `/quality/inspections/:id` | `InspectionDetail` | Roles: Quality Engineer, Quality Inspector | Inspection details |
| `/quality/ncrs` | `NCRs` | Roles: Quality Engineer | Non-conformance reports list |
| `/quality/ncrs/:id` | `NCRDetail` | Roles: Quality Engineer | NCR details |
| `/signatures` | `SignatureAuditPage` | Roles: Quality Engineer, Quality Inspector | Electronic signatures audit |
| `/fai` | `FAIListPage` | Roles: Quality Engineer, Quality Inspector | First Article Inspection list |
| `/fai/create` | `FAICreatePage` | Roles: Quality Engineer | Create FAI report |
| `/fai/:id` | `FAIDetailPage` | Roles: Quality Engineer, Quality Inspector | FAI report details |

### Materials & Traceability (9 routes)
| Route | Component | Access Control | Description |
|-------|-----------|----------------|-------------|
| `/materials` | `MaterialsPage` | Permissions: `materials.read` | **PLACEHOLDER PAGE** |
| `/kits` | `KitsPage` | Roles: Production Planner, Manufacturing Engineer, Material Coordinator, Plant Manager | Kit management dashboard |
| `/kits/analytics` | `KitAnalyticsPage` | Roles: Production Planner, Manufacturing Engineer, Material Coordinator, Plant Manager | Kit analytics & reports |
| `/staging` | `StagingPage` | Roles: Production Planner, Manufacturing Engineer, Material Coordinator, Plant Manager | Material staging dashboard |
| `/traceability` | `Traceability` | Permissions: `traceability.read` | Material traceability |
| `/traceability/:serialNumber` | `TraceabilityDetailPage` | Permissions: `traceability.read` | Serial number traceability |
| `/traceability/batch/:id` | `TraceabilityDetailPage` | Permissions: `traceability.read` | Batch traceability |
| `/serialization` | `SerializationListPage` | Permissions: `traceability.read` | Serialization overview |
| `/serialization/overview` | `Navigate to /serialization` | - | Redirect |
| `/serialization/parts` | `SerializationListPage` | Permissions: `traceability.read` | Serialized parts list |

### Work Instructions (5 routes)
| Route | Component | Access Control | Description |
|-------|-----------|----------------|-------------|
| `/work-instructions` | `WorkInstructionListPage` | Permissions: `workinstructions.read` | Work instructions list |
| `/work-instructions/list` | `Navigate to /work-instructions` | - | Redirect |
| `/work-instructions/create` | `WorkInstructionCreatePage` | Permissions: `workinstructions.create` | Create work instruction |
| `/work-instructions/:id` | `WorkInstructionDetailPage` | Permissions: `workinstructions.read` | Work instruction details |
| `/work-instructions/:id/execute` | `WorkInstructionExecutePage` | Permissions: `workinstructions.execute` | Execute work instruction |

### Equipment & Maintenance (1 route)
| Route | Component | Access Control | Description |
|-------|-----------|----------------|-------------|
| `/equipment` | `MaintenanceList` | Roles: Maintenance Technician, Plant Manager | Equipment maintenance |

### Integration Management (4 routes)
| Route | Component | Access Control | Description |
|-------|-----------|----------------|-------------|
| `/integrations` | `IntegrationDashboard` | Roles: Plant Manager, System Administrator | Integration dashboard |
| `/integrations/dashboard` | `Navigate to /integrations` | - | Redirect |
| `/integrations/config` | `IntegrationConfig` | Roles: Plant Manager, System Administrator | Integration configuration |
| `/integrations/config/:id` | `IntegrationConfig` | Roles: Plant Manager, System Administrator | Specific integration config |
| `/integrations/logs` | `IntegrationLogs` | Roles: Plant Manager, System Administrator | Integration logs |

### Administration (4 routes)
| Route | Component | Access Control | Description |
|-------|-----------|----------------|-------------|
| `/personnel` | `PersonnelPage` | Roles: Plant Manager, System Administrator | **PLACEHOLDER PAGE** |
| `/admin` | `AdminPage` | Roles: System Administrator | **PLACEHOLDER PAGE** |
| `/settings` | `SettingsPage` | Protected (any authenticated user) | **PLACEHOLDER PAGE** |
| `/sprint3-demo` | `Sprint3Demo` | Protected (any authenticated user) | Demo/showcase page |

### Error Handling (1 route)
| Route | Component | Access Control | Description |
|-------|-----------|----------------|-------------|
| `*` | `NotFound` | Public | 404 error page |

## Navigation Menu Structure

The sidebar navigation is organized into 7 logical groups:

### 1. PRODUCTION (5 items)
- Work Orders
- Process Segments *(not in routes - potential issue)*
- Operations
- Routings
- Scheduling

### 2. QUALITY (4 items)
- Inspections
- NCRs
- FAI Reports
- Signatures

### 3. MATERIALS (4 items)
- Materials
- Kit Management (with submenu)
  - Kit Dashboard
  - Analytics & Reports
- Staging Dashboard
- Traceability

### 4. PERSONNEL (1 item)
- Personnel

### 5. EQUIPMENT & TOOLS (2 items)
- Equipment
- Serialization (with submenu)
  - Overview
  - Serialized Parts

### 6. Work Instructions (standalone item)
- Work Instructions (with submenu)
  - View All
  - Create New

### 7. ADMINISTRATION (3 items)
- Integrations (with submenu)
  - Dashboard
  - Configuration
  - Logs
- Admin
- Settings

## RBAC Analysis

### User Roles Identified (12 roles)
1. **System Administrator** - Full access (wildcard permissions)
2. **Plant Manager** - Broad operational access
3. **Production Planner** - Production scheduling and planning
4. **Production Supervisor** - Shop floor supervision
5. **Manufacturing Engineer** - Engineering and routing
6. **Quality Engineer** - Quality management and NCRs
7. **Quality Inspector** - Quality inspections and FAI
8. **Maintenance Technician** - Equipment maintenance
9. **Material Coordinator** - Materials and kitting
10. **Operator** - Basic shop floor operations
11. **Guest** - Limited read-only access
12. **Custom Roles** - Site-specific roles

### Permission Types Identified
- `workorders.read` / `workorders.write` / `workorders.execute`
- `materials.read`
- `traceability.read`
- `workinstructions.read` / `workinstructions.create` / `workinstructions.execute`
- `*` (wildcard for administrators)

### Access Control Patterns
1. **Permission-based**: Fine-grained control (e.g., work orders)
2. **Role-based**: Specific roles required (e.g., quality functions)
3. **Hierarchical**: System Admin > Plant Manager > specific roles
4. **Wildcard**: Administrators bypass all restrictions

## Accessibility Features Present

### Built-in ARIA Support
- `role="navigation"` on sidebar
- `role="banner"` on header
- `role="main"` on content area
- Proper semantic HTML structure

### Keyboard Navigation
- Collapsible sidebar with keyboard triggers
- Menu focus management
- Button keyboard accessibility
- Tooltip support for collapsed states

### User Experience Features
- Responsive design (fixed sidebar, collapsible)
- Breadcrumb navigation
- Global search functionality
- Site selector for multi-site operations
- Notification badge system
- User context display (name, role, avatar)

## Identified Issues

### Navigation Discrepancies
1. **Process Segments** menu item has no corresponding route
2. **Scheduling redirect** creates potential confusion (`/scheduling` → `/production/scheduling`)
3. **Work Instructions submenu** links to redirected routes

### Placeholder Pages (3 confirmed)
1. `/materials` - `MaterialsPage` (commented as placeholder)
2. `/personnel` - `PersonnelPage` (commented as placeholder)
3. `/admin` - `AdminPage` (commented as placeholder)
4. `/settings` - `SettingsPage` (commented as placeholder)

### Route Redundancies
1. Multiple redirects for same functionality
2. Some routes redirect to other routes (indirection)

## Critical Production Paths

### Priority 1 - Core Manufacturing
1. **Login** → **Dashboard** → **Work Orders** → **Work Order Execution**
2. **Materials** → **Kits** → **Staging** → **Traceability**
3. **Quality Inspections** → **NCR Creation** → **FAI Reports**

### Priority 2 - Planning & Engineering
1. **Routings** → **Operations** → **Scheduling**
2. **Work Instructions** → **Creation** → **Execution**
3. **Equipment** → **Maintenance**

### Priority 3 - Administration
1. **Personnel** → **Admin** → **Settings**
2. **Integrations** → **Configuration** → **Logs**

## Assessment Implications

### Positive Findings
- ✅ Comprehensive route structure (53 routes)
- ✅ Strong RBAC implementation
- ✅ Logical navigation grouping
- ✅ Accessibility features present
- ✅ Responsive design considerations

### Areas for Assessment Focus
- 🔍 Placeholder page functionality completion
- 🔍 Navigation menu item consistency with routes
- 🔍 Dead link detection on redirects
- 🔍 RBAC testing across all roles
- 🔍 Breadcrumb accuracy on nested routes
- 🔍 Mobile/tablet responsiveness (shop floor use)

## Next Steps

1. **Component Inventory**: Catalog all 33 component directories
2. **RBAC Route Testing**: Test access controls for all 12 roles
3. **Dead Link Validation**: Verify all navigation items resolve properly
4. **Placeholder Page Assessment**: Determine completion status
5. **Accessibility Testing**: WCAG compliance on critical paths

---

**Assessment Date**: October 31, 2025
**Routes Mapped**: 53 total routes
**Navigation Groups**: 7 main sections
**User Roles**: 12 identified roles
**Placeholder Pages**: 4 confirmed placeholders