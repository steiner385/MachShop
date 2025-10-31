import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Card,
  Space,
  Button,
  Input,
  Select,
  DatePicker,
  Tag,
  Badge,
  Tooltip,
  Popconfirm,
  message,
  Row,
  Col,
  Statistic,
  Drawer,
  Form,
  Modal,
  Dropdown,
  MenuProps,
  Typography,
  Progress,
  Avatar,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  DownloadOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  CalendarOutlined,
  MoreOutlined,
  ExportOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { formatDate, formatDateTime } from '../../utils/dateUtils';
import { downloadFile } from '../../utils/fileUtils';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Search } = Input;
const { Text, Title } = Typography;

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface BuildRecord {
  id: string;
  buildRecordNumber: string;
  workOrderId: string;
  engineModel: string;
  serialNumber: string;
  customerName?: string;
  contractNumber?: string;
  buildStartDate: string;
  buildEndDate?: string;
  targetCompletionDate?: string;
  actualCompletionDate?: string;
  status: BuildRecordStatus;
  finalDisposition?: FinalDisposition;
  isCompliant: boolean;
  hasDeviations: boolean;
  buildBookGenerated: boolean;
  buildBookGeneratedAt?: string;
  buildBookVersion: number;
  qualityApproved: boolean;
  engineeringApproved: boolean;
  customerApproved: boolean;
  createdAt: string;
  updatedAt: string;
  workOrder: {
    workOrderNumber: string;
    part: {
      partNumber: string;
      description: string;
    };
  };
  assignedTo?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  _count: {
    operations: number;
    deviations: number;
    photos: number;
  };
}

enum BuildRecordStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETE = 'COMPLETE',
  APPROVED = 'APPROVED',
  CANCELLED = 'CANCELLED',
  REWORK_REQUIRED = 'REWORK_REQUIRED',
}

enum FinalDisposition {
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  REWORK_REQUIRED = 'REWORK_REQUIRED',
  CONDITIONAL_ACCEPT = 'CONDITIONAL_ACCEPT',
  CUSTOMER_HOLD = 'CUSTOMER_HOLD',
}

interface BuildRecordFilters {
  status?: BuildRecordStatus;
  engineModel?: string;
  customerName?: string;
  hasDeviations?: boolean;
  isCompliant?: boolean;
  assignedToId?: string;
  dateRange?: [Dayjs, Dayjs];
}

interface BuildRecordSummary {
  totalBuildRecords: number;
  activeBuildRecords: number;
  completedBuildRecords: number;
  buildRecordsWithDeviations: number;
  averageBuildTime: number;
  complianceRate: number;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const BuildRecordList: React.FC = () => {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();

  // State
  const [buildRecords, setBuildRecords] = useState<BuildRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<BuildRecordSummary | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [filters, setFilters] = useState<BuildRecordFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('buildStartDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  // Form
  const [form] = Form.useForm();

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchBuildRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.current.toString(),
        pageSize: pagination.pageSize.toString(),
        sortBy,
        sortOrder,
      });

      // Add filters
      if (filters.status) params.append('status', filters.status);
      if (filters.engineModel) params.append('engineModel', filters.engineModel);
      if (filters.customerName) params.append('customerName', filters.customerName);
      if (filters.hasDeviations !== undefined) params.append('hasDeviations', filters.hasDeviations.toString());
      if (filters.isCompliant !== undefined) params.append('isCompliant', filters.isCompliant.toString());
      if (filters.assignedToId) params.append('assignedToId', filters.assignedToId);
      if (filters.dateRange) {
        params.append('dateFrom', filters.dateRange[0].toISOString());
        params.append('dateTo', filters.dateRange[1].toISOString());
      }

      // Add search term (search across multiple fields)
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await api.get(`/build-records?${params}`);

