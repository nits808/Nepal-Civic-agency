import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-1)' }}>
          <h2 style={{ color: 'var(--accent-red)' }}>Oops, something went wrong</h2>
          <p>We encountered an unexpected error loading this module.</p>
          <pre style={{ textAlign: 'left', background: 'var(--surface-2)', padding: '1rem', borderRadius: '8px', overflowX: 'auto', fontSize: '0.8rem' }}>
            {this.state.error?.toString()}
          </pre>
          <button 
            className="action-btn" 
            style={{ marginTop: '1rem' }}
            onClick={() => window.location.reload()}
          >
            Reload Default Dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
