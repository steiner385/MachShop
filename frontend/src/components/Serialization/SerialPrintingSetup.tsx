/**
 * Serial Printing Setup Component
 * Issue #150: Serialization - Advanced Assignment Workflows
 * Phase 9: Frontend UI Components
 *
 * Component for configuring and managing serial number printing
 */

import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Space,
  Table,
  Tag,
  Modal,
  Alert,
  Divider,
  Radio,
  InputNumber,
  Checkbox,
  message,
  Tooltip,
  Row,
  Col,
} from 'antd';
import {
  PrinterOutlined,
  DownloadOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { apiClient } from '@/services/apiClient';

interface PrintTemplate {
  id: string;
  name: string;
  format: string;
  width: number;
  height: number;
  dpi: number;
  fontFamily: string;
  fontSize: number;
  includeQRCode: boolean;
  includeBarcode: boolean;
  printableArea: string;
  createdAt: string;
}

interface SerialPrintingSetupProps {
  onCancel?: () => void;
}

const PRINT_FORMATS = [
  { label: 'Zebra ZPL', value: 'zebra_zpl' },
  { label: 'Thermal PDF', value: 'thermal_pdf' },
  { label: 'Standard Label', value: 'standard_label' },
];

const LABEL_SIZES = [
  { label: '2x3 inches', value: '2x3', width: 2, height: 3 },
  { label: '4x6 inches', value: '4x6', width: 4, height: 6 },
  { label: '3x5 inches', value: '3x5', width: 3, height: 5 },
];

const FONTS = [
  { label: 'Courier New', value: 'courier' },
  { label: 'Arial', value: 'arial' },
  { label: 'Times New Roman', value: 'times' },
];

const DPI_OPTIONS = [
  { label: '203 DPI', value: 203 },
  { label: '300 DPI', value: 300 },
  { label: '600 DPI', value: 600 },
];

const SerialPrintingSetup: React.FC<SerialPrintingSetupProps> = ({ onCancel }) => {
  const [form] = Form.useForm();
  const [templates, setTemplates] = useState<PrintTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PrintTemplate | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [printableArea, setPrintableArea] = useState('full');

  const handleCreateTemplate = async (values: any) => {
    try {
      setLoading(true);

      const payload = {
        ...values,
        createdBy: 'current-user',
      };

      const response = await apiClient.post(
        '/api/v1/serialization/print-templates',
        payload
      );

      setTemplates([...templates, response.data]);
      form.resetFields();
      message.success('Print template created successfully');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to create template');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await apiClient.delete(
        `/api/v1/serialization/print-templates/${templateId}`
      );

      setTemplates(templates.filter(t => t.id !== templateId));
      message.success('Template deleted successfully');
    } catch (error: any) {
      message.error('Failed to delete template');
    }
  };

  const handleTestPrint = async (template: PrintTemplate) => {
    try {
      // Request test print
      await apiClient.post(
        `/api/v1/serialization/print-templates/${template.id}/test`,
        { testSerialNumber: 'TEST-2024-001' }
      );

      message.success('Test print sent successfully');
    } catch (error: any) {
      message.error('Failed to send test print');
    }
  };

  const handleExportTemplate = (template: PrintTemplate) => {
    const dataStr = JSON.stringify(template, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `${template.name}-template.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const templateColumns = [
    {
      title: 'Template Name',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: 'Format',
      dataIndex: 'format',
      key: 'format',
      width: 130,
      render: (format: string) => (
        <Tag>{format.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Label Size',
      dataIndex: 'width',
      key: 'size',
      width: 120,
      render: (_: any, record: PrintTemplate) => (
        `${record.width}" x ${record.height}"`
      ),
    },
    {
      title: 'DPI',
      dataIndex: 'dpi',
      key: 'dpi',
      width: 80,
    },
    {
      title: 'Features',
      key: 'features',
      width: 200,
      render: (_: any, record: PrintTemplate) => (
        <Space size="small">
          {record.includeQRCode && <Tag color="blue">QR Code</Tag>}
          {record.includeBarcode && <Tag color="green">Barcode</Tag>}
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_: any, record: PrintTemplate) => (
        <Space>
          <Tooltip title="Preview">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedTemplate(record);
                setPreviewVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Test Print">
            <Button
              type="text"
              size="small"
              icon={<PrinterOutlined />}
              onClick={() => handleTestPrint(record)}
            />
          </Tooltip>
          <Tooltip title="Export">
            <Button
              type="text"
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => handleExportTemplate(record)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteTemplate(record.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="Serial Printing Configuration"
        style={{ marginBottom: 24 }}
      >
        <Alert
          message="Configure label templates for printing serial numbers"
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateTemplate}
          requiredMark={true}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Template Name"
                name="name"
                rules={[{ required: true, message: 'Please enter template name' }]}
              >
                <Input
                  placeholder="e.g., Standard Shipping Label"
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="Print Format"
                name="format"
                rules={[{ required: true, message: 'Please select format' }]}
              >
                <Select
                  placeholder="Select printer format"
                  options={PRINT_FORMATS}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="Label Size"
                name="labelSize"
                rules={[{ required: true, message: 'Please select label size' }]}
              >
                <Select
                  placeholder="Select label dimensions"
                  options={LABEL_SIZES.map(s => ({ label: s.label, value: s.value }))}
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                label="DPI (Resolution)"
                name="dpi"
                initialValue={203}
                rules={[{ required: true }]}
              >
                <Select
                  options={DPI_OPTIONS}
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                label="Font Family"
                name="fontFamily"
                initialValue="courier"
              >
                <Select
                  options={FONTS}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Font Size (points)"
                name="fontSize"
                initialValue={12}
              >
                <InputNumber
                  min={8}
                  max={36}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Form.Item label="Label Content Features">
            <Space direction="vertical">
              <Checkbox name="includeQRCode">
                Include QR Code (encodes serial number for barcode scanning)
              </Checkbox>
              <Checkbox name="includeBarcode">
                Include Barcode (1D barcode representation)
              </Checkbox>
              <Checkbox name="includeLotNumber">
                Include Lot Number
              </Checkbox>
              <Checkbox name="includePartNumber">
                Include Part Number
              </Checkbox>
            </Space>
          </Form.Item>

          <Form.Item label="Printable Area">
            <Radio.Group onChange={(e) => setPrintableArea(e.target.value)} value={printableArea}>
              <Radio value="full">Full Label Area</Radio>
              <Radio value="content">Content Area (with margins)</Radio>
              <Radio value="custom">Custom Area</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
              >
                Create Template
              </Button>
              {onCancel && (
                <Button onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card title="Print Templates">
        <Table
          dataSource={templates}
          columns={templateColumns}
          rowKey="id"
          pagination={false}
          loading={loading}
          locale={{
            emptyText: 'No print templates configured',
          }}
        />
      </Card>

      <Modal
        title="Template Preview"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            Close
          </Button>,
        ]}
      >
        {selectedTemplate && (
          <div style={{ border: '1px solid #ddd', padding: '20px', textAlign: 'center' }}>
            <div
              style={{
                width: `${selectedTemplate.width * 96}px`,
                height: `${selectedTemplate.height * 96}px`,
                border: '2px dashed #999',
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#fafafa',
                fontFamily: selectedTemplate.fontFamily,
                fontSize: `${selectedTemplate.fontSize}pt`,
              }}
            >
              <div>
                <div style={{ marginBottom: '8px' }}>SERIAL NUMBER</div>
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>TEST-2024-001</div>
                {selectedTemplate.includeQRCode && (
                  <div style={{ fontSize: '10px', marginBottom: '8px' }}>
                    [QR CODE PLACEHOLDER]
                  </div>
                )}
                {selectedTemplate.includeBarcode && (
                  <div style={{ fontSize: '10px' }}>
                    [BARCODE PLACEHOLDER]
                  </div>
                )}
              </div>
            </div>
            <div style={{ marginTop: '16px', fontSize: '12px', color: '#666' }}>
              Preview: {selectedTemplate.width}" x {selectedTemplate.height}" at {selectedTemplate.dpi} DPI
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SerialPrintingSetup;
