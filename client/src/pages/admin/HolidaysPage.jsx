import React, { useState, useEffect, useMemo } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { getHolidays, createHoliday, updateHoliday, deleteHoliday } from '../../services/holidayService';
import { exportToCsv, parseCsv, downloadSampleHolidayCsv } from '../../utils/csvUtils';
import { useAuth } from '../../context/AuthContext';

// Helper: assign festival emoji according to Indian and global holiday names
export function getFestivalEmoji(name = '') {
  const n = String(name || '').toLowerCase();
  if (n.includes('diwali') || n.includes('deepavali') || n.includes('dhanteras')) return '🪔';
  if (n.includes('holi')) return '🎨';
  if (n.includes('republic') || n.includes('independence') || n.includes('gandhi')) return '🇮🇳';
  if (n.includes('eid') || n.includes('ramadan') || n.includes('fitr') || n.includes('adha') || n.includes('muharram')) return '🌙';
  if (n.includes('christmas') || n.includes('xmas')) return '🎄';
  if (n.includes('new year')) return '✨';
  if (n.includes('shivratri') || n.includes('shiva') || n.includes('mahadev')) return '🔱';
  if (n.includes('krishna') || n.includes('janmashtami')) return '🦚';
  if (n.includes('dussehra') || n.includes('durga') || n.includes('navratri') || n.includes('vijayadashami')) return '🏹';
  if (n.includes('raksha') || n.includes('rakhi')) return '🧵';
  if (n.includes('guru') || n.includes('nanak') || n.includes('baisakhi')) return '☬';
  if (n.includes('good friday') || n.includes('easter')) return '✝️';
  if (n.includes('buddha') || n.includes('purnima')) return '☸️';
  if (n.includes('chhath') || n.includes('chath') || n.includes('surya')) return '☀️';
  if (n.includes('makar') || n.includes('sankranti') || n.includes('pongal') || n.includes('bihu')) return '🪁';
  if (n.includes('govardhan')) return '🏔️';
  if (n.includes('labor') || n.includes('labour') || n.includes('may day')) return '⚒️';
  if (n.includes('annual') || n.includes('foundation')) return '🏛️';
  return '🎉';
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function HolidaysPage() {
  const { user, isAdmin, isHR } = useAuth();
  const canManage = isAdmin || isHR;

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth()); // 0-11
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'PAID' | 'UNPAID'

  // Modal States
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit'
  const [currentHoliday, setCurrentHoliday] = useState(null);
  const [detailHoliday, setDetailHoliday] = useState(null); // Details modal
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    date: '',
    is_paid: true,
    applicable_to: 'ALL',
    description: '',
  });

  // CSV Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importFileName, setImportFileName] = useState('');
  const [importErrors, setImportErrors] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);

  const loadHolidays = async () => {
    setLoading(true);
    try {
      const res = await getHolidays({ year: selectedYear });
      if (res.success) setHolidays(res.data || []);
    } catch (err) {
      console.error('Failed to load holidays:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHolidays();
  }, [selectedYear]);

  // Filtered Holidays
  const filteredHolidays = useMemo(() => {
    return holidays.filter((h) => {
      const matchSearch =
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (h.description && h.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchType =
        filterType === 'ALL'
          ? true
          : filterType === 'PAID'
          ? h.is_paid === true
          : h.is_paid === false;
      return matchSearch && matchType;
    });
  }, [holidays, searchQuery, filterType]);

  // Map of holidays by date string 'YYYY-MM-DD'
  const holidaysByDate = useMemo(() => {
    const map = {};
    for (const h of filteredHolidays) {
      if (!map[h.date]) map[h.date] = [];
      map[h.date].push(h);
    }
    return map;
  }, [filteredHolidays]);

  // Count holidays in each month for the selected year
  const monthHolidayCounts = useMemo(() => {
    const counts = Array(12).fill(0);
    for (const h of filteredHolidays) {
      const d = new Date(h.date + 'T00:00:00');
      if (d.getFullYear() === selectedYear) {
        counts[d.getMonth()] += 1;
      }
    }
    return counts;
  }, [filteredHolidays, selectedYear]);

  // Next Upcoming Festival
  const nextHoliday = useMemo(() => {
    const upcoming = holidays
      .filter((h) => h.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date));
    return upcoming[0] || null;
  }, [holidays, todayStr]);

  // Countdown in days to next holiday
  const daysUntilNext = useMemo(() => {
    if (!nextHoliday) return null;
    const diffTime = new Date(nextHoliday.date + 'T00:00:00') - new Date(todayStr + 'T00:00:00');
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [nextHoliday, todayStr]);

  // Generate calendar days matrix for selectedYear & selectedMonth
  const calendarMatrix = useMemo(() => {
    const firstDay = new Date(selectedYear, selectedMonth, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(selectedYear, selectedMonth, 0).getDate();

    const cells = [];

    // 1. Previous month padding days
    for (let i = firstDay - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(selectedYear, selectedMonth - 1, dayNum);
      const y = prevDate.getFullYear();
      const m = String(prevDate.getMonth() + 1).padStart(2, '0');
      const d = String(dayNum).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      cells.push({
        dayNum,
        dateStr,
        isCurrentMonth: false,
        dayOfWeek: prevDate.getDay(),
        holidays: holidaysByDate[dateStr] || [],
      });
    }

    // 2. Current month days
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const m = String(selectedMonth + 1).padStart(2, '0');
      const d = String(dayNum).padStart(2, '0');
      const dateStr = `${selectedYear}-${m}-${d}`;
      const dayOfWeek = new Date(selectedYear, selectedMonth, dayNum).getDay();
      cells.push({
        dayNum,
        dateStr,
        isCurrentMonth: true,
        dayOfWeek,
        holidays: holidaysByDate[dateStr] || [],
        isToday: dateStr === todayStr,
      });
    }

    // 3. Next month padding days to complete full weeks (up to multiple of 7)
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(selectedYear, selectedMonth + 1, i);
      const y = nextDate.getFullYear();
      const m = String(nextDate.getMonth() + 1).padStart(2, '0');
      const d = String(i).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      cells.push({
        dayNum: i,
        dateStr,
        isCurrentMonth: false,
        dayOfWeek: nextDate.getDay(),
        holidays: holidaysByDate[dateStr] || [],
      });
    }

    return cells;
  }, [selectedYear, selectedMonth, holidaysByDate, todayStr]);

  const openCreateModal = (prefillDate = '') => {
    const defaultDate = prefillDate || `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
    setModalMode('create');
    setFormData({
      name: '',
      date: defaultDate,
      end_date: defaultDate,
      is_range: false,
      is_paid: true,
      applicable_to: 'ALL',
      description: '',
    });
  };

  const openEditModal = (h) => {
    setModalMode('edit');
    setCurrentHoliday(h);
    setFormData({
      name: h.name,
      date: h.date,
      end_date: h.date,
      is_range: false,
      is_paid: h.is_paid,
      applicable_to: h.applicable_to,
      description: h.description || '',
    });
    setDetailHoliday(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (modalMode === 'create') {
        const payload = {
          ...formData,
          start_date: formData.date,
          end_date: formData.is_range && formData.end_date ? formData.end_date : formData.date,
        };
        await createHoliday(payload);
      } else {
        await updateHoliday(currentHoliday.id, formData);
      }
      setModalMode(null);
      loadHolidays();
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (h) => {
    if (!window.confirm(`Are you sure you want to delete holiday '${h.name}' on ${h.date}?`)) return;
    try {
      await deleteHoliday(h.id);
      if (detailHoliday?.id === h.id) setDetailHoliday(null);
      loadHolidays();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleExportCsv = () => {
    const columns = [
      { key: 'name', label: 'Holiday / Festival Name' },
      { key: 'date', label: 'Date (YYYY-MM-DD)' },
      {
        key: 'date',
        label: 'Day of Week',
        format: (v) => new Date(v + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long' }),
      },
      { key: 'is_paid', label: 'Is Paid Holiday', format: (v) => (v ? 'PAID' : 'UNPAID') },
      { key: 'applicable_to', label: 'Applicable Branch / Scope' },
      { key: 'description', label: 'Description', format: (v) => v || '' },
    ];
    exportToCsv(`vaidimi_holidays_festivals_${selectedYear}.csv`, holidays, columns);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    setImportSummary(null);
    setImportErrors([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const parsed = parseCsv(text);
        if (!parsed || parsed.length === 0) {
          setImportErrors(['The selected CSV file appears to be empty or improperly formatted.']);
          setImportRows([]);
          return;
        }

        const errs = [];
        const validated = parsed.map((row, idx) => {
          const rowNum = idx + 2;
          const name = row.holidayname || row.name || '';
          const date = row.date || '';
          const isPaid = String(row.ispaid || row.is_paid || 'true').toLowerCase() === 'true';
          const applicableTo = row.applicableto || row.applicable_to || 'ALL';
          const description = row.description || '';
          const rowErrors = [];

          if (!name || name.trim().length < 2) {
            rowErrors.push(`Row ${rowNum}: Holiday name must be at least 2 characters.`);
          }
          if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            rowErrors.push(`Row ${rowNum}: Date must be in YYYY-MM-DD format (${date}).`);
          }

          if (rowErrors.length > 0) {
            errs.push(...rowErrors);
          }

          return {
            name,
            date,
            is_paid: isPaid,
            applicable_to: applicableTo,
            description,
            isValid: rowErrors.length === 0,
            errorMsg: rowErrors.join(', '),
          };
        });

        setImportRows(validated);
        setImportErrors(errs);
      } catch (err) {
        setImportErrors(['Failed to parse CSV file: ' + err.message]);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    const validRows = importRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      alert('No valid records to import.');
      return;
    }

    setIsImporting(true);
    let successCount = 0;
    let failCount = 0;
    const failDetails = [];

    for (const row of validRows) {
      try {
        const payload = {
          name: row.name,
          date: row.date,
          is_paid: row.is_paid,
          applicable_to: row.applicable_to,
          description: row.description,
        };
        const res = await createHoliday(payload);
        if (res.success) {
          successCount++;
        } else {
          failCount++;
          failDetails.push(`${row.name}: ${res.message || 'Failed'}`);
        }
      } catch (err) {
        failCount++;
        failDetails.push(`${row.name}: ${err.response?.data?.message || err.message}`);
      }
    }

    setIsImporting(false);
    setImportSummary({
      total: validRows.length,
      success: successCount,
      failed: failCount,
      failDetails,
    });
    loadHolidays();
  };

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => Math.max(1900, y - 1));
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => Math.min(2199, y + 1));
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    setSelectedYear(today.getFullYear());
    setSelectedMonth(today.getMonth());
  };

  return (
    <AppLayout
      pageTitle="Holidays & Festival Calendar"
      subtitle="Corporate Gazetted Holidays, Festivals & Company Days Off • All Branches & Head Office"
    >
      {/* 1. Header Banner & Jurisdictional Notice */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(6, 95, 70, 0.05))',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: 'var(--radius-lg)',
          padding: '0.875rem 1.25rem',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.75rem' }}>🏛️</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <strong style={{ color: 'var(--text-main)', fontSize: '0.9375rem' }}>
                Vaidimi Corporate Official Holiday Calendar
              </strong>
              <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                Active Year {selectedYear}
              </span>
              <span className="badge" style={{ backgroundColor: '#0284c7', color: '#ffffff', fontSize: '0.7rem' }}>
                All Branches & HQ
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              Gazetted festivals, national celebrations, and approved non-working days for staff across all office locations.
            </div>
          </div>
        </div>

        {/* Current Date Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: '#ffffff',
            padding: '0.4rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            fontSize: '0.78rem',
            fontWeight: '600',
            color: 'var(--text-main)',
          }}
        >
          <span>🕒 Today:</span>
          <span style={{ color: 'var(--primary)' }}>
            {today.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* 2. Top Metric Cards & Upcoming Festival Banner */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
            }}
          >
            🎉
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
              Total Holidays ({selectedYear})
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: '800', color: 'var(--text-main)' }}>
              {holidays.length} Days Off
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: 'rgba(2, 132, 199, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
            }}
          >
            💰
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
              Paid Off Days
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0284c7' }}>
              {holidays.filter((h) => h.is_paid).length} Paid Holidays
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
            }}
          >
            📅
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
              Selected Month ({MONTHS[selectedMonth]})
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#d97706' }}>
              {monthHolidayCounts[selectedMonth]} {monthHolidayCounts[selectedMonth] === 1 ? 'Holiday' : 'Holidays'}
            </div>
          </div>
        </div>

        {/* Next Festival Countdown */}
        <div
          className="card"
          style={{
            padding: '1rem',
            background: nextHoliday
              ? 'linear-gradient(135deg, rgba(238, 242, 255, 0.9), rgba(224, 231, 255, 0.5))'
              : '#ffffff',
            border: nextHoliday ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.875rem',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
            }}
          >
            {nextHoliday ? getFestivalEmoji(nextHoliday.name) : '✨'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.72rem', color: '#4338ca', fontWeight: '700', textTransform: 'uppercase' }}>
              {daysUntilNext === 0
                ? '🎉 TODAY IS FESTIVAL!'
                : daysUntilNext === 1
                ? '⏳ Tomorrow!'
                : daysUntilNext !== null && daysUntilNext > 0
                ? `⏳ Next Festival in ${daysUntilNext} Days`
                : 'Upcoming Festival'}
            </div>
            <div
              style={{
                fontSize: '0.95rem',
                fontWeight: '800',
                color: '#1e1b4b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={nextHoliday ? `${nextHoliday.name} (${nextHoliday.date})` : 'None upcoming'}
            >
              {nextHoliday ? nextHoliday.name : 'No upcoming festival'}
            </div>
            {nextHoliday && (
              <div style={{ fontSize: '0.7rem', color: '#6366f1', fontWeight: '500' }}>
                {new Date(nextHoliday.date + 'T00:00:00').toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Main Controls Bar (Year, Search, View Switch, Actions) */}
      <div
        className="card"
        style={{
          padding: '1rem',
          marginBottom: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        {/* Left: Year Navigator & Quick Year Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: '700', color: 'var(--text-main)' }}>Year:</span>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setSelectedYear((y) => Math.max(1900, y - 1))}
              style={{ padding: '0.35rem 0.55rem', fontSize: '0.75rem', borderRadius: 'var(--radius-md)' }}
              title="Previous Year"
            >
              ◀
            </button>
            <input
              type="number"
              className="input"
              min="1900"
              max="2199"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value) || selectedYear)}
              style={{ width: '85px', textAlign: 'center', fontWeight: '700', padding: '0.35rem 0.4rem', fontSize: '0.875rem' }}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setSelectedYear((y) => Math.min(2199, y + 1))}
              style={{ padding: '0.35rem 0.55rem', fontSize: '0.75rem', borderRadius: 'var(--radius-md)' }}
              title="Next Year"
            >
              ▶
            </button>
          </div>

          {/* Quick Year Chips */}
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {[2024, 2025, 2026, 2027, 2028].map((yr) => (
              <button
                key={yr}
                type="button"
                className="btn"
                onClick={() => setSelectedYear(yr)}
                style={{
                  padding: '0.25rem 0.55rem',
                  fontSize: '0.75rem',
                  fontWeight: selectedYear === yr ? '700' : '500',
                  backgroundColor: selectedYear === yr ? 'var(--primary)' : 'var(--bg-subtle)',
                  color: selectedYear === yr ? '#ffffff' : 'var(--text-muted)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                {yr}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div style={{ minWidth: '180px' }}>
            <input
              type="text"
              className="input"
              placeholder="🔍 Search festival / day..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.8125rem' }}
            />
          </div>

          {/* Filter Type */}
          <select
            className="input"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.8125rem', width: 'auto' }}
          >
            <option value="ALL">All Holidays</option>
            <option value="PAID">Paid Only</option>
            <option value="UNPAID">Unpaid Only</option>
          </select>
        </div>

        {/* Right: View Toggle (Calendar / List) & Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* View Toggle */}
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--bg-subtle)',
              padding: '0.2rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.8125rem',
                fontWeight: '600',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: viewMode === 'calendar' ? '#ffffff' : 'transparent',
                color: viewMode === 'calendar' ? 'var(--primary)' : 'var(--text-muted)',
                boxShadow: viewMode === 'calendar' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer',
              }}
            >
              📅 Live Calendar
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.8125rem',
                fontWeight: '600',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: viewMode === 'list' ? '#ffffff' : 'transparent',
                color: viewMode === 'list' ? 'var(--primary)' : 'var(--text-muted)',
                boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer',
              }}
            >
              📋 Table List
            </button>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportCsv}
            style={{ fontSize: '0.8125rem', padding: '0.4rem 0.75rem' }}
            title="Download complete holiday schedule as CSV"
          >
            📥 Export CSV
          </button>

          {canManage && (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setImportRows([]);
                  setImportFileName('');
                  setImportErrors([]);
                  setImportSummary(null);
                  setIsImportModalOpen(true);
                }}
                style={{ fontSize: '0.8125rem', padding: '0.4rem 0.75rem' }}
                title="Bulk import holidays schedule from CSV"
              >
                📤 Import CSV
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => openCreateModal()}
                style={{ fontSize: '0.8125rem', padding: '0.4rem 0.85rem' }}
              >
                ➕ Add Holiday
              </button>
            </>
          )}
        </div>
      </div>

      {/* 4. VIEW MODE: LIVE CALENDAR VIEW */}
      {viewMode === 'calendar' && (
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
          {/* Month Navigation & Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
              flexWrap: 'wrap',
              gap: '0.75rem',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handlePrevMonth}
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.8125rem' }}
                title="Previous Month"
              >
                ◀ Prev Month
              </button>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, minWidth: '180px', textAlign: 'center' }}>
                {MONTHS[selectedMonth]} {selectedYear}
              </h3>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleNextMonth}
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.8125rem' }}
                title="Next Month"
              >
                Next Month ▶
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleJumpToToday}
                style={{
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.78rem',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  color: 'var(--primary)',
                  border: '1px solid var(--primary)',
                  fontWeight: '600',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                🎯 Jump to Today
              </button>
            </div>

            {/* Month Tabs Bar with holiday count pills */}
            <div
              style={{
                display: 'flex',
                gap: '0.25rem',
                overflowX: 'auto',
                maxWidth: '100%',
                paddingBottom: '0.25rem',
              }}
            >
              {MONTHS.map((monthName, idx) => {
                const count = monthHolidayCounts[idx];
                const isSelected = selectedMonth === idx;
                return (
                  <button
                    key={monthName}
                    type="button"
                    onClick={() => setSelectedMonth(idx)}
                    style={{
                      padding: '0.35rem 0.6rem',
                      fontSize: '0.75rem',
                      fontWeight: isSelected ? '700' : '500',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                      backgroundColor: isSelected ? 'var(--primary)' : 'var(--bg-subtle)',
                      color: isSelected ? '#ffffff' : 'var(--text-main)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span>{monthName.slice(0, 3)}</span>
                    {count > 0 && (
                      <span
                        style={{
                          backgroundColor: isSelected ? 'rgba(255,255,255,0.3)' : 'rgba(16, 185, 129, 0.2)',
                          color: isSelected ? '#ffffff' : 'var(--primary)',
                          borderRadius: '999px',
                          padding: '0.05rem 0.35rem',
                          fontSize: '0.65rem',
                          fontWeight: '800',
                        }}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Calendar 7-Day Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              textAlign: 'center',
              fontWeight: '700',
              fontSize: '0.8125rem',
              color: 'var(--text-muted)',
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
            }}
          >
            {WEEKDAYS_SHORT.map((wd, i) => (
              <div
                key={wd}
                style={{
                  padding: '0.5rem 0.25rem',
                  color: i === 0 || i === 6 ? '#e11d48' : 'var(--text-muted)',
                }}
              >
                {wd}
              </div>
            ))}
          </div>

          {/* Calendar Day Cells Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '6px',
            }}
          >
            {calendarMatrix.map((cell, idx) => {
              const hasHoliday = cell.holidays && cell.holidays.length > 0;
              const isWeekend = cell.dayOfWeek === 0 || cell.dayOfWeek === 6;

              return (
                <div
                  key={`${cell.dateStr}-${idx}`}
                  onClick={() => {
                    if (hasHoliday) {
                      setDetailHoliday(cell.holidays[0]);
                    } else if (canManage && cell.isCurrentMonth) {
                      openCreateModal(cell.dateStr);
                    }
                  }}
                  style={{
                    minHeight: '105px',
                    borderRadius: 'var(--radius-md)',
                    border: cell.isToday
                      ? '2px solid var(--primary)'
                      : hasHoliday
                      ? '1px solid rgba(16, 185, 129, 0.5)'
                      : '1px solid var(--border-color)',
                    backgroundColor: !cell.isCurrentMonth
                      ? '#f8fafc'
                      : hasHoliday
                      ? 'rgba(16, 185, 129, 0.05)'
                      : isWeekend
                      ? '#fbfcfe'
                      : '#ffffff',
                    padding: '0.5rem',
                    position: 'relative',
                    cursor: hasHoliday ? 'pointer' : canManage && cell.isCurrentMonth ? 'pointer' : 'default',
                    transition: 'all 0.15s ease',
                    boxShadow: cell.isToday
                      ? '0 0 0 2px rgba(16, 185, 129, 0.2)'
                      : hasHoliday
                      ? '0 2px 5px rgba(0,0,0,0.04)'
                      : 'none',
                    opacity: cell.isCurrentMonth ? 1 : 0.45,
                  }}
                  onMouseEnter={(e) => {
                    if (hasHoliday || (canManage && cell.isCurrentMonth)) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.08)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = cell.isToday
                      ? '0 0 0 2px rgba(16, 185, 129, 0.2)'
                      : hasHoliday
                      ? '0 2px 5px rgba(0,0,0,0.04)'
                      : 'none';
                  }}
                  title={
                    hasHoliday
                      ? `${cell.holidays.map((h) => h.name).join(', ')} (Click for details)`
                      : canManage && cell.isCurrentMonth
                      ? `Click to add holiday for ${cell.dateStr}`
                      : cell.dateStr
                  }
                >
                  {/* Top Bar of Cell: Day Number & Today indicator */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.35rem',
                    }}
                  >
                    <span
                      style={{
                        fontWeight: cell.isToday ? '800' : '600',
                        fontSize: '0.8125rem',
                        color: cell.isToday
                          ? '#ffffff'
                          : isWeekend
                          ? '#e11d48'
                          : cell.isCurrentMonth
                          ? 'var(--text-main)'
                          : 'var(--text-muted)',
                        backgroundColor: cell.isToday ? 'var(--primary)' : 'transparent',
                        borderRadius: '999px',
                        width: cell.isToday ? '22px' : 'auto',
                        height: cell.isToday ? '22px' : 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {cell.dayNum}
                    </span>

                    {/* Weekend badge if no holiday */}
                    {isWeekend && !hasHoliday && (
                      <span style={{ fontSize: '0.625rem', color: '#fda4af', fontWeight: '500' }}>
                        {cell.dayOfWeek === 0 ? 'SUN' : 'SAT'}
                      </span>
                    )}

                    {/* Hint for admin to add */}
                    {!hasHoliday && canManage && cell.isCurrentMonth && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          opacity: 0,
                          transition: 'opacity 0.2s',
                        }}
                        className="add-holiday-hint"
                      >
                        +
                      </span>
                    )}
                  </div>

                  {/* Holiday / Festival Items */}
                  {hasHoliday && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      {cell.holidays.map((h) => (
                        <div
                          key={h.id}
                          style={{
                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(5, 150, 105, 0.12))',
                            border: '1px solid rgba(16, 185, 129, 0.35)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.3rem 0.4rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.15rem',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              color: '#065f46',
                            }}
                          >
                            <span>{getFestivalEmoji(h.name)}</span>
                            <span
                              style={{
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {h.name}
                            </span>
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '0.625rem',
                              fontWeight: '600',
                            }}
                          >
                            <span
                              style={{
                                color: h.is_paid ? '#059669' : '#d97706',
                              }}
                            >
                              {h.is_paid ? '● Paid' : '○ Unpaid'}
                            </span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>
                              {WEEKDAYS_SHORT[cell.dayOfWeek]}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Calendar Footer Legend */}
          <div
            style={{
              marginTop: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--border-color)',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '12px', height: '12px', backgroundColor: 'rgba(16, 185, 129, 0.25)', border: '1px solid #10b981', borderRadius: '3px' }}></span>
                <span>Official Gazetted Holiday / Festival</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '12px', height: '12px', backgroundColor: 'var(--primary)', borderRadius: '999px' }}></span>
                <span>Current Day (Today)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ color: '#e11d48', fontWeight: '700' }}>SUN / SAT</span>
                <span>Weekend Off</span>
              </div>
            </div>

            <div>
              {canManage && <span>💡 Tip: Click on any date to add a holiday or click an event to manage it.</span>}
              {!canManage && <span>💡 Click any festival to view detailed info and branches covered.</span>}
            </div>
          </div>
        </div>
      )}

      {/* 5. VIEW MODE: TABLE LIST VIEW */}
      {viewMode === 'list' && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading holidays...</div>
          ) : filteredHolidays.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No holidays found matching your criteria for {selectedYear}.
              {canManage && ' Click "Add Holiday" above to register an official day off.'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: '2px solid var(--border-color)',
                      color: 'var(--text-muted)',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      backgroundColor: 'var(--bg-subtle)',
                    }}
                  >
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Holiday / Festival Name</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Date</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Day of Week</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Type</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Applicable Scope</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHolidays.map((h) => {
                    const d = new Date(h.date + 'T00:00:00');
                    const dayName = d.toLocaleDateString('en-IN', { weekday: 'long' });
                    const isPassed = h.date < todayStr;

                    return (
                      <tr
                        key={h.id}
                        style={{
                          borderBottom: '1px solid var(--border-color)',
                          backgroundColor: isPassed ? 'rgba(0,0,0,0.01)' : 'transparent',
                        }}
                      >
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.25rem' }}>{getFestivalEmoji(h.name)}</span>
                            <div>
                              <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{h.name}</div>
                              {h.description && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{h.description}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{h.date}</span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                          {dayName}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span className={`badge ${h.is_paid ? 'badge-success' : 'badge-warning'}`}>
                            {h.is_paid ? 'Paid Holiday' : 'Unpaid Holiday'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span
                            style={{
                              padding: '0.2rem 0.5rem',
                              backgroundColor: 'var(--bg-subtle)',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                            }}
                          >
                            {h.applicable_to || 'ALL'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-secondary"
                              onClick={() => setDetailHoliday(h)}
                              style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                            >
                              👁️ View
                            </button>
                            {canManage && (
                              <>
                                <button
                                  className="btn btn-secondary"
                                  onClick={() => openEditModal(h)}
                                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  className="btn btn-danger"
                                  onClick={() => handleDelete(h)}
                                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                                >
                                  🗑️ Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 6. MODAL: DETAILED HOLIDAY / FESTIVAL CARD */}
      {detailHoliday && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              width: '460px',
              maxWidth: '95%',
              padding: '1.75rem',
              backgroundColor: '#ffffff',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '2.5rem' }}>{getFestivalEmoji(detailHoliday.name)}</span>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                  {detailHoliday.name}
                </h3>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Official Corporate Holiday Details
                </div>
                {detailHoliday.name.includes('(Day ') && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#065f46', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.72rem', fontWeight: '700', marginTop: '0.25rem' }}>
                    <span>🗓️ Part of Multi-Day Festival Leave</span>
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                marginBottom: '1rem',
              }}
            >
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Holiday Date</div>
                <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{detailHoliday.date}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Day of Week</div>
                <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>
                  {new Date(detailHoliday.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long' })}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Compensation Policy</div>
                <span className={`badge ${detailHoliday.is_paid ? 'badge-success' : 'badge-warning'}`} style={{ marginTop: '0.2rem' }}>
                  {detailHoliday.is_paid ? 'Paid Holiday' : 'Unpaid Holiday'}
                </span>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Applicable Scope</div>
                <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                  {detailHoliday.applicable_to || 'All Branches'}
                </div>
              </div>
            </div>

            {detailHoliday.description && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Description / Significance:
                </div>
                <div
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--text-main)',
                    lineHeight: '1.45',
                    backgroundColor: '#f8fafc',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  {detailHoliday.description}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
              <div>
                {canManage && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => handleDelete(detailHoliday)}
                    style={{ fontSize: '0.8125rem', padding: '0.4rem 0.75rem' }}
                  >
                    🗑️ Delete
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {canManage && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => openEditModal(detailHoliday)}
                    style={{ fontSize: '0.8125rem', padding: '0.4rem 0.75rem' }}
                  >
                    ✏️ Edit
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setDetailHoliday(null)}
                  style={{ fontSize: '0.8125rem', padding: '0.4rem 1rem' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL: ADD / EDIT HOLIDAY */}
      {modalMode && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div className="card" style={{ width: '460px', maxWidth: '95%', padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '800', marginBottom: '0.35rem' }}>
              {modalMode === 'create' ? '➕ Add Official Holiday / Festival' : '✏️ Edit Holiday Details'}
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Register official company non-working days for year {selectedYear}.
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>
                  Festival / Holiday Title *
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Diwali (Deepavali), Eid-ul-Fitr, Independence Day"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              {/* Holiday Duration Type Toggle (Create Mode) */}
              {modalMode === 'create' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: '600', display: 'block', marginBottom: '0.35rem' }}>
                    Leave Duration Type
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, is_range: false, end_date: formData.date })}
                      style={{
                        padding: '0.5rem',
                        fontSize: '0.8125rem',
                        fontWeight: '600',
                        borderRadius: 'var(--radius-md)',
                        border: !formData.is_range ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                        backgroundColor: !formData.is_range ? 'rgba(16, 185, 129, 0.08)' : '#ffffff',
                        color: !formData.is_range ? 'var(--primary)' : 'var(--text-muted)',
                        cursor: 'pointer',
                      }}
                    >
                      📅 Single Day Holiday
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const nextDay = new Date(formData.date + 'T00:00:00');
                        nextDay.setDate(nextDay.getDate() + 1);
                        const nextDayStr = nextDay.toISOString().split('T')[0];
                        setFormData({ ...formData, is_range: true, end_date: formData.end_date || nextDayStr });
                      }}
                      style={{
                        padding: '0.5rem',
                        fontSize: '0.8125rem',
                        fontWeight: '600',
                        borderRadius: 'var(--radius-md)',
                        border: formData.is_range ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                        backgroundColor: formData.is_range ? 'rgba(16, 185, 129, 0.08)' : '#ffffff',
                        color: formData.is_range ? 'var(--primary)' : 'var(--text-muted)',
                        cursor: 'pointer',
                      }}
                    >
                      🗓️ Date to Date Multi-Day Leave
                    </button>
                  </div>
                </div>
              )}

              {/* Single Day Date Picker */}
              {!formData.is_range ? (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>
                    Holiday Date (YYYY-MM-DD) *
                  </label>
                  <input
                    type="date"
                    className="input"
                    min="1900-01-01"
                    max="2199-12-31"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value, end_date: e.target.value })}
                    required
                  />
                  {formData.date && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--primary)', marginTop: '0.25rem', fontWeight: '600' }}>
                      🗓️ Day of week: {new Date(formData.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long' })}
                    </div>
                  )}
                </div>
              ) : (
                /* Date to Date Multi-Day Range Pickers */
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.8125rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>
                        Start Date (From) *
                      </label>
                      <input
                        type="date"
                        className="input"
                        min="1900-01-01"
                        max="2199-12-31"
                        value={formData.date}
                        onChange={(e) => {
                          const newStart = e.target.value;
                          const updates = { ...formData, date: newStart };
                          if (formData.end_date < newStart) updates.end_date = newStart;
                          setFormData(updates);
                        }}
                        required
                      />
                      {formData.date && (
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          {new Date(formData.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' })}
                        </div>
                      )}
                    </div>

                    <div>
                      <label style={{ fontSize: '0.8125rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>
                        End Date (To) *
                      </label>
                      <input
                        type="date"
                        className="input"
                        min={formData.date || '1900-01-01'}
                        max="2199-12-31"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        required
                      />
                      {formData.end_date && (
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          {new Date(formData.end_date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Computed Duration Banner */}
                  {formData.date && formData.end_date && (
                    <div
                      style={{
                        marginTop: '0.6rem',
                        padding: '0.6rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        fontSize: '0.78rem',
                        color: '#065f46',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <span style={{ fontSize: '1.1rem' }}>🎉</span>
                      <div>
                        <div>
                          <strong>
                            {Math.max(
                              1,
                              Math.round(
                                (new Date(formData.end_date + 'T00:00:00') - new Date(formData.date + 'T00:00:00')) /
                                  (1000 * 60 * 60 * 24)
                              ) + 1
                            )}{' '}
                            Days Festival Leave
                          </strong>{' '}
                          ({new Date(formData.date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} to{' '}
                          {new Date(formData.end_date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })})
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                          Each day will be individually marked and credited on the employee calendar.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>
                    Compensation
                  </label>
                  <select
                    className="input"
                    value={formData.is_paid ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, is_paid: e.target.value === 'true' })}
                  >
                    <option value="true">Paid Holiday</option>
                    <option value="false">Unpaid Holiday</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>
                    Applicable Scope
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="ALL or Branch"
                    value={formData.applicable_to}
                    onChange={(e) => setFormData({ ...formData, applicable_to: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>
                  Description / Cultural Significance
                </label>
                <textarea
                  className="input"
                  rows={2}
                  placeholder="Optional background or official office closure notice"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalMode(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : modalMode === 'create' ? 'Create Holiday' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. MODAL: CSV BULK IMPORT */}
      {isImportModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '650px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              backgroundColor: '#fff',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-main)' }}>
                  📤 Bulk Import Holidays via CSV
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Upload a CSV file with holiday schedules for fast registration.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            {/* Sample Template */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                backgroundColor: 'rgba(15, 118, 110, 0.06)',
                border: '1px dashed var(--primary)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.5rem',
              }}
            >
              <div>
                <div style={{ fontWeight: '600', fontSize: '0.875rem', color: 'var(--primary)' }}>
                  Need standard format template?
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Download the sample holiday schedule template with proper columns.
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={downloadSampleHolidayCsv}
                style={{ fontSize: '0.8125rem', padding: '0.4rem 0.75rem' }}
              >
                📄 Download Sample CSV
              </button>
            </div>

            {/* File Input */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Select CSV File:
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem',
                }}
              />
              {importFileName && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Selected file: <strong>{importFileName}</strong> ({importRows.length} rows detected)
                </div>
              )}
            </div>

            {/* Validation Errors Notice */}
            {importErrors.length > 0 && (
              <div
                style={{
                  padding: '0.875rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.25rem',
                  maxHeight: '160px',
                  overflowY: 'auto',
                }}
              >
                <div style={{ fontWeight: '600', fontSize: '0.8125rem', color: 'var(--danger)', marginBottom: '0.25rem' }}>
                  ⚠️ Validation Issues ({importErrors.length}):
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.75rem', color: 'var(--danger)' }}>
                  {importErrors.slice(0, 5).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {importErrors.length > 5 && <li>...and {importErrors.length - 5} more issues.</li>}
                </ul>
              </div>
            )}

            {/* Preview Table */}
            {importRows.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  Preview ({importRows.filter((r) => r.isValid).length} valid / {importRows.length} total):
                </div>
                <div style={{ overflowX: 'auto', maxHeight: '200px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                    <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
                      <tr>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Status</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Holiday Name</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Date</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Type</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Scope</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.map((r, i) => (
                        <tr
                          key={i}
                          style={{
                            borderBottom: '1px solid var(--border-color)',
                            backgroundColor: r.isValid ? 'transparent' : 'rgba(239, 68, 68, 0.05)',
                          }}
                        >
                          <td style={{ padding: '0.5rem' }}>
                            {r.isValid ? <span style={{ color: 'var(--success)' }}>✓ Ready</span> : <span style={{ color: 'var(--danger)' }}>✗ Invalid</span>}
                          </td>
                          <td style={{ padding: '0.5rem', fontWeight: '600' }}>{r.name}</td>
                          <td style={{ padding: '0.5rem' }}>{r.date}</td>
                          <td style={{ padding: '0.5rem' }}>{r.is_paid ? 'Paid' : 'Unpaid'}</td>
                          <td style={{ padding: '0.5rem' }}>{r.applicable_to}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Import Execution Summary */}
            {importSummary && (
              <div
                style={{
                  padding: '1rem',
                  backgroundColor: importSummary.failed === 0 ? 'var(--success-bg)' : 'rgba(245, 158, 11, 0.1)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.25rem',
                  border: `1px solid ${importSummary.failed === 0 ? 'var(--success)' : 'var(--warning)'}`,
                }}
              >
                <div style={{ fontWeight: '700', fontSize: '0.875rem' }}>
                  {importSummary.failed === 0 ? '🎉 Holidays Imported Successfully!' : '⚠️ Import Completed with Some Errors'}
                </div>
                <div style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>
                  Successfully imported: <strong>{importSummary.success}</strong> | Failed: <strong>{importSummary.failed}</strong>
                </div>
                {importSummary.failDetails?.length > 0 && (
                  <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.25rem', fontSize: '0.75rem', color: 'var(--danger)' }}>
                    {importSummary.failDetails.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsImportModalOpen(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={isImporting || importRows.filter((r) => r.isValid).length === 0}
                onClick={handleExecuteImport}
              >
                {isImporting ? 'Importing...' : `Import ${importRows.filter((r) => r.isValid).length} Valid Holidays`}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default HolidaysPage;
