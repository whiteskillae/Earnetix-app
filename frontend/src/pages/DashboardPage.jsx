import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useApi } from '../hooks/useApi';
import { useNavigate, Link } from 'react-router-dom';
import { Zap, ListTodo, Clock, CheckCircle, Trophy, ArrowRight, Wallet, Bell, Target, ShieldAlert } from 'lucide-react';

const DashboardPage = () => {
  const { user } = useAuth();
  const { request } = useApi();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentSubs, setRecentSubs] = useState([]);
  const [availableTasks, setAvailableTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subsRes, tasksRes] = await Promise.all([
          request('get', '/submissions/my?limit=5'),
          request('get', '/tasks?limit=5')
        ]);
        
        setRecentSubs(subsRes.data.submissions);
        setAvailableTasks(tasksRes.data.tasks);
        
        const total = subsRes.data.pagination.total;
        const subs = subsRes.data.submissions;
        setStats({
          total,
          pending: subs.filter(s => s.status === 'pending').length,
          approved: subs.filter(s => s.status === 'approved').length,
        });
      } catch {}
      setLoading(false);
    };
    fetchData();
  }, []);

  // Removed blocking null return to allow layout rendering during data fetch
  // if (loading && !stats) return null; 


  return (
    <div className="dashboard-page fade-in">
      {/* Premium Header */}
      <header className="dashboard-header" style={{ marginBottom: '40px' }}>
        <div className="flex-between" style={{ alignItems: 'flex-start' }}>
          <div className="greeting">
            <span className="subtitle" style={{ fontSize: '0.7rem', color: 'var(--blue-light)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Intelligence Terminal</span>
            <h1 style={{ fontSize: '2.2rem', marginTop: '4px' }}>Welcome, {user?.name?.split(' ')[0]}</h1>
          </div>
          <div className="header-actions" style={{ display: 'flex', gap: '12px' }}>
            <button className="btn-icon" style={{ borderRadius: '14px', width: '48px', height: '48px' }} onClick={() => navigate('/announcements')}><Bell size={22} /></button>
            <div className="user-avatar-wrap" style={{ width: '48px', height: '48px', borderRadius: '14px', cursor: 'pointer' }} onClick={() => navigate('/profile')}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Global Asset Card */}
        <div className="glass-panel slide-up" style={{ padding: '24px', marginTop: '24px', border: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ width: '64px', height: '64px', background: 'var(--blue-gradient)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 20px var(--blue-glow)' }}>
                 <Zap size={32} color="white" fill="white" />
              </div>
              <div>
                 <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Credit Assets</span>
                 <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 900, margin: 0 }}>{user?.points?.toLocaleString() || 0}</h2>
                    <span style={{ fontSize: '0.9rem', color: 'var(--green)', fontWeight: 800 }}>PTS</span>
                 </div>
              </div>
           </div>
           <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-primary" style={{ padding: '12px 24px', borderRadius: '16px' }} onClick={() => navigate('/profile')}>
                 <Wallet size={18} /> WITHDRAW
              </button>
           </div>
        </div>
      </header>

      {/* Grid Layout for Stats and Tasks */}
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
        
        {/* Statistics Sector */}
        <section className="dashboard-section slide-up">
           <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
             <Target size={20} color="var(--blue-light)" /> CORE METRICS
           </h3>
           <div className="mini-stats-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="glass-panel" style={{ padding: '20px', borderRadius: '24px', textAlign: 'center' }}>
                 <div style={{ width: '40px', height: '40px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#f59e0b' }}>
                    <Clock size={20} />
                 </div>
                 <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 900 }}>{stats?.pending || 0}</span>
                 <span style={{ fontSize: '0.7rem', color: 'var(--gray-500)', fontWeight: 800 }}>PENDING</span>
              </div>
              <div className="glass-panel" style={{ padding: '20px', borderRadius: '24px', textAlign: 'center' }}>
                 <div style={{ width: '40px', height: '40px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#10b981' }}>
                    <CheckCircle size={20} />
                 </div>
                 <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 900 }}>{stats?.approved || 0}</span>
                 <span style={{ fontSize: '0.7rem', color: 'var(--gray-500)', fontWeight: 800 }}>APPROVED</span>
              </div>
           </div>

           <div className="leaderboard-card-teaser premium-card" style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '20px', cursor: 'pointer' }} onClick={() => navigate('/leaderboard')}>
              <div className="logo-icon" style={{ background: 'var(--green-gradient)', width: '56px', height: '56px', borderRadius: '18px' }}>
                <Trophy size={28} color="white" />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: 0 }}>Leaderboard</h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--gray-500)' }}>Elite Performance Rankings</p>
              </div>
              <ArrowRight size={20} color="var(--gray-500)" />
           </div>
        </section>

        {/* Campaign Sector */}
        <section className="dashboard-section slide-up">
           <div className="flex-between" style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>ACTIVE CAMPAIGNS</h3>
              <Link to="/tasks" style={{ color: 'var(--blue-light)', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none' }}>VIEW ALL</Link>
           </div>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {loading && availableTasks.length === 0 ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="premium-card skeleton-pulse" style={{ height: '80px', borderRadius: '18px' }}></div>
                ))
              ) : availableTasks.length > 0 ? (
                availableTasks.map(task => (
                  <div key={task._id} className="premium-card" style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px' }} onClick={() => navigate('/tasks')}>
                    <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue-light)' }}>
                      <ListTodo size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '0.9rem', margin: 0 }}>{task.title}</h4>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--gray-500)' }}>{task.inputType.toUpperCase()}</p>
                    </div>
                    <div style={{ fontWeight: 900, color: 'var(--green)', fontSize: '0.9rem' }}>+{task.rewardPoints}</div>
                  </div>
                ))
              ) : (
                <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', color: 'var(--gray-500)', fontSize: '0.9rem' }}>
                   No campaigns available in your sector.
                </div>
              )}
           </div>
        </section>
      </div>

      {/* Footer System Status */}
      <footer style={{ marginTop: '48px', padding: '24px', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 10px var(--green)' }}></div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-500)' }}>SYSTEM OPERATIONAL: SECTOR 7-G</span>
         </div>
         <div style={{ display: 'flex', gap: '24px' }}>
            <Link to="/announcements" style={{ color: 'var(--gray-500)', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none' }}>SYSTEM UPDATES</Link>
         </div>
      </footer>
    </div>
  );
};

export default DashboardPage;
