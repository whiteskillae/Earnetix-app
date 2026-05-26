import React from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

class ErrorBoundaryFallback extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
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
          background: 'var(--dark-950, #09090b)',
          color: 'var(--gray-300, #cbd5e1)',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div className="glass-panel" style={{
            padding: '40px',
            borderRadius: '24px',
            maxWidth: '500px',
            width: '100%',
            background: 'rgba(239, 68, 68, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px'
          }}>
            <div style={{ 
              width: '80px', height: '80px', 
              background: 'rgba(239, 68, 68, 0.1)', 
              borderRadius: '50%', 
              display: 'flex', alignItems: 'center', justifyContent: 'center' 
            }}>
              <AlertTriangle size={40} color="#ef4444" />
            </div>
            
            <h1 style={{ fontSize: '1.8rem', color: 'white', margin: 0, fontWeight: 900 }}>Something went wrong.</h1>
            <p style={{ color: 'var(--gray-400, #9ca3af)', margin: 0, lineHeight: 1.6 }}>
              An unexpected error occurred while loading this page. Our system has logged the issue.
            </p>

            <div style={{ display: 'flex', gap: '16px', marginTop: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button 
                onClick={() => window.location.reload()}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '12px 24px', borderRadius: '12px',
                  background: 'var(--blue-gradient, linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%))',
                  border: 'none', color: 'white', fontWeight: 800, cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)'
                }}
              >
                <RefreshCw size={18} /> Reload Page
              </button>
              
              <button 
                onClick={() => window.location.href = '/dashboard'}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '12px 24px', borderRadius: '12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: 800, cursor: 'pointer'
                }}
              >
                <Home size={18} /> Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundaryFallback;
