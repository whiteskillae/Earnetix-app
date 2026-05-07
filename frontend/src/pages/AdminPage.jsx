import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import toast from 'react-hot-toast';
import { 
  Users, 
  CheckCircle, 
  Clock, 
  Trash2, 
  Plus, 
  ExternalLink, 
  Check, 
  X, 
  AlertCircle,
  Eye,
  Megaphone,
  BarChart3,
  ListTodo,
  FileText,
  Upload,
  Zap,
  Edit,
  Search,
  Filter,
  MoreVertical,
  XCircle,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  History,
  Settings,
  Bell
} from 'lucide-react';

const AdminPage = () => {
  const { request } = useApi();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'dashboard';
  
  const [dashboard, setDashboard] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subFilter, setSubFilter] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', rewardPoints: 10, inputType: 'image' });
  const [editingTask, setEditingTask] = useState(null);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const [showPreview, setShowPreview] = useState(false);
  const [previewSub, setPreviewSub] = useState(null);

  const [showAnnModal, setShowAnnModal] = useState(false);
  const [annForm, setAnnForm] = useState({ title: '', content: '', priority: 'medium' });

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [showPointsModal, setShowPointsModal] = useState(false);
  const [pointsForm, setPointsForm] = useState({ points: 0, reason: '' });

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (tab === 'submissions') fetchSubmissions();
    if (tab === 'users') fetchUsers();
    if (tab === 'tasks') fetchTasks();
    if (tab === 'announcements') fetchAnnouncements();
  }, [tab, subFilter]);

  const fetchDashboard = async () => {
    try {
      const r = await request('get', '/admin/dashboard');
      setDashboard(r.data);
    } catch {}
    setLoading(false);
  };

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const r = await request('get', `/admin/submissions?status=${subFilter}&limit=100`);
      setSubmissions(r.data.submissions);
    } catch {}
    setLoading(false);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const r = await request('get', '/admin/users?limit=200');
      setUsers(r.data.users);
    } catch {}
    setLoading(false);
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const r = await request('get', '/admin/tasks');
      setTasks(r.data);
    } catch {
      const r = await request('get', '/tasks');
      setTasks(r.data.tasks);
    }
    setLoading(false);
  };

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const r = await request('get', '/announcements');
      setAnnouncements(r.data);
    } catch {}
    setLoading(false);
  };

  const handleApprove = async (id) => {
    try {
      await request('put', `/admin/submissions/${id}/approve`);
      toast.success('Submission Approved');
      fetchSubmissions();
      fetchDashboard();
    } catch {}
  };

  const handleReject = async (e) => {
    e.preventDefault();
    try {
      await request('put', `/admin/submissions/${rejectId}/reject`, { rejectionReason: rejectReason });
      toast.success('Submission Rejected');
      setShowRejectModal(false);
      setRejectReason('');
      fetchSubmissions();
      fetchDashboard();
    } catch {}
  };

  const handleCreateOrUpdateTask = async (e) => {
    e.preventDefault();
    
    // Sanitize payload: ensure numbers and remove empty strings for optional fields
    const payload = {
      title: taskForm.title.trim(),
      description: taskForm.description.trim(),
      rewardPoints: Math.floor(Number(taskForm.rewardPoints)),
      inputType: taskForm.inputType
    };
    
    // Only send if positive number
    if (isNaN(payload.rewardPoints) || payload.rewardPoints < 1) {
      return toast.error('Reward points must be at least 1');
    }

    if (payload.title.length < 3) return toast.error('Title too short');
    if (payload.description.length < 10) return toast.error('Description too short');

    try {
      if (editingTask) {
        await request('put', `/tasks/${editingTask._id}`, payload);
        toast.success('Task updated');
      } else {
        await request('post', '/tasks', payload);
        toast.success('Task created');
      }
      setShowTaskModal(false);
      setEditingTask(null);
      setTaskForm({ title: '', description: '', rewardPoints: 10, inputType: 'image' });
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save task');
    }
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm('Delete this task? This will not affect existing submissions.')) return;
    try {
      await request('delete', `/tasks/${id}`);
      toast.success('Task deleted');
      fetchTasks();
    } catch {}
  };

  const handleToggleBlock = async (id) => {
    try {
      const res = await request('patch', `/admin/users/${id}/toggle-block`);
      toast.success(res.message);
      fetchUsers();
    } catch {}
  };

  const handleAdjustPoints = async (e) => {
    e.preventDefault();
    try {
      await request('post', `/admin/users/${selectedUser._id}/adjust-points`, pointsForm);
      toast.success('Points adjusted successfully');
      setShowPointsModal(false);
      setPointsForm({ points: 0, reason: '' });
      fetchUsers();
    } catch {}
  };

  const handleCreateAnn = async (e) => {
    e.preventDefault();
    try {
      await request('post', '/announcements', annForm);
      toast.success('Announcement posted');
      setShowAnnModal(false);
      setAnnForm({ title: '', content: '', priority: 'medium' });
      fetchAnnouncements();
    } catch {}
  };

  const handleDeleteAnn = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await request('delete', `/announcements/${id}`);
      toast.success('Announcement deleted');
      fetchAnnouncements();
    } catch {}
  };

  if (loading && tab === 'dashboard' && !dashboard) return <Loader text="Loading Admin Intelligence..." />;

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="admin-layout fade-in">
      {/* Main Admin Content */}
      <div className="admin-main">
        <header className="admin-header">
          <div>
            <h2>{tab.charAt(0).toUpperCase() + tab.slice(1)} Management</h2>
            <p className="subtitle">System administrator dashboard for Earnitix</p>
          </div>
          <div className="admin-actions">
            <button className="btn btn-outline" onClick={() => setShowAnnModal(true)}><Bell size={18} /> Alert</button>
            <button className="btn btn-primary" onClick={() => { setEditingTask(null); setTaskForm({ title: '', description: '', rewardPoints: 10, inputType: 'image' }); setShowTaskModal(true); }}>
              <Plus size={18} /> New Task
            </button>
          </div>
        </header>

        {/* DASHBOARD */}
        {tab === 'dashboard' && dashboard && (
          <div className="dashboard-view">
            <div className="stats-grid">
              <StatCard icon={<Users size={22} />} label="Total Users" value={dashboard.totalUsers} color="#3B82F6" trend="+12% this month" />
              <StatCard icon={<Clock size={22} />} label="Pending Review" value={dashboard.pendingSubmissions} color="#F59E0B" trend="Requires Action" />
              <StatCard icon={<CheckCircle size={22} />} label="Approved" value={dashboard.approvedSubmissions} color="#10B981" trend="Successfully processed" />
              <StatCard icon={<XCircle size={22} />} label="Rejected" value={dashboard.rejectedSubmissions} color="#EF4444" trend="Denied access" />
            </div>

            <div className="recent-activity-section" style={{ marginTop: 32 }}>
              <h3 style={{ marginBottom: 16 }}>System Overview</h3>
              <div className="card" style={{ padding: 24, background: 'var(--dark-800)' }}>
                <p style={{ color: 'var(--gray-400)' }}>The system is currently handling <strong>{dashboard.totalSubmissions}</strong> total task submissions across <strong>{dashboard.totalTasks}</strong> active campaigns.</p>
              </div>
            </div>
          </div>
        )}

        {/* SUBMISSIONS */}
        {tab === 'submissions' && (
          <div className="submissions-view">
            <div className="view-filters">
              <div className="filter-group">
                {['pending', 'approved', 'rejected'].map(f => (
                  <button key={f} className={subFilter === f ? 'active' : ''} onClick={() => setSubFilter(f)}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
              <div className="search-box">
                <Search size={16} />
                <input type="text" placeholder="Search user or task..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>

            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User Detail</th>
                    <th>Task Target</th>
                    <th>Reward</th>
                    <th>Status</th>
                    <th>Submission Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map(s => (
                    <tr key={s._id}>
                      <td>
                        <div className="user-info-cell">
                          <span className="user-name">{s.userId?.name || 'Unknown'}</span>
                          <span className="user-email">{s.userId?.email}</span>
                        </div>
                      </td>
                      <td>{s.taskId?.title || 'Deleted Task'}</td>
                      <td><span className="points-badge">+{s.taskId?.rewardPoints}</span></td>
                      <td><span className={`status-pill ${s.status}`}>{s.status}</span></td>
                      <td>{new Date(s.createdAt).toLocaleString()}</td>
                      <td>
                        <div className="action-btns">
                          <button className="btn-icon" title="View Proof" onClick={() => { setPreviewSub(s); setShowPreview(true); }}><Eye size={16} /></button>
                          {s.status === 'pending' && (
                            <>
                              <button className="btn-icon success" title="Approve" onClick={() => handleApprove(s._id)}><CheckCircle size={16} /></button>
                              <button className="btn-icon danger" title="Reject" onClick={() => { setRejectId(s._id); setShowRejectModal(true); }}><XCircle size={16} /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TASKS */}
        {tab === 'tasks' && (
          <div className="tasks-view">
            <div className="task-grid">
              {tasks.map(task => (
                <div key={task._id} className="task-admin-card card">
                  <div className="task-card-header">
                    <h4>{task.title}</h4>
                    <span className="points">+{task.rewardPoints} Pts</span>
                  </div>
                  <p className="task-desc">{task.description}</p>
                  
                  {task.stats && (
                    <div className="task-stats-bar" style={{ display: 'flex', gap: 12, marginBottom: 20, padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                      <div className="stat-mini"><Clock size={12} color="#F59E0B" /> <span>{task.stats.pending}</span></div>
                      <div className="stat-mini"><CheckCircle size={12} color="#10B981" /> <span>{task.stats.approved}</span></div>
                      <div className="stat-mini"><XCircle size={12} color="#EF4444" /> <span>{task.stats.rejected}</span></div>
                    </div>
                  )}

                  <div className="task-footer">
                    <span className="input-type-badge">{task.inputType.toUpperCase()}</span>
                    <div className="task-actions">
                      <button className="btn-icon" onClick={() => { 
                        setEditingTask(task); 
                        setTaskForm({ title: task.title, description: task.description, rewardPoints: task.rewardPoints, inputType: task.inputType });
                        setShowTaskModal(true);
                      }}><Edit size={16} /></button>
                      <button className="btn-icon danger" onClick={() => handleDeleteTask(task._id)}><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* USERS */}
        {tab === 'users' && (
          <div className="users-view">
             <div className="view-filters">
              <div className="search-box" style={{ flex: 1 }}>
                <Search size={16} />
                <input type="text" placeholder="Search name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>

            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User Profile</th>
                    <th>Points</th>
                    <th>Account Status</th>
                    <th>Registration Date</th>
                    <th>Security</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u._id}>
                      <td>
                        <div className="user-info-cell">
                          <span className="user-name">{u.name}</span>
                          <span className="user-email">{u.email}</span>
                        </div>
                      </td>
                      <td><span className="points-value">{u.points}</span></td>
                      <td>
                        <span className={`status-pill ${u.isBlocked ? 'rejected' : 'approved'}`}>
                          {u.isBlocked ? 'BLOCKED' : 'ACTIVE'}
                        </span>
                      </td>
                      <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="action-btns">
                          <button className="btn-icon" title="View Details" onClick={() => { setSelectedUser(u); setShowDetailsModal(true); }}><Eye size={16} /></button>
                          <button className="btn-icon" title="Adjust Points" onClick={() => { setSelectedUser(u); setShowPointsModal(true); }}><Zap size={16} color="var(--yellow)" /></button>
                          <button className={`btn btn-sm ${u.isBlocked ? 'btn-success' : 'btn-danger'}`} onClick={() => handleToggleBlock(u._id)}>
                            {u.isBlocked ? 'Unblock' : 'Block'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ANNOUNCEMENTS */}
        {tab === 'announcements' && (
          <div className="announcements-view">
            <div className="ann-list">
              {announcements.map(ann => (
                <div key={ann._id} className="ann-card card">
                  <div className="ann-header">
                    <div className="ann-title">
                      <span className={`priority-dot ${ann.priority}`}></span>
                      <h4>{ann.title}</h4>
                    </div>
                    <button className="btn-icon danger" onClick={() => handleDeleteAnn(ann._id)}><Trash2 size={16} /></button>
                  </div>
                  <p>{ann.content}</p>
                  <span className="ann-date">{new Date(ann.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}
      <Modal isOpen={showTaskModal} onClose={() => { setShowTaskModal(false); setEditingTask(null); }} title={editingTask ? 'Edit Task' : 'Create New Campaign'}>
        <form onSubmit={handleCreateOrUpdateTask}>
          <div className="form-group"><label>Campaign Title</label><input className="form-input" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} required /></div>
          <div className="form-group"><label>Instructions</label><textarea className="form-input" rows="4" value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} required /></div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="form-group" style={{ flex: 1 }}><label>Points Reward</label><input type="number" className="form-input" min="1" value={taskForm.rewardPoints} onChange={(e) => setTaskForm({ ...taskForm, rewardPoints: e.target.value })} required /></div>
            <div className="form-group" style={{ flex: 1 }}><label>Evidence Required</label><select className="form-input" value={taskForm.inputType} onChange={(e) => setTaskForm({ ...taskForm, inputType: e.target.value })}>
              <option value="text">Text Only</option>
              <option value="image">Screenshot (Image)</option>
              <option value="file">Any File (PDF/Zip/etc)</option>
              <option value="text_image">Text + Screenshot</option>
              <option value="text_file">Text + File</option>
              <option value="image_file">Screenshot + File</option>
              <option value="all">Text + Image + File</option>
            </select></div>
          </div>
          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 16 }}>{editingTask ? 'Save Changes' : 'Launch Campaign'}</button>
        </form>
      </Modal>

      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Evidence">
        <form onSubmit={handleReject}>
          <div className="form-group"><label>Rejection Notice</label><textarea className="form-input" placeholder="Explain what went wrong..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} required /></div>
          <button type="submit" className="btn btn-danger btn-block">Confirm Rejection</button>
        </form>
      </Modal>

      <Modal isOpen={showAnnModal} onClose={() => setShowAnnModal(false)} title="Global Broadcast">
        <form onSubmit={handleCreateAnn}>
          <div className="form-group"><label>Notice Title</label><input className="form-input" value={annForm.title} onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })} required /></div>
          <div className="form-group"><label>Broadcast Content</label><textarea className="form-input" rows="4" value={annForm.content} onChange={(e) => setAnnForm({ ...annForm, content: e.target.value })} required /></div>
          <div className="form-group">
            <label>Priority Level</label>
            <select className="form-input" value={annForm.priority} onChange={(e) => setAnnForm({ ...annForm, priority: e.target.value })}>
              <option value="low">Standard Info</option>
              <option value="medium">Important Notice</option>
              <option value="high">Critical Alert</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary btn-block">Send to All Users</button>
        </form>
      </Modal>

      <Modal isOpen={showPreview} onClose={() => setShowPreview(false)} title="Submission Verification">
        {previewSub && (
          <div className="preview-content">
            <div className="preview-user-info">
              <p><strong>User:</strong> {previewSub.userId?.name}</p>
              <p><strong>Task:</strong> {previewSub.taskId?.title}</p>
            </div>
            {previewSub.textContent && <div className="proof-section"><h5>Text Evidence:</h5><div className="text-proof">{previewSub.textContent}</div></div>}
            {previewSub.imageUrl && <div className="proof-section"><h5>Screenshot Evidence:</h5><img src={previewSub.imageUrl} alt="Proof" className="img-proof" /></div>}
            {previewSub.fileUrl && (
              <div className="proof-section">
                <h5>File Evidence:</h5>
                <a href={previewSub.fileUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline">
                  <Upload size={14} /> View/Download File
                </a>
              </div>
            )}
            <div className="preview-meta">
              <span>Attempt #{previewSub.submissionCount}</span>
              <span>{new Date(previewSub.createdAt).toLocaleString()}</span>
            </div>
            <div className="preview-actions">
              <button className="btn btn-sm btn-danger" onClick={() => { handleToggleBlock(previewSub.userId?._id); setShowPreview(false); }}>
                {previewSub.userId?.isBlocked ? 'Unblock User' : 'Block User'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={showDetailsModal} onClose={() => setShowDetailsModal(false)} title="User Intelligence Dossier">
        {selectedUser && (
          <div className="user-details-view">
            <div className="detail-section">
              <h5>Identity & Contact</h5>
              <div className="detail-grid">
                <div className="detail-item"><label>Full Name</label><span>{selectedUser.name}</span></div>
                <div className="detail-item"><label>Email Address</label><span>{selectedUser.email}</span></div>
                <div className="detail-item"><label>Phone</label><span>{selectedUser.countryCode} {selectedUser.mobileNumber || 'Not provided'}</span></div>
                <div className="detail-item"><label>Location</label><span>{selectedUser.country || 'Not provided'}</span></div>
              </div>
            </div>

            <div className="detail-section">
              <h5>Account Information</h5>
              <div className="detail-grid">
                <div className="detail-item"><label>Earned Points</label><span className="points-value">{selectedUser.points}</span></div>
                <div className="detail-item"><label>Role</label><span className="status-pill approved">{selectedUser.role}</span></div>
                <div className="detail-item"><label>Status</label><span className={`status-pill ${selectedUser.isBlocked ? 'rejected' : 'approved'}`}>{selectedUser.isBlocked ? 'Blocked' : 'Active'}</span></div>
                <div className="detail-item"><label>Registration</label><span>{new Date(selectedUser.createdAt).toLocaleString()}</span></div>
                <div className="detail-item"><label>Profile Status</label><span>{selectedUser.isProfileComplete ? 'Complete' : 'Pending Onboarding'}</span></div>
                <div className="detail-item"><label>Auth Method</label><span>{selectedUser.authProvider}</span></div>
              </div>
            </div>

            <div className="detail-section">
              <h5>Security Context</h5>
              <div className="detail-grid">
                <div className="detail-item"><label>Registration IP</label><code>{selectedUser.registrationIp || 'Unknown'}</code></div>
                <div className="detail-item"><label>Last Known IP</label><code>{selectedUser.loginHistory?.[selectedUser.loginHistory.length-1]?.ip || 'Unknown'}</code></div>
              </div>
              <div className="history-list" style={{ marginTop: 12 }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: 8, display: 'block' }}>Recent Access Log</label>
                {selectedUser.loginHistory?.slice(-5).reverse().map((h, i) => (
                  <div key={i} className="history-item">
                    <span className="h-ip">{h.ip}</span>
                    <span className="h-date">{new Date(h.timestamp).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={showPointsModal} onClose={() => setShowPointsModal(false)} title="Adjust User Points">
        {selectedUser && (
          <form onSubmit={handleAdjustPoints}>
            <div style={{ marginBottom: 16, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
              <p style={{ fontSize: '0.85rem' }}>Adjusting points for: <strong>{selectedUser.name}</strong></p>
              <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>Current Points: <span style={{ color: 'var(--green)', fontWeight: 700 }}>{selectedUser.points}</span></p>
            </div>
            <div className="form-group">
              <label>Point Delta (Use negative for deduction)</label>
              <input type="number" className="form-input" value={pointsForm.points} onChange={(e) => setPointsForm({ ...pointsForm, points: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Reason for Adjustment</label>
              <input type="text" className="form-input" placeholder="e.g. Correction for task #123" value={pointsForm.reason} onChange={(e) => setPointsForm({ ...pointsForm, reason: e.target.value })} required />
            </div>
            <button type="submit" className="btn btn-primary btn-block">Confirm Adjustment</button>
          </form>
        )}
      </Modal>

    </div>
  );
};

const StatCard = ({ icon, label, value, color, trend }) => (
  <div className="stat-card" style={{ borderLeft: `4px solid ${color}`, background: 'var(--dark-900)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--gray-400)' }}>
      {icon} <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' }}>{label}</span>
    </div>
    <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--white)', margin: '12px 0' }}>{value}</div>
    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: trend.includes('Requires') ? 'var(--yellow)' : trend.includes('Denied') ? 'var(--rejected)' : 'var(--green)' }}>{trend}</div>
  </div>
);

export default AdminPage;
