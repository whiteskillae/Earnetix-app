import { Zap, Menu } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const MobileHeader = ({ onMenuClick }) => {
  const { user } = useAuth();

  return (
    <header className="mobile-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button 
          onClick={onMenuClick}
          style={{ 
            background: 'var(--dark-800)', 
            border: '1px solid var(--dark-700)', 
            color: 'var(--white)',
            padding: '8px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <Menu size={20} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, var(--blue), var(--green))',
            padding: '5px',
            borderRadius: '8px',
            display: 'flex'
          }}>
            <Zap size={16} color="white" fill="white" />
          </div>
          <h2 style={{ fontSize: '1rem', margin: 0, letterSpacing: '-0.02em' }}>EARNETIX</h2>
        </div>
      </div>
      
      <div style={{ 
        background: 'rgba(16, 185, 129, 0.1)',
        padding: '6px 14px',
        borderRadius: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        border: '1px solid rgba(16, 185, 129, 0.2)'
      }}>
        <Zap size={14} color="var(--green)" fill="var(--green)" />
        <span style={{ fontWeight: '800', fontSize: '0.85rem', color: 'var(--green)' }}>{user?.points || 0}</span>
      </div>
    </header>
  );
};


export default MobileHeader;
