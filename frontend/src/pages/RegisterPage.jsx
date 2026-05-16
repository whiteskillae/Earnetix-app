import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ReCAPTCHA from "react-google-recaptcha";
import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import { useGoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { Mail, Lock, User, Zap, Eye, EyeOff, ArrowRight, ShieldCheck, CheckCircle } from 'lucide-react';
import { getDeviceFingerprint } from '../utils/fingerprint';

const RegisterPage = () => {
  const [step, setStep] = useState('register'); // register | otp
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [otp, setOtp] = useState('');
  const [showPw, setShowPw] = useState(false);
  const { loading, request } = useApi();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [captchaToken, setCaptchaToken] = useState(null);

  useEffect(() => {
    const key = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
    console.log('reCAPTCHA Diagnostic (Reg):', key ? `${key.substring(0, 6)}...` : 'MISSING');
  }, []);

  const handleGoogleSuccess = async (tokenResponse) => {
    try {
      const res = await request('post', '/auth/google', {
        credential: tokenResponse.access_token,
        deviceFingerprint: getDeviceFingerprint(),
      });
      login(res.data.accessToken, res.data.user);
      toast.success('Registration Confirmed');
      
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

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!captchaToken) {
      return toast.error('Please complete the security check');
    }
    try {
      await request('post', '/auth/register', { 
        ...form, 
        deviceFingerprint: getDeviceFingerprint(),
        captchaToken
      });
      toast.success('Verification Code Dispatched');
      setStep('otp');
    } catch {}
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    try {
      await request('post', '/auth/verify-otp', { email: form.email, otp });
      toast.success('Identity Verified');
      navigate('/login');
    } catch {}
  };

  return (
    <div className="auth-page flex-center fade-in">
      <div className="auth-container" style={{ maxWidth: '420px', width: '100%', padding: '24px' }}>
        <div className="glass-panel slide-up" style={{ padding: '40px' }}>
          <div className="text-center" style={{ marginBottom: '32px' }}>
            <div className="logo-icon" style={{ width: '56px', height: '56px', background: 'var(--green-gradient)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 10px 30px rgba(16, 185, 129, 0.2)' }}>
              <Zap size={28} color="white" fill="white" />
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
              {step === 'register' ? 'JOIN EARNITIX' : 'VERIFICATION'}
            </h1>
            <p className="subtitle">
              {step === 'register' ? 'Initialize operative profile' : `Code sent to ${form.email}`}
            </p>
          </div>

          {step === 'register' ? (
            <>
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label>Full Legal Name</label>
                  <div style={{ position: 'relative' }}>
                    <User size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-500)' }} />
                    <input 
                      type="text" 
                      className="form-input"
                      style={{ paddingLeft: '48px' }}
                      placeholder="Alexander Knight" 
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Agent Email</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-500)' }} />
                    <input 
                      type="email" 
                      className="form-input"
                      style={{ paddingLeft: '48px' }}
                      placeholder="operative@agency.com" 
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Security Encryption</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-500)' }} />
                    <input 
                      type={showPw ? 'text' : 'password'} 
                      className="form-input"
                      style={{ paddingLeft: '48px', paddingRight: '48px' }}
                      placeholder="••••••••••••" 
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
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
                {loading ? 'INITIALIZING...' : 'CREATE ACCOUNT'}
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
            </>
          ) : (
            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
               <div className="form-group">
                  <label>Verification Pulse</label>
                  <input 
                    type="text" 
                    className="form-input"
                    style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '8px', fontWeight: 800, height: '60px' }}
                    placeholder="000000" 
                    value={otp} 
                    maxLength={6}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} 
                    required 
                  />
               </div>

               <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                  {loading ? 'VERIFYING...' : 'CONFIRM IDENTITY'}
                  <ShieldCheck size={18} />
               </button>

               <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <p style={{ color: 'var(--gray-500)', fontSize: '0.85rem', marginBottom: '8px' }}>Signal not received?</p>
                  <button type="button" className="btn btn-sm btn-outline" style={{ border: 'none', background: 'none', color: 'var(--blue-light)', fontWeight: 800 }} onClick={async () => {
                     await request('post', '/auth/resend-otp', { email: form.email });
                     toast.success('New Signal Dispatched');
                  }}>RESEND ENCRYPTION CODE</button>
               </div>
            </form>
          )}

          <div className="text-center" style={{ marginTop: '32px', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--gray-500)' }}>Already Enlisted? </span>
            <Link to="/login" style={{ color: 'var(--blue-light)', fontWeight: 700, textDecoration: 'none' }}>Access Terminal</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
