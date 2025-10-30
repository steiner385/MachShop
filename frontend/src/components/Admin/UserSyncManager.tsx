import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Input,
  Select,
  Tag,
  Avatar,
  Modal,
  Form,
  Switch,
  Alert,
  Progress,
  Tooltip,
  Badge,
  Descriptions,
  message,
  Popconfirm
} from 'antd';
import {
  UserOutlined,
  SyncOutlined,
  SearchOutlined,
  FilterOutlined,
  DownloadOutlined,
  UploadOutlined,
  TeamOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SettingOutlined
} from '@ant-design/icons';
import type { ColumnsType, TableProps } from 'antd/es/table';
import axios from 'axios';

const { Title, Text } = Typography;
const { Search } = Input;

interface AzureUser {
  id: string;
  userPrincipalName: string;
  displayName: string;
  givenName: string;
  surname: string;
  mail: string;
  jobTitle?: string;
  department?: string;
  officeLocation?: string;
  businessPhones?: string[];
  mobilePhone?: string;
  accountEnabled: boolean;
  lastSignInDateTime?: string;
  createdDateTime: string;
  roles: string[];
  syncStatus: 'synced' | 'pending' | 'error' | 'conflict';
  lastSyncTime?: string;
  localUserId?: string;
  syncErrors?: string[];
}

interface SyncStats {
  totalUsers: number;
  syncedUsers: number;
  pendingUsers: number;
  errorUsers: number;
  lastSyncTime: string;
  isRunning: boolean;
}

