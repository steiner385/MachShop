import React, { useState } from 'react';
import {
  Card,
  Typography,
  Space,
  Tabs,
  Button,
  Row,
  Col,
  Alert,
  Spin
} from 'antd';
import {
  CloudOutlined,
  SettingOutlined,
  TeamOutlined,
  SyncOutlined,
  DashboardOutlined,
  SecurityScanOutlined
} from '@ant-design/icons';

// Import Azure AD components
import AzureADConfig from '../../components/Admin/AzureADConfig';
import AzureADDashboard from '../../components/Admin/AzureADDashboard';
import UserSyncManager from '../../components/Admin/UserSyncManager';

const { Title, Text } = Typography;

/**
 * Azure AD / Entra ID Administration Page
 * Manages Azure AD integration and configuration
 */
const AzureADPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [loading, setLoading] = useState(false);

  const tabItems = [
    {
      key: 'dashboard',
      label: (
        <span>
          <DashboardOutlined />
          Dashboard
        </span>
      ),
      children: <AzureADDashboard />,
    },
    {
      key: 'configuration',
      label: (
        <span>
          <SettingOutlined />
          Configuration
        </span>
      ),
      children: <AzureADConfig />,
    },
    {
      key: 'user-sync',
      label: (
        <span>
          <TeamOutlined />
          User Sync
        </span>
      ),
      children: <UserSyncManager />,
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <div>
          <Title level={2}>
            <CloudOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            Azure AD / Entra ID Integration
          </Title>
          <Text type="secondary">
            Configure and manage Azure Active Directory integration for single sign-on and user synchronization
          </Text>
        </div>

        {/* Quick Status Card */}
        <Card>
          <Row gutter={24} align="middle">
            <Col span={18}>
              <Space direction="vertical" size="small">
                <Text strong>Integration Status</Text>
                <Alert
                  message="Azure AD integration is ready for configuration"
                  description="Complete the configuration to enable single sign-on and user synchronization"
                  type="info"
                  showIcon
                  icon={<SecurityScanOutlined />}
                />
              </Space>
            </Col>
            <Col span={6} style={{ textAlign: 'right' }}>
              <Space>
                <Button
                  icon={<SyncOutlined spin={loading} />}
                  loading={loading}
                  onClick={() => {
                    setLoading(true);
                    setTimeout(() => setLoading(false), 2000);
                  }}
                >
                  Refresh Status
                </Button>
                <Button
                  type="primary"
                  icon={<SettingOutlined />}
                  onClick={() => setActiveTab('configuration')}
                >
                  Configure
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Main Content Tabs */}
        <Card>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            size="large"
            tabBarStyle={{ marginBottom: 24 }}
          />
        </Card>
      </Space>
    </div>
  );
};

export default AzureADPage;