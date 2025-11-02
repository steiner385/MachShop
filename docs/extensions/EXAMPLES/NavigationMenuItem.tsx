/**
 * NavigationMenuItem - Menu item registration example
 *
 * This example demonstrates:
 * - Menu item declaration and registration
 * - Permission-based menu visibility
 * - Icon usage in navigation
 * - Navigation integration
 * - Nested menu structure
 * - Active state handling
 *
 * @example
 * // In your extension manifest:
 * {
 *   "navigation": {
 *     "items": [
 *       {
 *         "id": "my-extension:dashboard",
 *         "label": "My Dashboard",
 *         "path": "/my-dashboard",
 *         "icon": "DashboardOutlined",
 *         "permissions": ["dashboard:read"]
 *       }
 *     ]
 *   }
 * }
 */

import React from 'react';
import { Menu, Badge } from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  SettingOutlined,
  UserOutlined,
  TeamOutlined,
  FileTextOutlined,
  BarChartOutlined,
  AppstoreOutlined,
  ToolOutlined,
  SafetyOutlined,
  ExperimentOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';

/**
 * Menu item configuration interface
 */
export interface NavigationMenuItem {
  /** Unique identifier for the menu item */
  id: string;

  /** Display label */
  label: string;

  /** Route path */
  path?: string;

  /** Icon component name or element */
  icon?: React.ReactNode;

  /** Required permissions to view this item */
  permissions?: string[];

  /** Child menu items (for nested menus) */
  children?: NavigationMenuItem[];

  /** Badge count or text */
  badge?: number | string;

  /** Whether the item is disabled */
  disabled?: boolean;

  /** Custom click handler */
  onClick?: () => void;

  /** Divider after this item */
  divider?: boolean;
}

/**
 * NavigationMenu Component Props
 */
export interface NavigationMenuProps {
  /** Menu items configuration */
  items: NavigationMenuItem[];

  /** Menu mode */
  mode?: 'vertical' | 'horizontal' | 'inline';

  /** Menu theme */
  theme?: 'light' | 'dark';

  /** Collapsed state (for vertical/inline) */
  collapsed?: boolean;

  /** Custom CSS class */
  className?: string;
}

/**
 * Icon mapping for string-based icon names
 */
const iconMap: Record<string, React.ReactNode> = {
  DashboardOutlined: <DashboardOutlined />,
  SettingOutlined: <SettingOutlined />,
  UserOutlined: <UserOutlined />,
  TeamOutlined: <TeamOutlined />,
  FileTextOutlined: <FileTextOutlined />,
  BarChartOutlined: <BarChartOutlined />,
  AppstoreOutlined: <AppstoreOutlined />,
  ToolOutlined: <ToolOutlined />,
  SafetyOutlined: <SafetyOutlined />,
  ExperimentOutlined: <ExperimentOutlined />,
};

/**
 * NavigationMenu Component
 *
 * Renders a navigation menu with permission-based filtering
 * and automatic active state management.
 */
