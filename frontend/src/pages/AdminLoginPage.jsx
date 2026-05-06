import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useApi } from '../hooks/useApi';
import toast from 'react-hot-toast';
import { Shield, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { getDeviceFingerprint } from '../utils/fingerprint';

const AdminLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const { login } = useAuth();
  const { loading, request } = useApi();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await request('post', '/auth/login', { 
        email, 
        password, 
        deviceFingerprint: getDeviceFingerprint() 
      });
      
      if (res.data.user.role !== 'admin') {
        toast.error('Access Denied. This area is for administrators only.');
        return;
      }

      login(res.data.accessToken, res.data.user);
      toast.success('Welcome, Admin!');
      navigate('/admin');
    } catch (err) {}
  };

  return (
    <div className="auth-page admin-login-theme">
      <div className="auth-card slide-up" style={{ borderTop: '4px solid var(--blue)' }}>
        <div className="auth-brand">
          <div className="auth-logo" style={{ background: 'var(--blue)' }}>
            <Shield size={28} strokeWidth={2.5} />
          </div>
          <h1 style={{ color: 'var(--white)' }}>ADMIN PORTAL</h1>
          <p>Please verify your administrator credentials</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Admin Email</label>
            <div className="input-icon-wrap">
              <Mail size={18} className="input-icon" />
              <input type="email" className="form-input" style={{ paddingLeft: 42 }}
                placeholder="admin@earnitix.com" value={email}
                onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </div>

          <div className="form-group">
            <label>Master Password</label>
            <div className="input-icon-wrap">
              <Lock size={18} className="input-icon" />
              <input type={showPw ? 'text' : 'password'} className="form-input"
                style={{ paddingLeft: 42, paddingRight: 42 }}
                placeholder="••••••••" value={password}
                onChange={(e) => setPassword(e.target.value)} required />
              <button type="button" className="input-icon-right" onClick={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
            {loading ? 'Authenticating...' : 'Secure Login'}
          </button>
        </form>
      </div>

      <style>{`
        .admin-login-theme {
          background: radial-gradient(circle at center, #001A3D 0%, #000000 100%) !important;
        }
        .auth-logo { transition: transform 0.3s ease; }
        .auth-logo:hover { transform: scale(1.1) rotate(5deg); }
      `}</style>
    </div>
  );
};

export default AdminLoginPage;
