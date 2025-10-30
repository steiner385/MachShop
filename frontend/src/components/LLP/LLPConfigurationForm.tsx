/**
 * LLP Configuration Form Component
 *
 * Form for configuring Life-Limited Part settings including:
 * - Life limits (cycles and time)
 * - Retirement criteria and thresholds
 * - Criticality level assignment
 * - Inspection intervals
 * - Regulatory references and compliance requirements
 * - Alert configurations
 *
 * Safety-critical form with comprehensive validation
 * for aerospace manufacturing compliance.
 */

import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Button,
  Card,
  Row,
  Col,
  Divider,
  Alert,
  Typography,
  Space,
  Tooltip,
  message,
  Modal,
  Steps,
  Checkbox
} from 'antd';
import {
  SafetyOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  BookOutlined,
  ClockCircleOutlined,
  ToolOutlined,
  SaveOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { Step } = Steps;

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface LLPConfigurationData {
  partId: string;
  isLifeLimited: boolean;
  criticalityLevel: 'SAFETY_CRITICAL' | 'MONITORED' | 'TRACKED';
  retirementType: 'CYCLES_OR_TIME' | 'CYCLES_ONLY' | 'TIME_ONLY' | 'CYCLES_AND_TIME';
  cycleLimit?: number;
  timeLimit?: number;
  inspectionInterval?: number;
  regulatoryReference?: string;
  certificationRequired: boolean;
  notes?: string;
  alertThresholds: {
    info: number;
    warning: number;
    critical: number;
    urgent: number;
  };
}

interface PartOption {
  id: string;
  partNumber: string;
  partName: string;
  isLifeLimited: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const LLPConfigurationForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parts, setParts] = useState<PartOption[]>([]);
  const [loadingParts, setLoadingParts] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationIssues, setValidationIssues] = useState<string[]>([]);

  const isLifeLimited = Form.useWatch('isLifeLimited', form);
  const criticalityLevel = Form.useWatch('criticalityLevel', form);
  const retirementType = Form.useWatch('retirementType', form);

  useEffect(() => {
    loadParts();
    if (id && id !== 'new') {
      setIsEditMode(true);
      loadConfiguration(id);
    }
  }, [id]);

  const loadParts = async () => {
    setLoadingParts(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/parts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setParts(data.parts || []);
      } else {
        // Use mock data if API fails
        setParts([
          { id: '1', partNumber: 'TURB-BLADE-001', partName: 'Turbine Blade Assembly', isLifeLimited: false },
          { id: '2', partNumber: 'GUIDE-VANE-001', partName: 'Guide Vane', isLifeLimited: false },
          { id: '3', partNumber: 'SHAFT-001', partName: 'Main Shaft', isLifeLimited: true },
          { id: '4', partNumber: 'BEARING-001', partName: 'Main Bearing', isLifeLimited: false },
        ]);
      }
    } catch (error) {
      console.error('Failed to load parts:', error);
      setParts([]);
    } finally {
      setLoadingParts(false);
    }
  };

  const loadConfiguration = async (partId: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/llp/configuration/${partId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const config = await response.json();
        form.setFieldsValue({
          ...config,
          alertThresholds: config.alertThresholds || {
            info: 80,
            warning: 90,
            critical: 95,
            urgent: 98
          }
        });
      } else if (response.status === 404) {
        // New configuration for existing part
        form.setFieldsValue({
          partId,
          isLifeLimited: false,
          certificationRequired: false,
          alertThresholds: {
            info: 80,
            warning: 90,
            critical: 95,
            urgent: 98
          }
        });
      }
    } catch (error) {
      console.error('Failed to load configuration:', error);
      message.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const validateConfiguration = (values: LLPConfigurationData): string[] => {
    const issues: string[] = [];

    if (values.isLifeLimited) {
      // Check if at least one limit is specified
      if (!values.cycleLimit && !values.timeLimit) {
        issues.push('Life-limited parts must have either cycle limit or time limit specified');
      }

      // Validate cycle limit
      if (values.cycleLimit && values.cycleLimit <= 0) {
        issues.push('Cycle limit must be greater than 0');
      }

      // Validate time limit
      if (values.timeLimit && values.timeLimit <= 0) {
        issues.push('Time limit must be greater than 0');
      }

      // Validate inspection interval
      if (values.inspectionInterval && values.inspectionInterval <= 0) {
        issues.push('Inspection interval must be greater than 0');
      }

      // Check retirement type consistency
      if (values.retirementType === 'CYCLES_ONLY' && !values.cycleLimit) {
        issues.push('Cycle limit is required when retirement type is "Cycles Only"');
      }

      if (values.retirementType === 'TIME_ONLY' && !values.timeLimit) {
        issues.push('Time limit is required when retirement type is "Time Only"');
      }

      if (values.retirementType === 'CYCLES_AND_TIME' && (!values.cycleLimit || !values.timeLimit)) {
        issues.push('Both cycle and time limits are required when retirement type is "Cycles AND Time"');
      }

      // Safety-critical parts should have inspection intervals
      if (values.criticalityLevel === 'SAFETY_CRITICAL' && !values.inspectionInterval) {
        issues.push('Safety-critical parts should have inspection intervals defined');
      }

      // Validate alert thresholds
      const thresholds = values.alertThresholds;
      if (thresholds.info >= thresholds.warning) {
        issues.push('Warning threshold must be higher than info threshold');
      }
      if (thresholds.warning >= thresholds.critical) {
        issues.push('Critical threshold must be higher than warning threshold');
      }
      if (thresholds.critical >= thresholds.urgent) {
        issues.push('Urgent threshold must be higher than critical threshold');
      }
    }

    return issues;
  };

  const handleSubmit = async (values: LLPConfigurationData) => {
    // Validate configuration
    const issues = validateConfiguration(values);
    if (issues.length > 0) {
      setValidationIssues(issues);
      setShowValidationModal(true);
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/llp/configuration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(values)
      });

      if (response.ok) {
        message.success(
          isEditMode
            ? 'LLP configuration updated successfully'
            : 'LLP configuration created successfully'
        );
        navigate('/llp/dashboard');
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save configuration');
      }
    } catch (error: any) {
      console.error('Failed to save configuration:', error);
      message.error(error.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/llp/dashboard');
  };

  const handleReset = () => {
    form.resetFields();
    setCurrentStep(0);
  };

  const nextStep = () => {
    form.validateFields().then(() => {
      setCurrentStep(currentStep + 1);
    }).catch(() => {
      message.error('Please complete all required fields before proceeding');
    });
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const getCriticalityHelp = (level: string) => {
    switch (level) {
      case 'SAFETY_CRITICAL':
        return 'Failure can result in catastrophic consequences. Requires strict monitoring and immediate action at retirement limits.';
      case 'MONITORED':
        return 'Important for operational reliability. Monitored closely with some tolerance for extension.';
      case 'TRACKED':
        return 'Tracked for maintenance planning and cost optimization. More flexibility in retirement timing.';
      default:
        return '';
    }
  };

  const getRetirementTypeHelp = (type: string) => {
    switch (type) {
      case 'CYCLES_OR_TIME':
        return 'Part must be retired when EITHER cycle limit OR time limit is reached (whichever comes first).';
      case 'CYCLES_ONLY':
        return 'Part retirement is based solely on cycle count.';
      case 'TIME_ONLY':
        return 'Part retirement is based solely on calendar time since manufacture.';
      case 'CYCLES_AND_TIME':
        return 'Part must meet BOTH cycle AND time criteria before retirement (whichever comes last).';
      default:
        return '';
    }
  };

  const steps = [
    {
      title: 'Basic Setup',
      icon: <SafetyOutlined />,
    },
    {
      title: 'Life Limits',
      icon: <ClockCircleOutlined />,
    },
    {
      title: 'Alert Configuration',
      icon: <WarningOutlined />,
    },
    {
      title: 'Review & Save',
      icon: <CheckCircleOutlined />,
    },
  ];

  // ============================================================================
  // STEP COMPONENTS
  // ============================================================================

  const renderBasicSetup = () => (
    <Card title="Basic Configuration" style={{ marginBottom: 16 }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Form.Item
            name="partId"
            label="Part"
            rules={[{ required: true, message: 'Please select a part' }]}
          >
            <Select
              placeholder="Select part to configure"
              loading={loadingParts}
              showSearch
              disabled={isEditMode}
              filterOption={(input, option) =>
                (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
              }
            >
              {parts.map((part) => (
                <Option key={part.id} value={part.id}>
                  {part.partNumber} - {part.partName}
                  {part.isLifeLimited && <Tag color="orange" style={{ marginLeft: 8 }}>Already LLP</Tag>}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="isLifeLimited"
            label="Life-Limited Part"
            valuePropName="checked"
            extra="Enable life tracking and retirement management for this part"
          >
            <Switch />
          </Form.Item>
        </Col>
      </Row>

      {isLifeLimited && (
        <>
          <Divider />
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="criticalityLevel"
                label="Criticality Level"
                rules={[{ required: true, message: 'Please select criticality level' }]}
                extra={criticalityLevel ? getCriticalityHelp(criticalityLevel) : ''}
              >
                <Select placeholder="Select criticality level">
                  <Option value="SAFETY_CRITICAL">
                    <Space>
                      <ExclamationCircleOutlined style={{ color: 'red' }} />
                      Safety Critical
                    </Space>
                  </Option>
                  <Option value="MONITORED">
                    <Space>
                      <WarningOutlined style={{ color: 'orange' }} />
                      Monitored
                    </Space>
                  </Option>
                  <Option value="TRACKED">
                    <Space>
                      <InfoCircleOutlined style={{ color: 'blue' }} />
                      Tracked
                    </Space>
                  </Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="certificationRequired"
                label="Certification Required"
                valuePropName="checked"
                extra="Require certification documents for compliance tracking"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24}>
              <Form.Item
                name="regulatoryReference"
                label="Regulatory Reference"
                extra="Reference to applicable regulations (e.g., FAR 25.571, EASA CS-25)"
              >
                <Input placeholder="e.g., FAR 25.571(a)(3)" />
              </Form.Item>
            </Col>
          </Row>
        </>
      )}
    </Card>
  );

  const renderLifeLimits = () => (
    <Card title="Life Limits Configuration" style={{ marginBottom: 16 }}>
      <Alert
        message="Life Limit Configuration"
        description="Define the retirement criteria for this life-limited part. At least one limit (cycles or time) must be specified."
        type="info"
        icon={<InfoCircleOutlined />}
        style={{ marginBottom: 16 }}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Form.Item
            name="retirementType"
            label="Retirement Type"
            rules={[{ required: true, message: 'Please select retirement type' }]}
            extra={retirementType ? getRetirementTypeHelp(retirementType) : ''}
          >
            <Select placeholder="Select retirement criteria">
              <Option value="CYCLES_OR_TIME">Cycles OR Time (whichever first)</Option>
              <Option value="CYCLES_ONLY">Cycles Only</Option>
              <Option value="TIME_ONLY">Time Only</Option>
              <Option value="CYCLES_AND_TIME">Cycles AND Time (both required)</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Form.Item
            name="cycleLimit"
            label="Cycle Limit"
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const retType = getFieldValue('retirementType');
                  const timeLimit = getFieldValue('timeLimit');

                  if ((retType === 'CYCLES_ONLY' || retType === 'CYCLES_AND_TIME') && !value) {
                    return Promise.reject(new Error('Cycle limit is required for this retirement type'));
                  }
                  if (retType !== 'TIME_ONLY' && !value && !timeLimit) {
                    return Promise.reject(new Error('Either cycle limit or time limit must be specified'));
                  }
                  if (value && value <= 0) {
                    return Promise.reject(new Error('Cycle limit must be greater than 0'));
                  }
                  return Promise.resolve();
                },
              }),
            ]}
            extra="Maximum number of operational cycles before retirement"
          >
            <InputNumber
              placeholder="e.g., 15000"
              style={{ width: '100%' }}
              min={1}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="timeLimit"
            label="Time Limit (Years)"
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const retType = getFieldValue('retirementType');
                  const cycleLimit = getFieldValue('cycleLimit');

                  if ((retType === 'TIME_ONLY' || retType === 'CYCLES_AND_TIME') && !value) {
                    return Promise.reject(new Error('Time limit is required for this retirement type'));
                  }
                  if (retType !== 'CYCLES_ONLY' && !value && !cycleLimit) {
                    return Promise.reject(new Error('Either cycle limit or time limit must be specified'));
                  }
                  if (value && value <= 0) {
                    return Promise.reject(new Error('Time limit must be greater than 0'));
                  }
                  return Promise.resolve();
                },
              }),
            ]}
            extra="Maximum calendar time (years) before retirement"
          >
            <InputNumber
              placeholder="e.g., 10"
              style={{ width: '100%' }}
              min={0.1}
              step={0.1}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Form.Item
            name="inspectionInterval"
            label="Inspection Interval (Cycles)"
            extra="Cycles between mandatory inspections (optional)"
          >
            <InputNumber
              placeholder="e.g., 1000"
              style={{ width: '100%' }}
              min={1}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Form.Item
            name="notes"
            label="Configuration Notes"
            extra="Additional notes about this configuration"
          >
            <TextArea
              rows={3}
              placeholder="Enter any additional notes or special requirements..."
            />
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );

  const renderAlertConfiguration = () => (
    <Card title="Alert Thresholds" style={{ marginBottom: 16 }}>
      <Alert
        message="Alert Configuration"
        description="Set percentage thresholds for automated alerts. Alerts will be triggered when life usage reaches these levels."
        type="info"
        icon={<InfoCircleOutlined />}
        style={{ marginBottom: 16 }}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Form.Item
            name={['alertThresholds', 'info']}
            label="Info Alert Threshold (%)"
            rules={[{ required: true, message: 'Required' }]}
            extra="General information alert"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={1}
              max={100}
              defaultValue={80}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name={['alertThresholds', 'warning']}
            label="Warning Alert Threshold (%)"
            rules={[{ required: true, message: 'Required' }]}
            extra="Warning alert for planning"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={1}
              max={100}
              defaultValue={90}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Form.Item
            name={['alertThresholds', 'critical']}
            label="Critical Alert Threshold (%)"
            rules={[{ required: true, message: 'Required' }]}
            extra="Critical alert requiring action"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={1}
              max={100}
              defaultValue={95}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name={['alertThresholds', 'urgent']}
            label="Urgent Alert Threshold (%)"
            rules={[{ required: true, message: 'Required' }]}
            extra="Urgent alert for immediate action"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={1}
              max={100}
              defaultValue={98}
            />
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );

  const renderReview = () => {
    const values = form.getFieldsValue();

    return (
      <Card title="Configuration Review" style={{ marginBottom: 16 }}>
        <Alert
          message="Review Configuration"
          description="Please review all settings before saving. Once saved, changes to life limits may require additional approvals."
          type="warning"
          icon={<ExclamationCircleOutlined />}
          style={{ marginBottom: 16 }}
        />

        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card type="inner" title="Basic Settings">
              <p><strong>Life-Limited:</strong> {values.isLifeLimited ? 'Yes' : 'No'}</p>
              {values.isLifeLimited && (
                <>
                  <p><strong>Criticality Level:</strong> {values.criticalityLevel?.replace('_', ' ')}</p>
                  <p><strong>Certification Required:</strong> {values.certificationRequired ? 'Yes' : 'No'}</p>
                  <p><strong>Regulatory Reference:</strong> {values.regulatoryReference || 'Not specified'}</p>
                </>
              )}
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card type="inner" title="Life Limits">
              {values.isLifeLimited ? (
                <>
                  <p><strong>Retirement Type:</strong> {values.retirementType?.replace('_', ' ')}</p>
                  <p><strong>Cycle Limit:</strong> {values.cycleLimit ? values.cycleLimit.toLocaleString() : 'Not set'}</p>
                  <p><strong>Time Limit:</strong> {values.timeLimit ? `${values.timeLimit} years` : 'Not set'}</p>
                  <p><strong>Inspection Interval:</strong> {values.inspectionInterval ? `${values.inspectionInterval.toLocaleString()} cycles` : 'Not set'}</p>
                </>
              ) : (
                <p>Part is not configured as life-limited</p>
              )}
            </Card>
          </Col>
        </Row>

        {values.isLifeLimited && values.alertThresholds && (
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24}>
              <Card type="inner" title="Alert Thresholds">
                <Row gutter={[16, 8]}>
                  <Col span={6}>Info: {values.alertThresholds.info}%</Col>
                  <Col span={6}>Warning: {values.alertThresholds.warning}%</Col>
                  <Col span={6}>Critical: {values.alertThresholds.critical}%</Col>
                  <Col span={6}>Urgent: {values.alertThresholds.urgent}%</Col>
                </Row>
              </Card>
            </Col>
          </Row>
        )}

        {values.notes && (
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24}>
              <Card type="inner" title="Notes">
                <p>{values.notes}</p>
              </Card>
            </Col>
          </Row>
        )}
      </Card>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: return renderBasicSetup();
      case 1: return renderLifeLimits();
      case 2: return renderAlertConfiguration();
      case 3: return renderReview();
      default: return renderBasicSetup();
    }
  };

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
          <SafetyOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          {isEditMode ? 'Edit LLP Configuration' : 'Configure Life-Limited Part'}
        </Title>
        <Text type="secondary">
          Set up life tracking and retirement criteria for safety-critical components
        </Text>
      </div>

      {/* Steps */}
      <Card style={{ marginBottom: 24 }}>
        <Steps current={currentStep} items={steps} />
      </Card>

      {/* Form */}
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          isLifeLimited: false,
          certificationRequired: false,
          alertThresholds: {
            info: 80,
            warning: 90,
            critical: 95,
            urgent: 98
          }
        }}
      >
        {renderStepContent()}

        {/* Navigation */}
        <Card>
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
              <Space>
                {currentStep > 0 && (
                  <Button onClick={prevStep}>
                    Previous
                  </Button>
                )}
                {currentStep < steps.length - 1 ? (
                  <Button type="primary" onClick={nextStep}>
                    Next
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={saving}
                    icon={<SaveOutlined />}
                  >
                    {isEditMode ? 'Update Configuration' : 'Save Configuration'}
                  </Button>
                )}
              </Space>
            </Col>
          </Row>
        </Card>
      </Form>

      {/* Validation Modal */}
      <Modal
        title="Configuration Validation"
        open={showValidationModal}
        onCancel={() => setShowValidationModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowValidationModal(false)}>
            Go Back
          </Button>,
          <Button
            key="save"
            type="primary"
            danger
            onClick={() => {
              setShowValidationModal(false);
              form.submit();
            }}
          >
            Save Anyway
          </Button>
        ]}
      >
        <Alert
          message="Configuration Issues Found"
          description="The following issues were found with your configuration:"
          type="warning"
          style={{ marginBottom: 16 }}
        />
        <ul>
          {validationIssues.map((issue, index) => (
            <li key={index}>{issue}</li>
          ))}
        </ul>
        <Text type="secondary">
          You can save the configuration anyway, but these issues should be addressed
          to ensure proper LLP tracking and compliance.
        </Text>
      </Modal>
    </div>
  );
};

export default LLPConfigurationForm;