import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import toast from 'react-hot-toast';
import { Zap, Upload, Image, FileText, Search, CheckCircle, Clock, File, Eye, Target, TrendingUp, AlertCircle } from 'lucide-react';

const TasksPage = () => {
  const { request } = useApi();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [textContent, setTextContent] = useState('');
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
      }
      setLoading(false);
    };
    fetchData();
  }, [request]);

  const openSubmit = (task, subId = null) => {
    setSelected(task);
    setEditingSubId(subId);
    setTextContent('');
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

  const filtered = tasks.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  );

  const getRequirements = (type) => {
    const reqs = [];
    if (type.includes('text') || type === 'all') reqs.push('TEXT');
    if (type.includes('image') || type === 'all') reqs.push('SCREENSHOT');
    if (type.includes('link') || type === 'all') reqs.push('URL/LINK');
    if (type.includes('file') || type === 'all') reqs.push('ARCHIVE');
    return reqs;
  };

  if (loading && tasks.length === 0) return null; // Quick transition

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
                {mySubs.filter(s => new Date(s.createdAt).toDateString() === new Date().toDateString()).length}/10
             </span>
          </div>
          <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
             <div style={{ 
                height: '100%', 
                background: 'var(--green-gradient)', 
                width: `${Math.min((mySubs.filter(s => new Date(s.createdAt).toDateString() === new Date().toDateString()).length / 10) * 100, 100)}%`,
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
        {filtered.map((task) => {
          const userSub = mySubs.find(s => s.taskId?._id === task._id);
          const isApproved = userSub?.status === 'approved';
          const isPending = userSub?.status === 'pending';
          const isRejected = userSub?.status === 'rejected';
          const canResubmit = isRejected && userSub?.submissionCount < 2;

          return (
            <div key={task._id} className="premium-card slide-up" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ flex: 1 }}>
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
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
                   {getRequirements(task.inputType).map(r => (
                     <span key={r} style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--gray-500)', border: '1px solid var(--glass-border)', padding: '4px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}>
                        {r}
                     </span>
                   ))}
                </div>
              </div>

              {isApproved ? (
                <div className="status-pill-new status-approved" style={{ width: '100%', justifyContent: 'center', height: '48px', fontSize: '0.9rem' }}>
                  <CheckCircle size={18} /> COMPLETED
                </div>
              ) : isPending ? (
                <div className="status-pill-new status-pending" style={{ width: '100%', justifyContent: 'center', height: '48px', fontSize: '0.9rem' }}>
                  <Clock size={18} /> IN REVIEW
                </div>
              ) : (
                <button 
                  className={`btn-premium btn-block ${isRejected ? 'btn-danger' : 'btn-primary-new'}`}
                  style={{ height: '48px' }}
                  onClick={() => openSubmit(task, isRejected ? userSub._id : null)}
                  disabled={isRejected && !canResubmit}
                >
                  <Upload size={18} /> {isRejected ? (canResubmit ? 'RE-LOG EVIDENCE' : 'LOCKED') : 'EXECUTE MISSION'}
                </button>
              )}
            </div>
          );
        })}
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
            {(selected?.inputType.includes('text') || selected?.inputType.includes('link') || selected?.inputType === 'all') && (
              <div className="form-group">
                <label>Proof String (Text/URL)</label>
                <textarea 
                  className="form-input" 
                  placeholder="Paste your submission data here..."
                  rows={4} 
                  value={textContent} 
                  onChange={(e) => setTextContent(e.target.value)} 
                  required 
                />
              </div>
            )}

            {(selected?.inputType.includes('image') || selected?.inputType === 'all') && (
              <div className="form-group">
                <label>Visual Evidence (Screenshot)</label>
                <div 
                  className="file-upload-premium"
                  onClick={() => document.getElementById('image-input').click()}
                  style={{ 
                    height: '140px', border: '2px dashed var(--glass-border)', 
                    borderRadius: '24px', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    transition: 'var(--transition)', background: imageFile ? 'rgba(16, 185, 129, 0.05)' : 'transparent'
                  }}
                >
                  <input id="image-input" type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={(e) => setImageFile(e.target.files[0])} required />
                  {imageFile ? (
                    <div style={{ textAlign: 'center' }}>
                       <CheckCircle size={32} color="var(--green)" />
                       <p style={{ margin: '8px 0 0', fontWeight: 700 }}>{imageFile.name}</p>
                    </div>
                  ) : (
                    <>
                      <Image size={32} color="var(--gray-600)" />
                      <p style={{ margin: '12px 0 0', color: 'var(--gray-500)', fontSize: '0.9rem', fontWeight: 600 }}>Click to capture image</p>
                    </>
                  )}
                </div>
              </div>
            )}

            <button type="submit" className="btn-premium btn-primary-new btn-block" style={{ height: '60px', marginTop: '12px' }} disabled={submitting}>
              {submitting ? 'SYNCHRONIZING...' : 'SUBMIT INTEL'}
            </button>
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
