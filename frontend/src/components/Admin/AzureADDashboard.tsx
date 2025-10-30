import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Timeline,
  Typography,
  Space,
  Alert,
  Progress,
  Button,
  List,
  Badge,
  Tabs,
  Table,
  Tag,
  Avatar,
  Spin
} from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloudOutlined,
  SecurityScanOutlined,
  DashboardOutlined,
  CalendarOutlined,
  WarningOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  syncedUsers: number;
  lastSyncTime: string;
  connectionStatus: 'connected' | 'disconnected' | 'error';
  syncHealth: 'healthy' | 'warning' | 'error';
}

interface SyncActivity {
  id: string;
  type: 'user_sync' | 'group_sync' | 'config_update' | 'test_connection';
  status: 'success' | 'error' | 'warning';
  message: string;
  timestamp: string;
  details?: any;
}

interface UserSyncSummary {
  id: string;
  displayName: string;
  userPrincipalName: string;
  lastSync: string;
  status: 'synced' | 'pending' | 'error';
  roles: string[];
}

const AzureADDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<SyncActivity[]>([]);
  const [recentUsers, setRecentUsers] = useState<UserSyncSummary[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load dashboard stats
      const statsResponse = await axios.get('/api/admin/azure-ad/dashboard/stats');
      setStats(statsResponse.data);

      // Load recent activities
      const activitiesResponse = await axios.get('/api/admin/azure-ad/dashboard/activities');
      setActivities(activitiesResponse.data);

      // Load recent users
      const usersResponse = await axios.get('/api/admin/azure-ad/dashboard/recent-users');
      setRecentUsers(usersResponse.data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'healthy':
      case 'success':
      case 'synced':
        return '#52c41a';
      case 'warning':
      case 'pending':
        return '#faad14';
      case 'disconnected':
      case 'error':
        return '#ff4d4f';
      default:
        return '#d9d9d9';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
      case 'healthy':
      case 'success':
      case 'synced':
        return <CheckCircleOutlined style={{ color: getStatusColor(status) }} />;
      case 'warning':
      case 'pending':
        return <WarningOutlined style={{ color: getStatusColor(status) }} />;
      case 'disconnected':
      case 'error':
        return <ExclamationCircleOutlined style={{ color: getStatusColor(status) }} />;
      default:
        return <ExclamationCircleOutlined style={{ color: getStatusColor(status) }} />;
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Loading Azure AD dashboard...</Text>
        </div>
      </div>
    );
  }

  const userColumns = [
    {
      title: 'User',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (text: string, record: UserSyncSummary) => (
        <Space>
          <Avatar icon={<UserOutlined />} />
          <div>
            <div>{text}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.userPrincipalName}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Badge
          status={status === 'synced' ? 'success' : status === 'pending' ? 'processing' : 'error'}
          text={status.charAt(0).toUpperCase() + status.slice(1)}
        />
      ),
    },
    {
      title: 'Roles',
      dataIndex: 'roles',
      key: 'roles',
      render: (roles: string[]) => (
        <Space wrap>
          {roles.map(role => (
            <Tag key={role} color="blue" size="small">
              {role}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Last Sync',
      dataIndex: 'lastSync',
      key: 'lastSync',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Header */}
      <Row justify="space-between" align="middle">
        <Col>
          <Title level={4}>
            <DashboardOutlined style={{ marginRight: 8 }} />
            Azure AD Dashboard
          </Title>
        </Col>
        <Col>
          <Button
            icon={<SyncOutlined spin={refreshing} />}
            onClick={handleRefresh}
            loading={refreshing}
          >
            Refresh
          </Button>
        </Col>
      </Row>

      {/* Status Alert */}
      {stats && (
        <Alert
          message={`Azure AD Integration Status: ${stats.connectionStatus}`}
          description={`Last sync: ${new Date(stats.lastSyncTime).toLocaleString()}`}
          type={stats.connectionStatus === 'connected' ? 'success' : 'error'}
          showIcon
          icon={getStatusIcon(stats.connectionStatus)}
        />
      )}

      {/* Statistics Cards */}
      <Row gutter={16}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Users"
              value={stats?.totalUsers || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Users"
              value={stats?.activeUsers || 0}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Synced Users"
              value={stats?.syncedUsers || 0}
              prefix={<SyncOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '14px', color: '#8c8c8c' }}>Sync Health</div>
                <div style={{ fontSize: '24px', fontWeight: 600, color: getStatusColor(stats?.syncHealth || 'error') }}>
                  {getStatusIcon(stats?.syncHealth || 'error')}
                  <span style={{ marginLeft: 8 }}>
                    {stats?.syncHealth ? stats.syncHealth.charAt(0).toUpperCase() + stats.syncHealth.slice(1) : 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Main Content */}
      <Row gutter={16}>
        <Col xs={24} lg={16}>
          <Card title="Recent Users" size="small">
            <Table
              dataSource={recentUsers}
              columns={userColumns}
              pagination={{ pageSize: 10 }}
              rowKey="id"
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Recent Activity" size="small">
            <Timeline>
              {activities.slice(0, 8).map((activity) => (
                <Timeline.Item
                  key={activity.id}
                  dot={getStatusIcon(activity.status)}
                  color={getStatusColor(activity.status)}
                >
                  <div>
                    <Text strong>{activity.message}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      <CalendarOutlined style={{ marginRight: 4 }} />
                      {new Date(activity.timestamp).toLocaleString()}
                    </Text>
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
            {activities.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Text type="secondary">No recent activity</Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Card title="Quick Actions" size="small">
        <Space wrap>
          <Button icon={<SyncOutlined />} type="primary">
            Sync Now
          </Button>
          <Button icon={<SecurityScanOutlined />}>
            Test Connection
          </Button>
          <Button icon={<TeamOutlined />}>
            Manage Users
          </Button>
          <Button icon={<CloudOutlined />}>
            Configuration
          </Button>
        </Space>
      </Card>
    </Space>
  );
};

export default AzureADDashboard;