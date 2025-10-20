/**
 * Scheduling List Component
 * Phase 2: Production Scheduling Dashboard
 *
 * Displays paginated list of production schedules with search, filters, and actions
 */

import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Tag,
  message,
  Tooltip,
  Popconfirm,
  Badge,
  Progress,
  Card,
  Statistic,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useSchedulingStore } from '@/store/schedulingStore';
import { useSite } from '@/contexts/SiteContext';
import {
  ProductionSchedule,
  SCHEDULE_STATE_COLORS,
  SCHEDULE_STATE_LABELS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  ScheduleState,
  SchedulePriority,
} from '@/types/scheduling';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/AuthStore';

const { Search } = Input;
const { Option } = Select;

/**
 * Scheduling List Component
 *
 * Displays a table of production schedules with search, filter, and CRUD operations
 */
export const SchedulingList: React.FC = () => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');

  const { currentSite, allSites } = useSite();
  const { user } = useAuthStore();

  const {
    schedules,
    isLoading,
    error,
    filters,
    statistics,
    fetchSchedules,
    fetchStatistics,
    setFilters,
    deleteSchedule,
    clearFilters,
  } = useSchedulingStore();

  // Fetch schedules and statistics on mount
  useEffect(() => {
    fetchSchedules();
    fetchStatistics();
  }, [fetchSchedules, fetchStatistics]);

  // Update site filter when current site changes
  useEffect(() => {
    if (currentSite) {
      setFilters({ siteId: currentSite.id });
    }
  }, [currentSite, setFilters]);

  // Handle search
  const handleSearch = (value: string) => {
    setSearchText(value);
    // Note: Backend doesn't support search yet, would filter client-side or add to backend
  };

  // Handle state filter
  const handleStateFilter = (value: ScheduleState | undefined) => {
    setFilters({ state: value || null });
  };

  // Handle priority filter
  const handlePriorityFilter = (value: SchedulePriority | undefined) => {
    setFilters({ priority: value || null });
  };

  // Handle locked filter
  const handleLockedFilter = (value: boolean | undefined) => {
    setFilters({ isLocked: value === undefined ? null : value });
  };

  // Handle feasible filter
  const handleFeasibleFilter = (value: boolean | undefined) => {
    setFilters({ isFeasible: value === undefined ? null : value });
  };

  // Handle site filter
  const handleSiteFilter = (value: string | undefined) => {
    setFilters({ siteId: value || null });
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      await deleteSchedule(id);
      message.success('Schedule deleted successfully');
    } catch (error: any) {
      message.error(error.message || 'Failed to delete schedule');
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchSchedules();
    fetchStatistics();
    message.success('Schedules refreshed');
  };

  // Check permissions
  const canCreateSchedule = user?.permissions?.includes('scheduling.write') || false;
  const canEditSchedule = user?.permissions?.includes('scheduling.write') || false;
  const canDeleteSchedule = user?.permissions?.includes('scheduling.write') || false;

  // Calculate dispatch progress
  const getDispatchProgress = (schedule: ProductionSchedule): number => {
    if (schedule.totalEntries === 0) return 0;
    return Math.round((schedule.dispatchedCount / schedule.totalEntries) * 100);
  };

  // Table columns
  const columns: ColumnsType<ProductionSchedule> = [
    {
      title: 'Schedule Number',
      dataIndex: 'scheduleNumber',
      key: 'scheduleNumber',
      width: '15%',
      ellipsis: true,
      render: (text: string, record: ProductionSchedule) => (
        <Space>
          <CalendarOutlined />
          <a onClick={() => navigate(`/production/scheduling/${record.id}`)}>{text}</a>
        </Space>
      ),
    },
    {
      title: 'Schedule Name',
      dataIndex: 'scheduleName',
      key: 'scheduleName',
      width: '18%',
      ellipsis: true,
      render: (text: string, record: ProductionSchedule) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          {record.description && (
            <div style={{ fontSize: '12px', color: '#666' }}>{record.description}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Period',
      key: 'period',
      width: '12%',
      render: (_, record: ProductionSchedule) => (
        <div style={{ fontSize: '12px' }}>
          <div>{new Date(record.periodStart).toLocaleDateString()}</div>
          <div style={{ color: '#666' }}>to {new Date(record.periodEnd).toLocaleDateString()}</div>
        </div>
      ),
    },
    {
      title: 'Site',
      key: 'site',
      width: '10%',
      render: (_, record: ProductionSchedule) => (
        <span>{record.site?.siteName || 'N/A'}</span>
      ),
    },
    {
      title: 'State',
      dataIndex: 'state',
      key: 'state',
      width: '10%',
      render: (state: ScheduleState) => (
        <Tag color={SCHEDULE_STATE_COLORS[state]}>
          {SCHEDULE_STATE_LABELS[state]}
        </Tag>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: '10%',
      render: (priority: SchedulePriority) => (
        <Tag color={PRIORITY_COLORS[priority]} icon={priority === 'HOT' ? <ThunderboltOutlined /> : undefined}>
          {PRIORITY_LABELS[priority]}
        </Tag>
      ),
    },
    {
      title: 'Progress',
      key: 'progress',
      width: '12%',
      render: (_, record: ProductionSchedule) => {
        const progress = getDispatchProgress(record);
        return (
          <div>
            <Progress
              percent={progress}
              size="small"
              status={progress === 100 ? 'success' : 'active'}
              showInfo={false}
            />
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              {record.dispatchedCount} / {record.totalEntries} dispatched
            </div>
          </div>
        );
      },
    },
    {
      title: 'Status',
      key: 'status',
      width: '8%',
      align: 'center',
      render: (_, record: ProductionSchedule) => (
        <Space direction="vertical" size="small">
          <Tooltip title={record.isLocked ? 'Locked' : 'Unlocked'}>
            {record.isLocked ? (
              <Tag color="red" icon={<CloseCircleOutlined />}>
                Locked
              </Tag>
            ) : (
              <Tag color="green" icon={<CheckCircleOutlined />}>
                Active
              </Tag>
            )}
          </Tooltip>
          {!record.isFeasible && (
            <Tooltip title={record.feasibilityNotes || 'Constraints violated'}>
              <Tag color="orange">Constraints</Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '10%',
      fixed: 'right',
      render: (_, record: ProductionSchedule) => {
        const isEditable = !record.isLocked && record.state === 'FORECAST';
        return (
          <Space size="small">
            <Tooltip title="View">
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => navigate(`/production/scheduling/${record.id}`)}
              />
            </Tooltip>

            {isEditable && canEditSchedule && (
              <Tooltip title="Edit">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => navigate(`/production/scheduling/${record.id}/edit`)}
                />
              </Tooltip>
            )}

            {isEditable && canDeleteSchedule && (
              <Tooltip title="Delete">
                <Popconfirm
                  title="Are you sure you want to delete this schedule?"
                  description="This action cannot be undone."
                  onConfirm={() => handleDelete(record.id)}
                  okText="Yes"
                  cancelText="No"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                  />
                </Popconfirm>
              </Tooltip>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1>Production Scheduling</h1>
        <p style={{ color: '#666', marginTop: '8px' }}>
          Plan and manage production schedules across sites and work centers
        </p>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Schedules"
                value={statistics.schedules.total}
                prefix={<CalendarOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Entries"
                value={statistics.entries.total}
                suffix={`(${statistics.entries.dispatched} dispatched)`}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Pending Entries"
                value={statistics.entries.pending}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Violated Constraints"
                value={statistics.constraints.violated}
                valueStyle={{ color: statistics.constraints.violated > 0 ? '#cf1322' : '#3f8600' }}
                prefix={statistics.constraints.violated > 0 ? <CloseCircleOutlined /> : <CheckCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters and Actions */}
      <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Top Row: Search and Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
          <Search
            placeholder="Search by schedule number or name"
            allowClear
            enterButton={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={handleSearch}
            style={{ width: '400px' }}
          />

          <Space>
            <Tooltip title="Refresh">
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
              >
                Refresh
              </Button>
            </Tooltip>

            <Tooltip title={!canCreateSchedule ? "You don't have permission to create schedules" : ""}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/production/scheduling/create')}
                size="large"
                disabled={!canCreateSchedule}
              >
                Create Schedule
              </Button>
            </Tooltip>
          </Space>
        </div>

        {/* Bottom Row: Filters */}
        <Space size="middle" wrap>
          <Select
            placeholder="Filter by site"
            allowClear
            value={filters.siteId || undefined}
            onChange={handleSiteFilter}
            style={{ width: '180px' }}
          >
            {allSites.map((site) => (
              <Option key={site.id} value={site.id}>
                {site.siteName}
              </Option>
            ))}
          </Select>

          <Select
            placeholder="Filter by state"
            allowClear
            value={filters.state || undefined}
            onChange={handleStateFilter}
            style={{ width: '150px' }}
          >
            <Option value="FORECAST">Forecast</Option>
            <Option value="RELEASED">Released</Option>
            <Option value="DISPATCHED">Dispatched</Option>
            <Option value="RUNNING">Running</Option>
            <Option value="COMPLETED">Completed</Option>
            <Option value="CLOSED">Closed</Option>
          </Select>

          <Select
            placeholder="Filter by priority"
            allowClear
            value={filters.priority || undefined}
            onChange={handlePriorityFilter}
            style={{ width: '150px' }}
          >
            <Option value="LOW">Low</Option>
            <Option value="NORMAL">Normal</Option>
            <Option value="HIGH">High</Option>
            <Option value="URGENT">Urgent</Option>
            <Option value="HOT">Hot</Option>
          </Select>

          <Select
            placeholder="Filter by locked status"
            allowClear
            value={filters.isLocked === null ? undefined : filters.isLocked}
            onChange={handleLockedFilter}
            style={{ width: '150px' }}
          >
            <Option value={false}>Unlocked</Option>
            <Option value={true}>Locked</Option>
          </Select>

          <Select
            placeholder="Filter by feasibility"
            allowClear
            value={filters.isFeasible === null ? undefined : filters.isFeasible}
            onChange={handleFeasibleFilter}
            style={{ width: '150px' }}
          >
            <Option value={true}>Feasible</Option>
            <Option value={false}>Has Constraints</Option>
          </Select>

          {(filters.state || filters.priority || filters.isLocked !== null || filters.isFeasible !== null) && (
            <Button onClick={clearFilters}>Clear Filters</Button>
          )}
        </Space>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{ marginBottom: '16px', padding: '12px', background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: '4px' }}>
          <span style={{ color: '#cf1322' }}>{error}</span>
        </div>
      )}

      {/* Table */}
      <Table
        columns={columns}
        dataSource={schedules}
        rowKey="id"
        loading={isLoading}
        pagination={{
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} schedules`,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        scroll={{ x: 1400 }}
        bordered
      />
    </div>
  );
};

export default SchedulingList;
