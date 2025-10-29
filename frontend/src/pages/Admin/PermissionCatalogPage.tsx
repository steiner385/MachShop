/**
 * Permission Catalog Page for RBAC Admin UI
 * Created for GitHub Issue #124 - Admin UI for Role and Permission Management
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Switch,
  Space,
  Modal,
  Form,
  message,
  Tooltip,
  Tag,
  Typography,
  Row,
  Col,
  Popconfirm,
  Badge,
  Divider,
  Tree,
  Collapse,
  List,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  KeyOutlined,
  GroupOutlined,
  StarOutlined,
  ApartmentOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rbacAPI } from '@/api/rbac';
import {
  Permission,
  CreatePermissionRequest,
  UpdatePermissionRequest,
  PermissionFilters,
} from '@/types/rbac';

const { Title, Text } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

interface PermissionFormProps {
  permission?: Permission;
  visible: boolean;
  onCancel: () => void;
  onSubmit: (values: any) => void;
  loading: boolean;
}

const PermissionForm: React.FC<PermissionFormProps> = ({
  permission,
  visible,
  onCancel,
  onSubmit,
  loading,
}) => {
  const [form] = Form.useForm();

  // Get permission categories for the selector
  const { data: categories } = useQuery({
    queryKey: ['permission-categories'],
    queryFn: () => rbacAPI.getPermissionCategories(),
    enabled: visible,
  });

  useEffect(() => {
    if (visible && permission) {
      form.setFieldsValue({
        permissionCode: permission.permissionCode,
        permissionName: permission.permissionName,
        description: permission.description || '',
        category: permission.category || '',
        isWildcard: permission.isWildcard,
      });
    } else if (visible) {
      form.resetFields();
    }
  }, [visible, permission, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      onSubmit(values);
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

  return (
    <Modal
      title={permission ? 'Edit Permission' : 'Create New Permission'}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={600}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          isWildcard: false,
        }}
      >
        <Form.Item
          label="Permission Code"
          name="permissionCode"
          rules={[
            { required: true, message: 'Permission code is required' },
            {
              pattern: /^[a-zA-Z0-9_.*-]+$/,
              message: 'Permission code can only contain letters, numbers, underscores, dots, asterisks, and hyphens',
            },
          ]}
          tooltip="Use dots to separate categories (e.g., workorders.read). Use * for wildcards (e.g., workorders.*)"
        >
          <Input
            placeholder="e.g., workorders.read or workorders.*"
            disabled={!!permission} // Cannot change permission code when editing
          />
        </Form.Item>

        <Form.Item
          label="Permission Name"
          name="permissionName"
          rules={[{ required: true, message: 'Permission name is required' }]}
        >
          <Input placeholder="e.g., Read Work Orders" />
        </Form.Item>

        <Form.Item label="Description" name="description">
          <Input.TextArea
            rows={3}
            placeholder="Brief description of what this permission allows"
          />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Category" name="category">
              <Select
                placeholder="Select or enter category"
                allowClear
                showSearch
                mode="combobox"
              >
                {categories?.map((category) => (
                  <Option key={category} value={category}>
                    {category}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Wildcard Permission"
              name="isWildcard"
              valuePropName="checked"
              tooltip="Wildcard permissions grant access to multiple specific permissions (e.g., workorders.* grants workorders.read, workorders.write, etc.)"
            >
              <Switch checkedChildren="Wildcard" unCheckedChildren="Specific" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

const PermissionCatalogPage: React.FC = () => {
  const [filters, setFilters] = useState<PermissionFilters>({});
  const [pagination, setPagination] = useState({ page: 1, limit: 20 });
  const [selectedPermission, setSelectedPermission] = useState<Permission | undefined>();
  const [formVisible, setFormVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'category'>('table');

  const queryClient = useQueryClient();

  // Query for permissions list
  const {
    data: permissionsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['permissions', filters, pagination],
    queryFn: () => rbacAPI.getPermissions({ ...filters, ...pagination }),
    keepPreviousData: true,
  });

  // Get permission categories
  const { data: categories } = useQuery({
    queryKey: ['permission-categories'],
    queryFn: () => rbacAPI.getPermissionCategories(),
  });

  // Create permission mutation
  const createPermissionMutation = useMutation({
    mutationFn: (permissionData: CreatePermissionRequest) =>
      rbacAPI.createPermission(permissionData),
    onSuccess: () => {
      message.success('Permission created successfully');
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      queryClient.invalidateQueries({ queryKey: ['permission-categories'] });
      setFormVisible(false);
    },
    onError: (error: Error) => {
      message.error(`Failed to create permission: ${error.message}`);
    },
  });

  // Update permission mutation
  const updatePermissionMutation = useMutation({
    mutationFn: (data: { permissionId: string; permissionData: UpdatePermissionRequest }) =>
      rbacAPI.updatePermission(data.permissionId, data.permissionData),
    onSuccess: () => {
      message.success('Permission updated successfully');
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      setFormVisible(false);
      setSelectedPermission(undefined);
    },
    onError: (error: Error) => {
      message.error(`Failed to update permission: ${error.message}`);
    },
  });

  // Delete permission mutation
  const deletePermissionMutation = useMutation({
    mutationFn: (permissionId: string) => rbacAPI.deletePermission(permissionId),
    onSuccess: () => {
      message.success('Permission deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    },
    onError: (error: Error) => {
      message.error(`Failed to delete permission: ${error.message}`);
    },
  });

  const handleCreate = () => {
    setSelectedPermission(undefined);
    setFormVisible(true);
  };

  const handleEdit = (permission: Permission) => {
    setSelectedPermission(permission);
    setFormVisible(true);
  };

  const handleDelete = (permissionId: string) => {
    deletePermissionMutation.mutate(permissionId);
  };

  const handleFormSubmit = (values: any) => {
    if (selectedPermission) {
      updatePermissionMutation.mutate({
        permissionId: selectedPermission.id,
        permissionData: values,
      });
    } else {
      createPermissionMutation.mutate(values);
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page when filtering
  };

  const handleTableChange = (tablePagination: any) => {
    setPagination({
      page: tablePagination.current,
      limit: tablePagination.pageSize,
    });
  };

  // Group permissions by category for category view
  const permissionsByCategory = React.useMemo(() => {
    const permissions = permissionsData?.permissions || [];
    const grouped: Record<string, Permission[]> = {};

    permissions.forEach((permission) => {
      const category = permission.category || 'Uncategorized';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(permission);
    });

    return grouped;
  }, [permissionsData]);

  const columns = [
    {
      title: 'Permission Code',
      dataIndex: 'permissionCode',
      key: 'permissionCode',
      sorter: true,
      render: (text: string, record: Permission) => (
        <Space>
          <Text code style={{ fontWeight: 'bold' }}>
            {text}
          </Text>
          {record.isWildcard && <Tag color="orange">Wildcard</Tag>}
          {!record.isActive && <Tag color="red">Inactive</Tag>}
        </Space>
      ),
    },
    {
      title: 'Permission Name',
      dataIndex: 'permissionName',
      key: 'permissionName',
      sorter: true,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) =>
        category ? (
          <Tag color="blue">{category}</Tag>
        ) : (
          <Text type="secondary">Uncategorized</Text>
        ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string) => text || <Text type="secondary">No description</Text>,
    },
    {
      title: 'Type',
      dataIndex: 'isWildcard',
      key: 'isWildcard',
      render: (isWildcard: boolean) => (
        <Tag color={isWildcard ? 'orange' : 'green'} icon={isWildcard ? <StarOutlined /> : <KeyOutlined />}>
          {isWildcard ? 'Wildcard' : 'Specific'}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Badge status={isActive ? 'success' : 'error'} text={isActive ? 'Active' : 'Inactive'} />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record: Permission) => (
        <Space>
          <Tooltip title="Edit Permission">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete Permission"
            description="Are you sure you want to delete this permission? This action cannot be undone."
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete Permission">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                loading={deletePermissionMutation.isLoading}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (error) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Text type="danger">Failed to load permissions: {(error as Error).message}</Text>
          <br />
          <Button onClick={() => refetch()} style={{ marginTop: '16px' }}>
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <div>
          <Title level={2}>
            <KeyOutlined style={{ marginRight: 8 }} />
            Permission Catalog
          </Title>
          <Text type="secondary">
            Manage system permissions. Permissions define specific actions that can be performed in the system.
          </Text>
        </div>

        {/* Filters and Actions */}
        <Card>
          <Row gutter={16} align="middle">
            <Col flex="auto">
              <Space wrap>
                <Input
                  placeholder="Search permissions..."
                  prefix={<SearchOutlined />}
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  style={{ width: 250 }}
                  allowClear
                />
                <Select
                  placeholder="Filter by category"
                  value={filters.category}
                  onChange={(value) => handleFilterChange('category', value)}
                  style={{ width: 150 }}
                  allowClear
                >
                  {categories?.map((category) => (
                    <Option key={category} value={category}>
                      {category}
                    </Option>
                  ))}
                </Select>
                <Select
                  placeholder="Filter by type"
                  value={filters.isWildcard}
                  onChange={(value) => handleFilterChange('isWildcard', value)}
                  style={{ width: 150 }}
                  allowClear
                >
                  <Option value={true}>Wildcard</Option>
                  <Option value={false}>Specific</Option>
                </Select>
                <Select
                  placeholder="Filter by status"
                  value={filters.isActive}
                  onChange={(value) => handleFilterChange('isActive', value)}
                  style={{ width: 150 }}
                  allowClear
                >
                  <Option value={true}>Active</Option>
                  <Option value={false}>Inactive</Option>
                </Select>
              </Space>
            </Col>
            <Col>
              <Space>
                <Select
                  value={viewMode}
                  onChange={setViewMode}
                  style={{ width: 120 }}
                >
                  <Option value="table">Table View</Option>
                  <Option value="category">Category View</Option>
                </Select>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => refetch()}
                  loading={isLoading}
                >
                  Refresh
                </Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                  Create Permission
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Content based on view mode */}
        {viewMode === 'table' ? (
          <Card>
            <Table
              columns={columns}
              dataSource={permissionsData?.permissions || []}
              rowKey="id"
              loading={isLoading}
              pagination={{
                current: pagination.page,
                pageSize: pagination.limit,
                total: permissionsData?.total || 0,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} permissions`,
              }}
              onChange={handleTableChange}
            />
          </Card>
        ) : (
          <Card>
            {Object.keys(permissionsByCategory).length === 0 ? (
              <Empty description="No permissions found" />
            ) : (
              <Collapse defaultActiveKey={Object.keys(permissionsByCategory)} ghost>
                {Object.entries(permissionsByCategory).map(([category, permissions]) => (
                  <Panel
                    key={category}
                    header={
                      <Space>
                        <GroupOutlined />
                        <Text strong>{category}</Text>
                        <Badge count={permissions.length} showZero color="blue" />
                      </Space>
                    }
                  >
                    <List
                      dataSource={permissions}
                      renderItem={(permission) => (
                        <List.Item
                          actions={[
                            <Button
                              key="edit"
                              type="text"
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => handleEdit(permission)}
                            />,
                            <Popconfirm
                              key="delete"
                              title="Delete Permission"
                              description="Are you sure you want to delete this permission?"
                              onConfirm={() => handleDelete(permission.id)}
                              okText="Yes"
                              cancelText="No"
                            >
                              <Button
                                type="text"
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                loading={deletePermissionMutation.isLoading}
                              />
                            </Popconfirm>,
                          ]}
                        >
                          <List.Item.Meta
                            avatar={
                              <div style={{ marginTop: 4 }}>
                                {permission.isWildcard ? (
                                  <StarOutlined style={{ color: '#fa8c16' }} />
                                ) : (
                                  <KeyOutlined style={{ color: '#52c41a' }} />
                                )}
                              </div>
                            }
                            title={
                              <Space>
                                <Text strong>{permission.permissionName}</Text>
                                <Text code>{permission.permissionCode}</Text>
                                {permission.isWildcard && <Tag color="orange">Wildcard</Tag>}
                                {!permission.isActive && <Tag color="red">Inactive</Tag>}
                              </Space>
                            }
                            description={permission.description || 'No description'}
                          />
                        </List.Item>
                      )}
                    />
                  </Panel>
                ))}
              </Collapse>
            )}
          </Card>
        )}

        {/* Permission Form Modal */}
        <PermissionForm
          permission={selectedPermission}
          visible={formVisible}
          onCancel={() => {
            setFormVisible(false);
            setSelectedPermission(undefined);
          }}
          onSubmit={handleFormSubmit}
          loading={createPermissionMutation.isLoading || updatePermissionMutation.isLoading}
        />
      </Space>
    </div>
  );
};

export default PermissionCatalogPage;