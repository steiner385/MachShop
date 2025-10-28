import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Timeline,
  Typography,
  Avatar,
  Space,
  Tag,
  Button,
  Input,
  Select,
  DatePicker,
  Empty,
  message,
  Tooltip,
  Badge,
  Statistic,
  Row,
  Col,
} from 'antd';
import {
  MessageOutlined,
  FileTextOutlined,
  EditOutlined,
  CheckCircleOutlined,
  UserAddOutlined,
  UserOutlined,
  CalendarOutlined,
  FilterOutlined,
  ReloadOutlined,
  EyeOutlined,
  CommentOutlined,
  HighlightOutlined,
} from '@ant-design/icons';
import { formatDistanceToNow, format } from 'date-fns';
import {
  DocumentActivity,
  ActivityType,
} from '@/api/collaboration';
import { collaborationApi } from '@/api/collaboration';
import { useRealTimeCollaboration } from '@/hooks/useRealTimeCollaboration';

const { Text, Title } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface ActivityFeedProps {
  documentType?: string;
  documentId?: string;
  userId?: string;
  showStats?: boolean;
  maxItems?: number;
  className?: string;
}

interface ActivityFilters {
  activityType?: ActivityType;
  userId?: string;
  dateRange?: [string, string];
  search?: string;
}

interface ActivityStats {
  totalActivities: number;
  todayActivities: number;
  activeUsers: number;
  mostActiveUser: string;
}

/**
 * Activity Feed Component
 * Displays collaboration activities with real-time updates
 */
