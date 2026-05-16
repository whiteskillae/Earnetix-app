import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ReCAPTCHA from "react-google-recaptcha";
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
  const [captchaToken, setCaptchaToken] = useState(null);

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
  const handleGoogleSuccess = async (tokenResponse) => {
    setIsGoogleLoading(true);
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
    } catch (err) {
      setIsGoogleLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => {
      toast.error('Google Auth Failed');
      setIsGoogleLoading(false);
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!captchaToken) {
        return toast.error('Please complete the security check');
      }
      const res = await request('post', '/auth/login', { 
        email, 
        password, 
        deviceFingerprint: getDeviceFingerprint(),
        captchaToken
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
    <div className="auth-page flex-center fade-in">
      <div className="auth-container" style={{ maxWidth: '420px', width: '100%', padding: '24px' }}>
        <div className="glass-panel slide-up" style={{ padding: '40px' }}>
          <div className="text-center" style={{ marginBottom: '32px' }}>
            <div className="logo-icon" style={{ width: '56px', height: '56px', background: 'var(--blue-gradient)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 10px 30px var(--blue-glow)' }}>
              <Zap size={28} color="white" fill="white" />
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>EARNITIX</h1>
            <p className="subtitle">Secure Access Portal</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label>Agent Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-500)' }} />
                <input 
                  type="email" 
                  className="form-input"
                  style={{ paddingLeft: '48px' }}
                  placeholder="name@agency.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
            </div>

            <div className="form-group">
              <label>Security Key</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-500)' }} />
                <input 
                  type={showPw ? 'text' : 'password'} 
                  className="form-input"
                  style={{ paddingLeft: '48px', paddingRight: '48px' }}
                  placeholder="••••••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '8px 0' }}>
              <ReCAPTCHA
                sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                onChange={(token) => setCaptchaToken(token)}
                theme="dark"
              />
              <p style={{ fontSize: '0.65rem', color: 'var(--gray-600)', marginTop: '8px' }}>
                Require reCAPTCHA v2 Checkbox keys.
              </p>
            </div>

            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading} style={{ marginTop: '8px' }}>
              {loading ? 'INITIALIZING...' : 'SIGN IN'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="view-filters" style={{ margin: '24px 0', border: 'none', padding: 0 }}>
             <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }}></div>
             <span style={{ padding: '0 12px', fontSize: '0.65rem', fontWeight: 800, color: 'var(--gray-600)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>OR</span>
             <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }}></div>
          </div>

          <button type="button" className="btn btn-outline btn-block" onClick={() => googleLogin()} style={{ gap: '12px', height: '54px' }}>
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" style={{ width: '20px' }} />
            <span>Continue with Google</span>
          </button>

          <div className="text-center" style={{ marginTop: '32px', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--gray-500)' }}>New User? </span>
            <Link to="/register" style={{ color: 'var(--blue-light)', fontWeight: 700, textDecoration: 'none' }}>Create Command Profile</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
