/**
 * Form Builder Component (Issue #45 - Phase 3)
 * Main admin UI for creating and managing data collection forms
 */

import React, { useMemo } from 'react';
import {
  Layout,
  Row,
  Col,
  Card,
  Button,
  Space,
  Divider,
  Tabs,
  Input,
  Checkbox,
  Select,
  message,
  Modal,
  Drawer,
  Tree,
  Empty,
  Spin,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  SaveOutlined,
  DeleteOutlined,
  CopyOutlined,
  UndoOutlined,
  DownloadOutlined,
  UploadOutlined,
  EyeOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { DataNodeNormal } from 'antd/es/tree';
import { useFormBuilder } from '@/hooks/useFormBuilder';
import FormBuilderService, {
  DataCollectionFieldType,
  FormFieldDefinition,
} from '@/services/FormBuilderService';
import FieldEditor from './FieldEditor';
import { FormPreview } from './FormPreview';

const { Content, Sider } = Layout;

interface FormBuilderProps {
  formId?: string;
  routingOperationId: string;
  onFormSaved?: (form: any) => void;
  onCancel?: () => void;
}

const FIELD_TYPES: DataCollectionFieldType[] = [
  'NUMBER',
  'TEXT',
  'TEXTAREA',
  'BOOLEAN',
  'SELECT',
  'MULTISELECT',
  'DATE',
  'TIME',
  'DATETIME',
  'FILE',
  'SIGNATURE',
];

/**
 * Form Builder Component
 * Main UI for creating data collection forms
 */
export const FormBuilder: React.FC<FormBuilderProps> = ({
  formId,
  routingOperationId,
  onFormSaved,
  onCancel,
}) => {
  const [previewVisible, setPreviewVisible] = React.useState(false);
  const [importModalVisible, setImportModalVisible] = React.useState(false);
  const [importJson, setImportJson] = React.useState('');
  const [cloneModalVisible, setCloneModalVisible] = React.useState(false);
  const [cloneName, setCloneName] = React.useState('');

  const {
    form,
    currentFieldId,
    isDirty,
    isSaving,
    isLoading,
    errors,
    setFormName,
    setFormDescription,
    setRequiredForCompletion,
    setDisplayOrder,
    setActive,
    addField,
    removeField,
    selectField,
    deselectField,
    updateField,
    reorderFields,
    duplicateField,
    validateForm,
    saveForm,
    resetForm,
    cloneForm: cloneFormFunc,
    exportForm,
    importForm,
  } = useFormBuilder({
    formId,
    routingOperationId,
    onFormSaved,
  });

  const currentField = form.fields.find((f) => f.id === currentFieldId);

  // Build field tree for left sidebar
  const fieldTreeData: DataNodeNormal[] = useMemo(
    () =>
      form.fields.map((field, idx) => ({
        title: field.displayLabel || field.fieldName,
        key: field.id,
        icon: () => <span>{FormBuilderService.getFieldTypeIcon(field.dataType)}</span>,
        extra: (
          <Space size="small" onClick={(e) => e.stopPropagation()}>
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => duplicateField(field.id)}
            />
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => removeField(field.id)}
            />
          </Space>
        ),
      })),
    [form.fields, duplicateField, removeField]
  );

  // Handle field selection
  const handleFieldSelect = (keys: React.Key[]) => {
    if (keys.length > 0) {
      selectField(keys[0] as string);
    }
  };

  // Handle save
  const handleSave = async () => {
    try {
      const newErrors = validateForm();
      if (Object.keys(newErrors).length > 0) {
        message.error('Please fix form validation errors before saving');
        return;
      }
      await saveForm();
      message.success('Form saved successfully');
      onFormSaved?.(form);
    } catch (error) {
      const err = error instanceof Error ? error.message : 'Failed to save form';
      message.error(err);
    }
  };

  // Handle clone
  const handleClone = async () => {
    if (!cloneName.trim()) {
      message.error('Please enter a form name');
      return;
    }
    try {
      await cloneFormFunc(cloneName);
      message.success('Form cloned successfully');
      setCloneModalVisible(false);
      setCloneName('');
    } catch (error) {
      const err = error instanceof Error ? error.message : 'Failed to clone form';
      message.error(err);
    }
  };

  // Handle import
  const handleImport = () => {
    try {
      const success = importForm(importJson);
      if (success) {
        message.success('Form imported successfully');
        setImportModalVisible(false);
        setImportJson('');
      } else {
        message.error('Invalid form JSON');
      }
    } catch (error) {
      message.error('Failed to import form');
    }
  };

  // Handle export
  const handleExport = () => {
    const json = exportForm();
    const element = document.createElement('a');
    element.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(json)}`);
    element.setAttribute('download', `${form.formName}_${new Date().getTime()}.json`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    message.success('Form exported');
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '600px' }}>
        <Spin size="large" tip="Loading form..." />
      </div>
    );
  }

  const complexityScore = FormBuilderService.calculateComplexityScore(form);

  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#fff', padding: '16px 24px', borderBottom: '1px solid #f0f0f0' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <h2 style={{ margin: 0 }}>Form Builder</h2>
            {isDirty && <span style={{ color: '#faad14', marginLeft: '12px' }}>● Unsaved changes</span>}
          </Col>
          <Col>
            <Space>
              <Button
                icon={<EyeOutlined />}
                onClick={() => setPreviewVisible(true)}
              >
                Preview
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExport}
              >
                Export
              </Button>
              <Button
                icon={<UploadOutlined />}
                onClick={() => setImportModalVisible(true)}
              >
                Import
              </Button>
              <Button
                icon={<CopyOutlined />}
                onClick={() => setCloneModalVisible(true)}
              >
                Clone
              </Button>
              <Button
                icon={<UndoOutlined />}
                onClick={resetForm}
              >
                Reset
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={isSaving}
                onClick={handleSave}
              >
                Save Form
              </Button>
              {onCancel && <Button onClick={onCancel}>Close</Button>}
            </Space>
          </Col>
        </Row>
      </div>

      <Layout>
        {/* Left Sidebar - Field List */}
        <Sider width={280} style={{ backgroundColor: '#fff' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ marginBottom: '16px' }}>
              <h4>Fields ({form.fields.length})</h4>
              <Select
                style={{ width: '100%' }}
                placeholder="Add new field"
                options={FIELD_TYPES.map((type) => ({
                  label: `${FormBuilderService.getFieldTypeIcon(type)} ${type}`,
                  value: type,
                }))}
                onChange={(type) => {
                  addField(type);
                  message.success(`${type} field added`);
                }}
              />
            </div>

            {form.fields.length > 0 ? (
              <Tree
                treeData={fieldTreeData}
                selectedKeys={currentFieldId ? [currentFieldId] : []}
                onSelect={handleFieldSelect}
                showIcon
                blockNode
              />
            ) : (
              <Empty description="No fields yet" style={{ marginTop: '24px' }} />
            )}
          </div>
        </Sider>

        {/* Main Content */}
        <Content style={{ padding: '24px' }}>
          <Tabs
            defaultActiveKey="properties"
            items={[
              {
                key: 'properties',
                label: 'Form Properties',
                children: (
                  <Card title="Form Configuration">
                    <Space direction="vertical" style={{ width: '100%' }} size="large">
                      <div>
                        <label>Form Name*</label>
                        <Input
                          value={form.formName}
                          onChange={(e) => setFormName(e.target.value)}
                          placeholder="Enter form name"
                          status={errors.formName ? 'error' : ''}
                          title={errors.formName}
                        />
                        {errors.formName && (
                          <span style={{ color: '#ff4d4f', fontSize: '12px' }}>{errors.formName}</span>
                        )}
                      </div>

                      <div>
                        <label>Description</label>
                        <Input.TextArea
                          value={form.description || ''}
                          onChange={(e) => setFormDescription(e.target.value)}
                          placeholder="Enter form description"
                          rows={3}
                        />
                      </div>

                      <Divider />

                      <Checkbox
                        checked={form.requiredForCompletion}
                        onChange={(e) => setRequiredForCompletion(e.target.checked)}
                      >
                        Required for operation completion
                      </Checkbox>

                      <Checkbox
                        checked={form.isActive}
                        onChange={(e) => setActive(e.target.checked)}
                      >
                        Active form
                      </Checkbox>

                      <div>
                        <label>Display Order</label>
                        <Input
                          type="number"
                          value={form.displayOrder}
                          onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                        />
                      </div>

                      <Alert
                        message={`Complexity Score: ${complexityScore}/100`}
                        type={complexityScore > 70 ? 'warning' : 'info'}
                        showIcon
                      />
                    </Space>
                  </Card>
                ),
              },
              {
                key: 'fields',
                label: 'Field Configuration',
                children: currentField ? (
                  <FieldEditor
                    field={currentField}
                    allFields={form.fields}
                    onUpdate={(updates) => updateField(currentFieldId!, updates)}
                  />
                ) : (
                  <Empty description="Select a field to edit its properties" />
                ),
              },
              {
                key: 'errors',
                label: 'Validation',
                children: (
                  <Card title="Form Validation">
                    {Object.keys(errors).length === 0 ? (
                      <Alert message="No validation errors" type="success" showIcon />
                    ) : (
                      <Space direction="vertical" style={{ width: '100%' }}>
                        {Object.entries(errors).map(([key, error]) => (
                          <Alert key={key} message={error} type="error" showIcon />
                        ))}
                      </Space>
                    )}
                  </Card>
                ),
              },
            ]}
          />
        </Content>
      </Layout>

      {/* Preview Modal */}
      <Drawer
        title="Form Preview"
        placement="right"
        onClose={() => setPreviewVisible(false)}
        open={previewVisible}
        width={600}
      >
        <FormPreview form={form} />
      </Drawer>

      {/* Clone Modal */}
      <Modal
        title="Clone Form"
        open={cloneModalVisible}
        onCancel={() => setCloneModalVisible(false)}
        onOk={handleClone}
      >
        <Input
          placeholder="Enter new form name"
          value={cloneName}
          onChange={(e) => setCloneName(e.target.value)}
          onPressEnter={handleClone}
        />
      </Modal>

      {/* Import Modal */}
      <Modal
        title="Import Form"
        open={importModalVisible}
        onCancel={() => setImportModalVisible(false)}
        onOk={handleImport}
      >
        <Input.TextArea
          placeholder="Paste JSON form data"
          value={importJson}
          onChange={(e) => setImportJson(e.target.value)}
          rows={10}
        />
      </Modal>
    </Layout>
  );
};

export default FormBuilder;
