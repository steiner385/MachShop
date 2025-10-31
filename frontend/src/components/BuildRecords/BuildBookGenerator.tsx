import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Switch,
  Upload,
  Button,
  Space,
  Row,
  Col,
  Typography,
  Divider,
  Tabs,
  Checkbox,
  Slider,
  ColorPicker,
  Radio,
  Alert,
  Modal,
  message,
  Preview,
  Tag,
  Collapse,
  Tooltip
} from 'antd';
import {
  DownloadOutlined,
  EyeOutlined,
  SaveOutlined,
  UploadOutlined,
  DeleteOutlined,
  CopyOutlined,
  SettingOutlined,
  FileTextOutlined,
  PictureOutlined,
  PrinterOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import type { UploadProps } from 'antd';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;
const { Panel } = Collapse;

interface BuildBookTemplate {
  id?: string;
  name: string;
  description?: string;
  isDefault: boolean;
  customerId?: string;
  customer?: string;
  settings: TemplateSettings;
  createdAt?: string;
  updatedAt?: string;
}

interface TemplateSettings {
  // Header/Footer
  header: {
    enabled: boolean;
    logoUrl?: string;
    logoPosition: 'left' | 'center' | 'right';
    logoSize: number;
    title: string;
    subtitle?: string;
    showPageNumbers: boolean;
    showDate: boolean;
    customText?: string;
  };
  footer: {
    enabled: boolean;
    text: string;
    showPageNumbers: boolean;
    showGeneratedBy: boolean;
    companyInfo?: string;
    certificationInfo?: string;
  };

  // Document Structure
  sections: {
    coverPage: boolean;
    tableOfContents: boolean;
    engineIdentification: boolean;
    asBuiltConfiguration: boolean;
    operationsList: boolean;
    deviationsList: boolean;
    photoGallery: boolean;
    signaturePages: boolean;
    appendices: boolean;
  };

  // Styling
  styling: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    fontSize: number;
    headerFontSize: number;
    lineSpacing: number;
    marginTop: number;
    marginBottom: number;
    marginLeft: number;
    marginRight: number;
  };

  // Content Options
  content: {
    includePhotos: boolean;
    photoMaxSize: number;
    includeDevations: boolean;
    includeNotes: boolean;
    includeTimestamps: boolean;
    includeSignatures: boolean;
    includeQRCode: boolean;
    watermark?: string;
  };

  // Compliance
  compliance: {
    as9100: boolean;
    faaPart43: boolean;
    iso9001: boolean;
    customStandards: string[];
  };

  // Customer Specific
  customerSettings: {
    requireCustomerApproval: boolean;
    customFields: Array<{
      name: string;
      type: 'text' | 'number' | 'date' | 'boolean';
      required: boolean;
      defaultValue?: any;
    }>;
    customSections: Array<{
      name: string;
      content: string;
      position: number;
    }>;
  };
}

interface BuildBookGeneratorProps {
  visible: boolean;
  buildRecordId?: string;
  initialTemplate?: BuildBookTemplate;
  onClose: () => void;
  onGenerate: (template: BuildBookTemplate) => void;
}

