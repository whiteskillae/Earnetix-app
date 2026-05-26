import { Zap, Menu } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const MobileHeader = ({ onMenuClick }) => {
  const { user } = useAuth();

  return (
    <header className="mobile-header" style={{
      background: 'linear-gradient(180deg, rgba(234, 179, 8, 0.15) 0%, rgba(20, 20, 25, 0.85) 100%)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(234, 179, 8, 0.2)',
      boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3)',
      transition: 'all 0.3s ease'
    }}>
      <div className="header-left">
        <button onClick={onMenuClick} className="menu-trigger" style={{ color: 'var(--yellow)' }}>
          <Menu size={22} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="logo-icon" style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)', boxShadow: '0 4px 12px rgba(234, 179, 8, 0.4)' }}>
            <Zap size={16} color="white" fill="white" />
          </div>
          <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 900, letterSpacing: '-0.02em', background: 'linear-gradient(90deg, #eab308, #fef08a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>EARNETIX</h2>
        </div>
      </div>
      
      <div className="points-display glass-panel" style={{ padding: '6px 14px', borderRadius: '14px', border: '1px solid rgba(234, 179, 8, 0.3)', background: 'rgba(234, 179, 8, 0.1)', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'inset 0 0 10px rgba(234, 179, 8, 0.05)' }}>
        <Zap size={14} color="#facc15" fill="#facc15" />
        <span style={{ fontWeight: '900', fontSize: '0.95rem', color: '#facc15' }}>{user?.points || 0}</span>
      </div>
    </header>
  );
};


export default MobileHeader;
