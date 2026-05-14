import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import Modal from '../common/Modal';
import toast from 'react-hot-toast';
import { 
  Plus, Users, Target, Calendar, Award, Send, 
  Trash2, Clock, CheckCircle, AlertCircle, 
  Search, Filter, Upload, FileText, X
} from 'lucide-react';

const AssignmentManagement = () => {
  const { request, loading: apiLoading } = useApi();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [attachments, setAttachments] = useState([]);

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    deadline: '',
    rewardPoints: 50
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tRes, uRes, cRes] = await Promise.all([
        request('get', '/assigned-tasks'),
        request('get', '/admin/users?limit=1000'),
        request('get', '/skill-categories')
      ]);
      if (tRes.success) setTasks(tRes.data);
      if (uRes.success) setUsers(uRes.data.users);
      if (cRes.success) setCategories(cRes.data);
    } catch (err) {
      toast.error('Failed to load mission data');
    } finally {
      setLoading(false);
    }
  };

  const allSkills = categories.flatMap(cat => cat.skills);
  const filteredUsers = users.filter(user => {
    const matchesQuery = user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSkill = !selectedSkill || user.skills?.includes(selectedSkill);
    return matchesQuery && matchesSkill;
  });

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setAttachments([...attachments, ...files]);
  };

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const toggleUserSelection = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const selectAllFiltered = () => {
    const filteredIds = filteredUsers.map(u => u._id);
    setSelectedUsers([...new Set([...selectedUsers, ...filteredIds])]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedUsers.length === 0) return toast.error('Select at least one agent');

    const formData = new FormData();
    formData.append('title', form.title);
    formData.append('description', form.description);
    formData.append('priority', form.priority);
    formData.append('deadline', form.deadline);
    formData.append('rewardPoints', form.rewardPoints);
    formData.append('assignedUsers', JSON.stringify(selectedUsers));
    
    attachments.forEach(file => {
      formData.append('attachments', file);
    });

    try {
      const res = await request('post', '/assigned-tasks', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.success) {
        toast.success(res.message || 'Mission Deployed');
        setShowModal(false);
        setForm({ title: '', description: '', priority: 'medium', deadline: '', rewardPoints: 50 });
        setAttachments([]);
        setSelectedUsers([]);
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Deployment failed');
    }
  };

  if (loading) return <div className="glass-panel" style={{ textAlign: 'center', padding: '40px' }}>Synchronizing Mission Control...</div>;

  return (
    <div className="assignment-management fade-in">
      <div className="flex-between" style={{ marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Individual Mission Center</h2>
          <p style={{ color: 'var(--gray-400)', fontSize: '0.9rem' }}>Deploy targeted tasks to specific expert agents</p>
        </div>
        <div className="flex-gap">
            {selectedUsers.length > 0 && (
                <button className="btn btn-primary slide-right" onClick={() => setShowModal(true)}>
                    <Send size={18} /> Deploy to {selectedUsers.length} Agents
                </button>
            )}
        </div>
      </div>

      {/* User Selection Logic */}
      <div className="discovery-header glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
        <div className="flex-between" style={{ marginBottom: '20px' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                <input 
                    className="form-input" 
                    placeholder="Search agents by name or email..." 
                    style={{ paddingLeft: '48px' }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <button className="btn btn-outline" onClick={selectAllFiltered}>
                <Users size={18} /> Select All Filtered
            </button>
        </div>

        <div className="skills-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button 
                className={`tag-btn ${!selectedSkill ? 'active' : ''}`}
                onClick={() => setSelectedSkill(null)}
            >
                All Expertise
            </button>
            {allSkills.slice(0, 15).map(skill => (
                <button 
                    key={skill}
                    className={`tag-btn ${selectedSkill === skill ? 'active' : ''}`}
                    onClick={() => setSelectedSkill(skill)}
                >
                    {skill}
                </button>
            ))}
        </div>
      </div>

      <div className="users-list-grid">
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="premium-table">
                <thead>
                    <tr>
                        <th style={{ width: '40px' }}></th>
                        <th>Agent Details</th>
                        <th>Specializations</th>
                        <th>Current Points</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredUsers.length === 0 ? (
                        <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>No agents match your criteria</td></tr>
                    ) : (
                        filteredUsers.map(user => (
                            <tr key={user._id} className={selectedUsers.includes(user._id) ? 'selected-row' : ''} onClick={() => toggleUserSelection(user._id)}>
                                <td>
                                    <div className={`checkbox-custom ${selectedUsers.includes(user._id) ? 'checked' : ''}`}>
                                        {selectedUsers.includes(user._id) && <CheckCircle size={14} />}
                                    </div>
                                </td>
                                <td>
                                    <div style={{ fontWeight: 700 }}>{user.name}</div>
                                    <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>{user.email}</div>
                                </td>
                                <td>
                                    <div className="flex-gap" style={{ flexWrap: 'wrap', gap: '4px' }}>
                                        {user.skills?.slice(0, 2).map(s => (
                                            <span key={s} className="mini-tag">{s}</span>
                                        ))}
                                        {user.skills?.length > 2 && <span className="mini-tag">+{user.skills.length - 2}</span>}
                                    </div>
                                </td>
                                <td style={{ color: 'var(--success)', fontWeight: 800 }}>{user.points}</td>
                                <td>
                                    <button className={`btn btn-sm ${selectedUsers.includes(user._id) ? 'btn-primary' : 'btn-outline'}`}>
                                        {selectedUsers.includes(user._id) ? 'Selected' : 'Select'}
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* Task List Section (Bottom) */}
      <div style={{ marginTop: '40px' }}>
        <h3 style={{ marginBottom: '20px' }}>Active Individual Missions</h3>
        <div className="tasks-grid">
            {tasks.length === 0 ? (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '40px' }}>
                    <p style={{ opacity: 0.5 }}>No missions currently deployed</p>
                </div>
            ) : (
                <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="premium-table">
                        <thead>
                            <tr>
                                <th>Mission</th>
                                <th>Priority</th>
                                <th>Agent</th>
                                <th>Status</th>
                                <th>Submissions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasks.map(task => (
                                <tr key={task._id}>
                                    <td>
                                        <div style={{ fontWeight: 700 }}>{task.title}</div>
                                        <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>{task.rewardPoints} Credits</div>
                                    </td>
                                    <td><span className={`status-pill status-${task.priority}`}>{task.priority.toUpperCase()}</span></td>
                                    <td>
                                        <div style={{ fontSize: '0.85rem' }}>{task.assignedUsers[0]?.name || 'N/A'}</div>
                                    </td>
                                    <td>
                                        <div className={`status-label ${task.status}`}>
                                            {task.status.toUpperCase().replace('_', ' ')}
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{ fontSize: '0.8rem' }}>{task.submissions?.length || 0} Evidence Files</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Initialize Individual Mission">
        <form onSubmit={handleSubmit} className="premium-form">
          <div className="form-group">
            <label>Mission Title</label>
            <input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Operational Guidelines</label>
            <textarea className="form-input" rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          </div>
          
          <div className="grid-2">
            <div className="form-group">
              <label>Priority Tier</label>
              <select className="form-input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="form-group">
              <label>Deadline</label>
              <input type="date" className="form-input" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} required />
            </div>
          </div>

          <div className="form-group">
            <label>Credit Reward</label>
            <input type="number" className="form-input" value={form.rewardPoints} onChange={(e) => setForm({ ...form, rewardPoints: e.target.value })} required />
          </div>

          <div className="form-group">
            <label>Briefing Materials (Attachments)</label>
            <div className="upload-zone">
                <input type="file" multiple onChange={handleFileChange} id="file-upload" style={{ display: 'none' }} />
                <label htmlFor="file-upload" className="upload-label">
                    <Upload size={20} />
                    <span>Upload briefing files, assets, or instructions</span>
                </label>
            </div>
            
            {attachments.length > 0 && (
                <div className="file-preview-list">
                    {attachments.map((file, i) => (
                        <div key={i} className="file-item">
                            <FileText size={14} />
                            <span className="file-name">{file.name}</span>
                            <button type="button" onClick={() => removeAttachment(i)} className="remove-btn"><X size={14} /></button>
                        </div>
                    ))}
                </div>
            )}
          </div>

          <div className="alert-box" style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '12px', borderRadius: '12px', marginBottom: '16px' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--blue-light)', margin: 0 }}>
                <strong>Note:</strong> This mission will be deployed individually to {selectedUsers.length} selected agents.
            </p>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={apiLoading}>
            {apiLoading ? 'Deploying...' : `Deploy to ${selectedUsers.length} Agents`}
          </button>
        </form>
      </Modal>

      <style>{`
        .tag-btn {
            padding: 6px 16px;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.05);
            border-radius: 20px;
            color: var(--gray-400);
            font-size: 0.8rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }
        .tag-btn.active {
            background: var(--blue-gradient);
            color: white;
            border-color: transparent;
            box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
        }
        .premium-table { width: 100%; border-collapse: collapse; }
        .premium-table th { text-align: left; padding: 16px 20px; background: rgba(255,255,255,0.02); font-size: 0.75rem; color: var(--gray-500); text-transform: uppercase; }
        .premium-table td { padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 0.85rem; vertical-align: middle; }
        .selected-row { background: rgba(59, 130, 246, 0.05); }
        .checkbox-custom { width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.1); border-radius: 6px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .checkbox-custom.checked { background: var(--blue-gradient); border-color: transparent; }
        .mini-tag { padding: 2px 8px; background: rgba(255,255,255,0.05); border-radius: 4px; font-size: 0.7rem; color: var(--gray-400); }
        .status-pill { padding: 4px 10px; border-radius: 6px; font-size: 0.7rem; font-weight: 800; }
        .status-low { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .status-medium { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        .status-high { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
        .status-urgent { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
        
        .upload-zone { margin-top: 8px; }
        .upload-label { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 24px; background: rgba(255,255,255,0.02); border: 2px dashed rgba(255,255,255,0.1); border-radius: 12px; cursor: pointer; transition: all 0.2s; }
        .upload-label:hover { background: rgba(255,255,255,0.04); border-color: var(--blue-light); }
        .file-preview-list { margin-top: 12px; display: flex; flex-direction: column; gap: 8px; }
        .file-item { display: flex; alignItems: center; gap: 10px; padding: 10px 14px; background: rgba(255,255,255,0.03); border-radius: 10px; font-size: 0.8rem; }
        .file-name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .remove-btn { background: none; border: none; color: var(--gray-500); cursor: pointer; }
        .remove-btn:hover { color: #ef4444; }
        .status-label.under_review { color: #f59e0b; font-weight: 800; }
        .status-label.completed { color: #10b981; font-weight: 800; }
      `}</style>
    </div>
  );
};

export default AssignmentManagement;
