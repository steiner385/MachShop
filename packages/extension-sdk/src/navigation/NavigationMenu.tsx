/**
 * Navigation Menu Component
 * Issue #427: Navigation Extension Framework with Approval Workflow
 *
 * React component for rendering the navigation menu with support for:
 * - Hierarchical menu groups and items
 * - Permission-based visibility
 * - Mobile responsiveness
 * - Dynamic menu loading
 */

import React, { useState, useMemo } from 'react';
import type {
  NavigationMenuGroup,
  NavigationMenuItem,
  NavigationQueryOptions,
} from './types';
import { useNavigation, useMenuItemSearch } from './hooks';

/**
 * Props for NavigationMenu component
 */
export interface NavigationMenuProps {
  /** Optional custom className */
  className?: string;
  /** Optional custom styling */
  style?: React.CSSProperties;
  /** User permissions for filtering */
  userPermissions?: string[];
  /** Callback when menu item is clicked */
  onItemClick?: (item: NavigationMenuItem) => void;
  /** Callback when group is expanded/collapsed */
  onGroupToggle?: (groupId: string, expanded: boolean) => void;
  /** Enable search functionality */
  enableSearch?: boolean;
  /** Mobile mode (hide items marked hiddenOnMobile) */
  isMobile?: boolean;
  /** Extensions to exclude */
  excludeDisabledExtensions?: string[];
  /** Site ID for scoped navigation */
  siteId?: string;
  /** Render custom menu item */
  renderMenuItem?: (item: NavigationMenuItem) => React.ReactNode;
  /** Render custom menu group */
  renderMenuGroup?: (group: NavigationMenuGroup, content: React.ReactNode) => React.ReactNode;
  /** Show badge counts */
  showBadges?: boolean;
}

/**
 * Menu item component
 */
