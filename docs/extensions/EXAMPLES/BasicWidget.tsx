/**
 * BasicWidget - Simple dashboard widget example
 *
 * This example demonstrates:
 * - Proper TypeScript typing
 * - Permission checking with usePermissions hook
 * - Theme token usage for consistent styling
 * - Loading and error state handling
 * - CSS Module styling patterns
 * - Ant Design component integration
 *
 * @example
 * // Register in your extension manifest:
 * {
 *   "widgets": [{
 *     "id": "my-extension:basic-widget",
 *     "type": "dashboard-widget",
 *     "permissions": ["dashboard:read"],
 *     "component": "./BasicWidget.tsx"
 *   }]
 * }
 */

import React, { useEffect, useState } from 'react';
import { Card, Statistic, Spin, Alert, Row, Col } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { usePermissions } from '@/hooks/usePermissions';
import { useTheme } from '@/hooks/useTheme';
import styles from './BasicWidget.module.css';

/**
 * Props interface for BasicWidget component
 */
export interface BasicWidgetProps {
  /** Widget title displayed in header */
  title?: string;

  /** Refresh interval in milliseconds (default: 30000) */
  refreshInterval?: number;

  /** Callback when data is loaded */
  onDataLoad?: (data: WidgetData) => void;

  /** Read-only mode (disables interactions) */
  readOnly?: boolean;
}

/**
 * Data structure returned by the widget
 */
export interface WidgetData {
  value: number;
  trend: 'up' | 'down' | 'neutral';
  change: number;
  label: string;
}

/**
 * BasicWidget Component
 *
 * A simple dashboard widget that displays a statistic with trend indicator.
 * Demonstrates proper permission checking, theme integration, and state management.
 */
export const BasicWidget: React.FC<BasicWidgetProps> = ({
  title = 'Production Status',
  refreshInterval = 30000,
  onDataLoad,
  readOnly = false,
}) => {
  // Theme and permissions hooks
  const { theme, isDark } = useTheme();
  const { hasPermission } = usePermissions();

  // Component state
  const [data, setData] = useState<WidgetData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Check permissions before rendering
  const canView = hasPermission('dashboard:read');

  /**
   * Fetch widget data from API
   */
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Simulate API call
      const response = await fetch('/api/widgets/production-status');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: WidgetData = await response.json();

      setData(result);

      // Notify parent component if callback provided
      if (onDataLoad) {
        onDataLoad(result);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err : new Error('Failed to load widget data');
      setError(errorMessage);
      console.error('Widget data fetch error:', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on mount and set up auto-refresh
  useEffect(() => {
    if (canView) {
      fetchData();

      // Set up auto-refresh interval
      const interval = setInterval(fetchData, refreshInterval);

      // Cleanup interval on unmount
      return () => clearInterval(interval);
    }
  }, [canView, refreshInterval]);

  // Permission denied state
  if (!canView) {
    return (
      <Card className={styles.container}>
        <Alert
          type="warning"
          message="Permission Denied"
          description="You don't have permission to view this widget."
          showIcon
        />
      </Card>
    );
  }

  // Loading state
  if (loading && !data) {
    return (
      <Card className={styles.container}>
        <div className={styles.loadingContainer}>
          <Spin size="large" tip="Loading widget data..." />
        </div>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={styles.container}>
        <Alert
          type="error"
          message="Failed to Load Widget"
          description={error.message}
          showIcon
        />
      </Card>
    );
  }

  // No data state
  if (!data) {
    return (
      <Card className={styles.container}>
        <Alert
          type="info"
          message="No Data Available"
          description="Widget data is not available at this time."
          showIcon
        />
      </Card>
    );
  }

  // Determine trend icon and color
  const trendIcon = data.trend === 'up' ? <ArrowUpOutlined /> :
                    data.trend === 'down' ? <ArrowDownOutlined /> : null;

  const trendColor = data.trend === 'up' ? theme.tokens.colorSuccess :
                     data.trend === 'down' ? theme.tokens.colorError :
                     theme.tokens.colorTextSecondary;

  return (
    <Card
      title={title}
      className={styles.container}
      loading={loading}
      bordered={true}
    >
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Statistic
            title={data.label}
            value={data.value}
            precision={0}
            valueStyle={{
              color: theme.tokens.colorTextBase,
              fontSize: theme.tokens.fontSizeHeading2
            }}
            prefix={trendIcon}
            suffix={
              <span
                style={{
                  color: trendColor,
                  fontSize: theme.tokens.fontSize,
                  marginLeft: theme.tokens.marginSM
                }}
              >
                {data.change > 0 ? '+' : ''}{data.change}%
              </span>
            }
          />
        </Col>
      </Row>

      {/* Additional metadata or context */}
      <div
        className={styles.footer}
        style={{
          borderTop: `1px solid ${theme.tokens.colorBorder}`,
          marginTop: theme.tokens.marginMD,
          paddingTop: theme.tokens.marginSM,
          color: theme.tokens.colorTextSecondary,
          fontSize: theme.tokens.fontSize * 0.875
        }}
      >
        Last updated: {new Date().toLocaleTimeString()}
        {readOnly && <span style={{ marginLeft: '8px' }}>(Read-only)</span>}
      </div>
    </Card>
  );
};

// Set display name for debugging
BasicWidget.displayName = 'BasicWidget';

// Default export for lazy loading
export default BasicWidget;
