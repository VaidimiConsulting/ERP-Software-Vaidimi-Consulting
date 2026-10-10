import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  toggleEmployeeStatus,
  deleteEmployee,
  resetEmployeePassword,
} from '../../services/employeeService';
import { getDepartments } from '../../services/departmentService';
import { getBranches } from '../../services/branchService';
import { exportToCsv, parseCsv, downloadSampleEmployeeCsv } from '../../utils/csvUtils';

export const CORPORATE_DESIGNATIONS = [
  'Director',
  'Manager',
  'Assistant Manager',
  'HR',
  'Accountant',
  'Senior Developer',
  'Software Developer',
  'Junior Software Developer',
  'Full Stack Developer',
  'DevOps Engineer',
  'Tester',
  'SDE Intern',
  'Intern',
];

export const QUALIFICATION_LEVELS = [
  { value: 'Class 10', label: 'Class 10 (High School / Matriculation)' },
  { value: 'Class 12', label: 'Class 12 (Higher Secondary / Intermediate)' },
  { value: 'Diploma', label: 'Diploma / Polytechnic' },
  { value: 'Graduation', label: 'Graduation (Bachelor Degree - B.Tech, BCA, B.Sc, B.Com, BBA)' },
  { value: 'Post Graduation', label: 'Post Graduation (Master Degree - M.Tech, MCA, MBA, M.Sc, M.Com)' },
  { value: 'Doctorate / Ph.D.', label: 'Doctorate (Ph.D. / Research Scholar)' },
];

export const EDUCATION_FIELDS = [
  { value: 'Engineering & Technology', label: 'Engineering & Technology (B.Tech, B.E., M.Tech)' },
  { value: 'Management & Business', label: 'Management Field (MBA, BBA, PGDM, Operations, HR)' },
  { value: 'Computer Applications & IT', label: 'Computer Applications & IT (BCA, MCA, IT)' },
  { value: 'Commerce, Accounts & Finance', label: 'Commerce, Accounts & Finance (B.Com, M.Com, CA)' },
  { value: 'Science & Mathematics', label: 'Science & Mathematics (B.Sc, M.Sc)' },
  { value: 'Arts & Humanities', label: 'Arts & Humanities (BA, MA)' },
  { value: 'General / Other', label: 'General / Other Field' },
];

