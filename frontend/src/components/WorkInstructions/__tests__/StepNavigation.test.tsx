import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import StepNavigation from '../StepNavigation';

// Mock antd components
vi.mock('antd', () => ({
  Button: ({ type, size, disabled, onClick, icon, iconPosition, style, children, ...props }: any) => (
    <button
      data-testid={`button-${type || 'default'}`}
      data-size={size}
      disabled={disabled}
      onClick={onClick}
      data-icon-position={iconPosition}
      style={style}
      {...props}
    >
      {icon && <span data-testid="button-icon">{icon}</span>}
      {children}
    </button>
  ),
  Space: ({ children }: any) => <div data-testid="space">{children}</div>,
  Select: Object.assign(
    ({ value, onChange, style, size, suffixIcon, children }: any) => (
      <select
        data-testid="select"
        value={value}
        onChange={(e) => onChange?.(parseInt(e.target.value))}
        data-size={size}
        style={style}
      >
        {suffixIcon && <span data-testid="suffix-icon">{suffixIcon}</span>}
        {children}
      </select>
    ),
    {
      Option: ({ value, children }: any) => (
        <option value={value}>{children}</option>
      )
    }
  ),
  Tooltip: ({ title, children }: any) => (
    <div data-testid="tooltip" title={title}>
      {children}
    </div>
  )
}));

// Mock antd icons
vi.mock('@ant-design/icons', () => ({
  LeftOutlined: ({ style }: any) => (
    <span data-testid="left-icon" style={style}>←</span>
  ),
  RightOutlined: ({ style }: any) => (
    <span data-testid="right-icon" style={style}>→</span>
  ),
  UnorderedListOutlined: ({ style }: any) => (
    <span data-testid="list-icon" style={style}>☰</span>
  )
}));

