import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { Shield, ShieldOff, Clock, Search, UserMinus, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const BlockManagement = () => {
  const { request, loading: apiLoading } = useApi();
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchBlocked = async () => {
    try {
      const res = await request('get', '/admin/users/blocked');
      if (res.success) setBlockedUsers(res.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchBlocked();
  }, []);

  const handleUnblock = async (id) => {
    try {
      const res = await request('post', `/admin/users/${id}/unblock`);
      if (res.success) {
        toast.success('User restored to active duty');
        fetchBlocked();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unblock failed');
    }
  };

  const getBlockType = (user) => {
    if (user.isBlocked) return { label: 'Permanent Ban', color: '#ef4444', icon: <Shield size={14} /> };
    if (user.blockedUntil && new Date(user.blockedUntil) > new Date()) return { label: 'Temp Block', color: '#f59e0b', icon: <Clock size={14} /> };
    if (user.kycStatus === 'rejected') return { label: 'KYC Restricted', color: '#ec4899', icon: <AlertCircle size={14} /> };
    return { label: 'Unknown Restriction', color: '#64748b', icon: <AlertCircle size={14} /> };
  };

  const filtered = blockedUsers.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="block-management fade-in">
      <div className="glass-panel" style={{ padding: '32px', borderRadius: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', color: 'var(--white)' }}>Access Control Center</h2>
            <p style={{ color: 'var(--gray-400)', fontSize: '0.9rem' }}>Review and remediate restricted account access across the platform.</p>
          </div>

          <div className="search-box" style={{ width: '300px' }}>
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Filter restricted agents..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Identity</th>
                <th>Restriction Type</th>
                <th>Violation Detail</th>
                <th>Logged Date</th>
                <th className="text-right">Remediation</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="text-center" style={{ padding: '40px' }}>Analyzing secure databases...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="5" className="text-center" style={{ padding: '40px', color: 'var(--gray-500)' }}>No restricted agents found in current sector.</td></tr>
              ) : (
                filtered.map(u => {
                  const type = getBlockType(u);
                  return (
                    <tr key={u._id}>
                      <td>
                        <div className="user-info-cell">
                          <span className="user-name" style={{ color: 'white', fontWeight: 700 }}>@{u.username || u.name}</span>
                          <span className="user-email" style={{ fontSize: '0.75rem' }}>{u.email}</span>
                        </div>
                      </td>
                      <td>
                        <span className="status-pill" style={{ background: `${type.color}15`, color: type.color, display: 'flex', alignItems: 'center', gap: '6px', width: 'fit-content' }}>
                          {type.icon} {type.label}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', color: 'var(--gray-400)' }}>
                          {u.isBlocked ? 'Security/Policy Violation' : 
                           isTempBlocked(u) ? `Expires ${new Date(u.blockedUntil).toLocaleString()}` : 
                           'KYC Verification Failed'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem' }}>{new Date(u.updatedAt).toLocaleDateString()}</span>
                      </td>
                      <td className="text-right">
                        <button 
                          className="btn btn-outline btn-sm" 
                          style={{ borderColor: 'rgba(16, 185, 129, 0.3)', color: '#10b981' }}
                          onClick={() => handleUnblock(u._id)}
                        >
                          <ShieldOff size={14} /> Restore Access
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .block-management { margin-top: 24px; }
        .block-badge-temp {
          display: inline-flex;
          align-items: center;
          padding: 4px 12px;
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
          border-radius: 100px;
          font-size: 0.75rem;
          font-weight: 700;
        }
      `}</style>
    </div>
  );
};

const isTempBlocked = (user) => {
  return user.blockedUntil && new Date(user.blockedUntil) > new Date();
};

export default BlockManagement;
