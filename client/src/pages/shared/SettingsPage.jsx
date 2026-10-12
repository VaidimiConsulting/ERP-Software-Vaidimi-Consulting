import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { useAuth } from '../../context/AuthContext';
import {
  getCompanySettings,
  updateCompanySettings,
  updateUserProfile,
  getEmployeeUpdateLogs,
} from '../../services/settingService';
import { useTheme } from '../../context/ThemeContext';

export const QUALIFICATION_OPTIONS = [
  'Class 10',
  'Class 12',
  'Diploma / Polytechnic',
  'Graduation (B.Tech, BCA, B.Sc, B.Com, BBA)',
  'Post Graduation (M.Tech, MCA, MBA, M.Sc, M.Com)',
  'Doctorate / Ph.D.',
];

export const STREAM_OPTIONS = [
  'Engineering & Technology',
  'Computer Applications & IT',
  'Management & Business Operations',
  'Commerce, Accounts & Finance',
  'Science & Mathematics',
  'Arts & Humanities',
  'General / Other',
];

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
];

function SettingsPage() {
  const { user, isAdmin, isHR, changePassword, refreshUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  // Parse initial tab from query param e.g. ?tab=audit
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') || 'profile';
  const [activeTab, setActiveTab] = useState(initialTab);

  const emp = user?.employeeProfile || {};

  // Form State: Profile Settings
  const [profileForm, setProfileForm] = useState({
    first_name: emp.first_name || '',
    last_name: emp.last_name || '',
    phone: emp.phone || '',
    emergency_contact: emp.emergency_contact || '',
    address: emp.address || '',
    skills: emp.skills || '',
    profile_photo: emp.profile_photo || '',
    allergies: emp.allergies || '',
    medical_conditions: emp.medical_conditions || '',
    highest_qualification: emp.highest_qualification || 'Graduation (B.Tech, BCA, B.Sc, B.Com, BBA)',
    education_field: emp.education_field || 'Computer Applications & IT',
    college: emp.college || '',
    course: emp.course || '',
    passing_year: emp.passing_year || '',
    percentage_cgpa: emp.percentage_cgpa || '',
    education_details: emp.education_details || '',
  });

  // Password State
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Company Timing Settings State (Admin / HR)
  const [timingSettings, setTimingSettings] = useState({
    office_start_time: '10:00',
    office_grace_end_time: '11:00',
    break_start_time: '13:00',
    break_end_time: '14:00',
    office_end_time: '17:30',
    work_hours_standard: '6.0',
  });

  // Audit Logs State (Admin only)
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Status & Feedback States
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingTiming, setSavingTiming] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Local preferences
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('vc_sound_notifications') !== 'false';
  });

  const [emailAlerts, setEmailAlerts] = useState(() => {
    return localStorage.getItem('vc_email_alerts') !== 'false';
  });

  // Sync profileForm when user loads or refreshes
  useEffect(() => {
    if (user?.employeeProfile) {
      const e = user.employeeProfile;
      setProfileForm({
        first_name: e.first_name || '',
        last_name: e.last_name || '',
        phone: e.phone || '',
        emergency_contact: e.emergency_contact || '',
        address: e.address || '',
        skills: e.skills || '',
        profile_photo: e.profile_photo || '',
        allergies: e.allergies || '',
        medical_conditions: e.medical_conditions || '',
        highest_qualification: e.highest_qualification || 'Graduation (B.Tech, BCA, B.Sc, B.Com, BBA)',
        education_field: e.education_field || 'Computer Applications & IT',
        college: e.college || '',
        course: e.course || '',
        passing_year: e.passing_year || '',
        percentage_cgpa: e.percentage_cgpa || '',
        education_details: e.education_details || '',
      });
    }
  }, [user]);

  // Load company settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await getCompanySettings();
        if (res.success && res.data) {
          setTimingSettings(res.data);
        }
      } catch (err) {
        console.warn('Failed to load company timing settings:', err.message);
      }
    };
    loadSettings();
  }, []);

  // Load audit logs if Admin views the audit tab
  useEffect(() => {
    if (activeTab === 'audit' && isAdmin) {
      const loadLogs = async () => {
        setLoadingLogs(true);
        try {
          const res = await getEmployeeUpdateLogs();
          if (res.success) {
            setAuditLogs(res.data);
          }
        } catch (err) {
          console.error('Failed to load employee audit logs:', err);
        } finally {
          setLoadingLogs(false);
        }
      };
      loadLogs();
    }
  }, [activeTab, isAdmin]);

  const handleSoundToggle = (val) => {
    setSoundEnabled(val);
    localStorage.setItem('vc_sound_notifications', val ? 'true' : 'false');
  };

  const handleEmailToggle = (val) => {
    setEmailAlerts(val);
    localStorage.setItem('vc_email_alerts', val ? 'true' : 'false');
  };

  // Submit Profile Changes
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setFeedback(null);

    try {
      const res = await updateUserProfile(profileForm);
      if (res.success) {
        setFeedback({
          success: true,
          message: isAdmin
            ? 'Profile settings updated successfully.'
            : 'Your profile has been saved and updated details have been submitted to Administration.',
        });
        await refreshUser();
      }
    } catch (err) {
      setFeedback({
        success: false,
        message: err.response?.data?.message || 'Failed to update profile settings.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  // Submit Password Change
  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      setFeedback({ success: false, message: 'New password and confirm password do not match.' });
      return;
    }
    if (passwords.newPassword.length < 6) {
      setFeedback({ success: false, message: 'New password must be at least 6 characters long.' });
      return;
    }

    setSavingPassword(true);
    setFeedback(null);

    try {
      const res = await changePassword(
        passwords.currentPassword,
        passwords.newPassword,
        passwords.confirmPassword
      );
      if (res.success) {
        setFeedback({ success: true, message: 'Your password has been changed successfully!' });
        setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setFeedback({ success: false, message: res.message || 'Failed to update password.' });
      }
    } catch (err) {
      setFeedback({
        success: false,
        message: err.response?.data?.message || err.message || 'Failed to update password.',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  // Submit Office Timings (Admin / HR)
  const handleSaveTimings = async (e) => {
    e.preventDefault();
    setSavingTiming(true);
    setFeedback(null);

    try {
      const res = await updateCompanySettings(timingSettings);
      if (res.success) {
        setFeedback({ success: true, message: 'Corporate office timings & working hours saved successfully.' });
        setTimingSettings(res.data);
      }
    } catch (err) {
      setFeedback({
        success: false,
        message: err.response?.data?.message || 'Failed to save office timings.',
      });
    } finally {
      setSavingTiming(false);
    }
  };

  return (
    <AppLayout
      pageTitle="Settings & Preferences"
      subtitle="Manage your personal profile, security credentials, system notifications, and operational parameters"
    >
      {/* Feedback Banner */}
      {feedback && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: feedback.success ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            color: feedback.success ? '#059669' : '#dc2626',
            border: `1px solid ${feedback.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>{feedback.success ? '✅' : '⚠️'}</span>
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              fontWeight: '700',
              fontSize: '1rem',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Role Scoping Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '1rem 1.25rem',
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          marginBottom: '1.5rem',
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '800',
              fontSize: '1.15rem',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(15, 118, 110, 0.3)',
            }}
          >
            {profileForm.profile_photo ? (
              <img
                src={profileForm.profile_photo}
                alt="Profile"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : emp.first_name ? (
              `${emp.first_name[0]}${emp.last_name ? emp.last_name[0] : ''}`.toUpperCase()
            ) : isAdmin ? (
              'GS'
            ) : isHR ? (
              'VK'
            ) : (
              'VC'
            )}
          </div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '1.05rem', color: 'var(--text-main)' }}>
              {emp.first_name ? `${emp.first_name} ${emp.last_name}` : user?.email}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
              <span className="badge badge-info">{user?.role}</span>
              {emp.employee_code && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-muted)',
                    backgroundColor: 'var(--bg-subtle)',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '4px',
                  }}
                >
                  {emp.employee_code}
                </span>
              )}
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {emp.designation || (isAdmin ? 'Executive Director' : isHR ? 'Head of HR' : 'Associate')}
              </span>
            </div>
          </div>
        </div>

        {/* Audit Transparency Capsule */}
        <div
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            backgroundColor: 'var(--bg-subtle)',
            padding: '0.4rem 0.85rem',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <span>🛡️</span>
          <span>
            {isAdmin
              ? 'Executive Superadmin Account'
              : isHR
              ? 'HR Portal: Attendance & Team Records (Salary Restricted)'
              : 'Audit Enabled: Profile edits are logged with Administration'}
          </span>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '1.5rem',
          overflowX: 'auto',
          paddingBottom: '0.25rem',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          style={{
            padding: '0.65rem 1.1rem',
            borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
            border: 'none',
            borderBottom: activeTab === 'profile' ? '3px solid var(--primary)' : '3px solid transparent',
            backgroundColor: activeTab === 'profile' ? 'var(--bg-card)' : 'transparent',
            color: activeTab === 'profile' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'profile' ? '700' : '500',
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap',
          }}
        >
          <span>👤</span>
          <span>Edit Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          style={{
            padding: '0.65rem 1.1rem',
            borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
            border: 'none',
            borderBottom: activeTab === 'security' ? '3px solid var(--primary)' : '3px solid transparent',
            backgroundColor: activeTab === 'security' ? 'var(--bg-card)' : 'transparent',
            color: activeTab === 'security' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'security' ? '700' : '500',
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap',
          }}
        >
          <span>🔒</span>
          <span>Security & Password</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('preferences')}
          style={{
            padding: '0.65rem 1.1rem',
            borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
            border: 'none',
            borderBottom: activeTab === 'preferences' ? '3px solid var(--primary)' : '3px solid transparent',
            backgroundColor: activeTab === 'preferences' ? 'var(--bg-card)' : 'transparent',
            color: activeTab === 'preferences' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'preferences' ? '700' : '500',
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap',
          }}
        >
          <span>🔔</span>
          <span>Preferences & Display</span>
        </button>

        {(isAdmin || isHR) && (
          <button
            type="button"
            onClick={() => setActiveTab('timings')}
            style={{
              padding: '0.65rem 1.1rem',
              borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
              border: 'none',
              borderBottom: activeTab === 'timings' ? '3px solid var(--primary)' : '3px solid transparent',
              backgroundColor: activeTab === 'timings' ? 'var(--bg-card)' : 'transparent',
              color: activeTab === 'timings' ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: activeTab === 'timings' ? '700' : '500',
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              whiteSpace: 'nowrap',
            }}
          >
            <span>⏱️</span>
            <span>Office Timings {isHR ? '(Overview)' : ''}</span>
          </button>
        )}

        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            style={{
              padding: '0.65rem 1.1rem',
              borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
              border: 'none',
              borderBottom: activeTab === 'audit' ? '3px solid var(--primary)' : '3px solid transparent',
              backgroundColor: activeTab === 'audit' ? 'var(--bg-card)' : 'transparent',
              color: activeTab === 'audit' ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: activeTab === 'audit' ? '700' : '500',
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              whiteSpace: 'nowrap',
            }}
          >
            <span>📋</span>
            <span>Employee Profile Updates Log</span>
          </button>
        )}
      </div>

      {/* TAB 1: EDIT PROFILE */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-2">
          {/* Left Column: Official Details (Read-Only) */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.125rem' }}>Corporate Identity Record</h3>
              <span className="badge badge-info">🏢 Official Record</span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Official administrative details assigned by the corporation.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Official Email</div>
                <div style={{ fontWeight: '700', fontSize: '0.9375rem', color: 'var(--text-main)' }}>{user?.email}</div>
              </div>

              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Corporate Employee Code</div>
                <div style={{ fontWeight: '700', fontFamily: 'var(--font-mono)', color: 'var(--primary)', fontSize: '1.05rem' }}>
                  {emp.employee_code || (isAdmin ? 'EMP-001' : isHR ? 'EMP-HR01' : 'EMP-VC')}
                </div>
              </div>

              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Department & Branch</div>
                <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                  {emp.department?.department_name || 'Corporate Management'} &bull; {emp.branch?.city || 'Varanasi Head Office'}
                </div>
              </div>

              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Designation & Role</div>
                <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                  {emp.designation || (isAdmin ? 'Managing Director & Admin' : isHR ? 'Head of People Operations' : 'Associate')}
                </div>
              </div>

              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Employment Type & Joining Date</div>
                <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                  {emp.employment_type || 'EMPLOYEE'} &bull; Joined {emp.joining_date || '2022-01-01'}
                </div>
              </div>

              {/* Notice for Standard Employees */}
              {!isAdmin && (
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: 'rgba(2, 132, 199, 0.08)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(2, 132, 199, 0.2)',
                    fontSize: '0.8125rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.45,
                  }}
                >
                  <strong style={{ color: 'var(--primary)', display: 'block', marginBottom: '0.25rem' }}>
                    📢 Administrative Transparency Policy
                  </strong>
                  Whenever you update your phone, address, emergency contact, or education details, a detailed alert is automatically dispatched to the Administration in real-time.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Self-Editable Settings Form */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.125rem' }}>Self-Service Profile Information</h3>
              <span className="badge badge-success">✏️ Editable</span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Keep your contact details and academic qualifications up-to-date.
            </p>

            <form onSubmit={handleSaveProfile}>
              {/* If Admin, they can update their Name */}
              {isAdmin && (
                <div className="grid grid-cols-2" style={{ marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                      First Name
                    </label>
                    <input
                      type="text"
                      value={profileForm.first_name}
                      onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.65rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={profileForm.last_name}
                      onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.65rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Avatar Selector */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                  Profile Photo / Avatar
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  {PRESET_AVATARS.map((av, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setProfileForm({ ...profileForm, profile_photo: av })}
                      style={{
                        border: profileForm.profile_photo === av ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                        padding: '2px',
                        borderRadius: '50%',
                        background: 'transparent',
                        cursor: 'pointer',
                        width: '36px',
                        height: '36px',
                        overflow: 'hidden',
                      }}
                    >
                      <img src={av} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    </button>
                  ))}
                  {profileForm.profile_photo && (
                    <button
                      type="button"
                      onClick={() => setProfileForm({ ...profileForm, profile_photo: '' })}
                      style={{
                        fontSize: '0.72rem',
                        padding: '0.25rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-subtle)',
                        cursor: 'pointer',
                      }}
                    >
                      Clear Avatar
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Or enter custom image URL"
                  value={profileForm.profile_photo}
                  onChange={(e) => setProfileForm({ ...profileForm, profile_photo: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.8125rem',
                  }}
                />
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-2" style={{ marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                    Phone Number (10 Digits)
                  </label>
                  <input
                    type="text"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    placeholder="9876543210"
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                    Emergency Contact Number
                  </label>
                  <input
                    type="text"
                    value={profileForm.emergency_contact}
                    onChange={(e) => setProfileForm({ ...profileForm, emergency_contact: e.target.value })}
                    placeholder="9876500000"
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                    }}
                  />
                </div>
              </div>

              {/* Residential Address */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                  Residential Address
                </label>
                <textarea
                  rows="2"
                  value={profileForm.address}
                  onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                  placeholder="Apartment, Street, City, State, PIN"
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Skills */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                  Professional Skills (Comma separated)
                </label>
                <input
                  type="text"
                  value={profileForm.skills}
                  onChange={(e) => setProfileForm({ ...profileForm, skills: e.target.value })}
                  placeholder="React.js, Node.js, Express, MySQL, ERP Systems"
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                  }}
                />
              </div>

              {/* Health & Allergies */}
              <div className="grid grid-cols-2" style={{ marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                    Known Allergies
                  </label>
                  <input
                    type="text"
                    value={profileForm.allergies}
                    onChange={(e) => setProfileForm({ ...profileForm, allergies: e.target.value })}
                    placeholder="e.g. Dust, Peanuts (or None)"
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                    Medical Conditions / Notes
                  </label>
                  <input
                    type="text"
                    value={profileForm.medical_conditions}
                    onChange={(e) => setProfileForm({ ...profileForm, medical_conditions: e.target.value })}
                    placeholder="None"
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                    }}
                  />
                </div>
              </div>

              {/* Academic Qualifications Section */}
              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--primary)', marginBottom: '0.75rem' }}>
                  🎓 Academic & Educational Record
                </h4>

                <div className="grid grid-cols-2" style={{ marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', marginBottom: '0.3rem' }}>
                      Highest Qualification
                    </label>
                    <select
                      value={profileForm.highest_qualification}
                      onChange={(e) => setProfileForm({ ...profileForm, highest_qualification: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.6rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-card)',
                      }}
                    >
                      {QUALIFICATION_OPTIONS.map((q) => (
                        <option key={q} value={q}>
                          {q}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', marginBottom: '0.3rem' }}>
                      Stream / Field
                    </label>
                    <select
                      value={profileForm.education_field}
                      onChange={(e) => setProfileForm({ ...profileForm, education_field: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.6rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-card)',
                      }}
                    >
                      {STREAM_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2" style={{ marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', marginBottom: '0.3rem' }}>
                      College / University
                    </label>
                    <input
                      type="text"
                      value={profileForm.college}
                      onChange={(e) => setProfileForm({ ...profileForm, college: e.target.value })}
                      placeholder="e.g. BHU / AKTU"
                      style={{
                        width: '100%',
                        padding: '0.6rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', marginBottom: '0.3rem' }}>
                      Degree / Course
                    </label>
                    <input
                      type="text"
                      value={profileForm.course}
                      onChange={(e) => setProfileForm({ ...profileForm, course: e.target.value })}
                      placeholder="e.g. B.Tech (Computer Science)"
                      style={{
                        width: '100%',
                        padding: '0.6rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2" style={{ marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', marginBottom: '0.3rem' }}>
                      Passing Year
                    </label>
                    <input
                      type="text"
                      value={profileForm.passing_year}
                      onChange={(e) => setProfileForm({ ...profileForm, passing_year: e.target.value })}
                      placeholder="e.g. 2024"
                      style={{
                        width: '100%',
                        padding: '0.6rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', marginBottom: '0.3rem' }}>
                      Percentage / CGPA
                    </label>
                    <input
                      type="text"
                      value={profileForm.percentage_cgpa}
                      onChange={(e) => setProfileForm({ ...profileForm, percentage_cgpa: e.target.value })}
                      placeholder="e.g. 8.5 CGPA / 82%"
                      style={{
                        width: '100%',
                        padding: '0.6rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                      }}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={savingProfile}
                style={{ width: '100%', padding: '0.75rem', fontWeight: '700' }}
              >
                {savingProfile ? 'Saving Profile Updates...' : '💾 Save Profile Settings'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: SECURITY & PASSWORD */}
      {activeTab === 'security' && (
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <div className="card">
            <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Change Account Password</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Ensure your login credentials remain secure. Passwords must be at least 6 characters long.
            </p>

            <form onSubmit={handleSavePassword}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwords.currentPassword}
                  onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                  placeholder="Enter current password"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                  New Password
                </label>
                <input
                  type="password"
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  placeholder="At least 6 characters"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                  placeholder="Re-enter new password"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                  }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={savingPassword}
                style={{ width: '100%', padding: '0.75rem', fontWeight: '700' }}
              >
                {savingPassword ? 'Updating Password...' : '🔒 Update Account Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: PREFERENCES & DISPLAY */}
      {activeTab === 'preferences' && (
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <div className="card">
            <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Display & Alert Preferences</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Customize your workspace notifications, sound effects, and color scheme.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Audio Chime */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.9375rem' }}>Audio Notification Chime</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Play an audible chime whenever new chat messages or system alerts arrive
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => handleSoundToggle(e.target.checked)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
              </div>

              {/* Email Alerts */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.9375rem' }}>Email Dispatch Alerts</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Receive official corporate emails for payroll slips, leaves, and approvals
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => handleEmailToggle(e.target.checked)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
              </div>

              {/* Theme Toggle */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.9375rem' }}>Workspace Color Theme</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Currently using {theme === 'dark' ? 'Dark Mode 🌙' : 'Light Mode ☀️'}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={toggleTheme}
                  style={{ fontSize: '0.8125rem', fontWeight: '600' }}
                >
                  {theme === 'dark' ? 'Switch to Light Mode ☀️' : 'Switch to Dark Mode 🌙'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: OFFICE TIMINGS (ADMIN / HR) */}
      {activeTab === 'timings' && (isAdmin || isHR) && (
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.125rem' }}>Corporate Office Timings & Shift Standards</h3>
              {isHR && !isAdmin && <span className="badge badge-info">HR Policy Overview</span>}
              {isAdmin && <span className="badge badge-success">Admin Configurable</span>}
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              {isAdmin
                ? 'Configure standard shift timings, grace periods for attendance calculation, and lunch break hours.'
                : 'Official shift timings and attendance audit benchmarks for Human Resources operations.'}
            </p>

            <form onSubmit={handleSaveTimings}>
              <div className="grid grid-cols-2" style={{ marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                    Shift Start Time
                  </label>
                  <input
                    type="time"
                    disabled={!isAdmin}
                    value={timingSettings.office_start_time || '10:00'}
                    onChange={(e) => setTimingSettings({ ...timingSettings, office_start_time: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      backgroundColor: isAdmin ? 'var(--bg-card)' : 'var(--bg-subtle)',
                    }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Default: 10:00 AM</span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                    Grace Period End (Late Mark Threshold)
                  </label>
                  <input
                    type="time"
                    disabled={!isAdmin}
                    value={timingSettings.office_grace_end_time || '11:00'}
                    onChange={(e) => setTimingSettings({ ...timingSettings, office_grace_end_time: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      backgroundColor: isAdmin ? 'var(--bg-card)' : 'var(--bg-subtle)',
                    }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Check-in after this is flagged as Late</span>
                </div>
              </div>

              <div className="grid grid-cols-2" style={{ marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                    Lunch Break Start
                  </label>
                  <input
                    type="time"
                    disabled={!isAdmin}
                    value={timingSettings.break_start_time || '13:00'}
                    onChange={(e) => setTimingSettings({ ...timingSettings, break_start_time: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      backgroundColor: isAdmin ? 'var(--bg-card)' : 'var(--bg-subtle)',
                    }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Default: 1:00 PM</span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                    Lunch Break End
                  </label>
                  <input
                    type="time"
                    disabled={!isAdmin}
                    value={timingSettings.break_end_time || '14:00'}
                    onChange={(e) => setTimingSettings({ ...timingSettings, break_end_time: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      backgroundColor: isAdmin ? 'var(--bg-card)' : 'var(--bg-subtle)',
                    }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Default: 2:00 PM (1 hr break)</span>
                </div>
              </div>

              <div className="grid grid-cols-2" style={{ marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                    Shift End Time
                  </label>
                  <input
                    type="time"
                    disabled={!isAdmin}
                    value={timingSettings.office_end_time || '17:30'}
                    onChange={(e) => setTimingSettings({ ...timingSettings, office_end_time: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      backgroundColor: isAdmin ? 'var(--bg-card)' : 'var(--bg-subtle)',
                    }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Default: 5:30 PM</span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                    Standard Daily Work Hours (Net)
                  </label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={timingSettings.work_hours_standard || '6.0'}
                    onChange={(e) => setTimingSettings({ ...timingSettings, work_hours_standard: e.target.value })}
                    placeholder="6.0"
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      backgroundColor: isAdmin ? 'var(--bg-card)' : 'var(--bg-subtle)',
                    }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Standard required daily working hours</span>
                </div>
              </div>

              {isAdmin && (
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingTiming}
                  style={{ width: '100%', padding: '0.75rem', fontWeight: '700' }}
                >
                  {savingTiming ? 'Saving Corporate Timings...' : '💾 Save Corporate Office Timings'}
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {/* TAB 5: EMPLOYEE PROFILE UPDATES AUDIT LOG (ADMIN ONLY) */}
      {activeTab === 'audit' && isAdmin && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem' }}>Employee Profile Updates Audit Trail</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Real-time log of profile and contact modifications submitted by staff members across the organization.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setLoadingLogs(true);
                getEmployeeUpdateLogs().then((res) => {
                  if (res.success) setAuditLogs(res.data);
                  setLoadingLogs(false);
                });
              }}
              style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <span>🔄</span>
              <span>Refresh Log</span>
            </button>
          </div>

          {loadingLogs ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading audit logs...
            </div>
          ) : auditLogs.length === 0 ? (
            <div
              style={{
                padding: '3rem 1rem',
                textAlign: 'center',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-muted)',
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
              <div style={{ fontWeight: '600', fontSize: '0.9375rem' }}>No Profile Updates Logged Yet</div>
              <div style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>
                Whenever an employee changes their contact or profile settings, details will appear here automatically.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: '700', fontSize: '0.9375rem', color: 'var(--primary)' }}>
                      {log.title}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {new Date(log.created_at).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-main)', margin: '0.25rem 0' }}>
                    {log.message}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                    <button
                      type="button"
                      onClick={() => navigate('/admin/employees')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      <span>View in Employees Directory &rarr;</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}

export default SettingsPage;