describe('StepNavigation', () => {
  const defaultProps = {
    currentStepIndex: 1,
    totalSteps: 5,
    onPrevious: vi.fn(),
    onNext: vi.fn(),
    onJumpToStep: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup(); // Clean up DOM between tests
  });

  describe('basic rendering', () => {
    it('should render with default props', () => {
      render(<StepNavigation {...defaultProps} />);

      expect(screen.getByTestId('button-default')).toBeInTheDocument(); // Previous button
      expect(screen.getByTestId('button-primary')).toBeInTheDocument(); // Next button
      expect(screen.getByTestId('select')).toBeInTheDocument(); // Jump menu
    });

    it('should render without jump menu when disabled', () => {
      render(
        <StepNavigation
          {...defaultProps}
          showJumpMenu={false}
        />
      );

      expect(screen.getByTestId('button-default')).toBeInTheDocument();
      expect(screen.getByTestId('button-primary')).toBeInTheDocument();
      expect(screen.queryByTestId('select')).not.toBeInTheDocument();
    });

    it('should not show jump menu for 2 or fewer steps', () => {
      render(
        <StepNavigation
          {...defaultProps}
          totalSteps={2}
          showJumpMenu={true}
        />
      );

      expect(screen.queryByTestId('select')).not.toBeInTheDocument();
    });

    it('should render with completedSteps', () => {
      render(
        <StepNavigation
          {...defaultProps}
          completedSteps={new Set([0, 1])}
        />
      );

      expect(screen.getByTestId('select')).toBeInTheDocument();
    });
  });

  describe('button state logic', () => {
    it('should disable previous button at first step', () => {
      render(
        <StepNavigation
          {...defaultProps}
          currentStepIndex={0}
        />
      );

      const prevButton = screen.getByTestId('button-default');
      expect(prevButton).toBeDisabled();
    });

    it('should enable previous button when not at first step', () => {
      render(
        <StepNavigation
          {...defaultProps}
          currentStepIndex={2}
        />
      );

      const prevButton = screen.getByTestId('button-default');
      expect(prevButton).not.toBeDisabled();
    });

    it('should disable next button at last step', () => {
      render(
        <StepNavigation
          {...defaultProps}
          currentStepIndex={4}
          totalSteps={5}
        />
      );

      const nextButton = screen.getByTestId('button-primary');
      expect(nextButton).toBeDisabled();
    });

    it('should enable next button when not at last step', () => {
      render(
        <StepNavigation
          {...defaultProps}
          currentStepIndex={2}
        />
      );

      const nextButton = screen.getByTestId('button-primary');
      expect(nextButton).not.toBeDisabled();
    });

    it('should handle single step scenario', () => {
      render(
        <StepNavigation
          {...defaultProps}
          currentStepIndex={0}
          totalSteps={1}
        />
      );

      const prevButton = screen.getByTestId('button-default');
      const nextButton = screen.getByTestId('button-primary');

      expect(prevButton).toBeDisabled();
      expect(nextButton).toBeDisabled();
    });
  });

  describe('size variants', () => {
    it('should render with small size', () => {
      render(
        <StepNavigation
          {...defaultProps}
          size="small"
        />
      );

      const prevButton = screen.getByTestId('button-default');
      const nextButton = screen.getByTestId('button-primary');
      const select = screen.getByTestId('select');

      expect(prevButton).toHaveAttribute('data-size', 'small');
      expect(nextButton).toHaveAttribute('data-size', 'small');
      expect(select).toHaveAttribute('data-size', 'small');
    });

    it('should render with default size', () => {
      render(
        <StepNavigation
          {...defaultProps}
          size="default"
        />
      );

      const prevButton = screen.getByTestId('button-default');
      const nextButton = screen.getByTestId('button-primary');

      expect(prevButton).toHaveAttribute('data-size', 'default');
      expect(nextButton).toHaveAttribute('data-size', 'default');
    });

    it('should render with large size', () => {
      render(
        <StepNavigation
          {...defaultProps}
          size="large"
        />
      );

      const prevButton = screen.getByTestId('button-default');
      const nextButton = screen.getByTestId('button-primary');

      expect(prevButton).toHaveAttribute('data-size', 'large');
      expect(nextButton).toHaveAttribute('data-size', 'large');
    });

    it('should apply correct button height for small size', () => {
      render(
        <StepNavigation
          {...defaultProps}
          size="small"
        />
      );

      const prevButton = screen.getByTestId('button-default');
      expect(prevButton).toHaveStyle({ height: '40px' });
    });

    it('should apply correct button height for default size', () => {
      render(
        <StepNavigation
          {...defaultProps}
          size="default"
        />
      );

      const prevButton = screen.getByTestId('button-default');
      expect(prevButton).toHaveStyle({ height: '48px' });
    });

    it('should apply correct button height for large size', () => {
      render(
        <StepNavigation
          {...defaultProps}
          size="large"
        />
      );

      const prevButton = screen.getByTestId('button-default');
      expect(prevButton).toHaveStyle({ height: '64px' });
    });

    it('should apply correct icon size for small', () => {
      render(
        <StepNavigation
          {...defaultProps}
          size="small"
        />
      );

      const leftIcon = screen.getByTestId('left-icon');
      const rightIcon = screen.getByTestId('right-icon');

      expect(leftIcon).toHaveStyle({ fontSize: '16px' });
      expect(rightIcon).toHaveStyle({ fontSize: '16px' });
    });

    it('should apply correct icon size for large', () => {
      render(
        <StepNavigation
          {...defaultProps}
          size="large"
        />
      );

      const leftIcon = screen.getByTestId('left-icon');
      const rightIcon = screen.getByTestId('right-icon');

      expect(leftIcon).toHaveStyle({ fontSize: '28px' });
      expect(rightIcon).toHaveStyle({ fontSize: '28px' });
    });
  });

  describe('button text display', () => {
    it('should show button text for default size', () => {
      render(
        <StepNavigation
          {...defaultProps}
          size="default"
        />
      );

      expect(screen.getByText('Previous')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    it('should show button text for large size', () => {
      render(
        <StepNavigation
          {...defaultProps}
          size="large"
        />
      );

      expect(screen.getByText('Previous')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    it('should hide button text for small size', () => {
      render(
        <StepNavigation
          {...defaultProps}
          size="small"
        />
      );

      expect(screen.queryByText('Previous')).not.toBeInTheDocument();
      expect(screen.queryByText('Next')).not.toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    it('should call onPrevious when previous button is clicked', () => {
      render(
        <StepNavigation
          {...defaultProps}
          currentStepIndex={2}
        />
      );

      const prevButton = screen.getByTestId('button-default');
      fireEvent.click(prevButton);

      expect(defaultProps.onPrevious).toHaveBeenCalledTimes(1);
    });

    it('should call onNext when next button is clicked', () => {
      render(
        <StepNavigation
          {...defaultProps}
          currentStepIndex={2}
        />
      );

      const nextButton = screen.getByTestId('button-primary');
      fireEvent.click(nextButton);

      expect(defaultProps.onNext).toHaveBeenCalledTimes(1);
    });

    it('should call onJumpToStep when select value changes', () => {
      render(<StepNavigation {...defaultProps} />);

      const select = screen.getByTestId('select');
      fireEvent.change(select, { target: { value: '3' } });

      expect(defaultProps.onJumpToStep).toHaveBeenCalledWith(3);
    });

    it('should not call onPrevious when previous button is disabled', () => {
      render(
        <StepNavigation
          {...defaultProps}
          currentStepIndex={0}
        />
      );

      const prevButton = screen.getByTestId('button-default');
      fireEvent.click(prevButton);

      expect(defaultProps.onPrevious).not.toHaveBeenCalled();
    });

    it('should not call onNext when next button is disabled', () => {
      render(
        <StepNavigation
          {...defaultProps}
          currentStepIndex={4}
          totalSteps={5}
        />
      );

      const nextButton = screen.getByTestId('button-primary');
      fireEvent.click(nextButton);

      expect(defaultProps.onNext).not.toHaveBeenCalled();
    });
  });

  describe('tooltip titles', () => {
    it('should show correct tooltip for enabled previous button', () => {
      render(
        <StepNavigation
          {...defaultProps}
          currentStepIndex={2}
        />
      );

      const tooltips = screen.getAllByTestId('tooltip');
      const prevTooltip = tooltips[0];
      expect(prevTooltip).toHaveAttribute('title', 'Go to previous step');
    });

    it('should show correct tooltip for disabled previous button', () => {
      render(
        <StepNavigation
          {...defaultProps}
          currentStepIndex={0}
        />
      );

      const tooltips = screen.getAllByTestId('tooltip');
      const prevTooltip = tooltips[0];
      expect(prevTooltip).toHaveAttribute('title', 'Already at first step');
    });

    it('should show correct tooltip for enabled next button', () => {
      render(
        <StepNavigation
          {...defaultProps}
          currentStepIndex={2}
        />
      );

      const tooltips = screen.getAllByTestId('tooltip');
      const nextTooltip = tooltips[tooltips.length - 1];
      expect(nextTooltip).toHaveAttribute('title', 'Go to next step');
    });

    it('should show correct tooltip for disabled next button', () => {
      render(
        <StepNavigation
          {...defaultProps}
          currentStepIndex={4}
          totalSteps={5}
        />
      );

      const tooltips = screen.getAllByTestId('tooltip');
      const nextTooltip = tooltips[tooltips.length - 1];
      expect(nextTooltip).toHaveAttribute('title', 'Already at last step');
    });
  });

  describe('select dropdown', () => {
    it('should set correct select value', () => {
      render(
        <StepNavigation
          {...defaultProps}
          currentStepIndex={3}
        />
      );

      const select = screen.getByTestId('select');
      expect(select).toHaveValue('3');
    });

    it('should render all step options', () => {
      render(<StepNavigation {...defaultProps} />);

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(5); // totalSteps = 5
    });

    it('should show completed step indicators', () => {
      render(
        <StepNavigation
          {...defaultProps}
          completedSteps={new Set([0, 1, 2])}
        />
      );

      // Check that completed steps show checkmarks
      const checkmarks = screen.getAllByText('✓');
      expect(checkmarks).toHaveLength(3); // 3 completed steps
    });
  });

  describe('button styling', () => {
    it('should apply correct min width for large buttons', () => {
      render(
        <StepNavigation
          {...defaultProps}
          size="large"
        />
      );

      const prevButton = screen.getByTestId('button-default');
      const nextButton = screen.getByTestId('button-primary');

      expect(prevButton).toHaveStyle({ minWidth: '120px' });
      expect(nextButton).toHaveStyle({ minWidth: '120px' });
    });

    it('should apply correct min width for small buttons', () => {
      render(
        <StepNavigation
          {...defaultProps}
          size="small"
        />
      );

      const prevButton = screen.getByTestId('button-default');
      const nextButton = screen.getByTestId('button-primary');

      expect(prevButton).toHaveStyle({ minWidth: '80px' });
      expect(nextButton).toHaveStyle({ minWidth: '80px' });
    });

    it('should apply correct font size for large buttons', () => {
      render(
        <StepNavigation
          {...defaultProps}
          size="large"
        />
      );

      const prevButton = screen.getByTestId('button-default');
      expect(prevButton).toHaveStyle({ fontSize: '18px' });
    });

    it('should apply correct font size for default buttons', () => {
      render(
        <StepNavigation
          {...defaultProps}
          size="default"
        />
      );

      const prevButton = screen.getByTestId('button-default');
      expect(prevButton).toHaveStyle({ fontSize: '14px' });
    });
  });

  describe('edge cases', () => {
    it('should handle zero total steps', () => {
      render(
        <StepNavigation
          {...defaultProps}
          totalSteps={0}
          currentStepIndex={0}
        />
      );

      const prevButton = screen.getByTestId('button-default');
      const nextButton = screen.getByTestId('button-primary');

      // With 0 total steps: isFirstStep = 0 === 0 (true), isLastStep = 0 === -1 (false)
      expect(prevButton).toBeDisabled();
      expect(nextButton).not.toBeDisabled();
    });

    it('should handle negative current step index', () => {
      render(
        <StepNavigation
          {...defaultProps}
          currentStepIndex={-1}
        />
      );

      // With -1 step: isFirstStep = -1 === 0 (false), so button is enabled
      const prevButton = screen.getByTestId('button-default');
      expect(prevButton).not.toBeDisabled();
    });

    it('should handle current step index greater than total steps', () => {
      render(
        <StepNavigation
          {...defaultProps}
          currentStepIndex={10}
          totalSteps={5}
        />
      );

      // With step 10 of 5: isLastStep = 10 === 4 (false), so button is enabled
      const nextButton = screen.getByTestId('button-primary');
      expect(nextButton).not.toBeDisabled();
    });

    it('should handle empty completedSteps set', () => {
      render(
        <StepNavigation
          {...defaultProps}
          completedSteps={new Set()}
        />
      );

      // Should not show any checkmarks
      expect(screen.queryByText('✓')).not.toBeInTheDocument();
    });
  });

  describe('icon positioning', () => {
    it('should position icons correctly', () => {
      render(<StepNavigation {...defaultProps} />);

      const nextButton = screen.getByTestId('button-primary');
      expect(nextButton).toHaveAttribute('data-icon-position', 'end');
    });
  });
});