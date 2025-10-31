/**
 * Kit Report Generator Component
 *
 * Flexible report generation interface for creating custom kit reports
 * with advanced filtering, scheduling, and export capabilities
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Select,
  DatePicker,
  Checkbox,
  Button,
  Space,
  Row,
  Col,
  Typography,
  Divider,
  Table,
  Tag,
  Modal,
  Input,
  Switch,
  Alert,
  Steps,
  Tooltip,
  Progress,
  List,
  Avatar,
  Badge
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  FileTextOutlined,
  DownloadOutlined,
  ScheduleOutlined,
  FilterOutlined,
  BarChartOutlined,
  TableOutlined,
  MailOutlined,
  SaveOutlined,
  PlayCircleOutlined,
  EyeOutlined,
  DeleteOutlined,
  CopyOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useKitStore } from '../../store/kitStore';
import {
  KitStatus,
  KitPriority,
  AssemblyStage,
  KitStatusLabels,
  KitPriorityLabels
} from '../../types/kits';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { Step } = Steps;

// Report template definitions
interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'performance' | 'cost' | 'operational' | 'compliance';
  fields: string[];
  filters: any;
  groupBy?: string;
  sortBy?: string;
  chartType?: 'table' | 'bar' | 'line' | 'pie';
  isCustom: boolean;
  createdBy?: string;
  createdAt: string;
  lastUsed?: string;
  useCount: number;
}

// Available report fields
const REPORT_FIELDS = {
  basic: [
    { key: 'kitNumber', label: 'Kit Number', category: 'Basic' },
    { key: 'kitName', label: 'Kit Name', category: 'Basic' },
    { key: 'workOrderNumber', label: 'Work Order', category: 'Basic' },
    { key: 'status', label: 'Status', category: 'Basic' },
    { key: 'priority', label: 'Priority', category: 'Basic' },
    { key: 'assemblyStage', label: 'Assembly Stage', category: 'Basic' }
  ],
  timing: [
    { key: 'createdAt', label: 'Created Date', category: 'Timing' },
    { key: 'dueDate', label: 'Due Date', category: 'Timing' },
    { key: 'stagedAt', label: 'Staged Date', category: 'Timing' },
    { key: 'issuedAt', label: 'Issued Date', category: 'Timing' },
    { key: 'completedAt', label: 'Completed Date', category: 'Timing' },
    { key: 'leadTime', label: 'Lead Time (hours)', category: 'Timing' },
    { key: 'stagingTime', label: 'Staging Time (hours)', category: 'Timing' }
  ],
  financial: [
    { key: 'totalCost', label: 'Total Cost', category: 'Financial' },
    { key: 'materialCost', label: 'Material Cost', category: 'Financial' },
    { key: 'laborCost', label: 'Labor Cost', category: 'Financial' },
    { key: 'overheadCost', label: 'Overhead Cost', category: 'Financial' },
    { key: 'costPerHour', label: 'Cost per Hour', category: 'Financial' }
  ],
  quality: [
    { key: 'qualityScore', label: 'Quality Score', category: 'Quality' },
    { key: 'defectCount', label: 'Defect Count', category: 'Quality' },
    { key: 'reworkRequired', label: 'Rework Required', category: 'Quality' },
    { key: 'inspectionResults', label: 'Inspection Results', category: 'Quality' }
  ],
  location: [
    { key: 'stagingLocation', label: 'Staging Location', category: 'Location' },
    { key: 'area', label: 'Area', category: 'Location' },
    { key: 'workCell', label: 'Work Cell', category: 'Location' }
  ],
  items: [
    { key: 'itemCount', label: 'Total Items', category: 'Items' },
    { key: 'stagedItems', label: 'Staged Items', category: 'Items' },
    { key: 'consumedItems', label: 'Consumed Items', category: 'Items' },
    { key: 'shortageCount', label: 'Shortage Count', category: 'Items' }
  ]
};

// Predefined report templates
const PREDEFINED_TEMPLATES: ReportTemplate[] = [
  {
    id: 'daily-summary',
    name: 'Daily Kit Summary',
    description: 'Daily overview of kit generation, completion, and performance',
    category: 'operational',
    fields: ['kitNumber', 'status', 'priority', 'createdAt', 'completedAt', 'leadTime'],
    filters: { dateRange: 'today' },
    groupBy: 'status',
    sortBy: 'createdAt',
    chartType: 'table',
    isCustom: false,
    createdAt: '2024-01-01',
    useCount: 156
  },
  {
    id: 'cost-analysis',
    name: 'Cost Analysis Report',
    description: 'Detailed cost breakdown by kit, stage, and time period',
    category: 'cost',
    fields: ['kitNumber', 'workOrderNumber', 'totalCost', 'materialCost', 'laborCost', 'costPerHour'],
    filters: { dateRange: 'month' },
    groupBy: 'assemblyStage',
    sortBy: 'totalCost',
    chartType: 'bar',
    isCustom: false,
    createdAt: '2024-01-01',
    useCount: 89
  },
  {
    id: 'performance-metrics',
    name: 'Performance Metrics',
    description: 'Kit performance, efficiency, and quality metrics',
    category: 'performance',
    fields: ['kitNumber', 'leadTime', 'stagingTime', 'qualityScore', 'defectCount'],
    filters: { status: ['COMPLETED'], dateRange: 'week' },
    groupBy: 'priority',
    sortBy: 'leadTime',
    chartType: 'line',
    isCustom: false,
    createdAt: '2024-01-01',
    useCount: 112
  },
  {
    id: 'compliance-audit',
    name: 'Compliance Audit Trail',
    description: 'Comprehensive audit trail for regulatory compliance',
    category: 'compliance',
    fields: ['kitNumber', 'workOrderNumber', 'createdAt', 'stagedAt', 'issuedAt', 'qualityScore', 'inspectionResults'],
    filters: { dateRange: 'quarter' },
    groupBy: 'workOrderNumber',
    sortBy: 'createdAt',
    chartType: 'table',
    isCustom: false,
    createdAt: '2024-01-01',
    useCount: 34
  }
];

interface ReportGenerationForm {
  templateId?: string;
  name: string;
  description?: string;
  dateRange: [dayjs.Dayjs, dayjs.Dayjs];
  filters: {
    status?: KitStatus[];
    priority?: KitPriority[];
    assemblyStage?: AssemblyStage[];
    workOrderIds?: string[];
    areas?: string[];
  };
  fields: string[];
  groupBy?: string;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
  chartType: 'table' | 'bar' | 'line' | 'pie';
  outputFormat: 'pdf' | 'excel' | 'csv' | 'json';
  includeCharts: boolean;
  includeRawData: boolean;
  schedule?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    recipients: string[];
  };
}

export const KitReportGenerator: React.FC = () => {
  // Store state
  const { loading } = useKitStore();

  // Local state
  const [form] = Form.useForm<ReportGenerationForm>();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [customTemplates, setCustomTemplates] = useState<ReportTemplate[]>([]);
  const [reportPreview, setReportPreview] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [saveTemplateVisible, setSaveTemplateVisible] = useState(false);
  const [generatedReports, setGeneratedReports] = useState<Array<{
    id: string;
    name: string;
    createdAt: string;
    size: string;
    status: 'completed' | 'generating' | 'failed';
    downloadUrl?: string;
  }>>([]);

  // Load custom templates and recent reports
  useEffect(() => {
    loadCustomTemplates();
    loadRecentReports();
  }, []);

  const loadCustomTemplates = async () => {
    // TODO: Load from API
    setCustomTemplates([]);
  };

  const loadRecentReports = async () => {
    // TODO: Load from API
    const mockReports = [
      {
        id: '1',
        name: 'Daily Kit Summary - Oct 30',
        createdAt: dayjs().subtract(1, 'hour').toISOString(),
        size: '2.4 MB',
        status: 'completed' as const,
        downloadUrl: '/reports/daily-summary-oct30.pdf'
      },
      {
        id: '2',
        name: 'Cost Analysis - October',
        createdAt: dayjs().subtract(2, 'days').toISOString(),
        size: '5.1 MB',
        status: 'completed' as const,
        downloadUrl: '/reports/cost-analysis-oct.xlsx'
      },
      {
        id: '3',
        name: 'Performance Metrics - Weekly',
        createdAt: dayjs().subtract(1, 'week').toISOString(),
        size: '1.8 MB',
        status: 'generating' as const
      }
    ];
    setGeneratedReports(mockReports);
  };

  // Handle template selection
  const handleTemplateSelect = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    form.setFieldsValue({
      name: template.name,
      description: template.description,
      fields: template.fields,
      groupBy: template.groupBy,
      sortBy: template.sortBy,
      chartType: template.chartType || 'table',
      outputFormat: 'pdf',
      includeCharts: true,
      includeRawData: false,
      sortOrder: 'desc'
    });
  };

  // Generate report preview
  const generatePreview = async () => {
    const formData = form.getFieldsValue();
    setGenerating(true);

    try {
      // TODO: Call API to generate preview
      await new Promise(resolve => setTimeout(resolve, 2000)); // Mock delay

      // Mock preview data
      const mockData = [
        {
          key: '1',
          kitNumber: 'KIT-WO-12345-01',
          status: 'COMPLETED',
          priority: 'HIGH',
          createdAt: '2024-10-30 08:00',
          leadTime: 4.2,
          totalCost: 12500
        },
        {
          key: '2',
          kitNumber: 'KIT-WO-12346-01',
          status: 'STAGED',
          priority: 'NORMAL',
          createdAt: '2024-10-30 10:30',
          leadTime: 3.8,
          totalCost: 9800
        }
      ];

      setReportPreview(mockData);
      setPreviewVisible(true);
    } catch (error) {
      console.error('Preview generation failed:', error);
    } finally {
      setGenerating(false);
    }
  };

  // Generate final report
  const generateReport = async () => {
    const formData = form.getFieldsValue();
    setGenerating(true);

    try {
      // TODO: Call API to generate report
      await new Promise(resolve => setTimeout(resolve, 3000)); // Mock delay

      // Add to generated reports list
      const newReport = {
        id: Date.now().toString(),
        name: formData.name,
        createdAt: new Date().toISOString(),
        size: '2.1 MB',
        status: 'completed' as const,
        downloadUrl: `/reports/${formData.name.replace(/\s+/g, '-').toLowerCase()}.${formData.outputFormat}`
      };

      setGeneratedReports(prev => [newReport, ...prev]);

      // Reset form
      form.resetFields();
      setCurrentStep(0);
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Report generation failed:', error);
    } finally {
      setGenerating(false);
    }
  };

  // Save as custom template
  const saveAsTemplate = async (templateData: { name: string; description: string }) => {
    const formData = form.getFieldsValue();

    const newTemplate: ReportTemplate = {
      id: Date.now().toString(),
      name: templateData.name,
      description: templateData.description,
      category: 'operational',
      fields: formData.fields,
      filters: formData.filters,
      groupBy: formData.groupBy,
      sortBy: formData.sortBy,
      chartType: formData.chartType,
      isCustom: true,
      createdBy: 'Current User',
      createdAt: new Date().toISOString(),
      useCount: 0
    };

    setCustomTemplates(prev => [newTemplate, ...prev]);
    setSaveTemplateVisible(false);
  };

  // Preview table columns
  const previewColumns: ColumnsType<any> = [
    {
      title: 'Kit Number',
      dataIndex: 'kitNumber',
      key: 'kitNumber'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: KitStatus) => (
        <Tag color={status === 'COMPLETED' ? 'green' : 'blue'}>
          {KitStatusLabels[status]}
        </Tag>
      )
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: KitPriority) => (
        <Tag color={priority === 'HIGH' ? 'red' : 'orange'}>
          {KitPriorityLabels[priority]}
        </Tag>
      )
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt'
    },
    {
      title: 'Lead Time',
      dataIndex: 'leadTime',
      key: 'leadTime',
      render: (time: number) => `${time}h`
    },
    {
      title: 'Total Cost',
      dataIndex: 'totalCost',
      key: 'totalCost',
      render: (cost: number) => `$${cost.toLocaleString()}`
    }
  ];

  // Recent reports table columns
  const reportsColumns: ColumnsType<any> = [
    {
      title: 'Report Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: any) => (
        <Space>
          <FileTextOutlined />
          {name}
          {record.status === 'generating' && <Badge status="processing" />}
        </Space>
      )
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('MMM DD, YYYY HH:mm')
    },
    {
      title: 'Size',
      dataIndex: 'size',
      key: 'size'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={
          status === 'completed' ? 'green' :
          status === 'generating' ? 'blue' : 'red'
        }>
          {status.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {record.status === 'completed' && (
            <Button
              type="text"
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => window.open(record.downloadUrl)}
            >
              Download
            </Button>
          )}
          <Button
            type="text"
            size="small"
            icon={<DeleteOutlined />}
            danger
          >
            Delete
          </Button>
        </Space>
      )
    }
  ];

  const steps = [
    {
      title: 'Template',
      content: (
        <div>
          <Title level={4}>Select Report Template</Title>
          <Row gutter={16}>
            {PREDEFINED_TEMPLATES.map(template => (
              <Col span={12} key={template.id} style={{ marginBottom: 16 }}>
                <Card
                  hoverable
                  onClick={() => handleTemplateSelect(template)}
                  style={{
                    border: selectedTemplate?.id === template.id ? '2px solid #1890ff' : undefined
                  }}
                >
                  <Card.Meta
                    title={template.name}
                    description={template.description}
                  />
                  <div style={{ marginTop: 8 }}>
                    <Tag color="blue">{template.category}</Tag>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Used {template.useCount} times
                    </Text>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          {customTemplates.length > 0 && (
            <>
              <Divider>Custom Templates</Divider>
              <Row gutter={16}>
                {customTemplates.map(template => (
                  <Col span={12} key={template.id} style={{ marginBottom: 16 }}>
                    <Card
                      hoverable
                      onClick={() => handleTemplateSelect(template)}
                      style={{
                        border: selectedTemplate?.id === template.id ? '2px solid #1890ff' : undefined
                      }}
                    >
                      <Card.Meta
                        title={template.name}
                        description={template.description}
                      />
                      <div style={{ marginTop: 8 }}>
                        <Tag color="green">Custom</Tag>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          Created {dayjs(template.createdAt).fromNow()}
                        </Text>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            </>
          )}

          <Button
            type="dashed"
            onClick={() => setCurrentStep(1)}
            style={{ width: '100%', marginTop: 16 }}
          >
            Create Custom Report
          </Button>
        </div>
      )
    },
    {
      title: 'Configuration',
      content: (
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Report Name"
                rules={[{ required: true, message: 'Please enter report name' }]}
              >
                <Input placeholder="Enter report name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="description" label="Description">
                <Input placeholder="Optional description" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="dateRange"
                label="Date Range"
                rules={[{ required: true, message: 'Please select date range' }]}
              >
                <RangePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="outputFormat" label="Output Format" initialValue="pdf">
                <Select>
                  <Option value="pdf">PDF</Option>
                  <Option value="excel">Excel</Option>
                  <Option value="csv">CSV</Option>
                  <Option value="json">JSON</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="fields" label="Include Fields" rules={[{ required: true }]}>
            <Checkbox.Group style={{ width: '100%' }}>
              {Object.entries(REPORT_FIELDS).map(([category, fields]) => (
                <div key={category} style={{ marginBottom: 16 }}>
                  <Text strong>{category.toUpperCase()}</Text>
                  <Row>
                    {fields.map(field => (
                      <Col span={8} key={field.key}>
                        <Checkbox value={field.key}>{field.label}</Checkbox>
                      </Col>
                    ))}
                  </Row>
                </div>
              ))}
            </Checkbox.Group>
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="groupBy" label="Group By">
                <Select placeholder="Select grouping" allowClear>
                  <Option value="status">Status</Option>
                  <Option value="priority">Priority</Option>
                  <Option value="assemblyStage">Assembly Stage</Option>
                  <Option value="area">Area</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="sortBy" label="Sort By">
                <Select placeholder="Select sorting" allowClear>
                  <Option value="createdAt">Created Date</Option>
                  <Option value="leadTime">Lead Time</Option>
                  <Option value="totalCost">Total Cost</Option>
                  <Option value="kitNumber">Kit Number</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="chartType" label="Chart Type" initialValue="table">
                <Select>
                  <Option value="table">Table Only</Option>
                  <Option value="bar">Bar Chart</Option>
                  <Option value="line">Line Chart</Option>
                  <Option value="pie">Pie Chart</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="includeCharts" valuePropName="checked" initialValue={true}>
                <Checkbox>Include Charts</Checkbox>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="includeRawData" valuePropName="checked">
                <Checkbox>Include Raw Data</Checkbox>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name={['schedule', 'enabled']} valuePropName="checked">
                <Checkbox>Schedule Report</Checkbox>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      )
    },
    {
      title: 'Review',
      content: (
        <div>
          <Title level={4}>Report Summary</Title>

          <Card style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Text strong>Report Name:</Text> {form.getFieldValue('name')}
                <br />
                <Text strong>Output Format:</Text> {form.getFieldValue('outputFormat')?.toUpperCase()}
                <br />
                <Text strong>Fields:</Text> {form.getFieldValue('fields')?.length} selected
              </Col>
              <Col span={12}>
                <Text strong>Date Range:</Text> Last 30 days
                <br />
                <Text strong>Group By:</Text> {form.getFieldValue('groupBy') || 'None'}
                <br />
                <Text strong>Include Charts:</Text> {form.getFieldValue('includeCharts') ? 'Yes' : 'No'}
              </Col>
            </Row>
          </Card>

          <Space>
            <Button
              icon={<EyeOutlined />}
              onClick={generatePreview}
              loading={generating}
            >
              Preview Data
            </Button>
            <Button
              icon={<SaveOutlined />}
              onClick={() => setSaveTemplateVisible(true)}
            >
              Save as Template
            </Button>
          </Space>
        </div>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>
            Kit Report Generator
          </Title>
          <Text type="secondary">
            Create custom reports and analytics for kit management data
          </Text>
        </Col>
      </Row>

      <Row gutter={24}>
        {/* Report Generation */}
        <Col span={16}>
          <Card>
            <Steps current={currentStep} style={{ marginBottom: 24 }}>
              {steps.map(step => (
                <Step key={step.title} title={step.title} />
              ))}
            </Steps>

            <div style={{ minHeight: 400 }}>
              {steps[currentStep].content}
            </div>

            <Divider />

            <Space>
              {currentStep > 0 && (
                <Button onClick={() => setCurrentStep(currentStep - 1)}>
                  Previous
                </Button>
              )}
              {currentStep < steps.length - 1 && (
                <Button
                  type="primary"
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={currentStep === 0 && !selectedTemplate}
                >
                  Next
                </Button>
              )}
              {currentStep === steps.length - 1 && (
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={generateReport}
                  loading={generating}
                >
                  Generate Report
                </Button>
              )}
            </Space>
          </Card>
        </Col>

        {/* Recent Reports */}
        <Col span={8}>
          <Card title="Recent Reports" size="small">
            <Table
              columns={reportsColumns}
              dataSource={generatedReports}
              pagination={{ pageSize: 5 }}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      {/* Preview Modal */}
      <Modal
        title="Report Preview"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        width={1000}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            Close
          </Button>,
          <Button
            key="generate"
            type="primary"
            onClick={generateReport}
            loading={generating}
          >
            Generate Full Report
          </Button>
        ]}
      >
        <Table
          columns={previewColumns}
          dataSource={reportPreview}
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Modal>

      {/* Save Template Modal */}
      <Modal
        title="Save as Template"
        open={saveTemplateVisible}
        onCancel={() => setSaveTemplateVisible(false)}
        onOk={() => {
          const name = (document.getElementById('template-name') as HTMLInputElement)?.value;
          const description = (document.getElementById('template-description') as HTMLTextAreaElement)?.value;
          if (name) {
            saveAsTemplate({ name, description });
          }
        }}
      >
        <Form layout="vertical">
          <Form.Item label="Template Name" required>
            <Input id="template-name" placeholder="Enter template name" />
          </Form.Item>
          <Form.Item label="Description">
            <TextArea id="template-description" placeholder="Optional description" rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default KitReportGenerator;