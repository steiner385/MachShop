/**
 * Navigation Module
 *
 * Provides menu item registration and navigation utilities for extensions.
 * Supports permission-aware menu rendering and dynamic menu updates.
 */

import { useCallback } from 'react';
import type { MenuProps } from 'antd';
import { useExtensionContext } from '../context';

export interface MenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void | Promise<void>;
  children?: MenuItem[];
  requiredPermission?: string;
  requiredRole?: string;
  visible?: boolean;
  disabled?: boolean;
}

export interface NavigationRegistry {
  registerMenuItem(item: MenuItem): void;
  unregisterMenuItem(key: string): void;
  getMenuItems(): MenuItem[];
  getMenuItemByKey(key: string): MenuItem | undefined;
  clearMenuItems(): void;
}

export interface NavigationHookReturn {
  registerMenuItem: (item: MenuItem) => void;
  unregisterMenuItem: (key: string) => void;
  getMenuItems: () => MenuItem[];
  getVisibleMenuItems: () => MenuItem[];
  convertToAntdMenu: () => MenuProps['items'];
}

const menuRegistry = new Map<string, MenuItem>();

/**
 * Hook to register and manage menu items
 */
export function useNavigation(): NavigationHookReturn {
  const context = useExtensionContext();

  const registerMenuItem = useCallback((item: MenuItem) => {
    menuRegistry.set(item.key, item);
  }, []);

  const unregisterMenuItem = useCallback((key: string) => {
    menuRegistry.delete(key);
  }, []);

  const getMenuItems = useCallback((): MenuItem[] => {
    return Array.from(menuRegistry.values());
  }, []);

  const getVisibleMenuItems = useCallback((): MenuItem[] => {
    return getMenuItems().filter((item) => {
      // Check if item should be visible
      if (item.visible === false) {
        return false;
      }

      // Check permission-based visibility
      if (item.requiredPermission) {
        const hasPermission = context.userPermissions.includes(item.requiredPermission);
        if (!hasPermission) {
          return false;
        }
      }

      // Check role-based visibility
      if (item.requiredRole) {
        // Role checking would require additional context
        // For now, we'll allow if permission check passes
      }

      return true;
    });
  }, [context.userPermissions, getMenuItems()]);

  const convertToAntdMenu = useCallback((): MenuProps['items'] => {
    const items = getVisibleMenuItems();
    return items.map((item) => ({
      key: item.key,
      label: item.label,
      icon: item.icon,
      onClick: item.onClick ? () => item.onClick?.() : undefined,
      disabled: item.disabled,
      children: item.children?.map((child) => ({
        key: child.key,
        label: child.label,
        icon: child.icon,
        onClick: child.onClick ? () => child.onClick?.() : undefined,
        disabled: child.disabled,
      })),
    }));
  }, [getVisibleMenuItems()]);

  return {
    registerMenuItem,
    unregisterMenuItem,
    getMenuItems,
    getVisibleMenuItems,
    convertToAntdMenu,
  };
}

/**
 * Component to render menu items with proper styling
 */
export function MenuItemRenderer(props: {
  items: MenuItem[];
  onItemClick?: (key: string) => void;
}): React.ReactNode {
  return (
    <ul className="extension-menu-items">
      {props.items.map((item) => (
        <li
          key={item.key}
          onClick={() => {
            props.onItemClick?.(item.key);
            item.onClick?.();
          }}
          style={{ cursor: item.disabled ? 'not-allowed' : 'pointer', opacity: item.disabled ? 0.5 : 1 }}
        >
          {item.icon && <span className="menu-icon">{item.icon}</span>}
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Get navigation registry for direct access
 */
export function getNavigationRegistry(): NavigationRegistry {
  return {
    registerMenuItem: (item: MenuItem) => menuRegistry.set(item.key, item),
    unregisterMenuItem: (key: string) => menuRegistry.delete(key),
    getMenuItems: () => Array.from(menuRegistry.values()),
    getMenuItemByKey: (key: string) => menuRegistry.get(key),
    clearMenuItems: () => menuRegistry.clear(),
  };
}
