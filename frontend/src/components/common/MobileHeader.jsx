import { Zap } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const MobileHeader = () => {
  const { user } = useAuth();

  return (
    <header className="mobile-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ 
          background: 'linear-gradient(135deg, var(--blue), var(--green))',
          padding: '6px',
          borderRadius: '8px',
          display: 'flex'
        }}>
          <Zap size={18} color="white" />
        </div>
        <h2 style={{ fontSize: '1.1rem', margin: 0 }}>EARNETIX</h2>
      </div>
      
      <div style={{ 
        background: 'var(--dark-800)',
        padding: '6px 12px',
        borderRadius: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        border: '1px solid var(--dark-700)'
      }}>
        <Zap size={14} color="var(--green)" fill="var(--green)" />
        <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{user?.points || 0}</span>
      </div>
    </header>
  );
};

export default MobileHeader;
