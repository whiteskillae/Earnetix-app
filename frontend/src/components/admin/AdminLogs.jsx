import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import { Activity, Filter, ChevronLeft, ChevronRight, Search, Download } from 'lucide-react';

const ACTION_LABELS = {
  approve: { label: 'Approved Submission', color: '#10b981' },
  reject: { label: 'Rejected Submission', color: '#ef4444' },
  approve_assigned: { label: 'Approved Mission', color: '#10b981' },
  reject_assigned: { label: 'Rejected Mission', color: '#ef4444' },
  create_task: { label: 'Created Task', color: '#3b82f6' },
  edit_task: { label: 'Edited Task', color: '#3b82f6' },
  delete_task: { label: 'Deleted Task', color: '#ef4444' },
  block: { label: 'Blocked User', color: '#ef4444' },
  unblock: { label: 'Unblocked User', color: '#10b981' },
  block_user: { label: 'Blocked User', color: '#ef4444' },
  unblock_user: { label: 'Unblocked User', color: '#10b981' },
  temp_block: { label: 'Temp Blocked', color: '#f59e0b' },
  adjust_points: { label: 'Points Adjusted', color: '#8b5cf6' },
  kyc_verify: { label: 'KYC Approved', color: '#10b981' },
  kyc_reject: { label: 'KYC Rejected', color: '#ef4444' },
  kyc_block: { label: 'KYC Block', color: '#ef4444' },
  withdrawal_complete: { label: 'Withdrawal Done', color: '#10b981' },
  withdrawal_reject: { label: 'Withdrawal Rejected', color: '#ef4444' },
  withdrawal_block_user: { label: 'Withdrawal Block', color: '#ef4444' },
  delete_user: { label: 'User Deleted', color: '#ef4444' },
};

const TARGET_TYPE_LABELS = {
  submission: 'Submission',
  task: 'Task',
  user: 'User',
  assigned_task: 'Mission',
  withdrawal: 'Withdrawal',
};

const AdminLogs = () => {
  const { request } = useApi();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 });

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 50 });
      if (actionFilter) params.append('action', actionFilter);
      if (targetTypeFilter) params.append('targetType', targetTypeFilter);
      const res = await request('get', `/admin/logs?${params}`);
      if (res.success) {
        setLogs(res.data.logs);
        setPagination(res.data.pagination);
      }
    } catch {}
    setLoading(false);
  }, [actionFilter, targetTypeFilter]);

  useEffect(() => { fetchLogs(1); }, [fetchLogs]);

  const filteredLogs = searchTerm.trim()
    ? logs.filter(l =>
        l.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.adminId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.adminId?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : logs;

  const exportCsv = () => {
    const header = ['Timestamp', 'Action', 'Admin', 'Target Type', 'Details', 'IP'];
    const rows = filteredLogs.map(l => {
      const details = (l.details || '').replace(/"/g, "'");
      return [
        new Date(l.createdAt).toISOString(),
        l.action,
        l.adminId?.email || 'System',
        l.targetType,
        `"${details}"`,
        l.ip || '',
      ];
    });
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin_logs_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const ActionBadge = ({ action }) => {
    const info = ACTION_LABELS[action] || { label: action, color: '#64748b' };
    return (
      <span style={{
        fontSize: '0.7rem', fontWeight: 800, padding: '3px 10px', borderRadius: '8px',
        background: `${info.color}15`, color: info.color, whiteSpace: 'nowrap'
      }}>
        {info.label}
      </span>
    );
  };

  return (
    <div className="admin-logs fade-in">
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={22} color="#3b82f6" /> Admin Activity Logs
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '4px' }}>
            {pagination.total} total actions recorded
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-outline btn-sm" onClick={exportCsv}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <Filter size={16} color="#64748b" />
          
          {/* Search */}
          <div className="search-box" style={{ flex: 1, minWidth: '200px' }}>
            <Search size={15} />
            <input
              type="text"
              placeholder="Search by admin, details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Action type filter */}
          <select
            className="form-input"
            style={{ width: '190px', padding: '10px 14px', fontSize: '0.85rem' }}
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">All Actions</option>
            {Object.entries(ACTION_LABELS).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>

          {/* Target type filter */}
          <select
            className="form-input"
            style={{ width: '160px', padding: '10px 14px', fontSize: '0.85rem' }}
            value={targetTypeFilter}
            onChange={(e) => setTargetTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            {Object.entries(TARGET_TYPE_LABELS).map(([key, val]) => (
              <option key={key} value={key}>{val}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Loading logs...</div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
            <Activity size={40} style={{ opacity: 0.2, marginBottom: '12px' }} />
            <p>No log entries found</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Type</th>
                  <th>Admin</th>
                  <th>Details</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr key={log._id} className="fade-in">
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.78rem', color: '#64748b' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <ActionBadge action={log.action} />
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                        {TARGET_TYPE_LABELS[log.targetType] || log.targetType}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.82rem' }}>
                        <div style={{ fontWeight: 700, color: '#e2e8f0' }}>{log.adminId?.name || 'System'}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{log.adminId?.email}</div>
                      </div>
                    </td>
                    <td style={{ maxWidth: '280px' }}>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.details || '—'}
                      </p>
                    </td>
                    <td>
                      <code style={{ fontSize: '0.72rem', color: '#64748b', background: 'rgba(255,255,255,0.03)', padding: '2px 6px', borderRadius: '4px' }}>
                        {log.ip || 'N/A'}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Page {pagination.page} of {pagination.pages} · {pagination.total} total
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn-icon"
                onClick={() => fetchLogs(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="btn-icon"
                onClick={() => fetchLogs(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLogs;
