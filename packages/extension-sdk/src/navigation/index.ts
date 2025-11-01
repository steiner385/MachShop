/**
 * Navigation Extension Framework - Module Exports
 * Issue #427: Navigation Extension Framework with Approval Workflow
 */

// Types and interfaces
export type {
  NavigationMenuItem,
  NavigationMenuGroup,
  NewMenuGroupRequest,
  NavigationValidationResult,
  NavigationManifestConfig,
  SiteNavigationConfig,
  NavigationQueryOptions,
  NavigationEvent,
  INavigationRegistry,
  UseNavigationReturn,
} from './types';

export {
  StandardMenuGroup,
  NavigationError,
  MenuItemNotFoundError,
  MenuGroupNotFoundError,
  MenuGroupApprovalRequiredError,
  NavigationValidationError,
} from './types';

// Registry
export { NavigationRegistry, getNavigationRegistry } from './registry';

// React Hooks
export {
  useNavigation,
  useNavigationGovernance,
  useMenuItemSearch,
  useMenuItem,
  useMenuGroup,
  usePermissionBasedNavigation,
  useSiteNavigation,
} from './hooks';

// React Component
export { NavigationMenu } from './NavigationMenu';
export type { NavigationMenuProps } from './NavigationMenu';

// API
export { createNavigationRouter, registerNavigationRoutes } from './api';
