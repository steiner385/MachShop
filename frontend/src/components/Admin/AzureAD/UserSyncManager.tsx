import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Typography,
  Row,
  Col,
  Modal,
  Form,
  Input,
  Select,
  message,
  Badge,
  Tooltip,
  Progress,
  Alert,
  Drawer,
  Descriptions,
  Timeline,
} from 'antd';
import {
  UserOutlined,
  SyncOutlined,
  SearchOutlined,
  FilterOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  UserAddOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { Option } = Select;

interface SyncUser {
  id: string;
  azureId: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  department?: string;
  syncStatus: 'synced' | 'pending' | 'failed' | 'conflict';
  lastSyncAt?: string;
  localUserId?: string;
  groups: string[];
  conflictReason?: string;
  enabled: boolean;
}

interface SyncGroup {
  id: string;
  azureId: string;
  displayName: string;
  description?: string;
  syncStatus: 'synced' | 'pending' | 'failed';
  memberCount: number;
  lastSyncAt?: string;
}

interface SyncStats {
  totalUsers: number;
  syncedUsers: number;
  pendingUsers: number;
  failedUsers: number;
  conflictUsers: number;
  totalGroups: number;
  syncedGroups: number;
  lastSyncAt?: string;
  syncInProgress: boolean;
}

const UserSyncManager: React.FC = () => {
  const [users, setUsers] = useState<SyncUser[]>([]);
  const [groups, setGroups] = useState<SyncGroup[]>([]);
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [selectedUser, setSelectedUser] = useState<SyncUser | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'groups'>('users');
  const [filters, setFilters] = useState({
    status: 'all',
    department: 'all',
    search: '',
  });

  useEffect(() => {
    fetchSyncData();
  }, []);

  const fetchSyncData = async () => {
    setLoading(true);
    try {
      // Fetch sync statistics
      const statsResponse = await fetch('/api/v1/admin/azure-ad/sync/stats', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Fetch users
      const usersResponse = await fetch('/api/v1/admin/azure-ad/sync/users', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.users || []);
      }

      // Fetch groups
      const groupsResponse = await fetch('/api/v1/admin/azure-ad/sync/groups', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      if (groupsResponse.ok) {
        const groupsData = await groupsResponse.json();
        setGroups(groupsData.groups || []);
      }
    } catch (error) {
      message.error('Failed to fetch sync data');
    } finally {
      setLoading(false);
    }
  };

  const startFullSync = async () => {
    try {
      setLoading(true);
      setSyncProgress(0);

      const response = await fetch('/api/v1/admin/azure-ad/sync/full', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });

      if (response.ok) {
        message.success('Full synchronization started');
        // Poll for progress updates
        const progressInterval = setInterval(async () => {
          try {
            const progressResponse = await fetch('/api/v1/admin/azure-ad/sync/progress', {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            });
            if (progressResponse.ok) {
              const progressData = await progressResponse.json();
              setSyncProgress(progressData.progress);
              if (progressData.completed) {
                clearInterval(progressInterval);
                fetchSyncData();
                setSyncProgress(0);
              }
            }
          } catch (error) {
            clearInterval(progressInterval);
          }
        }, 2000);
      } else {
        message.error('Failed to start synchronization');
      }
    } catch (error) {
      message.error('Failed to start synchronization');
    } finally {
      setLoading(false);
    }
  };

  const resolveUserConflict = async (userId: string, resolution: 'merge' | 'replace' | 'skip') => {
    try {
      const response = await fetch(`/api/v1/admin/azure-ad/sync/users/${userId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ resolution }),
      });

      if (response.ok) {
        message.success('Conflict resolved successfully');
        fetchSyncData();
      } else {
        message.error('Failed to resolve conflict');
      }
    } catch (error) {
      message.error('Failed to resolve conflict');
    }
  };

  const getSyncStatusColor = (status: string) => {
    switch (status) {
      case 'synced': return 'green';
      case 'pending': return 'orange';
      case 'failed': return 'red';
      case 'conflict': return 'volcano';
      default: return 'default';
    }
  };

  const getSyncStatusIcon = (status: string) => {
    switch (status) {
      case 'synced': return <CheckCircleOutlined />;
      case 'pending': return <ClockCircleOutlined />;
      case 'failed': return <ExclamationCircleOutlined />;
      case 'conflict': return <ExclamationCircleOutlined />;
      default: return null;
    }
  };

  const userColumns: ColumnsType<SyncUser> = [
    {
      title: 'User',
      key: 'user',
      render: (_, record) => (
        <Space>
          <UserOutlined />
          <div>
            <div style={{ fontWeight: 'bold' }}>{record.displayName}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>{record.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      render: (department) => department || <Text type="secondary">-</Text>,
    },
    {
      title: 'Job Title',
      dataIndex: 'jobTitle',
      key: 'jobTitle',
      render: (title) => title || <Text type="secondary">-</Text>,
    },
    {
      title: 'Groups',
      dataIndex: 'groups',
      key: 'groups',
      render: (groups) => (
        <Space wrap>
          {groups.slice(0, 2).map((group: string) => (
            <Tag key={group} size="small">{group}</Tag>
          ))}
          {groups.length > 2 && (
            <Tag size="small">+{groups.length - 2} more</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'syncStatus',
      key: 'syncStatus',
      render: (status) => (
        <Tag color={getSyncStatusColor(status)} icon={getSyncStatusIcon(status)}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Last Sync',
      dataIndex: 'lastSyncAt',
      key: 'lastSyncAt',
      render: (date) => date ? new Date(date).toLocaleDateString() : '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<InfoCircleOutlined />}
            onClick={() => {
              setSelectedUser(record);
              setDrawerVisible(true);
            }}
          >
            Details
          </Button>
          {record.syncStatus === 'conflict' && (
            <Button
              size="small"
              type="primary"
              onClick={() => {
                Modal.confirm({
                  title: 'Resolve User Conflict',
                  content: `How would you like to resolve the conflict for ${record.displayName}?`,
                  footer: [
                    <Button key="skip" onClick={() => resolveUserConflict(record.id, 'skip')}>
                      Skip
                    </Button>,
                    <Button key="merge" type="default" onClick={() => resolveUserConflict(record.id, 'merge')}>
                      Merge
                    </Button>,
                    <Button key="replace" type="primary" onClick={() => resolveUserConflict(record.id, 'replace')}>
                      Replace
                    </Button>,
                  ],
                });
              }}
            >
              Resolve
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const groupColumns: ColumnsType<SyncGroup> = [
    {
      title: 'Group',
      key: 'group',
      render: (_, record) => (
        <Space>
          <TeamOutlined />
          <div>
            <div style={{ fontWeight: 'bold' }}>{record.displayName}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>{record.description}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Members',
      dataIndex: 'memberCount',
      key: 'memberCount',
    },
    {
      title: 'Status',
      dataIndex: 'syncStatus',
      key: 'syncStatus',
      render: (status) => (
        <Tag color={getSyncStatusColor(status)} icon={getSyncStatusIcon(status)}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Last Sync',
      dataIndex: 'lastSyncAt',
      key: 'lastSyncAt',
      render: (date) => date ? new Date(date).toLocaleDateString() : '-',
    },
  ];

  const filteredUsers = users.filter(user => {
    if (filters.status !== 'all' && user.syncStatus !== filters.status) return false;
    if (filters.department !== 'all' && user.department !== filters.department) return false;
    if (filters.search && !user.displayName.toLowerCase().includes(filters.search.toLowerCase()) &&
        !user.email.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const renderUserDetails = () => (
    <Drawer
      title="User Sync Details"
      placement="right"
      width={600}
      onClose={() => setDrawerVisible(false)}
      open={drawerVisible}
    >
      {selectedUser && (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Card size="small" title="User Information">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Display Name">{selectedUser.displayName}</Descriptions.Item>
              <Descriptions.Item label="Email">{selectedUser.email}</Descriptions.Item>
              <Descriptions.Item label="Azure ID">{selectedUser.azureId}</Descriptions.Item>
              <Descriptions.Item label="Local User ID">{selectedUser.localUserId || 'Not linked'}</Descriptions.Item>
              <Descriptions.Item label="Job Title">{selectedUser.jobTitle || '-'}</Descriptions.Item>
              <Descriptions.Item label="Department">{selectedUser.department || '-'}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={getSyncStatusColor(selectedUser.syncStatus)}>
                  {selectedUser.syncStatus.toUpperCase()}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card size="small" title="Group Memberships">
            <Space wrap>
              {selectedUser.groups.map(group => (
                <Tag key={group}>{group}</Tag>
              ))}
            </Space>
          </Card>

          {selectedUser.syncStatus === 'conflict' && (
            <Card size="small" title="Conflict Information">
              <Alert
                type="warning"
                message="Sync Conflict"
                description={selectedUser.conflictReason}
                showIcon
              />
            </Card>
          )}

          <Card size="small" title="Sync History">
            <Timeline size="small">
              <Timeline.Item color="green">
                <Text>Initial sync: {selectedUser.lastSyncAt ? new Date(selectedUser.lastSyncAt).toLocaleString() : 'Never'}</Text>
              </Timeline.Item>
            </Timeline>
          </Card>
        </Space>
      )}
    </Drawer>
  );

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 24 }}>
          <Title level={3}>
            <SyncOutlined /> User & Group Synchronization
          </Title>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card size="small">
                <div style={{ textAlign: 'center' }}>
                  <UserOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                  <Title level={4}>{stats.totalUsers}</Title>
                  <Text type="secondary">Total Users</Text>
                </div>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <div style={{ textAlign: 'center' }}>
                  <CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                  <Title level={4}>{stats.syncedUsers}</Title>
                  <Text type="secondary">Synced</Text>
                </div>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <div style={{ textAlign: 'center' }}>
                  <ClockCircleOutlined style={{ fontSize: 24, color: '#faad14' }} />
                  <Title level={4}>{stats.pendingUsers}</Title>
                  <Text type="secondary">Pending</Text>
                </div>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <div style={{ textAlign: 'center' }}>
                  <ExclamationCircleOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />
                  <Title level={4}>{stats.failedUsers + stats.conflictUsers}</Title>
                  <Text type="secondary">Issues</Text>
                </div>
              </Card>
            </Col>
          </Row>
        )}

        {/* Sync Progress */}
        {syncProgress > 0 && (
          <Alert
            type="info"
            message="Synchronization in Progress"
            description={<Progress percent={syncProgress} status="active" />}
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Controls */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Space>
                <Button
                  type="primary"
                  icon={<SyncOutlined />}
                  loading={loading}
                  onClick={startFullSync}
                >
                  Full Sync
                </Button>

                <Select
                  value={activeTab}
                  onChange={setActiveTab}
                  style={{ width: 120 }}
                >
                  <Option value="users">Users</Option>
                  <Option value="groups">Groups</Option>
                </Select>
              </Space>
            </Col>
            <Col>
              <Space>
                <Input
                  placeholder="Search users..."
                  prefix={<SearchOutlined />}
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  style={{ width: 200 }}
                />

                <Select
                  value={filters.status}
                  onChange={(value) => setFilters({ ...filters, status: value })}
                  style={{ width: 120 }}
                >
                  <Option value="all">All Status</Option>
                  <Option value="synced">Synced</Option>
                  <Option value="pending">Pending</Option>
                  <Option value="failed">Failed</Option>
                  <Option value="conflict">Conflict</Option>
                </Select>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Data Tables */}
        {activeTab === 'users' ? (
          <Table
            columns={userColumns}
            dataSource={filteredUsers}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} users`,
            }}
          />
        ) : (
          <Table
            columns={groupColumns}
            dataSource={groups}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} groups`,
            }}
          />
        )}

        {renderUserDetails()}
      </Card>
    </div>
  );
};

export default UserSyncManager;