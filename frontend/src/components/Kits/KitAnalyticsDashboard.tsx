/**
 * Kit Analytics Dashboard Component
 *
 * Comprehensive analytics and reporting dashboard for kit management
 * including performance metrics, cost analysis, and optimization insights
 */

import React, { useEffect, useState } from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Table,
  Select,
  DatePicker,
  Button,
  Space,
  Typography,
  Progress,
  Tag,
  Tooltip,
  Alert,
  Divider,
  Tabs,
  Switch
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  TrendingUpOutlined,
  TrendingDownOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ExportOutlined,
  ReloadOutlined,
  FilterOutlined
} from '@ant-design/icons';
import {
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
  AreaChart,
  Area
} from 'recharts';
import { AccessibleChartWrapper, useChartAccessibility, generateChartDescription } from '../common/ChartAccessibility';
import { ResponsiveChartContainer, ChartContainerPresets } from '../common/ResponsiveChartContainer';
import dayjs from 'dayjs';
import { useKitStore } from '../../store/kitStore';
import {
  KitStatus,
  KitPriority,
  AssemblyStage,
  KitStatusColors,
  KitStatusLabels,
  KitPriorityLabels
} from '../../types/kits';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

// Colors for charts
const CHART_COLORS = ['#1890ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#fa8c16', '#13c2c2', '#eb2f96'];

interface AnalyticsData {
  overview: {
    totalKits: number;
    completedKits: number;
    activeKits: number;
    overdueKits: number;
    averageLeadTime: number;
    completionRate: number;
    onTimeDelivery: number;
    costEfficiency: number;
  };
  trends: Array<{
    date: string;
    kitsGenerated: number;
    kitsCompleted: number;
    averageLeadTime: number;
    onTimeRate: number;
    totalCost: number;
  }>;
  statusDistribution: Array<{
    status: string;
    count: number;
    percentage: number;
    color: string;
  }>;
  priorityAnalysis: Array<{
    priority: string;
    count: number;
    averageLeadTime: number;
    completionRate: number;
    color: string;
  }>;
  stagePerformance: Array<{
    stage: string;
    averageTime: number;
    efficiency: number;
    bottleneck: boolean;
  }>;
  costAnalysis: {
    totalCost: number;
    averageCostPerKit: number;
    costByStage: Array<{
      stage: string;
      cost: number;
      percentage: number;
    }>;
    costTrends: Array<{
      month: string;
      totalCost: number;
      averageCost: number;
      efficiency: number;
    }>;
  };
  shortageAnalysis: {
    totalShortages: number;
    criticalShortages: number;
    shortagesByPart: Array<{
      partNumber: string;
      partName: string;
      shortageFrequency: number;
      impactScore: number;
      recommendedAction: string;
    }>;
    shortagesTrend: Array<{
      date: string;
      shortageCount: number;
      resolutionTime: number;
    }>;
  };
  topPerformers: Array<{
    kitNumber: string;
    completionTime: number;
    efficiency: number;
    qualityScore: number;
    cost: number;
  }>;
  recommendations: Array<{
    type: 'performance' | 'cost' | 'quality' | 'capacity';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    effort: 'high' | 'medium' | 'low';
    estimatedSavings?: number;
  }>;
}

interface KitAnalyticsDashboardProps {
  timeRange?: [dayjs.Dayjs, dayjs.Dayjs];
  filters?: {
    area?: string;
    priority?: KitPriority[];
    status?: KitStatus[];
    assemblyStage?: AssemblyStage[];
  };
}

