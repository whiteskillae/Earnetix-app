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
      <div className="grid-2" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="stat-card" style={{ background: 'var(--blue-gradient)', border: 'none' }}>
          <div className="stat-label" style={{ color: 'rgba(255,255,255,0.7)' }}>Points Balance</div>
          <div className="stat-value" style={{ color: 'white', WebkitTextFillColor: 'white' }}>
            <Zap size={28} fill="white" style={{ marginRight: 12, verticalAlign: 'middle' }} />
            {user?.points || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
            ≈ ${(user?.points / 100).toFixed(2)} USD
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Total Submissions</div>
          <div className="stat-value">
            <ListTodo size={24} style={{ marginRight: 12, verticalAlign: 'middle', color: 'var(--gray-400)' }} />
            {stats?.total || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: 4 }}>
            Overall performance
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="stat-card">
          <div className="stat-label">Approved</div>
          <div className="stat-value" style={{ color: 'var(--approved)', WebkitTextFillColor: 'var(--approved)' }}>
            <CheckCircle size={24} style={{ marginRight: 12, verticalAlign: 'middle' }} />
            {stats?.approved || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: 4 }}>
            Successfully completed
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Pending Review</div>
          <div className="stat-value" style={{ color: 'var(--pending)', WebkitTextFillColor: 'var(--pending)' }}>
            <Clock size={24} style={{ marginRight: 12, verticalAlign: 'middle' }} />
            {stats?.pending || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: 4 }}>
            Currently in verification
          </div>
        </div>
      </div>

      {/* Recent Submissions */}
      <div className="card">
        <div className="flex-between" style={{ marginBottom: 20 }}>
          <h3 style={{ margin: 0 }}>Recent Submissions</h3>
          <button className="btn btn-sm btn-outline">View All</button>
        </div>
        
        {recentSubs.length === 0 ? (
          <div className="empty-state">
            <TrendingUp size={48} style={{ color: 'var(--gray-700)' }} />
            <h3>No submissions yet</h3>
            <p>Start completing tasks to earn points!</p>
            <button className="btn btn-primary" style={{ marginTop: 20 }}>Explore Tasks</button>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Task Name</th>
                  <th>Reward</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentSubs.map((sub) => (
                  <tr key={sub._id}>
                    <td style={{ fontWeight: 600 }}>{sub.taskId?.title || 'Deleted Task'}</td>
                    <td>
                      <span style={{ color: 'var(--green)', fontWeight: 700 }}>
                        +{sub.taskId?.rewardPoints || 0}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${sub.status}`} style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: `var(--${sub.status}-glow)`,
                        color: `var(--${sub.status})`,
                        border: `1px solid var(--${sub.status})`,
                      }}>
                        {sub.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--gray-400)' }}>
                      {new Date(sub.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </td>
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
