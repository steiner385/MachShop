import React, { useEffect, useState } from 'react';
import {
  Form,
  Input,
  Button,
  Select,
  Card,
  Space,
  message,
  Spin,
  Divider,
} from 'antd';
import {
  SaveOutlined,
  SendOutlined,
  CheckCircleOutlined,
  ArrowLeftOutlined,
  FileTextOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useWorkInstructionStore } from '@/store/workInstructionStore';
import {
  CreateWorkInstructionInput,
  UpdateWorkInstructionInput,
  workInstructionsAPI,
} from '@/api/workInstructions';
import { RichTextEditor } from './RichTextEditor';
import { TemplateLibrary, WorkInstructionTemplate } from './TemplateLibrary';
import { WorkflowStatus } from '../Approvals/WorkflowStatus';
import { RejectModal } from '../Approvals/RejectModal';
const { Option } = Select;

interface WorkInstructionFormProps {
  mode: 'create' | 'edit';
}

/**
 * Work Instruction Form Component
 *
 * Handles creating and editing work instructions with validation
 */
export const WorkInstructionForm: React.FC<WorkInstructionFormProps> = ({ mode }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [description, setDescription] = useState('');
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);

  const {
    currentWorkInstruction,
    isLoadingDetail,
    detailError,
    fetchWorkInstructionById,
    createWorkInstruction,
    updateWorkInstruction,
  } = useWorkInstructionStore();

  // Load work instruction if in edit mode
  useEffect(() => {
    if (mode === 'edit' && id) {
      fetchWorkInstructionById(id);
    }
  }, [mode, id, fetchWorkInstructionById]);

  // Populate form when work instruction loads
  useEffect(() => {
    if (mode === 'edit' && currentWorkInstruction) {
      form.setFieldsValue({
        title: currentWorkInstruction.title,
        version: currentWorkInstruction.version,
        partId: currentWorkInstruction.partId,
        operationId: currentWorkInstruction.operationId,
        ecoNumber: currentWorkInstruction.ecoNumber,
        status: currentWorkInstruction.status,
      });
      // Set description separately for rich text editor
      if (currentWorkInstruction.description) {
        setDescription(currentWorkInstruction.description);
      }
    }
  }, [mode, currentWorkInstruction, form]);

  // Handle form submission
  const handleSubmit = async (values: any, action: 'draft' | 'review' | 'approve') => {
    try {
      setSubmitting(true);

      // Set status based on action
      let status: any = 'DRAFT';
      if (action === 'review') {
        status = 'REVIEW';
      } else if (action === 'approve') {
        status = 'APPROVED';
      }

      const formData = {
        ...values,
        description, // Use rich text editor content
        status,
      };

      if (mode === 'create') {
        // Create new work instruction
        const newWorkInstruction = await createWorkInstruction(formData as CreateWorkInstructionInput);
        message.success('Work instruction created successfully');
        navigate(`/work-instructions/${newWorkInstruction.id}`);
      } else if (mode === 'edit' && id) {
        // Update existing work instruction
        await updateWorkInstruction(id, formData as UpdateWorkInstructionInput);
        message.success('Work instruction updated successfully');
        navigate(`/work-instructions/${id}`);
      }
    } catch (error: any) {
      message.error(error.message || 'Failed to save work instruction');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle save as draft
  const handleSaveDraft = () => {
    form.validateFields().then((values) => {
      handleSubmit(values, 'draft');
    });
  };

  // Handle submit for review
  const handleSubmitForReview = () => {
    form.validateFields().then((values) => {
      handleSubmit(values, 'review');
    });
  };

  // Handle approve (only for edit mode with REVIEW status)
  const handleApprove = () => {
    form.validateFields().then((values) => {
      handleSubmit(values, 'approve');
    });
  };

  const canApprove = mode === 'edit' && currentWorkInstruction?.status === 'REVIEW';
  const isApproved = currentWorkInstruction?.status === 'APPROVED';

  /**
   * Handle template selection
   */
  const handleTemplateSelect = (template: WorkInstructionTemplate) => {
    // Populate form with template data
    form.setFieldsValue({
      title: template.name,
      version: '1.0.0',
    });

    // Set description from template
    setDescription(template.description);

    message.success(`Template "${template.name}" loaded successfully`);
  };

  /**
   * Handle rejection
   */
  const handleReject = async (reason: string, comments: string) => {
    if (!id) return;

    try {
      await workInstructionsAPI.reject(id, reason, comments);
      message.success('Work instruction rejected successfully');
      // Refresh the work instruction to show updated status
      await fetchWorkInstructionById(id);
      setRejectModalVisible(false);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to reject work instruction');
    }
  };

  if (mode === 'edit' && isLoadingDetail) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="Loading work instruction..."><div /></Spin>
      </div>
    );
  }

  if (mode === 'edit' && detailError) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <p style={{ color: '#cf1322', marginBottom: '16px' }}>{detailError}</p>
          <Button onClick={() => navigate('/work-instructions')}>
            <ArrowLeftOutlined /> Back to List
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/work-instructions')}
          >
            Back to List
          </Button>
          {mode === 'create' && !isApproved && (
            <Button
              type="primary"
              icon={<FileTextOutlined />}
              onClick={() => setTemplateModalVisible(true)}
              size="large"
            >
              Start from Template
            </Button>
          )}
        </div>
        <h1>{mode === 'create' ? 'Create Work Instruction' : 'Edit Work Instruction'}</h1>
        <p style={{ color: '#666', marginTop: '8px' }}>
          {mode === 'create'
            ? 'Create a new work instruction with detailed steps for manufacturing operations'
            : 'Update the work instruction details and manage its lifecycle'}
        </p>
      </div>

      <Card>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            version: '1.0.0',
            status: 'DRAFT',
          }}
          disabled={isApproved}
        >
          {/* Title */}
          <Form.Item
            label="Title"
            name="title"
            rules={[
              { required: true, message: 'Please enter a title' },
              { min: 5, message: 'Title must be at least 5 characters' },
              { max: 200, message: 'Title must not exceed 200 characters' },
            ]}
          >
            <Input
              placeholder="Enter work instruction title (e.g., 'Assembly Procedure for Wing Panel A')"
              size="large"
            />
          </Form.Item>

          {/* Description */}
          <Form.Item
            label="Description"
            tooltip="Use the rich text editor to create formatted descriptions with images, videos, and structured content"
          >
            <RichTextEditor
              initialValue={description}
              onChange={(content) => {
                setDescription(content);
                form.setFieldsValue({ description: content });
              }}
              placeholder="Enter a detailed description of this work instruction..."
              readOnly={isApproved}
              minHeight={250}
              maxHeight={500}
              showCharCount={true}
              maxCharCount={5000}
              ariaLabel="Work instruction description editor"
            />
          </Form.Item>

          {/* Version and Part/Operation Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Version */}
            <Form.Item
              label="Version"
              name="version"
              rules={[
                { required: true, message: 'Please enter a version' },
                { pattern: /^\d+\.\d+\.\d+$/, message: 'Version must be in format X.Y.Z (e.g., 1.0.0)' },
              ]}
            >
              <Input placeholder="1.0.0" />
            </Form.Item>

            {/* ECO Number */}
            <Form.Item
              label="ECO Number"
              name="ecoNumber"
              tooltip="Engineering Change Order number (optional)"
            >
              <Input placeholder="ECO-12345" />
            </Form.Item>
          </div>

          {/* Part ID and Operation ID Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Part ID */}
            <Form.Item
              label="Part ID"
              name="partId"
              tooltip="Link this work instruction to a specific part (optional)"
            >
              <Select
                placeholder="Select a part"
                showSearch
                allowClear
                optionFilterProp="children"
              >
                {/* TODO: Load parts from API */}
                <Option value="part-001">Part-001 - Wing Panel A</Option>
                <Option value="part-002">Part-002 - Fuselage Section</Option>
                <Option value="part-003">Part-003 - Landing Gear Assembly</Option>
              </Select>
            </Form.Item>

            {/* Operation ID */}
            <Form.Item
              label="Operation ID"
              name="operationId"
              tooltip="Link this work instruction to a routing operation (optional)"
            >
              <Select
                placeholder="Select an operation"
                showSearch
                allowClear
                optionFilterProp="children"
              >
                {/* TODO: Load operations from API */}
                <Option value="op-001">OP-001 - Assembly</Option>
                <Option value="op-002">OP-002 - Welding</Option>
                <Option value="op-003">OP-003 - Inspection</Option>
              </Select>
            </Form.Item>
          </div>

          {/* Status (only show in edit mode) */}
          {mode === 'edit' && (
            <Form.Item
              label="Status"
              name="status"
            >
              <Select disabled>
                <Option value="DRAFT">Draft</Option>
                <Option value="REVIEW">Review</Option>
                <Option value="APPROVED">Approved</Option>
                <Option value="REJECTED">Rejected</Option>
                <Option value="SUPERSEDED">Superseded</Option>
                <Option value="ARCHIVED">Archived</Option>
              </Select>
            </Form.Item>
          )}

          <Divider />

          {/* Action Buttons */}
          <Form.Item style={{ marginBottom: 0 }}>
            <Space size="middle">
              {!isApproved && (
                <>
                  <Button
                    size="large"
                    icon={<SaveOutlined />}
                    onClick={handleSaveDraft}
                    loading={submitting}
                  >
                    Save as Draft
                  </Button>

                  <Button
                    type="primary"
                    size="large"
                    icon={<SendOutlined />}
                    onClick={handleSubmitForReview}
                    loading={submitting}
                  >
                    Submit for Review
                  </Button>

                  {canApprove && (
                    <>
                      <Button
                        type="primary"
                        size="large"
                        icon={<CheckCircleOutlined />}
                        onClick={handleApprove}
                        loading={submitting}
                        style={{ background: '#52c41a', borderColor: '#52c41a' }}
                      >
                        Approve
                      </Button>

                      <Button
                        danger
                        size="large"
                        icon={<CloseCircleOutlined />}
                        onClick={() => setRejectModalVisible(true)}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                </>
              )}

              {isApproved && (
                <div style={{ color: '#52c41a', fontSize: '16px' }}>
                  <CheckCircleOutlined style={{ marginRight: '8px' }} />
                  This work instruction is approved and cannot be edited.
                </div>
              )}

              <Button
                size="large"
                onClick={() => navigate('/work-instructions')}
              >
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* Approval Workflow Status */}
      {mode === 'edit' && currentWorkInstruction && currentWorkInstruction.approvalHistory && currentWorkInstruction.approvalHistory.length > 0 && (
        <WorkflowStatus
          workflowType="work_instruction"
          status={currentWorkInstruction.status}
          approvalHistory={currentWorkInstruction.approvalHistory}
        />
      )}

      {/* Next Steps Message */}
      {mode === 'create' && (
        <Card style={{ marginTop: '24px', background: '#f0f5ff', borderColor: '#adc6ff' }}>
          <p style={{ margin: 0, color: '#1890ff' }}>
            <strong>Next Step:</strong> After creating the work instruction, you'll be able to add detailed steps with images, videos, and data entry fields.
          </p>
        </Card>
      )}

      {/* Reject Modal */}
      <RejectModal
        visible={rejectModalVisible}
        onClose={() => setRejectModalVisible(false)}
        onReject={handleReject}
        title="Work Instruction"
        itemIdentifier={currentWorkInstruction?.title}
      />

      {/* Template Library Modal */}
      <TemplateLibrary
        visible={templateModalVisible}
        onClose={() => setTemplateModalVisible(false)}
        onSelect={handleTemplateSelect}
      />
    </div>
  );
};

export default WorkInstructionForm;
