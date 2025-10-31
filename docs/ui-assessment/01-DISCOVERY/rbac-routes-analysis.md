# RBAC-Protected Routes & User Roles Analysis

## Overview

The MachShop MES application implements a comprehensive Role-Based Access Control (RBAC) system with **12 distinct user roles** and **28 granular permissions**. The system supports both role-based and permission-based route protection, with additional enterprise SSO integration via SAML providers.

## User Role System (12 Roles)

### Administrative Roles (2 roles)
| Role | Code | Access Level | Key Responsibilities |
|------|------|--------------|---------------------|
| **System Administrator** | `SYSTEM_ADMIN` | Full Access (`*` permission) | System configuration, user management, global settings |
| **Plant Manager** | `PLANT_MANAGER` | Executive Access | Plant operations oversight, strategic planning, all departments |

### Production Management (4 roles)
| Role | Code | Access Level | Key Responsibilities |
|------|------|--------------|---------------------|
| **Production Supervisor** | `PRODUCTION_SUPERVISOR` | Operational Management | Shop floor supervision, team management, work queue oversight |
| **Production Planner** | `PRODUCTION_PLANNER` | Planning & Scheduling | Production planning, capacity management, routing creation |
| **Production Scheduler** | `PRODUCTION_SCHEDULER` | Scheduling Focus | Schedule optimization, resource allocation |
| **Manufacturing Engineer** | `MANUFACTURING_ENGINEER` | Engineering Focus | Process engineering, routing design, technical optimization |

### Engineering & Technical (2 roles)
| Role | Code | Access Level | Key Responsibilities |
|------|------|--------------|---------------------|
| **Process Engineer** | `PROCESS_ENGINEER` | Process Optimization | Process improvement, parameter optimization, technical analysis |
| **Operator** | `OPERATOR` | Execution Level | Shop floor operations, work order execution, data collection |

### Quality Management (2 roles)
| Role | Code | Access Level | Key Responsibilities |
|------|------|--------------|---------------------|
| **Quality Engineer** | `QUALITY_ENGINEER` | Quality Management | NCR creation, CAPA management, quality planning |
| **Quality Inspector** | `QUALITY_INSPECTOR` | Inspection Focus | Quality inspections, FAI execution, signature verification |

### Support Functions (2 roles)
| Role | Code | Access Level | Key Responsibilities |
|------|------|--------------|---------------------|
| **Maintenance Technician** | `MAINTENANCE_TECHNICIAN` | Equipment Focus | Equipment maintenance, calibration, repair |
| **Warehouse Manager** | `WAREHOUSE_MANAGER` | Materials Focus | Inventory management, material coordination |

## Permission System (28 Permissions)

### Work Order Permissions (7 permissions)
| Permission | Code | Description | Typical Roles |
|------------|------|-------------|---------------|
| Read Work Orders | `workorders.read` | View work order information | Most production roles |
| Write Work Orders | `workorders.write` | Edit work order details | Production Planners, Engineers |
| Create Work Orders | `workorders.create` | Create new work orders | Production Planners, Supervisors |
| Update Work Orders | `workorders.update` | Modify existing work orders | Production Planners, Engineers |
| Delete Work Orders | `workorders.delete` | Remove work orders | Production Planners, Managers |
| Release Work Orders | `workorders.release` | Release work orders to shop floor | Production Supervisors, Planners |
| Execute Work Orders | `workorders.execute` | Perform work order operations | Operators, Technicians |

### Work Instruction Permissions (6 permissions)
| Permission | Code | Description | Typical Roles |
|------------|------|-------------|---------------|
| Read Work Instructions | `workinstructions.read` | View work instructions | All production users |
| Create Work Instructions | `workinstructions.create` | Author new work instructions | Engineers, Planners |
| Update Work Instructions | `workinstructions.update` | Edit existing work instructions | Engineers, Supervisors |
| Delete Work Instructions | `workinstructions.delete` | Remove work instructions | Engineers, Managers |
| Approve Work Instructions | `workinstructions.approve` | Approve work instruction changes | Engineers, Managers |
| Execute Work Instructions | `workinstructions.execute` | Follow work instructions | Operators, Technicians |

### Quality Permissions (5 permissions)
| Permission | Code | Description | Typical Roles |
|------------|------|-------------|---------------|
| Read Quality | `quality.read` | View quality information | Quality team, Supervisors |
| Create Quality | `quality.create` | Create quality records | Quality Engineers, Inspectors |
| Update Quality | `quality.update` | Modify quality records | Quality Engineers |
| Delete Quality | `quality.delete` | Remove quality records | Quality Engineers, Managers |
| Approve Quality | `quality.approve` | Approve quality decisions | Quality Engineers, Managers |

