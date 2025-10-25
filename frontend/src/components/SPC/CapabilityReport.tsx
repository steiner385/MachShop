import React, { useMemo } from 'react';
import { Card, Row, Col, Statistic, Typography, Space, Tag, Alert, Descriptions, Button } from 'antd';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import {
  CheckCircleOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

/**
 * Capability Indices
 */
interface CapabilityIndices {
  Cp: number;
  Cpk: number;
  Pp: number;
  Ppk: number;
  Cpm?: number;
}

/**
 * Process Statistics
 */
interface ProcessStatistics {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  range: number;
  sampleSize: number;
}

/**
 * CapabilityReport Props
 */
interface CapabilityReportProps {
  /** Report title */
  title?: string;
  /** Parameter name */
  parameterName: string;
  /** Process data for histogram */
  data: number[];
  /** Capability indices */
  capability: CapabilityIndices;
  /** Specification limits */
  specLimits: {
    USL: number;
    LSL: number;
    target?: number;
  };
  /** Process statistics (optional, will be calculated if not provided) */
  statistics?: ProcessStatistics;
  /** Show export button */
  showExport?: boolean;
  /** Export callback */
  onExport?: () => void;
}

/**
 * CapabilityReport Component
 *
 * Displays process capability analysis with:
 * - Capability indices (Cp, Cpk, Pp, Ppk, Cpm)
 * - Process histogram with spec limits
 * - Process statistics
 * - Capability interpretation
 * - Export functionality
 *
 * @example
 * ```tsx
 * <CapabilityReport
 *   parameterName="Temperature"
 *   data={measurementData}
 *   capability={{ Cp: 1.33, Cpk: 1.25, Pp: 1.30, Ppk: 1.22 }}
 *   specLimits={{ USL: 100, LSL: 80, target: 90 }}
 * />
 * ```
 */
export const CapabilityReport: React.FC<CapabilityReportProps> = ({
  title = 'Process Capability Report',
  parameterName,
  data,
  capability,
  specLimits,
  statistics,
  showExport = true,
  onExport,
}) => {
  // Calculate statistics if not provided
  const processStats = useMemo((): ProcessStatistics => {
    if (statistics) return statistics;

    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (data.length - 1);
    const stdDev = Math.sqrt(variance);
    const min = Math.min(...data);
    const max = Math.max(...data);

    return {
      mean,
      stdDev,
      min,
      max,
      range: max - min,
      sampleSize: data.length,
    };
  }, [data, statistics]);

  // Create histogram data
  const histogramData = useMemo(() => {
    const binCount = Math.min(20, Math.ceil(Math.sqrt(data.length)));
    const binWidth = (processStats.max - processStats.min) / binCount;

    const bins: { bin: string; count: number; midpoint: number }[] = [];

    for (let i = 0; i < binCount; i++) {
      const binStart = processStats.min + i * binWidth;
      const binEnd = binStart + binWidth;
      const midpoint = (binStart + binEnd) / 2;
      const count = data.filter((val) => val >= binStart && (i === binCount - 1 ? val <= binEnd : val < binEnd)).length;

      bins.push({
        bin: `${binStart.toFixed(2)}-${binEnd.toFixed(2)}`,
        count,
        midpoint,
      });
    }

    return bins;
  }, [data, processStats]);

  // Get capability assessment
  const getCapabilityAssessment = (cpk: number) => {
    if (cpk >= 2.0) {
      return { level: 'Excellent', color: 'green', icon: <CheckCircleOutlined />, description: '6 Sigma process' };
    } else if (cpk >= 1.67) {
      return { level: 'Capable', color: 'green', icon: <CheckCircleOutlined />, description: '5 Sigma process' };
    } else if (cpk >= 1.33) {
      return { level: 'Adequate', color: 'blue', icon: <InfoCircleOutlined />, description: '4 Sigma process' };
    } else if (cpk >= 1.0) {
      return { level: 'Marginal', color: 'orange', icon: <ExclamationCircleOutlined />, description: '3 Sigma process' };
    } else {
      return { level: 'Inadequate', color: 'red', icon: <WarningOutlined />, description: 'Process not capable' };
    }
  };

  const assessment = getCapabilityAssessment(capability.Cpk);

  // Calculate defect rates (assuming normal distribution)
  const calculateDefectRate = (cpk: number) => {
    // Simplified calculation: defect rate ≈ 0.5 * erfc(3 * cpk / sqrt(2))
    // For display purposes, use approximations
    if (cpk >= 2.0) return '< 1 PPB';
    if (cpk >= 1.67) return '< 1 PPM';
    if (cpk >= 1.33) return '< 100 PPM';
    if (cpk >= 1.0) return '< 1350 PPM';
    return '> 1350 PPM';
  };

  return (
    <Card
      title={
        <Space>
          <Title level={4} style={{ margin: 0 }}>
            {title}
          </Title>
          <Tag color={assessment.color} icon={assessment.icon}>
            {assessment.level}
          </Tag>
        </Space>
      }
      extra={showExport && <Button icon={<DownloadOutlined />} onClick={onExport}>Export PDF</Button>}
    >
      {/* Alert based on capability */}
      {capability.Cpk < 1.33 && (
        <Alert
          message={`Process Capability Warning`}
          description={`Cpk = ${capability.Cpk.toFixed(3)} is below recommended minimum of 1.33. Process improvement required.`}
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginBottom: '24px' }}
        />
      )}

      {/* Capability Indices */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={4}>
          <Card>
            <Statistic
              title="Cp"
              value={capability.Cp.toFixed(3)}
              valueStyle={{ color: capability.Cp >= 1.33 ? '#3f8600' : '#cf1322' }}
              prefix={capability.Cp >= 1.33 ? <CheckCircleOutlined /> : <WarningOutlined />}
              suffix={<Text type="secondary" style={{ fontSize: '14px' }}>(Potential)</Text>}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Cpk"
              value={capability.Cpk.toFixed(3)}
              valueStyle={{ color: assessment.color === 'green' || assessment.color === 'blue' ? '#3f8600' : assessment.color === 'orange' ? '#fa8c16' : '#cf1322' }}
              prefix={assessment.icon}
              suffix={<Text type="secondary" style={{ fontSize: '14px' }}>(Actual)</Text>}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Pp"
              value={capability.Pp.toFixed(3)}
              valueStyle={{ color: capability.Pp >= 1.33 ? '#3f8600' : '#cf1322' }}
              prefix={capability.Pp >= 1.33 ? <CheckCircleOutlined /> : <WarningOutlined />}
              suffix={<Text type="secondary" style={{ fontSize: '14px' }}>(Performance)</Text>}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Ppk"
              value={capability.Ppk.toFixed(3)}
              valueStyle={{ color: capability.Ppk >= 1.33 ? '#3f8600' : '#cf1322' }}
              prefix={capability.Ppk >= 1.33 ? <CheckCircleOutlined /> : <WarningOutlined />}
              suffix={<Text type="secondary" style={{ fontSize: '14px' }}>(Actual Perf.)</Text>}
            />
          </Card>
        </Col>
        {capability.Cpm && (
          <Col span={4}>
            <Card>
              <Statistic
                title="Cpm"
                value={capability.Cpm.toFixed(3)}
                valueStyle={{ color: capability.Cpm >= 1.33 ? '#3f8600' : '#cf1322' }}
                prefix={capability.Cpm >= 1.33 ? <CheckCircleOutlined /> : <WarningOutlined />}
                suffix={<Text type="secondary" style={{ fontSize: '14px' }}>(Taguchi)</Text>}
              />
            </Card>
          </Col>
        )}
        <Col span={capability.Cpm ? 4 : 8}>
          <Card style={{ height: '100%' }}>
            <Statistic
              title="Defect Rate"
              value={calculateDefectRate(capability.Cpk)}
              valueStyle={{ fontSize: '18px' }}
              suffix={<Text type="secondary" style={{ fontSize: '12px' }}>Estimated</Text>}
            />
          </Card>
        </Col>
      </Row>

      {/* Process Histogram */}
      <Title level={5}>Process Histogram with Specification Limits</Title>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={histogramData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="midpoint"
            label={{ value: parameterName, position: 'insideBottom', offset: -10 }}
            tickFormatter={(value) => value.toFixed(2)}
          />
          <YAxis label={{ value: 'Frequency', angle: -90, position: 'insideLeft' }} />
          <Tooltip />

          {/* Normal curve overlay (simplified) */}
          <Area
            type="monotone"
            dataKey="count"
            fill="#1890ff"
            fillOpacity={0.3}
            stroke="#1890ff"
            strokeWidth={0}
          />

          {/* Histogram bars */}
          <Bar dataKey="count" fill="#1890ff" />

          {/* Specification limits */}
          <ReferenceLine
            x={specLimits.USL}
            stroke="#722ed1"
            strokeWidth={3}
            strokeDasharray="8 4"
            label={{ value: 'USL', position: 'top', fill: '#722ed1', fontSize: 14 }}
          />
          <ReferenceLine
            x={specLimits.LSL}
            stroke="#722ed1"
            strokeWidth={3}
            strokeDasharray="8 4"
            label={{ value: 'LSL', position: 'top', fill: '#722ed1', fontSize: 14 }}
          />
          {specLimits.target && (
            <ReferenceLine
              x={specLimits.target}
              stroke="#13c2c2"
              strokeWidth={2}
              strokeDasharray="4 4"
              label={{ value: 'Target', position: 'top', fill: '#13c2c2', fontSize: 14 }}
            />
          )}

          {/* Process mean */}
          <ReferenceLine
            x={processStats.mean}
            stroke="#52c41a"
            strokeWidth={2}
            label={{ value: 'Mean', position: 'top', fill: '#52c41a', fontSize: 14 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Process Statistics */}
      <Title level={5} style={{ marginTop: '24px' }}>Process Statistics</Title>
      <Descriptions bordered column={4} size="small">
        <Descriptions.Item label="Mean">{processStats.mean.toFixed(4)}</Descriptions.Item>
        <Descriptions.Item label="Std Dev (σ)">{processStats.stdDev.toFixed(4)}</Descriptions.Item>
        <Descriptions.Item label="Sample Size">{processStats.sampleSize}</Descriptions.Item>
        <Descriptions.Item label="Range">{processStats.range.toFixed(4)}</Descriptions.Item>
        <Descriptions.Item label="Minimum">{processStats.min.toFixed(4)}</Descriptions.Item>
        <Descriptions.Item label="Maximum">{processStats.max.toFixed(4)}</Descriptions.Item>
        <Descriptions.Item label="USL">{specLimits.USL.toFixed(4)}</Descriptions.Item>
        <Descriptions.Item label="LSL">{specLimits.LSL.toFixed(4)}</Descriptions.Item>
      </Descriptions>

      {/* Interpretation */}
      <Title level={5} style={{ marginTop: '24px' }}>Capability Interpretation</Title>
      <Card style={{ background: '#f0f2f5' }}>
        <Paragraph>
          <Text strong>Overall Assessment: </Text>
          <Tag color={assessment.color} icon={assessment.icon}>
            {assessment.level}
          </Tag>
          <Text>({assessment.description})</Text>
        </Paragraph>

        <Paragraph>
          <Text strong>Cp (Process Potential): </Text>
          {capability.Cp.toFixed(3)} - Measures process spread without considering centering.
          {capability.Cp >= 1.33 ? ' Process variation is acceptable.' : ' Process variation is too large.'}
        </Paragraph>

        <Paragraph>
          <Text strong>Cpk (Process Capability): </Text>
          {capability.Cpk.toFixed(3)} - Measures actual capability accounting for process centering.
          {capability.Cpk >= 1.33 ? ' Process is capable.' : ' Process improvement needed.'}
        </Paragraph>

        <Paragraph>
          <Text strong>Centering: </Text>
          {Math.abs(processStats.mean - (specLimits.USL + specLimits.LSL) / 2) <
          ((specLimits.USL - specLimits.LSL) / 6) ? (
            <Text type="success">Process is well-centered between specification limits.</Text>
          ) : (
            <Text type="warning">Process mean is off-center. Consider process adjustment.</Text>
          )}
        </Paragraph>

        {capability.Cpk < capability.Cp && (
          <Alert
            message="Centering Opportunity"
            description={`Cp (${capability.Cp.toFixed(3)}) is significantly higher than Cpk (${capability.Cpk.toFixed(3)}), indicating the process could benefit from better centering.`}
            type="info"
            showIcon
            style={{ marginTop: '12px' }}
          />
        )}
      </Card>

      {/* Capability Guidelines */}
      <Title level={5} style={{ marginTop: '24px' }}>Capability Index Guidelines</Title>
      <Descriptions bordered column={1} size="small">
        <Descriptions.Item label="Cpk ≥ 2.0">
          <Tag color="green">Excellent (6 Sigma)</Tag> - World-class process
        </Descriptions.Item>
        <Descriptions.Item label="Cpk ≥ 1.67">
          <Tag color="green">Capable (5 Sigma)</Tag> - Very good process
        </Descriptions.Item>
        <Descriptions.Item label="Cpk ≥ 1.33">
          <Tag color="blue">Adequate (4 Sigma)</Tag> - Acceptable process
        </Descriptions.Item>
        <Descriptions.Item label="Cpk ≥ 1.0">
          <Tag color="orange">Marginal (3 Sigma)</Tag> - Improvement recommended
        </Descriptions.Item>
        <Descriptions.Item label="Cpk < 1.0">
          <Tag color="red">Inadequate</Tag> - Process not capable, immediate action required
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
};

export default CapabilityReport;
