/**
 * Reject Modal Component
 *
 * Modal for rejecting work instructions, FAI reports, or other items
 * requiring approval. Collects rejection reason and mandatory comments.
 *
 * Features:
 * - Dropdown with predefined rejection reasons
 * - Mandatory comments field with minimum length
 * - Warning notice about notification
 * - Validation before submission
 */

import React, { useState } from 'react';
import { Modal, Form, Input, Select, message, Alert } from 'antd';
import { CloseCircleOutlined, WarningOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Option } = Select;

/**
 * Predefined rejection reasons
 */
const REJECTION_REASONS = [
  'Incomplete information',
  'Does not meet requirements',
  'Requires additional review',
  'Technical inaccuracy',
  'Safety concerns',
  'Quality standards not met',
  'Missing documentation',
  'Incorrect revision level',
  'Process not followed',
  'Equipment not calibrated',
  'Insufficient testing',
  'Other (specify in comments)',
];

/**
 * Reject Modal Props
 */
interface RejectModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when item is rejected with reason and comments */
  onReject: (reason: string, comments: string) => Promise<void>;
  /** Title of the item being rejected (e.g., "Work Instruction") */
  title: string;
  /** Optional item identifier for display */
  itemIdentifier?: string;
}

/**
 * Reject Modal Component
 */
export const RejectModal: React.FC<RejectModalProps> = ({
  visible,
  onClose,
  onReject,
  title,
  itemIdentifier,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  /**
   * Handle rejection submission
   */
  const handleReject = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      await onReject(values.reason, values.comments);

      message.success(`${title} rejected successfully`);
      form.resetFields();
      onClose();
    } catch (error: any) {
      // Don't show error if it's just validation failure
      if (!error.errorFields) {
        message.error(error.message || `Failed to reject ${title.toLowerCase()}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Handle modal close
   */
  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={
        <span>
          <CloseCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
          Reject {title}
        </span>
      }
      open={visible}
      onCancel={handleClose}
      onOk={handleReject}
      confirmLoading={submitting}
      okText="Reject"
      okButtonProps={{ danger: true, size: 'large' }}
      cancelButtonProps={{ size: 'large' }}
      width={600}
      destroyOnClose
    >
      <div style={{ marginBottom: 24 }}>
        {itemIdentifier && (
          <div style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
            You are rejecting: <strong>{itemIdentifier}</strong>
          </div>
        )}

        <Form form={form} layout="vertical">
          {/* Rejection Reason */}
          <Form.Item
            label="Rejection Reason"
            name="reason"
            rules={[{ required: true, message: 'Please select a rejection reason' }]}
            tooltip="Select the primary reason for rejecting this item"
          >
            <Select
              placeholder="Select a reason for rejection"
              size="large"
              showSearch
              filterOption={(input, option) =>
                String(option?.children || '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {REJECTION_REASONS.map((reason) => (
                <Option key={reason} value={reason}>
                  {reason}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* Comments */}
          <Form.Item
            label="Comments"
            name="comments"
            rules={[
              { required: true, message: 'Please provide comments explaining the rejection' },
              { min: 20, message: 'Comments must be at least 20 characters' },
              { max: 1000, message: 'Comments must not exceed 1000 characters' },
            ]}
            tooltip="Provide detailed feedback to help the author understand what needs to be corrected"
          >
            <TextArea
              placeholder="Explain what needs to be corrected and provide guidance for resubmission..."
              rows={6}
              showCount
              maxLength={1000}
              autoSize={{ minRows: 6, maxRows: 12 }}
            />
          </Form.Item>
        </Form>

        {/* Warning Notice */}
        <Alert
          message="Important Notice"
          description={
            <div>
              <div style={{ marginBottom: 8 }}>
                The author will be notified of this rejection via email. Your comments will be
                visible in the approval history.
              </div>
              <div style={{ fontSize: 12 }}>
                Please provide constructive feedback to help the author address the issues.
              </div>
            </div>
          }
          type="warning"
          icon={<WarningOutlined />}
          showIcon
        />
      </div>
    </Modal>
  );
};

export default RejectModal;
