/**
 * Navigation Registry Implementation
 * Issue #427: Navigation Extension Framework with Approval Workflow
 */

import type {
  NavigationMenuItem,
  NavigationMenuGroup,
  NewMenuGroupRequest,
  NavigationValidationResult,
  SiteNavigationConfig,
  NavigationQueryOptions,
  NavigationEvent,
  INavigationRegistry,
} from './types';

import {
  StandardMenuGroup,
  NavigationError,
  MenuItemNotFoundError,
  MenuGroupNotFoundError,
  MenuGroupApprovalRequiredError,
  NavigationValidationError,
} from './types';

/**
 * Navigation Registry - Manages menu extensions
 */
export class NavigationRegistry implements INavigationRegistry {
  private menuItems: Map<string, NavigationMenuItem> = new Map();
  private menuGroups: Map<string, NavigationMenuGroup> = new Map();
  private pendingRequests: Map<string, NewMenuGroupRequest> = new Map();
  private approvedGroups: Map<string, NavigationMenuGroup> = new Map();
  private siteConfigs: Map<string, SiteNavigationConfig> = new Map();
  private listeners: Set<(event: NavigationEvent) => void> = new Set();

  constructor() {
    this.initializeStandardGroups();
  }

  /**
   * Initialize standard menu groups (pre-approved)
   */
  private initializeStandardGroups(): void {
    const standardGroups = [
      {
        id: StandardMenuGroup.PRODUCTION,
        name: 'Production',
        description: 'Work orders, batch tracking, and execution',
        order: 1,
      },
      {
        id: StandardMenuGroup.QUALITY,
        name: 'Quality',
        description: 'Inspections, hold/release, MRB processes',
        order: 2,
      },
      {
        id: StandardMenuGroup.MATERIALS,
        name: 'Materials',
        description: 'Inventory management and stock control',
        order: 3,
      },
      {
        id: StandardMenuGroup.EQUIPMENT,
        name: 'Equipment',
        description: 'Asset management and maintenance',
        order: 4,
      },
      {
        id: StandardMenuGroup.SCHEDULING,
        name: 'Scheduling',
        description: 'Planning, Gantt charts, and shift management',
        order: 5,
      },
      {
        id: StandardMenuGroup.ADMIN,
        name: 'Administration',
        description: 'System settings and user management',
        order: 6,
      },
      {
        id: StandardMenuGroup.REPORTS,
        name: 'Reports',
        description: 'Analytics and custom reporting',
        order: 7,
      },
    ];

    for (const group of standardGroups) {
      const menuGroup: NavigationMenuGroup = {
        id: group.id,
        name: group.name,
        description: group.description,
        isStandard: true,
        order: group.order,
        items: [],
        visible: true,
      };

      this.menuGroups.set(group.id, menuGroup);
      this.approvedGroups.set(group.id, menuGroup);
    }
  }

  /**
   * Register a menu item
   */
  registerMenuItem(item: NavigationMenuItem): void {
    // Validate item
    const validation = this.validateMenuItem(item);
    if (!validation.valid) {
      throw new NavigationValidationError(item.id, validation.errors);
    }

    // Check parent group exists
    const group = this.menuGroups.get(item.parentGroup);
    if (!group) {
      // Check if new group is approved
      const approvedGroup = this.approvedGroups.get(item.parentGroup);
      if (!approvedGroup) {
        throw new MenuGroupNotFoundError(item.parentGroup);
      }
    }

    this.menuItems.set(item.id, item);

    // Add to group
    const targetGroup = this.menuGroups.get(item.parentGroup) || this.approvedGroups.get(item.parentGroup);
    if (targetGroup) {
      targetGroup.items.push(item);
      // Sort items by order
      targetGroup.items.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    }

    this.emitEvent({
      type: 'ITEM_ADDED',
      itemId: item.id,
      groupId: item.parentGroup,
      extensionId: item.extensionId,
      timestamp: new Date(),
    });
  }

