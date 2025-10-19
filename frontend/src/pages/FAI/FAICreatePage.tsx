import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  Typography,
  message,
  Select,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useFAIStore } from '@/store/faiStore';
import { CreateFAIReportInput } from '@/api/fai';

const { Title, Paragraph } = Typography;
const { Option } = Select;

/**
 * FAI Create Page
 *
 * Route: /fai/create
 *
 * Simple form for creating a new AS9102 FAI report.
 * After creation, user can add characteristics on the detail page.
 */
const FAICreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const { createFAIReport } = useFAIStore();

  // Handle form submission
  const handleSubmit = async (values: any) => {
    try {
      setSubmitting(true);

      const data: CreateFAIReportInput = {
        faiNumber: values.faiNumber,
        partId: values.partId,
        workOrderId: values.workOrderId || undefined,
        inspectionId: values.inspectionId || undefined,
        revisionLevel: values.revisionLevel || undefined,
      };

      const report = await createFAIReport(data);

      message.success('FAI report created successfully');
      navigate(`/fai/${report.id}`);
    } catch (error: any) {
      message.error(error.message || 'Failed to create FAI report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Back Button */}
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/fai')}
        style={{ marginBottom: '16px' }}
      >
        Back to List
      </Button>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Space align="center" style={{ marginBottom: '12px' }}>
          <FileSearchOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
          <Title level={2} style={{ margin: 0 }}>
            Create FAI Report
          </Title>
        </Space>
        <Paragraph type="secondary">
          Create a new AS9102 First Article Inspection Report. After creation, you can add
          characteristics and measurements on the detail page.
        </Paragraph>
      </div>

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            revisionLevel: 'A',
          }}
        >
          {/* FAI Number */}
          <Form.Item
            label="FAI Number"
            name="faiNumber"
            rules={[
              { required: true, message: 'Please enter FAI number' },
              { min: 3, message: 'FAI number must be at least 3 characters' },
            ]}
            tooltip="Unique identifier for this FAI report (e.g., FAI-2024-001)"
          >
            <Input
              placeholder="FAI-2024-001"
              size="large"
            />
          </Form.Item>

          {/* Part ID */}
          <Form.Item
            label="Part ID"
            name="partId"
            rules={[
              { required: true, message: 'Please select or enter part ID' },
            ]}
            tooltip="The part number being inspected"
          >
            <Select
              placeholder="Select or enter part ID"
              showSearch
              allowClear
              size="large"
              optionFilterProp="children"
            >
              {/* TODO: Load parts from API */}
              <Option value="PART-001">PART-001 - Wing Panel A</Option>
              <Option value="PART-002">PART-002 - Fuselage Section</Option>
              <Option value="PART-003">PART-003 - Landing Gear Assembly</Option>
            </Select>
          </Form.Item>

          {/* Work Order ID and Inspection ID */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item
              label="Work Order ID"
              name="workOrderId"
              tooltip="Optional: Link to related work order"
            >
              <Input placeholder="WO-2024-001" />
            </Form.Item>

            <Form.Item
              label="Inspection ID"
              name="inspectionId"
              tooltip="Optional: Link to related inspection"
            >
              <Input placeholder="INS-2024-001" />
            </Form.Item>
          </div>

          {/* Revision Level */}
          <Form.Item
            label="Revision Level"
            name="revisionLevel"
            tooltip="Drawing or part revision level (e.g., A, B, C, 1, 2)"
          >
            <Input placeholder="A" maxLength={10} />
          </Form.Item>

          {/* Action Buttons */}
          <Form.Item style={{ marginBottom: 0, marginTop: '32px' }}>
            <Space size="middle">
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                icon={<SaveOutlined />}
                loading={submitting}
              >
                Create FAI Report
              </Button>

              <Button
                size="large"
                onClick={() => navigate('/fai')}
              >
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* Help Card */}
      <Card style={{ marginTop: '24px', background: '#f0f5ff', borderColor: '#adc6ff' }}>
        <Space direction="vertical">
          <Paragraph strong style={{ color: '#1890ff', margin: 0 }}>
            Next Steps After Creation:
          </Paragraph>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li>Add characteristics with nominal values and tolerances (Form 3)</li>
            <li>Record measurements for each characteristic</li>
            <li>Review automatic pass/fail calculations</li>
            <li>Submit for review when all measurements are complete</li>
            <li>Approve with QUALIFIED signature (Quality Engineer/Inspector)</li>
          </ul>
        </Space>
      </Card>
    </div>
  );
};

export default FAICreatePage;
