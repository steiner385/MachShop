import React, { useMemo, useState, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ComposedChart,
  Area,
} from 'recharts';
import { Card, Tag, Space, Typography, Tooltip as AntTooltip, Table, Collapse, Button, Switch } from 'antd';
import {
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  TableOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Panel } = Collapse;

/**
 * Control Limits
 */
interface ControlLimits {
  UCL: number;
  centerLine: number;
  LCL: number;
  rangeUCL?: number;
  rangeCL?: number;
  rangeLCL?: number;
  sigma: number;
}

/**
 * Rule Violation
 */
interface RuleViolation {
  ruleNumber: number;
  ruleName: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  description: string;
  dataPointIndices: number[];
  values: number[];
}

/**
 * Data Point
 */
interface DataPoint {
  index: number;
  value: number;
  timestamp?: string;
  subgroupNumber?: number;
  label?: string;
  isViolation?: boolean;
  violationSeverity?: 'CRITICAL' | 'WARNING' | 'INFO';
}

/**
 * ControlChart Props
 */
interface ControlChartProps {
  /** Chart title */
  title?: string;
  /** Chart type */
  chartType: 'X_BAR_R' | 'X_BAR_S' | 'I_MR' | 'P_CHART' | 'C_CHART' | 'EWMA' | 'CUSUM';
  /** Data points to plot */
  data: DataPoint[];
  /** Control limits */
  limits: ControlLimits;
  /** Specification limits (optional) */
  specLimits?: {
    USL?: number;
    LSL?: number;
    target?: number;
  };
  /** Rule violations (optional) */
  violations?: RuleViolation[];
  /** Show sigma zones */
  showSigmaZones?: boolean;
  /** Height of chart in pixels */
  height?: number;
  /** Show range chart (for X-bar R charts) */
  showRangeChart?: boolean;
  /** Range data (for X-bar R charts) */
  rangeData?: DataPoint[];
}

/**
 * ControlChart Component
 *
 * Displays SPC control charts with control limits, specification limits,
 * sigma zones, and rule violations.
 *
 * Features:
 * - Multiple chart types (X-bar/R, X-bar/S, I-MR, P, C, EWMA, CUSUM)
 * - Control limit lines (UCL, CL, LCL)
 * - Specification limit lines (USL, LSL, Target)
 * - Sigma zones (±1σ, ±2σ, ±3σ)
 * - Rule violation highlighting
 * - Interactive tooltips
 * - Responsive design
 *
 * @example
 * ```tsx
 * <ControlChart
 *   title="Temperature Control Chart"
 *   chartType="I_MR"
 *   data={dataPoints}
 *   limits={controlLimits}
 *   specLimits={{ USL: 100, LSL: 80, target: 90 }}
 *   violations={ruleViolations}
 *   showSigmaZones={true}
 * />
 * ```
 */
