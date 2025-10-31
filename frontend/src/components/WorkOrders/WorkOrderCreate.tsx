import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal, Form, Input, InputNumber, DatePicker, Select, Alert, message } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
// import { workOrderAPI } from '@/services/workOrderApi';
import { useSite } from '@/contexts/SiteContext';
import { useFocusManagement } from '../../hooks/useFocusManagement';
import { useKeyboardHandler } from '../../hooks/useKeyboardHandler';
import { useComponentShortcuts } from '../../contexts/KeyboardShortcutContext';
import { announceToScreenReader } from '../../utils/ariaUtils';

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

  // Refs for focus management
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus management for modal
  const { focusFirst, focusElement } = useFocusManagement({
    containerRef: modalRef,
    enableFocusTrap: visible,
    restoreFocus: true,
    autoFocus: true,
  });

  // Keyboard handler for modal actions
  const { keyboardProps } = useKeyboardHandler({
    enableActivation: false,
    enableEscape: true,
    onEscape: (event) => {
      // Check if form has been modified
      const hasFormData = form.isFieldsTouched();
      if (hasFormData) {
        if (window.confirm('Are you sure you want to cancel? Any entered information will be lost.')) {
          handleCancel();
        }
      } else {
        handleCancel();
      }
      event.preventDefault();
    },
  });

  // Register keyboard shortcuts for work order creation
  useComponentShortcuts('work-order-create', [
    {
      description: 'Submit work order',
      keys: 'Ctrl+Enter',
      handler: () => {
        if (!submitting) {
          form.submit();
        }
      },
      category: 'workorder',
      priority: 3,
    },
    {
      description: 'Focus part number field',
      keys: 'Alt+P',
      handler: () => {
        const partField = modalRef.current?.querySelector('[data-testid="part-number-select"]') as HTMLElement;
        if (partField) {
          focusElement(partField);
        }
      },
      category: 'workorder',
      priority: 2,
    },
    {
      description: 'Focus quantity field',
      keys: 'Alt+Q',
      handler: () => {
        const quantityField = modalRef.current?.querySelector('[data-testid="quantity-input"]') as HTMLElement;
        if (quantityField) {
          focusElement(quantityField);
        }
      },
      category: 'workorder',
      priority: 2,
    },
  ]);

  useEffect(() => {
    if (visible) {
      loadParts();
    }
  }, [visible]);

  // Enhanced focus management when modal opens
  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        // Focus the first form field when modal opens
        const firstField = modalRef.current?.querySelector('input, .ant-select-selector') as HTMLElement;
        if (firstField) {
          focusElement(firstField);
        }
      }, 100);
    }
  }, [visible, focusElement]);

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

    // Announce submission start
    announceToScreenReader('Creating work order, please wait...', 'POLITE');

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
      const successMessage = `Work order ${newWorkOrder.workOrderNumber} created successfully`;
      message.success(successMessage);
      announceToScreenReader(successMessage, 'POLITE');

      form.resetFields();
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to create work order:', error);
      const errorMessage = error.message || 'Failed to create work order';
      message.error(errorMessage);
      announceToScreenReader(`Error: ${errorMessage}`, 'ASSERTIVE');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = useCallback(() => {
    form.resetFields();
    announceToScreenReader('Work order creation cancelled', 'POLITE');
    onClose();
  }, [form, onClose]);

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
      modalRender={(modal) => (
        <div
          ref={modalRef}
          {...keyboardProps}
          role="dialog"
          aria-labelledby="work-order-create-title"
          aria-describedby="work-order-create-description"
          aria-modal="true"
        >
          {modal}
        </div>
      )}
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
            aria-label="Select part number for work order"
            aria-describedby="part-number-hint"
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
            aria-label="Enter quantity to produce"
            aria-describedby="quantity-hint"
          />
        </Form.Item>

        <Form.Item
          name="priority"
          label="Priority"
          rules={[{ required: true, message: 'Please select priority' }]}
        >
          <Select
            placeholder="Select priority"
            data-testid="priority-select"
            aria-label="Select work order priority level"
            aria-describedby="priority-hint"
          >
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
            aria-label="Enter customer order number"
            aria-describedby="customer-order-hint"
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
            aria-label="Select work order due date"
            aria-describedby="due-date-hint"
          />
        </Form.Item>
      </Form>

      {/* Hidden ARIA hints for screen readers */}
      <div id="work-order-create-title" style={{ display: 'none' }}>
        Create Work Order
      </div>
      <div id="work-order-create-description" style={{ display: 'none' }}>
        Create a new work order modal. Use Ctrl+Enter to submit, Alt+P to focus part number, Alt+Q to focus quantity, Escape to cancel.
      </div>
      <div id="part-number-hint" style={{ display: 'none' }}>
        Select the part number to manufacture. Use Alt+P to quickly focus this field.
      </div>
      <div id="quantity-hint" style={{ display: 'none' }}>
        Enter the quantity to produce. Use Alt+Q to quickly focus this field.
      </div>
      <div id="priority-hint" style={{ display: 'none' }}>
        Select the work order priority: Low, Normal, High, or Urgent.
      </div>
      <div id="customer-order-hint" style={{ display: 'none' }}>
        Optional customer order number for tracking purposes.
      </div>
      <div id="due-date-hint" style={{ display: 'none' }}>
        Optional due date for work order completion.
      </div>
    </Modal>
  );
};
