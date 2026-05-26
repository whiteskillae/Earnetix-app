import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Bell, ChevronRight, HelpCircle, Shield, Settings, Info } from 'lucide-react';

const MorePage = () => {
  const navigate = useNavigate();

  const menuGroups = [
    {
      title: 'Information & Updates',
      items: [
        { id: 'updates', icon: Bell, label: 'Patch Notes & Updates', desc: 'See what is new in Earnetix', route: '/updates', color: '#3b82f6' },
        { id: 'rules', icon: FileText, label: 'How to Play & Rules', desc: 'Guidelines and task rules', route: '/rules', color: '#10b981' },
      ]
    },
    {
      title: 'Support & Legal',
      items: [
        { id: 'help', icon: HelpCircle, label: 'Help Center', desc: 'Get assistance with issues', route: '#', color: '#f59e0b' },
        { id: 'privacy', icon: Shield, label: 'Privacy Policy', desc: 'How we protect your data', route: '#', color: '#8b5cf6' },
        { id: 'terms', icon: Info, label: 'Terms of Service', desc: 'Our platform agreement', route: '#', color: '#64748b' },
      ]
    }
  ];

  return (
    <div className="more-page fade-in">
      <div className="page-header" style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, background: 'linear-gradient(90deg, #eab308, #fef08a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>More Options</h1>
        <p style={{ color: 'var(--gray-400)', marginTop: '8px' }}>Explore updates, rules, and additional settings.</p>
      </div>

      <div className="more-content">
        {menuGroups.map((group, gIdx) => (
          <div key={gIdx} className="menu-group" style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--gray-300)', marginBottom: '16px', fontWeight: 700 }}>{group.title}</h3>
            <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
              {group.items.map((item, iIdx) => (
                <div 
                  key={item.id} 
                  className="more-item"
                  onClick={() => item.route !== '#' && navigate(item.route)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '20px', 
                    cursor: item.route !== '#' ? 'pointer' : 'not-allowed',
                    borderBottom: iIdx !== group.items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    transition: 'all 0.2s',
                    opacity: item.route === '#' ? 0.5 : 1
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${item.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <item.icon size={24} color={item.color} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>{item.label}</h4>
                      <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--gray-400)' }}>{item.desc}</p>
                    </div>
                  </div>
                  {item.route !== '#' && <ChevronRight size={20} color="var(--gray-500)" />}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .more-page { max-width: 800px; margin: 0 auto; padding-bottom: 80px; }
        .more-item:hover { background: rgba(255,255,255,0.02); }
      `}</style>
    </div>
  );
};

export default MorePage;
