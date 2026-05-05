import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import toast from 'react-hot-toast';
import { Users, ListTodo, Clock, CheckCircle, XCircle, Eye, Plus, Zap } from 'lucide-react';

const AdminPage = () => {
  const { request } = useApi();
  const [tab, setTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subFilter, setSubFilter] = useState('pending');

  // Task creation
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', rewardPoints: 10, inputType: 'image' });

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Preview modal
  const [showPreview, setShowPreview] = useState(false);
  const [previewSub, setPreviewSub] = useState(null);

  useEffect(() => { fetchDashboard(); }, []);
  useEffect(() => { if (tab === 'submissions') fetchSubmissions(); }, [tab, subFilter]);
  useEffect(() => { if (tab === 'users') fetchUsers(); }, [tab]);

  const fetchDashboard = async () => {
    try { const r = await request('get', '/admin/dashboard'); setDashboard(r.data); } catch {}
    setLoading(false);
  };

  const fetchSubmissions = async () => {
    setLoading(true);
    try { const r = await request('get', `/admin/submissions?status=${subFilter}&limit=50`); setSubmissions(r.data.submissions); } catch {}
    setLoading(false);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try { const r = await request('get', '/admin/users?limit=100'); setUsers(r.data.users); } catch {}
    setLoading(false);
  };

  const handleApprove = async (id) => {
    try { await request('put', `/admin/submissions/${id}/approve`); toast.success('Approved!'); fetchSubmissions(); fetchDashboard(); } catch {}
  };

  const handleReject = async (e) => {
    e.preventDefault();
    try { await request('put', `/admin/submissions/${rejectId}/reject`, { rejectionReason: rejectReason }); toast.success('Rejected'); setShowRejectModal(false); setRejectReason(''); fetchSubmissions(); fetchDashboard(); } catch {}
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try { await request('post', '/tasks', { ...taskForm, rewardPoints: Number(taskForm.rewardPoints) }); toast.success('Task created!'); setShowTaskModal(false); setTaskForm({ title: '', description: '', rewardPoints: 10, inputType: 'image' }); } catch {}
  };

  if (loading && tab === 'dashboard' && !dashboard) return <Loader text="Loading admin..." />;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <h1>Admin Panel</h1>
          <button className="btn btn-primary" onClick={() => setShowTaskModal(true)}><Plus size={18} /> New Task</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {['dashboard', 'submissions', 'users'].map((t) => (
          <button key={t} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* DASHBOARD TAB */}
      {tab === 'dashboard' && dashboard && (
        <div className="stats-grid">
          <StatCard icon={<Users size={22} />} label="Total Users" value={dashboard.totalUsers} color="var(--blue)" />
          <StatCard icon={<ListTodo size={22} />} label="Total Tasks" value={dashboard.totalTasks} color="var(--green)" />
          <StatCard icon={<Clock size={22} />} label="Pending" value={dashboard.pendingSubmissions} color="var(--pending)" />
          <StatCard icon={<CheckCircle size={22} />} label="Approved" value={dashboard.approvedSubmissions} color="var(--approved)" />
          <StatCard icon={<XCircle size={22} />} label="Rejected" value={dashboard.rejectedSubmissions} color="var(--rejected)" />
          <StatCard icon={<Zap size={22} />} label="All Submissions" value={dashboard.totalSubmissions} color="var(--white)" />
        </div>
      )}

      {/* SUBMISSIONS TAB */}
      {tab === 'submissions' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['pending', 'approved', 'rejected'].map((f) => (
              <button key={f} className={`btn btn-sm ${subFilter === f ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setSubFilter(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          {loading ? <Loader /> : (
            <div className="table-container">
              <table>
                <thead><tr><th>User</th><th>Task</th><th>Points</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
                <tbody>
                  {submissions.map((s) => (
                    <tr key={s._id}>
                      <td style={{ fontWeight: 500, color: 'var(--white)' }}>{s.userId?.name || '—'}<br /><span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{s.userId?.email}</span></td>
                      <td>{s.taskId?.title || '—'}</td>
                      <td><span style={{ color: 'var(--green)' }}>{s.taskId?.rewardPoints}</span></td>
                      <td><span className={`badge badge-${s.status}`}>{s.status}</span></td>
                      <td style={{ color: 'var(--gray-400)', fontSize: '0.85rem' }}>{new Date(s.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-sm btn-outline" onClick={() => { setPreviewSub(s); setShowPreview(true); }}><Eye size={14} /></button>
                          {s.status === 'pending' && (
                            <>
                              <button className="btn btn-sm btn-success" onClick={() => handleApprove(s._id)}>✓</button>
                              <button className="btn btn-sm btn-danger" onClick={() => { setRejectId(s._id); setShowRejectModal(true); }}>✗</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {submissions.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 32 }}>No submissions</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* USERS TAB */}
      {tab === 'users' && (
        loading ? <Loader /> : (
          <div className="table-container">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Points</th><th>Verified</th><th>Joined</th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td style={{ fontWeight: 500, color: 'var(--white)' }}>{u.name}</td>
                    <td>{u.email}</td>
                    <td style={{ color: 'var(--green)', fontWeight: 600 }}>{u.points}</td>
                    <td>{u.isVerified ? <span style={{ color: 'var(--green)' }}>✓</span> : <span style={{ color: 'var(--rejected)' }}>✗</span>}</td>
                    <td style={{ color: 'var(--gray-400)', fontSize: '0.85rem' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Create Task Modal */}
      <Modal isOpen={showTaskModal} onClose={() => setShowTaskModal(false)} title="Create New Task">
        <form onSubmit={handleCreateTask}>
          <div className="form-group"><label>Title</label><input className="form-input" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} required /></div>
          <div className="form-group"><label>Description</label><textarea className="form-input" value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} required /></div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="form-group" style={{ flex: 1 }}><label>Reward Points</label><input type="number" className="form-input" min="1" max="10000" value={taskForm.rewardPoints} onChange={(e) => setTaskForm({ ...taskForm, rewardPoints: e.target.value })} required /></div>
            <div className="form-group" style={{ flex: 1 }}><label>Input Type</label><select className="form-input" value={taskForm.inputType} onChange={(e) => setTaskForm({ ...taskForm, inputType: e.target.value })}><option value="text">Text</option><option value="image">Image</option><option value="both">Both</option></select></div>
          </div>
          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 16 }}>Create Task</button>
        </form>
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Submission">
        <form onSubmit={handleReject}>
          <div className="form-group"><label>Rejection Reason</label><textarea className="form-input" placeholder="Explain why..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} required minLength={5} /></div>
          <button type="submit" className="btn btn-danger btn-block">Reject Submission</button>
        </form>
      </Modal>

      {/* Preview Modal */}
      <Modal isOpen={showPreview} onClose={() => setShowPreview(false)} title="Submission Preview">
        {previewSub && (
          <div>
            {previewSub.textContent && <div className="form-group"><label>Text Response</label><div className="card" style={{ padding: 16 }}><p style={{ color: 'var(--white)', whiteSpace: 'pre-wrap' }}>{previewSub.textContent}</p></div></div>}
            {previewSub.imageUrl && <div className="form-group"><label>Image</label><img src={previewSub.imageUrl} alt="Submission" style={{ borderRadius: 'var(--radius-md)', maxHeight: 300, objectFit: 'contain' }} /></div>}
            <div style={{ fontSize: '0.85rem', color: 'var(--gray-400)', marginTop: 12 }}>
              <p>Submitted: {new Date(previewSub.createdAt).toLocaleString()}</p>
              <p>Attempt #{previewSub.submissionCount}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const StatCard = ({ icon, label, value, color }) => (
  <div className="stat-card">
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color }}>{icon}<span className="stat-label">{label}</span></div>
    <div className="stat-value" style={{ color }}>{value}</div>
  </div>
);

export default AdminPage;
