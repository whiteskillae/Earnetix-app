import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity, Users, Globe, Zap, TrendingUp, CalendarDays } from 'lucide-react';
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
        // Format dates for better display
        const formattedData = res.data.timeSeries.map(item => {
          const date = new Date(item.dateString);
          return {
            ...item,
            displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          };
        });
        
        setData({
          ...res.data,
          timeSeries: formattedData
        });
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

  const daysCount = data.timeSeries.length || 1;
  const avgHits = Math.round(data.totals.apiHits / daysCount);
  const avgViews = Math.round(data.totals.pageViews / daysCount);

  // Custom Tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-panel" style={{ padding: '16px', border: '1px solid rgba(255,255,255,0.1)', minWidth: '200px' }}>
          <p style={{ color: 'var(--gray-300)', marginBottom: '12px', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>{label}</p>
          {payload.map((entry, index) => (
            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
              <span style={{ color: entry.color, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: entry.color }}></div>
                {entry.name}
              </span>
              <span style={{ fontWeight: 800, color: '#fff' }}>{entry.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="admin-content-new fade-in">
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '8px' }}>Analytics & Traffic</h2>
        <p style={{ color: 'var(--gray-400)' }}>Comprehensive overview of platform usage, traffic sources, and API volume over the last 30 days.</p>
      </div>

      <div className="admin-stats-grid">
        <div className="premium-stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            <Activity size={24} />
          </div>
          <h3 style={{ color: 'var(--gray-400)', fontSize: '0.9rem', marginBottom: '8px' }}>Total API Hits</h3>
          <p style={{ fontSize: '2.2rem', fontWeight: 800 }}>{data.totals.apiHits.toLocaleString()}</p>
          <div style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TrendingUp size={14} color="#10b981" /> <span>Avg {avgHits.toLocaleString()} / day</span>
          </div>
        </div>

        <div className="premium-stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <Globe size={24} />
          </div>
          <h3 style={{ color: 'var(--gray-400)', fontSize: '0.9rem', marginBottom: '8px' }}>Total Page Views</h3>
          <p style={{ fontSize: '2.2rem', fontWeight: 800 }}>{data.totals.pageViews.toLocaleString()}</p>
          <div style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TrendingUp size={14} color="#10b981" /> <span>Avg {avgViews.toLocaleString()} / day</span>
          </div>
        </div>

        <div className="premium-stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <Users size={24} />
          </div>
          <h3 style={{ color: 'var(--gray-400)', fontSize: '0.9rem', marginBottom: '8px' }}>Unique Visitors</h3>
          <p style={{ fontSize: '2.2rem', fontWeight: 800 }}>{data.totals.uniqueVisitors.toLocaleString()}</p>
          <div style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CalendarDays size={14} color="#3b82f6" /> <span>Tracked over {daysCount} days</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginTop: '40px' }}>
        {/* Main Area Chart */}
        <div className="glass-panel" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '30px' }}>
            <Zap size={24} color="#3b82f6" />
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Traffic Volume & API Load</h3>
          </div>
          
          <div style={{ width: '100%', height: '350px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorApi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="displayDate" stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 12 }} tickMargin={12} axisLine={false} tickLine={false} />
                <YAxis stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(val) => val > 999 ? (val/1000).toFixed(1) + 'k' : val} />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '14px', paddingBottom: '20px' }}/>
                <Area type="monotone" dataKey="apiHits" name="API Hits" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorApi)" />
                <Area type="monotone" dataKey="pageViews" name="Page Views" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Secondary Bar Chart */}
        <div className="glass-panel" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '30px' }}>
            <Users size={24} color="#f59e0b" />
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Unique Visitors Timeline</h3>
          </div>
          
          <div style={{ width: '100%', height: '350px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUniques" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9}/>
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.3}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="displayDate" stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 12 }} tickMargin={12} axisLine={false} tickLine={false} />
                <YAxis stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '14px', paddingBottom: '20px' }}/>
                <Bar dataKey="uniqueVisitors" name="Unique Visitors" fill="url(#colorUniques)" radius={[6, 6, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
