import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { getAdminDashboardMetrics } from '../../services/dashboardService';
import { getAllAttendance } from '../../services/attendanceService';
import { getCompanySettings, updateCompanySettings } from '../../services/settingService';
import { getAllLeaves } from '../../services/leaveService';
import { useAuth } from '../../context/AuthContext';

function HrDashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [settings, setSettings] = useState({
    office_start_time: '10:00',
    office_grace_end_time: '11:00',
    office_end_time: '17:30',
  });
  const [loading, setLoading] = useState(true);
  const [isTimingModalOpen, setIsTimingModalOpen] = useState(false);
  const [timingForm, setTimingForm] = useState({
    office_start_time: '10:00',
    office_grace_end_time: '11:00',
    office_end_time: '17:30',
  });
  const [savingTiming, setSavingTiming] = useState(false);

  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const [metricsRes, attRes, leavesRes, setRes] = await Promise.all([
        getAdminDashboardMetrics(),
        getAllAttendance({ date: todayStr }),
        getAllLeaves({ status: 'PENDING' }),
        getCompanySettings(),
      ]);

      if (metricsRes.success) setMetrics(metricsRes.data);
      if (attRes.success) setTodayAttendance(attRes.data);
      if (leavesRes.success) setPendingLeaves(leavesRes.data);
      if (setRes.success && setRes.data) {
        setSettings(setRes.data);
        setTimingForm({
          office_start_time: setRes.data.office_start_time || '10:30',
          office_grace_end_time: setRes.data.office_grace_end_time || '11:00',
          office_end_time: setRes.data.office_end_time || '17:30',
        });
      }
    } catch (err) {
      console.error('Failed to load HR Dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveTiming = async (e) => {
    e.preventDefault();
    setSavingTiming(true);
    try {
      const res = await updateCompanySettings(timingForm);
      if (res.success) {
        setSettings(res.data);
        setIsTimingModalOpen(false);
        alert('Office timing settings updated successfully!');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setSavingTiming(false);
    }
  };

  const presentCount = todayAttendance.filter((a) => a.status === 'PRESENT' && !a.is_late).length;
  const lateCount = todayAttendance.filter((a) => a.status === 'PRESENT' && a.is_late).length;
  const absentCount = todayAttendance.filter((a) => a.status === 'ABSENT').length;
  const onBreakCount = todayAttendance.filter((a) => a.is_on_break).length;
  const signedOutCount = todayAttendance.filter((a) => a.check_out).length;

  return (
    <AppLayout
      pageTitle="HR Executive Portal"
      subtitle="Workforce administration, employee & intern onboarding, attendance audit, and leave requests"
    >
      {/* Branch Scope Banner for HR */}
      <div style={{
        background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
        color: '#ffffff',
        padding: '1.25rem 1.5rem',
        borderRadius: 'var(--radius-lg)',
        marginBottom: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            fontSize: '1.75rem',
            background: 'rgba(255, 255, 255, 0.18)',
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            🏢
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.9, fontWeight: '700' }}>
              HR Operational Jurisdiction & Scope
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', marginTop: '0.1rem' }}>
              {user?.employeeProfile?.branch?.branch_name || 'Headquarters (Corporate Office)'}
            </div>
            <div style={{ fontSize: '0.8rem', opacity: '0.88' }}>
              📍 Location: {user?.employeeProfile?.branch?.city || 'Delhi NCR'} &bull; Branch Code: {user?.employeeProfile?.branch?.branch_code || 'BR-HQ'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{
            background: 'rgba(255, 255, 255, 0.2)',
            padding: '0.45rem 0.9rem',
            borderRadius: '9999px',
            fontSize: '0.8125rem',
            fontWeight: '600'
          }}>
            🛡️ Branch-Scoped Staff Access Active
          </span>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-4" style={{ marginBottom: '1.5rem', gap: '1rem' }}>
        {/* Total Employees */}
        <div
          className="card"
          style={{ borderLeft: '4px solid #8b5cf6', cursor: 'pointer' }}
          onClick={() => navigate('/hr/employees')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: 'var(--text-muted)' }}>Employees</span>
            <span style={{ fontSize: '1.25rem' }}>👥</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-main)' }}>
            {metrics?.totalEmployees ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Active Staff: <strong>{metrics?.activeEmployees ?? 0}</strong>
          </div>
        </div>

        {/* Total Interns */}
        <div
          className="card"
          style={{ borderLeft: '4px solid #0ea5e9', cursor: 'pointer' }}
          onClick={() => navigate('/hr/interns')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: 'var(--text-muted)' }}>Interns</span>
            <span style={{ fontSize: '1.25rem' }}>🎓</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-main)' }}>
            {metrics?.totalInterns ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Students in program</div>
        </div>

        {/* Today's Attendance */}
        <div
          className="card"
          style={{ borderLeft: '4px solid #10b981', cursor: 'pointer' }}
          onClick={() => navigate('/hr/attendance')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: 'var(--text-muted)' }}>Today's Presence</span>
            <span style={{ fontSize: '1.25rem' }}>⏱️</span>
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ color: '#10b981' }}>✅ {presentCount + lateCount}</span>
            <span style={{ color: '#d97706', fontSize: '0.95rem' }}>☕ {onBreakCount}</span>
            <span style={{ color: '#475569', fontSize: '0.95rem' }}>🏁 {signedOutCount}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {presentCount} On-Time &bull; {onBreakCount} on break &bull; {absentCount} Absent
          </div>
        </div>

        {/* Pending Leaves */}
        <div
          className="card"
          style={{ borderLeft: '4px solid #f59e0b', cursor: 'pointer' }}
          onClick={() => navigate('/hr/leaves')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: 'var(--text-muted)' }}>Leave Requests</span>
            <span style={{ fontSize: '1.25rem' }}>🏖️</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: '#f59e0b' }}>
            {pendingLeaves.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Awaiting HR action</div>
        </div>
      </div>

      {/* Office Timing Banner & Quick Actions */}
      <div
        className="card"
        style={{
          marginBottom: '1.5rem',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(14, 165, 233, 0.08) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🏢</span>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>
              Company Workday Schedule & Shift Rules
            </h3>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: '0.5rem', fontSize: '0.875rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Shift Hours: </span>
              <strong>10:00 AM — 05:30 PM (6.0 hrs work)</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Lunch Break: </span>
              <span style={{ color: '#d97706', fontWeight: '700' }}>
                ☕ 01:00 PM — 02:00 PM (1 Hr Pause)
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Sign-out: </span>
              <span style={{ color: '#4f46e5', fontWeight: '700' }}>
                🚪 05:30 PM
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Auto Attendance: </span>
              <span style={{ color: '#059669', fontWeight: '700' }}>
                ✅ Green Tick on Login
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setIsTimingModalOpen(true)}
            style={{ fontSize: '0.8125rem' }}
          >
            ⚙️ Adjust Shift Timings
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/hr/employees')}
            style={{ fontSize: '0.8125rem', backgroundColor: '#7c3aed', borderColor: '#7c3aed' }}
          >
            ➕ Onboard Employee
          </button>
        </div>
      </div>

      {/* Main 2-Column Content */}
      <div className="grid grid-cols-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Today's Real-time Attendance Stream */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700', margin: 0 }}>
                Today's Attendance ({todayAttendance.length} Tracked)
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Automated check-ins and late flags
              </p>
            </div>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem' }}
              onClick={() => navigate('/hr/attendance')}
            >
              Full Roster &bull; Manual Mark &rarr;
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem' }}>Emp Code</th>
                  <th style={{ padding: '0.5rem' }}>Name</th>
                  <th style={{ padding: '0.5rem' }}>Check In</th>
                  <th style={{ padding: '0.5rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {todayAttendance.slice(0, 6).map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.625rem 0.5rem', fontWeight: '600' }}>{item.employee_code}</td>
                    <td style={{ padding: '0.625rem 0.5rem' }}>{item.name}</td>
                    <td style={{ padding: '0.625rem 0.5rem', color: 'var(--text-muted)' }}>
                      {item.check_in ? new Date(item.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td style={{ padding: '0.625rem 0.5rem' }}>
                      {item.is_on_break ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(245, 158, 11, 0.15)',
                            color: '#d97706',
                            fontWeight: '700',
                            fontSize: '0.75rem',
                          }}
                        >
                          ☕ On Break
                        </span>
                      ) : item.check_out || item.current_work_status === 'CHECKED_OUT' ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(99, 102, 241, 0.15)',
                            color: '#6366f1',
                            fontWeight: '700',
                            fontSize: '0.75rem',
                          }}
                        >
                          🏁 Signed Out
                        </span>
                      ) : item.status === 'PRESENT' && !item.is_late ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            color: '#059669',
                            fontWeight: '700',
                            fontSize: '0.75rem',
                          }}
                        >
                          ✅ Present & Active
                        </span>
                      ) : item.status === 'PRESENT' && item.is_late ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(245, 158, 11, 0.15)',
                            color: '#b45309',
                            fontWeight: '700',
                            fontSize: '0.75rem',
                          }}
                        >
                          ✅ Present (Late)
                        </span>
                      ) : (
                        <span
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(148, 163, 184, 0.15)',
                            color: 'var(--text-muted)',
                            fontSize: '0.75rem',
                          }}
                        >
                          {item.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Leaves Review */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700', margin: 0 }}>Pending Leaves ({pendingLeaves.length})</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Review and approve leave applications
              </p>
            </div>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem' }}
              onClick={() => navigate('/hr/leaves')}
            >
              All Leaves &rarr;
            </button>
          </div>

          {pendingLeaves.length === 0 ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎉</div>
              <p style={{ margin: 0, fontWeight: '500' }}>No pending leave applications!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {pendingLeaves.slice(0, 4).map((leave) => (
                <div
                  key={leave.id}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                      {leave.employee?.first_name} {leave.employee?.last_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                      {leave.leave_type.replace('_', ' ')} &bull; {leave.total_days} day(s) ({leave.start_date} to {leave.end_date})
                    </div>
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                    onClick={() => navigate('/hr/leaves')}
                  >
                    Review
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Adjust Shift Timing Modal */}
      {isTimingModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: '440px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem' }}>
              ⚙️ Configure Office Shift Timings
            </h3>
            <form onSubmit={handleSaveTiming}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                  Shift Start Time
                </label>
                <input
                  type="time"
                  value={timingForm.office_start_time}
                  onChange={(e) => setTimingForm({ ...timingForm, office_start_time: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                  On-Time Login Grace End Time (Marked Late After This)
                </label>
                <input
                  type="time"
                  value={timingForm.office_grace_end_time}
                  onChange={(e) => setTimingForm({ ...timingForm, office_grace_end_time: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                  required
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Standard login window: 10:00 AM – 11:00 AM. Any employee logging in after 11:00 AM will be marked 🔴 Late. Total net work requirement: 6.0 hrs.
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsTimingModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingTiming}>
                  {savingTiming ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default HrDashboard;
