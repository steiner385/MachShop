/**
 * ErrorBoundaryExample - Error handling and boundary example
 *
 * This example demonstrates:
 * - Error boundary component implementation
 * - Fallback UI for error states
 * - Error logging and reporting
 * - User feedback mechanisms
 * - Recovery options
 * - Error boundary usage patterns
 *
 * @example
 * <ErrorBoundaryExample>
 *   <YourComponent />
 * </ErrorBoundaryExample>
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, Button, Alert, Space, Typography, Collapse } from 'antd';
import {
  WarningOutlined,
  ReloadOutlined,
  HomeOutlined,
  BugOutlined
} from '@ant-design/icons';
import styles from './ErrorBoundaryExample.module.css';

const { Title, Paragraph, Text } = Typography;
const { Panel } = Collapse;

/**
 * Error boundary props
 */
export interface ErrorBoundaryProps {
  /** Child components to render */
  children: ReactNode;

  /** Fallback UI when error occurs */
  fallback?: ReactNode;

  /** Callback when error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;

  /** Show error details in UI (for development) */
  showErrorDetails?: boolean;

  /** Enable error reporting to external service */
  enableReporting?: boolean;
}

/**
 * Error boundary state
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

/**
 * ErrorBoundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs the errors, and displays a fallback UI.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  /**
   * Update state when an error is caught
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Log error information
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { onError, enableReporting } = this.props;
    const { errorCount } = this.state;

    // Update error count
    this.setState({
      errorInfo,
      errorCount: errorCount + 1,
    });

    // Log to console
    console.error('Error Boundary caught an error:', error, errorInfo);

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // Report to external error tracking service
    if (enableReporting) {
      this.reportError(error, errorInfo);
    }
  }

  /**
   * Report error to external service
   * (e.g., Sentry, Rollbar, LogRocket)
   */
  reportError(error: Error, errorInfo: ErrorInfo): void {
    // Example: Send to error tracking service
    try {
      // Replace with your actual error reporting service
      // Sentry.captureException(error, { extra: errorInfo });
      console.log('Error reported to tracking service:', {
        error: error.toString(),
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  /**
   * Reset error boundary state
   */
  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  /**
   * Navigate to home/safe page
   */
  handleGoHome = (): void => {
    window.location.href = '/';
  };

  /**
   * Copy error details to clipboard
   */
  handleCopyError = async (): void => {
    const { error, errorInfo } = this.state;

    if (!error) return;

    const errorText = `
Error: ${error.toString()}
Stack: ${error.stack}
Component Stack: ${errorInfo?.componentStack}
Timestamp: ${new Date().toISOString()}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorText);
      console.log('Error details copied to clipboard');
    } catch (err) {
      console.error('Failed to copy error details:', err);
    }
  };

  /**
   * Render fallback UI
   */
  renderFallback(): ReactNode {
    const { fallback, showErrorDetails = false } = this.props;
    const { error, errorInfo, errorCount } = this.state;

    // Use custom fallback if provided
    if (fallback) {
      return fallback;
    }

    // Default fallback UI
    return (
      <Card className={styles.errorContainer}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Error header */}
          <div style={{ textAlign: 'center' }}>
            <WarningOutlined
              style={{
                fontSize: '64px',
                color: '#ff4d4f',
                marginBottom: '16px'
              }}
            />
            <Title level={2}>Something Went Wrong</Title>
            <Paragraph>
              We apologize for the inconvenience. An unexpected error has occurred.
            </Paragraph>

            {errorCount > 1 && (
              <Alert
                type="warning"
                message={`This error has occurred ${errorCount} time${errorCount > 1 ? 's' : ''}`}
                showIcon
                style={{ marginTop: '16px' }}
              />
            )}
          </div>

          {/* Error message */}
          {error && (
            <Alert
              type="error"
              message="Error Details"
              description={
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text strong>{error.toString()}</Text>
                  {showErrorDetails && error.stack && (
                    <Collapse ghost>
                      <Panel header="Stack Trace" key="stack">
                        <pre style={{
                          fontSize: '12px',
                          overflow: 'auto',
                          maxHeight: '200px',
                          padding: '8px',
                          backgroundColor: 'rgba(0,0,0,0.05)',
                          borderRadius: '4px'
                        }}>
                          {error.stack}
                        </pre>
                      </Panel>
                    </Collapse>
                  )}
                </Space>
              }
              showIcon
            />
          )}

          {/* Component stack (development only) */}
          {showErrorDetails && errorInfo?.componentStack && (
            <Collapse ghost>
              <Panel
                header={
                  <Space>
                    <BugOutlined />
                    Component Stack (Development)
                  </Space>
                }
                key="component-stack"
              >
                <pre style={{
                  fontSize: '12px',
                  overflow: 'auto',
                  maxHeight: '200px',
                  padding: '8px',
                  backgroundColor: 'rgba(0,0,0,0.05)',
                  borderRadius: '4px'
                }}>
                  {errorInfo.componentStack}
                </pre>
              </Panel>
            </Collapse>
          )}

          {/* Action buttons */}
          <Space style={{ justifyContent: 'center', width: '100%' }} wrap>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={this.handleReset}
            >
              Try Again
            </Button>

            <Button
              icon={<HomeOutlined />}
              onClick={this.handleGoHome}
            >
              Go to Home
            </Button>

            {showErrorDetails && (
              <Button
                icon={<BugOutlined />}
                onClick={this.handleCopyError}
              >
                Copy Error Details
              </Button>
            )}
          </Space>

          {/* Help text */}
          <Alert
            type="info"
            message="What can you do?"
            description={
              <ul style={{ marginBottom: 0, paddingLeft: '20px' }}>
                <li>Click "Try Again" to reload the component</li>
                <li>Click "Go to Home" to return to the main page</li>
                <li>If the problem persists, please contact support</li>
              </ul>
            }
          />
        </Space>
      </Card>
    );
  }

  render(): ReactNode {
    const { hasError } = this.state;
    const { children } = this.props;

    if (hasError) {
      return this.renderFallback();
    }

    return children;
  }
}

/**
 * Example component that throws an error
 * (for demonstration purposes)
 */
export const ErrorThrowingComponent: React.FC<{ shouldThrow?: boolean }> = ({
  shouldThrow = false
}) => {
  if (shouldThrow) {
    throw new Error('This is a test error thrown by ErrorThrowingComponent');
  }

  return (
    <Card>
      <Alert
        type="success"
        message="Component Rendered Successfully"
        description="This component is working correctly. Toggle the error state to see the error boundary in action."
        showIcon
      />
    </Card>
  );
};

/**
 * Complete example with error boundary wrapper
 */
export const ErrorBoundaryExample: React.FC = () => {
  const [shouldThrow, setShouldThrow] = React.useState(false);
  const [isDevelopment] = React.useState(process.env.NODE_ENV === 'development');

  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    console.log('Custom error handler called:', error, errorInfo);
    // You could send this to an analytics service, etc.
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card title="Error Boundary Demo">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Paragraph>
            This demonstrates how error boundaries catch errors in child components
            and display a fallback UI instead of crashing the entire application.
          </Paragraph>

          <Button
            type="primary"
            danger={shouldThrow}
            onClick={() => setShouldThrow(!shouldThrow)}
          >
            {shouldThrow ? 'Stop Throwing Error' : 'Throw Error'}
          </Button>
        </Space>
      </Card>

      <ErrorBoundary
        onError={handleError}
        showErrorDetails={isDevelopment}
        enableReporting={true}
      >
        <ErrorThrowingComponent shouldThrow={shouldThrow} />
      </ErrorBoundary>
    </Space>
  );
};

ErrorBoundary.displayName = 'ErrorBoundary';
ErrorBoundaryExample.displayName = 'ErrorBoundaryExample';

export default ErrorBoundaryExample;
