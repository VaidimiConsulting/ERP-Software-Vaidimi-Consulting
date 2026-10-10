import React from 'react';

function TaskWidgets({ stats, onFilterClick, activeFilter }) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-4" style={{ marginBottom: '1.5rem' }}>
      {/* Pending Tasks */}
      <div
        className="card"
        onClick={() => onFilterClick && onFilterClick('pending')}
        style={{
          borderLeft: '4px solid var(--primary)',
          cursor: onFilterClick ? 'pointer' : 'default',
          backgroundColor: activeFilter === 'pending' ? 'var(--primary-light)' : 'var(--bg-card)',
          transition: 'all var(--transition-fast)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: 'var(--text-muted)' }}>Pending Tasks</span>
          <span style={{ fontSize: '1.25rem' }}>⏳</span>
        </div>
        <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-main)' }}>
          {stats.pendingTasks ?? 0}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          Todo & In Progress
        </div>
      </div>

      {/* Completed Tasks */}
      <div
        className="card"
        onClick={() => onFilterClick && onFilterClick('completed')}
        style={{
          borderLeft: '4px solid var(--success)',
          cursor: onFilterClick ? 'pointer' : 'default',
          backgroundColor: activeFilter === 'completed' ? 'var(--success-bg)' : 'var(--bg-card)',
          transition: 'all var(--transition-fast)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: 'var(--text-muted)' }}>Completed Tasks</span>
          <span style={{ fontSize: '1.25rem' }}>✅</span>
        </div>
        <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--success)' }}>
          {stats.completedTasks ?? 0}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          Finished & Delivered
        </div>
      </div>

      {/* Overdue Tasks */}
      <div
        className="card"
        onClick={() => onFilterClick && onFilterClick('overdue')}
        style={{
          borderLeft: '4px solid var(--danger)',
          cursor: onFilterClick ? 'pointer' : 'default',
          backgroundColor: activeFilter === 'overdue' ? 'var(--danger-bg)' : 'var(--bg-card)',
          transition: 'all var(--transition-fast)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: 'var(--danger)' }}>Overdue Tasks</span>
          <span style={{ fontSize: '1.25rem' }}>⚠️</span>
        </div>
        <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--danger)' }}>
          {stats.overdueTasks ?? 0}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          Past Target Deadline
        </div>
      </div>

      {/* Total Tracked Tasks */}
      <div
        className="card"
        onClick={() => onFilterClick && onFilterClick('all')}
        style={{
          borderLeft: '4px solid #0ea5e9',
          cursor: onFilterClick ? 'pointer' : 'default',
          backgroundColor: activeFilter === 'all' ? 'var(--bg-subtle)' : 'var(--bg-card)',
          transition: 'all var(--transition-fast)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: 'var(--text-muted)' }}>Total Pipeline</span>
          <span style={{ fontSize: '1.25rem' }}>📋</span>
        </div>
        <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-main)' }}>
          {stats.totalTasks ?? 0}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          Blocked: <strong>{stats.blockedTasks ?? 0}</strong>
        </div>
      </div>
    </div>
  );
}

export default TaskWidgets;
