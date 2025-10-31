/**
 * Kit Cost Analysis Component
 *
 * Comprehensive cost analysis and tracking for kit management
 * including cost breakdowns, trends, and optimization opportunities
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Select,
  DatePicker,
  Button,
  Space,
  Typography,
  Tag,
  Progress,
  Tooltip,
  Alert,
  Tabs,
  InputNumber,
  Switch,
  Divider,
  List,
  Avatar
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DollarOutlined,
  TrendingUpOutlined,
  TrendingDownOutlined,
  PieChartOutlined,
  BarChartOutlined,
  LineChartOutlined,
  CalculatorOutlined,
  ExportOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  RiseOutlined,
  FallOutlined
} from '@ant-design/icons';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  TreeMap
} from 'recharts';
import dayjs from 'dayjs';
import { useKitStore } from '../../store/kitStore';
import {
  KitStatus,
  KitPriority,
  AssemblyStage,
  KitPriorityLabels
} from '../../types/kits';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

// Cost analysis data interfaces
interface CostBreakdown {
  category: string;
  amount: number;
  percentage: number;
  trend: number; // percentage change from previous period
  color: string;
}

interface CostTrend {
  date: string;
  totalCost: number;
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  efficiency: number;
}

interface CostComparison {
  metric: string;
  current: number;
  previous: number;
  change: number;
  changeType: 'increase' | 'decrease';
  unit: string;
}

interface CostOptimization {
  id: string;
  title: string;
  description: string;
  category: 'material' | 'labor' | 'overhead' | 'process';
  currentCost: number;
  potentialSaving: number;
  savingPercentage: number;
  complexity: 'low' | 'medium' | 'high';
  timeframe: string;
  priority: 'high' | 'medium' | 'low';
}

interface KitCostDetail {
  kitNumber: string;
  workOrderNumber: string;
  priority: KitPriority;
  status: KitStatus;
  totalCost: number;
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  actualHours: number;
  budgetedCost: number;
  variance: number;
  costPerHour: number;
  completionDate?: string;
}

interface CostBenchmark {
  metric: string;
  current: number;
  target: number;
  industry: number;
  variance: number;
  status: 'above' | 'on-target' | 'below';
}

const CHART_COLORS = ['#1890ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#fa8c16'];

export const KitCostAnalysis: React.FC = () => {
  // Store state
  const { loading } = useKitStore();

  // Local state
  const [timeRange, setTimeRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'days'),
    dayjs()
  ]);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [costView, setCostView] = useState<'summary' | 'detailed' | 'trends' | 'optimization'>('summary');
  const [comparisonEnabled, setComparisonEnabled] = useState(false);
  const [targetCost, setTargetCost] = useState(10000);

  // Mock data
  const [costData, setCostData] = useState({
    summary: {
      totalCost: 1850000,
      averageCostPerKit: 11859,
      budgetVariance: -2.3,
      costEfficiency: 87.5,
      targetAchievement: 94.2
    },
    breakdown: [
      { category: 'Materials', amount: 1295000, percentage: 70, trend: -1.2, color: '#1890ff' },
      { category: 'Labor', amount: 370000, percentage: 20, trend: 2.8, color: '#52c41a' },
      { category: 'Overhead', amount: 185000, percentage: 10, trend: 0.5, color: '#faad14' }
    ] as CostBreakdown[],
    trends: [
      {
        date: '2024-09-01',
        totalCost: 1650000,
        materialCost: 1155000,
        laborCost: 330000,
        overheadCost: 165000,
        efficiency: 85.2
      },
      {
        date: '2024-09-08',
        totalCost: 1720000,
        materialCost: 1204000,
        laborCost: 344000,
        overheadCost: 172000,
        efficiency: 86.1
      },
      {
        date: '2024-09-15',
        totalCost: 1680000,
        materialCost: 1176000,
        laborCost: 336000,
        overheadCost: 168000,
        efficiency: 88.3
      },
      {
        date: '2024-09-22',
        totalCost: 1790000,
        materialCost: 1253000,
        laborCost: 358000,
        overheadCost: 179000,
        efficiency: 86.8
      },
      {
        date: '2024-09-29',
        totalCost: 1850000,
        materialCost: 1295000,
        laborCost: 370000,
        overheadCost: 185000,
        efficiency: 87.5
      }
    ] as CostTrend[],
    comparisons: [
      {
        metric: 'Cost per Kit',
        current: 11859,
        previous: 12100,
        change: -2.0,
        changeType: 'decrease' as const,
        unit: '$'
      },
      {
        metric: 'Material Cost %',
        current: 70,
        previous: 72,
        change: -2.8,
        changeType: 'decrease' as const,
        unit: '%'
      },
      {
        metric: 'Labor Hours per Kit',
        current: 4.2,
        previous: 4.8,
        change: -12.5,
        changeType: 'decrease' as const,
        unit: 'hrs'
      },
      {
        metric: 'Overhead Ratio',
        current: 10,
        previous: 11,
        change: -9.1,
        changeType: 'decrease' as const,
        unit: '%'
      }
    ] as CostComparison[],
    optimizations: [
      {
        id: '1',
        title: 'Consolidate Low-Volume Parts',
        description: 'Combine low-volume parts into shared kits to reduce procurement and handling costs',
        category: 'material' as const,
        currentCost: 125000,
        potentialSaving: 18750,
        savingPercentage: 15,
        complexity: 'medium' as const,
        timeframe: '3-6 months',
        priority: 'high' as const
      },
      {
        id: '2',
        title: 'Automate Staging Process',
        description: 'Implement automated staging to reduce labor hours and improve efficiency',
        category: 'labor' as const,
        currentCost: 89000,
        potentialSaving: 22250,
        savingPercentage: 25,
        complexity: 'high' as const,
        timeframe: '6-12 months',
        priority: 'medium' as const
      },
      {
        id: '3',
        title: 'Optimize Kit Sizes',
        description: 'Right-size kits to minimize waste and reduce overhead allocation',
        category: 'overhead' as const,
        currentCost: 45000,
        potentialSaving: 6750,
        savingPercentage: 15,
        complexity: 'low' as const,
        timeframe: '1-3 months',
        priority: 'high' as const
      }
    ] as CostOptimization[],
    benchmarks: [
      {
        metric: 'Cost per Kit',
        current: 11859,
        target: 10500,
        industry: 12800,
        variance: 12.9,
        status: 'above' as const
      },
      {
        metric: 'Material Cost %',
        current: 70,
        target: 68,
        industry: 72,
        variance: 2.9,
        status: 'above' as const
      },
      {
        metric: 'Labor Efficiency',
        current: 87.5,
        target: 90,
        industry: 82,
        variance: -2.8,
        status: 'below' as const
      }
    ] as CostBenchmark[]
  });

  // Load cost data
  useEffect(() => {
    loadCostData();
  }, [timeRange]);

  const loadCostData = async () => {
    // TODO: Load actual data from API
    console.log('Loading cost data for range:', timeRange);
  };

  // Kit cost details table columns
  const kitCostColumns: ColumnsType<KitCostDetail> = [
    {
      title: 'Kit Number',
      dataIndex: 'kitNumber',
      key: 'kitNumber',
      sorter: true,
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: 'Work Order',
      dataIndex: 'workOrderNumber',
      key: 'workOrderNumber'
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: KitPriority) => (
        <Tag color={priority === 'URGENT' ? 'red' : priority === 'HIGH' ? 'orange' : 'blue'}>
          {KitPriorityLabels[priority]}
        </Tag>
      )
    },
    {
      title: 'Total Cost',
      dataIndex: 'totalCost',
      key: 'totalCost',
      sorter: true,
      render: (cost: number) => `$${cost.toLocaleString()}`,
      align: 'right'
    },
    {
      title: 'Material',
      dataIndex: 'materialCost',
      key: 'materialCost',
      render: (cost: number) => `$${cost.toLocaleString()}`,
      align: 'right'
    },
    {
      title: 'Labor',
      dataIndex: 'laborCost',
      key: 'laborCost',
      render: (cost: number) => `$${cost.toLocaleString()}`,
      align: 'right'
    },
    {
      title: 'Budget Variance',
      dataIndex: 'variance',
      key: 'variance',
      render: (variance: number) => (
        <Text type={variance > 0 ? 'danger' : 'success'}>
          {variance > 0 ? '+' : ''}{variance.toFixed(1)}%
        </Text>
      ),
      align: 'center'
    },
    {
      title: 'Cost/Hour',
      dataIndex: 'costPerHour',
      key: 'costPerHour',
      render: (cost: number) => `$${cost.toFixed(0)}`,
      align: 'right'
    }
  ];

  // Mock kit detail data
  const kitDetails: KitCostDetail[] = [
    {
      kitNumber: 'KIT-WO-12345-01',
      workOrderNumber: 'WO-12345',
      priority: KitPriority.HIGH,
      status: KitStatus.CONSUMED,
      totalCost: 15250,
      materialCost: 10675,
      laborCost: 3050,
      overheadCost: 1525,
      actualHours: 4.2,
      budgetedCost: 14800,
      variance: 3.0,
      costPerHour: 3631,
      completionDate: '2024-10-28'
    },
    {
      kitNumber: 'KIT-WO-12346-01',
      workOrderNumber: 'WO-12346',
      priority: KitPriority.NORMAL,
      status: KitStatus.CONSUMED,
      totalCost: 9850,
      materialCost: 6895,
      laborCost: 1970,
      overheadCost: 985,
      actualHours: 3.8,
      budgetedCost: 10200,
      variance: -3.4,
      costPerHour: 2592,
      completionDate: '2024-10-27'
    }
  ];

  // Optimization table columns
  const optimizationColumns: ColumnsType<CostOptimization> = [
    {
      title: 'Opportunity',
      key: 'opportunity',
      render: (_, record) => (
        <div>
          <Text strong>{record.title}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.description}
          </Text>
        </div>
      )
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => (
        <Tag color={
          category === 'material' ? 'blue' :
          category === 'labor' ? 'green' :
          category === 'overhead' ? 'orange' : 'purple'
        }>
          {category.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Current Cost',
      dataIndex: 'currentCost',
      key: 'currentCost',
      render: (cost: number) => `$${cost.toLocaleString()}`,
      align: 'right'
    },
    {
      title: 'Potential Saving',
      key: 'saving',
      render: (_, record) => (
        <div style={{ textAlign: 'right' }}>
          <Text strong style={{ color: '#52c41a' }}>
            ${record.potentialSaving.toLocaleString()}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            ({record.savingPercentage}%)
          </Text>
        </div>
      ),
      align: 'right'
    },
    {
      title: 'Complexity',
      dataIndex: 'complexity',
      key: 'complexity',
      render: (complexity: string) => (
        <Tag color={complexity === 'high' ? 'red' : complexity === 'medium' ? 'orange' : 'green'}>
          {complexity.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Timeframe',
      dataIndex: 'timeframe',
      key: 'timeframe'
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string) => (
        <Tag color={priority === 'high' ? 'red' : priority === 'medium' ? 'orange' : 'green'}>
          {priority.toUpperCase()}
        </Tag>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>
            Kit Cost Analysis
          </Title>
          <Text type="secondary">
            Comprehensive cost tracking, analysis, and optimization insights
          </Text>
        </Col>
        <Col>
          <Space>
            <RangePicker
              value={timeRange}
              onChange={(dates) => dates && setTimeRange(dates)}
            />
            <Select value={selectedCurrency} onChange={setSelectedCurrency} style={{ width: 80 }}>
              <Option value="USD">USD</Option>
              <Option value="EUR">EUR</Option>
            </Select>
            <Switch
              checkedChildren="Compare"
              unCheckedChildren="Single"
              checked={comparisonEnabled}
              onChange={setComparisonEnabled}
            />
            <Button icon={<ExportOutlined />}>Export</Button>
          </Space>
        </Col>
      </Row>

      {/* Summary Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Total Cost"
              value={costData.summary.totalCost}
              prefix="$"
              formatter={(value) => value ? value.toLocaleString() : '0'}
              valueStyle={{ color: '#1890ff' }}
            />
            <div style={{ marginTop: 8 }}>
              {costData.summary.budgetVariance < 0 ? (
                <Text type="success">
                  <FallOutlined /> {Math.abs(costData.summary.budgetVariance)}% under budget
                </Text>
              ) : (
                <Text type="danger">
                  <RiseOutlined /> {costData.summary.budgetVariance}% over budget
                </Text>
              )}
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Avg Cost per Kit"
              value={costData.summary.averageCostPerKit}
              prefix="$"
              formatter={(value) => value ? value.toLocaleString() : '0'}
              valueStyle={{ color: '#52c41a' }}
            />
            <div style={{ marginTop: 8 }}>
              <Progress
                percent={85}
                size="small"
                strokeColor="#52c41a"
                showInfo={false}
              />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Target: ${targetCost.toLocaleString()}
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Cost Efficiency"
              value={costData.summary.costEfficiency}
              suffix="%"
              precision={1}
              valueStyle={{ color: '#faad14' }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Industry avg: 82%
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Target Achievement"
              value={costData.summary.targetAchievement}
              suffix="%"
              precision={1}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Comparison Period Alert */}
      {comparisonEnabled && (
        <Alert
          message="Comparison Mode Active"
          description="Comparing current period with previous 30 days. All metrics show period-over-period changes."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Main Content Tabs */}
      <Tabs defaultActiveKey="overview" type="card">
        <TabPane tab="Cost Overview" key="overview">
          <Row gutter={16}>
            {/* Cost Breakdown */}
            <Col span={12}>
              <Card title="Cost Breakdown" style={{ marginBottom: 16 }}>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={costData.breakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ category, percentage }) => `${category} (${percentage}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="amount"
                    >
                      {costData.breakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Amount']} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Col>

            {/* Cost Trends */}
            <Col span={12}>
              <Card title="Cost Trends" style={{ marginBottom: 16 }}>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={costData.trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Cost']} />
                    <Area type="monotone" dataKey="totalCost" stroke="#1890ff" fill="#1890ff" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>

          {/* Period Comparisons */}
          <Card title="Period Comparisons" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              {costData.comparisons.map((comp, index) => (
                <Col span={6} key={index}>
                  <Card size="small" bordered={false} style={{ background: '#fafafa' }}>
                    <Statistic
                      title={comp.metric}
                      value={comp.current}
                      suffix={comp.unit}
                      valueStyle={{
                        color: comp.changeType === 'decrease' && comp.metric.includes('Cost') ? '#52c41a' : '#1890ff'
                      }}
                    />
                    <div style={{ marginTop: 8 }}>
                      {comp.changeType === 'decrease' ? (
                        <Text type="success">
                          <FallOutlined /> {Math.abs(comp.change)}% decrease
                        </Text>
                      ) : (
                        <Text type="danger">
                          <RiseOutlined /> {comp.change}% increase
                        </Text>
                      )}
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>

          {/* Detailed Cost Breakdown */}
          <Card title="Cost Category Details">
            <Row gutter={16}>
              {costData.breakdown.map((category, index) => (
                <Col span={8} key={index}>
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <Avatar
                      size={64}
                      style={{ backgroundColor: category.color }}
                      icon={<DollarOutlined />}
                    />
                    <div style={{ marginTop: 8 }}>
                      <Text strong>{category.category}</Text>
                      <br />
                      <Text style={{ fontSize: '18px' }}>
                        ${category.amount.toLocaleString()}
                      </Text>
                      <br />
                      <Text type="secondary">
                        {category.percentage}% of total
                      </Text>
                      <br />
                      <Text type={category.trend < 0 ? 'success' : 'danger'} style={{ fontSize: '12px' }}>
                        {category.trend < 0 ? <FallOutlined /> : <RiseOutlined />}
                        {Math.abs(category.trend)}% vs last period
                      </Text>
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        </TabPane>

        <TabPane tab="Kit Details" key="details">
          <Card title="Kit Cost Details">
            <Table
              columns={kitCostColumns}
              dataSource={kitDetails.map((kit, index) => ({ ...kit, key: index }))}
              pagination={{ pageSize: 10, showSizeChanger: true }}
              size="small"
              scroll={{ x: 1000 }}
            />
          </Card>
        </TabPane>

        <TabPane tab="Cost Optimization" key="optimization">
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Card>
                <Statistic
                  title="Total Potential Savings"
                  value={costData.optimizations.reduce((sum, opt) => sum + opt.potentialSaving, 0)}
                  prefix="$"
                  formatter={(value) => value ? value.toLocaleString() : '0'}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic
                  title="High Priority Items"
                  value={costData.optimizations.filter(opt => opt.priority === 'high').length}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic
                  title="Quick Wins"
                  value={costData.optimizations.filter(opt => opt.complexity === 'low').length}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
          </Row>

          <Card title="Cost Optimization Opportunities">
            <Table
              columns={optimizationColumns}
              dataSource={costData.optimizations.map((opt, index) => ({ ...opt, key: index }))}
              pagination={false}
              size="small"
            />
          </Card>
        </TabPane>

        <TabPane tab="Benchmarks" key="benchmarks">
          <Card title="Cost Benchmarks">
            <Row gutter={16}>
              {costData.benchmarks.map((benchmark, index) => (
                <Col span={8} key={index} style={{ marginBottom: 16 }}>
                  <Card size="small">
                    <Title level={5}>{benchmark.metric}</Title>
                    <Row gutter={8}>
                      <Col span={8}>
                        <Statistic
                          title="Current"
                          value={benchmark.current}
                          valueStyle={{
                            color: benchmark.status === 'on-target' ? '#52c41a' :
                                   benchmark.status === 'above' ? '#ff4d4f' : '#faad14'
                          }}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic
                          title="Target"
                          value={benchmark.target}
                          valueStyle={{ color: '#1890ff' }}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic
                          title="Industry"
                          value={benchmark.industry}
                          valueStyle={{ color: '#722ed1' }}
                        />
                      </Col>
                    </Row>
                    <div style={{ marginTop: 8 }}>
                      <Progress
                        percent={Math.abs(benchmark.variance)}
                        strokeColor={
                          benchmark.status === 'on-target' ? '#52c41a' :
                          benchmark.status === 'above' ? '#ff4d4f' : '#faad14'
                        }
                        size="small"
                      />
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {benchmark.variance > 0 ? '+' : ''}{benchmark.variance}% variance
                      </Text>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default KitCostAnalysis;