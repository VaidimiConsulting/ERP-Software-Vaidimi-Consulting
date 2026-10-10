import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { getAllAttendance, overrideAttendance } from '../../services/attendanceService';
import { getDepartments } from '../../services/departmentService';
import { getEmployees } from '../../services/employeeService';
import { exportToCsv } from '../../utils/csvUtils';

function AdminAttendancePage() {
  const [attendanceList, setAttendanceList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [overrideModal, setOverrideModal] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [overrideForm, setOverrideForm] = useState({
    status: 'PRESENT',
    is_late: false,
    check_in: '',
    check_out: '',
    working_hours: 6.0,
    notes: '',
  });
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    status: 'PRESENT',
    is_late: false,
    check_in: '',
    check_out: '',
    working_hours: 6.0,
    notes: 'Manually marked by HR/Admin',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [attRes, deptRes, empRes] = await Promise.all([
        getAllAttendance({
          date: selectedDate,
          department_id: selectedDept || undefined,
          status: selectedStatus || undefined,
        }),
        getDepartments(),
        getEmployees({ status: 'ACTIVE' }),
      ]);

      if (attRes.success) setAttendanceList(attRes.data);
      if (deptRes.success) setDepartments(deptRes.data);
      if (empRes.success) setEmployees(empRes.data);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate, selectedDept, selectedStatus]);

  const openOverride = (item) => {
    setOverrideModal(item);
    setOverrideForm({
      status: item.status || 'PRESENT',
      is_late: item.is_late || false,
      check_in: item.check_in ? new Date(item.check_in).toISOString().slice(0, 16) : '',
      check_out: item.check_out ? new Date(item.check_out).toISOString().slice(0, 16) : '',
      working_hours: item.working_hours || 8,
      notes: item.notes || '',
    });
  };

  const openManualModal = () => {
    setManualForm({
      employee_id: employees.length > 0 ? String(employees[0].id) : '',
      date: selectedDate,
      status: 'PRESENT',
      is_late: false,
      check_in: `${selectedDate}T10:00`,
      check_out: `${selectedDate}T17:30`,
      working_hours: 6.0,
      notes: 'Manually marked by HR/Admin for missing punch',
    });
    setIsManualModalOpen(true);
  };

  const handleSaveOverride = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        employee_id: overrideModal.employee_id,
        date: selectedDate,
        status: overrideForm.status,
        is_late: overrideForm.is_late,
        check_in: overrideForm.check_in || null,
        check_out: overrideForm.check_out || null,
        working_hours: overrideForm.working_hours,
        notes: overrideForm.notes,
      };
      const res = await overrideAttendance(payload);
      if (res.success) {
        setOverrideModal(null);
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveManual = async (e) => {
    e.preventDefault();
    if (!manualForm.employee_id) {
      alert('Please select an employee.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        employee_id: manualForm.employee_id,
        date: manualForm.date,
        status: manualForm.status,
        is_late: manualForm.is_late,
        check_in: manualForm.check_in || null,
        check_out: manualForm.check_out || null,
        working_hours: manualForm.working_hours,
        notes: manualForm.notes || 'Manually marked by HR/Admin',
      };
      const res = await overrideAttendance(payload);
      if (res.success) {
        setIsManualModalOpen(false);
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportCsv = () => {
    const columns = [
      { key: 'date', label: 'Date', format: () => selectedDate },
      { key: 'employee_code', label: 'Employee Code', format: (v, r) => r.employee_code || '' },
      { key: 'employee_name', label: 'Employee Name', format: (v, r) => r.name || '' },
      { key: 'department', label: 'Department', format: (v, r) => r.department || '' },
      { key: 'status', label: 'Status' },
      { key: 'check_in', label: 'Check In', format: (v) => v ? new Date(v).toLocaleTimeString() : '' },
      { key: 'check_out', label: 'Check Out', format: (v) => v ? new Date(v).toLocaleTimeString() : '' },
      { key: 'working_hours', label: 'Hours' },
      { key: 'notes', label: 'Notes', format: (v) => v || '' },
    ];
    exportToCsv(`vaidimi_attendance_${selectedDate}.csv`, attendanceList, columns);
  };

  const getStatusBadge = (item) => {
    if (item.is_on_break) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.6rem',
            borderRadius: '6px',
            backgroundColor: '#fef3c7',
            color: '#b45309',
            fontWeight: '700',
            fontSize: '0.75rem',
            border: '1px solid #fde68a',
          }}
        >
          ☕ On Break (Lunch)
        </span>
      );
    }

    if (item.check_out) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.6rem',
            borderRadius: '6px',
            backgroundColor: '#f1f5f9',
            color: '#334155',
            fontWeight: '700',
            fontSize: '0.75rem',
            border: '1px solid #cbd5e1',
          }}
        >
          🏁 Signed Out ({new Date(item.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
        </span>
      );
    }

    if (item.status === 'PRESENT' || item.check_in) {
      if (item.is_late) {
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.25rem 0.6rem',
              borderRadius: '6px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#dc2626',
              fontWeight: '700',
              fontSize: '0.75rem',
              border: '1px solid #fecaca',
            }}
          >
            🔴 Late Login ({item.check_in ? new Date(item.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''})
          </span>
        );
      }
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.6rem',
            borderRadius: '6px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            color: '#059669',
            fontWeight: '800',
            fontSize: '0.75rem',
            border: '1px solid #a7f3d0',
          }}
        >
          ✅ Present & Working 🟢
        </span>
      );
    }

    switch (item.status) {
      case 'HALF_DAY':
        return <span className="badge badge-warning">Half Day</span>;
      case 'ON_LEAVE':
        return <span className="badge badge-info">On Leave</span>;
      case 'HOLIDAY':
        return <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>Holiday</span>;
      default:
        return <span className="badge badge-danger">Absent / Not Logged In</span>;
    }
  };

  return (
    <AppLayout
      pageTitle="Attendance Logs & Monitor"
      subtitle="Vaidimi Corporate Head Office (Varanasi HQ) • Real-time attendance monitoring, shifts, breaks, and manual punch overrides"
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
              Headquarters Workforce Attendance Register • Sigra / Cantt, Varanasi, UP
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

      {/* Corporate Shift Info Banner */}
      <div
        style={{
          padding: '0.875rem 1.25rem',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          marginBottom: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <span style={{ fontSize: '1.35rem' }}>🏢</span>
          <div>
            <div style={{ fontWeight: '800', fontSize: '0.875rem', color: '#166534' }}>
              Corporate Workday Schedule & Auto-Attendance
            </div>
            <div style={{ fontSize: '0.75rem', color: '#15803d' }}>
              Employees logging in automatically receive a <strong>✅ Present Green Tick</strong>. Break window: <strong>1:00 PM — 2:00 PM</strong> | Shift: <strong>10:00 AM — 5:30 PM (6.0 hrs net work)</strong>.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.75rem' }}>
          <span style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', backgroundColor: '#ffffff', border: '1px solid #dcfce7', color: '#166534', fontWeight: '700' }}>
            🕒 Shift: 10:00 AM — 05:30 PM
          </span>
          <span style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', backgroundColor: '#ffffff', border: '1px solid #fed7aa', color: '#c2410c', fontWeight: '700' }}>
            ☕ Lunch: 01:00 PM — 02:00 PM
          </span>
          <span style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', fontWeight: '700' }}>
            🚪 Sign-out: 05:30 PM
          </span>
        </div>
      </div>

      {/* Filter Bar with Quick Presets (Day, 15 Days, Month, Year 1900-2199) */}
      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-main)' }}>Date (1900 to Unlimited)</label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() - 1);
                setSelectedDate(d.toISOString().split('T')[0]);
              }}
              style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
              title="Previous Day"
            >
              ◀
            </button>
            <input
              type="date"
              className="input"
              min="1900-01-01"
              max="2199-12-31"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ width: '150px' }}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() + 1);
                setSelectedDate(d.toISOString().split('T')[0]);
              }}
              style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
              title="Next Day"
            >
              ▶
            </button>
          </div>
        </div>

        {/* Quick Date Presets */}
        <div style={{ alignSelf: 'flex-end', display: 'flex', gap: '0.35rem', flexWrap: 'wrap', paddingBottom: '2px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', fontWeight: '600' }}
          >
            🎯 Today
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() - 1);
              setSelectedDate(d.toISOString().split('T')[0]);
            }}
            style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
          >
            Yesterday
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() - 15);
              setSelectedDate(d.toISOString().split('T')[0]);
            }}
            style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
            title="Jump 15 days back"
          >
            🗓️ 15 Days Ago
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              const d = new Date();
              d.setDate(1);
              setSelectedDate(d.toISOString().split('T')[0]);
            }}
            style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
            title="First day of current month"
          >
            1st of Month
          </button>
        </div>

        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Department</label>
          <select
            className="input"
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            style={{ minWidth: '180px' }}
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.department_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Status</label>
          <select
            className="input"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{ minWidth: '150px' }}
          >
            <option value="">All Statuses</option>
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent</option>
            <option value="HALF_DAY">Half Day</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="HOLIDAY">Holiday</option>
          </select>
        </div>

        <div style={{ marginLeft: 'auto', alignSelf: 'flex-end', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={openManualModal}
            style={{ backgroundColor: '#7c3aed', borderColor: '#7c3aed', fontSize: '0.8125rem' }}
          >
            ➕ Mark Missing Attendance
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportCsv}
            title="Download attendance records as CSV"
            style={{ fontSize: '0.8125rem' }}
          >
            📥 Export CSV
          </button>
          <button className="btn btn-secondary" onClick={loadData} style={{ fontSize: '0.8125rem' }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading attendance roster...</div>
        ) : attendanceList.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No employee records match the selected criteria.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Employee</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Department</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Presence Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Check In</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Break Taken</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Check Out</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Net Work Hours</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {attendanceList.map((item) => (
                  <tr key={item.employee_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.employee_code} &bull; {item.email}</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{item.department}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{getStatusBadge(item)}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {item.check_in ? (
                        <span style={{ fontWeight: '600', color: '#059669' }}>
                          ✅ {new Date(item.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {item.is_on_break ? (
                        <span style={{ color: '#d97706', fontWeight: '700' }}>☕ Break Active</span>
                      ) : item.total_break_minutes > 0 ? (
                        <span style={{ fontWeight: '600', color: '#475569' }}>{item.total_break_minutes} mins</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>0 mins</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {item.check_out ? (
                        <span style={{ fontWeight: '600', color: '#475569' }}>
                          🚪 {new Date(item.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      ) : item.check_in ? (
                        <span style={{ color: '#0284c7', fontSize: '0.75rem', fontWeight: '600' }}>In Progress (Sign-out 5:30 PM)</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: '700' }}>
                      {typeof item.working_hours === 'number' && item.working_hours > 0 ? (
                        <span style={{ color: '#0f766e' }}>{item.working_hours} hrs</span>
                      ) : item.check_in && !item.check_out ? (
                        <span style={{ color: '#0284c7', fontSize: '0.8rem' }}>⏱️ Tracking (Live)</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>0.0 hrs</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <button className="btn btn-secondary" onClick={() => openOverride(item)} style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>
                        ✏️ Edit / Override
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Override Modal */}
      {overrideModal && (
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
          <div className="card" style={{ width: '460px', maxWidth: '90%' }}>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Override Attendance</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Updating attendance for <strong>{overrideModal.name}</strong> on <strong>{selectedDate}</strong>.
            </p>

            <form onSubmit={handleSaveOverride}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>Status</label>
                <select
                  className="input"
                  value={overrideForm.status}
                  onChange={(e) => setOverrideForm({ ...overrideForm, status: e.target.value })}
                  required
                >
                  <option value="PRESENT">Present</option>
                  <option value="HALF_DAY">Half Day</option>
                  <option value="ABSENT">Absent</option>
                  <option value="ON_LEAVE">On Leave</option>
                  <option value="HOLIDAY">Holiday</option>
                </select>
              </div>

              {overrideForm.status === 'PRESENT' && (
                <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={overrideForm.is_late}
                      onChange={(e) => setOverrideForm({ ...overrideForm, is_late: e.target.checked })}
                    />
                    <span>Flag as <strong>🔴 Late Login</strong> (After 11:00 AM)</span>
                  </label>
                </div>
              )}

              <div style={{ marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>Check In</label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={overrideForm.check_in}
                    onChange={(e) => setOverrideForm({ ...overrideForm, check_in: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>Check Out</label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={overrideForm.check_out}
                    onChange={(e) => setOverrideForm({ ...overrideForm, check_out: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>Working Hours</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="24"
                  className="input"
                  value={overrideForm.working_hours}
                  onChange={(e) => setOverrideForm({ ...overrideForm, working_hours: e.target.value })}
                  required
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>Remarks / Notes</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Approved client visit or medical dispensation"
                  value={overrideForm.notes}
                  onChange={(e) => setOverrideForm({ ...overrideForm, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setOverrideModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Missing Attendance Modal (Admin / HR) */}
      {isManualModalOpen && (
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
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '0.25rem' }}>
              ➕ Mark Missing Attendance
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Admin / HR manual punch for employees who forgot to record attendance.
            </p>

            <form onSubmit={handleSaveManual}>
              {/* Employee Selection */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>
                  Select Employee *
                </label>
                <select
                  className="input"
                  value={manualForm.employee_id}
                  onChange={(e) => setManualForm({ ...manualForm, employee_id: e.target.value })}
                  required
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employee_code} - {emp.first_name} {emp.last_name} ({emp.designation})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Status */}
              <div style={{ marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>
                    Date *
                  </label>
                  <input
                    type="date"
                    className="input"
                    min="1900-01-01"
                    max="2199-12-31"
                    value={manualForm.date}
                    onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>
                    Status *
                  </label>
                  <select
                    className="input"
                    value={manualForm.status}
                    onChange={(e) => setManualForm({ ...manualForm, status: e.target.value })}
                    required
                  >
                    <option value="PRESENT">Present</option>
                    <option value="HALF_DAY">Half Day</option>
                    <option value="ABSENT">Absent</option>
                    <option value="ON_LEAVE">On Leave</option>
                    <option value="HOLIDAY">Holiday</option>
                  </select>
                </div>
              </div>

              {/* Late / On-time flag */}
              {manualForm.status === 'PRESENT' && (
                <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={manualForm.is_late}
                      onChange={(e) => setManualForm({ ...manualForm, is_late: e.target.checked })}
                    />
                    <span>Mark as <strong>🔴 Late Login</strong> (After 11:00 AM)</span>
                  </label>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 1.5rem' }}>
                    Uncheck to award ✅ On-Time Green Tick.
                  </p>
                </div>
              )}

              {/* Check-in and check-out times */}
              <div style={{ marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>
                    Check-in Time
                  </label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={manualForm.check_in}
                    onChange={(e) => setManualForm({ ...manualForm, check_in: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>
                    Check-out Time
                  </label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={manualForm.check_out}
                    onChange={(e) => setManualForm({ ...manualForm, check_out: e.target.value })}
                  />
                </div>
              </div>

              {/* Working hours & remarks */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>
                  Total Working Hours
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="24"
                  className="input"
                  value={manualForm.working_hours}
                  onChange={(e) => setManualForm({ ...manualForm, working_hours: e.target.value })}
                  required
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>
                  Admin / HR Note
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Employee forgot biometric punch, verified by manager"
                  value={manualForm.notes}
                  onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsManualModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ backgroundColor: '#7c3aed', borderColor: '#7c3aed' }}>
                  {submitting ? 'Saving...' : 'Confirm & Save Attendance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default AdminAttendancePage;
