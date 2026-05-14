import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import toast from 'react-hot-toast';
import { DollarSign, CheckCircle, Clock, Ban, XCircle, CreditCard, User } from 'lucide-react';

const WithdrawalManagement = () => {
  const { request } = useApi();
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

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
    if (!window.confirm('Mark this payment as completed? Points will be permanently deducted.')) return;
    try {
      await request('put', `/withdrawals/admin/${id}/complete`, { note: 'Payment sent to bank' });
      toast.success('Payment completed & points deducted');
      fetchWithdrawals();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt('Reason for rejection (points will be returned to user):');
    if (!reason) return;
    try {
      await request('put', `/withdrawals/admin/${id}/reject`, { reason });
      toast.success('Withdrawal rejected — points returned');
      fetchWithdrawals();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleBlock = async (id) => {
    if (!window.confirm('⚠ BLOCK this user permanently? Their session will be terminated.')) return;
    try {
      await request('put', `/withdrawals/admin/${id}/block-user`);
      toast.success('User blocked & withdrawal rejected');
      fetchWithdrawals();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
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
          <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Treasury — Withdrawals</h2>
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
                          {w.bankDetails?.accountName} • ****{w.bankDetails?.accountNumber?.slice(-4)}
                        </div>
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
                          <button className="btn-icon success" title="Mark as Done" onClick={() => handleComplete(w._id)}>
                            <CheckCircle size={16} />
                          </button>
                          <button className="btn-icon" title="Reject (return points)" style={{ color: '#f59e0b' }} onClick={() => handleReject(w._id)}>
                            <XCircle size={16} />
                          </button>
                          <button className="btn-icon danger" title="Block User" onClick={() => handleBlock(w._id)}>
                            <Ban size={16} />
                          </button>
                        </div>
                      )}
                      {w.status === 'completed' && <span style={{ fontSize: '0.7rem', color: '#10b981' }}>✓ Paid</span>}
                      {w.status === 'rejected' && <span style={{ fontSize: '0.7rem', color: '#ef4444' }}>{w.adminNote}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default WithdrawalManagement;