const MenuItemComponent: React.FC<{
  item: NavigationMenuItem;
  isActive?: boolean;
  onClick?: (item: NavigationMenuItem) => void;
  showBadge?: boolean;
  renderCustom?: (item: NavigationMenuItem) => React.ReactNode;
}> = ({ item, isActive, onClick, showBadge, renderCustom }) => {
  if (renderCustom) {
    return <>{renderCustom(item)}</>;
  }

  return (
    <div
      className={`nav-menu-item ${isActive ? 'active' : ''}`}
      onClick={() => onClick?.(item)}
      role="menuitem"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.(item);
        }
      }}
    >
      <div className="nav-menu-item-content">
        {item.icon && <span className="nav-menu-item-icon">{item.icon}</span>}
        <span className="nav-menu-item-label">{item.label}</span>
        {showBadge && item.badge && item.badge.count !== undefined && (
          <span
            className={`nav-menu-item-badge badge-${item.badge.status || 'default'}`}
            style={item.badge.color ? { backgroundColor: item.badge.color } : undefined}
          >
            {item.badge.count}
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * Menu group component
 */
const MenuGroupComponent: React.FC<{
  group: NavigationMenuGroup;
  items: NavigationMenuItem[];
  isExpanded?: boolean;
  onToggle?: (groupId: string, expanded: boolean) => void;
  onItemClick?: (item: NavigationMenuItem) => void;
  showBadges?: boolean;
  renderMenuItem?: (item: NavigationMenuItem) => React.ReactNode;
  renderCustomGroup?: (group: NavigationMenuGroup, content: React.ReactNode) => React.ReactNode;
}> = ({
  group,
  items,
  isExpanded = true,
  onToggle,
  onItemClick,
  showBadges,
  renderMenuItem,
  renderCustomGroup,
}) => {
  const content = (
    <div className="nav-menu-group">
      <button
        className={`nav-menu-group-header ${isExpanded ? 'expanded' : ''}`}
        onClick={() => onToggle?.(group.id, !isExpanded)}
        aria-expanded={isExpanded}
      >
        {group.icon && <span className="nav-menu-group-icon">{group.icon}</span>}
        <span className="nav-menu-group-name">{group.name}</span>
        {items.length > 0 && (
          <span className="nav-menu-group-toggle">
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
      </button>
      {isExpanded && items.length > 0 && (
        <div className="nav-menu-group-items">
          {items.map(item => (
            <MenuItemComponent
              key={item.id}
              item={item}
              onClick={onItemClick}
              showBadge={showBadges}
              renderCustom={renderMenuItem}
            />
          ))}
        </div>
      )}
    </div>
  );

  if (renderCustomGroup) {
    return <>{renderCustomGroup(group, content)}</>;
  }

  return content;
};

/**
 * Search component
 */
const SearchComponent: React.FC<{
  onSearch: (term: string) => void;
  placeholder?: string;
}> = ({ onSearch, placeholder = 'Search menu...' }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    onSearch(term);
  };

  return (
    <div className="nav-menu-search">
      <input
        type="text"
        value={searchTerm}
        onChange={handleChange}
        placeholder={placeholder}
        className="nav-menu-search-input"
        aria-label="Search navigation menu"
      />
    </div>
  );
};

/**
 * Main NavigationMenu component
 */
export const NavigationMenu: React.FC<NavigationMenuProps> = ({
  className,
  style,
  userPermissions,
  onItemClick,
  onGroupToggle,
  enableSearch = false,
  isMobile = false,
  excludeDisabledExtensions,
  siteId,
  renderMenuItem,
  renderMenuGroup,
  showBadges = true,
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const queryOptions: NavigationQueryOptions = {
    userPermissions,
    includeMobileHidden: !isMobile,
    excludeDisabledExtensions,
    siteId,
  };

  const { navigationTree } = useNavigation(queryOptions);
  const searchResults = useMenuItemSearch(searchTerm, queryOptions);

  // Use search results if searching, otherwise use full tree
  const displayTree = useMemo(() => {
    if (searchTerm.trim()) {
      // Group search results by their parent groups
      const groupMap = new Map<string, NavigationMenuItem[]>();
      searchResults.forEach(item => {
        if (!groupMap.has(item.parentGroup)) {
          groupMap.set(item.parentGroup, []);
        }
        groupMap.get(item.parentGroup)!.push(item);
      });

      return navigationTree
        .filter(group => groupMap.has(group.id))
        .map(group => ({
          ...group,
          items: groupMap.get(group.id) || [],
        }));
    }

    return navigationTree;
  }, [navigationTree, searchTerm, searchResults]);

  const handleGroupToggle = (groupId: string, expanded: boolean) => {
    const newExpandedGroups = new Set(expandedGroups);
    if (expanded) {
      newExpandedGroups.add(groupId);
    } else {
      newExpandedGroups.delete(groupId);
    }
    setExpandedGroups(newExpandedGroups);
    onGroupToggle?.(groupId, expanded);
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    // Expand all groups when searching
    if (term.trim()) {
      setExpandedGroups(new Set(displayTree.map(g => g.id)));
    }
  };

  return (
    <nav
      className={`nav-menu ${className || ''}`}
      style={style}
      role="navigation"
      aria-label="Main navigation"
    >
      {enableSearch && <SearchComponent onSearch={handleSearch} />}

      <div className="nav-menu-groups">
        {displayTree.length === 0 ? (
          <div className="nav-menu-empty">
            {searchTerm ? 'No menu items found' : 'No menu items available'}
          </div>
        ) : (
          displayTree.map(group => (
            <MenuGroupComponent
              key={group.id}
              group={group}
              items={group.items}
              isExpanded={expandedGroups.has(group.id)}
              onToggle={handleGroupToggle}
              onItemClick={onItemClick}
              showBadges={showBadges}
              renderMenuItem={renderMenuItem}
              renderCustomGroup={renderMenuGroup}
            />
          ))
        )}
      </div>
    </nav>
  );
};

/**
 * Default export
 */
export default NavigationMenu;
