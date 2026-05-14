import { Users, Clock, CheckCircle, XCircle, TrendingUp, Activity, Shield, DollarSign } from 'lucide-react';

const StatCard = ({ icon, label, value, color, trend, subtext }) => (
  <div className="premium-stat-card">
    <div className="stat-icon-wrapper" style={{ background: `${color}15`, color: color }}>
      {icon}
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
      <div>
        <span className="stat-label">{label}</span>
        <div className="stat-value" style={{ fontSize: '2.25rem' }}>{value}</div>
      </div>
      <div className="text-right">
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: trend.startsWith('+') ? '#10b981' : '#ef4444' }}>{trend}</span>
        <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{subtext}</div>
      </div>
    </div>
  </div>
);

const AdminDashboard = ({ data }) => {
  if (!data) return null;

  return (
    <div className="dashboard-content">
      <div className="admin-stats-grid">
        <StatCard 
          icon={<Users size={24} />} 
          label="Active Users" 
          value={data.totalUsers} 
          color="#3b82f6" 
          trend="+12.5%" 
          subtext="vs last month" 
        />
        <StatCard 
          icon={<Clock size={24} />} 
          label="Pending Review" 
          value={data.pendingSubmissions} 
          color="#f59e0b" 
          trend={data.pendingSubmissions > 10 ? "Urgent" : "Managed"} 
          subtext="Submissions" 
        />
        <StatCard 
          icon={<CheckCircle size={24} />} 
          label="Approved Tasks" 
          value={data.approvedSubmissions} 
          color="#10b981" 
          trend="+84%" 
          subtext="Success Rate" 
        />
        <StatCard 
          icon={<Activity size={24} />} 
          label="Total Volume" 
          value={data.totalSubmissions} 
          color="#8b5cf6" 
          trend="Steady" 
          subtext="System Traffic" 
        />
        <StatCard 
          icon={<Shield size={24} />} 
          label="KYC Pending" 
          value={data.pendingKyc || 0} 
          color="#06b6d4" 
          trend={data.pendingKyc > 0 ? 'Action Needed' : 'Clear'} 
          subtext="Identity Verification" 
        />
        <StatCard 
          icon={<DollarSign size={24} />} 
          label="Pending Payouts" 
          value={data.pendingWithdrawals || 0} 
          color="#ec4899" 
          trend={data.pendingWithdrawals > 0 ? 'Review' : 'None'} 
          subtext="Withdrawal Requests" 
        />
      </div>

      <div className="grid-2">
        <div className="glass-panel">
          <div className="flex-between" style={{ marginBottom: '24px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
               <TrendingUp size={20} color="#3b82f6" /> System Activity
            </h3>
            <button className="btn btn-sm btn-outline">View Report</button>
          </div>
          <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.9rem', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '16px' }}>
            Interactive Activity Chart Coming Soon
          </div>
        </div>

        <div className="glass-panel">
          <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={20} color="#10b981" /> Server Health
          </h3>
          <div className="health-metrics" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
             <HealthBar label="CPU Usage" percentage={14} color="#3b82f6" />
             <HealthBar label="Memory" percentage={42} color="#8b5cf6" />
             <HealthBar label="API Latency" percentage={8} color="#10b981" />
             <HealthBar label="Database Load" percentage={25} color="#f59e0b" />
          </div>
        </div>
      </div>
    </div>
  );
};

const HealthBar = ({ label, percentage, color }) => (
  <div>
    <div className="flex-between" style={{ marginBottom: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
       <span style={{ color: '#94a3b8' }}>{label}</span>
       <span>{percentage}%</span>
    </div>
    <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${percentage}%`, background: color, boxShadow: `0 0 10px ${color}40` }}></div>
    </div>
  </div>
);

export default AdminDashboard;
