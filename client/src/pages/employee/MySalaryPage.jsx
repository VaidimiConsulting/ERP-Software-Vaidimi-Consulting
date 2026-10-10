import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { getMyPayroll } from '../../services/payrollService';
import { useAuth } from '../../context/AuthContext';
import { exportToCsv } from '../../utils/csvUtils';
import html2pdf from 'html2pdf.js';

function MySalaryPage() {
  const { user } = useAuth();
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlip, setSelectedSlip] = useState(null);

  const handleDownloadPdf = () => {
    if (!selectedSlip) return;
    const element = document.getElementById('payslip-content');
    const opt = {
      margin:       0.5,
      filename:     `Salary_Slip_${selectedSlip.month}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  const handleExportMySalaryCsv = () => {
    if (!payrolls || payrolls.length === 0) {
      alert('No salary records available to export.');
      return;
    }

    const columns = [
      { key: 'month', label: 'Month' },
      { key: 'base_salary', label: 'Base CTC (₹)', format: (v) => Number(v || 0).toFixed(2) },
      { key: 'total_days', label: 'Total Month Days' },
      { key: 'present_days', label: 'Present Days' },
      { key: 'half_days', label: 'Half Days' },
      { key: 'sundays_count', label: 'Sunday Paid Offs' },
      { key: 'sat_half_days', label: '2nd/4th Sat Offs', format: () => '2 Half Days' },
      { key: 'paid_leaves', label: 'Approved Paid Leaves' },
      { key: 'sick_leaves', label: 'Sick Leaves', format: (v) => v || 0 },
      { key: 'casual_leaves', label: 'Casual Leaves', format: (v) => v || 0 },
      { key: 'menstrual_leaves', label: 'Menstrual Leaves', format: (v) => v || 0 },
      { key: 'unpaid_leaves', label: 'Unpaid Leaves', format: (v) => v || 0 },
      { key: 'absent_days', label: 'Absent Days' },
      { key: 'payable_days', label: 'Payable Days' },
      { key: 'gross_salary', label: 'Gross Salary (₹)', format: (v) => Number(v || 0).toFixed(2) },
      { key: 'deductions', label: 'Deductions (₹)', format: (v) => Number(v || 0).toFixed(2) },
      { key: 'net_salary', label: 'Net Take-Home (₹)', format: (v) => Number(v || 0).toFixed(2) },
      { key: 'payment_status', label: 'Payment Status' },
      { key: 'payment_date', label: 'Disbursal Date', format: (v) => v || 'Pending' },
    ];

    exportToCsv(`my_salary_statement_${user?.employeeProfile?.employee_code || 'vaidimi'}.csv`, payrolls, columns);
  };

  const loadSalary = async () => {
    setLoading(true);
    try {
      const res = await getMyPayroll();
      if (res.success) {
        setPayrolls(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load salary history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSalary();
  }, []);

  const latestSlip = payrolls[0] || null;

  return (
    <AppLayout
      pageTitle="My Compensation & Payslips"
      subtitle="View your monthly compensation breakdown, attendance calculations, paid off credits, and salary statements"
    >
      {/* Policy Advisory Banner */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            padding: '1.25rem 1.5rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
            borderLeft: '4px solid #10b981',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span>🎉</span>
            <strong style={{ color: '#0f172a' }}>Sundays are Paid Off</strong>
          </div>
          <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
            Every Sunday is an official paid weekly off. No attendance check-in required.
          </p>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            padding: '1.25rem 1.5rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
            borderLeft: '4px solid #f59e0b',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span>⏱️</span>
            <strong style={{ color: '#0f172a' }}>2nd & 4th Saturday Half Day</strong>
          </div>
          <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
            2nd and 4th Saturday of the month are designated half days (0.5 day credit).
          </p>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            padding: '1.25rem 1.5rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
            borderLeft: '4px solid #0f766e',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span>🏢</span>
            <strong style={{ color: '#0f172a' }}>Office Login Hours</strong>
          </div>
          <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
            Login window: 10:00 AM – 11:00 AM (✅ On-Time). Late login marked 🔴 after 11:00 AM. Shift: 10:00 AM – 5:30 PM (6.0 hrs net work requirement).
          </p>
        </div>
      </div>

      {/* Latest Month Highlight Card */}
      {latestSlip && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)',
            padding: '1.75rem 2rem',
            marginBottom: '1.75rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  color: 'var(--primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Latest Statement
              </span>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a' }}>
                Salary Statement &bull; {latestSlip.month}
              </h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  padding: '0.35rem 0.875rem',
                  borderRadius: '9999px',
                  fontSize: '0.8125rem',
                  fontWeight: '800',
                  backgroundColor: latestSlip.is_sent_to_employee ? '#ecfdf5' : '#fef3c7',
                  color: latestSlip.is_sent_to_employee ? '#065f46' : '#92400e',
                  border: `1px solid ${latestSlip.is_sent_to_employee ? '#a7f3d0' : '#fde68a'}`,
                }}
              >
                {latestSlip.is_sent_to_employee ? '🟢 Disbursed to Portal by Admin' : '⏳ Pending Admin Release'}
              </span>

              <span
                style={{
                  padding: '0.35rem 0.875rem',
                  borderRadius: '9999px',
                  fontSize: '0.8125rem',
                  fontWeight: '800',
                  backgroundColor: latestSlip.payment_status === 'PAID' ? '#d1fae5' : '#fef3c7',
                  color: latestSlip.payment_status === 'PAID' ? '#065f46' : '#92400e',
                }}
              >
                {latestSlip.payment_status === 'PAID' ? '✓ Paid' : '⏳ Payment Pending'}
              </span>

              <button
                className="btn btn-secondary"
                onClick={handleExportMySalaryCsv}
                style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                📥 Export Statement (.csv)
              </button>

              <button
                className="btn btn-primary"
                onClick={() => setSelectedSlip(latestSlip)}
                style={{ fontSize: '0.8125rem' }}
              >
                📄 View Full Payslip
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '1rem',
              backgroundColor: '#f8fafc',
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Base Monthly CTC:</span>
              <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#0f172a' }}>
                ₹{Number(latestSlip.base_salary).toLocaleString('en-IN')}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Payable Days:</span>
              <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#0f766e' }}>
                {latestSlip.payable_days} / {latestSlip.total_days} Days
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Sundays Credited:</span>
              <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#059669' }}>
                {latestSlip.sundays_count} Days
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>2nd/4th Sat Credit:</span>
              <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#b45309' }}>
                2 Saturdays (1.0d)
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Approved Leaves:</span>
              <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#6366f1' }}>
                {latestSlip.paid_leaves} Days
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Net Take-Home:</span>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#10b981' }}>
                ₹{Number(latestSlip.net_salary).toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Historical Payslips Table */}
      <div className="payroll-table-container">
        <div style={{ padding: '1.125rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem' }}>📑</span>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.01em' }}>
              Payslip History & Compensation Statements
            </h3>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Official monthly breakdown of earnings, statutory credits, and disbursed salaries
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            Loading salary records...
          </div>
        ) : payrolls.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            No salary records generated yet. Once HR or Admin generates the monthly payroll, your payslip will appear here.
          </div>
        ) : (
          <div className="payroll-table-responsive">
            <table className="payroll-table">
              <thead>
                <tr>
                  <th style={{ minWidth: '100px' }}>Month</th>
                  <th style={{ minWidth: '110px' }}>Base CTC</th>
                  <th style={{ minWidth: '110px' }}>Present Days</th>
                  <th style={{ minWidth: '120px' }}>Sundays (Paid)</th>
                  <th style={{ minWidth: '110px' }}>Payable Days</th>
                  <th style={{ minWidth: '105px' }}>Deductions</th>
                  <th style={{ minWidth: '120px' }}>Net Take-Home</th>
                  <th style={{ minWidth: '130px' }}>Portal Disbursal</th>
                  <th style={{ minWidth: '100px' }}>Status</th>
                  <th style={{ minWidth: '110px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {payrolls.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: '700', color: '#0f172a' }}>
                      {p.month}
                    </td>
                    <td>
                      <div className="payroll-number" style={{ fontWeight: '700', color: '#0f172a' }}>
                        ₹{Number(p.base_salary).toLocaleString('en-IN')}
                      </div>
                      {(Number(p.bonus || 0) > 0 || Number(p.allowances || 0) > 0) && (
                        <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: '600' }}>
                          +{Number(Number(p.bonus || 0) + Number(p.allowances || 0)).toLocaleString('en-IN')} Add-ons
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="attn-chip present">
                        {p.present_days} Days
                      </span>
                    </td>
                    <td>
                      <span className="attn-chip sunday">
                        {p.sundays_count} Days
                      </span>
                    </td>
                    <td>
                      <div className="payroll-number" style={{ fontWeight: '700', color: '#0f172a' }}>
                        {p.payable_days} <span style={{ color: '#94a3b8', fontWeight: '500' }}>/ {p.total_days}</span>
                      </div>
                    </td>
                    <td>
                      <div
                        className="payroll-number"
                        style={{
                          fontWeight: '700',
                          color: Number(p.deductions) > 0 ? '#ef4444' : '#64748b',
                        }}
                      >
                        {Number(p.deductions) > 0 ? `-₹${Number(p.deductions).toLocaleString('en-IN')}` : '₹0.00'}
                      </div>
                    </td>
                    <td>
                      <div
                        className="payroll-number"
                        style={{
                          fontSize: '0.95rem',
                          fontWeight: '800',
                          color: '#047857',
                        }}
                      >
                        ₹{Number(p.net_salary).toLocaleString('en-IN')}
                      </div>
                    </td>
                    <td>
                      {p.is_sent_to_employee ? (
                        <div>
                          <span
                            style={{
                              padding: '0.15rem 0.5rem',
                              backgroundColor: '#ecfdf5',
                              color: '#065f46',
                              border: '1px solid #a7f3d0',
                              borderRadius: '9999px',
                              fontSize: '0.7rem',
                              fontWeight: '700',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                            }}
                          >
                            🟢 Disbursed
                          </span>
                          {p.sent_at && (
                            <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '0.15rem' }}>
                              {p.sent_at.split('T')[0]}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span
                          style={{
                            padding: '0.15rem 0.5rem',
                            backgroundColor: '#fffbeb',
                            color: '#b45309',
                            border: '1px solid #fde68a',
                            borderRadius: '9999px',
                            fontSize: '0.7rem',
                            fontWeight: '700',
                          }}
                        >
                          ⏳ Pending
                        </span>
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: '9999px',
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          backgroundColor: p.payment_status === 'PAID' ? '#d1fae5' : '#fef3c7',
                          color: p.payment_status === 'PAID' ? '#065f46' : '#92400e',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                      >
                        <span
                          style={{
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            backgroundColor: p.payment_status === 'PAID' ? '#10b981' : '#f59e0b',
                          }}
                        />
                        {p.payment_status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="payroll-btn payroll-btn-payslip"
                        onClick={() => setSelectedSlip(p)}
                      >
                        📄 View Payslip
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payslip Modal */}
      {selectedSlip && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '620px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
              border: '1px solid #e2e8f0',
              padding: '2rem',
            }}
          >
            <div id="payslip-content" style={{ padding: '0.5rem' }}>
            <div
              style={{
                borderBottom: '2px solid #0f766e',
                paddingBottom: '1.25rem',
                marginBottom: '1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div>
                <div style={{ fontSize: '1.375rem', fontWeight: '800', color: '#0f766e' }}>
                  Vaidimi Consulting
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Official Employee Payslip &bull; {selectedSlip.month}
                </div>
              </div>
              <div>
                <span
                  style={{
                    padding: '0.25rem 0.75rem',
                    backgroundColor: selectedSlip.payment_status === 'PAID' ? '#d1fae5' : '#fef3c7',
                    color: selectedSlip.payment_status === 'PAID' ? '#065f46' : '#92400e',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: '800',
                  }}
                >
                  {selectedSlip.payment_status}
                </span>
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#f8fafc',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.25rem',
                fontSize: '0.8125rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: '#64748b' }}>Employee Name:</span>
                <strong>
                  {selectedSlip.employee?.first_name} {selectedSlip.employee?.last_name}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: '#64748b' }}>Employee Code:</span>
                <strong style={{ fontFamily: 'monospace' }}>{selectedSlip.employee?.employee_code}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Designation:</span>
                <strong>{selectedSlip.employee?.designation}</strong>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', marginBottom: '1.25rem' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.4rem 0', color: '#64748b' }}>Base CTC</td>
                  <td style={{ padding: '0.4rem 0', textAlign: 'right', fontWeight: '700' }}>
                    ₹{Number(selectedSlip.base_salary).toLocaleString('en-IN')}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.4rem 0', color: '#64748b' }}>Present Days</td>
                  <td style={{ padding: '0.4rem 0', textAlign: 'right', fontWeight: '700', color: '#10b981' }}>
                    {selectedSlip.present_days} Days
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.4rem 0', color: '#64748b' }}>Sunday Holidays (Paid)</td>
                  <td style={{ padding: '0.4rem 0', textAlign: 'right', fontWeight: '700', color: '#059669' }}>
                    {selectedSlip.sundays_count} Days
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.4rem 0', color: '#64748b' }}>2nd & 4th Saturday Half Days</td>
                  <td style={{ padding: '0.4rem 0', textAlign: 'right', fontWeight: '700', color: '#b45309' }}>
                    2 Days (1.0d credit)
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.4rem 0', color: '#64748b' }}>Approved Paid Leaves</td>
                  <td style={{ padding: '0.4rem 0', textAlign: 'right', fontWeight: '700', color: '#6366f1' }}>
                    {selectedSlip.paid_leaves} Days
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.4rem 0', color: '#64748b' }}>Total Payable Days</td>
                  <td style={{ padding: '0.4rem 0', textAlign: 'right', fontWeight: '800' }}>
                    {selectedSlip.payable_days} / {selectedSlip.total_days} Days
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '0.4rem 0', color: '#ef4444' }}>Deductions (Absences)</td>
                  <td style={{ padding: '0.4rem 0', textAlign: 'right', fontWeight: '700', color: '#ef4444' }}>
                    -₹{Number(selectedSlip.deductions).toLocaleString('en-IN')}
                  </td>
                </tr>
              </tbody>
            </table>

            <div
              style={{
                backgroundColor: '#f0fdfa',
                border: '2px solid #0f766e',
                borderRadius: 'var(--radius-md)',
                padding: '1rem 1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ fontWeight: '700', color: '#0f766e' }}>Net Take-Home Salary:</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#0f766e' }}>
                ₹{Number(selectedSlip.net_salary).toLocaleString('en-IN')}
              </div>
            </div>

            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={handleDownloadPdf}>
                ⬇️ Download PDF
              </button>
              <button className="btn btn-secondary" onClick={() => window.print()}>
                🖨️ Print
              </button>
              <button className="btn btn-primary" onClick={() => setSelectedSlip(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default MySalaryPage;
