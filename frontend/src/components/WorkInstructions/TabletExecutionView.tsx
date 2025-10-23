import React, { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Image,
  Space,
  Typography,
  Checkbox,
  Tag,
  Modal,
  message,
  Spin,
} from 'antd';
import {
  CloseOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  FileImageOutlined,
  VideoCameraOutlined,
  FileTextOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkInstructionStore, useExecutionMode } from '@/store/workInstructionStore';
import { ProgressIndicator } from './ProgressIndicator';
import { StepNavigation } from './StepNavigation';

const { Title, Text, Paragraph } = Typography;

/**
 * Tablet Execution View Component
 *
 * Full-screen tablet-optimized interface for executing work instructions
 */
export const TabletExecutionView: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [stepCompleted, setStepCompleted] = useState(false);

  const {
    fetchWorkInstructionById,
    startExecution,
    stopExecution,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    markStepComplete,
    markStepIncomplete,
    isLoadingDetail,
    currentWorkInstruction,
  } = useWorkInstructionStore();

  const {
    executionMode,
    currentStepIndex,
    completedSteps,
    currentStep,
    totalSteps,
  } = useExecutionMode();

  // Load work instruction on mount
  useEffect(() => {
    if (id) {
      fetchWorkInstructionById(id).then(() => {
        // Auto-start execution mode after loading
        const wi = useWorkInstructionStore.getState().currentWorkInstruction;
        if (wi) {
          startExecution(wi);
        }
      });
    }

    // Cleanup on unmount
    return () => {
      stopExecution();
    };
  }, [id]);

  // Update step completed checkbox when step changes
  useEffect(() => {
    setStepCompleted(completedSteps.has(currentStepIndex));
  }, [currentStepIndex, completedSteps]);

  // Handle exit execution
  const handleExit = () => {
    Modal.confirm({
      title: 'Exit Execution?',
      content: 'Your progress will be saved. Are you sure you want to exit?',
      onOk: () => {
        stopExecution();
        navigate('/work-instructions');
      },
    });
  };

  // Handle step completion toggle
  const handleStepCompletionToggle = (checked: boolean) => {
    setStepCompleted(checked);
    if (checked) {
      markStepComplete(currentStepIndex);
      message.success('Step marked as complete');
    } else {
      markStepIncomplete(currentStepIndex);
      message.info('Step marked as incomplete');
    }
  };

  // Handle next step
  const handleNext = () => {
    if (!stepCompleted) {
      Modal.confirm({
        title: 'Step Not Completed',
        content: 'This step has not been marked as complete. Continue anyway?',
        onOk: () => {
          goToNextStep();
        },
      });
    } else {
      goToNextStep();
    }
  };

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  // Handle completion
  const handleComplete = () => {
    Modal.success({
      title: 'Work Instruction Complete!',
      content: 'All steps have been completed successfully.',
      onOk: () => {
        stopExecution();
        navigate('/work-instructions');
      },
    });
  };

  // Check if all steps are complete
  const allStepsComplete = completedSteps.size === totalSteps;

  if (isLoadingDetail) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spin size="large" tip="Loading work instruction..."><div /></Spin>
      </div>
    );
  }

  if (!executionMode || !currentWorkInstruction || !currentStep) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        <Card>
          <p>Work instruction not found or execution mode not started.</p>
          <Button type="primary" onClick={() => navigate('/work-instructions')}>
            Back to List
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#f0f2f5',
        overflow: 'hidden',
      }}
    >
      {/* Header - 10% */}
      <div
        style={{
          background: '#fff',
          padding: '16px 24px',
          borderBottom: '2px solid #e8e8e8',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ flex: 1 }}>
          <Title level={3} style={{ margin: 0 }}>
            {currentWorkInstruction.title}
          </Title>
          <Text type="secondary">Version {currentWorkInstruction.version}</Text>
        </div>

        <Space size="middle">
          <Button
            size="large"
            icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            onClick={toggleFullscreen}
          >
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </Button>
          <Button
            size="large"
            danger
            icon={<CloseOutlined />}
            onClick={handleExit}
          >
            Exit
          </Button>
        </Space>
      </div>

      {/* Progress Bar */}
      <div style={{ padding: '16px 24px', background: '#fff', borderBottom: '1px solid #e8e8e8' }}>
        <ProgressIndicator
          currentStep={currentStepIndex}
          totalSteps={totalSteps}
          completedSteps={completedSteps}
          size="large"
        />
      </div>

      {/* Content - 75% */}
      <div
        style={{
          flex: 1,
          padding: '24px',
          overflowY: 'auto',
        }}
      >
        <Card
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            minHeight: '100%',
          }}
        >
          {/* Step Header */}
          <div style={{ marginBottom: '24px' }}>
            <Space size="middle" align="center">
              <Title level={2} style={{ margin: 0 }}>
                {currentStep.title}
              </Title>
              {currentStep.isCritical && (
                <Tag color="red" icon={<ExclamationCircleOutlined />} style={{ fontSize: '16px', padding: '8px 16px' }}>
                  CRITICAL STEP
                </Tag>
              )}
            </Space>
          </div>

          {/* Step Instructions */}
          <Card
            type="inner"
            style={{ marginBottom: '24px', background: '#fafafa' }}
          >
            <Paragraph
              style={{
                fontSize: '18px',
                lineHeight: '1.8',
                whiteSpace: 'pre-wrap',
                marginBottom: 0,
              }}
            >
              {currentStep.content}
            </Paragraph>
          </Card>

          {/* Media Section */}
          {(currentStep.imageUrls?.length > 0 ||
            currentStep.videoUrls?.length > 0 ||
            currentStep.attachmentUrls?.length > 0) && (
            <div style={{ marginBottom: '24px' }}>
              <Title level={4}>Reference Materials</Title>

              {/* Images */}
              {currentStep.imageUrls && currentStep.imageUrls.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <Text strong style={{ display: 'block', marginBottom: '12px' }}>
                    <FileImageOutlined /> Images
                  </Text>
                  <Image.PreviewGroup>
                    <Space size="middle" wrap>
                      {currentStep.imageUrls.map((url, index) => (
                        <Image
                          key={index}
                          src={url}
                          alt={`Step ${currentStep.stepNumber} - Image ${index + 1}`}
                          width={200}
                          height={150}
                          style={{ objectFit: 'cover', borderRadius: '8px' }}
                        />
                      ))}
                    </Space>
                  </Image.PreviewGroup>
                </div>
              )}

              {/* Videos */}
              {currentStep.videoUrls && currentStep.videoUrls.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <Text strong style={{ display: 'block', marginBottom: '12px' }}>
                    <VideoCameraOutlined /> Videos
                  </Text>
                  <Space direction="vertical" size="middle">
                    {currentStep.videoUrls.map((url, index) => (
                      <video
                        key={index}
                        controls
                        style={{ maxWidth: '100%', borderRadius: '8px' }}
                      >
                        <source src={url} />
                        Your browser does not support the video tag.
                      </video>
                    ))}
                  </Space>
                </div>
              )}

              {/* Attachments */}
              {currentStep.attachmentUrls && currentStep.attachmentUrls.length > 0 && (
                <div>
                  <Text strong style={{ display: 'block', marginBottom: '12px' }}>
                    <FileTextOutlined /> Documents
                  </Text>
                  <Space direction="vertical" size="small">
                    {currentStep.attachmentUrls.map((url, index) => (
                      <Button
                        key={index}
                        type="link"
                        href={url}
                        target="_blank"
                        icon={<FileTextOutlined />}
                      >
                        Attachment {index + 1}
                      </Button>
                    ))}
                  </Space>
                </div>
              )}
            </div>
          )}

          {/* Estimated Duration */}
          {currentStep.estimatedDuration && (
            <div style={{ marginBottom: '24px' }}>
              <Text type="secondary">
                Estimated Duration: {Math.floor(currentStep.estimatedDuration / 60)} min{' '}
                {currentStep.estimatedDuration % 60} sec
              </Text>
            </div>
          )}

          {/* Step Completion Checkbox */}
          <div
            style={{
              marginTop: '32px',
              padding: '24px',
              background: stepCompleted ? '#f6ffed' : '#fff',
              border: `2px solid ${stepCompleted ? '#52c41a' : '#d9d9d9'}`,
              borderRadius: '8px',
            }}
          >
            <Checkbox
              checked={stepCompleted}
              onChange={(e) => handleStepCompletionToggle(e.target.checked)}
              style={{ fontSize: '20px' }}
            >
              <Text strong style={{ fontSize: '18px', marginLeft: '8px' }}>
                {stepCompleted ? (
                  <span style={{ color: '#52c41a' }}>
                    <CheckCircleOutlined /> Step Completed
                  </span>
                ) : (
                  'Mark this step as complete'
                )}
              </Text>
            </Checkbox>
          </div>
        </Card>
      </div>

      {/* Footer - Navigation - 15% */}
      <div
        style={{
          background: '#fff',
          padding: '24px',
          borderTop: '2px solid #e8e8e8',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {allStepsComplete ? (
            <Button
              type="primary"
              size="large"
              block
              icon={<CheckCircleOutlined />}
              onClick={handleComplete}
              style={{ height: '64px', fontSize: '20px' }}
            >
              Complete Work Instruction
            </Button>
          ) : (
            <StepNavigation
              currentStepIndex={currentStepIndex}
              totalSteps={totalSteps}
              onPrevious={goToPreviousStep}
              onNext={handleNext}
              onJumpToStep={goToStep}
              completedSteps={completedSteps}
              size="large"
              showJumpMenu={true}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default TabletExecutionView;
