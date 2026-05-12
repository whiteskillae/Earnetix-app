import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import { useGoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { Mail, Lock, User, Zap, Eye, EyeOff } from 'lucide-react';
import { getDeviceFingerprint } from '../utils/fingerprint';

const RegisterPage = () => {
  const [step, setStep] = useState('register'); // register | otp
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [otp, setOtp] = useState('');
  const [showPw, setShowPw] = useState(false);
  const { loading, request } = useApi();
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSuccess = async (tokenResponse) => {
    try {
      const res = await request('post', '/auth/google', {
        credential: tokenResponse.access_token,
        deviceFingerprint: getDeviceFingerprint(),
      });
      login(res.data.accessToken, res.data.user);
      toast.success('Registration successful!');
      navigate(res.data.user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {}
  };

  const googleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => toast.error('Google Registration Failed'),
  });

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await request('post', '/auth/register', { 
        ...form, 
        deviceFingerprint: getDeviceFingerprint() 
      });
      toast.success('OTP sent to your email!');
      setStep('otp');
    } catch {}
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    try {
      await request('post', '/auth/verify-otp', { email: form.email, otp });
      toast.success('Email verified! Please login.');
      navigate('/login');
    } catch {}
  };

  const handleResendOtp = async () => {
    try {
      await request('post', '/auth/resend-otp', { email: form.email });
      toast.success('New OTP sent!');
    } catch {}
  };

  return (
    <div className="auth-page">
      <div className="auth-card slide-up">
        <div className="auth-brand">
          <div className="auth-logo"><Zap size={28} strokeWidth={2.5} /></div>
          <h1>EARNETIX</h1>
          <p>{step === 'register' ? 'Create your account' : 'Verify your email'}</p>
        </div>

        {step === 'register' ? (
          <>
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label>Full Name</label>
                <div className="input-icon-wrap">
                  <User size={18} className="input-icon" />
                  <input type="text" className="form-input" style={{ paddingLeft: 42 }}
                    placeholder="John Doe" value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label>Email</label>
                <div className="input-icon-wrap">
                  <Mail size={18} className="input-icon" />
                  <input type="email" className="form-input" style={{ paddingLeft: 42 }}
                    placeholder="you@example.com" value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label>Password</label>
                <div className="input-icon-wrap">
                  <Lock size={18} className="input-icon" />
                  <input type={showPw ? 'text' : 'password'} className="form-input"
                    style={{ paddingLeft: 42, paddingRight: 42 }}
                    placeholder="Min 8 characters" value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    minLength={8} required />
                  <button type="button" className="input-icon-right" onClick={() => setShowPw(!showPw)}>
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                {loading ? 'Creating...' : 'Create Account'}
              </button>
            </form>

            <div className="auth-divider">
              <span>OR</span>
            </div>

            <button type="button" className="btn btn-outline btn-block btn-lg google-btn" onClick={() => googleLogin()}>
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width="18" height="18" />
              <span>Continue with Google</span>
            </button>
          </>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <p style={{ color: 'var(--gray-300)', fontSize: '0.9rem', marginBottom: 20, textAlign: 'center' }}>
              Enter the 6-digit code sent to <strong style={{ color: 'var(--blue-light)' }}>{form.email}</strong>
            </p>
            <div className="form-group">
              <input type="text" className="form-input" style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: 8 }}
                placeholder="000000" value={otp} maxLength={6}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} required />
            </div>
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>
            <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.85rem', color: 'var(--gray-400)' }}>
              Didn't receive code?{' '}
              <button type="button" onClick={handleResendOtp}
                style={{ background: 'none', border: 'none', color: 'var(--blue-light)', cursor: 'pointer', fontWeight: 600 }}>
                Resend OTP
              </button>
            </p>
          </form>
        )}

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
