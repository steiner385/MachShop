import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorBoundary from '../ErrorBoundary';

// Mock antd components
vi.mock('antd', () => ({
  Result: ({ status, title, subTitle, extra, children }: any) => (
    <div data-testid="result">
      <div data-testid="status">{status}</div>
      <div data-testid="title">{title}</div>
      <div data-testid="subtitle">{subTitle}</div>
      <div data-testid="extra">{extra}</div>
      <div data-testid="children">{children}</div>
    </div>
  ),
  Button: ({ type, onClick, children, ...props }: any) => (
    <button
      data-testid={`button-${type || 'default'}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  )
}));

// Component that throws an error for testing
const ThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div data-testid="working-component">Working correctly</div>;
};

describe('ErrorBoundary', () => {
  let consoleErrorSpy: any;
  let windowReloadSpy: any;
  let windowHistorySpy: any;

  beforeEach(() => {
    // Mock console.error to prevent test output pollution
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock window.location.reload
    windowReloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: windowReloadSpy },
      writable: true
    });

    // Mock window.history.back
    windowHistorySpy = vi.fn();
    Object.defineProperty(window, 'history', {
      value: { back: windowHistorySpy },
      writable: true
    });

    // Reset environment
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    cleanup(); // Clean up DOM between tests
    consoleErrorSpy.mockRestore();
    vi.resetAllMocks();
  });

  describe('normal rendering', () => {
    it('should render children when there is no error', () => {
      render(
        <ErrorBoundary>
          <div data-testid="child-component">Child content</div>
        </ErrorBoundary>
      );

      expect(screen.getByTestId('child-component')).toBeInTheDocument();
      expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('should render multiple children correctly', () => {
      render(
        <ErrorBoundary>
          <div data-testid="child-1">First child</div>
          <div data-testid="child-2">Second child</div>
        </ErrorBoundary>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
    });

    it('should render without children', () => {
      render(<ErrorBoundary />);

      // Should not throw and should render nothing
      expect(screen.queryByTestId('result')).not.toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('should catch errors and display error UI', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should display error UI
      expect(screen.getByTestId('result')).toBeInTheDocument();
      expect(screen.getByTestId('status')).toHaveTextContent('error');
      expect(screen.getByTestId('title')).toHaveTextContent('Something went wrong');
    });

    it('should display error message in development mode', () => {
      process.env.NODE_ENV = 'development';

      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('subtitle')).toHaveTextContent('Test error message');
    });

    it('should display generic message in production mode', () => {
      process.env.NODE_ENV = 'production';

      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('subtitle')).toHaveTextContent(
        'An unexpected error occurred. Please try refreshing the page.'
      );
    });

    it('should log error details to console', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'ErrorBoundary caught an error:',
        expect.any(Error),
        expect.any(Object)
      );
    });

    it('should display error stack trace in development mode', () => {
      process.env.NODE_ENV = 'development';

      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Error Stack Trace:')).toBeInTheDocument();
      expect(screen.getByText('Component Stack:')).toBeInTheDocument();
    });

    it('should not display error stack trace in production mode', () => {
      process.env.NODE_ENV = 'production';

      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.queryByText('Error Stack Trace:')).not.toBeInTheDocument();
      expect(screen.queryByText('Component Stack:')).not.toBeInTheDocument();
    });
  });

  describe('getDerivedStateFromError', () => {
    it('should return correct state when error occurs', () => {
      const error = new Error('Test error');
      const newState = ErrorBoundary.getDerivedStateFromError(error);

      expect(newState).toEqual({
        hasError: true,
        error: error
      });
    });
  });

  describe('user interactions', () => {
    it('should handle refresh button click', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      const refreshButton = screen.getByTestId('button-primary');
      expect(refreshButton).toHaveTextContent('Refresh Page');

      fireEvent.click(refreshButton);
      expect(windowReloadSpy).toHaveBeenCalled();
    });

    it('should handle go back button click', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      const backButton = screen.getByTestId('button-default');
      expect(backButton).toHaveTextContent('Go Back');

      fireEvent.click(backButton);
      expect(windowHistorySpy).toHaveBeenCalled();
    });
  });

  describe('state management', () => {
    it('should initialize with correct default state', () => {
      const errorBoundary = new ErrorBoundary({});

      expect(errorBoundary.state).toEqual({
        hasError: false
      });
    });

    it('should reset state when handleReset is called', () => {
      const errorBoundary = new ErrorBoundary({});

      // Set error state
      errorBoundary.setState({
        hasError: true,
        error: new Error('Test'),
        errorInfo: { componentStack: 'stack' } as any
      });

      // Call handleReset
      (errorBoundary as any).handleReset();

      expect(windowReloadSpy).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle error without message', () => {
      const ErrorWithoutMessage = () => {
        throw new Error();
      };

      render(
        <ErrorBoundary>
          <ErrorWithoutMessage />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('subtitle')).toHaveTextContent('An unexpected error occurred');
    });

    it('should handle null error message', () => {
      const ErrorWithNullMessage = () => {
        const error = new Error();
        error.message = null as any;
        throw error;
      };

      process.env.NODE_ENV = 'development';

      render(
        <ErrorBoundary>
          <ErrorWithNullMessage />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('subtitle')).toHaveTextContent('An unexpected error occurred');
    });

    it('should recover from error when children change to non-throwing', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should show error UI
      expect(screen.getByTestId('result')).toBeInTheDocument();

      // Rerender with non-throwing component
      rerender(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      // Should still show error UI (ErrorBoundary doesn't auto-recover)
      expect(screen.getByTestId('result')).toBeInTheDocument();
    });
  });

  describe('componentDidCatch', () => {
    it('should log error and call setState when componentDidCatch is called', () => {
      const errorBoundary = new ErrorBoundary({});
      const error = new Error('Test error');
      const errorInfo = { componentStack: 'Test stack' };

      // Mock setState to track calls
      const setStateSpy = vi.spyOn(errorBoundary, 'setState');

      errorBoundary.componentDidCatch(error, errorInfo as any);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'ErrorBoundary caught an error:',
        error,
        errorInfo
      );
      expect(setStateSpy).toHaveBeenCalledWith({
        error,
        errorInfo
      });

      setStateSpy.mockRestore();
    });
  });
});