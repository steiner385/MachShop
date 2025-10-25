/**
 * Production Entry Form
 * Form for operators to record production activities
 * - Record completion quantities
 * - Report scrap with reason codes
 * - Report rework
 * - Validates against business rules
 */

import React, { useState } from 'react';
import { Form, Input, InputNumber, Select, Button, Space, Alert, message } from 'antd';
import { CheckCircleOutlined, StopOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface ProductionEntryFormProps {
  workOrderId: string;
  operationNumber: number;
  orderedQuantity: number;
  completedQuantity: number;
  onSubmit: (values: ProductionEntryValues) => Promise<void>;
  onCancel?: () => void;
}

export interface ProductionEntryValues {
  type: 'complete' | 'scrap' | 'rework';
  quantity: number;
  scrapReasonCode?: string;
  reworkReasonCode?: string;
  notes?: string;
}

// Scrap reason codes (ISO 10303-224 compliant)
const SCRAP_REASON_CODES = [
  { value: 'MATERIAL_DEFECT', label: 'Material Defect' },
  { value: 'DIMENSION_OUT_OF_SPEC', label: 'Dimension Out of Specification' },
  { value: 'SURFACE_FINISH_REJECT', label: 'Surface Finish Reject' },
  { value: 'TOOL_BREAKAGE', label: 'Tool Breakage/Damage' },
  { value: 'OPERATOR_ERROR', label: 'Operator Error' },
  { value: 'MACHINE_MALFUNCTION', label: 'Machine Malfunction' },
  { value: 'IMPROPER_SETUP', label: 'Improper Setup' },
  { value: 'FOREIGN_OBJECT_DAMAGE', label: 'Foreign Object Damage (FOD)' },
  { value: 'HEAT_TREAT_FAILURE', label: 'Heat Treatment Failure' },
  { value: 'COATING_DEFECT', label: 'Coating Defect' },
  { value: 'OTHER', label: 'Other (See Notes)' },
];

// Rework reason codes
const REWORK_REASON_CODES = [
  { value: 'DIMENSION_UNDERSIZE', label: 'Dimension Undersize (Rework Possible)' },
  { value: 'BURR_REMOVAL', label: 'Burr Removal Required' },
  { value: 'SURFACE_REWORK', label: 'Surface Rework Required' },
  { value: 'RECOAT_REQUIRED', label: 'Recoating Required' },
  { value: 'ASSEMBLY_DEFECT', label: 'Assembly Defect - Rework' },
  { value: 'OTHER', label: 'Other (See Notes)' },
];

export const ProductionEntryForm: React.FC<ProductionEntryFormProps> = ({
  workOrderId: _workOrderId,
  operationNumber: _operationNumber,
  orderedQuantity,
  completedQuantity,
  onSubmit,
  onCancel,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [entryType, setEntryType] = useState<'complete' | 'scrap' | 'rework'>('complete');

  const remainingQuantity = orderedQuantity - completedQuantity;

  const handleSubmit = async (values: ProductionEntryValues) => {
    setLoading(true);
    try {
      await onSubmit(values);
      message.success(`${values.type === 'complete' ? 'Completion' : values.type.charAt(0).toUpperCase() + values.type.slice(1)} recorded successfully`);
      form.resetFields();
    } catch (error) {
      message.error(`Failed to record ${values.type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const validateQuantity = (_: any, value: number) => {
    if (!value || value <= 0) {
      return Promise.reject(new Error('Quantity must be greater than zero'));
    }

    if (value < 0) {
      return Promise.reject(new Error('Negative quantities are not allowed'));
    }

    if (entryType === 'complete' && value > remainingQuantity) {
      return Promise.reject(new Error(`Quantity cannot exceed remaining quantity (${remainingQuantity})`));
    }

    if (entryType !== 'complete' && value > completedQuantity) {
      return Promise.reject(new Error(`Quantity cannot exceed completed quantity (${completedQuantity})`));
    }

    return Promise.resolve();
  };

  return (
    <div data-testid="production-entry-form">
      <Alert
        message="Production Entry"
        description={`Remaining: ${remainingQuantity} units | Completed: ${completedQuantity} units`}
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ type: 'complete' }}
      >
        <Form.Item
          name="type"
          label="Entry Type"
          rules={[{ required: true, message: 'Please select entry type' }]}
        >
          <Select
            data-testid="entry-type-select"
            onChange={(value) => {
              setEntryType(value);
              form.setFieldsValue({ quantity: undefined });
            }}
            options={[
              { value: 'complete', label: 'Complete (Good Parts)' },
              { value: 'scrap', label: 'Scrap (Non-Repairable)' },
              { value: 'rework', label: 'Rework (Repairable)' },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="quantity"
          label="Quantity"
          rules={[
            { required: true, message: 'Please enter quantity' },
            { validator: validateQuantity },
          ]}
        >
          <InputNumber
            data-testid={`${entryType}-quantity-input`}
            style={{ width: '100%' }}
            min={1}
            max={entryType === 'complete' ? remainingQuantity : completedQuantity}
            placeholder={`Enter quantity (max: ${entryType === 'complete' ? remainingQuantity : completedQuantity})`}
          />
        </Form.Item>

        {entryType === 'scrap' && (
          <Form.Item
            name="scrapReasonCode"
            label="Scrap Reason Code"
            rules={[{ required: true, message: 'Scrap reason code is required' }]}
          >
            <Select
              data-testid="scrap-reason-select"
              placeholder="Select scrap reason"
              options={SCRAP_REASON_CODES}
            />
          </Form.Item>
        )}

        {entryType === 'rework' && (
          <Form.Item
            name="reworkReasonCode"
            label="Rework Reason Code"
            rules={[{ required: true, message: 'Rework reason code is required' }]}
          >
            <Select
              data-testid="rework-reason-select"
              placeholder="Select rework reason"
              options={REWORK_REASON_CODES}
            />
          </Form.Item>
        )}

        <Form.Item
          name="notes"
          label="Notes"
          rules={[
            entryType === 'scrap' && form.getFieldValue('scrapReasonCode') === 'OTHER'
              ? { required: true, message: 'Notes are required for "Other" reason code' }
              : {},
          ]}
        >
          <TextArea
            data-testid="notes-textarea"
            rows={3}
            placeholder="Additional notes or details..."
          />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={entryType === 'complete' ? <CheckCircleOutlined /> : <StopOutlined />}
              data-testid="submit-production-entry-button"
            >
              Record {entryType === 'complete' ? 'Completion' : entryType.charAt(0).toUpperCase() + entryType.slice(1)}
            </Button>
            {onCancel && (
              <Button onClick={onCancel} data-testid="cancel-button">
                Cancel
              </Button>
            )}
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};
