import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import toast from 'react-hot-toast';
import { Mail, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';

const ForgotPasswordPage = () => {
  const [step, setStep] = useState('email'); // email | otp
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const { loading, request } = useApi();
  const navigate = useNavigate();

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendOtp = async (e) => {
    e?.preventDefault();
    if (cooldown > 0) return;
    try {
      await request('post', '/auth/forgot-password', { email });
      toast.success('Verification Code Sent');
      setStep('otp');
      setCooldown(120);
    } catch {}
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    try {
      const res = await request('post', '/auth/verify-forgot-password-otp', { email, otp });
      toast.success('Identity Verified');
      // Navigate to reset password page with token
      navigate('/reset-password', { state: { resetToken: res.data.resetToken } });
    } catch {}
  };

  return (
    <div className="auth-page flex-center fade-in">
      <div className="auth-container" style={{ maxWidth: '420px', width: '100%', padding: '24px' }}>
        <div className="glass-panel slide-up" style={{ padding: '40px' }}>
          <div className="text-center" style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
              {step === 'email' ? 'RECOVER ACCOUNT' : 'VERIFICATION'}
            </h1>
            <p className="subtitle">
              {step === 'email' ? 'Enter your registered email address' : `Code sent to ${email}`}
            </p>
          </div>

          {step === 'email' ? (
            <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Email Address</label>
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

              <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading} style={{ marginTop: '8px' }}>
                {loading ? 'SENDING...' : 'SEND RECOVERY CODE'}
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
               <div className="form-group">
                  <label>Verification Code</label>
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
                  <button 
                    type="button" 
                    className="btn btn-sm btn-outline" 
                    style={{ border: 'none', background: 'none', color: cooldown > 0 ? 'var(--gray-500)' : 'var(--blue-light)', fontWeight: 800, cursor: cooldown > 0 ? 'not-allowed' : 'pointer' }} 
                    onClick={() => handleSendOtp()}
                    disabled={cooldown > 0 || loading}
                  >
                    {cooldown > 0 ? `RESEND IN ${Math.floor(cooldown / 60)}:${(cooldown % 60).toString().padStart(2, '0')}` : 'RESEND CODE'}
                  </button>
               </div>
            </form>
          )}

          <div className="text-center" style={{ marginTop: '32px', fontSize: '0.9rem' }}>
            <Link to="/login" style={{ color: 'var(--gray-400)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <ArrowLeft size={16} /> Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
