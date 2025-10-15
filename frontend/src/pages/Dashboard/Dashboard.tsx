import React, { useEffect, useState } from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Typography,
  Space,
  Progress,
  Table,
  Tag,
  Avatar,
  List,
  Spin,
  message
} from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  FileTextOutlined,
  ExperimentOutlined,
  ToolOutlined,
  AlertOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { dashboardApi, DashboardKPIs, RecentWorkOrder, DashboardAlert, EfficiencyMetrics, QualityTrends } from '../../services/dashboardApi';

const { Title } = Typography;

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState<DashboardKPIs | null>(null);
  const [recentWorkOrders, setRecentWorkOrders] = useState<RecentWorkOrder[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<DashboardAlert[]>([]);
  const [efficiencyMetrics, setEfficiencyMetrics] = useState<EfficiencyMetrics | null>(null);
  const [qualityTrends, setQualityTrends] = useState<QualityTrends | null>(null);

  // Fetch all dashboard data
  useEffect(() => {
    document.title = 'Dashboard - Manufacturing Execution System';

    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch all data in parallel
        const [kpis, workOrders, alerts, efficiency, quality] = await Promise.all([
          dashboardApi.getKPIs(),
          dashboardApi.getRecentWorkOrders(5),
          dashboardApi.getAlerts(5),
          dashboardApi.getEfficiencyMetrics(),
          dashboardApi.getQualityTrends()
        ]);

        setKpiData(kpis);
        setRecentWorkOrders(workOrders);
        setRecentAlerts(alerts);
        setEfficiencyMetrics(efficiency);
        setQualityTrends(quality);
      } catch (error: any) {
        console.error('Error fetching dashboard data:', error);
        message.error('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return 'processing';
      case 'COMPLETED':
        return 'success';
      case 'RELEASED':
        return 'default';
      default:
        return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'red';
      case 'NORMAL':
        return 'blue';
      case 'LOW':
        return 'green';
      default:
        return 'default';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <WarningOutlined style={{ color: '#faad14' }} />;
      case 'error':
        return <AlertOutlined style={{ color: '#ff4d4f' }} />;
      case 'info':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      default:
        return <ClockCircleOutlined />;
    }
  };

  const workOrderColumns = [
    {
      title: 'Work Order',
      dataIndex: 'workOrderNumber',
      key: 'workOrderNumber',
    },
    {
      title: 'Part Number',
      dataIndex: 'partNumber',
      key: 'partNumber',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status.replace('_', ' ')}
        </Tag>
      ),
    },
    {
      title: 'Progress',
      dataIndex: 'progress',
      key: 'progress',
      render: (progress: number) => (
        <Progress percent={progress} size="small" />
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string) => (
        <Tag color={getPriorityColor(priority)}>
          {priority}
        </Tag>
      ),
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" tip="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div style={{ padding: 0 }}>
      <Title level={2} style={{ marginBottom: 24 }}>
        Manufacturing Dashboard
      </Title>

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Work Orders"
              value={kpiData?.activeWorkOrders || 0}
              prefix={<FileTextOutlined />}
              suffix={
                <Space>
                  {(kpiData?.workOrdersChange || 0) > 0 ? (
                    <ArrowUpOutlined style={{ color: '#3f8600' }} />
                  ) : (
                    <ArrowDownOutlined style={{ color: '#cf1322' }} />
                  )}
                  <span style={{ fontSize: 12 }}>
                    {Math.abs(kpiData?.workOrdersChange || 0)}%
                  </span>
                </Space>
              }
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Completed Today"
              value={kpiData?.completedToday || 0}
              prefix={<CheckCircleOutlined />}
              suffix={
                <Space>
                  {(kpiData?.completedChange || 0) > 0 ? (
                    <ArrowUpOutlined style={{ color: '#3f8600' }} />
                  ) : (
                    <ArrowDownOutlined style={{ color: '#cf1322' }} />
                  )}
                  <span style={{ fontSize: 12 }}>
                    {Math.abs(kpiData?.completedChange || 0)}%
                  </span>
                </Space>
              }
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Quality Yield"
              value={kpiData?.qualityYield || 0}
              precision={1}
              suffix="%"
              prefix={<ExperimentOutlined />}
              valueStyle={{
                color: (kpiData?.qualityYield || 0) >= 95 ? '#52c41a' :
                       (kpiData?.qualityYield || 0) >= 90 ? '#faad14' : '#ff4d4f'
              }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Equipment Utilization"
              value={kpiData?.equipmentUtilization || 0}
              precision={1}
              prefix={<ToolOutlined />}
              suffix={
                <Space>
                  <span>%</span>
                  {(kpiData?.utilizationChange || 0) > 0 ? (
                    <ArrowUpOutlined style={{ color: '#3f8600' }} />
                  ) : (
                    <ArrowDownOutlined style={{ color: '#cf1322' }} />
                  )}
                  <span style={{ fontSize: 12 }}>
                    {Math.abs(kpiData?.utilizationChange || 0)}%
                  </span>
                </Space>
              }
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts and Tables Row */}
      <Row gutter={[16, 16]}>
        {/* Recent Work Orders */}
        <Col xs={24} lg={16}>
          <Card 
            title="Recent Work Orders" 
            extra={
              <a href="/workorders">View All</a>
            }
          >
            <Table
              dataSource={recentWorkOrders.map(wo => ({
                key: wo.id,
                ...wo
              }))}
              columns={workOrderColumns}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>

        {/* Recent Alerts */}
        <Col xs={24} lg={8}>
          <Card 
            title="Recent Alerts" 
            extra={
              <a href="/alerts">View All</a>
            }
          >
            <List
              dataSource={recentAlerts}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar icon={getAlertIcon(item.type)} />}
                    title={item.title}
                    description={
                      <Space direction="vertical" size={4}>
                        <div>{item.description}</div>
                        <small style={{ color: '#999' }}>{item.time}</small>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* Quality Metrics Row */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Production Efficiency">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Overall Equipment Effectiveness (OEE)</span>
                  <span>{efficiencyMetrics?.oee || 0}%</span>
                </div>
                <Progress percent={efficiencyMetrics?.oee || 0} strokeColor="#52c41a" />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>First Pass Yield (FPY)</span>
                  <span>{efficiencyMetrics?.fpy || 0}%</span>
                </div>
                <Progress percent={efficiencyMetrics?.fpy || 0} strokeColor="#1890ff" />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>On-Time Delivery</span>
                  <span>{efficiencyMetrics?.onTimeDelivery || 0}%</span>
                </div>
                <Progress percent={efficiencyMetrics?.onTimeDelivery || 0} strokeColor="#722ed1" />
              </div>
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Quality Trends">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Defect Rate</span>
                  <span style={{ color: (qualityTrends?.defectRateTrend || 0) <= 0 ? '#52c41a' : '#ff4d4f' }}>
                    {qualityTrends?.defectRate || 0}% {(qualityTrends?.defectRateTrend || 0) > 0 ? '↑' : '↓'}
                  </span>
                </div>
                <Progress percent={qualityTrends?.defectRate || 0} strokeColor="#ff4d4f" showInfo={false} />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Customer Complaints</span>
                  <span style={{ color: (qualityTrends?.complaintRateTrend || 0) <= 0 ? '#52c41a' : '#ff4d4f' }}>
                    {qualityTrends?.complaintRate || 0}% {(qualityTrends?.complaintRateTrend || 0) > 0 ? '↑' : '↓'}
                  </span>
                </div>
                <Progress percent={qualityTrends?.complaintRate || 0} strokeColor="#faad14" showInfo={false} />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>NCR Rate</span>
                  <span style={{ color: (qualityTrends?.ncrRateTrend || 0) <= 0 ? '#52c41a' : '#ff4d4f' }}>
                    {qualityTrends?.ncrRate || 0}% {(qualityTrends?.ncrRateTrend || 0) > 0 ? '↑' : '↓'}
                  </span>
                </div>
                <Progress percent={qualityTrends?.ncrRate || 0} strokeColor="#ff4d4f" showInfo={false} />
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;