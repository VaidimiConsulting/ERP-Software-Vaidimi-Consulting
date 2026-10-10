import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, markAsRead, markAllAsRead } from '../../services/notificationService';
import { useSocket } from '../../context/SocketContext';

function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewAlert, setHasNewAlert] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { socket } = useSocket();

  const loadNotifications = async () => {
    try {
      const res = await getNotifications();
      if (res.success) {
        setNotifications(res.data);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // 30s background poll
    return () => clearInterval(interval);
  }, []);

  const [toast, setToast] = useState(null);

  // Play subtle notification chime
  const playNotificationChime = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      // Audio autoplay restrictions
    }
  };

  // Real-time Socket.IO notification listener
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notif) => {
      if (!notif) return;
      setNotifications((prev) => [
        {
          id: notif.id || `live-${Date.now()}`,
          title: notif.title,
          message: notif.message,
          type: notif.type || 'SYSTEM',
          link: notif.link || null,
          created_at: notif.created_at || new Date().toISOString(),
          is_read: false,
        },
        ...prev,
      ]);
      setUnreadCount((prev) => prev + 1);
      setHasNewAlert(true);
      setTimeout(() => setHasNewAlert(false), 3000);

      // Play chime & show interactive Toast popup
      playNotificationChime();
      setToast({
        id: notif.id || Date.now(),
        title: notif.title,
        message: notif.message,
        type: notif.type,
        link: notif.link || '/employee/tasks',
      });
      setTimeout(() => {
        setToast((curr) => (curr?.id === notif.id ? null : curr));
      }, 7000);
    };

    socket.on('new_notification', handleNewNotification);
    return () => {
      socket.off('new_notification', handleNewNotification);
    };
  }, [socket]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      await markAsRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          background: 'var(--bg-subtle)',
          border: hasNewAlert ? '1px solid var(--primary)' : '1px solid var(--border-color)',
          borderRadius: 'var(--radius-full)',
          width: '38px',
          height: '38px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: '1.125rem',
          transition: 'all var(--transition-fast)',
          transform: hasNewAlert ? 'scale(1.1)' : 'scale(1)',
          boxShadow: hasNewAlert ? '0 0 10px var(--primary-glow)' : 'none',
        }}
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              backgroundColor: 'var(--danger)',
              color: '#ffffff',
              fontSize: '0.6875rem',
              fontWeight: '700',
              padding: '0.15rem 0.4rem',
              borderRadius: 'var(--radius-full)',
              boxShadow: '0 2px 5px rgba(239, 68, 68, 0.5)',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Drawer */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '46px',
            width: '340px',
            maxHeight: '420px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border-color)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '0.75rem 1rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-subtle)',
            }}
          >
            <div style={{ fontWeight: '700', fontSize: '0.875rem', color: 'var(--text-main)' }}>Notifications</div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                No notifications right now.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    backgroundColor: n.is_read ? 'var(--bg-card)' : 'var(--primary-light)',
                    transition: 'background-color var(--transition-fast)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: n.is_read ? '600' : '700', fontSize: '0.8125rem', color: 'var(--text-main)' }}>
                      {n.title}
                    </span>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    {n.message}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Real-Time Slide-in Toast Banner for Task & Workplace Alerts */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 99999,
            maxWidth: '380px',
            width: 'calc(100vw - 40px)',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '12px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(15, 118, 110, 0.25)',
            borderLeft: '5px solid #0f766e',
            padding: '1rem',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.35rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem' }}>{toast.type === 'TASK_ASSIGNED' ? '🎯' : '🔔'}</span>
              <strong style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>
                {toast.title}
              </strong>
            </div>
            <button
              onClick={() => setToast(null)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '1rem',
                lineHeight: 1,
                padding: '0.1rem 0.3rem',
              }}
              title="Close"
            >
              &times;
            </button>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.35rem 0 0.75rem 0', lineHeight: 1.45 }}>
            {toast.message}
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button
              className="btn btn-primary"
              onClick={() => {
                const targetLink = toast.link;
                setToast(null);
                if (targetLink) navigate(targetLink);
              }}
              style={{
                fontSize: '0.75rem',
                padding: '0.35rem 0.75rem',
                backgroundColor: '#0f766e',
                borderColor: '#0f766e',
                fontWeight: '700',
              }}
            >
              Open Task Details &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