  /**
   * Unregister a menu item
   */
  unregisterMenuItem(itemId: string): void {
    const item = this.menuItems.get(itemId);
    if (!item) {
      throw new MenuItemNotFoundError(itemId);
    }

    this.menuItems.delete(itemId);

    // Remove from group
    const group = this.menuGroups.get(item.parentGroup) || this.approvedGroups.get(item.parentGroup);
    if (group) {
      group.items = group.items.filter(i => i.id !== itemId);
    }

    this.emitEvent({
      type: 'ITEM_REMOVED',
      itemId,
      groupId: item.parentGroup,
      extensionId: item.extensionId,
      timestamp: new Date(),
    });
  }

  /**
   * Get menu item by ID
   */
  getMenuItem(itemId: string): NavigationMenuItem | undefined {
    return this.menuItems.get(itemId);
  }

  /**
   * Get all items in a group (with filtering)
   */
  getGroupItems(groupId: string, options?: NavigationQueryOptions): NavigationMenuItem[] {
    const group = this.menuGroups.get(groupId) || this.approvedGroups.get(groupId);
    if (!group) {
      return [];
    }

    let items = [...group.items];

    // Filter by permissions
    if (options?.userPermissions) {
      items = items.filter(
        item =>
          !item.requiredPermission || options.userPermissions!.includes(item.requiredPermission)
      );
    }

    // Filter mobile hidden
    if (!options?.includeMobileHidden) {
      items = items.filter(item => !item.hiddenOnMobile);
    }

    // Filter disabled extensions
    if (options?.excludeDisabledExtensions) {
      items = items.filter(item => !options.excludeDisabledExtensions!.includes(item.extensionId));
    }

    return items;
  }

  /**
   * Get all menu groups
   */
  getGroups(): NavigationMenuGroup[] {
    return Array.from(this.menuGroups.values());
  }

  /**
   * Get specific group
   */
  getGroup(groupId: string): NavigationMenuGroup | undefined {
    return this.menuGroups.get(groupId) || this.approvedGroups.get(groupId);
  }

  /**
   * Request new menu group (governance)
   */
  requestNewGroup(request: NewMenuGroupRequest): void {
    if (this.menuGroups.has(request.id)) {
      throw new NavigationError(
        `Menu group already exists: ${request.id}`,
        'GROUP_ALREADY_EXISTS',
        { groupId: request.id }
      );
    }

    request.status = 'pending';
    request.requestedAt = new Date();

    this.pendingRequests.set(request.id, request);

    this.emitEvent({
      type: 'GROUP_CREATED',
      groupId: request.id,
      extensionId: request.extensionId,
      timestamp: new Date(),
      details: { status: 'pending', approvalRequired: request.approvalRequired },
    });
  }

  /**
   * Approve new menu group (governance)
   */
  approveNewGroup(groupId: string, comment?: string): void {
    const request = this.pendingRequests.get(groupId);
    if (!request) {
      throw new NavigationError(
        `No pending request for group: ${groupId}`,
        'REQUEST_NOT_FOUND',
        { groupId }
      );
    }

    request.status = 'approved';
    request.approvalComment = comment;

    // Create the group
    const newGroup: NavigationMenuGroup = {
      id: groupId,
      name: request.name,
      description: request.description,
      isStandard: false,
      order: request.suggestedPosition ?? 999,
      icon: request.icon,
      items: [],
      visible: true,
    };

    this.menuGroups.set(groupId, newGroup);
    this.approvedGroups.set(groupId, newGroup);
    this.pendingRequests.delete(groupId);

    this.emitEvent({
      type: 'GROUP_APPROVED',
      groupId,
      extensionId: request.extensionId,
      timestamp: new Date(),
      details: { comment },
    });
  }

  /**
   * Reject new menu group (governance)
   */
  rejectNewGroup(groupId: string, comment: string): void {
    const request = this.pendingRequests.get(groupId);
    if (!request) {
      throw new NavigationError(
        `No pending request for group: ${groupId}`,
        'REQUEST_NOT_FOUND',
        { groupId }
      );
    }

    request.status = 'rejected';
    request.approvalComment = comment;

    this.pendingRequests.delete(groupId);
  }

