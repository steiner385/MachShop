import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, DatePicker, Select, Alert, message } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
// import { workOrderAPI } from '@/services/workOrderApi';
import { useSite } from '@/contexts/SiteContext';

const { Option } = Select;
// const { TextArea } = Input;

interface WorkOrderCreateProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface PartOption {
  id: string;
  partNumber: string;
  partName: string;
}

/**
 * Work Order Create Modal Component
 *
 * Allows production planners to create new work orders from customer orders.
 * Validates all required fields and submits to backend API.
 */
export const WorkOrderCreate: React.FC<WorkOrderCreateProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [parts, setParts] = useState<PartOption[]>([]);
  const [loadingParts, setLoadingParts] = useState(false);
  const { currentSite } = useSite();

  useEffect(() => {
    if (visible) {
      loadParts();
    }
  }, [visible]);

  const loadParts = async () => {
    setLoadingParts(true);
    try {
      // Fetch parts from API
      const response = await fetch('/api/v1/parts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setParts(data.parts || []);
      } else {
        // Use mock data if API fails
        setParts([
          { id: '1', partNumber: 'TURB-BLADE-001', partName: 'Turbine Blade Assembly' },
          { id: '2', partNumber: 'GUIDE-VANE-001', partName: 'Guide Vane' },
          { id: '3', partNumber: 'SHAFT-001', partName: 'Main Shaft' },
        ]);
      }
    } catch (error) {
      console.error('Failed to load parts:', error);
      // Use mock data as fallback
      setParts([
        { id: '1', partNumber: 'TURB-BLADE-001', partName: 'Turbine Blade Assembly' },
        { id: '2', partNumber: 'GUIDE-VANE-001', partName: 'Guide Vane' },
        { id: '3', partNumber: 'SHAFT-001', partName: 'Main Shaft' },
      ]);
    } finally {
      setLoadingParts(false);
    }
  };

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');

      // Format the request body
      const requestBody = {
        partNumber: values.partNumber,
        quantityOrdered: values.quantityOrdered,
        priority: values.priority || 'NORMAL',
        customerOrder: values.customerOrder,
        dueDate: values.dueDate ? values.dueDate.toISOString() : undefined,
        siteId: currentSite?.id,
      };

      const response = await fetch('/api/v1/workorders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create work order');
      }

      const newWorkOrder = await response.json();
      message.success(`Work order ${newWorkOrder.workOrderNumber} created successfully`);
      form.resetFields();
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to create work order:', error);
      message.error(error.message || 'Failed to create work order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="Create Work Order"
      open={visible}
      onCancel={handleCancel}
      onOk={() => form.submit()}
      confirmLoading={submitting}
      width={600}
      okText="Create Work Order"
      cancelText="Cancel"
    >
      <Alert
        message="Create from Customer Order"
        description="Create a new work order from a customer order or forecast. This will generate manufacturing operations based on the part routing."
        type="info"
        icon={<InfoCircleOutlined />}
        style={{ marginBottom: 16 }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ priority: 'NORMAL' }}
      >
        <Form.Item
          name="partNumber"
          label="Part Number"
          rules={[{ required: true, message: 'Please select a part number' }]}
        >
          <Select
            placeholder="Select part number"
            loading={loadingParts}
            showSearch
            filterOption={(input, option) =>
              (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
            }
            data-testid="part-number-select"
          >
            {parts.map((part) => (
              <Option key={part.partNumber} value={part.partNumber}>
                {part.partNumber} - {part.partName}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="quantityOrdered"
          label="Quantity"
          rules={[
            { required: true, message: 'Please enter quantity' },
            {
              type: 'number',
              min: 1,
              message: 'Quantity must be greater than 0',
            },
          ]}
        >
          <InputNumber
            placeholder="Enter quantity"
            style={{ width: '100%' }}
            min={1}
            data-testid="quantity-input"
          />
        </Form.Item>

        <Form.Item
          name="priority"
          label="Priority"
          rules={[{ required: true, message: 'Please select priority' }]}
        >
          <Select placeholder="Select priority" data-testid="priority-select">
            <Option value="LOW">Low</Option>
            <Option value="NORMAL">Normal</Option>
            <Option value="HIGH">High</Option>
            <Option value="URGENT">Urgent</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="customerOrder"
          label="Customer Order Number"
        >
          <Input
            placeholder="Enter customer order number (optional)"
            data-testid="customer-order-input"
          />
        </Form.Item>

        <Form.Item
          name="dueDate"
          label="Due Date"
        >
          <DatePicker
            style={{ width: '100%' }}
            placeholder="Select due date (optional)"
            format="YYYY-MM-DD"
            data-testid="due-date-picker"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
