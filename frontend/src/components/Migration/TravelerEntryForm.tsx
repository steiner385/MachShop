/**
 * Traveler Entry Form Component
 * Issue #36: Paper-Based Traveler Digitization - Phase 5
 *
 * Manual entry form for creating/editing digitized travelers
 */

import React, { useState, useCallback } from 'react';
import {
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Table,
  Button,
  Card,
  Space,
  Row,
  Col,
  message,
  Divider,
  Modal,
  Tag,
  Spin,
  Empty,
  Tooltip,
  TimePicker
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  ClearOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { FormInstance } from 'antd';
import './TravelerForm.css';

interface DigitizedOperation {
  operationNumber: string;
  operationDescription?: string;
  workCenter?: string;
  quantity?: number;
  startTime?: string;
  endTime?: string;
  status?: string;
  notes?: string;
  laborHours?: number;
  tools?: string[];
  qualityNotes?: string;
}

interface TravelerFormData {
  workOrderNumber: string;
  partNumber: string;
  partDescription?: string;
  quantity: number;
  dueDate?: string;
  priority?: string;
  operations: DigitizedOperation[];
}

interface TravelerEntryFormProps {
  onSubmit: (data: TravelerFormData) => Promise<void>;
  initialData?: TravelerFormData;
  loading?: boolean;
  mode?: 'create' | 'edit';
}

/**
 * Operation Table Columns
 */
const getOperationColumns = (onDelete: (key: number) => void) => [
  {
    title: 'Operation #',
    dataIndex: 'operationNumber',
    key: 'operationNumber',
    width: 120,
    render: (text: string) => <span className="operation-number">{text}</span>
  },
  {
    title: 'Description',
    dataIndex: 'operationDescription',
    key: 'operationDescription',
    ellipsis: true
  },
  {
    title: 'Work Center',
    dataIndex: 'workCenter',
    key: 'workCenter',
    width: 120
  },
  {
    title: 'Qty',
    dataIndex: 'quantity',
    key: 'quantity',
    width: 80,
    align: 'center' as const
  },
  {
    title: 'Labor Hours',
    dataIndex: 'laborHours',
    key: 'laborHours',
    width: 100,
    align: 'center' as const,
    render: (hours: number) => hours ? `${hours}h` : '-'
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    render: (status: string) => {
      const colors: Record<string, string> = {
        'pending': 'orange',
        'in_progress': 'blue',
        'completed': 'green'
      };
      return <Tag color={colors[status] || 'default'}>{status || 'pending'}</Tag>;
    }
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 80,
    fixed: 'right' as const,
    render: (_: any, __: any, index: number) => (
      <Tooltip title="Delete operation">
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => onDelete(index)}
        />
      </Tooltip>
    )
  }
];

/**
 * Traveler Entry Form Component
 */
