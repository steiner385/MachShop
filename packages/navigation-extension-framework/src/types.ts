/**
 * Navigation Extension Framework Types
 *
 * Type definitions for navigation items, groups, and approval workflows.
 *
 * @module navigation-extension-framework/types
 */

/**
 * Navigation item visibility conditions
 */
export interface NavigationVisibility {
  /**
   * Permissions required to see this item
   */
  requiredPermissions?: string[];

  /**
   * Roles required to see this item
   */
  requiredRoles?: string[];

  /**
   * Whether to require all or any of the permissions/roles
   */
  requirementMode?: 'all' | 'any';

  /**
   * Custom visibility function
   */
  isVisible?: (context: { userPermissions: string[]; userRoles: string[] }) => boolean;
}

/**
 * Navigation item configuration
 */
export interface NavigationItem {
  /**
   * Unique identifier for the navigation item
   */
  id: string;

  /**
   * Display label for the navigation item
   */
  label: string;

  /**
   * Icon key or component for the item
   */
  icon?: string;

  /**
   * Route path for navigation
   */
  path?: string;

  /**
   * External URL (if not a route)
   */
  href?: string;

  /**
   * Child navigation items
   */
  children?: NavigationItem[];

  /**
   * Visibility conditions
   */
  visibility?: NavigationVisibility;

  /**
   * Order in which to display (lower numbers first)
   */
  order?: number;

  /**
   * Extension ID that provides this item
   */
  extensionId?: string;

  /**
   * Parent group ID
   */
  groupId?: string;

  /**
   * Badge or count display
   */
  badge?: {
    text: string;
    color?: string;
  };

  /**
   * Whether this item opens in new window/tab
   */
  target?: '_blank' | '_self' | '_parent' | '_top';

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Navigation group configuration
 */
export interface NavigationGroup {
  /**
   * Unique identifier for the group
   */
  id: string;

  /**
   * Display label for the group
   */
  label: string;

  /**
   * Group icon
   */
  icon?: string;

  /**
   * Navigation items in this group
   */
  items: NavigationItem[];

  /**
   * Order in which to display groups
   */
  order?: number;

  /**
   * Extension that provides this group
   */
  extensionId?: string;

  /**
   * Visibility conditions for entire group
   */
  visibility?: NavigationVisibility;

  /**
   * Collapsible group behavior
   */
  collapsible?: boolean;

  /**
   * Whether group is expanded by default
   */
  defaultExpanded?: boolean;

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Navigation approval request
 */
export interface NavigationApprovalRequest {
  /**
   * Unique request identifier
   */
  id: string;

  /**
   * Type of approval being requested
   */
  type: 'add_item' | 'modify_item' | 'remove_item' | 'add_group' | 'modify_group' | 'remove_group';

  /**
   * Status of the approval request
   */
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';

  /**
   * Item or group being modified
   */
  target: NavigationItem | NavigationGroup;

  /**
   * Changes proposed
   */
  changes?: Record<string, any>;

  /**
   * Reason for the change
   */
  reason?: string;

  /**
   * User who requested the change
   */
  requestedBy: string;

  /**
   * User who approved/rejected
   */
  reviewedBy?: string;

  /**
   * Approval/rejection reason
   */
  reviewReason?: string;

  /**
   * Extension ID requesting the change
   */
  extensionId: string;

  /**
   * Site ID for the navigation change
   */
  siteId: string;

  /**
   * Created timestamp
   */
  createdAt: Date;

  /**
   * Reviewed timestamp
   */
  reviewedAt?: Date;

  /**
   * Deadline for approval
   */
  expiresAt?: Date;

  /**
   * Metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Navigation registry entry
 */
export interface NavigationRegistryEntry {
  /**
   * Item or group
   */
  target: NavigationItem | NavigationGroup;

  /**
   * Registration status
   */
  status: 'pending' | 'approved' | 'active' | 'disabled';

  /**
   * Extension providing this entry
   */
  extensionId: string;

  /**
   * Site ID
   */
  siteId: string;

  /**
   * Whether changes require approval
   */
  requiresApproval: boolean;

  /**
   * Current approval request if pending
   */
  currentApprovalRequest?: NavigationApprovalRequest;

  /**
   * Registration date
   */
  registeredAt: Date;

  /**
   * Last modified date
   */
  modifiedAt: Date;
}

/**
 * Navigation approval policy
 */
export interface NavigationApprovalPolicy {
  /**
   * Policy ID
   */
  id: string;

  /**
   * Site ID
   */
  siteId: string;

  /**
   * Whether approval is required for new navigation items
   */
  requireApprovalForNewItems: boolean;

  /**
   * Whether approval is required for modifications
   */
  requireApprovalForModifications: boolean;

  /**
   * Roles that can approve changes
   */
  approverRoles: string[];

  /**
   * Maximum approval time in days
   */
  maxApprovalDays: number;

  /**
   * Minimum approvers required
   */
  minApproversRequired: number;

  /**
   * Extensions that bypass approval
   */
  bypassExtensionIds: string[];

  /**
   * Policy is active
   */
  isActive: boolean;

  /**
   * Created date
   */
  createdAt: Date;

  /**
   * Modified date
   */
  modifiedAt: Date;
}

/**
 * Navigation store state
 */
export interface NavigationState {
  /**
   * All navigation groups
   */
  groups: NavigationGroup[];

  /**
   * All navigation items
   */
  items: NavigationItem[];

  /**
   * Pending approval requests
   */
  pendingApprovals: NavigationApprovalRequest[];

  /**
   * Approval policies per site
   */
  policies: Record<string, NavigationApprovalPolicy>;

  /**
   * Registry entries
   */
  registry: NavigationRegistryEntry[];

  /**
   * Last sync time
   */
  lastSyncTime: Date | null;

  /**
   * Loading state
   */
  isLoading: boolean;

  /**
   * Error message if any
   */
  error: string | null;
}

/**
 * Navigation context for extensions
 */
export interface NavigationContext {
  /**
   * Site ID
   */
  siteId: string;

  /**
   * Extension ID registering navigation
   */
  extensionId: string;

  /**
   * User permissions
   */
  userPermissions: string[];

  /**
   * User roles
   */
  userRoles: string[];

  /**
   * Whether user is admin
   */
  isAdmin: boolean;

  /**
   * Approval policy for this site
   */
  policy: NavigationApprovalPolicy | null;
}

/**
 * Navigation action result
 */
export interface NavigationActionResult {
  /**
   * Success status
   */
  success: boolean;

  /**
   * Item/group ID if created/modified
   */
  id?: string;

  /**
   * Approval request ID if created
   */
  approvalRequestId?: string;

  /**
   * Whether approval was required
   */
  approvalRequired: boolean;

  /**
   * Approval status if required
   */
  approvalStatus?: 'pending' | 'approved';

  /**
   * Error message if failed
   */
  error?: string;

  /**
   * Additional data
   */
  data?: any;
}
