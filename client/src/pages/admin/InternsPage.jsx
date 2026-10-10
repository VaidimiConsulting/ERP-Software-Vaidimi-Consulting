import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { getEmployees, createEmployee, updateEmployee, toggleEmployeeStatus, deleteEmployee, resetEmployeePassword } from '../../services/employeeService';
import { getDepartments } from '../../services/departmentService';
import { getBranches } from '../../services/branchService';

export const INTERN_DESIGNATIONS = [
  'SDE Intern',
  'Software Developer Intern',
  'Junior Software Developer',
  'Full Stack Developer Intern',
  'Tester',
  'DevOps Engineer',
  'HR',
  'Accountant',
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

function InternsPage() {
  const [interns, setInterns] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedIntern, setSelectedIntern] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const initialInternForm = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    emergency_contact: '',
    father_name: '',
    mother_name: '',
    gender: 'MALE',
    date_of_birth: '',
    blood_group: '',
    religion: '',
    marital_status: 'SINGLE',
    aadhar_number: '',
    address: '',
    permanent_address: '',
    designation: 'Software Engineering Intern',
    department_id: '',
    branch_id: '',
    college: '',
    course: '',
    internship_start_date: new Date().toISOString().split('T')[0],
    internship_end_date: '',
    password: 'Intern@2026',
    employment_type: 'INTERN',
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

  const [formData, setFormData] = useState(initialInternForm);

  // Edit Intern Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingIntern, setEditingIntern] = useState(null);

  // Credential Modal state
  const [isCredentialModalOpen, setIsCredentialModalOpen] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');
  const [resetErrorMsg, setResetErrorMsg] = useState('');
  const [copiedField, setCopiedField] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const params = { employment_type: 'INTERN' };
      if (search.trim()) params.search = search.trim();
      if (selectedBranch) params.branch_id = selectedBranch;

      const [intRes, deptRes, branchRes] = await Promise.all([
        getEmployees(params),
        getDepartments(),
        getBranches(),
      ]);
      if (intRes.success) setInterns(intRes.data);
      if (deptRes.success) setDepartments(deptRes.data);
      if (branchRes.success) setBranches(branchRes.data || []);
    } catch (err) {
      console.error('Failed to load interns data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, selectedBranch]);

  const handleToggle = async (id) => {
    try {
      const res = await toggleEmployeeStatus(id);
      if (res.success) {
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update intern status.');
    }
  };

  const handleDeleteIntern = async (intern) => {
    const confirmMsg = `Are you sure you want to permanently delete Intern "${intern.first_name} ${intern.last_name}" (${intern.employee_code})?\n\nThis will remove their profile, student login credentials, attendance records, and leave requests. This action cannot be undone.`;
    if (window.confirm(confirmMsg)) {
      try {
        const res = await deleteEmployee(intern.id);
        if (res.success) {
          alert(res.message || 'Intern deleted successfully.');
          loadData();
        }
      } catch (err) {
        alert(err.response?.data?.message || err.message || 'Failed to delete intern.');
      }
    }
  };

  const handleOpenAddModal = () => {
    setEditingIntern(null);
    setFormError('');
    setFormData({
      ...initialInternForm,
      department_id: departments.length > 0 ? String(departments[0].id) : '',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (intern) => {
    setEditingIntern(intern);
    setFormError('');
    setFormData({
      first_name: intern.first_name || '',
      last_name: intern.last_name || '',
      email: intern.email || '',
      phone: intern.phone || '',
      emergency_contact: intern.emergency_contact || '',
      father_name: intern.father_name || '',
      mother_name: intern.mother_name || '',
      gender: intern.gender || 'MALE',
      date_of_birth: intern.date_of_birth || '',
      blood_group: intern.blood_group || '',
      religion: intern.religion || '',
      marital_status: intern.marital_status || 'SINGLE',
      aadhar_number: intern.aadhar_number || '',
      address: intern.address || '',
      permanent_address: intern.permanent_address || '',
      designation: intern.designation || 'Software Engineering Intern',
      department_id: intern.department_id || '',
      branch_id: intern.branch_id || '',
      college: intern.college || '',
      course: intern.course || '',
      internship_start_date: intern.internship_start_date || '',
      internship_end_date: intern.internship_end_date || '',
      password: '',
      employment_type: 'INTERN',
      medical_conditions: intern.medical_conditions || '',
      allergies: intern.allergies || '',
      insurance_policy_number: intern.insurance_policy_number || '',
      insurance_provider: intern.insurance_provider || '',
      emergency_doctor_name: intern.emergency_doctor_name || '',
      emergency_doctor_phone: intern.emergency_doctor_phone || '',
      health_status: intern.health_status || 'FIT_FOR_DUTY',
      highest_qualification: intern.highest_qualification || 'Graduation',
      education_field: intern.education_field || 'Engineering & Technology',
      passing_year: intern.passing_year || '',
      percentage_cgpa: intern.percentage_cgpa || '',
      education_details: intern.education_details || '',
      profile_photo: intern.profile_photo || '',
    });
    setIsEditModalOpen(true);
  };

  const handleGeneratePassword = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz!@#$%';
    const rand = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setFormData((prev) => ({ ...prev, password: `Intern@2026${rand}` }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // Strict Validations
    const nameRegex = /^[A-Za-z\s]{2,50}$/;
    if (!nameRegex.test(formData.first_name.trim())) {
      setFormError('First name must contain only letters (at least 2 characters).');
      return;
    }
    if (!nameRegex.test(formData.last_name.trim())) {
      setFormError('Last name must contain only letters (at least 2 characters).');
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(formData.email.trim().toLowerCase())) {
      setFormError('Please enter a valid email address (e.g. intern@vaidimi.com).');
      return;
    }

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

    if (formData.emergency_contact && !validatePhone(formData.emergency_contact)) {
      setFormError('Emergency contact must be a valid mobile number.');
      return;
    }

    const sanitizePayload = (data) => {
      const sanitized = { ...data, employment_type: 'INTERN' };
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
      sanitized.internship_start_date = sanitized.internship_start_date || null;
      sanitized.internship_end_date = sanitized.internship_end_date || null;
      sanitized.department_id = sanitized.department_id ? Number(sanitized.department_id) : null;
      sanitized.branch_id = sanitized.branch_id ? Number(sanitized.branch_id) : null;
      return sanitized;
    };

    const cleanPayload = sanitizePayload(formData);

    setSubmitting(true);
    try {
      if (isEditModalOpen && editingIntern) {
        const res = await updateEmployee(editingIntern.id, cleanPayload);
        if (res.success) {
          setIsEditModalOpen(false);
          setEditingIntern(null);
          loadData();
        }
      } else {
        const res = await createEmployee(cleanPayload);
        if (res.success) {
          setIsAddModalOpen(false);
          setCreatedCredentials(res.generatedCredentials || {
            email: formData.email.trim().toLowerCase(),
            temporaryPassword: formData.password || 'Intern@2026',
            employeeCode: res.data?.employee_code || 'INT',
            fullName: `${formData.first_name.trim()} ${formData.last_name.trim()}`,
            designation: formData.designation.trim(),
            role: 'EMPLOYEE',
          });
          setCopied(false);
          setShowPassword(false);
          setIsCredentialModalOpen(true);
          loadData();
        }
      }
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to save intern.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    if (!createdCredentials) return;
    const text = `Vaidimi Consulting - Intern Portal Login Credentials\n--------------------------------------------\nStudent Name:  ${createdCredentials.fullName}\nIntern ID:     ${createdCredentials.employeeCode}\nLogin Email:   ${createdCredentials.email}\nPassword:      ${createdCredentials.temporaryPassword}\nLogin Portal:  ${window.location.origin}/login\n--------------------------------------------\nPlease change your password after initial login.`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleOpenCredentials = (intern) => {
    setCreatedCredentials({
      id: intern.id,
      fullName: `${intern.first_name} ${intern.last_name}`,
      employeeCode: intern.employee_code,
      email: intern.email,
      temporaryPassword: intern.user?.saved_password || 'Password not recorded',
      designation: intern.designation,
      role: 'EMPLOYEE',
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


  return (
    <AppLayout pageTitle="Intern Management" subtitle="Track internship cohorts, university programs, mentorships, and student access">
      {/* Top Banner & Actions */}
      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '260px' }}>
          <input
            type="text"
            placeholder="🔍 Search interns by student name, college, course, skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              maxWidth: '350px',
              padding: '0.625rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              fontSize: '0.875rem',
            }}
          />
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
        </div>
        <button className="btn btn-primary" onClick={handleOpenAddModal} style={{ backgroundColor: '#0284c7', borderColor: '#0284c7' }}>
          ➕ Add New Intern / Student
        </button>
      </div>

      {/* Interns Table Card */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading interns...
          </div>
        ) : interns.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎓</div>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>No interns registered</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Click "Add New Intern / Student" above to onboard an intern and generate their portal credentials.
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
                  <th style={{ padding: '0.875rem 1.25rem' }}>Intern Code</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Student Name</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Branch</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>College & Course</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Internship Duration</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Department</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Status</th>
                  <th style={{ padding: '0.875rem 1.25rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {interns.map((intern) => (
                  <tr key={intern.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem 1.25rem', fontFamily: 'var(--font-mono)', fontWeight: '700', color: '#0284c7' }}>
                      {intern.employee_code}
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          backgroundColor: '#e0f2fe',
                          color: '#0369a1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '700',
                          fontSize: '0.8125rem',
                          overflow: 'hidden',
                          border: '1px solid rgba(0,0,0,0.08)',
                          flexShrink: 0,
                        }}>
                          {intern.profile_photo ? (
                            <img src={intern.profile_photo} alt={intern.first_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            `${intern.first_name[0]}${intern.last_name[0]}`
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600' }}>{intern.first_name} {intern.last_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{intern.email}</div>
                        </div>
                      </div>
                    </td>
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
                        🏢 {intern.branch?.city || intern.branch?.branch_name || 'Headquarters'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ fontWeight: '500' }}>{intern.college || 'Not specified'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{intern.course || 'Degree in progress'}</div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.8125rem' }}>
                      <div>{intern.internship_start_date || 'Start: N/A'}</div>
                      <div style={{ color: 'var(--text-muted)' }}>to {intern.internship_end_date || 'Ongoing'}</div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span style={{
                        padding: '0.2rem 0.5rem',
                        backgroundColor: 'var(--bg-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem'
                      }}>
                        {intern.department?.department_name || 'Engineering'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <button
                        onClick={() => handleToggle(intern.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        title="Click to toggle active/inactive"
                      >
                        <span className={`badge ${intern.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                          {intern.status}
                        </span>
                      </button>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-secondary"
                          onClick={() => {
                            setSelectedIntern(intern);
                            setIsViewModalOpen(true);
                          }}
                          style={{
                            padding: '0.375rem 0.625rem',
                            fontSize: '0.75rem',
                            color: '#0284c7',
                            borderColor: '#bae6fd',
                            backgroundColor: '#f0f9ff',
                            fontWeight: '600'
                          }}
                          title="View Full Profile"
                        >
                          👁️ View
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleOpenEditModal(intern)}
                          style={{
                            padding: '0.375rem 0.625rem',
                            fontSize: '0.75rem',
                            color: '#059669',
                            borderColor: '#a7f3d0',
                            backgroundColor: '#ecfdf5',
                            fontWeight: '600'
                          }}
                          title="Edit Intern Profile"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleOpenCredentials(intern)}
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
                          onClick={() => handleDeleteIntern(intern)}
                          style={{
                            padding: '0.375rem 0.625rem',
                            fontSize: '0.75rem',
                            color: '#ef4444',
                            borderColor: '#fca5a5',
                            backgroundColor: '#fef2f2',
                            fontWeight: '600',
                          }}
                          title="Delete Intern Permanently"
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

      {/* Add / Edit Intern Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
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
          <div className="card" style={{ width: '100%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, color: '#0284c7' }}>
                  {isEditModalOpen ? `✏️ Edit Intern Profile: ${editingIntern?.first_name} ${editingIntern?.last_name}` : '🎓 Onboard New Intern'}
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                  {isEditModalOpen ? 'Update personal details, academic cohort, health information, and designation.' : 'Register student intern details, government ID verification, and generate portal login credentials'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); setEditingIntern(null); }}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            {formError && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: 'var(--danger-bg)',
                  color: 'var(--danger)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8125rem',
                  marginBottom: '1rem',
                }}
              >
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit}>
              {/* SECTION 1: Basic & Contact Information */}
              <div style={{
                padding: '1rem',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem',
                border: '1px solid var(--border-color)',
              }}>
                <div style={{ fontWeight: '700', fontSize: '0.875rem', color: '#0284c7', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                    border: '2px solid #0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {formData.profile_photo ? (
                      <img src={formData.profile_photo} alt="Profile Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '2rem', opacity: 0.6 }}>🎓</span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '700', marginBottom: '0.35rem', color: 'var(--text-main)' }}>
                      Intern Photo / Picture (Optional)
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <label style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.45rem 0.85rem',
                        backgroundColor: '#e0f2fe',
                        color: '#0369a1',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8125rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        border: '1px solid rgba(2, 132, 199, 0.25)',
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
                      JPG, PNG, or WEBP (Max 3MB). Visible on intern directory and chat.
                    </p>
                  </div>
                </div>

                {/* Name fields */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                      First Name *
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Aman"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                      Last Name *
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Verma"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                      required
                    />
                  </div>
                </div>

                {/* Email & Phone */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                      Official / Student Email *
                    </label>
                    <input
                      type="email"
                      className="input"
                      placeholder="intern@vaidimi.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                      Contact Number (Phone) *
                    </label>
                    <input
                      type="tel"
                      className="input"
                      placeholder="10-digit mobile number"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    />
                  </div>
                </div>

                {/* Emergency Contact */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                    Emergency Contact Number
                  </label>
                  <input
                    type="tel"
                    className="input"
                    placeholder="Emergency Contact Phone"
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
                <div style={{ fontWeight: '700', fontSize: '0.875rem', color: '#0284c7', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>👨‍👩‍👧</span> 2. Family & Personal Details
                </div>

                {/* Father & Mother Name */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                      Father's Name
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Father's full name"
                      value={formData.father_name}
                      onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                      Mother's Name
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Mother's full name"
                      value={formData.mother_name}
                      onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    />
                  </div>
                </div>

                {/* DOB, Gender, Blood Group */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                      Date of Birth (DOB)
                    </label>
                    <input
                      type="date"
                      className="input"
                      min="1900-01-01"
                      max="2199-12-31"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                      Gender
                    </label>
                    <select
                      className="input"
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
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                      Blood Group
                    </label>
                    <select
                      className="input"
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                      Religion
                    </label>
                    <select
                      className="input"
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
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                      Relationship Status
                    </label>
                    <select
                      className="input"
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
                <div style={{ fontWeight: '700', fontSize: '0.875rem', color: '#0284c7', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🆔</span> 3. Government ID & Address Verification
                </div>

                {/* Aadhar Number */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                    Aadhar Card Number (12 digits)
                  </label>
                  <input
                    type="text"
                    maxLength="14"
                    className="input"
                    placeholder="e.g. 1234 5678 9012"
                    value={formData.aadhar_number}
                    onChange={(e) => setFormData({ ...formData, aadhar_number: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff', letterSpacing: '0.05em' }}
                  />
                </div>

                {/* Current Address */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                    Current Address
                  </label>
                  <textarea
                    rows="2"
                    className="input"
                    placeholder="Hostel / Local Residence, City, State, PIN"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff', fontFamily: 'inherit' }}
                  />
                </div>

                {/* Permanent Address as per Aadhar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
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
                    className="input"
                    placeholder="Permanent residential address as recorded on Aadhar Card"
                    value={formData.permanent_address}
                    onChange={(e) => setFormData({ ...formData, permanent_address: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff', fontFamily: 'inherit' }}
                  />
                </div>
              </div>

              {/* SECTION 4: Academic, Department & Designation */}
              <div style={{
                padding: '1rem',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem',
                border: '1px solid var(--border-color)',
              }}>
                <div style={{ fontWeight: '700', fontSize: '0.875rem', color: '#0284c7', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🎓</span> 4. Educational Qualifications & Internship Program
                </div>

                {/* Qualification Level & Stream/Field */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                      Highest Qualification Level *
                    </label>
                    <select
                      className="input"
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
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                      Academic Stream / Field of Study
                    </label>
                    <select
                      className="input"
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

                {/* College & Course */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                      College / University / Board
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Delhi University / IIT / CBSE"
                      value={formData.college}
                      onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                      Degree & Course Title
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. B.Tech Computer Science / Class 12 PCM"
                      value={formData.course}
                      onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    />
                  </div>
                </div>

                {/* Passing Year & Percentage/CGPA */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                      Passing / Completion Year
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. 2025 / 2024"
                      value={formData.passing_year}
                      onChange={(e) => setFormData({ ...formData, passing_year: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                      Percentage / CGPA / Marks
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. 82.5% / 8.6 CGPA"
                      value={formData.percentage_cgpa}
                      onChange={(e) => setFormData({ ...formData, percentage_cgpa: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    />
                  </div>
                </div>

                {/* Branch & Department */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                      🏢 Assigned Branch *
                    </label>
                    <select
                      className="input"
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
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                      Department
                    </label>
                    <select
                      className="input"
                      value={formData.department_id}
                      onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    >
                      <option value="">-- Choose Department --</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.department_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Post / Designation */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                    Post / Designation *
                  </label>
                  <select
                    className="input"
                    value={INTERN_DESIGNATIONS.includes(formData.designation) ? formData.designation : (formData.designation ? 'OTHER' : '')}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'OTHER') {
                        if (INTERN_DESIGNATIONS.includes(formData.designation)) {
                          setFormData({ ...formData, designation: '' });
                        }
                      } else {
                        setFormData({ ...formData, designation: val });
                      }
                    }}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    required={!formData.designation}
                  >
                    <option value="">-- Choose Intern Designation --</option>
                    {INTERN_DESIGNATIONS.map((desig) => (
                      <option key={desig} value={desig}>{desig}</option>
                    ))}
                    <option value="OTHER">✏️ Enter Custom Designation...</option>
                  </select>

                  {(!INTERN_DESIGNATIONS.includes(formData.designation) || !formData.designation) && (
                    <input
                      type="text"
                      className="input"
                      placeholder="Type custom intern title (e.g. SDE Intern, Tester)..."
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      style={{ width: '100%', marginTop: '0.375rem', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                      required
                    />
                  )}
                </div>

                {/* Internship Dates */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                      Internship Start Date
                    </label>
                    <input
                      type="date"
                      className="input"
                      min="1900-01-01"
                      max="2199-12-31"
                      value={formData.internship_start_date}
                      onChange={(e) => setFormData({ ...formData, internship_start_date: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                      Internship End Date
                    </label>
                    <input
                      type="date"
                      className="input"
                      min="1900-01-01"
                      max="2199-12-31"
                      value={formData.internship_end_date}
                      onChange={(e) => setFormData({ ...formData, internship_end_date: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    />
                  </div>
                </div>

                {/* Academic Record Breakdown */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                    Academic Record Summary (Class 10, Class 12, Current Course Notes)
                  </label>
                  <textarea
                    rows="2"
                    className="input"
                    placeholder="e.g. Class 10: 85% (CBSE) | Class 12: 82% (PCM) | B.Tech: 8.2 CGPA (Pre-final year)"
                    value={formData.education_details}
                    onChange={(e) => setFormData({ ...formData, education_details: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff', fontFamily: 'inherit' }}
                  />
                </div>
              </div>

              {/* SECTION 5: Health, Medical & Emergency Wellness */}
              <div style={{
                padding: '1rem',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem',
                border: '1px solid var(--border-color)',
              }}>
                <div style={{ fontWeight: '700', fontSize: '0.875rem', color: '#0284c7', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🏥</span> 5. Health, Medical & Wellness Profile
                </div>

                {/* Medical Status & Insurance Provider */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                      Medical Fitness Status
                    </label>
                    <select
                      className="input"
                      value={formData.health_status}
                      onChange={(e) => setFormData({ ...formData, health_status: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    >
                      <option value="FIT_FOR_DUTY">✅ Fit for Duty (Normal)</option>
                      <option value="MEDICAL_OBSERVATION">⚠️ Under Medical Observation</option>
                      <option value="SPECIAL_ASSISTANCE_REQUIRED">♿ Requires Special Assistance</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                      Health Insurance Provider / TPA
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Star Health / ICICI Lombard / None"
                      value={formData.insurance_provider}
                      onChange={(e) => setFormData({ ...formData, insurance_provider: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    />
                  </div>
                </div>

                {/* Policy Number & Allergies */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                      Health Insurance Policy / Member ID
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Policy / Card ID Number"
                      value={formData.insurance_policy_number}
                      onChange={(e) => setFormData({ ...formData, insurance_policy_number: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                      Known Allergies & Sensitivities
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Penicillin, Dust, Peanuts (or None)"
                      value={formData.allergies}
                      onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    />
                  </div>
                </div>

                {/* Chronic Conditions & Doctor Info */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                    Pre-existing Medical Conditions / Chronic Notes
                  </label>
                  <textarea
                    rows="2"
                    className="input"
                    placeholder="e.g. Asthma, Diabetes, Hypertension, or No pre-existing medical conditions"
                    value={formData.medical_conditions}
                    onChange={(e) => setFormData({ ...formData, medical_conditions: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff', fontFamily: 'inherit' }}
                  />
                </div>

                {/* Emergency Doctor Contact */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                      Emergency Doctor / Physician Name
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Dr. Rajesh Sharma"
                      value={formData.emergency_doctor_name}
                      onChange={(e) => setFormData({ ...formData, emergency_doctor_name: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                      Emergency Doctor Phone
                    </label>
                    <input
                      type="tel"
                      className="input"
                      placeholder="Doctor Clinic / Mobile Phone"
                      value={formData.emergency_doctor_phone}
                      onChange={(e) => setFormData({ ...formData, emergency_doctor_phone: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                    />
                  </div>
                </div>
              </div>

              {/* Temporary Password */}
              <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f0f9ff', borderRadius: 'var(--radius-md)', border: '1px solid #bae6fd' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: '700', color: '#0369a1' }}>
                    {isEditModalOpen ? '🔑 Update Portal Password (Optional)' : '🔑 Temporary Login Password *'}
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', color: '#0284c7', borderColor: '#0284c7', backgroundColor: '#fff' }}
                  >
                    ⚡ Auto-Generate
                  </button>
                </div>
                <input
                  type="text"
                  className="input"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={isEditModalOpen ? 'Leave blank to retain current password' : 'Enter temporary password'}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontFamily: 'var(--font-mono)', backgroundColor: '#fff' }}
                  required={!isEditModalOpen}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {isEditModalOpen ? 'Enter a new password only if you wish to reset or change the intern\'s login password.' : 'The intern will use this password along with their Email or Intern ID to log into the portal.'}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); setEditingIntern(null); }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ backgroundColor: '#0284c7', borderColor: '#0284c7' }}
                >
                  {submitting ? 'Saving Changes...' : (isEditModalOpen ? 'Save Changes' : 'Create Account & Generate Credentials')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Intern Profile (Comprehensive) */}
      {isViewModalOpen && selectedIntern && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1500,
          padding: '1.5rem',
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#e0f2fe',
                  color: '#0369a1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                  fontSize: '1.25rem',
                  overflow: 'hidden',
                  border: '2px solid #0284c7',
                  flexShrink: 0,
                }}>
                  {selectedIntern.profile_photo ? (
                    <img src={selectedIntern.profile_photo} alt={selectedIntern.first_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    `${selectedIntern.first_name[0]}${selectedIntern.last_name[0]}`
                  )}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.375rem', marginBottom: '0.2rem' }}>
                    {selectedIntern.first_name} {selectedIntern.last_name}
                  </h2>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: '#0284c7' }}>
                      {selectedIntern.employee_code}
                    </span>
                    <span className="badge badge-warning">INTERN</span>
                    <span className={`badge ${selectedIntern.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                      {selectedIntern.status}
                    </span>
                    {selectedIntern.department?.department_name && (
                      <span className="badge badge-secondary">
                        {selectedIntern.department.department_name}
                      </span>
                    )}
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
              <h4 style={{ fontSize: '0.875rem', fontWeight: '700', color: '#0284c7', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>👨‍👩‍👧</span> Family & Personal Details
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Father's Name</div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{selectedIntern.father_name || 'Not provided'}</div>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Mother's Name</div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{selectedIntern.mother_name || 'Not provided'}</div>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Blood Group</div>
                  <div style={{ fontWeight: '700', fontSize: '0.875rem', color: '#e11d48' }}>{selectedIntern.blood_group || 'Not recorded'}</div>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Date of Birth (DOB)</div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{selectedIntern.date_of_birth || 'Not recorded'}</div>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Gender</div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{selectedIntern.gender || 'Not specified'}</div>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Religion</div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{selectedIntern.religion || 'Not recorded'}</div>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Relationship Status</div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{selectedIntern.marital_status || 'SINGLE'}</div>
                </div>
              </div>
            </div>

            {/* Profile Group 2: Contact, Aadhar & Address */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: '700', color: '#0284c7', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>🆔</span> Contact & Address Verification
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Contact Number (Phone)</div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{selectedIntern.phone || 'Not provided'}</div>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Emergency Number</div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{selectedIntern.emergency_contact || 'Not provided'}</div>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Official Email</div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{selectedIntern.email}</div>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Aadhar Card Number</div>
                  <div style={{ fontWeight: '700', fontSize: '0.875rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
                    {selectedIntern.aadhar_number || 'Not verified'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Current Address</div>
                  <div style={{ fontWeight: '500', fontSize: '0.8125rem' }}>{selectedIntern.address || 'Not provided'}</div>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Permanent Address (As per Aadhar)</div>
                  <div style={{ fontWeight: '500', fontSize: '0.8125rem' }}>{selectedIntern.permanent_address || 'Same as current address / Not provided'}</div>
                </div>
              </div>
            </div>

            {/* Profile Group 3: College, Academic & Role */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: '700', color: '#0284c7', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>🎓</span> Educational Qualifications & Internship Program
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Highest Qualification</div>
                  <div style={{ fontWeight: '700', fontSize: '0.875rem', color: '#0284c7' }}>{selectedIntern.highest_qualification || 'Graduation'}</div>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Stream / Field</div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{selectedIntern.education_field || 'Engineering & Technology'}</div>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Passing Year & Score</div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                    {selectedIntern.passing_year || 'N/A'}{selectedIntern.percentage_cgpa ? ` • ${selectedIntern.percentage_cgpa}` : ''}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>College / University</div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{selectedIntern.college || 'N/A'}</div>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Degree & Course</div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{selectedIntern.course || 'N/A'}</div>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Post / Designation</div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{selectedIntern.designation}</div>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Internship Duration</div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                    {selectedIntern.internship_start_date || 'Start: N/A'} to {selectedIntern.internship_end_date || 'Ongoing'}
                  </div>
                </div>
              </div>

              {selectedIntern.education_details && (
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Academic History Breakdown (10th / 12th / College)</div>
                  <div style={{ fontWeight: '500', fontSize: '0.8125rem', whiteSpace: 'pre-wrap' }}>
                    {selectedIntern.education_details}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Group 4: Health, Medical & Emergency Care */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: '700', color: '#0284c7', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>🏥</span> Health, Medical & Emergency Care
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Fitness Status</div>
                  <div style={{ fontWeight: '700', fontSize: '0.875rem', color: selectedIntern.health_status === 'FIT_FOR_DUTY' ? '#10b981' : '#f59e0b' }}>
                    {selectedIntern.health_status === 'FIT_FOR_DUTY' ? '✅ Fit for Duty' : selectedIntern.health_status || 'Fit for Duty'}
                  </div>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Health Insurance Provider</div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{selectedIntern.insurance_provider || 'Not provided'}</div>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Insurance Policy Number</div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem', fontFamily: 'var(--font-mono)' }}>{selectedIntern.insurance_policy_number || 'N/A'}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Known Allergies</div>
                  <div style={{ fontWeight: '500', fontSize: '0.8125rem', color: selectedIntern.allergies ? '#dc2626' : 'inherit' }}>
                    {selectedIntern.allergies || 'None reported'}
                  </div>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Emergency Doctor / Clinic</div>
                  <div style={{ fontWeight: '600', fontSize: '0.8125rem' }}>
                    {selectedIntern.emergency_doctor_name || 'Not assigned'}
                    {selectedIntern.emergency_doctor_phone ? ` (${selectedIntern.emergency_doctor_phone})` : ''}
                  </div>
                </div>
              </div>

              {selectedIntern.medical_conditions && (
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Medical Notes / Conditions</div>
                  <div style={{ fontWeight: '500', fontSize: '0.8125rem' }}>{selectedIntern.medical_conditions}</div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setIsViewModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Intern Credentials & Saved Password Modal */}
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
            zIndex: 2000,
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
                    backgroundColor: '#e0f2fe',
                    color: '#0284c7',
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
                    Intern Login Credentials
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

            {/* Intern Info Header Pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(2, 132, 199, 0.06)',
                border: '1px solid rgba(2, 132, 199, 0.15)',
                borderRadius: '10px',
                marginBottom: '1.25rem',
              }}
            >
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.9375rem', color: '#0c4a6e' }}>
                  {createdCredentials.fullName}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {createdCredentials.designation || 'Intern / Trainee'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.375rem' }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: '700',
                    backgroundColor: '#ffffff',
                    color: '#0284c7',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #bae6fd',
                  }}
                >
                  {createdCredentials.employeeCode}
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    backgroundColor: '#e0f2fe',
                    color: '#0369a1',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '6px',
                  }}
                >
                  INTERN
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
                      backgroundColor: '#e0f2fe',
                      color: '#0369a1',
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
                      color: '#0284c7',
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
                border: '1px solid #bae6fd',
                backgroundColor: '#f0f9ff',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ fontWeight: '700', fontSize: '0.875rem', color: '#0369a1', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>🔄</span> Reset or Update Intern Password
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
                    setResetPasswordInput(`Intern@${rand}`);
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
                  style={{ padding: '0.5rem 0.875rem', fontSize: '0.75rem', fontWeight: '600', backgroundColor: '#0284c7' }}
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
                onClick={copyToClipboard}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#0284c7',
                  borderColor: '#0284c7',
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

export default InternsPage;
