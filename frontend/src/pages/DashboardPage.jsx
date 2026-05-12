import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useApi } from '../hooks/useApi';
import { useNavigate, Link } from 'react-router-dom';
import Loader from '../components/common/Loader';
import { Zap, ListTodo, Clock, CheckCircle, Trophy, ArrowRight, Wallet, Bell, Target } from 'lucide-react';

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
          request('get', '/tasks?limit=3')
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

  if (loading) return <Loader text="Syncing with EARNETIX..." />;

  return (
    <div className="dashboard-page fade-in">
      {/* App-like Header */}
      <header className="app-header-home">
        <div className="flex-between">
          <div className="greeting">
            <p className="subtitle">Operational Console</p>
            <h1>Hello, {user?.name?.split(' ')[0]}</h1>
          </div>
          <div className="header-actions">
            <button className="btn-icon"><Bell size={20} /></button>
            <div className="avatar-small" onClick={() => navigate('/profile')}>{user?.name?.charAt(0)}</div>
          </div>
        </div>

        {/* Wallet Card */}
        <div className="wallet-card-premium slide-up">
           <div className="wallet-info">
              <span className="label">Total Credit Balance</span>
              <div className="amount">
                 <Zap size={32} fill="#fbbf24" color="#fbbf24" />
                 <span>{user?.points || 0}</span>
              </div>
              <p className="usd-value">≈ ${(user?.points / 100).toFixed(2)} USD available</p>
           </div>
           <button className="btn-withdraw" onClick={() => navigate('/profile')}>
              <Wallet size={18} /> Withdraw
           </button>
        </div>
      </header>

      {/* Mini Stats Row */}
      <div className="mini-stats-grid fade-in">
         <div className="mini-stat-item">
            <div className="icon-wrap pending"><Clock size={16} /></div>
            <div className="text-wrap">
               <span className="val">{stats?.pending || 0}</span>
               <span className="lab">Pending</span>
            </div>
         </div>
         <div className="mini-stat-item">
            <div className="icon-wrap approved"><CheckCircle size={16} /></div>
            <div className="text-wrap">
               <span className="val">{stats?.approved || 0}</span>
               <span className="lab">Approved</span>
            </div>
         </div>
         <div className="mini-stat-item">
            <div className="icon-wrap submissions"><ListTodo size={16} /></div>
            <div className="text-wrap">
               <span className="val">{stats?.total || 0}</span>
               <span className="lab">History</span>
            </div>
         </div>
      </div>

      {/* Recommended Tasks */}
      <section className="dashboard-section slide-up">
         <div className="flex-between section-header">
            <h3>New Campaigns</h3>
            <Link to="/tasks" className="see-all">Explore all <ArrowRight size={14} /></Link>
         </div>
         <div className="horizontal-tasks">
            {availableTasks.map(task => (
              <div key={task._id} className="task-mini-card" onClick={() => navigate('/tasks')}>
                 <div className="task-badge">+{task.rewardPoints}</div>
                 <h4 className="line-clamp-1">{task.title}</h4>
                 <p className="line-clamp-2">{task.description}</p>
                 <div className="task-type-tag">{task.inputType.toUpperCase()}</div>
              </div>
            ))}
         </div>
      </section>

      {/* Leaderboard Teaser */}
      <div className="leaderboard-card-teaser slide-up" onClick={() => navigate('/leaderboard')}>
         <div className="icon-side">
            <Trophy size={28} color="#fbbf24" />
         </div>
         <div className="text-side">
            <h4>Global Leaderboard</h4>
            <p>See where you stand among top earners</p>
         </div>
         <ArrowRight size={20} className="arrow" />
      </div>

      {/* Recent Activity */}
      <section className="dashboard-section slide-up" style={{ paddingBottom: '100px' }}>
         <div className="flex-between section-header">
            <h3>Recent Activity</h3>
            <button className="btn-text">Audit Log</button>
         </div>
         <div className="activity-list">
            {recentSubs.length === 0 ? (
               <div className="empty-mini">No recent transactions.</div>
            ) : (
               recentSubs.map(sub => (
                  <div key={sub._id} className="activity-item">
                     <div className={`status-dot ${sub.status}`}></div>
                     <div className="details">
                        <span className="title">{sub.taskId?.title}</span>
                        <span className="time">{new Date(sub.createdAt).toLocaleDateString()}</span>
                     </div>
                     <div className={`amount ${sub.status}`}>
                        {sub.status === 'approved' ? '+' : ''}{sub.taskId?.rewardPoints}
                     </div>
                  </div>
               ))
            )}
         </div>
      </section>

      <style>{`
        .dashboard-page { padding: 20px; }
        .app-header-home { margin-bottom: 30px; }
        .greeting h1 { font-size: 1.8rem; margin-top: 4px; }
        .subtitle { font-size: 0.75rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        
        .header-actions { display: flex; align-items: center; gap: 16px; }
        .avatar-small { width: 36px; height: 36px; border-radius: 12px; background: var(--blue-gradient); display: flex; align-items: center; justifyContent: center; color: white; font-weight: 800; cursor: pointer; border: 2px solid rgba(255,255,255,0.1); }

        .wallet-card-premium { background: var(--blue-gradient); border-radius: 24px; padding: 24px; margin-top: 24px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 10px 30px rgba(59, 130, 246, 0.3); color: white; }
        .wallet-info .label { font-size: 0.75rem; opacity: 0.8; font-weight: 600; }
        .wallet-info .amount { display: flex; align-items: center; gap: 10px; margin: 8px 0; font-size: 2.2rem; font-weight: 800; }
        .wallet-info .usd-value { font-size: 0.8rem; opacity: 0.7; }
        .btn-withdraw { background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 10px 18px; border-radius: 14px; font-weight: 700; font-size: 0.85rem; display: flex; align-items: center; gap: 8px; backdrop-filter: blur(10px); }

        .mini-stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 32px; }
        .mini-stat-item { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 18px; padding: 12px; display: flex; align-items: center; gap: 10px; }
        .icon-wrap { width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justifyContent: center; }
        .icon-wrap.pending { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
        .icon-wrap.approved { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .icon-wrap.submissions { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        .text-wrap .val { display: block; font-weight: 800; font-size: 1rem; }
        .text-wrap .lab { font-size: 0.65rem; color: #64748b; font-weight: 700; text-transform: uppercase; }

        .dashboard-section { margin-bottom: 32px; }
        .section-header { margin-bottom: 16px; align-items: flex-end; }
        .section-header h3 { font-size: 1.1rem; margin: 0; }
        .see-all { color: var(--blue); font-size: 0.85rem; font-weight: 700; text-decoration: none; display: flex; align-items: center; gap: 4px; }
        
        .horizontal-tasks { display: flex; gap: 16px; overflow-x: auto; padding-bottom: 8px; -ms-overflow-style: none; scrollbar-width: none; }
        .horizontal-tasks::-webkit-scrollbar { display: none; }
        .task-mini-card { flex: 0 0 160px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 16px; border-radius: 20px; position: relative; }
        .task-badge { position: absolute; top: 12px; right: 12px; font-weight: 800; font-size: 0.75rem; color: #10b981; background: rgba(16, 185, 129, 0.1); padding: 2px 8px; border-radius: 8px; }
        .task-mini-card h4 { font-size: 0.9rem; margin-bottom: 6px; margin-top: 10px; }
        .task-mini-card p { font-size: 0.7rem; color: #64748b; margin-bottom: 12px; }
        .task-type-tag { font-size: 0.6rem; font-weight: 800; color: #3b82f6; opacity: 0.6; }

        .leaderboard-card-teaser { background: rgba(251, 191, 36, 0.05); border: 1px solid rgba(251, 191, 36, 0.1); border-radius: 20px; padding: 20px; display: flex; align-items: center; gap: 16px; cursor: pointer; margin-bottom: 32px; }
        .leaderboard-card-teaser .text-side { flex: 1; }
        .leaderboard-card-teaser .text-side h4 { margin: 0 0 4px; }
        .leaderboard-card-teaser .text-side p { margin: 0; font-size: 0.8rem; color: #94a3b8; }
        .leaderboard-card-teaser .arrow { color: #fbbf24; opacity: 0.5; }

        .activity-item { display: flex; align-items: center; gap: 16px; padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,0.03); }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; }
        .status-dot.approved { background: #10b981; box-shadow: 0 0 8px #10b981; }
        .status-dot.pending { background: #f59e0b; }
        .status-dot.rejected { background: #ef4444; }
        .activity-item .details { flex: 1; display: flex; flex-direction: column; }
        .activity-item .title { font-size: 0.9rem; font-weight: 600; }
        .activity-item .time { font-size: 0.7rem; color: #64748b; }
        .activity-item .amount { font-weight: 800; font-size: 0.95rem; }
        .activity-item .amount.approved { color: #10b981; }
        .activity-item .amount.pending { color: #f59e0b; }
      `}</style>
    </div>
  );
};

export default DashboardPage;
