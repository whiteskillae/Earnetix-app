import { CheckCircle, XCircle, Eye, Search, Filter, CheckSquare, Square, Trash2 } from 'lucide-react';
import { useState } from 'react';

const SubmissionReview = ({ 
  submissions, filter, setFilter, subType, setSubType, 
  onApprove, onReject, onPreview, 
  onBulkApprove, onBulkReject 
}) => {
  const [selectedIds, setSelectedIds] = useState([]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === submissions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(submissions.map(s => s._id));
    }
  };

  const handleBulkApproveClick = () => {
    if (selectedIds.length === 0) return;
    onBulkApprove(selectedIds);
    setSelectedIds([]);
  };

  const handleBulkRejectClick = () => {
    if (selectedIds.length === 0) return;
    onBulkReject(selectedIds);
    setSelectedIds([]);
  };

  return (
    <div className="glass-panel">
      <div className="view-filters" style={{ flexWrap: 'wrap', gap: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="filter-group">
            {['public', 'individual'].map(t => (
              <button 
                key={t} 
                className={subType === t ? 'active' : ''} 
                style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => { setSubType(t); setSelectedIds([]); }}
              >
                {t === 'public' ? 'Public' : 'Individual'}
              </button>
            ))}
          </div>

          <div className="filter-group">
            {['pending', 'approved', 'rejected'].map(f => (
              <button 
                key={f} 
                className={filter === f ? 'active' : ''} 
                onClick={() => { setFilter(f); setSelectedIds([]); }}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {selectedIds.length > 0 && filter === 'pending' && (
            <>
              <button className="btn btn-success" onClick={handleBulkApproveClick} style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                <CheckCircle size={14} /> Bulk Approve ({selectedIds.length})
              </button>
              <button className="btn btn-danger" onClick={handleBulkRejectClick} style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                <XCircle size={14} /> Bulk Reject
              </button>
            </>
          )}
        </div>
      </div>

      <div className="table-wrapper" style={{ border: 'none', background: 'transparent' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <button onClick={selectAll} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
                  {selectedIds.length === submissions.length && submissions.length > 0 ? <CheckSquare size={18} color="var(--blue)" /> : <Square size={18} />}
                </button>
              </th>
              <th>Contributor</th>
              <th>Task Objective</th>
              <th>Value</th>
              <th>Timestamp</th>
              <th>Status</th>
              <th className="text-right">Verification</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map(s => {
              const name = s.userId?.name || 'Deleted User';
              const email = s.userId?.email || '';
              const title = s.taskId?.title || 'Unknown Task';
              const points = `+${s.taskId?.rewardPoints || 0}`;
              const status = s.status;
              const date = new Date(s.createdAt).toLocaleString();

              return (
                <tr key={s._id} className="fade-in" style={{ background: selectedIds.includes(s._id) ? 'rgba(59, 130, 246, 0.05)' : 'transparent' }}>
                  <td>
                    <button onClick={() => toggleSelect(s._id)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
                      {selectedIds.includes(s._id) ? <CheckSquare size={18} color="var(--blue)" /> : <Square size={18} />}
                    </button>
                  </td>
                  <td>
                    <div className="user-info-cell">
                      <span className="user-name">{name}</span>
                      <span className="user-email">{email}</span>
                    </div>
                  </td>
                  <td>
                     <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{title}</div>
                  </td>
                  <td>
                     <span className="points-badge">{points}</span>
                  </td>
                  <td>
                     <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                       {date}
                     </div>
                  </td>
                  <td>
                    <span className={`status-pill ${status}`} style={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 800 }}>
                      {status}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex-gap" style={{ justifyContent: 'flex-end' }}>
                        <>
                          <button className="btn-icon" onClick={() => onPreview(s)} title="Inspect Proof">
                            <Eye size={16} />
                          </button>
                          {s.status === 'pending' && (
                            <>
                              <button className="btn-icon success" onClick={() => onApprove(s._id)} title="Verify">
                                <CheckCircle size={16} />
                              </button>
                              <button className="btn-icon danger" onClick={() => onReject(s._id)} title="Invalidate">
                                <XCircle size={16} />
                              </button>
                            </>
                          )}
                        </>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {submissions.length === 0 && (
          <div className="text-center" style={{ padding: '60px', color: '#64748b' }}>
            <div style={{ opacity: 0.1, marginBottom: '16px' }}><Search size={48} style={{ margin: '0 auto' }} /></div>
            <p>No submissions found for the selected filter.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubmissionReview;
