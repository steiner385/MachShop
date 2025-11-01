/**
 * CAPA Dashboard Component (Issue #56)
 * Real-time metrics and KPI visualization for CAPA management
 */

import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Progress,
  Table,
  Empty,
  Spin,
  message,
  Select,
  DatePicker,
  Space,
  Button,
  Tabs,
  Chart,
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  AlertOutlined,
  DollarOutlined,
  PercentageOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CapaDashboardProps {
  siteId: string;
}

interface CapaMetrics {
  effectivenessRate: number;
  averageCycleTime: number;
  overdueActionCount: number;
  capasByStatus: Record<string, number>;
  capasByRiskLevel: Record<string, number>;
  totalCost: number;
  costByType: Record<string, number>;
  costByRiskLevel: Record<string, number>;
}

const CapaDashboard: React.FC<CapaDashboardProps> = ({ siteId }) => {
  const [metrics, setMetrics] = useState<CapaMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);

  // Fetch metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ siteId });
        if (dateRange) {
          params.append('startDate', dateRange[0].toISOString());
          params.append('endDate', dateRange[1].toISOString());
        }

        const response = await fetch(`/api/capa/metrics/dashboard?${params}`);
        const data = await response.json();

        if (data.success) {
          setMetrics(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
        message.error('Failed to load metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [siteId, dateRange]);

  if (loading || !metrics) {
    return <Spin />;
  }

  // Prepare chart data
  const statusChartData = Object.entries(metrics.capasByStatus).map(([status, count]) => ({
    name: status,
    value: count,
  }));

  const costByRiskData = Object.entries(metrics.costByRiskLevel).map(([risk, cost]) => ({
    name: risk,
    cost: cost,
  }));

  const costByTypeData = Object.entries(metrics.costByType).map(([type, cost]) => ({
    name: type,
    cost: cost,
  }));

  const riskColors: Record<string, string> = {
    LOW: '#52c41a',
    MEDIUM: '#faad14',
    HIGH: '#f5222d',
    CRITICAL: '#d32f2f',
  };

  const statusColors = [
    '#52c41a',
    '#13c2c2',
    '#1890ff',
    '#faad14',
    '#f5222d',
    '#d32f2f',
    '#722ed1',
    '#eb2f96',
  ];

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <span>Date Range:</span>
          <DatePicker.RangePicker
            value={dateRange}
            onChange={(range) => setDateRange(range as [any, any])}
          />
          <Button
            onClick={() => setDateRange(null)}
          >
            Clear
          </Button>
        </Space>
      </Card>

      {/* KPI Cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Effectiveness Rate"
              value={metrics.effectivenessRate}
              suffix="%"
              prefix={<PercentageOutlined />}
              valueStyle={{ color: metrics.effectivenessRate >= 90 ? '#52c41a' : '#f5222d' }}
            />
            <Progress
              percent={metrics.effectivenessRate}
              status={metrics.effectivenessRate >= 90 ? 'success' : 'exception'}
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Average Cycle Time"
              value={metrics.averageCycleTime}
              suffix=" days"
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Overdue Actions"
              value={metrics.overdueActionCount}
              prefix={<AlertOutlined />}
              valueStyle={{ color: metrics.overdueActionCount > 0 ? '#f5222d' : '#52c41a' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Cost"
              value={Math.round(metrics.totalCost)}
              prefix={<DollarOutlined />}
              precision={0}
            />
          </Card>
        </Col>
      </Row>

      {/* Status Distribution */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="CAPA Status Distribution">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={statusColors[index % statusColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Risk Level Distribution">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={Object.entries(metrics.capasByRiskLevel).map(([risk, count]) => ({
                name: risk,
                count,
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" radius={[8, 8, 0, 0]}>
                  {Object.keys(metrics.capasByRiskLevel).map((risk) => (
                    <Cell key={risk} fill={riskColors[risk] || '#8884d8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Cost Analysis */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Cost by Risk Level">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={costByRiskData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="cost" fill="#82ca9d" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Cost by Action Type">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={costByTypeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="cost" fill="#ffc658" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Summary Statistics */}
      <Card title="Summary">
        <Table
          dataSource={[
            {
              key: 'draft',
              status: 'Draft',
              count: metrics.capasByStatus.DRAFT || 0,
            },
            {
              key: 'planned',
              status: 'Planned',
              count: metrics.capasByStatus.PLANNED || 0,
            },
            {
              key: 'in_progress',
              status: 'In Progress',
              count: metrics.capasByStatus.IN_PROGRESS || 0,
            },
            {
              key: 'pending_verification',
              status: 'Pending Verification',
              count: metrics.capasByStatus.PENDING_VERIFICATION || 0,
            },
            {
              key: 'verified_effective',
              status: 'Verified Effective',
              count: metrics.capasByStatus.VERIFIED_EFFECTIVE || 0,
            },
            {
              key: 'verified_ineffective',
              status: 'Verified Ineffective',
              count: metrics.capasByStatus.VERIFIED_INEFFECTIVE || 0,
            },
            {
              key: 'closed',
              status: 'Closed',
              count: metrics.capasByStatus.CLOSED || 0,
            },
            {
              key: 'cancelled',
              status: 'Cancelled',
              count: metrics.capasByStatus.CANCELLED || 0,
            },
          ]}
          columns={[
            { title: 'Status', dataIndex: 'status', key: 'status' },
            { title: 'Count', dataIndex: 'count', key: 'count' },
          ]}
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
};

export default CapaDashboard;
