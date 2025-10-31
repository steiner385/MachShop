/**
 * Staging Dashboard Component
 *
 * Real-time dashboard for monitoring staging processes, location utilization,
 * and staging workflow status across the manufacturing facility
 */

import React, { useEffect, useState } from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Progress,
  Table,
  Tag,
  Alert,
  Space,
  Button,
  Typography,
  Divider,
  Timeline,
  Badge,
  Tooltip,
  Spin,
  Select,
  DatePicker
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DashboardOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  EnvironmentOutlined,
  UserOutlined,
  CalendarOutlined,
  TruckOutlined,
  SyncOutlined,
  RightOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useKitStore } from '../../store/kitStore';
import {
  KitStatus,
  KitPriority,
  KitStatusColors,
  KitStatusLabels,
  KitPriorityColors,
  KitPriorityLabels
} from '../../types/kits';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface StagingDashboardData {
  activeStagingProcesses: number;
  completedToday: number;
  averageCompletionTime: number;
  locationUtilization: Record<string, {
    locationCode: string;
    currentOccupancy: number;
    maxCapacity: number;
    utilizationRate: number;
  }>;
  pendingAssignments: Array<{
    kitId: string;
    kitNumber: string;
    priority: string;
    waitTime: number;
  }>;
  alerts: Array<{
    type: 'CAPACITY' | 'OVERDUE' | 'SHORTAGE' | 'QUALITY';
    message: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    locationId?: string;
    kitId?: string;
    timestamp: string;
  }>;
  recentActivity: Array<{
    id: string;
    type: 'ASSIGNED' | 'STARTED' | 'COMPLETED' | 'DELAYED';
    kitNumber: string;
    locationCode: string;
    timestamp: string;
    description: string;
  }>;
  performanceMetrics: {
    onTimeCompletion: number;
    averageUtilization: number;
    throughput: number;
    qualityScore: number;
  };
}

