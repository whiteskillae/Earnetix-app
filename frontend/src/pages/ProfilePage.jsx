import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useApi } from '../hooks/useApi';
import Loader from '../components/common/Loader';
import toast from 'react-hot-toast';
import { Zap, Mail, User, CheckCircle, XCircle, Clock, RefreshCw, LogOut, Phone, Globe, Target, Edit3, X, MapPin } from 'lucide-react';

const ProfilePage = () => {
  const { user, fetchProfile, logout, setUser } = useAuth();
  const { request } = useApi();
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    mobileNumber: user?.mobileNumber || '',
    country: user?.country || 'India',
    countryCode: user?.countryCode || '+91',
    qualifications: user?.qualifications || '',
    skills: user?.skills?.join(', ') || ''
  });

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
    e.preventDefault();
    setEditLoading(true);
    try {
      const skillsArray = typeof formData.skills === 'string' 
        ? formData.skills.split(',').map(s => s.trim()).filter(s => s)
        : formData.skills;

      const res = await request('put', '/users/profile', {
        ...formData,
        skills: skillsArray
      });
      
      if (res.success) {
        toast.success('Profile updated!');
        setUser(res.data);
        setIsEditModalOpen(false);
      }
    } catch (err) {
      toast.error('Update failed');
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="profile-page fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>My Account</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-outline btn-sm" onClick={() => setIsEditModalOpen(true)}>
            <Edit3 size={16} /> Edit
          </button>
          <button className="btn btn-outline btn-sm" onClick={logout} style={{ color: 'var(--rejected)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      {/* Profile Header Card */}
      <div className="profile-header-card glass-panel">
         <div className="user-info-section">
            <div className="profile-avatar-huge">{user?.name?.charAt(0).toUpperCase()}</div>
            <div className="user-text">
               <h2>{user?.name}</h2>
               <p><Mail size={14} /> {user?.email}</p>
               <div className="user-tags">
                  <span className="tag"><Globe size={12} /> {user?.country}</span>
                  <span className="tag"><Phone size={12} /> {user?.countryCode} {user?.mobileNumber}</span>
               </div>
            </div>
         </div>
         <div className="points-display-premium">
            <div className="points-val"><Zap size={24} fill="#fbbf24" color="#fbbf24" /> {user?.points || 0}</div>
            <span className="points-label">AVAILABLE POINTS</span>
         </div>
      </div>

      {/* Detailed Info Grid */}
      <div className="profile-details-grid grid-2">
         <div className="glass-panel detail-card">
            <h4 className="flex-gap"><Target size={18} color="#3b82f6" /> Education & Background</h4>
            <div className="detail-item">
               <span className="label">Qualification</span>
               <span className="value">{user?.qualifications || 'Not specified'}</span>
            </div>
            <div className="detail-item">
               <span className="label">Skills & Expertise</span>
               <div className="skills-wrap">
                  {user?.skills?.length > 0 ? user.skills.map(skill => (
                    <span key={skill} className="skill-chip">{skill}</span>
                  )) : <span className="value">No skills added</span>}
               </div>
            </div>
         </div>

         <div className="glass-panel detail-card">
            <h4 className="flex-gap"><CheckCircle size={18} color="#10b981" /> Performance Stats</h4>
            <div className="stats-mini-row">
               <div className="mini-box">
                  <span className="val">{subs.length}</span>
                  <span className="lab">Total</span>
               </div>
               <div className="mini-box">
                  <span className="val">{subs.filter(s => s.status === 'approved').length}</span>
                  <span className="lab">Approved</span>
               </div>
               <div className="mini-box">
                  <span className="val">{subs.filter(s => s.status === 'pending').length}</span>
                  <span className="lab">Pending</span>
               </div>
            </div>
         </div>
      </div>

      {/* Submissions Section */}
      <div className="card" style={{ marginTop: '32px' }}>
        <div className="flex-between" style={{ marginBottom: '24px' }}>
          <h3>Submissions History</h3>
          <div className="filter-chips">
            {['all', 'pending', 'approved', 'rejected'].map((f) => (
              <button key={f} className={`filter-chip ${filter === f ? 'active' : ''}`}
                onClick={() => { setFilter(f); setLoading(true); }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? <Loader /> : subs.length === 0 ? (
          <div className="empty-state"><h3>No records found</h3></div>
        ) : (
          <div className="table-container">
            <table>
              <thead><tr><th>Task Campaign</th><th>Reward</th><th>Status</th><th>Updated</th></tr></thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s._id}>
                    <td style={{ fontWeight: 600 }}>{s.taskId?.title || '—'}</td>
                    <td style={{ fontWeight: 700, color: '#10b981' }}>+{s.taskId?.rewardPoints}</td>
                    <td>
                       <span className={`status-pill ${s.status}`}>{s.status}</span>
                    </td>
                    <td style={{ fontSize: '0.8rem', opacity: 0.6 }}>{new Date(s.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay">
           <div className="modal-content glass-panel slide-up">
              <div className="modal-header">
                 <h3>Edit Personal Information</h3>
                 <button onClick={() => setIsEditModalOpen(false)} className="btn-icon"><X size={20} /></button>
              </div>
              <form onSubmit={handleUpdate} className="edit-form">
                 <div className="form-group">
                    <label>Full Name</label>
                    <input className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                 </div>
                 <div className="grid-2">
                    <div className="form-group">
                       <label>Country</label>
                       <select className="form-input" value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} required>
                          <option value="India">India</option>
                          <option value="United States">United States</option>
                          <option value="United Kingdom">United Kingdom</option>
                          <option value="Canada">Canada</option>
                          <option value="UAE">UAE</option>
                       </select>
                    </div>
                    <div className="form-group">
                       <label>Mobile Number</label>
                       <input className="form-input" value={formData.mobileNumber} onChange={e => setFormData({...formData, mobileNumber: e.target.value})} required />
                    </div>
                 </div>
                 <div className="form-group">
                    <label>Qualifications</label>
                    <input className="form-input" value={formData.qualifications} onChange={e => setFormData({...formData, qualifications: e.target.value})} />
                 </div>
                 <div className="form-group">
                    <label>Skills (Comma separated)</label>
                    <input className="form-input" value={formData.skills} onChange={e => setFormData({...formData, skills: e.target.value})} />
                 </div>
                 <button className="btn btn-primary btn-block" disabled={editLoading}>
                    {editLoading ? 'Saving...' : 'Update Profile'}
                 </button>
              </form>
           </div>
        </div>
      )}

      <style>{`
        .profile-page { padding-bottom: 100px; }
        .profile-header-card { display: flex; justify-content: space-between; align-items: center; padding: 32px; margin-bottom: 24px; border-radius: 24px; gap: 20px; }
        .user-info-section { display: flex; align-items: center; gap: 24px; }
        .profile-avatar-huge { width: 80px; height: 80px; border-radius: 24px; background: var(--blue-gradient); display: flex; align-items: center; justifyContent: center; font-size: 2rem; font-weight: 800; color: white; box-shadow: 0 10px 20px rgba(59, 130, 246, 0.3); }
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

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); display: flex; align-items: center; justifyContent: center; z-index: 2000; padding: 20px; }
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