function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Onboarding & Credentials Modal State
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [isCredentialModalOpen, setIsCredentialModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');
  const [resetErrorMsg, setResetErrorMsg] = useState('');
  const [copiedField, setCopiedField] = useState('');

  // CSV Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importFileName, setImportFileName] = useState('');
  const [importErrors, setImportErrors] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);

  // Form state
  const initialForm = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    gender: 'MALE',
    date_of_birth: '',
    designation: '',
    department_id: '',
    branch_id: '',
    employment_type: 'EMPLOYEE',
    joining_date: new Date().toISOString().split('T')[0],
    internship_start_date: '',
    internship_end_date: '',
    college: '',
    course: '',
    reporting_manager_id: '',
    mentor_id: '',
    skills: '',
    status: 'ACTIVE',
    address: '',
    emergency_contact: '',
    password: 'Vaidimi@2026!',
    base_salary: 30000.00,
    father_name: '',
    mother_name: '',
    blood_group: '',
    aadhar_number: '',
    permanent_address: '',
    religion: '',
    marital_status: 'SINGLE',
    // Health & Medical Details
    medical_conditions: '',
    allergies: '',
    insurance_policy_number: '',
    insurance_provider: '',
    emergency_doctor_name: '',
    emergency_doctor_phone: '',
    health_status: 'FIT_FOR_DUTY',
    // Educational Qualifications
    highest_qualification: 'Graduation',
    education_field: 'Engineering & Technology',
    passing_year: '',
    percentage_cgpa: '',
    education_details: '',
    profile_photo: '',
  };

  const [formData, setFormData] = useState(initialForm);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load employees, departments, and branches
  const loadData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (selectedDept) params.department_id = selectedDept;
      if (selectedBranch) params.branch_id = selectedBranch;
      if (selectedType) params.employment_type = selectedType;
      if (selectedStatus) params.status = selectedStatus;

      const [empRes, deptRes, branchRes] = await Promise.all([
        getEmployees(params),
        getDepartments(),
        getBranches(),
      ]);

      if (empRes.success) setEmployees(empRes.data);
      if (deptRes.success) setDepartments(deptRes.data);
      if (branchRes.success) setBranches(branchRes.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, selectedDept, selectedBranch, selectedType, selectedStatus]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormData(initialForm);
    setFormError('');
    setIsAddModalOpen(true);
  };

  // Open View Modal
  const handleOpenView = (emp) => {
    setSelectedEmployee(emp);
    setIsViewModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (emp) => {
    setSelectedEmployee(emp);
    setFormData({
      first_name: emp.first_name || '',
      last_name: emp.last_name || '',
      email: emp.email || '',
      phone: emp.phone || '',
      gender: emp.gender || 'MALE',
      date_of_birth: emp.date_of_birth || '',
      designation: emp.designation || '',
      department_id: emp.department_id || '',
      branch_id: emp.branch_id || '',
      employment_type: emp.employment_type || 'EMPLOYEE',
      joining_date: emp.joining_date || '',
      internship_start_date: emp.internship_start_date || '',
      internship_end_date: emp.internship_end_date || '',
      college: emp.college || '',
      course: emp.course || '',
      reporting_manager_id: emp.reporting_manager_id || '',
      mentor_id: emp.mentor_id || '',
      skills: emp.skills || '',
      status: emp.status || 'ACTIVE',
      address: emp.address || '',
      emergency_contact: emp.emergency_contact || '',
      password: '',
      base_salary: emp.base_salary || 30000.00,
      father_name: emp.father_name || '',
      mother_name: emp.mother_name || '',
      blood_group: emp.blood_group || '',
      aadhar_number: emp.aadhar_number || '',
      permanent_address: emp.permanent_address || '',
      religion: emp.religion || '',
      marital_status: emp.marital_status || 'SINGLE',
      medical_conditions: emp.medical_conditions || '',
      allergies: emp.allergies || '',
      insurance_policy_number: emp.insurance_policy_number || '',
      insurance_provider: emp.insurance_provider || '',
      emergency_doctor_name: emp.emergency_doctor_name || '',
      emergency_doctor_phone: emp.emergency_doctor_phone || '',
      health_status: emp.health_status || 'FIT_FOR_DUTY',
      highest_qualification: emp.highest_qualification || 'Graduation',
      education_field: emp.education_field || 'Engineering & Technology',
      passing_year: emp.passing_year || '',
      percentage_cgpa: emp.percentage_cgpa || '',
      education_details: emp.education_details || '',
      profile_photo: emp.profile_photo || '',
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleDelete = async (emp) => {
    const isIntern = emp.employment_type === 'INTERN';
    const typeLabel = isIntern ? 'Intern' : 'Employee';
    const confirmMsg = `Are you sure you want to permanently delete ${typeLabel} "${emp.first_name} ${emp.last_name}" (${emp.employee_code})?\n\nThis will remove their profile, login credentials, attendance records, leaves, and assigned tasks. This action cannot be undone.`;
    
    if (window.confirm(confirmMsg)) {
      try {
        const res = await deleteEmployee(emp.id);
        if (res.success) {
          alert(res.message || `${typeLabel} deleted successfully.`);
          loadData();
        }
      } catch (err) {
        alert(err.response?.data?.message || err.message || 'Failed to delete employee.');
      }
    }
  };

  const handleGeneratePassword = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz!@#$%';
    const rand = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setFormData((prev) => ({ ...prev, password: `Vaidimi@2026${rand}` }));
  };

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    const loginUrl = `${window.location.origin}/login`;
    const text = `✨ Welcome to Vaidimi Consulting ✨\n` +
      `Your employee portal credentials have been generated:\n` +
      `---------------------------------------------\n` +
      `👤 Employee Name : ${createdCredentials.fullName}\n` +
      `🆔 Employee Code : ${createdCredentials.employeeCode}\n` +
      `💼 Designation   : ${createdCredentials.designation}\n` +
      `🔗 Login Portal  : ${loginUrl}\n` +
      `📧 Login ID/Email: ${createdCredentials.email}\n` +
      `🔑 Password      : ${createdCredentials.temporaryPassword}\n` +
      `---------------------------------------------\n` +
      `Please log in using your ID and Password to manage your tasks, attendance, and leaves.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 4000);
  };

  const handleOpenCredentials = (emp) => {
    setCreatedCredentials({
      id: emp.id,
      fullName: `${emp.first_name} ${emp.last_name}`,
      employeeCode: emp.employee_code,
      email: emp.email,
      temporaryPassword: emp.user?.saved_password || 'Password not recorded',
      designation: emp.designation,
      role: emp.user?.role || emp.employment_type || 'EMPLOYEE',
    });
    setResetPasswordInput('');
    setResetSuccessMsg('');
    setResetErrorMsg('');
    setCopied(false);
    setShowPassword(false);
    setIsCredentialModalOpen(true);
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!createdCredentials?.id) return;
    if (!resetPasswordInput || resetPasswordInput.trim().length < 6) {
      setResetErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    setResetLoading(true);
    setResetErrorMsg('');
    setResetSuccessMsg('');
    try {
      const res = await resetEmployeePassword(createdCredentials.id, resetPasswordInput.trim());
      if (res.success) {
        setResetSuccessMsg(res.message || 'Password updated successfully!');
        setCreatedCredentials((prev) => ({
          ...prev,
          temporaryPassword: resetPasswordInput.trim(),
        }));
        setResetPasswordInput('');
        loadData();
      }
    } catch (err) {
      setResetErrorMsg(err.response?.data?.message || err.message || 'Failed to update password.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleCopySingleField = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(''), 2500);
  };

  // Handle Form Submission (Add or Edit)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError('');

    // 1. Strict Name Validation
    const nameRegex = /^[A-Za-z\s]{2,50}$/;
    if (!nameRegex.test(formData.first_name.trim())) {
      setFormError('First name must contain only letters (at least 2 characters). Dummy text or symbols are not allowed.');
      return;
    }
    if (!nameRegex.test(formData.last_name.trim())) {
      setFormError('Last name must contain only letters (at least 2 characters). Dummy text or symbols are not allowed.');
      return;
    }

    // 2. Strict Email Validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(formData.email.trim().toLowerCase())) {
      setFormError('Please enter a valid email address (e.g. employee@vaidimi.com or name@gmail.com).');
      return;
    }

    // 3. Strict Mobile / Phone Validation
    const validatePhone = (val) => {
      if (!val) return true;
      const digits = String(val).replace(/\D/g, '');
      if (digits.length === 10 && /^[6-9]/.test(digits)) return true;
      if (digits.length === 12 && digits.startsWith('91') && /^[6-9]/.test(digits.slice(2))) return true;
      if (digits.length >= 7 && digits.length <= 15) return true;
      return false;
    };

    if (formData.phone && !validatePhone(formData.phone)) {
      setFormError('Please enter a valid mobile number (e.g. 9876543210 or +91 9876543210).');
      return;
    }

    // 4. Strict Emergency Contact Validation
    if (formData.emergency_contact && !validatePhone(formData.emergency_contact)) {
      setFormError('Emergency contact must be a valid mobile number.');
      return;
    }

    const sanitizePayload = (data) => {
      const sanitized = { ...data };
      if (sanitized.phone) {
        const digits = String(sanitized.phone).replace(/\D/g, '');
        if (digits.length === 10) sanitized.phone = digits;
        else if (digits.length === 12 && digits.startsWith('91')) sanitized.phone = digits.slice(2);
      } else {
        sanitized.phone = null;
      }
      if (sanitized.emergency_contact) {
        const digits = String(sanitized.emergency_contact).replace(/\D/g, '');
        if (digits.length === 10) sanitized.emergency_contact = digits;
        else if (digits.length === 12 && digits.startsWith('91')) sanitized.emergency_contact = digits.slice(2);
      } else {
        sanitized.emergency_contact = null;
      }
      sanitized.date_of_birth = sanitized.date_of_birth || null;
      sanitized.joining_date = sanitized.joining_date || null;
      sanitized.internship_start_date = sanitized.internship_start_date || null;
      sanitized.internship_end_date = sanitized.internship_end_date || null;
      sanitized.department_id = sanitized.department_id ? Number(sanitized.department_id) : null;
      sanitized.branch_id = sanitized.branch_id ? Number(sanitized.branch_id) : null;
      sanitized.reporting_manager_id = sanitized.reporting_manager_id ? Number(sanitized.reporting_manager_id) : null;
      sanitized.mentor_id = sanitized.mentor_id ? Number(sanitized.mentor_id) : null;
      if (sanitized.base_salary !== undefined && sanitized.base_salary !== '') {
        sanitized.base_salary = Number(sanitized.base_salary);
      }
      return sanitized;
    };

    const cleanPayload = sanitizePayload(formData);

    setIsSubmitting(true);

    try {
      if (isAddModalOpen) {
        const res = await createEmployee(cleanPayload);
        if (res.success) {
          setIsAddModalOpen(false);
          setCreatedCredentials(res.generatedCredentials || {
            email: formData.email.trim().toLowerCase(),
            temporaryPassword: formData.password || 'Vaidimi@2026!',
            employeeCode: res.data?.employee_code || 'EMP',
            fullName: `${formData.first_name.trim()} ${formData.last_name.trim()}`,
            designation: formData.designation.trim(),
            role: res.data?.user?.role || 'EMPLOYEE',
          });
          setCopied(false);
          setShowPassword(false);
          setIsCredentialModalOpen(true);
          loadData();
        }
      } else if (isEditModalOpen && selectedEmployee) {
        const res = await updateEmployee(selectedEmployee.id, cleanPayload);
        if (res.success) {
          setIsEditModalOpen(false);
          loadData();
        }
      }
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Status
  const handleToggleStatus = async (id) => {
    try {
      const res = await toggleEmployeeStatus(id);
      if (res.success) {
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status.');
    }
  };



  // Export Staff to CSV
  const handleExportCsv = () => {
    const columns = [
      { key: 'employee_code', label: 'Employee Code' },
      { key: 'first_name', label: 'First Name' },
      { key: 'last_name', label: 'Last Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'designation', label: 'Designation' },
      { key: 'department', label: 'Department', format: (d, row) => row.department?.department_name || '' },
      { key: 'employment_type', label: 'Employment Type' },
      { key: 'status', label: 'Status' },
      { key: 'joining_date', label: 'Joining Date' },
      { key: 'skills', label: 'Skills' },
    ];
    exportToCsv('vaidimi_staff_directory.csv', employees, columns);
  };

  // Handle CSV file selection for Bulk Import
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
          const fname = row.firstname || row.first_name || '';
          const lname = row.lastname || row.last_name || '';
          const email = (row.email || '').trim().toLowerCase();
          const phone = String(row.phone || row.mobile || '').replace(/[\s\-\(\)]/g, '');
          const rowErrors = [];

          if (!fname || !/^[A-Za-z\s]{2,50}$/.test(fname)) {
            rowErrors.push(`Row ${rowNum}: First name must contain only letters (min 2 chars)`);
          }
          if (!lname || !/^[A-Za-z\s]{2,50}$/.test(lname)) {
            rowErrors.push(`Row ${rowNum}: Last name must contain only letters (min 2 chars)`);
          }
          if (!email || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
            rowErrors.push(`Row ${rowNum}: Invalid email (${email})`);
          }
          if (phone && !/^[6-9]\d{9}$/.test(phone)) {
            rowErrors.push(`Row ${rowNum}: Phone must be 10 digits starting with 6-9`);
          }

          if (rowErrors.length > 0) {
            errs.push(...rowErrors);
          }

          return {
            first_name: fname,
            last_name: lname,
            email: email,
            phone: phone,
            designation: row.designation || 'Associate',
            employment_type: (row.employmenttype || row.employment_type || 'EMPLOYEE').toUpperCase().includes('INTERN') ? 'INTERN' : 'EMPLOYEE',
            joining_date: row.joiningdate || row.joining_date || new Date().toISOString().split('T')[0],
            skills: row.skills || '',
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

  // Execute Bulk Staff Import
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
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email,
          phone: row.phone || undefined,
          designation: row.designation,
          employment_type: row.employment_type,
          joining_date: row.joining_date,
          skills: row.skills,
          department_id: departments.length > 0 ? departments[0].id : undefined,
          status: 'ACTIVE',
        };
        const res = await createEmployee(payload);
        if (res.success) {
          successCount++;
        } else {
          failCount++;
          failDetails.push(`${row.email}: ${res.message || 'Failed'}`);
        }
      } catch (err) {
        failCount++;
        failDetails.push(`${row.email}: ${err.response?.data?.message || err.message}`);
      }
    }

    setIsImporting(false);
    setImportSummary({
      total: validRows.length,
      success: successCount,
      failed: failCount,
      failDetails,
    });
    loadData();
  };

  return (
    <AppLayout pageTitle="Employee & Staff Management" subtitle="Manage workforce records, assignments, and onboarding">
      {/* Top Controls Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ flex: 1, minWidth: '240px' }}>
            <input
              type="text"
              placeholder="🔍 Search by name, email, code, designation, skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.625rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            style={{
              padding: '0.625rem 0.875rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              fontSize: '0.875rem',
              backgroundColor: '#fff',
            }}
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.department_name}
              </option>
            ))}
          </select>

          {/* Branch Filter */}
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            style={{
              padding: '0.625rem 0.875rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              fontSize: '0.875rem',
              backgroundColor: '#fff',
            }}
          >
            <option value="">🏢 All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                🏢 {b.branch_name} ({b.city})
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            style={{
              padding: '0.625rem 0.875rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              fontSize: '0.875rem',
              backgroundColor: '#fff',
            }}
          >
            <option value="">All Types</option>
            <option value="EMPLOYEE">Employees Only</option>
            <option value="INTERN">Interns Only</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{
              padding: '0.625rem 0.875rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              fontSize: '0.875rem',
              backgroundColor: '#fff',
            }}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="RESIGNED">Resigned</option>
          </select>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportCsv}
              title="Export staff directory to CSV"
            >
              📥 Export Staff (CSV)
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
              title="Bulk import staff from CSV"
            >
              📤 Import Staff (CSV)
            </button>
            <button className="btn btn-primary" onClick={handleOpenAdd}>
              ➕ Add Employee / Intern
            </button>
          </div>
        </div>
      </div>

      {/* Employees Table Card */}
      <div className="card" style={{ padding: '0' }}>
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-muted)' }}>
            Showing <strong>{employees.length}</strong> staff members
          </div>
          {(search || selectedDept || selectedType || selectedStatus) && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                setSearch('');
                setSelectedDept('');
                setSelectedType('');
                setSelectedStatus('');
              }}
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}
            >
              Reset Filters
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading workforce directory...
          </div>
        ) : employees.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔍</div>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>No staff found</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Try adjusting your search criteria or add a new team member.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{
                  backgroundColor: 'var(--bg-subtle)',
                  borderBottom: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Code</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Employee</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Branch</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Designation & Dept</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Type</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Status</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Joining Date</th>
                  <th style={{ padding: '0.875rem 1.25rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {/* Code */}
                    <td style={{ padding: '1rem 1.25rem', fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'var(--primary)' }}>
                      {emp.employee_code}
                    </td>

                    {/* Name & Contact */}
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          backgroundColor: emp.employment_type === 'INTERN' ? '#e0f2fe' : 'var(--primary-light)',
                          color: emp.employment_type === 'INTERN' ? '#0369a1' : 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '700',
                          fontSize: '0.8125rem',
                          overflow: 'hidden',
                          border: '1px solid rgba(0,0,0,0.08)',
                          flexShrink: 0,
                        }}>
                          {emp.profile_photo ? (
                            <img src={emp.profile_photo} alt={emp.first_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            `${emp.first_name[0]}${emp.last_name[0]}`
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                            {emp.first_name} {emp.last_name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {emp.email} {emp.phone && `• ${emp.phone}`}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Branch */}
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '9999px',
                        background: '#eff6ff',
                        color: '#1e40af',
                        border: '1px solid #dbeafe',
                        whiteSpace: 'nowrap',
                      }}>
                        🏢 {emp.branch?.city || emp.branch?.branch_name || 'Headquarters'}
                      </span>
                    </td>

                    {/* Designation & Dept */}
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ fontWeight: '500' }}>{emp.designation}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {emp.department?.department_name || 'Unassigned'}
                      </div>
                    </td>

                    {/* Employment Type */}
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span className={`badge ${emp.employment_type === 'INTERN' ? 'badge-warning' : 'badge-info'}`}>
                        {emp.employment_type}
                      </span>
                      {emp.employment_type === 'INTERN' && emp.college && (
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          {emp.college}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <button
                        onClick={() => handleToggleStatus(emp.id)}
                        title="Click to toggle status"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          textAlign: 'left'
                        }}
                      >
                        <span className={`badge ${emp.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                          <span className={`pulse-dot ${emp.status === 'ACTIVE' ? 'online' : 'error'}`}></span>
                          {emp.status}
                        </span>
                      </button>
                    </td>

                    {/* Joining Date */}
                    <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                      {emp.joining_date}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleOpenView(emp)}
                          style={{ padding: '0.375rem 0.625rem', fontSize: '0.75rem' }}
                          title="View Profile"
                        >
                          👁️ View
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleOpenEdit(emp)}
                          style={{ padding: '0.375rem 0.625rem', fontSize: '0.75rem' }}
                          title="Edit Employee"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleOpenCredentials(emp)}
                          style={{
                            padding: '0.375rem 0.625rem',
                            fontSize: '0.75rem',
                            color: '#4f46e5',
                            borderColor: '#c7d2fe',
                            backgroundColor: '#eef2ff',
                            fontWeight: '700',
                          }}
                          title="View Login ID & Password (Admin Only)"
                        >
                          🔑 ID & Password
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleDelete(emp)}
                          style={{
                            padding: '0.375rem 0.625rem',
                            fontSize: '0.75rem',
                            color: '#ef4444',
                            borderColor: '#fca5a5',
                            backgroundColor: '#fef2f2',
                            fontWeight: '600',
                          }}
                          title="Delete Permanently"
                        >
                          🗑️ Delete
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

      {/* Modal: Add or Edit Employee */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div style={{
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
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '750px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.375rem' }}>
                  {isAddModalOpen ? 'Add New Employee or Intern' : `Edit ${selectedEmployee?.first_name} ${selectedEmployee?.last_name}`}
                </h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Fill in the workforce details below.
                </p>
              </div>
              <button
                onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            {formError && (
              <div style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--danger-bg)',
                color: 'var(--danger)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.25rem',
                fontSize: '0.875rem',
              }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitForm}>
              {/* Category selector */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '700', marginBottom: '0.375rem' }}>
                  Employment Type *
                </label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="employment_type"
                      value="EMPLOYEE"
                      checked={formData.employment_type === 'EMPLOYEE'}
                      onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                    />
                    <span style={{ fontWeight: '600' }}>Full-Time Employee</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="employment_type"
                      value="INTERN"
                      checked={formData.employment_type === 'INTERN'}
                      onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                    />
                    <span style={{ fontWeight: '600' }}>Intern</span>
                  </label>
                </div>
              </div>

              {/* SECTION 1: Basic & Contact Details */}
              <div style={{
                padding: '1rem',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem',
                border: '1px solid var(--border-color)',
              }}>
                <div style={{ fontWeight: '700', fontSize: '0.875rem', color: 'var(--primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>👤</span> 1. Basic & Contact Information
                </div>

                {/* Profile Photo Upload Field */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.25rem',
                  marginBottom: '1.25rem',
                  padding: '0.875rem',
                  backgroundColor: '#ffffff',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border-color)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                }}>
                  <div style={{
                    position: 'relative',
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '2px solid var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {formData.profile_photo ? (
                      <img src={formData.profile_photo} alt="Profile Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '2rem', opacity: 0.6 }}>👤</span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '700', marginBottom: '0.35rem', color: 'var(--text-main)' }}>
                      Profile Photo / Picture (Optional)
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <label style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.45rem 0.85rem',
                        backgroundColor: 'var(--primary-light)',
                        color: 'var(--primary)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8125rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        border: '1px solid rgba(15, 118, 110, 0.25)',
                      }}>
                        <span>📷</span> Choose Image File
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 3 * 1024 * 1024) {
                                alert('Image size exceeds 3MB limit. Please choose a smaller image.');
                                return;
                              }
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setFormData((prev) => ({ ...prev, profile_photo: reader.result }));
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {formData.profile_photo && (
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, profile_photo: '' }))}
                          style={{
                            padding: '0.45rem 0.75rem',
                            backgroundColor: 'var(--danger-bg)',
                            color: 'var(--danger)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.8125rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          🗑️ Remove Photo
                        </button>
                      )}
                    </div>
                    <p style={{ fontSize: '0.725rem', color: 'var(--text-muted)', margin: '0.35rem 0 0 0' }}>
                      JPG, PNG, or WEBP (Max 3MB). Appears on staff cards, directory, and workplace chat.
                    </p>
                  </div>
                </div>

                {/* Row 1: Name */}
                <div className="grid grid-cols-2" style={{ marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Varsha"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                      Last Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Srivastava"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    />
                  </div>
                </div>

                {/* Row 2: Email & Phone */}
                <div className="grid grid-cols-2" style={{ marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      disabled={isEditModalOpen}
                      placeholder="e.g. varsha.srivastava@vaidimi.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: isEditModalOpen ? 'var(--bg-subtle)' : '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                      Contact Number (Phone) *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="10-digit Mobile Number"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    />
                  </div>
                </div>

                {/* Row 3: Emergency Contact */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                    Emergency Contact Number
                  </label>
                  <input
                    type="tel"
                    placeholder="Emergency Phone / Contact"
                    value={formData.emergency_contact}
                    onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                  />
                </div>
              </div>

              {/* SECTION 2: Family & Personal Details */}
              <div style={{
                padding: '1rem',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem',
                border: '1px solid var(--border-color)',
              }}>
                <div style={{ fontWeight: '700', fontSize: '0.875rem', color: 'var(--primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>👨‍👩‍👧</span> 2. Family & Personal Details
                </div>

                {/* Father & Mother Name */}
                <div className="grid grid-cols-2" style={{ marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                      Father's Name
                    </label>
                    <input
                      type="text"
                      placeholder="Father's full name"
                      value={formData.father_name}
                      onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                      Mother's Name
                    </label>
                    <input
                      type="text"
                      placeholder="Mother's full name"
                      value={formData.mother_name}
                      onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    />
                  </div>
                </div>

                {/* DOB, Gender, Blood Group */}
                <div className="grid grid-cols-3" style={{ marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                      Date of Birth (DOB)
                    </label>
                    <input
                      type="date"
                      min="1900-01-01"
                      max="2199-12-31"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                      Gender
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                      <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                      Blood Group
                    </label>
                    <select
                      value={formData.blood_group}
                      onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    >
                      <option value="">Select Blood Group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                </div>

                {/* Religion & Relationship Status */}
                <div className="grid grid-cols-2">
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                      Religion
                    </label>
                    <select
                      value={formData.religion}
                      onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    >
                      <option value="">Select Religion</option>
                      <option value="Hindu">Hindu</option>
                      <option value="Muslim">Muslim</option>
                      <option value="Sikh">Sikh</option>
                      <option value="Christian">Christian</option>
                      <option value="Jain">Jain</option>
                      <option value="Buddhist">Buddhist</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                      Relationship Status (Marital)
                    </label>
                    <select
                      value={formData.marital_status}
                      onChange={(e) => setFormData({ ...formData, marital_status: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    >
                      <option value="SINGLE">Single</option>
                      <option value="MARRIED">Married</option>
                      <option value="DIVORCED">Divorced</option>
                      <option value="WIDOWED">Widowed</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Government ID & Address Verification */}
              <div style={{
                padding: '1rem',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem',
                border: '1px solid var(--border-color)',
              }}>
                <div style={{ fontWeight: '700', fontSize: '0.875rem', color: 'var(--primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🆔</span> 3. Government ID & Address Verification
                </div>

                {/* Aadhar Card Number */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                    Aadhar Card Number (12 digits)
                  </label>
                  <input
                    type="text"
                    maxLength="14"
                    placeholder="e.g. 1234 5678 9012"
                    value={formData.aadhar_number}
                    onChange={(e) => setFormData({ ...formData, aadhar_number: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff', letterSpacing: '0.05em' }}
                  />
                </div>

                {/* Current Address */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                    Current Address
                  </label>
                  <textarea
                    rows="2"
                    placeholder="House/Flat No, Street, Landmark, City, State, PIN"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff', fontFamily: 'inherit' }}
                  />
                </div>

                {/* Permanent Address as per Aadhar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                    <label style={{ fontSize: '0.8125rem', fontWeight: '600' }}>
                      Permanent Address (As per Aadhar Card)
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, permanent_address: prev.address }))}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', cursor: 'pointer' }}
                    >
                      📋 Same as Current Address
                    </button>
                  </div>
                  <textarea
                    rows="2"
                    placeholder="Permanent residential address as recorded on Aadhar Card"
                    value={formData.permanent_address}
                    onChange={(e) => setFormData({ ...formData, permanent_address: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff', fontFamily: 'inherit' }}
                  />
                </div>
              </div>

              {/* SECTION 4: Health, Medical & Wellness Profile */}
              <div style={{
                padding: '1rem',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem',
                border: '1px solid var(--border-color)',
              }}>
                <div style={{ fontWeight: '700', fontSize: '0.875rem', color: 'var(--primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🏥</span> 4. Health, Medical & Wellness Profile
                </div>

                {/* Medical Fitness Status & Insurance Provider */}
                <div className="grid grid-cols-2" style={{ marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                      Medical Fitness Status
                    </label>
                    <select
                      value={formData.health_status}
                      onChange={(e) => setFormData({ ...formData, health_status: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    >
                      <option value="FIT_FOR_DUTY">✅ Fit for Duty / Fully Active</option>
                      <option value="UNDER_TREATMENT">⚕️ Under Medical Treatment</option>
                      <option value="SPECIAL_ASSISTANCE">♿ Workplace Accommodation Required</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                      Health Insurance Provider / TPA
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Star Health / Care / HDFC ERGO"
                      value={formData.insurance_provider}
                      onChange={(e) => setFormData({ ...formData, insurance_provider: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    />
                  </div>
                </div>

                {/* Insurance Policy No & Known Allergies */}
                <div className="grid grid-cols-2" style={{ marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                      Mediclaim / Insurance Policy Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. POL-2026-987654"
                      value={formData.insurance_policy_number}
                      onChange={(e) => setFormData({ ...formData, insurance_policy_number: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff', letterSpacing: '0.04em' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                      Known Allergies (Food, Drug, Dust)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. None / Penicillin / Peanuts / Dust"
                      value={formData.allergies}
                      onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    />
                  </div>
                </div>

                {/* Medical Conditions / History */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                    Existing Medical Conditions / Health History
                  </label>
                  <textarea
                    rows="2"
                    placeholder="e.g. None, or specify any chronic illness, asthma, hypertension, diabetes..."
                    value={formData.medical_conditions}
                    onChange={(e) => setFormData({ ...formData, medical_conditions: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff', fontFamily: 'inherit' }}
                  />
                </div>

                {/* Emergency Doctor / Clinic Contact */}
                <div className="grid grid-cols-2">
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                      Family Doctor / Physician Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. R. K. Sharma"
                      value={formData.emergency_doctor_name}
                      onChange={(e) => setFormData({ ...formData, emergency_doctor_name: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                      Doctor / Hospital Contact Number
                    </label>
                    <input
                      type="tel"
                      maxLength="14"
                      placeholder="e.g. +91 9876543210"
                      value={formData.emergency_doctor_phone}
                      onChange={(e) => setFormData({ ...formData, emergency_doctor_phone: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 5: Educational & Academic Qualifications */}
              <div style={{
                padding: '1rem',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem',
                border: '1px solid var(--border-color)',
              }}>
                <div style={{ fontWeight: '700', fontSize: '0.875rem', color: 'var(--primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🎓</span> 5. Educational & Academic Qualifications
                </div>

                {/* Qualification Level & Stream/Field */}
                <div className="grid grid-cols-2" style={{ marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                      Highest Qualification Level *
                    </label>
                    <select
                      value={formData.highest_qualification}
                      onChange={(e) => setFormData({ ...formData, highest_qualification: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    >
                      {QUALIFICATION_LEVELS.map((q) => (
                        <option key={q.value} value={q.value}>{q.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                      Academic Stream / Field of Study
                    </label>
                    <select
                      value={formData.education_field}
                      onChange={(e) => setFormData({ ...formData, education_field: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    >
                      {EDUCATION_FIELDS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Degree/Class Title & School/College/University */}
                <div className="grid grid-cols-2" style={{ marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                      Degree / Class / Specialization Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. B.Tech (Computer Science) / MBA (HR) / Class 12 (PCM)"
                      value={formData.course}
                      onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                      School / College / University Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. IIT Delhi / Delhi University / CBSE Board"
                      value={formData.college}
                      onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    />
                  </div>
                </div>

                {/* Passing Year & Percentage/CGPA */}
                <div className="grid grid-cols-2" style={{ marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                      Passing / Completion Year
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 2024 / 2022"
                      value={formData.passing_year}
                      onChange={(e) => setFormData({ ...formData, passing_year: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                      Percentage / CGPA / Grade
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 84.5% / 8.8 CGPA / First Class"
                      value={formData.percentage_cgpa}
                      onChange={(e) => setFormData({ ...formData, percentage_cgpa: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    />
                  </div>
                </div>

                {/* Academic History & Marks Breakdown Notes */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                    Academic Record Summary (Class 10, Class 12, Graduation Breakdown)
                  </label>
                  <textarea
                    rows="2"
                    placeholder="e.g. 10th: 88% (CBSE) | 12th: 85% (PCM) | Graduation: B.Tech 8.5 CGPA | PG/PhD: ..."
                    value={formData.education_details}
                    onChange={(e) => setFormData({ ...formData, education_details: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff', fontFamily: 'inherit' }}
                  />
                </div>
              </div>

              {/* SECTION 6: Post, Department & Salary */}
              <div style={{
                padding: '1rem',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem',
                border: '1px solid var(--border-color)',
              }}>
                <div style={{ fontWeight: '700', fontSize: '0.875rem', color: 'var(--primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>💼</span> 6. Post, Department & Compensation
                </div>

                {/* Post/Designation & Department */}
                <div className="grid grid-cols-2" style={{ marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                      Post / Designation *
                    </label>
                    <select
                      value={CORPORATE_DESIGNATIONS.includes(formData.designation) ? formData.designation : (formData.designation ? 'OTHER' : '')}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'OTHER') {
                          if (CORPORATE_DESIGNATIONS.includes(formData.designation)) {
                            setFormData({ ...formData, designation: '' });
                          }
                        } else {
                          setFormData({ ...formData, designation: val });
                        }
                      }}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                      required={!formData.designation}
                    >
                      <option value="">-- Select Corporate Designation --</option>
                      {CORPORATE_DESIGNATIONS.map((desig) => (
                        <option key={desig} value={desig}>{desig}</option>
                      ))}
                      <option value="OTHER">✏️ Enter Custom Designation...</option>
                    </select>

                    {(!CORPORATE_DESIGNATIONS.includes(formData.designation) || !formData.designation) && (
                      <input
                        type="text"
                        required
                        placeholder="Type custom designation (e.g. Director, Software Developer)..."
                        value={formData.designation}
                        onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                        style={{ width: '100%', marginTop: '0.375rem', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                      />
                    )}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                      Department
                    </label>
                    <select
                      value={formData.department_id}
                      onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    >
                      <option value="">Select Department</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.department_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Branch & Base Salary */}
                <div className="grid grid-cols-2" style={{ marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                      🏢 Assigned Branch *
                    </label>
                    <select
                      value={formData.branch_id}
                      onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    >
                      <option value="">-- Select Branch Location --</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          🏢 {b.branch_name} ({b.city})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                      Monthly Base Salary (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      placeholder="30000"
                      value={formData.base_salary}
                      onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    />
                  </div>
                </div>

                {/* Joining Date & Status */}
                <div className="grid grid-cols-2">
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                      Joining Date
                    </label>
                    <input
                      type="date"
                      min="1900-01-01"
                      max="2199-12-31"
                      value={formData.joining_date}
                      onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="ON_LEAVE">On Leave</option>
                      <option value="RESIGNED">Resigned</option>
                      <option value="COMPLETED_INTERNSHIP">Completed Internship</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Conditional Intern Specific Fields */}
              {formData.employment_type === 'INTERN' && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#f0f9ff',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1rem',
                  border: '1px solid #bae6fd'
                }}>
                  <div style={{ fontWeight: '700', fontSize: '0.875rem', color: '#0369a1', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>🎓</span> 5. Intern Academic & Duration Details
                  </div>
                  <div className="grid grid-cols-2" style={{ marginBottom: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                        College / University
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Delhi University / IIT"
                        value={formData.college}
                        onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid #cbd5e1', backgroundColor: '#fff' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                        Course / Degree
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. B.Tech Computer Science"
                        value={formData.course}
                        onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid #cbd5e1', backgroundColor: '#fff' }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2">
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                        Internship Start Date
                      </label>
                      <input
                        type="date"
                        min="1900-01-01"
                        max="2199-12-31"
                        value={formData.internship_start_date}
                        onChange={(e) => setFormData({ ...formData, internship_start_date: e.target.value })}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid #cbd5e1', backgroundColor: '#fff' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                        Internship End Date
                      </label>
                      <input
                        type="date"
                        min="1900-01-01"
                        max="2199-12-31"
                        value={formData.internship_end_date}
                        onChange={(e) => setFormData({ ...formData, internship_end_date: e.target.value })}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid #cbd5e1', backgroundColor: '#fff' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Skills */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                  Professional Skills (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. React, Node.js, Express, MySQL"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                />
              </div>

              {/* Initial Password on Add */}
              {isAddModalOpen && (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#fdf4ff', borderRadius: 'var(--radius-md)', border: '1px solid #f5d0fe' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                    <label style={{ fontSize: '0.8125rem', fontWeight: '700', color: '#86198f' }}>
                      🔑 Portal Login Password <span className="required">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem', color: '#a21caf', borderColor: '#d946ef', backgroundColor: '#fff' }}
                    >
                      ⚡ Auto-Generate Strong Password
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontFamily: 'var(--font-mono)', backgroundColor: '#fff' }}
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    The employee will use this password and their email / employee code to log into the portal.
                  </div>
                </div>
              )}

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : isAddModalOpen ? 'Create Staff Record' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Employee Profile (Comprehensive) */}
      {isViewModalOpen && selectedEmployee && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1.5rem',
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: selectedEmployee.employment_type === 'INTERN' ? '#e0f2fe' : 'var(--primary-light)',
                  color: selectedEmployee.employment_type === 'INTERN' ? '#0369a1' : 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                  fontSize: '1.25rem',
                  overflow: 'hidden',
                  border: '2px solid var(--primary)',
                  flexShrink: 0,
                }}>
                  {selectedEmployee.profile_photo ? (
                    <img src={selectedEmployee.profile_photo} alt={selectedEmployee.first_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    `${selectedEmployee.first_name[0]}${selectedEmployee.last_name[0]}`
                  )}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.375rem', marginBottom: '0.2rem' }}>
                    {selectedEmployee.first_name} {selectedEmployee.last_name}
                  </h2>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'var(--primary)' }}>
                      {selectedEmployee.employee_code}
                    </span>
                    <span className={`badge ${selectedEmployee.employment_type === 'INTERN' ? 'badge-warning' : 'badge-info'}`}>
                      {selectedEmployee.employment_type}
                    </span>
                    <span className={`badge ${selectedEmployee.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                      {selectedEmployee.status}
                    </span>
                    {selectedEmployee.department?.department_name && (
                      <span className="badge badge-secondary">
                        {selectedEmployee.department.department_name}
                      </span>
                    )}
                    <span className="badge" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                      🏢 {selectedEmployee.branch?.branch_name || 'Headquarters'} ({selectedEmployee.branch?.city || 'Delhi NCR'})
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsViewModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            {/* Profile Group 1: Personal & Family Information */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>👨‍👩‍👧</span> Family & Personal Details
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Father's Name</div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{selectedEmployee.father_name || 'Not provided'}</div>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Mother's Name</div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{selectedEmployee.mother_name || 'Not provided'}</div>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Blood Group</div>
                  <div style={{ fontWeight: '700', fontSize: '0.875rem', color: '#e11d48' }}>{selectedEmployee.blood_group || 'Not recorded'}</div>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Date of Birth (DOB)</div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{selectedEmployee.date_of_birth || 'Not recorded'}</div>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Gender</div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{selectedEmployee.gender || 'Not specified'}</div>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Religion</div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{selectedEmployee.religion || 'Not recorded'}</div>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Relationship Status</div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{selectedEmployee.marital_status || 'SINGLE'}</div>
                </div>
              </div>
            </div>

            {/* Profile Group 2: Contact, Aadhar & Address */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>🆔</span> Contact & Address Verification
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Contact Number (Phone)</div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{selectedEmployee.phone || 'Not provided'}</div>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Emergency Number</div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{selectedEmployee.emergency_contact || 'Not provided'}</div>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Official Email</div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{selectedEmployee.email}</div>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Aadhar Card Number</div>
                  <div style={{ fontWeight: '700', fontSize: '0.875rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
                    {selectedEmployee.aadhar_number || 'Not verified'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Current Residential Address</div>
                  <div style={{ fontWeight: '500', fontSize: '0.8125rem' }}>{selectedEmployee.address || 'Not provided'}</div>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Permanent Address (As per Aadhar)</div>
                  <div style={{ fontWeight: '500', fontSize: '0.8125rem' }}>{selectedEmployee.permanent_address || 'Same as current address / Not provided'}</div>
                </div>
              </div>
            </div>

            {/* Profile Group 3: Health, Medical & Wellness */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>🏥</span> Health & Medical Records
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Medical Fitness Status</div>
                  <div style={{ fontWeight: '700', fontSize: '0.875rem', color: selectedEmployee.health_status === 'UNDER_TREATMENT' ? '#d97706' : '#059669' }}>
                    {selectedEmployee.health_status === 'UNDER_TREATMENT' ? '⚕️ Under Treatment' : selectedEmployee.health_status === 'SPECIAL_ASSISTANCE' ? '♿ Needs Accommodation' : '✅ Fit for Duty'}
                  </div>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Insurance Policy No.</div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{selectedEmployee.insurance_policy_number || 'Not registered'}</div>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Insurance Provider / TPA</div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{selectedEmployee.insurance_provider || 'Not registered'}</div>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Known Allergies</div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem', color: selectedEmployee.allergies ? '#dc2626' : 'var(--text-main)' }}>
                    {selectedEmployee.allergies || 'None reported'}
                  </div>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', gridColumn: 'span 2' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Existing Conditions / Health History</div>
                  <div style={{ fontWeight: '500', fontSize: '0.8125rem' }}>{selectedEmployee.medical_conditions || 'None reported'}</div>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Family Physician / Doctor</div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{selectedEmployee.emergency_doctor_name || 'Not provided'}</div>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', gridColumn: 'span 2' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Doctor / Clinic Phone</div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{selectedEmployee.emergency_doctor_phone || 'Not provided'}</div>
                </div>
              </div>
            </div>

            {/* Profile Group 4: Post, Department & Compensation */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>💼</span> Post, Department & Compensation
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Post / Designation</div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{selectedEmployee.designation}</div>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Department</div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{selectedEmployee.department?.department_name || 'None'}</div>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Monthly Base Salary</div>
                  <div style={{ fontWeight: '700', fontSize: '0.875rem', color: '#059669' }}>₹{Number(selectedEmployee.base_salary || 30000).toLocaleString('en-IN')}/mo</div>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Joining Date</div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{selectedEmployee.joining_date}</div>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', gridColumn: 'span 2' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Skills</div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{selectedEmployee.skills || 'None listed'}</div>
                </div>
              </div>
            </div>

            {/* Profile Group 5: Educational & Academic Qualifications */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>🎓</span> Educational & Academic Qualifications
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Highest Qualification</div>
                  <div style={{ fontWeight: '700', fontSize: '0.875rem', color: 'var(--primary)' }}>
                    {selectedEmployee.highest_qualification || 'Graduation'}
                  </div>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Stream / Field</div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                    {selectedEmployee.education_field || 'Not specified'}
                  </div>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Passing Year & Score</div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                    {selectedEmployee.passing_year || 'N/A'}{selectedEmployee.percentage_cgpa ? ` • ${selectedEmployee.percentage_cgpa}` : ''}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Degree / Specialization</div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                    {selectedEmployee.course || 'Not recorded'}
                  </div>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>College / University / Board</div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                    {selectedEmployee.college || 'Not recorded'}
                  </div>
                </div>
              </div>

              {selectedEmployee.education_details && (
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Academic Record Breakdown (10th / 12th / Degree)</div>
                  <div style={{ fontWeight: '500', fontSize: '0.8125rem', whiteSpace: 'pre-wrap' }}>
                    {selectedEmployee.education_details}
                  </div>
                </div>
              )}
            </div>

            {selectedEmployee.employment_type === 'INTERN' && (
              <div style={{
                padding: '1rem',
                backgroundColor: '#f0f9ff',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.5rem',
                border: '1px solid #bae6fd'
              }}>
                <div style={{ fontWeight: '700', fontSize: '0.875rem', color: '#0369a1', marginBottom: '0.5rem' }}>
                  🎓 Internship Academic Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', fontSize: '0.8125rem' }}>
                  <div><strong>College:</strong> {selectedEmployee.college || 'N/A'}</div>
                  <div><strong>Course:</strong> {selectedEmployee.course || 'N/A'}</div>
                  <div><strong>Start Date:</strong> {selectedEmployee.internship_start_date || 'N/A'}</div>
                  <div><strong>End Date:</strong> {selectedEmployee.internship_end_date || 'N/A'}</div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleOpenEdit(selectedEmployee);
                }}
              >
                ✏️ Edit This Profile
              </button>
              <button className="btn btn-secondary" onClick={() => setIsViewModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Onboarding Success & Credential Generation */}
      {isCredentialModalOpen && createdCredentials && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '560px', padding: '2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'var(--success-bg)',
                color: 'var(--success)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                marginBottom: '1rem',
                border: '2px solid rgba(5, 150, 105, 0.3)',
              }}>
                🎉
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                Employee Onboarded Successfully!
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Login account and credentials have been created in the Vaidimi Consulting Portal.
              </p>
            </div>

            {/* Credential Details Card */}
            <div className="credentials-box" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #99f6e4', paddingBottom: '0.75rem' }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '1rem', color: '#0f766e' }}>
                    {createdCredentials.fullName}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    {createdCredentials.designation} &bull; <strong style={{ color: 'var(--primary)' }}>{createdCredentials.employeeCode}</strong>
                  </div>
                </div>
                <span className="badge badge-success">
                  {createdCredentials.role || 'EMPLOYEE'}
                </span>
              </div>

              {/* Login Portal URL */}
              <div className="credential-item">
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                  🌐 Portal URL
                </span>
                <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                  {window.location.origin}/login
                </span>
              </div>

              {/* Login Email / ID */}
              <div className="credential-item">
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                  📧 Login ID (Email)
                </span>
                <span style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                  {createdCredentials.email}
                </span>
              </div>

              {/* Generated Password */}
              <div className="credential-item">
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                  🔑 Password
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    fontSize: '0.875rem',
                    fontWeight: '700',
                    color: '#0f766e',
                    fontFamily: 'var(--font-mono)',
                    backgroundColor: '#ffffff',
                    padding: '0.2rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid #99f6e4'
                  }}>
                    {showPassword ? createdCredentials.temporaryPassword : '••••••••••••'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
            </div>

            {copied && (
              <div style={{
                padding: '0.625rem 1rem',
                backgroundColor: 'var(--success-bg)',
                color: 'var(--success)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
                fontWeight: '600',
                marginBottom: '1.25rem',
                textAlign: 'center',
                border: '1px solid rgba(5, 150, 105, 0.3)',
              }}>
                ✅ Login credentials copied to clipboard! You can send them directly to the employee.
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCopyCredentials}
                style={{ flex: 1 }}
              >
                📋 Copy All Login Credentials
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setIsCredentialModalOpen(false);
                  setCreatedCredentials(null);
                }}
              >
                Done
              </button>
            </div>
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
              maxWidth: '750px',
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
                  📤 Bulk Onboard Staff via CSV
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Upload a CSV file with staff details. Credentials will be automatically provisioned.
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

            {/* Template Download Prompt */}
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
                  Download the sample onboarding template with valid columns.
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={downloadSampleEmployeeCsv}
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
                <div style={{ overflowX: 'auto', maxHeight: '220px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                    <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
                      <tr>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Status</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Name</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Email</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Phone</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Role</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Designation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.map((r, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: r.isValid ? 'transparent' : 'rgba(239, 68, 68, 0.05)' }}>
                          <td style={{ padding: '0.5rem' }}>
                            {r.isValid ? <span style={{ color: 'var(--success)' }}>✓ Ready</span> : <span style={{ color: 'var(--danger)' }}>✗ Invalid</span>}
                          </td>
                          <td style={{ padding: '0.5rem' }}>{r.first_name} {r.last_name}</td>
                          <td style={{ padding: '0.5rem' }}>{r.email}</td>
                          <td style={{ padding: '0.5rem' }}>{r.phone || '—'}</td>
                          <td style={{ padding: '0.5rem' }}>{r.employment_type}</td>
                          <td style={{ padding: '0.5rem' }}>{r.designation}</td>
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
                  {importSummary.failed === 0 ? '🎉 Bulk Import Completed Successfully!' : '⚠️ Bulk Import Finished with Some Errors'}
                </div>
                <div style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>
                  Successfully created: <strong>{importSummary.success}</strong> | Failed: <strong>{importSummary.failed}</strong>
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
                {isImporting ? 'Importing Staff...' : `Import ${importRows.filter(r => r.isValid).length} Valid Records`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee ID & Password (Credentials) Modal */}
      {isCredentialModalOpen && createdCredentials && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '520px',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
              borderRadius: '16px',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    backgroundColor: '#eef2ff',
                    color: '#4f46e5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                  }}
                >
                  🔐
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                    Staff Login Credentials
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                    Admin Panel Secret Access & Saved Passwords
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCredentialModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                ✕
              </button>
            </div>

            {/* Employee Info Header Pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(79, 70, 229, 0.06)',
                border: '1px solid rgba(79, 70, 229, 0.15)',
                borderRadius: '10px',
                marginBottom: '1.25rem',
              }}
            >
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.9375rem', color: '#1e1b4b' }}>
                  {createdCredentials.fullName}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {createdCredentials.designation || 'Staff Member'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.375rem' }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: '700',
                    backgroundColor: '#ffffff',
                    color: '#4f46e5',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #c7d2fe',
                  }}
                >
                  {createdCredentials.employeeCode}
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    backgroundColor: '#e0e7ff',
                    color: '#3730a3',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '6px',
                  }}
                >
                  {createdCredentials.role}
                </span>
              </div>
            </div>

            {/* Credentials Box */}
            <div
              style={{
                backgroundColor: 'var(--bg-subtle, #f8fafc)',
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: '12px',
                padding: '1.125rem',
                marginBottom: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              {/* Row 1: Login Portal */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: '500' }}>🌐 Portal URL:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--text-main)' }}>
                  {window.location.origin}/login
                </span>
              </div>

              {/* Row 2: Login Email / ID */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: '500' }}>📧 Login Email / ID:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <code
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: '700',
                      backgroundColor: '#f1f5f9',
                      padding: '0.2rem 0.4rem',
                      borderRadius: '4px',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                    }}
                  >
                    {createdCredentials.email}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopySingleField(createdCredentials.email, 'email')}
                    className="btn btn-secondary"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                    title="Copy Email ID"
                  >
                    {copiedField === 'email' ? '✓ Copied' : '📋 Copy'}
                  </button>
                </div>
              </div>

              {/* Row 3: Saved Password */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: '500' }}>🔑 Saved Password:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <code
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: '800',
                      backgroundColor: '#ede9fe',
                      color: '#6d28d9',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.925rem',
                      letterSpacing: showPassword ? 'normal' : '2px',
                    }}
                  >
                    {showPassword ? createdCredentials.temporaryPassword : '••••••••••••'}
                  </code>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#4f46e5',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      textDecoration: 'underline',
                    }}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopySingleField(createdCredentials.temporaryPassword, 'password')}
                    className="btn btn-secondary"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                    title="Copy Password"
                  >
                    {copiedField === 'password' ? '✓ Copied' : '📋 Copy'}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Reset / Change Password Form */}
            <div
              style={{
                border: '1px solid #e0e7ff',
                backgroundColor: '#f8faff',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ fontWeight: '700', fontSize: '0.875rem', color: '#3730a3', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>🔄</span> Reset or Update Employee Password
              </div>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.75rem 0' }}>
                Enter a new password below to instantly update their account and save it to the admin panel.
              </p>

              {resetSuccessMsg && (
                <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#ecfdf5', color: '#065f46', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  ✓ {resetSuccessMsg}
                </div>
              )}
              {resetErrorMsg && (
                <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  ⚠️ {resetErrorMsg}
                </div>
              )}

              <form onSubmit={handleResetPasswordSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="New password (min 6 characters)"
                  value={resetPasswordInput}
                  onChange={(e) => setResetPasswordInput(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.8125rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontFamily: 'var(--font-mono)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz!@#$';
                    const rand = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
                    setResetPasswordInput(`Vaidimi@${rand}`);
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem 0.625rem', fontSize: '0.75rem' }}
                  title="Generate Random Secure Password"
                >
                  🎲 Auto
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={resetLoading || !resetPasswordInput.trim()}
                  style={{ padding: '0.5rem 0.875rem', fontSize: '0.75rem', fontWeight: '600', backgroundColor: '#4f46e5' }}
                >
                  {resetLoading ? 'Saving...' : 'Set Password'}
                </button>
              </form>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCopyCredentials}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#10b981',
                  borderColor: '#10b981',
                  fontWeight: '600',
                  padding: '0.625rem',
                }}
              >
                {copied ? '✅ Full Credentials Copied to Clipboard!' : '📋 Copy Full Credentials (WhatsApp / Email Ready)'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsCredentialModalOpen(false)}
                style={{ width: '100%', padding: '0.5rem' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default EmployeesPage;
