# Navigation Extension Framework Guide

## Overview

The Navigation Extension Framework provides a robust system for managing menu hierarchies, governance workflows, and permission-based navigation in the MachShop Extension SDK. It enables extensions to contribute menu items to standard menu groups or request new groups through an approval workflow.

**Issue #427**: Navigation Extension Framework with Approval Workflow

## Features

- **Menu Item Registration**: Register menu items with validation and permission controls
- **Standard Menu Groups**: 7 pre-approved menu groups (Production, Quality, Materials, Equipment, Scheduling, Admin, Reports)
- **Governance Workflow**: Request, approve, and reject new menu groups
- **Permission-Based Filtering**: Automatic filtering based on user permissions and extension status
- **Mobile Support**: Hide items on mobile devices with `hiddenOnMobile` flag
- **Site-Scoped Navigation**: Enable/disable extensions per site
- **Event System**: Subscribe to navigation changes and governance events
- **React Hooks**: 7 custom hooks for component integration
- **REST API**: Complete API for navigation management

## Quick Start

### Basic Menu Item Registration

```typescript
import { getNavigationRegistry, StandardMenuGroup } from '@extension-sdk/navigation';

const registry = getNavigationRegistry();

registry.registerMenuItem({
  id: 'my-ext:dashboard',
  label: 'Dashboard',
  path: '/my-extension/dashboard',
  parentGroup: StandardMenuGroup.PRODUCTION,
  extensionId: 'my-extension',
  version: '1.0.0',
  icon: 'DashboardOutlined',
  order: 1,
});
```

### Using React Hooks

```typescript
import { useNavigation } from '@extension-sdk/navigation';

function MyComponent() {
  const { navigationTree, addMenuItem, onNavigationChange } = useNavigation({
    userPermissions: ['PRODUCTION_VIEW'],
    includeMobileHidden: false,
  });

  // Subscribe to changes
  useEffect(() => {
    const unsubscribe = onNavigationChange((event) => {
      console.log('Navigation changed:', event);
    });
    return unsubscribe;
  }, [onNavigationChange]);

  return (
    <div>
      {navigationTree().map(group => (
        <h2 key={group.id}>{group.name}</h2>
      ))}
    </div>
  );
}
```

### Rendering Navigation Menu

```typescript
import { NavigationMenu } from '@extension-sdk/navigation';

function App() {
  return (
    <NavigationMenu
      userPermissions={['ADMIN']}
      enableSearch={true}
      onItemClick={(item) => navigate(item.path)}
      showBadges={true}
    />
  );
}
```

## Standard Menu Groups

The framework comes with 7 pre-approved menu groups:

| Group ID | Name | Description | Order |
|----------|------|-------------|-------|
| `PRODUCTION` | Production | Work orders, batch tracking, and execution | 1 |
| `QUALITY` | Quality | Inspections, hold/release, MRB processes | 2 |
| `MATERIALS` | Materials | Inventory management and stock control | 3 |
| `EQUIPMENT` | Equipment | Asset management and maintenance | 4 |
| `SCHEDULING` | Scheduling | Planning, Gantt charts, and shift management | 5 |
| `ADMIN` | Administration | System settings and user management | 6 |
| `REPORTS` | Reports | Analytics and custom reporting | 7 |

## API Reference

### NavigationRegistry Class

The core registry for managing navigation. Use `getNavigationRegistry()` to get the singleton instance.

#### Menu Item Methods

**registerMenuItem(item: NavigationMenuItem): void**
- Registers a new menu item with validation
- Throws `NavigationValidationError` if item is invalid
- Throws `MenuGroupNotFoundError` if parent group doesn't exist

```typescript
registry.registerMenuItem({
  id: 'ext-id:item-id',
  label: 'Menu Item',
  path: '/path/to/item',
  parentGroup: StandardMenuGroup.PRODUCTION,
  extensionId: 'ext-id',
  version: '1.0.0',
  icon: 'HomeOutlined',
  order: 5,
  requiredPermission: 'ADMIN',
  hiddenOnMobile: false,
  badge: { count: 5, status: 'warning' },
});
```