export const NavigationMenu: React.FC<NavigationMenuProps> = ({
  items,
  mode = 'inline',
  theme = 'light',
  collapsed = false,
  className,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission, hasAnyPermission } = usePermissions();

  /**
   * Filter menu items based on permissions
   */
  const filterMenuItems = (menuItems: NavigationMenuItem[]): NavigationMenuItem[] => {
    return menuItems
      .filter(item => {
        // If no permissions required, show item
        if (!item.permissions || item.permissions.length === 0) {
          return true;
        }

        // Check if user has any of the required permissions
        return hasAnyPermission(item.permissions);
      })
      .map(item => ({
        ...item,
        // Recursively filter children
        children: item.children ? filterMenuItems(item.children) : undefined,
      }));
  };

  /**
   * Convert navigation items to Ant Design menu items
   */
  const convertToMenuItems = (menuItems: NavigationMenuItem[]): MenuProps['items'] => {
    return filterMenuItems(menuItems).map(item => {
      const icon = typeof item.icon === 'string'
        ? iconMap[item.icon]
        : item.icon;

      const label = item.badge ? (
        <Badge count={item.badge} offset={[10, 0]}>
          {item.label}
        </Badge>
      ) : (
        item.label
      );

      // If item has children, create submenu
      if (item.children && item.children.length > 0) {
        return {
          key: item.id,
          icon,
          label,
          children: convertToMenuItems(item.children),
          disabled: item.disabled,
        };
      }

      // Regular menu item
      return {
        key: item.id,
        icon,
        label,
        disabled: item.disabled,
        onClick: () => handleMenuClick(item),
      };
    });
  };

  /**
   * Handle menu item click
   */
  const handleMenuClick = (item: NavigationMenuItem) => {
    // Custom click handler takes precedence
    if (item.onClick) {
      item.onClick();
      return;
    }

    // Navigate to path if specified
    if (item.path) {
      navigate(item.path);
    }
  };

  /**
   * Get currently selected menu keys based on current path
   */
  const getSelectedKeys = (): string[] => {
    const currentPath = location.pathname;

    // Find menu item that matches current path
    const findMatchingItem = (menuItems: NavigationMenuItem[]): string | null => {
      for (const item of menuItems) {
        if (item.path === currentPath) {
          return item.id;
        }

        if (item.children) {
          const childMatch = findMatchingItem(item.children);
          if (childMatch) return childMatch;
        }
      }
      return null;
    };

    const matchingKey = findMatchingItem(items);
    return matchingKey ? [matchingKey] : [];
  };

  /**
   * Get default open keys for submenus
   */
  const getDefaultOpenKeys = (): string[] => {
    if (collapsed) return [];

    const currentPath = location.pathname;
    const openKeys: string[] = [];

    const findOpenKeys = (menuItems: NavigationMenuItem[], parentKey?: string) => {
      for (const item of menuItems) {
        if (item.children) {
          const hasActiveChild = item.children.some(child => child.path === currentPath);
          if (hasActiveChild) {
            openKeys.push(item.id);
          }
          findOpenKeys(item.children, item.id);
        }
      }
    };

    findOpenKeys(items);
    return openKeys;
  };

  return (
    <Menu
      mode={mode}
      theme={theme}
      className={className}
      items={convertToMenuItems(items)}
      selectedKeys={getSelectedKeys()}
      defaultOpenKeys={getDefaultOpenKeys()}
      inlineCollapsed={collapsed}
    />
  );
};

/**
 * Example menu configuration for a manufacturing extension
 */
export const exampleMenuItems: NavigationMenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: 'DashboardOutlined',
    permissions: ['dashboard:read'],
  },
  {
    id: 'production',
    label: 'Production',
    icon: 'ToolOutlined',
    permissions: ['production:read'],
    children: [
      {
        id: 'production-overview',
        label: 'Overview',
        path: '/production/overview',
        icon: 'BarChartOutlined',
      },
      {
        id: 'production-orders',
        label: 'Work Orders',
        path: '/production/orders',
        icon: 'FileTextOutlined',
        badge: 5, // Example: 5 pending orders
      },
      {
        id: 'production-schedule',
        label: 'Schedule',
        path: '/production/schedule',
        icon: 'AppstoreOutlined',
      },
    ],
  },
  {
    id: 'quality',
    label: 'Quality Control',
    path: '/quality',
    icon: 'SafetyOutlined',
    permissions: ['quality:read'],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: 'AppstoreOutlined',
    permissions: ['inventory:read'],
    children: [
      {
        id: 'inventory-items',
        label: 'Items',
        path: '/inventory/items',
      },
      {
        id: 'inventory-locations',
        label: 'Locations',
        path: '/inventory/locations',
      },
      {
        id: 'inventory-transactions',
        label: 'Transactions',
        path: '/inventory/transactions',
      },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    path: '/reports',
    icon: 'BarChartOutlined',
    permissions: ['reports:read'],
  },
  {
    id: 'admin',
    label: 'Administration',
    icon: 'SettingOutlined',
    permissions: ['admin:access'],
    children: [
      {
        id: 'admin-users',
        label: 'Users',
        path: '/admin/users',
        icon: 'UserOutlined',
        permissions: ['admin:users'],
      },
      {
        id: 'admin-teams',
        label: 'Teams',
        path: '/admin/teams',
        icon: 'TeamOutlined',
        permissions: ['admin:teams'],
      },
      {
        id: 'admin-settings',
        label: 'Settings',
        path: '/admin/settings',
        icon: 'SettingOutlined',
        permissions: ['admin:settings'],
      },
    ],
  },
];

/**
 * Example usage component
 */
export const NavigationMenuExample: React.FC = () => {
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <div style={{ width: collapsed ? 80 : 256, height: '100vh' }}>
      <NavigationMenu
        items={exampleMenuItems}
        mode="inline"
        theme="dark"
        collapsed={collapsed}
      />
    </div>
  );
};

NavigationMenu.displayName = 'NavigationMenu';
NavigationMenuExample.displayName = 'NavigationMenuExample';

export default NavigationMenu;
