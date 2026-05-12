import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useApi } from '../hooks/useApi';
import toast from 'react-hot-toast';
import Loader from '../components/common/Loader';
import { User, Phone, Globe, MapPin, ArrowRight } from 'lucide-react';

const OnboardingPage = () => {
  const { user, setUser } = useAuth();
  const { request } = useApi();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    mobileNumber: '',
    countryCode: '+91',
    country: 'India'
  });

  useEffect(() => {
    if (user?.isProfileComplete) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await request('post', '/auth/complete-profile', formData);
      if (res.success) {
        toast.success('Profile completed!');
        setUser(res.data.user);
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <Loader />;

  return (
    <div className="onboarding-container">
      <div className="onboarding-card fade-in">
        <div className="onboarding-header">
          <div className="onboarding-icon">
            <User size={32} />
          </div>
          <h1>Complete Your Profile</h1>
          <p>Just a few more details to get you started with Earnitix</p>
        </div>

        <form onSubmit={handleSubmit} className="onboarding-form">
          <div className="form-group">
            <label><User size={16} /> Full Name</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Enter your full name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div className="form-group" style={{ width: '100px' }}>
              <label><Globe size={16} /> Code</label>
              <select 
                className="form-input"
                value={formData.countryCode}
                onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                required
              >
                <option value="+91">+91 (IN)</option>
                <option value="+1">+1 (US/CA)</option>
                <option value="+44">+44 (UK)</option>
                <option value="+61">+61 (AU)</option>
                <option value="+971">+971 (UAE)</option>
                <option value="+65">+65 (SG)</option>
                <option value="+49">+49 (DE)</option>
                <option value="+33">+33 (FR)</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label><Phone size={16} /> Mobile Number</label>
              <input 
                type="tel" 
                className="form-input" 
                placeholder="Enter 10 digit number"
                value={formData.mobileNumber}
                onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label><MapPin size={16} /> Country</label>
            <select 
              className="form-input"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              required
            >
              <option value="India">India</option>
              <option value="United States">United States</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="Canada">Canada</option>
              <option value="Australia">Australia</option>
              <option value="United Arab Emirates">UAE</option>
              <option value="Singapore">Singapore</option>
              <option value="Germany">Germany</option>
              <option value="France">France</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label><Target size={16} /> Highest Qualification</label>
            <select 
              className="form-input"
              value={formData.qualifications || ''}
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

          <div className="form-group">
            <label><Zap size={16} /> Key Skills (comma separated)</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Design, Coding, Writing"
              value={formData.skills?.join(', ') || ''}
              onChange={(e) => setFormData({ ...formData, skills: e.target.value.split(',').map(s => s.trim()) })}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Saving Profile...' : 'Complete Registration'} <ArrowRight size={18} />
          </button>
        </form>
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
