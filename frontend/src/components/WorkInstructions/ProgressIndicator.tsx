import React from 'react';
import { Progress, Space, Typography } from 'antd';
import { CheckCircleFilled } from '@ant-design/icons';

const { Text } = Typography;

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  completedSteps: Set<number>;
  showPercentage?: boolean;
  size?: 'small' | 'default' | 'large';
}

/**
 * Progress Indicator Component
 *
 * Displays visual progress through work instruction steps
 */
export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
  completedSteps,
  showPercentage = true,
  size = 'default',
}) => {
  // Calculate progress percentage
  const completedCount = completedSteps.size;
  const progressPercent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  // Determine progress bar color
  const getProgressColor = () => {
    if (progressPercent === 100) return '#52c41a'; // Green for complete
    if (progressPercent >= 50) return '#1890ff'; // Blue for in progress
    return '#faad14'; // Orange for starting
  };

  // Text sizing based on size prop
  const getTextSize = () => {
    switch (size) {
      case 'small':
        return { stepText: 14, percentText: 12 };
      case 'large':
        return { stepText: 24, percentText: 18 };
      default:
        return { stepText: 18, percentText: 14 };
    }
  };

  const textSizes = getTextSize();

  return (
    <div style={{ width: '100%' }}>
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        {/* Step Counter */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text
            strong
            style={{
              fontSize: textSizes.stepText,
              color: progressPercent === 100 ? '#52c41a' : '#262626',
            }}
          >
            {progressPercent === 100 ? (
              <Space>
                <CheckCircleFilled style={{ color: '#52c41a' }} />
                <span>Complete!</span>
              </Space>
            ) : (
              `Step ${currentStep + 1} of ${totalSteps}`
            )}
          </Text>

          {showPercentage && (
            <Text
              style={{
                fontSize: textSizes.percentText,
                color: '#8c8c8c',
              }}
            >
              {completedCount}/{totalSteps} completed
            </Text>
          )}
        </div>

        {/* Progress Bar */}
        <Progress
          percent={progressPercent}
          strokeColor={getProgressColor()}
          strokeWidth={size === 'large' ? 12 : size === 'small' ? 6 : 8}
          showInfo={false}
        />

        {/* Percentage Text (if enabled and large size) */}
        {showPercentage && size === 'large' && (
          <Text
            style={{
              fontSize: textSizes.percentText,
              color: '#8c8c8c',
              textAlign: 'center',
              display: 'block',
            }}
          >
            {progressPercent}% Complete
          </Text>
        )}
      </Space>
    </div>
  );
};

export default ProgressIndicator;
