import React, { useEffect, useState } from 'react';
import {
  Card,
  Layout,
  Space,
  Tag,
  Typography,
  Button,
  Image,
  Empty,
  Spin,
  Alert,
  Divider,
} from 'antd';
import {
  FileImageOutlined,
  VideoCameraOutlined,
  FileTextOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import { StepNavigation } from './StepNavigation';
import { ProgressIndicator } from './ProgressIndicator';
import type { WorkInstruction, WorkInstructionStep } from '@/api/workInstructions';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;

interface WorkInstructionViewerProps {
  workInstruction: WorkInstruction;
  isLoading?: boolean;
  onStepChange?: (stepNumber: number) => void;
}

/**
 * Work Instruction Viewer Component (Phase 1)
 *
 * Provides a read-only, tablet-optimized view of work instructions
 * with support for:
 * - Step-by-step navigation
 * - Multiple media types (images, videos, PDFs)
 * - Progress tracking
 * - Fullscreen mode for detailed viewing
 *
 * Issue #45: Work Instruction Viewer with Data Collection - Shop Floor UI
 */
export const WorkInstructionViewer: React.FC<WorkInstructionViewerProps> = ({
  workInstruction,
  isLoading = false,
  onStepChange,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewedSteps, setViewedSteps] = useState<Set<number>>(new Set([0]));

  const steps = workInstruction?.steps || [];
  const currentStep = steps[currentStepIndex];
  const totalSteps = steps.length;

  // Track viewed steps for progress indication
  useEffect(() => {
    setViewedSteps((prev) => new Set([...prev, currentStepIndex]));
  }, [currentStepIndex]);

  // Notify parent of step changes
  useEffect(() => {
    if (onStepChange && currentStep) {
      onStepChange(currentStep.stepNumber);
    }
  }, [currentStep, onStepChange]);

  const handlePreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleNextStep = () => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handleJumpToStep = (stepIndex: number) => {
    setCurrentStepIndex(stepIndex);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" tip="Loading work instruction..." />
      </div>
    );
  }

  if (!workInstruction) {
    return <Empty description="No work instruction available" style={{ marginTop: '50px' }} />;
  }

  if (totalSteps === 0) {
    return (
      <Card>
        <Alert
          message="No Steps"
          description="This work instruction does not have any steps defined."
          type="info"
          showIcon
        />
      </Card>
    );
  }

  const mediaItems = currentStep
    ? [
        ...(currentStep.imageUrls?.map((url) => ({ type: 'image', url, icon: <FileImageOutlined /> })) || []),
        ...(currentStep.videoUrls?.map((url) => ({ type: 'video', url, icon: <VideoCameraOutlined /> })) || []),
        ...(currentStep.attachmentUrls?.map((url) => ({ type: 'document', url, icon: <FileTextOutlined /> })) || []),
      ]
    : [];

  const stepStatusColor = (stepIndex: number) => {
    if (stepIndex === currentStepIndex) return 'blue';
    if (viewedSteps.has(stepIndex)) return 'green';
    return 'default';
  };

  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header Section */}
      <div style={{ backgroundColor: '#fff', padding: '24px', borderBottom: '1px solid #f0f0f0' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <div>
            <Title level={2} style={{ margin: 0 }}>
              {workInstruction.title}
            </Title>
            {workInstruction.description && (
              <Text type="secondary" style={{ display: 'block', marginTop: '8px' }}>
                {workInstruction.description}
              </Text>
            )}
          </div>
          <Button
            type="text"
            icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            onClick={toggleFullscreen}
            size="large"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          />
        </div>

        {/* Metadata */}
        <Space size="large" wrap>
          {workInstruction.version && (
            <div>
              <Text strong>Version:</Text>
              <Text> {workInstruction.version}</Text>
            </div>
          )}
          <Tag color={workInstruction.status === 'APPROVED' ? 'green' : 'orange'}>
            {workInstruction.status}
          </Tag>
          {workInstruction.ecoNumber && (
            <div>
              <Text strong>ECO:</Text>
              <Text> {workInstruction.ecoNumber}</Text>
            </div>
          )}
        </Space>

        {/* Progress Bar */}
        {totalSteps > 0 && (
          <div style={{ marginTop: '16px' }}>
            <ProgressIndicator
              current={currentStepIndex + 1}
              total={totalSteps}
              viewedCount={viewedSteps.size}
            />
          </div>
        )}
      </div>

      {/* Main Content */}
      <Content
        style={{
          padding: isFullscreen ? '0' : '24px',
          flex: 1,
        }}
      >
        {currentStep && (
          <Card
            style={{
              minHeight: '400px',
              borderRadius: isFullscreen ? '0' : '8px',
            }}
          >
            {/* Step Header */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Title level={3} style={{ margin: '0 0 8px 0' }}>
                    Step {currentStep.stepNumber}: {currentStep.title}
                  </Title>
                  {currentStep.isCritical && (
                    <Tag color="red" style={{ marginTop: '8px' }}>
                      Critical Step
                    </Tag>
                  )}
                </div>
                {currentStep.estimatedDuration && (
                  <Text type="secondary">
                    Est. time: {currentStep.estimatedDuration} min
                  </Text>
                )}
              </div>
            </div>

            <Divider />

            {/* Step Content */}
            {currentStep.content && (
              <div style={{ marginBottom: '24px' }}>
                <Paragraph
                  style={{
                    fontSize: '16px',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {currentStep.content}
                </Paragraph>
              </div>
            )}

            {/* Media Gallery */}
            {mediaItems.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <Title level={4}>Reference Materials</Title>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '16px',
                  }}
                >
                  {mediaItems.map((media, idx) => {
                    if (media.type === 'image') {
                      return (
                        <div key={idx} style={{ textAlign: 'center' }}>
                          <Image
                            src={media.url}
                            width="100%"
                            height="auto"
                            alt={`Step ${currentStep.stepNumber} reference`}
                            style={{ borderRadius: '4px' }}
                            preview={{
                              mask: 'View Image',
                            }}
                          />
                        </div>
                      );
                    }

                    if (media.type === 'video') {
                      return (
                        <div key={idx} style={{ backgroundColor: '#000', borderRadius: '4px', overflow: 'hidden' }}>
                          <video
                            width="100%"
                            height="auto"
                            controls
                            style={{ display: 'block' }}
                          >
                            <source src={media.url} />
                            Your browser does not support the video tag.
                          </video>
                        </div>
                      );
                    }

                    if (media.type === 'document') {
                      return (
                        <Card key={idx} hoverable style={{ textAlign: 'center' }}>
                          <FileTextOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
                          <br />
                          <Button
                            type="link"
                            href={media.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ marginTop: '8px' }}
                          >
                            Open Document
                          </Button>
                        </Card>
                      );
                    }

                    return null;
                  })}
                </div>
              </div>
            )}

            {/* Data Entry Fields (if present) */}
            {currentStep.dataEntryFields && Object.keys(currentStep.dataEntryFields).length > 0 && (
              <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                <Title level={4}>Data Entry</Title>
                <Text type="secondary">
                  Data collection fields are configured for this step
                </Text>
              </div>
            )}

            {/* Signature Requirement */}
            {currentStep.requiresSignature && (
              <Alert
                message="Signature Required"
                description="An electronic signature is required upon completion of this step."
                type="warning"
                showIcon
                style={{ marginTop: '16px' }}
              />
            )}
          </Card>
        )}
      </Content>

      {/* Step Navigation Footer */}
      <div style={{ backgroundColor: '#fff', padding: '16px 24px', borderTop: '1px solid #f0f0f0' }}>
        <Space direction="vertical" style={{ width: '100%', gap: '16px' }}>
          {/* Step Indicators */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              paddingBottom: '8px',
            }}
          >
            {steps.map((step, idx) => (
              <Tag
                key={idx}
                color={stepStatusColor(idx)}
                onClick={() => handleJumpToStep(idx)}
                style={{
                  cursor: 'pointer',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  fontWeight: idx === currentStepIndex ? '600' : '400',
                  whiteSpace: 'nowrap',
                }}
              >
                Step {step.stepNumber}
              </Tag>
            ))}
          </div>

          {/* Navigation Controls */}
          <StepNavigation
            currentStepIndex={currentStepIndex}
            totalSteps={totalSteps}
            onPrevious={handlePreviousStep}
            onNext={handleNextStep}
            onJumpToStep={handleJumpToStep}
            completedSteps={viewedSteps}
            showJumpMenu={true}
          />

          {/* Step Counter */}
          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">
              Step {currentStepIndex + 1} of {totalSteps}
            </Text>
          </div>
        </Space>
      </div>
    </Layout>
  );
};

export default WorkInstructionViewer;
