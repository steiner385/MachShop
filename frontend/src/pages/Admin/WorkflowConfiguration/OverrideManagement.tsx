/**
 * Override Management Component
 * Created for GitHub Issue #40 - Site-Level Workflow Configuration System
 *
 * Handles routing and work order override management
 */

import React, { useState } from 'react';
import {
  Card,
  Tabs,
  Button,
  Space,
  message,
  Modal,
  Form,
  Input,
  Table,
  Tag,
  Empty,
  Spin,
  Alert,
  Drawer,
  Descriptions,
  Typography,
  Row,
  Col,
  Select,
  Avatar,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { workflowConfigurationAPI } from '@/api/workflowConfiguration';
import {
  RoutingWorkflowConfiguration,
  WorkOrderWorkflowConfiguration,
  CreateRoutingOverrideRequest,
  CreateWorkOrderOverrideRequest,
  WorkflowMode,
} from '@/types/workflowConfiguration';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

interface OverrideManagementProps {
  siteId: string;
}

interface RoutingOverride extends RoutingWorkflowConfiguration {
  routingName?: string;
}

interface WorkOrderOverride extends WorkOrderWorkflowConfiguration {
  workOrderName?: string;
  routingName?: string;
}

export const OverrideManagement: React.FC<OverrideManagementProps> = ({ siteId }) => {
  const [activeTab, setActiveTab] = useState('routing');
  const [selectedOverride, setSelectedOverride] = useState<any | null>(null);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [overrideType, setOverrideType] = useState<'routing' | 'workorder'>('routing');

  // Sample data - in production, this would come from API queries
  const routingOverrides: RoutingOverride[] = [
    {
      id: 'override-1',
      routingId: 'RT-001',
      routingName: 'Engine Assembly - Main',
      siteConfigId: 'config-1',
      mode: 'FLEXIBLE',
      enforceOperationSequence: true,
      enforceStatusGating: false,
      allowExternalVouching: false,
      enforceQualityChecks: true,
      requireStartTransition: true,
      overrideReason: 'Enabling flexible mode for route authoring phase',
      approvedBy: 'Manager A',
      approvedAt: dayjs().subtract(5, 'days').toISOString(),
      createdAt: dayjs().subtract(5, 'days').toISOString(),
      updatedAt: dayjs().subtract(5, 'days').toISOString(),
      createdBy: 'Engineer B',
    },
  ];

  const workOrderOverrides: WorkOrderOverride[] = [
    {
      id: 'override-2',
      workOrderId: 'WO-2024-001',
      workOrderName: 'Engine Build 789',
      routingName: 'Engine Assembly - Main',
      siteConfigId: 'config-1',
      mode: 'HYBRID',
      enforceOperationSequence: true,
      enforceStatusGating: false,
      allowExternalVouching: true,
      enforceQualityChecks: true,
      requireStartTransition: true,
      overrideReason: 'ERP integration required - legacy system handles some operations',
      approvedBy: 'Production Manager',
      approvedAt: dayjs().subtract(2, 'days').toISOString(),
      createdAt: dayjs().subtract(3, 'days').toISOString(),
      updatedAt: dayjs().subtract(2, 'days').toISOString(),
      createdBy: 'Production Planner',
    },
  ];

  const handleCreateOverride = () => {
    form.validateFields().then((values) => {
      message.success(`${overrideType === 'routing' ? 'Routing' : 'Work Order'} override created successfully`);
      setCreateModalVisible(false);
      form.resetFields();
    });
  };

  const handleDeleteOverride = (id: string) => {
    Modal.confirm({
      title: 'Delete Override',
      icon: <ExclamationCircleOutlined />,
      content: 'Are you sure you want to delete this configuration override?',
      okText: 'Yes, Delete',
      okType: 'danger',
      onOk() {
        message.success('Override deleted successfully');
      },
    });
  };

  const routingColumns = [
    {
      title: 'Routing ID',
      dataIndex: 'routingId',
      key: 'routingId',
      width: 120,
      render: (text: string) => <code>{text}</code>,
    },
    {
      title: 'Routing Name',
      dataIndex: 'routingName',
      key: 'routingName',
      width: 180,
    },
    {
      title: 'Mode',
      dataIndex: 'mode',
      key: 'mode',
      width: 100,
      render: (mode: WorkflowMode) => {
        const colorMap = { STRICT: 'red', FLEXIBLE: 'orange', HYBRID: 'blue' };
        return <Tag color={colorMap[mode]}>{mode}</Tag>;
      },
    },
    {
      title: 'Approved By',
      dataIndex: 'approvedBy',
      key: 'approvedBy',
      width: 120,
      render: (text: string) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} />
          {text}
        </Space>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date: string) => dayjs(date).format('MMM DD, YYYY'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: RoutingOverride) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedOverride(record);
              setDetailDrawerVisible(true);
            }}
          />
          <Button
            type="text"
            size="small"
            icon={<DeleteOutlined />}
            danger
            onClick={() => handleDeleteOverride(record.id)}
          />
        </Space>
      ),
    },
  ];

  const workOrderColumns = [
    {
      title: 'Work Order ID',
      dataIndex: 'workOrderId',
      key: 'workOrderId',
      width: 130,
      render: (text: string) => <code>{text}</code>,
    },
    {
      title: 'Work Order Name',
      dataIndex: 'workOrderName',
      key: 'workOrderName',
      width: 160,
    },
    {
      title: 'Mode',
      dataIndex: 'mode',
      key: 'mode',
      width: 100,
      render: (mode: WorkflowMode) => {
        const colorMap = { STRICT: 'red', FLEXIBLE: 'orange', HYBRID: 'blue' };
        return <Tag color={colorMap[mode]}>{mode}</Tag>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'approvedAt',
      key: 'status',
      width: 100,
      render: (approvedAt: string) =>
        approvedAt ? (
          <Tag icon={<CheckCircleOutlined />} color="success">
            Approved
          </Tag>
        ) : (
          <Tag icon={<ClockCircleOutlined />} color="processing">
            Pending
          </Tag>
        ),
    },
    {
      title: 'Approved By',
      dataIndex: 'approvedBy',
      key: 'approvedBy',
      width: 120,
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date: string) => dayjs(date).format('MMM DD, YYYY'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: WorkOrderOverride) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedOverride(record);
              setDetailDrawerVisible(true);
            }}
          />
          <Button
            type="text"
            size="small"
            icon={<DeleteOutlined />}
            danger
            onClick={() => handleDeleteOverride(record.id)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="Configuration Overrides Management"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setCreateModalVisible(true);
              setOverrideType(activeTab === 'routing' ? 'routing' : 'workorder');
            }}
          >
            Create Override
          </Button>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'routing',
              label: 'Routing Overrides',
              children: (
                <div style={{ marginTop: 16 }}>
                  <Paragraph>
                    Configure workflow rules at the routing level. These overrides apply to all
                    work orders using the specified routing.
                  </Paragraph>
                  {routingOverrides.length === 0 ? (
                    <Empty
                      description="No routing overrides configured"
                      style={{ marginTop: 24 }}
                    />
                  ) : (
                    <Table
                      columns={routingColumns}
                      dataSource={routingOverrides}
                      rowKey="id"
                      pagination={false}
                      size="small"
                    />
                  )}
                </div>
              ),
            },
            {
              key: 'workorder',
              label: 'Work Order Overrides',
              children: (
                <div style={{ marginTop: 16 }}>
                  <Alert
                    message="Approval Required"
                    description="Work order overrides require supervisor approval and must include a business reason. These overrides take precedence over routing and site-level configurations."
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  <Paragraph>
                    Configure workflow rules for specific work orders. These overrides require
                    approval and override routing and site-level configurations.
                  </Paragraph>
                  {workOrderOverrides.length === 0 ? (
                    <Empty
                      description="No work order overrides configured"
                      style={{ marginTop: 24 }}
                    />
                  ) : (
                    <Table
                      columns={workOrderColumns}
                      dataSource={workOrderOverrides}
                      rowKey="id"
                      pagination={false}
                      size="small"
                    />
                  )}
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Create Override Modal */}
      <Modal
        title={`Create ${overrideType === 'routing' ? 'Routing' : 'Work Order'} Override`}
        open={createModalVisible}
        onOk={handleCreateOverride}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label={overrideType === 'routing' ? 'Routing ID' : 'Work Order ID'}
            name="entityId"
            rules={[{ required: true, message: 'Please enter the ID' }]}
          >
            <Input placeholder={overrideType === 'routing' ? 'RT-001' : 'WO-2024-001'} />
          </Form.Item>

          <Form.Item
            label="Workflow Mode"
            name="mode"
            rules={[{ required: true, message: 'Please select a mode' }]}
          >
            <Select
              options={[
                { label: 'STRICT', value: 'STRICT' },
                { label: 'FLEXIBLE', value: 'FLEXIBLE' },
                { label: 'HYBRID', value: 'HYBRID' },
              ]}
            />
          </Form.Item>

          <Form.Item
            label="Override Reason"
            name="reason"
            rules={[{ required: true, message: 'Please provide a reason' }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="Explain why this override is necessary..."
            />
          </Form.Item>

          {overrideType === 'workorder' && (
            <Form.Item
              label="Approver"
              name="approver"
              rules={[{ required: true, message: 'Please select an approver' }]}
            >
              <Select placeholder="Select supervisor/manager" />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* Detail Drawer */}
      <Drawer
        title="Override Details"
        onClose={() => {
          setDetailDrawerVisible(false);
          setSelectedOverride(null);
        }}
        open={detailDrawerVisible}
        width={500}
      >
        {selectedOverride && (
          <Descriptions column={1} layout="vertical" bordered>
            <Descriptions.Item label="Type">
              {selectedOverride.workOrderId ? 'Work Order' : 'Routing'}
            </Descriptions.Item>
            <Descriptions.Item label="ID">
              <code>{selectedOverride.workOrderId || selectedOverride.routingId}</code>
            </Descriptions.Item>
            <Descriptions.Item label="Mode">
              <Tag
                color={
                  selectedOverride.mode === 'STRICT'
                    ? 'red'
                    : selectedOverride.mode === 'FLEXIBLE'
                      ? 'orange'
                      : 'blue'
                }
              >
                {selectedOverride.mode}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Override Reason">
              {selectedOverride.overrideReason}
            </Descriptions.Item>
            <Descriptions.Item label="Approved By">
              <Space>
                <Avatar size="small" icon={<UserOutlined />} />
                {selectedOverride.approvedBy}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Approved At">
              {dayjs(selectedOverride.approvedAt).format('MMM DD, YYYY HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="Created By">
              {selectedOverride.createdBy}
            </Descriptions.Item>
            <Descriptions.Item label="Created At">
              {dayjs(selectedOverride.createdAt).format('MMM DD, YYYY HH:mm')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
};

export default OverrideManagement;
