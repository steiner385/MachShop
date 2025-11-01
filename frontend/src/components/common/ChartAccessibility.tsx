import React, { useState, useCallback, ReactNode } from 'react';
import { Table, Collapse, Button, Typography, Tag, Space, Select, Tooltip, Switch } from 'antd';
import { TableOutlined, EyeOutlined, TouchOutlined, HighlightOutlined } from '@ant-design/icons';

const { Text } = Typography;
const { Panel } = Collapse;

/**
 * Chart Accessibility Utilities
 *
 * Provides reusable accessibility enhancements for all chart components
 * to ensure WCAG 2.1 Level AA compliance.
 */

// Types for chart accessibility
export interface ChartDataPoint {
  [key: string]: any;
  value?: number;
  label?: string;
  timestamp?: string;
}

export interface AccessibleChartProps {
  title: string;
  description: string;
  chartType: string;
  data: ChartDataPoint[];
  children: ReactNode;
  height?: number;
  tableColumns?: any[];
  getTableData?: () => any[];
  extraControls?: ReactNode;
  enableAccessibilityControls?: boolean;
  enableTouchSupport?: boolean;
  onAccessibilityModeChange?: (mode: 'default' | 'highContrast' | 'colorblindFriendly') => void;
}

/**
 * Hook for managing chart accessibility state and announcements
 */
export const useChartAccessibility = () => {
  const [showDataTable, setShowDataTable] = useState(false);
  const [announceText, setAnnounceText] = useState('');
  const [accessibilityMode, setAccessibilityMode] = useState<'default' | 'highContrast' | 'colorblindFriendly'>('default');
  const [touchOptimized, setTouchOptimized] = useState(false);

  const announceToScreenReader = useCallback((message: string) => {
    setAnnounceText(message);
    setTimeout(() => setAnnounceText(''), 100);
  }, []);

  const toggleDataTable = useCallback(() => {
    const newState = !showDataTable;
    setShowDataTable(newState);
    announceToScreenReader(newState ? 'Data table displayed' : 'Data table hidden');
  }, [showDataTable, announceToScreenReader]);

  const changeAccessibilityMode = useCallback((mode: 'default' | 'highContrast' | 'colorblindFriendly') => {
    setAccessibilityMode(mode);
    const modeLabels = {
      default: 'Standard',
      highContrast: 'High Contrast',
      colorblindFriendly: 'Color Blind Friendly'
    };
    announceToScreenReader(`Chart color mode changed to ${modeLabels[mode]}`);
  }, [announceToScreenReader]);

  const toggleTouchOptimization = useCallback(() => {
    const newState = !touchOptimized;
    setTouchOptimized(newState);
    announceToScreenReader(newState ? 'Touch optimization enabled' : 'Touch optimization disabled');
  }, [touchOptimized, announceToScreenReader]);

  return {
    showDataTable,
    announceText,
    accessibilityMode,
    touchOptimized,
    announceToScreenReader,
    toggleDataTable,
    changeAccessibilityMode,
    toggleTouchOptimization,
  };
};

/**
 * Accessible Chart Wrapper Component
 *
 * Wraps any Recharts component with accessibility enhancements
 */
