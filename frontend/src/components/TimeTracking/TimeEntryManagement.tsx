/**
 * Time Entry Management Component
 * Main dashboard for operators to view and manage their time entries
 *
 * GitHub Issue #51: Time Entry Management & Approvals System
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Tooltip,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  Statistic,
  Alert,
  Typography,
  Badge,
  Dropdown,
  Menu,
  message,
  Spin,
} from 'antd';
import {
  EditOutlined,
  HistoryOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  DownOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import styled from 'styled-components';
import TimeTypeIndicator from './TimeTypeIndicator';
import TimeEntryEdit from './TimeEntryEdit';
import TimeEntryHistory from './TimeEntryHistory';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Text, Title } = Typography;

// Styled Components
const DashboardContainer = styled.div`
  padding: 24px;
  background: #f5f5f5;
  min-height: 100vh;
`;

const StatsCard = styled(Card)`
  .ant-card-body {
    padding: 16px;
  }

  .ant-statistic-title {
    font-size: 12px;
    color: #666;
  }

  .ant-statistic-content {
    font-size: 20px;
  }
`;

const FilterBar = styled.div`
  background: white;
  padding: 16px;
  border-radius: 6px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const TableCard = styled(Card)`
  .ant-table-thead > tr > th {
    background: #fafafa;
    font-weight: 600;
  }

  .ant-table-tbody > tr:hover > td {
    background: #f0f9ff;
  }
`;

// Types
export interface TimeEntry {
  id: string;
  userId: string;
  workOrderId?: string;
  operationId?: string;
  indirectCodeId?: string;
  timeType: 'DIRECT_LABOR' | 'INDIRECT';
  clockInTime: string;
  clockOutTime?: string;
  duration?: number;
  laborRate?: number;
  laborCost?: number;
  status: 'ACTIVE' | 'COMPLETED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  entrySource: string;
  editReason?: string;
  editedAt?: string;
  editedBy?: string;
  workOrder?: {
    id: string;
    workOrderNumber: string;
    productId: string;
    description?: string;
  };
  operation?: {
    id: string;
    operationNumber: string;
    description: string;
  };
  indirectCode?: {
    id: string;
    code: string;
    description: string;
    category: string;
    displayColor: string;
  };
  user: {
    firstName: string;
    lastName: string;
    username: string;
  };
  edits?: Array<{
    id: string;
    editType: string;
    approvalStatus: string;
    editedAt: string;
  }>;
}

export interface WorkOrder {
  id: string;
  workOrderNumber: string;
  productId: string;
  description?: string;
  status: string;
}

export interface Operation {
  id: string;
  operationNumber: string;
  description: string;
  workOrderId: string;
}

export interface IndirectCode {
  id: string;
  code: string;
  description: string;
  category: string;
  displayColor: string;
  isActive: boolean;
}

interface TimeEntryManagementProps {
  userId?: string;
}

const TimeEntryManagement: React.FC<TimeEntryManagementProps> = ({ userId }) => {
  const [loading, setLoading] = useState(false);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<TimeEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Filter states
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);

  // Modal states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null);

  // Reference data
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [indirectCodes, setIndirectCodes] = useState<IndirectCode[]>([]);

  // Statistics
  const [stats, setStats] = useState({
    totalEntries: 0,
    totalHours: 0,
    pendingApprovals: 0,
    recentEdits: 0,
    activeEntries: 0,
  });

  useEffect(() => {
    loadTimeEntries();
    loadReferenceData();
  }, [currentPage, pageSize]);

  useEffect(() => {
    filterEntries();
  }, [timeEntries, searchText, statusFilter, typeFilter, dateRange]);

  const loadTimeEntries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: ((currentPage - 1) * pageSize).toString(),
      });

      if (userId) {
        params.append('userId', userId);
      }

      const response = await fetch(`/api/v1/time-tracking/entries?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        setTimeEntries(result.data.entries || []);
        setTotal(result.data.total || 0);
        calculateStats(result.data.entries || []);
      }
    } catch (error) {
      console.error('Failed to load time entries:', error);
      message.error('Failed to load time entries');
    } finally {
      setLoading(false);
    }
  };

  const loadReferenceData = async () => {
    try {
      const [workOrdersRes, operationsRes, indirectCodesRes] = await Promise.all([
        fetch('/api/v1/workorders?status=ACTIVE&limit=1000', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        }),
        fetch('/api/v1/operations?limit=1000', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        }),
        fetch('/api/v1/time-tracking/indirect-cost-codes?active=true', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        }),
      ]);

      const [workOrdersData, operationsData, indirectCodesData] = await Promise.all([
        workOrdersRes.json(),
        operationsRes.json(),
        indirectCodesRes.json(),
      ]);

      if (workOrdersData.success) setWorkOrders(workOrdersData.data.workOrders || []);
      if (operationsData.success) setOperations(operationsData.data.operations || []);
      if (indirectCodesData.success) setIndirectCodes(indirectCodesData.data.indirectCodes || []);
    } catch (error) {
      console.error('Failed to load reference data:', error);
    }
  };

  const calculateStats = (entries: TimeEntry[]) => {
    const stats = {
      totalEntries: entries.length,
      totalHours: entries.reduce((sum, entry) => sum + (entry.duration || 0), 0),
      pendingApprovals: entries.filter(entry => entry.status === 'PENDING_APPROVAL').length,
      recentEdits: entries.filter(entry => entry.editedAt &&
        dayjs(entry.editedAt).isAfter(dayjs().subtract(7, 'days'))).length,
      activeEntries: entries.filter(entry => entry.status === 'ACTIVE').length,
    };
    setStats(stats);
  };

  const filterEntries = () => {
    let filtered = [...timeEntries];

    // Text search
    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.workOrder?.workOrderNumber?.toLowerCase().includes(search) ||
        entry.operation?.description?.toLowerCase().includes(search) ||
        entry.indirectCode?.description?.toLowerCase().includes(search) ||
        entry.indirectCode?.code?.toLowerCase().includes(search)
      );
    }

    // Status filter
    if (statusFilter.length > 0) {
      filtered = filtered.filter(entry => statusFilter.includes(entry.status));
    }

    // Type filter
    if (typeFilter.length > 0) {
      filtered = filtered.filter(entry => typeFilter.includes(entry.timeType));
    }

    // Date range filter
    if (dateRange) {
      const [start, end] = dateRange;
      filtered = filtered.filter(entry =>
        dayjs(entry.clockInTime).isBetween(start, end, 'day', '[]')
      );
    }

    setFilteredEntries(filtered);
  };

  const handleEdit = (entry: TimeEntry) => {
    setSelectedEntry(entry);
    setEditModalVisible(true);
  };

  const handleViewHistory = (entry: TimeEntry) => {
    setSelectedEntry(entry);
    setHistoryModalVisible(true);
  };

  const handleEditSuccess = (editData: any) => {
    setEditModalVisible(false);
    message.success('Time entry edit submitted successfully');
    loadTimeEntries(); // Reload to show updated data
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'processing';
      case 'COMPLETED': return 'success';
      case 'PENDING_APPROVAL': return 'warning';
      case 'APPROVED': return 'success';
      case 'REJECTED': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <ClockCircleOutlined />;
      case 'COMPLETED': return <CheckCircleOutlined />;
      case 'PENDING_APPROVAL': return <ExclamationCircleOutlined />;
      case 'APPROVED': return <CheckCircleOutlined />;
      case 'REJECTED': return <CloseCircleOutlined />;
      default: return <InfoCircleOutlined />;
    }
  };

  const canEdit = (entry: TimeEntry) => {
    // Can edit if entry is completed and within edit window (e.g., 24 hours)
    if (entry.status === 'ACTIVE') return false; // Can't edit active entries
    if (entry.status === 'REJECTED') return true; // Can re-edit rejected entries

    // Check if within edit window
    const hoursSinceClockOut = entry.clockOutTime
      ? dayjs().diff(dayjs(entry.clockOutTime), 'hours')
      : 0;

    return hoursSinceClockOut <= 24; // 24-hour edit window
  };

  const actionsMenu = (entry: TimeEntry) => (
    <Menu>
      <Menu.Item
        key="edit"
        icon={<EditOutlined />}
        disabled={!canEdit(entry)}
        onClick={() => handleEdit(entry)}
      >
        Edit Entry
      </Menu.Item>
      <Menu.Item
        key="history"
        icon={<HistoryOutlined />}
        onClick={() => handleViewHistory(entry)}
      >
        View History
      </Menu.Item>
    </Menu>
  );

  const columns = [
    {
      title: 'Date/Time',
      key: 'clockInTime',
      width: 160,
      render: (_, record: TimeEntry) => (
        <div>
          <div>{dayjs(record.clockInTime).format('MM/DD/YYYY')}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {dayjs(record.clockInTime).format('HH:mm')} - {
              record.clockOutTime ? dayjs(record.clockOutTime).format('HH:mm') : 'Active'
            }
          </Text>
        </div>
      ),
      sorter: (a: TimeEntry, b: TimeEntry) =>
        dayjs(a.clockInTime).unix() - dayjs(b.clockInTime).unix(),
      defaultSortOrder: 'descend' as const,
    },
    {
      title: 'Type',
      dataIndex: 'timeType',
      key: 'timeType',
      width: 120,
      render: (_, record: TimeEntry) => (
        <TimeTypeIndicator
          timeType={record.timeType}
          indirectCategory={record.indirectCode?.category as any}
          variant="compact"
        />
      ),
    },
    {
      title: 'Assignment',
      key: 'assignment',
      render: (_, record: TimeEntry) => (
        <div>
          {record.workOrder ? (
            <div>
              <Text strong>{record.workOrder.workOrderNumber}</Text>
              {record.operation && (
                <div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Op: {record.operation.operationNumber}
                  </Text>
                </div>
              )}
            </div>
          ) : record.indirectCode ? (
            <div>
              <Space>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    backgroundColor: record.indirectCode.displayColor,
                    borderRadius: 2,
                  }}
                />
                <Text>{record.indirectCode.code}</Text>
              </Space>
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {record.indirectCode.description}
                </Text>
              </div>
            </div>
          ) : (
            <Text type="secondary">Unassigned</Text>
          )}
        </div>
      ),
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      render: (duration: number, record: TimeEntry) => (
        <div>
          {duration ? (
            <Text>{duration.toFixed(2)}h</Text>
          ) : record.status === 'ACTIVE' ? (
            <Tag color="processing">Active</Tag>
          ) : (
            <Text type="secondary">--</Text>
          )}
        </div>
      ),
      sorter: (a: TimeEntry, b: TimeEntry) => (a.duration || 0) - (b.duration || 0),
    },
    {
      title: 'Cost',
      key: 'cost',
      width: 100,
      render: (_, record: TimeEntry) => (
        <div>
          {record.laborCost ? (
            <Text>${record.laborCost.toFixed(2)}</Text>
          ) : record.duration && record.laborRate ? (
            <Text>${(record.duration * record.laborRate).toFixed(2)}</Text>
          ) : (
            <Text type="secondary">--</Text>
          )}
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: string, record: TimeEntry) => (
        <Space>
          <Badge
            status={getStatusColor(status) as any}
            text={
              <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
                {status.replace(/_/g, ' ')}
              </Tag>
            }
          />
          {record.edits && record.edits.length > 0 && (
            <Tooltip title={`${record.edits.length} edit(s)`}>
              <Badge count={record.edits.length} size="small">
                <EditOutlined style={{ color: '#999' }} />
              </Badge>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_, record: TimeEntry) => (
        <Dropdown overlay={actionsMenu(record)} trigger={['click']}>
          <Button type="link" size="small">
            Actions <DownOutlined />
          </Button>
        </Dropdown>
      ),
    },
  ];

  return (
    <DashboardContainer>
      <Title level={3}>My Time Entries</Title>

      {/* Statistics Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <StatsCard>
            <Statistic
              title="Total Entries"
              value={stats.totalEntries}
              prefix={<ClockCircleOutlined />}
            />
          </StatsCard>
        </Col>
        <Col span={6}>
          <StatsCard>
            <Statistic
              title="Total Hours"
              value={stats.totalHours}
              precision={1}
              suffix="h"
            />
          </StatsCard>
        </Col>
        <Col span={6}>
          <StatsCard>
            <Statistic
              title="Pending Approvals"
              value={stats.pendingApprovals}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: stats.pendingApprovals > 0 ? '#faad14' : undefined }}
            />
          </StatsCard>
        </Col>
        <Col span={6}>
          <StatsCard>
            <Statistic
              title="Active Entries"
              value={stats.activeEntries}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: stats.activeEntries > 0 ? '#52c41a' : undefined }}
            />
          </StatsCard>
        </Col>
      </Row>

      {/* Filter Bar */}
      <FilterBar>
        <Row gutter={16}>
          <Col span={6}>
            <Input
              placeholder="Search entries..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col span={4}>
            <Select
              mode="multiple"
              placeholder="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
              allowClear
            >
              <Option value="ACTIVE">Active</Option>
              <Option value="COMPLETED">Completed</Option>
              <Option value="PENDING_APPROVAL">Pending Approval</Option>
              <Option value="APPROVED">Approved</Option>
              <Option value="REJECTED">Rejected</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              mode="multiple"
              placeholder="Type"
              value={typeFilter}
              onChange={setTypeFilter}
              style={{ width: '100%' }}
              allowClear
            >
              <Option value="DIRECT_LABOR">Direct Labor</Option>
              <Option value="INDIRECT">Indirect</Option>
            </Select>
          </Col>
          <Col span={6}>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={4}>
            <Space>
              <Button
                icon={<FilterOutlined />}
                onClick={() => {
                  setSearchText('');
                  setStatusFilter([]);
                  setTypeFilter([]);
                  setDateRange(null);
                }}
              >
                Clear
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadTimeEntries}
                loading={loading}
              />
            </Space>
          </Col>
        </Row>
      </FilterBar>

      {/* Time Entries Table */}
      <TableCard>
        <Table
          columns={columns}
          dataSource={filteredEntries}
          rowKey="id"
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} entries`,
            onChange: (page, size) => {
              setCurrentPage(page);
              if (size !== pageSize) {
                setPageSize(size);
              }
            },
          }}
          scroll={{ x: 1000 }}
        />
      </TableCard>

      {/* Edit Modal */}
      {selectedEntry && (
        <TimeEntryEdit
          timeEntry={selectedEntry}
          visible={editModalVisible}
          onCancel={() => setEditModalVisible(false)}
          onSuccess={handleEditSuccess}
          workOrders={workOrders}
          operations={operations}
          indirectCodes={indirectCodes}
        />
      )}

      {/* History Modal */}
      {selectedEntry && (
        <TimeEntryHistory
          timeEntry={selectedEntry}
          visible={historyModalVisible}
          onClose={() => setHistoryModalVisible(false)}
        />
      )}
    </DashboardContainer>
  );
};

export default TimeEntryManagement;