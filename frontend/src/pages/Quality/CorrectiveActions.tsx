/**
 * CorrectiveActions List Page - Issue #56 Phase 1
 *
 * Displays a list of corrective actions with filtering, search, and lifecycle management
 */

import React, { useState, useEffect } from 'react';
import {
  Page,
  PageHeader,
  PageContent,
  Button,
  Table,
  Input,
  Select,
  Space,
  Tag,
  Empty,
  Spin,
  Popconfirm,
  Modal,
  Form,
  DatePicker,
} from '@/components/ui';
import { PlusOutlined, SearchOutlined, FilterOutlined, EditOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface CorrectiveAction {
  id: string;
  caNumber: string;
  title: string;
  description: string;
  status: string;
  assignedTo: {
    id: string;
    name: string;
    email: string;
  };
  targetDate: string;
  implementedDate?: string;
  isEffective?: boolean;
  createdAt: string;
}

const CorrectiveActionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [actions, setActions] = useState<CorrectiveAction[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Load corrective actions
  const loadActions = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call to GET /api/v2/corrective-actions
      // For now, show mock data
      const mockActions: CorrectiveAction[] = [
        {
          id: '1',
          caNumber: 'CA-2025-0001',
          title: 'Implement QC checkpoints on Line 3',
          description: 'Add visual inspection checkpoints to prevent defects identified in NCR-2025-001',
          status: 'IN_PROGRESS',
          assignedTo: {
            id: 'user1',
            name: 'John Smith',
            email: 'john.smith@company.com',
          },
          targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          caNumber: 'CA-2025-0002',
          title: 'Update process specification for Welding',
          description: 'Revise temperature and timing parameters based on effectiveness verification',
          status: 'PLANNED',
          assignedTo: {
            id: 'user2',
            name: 'Jane Doe',
            email: 'jane.doe@company.com',
          },
          targetDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
        },
        {
          id: '3',
          caNumber: 'CA-2025-0003',
          title: 'Training on new equipment usage',
          description: 'Operator training to prevent equipment-related defects',
          status: 'IMPLEMENTED',
          assignedTo: {
            id: 'user3',
            name: 'Bob Johnson',
            email: 'bob.johnson@company.com',
          },
          targetDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          implementedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];

      setActions(mockActions);
      setPagination({ ...pagination, total: mockActions.length });
    } catch (error) {
      console.error('Failed to load corrective actions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActions();
  }, []);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PLANNED: 'blue',
      IN_PROGRESS: 'orange',
      IMPLEMENTED: 'purple',
      VERIFICATION: 'cyan',
      VERIFIED_EFFECTIVE: 'green',
      VERIFIED_INEFFECTIVE: 'red',
      CANCELLED: 'default',
    };
    return colors[status] || 'default';
  };

  const columns = [
    {
      title: 'CA Number',
      dataIndex: 'caNumber',
      key: 'caNumber',
      width: 120,
      render: (text: string, record: CorrectiveAction) => (
        <a onClick={() => navigate(`/quality/corrective-actions/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => <span>{text}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status: string) => <Tag color={getStatusColor(status)}>{status}</Tag>,
    },
    {
      title: 'Assigned To',
      dataIndex: ['assignedTo', 'name'],
      key: 'assignedTo',
      width: 140,
    },
    {
      title: 'Target Date',
      dataIndex: 'targetDate',
      key: 'targetDate',
      width: 120,
      render: (date: string) => dayjs(date).format('MMM DD, YYYY'),
    },
    {
      title: 'Effectiveness',
      dataIndex: 'isEffective',
      key: 'isEffective',
      width: 120,
      render: (isEffective?: boolean) => {
        if (isEffective === undefined) return '-';
        return isEffective ? (
          <CheckCircleOutlined style={{ color: 'green', marginRight: 8 }} />
        ) : (
          <CloseCircleOutlined style={{ color: 'red', marginRight: 8 }} />
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: any, record: CorrectiveAction) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/quality/corrective-actions/${record.id}`)}
          />
          <Popconfirm
            title="Cancel CA?"
            description="Are you sure you want to cancel this corrective action?"
            onConfirm={() => {
              // TODO: Call API to cancel
              console.log('Cancel CA:', record.id);
            }}
            okText="Yes"
            cancelText="No"
          >
            <Button type="link" size="small" danger>
              Cancel
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleCreateCA = async (values: any) => {
    try {
      // TODO: Call API to create corrective action
      console.log('Create CA:', values);
      setCreateModalVisible(false);
      form.resetFields();
      await loadActions();
    } catch (error) {
      console.error('Failed to create corrective action:', error);
    }
  };

  if (!user) {
    return (
      <Page>
        <PageHeader title="Corrective Actions" />
        <PageContent>
          <Empty description="Please log in to view corrective actions" />
        </PageContent>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title="Corrective Actions (CAPA)"
        subTitle="Manage corrective and preventive actions"
        extra={[
          <Button key="refresh" onClick={loadActions} loading={loading}>
            Refresh
          </Button>,
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            New Corrective Action
          </Button>,
        ]}
      />

      <PageContent>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Input
              placeholder="Search by title or CA number..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 300 }}
            />
            <Select
              placeholder="Filter by status"
              style={{ width: 200 }}
              value={filterStatus}
              onChange={setFilterStatus}
              options={[
                { label: 'All Status', value: null },
                { label: 'Planned', value: 'PLANNED' },
                { label: 'In Progress', value: 'IN_PROGRESS' },
                { label: 'Implemented', value: 'IMPLEMENTED' },
                { label: 'Verification', value: 'VERIFICATION' },
                { label: 'Verified Effective', value: 'VERIFIED_EFFECTIVE' },
                { label: 'Verified Ineffective', value: 'VERIFIED_INEFFECTIVE' },
                { label: 'Cancelled', value: 'CANCELLED' },
              ]}
              allowClear
            />
            <Button icon={<FilterOutlined />} />
          </div>

          <Spin spinning={loading}>
            <Table
              columns={columns}
              dataSource={actions.filter(
                (action) =>
                  (!searchText ||
                    action.title.toLowerCase().includes(searchText.toLowerCase()) ||
                    action.caNumber.toLowerCase().includes(searchText.toLowerCase())) &&
                  (!filterStatus || action.status === filterStatus)
              )}
              rowKey="id"
              pagination={{
                ...pagination,
                onChange: (page) => setPagination({ ...pagination, current: page }),
              }}
              size="small"
            />
          </Spin>
        </Space>
      </PageContent>

      {/* Create CA Modal */}
      <Modal
        title="Create New Corrective Action"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        okText="Create"
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateCA}>
          <Form.Item
            label="Title"
            name="title"
            rules={[{ required: true, message: 'Title is required' }]}
          >
            <Input placeholder="Enter corrective action title" />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
            rules={[{ required: true, message: 'Description is required' }]}
          >
            <Input.TextArea placeholder="Describe the action" rows={3} />
          </Form.Item>

          <Form.Item
            label="Type"
            name="type"
            rules={[{ required: true, message: 'Type is required' }]}
          >
            <Select
              options={[
                { label: 'Corrective', value: 'CORRECTIVE' },
                { label: 'Preventive', value: 'PREVENTIVE' },
                { label: 'Containment', value: 'CONTAINMENT' },
              ]}
            />
          </Form.Item>

          <Form.Item
            label="Assign To"
            name="assignedToId"
            rules={[{ required: true, message: 'Assignment is required' }]}
          >
            <Select
              options={[
                { label: 'John Smith', value: 'user1' },
                { label: 'Jane Doe', value: 'user2' },
                { label: 'Bob Johnson', value: 'user3' },
              ]}
            />
          </Form.Item>

          <Form.Item
            label="Target Date"
            name="targetDate"
            rules={[{ required: true, message: 'Target date is required' }]}
          >
            <DatePicker />
          </Form.Item>
        </Form>
      </Modal>
    </Page>
  );
};

export default CorrectiveActionsPage;
