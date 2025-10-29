/**
 * RBAC Admin Dashboard Page
 * Created for GitHub Issue #124 - Admin UI for Role and Permission Management
 */

import React from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Space,
  List,
  Avatar,
  Progress,
  Tag,
  Button,
  Timeline,
  Empty,
  Alert,
} from 'antd';
import {
  SafetyOutlined,
  KeyOutlined,
  TeamOutlined,
  GlobalOutlined,
  HomeOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  UserOutlined,
  BarChartOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { rbacAPI } from '@/api/rbac';
import { RBACDashboardStats } from '@/types/rbac';

const { Title, Text } = Typography;

const RBACDashboardPage: React.FC = () => {
  const {
    data: dashboardStats,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['rbac-dashboard-stats'],
    queryFn: () => rbacAPI.getDashboardStats(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'role_created':
        return <SafetyOutlined style={{ color: '#52c41a' }} />;
      case 'role_updated':
        return <SafetyOutlined style={{ color: '#1890ff' }} />;
      case 'permission_assigned':
        return <KeyOutlined style={{ color: '#722ed1' }} />;
      case 'user_assigned':
        return <UserOutlined style={{ color: '#fa8c16' }} />;
      default:
        return <ClockCircleOutlined style={{ color: '#8c8c8c' }} />;
    }
  };

  const getChangeColor = (type: string) => {
    switch (type) {
      case 'role_created':
        return '#52c41a';
      case 'role_updated':
        return '#1890ff';
      case 'permission_assigned':
        return '#722ed1';
      case 'user_assigned':
        return '#fa8c16';
      default:
        return '#8c8c8c';
    }
  };

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="Failed to Load Dashboard"
          description={`Unable to load RBAC dashboard statistics: ${(error as Error).message}`}
          type="error"
          showIcon
          action={
            <Button onClick={() => refetch()} type="primary" size="small">
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2}>
              <BarChartOutlined style={{ marginRight: 8 }} />
              RBAC Dashboard
            </Title>
            <Text type="secondary">
              Overview of role-based access control system statistics and recent activity
            </Text>
          </div>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => refetch()}
            loading={isLoading}
          >
            Refresh
          </Button>
        </div>

        {/* Statistics Cards */}
        <Row gutter={16}>
          <Col xs={24} sm={12} lg={6}>
            <Card loading={isLoading}>
              <Statistic
                title="Total Roles"
                value={dashboardStats?.totalRoles || 0}
                prefix={<SafetyOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">
                  {dashboardStats?.activeRoles || 0} active
                </Text>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card loading={isLoading}>
              <Statistic
                title="Total Permissions"
                value={dashboardStats?.totalPermissions || 0}
                prefix={<KeyOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">
                  {dashboardStats?.activePermissions || 0} active
                </Text>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card loading={isLoading}>
              <Statistic
                title="Global Assignments"
                value={dashboardStats?.totalUserAssignments || 0}
                prefix={<GlobalOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">User role assignments</Text>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card loading={isLoading}>
              <Statistic
                title="Site Assignments"
                value={dashboardStats?.totalSiteAssignments || 0}
                prefix={<HomeOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">Site-specific assignments</Text>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Charts and Lists */}
        <Row gutter={16}>
          {/* Top Roles */}
          <Col xs={24} lg={12}>
            <Card
              title={
                <Space>
                  <TrophyOutlined />
                  <span>Most Used Roles</span>
                </Space>
              }
              loading={isLoading}
            >
              {dashboardStats?.topRoles && dashboardStats.topRoles.length > 0 ? (
                <List
                  itemLayout="horizontal"
                  dataSource={dashboardStats.topRoles}
                  renderItem={(role, index) => {
                    const maxUsers = Math.max(...dashboardStats.topRoles.map(r => r.userCount));
                    const percentage = maxUsers > 0 ? (role.userCount / maxUsers) * 100 : 0;

                    return (
                      <List.Item>
                        <List.Item.Meta
                          avatar={
                            <Avatar
                              style={{
                                backgroundColor: index === 0 ? '#faad14' : index === 1 ? '#d9d9d9' : '#f56a00'
                              }}
                            >
                              {index + 1}
                            </Avatar>
                          }
                          title={
                            <Space>
                              <Text strong>{role.roleName}</Text>
                              <Tag size="small">{role.roleCode}</Tag>
                            </Space>
                          }
                          description={
                            <div>
                              <div style={{ marginBottom: 4 }}>
                                <Text>{role.userCount} users assigned</Text>
                              </div>
                              <Progress
                                percent={percentage}
                                size="small"
                                showInfo={false}
                                strokeColor={index === 0 ? '#faad14' : '#1890ff'}
                              />
                            </div>
                          }
                        />
                      </List.Item>
                    );
                  }}
                />
              ) : (
                <Empty description="No role data available" />
              )}
            </Card>
          </Col>

          {/* Top Permissions */}
          <Col xs={24} lg={12}>
            <Card
              title={
                <Space>
                  <KeyOutlined />
                  <span>Most Used Permissions</span>
                </Space>
              }
              loading={isLoading}
            >
              {dashboardStats?.topPermissions && dashboardStats.topPermissions.length > 0 ? (
                <List
                  itemLayout="horizontal"
                  dataSource={dashboardStats.topPermissions}
                  renderItem={(permission, index) => {
                    const maxUsage = Math.max(...dashboardStats.topPermissions.map(p => p.usageCount));
                    const percentage = maxUsage > 0 ? (permission.usageCount / maxUsage) * 100 : 0;

                    return (
                      <List.Item>
                        <List.Item.Meta
                          avatar={
                            <Avatar
                              style={{
                                backgroundColor: index === 0 ? '#faad14' : index === 1 ? '#d9d9d9' : '#f56a00'
                              }}
                            >
                              {index + 1}
                            </Avatar>
                          }
                          title={
                            <Space>
                              <Text strong>{permission.permissionName}</Text>
                            </Space>
                          }
                          description={
                            <div>
                              <div style={{ marginBottom: 4 }}>
                                <Text code>{permission.permissionCode}</Text>
                                <Text style={{ marginLeft: 8 }}>
                                  Used in {permission.usageCount} roles
                                </Text>
                              </div>
                              <Progress
                                percent={percentage}
                                size="small"
                                showInfo={false}
                                strokeColor={index === 0 ? '#faad14' : '#722ed1'}
                              />
                            </div>
                          }
                        />
                      </List.Item>
                    );
                  }}
                />
              ) : (
                <Empty description="No permission data available" />
              )}
            </Card>
          </Col>
        </Row>

        {/* Recent Activity */}
        <Row>
          <Col span={24}>
            <Card
              title={
                <Space>
                  <ClockCircleOutlined />
                  <span>Recent Activity</span>
                </Space>
              }
              loading={isLoading}
            >
              {dashboardStats?.recentChanges && dashboardStats.recentChanges.length > 0 ? (
                <Timeline>
                  {dashboardStats.recentChanges.map((change, index) => (
                    <Timeline.Item
                      key={change.id || index}
                      dot={getChangeIcon(change.type)}
                      color={getChangeColor(change.type)}
                    >
                      <div>
                        <Text strong>{change.description}</Text>
                        <br />
                        <Space>
                          <Text type="secondary">
                            by {change.performedBy}
                          </Text>
                          <Text type="secondary">
                            {new Date(change.timestamp).toLocaleString()}
                          </Text>
                        </Space>
                      </div>
                    </Timeline.Item>
                  ))}
                </Timeline>
              ) : (
                <Empty description="No recent activity" />
              )}
            </Card>
          </Col>
        </Row>

        {/* System Health Indicators */}
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Card title="Role Health" loading={isLoading}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text>Active Roles</Text>
                  <Text strong>
                    {dashboardStats?.activeRoles || 0} / {dashboardStats?.totalRoles || 0}
                  </Text>
                </div>
                <Progress
                  percent={
                    dashboardStats?.totalRoles
                      ? Math.round(((dashboardStats.activeRoles || 0) / dashboardStats.totalRoles) * 100)
                      : 0
                  }
                  status={
                    dashboardStats?.totalRoles && dashboardStats.activeRoles === dashboardStats.totalRoles
                      ? 'success'
                      : 'normal'
                  }
                />
              </div>
              <Text type="secondary">
                {dashboardStats?.totalRoles
                  ? `${Math.round(((dashboardStats.activeRoles || 0) / dashboardStats.totalRoles) * 100)}% of roles are active`
                  : 'No role data available'}
              </Text>
            </Card>
          </Col>
          <Col xs={24} sm={12}>
            <Card title="Permission Health" loading={isLoading}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text>Active Permissions</Text>
                  <Text strong>
                    {dashboardStats?.activePermissions || 0} / {dashboardStats?.totalPermissions || 0}
                  </Text>
                </div>
                <Progress
                  percent={
                    dashboardStats?.totalPermissions
                      ? Math.round(((dashboardStats.activePermissions || 0) / dashboardStats.totalPermissions) * 100)
                      : 0
                  }
                  status={
                    dashboardStats?.totalPermissions && dashboardStats.activePermissions === dashboardStats.totalPermissions
                      ? 'success'
                      : 'normal'
                  }
                />
              </div>
              <Text type="secondary">
                {dashboardStats?.totalPermissions
                  ? `${Math.round(((dashboardStats.activePermissions || 0) / dashboardStats.totalPermissions) * 100)}% of permissions are active`
                  : 'No permission data available'}
              </Text>
            </Card>
          </Col>
        </Row>

        {/* Quick Actions */}
        <Card title="Quick Actions">
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Card size="small" hoverable>
                <Card.Meta
                  avatar={<SafetyOutlined style={{ fontSize: 24, color: '#52c41a' }} />}
                  title="Manage Roles"
                  description="Create, edit, and configure system roles"
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card size="small" hoverable>
                <Card.Meta
                  avatar={<KeyOutlined style={{ fontSize: 24, color: '#1890ff' }} />}
                  title="Manage Permissions"
                  description="Configure and organize permissions"
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card size="small" hoverable>
                <Card.Meta
                  avatar={<TeamOutlined style={{ fontSize: 24, color: '#722ed1' }} />}
                  title="Assign Roles"
                  description="Assign roles to users and manage access"
                />
              </Card>
            </Col>
          </Row>
        </Card>
      </Space>
    </div>
  );
};

export default RBACDashboardPage;