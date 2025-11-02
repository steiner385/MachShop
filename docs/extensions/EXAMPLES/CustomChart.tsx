/**
 * CustomChart - Data visualization example
 *
 * This example demonstrates:
 * - Data visualization pattern
 * - Theme color usage for charts
 * - Responsive design
 * - Error handling for chart rendering
 * - Loading states
 * - Empty states
 * - Multiple chart types
 *
 * Note: This example assumes you're using a charting library like recharts or chart.js
 *
 * @example
 * <CustomChart
 *   data={chartData}
 *   type="line"
 *   title="Production Trends"
 * />
 */

import React, { useMemo } from 'react';
import { Card, Select, Space, Alert, Spin, Empty, Radio } from 'antd';
import {
  LineChartOutlined,
  BarChartOutlined,
  PieChartOutlined,
  AreaChartOutlined
} from '@ant-design/icons';
import { useTheme } from '@/hooks/useTheme';
import styles from './CustomChart.module.css';

/**
 * Chart data point interface
 */
export interface ChartDataPoint {
  label: string;
  value: number;
  timestamp?: string;
  category?: string;
}

/**
 * Chart type options
 */
export type ChartType = 'line' | 'bar' | 'pie' | 'area';

/**
 * Component props
 */
export interface CustomChartProps {
  /** Chart data */
  data: ChartDataPoint[];

  /** Chart type */
  type?: ChartType;

  /** Chart title */
  title?: string;

  /** Chart height in pixels */
  height?: number;

  /** Loading state */
  loading?: boolean;

  /** Error state */
  error?: Error | null;

  /** Allow chart type switching */
  allowTypeSwitch?: boolean;

  /** Callback when chart type changes */
  onTypeChange?: (type: ChartType) => void;
}

/**
 * CustomChart Component
 *
 * A flexible chart component that adapts to theme and handles various states.
 * Replace the placeholder rendering with your actual charting library.
 */
