/**
 * FormComponentTemplate - Form component scaffold
 *
 * Use this template to create form components with validation.
 */

import React, { useState, useCallback } from 'react';
import {
  Form,
  Input,
  Button,
  Card,
  Space,
  Alert,
  message
} from 'antd';
import { SaveOutlined, CloseOutlined } from '@ant-design/icons';
import { useTheme } from '@/hooks/useTheme';
import styles from './FormComponentTemplate.module.css';

/**
 * TODO: Define your form data interface
 */
export interface FormData {
  // TODO: Add your form fields
  name: string;
  description?: string;
  // Add more fields as needed
}

/**
 * TODO: Define component props
 */
export interface FormComponentTemplateProps {
  /** Initial form values */
  initialValues?: Partial<FormData>;

  /** Callback when form is submitted */
  onSubmit: (data: FormData) => Promise<void>;

  /** Callback when form is cancelled */
  onCancel?: () => void;

  /** Read-only mode */
  readOnly?: boolean;
}

/**
 * FormComponentTemplate
 *
 * TODO: Add description
 */
export const FormComponentTemplate: React.FC<FormComponentTemplateProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  readOnly = false,
}) => {
  const { theme } = useTheme();
  const [form] = Form.useForm<FormData>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async (values: FormData) => {
    try {
      setLoading(true);
      setError(null);

      await onSubmit(values);

      message.success('Form submitted successfully!');
      form.resetFields();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Submission failed';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [onSubmit, form]);

  /**
   * Handle cancel
   */
  const handleCancel = useCallback(() => {
    form.resetFields();
    setError(null);

    if (onCancel) {
      onCancel();
    }
  }, [form, onCancel]);

  return (
    <Card className={styles.container} title="Form Title" /* TODO: Change title */>
      {error && (
        <Alert
          type="error"
          message="Error"
          description={error}
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: theme.tokens.marginMD }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onFinish={handleSubmit}
        disabled={readOnly || loading}
      >
        {/* TODO: Add your form fields here */}

        <Form.Item
          label="Name"
          name="name"
          rules={[{ required: true, message: 'Please enter a name' }]}
        >
          <Input placeholder="Enter name" />
        </Form.Item>

        <Form.Item
          label="Description"
          name="description"
        >
          <Input.TextArea rows={4} placeholder="Enter description" />
        </Form.Item>

        {/* TODO: Add more fields as needed */}

        {/* Form Actions */}
        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={loading}
              disabled={readOnly}
            >
              Submit
            </Button>

            {onCancel && (
              <Button
                icon={<CloseOutlined />}
                onClick={handleCancel}
                disabled={loading}
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

FormComponentTemplate.displayName = 'FormComponentTemplate';

export default FormComponentTemplate;