**unregisterMenuItem(itemId: string): void**
- Removes a menu item from the registry
- Throws `MenuItemNotFoundError` if item doesn't exist

**getMenuItem(itemId: string): NavigationMenuItem | undefined**
- Retrieves a single menu item by ID

**getGroupItems(groupId: string, options?: NavigationQueryOptions): NavigationMenuItem[]**
- Gets all items in a group with optional filtering
- Filters by permissions, mobile visibility, and disabled extensions

```typescript
const items = registry.getGroupItems(StandardMenuGroup.PRODUCTION, {
  userPermissions: ['ADMIN', 'USER'],
  includeMobileHidden: true,
  excludeDisabledExtensions: ['disabled-ext-1'],
});
```

#### Group Methods

**getGroups(): NavigationMenuGroup[]**
- Returns all menu groups

**getGroup(groupId: string): NavigationMenuGroup | undefined**
- Returns a specific menu group with its items

**getNavigationTree(options?: NavigationQueryOptions): NavigationMenuGroup[]**
- Returns complete navigation tree, sorted by order
- Returns only groups that have visible items (unless group is standard)

#### Governance Methods

**requestNewGroup(request: NewMenuGroupRequest): void**
- Submits a new menu group for approval
- Sets status to 'pending' automatically
- Throws `NavigationError` if group ID already exists

```typescript
registry.requestNewGroup({
  id: 'custom-group',
  name: 'Custom Workflow',
  description: 'For custom business processes',
  justification: 'Needed for new feature X',
  extensionId: 'my-extension',
  approvalRequired: 'admin',
  suggestedPosition: 3,
  icon: 'WorkflowOutlined',
});
```

**approveNewGroup(groupId: string, comment?: string): void**
- Approves a pending group request
- Creates the group and adds it to both `menuGroups` and `approvedGroups`
- Removes from `pendingRequests`
- Throws `NavigationError` if no pending request exists

**rejectNewGroup(groupId: string, comment: string): void**
- Rejects a pending group request
- Removes from `pendingRequests`
- Stores rejection comment
- Throws `NavigationError` if no pending request exists

**getPendingRequests(): NewMenuGroupRequest[]**
- Returns all pending governance requests

**getApprovedGroups(): NavigationMenuGroup[]**
- Returns all approved menu groups (standard + custom)

#### Validation Methods

**validateMenuItem(item: NavigationMenuItem): NavigationValidationResult**
- Validates a menu item without registering it
- Checks required fields: id, label, path, parentGroup, extensionId, version
- Validates path format (must start with `/`)
- Validates Ant Design icon format if provided

```typescript
const validation = registry.validateMenuItem(item);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}
```

#### Site-Scoped Navigation

**getSiteNavigation(siteId: string): SiteNavigationConfig**
- Gets navigation configuration for a specific site
- Returns enabled groups, enabled extensions, and complete navigation tree

**updateSiteNavigation(siteId: string, enabledExtensions: string[]): void**
- Updates which extensions are enabled for a site
- Automatically filters navigation tree to only include enabled extensions
- Updates `lastUpdated` timestamp

```typescript
registry.updateSiteNavigation('site-1', ['ext-1', 'ext-2', 'ext-3']);
```

#### Event System

**onNavigationEvent(listener: (event: NavigationEvent) => void): () => void**
- Subscribes to navigation events
- Returns unsubscribe function

```typescript
const unsubscribe = registry.onNavigationEvent((event) => {
  switch (event.type) {
    case 'ITEM_ADDED':
      console.log(`Item ${event.itemId} added by ${event.extensionId}`);
      break;
    case 'ITEM_REMOVED':
      console.log(`Item ${event.itemId} removed`);
      break;
    case 'GROUP_CREATED':
      console.log(`Group request created by ${event.extensionId}`);
      break;
    case 'GROUP_APPROVED':
      console.log(`Group ${event.groupId} approved`);
      break;
    case 'ITEM_UPDATED':
      console.log(`Item ${event.itemId} updated`);
      break;
  }
});

// Later: unsubscribe();
```

