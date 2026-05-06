import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import toast from 'react-hot-toast';
import { Zap, Upload, Image, FileText, Search } from 'lucide-react';

const TasksPage = () => {
  const { request } = useApi();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [mySubs, setMySubs] = useState([]);

    const fetchData = async () => {
      try {
        const [tasksRes, subsRes] = await Promise.all([
          request('get', '/tasks'),
          request('get', '/submissions/my?limit=100')
        ]);
        setTasks(tasksRes.data.tasks);
        setMySubs(subsRes.data.submissions);
      } catch {}
      setLoading(false);
    };
    fetchData();
  }, []);

  const openSubmit = (task) => {
    setSelected(task);
    setTextContent('');
    setFile(null);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('taskId', selected._id);
      if (textContent) formData.append('textContent', textContent);
      if (file) formData.append('image', file);

      await request('post', '/submissions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Proof submitted!');
      setShowModal(false);
    } catch {}
    setSubmitting(false);
  };

  const filtered = tasks.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Loader text="Loading tasks..." />;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Available Tasks</h1>
        <p>Complete tasks and earn points</p>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 24, position: 'relative', maxWidth: 400 }}>
        <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
        <input type="text" className="form-input" style={{ paddingLeft: 42 }}
          placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Task Grid */}
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
                  <h4 style={{ color: 'var(--white)' }}>{task.title}</h4>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--green)', fontWeight: 700, fontSize: '0.9rem' }}>
                    <Zap size={16} /> {task.rewardPoints}
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', marginBottom: 16, lineHeight: 1.5 }}>{task.description}</p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  {(task.inputType === 'image' || task.inputType === 'both') && (
                    <span className="badge" style={{ background: 'var(--blue-glow)', color: 'var(--blue-light)' }}>
                      <Image size={12} /> Image
                    </span>
                  )}
                  {(task.inputType === 'text' || task.inputType === 'both') && (
                    <span className="badge" style={{ background: 'rgba(255,176,32,0.15)', color: 'var(--pending)' }}>
                      <FileText size={12} /> Text
                    </span>
                  )}
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
                  onClick={() => openSubmit(task)}
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

      {/* Submit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`Submit: ${selected?.title}`}>
        <form onSubmit={handleSubmit}>
          {(selected?.inputType === 'text' || selected?.inputType === 'both') && (
            <div className="form-group">
              <label>Text Response</label>
              <textarea className="form-input" placeholder="Write your response..."
                value={textContent} onChange={(e) => setTextContent(e.target.value)} required={selected?.inputType === 'text'} />
            </div>
          )}

          {(selected?.inputType === 'image' || selected?.inputType === 'both') && (
            <div className="form-group">
              <label>Upload Image</label>
              <div className={`file-upload ${file ? 'active' : ''}`}
                onClick={() => document.getElementById('file-input').click()}>
                <input id="file-input" type="file" accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setFile(e.target.files[0])} />
                {file ? (
                  <p style={{ color: 'var(--green)' }}>✓ {file.name}</p>
                ) : (
                  <>
                    <Upload size={32} style={{ marginBottom: 8, color: 'var(--gray-400)' }} />
                    <p style={{ color: 'var(--gray-400)', fontSize: '0.85rem' }}>Click to upload (JPG, PNG, WebP)</p>
                  </>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const ListTodoIcon = () => <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>;

export default TasksPage;
