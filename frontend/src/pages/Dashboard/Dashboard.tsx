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
  App,
  DatePicker,
  Button,
  Dropdown,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  FileTextOutlined,
  ExperimentOutlined,
  ToolOutlined,
  AlertOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  BarcodeOutlined,
  ApartmentOutlined,
  FileSearchOutlined,
  DownloadOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { dashboardApi, DashboardKPIs, RecentWorkOrder, DashboardAlert, EfficiencyMetrics, QualityTrends } from '../../services/dashboardApi';
import { exportDashboardMetricsToExcel, exportDashboardMetricsToPDF } from '@/utils/exportUtils';
import dayjs, { Dayjs } from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type StatusFilter = 'active' | 'completed' | 'quality' | null;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState<DashboardKPIs | null>(null);
  const [recentWorkOrders, setRecentWorkOrders] = useState<RecentWorkOrder[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<DashboardAlert[]>([]);
  const [efficiencyMetrics, setEfficiencyMetrics] = useState<EfficiencyMetrics | null>(null);
  const [qualityTrends, setQualityTrends] = useState<QualityTrends | null>(null);

  // Date range filter (default: last 30 days)
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(30, 'days'),
    dayjs(),
  ]);

  // Status filter for clickable KPIs
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(null);

  // Fetch all dashboard data
  useEffect(() => {
    document.title = 'Dashboard - Manufacturing Execution System';

    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Format dates for API
        const startDate = dateRange[0].format('YYYY-MM-DD');
        const endDate = dateRange[1].format('YYYY-MM-DD');

        // Fetch all data in parallel
        const [kpis, workOrders, alerts, efficiency, quality] = await Promise.all([
          dashboardApi.getKPIs(startDate, endDate),
          dashboardApi.getRecentWorkOrders(50, startDate, endDate), // Fetch more for filtering
          dashboardApi.getAlerts(5),
          dashboardApi.getEfficiencyMetrics(startDate, endDate),
          dashboardApi.getQualityTrends(startDate, endDate)
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
  }, [dateRange]);

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

  /**
   * Filter work orders based on active filter
   */
  const getFilteredWorkOrders = (): RecentWorkOrder[] => {
    // Safety check: ensure recentWorkOrders is an array
    const workOrders = recentWorkOrders || [];

    if (!statusFilter) return workOrders;

    switch (statusFilter) {
      case 'active':
        return workOrders.filter(
          (wo) => wo.status === 'IN_PROGRESS' || wo.status === 'RELEASED'
        );
      case 'completed':
        return workOrders.filter((wo) => wo.status === 'COMPLETED');
      case 'quality':
        // Filter work orders with quality issues (progress < 100 but status is completed, or specific quality flags)
        return workOrders.filter(
          (wo) => wo.progress < 90 || wo.status === 'ON_HOLD'
        );
      default:
        return workOrders;
    }
  };

  /**
   * Handle KPI card click
   */
  const handleKPIClick = (filter: StatusFilter) => {
    setStatusFilter(statusFilter === filter ? null : filter);
  };

  /**
   * Handle date range change
   */
  const handleDateRangeChange = (dates: null | (Dayjs | null)[]) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange([dates[0], dates[1]]);
    }
  };

  /**
   * Handle export to Excel
   */
  const handleExportExcel = () => {
    try {
      exportDashboardMetricsToExcel({
        workOrders: recentWorkOrders,
        kpis: {
          totalWorkOrders: kpiData?.activeWorkOrders || 0,
          completionRate: ((kpiData?.completedToday || 0) / (kpiData?.activeWorkOrders || 1)) * 100,
          avgCycleTime: 5.2, // TODO: Calculate from data
          onTimeDelivery: efficiencyMetrics?.onTimeDelivery || 0,
        },
        dateRange: {
          start: dateRange[0].format('YYYY-MM-DD'),
          end: dateRange[1].format('YYYY-MM-DD'),
        },
      });
      message.success('Dashboard exported to Excel successfully');
    } catch (error) {
      message.error('Failed to export to Excel');
    }
  };

  /**
   * Handle export to PDF
   */
  const handleExportPDF = () => {
    try {
      exportDashboardMetricsToPDF({
        workOrders: recentWorkOrders,
        kpis: {
          totalWorkOrders: kpiData?.activeWorkOrders || 0,
          completionRate: ((kpiData?.completedToday || 0) / (kpiData?.activeWorkOrders || 1)) * 100,
          avgCycleTime: 5.2, // TODO: Calculate from data
          onTimeDelivery: efficiencyMetrics?.onTimeDelivery || 0,
        },
        dateRange: {
          start: dateRange[0].format('YYYY-MM-DD'),
          end: dateRange[1].format('YYYY-MM-DD'),
        },
      });
      message.success('Dashboard exported to PDF successfully');
    } catch (error) {
      message.error('Failed to export to PDF');
    }
  };

  /**
   * Export menu items
   */
  const exportMenuItems: MenuProps['items'] = [
    {
      key: 'excel',
      label: 'Export to Excel',
      icon: <DownloadOutlined />,
      onClick: handleExportExcel,
    },
    {
      key: 'pdf',
      label: 'Export to PDF',
      icon: <DownloadOutlined />,
      onClick: handleExportPDF,
    },
  ];

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
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: 0 }}>
      {/* Header with Title, Date Picker, and Export */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <Title level={1} style={{ margin: 0 }}>
          Manufacturing Dashboard
        </Title>

        <Space size="middle" wrap>
          {/* Date Range Picker */}
          <RangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
            format="YYYY-MM-DD"
            allowClear={false}
            style={{ width: 280 }}
          />

          {/* Export Dropdown */}
          <Dropdown menu={{ items: exportMenuItems }} placement="bottomRight">
            <Button type="primary" icon={<DownloadOutlined />}>
              Export
            </Button>
          </Dropdown>
        </Space>
      </div>

      {/* Active Filter Indicator */}
      {statusFilter && (
        <div style={{ marginBottom: 16 }}>
          <Tag
            color="blue"
            closable
            onClose={() => setStatusFilter(null)}
            icon={<CloseOutlined />}
            style={{ fontSize: 14, padding: '4px 12px' }}
          >
            Filtering:{' '}
            {statusFilter === 'active'
              ? 'Active Work Orders'
              : statusFilter === 'completed'
              ? 'Completed Today'
              : 'Quality Issues'}
          </Tag>
        </div>
      )}

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card
            hoverable
            onClick={() => handleKPIClick('active')}
            style={{
              cursor: 'pointer',
              border: statusFilter === 'active' ? '2px solid #1890ff' : undefined,
              boxShadow: statusFilter === 'active' ? '0 0 10px rgba(24, 144, 255, 0.3)' : undefined,
            }}
          >
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
          <Card
            hoverable
            onClick={() => handleKPIClick('completed')}
            style={{
              cursor: 'pointer',
              border: statusFilter === 'completed' ? '2px solid #52c41a' : undefined,
              boxShadow: statusFilter === 'completed' ? '0 0 10px rgba(82, 196, 26, 0.3)' : undefined,
            }}
          >
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
          <Card
            hoverable
            onClick={() => handleKPIClick('quality')}
            style={{
              cursor: 'pointer',
              border: statusFilter === 'quality' ? '2px solid #faad14' : undefined,
              boxShadow: statusFilter === 'quality' ? '0 0 10px rgba(250, 173, 20, 0.3)' : undefined,
            }}
          >
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

      {/* Quick Actions - Sprint 4 Features */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card
            hoverable
            onClick={() => navigate('/serialization')}
            style={{ cursor: 'pointer', textAlign: 'center', height: '100%' }}
          >
            <Space direction="vertical" size="middle">
              <BarcodeOutlined style={{ fontSize: 48, color: '#1890ff' }} />
              <div>
                <Title level={3} style={{ marginBottom: 4 }}>Serial Numbers</Title>
                <Text type="secondary">Generate and manage serial numbers</Text>
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card
            hoverable
            onClick={() => navigate('/traceability')}
            style={{ cursor: 'pointer', textAlign: 'center', height: '100%' }}
          >
            <Space direction="vertical" size="middle">
              <ApartmentOutlined style={{ fontSize: 48, color: '#52c41a' }} />
              <div>
                <Title level={3} style={{ marginBottom: 4 }}>Traceability</Title>
                <Text type="secondary">Track genealogy and material flow</Text>
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card
            hoverable
            onClick={() => navigate('/fai')}
            style={{ cursor: 'pointer', textAlign: 'center', height: '100%' }}
          >
            <Space direction="vertical" size="middle">
              <FileSearchOutlined style={{ fontSize: 48, color: '#722ed1' }} />
              <div>
                <Title level={3} style={{ marginBottom: 4 }}>FAI Reports</Title>
                <Text type="secondary">First Article Inspection reports</Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Charts and Tables Row */}
      <Row gutter={[16, 16]}>
        {/* Recent Work Orders */}
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space>
                <span>Recent Work Orders</span>
                {statusFilter && (
                  <Tag color="blue">
                    {getFilteredWorkOrders().length} filtered
                  </Tag>
                )}
              </Space>
            }
            extra={
              <a href="/workorders">View All</a>
            }
          >
            <Table
              dataSource={getFilteredWorkOrders().map(wo => ({
                key: wo.id,
                ...wo
              }))}
              columns={workOrderColumns}
              pagination={{ pageSize: 10, showSizeChanger: false }}
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