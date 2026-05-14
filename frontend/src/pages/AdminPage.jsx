import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import toast from 'react-hot-toast';
import { Bell, Plus, Upload, Eye, Zap, Trash2, Edit } from 'lucide-react';

// New Modular Components
import AdminLayout from '../components/admin/AdminLayout';
import AdminDashboard from '../components/admin/AdminDashboard';
import UserManagement from '../components/admin/UserManagement';
import TaskManagement from '../components/admin/TaskManagement';
import SubmissionReview from '../components/admin/SubmissionReview';
import ReportsView from '../components/admin/ReportsView';
import SkillManagement from '../components/admin/SkillManagement';
import AssignmentManagement from '../components/admin/AssignmentManagement';

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
      toast.success('Mission Accomplished & Points Awarded');
      fetchSubmissions();
      fetchDashboard();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approval failed');
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    try {
      const endpoint = subType === 'public' 
        ? `/admin/submissions/${rejectId}/reject` 
        : `/admin/assigned-tasks/${rejectId}/reject`;
      await request('put', endpoint, { rejectionReason: rejectReason });
      toast.success('Submission Rejected');
      setShowRejectModal(false);
      setRejectReason('');
      fetchSubmissions();
      fetchDashboard();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rejection failed');
    }
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
        await request('put', `/tasks/${editingTask._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Task updated');
      } else {
        await request('post', '/tasks', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
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
    if (!window.confirm('Delete this task?')) return;
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

  const handleBlockTemp = async (id) => {
    if (!window.confirm('Temporarily block this user for 24 hours?')) return;
    try {
      const res = await request('patch', `/admin/users/${id}/block-temporary`, { durationHours: 24 });
      toast.success(res.message);
      fetchUsers();
    } catch {}
  };

  const handleAdjustPoints = async (e) => {
    e.preventDefault();
    try {
      await request('post', `/admin/users/${selectedUser._id}/adjust-points`, pointsForm);
      toast.success('Points adjusted');
      setShowPointsModal(false);
      setPointsForm({ points: 0, reason: '' });
      fetchUsers();
    } catch {}
  };

  if (loading && tab === 'dashboard' && !dashboard) return <Loader text="Synchronizing Admin Systems..." />;

  return (
    <AdminLayout>
      {tab === 'dashboard' && <AdminDashboard data={dashboard} />}
      
      {tab === 'users' && (
        <UserManagement 
          users={users} 
          onToggleBlock={handleToggleBlock}
          onBlockTemp={handleBlockTemp}
          onAdjustPoints={(u) => { setSelectedUser(u); setShowPointsModal(true); }}
          onViewDetails={(u) => { setSelectedUser(u); setShowDetailsModal(true); }}
        />
      )}

      {tab === 'tasks' && (
        <TaskManagement 
          tasks={tasks}
          onCreateTask={() => { setEditingTask(null); setTaskForm({ title: '', description: '', rewardPoints: 10, inputType: 'image' }); setShowTaskModal(true); }}
          onEditTask={(task) => { setEditingTask(task); setTaskForm({ title: task.title, description: task.description, rewardPoints: task.rewardPoints, inputType: task.inputType }); setShowTaskModal(true); }}
          onDeleteTask={handleDeleteTask}
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
        />
      )}

      {tab === 'reports' && <ReportsView />}
      {tab === 'skills' && <SkillManagement />}
      {tab === 'assignments' && <AssignmentManagement />}

      {tab === 'announcements' && (
        <div className="glass-panel">
          <div className="flex-between" style={{ marginBottom: '24px' }}>
             <h3 style={{ margin: 0 }}>System Broadcasts</h3>
             <button className="btn btn-primary" onClick={() => setShowAnnModal(true)}><Bell size={18} /> New Broadcast</button>
          </div>
          <div className="ann-list">
            {announcements.map(ann => (
              <div key={ann._id} className="card" style={{ marginBottom: '16px', background: 'rgba(255,255,255,0.02)' }}>
                <div className="flex-between">
                  <h4 style={{ color: ann.priority === 'high' ? '#ef4444' : '#fff' }}>{ann.title}</h4>
                  <button className="btn-icon danger" onClick={async () => {
                     if (window.confirm('Delete broadcast?')) {
                       await request('delete', `/announcements/${ann._id}`);
                       fetchAnnouncements();
                     }
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
      <Modal isOpen={showTaskModal} onClose={() => setShowTaskModal(false)} title={editingTask ? 'Edit Campaign' : 'Initialize Campaign'}>
        <form onSubmit={handleCreateOrUpdateTask}>
          <div className="form-group"><label>Campaign Title</label><input className="form-input" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} required /></div>
          <div className="form-group"><label>Operational Guidelines</label><textarea className="form-input" rows="4" value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} required /></div>
          <div className="grid-2">
            <div className="form-group"><label>Credit Reward</label><input type="number" className="form-input" value={taskForm.rewardPoints} onChange={(e) => setTaskForm({ ...taskForm, rewardPoints: e.target.value })} required /></div>
            <div className="form-group"><label>Evidence Type</label><select className="form-input" value={taskForm.inputType} onChange={(e) => setTaskForm({ ...taskForm, inputType: e.target.value })}>
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
            <label>Campaign Attachments (Visible to everyone)</label>
            <input 
              type="file" 
              multiple 
              className="form-input" 
              onChange={(e) => setTaskForm({ ...taskForm, attachments: Array.from(e.target.files) })} 
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 16 }}>{editingTask ? 'Update Protocol' : 'Deploy Campaign'}</button>
        </form>
      </Modal>

      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Invalidate Submission">
        <form onSubmit={handleReject}>
          <div className="form-group"><label>Invalidation Reason</label><textarea className="form-input" placeholder="Detailed feedback for the user..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} required /></div>
          <button type="submit" className="btn btn-danger btn-block">Confirm Invalidation</button>
        </form>
      </Modal>

      <Modal isOpen={showAnnModal} onClose={() => setShowAnnModal(false)} title="Deploy System Broadcast">
        <form onSubmit={async (e) => {
          e.preventDefault();
          await request('post', '/announcements', annForm);
          setShowAnnModal(false);
          setAnnForm({ title: '', content: '', priority: 'medium' });
          fetchAnnouncements();
        }}>
          <div className="form-group"><label>Notice Title</label><input className="form-input" value={annForm.title} onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })} required /></div>
          <div className="form-group"><label>Broadcast Payload</label><textarea className="form-input" rows="4" value={annForm.content} onChange={(e) => setAnnForm({ ...annForm, content: e.target.value })} required /></div>
          <div className="form-group">
            <label>Priority Tier</label>
            <select className="form-input" value={annForm.priority} onChange={(e) => setAnnForm({ ...annForm, priority: e.target.value })}>
              <option value="low">Standard</option>
              <option value="medium">Important</option>
              <option value="high">Critical</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary btn-block">Execute Broadcast</button>
        </form>
      </Modal>

      <Modal isOpen={showPreview} onClose={() => setShowPreview(false)} title="Evidence Verification">
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
                <a href={previewSub.fileUrl} target="_blank" rel="noreferrer" className="btn btn-block btn-outline">
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

      <Modal isOpen={showDetailsModal} onClose={() => setShowDetailsModal(false)} title="User Intelligence Dossier">
        {selectedUser && (
          <div className="user-details-view">
            <div className="glass-panel" style={{ padding: '20px', marginBottom: '16px' }}>
               <h5 style={{ color: '#3b82f6', marginBottom: '12px' }}>Identity & Background</h5>
               <div className="grid-2">
                 <div><label style={{ fontSize: '0.7rem', color: '#64748b' }}>Name</label><p>{selectedUser.name}</p></div>
                 <div><label style={{ fontSize: '0.7rem', color: '#64748b' }}>Email</label><p>{selectedUser.email}</p></div>
                 <div><label style={{ fontSize: '0.7rem', color: '#64748b' }}>Mobile</label><p>{selectedUser.countryCode} {selectedUser.mobileNumber}</p></div>
                 <div><label style={{ fontSize: '0.7rem', color: '#64748b' }}>Country</label><p>{selectedUser.country}</p></div>
                 <div><label style={{ fontSize: '0.7rem', color: '#64748b' }}>Qualification</label><p>{selectedUser.qualifications || '—'}</p></div>
                 <div><label style={{ fontSize: '0.7rem', color: '#64748b' }}>Skills</label><p>{selectedUser.skills?.join(', ') || '—'}</p></div>
                 <div><label style={{ fontSize: '0.7rem', color: '#64748b' }}>Credits</label><p className="text-success" style={{ fontWeight: 800 }}>{selectedUser.points}</p></div>
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
               <h5 style={{ color: '#ef4444', marginBottom: '12px' }}>Access Control</h5>
               <div className="flex-gap">
                  <button 
                    className="btn btn-outline" 
                    style={{ flex: 1, borderColor: 'rgba(245, 158, 11, 0.3)' }}
                    onClick={() => { handleBlockTemp(selectedUser._id); setShowDetailsModal(false); }}
                  >
                    24H TEMP BLOCK
                  </button>
                  <button 
                    className={`btn ${selectedUser.isBlocked ? 'btn-success' : 'btn-danger'}`}
                    style={{ flex: 1 }}
                    onClick={() => { handleToggleBlock(selectedUser._id); setShowDetailsModal(false); }}
                  >
                    {selectedUser.isBlocked ? 'REVOKE BAN' : 'PERMANENT BAN'}
                  </button>
               </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={showPointsModal} onClose={() => setShowPointsModal(false)} title="Credit Adjustment Protocol">
        {selectedUser && (
          <form onSubmit={handleAdjustPoints}>
             <p style={{ fontSize: '0.85rem', marginBottom: '20px', color: '#94a3b8' }}>Adjusting credits for <strong>{selectedUser.name}</strong>. Current balance: {selectedUser.points}</p>
             <div className="form-group">
               <label>Credit Delta (+/-)</label>
               <input type="number" className="form-input" value={pointsForm.points} onChange={(e) => setPointsForm({ ...pointsForm, points: e.target.value })} required />
             </div>
             <div className="form-group">
               <label>Audit Memo</label>
               <input type="text" className="form-input" placeholder="Reason for adjustment..." value={pointsForm.reason} onChange={(e) => setPointsForm({ ...pointsForm, reason: e.target.value })} required />
             </div>
             <button type="submit" className="btn btn-primary btn-block">Authorize Adjustment</button>
          </form>
        )}
      </Modal>

    </AdminLayout>
  );
};


export default AdminPage;
