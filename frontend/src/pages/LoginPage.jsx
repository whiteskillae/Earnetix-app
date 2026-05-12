import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useApi } from '../hooks/useApi';
import { useGoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { Mail, Lock, Zap, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';
import { getDeviceFingerprint } from '../utils/fingerprint';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const { login } = useAuth();
  const { loading, request } = useApi();
  const navigate = useNavigate();

  const handleGoogleSuccess = async (tokenResponse) => {
    try {
      const res = await request('post', '/auth/google', {
        credential: tokenResponse.access_token,
        deviceFingerprint: getDeviceFingerprint(),
      });
      login(res.data.accessToken, res.data.user);
      toast.success('Access Granted');
      
      if (!res.data.user.isProfileComplete && res.data.user.role !== 'admin') {
        navigate('/onboarding');
      } else {
        navigate(res.data.user.role === 'admin' ? '/admin' : '/dashboard');
      }
    } catch (err) {}
  };

  const googleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => toast.error('Google Auth Failed'),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await request('post', '/auth/login', { 
        email, 
        password, 
        deviceFingerprint: getDeviceFingerprint() 
      });
      login(res.data.accessToken, res.data.user);
      toast.success('Operational Access Restored');
      
      if (!res.data.user.isProfileComplete && res.data.user.role !== 'admin') {
        navigate('/onboarding');
      } else {
        navigate(res.data.user.role === 'admin' ? '/admin' : '/dashboard');
      }
    } catch {}
  };

  return (
    <div className="auth-view fade-in">
      {/* Decorative Background SVGs */}
      <div className="auth-decorations">
        <svg className="blob blob-1" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <path fill="var(--blue)" d="M44.7,-76.4C58.3,-69.2,70.1,-58.5,78.2,-45.5C86.3,-32.5,90.7,-17.2,89.5,-2.1C88.2,13.1,81.4,28.1,72.1,41.2C62.8,54.3,51,65.6,37.4,72.8C23.8,80,8.5,83.1,-6.6,81.3C-21.7,79.5,-36.6,72.8,-49.6,63.1C-62.6,53.4,-73.7,40.7,-79.8,26.4C-85.9,12.1,-87,2.8,-84.4,-9.1C-81.8,-21.1,-75.6,-35.6,-66,-48.1C-56.4,-60.6,-43.4,-71,-29.4,-76.3C-15.4,-81.6,-0.4,-81.8,15.1,-80C30.6,-78.2,44.7,-76.4,44.7,-76.4Z" transform="translate(100 100)" />
        </svg>
        <svg className="blob blob-2" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <path fill="var(--green)" d="M41.3,-70.5C53.7,-64.1,64.2,-53.4,72.1,-40.9C80,-28.3,85.3,-14.2,85.2,-0.1C85,14,79.5,28,71,40.4C62.5,52.8,51.1,63.6,37.6,70.5C24.1,77.4,8.5,80.4,-6.5,78.2C-21.5,76.1,-35.9,68.8,-48.5,59.3C-61.1,49.8,-71.9,38.1,-77.9,24.4C-83.9,10.7,-85.1,-5,-80.7,-19.1C-76.3,-33.2,-66.3,-45.7,-53.8,-52.1C-41.3,-58.5,-26.3,-58.7,-13.1,-64.1C0.1,-69.5,13.3,-80.1,26.6,-80.1C39.9,-80.1,41.3,-70.5,41.3,-70.5Z" transform="translate(100 100)" />
        </svg>
      </div>

      <div className="auth-container-premium">
        <div className="auth-card glass-panel slide-up">
          <div className="auth-header" style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div className="logo-icon-large" style={{ width: '80px', height: '80px', background: 'var(--blue-gradient)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 20px 40px var(--blue-glow)' }}>
              <Zap size={40} color="white" fill="white" />
            </div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.04em', margin: 0 }}>EARNITIX</h1>
            <p style={{ color: 'var(--gray-500)', fontWeight: 700, fontSize: '0.9rem', marginTop: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Secure Access Protocol</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-group">
              <label>Agent Identifier</label>
              <div className="input-with-icon">
                <Mail className="icon" size={20} />
                <input 
                  type="email" 
                  placeholder="name@agency.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
            </div>

            <div className="form-group">
              <label>Access Encryption</label>
              <div className="input-with-icon">
                <Lock className="icon" size={20} />
                <input 
                  type={showPw ? 'text' : 'password'} 
                  placeholder="••••••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
                <button type="button" className="action-icon" onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-premium btn-primary-new btn-block" disabled={loading} style={{ height: '60px', fontSize: '1.1rem' }}>
              {loading ? 'SYNCHRONIZING...' : 'INITIALIZE SESSION'}
              {!loading && <ArrowRight size={20} />}
            </button>
          </form>

          <div className="auth-divider">
            <span>SECURE SOCIAL ACCESS</span>
          </div>

          <button type="button" className="btn-social-premium" onClick={() => googleLogin()}>
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" style={{ width: '24px' }} />
            <span>Connect via Google Intel</span>
          </button>

          <div className="auth-footer" style={{ marginTop: '40px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--gray-500)' }}>
            New Operative? <Link to="/register" style={{ color: 'var(--blue-light)', fontWeight: 800, textDecoration: 'none' }}>Create Command Profile</Link>
          </div>
        </div>
      </div>

      <style>{`
        .auth-view { min-height: 100vh; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; background: #050508; }
        .auth-decorations { position: absolute; inset: 0; pointer-events: none; }
        .blob { position: absolute; width: 600px; height: 600px; opacity: 0.15; filter: blur(80px); }
        .blob-1 { top: -200px; right: -200px; animation: rotate 20s linear infinite; }
        .blob-2 { bottom: -200px; left: -200px; animation: rotate 25s linear infinite reverse; }
        @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        .auth-container-premium { width: 100%; max-width: 480px; padding: 24px; position: relative; z-index: 10; }
        .auth-card { padding: 48px; border-radius: 40px; box-shadow: 0 40px 100px rgba(0,0,0,0.6); }
        
        .input-with-icon { position: relative; }
        .input-with-icon .icon { position: absolute; left: 20px; top: 50%; transform: translateY(-50%); color: var(--gray-500); }
        .input-with-icon input { width: 100%; padding: 18px 20px 18px 60px; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: 20px; color: white; font-size: 1rem; transition: var(--transition); }
        .input-with-icon input:focus { border-color: var(--blue-light); background: rgba(59, 130, 246, 0.05); box-shadow: 0 0 20px rgba(59, 130, 246, 0.1); }
        .input-with-icon .action-icon { position: absolute; right: 20px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--gray-500); cursor: pointer; }
        
        .auth-divider { margin: 32px 0; display: flex; align-items: center; gap: 16px; }
        .auth-divider::before, .auth-divider::after { content: ''; flex: 1; height: 1px; background: var(--glass-border); }
        .auth-divider span { font-size: 0.7rem; font-weight: 800; color: var(--gray-600); letter-spacing: 0.2em; }
        
        .btn-social-premium { width: 100%; display: flex; align-items: center; justify-content: center; gap: 16px; padding: 16px; border-radius: 20px; background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); color: white; font-weight: 700; cursor: pointer; transition: var(--transition); }
        .btn-social-premium:hover { background: rgba(255,255,255,0.05); border-color: var(--gray-600); }
      `}</style>
    </div>
  );
};

export default LoginPage;
