import { Search, Eye, Zap, Clock, Filter, Target } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';

const UserManagement = ({ users, onToggleBlock, onBlockTemp, onAdjustPoints, onViewDetails }) => {
  const { request } = useApi();
  const [searchTerm, setSearchTerm] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      const res = await request('get', '/skill-categories');
      if (res.success) setCategories(res.data);
    };
    fetchCategories();
  }, []);

  const allSkills = categories.flatMap(c => c.skills);

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSkill = !skillFilter || u.skills?.includes(skillFilter);
    return matchesSearch && matchesSkill;
  });

  const isTempBlocked = (user) => {
    return user.blockedUntil && new Date(user.blockedUntil) > new Date();
  };

  return (
    <div className="glass-panel">
      <div className="view-filters" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <h3 style={{ margin: 0, minWidth: '200px' }}>User Intelligence Directory</h3>
        
        <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '300px' }}>
          <div className="search-box" style={{ flex: 1 }}>
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Search by name, email or IP..." 
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
      </div>

      <div className="table-wrapper" style={{ border: 'none', background: 'transparent' }}>
        <table className="admin-table">
          <thead>
            <tr>
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
              <tr key={u._id} className="fade-in">
                <td>
                  <div className="user-info-cell">
                    <span className="user-name">{u.name}</span>
                    <span className="user-email">{u.email}</span>
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
