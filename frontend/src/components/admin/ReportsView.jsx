import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { Shield, ExternalLink, CheckCircle, Clock, Trash2, User } from 'lucide-react';
import { format } from 'date-fns';

const ReportsView = () => {
  const [reports, setReports] = useState([]);
  const { loading, request } = useApi();

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await request('get', '/reports/admin/all');
      setReports(res.data.data);
    } catch (err) {}
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await request('put', `/reports/admin/${id}`, { status });
      fetchReports();
    } catch (err) {}
  };

  return (
    <div className="reports-admin fade-in">
      <div className="admin-header">
        <div>
          <h2>Security Reports</h2>
          <p className="subtitle">Investigate user feedback, bugs, and UI errors</p>
        </div>
      </div>

      <div className="table-responsive glass-panel">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Report Info</th>
              <th>Reporter</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report._id}>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span className="user-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className={`status-pill-new ${report.type === 'bug' ? 'status-rejected' : 'status-pending'}`} style={{ fontSize: '0.6rem' }}>
                        {report.type}
                      </span>
                      {report.subject}
                    </span>
                    <span className="user-email" style={{ fontSize: '0.8rem', opacity: 0.8 }}>{report.description.substring(0, 50)}...</span>
                  </div>
                </td>
                <td>
                  <div className="user-info-cell">
                    <span className="user-name">{report.userId?.name}</span>
                    <span className="user-email">{report.userId?.email}</span>
                  </div>
                </td>
                <td>
                  <span className={`status-pill-new status-${report.status}`}>
                    {report.status}
                  </span>
                </td>
                <td>
                  <span className="user-email">{format(new Date(report.createdAt), 'MMM d, HH:mm')}</span>
                </td>
                <td>
                  <div className="flex-gap-sm">
                    <button 
                      className="btn-icon success" 
                      onClick={() => handleUpdateStatus(report._id, 'resolved')}
                      title="Mark Resolved"
                    >
                      <CheckCircle size={16} />
                    </button>
                    <button 
                      className="btn-icon" 
                      onClick={() => handleUpdateStatus(report._id, 'investigating')}
                      title="Investigating"
                    >
                      <Clock size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {reports.length === 0 && !loading && (
          <div style={{ padding: '80px', textAlign: 'center', color: 'var(--gray-500)' }}>
            <Shield size={48} style={{ opacity: 0.1, marginBottom: '16px' }} />
            <p>No reports found. The system is stable.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsView;
