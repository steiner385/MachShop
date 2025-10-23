/**
 * Active Users Indicator Component
 * Sprint 4: Collaborative Routing Features
 *
 * Displays active users viewing/editing a resource
 */

import React from 'react';
import { Avatar, Badge, Space, Tooltip, Tag, Spin, Alert } from 'antd';
import {
  UserOutlined,
  EyeOutlined,
  EditOutlined,
  TeamOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { usePresence } from '../../hooks/usePresence';
import { ResourceType, PresenceAction } from '../../api/presence';
import './ActiveUsersIndicator.css';

export interface ActiveUsersIndicatorProps {
  resourceType: ResourceType;
  resourceId: string;
  action: PresenceAction;
  enabled?: boolean;
  showDetails?: boolean; // Show expanded details vs compact view
  style?: React.CSSProperties;
}

/**
 * Display active users viewing/editing a resource
 *
 * Features:
 * - Shows user avatars with names on hover
 * - Different badges for viewers vs editors
 * - Total count of active users
 * - Compact and detailed view modes
 *
 * @example
 * <ActiveUsersIndicator
 *   resourceType="routing"
 *   resourceId={routingId}
 *   action="editing"
 * />
 */
export const ActiveUsersIndicator: React.FC<ActiveUsersIndicatorProps> = ({
  resourceType,
  resourceId,
  action,
  enabled = true,
  showDetails = false,
  style,
}) => {
  const { presenceInfo, isLoading, error } = usePresence({
    resourceType,
    resourceId,
    action,
    enabled,
  });

  if (!enabled || !resourceId) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="active-users-indicator" style={style}>
        <Spin indicator={<LoadingOutlined spin />} size="small" />
      </div>
    );
  }

  // Error state (non-blocking - just log)
  if (error) {
    console.error('Presence tracking error:', error);
    return null; // Don't show error to user - presence is non-critical
  }

  // No active users
  if (!presenceInfo || presenceInfo.activeUsers.length === 0) {
    return (
      <div className="active-users-indicator" style={style}>
        <Tooltip title="No other users active">
          <TeamOutlined style={{ color: '#999', fontSize: 16 }} />
        </Tooltip>
      </div>
    );
  }

  const { activeUsers, viewerCount, editorCount } = presenceInfo;
  const totalCount = activeUsers.length;

  // Compact view - just avatars
  if (!showDetails) {
    return (
      <div className="active-users-indicator active-users-compact" style={style}>
        <Space size={8}>
          <Avatar.Group
            maxCount={4}
            maxStyle={{
              color: '#fff',
              backgroundColor: '#1890ff',
              cursor: 'pointer',
            }}
          >
            {activeUsers.map((user) => (
              <Tooltip
                key={user.userId}
                title={
                  <div>
                    <div><strong>{user.userName}</strong></div>
                    <div>
                      {user.action === 'editing' ? (
                        <>
                          <EditOutlined /> Editing
                        </>
                      ) : (
                        <>
                          <EyeOutlined /> Viewing
                        </>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', opacity: 0.8 }}>
                      Active for {Math.max(0, user.duration)}s
                    </div>
                  </div>
                }
              >
                <Badge
                  count={user.action === 'editing' ? <EditOutlined style={{ fontSize: 10 }} /> : null}
                  offset={[-2, 22]}
                  style={{ backgroundColor: '#52c41a' }}
                >
                  <Avatar
                    style={{
                      backgroundColor: user.action === 'editing' ? '#ff4d4f' : '#1890ff',
                      cursor: 'pointer',
                    }}
                    icon={<UserOutlined />}
                  >
                    {user.userName.substring(0, 2).toUpperCase()}
                  </Avatar>
                </Badge>
              </Tooltip>
            ))}
          </Avatar.Group>

          {totalCount > 0 && (
            <Tooltip
              title={
                <div>
                  <div>{viewerCount} viewer{viewerCount !== 1 ? 's' : ''}</div>
                  <div>{editorCount} editor{editorCount !== 1 ? 's' : ''}</div>
                </div>
              }
            >
              <Tag color="blue" style={{ margin: 0, cursor: 'pointer' }}>
                <TeamOutlined /> {totalCount}
              </Tag>
            </Tooltip>
          )}
        </Space>
      </div>
    );
  }

  // Detailed view - expanded list
  return (
    <div className="active-users-indicator active-users-detailed" style={style}>
      <Alert
        message={
          <Space>
            <TeamOutlined />
            <strong>Active Users ({totalCount})</strong>
          </Space>
        }
        description={
          <div style={{ marginTop: 8 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {viewerCount > 0 && (
                <div>
                  <Tag color="blue" icon={<EyeOutlined />}>
                    {viewerCount} Viewer{viewerCount !== 1 ? 's' : ''}
                  </Tag>
                </div>
              )}
              {editorCount > 0 && (
                <div>
                  <Tag color="red" icon={<EditOutlined />}>
                    {editorCount} Editor{editorCount !== 1 ? 's' : ''}
                  </Tag>
                </div>
              )}
              <div style={{ marginTop: 8 }}>
                {activeUsers.map((user) => (
                  <div
                    key={user.userId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '4px 0',
                      borderBottom: '1px solid #f0f0f0',
                    }}
                  >
                    <Avatar
                      size="small"
                      style={{
                        backgroundColor: user.action === 'editing' ? '#ff4d4f' : '#1890ff',
                        marginRight: 8,
                      }}
                      icon={<UserOutlined />}
                    >
                      {user.userName.substring(0, 2).toUpperCase()}
                    </Avatar>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{user.userName}</div>
                      <div style={{ fontSize: '12px', color: '#999' }}>
                        {user.action === 'editing' ? (
                          <>
                            <EditOutlined /> Editing
                          </>
                        ) : (
                          <>
                            <EyeOutlined /> Viewing
                          </>
                        )}{' '}
                        • {Math.max(0, user.duration)}s ago
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Space>
          </div>
        }
        type="info"
        showIcon
      />
    </div>
  );
};

export default ActiveUsersIndicator;
