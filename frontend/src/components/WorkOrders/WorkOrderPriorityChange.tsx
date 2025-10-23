import React, { useState } from 'react';
import { Modal, Select, Form, Input, message, Alert, Tag } from 'antd';
import { ThunderboltOutlined, InfoCircleOutlined } from '@ant-design/icons';

const { Option } = Select;
const { TextArea } = Input;

interface WorkOrderPriorityChangeProps {
  workOrderId: string;
  workOrderNumber: string;
  currentPriority: string;
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low', color: 'default', icon: null },
  { value: 'NORMAL', label: 'Normal', color: 'blue', icon: null },
  { value: 'HIGH', label: 'High', color: 'orange', icon: <ThunderboltOutlined /> },
  { value: 'URGENT', label: 'Urgent', color: 'red', icon: <ThunderboltOutlined /> },
];

const PRIORITY_CHANGE_REASONS = [
  'Customer Request',
  'Equipment Availability',
  'Material Availability',
  'Capacity Balancing',
  'Hot Job - Rush Order',
  'Delivery Date Change',
  'Production Schedule Optimization',
  'Other',
];

/**
 * Work Order Priority Change Component
 *
 * Allows production schedulers to change work order priority for
 * daily/hourly sequencing and responding to shop floor changes.
 */
export const WorkOrderPriorityChange: React.FC<WorkOrderPriorityChangeProps> = ({
  workOrderId,
  workOrderNumber,
  currentPriority,
  visible,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState<string>(currentPriority);

  const handlePriorityChange = (value: string) => {
    setSelectedPriority(value);
  };

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`/api/v1/workorders/${workOrderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          priority: values.priority,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update priority');
      }

      message.success(`Work order ${workOrderNumber} priority updated to ${values.priority}`);
      form.resetFields();
      onSuccess();
      onClose();
    } catch (error: any) {
      message.error(error.message || 'Failed to update work order priority');
    } finally {
      setSubmitting(false);
    }
  };

  const isUrgent = selectedPriority === 'URGENT';
  const isHighPriority = selectedPriority === 'HIGH' || selectedPriority === 'URGENT';

  return (
    <Modal
      title={
        <span>
          <ThunderboltOutlined /> Change Priority - {workOrderNumber}
        </span>
      }
      open={visible}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={submitting}
      width={600}
      okText="Update Priority"
      cancelText="Cancel"
    >
      <Alert
        message={`Current Priority: ${currentPriority}`}
        type="info"
        icon={<InfoCircleOutlined />}
        style={{ marginBottom: 16 }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ priority: currentPriority }}
      >
        <Form.Item
          name="priority"
          label="New Priority"
          rules={[
            { required: true, message: 'Please select a priority' },
            {
              validator: (_, value) => {
                if (value === currentPriority) {
                  return Promise.reject(new Error('Please select a different priority'));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <Select
            placeholder="Select new priority"
            onChange={handlePriorityChange}
            data-testid="priority-select"
            size="large"
          >
            {PRIORITY_OPTIONS.map((option) => (
              <Option key={option.value} value={option.value}>
                <Tag color={option.color} icon={option.icon}>
                  {option.label}
                </Tag>
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="reason"
          label="Reason for Change"
          rules={[{ required: isHighPriority, message: 'Please select a reason for high/urgent priority' }]}
        >
          <Select
            placeholder="Select reason"
            data-testid="reason-select"
            disabled={!isHighPriority}
          >
            {PRIORITY_CHANGE_REASONS.map((reason) => (
              <Option key={reason} value={reason}>
                {reason}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="notes"
          label="Additional Notes"
        >
          <TextArea
            rows={3}
            placeholder="Optional: Add any additional context for this priority change..."
            data-testid="notes-textarea"
          />
        </Form.Item>

        {isUrgent && (
          <Alert
            message="Urgent Priority - Hot Job"
            description="This work order will be expedited and may interrupt current production. Ensure all stakeholders are notified."
            type="warning"
            showIcon
            icon={<ThunderboltOutlined />}
            style={{ marginTop: 16 }}
          />
        )}

        {isHighPriority && !isUrgent && (
          <Alert
            message="High Priority"
            description="This work order will be prioritized in the production schedule."
            type="info"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </Form>
    </Modal>
  );
};
