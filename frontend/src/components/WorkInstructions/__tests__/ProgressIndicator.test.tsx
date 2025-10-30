import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProgressIndicator from '../ProgressIndicator';

// Mock antd components
vi.mock('antd', () => ({
  Progress: ({ percent, strokeColor, strokeWidth, showInfo, ...props }: any) => (
    <div
      data-testid="progress"
      data-percent={percent}
      data-stroke-color={strokeColor}
      data-stroke-width={strokeWidth}
      data-show-info={showInfo}
      {...props}
    />
  ),
  Space: ({ direction, size, style, children }: any) => (
    <div
      data-testid="space"
      data-direction={direction}
      data-size={size}
      style={style}
    >
      {children}
    </div>
  ),
  Typography: {
    Text: ({ strong, style, children, ...props }: any) => (
      <span
        data-testid={strong ? "text-strong" : "text"}
        style={style}
        {...props}
      >
        {children}
      </span>
    )
  }
}));

// Mock antd icons
vi.mock('@ant-design/icons', () => ({
  CheckCircleFilled: ({ style, ...props }: any) => (
    <span data-testid="check-icon" style={style} {...props}>
      ✓
    </span>
  )
}));

describe('ProgressIndicator', () => {
  const defaultProps = {
    currentStep: 2,
    totalSteps: 5,
    completedSteps: new Set([0, 1, 2])
  };

  afterEach(() => {
    cleanup(); // Clean up DOM between tests
  });

  describe('basic rendering', () => {
    it('should render with default props', () => {
      render(<ProgressIndicator {...defaultProps} />);

      expect(screen.getByTestId('progress')).toBeInTheDocument();
      expect(screen.getByText('Step 3 of 5')).toBeInTheDocument();
      expect(screen.getByText('3/5 completed')).toBeInTheDocument();
    });

    it('should render without showPercentage when disabled', () => {
      render(
        <ProgressIndicator
          {...defaultProps}
          showPercentage={false}
        />
      );

      expect(screen.getByText('Step 3 of 5')).toBeInTheDocument();
      expect(screen.queryByText('3/5 completed')).not.toBeInTheDocument();
    });

    it('should render with empty completedSteps set', () => {
      render(
        <ProgressIndicator
          {...defaultProps}
          completedSteps={new Set()}
        />
      );

      expect(screen.getByText('Step 3 of 5')).toBeInTheDocument();
      expect(screen.getByText('0/5 completed')).toBeInTheDocument();
    });
  });

  describe('progress calculation', () => {
    it('should calculate correct percentage for partial progress', () => {
      render(<ProgressIndicator {...defaultProps} />);

      const progress = screen.getByTestId('progress');
      expect(progress).toHaveAttribute('data-percent', '60'); // 3/5 = 60%
    });

    it('should handle zero total steps', () => {
      render(
        <ProgressIndicator
          currentStep={0}
          totalSteps={0}
          completedSteps={new Set()}
        />
      );

      const progress = screen.getByTestId('progress');
      expect(progress).toHaveAttribute('data-percent', '0');
    });

    it('should handle 100% completion', () => {
      render(
        <ProgressIndicator
          currentStep={4}
          totalSteps={5}
          completedSteps={new Set([0, 1, 2, 3, 4])}
        />
      );

      const progress = screen.getByTestId('progress');
      expect(progress).toHaveAttribute('data-percent', '100');
    });

    it('should round percentage correctly', () => {
      render(
        <ProgressIndicator
          currentStep={1}
          totalSteps={3}
          completedSteps={new Set([0])}
        />
      );

      const progress = screen.getByTestId('progress');
      expect(progress).toHaveAttribute('data-percent', '33'); // 1/3 ≈ 33%
    });
  });

  describe('color logic', () => {
    it('should use orange color for low progress', () => {
      render(
        <ProgressIndicator
          currentStep={0}
          totalSteps={5}
          completedSteps={new Set([0])}
        />
      );

      const progress = screen.getByTestId('progress');
      expect(progress).toHaveAttribute('data-stroke-color', '#faad14'); // 20% - orange
    });

    it('should use blue color for medium progress', () => {
      render(<ProgressIndicator {...defaultProps} />);

      const progress = screen.getByTestId('progress');
      expect(progress).toHaveAttribute('data-stroke-color', '#1890ff'); // 60% - blue
    });

    it('should use green color for 100% completion', () => {
      render(
        <ProgressIndicator
          currentStep={4}
          totalSteps={5}
          completedSteps={new Set([0, 1, 2, 3, 4])}
        />
      );

      const progress = screen.getByTestId('progress');
      expect(progress).toHaveAttribute('data-stroke-color', '#52c41a'); // 100% - green
    });

    it('should use blue color for exactly 50% progress', () => {
      render(
        <ProgressIndicator
          currentStep={2}
          totalSteps={4}
          completedSteps={new Set([0, 1])}
        />
      );

      const progress = screen.getByTestId('progress');
      expect(progress).toHaveAttribute('data-stroke-color', '#1890ff'); // 50% - blue
    });
  });

  describe('size variants', () => {
    it('should render with small size', () => {
      render(<ProgressIndicator {...defaultProps} size="small" />);

      const progress = screen.getByTestId('progress');
      expect(progress).toHaveAttribute('data-stroke-width', '6');

      const stepText = screen.getByTestId('text-strong');
      expect(stepText).toHaveStyle({ fontSize: '14px' });
    });

    it('should render with default size', () => {
      render(<ProgressIndicator {...defaultProps} size="default" />);

      const progress = screen.getByTestId('progress');
      expect(progress).toHaveAttribute('data-stroke-width', '8');

      const stepText = screen.getByTestId('text-strong');
      expect(stepText).toHaveStyle({ fontSize: '18px' });
    });

    it('should render with large size', () => {
      render(<ProgressIndicator {...defaultProps} size="large" />);

      const progress = screen.getByTestId('progress');
      expect(progress).toHaveAttribute('data-stroke-width', '12');

      const stepText = screen.getByTestId('text-strong');
      expect(stepText).toHaveStyle({ fontSize: '24px' });
    });

    it('should show percentage text for large size when enabled', () => {
      render(
        <ProgressIndicator
          {...defaultProps}
          size="large"
          showPercentage={true}
        />
      );

      expect(screen.getByText('60% Complete')).toBeInTheDocument();
    });

    it('should not show percentage text for non-large sizes', () => {
      render(
        <ProgressIndicator
          {...defaultProps}
          size="default"
          showPercentage={true}
        />
      );

      expect(screen.queryByText('60% Complete')).not.toBeInTheDocument();
    });
  });

  describe('completion state', () => {
    it('should show completion message when 100% complete', () => {
      render(
        <ProgressIndicator
          currentStep={4}
          totalSteps={5}
          completedSteps={new Set([0, 1, 2, 3, 4])}
        />
      );

      expect(screen.getByTestId('check-icon')).toBeInTheDocument();
      expect(screen.getByText('Complete!')).toBeInTheDocument();
      expect(screen.queryByText('Step 5 of 5')).not.toBeInTheDocument();
    });

    it('should apply correct styling to completion text', () => {
      render(
        <ProgressIndicator
          currentStep={4}
          totalSteps={5}
          completedSteps={new Set([0, 1, 2, 3, 4])}
        />
      );

      const completionText = screen.getByTestId('text-strong');
      expect(completionText).toHaveStyle({ color: '#52c41a' });
    });

    it('should apply normal styling to in-progress text', () => {
      render(<ProgressIndicator {...defaultProps} />);

      const stepText = screen.getByTestId('text-strong');
      expect(stepText).toHaveStyle({ color: '#262626' });
    });
  });

  describe('edge cases', () => {
    it('should handle currentStep greater than totalSteps', () => {
      render(
        <ProgressIndicator
          currentStep={10}
          totalSteps={5}
          completedSteps={new Set([0, 1, 2, 3, 4])}
        />
      );

      expect(screen.getByText('Complete!')).toBeInTheDocument();
    });

    it('should handle negative currentStep', () => {
      render(
        <ProgressIndicator
          currentStep={-1}
          totalSteps={5}
          completedSteps={new Set()}
        />
      );

      expect(screen.getByText('Step 0 of 5')).toBeInTheDocument();
    });

    it('should handle completedSteps larger than totalSteps', () => {
      render(
        <ProgressIndicator
          currentStep={2}
          totalSteps={3}
          completedSteps={new Set([0, 1, 2, 3, 4, 5])}
        />
      );

      const progress = screen.getByTestId('progress');
      expect(progress).toHaveAttribute('data-percent', '200'); // 6/3 = 200%
    });

    it('should handle single step workflow', () => {
      render(
        <ProgressIndicator
          currentStep={0}
          totalSteps={1}
          completedSteps={new Set([0])}
        />
      );

      expect(screen.getByText('Complete!')).toBeInTheDocument();
      expect(screen.getByText('1/1 completed')).toBeInTheDocument();
    });
  });

  describe('text content validation', () => {
    it('should display correct step counter format', () => {
      render(
        <ProgressIndicator
          currentStep={0}
          totalSteps={10}
          completedSteps={new Set()}
        />
      );

      expect(screen.getByText('Step 1 of 10')).toBeInTheDocument();
    });

    it('should display correct completion counter format', () => {
      render(
        <ProgressIndicator
          currentStep={7}
          totalSteps={15}
          completedSteps={new Set([0, 1, 2, 3, 4, 5, 6, 7])}
        />
      );

      expect(screen.getByText('8/15 completed')).toBeInTheDocument();
    });

    it('should display correct percentage text for large size', () => {
      render(
        <ProgressIndicator
          currentStep={2}
          totalSteps={8}
          completedSteps={new Set([0, 1, 2])}
          size="large"
        />
      );

      expect(screen.getByText('38% Complete')).toBeInTheDocument(); // 3/8 = 37.5% → 38%
    });
  });
});