const UserSyncManager: React.FC = () => {
  const [users, setUsers] = useState<AzureUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [selectedUser, setSelectedUser] = useState<AzureUser | null>(null);
  const [userDetailVisible, setUserDetailVisible] = useState(false);
  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncRunning, setSyncRunning] = useState(false);

  useEffect(() => {
    loadUsers();
    loadSyncStats();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/admin/azure-ad/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to load users:', error);
      message.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadSyncStats = async () => {
    try {
      const response = await axios.get('/api/admin/azure-ad/sync/stats');
      setSyncStats(response.data);
    } catch (error) {
      console.error('Failed to load sync stats:', error);
    }
  };

  const handleSync = async (userIds?: string[]) => {
    setSyncRunning(true);
    setSyncProgress(0);

    try {
      const payload = userIds ? { userIds } : {};
      const response = await axios.post('/api/admin/azure-ad/sync', payload);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setSyncProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate sync time

      clearInterval(progressInterval);
      setSyncProgress(100);

      setTimeout(() => {
        setSyncRunning(false);
        setSyncProgress(0);
        setSyncModalVisible(false);
        loadUsers();
        loadSyncStats();
        message.success('User sync completed successfully');
      }, 1000);

    } catch (error) {
      console.error('Sync failed:', error);
      setSyncRunning(false);
      setSyncProgress(0);
      message.error('User sync failed');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'synced':
        return 'success';
      case 'pending':
        return 'processing';
      case 'error':
        return 'error';
      case 'conflict':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'synced':
        return <CheckCircleOutlined />;
      case 'pending':
        return <ClockCircleOutlined />;
      case 'error':
        return <ExclamationCircleOutlined />;
      case 'conflict':
        return <ExclamationCircleOutlined />;
      default:
        return <ClockCircleOutlined />;
    }
  };

  const columns: ColumnsType<AzureUser> = [
    {
      title: 'User',
      key: 'user',
      fixed: 'left',
      width: 280,
      render: (record: AzureUser) => (
        <Space>
          <Avatar
            src={`/api/admin/azure-ad/users/${record.id}/photo`}
            icon={<UserOutlined />}
            onError={() => true}
          />
          <div>
            <div style={{ fontWeight: 500 }}>{record.displayName}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.userPrincipalName}
            </Text>
            {record.jobTitle && (
              <div>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {record.jobTitle}
                </Text>
              </div>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'syncStatus',
      key: 'syncStatus',
      width: 120,
      filters: [
        { text: 'Synced', value: 'synced' },
        { text: 'Pending', value: 'pending' },
        { text: 'Error', value: 'error' },
        { text: 'Conflict', value: 'conflict' },
      ],
      onFilter: (value, record) => record.syncStatus === value,
      render: (status: string) => (
        <Badge
          status={getStatusColor(status) as any}
          text={status.charAt(0).toUpperCase() + status.slice(1)}
        />
      ),
    },
    {
      title: 'Roles',
      dataIndex: 'roles',
      key: 'roles',
      width: 200,
      render: (roles: string[]) => (
        <Space wrap>
          {roles.slice(0, 2).map(role => (
            <Tag key={role} color="blue" size="small">
              {role}
            </Tag>
          ))}
          {roles.length > 2 && (
            <Tag color="default" size="small">
              +{roles.length - 2} more
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      width: 150,
      render: (department: string) => department || <Text type="secondary">-</Text>,
    },
    {
      title: 'Last Sync',
      dataIndex: 'lastSyncTime',
      key: 'lastSyncTime',
      width: 150,
      render: (time: string) =>
        time ? new Date(time).toLocaleDateString() : <Text type="secondary">Never</Text>,
    },
    {
      title: 'Enabled',
      dataIndex: 'accountEnabled',
      key: 'accountEnabled',
      width: 100,
      render: (enabled: boolean) => (
        <Badge
          status={enabled ? 'success' : 'error'}
          text={enabled ? 'Yes' : 'No'}
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 120,
      render: (record: AzureUser) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              size="small"
              icon={<UserOutlined />}
              onClick={() => {
                setSelectedUser(record);
                setUserDetailVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Sync User">
            <Button
              size="small"
              icon={<SyncOutlined />}
              onClick={() => handleSync([record.id])}
              loading={syncRunning}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchText ||
      user.displayName.toLowerCase().includes(searchText.toLowerCase()) ||
      user.userPrincipalName.toLowerCase().includes(searchText.toLowerCase()) ||
      user.mail?.toLowerCase().includes(searchText.toLowerCase());

    const matchesStatus = !statusFilter || user.syncStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const rowSelection: TableProps<AzureUser>['rowSelection'] = {
    selectedRowKeys: selectedUsers,
    onChange: (selectedRowKeys) => {
      setSelectedUsers(selectedRowKeys as string[]);
    },
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Header */}
      <Row justify="space-between" align="middle">
        <Col>
          <Title level={4}>
            <TeamOutlined style={{ marginRight: 8 }} />
            User Sync Manager
          </Title>
        </Col>
        <Col>
          <Space>
            <Button
              icon={<SyncOutlined />}
              onClick={() => setSyncModalVisible(true)}
              type="primary"
            >
              Full Sync
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={loadUsers}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Sync Stats */}
      {syncStats && (
        <Alert
          message={`Last sync: ${new Date(syncStats.lastSyncTime).toLocaleString()}`}
          description={
            <Row gutter={16}>
              <Col span={6}>
                <Text strong>Total: </Text>
                <Text>{syncStats.totalUsers}</Text>
              </Col>
              <Col span={6}>
                <Text strong>Synced: </Text>
                <Text type="success">{syncStats.syncedUsers}</Text>
              </Col>
              <Col span={6}>
                <Text strong>Pending: </Text>
                <Text type="warning">{syncStats.pendingUsers}</Text>
              </Col>
              <Col span={6}>
                <Text strong>Errors: </Text>
                <Text type="danger">{syncStats.errorUsers}</Text>
              </Col>
            </Row>
          }
          type="info"
          showIcon
          icon={<TeamOutlined />}
        />
      )}

      {/* Filters and Search */}
      <Card size="small">
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Search
              placeholder="Search users by name, email, or UPN"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: '100%' }}
              allowClear
            />
          </Col>
          <Col>
            <Select
              placeholder="Filter by status"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 150 }}
              allowClear
            >
              <Select.Option value="synced">Synced</Select.Option>
              <Select.Option value="pending">Pending</Select.Option>
              <Select.Option value="error">Error</Select.Option>
              <Select.Option value="conflict">Conflict</Select.Option>
            </Select>
          </Col>
          {selectedUsers.length > 0 && (
            <Col>
              <Button
                icon={<SyncOutlined />}
                onClick={() => handleSync(selectedUsers)}
                loading={syncRunning}
              >
                Sync Selected ({selectedUsers.length})
              </Button>
            </Col>
          )}
        </Row>
      </Card>

      {/* Users Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredUsers}
          rowKey="id"
          loading={loading}
          rowSelection={rowSelection}
          scroll={{ x: 1200 }}
          pagination={{
            pageSize: 20,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} users`,
            showSizeChanger: true,
            showQuickJumper: true,
          }}
        />
      </Card>

      {/* User Detail Modal */}
      <Modal
        title={`User Details - ${selectedUser?.displayName}`}
        open={userDetailVisible}
        onCancel={() => setUserDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setUserDetailVisible(false)}>
            Close
          </Button>,
          <Button
            key="sync"
            type="primary"
            icon={<SyncOutlined />}
            onClick={() => {
              if (selectedUser) {
                handleSync([selectedUser.id]);
                setUserDetailVisible(false);
              }
            }}
          >
            Sync User
          </Button>,
        ]}
        width={800}
      >
        {selectedUser && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="Display Name" span={2}>
              {selectedUser.displayName}
            </Descriptions.Item>
            <Descriptions.Item label="User Principal Name" span={2}>
              {selectedUser.userPrincipalName}
            </Descriptions.Item>
            <Descriptions.Item label="Email">
              {selectedUser.mail || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Job Title">
              {selectedUser.jobTitle || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Department">
              {selectedUser.department || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Office Location">
              {selectedUser.officeLocation || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Account Enabled">
              <Badge
                status={selectedUser.accountEnabled ? 'success' : 'error'}
                text={selectedUser.accountEnabled ? 'Yes' : 'No'}
              />
            </Descriptions.Item>
            <Descriptions.Item label="Sync Status">
              <Badge
                status={getStatusColor(selectedUser.syncStatus) as any}
                text={selectedUser.syncStatus.charAt(0).toUpperCase() + selectedUser.syncStatus.slice(1)}
              />
            </Descriptions.Item>
            <Descriptions.Item label="Roles" span={2}>
              <Space wrap>
                {selectedUser.roles.map(role => (
                  <Tag key={role} color="blue">
                    {role}
                  </Tag>
                ))}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Created">
              {new Date(selectedUser.createdDateTime).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="Last Sync">
              {selectedUser.lastSyncTime
                ? new Date(selectedUser.lastSyncTime).toLocaleString()
                : 'Never'
              }
            </Descriptions.Item>
            {selectedUser.syncErrors && selectedUser.syncErrors.length > 0 && (
              <Descriptions.Item label="Sync Errors" span={2}>
                <Alert
                  type="error"
                  showIcon
                  message="Sync Errors"
                  description={
                    <ul>
                      {selectedUser.syncErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  }
                />
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      {/* Sync Progress Modal */}
      <Modal
        title="Synchronizing Users"
        open={syncModalVisible}
        onCancel={() => !syncRunning && setSyncModalVisible(false)}
        closable={!syncRunning}
        footer={!syncRunning ? [
          <Button key="cancel" onClick={() => setSyncModalVisible(false)}>
            Cancel
          </Button>,
          <Button
            key="start"
            type="primary"
            icon={<SyncOutlined />}
            onClick={() => handleSync()}
          >
            Start Full Sync
          </Button>
        ] : null}
      >
        {syncRunning ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>Synchronizing users from Azure AD...</Text>
            <Progress percent={syncProgress} status="active" />
            <Text type="secondary">
              This may take a few minutes depending on the number of users.
            </Text>
          </Space>
        ) : (
          <Alert
            message="Full User Synchronization"
            description="This will synchronize all users from Azure AD to the local system. Existing users will be updated with the latest information from Azure AD."
            type="info"
            showIcon
          />
        )}
      </Modal>
    </Space>
  );
};

export default UserSyncManager;