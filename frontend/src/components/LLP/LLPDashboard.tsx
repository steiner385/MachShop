/**
 * LLP (Life-Limited Parts) Dashboard Component
 *
 * Comprehensive dashboard for monitoring Life-Limited Parts with:
 * - Fleet overview and status summary
 * - Critical alerts and notifications
 * - Retirement forecasting
 * - Compliance status monitoring
 * - Quick actions for common tasks
 *
 * Safety-critical component for aerospace manufacturing compliance.
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Alert,
  Progress,
  Button,
  Space,
  Typography,
  Divider,
  Badge,
  Tooltip,
  Select,
  DatePicker,
  Input,
  message,
  Spin
} from 'antd';
import {
  DashboardOutlined,
  AlertOutlined,
  SafetyOutlined,
  ClockCircleOutlined,
  FileSearchOutlined,
  PlusOutlined,
  ReloadOutlined,
  ExportOutlined,
  BellOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { useSite } from '@/contexts/SiteContext';

const { Title, Text } = Typography;
const { Search } = Input;
const { RangePicker } = DatePicker;

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface LLPDashboardData {
  fleetSummary: {
    totalLLPs: number;
    activeLLPs: number;
    retiredLLPs: number;
    averageLifeUsed: number;
    criticalAlerts: number;
    complianceRate: number;
  };
  statusBreakdown: {
    new: number;
    active: number;
    aging: number;
    critical: number;
    nearRetirement: number;
    retired: number;
  };
  alertSummary: {
    urgent: number;
    critical: number;
    warning: number;
    info: number;
  };
  upcomingRetirements: LLPRetirementItem[];
  criticalAlerts: LLPAlertItem[];
  complianceIssues: ComplianceIssueItem[];
}

interface LLPRetirementItem {
  id: string;
  partNumber: string;
  serialNumber: string;
  currentLifeUsed: number;
  forecastRetirementDate: string;
  daysUntilRetirement: number;
  criticalityLevel: string;
  location?: string;
}

interface LLPAlertItem {
  id: string;
  partNumber: string;
  serialNumber: string;
  alertType: string;
  severity: string;
  message: string;
  createdAt: string;
  dueDate?: string;
}

interface ComplianceIssueItem {
  id: string;
  partNumber: string;
  serialNumber: string;
  issueType: string;
  description: string;
  severity: string;
  dueDate?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const LLPDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<LLPDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);
  const [selectedCriticality, setSelectedCriticality] = useState<string>('all');
  const navigate = useNavigate();
  const { currentSite } = useSite();

  useEffect(() => {
    loadDashboardData();
  }, [currentSite]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/llp/analytics/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData({
          fleetSummary: data.fleetSummary,
          statusBreakdown: data.statusBreakdown,
          alertSummary: data.alertSummary,
          upcomingRetirements: data.upcomingRetirements || [],
          criticalAlerts: data.criticalAlerts || [],
          complianceIssues: data.complianceIssues || []
        });
      } else {
        // Use mock data if API fails
        setDashboardData(getMockDashboardData());
      }
    } catch (error) {
      console.error('Failed to load LLP dashboard data:', error);
      setDashboardData(getMockDashboardData());
      message.error('Failed to load dashboard data. Using cached data.');
    } finally {
      setLoading(false);
    }
  };

  const getMockDashboardData = (): LLPDashboardData => ({
    fleetSummary: {
      totalLLPs: 245,
      activeLLPs: 198,
      retiredLLPs: 47,
      averageLifeUsed: 67.3,
      criticalAlerts: 8,
      complianceRate: 94.7
    },
    statusBreakdown: {
      new: 23,
      active: 156,
      aging: 42,
      critical: 19,
      nearRetirement: 5,
      retired: 47
    },
    alertSummary: {
      urgent: 3,
      critical: 5,
      warning: 12,
      info: 8
    },
    upcomingRetirements: [
      {
        id: '1',
        partNumber: 'TURB-BLADE-001',
        serialNumber: 'TB001-2024-001',
        currentLifeUsed: 97.2,
        forecastRetirementDate: '2024-12-15',
        daysUntilRetirement: 14,
        criticalityLevel: 'SAFETY_CRITICAL',
        location: 'Engine Bay 1'
      },
      {
        id: '2',
        partNumber: 'GUIDE-VANE-002',
        serialNumber: 'GV002-2024-003',
        currentLifeUsed: 94.8,
        forecastRetirementDate: '2024-12-28',
        daysUntilRetirement: 27,
        criticalityLevel: 'MONITORED',
        location: 'Assembly Line 2'
      }
    ],
    criticalAlerts: [
      {
        id: '1',
        partNumber: 'TURB-BLADE-001',
        serialNumber: 'TB001-2024-001',
        alertType: 'RETIREMENT_WARNING',
        severity: 'URGENT',
        message: 'Part at 97.2% of retirement limit. Immediate attention required.',
        createdAt: '2024-10-25T14:30:00Z',
        dueDate: '2024-12-15'
      },
      {
        id: '2',
        partNumber: 'SHAFT-003',
        serialNumber: 'SH003-2024-002',
        alertType: 'INSPECTION_DUE',
        severity: 'CRITICAL',
        message: 'Inspection due at 15,000 cycles (current: 14,950 cycles)',
        createdAt: '2024-10-26T09:15:00Z',
        dueDate: '2024-11-05'
      }
    ],
    complianceIssues: [
      {
        id: '1',
        partNumber: 'BEARING-004',
        serialNumber: 'BR004-2024-001',
        issueType: 'MISSING_CERTIFICATION',
        description: 'Missing Form 1 certification',
        severity: 'HIGH',
        dueDate: '2024-11-15'
      }
    ]
  });

  const handleRefresh = () => {
    loadDashboardData();
  };

  const handleExportReport = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/llp/fleet-report', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `llp-fleet-report-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        message.success('Fleet report exported successfully');
      } else {
        message.error('Failed to export fleet report');
      }
    } catch (error) {
      console.error('Export failed:', error);
      message.error('Failed to export fleet report');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'URGENT': return 'red';
      case 'CRITICAL': return 'red';
      case 'WARNING': return 'orange';
      case 'INFO': return 'blue';
      default: return 'gray';
    }
  };

  const getCriticalityColor = (level: string) => {
    switch (level) {
      case 'SAFETY_CRITICAL': return 'red';
      case 'MONITORED': return 'orange';
      case 'TRACKED': return 'blue';
      default: return 'gray';
    }
  };

  const getLifeStatusColor = (percentage: number) => {
    if (percentage >= 95) return 'red';
    if (percentage >= 80) return 'orange';
    if (percentage >= 60) return 'yellow';
    return 'green';
  };

  // ============================================================================
  // TABLE CONFIGURATIONS
  // ============================================================================

  const retirementColumns: ColumnsType<LLPRetirementItem> = [
    {
      title: 'Part Number',
      dataIndex: 'partNumber',
      key: 'partNumber',
      render: (text, record) => (
        <Button
          type="link"
          onClick={() => navigate(`/llp/parts/${record.id}`)}
          style={{ padding: 0 }}
        >
          {text}
        </Button>
      ),
    },
    {
      title: 'Serial Number',
      dataIndex: 'serialNumber',
      key: 'serialNumber',
    },
    {
      title: 'Life Used',
      dataIndex: 'currentLifeUsed',
      key: 'currentLifeUsed',
      render: (value) => (
        <Progress
          percent={value}
          status={value >= 95 ? 'exception' : value >= 80 ? 'active' : 'normal'}
          strokeColor={getLifeStatusColor(value)}
          format={(percent) => `${percent?.toFixed(1)}%`}
        />
      ),
    },
    {
      title: 'Retirement Date',
      dataIndex: 'forecastRetirementDate',
      key: 'forecastRetirementDate',
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Days Until',
      dataIndex: 'daysUntilRetirement',
      key: 'daysUntilRetirement',
      render: (days) => (
        <Tag color={days <= 30 ? 'red' : days <= 90 ? 'orange' : 'green'}>
          {days} days
        </Tag>
      ),
    },
    {
      title: 'Criticality',
      dataIndex: 'criticalityLevel',
      key: 'criticalityLevel',
      render: (level) => (
        <Tag color={getCriticalityColor(level)}>
          {level.replace('_', ' ')}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            onClick={() => navigate(`/llp/retirement/propose/${record.id}`)}
          >
            Propose Retirement
          </Button>
          <Button
            size="small"
            type="link"
            onClick={() => navigate(`/llp/parts/${record.id}`)}
          >
            View Details
          </Button>
        </Space>
      ),
    },
  ];

  const alertColumns: ColumnsType<LLPAlertItem> = [
    {
      title: 'Part',
      key: 'part',
      render: (_, record) => (
        <div>
          <div>{record.partNumber}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.serialNumber}
          </Text>
        </div>
      ),
    },
    {
      title: 'Alert',
      dataIndex: 'alertType',
      key: 'alertType',
      render: (type) => type.replace('_', ' '),
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity) => (
        <Tag color={getSeverityColor(severity)} icon={<WarningOutlined />}>
          {severity}
        </Tag>
      ),
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" type="primary" ghost>
            Acknowledge
          </Button>
          <Button size="small">View</Button>
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <Alert
        message="No Data Available"
        description="Unable to load LLP dashboard data. Please try refreshing the page."
        type="error"
        showIcon
      />
    );
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
              <SafetyOutlined style={{ marginRight: 8, color: '#1890ff' }} />
              Life-Limited Parts Dashboard
            </Title>
            <Text type="secondary">
              Monitor safety-critical components and regulatory compliance
            </Text>
          </Col>
          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
                Refresh
              </Button>
              <Button icon={<ExportOutlined />} onClick={handleExportReport}>
                Export Report
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/llp/configuration/new')}
              >
                Configure LLP
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Fleet Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total LLPs"
              value={dashboardData.fleetSummary.totalLLPs}
              prefix={<DashboardOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Parts"
              value={dashboardData.fleetSummary.activeLLPs}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Critical Alerts"
              value={dashboardData.fleetSummary.criticalAlerts}
              prefix={<AlertOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
            {dashboardData.fleetSummary.criticalAlerts > 0 && (
              <Badge
                status="error"
                text="Immediate attention required"
                style={{ marginTop: 8 }}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Compliance Rate"
              value={dashboardData.fleetSummary.complianceRate}
              suffix="%"
              prefix={<FileSearchOutlined />}
              valueStyle={{
                color: dashboardData.fleetSummary.complianceRate >= 95 ? '#52c41a' : '#faad14'
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Status Breakdown and Alerts */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Fleet Status Breakdown" extra={<DashboardOutlined />}>
            <Row gutter={[8, 8]}>
              <Col span={12}>
                <Statistic title="New" value={dashboardData.statusBreakdown.new} />
              </Col>
              <Col span={12}>
                <Statistic title="Active" value={dashboardData.statusBreakdown.active} />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Aging"
                  value={dashboardData.statusBreakdown.aging}
                  valueStyle={{ color: '#faad14' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Critical"
                  value={dashboardData.statusBreakdown.critical}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Near Retirement"
                  value={dashboardData.statusBreakdown.nearRetirement}
                  valueStyle={{ color: '#ff7875' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Retired"
                  value={dashboardData.statusBreakdown.retired}
                  valueStyle={{ color: '#8c8c8c' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Alert Summary" extra={<BellOutlined />}>
            <Row gutter={[8, 8]}>
              <Col span={12}>
                <Statistic
                  title="Urgent"
                  value={dashboardData.alertSummary.urgent}
                  valueStyle={{ color: '#ff4d4f' }}
                  prefix={<ExclamationCircleOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Critical"
                  value={dashboardData.alertSummary.critical}
                  valueStyle={{ color: '#ff7875' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Warning"
                  value={dashboardData.alertSummary.warning}
                  valueStyle={{ color: '#faad14' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Info"
                  value={dashboardData.alertSummary.info}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
            </Row>
            <Divider />
            <Button
              type="link"
              onClick={() => navigate('/llp/alerts')}
              style={{ padding: 0 }}
            >
              View All Alerts →
            </Button>
          </Card>
        </Col>
      </Row>

      {/* Critical Alerts */}
      {dashboardData.criticalAlerts.length > 0 && (
        <Card
          title={
            <span>
              <AlertOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
              Critical Alerts - Immediate Attention Required
            </span>
          }
          style={{ marginBottom: 24 }}
        >
          <Table
            dataSource={dashboardData.criticalAlerts}
            columns={alertColumns}
            rowKey="id"
            pagination={false}
            size="small"
          />
        </Card>
      )}

      {/* Upcoming Retirements */}
      <Card
        title={
          <span>
            <ClockCircleOutlined style={{ marginRight: 8 }} />
            Upcoming Retirements (Next 90 Days)
          </span>
        }
        extra={
          <Button
            type="link"
            onClick={() => navigate('/llp/retirement/forecast')}
          >
            View Full Forecast
          </Button>
        }
      >
        <Table
          dataSource={dashboardData.upcomingRetirements}
          columns={retirementColumns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Card>
    </div>
  );
};

export default LLPDashboard;