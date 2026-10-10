import React, { useState, useEffect, useMemo, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import AppLayout from '../../components/layout/AppLayout';
import { getCalendarEvents, createCompanyEvent, deleteCompanyEvent } from '../../services/calendarService';
import { getEmployees } from '../../services/employeeService';
import { scheduleLeave, updateLeaveStatus } from '../../services/leaveService';
import { exportToCsv } from '../../utils/csvUtils';
import { useAuth } from '../../context/AuthContext';

function CalendarPage() {
  const { user } = useAuth();
  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const calendarRef = useRef(null);

  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Date range tracking
  const [currentRange, setCurrentRange] = useState({
    start: '',
    end: '',
  });

  // Calendar Jump & Navigation States (1900 to unlimited)
  const [jumpDate, setJumpDate] = useState(new Date().toISOString().split('T')[0]);
  const [jumpYear, setJumpYear] = useState(new Date().getFullYear());
  const [jumpMonth, setJumpMonth] = useState(new Date().getMonth() + 1);
  const [activeView, setActiveView] = useState('dayGridMonth');

  // Manager Leave Management State
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [employeesList, setEmployeesList] = useState([]);
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveError, setLeaveError] = useState('');
  const [leaveForm, setLeaveForm] = useState({
    employee_id: '',
    leave_type: 'PAID_LEAVE',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    is_half_day: false,
    reason: '',
  });

  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    event_type: 'EVENT',
    start_date: '',
    end_date: '',
    location: '',
  });

  const loadEvents = async (rangeOverride = null) => {
    setLoading(true);
    try {
      const activeRange = rangeOverride || currentRange;
      const params = { filter };
      if (activeRange.start) params.start = activeRange.start;
      if (activeRange.end) params.end = activeRange.end;

      const res = await getCalendarEvents(params);
      if (res.success) {
        setEvents(res.data);
      }
    } catch (err) {
      console.error('Failed to load corporate calendar events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [filter]);

  const handleDatesSet = (dateInfo) => {
    const newRange = {
      start: dateInfo.startStr.split('T')[0],
      end: dateInfo.endStr.split('T')[0],
    };
    setCurrentRange(newRange);

    // Synchronize year and month selector with current calendar view
    if (dateInfo.view) {
      setActiveView(dateInfo.view.type);
      const centerDate = dateInfo.view.currentStart || new Date(dateInfo.startStr);
      if (centerDate && !isNaN(centerDate.getTime())) {
        setJumpYear(centerDate.getFullYear());
        setJumpMonth(centerDate.getMonth() + 1);
      }
    }
    // Reload events with active date range
    loadEvents(newRange);
  };

  // Quick Navigation Handlers (1900 to unlimited year range)
  const handleYearJump = (newYear) => {
    const yr = parseInt(newYear, 10);
    if (isNaN(yr) || yr < 1900 || yr > 2200) return;
    setJumpYear(yr);
    const mStr = String(jumpMonth).padStart(2, '0');
    const target = `${yr}-${mStr}-01`;
    setJumpDate(target);
    if (calendarRef.current) {
      calendarRef.current.getApi().gotoDate(target);
    }
  };

  const handleMonthJump = (newMonth) => {
    const m = parseInt(newMonth, 10);
    if (isNaN(m) || m < 1 || m > 12) return;
    setJumpMonth(m);
    const mStr = String(m).padStart(2, '0');
    const target = `${jumpYear}-${mStr}-01`;
    setJumpDate(target);
    if (calendarRef.current) {
      calendarRef.current.getApi().gotoDate(target);
    }
  };

  const handleDateJump = (val) => {
    setJumpDate(val);
    if (val && calendarRef.current) {
      calendarRef.current.getApi().gotoDate(val);
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        setJumpYear(d.getFullYear());
        setJumpMonth(d.getMonth() + 1);
      }
    }
  };

  const handleViewChange = (viewName) => {
    if (calendarRef.current) {
      calendarRef.current.getApi().changeView(viewName);
      setActiveView(viewName);
    }
  };

  const handleTodayJump = () => {
    const today = new Date().toISOString().split('T')[0];
    handleDateJump(today);
  };

  const handleEventClick = (info) => {
    setSelectedEvent(info.event);
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await createCompanyEvent(eventForm);
      if (res.success) {
        setShowEventModal(false);
        setEventForm({
          title: '',
          description: '',
          event_type: 'EVENT',
          start_date: '',
          end_date: '',
          location: '',
        });
        loadEvents();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create corporate event');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to remove this corporate event from the calendar?')) return;
    try {
      const numericId = eventId.replace('event-', '');
      const res = await deleteCompanyEvent(numericId);
      if (res.success) {
        setSelectedEvent(null);
        loadEvents();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete corporate event.');
    }
  };

  const handleOpenLeaveModal = async () => {
    setLeaveError('');
    setShowLeaveModal(true);
    try {
      const res = await getEmployees({ status: 'ACTIVE' });
      if (res.success) {
        setEmployeesList(res.data);
        if (res.data.length > 0 && !leaveForm.employee_id) {
          setLeaveForm((prev) => ({ ...prev, employee_id: res.data[0].id }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch employees list for calendar leave:', err);
    }
  };

  const handleScheduleLeave = async (e) => {
    e.preventDefault();
    setLeaveError('');

    if (!leaveForm.employee_id) {
      setLeaveError('Please select an employee.');
      return;
    }
    if (!leaveForm.start_date || !leaveForm.end_date) {
      setLeaveError('Please select both start and end dates.');
      return;
    }
    if (new Date(leaveForm.start_date) > new Date(leaveForm.end_date)) {
      setLeaveError('Start date cannot be after end date.');
      return;
    }
    if (!leaveForm.reason.trim()) {
      setLeaveError('Please provide a reason or administrative note for this leave.');
      return;
    }

    setLeaveSubmitting(true);
    try {
      const res = await scheduleLeave(leaveForm);
      if (res.success) {
        setShowLeaveModal(false);
        setLeaveForm({
          employee_id: employeesList[0]?.id || '',
          leave_type: 'PAID_LEAVE',
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
          is_half_day: false,
          reason: '',
        });
        loadEvents();
      }
    } catch (err) {
      setLeaveError(err.response?.data?.message || err.message || 'Failed to schedule leave.');
    } finally {
      setLeaveSubmitting(false);
    }
  };

  const handleRevokeLeave = async (leaveId) => {
    if (window.confirm('Are you sure you want to cancel and revoke this employee leave?')) {
      try {
        const res = await updateLeaveStatus(leaveId, 'CANCELLED', 'Revoked by Manager from Corporate Calendar');
        if (res.success) {
          setSelectedEvent(null);
          loadEvents();
        }
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to revoke leave.');
      }
    }
  };

  const handleExportCsv = () => {
    const columns = [
      { key: 'title', label: 'Event Title' },
      { key: 'category', label: 'Category', format: (_, row) => row.extendedProps?.category || 'EVENT' },
      { key: 'start', label: 'Start Date' },
      { key: 'end', label: 'End Date', format: (val) => val || '-' },
      { key: 'allDay', label: 'All Day', format: (val) => (val ? 'YES' : 'NO') },
      { key: 'details', label: 'Details / Remarks', format: (_, row) => row.extendedProps?.description || row.extendedProps?.reason || '' },
    ];
    exportToCsv(`vaidimi_corporate_calendar_${filter.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`, events, columns);
  };

  // Quick KPI counts
  const stats = useMemo(() => {
    const total = events.length;
    const holidays = events.filter((e) => e.extendedProps?.category === 'HOLIDAY').length;
    const leaves = events.filter((e) => e.extendedProps?.category === 'LEAVE').length;
    const deadlines = events.filter((e) => e.extendedProps?.category === 'PROJECT_DEADLINE' || e.extendedProps?.category === 'MILESTONE').length;
    const companyEvents = events.filter((e) => e.extendedProps?.category === 'EVENT').length;
    return { total, holidays, leaves, deadlines, companyEvents };
  }, [events]);

  const filterOptions = [
    { label: 'All Schedule', value: 'ALL', color: 'var(--text-main)' },
    { label: '🎉 Corporate Holidays', value: 'HOLIDAYS', color: '#10b981' },
    { label: '🏖️ Employee Leaves', value: 'LEAVES', color: '#f59e0b' },
    { label: '🎯 Deadlines', value: 'PROJECTS', color: '#e11d48' },
    { label: '🚩 Milestones', value: 'MILESTONES', color: '#6366f1' },
    { label: '📌 Corporate Events', value: 'EVENTS', color: '#8b5cf6' },
  ];

  return (
    <AppLayout
      pageTitle="Corporate Office Calendar"
      subtitle="Vaidimi Corporate Head Office (Varanasi HQ) • Official Corporate Schedule, Holidays, Workforce Leaves, and Project Milestones"
    >
      {/* Varanasi Head Office Jurisdictional Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(6, 95, 70, 0.05))',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: 'var(--radius-lg)',
        padding: '0.875rem 1.25rem',
        marginBottom: '1.25rem',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.75rem' }}>🏛️</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <strong style={{ color: 'var(--text-main)', fontSize: '0.9375rem' }}>
                Vaidimi Corporate Head Office (Varanasi HQ)
              </strong>
              <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Head Office Active</span>
              <span className="badge" style={{ backgroundColor: '#0284c7', color: '#ffffff', fontSize: '0.7rem' }}>BR-VNS</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              📍 Vaidimi Tech Center, Sigra / Cantt, Varanasi, Uttar Pradesh - 221002 • Official Enterprise Calendar
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Working Shift:</span>
          <span className="badge" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: '0.75rem' }}>
            ⏰ 10:00 AM — 05:30 PM (6 hrs)
          </span>
        </div>
      </div>

      {/* Top Stat Overview Bar */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <div className="calendar-stat-card">
          <div style={{ fontSize: '1.5rem', padding: '0.5rem', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-md)' }}>
            📅
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Total Schedule</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)' }}>{stats.total}</div>
          </div>
        </div>

        <div className="calendar-stat-card">
          <div style={{ fontSize: '1.5rem', padding: '0.5rem', backgroundColor: '#ecfdf5', borderRadius: 'var(--radius-md)' }}>
            🎉
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Holidays</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#059669' }}>{stats.holidays}</div>
          </div>
        </div>

        <div className="calendar-stat-card">
          <div style={{ fontSize: '1.5rem', padding: '0.5rem', backgroundColor: '#fffbeb', borderRadius: 'var(--radius-md)' }}>
            🏖️
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Team Leaves</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#d97706' }}>{stats.leaves}</div>
          </div>
        </div>

        <div className="calendar-stat-card">
          <div style={{ fontSize: '1.5rem', padding: '0.5rem', backgroundColor: '#fff1f2', borderRadius: 'var(--radius-md)' }}>
            🎯
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Deliverables</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#e11d48' }}>{stats.deadlines}</div>
          </div>
        </div>

        <div className="calendar-stat-card">
          <div style={{ fontSize: '1.5rem', padding: '0.5rem', backgroundColor: '#f5f3ff', borderRadius: 'var(--radius-md)' }}>
            📌
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Corporate Events</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#7c3aed' }}>{stats.companyEvents}</div>
          </div>
        </div>
      </div>

      {/* Filter Chips & Action Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
        flexWrap: 'wrap',
        gap: '1rem',
        backgroundColor: '#ffffff',
        padding: '0.875rem 1.25rem',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-sm)',
      }}>
        {/* Filter Chips */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className="btn"
              style={{
                fontSize: '0.8125rem',
                padding: '0.35rem 0.75rem',
                backgroundColor: filter === opt.value ? 'var(--primary)' : 'var(--bg-card)',
                color: filter === opt.value ? '#ffffff' : 'var(--text-main)',
                border: filter === opt.value ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                fontWeight: filter === opt.value ? '700' : '500',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            className="btn btn-secondary"
            onClick={handleExportCsv}
            title="Download CSV export of currently visible calendar schedule"
            style={{ fontWeight: '600', fontSize: '0.8125rem' }}
          >
            📥 Export Schedule (CSV)
          </button>

          {isAdminOrManager && (
            <>
              <button
                className="btn btn-secondary"
                onClick={handleOpenLeaveModal}
                style={{
                  borderColor: 'var(--primary)',
                  color: 'var(--primary)',
                  fontWeight: '700',
                  backgroundColor: 'var(--primary-light)',
                  fontSize: '0.8125rem',
                }}
              >
                🏖️ Schedule Leave
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setShowEventModal(true)}
                style={{ fontSize: '0.8125rem' }}
              >
                ➕ Add Corporate Event
              </button>
            </>
          )}
        </div>
      </div>

      {/* Interactive Navigation & Time Travel Bar (1900 to Unlimited Years, Month, Week, 15 Days, Day) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.875rem',
        padding: '0.875rem 1.25rem',
        marginBottom: '1rem',
        backgroundColor: '#ffffff',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-sm)',
      }}>
        {/* Left: View Mode Selection (Day, Week, 15 Days, Month) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginRight: '0.25rem' }}>
            View:
          </span>
          <button
            type="button"
            className="btn"
            onClick={() => handleViewChange('dayGridDay')}
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.8125rem',
              fontWeight: activeView === 'dayGridDay' ? '700' : '500',
              backgroundColor: activeView === 'dayGridDay' ? 'var(--primary)' : 'var(--bg-subtle)',
              color: activeView === 'dayGridDay' ? '#ffffff' : 'var(--text-main)',
              border: '1px solid var(--border-color)',
            }}
          >
            📅 Day
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => handleViewChange('dayGridWeek')}
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.8125rem',
              fontWeight: activeView === 'dayGridWeek' ? '700' : '500',
              backgroundColor: activeView === 'dayGridWeek' ? 'var(--primary)' : 'var(--bg-subtle)',
              color: activeView === 'dayGridWeek' ? '#ffffff' : 'var(--text-main)',
              border: '1px solid var(--border-color)',
            }}
          >
            📆 Week
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => handleViewChange('dayGrid15')}
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.8125rem',
              fontWeight: activeView === 'dayGrid15' ? '700' : '500',
              backgroundColor: activeView === 'dayGrid15' ? 'var(--primary)' : 'var(--bg-subtle)',
              color: activeView === 'dayGrid15' ? '#ffffff' : 'var(--text-main)',
              border: '1px solid var(--border-color)',
            }}
          >
            🗓️ 15 Days
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => handleViewChange('dayGridMonth')}
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.8125rem',
              fontWeight: activeView === 'dayGridMonth' ? '700' : '500',
              backgroundColor: activeView === 'dayGridMonth' ? 'var(--primary)' : 'var(--bg-subtle)',
              color: activeView === 'dayGridMonth' ? '#ffffff' : 'var(--text-main)',
              border: '1px solid var(--border-color)',
            }}
          >
            🗓️ Month
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleTodayJump}
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.8125rem',
              fontWeight: '600',
              marginLeft: '0.25rem',
            }}
          >
            🎯 Today
          </button>
        </div>

        {/* Right: Date, Month & Year Pickers (1900 to unlimited) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
          {/* Specific Date Jump */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>Date:</label>
            <input
              type="date"
              className="input"
              min="1900-01-01"
              max="2199-12-31"
              value={jumpDate}
              onChange={(e) => handleDateJump(e.target.value)}
              style={{ width: '145px', padding: '0.3rem 0.5rem', fontSize: '0.8125rem' }}
              title="Jump directly to any date (1900 to unlimited)"
            />
          </div>

          {/* Month Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>Month:</label>
            <select
              className="input"
              value={jumpMonth}
              onChange={(e) => handleMonthJump(e.target.value)}
              style={{ width: '125px', padding: '0.3rem 0.5rem', fontSize: '0.8125rem' }}
            >
              <option value="1">January (1)</option>
              <option value="2">February (2)</option>
              <option value="3">March (3)</option>
              <option value="4">April (4)</option>
              <option value="5">May (5)</option>
              <option value="6">June (6)</option>
              <option value="7">July (7)</option>
              <option value="8">August (8)</option>
              <option value="9">September (9)</option>
              <option value="10">October (10)</option>
              <option value="11">November (11)</option>
              <option value="12">December (12)</option>
            </select>
          </div>

          {/* Year Jump (1900 to unlimited) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>Year:</label>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleYearJump(jumpYear - 1)}
              style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
              title="Previous Year"
            >
              ◀
            </button>
            <input
              type="number"
              className="input"
              min="1900"
              max="2199"
              value={jumpYear}
              onChange={(e) => handleYearJump(e.target.value)}
              style={{ width: '80px', padding: '0.3rem 0.4rem', fontSize: '0.8125rem', textAlign: 'center', fontWeight: '700' }}
              title="Enter any year from 1900 to unlimited"
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleYearJump(jumpYear + 1)}
              style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
              title="Next Year"
            >
              ▶
            </button>
          </div>
        </div>
      </div>

      {/* Main Calendar Card */}
      <div className="card" style={{ padding: '1.5rem', minHeight: '680px', position: 'relative' }}>
        {loading && (
          <div style={{
            position: 'absolute',
            top: '1rem',
            right: '1.5rem',
            zIndex: 10,
            fontSize: '0.75rem',
            color: 'var(--primary)',
            fontWeight: '600',
            backgroundColor: 'var(--primary-light)',
            padding: '0.25rem 0.6rem',
            borderRadius: 'var(--radius-full)',
          }}>
            Synchronizing Schedule...
          </div>
        )}

        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          views={{
            dayGridMonth: { buttonText: 'Month' },
            dayGrid15: {
              type: 'dayGrid',
              duration: { days: 15 },
              buttonText: '15 Days',
            },
            dayGridWeek: { buttonText: 'Week' },
            dayGridDay: { buttonText: 'Day' },
          }}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGrid15,dayGridWeek,dayGridDay',
          }}
          events={events}
          eventClick={handleEventClick}
          datesSet={handleDatesSet}
          height="auto"
          dayMaxEvents={4}
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            meridiem: false,
          }}
        />
      </div>

      {/* Event Details Popover / Modal */}
      {selectedEvent && (
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
          padding: '1rem',
        }}>
          <div className="card" style={{ width: '480px', maxWidth: '100%', boxShadow: 'var(--shadow-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span className="badge" style={{ backgroundColor: selectedEvent.backgroundColor, color: '#ffffff', fontWeight: '700', padding: '0.3rem 0.6rem' }}>
                {selectedEvent.extendedProps?.category || 'EVENT'}
              </span>
              <button
                onClick={() => setSelectedEvent(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
              {selectedEvent.title}
            </h3>

            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span>🗓️</span>
              <span><strong>Date:</strong> {selectedEvent.startStr} {selectedEvent.endStr ? `→ ${selectedEvent.endStr}` : ''}</span>
            </div>

            {selectedEvent.extendedProps?.description && (
              <div style={{ padding: '0.875rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: 'var(--text-main)', marginBottom: '1rem', lineHeight: '1.5' }}>
                {selectedEvent.extendedProps.description}
              </div>
            )}

            {/* Leave Details */}
            {selectedEvent.extendedProps?.category === 'LEAVE' && (
              <div style={{ padding: '0.875rem', backgroundColor: '#fffbeb', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', display: 'flex', flexDirection: 'column', gap: '0.375rem', border: '1px solid #fef3c7', marginBottom: '1rem' }}>
                <div><strong>Employee:</strong> {selectedEvent.extendedProps.employee_name} {selectedEvent.extendedProps.employee_code ? `(${selectedEvent.extendedProps.employee_code})` : ''}</div>
                <div><strong>Leave Type:</strong> {selectedEvent.extendedProps.leave_type}</div>
                <div><strong>Duration:</strong> {selectedEvent.extendedProps.total_days} day(s)</div>
                <div><strong>Reason / Notes:</strong> {selectedEvent.extendedProps.reason || 'N/A'}</div>
              </div>
            )}

            {/* Corporate Event Details */}
            {selectedEvent.extendedProps?.category === 'EVENT' && selectedEvent.extendedProps?.location && (
              <div style={{ padding: '0.75rem', backgroundColor: '#f5f3ff', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', border: '1px solid #ede9fe', marginBottom: '1rem' }}>
                <div><strong>📍 Location:</strong> {selectedEvent.extendedProps.location}</div>
                {selectedEvent.extendedProps.event_type && (
                  <div><strong>🏷️ Type:</strong> {selectedEvent.extendedProps.event_type}</div>
                )}
              </div>
            )}

            {/* Project Deadline Details */}
            {selectedEvent.extendedProps?.category === 'PROJECT_DEADLINE' && (
              <div style={{ padding: '0.75rem', backgroundColor: '#fff1f2', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', border: '1px solid #ffe4e6', marginBottom: '1rem' }}>
                <div><strong>Project Code:</strong> {selectedEvent.extendedProps.project_code}</div>
                <div><strong>Status:</strong> {selectedEvent.extendedProps.status}</div>
                <div><strong>Priority:</strong> {selectedEvent.extendedProps.priority}</div>
                <div><strong>Progress:</strong> {selectedEvent.extendedProps.completion_percentage}% completed</div>
              </div>
            )}

            {/* Milestone Details */}
            {selectedEvent.extendedProps?.category === 'MILESTONE' && (
              <div style={{ padding: '0.75rem', backgroundColor: '#eef2ff', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', border: '1px solid #e0e7ff', marginBottom: '1rem' }}>
                <div><strong>Project:</strong> {selectedEvent.extendedProps.project_name}</div>
                <div><strong>Status:</strong> {selectedEvent.extendedProps.status}</div>
                <div><strong>Completion:</strong> {selectedEvent.extendedProps.completion_percentage}%</div>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                {isAdminOrManager && selectedEvent.extendedProps?.category === 'LEAVE' && selectedEvent.extendedProps?.leave_id && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleRevokeLeave(selectedEvent.extendedProps.leave_id)}
                    style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.4)', fontSize: '0.75rem' }}
                  >
                    🚫 Cancel / Revoke Leave
                  </button>
                )}

                {isAdminOrManager && selectedEvent.id?.startsWith('event-') && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleDeleteEvent(selectedEvent.id)}
                    style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.4)', fontSize: '0.75rem' }}
                  >
                    🗑️ Delete Event
                  </button>
                )}
              </div>

              <button className="btn btn-secondary" onClick={() => setSelectedEvent(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Corporate Event Modal */}
      {showEventModal && (
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
          padding: '1rem',
        }}>
          <div className="card" style={{ width: '480px', maxWidth: '100%', boxShadow: 'var(--shadow-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)' }}>
                🏢 Add Corporate Office Event
              </h3>
              <button
                onClick={() => setShowEventModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Publish an official meeting, townhall, training, or celebration to the corporate calendar.
            </p>

            <form onSubmit={handleCreateEvent}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>
                  Event Title <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Corporate All-Hands & Strategy Review"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>Event Type</label>
                  <select
                    className="input"
                    value={eventForm.event_type}
                    onChange={(e) => setEventForm({ ...eventForm, event_type: e.target.value })}
                  >
                    <option value="EVENT">General Corporate Event</option>
                    <option value="MEETING">Corporate Meeting / Review</option>
                    <option value="TRAINING">Technical Training Session</option>
                    <option value="ANNOUNCEMENT">Townhall / Announcement</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>Location</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. HQ Boardroom / Zoom"
                    value={eventForm.location}
                    onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>
                    Start Date &bull; Time <span className="required">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    className="input"
                    min="1900-01-01T00:00"
                    max="2199-12-31T23:59"
                    value={eventForm.start_date}
                    onChange={(e) => setEventForm({ ...eventForm, start_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>End Date &bull; Time (Optional)</label>
                  <input
                    type="datetime-local"
                    className="input"
                    min="1900-01-01T00:00"
                    max="2199-12-31T23:59"
                    value={eventForm.end_date}
                    onChange={(e) => setEventForm({ ...eventForm, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>Description & Agenda</label>
                <textarea
                  className="input"
                  rows="3"
                  placeholder="Key discussion points, agenda, or attendance instructions"
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEventModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Publishing...' : 'Publish Corporate Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Employee Leave Modal (Manager / Admin) */}
      {showLeaveModal && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '520px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)' }}>
                  🏖️ Schedule & Approve Employee Leave
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Directly schedule pre-approved leave for workforce management
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            {leaveError && (
              <div style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--danger-bg)',
                color: 'var(--danger)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem',
                fontSize: '0.8125rem',
                border: '1px solid rgba(220, 38, 38, 0.25)',
              }}>
                ⚠️ {leaveError}
              </div>
            )}

            <form onSubmit={handleScheduleLeave}>
              {/* Employee Selector */}
              <div className="form-group">
                <label className="form-label">
                  Select Employee <span className="required">*</span>
                </label>
                <select
                  className="form-select"
                  value={leaveForm.employee_id}
                  onChange={(e) => setLeaveForm({ ...leaveForm, employee_id: e.target.value })}
                  required
                >
                  <option value="">-- Choose Employee --</option>
                  {employeesList.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_code || 'EMP'}) &bull; {emp.designation}
                    </option>
                  ))}
                </select>
              </div>

              {/* Leave Type */}
              <div className="form-group">
                <label className="form-label">
                  Leave Type <span className="required">*</span>
                </label>
                <select
                  className="form-select"
                  value={leaveForm.leave_type}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
                >
                  <option value="PAID_LEAVE">Paid Leave (Annual Quota)</option>
                  <option value="SICK_LEAVE">Sick Leave</option>
                  <option value="CASUAL_LEAVE">Casual Leave</option>
                  <option value="FESTIVAL_LEAVE">Festival Leave</option>
                  <option value="MENSTRUAL_LEAVE">Menstrual Leave (Confidential)</option>
                  <option value="UNPAID_LEAVE">Unpaid Leave</option>
                </select>
              </div>

              {/* Dates Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">
                    Start Date <span className="required">*</span>
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    min="1900-01-01"
                    max="2199-12-31"
                    value={leaveForm.start_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    End Date <span className="required">*</span>
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    min="1900-01-01"
                    max="2199-12-31"
                    value={leaveForm.end_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Half Day Checkbox */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8125rem' }}>
                  <input
                    type="checkbox"
                    checked={leaveForm.is_half_day}
                    onChange={(e) => setLeaveForm({ ...leaveForm, is_half_day: e.target.checked })}
                  />
                  <span>Half Day Leave (0.5 day)</span>
                </label>
              </div>

              {/* Reason / Notes */}
              <div className="form-group">
                <label className="form-label">
                  Reason / Manager Remarks <span className="required">*</span>
                </label>
                <textarea
                  className="form-textarea"
                  rows="3"
                  placeholder="e.g. Approved leave for personal / scheduled time off"
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  required
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowLeaveModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={leaveSubmitting}
                >
                  {leaveSubmitting ? 'Scheduling...' : 'Schedule & Approve Leave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default CalendarPage;
