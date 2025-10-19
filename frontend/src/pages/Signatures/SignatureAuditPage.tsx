import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  DatePicker,
  Typography,
  Tooltip,
  Badge,
  Modal,
  Descriptions,
} from 'antd';
import {
  SafetyOutlined,
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { useSignatureStore } from '@/store/signatureStore';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

/**
 * Signature Audit Page
 *
 * Route: /signatures
 *
 * System-wide view of all electronic signatures with filtering and search.
 * Displays signature audit trail for compliance and quality purposes.
 *
 * Features:
 * - Paginated table of all signatures
 * - Filter by entity type, user, date range, status
 * - Search by entity name or signature ID
 * - View detailed signature information
 * - Export capabilities (future)
 */
const SignatureAuditPage: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [selectedSignature, setSelectedSignature] = useState<any>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);

  const {
    signatures,
    isLoading,
    error,
    pagination,
    listSignatures,
    setPage,
    setPageSize,
    clearError,
  } = useSignatureStore();

  // Load signatures on mount
  useEffect(() => {
    loadSignatures();
  }, []);

  // Load signatures with filters
  const loadSignatures = () => {
    const filters: any = {};

    if (searchText) {
      filters.search = searchText;
    }
    if (entityTypeFilter) {
      filters.signedEntityType = entityTypeFilter;
    }
    if (statusFilter) {
      filters.isValid = statusFilter === 'valid';
    }
    if (dateRange && dateRange[0] && dateRange[1]) {
      filters.startDate = dateRange[0].toISOString();
      filters.endDate = dateRange[1].toISOString();
    }

    listSignatures(filters);
  };

  // Handle search
  const handleSearch = () => {
    loadSignatures();
  };

  // Handle reset filters
  const handleReset = () => {
    setSearchText('');
    setEntityTypeFilter(undefined);
    setStatusFilter(undefined);
    setDateRange(null);
    listSignatures({});
  };

  // Handle view details
  const handleViewDetails = (signature: any) => {
    setSelectedSignature(signature);
    setDetailsModalVisible(true);
  };

  // Get signature type color
  const getSignatureTypeColor = (type: string) => {
    switch (type) {
      case 'BASIC':
        return 'blue';
      case 'ADVANCED':
        return 'orange';
      case 'QUALIFIED':
        return 'gold';
      default:
        return 'default';
    }
  };

  // Get signature level color
  const getSignatureLevelColor = (level: string) => {
    switch (level) {
      case 'OPERATOR':
        return 'blue';
      case 'SUPERVISOR':
        return 'cyan';
      case 'QUALITY':
        return 'purple';
      case 'ENGINEER':
        return 'orange';
      case 'MANAGER':
        return 'red';
      default:
        return 'default';
    }
  };

  // Table columns
  const columns: ColumnsType<any> = [
    {
      title: 'Status',
      dataIndex: 'isValid',
      key: 'isValid',
      width: '80px',
      align: 'center',
      render: (isValid: boolean) => (
        <Tooltip title={isValid ? 'Valid' : 'Invalid'}>
          {isValid ? (
            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '18px' }} />
          ) : (
            <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: '18px' }} />
          )}
        </Tooltip>
      ),
    },
    {
      title: 'Signer',
      dataIndex: 'username',
      key: 'username',
      width: '150px',
      render: (username: string, record: any) => (
        <div>
          <Text strong>{username}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.userId}
          </Text>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'signatureType',
      key: 'signatureType',
      width: '120px',
      render: (type: string) => (
        <Tag color={getSignatureTypeColor(type)}>{type}</Tag>
      ),
    },
    {
      title: 'Level',
      dataIndex: 'signatureLevel',
      key: 'signatureLevel',
      width: '130px',
      render: (level: string) => (
        <Tag color={getSignatureLevelColor(level)}>{level}</Tag>
      ),
    },
    {
      title: 'Entity',
      key: 'entity',
      width: '200px',
      render: (_: any, record: any) => (
        <div>
          <Text strong>{record.signedEntityType?.replace('_', ' ').toUpperCase()}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            ID: {record.signedEntityId}
          </Text>
        </div>
      ),
    },
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: '180px',
      sorter: true,
      render: (timestamp: Date) => (
        <div>
          <div>{new Date(timestamp).toLocaleDateString()}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {new Date(timestamp).toLocaleTimeString()}
          </Text>
        </div>
      ),
    },
    {
      title: 'IP Address',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: '140px',
      render: (ip: string) => (
        <Text code style={{ fontSize: '11px' }}>
          {ip}
        </Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '100px',
      fixed: 'right',
      render: (_: any, record: any) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetails(record)}
        >
          Details
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Space align="center" style={{ marginBottom: '12px' }}>
          <SafetyOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
          <Title level={2} style={{ margin: 0 }}>
            Electronic Signatures Audit Trail
          </Title>
        </Space>
        <Text type="secondary">
          Complete audit trail of all electronic signatures in the system for compliance and quality review.
        </Text>
      </div>

      {/* Filters */}
      <Card
        title={
          <Space>
            <FilterOutlined />
            <span>Filters</span>
          </Space>
        }
        style={{ marginBottom: '24px' }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {/* Search and Entity Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <Input
              placeholder="Search by entity name or signature ID"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
              prefix={<SearchOutlined />}
            />

            <Select
              placeholder="Filter by entity type"
              allowClear
              value={entityTypeFilter}
              onChange={setEntityTypeFilter}
              style={{ width: '100%' }}
            >
              <Option value="work_instruction">Work Instructions</Option>
              <Option value="work_order">Work Orders</Option>
              <Option value="ncr">Non-Conformance Reports</Option>
              <Option value="inspection">Inspections</Option>
              <Option value="fai_report">FAI Reports</Option>
            </Select>

            <Select
              placeholder="Filter by status"
              allowClear
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
            >
              <Option value="valid">Valid</Option>
              <Option value="invalid">Invalid</Option>
            </Select>
          </div>

          {/* Date Range and Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              placeholder={['Start Date', 'End Date']}
              style={{ width: '400px' }}
            />

            <Space>
              <Button onClick={handleReset}>Reset</Button>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleSearch}
              >
                Search
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => listSignatures({})}
              >
                Refresh
              </Button>
            </Space>
          </div>
        </Space>
      </Card>

      {/* Error Display */}
      {error && (
        <Card style={{ marginBottom: '16px', borderColor: '#ff4d4f' }}>
          <Space>
            <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
            <Text type="danger">{error}</Text>
            <Button type="link" onClick={clearError}>
              Dismiss
            </Button>
          </Space>
        </Card>
      )}

      {/* Signatures Table */}
      <Card
        title={
          <Space>
            <Badge count={pagination.total} showZero style={{ backgroundColor: '#1890ff' }}>
              <SafetyOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
            </Badge>
            <span>Signatures ({pagination.total})</span>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={signatures}
          rowKey="signatureId"
          loading={isLoading}
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} signatures`,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: (page, pageSize) => {
              setPage(page);
              if (pageSize !== pagination.limit) {
                setPageSize(pageSize);
              }
            },
          }}
          scroll={{ x: 1400 }}
          bordered
        />
      </Card>

      {/* Details Modal */}
      <Modal
        title="Signature Details"
        open={detailsModalVisible}
        onCancel={() => setDetailsModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailsModalVisible(false)}>
            Close
          </Button>,
        ]}
        width={800}
      >
        {selectedSignature && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Status">
              {selectedSignature.isValid ? (
                <Badge status="success" text="Valid" />
              ) : (
                <Badge status="error" text="Invalid" />
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Signature ID">
              <Text code>{selectedSignature.signatureId}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Signer">
              {selectedSignature.username} ({selectedSignature.userId})
            </Descriptions.Item>
            <Descriptions.Item label="Signature Type">
              <Tag color={getSignatureTypeColor(selectedSignature.signatureType)}>
                {selectedSignature.signatureType}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Signature Level">
              <Tag color={getSignatureLevelColor(selectedSignature.signatureLevel)}>
                {selectedSignature.signatureLevel}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Signed Entity">
              {selectedSignature.signedEntityType?.replace('_', ' ').toUpperCase()}
            </Descriptions.Item>
            <Descriptions.Item label="Entity ID">
              <Text code>{selectedSignature.signedEntityId}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Timestamp">
              {new Date(selectedSignature.timestamp).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="IP Address">
              <Text code>{selectedSignature.ipAddress}</Text>
            </Descriptions.Item>
            {selectedSignature.invalidatedAt && (
              <Descriptions.Item label="Invalidated At">
                {new Date(selectedSignature.invalidatedAt).toLocaleString()}
              </Descriptions.Item>
            )}
            {selectedSignature.invalidationReason && (
              <Descriptions.Item label="Invalidation Reason">
                <Text type="danger">{selectedSignature.invalidationReason}</Text>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default SignatureAuditPage;
