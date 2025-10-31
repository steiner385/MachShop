/**
 * Staging Page Component
 *
 * Main page for staging dashboard and workflow management,
 * integrating all staging-related components and views
 */

import React, { useState } from 'react';
import {
  Tabs,
  Card,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Badge,
  Tooltip
} from 'antd';
import {
  DashboardOutlined,
  AppstoreOutlined,
  EnvironmentOutlined,
  BarChartOutlined,
  SettingOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { StagingDashboard } from '../../components/Staging/StagingDashboard';
import { StagingStatusBoard } from '../../components/Staging/StagingStatusBoard';
import { StagingLocationUtilization } from '../../components/Staging/StagingLocationUtilization';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

export const StagingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const tabItems = [
    {
      key: 'dashboard',
      label: (
        <Space>
          <DashboardOutlined />
          Dashboard
        </Space>
      ),
      children: <StagingDashboard key={`dashboard-${refreshKey}`} />
    },
    {
      key: 'status-board',
      label: (
        <Space>
          <AppstoreOutlined />
          Status Board
          <Badge count={12} size="small" />
        </Space>
      ),
      children: <StagingStatusBoard key={`status-${refreshKey}`} />
    },
    {
      key: 'locations',
      label: (
        <Space>
          <EnvironmentOutlined />
          Locations
        </Space>
      ),
      children: <StagingLocationUtilization key={`locations-${refreshKey}`} />
    },
    {
      key: 'analytics',
      label: (
        <Space>
          <BarChartOutlined />
          Analytics
        </Space>
      ),
      children: (
        <Card style={{ padding: 24, textAlign: 'center', minHeight: 400 }}>
          <Title level={4}>Staging Analytics</Title>
          <Text type="secondary">
            Advanced analytics and reporting for staging operations coming soon.
            This will include performance trends, optimization insights, and predictive analytics.
          </Text>
        </Card>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* Page Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>
            Staging Management
          </Title>
          <Text type="secondary">
            Monitor and manage staging workflows, locations, and performance
          </Text>
        </Col>
        <Col>
          <Space>
            <Tooltip title="Refresh all data">
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
              >
                Refresh
              </Button>
            </Tooltip>
            <Button
              icon={<SettingOutlined />}
              onClick={() => console.log('Staging settings')}
            >
              Settings
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Main Content with Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        size="large"
        items={tabItems}
        style={{
          minHeight: 'calc(100vh - 200px)'
        }}
      />
    </div>
  );
};

export default StagingPage;