## React Hooks

### useNavigation(options?)

Main hook for accessing navigation with automatic filtering.

```typescript
const {
  menuItems,        // (groupId?, permissions?) => NavigationMenuItem[]
  addMenuItem,      // (item: NavigationMenuItem) => void
  removeMenuItem,   // (itemId: string) => void
  groups,           // () => NavigationMenuGroup[]
  navigationTree,   // () => NavigationMenuGroup[]
  onNavigationChange, // (callback: (event) => void) => () => void
  requestGroup,     // (request: NewMenuGroupRequest) => void
  pendingRequests,  // () => NewMenuGroupRequest[]
} = useNavigation({
  userPermissions: ['ADMIN'],
  includeMobileHidden: false,
  excludeDisabledExtensions: [],
  siteId: 'site-1',
});
```

### useNavigationGovernance()

Hook for managing group approval workflows.

```typescript
const {
  pendingRequests,   // NewMenuGroupRequest[]
  approvedGroups,    // NavigationMenuGroup[]
  approveGroup,      // (groupId: string, comment?: string) => void
  rejectGroup,       // (groupId: string, comment: string) => void
  requestNewGroup,   // (request: NewMenuGroupRequest) => void
} = useNavigationGovernance();
```

### useMenuItemSearch(searchTerm, options?)

Hook for searching menu items by label, path, or metadata.

```typescript
const searchResults = useMenuItemSearch('Dashboard', {
  userPermissions: ['USER'],
});
```

### useMenuItem(itemId?)

Hook to watch a specific menu item and react to changes.

```typescript
const item = useMenuItem('my-ext:dashboard');

useEffect(() => {
  if (item) {
    console.log('Item updated:', item);
  }
}, [item]);
```

### useMenuGroup(groupId?)

Hook to watch a specific menu group and its items.

```typescript
const group = useMenuGroup(StandardMenuGroup.PRODUCTION);

useEffect(() => {
  if (group) {
    console.log(`Group has ${group.items.length} items`);
  }
}, [group]);
```

### usePermissionBasedNavigation(userPermissions)

Hook that automatically filters navigation based on user permissions.

```typescript
const filteredTree = usePermissionBasedNavigation(['ADMIN', 'USER']);
```

### useSiteNavigation(siteId, enabledExtensions)

Hook for site-scoped navigation management.

```typescript
const siteConfig = useSiteNavigation('site-1', ['ext-1', 'ext-2']);
```

## NavigationMenu Component

Pre-built React component for rendering the navigation menu.

### Props

```typescript
interface NavigationMenuProps {
  className?: string;
  style?: React.CSSProperties;
  userPermissions?: string[];
  onItemClick?: (item: NavigationMenuItem) => void;
  onGroupToggle?: (groupId: string, expanded: boolean) => void;
  enableSearch?: boolean;
  isMobile?: boolean;
  excludeDisabledExtensions?: string[];
  siteId?: string;
  renderMenuItem?: (item: NavigationMenuItem) => React.ReactNode;
  renderMenuGroup?: (group: NavigationMenuGroup, content: React.ReactNode) => React.ReactNode;
  showBadges?: boolean;
}
```

### Usage

```typescript
import { NavigationMenu } from '@extension-sdk/navigation';

<NavigationMenu
  userPermissions={['ADMIN', 'PRODUCTION_VIEW']}
  enableSearch={true}
  onItemClick={(item) => navigate(item.path)}
  onGroupToggle={(groupId, expanded) => console.log(groupId, expanded)}
  showBadges={true}
  renderMenuItem={(item) => (
    <div className="custom-item">{item.label}</div>
  )}
/>
```

