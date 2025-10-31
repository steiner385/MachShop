/**
 * Kit Analytics Page Component
 *
 * Main page for kit analytics, reporting, and cost analysis
 * integrating all analytics-related components and dashboards
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
  Tooltip,
  Select,
  DatePicker
} from 'antd';
import {
  BarChartOutlined,
  FileTextOutlined,
  DollarOutlined,
  ReloadOutlined,
  SettingOutlined,
  ExportOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { KitAnalyticsDashboard } from '../../components/Kits/KitAnalyticsDashboard';
import { KitReportGenerator } from '../../components/Kits/KitReportGenerator';
import { KitCostAnalysis } from '../../components/Kits/KitCostAnalysis';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { Option } = Select;

export const KitAnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);
  const [globalTimeRange, setGlobalTimeRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'days'),
    dayjs()
  ]);
  const [globalFilters, setGlobalFilters] = useState({
    area: 'all',
    priority: [],
    status: []
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleExportAll = () => {
    console.log('Exporting all analytics data...');
    // TODO: Implement comprehensive export functionality
  };

  const tabItems = [
    {
      key: 'dashboard',
      label: (
        <Space>
          <BarChartOutlined />
          Analytics Dashboard
        </Space>
      ),
      children: (
        <KitAnalyticsDashboard
          key={`dashboard-${refreshKey}`}
          timeRange={globalTimeRange}
          filters={globalFilters}
        />
      )
    },
    {
      key: 'reports',
      label: (
        <Space>
          <FileTextOutlined />
          Report Generator
          <Badge count={3} size="small" />
        </Space>
      ),
      children: <KitReportGenerator key={`reports-${refreshKey}`} />
    },
    {
      key: 'cost-analysis',
      label: (
        <Space>
          <DollarOutlined />
          Cost Analysis
        </Space>
      ),
      children: <KitCostAnalysis key={`cost-${refreshKey}`} />
    },
    {
      key: 'performance',
      label: (
        <Space>
          <BarChartOutlined />
          Performance Metrics
        </Space>
      ),
      children: (
        <Card style={{ padding: 24, textAlign: 'center', minHeight: 400 }}>
          <Title level={4}>Performance Metrics Dashboard</Title>
          <Text type="secondary">
            Detailed performance metrics including throughput analysis, efficiency tracking,
            quality scoring, and operational KPIs coming soon.
          </Text>
          <div style={{ marginTop: 24 }}>
            <Space>
              <Button type="primary" size="large">
                View Sample Report
              </Button>
              <Button size="large">
                Configure Metrics
              </Button>
            </Space>
          </div>
        </Card>
      )
    },
    {
      key: 'predictive',
      label: (
        <Space>
          <BarChartOutlined />
          Predictive Analytics
        </Space>
      ),
      children: (
        <Card style={{ padding: 24, textAlign: 'center', minHeight: 400 }}>
          <Title level={4}>Predictive Analytics</Title>
          <Text type="secondary">
            Advanced machine learning models for demand forecasting, shortage prediction,
            cost optimization, and capacity planning will be available here.
          </Text>
          <div style={{ marginTop: 24 }}>
            <Space direction="vertical" size="middle">
              <Text>Coming Features:</Text>
              <ul style={{ textAlign: 'left', display: 'inline-block' }}>
                <li>Demand forecasting models</li>
                <li>Shortage prediction algorithms</li>
                <li>Cost optimization recommendations</li>
                <li>Capacity planning insights</li>
                <li>Quality prediction models</li>
              </ul>
            </Space>
          </div>
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
            Kit Analytics & Reporting
          </Title>
          <Text type="secondary">
            Comprehensive analytics, reporting, and insights for kit management optimization
          </Text>
        </Col>
        <Col>
          <Space>
            <Tooltip title="Apply filters across all analytics">
              <RangePicker
                value={globalTimeRange}
                onChange={(dates) => dates && setGlobalTimeRange(dates)}
                style={{ width: 280 }}
              />
            </Tooltip>
            <Select
              value={globalFilters.area}
              onChange={(value) => setGlobalFilters(prev => ({ ...prev, area: value }))}
              style={{ width: 120 }}
              placeholder="Area"
            >
              <Option value="all">All Areas</Option>
              <Option value="assembly">Assembly</Option>
              <Option value="storage">Storage</Option>
              <Option value="inspection">Inspection</Option>
            </Select>
            <Tooltip title="Refresh all analytics data">
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
              >
                Refresh
              </Button>
            </Tooltip>
            <Tooltip title="Export comprehensive analytics report">
              <Button
                icon={<ExportOutlined />}
                type="primary"
                onClick={handleExportAll}
              >
                Export All
              </Button>
            </Tooltip>
            <Button
              icon={<SettingOutlined />}
              onClick={() => console.log('Analytics settings')}
            >
              Settings
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Quick Stats Bar */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small">
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>TOTAL KITS ANALYZED</Text>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1890ff' }}>
                1,247
              </div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>AVG COMPLETION TIME</Text>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#52c41a' }}>
                4.2h
              </div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>COST EFFICIENCY</Text>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#faad14' }}>
                87.5%
              </div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>POTENTIAL SAVINGS</Text>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#722ed1' }}>
                $47K
              </div>
            </div>
          </Card>
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
          minHeight: 'calc(100vh - 280px)'
        }}
        tabBarExtraContent={
          <Space>
            <Tooltip title="Download current view">
              <Button
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => console.log(`Downloading ${activeTab} view`)}
              >
                Download
              </Button>
            </Tooltip>
          </Space>
        }
      />
    </div>
  );
};

export default KitAnalyticsPage;