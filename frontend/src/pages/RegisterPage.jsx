import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import { useGoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { getDeviceFingerprint } from '../utils/fingerprint';

import logo from '../assets/logo.svg';

// ─── Constants ────────────────────────────────────────────
const COOLDOWN_SECS = 120;        // 2 minutes between OTP resends
const MAX_DAILY_OTP = 4;          // matches server-side limit

// ─── Helper: mask email for display ─────────────────────
const maskEmail = (email) => {
  const [user, domain] = email.split('@');
  if (!user || !domain) return email;
  const visible = user.slice(0, Math.min(3, user.length));
  return `${visible}${'*'.repeat(Math.max(1, user.length - 3))}@${domain}`;
};

const RegisterPage = () => {
  const [step, setStep] = useState('register'); // register | otp
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [otp, setOtp] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [registerError, setRegisterError] = useState(null); // for retry UI
  const [otpDailyCount, setOtpDailyCount] = useState(0);

  const otpInputRef = useRef(null);
  const { loading, request } = useApi();
  const { login } = useAuth();
  const navigate = useNavigate();

  // ─── Cooldown timer ──────────────────────────────────
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // ─── Auto-focus OTP input when step changes ──────────
  useEffect(() => {
    if (step === 'otp' && otpInputRef.current) {
      setTimeout(() => otpInputRef.current?.focus(), 100);
    }
  }, [step]);

  // ─── Google Auth ─────────────────────────────────────
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
        navigate('/dashboard');
      }
    } catch (err) {}
  };

  const googleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => toast.error('Google Auth Failed'),
  });

  // ─── Register ────────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterError(null);
    try {
      await request('post', '/auth/register', {
        ...form,
        deviceFingerprint: getDeviceFingerprint(),
      });
      toast.success('Verification code sent — check your inbox!');
      setStep('otp');
      setCooldown(COOLDOWN_SECS);
      setOtpDailyCount(1);
    } catch (err) {
      // Show retry UI only for server/network errors (not validation 4xx)
      const status = err.response?.status;
      if (!status || status >= 500 || err.code === 'ECONNABORTED') {
        setRegisterError('Server is busy. Your details are saved — tap retry.');
      }
    }
  };

  // ─── Verify OTP ──────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    try {
      await request('post', '/auth/verify-otp', { email: form.email, otp });
      toast.success('Identity Verified! You can now log in.');
      navigate('/login');
    } catch (err) {
      // Clear OTP on wrong code so user can retype
      const status = err.response?.status;
      if (status === 400) setOtp('');
    }
  };

  // ─── Auto-submit when 6 digits entered ───────────────
  useEffect(() => {
    if (otp.length === 6 && step === 'otp' && !loading) {
      handleVerifyOtp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  // ─── Resend OTP ──────────────────────────────────────
  const handleResend = async () => {
    if (cooldown > 0 || loading) return;
    if (otpDailyCount >= MAX_DAILY_OTP) {
      toast.error('Daily OTP limit reached. Try again tomorrow.');
      return;
    }
    try {
      await request('post', '/auth/resend-otp', { email: form.email });
      toast.success('New verification code sent!');
      setCooldown(COOLDOWN_SECS);
      setOtpDailyCount((c) => c + 1);
      setOtp('');
      setTimeout(() => otpInputRef.current?.focus(), 100);
    } catch (err) {}
  };

  const formatCooldown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const canResend = cooldown === 0 && !loading && otpDailyCount < MAX_DAILY_OTP;

  // ─── Render ──────────────────────────────────────────
  return (
    <div className="auth-page flex-center fade-in">
      <div className="auth-container" style={{ maxWidth: '420px', width: '100%', padding: '24px' }}>
        <div className="glass-panel slide-up" style={{ padding: '40px' }}>

          {/* Header */}
          <div className="text-center" style={{ marginBottom: '32px' }}>
            <div
              className="logo-icon"
              style={{
                width: '56px', height: '56px', background: 'transparent',
                borderRadius: '16px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', margin: '0 auto 20px', boxShadow: 'none',
              }}
            >
              <img src={logo} alt="Earnitix Logo" style={{ width: '48px', height: '48px' }} />
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
              {step === 'register' ? 'JOIN EARNITIX' : 'VERIFICATION'}
            </h1>
            <p className="subtitle">
              {step === 'register'
                ? 'Create your account'
                : `Code sent to ${maskEmail(form.email)}`}
            </p>
          </div>

          {/* ── REGISTER STEP ── */}
          {step === 'register' ? (
            <>
              {/* Retry banner */}
              {registerError && (
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    background: 'rgba(255, 80, 80, 0.12)', border: '1px solid rgba(255,80,80,0.3)',
                    borderRadius: '10px', padding: '12px 14px', marginBottom: '20px',
                    color: '#ff6b6b', fontSize: '0.84rem',
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{registerError}</span>
                </div>
              )}

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
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-500)' }} />
                    <input
                      type="email"
                      className="form-input"
                      style={{ paddingLeft: '48px' }}
                      placeholder="operative@agency.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Password</label>
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
                      disabled={loading}
                      required
                    />
                    <button
                      type="button"
                      style={{
                        position: 'absolute', right: '16px', top: '50%',
                        transform: 'translateY(-50%)', background: 'none',
                        border: 'none', color: 'var(--gray-500)', cursor: 'pointer',
                      }}
                      onClick={() => setShowPw(!showPw)}
                    >
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-block btn-lg"
                  disabled={loading}
                  style={{ marginTop: '8px' }}
                >
                  {loading ? (
                    <>
                      <span
                        style={{
                          display: 'inline-block', width: '16px', height: '16px',
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderTopColor: '#fff', borderRadius: '50%',
                          animation: 'spin 0.7s linear infinite',
                        }}
                      />
                      SENDING CODE...
                    </>
                  ) : registerError ? (
                    <><RefreshCw size={18} /> RETRY</>
                  ) : (
                    <>CREATE ACCOUNT <ArrowRight size={18} /></>
                  )}
                </button>
              </form>

              <div className="view-filters" style={{ margin: '24px 0', border: 'none', padding: 0 }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }} />
                <span style={{ padding: '0 12px', fontSize: '0.65rem', fontWeight: 800, color: 'var(--gray-600)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>OR</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }} />
              </div>

              <button
                type="button"
                className="btn btn-outline btn-block"
                onClick={() => googleLogin()}
                disabled={loading}
                style={{ gap: '12px', height: '54px' }}
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" style={{ width: '20px' }} />
                <span>Continue with Google</span>
              </button>
            </>
          ) : (
            /* ── OTP STEP ── */
            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="form-group">
                <label>Verification Code</label>
                <input
                  ref={otpInputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  className="form-input"
                  style={{
                    textAlign: 'center', fontSize: '1.5rem',
                    letterSpacing: '8px', fontWeight: 800, height: '60px',
                  }}
                  placeholder="000000"
                  value={otp}
                  maxLength={6}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  disabled={loading}
                  required
                />
                <p style={{ color: 'var(--gray-500)', fontSize: '0.78rem', marginTop: '6px', textAlign: 'center' }}>
                  Auto-submits when all 6 digits are entered
                </p>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-block btn-lg"
                disabled={loading || otp.length < 6}
              >
                {loading ? (
                  <>
                    <span
                      style={{
                        display: 'inline-block', width: '16px', height: '16px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: '#fff', borderRadius: '50%',
                        animation: 'spin 0.7s linear infinite',
                      }}
                    />
                    VERIFYING...
                  </>
                ) : (
                  <>CONFIRM IDENTITY <ShieldCheck size={18} /></>
                )}
              </button>

              {/* Resend section */}
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: 'var(--gray-500)', fontSize: '0.85rem', marginBottom: '8px' }}>
                  Didn't receive the code?
                </p>

                {otpDailyCount >= MAX_DAILY_OTP ? (
                  <p style={{ color: '#ff6b6b', fontSize: '0.82rem', fontWeight: 600 }}>
                    Daily OTP limit reached. Try again tomorrow.
                  </p>
                ) : cooldown > 0 ? (
                  <p style={{ color: 'var(--gray-500)', fontSize: '0.85rem', fontWeight: 700 }}>
                    Resend available in{' '}
                    <span style={{ color: 'var(--blue-light)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatCooldown(cooldown)}
                    </span>
                  </p>
                ) : (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    style={{
                      border: 'none', background: 'none',
                      color: 'var(--blue-light)', fontWeight: 800,
                      cursor: canResend && !loading ? 'pointer' : 'not-allowed',
                      opacity: loading ? 0.6 : 1,
                    }}
                    onClick={handleResend}
                    disabled={!canResend || loading}
                  >
                    {loading ? 'SENDING...' : 'RESEND CODE'}
                  </button>
                )}

                {/* Go back link */}
                <button
                  type="button"
                  style={{
                    display: 'block', margin: '16px auto 0', background: 'none',
                    border: 'none', color: 'var(--gray-500)', fontSize: '0.8rem',
                    cursor: 'pointer', textDecoration: 'underline',
                  }}
                  onClick={() => { setStep('register'); setOtp(''); setRegisterError(null); }}
                >
                  ← Use a different email
                </button>
              </div>
            </form>
          )}

          <div className="text-center" style={{ marginTop: '32px', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--gray-500)' }}>Already have an account? </span>
            <Link to="/login" style={{ color: 'var(--blue-light)', fontWeight: 700, textDecoration: 'none' }}>
              Log in
            </Link>
          </div>
        </div>
      </div>

      {/* Spin keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default RegisterPage;
