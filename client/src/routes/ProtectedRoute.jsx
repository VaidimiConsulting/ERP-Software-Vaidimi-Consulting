import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        backgroundColor: 'var(--bg-main)'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid var(--border-color)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Authenticating session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // Graceful role redirection instead of harsh 403 Access Denied
    if (user?.role === 'HR') {
      const path = location.pathname;
      if (path.startsWith('/admin/employees')) return <Navigate to="/hr/employees" replace />;
      if (path.startsWith('/admin/interns')) return <Navigate to="/hr/interns" replace />;
      if (path.startsWith('/admin/attendance')) return <Navigate to="/hr/attendance" replace />;
      if (path.startsWith('/admin/leaves')) return <Navigate to="/hr/leaves" replace />;
      if (path.startsWith('/admin/payroll')) return <Navigate to="/hr/salary" replace />;
      if (path.startsWith('/admin/holidays')) return <Navigate to="/hr/holidays" replace />;
      if (path.startsWith('/admin/reports')) return <Navigate to="/hr/reports" replace />;
      if (path.startsWith('/admin/calendar')) return <Navigate to="/hr/calendar" replace />;
      return <Navigate to="/hr/dashboard" replace />;
    }

    if (user?.role === 'ADMIN' || user?.role === 'MANAGER') {
      return <Navigate to="/admin/dashboard" replace />;
    }

    if (user?.role === 'EMPLOYEE') {
      const path = location.pathname;
      if (path.startsWith('/admin/holidays') || path.startsWith('/hr/holidays')) return <Navigate to="/employee/holidays" replace />;
      if (path.startsWith('/admin/calendar') || path.startsWith('/hr/calendar')) return <Navigate to="/employee/calendar" replace />;
      return <Navigate to="/employee/dashboard" replace />;
    }

    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

export default ProtectedRoute;
