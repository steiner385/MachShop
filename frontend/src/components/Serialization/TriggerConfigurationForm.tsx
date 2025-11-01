/**
 * Trigger Configuration Form Component
 * Issue #150: Serialization - Advanced Assignment Workflows
 * Phase 9: Frontend UI Components
 *
 * Form for configuring automatic serial number triggers
 */

import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  Button,
  Card,
  Space,
  Switch,
  InputNumber,
  Collapse,
  Alert,
  Spin,
  message,
  Table,
  Tag,
} from 'antd';
import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { apiClient } from '@/services/apiClient';

export interface TriggerConfigFormValues {
  partId: string;
  triggerType: string;
  operationCode?: string;
  assignmentType: string;
  formatConfigId?: string;
  isConditional?: boolean;
  conditions?: Record<string, any>;
  batchMode?: boolean;
  batchSize?: number;
}

interface TriggerConfigurationFormProps {
  partId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const TRIGGER_TYPES = [
  { label: 'Material Receipt', value: 'MATERIAL_RECEIPT' },
  { label: 'Work Order Create', value: 'WORK_ORDER_CREATE' },
  { label: 'Operation Complete', value: 'OPERATION_COMPLETE' },
  { label: 'Quality Checkpoint', value: 'QUALITY_CHECKPOINT' },
  { label: 'Batch Completion', value: 'BATCH_COMPLETION' },
];

const ASSIGNMENT_TYPES = [
  { label: 'Vendor', value: 'VENDOR' },
  { label: 'System Generated', value: 'SYSTEM_GENERATED' },
  { label: 'Late Assignment', value: 'LATE_ASSIGNMENT' },
];

const TriggerConfigurationForm: React.FC<TriggerConfigurationFormProps> = ({
  partId,
  onSuccess,
  onCancel,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [triggers, setTriggers] = useState<any[]>([]);
  const [triggersLoading, setTriggersLoading] = useState(false);
  const [isConditional, setIsConditional] = useState(false);
  const [batchMode, setBatchMode] = useState(false);

  useEffect(() => {
    if (partId) {
      loadTriggers();
    }
  }, [partId]);

  const loadTriggers = async () => {
    try {
      setTriggersLoading(true);
      const response = await apiClient.get(
        `/api/v1/serialization/triggers/part/${partId}`
      );
      setTriggers(response.data);
    } catch (error: any) {
      message.error('Failed to load triggers');
    } finally {
      setTriggersLoading(false);
    }
  };

  const handleSubmit = async (values: TriggerConfigFormValues) => {
    try {
      setLoading(true);

      const payload = {
        ...values,
        partId: values.partId || partId,
        createdBy: 'current-user', // TODO: Get from auth context
      };

      await apiClient.post(
        '/api/v1/serialization/triggers',
        payload
      );

      message.success('Trigger configuration created successfully');
      form.resetFields();
      setIsConditional(false);
      setBatchMode(false);

      if (onSuccess) {
        onSuccess();
      }

      // Reload triggers if partId is available
      if (partId) {
        loadTriggers();
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to create trigger');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrigger = async (triggerId: string) => {
    try {
      await apiClient.delete(
        `/api/v1/serialization/triggers/${triggerId}`,
        {
          data: { deletedBy: 'current-user' },
        }
      );

      message.success('Trigger deleted successfully');
      if (partId) {
        loadTriggers();
      }
    } catch (error: any) {
      message.error('Failed to delete trigger');
    }
  };

  const triggerColumns = [
    {
      title: 'Trigger Type',
      dataIndex: 'triggerType',
      key: 'triggerType',
      width: 150,
      render: (text: string) => (
        <Tag color="blue">{text}</Tag>
      ),
    },
    {
      title: 'Assignment Type',
      dataIndex: 'assignmentType',
      key: 'assignmentType',
      width: 140,
      render: (text: string) => (
        <Tag color="cyan">{text}</Tag>
      ),
    },
    {
      title: 'Operation Code',
      dataIndex: 'operationCode',
      key: 'operationCode',
      width: 120,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'red'}>
          {active ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Batch Mode',
      dataIndex: 'batchMode',
      key: 'batchMode',
      width: 100,
      render: (enabled: boolean, record: any) => (
        enabled ? `Enabled (${record.batchSize} units)` : 'Disabled'
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            title="Edit trigger"
          />
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteTrigger(record.id)}
            title="Delete trigger"
          />
        </Space>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', gap: '24px' }}>
      <Card
        title="Create New Trigger"
        style={{ flex: 1 }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark={true}
        >
          <Form.Item
            label="Part ID"
            name="partId"
            rules={[{ required: true, message: 'Please select or enter part ID' }]}
            initialValue={partId}
          >
            <Input
              placeholder="Enter part ID"
              disabled={!!partId}
            />
          </Form.Item>

          <Form.Item
            label="Trigger Type"
            name="triggerType"
            rules={[{ required: true, message: 'Please select trigger type' }]}
          >
            <Select
              placeholder="Select when serial assignment should occur"
              options={TRIGGER_TYPES}
            />
          </Form.Item>

          <Form.Item
            label="Assignment Type"
            name="assignmentType"
            rules={[{ required: true, message: 'Please select assignment type' }]}
          >
            <Select
              placeholder="Select how serials should be assigned"
              options={ASSIGNMENT_TYPES}
            />
          </Form.Item>

          <Form.Item
            label="Operation Code"
            name="operationCode"
          >
            <Input
              placeholder="e.g., OP-001"
            />
          </Form.Item>

          <Form.Item
            label="Format Config ID"
            name="formatConfigId"
          >
            <Input
              placeholder="For system-generated serials"
            />
          </Form.Item>

          <Form.Item
            label="Conditional Trigger"
            name="isConditional"
            valuePropName="checked"
          >
            <Switch
              onChange={setIsConditional}
            />
          </Form.Item>

          {isConditional && (
            <Alert
              message="Conditional triggers require additional context matching"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Form.Item
            label="Batch Mode"
            name="batchMode"
            valuePropName="checked"
          >
            <Switch
              onChange={setBatchMode}
            />
          </Form.Item>

          {batchMode && (
            <Form.Item
              label="Batch Size"
              name="batchSize"
              rules={[
                { required: true, message: 'Please specify batch size' },
              ]}
            >
              <InputNumber
                placeholder="Number of serials per batch"
                min={1}
                max={1000}
              />
            </Form.Item>
          )}

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
              >
                Create Trigger
              </Button>
              {onCancel && (
                <Button onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {partId && (
        <Card
          title="Active Triggers"
          style={{ flex: 1 }}
          loading={triggersLoading}
        >
          {triggers.length > 0 ? (
            <Table
              dataSource={triggers}
              columns={triggerColumns}
              rowKey="id"
              pagination={false}
              size="small"
            />
          ) : (
            <Alert
              message="No triggers configured for this part"
              type="info"
              showIcon
            />
          )}
        </Card>
      )}
    </div>
  );
};

export default TriggerConfigurationForm;
