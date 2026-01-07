import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error info:', errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          backgroundColor: '#000',
          color: '#fff',
          fontFamily: 'monospace',
        }}>
          <h1 style={{ color: '#ff4444', marginBottom: '20px' }}>Something went wrong</h1>
          <p style={{ marginBottom: '20px', textAlign: 'center' }}>
            The application encountered an error. Please check the browser console for details.
          </p>
          {this.state.error && (
            <details style={{ marginTop: '20px', maxWidth: '800px', width: '100%' }}>
              <summary style={{ cursor: 'pointer', marginBottom: '10px', color: '#ffaa00' }}>
                Error Details (Click to expand)
              </summary>
              <pre style={{
                backgroundColor: '#1a1a1a',
                padding: '15px',
                borderRadius: '5px',
                overflow: 'auto',
                fontSize: '12px',
                color: '#ff6666',
              }}>
                {this.state.error.toString()}
                {this.state.errorInfo && (
                  <>
                    {'\n\n'}
                    {this.state.errorInfo.componentStack}
                  </>
                )}
              </pre>
            </details>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#444',
              color: '#fff',
              border: '1px solid #666',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
