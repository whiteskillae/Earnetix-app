import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useApi } from '../hooks/useApi';
import { useNavigate } from 'react-router-dom';
import Loader from '../components/common/Loader';
import toast from 'react-hot-toast';
import { Zap, Mail, User, CheckCircle, XCircle, Clock, RefreshCw, LogOut, Phone, Globe, Target, Edit3, X, MapPin, TrendingUp, Wallet, Shield, Lock, Eye, EyeOff } from 'lucide-react';
import Select from 'react-select';
import { countries } from '../utils/countries';

const ProfilePage = () => {
  const { user, fetchProfile, logout, setUser, isAdmin } = useAuth();
  const { request } = useApi();
  const navigate = useNavigate();
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  const selectStyles = {
    control: (base) => ({
      ...base,
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid var(--glass-border)',
      borderRadius: '20px',
      padding: '6px',
      color: 'white',
      boxShadow: 'none',
      '&:hover': { borderColor: 'var(--blue-light)' }
    }),
    menu: (base) => ({
      ...base,
      background: '#1a1a2e',
      border: '1px solid var(--glass-border)',
      borderRadius: '16px',
      padding: '8px'
    }),
    option: (base, state) => ({
      ...base,
      background: state.isFocused ? 'var(--blue-gradient)' : 'transparent',
      color: 'white',
      borderRadius: '12px',
      cursor: 'pointer'
    }),
    singleValue: (base) => ({ ...base, color: 'white' }),
    input: (base) => ({ ...base, color: 'white' }),
    placeholder: (base) => ({ ...base, color: 'var(--gray-500)' })
  };
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    username: user?.username || '',
    bio: user?.bio || '',
    mobileNumber: user?.mobileNumber || '',
    country: user?.country || 'India',
    countryCode: user?.countryCode || '+91',
    qualifications: user?.qualifications || '',
    skills: user?.skills?.join(', ') || ''
  });

  // Sync formData with user context when user data is loaded/updated
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        username: user.username || '',
        bio: user.bio || '',
        mobileNumber: user.mobileNumber || '',
        country: user.country || 'India',
        countryCode: user.countryCode || '+91',
        qualifications: user.qualifications || '',
        skills: user.skills?.join(', ') || ''
      });
    }
  }, [user]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const url = filter === 'all' ? '/submissions/my?limit=50' : `/submissions/my?status=${filter}&limit=50`;
        const res = await request('get', url);
        setSubs(res.data.submissions);
      } catch {}
      setLoading(false);
    };
    fetch();
  }, [filter]);

  const handleUpdate = async (e) => {
    const countWords = (str) => {
      return str.trim().split(/\s+/).filter(word => word.length > 0).length;
    };

    e.preventDefault();
    setEditLoading(true);
    try {
      if (formData.username.length > 15) {
        throw new Error('Username cannot exceed 15 characters');
      }
      if (countWords(formData.bio) > 50) {
        throw new Error('Bio cannot exceed 50 words');
      }

      const skillsArray = typeof formData.skills === 'string' 
        ? formData.skills.split(',').map(s => s.trim()).filter(s => s)
        : formData.skills;

      const res = await request('put', '/users/profile', {
        ...formData,
        skills: skillsArray
      });
      
      if (res.success) {
        toast.success('Identity Updated');
        setUser(res.data);
        setIsEditModalOpen(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update Failed');
    } finally {
      setEditLoading(false);
    }
  };

  if (loading && subs.length === 0) return null; // Quick transition

  return (
    <div className="profile-page fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1>ACCOUNT INTELLIGENCE</h1>
      </div>

      {/* Profile Header Card */}
      <div className="profile-header-card glass-panel" style={{ padding: '40px', borderRadius: '32px', border: '1px solid var(--glass-border)', position: 'relative' }}>
         <div className="user-info-section" style={{ display: 'flex', alignItems: 'flex-start', gap: '32px', flexWrap: 'wrap' }}>
            <div className="avatar-container" style={{ position: 'relative' }}>
              <div className="user-avatar-wrap" style={{ width: '120px', height: '120px', fontSize: '3rem', borderRadius: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', background: 'var(--blue-gradient)' }}>
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <button 
                onClick={() => setIsEditModalOpen(true)}
                style={{ 
                  position: 'absolute', bottom: '-10px', right: '-10px', 
                  background: 'var(--blue)', color: 'white', border: 'none', 
                  borderRadius: '12px', padding: '8px', cursor: 'pointer',
                  boxShadow: '0 8px 16px rgba(59, 130, 246, 0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <Edit3 size={18} />
              </button>
            </div>

            <div className="user-text" style={{ flex: 1, minWidth: '250px' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '4px' }}>
                 <h2 style={{ fontSize: '2.2rem', margin: 0 }}>{user?.name}</h2>
                  {user?.username ? (
                    <span className="tag" style={{ background: 'var(--blue-glow)', color: 'var(--blue-light)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '4px 12px', borderRadius: '100px', fontSize: '0.9rem', fontWeight: 700 }}>
                      @{user.username}
                    </span>
                  ) : !isAdmin ? (
                    <span 
                      onClick={() => setIsEditModalOpen(true)}
                      className="tag" 
                      style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '4px 12px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      + Set Username
                    </span>
                  ) : null}
                  {isAdmin && (
                    <span className="tag" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--blue-light)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '4px 12px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 700 }}>
                      SYSTEM ADMINISTRATOR
                    </span>
                  )}
                </div>
               
               <div style={{ marginBottom: '16px' }}></div>

               <p style={{ color: 'var(--gray-300)', fontSize: '1rem', marginBottom: '16px', lineHeight: '1.6', maxWidth: '600px' }}>
                 {user?.bio || "No mission brief provided. Complete your profile to add a bio."}
               </p>

               <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                 <p style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gray-400)', fontSize: '0.9rem' }}><Mail size={14} /> {user?.email}</p>
                 <p style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gray-400)', fontSize: '0.9rem' }}><MapPin size={14} /> {user?.country}</p>
               </div>
            </div>

            {!isAdmin && (
              <div className="points-display-premium glass-panel" style={{ padding: '24px 32px', borderRadius: '24px', textAlign: 'center', border: '1px solid rgba(251, 191, 36, 0.15)', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', marginLeft: 'auto' }}>
                  <div>
                     <div className="points-val" style={{ color: '#fbbf24', fontSize: '2.5rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '12px' }}>
                       <Zap size={32} fill="#fbbf24" strokeWidth={0} /> {user?.points || 0}
                     </div>
                     <span className="points-label" style={{ color: '#fbbf24', opacity: 0.6, fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.1em' }}>TOTAL ASSETS</span>
                  </div>
                  <button className="btn btn-primary btn-sm" style={{ width: '100%', borderRadius: '12px' }} onClick={() => navigate('/withdraw')}>
                     <Wallet size={16} /> Withdraw
                  </button>
              </div>
            )}
         </div>
      </div>

      {/* Detailed Info Grid */}
      <div className="grid-2" style={{ marginTop: '24px' }}>
         <div className="premium-card">
            <h3 style={{ marginBottom: '24px', fontSize: '1.1rem', color: 'var(--blue-light)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Target size={20} /> BACKGROUND & EXPERTISE
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--gray-500)', fontWeight: 800, textTransform: 'uppercase' }}>Current Qualification</label>
                <p style={{ fontWeight: 700, marginTop: '4px' }}>{user?.qualifications || 'Undisclosed'}</p>
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--gray-500)', fontWeight: 800, textTransform: 'uppercase' }}>Professional Skills</label>
                <div className="skills-wrap" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                   {user?.skills?.length > 0 ? user.skills.map(skill => (
                     <span key={skill} className="skill-chip">{skill}</span>
                   )) : <span style={{ opacity: 0.5 }}>None Listed</span>}
                </div>
              </div>
            </div>
         </div>

         <div className="premium-card">
               <h3 style={{ marginBottom: '24px', fontSize: '1.1rem', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                 <TrendingUp size={20} /> OPERATIONAL EFFICIENCY
               </h3>
               <div className="stats-mini-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', borderRadius: '18px' }}>
                     <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 900 }}>{subs.length}</span>
                     <span style={{ fontSize: '0.65rem', color: 'var(--gray-500)', fontWeight: 700 }}>TASKS</span>
                  </div>
                  <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', borderRadius: '18px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                     <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 900, color: 'var(--green)' }}>{subs.filter(s => s.status === 'approved').length}</span>
                     <span style={{ fontSize: '0.65rem', color: 'var(--gray-500)', fontWeight: 700 }}>SUCCESS</span>
                  </div>
                  <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', borderRadius: '18px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                     <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 900, color: '#f59e0b' }}>{subs.filter(s => s.status === 'pending').length}</span>
                     <span style={{ fontSize: '0.65rem', color: 'var(--gray-500)', fontWeight: 700 }}>PENDING</span>
                  </div>
            </div>


         </div>
      </div>

      {/* Submissions Section */}
      {!isAdmin && (
        <div className="premium-card" style={{ marginTop: '32px' }}>
          <div className="flex-between" style={{ marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <h3>MISSION HISTORY</h3>
            <div className="filter-group">
              {['all', 'pending', 'approved', 'rejected'].map((f) => (
                <button key={f} className={filter === f ? 'active' : ''}
                  onClick={() => { setFilter(f); setLoading(true); }}>
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
  
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Operation</th>
                  <th>Yield</th>
                  <th>Status</th>
                  <th className="text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s._id}>
                    <td style={{ fontWeight: 700, color: 'white' }}>{s.taskId?.title || 'Unknown Mission'}</td>
                    <td style={{ fontWeight: 800, color: 'var(--green)' }}>+{s.taskId?.rewardPoints}</td>
                    <td>
                       <span className={`status-pill-new status-${s.status}`}>{s.status}</span>
                    </td>
                    <td className="text-right" style={{ fontSize: '0.8rem', opacity: 0.6 }}>{new Date(s.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {subs.length === 0 && (
              <div style={{ padding: '60px', textAlign: 'center', opacity: 0.4 }}>
                No operational records for this sector.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="modal-new-overlay">
           <div className="modal-new-content slide-up">
              <div className="modal-header">
                 <h2>UPDATE IDENTITY</h2>
                 <button onClick={() => setIsEditModalOpen(false)} className="modal-close"><X size={20} /></button>
              </div>
              <form onSubmit={handleUpdate}>
                 <div className="grid-2">
                   <div className="form-group">
                      <label>Assigned Name</label>
                      <input className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                   </div>
                   <div className="form-group">
                      <label>Username</label>
                      <input className="form-input" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()})} placeholder="Max 20 chars" maxLength={20} required />
                      <p style={{ fontSize: '0.7rem', color: 'var(--gray-500)', marginTop: '4px' }}>Can be changed once every 30 days.</p>
                   </div>
                 </div>
                 <div className="form-group">
                    <label>Bio / Mission Statement</label>
                    <textarea 
                      className="form-input" 
                      style={{ minHeight: '100px', resize: 'vertical' }}
                      value={formData.bio} 
                      onChange={e => setFormData({...formData, bio: e.target.value})} 
                      placeholder="Tell the community about your expertise..."
                    />
                    <div style={{ textAlign: 'right', fontSize: '0.7rem', color: 'var(--gray-500)' }}>
                      {formData.bio.trim().split(/\s+/).filter(w => w).length}/50 words
                    </div>
                 </div>
                 <div className="grid-2">
                    <div className="form-group">
                       <label>Region</label>
                       <Select
                          options={countries}
                          value={countries.find(c => c.value === formData.country)}
                          onChange={opt => setFormData({...formData, country: opt.value, countryCode: opt.code})}
                          className="react-select-container"
                          classNamePrefix="react-select"
                          styles={selectStyles}
                       />
                    </div>
                    <div className="form-group">
                       <label>Contact String</label>
                       <div style={{ display: 'flex', gap: '8px' }}>
                          <input style={{ width: '80px' }} className="form-input" value={formData.countryCode} onChange={e => setFormData({...formData, countryCode: e.target.value})} placeholder="+91" required />
                          <input style={{ flex: 1 }} className="form-input" value={formData.mobileNumber} onChange={e => setFormData({...formData, mobileNumber: e.target.value})} placeholder="Number" required />
                       </div>
                    </div>
                 </div>
                 <div className="form-group">
                    <label>Qualification Protocol</label>
                    <input className="form-input" value={formData.qualifications} onChange={e => setFormData({...formData, qualifications: e.target.value})} placeholder="e.g. Graduate" />
                 </div>
                 <div className="form-group">
                    <label>Specialist Skills (Comma Delimited)</label>
                    <input className="form-input" value={formData.skills} onChange={e => setFormData({...formData, skills: e.target.value})} placeholder="e.g. Design, Coding" />
                 </div>
                 <button className="btn btn-primary btn-block" style={{ marginTop: '20px', padding: '16px', borderRadius: '16px' }} disabled={editLoading}>
                    {editLoading ? 'SYNCHRONIZING...' : 'EXECUTE UPDATE'}
                 </button>
              </form>
           </div>
        </div>
      )}

      
      <style>{`
        .profile-page { padding-bottom: 100px; }
        .profile-header-card { display: flex; justify-content: space-between; align-items: center; padding: 32px; margin-bottom: 24px; border-radius: 24px; gap: 20px; }
        .user-info-section { display: flex; align-items: center; gap: 24px; }
        .profile-avatar-huge { width: 80px; height: 80px; border-radius: 24px; background: var(--blue-gradient); display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 800; color: white; box-shadow: 0 10px 20px rgba(59, 130, 246, 0.3); }
        .user-text h2 { margin: 0 0 4px; font-size: 1.5rem; }
        .user-text p { margin: 0; color: #64748b; font-size: 0.9rem; display: flex; align-items: center; gap: 6px; }
        .user-tags { display: flex; gap: 10px; margin-top: 12px; }
        .tag { font-size: 0.75rem; background: rgba(255,255,255,0.05); padding: 4px 10px; border-radius: 8px; color: #94a3b8; display: flex; align-items: center; gap: 6px; border: 1px solid rgba(255,255,255,0.05); }
        
        .points-display-premium { text-align: right; background: rgba(251, 191, 36, 0.05); border: 1px solid rgba(251, 191, 36, 0.1); padding: 16px 24px; border-radius: 20px; }
        .points-val { font-size: 1.8rem; font-weight: 800; color: #fbbf24; display: flex; align-items: center; gap: 8px; }
        .points-label { font-size: 0.7rem; color: #fbbf24; opacity: 0.6; font-weight: 700; letter-spacing: 1px; }

        .detail-card h4 { margin-bottom: 20px; font-size: 1rem; }
        .detail-item { margin-bottom: 16px; }
        .detail-item .label { display: block; font-size: 0.75rem; color: #64748b; margin-bottom: 4px; font-weight: 600; }
        .detail-item .value { font-weight: 600; font-size: 0.95rem; }
        .skills-wrap { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
        .skill-chip { font-size: 0.75rem; background: rgba(59, 130, 246, 0.1); color: #3b82f6; padding: 4px 12px; border-radius: 100px; border: 1px solid rgba(59, 130, 246, 0.2); font-weight: 600; }

        .stats-mini-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .mini-box { background: rgba(255,255,255,0.03); padding: 12px; border-radius: 16px; text-align: center; border: 1px solid rgba(255,255,255,0.05); }
        .mini-box .val { display: block; font-size: 1.2rem; font-weight: 800; color: white; }
        .mini-box .lab { font-size: 0.6rem; color: #64748b; font-weight: 700; text-transform: uppercase; }

        .filter-chips { display: flex; gap: 8px; }
        .filter-chip { background: transparent; border: 1px solid rgba(255,255,255,0.1); color: #64748b; padding: 4px 14px; border-radius: 100px; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: all 0.2s; text-transform: capitalize; }
        .filter-chip.active { background: #3b82f6; border-color: #3b82f6; color: white; }

        .status-pill { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; padding: 4px 10px; border-radius: 8px; }
        .status-pill.approved { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .status-pill.pending { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
        .status-pill.rejected { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 20px; }

        .modal-content { width: 100%; max-width: 500px; padding: 32px; border-radius: 24px; position: relative; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .edit-form { display: flex; flex-direction: column; gap: 16px; }

        @media (max-width: 768px) {
          .profile-header-card { flex-direction: column; text-align: center; }
          .user-info-section { flex-direction: column; }
          .points-display-premium { width: 100%; text-align: center; justify-content: center; }
          .points-val { justify-content: center; }
        }
      `}</style>
    </div>
  );
};  
export default ProfilePage;
