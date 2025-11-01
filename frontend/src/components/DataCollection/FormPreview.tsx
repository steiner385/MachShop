/**
 * Form Preview Component (Issue #45 - Phase 3)
 * Component for displaying a live preview of the form being built
 */

import React, { useState } from 'react';
import {
  Form,
  Input,
  InputNumber,
  Checkbox,
  Select,
  Button,
  Space,
  DatePicker,
  TimePicker,
  Upload,
  Empty,
  Divider,
  Alert,
  Row,
  Col,
  Card,
  Tag,
} from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import FormBuilderService, {
  FormDefinition,
  FormFieldDefinition,
} from '@/services/FormBuilderService';
import dayjs from 'dayjs';

interface FormPreviewProps {
  form: FormDefinition;
}

/**
 * Form Preview Component
 * Renders a live preview of the form being edited
 */
export const FormPreview: React.FC<FormPreviewProps> = ({ form }) => {
  const [previewForm] = Form.useForm();
  const [previewData, setPreviewData] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  // Handle form field change
  const handleFieldChange = (fieldId: string, value: any) => {
    const field = form.fields.find((f) => f.id === fieldId);
    if (!field) return;

    setPreviewData((prev) => {
      const updated = { ...prev, [field.fieldName]: value };

      // Clear validation error for this field when user modifies it
      if (validationErrors[fieldId]) {
        const newErrors = { ...validationErrors };
        delete newErrors[fieldId];
        setValidationErrors(newErrors);
      }

      return updated;
    });
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Validate the form data
    const errors: Record<string, string[]> = {};
    let hasErrors = false;

    for (const field of form.fields) {
      const value = previewData[field.fieldName];
      const fieldErrors: string[] = [];

      // Check required
      if (field.required && (value === undefined || value === null || value === '')) {
        fieldErrors.push('This field is required');
        hasErrors = true;
      }

      // Check validation rules
      if (value !== undefined && value !== null && value !== '' && field.validationRules) {
        const rules = field.validationRules;

        // Number validation
        if (field.dataType === 'NUMBER') {
          const numValue = typeof value === 'number' ? value : parseFloat(value);
          if (!isNaN(numValue)) {
            if (rules.min !== undefined && numValue < rules.min) {
              fieldErrors.push(`Value must be at least ${rules.min}`);
              hasErrors = true;
            }
            if (rules.max !== undefined && numValue > rules.max) {
              fieldErrors.push(`Value must be at most ${rules.max}`);
              hasErrors = true;
            }
          }
        }

        // Text validation
        if (field.dataType === 'TEXT' || field.dataType === 'TEXTAREA') {
          const stringValue = String(value);
          if (rules.minLength !== undefined && stringValue.length < rules.minLength) {
            fieldErrors.push(`Must be at least ${rules.minLength} characters`);
            hasErrors = true;
          }
          if (rules.maxLength !== undefined && stringValue.length > rules.maxLength) {
            fieldErrors.push(`Must be at most ${rules.maxLength} characters`);
            hasErrors = true;
          }
          if (rules.pattern) {
            try {
              const regex = new RegExp(rules.pattern);
              if (!regex.test(stringValue)) {
                fieldErrors.push(`Does not match required pattern: ${rules.pattern}`);
                hasErrors = true;
              }
            } catch (e) {
              fieldErrors.push('Invalid pattern in field rules');
            }
          }
        }

        // SELECT validation
        if ((field.dataType === 'SELECT' || field.dataType === 'MULTISELECT') && rules.allowedValues) {
          const values = Array.isArray(value) ? value : [value];
          const invalidValues = values.filter((v) => !rules.allowedValues?.includes(v));
          if (invalidValues.length > 0) {
            fieldErrors.push(`Invalid option selected`);
            hasErrors = true;
          }
        }
      }

      if (fieldErrors.length > 0) {
        errors[field.id] = fieldErrors;
      }
    }

    setValidationErrors(errors);

    if (!hasErrors) {
      // Show success message (in real app, would submit to backend)
      alert(`Form submitted successfully!\n\nData:\n${JSON.stringify(previewData, null, 2)}`);
    }
  };

  if (form.fields.length === 0) {
    return (
      <Empty
        description="No fields added yet"
        style={{ marginTop: '40px' }}
      />
    );
  }

  // Check for validation errors from form builder
  const formErrors = FormBuilderService.validateForm(form);
  const hasFormErrors = Object.keys(formErrors).length > 0;

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Form Header */}
      <Card style={{ marginBottom: '24px' }}>
        <h2>{form.formName}</h2>
        {form.description && <p style={{ color: '#666', marginTop: '8px' }}>{form.description}</p>}
        <div style={{ marginTop: '12px' }}>
          {form.requiredForCompletion && (
            <Tag color="red">Required for Completion</Tag>
          )}
          {!form.isActive && (
            <Tag color="orange">Inactive</Tag>
          )}
        </div>
      </Card>

      {/* Validation Warnings */}
      {hasFormErrors && (
        <Alert
          message="Form Configuration Warnings"
          description={
            <ul style={{ margin: '8px 0' }}>
              {Object.entries(formErrors).map(([key, error]) => (
                <li key={key} style={{ fontSize: '12px', marginBottom: '4px' }}>
                  {error}
                </li>
              ))}
            </ul>
          }
          type="warning"
          showIcon
          style={{ marginBottom: '24px' }}
        />
      )}

      {/* Form Preview */}
      <Form layout="vertical" form={previewForm}>
        {form.fields.map((field, idx) => {
          const fieldError = validationErrors[field.id];
          const isRequired = field.required;

          return (
            <div key={field.id} style={{ marginBottom: '24px' }}>
              <Form.Item
                label={
                  <div>
                    <span>
                      {FormBuilderService.getFieldTypeIcon(field.dataType)} {field.displayLabel}
                    </span>
                    {isRequired && <span style={{ color: 'red' }}> *</span>}
                    {field.unitOfMeasure && (
                      <span style={{ color: '#999', marginLeft: '8px', fontSize: '12px' }}>
                        ({field.unitOfMeasure})
                      </span>
                    )}
                  </div>
                }
                help={
                  <div>
                    {field.helpText && <p style={{ margin: '4px 0' }}>{field.helpText}</p>}
                    {fieldError && (
                      <div style={{ color: '#ff4d4f', marginTop: '4px' }}>
                        {fieldError.map((err, i) => (
                          <div key={i}>• {err}</div>
                        ))}
                      </div>
                    )}
                  </div>
                }
                validateStatus={fieldError ? 'error' : ''}
              >
                {field.dataType === 'NUMBER' && (
                  <InputNumber
                    placeholder={field.placeholder || 'Enter a number'}
                    value={previewData[field.fieldName]}
                    onChange={(value) => handleFieldChange(field.id, value)}
                    style={{ width: '100%' }}
                    min={field.validationRules?.min}
                    max={field.validationRules?.max}
                  />
                )}

                {field.dataType === 'TEXT' && (
                  <Input
                    placeholder={field.placeholder || 'Enter text'}
                    value={previewData[field.fieldName] || ''}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  />
                )}

                {field.dataType === 'TEXTAREA' && (
                  <Input.TextArea
                    placeholder={field.placeholder || 'Enter text'}
                    value={previewData[field.fieldName] || ''}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    rows={4}
                  />
                )}

                {field.dataType === 'BOOLEAN' && (
                  <Checkbox
                    checked={previewData[field.fieldName] || false}
                    onChange={(e) => handleFieldChange(field.id, e.target.checked)}
                  >
                    {field.placeholder || 'Check if applicable'}
                  </Checkbox>
                )}

                {field.dataType === 'SELECT' && (
                  <Select
                    placeholder={field.placeholder || 'Select an option'}
                    value={previewData[field.fieldName]}
                    onChange={(value) => handleFieldChange(field.id, value)}
                    options={field.options?.map((opt) => ({
                      label: opt.label,
                      value: opt.value,
                    }))}
                  />
                )}

                {field.dataType === 'MULTISELECT' && (
                  <Select
                    mode="multiple"
                    placeholder={field.placeholder || 'Select options'}
                    value={previewData[field.fieldName] || []}
                    onChange={(value) => handleFieldChange(field.id, value)}
                    options={field.options?.map((opt) => ({
                      label: opt.label,
                      value: opt.value,
                    }))}
                  />
                )}

                {field.dataType === 'DATE' && (
                  <DatePicker
                    style={{ width: '100%' }}
                    placeholder={field.placeholder || 'Select a date'}
                    value={previewData[field.fieldName] ? dayjs(previewData[field.fieldName]) : null}
                    onChange={(date) => handleFieldChange(field.id, date?.toDate())}
                  />
                )}

                {field.dataType === 'TIME' && (
                  <TimePicker
                    style={{ width: '100%' }}
                    placeholder={field.placeholder || 'Select a time'}
                    value={previewData[field.fieldName] ? dayjs(previewData[field.fieldName]) : null}
                    onChange={(time) => handleFieldChange(field.id, time?.toDate())}
                  />
                )}

                {field.dataType === 'DATETIME' && (
                  <DatePicker
                    showTime
                    style={{ width: '100%' }}
                    placeholder={field.placeholder || 'Select date and time'}
                    value={previewData[field.fieldName] ? dayjs(previewData[field.fieldName]) : null}
                    onChange={(date) => handleFieldChange(field.id, date?.toDate())}
                  />
                )}

                {field.dataType === 'FILE' && (
                  <Upload
                    maxCount={1}
                    beforeUpload={() => false} // Prevent actual upload in preview
                  >
                    <Button icon={<UploadOutlined />}>Choose File</Button>
                  </Upload>
                )}

                {field.dataType === 'SIGNATURE' && (
                  <div style={{
                    border: '1px dashed #d9d9d9',
                    borderRadius: '2px',
                    padding: '20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: '#fafafa',
                  }}>
                    ✍️ Signature capture would appear here
                  </div>
                )}
              </Form.Item>
            </div>
          );
        })}

        {/* Submit Button */}
        <Divider />
        <Row justify="end">
          <Col>
            <Space>
              <Button onClick={() => previewForm.resetFields()}>
                Clear
              </Button>
              <Button type="primary" onClick={handleSubmit}>
                Submit Preview
              </Button>
            </Space>
          </Col>
        </Row>
      </Form>
    </div>
  );
};

export default FormPreview;
