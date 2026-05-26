import React from 'react';
import { ArrowLeft, Zap, Star, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PatchNotesPage = () => {
  const navigate = useNavigate();

  const updates = [
    {
      version: 'v3.1.0',
      date: 'May 2026',
      title: 'Premium UI & Extended Tasks',
      changes: [
        { type: 'feature', icon: Star, color: '#f59e0b', text: 'New Blog Creation Suite with rich-text editing.' },
        { type: 'feature', icon: Zap, color: '#3b82f6', text: 'Added Graphic Design and Video task categories.' },
        { type: 'ui', icon: Star, color: '#facc15', text: 'Overhauled User Interface with premium transparent styling.' },
        { type: 'fix', icon: ShieldCheck, color: '#10b981', text: 'Fixed logic where blogs could be written without a task.' }
      ]
    },
    {
      version: 'v3.0.0',
      date: 'April 2026',
      title: 'Global Launch',
      changes: [
        { type: 'feature', icon: Star, color: '#f59e0b', text: 'Initial release of Earnetix User App.' },
        { type: 'feature', icon: Zap, color: '#3b82f6', text: 'Missions, Tasks, and Leaderboard systems introduced.' }
      ]
    }
  ];

  return (
    <div className="patch-notes-page fade-in">
      <button 
        onClick={() => navigate('/more')} 
        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: 'var(--gray-400)', fontWeight: 700, cursor: 'pointer', marginBottom: '24px' }}
      >
        <ArrowLeft size={18} /> Back to More
      </button>

      <div className="page-header" style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: 'white' }}>Patch Notes</h1>
        <p style={{ color: 'var(--gray-400)', marginTop: '8px', fontSize: '1.05rem' }}>Stay up to date with the latest features and improvements.</p>
      </div>

      <div className="updates-list">
        {updates.map((update, idx) => (
          <div key={idx} className="update-card glass-panel" style={{ marginBottom: '24px', padding: '32px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--blue-gradient)' }} />
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>{update.title}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                  <span style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--blue-light)', padding: '4px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800 }}>{update.version}</span>
                  <span style={{ color: 'var(--gray-500)', fontSize: '0.9rem', fontWeight: 600 }}>{update.date}</span>
                </div>
              </div>
            </div>

            <div className="changes-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {update.changes.map((change, cIdx) => (
                <div key={cIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{ background: `${change.color}15`, padding: '8px', borderRadius: '10px', marginTop: '2px' }}>
                    <change.icon size={18} color={change.color} />
                  </div>
                  <div>
                    <p style={{ margin: 0, color: 'var(--gray-200)', fontSize: '1rem', lineHeight: 1.6 }}>{change.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <style>{`.patch-notes-page { max-width: 800px; margin: 0 auto; padding-bottom: 80px; }`}</style>
    </div>
  );
};

export default PatchNotesPage;
