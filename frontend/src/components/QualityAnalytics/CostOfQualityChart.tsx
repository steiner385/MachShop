/**
 * Cost of Quality (CoQ) Chart Component
 * Displays PAF model costs (Prevention, Appraisal, Failure)
 */

import React from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, Row, Col, Statistic, Space, Progress, Tabs, Alert } from 'antd';
import { DollarOutlined, WarningOutlined } from '@ant-design/icons';
import type { CostOfQuality } from '../../services/qualityAnalyticsService';

interface CostOfQualityChartProps {
  data: CostOfQuality;
}

const CostOfQualityChart: React.FC<CostOfQualityChartProps> = ({ data }) => {
  // PAF Model data for pie chart
  const pafData = [
    {
      name: 'Prevention',
      value: Number(data.preventionCost.toFixed(0)),
      color: '#52c41a',
      percentage: ((data.preventionCost / data.totalCoq) * 100).toFixed(1),
    },
    {
      name: 'Appraisal',
      value: Number(data.appraisalCost.toFixed(0)),
      color: '#1890ff',
      percentage: ((data.appraisalCost / data.totalCoq) * 100).toFixed(1),
    },
    {
      name: 'Internal Failure',
      value: Number(data.internalFailureCost.toFixed(0)),
      color: '#faad14',
      percentage: ((data.internalFailureCost / data.totalCoq) * 100).toFixed(1),
    },
    {
      name: 'External Failure',
      value: Number(data.externalFailureCost.toFixed(0)),
      color: '#ff4d4f',
      percentage: ((data.externalFailureCost / data.totalCoq) * 100).toFixed(1),
    },
  ];

  // Bar chart data
  const barData = [
    {
      category: 'Prevention',
      amount: data.preventionCost,
      fill: '#52c41a',
    },
    {
      category: 'Appraisal',
      amount: data.appraisalCost,
      fill: '#1890ff',
    },
    {
      category: 'Internal Failure',
      amount: data.internalFailureCost,
      fill: '#faad14',
    },
    {
      category: 'External Failure',
      amount: data.externalFailureCost,
      fill: '#ff4d4f',
    },
  ];

  const failureCosts = data.internalFailureCost + data.externalFailureCost;
  const failurePercentage = ((failureCosts / data.totalCoq) * 100).toFixed(1);

  return (
    <Card title="Cost of Quality (PAF Model)">
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Summary Statistics */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Statistic
              title="Total CoQ"
              value={data.totalCoq}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Statistic
              title="Prevention Cost"
              value={data.preventionCost}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Statistic
              title="Failure Costs"
              value={failureCosts}
              prefix={<DollarOutlined />}
              suffix={`(${failurePercentage}%)`}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Statistic
              title="CoQ % of Revenue"
              value={data.copqPercent}
              suffix="%"
              valueStyle={{ color: data.copqPercent > 5 ? '#ff4d4f' : '#52c41a' }}
            />
          </Col>
        </Row>

        {/* Alert for high failure costs */}
        {Number(failurePercentage) > 40 && (
          <Alert
            message="High Failure Costs"
            description={`Failure costs (${failurePercentage}%) exceed 40% of total CoQ. Focus improvement efforts on defect reduction.`}
            type="warning"
            icon={<WarningOutlined />}
            showIcon
          />
        )}

        {/* Charts Tabs */}
        <Tabs
          defaultActiveKey="1"
          items={[
            {
              key: '1',
              label: 'Distribution (Pie Chart)',
              children: (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={pafData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percentage }) => `${name}: ${percentage}%`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pafData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => `$${value.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ),
            },
            {
              key: '2',
              label: 'Comparison (Bar Chart)',
              children: (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis label={{ value: 'Amount ($)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value: any) => `$${value.toLocaleString()}`} />
                    <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                      {barData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ),
            },
            {
              key: '3',
              label: 'PAF Summary',
              children: (
                <div style={{ padding: '24px 0' }}>
                  {pafData.map(item => (
                    <div key={item.name} style={{ marginBottom: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 500 }}>{item.name}</span>
                        <span style={{ color: item.color, fontWeight: 'bold' }}>
                          ${item.value.toLocaleString()} ({item.percentage}%)
                        </span>
                      </div>
                      <Progress
                        percent={Number(item.percentage)}
                        strokeColor={item.color}
                        status={Number(item.percentage) > 25 ? 'exception' : 'normal'}
                      />
                    </div>
                  ))}
                </div>
              ),
            },
          ]}
        />

        {/* Recommendations */}
        <div style={{ padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
          <h4>Quality Improvement Recommendations</h4>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {Number(failurePercentage) > 40 && (
              <li>Reduce defects to lower internal and external failure costs</li>
            )}
            {data.preventionCost < data.appraisalCost && (
              <li>Increase prevention investments to reduce appraisal and failure costs</li>
            )}
            <li>Target a CoQ of 2-3% of revenue for mature quality systems</li>
            <li>Focus on root cause analysis to prevent defects at source</li>
          </ul>
        </div>
      </Space>
    </Card>
  );
};

export default CostOfQualityChart;
