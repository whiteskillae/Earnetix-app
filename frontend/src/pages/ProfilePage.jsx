import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useApi } from '../hooks/useApi';
import Loader from '../components/common/Loader';
import { Zap, Mail, User, CheckCircle, XCircle, Clock, RefreshCw, LogOut } from 'lucide-react';

const ProfilePage = () => {
  const { user, fetchProfile, logout } = useAuth();
  const { request } = useApi();
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

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

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>My Profile</h1>
        <button className="btn btn-outline btn-sm" onClick={logout} style={{ color: 'var(--rejected)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
          <LogOut size={16} /> Logout
        </button>
      </div>

      {/* Profile Card */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--blue), var(--green))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2rem', fontWeight: 700, color: 'var(--white)', flexShrink: 0,
          boxShadow: '0 0 20px var(--blue-glow)'
        }}>
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h2 style={{ color: 'var(--white)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            {user?.name}
          </h2>
          <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9rem', color: 'var(--gray-400)' }}>
            <Mail size={16} /> {user?.email}
          </p>
        </div>
        <div style={{
          background: 'linear-gradient(145deg, var(--dark-800), var(--dark-950))', 
          padding: '20px 32px', 
          borderRadius: 'var(--radius-lg)',
          textAlign: 'center', 
          border: '1px solid var(--dark-700)',
          minWidth: '140px'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: 8, 
            color: 'var(--green)', 
            fontFamily: 'Poppins, sans-serif', 
            fontSize: '2rem', 
            fontWeight: 800 
          }}>
            <Zap size={24} fill="var(--green)" /> {user?.points || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 600, letterSpacing: '1px', marginTop: 4 }}>TOTAL POINTS</div>
        </div>
      </div>

      {/* Submissions */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <h3 style={{ color: 'var(--white)' }}>My Submissions</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            {['all', 'pending', 'approved', 'rejected'].map((f) => (
              <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => { setFilter(f); setLoading(true); }}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? <Loader /> : subs.length === 0 ? (
          <div className="empty-state"><h3>No submissions found</h3></div>
        ) : (
          <div className="table-container">
            <table>
              <thead><tr><th>Task</th><th>Points</th><th>Status</th><th>Reason</th><th>Date</th></tr></thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s._id}>
                    <td style={{ fontWeight: 500, color: 'var(--white)' }}>{s.taskId?.title || '—'}</td>
                    <td>{s.taskId?.rewardPoints || '—'}</td>
                    <td><span className={`badge badge-${s.status}`}>
                      {s.status === 'approved' && <CheckCircle size={12} />}
                      {s.status === 'rejected' && <XCircle size={12} />}
                      {s.status === 'pending' && <Clock size={12} />}
                      {s.status}
                    </span></td>
                    <td style={{ color: 'var(--rejected)', fontSize: '0.85rem' }}>{s.rejectionReason || '—'}</td>
                    <td style={{ color: 'var(--gray-400)', fontSize: '0.85rem' }}>{new Date(s.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
