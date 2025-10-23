import React, { useState } from 'react';
import { Modal, Form, DatePicker, message, Alert, Select, Input, Space } from 'antd';
import { CalendarOutlined, InfoCircleOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

interface WorkOrderRescheduleProps {
  workOrderId: string;
  workOrderNumber: string;
  currentStartDate?: string;
  currentEndDate?: string;
  currentDueDate?: string;
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const RESCHEDULE_REASONS = [
  'Equipment Downtime',
  'Material Delay',
  'Capacity Adjustment',
  'Customer Request',
  'Workload Balancing',
  'Setup Optimization',
  'Preventive Maintenance',
  'Other',
];

/**
 * Work Order Reschedule Component
 *
 * Allows production schedulers to reschedule work orders by changing
 * scheduled start/end dates and due dates to respond to shop floor changes.
 */
export const WorkOrderReschedule: React.FC<WorkOrderRescheduleProps> = ({
  workOrderId,
  workOrderNumber,
  currentStartDate,
  currentEndDate,
  currentDueDate,
  visible,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');

      // Build update payload
      const updateData: any = {};

      if (values.scheduledDates && values.scheduledDates.length === 2) {
        updateData.scheduledStartDate = values.scheduledDates[0].toISOString();
        updateData.scheduledEndDate = values.scheduledDates[1].toISOString();
      }

      if (values.dueDate) {
        updateData.dueDate = values.dueDate.toISOString();
      }

      if (Object.keys(updateData).length === 0) {
        message.warning('Please select at least one date to reschedule');
        return;
      }

      const response = await fetch(`/api/v1/workorders/${workOrderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reschedule work order');
      }

      message.success(`Work order ${workOrderNumber} rescheduled successfully`);
      form.resetFields();
      onSuccess();
      onClose();
    } catch (error: any) {
      message.error(error.message || 'Failed to reschedule work order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  // Convert current dates to dayjs objects for display
  const currentScheduledDates = currentStartDate && currentEndDate
    ? [dayjs(currentStartDate), dayjs(currentEndDate)]
    : undefined;

  const currentDue = currentDueDate ? dayjs(currentDueDate) : undefined;

  return (
    <Modal
      title={
        <span>
          <CalendarOutlined /> Reschedule Work Order - {workOrderNumber}
        </span>
      }
      open={visible}
      onCancel={handleCancel}
      onOk={() => form.submit()}
      confirmLoading={submitting}
      width={700}
      okText="Reschedule"
      cancelText="Cancel"
    >
      {(currentScheduledDates || currentDue) && (
        <Alert
          message="Current Schedule"
          description={
            <div>
              {currentScheduledDates && (
                <div>
                  <strong>Scheduled:</strong> {currentScheduledDates[0].format('MMM DD, YYYY')}
                  {' → '}
                  {currentScheduledDates[1].format('MMM DD, YYYY')}
                </div>
              )}
              {currentDue && (
                <div>
                  <strong>Due Date:</strong> {currentDue.format('MMM DD, YYYY')}
                </div>
              )}
            </div>
          }
          type="info"
          icon={<InfoCircleOutlined />}
          style={{ marginBottom: 16 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          name="scheduledDates"
          label="Scheduled Start and End Date"
          help="Select new start and end dates for production"
        >
          <RangePicker
            style={{ width: '100%' }}
            format="YYYY-MM-DD HH:mm"
            showTime={{ format: 'HH:mm' }}
            placeholder={['Start Date', 'End Date']}
            data-testid="scheduled-dates-picker"
          />
        </Form.Item>

        <Form.Item
          name="dueDate"
          label="Due Date"
          help="Customer delivery due date"
        >
          <DatePicker
            style={{ width: '100%' }}
            format="YYYY-MM-DD"
            placeholder="Select due date"
            data-testid="due-date-picker"
          />
        </Form.Item>

        <Form.Item
          name="reason"
          label="Reason for Reschedule"
          rules={[{ required: true, message: 'Please select a reason' }]}
        >
          <Select
            placeholder="Select reason for rescheduling"
            data-testid="reason-select"
          >
            {RESCHEDULE_REASONS.map((reason) => (
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
            placeholder="Add any additional context for this schedule change..."
            data-testid="notes-textarea"
          />
        </Form.Item>

        <Alert
          message="Schedule Change Impact"
          description="Rescheduling will update the production schedule and may affect downstream operations. Ensure coordination with affected teams."
          type="warning"
          showIcon
          style={{ marginTop: 16 }}
        />
      </Form>
    </Modal>
  );
};