### Material Permissions (4 permissions)
| Permission | Code | Description | Typical Roles |
|------------|------|-------------|---------------|
| Read Materials | `materials.read` | View material information | Most users |
| Create Materials | `materials.create` | Create material records | Warehouse, Planners |
| Update Materials | `materials.update` | Modify material records | Warehouse, Planners |
| Delete Materials | `materials.delete` | Remove material records | Warehouse Managers |

### Traceability Permissions (2 permissions)
| Permission | Code | Description | Typical Roles |
|------------|------|-------------|---------------|
| Read Traceability | `traceability.read` | View traceability information | Quality, Production, Engineers |
| Export Traceability | `traceability.export` | Export traceability reports | Quality Engineers, Managers |

### Equipment Permissions (3 permissions)
| Permission | Code | Description | Typical Roles |
|------------|------|-------------|---------------|
| Read Equipment | `equipment.read` | View equipment information | Maintenance, Production |
| Update Equipment | `equipment.update` | Modify equipment records | Maintenance Technicians |
| Equipment Maintenance | `equipment.maintenance` | Perform maintenance operations | Maintenance Technicians |

### Administrative Permissions (3 permissions)
| Permission | Code | Description | Typical Roles |
|------------|------|-------------|---------------|
| User Administration | `admin.users` | Manage user accounts | System Administrators |
| System Administration | `admin.system` | Configure system settings | System Administrators |
| Reports Administration | `admin.reports` | Generate system reports | Administrators, Managers |

## Route Protection Analysis (53 Routes)

### Public Routes (4 routes)
| Route | Protection | Description |
|-------|------------|-------------|
| `/` | None | Root redirect to dashboard |
| `/login` | None | Authentication page |
| `*` (404) | None | Error page |
| Loading states | None | Authentication checking |

### Protected Routes by Category

#### Dashboard & Core (2 routes)
| Route | Protection | Required Access |
|-------|------------|-----------------|
| `/dashboard` | Basic Authentication | Any authenticated user |
| `/profile` | Basic Authentication | Any authenticated user |

#### Production Routes (14 routes)
| Route | Protection Type | Required Access | Notes |
|-------|----------------|-----------------|-------|
| `/workorders` | Permission | `workorders.read` | Work order list |
| `/workorders/:id` | Permission | `workorders.read` | Work order details |
| `/workorders/:id/edit` | Permission | `workorders.write` | Edit work order |
| `/workorders/:id/execute/:op` | Permission | `workorders.execute` | Shop floor execution |
| `/operations` | Role | Production Planner, Plant Manager | Operations management |
| `/operations/create` | Role | Production Planner, Plant Manager | Create operations |
| `/routings` | Role | Production Planner, Plant Manager, Manufacturing Engineer | Routing management |
| `/routings/create` | Role | Production Planner, Plant Manager, Manufacturing Engineer | Create routing |
| `/routings/templates` | Role | Production Planner, Plant Manager, Manufacturing Engineer | Routing templates |
| `/routings/:id/edit` | Role | Production Planner, Plant Manager, Manufacturing Engineer | Edit routing |
| `/routings/:id` | Role | Production Planner, Plant Manager, Manufacturing Engineer | Routing details |
| `/production/scheduling` | Role | Production Planner, Plant Manager | Production scheduling |
| `/production/scheduling/:id` | Role | Production Planner, Plant Manager | Schedule details |
| `/production/team-queue` | Role | Production Supervisor, Plant Manager | Team work queue |

#### Quality Routes (7 routes)
| Route | Protection Type | Required Access | Notes |
|-------|----------------|-----------------|-------|
| `/quality` | Role | Quality Engineer, Quality Inspector | Quality dashboard |
| `/quality/inspections` | Role | Quality Engineer, Quality Inspector | Inspections list |
| `/quality/inspections/:id` | Role | Quality Engineer, Quality Inspector | Inspection details |
| `/quality/ncrs` | Role | Quality Engineer | NCR management |
| `/quality/ncrs/:id` | Role | Quality Engineer | NCR details |
| `/signatures` | Role | Quality Engineer, Quality Inspector | Electronic signatures |
| `/fai` | Role | Quality Engineer, Quality Inspector | FAI reports |
| `/fai/create` | Role | Quality Engineer | Create FAI report |
| `/fai/:id` | Role | Quality Engineer, Quality Inspector | FAI details |

