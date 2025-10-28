import React, { useEffect, useState } from 'react';
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  Spin,
  Typography,
  Collapse,
  Timeline,
  Alert,
  message,
  Row,
  Col,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  HistoryOutlined,
  SafetyOutlined,
  MessageOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkInstructionStore } from '@/store/workInstructionStore';
import { useSignatureStore } from '@/store/signatureStore';
import { SignatureDisplay } from '@/components/Signatures/SignatureDisplay';
import { SignatureModal, SignatureData } from '@/components/Signatures/SignatureModal';
import { useAuthStore } from '@/store/AuthStore';
import {
  withWorkInstructionCollaboration,
  WithCollaborationProps
} from '@/components/Collaboration/withCollaboration';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

/**
 * Status color mapping for work instruction statuses
 */
const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'default',
  REVIEW: 'processing',
  APPROVED: 'success',
  SUPERSEDED: 'warning',
  ARCHIVED: 'error',
};

interface WorkInstructionDetailPageProps extends WithCollaborationProps {
  // Props that can be passed in (for testing or when used as a component)
  id?: string;
  title?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'pdf' | 'video';
}

/**
 * Enhanced Work Instruction Detail Page with Collaboration Features
 *
 * This page demonstrates how to integrate collaboration features into existing
 * document pages using the withCollaboration HOC.
 *
 * Route: /work-instructions/:id/collaborative
 */
