/**
 * Navigation Extension Framework - Type Definitions
 * Issue #427: Navigation Extension Framework with Approval Workflow
 */

/**
 * Standard menu group identifiers (pre-approved)
 */
export enum StandardMenuGroup {
  PRODUCTION = 'PRODUCTION',
  QUALITY = 'QUALITY',
  MATERIALS = 'MATERIALS',
  EQUIPMENT = 'EQUIPMENT',
  SCHEDULING = 'SCHEDULING',
  ADMIN = 'ADMIN',
  REPORTS = 'REPORTS',
}

/**
 * Navigation menu item contract
 */
export interface NavigationMenuItem {
  /** Unique menu item identifier (e.g., "extension-id:item-id") */
  id: string;
  /** Display label for menu item */
  label: string;
  /** Route path destination */
  path: string;
  /** Target menu group */
  parentGroup: string;
  /** Ant Design icon name */
  icon?: string;
  /** Display order within group (lower = higher priority) */
  order?: number;
  /** Required RBAC permission to display */
  requiredPermission?: string;
  /** Hide on mobile devices */
  hiddenOnMobile?: boolean;
  /** Badge for notifications/counts */
  badge?: {
    count?: number;
    color?: string;
    status?: 'processing' | 'success' | 'error' | 'default' | 'warning';
  };
  /** Extension ID that owns this item */
  extensionId: string;
  /** Version of the menu item schema */
  version: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Navigation menu group definition
 */
export interface NavigationMenuGroup {
  /** Unique group identifier */
  id: string;
  /** Display name for group */
  name: string;
  /** Description of group purpose */
  description?: string;
  /** Is this a standard pre-approved group */
  isStandard: boolean;
  /** Icon for group */
  icon?: string;
  /** Order of group in navigation */
  order?: number;
  /** Menu items in this group */
  items: NavigationMenuItem[];
  /** Whether group is visible (based on extensions enabled) */
  visible?: boolean;
}

/**
 * New menu group governance request
 */
export interface NewMenuGroupRequest {
  /** Unique group identifier */
  id: string;
  /** Display name for group */
  name: string;
  /** Detailed description of purpose */
  description: string;
  /** Justification for new group */
  justification: string;
  /** Extension requesting the group */
  extensionId: string;
  /** Approval level required */
  approvalRequired: 'foundation-tier' | 'admin';
  /** Suggested position in menu (lower = higher) */
  suggestedPosition?: number;
  /** Icon name */
  icon?: string;
  /** Request timestamp */
  requestedAt?: Date;
  /** Request status */
  status?: 'pending' | 'approved' | 'rejected';
  /** Approval comment/reason */
  approvalComment?: string;
}

/**
 * Navigation item validation result
 */
export interface NavigationValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
  warnings?: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * Navigation configuration from manifest
 */
export interface NavigationManifestConfig {
  menuItems?: NavigationMenuItem[];
  newGroups?: NewMenuGroupRequest[];
}

/**
 * Site-scoped navigation configuration
 */
export interface SiteNavigationConfig {
  siteId: string;
  enabledGroups: string[];
  enabledExtensions: string[];
  groups: NavigationMenuGroup[];
  lastUpdated: Date;
}

/**
 * Navigation query options
 */
export interface NavigationQueryOptions {
  groupId?: string;
  userPermissions?: string[];
  includeMobileHidden?: boolean;
  excludeDisabledExtensions?: string[];
  siteId?: string;
}

/**
 * Navigation event
 */
export interface NavigationEvent {
  type: 'ITEM_ADDED' | 'ITEM_REMOVED' | 'ITEM_UPDATED' | 'GROUP_APPROVED' | 'GROUP_CREATED';
  itemId?: string;
  groupId?: string;
  extensionId: string;
  timestamp: Date;
  details?: Record<string, any>;
}

/**
 * Navigation registry interface
 */
export interface INavigationRegistry {
  /**
   * Register a menu item
   */
  registerMenuItem(item: NavigationMenuItem): void;

