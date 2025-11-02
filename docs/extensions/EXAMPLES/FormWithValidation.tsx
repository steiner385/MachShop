/**
 * FormWithValidation - Complete form example with validation
 *
 * This example demonstrates:
 * - Ant Design Form component
 * - Field validation (sync and async)
 * - Custom validation rules
 * - Error handling and display
 * - Loading states during submission
 * - Form reset and field manipulation
 * - Accessibility features (labels, ARIA)
 *
 * @example
 * <FormWithValidation
 *   onSubmit={handleSubmit}
 *   initialValues={{ name: 'John' }}
 * />
 */

import React, { useState, useCallback } from 'react';
import {
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Button,
  Card,
  Space,
  Alert,
  Divider,
  message,
  Row,
  Col
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  SaveOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { useTheme } from '@/hooks/useTheme';
import type { FormInstance } from 'antd/es/form';
import styles from './FormWithValidation.module.css';

const { Option } = Select;
const { TextArea } = Input;

/**
 * Form data interface
 */
export interface FormData {
  name: string;
  email: string;
  phone?: string;
  role: string;
  department: string;
  startDate: any;
  salary?: number;
  notes?: string;
}

/**
 * Component props
 */
export interface FormWithValidationProps {
  /** Initial form values */
  initialValues?: Partial<FormData>;

  /** Callback when form is submitted */
  onSubmit: (data: FormData) => Promise<void>;

  /** Callback when form is cancelled */
  onCancel?: () => void;

  /** Read-only mode */
  readOnly?: boolean;

  /** Show loading state */
  loading?: boolean;
}

/**
 * FormWithValidation Component
 *
 * A comprehensive form example with validation, error handling,
 * and accessibility features.
 */
export const FormWithValidation: React.FC<FormWithValidationProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  readOnly = false,
  loading = false,
}) => {
  const { theme } = useTheme();
  const [form] = Form.useForm<FormData>();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /**
   * Validate email format
   */
  const validateEmail = (_: any, value: string) => {
    if (!value) {
      return Promise.reject(new Error('Please enter your email'));
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return Promise.reject(new Error('Please enter a valid email address'));
    }

    return Promise.resolve();
  };

  /**
   * Async validation - check if email is already taken
   */
  const validateEmailUnique = async (_: any, value: string) => {
    if (!value) return;

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    // Simulate checking if email exists
    const existingEmails = ['admin@example.com', 'user@example.com'];
    if (existingEmails.includes(value.toLowerCase())) {
      throw new Error('This email is already registered');
    }
  };

  /**
   * Validate phone number format
   */
  const validatePhone = (_: any, value: string) => {
    if (!value) {
      return Promise.resolve(); // Phone is optional
    }

    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!phoneRegex.test(value)) {
      return Promise.reject(new Error('Please enter a valid phone number'));
    }

    if (value.replace(/\D/g, '').length < 10) {
      return Promise.reject(new Error('Phone number must be at least 10 digits'));
    }

    return Promise.resolve();
  };

  /**
   * Validate salary is within range
   */
  const validateSalary = (_: any, value: number) => {
    if (!value) {
      return Promise.resolve(); // Salary is optional
    }

    if (value < 0) {
      return Promise.reject(new Error('Salary cannot be negative'));
    }

    if (value > 1000000) {
      return Promise.reject(new Error('Salary seems unusually high. Please verify.'));
    }

    return Promise.resolve();
  };

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async (values: FormData) => {
    try {
      setSubmitting(true);
      setSubmitError(null);

      await onSubmit(values);

      message.success('Form submitted successfully!');
      form.resetFields();
    } catch (error) {
      console.error('Form submission error:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : 'An error occurred while submitting the form';
      setSubmitError(errorMessage);
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }, [onSubmit, form]);

  /**
   * Handle form submission failure (validation errors)
   */
  const handleSubmitFailed = (errorInfo: any) => {
    console.error('Validation failed:', errorInfo);
    message.error('Please check the form for errors');
  };

  /**
   * Handle cancel
   */
  const handleCancel = useCallback(() => {
    form.resetFields();
    setSubmitError(null);

    if (onCancel) {
      onCancel();
    }
  }, [form, onCancel]);

  /**
   * Reset form to initial values
   */
  const handleReset = useCallback(() => {
    form.resetFields();
    setSubmitError(null);
    message.info('Form has been reset');
  }, [form]);

  return (
    <Card
      className={styles.container}
      title="User Registration Form"
      extra={
        readOnly && (
          <Alert
            message="Read-only"
            type="info"
            showIcon
            banner
            style={{ padding: '4px 12px' }}
          />
        )
      }
    >
      {submitError && (
        <Alert
          type="error"
          message="Submission Error"
          description={submitError}
          closable
          onClose={() => setSubmitError(null)}
          style={{ marginBottom: theme.tokens.marginMD }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onFinish={handleSubmit}
        onFinishFailed={handleSubmitFailed}
        disabled={readOnly || loading}
        requiredMark="optional"
      >
        <Row gutter={16}>
          {/* Name Field */}
          <Col xs={24} md={12}>
            <Form.Item
              label="Full Name"
              name="name"
              rules={[
                { required: true, message: 'Please enter your full name' },
                { min: 2, message: 'Name must be at least 2 characters' },
                { max: 100, message: 'Name must not exceed 100 characters' },
                {
                  pattern: /^[a-zA-Z\s]+$/,
                  message: 'Name can only contain letters and spaces'
                }
              ]}
              tooltip="Enter your first and last name"
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="John Doe"
                maxLength={100}
                aria-label="Full Name"
              />
            </Form.Item>
          </Col>

          {/* Email Field */}
          <Col xs={24} md={12}>
            <Form.Item
              label="Email Address"
              name="email"
              rules={[
                { required: true },
                { validator: validateEmail },
                { validator: validateEmailUnique }
              ]}
              hasFeedback
              validateDebounce={500}
              tooltip="We'll never share your email with anyone else"
            >
              <Input
                prefix={<MailOutlined />}
                type="email"
                placeholder="john.doe@example.com"
                aria-label="Email Address"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          {/* Phone Field (Optional) */}
          <Col xs={24} md={12}>
            <Form.Item
              label="Phone Number"
              name="phone"
              rules={[{ validator: validatePhone }]}
              tooltip="Optional - Include country code if international"
            >
              <Input
                prefix={<PhoneOutlined />}
                placeholder="+1 (555) 123-4567"
                aria-label="Phone Number"
              />
            </Form.Item>
          </Col>

          {/* Role Field */}
          <Col xs={24} md={12}>
            <Form.Item
              label="Role"
              name="role"
              rules={[{ required: true, message: 'Please select a role' }]}
            >
              <Select
                placeholder="Select a role"
                aria-label="Role"
                showSearch
              >
                <Option value="operator">Operator</Option>
                <Option value="manager">Manager</Option>
                <Option value="supervisor">Supervisor</Option>
                <Option value="admin">Administrator</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          {/* Department Field */}
          <Col xs={24} md={12}>
            <Form.Item
              label="Department"
              name="department"
              rules={[{ required: true, message: 'Please select a department' }]}
            >
              <Select
                placeholder="Select a department"
                aria-label="Department"
                showSearch
              >
                <Option value="production">Production</Option>
                <Option value="quality">Quality Control</Option>
                <Option value="maintenance">Maintenance</Option>
                <Option value="logistics">Logistics</Option>
                <Option value="administration">Administration</Option>
              </Select>
            </Form.Item>
          </Col>

          {/* Start Date Field */}
          <Col xs={24} md={12}>
            <Form.Item
              label="Start Date"
              name="startDate"
              rules={[{ required: true, message: 'Please select a start date' }]}
            >
              <DatePicker
                style={{ width: '100%' }}
                placeholder="Select start date"
                aria-label="Start Date"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          {/* Salary Field (Optional) */}
          <Col xs={24} md={12}>
            <Form.Item
              label="Annual Salary"
              name="salary"
              rules={[{ validator: validateSalary }]}
              tooltip="Optional - Enter annual salary in USD"
            >
              <InputNumber
                style={{ width: '100%' }}
                prefix="$"
                placeholder="50000"
                min={0}
                max={1000000}
                step={1000}
                formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value!.replace(/\$\s?|(,*)/g, '')}
                aria-label="Annual Salary"
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Notes Field */}
        <Form.Item
          label="Additional Notes"
          name="notes"
          tooltip="Any additional information or special requirements"
        >
          <TextArea
            rows={4}
            placeholder="Enter any additional notes or comments..."
            maxLength={500}
            showCount
            aria-label="Additional Notes"
          />
        </Form.Item>

        <Divider />

        {/* Form Actions */}
        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={submitting || loading}
              disabled={readOnly}
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </Button>

            <Button
              onClick={handleReset}
              disabled={submitting || loading || readOnly}
            >
              Reset
            </Button>

            {onCancel && (
              <Button
                icon={<CloseOutlined />}
                onClick={handleCancel}
                disabled={submitting || loading}
              >
                Cancel
              </Button>
            )}
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

FormWithValidation.displayName = 'FormWithValidation';

export default FormWithValidation;
