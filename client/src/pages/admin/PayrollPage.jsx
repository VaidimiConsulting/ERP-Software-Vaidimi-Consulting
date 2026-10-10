import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import {
  generateMonthlyPayroll,
  getPayrollRecords,
  updatePayrollStatus,
  createPayrollRecord,
  updatePayrollRecord,
  deletePayrollRecord,
  sendPayrollToEmployee,
  sendBulkPayrollToEmployees,
} from '../../services/payrollService';
import { getEmployees } from '../../services/employeeService';
import { useAuth } from '../../context/AuthContext';
import { exportToCsv } from '../../utils/csvUtils';
import html2pdf from 'html2pdf.js';

function PayrollPage() {
  const { isAdmin } = useAuth();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [summary, setSummary] = useState(null);
  const [calendarRules, setCalendarRules] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Selected payslip modal state
  const [selectedPayslip, setSelectedPayslip] = useState(null);

  const handleDownloadPdf = () => {
    if (!selectedPayslip) return;
    const element = document.getElementById('admin-payslip-content');
    const opt = {
      margin:       0.5,
      filename:     `Salary_Slip_${selectedPayslip.employee?.first_name}_${selectedPayslip.month}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  // Action status messages
  const [actionNotice, setActionNotice] = useState('');
  const [actionError, setActionError] = useState('');

  // Add Custom Payroll Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initialAddForm = {
    employee_id: '',
    month: currentMonth,
    base_salary: 30000,
    bonus: 0,
    allowances: 0,
    total_days: 30,
    present_days: 30,
    half_days: 0,
    payable_days: 30,
    absent_days: 0,
    paid_leaves: 0,
    unpaid_leaves: 0,
    sick_leaves: 0,
    casual_leaves: 0,
    festival_leaves: 0,
    menstrual_leaves: 0,
    sundays_count: 4,
    holidays_count: 0,
    gross_salary: 30000,
    deductions: 0,
    net_salary: 30000,
    payment_status: 'GENERATED',
    payment_date: '',
    is_sent_to_employee: true,
    update_master_salary: false,
    notes: '',
  };
  const [addFormData, setAddFormData] = useState(initialAddForm);

  // Edit / Increase Salary Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  const handleExportPayrollCsv = () => {
    if (!records || records.length === 0) {
      alert('No payroll records found to export for month ' + selectedMonth);
      return;
    }

    const columns = [
      { key: 'emp_code', label: 'Employee ID', format: (_, r) => r.employee?.employee_code || 'N/A' },
      { key: 'name', label: 'Employee Name', format: (_, r) => `${r.employee?.first_name || ''} ${r.employee?.last_name || ''}`.trim() },
      { key: 'email', label: 'Email', format: (_, r) => r.employee?.email || '' },
      { key: 'designation', label: 'Designation / Post', format: (_, r) => r.employee?.designation || '' },
      { key: 'department', label: 'Department', format: (_, r) => r.employee?.department?.department_name || 'General' },
      { key: 'month', label: 'Payroll Month' },
      { key: 'base_salary', label: 'Base CTC (₹)', format: (v) => Number(v || 0).toFixed(2) },
      { key: 'total_days', label: 'Total Month Days' },
      { key: 'present_days', label: 'Present Days' },
      { key: 'half_days', label: 'Half Days' },
      { key: 'sundays_count', label: 'Sunday Paid Offs' },
      { key: 'sat_credits', label: '2nd & 4th Sat Credits', format: () => '1.0 Day (2 Half Days)' },
      { key: 'paid_leaves', label: 'Total Approved Paid Leaves' },
      { key: 'sick_leaves', label: 'Sick Leaves (Paid)', format: (v) => v || 0 },
      { key: 'casual_leaves', label: 'Casual Leaves (Paid)', format: (v) => v || 0 },
      { key: 'festival_leaves', label: 'Festival Leaves (Paid)', format: (v) => v || 0 },
      { key: 'menstrual_leaves', label: 'Menstrual Leaves (Paid)', format: (v) => v || 0 },
      { key: 'unpaid_leaves', label: 'Unpaid Leaves (Deducted)', format: (v) => v || 0 },
      { key: 'absent_days', label: 'Absent Days' },
      { key: 'payable_days', label: 'Payable Days' },
      { key: 'gross_salary', label: 'Gross CTC (₹)', format: (v) => Number(v || 0).toFixed(2) },
      { key: 'deductions', label: 'Deductions (₹)', format: (v) => Number(v || 0).toFixed(2) },
      { key: 'net_salary', label: 'Net Take-Home Pay (₹)', format: (v) => Number(v || 0).toFixed(2) },
      { key: 'payment_status', label: 'Payment Status' },
      { key: 'payment_date', label: 'Disbursal Date', format: (v) => v || 'Pending Disbursal' },
    ];

    exportToCsv(`vaidimi_payroll_${selectedMonth}.csv`, records, columns);
  };

  const loadPayroll = async () => {
    setLoading(true);
    try {
      const res = await getPayrollRecords({
        month: selectedMonth,
        payment_status: statusFilter || undefined,
      });
      if (res.success) {
        setRecords(res.data || []);
        setSummary(res.summary || null);
        setCalendarRules(res.calendarRules || null);
      }
    } catch (err) {
      console.error('Failed to load payroll records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayroll();
  }, [selectedMonth, statusFilter]);

  useEffect(() => {
    if (isAdmin) {
      getEmployees().then((res) => {
        if (res.success) setEmployees(res.data || []);
      }).catch((err) => console.error('Failed to load employees:', err));
    }
  }, [isAdmin]);

  const handleGenerate = async () => {
    setGenerating(true);
    setActionNotice('');
    setActionError('');
    try {
      const res = await generateMonthlyPayroll({ month: selectedMonth });
      if (res.success) {
        setActionNotice(res.message || 'Payroll calculated successfully!');
        loadPayroll();
        setTimeout(() => setActionNotice(''), 6000);
      }
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || 'Failed to generate payroll.');
      setTimeout(() => setActionError(''), 6000);
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkPaid = async (payroll) => {
    if (payroll.payment_status === 'PAID') return;
    const confirm = window.confirm(`Mark salary as PAID for ${payroll.employee?.first_name} ${payroll.employee?.last_name}?`);
    if (confirm) {
      try {
        const res = await updatePayrollStatus(payroll.id, {
          payment_status: 'PAID',
          payment_date: new Date().toISOString().split('T')[0],
        });
        if (res.success) {
          setActionNotice(`Salary marked as PAID for ${payroll.employee?.first_name} ${payroll.employee?.last_name}.`);
          loadPayroll();
          setTimeout(() => setActionNotice(''), 5000);
        }
      } catch (err) {
        setActionError(err.response?.data?.message || 'Failed to update payment status.');
      }
    }
  };

  // Admin Single Send to Employee
  const handleSendToEmployee = async (payroll) => {
    try {
      const res = await sendPayrollToEmployee(payroll.id);
      if (res.success) {
        setActionNotice(`📤 Official payslip for ${payroll.month} sent directly to ${payroll.employee?.first_name} ${payroll.employee?.last_name}'s employee portal.`);
        loadPayroll();
        setTimeout(() => setActionNotice(''), 6000);
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to send payroll to employee.');
    }
  };

  // Admin Bulk Send to all Employees
  const handleSendBulk = async () => {
    const confirm = window.confirm(`Send official payslips for ${selectedMonth} to all active employee portals? Employees will be notified instantly.`);
    if (!confirm) return;

    try {
      const res = await sendBulkPayrollToEmployees({ month: selectedMonth });
      if (res.success) {
        setActionNotice(`🎉 ${res.message}`);
        loadPayroll();
        setTimeout(() => setActionNotice(''), 6000);
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to send bulk payroll.');
    }
  };

  // Admin Open Add Custom Payroll Modal
  const handleOpenAdd = () => {
    setAddFormData({
      ...initialAddForm,
      month: selectedMonth,
      employee_id: employees.length > 0 ? employees[0].id : '',
      base_salary: employees.length > 0 ? (employees[0].base_salary || 30000) : 30000,
      gross_salary: employees.length > 0 ? (employees[0].base_salary || 30000) : 30000,
      net_salary: employees.length > 0 ? (employees[0].base_salary || 30000) : 30000,
    });
    setActionError('');
    setIsAddModalOpen(true);
  };

  // Admin Handle Employee Select in Add Form
  const handleEmployeeSelect = (empId) => {
    const emp = employees.find((e) => String(e.id) === String(empId));
    const base = emp?.base_salary ? Number(emp.base_salary) : 30000;
    const gross = base + Number(addFormData.bonus || 0) + Number(addFormData.allowances || 0);
    const net = Math.max(0, gross - Number(addFormData.deductions || 0));

    setAddFormData((prev) => ({
      ...prev,
      employee_id: empId,
      base_salary: base,
      gross_salary: gross,
      net_salary: net,
    }));
  };

  // Admin Handle Add Submit
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setActionError('');
    try {
      const sanitized = {
        ...addFormData,
        payment_date: addFormData.payment_status === 'PAID' ? (addFormData.payment_date || new Date().toISOString().split('T')[0]) : null,
      };
      const res = await createPayrollRecord(sanitized);
      if (res.success) {
        setActionNotice(`✅ Custom salary record added successfully for ${res.data?.employee?.first_name || 'employee'}.`);
        setIsAddModalOpen(false);
        loadPayroll();
        setTimeout(() => setActionNotice(''), 6000);
      }
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || 'Failed to create payroll record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin Open Edit / Increase Salary Modal
  const handleOpenEdit = (payroll) => {
    setEditingPayroll(payroll);
    setEditFormData({
      base_salary: Number(payroll.base_salary || 0),
      bonus: Number(payroll.bonus || 0),
      allowances: Number(payroll.allowances || 0),
      present_days: Number(payroll.present_days || 0),
      half_days: Number(payroll.half_days || 0),
      payable_days: Number(payroll.payable_days || 0),
      absent_days: Number(payroll.absent_days || 0),
      gross_salary: Number(payroll.gross_salary || 0),
      deductions: Number(payroll.deductions || 0),
      net_salary: Number(payroll.net_salary || 0),
      payment_status: payroll.payment_status || 'GENERATED',
      payment_date: payroll.payment_date || '',
      is_sent_to_employee: Boolean(payroll.is_sent_to_employee),
      update_master_salary: false,
      notes: payroll.notes || '',
    });
    setActionError('');
    setIsEditModalOpen(true);
  };

  // Admin Handle Edit Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setActionError('');
    try {
      const sanitized = {
        ...editFormData,
        payment_date: editFormData.payment_status === 'PAID' ? (editFormData.payment_date || new Date().toISOString().split('T')[0]) : null,
      };
      const res = await updatePayrollRecord(editingPayroll.id, sanitized);
      if (res.success) {
        setActionNotice(`✅ Salary / Payroll details updated successfully for ${editingPayroll.employee?.first_name} ${editingPayroll.employee?.last_name}.`);
        setIsEditModalOpen(false);
        setEditingPayroll(null);
        loadPayroll();
        setTimeout(() => setActionNotice(''), 6000);
      }
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || 'Failed to update payroll.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin Delete Payroll Record
  const handleDeletePayroll = async (payroll) => {
    const confirm = window.confirm(`Permanently delete payroll record for ${payroll.employee?.first_name} ${payroll.employee?.last_name} (${payroll.month})?`);
    if (!confirm) return;

    try {
      const res = await deletePayrollRecord(payroll.id);
      if (res.success) {
        setActionNotice(`🗑️ Payroll record deleted.`);
        loadPayroll();
        setTimeout(() => setActionNotice(''), 5000);
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to delete payroll record.');
    }
  };

  const filteredRecords = records.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = `${r.employee?.first_name || ''} ${r.employee?.last_name || ''}`.toLowerCase();
    const code = (r.employee?.employee_code || '').toLowerCase();
    const designation = (r.employee?.designation || '').toLowerCase();
    return name.includes(q) || code.includes(q) || designation.includes(q);
  });

  if (!isAdmin) {
    return (
      <AppLayout pageTitle="Payroll & Salary Management" subtitle="Access Restricted">
        <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
            Administrative Access Only
          </h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto 1.5rem' }}>
            Corporate payroll calculation, salary structures, deductions, and disbursals are strictly confidential and restricted to System Administrators.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      pageTitle="Payroll & Salary Management"
      subtitle="Monthly compensation processing powered by attendance, approved leaves, Sunday weekly offs & 2nd/4th Saturday half days"
    >
      {/* Top Banner: Company Policy Highlights */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🎉</span>
            <strong style={{ color: '#0f172a', fontSize: '0.9375rem' }}>Sunday Weekly Off</strong>
          </div>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.4 }}>
            All Sundays in the month ({calendarRules?.sundaysCount || 4} days) are 100% paid holidays by company policy.
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '1.25rem' }}>⏱️</span>
            <strong style={{ color: '#0f172a', fontSize: '0.9375rem' }}>2nd & 4th Saturday Half Day</strong>
          </div>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.4 }}>
            The 2nd and 4th Saturday of the month ({calendarRules?.secondAndFourthSaturdays || 2} days) are official half days (0.5 day credit).
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🏢</span>
            <strong style={{ color: '#0f172a', fontSize: '0.9375rem' }}>Login Window & Hours</strong>
          </div>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.4 }}>
            Office timing: 10:30 AM – 11:00 AM login (✅ On-Time). Late login marked 🔴 after 11:00 AM. Shift: 10:30 AM – 5:30 PM (6.0 hrs net work).
          </p>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            padding: '1.25rem 1.5rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
            borderLeft: '4px solid #6366f1',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🏖️</span>
            <strong style={{ color: '#0f172a', fontSize: '0.9375rem' }}>Approved Leave Credits</strong>
          </div>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.4 }}>
            Casual, Sick, Paid, and Festival leaves are automatically credited as paid days in salary calculation.
          </p>
        </div>
      </div>

      {/* KPI Summary Cards */}
      {summary && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              padding: '1.25rem 1.5rem',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              boxShadow: '0 2px 6px rgba(15, 23, 42, 0.05)',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              Processed Employees
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a' }}>
              {summary.totalRecords}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
              Month: {selectedMonth}
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#ffffff',
              padding: '1.25rem 1.5rem',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              boxShadow: '0 2px 6px rgba(15, 23, 42, 0.05)',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              Total Gross Salary
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--primary)' }}>
              ₹{Number(summary.totalGross).toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
              Base CTC before deductions
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#ffffff',
              padding: '1.25rem 1.5rem',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              boxShadow: '0 2px 6px rgba(15, 23, 42, 0.05)',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#ef4444', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              Total Deductions
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#ef4444' }}>
              ₹{Number(summary.totalDeductions).toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
              Absences & unpaid leaves
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#ffffff',
              padding: '1.25rem 1.5rem',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              boxShadow: '0 2px 6px rgba(15, 23, 42, 0.05)',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#10b981', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              Total Net Payable
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#10b981' }}>
              ₹{Number(summary.totalNet).toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
              {summary.paidCount} Paid &bull; {summary.pendingCount} Pending
            </div>
          </div>
        </div>
      )}

      {/* Controls & Filter Bar */}
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: '1.25rem 1.5rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 2px 6px rgba(15, 23, 42, 0.05)',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1 }}>
          {/* Month Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0f172a' }}>Month:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#0f172a',
                outline: 'none',
              }}
            />
          </div>

          {/* Search Box */}
          <input
            type="text"
            placeholder="🔍 Search employee by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: '0.5rem 0.875rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              fontSize: '0.875rem',
              minWidth: '220px',
              outline: 'none',
            }}
          />

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.5rem 0.875rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              fontSize: '0.875rem',
              backgroundColor: '#fff',
              outline: 'none',
            }}
          >
            <option value="">All Statuses</option>
            <option value="GENERATED">Generated / Pending</option>
            <option value="PAID">Paid</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Export Payroll CSV Button */}
          <button
            onClick={handleExportPayrollCsv}
            disabled={records.length === 0}
            className="btn btn-secondary"
            style={{
              padding: '0.625rem 1.125rem',
              fontSize: '0.875rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            📥 Export CSV
          </button>

          {/* Admin Only: Add Custom Payroll Entry Button */}
          {isAdmin && (
            <button
              onClick={handleOpenAdd}
              className="btn btn-secondary"
              style={{
                padding: '0.625rem 1.125rem',
                fontSize: '0.875rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                borderColor: 'var(--primary)',
                color: 'var(--primary)',
                backgroundColor: 'var(--primary-light)',
              }}
              title="Manually add salary or custom compensation record"
            >
              ➕ Add Salary Entry
            </button>
          )}

          {/* Admin Only: Send All to Employee Portals Bulk Button */}
          {isAdmin && records.length > 0 && (
            <button
              onClick={handleSendBulk}
              className="btn btn-secondary"
              style={{
                padding: '0.625rem 1.125rem',
                fontSize: '0.875rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                borderColor: '#10b981',
                color: '#065f46',
                backgroundColor: '#ecfdf5',
              }}
              title="Send all payslips for this month directly to employee portals"
            >
              📤 Send All to Portals
            </button>
          )}

          {/* Generate / Recalculate Button */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn btn-primary"
            style={{
              padding: '0.625rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {generating ? 'Calculating Salary...' : '⚡ Calculate Payroll'}
          </button>
        </div>
      </div>

      {/* Real-time Action Feedback Notices */}
      {actionNotice && (
        <div style={{
          padding: '0.875rem 1.25rem',
          backgroundColor: '#ecfdf5',
          color: '#065f46',
          border: '1px solid #a7f3d0',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.25rem',
          fontSize: '0.875rem',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          boxShadow: 'var(--shadow-xs)'
        }}>
          {actionNotice}
        </div>
      )}

      {actionError && (
        <div style={{
          padding: '0.875rem 1.25rem',
          backgroundColor: '#fef2f2',
          color: '#991b1b',
          border: '1px solid #fecaca',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.25rem',
          fontSize: '0.875rem',
          fontWeight: '600',
        }}>
          ⚠️ {actionError}
        </div>
      )}

      {/* Records Table */}
      <div className="payroll-table-container">
        <div
          style={{
            padding: '1.125rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            background: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.25rem' }}>💼</span>
            <div>
              <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '1rem', letterSpacing: '-0.01em' }}>
                Payroll & Compensation Breakdown &bull; {selectedMonth}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Showing <strong>{filteredRecords.length}</strong> active team record(s)
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={handleExportPayrollCsv}
              disabled={records.length === 0}
              style={{
                background: '#f8fafc',
                border: '1px solid var(--border-color)',
                padding: '0.4rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
                fontWeight: '600',
                color: 'var(--primary)',
                cursor: records.length > 0 ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'all 0.15s ease',
              }}
            >
              📥 Download CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
            Loading payroll records...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>💰</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.5rem' }}>
              No Payroll Records for {selectedMonth}
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: '420px', margin: '0 auto 1.25rem auto' }}>
              Click "Calculate Payroll" above to automatically compute monthly salary based on attendance, approved leaves, and corporate calendar credits.
            </p>
            <button onClick={handleGenerate} className="btn btn-primary">
              ⚡ Calculate Payroll Now
            </button>
          </div>
        ) : (
          <div className="payroll-table-responsive">
            <table className="payroll-table">
              <thead>
                <tr>
                  <th style={{ minWidth: '190px' }}>Employee</th>
                  <th style={{ minWidth: '110px' }}>Base CTC</th>
                  <th style={{ minWidth: '220px' }}>Attendance & Credits</th>
                  <th style={{ minWidth: '110px' }}>Payable Days</th>
                  <th style={{ minWidth: '105px' }}>Deductions</th>
                  <th style={{ minWidth: '120px' }}>Net Take-Home</th>
                  <th style={{ minWidth: '140px' }}>Status & Portal</th>
                  <th style={{ minWidth: '200px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((item) => (
                  <tr key={item.id}>
                    {/* 1. Employee Profile */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            minWidth: '36px',
                            borderRadius: '50%',
                            backgroundColor: '#f0fdfa',
                            color: '#0f766e',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '800',
                            fontSize: '0.8125rem',
                            border: '1.5px solid #ccfbf1',
                          }}
                        >
                          {item.employee?.first_name?.[0]}
                          {item.employee?.last_name?.[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: '700', color: '#0f172a', lineHeight: 1.25, fontSize: '0.875rem' }}>
                            {item.employee?.first_name} {item.employee?.last_name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#475569' }}>
                              {item.employee?.employee_code}
                            </span>{' '}
                            &bull; {item.employee?.designation}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 2. Base CTC */}
                    <td>
                      <div className="payroll-number" style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.9rem' }}>
                        ₹{Number(item.base_salary).toLocaleString('en-IN')}
                      </div>
                      {(Number(item.bonus || 0) > 0 || Number(item.allowances || 0) > 0) && (
                        <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: '600', marginTop: '0.1rem' }}>
                          +{Number((Number(item.bonus || 0) + Number(item.allowances || 0))).toLocaleString('en-IN')} Add-ons
                        </div>
                      )}
                    </td>

                    {/* 3. Attendance & Credits Consolidated */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
                          <span className="attn-chip present" title="Present Days">
                            {item.present_days}P
                          </span>
                          {Number(item.half_days) > 0 && (
                            <span className="attn-chip half" title="Half Days">
                              +{item.half_days}HD
                            </span>
                          )}
                          <span className="attn-chip sunday" title="Sundays (100% Paid Off)">
                            {item.sundays_count} Sun
                          </span>
                          <span className="attn-chip saturday" title="2nd & 4th Saturday Half Days (0.5d credit each)">
                            2 Sat (1d)
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
                          <span className="attn-chip paid-leave" title="Total Approved Paid Leaves">
                            {item.paid_leaves} Paid
                          </span>
                          {Number(item.menstrual_leaves) > 0 && (
                            <span className="attn-chip menstrual" title="Menstrual Welfare Leave (Paid)">
                              🌸 {item.menstrual_leaves}M
                            </span>
                          )}
                          {Number(item.sick_leaves) > 0 && (
                            <span className="attn-chip sick" title="Sick Leave (Paid)">
                              {item.sick_leaves}S
                            </span>
                          )}
                          {Number(item.unpaid_leaves) > 0 && (
                            <span className="attn-chip unpaid" title="Unpaid Leave (Deducted)">
                              {item.unpaid_leaves} Unpaid
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 4. Payable Days */}
                    <td>
                      <div className="payroll-number" style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.875rem' }}>
                        {item.payable_days} <span style={{ color: '#94a3b8', fontWeight: '500' }}>/ {item.total_days}</span>
                      </div>
                      {Number(item.absent_days) > 0 ? (
                        <div style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: '600', marginTop: '0.1rem' }}>
                          {item.absent_days}d Absent
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: '600', marginTop: '0.1rem' }}>
                          Full Month
                        </div>
                      )}
                    </td>

                    {/* 5. Deductions */}
                    <td>
                      <div
                        className="payroll-number"
                        style={{
                          fontWeight: '700',
                          color: Number(item.deductions) > 0 ? '#ef4444' : '#64748b',
                          fontSize: '0.875rem',
                        }}
                      >
                        {Number(item.deductions) > 0 ? `-₹${Number(item.deductions).toLocaleString('en-IN')}` : '₹0.00'}
                      </div>
                    </td>

                    {/* 6. Net Take-Home */}
                    <td>
                      <div
                        className="payroll-number"
                        style={{
                          fontSize: '0.95rem',
                          fontWeight: '800',
                          color: '#047857',
                        }}
                      >
                        ₹{Number(item.net_salary).toLocaleString('en-IN')}
                      </div>
                    </td>

                    {/* 7. Status & Portal */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {/* Payment Status */}
                        <div>
                          <span
                            style={{
                              padding: '0.15rem 0.5rem',
                              borderRadius: '9999px',
                              fontSize: '0.7rem',
                              fontWeight: '700',
                              backgroundColor: item.payment_status === 'PAID' ? '#d1fae5' : '#fef3c7',
                              color: item.payment_status === 'PAID' ? '#065f46' : '#92400e',
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
                                backgroundColor: item.payment_status === 'PAID' ? '#10b981' : '#f59e0b',
                              }}
                            />
                            {item.payment_status === 'PAID' ? '✓ Paid' : '⏳ Pending'}
                          </span>
                        </div>

                        {/* Portal Disbursal Status */}
                        <div>
                          {item.is_sent_to_employee ? (
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
                              title={item.sent_at ? `Sent on ${item.sent_at.split('T')[0]}` : 'Sent to employee'}
                            >
                              🟢 In Portal
                            </span>
                          ) : (
                            <span
                              style={{
                                padding: '0.15rem 0.5rem',
                                backgroundColor: '#f8fafc',
                                color: '#64748b',
                                border: '1px solid #e2e8f0',
                                borderRadius: '9999px',
                                fontSize: '0.7rem',
                                fontWeight: '700',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem',
                              }}
                            >
                              ⏳ Not Sent
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 8. Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <div className="payroll-action-group">
                        <button
                          className="payroll-btn payroll-btn-payslip"
                          onClick={() => setSelectedPayslip(item)}
                          title="View Official Payslip"
                        >
                          📄 Slip
                        </button>

                        {item.payment_status !== 'PAID' && (
                          <button
                            className="payroll-btn payroll-btn-pay"
                            onClick={() => handleMarkPaid(item)}
                            title="Mark Salary as Paid"
                          >
                            ✓ Pay
                          </button>
                        )}

                        {isAdmin && (
                          <>
                            {!item.is_sent_to_employee && (
                              <button
                                className="payroll-btn payroll-btn-send"
                                onClick={() => handleSendToEmployee(item)}
                                title="Disburse statement directly to employee portal"
                              >
                                📤 Send
                              </button>
                            )}

                            <button
                              className="payroll-btn payroll-btn-edit"
                              onClick={() => handleOpenEdit(item)}
                              title="Edit / Increase Salary & CTC"
                            >
                              ✏️ Edit
                            </button>

                            <button
                              className="payroll-btn payroll-btn-delete"
                              onClick={() => handleDeletePayroll(item)}
                              title="Delete this payroll record"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Printable Payslip Modal */}
      {selectedPayslip && (
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
              maxWidth: '650px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
              border: '1px solid #e2e8f0',
              padding: '2rem',
            }}
          >
            <div id="admin-payslip-content" style={{ padding: '0.5rem' }}>
            {/* Payslip Header */}
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
                  Guidance &bull; Growth &bull; Success
                </div>
                <div style={{ fontSize: '0.8125rem', fontWeight: '700', color: '#0f172a', marginTop: '0.5rem' }}>
                  Official Monthly Payslip &bull; {selectedPayslip.month}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span
                  style={{
                    padding: '0.25rem 0.75rem',
                    backgroundColor: selectedPayslip.payment_status === 'PAID' ? '#d1fae5' : '#fef3c7',
                    color: selectedPayslip.payment_status === 'PAID' ? '#065f46' : '#92400e',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: '800',
                  }}
                >
                  {selectedPayslip.payment_status}
                </span>
                {selectedPayslip.payment_date && (
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
                    Paid On: {selectedPayslip.payment_date}
                  </div>
                )}
              </div>
            </div>

            {/* Employee Details Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '1rem',
                backgroundColor: '#f8fafc',
                padding: '1rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.5rem',
                fontSize: '0.875rem',
              }}
            >
              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Employee Name:</span>
                <div style={{ fontWeight: '700', color: '#0f172a' }}>
                  {selectedPayslip.employee?.first_name} {selectedPayslip.employee?.last_name}
                </div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Employee Code:</span>
                <div style={{ fontWeight: '700', color: '#0f172a', fontFamily: 'monospace' }}>
                  {selectedPayslip.employee?.employee_code}
                </div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Designation:</span>
                <div style={{ fontWeight: '600', color: '#0f172a' }}>
                  {selectedPayslip.employee?.designation}
                </div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Department:</span>
                <div style={{ fontWeight: '600', color: '#0f172a' }}>
                  {selectedPayslip.employee?.department?.department_name || 'General Operations'}
                </div>
              </div>
            </div>

            {/* Attendance & Days Breakdown Table */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.5rem' }}>
                Attendance & Holiday Credits Breakdown:
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.5rem 0', color: '#64748b' }}>Total Calendar Days</td>
                    <td style={{ padding: '0.5rem 0', textAlign: 'right', fontWeight: '700' }}>
                      {selectedPayslip.total_days} Days
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.5rem 0', color: '#64748b' }}>Present Days (100% credit)</td>
                    <td style={{ padding: '0.5rem 0', textAlign: 'right', fontWeight: '700', color: '#10b981' }}>
                      {selectedPayslip.present_days} Days
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.5rem 0', color: '#64748b' }}>Half Days (50% credit)</td>
                    <td style={{ padding: '0.5rem 0', textAlign: 'right', fontWeight: '700', color: '#f59e0b' }}>
                      {selectedPayslip.half_days} Days ({Number(selectedPayslip.half_days) * 0.5}d)
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.5rem 0', color: '#64748b' }}>Sunday Paid Holidays (Weekly Off)</td>
                    <td style={{ padding: '0.5rem 0', textAlign: 'right', fontWeight: '700', color: '#059669' }}>
                      {selectedPayslip.sundays_count} Days
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.5rem 0', color: '#64748b' }}>2nd & 4th Saturday Half Days</td>
                    <td style={{ padding: '0.5rem 0', textAlign: 'right', fontWeight: '700', color: '#b45309' }}>
                      2 Saturdays (1.0 Day credit)
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.5rem 0', color: '#64748b' }}>Approved Paid Leaves</td>
                    <td style={{ padding: '0.5rem 0', textAlign: 'right', fontWeight: '700', color: '#6366f1' }}>
                      {selectedPayslip.paid_leaves} Days
                    </td>
                  </tr>
                  <tr style={{ backgroundColor: '#f0fdf4', borderTop: '2px solid #bbf7d0' }}>
                    <td style={{ padding: '0.625rem 0.5rem', fontWeight: '800', color: '#065f46' }}>
                      Total Payable Days
                    </td>
                    <td style={{ padding: '0.625rem 0.5rem', textAlign: 'right', fontWeight: '800', color: '#065f46' }}>
                      {selectedPayslip.payable_days} / {selectedPayslip.total_days} Days
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Financials: Earnings & Deductions */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '1.5rem',
                borderTop: '1px solid #e2e8f0',
                paddingTop: '1.25rem',
                marginBottom: '1.5rem',
              }}
            >
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: '700', color: '#0f766e', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Earnings (₹)
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                  <span>Base CTC:</span>
                  <strong>₹{Number(selectedPayslip.base_salary).toLocaleString('en-IN')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#0f766e' }}>
                  <span>Gross Total:</span>
                  <strong>₹{Number(selectedPayslip.gross_salary).toLocaleString('en-IN')}</strong>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: '700', color: '#ef4444', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Deductions (₹)
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                  <span>Absence ({selectedPayslip.absent_days}d):</span>
                  <strong style={{ color: '#ef4444' }}>-₹{Number(selectedPayslip.deductions).toLocaleString('en-IN')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#ef4444' }}>
                  <span>Total Deductions:</span>
                  <strong>-₹{Number(selectedPayslip.deductions).toLocaleString('en-IN')}</strong>
                </div>
              </div>
            </div>

            {/* Net Salary Payable Highlight */}
            <div
              style={{
                backgroundColor: '#f0fdfa',
                border: '2px solid #0f766e',
                borderRadius: 'var(--radius-md)',
                padding: '1rem 1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#0f766e', textTransform: 'uppercase' }}>
                  Net Take-Home Salary
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Amount credited via official direct bank disbursement
                </div>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#0f766e' }}>
                ₹{Number(selectedPayslip.net_salary).toLocaleString('en-IN')}
              </div>
            </div>
            
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                className="btn btn-secondary"
                onClick={handleDownloadPdf}
                style={{ fontSize: '0.8125rem' }}
              >
                ⬇️ Download PDF
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => window.print()}
                style={{ fontSize: '0.8125rem' }}
              >
                🖨️ Print Slip
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setSelectedPayslip(null)}
                style={{ fontSize: '0.8125rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Admin Add Custom Payroll / Salary Record */}
      {isAddModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1.5rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>➕ Add Custom Salary / Payroll Entry</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Admin control: enter individual employee compensation breakdown</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleAddSubmit}>
              {/* Employee & Month */}
              <div className="grid grid-cols-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                    Select Employee *
                  </label>
                  <select
                    required
                    value={addFormData.employee_id}
                    onChange={(e) => handleEmployeeSelect(e.target.value)}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                  >
                    <option value="">-- Choose Employee --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.employee_code} &bull; {emp.designation})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                    Payroll Month (YYYY-MM) *
                  </label>
                  <input
                    type="month"
                    required
                    value={addFormData.month}
                    onChange={(e) => setAddFormData({ ...addFormData, month: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                  />
                </div>
              </div>

              {/* Base Salary, Bonus & Allowances */}
              <div className="grid grid-cols-3" style={{ gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                    Base Salary (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="100"
                    value={addFormData.base_salary}
                    onChange={(e) => {
                      const base = Number(e.target.value);
                      const gross = base + Number(addFormData.bonus || 0) + Number(addFormData.allowances || 0);
                      const net = Math.max(0, gross - Number(addFormData.deductions || 0));
                      setAddFormData({ ...addFormData, base_salary: base, gross_salary: gross, net_salary: net });
                    }}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                    Bonus (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={addFormData.bonus}
                    onChange={(e) => {
                      const bonus = Number(e.target.value);
                      const gross = Number(addFormData.base_salary || 0) + bonus + Number(addFormData.allowances || 0);
                      const net = Math.max(0, gross - Number(addFormData.deductions || 0));
                      setAddFormData({ ...addFormData, bonus, gross_salary: gross, net_salary: net });
                    }}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                    Allowances (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={addFormData.allowances}
                    onChange={(e) => {
                      const allowances = Number(e.target.value);
                      const gross = Number(addFormData.base_salary || 0) + Number(addFormData.bonus || 0) + allowances;
                      const net = Math.max(0, gross - Number(addFormData.deductions || 0));
                      setAddFormData({ ...addFormData, allowances, gross_salary: gross, net_salary: net });
                    }}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                  />
                </div>
              </div>

              {/* Present, Payable, Deductions, Net */}
              <div className="grid grid-cols-3" style={{ gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                    Payable Days
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={addFormData.payable_days}
                    onChange={(e) => setAddFormData({ ...addFormData, payable_days: Number(e.target.value) })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                    Deductions (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={addFormData.deductions}
                    onChange={(e) => {
                      const deductions = Number(e.target.value);
                      const net = Math.max(0, Number(addFormData.gross_salary || 0) - deductions);
                      setAddFormData({ ...addFormData, deductions, net_salary: net });
                    }}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                    Net Take-Home (₹)
                  </label>
                  <input
                    type="number"
                    value={addFormData.net_salary}
                    onChange={(e) => setAddFormData({ ...addFormData, net_salary: Number(e.target.value) })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontWeight: '700', color: '#10b981' }}
                  />
                </div>
              </div>

              {/* Payment Status */}
              <div className="grid grid-cols-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                    Payment Status
                  </label>
                  <select
                    value={addFormData.payment_status}
                    onChange={(e) => setAddFormData({ ...addFormData, payment_status: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                  >
                    <option value="GENERATED">Generated / Pending</option>
                    <option value="PAID">Paid</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                    Disbursal Date
                  </label>
                  <input
                    type="date"
                    value={addFormData.payment_date}
                    onChange={(e) => setAddFormData({ ...addFormData, payment_date: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                  />
                </div>
              </div>

              {/* Checkboxes: Send to Portal & Update Master CTC */}
              <div style={{ marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={addFormData.is_sent_to_employee}
                    onChange={(e) => setAddFormData({ ...addFormData, is_sent_to_employee: e.target.checked })}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>📤 <strong>Send directly to Employee Portal</strong> (Notifies employee instantly)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={addFormData.update_master_salary}
                    onChange={(e) => setAddFormData({ ...addFormData, update_master_salary: e.target.checked })}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>💼 <strong>Update Employee Master Base CTC</strong> (Increment base salary permanently)</span>
                </label>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                  Remarks / Notes
                </label>
                <textarea
                  rows="2"
                  placeholder="e.g. Special performance incentive + appraisal adjustment"
                  value={addFormData.notes}
                  onChange={(e) => setAddFormData({ ...addFormData, notes: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save & Publish Payroll'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Admin Edit / Increase Salary Record */}
      {isEditModalOpen && editingPayroll && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1.5rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>
                  ✏️ Edit / Increase Salary &bull; {editingPayroll.employee?.first_name} {editingPayroll.employee?.last_name}
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Month: <strong>{editingPayroll.month}</strong> &bull; Employee ID: <strong>{editingPayroll.employee?.employee_code}</strong>
                </p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleEditSubmit}>
              {/* Base Salary, Bonus & Allowances */}
              <div className="grid grid-cols-3" style={{ gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                    Base Salary (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="100"
                    value={editFormData.base_salary}
                    onChange={(e) => {
                      const base = Number(e.target.value);
                      const gross = base + Number(editFormData.bonus || 0) + Number(editFormData.allowances || 0);
                      const net = Math.max(0, gross - Number(editFormData.deductions || 0));
                      setEditFormData({ ...editFormData, base_salary: base, gross_salary: gross, net_salary: net });
                    }}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                    Bonus (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editFormData.bonus}
                    onChange={(e) => {
                      const bonus = Number(e.target.value);
                      const gross = Number(editFormData.base_salary || 0) + bonus + Number(editFormData.allowances || 0);
                      const net = Math.max(0, gross - Number(editFormData.deductions || 0));
                      setEditFormData({ ...editFormData, bonus, gross_salary: gross, net_salary: net });
                    }}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                    Allowances (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editFormData.allowances}
                    onChange={(e) => {
                      const allowances = Number(e.target.value);
                      const gross = Number(editFormData.base_salary || 0) + Number(editFormData.bonus || 0) + allowances;
                      const net = Math.max(0, gross - Number(editFormData.deductions || 0));
                      setEditFormData({ ...editFormData, allowances, gross_salary: gross, net_salary: net });
                    }}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                  />
                </div>
              </div>

              {/* Present, Payable, Deductions, Net */}
              <div className="grid grid-cols-3" style={{ gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                    Payable Days
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={editFormData.payable_days}
                    onChange={(e) => setEditFormData({ ...editFormData, payable_days: Number(e.target.value) })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                    Deductions (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editFormData.deductions}
                    onChange={(e) => {
                      const deductions = Number(e.target.value);
                      const net = Math.max(0, Number(editFormData.gross_salary || 0) - deductions);
                      setEditFormData({ ...editFormData, deductions, net_salary: net });
                    }}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                    Net Take-Home (₹)
                  </label>
                  <input
                    type="number"
                    value={editFormData.net_salary}
                    onChange={(e) => setEditFormData({ ...editFormData, net_salary: Number(e.target.value) })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontWeight: '700', color: '#10b981' }}
                  />
                </div>
              </div>

              {/* Payment Status & Disbursal Date */}
              <div className="grid grid-cols-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                    Payment Status
                  </label>
                  <select
                    value={editFormData.payment_status}
                    onChange={(e) => setEditFormData({ ...editFormData, payment_status: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                  >
                    <option value="GENERATED">Generated / Pending</option>
                    <option value="PAID">Paid</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                    Disbursal Date
                  </label>
                  <input
                    type="date"
                    value={editFormData.payment_date}
                    onChange={(e) => setEditFormData({ ...editFormData, payment_date: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                  />
                </div>
              </div>

              {/* Checkboxes */}
              <div style={{ marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editFormData.is_sent_to_employee}
                    onChange={(e) => setEditFormData({ ...editFormData, is_sent_to_employee: e.target.checked })}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>📤 <strong>Send to Employee Portal</strong> (Notifies employee upon update)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editFormData.update_master_salary}
                    onChange={(e) => setEditFormData({ ...editFormData, update_master_salary: e.target.checked })}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>💼 <strong>Update Employee Master Base CTC</strong> (Increase standard CTC for future months)</span>
                </label>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                  Remarks / Revision Reason
                </label>
                <textarea
                  rows="2"
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Updating...' : 'Update & Save Salary'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default PayrollPage;