#### Materials & Traceability Routes (9 routes)
| Route | Protection Type | Required Access | Notes |
|-------|----------------|-----------------|-------|
| `/materials` | Permission | `materials.read` | **PLACEHOLDER PAGE** |
| `/kits` | Role | Production Planner, Manufacturing Engineer, Material Coordinator, Plant Manager | Kit management |
| `/kits/analytics` | Role | Production Planner, Manufacturing Engineer, Material Coordinator, Plant Manager | Kit analytics |
| `/staging` | Role | Production Planner, Manufacturing Engineer, Material Coordinator, Plant Manager | Material staging |
| `/traceability` | Permission | `traceability.read` | Material traceability |
| `/traceability/:serialNumber` | Permission | `traceability.read` | Serial traceability |
| `/traceability/batch/:id` | Permission | `traceability.read` | Batch traceability |
| `/serialization` | Permission | `traceability.read` | Serialization overview |
| `/serialization/parts` | Permission | `traceability.read` | Serialized parts |

#### Work Instructions Routes (5 routes)
| Route | Protection Type | Required Access | Notes |
|-------|----------------|-----------------|-------|
| `/work-instructions` | Permission | `workinstructions.read` | Work instructions list |
| `/work-instructions/create` | Permission | `workinstructions.create` | Create work instruction |
| `/work-instructions/:id` | Permission | `workinstructions.read` | Work instruction details |
| `/work-instructions/:id/execute` | Permission | `workinstructions.execute` | Execute work instruction |

#### Equipment Routes (1 route)
| Route | Protection Type | Required Access | Notes |
|-------|----------------|-----------------|-------|
| `/equipment` | Role | Maintenance Technician, Plant Manager | Equipment maintenance |

#### Integration Routes (4 routes)
| Route | Protection Type | Required Access | Notes |
|-------|----------------|-----------------|-------|
| `/integrations` | Role | Plant Manager, System Administrator | Integration dashboard |
| `/integrations/config` | Role | Plant Manager, System Administrator | Integration config |
| `/integrations/config/:id` | Role | Plant Manager, System Administrator | Specific integration |
| `/integrations/logs` | Role | Plant Manager, System Administrator | Integration logs |

#### Administrative Routes (4 routes)
| Route | Protection Type | Required Access | Notes |
|-------|----------------|-----------------|-------|
| `/personnel` | Role | Plant Manager, System Administrator | **PLACEHOLDER PAGE** |
| `/admin` | Role | System Administrator | **PLACEHOLDER PAGE** |
| `/settings` | Basic Authentication | Any authenticated user | **PLACEHOLDER PAGE** |
| `/sprint3-demo` | Basic Authentication | Any authenticated user | Demo/showcase |

## RBAC Implementation Analysis

### Access Control Patterns

#### 1. Permission-Based Control (Fine-Grained)
```typescript
<ProtectedRoute permissions={['workorders.read']}>
  <WorkOrders />
</ProtectedRoute>
```
- **Usage**: 11 routes use permission-based protection
- **Benefits**: Granular control, flexible assignment
- **Use Cases**: Work orders, materials, traceability, work instructions

#### 2. Role-Based Control (Functional)
```typescript
<ProtectedRoute roles={['Quality Engineer', 'Quality Inspector']}>
  <Inspections />
</ProtectedRoute>
```
- **Usage**: 32 routes use role-based protection
- **Benefits**: Clear functional boundaries
- **Use Cases**: Quality functions, production management, administration

#### 3. Basic Authentication (Universal)
```typescript
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>
```
- **Usage**: 4 routes use basic authentication
- **Benefits**: Simple access control
- **Use Cases**: Dashboard, profile, settings, demo pages

### Hierarchical Access Control

#### Administrative Privileges
- **System Administrator**: Wildcard (`*`) permission - access to all routes
- **Plant Manager**: Broad role-based access to most operational functions
- **Automatic Escalation**: System Admins bypass all role/permission checks

#### Access Control Logic
```typescript
const checkAccess = (permissions?: string[], roles?: string[]) => {
  // System admins have universal access
  if (user.roles.includes('System Administrator')) return true;

  // Check wildcard permission
  if (user.permissions.includes('*')) return true;

  // Check specific permissions
  if (permissions && hasAnyPermission(permissions)) return true;

  // Check specific roles
  if (roles && hasAnyRole(roles)) return true;

  return false;
};
```

## Multi-Site Support

### Site-Based Access Control
- **Site Context**: Users can be assigned to specific sites
- **Data Filtering**: Route data filtered by user's site assignment
- **Site Selector**: Header component for switching between authorized sites

## Enterprise SSO Integration

### SAML Provider Support
- **Home Realm Discovery**: Automatic provider detection based on email domain
- **Multiple Providers**: Support for multiple SAML identity providers
- **Fallback Authentication**: Local authentication when SSO unavailable