export const StagingDashboard: React.FC = () => {
  // Store state
  const { kitStatistics, loading, fetchKitStatistics } = useKitStore();

  // Local state
  const [dashboardData, setDashboardData] = useState<StagingDashboardData | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'today' | 'week' | 'month'>('today');
  const [selectedArea, setSelectedArea] = useState<string>('all');

  // Load dashboard data
  const loadDashboardData = async () => {
    setLoadingDashboard(true);
    try {
      // TODO: Replace with actual API call to staging dashboard endpoint
      // const data = await kitsApiClient.staging.getStagingDashboard();

      // Mock data for development
      const mockData: StagingDashboardData = {
        activeStagingProcesses: 12,
        completedToday: 8,
        averageCompletionTime: 4.2,
        locationUtilization: {
          'STG-A1': { locationCode: 'STG-A1', currentOccupancy: 8, maxCapacity: 10, utilizationRate: 80 },
          'STG-A2': { locationCode: 'STG-A2', currentOccupancy: 6, maxCapacity: 10, utilizationRate: 60 },
          'STG-B1': { locationCode: 'STG-B1', currentOccupancy: 10, maxCapacity: 12, utilizationRate: 83 },
          'STG-B2': { locationCode: 'STG-B2', currentOccupancy: 4, maxCapacity: 8, utilizationRate: 50 },
          'STG-C1': { locationCode: 'STG-C1', currentOccupancy: 12, maxCapacity: 15, utilizationRate: 80 }
        },
        pendingAssignments: [
          { kitId: '1', kitNumber: 'KIT-WO-12345-01', priority: 'HIGH', waitTime: 2.5 },
          { kitId: '2', kitNumber: 'KIT-WO-12346-01', priority: 'URGENT', waitTime: 1.2 },
          { kitId: '3', kitNumber: 'KIT-WO-12347-01', priority: 'NORMAL', waitTime: 4.1 }
        ],
        alerts: [
          {
            type: 'CAPACITY',
            message: 'Staging area STG-B1 near capacity (83%)',
            severity: 'MEDIUM',
            locationId: 'STG-B1',
            timestamp: dayjs().subtract(15, 'minutes').toISOString()
          },
          {
            type: 'OVERDUE',
            message: 'Kit KIT-WO-12340-01 staging overdue by 2 hours',
            severity: 'HIGH',
            kitId: 'kit-1',
            timestamp: dayjs().subtract(30, 'minutes').toISOString()
          },
          {
            type: 'SHORTAGE',
            message: 'Material shortage affecting 3 kits in staging',
            severity: 'CRITICAL',
            timestamp: dayjs().subtract(45, 'minutes').toISOString()
          }
        ],
        recentActivity: [
          {
            id: '1',
            type: 'COMPLETED',
            kitNumber: 'KIT-WO-12338-01',
            locationCode: 'STG-A1',
            timestamp: dayjs().subtract(10, 'minutes').toISOString(),
            description: 'Staging completed successfully'
          },
          {
            id: '2',
            type: 'STARTED',
            kitNumber: 'KIT-WO-12339-01',
            locationCode: 'STG-B2',
            timestamp: dayjs().subtract(25, 'minutes').toISOString(),
            description: 'Staging process initiated'
          },
          {
            id: '3',
            type: 'ASSIGNED',
            kitNumber: 'KIT-WO-12340-01',
            locationCode: 'STG-C1',
            timestamp: dayjs().subtract(1, 'hour').toISOString(),
            description: 'Kit assigned to staging location'
          }
        ],
        performanceMetrics: {
          onTimeCompletion: 94.2,
          averageUtilization: 72.3,
          throughput: 85.6,
          qualityScore: 98.1
        }
      };

      setDashboardData(mockData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoadingDashboard(false);
    }
  };

  // Load data on mount and set up refresh interval
  useEffect(() => {
    loadDashboardData();
    fetchKitStatistics();

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadDashboardData();
      fetchKitStatistics();
    }, 30000);

    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedTimeRange, selectedArea]);

  const handleRefresh = () => {
    loadDashboardData();
    fetchKitStatistics();
  };

  // Alert severity colors
  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return '#ff4d4f';
      case 'HIGH': return '#fa8c16';
      case 'MEDIUM': return '#faad14';
      case 'LOW': return '#52c41a';
      default: return '#1890ff';
    }
  };

  // Alert severity icons
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'CAPACITY': return <EnvironmentOutlined />;
      case 'OVERDUE': return <ClockCircleOutlined />;
      case 'SHORTAGE': return <ExclamationCircleOutlined />;
      case 'QUALITY': return <CheckCircleOutlined />;
      default: return <WarningOutlined />;
    }
  };

  // Activity type colors
  const getActivityColor = (type: string) => {
    switch (type) {
      case 'COMPLETED': return 'success';
      case 'STARTED': return 'processing';
      case 'ASSIGNED': return 'default';
      case 'DELAYED': return 'error';
      default: return 'default';
    }
  };

  // Pending assignments table columns
  const pendingColumns: ColumnsType<any> = [
    {
      title: 'Kit Number',
      dataIndex: 'kitNumber',
      key: 'kitNumber',
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string) => (
        <Tag color={KitPriorityColors[priority as KitPriority]}>
          {priority}
        </Tag>
      )
    },
    {
      title: 'Wait Time',
      dataIndex: 'waitTime',
      key: 'waitTime',
      render: (time: number) => (
        <Text type={time > 3 ? 'danger' : time > 2 ? 'warning' : undefined}>
          {time.toFixed(1)}h
        </Text>
      )
    }
  ];

  if (loadingDashboard && !dashboardData) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>Loading staging dashboard...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>
            <DashboardOutlined style={{ marginRight: 8 }} />
            Staging Dashboard
          </Title>
          <Text type="secondary">
            Real-time monitoring of staging processes and facility utilization
          </Text>
        </Col>
        <Col>
          <Space>
            <Select
              value={selectedTimeRange}
              onChange={setSelectedTimeRange}
              style={{ width: 120 }}
            >
              <Option value="today">Today</Option>
              <Option value="week">This Week</Option>
              <Option value="month">This Month</Option>
            </Select>
            <Select
              value={selectedArea}
              onChange={setSelectedArea}
              style={{ width: 150 }}
            >
              <Option value="all">All Areas</Option>
              <Option value="area-a">Assembly Area A</Option>
              <Option value="area-b">Assembly Area B</Option>
              <Option value="area-c">Assembly Area C</Option>
            </Select>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={loadingDashboard}
            >
              Refresh
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Key Metrics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Active Processes"
              value={dashboardData?.activeStagingProcesses || 0}
              prefix={<SyncOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Completed Today"
              value={dashboardData?.completedToday || 0}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Avg Completion Time"
              value={dashboardData?.averageCompletionTime || 0}
              suffix="hours"
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
              precision={1}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Pending Assignments"
              value={dashboardData?.pendingAssignments.length || 0}
              prefix={<TruckOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Performance Metrics */}
      {dashboardData?.performanceMetrics && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={24}>
            <Card title="Performance Metrics" size="small">
              <Row gutter={16}>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="On-Time Completion"
                    value={dashboardData.performanceMetrics.onTimeCompletion}
                    suffix="%"
                    valueStyle={{
                      color: dashboardData.performanceMetrics.onTimeCompletion >= 95 ? '#52c41a' :
                             dashboardData.performanceMetrics.onTimeCompletion >= 90 ? '#faad14' : '#ff4d4f'
                    }}
                    precision={1}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="Average Utilization"
                    value={dashboardData.performanceMetrics.averageUtilization}
                    suffix="%"
                    valueStyle={{ color: '#1890ff' }}
                    precision={1}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="Throughput Efficiency"
                    value={dashboardData.performanceMetrics.throughput}
                    suffix="%"
                    valueStyle={{ color: '#722ed1' }}
                    precision={1}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="Quality Score"
                    value={dashboardData.performanceMetrics.qualityScore}
                    suffix="%"
                    valueStyle={{
                      color: dashboardData.performanceMetrics.qualityScore >= 98 ? '#52c41a' :
                             dashboardData.performanceMetrics.qualityScore >= 95 ? '#faad14' : '#ff4d4f'
                    }}
                    precision={1}
                  />
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      )}

      <Row gutter={16}>
        {/* Left Column */}
        <Col xs={24} lg={16}>
          {/* Location Utilization */}
          <Card
            title="Staging Location Utilization"
            style={{ marginBottom: 16 }}
            size="small"
          >
            <Row gutter={[16, 16]}>
              {dashboardData && Object.values(dashboardData.locationUtilization).map((location) => (
                <Col xs={24} sm={12} md={8} key={location.locationCode}>
                  <Card size="small" bordered={false} style={{ background: '#fafafa' }}>
                    <div style={{ textAlign: 'center' }}>
                      <Text strong>{location.locationCode}</Text>
                      <br />
                      <Progress
                        type="circle"
                        percent={location.utilizationRate}
                        size={60}
                        strokeColor={
                          location.utilizationRate >= 90 ? '#ff4d4f' :
                          location.utilizationRate >= 80 ? '#faad14' : '#52c41a'
                        }
                      />
                      <br />
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {location.currentOccupancy}/{location.maxCapacity} capacity
                      </Text>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>

          {/* Pending Assignments */}
          <Card title="Pending Stage Assignments" size="small">
            <Table
              columns={pendingColumns}
              dataSource={dashboardData?.pendingAssignments.map((item, index) => ({
                ...item,
                key: index
              })) || []}
              pagination={false}
              size="small"
              locale={{ emptyText: 'No pending assignments' }}
            />
          </Card>
        </Col>

        {/* Right Column */}
        <Col xs={24} lg={8}>
          {/* Alerts */}
          <Card
            title={
              <Space>
                <WarningOutlined />
                Active Alerts
                <Badge count={dashboardData?.alerts.length || 0} />
              </Space>
            }
            style={{ marginBottom: 16 }}
            size="small"
          >
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {dashboardData?.alerts.map((alert, index) => (
                <Alert
                  key={index}
                  message={alert.message}
                  type={alert.severity === 'CRITICAL' || alert.severity === 'HIGH' ? 'error' : 'warning'}
                  icon={getAlertIcon(alert.type)}
                  style={{ marginBottom: 8, fontSize: '12px' }}
                  showIcon
                />
              ))}
              {(!dashboardData?.alerts || dashboardData.alerts.length === 0) && (
                <Text type="secondary">No active alerts</Text>
              )}
            </div>
          </Card>

          {/* Recent Activity */}
          <Card
            title={
              <Space>
                <CalendarOutlined />
                Recent Activity
              </Space>
            }
            size="small"
          >
            <Timeline
              mode="left"
              items={dashboardData?.recentActivity.map((activity) => ({
                color: getActivityColor(activity.type),
                children: (
                  <div>
                    <Text strong style={{ fontSize: '12px' }}>
                      {activity.kitNumber}
                    </Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      {activity.locationCode} • {dayjs(activity.timestamp).fromNow()}
                    </Text>
                    <br />
                    <Text style={{ fontSize: '11px' }}>
                      {activity.description}
                    </Text>
                  </div>
                )
              })) || []}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default StagingDashboard;