import { Zap, Menu } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const MobileHeader = ({ onMenuClick }) => {
  const { user } = useAuth();

  return (
    <header className="mobile-header">
      <div className="header-left">
        <button onClick={onMenuClick} className="menu-trigger">
          <Menu size={22} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="logo-icon" style={{ width: '32px', height: '32px', borderRadius: '10px' }}>
            <Zap size={16} color="white" fill="white" />
          </div>
          <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 800, letterSpacing: '-0.02em' }}>EARNETIX</h2>
        </div>
      </div>
      
      <div className="points-display glass-panel" style={{ padding: '6px 14px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Zap size={14} color="var(--green)" fill="var(--green)" />
        <span style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--green)' }}>{user?.points || 0}</span>
      </div>
    </header>
  );
};


export default MobileHeader;
