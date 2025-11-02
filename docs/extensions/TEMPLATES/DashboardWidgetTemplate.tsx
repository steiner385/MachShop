/**
 * DashboardWidgetTemplate - Dashboard widget scaffold
 *
 * Use this template for creating dashboard widgets that display metrics.
 */

import React, { useState, useEffect } from 'react';
import { Card, Statistic, Row, Col, Spin, Alert } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { useTheme } from '@/hooks/useTheme';
import { usePermissions } from '@/hooks/usePermissions';
import styles from './DashboardWidgetTemplate.module.css';

/**
 * TODO: Define your widget data structure
 */
export interface DashboardData {
  value: number;
  trend: 'up' | 'down' | 'neutral';
  change: number;
  label: string;
  // Add more metrics as needed
}

/**
 * TODO: Define widget props
 */
export interface DashboardWidgetTemplateProps {
  title?: string;
  refreshInterval?: number;
}

/**
 * DashboardWidgetTemplate
 *
 * TODO: Add description
 */
export const DashboardWidgetTemplate: React.FC<DashboardWidgetTemplateProps> = ({
  title = 'Dashboard Widget', // TODO: Change default
  refreshInterval = 30000,
}) => {
  const { theme } = useTheme();
  const { hasPermission } = usePermissions();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // TODO: Update permission
  const canView = hasPermission('dashboard:read');

  useEffect(() => {
    if (!canView) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        // TODO: Replace with your API endpoint
        const response = await fetch('/api/dashboard/metrics');
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [canView, refreshInterval]);

  if (!canView) {
    return (
      <Card className={styles.container}>
        <Alert type="warning" message="Access Denied" showIcon />
      </Card>
    );
  }

  if (loading && !data) {
    return (
      <Card className={styles.container}>
        <Spin />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={styles.container}>
        <Alert type="error" message={error.message} showIcon />
      </Card>
    );
  }

  if (!data) return null;

  const trendIcon = data.trend === 'up' ? <ArrowUpOutlined /> :
                    data.trend === 'down' ? <ArrowDownOutlined /> : null;

  const trendColor = data.trend === 'up' ? theme.tokens.colorSuccess :
                     data.trend === 'down' ? theme.tokens.colorError :
                     theme.tokens.colorTextSecondary;

  return (
    <Card className={styles.container} title={title}>
      <Row gutter={16}>
        <Col span={24}>
          <Statistic
            title={data.label}
            value={data.value}
            prefix={trendIcon}
            suffix={
              <span style={{ color: trendColor, fontSize: '14px' }}>
                {data.change > 0 ? '+' : ''}{data.change}%
              </span>
            }
          />
        </Col>
        {/* TODO: Add more statistics as needed */}
      </Row>
    </Card>
  );
};

DashboardWidgetTemplate.displayName = 'DashboardWidgetTemplate';

export default DashboardWidgetTemplate;
