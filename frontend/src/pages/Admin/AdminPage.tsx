import React, { useState } from 'react';
import {
  Card,
  Typography,
  Space,
  Row,
  Col,
  Menu,
  Button,
  Divider
} from 'antd';
import {
  SettingOutlined,
  UserOutlined,
  SafetyOutlined,
  ApiOutlined,
  KeyOutlined,
  TeamOutlined,
  BarChartOutlined,
  DashboardOutlined
} from '@ant-design/icons';

// Import RBAC Admin Components
import RBACDashboardPage from './RBACDashboardPage';
import RoleManagementPage from './RoleManagementPage';
import PermissionCatalogPage from './PermissionCatalogPage';
import UserRoleAssignmentPage from './UserRoleAssignmentPage';

const { Title, Text, Paragraph } = Typography;

/**
 * Administration Page with RBAC Management
 * Updated for GitHub Issue #124 - Admin UI for Role and Permission Management
 */

const AdminPage: React.FC = () => {
  const [selectedModule, setSelectedModule] = useState<string>('overview');

  const menuItems = [
    {
      key: 'overview',
      icon: <DashboardOutlined />,
      label: 'Overview',
    },
    {
      key: 'rbac',
      icon: <SafetyOutlined />,
      label: 'Role & Permission Management',
      children: [
        {
          key: 'rbac-dashboard',
          icon: <BarChartOutlined />,
          label: 'RBAC Dashboard',
        },
        {
          key: 'roles',
          icon: <SafetyOutlined />,
          label: 'Role Management',
        },
        {
          key: 'permissions',
          icon: <KeyOutlined />,
          label: 'Permission Catalog',
        },
        {
          key: 'user-assignments',
          icon: <TeamOutlined />,
          label: 'User Assignments',
        },
      ],
    },
  ];

  const renderContent = () => {
    switch (selectedModule) {
      case 'rbac-dashboard':
        return <RBACDashboardPage />;
      case 'roles':
        return <RoleManagementPage />;
      case 'permissions':
        return <PermissionCatalogPage />;
      case 'user-assignments':
        return <UserRoleAssignmentPage />;
      case 'overview':
      default:
        return (
          <div style={{ padding: '24px' }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Title level={2}>
                  <SettingOutlined style={{ marginRight: 8 }} />
                  Administration
                </Title>
                <Text type="secondary">
                  System configuration, user management, and security settings
                </Text>
              </div>

              {/* RBAC Management Section */}
              <Card title="Role-Based Access Control (RBAC)">
                <Row gutter={16}>
                  <Col xs={24} sm={12} lg={6}>
                    <Card
                      hoverable
                      size="small"
                      onClick={() => setSelectedModule('rbac-dashboard')}
                      style={{ textAlign: 'center', marginBottom: 16 }}
                    >
                      <BarChartOutlined style={{ fontSize: 32, color: '#1890ff', marginBottom: 8 }} />
                      <div>
                        <Text strong>RBAC Dashboard</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          System overview and analytics
                        </Text>
                      </div>
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <Card
                      hoverable
                      size="small"
                      onClick={() => setSelectedModule('roles')}
                      style={{ textAlign: 'center', marginBottom: 16 }}
                    >
                      <SafetyOutlined style={{ fontSize: 32, color: '#52c41a', marginBottom: 8 }} />
                      <div>
                        <Text strong>Role Management</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          Create and manage roles
                        </Text>
                      </div>
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <Card
                      hoverable
                      size="small"
                      onClick={() => setSelectedModule('permissions')}
                      style={{ textAlign: 'center', marginBottom: 16 }}
                    >
                      <KeyOutlined style={{ fontSize: 32, color: '#722ed1', marginBottom: 8 }} />
                      <div>
                        <Text strong>Permission Catalog</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          Manage system permissions
                        </Text>
                      </div>
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <Card
                      hoverable
                      size="small"
                      onClick={() => setSelectedModule('user-assignments')}
                      style={{ textAlign: 'center', marginBottom: 16 }}
                    >
                      <TeamOutlined style={{ fontSize: 32, color: '#fa8c16', marginBottom: 8 }} />
                      <div>
                        <Text strong>User Assignments</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          Assign roles to users
                        </Text>
                      </div>
                    </Card>
                  </Col>
                </Row>
              </Card>

              {/* Coming Soon Section */}
              <Card title="Additional Features (Coming Soon)">
                <Row gutter={16}>
                  <Col span={12}>
                    <Card
                      hoverable
                      style={{ height: '100%', opacity: 0.7 }}
                      cover={
                        <div style={{ padding: 40, textAlign: 'center', background: '#f0f2f5' }}>
                          <UserOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                        </div>
                      }
                    >
                      <Card.Meta
                        title="User Management"
                        description="Create, modify, and delete user accounts. Manage user profiles and contact information."
                      />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card
                      hoverable
                      style={{ height: '100%', opacity: 0.7 }}
                      cover={
                        <div style={{ padding: 40, textAlign: 'center', background: '#f0f2f5' }}>
                          <ApiOutlined style={{ fontSize: 48, color: '#52c41a' }} />
                        </div>
                      }
                    >
                      <Card.Meta
                        title="System Configuration"
                        description="Configure system-wide settings, integrations, and advanced options."
                      />
                    </Card>
                  </Col>
                </Row>
              </Card>

              {/* Quick Access Section */}
              <Card title="Quick Access">
                <Space wrap style={{ width: '100%' }}>
                  <Button
                    type="primary"
                    icon={<BarChartOutlined />}
                    onClick={() => setSelectedModule('rbac-dashboard')}
                  >
                    RBAC Dashboard
                  </Button>
                  <Button
                    icon={<SafetyOutlined />}
                    onClick={() => setSelectedModule('roles')}
                  >
                    Manage Roles
                  </Button>
                  <Button
                    icon={<KeyOutlined />}
                    onClick={() => setSelectedModule('permissions')}
                  >
                    Manage Permissions
                  </Button>
                  <Button
                    icon={<TeamOutlined />}
                    onClick={() => setSelectedModule('user-assignments')}
                  >
                    Assign Roles
                  </Button>
                </Space>
              </Card>
            </Space>
          </div>
        );
    }
  };

  // Show side navigation for sub-modules
  if (selectedModule !== 'overview') {
    return (
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <div style={{ width: 280, background: '#f0f2f5', padding: '16px' }}>
          <div style={{ marginBottom: 16 }}>
            <Button
              type="link"
              onClick={() => setSelectedModule('overview')}
              style={{ padding: 0, fontWeight: 'bold' }}
            >
              ← Back to Admin Overview
            </Button>
          </div>
          <Menu
            mode="inline"
            selectedKeys={[selectedModule]}
            onClick={({ key }) => setSelectedModule(key)}
            items={menuItems}
            style={{ border: 'none', background: 'transparent' }}
          />
        </div>
        <div style={{ flex: 1, background: '#fff' }}>
          {renderContent()}
        </div>
      </div>
    );
  }

  return renderContent();
};

export default AdminPage;