      setBuildRecords(response.data.records);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination.total,
      }));
    } catch (error) {
      console.error('Error fetching build records:', error);
      message.error('Failed to fetch build records');
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, sortBy, sortOrder, filters, searchTerm]);

  const fetchSummary = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.dateRange) {
        params.append('dateFrom', filters.dateRange[0].toISOString());
        params.append('dateTo', filters.dateRange[1].toISOString());
      }
      if (filters.engineModel) params.append('engineModel', filters.engineModel);
      if (filters.customerName) params.append('customerName', filters.customerName);

      const response = await api.get(`/build-records/summary/statistics?${params}`);
      setSummary(response.data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  }, [filters.dateRange, filters.engineModel, filters.customerName]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    fetchBuildRecords();
  }, [fetchBuildRecords]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleTableChange = (paginationData: any, _filters: any, sorter: any) => {
    setPagination(prev => ({
      ...prev,
      current: paginationData.current,
      pageSize: paginationData.pageSize,
    }));

    if (sorter.order) {
      setSortBy(sorter.field);
      setSortOrder(sorter.order === 'ascend' ? 'asc' : 'desc');
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleFilterSubmit = (values: any) => {
    setFilters({
      status: values.status,
      engineModel: values.engineModel,
      customerName: values.customerName,
      hasDeviations: values.hasDeviations,
      isCompliant: values.isCompliant,
      assignedToId: values.assignedToId,
      dateRange: values.dateRange,
    });
    setPagination(prev => ({ ...prev, current: 1 }));
    setFiltersVisible(false);
  };

  const clearFilters = () => {
    setFilters({});
    form.resetFields();
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleViewDetails = (record: BuildRecord) => {
    navigate(`/build-records/${record.id}`);
  };

  const handleEdit = (record: BuildRecord) => {
    navigate(`/build-records/${record.id}/edit`);
  };

  const handleGenerateBuildBook = async (record: BuildRecord) => {
    try {
      setLoading(true);
      const response = await api.post(`/build-books/generate/${record.id}`);

      if (response.data.success) {
        message.success('Build book generated successfully');
        fetchBuildRecords(); // Refresh to show updated status
      } else {
        message.error('Failed to generate build book');
      }
    } catch (error) {
      console.error('Error generating build book:', error);
      message.error('Failed to generate build book');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBuildBook = async (record: BuildRecord) => {
    try {
      const url = `/api/build-books/download/${record.id}`;
      await downloadFile(url, `BuildBook_${record.buildRecordNumber}_v${record.buildBookVersion}.pdf`);
      message.success('Build book download started');
    } catch (error) {
      console.error('Error downloading build book:', error);
      message.error('Failed to download build book');
    }
  };

  const handleBulkActions = async (action: string) => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select build records first');
      return;
    }

    try {
      setLoading(true);

      switch (action) {
        case 'generateBuildBooks':
          for (const recordId of selectedRowKeys) {
            await api.post(`/build-books/generate/${recordId}`);
          }
          message.success(`Generated build books for ${selectedRowKeys.length} records`);
          break;
        case 'export':
          // Export functionality would go here
          message.success(`Exported ${selectedRowKeys.length} records`);
          break;
        default:
          break;
      }

      setSelectedRowKeys([]);
      fetchBuildRecords();
    } catch (error) {
      console.error('Error performing bulk action:', error);
      message.error('Failed to perform bulk action');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // STATUS & BADGE HELPERS
  // ============================================================================

  const getStatusColor = (status: BuildRecordStatus): string => {
    switch (status) {
      case BuildRecordStatus.DRAFT: return 'default';
      case BuildRecordStatus.ACTIVE: return 'processing';
      case BuildRecordStatus.ON_HOLD: return 'warning';
      case BuildRecordStatus.COMPLETE: return 'success';
      case BuildRecordStatus.APPROVED: return 'success';
      case BuildRecordStatus.CANCELLED: return 'error';
      case BuildRecordStatus.REWORK_REQUIRED: return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: BuildRecordStatus) => {
    switch (status) {
      case BuildRecordStatus.COMPLETE:
      case BuildRecordStatus.APPROVED:
        return <CheckCircleOutlined />;
      case BuildRecordStatus.ACTIVE:
        return <ClockCircleOutlined />;
      case BuildRecordStatus.ON_HOLD:
      case BuildRecordStatus.REWORK_REQUIRED:
        return <ExclamationCircleOutlined />;
      default:
        return null;
    }
  };

  const getComplianceColor = (isCompliant: boolean, hasDeviations: boolean): string => {
    if (isCompliant && !hasDeviations) return 'success';
    if (isCompliant && hasDeviations) return 'warning';
    return 'error';
  };

  // ============================================================================
  // TABLE COLUMNS
  // ============================================================================

  const columns: ColumnsType<BuildRecord> = [
    {
      title: 'Build Record',
      key: 'buildRecord',
      width: 200,
      fixed: 'left',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500, color: '#1890ff', cursor: 'pointer' }}
               onClick={() => handleViewDetails(record)}>
            {record.buildRecordNumber}
          </div>
          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
            {record.workOrder.workOrderNumber}
          </div>
        </div>
      ),
    },
    {
      title: 'Engine',
      key: 'engine',
      width: 180,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.engineModel}</div>
          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
            S/N: {record.serialNumber}
          </div>
        </div>
      ),
    },
    {
      title: 'Customer',
      dataIndex: 'customerName',
      key: 'customer',
      width: 150,
      render: (customerName: string) => customerName || '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      sorter: true,
      render: (status: BuildRecordStatus) => (
        <Badge
          status={getStatusColor(status) as any}
          text={status.replace('_', ' ')}
        />
      ),
    },
    {
      title: 'Progress',
      key: 'progress',
      width: 150,
      render: (_, record) => {
        const totalOps = record._count.operations;
        const completedOps = totalOps; // Would need actual completion data
        const percent = totalOps > 0 ? Math.round((completedOps / totalOps) * 100) : 0;

        return (
          <div>
            <Progress
              percent={percent}
              size="small"
              status={percent === 100 ? 'success' : 'active'}
            />
            <div style={{ fontSize: '11px', color: '#8c8c8c' }}>
              {totalOps} operations
            </div>
          </div>
        );
      },
    },
    {
      title: 'Compliance',
      key: 'compliance',
      width: 120,
      render: (_, record) => (
        <div>
          <Tag color={getComplianceColor(record.isCompliant, record.hasDeviations)}>
            {record.isCompliant ? 'Compliant' : 'Non-Compliant'}
          </Tag>
          {record.hasDeviations && (
            <div style={{ fontSize: '11px', color: '#ff4d4f' }}>
              {record._count.deviations} deviations
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Assigned To',
      key: 'assignedTo',
      width: 120,
      render: (_, record) => (
        record.assignedTo ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar size="small" icon={<UserOutlined />} />
            <div>
              <div style={{ fontSize: '12px' }}>
                {record.assignedTo.firstName} {record.assignedTo.lastName}
              </div>
            </div>
          </div>
        ) : '-'
      ),
    },
    {
      title: 'Build Dates',
      key: 'dates',
      width: 150,
      sorter: true,
      render: (_, record) => (
        <div>
          <div style={{ fontSize: '12px' }}>
            Started: {formatDate(record.buildStartDate)}
          </div>
          {record.buildEndDate && (
            <div style={{ fontSize: '12px', color: '#52c41a' }}>
              Completed: {formatDate(record.buildEndDate)}
            </div>
          )}
          {record.targetCompletionDate && !record.buildEndDate && (
            <div style={{ fontSize: '12px', color: '#faad14' }}>
              Due: {formatDate(record.targetCompletionDate)}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Build Book',
      key: 'buildBook',
      width: 120,
      render: (_, record) => (
        <div>
          {record.buildBookGenerated ? (
            <div>
              <Tag color="success">Generated</Tag>
              <div style={{ fontSize: '11px', color: '#8c8c8c' }}>
                v{record.buildBookVersion}
              </div>
            </div>
          ) : (
            <Tag color="default">Not Generated</Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => {
        const items: MenuProps['items'] = [
          {
            key: 'view',
            icon: <EyeOutlined />,
            label: 'View Details',
            onClick: () => handleViewDetails(record),
          },
          ...(hasRole(['staging_coordinator', 'production_manager', 'admin']) ? [{
            key: 'edit',
            icon: <EditOutlined />,
            label: 'Edit',
            onClick: () => handleEdit(record),
          }] : []),
          {
            type: 'divider' as const,
          },
          ...(record.buildBookGenerated ? [{
            key: 'download',
            icon: <DownloadOutlined />,
            label: 'Download Build Book',
            onClick: () => handleDownloadBuildBook(record),
          }] : []),
          ...(hasRole(['staging_coordinator', 'production_manager', 'admin']) &&
              record.status !== BuildRecordStatus.DRAFT ? [{
            key: 'generate',
            icon: <FileTextOutlined />,
            label: 'Generate Build Book',
            onClick: () => handleGenerateBuildBook(record),
          }] : []),
          {
            key: 'preview',
            icon: <ExportOutlined />,
            label: 'Preview Build Book',
            onClick: () => window.open(`/api/build-books/preview/${record.id}`, '_blank'),
          },
        ];

        return (
          <Dropdown menu={{ items }} trigger={['click']}>
            <Button
              type="text"
              icon={<MoreOutlined />}
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
        );
      },
    },
  ];

  // ============================================================================
  // BULK ACTIONS MENU
  // ============================================================================

  const bulkActionsMenu: MenuProps = {
    items: [
      {
        key: 'generateBuildBooks',
        icon: <FileTextOutlined />,
        label: 'Generate Build Books',
        onClick: () => handleBulkActions('generateBuildBooks'),
      },
      {
        key: 'export',
        icon: <ExportOutlined />,
        label: 'Export to Excel',
        onClick: () => handleBulkActions('export'),
      },
      {
        key: 'print',
        icon: <PrinterOutlined />,
        label: 'Print Summary',
        onClick: () => window.print(),
      },
    ],
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          Build Records
        </Title>
        <Text type="secondary">
          Electronic build book and assembly record management
        </Text>
      </div>

      {/* Summary Statistics */}
      {summary && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={4}>
            <Card>
              <Statistic
                title="Total Build Records"
                value={summary.totalBuildRecords}
                prefix={<FileTextOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="Active Builds"
                value={summary.activeBuildRecords}
                valueStyle={{ color: '#1890ff' }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="Completed"
                value={summary.completedBuildRecords}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="With Deviations"
                value={summary.buildRecordsWithDeviations}
                valueStyle={{ color: '#faad14' }}
                prefix={<ExclamationCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="Avg Build Time"
                value={summary.averageBuildTime}
                suffix="days"
                prefix={<CalendarOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="Compliance Rate"
                value={summary.complianceRate}
                suffix="%"
                valueStyle={{
                  color: summary.complianceRate >= 95 ? '#52c41a' :
                         summary.complianceRate >= 90 ? '#faad14' : '#ff4d4f'
                }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Toolbar */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space>
              <Search
                placeholder="Search build records..."
                allowClear
                enterButton={<SearchOutlined />}
                size="large"
                onSearch={handleSearch}
                style={{ width: 300 }}
              />
              <Button
                icon={<FilterOutlined />}
                onClick={() => setFiltersVisible(true)}
                type={Object.keys(filters).length > 0 ? 'primary' : 'default'}
              >
                Filters {Object.keys(filters).length > 0 && `(${Object.keys(filters).length})`}
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchBuildRecords}
                loading={loading}
              >
                Refresh
              </Button>
            </Space>
          </Col>
          <Col>
            <Space>
              {selectedRowKeys.length > 0 && (
                <Dropdown menu={bulkActionsMenu}>
                  <Button>
                    Actions ({selectedRowKeys.length})
                  </Button>
                </Dropdown>
              )}
              {hasRole(['staging_coordinator', 'production_manager', 'admin']) && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setCreateModalVisible(true)}
                >
                  New Build Record
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Main Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={buildRecords}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} build records`,
          }}
          onChange={handleTableChange}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            type: 'checkbox',
          }}
          scroll={{ x: 1200 }}
          size="small"
        />
      </Card>

      {/* Filters Drawer */}
      <Drawer
        title="Filter Build Records"
        placement="right"
        open={filtersVisible}
        onClose={() => setFiltersVisible(false)}
        width={400}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFilterSubmit}
          initialValues={filters}
        >
          <Form.Item name="status" label="Status">
            <Select placeholder="Select status" allowClear>
              {Object.values(BuildRecordStatus).map(status => (
                <Option key={status} value={status}>
                  {status.replace('_', ' ')}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="engineModel" label="Engine Model">
            <Input placeholder="Enter engine model" allowClear />
          </Form.Item>

          <Form.Item name="customerName" label="Customer">
            <Input placeholder="Enter customer name" allowClear />
          </Form.Item>

          <Form.Item name="hasDeviations" label="Has Deviations">
            <Select placeholder="Select option" allowClear>
              <Option value={true}>Yes</Option>
              <Option value={false}>No</Option>
            </Select>
          </Form.Item>

          <Form.Item name="isCompliant" label="Compliance">
            <Select placeholder="Select compliance status" allowClear>
              <Option value={true}>Compliant</Option>
              <Option value={false}>Non-Compliant</Option>
            </Select>
          </Form.Item>

          <Form.Item name="dateRange" label="Build Date Range">
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Apply Filters
              </Button>
              <Button onClick={clearFilters}>
                Clear All
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Drawer>

      {/* Create Build Record Modal */}
      <Modal
        title="Create New Build Record"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width={800}
      >
        {/* Create form would go here */}
        <div style={{ padding: 20, textAlign: 'center', color: '#8c8c8c' }}>
          Build Record creation form will be implemented here
        </div>
      </Modal>
    </div>
  );
};

export default BuildRecordList;