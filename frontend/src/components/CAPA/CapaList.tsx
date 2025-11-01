/**
 * CAPA List Component (Issue #56)
 * Displays all CAPAs for a site with filtering, sorting, and pagination
 */

import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Input,
  Select,
  DatePicker,
  Badge,
  Modal,
  message,
  Row,
  Col,
  Card,
  Tag,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

interface CAPA {
  id: string;
  capaNumber: string;
  ncrId: string;
  title: string;
  status: string;
  riskLevel: string;
  ownerId: string;
  owner?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  plannedDueDate: string;
  actualCompletionDate?: string;
  createdAt: string;
  actions: any[];
  verifications: any[];
}

interface CapaListProps {
  siteId: string;
  onCreateCapa?: () => void;
  onEditCapa?: (capaId: string) => void;
  onViewCapa?: (capaId: string) => void;
  onDeleteCapa?: (capaId: string) => void;
}

const CapaList: React.FC<CapaListProps> = ({
  siteId,
  onCreateCapa,
  onEditCapa,
  onViewCapa,
  onDeleteCapa,
}) => {
  const [capas, setCapas] = useState<CAPA[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState({
    status: undefined,
    riskLevel: undefined,
    ownerId: undefined,
    overdue: false,
  });
  const [searchText, setSearchText] = useState('');

  // Fetch CAPAs
  const fetchCapas = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.pageSize.toString(),
        ...(filters.status && { status: filters.status }),
        ...(filters.riskLevel && { riskLevel: filters.riskLevel }),
        ...(filters.ownerId && { ownerId: filters.ownerId }),
        ...(filters.overdue && { overdue: 'true' }),
      });

      const response = await fetch(`/api/site/${siteId}/capas?${params}`);
      const data = await response.json();

      if (data.success) {
        setCapas(data.data);
        setPagination((prev) => ({
          ...prev,
          total: data.pagination?.total || 0,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch CAPAs:', error);
      message.error('Failed to load CAPAs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCapas();
  }, [siteId, pagination.page, pagination.pageSize, filters]);

  // Filter local data by search text
  const filteredCapas = capas.filter(
    (capa) =>
      capa.capaNumber.toLowerCase().includes(searchText.toLowerCase()) ||
      capa.title.toLowerCase().includes(searchText.toLowerCase()) ||
      capa.ncrId.toLowerCase().includes(searchText.toLowerCase())
  );

  // Get status badge color
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'default',
      PLANNED: 'processing',
      IN_PROGRESS: 'processing',
      PENDING_VERIFICATION: 'warning',
      VERIFIED_EFFECTIVE: 'success',
      VERIFIED_INEFFECTIVE: 'error',
      CLOSED: 'success',
      CANCELLED: 'error',
    };
    return colors[status] || 'default';
  };

  // Get risk level color
  const getRiskColor = (risk: string) => {
    const colors: Record<string, string> = {
      LOW: 'green',
      MEDIUM: 'orange',
      HIGH: 'red',
      CRITICAL: 'red',
    };
    return colors[risk] || 'default';
  };

  // Check if overdue
  const isOverdue = (dueDate: string, status: string) => {
    if (['CLOSED', 'CANCELLED'].includes(status)) return false;
    return new Date(dueDate) < new Date();
  };

  const columns = [
    {
      title: 'CAPA #',
      dataIndex: 'capaNumber',
      key: 'capaNumber',
      width: 120,
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (text: string, record: CAPA) => (
        <Button
          type="link"
          onClick={() => onViewCapa?.(record.id)}
          style={{ padding: 0 }}
        >
          {text}
        </Button>
      ),
    },
    {
      title: 'NCR',
      dataIndex: 'ncrId',
      key: 'ncrId',
      width: 100,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: string) => (
        <Badge
          status={status === 'CLOSED' ? 'success' : status === 'CANCELLED' ? 'error' : 'processing'}
          text={status}
        />
      ),
      filters: [
        { text: 'Draft', value: 'DRAFT' },
        { text: 'Planned', value: 'PLANNED' },
        { text: 'In Progress', value: 'IN_PROGRESS' },
        { text: 'Pending Verification', value: 'PENDING_VERIFICATION' },
        { text: 'Verified Effective', value: 'VERIFIED_EFFECTIVE' },
        { text: 'Verified Ineffective', value: 'VERIFIED_INEFFECTIVE' },
        { text: 'Closed', value: 'CLOSED' },
        { text: 'Cancelled', value: 'CANCELLED' },
      ],
      onFilter: (value: any) => {
        setFilters((prev) => ({ ...prev, status: value }));
        return true;
      },
    },
    {
      title: 'Risk Level',
      dataIndex: 'riskLevel',
      key: 'riskLevel',
      width: 100,
      render: (risk: string) => (
        <Tag color={getRiskColor(risk)}>{risk}</Tag>
      ),
      filters: [
        { text: 'Low', value: 'LOW' },
        { text: 'Medium', value: 'MEDIUM' },
        { text: 'High', value: 'HIGH' },
        { text: 'Critical', value: 'CRITICAL' },
      ],
      onFilter: (value: any) => {
        setFilters((prev) => ({ ...prev, riskLevel: value }));
        return true;
      },
    },
    {
      title: 'Owner',
      key: 'owner',
      width: 150,
      render: (text: string, record: CAPA) => (
        <span>
          {record.owner?.firstName} {record.owner?.lastName}
        </span>
      ),
    },
    {
      title: 'Due Date',
      dataIndex: 'plannedDueDate',
      key: 'plannedDueDate',
      width: 120,
      render: (date: string, record: CAPA) => (
        <span style={{ color: isOverdue(date, record.status) ? 'red' : 'inherit' }}>
          {isOverdue(date, record.status) && <ClockCircleOutlined />}{' '}
          {dayjs(date).format('MM/DD/YYYY')}
        </span>
      ),
    },
    {
      title: 'Actions',
      dataIndex: 'actions',
      key: 'actions',
      width: 120,
      render: (text: string, record: CAPA) => (
        <Space size="small">
          <Button
            icon={<EyeOutlined />}
            size="small"
            onClick={() => onViewCapa?.(record.id)}
            title="View CAPA"
          />
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => onEditCapa?.(record.id)}
            title="Edit CAPA"
          />
          <Button
            icon={<DeleteOutlined />}
            size="small"
            danger
            onClick={() => {
              Modal.confirm({
                title: 'Delete CAPA',
                content: `Are you sure you want to delete ${record.capaNumber}?`,
                okText: 'Delete',
                okType: 'danger',
                onOk: () => onDeleteCapa?.(record.id),
              });
            }}
            title="Delete CAPA"
          />
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="CAPA Management"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onCreateCapa}
        >
          New CAPA
        </Button>
      }
    >
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Input.Search
            placeholder="Search by CAPA #, Title, or NCR"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Select
            placeholder="Filter by Status"
            value={filters.status}
            onChange={(value) =>
              setFilters((prev) => ({ ...prev, status: value }))
            }
            allowClear
            style={{ width: '100%' }}
            options={[
              { label: 'Draft', value: 'DRAFT' },
              { label: 'Planned', value: 'PLANNED' },
              { label: 'In Progress', value: 'IN_PROGRESS' },
              { label: 'Pending Verification', value: 'PENDING_VERIFICATION' },
              { label: 'Verified Effective', value: 'VERIFIED_EFFECTIVE' },
              { label: 'Verified Ineffective', value: 'VERIFIED_INEFFECTIVE' },
              { label: 'Closed', value: 'CLOSED' },
              { label: 'Cancelled', value: 'CANCELLED' },
            ]}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Select
            placeholder="Filter by Risk Level"
            value={filters.riskLevel}
            onChange={(value) =>
              setFilters((prev) => ({ ...prev, riskLevel: value }))
            }
            allowClear
            style={{ width: '100%' }}
            options={[
              { label: 'Low', value: 'LOW' },
              { label: 'Medium', value: 'MEDIUM' },
              { label: 'High', value: 'HIGH' },
              { label: 'Critical', value: 'CRITICAL' },
            ]}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Button
            block
            onClick={() =>
              setFilters((prev) => ({ ...prev, overdue: !prev.overdue }))
            }
            type={filters.overdue ? 'primary' : 'default'}
          >
            {filters.overdue ? 'Showing Overdue' : 'Show Overdue'}
          </Button>
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={filteredCapas}
        rowKey="id"
        loading={loading}
        pagination={{
          current: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onChange: (page, pageSize) => {
            setPagination({ page, pageSize, total: pagination.total });
          },
        }}
      />
    </Card>
  );
};

export default CapaList;
