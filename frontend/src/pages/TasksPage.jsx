import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import toast from 'react-hot-toast';
import { Zap, Upload, Image, FileText, Search, CheckCircle, Clock, File, Eye, Target, TrendingUp, AlertCircle, BookOpen } from 'lucide-react';
import { getDownloadableUrl } from '../utils/cloudinaryHelper';

const TasksPage = () => {
  const { request } = useApi();
  const { isKycVerified, kycStatus } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [otherFile, setOtherFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [mySubs, setMySubs] = useState([]);
  const [editingSubId, setEditingSubId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tasksRes, subsRes] = await Promise.all([
          request('get', '/tasks'),
          request('get', '/submissions/my?limit=100')
        ]);
        if (tasksRes.success) setTasks(tasksRes.data.tasks);
        if (subsRes.success) setMySubs(subsRes.data.submissions);
      } catch (err) {
        toast.error('Sector data retrieval failed.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [request]);

  // ─── FRONTEND FILE VALIDATION ─────────────────────────
  const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15MB
  const MAX_FILE_SIZE = 50 * 1024 * 1024;  // 50MB
  const BLOCKED_EXTENSIONS = ['exe','bat','cmd','sh','msi','php','py','rb','apk','dll','js','jsx','ts','tsx','com','scr','vbs'];
  const ALLOWED_IMAGES = ['jpg','jpeg','png','webp','gif','bmp','heic','svg','tiff'];

  const validateFileClient = (file, isImage = false) => {
    const ext = file.name.split('.').pop().toLowerCase();
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      toast.error(`File type .${ext} is not allowed for security reasons`);
      return false;
    }
    if (isImage && !ALLOWED_IMAGES.includes(ext)) {
      toast.error(`Image type .${ext} is not supported. Use: ${ALLOWED_IMAGES.join(', ')}`);
      return false;
    }
    const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
    if (file.size > maxSize) {
      toast.error(`File size too large. Maximum allowed: ${Math.round(maxSize / (1024 * 1024))}MB`);
      return false;
    }
    return true;
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file && validateFileClient(file, true)) {
      setImageFile(file);
    } else {
      e.target.value = '';
      setImageFile(null);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && validateFileClient(file, false)) {
      setOtherFile(file);
    } else {
      e.target.value = '';
      setOtherFile(null);
    }
  };

  const openSubmit = (task, subId = null) => {
    setSelected(task);
    setEditingSubId(subId);
    setTextContent('');
    setLinkUrl('');
    setImageFile(null);
    setOtherFile(null);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('taskId', selected._id);
      
      if (textContent) formData.append('textContent', textContent);
      if (linkUrl) formData.append('linkUrl', linkUrl);
      
      if (imageFile) formData.append('image', imageFile);
      if (otherFile) formData.append('file', otherFile);

      let res;
      if (editingSubId) {
        res = await request('put', `/submissions/${editingSubId}/resubmit`, formData);
      } else {
        res = await request('post', '/submissions', formData);
      }
      
      if (res.success) {
        toast.success('Evidence Logged Successfully');
        setShowModal(false);
        const subsRes = await request('get', '/submissions/my?limit=100');
        if (subsRes.success) setMySubs(subsRes.data.submissions);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    }
    setSubmitting(false);
  };

  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const filtered = tasks.filter(t => {
    const term = debouncedSearch.toLowerCase().trim();
    if (!term) return true;
    
    // Partial keyword matching (split search terms by space)
    const keywords = term.split(/\s+/);
    
    return keywords.every(kw => 
      (t.title && t.title.toLowerCase().includes(kw)) ||
      (t.description && t.description.toLowerCase().includes(kw)) ||
      (t.category && t.category.toLowerCase().includes(kw))
    );
  });

  const getRequirements = (type) => {
    const reqs = [];
    if (type.includes('text') || type === 'all') reqs.push('TEXT');
    if (type.includes('image') || type === 'all') reqs.push('SCREENSHOT');
    if (type.includes('link') || type === 'all') reqs.push('URL/LINK');
    if (type.includes('file') || type === 'all') reqs.push('ARCHIVE');
    return reqs;
  };

  // Removed blocking null return to allow layout rendering
  // if (loading && tasks.length === 0) return null; 


  return (
    <div className="tasks-view fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px', flexWrap: 'wrap', gap: '24px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Target color="var(--blue)" size={32} /> MISSION CONTROL
          </h1>
          <p>Execute campaigns to neutralize targets and earn credits</p>
        </div>
        
        <div className="progress-container-new glass-panel" style={{ padding: '16px 24px', borderRadius: '24px', minWidth: '240px' }}>
          <div className="flex-between" style={{ marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--gray-500)' }}>DAILY QUOTA</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--green)' }}>
                 {mySubs.filter(s => new Date(s.createdAt).toDateString() === new Date().toDateString()).length}/8
              </span>
          </div>
          <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
             <div style={{ 
                height: '100%', 
                background: 'var(--green-gradient)', 
                width: `${Math.min(((mySubs.filter(s => new Date(s.createdAt).toDateString() === new Date().toDateString()).length) / 8) * 100, 100)}%`,
                transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
             }}></div>
          </div>
        </div>
      </div>

      <div className="search-bar-premium glass-panel" style={{ marginBottom: '32px', maxWidth: '500px', display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 24px', borderRadius: '20px' }}>
        <Search size={20} color="var(--gray-500)" />
        <input 
          type="text" 
          placeholder="Filter missions by ID or Objective..." 
          style={{ background: 'none', border: 'none', color: 'white', flex: 1, fontSize: '0.95rem', fontWeight: 600, outline: 'none' }}
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
        />
      </div>

      <div className="grid-3" style={{ gap: '24px' }}>
        {loading && tasks.length === 0 ? (
          [1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="premium-card skeleton-pulse" style={{ height: '280px', borderRadius: '24px' }}></div>
          ))
        ) : filtered.length > 0 ? (
          filtered.map((task) => {
            const userSub = mySubs.find(s => s.taskId?._id === task._id);
            const isApproved = userSub?.status === 'approved';
            const isPending = userSub?.status === 'pending';
            const isRejected = userSub?.status === 'rejected';
            const canResubmit = isRejected && userSub?.submissionCount < 2;

            return (
              <div key={task._id} className="premium-card slide-up" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden' }}>
                {/* SVG Background Effect */}
                <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', right: '-50px', bottom: '-50px', opacity: 0.02, pointerEvents: 'none', transform: 'rotate(-15deg)' }}>
                  <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="40"/>
                </svg>
                <div style={{ flex: 1, zIndex: 1 }}>
                  <div className="flex-between" style={{ marginBottom: '16px' }}>
                    <div style={{ padding: '8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', color: 'var(--blue)' }}>
                        <Zap size={20} fill="var(--blue)" strokeWidth={0} />
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--green)' }}>
                        +{task.rewardPoints} <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>PTS</span>
                    </div>
                  </div>

                  <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', fontWeight: 800 }}>{task.title}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--gray-400)', lineHeight: 1.6, marginBottom: '20px' }}>{task.description}</p>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                    {task.taskType && task.taskType !== 'general' && (
                      <span style={{ fontSize: '0.65rem', fontWeight: 900, color: task.taskType === 'blog' ? '#8b5cf6' : task.taskType === 'media' ? '#ec4899' : 'var(--blue-light)', background: task.taskType === 'blog' ? 'rgba(139,92,246,0.1)' : task.taskType === 'media' ? 'rgba(236,72,153,0.1)' : 'rgba(59,130,246,0.1)', padding: '3px 10px', borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {task.taskType === 'blog' ? '📝 Blog' : task.taskType === 'software' ? '💻 Software' : task.taskType === 'media' ? '🎬 Media' : task.taskType}
                      </span>
                    )}
                    {getRequirements(task.inputType).map(r => (
                        <span key={r} style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--gray-500)', border: '1px solid var(--glass-border)', padding: '4px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}>
                          {r}
                        </span>
                    ))}
                  </div>

                  {task.attachments?.length > 0 && (
                    <div className="attachments-section" style={{ marginBottom: '20px' }}>
                        <p style={{ fontSize: '0.7rem', color: 'var(--gray-500)', fontWeight: 800, marginBottom: '8px' }}>BRIEFING MATERIALS:</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {task.attachments.map((att, idx) => (
                                <a key={idx} href={getDownloadableUrl(att.url)} target="_blank" rel="noreferrer" className="attachment-link" style={{ 
                                    display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--blue-light)',
                                    background: 'rgba(59, 130, 246, 0.05)', padding: '6px 12px', borderRadius: '8px'
                                }}>
                                    <File size={14} /> {att.name || 'View Attachment'}
                                </a>
                            ))}
                        </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
                  <button 
                    className="btn-premium btn-primary-new"
                    style={{ flex: 1, height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    onClick={() => openSubmit(task, isRejected ? userSub._id : null)}
                    disabled={isApproved || isPending || (isRejected && !canResubmit)}
                  >
                    {isApproved ? <CheckCircle size={18} /> : isPending ? <Clock size={18} /> : <Upload size={18} />}
                    {isApproved ? 'COMPLETED' : isPending ? 'IN REVIEW' : 'DO TASK'}
                  </button>
                  <button 
                    className="btn-premium"
                    style={{ 
                      width: '48px', height: '48px', background: 'rgba(255,255,255,0.05)', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px' 
                    }}
                    onClick={() => {
                      setSelected(task);
                      setShowModal(true);
                      // Set to read-only view if needed, but for now just opens the same modal
                    }}
                  >
                    <Eye size={18} />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="glass-panel" style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', color: 'var(--gray-500)' }}>
             <AlertCircle size={48} style={{ margin: '0 auto 20px', opacity: 0.5 }} />
             <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>No Missions Found</p>
             <p style={{ fontSize: '0.9rem' }}>Try adjusting your search filters</p>
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`MISSION DATA: ${selected?.title}`}>
        <form onSubmit={handleSubmit}>
          <div className="glass-panel" style={{ padding: '20px', borderRadius: '20px', marginBottom: '24px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: 'var(--blue)', fontWeight: 800 }}>REQUIRED INTELLIGENCE</h4>
            <div style={{ display: 'flex', gap: '16px' }}>
               {getRequirements(selected?.inputType || '').map(r => (
                 <div key={r} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 700 }}>
                    <CheckCircle size={14} color="var(--green)" /> {r}
                 </div>
               ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {((selected?.submissionConfig?.inputType || selected?.inputType || '').includes('text') || (selected?.submissionConfig?.inputType || selected?.inputType) === 'all') && (
              <div className="form-group">
                <label>Textual Report</label>
                <textarea 
                  className="form-input" 
                  placeholder="Enter detailed report or required text..."
                  rows={4} 
                  value={textContent} 
                  onChange={(e) => setTextContent(e.target.value)} 
                  required 
                />
              </div>
            )}

            {((selected?.submissionConfig?.inputType || selected?.inputType || '').includes('link') || (selected?.submissionConfig?.inputType || selected?.inputType) === 'all') && (
              <div className="form-group">
                <label>Evidence Link (URL)</label>
                <input 
                  type="url"
                  className="form-input" 
                  placeholder="https://..."
                  value={linkUrl} 
                  onChange={(e) => setLinkUrl(e.target.value)} 
                  required 
                />
              </div>
            )}

            {((selected?.submissionConfig?.inputType || selected?.inputType || '').includes('image') || (selected?.submissionConfig?.inputType || selected?.inputType) === 'all') && (
              <div className="form-group">
                <label>Visual Evidence (Screenshot)</label>
                <div 
                  className="file-upload-premium"
                  onClick={() => document.getElementById('image-input').click()}
                  style={{ 
                    height: '120px', border: '2px dashed var(--glass-border)', 
                    borderRadius: '20px', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    transition: 'var(--transition)', background: imageFile ? 'rgba(16, 185, 129, 0.05)' : 'transparent'
                  }}
                >
                  <input id="image-input" type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={handleImageChange} required />
                  {imageFile ? (
                    <div style={{ textAlign: 'center' }}>
                       <CheckCircle size={24} color="var(--green)" />
                       <p style={{ margin: '4px 0 0', fontWeight: 700, fontSize: '0.8rem' }}>{imageFile.name}</p>
                    </div>
                  ) : (
                    <>
                      <Image size={24} color="var(--gray-600)" />
                      <p style={{ margin: '8px 0 0', color: 'var(--gray-500)', fontSize: '0.8rem', fontWeight: 600 }}>Capture image</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {((selected?.submissionConfig?.inputType || selected?.inputType || '').includes('file') || (selected?.submissionConfig?.inputType || selected?.inputType) === 'all') && (
              <div className="form-group">
                <label>Documentary Evidence (File/Archive)</label>
                <div 
                  className="file-upload-premium"
                  onClick={() => document.getElementById('other-file-input').click()}
                  style={{ 
                    height: '120px', border: '2px dashed var(--glass-border)', 
                    borderRadius: '20px', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    transition: 'var(--transition)', background: otherFile ? 'rgba(59, 130, 246, 0.05)' : 'transparent'
                  }}
                >
                  <input id="other-file-input" type="file" style={{ display: 'none' }}
                    accept={selected?.allowedExtensions ? selected.allowedExtensions.map(ext => `.${ext}`).join(',') : ".jpg,.jpeg,.png,.webp,.mp3,.mp4,.docx,.pdf,.txt,.zip"}
                    onChange={handleFileChange} required />
                  {otherFile ? (
                    <div style={{ textAlign: 'center' }}>
                       <CheckCircle size={24} color="var(--blue)" />
                       <p style={{ margin: '4px 0 0', fontWeight: 700, fontSize: '0.8rem' }}>{otherFile.name}</p>
                    </div>
                  ) : (
                    <>
                      <Upload size={24} color="var(--gray-600)" />
                      <p style={{ margin: '8px 0 0', color: 'var(--gray-500)', fontSize: '0.8rem', fontWeight: 600 }}>Upload file</p>
                    </>
                  )}
                </div>
              </div>
            )}


            {!isKycVerified ? (
              <div style={{ background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.15)', borderRadius: '16px', padding: '16px', textAlign: 'center', marginTop: '12px' }}>
                <p style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.85rem', margin: '0 0 4px' }}>⚠ KYC Verification Required</p>
                <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0 }}>
                  {kycStatus === 'pending' ? 'Your identity is being verified (1-3 days).' : 'Complete identity verification to submit evidence.'}
                </p>
              </div>
            ) : (
              <button type="submit" className="btn-premium btn-primary-new btn-block" style={{ height: '60px', marginTop: '12px' }} disabled={submitting}>
                {submitting ? 'SYNCHRONIZING...' : 'SUBMIT INTEL'}
              </button>
            )}

          </div>
        </form>
      </Modal>

      <style>{`
        .file-upload-premium:hover { border-color: var(--blue-light); background: rgba(59, 130, 246, 0.05); }
      `}</style>
    </div>
  );
};

export default TasksPage;
