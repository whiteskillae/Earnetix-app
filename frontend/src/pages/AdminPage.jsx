import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import toast from 'react-hot-toast';
import { 
  Users, ListTodo, Clock, CheckCircle, XCircle, Eye, Plus, Zap, 
  Bell, Trash2, ShieldAlert, ShieldCheck, Search, Filter,
  Settings, History, BarChart3, Edit, MoreVertical
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
      const r = await request('get', '/tasks');
      setTasks(r.data.tasks);
    } catch {}
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
    try {
      if (editingTask) {
        await request('put', `/tasks/${editingTask._id}`, { ...taskForm, rewardPoints: Number(taskForm.rewardPoints) });
        toast.success('Task updated');
      } else {
        await request('post', '/tasks', { ...taskForm, rewardPoints: Number(taskForm.rewardPoints) });
        toast.success('Task created');
      }
      setShowTaskModal(false);
      setEditingTask(null);
      setTaskForm({ title: '', description: '', rewardPoints: 10, inputType: 'image' });
      fetchTasks();
    } catch {}
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
                  <div className="task-footer">
                    <span className="input-type-badge">{task.inputType.toUpperCase()} REQUIRED</span>
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
                          <button className={`btn btn-sm ${u.isBlocked ? 'btn-success' : 'btn-danger'}`} onClick={() => handleToggleBlock(u._id)}>
                            {u.isBlocked ? 'Unblock User' : 'Block User'}
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
            <div className="form-group" style={{ flex: 1 }}><label>Evidence Required</label><select className="form-input" value={taskForm.inputType} onChange={(e) => setTaskForm({ ...taskForm, inputType: e.target.value })}><option value="text">Text Only</option><option value="image">Screenshot Only</option><option value="both">Text + Screenshot</option></select></div>
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

      <style>{`
        .user-details-view { display: flex; flex-direction: column; gap: 24px; padding: 10px 0; }
        .detail-section h5 { color: var(--blue-light); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; border-bottom: 1px solid #1F1F23; padding-bottom: 8px; }
        .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .detail-item { display: flex; flex-direction: column; gap: 4px; }
        .detail-item label { font-size: 0.7rem; color: var(--gray-500); }
        .detail-item span { font-size: 0.9rem; color: var(--white); font-weight: 500; }
        .detail-item code { font-size: 0.8rem; color: var(--green); background: rgba(16,185,129,0.1); padding: 2px 6px; border-radius: 4px; align-self: flex-start; }
        .history-item { display: flex; justify-content: space-between; padding: 6px 10px; background: #18181B; border-radius: 6px; margin-bottom: 4px; font-size: 0.75rem; }
        .history-item .h-ip { color: var(--gray-300); }
        .history-item .h-date { color: var(--gray-500); }
        .admin-layout { display: flex; min-height: calc(100vh - 0px); background: #0A0A0C; }
        
        /* Admin Sidebar */
        .admin-nav {
          width: 260px; background: #111114; border-right: 1px solid #1F1F23;
          display: flex; flex-direction: column; flex-shrink: 0;
        }
        .admin-nav-header { padding: 24px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid #1F1F23; }
        .admin-nav-header h3 { font-size: 1rem; color: var(--white); font-weight: 700; letter-spacing: 0.5px; }
        .admin-nav-links { padding: 16px 12px; display: flex; flex-direction: column; gap: 4px; }
        .admin-nav-links button {
          display: flex; align-items: center; gap: 12px; padding: 12px 16px;
          background: transparent; border: none; color: var(--gray-400);
          font-size: 0.9rem; font-weight: 500; cursor: pointer; border-radius: 8px;
          transition: all 0.2s; text-align: left;
        }
        .admin-nav-links button:hover { background: #1F1F23; color: var(--white); }
        .admin-nav-links button.active { background: var(--blue); color: var(--white); box-shadow: 0 4px 12px rgba(59,130,246,0.2); }

        /* Main Area */
        .admin-main { flex: 1; padding: 32px; overflow-y: auto; }
        .admin-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; gap: 24px; }
        .admin-header h2 { font-size: 1.75rem; color: var(--white); font-weight: 800; }
        .subtitle { color: var(--gray-400); margin-top: 4px; font-size: 0.9rem; }
        .admin-actions { display: flex; gap: 12px; }

        /* Table Styling */
        .table-wrapper { background: #111114; border-radius: 12px; border: 1px solid #1F1F23; overflow: hidden; margin-top: 24px; }
        .admin-table { width: 100%; border-collapse: collapse; text-align: left; }
        .admin-table th { padding: 16px 20px; background: #18181B; color: var(--gray-400); font-size: 0.8rem; font-weight: 600; text-transform: uppercase; }
        .admin-table td { padding: 16px 20px; border-bottom: 1px solid #1F1F23; font-size: 0.9rem; }
        .user-info-cell { display: flex; flex-direction: column; }
        .user-name { color: var(--white); font-weight: 600; }
        .user-email { color: var(--gray-400); font-size: 0.8rem; }
        .points-badge { color: var(--green); font-weight: 700; background: rgba(16,185,129,0.1); padding: 4px 8px; border-radius: 6px; }
        .status-pill { font-size: 0.75rem; font-weight: 700; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; }
        .status-pill.pending { background: rgba(245,158,11,0.15); color: #F59E0B; }
        .status-pill.approved { background: rgba(16,185,129,0.15); color: #10B981; }
        .status-pill.rejected { background: rgba(239,68,68,0.15); color: #EF4444; }
        .action-btns { display: flex; gap: 8px; }
        .btn-icon { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: #1F1F23; border: 1px solid #2D2D33; border-radius: 6px; color: var(--gray-300); cursor: pointer; transition: all 0.2s; }
        .btn-icon:hover { background: #2D2D33; color: var(--white); }
        .btn-icon.success:hover { background: var(--green); color: var(--white); border-color: var(--green); }
        .btn-icon.danger:hover { background: var(--rejected); color: var(--white); border-color: var(--rejected); }

        /* Filters */
        .view-filters { display: flex; justify-content: space-between; align-items: center; gap: 20px; }
        .filter-group { display: flex; background: #111114; padding: 4px; border-radius: 8px; border: 1px solid #1F1F23; }
        .filter-group button { padding: 8px 16px; border-radius: 6px; border: none; background: transparent; color: var(--gray-400); cursor: pointer; font-size: 0.85rem; font-weight: 500; }
        .filter-group button.active { background: #1F1F23; color: var(--white); }
        .search-box { position: relative; background: #111114; border: 1px solid #1F1F23; border-radius: 8px; padding: 0 12px; display: flex; align-items: center; gap: 8px; min-width: 240px; }
        .search-box input { background: transparent; border: none; color: var(--white); padding: 10px 0; font-size: 0.9rem; width: 100%; outline: none; }

        /* Task Cards */
        .task-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 20px; margin-top: 24px; }
        .task-admin-card { background: #111114; border: 1px solid #1F1F23; padding: 24px; position: relative; display: flex; flex-direction: column; }
        .task-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
        .task-card-header h4 { color: var(--white); font-size: 1.1rem; }
        .task-card-header .points { font-weight: 700; color: var(--blue-light); }
        .task-desc { font-size: 0.9rem; color: var(--gray-400); line-height: 1.5; flex: 1; margin-bottom: 20px; }
        .task-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid #1F1F23; }
        .input-type-badge { font-size: 0.7rem; font-weight: 800; color: var(--gray-500); background: #18181B; padding: 4px 8px; border-radius: 4px; }
        .task-actions { display: flex; gap: 8px; }

        /* Announcements */
        .ann-list { display: flex; flex-direction: column; gap: 16px; margin-top: 24px; }
        .ann-card { background: #111114; border: 1px solid #1F1F23; padding: 20px; }
        .ann-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .ann-title { display: flex; align-items: center; gap: 10px; }
        .priority-dot { width: 8px; height: 8px; border-radius: 50%; }
        .priority-dot.high { background: var(--rejected); box-shadow: 0 0 10px var(--rejected); }
        .priority-dot.medium { background: var(--pending); }
        .priority-dot.low { background: var(--blue); }
        .ann-card h4 { color: var(--white); font-size: 1rem; }
        .ann-card p { color: var(--gray-400); font-size: 0.9rem; line-height: 1.6; }
        .ann-date { font-size: 0.75rem; color: var(--gray-500); margin-top: 12px; display: block; }

        /* Preview Modal */
        .preview-content { padding: 10px 0; }
        .preview-user-info { margin-bottom: 20px; border-bottom: 1px solid #1F1F23; padding-bottom: 16px; }
        .preview-user-info p { font-size: 0.9rem; margin-bottom: 4px; }
        .proof-section { margin-bottom: 20px; }
        .proof-section h5 { color: var(--white); margin-bottom: 8px; font-size: 0.9rem; }
        .text-proof { background: #18181B; padding: 16px; border-radius: 8px; font-size: 0.9rem; border: 1px solid #2D2D33; white-space: pre-wrap; }
        .img-proof { width: 100%; border-radius: 8px; margin-top: 8px; border: 1px solid #2D2D33; }
        .preview-meta { display: flex; justify-content: space-between; color: var(--gray-500); font-size: 0.8rem; margin-top: 16px; }
        .preview-actions { margin-top: 24px; display: flex; justify-content: center; }

        @media (max-width: 1024px) {
          .admin-nav { display: none; }
          .admin-main { padding: 20px; }
        }
      `}</style>
    </div>
  );
};

const StatCard = ({ icon, label, value, color, trend }) => (
  <div className="stat-card" style={{ borderLeft: `4px solid ${color}`, background: '#111114' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--gray-400)' }}>
      {icon} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{label}</span>
    </div>
    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--white)', margin: '12px 0' }}>{value}</div>
    <div style={{ fontSize: '0.75rem', color: trend.includes('Requires') ? '#F59E0B' : trend.includes('Denied') ? '#EF4444' : '#10B981' }}>{trend}</div>
  </div>
);

export default AdminPage;
