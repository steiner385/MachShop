/**
 * AccessibleForm - WCAG 2.1 AA compliant form example
 *
 * This example demonstrates:
 * - WCAG 2.1 AA compliance
 * - Proper ARIA labels and attributes
 * - Keyboard navigation support
 * - Screen reader support
 * - Focus management
 * - Error announcements
 * - Accessible form validation
 *
 * @example
 * <AccessibleForm onSubmit={handleSubmit} />
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  Form,
  Input,
  Button,
  Card,
  Space,
  Alert,
  Checkbox,
  Radio,
  message
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  LockOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useTheme } from '@/hooks/useTheme';
import styles from './AccessibleForm.module.css';

/**
 * Form data interface
 */
export interface AccessibleFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
  contactMethod: 'email' | 'phone' | 'none';
}

/**
 * Component props
 */
export interface AccessibleFormProps {
  /** Callback when form is submitted */
  onSubmit: (data: AccessibleFormData) => Promise<void>;

  /** Initial values */
  initialValues?: Partial<AccessibleFormData>;
}

/**
 * AccessibleForm Component
 *
 * A fully accessible form that meets WCAG 2.1 AA standards.
 * Demonstrates proper use of ARIA labels, keyboard navigation,
 * and screen reader support.
 */
export const AccessibleForm: React.FC<AccessibleFormProps> = ({
  onSubmit,
  initialValues,
}) => {
  const { theme } = useTheme();
  const [form] = Form.useForm<AccessibleFormData>();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Refs for focus management
  const firstErrorRef = useRef<HTMLDivElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async (values: AccessibleFormData) => {
    try {
      setLoading(true);
      setErrors([]);

      // Announce to screen readers that form is being submitted
      message.loading({
        content: 'Submitting form...',
        key: 'submit',
        duration: 0,
      });

      await onSubmit(values);

      // Announce success to screen readers
      message.success({
        content: 'Form submitted successfully!',
        key: 'submit',
        duration: 3,
      });

      form.resetFields();
    } catch (error) {
      console.error('Form submission error:', error);

      const errorMessage = error instanceof Error
        ? error.message
        : 'An error occurred while submitting the form';

      setErrors([errorMessage]);

      // Announce error to screen readers
      message.error({
        content: errorMessage,
        key: 'submit',
        duration: 5,
      });

      // Focus on error message for screen readers
      setTimeout(() => {
        firstErrorRef.current?.focus();
      }, 100);
    } finally {
      setLoading(false);
    }
  }, [onSubmit, form]);

  /**
   * Handle validation errors
   */
  const handleValidationFailed = useCallback((errorInfo: any) => {
    const errorMessages = errorInfo.errorFields.map(
      (field: any) => `${field.name.join('.')}: ${field.errors.join(', ')}`
    );

    setErrors(errorMessages);

    // Announce validation errors to screen readers
    const errorCount = errorMessages.length;
    message.error({
      content: `Form has ${errorCount} error${errorCount > 1 ? 's' : ''}. Please review and correct.`,
      duration: 5,
    });

    // Focus on first error
    setTimeout(() => {
      firstErrorRef.current?.focus();
    }, 100);
  }, []);

  /**
   * Custom password validation
   */
  const validatePassword = (_: any, value: string) => {
    if (!value) {
      return Promise.reject(new Error('Please enter your password'));
    }

    if (value.length < 8) {
      return Promise.reject(new Error('Password must be at least 8 characters'));
    }

    if (!/[A-Z]/.test(value)) {
      return Promise.reject(new Error('Password must contain at least one uppercase letter'));
    }

    if (!/[a-z]/.test(value)) {
      return Promise.reject(new Error('Password must contain at least one lowercase letter'));
    }

    if (!/[0-9]/.test(value)) {
      return Promise.reject(new Error('Password must contain at least one number'));
    }

    return Promise.resolve();
  };

  /**
   * Validate password confirmation
   */
  const validateConfirmPassword = (_: any, value: string) => {
    if (!value) {
      return Promise.reject(new Error('Please confirm your password'));
    }

    const password = form.getFieldValue('password');
    if (value !== password) {
      return Promise.reject(new Error('Passwords do not match'));
    }

    return Promise.resolve();
  };

  return (
    <Card
      className={styles.container}
      title="Registration Form"
      // Main landmark for screen readers
      role="main"
      aria-label="Registration form"
    >
      {/* Error summary - announced to screen readers */}
      {errors.length > 0 && (
        <div
          ref={firstErrorRef}
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          tabIndex={-1}
          style={{ outline: 'none' }}
        >
          <Alert
            type="error"
            message={`Form has ${errors.length} error${errors.length > 1 ? 's' : ''}`}
            description={
              <ul aria-label="List of form errors" style={{ marginBottom: 0 }}>
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            }
            closable
            onClose={() => setErrors([])}
            style={{ marginBottom: theme.tokens.marginMD }}
          />
        </div>
      )}

      {/* Form instructions */}
      <div
        id="form-instructions"
        style={{
          padding: theme.tokens.marginSM,
          backgroundColor: theme.tokens.colorInfoBg,
          borderRadius: '4px',
          marginBottom: theme.tokens.marginMD,
          border: `1px solid ${theme.tokens.colorInfoBorder}`,
        }}
      >
        <Space>
          <InfoCircleOutlined style={{ color: theme.tokens.colorInfo }} />
          <span>
            All fields marked with an asterisk (*) are required.
            Use Tab to navigate between fields.
          </span>
        </Space>
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onFinish={handleSubmit}
        onFinishFailed={handleValidationFailed}
        requiredMark="optional"
        aria-describedby="form-instructions"
      >
        {/* Username Field */}
        <Form.Item
          label={<label htmlFor="username">Username</label>}
          name="username"
          rules={[
            { required: true, message: 'Please enter your username' },
            { min: 3, message: 'Username must be at least 3 characters' },
            { max: 20, message: 'Username must not exceed 20 characters' },
            {
              pattern: /^[a-zA-Z0-9_]+$/,
              message: 'Username can only contain letters, numbers, and underscores'
            }
          ]}
          extra="3-20 characters. Letters, numbers, and underscores only."
        >
          <Input
            id="username"
            prefix={<UserOutlined aria-hidden="true" />}
            placeholder="Enter your username"
            aria-label="Username"
            aria-required="true"
            aria-describedby="username-help"
            autoComplete="username"
          />
        </Form.Item>
        <div id="username-help" className="sr-only">
          Enter a username between 3 and 20 characters using only letters, numbers, and underscores
        </div>

        {/* Email Field */}
        <Form.Item
          label={<label htmlFor="email">Email Address</label>}
          name="email"
          rules={[
            { required: true, message: 'Please enter your email address' },
            { type: 'email', message: 'Please enter a valid email address' }
          ]}
          extra="We'll never share your email with anyone else."
        >
          <Input
            id="email"
            prefix={<MailOutlined aria-hidden="true" />}
            type="email"
            placeholder="you@example.com"
            aria-label="Email address"
            aria-required="true"
            autoComplete="email"
          />
        </Form.Item>

        {/* Password Field */}
        <Form.Item
          label={<label htmlFor="password">Password</label>}
          name="password"
          rules={[{ validator: validatePassword }]}
          extra="At least 8 characters with uppercase, lowercase, and numbers."
        >
          <Input.Password
            id="password"
            prefix={<LockOutlined aria-hidden="true" />}
            placeholder="Enter your password"
            aria-label="Password"
            aria-required="true"
            aria-describedby="password-requirements"
            autoComplete="new-password"
          />
        </Form.Item>
        <div id="password-requirements" className="sr-only">
          Password must be at least 8 characters and contain uppercase letters, lowercase letters, and numbers
        </div>

        {/* Confirm Password Field */}
        <Form.Item
          label={<label htmlFor="confirmPassword">Confirm Password</label>}
          name="confirmPassword"
          dependencies={['password']}
          rules={[{ validator: validateConfirmPassword }]}
        >
          <Input.Password
            id="confirmPassword"
            prefix={<LockOutlined aria-hidden="true" />}
            placeholder="Re-enter your password"
            aria-label="Confirm password"
            aria-required="true"
            aria-describedby="confirm-password-help"
            autoComplete="new-password"
          />
        </Form.Item>
        <div id="confirm-password-help" className="sr-only">
          Re-enter your password to confirm it matches
        </div>

        {/* Contact Method Radio Group */}
        <Form.Item
          label="Preferred Contact Method"
          name="contactMethod"
          rules={[{ required: true, message: 'Please select a contact method' }]}
        >
          <Radio.Group aria-label="Preferred contact method" aria-required="true">
            <Space direction="vertical">
              <Radio value="email" aria-label="Contact by email">
                Email
              </Radio>
              <Radio value="phone" aria-label="Contact by phone">
                Phone
              </Radio>
              <Radio value="none" aria-label="Do not contact">
                Do not contact me
              </Radio>
            </Space>
          </Radio.Group>
        </Form.Item>

        {/* Terms Checkbox */}
        <Form.Item
          name="agreeToTerms"
          valuePropName="checked"
          rules={[
            {
              validator: (_, value) =>
                value
                  ? Promise.resolve()
                  : Promise.reject(new Error('You must agree to the terms and conditions'))
            }
          ]}
        >
          <Checkbox aria-required="true">
            I agree to the{' '}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Terms and conditions (opens in new window)"
            >
              terms and conditions
            </a>
          </Checkbox>
        </Form.Item>

        {/* Submit Button */}
        <Form.Item>
          <Space>
            <Button
              ref={submitButtonRef}
              type="primary"
              htmlType="submit"
              loading={loading}
              aria-label={loading ? 'Submitting form...' : 'Submit registration form'}
            >
              {loading ? 'Submitting...' : 'Register'}
            </Button>

            <Button
              onClick={() => {
                form.resetFields();
                setErrors([]);
                message.info('Form has been reset');
              }}
              disabled={loading}
              aria-label="Reset form to initial values"
            >
              Reset
            </Button>
          </Space>
        </Form.Item>
      </Form>

      {/* Screen reader only instructions */}
      <div className="sr-only" aria-live="polite">
        <p>Form submission status will be announced here.</p>
      </div>
    </Card>
  );
};

AccessibleForm.displayName = 'AccessibleForm';

export default AccessibleForm;
