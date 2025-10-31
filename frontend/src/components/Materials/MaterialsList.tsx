/**
 * Materials List Component
 * Complete material inventory management with real-time tracking and RBAC integration
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
} from 'antd';
import {
  InboxOutlined,
  BarcodeOutlined,
  DatabaseOutlined,
  WarningOutlined,
  ReloadOutlined,
  SearchOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useMaterialsStore } from '@/store/materialsStore';
import {
  MaterialDefinition,
  MaterialLot,
  MATERIAL_TYPE_LABELS,
  MATERIAL_TYPE_COLORS,
  LOT_STATUS_LABELS,
  LOT_STATUS_COLORS,
  MaterialType,
  MaterialLotStatus,
} from '@/types/materials';
import type { ColumnsType } from 'antd/es/table';
import { usePermissionCheck } from '@/store/AuthStore';
import { PERMISSIONS } from '@/types/auth';

const { Search } = Input;
const { Option } = Select;

export const MaterialsList: React.FC = () => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<MaterialType | undefined>();
  const [statusFilter, setStatusFilter] = useState<MaterialLotStatus | undefined>();
  const [viewMode, setViewMode] = useState<'definitions' | 'lots'>('lots');
  const { hasPermission } = usePermissionCheck();

  const {
    definitions,
    lots,
    statistics,
    expiringSoon,
    definitionsLoading,
    lotsLoading,
    statisticsLoading,
    definitionsError,
    lotsError,
    statisticsError,
    fetchDefinitions,
    fetchLots,
    fetchDashboard,
    setDefinitionFilters,
    setLotFilters,
    clearErrors,
  } = useMaterialsStore();

  // Set document title and fetch data on mount
  useEffect(() => {
    document.title = 'Materials Management - MES';
    fetchDashboard();
  }, []);

  // Fetch filtered data when filters change
  useEffect(() => {
    if (viewMode === 'definitions') {
      const filters: any = {};
      if (typeFilter) filters.materialType = typeFilter;
      if (searchText) filters.searchText = searchText;
      setDefinitionFilters(filters);
      fetchDefinitions(filters);
    } else {
      const filters: any = {};
      if (statusFilter) filters.status = statusFilter;
      if (searchText) filters.searchText = searchText;
      setLotFilters(filters);
      fetchLots(filters);
    }
  }, [searchText, typeFilter, statusFilter, viewMode]);

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
    if (definitionsError) {
      message.error(definitionsError);
    }
    if (lotsError) {
      message.error(lotsError);
    }
    if (statisticsError) {
      message.error(statisticsError);
    }
    // Clear errors after displaying
    if (definitionsError || lotsError || statisticsError) {
      setTimeout(() => clearErrors(), 3000);
    }
  }, [definitionsError, lotsError, statisticsError]);

  // Material Definitions Table Columns
  const definitionColumns: ColumnsType<MaterialDefinition> = [
    {
      title: 'Material Number',
      dataIndex: 'materialNumber',
      key: 'materialNumber',
      width: 150,
      fixed: 'left',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: 'Material Name',
      dataIndex: 'materialName',
      key: 'materialName',
      width: 250,
      ellipsis: true,
    },
    {
      title: 'Type',
      dataIndex: 'materialType',
      key: 'materialType',
      width: 150,
      render: (type: MaterialType) => (
        <Tag color={MATERIAL_TYPE_COLORS[type]}>
          {MATERIAL_TYPE_LABELS[type]}
        </Tag>
      ),
    },
    {
      title: 'UOM',
      dataIndex: 'baseUnitOfMeasure',
      key: 'baseUnitOfMeasure',
      width: 80,
    },
    {
      title: 'Grade/Spec',
      key: 'grade',
      width: 150,
      render: (_, record) => (
        <span>{record.materialGrade || record.specification || 'N/A'}</span>
      ),
    },
    {
      title: 'Stock Levels',
      key: 'stock',
      width: 150,
      render: (_, record) => (
        <div>
          {record.minimumStock && (
            <div style={{ fontSize: '12px' }}>
              Min: {record.minimumStock} {record.baseUnitOfMeasure}
            </div>
          )}
          {record.reorderPoint && (
            <div style={{ fontSize: '12px' }}>
              Reorder: {record.reorderPoint} {record.baseUnitOfMeasure}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Active Lots',
      key: 'lots',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <Tag color="blue">{record.lots?.length || 0}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record) => {
        const canView = hasPermission(PERMISSIONS.MATERIALS_READ);

        return (
          <Tooltip title={!canView ? "No permission to view material details" : "View Details"}>
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              disabled={!canView}
              onClick={() => navigate(`/materials/definitions/${record.id}`)}
            >
              View
            </Button>
          </Tooltip>
        );
      },
    },
  ];

  // Material Lots Table Columns
  const lotColumns: ColumnsType<MaterialLot> = [
    {
      title: 'Lot Number',
      dataIndex: 'lotNumber',
      key: 'lotNumber',
      width: 150,
      fixed: 'left',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: 'Material',
      key: 'material',
      width: 200,
      ellipsis: true,
      render: (_, record) => (
        <div>
          <div>{record.material?.materialName}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.material?.materialNumber}
          </div>
        </div>
      ),
    },
    {
      title: 'Quantity',
      key: 'quantity',
      width: 150,
      render: (_, record) => (
        <div>
          <div>
            <strong>{record.currentQuantity}</strong> / {record.originalQuantity} {record.unitOfMeasure}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {Math.round((record.currentQuantity / record.originalQuantity) * 100)}% remaining
          </div>
        </div>
      ),
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      width: 150,
      render: (location) => location || 'N/A',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: MaterialLotStatus) => (
        <Tag color={LOT_STATUS_COLORS[status]}>
          {LOT_STATUS_LABELS[status]}
        </Tag>
      ),
    },
    {
      title: 'Received Date',
      dataIndex: 'receivedDate',
      key: 'receivedDate',
      width: 120,
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Expiration',
      dataIndex: 'expirationDate',
      key: 'expirationDate',
      width: 120,
      render: (date) => {
        if (!date) return 'N/A';
        const expirationDate = new Date(date);
        const now = new Date();
        const daysUntilExpiration = Math.floor(
          (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        const isExpired = daysUntilExpiration < 0;
        const isExpiringSoon = daysUntilExpiration >= 0 && daysUntilExpiration <= 30;

        return (
          <div>
            <div>{expirationDate.toLocaleDateString()}</div>
            {isExpired && (
              <Tag color="error" style={{ fontSize: '10px', marginTop: '4px' }}>
                EXPIRED
              </Tag>
            )}
            {isExpiringSoon && (
              <Tag color="warning" style={{ fontSize: '10px', marginTop: '4px' }}>
                {daysUntilExpiration} days
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record) => {
        const canView = hasPermission(PERMISSIONS.MATERIALS_READ);

        return (
          <Tooltip title={!canView ? "No permission to view lot details" : "View Details"}>
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              disabled={!canView}
              onClick={() => navigate(`/materials/lots/${record.id}`)}
            >
              View
            </Button>
          </Tooltip>
        );
      },
    },
  ];

  const isLoading = definitionsLoading || lotsLoading || statisticsLoading;

  return (
    <main style={{ padding: '24px' }}>
      {/* Header */}
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '600', marginBottom: '8px' }}>
          <InboxOutlined style={{ marginRight: 8 }} />
          Materials Management
        </h1>
        <p style={{ color: '#666', marginTop: '8px', fontSize: '16px' }}>
          Comprehensive material inventory management, lot traceability, and transaction tracking
        </p>
      </header>

      {/* Statistics Dashboard */}
      <section aria-labelledby="statistics-heading" style={{ marginBottom: '24px' }}>
        <h2 id="statistics-heading" className="sr-only">Materials Statistics</h2>
        <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Materials"
              value={statistics?.totalDefinitions || 0}
              prefix={<DatabaseOutlined />}
              valueStyle={{ color: '#1890ff' }}
              loading={statisticsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Active Lots"
              value={statistics?.totalActiveLots || 0}
              prefix={<BarcodeOutlined />}
              valueStyle={{ color: '#52c41a' }}
              loading={statisticsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Low Stock Items"
              value={statistics?.lowStockCount || 0}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#faad14' }}
              loading={statisticsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Expiring Soon"
              value={statistics?.expiringSoonCount || 0}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
              loading={statisticsLoading}
            />
          </Card>
        </Col>
        </Row>
      </section>

      {/* Alert for expiring items */}
      {expiringSoon.length > 0 && (
        <Alert
          message={`${expiringSoon.length} lots expiring in the next 30 days`}
          description="Review expiring lots and plan accordingly"
          type="warning"
          showIcon
          closable
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* Filters and Actions */}
      <Card style={{ marginBottom: '16px' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Select
              value={viewMode}
              onChange={setViewMode}
              style={{ width: '100%' }}
            >
              <Option value="lots">Material Lots</Option>
              <Option value="definitions">Material Definitions</Option>
            </Select>
          </Col>

          <Col xs={24} sm={12} md={8}>
            <Search
              placeholder={viewMode === 'lots' ? 'Search lots...' : 'Search materials...'}
              allowClear
              enterButton={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={handleSearch}
              style={{ width: '100%' }}
            />
          </Col>

          <Col xs={24} sm={12} md={6}>
            {viewMode === 'definitions' ? (
              <Select
                placeholder="Filter by type"
                allowClear
                value={typeFilter}
                onChange={setTypeFilter}
                style={{ width: '100%' }}
              >
                {Object.entries(MATERIAL_TYPE_LABELS).map(([key, label]) => (
                  <Option key={key} value={key}>
                    {label}
                  </Option>
                ))}
              </Select>
            ) : (
              <Select
                placeholder="Filter by status"
                allowClear
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: '100%' }}
              >
                {Object.entries(LOT_STATUS_LABELS).map(([key, label]) => (
                  <Option key={key} value={key}>
                    {label}
                  </Option>
                ))}
              </Select>
            )}
          </Col>

          <Col xs={24} sm={12} md={4}>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              style={{ width: '100%' }}
            >
              Refresh
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Material Management Section */}
      <section aria-labelledby="materials-heading">
        <Card title={
          <h2 id="materials-heading" style={{ margin: 0, fontSize: '18px' }}>
            {viewMode === 'lots' ? 'Material Lots' : 'Material Definitions'}
          </h2>
        }>
        <Spin spinning={isLoading}>
          {viewMode === 'lots' ? (
            <Table<MaterialLot>
              columns={lotColumns}
              dataSource={lots}
              rowKey="id"
              loading={isLoading}
              pagination={{
                showSizeChanger: true,
                showTotal: (total) => `Total ${total} lots`,
                pageSizeOptions: ['10', '20', '50', '100'],
              }}
              scroll={{ x: 1200 }}
              bordered
              locale={{
                emptyText: isLoading ? 'Loading...' : 'No lots found',
              }}
            />
          ) : (
            <Table<MaterialDefinition>
              columns={definitionColumns}
              dataSource={definitions}
              rowKey="id"
              loading={isLoading}
              pagination={{
                showSizeChanger: true,
                showTotal: (total) => `Total ${total} materials`,
                pageSizeOptions: ['10', '20', '50', '100'],
              }}
              scroll={{ x: 1200 }}
              bordered
              locale={{
                emptyText: isLoading ? 'Loading...' : 'No materials found',
              }}
            />
          )}
        </Spin>
        </Card>
      </section>
    </main>
  );
};

export default MaterialsList;
