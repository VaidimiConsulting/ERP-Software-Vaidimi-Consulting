import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { useAuth } from '../../context/AuthContext';
import { getEmployeeById, updateEmployee } from '../../services/employeeService';
import ChangePasswordModal from '../../components/auth/ChangePasswordModal';

function MyProfilePage() {
  const { user } = useAuth();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Editable fields for employee
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [skills, setSkills] = useState('');
  const [allergies, setAllergies] = useState('');

  const loadProfile = async () => {
    if (!user?.employeeProfile?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await getEmployeeById(user.employeeProfile.id);
      if (res.success) {
        const emp = res.data;
        setEmployee(emp);
        setPhone(emp.phone || '');
        setAddress(emp.address || '');
        setEmergencyContact(emp.emergency_contact || '');
        setSkills(emp.skills || '');
        setAllergies(emp.allergies || '');
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user]);

  const handleSaveContactInfo = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const res = await updateEmployee(employee.id, {
        phone,
        address,
        emergency_contact: emergencyContact,
        skills,
        allergies,
      });

      if (res.success) {
        setFeedback({ success: true, message: 'Your personal contact details have been updated and submitted to Administration.' });
        loadProfile();
      }
    } catch (err) {
      setFeedback({
        success: false,
        message: err.response?.data?.message || 'Failed to update profile.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout pageTitle="My Profile" subtitle="Loading profile details...">
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading profile...
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="My Employee Profile" subtitle="Manage your personal details and view corporate records">
      {feedback && (
        <div style={{
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          backgroundColor: feedback.success ? 'var(--success-bg)' : 'var(--danger-bg)',
          color: feedback.success ? 'var(--success)' : 'var(--danger)',
          fontSize: '0.875rem',
          marginBottom: '1.5rem',
          border: `1px solid ${feedback.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
        }}>
          {feedback.message}
        </div>
      )}

      <div className="grid grid-cols-2">
        {/* Left Column: Official Administrative Record (Read-Only) */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.125rem' }}>Official Company Record</h3>
            <span className="badge badge-info">🔒 Admin Managed</span>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            These corporate records are maintained by Human Resources & Administration.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Employee Code</div>
              <div style={{ fontWeight: '700', fontFamily: 'var(--font-mono)', color: 'var(--primary)', fontSize: '1.1rem' }}>
                {employee?.employee_code || 'EMP-002'}
              </div>
            </div>

            <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Full Name</div>
              <div style={{ fontWeight: '600' }}>
                {employee?.first_name} {employee?.last_name}
              </div>
            </div>

            <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Official Email</div>
              <div style={{ fontWeight: '600' }}>{employee?.email}</div>
            </div>

            <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Designation</div>
              <div style={{ fontWeight: '600' }}>{employee?.designation}</div>
            </div>

            <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Department</div>
              <div style={{ fontWeight: '600' }}>{employee?.department?.department_name || 'Engineering & Development'}</div>
            </div>

            <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Joining Date</div>
              <div style={{ fontWeight: '600' }}>{employee?.joining_date}</div>
            </div>

            <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Account Role & Status</div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                <span className="badge badge-info">{user?.role}</span>
                <span className="badge badge-success">{employee?.status}</span>
              </div>
            </div>

            {/* Family & Personal Information */}
            <div style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: '700', fontSize: '0.8125rem', color: 'var(--primary)', marginBottom: '0.75rem' }}>
                👨‍👩‍👧 Family & Personal Details
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8125rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Father's Name</span>
                  <strong>{employee?.father_name || 'Not provided'}</strong>
                </div>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Mother's Name</span>
                  <strong>{employee?.mother_name || 'Not provided'}</strong>
                </div>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Blood Group</span>
                  <strong style={{ color: '#e11d48' }}>{employee?.blood_group || 'Not recorded'}</strong>
                </div>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Date of Birth</span>
                  <strong>{employee?.date_of_birth || 'Not recorded'}</strong>
                </div>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Gender</span>
                  <strong>{employee?.gender || 'Not specified'}</strong>
                </div>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Religion</span>
                  <strong>{employee?.religion || 'Not recorded'}</strong>
                </div>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', gridColumn: 'span 2' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Relationship Status</span>
                  <strong>{employee?.marital_status || 'SINGLE'}</strong>
                </div>
              </div>
            </div>

            {/* Government ID & Permanent Address */}
            <div style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: '700', fontSize: '0.8125rem', color: 'var(--primary)', marginBottom: '0.75rem' }}>
                🆔 Government ID & Permanent Address
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8125rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Aadhar Card Number</span>
                  <strong style={{ fontFamily: 'var(--font-mono)' }}>{employee?.aadhar_number || 'Not verified'}</strong>
                </div>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Permanent Address (As per Aadhar)</span>
                  <div>{employee?.permanent_address || 'Same as residential address / Not recorded'}</div>
                </div>
              </div>
            </div>

            {/* Health & Mediclaim Insurance Profile */}
            <div style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: '700', fontSize: '0.8125rem', color: 'var(--primary)', marginBottom: '0.75rem' }}>
                🏥 Health & Mediclaim Insurance Profile
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8125rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Fitness Status</span>
                  <strong style={{ color: employee?.health_status === 'FIT_FOR_DUTY' ? '#10b981' : '#f59e0b' }}>
                    {employee?.health_status === 'FIT_FOR_DUTY' ? '✅ Fit for Duty' : employee?.health_status || 'Fit for Duty'}
                  </strong>
                </div>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Insurance Provider</span>
                  <strong>{employee?.insurance_provider || 'Corporate Group Cover / N/A'}</strong>
                </div>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Policy / Card ID</span>
                  <strong style={{ fontFamily: 'var(--font-mono)' }}>{employee?.insurance_policy_number || 'N/A'}</strong>
                </div>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Emergency Doctor</span>
                  <strong>
                    {employee?.emergency_doctor_name || 'Not assigned'}
                    {employee?.emergency_doctor_phone ? ` (${employee.emergency_doctor_phone})` : ''}
                  </strong>
                </div>
                {employee?.allergies && (
                  <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', gridColumn: 'span 2' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Known Allergies</span>
                    <span style={{ color: '#dc2626', fontWeight: '600' }}>{employee.allergies}</span>
                  </div>
                )}
                {employee?.medical_conditions && (
                  <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', gridColumn: 'span 2' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Medical History / Notes</span>
                    <div>{employee.medical_conditions}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Educational & Academic Qualifications */}
            <div style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: '700', fontSize: '0.8125rem', color: 'var(--primary)', marginBottom: '0.75rem' }}>
                🎓 Educational & Academic Qualifications
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8125rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Highest Qualification</span>
                  <strong style={{ color: 'var(--primary)' }}>{employee?.highest_qualification || 'Graduation'}</strong>
                </div>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Stream / Field</span>
                  <strong>{employee?.education_field || 'Engineering & Technology'}</strong>
                </div>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Degree / Specialization</span>
                  <strong>{employee?.course || 'Not recorded'}</strong>
                </div>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Passing Year & Score</span>
                  <strong>{employee?.passing_year || 'N/A'}{employee?.percentage_cgpa ? ` • ${employee.percentage_cgpa}` : ''}</strong>
                </div>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', gridColumn: 'span 2' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>College / University / Board</span>
                  <strong>{employee?.college || 'Not recorded'}</strong>
                </div>
                {employee?.education_details && (
                  <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', gridColumn: 'span 2' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Academic Record Breakdown</span>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{employee.education_details}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Personal & Contact Information (Self-Editable) */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.125rem' }}>Personal Contact Information</h3>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span className="badge badge-success">✏️ Self Service</span>
              <Link
                to="/employee/settings"
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', textDecoration: 'none', fontWeight: '600' }}
              >
                ⚙️ Settings Hub
              </Link>
            </div>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            You are authorized to maintain your contact numbers, address, and skills.
          </p>

          <form onSubmit={handleSaveContactInfo}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555-0100"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.9375rem',
                }}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                Emergency Contact (Name & Phone)
              </label>
              <input
                type="text"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="e.g. Maria Rivera (+1 555-0192)"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.9375rem',
                }}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                Residential Address
              </label>
              <textarea
                rows="3"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Tech Boulevard, Silicon Valley, CA"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.9375rem',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                Professional Skills (comma separated)
              </label>
              <input
                type="text"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="React.js, Node.js, Express, MySQL"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.9375rem',
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                Known Allergies & Sensitivities (Self-Reported)
              </label>
              <input
                type="text"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="e.g. Dust, Penicillin, Peanuts, Pollen (or None)"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.9375rem',
                }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ width: '100%', padding: '0.75rem' }}
            >
              {saving ? 'Updating Details...' : '💾 Save Contact Details'}
            </button>
          </form>

          {/* Account Security Card */}
          <div style={{
            marginTop: '2rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--border-color)'
          }}>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
              🔒 Account Security & Credentials
            </h4>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Keep your account secure by using a strong password. You can update your password at any time.
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowPasswordModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}
            >
              <span>🔑</span>
              <span>Change Account Password</span>
            </button>
          </div>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </AppLayout>
  );
}

export default MyProfilePage;
