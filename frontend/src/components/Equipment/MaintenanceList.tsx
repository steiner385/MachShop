/**
 * Equipment Maintenance List Component
 * Phase 3: Equipment Maintenance Scheduling API Integration
 */

import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Alert,
  Button,
  Input,
  Select,
  Tooltip,
  message,
  Spin,
  Space,
} from 'antd';
import {
  ToolOutlined,
  CalendarOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  EyeOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useEquipmentStore } from '@/store/equipmentStore';
import {
  Equipment,
  MaintenanceRecord,
  EQUIPMENT_CLASS_LABELS,
  EQUIPMENT_CLASS_COLORS,
  EQUIPMENT_STATUS_LABELS,
  EQUIPMENT_STATUS_COLORS,
  MAINTENANCE_TYPE_LABELS,
  MAINTENANCE_TYPE_COLORS,
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_STATUS_COLORS,
  EquipmentClass,
  EquipmentStatus,
  MaintenanceType,
  MaintenanceStatus,
} from '@/types/equipment';
import type { ColumnsType } from 'antd/es/table';

const { Search } = Input;
const { Option } = Select;

export const MaintenanceList: React.FC = () => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [classFilter, setClassFilter] = useState<EquipmentClass | undefined>();
  const [statusFilter, setStatusFilter] = useState<EquipmentStatus | undefined>();
  const [maintenanceTypeFilter, setMaintenanceTypeFilter] = useState<MaintenanceType | undefined>();
  const [maintenanceStatusFilter, setMaintenanceStatusFilter] = useState<MaintenanceStatus | undefined>();
  const [viewMode, setViewMode] = useState<'equipment' | 'maintenance'>('maintenance');

  const {
    equipment,
    maintenanceRecords,
    statistics,
    upcomingMaintenance,
    overdueMaintenance,
    equipmentLoading,
    maintenanceLoading,
    statisticsLoading,
    equipmentError,
    maintenanceError,
    statisticsError,
    fetchEquipment,
    fetchMaintenance,
    fetchDashboard,
    setEquipmentFilters,
    setMaintenanceFilters,
    clearErrors,
  } = useEquipmentStore();

  // Fetch data on mount
  useEffect(() => {
    fetchDashboard();
  }, []);

  // Fetch filtered data when filters change
  useEffect(() => {
    if (viewMode === 'equipment') {
      const filters: any = {};
      if (classFilter) filters.equipmentClass = classFilter;
      if (statusFilter) filters.status = statusFilter;
      if (searchText) filters.searchText = searchText;
      setEquipmentFilters(filters);
      fetchEquipment(filters);
    } else {
      const filters: any = {};
      if (maintenanceTypeFilter) filters.maintenanceType = maintenanceTypeFilter;
      if (maintenanceStatusFilter) filters.status = maintenanceStatusFilter;
      setMaintenanceFilters(filters);
      fetchMaintenance(filters);
    }
  }, [searchText, classFilter, statusFilter, maintenanceTypeFilter, maintenanceStatusFilter, viewMode]);

  // Handle refresh
  const handleRefresh = () => {
    fetchDashboard();
    message.success('Data refreshed');
  };

  // Handle search
  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  // Handle errors
  useEffect(() => {
    if (equipmentError) {
      message.error(equipmentError);
    }
    if (maintenanceError) {
      message.error(maintenanceError);
    }
    if (statisticsError) {
      message.error(statisticsError);
    }
    // Clear errors after displaying
    if (equipmentError || maintenanceError || statisticsError) {
      setTimeout(() => clearErrors(), 3000);
    }
  }, [equipmentError, maintenanceError, statisticsError]);

  // Equipment Table Columns
  const equipmentColumns: ColumnsType<Equipment> = [
    {
      title: 'Equipment Number',
      dataIndex: 'equipmentNumber',
      key: 'equipmentNumber',
      width: 150,
      fixed: 'left',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: 'Equipment Name',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      ellipsis: true,
    },
    {
      title: 'Class',
      dataIndex: 'equipmentClass',
      key: 'equipmentClass',
      width: 150,
      render: (equipmentClass: EquipmentClass) => (
        <Tag color={EQUIPMENT_CLASS_COLORS[equipmentClass]}>
          {EQUIPMENT_CLASS_LABELS[equipmentClass]}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: EquipmentStatus) => (
        <Tag color={EQUIPMENT_STATUS_COLORS[status]}>
          {EQUIPMENT_STATUS_LABELS[status]}
        </Tag>
      ),
    },
    {
      title: 'OEE',
      dataIndex: 'oee',
      key: 'oee',
      width: 100,
      align: 'center',
      render: (oee) => {
        if (!oee) return 'N/A';
        const percentage = Math.round(oee * 100);
        const color = percentage >= 85 ? 'success' : percentage >= 70 ? 'warning' : 'error';
        return <Tag color={color}>{percentage}%</Tag>;
      },
    },
    {
      title: 'Availability',
      dataIndex: 'availability',
      key: 'availability',
      width: 100,
      align: 'center',
      render: (availability) => {
        if (!availability) return 'N/A';
        return `${Math.round(availability * 100)}%`;
      },
    },
    {
      title: 'Location',
      key: 'location',
      width: 150,
      render: (_, record) => (
        <div style={{ fontSize: '12px' }}>
          {record.siteId && <div>Site: {record.siteId}</div>}
          {record.areaId && <div>Area: {record.areaId}</div>}
        </div>
      ),
    },
    {
      title: 'Maintenance Records',
      key: 'maintenance',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Tag color="blue">{record.maintenanceRecords?.length || 0}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Tooltip title="View Details">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/equipment/${record.id}`)}
          >
            View
          </Button>
        </Tooltip>
      ),
    },
  ];

  // Maintenance Records Table Columns
  const maintenanceColumns: ColumnsType<MaintenanceRecord> = [
    {
      title: 'Equipment',
      key: 'equipment',
      width: 200,
      fixed: 'left',
      render: (_, record) => (
        <div>
          <div><strong>{record.equipment?.name}</strong></div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.equipment?.equipmentNumber}
          </div>
        </div>
      ),
    },
    {
      title: 'Maintenance Type',
      dataIndex: 'maintenanceType',
      key: 'maintenanceType',
      width: 150,
      render: (type: MaintenanceType) => (
        <Tag color={MAINTENANCE_TYPE_COLORS[type]}>
          {MAINTENANCE_TYPE_LABELS[type]}
        </Tag>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: 250,
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: MaintenanceStatus) => (
        <Tag color={MAINTENANCE_STATUS_COLORS[status]}>
          {MAINTENANCE_STATUS_LABELS[status]}
        </Tag>
      ),
    },
    {
      title: 'Scheduled Date',
      dataIndex: 'scheduledDate',
      key: 'scheduledDate',
      width: 120,
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Completed Date',
      dataIndex: 'completedDate',
      key: 'completedDate',
      width: 120,
      render: (date) => date ? new Date(date).toLocaleDateString() : 'N/A',
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      align: 'center',
      render: (duration) => duration ? `${duration} hrs` : 'N/A',
    },
    {
      title: 'Cost',
      dataIndex: 'cost',
      key: 'cost',
      width: 120,
      align: 'right',
      render: (cost) => cost ? `$${cost.toLocaleString()}` : 'N/A',
    },
    {
      title: 'Performed By',
      dataIndex: 'performedBy',
      key: 'performedBy',
      width: 150,
      render: (performedBy) => performedBy || 'N/A',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Tooltip title="View Details">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/equipment/maintenance/${record.id}`)}
          >
            View
          </Button>
        </Tooltip>
      ),
    },
  ];

  const isLoading = equipmentLoading || maintenanceLoading || statisticsLoading;

  // Calculate calibration due count
  const calibrationDueCount = maintenanceRecords.filter(
    (record) => record.maintenanceType === MaintenanceType.CALIBRATION &&
    record.status === MaintenanceStatus.SCHEDULED
  ).length;

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1>
          <ToolOutlined style={{ marginRight: 8 }} />
          Equipment Maintenance Scheduling
        </h1>
        <p style={{ color: '#666', marginTop: '8px' }}>
          Manage preventive maintenance, calibration, and equipment downtime tracking
        </p>
      </div>

      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Equipment"
              value={statistics?.totalEquipment || 0}
              prefix={<ToolOutlined />}
              valueStyle={{ color: '#1890ff' }}
              loading={statisticsLoading}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Scheduled Maintenance"
              value={statistics?.totalMaintenanceScheduled || 0}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#52c41a' }}
              loading={statisticsLoading}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Overdue"
              value={statistics?.totalMaintenanceOverdue || 0}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
              loading={statisticsLoading}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Calibration Due"
              value={calibrationDueCount}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
              loading={maintenanceLoading}
            />
          </Card>
        </Col>
      </Row>

      {/* Alert for overdue maintenance */}
      {overdueMaintenance.length > 0 && (
        <Alert
          message={`${overdueMaintenance.length} maintenance tasks are overdue`}
          description="Review overdue maintenance tasks and schedule completion"
          type="error"
          showIcon
          closable
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* Alert for upcoming maintenance */}
      {upcomingMaintenance.length > 0 && (
        <Alert
          message={`${upcomingMaintenance.length} maintenance tasks scheduled in the next 30 days`}
          description="Review upcoming maintenance and ensure resources are available"
          type="warning"
          showIcon
          closable
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* Filters and Actions */}
      <Card style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
            <Select
              value={viewMode}
              onChange={setViewMode}
              style={{ width: '180px' }}
            >
              <Option value="maintenance">Maintenance Records</Option>
              <Option value="equipment">Equipment List</Option>
            </Select>

            <Search
              placeholder={viewMode === 'maintenance' ? 'Search maintenance...' : 'Search equipment...'}
              allowClear
              enterButton={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={handleSearch}
              style={{ width: '300px' }}
            />

            {viewMode === 'equipment' ? (
              <>
                <Select
                  placeholder="Filter by class"
                  allowClear
                  value={classFilter}
                  onChange={setClassFilter}
                  style={{ width: '180px' }}
                >
                  {Object.entries(EQUIPMENT_CLASS_LABELS).map(([key, label]) => (
                    <Option key={key} value={key}>
                      {label}
                    </Option>
                  ))}
                </Select>
                <Select
                  placeholder="Filter by status"
                  allowClear
                  value={statusFilter}
                  onChange={setStatusFilter}
                  style={{ width: '180px' }}
                >
                  {Object.entries(EQUIPMENT_STATUS_LABELS).map(([key, label]) => (
                    <Option key={key} value={key}>
                      {label}
                    </Option>
                  ))}
                </Select>
              </>
            ) : (
              <>
                <Select
                  placeholder="Filter by type"
                  allowClear
                  value={maintenanceTypeFilter}
                  onChange={setMaintenanceTypeFilter}
                  style={{ width: '180px' }}
                >
                  {Object.entries(MAINTENANCE_TYPE_LABELS).map(([key, label]) => (
                    <Option key={key} value={key}>
                      {label}
                    </Option>
                  ))}
                </Select>
                <Select
                  placeholder="Filter by status"
                  allowClear
                  value={maintenanceStatusFilter}
                  onChange={setMaintenanceStatusFilter}
                  style={{ width: '180px' }}
                >
                  {Object.entries(MAINTENANCE_STATUS_LABELS).map(([key, label]) => (
                    <Option key={key} value={key}>
                      {label}
                    </Option>
                  ))}
                </Select>
              </>
            )}
          </div>

          <Space>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />}>
              Schedule Maintenance
            </Button>
          </Space>
        </div>
      </Card>

      {/* Table */}
      <Card title={viewMode === 'maintenance' ? 'Maintenance Records' : 'Equipment List'}>
        <Spin spinning={isLoading}>
          {viewMode === 'maintenance' ? (
            <Table<MaintenanceRecord>
              columns={maintenanceColumns}
              dataSource={maintenanceRecords}
              rowKey="id"
              loading={isLoading}
              pagination={{
                showSizeChanger: true,
                showTotal: (total) => `Total ${total} records`,
                pageSizeOptions: ['10', '20', '50', '100'],
              }}
              scroll={{ x: 1600 }}
              bordered
              locale={{
                emptyText: isLoading ? 'Loading...' : 'No maintenance records found',
              }}
            />
          ) : (
            <Table<Equipment>
              columns={equipmentColumns}
              dataSource={equipment}
              rowKey="id"
              loading={isLoading}
              pagination={{
                showSizeChanger: true,
                showTotal: (total) => `Total ${total} equipment`,
                pageSizeOptions: ['10', '20', '50', '100'],
              }}
              scroll={{ x: 1400 }}
              bordered
              locale={{
                emptyText: isLoading ? 'Loading...' : 'No equipment found',
              }}
            />
          )}
        </Spin>
      </Card>
    </div>
  );
};

export default MaintenanceList;