export const CustomChart: React.FC<CustomChartProps> = ({
  data,
  type = 'line',
  title = 'Chart',
  height = 300,
  loading = false,
  error = null,
  allowTypeSwitch = true,
  onTypeChange,
}) => {
  const { theme, isDark } = useTheme();

  /**
   * Chart colors derived from theme
   */
  const chartColors = useMemo(() => ({
    primary: theme.tokens.colorPrimary,
    success: theme.tokens.colorSuccess,
    warning: theme.tokens.colorWarning,
    error: theme.tokens.colorError,
    info: theme.tokens.colorInfo,
    text: theme.tokens.colorTextBase,
    grid: theme.tokens.colorBorder,
    background: theme.tokens.colorBgContainer,
  }), [theme]);

  /**
   * Chart configuration based on theme
   */
  const chartConfig = useMemo(() => ({
    colors: [
      chartColors.primary,
      chartColors.success,
      chartColors.warning,
      chartColors.error,
      chartColors.info,
    ],
    grid: {
      stroke: chartColors.grid,
      strokeDasharray: '3 3',
    },
    text: {
      fill: chartColors.text,
      fontSize: 12,
    },
    tooltip: {
      backgroundColor: chartColors.background,
      border: `1px solid ${chartColors.grid}`,
      color: chartColors.text,
    },
    legend: {
      color: chartColors.text,
    },
  }), [chartColors]);

  /**
   * Handle chart type change
   */
  const handleTypeChange = (newType: ChartType) => {
    if (onTypeChange) {
      onTypeChange(newType);
    }
  };

  /**
   * Render chart type icon
   */
  const getChartIcon = (chartType: ChartType) => {
    const icons = {
      line: <LineChartOutlined />,
      bar: <BarChartOutlined />,
      pie: <PieChartOutlined />,
      area: <AreaChartOutlined />,
    };
    return icons[chartType];
  };

  /**
   * Loading state
   */
  if (loading) {
    return (
      <Card className={styles.container} title={title}>
        <div
          className={styles.loadingContainer}
          style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Spin size="large" tip="Loading chart data..." />
        </div>
      </Card>
    );
  }

  /**
   * Error state
   */
  if (error) {
    return (
      <Card className={styles.container} title={title}>
        <Alert
          type="error"
          message="Chart Error"
          description={error.message || 'Failed to load chart data'}
          showIcon
        />
      </Card>
    );
  }

  /**
   * Empty state
   */
  if (!data || data.length === 0) {
    return (
      <Card className={styles.container} title={title}>
        <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Empty
            description="No data available for chart"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      </Card>
    );
  }

  /**
   * Chart rendering
   *
   * NOTE: This is a placeholder. In a real implementation, replace this with
   * your actual charting library (recharts, chart.js, victory, etc.)
   */
  const renderChart = () => {
    return (
      <div
        className={styles.chartContainer}
        style={{
          height,
          backgroundColor: chartColors.background,
          border: `1px solid ${chartColors.grid}`,
          borderRadius: '4px',
          padding: theme.tokens.marginMD,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Space direction="vertical" align="center">
          {getChartIcon(type)}
          <div style={{ color: chartColors.text }}>
            Chart Type: {type.toUpperCase()}
          </div>
          <div style={{ color: chartColors.text, fontSize: '12px' }}>
            Data Points: {data.length}
          </div>
          <div style={{ color: theme.tokens.colorTextSecondary, fontSize: '11px', textAlign: 'center' }}>
            Replace this placeholder with your actual charting library
            <br />
            (recharts, chart.js, victory, etc.)
          </div>

          {/* Example data preview */}
          <div
            style={{
              marginTop: theme.tokens.marginMD,
              padding: theme.tokens.marginSM,
              backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
              borderRadius: '4px',
              maxWidth: '400px',
            }}
          >
            <div style={{ fontSize: '11px', color: theme.tokens.colorTextSecondary, marginBottom: '8px' }}>
              Sample Data:
            </div>
            {data.slice(0, 3).map((point, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  color: chartColors.text,
                  marginBottom: '4px',
                }}
              >
                <span>{point.label}</span>
                <span style={{ fontWeight: 500, color: chartColors.primary }}>
                  {point.value.toLocaleString()}
                </span>
              </div>
            ))}
            {data.length > 3 && (
              <div style={{ fontSize: '11px', color: theme.tokens.colorTextTertiary, marginTop: '4px' }}>
                ... and {data.length - 3} more
              </div>
            )}
          </div>
        </Space>
      </div>
    );
  };

  return (
    <Card
      className={styles.container}
      title={
        <Space>
          {getChartIcon(type)}
          {title}
        </Space>
      }
      extra={
        allowTypeSwitch && (
          <Radio.Group
            value={type}
            onChange={e => handleTypeChange(e.target.value)}
            size="small"
          >
            <Radio.Button value="line">
              <LineChartOutlined />
            </Radio.Button>
            <Radio.Button value="bar">
              <BarChartOutlined />
            </Radio.Button>
            <Radio.Button value="area">
              <AreaChartOutlined />
            </Radio.Button>
            <Radio.Button value="pie">
              <PieChartOutlined />
            </Radio.Button>
          </Radio.Group>
        )
      }
    >
      {renderChart()}

      {/* Chart metadata */}
      <div
        className={styles.metadata}
        style={{
          marginTop: theme.tokens.marginMD,
          padding: theme.tokens.marginSM,
          borderTop: `1px solid ${chartColors.grid}`,
          color: theme.tokens.colorTextSecondary,
          fontSize: theme.tokens.fontSize * 0.875,
        }}
      >
        <Space split="|">
          <span>Data Points: {data.length}</span>
          <span>Theme: {isDark ? 'Dark' : 'Light'}</span>
          <span>Updated: {new Date().toLocaleTimeString()}</span>
        </Space>
      </div>
    </Card>
  );
};

CustomChart.displayName = 'CustomChart';

export default CustomChart;

/**
 * Example integration with Recharts:
 *
 * import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
 *
 * const renderChart = () => {
 *   return (
 *     <ResponsiveContainer width="100%" height={height}>
 *       <LineChart data={data}>
 *         <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
 *         <XAxis dataKey="label" stroke={chartColors.text} />
 *         <YAxis stroke={chartColors.text} />
 *         <Tooltip
 *           contentStyle={{
 *             backgroundColor: chartColors.background,
 *             border: `1px solid ${chartColors.grid}`,
 *             color: chartColors.text,
 *           }}
 *         />
 *         <Legend wrapperStyle={{ color: chartColors.text }} />
 *         <Line
 *           type="monotone"
 *           dataKey="value"
 *           stroke={chartColors.primary}
 *           strokeWidth={2}
 *         />
 *       </LineChart>
 *     </ResponsiveContainer>
 *   );
 * };
 */
