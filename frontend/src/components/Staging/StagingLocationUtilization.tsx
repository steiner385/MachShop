/**
 * Staging Location Utilization Component
 *
 * Detailed view of staging area utilization, capacity management,
 * and location optimization for manufacturing facility
 */

import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Progress,
  Table,
  Tag,
  Typography,
  Space,
  Button,
  Tooltip,
  Badge,
  Select,
  Divider,
  Alert,
  List,
  Avatar,
  Statistic,
  Tabs
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  EnvironmentOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  TableOutlined,
  AppstoreOutlined,
  SettingOutlined,
  UserOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useKitStore } from '../../store/kitStore';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

interface StagingLocationData {
  id: string;
  locationCode: string;
  locationName: string;
  areaName: string;
  locationType: 'ASSEMBLY' | 'STORAGE' | 'INSPECTION' | 'SHIPPING' | 'QUARANTINE';
  currentOccupancy: number;
  maxCapacity: number;
  utilizationRate: number;
  isActive: boolean;
  isAvailable: boolean;
  isCleanRoom: boolean;
  securityLevel: 'STANDARD' | 'RESTRICTED' | 'CLASSIFIED';
  maintenanceMode: boolean;

  // Current kits in location
  currentKits: Array<{
    id: string;
    kitNumber: string;
    kitName: string;
    priority: string;
    assignedUser?: string;
    startedAt: string;
    estimatedCompletion?: string;
    progress: number;
  }>;

  // Historical data
  historicalUtilization: Array<{
    date: string;
    averageUtilization: number;
    peakUtilization: number;
    throughput: number;
  }>;

  // Performance metrics
  metrics: {
    averageOccupancyTime: number; // hours
    throughputPerDay: number;
    onTimeCompletion: number; // percentage
    qualityScore: number; // percentage
  };

  // Recommendations
  recommendations?: Array<{
    type: 'capacity' | 'workflow' | 'maintenance' | 'optimization';
    message: string;
    priority: 'low' | 'medium' | 'high';
    actionRequired: boolean;
  }>;
}

interface StagingLocationUtilizationProps {
  defaultView?: 'overview' | 'detailed' | 'optimization';
  selectedArea?: string;
}

