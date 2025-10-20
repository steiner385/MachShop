/**
 * Routing List Component
 * Sprint 4: Routing Management UI
 *
 * Displays paginated list of routings with search, filters, and actions
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
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CopyOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useRoutingStore } from '@/store/routingStore';
import { useSite } from '@/contexts/SiteContext';
import { Routing, LIFECYCLE_STATE_COLORS, LIFECYCLE_STATE_LABELS } from '@/types/routing';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { isRoutingEditable } from '@/api/routing';
import { useAuthStore } from '@/store/AuthStore';

const { Search } = Input;
const { Option } = Select;

/**
 * Routing List Component
 *
 * Displays a table of routings with search, filter, and CRUD operations
 */
export const RoutingList: React.FC = () => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [lifecycleStateFilter, setLifecycleStateFilter] = useState<string | undefined>();
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>();
  const [isPrimaryFilter, setIsPrimaryFilter] = useState<boolean | undefined>();

  const { currentSite, allSites } = useSite();
  const { user } = useAuthStore();

  const {
    routings,
    isLoading,
    error,
    pagination,
    filters,
    fetchRoutings,
    setFilters,
    setPage,
    deleteRouting,
  } = useRoutingStore();

  // Fetch routings on mount and when current site changes
  useEffect(() => {
    fetchRoutings();
  }, [fetchRoutings]);

  // Update site filter when current site changes
  useEffect(() => {
    if (currentSite) {
      setFilters({ siteId: currentSite.id });
    }
  }, [currentSite, setFilters]);

  // Handle search
  const handleSearch = (value: string) => {
    setSearchText(value);
    setFilters({ search: value || undefined });
  };

  // Handle lifecycle state filter
  const handleLifecycleStateFilter = (value: string | undefined) => {
    setLifecycleStateFilter(value);
    setFilters({ lifecycleState: value as any });
  };

  // Handle active filter
  const handleActiveFilter = (value: boolean | undefined) => {
    setIsActiveFilter(value);
    setFilters({ isActive: value });
  };

  // Handle primary route filter
  const handlePrimaryFilter = (value: boolean | undefined) => {
    setIsPrimaryFilter(value);
    setFilters({ isPrimaryRoute: value });
  };

  // Handle site filter (separate from context site)
  const handleSiteFilter = (value: string | undefined) => {
    setFilters({ siteId: value || null });
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
      await deleteRouting(id);
      message.success('Routing deleted successfully');
    } catch (error: any) {
      message.error(error.message || 'Failed to delete routing');
    }
  };

  // Handle clone
  const handleClone = (routingId: string) => {
    navigate(`/routings/${routingId}/copy`);
  };

  // Get site name by ID
  const getSiteName = (siteId: string): string => {
    const site = allSites.find((s) => s.id === siteId);
    return site ? site.siteName : 'Unknown';
  };

  // Check if user has permission to create routings
  const canCreateRouting = user?.permissions?.includes('routing.write') || user?.permissions?.includes('processsegments.write') || false;

  // Table columns
  const columns: ColumnsType<Routing> = [
    {
      title: 'Routing Number',
      dataIndex: 'routingNumber',
      key: 'routingNumber',
      width: '15%',
      ellipsis: true,
      render: (text: string, record: Routing) => (
        <Space>
          <FileTextOutlined />
          <a onClick={() => navigate(`/routings/${record.id}`)}>{text}</a>
        </Space>
      ),
    },
    {
      title: 'Part',
      key: 'part',
      width: '18%',
      ellipsis: true,
      render: (_, record: Routing) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.part?.partNumber || 'N/A'}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{record.part?.partName || ''}</div>
        </div>
      ),
    },
    {
      title: 'Site',
      key: 'site',
      width: '12%',
      render: (_, record: Routing) => (
        <span>{record.site?.siteName || getSiteName(record.siteId)}</span>
      ),
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      width: '8%',
      align: 'center',
      sorter: true,
    },
    {
      title: 'State',
      dataIndex: 'lifecycleState',
      key: 'lifecycleState',
      width: '12%',
      render: (state: string) => (
        <Tag color={LIFECYCLE_STATE_COLORS[state as keyof typeof LIFECYCLE_STATE_COLORS]}>
          {LIFECYCLE_STATE_LABELS[state as keyof typeof LIFECYCLE_STATE_LABELS]}
        </Tag>
      ),
    },
    {
      title: 'Primary',
      dataIndex: 'isPrimaryRoute',
      key: 'isPrimaryRoute',
      width: '8%',
      align: 'center',
      render: (isPrimary: boolean) => (
        isPrimary ? <Badge status="success" text="Yes" /> : <Badge status="default" text="No" />
      ),
    },
    {
      title: 'Active',
      dataIndex: 'isActive',
      key: 'isActive',
      width: '8%',
      align: 'center',
      render: (isActive: boolean) => (
        isActive ? <Badge status="success" text="Yes" /> : <Badge status="error" text="No" />
      ),
    },
    {
      title: 'Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: '10%',
      sorter: true,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '12%',
      fixed: 'right',
      render: (_, record: Routing) => (
        <Space size="small">
          <Tooltip title="View">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/routings/${record.id}`)}
            />
          </Tooltip>

          {isRoutingEditable(record) && (
            <Tooltip title="Edit">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => navigate(`/routings/${record.id}/edit`)}
              />
            </Tooltip>
          )}

          <Tooltip title="Clone">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleClone(record.id)}
            />
          </Tooltip>

          {isRoutingEditable(record) && (
            <Tooltip title="Delete">
              <Popconfirm
                title="Are you sure you want to delete this routing?"
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
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1>Routing Management</h1>
        <p style={{ color: '#666', marginTop: '8px' }}>
          Create and manage manufacturing routings across multiple sites
        </p>
      </div>

      {/* Filters and Actions */}
      <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Top Row: Search and Create Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
          <Search
            placeholder="Search by routing number or part number"
            allowClear
            enterButton={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={handleSearch}
            style={{ width: '400px' }}
          />

          <Tooltip title={!canCreateRouting ? "You don't have permission to create routings" : ""}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/routings/create')}
              size="large"
              disabled={!canCreateRouting}
            >
              Create New Routing
            </Button>
          </Tooltip>
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
            placeholder="Filter by lifecycle state"
            allowClear
            value={lifecycleStateFilter}
            onChange={handleLifecycleStateFilter}
            style={{ width: '180px' }}
          >
            <Option value="DRAFT">Draft</Option>
            <Option value="REVIEW">In Review</Option>
            <Option value="RELEASED">Released</Option>
            <Option value="PRODUCTION">Production</Option>
            <Option value="OBSOLETE">Obsolete</Option>
          </Select>

          <Select
            placeholder="Filter by active status"
            allowClear
            value={isActiveFilter}
            onChange={handleActiveFilter}
            style={{ width: '150px' }}
          >
            <Option value={true}>Active Only</Option>
            <Option value={false}>Inactive Only</Option>
          </Select>

          <Select
            placeholder="Filter by primary route"
            allowClear
            value={isPrimaryFilter}
            onChange={handlePrimaryFilter}
            style={{ width: '150px' }}
          >
            <Option value={true}>Primary Only</Option>
            <Option value={false}>Alternate Only</Option>
          </Select>
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
        dataSource={routings}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: pagination.page,
          pageSize: pagination.limit,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} routings`,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        onChange={handleTableChange}
        scroll={{ x: 1400 }}
        bordered
      />
    </div>
  );
};

export default RoutingList;
