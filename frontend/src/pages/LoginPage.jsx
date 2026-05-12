import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useApi } from '../hooks/useApi';
import { useGoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { Mail, Lock, Zap, Eye, EyeOff, ArrowRight } from 'lucide-react';
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
      toast.success('Login successful!');
      
      if (!res.data.user.isProfileComplete && res.data.user.role !== 'admin') {
        navigate('/onboarding');
      } else {
        navigate(res.data.user.role === 'admin' ? '/admin' : '/dashboard');
      }
    } catch (err) {}
  };

  const googleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => toast.error('Google Login Failed'),
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
      toast.success('Welcome back!');
      
      if (!res.data.user.isProfileComplete && res.data.user.role !== 'admin') {
        navigate('/onboarding');
      } else {
        navigate(res.data.user.role === 'admin' ? '/admin' : '/dashboard');
      }
    } catch {}
  };

  return (
    <div className="auth-container">
      {/* Abstract Background Elements */}
      <div className="auth-bg-glow"></div>
      <div className="auth-bg-glow secondary"></div>
      
      <div className="auth-wrapper slide-up">
        <div className="auth-card-premium glass-panel">
          <div className="auth-header-new">
            <div className="logo-badge">
              <Zap size={32} fill="#3b82f6" color="#3b82f6" />
            </div>
            <h1>EARNITIX</h1>
            <p>Your Portal to Digital Rewards</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form-new">
            <div className="input-group-new">
              <label>Professional Email</label>
              <div className="input-field-wrap">
                <Mail size={18} className="field-icon" />
                <input 
                  type="email" 
                  placeholder="name@company.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div className="input-group-new">
              <label>Secure Password</label>
              <div className="input-field-wrap">
                <Lock size={18} className="field-icon" />
                <input 
                  type={showPw ? 'text' : 'password'} 
                  placeholder="••••••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                />
                <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="forgot-pw-link">
               <Link to="/forgot-password">Forgot password?</Link>
            </div>

            <button type="submit" className="btn-auth-primary" disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In To Account'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="auth-separator">
            <span>OR CONTINUE WITH</span>
          </div>

          <button type="button" className="google-auth-btn" onClick={() => googleLogin()}>
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
            <span>Google Authentication</span>
          </button>

          <div className="auth-bottom-cta">
            New to Earnitix? <Link to="/register">Create Enterprise Account</Link>
          </div>
        </div>
      </div>

      <style>{`
        .auth-container {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0a0a0f;
          position: relative;
          overflow: hidden;
          padding: 20px;
        }

        .auth-bg-glow {
          position: absolute;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%);
          top: -250px;
          right: -100px;
          z-index: 0;
        }

        .auth-bg-glow.secondary {
          background: radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%);
          bottom: -250px;
          left: -100px;
        }

        .auth-wrapper {
          width: 100%;
          max-width: 440px;
          position: relative;
          z-index: 10;
        }

        .auth-card-premium {
          padding: 48px 40px;
          border-radius: 32px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 40px 100px rgba(0,0,0,0.5);
        }

        .auth-header-new {
          text-align: center;
          margin-bottom: 40px;
        }

        .logo-badge {
          width: 64px;
          height: 64px;
          background: rgba(59, 130, 246, 0.1);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          border: 1px solid rgba(59, 130, 246, 0.2);
        }

        .auth-header-new h1 {
          font-size: 2rem;
          letter-spacing: 4px;
          color: white;
          margin: 0;
          font-weight: 800;
        }

        .auth-header-new p {
          color: #64748b;
          font-size: 0.95rem;
          margin-top: 8px;
        }

        .auth-form-new {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .input-group-new label {
          display: block;
          font-size: 0.8rem;
          color: #94a3b8;
          margin-bottom: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .input-field-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .field-icon {
          position: absolute;
          left: 16px;
          color: #475569;
        }

        .input-field-wrap input {
          width: 100%;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          padding: 14px 16px 14px 48px;
          border-radius: 14px;
          color: white;
          font-size: 1rem;
          transition: all 0.3s;
        }

        .input-field-wrap input:focus {
          border-color: #3b82f6;
          background: rgba(59, 130, 246, 0.05);
          outline: none;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }

        .pw-toggle {
          position: absolute;
          right: 16px;
          background: none;
          border: none;
          color: #475569;
          cursor: pointer;
          display: flex;
          align-items: center;
        }

        .forgot-pw-link {
          text-align: right;
          margin-top: -12px;
        }

        .forgot-pw-link a {
          font-size: 0.85rem;
          color: #3b82f6;
          text-decoration: none;
          font-weight: 600;
        }

        .btn-auth-primary {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 16px;
          border-radius: 14px;
          font-size: 1rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 10px 20px rgba(59, 130, 246, 0.2);
        }

        .btn-auth-primary:hover {
          background: #2563eb;
          transform: translateY(-2px);
          box-shadow: 0 15px 30px rgba(59, 130, 246, 0.3);
        }

        .auth-separator {
          margin: 32px 0;
          position: relative;
          text-align: center;
        }

        .auth-separator::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 1px;
          background: rgba(255,255,255,0.08);
        }

        .auth-separator span {
          position: relative;
          background: #11111a;
          padding: 0 16px;
          font-size: 0.7rem;
          color: #475569;
          font-weight: 800;
          letter-spacing: 2px;
        }

        .google-auth-btn {
          width: 100%;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.1);
          padding: 14px;
          border-radius: 14px;
          color: white;
          font-size: 0.95rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.3s;
        }

        .google-auth-btn:hover {
          background: rgba(255,255,255,0.03);
          border-color: rgba(255,255,255,0.2);
        }

        .auth-bottom-cta {
          margin-top: 32px;
          text-align: center;
          font-size: 0.9rem;
          color: #64748b;
        }

        .auth-bottom-cta a {
          color: #3b82f6;
          text-decoration: none;
          font-weight: 700;
          margin-left: 6px;
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
