/**
 * Role Management Page for RBAC Admin UI
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
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  SettingOutlined,
  UsergroupAddOutlined,
  SafetyOutlined,
  GlobalOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rbacAPI } from '@/api/rbac';
import {
  Role,
  RoleDetails,
  CreateRoleRequest,
  UpdateRoleRequest,
  RoleFilters,
  Permission,
} from '@/types/rbac';

const { Title, Text } = Typography;
const { Option } = Select;

interface RoleFormProps {
  role?: Role;
  visible: boolean;
  onCancel: () => void;
  onSubmit: (values: any) => void;
  loading: boolean;
}

const RoleForm: React.FC<RoleFormProps> = ({ role, visible, onCancel, onSubmit, loading }) => {
  const [form] = Form.useForm();
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // Get all permissions for the permission selector
  const { data: permissionsData } = useQuery({
    queryKey: ['permissions', 'all'],
    queryFn: () => rbacAPI.getPermissions({ limit: 1000 }),
    enabled: visible,
  });

  const permissions = permissionsData?.permissions || [];

  useEffect(() => {
    if (visible && role) {
      form.setFieldsValue({
        roleCode: role.roleCode,
        roleName: role.roleName,
        description: role.description || '',
        isGlobal: role.isGlobal,
      });

      // Load role permissions
      if (role.id) {
        rbacAPI.getRolePermissions(role.id).then((rolePermissions) => {
          const permissionIds = rolePermissions.map(rp => rp.permissionId);
          setSelectedPermissions(permissionIds);
          form.setFieldValue('permissions', permissionIds);
        });
      }
    } else if (visible) {
      form.resetFields();
      setSelectedPermissions([]);
    }
  }, [visible, role, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      onSubmit({
        ...values,
        selectedPermissions,
      });
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

  return (
    <Modal
      title={role ? 'Edit Role' : 'Create New Role'}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={800}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          isGlobal: true,
          permissions: [],
        }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Role Code"
              name="roleCode"
              rules={[
                { required: true, message: 'Role code is required' },
                { pattern: /^[a-zA-Z0-9_-]+$/, message: 'Role code can only contain letters, numbers, underscores, and hyphens' },
              ]}
            >
              <Input
                placeholder="e.g., production_supervisor"
                disabled={!!role} // Cannot change role code when editing
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Role Name"
              name="roleName"
              rules={[{ required: true, message: 'Role name is required' }]}
            >
              <Input placeholder="e.g., Production Supervisor" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Description"
          name="description"
        >
          <Input.TextArea
            rows={3}
            placeholder="Brief description of the role and its responsibilities"
          />
        </Form.Item>

        <Form.Item
          label="Global Role"
          name="isGlobal"
          valuePropName="checked"
          tooltip="Global roles apply across all sites. Site-specific roles are assigned per site."
        >
          <Switch checkedChildren="Global" unCheckedChildren="Site-specific" />
        </Form.Item>

        <Form.Item
          label="Permissions"
          name="permissions"
          tooltip="Select the permissions that users with this role should have"
        >
          <Select
            mode="multiple"
            placeholder="Select permissions"
            value={selectedPermissions}
            onChange={setSelectedPermissions}
            showSearch
            filterOption={(input, option) =>
              (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
            }
            maxTagCount="responsive"
          >
            {permissions.map((permission) => (
              <Option key={permission.id} value={permission.id}>
                <Space>
                  <Text strong>{permission.permissionName}</Text>
                  <Tag size="small" color={permission.isWildcard ? 'orange' : 'blue'}>
                    {permission.permissionCode}
                  </Tag>
                  {permission.category && (
                    <Tag size="small">{permission.category}</Tag>
                  )}
                </Space>
              </Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

const RoleManagementPage: React.FC = () => {
  const [filters, setFilters] = useState<RoleFilters>({});
  const [pagination, setPagination] = useState({ page: 1, limit: 10 });
  const [selectedRole, setSelectedRole] = useState<Role | undefined>();
  const [formVisible, setFormVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedRoleDetails, setSelectedRoleDetails] = useState<RoleDetails | undefined>();

  const queryClient = useQueryClient();

  // Query for roles list
  const {
    data: rolesData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['roles', filters, pagination],
    queryFn: () => rbacAPI.getRoles({ ...filters, ...pagination }),
    keepPreviousData: true,
  });

  // Query for role details
  const { data: roleDetails } = useQuery({
    queryKey: ['role-details', selectedRole?.id],
    queryFn: () => rbacAPI.getRoleById(selectedRole!.id),
    enabled: !!selectedRole?.id && detailsVisible,
  });

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: (roleData: CreateRoleRequest & { selectedPermissions: string[] }) => {
      const { selectedPermissions, ...createData } = roleData;
      return rbacAPI.createRole(createData);
    },
    onSuccess: async (newRole, variables) => {
      message.success('Role created successfully');

      // Assign permissions to the new role
      if (variables.selectedPermissions.length > 0) {
        try {
          await rbacAPI.replaceRolePermissions(newRole.id, variables.selectedPermissions);
          message.success('Permissions assigned successfully');
        } catch (error) {
          message.warning('Role created but failed to assign some permissions');
        }
      }

      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setFormVisible(false);
    },
    onError: (error: Error) => {
      message.error(`Failed to create role: ${error.message}`);
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: (data: { roleId: string; roleData: UpdateRoleRequest; selectedPermissions: string[] }) => {
      return rbacAPI.updateRole(data.roleId, data.roleData);
    },
    onSuccess: async (updatedRole, variables) => {
      message.success('Role updated successfully');

      // Update permissions
      try {
        await rbacAPI.replaceRolePermissions(variables.roleId, variables.selectedPermissions);
        message.success('Permissions updated successfully');
      } catch (error) {
        message.warning('Role updated but failed to update some permissions');
      }

      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['role-details'] });
      setFormVisible(false);
      setSelectedRole(undefined);
    },
    onError: (error: Error) => {
      message.error(`Failed to update role: ${error.message}`);
    },
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: (roleId: string) => rbacAPI.deleteRole(roleId),
    onSuccess: () => {
      message.success('Role deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (error: Error) => {
      message.error(`Failed to delete role: ${error.message}`);
    },
  });

  const handleCreate = () => {
    setSelectedRole(undefined);
    setFormVisible(true);
  };

  const handleEdit = (role: Role) => {
    setSelectedRole(role);
    setFormVisible(true);
  };

  const handleDelete = (roleId: string) => {
    deleteRoleMutation.mutate(roleId);
  };

  const handleFormSubmit = (values: any) => {
    const { selectedPermissions, ...formData } = values;

    if (selectedRole) {
      updateRoleMutation.mutate({
        roleId: selectedRole.id,
        roleData: formData,
        selectedPermissions,
      });
    } else {
      createRoleMutation.mutate({
        ...formData,
        selectedPermissions,
      });
    }
  };

  const handleViewDetails = (role: Role) => {
    setSelectedRole(role);
    setDetailsVisible(true);
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page when filtering
  };

  const handleTableChange = (tablePagination: any) => {
    setPagination({
      page: tablePagination.current,
      limit: tablePagination.pageSize,
    });
  };

  const columns = [
    {
      title: 'Role Code',
      dataIndex: 'roleCode',
      key: 'roleCode',
      sorter: true,
      render: (text: string, record: Role) => (
        <Space>
          <Text strong>{text}</Text>
          {!record.isActive && <Tag color="red">Inactive</Tag>}
        </Space>
      ),
    },
    {
      title: 'Role Name',
      dataIndex: 'roleName',
      key: 'roleName',
      sorter: true,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string) => text || <Text type="secondary">No description</Text>,
    },
    {
      title: 'Scope',
      dataIndex: 'isGlobal',
      key: 'isGlobal',
      render: (isGlobal: boolean) => (
        <Tag color={isGlobal ? 'blue' : 'green'} icon={isGlobal ? <GlobalOutlined /> : <HomeOutlined />}>
          {isGlobal ? 'Global' : 'Site-specific'}
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
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record: Role) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              type="text"
              size="small"
              icon={<SettingOutlined />}
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
          <Tooltip title="Edit Role">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete Role"
            description="Are you sure you want to delete this role? This action cannot be undone."
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete Role">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                loading={deleteRoleMutation.isLoading}
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
          <Text type="danger">Failed to load roles: {(error as Error).message}</Text>
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
            <SafetyOutlined style={{ marginRight: 8 }} />
            Role Management
          </Title>
          <Text type="secondary">
            Manage system roles and their permissions. Roles define what actions users can perform.
          </Text>
        </div>

        {/* Filters and Actions */}
        <Card>
          <Row gutter={16} align="middle">
            <Col flex="auto">
              <Space wrap>
                <Input
                  placeholder="Search roles..."
                  prefix={<SearchOutlined />}
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  style={{ width: 250 }}
                  allowClear
                />
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
                <Select
                  placeholder="Filter by scope"
                  value={filters.isGlobal}
                  onChange={(value) => handleFilterChange('isGlobal', value)}
                  style={{ width: 150 }}
                  allowClear
                >
                  <Option value={true}>Global</Option>
                  <Option value={false}>Site-specific</Option>
                </Select>
              </Space>
            </Col>
            <Col>
              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => refetch()}
                  loading={isLoading}
                >
                  Refresh
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCreate}
                >
                  Create Role
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Roles Table */}
        <Card>
          <Table
            columns={columns}
            dataSource={rolesData?.roles || []}
            rowKey="id"
            loading={isLoading}
            pagination={{
              current: pagination.page,
              pageSize: pagination.limit,
              total: rolesData?.total || 0,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} roles`,
            }}
            onChange={handleTableChange}
          />
        </Card>

        {/* Role Form Modal */}
        <RoleForm
          role={selectedRole}
          visible={formVisible}
          onCancel={() => {
            setFormVisible(false);
            setSelectedRole(undefined);
          }}
          onSubmit={handleFormSubmit}
          loading={createRoleMutation.isLoading || updateRoleMutation.isLoading}
        />

        {/* Role Details Modal */}
        <Modal
          title={`Role Details: ${selectedRole?.roleName}`}
          open={detailsVisible}
          onCancel={() => {
            setDetailsVisible(false);
            setSelectedRole(undefined);
            setSelectedRoleDetails(undefined);
          }}
          footer={null}
          width={800}
        >
          {roleDetails && (
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Card size="small" title="Role Information">
                <Row gutter={16}>
                  <Col span={12}>
                    <Text strong>Role Code:</Text>
                    <br />
                    <Text>{roleDetails.roleCode}</Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>Role Name:</Text>
                    <br />
                    <Text>{roleDetails.roleName}</Text>
                  </Col>
                </Row>
                <Divider />
                <Row gutter={16}>
                  <Col span={12}>
                    <Text strong>Scope:</Text>
                    <br />
                    <Tag color={roleDetails.isGlobal ? 'blue' : 'green'}>
                      {roleDetails.isGlobal ? 'Global' : 'Site-specific'}
                    </Tag>
                  </Col>
                  <Col span={12}>
                    <Text strong>Status:</Text>
                    <br />
                    <Badge
                      status={roleDetails.isActive ? 'success' : 'error'}
                      text={roleDetails.isActive ? 'Active' : 'Inactive'}
                    />
                  </Col>
                </Row>
                {roleDetails.description && (
                  <>
                    <Divider />
                    <Text strong>Description:</Text>
                    <br />
                    <Text>{roleDetails.description}</Text>
                  </>
                )}
              </Card>

              <Card size="small" title="Statistics">
                <Row gutter={16}>
                  <Col span={8}>
                    <Text strong>Users Assigned:</Text>
                    <br />
                    <Text style={{ fontSize: '24px' }}>{roleDetails.userCount}</Text>
                  </Col>
                  <Col span={8}>
                    <Text strong>Permissions:</Text>
                    <br />
                    <Text style={{ fontSize: '24px' }}>{roleDetails.permissions.length}</Text>
                  </Col>
                  {roleDetails.siteSpecificCount !== undefined && (
                    <Col span={8}>
                      <Text strong>Site Assignments:</Text>
                      <br />
                      <Text style={{ fontSize: '24px' }}>{roleDetails.siteSpecificCount}</Text>
                    </Col>
                  )}
                </Row>
              </Card>

              <Card size="small" title="Assigned Permissions">
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {roleDetails.permissions.map((permission) => (
                      <Card key={permission.id} size="small" style={{ marginBottom: 8 }}>
                        <Row justify="space-between" align="middle">
                          <Col>
                            <Space>
                              <Text strong>{permission.permissionName}</Text>
                              <Tag color={permission.isWildcard ? 'orange' : 'blue'}>
                                {permission.permissionCode}
                              </Tag>
                              {permission.category && (
                                <Tag>{permission.category}</Tag>
                              )}
                            </Space>
                          </Col>
                          {permission.description && (
                            <Col>
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                {permission.description}
                              </Text>
                            </Col>
                          )}
                        </Row>
                      </Card>
                    ))}
                    {roleDetails.permissions.length === 0 && (
                      <Text type="secondary">No permissions assigned to this role.</Text>
                    )}
                  </Space>
                </div>
              </Card>
            </Space>
          )}
        </Modal>
      </Space>
    </div>
  );
};

export default RoleManagementPage;