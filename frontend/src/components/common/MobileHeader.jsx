import { Zap, Menu } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const MobileHeader = ({ onMenuClick }) => {
  const { user } = useAuth();

  return (
    <header className="mobile-header">
      <div className="logo-container">
        <button onClick={onMenuClick} className="btn-icon">
          <Menu size={20} />
        </button>
        <div className="logo-container">
          <div className="logo-icon">
            <Zap size={18} color="white" fill="white" />
          </div>
          <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 800, letterSpacing: '-0.03em' }}>EARNETIX</h2>
        </div>
      </div>
      
      <div className="points-display">
        <Zap size={14} color="var(--green)" fill="var(--green)" />
        <span style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--green)' }}>{user?.points || 0}</span>
      </div>
    </header>
  );
};


export default MobileHeader;
