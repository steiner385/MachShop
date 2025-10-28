import React, { useState, useEffect, useCallback } from 'react';
import {
  Drawer,
  List,
  Badge,
  Button,
  Typography,
  Space,
  Avatar,
  Tag,
  Tooltip,
  Popover,
  Switch,
  Card,
  Empty,
  message,
  Tabs,
  Dropdown,
  Input,
} from 'antd';
import {
  BellOutlined,
  MessageOutlined,
  FileTextOutlined,
  UserOutlined,
  CheckOutlined,
  CloseOutlined,
  SettingOutlined,
  ClearOutlined,
  FilterOutlined,
  SearchOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { formatDistanceToNow } from 'date-fns';
import {
  UserNotification,
  NotificationType,
  NotificationPriority,
} from '@/api/collaboration';
import { collaborationApi } from '@/api/collaboration';
import { useRealTimeCollaboration } from '@/hooks/useRealTimeCollaboration';

const { Text, Title } = Typography;

interface NotificationCenterProps {
  userId: string;
  userName: string;
  className?: string;
}

interface NotificationFilters {
  type?: NotificationType;
  priority?: NotificationPriority;
  read?: boolean;
  search?: string;
}

interface NotificationSettings {
  commentMentions: boolean;
  reviewAssignments: boolean;
  documentUpdates: boolean;
  systemAlerts: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

/**
 * Notification Center Component
 * Displays and manages user notifications with real-time updates
 */
export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  userId,
  userName,
  className,
}) => {
  // State
  const [isVisible, setIsVisible] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filters, setFilters] = useState<NotificationFilters>({});
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    commentMentions: true,
    reviewAssignments: true,
    documentUpdates: true,
    systemAlerts: true,
    emailNotifications: false,
    pushNotifications: false,
  });

  // Real-time updates
  const { isConnected } = useRealTimeCollaboration({
    documentType: 'notification',
    documentId: userId,
    autoConnect: true,
    onNotificationUpdate: (event) => {
      if (event.action === 'created') {
        loadNotifications();
        loadUnreadCount();
        // Show toast for new notification
        message.info({
          content: `New notification: ${event.data.message}`,
          duration: 3,
        });
      }
    },
  });

  // Load notifications
  const loadNotifications = useCallback(async () => {
    setIsLoading(true);

    try {
      const params = {
        userId,
        ...filters,
        limit: 50,
        sortBy: 'createdAt',
        sortOrder: 'desc' as const,
      };

      const response = await collaborationApi.getUserNotifications(params);
      setNotifications(response.data);
    } catch (error: any) {
      message.error(error.message || 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  }, [userId, filters]);

  // Load unread count
  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await collaborationApi.getUnreadNotificationCount(userId);
      setUnreadCount(response.count);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  }, [userId]);

  // Initial load
  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
  }, [loadNotifications, loadUnreadCount]);

  // Mark notification as read
  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    try {
      await collaborationApi.markNotificationAsRead(notificationId);
      loadNotifications();
      loadUnreadCount();
    } catch (error: any) {
      message.error(error.message || 'Failed to mark as read');
    }
  }, [loadNotifications, loadUnreadCount]);

  // Mark all as read
  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await collaborationApi.markAllNotificationsAsRead(userId);
      loadNotifications();
      loadUnreadCount();
      message.success('All notifications marked as read');
    } catch (error: any) {
      message.error(error.message || 'Failed to mark all as read');
    }
  }, [userId, loadNotifications, loadUnreadCount]);

  // Delete notification
  const handleDeleteNotification = useCallback(async (notificationId: string) => {
    try {
      await collaborationApi.deleteNotification(notificationId);
      loadNotifications();
      loadUnreadCount();
      message.success('Notification deleted');
    } catch (error: any) {
      message.error(error.message || 'Failed to delete notification');
    }
  }, [loadNotifications, loadUnreadCount]);

  // Clear all notifications
  const handleClearAll = useCallback(async () => {
    try {
      await collaborationApi.clearAllNotifications(userId);
      loadNotifications();
      loadUnreadCount();
      message.success('All notifications cleared');
    } catch (error: any) {
      message.error(error.message || 'Failed to clear notifications');
    }
  }, [userId, loadNotifications, loadUnreadCount]);

  // Update notification settings
  const handleUpdateSettings = useCallback(async (newSettings: Partial<NotificationSettings>) => {
    try {
      setSettings(prev => ({ ...prev, ...newSettings }));
      // This would typically save to user preferences
      message.success('Notification settings updated');
    } catch (error: any) {
      message.error(error.message || 'Failed to update settings');
    }
  }, []);

  // Handle notification click
  const handleNotificationClick = useCallback((notification: UserNotification) => {
    // Mark as read if unread
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }

    // Navigate to related content based on notification type
    if (notification.metadata?.documentId && notification.metadata?.documentType) {
      message.info(`Opening ${notification.metadata.documentType} #${notification.metadata.documentId}`);
      // This would navigate to the actual document
    }
  }, [handleMarkAsRead]);

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    if (filters.type && notification.type !== filters.type) return false;
    if (filters.priority && notification.priority !== filters.priority) return false;
    if (filters.read !== undefined && notification.read !== filters.read) return false;
    if (filters.search && !notification.message.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  // Notification type icons
  const typeIcons = {
    COMMENT_MENTION: MessageOutlined,
    REVIEW_ASSIGNED: FileTextOutlined,
    DOCUMENT_UPDATED: FileTextOutlined,
    SYSTEM_ALERT: ExclamationCircleOutlined,
    INFO: InfoCircleOutlined,
    SUCCESS: CheckCircleOutlined,
  };

  // Priority colors
  const priorityColors = {
    LOW: '#52c41a',
    MEDIUM: '#faad14',
    HIGH: '#ff4d4f',
    URGENT: '#722ed1',
  };

  // Settings content
  const settingsContent = (
    <div style={{ width: '300px', padding: '8px' }}>
      <Title level={5}>Notification Settings</Title>

      <div style={{ marginBottom: '16px' }}>
        <Text strong>Notification Types</Text>
        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text>Comment mentions</Text>
            <Switch
              size="small"
              checked={settings.commentMentions}
              onChange={(checked) => handleUpdateSettings({ commentMentions: checked })}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text>Review assignments</Text>
            <Switch
              size="small"
              checked={settings.reviewAssignments}
              onChange={(checked) => handleUpdateSettings({ reviewAssignments: checked })}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text>Document updates</Text>
            <Switch
              size="small"
              checked={settings.documentUpdates}
              onChange={(checked) => handleUpdateSettings({ documentUpdates: checked })}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text>System alerts</Text>
            <Switch
              size="small"
              checked={settings.systemAlerts}
              onChange={(checked) => handleUpdateSettings({ systemAlerts: checked })}
            />
          </div>
        </div>
      </div>

      <div>
        <Text strong>Delivery Methods</Text>
        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text>Email notifications</Text>
            <Switch
              size="small"
              checked={settings.emailNotifications}
              onChange={(checked) => handleUpdateSettings({ emailNotifications: checked })}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text>Push notifications</Text>
            <Switch
              size="small"
              checked={settings.pushNotifications}
              onChange={(checked) => handleUpdateSettings({ pushNotifications: checked })}
            />
          </div>
        </div>
      </div>
    </div>
  );

  // Filter menu
  const filterMenu = {
    items: [
      {
        key: 'unread',
        label: 'Unread only',
        onClick: () => setFilters(prev => ({ ...prev, read: prev.read === false ? undefined : false })),
      },
      {
        key: 'mentions',
        label: 'Mentions',
        onClick: () => setFilters(prev => ({ ...prev, type: prev.type === 'COMMENT_MENTION' ? undefined : 'COMMENT_MENTION' })),
      },
      {
        key: 'reviews',
        label: 'Reviews',
        onClick: () => setFilters(prev => ({ ...prev, type: prev.type === 'REVIEW_ASSIGNED' ? undefined : 'REVIEW_ASSIGNED' })),
      },
      {
        key: 'high-priority',
        label: 'High priority',
        onClick: () => setFilters(prev => ({ ...prev, priority: prev.priority === 'HIGH' ? undefined : 'HIGH' })),
      },
      {
        type: 'divider',
      },
      {
        key: 'clear-filters',
        label: 'Clear filters',
        onClick: () => setFilters({}),
      },
    ],
  };

  return (
    <div className={className}>
      {/* Notification Bell Trigger */}
      <Badge count={unreadCount} size="small">
        <Button
          type="text"
          icon={<BellOutlined />}
          onClick={() => setIsVisible(true)}
          style={{ fontSize: '16px' }}
        />
      </Badge>

      {/* Notification Drawer */}
      <Drawer
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Title level={4} style={{ margin: 0 }}>
                Notifications
              </Title>
              {isConnected && (
                <Badge status="success" text="Live" />
              )}
            </Space>
            <Space>
              <Popover
                content={settingsContent}
                title={null}
                trigger="click"
                open={showSettings}
                onOpenChange={setShowSettings}
                placement="bottomRight"
              >
                <Button type="text" icon={<SettingOutlined />} />
              </Popover>
              <Dropdown menu={filterMenu} trigger={['click']}>
                <Button type="text" icon={<FilterOutlined />} />
              </Dropdown>
            </Space>
          </div>
        }
        placement="right"
        open={isVisible}
        onClose={() => setIsVisible(false)}
        width={400}
        extra={
          <Space>
            {unreadCount > 0 && (
              <Button size="small" onClick={handleMarkAllAsRead}>
                <CheckOutlined /> Mark all read
              </Button>
            )}
            <Button size="small" danger onClick={handleClearAll}>
              <ClearOutlined /> Clear all
            </Button>
          </Space>
        }
      >
        {/* Search and Filters */}
        <div style={{ marginBottom: '16px' }}>
          <Input
            placeholder="Search notifications..."
            prefix={<SearchOutlined />}
            allowClear
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value || undefined }))}
          />
        </div>

        {/* Active Filters */}
        {(filters.type || filters.priority || filters.read !== undefined) && (
          <div style={{ marginBottom: '16px' }}>
            <Space size="small" wrap>
              {filters.type && (
                <Tag
                  closable
                  onClose={() => setFilters(prev => ({ ...prev, type: undefined }))}
                >
                  Type: {filters.type}
                </Tag>
              )}
              {filters.priority && (
                <Tag
                  closable
                  onClose={() => setFilters(prev => ({ ...prev, priority: undefined }))}
                >
                  Priority: {filters.priority}
                </Tag>
              )}
              {filters.read !== undefined && (
                <Tag
                  closable
                  onClose={() => setFilters(prev => ({ ...prev, read: undefined }))}
                >
                  {filters.read ? 'Read' : 'Unread'}
                </Tag>
              )}
            </Space>
          </div>
        )}

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <Empty
            description="No notifications"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <List
            loading={isLoading}
            dataSource={filteredNotifications}
            renderItem={(notification) => {
              const IconComponent = typeIcons[notification.type] || InfoCircleOutlined;
              const isUnread = !notification.read;

              return (
                <List.Item
                  style={{
                    padding: '12px 0',
                    backgroundColor: isUnread ? '#f6ffed' : 'transparent',
                    borderRadius: '4px',
                    marginBottom: '4px',
                    cursor: 'pointer',
                  }}
                  onClick={() => handleNotificationClick(notification)}
                  actions={[
                    <Space key="actions">
                      {isUnread && (
                        <Tooltip title="Mark as read">
                          <Button
                            type="text"
                            size="small"
                            icon={<CheckOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(notification.id);
                            }}
                          />
                        </Tooltip>
                      )}
                      <Tooltip title="Delete">
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<CloseOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNotification(notification.id);
                          }}
                        />
                      </Tooltip>
                    </Space>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Badge dot={isUnread}>
                        <Avatar
                          style={{
                            backgroundColor: priorityColors[notification.priority],
                          }}
                          icon={<IconComponent />}
                          size="small"
                        />
                      </Badge>
                    }
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Text strong={isUnread} style={{ fontSize: '14px' }}>
                          {notification.message}
                        </Text>
                        <Text type="secondary" style={{ fontSize: '12px', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </Text>
                      </div>
                    }
                    description={
                      <div>
                        <div style={{ marginBottom: '4px' }}>
                          <Space size="small">
                            <Tag size="small" color={priorityColors[notification.priority]}>
                              {notification.priority}
                            </Tag>
                            <Tag size="small">{notification.type.replace('_', ' ')}</Tag>
                          </Space>
                        </div>
                        {notification.metadata?.documentType && (
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {notification.metadata.documentType} #{notification.metadata.documentId}
                          </Text>
                        )}
                      </div>
                    }
                  />
                </List.Item>
              );
            }}
          />
        )}
      </Drawer>
    </div>
  );
};

export default NotificationCenter;