## Assessment Testing Strategy

### RBAC Testing Requirements

#### Role-Based Testing (12 test scenarios)
1. **System Administrator**: Verify universal access to all 53 routes
2. **Plant Manager**: Test broad operational access
3. **Production Planner**: Verify production and routing access
4. **Production Supervisor**: Test team queue and supervision functions
5. **Manufacturing Engineer**: Verify engineering and routing access
6. **Quality Engineer**: Test quality management and NCR access
7. **Quality Inspector**: Verify inspection and FAI access
8. **Maintenance Technician**: Test equipment maintenance access
9. **Operator**: Verify execution-level access only
10. **Warehouse Manager**: Test materials and inventory access
11. **Production Scheduler**: Verify scheduling access
12. **Process Engineer**: Test process optimization access

#### Permission-Based Testing (28 permission scenarios)
- Test each permission individually
- Verify permission inheritance and combination
- Test negative access (ensure restricted users can't access)

#### Edge Cases Testing
1. **User with no roles**: Should only access dashboard and profile
2. **User with conflicting permissions**: Test resolution hierarchy
3. **Site-restricted users**: Verify data filtering works correctly
4. **Session expiration**: Test automatic logout and re-authentication
5. **SSO integration**: Test SAML provider switching and fallback

### Automated Testing Approach

#### Route Protection Testing
```typescript
describe('RBAC Route Protection', () => {
  roles.forEach(role => {
    it(`should protect routes correctly for ${role}`, async () => {
      await login(getUserWithRole(role));
      await testAllRoutes(role);
    });
  });
});
```

#### Navigation Menu Testing
```typescript
describe('Navigation Menu RBAC', () => {
  it('should show only authorized menu items', async () => {
    const menuItems = await getVisibleMenuItems();
    expect(menuItems).toMatchAccessMatrix(user.roles, user.permissions);
  });
});
```

## Security Considerations

### Route Protection Strength
- ✅ **Client-side protection**: All routes properly protected with `ProtectedRoute`
- ✅ **Server-side validation**: API endpoints must validate permissions
- ✅ **Navigation filtering**: Menu items filtered by access rights
- ✅ **Hierarchical access**: System admins have universal access

### Potential Security Issues to Test
1. **Route bypass**: Direct URL access without proper authentication
2. **Permission escalation**: Users gaining unauthorized access
3. **Session management**: Token expiration and renewal
4. **SAML security**: SSO integration vulnerabilities

## Assessment Priority Matrix

### High Priority Routes (P0 - Production Critical)
1. `/workorders` and sub-routes (core production)
2. `/quality/inspections` (regulatory compliance)
3. `/traceability` (regulatory requirement)
4. `/work-instructions/execute` (shop floor operations)

### Medium Priority Routes (P1 - Operational)
1. `/routings` (manufacturing engineering)
2. `/equipment` (maintenance operations)
3. `/quality/ncrs` (quality management)
4. `/integrations` (system connectivity)

### Lower Priority Routes (P2 - Administrative)
1. `/admin` (system administration)
2. `/personnel` (HR management)
3. `/settings` (user preferences)
4. `/sprint3-demo` (demonstration)

## Identified Issues for Assessment

### Route-Menu Mismatches
1. **Process Segments**: Menu item exists but no corresponding route
2. **Placeholder Pages**: 4 routes lead to placeholder components
3. **Navigation Redirects**: Multiple redirects may confuse users

### RBAC Complexity Areas
1. **Role Proliferation**: 12 roles may create assignment complexity
2. **Permission Granularity**: 28 permissions require careful management
3. **Mixed Protection**: Both role and permission-based protection patterns

### Testing Challenges
1. **Complex Role Matrix**: 12 roles × 53 routes = 636 test combinations
2. **Site-based Filtering**: Multi-site data access verification
3. **SSO Integration**: External identity provider testing

## Recommendations

### Assessment Focus Areas
1. **Critical Path Testing**: Focus on P0 production routes first
2. **Role Boundary Testing**: Verify each role's access boundaries
3. **Permission Inheritance**: Test complex permission combinations
4. **Placeholder Completion**: Assess functionality gaps on placeholder pages

### Automation Opportunities
1. **RBAC Matrix Testing**: Automated role × route verification
2. **Menu Consistency**: Automated navigation item validation
3. **Permission Boundary**: Automated negative access testing

---

**Assessment Date**: October 31, 2025
**Total Routes**: 53 routes analyzed
**User Roles**: 12 distinct roles
**Permissions**: 28 granular permissions
**Protection Patterns**: 3 protection methods (basic, role, permission)
**Enterprise Features**: SAML SSO, multi-site support