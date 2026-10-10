import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { getEmployeeDashboardMetrics } from '../../services/dashboardService';
import { checkIn, checkOut, startBreak, endBreak } from '../../services/attendanceService';

function EmployeeDashboard() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [breakElapsedTime, setBreakElapsedTime] = useState('00:00:00');

  const emp = user?.employeeProfile;
  const fullName = emp ? `${emp.first_name} ${emp.last_name}` : 'Team Member';

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const res = await getEmployeeDashboardMetrics();
      if (res.success) {
        setMetrics(res.data);
      }
    } catch (err) {
      console.error('Failed to load employee dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  // Real-time automatic dashboard update when management assigns/updates a task
  useEffect(() => {
    if (!socket) return;
    const handleTaskNotification = (notif) => {
      if (
        notif?.type === 'TASK_ASSIGNED' ||
        notif?.type === 'TASK_STATUS_UPDATE' ||
        (notif?.title && notif.title.toLowerCase().includes('task'))
      ) {
        loadMetrics();
      }
    };

    socket.on('new_notification', handleTaskNotification);
    return () => {
      socket.off('new_notification', handleTaskNotification);
    };
  }, [socket]);

  const att = metrics?.todayAttendance;
  const isClockedIn = Boolean(att?.check_in);
  const isClockedOut = Boolean(att?.check_out);
  const isOnBreak = Boolean(att?.is_on_break);

  // Live session timer for active work (persists and computes wall-clock time even if window was closed)
  useEffect(() => {
    if (!att?.check_in || att?.check_out || isOnBreak) return;

    const computeTime = () => {
      const start = new Date(att.check_in).getTime();
      const now = new Date().getTime();
      const totalDiff = Math.max(0, now - start);
      // deduct past break minutes
      const breakMs = (att.total_break_minutes || 0) * 60 * 1000;
      const netDiff = Math.max(0, totalDiff - breakMs);

      const hours = String(Math.floor(netDiff / (1000 * 60 * 60))).padStart(2, '0');
      const minutes = String(Math.floor((netDiff % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
      const seconds = String(Math.floor((netDiff % (1000 * 60)) / 1000)).padStart(2, '0');
      setElapsedTime(`${hours}:${minutes}:${seconds}`);
    };

    computeTime(); // Immediate calculation
    const interval = setInterval(computeTime, 1000);

    return () => clearInterval(interval);
  }, [att?.check_in, att?.check_out, isOnBreak, att?.total_break_minutes]);

  // Live break timer when on break
  useEffect(() => {
    if (!isOnBreak || !att?.break_start) return;

    const computeBreak = () => {
      const start = new Date(att.break_start).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, now - start);

      const hours = String(Math.floor(diff / (1000 * 60 * 60))).padStart(2, '0');
      const minutes = String(Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
      const seconds = String(Math.floor((diff % (1000 * 60)) / 1000)).padStart(2, '0');
      setBreakElapsedTime(`${hours}:${minutes}:${seconds}`);
    };

    computeBreak(); // Immediate calculation
    const interval = setInterval(computeBreak, 1000);

    return () => clearInterval(interval);
  }, [isOnBreak, att?.break_start]);

  const handlePunchIn = async () => {
    setPunching(true);
    try {
      const res = await checkIn();
      if (res.success) loadMetrics();
    } catch (err) {
      alert(err.response?.data?.message || 'Check-in failed');
    } finally {
      setPunching(false);
    }
  };

  const handleStartBreak = async () => {
    setPunching(true);
    try {
      const res = await startBreak();
      if (res.success) {
        loadMetrics();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start break');
    } finally {
      setPunching(false);
    }
  };

  const handleEndBreak = async () => {
    setPunching(true);
    try {
      const res = await endBreak();
      if (res.success) {
        loadMetrics();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to end break');
    } finally {
      setPunching(false);
    }
  };

  const handlePunchOut = async () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const isBeforeShiftEnd = currentHour < 17 || (currentHour === 17 && currentMinute < 30);

    let confirmMsg = 'Are you ready to sign out and finish your work day?';
    if (isBeforeShiftEnd) {
      confirmMsg = `⚠️ Early Signout Advisory:\n\nCompany shift ends at 5:30 PM (17:30) (10:00 AM – 5:30 PM, 6.0 hrs work).\nIt is currently ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.\n\nAre you sure you want to sign out early?`;
    }

    if (!window.confirm(confirmMsg)) return;

    setPunching(true);
    try {
      const res = await checkOut();
      if (res.success) {
        alert(res.message || 'Check-out recorded successfully.');
        loadMetrics();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Check-out failed');
    } finally {
      setPunching(false);
    }
  };

  return (
    <AppLayout pageTitle="Employee Workspace" subtitle="Your daily attendance, project deliverables, leave balances, and company events">
      {/* Welcome Banner */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
        color: '#ffffff',
        padding: '2rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span className="badge badge-success" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7' }}>
                Active Session
              </span>
              <span style={{ fontSize: '0.8125rem', color: '#cbd5e1' }}>
                ID: {emp?.employee_code || 'EMP'}
              </span>
            </div>
            <h2 style={{ color: '#ffffff', fontSize: '1.75rem', marginBottom: '0.375rem' }}>
              Welcome back, {fullName}! 👋
            </h2>
            <p style={{ color: '#c7d2fe', fontSize: '0.9375rem' }}>
              {emp?.designation || 'Specialist'} &bull; {emp?.department?.department_name || 'Corporate'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn" onClick={() => navigate('/employee/calendar')} style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.2)' }}>
              📅 Corporate Calendar
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/employee/tasks')} style={{ backgroundColor: '#ffffff', color: 'var(--primary)' }}>
              📋 Tasks Hub
            </button>
          </div>
        </div>
      </div>

      {/* Corporate Shift Schedule & Green Tick Bar */}
      <div
        style={{
          marginBottom: '1.5rem',
          padding: '0.875rem 1.25rem',
          backgroundColor: isClockedIn ? '#ecfdf5' : '#fffbeb',
          border: `1px solid ${isClockedIn ? '#a7f3d0' : '#fde68a'}`,
          borderRadius: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem' }}>{isClockedIn ? '✅' : '⏳'}</span>
          <div>
            <div style={{ fontWeight: '800', color: isClockedIn ? '#065f46' : '#92400e', fontSize: '0.9375rem' }}>
              {isClockedIn ? 'Today\'s Attendance: PRESENT (Marked Green)' : 'Attendance Pending'}
            </div>
            <div style={{ fontSize: '0.75rem', color: isClockedIn ? '#047857' : '#b45309' }}>
              {isClockedIn
                ? `Automatically logged on login at ${new Date(att.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Visible to HR and Admin.`
                : 'Please sign in to register your attendance for today.'}
            </div>
          </div>
        </div>

        {/* Corporate Shift Hours Badge Strip */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.75rem' }}>
          <span style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', backgroundColor: '#ffffff', border: '1px solid #d1fae5', color: '#065f46', fontWeight: '600' }}>
            🕒 Shift: 10:00 AM — 05:30 PM (6.0 hrs work)
          </span>
          <span style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', backgroundColor: '#ffffff', border: '1px solid #fed7aa', color: '#c2410c', fontWeight: '600' }}>
            ☕ Lunch Break: 01:00 PM — 02:00 PM
          </span>
          <span style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', color: '#475569', fontWeight: '600' }}>
            🚪 Sign-out: 05:30 PM
          </span>
        </div>
      </div>

      {/* Today's Workday, Break & Signout Control Card */}
      <div className="card" style={{
        marginBottom: '2rem',
        borderLeft: `5px solid ${isOnBreak ? '#f59e0b' : isClockedOut ? '#10b981' : isClockedIn ? '#3b82f6' : 'var(--primary)'}`,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Workday Status
              </span>
              {isOnBreak && (
                <span className="badge" style={{ backgroundColor: '#fef3c7', color: '#b45309', fontWeight: '700' }}>
                  ☕ On Break (Work Paused)
                </span>
              )}
              {isClockedIn && !isOnBreak && !isClockedOut && (
                <span className="badge" style={{ backgroundColor: '#ecfdf5', color: '#059669', fontWeight: '700' }}>
                  🟢 Active Session
                </span>
              )}
              {isClockedOut && (
                <span className="badge" style={{ backgroundColor: '#f1f5f9', color: '#475569', fontWeight: '700' }}>
                  🏁 Shift Complete
                </span>
              )}
            </div>

            <h3 style={{ fontSize: '1.375rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
              {isClockedOut
                ? 'Workday Completed ✅'
                : isOnBreak
                ? '☕ Break in Progress (1:00 - 2:00 PM Window)'
                : isClockedIn
                ? 'Clocked In & Working ⏱️'
                : 'Not Clocked In Yet ⏳'}
            </h3>

            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
              {isOnBreak
                ? `Break started at ${new Date(att.break_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Total break accumulated: ${att.total_break_minutes || 0} mins.`
                : isClockedIn && !isClockedOut
                ? `Checked in at ${new Date(att.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; Total break taken: ${att?.total_break_minutes || 0} mins`
                : isClockedOut
                ? `Logged ${att?.working_hours || 0} net working hours (${new Date(att.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(att.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}) &bull; Break: ${att?.total_break_minutes || 0} mins`
                : 'Sign in to begin your official working day.'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            {/* Live Timer Box */}
            <div style={{ textAlign: 'center', minWidth: '110px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                {isOnBreak ? 'Break Timer' : 'Net Work Time'}
              </div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: '800',
                fontFamily: 'var(--font-mono)',
                color: isOnBreak ? '#d97706' : isClockedIn && !isClockedOut ? '#2563eb' : 'var(--text-main)',
              }}>
                {isClockedOut ? `${att?.working_hours} hrs` : isOnBreak ? breakElapsedTime : isClockedIn ? elapsedTime : '00:00:00'}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
              {!isClockedIn && (
                <button
                  className="btn"
                  onClick={handlePunchIn}
                  disabled={punching}
                  style={{ backgroundColor: '#10b981', color: '#ffffff', fontWeight: '700', padding: '0.6rem 1.25rem' }}
                >
                  {punching ? 'Recording...' : '🟢 Check In'}
                </button>
              )}

              {isClockedIn && !isClockedOut && !isOnBreak && (
                <>
                  <button
                    type="button"
                    className="btn"
                    onClick={handleStartBreak}
                    disabled={punching}
                    style={{
                      backgroundColor: '#f59e0b',
                      color: '#ffffff',
                      fontWeight: '700',
                      padding: '0.6rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                    title="Pause session for Lunch (1:00 PM - 2:00 PM)"
                  >
                    <span>☕</span> Take Break / Lunch
                  </button>

                  <button
                    type="button"
                    className="btn"
                    onClick={handlePunchOut}
                    disabled={punching}
                    style={{
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      fontWeight: '700',
                      padding: '0.6rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                    title="Sign out for the day (Official shift ends at 5:30 PM)"
                  >
                    <span>🚪</span> Sign Out for Day (5:30 PM)
                  </button>
                </>
              )}

              {isClockedIn && !isClockedOut && isOnBreak && (
                <>
                  <button
                    type="button"
                    className="btn"
                    onClick={handleEndBreak}
                    disabled={punching}
                    style={{
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      fontWeight: '700',
                      padding: '0.6rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <span>▶️</span> Resume Work Session
                  </button>

                  <button
                    type="button"
                    className="btn"
                    onClick={handlePunchOut}
                    disabled={punching}
                    style={{
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      fontWeight: '700',
                      padding: '0.6rem 1rem',
                    }}
                  >
                    🚪 Sign Out for Day
                  </button>
                </>
              )}

              {isClockedOut && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="badge badge-success" style={{ padding: '0.5rem 0.875rem', fontSize: '0.85rem' }}>
                    ✅ Finished for Today (Signed out)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Featured Assigned Tasks Section (Prominent on Front Page) */}
      <div className="card" style={{
        marginBottom: '2rem',
        border: '1px solid rgba(15, 118, 110, 0.25)',
        background: 'linear-gradient(180deg, var(--bg-card) 0%, rgba(15, 118, 110, 0.03) 100%)',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '0.875rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🎯</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '800', color: 'var(--text-main)' }}>
                  My Assigned Tasks
                </h3>
                {metrics?.currentTasks?.length > 0 ? (
                  <span className="badge badge-info" style={{ fontWeight: '700', fontSize: '0.75rem' }}>
                    {metrics.currentTasks.length} Active
                  </span>
                ) : (
                  <span className="badge badge-success" style={{ fontWeight: '700', fontSize: '0.75rem' }}>
                    All Caught Up
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Action items and assignments requiring your active attention
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/employee/tasks')}
              style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <span>📋</span> Open Full Task Board &rarr;
            </button>
          </div>
        </div>

        {!metrics?.currentTasks || metrics.currentTasks.length === 0 ? (
          <div style={{
            padding: '2.5rem 1rem',
            textAlign: 'center',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border-color)',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎉</div>
            <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.9375rem', marginBottom: '0.25rem' }}>
              No Pending Tasks Assigned!
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              You are all caught up. When management assigns you a new task, it will appear here immediately.
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {metrics.currentTasks.map((t) => (
              <div
                key={t.id}
                style={{
                  padding: '1rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--primary)', backgroundColor: 'var(--primary-light)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                      {t.task_code || 'TASK'}
                    </span>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <span className={`badge ${
                        t.priority === 'URGENT' ? 'badge-danger' :
                        t.priority === 'HIGH' ? 'badge-warning' :
                        'badge-info'
                      }`} style={{ fontSize: '0.7rem' }}>
                        {t.priority}
                      </span>
                      <span className={`badge ${
                        t.status === 'IN_PROGRESS' ? 'badge-info' :
                        t.status === 'BLOCKED' ? 'badge-danger' :
                        'badge-warning'
                      }`} style={{ fontSize: '0.7rem' }}>
                        {t.status}
                      </span>
                    </div>
                  </div>

                  <h4 style={{ fontSize: '0.9375rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.35rem', lineHeight: '1.35' }}>
                    {t.title}
                  </h4>

                  {t.description && (
                    <p style={{
                      fontSize: '0.8125rem',
                      color: 'var(--text-muted)',
                      marginBottom: '0.75rem',
                      lineHeight: '1.4',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {t.description}
                    </p>
                  )}
                </div>

                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>📁 {t.project?.project_name || 'General Project'}</div>
                    <div>🕒 Due: {t.due_date || 'No deadline'}</div>
                  </div>

                  <button
                    className="btn btn-secondary"
                    onClick={() => navigate('/employee/tasks')}
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', fontWeight: '600' }}
                  >
                    Work on Task &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Leave Balances Grid */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '700' }}>My Leave Balances</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Remaining days for year {new Date().getFullYear()}</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/employee/leaves')} style={{ fontSize: '0.8125rem' }}>
          Apply for Leave &rarr;
        </button>
      </div>

      <div className="grid grid-cols-4" style={{ gap: '1rem', marginBottom: '2rem' }}>
        {metrics?.leaveBalances?.map((b) => (
          <div key={b.id} className="card" style={{ borderLeft: `4px solid ${b.leave_type === 'MENSTRUAL_LEAVE' ? '#ec4899' : 'var(--primary)'}` }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              {b.leave_type.replace(/_/g, ' ')}
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main)' }}>
              {b.remaining_days} <span style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-muted)' }}>Left</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Used: {b.used_days} / {b.total_days}
            </div>
          </div>
        ))}
      </div>

      {/* Current Projects */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '700' }}>💼 Current Projects</h3>
          <button className="btn btn-secondary" onClick={() => navigate('/employee/projects')} style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>
            View All Projects
          </button>
        </div>

        {!metrics?.currentProjects || metrics.currentProjects.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            No active project assignments.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {metrics.currentProjects.map((p) => (
              <div key={p.id} style={{ padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{p.project_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.project_code} &bull; Due: {p.expected_end_date}</div>
                </div>
                <span className="badge badge-info">{p.completion_percentage}% Done</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Leaves & Holidays */}
      <div className="grid grid-cols-2" style={{ gap: '1.5rem' }}>
        {/* Recent Leave Requests */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '700' }}>Recent Leave Applications</h3>
            <button className="btn btn-secondary" onClick={() => navigate('/employee/leaves')} style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>
              History
            </button>
          </div>

          {!metrics?.recentLeaves || metrics.recentLeaves.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No recent leave requests.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {metrics.recentLeaves.map((l) => (
                <div key={l.id} style={{ padding: '0.6rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '0.8125rem' }}>{l.leave_type.replace(/_/g, ' ')} ({l.total_days} days)</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{l.start_date} to {l.end_date}</div>
                  </div>
                  <span className={`badge ${l.status === 'APPROVED' ? 'badge-success' : l.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'}`}>
                    {l.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Company Holidays */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '700' }}>🎉 Upcoming Holidays</h3>
            <button className="btn btn-secondary" onClick={() => navigate('/employee/calendar')} style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>
              Corporate Calendar
            </button>
          </div>

          {!metrics?.upcomingHolidays || metrics.upcomingHolidays.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No upcoming holidays scheduled.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {metrics.upcomingHolidays.map((h) => (
                <div key={h.id} style={{ padding: '0.6rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '0.8125rem' }}>{h.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{h.date} ({new Date(h.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' })})</div>
                  </div>
                  <span className="badge badge-success">{h.is_paid ? 'Paid' : 'Unpaid'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default EmployeeDashboard;
