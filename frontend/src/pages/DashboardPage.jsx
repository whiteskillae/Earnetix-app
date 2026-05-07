import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useApi } from '../hooks/useApi';
import Loader from '../components/common/Loader';
import { Zap, ListTodo, Clock, CheckCircle, XCircle, TrendingUp } from 'lucide-react';

const DashboardPage = () => {
  const { user } = useAuth();
  const { request } = useApi();
  const [stats, setStats] = useState(null);
  const [recentSubs, setRecentSubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const subsRes = await request('get', '/submissions/my?limit=5');
        setRecentSubs(subsRes.data.submissions);
        const subs = subsRes.data.submissions;
        setStats({
          total: subsRes.data.pagination.total,
          pending: subs.filter(s => s.status === 'pending').length,
          approved: subs.filter(s => s.status === 'approved').length,
          rejected: subs.filter(s => s.status === 'rejected').length,
        });
      } catch {}
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) return <Loader text="Loading dashboard..." />;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
        <p>Here's what's happening with your earnings today.</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Points Balance</div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>
            <Zap size={24} fill="var(--green)" style={{ marginRight: 8, verticalAlign: 'middle' }} />
            {user?.points || 0}
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Total Submissions</div>
          <div className="stat-value">{stats?.total || 0}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Approved</div>
          <div className="stat-value" style={{ color: 'var(--approved)' }}>{stats?.approved || 0}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Pending Review</div>
          <div className="stat-value" style={{ color: 'var(--pending)' }}>{stats?.pending || 0}</div>
        </div>
      </div>

      {/* Recent Submissions */}
      <div className="card" style={{ marginTop: 8 }}>
        <h3 style={{ marginBottom: 16 }}>Recent Submissions</h3>
        {recentSubs.length === 0 ? (
          <div className="empty-state">
            <TrendingUp size={48} />
            <h3>No submissions yet</h3>
            <p>Start completing tasks to earn points!</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Task</th><th>Points</th><th>Status</th><th>Date</th></tr>
              </thead>
              <tbody>
                {recentSubs.map((sub) => (
                  <tr key={sub._id}>
                    <td>{sub.taskId?.title || 'Deleted Task'}</td>
                    <td>{sub.taskId?.rewardPoints || '—'}</td>
                    <td><span className={`badge badge-${sub.status}`}>{sub.status}</span></td>
                    <td style={{ color: 'var(--gray-400)' }}>{new Date(sub.createdAt).toLocaleDateString()}</td>
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

export default DashboardPage;