export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  documentType,
  documentId,
  userId,
  showStats = true,
  maxItems = 50,
  className,
}) => {
  // State
  const [activities, setActivities] = useState<DocumentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<ActivityFilters>({});
  const [stats, setStats] = useState<ActivityStats | null>(null);

  // Real-time updates
  const { isConnected } = useRealTimeCollaboration({
    documentType: documentType || 'activity',
    documentId: documentId || 'feed',
    autoConnect: true,
    onActivityUpdate: (event) => {
      if (event.action === 'created') {
        loadActivities();
        loadStats();
      }
    },
  });

  // Load activities
  const loadActivities = useCallback(async () => {
    setIsLoading(true);

    try {
      const params = {
        ...(documentType && { documentType }),
        ...(documentId && { documentId }),
        ...(userId && { userId }),
        ...filters,
        limit: maxItems,
        sortBy: 'createdAt',
        sortOrder: 'desc' as const,
      };

      const response = await collaborationApi.getActivities(params);
      setActivities(response.data);
    } catch (error: any) {
      message.error(error.message || 'Failed to load activities');
    } finally {
      setIsLoading(false);
    }
  }, [documentType, documentId, userId, filters, maxItems]);

  // Load statistics
  const loadStats = useCallback(async () => {
    if (!showStats) return;

    try {
      const params = {
        ...(documentType && { documentType }),
        ...(documentId && { documentId }),
        ...(userId && { userId }),
      };

      const response = await collaborationApi.getActivityStats(params);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load activity stats:', error);
    }
  }, [documentType, documentId, userId, showStats]);

  // Initial load
  useEffect(() => {
    loadActivities();
    loadStats();
  }, [loadActivities, loadStats]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Partial<ActivityFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Activity type icons and colors
  const activityConfig = {
    DOCUMENT_CREATED: {
      icon: FileTextOutlined,
      color: '#52c41a',
      label: 'Created',
    },
    DOCUMENT_UPDATED: {
      icon: EditOutlined,
      color: '#1890ff',
      label: 'Updated',
    },
    DOCUMENT_APPROVED: {
      icon: CheckCircleOutlined,
      color: '#52c41a',
      label: 'Approved',
    },
    DOCUMENT_REJECTED: {
      icon: CheckCircleOutlined,
      color: '#ff4d4f',
      label: 'Rejected',
    },
    COMMENT_ADDED: {
      icon: CommentOutlined,
      color: '#faad14',
      label: 'Commented',
    },
    ANNOTATION_ADDED: {
      icon: HighlightOutlined,
      color: '#722ed1',
      label: 'Annotated',
    },
    REVIEW_ASSIGNED: {
      icon: UserAddOutlined,
      color: '#13c2c2',
      label: 'Review Assigned',
    },
    REVIEW_COMPLETED: {
      icon: CheckCircleOutlined,
      color: '#52c41a',
      label: 'Review Completed',
    },
    USER_ACCESSED: {
      icon: EyeOutlined,
      color: '#8c8c8c',
      label: 'Accessed',
    },
  };

  // Get activity description
  const getActivityDescription = (activity: DocumentActivity) => {
    const config = activityConfig[activity.activityType];
    const timeAgo = formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true });

    let description = `${config.label} ${activity.documentTitle || `${activity.documentType} #${activity.documentId}`}`;

    if (activity.details) {
      description += ` - ${activity.details}`;
    }

    return { description, timeAgo };
  };

  // Group activities by date
  const groupedActivities = activities.reduce((groups, activity) => {
    const date = format(new Date(activity.createdAt), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
    return groups;
  }, {} as Record<string, DocumentActivity[]>);

  return (
    <div className={className}>
      {/* Statistics */}
      {showStats && stats && (
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="Total Activities"
                value={stats.totalActivities}
                prefix={<FileTextOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="Today"
                value={stats.todayActivities}
                prefix={<CalendarOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="Active Users"
                value={stats.activeUsers}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="Most Active"
                value={stats.mostActiveUser}
                prefix={<UserOutlined />}
                valueStyle={{ fontSize: '14px' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Title level={4} style={{ margin: 0 }}>
                Activity Feed
              </Title>
              {isConnected && (
                <Badge status="success" text="Live" />
              )}
            </Space>
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={() => {
                loadActivities();
                loadStats();
              }}
              title="Refresh"
            />
          </div>
        }
      >
        {/* Filters */}
        <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Search
            placeholder="Search activities..."
            style={{ width: '250px' }}
            onSearch={(value) => handleFilterChange({ search: value || undefined })}
            allowClear
          />

          <Select
            placeholder="Activity Type"
            style={{ width: '150px' }}
            allowClear
            onChange={(value) => handleFilterChange({ activityType: value })}
          >
            {Object.entries(activityConfig).map(([type, config]) => (
              <Option key={type} value={type}>
                {config.label}
              </Option>
            ))}
          </Select>

          <RangePicker
            placeholder={['Start Date', 'End Date']}
            onChange={(dates) => {
              const range = dates ? [dates[0]?.toISOString(), dates[1]?.toISOString()] as [string, string] : undefined;
              handleFilterChange({ dateRange: range });
            }}
          />
        </div>

        {/* Activity Timeline */}
        {activities.length === 0 ? (
          <Empty
            description="No activities"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {Object.entries(groupedActivities).map(([date, dayActivities]) => (
              <div key={date} style={{ marginBottom: '24px' }}>
                <div style={{ marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #f0f0f0' }}>
                  <Text strong>{format(new Date(date), 'MMMM dd, yyyy')}</Text>
                </div>

                <Timeline>
                  {dayActivities.map((activity) => {
                    const config = activityConfig[activity.activityType];
                    const IconComponent = config.icon;
                    const { description, timeAgo } = getActivityDescription(activity);

                    return (
                      <Timeline.Item
                        key={activity.id}
                        dot={
                          <Avatar
                            size="small"
                            style={{ backgroundColor: config.color }}
                            icon={<IconComponent />}
                          />
                        }
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                              <Space>
                                <Avatar size="small" icon={<UserOutlined />}>
                                  {activity.userName?.[0]?.toUpperCase()}
                                </Avatar>
                                <Text strong>{activity.userName}</Text>
                              </Space>
                              <div style={{ marginTop: '4px' }}>
                                <Text>{description}</Text>
                              </div>
                              <div style={{ marginTop: '4px' }}>
                                <Space size="small">
                                  <Tag size="small" color={config.color}>
                                    {config.label}
                                  </Tag>
                                  <Text type="secondary" style={{ fontSize: '12px' }}>
                                    {timeAgo}
                                  </Text>
                                </Space>
                              </div>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                {format(new Date(activity.createdAt), 'HH:mm')}
                              </Text>
                            </div>
                          </div>

                          {/* Additional details */}
                          {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                            <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fafafa', borderRadius: '4px' }}>
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                Additional details:
                              </Text>
                              <div style={{ marginTop: '4px' }}>
                                {Object.entries(activity.metadata).map(([key, value]) => (
                                  <div key={key} style={{ fontSize: '12px' }}>
                                    <Text type="secondary">{key}: </Text>
                                    <Text>{String(value)}</Text>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </Timeline.Item>
                    );
                  })}
                </Timeline>
              </div>
            ))}
          </div>
        )}

        {/* Load more button */}
        {activities.length >= maxItems && (
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <Button
              type="primary"
              ghost
              onClick={() => {
                // This would load more activities with pagination
                message.info('Load more functionality would be implemented here');
              }}
            >
              Load More Activities
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ActivityFeed;