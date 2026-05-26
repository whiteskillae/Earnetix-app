import { CheckCircle, XCircle, Eye, Search, Filter, CheckSquare, Square, Trash2, BookOpen } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import toast from 'react-hot-toast';

const SubmissionReview = ({ 
  submissions, filter, setFilter, subType, setSubType, 
  onApprove, onReject, onPreview, 
  onBulkApprove, onBulkReject 
}) => {
  const [selectedIds, setSelectedIds] = useState([]);
  const { request } = useApi();
  const [blogSubmissions, setBlogSubmissions] = useState([]);
  const [blogFilter, setBlogFilter] = useState('pending');

  // Fetch blog submissions when in blogs subtype
  useEffect(() => {
    if (subType === 'blogs') fetchBlogSubmissions();
  }, [subType, blogFilter]);

  const fetchBlogSubmissions = async () => {
    try {
      const res = await request('get', `/blogs/admin/all?status=${blogFilter}`);
      if (res.success) setBlogSubmissions(res.data);
    } catch { setBlogSubmissions([]); }
  };

  const handleBlogApprove = async (id) => {
    try {
      await request('put', `/blogs/admin/${id}/approve`);
      toast.success('Blog approved & points awarded');
      fetchBlogSubmissions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approval failed');
    }
  };

  const handleBlogReject = (id) => {
    // Reuse the existing reject modal
    onReject(id);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const items = subType === 'blogs' ? blogSubmissions : submissions;
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map(s => s._id));
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

  const activeFilter = subType === 'blogs' ? blogFilter : filter;
  const setActiveFilter = subType === 'blogs' ? setBlogFilter : setFilter;
  const displayItems = subType === 'blogs' ? blogSubmissions : submissions;

  return (
    <div className="glass-panel">
      <div className="view-filters" style={{ flexWrap: 'wrap', gap: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="filter-group">
            {['public', 'individual', 'blogs'].map(t => (
              <button 
                key={t} 
                className={subType === t ? 'active' : ''} 
                style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => { setSubType(t); setSelectedIds([]); }}
              >
                {t === 'blogs' && <BookOpen size={14} />}
                {t === 'public' ? 'Public' : t === 'individual' ? 'Individual' : 'Blogs'}
              </button>
            ))}
          </div>

          <div className="filter-group">
            {['pending', 'approved', 'rejected'].map(f => (
              <button 
                key={f} 
                className={activeFilter === f ? 'active' : ''} 
                onClick={() => { setActiveFilter(f); setSelectedIds([]); }}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {selectedIds.length > 0 && activeFilter === 'pending' && subType !== 'blogs' && (
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
                  {selectedIds.length === displayItems.length && displayItems.length > 0 ? <CheckSquare size={18} color="var(--blue)" /> : <Square size={18} />}
                </button>
              </th>
              <th>Contributor</th>
              <th>{subType === 'blogs' ? 'Blog Title' : 'Task Objective'}</th>
              <th>Value</th>
              <th>Timestamp</th>
              <th>Status</th>
              <th className="text-right">Verification</th>
            </tr>
          </thead>
          <tbody>
            {displayItems.map(s => {
              const isBlog = subType === 'blogs';
              const name = isBlog ? (s.userId?.name || 'Unknown') : (s.userId?.name || 'Deleted User');
              const email = isBlog ? (s.userId?.email || '') : (s.userId?.email || '');
              const title = isBlog ? s.title : (s.taskId?.title || 'Unknown Task');
              const points = isBlog ? '—' : `+${s.taskId?.rewardPoints || 0}`;
              const status = s.status;
              const date = new Date(isBlog ? (s.publishedAt || s.createdAt) : s.createdAt).toLocaleString();

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
                     {isBlog && <div style={{ fontSize: '0.75rem', color: '#8b5cf6', fontWeight: 700, marginTop: '4px' }}>📝 Blog Submission</div>}
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
                      {isBlog ? (
                        <>
                          <button className="btn-icon" onClick={() => onPreview({ ...s, isBlogPreview: true })} title="View Blog">
                            <Eye size={16} />
                          </button>
                          {status === 'pending' && (
                            <>
                              <button className="btn-icon success" onClick={() => handleBlogApprove(s._id)} title="Approve Blog">
                                <CheckCircle size={16} />
                              </button>
                              <button className="btn-icon danger" onClick={() => handleBlogReject(s._id)} title="Reject Blog">
                                <XCircle size={16} />
                              </button>
                            </>
                          )}
                        </>
                      ) : (
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
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {displayItems.length === 0 && (
          <div className="text-center" style={{ padding: '60px', color: '#64748b' }}>
            <div style={{ opacity: 0.1, marginBottom: '16px' }}><Search size={48} style={{ margin: '0 auto' }} /></div>
            <p>No {subType === 'blogs' ? 'blog submissions' : 'submissions'} found for the selected filter.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubmissionReview;
