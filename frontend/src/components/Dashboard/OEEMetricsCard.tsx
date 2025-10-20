/**
 * OEE Metrics Dashboard Card Component
 * Phase 3: OEE/KPI Dashboard Implementation
 */

import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Table,
  Tag,
  Spin,
  Alert,
  Button,
  Select,
} from 'antd';
import {
  DashboardOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { getOEEDashboard } from '@/api/equipment';
import {
  OEEDashboardData,
  EQUIPMENT_CLASS_LABELS,
  EQUIPMENT_CLASS_COLORS,
  EQUIPMENT_STATUS_COLORS,
} from '@/types/equipment';
import type { ColumnsType } from 'antd/es/table';

const { Option } = Select;

export const OEEMetricsCard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<OEEDashboardData | null>(null);
  const [equipmentClassFilter, setEquipmentClassFilter] = useState<string | undefined>();

  const fetchOEEData = async () => {
    setLoading(true);
    setError(null);

    const response = await getOEEDashboard({
      ...(equipmentClassFilter && { equipmentClass: equipmentClassFilter }),
      limit: 5,
    });

    if (response.success && response.data) {
      setDashboardData(response.data);
    } else {
      setError(response.error || 'Failed to load OEE dashboard data');
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchOEEData();
  }, [equipmentClassFilter]);

  const getOEEColor = (oee: number | null): string => {
    if (!oee) return 'default';
    if (oee >= 85) return 'success';
    if (oee >= 70) return 'warning';
    return 'error';
  };

  const getOEEStatus = (oee: number | null): 'success' | 'exception' | 'normal' => {
    if (!oee) return 'normal';
    if (oee >= 85) return 'success';
    if (oee >= 70) return 'normal';
    return 'exception';
  };

  // Top/Bottom Performers Table Columns
  const performerColumns: ColumnsType<any> = [
    {
      title: 'Equipment',
      dataIndex: 'equipmentNumber',
      key: 'equipmentNumber',
      width: 120,
      render: (text, record) => (
        <div>
          <div><strong>{text}</strong></div>
          <div style={{ fontSize: '12px', color: '#666' }}>{record.name}</div>
        </div>
      ),
    },
    {
      title: 'Class',
      dataIndex: 'equipmentClass',
      key: 'equipmentClass',
      width: 120,
      render: (equipmentClass) => (
        <Tag color={EQUIPMENT_CLASS_COLORS[equipmentClass]}>
          {EQUIPMENT_CLASS_LABELS[equipmentClass]}
        </Tag>
      ),
    },
    {
      title: 'OEE',
      dataIndex: 'oee',
      key: 'oee',
      width: 100,
      align: 'center',
      render: (oee) => (
        <Tag color={getOEEColor(oee)}>
          {oee ? `${Math.round(oee)}%` : 'N/A'}
        </Tag>
      ),
    },
    {
      title: 'A',
      dataIndex: 'availability',
      key: 'availability',
      width: 70,
      align: 'center',
      render: (availability) => availability ? `${Math.round(availability)}%` : 'N/A',
    },
    {
      title: 'P',
      dataIndex: 'performance',
      key: 'performance',
      width: 70,
      align: 'center',
      render: (performance) => performance ? `${Math.round(performance)}%` : 'N/A',
    },
    {
      title: 'Q',
      dataIndex: 'quality',
      key: 'quality',
      width: 70,
      align: 'center',
      render: (quality) => quality ? `${Math.round(quality)}%` : 'N/A',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={EQUIPMENT_STATUS_COLORS[status]}>{status}</Tag>
      ),
    },
  ];

  if (loading && !dashboardData) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" tip="Loading OEE metrics..." />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Alert
          message="Error Loading OEE Data"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={fetchOEEData}>
              Retry
            </Button>
          }
        />
      </Card>
    );
  }

  if (!dashboardData) {
    return null;
  }

  const { summary, distribution, topPerformers, bottomPerformers } = dashboardData;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2>
          <DashboardOutlined style={{ marginRight: 8 }} />
          Overall Equipment Effectiveness (OEE)
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Select
            placeholder="Filter by class"
            allowClear
            value={equipmentClassFilter}
            onChange={setEquipmentClassFilter}
            style={{ width: '200px' }}
          >
            {Object.entries(EQUIPMENT_CLASS_LABELS).map(([key, label]) => (
              <Option key={key} value={key}>
                {label}
              </Option>
            ))}
          </Select>
          <Button icon={<ReloadOutlined />} onClick={fetchOEEData} loading={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Statistics */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Average OEE"
              value={summary.averageOEE}
              suffix="%"
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: summary.averageOEE >= 85 ? '#52c41a' : summary.averageOEE >= 70 ? '#faad14' : '#ff4d4f' }}
            />
            <Progress
              percent={summary.averageOEE}
              status={getOEEStatus(summary.averageOEE)}
              showInfo={false}
              style={{ marginTop: '8px' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Availability"
              value={summary.averageAvailability}
              suffix="%"
              valueStyle={{ color: '#1890ff' }}
            />
            <Progress
              percent={summary.averageAvailability}
              showInfo={false}
              strokeColor="#1890ff"
              style={{ marginTop: '8px' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Performance"
              value={summary.averagePerformance}
              suffix="%"
              valueStyle={{ color: '#722ed1' }}
            />
            <Progress
              percent={summary.averagePerformance}
              showInfo={false}
              strokeColor="#722ed1"
              style={{ marginTop: '8px' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Quality"
              value={summary.averageQuality}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <Progress
              percent={summary.averageQuality}
              showInfo={false}
              strokeColor="#52c41a"
              style={{ marginTop: '8px' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Equipment Distribution */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={12}>
          <Card title="OEE Distribution" size="small">
            <Row gutter={8}>
              <Col span={12}>
                <Statistic
                  title="Excellent (≥85%)"
                  value={distribution.excellent}
                  valueStyle={{ color: '#52c41a', fontSize: '20px' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Good (70-85%)"
                  value={distribution.good}
                  valueStyle={{ color: '#faad14', fontSize: '20px' }}
                />
              </Col>
            </Row>
            <Row gutter={8} style={{ marginTop: '16px' }}>
              <Col span={12}>
                <Statistic
                  title="Fair (50-70%)"
                  value={distribution.fair}
                  valueStyle={{ color: '#ff7a45', fontSize: '20px' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Poor (<50%)"
                  value={distribution.poor}
                  prefix={<WarningOutlined />}
                  valueStyle={{ color: '#ff4d4f', fontSize: '20px' }}
                />
              </Col>
            </Row>
            {distribution.noData > 0 && (
              <Alert
                message={`${distribution.noData} equipment with no OEE data`}
                type="info"
                showIcon
                style={{ marginTop: '16px' }}
              />
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Equipment Summary" size="small">
            <Row gutter={8}>
              <Col span={12}>
                <Statistic
                  title="Total Equipment"
                  value={summary.totalEquipment}
                  valueStyle={{ fontSize: '24px' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="With OEE Data"
                  value={summary.equipmentWithOEE}
                  valueStyle={{ fontSize: '24px' }}
                />
              </Col>
            </Row>
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                Data Coverage
              </div>
              <Progress
                percent={summary.totalEquipment > 0 ? (summary.equipmentWithOEE / summary.totalEquipment) * 100 : 0}
                strokeColor="#1890ff"
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Top and Bottom Performers */}
      <Row gutter={16}>
        <Col span={12}>
          <Card title="Top Performers" size="small">
            <Table
              columns={performerColumns}
              dataSource={topPerformers}
              rowKey="id"
              pagination={false}
              size="small"
              scroll={{ x: 600 }}
              locale={{ emptyText: 'No data available' }}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Bottom Performers" size="small">
            <Table
              columns={performerColumns}
              dataSource={bottomPerformers}
              rowKey="id"
              pagination={false}
              size="small"
              scroll={{ x: 600 }}
              locale={{ emptyText: 'No data available' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default OEEMetricsCard;
