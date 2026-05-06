import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import toast from 'react-hot-toast';
import { Zap, Upload, Image, FileText, Search, CheckCircle, Clock, File } from 'lucide-react';

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
        toast.error('Failed to load tasks. Please try again.');
        console.error('Fetch error:', err);
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

      // Debug: Log FormData entries
      for (let pair of formData.entries()) {
        console.log('Submission Payload:', pair[0], pair[1]);
      }

      let res;
      if (editingSubId) {
        res = await request('put', `/submissions/${editingSubId}/resubmit`, formData);
      } else {
        res = await request('post', '/submissions', formData);
      }
      
      if (res.success) {
        toast.success('Proof submitted successfully!');
        setShowModal(false);
        // Refresh submissions
        const subsRes = await request('get', '/submissions/my?limit=100');
        if (subsRes.success) setMySubs(subsRes.data.submissions);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    }
    setSubmitting(false);
  };

  const filtered = tasks.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  );

  const getRequirements = (type) => {
    const reqs = [];
    if (type.includes('text') || type === 'all') reqs.push('Text');
    if (type.includes('image') || type === 'all') reqs.push('Screenshot');
    if (type.includes('file') || type === 'all') reqs.push('File');
    return reqs;
  };

  if (loading) return <Loader text="Loading tasks..." />;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Available Tasks</h1>
          <p>Complete tasks and earn points</p>
        </div>
        <div className="daily-progress-card">
          <div className="progress-info">
            <span>Daily Progress</span>
            <span>{mySubs.filter(s => new Date(s.createdAt).toDateString() === new Date().toDateString()).length}/8</span>
          </div>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width: `${(mySubs.filter(s => new Date(s.createdAt).toDateString() === new Date().toDateString()).length / 8) * 100}%` }}></div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 24, position: 'relative', maxWidth: 400 }}>
        <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
        <input type="text" className="form-input" style={{ paddingLeft: 42 }}
          placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {filtered.map((task) => {
          const userSub = mySubs.find(s => s.taskId?._id === task._id);
          const isApproved = userSub?.status === 'approved';
          const isPending = userSub?.status === 'pending';
          const isRejected = userSub?.status === 'rejected';
          const canResubmit = isRejected && userSub?.submissionCount < 2;

          return (
            <div key={task._id} className="card" style={{ display: 'flex', flexDirection: 'column', border: isApproved ? '1px solid var(--green)' : '1px solid var(--dark-600)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h4 style={{ color: 'var(--white)' }}>{task.title}</h4>
                    {new Date(task.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000) && (
                      <span className="new-badge">NEW</span>
                    )}
                  </div>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--green)', fontWeight: 700, fontSize: '0.9rem' }}>
                    <Zap size={16} /> {task.rewardPoints}
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', marginBottom: 16, lineHeight: 1.5 }}>{task.description}</p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  {getRequirements(task.inputType).map(r => (
                    <span key={r} className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--gray-300)' }}>
                      {r === 'Text' && <FileText size={12} />}
                      {r === 'Screenshot' && <Image size={12} />}
                      {r === 'File' && <File size={12} />}
                      {r}
                    </span>
                  ))}
                  {userSub && (
                    <span className={`badge badge-${userSub.status}`}>
                      {userSub.status.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {isApproved ? (
                <div className="btn btn-block btn-success" style={{ cursor: 'default', opacity: 0.8 }}>
                  <CheckCircle size={16} /> Task Completed
                </div>
              ) : isPending ? (
                <div className="btn btn-block btn-outline" style={{ cursor: 'default', opacity: 0.6 }}>
                  <Clock size={16} /> Under Review
                </div>
              ) : (
                <button 
                  className={`btn btn-block ${isRejected ? 'btn-danger' : 'btn-primary'}`} 
                  onClick={() => openSubmit(task, isRejected ? userSub._id : null)}
                  disabled={isRejected && !canResubmit}
                >
                  <Upload size={16} /> {isRejected ? (canResubmit ? 'Resubmit Proof' : 'Permanently Rejected') : 'Submit Proof'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <ListTodoIcon />
          <h3>No tasks available</h3>
          <p>Check back later for new tasks!</p>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`Submit: ${selected?.title}`}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginBottom: 4 }}>Required Evidence:</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {getRequirements(selected?.inputType || '').map(r => <span key={r} style={{ color: 'var(--blue-light)', fontSize: '0.85rem', fontWeight: 600 }}>• {r}</span>)}
            </div>
          </div>

          {(selected?.inputType.includes('text') || selected?.inputType === 'all') && (
            <div className="form-group">
              <label>Text Evidence</label>
              <textarea className="form-input" placeholder="Paste link, code, or text here..."
                rows={4} value={textContent} onChange={(e) => setTextContent(e.target.value)} required />
            </div>
          )}

          {(selected?.inputType.includes('image') || selected?.inputType === 'all') && (
            <div className="form-group">
              <label>Screenshot Evidence</label>
              <div className={`file-upload ${imageFile ? 'active' : ''}`}
                onClick={() => document.getElementById('image-input').click()}>
                <input id="image-input" type="file" accept="image/*"
                  onChange={(e) => setImageFile(e.target.files[0])} required />
                {imageFile ? (
                  <p style={{ color: 'var(--green)' }}>✓ {imageFile.name}</p>
                ) : (
                  <>
                    <Image size={24} style={{ marginBottom: 8, color: 'var(--gray-400)' }} />
                    <p style={{ color: 'var(--gray-400)', fontSize: '0.85rem' }}>Upload Screenshot (JPG, PNG)</p>
                  </>
                )}
              </div>
            </div>
          )}

          {(selected?.inputType.includes('file') || selected?.inputType === 'all') && (
            <div className="form-group">
              <label>File Evidence (PDF, Zip, etc)</label>
              <div className={`file-upload ${otherFile ? 'active' : ''}`}
                onClick={() => document.getElementById('file-input').click()}>
                <input id="file-input" type="file" 
                  onChange={(e) => setOtherFile(e.target.files[0])} required />
                {otherFile ? (
                  <p style={{ color: 'var(--green)' }}>✓ {otherFile.name}</p>
                ) : (
                  <>
                    <Upload size={24} style={{ marginBottom: 8, color: 'var(--gray-400)' }} />
                    <p style={{ color: 'var(--gray-400)', fontSize: '0.85rem' }}>Upload Document/Archive</p>
                  </>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting}>
              {submitting ? 'Uploading Proof...' : 'Submit Evidence'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const ListTodoIcon = () => <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>;

const styles = `
  .daily-progress-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 12px 16px;
    min-width: 200px;
  }
  .progress-info {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--gray-400);
  }
  .progress-bar-bg {
    height: 6px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
    overflow: hidden;
  }
  .progress-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--blue), var(--green));
    transition: width 0.3s ease;
  }
  .new-badge {
    background: var(--blue);
    color: white;
    font-size: 0.6rem;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 4px;
    letter-spacing: 0.5px;
  }
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 20px;
    margin-bottom: 32px;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.innerHTML = styles;
  document.head.appendChild(styleEl);
}

export default TasksPage;