export const AccessibleChartWrapper: React.FC<AccessibleChartProps> = ({
  title,
  description,
  chartType,
  data,
  children,
  height = 400,
  tableColumns = [],
  getTableData,
  extraControls,
  enableAccessibilityControls = true,
  enableTouchSupport = true,
  onAccessibilityModeChange,
}) => {
  const {
    showDataTable,
    announceText,
    accessibilityMode,
    touchOptimized,
    toggleDataTable,
    changeAccessibilityMode,
    toggleTouchOptimization,
  } = useChartAccessibility();

  // Default table data if not provided
  const defaultTableData = data.map((item, index) => ({
    key: index,
    index: index + 1,
    ...item,
  }));

  // Default table columns if not provided
  const defaultColumns = [
    {
      title: 'Index',
      dataIndex: 'index',
      key: 'index',
      width: 80,
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      render: (value: number) => typeof value === 'number' ? value.toFixed(3) : value,
      sorter: (a: any, b: any) => {
        const aVal = typeof a.value === 'number' ? a.value : 0;
        const bVal = typeof b.value === 'number' ? b.value : 0;
        return aVal - bVal;
      },
    },
    {
      title: 'Label',
      dataIndex: 'label',
      key: 'label',
    },
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp: string) => {
        if (!timestamp) return 'N/A';
        return new Date(timestamp).toLocaleString();
      },
      sorter: (a: any, b: any) => {
        if (!a.timestamp) return 1;
        if (!b.timestamp) return -1;
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      },
    },
  ];

  const tableData = getTableData ? getTableData() : defaultTableData;
  const columns = tableColumns.length > 0 ? tableColumns : defaultColumns;

  return (
    <div>
      {/* Live region for screen reader announcements */}
      <div
        aria-live="assertive"
        aria-atomic="true"
        style={{
          position: 'absolute',
          left: '-10000px',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
      >
        {announceText}
      </div>

      {/* Controls */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <Text strong>{title}</Text>
        </div>
        <Space>
          {extraControls}
          <Button
            icon={<TableOutlined />}
            onClick={toggleDataTable}
            size="small"
            type={showDataTable ? 'primary' : 'default'}
            aria-label={showDataTable ? 'Hide data table view' : 'Show data table view'}
            aria-pressed={showDataTable}
          >
            Table View
          </Button>

          {enableAccessibilityControls && (
            <>
              <Tooltip title="Change color scheme for better accessibility">
                <Select
                  value={accessibilityMode}
                  onChange={(value) => {
                    changeAccessibilityMode(value);
                    onAccessibilityModeChange?.(value);
                  }}
                  size="small"
                  style={{ width: 140 }}
                  aria-label="Chart accessibility mode"
                >
                  <Select.Option value="default">
                    <EyeOutlined /> Standard
                  </Select.Option>
                  <Select.Option value="highContrast">
                    <HighlightOutlined /> High Contrast
                  </Select.Option>
                  <Select.Option value="colorblindFriendly">
                    <EyeOutlined /> Color Blind Friendly
                  </Select.Option>
                </Select>
              </Tooltip>
            </>
          )}

          {enableTouchSupport && (
            <Tooltip title="Optimize chart for touch devices">
              <Button
                icon={<TouchOutlined />}
                onClick={toggleTouchOptimization}
                size="small"
                type={touchOptimized ? 'primary' : 'default'}
                aria-label={touchOptimized ? 'Disable touch optimization' : 'Enable touch optimization'}
                aria-pressed={touchOptimized}
              >
                Touch
              </Button>
            </Tooltip>
          )}
        </Space>
      </div>

      {/* Chart description for accessibility */}
      <div style={{ marginBottom: 16, padding: '8px 12px', backgroundColor: '#f6f6f6', borderRadius: 4 }}>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          <strong>Chart Description:</strong> {description}
        </Text>
      </div>

      {/* Data Table View */}
      {showDataTable && (
        <div style={{ marginBottom: 16 }}>
          <Collapse defaultActiveKey={['table']} size="small">
            <Panel
              header={`${chartType} Data Table - Alternative View`}
              key="table"
              extra={
                <Text type="secondary">
                  {data.length} data points
                </Text>
              }
            >
              <Table
                columns={columns}
                dataSource={tableData}
                size="small"
                pagination={{
                  pageSize: 25,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) =>
                    `${range[0]}-${range[1]} of ${total} items`,
                }}
                scroll={{ x: 800 }}
                aria-label={`${chartType} data in table format`}
              />
            </Panel>
          </Collapse>
        </div>
      )}

      {/* Chart Container with accessibility attributes */}
      <div
        role="img"
        aria-label={`${chartType} showing ${data.length} data points`}
        style={{ border: '1px solid #d9d9d9', borderRadius: 4, overflow: 'hidden' }}
      >
        {children}
      </div>

      {/* Chart metadata */}
      <div style={{ marginTop: 12, textAlign: 'center' }}>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          Chart Type: {chartType} | Data Points: {data.length}
        </Text>
      </div>
    </div>
  );
};

/**
 * Utility function to generate accessible colors with patterns
 */
export const getAccessibleColor = (
  index: number,
  isHighlighted = false,
  accessibilityMode: 'default' | 'highContrast' | 'colorblindFriendly' = 'default'
) => {
  // Import accessible colors - would normally be at top but doing inline for demonstration
  const { getAccessibleDataPointStyle } = require('../../utils/accessibleColors');

  const style = getAccessibleDataPointStyle(index, accessibilityMode);

  return {
    ...style,
    pattern: isHighlighted ? 'diagonal-stripes' : style.pattern,
    isHighlighted,
  };
};

/**
 * Utility function to get accessible shapes for data points
 */
export const getShapeByIndex = (index: number) => {
  const shapes = ['circle', 'square', 'triangle', 'diamond', 'star', 'cross'];
  return shapes[index % shapes.length];
};

/**
 * Utility function to generate chart descriptions for screen readers
 */
export const generateChartDescription = (
  chartType: string,
  dataLength: number,
  additionalInfo?: string
) => {
  let description = `${chartType} chart with ${dataLength} data points.`;

  if (additionalInfo) {
    description += ` ${additionalInfo}`;
  }

  description += ' Use the Table View button to access data in an alternative tabular format.';

  return description;
};

/**
 * Higher-order component to wrap Recharts components with accessibility
 */
export const withChartAccessibility = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  defaultProps: {
    chartType: string;
    getDescription?: (props: P) => string;
    getTableColumns?: (props: P) => any[];
    getTableData?: (props: P) => any[];
  }
) => {
  return (props: P & { title?: string; data?: ChartDataPoint[] }) => {
    const { title = 'Chart', data = [], ...wrappedProps } = props;

    const description = defaultProps.getDescription
      ? defaultProps.getDescription(props as P)
      : generateChartDescription(defaultProps.chartType, data.length);

    const tableColumns = defaultProps.getTableColumns
      ? defaultProps.getTableColumns(props as P)
      : undefined;

    const getTableData = defaultProps.getTableData
      ? () => defaultProps.getTableData!(props as P)
      : undefined;

    return (
      <AccessibleChartWrapper
        title={title}
        description={description}
        chartType={defaultProps.chartType}
        data={data}
        tableColumns={tableColumns}
        getTableData={getTableData}
      >
        <WrappedComponent {...(wrappedProps as P)} />
      </AccessibleChartWrapper>
    );
  };
};

export default AccessibleChartWrapper;