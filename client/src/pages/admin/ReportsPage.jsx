import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import {
  getEmployeeReport,
  getInternReport,
  getAttendanceReport,
  getLeaveReport,
  getProjectReport,
  getTaskReport,
} from '../../services/reportService';
import { getDepartments } from '../../services/departmentService';

function ReportsPage() {
  const [activeTab, setActiveTab] = useState('employee');
  const [reportData, setReportData] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Common filters
  const [departmentId, setDepartmentId] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadReport = async () => {
    setLoading(true);
    try {
      const params = {
        department_id: departmentId || undefined,
        status: status || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      };

      let res;
      switch (activeTab) {
        case 'employee':
          res = await getEmployeeReport(params);
          break;
        case 'intern':
          res = await getInternReport(params);
          break;
        case 'attendance':
          res = await getAttendanceReport(params);
          break;
        case 'leave':
          res = await getLeaveReport(params);
          break;
        case 'project':
          res = await getProjectReport(params);
          break;
        case 'task':
          res = await getTaskReport(params);
          break;
        default:
          res = { data: [] };
      }

      if (res.success) {
        setReportData(res.data);
      }
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getDepartments().then((res) => {
      if (res.success) setDepartments(res.data);
    });
  }, []);

  useEffect(() => {
    loadReport();
  }, [activeTab, departmentId, status, startDate, endDate]);

  // Export CSV Function
  const exportToCSV = () => {
    if (reportData.length === 0) return;
    const headers = Object.keys(reportData[0]).join(',');
    const rows = reportData.map((row) =>
      Object.values(row)
        .map((val) => `"${String(val || '').replace(/"/g, '""')}"`)
        .join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeTab}_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tabs = [
    { id: 'employee', label: '👥 Employee Report' },
    { id: 'attendance', label: '⏱️ Attendance Report' },
    { id: 'leave', label: '🏖️ Leave Report' },
    { id: 'project', label: '🚀 Project Report' },
    { id: 'task', label: '📋 Task Report' },
    { id: 'intern', label: '🎓 Intern Report' },
  ];

  return (
    <AppLayout
      pageTitle="Reports & Business Analytics"
      subtitle="Vaidimi Corporate Head Office (Varanasi HQ) • Comprehensive workforce metrics, attendance, project delivery, and analytics"
    >
      {/* Varanasi Head Office Jurisdictional Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(6, 95, 70, 0.05))',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: 'var(--radius-lg)',
        padding: '0.75rem 1.25rem',
        marginBottom: '1.25rem',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🏛️</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <strong style={{ color: 'var(--text-main)', fontSize: '0.9375rem' }}>
                Vaidimi Corporate Head Office (Varanasi HQ)
              </strong>
              <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Head Office Active</span>
              <span className="badge" style={{ backgroundColor: '#0284c7', color: '#ffffff', fontSize: '0.7rem' }}>BR-VNS</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Corporate Reporting & Executive Intelligence • Sigra / Cantt, Varanasi
            </div>
          </div>
        </div>
      </div>

      {/* Report Selector Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="btn"
            style={{
              backgroundColor: activeTab === tab.id ? 'var(--primary)' : 'transparent',
              color: activeTab === tab.id ? '#ffffff' : 'var(--text-main)',
              fontWeight: activeTab === tab.id ? '700' : '500',
              fontSize: '0.875rem',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter & Export Bar with Quick Time Range Buttons (Week, 15 Days, Month, Year, 1900+) */}
      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Department</label>
          <select
            className="input"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            style={{ minWidth: '160px' }}
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.department_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Status</label>
          <input
            type="text"
            className="input"
            placeholder="Filter by status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ width: '140px' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Start Date (1900+)</label>
          <input
            type="date"
            className="input"
            min="1900-01-01"
            max="2199-12-31"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ width: '145px' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>End Date (Unlimited)</label>
          <input
            type="date"
            className="input"
            min="1900-01-01"
            max="2199-12-31"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ width: '145px' }}
          />
        </div>

        {/* Quick Presets */}
        <div style={{ alignSelf: 'flex-end', display: 'flex', gap: '0.35rem', flexWrap: 'wrap', paddingBottom: '2px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              const today = new Date().toISOString().split('T')[0];
              setStartDate(today);
              setEndDate(today);
            }}
            style={{ padding: '0.35rem 0.55rem', fontSize: '0.75rem' }}
          >
            Today
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() - 7);
              setStartDate(d.toISOString().split('T')[0]);
              setEndDate(new Date().toISOString().split('T')[0]);
            }}
            style={{ padding: '0.35rem 0.55rem', fontSize: '0.75rem' }}
          >
            7 Days
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() - 15);
              setStartDate(d.toISOString().split('T')[0]);
              setEndDate(new Date().toISOString().split('T')[0]);
            }}
            style={{ padding: '0.35rem 0.55rem', fontSize: '0.75rem' }}
            title="15-day fortnight report"
          >
            🗓️ 15 Days
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              const d = new Date();
              const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
              setStartDate(start);
              setEndDate(d.toISOString().split('T')[0]);
            }}
            style={{ padding: '0.35rem 0.55rem', fontSize: '0.75rem' }}
          >
            This Month
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              const yr = new Date().getFullYear();
              setStartDate(`${yr}-01-01`);
              setEndDate(`${yr}-12-31`);
            }}
            style={{ padding: '0.35rem 0.55rem', fontSize: '0.75rem' }}
          >
            This Year
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setStartDate('1900-01-01');
              setEndDate(new Date().toISOString().split('T')[0]);
            }}
            style={{ padding: '0.35rem 0.55rem', fontSize: '0.75rem' }}
            title="From 1900 to present"
          >
            All Time
          </button>
        </div>

        <div style={{ marginLeft: 'auto', alignSelf: 'flex-end', display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={loadReport}>
            🔄 Refresh
          </button>
          <button className="btn btn-primary" onClick={exportToCSV} disabled={reportData.length === 0}>
            📥 Export to CSV
          </button>
        </div>
      </div>

      {/* Report Data Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ fontWeight: '700', fontSize: '1rem' }}>
            Results ({reportData.length} Records)
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Generating report...</div>
        ) : reportData.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No records found for the applied filter combination.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  {Object.keys(reportData[0]).map((key) => (
                    <th key={key} style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>
                      {key.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportData.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {Object.values(row).map((val, cIdx) => (
                      <td key={cIdx} style={{ padding: '0.75rem 1rem' }}>
                        {String(val ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default ReportsPage;
