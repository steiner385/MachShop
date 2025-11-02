/**
 * DataTableWithFiltering - Advanced table component example
 *
 * This example demonstrates:
 * - Ant Design Table component
 * - Sorting and filtering
 * - Pagination with server-side data
 * - Bulk actions and row selection
 * - Empty states
 * - Loading states
 * - Custom column rendering
 * - Responsive design
 *
 * @example
 * <DataTableWithFiltering
 *   dataSource={data}
 *   onRowAction={handleAction}
 * />
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Table,
  Card,
  Input,
  Button,
  Space,
  Tag,
  Dropdown,
  Modal,
  message,
  Tooltip,
  Badge,
  Select,
  DatePicker,
  Row,
  Col
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { FilterValue, SorterResult } from 'antd/es/table/interface';
import {
  SearchOutlined,
  FilterOutlined,
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
  DownloadOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useTheme } from '@/hooks/useTheme';
import { usePermissions } from '@/hooks/usePermissions';
import styles from './DataTableWithFiltering.module.css';

const { RangePicker } = DatePicker;

/**
 * Data record interface
 */
export interface DataRecord {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'pending' | 'error';
  category: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

/**
 * Table filters
 */
export interface TableFilters {
  search?: string;
  status?: string[];
  category?: string[];
  dateRange?: [string, string];
}

/**
 * Component props
 */
export interface DataTableWithFilteringProps {
  /** Data source for table */
  dataSource?: DataRecord[];

  /** Loading state */
  loading?: boolean;

  /** Total records (for server-side pagination) */
  total?: number;

  /** Callback when table state changes */
  onChange?: (
    pagination: TablePaginationConfig,
    filters: Record<string, FilterValue | null>,
    sorter: SorterResult<DataRecord> | SorterResult<DataRecord>[]
  ) => void;

  /** Callback for row actions */
  onRowAction?: (action: string, record: DataRecord) => void;

  /** Callback for bulk actions */
  onBulkAction?: (action: string, selectedRows: DataRecord[]) => void;

