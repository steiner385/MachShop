/**
 * Vendor Serial Entry Form Component
 * Issue #150: Serialization - Advanced Assignment Workflows
 * Phase 9: Frontend UI Components
 *
 * Form for receiving and managing vendor-provided serial numbers
 */

import React, { useState } from 'react';
import {
  Form,
  Input,
  DatePicker,
  Button,
  Card,
  Space,
  Alert,
  Spin,
  message,
  Steps,
  Descriptions,
} from 'antd';
import { CheckOutlined, DownloadOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { apiClient } from '@/services/apiClient';

export interface VendorSerialFormValues {
  vendorSerialNumber: string;
  vendorName: string;
  partId: string;
  receivedDate?: dayjs.Dayjs;
}

interface VendorSerialEntryFormProps {
  onSuccess?: () => void;
  partId?: string;
  onCancel?: () => void;
}

const VendorSerialEntryForm: React.FC<VendorSerialEntryFormProps> = ({
  onSuccess,
  partId,
  onCancel,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [vendorSerial, setVendorSerial] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const handleSubmit = async (values: VendorSerialFormValues) => {
    try {
      setLoading(true);

      const payload = {
        vendorSerialNumber: values.vendorSerialNumber,
        vendorName: values.vendorName,
        partId: values.partId,
        receivedDate: values.receivedDate?.toISOString(),
      };

      const response = await apiClient.post(
        '/api/v1/serialization/vendor/receive',
        payload
      );

      setVendorSerial(response.data);
      setCurrentStep(1);
      setSubmitted(true);
      message.success('Vendor serial received successfully');

      if (onSuccess) {
        setTimeout(() => onSuccess(), 1000);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to receive vendor serial');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
    setSubmitted(false);
    setVendorSerial(null);
    setCurrentStep(0);
  };

  const steps = [
    {
      title: 'Enter Details',
      status: submitted ? 'finish' : 'process',
    },
    {
      title: 'Confirmation',
      status: submitted ? 'finish' : 'wait',
    },
  ];

  return (
    <Card
      title="Vendor Serial Entry"
      extra={
        submitted && (
          <CheckOutlined style={{ color: '#52c41a', fontSize: '20px' }} />
        )
      }
    >
      <Steps current={currentStep} items={steps} style={{ marginBottom: 24 }} />

      {!submitted ? (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark={true}
        >
          <Form.Item
            label="Vendor Serial Number"
            name="vendorSerialNumber"
            rules={[
              { required: true, message: 'Please enter vendor serial number' },
              {
                pattern: /^[A-Z0-9\-]+$/,
                message: 'Serial number must contain only uppercase letters, numbers, and hyphens',
              },
            ]}
          >
            <Input
              placeholder="e.g., VS-2024-001"
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="Vendor Name"
            name="vendorName"
            rules={[{ required: true, message: 'Please enter vendor name' }]}
          >
            <Input
              placeholder="e.g., Acme Corporation"
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="Part ID"
            name="partId"
            rules={[{ required: true, message: 'Please select or enter part ID' }]}
            initialValue={partId}
          >
            <Input
              placeholder="Enter part ID"
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="Received Date"
            name="receivedDate"
          >
            <DatePicker
              size="large"
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
              >
                Receive Vendor Serial
              </Button>
              {onCancel && (
                <Button onClick={onCancel} size="large">
                  Cancel
                </Button>
              )}
            </Space>
          </Form.Item>
        </Form>
      ) : vendorSerial ? (
        <div>
          <Alert
            message="Vendor serial received successfully"
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Descriptions
            bordered
            column={1}
            style={{ marginBottom: 16 }}
          >
            <Descriptions.Item label="Serial ID">
              {vendorSerial.id}
            </Descriptions.Item>
            <Descriptions.Item label="Vendor Serial Number">
              {vendorSerial.vendorSerialNumber}
            </Descriptions.Item>
            <Descriptions.Item label="Vendor Name">
              {vendorSerial.vendorName}
            </Descriptions.Item>
            <Descriptions.Item label="Part ID">
              {vendorSerial.partId}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              {vendorSerial.status}
            </Descriptions.Item>
            <Descriptions.Item label="Received At">
              {new Date(vendorSerial.receivedAt).toLocaleString()}
            </Descriptions.Item>
          </Descriptions>

          <Space>
            <Button
              type="primary"
              onClick={handleReset}
              size="large"
            >
              Enter Another Serial
            </Button>
            {onCancel && (
              <Button onClick={onCancel} size="large">
                Close
              </Button>
            )}
          </Space>
        </div>
      ) : (
        <Spin />
      )}
    </Card>
  );
};

export default VendorSerialEntryForm;
