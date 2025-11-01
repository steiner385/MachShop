/**
 * Notification Center Component
 *
 * Displays notification dropdown with:
 * - Notification list with filtering
 * - Quick actions (mark as read, delete)
 * - Notification badges showing unread count
 * - Click-through to notification actions
 */

import React, { useState, useEffect } from 'react';
import {
  Badge,
  Dropdown,
  Button,
  Empty,
  Space,
  Divider,
  Tag,
  Timeline,
  Tooltip,
  Menu,
  Input,
  Segmented,
} from 'antd';
import {
  BellOutlined,
  DeleteOutlined,
  CheckOutlined,
  FileTextOutlined,
  ClearOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import notificationService, {
  Notification,
  NotificationCategory,
} from '../../services/notificationService';
import type { MenuProps } from 'antd';

dayjs.extend(relativeTime);

/**
 * Notification Center Props
 */
interface NotificationCenterProps {
  /** Current user ID */
  userId: string;
  /** Icon size */
  size?: 'large' | 'middle' | 'small';
}

/**
 * Notification color mapping
 */
const NOTIFICATION_COLORS: Record<string, string> = {
  approval: 'blue',
  info: 'default',
  success: 'green',
  warning: 'orange',
  error: 'red',
  escalation: 'red',
};

/**
 * Category color mapping
 */
const CATEGORY_COLORS: Record<NotificationCategory, string> = {
  APPROVAL_REQUEST: 'blue',
  STATE_TRANSITION: 'cyan',
  ESCALATION: 'red',
  REJECTION: 'orange',
  SYSTEM: 'default',
  QUALITY_ALERT: 'red',
};

/**
 * Notification Center Component
 */
export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  userId,
  size = 'middle',
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [visible, setVisible] = useState(false);
  const [filterCategory, setFilterCategory] = useState<NotificationCategory | 'ALL'>('ALL');
  const [searchText, setSearchText] = useState('');

  /**
   * Initialize notifications
   */
  useEffect(() => {
    // Load initial notifications
    notificationService.loadFromServer(userId).then(setNotifications);

    // Subscribe to notification updates
    const unsubscribe = notificationService.subscribe((updatedNotifications) => {
      setNotifications(updatedNotifications);
    });

    // Setup WebSocket for real-time updates
    const ws = notificationService.setupWebSocket(userId);

    return () => {
      unsubscribe();
      ws?.close();
    };
  }, [userId]);

  /**
   * Filter notifications
   */
  const filteredNotifications = notifications.filter((notification) => {
    const matchesCategory =
      filterCategory === 'ALL' || notification.category === filterCategory;
    const matchesSearch =
      notification.title.toLowerCase().includes(searchText.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchText.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  /**
   * Get unread count
   */
  const unreadCount = notificationService.getUnreadCount();

  /**
   * Handle notification click
   */
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      notificationService.markAsRead(notification.id);
    }
    if (notification.action) {
      window.location.href = notification.action.url;
    }
  };

  /**
   * Handle mark as read
   */
  const handleMarkAsRead = (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    notificationService.markAsRead(notificationId);
  };

  /**
   * Handle delete
   */
  const handleDelete = (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    notificationService.deleteNotification(notificationId);
  };

  /**
   * Handle mark all as read
   */
  const handleMarkAllAsRead = () => {
    notificationService.markAllAsRead();
  };

  /**
   * Handle clear all
   */
  const handleClearAll = () => {
    notificationService.clearAllNotifications();
  };

  /**
   * Render notification item
   */
  const renderNotificationItem = (notification: Notification) => (
    <div
      key={notification.id}
      onClick={() => handleNotificationClick(notification)}
      style={{
        padding: '12px 16px',
        background: notification.read ? 'transparent' : '#f0f5ff',
        borderBottom: '1px solid #f0f0f0',
        cursor: notification.action ? 'pointer' : 'default',
        transition: 'background-color 0.3s',
        '&:hover': {
          backgroundColor: notification.read ? '#fafafa' : '#f0f5ff',
        },
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = notification.read ? '#fafafa' : '#e6f7ff';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = notification.read ? 'transparent' : '#f0f5ff';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            {!notification.read && (
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: '#1890ff',
                  flexShrink: 0,
                }}
              />
            )}
            <Tag color={CATEGORY_COLORS[notification.category]}>
              {notification.category.replace(/_/g, ' ')}
            </Tag>
            <Tooltip title={dayjs(notification.createdAt).format('MMMM D, YYYY h:mm A')}>
              <span style={{ fontSize: 12, color: '#999' }}>
                {dayjs(notification.createdAt).fromNow()}
              </span>
            </Tooltip>
          </div>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>{notification.title}</div>
          <div style={{ color: '#666', fontSize: 13, marginBottom: 4 }}>{notification.message}</div>
          {notification.description && (
            <div style={{ color: '#999', fontSize: 12 }}>{notification.description}</div>
          )}
        </div>
        <Space size="small" style={{ marginLeft: 8, flexShrink: 0 }}>
          {!notification.read && (
            <Tooltip title="Mark as read">
              <Button
                type="text"
                size="small"
                icon={<CheckOutlined />}
                onClick={(e) => handleMarkAsRead(notification.id, e)}
              />
            </Tooltip>
          )}
          <Tooltip title="Delete">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => handleDelete(notification.id, e)}
            />
          </Tooltip>
        </Space>
      </div>
    </div>
  );

  /**
   * Notification dropdown content
   */
  const notificationContent = (
    <div style={{ width: 450, maxHeight: 600, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Notifications ({unreadCount} unread)</span>
          {unreadCount > 0 && (
            <Button type="text" size="small" onClick={handleMarkAllAsRead}>
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      {/* Filter Controls */}
      <div style={{ padding: '8px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <Input
          size="small"
          placeholder="Search notifications..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          style={{ marginBottom: 8 }}
        />
        <Segmented
          value={filterCategory}
          onChange={(value) => setFilterCategory(value as NotificationCategory | 'ALL')}
          options={[
            { label: 'All', value: 'ALL' },
            { label: 'Approvals', value: 'APPROVAL_REQUEST' },
            { label: 'Transitions', value: 'STATE_TRANSITION' },
            { label: 'Escalations', value: 'ESCALATION' },
          ]}
          size="small"
          style={{ width: '100%' }}
        />
      </div>

      {/* Notifications List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filteredNotifications.length > 0 ? (
          <div>
            {filteredNotifications.map((notification) => renderNotificationItem(notification))}
          </div>
        ) : (
          <Empty
            description={notifications.length === 0 ? 'No notifications' : 'No matching notifications'}
            style={{ paddingTop: 40, paddingBottom: 40 }}
          />
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div
          style={{
            padding: '8px 16px',
            borderTop: '1px solid #f0f0f0',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <Button type="text" size="small" onClick={handleClearAll} danger>
            <DeleteOutlined /> Clear all
          </Button>
          <Button type="primary" size="small">
            <FileTextOutlined /> View all
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <Dropdown
      menu={{ items: [] as MenuProps['items'] }}
      open={visible}
      onOpenChange={setVisible}
      trigger={['click']}
      placement="bottomRight"
      overlay={<div>{notificationContent}</div>}
    >
      <Badge count={unreadCount} offset={[-5, 5]}>
        <Button
          type="text"
          size={size}
          icon={<BellOutlined style={{ fontSize: unreadCount > 0 ? 18 : 16 }} />}
        />
      </Badge>
    </Dropdown>
  );
};

export default NotificationCenter;
