/**
 * DataCollectionPanel
 *
 * GitHub Issue #19: Configurable Side-by-Side Execution Interface
 *
 * Enhanced data collection panel with auto-focus, validation, and integration
 * with step execution and production entry.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Form,
  Input,
  InputNumber,
  Select,
  Checkbox,
  DatePicker,
  TimePicker,
  Button,
  Card,
  Progress,
  Alert,
  Space,
  Typography,
  Divider,
} from 'antd';
import {
  SaveOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useExecutionLayoutStore, useExecutionSession } from '@/store/executionLayoutStore';
import styles from './DataCollectionPanel.module.css';

const { Title, Text } = Typography;
const { Option } = Select;

interface DataCollectionPanelProps {
  step: any; // StepData from store
  session: any; // ExecutionSession from store
  onExecutionComplete?: () => void;
  isCollapsed?: boolean;
}

export const DataCollectionPanel: React.FC<DataCollectionPanelProps> = ({
  step,
  session,
  onExecutionComplete,
  isCollapsed = false,
}) => {
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const firstFieldRef = useRef<any>(null);

  const { currentStepNumber, totalSteps } = useExecutionSession();
  const {
    markStepComplete,
    updateStepData,
    goToNextStep,
    checkAutoAdvance,
  } = useExecutionLayoutStore();

  // Auto-focus first field when step changes
  useEffect(() => {
    if (!isCollapsed && firstFieldRef.current) {
      setTimeout(() => {
        firstFieldRef.current.focus();
      }, 100);
    }
  }, [currentStepNumber, isCollapsed]);

  // Load existing collected data into form
  useEffect(() => {
    if (step?.collectedData) {
      form.setFieldsValue(step.collectedData);
    } else {
      form.resetFields();
    }
  }, [step, form]);

  // Calculate completion progress
  const getCompletionProgress = () => {
    if (!step?.dataEntryFields) return 0;

    const values = form.getFieldsValue();
    const totalFields = step.dataEntryFields.length;
    const completedFields = step.dataEntryFields.filter((field: any) => {
      const value = values[field.name];
      return value !== undefined && value !== null && value !== '';
    }).length;

    return totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;
  };

  // Validate required fields
  const validateRequiredFields = () => {
    if (!step?.dataEntryFields) return [];

    const values = form.getFieldsValue();
    const errors: string[] = [];

    step.dataEntryFields.forEach((field: any) => {
      if (field.required) {
        const value = values[field.name];
        if (value === undefined || value === null || value === '') {
          errors.push(`${field.label} is required`);
        }
      }
    });

    return errors;
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setValidationErrors([]);

      // Validate form
      const values = await form.validateFields();
      const errors = validateRequiredFields();

      if (errors.length > 0) {
        setValidationErrors(errors);
        return;
      }

      // Save collected data
      updateStepData(step.stepNumber, {
        collectedData: values,
      });

      // Mark step as complete
      markStepComplete(step.stepNumber, values);

      // Check for auto-advance
      checkAutoAdvance();

      // If this is the last step, trigger completion
      if (currentStepNumber === totalSteps) {
        onExecutionComplete?.();
      }

    } catch (error) {
      console.error('Form validation failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle auto-save
  const handleFieldChange = () => {
    // Auto-save data as user types (debounced)
    const values = form.getFieldsValue();
    updateStepData(step.stepNumber, {
      collectedData: values,
    });
  };

  // Render form field based on type
  const renderField = (field: any, index: number) => {
    const isFirstField = index === 0;

    const baseProps = {
      ref: isFirstField ? firstFieldRef : undefined,
      placeholder: field.label,
      onChange: handleFieldChange,
    };

    switch (field.type) {
      case 'text':
        return <Input {...baseProps} />;

      case 'number':
        return (
          <InputNumber
            {...baseProps}
            style={{ width: '100%' }}
            min={field.validation?.min}
            max={field.validation?.max}
          />
        );

      case 'boolean':
        return <Checkbox onChange={handleFieldChange}>{field.label}</Checkbox>;

      case 'select':
        return (
          <Select {...baseProps} allowClear>
            {field.validation?.options?.map((option: string) => (
              <Option key={option} value={option}>
                {option}
              </Option>
            ))}
          </Select>
        );

      case 'multiselect':
        return (
          <Select {...baseProps} mode="multiple" allowClear>
            {field.validation?.options?.map((option: string) => (
              <Option key={option} value={option}>
                {option}
              </Option>
            ))}
          </Select>
        );

      case 'date':
        return <DatePicker {...baseProps} style={{ width: '100%' }} />;

      case 'time':
        return <TimePicker {...baseProps} style={{ width: '100%' }} />;

      default:
        return <Input {...baseProps} />;
    }
  };

  if (isCollapsed) {
    return (
      <div className={styles.collapsedView}>
        <div className={styles.collapsedContent}>
          <div className={styles.progressCircle}>
            {getCompletionProgress()}%
          </div>
          <div className={styles.collapsedTitle}>Data Collection</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header with progress */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <Title level={4} style={{ margin: 0 }}>
            Data Collection - Step {currentStepNumber}
          </Title>
          <Progress
            percent={getCompletionProgress()}
            size="small"
            status={getCompletionProgress() === 100 ? 'success' : 'active'}
          />
        </div>

        {step?.requiresSignature && (
          <Alert
            message="Signature Required"
            description="This step requires supervisor signature after data collection."
            type="info"
            size="small"
            showIcon
            style={{ marginTop: 8 }}
          />
        )}
      </div>

      {/* Form content */}
      <div className={styles.formContent}>
        {step?.dataEntryFields && step.dataEntryFields.length > 0 ? (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            autoComplete="off"
          >
            {step.dataEntryFields.map((field: any, index: number) => (
              <Form.Item
                key={field.id}
                name={field.name}
                label={
                  <Space>
                    <span>{field.label}</span>
                    {field.required && <Text type="danger">*</Text>}
                  </Space>
                }
                rules={[
                  {
                    required: field.required,
                    message: `${field.label} is required`,
                  },
                  ...(field.validation?.pattern
                    ? [
                        {
                          pattern: new RegExp(field.validation.pattern),
                          message: `Invalid format for ${field.label}`,
                        },
                      ]
                    : []),
                ]}
              >
                {renderField(field, index)}
              </Form.Item>
            ))}

            {/* Validation errors */}
            {validationErrors.length > 0 && (
              <Alert
                message="Validation Errors"
                description={
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                }
                type="error"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}
          </Form>
        ) : (
          <div className={styles.noData}>
            <Text type="secondary">No data collection required for this step.</Text>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <Divider style={{ margin: '12px 0' }} />

        <Space size="middle">
          <Button
            type="default"
            icon={<SaveOutlined />}
            onClick={() => handleFieldChange()}
          >
            Save Draft
          </Button>

          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={step?.dataEntryFields?.length === 0}
          >
            Complete Step
          </Button>
        </Space>

        {/* Step completion info */}
        {step?.isCompleted && (
          <div className={styles.completionInfo}>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <span>Data collected and step completed</span>
          </div>
        )}

        {/* Next step hint */}
        {currentStepNumber < totalSteps && step?.isCompleted && (
          <Button
            type="link"
            icon={<ClockCircleOutlined />}
            onClick={goToNextStep}
            style={{ padding: 0 }}
          >
            Proceed to next step
          </Button>
        )}
      </div>
    </div>
  );
};

export default DataCollectionPanel;