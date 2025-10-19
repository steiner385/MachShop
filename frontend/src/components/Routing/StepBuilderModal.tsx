/**
 * Step Builder Modal Component
 * Sprint 4 Enhancements
 *
 * Modal for creating and editing routing steps
 */

import React, { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Switch,
  Row,
  Col,
  Divider,
  Typography,
  Space,
  Alert,
  Spin,
} from 'antd';
import {
  NodeIndexOutlined,
  ClockCircleOutlined,
  ToolOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { RoutingStep, CreateRoutingStepRequest } from '@/types/routing';

const { Option } = Select;
const { TextArea } = Input;
const { Text, Title } = Typography;

interface StepBuilderModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  routingId: string;
  step?: RoutingStep;
  existingSteps: RoutingStep[];
  onSave: (stepData: CreateRoutingStepRequest) => Promise<void>;
  onCancel: () => void;
}

/**
 * Step Builder Modal
 *
 * Comprehensive modal for creating and editing routing steps with all fields
 */
export const StepBuilderModal: React.FC<StepBuilderModalProps> = ({
  visible,
  mode,
  routingId,
  step,
  existingSteps,
  onSave,
  onCancel,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [processSegments, setProcessSegments] = useState<any[]>([]);
  const [workCenters, setWorkCenters] = useState<any[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(false);

  // Load process segments and work centers
  useEffect(() => {
    if (visible) {
      loadOptions();
    }
  }, [visible]);

  // Populate form when editing
  useEffect(() => {
    if (mode === 'edit' && step) {
      form.setFieldsValue({
        stepNumber: step.stepNumber,
        processSegmentId: step.processSegmentId,
        workCenterId: step.workCenterId,
        setupTimeOverride: step.setupTimeOverride,
        cycleTimeOverride: step.cycleTimeOverride,
        teardownTimeOverride: step.teardownTimeOverride,
        isOptional: step.isOptional,
        isQualityInspection: step.isQualityInspection,
        isCriticalPath: step.isCriticalPath,
        stepInstructions: step.stepInstructions,
        notes: step.notes,
      });
      if (step.processSegment) {
        setSelectedSegment(step.processSegment);
      }
    } else if (mode === 'create') {
      // Set default step number
      const nextStepNumber = existingSteps.length > 0
        ? Math.max(...existingSteps.map(s => s.stepNumber)) + 10
        : 10;
      form.setFieldValue('stepNumber', nextStepNumber);
      form.setFieldValue('isCriticalPath', false);
      form.setFieldValue('isOptional', false);
      form.setFieldValue('isQualityInspection', false);
    }
  }, [mode, step, existingSteps, visible, form]);

  const loadOptions = async () => {
    setLoadingData(true);
    try {
      // TODO: Load from actual APIs
      // For now, use mock data
      setProcessSegments([
        {
          id: 'ps-1',
          segmentName: 'Machining - Mill',
          operationType: 'MACHINING',
          setupTime: 300,
          duration: 600,
          teardownTime: 120,
        },
        {
          id: 'ps-2',
          segmentName: 'Machining - Lathe',
          operationType: 'MACHINING',
          setupTime: 240,
          duration: 480,
          teardownTime: 90,
        },
        {
          id: 'ps-3',
          segmentName: 'Quality Inspection',
          operationType: 'INSPECTION',
          setupTime: 60,
          duration: 300,
          teardownTime: 30,
        },
      ]);

      setWorkCenters([
        { id: 'wc-1', name: 'Mill-01', workCenterCode: 'MILL01' },
        { id: 'wc-2', name: 'Mill-02', workCenterCode: 'MILL02' },
        { id: 'wc-3', name: 'Lathe-01', workCenterCode: 'LATHE01' },
        { id: 'wc-4', name: 'QC-Station-01', workCenterCode: 'QC01' },
      ]);
    } catch (error) {
      console.error('Failed to load options:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleProcessSegmentChange = (value: string) => {
    const segment = processSegments.find(ps => ps.id === value);
    setSelectedSegment(segment);

    // Auto-populate timing fields if not overridden
    if (segment && mode === 'create') {
      form.setFieldValue('setupTimeOverride', segment.setupTime);
      form.setFieldValue('cycleTimeOverride', segment.duration);
      form.setFieldValue('teardownTimeOverride', segment.teardownTime);
    }

    // Auto-set quality inspection flag
    if (segment?.operationType === 'INSPECTION') {
      form.setFieldValue('isQualityInspection', true);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const stepData: CreateRoutingStepRequest = {
        routingId,
        stepNumber: values.stepNumber,
        processSegmentId: values.processSegmentId,
        workCenterId: values.workCenterId || undefined,
        setupTimeOverride: values.setupTimeOverride || undefined,
        cycleTimeOverride: values.cycleTimeOverride || undefined,
        teardownTimeOverride: values.teardownTimeOverride || undefined,
        isOptional: values.isOptional || false,
        isQualityInspection: values.isQualityInspection || false,
        isCriticalPath: values.isCriticalPath || false,
        stepInstructions: values.stepInstructions || undefined,
        notes: values.notes || undefined,
      };

      await onSave(stepData);
      form.resetFields();
      setSelectedSegment(null);
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSelectedSegment(null);
    onCancel();
  };

  // Format seconds to readable time
  const formatTime = (seconds?: number): string => {
    if (!seconds) return 'Not set';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  };

  return (
    <Modal
      title={
        <Space>
          <NodeIndexOutlined />
          {mode === 'create' ? 'Add Routing Step' : 'Edit Routing Step'}
        </Space>
      }
      open={visible}
      onOk={handleSave}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={800}
      okText={mode === 'create' ? 'Add Step' : 'Update Step'}
      cancelText="Cancel"
    >
      {loadingData ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>Loading options...</div>
        </div>
      ) : (
        <Form
          form={form}
          layout="vertical"
          requiredMark="optional"
        >
          {/* Step Number and Process Segment */}
          <Title level={5}>Basic Information</Title>
          <Divider style={{ marginTop: '8px', marginBottom: '16px' }} />

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="stepNumber"
                label="Step Number"
                rules={[{ required: true, message: 'Step number is required' }]}
                tooltip="Sequence number for this step (typically increments of 10)"
              >
                <InputNumber
                  min={1}
                  step={10}
                  style={{ width: '100%' }}
                  prefix={<NodeIndexOutlined />}
                />
              </Form.Item>
            </Col>

            <Col span={16}>
              <Form.Item
                name="processSegmentId"
                label="Process Segment"
                rules={[{ required: true, message: 'Process segment is required' }]}
                tooltip="Select the manufacturing operation for this step"
              >
                <Select
                  showSearch
                  placeholder="Select process segment"
                  optionFilterProp="children"
                  onChange={handleProcessSegmentChange}
                >
                  {processSegments.map(ps => (
                    <Option key={ps.id} value={ps.id}>
                      <Space>
                        <span style={{ fontWeight: 500 }}>{ps.segmentName}</span>
                        <span style={{ color: '#999' }}>({ps.operationType})</span>
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Selected Segment Info */}
          {selectedSegment && (
            <Alert
              message="Process Segment Defaults"
              description={
                <Space direction="vertical" size="small">
                  <Text>
                    <strong>Operation Type:</strong> {selectedSegment.operationType}
                  </Text>
                  <Text>
                    <strong>Standard Times:</strong> Setup {formatTime(selectedSegment.setupTime)} |
                    Cycle {formatTime(selectedSegment.duration)} |
                    Teardown {formatTime(selectedSegment.teardownTime)}
                  </Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    You can override these times below if needed for this specific routing.
                  </Text>
                </Space>
              }
              type="info"
              showIcon
              icon={<InfoCircleOutlined />}
              style={{ marginBottom: '16px' }}
            />
          )}

          {/* Work Center */}
          <Form.Item
            name="workCenterId"
            label="Work Center (Optional)"
            tooltip="Assign this step to a specific work center"
          >
            <Select
              showSearch
              placeholder="Select work center"
              allowClear
              optionFilterProp="children"
            >
              {workCenters.map(wc => (
                <Option key={wc.id} value={wc.id}>
                  <Space>
                    <ToolOutlined />
                    <span>{wc.name}</span>
                    <span style={{ color: '#999' }}>({wc.workCenterCode})</span>
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* Timing Overrides */}
          <Title level={5} style={{ marginTop: '24px' }}>Timing Overrides</Title>
          <Divider style={{ marginTop: '8px', marginBottom: '16px' }} />

          <Alert
            message="Override Standard Times"
            description="Leave blank to use the process segment's standard times. Enter values only if this step requires different timing."
            type="info"
            showIcon
            style={{ marginBottom: '16px' }}
          />

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="setupTimeOverride"
                label="Setup Time (seconds)"
                tooltip="Time required to set up equipment for this step"
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  placeholder={selectedSegment?.setupTime || 'Standard'}
                  prefix={<ClockCircleOutlined />}
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                name="cycleTimeOverride"
                label="Cycle Time (seconds)"
                tooltip="Time to complete one cycle of this operation"
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  placeholder={selectedSegment?.duration || 'Standard'}
                  prefix={<ClockCircleOutlined />}
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                name="teardownTimeOverride"
                label="Teardown Time (seconds)"
                tooltip="Time required to clean up after this step"
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  placeholder={selectedSegment?.teardownTime || 'Standard'}
                  prefix={<ClockCircleOutlined />}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Step Flags */}
          <Title level={5} style={{ marginTop: '24px' }}>Step Properties</Title>
          <Divider style={{ marginTop: '8px', marginBottom: '16px' }} />

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="isOptional"
                label="Optional Step"
                valuePropName="checked"
                tooltip="Can this step be skipped in certain circumstances?"
              >
                <Switch />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                name="isQualityInspection"
                label="Quality Inspection"
                valuePropName="checked"
                tooltip="Is this a quality control inspection step?"
              >
                <Switch />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                name="isCriticalPath"
                label="Critical Path"
                valuePropName="checked"
                tooltip="Is this step on the critical path for routing completion?"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          {/* Instructions and Notes */}
          <Title level={5} style={{ marginTop: '24px' }}>Instructions & Notes</Title>
          <Divider style={{ marginTop: '8px', marginBottom: '16px' }} />

          <Form.Item
            name="stepInstructions"
            label="Step Instructions"
            tooltip="Detailed instructions for performing this step"
          >
            <TextArea
              rows={3}
              placeholder="Enter detailed instructions for this step"
              maxLength={1000}
              showCount
            />
          </Form.Item>

          <Form.Item
            name="notes"
            label="Notes"
            tooltip="Any additional notes or comments about this step"
          >
            <TextArea
              rows={2}
              placeholder="Enter any additional notes"
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
};

export default StepBuilderModal;
