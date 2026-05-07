import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import toast from 'react-hot-toast';
import { Zap, Upload, Image, FileText, Search, CheckCircle, Clock, File, Eye } from 'lucide-react';


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
        <div className="progress-card">
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

      <div className="grid-3">
        {filtered.map((task) => {
          const userSub = mySubs.find(s => s.taskId?._id === task._id);
          const isApproved = userSub?.status === 'approved';
          const isPending = userSub?.status === 'pending';
          const isRejected = userSub?.status === 'rejected';
          const canResubmit = isRejected && userSub?.submissionCount < 2;

          return (
            <div key={task._id} className="card" style={{ display: 'flex', flexDirection: 'column', border: isApproved ? '1px solid var(--green)' : '1px solid var(--dark-700)' }}>
              <div style={{ flex: 1 }}>
                <div className="flex-between" style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h4 style={{ color: 'var(--white)' }}>{task.title}</h4>
                    {new Date(task.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000) && (
                      <span className="new-badge">NEW</span>
                    )}
                  </div>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--green)', fontWeight: 800, fontSize: '1rem' }}>
                    <Zap size={16} fill="var(--green)" /> {task.rewardPoints}
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', marginBottom: 16, lineHeight: 1.5, color: 'var(--gray-300)' }}>{task.description}</p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  {getRequirements(task.inputType).map(r => (
                    <span key={r} className="badge" style={{ background: 'var(--dark-800)', color: 'var(--gray-400)', border: '1px solid var(--dark-700)' }}>
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
                  <CheckCircle size={16} /> Completed
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
                  <Upload size={16} /> {isRejected ? (canResubmit ? 'Resubmit Proof' : 'Rejected') : 'Submit Proof'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <Zap size={48} />
          <h3>No tasks available</h3>
          <p>Check back later for new tasks!</p>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`Submit: ${selected?.title}`}>
        <form onSubmit={handleSubmit} className="fade-in">
          <div style={{ padding: '16px', background: 'var(--dark-800)', borderRadius: '12px', border: '1px solid var(--dark-700)', marginBottom: 24 }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Evidence Required:</p>
            <div style={{ display: 'flex', gap: 12 }}>
              {getRequirements(selected?.inputType || '').map(r => <span key={r} style={{ color: 'var(--blue-light)', fontSize: '0.9rem', fontWeight: 600 }}>✓ {r}</span>)}
            </div>
          </div>

          {(selected?.inputType.includes('text') || selected?.inputType === 'all') && (
            <div className="form-group">
              <label>Text Proof</label>
              <textarea className="form-input" placeholder="Paste link or text here..."
                rows={4} value={textContent} onChange={(e) => setTextContent(e.target.value)} required />
            </div>
          )}

          {(selected?.inputType.includes('image') || selected?.inputType === 'all') && (
            <div className="form-group">
              <label>Screenshot Proof</label>
              <div className={`file-upload ${imageFile ? 'active' : ''}`}
                onClick={() => document.getElementById('image-input').click()}>
                <input id="image-input" type="file" accept="image/*"
                  onChange={(e) => setImageFile(e.target.files[0])} required />
                {imageFile ? (
                  <div className="text-success" style={{ fontWeight: 600 }}>✓ {imageFile.name}</div>
                ) : (
                  <>
                    <Image size={24} style={{ marginBottom: 8, color: 'var(--gray-500)' }} />
                    <p style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>Click to upload Screenshot</p>
                  </>
                )}
              </div>
            </div>
          )}

          {(selected?.inputType.includes('file') || selected?.inputType === 'all') && (
            <div className="form-group">
              <label>File Proof</label>
              <div className={`file-upload ${otherFile ? 'active' : ''}`}
                onClick={() => document.getElementById('file-input').click()}>
                <input id="file-input" type="file" 
                  onChange={(e) => setOtherFile(e.target.files[0])} required />
                {otherFile ? (
                  <div className="text-success" style={{ fontWeight: 600 }}>✓ {otherFile.name}</div>
                ) : (
                  <>
                    <Upload size={24} style={{ marginBottom: 8, color: 'var(--gray-500)' }} />
                    <p style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>Click to upload File</p>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="flex-gap" style={{ marginTop: 24 }}>
            <button type="button" className="btn btn-outline btn-block" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? 'Uploading...' : 'Submit Proof'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TasksPage;