  /**
   * Validate menu item
   */
  validateMenuItem(item: NavigationMenuItem): NavigationValidationResult {
    const errors: Array<{ field: string; message: string; code: string }> = [];

    // Required fields
    if (!item.id) errors.push({ field: 'id', message: 'ID is required', code: 'REQUIRED' });
    if (!item.label) errors.push({ field: 'label', message: 'Label is required', code: 'REQUIRED' });
    if (!item.path) errors.push({ field: 'path', message: 'Path is required', code: 'REQUIRED' });
    if (!item.parentGroup)
      errors.push({ field: 'parentGroup', message: 'Parent group is required', code: 'REQUIRED' });
    if (!item.extensionId)
      errors.push({ field: 'extensionId', message: 'Extension ID is required', code: 'REQUIRED' });
    if (!item.version) errors.push({ field: 'version', message: 'Version is required', code: 'REQUIRED' });

    // Validate path format
    if (item.path && !item.path.startsWith('/')) {
      errors.push({ field: 'path', message: 'Path must start with /', code: 'INVALID_FORMAT' });
    }

    // Validate icon if provided
    if (item.icon && !this.isValidAntDesignIcon(item.icon)) {
      errors.push({
        field: 'icon',
        message: `Invalid Ant Design icon name: ${item.icon}`,
        code: 'INVALID_ICON',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate Ant Design icon name (basic check)
   */
  private isValidAntDesignIcon(iconName: string): boolean {
    // Basic validation - icons should be PascalCase and end with "Outlined", "Filled", or "TwoTone"
    return /^[A-Z][a-zA-Z]+(Outlined|Filled|TwoTone)$/.test(iconName);
  }

  /**
   * Get navigation tree (all groups and items)
   */
  getNavigationTree(options?: NavigationQueryOptions): NavigationMenuGroup[] {
    const groups = Array.from(this.menuGroups.values());

    // Filter by options
    return groups
      .map(group => ({
        ...group,
        items: this.getGroupItems(group.id, options),
      }))
      .filter(group => group.items.length > 0 || group.isStandard)
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }

  /**
   * Get site-scoped navigation
   */
  getSiteNavigation(siteId: string): SiteNavigationConfig {
    return (
      this.siteConfigs.get(siteId) || {
        siteId,
        enabledGroups: Array.from(this.menuGroups.keys()),
        enabledExtensions: [],
        groups: this.getNavigationTree(),
        lastUpdated: new Date(),
      }
    );
  }

  /**
   * Update site navigation (enable/disable extensions)
   */
  updateSiteNavigation(siteId: string, extensionIds: string[]): void {
    const config = this.getSiteNavigation(siteId);
    config.enabledExtensions = extensionIds;
    config.lastUpdated = new Date();

    // Get all extension IDs that are NOT enabled (to exclude them)
    const allExtensions = new Set<string>();
    this.getNavigationTree().forEach(group => {
      group.items.forEach(item => {
        allExtensions.add(item.extensionId);
      });
    });

    const disabledExtensions = Array.from(allExtensions).filter(
      id => !config.enabledExtensions.includes(id)
    );

    // Rebuild groups based on enabled extensions
    config.groups = this.getNavigationTree({
      excludeDisabledExtensions: disabledExtensions,
    });

    this.siteConfigs.set(siteId, config);
  }

  /**
   * Listen to navigation events
   */
  onNavigationEvent(listener: (event: NavigationEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Emit navigation event
   */
  private emitEvent(event: NavigationEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  /**
   * Get pending governance requests
   */
  getPendingRequests(): NewMenuGroupRequest[] {
    return Array.from(this.pendingRequests.values()).filter(r => r.status === 'pending');
  }

  /**
   * Get approved groups
   */
  getApprovedGroups(): NavigationMenuGroup[] {
    return Array.from(this.approvedGroups.values());
  }
}

/**
 * Create navigation registry instance
 */
let navigationRegistry: NavigationRegistry | null = null;

export function getNavigationRegistry(): NavigationRegistry {
  if (!navigationRegistry) {
    navigationRegistry = new NavigationRegistry();
  }
  return navigationRegistry;
}
