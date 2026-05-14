import { useState, useEffect, useMemo, useRef } from 'react';
import { useApi } from '../../hooks/useApi';
import toast from 'react-hot-toast';
import { 
  Search, Users, Target, Calendar, Award, Send, 
  Trash2, Clock, CheckCircle, AlertCircle, 
  Upload, FileText, X, CheckSquare, Square, RefreshCcw,
  Zap, ChevronRight, UserPlus, Layers, List, Plus
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
  const [showHistory, setShowHistory] = useState(false);

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

  const searchResults = useMemo(() => {
    const isSearchEmpty = !searchQuery.trim();
    const hasSelectedSkills = selectedSkills.length > 0;

    if (isSearchEmpty && !hasSelectedSkills) {
      return { skills: allSkills.slice(0, 12), users: [] };
    }

    const filteredSkills = allSkills.filter(s => 
        s.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredUsers = users.filter(user => {
      const matchesText = isSearchEmpty || 
                          user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          user.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesSkills = !hasSelectedSkills || 
                            selectedSkills.some(skill => user.skills?.includes(skill));
      
      return matchesText && matchesSkills;
    });

    return { skills: filteredSkills, users: filteredUsers };
  }, [users, searchQuery, selectedSkills, allSkills]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedUsers.length === 0) return toast.error('No agents targeted');
    
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
        toast.success('Missions Deployed');
        setForm({ title: '', description: '', priority: 'medium', deadline: '', rewardPoints: 50 });
        setAttachments([]);
        setSelectedUsers([]);
        fetchData();
      }
    } catch (err) {
      toast.error('Deployment failed');
    }
  };

  if (loading) return <div className="loading-state">Syncing Command Center...</div>;

  return (
    <div className="search-mission-control fade-in">
      <div className="command-header flex-between">
        <div>
            <h2 className="title">Mission Dispatch</h2>
            <p className="subtitle">Search, target, and deploy missions instantly.</p>
        </div>
        <button className={`btn-history ${showHistory ? 'active' : ''}`} onClick={() => setShowHistory(!showHistory)}>
            <List size={18} /> {showHistory ? 'Hide Logs' : 'View History'}
        </button>
      </div>

      <div className="search-section-wrap">
        <div className="glass-panel main-search-bar">
            <Search size={24} className="search-icon" />
            <input 
                type="text" 
                placeholder="Search by name, expertise, or email..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
            />
            {selectedUsers.length > 0 && (
                <div className="selection-counter slide-right">
                    {selectedUsers.length} Targets Locked
                </div>
            )}
        </div>

        {/* Quick Filters / Tags */}
        <div className="active-filters">
            {selectedSkills.map(skill => (
                <span key={skill} className="filter-tag">
                    {skill} <X size={14} onClick={() => toggleSkill(skill)} />
                </span>
            ))}
            {selectedSkills.length > 0 && (
                <button className="clear-all" onClick={() => setSelectedSkills([])}>Clear All</button>
            )}
        </div>
      </div>

      <div className="discovery-results grid-layout">
        <div className="results-main">
            {/* Related Expertise */}
            {(searchResults.skills.length > 0 && !showHistory) && (
                <section className="results-group">
                    <h4 className="group-label"><Layers size={14} /> Related Expertise</h4>
                    <div className="skills-grid">
                        {searchResults.skills.map(skill => (
                            <button 
                                key={skill} 
                                className={`skill-card ${selectedSkills.includes(skill) ? 'active' : ''}`}
                                onClick={() => toggleSkill(skill)}
                            >
                                {skill}
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* Targeted Agents */}
            {!showHistory && (
                <section className="results-group">
                    <div className="flex-between" style={{ marginBottom: '20px' }}>
                        <h4 className="group-label" style={{ margin: 0 }}><Users size={14} /> Matching Units</h4>
                        {searchResults.users.length > 0 && (
                            <button className="btn-text-action" onClick={() => {
                                const allIds = searchResults.users.map(u => u._id);
                                setSelectedUsers([...new Set([...selectedUsers, ...allIds])]);
                            }}>
                                <CheckSquare size={14} /> Select All Results
                            </button>
                        )}
                    </div>
                    <div className="agents-list">
                        {searchResults.users.length === 0 ? (
                            <div className="empty-results">
                                {searchQuery ? (
                                    <>
                                        <AlertCircle size={32} style={{ opacity: 0.2, marginBottom: '12px' }} />
                                        <p>No matching agents in this sector</p>
                                    </>
                                ) : (
                                    <div className="registry-discovery">
                                        <p style={{ opacity: 0.5, marginBottom: '24px' }}>System in standby. Enter credentials or select expertise to discover units.</p>
                                        <div className="quick-stats">
                                            <div className="q-stat">
                                                <span className="q-val">{users.length}</span>
                                                <span className="q-lbl">Total Units</span>
                                            </div>
                                            <div className="q-stat">
                                                <span className="q-val">{categories.length}</span>
                                                <span className="q-lbl">Expertise Hubs</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            searchResults.users.map(user => (
                                <div 
                                    key={user._id} 
                                    className={`agent-row ${selectedUsers.includes(user._id) ? 'selected' : ''}`}
                                    onClick={() => toggleUserSelection(user._id)}
                                >
                                    <div className="agent-avatar">{user.name.charAt(0)}</div>
                                    <div className="agent-info">
                                        <div className="name">{user.name}</div>
                                        <div className="skills-inline">{user.skills?.join(' • ')}</div>
                                    </div>
                                    <div className="agent-stats">
                                        <div className="points">{user.points} CR</div>
                                    </div>
                                    <div className="select-indicator">
                                        {selectedUsers.includes(user._id) ? <CheckCircle size={20} fill="var(--blue)" stroke="white" /> : <Plus size={20} />}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            )}

            {showHistory && (
                <section className="results-group fade-in">
                    <h4 className="group-label"><Clock size={14} /> Mission Deployment History</h4>
                    <div className="history-list glass-panel">
                        {tasks.map(t => (
                            <div key={t._id} className="history-item">
                                <div className="h-info">
                                    <div className="h-title">{t.title}</div>
                                    <div className="h-meta">{t.assignedUsers[0]?.name} • {new Date(t.createdAt).toLocaleDateString()}</div>
                                </div>
                                <div className={`h-status ${t.status}`}>{t.status.toUpperCase()}</div>
                                <div className="h-points">+{t.rewardPoints}</div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>

        {/* Dispatch Panel - Only visible when users selected */}
        <div className={`dispatch-panel ${selectedUsers.length > 0 ? 'visible' : ''}`}>
            <div className="glass-panel dispatch-form-container">
                <div className="form-header">
                    <Zap size={20} className="zap-icon" />
                    <span>Deployment Protocol</span>
                </div>
                
                <form onSubmit={handleSubmit} className="dispatch-form">
                    <input 
                        className="form-input minimal" 
                        placeholder="Mission Title..."
                        value={form.title} 
                        onChange={(e) => setForm({ ...form, title: e.target.value })} 
                    />
                    <textarea 
                        className="form-input minimal" 
                        rows="4" 
                        placeholder="Operational Briefing..."
                        value={form.description} 
                        onChange={(e) => setForm({ ...form, description: e.target.value })} 
                    />
                    
                    <div className="dispatch-row">
                        <select className="form-input minimal" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                            <option value="low">Standard Priority</option>
                            <option value="medium">Important</option>
                            <option value="high">Critical</option>
                        </select>
                        <input type="date" className="form-input minimal" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
                    </div>

                    <div className="points-input-wrap">
                        <Award size={18} />
                        <input type="number" placeholder="Credits" value={form.rewardPoints} onChange={(e) => setForm({ ...form, rewardPoints: e.target.value })} />
                    </div>

                    <div className="dispatch-upload">
                        <input type="file" multiple onChange={handleFileChange} id="file-dispatch" style={{ display: 'none' }} />
                        <label htmlFor="file-dispatch">
                            <Upload size={16} /> {attachments.length > 0 ? `${attachments.length} Files Attached` : 'Attach Intel'}
                        </label>
                    </div>

                    <button className="btn-deploy" disabled={apiLoading}>
                        {apiLoading ? 'BROADCASTING...' : `DEPLOY TO ${selectedUsers.length} AGENTS`}
                    </button>
                    
                    <button type="button" className="btn-cancel" onClick={() => setSelectedUsers([])}>Cancel Deployment</button>
                </form>
            </div>
        </div>
      </div>

      <style>{`
        .search-mission-control { padding: 10px; }
        .command-header { margin-bottom: 40px; }
        .title { font-size: 2.2rem; font-weight: 900; margin: 0; background: var(--blue-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .subtitle { color: var(--gray-500); font-weight: 600; margin-top: 4px; }
        
        .btn-history { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; color: var(--gray-400); font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .btn-history.active { background: var(--blue); color: white; border-color: transparent; }
        .btn-text-action { background: none; border: none; color: var(--blue-light); font-size: 0.75rem; font-weight: 800; display: flex; align-items: center; gap: 6px; cursor: pointer; opacity: 0.7; transition: opacity 0.2s; text-transform: uppercase; }
        .btn-text-action:hover { opacity: 1; }

        .search-section-wrap { margin-bottom: 40px; }
        .main-search-bar { display: flex; align-items: center; padding: 0 32px; height: 80px; border-radius: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
        .search-icon { color: var(--blue); margin-right: 24px; }
        .main-search-bar input { flex: 1; background: none; border: none; font-size: 1.4rem; font-weight: 700; color: white; outline: none; }
        .main-search-bar input::placeholder { color: var(--gray-600); }
        
        .selection-counter { padding: 8px 16px; background: var(--blue-gradient); border-radius: 12px; font-size: 0.85rem; font-weight: 800; color: white; }

        .active-filters { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; min-height: 32px; }
        .filter-tag { display: flex; align-items: center; gap: 8px; padding: 6px 14px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 10px; font-size: 0.8rem; font-weight: 700; color: var(--blue-light); }
        .filter-tag svg { cursor: pointer; opacity: 0.6; }
        .clear-all { background: none; border: none; color: var(--gray-500); font-size: 0.8rem; font-weight: 700; cursor: pointer; }

        .grid-layout { display: grid; grid-template-columns: 1fr; gap: 40px; }
        @media (min-width: 1200px) { .grid-layout { grid-template-columns: 1fr 400px; } }

        .group-label { display: flex; align-items: center; gap: 8px; font-size: 0.75rem; font-weight: 800; color: var(--gray-500); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 20px; }
        
        .skills-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 40px; }
        .skill-card { padding: 12px 24px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 14px; color: var(--gray-400); font-size: 0.9rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .skill-card:hover { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.1); transform: translateY(-2px); }
        .skill-card.active { background: var(--blue-gradient); color: white; border-color: transparent; }

        .agents-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 16px; }
        .agent-row { display: flex; align-items: center; gap: 16px; padding: 20px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 20px; cursor: pointer; transition: all 0.2s; position: relative; }
        .agent-row:hover { background: rgba(255,255,255,0.04); transform: scale(1.02); }
        .agent-row.selected { background: rgba(59, 130, 246, 0.05); border-color: rgba(59, 130, 246, 0.3); }
        
        .agent-avatar { width: 44px; height: 44px; background: var(--blue-gradient); border-radius: 14px; display: flex; align-items: center; justify-content: center; font-weight: 900; color: white; }
        .agent-info { flex: 1; }
        .agent-info .name { font-weight: 800; font-size: 1rem; color: white; }
        .agent-info .skills-inline { font-size: 0.75rem; color: var(--gray-500); margin-top: 2px; }
        .agent-stats .points { font-weight: 900; color: var(--green); font-size: 0.9rem; }
        
        .empty-results { padding: 80px 40px; text-align: center; color: var(--gray-600); font-weight: 600; border: 2px dashed rgba(255,255,255,0.05); border-radius: 30px; grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; }
        .registry-discovery { max-width: 400px; }
        .quick-stats { display: flex; justify-content: center; gap: 40px; margin-top: 20px; }
        .q-stat { display: flex; flex-direction: column; align-items: center; }
        .q-val { font-size: 1.5rem; font-weight: 900; color: white; }
        .q-lbl { font-size: 0.65rem; font-weight: 800; color: var(--gray-500); text-transform: uppercase; margin-top: 4px; }

        .dispatch-panel { opacity: 0; pointer-events: none; transform: translateX(20px); transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
        .dispatch-panel.visible { opacity: 1; pointer-events: auto; transform: translateX(0); }
        .dispatch-form-container { position: sticky; top: 24px; padding: 0; overflow: hidden; }
        .form-header { display: flex; align-items: center; gap: 12px; padding: 20px 24px; background: rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.05); font-weight: 800; font-size: 0.9rem; text-transform: uppercase; color: var(--gray-400); }
        .zap-icon { color: var(--blue); }
        
        .dispatch-form { padding: 24px; display: flex; flexDirection: column; gap: 16px; }
        .minimal { background: rgba(0,0,0,0.2) !important; border: 1px solid rgba(255,255,255,0.05) !important; border-radius: 12px !important; padding: 14px !important; font-size: 0.9rem !important; }
        .minimal:focus { border-color: var(--blue) !important; }
        
        .dispatch-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .points-input-wrap { display: flex; align-items: center; gap: 12px; padding: 14px; background: rgba(16, 185, 129, 0.05); border-radius: 12px; color: var(--green); }
        .points-input-wrap input { background: none; border: none; font-weight: 900; color: var(--green); outline: none; width: 100%; }
        
        .dispatch-upload label { display: flex; align-items: center; gap: 8px; padding: 12px; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1); border-radius: 10px; font-size: 0.75rem; font-weight: 700; color: var(--gray-500); cursor: pointer; }
        .dispatch-upload label:hover { border-color: var(--blue); color: white; }

        .btn-deploy { height: 56px; background: var(--blue-gradient); border: none; border-radius: 14px; color: white; font-weight: 900; cursor: pointer; box-shadow: 0 10px 30px rgba(59, 130, 246, 0.3); transition: all 0.2s; }
        .btn-deploy:hover { transform: translateY(-2px); box-shadow: 0 15px 40px rgba(59, 130, 246, 0.4); }
        .btn-cancel { background: none; border: none; color: var(--gray-600); font-weight: 700; cursor: pointer; font-size: 0.85rem; }

        .history-list { padding: 0; }
        .history-item { display: flex; align-items: center; gap: 16px; padding: 16px 24px; border-bottom: 1px solid rgba(255,255,255,0.03); }
        .h-info { flex: 1; }
        .h-title { font-weight: 700; font-size: 0.9rem; }
        .h-meta { font-size: 0.7rem; color: var(--gray-500); margin-top: 2px; }
        .h-status { font-size: 0.65rem; font-weight: 900; padding: 4px 8px; border-radius: 4px; }
        .h-status.under_review { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
        .h-status.completed { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .h-points { font-weight: 900; color: var(--green); font-size: 0.85rem; }
      `}</style>
    </div>
  );
};

export default AssignmentManagement;

