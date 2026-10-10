import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../../components/common/ThemeToggle';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(email, password);
    setIsSubmitting(false);

    if (result.success) {
      const userRole = result.user?.role;
      let targetPath = '/employee/dashboard';

      if (userRole === 'ADMIN' || userRole === 'MANAGER') {
        targetPath = '/admin/dashboard';
      } else if (userRole === 'HR') {
        targetPath = '/hr/dashboard';
      }

      // If user had a prior intended destination, only navigate there if compatible with their role
      if (from && typeof from === 'string') {
        const isAdmin = userRole === 'ADMIN' || userRole === 'MANAGER';
        const isHR = userRole === 'HR';
        const isEmp = userRole === 'EMPLOYEE';

        if (isAdmin && (from.startsWith('/admin') || from.startsWith('/calendar'))) {
          targetPath = from;
        } else if (isHR && (from.startsWith('/hr') || from.startsWith('/calendar'))) {
          targetPath = from;
        } else if (isEmp && (from.startsWith('/employee') || from.startsWith('/calendar'))) {
          targetPath = from;
        }
      }

      navigate(targetPath, { replace: true });
    } else {
      setErrorMessage(result.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-main)',
      padding: '1rem',
      position: 'relative',
      background: 'radial-gradient(circle at 50% 10%, rgba(15, 118, 110, 0.12) 0%, transparent 65%)'
    }}>
      {/* Theme Switcher Button */}
      <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 10 }}>
        <ThemeToggle compact={true} />
      </div>

      <div style={{ width: '100%', maxWidth: '420px', margin: 'auto' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.75rem',
          }}>
            <img
              src="/logo.jpg"
              alt="Vaidimi Consulting Logo"
              style={{
                height: 'auto',
                maxHeight: '70px',
                maxWidth: '240px',
                objectFit: 'contain',
                backgroundColor: '#ffffff',
                padding: '0.5rem',
                borderRadius: '8px',
              }}
            />
          </div>
          <h1 style={{ fontSize: '1.5rem', letterSpacing: '-0.02em', marginBottom: '0.25rem', color: 'var(--text-main)' }}>
            Vaidimi Consulting
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: '500' }}>
            Guidance &bull; Growth &bull; Success &bull; Portal
          </p>
        </div>

        {/* Login Form Card */}
        <div className="card" style={{ padding: '1.75rem 1.5rem' }}>
          {errorMessage && (
            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--danger-bg)',
              color: 'var(--danger)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              marginBottom: '1.25rem',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email or Employee ID Field */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
                Email Address or Employee ID
              </label>
              <input
                type="text"
                placeholder="name@company.com or EMP-001"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.9375rem',
                  outline: 'none',
                  transition: 'border-color var(--transition-fast)',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-main)'
                }}
                required
              />
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-main)' }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.9375rem',
                  outline: 'none',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-main)'
                }}
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }}
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Corporate Security Footer inside Card */}
          <div style={{
            marginTop: '1.75rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--border-color)',
            textAlign: 'center',
            fontSize: '0.8125rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem'
          }}>
            <span>🔒</span>
            <span>256-Bit Encrypted Corporate Workspace</span>
          </div>
        </div>

        {/* Footer info */}
        <p style={{
          textAlign: 'center',
          fontSize: '0.8125rem',
          color: 'var(--text-muted)',
          marginTop: '1.5rem'
        }}>
          Vaidimi Consulting &bull; Secure Enterprise Portal
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
