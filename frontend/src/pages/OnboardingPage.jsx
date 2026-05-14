import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useApi } from '../hooks/useApi';
import toast from 'react-hot-toast';
import Loader from '../components/common/Loader';
import { User, Phone, Globe, MapPin, ArrowRight, Target, Zap, FileText, Upload, CheckCircle, Shield } from 'lucide-react';
import Select from 'react-select';
import { countries } from '../utils/countries';

const OnboardingPage = () => {
  const { user, setUser, fetchProfile } = useAuth();
  const { request } = useApi();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [step, setStep] = useState(1); // Step 1: Profile, Step 2: KYC
  const [kycFile, setKycFile] = useState(null);
  const [kycDocType, setKycDocType] = useState('aadhar');
  const [formData, setFormData] = useState({
    name: user?.name || '',
    mobileNumber: '',
    countryCode: '+91',
    country: 'India',
    qualifications: '',
    skills: []
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await request('get', '/skill-categories');
        if (res.success) setCategories(res.data);
      } catch (err) {}
    };
    fetchCategories();
  }, []);

  const skillOptions = categories.flatMap(cat => 
    cat.skills.map(skill => ({ label: skill, value: skill, category: cat.name }))
  );

  useEffect(() => {
    if (user?.isProfileComplete && (user?.onboardingVersion || 0) >= 1) {
      if (user?.kycStatus === 'none' || user?.kycStatus === 'rejected') {
        setStep(2);
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, navigate]);

  const selectStyles = {
    control: (base) => ({
      ...base,
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '16px',
      padding: '8px',
      color: 'white',
      boxShadow: 'none',
      '&:hover': { borderColor: 'var(--blue-light)' }
    }),
    menu: (base) => ({
      ...base,
      background: '#1a1a2e',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '16px',
      padding: '8px',
      zIndex: 100
    }),
    option: (base, state) => ({
      ...base,
      background: state.isFocused ? 'var(--blue-gradient)' : 'transparent',
      color: 'white',
      borderRadius: '12px',
      cursor: 'pointer'
    }),
    multiValue: (base) => ({
      ...base,
      background: 'var(--blue-glow)',
      borderRadius: '8px',
      border: '1px solid rgba(59, 130, 246, 0.3)'
    }),
    multiValueLabel: (base) => ({ ...base, color: 'var(--blue-light)', fontWeight: 700 }),
    multiValueRemove: (base) => ({ ...base, color: 'var(--blue-light)', '&:hover': { background: 'rgba(255,255,255,0.1)', color: 'white' } }),
    singleValue: (base) => ({ ...base, color: 'white' }),
    input: (base) => ({ ...base, color: 'white' }),
    placeholder: (base) => ({ ...base, color: 'var(--gray-500)' })
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (formData.skills.length === 0) return toast.error('Please select at least one skill');
    if (formData.skills.length > 3) return toast.error('Maximum 3 skills allowed');
    
    setLoading(true);
    try {
      const res = await request('post', '/auth/complete-profile', formData);
      if (res.success) {
        toast.success('Profile saved! Now complete identity verification.');
        setUser(res.data.user);
        setStep(2);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Profile save failed');
    } finally {
      setLoading(false);
    }
  };

  const handleKycSubmit = async (e) => {
    e.preventDefault();
    if (!kycFile) return toast.error('Please upload your identity document');

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('document', kycFile);
      formData.append('documentType', kycDocType);

      const res = await request('post', '/kyc/submit', formData);
      if (res.success) {
        toast.success('KYC submitted! Verification takes 1-3 working days.');
        await fetchProfile();
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'KYC submission failed');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <Loader />;

  return (
    <div className="onboarding-container">
      <div className="onboarding-card fade-in">
        {/* Progress Indicator */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', justifyContent: 'center' }}>
          <div style={{ width: '80px', height: '4px', borderRadius: '2px', background: step >= 1 ? 'var(--blue-light)' : 'rgba(255,255,255,0.1)', transition: 'all 0.3s' }}></div>
          <div style={{ width: '80px', height: '4px', borderRadius: '2px', background: step >= 2 ? 'var(--blue-light)' : 'rgba(255,255,255,0.1)', transition: 'all 0.3s' }}></div>
        </div>

        {step === 1 && (
          <>
            <div className="onboarding-header">
              <div className="onboarding-icon">
                <User size={32} />
              </div>
              <h1>Professional Profile</h1>
              <p>Step 1 of 2 — Set up your work identity</p>
            </div>

            <form onSubmit={handleProfileSubmit} className="onboarding-form">
              <div className="form-group">
                <label><User size={16} /> Full Legal Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="As per identification"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div className="form-group" style={{ width: '100px' }}>
                  <label><Globe size={16} /> Code</label>
                  <input 
                    className="form-input"
                    value={formData.countryCode}
                    readOnly
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label><Phone size={16} /> Secure Mobile</label>
                  <input 
                    type="tel" 
                    className="form-input" 
                    placeholder="10 digit number"
                    value={formData.mobileNumber}
                    onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label><MapPin size={16} /> Operational Region</label>
                <Select
                  options={countries}
                  value={countries.find(c => c.value === formData.country)}
                  onChange={opt => setFormData({...formData, country: opt.value, countryCode: opt.code})}
                  styles={selectStyles}
                />
              </div>

              <div className="form-group">
                <label><Target size={16} /> Expertise Sector (Max 3)</label>
                <Select
                  isMulti
                  options={skillOptions}
                  value={formData.skills.map(s => ({ label: s, value: s }))}
                  onChange={opts => setFormData({...formData, skills: opts ? opts.map(o => o.value) : []})}
                  isOptionDisabled={() => formData.skills.length >= 3}
                  styles={selectStyles}
                  placeholder="Search skills (e.g. Coding, Design...)"
                />
              </div>

              <div className="form-group">
                <label><Zap size={16} /> Highest Credential</label>
                <select 
                  className="form-input"
                  value={formData.qualifications}
                  onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                  required
                >
                  <option value="">Select Qualification</option>
                  <option value="High School">High School</option>
                  <option value="Bachelor Degree">Bachelor's Degree</option>
                  <option value="Master Degree">Master's Degree</option>
                  <option value="PhD">PhD</option>
                  <option value="Diploma">Diploma</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? 'Saving...' : 'Continue to Identity Verification'} <ArrowRight size={18} />
              </button>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <div className="onboarding-header">
              <div className="onboarding-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                <Shield size={32} />
              </div>
              <h1>Identity Verification</h1>
              <p>Step 2 of 2 — Upload your government ID for secure access</p>
            </div>

            {user?.kycRejectionReason && (
              <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '16px', padding: '16px', marginBottom: '24px' }}>
                <p style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 700, margin: '0 0 4px' }}>⚠ Previous submission rejected</p>
                <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0 }}>{user.kycRejectionReason}</p>
              </div>
            )}

            <form onSubmit={handleKycSubmit} className="onboarding-form">
              <div className="form-group">
                <label><FileText size={16} /> Document Type</label>
                <select 
                  className="form-input" 
                  value={kycDocType} 
                  onChange={(e) => setKycDocType(e.target.value)}
                  required
                >
                  <option value="aadhar">Aadhar Card</option>
                  <option value="passport">Passport</option>
                  <option value="national_id">National ID Card</option>
                </select>
              </div>

              <div className="form-group">
                <label><Upload size={16} /> Upload Document (Front Side)</label>
                <div 
                  onClick={() => document.getElementById('kyc-input').click()}
                  style={{ 
                    height: '160px', border: '2px dashed rgba(255,255,255,0.1)', 
                    borderRadius: '20px', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    transition: 'all 0.3s', background: kycFile ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                    borderColor: kycFile ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.1)'
                  }}
                >
                  <input 
                    id="kyc-input" 
                    type="file" 
                    accept="image/*,.pdf" 
                    style={{ display: 'none' }}
                    onChange={(e) => setKycFile(e.target.files[0])} 
                  />
                  {kycFile ? (
                    <div style={{ textAlign: 'center' }}>
                      <CheckCircle size={32} color="#10b981" />
                      <p style={{ margin: '8px 0 0', fontWeight: 700, fontSize: '0.85rem' }}>{kycFile.name}</p>
                      <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#64748b' }}>{(kycFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <>
                      <Upload size={32} color="#64748b" />
                      <p style={{ margin: '12px 0 4px', color: '#94a3b8', fontSize: '0.9rem', fontWeight: 600 }}>Click to upload document</p>
                      <p style={{ margin: 0, color: '#475569', fontSize: '0.75rem' }}>JPG, PNG, PDF — Max 10MB</p>
                    </>
                  )}
                </div>
              </div>

              <div style={{ background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.15)', borderRadius: '16px', padding: '16px', fontSize: '0.8rem', color: '#94a3b8' }}>
                <strong style={{ color: '#3b82f6' }}>🔒 Secure Upload</strong>
                <p style={{ margin: '6px 0 0' }}>Your documents are encrypted and stored securely. Verification typically completes within 1-3 working days.</p>
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={loading || !kycFile}>
                {loading ? 'Submitting...' : 'Submit for Verification'} <Shield size={18} />
              </button>

              <button 
                type="button" 
                className="btn btn-outline btn-block" 
                style={{ marginTop: '-8px' }}
                onClick={() => navigate('/dashboard')}
              >
                Skip for now (limited access)
              </button>
            </form>
          </>
        )}
      </div>

      <style>{`
        .onboarding-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at top right, #1a1a2e, #0f0f1a);
          padding: 20px;
        }
        .onboarding-card {
          width: 100%;
          max-width: 450px;
          background: rgba(23, 23, 33, 0.8);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .onboarding-header {
          text-align: center;
          margin-bottom: 32px;
        }
        .onboarding-icon {
          width: 64px;
          height: 64px;
          background: var(--blue-glow);
          color: var(--blue-light);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
        }
        .onboarding-header h1 {
          font-size: 1.75rem;
          color: var(--white);
          margin-bottom: 8px;
        }
        .onboarding-header p {
          color: var(--gray-400);
          font-size: 0.95rem;
        }
        .onboarding-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .onboarding-form label {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          font-size: 0.85rem;
          color: var(--gray-300);
          font-weight: 500;
        }
        .onboarding-form .btn {
          margin-top: 12px;
          padding: 14px;
          font-size: 1rem;
        }
      `}</style>
    </div>
  );
};

export default OnboardingPage;
