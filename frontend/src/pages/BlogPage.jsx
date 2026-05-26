import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import Loader from '../components/common/Loader';
import toast from 'react-hot-toast';
import {
  BookOpen, Clock, Hash, User, Calendar, Plus, Pencil, Trash2,
  Eye, CheckCircle, AlertCircle, X, ChevronRight, Globe, Star, ArrowLeft,
  Heart, TrendingUp, Sparkles
} from 'lucide-react';

// ─── Default Cover Gradients ──────────────────────────────────────
const COVER_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
  'linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)',
  'linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)',
  'linear-gradient(135deg, #48c6ef 0%, #6f86d6 100%)',
];

const getDefaultCover = (id) => {
  if (!id) return COVER_GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i);
  return COVER_GRADIENTS[Math.abs(hash) % COVER_GRADIENTS.length];
};

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
const BlogCard = ({ blog, onClick, onLike, currentUserId }) => {
  const readTime = Math.max(1, Math.ceil((blog.wordCount || 200) / 200));
  const date = new Date(blog.publishedAt || blog.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  const isLiked = blog.likes?.includes(currentUserId);

  return (
    <div className="blog-card slide-up" onClick={() => onClick(blog)} style={{ cursor: 'pointer' }}>
      {blog.coverImage ? (
        <div className="blog-card-cover">
          <img src={blog.coverImage} alt={blog.title} />
        </div>
      ) : (
        <div className="blog-card-cover-gradient" style={{ background: getDefaultCover(blog._id) }}>
          <BookOpen size={36} style={{ opacity: 0.4, color: 'white' }} />
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
            <span
              className={`blog-like-btn ${isLiked ? 'liked' : ''}`}
              onClick={(e) => { e.stopPropagation(); onLike(blog._id); }}
              title="Like"
            >
              <Heart size={13} fill={isLiked ? '#ef4444' : 'none'} color={isLiked ? '#ef4444' : 'currentColor'} />
              {blog.likesCount || 0}
            </span>
            <span><Clock size={12} /> {readTime}m</span>
            <span><Calendar size={12} /> {date}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Blog Detail View ──────────────────────────────────────────────
const BlogDetail = ({ blog, onClose, onEdit, onDelete, onLike, currentUserId }) => {
  const readTime = Math.max(1, Math.ceil((blog.wordCount || 200) / 200));
  const date = new Date(blog.publishedAt || blog.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  const isOwner = blog.userId?._id === currentUserId || blog.userId === currentUserId;
  const isLiked = blog.likes?.some(id => (id?._id || id)?.toString() === currentUserId);
  const pages = blog.pages?.length > 0 ? blog.pages : [blog.content];
  const fullContent = pages.join('<hr style="border:none;border-top:2px solid rgba(255,255,255,0.08);margin:48px 0;" />');

  return (
    <div className="blog-detail-overlay">
      <div className="blog-detail-container">
        <div className="blog-detail-topbar">
          <button className="blog-back-btn" onClick={onClose}><ArrowLeft size={18} /> Back to Blogs</button>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {blog.status === 'approved' && (
              <button
                className={`blog-like-detail-btn ${isLiked ? 'liked' : ''}`}
                onClick={() => onLike(blog._id)}
              >
                <Heart size={18} fill={isLiked ? '#ef4444' : 'none'} color={isLiked ? '#ef4444' : 'currentColor'} />
                {blog.likesCount || 0} {(blog.likesCount || 0) === 1 ? 'Like' : 'Likes'}
              </button>
            )}
            {isOwner && (
              <>
                {blog.status !== 'blocked' && blog.status !== 'approved' && blog.rejectionCount < 2 && (
                  <button className="blog-btn-secondary" onClick={() => onEdit(blog)}>
                    <Pencil size={16} /> Edit & Resubmit
                  </button>
                )}
                {blog.status !== 'blocked' && blog.status !== 'approved' && (
                  <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', color: '#ef4444', font: 'inherit', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }} onClick={() => onDelete(blog)}>
                    <Trash2 size={16} /> Delete
                  </button>
                )}
              </>
            )}
          </div>
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

        {blog.coverImage ? (
          <img src={blog.coverImage} alt={blog.title} className="blog-detail-cover" />
        ) : (
          <div className="blog-detail-cover-gradient" style={{ background: getDefaultCover(blog._id) }}>
            <BookOpen size={48} style={{ opacity: 0.3, color: 'white' }} />
          </div>
        )}
        
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
          <div style={{ width: '80px', height: '60px', background: getDefaultCover(blog._id), borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BookOpen size={20} style={{ opacity: 0.5, color: 'white' }} />
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
            <span><Heart size={11} /> {blog.likesCount || 0} likes</span>
            {blog.rejectionCount > 0 && <span style={{ color: '#f59e0b' }}>⚠ Rejected {blog.rejectionCount}/2</span>}
          </div>
        </div>
      </div>
      <div className="my-blog-actions">
        <button onClick={() => onView(blog)} title="View"><Eye size={16} /></button>
        {blog.status !== 'blocked' && blog.status !== 'approved' && blog.rejectionCount < 2 && (
          <button onClick={() => onEdit(blog)} title="Edit" style={{ color: 'var(--blue-light)' }}><Pencil size={16} /></button>
        )}
        {blog.status !== 'blocked' && blog.status !== 'approved' && (
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
    if (blog.status === 'approved') {
      toast.error('Approved blogs cannot be edited.');
      return;
    }
    navigate(`/blog/create?edit=${blog._id}`);
  };

  const handleDeleteBlog = async (blog) => {
    if (blog.status === 'approved') {
       toast.error('Approved blogs cannot be deleted.');
       return;
    }
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

  const handleLike = async (blogId) => {
    try {
      const res = await request('post', `/blogs/${blogId}/like`);
      if (res.success) {
        // Update in lists
        setBlogs(prev => prev.map(b => {
          if (b._id === blogId) {
            const isCurrentlyLiked = b.likes?.includes(user?._id);
            return {
              ...b,
              likesCount: res.data.likesCount,
              likes: isCurrentlyLiked
                ? b.likes.filter(id => id !== user?._id)
                : [...(b.likes || []), user?._id],
            };
          }
          return b;
        }));
        // Update selected blog if viewing
        if (selectedBlog && selectedBlog._id === blogId) {
          setSelectedBlog(prev => ({
            ...prev,
            likesCount: res.data.likesCount,
            likes: res.data.liked
              ? [...(prev.likes || []), user?._id]
              : (prev.likes || []).filter(id => (id?._id || id)?.toString() !== user?._id),
          }));
        }
      }
    } catch {}
  };

  return (
    <div className="blog-page fade-in">
      {/* Header */}
      <div className="blog-page-header">
        <div>
          <h1 className="blog-page-title">
            <Sparkles size={28} style={{ color: 'var(--blue)' }} /> Community Blogs
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
              <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                <BookOpen size={36} style={{ color: 'white', opacity: 0.8 }} />
              </div>
              <h2>No Blogs Published Yet</h2>
              <p>Be the first to share your expertise with the community!</p>
              <button className="blog-create-btn" onClick={() => navigate('/blog/create')} style={{ marginTop: '20px' }}>
                <Plus size={18} /> Write First Blog
              </button>
            </div>
          ) : (
            <>
              {/* Featured / Hero Post */}
              {blogs.length > 0 && (
                <div className="blog-hero" onClick={() => handleViewBlog(blogs[0])}>
                  <div className="blog-hero-cover">
                    {blogs[0].coverImage ? (
                      <img src={blogs[0].coverImage} alt={blogs[0].title} />
                    ) : (
                      <div className="blog-hero-gradient" style={{ background: getDefaultCover(blogs[0]._id) }}>
                        <BookOpen size={56} style={{ opacity: 0.3, color: 'white' }} />
                      </div>
                    )}
                    <div className="blog-hero-overlay">
                      <span className="blog-hero-badge"><TrendingUp size={12} /> Latest</span>
                      <h2 className="blog-hero-title">{blogs[0].title}</h2>
                      <p className="blog-hero-excerpt">{blogs[0].excerpt}</p>
                      <div className="blog-hero-meta">
                        <span><User size={13} /> {blogs[0].userId?.name || 'Anonymous'}</span>
                        <span><Heart size={13} /> {blogs[0].likesCount || 0}</span>
                        <span><Clock size={13} /> {Math.max(1, Math.ceil((blogs[0].wordCount || 200) / 200))}m read</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Grid for remaining posts */}
              <div className="blog-grid">
                {blogs.slice(1).map(blog => (
                  <BlogCard key={blog._id} blog={blog} onClick={handleViewBlog} onLike={handleLike} currentUserId={user?._id} />
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
              <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                <Pencil size={32} style={{ color: 'white', opacity: 0.8 }} />
              </div>
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
          onLike={handleLike}
          currentUserId={user?._id}
        />
      )}

      <style>{`
        .blog-page { padding: 20px; max-width: 1400px; margin: 0 auto; position: relative; }
        .blog-page::before { content: ''; position: absolute; top: -100px; right: -100px; width: 400px; height: 400px; background: radial-gradient(circle, rgba(255, 255, 255, 0.03) 0%, transparent 70%); z-index: -1; pointer-events: none; }
        
        .blog-page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 32px; flex-wrap: wrap; gap: 20px; position: relative; z-index: 1; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 24px; }
        .blog-page-title { display: flex; align-items: center; gap: 14px; font-size: 2.2rem; font-weight: 700; margin: 0; color: #f8fafc; letter-spacing: -0.02em; }
        .blog-create-btn { display: flex; align-items: center; gap: 8px; padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; border-radius: 14px; color: white; font-size: 0.95rem; font-weight: 700; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3); }
        .blog-create-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4); }
        
        .blog-tabs { display: flex; gap: 8px; margin-bottom: 32px; padding: 6px; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 14px; width: fit-content; }
        .blog-tab { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: transparent; border: none; border-radius: 10px; color: var(--gray-400); font-size: 0.95rem; font-weight: 500; cursor: pointer; transition: all 0.2s ease; position: relative; }
        .blog-tab.active { background: rgba(255, 255, 255, 0.08); color: #f8fafc; }
        .blog-tab-badge { position: absolute; top: 6px; right: 6px; width: 18px; height: 18px; background: #3b82f6; color: white; font-size: 0.65rem; font-weight: 700; border-radius: 50%; display: flex; align-items: center; justify-content: center; }

        /* Hero Post */
        .blog-hero { margin-bottom: 32px; cursor: pointer; border-radius: 24px; overflow: hidden; transition: all 0.3s ease; }
        .blog-hero:hover { transform: translateY(-4px); box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
        .blog-hero-cover { position: relative; height: 360px; overflow: hidden; }
        .blog-hero-cover img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.6s ease; }
        .blog-hero:hover .blog-hero-cover img { transform: scale(1.03); }
        .blog-hero-gradient { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
        .blog-hero-overlay { position: absolute; bottom: 0; left: 0; right: 0; padding: 40px 32px 32px; background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 60%, transparent 100%); }
        .blog-hero-badge { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; background: rgba(16,185,129,0.2); border: 1px solid rgba(16,185,129,0.3); border-radius: 8px; color: #10b981; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 12px; }
        .blog-hero-title { margin: 0 0 10px; font-size: 2rem; font-weight: 800; color: white; line-height: 1.3; }
        .blog-hero-excerpt { margin: 0 0 16px; font-size: 1rem; color: rgba(255,255,255,0.7); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; max-width: 600px; }
        .blog-hero-meta { display: flex; gap: 20px; }
        .blog-hero-meta span { display: flex; align-items: center; gap: 6px; font-size: 0.85rem; color: rgba(255,255,255,0.6); font-weight: 600; }
        @media (max-width: 600px) { .blog-hero-cover { height: 260px; } .blog-hero-title { font-size: 1.4rem; } .blog-hero-overlay { padding: 24px 20px 20px; } }

        /* Grid */
        .blog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; }
        @media (max-width: 600px) { .blog-grid { grid-template-columns: 1fr; } }

        /* Blog Card */
        .blog-card { background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 20px; overflow: hidden; transition: all 0.3s ease; }
        .blog-card:hover { border-color: rgba(255, 255, 255, 0.15); background: rgba(255, 255, 255, 0.04); transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.3); }
        .blog-card-cover { height: 180px; overflow: hidden; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .blog-card-cover img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease; }
        .blog-card:hover .blog-card-cover img { transform: scale(1.05); }
        .blog-card-cover-gradient { height: 180px; display: flex; align-items: center; justify-content: center; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .blog-card-body { padding: 20px; }
        .blog-card-title { margin: 0 0 10px; font-size: 1.15rem; font-weight: 700; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; color: #f8fafc; }
        .blog-card-excerpt { margin: 0 0 20px; font-size: 0.92rem; color: var(--gray-400); line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .blog-card-meta { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 16px; }
        .blog-card-author { display: flex; align-items: center; gap: 12px; }
        .blog-card-avatar { width: 32px; height: 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; color: white; font-size: 0.85rem; flex-shrink: 0; }
        .blog-card-stats { display: flex; gap: 12px; }
        .blog-card-stats span { display: flex; align-items: center; gap: 5px; font-size: 0.75rem; color: var(--gray-500); font-weight: 500; }

        /* Like Button */
        .blog-like-btn { cursor: pointer; transition: all 0.2s; padding: 2px 6px; border-radius: 6px; }
        .blog-like-btn:hover { background: rgba(239,68,68,0.1); color: #ef4444; }
        .blog-like-btn.liked { color: #ef4444; }
        .blog-like-detail-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: rgba(239,68,68,0.06); border: 1px solid rgba(239,68,68,0.15); border-radius: 12px; color: var(--gray-300); font: inherit; font-size: 0.9rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .blog-like-detail-btn:hover { background: rgba(239,68,68,0.12); border-color: rgba(239,68,68,0.3); }
        .blog-like-detail-btn.liked { color: #ef4444; border-color: rgba(239,68,68,0.3); background: rgba(239,68,68,0.1); }

        /* Pagination */
        .blog-pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 48px; }
        .blog-page-btn { padding: 10px 20px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; color: #f8fafc; font-size: 0.9rem; font-weight: 500; cursor: pointer; transition: all 0.2s ease; }
        .blog-page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .blog-page-btn:hover:not(:disabled) { background: rgba(255,255,255,0.06); }

        /* Empty State */
        .blog-empty-state { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 100px 20px; color: var(--gray-400); }
        .blog-empty-state h2 { margin: 0 0 16px; font-size: 1.5rem; font-weight: 700; color: #f8fafc; }
        .blog-empty-state p { margin: 0; max-width: 450px; font-size: 1rem; line-height: 1.6; }

        /* My Blogs */
        .my-blogs-list { display: flex; flex-direction: column; gap: 16px; }
        .my-blog-card { display: flex; flex-direction: column; gap: 16px; padding: 20px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; transition: all 0.2s ease; }
        .my-blog-card:hover { border-color: rgba(255,255,255,0.15); background: rgba(255,255,255,0.04); }
        .my-blog-actions { display: flex; gap: 10px; }
        .my-blog-actions button { display: flex; align-items: center; gap: 6px; padding: 8px 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; color: var(--gray-400); font-size: 0.82rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .my-blog-actions button:hover { background: rgba(255,255,255,0.07); }

        .blog-detail-overlay { position: fixed; inset: 0; z-index: 8000; background: rgba(10, 10, 10, 0.98); overflow-y: auto; animation: fadeIn 0.2s ease; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .blog-detail-container { max-width: 760px; margin: 40px auto; padding: 40px; background: transparent; }
        @media (max-width: 800px) { .blog-detail-container { margin: 0; padding: 24px; } }
        .blog-detail-topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; flex-wrap: wrap; gap: 16px; }
        .blog-detail-cover { width: 100%; max-height: 400px; object-fit: cover; border-radius: 20px; margin-bottom: 40px; }
        .blog-detail-cover-gradient { width: 100%; height: 280px; border-radius: 20px; margin-bottom: 40px; display: flex; align-items: center; justify-content: center; }
        .blog-detail-title { font-size: 2.6rem; font-weight: 800; margin: 0 0 24px; line-height: 1.2; letter-spacing: -0.02em; color: #f8fafc; }
        .blog-detail-meta { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 20px; margin-bottom: 48px; padding-bottom: 32px; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .blog-detail-content { font-size: 1.15rem; line-height: 1.8; color: #cbd5e1; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 400; }
        .blog-detail-content img { max-width: 100%; border-radius: 12px; margin: 32px 0; border: 1px solid rgba(255,255,255,0.05); }
        .blog-detail-content h1 { font-size: 2rem; font-weight: 800; margin: 48px 0 20px; color: #f8fafc; }
        .blog-detail-content h2 { font-size: 1.6rem; font-weight: 700; margin: 40px 0 16px; color: #f8fafc; }
        .blog-detail-content h3 { font-size: 1.3rem; font-weight: 700; margin: 32px 0 12px; color: #f8fafc; }
        .blog-detail-content a { color: #3b82f6; text-decoration: none; border-bottom: 1px solid transparent; transition: all 0.2s; }
        .blog-detail-content a:hover { border-bottom-color: #3b82f6; }
        .blog-detail-content ul, .blog-detail-content ol { padding-left: 24px; margin: 20px 0; }
        .blog-detail-content li { margin: 8px 0; }
        .blog-detail-content blockquote { border-left: 3px solid rgba(102, 126, 234, 0.5); padding-left: 20px; margin: 32px 0; font-style: italic; color: #94a3b8; font-size: 1.1rem; }
        .blog-detail-content iframe { width: 100%; min-height: 450px; border: none; border-radius: 12px; margin: 32px 0; background: rgba(255,255,255,0.02); }
        .blog-detail-content p { margin: 0 0 16px; }
        .blog-detail-content span.resizer-wrap { max-width: 100% !important; width: auto !important; height: auto !important; resize: none !important; border: none !important; }
        .blog-detail-content span.resizer-wrap img { width: 100% !important; height: auto !important; object-fit: contain !important; }

        /* Back btn reuse */
        .blog-back-btn { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: transparent; border: none; color: var(--gray-400); font-size: 0.95rem; font-weight: 500; cursor: pointer; transition: all 0.2s ease; margin-left: -16px; }
        .blog-back-btn:hover { color: #f8fafc; }
        .blog-btn-secondary { display: flex; align-items: center; gap: 6px; padding: 10px 20px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: #f8fafc; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease; }
        .blog-btn-secondary:hover { background: rgba(255,255,255,0.1); }
      `}</style>
    </div>
  );
};

export default BlogPage;
