import { Search, Eye, Zap, Clock, Filter, Target, CheckSquare, Square, Trash2, Ban } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';

const UserManagement = ({ users, onToggleBlock, onBlockTemp, onAdjustPoints, onViewDetails, onBulkBlock }) => {
  const { request } = useApi();
  const [searchTerm, setSearchTerm] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      const res = await request('get', '/skill-categories');
      if (res.success) setCategories(res.data);
    };
    fetchCategories();
  }, []);

  const allSkills = categories.flatMap(c => c.skills);

  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const filteredUsers = users.filter(u => {
    const term = debouncedSearch.toLowerCase().trim();
    const matchesSearch = !term || 
                          (u.name && u.name.toLowerCase().includes(term)) || 
                          (u.email && u.email.toLowerCase().includes(term)) ||
                          (u.username && u.username.toLowerCase().includes(term)) ||
                          (u.uid && u.uid.toLowerCase().includes(term));
    const matchesSkill = !skillFilter || u.skills?.includes(skillFilter);
    return matchesSearch && matchesSkill;
  });

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === filteredUsers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredUsers.map(u => u._id));
    }
  };

  const isTempBlocked = (user) => {
    return user.blockedUntil && new Date(user.blockedUntil) > new Date();
  };

  return (
    <div className="glass-panel">
      <div className="view-filters" style={{ flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <h3 style={{ margin: 0, minWidth: '200px' }}>User Directory</h3>
        
        <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '300px' }}>
          <div className="search-box" style={{ flex: 1 }}>
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Search agents..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>

          <div className="search-box" style={{ width: '200px', padding: '0 12px' }}>
            <Target size={18} />
            <select 
              value={skillFilter} 
              onChange={(e) => setSkillFilter(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none', cursor: 'pointer' }}
            >
              <option value="" style={{ background: '#1a1a2e' }}>All Expertise</option>
              {allSkills.map(s => (
                <option key={s} value={s} style={{ background: '#1a1a2e' }}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {selectedIds.length > 0 && (
          <button className="btn btn-danger" onClick={() => onBulkBlock(selectedIds)} style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
            <Ban size={14} /> Bulk Ban ({selectedIds.length})
          </button>
        )}
      </div>

      <div className="table-wrapper" style={{ border: 'none', background: 'transparent' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <button onClick={selectAll} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
                  {selectedIds.length === filteredUsers.length && filteredUsers.length > 0 ? <CheckSquare size={18} color="var(--blue)" /> : <Square size={18} />}
                </button>
              </th>
              <th>Identity</th>
              <th>Wallet</th>
              <th>Status</th>
              <th>Protection</th>
              <th>Last Login</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(u => (
              <tr key={u._id} className="fade-in" style={{ background: selectedIds.includes(u._id) ? 'rgba(59, 130, 246, 0.05)' : 'transparent' }}>
                <td>
                  <button onClick={() => toggleSelect(u._id)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
                    {selectedIds.includes(u._id) ? <CheckSquare size={18} color="var(--blue)" /> : <Square size={18} />}
                  </button>
                </td>
                <td>
                  <div className="user-info-cell">
                    <span className="user-name" style={{ color: 'var(--blue-light)', fontWeight: 800, fontSize: '1rem' }}>@{u.username || 'pending'}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '2px 0' }}>
                      <span style={{ color: 'white', fontWeight: 700, fontSize: '0.85rem' }}>{u.name}</span>
                    </div>
                    <span className="user-email" style={{ fontSize: '0.75rem', opacity: 0.6 }}>{u.email}</span>
                  </div>
                </td>
                <td>
                   <span className="points-badge">+{u.points}</span>
                </td>
                <td>
                  {u.isBlocked ? (
                    <span className="status-pill rejected" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>PERMANENT BAN</span>
                  ) : isTempBlocked(u) ? (
                    <div className="block-badge-temp">
                      <Clock size={12} style={{ marginRight: '6px' }} />
                      TEMP BLOCKED
                    </div>
                  ) : (
                    <span className="status-pill approved" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>VERIFIED ACTIVE</span>
                  )}
                </td>
                <td>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    IP: {u.registrationIp || '127.0.0.1'}
                  </div>
                </td>
                <td>
                   <span style={{ fontSize: '0.85rem' }}>{new Date(u.createdAt).toLocaleDateString()}</span>
                </td>
                <td className="text-right">
                  <div className="flex-gap" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn-icon" title="Audit User" onClick={() => onViewDetails(u)}>
                      <Eye size={16} />
                    </button>
                    
                    <button className="btn-icon" onClick={() => onAdjustPoints(u)} title="Adjust Credits">
                      <Zap size={16} color="#f59e0b" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;