export const StagingLocationUtilization: React.FC<StagingLocationUtilizationProps> = ({
  defaultView = 'overview',
  selectedArea = 'all'
}) => {
  // Store state
  const { stagingLocations, loading, fetchStagingLocations } = useKitStore();

  // Local state
  const [locationData, setLocationData] = useState<StagingLocationData[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<StagingLocationData | null>(null);
  const [viewType, setViewType] = useState<'grid' | 'table' | 'chart'>(defaultView === 'overview' ? 'grid' : 'table');
  const [filterArea, setFilterArea] = useState<string>(selectedArea);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'full' | 'maintenance'>('all');

  // Load location data
  useEffect(() => {
    // Mock data - replace with actual API calls
    const mockLocationData: StagingLocationData[] = [
      {
        id: '1',
        locationCode: 'STG-A1',
        locationName: 'Assembly Area 1 Staging',
        areaName: 'Assembly Area A',
        locationType: 'ASSEMBLY',
        currentOccupancy: 8,
        maxCapacity: 10,
        utilizationRate: 80,
        isActive: true,
        isAvailable: true,
        isCleanRoom: false,
        securityLevel: 'STANDARD',
        maintenanceMode: false,
        currentKits: [
          {
            id: '1',
            kitNumber: 'KIT-WO-12345-01',
            kitName: 'Engine Assembly Kit',
            priority: 'HIGH',
            assignedUser: 'John Smith',
            startedAt: dayjs().subtract(2, 'hours').toISOString(),
            estimatedCompletion: dayjs().add(1, 'hour').toISOString(),
            progress: 75
          },
          {
            id: '2',
            kitNumber: 'KIT-WO-12346-01',
            kitName: 'Compressor Kit',
            priority: 'NORMAL',
            assignedUser: 'Sarah Johnson',
            startedAt: dayjs().subtract(1, 'hour').toISOString(),
            progress: 40
          }
        ],
        historicalUtilization: [
          { date: '2024-10-25', averageUtilization: 75, peakUtilization: 90, throughput: 12 },
          { date: '2024-10-26', averageUtilization: 82, peakUtilization: 95, throughput: 14 },
          { date: '2024-10-27', averageUtilization: 68, peakUtilization: 85, throughput: 10 }
        ],
        metrics: {
          averageOccupancyTime: 4.2,
          throughputPerDay: 12.5,
          onTimeCompletion: 94.2,
          qualityScore: 98.1
        },
        recommendations: [
          {
            type: 'capacity',
            message: 'Consider expanding capacity during peak hours (2-4 PM)',
            priority: 'medium',
            actionRequired: false
          }
        ]
      },
      {
        id: '2',
        locationCode: 'STG-A2',
        locationName: 'Assembly Area 2 Staging',
        areaName: 'Assembly Area A',
        locationType: 'ASSEMBLY',
        currentOccupancy: 6,
        maxCapacity: 10,
        utilizationRate: 60,
        isActive: true,
        isAvailable: true,
        isCleanRoom: false,
        securityLevel: 'STANDARD',
        maintenanceMode: false,
        currentKits: [
          {
            id: '3',
            kitNumber: 'KIT-WO-12347-01',
            kitName: 'Turbine Kit',
            priority: 'URGENT',
            assignedUser: 'Mike Wilson',
            startedAt: dayjs().subtract(30, 'minutes').toISOString(),
            progress: 20
          }
        ],
        historicalUtilization: [
          { date: '2024-10-25', averageUtilization: 65, peakUtilization: 80, throughput: 8 },
          { date: '2024-10-26', averageUtilization: 58, peakUtilization: 75, throughput: 7 },
          { date: '2024-10-27', averageUtilization: 72, peakUtilization: 85, throughput: 9 }
        ],
        metrics: {
          averageOccupancyTime: 3.8,
          throughputPerDay: 8.2,
          onTimeCompletion: 96.5,
          qualityScore: 97.8
        }
      },
      {
        id: '3',
        locationCode: 'STG-B1',
        locationName: 'Clean Room Staging',
        areaName: 'Assembly Area B',
        locationType: 'ASSEMBLY',
        currentOccupancy: 10,
        maxCapacity: 12,
        utilizationRate: 83,
        isActive: true,
        isAvailable: true,
        isCleanRoom: true,
        securityLevel: 'RESTRICTED',
        maintenanceMode: false,
        currentKits: [
          {
            id: '4',
            kitNumber: 'KIT-WO-12348-01',
            kitName: 'Precision Components Kit',
            priority: 'HIGH',
            assignedUser: 'Lisa Chen',
            startedAt: dayjs().subtract(4, 'hours').toISOString(),
            estimatedCompletion: dayjs().add(30, 'minutes').toISOString(),
            progress: 90
          }
        ],
        historicalUtilization: [
          { date: '2024-10-25', averageUtilization: 85, peakUtilization: 95, throughput: 15 },
          { date: '2024-10-26', averageUtilization: 88, peakUtilization: 100, throughput: 16 },
          { date: '2024-10-27', averageUtilization: 80, peakUtilization: 92, throughput: 14 }
        ],
        metrics: {
          averageOccupancyTime: 5.1,
          throughputPerDay: 15.2,
          onTimeCompletion: 91.8,
          qualityScore: 99.2
        },
        recommendations: [
          {
            type: 'capacity',
            message: 'High utilization - consider load balancing with STG-B2',
            priority: 'high',
            actionRequired: true
          },
          {
            type: 'workflow',
            message: 'Optimize clean room entry/exit procedures',
            priority: 'medium',
            actionRequired: false
          }
        ]
      },
      {
        id: '4',
        locationCode: 'STG-C1',
        locationName: 'Storage Area Staging',
        areaName: 'Storage Area C',
        locationType: 'STORAGE',
        currentOccupancy: 4,
        maxCapacity: 8,
        utilizationRate: 50,
        isActive: true,
        isAvailable: true,
        isCleanRoom: false,
        securityLevel: 'STANDARD',
        maintenanceMode: false,
        currentKits: [],
        historicalUtilization: [
          { date: '2024-10-25', averageUtilization: 45, peakUtilization: 60, throughput: 5 },
          { date: '2024-10-26', averageUtilization: 52, peakUtilization: 65, throughput: 6 },
          { date: '2024-10-27', averageUtilization: 48, peakUtilization: 62, throughput: 5 }
        ],
        metrics: {
          averageOccupancyTime: 2.8,
          throughputPerDay: 5.4,
          onTimeCompletion: 98.2,
          qualityScore: 99.5
        }
      },
      {
        id: '5',
        locationCode: 'STG-M1',
        locationName: 'Maintenance Staging',
        areaName: 'Maintenance Area',
        locationType: 'STORAGE',
        currentOccupancy: 0,
        maxCapacity: 6,
        utilizationRate: 0,
        isActive: false,
        isAvailable: false,
        isCleanRoom: false,
        securityLevel: 'STANDARD',
        maintenanceMode: true,
        currentKits: [],
        historicalUtilization: [],
        metrics: {
          averageOccupancyTime: 0,
          throughputPerDay: 0,
          onTimeCompletion: 0,
          qualityScore: 0
        },
        recommendations: [
          {
            type: 'maintenance',
            message: 'Scheduled maintenance in progress - ETA 2 hours',
            priority: 'low',
            actionRequired: false
          }
        ]
      }
    ];

    setLocationData(mockLocationData);
  }, []);

  // Filter locations
  const filteredLocations = locationData.filter(location => {
    if (filterArea !== 'all' && !location.areaName.toLowerCase().includes(filterArea.toLowerCase())) {
      return false;
    }
    if (filterType !== 'all' && location.locationType !== filterType) {
      return false;
    }
    if (filterStatus === 'available' && (!location.isAvailable || location.maintenanceMode)) {
      return false;
    }
    if (filterStatus === 'full' && location.utilizationRate < 90) {
      return false;
    }
    if (filterStatus === 'maintenance' && !location.maintenanceMode) {
      return false;
    }
    return true;
  });

  // Get utilization color
  const getUtilizationColor = (rate: number) => {
    if (rate >= 90) return '#ff4d4f';
    if (rate >= 80) return '#faad14';
    if (rate >= 60) return '#1890ff';
    return '#52c41a';
  };

  // Get status tag
  const getStatusTag = (location: StagingLocationData) => {
    if (location.maintenanceMode) {
      return <Tag color="red">Maintenance</Tag>;
    }
    if (!location.isActive) {
      return <Tag color="default">Inactive</Tag>;
    }
    if (!location.isAvailable) {
      return <Tag color="orange">Unavailable</Tag>;
    }
    if (location.utilizationRate >= 90) {
      return <Tag color="red">At Capacity</Tag>;
    }
    return <Tag color="green">Available</Tag>;
  };

  // Table columns for detailed view
  const columns: ColumnsType<StagingLocationData> = [
    {
      title: 'Location',
      key: 'location',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.locationCode}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.locationName}
          </Text>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            {record.areaName}
          </Text>
        </Space>
      ),
      width: 200
    },
    {
      title: 'Type',
      dataIndex: 'locationType',
      key: 'locationType',
      render: (type: string) => <Tag>{type}</Tag>,
      filters: [
        { text: 'Assembly', value: 'ASSEMBLY' },
        { text: 'Storage', value: 'STORAGE' },
        { text: 'Inspection', value: 'INSPECTION' },
        { text: 'Shipping', value: 'SHIPPING' }
      ]
    },
    {
      title: 'Utilization',
      key: 'utilization',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Progress
            percent={record.utilizationRate}
            size="small"
            strokeColor={getUtilizationColor(record.utilizationRate)}
            showInfo={false}
          />
          <Text style={{ fontSize: '12px' }}>
            {record.currentOccupancy}/{record.maxCapacity} ({record.utilizationRate}%)
          </Text>
        </Space>
      ),
      sorter: (a, b) => a.utilizationRate - b.utilizationRate
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => getStatusTag(record)
    },
    {
      title: 'Attributes',
      key: 'attributes',
      render: (_, record) => (
        <Space wrap>
          {record.isCleanRoom && <Tag color="blue">Clean Room</Tag>}
          {record.securityLevel !== 'STANDARD' && (
            <Tag color="orange">{record.securityLevel}</Tag>
          )}
        </Space>
      )
    },
    {
      title: 'Current Kits',
      key: 'currentKits',
      render: (_, record) => (
        <Badge count={record.currentKits.length} showZero />
      ),
      sorter: (a, b) => a.currentKits.length - b.currentKits.length
    },
    {
      title: 'Performance',
      key: 'performance',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: '11px' }}>
            Throughput: {record.metrics.throughputPerDay.toFixed(1)}/day
          </Text>
          <Text style={{ fontSize: '11px' }}>
            On-time: {record.metrics.onTimeCompletion.toFixed(1)}%
          </Text>
          <Text style={{ fontSize: '11px' }}>
            Quality: {record.metrics.qualityScore.toFixed(1)}%
          </Text>
        </Space>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<InfoCircleOutlined />}
            onClick={() => setSelectedLocation(record)}
          >
            Details
          </Button>
          <Button
            type="text"
            size="small"
            icon={<SettingOutlined />}
          >
            Configure
          </Button>
        </Space>
      )
    }
  ];

  // Render grid view
  const renderGridView = () => (
    <Row gutter={[16, 16]}>
      {filteredLocations.map(location => (
        <Col xs={24} sm={12} md={8} lg={6} key={location.id}>
          <Card
            size="small"
            hoverable
            onClick={() => setSelectedLocation(location)}
            style={{
              border: location.utilizationRate >= 90 ? '2px solid #ff4d4f' : undefined,
              backgroundColor: location.maintenanceMode ? '#f5f5f5' : undefined
            }}
          >
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              {/* Header */}
              <div style={{ textAlign: 'center' }}>
                <Text strong>{location.locationCode}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {location.areaName}
                </Text>
              </div>

              {/* Utilization Circle */}
              <div style={{ textAlign: 'center' }}>
                <Progress
                  type="circle"
                  percent={location.utilizationRate}
                  size={80}
                  strokeColor={getUtilizationColor(location.utilizationRate)}
                />
              </div>

              {/* Capacity Info */}
              <div style={{ textAlign: 'center' }}>
                <Text style={{ fontSize: '12px' }}>
                  {location.currentOccupancy}/{location.maxCapacity} capacity
                </Text>
                <br />
                {getStatusTag(location)}
              </div>

              {/* Attributes */}
              <div style={{ textAlign: 'center' }}>
                <Space wrap size={[4, 4]}>
                  <Tag size="small">{location.locationType}</Tag>
                  {location.isCleanRoom && <Tag size="small" color="blue">Clean Room</Tag>}
                  {location.securityLevel !== 'STANDARD' && (
                    <Tag size="small" color="orange">{location.securityLevel}</Tag>
                  )}
                </Space>
              </div>

              {/* Current Kits */}
              {location.currentKits.length > 0 && (
                <div>
                  <Divider style={{ margin: '8px 0' }} />
                  <Text strong style={{ fontSize: '11px' }}>Active Kits:</Text>
                  {location.currentKits.slice(0, 2).map(kit => (
                    <div key={kit.id} style={{ fontSize: '10px', marginTop: 2 }}>
                      <Text>{kit.kitNumber}</Text>
                      <Progress
                        percent={kit.progress}
                        size="small"
                        showInfo={false}
                        strokeWidth={2}
                      />
                    </div>
                  ))}
                  {location.currentKits.length > 2 && (
                    <Text type="secondary" style={{ fontSize: '10px' }}>
                      +{location.currentKits.length - 2} more
                    </Text>
                  )}
                </div>
              )}

              {/* Recommendations */}
              {location.recommendations && location.recommendations.length > 0 && (
                <div>
                  <Divider style={{ margin: '8px 0' }} />
                  {location.recommendations.slice(0, 1).map((rec, idx) => (
                    <Alert
                      key={idx}
                      message={rec.message}
                      type={rec.priority === 'high' ? 'error' : rec.priority === 'medium' ? 'warning' : 'info'}
                      showIcon
                      style={{ fontSize: '10px', padding: '4px 8px' }}
                    />
                  ))}
                </div>
              )}
            </Space>
          </Card>
        </Col>
      ))}
    </Row>
  );

  // Filter controls
  const filterControls = (
    <Row gutter={16} style={{ marginBottom: 16 }}>
      <Col>
        <Select
          value={filterArea}
          onChange={setFilterArea}
          style={{ width: 160 }}
          placeholder="Filter by area"
        >
          <Option value="all">All Areas</Option>
          <Option value="assembly">Assembly Areas</Option>
          <Option value="storage">Storage Areas</Option>
          <Option value="inspection">Inspection Areas</Option>
        </Select>
      </Col>
      <Col>
        <Select
          value={filterType}
          onChange={setFilterType}
          style={{ width: 120 }}
          placeholder="Type"
        >
          <Option value="all">All Types</Option>
          <Option value="ASSEMBLY">Assembly</Option>
          <Option value="STORAGE">Storage</Option>
          <Option value="INSPECTION">Inspection</Option>
          <Option value="SHIPPING">Shipping</Option>
        </Select>
      </Col>
      <Col>
        <Select
          value={filterStatus}
          onChange={setFilterStatus}
          style={{ width: 140 }}
          placeholder="Status"
        >
          <Option value="all">All Status</Option>
          <Option value="available">Available</Option>
          <Option value="full">At Capacity</Option>
          <Option value="maintenance">Maintenance</Option>
        </Select>
      </Col>
      <Col>
        <Space>
          <Button
            type={viewType === 'grid' ? 'primary' : 'default'}
            icon={<AppstoreOutlined />}
            onClick={() => setViewType('grid')}
          >
            Grid
          </Button>
          <Button
            type={viewType === 'table' ? 'primary' : 'default'}
            icon={<TableOutlined />}
            onClick={() => setViewType('table')}
          >
            Table
          </Button>
          <Button
            type={viewType === 'chart' ? 'primary' : 'default'}
            icon={<BarChartOutlined />}
            onClick={() => setViewType('chart')}
          >
            Charts
          </Button>
        </Space>
      </Col>
    </Row>
  );

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <Title level={3} style={{ marginBottom: 16 }}>
        Staging Location Utilization
      </Title>

      {/* Summary Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Total Locations"
              value={locationData.length}
              prefix={<EnvironmentOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Available"
              value={locationData.filter(l => l.isAvailable && !l.maintenanceMode).length}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="At Capacity"
              value={locationData.filter(l => l.utilizationRate >= 90).length}
              prefix={<WarningOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Avg Utilization"
              value={locationData.filter(l => l.isActive)
                .reduce((sum, l) => sum + l.utilizationRate, 0) /
                locationData.filter(l => l.isActive).length || 0}
              suffix="%"
              precision={1}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Filter Controls */}
      {filterControls}

      {/* Main Content */}
      {viewType === 'grid' && renderGridView()}

      {viewType === 'table' && (
        <Table
          columns={columns}
          dataSource={filteredLocations.map(location => ({ ...location, key: location.id }))}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          size="small"
          scroll={{ x: 1000 }}
        />
      )}

      {viewType === 'chart' && (
        <Card>
          <Text>Chart view coming soon - will include utilization trends, heat maps, and optimization recommendations</Text>
        </Card>
      )}

      {/* Location Detail Modal */}
      {selectedLocation && (
        <Modal
          title={`${selectedLocation.locationCode} - ${selectedLocation.locationName}`}
          open={!!selectedLocation}
          onCancel={() => setSelectedLocation(null)}
          width={800}
          footer={null}
        >
          <Tabs defaultActiveKey="overview">
            <TabPane tab="Overview" key="overview">
              <Row gutter={16}>
                <Col span={12}>
                  <Card title="Current Status" size="small">
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Progress
                        percent={selectedLocation.utilizationRate}
                        strokeColor={getUtilizationColor(selectedLocation.utilizationRate)}
                      />
                      <Text>
                        {selectedLocation.currentOccupancy}/{selectedLocation.maxCapacity} capacity used
                      </Text>
                      {getStatusTag(selectedLocation)}
                    </Space>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title="Performance Metrics" size="small">
                    <Row gutter={8}>
                      <Col span={12}>
                        <Statistic
                          title="Throughput"
                          value={selectedLocation.metrics.throughputPerDay}
                          suffix="/day"
                          precision={1}
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title="On-Time"
                          value={selectedLocation.metrics.onTimeCompletion}
                          suffix="%"
                          precision={1}
                        />
                      </Col>
                    </Row>
                  </Card>
                </Col>
              </Row>
            </TabPane>

            <TabPane tab="Current Kits" key="kits">
              <List
                dataSource={selectedLocation.currentKits}
                renderItem={kit => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<UserOutlined />} />}
                      title={kit.kitNumber}
                      description={
                        <Space direction="vertical" size={0}>
                          <Text>{kit.kitName}</Text>
                          <Progress percent={kit.progress} size="small" />
                          <Text type="secondary">
                            Started: {dayjs(kit.startedAt).fromNow()}
                            {kit.estimatedCompletion && ` • ETA: ${dayjs(kit.estimatedCompletion).fromNow()}`}
                          </Text>
                        </Space>
                      }
                    />
                    <Tag color={kit.priority === 'URGENT' ? 'red' : kit.priority === 'HIGH' ? 'orange' : 'blue'}>
                      {kit.priority}
                    </Tag>
                  </List.Item>
                )}
                locale={{ emptyText: 'No kits currently assigned' }}
              />
            </TabPane>

            <TabPane tab="Recommendations" key="recommendations">
              {selectedLocation.recommendations && selectedLocation.recommendations.length > 0 ? (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {selectedLocation.recommendations.map((rec, idx) => (
                    <Alert
                      key={idx}
                      message={rec.message}
                      type={rec.priority === 'high' ? 'error' : rec.priority === 'medium' ? 'warning' : 'info'}
                      showIcon
                      action={rec.actionRequired && (
                        <Button size="small" type="primary">
                          Take Action
                        </Button>
                      )}
                    />
                  ))}
                </Space>
              ) : (
                <Text type="secondary">No recommendations at this time</Text>
              )}
            </TabPane>
          </Tabs>
        </Modal>
      )}
    </div>
  );
};

export default StagingLocationUtilization;