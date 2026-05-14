import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import { Shield, CheckCircle, XCircle, Ban, Eye, Clock, FileText, User, ExternalLink } from 'lucide-react';

const KycReview = () => {
  const { request } = useApi();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [previewUser, setPreviewUser] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectUserId, setRejectUserId] = useState(null);

  useEffect(() => {
    fetchKycList();
  }, [filter]);

  const fetchKycList = async () => {
    setLoading(true);
    try {
      const res = await request('get', `/kyc/admin/list?status=${filter}`);
      if (res.success) setUsers(res.data);
    } catch {}
    setLoading(false);
  };

  const handleVerify = async (id) => {
    if (!window.confirm('Verify this user\'s identity?')) return;
    try {
      await request('put', `/kyc/admin/${id}/verify`);
      toast.success('KYC verified successfully');
      fetchKycList();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) return toast.error('Rejection reason is required');
    try {
      await request('put', `/kyc/admin/${rejectUserId}/reject`, { reason: rejectReason });
      toast.success('KYC rejected — user will be asked to resubmit');
      setShowRejectModal(false);
      setRejectReason('');
      fetchKycList();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rejection failed');
    }
  };

  const handleBlock = async (id) => {
    if (!window.confirm('⚠ This will permanently BLOCK the user and terminate their session. Continue?')) return;
    try {
      await request('put', `/kyc/admin/${id}/block`);
      toast.success('User blocked and session terminated');
      fetchKycList();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Block failed');
    }
  };

  const statusBadge = (status) => {
    const map = {
      pending: { color: '#f59e0b', label: 'Pending Review' },
      verified: { color: '#10b981', label: 'Verified' },
      rejected: { color: '#ef4444', label: 'Rejected' },
    };
    const s = map[status] || map.pending;
    return <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '4px 12px', borderRadius: '8px', background: `${s.color}15`, color: s.color }}>{s.label}</span>;
  };

  return (
    <div className="kyc-review fade-in">
      <div className="flex-between" style={{ marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Identity Verification</h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Review and verify user KYC submissions</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['pending', 'verified', 'rejected'].map(s => (
            <button 
              key={s} 
              className={`btn ${filter === s ? 'btn-primary' : 'btn-outline'}`} 
              style={{ fontSize: '0.75rem', padding: '8px 16px' }}
              onClick={() => setFilter(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px' }}>Loading KYC data...</div>
      ) : users.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px' }}>
          <Shield size={48} style={{ opacity: 0.1, marginBottom: '16px' }} />
          <p style={{ color: '#64748b' }}>No {filter} KYC submissions</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {users.map(u => (
            <div key={u._id} className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '250px' }}>
                <div style={{ width: '48px', height: '48px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', fontWeight: 800, fontSize: '1.1rem' }}>
                  {u.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{u.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{u.email}</div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center' }}>
                    {statusBadge(u.kycStatus)}
                    <span style={{ fontSize: '0.7rem', color: '#475569' }}>
                      {u.kycDocumentType?.toUpperCase()} • {u.country || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className="btn-icon" title="Preview Document" onClick={() => { setPreviewUser(u); setShowPreview(true); }}>
                  <Eye size={16} />
                </button>
                {filter === 'pending' && (
                  <>
                    <button className="btn btn-sm" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }} onClick={() => handleVerify(u._id)}>
                      <CheckCircle size={14} /> Accept
                    </button>
                    <button className="btn btn-sm" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)' }} onClick={() => { setRejectUserId(u._id); setShowRejectModal(true); }}>
                      <XCircle size={14} /> Resubmit
                    </button>
                    <button className="btn btn-sm" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }} onClick={() => handleBlock(u._id)}>
                      <Ban size={14} /> Block
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document Preview Modal */}
      <Modal isOpen={showPreview} onClose={() => setShowPreview(false)} title="Document Preview">
        {previewUser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="glass-panel" style={{ padding: '16px' }}>
              <div className="grid-2">
                <div><label style={{ fontSize: '0.7rem', color: '#64748b' }}>Name</label><p style={{ fontWeight: 700 }}>{previewUser.name}</p></div>
                <div><label style={{ fontSize: '0.7rem', color: '#64748b' }}>Email</label><p>{previewUser.email}</p></div>
                <div><label style={{ fontSize: '0.7rem', color: '#64748b' }}>Phone</label><p>{previewUser.countryCode} {previewUser.mobileNumber}</p></div>
                <div><label style={{ fontSize: '0.7rem', color: '#64748b' }}>Document</label><p style={{ fontWeight: 700 }}>{previewUser.kycDocumentType?.toUpperCase()}</p></div>
              </div>
            </div>
            {previewUser.kycDocumentUrl && (
              <div>
                <h5 style={{ marginBottom: '12px' }}>Identity Document:</h5>
                {previewUser.kycDocumentUrl.endsWith('.pdf') ? (
                  <a href={previewUser.kycDocumentUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-block">
                    <FileText size={16} /> Open PDF Document
                  </a>
                ) : (
                  <img src={previewUser.kycDocumentUrl} alt="KYC Document" style={{ width: '100%', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }} />
                )}
              </div>
            )}
            <div style={{ fontSize: '0.75rem', color: '#475569' }}>
              Submitted: {previewUser.kycSubmittedAt ? new Date(previewUser.kycSubmittedAt).toLocaleString() : 'N/A'}
            </div>
          </div>
        )}
      </Modal>

      {/* Rejection Reason Modal */}
      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Request Document Resubmission">
        <form onSubmit={handleReject}>
          <div className="form-group">
            <label>Reason (will be shown to user)</label>
            <textarea className="form-input" rows={3} placeholder="e.g. Document is blurry, please upload a clearer image" value={rejectReason} onChange={e => setRejectReason(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '16px' }}>
            Send Resubmission Request
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default KycReview;
