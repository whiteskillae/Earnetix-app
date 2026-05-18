import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useApi } from '../hooks/useApi';
import toast from 'react-hot-toast';
import { Shield, Lock, Mail, Eye, EyeOff, LayoutDashboard } from 'lucide-react';
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
        toast.error('Access Denied. Admin credentials required.');
        return;
      }

      login(res.data.accessToken, res.data.user);
      toast.success('System access granted');
      navigate('/dashboard');
    } catch (err) {}
  };

  return (
    <div className="admin-layout-new flex-center" style={{ background: 'radial-gradient(circle at 50% 50%, #0f172a 0%, #020617 100%)' }}>
      <div className="glass-panel slide-up" style={{ maxWidth: '420px', width: '100%', padding: '48px' }}>
        <div className="text-center" style={{ marginBottom: '40px' }}>
          <div className="logo-icon" style={{ margin: '0 auto 24px', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '18px' }}>
            <Shield size={32} color="white" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '8px' }}>Admin Login</h1>
          <p className="subtitle">Secure admin environment</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Admin Email</label>
            <div className="input-icon-wrap" style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input 
                type="email" 
                className="form-input" 
                style={{ paddingLeft: '48px' }}
                placeholder="admin@earnetix.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="input-icon-wrap" style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input 
                type={showPw ? 'text' : 'password'} 
                className="form-input"
                style={{ paddingLeft: '48px', paddingRight: '48px' }}
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
              <button 
                type="button" 
                style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }} 
                onClick={() => setShowPw(!showPw)}
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block btn-lg" style={{ marginTop: '24px' }} disabled={loading}>
            {loading ? 'Authenticating...' : 'Login as Admin'}
          </button>
        </form>

        <div className="text-center" style={{ marginTop: '32px' }}>
           <p style={{ fontSize: '0.75rem', color: '#475569' }}>
             Authorized Access Only. All actions are logged.
           </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
