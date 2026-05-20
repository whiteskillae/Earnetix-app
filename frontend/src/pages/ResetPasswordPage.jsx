import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import toast from 'react-hot-toast';
import { Lock, EyeOff, Eye, ArrowRight } from 'lucide-react';

const ResetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const { loading, request } = useApi();
  const navigate = useNavigate();
  const location = useLocation();

  const resetToken = location.state?.resetToken;

  if (!resetToken) {
    navigate('/login');
    return null;
  }

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    try {
      await request('post', '/auth/reset-password', { resetToken, newPassword: password });
      toast.success('Password Successfully Updated');
      navigate('/login');
    } catch {}
  };

  return (
    <div className="auth-page flex-center fade-in">
      <div className="auth-container" style={{ maxWidth: '420px', width: '100%', padding: '24px' }}>
        <div className="glass-panel slide-up" style={{ padding: '40px' }}>
          <div className="text-center" style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
              NEW PASSWORD
            </h1>
            <p className="subtitle">
              Secure your account with a new password
            </p>
          </div>

          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label>New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-500)' }} />
                <input 
                  type={showPw ? 'text' : 'password'} 
                  className="form-input"
                  style={{ paddingLeft: '48px', paddingRight: '48px' }}
                  placeholder="••••••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required 
                />
                <button 
                  type="button" 
                  style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--gray-500)', cursor: 'pointer' }} 
                  onClick={() => setShowPw(!showPw)}
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-500)' }} />
                <input 
                  type={showConfirmPw ? 'text' : 'password'} 
                  className="form-input"
                  style={{ paddingLeft: '48px', paddingRight: '48px' }}
                  placeholder="••••••••••••" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={8}
                  required 
                />
                <button 
                  type="button" 
                  style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--gray-500)', cursor: 'pointer' }} 
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                >
                  {showConfirmPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading} style={{ marginTop: '8px' }}>
              {loading ? 'UPDATING...' : 'UPDATE PASSWORD'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
