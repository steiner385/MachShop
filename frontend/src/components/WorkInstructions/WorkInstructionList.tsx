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
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useWorkInstructionStore } from '@/store/workInstructionStore';
import { WorkInstruction } from '@/api/workInstructions';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';

const { Search } = Input;
const { Option } = Select;

/**
 * Status color mapping for work instruction statuses
 */
const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'default',
  REVIEW: 'processing',
  APPROVED: 'success',
  SUPERSEDED: 'warning',
  ARCHIVED: 'error',
};

/**
 * Work Instruction List Component
 *
 * Displays a table of work instructions with search, filter, and CRUD operations
 */
export const WorkInstructionList: React.FC = () => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const {
    workInstructions,
    isLoading,
    error,
    pagination,
    fetchWorkInstructions,
    setFilters,
    setPage,
    deleteWorkInstruction,
    approveWorkInstruction,
  } = useWorkInstructionStore();

  // Fetch work instructions on mount
  useEffect(() => {
    fetchWorkInstructions();
  }, [fetchWorkInstructions]);

  // Handle search
  const handleSearch = (value: string) => {
    setSearchText(value);
    setFilters({ search: value || undefined });
  };

  // Handle status filter
  const handleStatusFilter = (value: string | undefined) => {
    setStatusFilter(value);
    setFilters({ status: value as any });
  };

  // Handle pagination change
  const handleTableChange = (pagination: TablePaginationConfig) => {
    if (pagination.current) {
      setPage(pagination.current);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      await deleteWorkInstruction(id);
      message.success('Work instruction deleted successfully');
    } catch (error: any) {
      message.error(error.message || 'Failed to delete work instruction');
    }
  };

  // Handle approve
  const handleApprove = async (id: string) => {
    try {
      await approveWorkInstruction(id);
      message.success('Work instruction approved successfully');
    } catch (error: any) {
      message.error(error.message || 'Failed to approve work instruction');
    }
  };

  // Table columns
  const columns: ColumnsType<WorkInstruction> = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      width: '25%',
      ellipsis: true,
      render: (text: string, record: WorkInstruction) => (
        <Space>
          <FileTextOutlined />
          <a onClick={() => navigate(`/work-instructions/${record.id}`)}>{text}</a>
        </Space>
      ),
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      width: '10%',
      sorter: true,
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
      title: 'Steps',
      key: 'steps',
      width: '8%',
      align: 'center',
      render: (_, record: WorkInstruction) => (
        <span>{record.steps?.length || 0}</span>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: '25%',
      ellipsis: true,
    },
    {
      title: 'Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: '12%',
      sorter: true,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '15%',
      fixed: 'right',
      render: (_, record: WorkInstruction) => (
        <Space size="small">
          <Tooltip title="View">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/work-instructions/${record.id}`)}
            />
          </Tooltip>

          {record.status === 'APPROVED' && (
            <Tooltip title="Execute">
              <Button
                type="text"
                size="small"
                icon={<PlayCircleOutlined />}
                onClick={() => navigate(`/work-instructions/${record.id}/execute`)}
              />
            </Tooltip>
          )}

          {(record.status === 'DRAFT' || record.status === 'REVIEW') && (
            <>
              <Tooltip title="Edit">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => navigate(`/work-instructions/${record.id}/edit`)}
                />
              </Tooltip>

              {record.status === 'REVIEW' && (
                <Tooltip title="Approve">
                  <Popconfirm
                    title="Approve this work instruction?"
                    onConfirm={() => handleApprove(record.id)}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Button
                      type="text"
                      size="small"
                      icon={<CheckCircleOutlined />}
                      style={{ color: '#52c41a' }}
                    />
                  </Popconfirm>
                </Tooltip>
              )}

              <Tooltip title="Delete">
                <Popconfirm
                  title="Are you sure you want to delete this work instruction?"
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
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1>Work Instructions</h1>
        <p style={{ color: '#666', marginTop: '8px' }}>
          Create and manage digital work instructions for manufacturing operations
        </p>
      </div>

      {/* Filters and Actions */}
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
        <Space size="middle" style={{ flex: 1 }}>
          <Search
            placeholder="Search by title or description"
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
            <Option value="DRAFT">Draft</Option>
            <Option value="REVIEW">Review</Option>
            <Option value="APPROVED">Approved</Option>
            <Option value="SUPERSEDED">Superseded</Option>
            <Option value="ARCHIVED">Archived</Option>
          </Select>
        </Space>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/work-instructions/create')}
          size="large"
        >
          Create Work Instruction
        </Button>
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
        dataSource={workInstructions}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: pagination.page,
          pageSize: pagination.limit,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} work instructions`,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        onChange={handleTableChange}
        scroll={{ x: 1200 }}
        bordered
      />
    </div>
  );
};

export default WorkInstructionList;
