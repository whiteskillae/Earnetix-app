import { AlertTriangle, X } from 'lucide-react';
import Modal from './Modal';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', type = 'danger', loading = false }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div style={{ 
          width: '64px', height: '64px', borderRadius: '50%', 
          background: type === 'danger' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px'
        }}>
          <AlertTriangle size={32} color={type === 'danger' ? '#ef4444' : '#3b82f6'} />
        </div>
        
        <h4 style={{ fontSize: '1.2rem', marginBottom: '12px', fontWeight: 800 }}>{title}</h4>
        <p style={{ color: 'var(--gray-500)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '28px' }}>
          {message}
        </p>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn btn-outline" 
            style={{ flex: 1, height: '48px' }} 
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            className={`btn ${type === 'danger' ? 'btn-danger' : 'btn-primary'}`} 
            style={{ flex: 1, height: '48px' }}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
