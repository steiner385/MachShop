import React, { useState } from 'react';
import { Modal, Select, Form, Input, message, Button, Space, Alert } from 'antd';
import { WarningOutlined } from '@ant-design/icons';

const { Option } = Select;
const { TextArea } = Input;

interface WorkOrderStatusUpdateProps {
  workOrderId: string;
  workOrderNumber: string;
  currentStatus: string;
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const STATUS_OPTIONS = [
  { value: 'CREATED', label: 'Created', color: 'default', disabled: true },
  { value: 'RELEASED', label: 'Released', color: 'blue' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'processing' },
  { value: 'ON_HOLD', label: 'On Hold', color: 'warning' },
  { value: 'COMPLETED', label: 'Completed', color: 'success' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'error' },
];

const HOLD_REASONS = [
  'Equipment Breakdown',
  'Material Shortage',
  'Quality Issue',
  'Safety Concern',
  'Tooling Problem',
  'Awaiting Instructions',
  'Other',
];

/**
 * Work Order Status Update Component
 *
 * Allows production supervisors to update work order status.
 * Requires reason for status changes (especially holds).
 */
export const WorkOrderStatusUpdate: React.FC<WorkOrderStatusUpdateProps> = ({
  workOrderId,
  workOrderNumber,
  currentStatus,
  visible,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>(currentStatus);

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value);
  };

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      // Call API to update work order status
      // await updateWorkOrderStatus(workOrderId, values);

      message.success(`Work order ${workOrderNumber} status updated to ${values.status}`);
      form.resetFields();
      onSuccess();
      onClose();
    } catch (error) {
      message.error('Failed to update work order status');
    } finally {
      setSubmitting(false);
    }
  };

  const requiresReason = selectedStatus === 'ON_HOLD' || selectedStatus === 'CANCELLED';

  return (
    <Modal
      title={`Update Status - ${workOrderNumber}`}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <Alert
        message={`Current Status: ${currentStatus}`}
        type="info"
        style={{ marginBottom: 16 }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ status: currentStatus }}
      >
        <Form.Item
          name="status"
          label="New Status"
          rules={[
            { required: true, message: 'Please select a status' },
            {
              validator: (_, value) => {
                if (value === currentStatus) {
                  return Promise.reject(new Error('Please select a different status'));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <Select
            placeholder="Select new status"
            onChange={handleStatusChange}
            data-testid="status-select"
          >
            {STATUS_OPTIONS.map((option) => (
              <Option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {requiresReason && (
          <>
            <Form.Item
              name="reason"
              label="Reason"
              rules={[{ required: true, message: 'Please select a reason' }]}
            >
              <Select
                placeholder="Select reason"
                data-testid="reason-select"
              >
                {HOLD_REASONS.map((reason) => (
                  <Option key={reason} value={reason}>
                    {reason}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="notes"
              label="Additional Notes"
              rules={[{ required: true, message: 'Please provide additional details' }]}
            >
              <TextArea
                rows={4}
                placeholder="Explain the reason for this status change..."
                data-testid="notes-textarea"
              />
            </Form.Item>

            {selectedStatus === 'ON_HOLD' && (
              <Alert
                message="Work Order On Hold"
                description="This will pause all operations and notify the team. Ensure all details are documented."
                type="warning"
                icon={<WarningOutlined />}
                style={{ marginBottom: 16 }}
              />
            )}
          </>
        )}

        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              data-testid="update-status-button"
            >
              Update Status
            </Button>
            <Button onClick={onClose}>Cancel</Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};
