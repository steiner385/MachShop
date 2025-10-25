import React, { useEffect, useState } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  InputNumber,
  Switch,
  Button,
  Space,
  Typography,
  message,
  Row,
  Col,
  Divider,
} from 'antd';
import { ApartmentOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { createOperation, getAllOperations } from '@/api/operation';
import type { CreateOperationData, Operation } from '@/types/operation';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

/**
 * Operation Create Page
 * Form for creating new manufacturing operations
 */

const OperationCreatePage: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [parentOperations, setParentOperations] = useState<Operation[]>([]);

  useEffect(() => {
    fetchParentOperations();
  }, []);

  const fetchParentOperations = async () => {
    try {
      const ops = await getAllOperations({ isActive: true });
      setParentOperations(ops);
    } catch (error) {
      console.error('Error fetching parent operations:', error);
    }
  };

  const handleSubmit = async (values: CreateOperationData) => {
    try {
      setLoading(true);
      const operation = await createOperation(values);
      message.success('Operation created successfully');
      navigate(`/operations/${operation.id}`);
    } catch (error) {
      message.error('Failed to create operation');
      console.error('Error creating operation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/operations');
  };

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <div>
          <Title level={2} style={{ margin: 0 }}>
            <ApartmentOutlined style={{ marginRight: 8 }} />
            Create Operation
          </Title>
          <Text type="secondary">
            Define a new manufacturing operation or process step
          </Text>
        </div>

        {/* Form */}
        <Card>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              level: 1,
              isActive: true,
              requiresApproval: false,
              version: '1.0',
            }}
          >
            <Title level={4}>Basic Information</Title>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  label="Operation Code"
                  name="operationCode"
                  rules={[
                    { required: true, message: 'Operation code is required' },
                    { pattern: /^[A-Z0-9-]+$/, message: 'Use uppercase letters, numbers, and hyphens only' },
                  ]}
                  tooltip="Unique identifier (e.g., OP-010-MILL, QC-001-INSPECT)"
                >
                  <Input placeholder="OP-010-MILL" />
                </Form.Item>
              </Col>

              <Col span={16}>
                <Form.Item
                  label="Operation Name"
                  name="operationName"
                  rules={[{ required: true, message: 'Operation name is required' }]}
                >
                  <Input placeholder="CNC Milling Operation" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label="Description"
              name="description"
              tooltip="Detailed description of the operation"
            >
              <TextArea
                rows={3}
                placeholder="Describe the operation, procedures, and requirements..."
              />
            </Form.Item>

            <Divider />

            <Title level={4}>Classification</Title>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  label="Operation Type"
                  name="operationType"
                  rules={[{ required: true, message: 'Operation type is required' }]}
                  tooltip="Primary classification of this operation"
                >
                  <Select placeholder="Select type">
                    <Option value="PRODUCTION">Production</Option>
                    <Option value="QUALITY">Quality</Option>
                    <Option value="MATERIAL_HANDLING">Material Handling</Option>
                    <Option value="MAINTENANCE">Maintenance</Option>
                    <Option value="SETUP">Setup</Option>
                    <Option value="CLEANING">Cleaning</Option>
                    <Option value="PACKAGING">Packaging</Option>
                    <Option value="TESTING">Testing</Option>
                    <Option value="REWORK">Rework</Option>
                    <Option value="OTHER">Other</Option>
                  </Select>
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item
                  label="Category"
                  name="category"
                  tooltip="Additional categorization (MACHINING, ASSEMBLY, INSPECTION, etc.)"
                >
                  <Input placeholder="MACHINING" />
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item
                  label="Version"
                  name="version"
                  rules={[{ required: true, message: 'Version is required' }]}
                  tooltip="Version number for this process definition"
                >
                  <Input placeholder="1.0" />
                </Form.Item>
              </Col>
            </Row>

            <Divider />

            <Title level={4}>Hierarchy</Title>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Hierarchy Level"
                  name="level"
                  rules={[{ required: true, message: 'Level is required' }]}
                  tooltip="1 = Top-level operation, 5 = Detailed step"
                >
                  <Select>
                    <Option value={1}>Level 1 - Top-level Operation</Option>
                    <Option value={2}>Level 2 - Major Process</Option>
                    <Option value={3}>Level 3 - Process Step</Option>
                    <Option value={4}>Level 4 - Detailed Instruction</Option>
                    <Option value={5}>Level 5 - Sub-step</Option>
                  </Select>
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item
                  label="Parent Operation"
                  name="parentOperationId"
                  tooltip="Optional: Select parent operation for hierarchical operations"
                >
                  <Select
                    placeholder="Select parent operation (optional)"
                    allowClear
                    showSearch
                    optionFilterProp="children"
                  >
                    {parentOperations.map((operation) => (
                      <Option key={operation.id} value={operation.id}>
                        {operation.operationCode} - {operation.operationName}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Divider />

            <Title level={4}>Timing & Capacity</Title>
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item
                  label="Duration (seconds)"
                  name="duration"
                  tooltip="Standard operation duration"
                >
                  <InputNumber min={0} style={{ width: '100%' }} placeholder="3600" />
                </Form.Item>
              </Col>

              <Col span={6}>
                <Form.Item
                  label="Setup Time (seconds)"
                  name="setupTime"
                  tooltip="Time required to set up equipment/tooling"
                >
                  <InputNumber min={0} style={{ width: '100%' }} placeholder="600" />
                </Form.Item>
              </Col>

              <Col span={6}>
                <Form.Item
                  label="Teardown Time (seconds)"
                  name="teardownTime"
                  tooltip="Time required to teardown after operation"
                >
                  <InputNumber min={0} style={{ width: '100%' }} placeholder="300" />
                </Form.Item>
              </Col>

              <Col span={6}>
                <Form.Item
                  label="Min Cycle Time (seconds)"
                  name="minCycleTime"
                  tooltip="Minimum cycle time for this operation"
                >
                  <InputNumber min={0} style={{ width: '100%' }} placeholder="2400" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={6}>
                <Form.Item
                  label="Max Cycle Time (seconds)"
                  name="maxCycleTime"
                  tooltip="Maximum cycle time for this operation"
                >
                  <InputNumber min={0} style={{ width: '100%' }} placeholder="4800" />
                </Form.Item>
              </Col>
            </Row>

            <Divider />

            <Title level={4}>Status & Approval</Title>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  label="Active Status"
                  name="isActive"
                  valuePropName="checked"
                  tooltip="Is this operation currently active?"
                >
                  <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item
                  label="Requires Approval"
                  name="requiresApproval"
                  valuePropName="checked"
                  tooltip="Does this process require management approval?"
                >
                  <Switch checkedChildren="Yes" unCheckedChildren="No" />
                </Form.Item>
              </Col>
            </Row>

            <Divider />

            {/* Actions */}
            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={loading}
                >
                  Create Operation
                </Button>
                <Button icon={<CloseOutlined />} onClick={handleCancel}>
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>

        <Card>
          <Title level={5}>Next Steps</Title>
          <Text type="secondary">
            After creating the operation, you can define:
          </Text>
          <ul>
            <li>Process parameters (inputs, outputs, set points)</li>
            <li>Dependencies and sequencing rules</li>
            <li>Resource requirements (personnel, equipment, materials)</li>
            <li>Child operations (hierarchical breakdown)</li>
          </ul>
        </Card>
      </Space>
    </div>
  );
};

export default OperationCreatePage;
