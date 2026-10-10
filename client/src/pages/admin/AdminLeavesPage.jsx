import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import {
  getAllLeaves,
  updateLeaveStatus,
  scheduleLeave,
  getLeaveBalances,
  adjustLeaveBalance,
  getLeavePolicies,
  createLeavePolicy,
  updateLeavePolicy,
  deleteLeavePolicy,
  getLeaveSummaryReport,
} from '../../services/leaveService';
import { getHolidays } from '../../services/holidayService';
import { getEmployees } from '../../services/employeeService';
import { exportToCsv } from '../../utils/csvUtils';

function AdminLeavesPage() {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'all' | 'summary' | 'balances' | 'policies'
  const [leaves, setLeaves] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Leave Summary & Holidays State
  const [summaryYear, setSummaryYear] = useState(new Date().getFullYear());
  const [summaryData, setSummaryData] = useState([]);
  const [holidaysList, setHolidaysList] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  // Decision Modal
  const [actionModal, setActionModal] = useState(null); // { leave, action: 'APPROVED' | 'REJECTED' }
  const [adminRemarks, setAdminRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Schedule Leave Modal
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    employee_id: '',
    leave_type: 'PAID_LEAVE',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    is_half_day: false,
    reason: '',
  });
  const [scheduleError, setScheduleError] = useState('');
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);

  // Balance Adjustments State
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [employeeBalances, setEmployeeBalances] = useState([]);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [adjustModal, setAdjustModal] = useState(null); // { balance, days_delta: 0, reason: '' }
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [adjustError, setAdjustError] = useState('');

  // Policy CRUD Modal
  const [policyModal, setPolicyModal] = useState(null); // { mode: 'create' | 'edit', policy, form }
  const [policySubmitting, setPolicySubmitting] = useState(false);
  const [policyError, setPolicyError] = useState('');

  // Load Main Data
  const loadData = async () => {
    setLoading(true);
    try {
      const [leavesRes, policiesRes, empRes] = await Promise.all([
        getAllLeaves({
          status: activeTab === 'pending' ? 'PENDING' : statusFilter || undefined,
          leave_type: typeFilter || undefined,
        }),
        getLeavePolicies(),
        getEmployees({ status: 'ACTIVE' }),
      ]);

      if (leavesRes.success) setLeaves(leavesRes.data);
      if (policiesRes.success) setPolicies(policiesRes.data);
      if (empRes.success) {
        setEmployees(empRes.data);
        if (empRes.data.length > 0 && !selectedEmpId) {
          setSelectedEmpId(empRes.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load leaves:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, statusFilter, typeFilter]);

  // Load employee balances when selectedEmpId changes in Balances tab
  const loadEmployeeBalances = async (empId) => {
    if (!empId) return;
    setLoadingBalances(true);
    try {
      const res = await getLeaveBalances(empId);
      if (res.success) {
        setEmployeeBalances(res.data);
      }
    } catch (err) {
      console.error('Failed to load employee balances:', err);
    } finally {
      setLoadingBalances(false);
    }
  };

  const loadSummaryReport = async (yr = summaryYear) => {
    setLoadingSummary(true);
    try {
      const [sumRes, holRes] = await Promise.all([
        getLeaveSummaryReport({ year: yr }),
        getHolidays({ year: yr }),
      ]);
      if (sumRes.success) setSummaryData(sumRes.data || []);
      if (holRes.success) setHolidaysList(holRes.data || []);
    } catch (err) {
      console.error('Failed to load leave summary report:', err);
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'balances' && selectedEmpId) {
      loadEmployeeBalances(selectedEmpId);
    }
  }, [activeTab, selectedEmpId]);

  useEffect(() => {
    if (activeTab === 'summary') {
      loadSummaryReport(summaryYear);
    }
  }, [activeTab, summaryYear]);

  const handleExportAllLeavesCsv = () => {
    if (!leaves || leaves.length === 0) {
      alert('No leave records to export.');
      return;
    }

    const columns = [
      { key: 'emp_code', label: 'Employee ID', format: (_, r) => r.employee?.employee_code || 'N/A' },
      { key: 'applicant', label: 'Applicant Name', format: (_, r) => r.employee ? `${r.employee.first_name} ${r.employee.last_name}` : 'Unknown' },
      { key: 'designation', label: 'Designation / Post', format: (_, r) => r.employee?.designation || '' },
      { key: 'leave_type', label: 'Leave Type', format: (v) => v.replace(/_/g, ' ') },
      { key: 'paid_status', label: 'Paid / Unpaid', format: (_, r) => String(r.leave_type).includes('UNPAID') ? 'UNPAID' : 'PAID' },
      { key: 'start_date', label: 'Start Date' },
      { key: 'end_date', label: 'End Date' },
      { key: 'total_days', label: 'Duration (Days)' },
      { key: 'is_half_day', label: 'Half Day', format: (v) => v ? 'Yes (0.5d)' : 'No' },
      { key: 'reason', label: 'Reason' },
      { key: 'status', label: 'Approval Status' },
      { key: 'reviewer', label: 'Reviewed By', format: (_, r) => r.reviewer ? `${r.reviewer.first_name} ${r.reviewer.last_name}` : 'Pending' },
      { key: 'admin_remarks', label: 'Admin Remarks', format: (v) => v || 'None' },
      { key: 'created_at', label: 'Applied On', format: (v) => v ? v.slice(0, 10) : '' },
    ];

    exportToCsv('vaidimi_all_leaves_history.csv', leaves, columns);
  };

  const handleExportSummaryCsv = () => {
    if (!summaryData || summaryData.length === 0) {
      alert('No summary records to export.');
      return;
    }

    const columns = [
      { key: 'employee_code', label: 'Employee ID' },
      { key: 'name', label: 'Employee Full Name' },
      { key: 'designation', label: 'Designation / Post' },
      { key: 'gender', label: 'Gender' },
      { key: 'year', label: 'Year' },
      { key: 'total_leaves_taken', label: 'Total Leaves Taken (Days)' },
      { key: 'paid_leaves', label: 'Total Paid Leaves (Days)' },
      { key: 'unpaid_leaves', label: 'Total Unpaid Leaves (Days)' },
      { key: 'sick_leaves', label: 'Sick Leaves (Days)' },
      { key: 'casual_leaves', label: 'Casual Leaves (Days)' },
      { key: 'festival_leaves', label: 'Festival Leaves (Days)' },
      { key: 'menstrual_leaves', label: 'Menstrual Leaves (Days)' },
      { key: 'total_requests', label: 'Total Leave Requests' },
      { key: 'approved_count', label: 'Approved Requests' },
      { key: 'pending_count', label: 'Pending Requests' },
      { key: 'rejected_count', label: 'Rejected Requests' },
    ];

    exportToCsv(`vaidimi_employee_leave_summary_${summaryYear}.csv`, summaryData, columns);
  };

  const handleExportHolidaysCsv = () => {
    if (!holidaysList || holidaysList.length === 0) {
      alert('No holiday records available to export.');
      return;
    }
    const columns = [
      { key: 'name', label: 'Holiday Name' },
      { key: 'date', label: 'Date' },
      { key: 'is_paid', label: 'Paid Holiday', format: (v) => v ? 'TRUE' : 'FALSE' },
      { key: 'applicable_to', label: 'Applicable To' },
      { key: 'description', label: 'Description' },
    ];
    exportToCsv(`vaidimi_company_holidays_${summaryYear}.csv`, holidaysList, columns);
  };

  // Handle Approve / Reject Submission
  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await updateLeaveStatus(actionModal.leave.id, actionModal.action, adminRemarks);
      if (res.success) {
        setActionModal(null);
        setAdminRemarks('');
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update leave status');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Schedule Leave
  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setScheduleError('');
    if (!scheduleForm.employee_id) {
      setScheduleError('Please select an employee.');
      return;
    }
    if (new Date(scheduleForm.start_date) > new Date(scheduleForm.end_date)) {
      setScheduleError('Start date cannot be after end date.');
      return;
    }
    if (!scheduleForm.reason.trim()) {
      setScheduleError('Reason is required.');
      return;
    }

    setScheduleSubmitting(true);
    try {
      const res = await scheduleLeave(scheduleForm);
      if (res.success) {
        setScheduleModalOpen(false);
        setScheduleForm({
          employee_id: employees[0]?.id || '',
          leave_type: 'PAID_LEAVE',
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
          is_half_day: false,
          reason: '',
        });
        loadData();
      }
    } catch (err) {
      setScheduleError(err.response?.data?.message || err.message || 'Failed to schedule leave.');
    } finally {
      setScheduleSubmitting(false);
    }
  };

  // Handle Adjust Balance (Increase / Decrease Quota)
  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    setAdjustError('');
    const delta = parseFloat(adjustModal.days_delta);
    if (isNaN(delta) || delta === 0) {
      setAdjustError('Please enter a valid number of days (+ to increase, - to decrease).');
      return;
    }

    setAdjustSubmitting(true);
    try {
      const res = await adjustLeaveBalance({
        employee_id: selectedEmpId,
        leave_type: adjustModal.balance.leave_type,
        days_delta: delta,
        reason: adjustModal.reason.trim(),
      });
      if (res.success) {
        setAdjustModal(null);
        loadEmployeeBalances(selectedEmpId);
      }
    } catch (err) {
      setAdjustError(err.response?.data?.message || err.message || 'Failed to adjust balance.');
    } finally {
      setAdjustSubmitting(false);
    }
  };

  // Handle Policy Save
  const handlePolicySubmit = async (e) => {
    e.preventDefault();
    setPolicyError('');
    setPolicySubmitting(true);
    try {
      if (policyModal.mode === 'create') {
        await createLeavePolicy(policyModal.form);
      } else {
        await updateLeavePolicy(policyModal.policy.id, policyModal.form);
      }
      setPolicyModal(null);
      loadData();
    } catch (err) {
      setPolicyError(err.response?.data?.message || 'Action failed');
    } finally {
      setPolicySubmitting(false);
    }
  };

  const handleDeletePolicy = async (p) => {
    if (!window.confirm(`Are you sure you want to delete policy '${p.name}'?`)) return;
    try {
      await deleteLeavePolicy(p.id);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete policy');
    }
  };

  // Export Leaves to CSV
  const handleExportCsv = () => {
    const columns = [
      { key: 'applicant', label: 'Applicant Name', format: (_, r) => (r.employee ? `${r.employee.first_name} ${r.employee.last_name}` : 'Unknown') },
      { key: 'code', label: 'Employee Code', format: (_, r) => r.employee?.employee_code || '' },
      { key: 'leave_type', label: 'Leave Type' },
      { key: 'start_date', label: 'Start Date' },
      { key: 'end_date', label: 'End Date' },
      { key: 'total_days', label: 'Total Days' },
      { key: 'status', label: 'Status' },
      { key: 'reason', label: 'Reason' },
      { key: 'admin_remarks', label: 'Admin Remarks' },
      { key: 'reviewed_by', label: 'Reviewed By', format: (_, r) => (r.reviewer ? `${r.reviewer.first_name} ${r.reviewer.last_name}` : '') },
    ];

    exportToCsv('vaidimi_leave_applications.csv', filteredLeaves, columns);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return <span className="badge badge-success">Approved</span>;
      case 'REJECTED':
        return <span className="badge badge-danger">Rejected</span>;
      case 'CANCELLED':
        return <span className="badge" style={{ backgroundColor: 'var(--bg-subtle)' }}>Cancelled</span>;
      default:
        return <span className="badge badge-warning">Pending Review</span>;
    }
  };

  const getLeaveTypeBadge = (type) => {
    if (type === 'MENSTRUAL_LEAVE') {
      return <span className="badge" style={{ backgroundColor: '#fce7f3', color: '#be185d', border: '1px solid #fbcfe8' }}>Menstrual Leave 🔒</span>;
    }
    if (type === 'SICK_LEAVE') return <span className="badge badge-danger">Sick Leave</span>;
    if (type === 'FESTIVAL_LEAVE') return <span className="badge" style={{ backgroundColor: '#fef3c7', color: '#b45309' }}>Festival Leave</span>;
    if (type === 'UNPAID_LEAVE') return <span className="badge badge-info">Unpaid Leave</span>;
    return <span className="badge badge-primary">{type.replace(/_/g, ' ')}</span>;
  };

  const pendingCount = leaves.filter((l) => l.status === 'PENDING').length;

  // Filtered leaves for search
  const filteredLeaves = leaves.filter((l) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    const name = l.employee ? `${l.employee.first_name} ${l.employee.last_name}`.toLowerCase() : '';
    const code = l.employee?.employee_code?.toLowerCase() || '';
    const reason = l.reason?.toLowerCase() || '';
    return name.includes(term) || code.includes(term) || reason.includes(term);
  });

  const selectedEmployeeObj = employees.find((e) => String(e.id) === String(selectedEmpId));

  return (
    <AppLayout
      pageTitle="Leave Management"
      subtitle="Vaidimi Corporate Head Office (Varanasi HQ) • Review staff applications, quotas (14 Paid Leaves, 2/mo Sick, 12/yr Period), and corporate policies"
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
              Head Office Leave Governance • Quota Policy: 14 Paid Leaves/Yr • Max 2 Days/Mo Sick Leave • 12 Days/Yr Menstrual Leave
            </div>
          </div>
        </div>
      </div>

      {/* Top Controls Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className="btn"
            onClick={() => setActiveTab('pending')}
            style={{
              backgroundColor: activeTab === 'pending' ? 'var(--primary)' : 'var(--bg-card)',
              color: activeTab === 'pending' ? '#ffffff' : 'var(--text-main)',
              fontWeight: '700',
              border: '1px solid var(--border-color)',
            }}
          >
            ⏳ Pending Approvals {pendingCount > 0 && <span className="badge" style={{ backgroundColor: '#ffffff', color: 'var(--primary)', marginLeft: '0.375rem' }}>{pendingCount}</span>}
          </button>
          <button
            className="btn"
            onClick={() => setActiveTab('all')}
            style={{
              backgroundColor: activeTab === 'all' ? 'var(--primary)' : 'var(--bg-card)',
              color: activeTab === 'all' ? '#ffffff' : 'var(--text-main)',
              fontWeight: '700',
              border: '1px solid var(--border-color)',
            }}
          >
            📋 All Leaves History
          </button>
          <button
            className="btn"
            onClick={() => setActiveTab('summary')}
            style={{
              backgroundColor: activeTab === 'summary' ? 'var(--primary)' : 'var(--bg-card)',
              color: activeTab === 'summary' ? '#ffffff' : 'var(--text-main)',
              fontWeight: '700',
              border: '1px solid var(--border-color)',
            }}
          >
            📊 Leaves & Holiday Breakdown / Export
          </button>
          <button
            className="btn"
            onClick={() => setActiveTab('balances')}
            style={{
              backgroundColor: activeTab === 'balances' ? 'var(--primary)' : 'var(--bg-card)',
              color: activeTab === 'balances' ? '#ffffff' : 'var(--text-main)',
              fontWeight: '700',
              border: '1px solid var(--border-color)',
            }}
          >
            ⚖️ Quota & Balance Adjustments
          </button>
          <button
            className="btn"
            onClick={() => setActiveTab('policies')}
            style={{
              backgroundColor: activeTab === 'policies' ? 'var(--primary)' : 'var(--bg-card)',
              color: activeTab === 'policies' ? '#ffffff' : 'var(--text-main)',
              fontWeight: '700',
              border: '1px solid var(--border-color)',
            }}
          >
            ⚙️ Leave Policies
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {activeTab === 'all' && (
            <button className="btn btn-secondary" onClick={handleExportAllLeavesCsv} style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              📥 Export All Leaves (CSV)
            </button>
          )}

          {activeTab === 'summary' && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={handleExportSummaryCsv} style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                📥 Export Employee Leave Summary (CSV)
              </button>
              <button className="btn btn-secondary" onClick={handleExportHolidaysCsv} style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                🎉 Export Company Holidays (CSV)
              </button>
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={() => {
              setScheduleError('');
              setScheduleModalOpen(true);
            }}
          >
            🏖️ Add / Schedule Employee Leave
          </button>
        </div>
      </div>

      {/* TAB 1 & 2: Pending & All Leaves Tables */}
      {(activeTab === 'pending' || activeTab === 'all') && (
        <>
          {/* Filters Bar for All Leaves */}
          {activeTab === 'all' && (
            <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <input
                    type="text"
                    placeholder="🔍 Search applicant name, employee code, or reason..."
                    className="form-input"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                  />
                </div>

                <select
                  className="form-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ width: '160px' }}
                >
                  <option value="">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>

                <select
                  className="form-select"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  style={{ width: '180px' }}
                >
                  <option value="">All Leave Types</option>
                  <option value="PAID_LEAVE">Paid Leave</option>
                  <option value="SICK_LEAVE">Sick Leave</option>
                  <option value="CASUAL_LEAVE">Casual Leave</option>
                  <option value="FESTIVAL_LEAVE">Festival Leave</option>
                  <option value="MENSTRUAL_LEAVE">Menstrual Leave</option>
                  <option value="UNPAID_LEAVE">Unpaid Leave</option>
                </select>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading leave applications...</div>
            ) : filteredLeaves.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                {activeTab === 'pending' ? '🎉 No pending leave requests awaiting approval.' : 'No leave requests found matching filters.'}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', backgroundColor: 'var(--bg-subtle)' }}>
                      <th style={{ padding: '0.875rem 1rem', textAlign: 'left' }}>Applicant</th>
                      <th style={{ padding: '0.875rem 1rem', textAlign: 'left' }}>Leave Type</th>
                      <th style={{ padding: '0.875rem 1rem', textAlign: 'left' }}>Duration / Dates</th>
                      <th style={{ padding: '0.875rem 1rem', textAlign: 'left' }}>Days</th>
                      <th style={{ padding: '0.875rem 1rem', textAlign: 'left' }}>Reason & Notes</th>
                      <th style={{ padding: '0.875rem 1rem', textAlign: 'left' }}>Status</th>
                      <th style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeaves.map((l) => (
                      <tr key={l.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>
                            {l.employee ? `${l.employee.first_name} ${l.employee.last_name}` : 'Unknown'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <strong style={{ color: 'var(--primary)' }}>{l.employee?.employee_code}</strong> &bull; {l.employee?.designation}
                          </div>
                        </td>
                        <td style={{ padding: '0.875rem 1rem' }}>{getLeaveTypeBadge(l.leave_type)}</td>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <div style={{ fontWeight: '600' }}>{l.start_date}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>to {l.end_date}</div>
                        </td>
                        <td style={{ padding: '0.875rem 1rem', fontWeight: '700' }}>
                          {l.total_days} day{l.total_days > 1 ? 's' : ''}
                        </td>
                        <td style={{ padding: '0.875rem 1rem', maxWidth: '280px' }}>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--text-main)' }}>{l.reason}</div>
                          {l.admin_remarks && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '0.25rem' }}>
                              <em>Remarks: {l.admin_remarks}</em>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.875rem 1rem' }}>{getStatusBadge(l.status)}</td>
                        <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                          {l.status === 'PENDING' ? (
                            <div style={{ display: 'inline-flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button
                                className="btn"
                                onClick={() => setActionModal({ leave: l, action: 'APPROVED' })}
                                style={{ backgroundColor: '#059669', color: '#ffffff', fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                              >
                                ✅ Approve
                              </button>
                              <button
                                className="btn"
                                onClick={() => setActionModal({ leave: l, action: 'REJECTED' })}
                                style={{ backgroundColor: '#dc2626', color: '#ffffff', fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                              >
                                ❌ Reject
                              </button>
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Reviewed by {l.reviewer ? `${l.reviewer.first_name}` : 'Admin'}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* TAB 3: Employee Leave Quotas & Balance Adjustments */}
      {activeTab === 'balances' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Employee Leave Quotas & Balances</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Increase or decrease annual leave allowances, grant bonus leaves, or make policy adjustments.
              </p>
            </div>

            {/* Employee Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: '700' }}>Select Employee:</label>
              <select
                className="form-select"
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                style={{ width: '280px' }}
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} ({emp.employee_code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedEmployeeObj && (
            <div style={{
              padding: '1rem',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}>
              <div>
                <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>
                  {selectedEmployeeObj.first_name} {selectedEmployeeObj.last_name}
                </strong>
                <span style={{ marginLeft: '0.5rem', fontFamily: 'var(--font-mono)', color: 'var(--primary)', fontWeight: '700' }}>
                  {selectedEmployeeObj.employee_code}
                </span>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  {selectedEmployeeObj.designation} &bull; {selectedEmployeeObj.department?.department_name || 'General'}
                </div>
              </div>
              <span className="badge badge-info">
                Year: {new Date().getFullYear()} Quota Audit
              </span>
            </div>
          )}

          {loadingBalances ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading live leave balances...</div>
          ) : employeeBalances.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No balances recorded for this employee yet.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', backgroundColor: 'var(--bg-subtle)' }}>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Leave Type</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Total Quota (Days)</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Used Days</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Pending Requests</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Remaining Available</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Authority Action</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeBalances.map((b) => (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.875rem 1rem', fontWeight: '700' }}>
                        {getLeaveTypeBadge(b.leave_type)}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', textAlign: 'center', fontWeight: '700' }}>
                        {b.total_days} days
                      </td>
                      <td style={{ padding: '0.875rem 1rem', textAlign: 'center', color: 'var(--danger)', fontWeight: '600' }}>
                        {b.used_days} days
                      </td>
                      <td style={{ padding: '0.875rem 1rem', textAlign: 'center', color: 'var(--warning)', fontWeight: '600' }}>
                        {b.pending_days || 0} days
                      </td>
                      <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                        <span className="badge badge-success" style={{ fontSize: '0.8125rem', padding: '0.25rem 0.6rem' }}>
                          {b.remaining_days} days left
                        </span>
                      </td>
                      <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary"
                          onClick={() => {
                            setAdjustError('');
                            setAdjustModal({
                              balance: b,
                              days_delta: 1,
                              reason: '',
                            });
                          }}
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.35rem 0.75rem',
                            color: 'var(--primary)',
                            borderColor: 'var(--primary)',
                            fontWeight: '700',
                          }}
                        >
                          ➕ / ➖ Adjust Days
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Company Leave Policies */}
      {activeTab === 'policies' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Company Leave Policies & Default Quotas</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Configure standard company-wide annual allowances, sensitivity tags, and compensation.
              </p>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => {
                setPolicyError('');
                setPolicyModal({
                  mode: 'create',
                  policy: null,
                  form: { code: '', name: '', default_days: 10, is_paid: true, is_sensitive: false, description: '' },
                });
              }}
            >
              ➕ Add New Policy
            </button>
          </div>

          <div className="grid grid-cols-3" style={{ gap: '1.25rem' }}>
            {policies.map((p) => (
              <div key={p.id} className="card" style={{ borderLeft: `4px solid ${p.is_sensitive ? '#ec4899' : 'var(--primary)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div>
                    <span style={{ fontWeight: '800', fontSize: '1.05rem', color: 'var(--text-main)' }}>{p.name}</span>
                    <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{p.code}</div>
                  </div>
                  {p.is_sensitive && <span className="badge" style={{ backgroundColor: '#fce7f3', color: '#be185d' }}>Confidential 🔒</span>}
                </div>

                <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main)', margin: '0.75rem 0 0.25rem 0' }}>
                  {p.default_days > 0 ? `${p.default_days} Days / Yr` : 'Unlimited / Demand'}
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  {p.is_paid ? '✅ Paid Leave Benefit' : '⚠️ Loss of Pay (Unpaid)'}
                </div>

                {p.description && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '1rem' }}>
                    {p.description}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setPolicyError('');
                      setPolicyModal({
                        mode: 'edit',
                        policy: p,
                        form: {
                          code: p.code,
                          name: p.name,
                          default_days: p.default_days,
                          is_paid: p.is_paid,
                          is_sensitive: p.is_sensitive,
                          description: p.description || '',
                        },
                      });
                    }}
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', flex: 1 }}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleDeletePolicy(p)}
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: 'var(--danger)' }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: Corporate Leave & Holiday Summary & Export */}
      {activeTab === 'summary' && (
        <div>
          {/* Header & Year Filter */}
          <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem 1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>
                  📊 Corporate Leave & Holiday Summary ({summaryYear})
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Aggregated employee-level breakdown of Paid, Unpaid, Sick, Casual, Festival, and Menstrual leaves taken.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: '600' }}>Year:</label>
                  <select
                    value={summaryYear}
                    onChange={(e) => setSummaryYear(parseInt(e.target.value))}
                    className="form-select"
                    style={{ width: '110px' }}
                  >
                    {[2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                <button
                  className="btn btn-secondary"
                  onClick={handleExportSummaryCsv}
                  disabled={summaryData.length === 0}
                  style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  📥 Export Summary (.csv)
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={handleExportHolidaysCsv}
                  disabled={holidaysList.length === 0}
                  style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  🎉 Export Holidays (.csv)
                </button>
              </div>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="card" style={{ borderLeft: '4px solid var(--primary)', padding: '1rem 1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Staff</div>
              <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', margin: '0.25rem 0' }}>{summaryData.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Employees tracked</div>
            </div>

            <div className="card" style={{ borderLeft: '4px solid #10b981', padding: '1rem 1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#059669', textTransform: 'uppercase' }}>Paid Leaves (Total)</div>
              <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#059669', margin: '0.25rem 0' }}>
                {summaryData.reduce((acc, curr) => acc + Number(curr.paid_leaves || 0), 0)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>100% salary credited</div>
            </div>

            <div className="card" style={{ borderLeft: '4px solid #ef4444', padding: '1rem 1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#dc2626', textTransform: 'uppercase' }}>Unpaid Leaves</div>
              <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#dc2626', margin: '0.25rem 0' }}>
                {summaryData.reduce((acc, curr) => acc + Number(curr.unpaid_leaves || 0), 0)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Loss of pay / deducted</div>
            </div>

            <div className="card" style={{ borderLeft: '4px solid #f87171', padding: '1rem 1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#b91c1c', textTransform: 'uppercase' }}>Sick Leaves</div>
              <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#b91c1c', margin: '0.25rem 0' }}>
                {summaryData.reduce((acc, curr) => acc + Number(curr.sick_leaves || 0), 0)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Medical / illness</div>
            </div>

            <div className="card" style={{ borderLeft: '4px solid #6366f1', padding: '1rem 1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#4f46e5', textTransform: 'uppercase' }}>Casual Leaves</div>
              <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#4f46e5', margin: '0.25rem 0' }}>
                {summaryData.reduce((acc, curr) => acc + Number(curr.casual_leaves || 0), 0)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Personal days off</div>
            </div>

            <div className="card" style={{ borderLeft: '4px solid #ec4899', padding: '1rem 1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#be185d', textTransform: 'uppercase' }}>🌸 Menstrual Leaves</div>
              <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#be185d', margin: '0.25rem 0' }}>
                {summaryData.reduce((acc, curr) => acc + Number(curr.menstrual_leaves || 0), 0)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Female welfare benefit</div>
            </div>

            <div className="card" style={{ borderLeft: '4px solid #f59e0b', padding: '1rem 1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#b45309', textTransform: 'uppercase' }}>Company Holidays</div>
              <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#b45309', margin: '0.25rem 0' }}>
                {holidaysList.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Official gazetted</div>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.9375rem' }}>
                Employee-Wise Leave Quota & Consumed Days
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Showing <strong>{summaryData.length}</strong> employees
              </div>
            </div>

            {loadingSummary ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading leave & holiday summary...</div>
            ) : summaryData.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No employee records found.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', backgroundColor: 'var(--bg-subtle)' }}>
                      <th style={{ padding: '0.875rem 1rem', textAlign: 'left' }}>Employee</th>
                      <th style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>Total Taken</th>
                      <th style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>Paid Leaves</th>
                      <th style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>Unpaid</th>
                      <th style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>Sick</th>
                      <th style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>Casual</th>
                      <th style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>Festival</th>
                      <th style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>🌸 Menstrual</th>
                      <th style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>Applications</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryData.map((emp) => (
                      <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <div style={{ fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            {emp.name}
                            {emp.gender === 'FEMALE' && (
                              <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.35rem', backgroundColor: '#fce7f3', color: '#be185d', borderRadius: '4px', fontWeight: '600' }}>
                                Female
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <strong style={{ color: 'var(--primary)' }}>{emp.employee_code}</strong> &bull; {emp.designation}
                          </div>
                        </td>
                        <td style={{ padding: '0.875rem 1rem', textAlign: 'center', fontWeight: '800', color: emp.total_leaves_taken > 0 ? 'var(--text-main)' : 'var(--text-muted)' }}>
                          {emp.total_leaves_taken} days
                        </td>
                        <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                          <span className="badge badge-success" style={{ fontWeight: '700' }}>
                            {emp.paid_leaves}d
                          </span>
                        </td>
                        <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                          {emp.unpaid_leaves > 0 ? (
                            <span className="badge badge-danger" style={{ fontWeight: '700' }}>
                              {emp.unpaid_leaves}d
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>0</span>
                          )}
                        </td>
                        <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                          {emp.sick_leaves > 0 ? <span style={{ fontWeight: '600', color: '#b91c1c' }}>{emp.sick_leaves}d</span> : <span style={{ color: 'var(--text-muted)' }}>0</span>}
                        </td>
                        <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                          {emp.casual_leaves > 0 ? <span style={{ fontWeight: '600', color: '#3730a3' }}>{emp.casual_leaves}d</span> : <span style={{ color: 'var(--text-muted)' }}>0</span>}
                        </td>
                        <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                          {emp.festival_leaves > 0 ? <span style={{ fontWeight: '600', color: '#b45309' }}>{emp.festival_leaves}d</span> : <span style={{ color: 'var(--text-muted)' }}>0</span>}
                        </td>
                        <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                          {emp.gender === 'FEMALE' ? (
                            emp.menstrual_leaves > 0 ? (
                              <span style={{ fontWeight: '700', color: '#be185d', backgroundColor: '#fce7f3', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                🌸 {emp.menstrual_leaves}d
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>0 (Available)</span>
                            )
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>N/A</span>
                          )}
                        </td>
                        <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontSize: '0.8125rem' }}>
                          <span style={{ color: '#059669', fontWeight: '600' }}>{emp.approved_count} Approved</span>
                          {emp.pending_count > 0 && <span style={{ color: '#d97706', fontWeight: '600', marginLeft: '0.35rem' }}>&bull; {emp.pending_count} Pending</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: Decision Modal (Approve / Reject with remarks) */}
      {actionModal && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '440px', padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.5rem' }}>
              {actionModal.action === 'APPROVED' ? '✅ Approve Leave Application' : '❌ Reject Leave Application'}
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Confirm action for <strong>{actionModal.leave.employee?.first_name} {actionModal.leave.employee?.last_name}</strong> ({actionModal.leave.total_days} days of {actionModal.leave.leave_type}).
            </p>

            <form onSubmit={handleUpdateStatus}>
              <div className="form-group">
                <label className="form-label">Admin / Reviewer Remarks (Optional)</label>
                <textarea
                  className="form-textarea"
                  rows="3"
                  placeholder="e.g. Approved as requested / Reschedule due to release"
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setActionModal(null)}>Cancel</button>
                <button
                  type="submit"
                  className="btn"
                  disabled={submitting}
                  style={{
                    backgroundColor: actionModal.action === 'APPROVED' ? '#059669' : '#dc2626',
                    color: '#ffffff',
                  }}
                >
                  {submitting ? 'Updating...' : `Confirm ${actionModal.action === 'APPROVED' ? 'Approval' : 'Rejection'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add / Schedule Employee Leave Modal */}
      {scheduleModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '520px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>
                  🏖️ Add / Schedule Employee Leave
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Directly schedule and approve leave on behalf of an employee
                </p>
              </div>
              <button
                type="button"
                onClick={() => setScheduleModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            {scheduleError && (
              <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.8125rem' }}>
                ⚠️ {scheduleError}
              </div>
            )}

            <form onSubmit={handleScheduleSubmit}>
              <div className="form-group">
                <label className="form-label">Select Employee <span className="required">*</span></label>
                <select
                  className="form-select"
                  value={scheduleForm.employee_id}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, employee_id: e.target.value })}
                  required
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_code}) &bull; {emp.designation}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Leave Type <span className="required">*</span></label>
                <select
                  className="form-select"
                  value={scheduleForm.leave_type}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, leave_type: e.target.value })}
                >
                  <option value="PAID_LEAVE">Paid Leave</option>
                  <option value="SICK_LEAVE">Sick Leave</option>
                  <option value="CASUAL_LEAVE">Casual Leave</option>
                  <option value="FESTIVAL_LEAVE">Festival Leave</option>
                  {employees.find((e) => String(e.id) === String(scheduleForm.employee_id))?.gender === 'FEMALE' && (
                    <option value="MENSTRUAL_LEAVE">🌸 Menstrual Leave (Female Staff Benefit)</option>
                  )}
                  <option value="UNPAID_LEAVE">Unpaid Leave</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Start Date <span className="required">*</span></label>
                  <input
                    type="date"
                    className="form-input"
                    min="1900-01-01"
                    max="2199-12-31"
                    value={scheduleForm.start_date}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, start_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date <span className="required">*</span></label>
                  <input
                    type="date"
                    className="form-input"
                    min="1900-01-01"
                    max="2199-12-31"
                    value={scheduleForm.end_date}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8125rem' }}>
                  <input
                    type="checkbox"
                    checked={scheduleForm.is_half_day}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, is_half_day: e.target.checked })}
                  />
                  <span>Half Day Leave (0.5 day)</span>
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">Reason / Admin Notes <span className="required">*</span></label>
                <textarea
                  className="form-textarea"
                  rows="3"
                  placeholder="e.g. Approved leave for medical reasons / pre-arranged personal time off"
                  value={scheduleForm.reason}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, reason: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setScheduleModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={scheduleSubmitting}>
                  {scheduleSubmitting ? 'Scheduling...' : 'Schedule & Approve Leave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Adjust Leave Balance Modal (Increase / Decrease Days) */}
      {adjustModal && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '460px', padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.25rem' }}>
              ⚖️ Adjust Leave Quota
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Modify <strong>{adjustModal.balance.leave_type}</strong> for <strong>{selectedEmployeeObj?.first_name} {selectedEmployeeObj?.last_name}</strong>
            </p>

            <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
              <span>Current Total: <strong>{adjustModal.balance.total_days} days</strong></span>
              <span>Available: <strong style={{ color: 'var(--success)' }}>{adjustModal.balance.remaining_days} days</strong></span>
            </div>

            {adjustError && (
              <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.8125rem' }}>
                ⚠️ {adjustError}
              </div>
            )}

            <form onSubmit={handleAdjustSubmit}>
              <div className="form-group">
                <label className="form-label">
                  Days to Add or Subtract (+ to increase, - to decrease) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  className="form-input"
                  placeholder="e.g. +3 to add 3 days, or -2 to deduct 2 days"
                  value={adjustModal.days_delta}
                  onChange={(e) => setAdjustModal({ ...adjustModal, days_delta: e.target.value })}
                  required
                />
                <div className="form-helper">
                  Positive number adds days to total and remaining. Negative number deducts days.
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Adjustment Reason / Notes</label>
                <textarea
                  className="form-textarea"
                  rows="2"
                  placeholder="e.g. Exceptional project performance bonus days / Policy violation deduction"
                  value={adjustModal.reason}
                  onChange={(e) => setAdjustModal({ ...adjustModal, reason: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setAdjustModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={adjustSubmitting}>
                  {adjustSubmitting ? 'Saving...' : 'Apply Quota Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Create / Edit Leave Policy Modal */}
      {policyModal && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '480px', padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.5rem' }}>
              {policyModal.mode === 'create' ? '➕ Create New Leave Policy' : `✏️ Edit ${policyModal.policy?.name}`}
            </h3>

            {policyError && (
              <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.8125rem' }}>
                ⚠️ {policyError}
              </div>
            )}

            <form onSubmit={handlePolicySubmit}>
              {policyModal.mode === 'create' && (
                <div className="form-group">
                  <label className="form-label">Policy Code <span className="required">*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. BEREAVEMENT_LEAVE"
                    value={policyModal.form.code}
                    onChange={(e) => setPolicyModal({ ...policyModal, form: { ...policyModal.form, code: e.target.value } })}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Policy Name <span className="required">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Bereavement Leave"
                  value={policyModal.form.name}
                  onChange={(e) => setPolicyModal({ ...policyModal, form: { ...policyModal.form, name: e.target.value } })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Default Annual Days</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  value={policyModal.form.default_days}
                  onChange={(e) => setPolicyModal({ ...policyModal, form: { ...policyModal.form, default_days: e.target.value } })}
                />
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.8125rem' }}>
                  <input
                    type="checkbox"
                    checked={policyModal.form.is_paid}
                    onChange={(e) => setPolicyModal({ ...policyModal, form: { ...policyModal.form, is_paid: e.target.checked } })}
                  />
                  <span>Is Paid Leave</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.8125rem' }}>
                  <input
                    type="checkbox"
                    checked={policyModal.form.is_sensitive}
                    onChange={(e) => setPolicyModal({ ...policyModal, form: { ...policyModal.form, is_sensitive: e.target.checked } })}
                  />
                  <span>Confidential (Mask Details)</span>
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  rows="2"
                  placeholder="Policy terms and guidelines"
                  value={policyModal.form.description}
                  onChange={(e) => setPolicyModal({ ...policyModal, form: { ...policyModal.form, description: e.target.value } })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setPolicyModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={policySubmitting}>
                  {policySubmitting ? 'Saving...' : 'Save Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default AdminLeavesPage;
