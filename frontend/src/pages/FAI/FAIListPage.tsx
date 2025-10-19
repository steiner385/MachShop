import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Typography,
  Card,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  FileSearchOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useFAIStore } from '@/store/faiStore';
import { FAIReport } from '@/api/fai';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

/**
 * Status color mapping for FAI statuses
 */
const STATUS_COLORS: Record<string, string> = {
  IN_PROGRESS: 'processing',
  REVIEW: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  SUPERSEDED: 'default',
};

/**
 * FAI List Page
 *
 * Route: /fai
 *
 * Displays a paginated table of all AS9102 First Article Inspection reports.
 */
const FAIListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const {
    reports,
    isLoading,
    error,
    pagination,
    listFAIReports,
    setFilters,
    setPage,
    clearError,
  } = useFAIStore();

  // Load FAI reports on mount
  useEffect(() => {
    listFAIReports();
  }, []);

  // Handle search
  const handleSearch = (value: string) => {
    setSearchText(value);
    setFilters({ search: value || undefined });
  };

  // Handle status filter
  const handleStatusFilter = (value: string | undefined) => {
    setStatusFilter(value);
    setFilters({ status: value });
  };

  // Handle pagination change
  const handleTableChange = (pagination: TablePaginationConfig) => {
    if (pagination.current) {
      setPage(pagination.current);
    }
  };

  // Table columns
  const columns: ColumnsType<FAIReport> = [
    {
      title: 'FAI Number',
      dataIndex: 'faiNumber',
      key: 'faiNumber',
      width: '15%',
      render: (text: string, record: FAIReport) => (
        <Space>
          <FileSearchOutlined style={{ color: '#1890ff' }} />
          <a onClick={() => navigate(`/fai/${record.id}`)}>{text}</a>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: '12%',
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status]}>{status}</Tag>
      ),
    },
    {
      title: 'Part ID',
      dataIndex: 'partId',
      key: 'partId',
      width: '15%',
    },
    {
      title: 'Work Order',
      dataIndex: 'workOrderId',
      key: 'workOrderId',
      width: '12%',
      render: (workOrderId: string | null) => workOrderId || 'N/A',
    },
    {
      title: 'Revision',
      dataIndex: 'revisionLevel',
      key: 'revisionLevel',
      width: '10%',
      render: (rev: string | null) => rev || 'N/A',
    },
    {
      title: 'Characteristics',
      key: 'characteristics',
      width: '12%',
      align: 'center',
      render: (_, record: FAIReport) => (
        <span>{record.characteristics?.length || 0}</span>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: '12%',
      sorter: true,
      render: (date: Date) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '12%',
      fixed: 'right',
      render: (_, record: FAIReport) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/fai/${record.id}`)}
            />
          </Tooltip>
          {record.status === 'REVIEW' && (
            <Tooltip title="Approve">
              <Button
                type="text"
                size="small"
                icon={<CheckCircleOutlined />}
                style={{ color: '#52c41a' }}
                onClick={() => navigate(`/fai/${record.id}`)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Space align="center" style={{ marginBottom: '12px' }}>
          <FileSearchOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
          <Title level={2} style={{ margin: 0 }}>
            AS9102 First Article Inspection
          </Title>
        </Space>
        <Text type="secondary">
          Manage First Article Inspection Reports (FAIR) for aerospace quality compliance.
        </Text>
      </div>

      {/* Filters and Actions */}
      <Card style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
          <Space size="middle" style={{ flex: 1 }}>
            <Search
              placeholder="Search by FAI number or part ID"
              allowClear
              enterButton={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={handleSearch}
              style={{ width: '300px' }}
            />

            <Select
              placeholder="Filter by status"
              allowClear
              value={statusFilter}
              onChange={handleStatusFilter}
              style={{ width: '150px' }}
            >
              <Option value="IN_PROGRESS">In Progress</Option>
              <Option value="REVIEW">Review</Option>
              <Option value="APPROVED">Approved</Option>
              <Option value="REJECTED">Rejected</Option>
              <Option value="SUPERSEDED">Superseded</Option>
            </Select>
          </Space>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/fai/create')}
            size="large"
          >
            Create FAI Report
          </Button>
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <Card style={{ marginBottom: '16px', borderColor: '#ff4d4f' }}>
          <Space>
            <Text type="danger">{error}</Text>
            <Button type="link" onClick={clearError}>
              Dismiss
            </Button>
          </Space>
        </Card>
      )}

      {/* FAI Reports Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={reports}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} FAI reports`,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
          bordered
        />
      </Card>
    </div>
  );
};

export default FAIListPage;
