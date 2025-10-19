import React from 'react';
import { Button, Space, Select, Tooltip } from 'antd';
import {
  LeftOutlined,
  RightOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';

const { Option } = Select;

interface StepNavigationProps {
  currentStepIndex: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
  onJumpToStep: (stepIndex: number) => void;
  completedSteps?: Set<number>;
  size?: 'small' | 'default' | 'large';
  showJumpMenu?: boolean;
}

/**
 * Step Navigation Component
 *
 * Provides touch-optimized navigation controls for work instruction execution
 */
export const StepNavigation: React.FC<StepNavigationProps> = ({
  currentStepIndex,
  totalSteps,
  onPrevious,
  onNext,
  onJumpToStep,
  completedSteps = new Set(),
  size = 'large',
  showJumpMenu = true,
}) => {
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  // Button height based on size
  const getButtonHeight = () => {
    switch (size) {
      case 'small':
        return '40px';
      case 'large':
        return '64px';
      default:
        return '48px';
    }
  };

  const buttonHeight = getButtonHeight();

  // Button icon size based on size
  const getIconSize = () => {
    switch (size) {
      case 'small':
        return '16px';
      case 'large':
        return '28px';
      default:
        return '20px';
    }
  };

  const iconSize = getIconSize();

  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        width: '100%',
      }}
    >
      {/* Previous Button */}
      <Tooltip title={isFirstStep ? 'Already at first step' : 'Go to previous step'}>
        <Button
          type="default"
          size={size}
          disabled={isFirstStep}
          onClick={onPrevious}
          icon={<LeftOutlined style={{ fontSize: iconSize }} />}
          style={{
            height: buttonHeight,
            minWidth: size === 'large' ? '120px' : '80px',
            fontSize: size === 'large' ? '18px' : '14px',
          }}
        >
          {size !== 'small' && 'Previous'}
        </Button>
      </Tooltip>

      {/* Jump to Step Dropdown (optional) */}
      {showJumpMenu && totalSteps > 2 && (
        <Select
          value={currentStepIndex}
          onChange={onJumpToStep}
          style={{
            flex: 1,
            minWidth: '150px',
          }}
          size={size}
          suffixIcon={<UnorderedListOutlined style={{ fontSize: iconSize }} />}
        >
          {Array.from({ length: totalSteps }).map((_, index) => (
            <Option key={index} value={index}>
              <Space>
                <span>Step {index + 1}</span>
                {completedSteps.has(index) && (
                  <span style={{ color: '#52c41a' }}>✓</span>
                )}
              </Space>
            </Option>
          ))}
        </Select>
      )}

      {/* Next Button */}
      <Tooltip title={isLastStep ? 'Already at last step' : 'Go to next step'}>
        <Button
          type="primary"
          size={size}
          disabled={isLastStep}
          onClick={onNext}
          icon={<RightOutlined style={{ fontSize: iconSize }} />}
          iconPosition="end"
          style={{
            height: buttonHeight,
            minWidth: size === 'large' ? '120px' : '80px',
            fontSize: size === 'large' ? '18px' : '14px',
          }}
        >
          {size !== 'small' && 'Next'}
        </Button>
      </Tooltip>
    </div>
  );
};

export default StepNavigation;