const BuildBookGenerator: React.FC<BuildBookGeneratorProps> = ({
  visible,
  buildRecordId,
  initialTemplate,
  onClose,
  onGenerate
}) => {
  const [form] = Form.useForm();
  const [templates, setTemplates] = useState<BuildBookTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<BuildBookTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saveAsModalVisible, setSaveAsModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    if (visible) {
      fetchTemplates();
      if (initialTemplate) {
        setSelectedTemplate(initialTemplate);
        form.setFieldsValue(initialTemplate);
      }
    }
  }, [visible, initialTemplate]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/build-books/templates', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      form.setFieldsValue(template.settings);
    }
  };

  const getDefaultTemplate = (): TemplateSettings => ({
    header: {
      enabled: true,
      logoPosition: 'left',
      logoSize: 50,
      title: 'Electronic Build Book',
      subtitle: 'AS9100 Compliant Assembly Record',
      showPageNumbers: true,
      showDate: true
    },
    footer: {
      enabled: true,
      text: 'Confidential - Property of Company Name',
      showPageNumbers: true,
      showGeneratedBy: true,
      companyInfo: 'Your Company Name\nAddress Line 1\nAddress Line 2',
      certificationInfo: 'AS9100D Certified | FAA Repair Station #XXXR'
    },
    sections: {
      coverPage: true,
      tableOfContents: true,
      engineIdentification: true,
      asBuiltConfiguration: true,
      operationsList: true,
      deviationsList: true,
      photoGallery: true,
      signaturePages: true,
      appendices: false
    },
    styling: {
      primaryColor: '#1890ff',
      secondaryColor: '#722ed1',
      fontFamily: 'Arial',
      fontSize: 11,
      headerFontSize: 14,
      lineSpacing: 1.2,
      marginTop: 72,
      marginBottom: 72,
      marginLeft: 72,
      marginRight: 72
    },
    content: {
      includePhotos: true,
      photoMaxSize: 300,
      includeDevations: true,
      includeNotes: true,
      includeTimestamps: true,
      includeSignatures: true,
      includeQRCode: true
    },
    compliance: {
      as9100: true,
      faaPart43: true,
      iso9001: false,
      customStandards: []
    },
    customerSettings: {
      requireCustomerApproval: false,
      customFields: [],
      customSections: []
    }
  });

  const handlePreview = async () => {
    if (!buildRecordId) {
      message.warning('No build record selected for preview');
      return;
    }

    try {
      setPreviewLoading(true);
      const values = await form.validateFields();

      const response = await fetch(`/api/build-books/preview/${buildRecordId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ templateSettings: values })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        window.URL.revokeObjectURL(url);
      } else {
        message.error('Failed to generate preview');
      }
    } catch (error) {
      console.error('Error generating preview:', error);
      message.error('Error generating preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSaveTemplate = async (values: any) => {
    try {
      setLoading(true);

      const template: BuildBookTemplate = {
        ...selectedTemplate,
        ...values,
        settings: await form.validateFields()
      };

      const response = await fetch('/api/build-books/templates', {
        method: selectedTemplate?.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(template)
      });

      if (response.ok) {
        message.success('Template saved successfully');
        fetchTemplates();
        setSaveAsModalVisible(false);
      } else {
        message.error('Failed to save template');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      message.error('Error saving template');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    try {
      const settings = await form.validateFields();
      const template: BuildBookTemplate = {
        name: selectedTemplate?.name || 'Custom Template',
        isDefault: false,
        settings
      };

      onGenerate(template);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const uploadProps: UploadProps = {
    accept: 'image/*',
    showUploadList: false,
    beforeUpload: (file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          form.setFieldValue(['header', 'logoUrl'], e.target.result);
        }
      };
      reader.readAsDataURL(file);
      return false;
    }
  };

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined />
          Build Book Generator
        </Space>
      }
      visible={visible}
      onCancel={onClose}
      width={1400}
      footer={
        <Row justify="space-between">
          <Col>
            <Space>
              <Button onClick={() => form.setFieldsValue(getDefaultTemplate())}>
                Reset to Default
              </Button>
              <Button onClick={() => setSaveAsModalVisible(true)}>
                Save Template
              </Button>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button onClick={onClose}>
                Cancel
              </Button>
              <Button
                icon={<EyeOutlined />}
                onClick={handlePreview}
                loading={previewLoading}
                disabled={!buildRecordId}
              >
                Preview
              </Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleGenerate}
                loading={loading}
              >
                Generate Build Book
              </Button>
            </Space>
          </Col>
        </Row>
      }
    >
      <Row gutter={[24, 0]}>
        <Col span={6}>
          <Card title="Templates" size="small" style={{ height: '70vh', overflowY: 'auto' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                type="dashed"
                icon={<PictureOutlined />}
                onClick={() => {
                  setSelectedTemplate(null);
                  form.setFieldsValue(getDefaultTemplate());
                }}
                block
              >
                New Template
              </Button>

              <Divider style={{ margin: '12px 0' }} />

              {templates.map((template) => (
                <Card
                  key={template.id}
                  size="small"
                  hoverable
                  onClick={() => handleTemplateSelect(template.id!)}
                  style={{
                    border: selectedTemplate?.id === template.id ? '2px solid #1890ff' : '1px solid #d9d9d9'
                  }}
                >
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong>{template.name}</Text>
                      {template.isDefault && <Tag color="blue">Default</Tag>}
                    </div>
                    {template.description && (
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {template.description}
                      </Text>
                    )}
                    {template.customer && (
                      <Tag color="green">{template.customer}</Tag>
                    )}
                  </Space>
                </Card>
              ))}
            </Space>
          </Card>
        </Col>

        <Col span={18}>
          <Card style={{ height: '70vh', overflowY: 'auto' }}>
            <Form
              form={form}
              layout="vertical"
              initialValues={getDefaultTemplate()}
            >
              <Tabs activeKey={activeTab} onChange={setActiveTab}>
                {/* General Settings */}
                <TabPane tab="General" key="general">
                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <Card title="Header Settings" size="small">
                        <Form.Item name={['header', 'enabled']} valuePropName="checked">
                          <Checkbox>Enable Header</Checkbox>
                        </Form.Item>

                        <Form.Item name={['header', 'title']} label="Title">
                          <Input placeholder="Build Book Title" />
                        </Form.Item>

                        <Form.Item name={['header', 'subtitle']} label="Subtitle">
                          <Input placeholder="Subtitle (optional)" />
                        </Form.Item>

                        <Form.Item label="Company Logo">
                          <Upload {...uploadProps}>
                            <Button icon={<UploadOutlined />}>Upload Logo</Button>
                          </Upload>
                        </Form.Item>

                        <Form.Item name={['header', 'logoPosition']} label="Logo Position">
                          <Radio.Group>
                            <Radio value="left">Left</Radio>
                            <Radio value="center">Center</Radio>
                            <Radio value="right">Right</Radio>
                          </Radio.Group>
                        </Form.Item>

                        <Form.Item name={['header', 'logoSize']} label="Logo Size (px)">
                          <Slider min={20} max={100} />
                        </Form.Item>
                      </Card>
                    </Col>

                    <Col span={12}>
                      <Card title="Footer Settings" size="small">
                        <Form.Item name={['footer', 'enabled']} valuePropName="checked">
                          <Checkbox>Enable Footer</Checkbox>
                        </Form.Item>

                        <Form.Item name={['footer', 'text']} label="Footer Text">
                          <Input placeholder="Footer text" />
                        </Form.Item>

                        <Form.Item name={['footer', 'companyInfo']} label="Company Information">
                          <TextArea rows={3} placeholder="Company address and contact info" />
                        </Form.Item>

                        <Form.Item name={['footer', 'certificationInfo']} label="Certification Info">
                          <TextArea rows={2} placeholder="AS9100, FAA certifications, etc." />
                        </Form.Item>

                        <Space>
                          <Form.Item name={['footer', 'showPageNumbers']} valuePropName="checked">
                            <Checkbox>Page Numbers</Checkbox>
                          </Form.Item>
                          <Form.Item name={['footer', 'showGeneratedBy']} valuePropName="checked">
                            <Checkbox>Generated By</Checkbox>
                          </Form.Item>
                        </Space>
                      </Card>
                    </Col>
                  </Row>
                </TabPane>

                {/* Document Structure */}
                <TabPane tab="Structure" key="structure">
                  <Card title="Document Sections" size="small">
                    <Row gutter={[16, 16]}>
                      <Col span={8}>
                        <Space direction="vertical">
                          <Form.Item name={['sections', 'coverPage']} valuePropName="checked">
                            <Checkbox>Cover Page</Checkbox>
                          </Form.Item>
                          <Form.Item name={['sections', 'tableOfContents']} valuePropName="checked">
                            <Checkbox>Table of Contents</Checkbox>
                          </Form.Item>
                          <Form.Item name={['sections', 'engineIdentification']} valuePropName="checked">
                            <Checkbox>Engine Identification</Checkbox>
                          </Form.Item>
                        </Space>
                      </Col>
                      <Col span={8}>
                        <Space direction="vertical">
                          <Form.Item name={['sections', 'asBuiltConfiguration']} valuePropName="checked">
                            <Checkbox>As-Built Configuration</Checkbox>
                          </Form.Item>
                          <Form.Item name={['sections', 'operationsList']} valuePropName="checked">
                            <Checkbox>Operations List</Checkbox>
                          </Form.Item>
                          <Form.Item name={['sections', 'deviationsList']} valuePropName="checked">
                            <Checkbox>Deviations List</Checkbox>
                          </Form.Item>
                        </Space>
                      </Col>
                      <Col span={8}>
                        <Space direction="vertical">
                          <Form.Item name={['sections', 'photoGallery']} valuePropName="checked">
                            <Checkbox>Photo Gallery</Checkbox>
                          </Form.Item>
                          <Form.Item name={['sections', 'signaturePages']} valuePropName="checked">
                            <Checkbox>Signature Pages</Checkbox>
                          </Form.Item>
                          <Form.Item name={['sections', 'appendices']} valuePropName="checked">
                            <Checkbox>Appendices</Checkbox>
                          </Form.Item>
                        </Space>
                      </Col>
                    </Row>
                  </Card>

                  <Card title="Content Options" size="small" style={{ marginTop: '16px' }}>
                    <Row gutter={[16, 16]}>
                      <Col span={12}>
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Form.Item name={['content', 'includePhotos']} valuePropName="checked">
                            <Checkbox>Include Photos</Checkbox>
                          </Form.Item>
                          <Form.Item name={['content', 'photoMaxSize']} label="Max Photo Size (px)">
                            <Slider min={100} max={600} />
                          </Form.Item>
                          <Form.Item name={['content', 'includeDeviations']} valuePropName="checked">
                            <Checkbox>Include Deviations</Checkbox>
                          </Form.Item>
                          <Form.Item name={['content', 'includeNotes']} valuePropName="checked">
                            <Checkbox>Include Notes</Checkbox>
                          </Form.Item>
                        </Space>
                      </Col>
                      <Col span={12}>
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Form.Item name={['content', 'includeTimestamps']} valuePropName="checked">
                            <Checkbox>Include Timestamps</Checkbox>
                          </Form.Item>
                          <Form.Item name={['content', 'includeSignatures']} valuePropName="checked">
                            <Checkbox>Include Signatures</Checkbox>
                          </Form.Item>
                          <Form.Item name={['content', 'includeQRCode']} valuePropName="checked">
                            <Checkbox>Include QR Code</Checkbox>
                          </Form.Item>
                          <Form.Item name={['content', 'watermark']} label="Watermark Text">
                            <Input placeholder="Optional watermark" />
                          </Form.Item>
                        </Space>
                      </Col>
                    </Row>
                  </Card>
                </TabPane>

                {/* Styling */}
                <TabPane tab="Styling" key="styling">
                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <Card title="Colors & Fonts" size="small">
                        <Form.Item name={['styling', 'primaryColor']} label="Primary Color">
                          <ColorPicker />
                        </Form.Item>

                        <Form.Item name={['styling', 'secondaryColor']} label="Secondary Color">
                          <ColorPicker />
                        </Form.Item>

                        <Form.Item name={['styling', 'fontFamily']} label="Font Family">
                          <Select>
                            <Option value="Arial">Arial</Option>
                            <Option value="Times New Roman">Times New Roman</Option>
                            <Option value="Helvetica">Helvetica</Option>
                            <Option value="Calibri">Calibri</Option>
                          </Select>
                        </Form.Item>

                        <Form.Item name={['styling', 'fontSize']} label="Font Size">
                          <Slider min={8} max={16} />
                        </Form.Item>

                        <Form.Item name={['styling', 'headerFontSize']} label="Header Font Size">
                          <Slider min={10} max={24} />
                        </Form.Item>
                      </Card>
                    </Col>

                    <Col span={12}>
                      <Card title="Layout & Spacing" size="small">
                        <Form.Item name={['styling', 'lineSpacing']} label="Line Spacing">
                          <Slider min={1} max={2} step={0.1} />
                        </Form.Item>

                        <Form.Item name={['styling', 'marginTop']} label="Top Margin (pt)">
                          <Slider min={36} max={144} />
                        </Form.Item>

                        <Form.Item name={['styling', 'marginBottom']} label="Bottom Margin (pt)">
                          <Slider min={36} max={144} />
                        </Form.Item>

                        <Form.Item name={['styling', 'marginLeft']} label="Left Margin (pt)">
                          <Slider min={36} max={144} />
                        </Form.Item>

                        <Form.Item name={['styling', 'marginRight']} label="Right Margin (pt)">
                          <Slider min={36} max={144} />
                        </Form.Item>
                      </Card>
                    </Col>
                  </Row>
                </TabPane>

                {/* Compliance */}
                <TabPane tab="Compliance" key="compliance">
                  <Card title="Regulatory Standards" size="small">
                    <Alert
                      message="Compliance Requirements"
                      description="Select the regulatory standards that apply to your build books. This will include required sections and formatting."
                      type="info"
                      showIcon
                      style={{ marginBottom: '16px' }}
                    />

                    <Row gutter={[16, 16]}>
                      <Col span={8}>
                        <Form.Item name={['compliance', 'as9100']} valuePropName="checked">
                          <Checkbox>
                            <Space>
                              AS9100D
                              <Tooltip title="Aerospace Quality Management System">
                                <InfoCircleOutlined />
                              </Tooltip>
                            </Space>
                          </Checkbox>
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name={['compliance', 'faaPart43']} valuePropName="checked">
                          <Checkbox>
                            <Space>
                              FAA Part 43
                              <Tooltip title="Federal Aviation Administration Maintenance Requirements">
                                <InfoCircleOutlined />
                              </Tooltip>
                            </Space>
                          </Checkbox>
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name={['compliance', 'iso9001']} valuePropName="checked">
                          <Checkbox>
                            <Space>
                              ISO 9001
                              <Tooltip title="Quality Management System">
                                <InfoCircleOutlined />
                              </Tooltip>
                            </Space>
                          </Checkbox>
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item name={['compliance', 'customStandards']} label="Custom Standards">
                      <Select
                        mode="tags"
                        placeholder="Add custom compliance standards..."
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Card>
                </TabPane>
              </Tabs>
            </Form>
          </Card>
        </Col>
      </Row>

      {/* Save Template Modal */}
      <Modal
        title="Save Template"
        visible={saveAsModalVisible}
        onCancel={() => setSaveAsModalVisible(false)}
        footer={null}
      >
        <Form onFinish={handleSaveTemplate} layout="vertical">
          <Form.Item
            name="name"
            label="Template Name"
            rules={[{ required: true, message: 'Please enter template name' }]}
          >
            <Input placeholder="Enter template name" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <TextArea rows={3} placeholder="Template description (optional)" />
          </Form.Item>

          <Form.Item name="isDefault" valuePropName="checked">
            <Checkbox>Set as default template</Checkbox>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button onClick={() => setSaveAsModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Save Template
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Modal>
  );
};

export default BuildBookGenerator;