export const ControlChart: React.FC<ControlChartProps> = ({
  title = 'Control Chart',
  chartType,
  data,
  limits,
  specLimits,
  violations = [],
  showSigmaZones = true,
  height = 400,
  showRangeChart = false,
  rangeData,
}) => {
  // Accessibility state
  const [showDataTable, setShowDataTable] = useState(false);
  const [announceText, setAnnounceText] = useState<string>('');

  // Accessibility helper functions
  const announceToScreenReader = useCallback((message: string) => {
    setAnnounceText(message);
    setTimeout(() => setAnnounceText(''), 100);
  }, []);

  const getChartDescription = useCallback(() => {
    const violationCount = violations.length;
    const criticalViolations = violations.filter(v => v.severity === 'CRITICAL').length;
    const warningViolations = violations.filter(v => v.severity === 'WARNING').length;

    return `${chartType.replace('_', ' ')} control chart with ${data.length} data points.
      Control limits: UCL ${limits.UCL.toFixed(3)}, Center Line ${limits.centerLine.toFixed(3)}, LCL ${limits.LCL.toFixed(3)}.
      ${violationCount > 0
        ? `${violationCount} rule violations detected: ${criticalViolations} critical, ${warningViolations} warnings.`
        : 'Process is in statistical control with no rule violations.'
      }
      ${specLimits ?
        `Specification limits: ${specLimits.USL ? `USL ${specLimits.USL}` : ''} ${specLimits.LSL ? `LSL ${specLimits.LSL}` : ''} ${specLimits.target ? `Target ${specLimits.target}` : ''}`
        : ''
      }`;
  }, [chartType, data.length, limits, violations, specLimits]);

  const getViolationShape = useCallback((severity: 'CRITICAL' | 'WARNING' | 'INFO') => {
    switch (severity) {
      case 'CRITICAL': return 'triangle'; // Triangle for critical
      case 'WARNING': return 'square'; // Square for warning
      case 'INFO': return 'diamond'; // Diamond for info
      default: return 'circle';
    }
  }, []);
  // Mark data points with violations
  const dataWithViolations = useMemo(() => {
    return data.map((point) => {
      const violation = violations.find((v) => v.dataPointIndices.includes(point.index));
      return {
        ...point,
        isViolation: !!violation,
        violationSeverity: violation?.severity,
      };
    });
  }, [data, violations]);

  // Calculate sigma zones
  const sigmaZones = useMemo(() => {
    const { centerLine, sigma } = limits;
    return {
      oneSigmaUpper: centerLine + sigma,
      oneSigmaLower: centerLine - sigma,
      twoSigmaUpper: centerLine + 2 * sigma,
      twoSigmaLower: centerLine - 2 * sigma,
      threeSigmaUpper: centerLine + 3 * sigma,
      threeSigmaLower: centerLine - 3 * sigma,
    };
  }, [limits]);

  // Get chart status
  const chartStatus = useMemo(() => {
    const criticalViolations = violations.filter((v) => v.severity === 'CRITICAL').length;
    const warningViolations = violations.filter((v) => v.severity === 'WARNING').length;

    if (criticalViolations > 0) return { status: 'critical', color: 'red', icon: <WarningOutlined /> };
    if (warningViolations > 0) return { status: 'warning', color: 'orange', icon: <ExclamationCircleOutlined /> };
    return { status: 'in-control', color: 'green', icon: <CheckCircleOutlined /> };
  }, [violations]);

  // Generate data for table view
  const getTableData = useCallback(() => {
    return dataWithViolations.map((point, index) => ({
      key: point.index,
      sampleNumber: point.index + 1,
      value: point.value,
      timestamp: point.timestamp || 'N/A',
      subgroupNumber: point.subgroupNumber || 'N/A',
      label: point.label || `Sample ${point.index + 1}`,
      isViolation: point.isViolation,
      violationSeverity: point.violationSeverity || 'None',
      violationDescription: point.isViolation
        ? violations.find(v => v.dataPointIndices.includes(point.index))?.description || 'Violation detected'
        : 'No violation',
      ucl: limits.UCL,
      centerLine: limits.centerLine,
      lcl: limits.LCL,
      withinLimits: point.value >= limits.LCL && point.value <= limits.UCL,
    }));
  }, [dataWithViolations, violations, limits]);

  const tableColumns = [
    {
      title: 'Sample #',
      dataIndex: 'sampleNumber',
      key: 'sampleNumber',
      width: 90,
      sorter: (a: any, b: any) => a.sampleNumber - b.sampleNumber,
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      sorter: (a: any, b: any) => a.value - b.value,
      render: (value: number) => value.toFixed(4),
    },
    {
      title: 'Within Limits',
      dataIndex: 'withinLimits',
      key: 'withinLimits',
      width: 120,
      render: (withinLimits: boolean) => (
        <Tag color={withinLimits ? 'green' : 'red'}>
          {withinLimits ? 'Yes' : 'No'}
        </Tag>
      ),
      filters: [
        { text: 'Within Limits', value: true },
        { text: 'Out of Limits', value: false },
      ],
      onFilter: (value: any, record: any) => record.withinLimits === value,
    },
    {
      title: 'Violation Status',
      dataIndex: 'violationSeverity',
      key: 'violationSeverity',
      width: 130,
      render: (severity: string, record: any) => {
        if (!record.isViolation) return <Tag>None</Tag>;
        const color = severity === 'CRITICAL' ? 'red' : severity === 'WARNING' ? 'orange' : 'blue';
        return <Tag color={color}>{severity}</Tag>;
      },
      filters: [
        { text: 'No Violation', value: 'None' },
        { text: 'Critical', value: 'CRITICAL' },
        { text: 'Warning', value: 'WARNING' },
        { text: 'Info', value: 'INFO' },
      ],
      onFilter: (value: any, record: any) => record.violationSeverity === value,
    },
    {
      title: 'Violation Description',
      dataIndex: 'violationDescription',
      key: 'violationDescription',
      ellipsis: true,
    },
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 150,
      render: (timestamp: string) => {
        if (timestamp === 'N/A') return timestamp;
        return new Date(timestamp).toLocaleString();
      },
      sorter: (a: any, b: any) => {
        if (a.timestamp === 'N/A') return 1;
        if (b.timestamp === 'N/A') return -1;
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      },
    },
    {
      title: 'UCL',
      dataIndex: 'ucl',
      key: 'ucl',
      width: 80,
      render: (value: number) => value.toFixed(3),
    },
    {
      title: 'CL',
      dataIndex: 'centerLine',
      key: 'centerLine',
      width: 80,
      render: (value: number) => value.toFixed(3),
    },
    {
      title: 'LCL',
      dataIndex: 'lcl',
      key: 'lcl',
      width: 80,
      render: (value: number) => value.toFixed(3),
    },
  ];

  // Custom accessible tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const point = payload[0].payload;
    const violationText = point.isViolation
      ? `Rule violation detected: ${point.violationSeverity} severity`
      : 'No violations';

    return (
      <div
        role="tooltip"
        aria-live="polite"
        style={{
          background: 'white',
          border: '1px solid #ddd',
          borderRadius: '4px',
          padding: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <Text strong>Sample {point.index + 1}</Text>
        <br />
        <Text>Value: {point.value.toFixed(4)}</Text>
        <br />
        <Text type="secondary">
          UCL: {limits.UCL.toFixed(3)} | CL: {limits.centerLine.toFixed(3)} | LCL: {limits.LCL.toFixed(3)}
        </Text>
        {point.timestamp && (
          <>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {new Date(point.timestamp).toLocaleString()}
            </Text>
          </>
        )}
        <br />
        <Text style={{ fontSize: '12px' }}>{violationText}</Text>
        {point.isViolation && (
          <>
            <br />
            <Tag
              color={point.violationSeverity === 'CRITICAL' ? 'red' : point.violationSeverity === 'WARNING' ? 'orange' : 'blue'}
              style={{ marginTop: '4px' }}
            >
              {point.violationSeverity} {getViolationShape(point.violationSeverity)}
            </Tag>
          </>
        )}
      </div>
    );
  };

  // Get point color based on violation
  const getPointColor = (point: DataPoint) => {
    if (point.isViolation) {
      return point.violationSeverity === 'CRITICAL' ? '#f5222d' : '#fa8c16';
    }
    return '#1890ff';
  };

  // Get point size based on violation
  const getPointSize = (point: DataPoint) => {
    return point.isViolation ? 8 : 4;
  };

  return (
    <Card
      title={
        <Space>
          <Title level={4} style={{ margin: 0 }}>
            {title}
          </Title>
          <Tag color={chartStatus.color} icon={chartStatus.icon}>
            {chartStatus.status.toUpperCase().replace('-', ' ')}
          </Tag>
          {violations.length > 0 && (
            <AntTooltip title={`${violations.length} rule violation(s) detected`}>
              <Tag color="red">{violations.length} Violations</Tag>
            </AntTooltip>
          )}
        </Space>
      }
      extra={
        <Space wrap>
          <Text type="secondary">UCL: {limits.UCL.toFixed(3)}</Text>
          <Text type="secondary">CL: {limits.centerLine.toFixed(3)}</Text>
          <Text type="secondary">LCL: {limits.LCL.toFixed(3)}</Text>
          <Button
            icon={<TableOutlined />}
            onClick={() => {
              setShowDataTable(!showDataTable);
              announceToScreenReader(showDataTable ? 'Data table hidden' : 'Data table displayed');
            }}
            size="small"
            type={showDataTable ? 'primary' : 'default'}
            aria-label={showDataTable ? 'Hide data table view' : 'Show data table view'}
            aria-pressed={showDataTable}
          >
            Table View
          </Button>
        </Space>
      }
    >
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

      {/* Accessibility description */}
      <div style={{ marginBottom: 16, padding: '8px 12px', backgroundColor: '#f6f6f6', borderRadius: 4 }}>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          <strong>Chart Description:</strong> {getChartDescription()}
        </Text>
      </div>

      {/* Data Table View */}
      {showDataTable && (
        <div style={{ marginBottom: 16 }}>
          <Collapse defaultActiveKey={['table']} size="small">
            <Panel
              header="Control Chart Data Table - Alternative View"
              key="table"
              extra={
                <Text type="secondary">
                  {data.length} samples
                </Text>
              }
            >
              <Table
                columns={tableColumns}
                dataSource={getTableData()}
                size="small"
                pagination={{
                  pageSize: 25,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) =>
                    `${range[0]}-${range[1]} of ${total} samples`,
                }}
                scroll={{ x: 1200 }}
                aria-label="Control chart data in table format"
                summary={(pageData) => {
                  const violationCount = pageData.filter((record: any) => record.isViolation).length;
                  const outOfLimitsCount = pageData.filter((record: any) => !record.withinLimits).length;
                  return (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={3}>
                        <Text strong>Summary:</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={3}>
                        <Tag color={violationCount > 0 ? 'red' : 'green'}>
                          {violationCount} Violations
                        </Tag>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={4} colSpan={6}>
                        <Tag color={outOfLimitsCount > 0 ? 'orange' : 'green'}>
                          {outOfLimitsCount} Out of Limits
                        </Tag>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  );
                }}
              />
            </Panel>
          </Collapse>
        </div>
      )}

      {/* Main Chart */}
      <div
        role="img"
        aria-label={`${chartType.replace('_', ' ')} control chart showing ${data.length} data points with ${violations.length} rule violations`}
        style={{ marginBottom: 16 }}
      >
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart
            data={dataWithViolations}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            aria-label={getChartDescription()}
          >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="index"
            label={{ value: 'Sample Number', position: 'insideBottom', offset: -10 }}
            tickFormatter={(value) => `${value + 1}`}
          />
          <YAxis
            label={{ value: 'Measurement Value', angle: -90, position: 'insideLeft' }}
            domain={[
              (dataMin: number) => Math.min(dataMin, limits.LCL, specLimits?.LSL || Infinity) * 0.95,
              (dataMax: number) => Math.max(dataMax, limits.UCL, specLimits?.USL || -Infinity) * 1.05,
            ]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />

          {/* Sigma Zones (shaded areas) */}
          {showSigmaZones && (
            <>
              <Area
                type="monotone"
                dataKey={() => sigmaZones.oneSigmaUpper}
                fill="#e6f7ff"
                stroke="none"
                fillOpacity={0.3}
                name="±1σ Zone"
              />
              <Area
                type="monotone"
                dataKey={() => sigmaZones.twoSigmaUpper}
                fill="#bae7ff"
                stroke="none"
                fillOpacity={0.3}
                name="±2σ Zone"
              />
            </>
          )}

          {/* Control Limits */}
          <ReferenceLine y={limits.UCL} stroke="#ff4d4f" strokeDasharray="5 5" label="UCL" strokeWidth={2} />
          <ReferenceLine y={limits.centerLine} stroke="#52c41a" strokeDasharray="3 3" label="CL" strokeWidth={2} />
          <ReferenceLine y={limits.LCL} stroke="#ff4d4f" strokeDasharray="5 5" label="LCL" strokeWidth={2} />

          {/* Sigma Lines */}
          {showSigmaZones && (
            <>
              <ReferenceLine y={sigmaZones.oneSigmaUpper} stroke="#1890ff" strokeDasharray="2 2" strokeOpacity={0.5} />
              <ReferenceLine y={sigmaZones.oneSigmaLower} stroke="#1890ff" strokeDasharray="2 2" strokeOpacity={0.5} />
              <ReferenceLine y={sigmaZones.twoSigmaUpper} stroke="#1890ff" strokeDasharray="2 2" strokeOpacity={0.3} />
              <ReferenceLine y={sigmaZones.twoSigmaLower} stroke="#1890ff" strokeDasharray="2 2" strokeOpacity={0.3} />
            </>
          )}

          {/* Specification Limits */}
          {specLimits?.USL && (
            <ReferenceLine y={specLimits.USL} stroke="#722ed1" strokeDasharray="8 4" label="USL" strokeWidth={2} />
          )}
          {specLimits?.LSL && (
            <ReferenceLine y={specLimits.LSL} stroke="#722ed1" strokeDasharray="8 4" label="LSL" strokeWidth={2} />
          )}
          {specLimits?.target && (
            <ReferenceLine
              y={specLimits.target}
              stroke="#13c2c2"
              strokeDasharray="4 4"
              label="Target"
              strokeWidth={2}
            />
          )}

          {/* Data Line */}
          <Line
            type="monotone"
            dataKey="value"
            stroke="#1890ff"
            strokeWidth={2}
            dot={false}
            name="Measurement"
            isAnimationActive={false}
          />

          {/* Data Points with violations highlighted */}
          <Scatter
            dataKey="value"
            fill="#1890ff"
            shape={(props: any) => {
              const { cx, cy, payload } = props;
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={getPointSize(payload)}
                  fill={getPointColor(payload)}
                  stroke={payload.isViolation ? '#fff' : 'none'}
                  strokeWidth={payload.isViolation ? 2 : 0}
                />
              );
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      </div>

      {/* Range Chart (for X-bar R charts) */}
      {showRangeChart && rangeData && limits.rangeUCL && limits.rangeCL && (
        <div style={{ marginTop: '20px' }}>
          <Title level={5}>Range Chart</Title>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={rangeData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="index"
                label={{ value: 'Sample Number', position: 'insideBottom', offset: -10 }}
                tickFormatter={(value) => `${value + 1}`}
              />
              <YAxis label={{ value: 'Range', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <ReferenceLine
                y={limits.rangeUCL}
                stroke="#ff4d4f"
                strokeDasharray="5 5"
                label="UCL(R)"
                strokeWidth={2}
              />
              <ReferenceLine
                y={limits.rangeCL}
                stroke="#52c41a"
                strokeDasharray="3 3"
                label="CL(R)"
                strokeWidth={2}
              />
              {limits.rangeLCL && limits.rangeLCL > 0 && (
                <ReferenceLine
                  y={limits.rangeLCL}
                  stroke="#ff4d4f"
                  strokeDasharray="5 5"
                  label="LCL(R)"
                  strokeWidth={2}
                />
              )}
              <Line type="monotone" dataKey="value" stroke="#fa8c16" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Violations Summary */}
      {violations.length > 0 && (
        <div style={{ marginTop: '20px', padding: '12px', background: '#fff1f0', borderRadius: '4px' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text strong>
              <WarningOutlined /> Rule Violations Detected
            </Text>
            {violations.slice(0, 5).map((violation, idx) => (
              <div key={idx}>
                <Tag color={violation.severity === 'CRITICAL' ? 'red' : violation.severity === 'WARNING' ? 'orange' : 'blue'}>
                  Rule {violation.ruleNumber}
                </Tag>
                <Text>{violation.description}</Text>
              </div>
            ))}
            {violations.length > 5 && (
              <Text type="secondary">+ {violations.length - 5} more violations</Text>
            )}
          </Space>
        </div>
      )}

      {/* Chart Info */}
      <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <Space size={16} wrap>
          <AntTooltip title="Process standard deviation">
            <Text type="secondary">
              <InfoCircleOutlined /> σ = {limits.sigma.toFixed(4)}
            </Text>
          </AntTooltip>
          <Text type="secondary">Chart Type: {chartType.replace('_', '-')}</Text>
          <Text type="secondary">Samples: {data.length}</Text>
          {violations.length > 0 && (
            <Text type="secondary">
              Violations: {violations.filter(v => v.severity === 'CRITICAL').length} Critical,{' '}
              {violations.filter(v => v.severity === 'WARNING').length} Warning,{' '}
              {violations.filter(v => v.severity === 'INFO').length} Info
            </Text>
          )}
        </Space>

        {/* Accessible Legend */}
        <div role="region" aria-label="Chart legend" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Space size={4}>
            <div
              style={{ width: '12px', height: '12px', background: '#1890ff', borderRadius: '50%' }}
              aria-hidden="true"
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Normal (Blue Circle)
            </Text>
          </Space>
          <Space size={4}>
            <div
              style={{
                width: '12px',
                height: '12px',
                background: '#fa8c16',
                clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
              }}
              aria-hidden="true"
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Warning (Orange Triangle)
            </Text>
          </Space>
          <Space size={4}>
            <div
              style={{
                width: '12px',
                height: '12px',
                background: '#f5222d',
                transform: 'rotate(45deg)',
              }}
              aria-hidden="true"
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Critical (Red Square)
            </Text>
          </Space>
        </div>
      </div>
    </Card>
  );
};

export default ControlChart;