  /**
   * Unregister a menu item
   */
  unregisterMenuItem(itemId: string): void;

  /**
   * Get menu item by ID
   */
  getMenuItem(itemId: string): NavigationMenuItem | undefined;

  /**
   * Get all items in a group
   */
  getGroupItems(groupId: string, options?: NavigationQueryOptions): NavigationMenuItem[];

  /**
   * Get all menu groups
   */
  getGroups(): NavigationMenuGroup[];

  /**
   * Get specific group
   */
  getGroup(groupId: string): NavigationMenuGroup | undefined;

  /**
   * Request new menu group (governance)
   */
  requestNewGroup(request: NewMenuGroupRequest): void;

  /**
   * Approve new menu group (governance)
   */
  approveNewGroup(groupId: string, comment?: string): void;

  /**
   * Reject new menu group (governance)
   */
  rejectNewGroup(groupId: string, comment: string): void;

  /**
   * Validate menu item
   */
  validateMenuItem(item: NavigationMenuItem): NavigationValidationResult;

  /**
   * Get navigation tree (all groups and items)
   */
  getNavigationTree(options?: NavigationQueryOptions): NavigationMenuGroup[];

  /**
   * Get site-scoped navigation
   */
  getSiteNavigation(siteId: string): SiteNavigationConfig;

  /**
   * Update site navigation (enable/disable extensions)
   */
  updateSiteNavigation(siteId: string, extensionIds: string[]): void;

  /**
   * Listen to navigation events
   */
  onNavigationEvent(listener: (event: NavigationEvent) => void): () => void;

  /**
   * Get pending governance requests
   */
  getPendingRequests(): NewMenuGroupRequest[];

  /**
   * Get approved groups
   */
  getApprovedGroups(): NavigationMenuGroup[];
}

/**
 * Navigation errors
 */
export class NavigationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'NavigationError';
  }
}

export class MenuItemNotFoundError extends NavigationError {
  constructor(itemId: string) {
    super(`Menu item not found: ${itemId}`, 'ITEM_NOT_FOUND', { itemId });
    this.name = 'MenuItemNotFoundError';
  }
}

export class MenuGroupNotFoundError extends NavigationError {
  constructor(groupId: string) {
    super(`Menu group not found: ${groupId}`, 'GROUP_NOT_FOUND', { groupId });
    this.name = 'MenuGroupNotFoundError';
  }
}

export class MenuGroupApprovalRequiredError extends NavigationError {
  constructor(groupId: string) {
    super(`Menu group requires approval: ${groupId}`, 'APPROVAL_REQUIRED', { groupId });
    this.name = 'MenuGroupApprovalRequiredError';
  }
}

export class NavigationValidationError extends NavigationError {
  constructor(
    itemId: string,
    public validationErrors: Array<{ field: string; message: string; code: string }>
  ) {
    super(`Navigation validation failed: ${itemId}`, 'VALIDATION_ERROR', {
      itemId,
      errors: validationErrors,
    });
    this.name = 'NavigationValidationError';
  }
}

/**
 * Hook-based navigation API
 */
export interface UseNavigationReturn {
  /** All menu groups and items */
  menuItems: (groupId?: string, userPermissions?: string[]) => NavigationMenuItem[];

  /** Add menu item at runtime */
  addMenuItem: (item: NavigationMenuItem) => void;

  /** Remove menu item */
  removeMenuItem: (itemId: string) => void;

  /** Get menu groups */
  groups: () => NavigationMenuGroup[];

  /** Get navigation tree */
  navigationTree: () => NavigationMenuGroup[];

  /** Subscribe to changes */
  onNavigationChange: (callback: (event: NavigationEvent) => void) => () => void;

  /** Request new group */
  requestGroup: (request: NewMenuGroupRequest) => void;

  /** Get pending requests */
  pendingRequests: () => NewMenuGroupRequest[];
}