  /** Enable row selection */
  enableSelection?: boolean;
}

/**
 * DataTableWithFiltering Component
 *
 * Advanced table with filtering, sorting, pagination, and bulk actions.
 */
export const DataTableWithFiltering: React.FC<DataTableWithFilteringProps> = ({
  dataSource = [],
  loading = false,
  total,
  onChange,
  onRowAction,
  onBulkAction,
  enableSelection = true,
}) => {
  const { theme } = useTheme();
  const { hasPermission } = usePermissions();

  // State
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<TableFilters>({});
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    showSizeChanger: true,
    showTotal: (total) => `Total ${total} items`,
  });

  // Permissions
  const canEdit = hasPermission('data:write');
  const canDelete = hasPermission('data:delete');

  /**
   * Get status color based on status value
   */
  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      active: 'success',
      inactive: 'default',
      pending: 'warning',
      error: 'error',
    };
    return colors[status] || 'default';
  };

  /**
   * Handle table change (pagination, filters, sorter)
   */
  const handleTableChange = useCallback((
    newPagination: TablePaginationConfig,
    newFilters: Record<string, FilterValue | null>,
    sorter: SorterResult<DataRecord> | SorterResult<DataRecord>[]
  ) => {
    setPagination(newPagination);

    if (onChange) {
      onChange(newPagination, newFilters, sorter);
    }
  }, [onChange]);

  /**
   * Handle search
   */
  const handleSearch = useCallback((value: string) => {
    setSearchText(value);
    setFilters(prev => ({ ...prev, search: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  /**
   * Handle filter change
   */
  const handleFilterChange = useCallback((key: keyof TableFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  /**
   * Clear all filters
   */
  const handleClearFilters = useCallback(() => {
    setSearchText('');
    setFilters({});
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  /**
   * Handle row action
   */
  const handleRowAction = useCallback((action: string, record: DataRecord) => {
    if (onRowAction) {
      onRowAction(action, record);
    }
  }, [onRowAction]);

  /**
   * Handle bulk action
   */
  const handleBulkAction = useCallback((action: string) => {
    const selectedRows = dataSource.filter(record =>
      selectedRowKeys.includes(record.id)
    );

    if (selectedRows.length === 0) {
      message.warning('Please select at least one row');
      return;
    }

    if (action === 'delete') {
      Modal.confirm({
        title: 'Confirm Delete',
        content: `Are you sure you want to delete ${selectedRows.length} item(s)?`,
        okText: 'Delete',
        okType: 'danger',
        onOk: () => {
          if (onBulkAction) {
            onBulkAction(action, selectedRows);
          }
          setSelectedRowKeys([]);
        },
      });
    } else {
      if (onBulkAction) {
        onBulkAction(action, selectedRows);
      }
    }
  }, [dataSource, selectedRowKeys, onBulkAction]);

  /**
   * Table columns definition
   */
  const columns: ColumnsType<DataRecord> = useMemo(() => [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      width: 200,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span style={{ fontWeight: 500 }}>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      filters: [
        { text: 'Active', value: 'active' },
        { text: 'Inactive', value: 'inactive' },
        { text: 'Pending', value: 'pending' },
        { text: 'Error', value: 'error' },
      ],
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 150,
      filters: [
        { text: 'Production', value: 'production' },
        { text: 'Quality', value: 'quality' },
        { text: 'Maintenance', value: 'maintenance' },
        { text: 'Inventory', value: 'inventory' },
      ],
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 120,
      sorter: true,
      align: 'right',
      render: (value: number) => value.toLocaleString(),
    },
    {
      title: 'Tags',
      dataIndex: 'tags',
      key: 'tags',
      width: 200,
      render: (tags: string[]) => (
        <>
          {tags?.map(tag => (
            <Tag key={tag} style={{ marginBottom: '4px' }}>
              {tag}
            </Tag>
          ))}
        </>
      ),
    },
    {
      title: 'Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      sorter: true,
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {canEdit && (
            <Tooltip title="Edit">
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleRowAction('edit', record)}
              />
            </Tooltip>
          )}
          {canDelete && (
            <Tooltip title="Delete">
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleRowAction('delete', record)}
              />
            </Tooltip>
          )}
          <Dropdown
            menu={{
              items: [
                {
                  key: 'view',
                  label: 'View Details',
                  onClick: () => handleRowAction('view', record),
                },
                {
                  key: 'duplicate',
                  label: 'Duplicate',
                  onClick: () => handleRowAction('duplicate', record),
                },
                {
                  key: 'export',
                  label: 'Export',
                  onClick: () => handleRowAction('export', record),
                },
              ],
            }}
          >
            <Button type="link" size="small" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      ),
    },
  ], [canEdit, canDelete, handleRowAction]);

  /**
   * Row selection configuration
   */
  const rowSelection = enableSelection ? {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
    selections: [
      Table.SELECTION_ALL,
      Table.SELECTION_INVERT,
      Table.SELECTION_NONE,
    ],
  } : undefined;

  /**
   * Filter data based on search and filters
   */
  const filteredData = useMemo(() => {
    let result = [...dataSource];

    // Apply search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(record =>
        record.name.toLowerCase().includes(search) ||
        record.category.toLowerCase().includes(search)
      );
    }

    // Apply status filter
    if (filters.status && filters.status.length > 0) {
      result = result.filter(record => filters.status!.includes(record.status));
    }

    // Apply category filter
    if (filters.category && filters.category.length > 0) {
      result = result.filter(record => filters.category!.includes(record.category));
    }

    return result;
  }, [dataSource, filters]);

  return (
    <Card className={styles.container}>
      {/* Filters and Actions Bar */}
      <div className={styles.toolbar}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Input
              placeholder="Search by name or category..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={e => handleSearch(e.target.value)}
              allowClear
            />
          </Col>

          <Col xs={24} md={16}>
            <Space wrap style={{ float: 'right' }}>
              <Button
                icon={<FilterOutlined />}
                onClick={handleClearFilters}
              >
                Clear Filters
              </Button>

              <Button
                icon={<ReloadOutlined />}
                onClick={() => onChange?.(pagination, {}, {})}
              >
                Refresh
              </Button>

              <Button
                type="primary"
                icon={<DownloadOutlined />}
              >
                Export
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Bulk Actions Bar (shown when rows are selected) */}
      {selectedRowKeys.length > 0 && (
        <div className={styles.bulkActions}>
          <Space>
            <Badge count={selectedRowKeys.length} showZero>
              <span style={{ marginRight: '8px' }}>Selected:</span>
            </Badge>

            {canDelete && (
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleBulkAction('delete')}
              >
                Delete
              </Button>
            )}

            <Button onClick={() => handleBulkAction('export')}>
              Export Selected
            </Button>

            <Button onClick={() => setSelectedRowKeys([])}>
              Clear Selection
            </Button>
          </Space>
        </div>
      )}

      {/* Table */}
      <Table<DataRecord>
        className={styles.table}
        columns={columns}
        dataSource={filteredData}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          total: total || filteredData.length,
        }}
        onChange={handleTableChange}
        rowSelection={rowSelection}
        scroll={{ x: 1200 }}
        locale={{
          emptyText: (
            <div style={{ padding: theme.tokens.marginXL }}>
              <p style={{ fontSize: theme.tokens.fontSizeHeading4, marginBottom: theme.tokens.marginSM }}>
                No data available
              </p>
              <p style={{ color: theme.tokens.colorTextSecondary }}>
                {filters.search || filters.status || filters.category
                  ? 'Try adjusting your filters'
                  : 'Start by adding some data'}
              </p>
            </div>
          ),
        }}
      />
    </Card>
  );
};

DataTableWithFiltering.displayName = 'DataTableWithFiltering';

export default DataTableWithFiltering;
