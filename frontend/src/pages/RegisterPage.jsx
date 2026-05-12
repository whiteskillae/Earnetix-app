import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import { useGoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { Mail, Lock, User, Zap, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';
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
      
      if (!res.data.user.isProfileComplete && res.data.user.role !== 'admin') {
        navigate('/onboarding');
      } else {
        navigate(res.data.user.role === 'admin' ? '/admin' : '/dashboard');
      }
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
    <div className="auth-container">
      <div className="auth-bg-glow"></div>
      <div className="auth-bg-glow secondary"></div>
      
      <div className="auth-wrapper slide-up">
        <div className="auth-card-premium glass-panel">
          <div className="auth-header-new">
            <div className="logo-badge">
              <Zap size={32} fill="#3b82f6" color="#3b82f6" />
            </div>
            <h1>{step === 'register' ? 'JOIN EARNITIX' : 'VERIFY EMAIL'}</h1>
            <p>{step === 'register' ? 'Start your journey to premium rewards' : `Code sent to ${form.email}`}</p>
          </div>

          {step === 'register' ? (
            <>
              <form onSubmit={handleRegister} className="auth-form-new">
                <div className="input-group-new">
                  <label>Display Name</label>
                  <div className="input-field-wrap">
                    <User size={18} className="field-icon" />
                    <input 
                      type="text" 
                      placeholder="e.g. John Doe" 
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })} 
                      required 
                    />
                  </div>
                </div>

                <div className="input-group-new">
                  <label>Professional Email</label>
                  <div className="input-field-wrap">
                    <Mail size={18} className="field-icon" />
                    <input 
                      type="email" 
                      placeholder="name@company.com" 
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })} 
                      required 
                    />
                  </div>
                </div>

                <div className="input-group-new">
                  <label>Choose Password</label>
                  <div className="input-field-wrap">
                    <Lock size={18} className="field-icon" />
                    <input 
                      type={showPw ? 'text' : 'password'} 
                      placeholder="••••••••••••" 
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })} 
                      minLength={8}
                      required 
                    />
                    <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn-auth-primary" disabled={loading}>
                  {loading ? 'Initializing...' : 'Create My Account'}
                  {!loading && <ArrowRight size={18} />}
                </button>
              </form>

              <div className="auth-separator">
                <span>OR SIGNUP WITH</span>
              </div>

              <button type="button" className="google-auth-btn" onClick={() => googleLogin()}>
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
                <span>Google Registration</span>
              </button>
            </>
          ) : (
            <form onSubmit={handleVerifyOtp} className="auth-form-new">
               <div className="input-group-new">
                  <label>Verification Code</label>
                  <div className="otp-field-container">
                    <input 
                      type="text" 
                      className="otp-input-main"
                      placeholder="000000" 
                      value={otp} 
                      maxLength={6}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} 
                      required 
                    />
                  </div>
               </div>

               <button type="submit" className="btn-auth-primary" disabled={loading}>
                  {loading ? 'Verifying...' : 'Complete Verification'}
                  <ShieldCheck size={18} />
               </button>

               <div className="resend-section">
                  <p>Didn't get the code?</p>
                  <button type="button" onClick={handleResendOtp} disabled={loading}>
                    Resend New Code
                  </button>
               </div>
            </form>
          )}

          <div className="auth-bottom-cta">
            Already registered? <Link to="/login">Sign in to Account</Link>
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

        .otp-input-main {
           width: 100%;
           background: rgba(255,255,255,0.03);
           border: 1px solid rgba(255,255,255,0.08);
           padding: 20px;
           border-radius: 14px;
           color: white;
           font-size: 2rem;
           text-align: center;
           letter-spacing: 12px;
           font-weight: 800;
        }

        .resend-section {
           text-align: center;
           font-size: 0.85rem;
        }

        .resend-section p { color: #64748b; margin-bottom: 4px; }
        .resend-section button { background: none; border: none; color: #3b82f6; font-weight: 700; cursor: pointer; }
      `}</style>
    </div>
  );
};

export default RegisterPage;
