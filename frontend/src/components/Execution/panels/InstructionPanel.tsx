/**
 * InstructionPanel
 *
 * GitHub Issue #19: Configurable Side-by-Side Execution Interface
 *
 * Enhanced instruction display panel with rich content, step navigation,
 * and interactive features for work instruction execution.
 */

import React, { useEffect, useState } from 'react';
import { Button, Card, Steps, Typography, Tag, Alert, Progress, Space } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  LeftOutlined,
  RightOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useExecutionLayoutStore, useExecutionSession, useStepTimer } from '@/store/executionLayoutStore';
import styles from './InstructionPanel.module.css';

const { Title, Paragraph } = Typography;

interface InstructionPanelProps {
  step: any; // StepData from store
  session: any; // ExecutionSession from store
  isCollapsed?: boolean;
}

export const InstructionPanel: React.FC<InstructionPanelProps> = ({
  step,
  session,
  isCollapsed = false,
}) => {
  const { currentStepNumber, totalSteps } = useExecutionSession();
  const { stepElapsedTime, isRunning } = useStepTimer();

  const {
    goToNextStep,
    goToPreviousStep,
    navigateToStep,
    markStepComplete,
    markStepIncomplete,
    updateStepTimer,
  } = useExecutionLayoutStore();

  const [localTimer, setLocalTimer] = useState(0);

  // Update timer display
  useEffect(() => {
    if (isRunning) {
      const interval = setInterval(() => {
        updateStepTimer();
        setLocalTimer(stepElapsedTime);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isRunning, stepElapsedTime, updateStepTimer]);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progressPercent = totalSteps > 0 ? Math.round(((currentStepNumber - 1) / totalSteps) * 100) : 0;

  // Get step status color
  const getStepStatus = (stepNum: number) => {
    const stepData = session?.steps?.find((s: any) => s.stepNumber === stepNum);
    if (!stepData) return 'wait';
    if (stepData.isCompleted) return 'finish';
    if (stepNum === currentStepNumber) return 'process';
    return 'wait';
  };

  // Handle step completion toggle
  const handleStepToggle = () => {
    if (step.isCompleted) {
      markStepIncomplete(step.stepNumber);
    } else {
      markStepComplete(step.stepNumber);
    }
  };

  if (isCollapsed) {
    return (
      <div className={styles.collapsedView}>
        <div className={styles.collapsedContent}>
          <div className={styles.stepNumber}>{currentStepNumber}</div>
          <div className={styles.stepTitle}>{step?.title}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Progress Header */}
      <div className={styles.progressHeader}>
        <div className={styles.progressInfo}>
          <Title level={4} style={{ margin: 0 }}>
            Step {currentStepNumber} of {totalSteps}
          </Title>
          <Progress
            percent={progressPercent}
            size="small"
            showInfo={false}
            strokeColor="#1890ff"
          />
        </div>

        {isRunning && (
          <div className={styles.timer}>
            <ClockCircleOutlined />
            <span>{formatTime(localTimer)}</span>
            {step.estimatedDuration && (
              <span className={styles.estimate}>
                / {formatTime(step.estimatedDuration)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Step Navigation */}
      <div className={styles.stepNavigation}>
        <Button
          icon={<LeftOutlined />}
          onClick={goToPreviousStep}
          disabled={currentStepNumber <= 1}
          size="small"
        >
          Previous
        </Button>

        <Steps
          current={currentStepNumber - 1}
          size="small"
          className={styles.miniSteps}
          onChange={(current) => navigateToStep(current + 1)}
        >
          {session?.steps?.map((s: any) => (
            <Steps.Step
              key={s.stepNumber}
              status={getStepStatus(s.stepNumber)}
              title={`Step ${s.stepNumber}`}
              icon={s.isCritical ? <WarningOutlined /> : undefined}
            />
          ))}
        </Steps>

        <Button
          icon={<RightOutlined />}
          onClick={goToNextStep}
          disabled={currentStepNumber >= totalSteps}
          size="small"
        >
          Next
        </Button>
      </div>

      {/* Step Content */}
      <div className={styles.stepContent}>
        <Card
          title={
            <Space>
              <span>{step.title}</span>
              {step.isCritical && (
                <Tag color="red" icon={<WarningOutlined />}>
                  Critical
                </Tag>
              )}
              {step.requiresSignature && (
                <Tag color="orange" icon={<EditOutlined />}>
                  Signature Required
                </Tag>
              )}
            </Space>
          }
          extra={
            <Button
              type={step.isCompleted ? 'default' : 'primary'}
              icon={<CheckCircleOutlined />}
              onClick={handleStepToggle}
            >
              {step.isCompleted ? 'Mark Incomplete' : 'Mark Complete'}
            </Button>
          }
          className={styles.stepCard}
        >
          {/* Step warnings/alerts */}
          {step.isCritical && (
            <Alert
              message="Critical Step"
              description="This step is critical to product quality and safety. Follow instructions carefully."
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          {step.requiresSignature && (
            <Alert
              message="Signature Required"
              description="This step requires supervisor approval and signature upon completion."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          {/* Main instruction content */}
          <div className={styles.instructionContent}>
            <Paragraph>
              {step.content}
            </Paragraph>

            {/* Placeholder for rich content */}
            {/* TODO: Add support for images, videos, diagrams */}
            <div className={styles.mediaContent}>
              {/* Rich media content would go here */}
              <div className={styles.placeholder}>
                <p>📄 Rich content display (images, videos, diagrams) will be implemented here</p>
              </div>
            </div>

            {/* Step duration info */}
            {step.estimatedDuration && (
              <div className={styles.durationInfo}>
                <ClockCircleOutlined />
                <span>Estimated time: {formatTime(step.estimatedDuration)}</span>
              </div>
            )}
          </div>

          {/* Step completion status */}
          {step.isCompleted && (
            <div className={styles.completionStatus}>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              <span>Step completed</span>
            </div>
          )}
        </Card>
      </div>

      {/* Quick actions */}
      <div className={styles.quickActions}>
        <Space>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={handleStepToggle}
            disabled={step.isCompleted}
          >
            Complete Step
          </Button>
          {currentStepNumber < totalSteps && (
            <Button
              onClick={goToNextStep}
              disabled={!step.isCompleted}
            >
              Next Step
            </Button>
          )}
        </Space>
      </div>
    </div>
  );
};

export default InstructionPanel;