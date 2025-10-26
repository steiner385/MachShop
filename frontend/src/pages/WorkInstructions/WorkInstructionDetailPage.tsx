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
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  HistoryOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkInstructionStore } from '@/store/workInstructionStore';
import { useSignatureStore } from '@/store/signatureStore';
import { SignatureDisplay } from '@/components/Signatures/SignatureDisplay';
import { SignatureModal, SignatureData } from '@/components/Signatures/SignatureModal';
import { useAuthStore } from '@/store/AuthStore';

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

/**
 * Work Instruction Detail Page
 *
 * Route: /work-instructions/:id
 *
 * Displays full details of a work instruction including:
 * - Basic metadata (title, version, status, etc.)
 * - Step-by-step instructions
 * - Applied electronic signatures (Sprint 3)
 * - Revision history
 * - Actions (edit, execute, approve)
 */
const WorkInstructionDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [signaturesLoading, setSignaturesLoading] = useState(false);
  const [signatureModalVisible, setSignatureModalVisible] = useState(false);
  const [_approvingWithSignature, setApprovingWithSignature] = useState(false);

  const { user } = useAuthStore();

  const {
    currentWorkInstruction,
    isLoadingDetail,
    detailError,
    fetchWorkInstructionById,
    approveWorkInstruction,
  } = useWorkInstructionStore();

  const {
    signatures,
    getSignaturesForEntity,
    createSignature,
  } = useSignatureStore();

  // Load work instruction on mount
  useEffect(() => {
    if (id) {
      fetchWorkInstructionById(id);
      loadSignatures();
    }
  }, [id]);

  // Load signatures for this work instruction
  const loadSignatures = async () => {
    if (!id) return;
    try {
      setSignaturesLoading(true);
      await getSignaturesForEntity('work_instruction', id);
    } catch (error: any) {
      console.error('Failed to load signatures:', error);
    } finally {
      setSignaturesLoading(false);
    }
  };

  // Convert SignatureAuditTrail to SignatureInfo format
  const convertToSignatureInfo = (auditTrail: typeof signatures): any[] => {
    return auditTrail.map((sig: any) => ({
      id: sig.signatureId || sig.id,
      userId: sig.userId,
      username: sig.username,
      firstName: sig.firstName,
      lastName: sig.lastName,
      signatureType: sig.signatureType,
      signatureLevel: sig.signatureLevel,
      timestamp: sig.timestamp,
      isValid: sig.isValid,
      biometricType: sig.biometricType,
      biometricScore: sig.biometricScore,
      invalidationReason: sig.invalidationReason,
      invalidatedAt: sig.invalidatedAt,
      signatureReason: sig.signatureReason,
    }));
  };

  // Handle approve - opens signature modal
  const handleApprove = () => {
    setSignatureModalVisible(true);
  };

  // Handle signature and approval
  const handleSign = async (signatureData: SignatureData) => {
    if (!id || !user) return;

    try {
      setApprovingWithSignature(true);

      // Create signature
      await createSignature({
        signedEntityType: 'work_instruction',
        signedEntityId: id,
        signedEntityName: currentWorkInstruction?.title || 'Work Instruction',
        signatureLevel: 'SUPERVISOR', // Work instruction approval requires supervisor level
        signatureType: 'ADVANCED', // Require ADVANCED signature (password + 2FA) for approval
        userId: user.id,
        password: signatureData.password,
        biometricTemplate: signatureData.biometricTemplate,
        biometricScore: signatureData.biometricScore,
        signatureReason: signatureData.signatureReason || 'Work Instruction Approval',
      });

      // Approve work instruction
      await approveWorkInstruction(id);

      message.success('Work instruction approved and signed successfully');
      setSignatureModalVisible(false);

      // Reload to show updated status and new signature
      await fetchWorkInstructionById(id);
      await loadSignatures();
    } catch (error: any) {
      message.error(error.message || 'Failed to approve work instruction');
    } finally {
      setApprovingWithSignature(false);
    }
  };

  if (isLoadingDetail) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="Loading work instruction..."><div /></Spin>
      </div>
    );
  }

  if (detailError || !currentWorkInstruction) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <Alert
            message="Error"
            description={detailError || 'Work instruction not found'}
            type="error"
            showIcon
            style={{ marginBottom: '16px' }}
          />
          <Button
            type="primary"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/work-instructions')}
          >
            Back to List
          </Button>
        </Card>
      </div>
    );
  }

  const wi = currentWorkInstruction;
  const canEdit = wi.status === 'DRAFT' || wi.status === 'REVIEW';
  const canApprove = wi.status === 'REVIEW';
  const canExecute = wi.status === 'APPROVED';

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Back Button */}
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/work-instructions')}
        style={{ marginBottom: '16px' }}
      >
        Back to List
      </Button>

      {/* Header Card */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <Space align="center" style={{ marginBottom: '16px' }}>
              <FileTextOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
              <Title level={2} style={{ margin: 0 }}>
                {wi.title}
              </Title>
              <Tag color={STATUS_COLORS[wi.status]} style={{ fontSize: '14px' }}>
                {wi.status}
              </Tag>
            </Space>

            {wi.description && (
              <Paragraph style={{ fontSize: '16px', color: '#666', marginTop: '8px' }}>
                {wi.description}
              </Paragraph>
            )}
          </div>

          <Space size="middle">
            {canEdit && (
              <Button
                type="default"
                size="large"
                icon={<EditOutlined />}
                onClick={() => navigate(`/work-instructions/${id}/edit`)}
              >
                Edit
              </Button>
            )}

            {canApprove && (
              <Button
                type="primary"
                size="large"
                icon={<CheckCircleOutlined />}
                onClick={handleApprove}
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
              >
                Approve
              </Button>
            )}

            {canExecute && (
              <Button
                type="primary"
                size="large"
                icon={<PlayCircleOutlined />}
                onClick={() => navigate(`/work-instructions/${id}/execute`)}
              >
                Execute
              </Button>
            )}
          </Space>
        </div>
      </Card>

      {/* Metadata */}
      <Card title="Details" style={{ marginBottom: '24px' }}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Version">{wi.version}</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={STATUS_COLORS[wi.status]}>{wi.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Part ID">{wi.partId || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Operation ID">{wi.operationId || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="ECO Number">{wi.ecoNumber || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Total Steps">{wi.steps?.length || 0}</Descriptions.Item>
          <Descriptions.Item label="Created">
            {new Date(wi.createdAt).toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item label="Last Updated">
            {new Date(wi.updatedAt).toLocaleString()}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Steps Section */}
      <Card
        title={
          <Space>
            <FileTextOutlined />
            <span>Instructions ({wi.steps?.length || 0} steps)</span>
          </Space>
        }
        style={{ marginBottom: '24px' }}
      >
        {wi.steps && wi.steps.length > 0 ? (
          <Timeline mode="left">
            {wi.steps.map((step) => (
              <Timeline.Item
                key={step.id}
                color={step.isCritical ? 'red' : 'blue'}
                label={
                  <Text strong style={{ fontSize: '16px' }}>
                    Step {step.stepNumber}
                  </Text>
                }
              >
                <Card
                  type="inner"
                  title={
                    <Space>
                      <span>{step.title}</span>
                      {step.isCritical && (
                        <Tag color="red">CRITICAL</Tag>
                      )}
                    </Space>
                  }
                >
                  <Paragraph style={{ whiteSpace: 'pre-wrap' }}>
                    {step.content}
                  </Paragraph>

                  {step.estimatedDuration && (
                    <Text type="secondary">
                      Estimated: {Math.floor(step.estimatedDuration / 60)} min{' '}
                      {step.estimatedDuration % 60} sec
                    </Text>
                  )}

                  {(step.imageUrls?.length > 0 ||
                    step.videoUrls?.length > 0 ||
                    step.attachmentUrls?.length > 0) && (
                    <div style={{ marginTop: '12px' }}>
                      <Text type="secondary">
                        Attachments: {step.imageUrls?.length || 0} images,{' '}
                        {step.videoUrls?.length || 0} videos,{' '}
                        {step.attachmentUrls?.length || 0} documents
                      </Text>
                    </div>
                  )}
                </Card>
              </Timeline.Item>
            ))}
          </Timeline>
        ) : (
          <Alert
            message="No Steps"
            description="This work instruction does not have any steps yet. Edit it to add steps."
            type="info"
            showIcon
          />
        )}
      </Card>

      {/* Electronic Signatures Section (Sprint 3) */}
      <Card
        title={
          <Space>
            <SafetyOutlined />
            <span>Electronic Signatures</span>
          </Space>
        }
        style={{ marginBottom: '24px' }}
      >
        {signaturesLoading ? (
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <Spin tip="Loading signatures..."><div /></Spin>
          </div>
        ) : signatures && signatures.length > 0 ? (
          <SignatureDisplay signatures={convertToSignatureInfo(signatures)} showDetails />
        ) : (
          <Alert
            message="No Signatures"
            description="This work instruction has not been electronically signed yet. Signatures are required for approval and quality compliance."
            type="info"
            showIcon
          />
        )}
      </Card>

      {/* Revision History Section */}
      <Card
        title={
          <Space>
            <HistoryOutlined />
            <span>Revision History</span>
          </Space>
        }
      >
        <Collapse>
          <Panel header="View Revision History" key="1">
            <Timeline>
              <Timeline.Item color="green">
                <Text strong>{new Date(wi.createdAt).toLocaleString()}</Text>
                <br />
                <Text>Work instruction created (v{wi.version})</Text>
              </Timeline.Item>
              <Timeline.Item color="blue">
                <Text strong>{new Date(wi.updatedAt).toLocaleString()}</Text>
                <br />
                <Text>Last updated</Text>
              </Timeline.Item>
              {wi.status === 'APPROVED' && (
                <Timeline.Item color="green">
                  <Text strong>Approved</Text>
                  <br />
                  <Text>Work instruction approved and active</Text>
                </Timeline.Item>
              )}
            </Timeline>
          </Panel>
        </Collapse>
      </Card>

      {/* Signature Modal for Approval */}
      <SignatureModal
        visible={signatureModalVisible}
        onCancel={() => setSignatureModalVisible(false)}
        onSign={handleSign}
        entityType="work_instruction"
        entityId={id || ''}
        entityName={wi.title}
        signatureLevel="SUPERVISOR"
        signatureType="ADVANCED"
        requireBiometric={false}
        title="Sign and Approve Work Instruction"
        description="Approving this work instruction requires an ADVANCED electronic signature (username + password + 2FA). This signature will be recorded in the audit trail."
      />
    </div>
  );
};

export default WorkInstructionDetailPage;
