/**
 * Metrics Card Component
 * Displays individual quality metric with trend and status
 */

import React from 'react';
import { Card, Statistic, Row, Col, Progress, Space } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';

interface MetricsCardProps {
  title: string;
  value: number;
  unit: string;
  trend?: number | null;
  status?: 'success' | 'normal' | 'exception';
  icon?: ReactNode;
  target?: number;
  precision?: number;
}

const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  unit,
  trend,
  status = 'normal',
  icon,
  target,
  precision = 2,
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a', marginLeft: 8 }} />;
      case 'exception':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f', marginLeft: 8 }} />;
      default:
        return <WarningOutlined style={{ color: '#faad14', marginLeft: 8 }} />;
    }
  };

  const getTrendColor = () => {
    if (!trend) return 'textSecondary';
    return trend > 0 ? 'success' : 'danger';
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    return trend > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />;
  };

  const statusColors: { [key: string]: string } = {
    success: '#52c41a',
    normal: '#1890ff',
    exception: '#ff4d4f',
  };

  return (
    <Card
      style={{
        borderTop: `3px solid ${statusColors[status]}`,
        height: '100%',
      }}
      hoverable
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: 0, color: '#666' }}>{title}</h4>
          {getStatusIcon()}
        </div>

        <div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: statusColors[status] }}>
            {value.toFixed(precision)}
            <span style={{ fontSize: '18px', color: '#999', marginLeft: 4 }}>{unit}</span>
          </div>
        </div>

        {trend !== null && trend !== undefined && (
          <div style={{ color: getTrendColor() === 'success' ? '#52c41a' : '#ff4d4f' }}>
            {getTrendIcon()} {Math.abs(trend).toFixed(1)}% from previous period
          </div>
        )}

        {target && (
          <div>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: 4 }}>
              Target: {target}{unit}
            </div>
            <Progress
              percent={Math.min(100, (value / target) * 100)}
              strokeColor={statusColors[status]}
              size="small"
            />
          </div>
        )}
      </Space>
    </Card>
  );
};

export default MetricsCard;
