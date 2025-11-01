/**
 * Traveler Review Form Component
 * Issue #36: Paper-Based Traveler Digitization - Phase 6
 *
 * Detailed review form for approving/rejecting travelers with field corrections
 */

import React, { useState, useCallback } from 'react';
import {
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Modal,
  Button,
  Space,
  Card,
  Row,
  Col,
  message,
  Divider,
  Table,
  Tag,
  Tooltip,
  Alert,
  Empty
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  SaveOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { FormInstance } from 'antd';
import './TravelerReviewForm.css';

interface Correction {
  fieldName: string;
  oldValue: any;
  newValue: any;
}

interface TravelerReviewData {
  travelerId: string;
  approved: boolean;
  reviewerNotes?: string;
  corrections?: Correction[];
}

interface TravelerInfoProps {
  travelerId: string;
  workOrderNumber: string;
  partNumber: string;
  partDescription?: string;
  quantity: number;
  dueDate?: string;
  priority?: string;
  confidence: number;
  sourceFileName?: string;
  templateName?: string;
  templateConfidence?: number;
  warnings?: string[];
  operationCount?: number;
}

interface TravelerReviewFormProps {
  travelerInfo: TravelerInfoProps;
  onApprove: (data: TravelerReviewData) => Promise<void>;
  onReject: (data: TravelerReviewData) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

/**
 * Traveler Review Form Component
 */
const TravelerReviewForm: React.FC<TravelerReviewFormProps> = ({
  travelerInfo,
  onApprove,
  onReject,
  onCancel,
  loading = false
}) => {
  const [form] = Form.useForm();
  const [editable, setEditable] = useState(false);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  /**
   * Handle approve
   */
  const handleApprove = useCallback(async () => {
    try {
      setSubmitting(true);
      const reviewData: TravelerReviewData = {
        travelerId: travelerInfo.travelerId,
        approved: true,
        reviewerNotes: form.getFieldValue('reviewerNotes'),
        corrections: corrections.length > 0 ? corrections : undefined
      };
      await onApprove(reviewData);
      message.success('Traveler approved');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      message.error(`Failed to approve: ${errorMsg}`);
    } finally {
      setSubmitting(false);
    }
  }, [travelerInfo.travelerId, form, corrections, onApprove]);

  /**
   * Handle reject
   */
  const handleReject = useCallback(async () => {
    Modal.confirm({
      title: 'Reject Traveler',
      content: 'Are you sure you want to reject this traveler?',
      okText: 'Reject',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          setSubmitting(true);
          const reviewData: TravelerReviewData = {
            travelerId: travelerInfo.travelerId,
            approved: false,
            reviewerNotes: form.getFieldValue('reviewerNotes') || 'Rejected - No reason provided'
          };
          await onReject(reviewData);
          message.success('Traveler rejected');
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          message.error(`Failed to reject: ${errorMsg}`);
        } finally {
          setSubmitting(false);
        }
      }
    });
  }, [travelerInfo, form, onReject]);

  /**
   * Start editing field
   */
  const handleEditField = useCallback((fieldName: string, currentValue: any) => {
    setEditingField(fieldName);
    setEditingValue(currentValue);
  }, []);

  /**
   * Save field correction
   */
  const handleSaveCorrection = useCallback((fieldName: string, newValue: any) => {
    const oldValue = (travelerInfo as any)[fieldName];

    if (oldValue === newValue) {
      setEditingField(null);
      return;
    }

    const existingIndex = corrections.findIndex(c => c.fieldName === fieldName);

    if (existingIndex >= 0) {
      const updated = [...corrections];
      updated[existingIndex] = { fieldName, oldValue, newValue };
      setCorrections(updated);
    } else {
      setCorrections([...corrections, { fieldName, oldValue, newValue }]);
    }

    setEditingField(null);
    message.success(`${fieldName} correction saved`);
  }, [travelerInfo, corrections]);

  /**
   * Cancel field edit
   */
  const handleCancelEdit = useCallback(() => {
    setEditingField(null);
    setEditingValue(null);
  }, []);

  /**
   * Get field display value
   */
  const getFieldValue = (fieldName: string): any => {
    const correction = corrections.find(c => c.fieldName === fieldName);
    return correction ? correction.newValue : (travelerInfo as any)[fieldName];
  };

  /**
   * Corrections table columns
   */
  const correctionsColumns = [
    {
      title: 'Field',
      dataIndex: 'fieldName',
      key: 'fieldName',
      width: 150,
      render: (text: string) => <strong>{text}</strong>
    },
    {
      title: 'Original Value',
      dataIndex: 'oldValue',
      key: 'oldValue',
      render: (value: any) => (
        <span style={{ color: '#595959' }}>
          {typeof value === 'string' ? value : JSON.stringify(value)}
        </span>
      )
    },
    {
      title: 'Corrected Value',
      dataIndex: 'newValue',
      key: 'newValue',
      render: (value: any) => (
        <strong style={{ color: '#52c41a' }}>
          {typeof value === 'string' ? value : JSON.stringify(value)}
        </strong>
      )
    }
  ];

  const confidenceColor = travelerInfo.confidence > 0.8 ? 'success' :
                         travelerInfo.confidence > 0.6 ? 'warning' : 'error';

  return (
    <Card className="traveler-review-form-card">
      {/* Header */}
      <div className="review-header">
        <h2>{travelerInfo.workOrderNumber}</h2>
        <Space>
          <Tag color={confidenceColor}>
            Confidence: {Math.round(travelerInfo.confidence * 100)}%
          </Tag>
          {travelerInfo.sourceFileName && (
            <Tag icon={<FileTextOutlined />}>
              {travelerInfo.sourceFileName}
            </Tag>
          )}
        </Space>
      </div>

      <Divider />

      {/* Warnings Alert */}
      {travelerInfo.warnings && travelerInfo.warnings.length > 0 && (
        <Alert
          message="Review Warnings"
          description={
            <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
              {travelerInfo.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          }
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Traveler Information */}
      <div className="form-section">
        <h3>Traveler Information</h3>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <div className="field-review">
              <label>Work Order Number</label>
              <div className="field-value">{travelerInfo.workOrderNumber}</div>
            </div>
          </Col>
          <Col xs={24} sm={12}>
            <div className="field-review">
              <label>Part Number</label>
              <div className="field-value">
                {editable && editingField === 'partNumber' ? (
                  <Space.Compact style={{ width: '100%' }}>
                    <Input
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                    />
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      onClick={() => handleSaveCorrection('partNumber', editingValue)}
                    />
                    <Button onClick={handleCancelEdit}>Cancel</Button>
                  </Space.Compact>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {getFieldValue('partNumber')}
                    {editable && (
                      <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleEditField('partNumber', travelerInfo.partNumber)}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <div className="field-review">
              <label>Quantity</label>
              <div className="field-value">
                {editable && editingField === 'quantity' ? (
                  <Space.Compact style={{ width: '100%' }}>
                    <InputNumber
                      value={editingValue}
                      onChange={(value) => setEditingValue(value)}
                      min={1}
                    />
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      onClick={() => handleSaveCorrection('quantity', editingValue)}
                    />
                    <Button onClick={handleCancelEdit}>Cancel</Button>
                  </Space.Compact>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>{getFieldValue('quantity')}</strong>
                    {editable && (
                      <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleEditField('quantity', travelerInfo.quantity)}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </Col>
          <Col xs={24} sm={12}>
            <div className="field-review">
              <label>Priority</label>
              <div className="field-value">
                {editable && editingField === 'priority' ? (
                  <Space.Compact style={{ width: '100%' }}>
                    <Select
                      value={editingValue}
                      onChange={(value) => setEditingValue(value)}
                      style={{ width: '100%' }}
                    >
                      <Select.Option value="low">Low</Select.Option>
                      <Select.Option value="medium">Medium</Select.Option>
                      <Select.Option value="high">High</Select.Option>
                      <Select.Option value="urgent">Urgent</Select.Option>
                    </Select>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      onClick={() => handleSaveCorrection('priority', editingValue)}
                    />
                    <Button onClick={handleCancelEdit}>Cancel</Button>
                  </Space.Compact>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {getFieldValue('priority') || 'Not set'}
                    {editable && (
                      <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleEditField('priority', travelerInfo.priority)}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </Col>
        </Row>
      </div>

      <Divider />

      {/* Source Information */}
      <div className="form-section">
        <h3>Source Information</h3>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <div className="field-review">
              <label>Template</label>
              <div className="field-value">
                {travelerInfo.templateName || 'Manual Entry'}
              </div>
            </div>
          </Col>
          <Col xs={24} sm={12}>
            <div className="field-review">
              <label>Template Confidence</label>
              <div className="field-value">
                {travelerInfo.templateConfidence ? `${Math.round(travelerInfo.templateConfidence * 100)}%` : 'N/A'}
              </div>
            </div>
          </Col>
        </Row>

        <div className="field-review">
          <label>Source File</label>
          <div className="field-value">
            {travelerInfo.sourceFileName || 'No file (manual entry)'}
          </div>
        </div>
      </div>

      <Divider />

      {/* Corrections Summary */}
      {corrections.length > 0 && (
        <>
          <div className="form-section">
            <h3>Corrections Applied</h3>
            <Table
              columns={correctionsColumns}
              dataSource={corrections}
              pagination={false}
              rowKey="fieldName"
              size="small"
            />
          </div>
          <Divider />
        </>
      )}

      {/* Reviewer Notes */}
      <div className="form-section">
        <h3>Reviewer Notes (Optional)</h3>
        <Form form={form} layout="vertical">
          <Form.Item name="reviewerNotes">
            <Input.TextArea
              placeholder="Add any notes about this traveler review..."
              rows={4}
              maxLength={500}
            />
          </Form.Item>
        </Form>
      </div>

      <Divider />

      {/* Edit Toggle */}
      <div style={{ marginBottom: 24 }}>
        <Button
          type={editable ? 'primary' : 'default'}
          onClick={() => setEditable(!editable)}
        >
          {editable ? 'Done Editing' : 'Edit Fields'}
        </Button>
      </div>

      {/* Action Buttons */}
      <Row justify="end" gutter={8}>
        {onCancel && (
          <Col>
            <Button onClick={onCancel} disabled={submitting}>
              Cancel
            </Button>
          </Col>
        )}
        <Col>
          <Button
            danger
            icon={<CloseCircleOutlined />}
            onClick={handleReject}
            loading={submitting}
          >
            Reject
          </Button>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={handleApprove}
            loading={submitting}
          >
            Approve
          </Button>
        </Col>
      </Row>
    </Card>
  );
};

export default TravelerReviewForm;
export type { TravelerReviewData, Correction };
