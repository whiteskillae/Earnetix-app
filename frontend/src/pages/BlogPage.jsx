import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import Loader from '../components/common/Loader';
import toast from 'react-hot-toast';
import {
  BookOpen, Clock, Hash, User, Calendar, Plus, Pencil, Trash2,
  Eye, CheckCircle, AlertCircle, X, ChevronRight, Globe, Star, ArrowLeft
} from 'lucide-react';

// ─── Status Badge ────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const config = {
    pending: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'IN REVIEW' },
    approved: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', label: 'PUBLISHED' },
    rejected: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: 'REJECTED' },
    blocked: { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', label: 'BLOCKED' },
    draft: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', label: 'DRAFT' },
  };
  const c = config[status] || config.draft;
  return (
    <span style={{ fontSize: '0.65rem', fontWeight: 900, color: c.color, background: c.bg, padding: '3px 10px', borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
      {c.label}
    </span>
  );
};

// ─── Blog Card (Gallery) ──────────────────────────────────────────
const BlogCard = ({ blog, onClick }) => {
  const readTime = Math.max(1, Math.ceil((blog.wordCount || 200) / 200));
  const date = new Date(blog.publishedAt || blog.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="blog-card slide-up" onClick={() => onClick(blog)} style={{ cursor: 'pointer' }}>
      {blog.coverImage ? (
        <div className="blog-card-cover">
          <img src={blog.coverImage} alt={blog.title} />
        </div>
      ) : (
        <div className="blog-card-cover-placeholder">
          <BookOpen size={32} style={{ opacity: 0.2 }} />
        </div>
      )}
      <div className="blog-card-body">
        <h3 className="blog-card-title">{blog.title}</h3>
        <p className="blog-card-excerpt">{blog.excerpt || 'No preview available.'}</p>
        <div className="blog-card-meta">
          <div className="blog-card-author">
            <div className="blog-card-avatar">{blog.userId?.name?.charAt(0) || 'U'}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{blog.userId?.name || 'Anonymous'}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)' }}>@{blog.userId?.username || blog.userId?.uid || '—'}</div>
            </div>
          </div>
          <div className="blog-card-stats">
            <span><Clock size={12} /> {readTime}m read</span>
            <span><Calendar size={12} /> {date}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Blog Detail View ──────────────────────────────────────────────
const BlogDetail = ({ blog, onClose, onEdit, onDelete, currentUserId }) => {
  const readTime = Math.max(1, Math.ceil((blog.wordCount || 200) / 200));
  const date = new Date(blog.publishedAt || blog.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  const isOwner = blog.userId?._id === currentUserId || blog.userId === currentUserId;
  const pages = blog.pages?.length > 0 ? blog.pages : [blog.content];
  const fullContent = pages.join('<hr style="border:none;border-top:2px solid rgba(255,255,255,0.08);margin:48px 0;" />');

  return (
    <div className="blog-detail-overlay">
      <div className="blog-detail-container">
        <div className="blog-detail-topbar">
          <button className="blog-back-btn" onClick={onClose}><ArrowLeft size={18} /> Back to Blogs</button>
          {isOwner && (
            <div style={{ display: 'flex', gap: '12px' }}>
              {(blog.status === 'rejected' && blog.rejectionCount < 2) || blog.status === 'draft' ? (
                <button className="blog-btn-secondary" onClick={() => onEdit(blog)}>
                  <Pencil size={16} /> Edit & Resubmit
                </button>
              ) : null}
              {blog.status !== 'approved' && (
                <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', color: '#ef4444', font: 'inherit', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }} onClick={() => onDelete(blog)}>
                  <Trash2 size={16} /> Delete
                </button>
              )}
            </div>
          )}
        </div>

        {blog.status === 'rejected' && (
          <div style={{ margin: '20px 0', padding: '16px 20px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: 800, marginBottom: '8px' }}>
              <AlertCircle size={16} /> Blog Rejected ({blog.rejectionCount}/2)
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--gray-300)' }}><strong>Reason:</strong> {blog.rejectionReason}</p>
            {blog.rejectionCount < 2 && <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: 'var(--gray-500)' }}>You can edit and resubmit this blog.</p>}
          </div>
        )}

        {blog.coverImage && <img src={blog.coverImage} alt={blog.title} className="blog-detail-cover" />}
        
        <h1 className="blog-detail-title">{blog.title}</h1>
        <div className="blog-detail-meta">
          <div className="blog-card-author" style={{ gap: '10px' }}>
            <div className="blog-card-avatar" style={{ width: '40px', height: '40px', fontSize: '1.1rem' }}>
              {blog.userId?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{blog.userId?.name || 'Anonymous'}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>@{blog.userId?.username || blog.userId?.uid || '—'} · {date}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <StatusBadge status={blog.status} />
            <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={13} /> {readTime} min read</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: '4px' }}><Hash size={13} /> {blog.wordCount || '—'} words</span>
          </div>
        </div>

        <div className="blog-detail-content" dangerouslySetInnerHTML={{ __html: fullContent }} />
      </div>
    </div>
  );
};

// ─── My Blogs Tab ─────────────────────────────────────────────────
const MyBlogCard = ({ blog, onView, onEdit, onDelete }) => {
  const readTime = Math.max(1, Math.ceil((blog.wordCount || 200) / 200));
  return (
    <div className="my-blog-card">
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        {blog.coverImage ? (
          <img src={blog.coverImage} alt={blog.title} style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '10px', flexShrink: 0 }} />
        ) : (
          <div style={{ width: '80px', height: '60px', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BookOpen size={20} style={{ opacity: 0.3 }} />
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
            <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1rem' }}>{blog.title}</h4>
            <StatusBadge status={blog.status} />
          </div>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--gray-500)', lineHeight: 1.5 }}>{blog.excerpt || 'No preview.'}</p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '0.75rem', color: 'var(--gray-600)', flexWrap: 'wrap' }}>
            <span><Clock size={11} /> {readTime}m read</span>
            <span><Calendar size={11} /> {new Date(blog.createdAt).toLocaleDateString()}</span>
            {blog.rejectionCount > 0 && <span style={{ color: '#f59e0b' }}>⚠ Rejected {blog.rejectionCount}/2</span>}
          </div>
        </div>
      </div>
      <div className="my-blog-actions">
        <button onClick={() => onView(blog)} title="View"><Eye size={16} /></button>
        {(blog.status === 'rejected' && blog.rejectionCount < 2) || blog.status === 'draft' ? (
          <button onClick={() => onEdit(blog)} title="Edit" style={{ color: 'var(--blue-light)' }}><Pencil size={16} /></button>
        ) : null}
        {blog.status !== 'approved' && (
          <button onClick={() => onDelete(blog)} title="Delete" style={{ color: '#ef4444' }}><Trash2 size={16} /></button>
        )}
      </div>
    </div>
  );
};

// ─── Main Blog Page ────────────────────────────────────────────────
const BlogPage = () => {
  const { request } = useApi();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('global');
  const [blogs, setBlogs] = useState([]);
  const [myBlogs, setMyBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (activeTab === 'global') fetchPublicBlogs();
    else fetchMyBlogs();
  }, [activeTab, page]);

  const fetchPublicBlogs = async () => {
    setLoading(true);
    try {
      const res = await request('get', `/blogs?page=${page}&limit=18`);
      if (res.success) {
        setBlogs(res.data.blogs);
        setTotalPages(res.data.pages);
      }
    } catch {}
    setLoading(false);
  };

  const fetchMyBlogs = async () => {
    setLoading(true);
    try {
      const res = await request('get', '/blogs/my');
      if (res.success) setMyBlogs(res.data);
    } catch {}
    setLoading(false);
  };

  const handleViewBlog = async (blog) => {
    try {
      const res = await request('get', `/blogs/detail/${blog._id}`);
      if (res.success) setSelectedBlog(res.data);
    } catch {
      setSelectedBlog(blog);
    }
  };

  const handleEditBlog = (blog) => {
    navigate(`/blog/create?edit=${blog._id}`);
  };

  const handleDeleteBlog = async (blog) => {
    if (!window.confirm('Delete this blog? This action cannot be undone.')) return;
    try {
      const res = await request('delete', `/blogs/${blog._id}`);
      if (res.success) {
        toast.success('Blog deleted');
        setSelectedBlog(null);
        fetchMyBlogs();
      }
    } catch {}
  };

  return (
    <div className="blog-page fade-in">
      {/* Header */}
      <div className="blog-page-header">
        <div>
          <h1 className="blog-page-title">
            <Globe size={28} style={{ color: 'var(--blue)' }} /> Community Blogs
          </h1>
          <p style={{ color: 'var(--gray-500)', fontWeight: 600, marginTop: '6px' }}>
            Read insights, stories, and expertise from our community
          </p>
        </div>
        <button className="blog-create-btn" onClick={() => navigate('/blog/create')}>
          <Plus size={18} /> Write a Blog
        </button>
      </div>

      {/* Tabs */}
      <div className="blog-tabs">
        <button className={`blog-tab ${activeTab === 'global' ? 'active' : ''}`} onClick={() => { setActiveTab('global'); setPage(1); }}>
          <Globe size={16} /> All Blogs
        </button>
        <button className={`blog-tab ${activeTab === 'my' ? 'active' : ''}`} onClick={() => setActiveTab('my')}>
          <BookOpen size={16} /> My Blogs {myBlogs.length > 0 && <span className="blog-tab-badge">{myBlogs.length}</span>}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <Loader text="Loading blogs..." />
      ) : activeTab === 'global' ? (
        <>
          {blogs.length === 0 ? (
            <div className="blog-empty-state">
              <BookOpen size={64} style={{ opacity: 0.1, marginBottom: '24px' }} />
              <h2>No Blogs Published Yet</h2>
              <p>Be the first to share your expertise with the community!</p>
              <button className="blog-create-btn" onClick={() => navigate('/blog/create')} style={{ marginTop: '20px' }}>
                <Plus size={18} /> Write First Blog
              </button>
            </div>
          ) : (
            <>
              <div className="blog-grid">
                {blogs.map(blog => (
                  <BlogCard key={blog._id} blog={blog} onClick={handleViewBlog} />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="blog-pagination">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="blog-page-btn">← Prev</button>
                  <span>Page {page} of {totalPages}</span>
                  <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="blog-page-btn">Next →</button>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <div className="my-blogs-list">
          {myBlogs.length === 0 ? (
            <div className="blog-empty-state">
              <Pencil size={48} style={{ opacity: 0.1, marginBottom: '20px' }} />
              <h2>No Blogs Yet</h2>
              <p>Start writing to complete blog tasks and earn rewards!</p>
              <button className="blog-create-btn" onClick={() => navigate('/blog/create')} style={{ marginTop: '20px' }}>
                <Plus size={18} /> Write Your First Blog
              </button>
            </div>
          ) : myBlogs.map(blog => (
            <MyBlogCard
              key={blog._id}
              blog={blog}
              onView={handleViewBlog}
              onEdit={handleEditBlog}
              onDelete={handleDeleteBlog}
            />
          ))}
        </div>
      )}

      {/* Blog Detail Overlay */}
      {selectedBlog && (
        <BlogDetail
          blog={selectedBlog}
          onClose={() => setSelectedBlog(null)}
          onEdit={handleEditBlog}
          onDelete={(b) => { handleDeleteBlog(b); setSelectedBlog(null); }}
          currentUserId={user?._id}
        />
      )}

      <style>{`
        .blog-page { padding: 20px; max-width: 1400px; margin: 0 auto; }
        
        .blog-page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 32px; flex-wrap: wrap; gap: 20px; }
        .blog-page-title { display: flex; align-items: center; gap: 14px; font-size: 2.2rem; font-weight: 900; margin: 0; background: var(--blue-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .blog-create-btn { display: flex; align-items: center; gap: 8px; padding: 14px 28px; background: var(--blue-gradient); border: none; border-radius: 16px; color: white; font-size: 0.95rem; font-weight: 800; cursor: pointer; box-shadow: 0 8px 24px rgba(59,130,246,0.3); transition: all 0.3s; }
        .blog-create-btn:hover { transform: translateY(-3px); box-shadow: 0 16px 40px rgba(59,130,246,0.4); }
        
        .blog-tabs { display: flex; gap: 8px; margin-bottom: 32px; padding: 6px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; width: fit-content; }
        .blog-tab { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: transparent; border: none; border-radius: 12px; color: var(--gray-400); font-size: 0.9rem; font-weight: 700; cursor: pointer; transition: all 0.2s; position: relative; }
        .blog-tab.active { background: rgba(59,130,246,0.1); color: var(--blue-light); }
        .blog-tab-badge { position: absolute; top: 6px; right: 6px; width: 18px; height: 18px; background: var(--blue); color: white; font-size: 0.65rem; font-weight: 900; border-radius: 50%; display: flex; align-items: center; justify-content: center; }

        /* Grid */
        .blog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 24px; }
        @media (max-width: 600px) { .blog-grid { grid-template-columns: 1fr; } }

        /* Blog Card */
        .blog-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 20px; overflow: hidden; transition: all 0.3s cubic-bezier(0.175,0.885,0.32,1.1); }
        .blog-card:hover { transform: translateY(-8px); border-color: rgba(59,130,246,0.2); box-shadow: 0 24px 48px rgba(0,0,0,0.4); }
        .blog-card-cover { height: 200px; overflow: hidden; }
        .blog-card-cover img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; }
        .blog-card:hover .blog-card-cover img { transform: scale(1.05); }
        .blog-card-cover-placeholder { height: 160px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, rgba(59,130,246,0.05) 0%, rgba(139,92,246,0.05) 100%); }
        .blog-card-body { padding: 20px; }
        .blog-card-title { margin: 0 0 10px; font-size: 1.05rem; font-weight: 800; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .blog-card-excerpt { margin: 0 0 16px; font-size: 0.85rem; color: var(--gray-400); line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .blog-card-meta { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
        .blog-card-author { display: flex; align-items: center; gap: 10px; }
        .blog-card-avatar { width: 32px; height: 32px; background: var(--blue-gradient); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 900; color: white; font-size: 0.85rem; flex-shrink: 0; }
        .blog-card-stats { display: flex; gap: 12px; }
        .blog-card-stats span { display: flex; align-items: center; gap: 4px; font-size: 0.72rem; color: var(--gray-500); font-weight: 700; }

        /* Pagination */
        .blog-pagination { display: flex; align-items: center; justify-content: center; gap: 20px; margin-top: 40px; }
        .blog-page-btn { padding: 10px 24px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; color: white; font-size: 0.9rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .blog-page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .blog-page-btn:hover:not(:disabled) { background: rgba(59,130,246,0.1); border-color: rgba(59,130,246,0.3); }

        /* Empty State */
        .blog-empty-state { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 80px 20px; color: var(--gray-400); }
        .blog-empty-state h2 { margin: 0 0 12px; font-size: 1.5rem; }
        .blog-empty-state p { margin: 0; max-width: 400px; }

        /* My Blogs */
        .my-blogs-list { display: flex; flex-direction: column; gap: 16px; }
        .my-blog-card { display: flex; flex-direction: column; gap: 16px; padding: 20px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 20px; transition: all 0.2s; }
        .my-blog-card:hover { border-color: rgba(59,130,246,0.15); background: rgba(255,255,255,0.03); }
        .my-blog-actions { display: flex; gap: 10px; }
        .my-blog-actions button { display: flex; align-items: center; gap: 6px; padding: 8px 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; color: var(--gray-400); font-size: 0.82rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .my-blog-actions button:hover { background: rgba(255,255,255,0.07); }

        /* Detail Overlay */
        .blog-detail-overlay { position: fixed; inset: 0; z-index: 8000; background: rgba(8,8,12,0.98); overflow-y: auto; animation: fadeIn 0.2s ease; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .blog-detail-container { max-width: 820px; margin: 0 auto; padding: 24px 24px 80px; }
        .blog-detail-topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; flex-wrap: wrap; gap: 12px; }
        .blog-detail-cover { width: 100%; max-height: 420px; object-fit: cover; border-radius: 24px; margin-bottom: 32px; }
        .blog-detail-title { font-size: 2.2rem; font-weight: 900; margin: 0 0 20px; line-height: 1.2; }
        .blog-detail-meta { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.07); }
        .blog-detail-content { font-size: 1.05rem; line-height: 1.9; color: var(--gray-200); }
        .blog-detail-content img { max-width: 100%; border-radius: 16px; margin: 20px 0; }
        .blog-detail-content h1 { font-size: 2rem; font-weight: 900; margin: 32px 0 16px; }
        .blog-detail-content h2 { font-size: 1.5rem; font-weight: 800; margin: 28px 0 14px; }
        .blog-detail-content h3 { font-size: 1.2rem; font-weight: 800; margin: 24px 0 12px; }
        .blog-detail-content a { color: var(--blue-light); text-decoration: underline; }
        .blog-detail-content ul, .blog-detail-content ol { padding-left: 24px; margin: 12px 0; }
        .blog-detail-content li { margin: 8px 0; }
        .blog-detail-content blockquote { border-left: 4px solid var(--blue); padding-left: 20px; margin: 24px 0; font-style: italic; color: var(--gray-300); }
        .blog-detail-content iframe { width: 100%; min-height: 400px; border: none; border-radius: 16px; }

        /* Back btn reuse */
        .blog-back-btn { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; color: var(--gray-400); font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .blog-back-btn:hover { background: rgba(255,255,255,0.08); color: white; }
        .blog-btn-secondary { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.2); border-radius: 10px; color: var(--blue-light); font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .blog-btn-secondary:hover { background: rgba(59,130,246,0.15); }
      `}</style>
    </div>
  );
};

export default BlogPage;
