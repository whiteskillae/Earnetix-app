import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useApi } from '../hooks/useApi';
import { useGoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { Mail, Lock, Zap, Eye, EyeOff } from 'lucide-react';

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
      });
      login(res.data.accessToken, res.data.user);
      toast.success('Login successful!');
      navigate(res.data.user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {}
  };

  const googleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => toast.error('Google Login Failed'),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await request('post', '/auth/login', { email, password });
      login(res.data.accessToken, res.data.user);
      toast.success('Welcome back!');
      navigate(res.data.user.role === 'admin' ? '/admin' : '/dashboard');
    } catch {}
  };

  return (
    <div className="auth-page">
      <div className="auth-card slide-up">
        <div className="auth-brand">
          <div className="auth-logo"><Zap size={28} strokeWidth={2.5} /></div>
          <h1>EARNETIX</h1>
          <p>Earn Through Content. Grow with Skills.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <div className="input-icon-wrap">
              <Mail size={18} className="input-icon" />
              <input type="email" className="form-input" style={{ paddingLeft: 42 }}
                placeholder="you@example.com" value={email}
                onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
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
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <button type="button" className="btn btn-outline btn-block btn-lg google-btn" onClick={() => googleLogin()}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width="18" height="18" />
          <span>Continue with Google</span>
        </button>

        <p className="auth-footer">
          Don't have an account? <Link to="/register">Create one</Link>
        </p>
      </div>

      <style>{`
        .auth-page {
          min-height: 100vh; display: flex; align-items: center;
          justify-content: center; padding: 24px;
          background: radial-gradient(ellipse at top, rgba(0,102,255,0.08), transparent 50%),
                      radial-gradient(ellipse at bottom right, rgba(0,209,102,0.06), transparent 50%),
                      var(--black);
        }
        .auth-card {
          width: 100%; max-width: 420px;
          background: var(--dark-800); border: 1px solid var(--dark-600);
          border-radius: var(--radius-xl); padding: 40px;
        }
        .auth-brand { text-align: center; margin-bottom: 32px; }
        .auth-logo {
          width: 56px; height: 56px; margin: 0 auto 16px;
          border-radius: var(--radius-lg);
          background: linear-gradient(135deg, var(--blue), var(--green));
          display: flex; align-items: center; justify-content: center;
          color: var(--white);
        }
        .auth-brand h1 {
          font-family: var(--font-heading); font-size: 1.5rem;
          letter-spacing: 2px; color: var(--white);
        }
        .auth-brand p {
          font-size: 0.8rem; color: var(--gray-400); margin-top: 4px;
        }
        .input-icon-wrap { position: relative; }
        .input-icon {
          position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
          color: var(--gray-400); pointer-events: none;
        }
        .input-icon-right {
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          background: none; border: none; color: var(--gray-400); cursor: pointer;
        }
        .auth-footer {
          text-align: center; margin-top: 24px; font-size: 0.85rem;
          color: var(--gray-400);
        }
        .auth-footer a { color: var(--blue-light); font-weight: 600; }
      `}</style>
    </div>
  );
};

export default LoginPage;
