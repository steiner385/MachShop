import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Spin, Typography, Button, Form, Input, Select, Space, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { TextArea } = Input;

const WorkOrderEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    // In a real implementation, this would fetch the work order data
    // For now, this is a placeholder for E2E test routing verification
    if (id) {
      form.setFieldsValue({
        workOrderNumber: id,
        status: 'IN_PROGRESS',
        description: 'Sample work order',
      });
    }
  }, [id, form]);

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      // Placeholder for API call
      await new Promise(resolve => setTimeout(resolve, 500));
      message.success('Work order updated successfully');
      navigate(`/workorders/${id}`);
    } catch (error) {
      message.error('Failed to update work order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(`/workorders/${id}`)}
            style={{ marginBottom: 16 }}
          >
            Back to Work Order
          </Button>
          <Title level={2}>Edit Work Order: {id}</Title>
          <Text type="secondary">Modify work order details</Text>
        </div>

        <Card>
          <Spin spinning={loading}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              autoComplete="off"
            >
              <Form.Item
                label="Work Order Number"
                name="workOrderNumber"
                rules={[{ required: true, message: 'Please enter work order number' }]}
              >
                <Input placeholder="WO-2024-001" disabled />
              </Form.Item>

              <Form.Item
                label="Status"
                name="status"
                rules={[{ required: true, message: 'Please select status' }]}
              >
                <Select placeholder="Select status">
                  <Select.Option value="CREATED">Created</Select.Option>
                  <Select.Option value="RELEASED">Released</Select.Option>
                  <Select.Option value="IN_PROGRESS">In Progress</Select.Option>
                  <Select.Option value="COMPLETED">Completed</Select.Option>
                  <Select.Option value="CANCELLED">Cancelled</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="Description"
                name="description"
              >
                <TextArea rows={4} placeholder="Enter work order description" />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" loading={loading}>
                    Save Changes
                  </Button>
                  <Button onClick={() => navigate(`/workorders/${id}`)}>
                    Cancel
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Spin>
        </Card>
      </Space>
    </div>
  );
};

export default WorkOrderEdit;
