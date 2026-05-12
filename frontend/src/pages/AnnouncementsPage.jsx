import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { Bell, Info, AlertTriangle, Clock, Megaphone } from 'lucide-react';

const AnnouncementsPage = () => {
  const { request, loading } = useApi();
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await request('get', '/announcements');
        setAnnouncements(res.data);
      } catch {}
    };
    fetchAnnouncements();
  }, [request]);

  if (loading && announcements.length === 0) return null; // Quick transition

  const getPriorityConfig = (p) => {
    if (p === 'high') return { color: '#ef4444', label: 'CRITICAL', icon: AlertTriangle };
    if (p === 'medium') return { color: '#f59e0b', label: 'IMPORTANT', icon: Info };
    return { color: '#3b82f6', label: 'STANDARD', icon: Bell };
  };

  return (
    <div className="announcements-view fade-in">
      <div className="page-header" style={{ marginBottom: '40px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Megaphone color="var(--blue)" size={32} /> BROADCASTS
        </h1>
        <p>Intelligence updates and system notifications</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {announcements.map((ann) => {
          const config = getPriorityConfig(ann.priority);
          return (
            <div key={ann._id} className="premium-card slide-up" style={{ padding: '32px', borderLeft: `4px solid ${config.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', background: `${config.color}15`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: config.color }}>
                    <config.icon size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', margin: 0 }}>{ann.title}</h3>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: config.color, letterSpacing: '0.1em' }}>{config.label} BROADCAST</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gray-500)', fontSize: '0.8rem', fontWeight: 700 }}>
                  <Clock size={14} /> {new Date(ann.createdAt).toLocaleDateString()}
                </div>
              </div>
              <p style={{ color: 'var(--gray-300)', lineHeight: 1.7, fontSize: '1rem', whiteSpace: 'pre-wrap', margin: 0 }}>
                {ann.content}
              </p>
            </div>
          );
        })}

        {announcements.length === 0 && (
          <div className="glass-panel" style={{ padding: '80px', textAlign: 'center', color: 'var(--gray-500)' }}>
            <Bell size={48} style={{ opacity: 0.1, marginBottom: '20px' }} />
            <h3 style={{ margin: 0 }}>Terminal Quiet</h3>
            <p style={{ margin: '8px 0 0' }}>No active broadcasts in this sector.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnouncementsPage;
