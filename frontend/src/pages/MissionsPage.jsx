import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import toast from 'react-hot-toast';
import { Award, Clock, CheckCircle, AlertCircle, Send, FileText, Link as LinkIcon, Trash2 } from 'lucide-react';

const MissionsPage = () => {
  const { request } = useApi();
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [submission, setSubmission] = useState('');

  useEffect(() => {
    fetchMissions();
  }, []);

  const fetchMissions = async () => {
    try {
      const res = await request('get', '/assigned-tasks/my');
      if (res.success) setMissions(res.data);
    } catch (err) {
      toast.error('Failed to sync missions');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, status, content = '') => {
    try {
      const res = await request('patch', `/assigned-tasks/${id}/status`, { status, submissionContent: content });
      if (res.success) {
        toast.success(`Mission status: ${status.replace('_', ' ')}`);
        setShowModal(false);
        setSubmission('');
        fetchMissions();
      }
    } catch (err) {
      toast.error('Operation failed');
    }
  };

  if (loading) return <Loader text="Syncing direct assignments..." />;

  const getStatusInfo = (status) => {
    switch (status) {
      case 'completed': return { color: '#10b981', label: 'COMPLETED', icon: <CheckCircle size={16} /> };
      case 'rejected': return { color: '#ef4444', label: 'REJECTED', icon: <AlertCircle size={16} /> };
      case 'accepted': return { color: '#3b82f6', label: 'ACCEPTED', icon: <Clock size={16} /> };
      case 'in_progress': return { color: '#8b5cf6', label: 'IN PROGRESS', icon: <Clock size={16} /> };
      default: return { color: '#f59e0b', label: 'PENDING', icon: <Clock size={16} /> };
    }
  };

  return (
    <div className="missions-page fade-in">
      <div className="flex-between" style={{ marginBottom: '32px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem' }}>Direct Missions</h1>
          <p style={{ color: 'var(--gray-400)' }}>Tasks specifically assigned to your expertise</p>
        </div>
      </div>

      {missions.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '100px 20px' }}>
          <Award size={64} style={{ opacity: 0.1, margin: '0 auto 24px' }} />
          <h3>No direct assignments yet</h3>
          <p style={{ color: 'var(--gray-500)', maxWidth: '400px', margin: '12px auto' }}>Check back later or update your skills in profile settings to attract more targeted missions.</p>
        </div>
      ) : (
        <div className="missions-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {missions.map(m => {
            const status = getStatusInfo(m.status);
            return (
              <div key={m._id} className="premium-card slide-up" style={{ padding: '24px' }}>
                <div className="flex-between" style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '10px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', color: 'var(--blue-light)' }}>
                      <Award size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{m.title}</h3>
                      <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Due: {new Date(m.deadline).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--green)' }}>+{m.rewardPoints} <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>PTS</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: status.color, fontSize: '0.75rem', fontWeight: 800, marginTop: '4px' }}>
                      {status.icon} {status.label}
                    </div>
                  </div>
                </div>
                
                <p style={{ color: 'var(--gray-400)', fontSize: '0.9rem', marginBottom: '24px', lineHeight: 1.6 }}>{m.description}</p>

                <div className="flex-gap">
                  {m.status === 'pending' && (
                    <>
                      <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleUpdateStatus(m._id, 'accepted')}>Accept Mission</button>
                      <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => handleUpdateStatus(m._id, 'rejected')}>Decline</button>
                    </>
                  )}
                  {(m.status === 'accepted' || m.status === 'in_progress') && (
                    <button className="btn btn-primary btn-block" onClick={() => { setSelected(m); setShowModal(true); }}>
                      Submit Evidence & Complete
                    </button>
                  )}
                  {m.status === 'completed' && (
                    <div className="glass-panel" style={{ width: '100%', padding: '12px', textAlign: 'center', borderColor: 'var(--green-glow)', background: 'rgba(16, 185, 129, 0.05)' }}>
                       <span style={{ color: 'var(--green)', fontWeight: 800 }}>MISSION ACCOMPLISHED</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Mission Completion Report">
        {selected && (
          <form onSubmit={(e) => { e.preventDefault(); handleUpdateStatus(selected._id, 'completed', submission); }}>
             <p style={{ fontSize: '0.85rem', color: 'var(--gray-400)', marginBottom: '20px' }}>
               Provide the required evidence for <strong>{selected.title}</strong> to claim your {selected.rewardPoints} points.
             </p>
             <div className="form-group">
                <label>Submission Notes / Results</label>
                <textarea 
                  className="form-input" 
                  rows="5" 
                  placeholder="Detailed report of work completed..."
                  value={submission}
                  onChange={(e) => setSubmission(e.target.value)}
                  required
                />
             </div>
             <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '16px' }}>
                <Send size={18} /> Finalize Submission
             </button>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default MissionsPage;
