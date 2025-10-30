import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Space,
  Button,
  Alert,
  Timeline,
  List,
  Avatar,
  Tag,
  Progress,
  Tooltip,
  Badge,
  Table,
} from 'antd';
import {
  CloudOutlined,
  UserOutlined,
  TeamOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  SettingOutlined,
  ReloadOutlined,
  TrendingUpOutlined,
  SecurityScanOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

interface DashboardStats {
  totalProviders: number;
  activeProviders: number;
  totalUsers: number;
  syncedUsers: number;
  pendingUsers: number;
  failedUsers: number;
  totalGroups: number;
  syncedGroups: number;
  lastSyncAt?: string;
  syncInProgress: boolean;
  syncProgress?: number;
  healthStatus: 'healthy' | 'warning' | 'error';
}

interface RecentActivity {
  id: string;
  type: 'sync' | 'config' | 'error' | 'user_created';
  message: string;
  timestamp: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  details?: string;
}

interface Provider {
  id: string;
  name: string;
  enabled: boolean;
  status: 'active' | 'inactive' | 'error';
  lastSync?: string;
  userCount: number;
  groupCount: number;
}

interface SyncIssue {
  id: string;
  type: 'user_conflict' | 'group_conflict' | 'permission_error' | 'connection_error';
  description: string;
  affectedItem: string;
  severity: 'high' | 'medium' | 'low';
  timestamp: string;
}

const AzureADDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [syncIssues, setSyncIssues] = useState<SyncIssue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    // Set up polling for real-time updates
    const interval = setInterval(fetchDashboardData, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // Fetch stats
      const statsResponse = await fetch('/api/v1/admin/azure-ad/dashboard/stats', { headers });
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Fetch recent activity
      const activityResponse = await fetch('/api/v1/admin/azure-ad/dashboard/activity', { headers });
      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        setRecentActivity(activityData.activities || []);
      }

      // Fetch providers
      const providersResponse = await fetch('/api/v1/admin/sso/providers?type=AZURE_AD', { headers });
      if (providersResponse.ok) {
        const providersData = await providersResponse.json();
        setProviders(providersData.providers || []);
      }

      // Fetch sync issues
      const issuesResponse = await fetch('/api/v1/admin/azure-ad/dashboard/issues', { headers });
      if (issuesResponse.ok) {
        const issuesData = await issuesResponse.json();
        setSyncIssues(issuesData.issues || []);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'sync': return <SyncOutlined style={{ color: '#1890ff' }} />;
      case 'config': return <SettingOutlined style={{ color: '#722ed1' }} />;
      case 'error': return <ExclamationCircleOutlined style={{ color: '#f5222d' }} />;
      case 'user_created': return <UserOutlined style={{ color: '#52c41a' }} />;
      default: return <CloudOutlined style={{ color: '#1890ff' }} />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'blue';
      default: return 'default';
    }
  };

  const providerColumns: ColumnsType<Provider> = [
    {
      title: 'Provider',
      key: 'provider',
      render: (_, record) => (
        <Space>
          <Avatar size="small" icon={<CloudOutlined />} />
          <div>
            <div style={{ fontWeight: 'bold' }}>{record.name}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.enabled ? 'Enabled' : 'Disabled'}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Badge
          status={status === 'active' ? 'success' : status === 'error' ? 'error' : 'default'}
          text={status.charAt(0).toUpperCase() + status.slice(1)}
        />
      ),
    },
    {
      title: 'Users',
      dataIndex: 'userCount',
      key: 'userCount',
    },
    {
      title: 'Groups',
      dataIndex: 'groupCount',
      key: 'groupCount',
    },
    {
      title: 'Last Sync',
      dataIndex: 'lastSync',
      key: 'lastSync',
      render: (date) => date ? new Date(date).toLocaleDateString() : 'Never',
    },
  ];

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <SyncOutlined spin style={{ fontSize: 24 }} />
          <div style={{ marginTop: 16 }}>Loading Azure AD Dashboard...</div>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 24 }}>
          <Title level={3}>
            <CloudOutlined /> Azure AD Integration Dashboard
          </Title>
          <Text type="secondary">
            Monitor and manage your Azure Active Directory integration
          </Text>
        </div>

        {/* Overall Health Status */}
        {stats && (
          <Alert
            type={getHealthStatusColor(stats.healthStatus)}
            message={`Azure AD Integration Status: ${stats.healthStatus.toUpperCase()}`}
            description={
              stats.syncInProgress ? (
                <div>
                  <Text>Synchronization in progress...</Text>
                  {stats.syncProgress && (
                    <Progress
                      percent={stats.syncProgress}
                      size="small"
                      style={{ marginTop: 8 }}
                    />
                  )}
                </div>
              ) : (
                `Last synchronization: ${stats.lastSyncAt ? new Date(stats.lastSyncAt).toLocaleString() : 'Never'}`
              )
            }
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        {/* Statistics Cards */}
        {stats && (
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="Total Providers"
                  value={stats.totalProviders}
                  prefix={<CloudOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
                <Text type="secondary">{stats.activeProviders} active</Text>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="Total Users"
                  value={stats.totalUsers}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
                <Text type="secondary">{stats.syncedUsers} synced</Text>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="Total Groups"
                  value={stats.totalGroups}
                  prefix={<TeamOutlined />}
                  valueStyle={{ color: '#faad14' }}
                />
                <Text type="secondary">{stats.syncedGroups} synced</Text>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="Pending Actions"
                  value={stats.pendingUsers + stats.failedUsers}
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: stats.pendingUsers + stats.failedUsers > 0 ? '#f5222d' : '#52c41a' }}
                />
                <Text type="secondary">Require attention</Text>
              </Card>
            </Col>
          </Row>
        )}

        <Row gutter={16}>
          {/* Providers Overview */}
          <Col span={12}>
            <Card
              title="Active Providers"
              size="small"
              extra={
                <Tooltip title="Refresh Data">
                  <Button
                    size="small"
                    icon={<ReloadOutlined />}
                    onClick={fetchDashboardData}
                    loading={loading}
                  />
                </Tooltip>
              }
            >
              <Table
                columns={providerColumns}
                dataSource={providers}
                rowKey="id"
                size="small"
                pagination={false}
                scroll={{ y: 200 }}
              />
            </Card>
          </Col>

          {/* Recent Activity */}
          <Col span={12}>
            <Card title="Recent Activity" size="small">
              <List
                size="small"
                dataSource={recentActivity.slice(0, 6)}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={getActivityIcon(item.type)}
                      title={
                        <Space>
                          <Text style={{ fontSize: '13px' }}>{item.message}</Text>
                          <Tag color={getSeverityColor(item.severity)} size="small">
                            {item.severity}
                          </Tag>
                        </Space>
                      }
                      description={
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          {new Date(item.timestamp).toLocaleString()}
                        </Text>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>

        {/* Sync Issues */}
        {syncIssues.length > 0 && (
          <Card
            title="Sync Issues Requiring Attention"
            size="small"
            style={{ marginTop: 16 }}
            extra={
              <Tag color="orange">{syncIssues.length} issue(s)</Tag>
            }
          >
            <List
              size="small"
              dataSource={syncIssues}
              renderItem={(issue) => (
                <List.Item
                  actions={[
                    <Button key="resolve" size="small" type="link">
                      Resolve
                    </Button>,
                    <Button key="details" size="small" type="link">
                      Details
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <ExclamationCircleOutlined
                        style={{
                          color: issue.severity === 'high' ? '#f5222d' :
                                issue.severity === 'medium' ? '#faad14' : '#1890ff'
                        }}
                      />
                    }
                    title={
                      <Space>
                        <Text style={{ fontSize: '14px' }}>{issue.description}</Text>
                        <Tag color={getSeverityColor(issue.severity)} size="small">
                          {issue.severity}
                        </Tag>
                      </Space>
                    }
                    description={
                      <div>
                        <Text type="secondary">Affected: {issue.affectedItem}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          {new Date(issue.timestamp).toLocaleString()}
                        </Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        )}

        {/* Quick Actions */}
        <Card title="Quick Actions" size="small" style={{ marginTop: 16 }}>
          <Space wrap>
            <Button type="primary" icon={<SettingOutlined />}>
              Configure Providers
            </Button>
            <Button icon={<SyncOutlined />}>
              Sync All Providers
            </Button>
            <Button icon={<UserOutlined />}>
              Manage Users
            </Button>
            <Button icon={<TeamOutlined />}>
              Manage Groups
            </Button>
            <Button icon={<SecurityScanOutlined />}>
              Test Connections
            </Button>
            <Button icon={<ApiOutlined />}>
              API Documentation
            </Button>
          </Space>
        </Card>
      </Card>
    </div>
  );
};

export default AzureADDashboard;