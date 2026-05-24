import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import toast from 'react-hot-toast';
import { 
  Award, Clock, CheckCircle, AlertCircle, Send, 
  FileText, Link as LinkIcon, Trash2, File, 
  Upload, X, Zap, Image, Target, ChevronRight
} from 'lucide-react';
import { getDownloadableUrl } from '../utils/cloudinaryHelper';

const MissionsPage = () => {
  const { request } = useApi();
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [submission, setSubmission] = useState('');
  const [submissionFiles, setSubmissionFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

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

  const handleUpdateStatus = async (id, status) => {
    try {
      const res = await request('patch', `/assigned-tasks/${id}/status`, { status });
      if (res.success) {
        toast.success(`Mission ${status.replace('_', ' ')}`);
        fetchMissions();
        
        // If accepted, immediately open the submission modal
        if (status === 'accepted') {
          const mission = missions.find(m => m._id === id);
          if (mission) {
            setSelected(mission);
            setShowModal(true);
          }
        }
      }
    } catch (err) {
      toast.error('Deployment protocol failed');
    }
  };

  const handleSubmitMission = async (e) => {
    e.preventDefault();
    if (!selected) return;

    if (new Date(selected.deadline) < new Date()) {
      return toast.error('Mission deadline has passed. Submissions are no longer accepted.');
    }

    // ── Frontend validation before API call ──────────────
    const it = selected.submissionConfig?.inputType || 'file';
    const hasText = submission.trim().length > 0;
    const hasFiles = submissionFiles.length > 0;

    if ((it === 'text') && !hasText) {
      return toast.error('Please write your operational report before submitting.');
    }
    if ((it === 'file' || it === 'image' || it === 'multiple_files') && !hasFiles) {
      return toast.error('Please upload at least one evidence file before submitting.');
    }
    if ((it === 'text_file' || it === 'text_image') && (!hasText || !hasFiles)) {
      return toast.error('Both a report and evidence file are required for this mission.');
    }
    if ((it === 'link' || it === 'text_link') && !hasText) {
      return toast.error('Please provide the required link/URL before submitting.');
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('submissionContent', submission);
      submissionFiles.forEach(file => {
        formData.append('files', file);
      });

      const res = await request('post', `/assigned-tasks/${selected._id}/submit`, formData);

      if (res.success) {
        toast.success('Evidence logged for clearance');
        setShowModal(false);
        setSubmission('');
        setSubmissionFiles([]);
        fetchMissions();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };


  const getStatusInfo = (status, deadline) => {
    const isPastDeadline = new Date(deadline) < new Date();
    
    if (isPastDeadline && (status === 'pending' || status === 'accepted' || status === 'in_progress')) {
        return { color: '#ef4444', label: 'EXPIRED', icon: <AlertCircle size={16} /> };
    }

    switch (status) {
      case 'completed': return { color: '#10b981', label: 'ACCOMPLISHED', icon: <CheckCircle size={16} /> };
      case 'under_review': return { color: '#f59e0b', label: 'IN REVIEW', icon: <Clock size={16} /> };
      case 'rejected': return { color: '#ef4444', label: 'FAILED', icon: <AlertCircle size={16} /> };
      case 'accepted': return { color: '#3b82f6', label: 'ACTIVE', icon: <Zap size={16} /> };
      case 'in_progress': return { color: '#8b5cf6', label: 'EXECUTING', icon: <Clock size={16} /> };
      default: return { color: '#f59e0b', label: 'INCOMING', icon: <Target size={16} /> };
    }
  };

  const getRequirements = (type) => {
    const reqs = [];
    if (!type) return ['EVIDENCE'];
    if (type.includes('text') || type === 'all') reqs.push('TEXT REPORT');
    if (type.includes('image') || type === 'all') reqs.push('SCREENSHOT');
    if (type.includes('link') || type === 'all') reqs.push('URL/LINK');
    if (type.includes('file') || type === 'all') reqs.push('DATA FILE');
    if (type === 'multiple_files') reqs.push('MULTIPLE FILES');
    return reqs.length > 0 ? reqs : ['EVIDENCE'];
  };

  if (loading) return <Loader text="Syncing Strategic Assignments..." />;

  return (
    <div className="missions-page fade-in">
      <div className="page-header-premium" style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, margin: 0, background: 'var(--blue-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>DIRECT MISSIONS</h1>
        <p style={{ color: 'var(--gray-500)', fontWeight: 700, marginTop: '8px' }}>High-priority targets assigned to your unit</p>
      </div>

      {missions.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '120px 20px', borderRadius: '40px' }}>
          <Award size={80} style={{ opacity: 0.1, margin: '0 auto 32px', color: 'var(--blue)' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>No Direct Orders Received</h2>
          <p style={{ color: 'var(--gray-500)', maxWidth: '450px', margin: '16px auto', lineHeight: 1.6 }}>Maintain operational readiness. Update your expertise in the profile sector to attract high-value contracts.</p>
        </div>
      ) : (
        <div className="missions-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '32px' }}>
          {missions.map(m => {
            const status = getStatusInfo(m.status, m.deadline);
            const inputType = m.submissionConfig?.inputType || 'file';
            const isPastDeadline = new Date(m.deadline) < new Date();
            
            return (
              <div key={m._id} className="premium-card slide-up" style={{ 
                position: 'relative', overflow: 'hidden', padding: '32px', display: 'flex', flexDirection: 'column', 
                border: m.status === 'accepted' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid var(--glass-border)',
                background: m.status === 'accepted' ? 'rgba(59, 130, 246, 0.02)' : 'rgba(255,255,255,0.01)'
              }}>
                {/* SVG Background Effect */}
                <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', right: '-50px', top: '-50px', opacity: 0.03, pointerEvents: 'none', transform: 'rotate(15deg)' }}>
                  <path d="M100 0L200 50L200 150L100 200L0 150L0 50L100 0Z" fill="currentColor"/>
                </svg>
                <div className="flex-between" style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '16px', color: 'var(--blue-light)' }}>
                      <Zap size={24} fill="var(--blue)" strokeWidth={0} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>{m.title}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                         <Clock size={12} color="var(--gray-600)" />
                         <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 700 }}>DUE: {new Date(m.deadline).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--green)' }}>+{m.rewardPoints} <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>CR</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: status.color, fontSize: '0.75rem', fontWeight: 900, marginTop: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {status.icon} {status.label}
                    </div>
                  </div>
                </div>
                
                <p style={{ color: 'var(--gray-400)', fontSize: '0.95rem', marginBottom: '32px', lineHeight: 1.7, flex: 1 }}>{m.description}</p>
                
                {m.attachments?.length > 0 && (
                  <div className="mission-briefing" style={{ marginBottom: '32px' }}>
                    <h4 style={{ fontSize: '0.7rem', color: 'var(--blue)', fontWeight: 900, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Strategic Intelligence</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {m.attachments.map((att, idx) => (
                        <a key={idx} href={getDownloadableUrl(att.url)} target="_blank" rel="noreferrer" className="glass-panel" style={{ 
                          display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderRadius: '16px',
                          fontSize: '0.85rem', color: 'var(--gray-300)', textDecoration: 'none', transition: '0.2s'
                        }}>
                          <File size={18} color="var(--blue-light)" /> {att.name || 'Download Briefing'}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mission-actions" style={{ display: 'flex', gap: '16px' }}>
                  {m.status === 'pending' && !isPastDeadline && (
                    <>
                      <button className="btn-premium btn-primary-new" style={{ flex: 2, height: '54px' }} onClick={() => handleUpdateStatus(m._id, 'accepted')}>
                         ACCEPT MISSION <ChevronRight size={18} />
                      </button>
                      <button className="btn-premium btn-outline" style={{ flex: 1, height: '54px' }} onClick={() => handleUpdateStatus(m._id, 'rejected')}>DECLINE</button>
                    </>
                  )}
                  {(m.status === 'accepted' || m.status === 'in_progress') && !isPastDeadline && (
                    <button className="btn-premium btn-primary-new btn-block" style={{ height: '54px' }} onClick={() => { setSelected(m); setShowModal(true); }}>
                      <Upload size={20} /> LOG EVIDENCE & CLAIM REWARD
                    </button>
                  )}
                  {isPastDeadline && (m.status === 'pending' || m.status === 'accepted' || m.status === 'in_progress') && (
                    <div className="glass-panel" style={{ width: '100%', padding: '16px', textAlign: 'center', borderColor: 'var(--danger)', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '16px' }}>
                       <span style={{ color: 'var(--danger)', fontWeight: 900, letterSpacing: '0.1em' }}>DEADLINE PASSED</span>
                    </div>
                  )}
                  {m.status === 'under_review' && (
                    <div className="glass-panel" style={{ width: '100%', padding: '16px', textAlign: 'center', borderColor: 'var(--warning)', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '16px' }}>
                       <span style={{ color: 'var(--warning)', fontWeight: 900, letterSpacing: '0.1em' }}>WAITING FOR CLEARANCE</span>
                    </div>
                  )}
                  {m.status === 'rejected' && (
                    <div className="glass-panel" style={{ width: '100%', padding: '16px', textAlign: 'center', borderColor: 'var(--danger)', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '16px' }}>
                       <span style={{ color: 'var(--danger)', fontWeight: 900, letterSpacing: '0.1em' }}>MISSION FAILED</span>
                       {m.rejectionReason && <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: '8px', fontWeight: 600 }}>REASON: {m.rejectionReason}</p>}
                    </div>
                  )}
                  {m.status === 'completed' && (
                    <div className="glass-panel" style={{ width: '100%', padding: '16px', textAlign: 'center', borderColor: 'var(--green)', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '16px' }}>
                       <span style={{ color: 'var(--green)', fontWeight: 900, letterSpacing: '0.1em' }}>MISSION ACCOMPLISHED</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`MISSION LOG: ${selected?.title}`}>
        {selected && (
          <form onSubmit={handleSubmitMission}>
             <div className="glass-panel" style={{ padding: '24px', borderRadius: '24px', marginBottom: '32px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '0.75rem', color: 'var(--blue)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Required Evidence</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                   {getRequirements(selected?.submissionConfig?.inputType).map(r => (
                     <div key={r} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 800, color: 'var(--gray-300)' }}>
                        <CheckCircle size={16} color="var(--green)" /> {r}
                     </div>
                   ))}
                </div>
             </div>

             <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {(selected.submissionConfig?.inputType.includes('text') || selected.submissionConfig?.inputType === 'all' || selected.submissionConfig?.inputType === 'custom') && (
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--gray-500)', marginBottom: '8px', display: 'block' }}>OPERATIONAL REPORT</label>
                    <textarea 
                      className="form-input" 
                      rows="6" 
                      placeholder="Detail the execution of this mission..."
                      value={submission}
                      onChange={(e) => setSubmission(e.target.value)}
                      required
                      style={{ borderRadius: '20px', padding: '20px' }}
                    />
                  </div>
                )}

                {(selected.submissionConfig?.inputType.includes('file') || selected.submissionConfig?.inputType.includes('image') || selected.submissionConfig?.inputType === 'multiple_files' || selected.submissionConfig?.inputType === 'all') && (
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--gray-500)', marginBottom: '8px', display: 'block' }}>VISUAL/DATA EVIDENCE</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <input 
                            type="file" 
                            id="mission-files" 
                            multiple 
                            style={{ display: 'none' }}
                            onChange={(e) => setSubmissionFiles([...submissionFiles, ...Array.from(e.target.files)])}
                        />
                        <label htmlFor="mission-files" className="glass-panel" style={{ 
                            padding: '32px', textAlign: 'center', cursor: 'pointer', border: '2px dashed rgba(59, 130, 246, 0.2)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px',
                            borderRadius: '24px', transition: '0.2s'
                        }}>
                            <div style={{ padding: '16px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%', color: 'var(--blue)' }}>
                                <Upload size={32} />
                            </div>
                            <div>
                                <p style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Add Evidence Files</p>
                                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--gray-500)' }}>Drag & Drop or Click to browse</p>
                            </div>
                        </label>

                        {submissionFiles.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {submissionFiles.map((f, i) => (
                                    <div key={i} className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 20px', fontSize: '0.9rem', borderRadius: '16px' }}>
                                        <FileText size={20} color="var(--blue-light)" /> 
                                        <span style={{ flex: 1, fontWeight: 700 }}>{f.name}</span>
                                        <button type="button" onClick={() => setSubmissionFiles(submissionFiles.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px' }}>
                                            <X size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                  </div>
                )}

                {(selected.submissionConfig?.inputType.includes('link') || selected.submissionConfig?.inputType === 'all') && (
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--gray-500)', marginBottom: '8px', display: 'block' }}>EXTERNAL LINK/URL</label>
                    <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', padding: '0 20px', borderRadius: '16px' }}>
                        <LinkIcon size={18} color="var(--gray-500)" />
                        <input 
                            type="url" 
                            className="form-input" 
                            style={{ border: 'none', background: 'none', flex: 1, height: '54px' }}
                            placeholder="https://..."
                            value={submission}
                            onChange={(e) => setSubmission(e.target.value)}
                            required
                        />
                    </div>
                  </div>
                )}

                <button type="submit" className="btn-premium btn-primary-new btn-block" style={{ height: '64px', marginTop: '16px', borderRadius: '20px', fontSize: '1.1rem' }} disabled={submitting}>
                    {submitting ? 'SYNCHRONIZING...' : 'FINALIZE MISSION LOG'}
                </button>
             </div>
          </form>
        )}
      </Modal>

      <style>{`
        .missions-page { padding: 20px; }
        .premium-card:hover { transform: translateY(-8px); box-shadow: 0 32px 64px rgba(0,0,0,0.4); border-color: rgba(59, 130, 246, 0.2); }
        .btn-outline { border: 1px solid rgba(255,255,255,0.1); background: transparent; color: var(--gray-400); }
        .btn-outline:hover { background: rgba(255,255,255,0.05); color: white; border-color: rgba(255,255,255,0.2); }
        .attachment-link:hover { background: rgba(59, 130, 246, 0.1); color: white; }
      `}</style>
    </div>
  );
};

export default MissionsPage;
