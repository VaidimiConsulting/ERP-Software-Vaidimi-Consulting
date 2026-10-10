import React from 'react';

function OnlineIndicator({
  isOnline = false,
  size = 'md',
  showText = false,
  textLabel = null,
  style = {},
}) {
  const sizeMap = {
    xs: { dot: '7px', ring: '1.5px' },
    sm: { dot: '9px', ring: '2px' },
    md: { dot: '11px', ring: '2px' },
    lg: { dot: '14px', ring: '2.5px' },
  };

  const { dot, ring } = sizeMap[size] || sizeMap.md;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        ...style,
      }}
      title={isOnline ? 'Active now' : 'Offline'}
    >
      <span
        style={{
          position: 'relative',
          display: 'inline-block',
          width: dot,
          height: dot,
        }}
      >
        {isOnline && (
          <span
            style={{
              position: 'absolute',
              inset: '-2px',
              borderRadius: '50%',
              backgroundColor: 'rgba(16, 185, 129, 0.4)',
              animation: 'pulseRing 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />
        )}
        <span
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            backgroundColor: isOnline ? '#10b981' : '#94a3b8',
            boxShadow: isOnline
              ? '0 0 0 2px #ffffff, 0 0 6px rgba(16, 185, 129, 0.6)'
              : '0 0 0 2px #ffffff',
            transition: 'all 0.3s ease',
          }}
        />
        <style>{`
          @keyframes pulseRing {
            0% { transform: scale(0.95); opacity: 0.8; }
            50% { transform: scale(1.6); opacity: 0; }
            100% { transform: scale(0.95); opacity: 0; }
          }
        `}</style>
      </span>

      {showText && (
        <span
          style={{
            fontSize: size === 'xs' || size === 'sm' ? '0.6875rem' : '0.75rem',
            fontWeight: '600',
            color: isOnline ? '#059669' : '#64748b',
            letterSpacing: '0.01em',
          }}
        >
          {textLabel || (isOnline ? 'Active now' : 'Offline')}
        </span>
      )}
    </div>
  );
}

export default OnlineIndicator;
