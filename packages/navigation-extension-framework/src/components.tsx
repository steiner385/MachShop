/**
 * Navigation Extension Framework Components
 *
 * React components for rendering and managing navigation.
 *
 * @module navigation-extension-framework/components
 */

import * as React from 'react';
import { Menu, Badge, Spin, Alert, Modal, Button, Form, Input } from 'antd';
import { useExtensionContext, useTheme, usePermission } from '@machshop/frontend-extension-sdk';
import { NavigationItem, NavigationGroup, NavigationApprovalRequest } from './types';
import { useNavigationStructure, useNavigationApprovals, useNavigationItemClick } from './hooks';

/**
 * Navigation menu component
 */
export function NavigationMenu(): React.ReactElement {
  const { tokens } = useTheme();
  const { groups, items } = useNavigationStructure();
  const handleClick = useNavigationItemClick();

  const renderItem = (item: NavigationItem): React.ReactElement | null => {
    if (!item.groupId && item.children && item.children.length > 0) {
      return (
        <Menu.SubMenu
          key={item.id}
          title={
            <span>
              {item.icon && <span className="menu-icon">{item.icon}</span>}
              <span>{item.label}</span>
              {item.badge && (
                <Badge
                  count={item.badge.text}
                  style={{ backgroundColor: item.badge.color || tokens.colorPrimary }}
                />
              )}
            </span>
          }
        >
          {item.children.map((child) => renderItem(child))}
        </Menu.SubMenu>
      );
    }

    return (
      <Menu.Item
        key={item.id}
        onClick={() => handleClick(item)}
        style={{ color: tokens.colorTextPrimary }}
      >
        {item.icon && <span className="menu-icon">{item.icon}</span>}
        {item.label}
        {item.badge && (
          <Badge
            count={item.badge.text}
            style={{ backgroundColor: item.badge.color || tokens.colorPrimary, marginLeft: '8px' }}
          />
        )}
      </Menu.Item>
    );
  };

  return (
    <Menu
      mode="vertical"
      style={{
        backgroundColor: tokens.colorBgPrimary,
        color: tokens.colorTextPrimary,
      }}
    >
      {groups.map((group) => (
        <Menu.ItemGroup key={group.id} title={group.label}>
          {items
            .filter((item) => item.groupId === group.id)
            .map((item) => renderItem(item))}
        </Menu.ItemGroup>
      ))}
    </Menu>
  );
}

/**
 * Navigation approval panel component
 */
export function NavigationApprovalPanel(): React.ReactElement {
  const { pendingApprovals, approve, reject, canApprove } = useNavigationApprovals();
  const { tokens } = useTheme();
  const [expandedRequest, setExpandedRequest] = React.useState<string | null>(null);

  if (!canApprove) {
    return (
      <Alert
        message="You do not have permission to approve navigation changes"
        type="info"
        showIcon
      />
    );
  }

  if (pendingApprovals.length === 0) {
    return <Alert message="No pending navigation changes to review" type="success" showIcon />;
  }

  return (
    <div
      style={{
        backgroundColor: tokens.colorBgSecondary,
        padding: tokens.spacingMd,
        borderRadius: tokens.borderRadius,
      }}
    >
      <h3 style={{ color: tokens.colorTextPrimary, marginBottom: tokens.spacingMd }}>
        Pending Navigation Approvals ({pendingApprovals.length})
      </h3>

      {pendingApprovals.map((request) => (
        <div
          key={request.id}
          style={{
            backgroundColor: tokens.colorBgPrimary,
            padding: tokens.spacingMd,
            marginBottom: tokens.spacingMd,
            borderRadius: tokens.borderRadiusSm,
            borderLeft: `4px solid ${tokens.colorWarning}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: 0, color: tokens.colorTextPrimary }}>
                {request.type.replace(/_/g, ' ').toUpperCase()}
              </h4>
              <p style={{ color: tokens.colorTextSecondary, marginTop: tokens.spacingSm }}>
                Extension: {request.extensionId}
              </p>
              {request.reason && (
                <p style={{ color: tokens.colorTextSecondary, fontSize: '12px' }}>
                  Reason: {request.reason}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: tokens.spacingSm }}>
              <Button
                type="primary"
                onClick={() => {
                  approve(request.id);
                  setExpandedRequest(null);
                }}
              >
                Approve
              </Button>
              <Button
                danger
                onClick={() => {
                  reject(request.id);
                  setExpandedRequest(null);
                }}
              >
                Reject
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Navigation breadcrumbs component
 */
export function NavigationBreadcrumbs({ path }: { path: string }): React.ReactElement {
  const { tokens } = useTheme();
  const { items } = useNavigationStructure();

  const pathParts = path.split('/').filter(Boolean);
  const breadcrumbs: { label: string; path: string }[] = [];

  let currentPath = '';
  for (const part of pathParts) {
    currentPath += '/' + part;
    const item = items.find((i) => i.path === currentPath);
    if (item) {
      breadcrumbs.push({ label: item.label, path: currentPath });
    } else {
      breadcrumbs.push({ label: part, path: currentPath });
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: tokens.spacingSm,
        color: tokens.colorTextSecondary,
        marginBottom: tokens.spacingMd,
      }}
    >
      {breadcrumbs.map((crumb, index) => (
        <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
          {index > 0 && <span style={{ margin: `0 ${tokens.spacingSm}px` }}>/</span>}
          <a href={`#${crumb.path}`} style={{ color: tokens.colorPrimary }}>
            {crumb.label}
          </a>
        </div>
      ))}
    </div>
  );
}

/**
 * Loading navigation state component
 */
export function NavigationLoading(): React.ReactElement {
  const { tokens } = useTheme();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: tokens.spacingLg,
        minHeight: '200px',
      }}
    >
      <Spin size="large" />
      <p style={{ marginTop: tokens.spacingMd, color: tokens.colorTextSecondary }}>
        Loading navigation...
      </p>
    </div>
  );
}
