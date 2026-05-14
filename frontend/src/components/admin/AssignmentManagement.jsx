import { useState, useEffect, useMemo } from 'react';
import { useApi } from '../../hooks/useApi';
import Modal from '../common/Modal';
import toast from 'react-hot-toast';
import { 
  Plus, Users, Target, Calendar, Award, Send, 
  Trash2, Clock, CheckCircle, AlertCircle, 
  Search, Filter, Upload, FileText, X, CheckSquare, Square, RefreshCcw
} from 'lucide-react';

const AssignmentManagement = () => {
  const { request, loading: apiLoading } = useApi();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkills, setSelectedSkills] = useState([]);
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

  const allSkills = useMemo(() => categories.flatMap(cat => cat.skills), [categories]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesQuery = user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           user.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSkills = selectedSkills.length === 0 || 
                            selectedSkills.some(skill => user.skills?.includes(skill));
      return matchesQuery && matchesSkills;
    });
  }, [users, searchQuery, selectedSkills]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setAttachments([...attachments, ...files]);
  };

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const toggleSkill = (skill) => {
    setSelectedSkills(prev => 
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const handleBulkSelect = (type) => {
    if (type === 'all') {
      const allIds = filteredUsers.map(u => u._id);
      setSelectedUsers([...new Set([...selectedUsers, ...allIds])]);
    } else if (type === 'none') {
      setSelectedUsers([]);
    } else if (type === 'invert') {
      const filteredIds = filteredUsers.map(u => u._id);
      const newSelection = filteredIds.filter(id => !selectedUsers.includes(id));
      setSelectedUsers(newSelection);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedUsers.length === 0) return toast.error('Select target agents first');
    if (!form.title || !form.description || !form.deadline) return toast.error('Mission parameters incomplete');

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
        toast.success(res.message || 'Missions Deployed Successfully');
        setForm({ title: '', description: '', priority: 'medium', deadline: '', rewardPoints: 50 });
        setAttachments([]);
        setSelectedUsers([]);
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Mission deployment failed');
    }
  };

  if (loading) return <div className="glass-panel" style={{ textAlign: 'center', padding: '100px 40px' }}>
    <RefreshCcw className="spin" size={48} style={{ opacity: 0.2, marginBottom: '20px' }} />
    <p style={{ color: 'var(--gray-500)', fontSize: '1.1rem', fontWeight: 600 }}>Initializing God-System Control Plane...</p>
  </div>;

  return (
    <div className="god-mission-control fade-in">
      <div className="control-header" style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.02em', margin: 0 }}>Mission Command Center</h2>
        <p style={{ color: 'var(--gray-400)', fontSize: '1rem' }}>Global task orchestration and agent management system</p>
      </div>

      <div className="god-layout">
        {/* Left Section: User Discovery & Selection */}
        <div className="god-main">
          <div className="glass-panel search-filter-bar" style={{ padding: '24px', marginBottom: '24px' }}>
            <div style={{ position: 'relative', marginBottom: '20px' }}>
                <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                <input 
                    className="form-input god-input" 
                    placeholder="Search agents by identity or credentials..." 
                    style={{ paddingLeft: '52px', height: '54px', fontSize: '1rem' }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="expertise-filter">
                <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--gray-500)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filter by Expertise</p>
                <div className="skills-tags scroll-x">
                    <button 
                        className={`god-tag ${selectedSkills.length === 0 ? 'active' : ''}`}
                        onClick={() => setSelectedSkills([])}
                    >
                        All Units
                    </button>
                    {allSkills.map(skill => (
                        <button 
                            key={skill}
                            className={`god-tag ${selectedSkills.includes(skill) ? 'active' : ''}`}
                            onClick={() => toggleSkill(skill)}
                        >
                            {skill}
                        </button>
                    ))}
                </div>
            </div>
          </div>

          <div className="bulk-tools" style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
             <button className="btn btn-sm btn-outline" onClick={() => handleBulkSelect('all')}>
                <CheckSquare size={14} /> Select All Filtered
             </button>
             <button className="btn btn-sm btn-outline" onClick={() => handleBulkSelect('none')}>
                <Square size={14} /> Deselect All
             </button>
             <button className="btn btn-sm btn-outline" onClick={() => handleBulkSelect('invert')}>
                <RefreshCcw size={14} /> Invert Selection
             </button>
             <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--gray-500)', fontWeight: 600 }}>
                {selectedUsers.length} Agents Selected
             </div>
          </div>

          <div className="glass-panel user-list-container" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="god-table">
                <thead>
                    <tr>
                        <th style={{ width: '60px' }}></th>
                        <th>Agent</th>
                        <th>Expertise</th>
                        <th className="text-right">Credits</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredUsers.length === 0 ? (
                        <tr><td colSpan="4" style={{ textAlign: 'center', padding: '60px', opacity: 0.5 }}>System found no matching units</td></tr>
                    ) : (
                        filteredUsers.map(user => (
                            <tr 
                                key={user._id} 
                                className={selectedUsers.includes(user._id) ? 'selected' : ''} 
                                onClick={() => toggleUserSelection(user._id)}
                            >
                                <td className="check-cell">
                                    <div className={`god-checkbox ${selectedUsers.includes(user._id) ? 'checked' : ''}`}>
                                        {selectedUsers.includes(user._id) && <CheckCircle size={14} />}
                                    </div>
                                </td>
                                <td>
                                    <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{user.name}</div>
                                    <div style={{ fontSize: '0.75rem', opacity: 0.4 }}>{user.email}</div>
                                </td>
                                <td>
                                    <div className="flex-gap" style={{ flexWrap: 'wrap', gap: '4px' }}>
                                        {user.skills?.map(s => (
                                            <span key={s} className="god-mini-tag">{s}</span>
                                        ))}
                                    </div>
                                </td>
                                <td className="text-right" style={{ color: 'var(--green)', fontWeight: 900 }}>{user.points}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
          </div>
        </div>

        {/* Right Section: God-System Mission Creator */}
        <div className="god-sidebar">
            <div className="glass-panel sticky-panel mission-creator">
                <div className="panel-header">
                    <Target size={24} style={{ color: 'var(--blue)' }} />
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Mission Engine</h3>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--gray-500)' }}>Configure & Broadcast</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="god-form">
                    <div className="form-group">
                        <label>Mission Objective</label>
                        <input 
                            className="form-input god-input" 
                            placeholder="Operation Title..."
                            value={form.title} 
                            onChange={(e) => setForm({ ...form, title: e.target.value })} 
                        />
                    </div>
                    <div className="form-group">
                        <label>Operational Protocol</label>
                        <textarea 
                            className="form-input god-input" 
                            rows="4" 
                            placeholder="Provide detailed briefing for the agents..."
                            value={form.description} 
                            onChange={(e) => setForm({ ...form, description: e.target.value })} 
                        />
                    </div>
                    
                    <div className="grid-2">
                        <div className="form-group">
                            <label>Priority</label>
                            <select className="form-input god-input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                                <option value="low">Standard</option>
                                <option value="medium">Important</option>
                                <option value="high">Critical</option>
                                <option value="urgent">Immediate</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Deadline</label>
                            <input type="date" className="form-input god-input" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Credit Bounty</label>
                        <div style={{ position: 'relative' }}>
                            <Award size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, color: 'var(--green)' }} />
                            <input type="number" className="form-input god-input" style={{ paddingLeft: '48px' }} value={form.rewardPoints} onChange={(e) => setForm({ ...form, rewardPoints: e.target.value })} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Briefing Intel (Files)</label>
                        <div className="god-upload">
                            <input type="file" multiple onChange={handleFileChange} id="god-file" style={{ display: 'none' }} />
                            <label htmlFor="god-file" className="god-upload-label">
                                <Upload size={20} />
                                <span>Inject Data Packets</span>
                            </label>
                        </div>
                        
                        {attachments.length > 0 && (
                            <div className="god-file-list">
                                {attachments.map((file, i) => (
                                    <div key={i} className="god-file-item">
                                        <FileText size={14} />
                                        <span className="name">{file.name}</span>
                                        <button type="button" onClick={() => removeAttachment(i)} className="remove"><X size={14} /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="god-summary">
                        <div className="flex-between">
                            <span>Target Agents:</span>
                            <span style={{ color: 'var(--blue)', fontWeight: 800 }}>{selectedUsers.length}</span>
                        </div>
                        <div className="flex-between">
                            <span>Total Credit Pool:</span>
                            <span style={{ color: 'var(--green)', fontWeight: 800 }}>{selectedUsers.length * form.rewardPoints} CR</span>
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        className="btn btn-primary btn-block god-deploy-btn" 
                        disabled={apiLoading || selectedUsers.length === 0}
                    >
                        {apiLoading ? 'BROADCASTING...' : (
                            <>
                                <Send size={18} /> INITIALIZE DEPLOYMENT
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
      </div>

      {/* History Section */}
      <div className="god-history" style={{ marginTop: '60px' }}>
        <h3 style={{ fontSize: '1.4rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Clock size={24} /> Mission Logs
        </h3>
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="god-table">
                <thead>
                    <tr>
                        <th>Mission ID</th>
                        <th>Objective</th>
                        <th>Priority</th>
                        <th>Agent</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {tasks.length === 0 ? (
                        <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>No missions logged in the database</td></tr>
                    ) : (
                        tasks.slice(0, 15).map(task => (
                            <tr key={task._id}>
                                <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', opacity: 0.5 }}>#{task._id.slice(-8).toUpperCase()}</td>
                                <td>
                                    <div style={{ fontWeight: 700 }}>{task.title}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--green)', fontWeight: 800 }}>{task.rewardPoints} CR</div>
                                </td>
                                <td><span className={`status-tag tier-${task.priority}`}>{task.priority.toUpperCase()}</span></td>
                                <td>{task.assignedUsers[0]?.name || 'Unknown'}</td>
                                <td>
                                    <div className={`god-status ${task.status}`}>
                                        {task.status.toUpperCase().replace('_', ' ')}
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>

      <style>{`
        .god-layout {
            display: grid;
            grid-template-columns: 1fr 400px;
            gap: 32px;
            align-items: start;
        }
        @media (max-width: 1100px) {
            .god-layout { grid-template-columns: 1fr; }
            .sticky-panel { position: static; }
        }
        .god-tag {
            padding: 8px 20px;
            background: rgba(255,255,255,0.02);
            border: 1px solid rgba(255,255,255,0.05);
            border-radius: 12px;
            color: var(--gray-400);
            font-size: 0.85rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            white-space: nowrap;
        }
        .god-tag.active {
            background: var(--blue-gradient);
            color: white;
            border-color: transparent;
            box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
            transform: translateY(-2px);
        }
        .god-table { width: 100%; border-collapse: collapse; }
        .god-table th { text-align: left; padding: 18px 24px; background: rgba(255,255,255,0.02); font-size: 0.75rem; font-weight: 800; color: var(--gray-500); text-transform: uppercase; letter-spacing: 0.05em; }
        .god-table td { padding: 16px 24px; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 0.9rem; transition: all 0.2s; }
        .god-table tr:hover { background: rgba(255,255,255,0.01); cursor: pointer; }
        .god-table tr.selected { background: rgba(59, 130, 246, 0.05); }
        .god-checkbox { width: 22px; height: 22px; border: 2px solid rgba(255,255,255,0.1); border-radius: 7px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .god-checkbox.checked { background: var(--blue-gradient); border-color: transparent; }
        .god-mini-tag { padding: 2px 8px; background: rgba(59, 130, 246, 0.1); border-radius: 6px; font-size: 0.7rem; color: var(--blue-light); font-weight: 700; }
        
        .sticky-panel { position: sticky; top: 24px; }
        .panel-header { display: flex; alignItems: center; gap: 16px; padding: 24px; border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02); border-radius: 24px 24px 0 0; }
        .god-form { padding: 24px; }
        .god-input { background: rgba(255,255,255,0.03) !important; border: 1px solid rgba(255,255,255,0.07) !important; border-radius: 14px !important; }
        .god-input:focus { border-color: var(--blue) !important; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1) !important; }
        
        .god-upload-label { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 20px; background: rgba(255,255,255,0.01); border: 2px dashed rgba(255,255,255,0.05); border-radius: 16px; cursor: pointer; transition: all 0.2s; font-size: 0.85rem; font-weight: 700; color: var(--gray-400); }
        .god-upload-label:hover { border-color: var(--blue); background: rgba(59, 130, 246, 0.03); color: var(--white); }
        
        .god-file-list { margin-top: 12px; display: flex; flex-direction: column; gap: 8px; }
        .god-file-item { display: flex; alignItems: center; gap: 10px; padding: 10px 14px; background: rgba(0,0,0,0.2); border-radius: 10px; font-size: 0.8rem; }
        .god-file-item .name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .god-file-item .remove { background: none; border: none; color: #ef4444; cursor: pointer; }
        
        .god-summary { margin: 24px 0; padding: 16px; background: rgba(255,255,255,0.02); border-radius: 14px; display: flex; flexDirection: column; gap: 10px; font-size: 0.85rem; color: var(--gray-400); }
        .god-deploy-btn { height: 56px; border-radius: 14px; font-weight: 800; letter-spacing: 0.02em; font-size: 0.95rem; box-shadow: 0 10px 25px rgba(59, 130, 246, 0.25); }
        
        .status-tag { padding: 4px 10px; border-radius: 6px; font-size: 0.65rem; font-weight: 900; }
        .tier-low { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .tier-medium { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        .tier-high { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
        .tier-urgent { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
        .god-status.under_review { color: #f59e0b; font-weight: 900; font-size: 0.75rem; }
        .god-status.completed { color: #10b981; font-weight: 900; font-size: 0.75rem; }
      `}</style>
    </div>
  );
};

export default AssignmentManagement;
