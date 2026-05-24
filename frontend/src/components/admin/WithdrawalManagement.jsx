import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import ConfirmModal from '../common/ConfirmModal';
import { DollarSign, CheckCircle, Clock, Ban, XCircle, CreditCard, User, Trash2 } from 'lucide-react';

const WithdrawalManagement = () => {
  const { request } = useApi();
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  // Modals state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewData, setViewData] = useState(null);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null, type: 'danger' });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchWithdrawals();
  }, [filter]);

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      const query = filter ? `?status=${filter}` : '';
      const res = await request('get', `/withdrawals/admin/all${query}`);
      if (res.success) setWithdrawals(res.data);
    } catch {}
    setLoading(false);
  };

  const handleComplete = async (id) => {
    setConfirmModal({
      open: true,
      title: 'Mark as Paid',
      message: 'Confirm that the funds have been successfully transferred to the user\'s bank account? This will permanently deduct the corresponding points from their wallet.',
      type: 'primary',
      confirmText: 'Confirm Payment',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await request('put', `/withdrawals/admin/${id}/complete`, { note: 'Payment processed and verified' });
          toast.success('Payment Finalized');
          fetchWithdrawals();
          setConfirmModal(prev => ({ ...prev, open: false }));
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed');
        }
        setActionLoading(false);
      }
    });
  };

  const handleReject = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await request('put', `/withdrawals/admin/${rejectId}/reject`, { reason: rejectReason });
      toast.success('Withdrawal rejected — points returned');
      setShowRejectModal(false);
      setRejectReason('');
      fetchWithdrawals();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
    setActionLoading(false);
  };

  const handleBlock = async (id) => {
    setConfirmModal({
      open: true,
      title: 'Block User',
      message: 'Are you sure you want to block this user? This will reject the current withdrawal and lock the account immediately.',
      type: 'danger',
      confirmText: 'Block User',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await request('put', `/withdrawals/admin/${id}/block-user`);
          toast.success('User Blocked');
          fetchWithdrawals();
          setConfirmModal(prev => ({ ...prev, open: false }));
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed');
        }
        setActionLoading(false);
      }
    });
  };

  const handleDelete = async (id) => {
    setConfirmModal({
      open: true,
      title: 'Delete Withdrawal Record',
      message: 'Are you sure you want to permanently delete this withdrawal record? This cannot be undone.',
      type: 'danger',
      confirmText: 'Delete Record',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await request('delete', `/withdrawals/admin/${id}`);
          toast.success('Record Deleted');
          fetchWithdrawals();
          setConfirmModal(prev => ({ ...prev, open: false }));
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to delete record');
        }
        setActionLoading(false);
      }
    });
  };

  const statusBadge = (status) => {
    const map = {
      pending: { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', label: 'Pending' },
      processing: { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', label: 'Processing' },
      completed: { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', label: 'Completed' },
      rejected: { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', label: 'Rejected' },
    };
    const s = map[status] || map.pending;
    return <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '4px 12px', borderRadius: '8px', background: s.bg, color: s.color }}>{s.label}</span>;
  };

  const totalPending = withdrawals.filter(w => w.status === 'pending').reduce((acc, w) => acc + w.amountUSD, 0);

  return (
    <div className="withdrawal-mgmt fade-in">
      <div className="flex-between" style={{ marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Payment Requests</h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Manage user payment requests</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['', 'pending', 'completed', 'rejected'].map(s => (
            <button 
              key={s} 
              className={`btn ${filter === s ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '0.75rem', padding: '8px 16px' }}
              onClick={() => setFilter(s)}
            >
              {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
          <DollarSign size={24} color="#f59e0b" style={{ marginBottom: '8px' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>${totalPending.toFixed(2)}</div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>PENDING PAYOUTS</div>
        </div>
        <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
          <CreditCard size={24} color="#10b981" style={{ marginBottom: '8px' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{withdrawals.filter(w => w.status === 'pending').length}</div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>PENDING REQUESTS</div>
        </div>
        <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
          <CheckCircle size={24} color="#3b82f6" style={{ marginBottom: '8px' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{withdrawals.filter(w => w.status === 'completed').length}</div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>COMPLETED</div>
        </div>
      </div>

      {loading ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px' }}>Loading withdrawal data...</div>
      ) : withdrawals.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px' }}>
          <DollarSign size={48} style={{ opacity: 0.1, marginBottom: '16px' }} />
          <p style={{ color: '#64748b' }}>No withdrawal requests found</p>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '12px' }}>
          <div className="table-wrapper" style={{ border: 'none', background: 'transparent' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Amount</th>
                  <th>Bank</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map(w => (
                  <tr key={w._id}>
                    <td>
                      <div className="user-info-cell">
                        <span className="user-name">{w.userId?.name || 'Unknown'}</span>
                        <span className="user-email">{w.userId?.email}</span>
                      </div>
                    </td>
                    <td>
                      <div>
                        <span style={{ fontWeight: 800, color: '#10b981', fontSize: '1rem' }}>${w.amountUSD}</span>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{w.pointsUsed?.toLocaleString()} pts</div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem' }}>
                        <div style={{ fontWeight: 700 }}>{w.bankDetails?.bankName}</div>
                        <div style={{ color: '#64748b', fontSize: '0.7rem' }}>
                          {w.bankDetails?.accountName} • Acct: {w.bankDetails?.accountNumber}
                        </div>
                        {w.bankDetails?.ifscCode && <div style={{ color: '#64748b', fontSize: '0.7rem' }}>IFSC: {w.bankDetails.ifscCode}</div>}
                        {w.bankDetails?.upiId && <div style={{ color: '#3b82f6', fontSize: '0.7rem' }}>UPI: {w.bankDetails.upiId}</div>}
                      </div>
                    </td>
                    <td>{statusBadge(w.status)}</td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{new Date(w.createdAt).toLocaleDateString()}</span>
                    </td>
                    <td>
                      {(w.status === 'pending' || w.status === 'processing') && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn-icon success" title="Mark as Paid" onClick={() => handleComplete(w._id)}>
                            <CheckCircle size={16} />
                          </button>
                          <button className="btn-icon" title="Reject (return points)" style={{ color: '#f59e0b' }} onClick={() => { setRejectId(w._id); setShowRejectModal(true); }}>
                            <XCircle size={16} />
                          </button>
                          <button className="btn-icon danger" title="Block User" onClick={() => handleBlock(w._id)}>
                            <Ban size={16} />
                          </button>
                        </div>
                      )}
                      {(w.status === 'completed' || w.status === 'rejected') && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn-icon" style={{ color: '#3b82f6' }} title="View Details" onClick={() => { setViewData(w); setShowViewModal(true); }}>
                            <DollarSign size={16} />
                          </button>
                          <button className="btn-icon danger" title="Delete Record" onClick={() => handleDelete(w._id)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                      {w.status === 'completed' && <span style={{ fontSize: '0.7rem', color: '#10b981', display: 'block', marginTop: '4px' }}>✓ Paid</span>}
                      {w.status === 'rejected' && <span style={{ fontSize: '0.7rem', color: '#ef4444', display: 'block', marginTop: '4px' }}>{w.adminNote}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Payment Request">
        <form onSubmit={handleReject}>
          <div className="form-group">
            <label>Reason for Rejection</label>
            <textarea className="form-input" rows={3} placeholder="e.g. UPI details incorrect..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-danger btn-block" disabled={actionLoading} style={{ marginTop: '16px' }}>
            {actionLoading ? 'Processing...' : 'Reject Request'}
          </button>
        </form>
      </Modal>

      {/* View Details Modal */}
      <Modal isOpen={showViewModal} onClose={() => setShowViewModal(false)} title="Withdrawal Receipt Details">
        {viewData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
               <h4 style={{ margin: '0 0 12px', color: '#3b82f6', fontSize: '0.9rem' }}>User Info</h4>
               <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>Name:</strong> {viewData.userId?.name}</p>
               <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>Email:</strong> {viewData.userId?.email}</p>
               <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>Country:</strong> {viewData.userId?.country}</p>
            </div>
            
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
               <h4 style={{ margin: '0 0 12px', color: '#10b981', fontSize: '0.9rem' }}>Transaction Data</h4>
               <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>Amount (USD):</strong> ${viewData.amountUSD}</p>
               <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>Points Used:</strong> {viewData.pointsUsed?.toLocaleString()}</p>
               <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>Status:</strong> {viewData.status.toUpperCase()}</p>
               <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>Date Requested:</strong> {new Date(viewData.createdAt).toLocaleString()}</p>
               {viewData.processedAt && (
                 <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>Date Processed:</strong> {new Date(viewData.processedAt).toLocaleString()}</p>
               )}
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
               <h4 style={{ margin: '0 0 12px', color: '#f59e0b', fontSize: '0.9rem' }}>Banking & Notes</h4>
               <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>Bank Name:</strong> {viewData.bankDetails?.bankName}</p>
               <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>Acct Name:</strong> {viewData.bankDetails?.accountName}</p>
               <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>Acct No.:</strong> {viewData.bankDetails?.accountNumber}</p>
               {viewData.bankDetails?.ifscCode && <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>IFSC:</strong> {viewData.bankDetails?.ifscCode}</p>}
               {viewData.bankDetails?.upiId && <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>UPI:</strong> {viewData.bankDetails?.upiId}</p>}
               {viewData.adminNote && (
                 <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                   <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}><strong>Admin Note:</strong> {viewData.adminNote}</p>
                 </div>
               )}
            </div>
          </div>
        )}
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

export default WithdrawalManagement;
