/**
 * WorkOrderForm Component
 *
 * Provides a form for creating and editing work orders with:
 * - Input validation
 * - Responsive design
 * - Error handling
 * - Loading states
 * - Accessibility (WCAG 2.1 AA)
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Form, Input, InputNumber, DatePicker, Select, Button, Alert, Space, Spin } from 'antd';
import { PlusOutlined, SaveOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import classNames from 'classnames';
import type { WorkOrder, WorkOrderFormProps } from '../../types';
import './WorkOrderForm.css';

const WORK_ORDER_PRIORITIES = [
  { label: 'Low', value: 'LOW' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'High', value: 'HIGH' },
  { label: 'Critical', value: 'CRITICAL' }
];

const WORK_ORDER_STATUSES = [
  { label: 'Scheduled', value: 'SCHEDULED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'On Hold', value: 'HOLD' },
  { label: 'Cancelled', value: 'CANCELLED' }
];

/**
 * WorkOrderForm Component
 *
 * @example
 * ```tsx
 * <WorkOrderForm
 *   onSubmit={async (data) => {
 *     await createWorkOrder(data);
 *   }}
 * />
 * ```
 *
 * @param props - Component props
 * @returns Rendered component
 */
export const WorkOrderForm: React.FC<WorkOrderFormProps> = ({
  onSubmit,
  initialData,
  isLoading = false,
  error
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Auto-fill form with initial data
  const initialValues = useMemo(() => {
    if (!initialData) return undefined;
    return {
      ...initialData,
      plannedStartDate: dayjs(initialData.plannedStartDate),
      plannedEndDate: dayjs(initialData.plannedEndDate),
      actualStartDate: initialData.actualStartDate ? dayjs(initialData.actualStartDate) : null,
      actualEndDate: initialData.actualEndDate ? dayjs(initialData.actualEndDate) : null
    };
  }, [initialData]);

  const handleSubmit = useCallback(async (values: any) => {
    try {
      setValidationError(null);
      setSubmitting(true);

      // Validate dates
      if (values.plannedEndDate.isBefore(values.plannedStartDate)) {
        setValidationError('End date must be after start date');
        return;
      }

      const formData: Omit<WorkOrder, 'id'> = {
        number: values.number,
        partNumber: values.partNumber,
        partName: values.partName,
        quantity: values.quantity,
        plannedStartDate: values.plannedStartDate.toDate(),
        plannedEndDate: values.plannedEndDate.toDate(),
        status: values.status || 'SCHEDULED',
        priority: values.priority || 'MEDIUM',
        assignedOperator: values.assignedOperator,
        assignedWorkCenter: values.assignedWorkCenter,
        notes: values.notes
      };

      if (values.actualStartDate) {
        formData.actualStartDate = values.actualStartDate.toDate();
      }
      if (values.actualEndDate) {
        formData.actualEndDate = values.actualEndDate.toDate();
      }

      await onSubmit(formData);
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  }, [onSubmit]);

  const isProcessing = submitting || isLoading;

  return (
    <div className="work-order-form-container">
      <Spin spinning={isProcessing} tip="Processing...">
        {(error || validationError) && (
          <Alert
            message="Error"
            description={error || validationError}
            type="error"
            showIcon
            closable
            style={{ marginBottom: 16 }}
            role="alert"
          />
        )}

        <Form
          form={form}
          layout="vertical"
          initialValues={initialValues}
          onFinish={handleSubmit}
          className="work-order-form"
          requiredMark="optional"
          autoComplete="off"
        >
          {/* Work Order Identification */}
          <fieldset className="form-fieldset">
            <legend className="form-legend">Work Order Identification</legend>

            <Form.Item
              label="Work Order Number"
              name="number"
              rules={[
                { required: true, message: 'Work order number is required' },
                { pattern: /^[A-Z0-9-]{3,20}$/, message: 'Invalid work order number format' }
              ]}
            >
              <Input
                placeholder="e.g., WO-2024-001"
                disabled={!!initialData}
                aria-label="Work order number"
              />
            </Form.Item>

            <Form.Item
              label="Part Number"
              name="partNumber"
              rules={[{ required: true, message: 'Part number is required' }]}
            >
              <Input placeholder="e.g., PN-12345" aria-label="Part number" />
            </Form.Item>

            <Form.Item
              label="Part Name"
              name="partName"
              rules={[{ required: true, message: 'Part name is required' }]}
            >
              <Input placeholder="e.g., Drive Assembly" aria-label="Part name" />
            </Form.Item>
          </fieldset>

          {/* Quantity and Scheduling */}
          <fieldset className="form-fieldset">
            <legend className="form-legend">Quantity & Scheduling</legend>

            <Form.Item
              label="Quantity"
              name="quantity"
              rules={[
                { required: true, message: 'Quantity is required' },
                { type: 'number', min: 1, message: 'Quantity must be at least 1' }
              ]}
            >
              <InputNumber min={1} step={1} aria-label="Quantity" style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              label="Planned Start Date"
              name="plannedStartDate"
              rules={[{ required: true, message: 'Planned start date is required' }]}
            >
              <DatePicker showTime aria-label="Planned start date" style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              label="Planned End Date"
              name="plannedEndDate"
              rules={[{ required: true, message: 'Planned end date is required' }]}
            >
              <DatePicker showTime aria-label="Planned end date" style={{ width: '100%' }} />
            </Form.Item>
          </fieldset>

          {/* Status and Priority */}
          <fieldset className="form-fieldset">
            <legend className="form-legend">Status & Priority</legend>

            <Form.Item
              label="Status"
              name="status"
              initialValue="SCHEDULED"
            >
              <Select
                options={WORK_ORDER_STATUSES}
                aria-label="Work order status"
              />
            </Form.Item>

            <Form.Item
              label="Priority"
              name="priority"
              initialValue="MEDIUM"
            >
              <Select
                options={WORK_ORDER_PRIORITIES}
                aria-label="Work order priority"
              />
            </Form.Item>
          </fieldset>

          {/* Assignment */}
          <fieldset className="form-fieldset">
            <legend className="form-legend">Assignment</legend>

            <Form.Item
              label="Assigned Operator"
              name="assignedOperator"
            >
              <Input placeholder="Operator name or ID" aria-label="Assigned operator" />
            </Form.Item>

            <Form.Item
              label="Assigned Work Center"
              name="assignedWorkCenter"
            >
              <Input placeholder="Work center ID or name" aria-label="Assigned work center" />
            </Form.Item>
          </fieldset>

          {/* Additional Information */}
          <fieldset className="form-fieldset">
            <legend className="form-legend">Additional Information</legend>

            <Form.Item
              label="Notes"
              name="notes"
            >
              <Input.TextArea
                rows={3}
                placeholder="Additional notes or special instructions"
                aria-label="Notes"
              />
            </Form.Item>
          </fieldset>

          {/* Form Actions */}
          <Form.Item className="form-actions">
            <Space>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                htmlType="submit"
                loading={isProcessing}
                aria-label="Submit work order form"
              >
                {initialData ? 'Update' : 'Create'} Work Order
              </Button>
              <Button
                htmlType="reset"
                onClick={() => form.resetFields()}
                aria-label="Reset form"
              >
                Reset
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Spin>
    </div>
  );
};

export default WorkOrderForm;
