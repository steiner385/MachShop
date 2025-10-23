import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Result, Button } from 'antd';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Update state with error details
    this.setState({
      error,
      errorInfo
    });

    // You can also log to an error reporting service here
    // logErrorToService(error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    // Reload the page to reset the app state
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const isDevelopment = process.env.NODE_ENV === 'development';

      return (
        <div style={{ padding: '50px' }}>
          <Result
            status="error"
            title="Something went wrong"
            subTitle={
              isDevelopment
                ? this.state.error?.message || 'An unexpected error occurred'
                : 'An unexpected error occurred. Please try refreshing the page.'
            }
            extra={[
              <Button type="primary" key="console" onClick={this.handleReset}>
                Refresh Page
              </Button>,
              <Button key="back" onClick={() => window.history.back()}>
                Go Back
              </Button>
            ]}
          >
            {isDevelopment && this.state.errorInfo && (
              <div style={{
                textAlign: 'left',
                backgroundColor: '#f5f5f5',
                padding: '20px',
                borderRadius: '4px',
                marginTop: '20px',
                maxHeight: '400px',
                overflow: 'auto'
              }}>
                <h4>Error Stack Trace:</h4>
                <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {this.state.error?.stack}
                </pre>
                <h4>Component Stack:</h4>
                <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {this.state.errorInfo.componentStack}
                </pre>
              </div>
            )}
          </Result>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;