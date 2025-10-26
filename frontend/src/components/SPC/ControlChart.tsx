import React, { useMemo } from 'react';
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
import { Card, Tag, Space, Typography, Tooltip as AntTooltip } from 'antd';
import {
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

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

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const point = payload[0].payload;
    return (
      <div
        style={{
          background: 'white',
          border: '1px solid #ddd',
          borderRadius: '4px',
          padding: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <Text strong>Point {point.index + 1}</Text>
        <br />
        <Text>Value: {point.value.toFixed(3)}</Text>
        {point.timestamp && (
          <>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {new Date(point.timestamp).toLocaleString()}
            </Text>
          </>
        )}
        {point.isViolation && (
          <>
            <br />
            <Tag color={point.violationSeverity === 'CRITICAL' ? 'red' : 'orange'} style={{ marginTop: '4px' }}>
              Rule Violation
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
        <Space>
          <Text type="secondary">UCL: {limits.UCL.toFixed(3)}</Text>
          <Text type="secondary">CL: {limits.centerLine.toFixed(3)}</Text>
          <Text type="secondary">LCL: {limits.LCL.toFixed(3)}</Text>
        </Space>
      }
    >
      {/* Main Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={dataWithViolations} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
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
      <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space size={16}>
          <AntTooltip title="Process standard deviation">
            <Text type="secondary">
              <InfoCircleOutlined /> σ = {limits.sigma.toFixed(4)}
            </Text>
          </AntTooltip>
          <Text type="secondary">Chart Type: {chartType.replace('_', '-')}</Text>
          <Text type="secondary">Samples: {data.length}</Text>
        </Space>
        <Space>
          <div style={{ width: '12px', height: '12px', background: '#1890ff', borderRadius: '50%' }} />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Normal
          </Text>
          <div style={{ width: '12px', height: '12px', background: '#fa8c16', borderRadius: '50%' }} />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Warning
          </Text>
          <div style={{ width: '12px', height: '12px', background: '#f5222d', borderRadius: '50%' }} />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Critical
          </Text>
        </Space>
      </div>
    </Card>
  );
};

export default ControlChart;
