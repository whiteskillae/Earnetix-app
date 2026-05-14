import { CheckCircle, XCircle, Eye, Search, Filter } from 'lucide-react';
import { useState } from 'react';

const SubmissionReview = ({ submissions, filter, setFilter, subType, setSubType, onApprove, onReject, onPreview }) => {
  return (
    <div className="glass-panel">
      <div className="view-filters" style={{ flexWrap: 'wrap', gap: '20px' }}>
        <div className="filter-group">
          {['public', 'individual'].map(t => (
            <button 
              key={t} 
              className={subType === t ? 'active' : ''} 
              style={{ padding: '8px 20px' }}
              onClick={() => setSubType(t)}
            >
              {t === 'public' ? 'Public Campaigns' : 'Individual Missions'}
            </button>
          ))}
        </div>

        <div className="filter-group">
          {['pending', 'approved', 'rejected'].map(f => (
            <button 
              key={f} 
              className={filter === f ? 'active' : ''} 
              onClick={() => setFilter(f)}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="table-wrapper" style={{ border: 'none', background: 'transparent' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Contributor</th>
              <th>Task Objective</th>
              <th>Value</th>
              <th>Timestamp</th>
              <th>Status</th>
              <th className="text-right">Verification</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map(s => (
              <tr key={s._id} className="fade-in">
                <td>
                  <div className="user-info-cell">
                    <span className="user-name">{s.userId?.name || 'Deleted User'}</span>
                    <span className="user-email">{s.userId?.email}</span>
                  </div>
                </td>
                <td>
                   <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.taskId?.title || 'Unknown Task'}</div>
                </td>
                <td>
                   <span className="points-badge">+{s.taskId?.rewardPoints || 0}</span>
                </td>
                <td>
                   <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                     {new Date(s.createdAt).toLocaleString()}
                   </div>
                </td>
                <td>
                  <span className={`status-pill ${s.status}`} style={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 800 }}>
                    {s.status}
                  </span>
                </td>
                <td className="text-right">
                  <div className="flex-gap" style={{ justifyContent: 'flex-end' }}>
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
                  </div>
                </td>
              </tr>
            ))}
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
