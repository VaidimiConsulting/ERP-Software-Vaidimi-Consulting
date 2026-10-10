import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { checkIn, checkOut, startBreak, endBreak, getTodayAttendance, getMonthlyAttendance } from '../../services/attendanceService';

function EmployeeAttendancePage() {
  const [todayData, setTodayData] = useState(null);
  const [monthlyData, setMonthlyData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [breakElapsedTime, setBreakElapsedTime] = useState('00:00:00');

  const loadData = async () => {
    setLoading(true);
    try {
      const [todayRes, monthRes] = await Promise.all([
        getTodayAttendance(),
        getMonthlyAttendance(selectedMonth),
      ]);
      if (todayRes.success) setTodayData(todayRes.data);
      if (monthRes.success) setMonthlyData(monthRes);
    } catch (err) {
      console.error('Failed to load attendance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const isCheckedIn = Boolean(todayData?.check_in);
  const isCheckedOut = Boolean(todayData?.check_out);
  const isOnBreak = Boolean(todayData?.is_on_break);

  // Live timer for active work session (persists and computes wall-clock time even if window was closed)
  useEffect(() => {
    if (!todayData?.check_in || todayData?.check_out || isOnBreak) {
      return;
    }

    const computeTime = () => {
      const start = new Date(todayData.check_in).getTime();
      const now = new Date().getTime();
      const totalDiff = Math.max(0, now - start);
      const breakMs = (todayData.total_break_minutes || 0) * 60 * 1000;
      const netDiff = Math.max(0, totalDiff - breakMs);

      const hours = String(Math.floor(netDiff / (1000 * 60 * 60))).padStart(2, '0');
      const minutes = String(Math.floor((netDiff % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
      const seconds = String(Math.floor((netDiff % (1000 * 60)) / 1000)).padStart(2, '0');
      setElapsedTime(`${hours}:${minutes}:${seconds}`);
    };

    computeTime(); // Immediate calculation
    const interval = setInterval(computeTime, 1000);

    return () => clearInterval(interval);
  }, [todayData?.check_in, todayData?.check_out, isOnBreak, todayData?.total_break_minutes]);

  // Live timer for break
  useEffect(() => {
    if (!isOnBreak || !todayData?.break_start) return;

    const computeBreak = () => {
      const start = new Date(todayData.break_start).getTime();
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
  }, [isOnBreak, todayData?.break_start]);

  const handleCheckIn = async () => {
    setPunching(true);
    try {
      const res = await checkIn();
      if (res.success) {
        setTodayData(res.data);
        loadData();
      }
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
        setTodayData(res.data);
        loadData();
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
        setTodayData(res.data);
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to end break');
    } finally {
      setPunching(false);
    }
  };

  const handleCheckOut = async () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const isBeforeShiftEnd = currentHour < 17 || (currentHour === 17 && currentMinute < 30);

    let confirmMsg = 'Are you ready to check out and sign out for today?';
    if (isBeforeShiftEnd) {
      confirmMsg = `⚠️ Early Signout Notice:\n\nCompany shift ends at 5:30 PM (17:30) (10:00 AM – 5:30 PM, 6.0 hrs work requirement).\nIt is currently ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.\n\nAre you sure you want to sign out early?`;
    }

    if (!window.confirm(confirmMsg)) return;

    setPunching(true);
    try {
      const res = await checkOut();
      if (res.success) {
        alert(res.message || 'Check-out recorded successfully.');
        setTodayData(res.data);
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Check-out failed');
    } finally {
      setPunching(false);
    }
  };

  return (
    <AppLayout
      pageTitle="Attendance & Work Hours"
      subtitle="Vaidimi Corporate Head Office (Varanasi HQ) • Interactive punch clock, live session timer, and attendance log"
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
              Vaidimi Tech Center, Sigra / Cantt, Varanasi, UP - 221002
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.75rem' }}>
          <span style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', backgroundColor: '#ffffff', border: '1px solid #dcfce7', color: '#166534', fontWeight: '700' }}>
            🕒 Shift: 10:00 AM — 05:30 PM (6 hrs)
          </span>
          <span style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', backgroundColor: '#ffffff', border: '1px solid #fed7aa', color: '#c2410c', fontWeight: '700' }}>
            ☕ Lunch: 01:00 PM — 02:00 PM
          </span>
        </div>
      </div>

      {/* Office Timing & Break Advisory Banner */}
      <div style={{
        marginBottom: '1.25rem',
        padding: '0.875rem 1.25rem',
        backgroundColor: 'rgba(15, 118, 110, 0.08)',
        border: '1px solid rgba(15, 118, 110, 0.2)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.8125rem',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem' }}>⏰</span>
          <span>
            <strong>Official Shift Timing: 10:00 AM — 05:30 PM (6.0 hrs net work)</strong> &bull;
            <strong> Lunch Break: 01:00 PM — 02:00 PM</strong>.
            Sign in between <strong>10:00 AM — 11:00 AM</strong> for an automatic <strong>✅ On-Time Green Tick</strong>.
          </span>
        </div>
        <span style={{ color: '#dc2626', fontWeight: '700' }}>🔴 Logins after 11:00 AM are flagged as Late</span>
      </div>

      {/* Live Punch Card */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
        color: '#ffffff',
        padding: '2rem',
        marginBottom: '2rem',
        borderLeft: `6px solid ${isOnBreak ? '#f59e0b' : isCheckedOut ? '#10b981' : isCheckedIn ? '#3b82f6' : '#94a3b8'}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span className="badge" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#ffffff' }}>
                {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
              {isCheckedIn && (
                <span className="badge" style={{ backgroundColor: '#10b981', color: '#ffffff', fontWeight: '700' }}>
                  ✅ Presence Marked: Present
                </span>
              )}
              {isOnBreak && (
                <span className="badge" style={{ backgroundColor: '#f59e0b', color: '#ffffff', fontWeight: '700' }}>
                  ☕ Break Paused
                </span>
              )}
            </div>

            <h2 style={{ color: '#ffffff', fontSize: '1.875rem', marginBottom: '0.25rem' }}>
              {isCheckedOut
                ? 'Attendance Complete ✅'
                : isOnBreak
                ? '☕ Break in Progress (1:00 - 2:00 PM)'
                : isCheckedIn
                ? 'Currently Clocked In ⏱️'
                : 'Not Clocked In Yet ⏳'}
            </h2>

            <p style={{ color: '#c7d2fe', fontSize: '0.875rem' }}>
              {isOnBreak
                ? `Break active since ${new Date(todayData.break_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; Total break accumulated: ${todayData.total_break_minutes || 0} mins`
                : isCheckedIn && !isCheckedOut
                ? `Clocked in at ${new Date(todayData.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; Total break taken: ${todayData.total_break_minutes || 0} mins`
                : isCheckedOut
                ? `Logged ${todayData?.working_hours || 0} net hours today (${new Date(todayData.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(todayData.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}) &bull; Break: ${todayData.total_break_minutes || 0} mins`
                : 'Please punch in to start recording your daily working hours'}
            </p>
          </div>

          {/* Active Timer Box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem',
            backgroundColor: 'rgba(255,255,255,0.08)',
            padding: '1rem 1.5rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid rgba(255,255,255,0.15)',
            flexWrap: 'wrap',
          }}>
            <div style={{ textAlign: 'center', minWidth: '100px' }}>
              <div style={{ fontSize: '0.75rem', color: '#c7d2fe', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {isOnBreak ? 'Break Timer' : 'Net Work Time'}
              </div>
              <div style={{
                fontSize: '1.75rem',
                fontWeight: '800',
                fontFamily: 'var(--font-mono)',
                color: isOnBreak ? '#fbbf24' : '#ffffff',
              }}>
                {isCheckedOut ? `${todayData?.working_hours || 0} hrs` : isOnBreak ? breakElapsedTime : isCheckedIn ? elapsedTime : '00:00:00'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {!isCheckedIn && (
                <button
                  className="btn"
                  onClick={handleCheckIn}
                  disabled={punching}
                  style={{ backgroundColor: '#10b981', color: '#ffffff', fontWeight: '700', padding: '0.75rem 1.5rem', fontSize: '1rem' }}
                >
                  {punching ? 'Recording...' : '🟢 Check In Now'}
                </button>
              )}

              {isCheckedIn && !isCheckedOut && !isOnBreak && (
                <>
                  <button
                    type="button"
                    className="btn"
                    onClick={handleStartBreak}
                    disabled={punching}
                    style={{ backgroundColor: '#f59e0b', color: '#ffffff', fontWeight: '700', padding: '0.65rem 1.15rem' }}
                    title="Pause session for lunch break (1:00 PM - 2:00 PM)"
                  >
                    ☕ Take Break
                  </button>

                  <button
                    type="button"
                    className="btn"
                    onClick={handleCheckOut}
                    disabled={punching}
                    style={{ backgroundColor: '#ef4444', color: '#ffffff', fontWeight: '700', padding: '0.65rem 1.15rem' }}
                    title="Sign out for the day (Official shift ends at 5:30 PM)"
                  >
                    🚪 Sign Out (5:30 PM)
                  </button>
                </>
              )}

              {isCheckedIn && !isCheckedOut && isOnBreak && (
                <>
                  <button
                    type="button"
                    className="btn"
                    onClick={handleEndBreak}
                    disabled={punching}
                    style={{ backgroundColor: '#10b981', color: '#ffffff', fontWeight: '700', padding: '0.65rem 1.25rem' }}
                  >
                    ▶️ Resume Work
                  </button>

                  <button
                    type="button"
                    className="btn"
                    onClick={handleCheckOut}
                    disabled={punching}
                    style={{ backgroundColor: '#ef4444', color: '#ffffff', fontWeight: '700', padding: '0.65rem 1.15rem' }}
                  >
                    🚪 Sign Out
                  </button>
                </>
              )}

              {isCheckedOut && (
                <button className="btn" disabled style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#ffffff', cursor: 'not-allowed' }}>
                  ✓ Finished for Today
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Summary Statistics */}
      {monthlyData?.summary && (
        <div className="grid grid-cols-4" style={{ marginBottom: '2rem' }}>
          <div className="card" style={{ borderLeft: '4px solid var(--success)' }}>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '0.25rem' }}>Days Present</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--success)' }}>{monthlyData.summary.present}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Full workdays</div>
          </div>

          <div className="card" style={{ borderLeft: '4px solid var(--warning)' }}>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '0.25rem' }}>Half Days</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--warning)' }}>{monthlyData.summary.halfDay}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Under 4 hours</div>
          </div>

          <div className="card" style={{ borderLeft: '4px solid #0ea5e9' }}>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '0.25rem' }}>Approved Leaves</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0ea5e9' }}>{monthlyData.summary.onLeave}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Official leaves</div>
          </div>

          <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '0.25rem' }}>Total Hours Logged</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main)' }}>{monthlyData.summary.totalHours} hrs</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>This month</div>
          </div>
        </div>
      )}

      {/* Monthly Log Grid */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '700' }}>Monthly Log History</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Day-by-day attendance and hours logged</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>Select Month (1900 to Unlimited)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  const [yr, mo] = selectedMonth.split('-').map(Number);
                  const d = new Date(yr, mo - 2, 1);
                  setSelectedMonth(d.toISOString().slice(0, 7));
                }}
                style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                title="Previous Month"
              >
                ◀
              </button>
              <input
                type="month"
                className="input"
                min="1900-01"
                max="2199-12"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{ width: '160px', padding: '0.35rem 0.5rem' }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  const [yr, mo] = selectedMonth.split('-').map(Number);
                  const d = new Date(yr, mo, 1);
                  setSelectedMonth(d.toISOString().slice(0, 7));
                }}
                style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                title="Next Month"
              >
                ▶
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedMonth(new Date().toISOString().slice(0, 7))}
                style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', fontWeight: '600', marginLeft: '0.25rem' }}
              >
                Current
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading monthly attendance...</div>
        ) : !monthlyData?.data || monthlyData.data.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No recorded attendance for this month yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Check In</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Check Out</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Working Hours</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Notes / Remarks</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.data.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>
                      {new Date(r.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {r.status === 'PRESENT' && !r.is_late && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(16, 185, 129, 0.15)',
                          color: '#059669',
                          fontWeight: '700',
                          fontSize: '0.75rem',
                        }}>
                          ✅ On-Time
                        </span>
                      )}
                      {r.status === 'PRESENT' && r.is_late && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(239, 68, 68, 0.15)',
                          color: '#dc2626',
                          fontWeight: '700',
                          fontSize: '0.75rem',
                        }}>
                          🔴 Late Login
                        </span>
                      )}
                      {r.status !== 'PRESENT' && (
                        <span className={`badge ${
                          r.status === 'HALF_DAY'
                            ? 'badge-warning'
                            : r.status === 'ON_LEAVE'
                            ? 'badge-info'
                            : 'badge-danger'
                        }`}>
                          {r.status}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {r.check_in ? new Date(r.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {r.check_out ? new Date(r.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>
                      {r.working_hours} hrs
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                      {r.notes || '—'}
                    </td>
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

export default EmployeeAttendancePage;
