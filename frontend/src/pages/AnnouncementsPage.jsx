import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import Loader from '../components/common/Loader';
import { Bell, Info, AlertTriangle, Clock } from 'lucide-react';

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

  if (loading && announcements.length === 0) return <Loader text="Checking for updates..." />;

  const getPriorityColor = (p) => {
    if (p === 'high') return 'var(--rejected)';
    if (p === 'medium') return 'var(--pending)';
    return 'var(--blue-light)';
  };

  const getIcon = (p) => {
    if (p === 'high') return <AlertTriangle size={20} />;
    return <Info size={20} />;
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="auth-logo" style={{ width: 42, height: 42, margin: 0 }}>
            <Bell size={20} />
          </div>
          <div>
            <h1>Announcements</h1>
            <p>Important updates and news from EARNETIX</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {announcements.map((ann) => (
          <div key={ann._id} className="card" style={{ borderLeft: `4px solid ${getPriorityColor(ann.priority)}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: getPriorityColor(ann.priority) }}>{getIcon(ann.priority)}</span>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--white)' }}>{ann.title}</h3>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={12} /> {new Date(ann.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p style={{ color: 'var(--gray-300)', lineHeight: 1.6, fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>
              {ann.content}
            </p>
          </div>
        ))}

        {announcements.length === 0 && (
          <div className="empty-state">
            <Bell size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
            <h3>All quiet for now</h3>
            <p>No new announcements. Check back later!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnouncementsPage;
