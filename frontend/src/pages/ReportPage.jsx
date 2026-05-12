import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { Shield, AlertTriangle, MessageSquare, CheckCircle, Info } from 'lucide-react';

const ReportPage = () => {
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    type: ' bug'
  });
  const [submitted, setSubmitted] = useState(false);
  const { loading, error, request } = useApi();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await request('post', '/reports', {
        ...formData,
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          vendor: navigator.vendor,
          screen: `${window.screen.width}x${window.screen.height}`
        }
      });
      setSubmitted(true);
    } catch (err) {}
  };

  if (submitted) {
    return (
      <div className="report-success fade-in" style={{ 
        maxWidth: '500px', margin: '100px auto', textAlign: 'center',
        background: 'var(--dark-950)', padding: '40px', borderRadius: '32px',
        border: '1px solid var(--glass-border)', boxShadow: '0 30px 60px rgba(0,0,0,0.5)'
      }}>
        <div style={{ 
          width: '80px', height: '80px', background: 'rgba(16, 185, 129, 0.1)', 
          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', 
          margin: '0 auto 24px', color: 'var(--green)'
        }}>
          <CheckCircle size={48} />
        </div>
        <h2 style={{ marginBottom: '16px' }}>REPORT SUBMITTED</h2>
        <p style={{ color: 'var(--gray-400)', marginBottom: '32px', lineHeight: 1.6 }}>
          Thank you for helping us improve. Our security team will investigate this issue. 
          <strong> Please don't panic</strong>, we will fix this soon.
        </p>
        <button className="btn btn-primary-new btn-block" onClick={() => window.location.href = '/dashboard'}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="report-view slide-up" style={{ maxWidth: '700px', margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: '32px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Shield color="var(--blue)" size={32} /> SECURITY & SUPPORT
        </h1>
        <p>Encountered an error or have a suggestion? Report it here.</p>
      </div>

      <div className="premium-card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Report Type</label>
            <div className="grid-2" style={{ gap: '12px', marginBottom: '20px' }}>
              {[
                { id: 'bug', label: 'Technical Bug', icon: AlertTriangle, color: '#ef4444' },
                { id: 'ui_error', label: 'UI Display Error', icon: Info, color: '#3b82f6' },
                { id: 'suggestion', label: 'App Suggestion', icon: MessageSquare, color: '#10b981' },
                { id: 'other', label: 'Other Issue', icon: Shield, color: '#94a3b8' }
              ].map((item) => (
                <div 
                  key={item.id}
                  onClick={() => setFormData({ ...formData, type: item.id })}
                  style={{ 
                    padding: '16px', borderRadius: '16px', cursor: 'pointer',
                    background: formData.type === item.id ? 'var(--dark-800)' : 'var(--dark-900)',
                    border: formData.type === item.id ? `1px solid ${item.color}` : '1px solid var(--glass-border)',
                    display: 'flex', alignItems: 'center', gap: '12px', transition: 'var(--transition)'
                  }}
                >
                  <item.icon size={20} color={item.color} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Issue Subject</label>
            <input 
              className="form-input"
              placeholder="Briefly describe the issue"
              required
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Detailed Description</label>
            <textarea 
              className="form-input"
              placeholder="What happened? How can we reproduce it? If it's a suggestion, tell us more."
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{ minHeight: '150px' }}
            />
          </div>

          {error && (
            <div className="text-danger" style={{ marginBottom: '16px', fontSize: '0.85rem', fontWeight: 600 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '14px', marginBottom: '24px' }}>
            <Info size={18} color="var(--blue)" />
            <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)', margin: 0 }}>
              You can only submit one report every 24 hours. This helps our team focus on quality investigations.
            </p>
          </div>

          <button className="btn-premium btn-primary-new btn-block" disabled={loading}>
            {loading ? 'Submitting...' : 'Send Intelligence Report'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReportPage;