## REST API Endpoints

### GET /api/navigation/menu
Get complete navigation tree for authenticated user.

**Query Parameters:**
- `userPermissions`: Comma-separated permissions
- `includeMobileHidden`: Include mobile-hidden items (boolean)
- `excludeDisabledExtensions`: Comma-separated extension IDs to exclude
- `siteId`: Site ID for scoped navigation

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "PRODUCTION",
      "name": "Production",
      "description": "...",
      "isStandard": true,
      "order": 1,
      "items": [...]
    }
  ]
}
```

### GET /api/navigation/groups
Get all menu groups.

### GET /api/navigation/groups/:groupId
Get specific menu group with items.

### GET /api/navigation/items/:itemId
Get specific menu item.

### POST /api/navigation/items
Register new menu item.

**Body:**
```json
{
  "id": "ext:item",
  "label": "Item Label",
  "path": "/path",
  "parentGroup": "PRODUCTION",
  "extensionId": "ext",
  "version": "1.0.0",
  "icon": "HomeOutlined"
}
```

### DELETE /api/navigation/items/:itemId
Unregister menu item.

### POST /api/navigation/groups/request
Request new menu group.

**Body:**
```json
{
  "id": "custom-group",
  "name": "Custom Group",
  "description": "Description",
  "justification": "Why this group is needed",
  "extensionId": "ext-id",
  "approvalRequired": "admin"
}
```

### GET /api/navigation/groups/pending
Get pending group requests (requires `admin:navigation` permission).

### POST /api/navigation/groups/:groupId/approve
Approve pending group request (requires `admin:navigation` permission).

**Body:**
```json
{
  "comment": "Approved"
}
```

### POST /api/navigation/groups/:groupId/reject
Reject pending group request (requires `admin:navigation` permission).

**Body:**
```json
{
  "comment": "Rejection reason"
}
```

### GET /api/navigation/sites/:siteId/config
Get site-scoped navigation configuration.

### PUT /api/navigation/sites/:siteId/config
Update site-scoped navigation.

**Body:**
```json
{
  "enabledExtensions": ["ext-1", "ext-2"]
}
```

### POST /api/navigation/validate
Validate menu item configuration without registering.

## Data Types

### NavigationMenuItem

```typescript
interface NavigationMenuItem {
  id: string;                           // Unique ID (e.g., "ext-id:item-id")
  label: string;                        // Display label
  path: string;                         // Route path (must start with /)
  parentGroup: string;                  // Parent group ID
  icon?: string;                        // Ant Design icon name
  order?: number;                       // Display order (lower = higher priority)
  requiredPermission?: string;          // Required RBAC permission
  hiddenOnMobile?: boolean;             // Hide on mobile devices
  badge?: {                             // Notification badge
    count?: number;
    color?: string;
    status?: 'processing' | 'success' | 'error' | 'default' | 'warning';
  };
  extensionId: string;                  // Extension that owns this item
  version: string;                      // Schema version
  metadata?: Record<string, any>;       // Additional metadata
}
```

### NavigationMenuGroup

```typescript
interface NavigationMenuGroup {
  id: string;                           // Unique group ID
  name: string;                         // Display name
  description?: string;                 // Group description
  isStandard: boolean;                  // Pre-approved standard group
  icon?: string;                        // Ant Design icon name
  order?: number;                       // Group display order
  items: NavigationMenuItem[];          // Items in this group
  visible?: boolean;                    // Whether group is visible
}
```

### NewMenuGroupRequest

```typescript
interface NewMenuGroupRequest {
  id: string;                           // Unique group ID
  name: string;                         // Display name
  description: string;                  // Detailed description
  justification: string;                // Why this group is needed
  extensionId: string;                  // Requesting extension
  approvalRequired: 'foundation-tier' | 'admin'; // Approval level
  suggestedPosition?: number;           // Suggested position in menu
  icon?: string;                        // Icon name
  requestedAt?: Date;                   // Submission timestamp
  status?: 'pending' | 'approved' | 'rejected'; // Request status
  approvalComment?: string;             // Approval/rejection reason
}
```

## Error Handling

The framework provides specific error types for better error handling:

```typescript
import {
  NavigationError,
  MenuItemNotFoundError,
  MenuGroupNotFoundError,
  NavigationValidationError,
  MenuGroupApprovalRequiredError,
} from '@extension-sdk/navigation';

