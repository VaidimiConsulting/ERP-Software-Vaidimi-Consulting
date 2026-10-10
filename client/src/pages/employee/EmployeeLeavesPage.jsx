import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { getLeaveBalances, applyLeave, getMyLeaves } from '../../services/leaveService';
import { useAuth } from '../../context/AuthContext';

function EmployeeLeavesPage() {
  const { user } = useAuth();
  const [balances, setBalances] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isFemale = user?.employeeProfile?.gender === 'FEMALE' || balances.some((b) => b.leave_type === 'MENSTRUAL_LEAVE');

  const [formData, setFormData] = useState({
    leave_type: 'PAID_LEAVE',
    start_date: '',
    end_date: '',
    is_half_day: false,
    reason: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [balRes, leavesRes] = await Promise.all([
        getLeaveBalances(),
        getMyLeaves(),
      ]);
      if (balRes.success) setBalances(balRes.data);
      if (leavesRes.success) setLeaves(leavesRes.data);
    } catch (err) {
      console.error('Failed to load employee leave data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const calculateDays = (start, end, half) => {
    if (half) return 0.5;
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    if (s > e) return 0;
    const diff = Math.ceil(Math.abs(e - s) / (1000 * 60 * 60 * 24)) + 1;
    return diff;
  };

  const estimatedDays = calculateDays(formData.start_date, formData.end_date, formData.is_half_day);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    try {
      const res = await applyLeave(formData);
      if (res.success) {
        setShowApplyModal(false);
        setFormData({
          leave_type: 'PAID_LEAVE',
          start_date: '',
          end_date: '',
          is_half_day: false,
          reason: '',
        });
        loadData();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
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
        return <span className="badge badge-warning">Pending Approval</span>;
    }
  };

  return (
    <AppLayout
      pageTitle="My Leaves & Balances"
      subtitle="Vaidimi Corporate Head Office (Varanasi HQ) • Track annual allowances, apply for time off, and monitor request statuses"
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
              14 Paid Leaves/Yr • Sick Leave (Max 2 Days/Mo) • Menstrual Leave (12 Days/Yr for Female Staff)
            </div>
          </div>
        </div>
      </div>

      {/* Header Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '700' }}>Annual Leave Balances</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Year {new Date().getFullYear()} available quotas</p>
        </div>

        <button className="btn btn-primary" onClick={() => setShowApplyModal(true)}>
          ➕ Apply for Leave
        </button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-3" style={{ gap: '1rem', marginBottom: '2rem' }}>
        {balances.map((b) => (
          <div
            key={b.id}
            className="card"
            style={{
              borderLeft: `4px solid ${
                b.leave_type === 'MENSTRUAL_LEAVE'
                  ? '#ec4899'
                  : b.leave_type === 'SICK_LEAVE'
                  ? 'var(--danger)'
                  : 'var(--primary)'
              }`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                {b.leave_type.replace(/_/g, ' ')}
              </span>
              {b.leave_type === 'MENSTRUAL_LEAVE' && (
                <span className="badge" style={{ backgroundColor: '#fce7f3', color: '#be185d', fontSize: '0.6875rem' }}>
                  Private 🔒
                </span>
              )}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
              {b.remaining_days} <span style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--text-muted)' }}>Days Left</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Total: <strong>{b.total_days}</strong> &bull; Used: <strong>{b.used_days}</strong>
            </div>
          </div>
        ))}
      </div>

      {/* My Requests History */}
      <div className="card">
        <div style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '700' }}>My Leave Application History</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>All past and current requests submitted by you</p>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading leave records...</div>
        ) : leaves.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            You have not submitted any leave requests yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Type</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Period</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Duration</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Reason</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Reviewer Remarks</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((l) => (
                  <tr key={l.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>
                      {l.leave_type.replace(/_/g, ' ')}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {l.start_date} to {l.end_date}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>
                      {l.total_days} day{l.total_days > 1 ? 's' : ''} {l.is_half_day ? '(Half Day)' : ''}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-main)', maxWidth: '250px' }}>
                      {l.reason}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>{getStatusBadge(l.status)}</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                      {l.admin_remarks || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div className="card" style={{ width: '480px', maxWidth: '90%' }}>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Apply for Leave</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Select your leave category and dates. Days will be automatically calculated.
            </p>

            {errorMsg && (
              <div style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--danger-bg)',
                color: 'var(--danger)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
                marginBottom: '1rem',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>Leave Type</label>
                <select
                  className="input"
                  value={formData.leave_type}
                  onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                  required
                >
                  <option value="PAID_LEAVE">Paid Leave</option>
                  <option value="SICK_LEAVE">Sick Leave</option>
                  <option value="CASUAL_LEAVE">Casual Leave</option>
                  <option value="FESTIVAL_LEAVE">Festival Leave</option>
                  {isFemale && (
                    <option value="MENSTRUAL_LEAVE">🌸 Menstrual Leave (100% Paid • Confidential 🔒)</option>
                  )}
                  <option value="UNPAID_LEAVE">Unpaid Leave</option>
                </select>
                {isFemale && formData.leave_type === 'MENSTRUAL_LEAVE' && (
                  <div style={{ fontSize: '0.75rem', color: '#be185d', backgroundColor: '#fce7f3', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', marginTop: '0.5rem', border: '1px solid #fbcfe8' }}>
                    🌸 <strong>Female Welfare Benefit</strong>: Menstrual Leave is 100% salary credited with zero deduction and kept strictly confidential.
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>Start Date</label>
                  <input
                    type="date"
                    className="input"
                    min="1900-01-01"
                    max="2199-12-31"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>End Date</label>
                  <input
                    type="date"
                    className="input"
                    min="1900-01-01"
                    max="2199-12-31"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_half_day}
                    onChange={(e) => setFormData({ ...formData, is_half_day: e.target.checked })}
                  />
                  Half Day Request
                </label>

                <div style={{ fontSize: '0.8125rem', fontWeight: '600', color: 'var(--primary)' }}>
                  Duration: {estimatedDays} day{estimatedDays > 1 ? 's' : ''}
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>Reason for Leave</label>
                <textarea
                  className="input"
                  rows="3"
                  placeholder="Provide a brief explanation for your leave request"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowApplyModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default EmployeeLeavesPage;
