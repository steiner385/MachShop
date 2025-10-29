/**
 * User Role Assignment Page for RBAC Admin UI
 * Created for GitHub Issue #124 - Admin UI for Role and Permission Management
 */

import React, { useState, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Space,
  Modal,
  Form,
  message,
  Tooltip,
  Tag,
  Typography,
  Row,
  Col,
  Avatar,
  Badge,
  Divider,
  Transfer,
  TreeSelect,
  Checkbox,
  Alert,
  Popconfirm,
  Empty,
} from 'antd';
import {
  UserOutlined,
  SearchOutlined,
  ReloadOutlined,
  UsergroupAddOutlined,
  DeleteOutlined,
  EyeOutlined,
  TeamOutlined,
  GlobalOutlined,
  HomeOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rbacAPI } from '@/api/rbac';
import {
  UserRole,
  UserSiteRole,
  Role,
  Site,
  UserRoleOverview,
  AssignUserRoleRequest,
  RevokeUserRoleRequest,
  UserRoleFilters,
} from '@/types/rbac';
import { debounce } from 'lodash';

const { Title, Text } = Typography;
const { Option } = Select;

interface UserSearchResult {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email: string;
}

interface AssignRoleModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (values: any) => void;
  loading: boolean;
}

const AssignRoleModal: React.FC<AssignRoleModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  loading,
}) => {
  const [form] = Form.useForm();
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [userSearchResults, setUserSearchResults] = useState<UserSearchResult[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [assignmentType, setAssignmentType] = useState<'global' | 'site'>('global');

  // Get roles and sites
  const { data: rolesData } = useQuery({
    queryKey: ['roles', 'all'],
    queryFn: () => rbacAPI.getRoles({ limit: 1000 }),
    enabled: visible,
  });

  const { data: sites } = useQuery({
    queryKey: ['sites'],
    queryFn: () => rbacAPI.getSites(),
    enabled: visible && assignmentType === 'site',
  });

  const roles = rolesData?.roles || [];

  // Debounced user search
  const searchUsers = useCallback(
    debounce(async (query: string) => {
      if (!query || query.length < 2) {
        setUserSearchResults([]);
        return;
      }

      setUserSearchLoading(true);
      try {
        const results = await rbacAPI.searchUsers(query);
        setUserSearchResults(results);
      } catch (error) {
        message.error('Failed to search users');
        setUserSearchResults([]);
      } finally {
        setUserSearchLoading(false);
      }
    }, 300),
    []
  );

  const handleUserSearch = (value: string) => {
    searchUsers(value);
  };

  const handleUserSelect = (value: string) => {
    const user = userSearchResults.find((u) => u.id === value);
    setSelectedUser(user || null);
    form.setFieldValue('userId', value);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      onSubmit({
        ...values,
        assignmentType,
      });
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSelectedUser(null);
    setUserSearchResults([]);
    setAssignmentType('global');
    onCancel();
  };

  return (
    <Modal
      title="Assign Roles to User"
      open={visible}
      onCancel={handleCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={600}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Alert
          message="Role Assignment"
          description="Assign roles to users either globally (across all sites) or for specific sites."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form.Item
          label="Assignment Type"
          tooltip="Global roles apply across all sites, while site roles apply only to specific sites"
        >
          <Select
            value={assignmentType}
            onChange={setAssignmentType}
            style={{ width: '100%' }}
          >
            <Option value="global">
              <Space>
                <GlobalOutlined />
                Global Assignment
              </Space>
            </Option>
            <Option value="site">
              <Space>
                <HomeOutlined />
                Site-Specific Assignment
              </Space>
            </Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="Select User"
          name="userId"
          rules={[{ required: true, message: 'Please select a user' }]}
        >
          <Select
            showSearch
            placeholder="Search and select user..."
            onSearch={handleUserSearch}
            onSelect={handleUserSelect}
            loading={userSearchLoading}
            filterOption={false}
            notFoundContent={userSearchLoading ? 'Searching...' : 'No users found'}
          >
            {userSearchResults.map((user) => (
              <Option key={user.id} value={user.id}>
                <Space>
                  <Avatar size="small" icon={<UserOutlined />} />
                  <span>
                    {user.firstName && user.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user.username}
                  </span>
                  <Text type="secondary">({user.email})</Text>
                </Space>
              </Option>
            ))}
          </Select>
        </Form.Item>

        {selectedUser && (
          <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f6ffed' }}>
            <Space>
              <Avatar icon={<UserOutlined />} />
              <div>
                <Text strong>
                  {selectedUser.firstName && selectedUser.lastName
                    ? `${selectedUser.firstName} ${selectedUser.lastName}`
                    : selectedUser.username}
                </Text>
                <br />
                <Text type="secondary">{selectedUser.email}</Text>
              </div>
            </Space>
          </Card>
        )}

        {assignmentType === 'site' && (
          <Form.Item
            label="Select Site"
            name="siteId"
            rules={[{ required: true, message: 'Please select a site' }]}
          >
            <Select placeholder="Select site..." showSearch>
              {sites?.map((site) => (
                <Option key={site.id} value={site.id}>
                  <Space>
                    <Text strong>{site.siteName}</Text>
                    <Text type="secondary">({site.siteCode})</Text>
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}

        <Form.Item
          label="Select Roles"
          name="roleIds"
          rules={[{ required: true, message: 'Please select at least one role' }]}
        >
          <Select
            mode="multiple"
            placeholder="Select roles to assign..."
            showSearch
            filterOption={(input, option) =>
              (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
            }
          >
            {roles
              .filter((role) =>
                assignmentType === 'global' ? role.isGlobal : !role.isGlobal
              )
              .map((role) => (
                <Option key={role.id} value={role.id}>
                  <Space>
                    <Text strong>{role.roleName}</Text>
                    <Tag size="small" color={role.isGlobal ? 'blue' : 'green'}>
                      {role.roleCode}
                    </Tag>
                  </Space>
                </Option>
              ))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

interface UserDetailModalProps {
  userId: string | null;
  visible: boolean;
  onCancel: () => void;
}

const UserDetailModal: React.FC<UserDetailModalProps> = ({ userId, visible, onCancel }) => {
  const { data: userOverview, isLoading } = useQuery({
    queryKey: ['user-role-overview', userId],
    queryFn: () => rbacAPI.getUserRoleOverview(userId!),
    enabled: !!userId && visible,
  });

  return (
    <Modal
      title={`User Role Overview: ${userOverview?.username || 'Loading...'}`}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={800}
    >
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>
      ) : userOverview ? (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* User Info */}
          <Card size="small" title="User Information">
            <Row gutter={16}>
              <Col span={12}>
                <Text strong>Username:</Text>
                <br />
                <Text>{userOverview.username}</Text>
              </Col>
              <Col span={12}>
                <Text strong>Email:</Text>
                <br />
                <Text>{userOverview.email}</Text>
              </Col>
            </Row>
            {(userOverview.firstName || userOverview.lastName) && (
              <>
                <Divider />
                <Row gutter={16}>
                  <Col span={12}>
                    <Text strong>First Name:</Text>
                    <br />
                    <Text>{userOverview.firstName || 'N/A'}</Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>Last Name:</Text>
                    <br />
                    <Text>{userOverview.lastName || 'N/A'}</Text>
                  </Col>
                </Row>
              </>
            )}
          </Card>

          {/* Global Roles */}
          <Card size="small" title="Global Roles">
            {userOverview.globalRoles.length > 0 ? (
              <Space wrap>
                {userOverview.globalRoles.map((role) => (
                  <Tag key={role.id} color="blue" icon={<GlobalOutlined />}>
                    {role.roleName}
                  </Tag>
                ))}
              </Space>
            ) : (
              <Text type="secondary">No global roles assigned</Text>
            )}
          </Card>

          {/* Site-Specific Roles */}
          <Card size="small" title="Site-Specific Roles">
            {userOverview.siteRoles.length > 0 ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                {userOverview.siteRoles.map((siteRole) => (
                  <Card key={siteRole.siteId} size="small">
                    <Row justify="space-between" align="middle">
                      <Col>
                        <Space>
                          <HomeOutlined />
                          <Text strong>{siteRole.siteName}</Text>
                          <Text type="secondary">({siteRole.siteCode})</Text>
                        </Space>
                      </Col>
                      <Col>
                        <Space wrap>
                          {siteRole.roles.map((role) => (
                            <Tag key={role.id} color="green">
                              {role.roleName}
                            </Tag>
                          ))}
                        </Space>
                      </Col>
                    </Row>
                  </Card>
                ))}
              </Space>
            ) : (
              <Text type="secondary">No site-specific roles assigned</Text>
            )}
          </Card>

          {/* Permissions Summary */}
          <Card size="small" title="Effective Permissions">
            <Row gutter={16}>
              <Col span={12}>
                <Text strong>Total Permissions:</Text>
                <br />
                <Text style={{ fontSize: '18px' }}>{userOverview.allPermissions.length}</Text>
              </Col>
              <Col span={12}>
                <Text strong>Wildcard Permissions:</Text>
                <br />
                <Text style={{ fontSize: '18px' }}>{userOverview.wildcardPermissions.length}</Text>
              </Col>
            </Row>
            {userOverview.isSystemAdmin && (
              <>
                <Divider />
                <Alert
                  message="System Administrator"
                  description="This user has system administrator privileges with full access."
                  type="warning"
                  showIcon
                />
              </>
            )}
          </Card>
        </Space>
      ) : (
        <Empty description="Failed to load user information" />
      )}
    </Modal>
  );
};

const UserRoleAssignmentPage: React.FC = () => {
  const [filters, setFilters] = useState<UserRoleFilters>({});
  const [pagination, setPagination] = useState({ page: 1, limit: 10 });
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'global' | 'site'>('global');

  const queryClient = useQueryClient();

  // Query for user roles based on view mode
  const {
    data: userRolesData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['user-roles', viewMode, filters, pagination],
    queryFn: () => {
      if (viewMode === 'global') {
        return rbacAPI.getUserRoles({ ...filters, ...pagination });
      } else {
        return rbacAPI.getUserSiteRoles({ ...filters, ...pagination });
      }
    },
    keepPreviousData: true,
  });

  // Get roles for filtering
  const { data: rolesData } = useQuery({
    queryKey: ['roles', 'all'],
    queryFn: () => rbacAPI.getRoles({ limit: 1000 }),
  });

  // Get sites for filtering
  const { data: sites } = useQuery({
    queryKey: ['sites'],
    queryFn: () => rbacAPI.getSites(),
  });

  const roles = rolesData?.roles || [];

  // Assign role mutation
  const assignRoleMutation = useMutation({
    mutationFn: async (data: {
      userId: string;
      roleIds: string[];
      assignmentType: 'global' | 'site';
      siteId?: string;
    }) => {
      const { userId, roleIds, assignmentType, siteId } = data;

      // Assign each role individually
      for (const roleId of roleIds) {
        const assignmentData: AssignUserRoleRequest = {
          userId,
          roleId,
          ...(assignmentType === 'site' && { siteId }),
        };

        if (assignmentType === 'global') {
          await rbacAPI.assignGlobalUserRole(assignmentData);
        } else {
          await rbacAPI.assignSiteUserRole(assignmentData);
        }
      }
    },
    onSuccess: () => {
      message.success('Roles assigned successfully');
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      setAssignModalVisible(false);
    },
    onError: (error: Error) => {
      message.error(`Failed to assign roles: ${error.message}`);
    },
  });

  // Revoke role mutation
  const revokeRoleMutation = useMutation({
    mutationFn: (data: { userId: string; roleId: string; siteId?: string }) => {
      const { userId, roleId, siteId } = data;
      const revocationData: RevokeUserRoleRequest = {
        userId,
        roleId,
        ...(siteId && { siteId }),
      };

      if (siteId) {
        return rbacAPI.revokeSiteUserRole(revocationData);
      } else {
        return rbacAPI.revokeGlobalUserRole(revocationData);
      }
    },
    onSuccess: () => {
      message.success('Role revoked successfully');
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
    },
    onError: (error: Error) => {
      message.error(`Failed to revoke role: ${error.message}`);
    },
  });

  const handleAssignRoles = (values: any) => {
    assignRoleMutation.mutate(values);
  };

  const handleRevokeRole = (userId: string, roleId: string, siteId?: string) => {
    revokeRoleMutation.mutate({ userId, roleId, siteId });
  };

  const handleViewUserDetails = (userId: string) => {
    setSelectedUserId(userId);
    setDetailModalVisible(true);
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleTableChange = (tablePagination: any) => {
    setPagination({
      page: tablePagination.current,
      limit: tablePagination.pageSize,
    });
  };

  const globalColumns = [
    {
      title: 'User',
      key: 'user',
      render: (_, record: UserRole) => (
        <Space>
          <Avatar icon={<UserOutlined />} />
          <div>
            <Text strong>
              {record.user?.firstName && record.user?.lastName
                ? `${record.user.firstName} ${record.user.lastName}`
                : record.user?.username}
            </Text>
            <br />
            <Text type="secondary">{record.user?.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Role',
      dataIndex: ['role', 'roleName'],
      key: 'roleName',
      render: (roleName: string, record: UserRole) => (
        <Space>
          <Tag color="blue" icon={<GlobalOutlined />}>
            {roleName}
          </Tag>
          <Text type="secondary">({record.role?.roleCode})</Text>
        </Space>
      ),
    },
    {
      title: 'Assigned By',
      dataIndex: 'assignedBy',
      key: 'assignedBy',
    },
    {
      title: 'Assigned Date',
      dataIndex: 'assignedAt',
      key: 'assignedAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record: UserRole) => (
        <Space>
          <Tooltip title="View User Details">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewUserDetails(record.userId)}
            />
          </Tooltip>
          <Popconfirm
            title="Revoke Role"
            description="Are you sure you want to revoke this role from the user?"
            onConfirm={() => handleRevokeRole(record.userId, record.roleId)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Revoke Role">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                loading={revokeRoleMutation.isLoading}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const siteColumns = [
    {
      title: 'User',
      key: 'user',
      render: (_, record: UserSiteRole) => (
        <Space>
          <Avatar icon={<UserOutlined />} />
          <div>
            <Text strong>
              {record.user?.firstName && record.user?.lastName
                ? `${record.user.firstName} ${record.user.lastName}`
                : record.user?.username}
            </Text>
            <br />
            <Text type="secondary">{record.user?.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Site',
      key: 'site',
      render: (_, record: UserSiteRole) => (
        <Space>
          <HomeOutlined />
          <div>
            <Text strong>{record.site?.siteName}</Text>
            <br />
            <Text type="secondary">({record.site?.siteCode})</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Role',
      dataIndex: ['role', 'roleName'],
      key: 'roleName',
      render: (roleName: string, record: UserSiteRole) => (
        <Space>
          <Tag color="green">
            {roleName}
          </Tag>
          <Text type="secondary">({record.role?.roleCode})</Text>
        </Space>
      ),
    },
    {
      title: 'Assigned By',
      dataIndex: 'assignedBy',
      key: 'assignedBy',
    },
    {
      title: 'Assigned Date',
      dataIndex: 'assignedAt',
      key: 'assignedAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record: UserSiteRole) => (
        <Space>
          <Tooltip title="View User Details">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewUserDetails(record.userId)}
            />
          </Tooltip>
          <Popconfirm
            title="Revoke Role"
            description="Are you sure you want to revoke this site role from the user?"
            onConfirm={() =>
              handleRevokeRole(record.userId, record.roleId, record.siteId)
            }
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Revoke Role">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                loading={revokeRoleMutation.isLoading}
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
          <Text type="danger">Failed to load user roles: {(error as Error).message}</Text>
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
            <TeamOutlined style={{ marginRight: 8 }} />
            User Role Assignments
          </Title>
          <Text type="secondary">
            Manage role assignments for users. Assign global roles or site-specific roles to control access.
          </Text>
        </div>

        {/* Filters and Actions */}
        <Card>
          <Row gutter={16} align="middle">
            <Col flex="auto">
              <Space wrap>
                <Select
                  value={viewMode}
                  onChange={setViewMode}
                  style={{ width: 150 }}
                >
                  <Option value="global">
                    <Space>
                      <GlobalOutlined />
                      Global Roles
                    </Space>
                  </Option>
                  <Option value="site">
                    <Space>
                      <HomeOutlined />
                      Site Roles
                    </Space>
                  </Option>
                </Select>
                <Input
                  placeholder="Search users..."
                  prefix={<SearchOutlined />}
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  style={{ width: 250 }}
                  allowClear
                />
                <Select
                  placeholder="Filter by role"
                  value={filters.roleId}
                  onChange={(value) => handleFilterChange('roleId', value)}
                  style={{ width: 200 }}
                  allowClear
                  showSearch
                >
                  {roles.map((role) => (
                    <Option key={role.id} value={role.id}>
                      {role.roleName}
                    </Option>
                  ))}
                </Select>
                {viewMode === 'site' && (
                  <Select
                    placeholder="Filter by site"
                    value={filters.siteId}
                    onChange={(value) => handleFilterChange('siteId', value)}
                    style={{ width: 200 }}
                    allowClear
                    showSearch
                  >
                    {sites?.map((site) => (
                      <Option key={site.id} value={site.id}>
                        {site.siteName}
                      </Option>
                    ))}
                  </Select>
                )}
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
                  onClick={() => setAssignModalVisible(true)}
                >
                  Assign Roles
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* User Roles Table */}
        <Card>
          <Table
            columns={viewMode === 'global' ? globalColumns : siteColumns}
            dataSource={
              viewMode === 'global'
                ? (userRolesData as any)?.userRoles || []
                : (userRolesData as any)?.userSiteRoles || []
            }
            rowKey="id"
            loading={isLoading}
            pagination={{
              current: pagination.page,
              pageSize: pagination.limit,
              total: userRolesData?.total || 0,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} assignments`,
            }}
            onChange={handleTableChange}
          />
        </Card>

        {/* Assign Role Modal */}
        <AssignRoleModal
          visible={assignModalVisible}
          onCancel={() => setAssignModalVisible(false)}
          onSubmit={handleAssignRoles}
          loading={assignRoleMutation.isLoading}
        />

        {/* User Detail Modal */}
        <UserDetailModal
          userId={selectedUserId}
          visible={detailModalVisible}
          onCancel={() => {
            setDetailModalVisible(false);
            setSelectedUserId(null);
          }}
        />
      </Space>
    </div>
  );
};

export default UserRoleAssignmentPage;