const TravelerEntryForm: React.FC<TravelerEntryFormProps> = ({
  onSubmit,
  initialData,
  loading = false,
  mode = 'create'
}) => {
  const [form] = Form.useForm<TravelerFormData>();
  const [operations, setOperations] = useState<DigitizedOperation[]>(initialData?.operations || []);
  const [operationModalVisible, setOperationModalVisible] = useState(false);
  const [currentOperation, setCurrentOperation] = useState<DigitizedOperation | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [operationForm] = Form.useForm<DigitizedOperation>();

  /**
   * Handle form submission
   */
  const handleFormSubmit = useCallback(
    async (values: TravelerFormData) => {
      try {
        setSubmitting(true);

        // Validate that we have at least one operation
        if (operations.length === 0) {
          message.error('Please add at least one operation');
          return;
        }

        const formData: TravelerFormData = {
          ...values,
          operations
        };

        await onSubmit(formData);
        message.success(mode === 'create' ? 'Traveler created successfully' : 'Traveler updated successfully');

        if (mode === 'create') {
          form.resetFields();
          setOperations([]);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'An error occurred';
        message.error(`Failed: ${errorMsg}`);
      } finally {
        setSubmitting(false);
      }
    },
    [operations, onSubmit, form, mode]
  );

  /**
   * Add new operation
   */
  const handleAddOperation = useCallback(
    async (operationData: DigitizedOperation) => {
      try {
        await operationForm.validateFields();

        if (currentOperation !== null) {
          // Update existing operation
          const updated = [...operations];
          updated[currentOperation] = operationData;
          setOperations(updated);
          message.success('Operation updated');
        } else {
          // Add new operation
          setOperations([...operations, operationData]);
          message.success('Operation added');
        }

        setOperationModalVisible(false);
        setCurrentOperation(null);
        operationForm.resetFields();
      } catch {
        message.error('Please fill in all required fields');
      }
    },
    [operations, currentOperation, operationForm]
  );

  /**
   * Edit operation
   */
  const handleEditOperation = useCallback((index: number) => {
    setCurrentOperation(index);
    operationForm.setFieldsValue(operations[index]);
    setOperationModalVisible(true);
  }, [operations, operationForm]);

  /**
   * Delete operation
   */
  const handleDeleteOperation = useCallback((index: number) => {
    Modal.confirm({
      title: 'Delete Operation',
      content: `Are you sure you want to delete operation ${operations[index]?.operationNumber}?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk() {
        setOperations(operations.filter((_, i) => i !== index));
        message.success('Operation deleted');
      }
    });
  }, [operations]);

  /**
   * Reset form
   */
  const handleReset = useCallback(() => {
    Modal.confirm({
      title: 'Reset Form',
      content: 'Are you sure you want to clear all entries?',
      okText: 'Clear',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk() {
        form.resetFields();
        setOperations([]);
        message.info('Form cleared');
      }
    });
  }, [form]);

  return (
    <Spin spinning={loading || submitting}>
      <Card className="traveler-entry-form-card">
        <Form
          form={form}
          layout="vertical"
          initialValues={initialData}
          onFinish={handleFormSubmit}
          autoComplete="off"
        >
          {/* Header */}
          <div className="form-header">
            <h2>{mode === 'create' ? 'New Traveler Entry' : 'Edit Traveler'}</h2>
            <p className="form-subtitle">
              Enter work order and part information, then add operations below
            </p>
          </div>

          <Divider />

          {/* Work Order Section */}
          <div className="form-section">
            <h3>Work Order Information</h3>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="workOrderNumber"
                  label="Work Order Number"
                  rules={[
                    { required: true, message: 'Work order number is required' },
                    { pattern: /^[A-Z0-9\-]+$/, message: 'Invalid format' }
                  ]}
                >
                  <Input
                    placeholder="e.g., WO001234"
                    maxLength={50}
                    disabled={mode === 'edit'}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="partNumber"
                  label="Part Number"
                  rules={[{ required: true, message: 'Part number is required' }]}
                >
                  <Input
                    placeholder="e.g., P001"
                    maxLength={50}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="partDescription"
                  label="Part Description"
                >
                  <Input
                    placeholder="Optional description of the part"
                    maxLength={200}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="quantity"
                  label="Quantity"
                  rules={[
                    { required: true, message: 'Quantity is required' },
                    { type: 'number', min: 1, message: 'Quantity must be at least 1' }
                  ]}
                >
                  <InputNumber min={1} max={99999} className="full-width" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="dueDate"
                  label="Due Date"
                >
                  <DatePicker className="full-width" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="priority"
                  label="Priority"
                >
                  <Select placeholder="Select priority">
                    <Select.Option value="low">Low</Select.Option>
                    <Select.Option value="medium">Medium</Select.Option>
                    <Select.Option value="high">High</Select.Option>
                    <Select.Option value="urgent">Urgent</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </div>

          <Divider />

          {/* Operations Section */}
          <div className="form-section">
            <div className="section-header">
              <h3>Operations</h3>
              <Tooltip title="Add manufacturing operations/steps for this work order">
                <InfoCircleOutlined />
              </Tooltip>
            </div>

            {operations.length > 0 ? (
              <Table
                columns={getOperationColumns(handleDeleteOperation)}
                dataSource={operations.map((op, index) => ({
                  ...op,
                  key: index
                }))}
                pagination={false}
                size="small"
                className="operations-table"
                scroll={{ x: 1200 }}
                onRow={(_, index) => ({
                  onClick: () => index !== undefined && handleEditOperation(index),
                  style: { cursor: 'pointer' }
                })}
              />
            ) : (
              <Empty
                description="No operations added"
                style={{ margin: '20px 0' }}
              />
            )}

            <Button
              type="dashed"
              block
              icon={<PlusOutlined />}
              onClick={() => {
                setCurrentOperation(null);
                operationForm.resetFields();
                setOperationModalVisible(true);
              }}
              style={{ marginTop: 16 }}
            >
              Add Operation
            </Button>
          </div>

          <Divider />

          {/* Action Buttons */}
          <Row justify="end" gutter={8}>
            <Col>
              <Button
                icon={<ClearOutlined />}
                onClick={handleReset}
                disabled={submitting}
              >
                Clear
              </Button>
            </Col>
            <Col>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                htmlType="submit"
                loading={submitting}
              >
                {mode === 'create' ? 'Create Traveler' : 'Update Traveler'}
              </Button>
            </Col>
          </Row>
        </Form>

        {/* Operation Modal */}
        <OperationModal
          visible={operationModalVisible}
          operation={currentOperation !== null ? operations[currentOperation] : null}
          form={operationForm}
          onSubmit={handleAddOperation}
          onCancel={() => {
            setOperationModalVisible(false);
            setCurrentOperation(null);
            operationForm.resetFields();
          }}
        />
      </Card>
    </Spin>
  );
};

/**
 * Operation Modal Component
 */
interface OperationModalProps {
  visible: boolean;
  operation: DigitizedOperation | null;
  form: FormInstance<DigitizedOperation>;
  onSubmit: (data: DigitizedOperation) => void;
  onCancel: () => void;
}

const OperationModal: React.FC<OperationModalProps> = ({
  visible,
  operation,
  form,
  onSubmit,
  onCancel
}) => {
  return (
    <Modal
      title={operation ? 'Edit Operation' : 'Add Operation'}
      open={visible}
      onCancel={onCancel}
      onOk={() => form.submit()}
      width={700}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
      >
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="operationNumber"
              label="Operation Number"
              rules={[
                { required: true, message: 'Operation number is required' },
                { pattern: /^OP\d{2}/, message: 'Format: OP01, OP02, etc.' }
              ]}
            >
              <Input placeholder="e.g., OP10" maxLength={20} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="workCenter"
              label="Work Center"
            >
              <Input placeholder="e.g., CNC-01" maxLength={50} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="operationDescription"
          label="Description"
        >
          <Input.TextArea
            placeholder="Operation description"
            rows={3}
            maxLength={500}
          />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Form.Item
              name="quantity"
              label="Quantity"
            >
              <InputNumber min={0} className="full-width" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item
              name="laborHours"
              label="Labor Hours"
            >
              <InputNumber min={0} step={0.5} className="full-width" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item
              name="status"
              label="Status"
            >
              <Select placeholder="Select status">
                <Select.Option value="pending">Pending</Select.Option>
                <Select.Option value="in_progress">In Progress</Select.Option>
                <Select.Option value="completed">Completed</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="notes"
          label="Notes"
        >
          <Input.TextArea
            placeholder="Operation notes"
            rows={2}
            maxLength={500}
          />
        </Form.Item>

        <Form.Item
          name="qualityNotes"
          label="Quality Notes"
        >
          <Input.TextArea
            placeholder="Quality assurance notes"
            rows={2}
            maxLength={500}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default TravelerEntryForm;
export type { TravelerFormData, DigitizedOperation };
