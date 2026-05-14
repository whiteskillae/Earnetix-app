import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import Modal from '../common/Modal';
import toast from 'react-hot-toast';
import Select from 'react-select';
import { Plus, Users, Target, Calendar, Award, Send, Trash2, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const AssignmentManagement = () => {
  const { request } = useApi();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    deadline: '',
    rewardPoints: 50,
    assignedUsers: [],
    requiredSkills: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tRes, uRes, cRes] = await Promise.all([
        request('get', '/assigned-tasks'),
        request('get', '/admin/users?limit=500'),
        request('get', '/skill-categories')
      ]);
      if (tRes.success) setTasks(tRes.data);
      if (uRes.success) setUsers(uRes.data.users);
      if (cRes.success) setCategories(cRes.data);
    } catch (err) {
      toast.error('Failed to load assignment data');
    } finally {
      setLoading(false);
    }
  };

  const skillOptions = categories.flatMap(cat => 
    cat.skills.map(skill => ({ label: skill, value: skill }))
  );

  const userOptions = users.map(u => ({ label: `${u.name} (${u.email})`, value: u._id }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.assignedUsers.length === 0 && form.requiredSkills.length === 0) {
      return toast.error('Assign to specific users or select required skills');
    }

    try {
      const res = await request('post', '/assigned-tasks', {
        ...form,
        assignedUsers: form.assignedUsers.map(u => u.value),
        requiredSkills: form.requiredSkills.map(s => s.value)
      });
      if (res.success) {
        toast.success('Task Assigned Successfully');
        setShowModal(false);
        setForm({ title: '', description: '', priority: 'medium', deadline: '', rewardPoints: 50, assignedUsers: [], requiredSkills: [] });
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Assignment failed');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'overdue': return '#ef4444';
      case 'in_progress': return '#3b82f6';
      default: return '#f59e0b';
    }
  };

  const selectStyles = {
    control: (base) => ({
      ...base,
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '12px',
      color: 'white',
      minHeight: '45px'
    }),
    menu: (base) => ({ ...base, background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)' }),
    option: (base, state) => ({
      ...base,
      background: state.isFocused ? 'var(--blue-gradient)' : 'transparent',
      color: 'white',
      cursor: 'pointer'
    }),
    multiValue: (base) => ({ ...base, background: 'rgba(59, 130, 246, 0.2)', borderRadius: '6px' }),
    multiValueLabel: (base) => ({ ...base, color: 'var(--blue-light)' }),
    input: (base) => ({ ...base, color: 'white' }),
    placeholder: (base) => ({ ...base, color: 'rgba(255,255,255,0.3)' })
  };

  if (loading) return <div className="glass-panel" style={{ textAlign: 'center', padding: '40px' }}>Loading Mission Control...</div>;

  return (
    <div className="assignment-management fade-in">
      <div className="flex-between" style={{ marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Mission Control</h2>
          <p style={{ color: 'var(--gray-400)', fontSize: '0.9rem' }}>Direct task assignment to expert agents</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Send size={18} /> Deploy Mission
        </button>
      </div>

      <div className="tasks-grid">
        {tasks.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '60px' }}>
            <Target size={48} style={{ opacity: 0.2, margin: '0 auto 20px' }} />
            <p style={{ color: 'var(--gray-500)' }}>No active direct assignments</p>
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Mission</th>
                  <th>Priority</th>
                  <th>Assigned To</th>
                  <th>Deadline</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <tr key={task._id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{task.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{task.rewardPoints} PTS</div>
                    </td>
                    <td>
                      <span className={`status-pill status-${task.priority}`}>{task.priority.toUpperCase()}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={14} style={{ opacity: 0.5 }} />
                        <span>{task.assignedUsers.length} Agents</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                        <Clock size={14} style={{ opacity: 0.5 }} />
                        {new Date(task.deadline).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: getStatusColor(task.status), fontWeight: 800, fontSize: '0.85rem' }}>
                        {task.status === 'completed' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                        {task.status.toUpperCase().replace('_', ' ')}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Initialize Direct Mission">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Mission Title</label>
            <input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Operational Briefing</label>
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
            <label>Auto-Assign by Expertise (Category Match)</label>
            <Select
              isMulti
              options={skillOptions}
              value={form.requiredSkills}
              onChange={val => setForm({ ...form, requiredSkills: val })}
              styles={selectStyles}
              placeholder="Select skill categories..."
            />
          </div>

          <div className="form-group">
            <label>Manual Agent Selection (Direct Overwrite)</label>
            <Select
              isMulti
              options={userOptions}
              value={form.assignedUsers}
              onChange={val => setForm({ ...form, assignedUsers: val })}
              styles={selectStyles}
              placeholder="Search by name or email..."
            />
          </div>

          <div className="form-group">
            <label>Mission Reward (Credits)</label>
            <input type="number" className="form-input" value={form.rewardPoints} onChange={(e) => setForm({ ...form, rewardPoints: e.target.value })} required />
          </div>

          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '16px' }}>
            <Send size={18} /> Authorize & Deploy Mission
          </button>
        </form>
      </Modal>

      <style>{`
        .premium-table {
          width: 100%;
          border-collapse: collapse;
        }
        .premium-table th {
          text-align: left;
          padding: 16px 24px;
          background: rgba(255,255,255,0.02);
          font-size: 0.75rem;
          text-transform: uppercase;
          color: var(--gray-500);
          letter-spacing: 1px;
        }
        .premium-table td {
          padding: 16px 24px;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          font-size: 0.9rem;
        }
        .status-pill {
          padding: 4px 12px;
          border-radius: 8px;
          font-size: 0.7rem;
          font-weight: 800;
        }
        .status-low { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .status-medium { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        .status-high { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
        .status-urgent { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
      `}</style>
    </div>
  );
};

export default AssignmentManagement;
