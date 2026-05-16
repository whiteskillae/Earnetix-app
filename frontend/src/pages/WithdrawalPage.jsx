import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useApi } from '../hooks/useApi';
import { executeCaptcha } from '../utils/captcha';
import toast from 'react-hot-toast';
import { Wallet, Banknote, ArrowRight, CheckCircle, Clock, AlertCircle, DollarSign, Shield, CreditCard, Building } from 'lucide-react';

const POINTS_PER_DOLLAR = 100;
const MIN_POINTS = 3000;

const WithdrawalPage = () => {
  const { user, fetchProfile, isKycVerified } = useAuth();
  const { request } = useApi();
  const [step, setStep] = useState(1); // 1: Bank, 2: Convert, 3: Confirm
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bankForm, setBankForm] = useState({
    accountName: user?.bankDetails?.accountName || '',
    accountNumber: user?.bankDetails?.accountNumber || '',
    ifscCode: user?.bankDetails?.ifscCode || '',
    bankName: user?.bankDetails?.bankName || '',
    upiId: user?.bankDetails?.upiId || '',
  });
  const [pointsToConvert, setPointsToConvert] = useState(MIN_POINTS);

  useEffect(() => {
    const key = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY;
    console.log('reCAPTCHA Enterprise Diagnostic (Withdraw):', key ? 'READY' : 'MISSING');
  }, []);

  const availablePoints = (user?.points || 0) - (user?.frozenPoints || 0);
  const hasBankDetails = user?.bankDetails?.accountNumber;
  const hasPendingWithdrawal = withdrawals.some(w => w.status === 'pending' || w.status === 'processing');

  useEffect(() => {
    fetchWithdrawals();
    if (hasBankDetails) setStep(2);
  }, []);

  const fetchWithdrawals = async () => {
    try {
      const res = await request('get', '/withdrawals/my');
      if (res.success) setWithdrawals(res.data);
    } catch {}
  };

  const handleSaveBank = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await request('post', '/withdrawals/bank-details', bankForm);
      if (res.success) {
        toast.success('Bank details saved securely');
        await fetchProfile();
        setStep(2);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save bank details');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (pointsToConvert < MIN_POINTS) return toast.error(`Minimum ${MIN_POINTS} points required`);
    if (pointsToConvert > availablePoints) return toast.error('Insufficient available points');

    setLoading(true);
    try {
      const token = await executeCaptcha('WITHDRAWAL');
      if (!token) {
        setLoading(false);
        return toast.error('Security handshake failed. Please refresh.');
      }

      const res = await request('post', '/withdrawals/request', { 
        pointsToConvert,
        captchaToken: token 
      });
      if (res.success) {
        toast.success('Withdrawal request submitted!');
        await fetchProfile();
        await fetchWithdrawals();
        setStep(3);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Withdrawal failed');
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    pending: { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', label: 'Pending' },
    processing: { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', label: 'Processing' },
    completed: { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', label: 'Completed' },
    rejected: { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', label: 'Rejected' },
  };

  if (user?.isBlocked) {
    return (
      <div className="withdrawal-page fade-in" style={{ textAlign: 'center', padding: '100px 20px' }}>
        <div style={{ width: '80px', height: '80px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <AlertCircle size={40} color="#ef4444" />
        </div>
        <h2 style={{ marginBottom: '12px' }}>Unavailable Service</h2>
        <p style={{ color: '#94a3b8', maxWidth: '400px', margin: '0 auto 24px' }}>
          Your withdrawal privilege has been suspended. Please connect with the administration team to resolve any pending account issues.
        </p>
        <button className="btn btn-primary" onClick={() => window.location.href = 'mailto:support@earnitix.app'}>
          Contact Support Team
        </button>
      </div>
    );
  }

  if (!isKycVerified) {
    return (
      <div className="withdrawal-page fade-in" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ width: '80px', height: '80px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <Shield size={40} color="#f59e0b" />
        </div>
        <h2 style={{ marginBottom: '12px' }}>KYC Required</h2>
        <p style={{ color: '#94a3b8', maxWidth: '400px', margin: '0 auto' }}>
          Complete your identity verification before requesting withdrawals. This helps us secure your account and payments.
        </p>
      </div>
    );
  }

  return (
    <div className="withdrawal-page fade-in">
      <div className="page-header" style={{ marginBottom: '32px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Wallet size={28} color="#10b981" /> Withdrawal Center
        </h1>
        <p style={{ color: '#94a3b8' }}>Convert your points to real money</p>
      </div>

      {/* Balance Overview */}
      <div className="glass-panel slide-up" style={{ padding: '28px', marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Available Balance</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 900, margin: '4px 0 0' }}>{availablePoints.toLocaleString()}</h2>
            <span style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: 800 }}>PTS</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0' }}>
            ≈ ${(availablePoints / POINTS_PER_DOLLAR).toFixed(2)} USD
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          {(user?.frozenPoints || 0) > 0 && (
            <div style={{ background: 'rgba(245, 158, 11, 0.08)', padding: '8px 16px', borderRadius: '12px', fontSize: '0.8rem' }}>
              <span style={{ color: '#f59e0b' }}>🔒 {user.frozenPoints.toLocaleString()} pts frozen</span>
            </div>
          )}
          <p style={{ fontSize: '0.75rem', color: '#475569', marginTop: '8px' }}>Min withdrawal: {MIN_POINTS} pts ($30)</p>
        </div>
      </div>

      {/* Step Progress */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
        {['Bank Details', 'Convert Points', 'Confirmation'].map((label, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ height: '4px', borderRadius: '2px', background: step > i ? '#10b981' : step === i + 1 ? '#3b82f6' : 'rgba(255,255,255,0.05)', marginBottom: '8px', transition: 'all 0.3s' }}></div>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: step > i ? '#10b981' : '#64748b' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Step 1: Bank Details */}
      {step === 1 && (
        <div className="glass-panel slide-up" style={{ padding: '32px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
            <Building size={20} color="#3b82f6" /> Bank Account Details
          </h3>
          <form onSubmit={handleSaveBank}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Account Holder Name</label>
                <input className="form-input" placeholder="Full name as per bank" value={bankForm.accountName} onChange={e => setBankForm({...bankForm, accountName: e.target.value})} required />
              </div>
              <div className="grid-2" style={{ gap: '16px' }}>
                <div className="form-group">
                  <label>Account Number</label>
                  <input className="form-input" placeholder="Bank account number" value={bankForm.accountNumber} onChange={e => setBankForm({...bankForm, accountNumber: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>IFSC / Sort Code</label>
                  <input className="form-input" placeholder="IFSC code" value={bankForm.ifscCode} onChange={e => setBankForm({...bankForm, ifscCode: e.target.value})} />
                </div>
              </div>
              <div className="grid-2" style={{ gap: '16px' }}>
                <div className="form-group">
                  <label>Bank Name</label>
                  <input className="form-input" placeholder="e.g. State Bank of India" value={bankForm.bankName} onChange={e => setBankForm({...bankForm, bankName: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>UPI ID (optional)</label>
                  <input className="form-input" placeholder="name@upi" value={bankForm.upiId} onChange={e => setBankForm({...bankForm, upiId: e.target.value})} />
                </div>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '24px' }} disabled={loading}>
              {loading ? 'Saving...' : 'Save & Continue'} <ArrowRight size={18} />
            </button>
          </form>
        </div>
      )}

      {/* Step 2: Convert Points */}
      {step === 2 && !hasPendingWithdrawal && (
        <div className="glass-panel slide-up" style={{ padding: '32px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
            <DollarSign size={20} color="#10b981" /> Convert Points to Money
          </h3>

          {availablePoints < MIN_POINTS ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <AlertCircle size={48} color="#f59e0b" style={{ opacity: 0.5, marginBottom: '16px' }} />
              <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                You need at least <strong>{MIN_POINTS.toLocaleString()} points</strong> to withdraw.
                <br />You currently have <strong>{availablePoints.toLocaleString()} points</strong>.
              </p>
            </div>
          ) : (
            <>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label>Points to Convert</label>
                <input 
                  type="number" 
                  className="form-input" 
                  min={MIN_POINTS} 
                  max={availablePoints} 
                  step={100}
                  value={pointsToConvert} 
                  onChange={e => setPointsToConvert(Number(e.target.value))}
                  style={{ fontSize: '1.5rem', fontWeight: 800, textAlign: 'center' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                {[3000, 5000, 10000].filter(v => v <= availablePoints).map(val => (
                  <button 
                    key={val} 
                    className="btn btn-outline" 
                    style={{ flex: 1, fontSize: '0.8rem' }}
                    onClick={() => setPointsToConvert(val)}
                  >
                    {val.toLocaleString()} pts (${val / POINTS_PER_DOLLAR})
                  </button>
                ))}
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: '16px', padding: '20px', marginBottom: '24px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>YOU WILL RECEIVE</span>
                <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#10b981', margin: '8px 0 0' }}>
                  ${(pointsToConvert / POINTS_PER_DOLLAR).toFixed(2)}
                </h2>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0' }}>
                  Processing time: 3-5 working days
                </p>
              </div>

              <div style={{ display: 'none' }}>
                {/* reCAPTCHA Enterprise is invisible */}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setStep(1)}>
                   Edit Bank Details
                </button>
                <button 
                  className="btn btn-primary" 
                  style={{ flex: 2 }} 
                  onClick={handleWithdraw} 
                  disabled={loading || pointsToConvert < MIN_POINTS || pointsToConvert > availablePoints}
                >
                  {loading ? 'Processing...' : 'Withdraw'} <Wallet size={18} />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 3 / Pending status */}
      {(step === 3 || hasPendingWithdrawal) && (
        <div className="glass-panel slide-up" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Clock size={40} color="#10b981" />
          </div>
          <h2 style={{ marginBottom: '12px' }}>Withdrawal Request Registered</h2>
          <p style={{ color: '#94a3b8', maxWidth: '400px', margin: '0 auto 24px', lineHeight: 1.6 }}>
            Your reward money will be credited to your bank account within <strong>3-5 working days</strong>. 
            You will be notified once the payment is processed.
          </p>
          <div style={{ background: 'rgba(245, 158, 11, 0.06)', borderRadius: '12px', padding: '12px', fontSize: '0.8rem', color: '#f59e0b' }}>
            ⚠ Your points are frozen during processing and cannot be edited.
          </div>
        </div>
      )}

      {/* Withdrawal History */}
      {withdrawals.length > 0 && (
        <div className="glass-panel" style={{ padding: '24px', marginTop: '28px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <CreditCard size={20} color="#8b5cf6" /> Transaction History
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {withdrawals.map(w => {
              const st = statusColors[w.status] || statusColors.pending;
              return (
                <div key={w._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1rem' }}>${w.amountUSD}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{w.pointsUsed.toLocaleString()} pts • {new Date(w.createdAt).toLocaleDateString()}</div>
                    {w.adminNote && w.status !== 'pending' && (
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px' }}>Note: {w.adminNote}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {w.status === 'rejected' && (
                      <button 
                        className="btn btn-sm" 
                        style={{ fontSize: '0.7rem', padding: '6px 12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }}
                        onClick={() => setStep(2)}
                      >
                        Request Again
                      </button>
                    )}
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '6px 14px', borderRadius: '10px', background: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default WithdrawalPage;
