import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Typography,
  message,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  ApartmentOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getAllOperations } from '@/api/operation';
import { useOperationStore } from '@/store/operationStore';
import type { Operation, OperationType } from '@/types/operation';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { Option } = Select;

/**
 * Operation List Page
 * Displays all operations with filtering and search capabilities
 */

const OperationListPage: React.FC = () => {
  const navigate = useNavigate();
  const { operations, setOperations, setLoading, loading } = useOperationStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<OperationType | undefined>();
  const [levelFilter, setLevelFilter] = useState<number | undefined>();
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | undefined>();

  useEffect(() => {
    fetchOperations();
  }, []);

  const fetchOperations = async () => {
    try {
      setLoading(true);
      const ops = await getAllOperations({
        operationType: typeFilter,
        level: levelFilter,
        isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
        searchTerm,
      });
      setOperations(ops);
    } catch (error) {
      message.error('Failed to load operations');
      console.error('Error fetching operations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchOperations();
  };

  const handleReset = () => {
    setSearchTerm('');
    setTypeFilter(undefined);
    setLevelFilter(undefined);
    setStatusFilter(undefined);
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getTypeColor = (type: OperationType): string => {
    const colors: Record<OperationType, string> = {
      PRODUCTION: 'blue',
      QUALITY: 'green',
      MATERIAL_HANDLING: 'orange',
      MAINTENANCE: 'purple',
      SETUP: 'cyan',
      CLEANING: 'geekblue',
      PACKAGING: 'magenta',
      TESTING: 'lime',
      REWORK: 'red',
      OTHER: 'default',
    };
    return colors[type] || 'default';
  };

  const columns: ColumnsType<Operation> = [
    {
      title: 'Code',
      dataIndex: 'operationCode',
      key: 'operationCode',
      width: 120,
      fixed: 'left',
      render: (code: string, record: Operation) => (
        <a onClick={() => navigate(`/operations/${record.id}`)}>{code}</a>
      ),
    },
    {
      title: 'Name',
      dataIndex: 'operationName',
      key: 'operationName',
      width: 200,
    },
    {
      title: 'Type',
      dataIndex: 'operationType',
      key: 'operationType',
      width: 140,
      render: (type: OperationType) => (
        <Tag color={getTypeColor(type)}>{type.replace(/_/g, ' ')}</Tag>
      ),
      filters: [
        { text: 'Production', value: 'PRODUCTION' },
        { text: 'Quality', value: 'QUALITY' },
        { text: 'Material Handling', value: 'MATERIAL_HANDLING' },
        { text: 'Maintenance', value: 'MAINTENANCE' },
        { text: 'Setup', value: 'SETUP' },
        { text: 'Testing', value: 'TESTING' },
        { text: 'Other', value: 'OTHER' },
      ],
      onFilter: (value, record) => record.operationType === value,
    },
    {
      title: 'Level',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (level: number) => (
        <Tooltip title="Hierarchy depth">
          <Tag icon={<ApartmentOutlined />}>{level}</Tag>
        </Tooltip>
      ),
      sorter: (a, b) => a.level - b.level,
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      render: (duration: number) => (
        <Tooltip title="Standard operation duration">
          <Space size="small">
            <ClockCircleOutlined />
            <Text>{formatDuration(duration)}</Text>
          </Space>
        </Tooltip>
      ),
      sorter: (a, b) => (a.duration || 0) - (b.duration || 0),
    },
    {
      title: 'Setup Time',
      dataIndex: 'setupTime',
      key: 'setupTime',
      width: 100,
      render: (setupTime: number) => formatDuration(setupTime),
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      width: 80,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 90,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'default'}>{isActive ? 'Active' : 'Inactive'}</Tag>
      ),
      filters: [
        { text: 'Active', value: true },
        { text: 'Inactive', value: false },
      ],
      onFilter: (value, record) => record.isActive === value,
    },
    {
      title: 'Approval',
      dataIndex: 'requiresApproval',
      key: 'requiresApproval',
      width: 120,
      render: (requiresApproval: boolean, record: Operation) => {
        if (!requiresApproval) {
          return <Tag>No Approval Needed</Tag>;
        }
        return record.approvedAt ? (
          <Tag color="success">Approved</Tag>
        ) : (
          <Tag color="warning">Pending</Tag>
        );
      },
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (desc: string) => (
        <Tooltip title={desc}>
          <Text type="secondary">{desc || '-'}</Text>
        </Tooltip>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>
              <ApartmentOutlined style={{ marginRight: 8 }} />
              Operations
            </Title>
            <Text type="secondary">
              Manufacturing operations and process definitions (ISA-95 compliant)
            </Text>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/operations/create')}
          >
            Create Operation
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <Space size="middle" wrap>
            <Input
              placeholder="Search by code or name"
              prefix={<SearchOutlined />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onPressEnter={handleSearch}
              style={{ width: 250 }}
            />

            <Select
              placeholder="Filter by type"
              value={typeFilter}
              onChange={setTypeFilter}
              allowClear
              style={{ width: 180 }}
            >
              <Option value="PRODUCTION">Production</Option>
              <Option value="QUALITY">Quality</Option>
              <Option value="MATERIAL_HANDLING">Material Handling</Option>
              <Option value="MAINTENANCE">Maintenance</Option>
              <Option value="SETUP">Setup</Option>
              <Option value="TESTING">Testing</Option>
              <Option value="OTHER">Other</Option>
            </Select>

            <Select
              placeholder="Filter by level"
              value={levelFilter}
              onChange={setLevelFilter}
              allowClear
              style={{ width: 150 }}
            >
              {[1, 2, 3, 4, 5].map((level) => (
                <Option key={level} value={level}>
                  Level {level}
                </Option>
              ))}
            </Select>

            <Select
              placeholder="Filter by status"
              value={statusFilter}
              onChange={setStatusFilter}
              allowClear
              style={{ width: 150 }}
            >
              <Option value="active">Active</Option>
              <Option value="inactive">Inactive</Option>
            </Select>

            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
              Search
            </Button>

            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              Reset
            </Button>
          </Space>
        </Card>

        {/* Table */}
        <Card>
          <Table
            columns={columns}
            dataSource={operations}
            loading={loading}
            rowKey="id"
            scroll={{ x: 1400 }}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} operations`,
            }}
          />
        </Card>
      </Space>
    </div>
  );
};

export default OperationListPage;