export const KitAnalyticsDashboard: React.FC<KitAnalyticsDashboardProps> = ({
  timeRange,
  filters
}) => {
  // Store state
  const { kitMetrics, loading, fetchKitMetrics } = useKitStore();

  // Local state
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'days'),
    dayjs()
  ]);
  const [activeFilters, setActiveFilters] = useState({
    area: 'all',
    priority: [] as KitPriority[],
    status: [] as KitStatus[],
    assemblyStage: [] as AssemblyStage[]
  });
  const [compareMode, setCompareMode] = useState(false);
  const [comparisonPeriod, setComparisonPeriod] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(60, 'days'),
    dayjs().subtract(30, 'days')
  ]);

  // Load analytics data
  const loadAnalyticsData = async () => {
    setLoadingAnalytics(true);
    try {
      // TODO: Replace with actual API call
      // const data = await kitsApiClient.getKitAnalytics({
      //   startDate: selectedTimeRange[0].toISOString(),
      //   endDate: selectedTimeRange[1].toISOString(),
      //   filters: activeFilters
      // });

      // Mock analytics data
      const mockData: AnalyticsData = {
        overview: {
          totalKits: 156,
          completedKits: 142,
          activeKits: 14,
          overdueKits: 3,
          averageLeadTime: 4.2,
          completionRate: 91.0,
          onTimeDelivery: 94.2,
          costEfficiency: 87.5
        },
        trends: [
          { date: '2024-10-01', kitsGenerated: 12, kitsCompleted: 10, averageLeadTime: 4.5, onTimeRate: 92, totalCost: 45000 },
          { date: '2024-10-02', kitsGenerated: 8, kitsCompleted: 11, averageLeadTime: 4.1, onTimeRate: 95, totalCost: 38000 },
          { date: '2024-10-03', kitsGenerated: 15, kitsCompleted: 13, averageLeadTime: 4.8, onTimeRate: 89, totalCost: 52000 },
          { date: '2024-10-04', kitsGenerated: 10, kitsCompleted: 9, averageLeadTime: 3.9, onTimeRate: 96, totalCost: 41000 },
          { date: '2024-10-05', kitsGenerated: 13, kitsCompleted: 14, averageLeadTime: 4.2, onTimeRate: 93, totalCost: 48000 },
          { date: '2024-10-06', kitsGenerated: 9, kitsCompleted: 12, averageLeadTime: 4.0, onTimeRate: 94, totalCost: 43000 },
          { date: '2024-10-07', kitsGenerated: 16, kitsCompleted: 15, averageLeadTime: 4.6, onTimeRate: 91, totalCost: 55000 }
        ],
        statusDistribution: [
          { status: 'COMPLETED', count: 142, percentage: 91.0, color: KitStatusColors.CONSUMED },
          { status: 'STAGING', count: 8, percentage: 5.1, color: KitStatusColors.STAGING },
          { status: 'STAGED', count: 4, percentage: 2.6, color: KitStatusColors.STAGED },
          { status: 'PLANNED', count: 2, percentage: 1.3, color: KitStatusColors.PLANNED }
        ],
        priorityAnalysis: [
          { priority: 'URGENT', count: 12, averageLeadTime: 2.1, completionRate: 100, color: '#ff4d4f' },
          { priority: 'HIGH', count: 45, averageLeadTime: 3.2, completionRate: 95.6, color: '#fa8c16' },
          { priority: 'NORMAL', count: 89, averageLeadTime: 4.8, completionRate: 89.9, color: '#1890ff' },
          { priority: 'LOW', count: 10, averageLeadTime: 6.2, completionRate: 90.0, color: '#52c41a' }
        ],
        stagePerformance: [
          { stage: 'Planning', averageTime: 0.5, efficiency: 95, bottleneck: false },
          { stage: 'Generation', averageTime: 0.8, efficiency: 92, bottleneck: false },
          { stage: 'Staging', averageTime: 2.1, efficiency: 78, bottleneck: true },
          { stage: 'Issue', averageTime: 0.3, efficiency: 98, bottleneck: false },
          { stage: 'Consumption', averageTime: 0.5, efficiency: 94, bottleneck: false }
        ],
        costAnalysis: {
          totalCost: 1850000,
          averageCostPerKit: 11859,
          costByStage: [
            { stage: 'Materials', cost: 1295000, percentage: 70 },
            { stage: 'Labor', cost: 370000, percentage: 20 },
            { stage: 'Overhead', cost: 185000, percentage: 10 }
          ],
          costTrends: [
            { month: 'Jul', totalCost: 1650000, averageCost: 12100, efficiency: 85 },
            { month: 'Aug', totalCost: 1720000, averageCost: 11950, efficiency: 86 },
            { month: 'Sep', totalCost: 1680000, averageCost: 11650, efficiency: 88 },
            { month: 'Oct', totalCost: 1850000, averageCost: 11859, efficiency: 87.5 }
          ]
        },
        shortageAnalysis: {
          totalShortages: 23,
          criticalShortages: 5,
          shortagesByPart: [
            { partNumber: 'COMP-001', partName: 'Compressor Blade', shortageFrequency: 8, impactScore: 95, recommendedAction: 'Increase safety stock' },
            { partNumber: 'ENG-045', partName: 'Engine Bearing', shortageFrequency: 6, impactScore: 87, recommendedAction: 'Alternative supplier' },
            { partNumber: 'TUR-023', partName: 'Turbine Seal', shortageFrequency: 4, impactScore: 72, recommendedAction: 'Earlier procurement' }
          ],
          shortagesTrend: [
            { date: '2024-09-01', shortageCount: 15, resolutionTime: 48 },
            { date: '2024-09-08', shortageCount: 12, resolutionTime: 36 },
            { date: '2024-09-15', shortageCount: 18, resolutionTime: 42 },
            { date: '2024-09-22', shortageCount: 9, resolutionTime: 24 },
            { date: '2024-09-29', shortageCount: 23, resolutionTime: 38 }
          ]
        },
        topPerformers: [
          { kitNumber: 'KIT-WO-12301-01', completionTime: 2.1, efficiency: 98, qualityScore: 99.2, cost: 8950 },
          { kitNumber: 'KIT-WO-12285-01', completionTime: 2.4, efficiency: 97, qualityScore: 98.8, cost: 9200 },
          { kitNumber: 'KIT-WO-12267-01', completionTime: 2.6, efficiency: 96, qualityScore: 98.5, cost: 9450 }
        ],
        recommendations: [
          {
            type: 'performance',
            title: 'Optimize Staging Workflow',
            description: 'Staging process shows 22% longer completion times than target. Implement parallel processing.',
            impact: 'high',
            effort: 'medium',
            estimatedSavings: 125000
          },
          {
            type: 'cost',
            title: 'Consolidate Low-Volume Parts',
            description: 'Combine low-volume parts into shared kits to reduce handling costs.',
            impact: 'medium',
            effort: 'low',
            estimatedSavings: 45000
          },
          {
            type: 'quality',
            title: 'Implement Predictive Shortage Alerts',
            description: 'Use ML to predict shortages 2 weeks in advance, reducing emergency procurement.',
            impact: 'high',
            effort: 'high',
            estimatedSavings: 89000
          }
        ]
      };

      setAnalyticsData(mockData);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Load data on mount and when filters change
  useEffect(() => {
    loadAnalyticsData();
    fetchKitMetrics();
  }, [selectedTimeRange, activeFilters]);

  // Handle export functionality
  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    console.log(`Exporting analytics data as ${format}`);
    // TODO: Implement actual export functionality
  };

  // Overview metrics cards
  const renderOverviewCards = () => (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      <Col xs={12} sm={6}>
        <Card>
          <Statistic
            title="Total Kits"
            value={analyticsData?.overview.totalKits}
            prefix={<BarChartOutlined style={{ color: '#1890ff' }} />}
            valueStyle={{ color: '#1890ff' }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={6}>
        <Card>
          <Statistic
            title="Completion Rate"
            value={analyticsData?.overview.completionRate}
            suffix="%"
            prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            valueStyle={{ color: '#52c41a' }}
            precision={1}
          />
        </Card>
      </Col>
      <Col xs={12} sm={6}>
        <Card>
          <Statistic
            title="Avg Lead Time"
            value={analyticsData?.overview.averageLeadTime}
            suffix="hours"
            prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
            valueStyle={{ color: '#faad14' }}
            precision={1}
          />
        </Card>
      </Col>
      <Col xs={12} sm={6}>
        <Card>
          <Statistic
            title="Cost Efficiency"
            value={analyticsData?.overview.costEfficiency}
            suffix="%"
            prefix={<DollarOutlined style={{ color: '#722ed1' }} />}
            valueStyle={{ color: '#722ed1' }}
            precision={1}
          />
        </Card>
      </Col>
    </Row>
  );

  // Kit trends chart with accessibility
  const renderTrendsChart = () => {
    const trendsData = analyticsData?.trends || [];
    const tableColumns = [
      {
        title: 'Date',
        dataIndex: 'date',
        key: 'date',
        sorter: (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      },
      {
        title: 'Kits Generated',
        dataIndex: 'kitsGenerated',
        key: 'kitsGenerated',
        sorter: (a: any, b: any) => a.kitsGenerated - b.kitsGenerated,
      },
      {
        title: 'Kits Completed',
        dataIndex: 'kitsCompleted',
        key: 'kitsCompleted',
        sorter: (a: any, b: any) => a.kitsCompleted - b.kitsCompleted,
      },
      {
        title: 'On-Time Rate (%)',
        dataIndex: 'onTimeRate',
        key: 'onTimeRate',
        render: (value: number) => `${value}%`,
        sorter: (a: any, b: any) => a.onTimeRate - b.onTimeRate,
      },
    ];

    return (
      <Card title="Kit Performance Trends" style={{ marginBottom: 16 }}>
        <AccessibleChartWrapper
          title="Kit Performance Trends"
          description="Line chart showing kit generation, completion, and on-time delivery rate trends over time. Use the table view for detailed data access."
          chartType="Line Chart"
          data={trendsData}
          height={300}
          tableColumns={tableColumns}
          getTableData={() => trendsData.map((item, index) => ({ key: index, ...item }))}
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <RechartsTooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="kitsGenerated"
                stroke="#1890ff"
                name="Kits Generated"
                strokeWidth={2}
                dot={{ fill: '#1890ff', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#1890ff', strokeWidth: 2 }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="kitsCompleted"
                stroke="#52c41a"
                name="Kits Completed"
                strokeWidth={2}
                dot={{ fill: '#52c41a', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#52c41a', strokeWidth: 2 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="onTimeRate"
                stroke="#faad14"
                name="On-Time Rate (%)"
                strokeWidth={2}
                dot={{ fill: '#faad14', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#faad14', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </AccessibleChartWrapper>
      </Card>
    );
  };

  // Status distribution pie chart with accessibility
  const renderStatusDistribution = () => {
    const statusData = analyticsData?.statusDistribution || [];
    const tableColumns = [
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        render: (text: string, record: any) => (
          <span>
            <span
              style={{
                display: 'inline-block',
                width: 12,
                height: 12,
                backgroundColor: record.color,
                marginRight: 8,
                borderRadius: 2
              }}
            />
            {text}
          </span>
        ),
      },
      {
        title: 'Count',
        dataIndex: 'count',
        key: 'count',
        sorter: (a: any, b: any) => a.count - b.count,
      },
      {
        title: 'Percentage',
        dataIndex: 'percentage',
        key: 'percentage',
        render: (value: number) => `${value}%`,
        sorter: (a: any, b: any) => a.percentage - b.percentage,
      },
    ];

    return (
      <Card title="Kit Status Distribution" style={{ marginBottom: 16 }}>
        <AccessibleChartWrapper
          title="Kit Status Distribution"
          description="Pie chart showing the distribution of kits across different status categories. Each segment represents a status with its percentage of the total."
          chartType="Pie Chart"
          data={statusData}
          height={250}
          tableColumns={tableColumns}
          getTableData={() => statusData.map((item, index) => ({ key: index, ...item }))}
        >
          <ResponsiveChartContainer
            height={250}
            aria-label="Kit status distribution pie chart"
            aria-describedby="status-chart-description"
          >
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name} (${percentage}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <RechartsTooltip
                formatter={(value: number, name: string, props: any) => [
                  `${value} kits (${props.payload.percentage}%)`,
                  props.payload.status
                ]}
              />
            </PieChart>
          </ResponsiveChartContainer>
        </AccessibleChartWrapper>
        <div id="status-chart-description" className="sr-only">
          Detailed breakdown: {statusData.map(item => `${item.status}: ${item.count} kits (${item.percentage}%)`).join(', ')}
        </div>
      </Card>
    );
  };

  // Priority analysis table
  const priorityColumns: ColumnsType<any> = [
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string, record: any) => (
        <Tag color={record.color}>{KitPriorityLabels[priority as KitPriority]}</Tag>
      )
    },
    {
      title: 'Count',
      dataIndex: 'count',
      key: 'count',
      sorter: (a, b) => a.count - b.count
    },
    {
      title: 'Avg Lead Time',
      dataIndex: 'averageLeadTime',
      key: 'averageLeadTime',
      render: (time: number) => `${time.toFixed(1)}h`,
      sorter: (a, b) => a.averageLeadTime - b.averageLeadTime
    },
    {
      title: 'Completion Rate',
      dataIndex: 'completionRate',
      key: 'completionRate',
      render: (rate: number) => (
        <Progress
          percent={rate}
          size="small"
          strokeColor={rate >= 95 ? '#52c41a' : rate >= 90 ? '#faad14' : '#ff4d4f'}
        />
      ),
      sorter: (a, b) => a.completionRate - b.completionRate
    }
  ];

  // Cost analysis chart
  const renderCostAnalysis = () => (
    <Row gutter={16}>
      <Col span={12}>
        <Card title="Cost by Stage" size="small">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={analyticsData?.costAnalysis.costByStage}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ stage, percentage }) => `${stage} (${percentage}%)`}
                outerRadius={60}
                fill="#8884d8"
                dataKey="cost"
              >
                {analyticsData?.costAnalysis.costByStage.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Cost']} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </Col>
      <Col span={12}>
        <Card title="Cost Trends" size="small">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={analyticsData?.costAnalysis.costTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <RechartsTooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Total Cost']} />
              <Area type="monotone" dataKey="totalCost" stroke="#1890ff" fill="#1890ff" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </Col>
    </Row>
  );

  // Recommendations table
  const recommendationColumns: ColumnsType<any> = [
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={
          type === 'performance' ? 'blue' :
          type === 'cost' ? 'green' :
          type === 'quality' ? 'orange' : 'purple'
        }>
          {type.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Recommendation',
      key: 'recommendation',
      render: (_, record) => (
        <div>
          <Text strong>{record.title}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.description}</Text>
        </div>
      )
    },
    {
      title: 'Impact',
      dataIndex: 'impact',
      key: 'impact',
      render: (impact: string) => (
        <Tag color={impact === 'high' ? 'red' : impact === 'medium' ? 'orange' : 'green'}>
          {impact.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Effort',
      dataIndex: 'effort',
      key: 'effort',
      render: (effort: string) => (
        <Tag color={effort === 'high' ? 'red' : effort === 'medium' ? 'orange' : 'green'}>
          {effort.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Est. Savings',
      dataIndex: 'estimatedSavings',
      key: 'estimatedSavings',
      render: (savings?: number) => savings ? `$${savings.toLocaleString()}` : '-'
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>
            Kit Analytics & Reporting
          </Title>
          <Text type="secondary">
            Comprehensive analytics and insights for kit management optimization
          </Text>
        </Col>
        <Col>
          <Space>
            <Switch
              checkedChildren="Compare"
              unCheckedChildren="Single"
              checked={compareMode}
              onChange={setCompareMode}
            />
            <RangePicker
              value={selectedTimeRange}
              onChange={(dates) => dates && setSelectedTimeRange(dates)}
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={loadAnalyticsData}
              loading={loadingAnalytics}
            >
              Refresh
            </Button>
            <Button.Group>
              <Button icon={<ExportOutlined />} onClick={() => handleExport('pdf')}>
                PDF
              </Button>
              <Button icon={<ExportOutlined />} onClick={() => handleExport('excel')}>
                Excel
              </Button>
              <Button icon={<ExportOutlined />} onClick={() => handleExport('csv')}>
                CSV
              </Button>
            </Button.Group>
          </Space>
        </Col>
      </Row>

      {/* Overview Cards */}
      {renderOverviewCards()}

      {/* Main Analytics Tabs */}
      <Tabs defaultActiveKey="overview" type="card">
        <TabPane tab="Performance Overview" key="overview">
          <Row gutter={16}>
            <Col span={16}>
              {renderTrendsChart()}
            </Col>
            <Col span={8}>
              {renderStatusDistribution()}
            </Col>
          </Row>

          <Card title="Priority Analysis" style={{ marginBottom: 16 }}>
            <Table
              columns={priorityColumns}
              dataSource={analyticsData?.priorityAnalysis.map((item, index) => ({ ...item, key: index }))}
              pagination={false}
              size="small"
            />
          </Card>
        </TabPane>

        <TabPane tab="Cost Analysis" key="cost">
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Card>
                <Statistic
                  title="Total Cost"
                  value={analyticsData?.costAnalysis.totalCost}
                  prefix="$"
                  formatter={(value) => value ? value.toLocaleString() : '0'}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic
                  title="Average Cost/Kit"
                  value={analyticsData?.costAnalysis.averageCostPerKit}
                  prefix="$"
                  formatter={(value) => value ? value.toLocaleString() : '0'}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic
                  title="Cost Efficiency"
                  value={analyticsData?.overview.costEfficiency}
                  suffix="%"
                  precision={1}
                />
              </Card>
            </Col>
          </Row>

          {renderCostAnalysis()}
        </TabPane>

        <TabPane tab="Shortage Analysis" key="shortages">
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <Card>
                <Statistic
                  title="Total Shortages"
                  value={analyticsData?.shortageAnalysis.totalShortages}
                  prefix={<WarningOutlined style={{ color: '#faad14' }} />}
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card>
                <Statistic
                  title="Critical Shortages"
                  value={analyticsData?.shortageAnalysis.criticalShortages}
                  prefix={<WarningOutlined style={{ color: '#ff4d4f' }} />}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Card>
            </Col>
          </Row>

          <Card title="Shortage Trends" style={{ marginBottom: 16 }}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analyticsData?.shortageAnalysis.shortagesTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="shortageCount" fill="#faad14" name="Shortage Count" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabPane>

        <TabPane tab="Recommendations" key="recommendations">
          <Alert
            message="Optimization Opportunities"
            description="Based on analysis of your kit management data, here are actionable recommendations to improve performance and reduce costs."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Table
            columns={recommendationColumns}
            dataSource={analyticsData?.recommendations.map((item, index) => ({ ...item, key: index }))}
            pagination={false}
            size="small"
          />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default KitAnalyticsDashboard;