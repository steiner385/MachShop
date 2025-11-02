/**
 * DataTableTemplate - Data table scaffold
 *
 * Use this template for creating data tables with sorting and filtering.
 */

import React, { useState, useMemo } from 'react';
import {
  Table,
  Card,
  Button,
  Space,
  Input,
  Tag
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { usePermissions } from '@/hooks/usePermissions';
import styles from './DataTableTemplate.module.css';

/**
 * TODO: Define your data record interface
 */
export interface DataRecord {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  // Add more fields as needed
}

/**
 * TODO: Define component props
 */
export interface DataTableTemplateProps {
  dataSource?: DataRecord[];
  loading?: boolean;
  onEdit?: (record: DataRecord) => void;
  onDelete?: (record: DataRecord) => void;
  onCreate?: () => void;
}

/**
 * DataTableTemplate
 *
 * TODO: Add description
 */
export const DataTableTemplate: React.FC<DataTableTemplateProps> = ({
  dataSource = [],
  loading = false,
  onEdit,
  onDelete,
  onCreate,
}) => {
  const { hasPermission } = usePermissions();
  const [searchText, setSearchText] = useState('');

  // TODO: Update permissions
  const canEdit = hasPermission('data:write');
  const canDelete = hasPermission('data:delete');

  /**
   * TODO: Define your table columns
   */
  const columns: ColumnsType<DataRecord> = useMemo(() => [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'success' : 'default'}>
          {status.toUpperCase()}
        </Tag>
      ),
      filters: [
        { text: 'Active', value: 'active' },
        { text: 'Inactive', value: 'inactive' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          {canEdit && onEdit && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit(record)}
            />
          )}
          {canDelete && onDelete && (
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => onDelete(record)}
            />
          )}
        </Space>
      ),
    },
    // TODO: Add more columns as needed
  ], [canEdit, canDelete, onEdit, onDelete]);

  /**
   * Filter data based on search
   */
  const filteredData = useMemo(() => {
    if (!searchText) return dataSource;

    return dataSource.filter(record =>
      record.name.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [dataSource, searchText]);

  return (
    <Card className={styles.container}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <Input
          placeholder="Search..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{ width: 250 }}
        />

        {canEdit && onCreate && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onCreate}
          >
            Create New
          </Button>
        )}
      </div>

      {/* Table */}
      <Table<DataRecord>
        columns={columns}
        dataSource={filteredData}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} items`,
        }}
      />
    </Card>
  );
};

DataTableTemplate.displayName = 'DataTableTemplate';

export default DataTableTemplate;
