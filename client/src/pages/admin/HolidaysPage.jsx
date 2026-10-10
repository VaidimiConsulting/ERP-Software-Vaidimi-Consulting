import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { getHolidays, createHoliday, updateHoliday, deleteHoliday } from '../../services/holidayService';
import { exportToCsv, parseCsv, downloadSampleHolidayCsv } from '../../utils/csvUtils';

function HolidaysPage() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit'
  const [currentHoliday, setCurrentHoliday] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    is_paid: true,
    applicable_to: 'ALL',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);

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
      if (res.success) setHolidays(res.data);
    } catch (err) {
      console.error('Failed to load holidays:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHolidays();
  }, [selectedYear]);

  const openCreateModal = () => {
    setModalMode('create');
    setFormData({
      name: '',
      date: '',
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
      is_paid: h.is_paid,
      applicable_to: h.applicable_to,
      description: h.description || '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (modalMode === 'create') {
        await createHoliday(formData);
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
    if (!window.confirm(`Are you sure you want to delete holiday '${h.name}'?`)) return;
    try {
      await deleteHoliday(h.id);
      loadHolidays();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleExportCsv = () => {
    const columns = [
      { key: 'name', label: 'Holiday Name' },
      { key: 'date', label: 'Date' },
      { key: 'is_paid', label: 'Is Paid', format: (v) => v ? 'TRUE' : 'FALSE' },
      { key: 'applicable_to', label: 'Applicable To' },
      { key: 'description', label: 'Description', format: (v) => v || '' },
    ];
    exportToCsv(`vaidimi_holidays_${selectedYear}.csv`, holidays, columns);
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
    const validRows = importRows.filter(r => r.isValid);
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

  return (
    <AppLayout
      pageTitle="Company Holidays"
      subtitle="Vaidimi Corporate Head Office (Varanasi HQ) • Manage official paid and unpaid holidays across all branches"
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
              Official Festival and Gazetted Holiday Calendar • Sigra / Cantt, Varanasi
            </div>
          </div>
        </div>
      </div>

      {/* Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        {/* Flexible Year Selector (1900 to unlimited) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--text-main)' }}>Year:</label>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setSelectedYear((y) => Math.max(1900, y - 1))}
            style={{ padding: '0.35rem 0.6rem', fontSize: '0.8125rem' }}
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
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            style={{ width: '90px', textAlign: 'center', fontWeight: '700', padding: '0.35rem 0.5rem' }}
            title="Search any year from 1900 to unlimited"
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setSelectedYear((y) => Math.min(2199, y + 1))}
            style={{ padding: '0.35rem 0.6rem', fontSize: '0.8125rem' }}
            title="Next Year"
          >
            ▶
          </button>

          {/* Quick Preset Pills */}
          <div style={{ display: 'flex', gap: '0.25rem', marginLeft: '0.25rem' }}>
            {[2024, 2025, 2026, 2027, 2028].map((yr) => (
              <button
                key={yr}
                type="button"
                className="btn"
                onClick={() => setSelectedYear(yr)}
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: selectedYear === yr ? '700' : '500',
                  backgroundColor: selectedYear === yr ? 'var(--primary)' : 'var(--bg-subtle)',
                  color: selectedYear === yr ? '#ffffff' : 'var(--text-muted)',
                  border: '1px solid var(--border-color)',
                }}
              >
                {yr}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportCsv}
            title="Download holidays as CSV"
          >
            📥 Export Holidays (CSV)
          </button>
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
            title="Bulk import holidays from CSV"
          >
            📤 Import Holidays (CSV)
          </button>
          <button className="btn btn-primary" onClick={openCreateModal}>
            ➕ Add Holiday
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading holidays...</div>
        ) : holidays.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No holidays registered for {selectedYear}. Click "Add Holiday" to register official days off.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Holiday Name</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Day</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Type</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Applicable To</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {holidays.map((h) => (
                  <tr key={h.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{h.name}</div>
                      {h.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{h.description}</div>}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>{h.date}</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                      {new Date(h.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long' })}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className={`badge ${h.is_paid ? 'badge-success' : 'badge-warning'}`}>
                        {h.is_paid ? 'Paid Holiday' : 'Unpaid Holiday'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ padding: '0.2rem 0.5rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>
                        {h.applicable_to}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary" onClick={() => openEditModal(h)} style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>
                          Edit
                        </button>
                        <button className="btn btn-danger" onClick={() => handleDelete(h)} style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalMode && (
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
          <div className="card" style={{ width: '440px', maxWidth: '90%' }}>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
              {modalMode === 'create' ? 'Add Company Holiday' : 'Edit Holiday'}
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Define holiday title, date, and compensation policy.
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>Holiday Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. New Year's Day, Diwali"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>Date</label>
                <input
                  type="date"
                  className="input"
                  min="1900-01-01"
                  max="2199-12-31"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>Compensation</label>
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
                  <label style={{ fontSize: '0.8125rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>Applicable To</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="ALL or department"
                    value={formData.applicable_to}
                    onChange={(e) => setFormData({ ...formData, applicable_to: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>Description (Optional)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Short note or observation details"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalMode(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : modalMode === 'create' ? 'Create Holiday' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* CSV Bulk Import Modal */}
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
                  Upload a CSV file with holiday schedules.
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
                  Need the standard format?
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Download the sample holiday schedule template.
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
                  Preview ({importRows.filter(r => r.isValid).length} valid / {importRows.length} total):
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
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: r.isValid ? 'transparent' : 'rgba(239, 68, 68, 0.05)' }}>
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
                disabled={isImporting || importRows.filter(r => r.isValid).length === 0}
                onClick={handleExecuteImport}
              >
                {isImporting ? 'Importing...' : `Import ${importRows.filter(r => r.isValid).length} Valid Holidays`}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default HolidaysPage;
