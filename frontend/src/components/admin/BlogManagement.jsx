import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import toast from 'react-hot-toast';
import {
  BookOpen, CheckCircle, XCircle, Eye, Ban, Clock, Filter,
  User, Calendar, Hash, AlertCircle, ChevronDown, X, Globe
} from 'lucide-react';

const statusColors = {
  pending: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'PENDING' },
  approved: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', label: 'APPROVED' },
  rejected: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: 'REJECTED' },
  blocked: { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', label: 'BLOCKED' },
};

const StatusBadge = ({ status }) => {
  const c = statusColors[status] || statusColors.pending;
  return (
    <span style={{ fontSize: '0.65rem', fontWeight: 900, color: c.color, background: c.bg, padding: '3px 10px', borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
      {c.label}
    </span>
  );
};

const BlogManagement = () => {
  const { request } = useApi();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { fetchBlogs(); }, [filterStatus]);

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const res = await request('get', `/blogs/admin/all?status=${filterStatus}`);
      if (res.success) setBlogs(res.data);
    } catch {}
    setLoading(false);
  };

  const handleViewFull = async (blog) => {
    try {
      const res = await request('get', `/blogs/detail/${blog._id}`);
      if (res.success) setSelectedBlog(res.data);
    } catch { setSelectedBlog(blog); }
  };

  const handleApprove = async (id) => {
    setActionLoading(true);
    try {
      const res = await request('put', `/blogs/admin/${id}/approve`);
      if (res.success) {
        toast.success(res.message || 'Blog approved! Points awarded.');
        fetchBlogs();
        if (selectedBlog?._id === id) setSelectedBlog(null);
      }
    } catch { toast.error('Approval failed'); }
    setActionLoading(false);
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectTargetId || !rejectReason.trim()) { toast.error('Please provide a rejection reason'); return; }
    setActionLoading(true);
    try {
      const res = await request('put', `/blogs/admin/${rejectTargetId}/reject`, { reason: rejectReason });
      if (res.success) {
        toast.success(res.message);
        setShowRejectModal(false);
        setRejectReason('');
        setRejectTargetId(null);
        fetchBlogs();
        if (selectedBlog?._id === rejectTargetId) setSelectedBlog(null);
      }
    } catch { toast.error('Rejection failed'); }
    setActionLoading(false);
  };

  const handleBlock = async (id) => {
    if (!window.confirm('Permanently block this blog?')) return;
    try {
      const res = await request('put', `/blogs/admin/${id}/block`);
      if (res.success) {
        toast.success('Blog blocked');
        fetchBlogs();
        if (selectedBlog?._id === id) setSelectedBlog(null);
      }
    } catch { toast.error('Block failed'); }
  };

  const filtered = filterStatus === 'all' ? blogs : blogs;
  const readTime = (blog) => Math.max(1, Math.ceil((blog.wordCount || 200) / 200));
  const pages = (blog) => blog.pages?.length > 0 ? blog.pages : [blog.content];
  const fullContent = (blog) => pages(blog).join('<hr style="border:none;border-top:2px solid rgba(255,255,255,0.08);margin:48px 0;" />');

  return (
    <div className="blog-mgmt-page fade-in">
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 900, background: 'var(--blue-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Blog Management
          </h2>
          <p style={{ margin: '6px 0 0', color: 'var(--gray-500)', fontWeight: 600 }}>Review, approve, and manage user-submitted blogs</p>
        </div>
        <div className="blog-mgmt-stats">
          {Object.entries(statusColors).map(([s, c]) => (
            <div key={s} className={`blog-stat-chip ${filterStatus === s ? 'active' : ''}`}
              style={{ '--chip-color': c.color, '--chip-bg': c.bg }}
              onClick={() => setFilterStatus(s)}>
              <span style={{ color: c.color, fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase' }}>{s}</span>
              <span style={{ color: 'white', fontWeight: 900 }}>{blogs.filter(b => b.status === s).length || 0}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {['pending', 'approved', 'rejected', 'blocked', 'all'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`blog-filter-btn ${filterStatus === s ? 'active' : ''}`}>
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Blog List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--gray-500)' }}>Loading blogs...</div>
      ) : blogs.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '80px', borderRadius: '24px' }}>
          <BookOpen size={48} style={{ opacity: 0.15, marginBottom: '16px' }} />
          <p style={{ color: 'var(--gray-500)', fontWeight: 700 }}>No {filterStatus === 'all' ? '' : filterStatus} blogs found</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {blogs.map(blog => (
            <div key={blog._id} className="blog-mgmt-card glass-panel">
              <div className="blog-mgmt-card-left">
                {blog.coverImage ? (
                  <img src={blog.coverImage} alt={blog.title} style={{ width: '100px', height: '72px', objectFit: 'cover', borderRadius: '12px', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: '100px', height: '72px', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <BookOpen size={20} style={{ opacity: 0.3 }} />
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem' }}>{blog.title}</h4>
                    <StatusBadge status={blog.status} />
                    {blog.rejectionCount > 0 && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#f59e0b' }}>⚠ Rejected {blog.rejectionCount}/2</span>
                    )}
                  </div>
                  <p style={{ margin: '0 0 10px', fontSize: '0.84rem', color: 'var(--gray-400)', lineHeight: 1.5 }}>
                    {blog.excerpt || 'No preview available.'}
                  </p>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.75rem', color: 'var(--gray-500)', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={12} /> {blog.userId?.name || '—'} <code style={{ fontSize: '0.7rem', opacity: 0.6 }}>({blog.userId?.uid || blog.userId?.email || '—'})</code>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={12} /> {new Date(blog.createdAt).toLocaleDateString()}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {readTime(blog)} min</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Hash size={12} /> {blog.wordCount || '—'} words</span>
                  </div>
                  {blog.rejectionReason && (
                    <div style={{ marginTop: '10px', padding: '8px 12px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)', borderRadius: '10px', fontSize: '0.8rem', color: 'var(--gray-300)' }}>
                      <strong style={{ color: '#ef4444' }}>Rejection Reason:</strong> {blog.rejectionReason}
                    </div>
                  )}
                </div>
              </div>
              <div className="blog-mgmt-actions">
                <button className="blog-mgmt-btn view" onClick={() => handleViewFull(blog)}>
                  <Eye size={16} /> View
                </button>
                {blog.status === 'pending' && (
                  <>
                    <button className="blog-mgmt-btn approve" onClick={() => handleApprove(blog._id)} disabled={actionLoading}>
                      <CheckCircle size={16} /> Approve
                    </button>
                    <button className="blog-mgmt-btn reject" onClick={() => { setRejectTargetId(blog._id); setShowRejectModal(true); }} disabled={actionLoading}>
                      <XCircle size={16} /> Reject
                    </button>
                  </>
                )}

                {blog.status !== 'blocked' && (
                  <button className="blog-mgmt-btn block" onClick={() => handleBlock(blog._id)}>
                    <Ban size={16} /> Block
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="blog-modal-overlay-admin" onClick={() => setShowRejectModal(false)}>
          <div className="blog-modal-admin" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><XCircle size={18} color="#ef4444" /> Reject Blog</h3>
              <button style={{ background: 'none', border: 'none', color: 'var(--gray-400)', cursor: 'pointer' }} onClick={() => setShowRejectModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleReject} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Rejection Reason <span style={{ color: '#ef4444' }}>*</span></label>
                <textarea className="form-input" rows="4" placeholder="Be specific — user will see this message and receive an announcement."
                  value={rejectReason} onChange={e => setRejectReason(e.target.value)} required autoFocus />
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', margin: 0 }}>
                ⚠ After 2 rejections, the blog will be permanently blocked and the user cannot resubmit.
              </p>
              <button type="submit" className="btn btn-danger btn-block" disabled={actionLoading}>
                {actionLoading ? 'Processing...' : 'Reject & Notify User'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Blog Full View Modal */}
      {selectedBlog && (
        <div className="blog-modal-overlay-admin" style={{ alignItems: 'flex-start', paddingTop: '20px', paddingBottom: '20px', overflowY: 'auto' }}>
          <div style={{ background: 'rgba(12,12,18,0.99)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '28px', maxWidth: '860px', width: '100%', overflow: 'hidden', animation: 'modalIn 0.25s ease', boxShadow: '0 40px 100px rgba(0,0,0,0.8)' }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <StatusBadge status={selectedBlog.status} />
                {selectedBlog.rejectionCount > 0 && <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 800 }}>Rejected {selectedBlog.rejectionCount}/2</span>}
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                  by {selectedBlog.userId?.name} (@{selectedBlog.userId?.username || selectedBlog.userId?.uid})
                </span>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {selectedBlog.status === 'pending' && (
                  <>
                    <button className="blog-mgmt-btn approve" onClick={() => handleApprove(selectedBlog._id)} disabled={actionLoading}>
                      <CheckCircle size={15} /> Approve
                    </button>
                    <button className="blog-mgmt-btn reject" onClick={() => { setRejectTargetId(selectedBlog._id); setShowRejectModal(true); }} disabled={actionLoading}>
                      <XCircle size={15} /> Reject
                    </button>
                  </>
                )}
                <button style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '10px', color: 'var(--gray-300)', padding: '8px', cursor: 'pointer' }} onClick={() => setSelectedBlog(null)}>
                  <X size={18} />
                </button>
              </div>
            </div>
            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', maxHeight: '80vh' }}>
              {selectedBlog.coverImage && <img src={selectedBlog.coverImage} alt={selectedBlog.title} style={{ width: '100%', maxHeight: '360px', objectFit: 'cover', borderRadius: '20px', marginBottom: '28px' }} />}
              <h1 style={{ margin: '0 0 16px', fontSize: '2rem', fontWeight: 900 }}>{selectedBlog.title}</h1>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: '4px' }}><User size={13} /> {selectedBlog.userId?.name}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={13} /> {new Date(selectedBlog.createdAt).toLocaleDateString()}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: '4px' }}><Hash size={13} /> {selectedBlog.wordCount} words</span>
              </div>
              <div style={{ fontSize: '1rem', lineHeight: 1.85, color: 'var(--gray-200)' }}
                dangerouslySetInnerHTML={{ __html: (selectedBlog.pages?.length > 0 ? selectedBlog.pages : [selectedBlog.content]).join('<hr style="border:none;border-top:2px solid rgba(255,255,255,0.08);margin:40px 0;" />') }} />
            </div>
          </div>
        </div>
      )}

      <style>{`
        .blog-mgmt-page { padding: 10px; }
        .blog-mgmt-stats { display: flex; gap: 10px; flex-wrap: wrap; }
        .blog-stat-chip { display: flex; flex-direction: column; align-items: center; padding: 10px 16px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; cursor: pointer; transition: all 0.2s; min-width: 70px; gap: 4px; }
        .blog-stat-chip.active { background: var(--chip-bg); border-color: var(--chip-color); }
        .blog-filter-btn { padding: 8px 18px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; color: var(--gray-400); font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .blog-filter-btn.active { background: rgba(59,130,246,0.1); border-color: rgba(59,130,246,0.3); color: var(--blue-light); }
        .blog-mgmt-card { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; padding: 20px; border-radius: 20px; flex-wrap: wrap; }
        .blog-mgmt-card-left { display: flex; gap: 16px; flex: 1; min-width: 0; align-items: flex-start; }
        .blog-mgmt-actions { display: flex; gap: 8px; flex-wrap: wrap; flex-shrink: 0; }
        .blog-mgmt-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 10px; font-size: 0.82rem; font-weight: 800; cursor: pointer; border: 1px solid; transition: all 0.2s; }
        .blog-mgmt-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .blog-mgmt-btn.view { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.08); color: var(--gray-300); }
        .blog-mgmt-btn.view:hover { background: rgba(255,255,255,0.07); }
        .blog-mgmt-btn.approve { background: rgba(16,185,129,0.08); border-color: rgba(16,185,129,0.2); color: #10b981; }
        .blog-mgmt-btn.approve:hover:not(:disabled) { background: rgba(16,185,129,0.15); }
        .blog-mgmt-btn.reject { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.2); color: #ef4444; }
        .blog-mgmt-btn.reject:hover:not(:disabled) { background: rgba(239,68,68,0.15); }
        .blog-mgmt-btn.block { background: rgba(107,114,128,0.08); border-color: rgba(107,114,128,0.2); color: #9ca3af; }
        .blog-mgmt-btn.block:hover { background: rgba(107,114,128,0.15); }
        .blog-modal-overlay-admin { position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(10px); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .blog-modal-admin { background: rgba(12,12,18,0.99); border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; padding: 28px; width: 100%; max-width: 560px; box-shadow: 0 40px 80px rgba(0,0,0,0.7); animation: modalIn 0.25s ease; }
        @keyframes modalIn { from { transform: scale(0.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default BlogManagement;
