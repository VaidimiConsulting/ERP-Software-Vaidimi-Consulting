import React from 'react';
import { useTheme } from '../../context/ThemeContext';

function ThemeToggle({ compact = false }) {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle-btn"
      aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
      title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.45rem',
        padding: compact ? '0.4rem' : '0.38rem 0.75rem',
        backgroundColor: 'var(--bg-subtle)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-full)',
        fontSize: '0.8125rem',
        color: 'var(--text-main)',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all var(--transition-fast)',
        userSelect: 'none',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1rem',
          transform: isDark ? 'rotate(360deg)' : 'rotate(0deg)',
          transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {isDark ? '🌙' : '☀️'}
      </span>
      {!compact && (
        <span style={{ fontSize: '0.78rem' }}>
          {isDark ? 'Dark' : 'Light'}
        </span>
      )}
    </button>
  );
}

export default ThemeToggle;
