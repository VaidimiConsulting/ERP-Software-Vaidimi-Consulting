import React, { useState } from 'react';
import Sidebar from './Sidebar';
import NotificationBell from '../notifications/NotificationBell';
import ChangePasswordModal from '../auth/ChangePasswordModal';
import ThemeToggle from '../common/ThemeToggle';
import { useAuth } from '../../context/AuthContext';

function AppLayout({ children, pageTitle, subtitle }) {
  const { user } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-main)', position: 'relative' }}>
      {/* Mobile Drawer Backdrop */}
      {isMobileNavOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation (Fixed on desktop, drawer on mobile) */}
      <Sidebar
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
      />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header Bar */}
        <header
          className="app-header"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderBottom: '1px solid var(--border-color)',
            padding: '1rem 2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 40,
            gap: '0.75rem',
          }}
        >
          {/* Left: Mobile Hamburger & Page Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            <button
              type="button"
              className="mobile-menu-btn"
              onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
              aria-label="Toggle Navigation Menu"
              title="Navigation Menu"
            >
              ☰
            </button>
            <div style={{ minWidth: 0 }}>
              <h1 style={{
                fontSize: '1.375rem',
                fontWeight: '800',
                color: 'var(--text-main)',
                marginBottom: '0.125rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {pageTitle || 'Dashboard'}
              </h1>
              {subtitle && (
                <p style={{
                  fontSize: '0.8125rem',
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right: Actions & User Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'nowrap' }}>
            {/* Corporate Location / Workspace Badge (Desktop Only) */}
            <div
              className="desktop-only"
              style={{
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.875rem',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.8125rem',
                color: 'var(--text-main)',
                fontWeight: '600',
                whiteSpace: 'nowrap'
              }}
            >
              <span>🏢</span>
              <span>Head Office</span>
            </div>

            {/* Live Corporate Calendar Date (Desktop Only) */}
            <div
              className="desktop-only"
              style={{
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.875rem',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.8125rem',
                color: 'var(--text-muted)',
                fontWeight: '500',
                whiteSpace: 'nowrap'
              }}
            >
              <span>📅</span>
              <span>{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            </div>

            {/* Theme Toggle (Dark / Light Mode) */}
            <ThemeToggle compact={true} />

            {/* Notification Center */}
            <NotificationBell />

            {/* Change Password Button (Desktop Only) */}
            <button
              type="button"
              className="desktop-only"
              onClick={() => setShowPasswordModal(true)}
              style={{
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.38rem 0.75rem',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.8125rem',
                color: 'var(--text-main)',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                whiteSpace: 'nowrap'
              }}
              title="Change Account Password"
            >
              <span>🔑</span>
              <span>Password</span>
            </button>

            {/* Executive Profile Badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.3rem 0.6rem 0.3rem 0.35rem',
              backgroundColor: 'var(--primary-light)',
              borderRadius: 'var(--radius-full)',
              border: '1px solid rgba(15, 118, 110, 0.2)'
            }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: '700',
                flexShrink: 0
              }}>
                {user?.employeeProfile
                  ? `${user.employeeProfile.first_name[0]}${user.employeeProfile.last_name[0]}`.toUpperCase()
                  : user?.role === 'ADMIN' ? 'GS' : user?.role === 'HR' ? 'VK' : 'VC'}
              </div>
              <div className="desktop-only" style={{ flexDirection: 'column', lineHeight: 1.15 }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: '700', color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                  {user?.employeeProfile
                    ? `${user.employeeProfile.first_name} ${user.employeeProfile.last_name}`
                    : user?.role === 'ADMIN' ? 'Gargi Singh' : user?.role === 'HR' ? 'Vineet Kumar' : 'Associate'}
                </span>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: '500', whiteSpace: 'nowrap' }}>
                  {user?.employeeProfile?.designation || (user?.role === 'ADMIN' ? 'Admin' : user?.role === 'HR' ? 'HR Manager' : 'Associate')}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Change Password Dialog */}
        <ChangePasswordModal
          isOpen={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
        />

        {/* Page Content Body */}
        <main className="main-content-area" style={{ flex: 1, padding: '2rem' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
