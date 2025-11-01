/**
 * Field Editor Component (Issue #45 - Phase 3)
 * Component for editing individual field configuration
 */

import React from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Checkbox,
  Select,
  Button,
  Space,
  Divider,
  Table,
  Modal,
  Row,
  Col,
  Tag,
} from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import FormBuilderService, {
  FormFieldDefinition,
  FormFieldOption,
  ValidationRule,
} from '@/services/FormBuilderService';

interface FieldEditorProps {
  field: FormFieldDefinition;
  allFields: FormFieldDefinition[];
  onUpdate: (updates: Partial<FormFieldDefinition>) => void;
}

/**
 * Field Editor Component
 * Allows editing all aspects of a field's configuration
 */
export const FieldEditor: React.FC<FieldEditorProps> = ({ field, allFields, onUpdate }) => {
  const [form] = Form.useForm();
  const [optionsVisible, setOptionsVisible] = React.useState(false);
  const [newOption, setNewOption] = React.useState({ label: '', value: '' });

  const isSelectType = field.dataType === 'SELECT' || field.dataType === 'MULTISELECT';

  // Handle basic field updates
  const handleFieldChange = (key: keyof FormFieldDefinition, value: any) => {
    onUpdate({ [key]: value });
  };

  // Handle validation rules update
  const handleValidationUpdate = (key: keyof ValidationRule, value: any) => {
    onUpdate({
      validationRules: {
        ...field.validationRules,
        [key]: value,
      },
    });
  };

  // Handle add option
  const handleAddOption = () => {
    if (!newOption.label.trim() || !newOption.value.trim()) {
      return;
    }

    const updatedOptions = [
      ...(field.options || []),
      newOption,
    ];

    onUpdate({ options: updatedOptions });
    setNewOption({ label: '', value: '' });
  };

  // Handle remove option
  const handleRemoveOption = (index: number) => {
    const updatedOptions = field.options?.filter((_, i) => i !== index) || [];
    onUpdate({ options: updatedOptions });
  };

  // Field type icon and description
  const typeIcon = FormBuilderService.getFieldTypeIcon(field.dataType);
  const typeDescription = FormBuilderService.getFieldTypeDescription(field.dataType);

  return (
    <div>
      {/* Field Header */}
      <Card
        title={
          <Space>
            <span>{typeIcon}</span>
            <span>{field.displayLabel}</span>
            <Tag color="blue">{field.dataType}</Tag>
          </Space>
        }
        style={{ marginBottom: '16px' }}
      >
        <p>{typeDescription}</p>
      </Card>

      {/* Basic Configuration */}
      <Card title="Basic Configuration" style={{ marginBottom: '16px' }}>
        <Form layout="vertical">
          <Form.Item label="Field Name*" required>
            <Input
              value={field.fieldName}
              onChange={(e) => handleFieldChange('fieldName', e.target.value)}
              placeholder="e.g., measurement_1"
            />
          </Form.Item>

          <Form.Item label="Display Label*" required>
            <Input
              value={field.displayLabel}
              onChange={(e) => handleFieldChange('displayLabel', e.target.value)}
              placeholder="e.g., Measurement (mm)"
            />
          </Form.Item>

          <Form.Item label="Help Text">
            <Input.TextArea
              value={field.helpText || ''}
              onChange={(e) => handleFieldChange('helpText', e.target.value)}
              placeholder="Help text to guide users"
              rows={2}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Placeholder">
                <Input
                  value={field.placeholder || ''}
                  onChange={(e) => handleFieldChange('placeholder', e.target.value)}
                  placeholder="Placeholder text"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Unit of Measure">
                <Input
                  value={field.unitOfMeasure || ''}
                  onChange={(e) => handleFieldChange('unitOfMeasure', e.target.value)}
                  placeholder="e.g., mm, kg, %"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Default Value">
            <Input
              value={field.defaultValue || ''}
              onChange={(e) => handleFieldChange('defaultValue', e.target.value)}
              placeholder="Default value for new submissions"
            />
          </Form.Item>

          <Divider />

          <Checkbox
            checked={field.required}
            onChange={(e) => handleFieldChange('required', e.target.checked)}
          >
            Required field
          </Checkbox>
        </Form>
      </Card>

      {/* Validation Rules */}
      <Card title="Validation Rules" style={{ marginBottom: '16px' }}>
        <Form layout="vertical">
          {field.dataType === 'NUMBER' && (
            <>
              <Form.Item label="Minimum Value">
                <InputNumber
                  value={field.validationRules?.min}
                  onChange={(value) => handleValidationUpdate('min', value)}
                  placeholder="Minimum allowed value"
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item label="Maximum Value">
                <InputNumber
                  value={field.validationRules?.max}
                  onChange={(value) => handleValidationUpdate('max', value)}
                  placeholder="Maximum allowed value"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </>
          )}

          {(field.dataType === 'TEXT' || field.dataType === 'TEXTAREA') && (
            <>
              <Form.Item label="Minimum Length">
                <InputNumber
                  value={field.validationRules?.minLength}
                  onChange={(value) => handleValidationUpdate('minLength', value)}
                  placeholder="Minimum characters"
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item label="Maximum Length">
                <InputNumber
                  value={field.validationRules?.maxLength}
                  onChange={(value) => handleValidationUpdate('maxLength', value)}
                  placeholder="Maximum characters"
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item label="Pattern (Regex)">
                <Input
                  value={field.validationRules?.pattern || ''}
                  onChange={(e) => handleValidationUpdate('pattern', e.target.value)}
                  placeholder="e.g., ^[A-Z0-9]+$"
                />
              </Form.Item>
            </>
          )}

          {isSelectType && field.validationRules?.allowedValues && (
            <Form.Item label="Allowed Values">
              <Space wrap>
                {field.validationRules.allowedValues.map((value) => (
                  <Tag key={value}>{value}</Tag>
                ))}
              </Space>
            </Form.Item>
          )}
        </Form>
      </Card>

      {/* Options (for SELECT/MULTISELECT) */}
      {isSelectType && (
        <Card title="Options" style={{ marginBottom: '16px' }}>
          {field.options && field.options.length > 0 ? (
            <Table
              dataSource={field.options.map((opt, idx) => ({
                ...opt,
                key: idx,
              }))}
              columns={[
                {
                  title: 'Label',
                  dataIndex: 'label',
                  key: 'label',
                },
                {
                  title: 'Value',
                  dataIndex: 'value',
                  key: 'value',
                },
                {
                  title: 'Action',
                  key: 'action',
                  render: (_, record, index) => (
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemoveOption(index)}
                    />
                  ),
                },
              ]}
              pagination={false}
              size="small"
              style={{ marginBottom: '16px' }}
            />
          ) : (
            <p style={{ color: '#999' }}>No options configured</p>
          )}

          <Divider />

          <Space direction="vertical" style={{ width: '100%' }}>
            <Form layout="inline">
              <Form.Item label="Label">
                <Input
                  value={newOption.label}
                  onChange={(e) => setNewOption({ ...newOption, label: e.target.value })}
                  placeholder="Option label"
                />
              </Form.Item>
              <Form.Item label="Value">
                <Input
                  value={newOption.value}
                  onChange={(e) => setNewOption({ ...newOption, value: e.target.value })}
                  placeholder="Option value"
                />
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAddOption}
                >
                  Add Option
                </Button>
              </Form.Item>
            </Form>
          </Space>
        </Card>
      )}

      {/* Conditional Display */}
      <Card title="Conditional Display">
        <Form layout="vertical">
          <Form.Item label="Show this field only when">
            <Select
              placeholder="Select a field"
              allowClear
              value={field.conditionalOn?.fieldId}
              onChange={(value) => {
                if (value) {
                  onUpdate({
                    conditionalOn: {
                      fieldId: value,
                      condition: field.conditionalOn?.condition || 'equals',
                    },
                  });
                } else {
                  onUpdate({ conditionalOn: undefined });
                }
              }}
              options={allFields
                .filter((f) => f.id !== field.id)
                .map((f) => ({
                  label: f.displayLabel,
                  value: f.id,
                }))}
            />
          </Form.Item>

          {field.conditionalOn && (
            <Form.Item label="Condition">
              <Input
                value={field.conditionalOn.condition}
                onChange={(e) => {
                  onUpdate({
                    conditionalOn: {
                      ...field.conditionalOn,
                      condition: e.target.value,
                    },
                  });
                }}
                placeholder='e.g., equals "yes" or > 50'
              />
            </Form.Item>
          )}

          <p style={{ fontSize: '12px', color: '#999' }}>
            Examples: equals "value", != "value", {'>'} 50, {'<'} 100
          </p>
        </Form>
      </Card>
    </div>
  );
};

export default FieldEditor;
