import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import toast from 'react-hot-toast';
import { Bell, Plus, Upload, Eye, Zap, Trash2, Edit } from 'lucide-react';

import AdminLayout from '../components/admin/AdminLayout';
import AdminDashboard from '../components/admin/AdminDashboard';
import UserManagement from '../components/admin/UserManagement';
import TaskManagement from '../components/admin/TaskManagement';
import SubmissionReview from '../components/admin/SubmissionReview';
import ReportsView from '../components/admin/ReportsView';
import SkillManagement from '../components/admin/SkillManagement';
import AssignmentManagement from '../components/admin/AssignmentManagement';
import KycReview from '../components/admin/KycReview';
import WithdrawalManagement from '../components/admin/WithdrawalManagement';
import GalleryManagement from '../components/admin/GalleryManagement';
import BlockManagement from '../components/admin/BlockManagement';
import AdminLogs from '../components/admin/AdminLogs';
import AnalyticsDashboard from '../components/admin/AnalyticsDashboard';
import ConfirmModal from '../components/common/ConfirmModal';
import { getDownloadableUrl } from '../utils/cloudinaryHelper';

const AdminPage = () => {
  const { request } = useApi();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'dashboard';
  
  const [dashboard, setDashboard] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subFilter, setSubFilter] = useState('pending');
  const [subType, setSubType] = useState('public'); // 'public' or 'individual'

  // Modals state
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

  // Common Confirm Modal
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null, type: 'danger' });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (tab === 'submissions') fetchSubmissions();
    if (tab === 'users') fetchUsers();
    if (tab === 'tasks') fetchTasks();
    if (tab === 'announcements') fetchAnnouncements();
    if (tab === 'reports') {}; 
  }, [tab, subFilter, subType]);

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
      if (subType === 'public') {
        const r = await request('get', `/admin/submissions?status=${subFilter}&limit=100`);
        setSubmissions(r.data.submissions);
      } else {
        // Individual missions
        const endpoint = subFilter === 'pending' ? '/admin/assigned-tasks/pending' : '/assigned-tasks'; 
        const r = await request('get', endpoint);
        // Map AssignedTask to Submission-like structure for the table
        const mapped = r.data.map(m => ({
          _id: m._id,
          userId: m.assignedUsers[0],
          taskId: { title: m.title, rewardPoints: m.rewardPoints },
          status: m.status === 'under_review' ? 'pending' : m.status,
          createdAt: m.updatedAt,
          textContent: m.submissions[m.submissions.length-1]?.content,
          fileUrl: m.submissions[m.submissions.length-1]?.attachments?.[0], // First attachment
          isAssigned: true
        }));
        setSubmissions(subFilter === 'pending' ? mapped : mapped.filter(m => m.status === subFilter));
      }
    } catch (err) {
      toast.error('Failed to fetch submissions');
    }
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
      const endpoint = subType === 'public' 
        ? `/admin/submissions/${id}/approve` 
        : `/admin/assigned-tasks/${id}/approve`;
      await request('put', endpoint);
      toast.success('Submission Approved & Points Awarded');
      fetchSubmissions();
      fetchDashboard();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approval failed');
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectId) return;
    
    setActionLoading(true);
    try {
      const isBulk = Array.isArray(rejectId);
      const endpoint = isBulk 
        ? (subType === 'public' ? '/admin/submissions/bulk-reject' : null) // individual bulk not implemented yet in backend
        : (subType === 'public' ? `/admin/submissions/${rejectId}/reject` : `/admin/assigned-tasks/${rejectId}/reject`);

      if (!endpoint) { toast.error('Bulk rejection not supported for individual missions'); return; }

      const payload = isBulk ? { ids: rejectId, reason: rejectReason } : { rejectionReason: rejectReason };
      const method = isBulk ? 'post' : 'put';

      await request(method, endpoint, payload);
      toast.success(isBulk ? 'Bulk Rejection Complete' : 'Submission Rejected');
      setShowRejectModal(false);
      setRejectReason('');
      fetchSubmissions();
      fetchDashboard();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rejection failed');
    }
    setActionLoading(false);
  };

  const handleBulkApproveSubmissions = async (ids) => {
    setConfirmModal({
      open: true,
      title: `Bulk Approval: ${ids.length} Submissions`,
      message: `You are about to approve ${ids.length} submissions and award points to all contributing users. Proceed with bulk approval?`,
      type: 'primary',
      confirmText: 'Approve All',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const endpoint = subType === 'public' ? '/admin/submissions/bulk-approve' : null;
          if (!endpoint) { toast.error('Bulk approval not supported for individual missions'); return; }
          
          await request('post', endpoint, { ids });
          toast.success('Bulk Approval Successful');
          fetchSubmissions();
          fetchDashboard();
          setConfirmModal(prev => ({ ...prev, open: false }));
        } catch (err) {
          toast.error('Bulk approval failed');
        }
        setActionLoading(false);
      }
    });
  };

  const handleBulkBlockUsers = async (ids) => {
    setConfirmModal({
      open: true,
      title: `Block ${ids.length} Users`,
      message: `Are you sure you want to permanently block these ${ids.length} users? Their access will be revoked and their pending submissions removed.`,
      type: 'danger',
      confirmText: 'Block Users',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await request('post', '/admin/users/bulk-block', { ids });
          toast.success('Users Blocked');
          fetchUsers();
          setConfirmModal(prev => ({ ...prev, open: false }));
        } catch (err) {
          toast.error('Bulk purge failed');
        }
        setActionLoading(false);
      }
    });
  };

  const handleBulkArchiveTasks = async (ids) => {
    setConfirmModal({
      open: true,
      title: `Bulk Delete: ${ids.length} Tasks`,
      message: `Are you sure you want to delete ${ids.length} active tasks? This will prevent any further submissions.`,
      type: 'danger',
      confirmText: 'Delete Tasks',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await request('post', '/tasks/bulk-archive', { ids });
          toast.success('Tasks Deleted');
          fetchTasks();
          setConfirmModal(prev => ({ ...prev, open: false }));
        } catch (err) {
          toast.error('Bulk archive failed');
        }
        setActionLoading(false);
      }
    });
  };

  const handleCreateOrUpdateTask = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', taskForm.title.trim());
    formData.append('description', taskForm.description.trim());
    formData.append('rewardPoints', Math.floor(Number(taskForm.rewardPoints)));
    formData.append('inputType', taskForm.inputType);
    
    if (taskForm.attachments) {
      taskForm.attachments.forEach(file => {
        formData.append('attachments', file);
      });
    }

    try {
      if (editingTask) {
        await request('put', `/tasks/${editingTask._id}`, formData);
        toast.success('Task updated');
      } else {
        await request('post', '/tasks', formData);
        toast.success('Task created');
      }
      setShowTaskModal(false);
      setEditingTask(null);
      setTaskForm({ title: '', description: '', rewardPoints: 10, inputType: 'image', attachments: [] });
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save task');
    }
  };

  const handleDeleteTask = async (id) => {
    setConfirmModal({
      open: true,
      title: 'Delete Task',
      message: 'Are you sure you want to delete this task? Existing submissions will be preserved, but no new submissions can be made.',
      type: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await request('delete', `/tasks/${id}`);
          toast.success('Task Deleted');
          fetchTasks();
          setConfirmModal(prev => ({ ...prev, open: false }));
        } catch {}
        setActionLoading(false);
      }
    });
  };

  const handleToggleBlock = async (id) => {
    try {
      const res = await request('patch', `/admin/users/${id}/toggle-block`);
      toast.success(res.message);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  const handleBlockTemp = async (id) => {
    setConfirmModal({
      open: true,
      title: 'Temporary Block',
      message: 'Apply a 24-hour block to this user? They will be locked out of the system during this period.',
      type: 'danger',
      confirmText: 'Block 24 Hours',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const res = await request('patch', `/admin/users/${id}/block-temporary`, { durationHours: 24 });
          toast.success(res.message);
          fetchUsers();
          setConfirmModal(prev => ({ ...prev, open: false }));
        } catch (err) {
          toast.error(err.response?.data?.message || 'Block failed');
        }
        setActionLoading(false);
      }
    });
  };

  const handleDeleteUser = async (id) => {
    setActionLoading(true);
    try {
      await request('delete', `/admin/users/${id}`);
      toast.success('User permanently deleted');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    }
    setActionLoading(false);
  };

  const handleAdjustPoints = async (e) => {
    e.preventDefault();
    try {
      await request('post', `/admin/users/${selectedUser._id}/adjust-points`, pointsForm);
      toast.success('Points adjusted');
      setShowPointsModal(false);
      setPointsForm({ points: 0, reason: '' });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to adjust points');
    }
  };

  if (loading && tab === 'dashboard' && !dashboard) return <Loader text="Synchronizing Admin Systems..." />;

  return (
    <>
      <AdminLayout>
      {tab === 'dashboard' && <AdminDashboard data={dashboard} />}
      {tab === 'analytics' && <AnalyticsDashboard />}
      
      {tab === 'users' && (
        <UserManagement 
          users={users} 
          onToggleBlock={handleToggleBlock}
          onBlockTemp={handleBlockTemp}
          onAdjustPoints={(u) => { setSelectedUser(u); setShowPointsModal(true); }}
          onViewDetails={(u) => { setSelectedUser(u); setShowDetailsModal(true); }}
          onBulkBlock={handleBulkBlockUsers}
          onDeleteUser={handleDeleteUser}
        />
      )}

      {tab === 'tasks' && (
        <TaskManagement 
          tasks={tasks}
          onCreateTask={() => { setEditingTask(null); setTaskForm({ title: '', description: '', rewardPoints: 10, inputType: 'image' }); setShowTaskModal(true); }}
          onEditTask={(task) => { setEditingTask(task); setTaskForm({ title: task.title, description: task.description, rewardPoints: task.rewardPoints, inputType: task.inputType }); setShowTaskModal(true); }}
          onDeleteTask={handleDeleteTask}
          onBulkDelete={handleBulkArchiveTasks}
        />
      )}

      {tab === 'submissions' && (
        <SubmissionReview 
          submissions={submissions}
          filter={subFilter}
          setFilter={setSubFilter}
          subType={subType}
          setSubType={setSubType}
          onApprove={handleApprove}
          onReject={(id) => { setRejectId(id); setShowRejectModal(true); }}
          onPreview={(s) => { setPreviewSub(s); setShowPreview(true); }}
          onBulkApprove={handleBulkApproveSubmissions}
          onBulkReject={(ids) => { setRejectId(ids); setShowRejectModal(true); }}
        />
      )}

      {tab === 'reports' && <ReportsView />}
      {tab === 'skills' && <SkillManagement />}
      {tab === 'assignments' && <AssignmentManagement />}
      {tab === 'kyc' && <KycReview />}
      {tab === 'withdrawals' && <WithdrawalManagement />}
      {tab === 'gallery' && <GalleryManagement />}
      {tab === 'blocked' && <BlockManagement />}
      {tab === 'logs' && <AdminLogs />}

      {tab === 'announcements' && (
        <div className="glass-panel">
          <div className="flex-between" style={{ marginBottom: '24px' }}>
             <h3 style={{ margin: 0 }}>Announcements</h3>
             <button className="btn btn-primary" onClick={() => setShowAnnModal(true)}><Bell size={18} /> New Announcement</button>
          </div>
          <div className="ann-list">
            {announcements.map(ann => (
              <div key={ann._id} className="card" style={{ marginBottom: '16px', background: 'rgba(255,255,255,0.02)' }}>
                <div className="flex-between">
                  <h4 style={{ color: ann.priority === 'high' ? '#ef4444' : '#fff' }}>{ann.title}</h4>
                  <button className="btn-icon danger" onClick={() => {
                    setConfirmModal({
                      open: true,
                      title: 'Delete Announcement',
                      message: 'Permanently remove this announcement from the system history?',
                      type: 'danger',
                      confirmText: 'Delete',
                      onConfirm: async () => {
                        setActionLoading(true);
                        try {
                          await request('delete', `/announcements/${ann._id}`);
                          fetchAnnouncements();
                          setConfirmModal(prev => ({ ...prev, open: false }));
                        } catch {}
                        setActionLoading(false);
                      }
                    });
                  }}><Trash2 size={16} /></button>
                </div>
                <p style={{ margin: '12px 0', color: '#94a3b8' }}>{ann.content}</p>
                <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>{new Date(ann.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODALS */}
      <Modal isOpen={showTaskModal} onClose={() => setShowTaskModal(false)} title={editingTask ? 'Edit Task' : 'Create Task'}>
        <form onSubmit={handleCreateOrUpdateTask}>
          <div className="form-group"><label>Task Title</label><input className="form-input" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} required /></div>
          <div className="form-group"><label>Task Instructions</label><textarea className="form-input" rows="4" value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} required /></div>
          <div className="grid-2">
            <div className="form-group"><label>Points Reward</label><input type="number" className="form-input" value={taskForm.rewardPoints} onChange={(e) => setTaskForm({ ...taskForm, rewardPoints: e.target.value })} required /></div>
            <div className="form-group"><label>Submission Type</label><select className="form-input" value={taskForm.inputType} onChange={(e) => setTaskForm({ ...taskForm, inputType: e.target.value })}>
              <option value="image">Screenshot Only</option>
              <option value="link">Link/URL Only</option>
              <option value="text">Text Response Only</option>
              <option value="file">File Upload Only</option>
              <option value="text_link">Text + Link</option>
              <option value="text_image">Text + Screenshot</option>
              <option value="text_file">Text + File</option>
              <option value="image_file">Screenshot + File</option>
              <option value="all">Full Evidence (Text+Img+File+Link)</option>
            </select></div>
          </div>
          <div className="form-group">
            <label>Task Attachments</label>
            <input 
              type="file" 
              multiple 
              className="form-input" 
              onChange={(e) => setTaskForm({ ...taskForm, attachments: Array.from(e.target.files) })} 
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 16 }}>{editingTask ? 'Update Task' : 'Create Task'}</button>
        </form>
      </Modal>

      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Submission">
        <form onSubmit={handleReject}>
          <div className="form-group"><label>Rejection Reason</label><textarea className="form-input" placeholder="Detailed feedback for the user..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} required /></div>
          <button type="submit" className="btn btn-danger btn-block">Reject Submission</button>
        </form>
      </Modal>

      <Modal isOpen={showAnnModal} onClose={() => setShowAnnModal(false)} title="Create Announcement">
        <form onSubmit={async (e) => {
          e.preventDefault();
          await request('post', '/announcements', annForm);
          setShowAnnModal(false);
          setAnnForm({ title: '', content: '', priority: 'medium' });
          fetchAnnouncements();
        }}>
          <div className="form-group"><label>Announcement Title</label><input className="form-input" value={annForm.title} onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })} required /></div>
          <div className="form-group"><label>Announcement Content</label><textarea className="form-input" rows="4" value={annForm.content} onChange={(e) => setAnnForm({ ...annForm, content: e.target.value })} required /></div>
          <div className="form-group">
            <label>Priority Tier</label>
            <select className="form-input" value={annForm.priority} onChange={(e) => setAnnForm({ ...annForm, priority: e.target.value })}>
              <option value="low">Standard</option>
              <option value="medium">Important</option>
              <option value="high">Critical</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary btn-block">Send Announcement</button>
        </form>
      </Modal>

      <Modal isOpen={showPreview} onClose={() => setShowPreview(false)} title="Submission Verification">
        {previewSub && (
          <div className="preview-content">
            <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px' }}>
              <p style={{ fontSize: '0.9rem' }}><strong>Agent:</strong> {previewSub.userId?.name}</p>
              <p style={{ fontSize: '0.9rem' }}><strong>Objective:</strong> {previewSub.taskId?.title}</p>
            </div>
            {previewSub.textContent && <div className="proof-section"><h5>Text Evidence:</h5><div className="text-proof" style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', fontSize: '0.9rem' }}>{previewSub.textContent}</div></div>}
            {previewSub.linkUrl && <div className="proof-section" style={{ marginTop: '20px' }}><h5>Submission Link:</h5><a href={previewSub.linkUrl} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', fontSize: '0.9rem', wordBreak: 'break-all' }}>{previewSub.linkUrl}</a></div>}
            {previewSub.imageUrl && <div className="proof-section" style={{ marginTop: '20px' }}><h5>Screenshot Proof:</h5><img src={previewSub.imageUrl} alt="Proof" style={{ width: '100%', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }} /></div>}
            {previewSub.fileUrl && (
              <div className="proof-section" style={{ marginTop: '20px' }}>
                <h5>File Archive:</h5>
                <a href={getDownloadableUrl(previewSub.fileUrl)} target="_blank" rel="noreferrer" className="btn btn-block btn-outline">
                  <Upload size={16} /> Inspect File
                </a>
              </div>
            )}
            <div className="preview-meta" style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', opacity: 0.5, fontSize: '0.75rem' }}>
              <span>Attempt ID: {previewSub._id.slice(-8)}</span>
              <span>Logged: {new Date(previewSub.createdAt).toLocaleString()}</span>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={showDetailsModal} onClose={() => setShowDetailsModal(false)} title="User Details">
        {selectedUser && (
          <div className="user-details-view">
            <div className="glass-panel" style={{ padding: '20px', marginBottom: '16px' }}>
               <h5 style={{ color: '#3b82f6', marginBottom: '12px' }}>Identity & Background</h5>
               <div className="grid-2">
                 <div><label style={{ fontSize: '0.7rem', color: '#64748b' }}>Username</label><p style={{ color: 'var(--blue-light)', fontWeight: 800, fontSize: '1.2rem' }}>@{selectedUser.username || '—'}</p></div>
                 <div><label style={{ fontSize: '0.7rem', color: '#64748b' }}>Full Name</label><p>{selectedUser.name}</p></div>
                 <div><label style={{ fontSize: '0.7rem', color: '#64748b' }}>Email</label><p>{selectedUser.email}</p></div>
                 <div><label style={{ fontSize: '0.7rem', color: '#64748b' }}>Mobile</label><p>{selectedUser.countryCode} {selectedUser.mobileNumber}</p></div>
                 <div><label style={{ fontSize: '0.7rem', color: '#64748b' }}>Country</label><p>{selectedUser.country}</p></div>
                 <div><label style={{ fontSize: '0.7rem', color: '#64748b' }}>Qualification</label><p>{selectedUser.qualifications || '—'}</p></div>
                 <div><label style={{ fontSize: '0.7rem', color: '#64748b' }}>Skills</label><p>{selectedUser.skills?.join(', ') || '—'}</p></div>
                 <div><label style={{ fontSize: '0.7rem', color: '#64748b' }}>Points</label><p className="text-success" style={{ fontWeight: 800 }}>{selectedUser.points}</p></div>
                 <div><label style={{ fontSize: '0.7rem', color: '#64748b' }}>IP Address</label><p><code>{selectedUser.registrationIp || 'Unknown'}</code></p></div>
               </div>
            </div>
            
            <div className="glass-panel" style={{ padding: '20px', marginBottom: '16px' }}>
               <h5 style={{ color: '#10b981', marginBottom: '12px' }}>Security Audit Log</h5>
               {selectedUser.loginHistory?.slice(-2).reverse().map((h, i) => (
                 <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <span>{h.ip}</span>
                    <span style={{ opacity: 0.5 }}>{new Date(h.timestamp).toLocaleString()}</span>
                 </div>
               ))}
            </div>

            <div className="admin-actions-card">
               <h5 style={{ color: '#ef4444', marginBottom: '12px' }}>Block Controls</h5>
               <div className="flex-gap">
                  <button 
                    className="btn btn-outline" 
                    style={{ flex: 1, borderColor: 'rgba(245, 158, 11, 0.3)' }}
                    onClick={() => { handleBlockTemp(selectedUser._id); setShowDetailsModal(false); }}
                  >
                    Block 24 Hours
                  </button>
                  <button 
                    className={`btn ${selectedUser.isBlocked ? 'btn-success' : 'btn-danger'}`}
                    style={{ flex: 1 }}
                    onClick={() => { handleToggleBlock(selectedUser._id); setShowDetailsModal(false); }}
                  >
                    {selectedUser.isBlocked ? 'Unblock User' : 'Block Account'}
                  </button>
               </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={showPointsModal} onClose={() => setShowPointsModal(false)} title="Adjust Points">
        {selectedUser && (
          <form onSubmit={handleAdjustPoints}>
             <p style={{ fontSize: '0.85rem', marginBottom: '20px', color: '#94a3b8' }}>Adjusting points for <strong>{selectedUser.name}</strong>. Current balance: {selectedUser.points}</p>
             <div className="form-group">
               <label>Points to Add/Remove</label>
               <input type="number" className="form-input" value={pointsForm.points} onChange={(e) => setPointsForm({ ...pointsForm, points: e.target.value })} required />
             </div>
             <div className="form-group">
               <label>Reason</label>
               <input type="text" className="form-input" placeholder="Reason for adjustment..." value={pointsForm.reason} onChange={(e) => setPointsForm({ ...pointsForm, reason: e.target.value })} required />
             </div>
             <button type="submit" className="btn btn-primary btn-block">Adjust Points</button>
          </form>
        )}
      </Modal>

      </AdminLayout>

      <ConfirmModal 
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal(prev => ({ ...prev, open: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
        loading={actionLoading}
      />
    </>
  );
};


export default AdminPage;
