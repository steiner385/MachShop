/**
 * LLP Life Event Form Component
 *
 * Form for recording life events on Life-Limited Parts including:
 * - Manufacturing, installation, removal events
 * - Inspection and maintenance activities
 * - Repair and overhaul records
 * - Cycle and hour tracking
 * - Work order and location tracking
 * - Certification document attachment
 *
 * Safety-critical form with comprehensive validation
 * for aerospace manufacturing traceability.
 */

import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Button,
  Card,
  Row,
  Col,
  Upload,
  Alert,
  Typography,
  Space,
  Divider,
  message,
  Modal,
  Table,
  Tag,
  Tooltip,
  Switch
} from 'antd';
import {
  SaveOutlined,
  ReloadOutlined,
  UploadOutlined,
  FileTextOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  ClockCircleOutlined,
  ToolOutlined,
  SafetyOutlined,
  HistoryOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate, useParams } from 'react-router-dom';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface LLPLifeEventData {
  serializedPartId: string;
  eventType: string;
  eventDate: Date;
  cyclesAtEvent?: number;
  hoursAtEvent?: number;
  parentAssemblyId?: string;
  parentSerialNumber?: string;
  workOrderId?: string;
  operationId?: string;
  performedBy?: string;
  location?: string;
  notes?: string;
  certificationUrls?: string[];
  inspectionResults?: any;
  repairDetails?: any;
  metadata?: any;
}

interface SerializedPartOption {
  id: string;
  partNumber: string;
  serialNumber: string;
  currentLifeStatus: {
    totalCycles: number;
    totalYears: number;
    overallPercentageUsed: number;
    status: string;
  };
  isLifeLimited: boolean;
}

interface WorkOrderOption {
  id: string;
  workOrderNumber: string;
  description: string;
  status: string;
}

interface AssemblyOption {
  id: string;
  assemblyNumber: string;
  serialNumber: string;
  type: string;
}

interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const LLPLifeEventForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serializedParts, setSerializedParts] = useState<SerializedPartOption[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderOption[]>([]);
  const [assemblies, setAssemblies] = useState<AssemblyOption[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadFile[]>([]);
  const [selectedPart, setSelectedPart] = useState<SerializedPartOption | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [previewLifeStatus, setPreviewLifeStatus] = useState<any>(null);

  const eventType = Form.useWatch('eventType', form);
  const cyclesAtEvent = Form.useWatch('cyclesAtEvent', form);
  const eventDate = Form.useWatch('eventDate', form);

  useEffect(() => {
    loadSerializedParts();
    loadWorkOrders();
    loadAssemblies();

    if (id && id !== 'new') {
      // Pre-select the part if ID is provided
      form.setFieldsValue({ serializedPartId: id });
      handlePartSelect(id);
    }
  }, [id]);

  useEffect(() => {
    if (selectedPart && cyclesAtEvent && eventDate) {
      validateLifeEvent();
    }
  }, [selectedPart, cyclesAtEvent, eventDate, eventType]);

  const loadSerializedParts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/serialization/parts?limit=1000', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSerializedParts(data.parts.filter((p: any) => p.part?.isLifeLimited) || []);
      } else {
        // Use mock data if API fails
        setSerializedParts([
          {
            id: '1',
            partNumber: 'TURB-BLADE-001',
            serialNumber: 'TB001-2024-001',
            currentLifeStatus: {
              totalCycles: 14750,
              totalYears: 0.8,
              overallPercentageUsed: 98.3,
              status: 'NEAR_RETIREMENT'
            },
            isLifeLimited: true
          },
          {
            id: '2',
            partNumber: 'GUIDE-VANE-001',
            serialNumber: 'GV001-2024-002',
            currentLifeStatus: {
              totalCycles: 8500,
              totalYears: 0.5,
              overallPercentageUsed: 56.7,
              status: 'ACTIVE'
            },
            isLifeLimited: true
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to load serialized parts:', error);
      setSerializedParts([]);
    }
  };

  const loadWorkOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/workorders?status=ACTIVE&limit=500', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setWorkOrders(data.workOrders || []);
      } else {
        // Use mock data if API fails
        setWorkOrders([
          { id: '1', workOrderNumber: 'WO-2024-001', description: 'Engine Assembly', status: 'IN_PROGRESS' },
          { id: '2', workOrderNumber: 'WO-2024-002', description: 'Maintenance Check', status: 'ACTIVE' }
        ]);
      }
    } catch (error) {
      console.error('Failed to load work orders:', error);
      setWorkOrders([]);
    }
  };

  const loadAssemblies = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/assemblies?limit=500', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAssemblies(data.assemblies || []);
      } else {
        // Use mock data if API fails
        setAssemblies([
          { id: '1', assemblyNumber: 'ENG-001', serialNumber: 'ENG001-2024-001', type: 'Engine' },
          { id: '2', assemblyNumber: 'APU-001', serialNumber: 'APU001-2024-001', type: 'APU' }
        ]);
      }
    } catch (error) {
      console.error('Failed to load assemblies:', error);
      setAssemblies([]);
    }
  };

  const handlePartSelect = async (partId: string) => {
    const part = serializedParts.find(p => p.id === partId);
    setSelectedPart(part || null);

    if (part) {
      // Load current life status to help with validation
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/v1/llp/life-status/${partId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const lifeStatus = await response.json();
          setPreviewLifeStatus(lifeStatus);
        }
      } catch (error) {
        console.error('Failed to load life status:', error);
      }
    }
  };

  const validateLifeEvent = async () => {
    if (!selectedPart || !cyclesAtEvent || !eventDate) return;

    const warnings: string[] = [];
    const errors: string[] = [];

    // Check if cycles are reasonable
    if (cyclesAtEvent < selectedPart.currentLifeStatus.totalCycles) {
      errors.push('Cycles at event cannot be less than current total cycles');
    }

    // Check if event date is reasonable
    const eventMoment = moment(eventDate);
    if (eventMoment.isAfter(moment())) {
      warnings.push('Event date is in the future');
    }

    // Check if part is approaching retirement
    if (selectedPart.currentLifeStatus.overallPercentageUsed >= 95) {
      if (eventType === 'INSTALL') {
        errors.push('Cannot install part that is at or near retirement limit');
      } else {
        warnings.push('Part is at or near retirement limit - consider proposing retirement');
      }
    }

    // Check for event type specific validations
    if (eventType === 'REMOVE' && !form.getFieldValue('parentAssemblyId')) {
      warnings.push('Consider specifying which assembly the part was removed from');
    }

    if (['REPAIR', 'OVERHAUL'].includes(eventType) && !form.getFieldValue('workOrderId')) {
      warnings.push('Work order should be specified for maintenance activities');
    }

    setValidationResult({
      isValid: errors.length === 0,
      warnings,
      errors
    });
  };

  const handleSubmit = async (values: LLPLifeEventData) => {
    // Show validation modal if there are issues
    if (validationResult && (validationResult.errors.length > 0 || validationResult.warnings.length > 0)) {
      setShowValidationModal(true);
      return;
    }

    await submitLifeEvent(values);
  };

  const submitLifeEvent = async (values: LLPLifeEventData) => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');

      // Upload any attached files first
      const certificationUrls: string[] = [];
      for (const file of uploadedFiles) {
        if (file.originFileObj) {
          const formData = new FormData();
          formData.append('document', file.originFileObj);
          formData.append('metadata', JSON.stringify({
            eventType: values.eventType,
            serializedPartId: values.serializedPartId
          }));

          const uploadResponse = await fetch('/api/v1/llp/certifications/upload', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
          });

          if (uploadResponse.ok) {
            const uploadResult = await uploadResponse.json();
            certificationUrls.push(uploadResult.documentUrl);
          }
        }
      }

      // Submit the life event
      const eventData = {
        ...values,
        eventDate: moment(values.eventDate).toISOString(),
        certificationUrls
      };

      const response = await fetch('/api/v1/llp/life-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(eventData)
      });

      if (response.ok) {
        const result = await response.json();
        message.success('Life event recorded successfully');
        navigate(`/llp/parts/${values.serializedPartId}`);
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to record life event');
      }
    } catch (error: any) {
      console.error('Failed to record life event:', error);
      message.error(error.message || 'Failed to record life event');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (id && id !== 'new') {
      navigate(`/llp/parts/${id}`);
    } else {
      navigate('/llp/dashboard');
    }
  };

  const handleReset = () => {
    form.resetFields();
    setUploadedFiles([]);
    setSelectedPart(null);
    setValidationResult(null);
  };

  const getEventTypeHelp = (type: string) => {
    switch (type) {
      case 'MANUFACTURE':
        return 'Initial manufacturing and quality acceptance';
      case 'INSTALL':
        return 'Installation into parent assembly or engine';
      case 'REMOVE':
        return 'Removal from parent assembly for maintenance or retirement';
      case 'INSPECT':
        return 'Scheduled or unscheduled inspection activities';
      case 'REPAIR':
        return 'Repair activities to restore serviceability';
      case 'OVERHAUL':
        return 'Major overhaul or refurbishment activities';
      case 'REWORK':
        return 'Manufacturing rework or modification';
      case 'TEST':
        return 'Testing activities (performance, NDT, etc.)';
      default:
        return '';
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'MANUFACTURE': return <SafetyOutlined />;
      case 'INSTALL': case 'REMOVE': return <ToolOutlined />;
      case 'INSPECT': return <FileTextOutlined />;
      case 'REPAIR': case 'OVERHAUL': case 'REWORK': return <WarningOutlined />;
      case 'TEST': return <ExclamationCircleOutlined />;
      default: return <InfoCircleOutlined />;
    }
  };

  const uploadProps = {
    onRemove: (file: UploadFile) => {
      const index = uploadedFiles.indexOf(file);
      const newFileList = uploadedFiles.slice();
      newFileList.splice(index, 1);
      setUploadedFiles(newFileList);
    },
    beforeUpload: (file: UploadFile) => {
      setUploadedFiles([...uploadedFiles, file]);
      return false; // Prevent automatic upload
    },
    fileList: uploadedFiles,
  };

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
          <HistoryOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          Record Life Event
        </Title>
        <Text type="secondary">
          Record maintenance activities and life tracking events for LLP traceability
        </Text>
      </div>

      {/* Current Part Status */}
      {selectedPart && (
        <Alert
          message="Selected Part Status"
          description={
            <div>
              <strong>{selectedPart.partNumber}</strong> (S/N: {selectedPart.serialNumber}) -
              {' '}{selectedPart.currentLifeStatus.totalCycles.toLocaleString()} cycles
              ({selectedPart.currentLifeStatus.overallPercentageUsed.toFixed(1)}% life used)
              <Tag color={selectedPart.currentLifeStatus.overallPercentageUsed >= 95 ? 'red' : 'green'} style={{ marginLeft: 8 }}>
                {selectedPart.currentLifeStatus.status.replace('_', ' ')}
              </Tag>
            </div>
          }
          type="info"
          icon={<InfoCircleOutlined />}
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Validation Warnings */}
      {validationResult && validationResult.warnings.length > 0 && (
        <Alert
          message="Validation Warnings"
          description={
            <ul style={{ margin: 0 }}>
              {validationResult.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          }
          type="warning"
          icon={<WarningOutlined />}
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Main Form */}
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          eventDate: moment(),
          performedBy: 'Current User'
        }}
      >
        <Row gutter={[16, 16]}>
          {/* Basic Event Information */}
          <Col xs={24} lg={12}>
            <Card title="Event Information" style={{ height: '100%' }}>
              <Form.Item
                name="serializedPartId"
                label="Serialized Part"
                rules={[{ required: true, message: 'Please select a part' }]}
              >
                <Select
                  placeholder="Select part"
                  showSearch
                  filterOption={(input, option) =>
                    (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                  }
                  onChange={handlePartSelect}
                  disabled={id && id !== 'new'}
                >
                  {serializedParts.map((part) => (
                    <Option key={part.id} value={part.id}>
                      {part.partNumber} - {part.serialNumber}
                      <Tag color={part.currentLifeStatus.overallPercentageUsed >= 95 ? 'red' : 'green'} style={{ marginLeft: 8 }}>
                        {part.currentLifeStatus.overallPercentageUsed.toFixed(1)}%
                      </Tag>
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="eventType"
                label="Event Type"
                rules={[{ required: true, message: 'Please select event type' }]}
                extra={eventType ? getEventTypeHelp(eventType) : ''}
              >
                <Select placeholder="Select event type">
                  <Option value="MANUFACTURE">
                    <Space>
                      {getEventTypeIcon('MANUFACTURE')}
                      Manufacture
                    </Space>
                  </Option>
                  <Option value="INSTALL">
                    <Space>
                      {getEventTypeIcon('INSTALL')}
                      Install
                    </Space>
                  </Option>
                  <Option value="REMOVE">
                    <Space>
                      {getEventTypeIcon('REMOVE')}
                      Remove
                    </Space>
                  </Option>
                  <Option value="INSPECT">
                    <Space>
                      {getEventTypeIcon('INSPECT')}
                      Inspect
                    </Space>
                  </Option>
                  <Option value="REPAIR">
                    <Space>
                      {getEventTypeIcon('REPAIR')}
                      Repair
                    </Space>
                  </Option>
                  <Option value="OVERHAUL">
                    <Space>
                      {getEventTypeIcon('OVERHAUL')}
                      Overhaul
                    </Space>
                  </Option>
                  <Option value="REWORK">
                    <Space>
                      {getEventTypeIcon('REWORK')}
                      Rework
                    </Space>
                  </Option>
                  <Option value="TEST">
                    <Space>
                      {getEventTypeIcon('TEST')}
                      Test
                    </Space>
                  </Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="eventDate"
                label="Event Date"
                rules={[{ required: true, message: 'Please select event date' }]}
              >
                <DatePicker
                  showTime
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD HH:mm"
                />
              </Form.Item>

              <Form.Item
                name="performedBy"
                label="Performed By"
                rules={[{ required: true, message: 'Please specify who performed this event' }]}
              >
                <Input placeholder="Enter name of person who performed this event" />
              </Form.Item>

              <Form.Item
                name="location"
                label="Location"
                extra="Where this event was performed"
              >
                <Input placeholder="e.g., Assembly Line 1, Inspection Bay 2" />
              </Form.Item>
            </Card>
          </Col>

          {/* Life Tracking Data */}
          <Col xs={24} lg={12}>
            <Card title="Life Tracking Data" style={{ height: '100%' }}>
              <Form.Item
                name="cyclesAtEvent"
                label="Cycles at Event"
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value && ['INSTALL', 'REMOVE', 'INSPECT'].includes(getFieldValue('eventType'))) {
                        return Promise.reject(new Error('Cycles at event is required for this event type'));
                      }
                      if (selectedPart && value && value < selectedPart.currentLifeStatus.totalCycles) {
                        return Promise.reject(new Error('Cycles cannot be less than current total cycles'));
                      }
                      return Promise.resolve();
                    },
                  }),
                ]}
                extra={selectedPart ? `Current: ${selectedPart.currentLifeStatus.totalCycles.toLocaleString()} cycles` : ''}
              >
                <InputNumber
                  placeholder="Total cycles at time of event"
                  style={{ width: '100%' }}
                  min={0}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
                />
              </Form.Item>

              <Form.Item
                name="hoursAtEvent"
                label="Flight Hours at Event"
                extra="Total flight hours at time of event (if applicable)"
              >
                <InputNumber
                  placeholder="Total flight hours"
                  style={{ width: '100%' }}
                  min={0}
                  step={0.1}
                />
              </Form.Item>

              <Form.Item
                name="workOrderId"
                label="Work Order"
                extra="Associated work order (recommended for maintenance activities)"
              >
                <Select
                  placeholder="Select work order"
                  showSearch
                  allowClear
                  filterOption={(input, option) =>
                    (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {workOrders.map((wo) => (
                    <Option key={wo.id} value={wo.id}>
                      {wo.workOrderNumber} - {wo.description}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="parentAssemblyId"
                label="Parent Assembly"
                extra="Assembly this part is installed in (for install/remove events)"
              >
                <Select
                  placeholder="Select parent assembly"
                  showSearch
                  allowClear
                  filterOption={(input, option) =>
                    (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {assemblies.map((assembly) => (
                    <Option key={assembly.id} value={assembly.id}>
                      {assembly.assemblyNumber} - {assembly.serialNumber}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="parentSerialNumber"
                label="Parent Serial Number"
                extra="Serial number of parent assembly (if not in system)"
              >
                <Input placeholder="Enter parent assembly serial number" />
              </Form.Item>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          {/* Additional Details */}
          <Col xs={24} lg={12}>
            <Card title="Additional Details">
              <Form.Item
                name="notes"
                label="Event Notes"
                extra="Detailed description of the event, findings, or actions taken"
              >
                <TextArea
                  rows={4}
                  placeholder="Enter detailed notes about this event..."
                />
              </Form.Item>

              {['INSPECT', 'TEST'].includes(eventType) && (
                <Form.Item
                  name="inspectionResults"
                  label="Inspection/Test Results"
                  extra="Structured results data (JSON format)"
                >
                  <TextArea
                    rows={3}
                    placeholder='{"visualInspection": "PASS", "measurements": {...}}'
                  />
                </Form.Item>
              )}

              {['REPAIR', 'OVERHAUL', 'REWORK'].includes(eventType) && (
                <Form.Item
                  name="repairDetails"
                  label="Repair/Work Details"
                  extra="Structured repair data (JSON format)"
                >
                  <TextArea
                    rows={3}
                    placeholder='{"defectDescription": "...", "actionTaken": "...", "partsReplaced": [...]}'
                  />
                </Form.Item>
              )}
            </Card>
          </Col>

          {/* Document Attachments */}
          <Col xs={24} lg={12}>
            <Card title="Document Attachments">
              <Form.Item
                label="Certification Documents"
                extra="Upload relevant certification documents, inspection reports, or repair records"
              >
                <Upload {...uploadProps} multiple>
                  <Button icon={<UploadOutlined />}>
                    Attach Documents
                  </Button>
                </Upload>
              </Form.Item>

              {uploadedFiles.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <Text strong>Files to Upload:</Text>
                  <ul style={{ marginTop: 8 }}>
                    {uploadedFiles.map((file, index) => (
                      <li key={index}>
                        <FileTextOutlined style={{ marginRight: 8 }} />
                        {file.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          </Col>
        </Row>

        {/* Action Buttons */}
        <Card style={{ marginTop: 16 }}>
          <Row justify="space-between">
            <Col>
              <Space>
                <Button onClick={handleCancel}>Cancel</Button>
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  Reset
                </Button>
              </Space>
            </Col>
            <Col>
              <Button
                type="primary"
                htmlType="submit"
                loading={saving}
                icon={<SaveOutlined />}
                size="large"
              >
                Record Life Event
              </Button>
            </Col>
          </Row>
        </Card>
      </Form>

      {/* Validation Modal */}
      <Modal
        title="Event Validation"
        open={showValidationModal}
        onCancel={() => setShowValidationModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowValidationModal(false)}>
            Go Back
          </Button>,
          validationResult?.errors.length === 0 && (
            <Button
              key="submit"
              type="primary"
              onClick={() => {
                setShowValidationModal(false);
                submitLifeEvent(form.getFieldsValue());
              }}
            >
              Record Anyway
            </Button>
          )
        ]}
      >
        {validationResult?.errors.length > 0 && (
          <Alert
            message="Validation Errors"
            description={
              <ul style={{ margin: 0 }}>
                {validationResult.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            }
            type="error"
            style={{ marginBottom: 16 }}
          />
        )}

        {validationResult?.warnings.length > 0 && (
          <Alert
            message="Validation Warnings"
            description={
              <ul style={{ margin: 0 }}>
                {validationResult.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            }
            type="warning"
            style={{ marginBottom: 16 }}
          />
        )}

        <Text type="secondary">
          {validationResult?.errors.length > 0
            ? 'Please correct the errors before proceeding.'
            : 'You can proceed despite the warnings, but please review them carefully.'
          }
        </Text>
      </Modal>
    </div>
  );
};

export default LLPLifeEventForm;