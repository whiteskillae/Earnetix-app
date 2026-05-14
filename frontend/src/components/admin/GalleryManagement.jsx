import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import toast from 'react-hot-toast';
import { Image, Film, FileText, Trash2, Search, Filter, ChevronLeft, ChevronRight, Eye, X, Download, Calendar, User } from 'lucide-react';

const GalleryManagement = () => {
  const { request } = useApi();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({ status: '', fileType: '', dateFrom: '', dateTo: '' });
  const [preview, setPreview] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const fetchGallery = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 30 });
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });

      const res = await request('get', `/admin/gallery?${params}`);
      if (res.success) {
        setItems(res.data.items);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      toast.error('Failed to load gallery');
    }
    setLoading(false);
  }, [request, page, filters]);

  useEffect(() => { fetchGallery(); }, [fetchGallery]);

  const handleDelete = async (submissionId, fileField) => {
    if (!window.confirm(`Delete this ${fileField} permanently from Cloudinary? This cannot be undone.`)) return;
    setDeleting(`${submissionId}-${fileField}`);
    try {
      const res = await request('delete', `/admin/gallery/${submissionId}/${fileField}`);
      if (res.success) {
        toast.success('File deleted successfully');
        fetchGallery();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
    setDeleting(null);
  };

  const getFileIcon = (type) => {
    if (type === 'image') return <Image size={16} />;
    if (type === 'video') return <Film size={16} />;
    return <FileText size={16} />;
  };

  const statusColors = {
    pending: { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' },
    approved: { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: 'rgba(16, 185, 129, 0.2)' },
    rejected: { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.2)' },
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Image size={24} color="var(--blue)" /> Gallery Management
          </h2>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.85rem', marginTop: '4px' }}>
            Browse and manage all uploaded evidence across the platform
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--gray-500)' }}>
          <Filter size={14} /> {pagination.total || 0} files total
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', borderRadius: '16px', marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={filters.status}
          onChange={(e) => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white', padding: '8px 12px', borderRadius: '10px', fontSize: '0.8rem' }}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>

        <select
          value={filters.fileType}
          onChange={(e) => { setFilters(f => ({ ...f, fileType: e.target.value })); setPage(1); }}
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white', padding: '8px 12px', borderRadius: '10px', fontSize: '0.8rem' }}
        >
          <option value="">All Types</option>
          <option value="image">Images</option>
          <option value="video">Videos</option>
          <option value="document">Documents</option>
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={14} color="var(--gray-500)" />
          <input type="date" value={filters.dateFrom}
            onChange={(e) => { setFilters(f => ({ ...f, dateFrom: e.target.value })); setPage(1); }}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white', padding: '8px 10px', borderRadius: '10px', fontSize: '0.78rem' }}
          />
          <span style={{ color: 'var(--gray-500)', fontSize: '0.8rem' }}>to</span>
          <input type="date" value={filters.dateTo}
            onChange={(e) => { setFilters(f => ({ ...f, dateTo: e.target.value })); setPage(1); }}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white', padding: '8px 10px', borderRadius: '10px', fontSize: '0.78rem' }}
          />
        </div>

        {(filters.status || filters.fileType || filters.dateFrom || filters.dateTo) && (
          <button onClick={() => { setFilters({ status: '', fileType: '', dateFrom: '', dateTo: '' }); setPage(1); }}
            style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', padding: '8px 14px', borderRadius: '10px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 700 }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Gallery Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="skeleton-pulse" style={{ height: '240px', borderRadius: '16px' }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', borderRadius: '20px' }}>
          <Image size={48} color="var(--gray-600)" style={{ marginBottom: '16px' }} />
          <p style={{ color: 'var(--gray-500)', fontWeight: 600 }}>No files match your filters</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
          {items.map((item) => (
            <div key={item._id} className="glass-panel" style={{ borderRadius: '16px', overflow: 'hidden', transition: 'var(--transition)' }}>
              {/* Preview Area */}
              {item.files.map((file, idx) => (
                <div key={idx} style={{ position: 'relative' }}>
                  {file.type === 'image' ? (
                    <img src={file.url} alt="Evidence"
                      style={{ width: '100%', height: '160px', objectFit: 'cover', cursor: 'pointer' }}
                      onClick={() => setPreview(file)}
                      loading="lazy"
                    />
                  ) : file.type === 'video' ? (
                    <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.02)', cursor: 'pointer' }}
                      onClick={() => setPreview(file)}
                    >
                      <Film size={40} color="var(--blue)" />
                    </div>
                  ) : (
                    <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ textAlign: 'center' }}>
                        <FileText size={32} color="var(--gray-500)" />
                        <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '8px', fontWeight: 700 }}>.{file.ext}</p>
                      </div>
                    </div>
                  )}

                  {/* Overlay Actions */}
                  <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '4px' }}>
                    <button onClick={() => setPreview(file)}
                      style={{ background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: 'white' }}
                    ><Eye size={14} /></button>
                    <button
                      onClick={() => handleDelete(item._id, file.type === 'image' ? 'image' : 'file')}
                      disabled={deleting === `${item._id}-${file.type === 'image' ? 'image' : 'file'}`}
                      style={{ background: 'rgba(239,68,68,0.8)', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: 'white' }}
                    ><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}

              {/* Meta Info */}
              <div style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{
                    ...statusColors[item.status] ? {
                      background: statusColors[item.status].bg,
                      color: statusColors[item.status].color,
                      border: `1px solid ${statusColors[item.status].border}`,
                    } : {},
                    padding: '3px 10px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase'
                  }}>
                    {item.status}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--gray-600)' }}>
                    {item.files.map(f => f.type).join(', ')}
                  </span>
                </div>

                <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'white', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.task?.title || 'Deleted Task'}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: 'var(--gray-500)' }}>
                  <User size={10} /> {item.uploader?.name || 'Unknown'}
                </div>
                <p style={{ fontSize: '0.65rem', color: 'var(--gray-600)', marginTop: '4px' }}>
                  {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '28px', alignItems: 'center' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white', padding: '8px 12px', borderRadius: '10px', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.3 : 1 }}
          ><ChevronLeft size={16} /></button>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--gray-400)' }}>
            Page {page} of {pagination.pages}
          </span>
          <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page >= pagination.pages}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white', padding: '8px 12px', borderRadius: '10px', cursor: page >= pagination.pages ? 'not-allowed' : 'pointer', opacity: page >= pagination.pages ? 0.3 : 1 }}
          ><ChevronRight size={16} /></button>
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
        }} onClick={() => setPreview(null)}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreview(null)}
              style={{ position: 'absolute', top: '-12px', right: '-12px', background: 'rgba(239,68,68,0.9)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
            ><X size={16} /></button>

            {preview.type === 'image' ? (
              <img src={preview.url} alt="Preview" style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: '12px', objectFit: 'contain' }} />
            ) : preview.type === 'video' ? (
              <video controls autoPlay style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: '12px' }}>
                <source src={preview.url} />
              </video>
            ) : (
              <div className="glass-panel" style={{ padding: '40px', borderRadius: '16px', textAlign: 'center' }}>
                <FileText size={48} color="var(--gray-500)" />
                <p style={{ marginTop: '16px', color: 'var(--gray-400)' }}>Document Preview</p>
                <a href={preview.url} target="_blank" rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '16px', color: 'var(--blue)', fontWeight: 700, textDecoration: 'none' }}
                ><Download size={16} /> Download File</a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryManagement;
