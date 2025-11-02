/**
 * WidgetTemplate - Basic widget scaffold
 *
 * Copy this template to create a new widget component.
 * Replace all TODO comments with your implementation.
 *
 * @example
 * // 1. Copy this file to your extension
 * // 2. Rename to YourWidget.tsx
 * // 3. Replace TODO items
 * // 4. Register in extension manifest
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Spin, Alert, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { usePermissions } from '@/hooks/usePermissions';
import { useTheme } from '@/hooks/useTheme';
import styles from './WidgetTemplate.module.css';

/**
 * TODO: Define your widget props interface
 */
export interface WidgetTemplateProps {
  // TODO: Add your props here
  title?: string;
  refreshInterval?: number;
  // Add more props as needed
}

/**
 * TODO: Define your data interface
 */
export interface WidgetData {
  // TODO: Define data structure
  id: string;
  value: number;
  // Add more fields as needed
}

/**
 * WidgetTemplate Component
 *
 * TODO: Add description of what your widget does
 */
export const WidgetTemplate: React.FC<WidgetTemplateProps> = ({
  title = 'Widget Title', // TODO: Change default title
  refreshInterval = 30000,
}) => {
  const { theme } = useTheme();
  const { hasPermission } = usePermissions();

  // State
  const [data, setData] = useState<WidgetData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // TODO: Add required permission
  const canView = hasPermission('your-permission:read');

  /**
   * TODO: Implement data fetching logic
   */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Replace with your API endpoint
      const response = await fetch('/api/your-endpoint');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: WidgetData = await response.json();
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err : new Error('Failed to load data');
      setError(errorMessage);
      console.error('Widget fetch error:', errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch data on mount and set up auto-refresh
  useEffect(() => {
    if (canView) {
      fetchData();

      if (refreshInterval) {
        const interval = setInterval(fetchData, refreshInterval);
        return () => clearInterval(interval);
      }
    }
  }, [canView, fetchData, refreshInterval]);

  // Permission denied
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
        <div className={styles.loading}>
          <Spin size="large" tip="Loading..." />
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
          message="Error"
          description={error.message}
          showIcon
          action={
            <Button size="small" onClick={fetchData} icon={<ReloadOutlined />}>
              Retry
            </Button>
          }
        />
      </Card>
    );
  }

  // Empty state
  if (!data) {
    return (
      <Card className={styles.container}>
        <Alert
          type="info"
          message="No Data"
          description="No data available."
          showIcon
        />
      </Card>
    );
  }

  // TODO: Implement your widget UI
  return (
    <Card
      className={styles.container}
      title={title}
      extra={
        <Button
          size="small"
          icon={<ReloadOutlined />}
          onClick={fetchData}
          loading={loading}
        />
      }
    >
      {/* TODO: Add your widget content here */}
      <div>
        <p>Widget Data: {JSON.stringify(data)}</p>
        {/* Replace with your actual UI */}
      </div>
    </Card>
  );
};

WidgetTemplate.displayName = 'WidgetTemplate';

export default WidgetTemplate;