const WorkInstructionDetailPage: React.FC<WorkInstructionDetailPageProps> = ({
  id: propId,
  title: propTitle,
  mediaUrl: propMediaUrl,
  mediaType: propMediaType,
}) => {
  const { id: paramId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Use prop ID if provided, otherwise use param ID
  const workInstructionId = propId || paramId;

  // Stores
  const {
    currentWorkInstruction: workInstruction,
    isLoading,
    error,
    fetchWorkInstruction
  } = useWorkInstructionStore();

  const { user } = useAuthStore();
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  // Component state
  const [collaborationVisible, setCollaborationVisible] = useState(false);

  // Load work instruction
  useEffect(() => {
    if (workInstructionId) {
      fetchWorkInstruction(workInstructionId);
    }
  }, [workInstructionId, fetchWorkInstruction]);

  // Handle signature
  const handleSignature = async (signatureData: SignatureData) => {
    try {
      // This would typically save the signature
      message.success('Signature saved successfully');
      setShowSignatureModal(false);
    } catch (error: any) {
      message.error(error.message || 'Failed to save signature');
    }
  };

  // Handle navigation
  const handleBack = () => {
    navigate('/work-instructions');
  };

  const handleEdit = () => {
    navigate(`/work-instructions/${workInstructionId}/edit`);
  };

  const handleExecute = () => {
    navigate(`/work-instructions/${workInstructionId}/execute`);
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px' }}>
          <Text>Loading work instruction...</Text>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error Loading Work Instruction"
        description={error}
        type="error"
        showIcon
        style={{ margin: '24px' }}
        action={
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        }
      />
    );
  }

  if (!workInstruction) {
    return (
      <Alert
        message="Work Instruction Not Found"
        description="The requested work instruction could not be found."
        type="warning"
        showIcon
        style={{ margin: '24px' }}
        action={
          <Button onClick={handleBack}>
            Back to List
          </Button>
        }
      />
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={handleBack}
              >
                Back
              </Button>
              <Title level={2} style={{ margin: 0 }}>
                {propTitle || workInstruction.title}
              </Title>
              <Tag color={STATUS_COLORS[workInstruction.status]}>
                {workInstruction.status}
              </Tag>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<MessageOutlined />}
                onClick={() => setCollaborationVisible(true)}
              >
                Collaboration
              </Button>
              {(workInstruction.status === 'DRAFT' || workInstruction.status === 'REVIEW') && (
                <Button
                  icon={<EditOutlined />}
                  onClick={handleEdit}
                >
                  Edit
                </Button>
              )}
              {workInstruction.status === 'APPROVED' && (
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={handleExecute}
                >
                  Execute
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </div>

      {/* Collaboration Features Notice */}
      <Alert
        message="Enhanced with Collaboration Features"
        description="This page includes real-time comments, annotations, reviews, and activity tracking. Use the floating action button or collaboration panel to interact with team members."
        type="info"
        showIcon
        style={{ marginBottom: '24px' }}
        closable
      />

      {/* Work Instruction Details */}
      <Row gutter={24}>
        <Col xs={24} lg={16}>
          <Card title="Work Instruction Details" style={{ marginBottom: '24px' }}>
            <Descriptions column={2} bordered>
              <Descriptions.Item label="ID" span={1}>
                {workInstruction.id}
              </Descriptions.Item>
              <Descriptions.Item label="Version" span={1}>
                {workInstruction.version}
              </Descriptions.Item>
              <Descriptions.Item label="Status" span={1}>
                <Tag color={STATUS_COLORS[workInstruction.status]}>
                  {workInstruction.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Steps" span={1}>
                {workInstruction.steps?.length || 0}
              </Descriptions.Item>
              <Descriptions.Item label="Description" span={2}>
                {workInstruction.description}
              </Descriptions.Item>
              <Descriptions.Item label="Created" span={1}>
                {workInstruction.createdAt ? new Date(workInstruction.createdAt).toLocaleDateString() : 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Updated" span={1}>
                {workInstruction.updatedAt ? new Date(workInstruction.updatedAt).toLocaleDateString() : 'N/A'}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Steps */}
          {workInstruction.steps && workInstruction.steps.length > 0 && (
            <Card title="Instructions Steps" style={{ marginBottom: '24px' }}>
              <Timeline>
                {workInstruction.steps.map((step, index) => (
                  <Timeline.Item
                    key={index}
                    dot={<CheckCircleOutlined style={{ fontSize: '16px' }} />}
                  >
                    <div>
                      <Text strong>Step {index + 1}</Text>
                      <Paragraph style={{ marginTop: '8px', marginBottom: '0' }}>
                        {step.description || 'No description provided'}
                      </Paragraph>
                      {step.media && (
                        <div style={{ marginTop: '8px' }}>
                          <Text type="secondary">Media: {step.media}</Text>
                        </div>
                      )}
                    </div>
                  </Timeline.Item>
                ))}
              </Timeline>
            </Card>
          )}

          {/* Safety Information */}
          {workInstruction.safetyNotes && (
            <Card
              title={
                <Space>
                  <SafetyOutlined style={{ color: '#ff4d4f' }} />
                  Safety Information
                </Space>
              }
              style={{ marginBottom: '24px' }}
            >
              <Alert
                message="Safety Requirements"
                description={workInstruction.safetyNotes}
                type="warning"
                showIcon
              />
            </Card>
          )}
        </Col>

        <Col xs={24} lg={8}>
          {/* Quick Actions */}
          <Card title="Quick Actions" style={{ marginBottom: '24px' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                block
                icon={<MessageOutlined />}
                onClick={() => setCollaborationVisible(true)}
              >
                View Comments & Annotations
              </Button>
              <Button
                block
                icon={<TeamOutlined />}
                onClick={() => setCollaborationVisible(true)}
              >
                Request Review
              </Button>
              <Button
                block
                icon={<HistoryOutlined />}
                onClick={() => setCollaborationVisible(true)}
              >
                View Activity History
              </Button>
              <Button
                block
                icon={<CheckCircleOutlined />}
                onClick={() => setShowSignatureModal(true)}
              >
                Add Signature
              </Button>
            </Space>
          </Card>

          {/* Document Info */}
          <Card title="Document Information">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Document Type">
                Work Instruction
              </Descriptions.Item>
              <Descriptions.Item label="File Format">
                JSON/Digital
              </Descriptions.Item>
              <Descriptions.Item label="Media Support">
                {propMediaUrl || workInstruction.mediaUrl ? 'Yes' : 'No'}
              </Descriptions.Item>
              <Descriptions.Item label="Collaboration">
                Enabled
              </Descriptions.Item>
              <Descriptions.Item label="Real-time Updates">
                Active
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      {/* Signature Modal */}
      <SignatureModal
        open={showSignatureModal}
        onCancel={() => setShowSignatureModal(false)}
        onSubmit={handleSignature}
        title="Sign Work Instruction"
        description={`Please sign to acknowledge review of work instruction: ${workInstruction.title}`}
      />
    </div>
  );
};

// Export the component wrapped with collaboration features
export default withWorkInstructionCollaboration(WorkInstructionDetailPage);

// Also export the unwrapped component for testing
export { WorkInstructionDetailPage as UnwrappedWorkInstructionDetailPage };