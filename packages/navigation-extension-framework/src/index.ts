/**
 * Navigation Extension Framework
 *
 * Framework for managing navigation extensions with approval workflows and site-scoped configuration.
 *
 * @module navigation-extension-framework
 */

// Export types
export type {
  NavigationItem,
  NavigationGroup,
  NavigationVisibility,
  NavigationApprovalRequest,
  NavigationApprovalPolicy,
  NavigationRegistryEntry,
  NavigationContext,
  NavigationActionResult,
  NavigationState,
} from './types';

// Export store
export { useNavigationStore, type NavigationStoreActions } from './store';

// Export hooks
export {
  useRegisterNavigationItem,
  useRegisterNavigationGroup,
  useNavigationStructure,
  useNavigationApprovals,
  useNavigationItemClick,
} from './hooks';

// Export components
export {
  NavigationMenu,
  NavigationApprovalPanel,
  NavigationBreadcrumbs,
  NavigationLoading,
} from './components';

/**
 * Framework Version
 */
export const NAVIGATION_FRAMEWORK_VERSION = '2.0.0';

/**
 * Initialize navigation framework
 */
export async function initializeNavigationFramework(): Promise<void> {
  console.info(`Navigation Extension Framework v${NAVIGATION_FRAMEWORK_VERSION} initialized`);
}
