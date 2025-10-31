/**
 * Time Entry Edit Component
 * Allows operators to edit their own time entries with validation and approval workflow
 *
 * GitHub Issue #51: Time Entry Management & Approvals System
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Alert,
  Space,
  Card,
  Descriptions,
  Tag,
  Typography,
  Radio,
  Divider,
  Tooltip,
  message,
  Spin,
} from 'antd';
import {
  EditOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import duration from 'dayjs/plugin/duration';
import styled from 'styled-components';
import TimeTypeIndicator from './TimeTypeIndicator';

dayjs.extend(duration);

const { TextArea } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

// Styled Components
const EditContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

const TimeEntryCard = styled(Card)`
  margin-bottom: 16px;

  .ant-card-head {
    background: #fafafa;
  }
`;

const ValidationAlert = styled(Alert)`
  margin-bottom: 16px;
`;

const ApprovalIndicator = styled.div<{ status: string }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background-color: ${props => {
    switch (props.status) {
      case 'AUTO_APPROVED': return '#f6ffed';
      case 'PENDING': return '#fff7e6';
      case 'APPROVED': return '#f6ffed';
      case 'REJECTED': return '#fff2f0';
      default: return '#fafafa';
    }
  }};
  color: ${props => {
    switch (props.status) {
      case 'AUTO_APPROVED': return '#52c41a';
      case 'PENDING': return '#faad14';
      case 'APPROVED': return '#52c41a';
      case 'REJECTED': return '#f5222d';
      default: return '#666';
    }
  }};
  border: 1px solid ${props => {
    switch (props.status) {
      case 'AUTO_APPROVED': return '#b7eb8f';
      case 'PENDING': return '#ffd666';
      case 'APPROVED': return '#b7eb8f';
      case 'REJECTED': return '#ffccc7';
      default: return '#d9d9d9';
    }
  }};
`;

// Types
export interface TimeEntry {
  id: string;
  userId: string;
  workOrderId?: string;
  operationId?: string;
  indirectCodeId?: string;
  timeType: 'DIRECT_LABOR' | 'INDIRECT';
  clockInTime: string;
  clockOutTime?: string;
  duration?: number;
  laborRate?: number;
  laborCost?: number;
  status: 'ACTIVE' | 'COMPLETED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  entrySource: string;
  editReason?: string;
  editedAt?: string;
  editedBy?: string;
  workOrder?: {
    id: string;
    workOrderNumber: string;
    productId: string;
  };
  operation?: {
    id: string;
    operationNumber: string;
    description: string;
  };
  indirectCode?: {
    id: string;
    code: string;
    description: string;
    category: string;
    displayColor: string;
  };
}

export interface EditValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  businessRuleViolations: string[];
  autoApprovalEvaluation: {
    shouldAutoApprove: boolean;
    reason: string;
    riskScore: number;
    appliedRules: string[];
  };
}

export interface WorkOrder {
  id: string;
  workOrderNumber: string;
  productId: string;
  description?: string;
  status: string;
}

export interface Operation {
  id: string;
  operationNumber: string;
  description: string;
  workOrderId: string;
}

export interface IndirectCode {
  id: string;
  code: string;
  description: string;
  category: string;
  displayColor: string;
  isActive: boolean;
}

interface TimeEntryEditProps {
  timeEntry: TimeEntry;
  visible: boolean;
  onCancel: () => void;
  onSuccess: (edit: any) => void;
  workOrders?: WorkOrder[];
  operations?: Operation[];
  indirectCodes?: IndirectCode[];
}

const EDIT_REASON_CATEGORIES = [
  { value: 'TIME_CORRECTION', label: 'Time Correction', description: 'Fix incorrect clock in/out times' },
  { value: 'WORK_ORDER_CORRECTION', label: 'Work Order Correction', description: 'Change work order assignment' },
  { value: 'RATE_ADJUSTMENT', label: 'Rate Adjustment', description: 'Labor rate correction' },
  { value: 'ADMINISTRATIVE', label: 'Administrative', description: 'Administrative changes' },
  { value: 'ERROR_CORRECTION', label: 'Error Correction', description: 'Fix data entry errors' },
  { value: 'OTHER', label: 'Other', description: 'Other reasons not listed above' },
];

const TimeEntryEdit: React.FC<TimeEntryEditProps> = ({
  timeEntry,
  visible,
  onCancel,
  onSuccess,
  workOrders = [],
  operations = [],
  indirectCodes = [],
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [validation, setValidation] = useState<EditValidation | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [changedFields, setChangedFields] = useState<string[]>([]);

  // Form state
  const [editType, setEditType] = useState<'time' | 'assignment' | 'rate'>('time');
  const [originalValues, setOriginalValues] = useState<any>({});
  const [newValues, setNewValues] = useState<any>({});

  useEffect(() => {
    if (visible && timeEntry) {
      // Initialize form with current values
      const initValues = {
        clockInTime: dayjs(timeEntry.clockInTime),
        clockOutTime: timeEntry.clockOutTime ? dayjs(timeEntry.clockOutTime) : null,
        workOrderId: timeEntry.workOrderId,
        operationId: timeEntry.operationId,
        indirectCodeId: timeEntry.indirectCodeId,
        laborRate: timeEntry.laborRate,
        reason: '',
        reasonCategory: 'TIME_CORRECTION',
      };

      form.setFieldsValue(initValues);
      setOriginalValues(extractOriginalValues(timeEntry));
      setChangedFields([]);
      setValidation(null);
      setPreviewMode(false);
    }
  }, [visible, timeEntry, form]);

  const extractOriginalValues = (entry: TimeEntry) => ({
    clockInTime: entry.clockInTime,
    clockOutTime: entry.clockOutTime,
    workOrderId: entry.workOrderId,
    operationId: entry.operationId,
    indirectCodeId: entry.indirectCodeId,
    laborRate: entry.laborRate,
    duration: entry.duration,
    laborCost: entry.laborCost,
  });

  const handleFormChange = () => {
    const formValues = form.getFieldsValue();
    const changed: string[] = [];
    const newVals: any = {};

    // Check for changes
    if (formValues.clockInTime && !dayjs(originalValues.clockInTime).isSame(formValues.clockInTime)) {
      changed.push('clockInTime');
      newVals.clockInTime = formValues.clockInTime.toISOString();
    }

    if (formValues.clockOutTime && originalValues.clockOutTime &&
        !dayjs(originalValues.clockOutTime).isSame(formValues.clockOutTime)) {
      changed.push('clockOutTime');
      newVals.clockOutTime = formValues.clockOutTime.toISOString();
    }

    if (formValues.workOrderId !== originalValues.workOrderId) {
      changed.push('workOrderId');
      newVals.workOrderId = formValues.workOrderId;
    }

    if (formValues.operationId !== originalValues.operationId) {
      changed.push('operationId');
      newVals.operationId = formValues.operationId;
    }

    if (formValues.indirectCodeId !== originalValues.indirectCodeId) {
      changed.push('indirectCodeId');
      newVals.indirectCodeId = formValues.indirectCodeId;
    }

    if (formValues.laborRate !== originalValues.laborRate) {
      changed.push('laborRate');
      newVals.laborRate = formValues.laborRate;
    }

    setChangedFields(changed);
    setNewValues(newVals);
  };

  const validateEdit = async () => {
    if (changedFields.length === 0) {
      message.warning('No changes detected');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/v1/time-entry-management/edits/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          timeEntryId: timeEntry.id,
          timeEntryType: 'LABOR',
          editType: 'MODIFIED',
          originalValues,
          newValues,
          changedFields,
          reason: form.getFieldValue('reason'),
          reasonCategory: form.getFieldValue('reasonCategory'),
        }),
      });

      const result = await response.json();
      if (result.success) {
        setValidation(result.data);
        setPreviewMode(true);
      } else {
        message.error(result.error || 'Validation failed');
      }
    } catch (error) {
      console.error('Validation error:', error);
      message.error('Failed to validate edit');
    } finally {
      setLoading(false);
    }
  };

  const submitEdit = async () => {
    if (!validation) {
      message.error('Please validate edit first');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/v1/time-entry-management/edits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          timeEntryId: timeEntry.id,
          timeEntryType: 'LABOR',
          editType: 'MODIFIED',
          originalValues,
          newValues,
          changedFields,
          reason: form.getFieldValue('reason'),
          reasonCategory: form.getFieldValue('reasonCategory'),
        }),
      });

      const result = await response.json();
      if (result.success) {
        message.success(
          validation.autoApprovalEvaluation.shouldAutoApprove
            ? 'Edit submitted and auto-approved'
            : 'Edit submitted for approval'
        );
        onSuccess(result.data);
      } else {
        message.error(result.error || 'Failed to submit edit');
      }
    } catch (error) {
      console.error('Submit error:', error);
      message.error('Failed to submit edit');
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = (clockIn?: Dayjs, clockOut?: Dayjs): string => {
    if (!clockIn || !clockOut) return 'N/A';
    const diff = dayjs.duration(clockOut.diff(clockIn));
    return `${Math.floor(diff.asHours())}h ${diff.minutes()}m`;
  };

  const renderValidationResults = () => {
    if (!validation) return null;

    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        {validation.errors.length > 0 && (
          <ValidationAlert
            type="error"
            message="Validation Errors"
            description={
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {validation.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            }
          />
        )}

        {validation.warnings.length > 0 && (
          <ValidationAlert
            type="warning"
            message="Warnings"
            description={
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {validation.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            }
          />
        )}

        {validation.businessRuleViolations.length > 0 && (
          <ValidationAlert
            type="info"
            message="Business Rule Violations"
            description={
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {validation.businessRuleViolations.map((violation, index) => (
                  <li key={index}>{violation}</li>
                ))}
              </ul>
            }
          />
        )}

        <Card size="small" title="Approval Assessment">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong>Approval Status:</Text>
              <ApprovalIndicator
                status={validation.autoApprovalEvaluation.shouldAutoApprove ? 'AUTO_APPROVED' : 'PENDING'}
              >
                {validation.autoApprovalEvaluation.shouldAutoApprove ? (
                  <>
                    <CheckCircleOutlined style={{ marginRight: 4 }} />
                    Auto-Approved
                  </>
                ) : (
                  <>
                    <ClockCircleOutlined style={{ marginRight: 4 }} />
                    Requires Approval
                  </>
                )}
              </ApprovalIndicator>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text strong>Risk Score:</Text>
              <Text>
                {validation.autoApprovalEvaluation.riskScore}/100
                <Tooltip title="Lower scores indicate lower risk and higher likelihood of auto-approval">
                  <InfoCircleOutlined style={{ marginLeft: 4, color: '#999' }} />
                </Tooltip>
              </Text>
            </div>

            <div>
              <Text strong>Reason:</Text>
              <Text style={{ marginLeft: 8 }}>{validation.autoApprovalEvaluation.reason}</Text>
            </div>

            {validation.autoApprovalEvaluation.appliedRules.length > 0 && (
              <div>
                <Text strong>Applied Rules:</Text>
                <div style={{ marginTop: 4 }}>
                  {validation.autoApprovalEvaluation.appliedRules.map((rule, index) => (
                    <Tag key={index} size="small" style={{ marginBottom: 4 }}>
                      {rule}
                    </Tag>
                  ))}
                </div>
              </div>
            )}
          </Space>
        </Card>
      </Space>
    );
  };

  const renderPreview = () => {
    if (!previewMode) return null;

    const formValues = form.getFieldsValue();

    return (
      <Card title="Edit Preview" size="small">
        <Descriptions column={2} size="small">
          {changedFields.includes('clockInTime') && (
            <>
              <Descriptions.Item label="Original Clock In">
                {dayjs(originalValues.clockInTime).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="New Clock In">
                <Text type="warning">
                  {formValues.clockInTime.format('YYYY-MM-DD HH:mm:ss')}
                </Text>
              </Descriptions.Item>
            </>
          )}

          {changedFields.includes('clockOutTime') && (
            <>
              <Descriptions.Item label="Original Clock Out">
                {originalValues.clockOutTime ? dayjs(originalValues.clockOutTime).format('YYYY-MM-DD HH:mm:ss') : 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="New Clock Out">
                <Text type="warning">
                  {formValues.clockOutTime ? formValues.clockOutTime.format('YYYY-MM-DD HH:mm:ss') : 'N/A'}
                </Text>
              </Descriptions.Item>
            </>
          )}

          {(changedFields.includes('clockInTime') || changedFields.includes('clockOutTime')) && (
            <>
              <Descriptions.Item label="Original Duration">
                {calculateDuration(
                  dayjs(originalValues.clockInTime),
                  originalValues.clockOutTime ? dayjs(originalValues.clockOutTime) : undefined
                )}
              </Descriptions.Item>
              <Descriptions.Item label="New Duration">
                <Text type="warning">
                  {calculateDuration(formValues.clockInTime, formValues.clockOutTime)}
                </Text>
              </Descriptions.Item>
            </>
          )}

          {changedFields.includes('workOrderId') && (
            <>
              <Descriptions.Item label="Original Work Order">
                {timeEntry.workOrder?.workOrderNumber || 'None'}
              </Descriptions.Item>
              <Descriptions.Item label="New Work Order">
                <Text type="warning">
                  {workOrders.find(wo => wo.id === formValues.workOrderId)?.workOrderNumber || 'None'}
                </Text>
              </Descriptions.Item>
            </>
          )}

          {changedFields.includes('laborRate') && (
            <>
              <Descriptions.Item label="Original Labor Rate">
                ${originalValues.laborRate?.toFixed(2) || '0.00'}/hr
              </Descriptions.Item>
              <Descriptions.Item label="New Labor Rate">
                <Text type="warning">
                  ${formValues.laborRate?.toFixed(2) || '0.00'}/hr
                </Text>
              </Descriptions.Item>
            </>
          )}
        </Descriptions>
      </Card>
    );
  };

  const filteredOperations = operations.filter(op =>
    !form.getFieldValue('workOrderId') || op.workOrderId === form.getFieldValue('workOrderId')
  );

  return (
    <Modal
      title={
        <Space>
          <EditOutlined />
          Edit Time Entry
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={800}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        !previewMode ? (
          <Button
            key="preview"
            type="primary"
            onClick={validateEdit}
            loading={loading}
            disabled={changedFields.length === 0}
          >
            Preview Changes
          </Button>
        ) : (
          <Space key="submit">
            <Button onClick={() => setPreviewMode(false)}>
              Back to Edit
            </Button>
            <Button
              type="primary"
              onClick={submitEdit}
              loading={loading}
              disabled={!validation?.isValid}
            >
              Submit Edit
            </Button>
          </Space>
        ),
      ]}
    >
      <EditContainer>
        <Spin spinning={loading}>
          {/* Original Time Entry Info */}
          <TimeEntryCard
            size="small"
            title={
              <Space>
                <ClockCircleOutlined />
                Current Time Entry
                <TimeTypeIndicator
                  timeType={timeEntry.timeType}
                  indirectCategory={timeEntry.indirectCode?.category as any}
                  status={timeEntry.status as any}
                  variant="compact"
                />
              </Space>
            }
          >
            <Descriptions column={2} size="small">
              <Descriptions.Item label="Clock In">
                {dayjs(timeEntry.clockInTime).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="Clock Out">
                {timeEntry.clockOutTime
                  ? dayjs(timeEntry.clockOutTime).format('YYYY-MM-DD HH:mm:ss')
                  : <Tag color="green">Active</Tag>
                }
              </Descriptions.Item>
              <Descriptions.Item label="Duration">
                {timeEntry.duration ? `${timeEntry.duration.toFixed(2)} hours` : 'In Progress'}
              </Descriptions.Item>
              <Descriptions.Item label="Assignment">
                {timeEntry.workOrder?.workOrderNumber || timeEntry.indirectCode?.description || 'Unassigned'}
              </Descriptions.Item>
            </Descriptions>
          </TimeEntryCard>

          {!previewMode ? (
            <>
              {/* Edit Type Selection */}
              <Card size="small" title="Edit Type" style={{ marginBottom: 16 }}>
                <Radio.Group
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Radio value="time">
                      <Space>
                        <ClockCircleOutlined />
                        Time Correction
                        <Text type="secondary">(Clock in/out times)</Text>
                      </Space>
                    </Radio>
                    <Radio value="assignment">
                      <Space>
                        <EditOutlined />
                        Work Assignment
                        <Text type="secondary">(Work order, operation, indirect code)</Text>
                      </Space>
                    </Radio>
                    <Radio value="rate">
                      <Space>
                        <WarningOutlined />
                        Rate Adjustment
                        <Text type="secondary">(Labor rate correction)</Text>
                      </Space>
                    </Radio>
                  </Space>
                </Radio.Group>
              </Card>

              {/* Edit Form */}
              <Form
                form={form}
                layout="vertical"
                onValuesChange={handleFormChange}
              >
                {editType === 'time' && (
                  <Card size="small" title="Time Adjustments" style={{ marginBottom: 16 }}>
                    <Form.Item
                      label="Clock In Time"
                      name="clockInTime"
                      rules={[{ required: true, message: 'Clock in time is required' }]}
                    >
                      <DatePicker
                        showTime
                        format="YYYY-MM-DD HH:mm:ss"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>

                    {timeEntry.clockOutTime && (
                      <Form.Item
                        label="Clock Out Time"
                        name="clockOutTime"
                      >
                        <DatePicker
                          showTime
                          format="YYYY-MM-DD HH:mm:ss"
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    )}
                  </Card>
                )}

                {editType === 'assignment' && (
                  <Card size="small" title="Work Assignment" style={{ marginBottom: 16 }}>
                    <Form.Item label="Work Order" name="workOrderId">
                      <Select
                        placeholder="Select work order"
                        allowClear
                        showSearch
                        optionFilterProp="children"
                      >
                        {workOrders.map(wo => (
                          <Option key={wo.id} value={wo.id}>
                            {wo.workOrderNumber} - {wo.description}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>

                    <Form.Item label="Operation" name="operationId">
                      <Select
                        placeholder="Select operation"
                        allowClear
                        disabled={!form.getFieldValue('workOrderId')}
                      >
                        {filteredOperations.map(op => (
                          <Option key={op.id} value={op.id}>
                            {op.operationNumber} - {op.description}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>

                    <Form.Item label="Indirect Code" name="indirectCodeId">
                      <Select
                        placeholder="Select indirect code"
                        allowClear
                        disabled={!!form.getFieldValue('workOrderId')}
                      >
                        {indirectCodes.filter(ic => ic.isActive).map(ic => (
                          <Option key={ic.id} value={ic.id}>
                            <Space>
                              <div
                                style={{
                                  width: 12,
                                  height: 12,
                                  backgroundColor: ic.displayColor,
                                  borderRadius: 2,
                                }}
                              />
                              {ic.code} - {ic.description}
                            </Space>
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Card>
                )}

                {editType === 'rate' && (
                  <Card size="small" title="Rate Adjustment" style={{ marginBottom: 16 }}>
                    <Form.Item
                      label="Labor Rate ($/hour)"
                      name="laborRate"
                      rules={[
                        { required: true, message: 'Labor rate is required' },
                        { type: 'number', min: 0, message: 'Rate must be positive' },
                      ]}
                    >
                      <Input type="number" step="0.01" prefix="$" suffix="/hr" />
                    </Form.Item>
                  </Card>
                )}

                {/* Reason Section */}
                <Card size="small" title="Edit Reason" style={{ marginBottom: 16 }}>
                  <Form.Item
                    label="Reason Category"
                    name="reasonCategory"
                    rules={[{ required: true, message: 'Please select a reason category' }]}
                  >
                    <Select placeholder="Select reason category">
                      {EDIT_REASON_CATEGORIES.map(category => (
                        <Option key={category.value} value={category.value}>
                          <div>
                            <div>{category.label}</div>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              {category.description}
                            </Text>
                          </div>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item
                    label="Detailed Reason"
                    name="reason"
                    rules={[
                      { required: true, message: 'Please provide a detailed reason' },
                      { min: 10, message: 'Reason must be at least 10 characters' },
                    ]}
                  >
                    <TextArea
                      rows={3}
                      placeholder="Explain why this edit is necessary..."
                      maxLength={500}
                      showCount
                    />
                  </Form.Item>
                </Card>

                {changedFields.length > 0 && (
                  <Alert
                    type="info"
                    message={`${changedFields.length} field(s) will be changed`}
                    description={`Changed fields: ${changedFields.join(', ')}`}
                    style={{ marginBottom: 16 }}
                  />
                )}
              </Form>
            </>
          ) : (
            <>
              {renderPreview()}
              <Divider />
              {renderValidationResults()}
            </>
          )}
        </Spin>
      </EditContainer>
    </Modal>
  );
};

export default TimeEntryEdit;