try {
  registry.registerMenuItem(item);
} catch (error) {
  if (error instanceof NavigationValidationError) {
    console.log('Validation errors:', error.validationErrors);
  } else if (error instanceof MenuGroupNotFoundError) {
    console.log('Parent group not found');
  }
}
```

## Permission Model

Navigation supports RBAC (Role-Based Access Control) through the `requiredPermission` field on menu items. When filtering navigation:

1. Items without `requiredPermission` are always visible
2. Items with `requiredPermission` are only visible if user has that permission
3. Empty permission list means user has no access

```typescript
// Item is visible to all users
const publicItem: NavigationMenuItem = {
  id: 'item-1',
  label: 'Public Item',
  path: '/public',
  parentGroup: StandardMenuGroup.PRODUCTION,
  extensionId: 'ext-1',
  version: '1.0.0',
};

// Item only visible to ADMIN users
const adminItem: NavigationMenuItem = {
  id: 'item-2',
  label: 'Admin Item',
  path: '/admin',
  parentGroup: StandardMenuGroup.ADMIN,
  extensionId: 'ext-1',
  version: '1.0.0',
  requiredPermission: 'ADMIN',
};
```

## Icon Support

The framework validates Ant Design icon names. Valid icon names follow the pattern:
- Must start with uppercase letter
- Must end with `Outlined`, `Filled`, or `TwoTone`

Valid examples:
- `HomeOutlined`
- `ShoppingFilled`
- `SettingTwoTone`
- `DashboardOutlined`

Invalid examples:
- `home` (lowercase)
- `HomeIcon` (wrong suffix)
- `H` (too short)

## Testing

The navigation framework includes a comprehensive test suite:

```bash
npm test -- src/tests/extension-sdk/navigation-registry.test.ts
```

Test coverage includes:
- Menu item registration and validation
- Menu group governance workflows
- Permission-based filtering
- Event system
- Site-scoped navigation
- Singleton pattern
- Edge cases and concurrent operations

## Best Practices

1. **Use Standard Groups**: Prefer using the 7 standard menu groups when possible
2. **Unique IDs**: Use format `extension-id:item-id` for menu item IDs
3. **Icon Names**: Always use valid Ant Design icon names
4. **Path Format**: Ensure paths start with `/` and follow route structure
5. **Permissions**: Be explicit about permission requirements
6. **Mobile Optimization**: Mark items as `hiddenOnMobile` if not appropriate for mobile
7. **Event Subscriptions**: Always unsubscribe from events to prevent memory leaks
8. **Error Handling**: Catch specific error types for better UX

## Troubleshooting

### Item Not Appearing in Menu

1. Verify parent group exists
2. Check user has required permissions
3. Verify item is not hidden on mobile
4. Check extension is enabled for the site
5. Ensure path starts with `/`

### Governance Request Not Approved

1. Verify admin user has `admin:navigation` permission
2. Check request is in pending status
3. Verify group ID is unique

### Icon Not Displaying

1. Check icon name matches Ant Design format
2. Verify spelling and capitalization
3. Test with `registry.validateMenuItem()`

## Contributing

When extending the navigation framework:

1. Maintain backward compatibility
2. Add tests for new features
3. Update this documentation
4. Follow existing code patterns
5. Use TypeScript strict mode
6. Document any new event types

## Support

For issues or questions about the Navigation Extension Framework, refer to Issue #427 or contact the Extension SDK team.
