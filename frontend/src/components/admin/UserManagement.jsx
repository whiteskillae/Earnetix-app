import { Search, Eye, Zap, ShieldAlert, ShieldCheck, Clock, MoreVertical } from 'lucide-react';
import { useState } from 'react';

const UserManagement = ({ users, onToggleBlock, onBlockTemp, onAdjustPoints, onViewDetails }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isTempBlocked = (user) => {
    return user.blockedUntil && new Date(user.blockedUntil) > new Date();
  };

  return (
    <div className="glass-panel">
      <div className="view-filters">
        <h3 style={{ margin: 0 }}>User Intelligence Directory</h3>
        <div className="search-box" style={{ flex: 0.6 }}>
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search by name, email or IP..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
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
                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="points-badge">+{u.points}</span>
                      <button className="btn-icon" onClick={() => onAdjustPoints(u)} style={{ width: '28px', height: '28px' }}>
                        <Zap size={12} color="#f59e0b" />
                      </button>
                   </div>
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
                    
                    <div className="flex-gap">
                       {!u.isBlocked && !isTempBlocked(u) && (
                         <button 
                           className="btn btn-sm btn-outline" 
                           style={{ padding: '6px 12px', fontSize: '0.7rem', borderColor: 'rgba(245, 158, 11, 0.3)' }}
                           onClick={() => onBlockTemp(u._id)}
                         >
                           24H BLOCK
                         </button>
                       )}
                       
                       <button 
                         className={`btn btn-sm ${u.isBlocked ? 'btn-success' : 'btn-danger'}`}
                         style={{ padding: '6px 12px', fontSize: '0.7rem' }}
                         onClick={() => onToggleBlock(u._id)}
                       >
                         {u.isBlocked ? 'REVOKE BAN' : 'BAN USER'}
                       </button>
                    </div>
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
