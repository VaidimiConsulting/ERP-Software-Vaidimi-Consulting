import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function UnauthorizedPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleReturn = () => {
    if (user?.role === 'ADMIN' || user?.role === 'MANAGER') {
      navigate('/admin/dashboard', { replace: true });
    } else if (user?.role === 'HR') {
      navigate('/hr/dashboard', { replace: true });
    } else {
      navigate('/employee/dashboard', { replace: true });
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-main)',
      padding: '1.5rem'
    }}>
      <div className="card" style={{ maxWidth: '480px', textAlign: 'center', padding: '2.5rem' }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: 'var(--danger-bg)',
          color: 'var(--danger)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.75rem',
          margin: '0 auto 1.5rem auto',
          border: '1px solid rgba(239, 68, 68, 0.2)'
        }}>
          🛡️
        </div>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Access Denied (403)</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', marginBottom: '1.5rem', lineHeight: '1.6' }}>
          You do not have the required administrative permissions to access this page. Your current role is <strong>{user?.role || 'Guest'}</strong>.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={handleReturn}>
            Return to My Dashboard
          </button>
          <button className="btn btn-secondary" onClick={logout}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

export default UnauthorizedPage;
