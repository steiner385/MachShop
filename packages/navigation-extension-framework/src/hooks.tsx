/**
 * Navigation Extension Framework Hooks
 *
 * React hooks for registering and managing navigation extensions.
 *
 * @module navigation-extension-framework/hooks
 */

import * as React from 'react';
import { useExtensionContext } from '@machshop/frontend-extension-sdk';
import {
  NavigationItem,
  NavigationGroup,
  NavigationApprovalRequest,
  NavigationActionResult,
} from './types';
import { useNavigationStore } from './store';

/**
 * Hook to register a navigation item
 *
 * @param item - Navigation item to register
 * @returns Navigation action result
 *
 * @example
 * ```typescript
 * const result = useRegisterNavigationItem({
 *   id: 'my-extension:reports',
 *   label: 'Custom Reports',
 *   path: '/reports',
 *   groupId: 'production',
 *   icon: 'FileOutlined',
 * });
 * ```
 */
export function useRegisterNavigationItem(item: NavigationItem): NavigationActionResult {
  const context = useExtensionContext();
  const { setItem, createApprovalRequest, getPolicy } = useNavigationStore();
  const [result, setResult] = React.useState<NavigationActionResult>({
    success: false,
    approvalRequired: false,
  });

  React.useEffect(() => {
    const policy = getPolicy(context.siteId);
    const itemWithExtension = {
      ...item,
      extensionId: context.extensionId,
    };

    // Check if approval is required
    const needsApproval =
      policy?.requireApprovalForNewItems &&
      !policy.bypassExtensionIds.includes(context.extensionId);

    if (needsApproval) {
      // Create approval request
      const approvalId = createApprovalRequest({
        type: 'add_item',
        status: 'pending',
        target: itemWithExtension,
        requestedBy: context.extensionId,
        extensionId: context.extensionId,
        siteId: context.siteId,
      });

      setResult({
        success: true,
        id: item.id,
        approvalRequestId: approvalId,
        approvalRequired: true,
        approvalStatus: 'pending',
      });
    } else {
      // Register directly
      setItem(itemWithExtension);
      setResult({
        success: true,
        id: item.id,
        approvalRequired: false,
      });
    }
  }, [item, context.siteId, context.extensionId, setItem, createApprovalRequest, getPolicy]);

  return result;
}

/**
 * Hook to register a navigation group
 *
 * @param group - Navigation group to register
 * @returns Navigation action result
 */
export function useRegisterNavigationGroup(group: NavigationGroup): NavigationActionResult {
  const context = useExtensionContext();
  const { setGroup, createApprovalRequest, getPolicy } = useNavigationStore();
  const [result, setResult] = React.useState<NavigationActionResult>({
    success: false,
    approvalRequired: false,
  });

  React.useEffect(() => {
    const policy = getPolicy(context.siteId);
    const groupWithExtension = {
      ...group,
      extensionId: context.extensionId,
    };

    const needsApproval =
      policy?.requireApprovalForNewItems &&
      !policy.bypassExtensionIds.includes(context.extensionId);

    if (needsApproval) {
      const approvalId = createApprovalRequest({
        type: 'add_group',
        status: 'pending',
        target: groupWithExtension,
        requestedBy: context.extensionId,
        extensionId: context.extensionId,
        siteId: context.siteId,
      });

      setResult({
        success: true,
        id: group.id,
        approvalRequestId: approvalId,
        approvalRequired: true,
        approvalStatus: 'pending',
      });
    } else {
      setGroup(groupWithExtension);
      setResult({
        success: true,
        id: group.id,
        approvalRequired: false,
      });
    }
  }, [group, context.siteId, context.extensionId, setGroup, createApprovalRequest, getPolicy]);

  return result;
}

/**
 * Hook to get filtered navigation groups and items
 *
 * @returns Filtered navigation structure
 */
export function useNavigationStructure() {
  const context = useExtensionContext();
  const { getFilteredGroups, getFilteredItems } = useNavigationStore();

  const groups = React.useMemo(
    () => getFilteredGroups(context.userPermissions, context.userRoles),
    [context.userPermissions, context.userRoles, getFilteredGroups]
  );

  const items = React.useMemo(
    () => getFilteredItems(context.userPermissions, context.userRoles),
    [context.userPermissions, context.userRoles, getFilteredItems]
  );

  return { groups, items };
}

/**
 * Hook to manage navigation approvals
 *
 * @returns Approval management utilities
 */
export function useNavigationApprovals() {
  const context = useExtensionContext();
  const {
    getPendingApprovals,
    getExtensionApprovals,
    approveRequest,
    rejectRequest,
  } = useNavigationStore();

  const canApprove = React.useMemo(() => {
    const policy = useNavigationStore.getState().getPolicy(context.siteId);
    return (
      policy &&
      policy.isActive &&
      policy.approverRoles.some((role) => context.userRoles.includes(role))
    );
  }, [context.siteId, context.userRoles]);

  const pendingApprovals = React.useMemo(
    () => getPendingApprovals(),
    [getPendingApprovals]
  );

  const extensionApprovals = React.useMemo(
    () => getExtensionApprovals(context.extensionId),
    [context.extensionId, getExtensionApprovals]
  );

  const approve = React.useCallback(
    (requestId: string, reason?: string) => {
      if (!canApprove) {
        context.logger.warn('User cannot approve navigation changes');
        return false;
      }
      return approveRequest(requestId, context.extensionId, reason);
    },
    [canApprove, context.extensionId, context.logger, approveRequest]
  );

  const reject = React.useCallback(
    (requestId: string, reason?: string) => {
      if (!canApprove) {
        context.logger.warn('User cannot reject navigation changes');
        return false;
      }
      return rejectRequest(requestId, context.extensionId, reason);
    },
    [canApprove, context.extensionId, context.logger, rejectRequest]
  );

  return {
    canApprove,
    pendingApprovals,
    extensionApprovals,
    approve,
    reject,
  };
}

/**
 * Hook to handle navigation item clicks
 *
 * @returns Click handler function
 */
export function useNavigationItemClick() {
  return React.useCallback((item: NavigationItem) => {
    const context = useExtensionContext();

    if (item.href) {
      // External link
      window.open(item.href, item.target || '_self');
    } else if (item.path) {
      // Internal route - would be handled by router
      context.logger.debug(`Navigating to ${item.path}`);
    } else if (item.children && item.children.length > 0) {
      // Submenu toggle would be handled by UI
      context.logger.debug(`Toggling submenu for ${item.id}`);
    }
  }, []);
}
