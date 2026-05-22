import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import ConfirmModal from '../common/ConfirmModal';
import { Shield, CheckCircle, XCircle, Ban, Eye, FileText, Download, User, Award } from 'lucide-react';
import { getDownloadableUrl } from '../../utils/cloudinaryHelper';

const KycReview = () => {
  const { request } = useApi();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [previewUser, setPreviewUser] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectUserId, setRejectUserId] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null, type: 'danger' });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { fetchKycList(); }, [filter]);

  const fetchKycList = async () => {
    setLoading(true);
    try {
      const res = await request('get', `/kyc/admin/list?status=${filter}`);
      if (res.success) setUsers(res.data);
    } catch {}
    setLoading(false);
  };

  const handleOpenPreview = async (u) => {
    setPreviewUser(u);
    setShowPreview(true);
    setPreviewLoading(true);
    try {
      const res = await request('get', `/kyc/admin/${u._id}/full`);
      if (res.success) setPreviewUser(res.data);
    } catch {}
    setPreviewLoading(false);
  };

  const handleVerify = async (id) => {
    setConfirmModal({
      open: true,
      title: 'Approve KYC',
      message: "Confirm this user's identity document is valid? This will unlock their full account access.",
      type: 'primary',
      confirmText: 'Approve & Grant Access',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await request('put', `/kyc/admin/${id}/verify`);
          toast.success('KYC Approved — User Cleared');
          fetchKycList();
          setShowPreview(false);
          setConfirmModal(prev => ({ ...prev, open: false }));
        } catch (err) {
          toast.error(err.response?.data?.message || 'Authorization failed');
        }
        setActionLoading(false);
      }
    });
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) return toast.error('Rejection reason is required');
    try {
      await request('put', `/kyc/admin/${rejectUserId}/reject`, { reason: rejectReason });
      toast.success('KYC rejected — user will be asked to resubmit');
      setShowRejectModal(false);
      setShowPreview(false);
      setRejectReason('');
      fetchKycList();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rejection failed');
    }
  };

  const handleBlock = async (id) => {
    setConfirmModal({
      open: true,
      title: 'Block User',
      message: 'Block this user and terminate all their sessions?',
      type: 'danger',
      confirmText: 'Block User',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await request('put', `/kyc/admin/${id}/block`);
          toast.success('User Blocked');
          fetchKycList();
          setShowPreview(false);
          setConfirmModal(prev => ({ ...prev, open: false }));
        } catch (err) {
          toast.error(err.response?.data?.message || 'Block failed');
        }
        setActionLoading(false);
      }
    });
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

  const InfoRow = ({ label, value }) => value ? (
    <div style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>{label}</div>
      <div style={{ fontSize: '0.9rem', color: '#e2e8f0', fontWeight: 600 }}>{value}</div>
    </div>
  ) : null;

  return (
    <div className="kyc-review fade-in">
      <div className="flex-between" style={{ marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Identity Verification (eKYC)</h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '4px' }}>Review and verify user KYC submissions</p>
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
                <div style={{ width: '48px', height: '48px', background: 'rgba(59,130,246,0.1)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', fontWeight: 800, fontSize: '1.1rem', flexShrink: 0 }}>
                  {u.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{u.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{u.email}</div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {statusBadge(u.kycStatus)}
                    <span style={{ fontSize: '0.7rem', color: '#475569' }}>
                      {u.kycDocumentType?.toUpperCase()}{u.kycDocumentNumber ? ` • ${u.kycDocumentNumber}` : ''} • {u.country || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: '#475569' }}>{u.kycSubmittedAt ? new Date(u.kycSubmittedAt).toLocaleDateString() : 'N/A'}</span>
                <button className="btn btn-sm btn-outline" onClick={() => handleOpenPreview(u)}>
                  <Eye size={14} /> View Details
                </button>
                {filter === 'pending' && (
                  <>
                    <button className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }} onClick={() => handleVerify(u._id)}>
                      <CheckCircle size={14} /> Approve
                    </button>
                    <button className="btn btn-sm" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }} onClick={() => { setRejectUserId(u._id); setShowRejectModal(true); }}>
                      <XCircle size={14} /> Reject
                    </button>
                    <button className="btn btn-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }} onClick={() => handleBlock(u._id)}>
                      <Ban size={14} /> Block
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full Detail Preview Modal */}
      <Modal isOpen={showPreview} onClose={() => setShowPreview(false)} title="KYC Verification Details">
        {previewUser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {previewLoading && <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>Loading full details...</div>}

            {/* Identity Section */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <User size={15} color="#3b82f6" />
                <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Identity & Contact</span>
              </div>
              <InfoRow label="Full Name" value={previewUser.name} />
              <InfoRow label="Email" value={previewUser.email} />
              <InfoRow label="Phone" value={previewUser.countryCode ? `${previewUser.countryCode} ${previewUser.mobileNumber}` : previewUser.mobileNumber} />
              <InfoRow label="Country" value={previewUser.country} />
              <InfoRow label="Registration Date" value={previewUser.createdAt ? new Date(previewUser.createdAt).toLocaleString() : null} />
              <InfoRow label="Account Status" value={previewUser.accountStatus} />
            </div>

            {/* KYC Document Section */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <FileText size={15} color="#10b981" />
                <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>KYC Document</span>
              </div>
              <InfoRow label="Document Type" value={previewUser.kycDocumentType?.toUpperCase()} />
              <InfoRow label="Document Number" value={previewUser.kycDocumentNumber} />
              <InfoRow label="Verification Status" value={previewUser.kycStatus} />
              <InfoRow label="Submitted At" value={previewUser.kycSubmittedAt ? new Date(previewUser.kycSubmittedAt).toLocaleString() : null} />
              {previewUser.kycVerifiedAt && <InfoRow label="Verified At" value={new Date(previewUser.kycVerifiedAt).toLocaleString()} />}
              {previewUser.kycRejectionReason && <InfoRow label="Rejection Reason" value={previewUser.kycRejectionReason} />}
            </div>

            {/* Skills & Qualifications */}
            {(previewUser.skills?.length > 0 || previewUser.qualifications) && (
              <div className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <Award size={15} color="#8b5cf6" />
                  <span style={{ fontSize: '0.75rem', color: '#8b5cf6', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Skills & Qualifications</span>
                </div>
                <InfoRow label="Qualification" value={previewUser.qualifications} />
                {previewUser.skills?.length > 0 && (
                  <div style={{ padding: '10px 0' }}>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Skills</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {previewUser.skills.map(s => (
                        <span key={s} style={{ background: 'rgba(139,92,246,0.12)', color: '#a78bfa', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}>{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Document Image/File */}
            {previewUser.kycDocumentUrl && (
              <div className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Uploaded Document</span>
                  <a href={getDownloadableUrl(previewUser.kycDocumentUrl)} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline">
                    <Download size={13} /> Download
                  </a>
                </div>
                {!/\.(pdf|doc|docx)$/i.test(previewUser.kycDocumentUrl) ? (
                  <img src={previewUser.kycDocumentUrl} alt="KYC Document" style={{ width: '100%', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', maxHeight: '300px', objectFit: 'contain' }} />
                ) : (
                  <a href={getDownloadableUrl(previewUser.kycDocumentUrl)} target="_blank" rel="noreferrer" className="btn btn-outline btn-block">
                    <FileText size={16} /> Open Document ({previewUser.kycDocumentUrl.split('.').pop().toUpperCase()})
                  </a>
                )}
              </div>
            )}

            {/* In-modal Actions for pending */}
            {previewUser.kycStatus === 'pending' && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-success" style={{ flex: 1 }} onClick={() => handleVerify(previewUser._id)}>
                  <CheckCircle size={15} /> Approve KYC
                </button>
                <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => { setRejectUserId(previewUser._id); setShowRejectModal(true); }}>
                  <XCircle size={15} /> Reject
                </button>
                <button className="btn-icon danger" title="Block User" onClick={() => handleBlock(previewUser._id)}>
                  <Ban size={15} />
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Rejection Modal */}
      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Request Document Resubmission">
        <form onSubmit={handleReject}>
          <div className="form-group">
            <label>Reason (will be shown to user)</label>
            <textarea className="form-input" rows={3} placeholder="e.g. Document is blurry, please upload a clearer image" value={rejectReason} onChange={e => setRejectReason(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '16px' }}>Send Resubmission Request</button>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal(prev => ({ ...prev, open: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
        loading={actionLoading}
      />
    </div>
  );
};

export default KycReview;
