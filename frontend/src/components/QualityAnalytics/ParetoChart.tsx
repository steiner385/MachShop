/**
 * Pareto Analysis Chart Component
 * Displays Pareto (80/20) analysis visualization
 */

import React from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, Row, Col, Statistic, Space, Table } from 'antd';
import type { ParetoAnalysis } from '../../services/qualityAnalyticsService';

interface ParetoChartProps {
  data: ParetoAnalysis;
}

const ParetoChart: React.FC<ParetoChartProps> = ({ data }) => {
  // Prepare chart data with cumulative percentage
  const chartData = data.items.map(item => ({
    category: item.category,
    count: item.count,
    percentage: Number(item.percentage.toFixed(2)),
    cumulativePercentage: Number(item.cumulativePercentage.toFixed(2)),
  }));

  // Color gradient for bars
  const colors = [
    '#ff7a45',
    '#ff9c6e',
    '#ffa94d',
    '#ffc069',
    '#ffd591',
    '#ffe7ba',
    '#fff1b6',
  ];

  const analysisTypeLabel: { [key: string]: string } = {
    DEFECT_TYPE: 'By Defect Type',
    ROOT_CAUSE: 'By Root Cause',
    PRODUCT: 'By Product',
    SUPPLIER: 'By Supplier',
    WORK_CENTER: 'By Work Center',
    OPERATION: 'By Operation',
    CUSTOMER: 'By Customer',
    SEVERITY: 'By Severity',
    DISPOSITION: 'By Disposition',
    DETECTION_POINT: 'By Detection Point',
  };

  const columns = [
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: '40%',
    },
    {
      title: 'Count',
      dataIndex: 'count',
      key: 'count',
      width: '20%',
      sorter: (a: any, b: any) => b.count - a.count,
    },
    {
      title: 'Percentage',
      dataIndex: 'percentage',
      key: 'percentage',
      width: '20%',
      render: (percentage: number) => `${percentage.toFixed(1)}%`,
    },
    {
      title: 'Cumulative %',
      dataIndex: 'cumulativePercentage',
      key: 'cumulativePercentage',
      width: '20%',
      render: (cumulative: number) => `${cumulative.toFixed(1)}%`,
    },
  ];

  return (
    <Card
      title={`Pareto Analysis ${analysisTypeLabel[data.analysisType] || data.analysisType}`}
      style={{ marginBottom: '16px' }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Summary Stats */}
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <Statistic
              title="Total Items"
              value={data.totalItems}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="Vital Few"
              value={data.vitalFewCount}
              suffix={`/ ${data.totalItems}`}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="Total Count"
              value={data.totalOccurrences}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="Total Cost"
              value={`$${(data.totalCost || 0).toLocaleString()}`}
              precision={0}
            />
          </Col>
        </Row>

        {/* Chart */}
        {chartData.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="category"
                  angle={chartData.length > 5 ? -45 : 0}
                  textAnchor={chartData.length > 5 ? 'end' : 'middle'}
                  height={chartData.length > 5 ? 100 : 40}
                />
                <YAxis yAxisId="left" label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  label={{ value: 'Cumulative %', angle: 90, position: 'insideRight' }}
                  domain={[0, 100]}
                />
                <Tooltip
                  formatter={(value: any) =>
                    typeof value === 'number' ? value.toFixed(2) : value
                  }
                />
                <Legend />
                <Bar yAxisId="left" dataKey="count" name="Count" fill="#8884d8" radius={[8, 8, 0, 0]}>
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cumulativePercentage"
                  name="Cumulative %"
                  stroke="#ff7a45"
                  strokeWidth={2}
                  dot={{ fill: '#ff7a45', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Data Table */}
        <div style={{ marginTop: '24px' }}>
          <h4>Detailed Data</h4>
          <Table
            columns={columns}
            dataSource={chartData.map((item, index) => ({ ...item, key: index }))}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 600 }}
            size="small"
          />
        </div>

        {/* Insights */}
        <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
          <h4>Insights</h4>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li>
              The top {data.vitalFewCount} item(s) represent approximately 80% of occurrences
            </li>
            <li>
              Total occurrences: {data.totalOccurrences}
            </li>
            <li>
              Focus improvement efforts on the {data.vitalFewCount} vital few items for maximum impact
            </li>
          </ul>
        </div>
      </Space>
    </Card>
  );
};

export default ParetoChart;
