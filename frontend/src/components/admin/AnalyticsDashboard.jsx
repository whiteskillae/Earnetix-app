import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity, Users, Globe, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

const AnalyticsDashboard = () => {
  const { request } = useApi();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await request('get', '/admin/analytics');
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-content-new" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="skeleton-pulse" style={{ width: '100%', height: '400px', borderRadius: 'var(--radius-xl)' }}></div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="admin-content-new fade-in">
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '8px' }}>Analytics & Traffic</h2>
        <p style={{ color: 'var(--gray-400)' }}>Monitor API usage, active sessions, and total page views over the last 30 days.</p>
      </div>

      <div className="admin-stats-grid">
        <div className="premium-stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            <Activity size={24} />
          </div>
          <h3 style={{ color: 'var(--gray-400)', fontSize: '0.9rem', marginBottom: '8px' }}>Total API Hits</h3>
          <p style={{ fontSize: '2rem', fontWeight: 800 }}>{data.totals.apiHits.toLocaleString()}</p>
        </div>

        <div className="premium-stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <Globe size={24} />
          </div>
          <h3 style={{ color: 'var(--gray-400)', fontSize: '0.9rem', marginBottom: '8px' }}>Page Views (Traffic)</h3>
          <p style={{ fontSize: '2rem', fontWeight: 800 }}>{data.totals.pageViews.toLocaleString()}</p>
        </div>

        <div className="premium-stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <Users size={24} />
          </div>
          <h3 style={{ color: 'var(--gray-400)', fontSize: '0.9rem', marginBottom: '8px' }}>Unique Visitors</h3>
          <p style={{ fontSize: '2rem', fontWeight: 800 }}>{data.totals.uniqueVisitors.toLocaleString()}</p>
        </div>
      </div>

      <div className="glass-panel" style={{ marginTop: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '30px' }}>
          <Zap size={24} color="var(--blue-light)" />
          <h3 style={{ margin: 0 }}>Traffic Overview</h3>
        </div>
        
        <div style={{ width: '100%', height: '400px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.timeSeries} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorApi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="dateString" stroke="#6b7280" tick={{ fill: '#6b7280' }} tickMargin={10} />
              <YAxis stroke="#6b7280" tick={{ fill: '#6b7280' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(10px)' }}
                itemStyle={{ fontWeight: 600 }}
              />
              <Legend verticalAlign="top" height={36}/>
              <Area type="monotone" dataKey="apiHits" name="API Hits" stroke="#3b82f6" fillOpacity={1} fill="url(#colorApi)" />
              <Area type="monotone" dataKey="pageViews" name="Page Views" stroke="#10b981" fillOpacity={1} fill="url(#colorViews)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
